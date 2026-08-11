#!/usr/bin/env python3
"""Upstream watch: wykrywa rozjazd między matrix.js a danymi OpenStacka.

Klasa 1 (dane) porównywana automatycznie: statusy serii, daty, mapowanie serii na
wersję kolla-ansible, pojawienie się nowej serii.

Klasa 2 (semantyka reguł: nowe flagi, zmiany defaultów, deprecacje) NIE jest tu
rozstrzygana. Skrypt oznacza ją do przeglądu i zatrzymuje się — zgadywanie wagi
albo rodzaju wpisu byłoby dokładnie tym, przed czym broni cały ten projekt.

Ten plik żyje wyłącznie w CI. Nie trafia do artefaktu, nie dotyka CSP i nie ma
wpływu na obietnicę „narzędzia to samodzielne pliki HTML bez zależności".
Produkt ma zero zależności; oprzyrządowanie może mieć, bo nie dociera do
użytkownika.

Użycie:
    python3 tools/upstream_watch.py            # raport rozjazdów
    NODE=/path/to/node python3 ...             # gdy 'node' nie jest w PATH
    python3 tools/upstream_watch.py --json     # to samo, maszynowo
    python3 tools/upstream_watch.py --notes    # kandydaci klasy 2 z release notes
    python3 tools/upstream_watch.py --self-test  # dowód, że wykrywa rozjazd
"""

import json
import os
import re
import subprocess
import sys
import urllib.request

# PyYAML świadomie NIE jest importowane na poziomie modułu. Zasada zerowych
# zależności obowiązuje produkt, nie oprzyrządowanie — ale --self-test ma działać
# w ci.yml, gdzie sieci nie ma i instalowanie czegokolwiek byłoby zbędnym rytuałem.
# Import mieszka w jedynym miejscu, które faktycznie parsuje YAML.

CONSTANT_KEYWORDS = ("deprecat", "removed", "renamed", "upgrade")

SERIES_STATUS_URL = (
    "https://raw.githubusercontent.com/openstack/releases/master/data/series_status.yaml"
)
DELIVERABLE_URL = (
    "https://raw.githubusercontent.com/openstack/releases/master/"
    "deliverables/{series}/kolla-ansible.yaml"
)
# Surowe noty reno, nie wyrenderowany HTML: parsowanie strony docs zależy od
# szablonu, który upstream może zmienić bez zapowiedzi, a wtedy skaner cichnie.
# Katalog jest KUMULATYWNY — gałąź stable/2026.1 zawiera też noty ze wszystkich
# poprzednich wydań, więc "nowe w tej serii" wychodzi z różnicy dwóch gałęzi,
# nie z samej zawartości jednej.
NOTES_LIST_URL = (
    "https://api.github.com/repos/openstack/kolla-ansible/contents/"
    "releasenotes/notes?ref={ref}"
)
NOTE_URL = (
    "https://raw.githubusercontent.com/openstack/kolla-ansible/{ref}/"
    "releasenotes/notes/{name}"
)
# Ile not wolno pobrać w jednym przebiegu. Limit jest jawny i raportowany:
# ucięcie, o którym nikt nie napisał, czyta się jako "przejrzano wszystko".
NOTES_FETCH_CAP = 120

# Status upstream -> status w macierzy. 'future' oznacza serię, której w macierzy
# jeszcze nie ma i mieć nie powinna.
STATUS_MAP = {
    "future": None,
    "development": "development",
    "maintained": "maintained",
    "unmaintained": "unmaintained",
    "end of life": "eol",
}

# Tabela, nie łańcuch warunków. Który status upstream oznacza, że 'initial-release'
# opisuje datę PLANOWANĄ, a nie faktyczną, i czy w ogóle porównywać koniec wsparcia.
# Dodanie nowego statusu upstream ma być edycją jednego wpisu tutaj, a nie
# szukaniem gałęzi if rozsianych po komparatorze.
#
# Powód istnienia tej tabeli: naiwny diff zgłaszał rozjazd na serii w rozwoju,
# gdzie macierz miała rację. Upstream podaje dla niej datę planowaną w tym samym
# polu, w którym dla wydanych serii podaje datę faktyczną.
FIELD_RULES = {
    "development": {
        "initial_release_to": "expected",
        "compare_ends_on": False,
        "why_no_ends_on": "a series that has not shipped has no support end to compare",
    },
    "maintained": {
        "initial_release_to": "released",
        "compare_ends_on": True,
    },
    "unmaintained": {
        "initial_release_to": "released",
        "compare_ends_on": False,
        "why_no_ends_on": "upstream does not publish the historical transition date",
    },
    "eol": {
        "initial_release_to": "released",
        "compare_ends_on": False,
        "why_no_ends_on": "upstream does not publish the historical transition date",
    },
}

