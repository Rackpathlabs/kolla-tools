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


# --- wartości domyślne upstreamu (ADR-005, #81) -------------------------------

DEFAULTS_RAW_URL = (
    "https://raw.githubusercontent.com/openstack/kolla-ansible/{tag}/{path}"
)
# SHA obiektu, na który wskazuje ścieżka wydania. Bierzemy je z LISTINGU KATALOGU
# NADRZĘDNEGO, jednym zapytaniem dla obu przypadków: do 20.x `group_vars/all.yml`
# jest plikiem (sha bloba), od 21.x `group_vars/all/` jest katalogiem (sha drzewa),
# a listing rodzica podaje jedno i drugie w tym samym polu. Liczenie sha bloba
# lokalnie obsłużyłoby tylko połowę wydań, a połowa pokrycia w polu, które ma
# przypinać źródło, jest gorsza niż brak — bo wygląda tak samo jak całość.
DEFAULTS_SHA_URL = (
    "https://api.github.com/repos/openstack/kolla-ansible/contents/{parent}?ref={tag}"
)

YAML_TRUE = ("true", "yes", "on")
YAML_FALSE = ("false", "no", "off")


def yaml_bool(literal):
    """Napis -> True/False, albo None, jeśli to nie jest boolean YAML-a.

    Odpowiednik `yamlBool` z generatora i istnieje z tego samego powodu: między
    21.x a 22.x trzynaście wartości zmieniło pisownię z "no" na false, nie zmieniając
    znaczenia. Widok różnic ma tego NIE pokazywać jako zmiany; tabela ma pisownię
    zapisać, bo cytuje źródło. Jedna funkcja obsługuje obie potrzeby, bo obie pytają
    o to samo: czy te dwa napisy znaczą to samo.
    """
    t = str(literal).strip().strip('"').strip("'").lower()
    if t in YAML_TRUE:
        return True
    if t in YAML_FALSE:
        return False
    return None


def read_default(text, key, kind):
    """(wartość, numer linii) dla klucza w pliku źródłowym, albo (None, None).

    Klucz na POZIOMIE ZEROWYM wcięcia — `octavia_amp_network` w roli stoi tak samo
    jak `network_interface` w group_vars, a klucz zagnieżdżony w cudzej mapie nie
    jest wartością domyślną tego klucza i nie ma prawa się tu dopasować.

    Dla `kind == "map"` wartością jest CAŁY blok: linia klucza i wszystko bardziej
    wcięte pod nią. Ansible zastępuje słowniki w całości, więc porównywanie samej
    linii nagłówka nie zauważyłoby zmiany żadnego pola w środku.
    """
    lines = text.split("\n")
    head = re.compile(r"^%s:(.*)$" % re.escape(key))
    for i, line in enumerate(lines):
        m = head.match(line)
        if not m:
            continue
        if kind != "map":
            return m.group(1).strip(), i + 1
        block = [line.rstrip()]
        for nxt in lines[i + 1:]:
            if nxt.strip() and not nxt.startswith((" ", "\t")):
                break
            if nxt.strip():
                block.append(nxt.rstrip())
        return "\n".join(block), i + 1
    return None, None


def compare_defaults(defaults, sources):
    """Zwraca (drifts, compared, skipped) dla tabeli wartości domyślnych.

    Czysty komparator: dostaje sparsowany defaults.js i mapę (wydanie, ścieżka) ->
    treść pliku z otagowanego drzewa. Bez sieci, więc --self-test dowodzi go w ci.yml.

    KAŻDA para (wydanie, klucz) kończy w 'compared' albo w 'skipped' Z POWODEM.
    Wydanie nieskatalogowane i plik, którego nie udało się pobrać, wyglądają w ciszy
    identycznie jak zgodność — i to jest ta sama pomyłka, przed którą broni się
    komparator serii wyżej.
    """
    drifts, compared, skipped = [], [], []
    releases = defaults.get("releases", {})

    for rid, rel in releases.items():
        if not rel.get("catalogued"):
            skipped.append((rid, "release not catalogued in defaults.js"))

    for key, entry in sorted(defaults.get("keys", {}).items()):
        kind = entry.get("kind")
        for rid, val in sorted((entry.get("values") or {}).items()):
            rel = releases.get(rid) or {}
            if not rel.get("catalogued"):
                continue        # powód zgłoszony raz na wydanie, nie raz na klucz
            path = val.get("path")
            text = sources.get((rid, path))
            if text is None:
                skipped.append(("%s/%s" % (rid, key), "source not fetched: " + str(path)))
                continue

            found, line = read_default(text, key, kind)
            if found is None:
                drifts.append({"release": rid, "key": key, "field": "presence",
                               "ours": path, "upstream": None,
                               "why": "key not found at the recorded path"})
                compared.append((rid, key))
                continue

            field = "expr" if kind == "derived" else "literal"
            ours = val.get(field)
            if found != ours:
                d = {"release": rid, "key": key, "field": field,
                     "ours": ours, "upstream": found}
                if kind == "scalar":
                    a, b = yaml_bool(ours), yaml_bool(found)
                    if a is not None and a == b:
                        d["sameMeaning"] = True
                drifts.append(d)

            if line != val.get("line"):
                drifts.append({"release": rid, "key": key, "field": "line",
                               "ours": val.get("line"), "upstream": line})
            compared.append((rid, key))

    return drifts, compared, skipped