# Miejsce na listę świadomie akceptowanych odchyleń od upstreamu.
#
# CELOWO PUSTA i celowo nie ma pliku, który by ją trzymał. Lista wyjątków powstała
# po to, żeby usprawiedliwiać rozbieżności, których nie chce się poprawić, jest
# mechanizmem legalizowania nieprawdy. Rozjazd statusu ma naturalną obsługę:
# watcher generuje poprawkę, człowiek ją merguje.
#
# Jeśli kiedyś BĘDZIEMY CHCIELI świadomie odbiegać od upstreamu — tu jest miejsce,
# i wtedy każdy wpis musi nieść uzasadnienie, nie samą nazwę serii.
ACKNOWLEDGED_DEVIATIONS = {}


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "kolla-tools-upstream-watch"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8")


def load_series_status(text):
    """release-id musi zostać NAPISEM.

    W YAML-u '2026.1' parsuje się jako float. Przy pierwszym przebiegu prototypu
    żaden klucz numeryczny nie pasował, skrypt nie porównał ANI JEDNEJ serii
    i wypisał czysty przebieg. Osobno: float traci '2026.10', bo to ta sama
    liczba co 2026.1.
    """
    import yaml  # patrz komentarz przy imports

    quoted = re.sub(r"^(\s*release-id:\s*)([0-9][0-9.]*)\s*$", r'\1"\2"', text, flags=re.M)
    return yaml.safe_load(quoted)