def fetch_defaults_sources(defaults, fetcher=fetch):
    """(sources, absent) — treść każdego pliku, do którego tabela się odwołuje.

    Pobieramy PO ŚCIEŻKACH ZAPISANYCH W TABELI, nie po listingu katalogu. Gdy upstream
    przeniesie klucz do innego pliku, zapisana ścieżka przestaje go zawierać i wychodzi
    to jako rozjazd 'presence' — czyli jako pytanie do człowieka, a nie jako cicha
    zgodność, którą dałoby szukanie klucza gdziekolwiek.
    """
    sources, absent = {}, []
    wanted = set()
    for entry in defaults.get("keys", {}).values():
        for rid, val in (entry.get("values") or {}).items():
            rel = defaults.get("releases", {}).get(rid) or {}
            if rel.get("catalogued") and val.get("path"):
                wanted.add((rid, val["path"]))
    for rid, path in sorted(wanted):
        tag = defaults["releases"][rid]["tag"]
        try:
            sources[(rid, path)] = fetcher(DEFAULTS_RAW_URL.format(tag=tag, path=path))
        except Exception as exc:            # noqa: BLE001 - powód ma trafić do raportu
            absent.append(("%s/%s" % (rid, path), "fetch failed: %s" % exc))
    return sources, absent


def fetch_defaults_shas(defaults, fetcher=fetch):
    """(shas, absent) — sha obiektu, na który wskazuje `path` każdego skatalogowanego wydania."""
    shas, absent = {}, []
    for rid, rel in sorted(defaults.get("releases", {}).items()):
        if not rel.get("catalogued"):
            continue
        p = str(rel.get("path", "")).rstrip("/")
        parent, _, name = p.rpartition("/")
        try:
            listing = json.loads(fetcher(DEFAULTS_SHA_URL.format(parent=parent, tag=rel["tag"])))
        except Exception as exc:            # noqa: BLE001
            absent.append((rid, "listing failed: %s" % exc))
            continue
        hit = [e for e in listing if e.get("name") == name]
        if not hit:
            absent.append((rid, "%s not present under %s at %s" % (name, parent, rel["tag"])))
            continue
        shas[rid] = hit[0].get("sha")
    return shas, absent


def compare_defaults_shas(defaults, shas):
    """Rozjazd sha wydania: drzewo pod zapisanym tagiem przestało być tym, co przeczytaliśmy."""
    drifts = []
    for rid, sha in sorted(shas.items()):
        ours = defaults["releases"][rid].get("sha")
        if ours and sha and ours != sha:
            drifts.append({"release": rid, "key": "-", "field": "sha",
                           "ours": ours, "upstream": sha})
    return drifts


def _obj_span(text, brace_at):
    """Zakres obiektu { ... } zaczynającego się na brace_at, z poszanowaniem napisów.

    Liczenie klamer bez patrzenia na cudzysłowy urwałoby się na PIERWSZYM literale mapy:
    `"{{ octavia_amp_network_cidr }}"` niesie klamry W ŚRODKU napisu. Pierwsza wersja tej
    łatki używała `[^}]*?` i przez to odkładała wszystko przy tym jednym kluczu — czyli
    cichła dokładnie na wpisie, dla którego rodzaj "map" powstał.
    """
    depth, i, n = 0, brace_at, len(text)
    while i < n:
        c = text[i]
        if c in "'\"":
            q, i = c, i + 1
            while i < n and text[i] != q:
                i += 2 if text[i] == "\\" else 1
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return brace_at, i + 1
        i += 1
    return None