def load_matrix(path="matrix.js"):
    """matrix.js to czysty literał danych — wyciągamy go Node'em, bez parsowania ręcznego."""
    node = os.environ.get("NODE", "node")
    out = subprocess.run(
        [node, "-e",
         "const fs=require('fs');eval(fs.readFileSync(process.argv[1],'utf8'));"
         "process.stdout.write(JSON.stringify(KOLLA_MATRIX))", path],
        capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def index_upstream(series_list):
    """Klucz po release-id ORAZ po nazwie.

    Serie sprzed schematu RRRR.N (zed, yoga) nie mają release-id w ogóle — bez
    dopasowania po nazwie wypadłyby cicho, czyli dokładnie tak, jak wygląda
    poprawny przebieg.
    """
    by_key = {}
    for entry in series_list:
        name = str(entry.get("name", "")).lower()
        rid = entry.get("release-id")
        if name:
            by_key[name] = entry
        if rid is not None:
            by_key[str(rid)] = entry
    return by_key


def compare(matrix, upstream_by_key):
    """Zwraca (drifts, compared, skipped, unresolved).

    KAŻDA seria z macierzy musi wylądować w 'compared' albo w 'skipped' z podanym
    powodem. Cokolwiek zostanie w 'unresolved' to błąd krytyczny: cicha awaria
    dopasowania nie ma prawa wyglądać jak czysty przebieg.
    """
    drifts, compared, skipped, unresolved = [], [], [], []

    for rel in matrix["releases"]:
        rid = str(rel["id"])
        up = upstream_by_key.get(rid.lower()) or upstream_by_key.get(str(rel.get("name", "")).lower())

        if up is None:
            skipped.append((rid, "upstream does not know this series"))
            continue

        up_status = STATUS_MAP.get(up.get("status"))
        if up_status is None:
            skipped.append((rid, "upstream status %r has no matrix equivalent" % up.get("status")))
            continue

        compared.append(rid)

        if up_status != rel["status"]:
            drifts.append({"series": rid, "field": "status",
                           "ours": rel["status"], "upstream": up_status})

        rules = FIELD_RULES.get(up_status)
        if rules is None:
            unresolved.append((rid, "no field rules for upstream status %r" % up_status))
            continue

        date_field = rules["initial_release_to"]
        up_date = str(up.get("initial-release")) if up.get("initial-release") else None
        ours_date = rel.get(date_field)
        if up_date and ours_date != up_date:
            drifts.append({"series": rid, "field": date_field,
                           "ours": ours_date, "upstream": up_date})

        if rules["compare_ends_on"]:
            nxt = up.get("next-phase") or {}
            up_end = str(nxt.get("date")) if nxt.get("date") else None
            if up_end and rel.get("endsOn") != up_end:
                drifts.append({"series": rid, "field": "endsOn",
                               "ours": rel.get("endsOn"), "upstream": up_end})

    # Serie znane upstreamowi, a nieobecne w macierzy.
    #
    # Granicę bierzemy Z MACIERZY, nie z listy wpisanej na sztywno: najstarsza seria,
    # którą trzymamy, wyznacza zakres zainteresowania. Wszystko starsze jest świadomie
    # poza zakresem, a nie brakujące — upstream zna serie aż do Austina z 2010 roku
    # i zgłaszanie ich jako braków to szum, który uczy ignorowania tego narzędzia.
    # Nowa seria pojawia się ZAWSZE po najnowszej, więc ta granica nie przepuści
    # niczego, co faktycznie powinniśmy dodać.
    known = {str(r["id"]).lower() for r in matrix["releases"]}
    known |= {str(r.get("name", "")).lower() for r in matrix["releases"]}
    oldest = None
    for entry in upstream_by_key.values():
        if str(entry.get("name", "")).lower() in known or str(entry.get("release-id")) in known:
            date = str(entry.get("initial-release") or "")
            if date and (oldest is None or date < oldest):
                oldest = date

    for entry in {id(e): e for e in upstream_by_key.values()}.values():
        if entry.get("status") == "future":
            continue
        rid = str(entry.get("release-id") or entry.get("name"))
        if rid.lower() in known or str(entry.get("name", "")).lower() in known:
            continue
        date = str(entry.get("initial-release") or "")
        if oldest and date and date < oldest:
            continue    # starsze niż zakres macierzy — poza zainteresowaniem, nie brak
        drifts.append({"series": rid, "field": "presence",
                       "ours": None, "upstream": "series exists upstream"})

    drifts = [d for d in drifts
              if ACKNOWLEDGED_DEVIATIONS.get((d["series"], d["field"])) is None]
    return drifts, compared, skipped, unresolved


def kolla_versions(series_names):
    """Seria -> najwyższa wydana wersja kolla-ansible.

    Zwraca też powód pominięcia, a nie samo milczenie: seria bez deliverable
    (bo jeszcze nic nie wydano) musi trafić do rubryki "pominięte z podanym
    powodem", inaczej cicha awaria pobierania wygląda jak zgodność.
    """
    import yaml  # patrz komentarz przy imports

    out, absent = {}, {}
    for name in series_names:
        try:
            text = fetch(DELIVERABLE_URL.format(series=name.lower()))
        except Exception as exc:
            absent[name.lower()] = "upstream has no kolla-ansible deliverable (%s)" % (
                getattr(exc, "code", None) or type(exc).__name__)
            continue
        data = yaml.safe_load(text) or {}
        # Tylko numery wydań. Ostatni wpis listy bywa tagiem końca życia
        # ("zed-eol", "2024.2-eol") — wzięty dosłownie dawał rozjazd
        # "15.x vs zed-eol.x", czyli alarm o własnym błędzie parsowania.
        versions = []
        for rel in (data.get("releases") or []):
            v = str(rel.get("version") or "")
            if re.match(r"^\d+(\.\d+)*$", v):
                versions.append(tuple(int(part) for part in v.split(".")))
        if versions:
            out[name.lower()] = ".".join(str(part) for part in max(versions))
        else:
            absent[name.lower()] = "deliverable lists no numbered release"
    return out, absent


def compare_kolla(matrix, versions, absent):
    """Porównanie mapowania seria -> kolla-ansible, WYŁĄCZNIE na poziomie majora.

    W macierzy stoi "22.x", bo narzędzie nie twierdzi nic o wersji łatki; upstream
    podaje pełne "22.1.0". Porównywanie pełnych numerów zgłaszałoby rozjazd przy
    każdym wydaniu poprawkowym, czyli alarm o czymś, czego macierz nie obiecuje.
    """
    drifts, compared, skipped = [], [], []
    for rel in matrix["releases"]:
        ours = rel.get("kolla")
        key = (rel.get("name") or "").lower()
        if not ours:
            skipped.append((rel["id"], "no kolla version recorded in the matrix"))
            continue
        if key not in versions:
            skipped.append((rel["id"], absent.get(key, "no upstream deliverable fetched")))
            continue
        upstream_major = versions[key].split(".")[0]
        if ours.split(".")[0] != upstream_major:
            drifts.append({"series": rel["id"], "field": "kolla",
                           "ours": ours, "upstream": upstream_major + ".x"})
        compared.append(rel["id"])
    return drifts, compared, skipped


def apply_patch(drifts, path="matrix.js", today=None):
    """Nanosi WYŁĄCZNIE rozjazdy klasy 1: statusy i daty istniejących serii.

    Nowa seria i cokolwiek dotykającego deprecated[]/keys{} zostaje dla człowieka —
    patch jest deterministyczny tylko dla pól, które mają jedno oczywiste źródło.
    """
    text = io_read(path)
    applied, deferred = [], []

    for d in drifts:
        if d["field"] == "presence":
            deferred.append(d)
            continue
        # podmiana w obrębie wpisu tej jednej serii, nie globalnie
        pattern = re.compile(
            r'(id: "%s"(?:(?!id: ")[\s\S])*?%s: )(?:"[^"]*"|null)'
            % (re.escape(d["series"]), d["field"]))
        new_value = '"%s"' % d["upstream"] if d["upstream"] is not None else "null"
        text, n = pattern.subn(lambda m: m.group(1) + new_value, text, count=1)
        (applied if n else deferred).append(d)

    if applied and today:
        text = re.sub(r'(updated: )"[^"]*"', r'\1"%s"' % today, text, count=1)

    if applied:
        io_write(path, text)
    return applied, deferred


def io_read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def io_write(path, text):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def scan_keywords(matrix):
    """Slowa kluczowe skanera release notes SA GENEROWANE Z MACIERZY.

    Lista wpisana na sztywno rozjeżdża się z macierzą po pierwszej zmianie i nikt
    tego nie zauważy, bo skaner dalej coś znajduje. Tu zbiór nazw pochodzi stąd,
    co reguły: jeśli macierz zna klucz, skaner o niego pyta.
    """
    words = set(CONSTANT_KEYWORDS)
    for rel in matrix["releases"]:
        words.update((rel.get("keys") or {}).keys())
        words.update((rel.get("defaults") or {}).keys())
        for dep in (rel.get("deprecated") or []):
            if dep.get("name"):
                words.add(dep["name"])
            if dep.get("replacedBy"):
                words.add(dep["replacedBy"])
    return sorted(words)


def note_names(ref):
    listing = json.loads(fetch(NOTES_LIST_URL.format(ref=ref)))
    return {item["name"] for item in listing if item.get("type") == "file"}


# Sekcje reno, które z definicji dotyczą tego, czego pilnuje macierz. Nota bez
# żadnej z nich może wciąż być istotna, jeśli wymienia znaną nazwę — dlatego
# to jest wzmocnienie sygnału, a nie filtr wykluczający.
NOTE_SECTIONS_OF_INTEREST = ("upgrade", "deprecations", "critical")


def scan_release_notes(matrix, ref, prev_ref):
    """Kandydaci klasy 2 — SUROWE cytaty, bez klasyfikacji.

    Noty reno są YAML-em, więc czytamy je jako YAML. Skanowanie wiersz po wierszu
    zgłaszało nagłówek sekcji "upgrade:" jako trafienie na słowo "upgrade" — cytat
    bez treści, czyli hałas, który po kilku przebiegach uczy człowieka ignorować
    cały raport.

    Skrypt świadomie nie idzie dalej niż cytat. Ustalenie, czy nota opisuje
    deprecację, zmianę wartości domyślnej czy przemianowanie — i z jaką wagą —
    wymaga przeczytania jej ze zrozumieniem. Zgadnięty kind/sev trafiłby do reguł,
    o których ktoś potem założy, że ktoś je sprawdził.
    """
    import yaml  # patrz komentarz przy imports

    words = scan_keywords(matrix)
    try:
        fresh = sorted(note_names(ref) - note_names(prev_ref))
    except Exception as exc:
        return None, 0, "note listing unavailable (%s)" % (
            getattr(exc, "code", None) or type(exc).__name__)

    truncated = max(0, len(fresh) - NOTES_FETCH_CAP)
    hits = []
    for name in fresh[:NOTES_FETCH_CAP]:
        try:
            text = fetch(NOTE_URL.format(ref=ref, name=name))
        except Exception:
            continue
        try:
            note = yaml.safe_load(text) or {}
        except Exception:
            # Nota, której nie da się sparsować, jest zgłaszana, a nie pomijana:
            # milczenie o niej wygląda tak samo jak jej brak.
            hits.append({"note": name, "section": "?", "matched": ["unparseable"],
                         "quote": "note is not valid YAML — read it by hand"})
            continue
        if not isinstance(note, dict):
            continue

        for section, body in note.items():
            entries = body if isinstance(body, list) else [body]
            for entry in entries:
                for para in str(entry).split("\n\n"):
                    para = " ".join(para.split())
                    if not para:
                        continue
                    low = para.lower()
                    matched = sorted(w for w in words if w.lower() in low)
                    if not matched and section not in NOTE_SECTIONS_OF_INTEREST:
                        continue
                    if not matched:
                        matched = ["(section: %s)" % section]
                    hits.append({"note": name, "section": section,
                                 "matched": matched,
                                 "quote": para[:400]})
    return hits, truncated, None


def notes_ref(rel):
    """Gałąź, na której żyją noty danej serii.

    Seria w rozwoju nie ma jeszcze gałęzi stable — jej noty leżą na master.
    """
    return "master" if rel.get("status") == "development" else "stable/%s" % rel["id"]


def run_notes():
    """Skan not wydania NAJNOWSZEJ serii pod kątem kandydatów klasy 2.

    Wynik to lista cytatów do przeczytania przez człowieka, nie propozycja wpisów
    do deprecated[]. Skrypt nie przypisuje kind ani sev — patrz scan_release_notes.
    """
    matrix = load_matrix()
    releases = matrix["releases"]
    if len(releases) < 2:
        print("FAIL matrix has fewer than two series, nothing to diff", file=sys.stderr)
        return 2

    newest, previous = releases[0], releases[1]
    hits, truncated, err = scan_release_notes(
        matrix, notes_ref(newest), notes_ref(previous))
    if err:
        print("FAIL %s" % err, file=sys.stderr)
        return 2

    print("release notes new in %s (vs %s): scanned against %d keywords from matrix.js"
          % (newest["id"], previous["id"], len(scan_keywords(matrix))))
    if truncated:
        print("NOTE %d further notes were not fetched (cap %d) — rerun to cover them"
              % (truncated, NOTES_FETCH_CAP))
    if not hits:
        print("OK   no release note mentions a name the matrix knows")
        return 0

    seen = set()
    for hit in hits:
        key = (hit["note"], hit["section"], hit["quote"])
        if key in seen:
            continue
        seen.add(key)
        print("\nCANDIDATE %s  [%s]" % (hit["note"], hit["section"]))
        print("  matched: %s" % ", ".join(hit["matched"]))
        print("  quote:   %s" % hit["quote"])
    print("\n%d candidate lines. Classification (kind, sev, note) is left to a human "
          "on purpose." % len(seen))
    return 1


def run(as_json=False):
    matrix = load_matrix()
    series = load_series_status(fetch(SERIES_STATUS_URL))
    drifts, compared, skipped, unresolved = compare(matrix, index_upstream(series))

    names = [r.get("name") for r in matrix["releases"] if r.get("name")]
    versions, absent = kolla_versions(names)
    kdrifts, kcompared, kskipped = compare_kolla(matrix, versions, absent)
    drifts = drifts + kdrifts

    total = len(matrix["releases"])
    if as_json:
        print(json.dumps({"drifts": drifts, "compared": compared,
                          "skipped": skipped, "unresolved": unresolved,
                          "kollaCompared": kcompared, "kollaSkipped": kskipped}, indent=2))
    else:
        print("matrix.js updated: %s" % matrix.get("updated"))
        print("series in matrix: %d   compared: %d   skipped: %d"
              % (total, len(compared), len(skipped)))
        for rid, why in skipped:
            print("  skipped %-8s %s" % (rid, why))
        print("kolla-ansible mapping   compared: %d   skipped: %d"
              % (len(kcompared), len(kskipped)))
        for rid, why in kskipped:
            print("  skipped %-8s %s" % (rid, why))
        if not drifts:
            print("OK   no drift against upstream")
        for d in drifts:
            print("DRIFT %-8s %-10s ours=%s upstream=%s"
                  % (d["series"], d["field"], d["ours"], d["upstream"]))

    if unresolved:
        for rid, why in unresolved:
            print("FAIL %-8s not resolved: %s" % (rid, why), file=sys.stderr)
        print("FAIL comparison incomplete — a silent matching failure must not look "
              "like a clean run", file=sys.stderr)
        return 2

    if len(compared) + len(skipped) != total:
        print("FAIL %d of %d series reached no verdict at all"
              % (total - len(compared) - len(skipped), total), file=sys.stderr)
        return 2

    return 1 if drifts else 0


def self_test():
    """Dowód, że komparator wykrywa rozjazd.

    Kontrola, której nie widziano, jak upada, nie jest kontrolą. Ten test podstawia
    CELOWO zafałszowaną macierz i wymaga, żeby rozjazd został zgłoszony z nazwą
    serii i pola. Uruchamiany w ci.yml, nie tylko w workflow watchera, żeby zepsucie
    komparatora było widoczne przy zwykłej pracy — bez sieci.
    """
    upstream = [
        {"name": "gazpacho", "release-id": "2026.1", "status": "maintained",
         "initial-release": "2026-04-01", "next-phase": {"status": "unmaintained", "date": "2027-10-27"}},
        {"name": "hibiscus", "release-id": "2026.2", "status": "development",
         "initial-release": "2026-09-30"},
        {"name": "zed", "status": "unmaintained", "initial-release": "2022-10-05"},
    ]
    idx = index_upstream(upstream)

    honest = {"releases": [
        {"id": "2026.1", "name": "Gazpacho", "status": "maintained",
         "released": "2026-04-01", "expected": None, "endsOn": "2027-10-27"},
        {"id": "2026.2", "name": "Hibiscus", "status": "development",
         "released": None, "expected": "2026-09-30", "endsOn": None},
        {"id": "zed", "name": "Zed", "status": "unmaintained",
         "released": "2022-10-05", "expected": None, "endsOn": None},
    ]}

    failures = []

    drifts, compared, skipped, unresolved = compare(honest, idx)
    if drifts:
        failures.append("clean matrix reported drift: %r" % drifts)
    if unresolved:
        failures.append("clean matrix left series unresolved: %r" % unresolved)
    if len(compared) != 3:
        failures.append("expected 3 compared series, got %d" % len(compared))
    # seria w rozwoju to miejsce, w którym naiwny komparator zgłaszał fałszywy alarm
    if any(d["series"] == "2026.2" for d in drifts):
        failures.append("false positive on the development series")

    cases = [
        ("status", lambda m: m["releases"][0].update({"status": "eol"}), "2026.1", "status"),
        ("released date", lambda m: m["releases"][0].update({"released": "2026-04-09"}), "2026.1", "released"),
        ("endsOn date", lambda m: m["releases"][0].update({"endsOn": "2030-01-01"}), "2026.1", "endsOn"),
        ("expected date", lambda m: m["releases"][1].update({"expected": "2026-12-24"}), "2026.2", "expected"),
        ("named series status", lambda m: m["releases"][2].update({"status": "eol"}), "zed", "status"),
    ]
    for label, mutate, series, field in cases:
        broken = json.loads(json.dumps(honest))
        mutate(broken)
        d, _c, _s, _u = compare(broken, idx)
        hit = [x for x in d if x["series"] == series and x["field"] == field]
        print("  %-22s %s" % (label, "detected" if hit else "NOT DETECTED"))
        if not hit:
            failures.append("drift not detected: %s (%s/%s)" % (label, series, field))

    # seria starsza niż zakres macierzy nie ma prawa być zgłaszana jako brak
    idx_old = index_upstream(upstream + [
        {"name": "austin", "status": "end of life", "initial-release": "2010-10-21"}])
    d, _c, _s, _u = compare(honest, idx_old)
    noisy = [x for x in d if x["series"] == "austin"]
    print("  %-22s %s" % ("pre-matrix series", "silent" if not noisy else "NOISE"))
    if noisy:
        failures.append("a series older than the matrix scope was reported as missing")

    # Nowa seria upstream, której nie mamy — jedyny kierunek, w którym „presence"
    # ma sens. Granica zakresu jest brana z macierzy, więc NIE wykryje usunięcia
    # najstarszego wpisu; to jest świadome, bo skracanie zakresu od dołu jest
    # decyzją człowieka, a nie rozjazdem z upstreamem.
    idx_new = index_upstream(upstream + [
        {"name": "indri", "release-id": "2027.1", "status": "maintained",
         "initial-release": "2027-03-24"}])
    d, _c, _s, _u = compare(honest, idx_new)
    hit = [x for x in d if x["field"] == "presence" and x["series"] == "2027.1"]
    print("  %-22s %s" % ("new series upstream", "detected" if hit else "NOT DETECTED"))
    if not hit:
        failures.append("a new series present upstream but absent from the matrix went unnoticed")

    # --- mapowanie na kolla-ansible ---
    km = {"releases": [{"id": "2026.1", "name": "Gazpacho", "kolla": "22.x"},
                       {"id": "2026.2", "name": "Hibiscus", "kolla": None}]}
    kd, kc, ks = compare_kolla(km, {"gazpacho": "22.1.0"}, {})
    ok = not kd and kc == ["2026.1"] and [r for r, _w in ks] == ["2026.2"]
    print("  %-22s %s" % ("kolla mapping clean", "silent" if ok else "FALSE ALARM"))
    if not ok:
        failures.append("the kolla mapping reported drift on data that agrees with upstream")

    kd, _kc, _ks = compare_kolla(km, {"gazpacho": "23.0.1"}, {})
    hit = [x for x in kd if x["series"] == "2026.1" and x["field"] == "kolla"]
    print("  %-22s %s" % ("kolla mapping drift", "detected" if hit else "NOT DETECTED"))
    if not hit:
        failures.append("a kolla-ansible major that disagrees with upstream went unnoticed")

    # Tag końca życia w miejscu numeru wersji nie ma prawa udawać wydania —
    # to był fałszywy alarm "15.x vs zed-eol.x" z pierwszego przebiegu.
    kd, _kc, ks = compare_kolla(
        {"releases": [{"id": "zed", "name": "Zed", "kolla": "15.x"}]},
        {}, {"zed": "deliverable lists no numbered release"})
    ok = not kd and [r for r, _w in ks] == ["zed"]
    print("  %-22s %s" % ("eol tag not a version", "silent" if ok else "FALSE ALARM"))
    if not ok:
        failures.append("an end-of-life tag was treated as a kolla-ansible version")

    # --- słowa kluczowe skanera pochodzą z macierzy, nie z listy w kodzie ---
    kw = scan_keywords({"releases": [
        {"keys": {"om_enable_rabbitmq_stream_fanout": {}},
         "defaults": {"om_rabbitmq_qos_prefetch_count": 50},
         "deprecated": [{"name": "kolla-toolbox", "replacedBy": "kolla_toolbox"}]}]})
    want = {"om_enable_rabbitmq_stream_fanout", "om_rabbitmq_qos_prefetch_count",
            "kolla-toolbox", "kolla_toolbox"} | set(CONSTANT_KEYWORDS)
    ok = want.issubset(set(kw))
    print("  %-22s %s" % ("keywords from matrix", "derived" if ok else "NOT DERIVED"))
    if not ok:
        failures.append("the scanner keywords do not follow the matrix: missing %s"
                        % sorted(want - set(kw)))

    if failures:
        for f in failures:
            print("FAIL " + f, file=sys.stderr)
        return 1
    print("OK   comparator detects every seeded drift and stays quiet on clean data")
    return 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    if "--notes" in sys.argv:
        sys.exit(run_notes())
    if "--apply" in sys.argv:
        import datetime
        matrix = load_matrix()
        series = load_series_status(fetch(SERIES_STATUS_URL))
        drifts, _c, _s, unresolved = compare(matrix, index_upstream(series))
        if unresolved:
            print("FAIL comparison incomplete, refusing to patch", file=sys.stderr)
            sys.exit(2)
        applied, deferred = apply_patch(
            drifts, today=datetime.date.today().isoformat())
        for d in applied:
            print("applied  %-8s %-10s -> %s" % (d["series"], d["field"], d["upstream"]))
        for d in deferred:
            print("deferred %-8s %-10s (needs a human)" % (d["series"], d["field"]))
        # Odłożenie wszystkiego dla człowieka to poprawny wynik, nie porażka.
        # Kod różny od zera ubijał krok, a razem z nim kolejne — w tym ten, który
        # zakłada issue o nowej serii, czyli dokładnie ten przypadek.
        sys.exit(0)
    sys.exit(run(as_json="--json" in sys.argv))