def apply_defaults(drifts, shas, path="defaults.js"):
    """Nanosi WYŁĄCZNIE wartości, numery linii i sha źródeł. Nigdy keys{}, kind ani wag.

    Granica jest tu, a nie w recenzji, bo recenzent draftu widzi diff, a nie intencję
    skryptu. Rozjazd 'presence' — klucza nie ma pod zapisaną ścieżką — zostaje dla
    człowieka ZAWSZE: odpowiedzią na niego jest nowa ścieżka albo nowy rodzaj wpisu,
    czyli semantyka, a semantyki ten skrypt nie dotyka.

    Podmiana jest zakresowa, nie globalna: najpierw obiekt jednego klucza, w nim obiekt
    jednego wydania. Ten sam literał stoi pod trzema wydaniami i podmiana globalna
    trafiłaby we wszystkie trzy.
    """
    text = io_read(path)
    applied, deferred = [], []

    for d in drifts:
        if d["field"] == "presence":
            deferred.append(d)
            continue

        if d["field"] == "sha":
            m = re.search(r'"%s":\s*\{' % re.escape(d["release"]), text)
            span = _obj_span(text, m.end() - 1) if m else None
            if not span:
                deferred.append(d); continue
            body = text[span[0]:span[1]]
            body2, n = re.subn(r'(sha:\s*")[0-9a-f]+(")',
                               lambda mm: mm.group(1) + d["upstream"] + mm.group(2),
                               body, count=1)
            if not n:
                deferred.append(d); continue
            text = text[:span[0]] + body2 + text[span[1]:]
            applied.append(d)
            continue

        m = re.search(r'^      "%s":\s*\{' % re.escape(d["key"]), text, re.M)
        span = _obj_span(text, m.end() - 1) if m else None
        if not span:
            deferred.append(d); continue
        entry = text[span[0]:span[1]]

        mr = re.search(r'"%s":\s*\{' % re.escape(d["release"]), entry)
        vspan = _obj_span(entry, mr.end() - 1) if mr else None
        if not vspan:
            deferred.append(d); continue
        value = entry[vspan[0]:vspan[1]]

        if d["field"] == "line":
            value2, n = re.subn(r'(line:\s*)\d+',
                                lambda mm: mm.group(1) + str(d["upstream"]), value, count=1)
        else:
            value2, n = re.subn(
                r"(%s:\s*)('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")" % d["field"],
                lambda mm: mm.group(1) + js_literal(d["upstream"]), value, count=1)
        if not n:
            deferred.append(d); continue

        entry = entry[:vspan[0]] + value2 + entry[vspan[1]:]
        text = text[:span[0]] + entry + text[span[1]:]
        applied.append(d)

    if applied:
        io_write(path, text)
    return applied, deferred


def js_literal(value):
    """Napis -> literał JavaScriptu w apostrofach.

    W apostrofach, bo wartości upstreamu SAME zawierają cudzysłowy — `"eth0"` jest
    tam z cudzysłowami i pisownia jest informacją. Nowa linia w bloku mapy idzie
    jako \n, tak jak stoi w pliku napisanym ręcznie.
    """
    return "'" + (str(value).replace("\\", "\\\\").replace("'", "\\'")
                  .replace("\n", "\\n")) + "'"


def load_defaults(path="defaults.js"):
    """defaults.js to czysty literał danych — wyciągamy go Node'em, jak matrix.js."""
    node = os.environ.get("NODE", "node")
    out = subprocess.run(
        [node, "-e",
         "const fs=require('fs');eval(fs.readFileSync(process.argv[1],'utf8'));"
         "process.stdout.write(JSON.stringify(KOLLA_DEFAULTS))", path],
        capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


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

    # Wartości domyślne upstreamu (ADR-005). Osobna rubryka i osobne liczby, bo
    # porównuje CO INNEGO — nie kalendarz wydań, tylko treść cudzych plików.
    defaults = load_defaults()
    dsources, dabsent = fetch_defaults_sources(defaults)
    ddrifts, dcompared, dskipped = compare_defaults(defaults, dsources)
    dskipped = dskipped + dabsent
    dshas, shaabsent = fetch_defaults_shas(defaults)
    ddrifts = ddrifts + compare_defaults_shas(defaults, dshas)
    dskipped = dskipped + shaabsent

    total = len(matrix["releases"])
    if as_json:
        print(json.dumps({"drifts": drifts, "compared": compared,
                          "skipped": skipped, "unresolved": unresolved,
                          "kollaCompared": kcompared, "kollaSkipped": kskipped,
                          "defaultsDrifts": ddrifts,
                          "defaultsCompared": [list(x) for x in dcompared],
                          "defaultsSkipped": dskipped}, indent=2))
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
        print("upstream defaults    compared: %d   skipped: %d"
              % (len(dcompared), len(dskipped)))
        for rid, why in dskipped:
            print("  skipped %-16s %s" % (rid, why))
        if not drifts and not ddrifts:
            print("OK   no drift against upstream")
        for d in drifts:
            print("DRIFT %-8s %-10s ours=%s upstream=%s"
                  % (d["series"], d["field"], d["ours"], d["upstream"]))
        for d in ddrifts:
            print("DRIFT %-8s %-34s %-8s ours=%s upstream=%s%s"
                  % (d["release"], d["key"], d["field"], d["ours"], d["upstream"],
                     "   (spelling only, same meaning)" if d.get("sameMeaning") else ""))

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

    return 1 if (drifts or ddrifts) else 0


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

    # --- WARTOŚCI DOMYŚLNE UPSTREAMU (ADR-005, #81) ---------------------------
    #
    # Tabela w defaults.js jest MIGAWKĄ cudzego repozytorium. Migawka, której nikt
    # nie odświeża, po jednym wydaniu upstreamu twierdzi coś nieprawdziwego o pliku,
    # którego nie czytała — i twierdzi to tym samym zdaniem co wtedy, gdy była
    # prawdziwa. Ta klasa jest jedyną rzeczą stojącą między tabelą a taką migawką.
    #
    # Komparator jest CZYSTY: dostaje sparsowany defaults.js i teksty plików
    # z otagowanego drzewa, więc cały ten dowód działa bez sieci, w ci.yml.
    dsrc_all = ("---\n"
                "network_interface: \"eth0\"\n"
                "api_interface: \"{{ network_interface }}\"\n"
                "enable_octavia: \"no\"\n")
    dsrc_role = ("---\n"
                 "octavia_amp_network:\n"
                 "  name: lb-mgmt-net\n"
                 "  subnet:\n"
                 "    name: lb-mgmt-subnet\n")
    P_ALL, P_ROLE = "ansible/group_vars/all/common.yml", "ansible/roles/octavia/defaults/main.yml"
    defaults_honest = {
        "releases": {"2026.1": {"tag": "22.1.0", "catalogued": True,
                                "path": "ansible/group_vars/all/", "sha": "6d3ced62"},
                     "2026.2": {"catalogued": False}},
        "keys": {
            "network_interface": {"kind": "scalar", "values": {
                "2026.1": {"literal": '"eth0"', "path": P_ALL, "line": 2}}},
            "api_interface": {"kind": "derived", "values": {
                "2026.1": {"expr": '"{{ network_interface }}"', "path": P_ALL, "line": 3}}},
            "enable_octavia": {"kind": "scalar", "values": {
                "2026.1": {"literal": '"no"', "path": P_ALL, "line": 4}}},
            "octavia_amp_network": {"kind": "map", "values": {
                "2026.1": {"literal": "octavia_amp_network:\n  name: lb-mgmt-net\n"
                                      "  subnet:\n    name: lb-mgmt-subnet",
                           "path": P_ROLE, "line": 2}}}}}
    sources_honest = {("2026.1", P_ALL): dsrc_all, ("2026.1", P_ROLE): dsrc_role}

    dd, dcomp, dskip = compare_defaults(defaults_honest, sources_honest)
    print("  %-22s %s" % ("defaults clean", "silent" if not dd else "FALSE ALARM"))
    if dd:
        failures.append("the defaults table reported drift against data that agrees: %r" % dd)
    if len(dcomp) != 4:
        failures.append("expected 4 compared default values, got %d" % len(dcomp))
    # Wydanie nieskatalogowane MUSI trafić do pominiętych z powodem. Cisza na nim
    # czyta się jak zgodność, a to jest dokładnie ta pomyłka, którą flaga
    # `catalogued` ma nazwać zamiast ukryć.
    ok = any(r == "2026.2" for r, _w in dskip)
    print("  %-22s %s" % ("uncatalogued named", "named" if ok else "SILENT"))
    if not ok:
        failures.append("an uncatalogued release was passed over without a reason")

    dcases = [
        ("default value moved", {("2026.1", P_ALL): dsrc_all.replace('"eth0"', '"eth1"')},
         "network_interface", "literal"),
        ("default line moved", {("2026.1", P_ALL): "# added a line\n" + dsrc_all},
         "network_interface", "line"),
        ("key left the file", {("2026.1", P_ALL): dsrc_all.replace("network_interface: \"eth0\"\n", "")},
         "network_interface", "presence"),
        ("derived expr changed", {("2026.1", P_ALL): dsrc_all.replace("{{ network_interface }}",
                                                                     "{{ network_interface | default('eth0') }}")},
         "api_interface", "expr"),
        ("map body changed", {("2026.1", P_ROLE): dsrc_role.replace("lb-mgmt-net", "lb-mgmt-net2")},
         "octavia_amp_network", "literal"),
    ]
    for label, patch, key, field in dcases:
        src = dict(sources_honest); src.update(patch)
        dd, _c, _s = compare_defaults(defaults_honest, src)
        hit = [x for x in dd if x["key"] == key and x["field"] == field]
        print("  %-22s %s" % (label, "detected" if hit else "NOT DETECTED"))
        if not hit:
            failures.append("defaults drift not detected: %s (%s/%s)" % (label, key, field))

    # PISOWNIA BOOLEANA. Między 21.x a 22.x trzynaście wartości zmieniło "no" na
    # false bez zmiany znaczenia. Dla WIDOKU RÓŻNIC to nie jest zmiana i ADR-005
    # każe porównywać przez yamlBool. Dla TABELI to jest zmiana, bo tabela cytuje
    # pisownię ze źródła — więc rozjazd jest zgłaszany, ale NIESIE ZNACZNIK, że
    # znaczenie jest to samo. Bez znacznika recenzent trzynastu wierszy nie odróżni
    # od trzynastu zmian zachowania, a wtedy przejrzy je wszystkie tak samo.
    #
    # Kierunek jest w tych dwóch przypadkach ISTOTNY i pierwsza wersja tego testu go
    # pomyliła: podstawiła "yes" -> false i zażądała znacznika. To jest zmiana
    # ZNACZENIA, nie pisowni, i komparator słusznie znacznika nie postawił. Upstream
    # zrobił "no" -> false, i tak stoi tu teraz.
    src = dict(sources_honest)
    src[("2026.1", P_ALL)] = dsrc_all.replace('enable_octavia: "no"', "enable_octavia: false")
    dd, _c, _s = compare_defaults(defaults_honest, src)
    hit = [x for x in dd if x["key"] == "enable_octavia" and x["field"] == "literal"]
    print("  %-22s %s" % ("bool respelled", "detected" if hit else "NOT DETECTED"))
    if not hit:
        failures.append("a boolean respelled upstream was not recorded as drift")
    elif hit[0].get("sameMeaning") is not True:
        failures.append("a spelling-only boolean change was not marked as such")
    # I ODWROTNIE: zmiana znaczenia nie ma prawa dostać tego znacznika.
    src[("2026.1", P_ALL)] = dsrc_all.replace('enable_octavia: "no"', 'enable_octavia: "yes"')
    dd, _c, _s = compare_defaults(defaults_honest, src)
    hit = [x for x in dd if x["key"] == "enable_octavia"]
    ok = bool(hit) and hit[0].get("sameMeaning") is not True
    print("  %-22s %s" % ("bool value flipped", "detected" if ok else "NOT DETECTED"))
    if not ok:
        failures.append("a boolean whose VALUE changed was reported as spelling only")

    # Nieodebrany plik to nie jest czysty przebieg. Ta sama zasada co przy seriach:
    # cicha awaria pobierania wygląda dokładnie jak zgodność.
    dd, _c, dskip = compare_defaults(defaults_honest, {("2026.1", P_ROLE): dsrc_role})
    ok = any("ansible/group_vars" in w for _r, w in dskip) and not [x for x in dd if x["key"] == "network_interface"]
    print("  %-22s %s" % ("source not fetched", "named" if ok else "SILENT"))
    if not ok:
        failures.append("a source that was never fetched did not reach the skipped column")

    # GRANICA --apply. Zdanie „nanosi wartości, nigdy semantyki" stoi w ADR-005 i w
    # opisie draftu; tu jest sprawdzane, bo recenzent draftu widzi diff, a nie intencję.
    # Podkładka jest kopią kształtu defaults.js, nie samym plikiem — test ma dowodzić
    # łatki, a nie zależeć od dzisiejszych danych.
    import tempfile
    stub = ('  var KOLLA_DEFAULTS = {\n'
            '    releases: {\n'
            '      "2026.1": { tag: "22.1.0", catalogued: true,\n'
            '                 path: "ansible/group_vars/all/", sha: "6d3ced62" }\n'
            '    },\n'
            '    keys: {\n'
            '      "network_interface": { kind: "scalar",\n'
            '        values: {\n'
            '          "2026.1": { literal: \'"eth0"\', path: "p", line: 2 }\n'
            '        } },\n'
            '      "enable_octavia": { kind: "scalar",\n'
            '        values: {\n'
            '          "2026.1": { literal: \'"no"\', path: "p", line: 4 }\n'
            '        } },\n'
            '      "octavia_amp_network": { kind: "map",\n'
            '        values: {\n'
            '          "2026.1": { literal: \'octavia_amp_network:\\n  cidr: "{{ x }}"\',\n'
            '                     path: "r", line: 9 }\n'
            '        } }\n'
            '    }\n'
            '  };\n')
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as fh:
        fh.write(stub); stub_path = fh.name
    ap, df = apply_defaults([
        {"release": "2026.1", "key": "network_interface", "field": "literal",
         "ours": '"eth0"', "upstream": '"eth1"'},
        {"release": "2026.1", "key": "enable_octavia", "field": "line",
         "ours": 4, "upstream": 7},
        {"release": "2026.1", "key": "-", "field": "sha",
         "ours": "6d3ced62", "upstream": "aabbccdd"},
        {"release": "2026.1", "key": "network_interface", "field": "presence",
         "ours": "p", "upstream": None},
        # Literał mapy niesie klamry W ŚRODKU napisu — na tym urwała się pierwsza
        # wersja łatki, odkładając dla człowieka wpis, dla którego rodzaj powstał.
        {"release": "2026.1", "key": "octavia_amp_network", "field": "line",
         "ours": 9, "upstream": 11},
    ], {}, path=stub_path)
    patched = io_read(stub_path)
    os.unlink(stub_path)
    ok = (len(ap) == 4 and len(df) == 1 and df[0]["field"] == "presence"
          and '"eth1"' in patched and "line: 7" in patched and "line: 11" in patched
          and 'sha: "aabbccdd"' in patched)
    print("  %-22s %s" % ("apply writes values", "applied" if ok else "NOT APPLIED"))
    if not ok:
        failures.append("--apply did not write the values it is allowed to write: %r %r" % (ap, df))
    # Drugi klucz nie ma prawa ruszyć się przy podmianie pierwszego: oba niosą
    # ten sam kształt wpisu i podmiana globalna trafiłaby w oba.
    if '"no"' not in patched:
        failures.append("--apply changed a key it was not asked about")
    # I to, czego nie wolno tknąć NIGDY.
    if 'kind: "scalar"' not in patched or patched.count("kind:") != stub.count("kind:"):
        failures.append("--apply touched kind, which is semantics")
    if patched.count('": {') != stub.count('": {'):
        failures.append("--apply changed the shape of keys{}")

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

        # Wartości domyślne: nanoszone są WYŁĄCZNIE literały, wyrażenia, numery linii
        # i sha źródeł. keys{}, kind i cokolwiek o wadze zostaje dla człowieka —
        # granica z ADR-005, zapisana tu, a nie tylko w opisie draftu.
        defaults = load_defaults()
        dsources, dabsent = fetch_defaults_sources(defaults)
        ddrifts, _dc, dskipped = compare_defaults(defaults, dsources)
        dshas, shaabsent = fetch_defaults_shas(defaults)
        ddrifts = ddrifts + compare_defaults_shas(defaults, dshas)
        for rid, why in dskipped + dabsent + shaabsent:
            print("skipped  %-16s %s" % (rid, why))
        dapplied, ddeferred = apply_defaults(ddrifts)
        for d in dapplied:
            print("applied  %-8s %-34s %-8s -> %s"
                  % (d["release"], d["key"], d["field"], d["upstream"]))
        for d in ddeferred:
            print("deferred %-8s %-34s %-8s (needs a human)"
                  % (d["release"], d["key"], d["field"]))
        if dapplied:
            print("NOTE defaults.js changed — run tools/sync-blocks.sh before committing")
        # Odłożenie wszystkiego dla człowieka to poprawny wynik, nie porażka.
        # Kod różny od zera ubijał krok, a razem z nim kolejne — w tym ten, który
        # zakłada issue o nowej serii, czyli dokładnie ten przypadek.
        sys.exit(0)
    sys.exit(run(as_json="--json" in sys.argv))
