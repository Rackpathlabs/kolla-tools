/* Kryterium kompletności: narzędzia mówią wyłącznie po angielsku.
 *
 * Ta asercja powstała PRZED tłumaczeniem i była czerwona od pierwszej chwili.
 * To nie jest szczegół procesu, tylko powód, dla którego można jej ufać: miernik
 * budowany PO pracy ma tendencję do jej potwierdzania — nie przez nieuczciwość,
 * tylko dlatego, że powstaje z patrzenia na to, co już jest, i opisuje stan
 * zastany zamiast wymagania. Poprzednik tego pliku (tools/untranslated.js)
 * powstał dokładnie tak i przepuścił nieprawdziwe twierdzenie o kompletności
 * do main.
 *
 * Mierzy PRZEDMIOT, nie kod: uruchamia narzędzie ścieżką renderującą maksimum
 * tekstu i zbiera to, co użytkownik faktycznie zobaczy.
 *
 * ============================================================================
 * PRZEPISANY 2026-08-19 (#63). Poprzednia wersja raportowała ZERO na trzynastu
 * pozycjach znalezionych ręcznie. Para liczb 13/0 jest miarą luki i dlatego
 * stoi tutaj, a nie w opisie commita: kolejny autor tego pliku ma zobaczyć,
 * czym skończyło się kryterium treści, zanim wpadnie na to samo.
 *
 * DWIE NIEZALEŻNE DROGI UCIECZKI, obie zamknięte niżej:
 *
 *   KRYTERIUM. Stara wersja pytała „czy napis zawiera polski diakrytyk albo
 *     słowo z listy funkcyjnej". Przepuszczała WSZYSTKIE trzynaście, bo żadna
 *     nie ma diakrytyku i żadna nie trafiła w listę: „Panel webowy.",
 *     „Orkiestracja szablonami.", „Wolumeny blokowe.", „brak", „LVM (lokalny)",
 *     „dziedziczy network_interface", „wymagane". Lista słów funkcyjnych jest
 *     kryterium TREŚCI: przepuszcza to, o czym autor listy nie pomyślał, a jej
 *     powiększanie to powtarzanie tej samej pomyłki wolniej.
 *
 *   ZAKRES. Stara wersja czytała markup przez body.replace(/<[^>]+>/g, "\n"),
 *     czyli usuwała atrybuty RAZEM ze znacznikiem. Cztery placeholdery — w tym
 *     jeden czytany na głos przez czytnik ekranu — nie były zbierane w ogóle.
 *     Zielone przy NIEOBECNYM przedmiocie pomiaru, wariant, którego nie da się
 *     złapać psuciem: popsucie rzeczy niezbieranej też nie zapala lampki.
 *
 * ODWRÓCENIE KRYTERIUM. Nie pytamy tysiąc razy „czy ten napis jest polski?"
 * wyrażeniem regularnym. Pytamy RAZ NA SŁOWO nad kompletną listą różnych słów,
 * a odpowiedź zapisujemy w tools/vocabulary-en.txt. Ten sam kształt co
 * check-dictionary.js: jedno pytanie nad listą, którą człowiek potrafi
 * przeczytać, zamiast tysiąca pytań przez wzorzec.
 *
 * DLACZEGO NIE PRÓG „połowa słów obca". Pierwsza wersja skanu ręcznego użyła
 * właśnie progu i PRZEOCZYŁA generator.html:327 „dziedziczy api_interface" —
 * napis już wtedy znany — bo dwa z trzech jego słów są angielskie i stosunek
 * wyszedł 1/3. Próg nad słowami to lista funkcyjna w innym płaszczu. Wyszło to
 * na jaw wyłącznie dlatego, że był znany element do sprawdzenia metody; bez
 * niego odpowiedź brzmiałaby „pięć".
 *
 * KOSZT, nazwany tutaj, a nie odkryty przy wdrożeniu: to jest BRAMA PRZEGLĄDU
 * wykonywana przez człowieka. Nowe słowo w interfejsie = czerwony build, dopóki
 * ktoś tego słowa nie przeczyta i nie dopisze do słownika akceptacji. Czytany
 * jest wyłącznie PRZYROST wobec zbioru zapisanego w repozytorium, więc koszt
 * jest proporcjonalny do zmiany, a nie do korpusu. Zbiór jest wersjonowany
 * w repozytorium właśnie po to — zaakceptowany zbiór w czyjejś pamięci nie jest
 * zbiorem zaakceptowanym.
 *
 * NIE MA TU FLAGI --update. Słownik akceptacji uzupełnia się RĘCZNIE, wklejając
 * blok, który ten strażnik wypisuje przy porażce. Odruchowe --update na czerwonym
 * diffie jest awarią, na którą to repozytorium ma już nazwę i siedem czerwonych
 * fixtur przyjętych jako nowe wyjście (docs/PRINCIPLES.md). Brama przeglądu
 * z przyciskiem „zaakceptuj wszystko" nie jest bramą przeglądu.
 * ============================================================================
 *
 * ============================================================================
 * ZAKRES, ZAWĘŻONY 2026-09-01 (ADR-003, opcja C). Zdanie otwierające ten nagłówek
 * mówi o KOMPLETNOŚCI i jest za szerokie. Ten strażnik mierzy tekst padający na
 * ŚCIEŻKACH, KTÓRYMI PRZEJEDZIE — trzynaście scenariuszy plus słownik. Literał
 * na ścieżce, której żaden scenariusz nie wykonuje, jest dla niego niewidoczny,
 * i NIE jest to wada do naprawienia w tym pliku.
 *
 * Strażnika ŹRÓDŁOWEGO — czytającego literały zamiast wykonania — NIE MA i nie
 * jest planowany. ADR-003 rozstrzygnął to jako opcję C: własny tokenizer
 * JavaScriptu ma tryb awarii „cicha zła liczba", a to repozytorium wyprodukowało
 * już trzy takie, w tym dwie w skanerach pisanych dokładnie do tego zadania.
 * Przy rewizji wchodzi opcja B — zależność wyłącznie dla tools/ — nigdy A.
 *
 * Co zostaje niesprawdzone, powiedziane wprost, żeby nie wynikało z milczenia:
 * polski literał na ścieżce spoza scenariuszy nie jest widziany ani tutaj, ani
 * przez check-dictionary.js, ani przez migawkę, ani przez goldeny. Jedyną obroną
 * jest czytanie diffu z tym pytaniem — obrona PROCEDURALNA, nie mechaniczna.
 *
 * Zmierzone 2026-09-01, przy tym strażniku ZIELONYM: siedem polskich napisów
 * dociera do użytkownika — sześć w validator.html, jeden w opisie meta
 * generator.html. Znalezione czytaniem. Rejestr tych znalezisk prowadzi #77
 * i to on decyduje o rewizji ADR-003.
 * ============================================================================
 *
 * Przy porażce wypisuje CO i GDZIE, nie samą liczbę — dzięki temu jest
 * jednocześnie bramką i narzędziem roboczym.
 *
 * Użycie:
 *     node tools/check-english.js <script.tmp.js> <html> <validator|generator|hub>
 *     node tools/check-english.js --fixture <html>     # fixtura samowystarczalna
 */

var fs = require("fs");
var path = require("path");
var lib = require("./testlib");

var root = path.join(__dirname, "..");

/* ---- słownik akceptacji ---------------------------------------------------- */
/* Jedno słowo w linii, małymi literami, posortowane. Komentarze od #.
   To jest ODPOWIEDŹ CZŁOWIEKA na pytanie „czy to słowo należy do angielskiego
   interfejsu tych narzędzi" — nie lista dopuszczonych napisów i nie lista
   wyjątków. Różnica jest w liczbie pytań: napisów są tysiące i rosną z każdym
   komunikatem, słów jest osiemset i rosną o kilka na zmianę. */
var VOCAB_FILE = path.join(root, "tools", "vocabulary-en.txt");

function vocabulary() {
  var set = Object.create(null);
  fs.readFileSync(VOCAB_FILE, "utf8").split("\n").forEach(function (line) {
    var w = line.replace(/#.*$/, "").trim().toLowerCase();
    if (w) set[w] = 1;
  });
  return set;
}

/* ---- tokenizacja ------------------------------------------------------------ */
/* Tniemy po granicy liter, więc network_interface daje "network" i "interface",
   a 10.0.0.11 nie daje nic. Zakres znaków obejmuje diakrytyki, żeby polskie
   słowo nie rozpadło się na kawałki i nie zniknęło z listy do przeczytania.

   POJEDYNCZE LITERY ZOSTAJĄ, choć są szumem. Odsianie ich zrobiłoby ślepą plamkę
   dokładnie na tej polszczyźnie, dla której ten strażnik jest przepisywany:
   „w nadpisaniu", „i", „z", „o" nie mają diakrytyku ani długości, więc odpadłyby
   z listy do przeczytania tą samą drogą, którą odpadły z listy słów funkcyjnych.
   Angielskie „a" kosztuje jedną linię w słowniku akceptacji; polskie „w" bez tej
   decyzji kosztowałoby całą kategorię.

   DWIE RZECZY ZNIKAJĄ PRZED TOKENIZACJĄ, bo nie są słowami, które ktokolwiek widzi:

     encje HTML — użytkownik widzi „ i →, nie „ldquo" i „rarr". Tokenizacja
       surowego markupu wyprodukowała ldquo, rdquo, rarr, quot, lt i gt jako
       „słowa interfejsu do przeczytania". Przyjęcie ich do słownika akceptacji
       byłoby zapisaniem artefaktu pomiaru jako faktu o produkcie.

     nazwy wstawek {…} — „{releaseTo}" dało „releaseto", „{computeCount}" dało
       „computecount". Wstawka jest miejscem na wartość, a nie tekstem; na ekranie
       stoi w tym miejscu liczba albo nazwa wydania. check-dictionary.js tnie
       dokładnie tak samo i z dokładnie tego powodu.

   Obie znalazły się dopiero przy CZYTANIU listy — czyli zrobiła to brama przeglądu,
   nie kontrola automatyczna, i to jest argument za bramą, nie przeciw niej. */
var ENTITIES = {
  ldquo: "\u201c", rdquo: "\u201d", lsquo: "\u2018", rsquo: "\u2019",
  rarr: "\u2192", larr: "\u2190", quot: '"', amp: "&", lt: "<", gt: ">",
  nbsp: " ", mdash: "\u2014", ndash: "\u2013", hellip: "\u2026", times: "\u00d7"
};

/* KOLEJNOŚĆ MA ZNACZENIE i jest tu jedyną rzeczą nieoczywistą.
   Znaczniki znikają PRZED encjami, encje przed wstawkami. Odwrotnie — encje
   najpierw — „&lt;none&gt;" zamieniłoby się w „<none>", a to zostałoby zjedzone
   jako znacznik razem ze słowem, które użytkownik na ekranie WIDZI. Wpis słownika
   niosący <code>klucz</code> ma oddać „klucz", a nie „code klucz code": nazwa
   znacznika nie jest słowem, które ktokolwiek czyta. */
function plain(text) {
  return String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/&([a-zA-Z]+);/g, function (whole, name) {
      var lower = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(ENTITIES, lower) ? ENTITIES[lower] : " ";
    })
    .replace(/&#[0-9]+;|&#x[0-9a-fA-F]+;/g, " ")
    .replace(/\{[^}]*\}/g, " ");
}

function words(text) {
  return plain(text).match(/[A-Za-zÀ-ɏ]+/g) || [];
}

/* ---- zbieranie ------------------------------------------------------------- */
/* ZAKRES Z DEFINICJI, nie z dzisiejszych trafień: KAŻDE miejsce, w którym tekst
   dociera do użytkownika. Lista wzięta z dzisiejszych trafień starzeje się przy
   pierwszym nowym widoku — tak jak zestarzała się lista kontenerów w kategorii
   danych i lista plików w strażniku bajtowym. */
var VISIBLE_ATTRS = ["placeholder", "title", "aria-label", "aria-description", "alt"];

var segments = [];
var DATA_WORDS = Object.create(null);

function addSeg(where, text) {
  if (text === undefined || text === null) return;
  if (String(text).trim().length < 3) return;
  segments.push({ where: where, text: String(text) });
}

/* Słowa POCHODZĄCE Z WEJŚCIA są danymi, gdziekolwiek się pojawią. Kryterium
   POCHODZENIA, nie listy pojemników: treść przykładowego inventory wraca na ekran
   w findingach, w tabeli topologii i w podglądzie pliku, a nazwa grupy z pliku
   użytkownika nie jest tekstem interfejsu w żadnym z tych miejsc. Lista pojemników
   zestarzałaby się przy pierwszym nowym widoku; zdanie o pochodzeniu nie. */
function markData(text) {
  words(text).forEach(function (w) { DATA_WORDS[w.toLowerCase()] = 1; });
}

/* Markup: treść ORAZ atrybuty widoczne. Stara wersja usuwała atrybuty razem
   ze znacznikiem i przez to nie widziała czterech placeholderów. */
function collectMarkup(htmlPath) {
  var html = fs.readFileSync(htmlPath, "utf8");
  var body = html.slice(html.indexOf("<body"), html.indexOf("</body>"));
  body = body.replace(/<script[\s\S]*?<\/script>/g, " ")
             .replace(/<style[\s\S]*?<\/style>/g, " ")
             .replace(/<!--[\s\S]*?-->/g, " ");

  var base = path.basename(htmlPath);

  /* Atrybuty ZANIM znaczniki znikną.

     GRANICA TO BIAŁY ZNAK, NIE \\b. Pierwsza wersja pisała \\btitle= i łapała
     data-i18n-title=, bo granica słowa stoi także po myślniku — czyli zbierała
     NAZWY KLUCZY jako widoczny tekst i wyprodukowała „releaseto" jako słowo
     interfejsu do przeczytania. Nazwa mechanizmu mówiła „atrybuty widoczne",
     kod czytał także atrybuty sterujące; szósty przypadek tej samej pomyłki
     w tym repozytorium i pierwszy złapany we własnym kodzie strażnika, przez
     przeczytanie listy, a nie przez kontrolę. */
  VISIBLE_ATTRS.forEach(function (attr) {
    var re = new RegExp("[\\s\"'](" + attr + ')\\s*=\\s*"([^"]*)"', "g"), m;
    while ((m = re.exec(body))) {
      addSeg(base + " atrybut " + attr + " (linia " +
             body.slice(0, m.index).split("\n").length + ")", m[2]);
    }
  });

  /* value= niesie tekst na ekran tylko w tych trzech miejscach; wszędzie indziej
     jest wartością konfiguracji i danymi. Podział po FUNKCJI, nie po wyglądzie. */
  var vre = /<(option|button)\b[^>]*\svalue\s*=\s*"([^"]*)"|<input\b[^>]*\stype\s*=\s*"button"[^>]*\svalue\s*=\s*"([^"]*)"/g, vm;
  while ((vm = vre.exec(body))) {
    if (vm[1] === "option") continue;   /* wartość <option> to konfiguracja, patrz niżej */
    addSeg(base + " atrybut value", vm[2] || vm[3]);
  }

  body.replace(/<[^>]+>/g, "\n").split("\n").forEach(function (line) {
    addSeg(base + " markup", line.trim());
  });
  return html;
}

/* Literały przypisywane do atrybutów widocznych W KODZIE. check-literals.js
   ich ZABRANIA, więc dziś jest ich zero — zbieramy je mimo to, bo zakres tego
   strażnika jest zdaniem o tym, gdzie tekst dociera do użytkownika, a nie
   zdaniem o tym, co akurat zabrania inny plik. */
function collectCodeAttrs(html, base) {
  var re = /\.setAttribute\(\s*"(?:title|placeholder|aria-label|aria-description|alt)"\s*,\s*"((?:[^"\\]|\\.)*)"/g, m;
  while ((m = re.exec(html))) addSeg(base + " atrybut z kodu", m[1]);
}

/* ---- profile ---------------------------------------------------------------- */
var FIXTURE = process.argv[2] === "--fixture";
var mode, scriptPath, htmlPath;

if (FIXTURE) {
  htmlPath = process.argv[3];
  mode = "fixture";
} else {
  scriptPath = process.argv[2];
  htmlPath = process.argv[3];
  mode = process.argv[4] || "validator";
}

/* OBA wejścia sprawdzone, zanim cokolwiek się wykona — a strażnik ma dwa i tylko jedno
   z nich idzie przez testlib.loadTool. W trybie --fixture blok <script> wycinany jest
   z HTML-a na miejscu, więc klauzula w bibliotece nie leży po drodze i brak pliku wracał
   śladem stosu z node:fs. Klauzula w bibliotece to nie jest to samo co klauzula w tym
   pliku, i różnicę widać dopiero, gdy się je wypisze osobno.

   Kod 2, jak wszędzie tutaj: 1 znaczy „zmierzyłem i jest naruszenie", 2 znaczy
   „nie zmierzyłem". */
function brakWejscia(co, plik, skad) {
  console.error("FAIL " + co + ": " + (plik || "(nie podano ścieżki)"));
  console.error("     " + skad);
  console.error("     Kontrola kompletności angielskiego NIE jest pomijana po cichu: bez");
  console.error("     przedmiotu pomiaru zielone i czerwone znaczą dokładnie to samo.");
  process.exit(2);
}
if (!FIXTURE && (!scriptPath || !fs.existsSync(scriptPath))) {
  brakWejscia("brak wyciętego bloku <script>", scriptPath,
              "Produkuje go extract_script w tools/run-tests.sh z pliku HTML narzędzia.");
}
if (!htmlPath || !fs.existsSync(htmlPath)) {
  brakWejscia("brak pliku HTML narzędzia", htmlPath,
              "To plik repozytorium (validator.html, generator.html, index.html) — " +
              "sprawdź argument.");
}

lib.installDom();

/* Fixtura jest samowystarczalna: blok <script> wycinamy z niej samej, żeby
   ścieżka słownikowa była TĄ SAMĄ ścieżką co w produkcji, a nie jej atrapą. */
function fixtureScript(html) {
  var at = html.indexOf("<script>"), end = html.lastIndexOf("</script>");
  if (at === -1 || end === -1) return null;
  var tmp = path.join(path.dirname(htmlPath), ".fixture.check-english.tmp.js");
  fs.writeFileSync(tmp, html.slice(at + "<script>".length, end));
  return tmp;
}

var html;

if (mode === "validator") {
  var T = lib.loadTool(scriptPath,
    ["parse", "analyse", "buildReport", "SAMPLE_BAD", "GLOBALS", "I18N"]);

  var inv = T.SAMPLE_BAD() +
    "\n[murano]\nctrl01\n\n[ceph-mon]\nctrl01\nctrl02\n\n[ovn-database]\nctrl01\nctrl02\n";
  var globals = '---\nenable_masakari: "yes"\nenable_hacluster: "yes"\n' +
    'kolla_internal_vip_address: "10.10.0.11"\nletsencrypt_cert_server: "https://example.invalid"\n' +
    'om_enable_rabbitmq_quorum_queues: "yes"\nenable_redis: "yes"\n';
  markData(inv); markData(globals);

  var res = T.analyse(T.parse(inv), "2023.1", T.GLOBALS.parse(globals), {}, "2026.1");
  res.findings.forEach(function (f) {
    addSeg("finding " + f.code + " (msg)", f.msg);
    addSeg("finding " + f.code + " (hint)", f.hint);
  });
  T.buildReport(res, { e: 1, w: 1, i: 1 }).split("\n").forEach(function (line, i) {
    addSeg("report line " + (i + 1), line);
  });
  Object.keys(T.I18N.dict).forEach(function (k) { addSeg("dictionary key " + k, T.I18N.dict[k]); });

} else if (mode === "generator") {
  var G = lib.loadTool(scriptPath,
    ["validate", "badFields", "buildYaml", "DEFAULTS", "GLOBALS", "I18N"]);

  var st = {};
  Object.keys(G.DEFAULTS).forEach(function (k) { st[k] = G.DEFAULTS[k]; markData(G.DEFAULTS[k]); });
  st.vip = "10.0.0.250"; st.net_if = "bond0.10"; st.api_if = "bond0.10";
  st.stg_if = "bond0.20"; st.ext_if = "bond0"; st.br_name = "br-ex,br-ex2";
  st.t_hacluster = true; st.t_masakari = true; st.t_octavia = true;
  st.t_cinder = true; st.t_grafana = true; st.t_tls_int = true;
  st.amp_net = "vlan"; st.physnet = "physnet9"; st.release = "2024.2";
  st.int_fqdn = "cloud.example.net"; st.ext_fqdn = "cloud.example.net";
  Object.keys(st).forEach(function (k) { markData(st[k]); });

  var diag = G.validate(st, null);
  diag.forEach(function (d, i) { addSeg("diagnostic " + (i + 1) + " (" + d.level + ")", d.msg); });

  /* Jedna konfiguracja nie dosięga wszystkiego. Reguły wykluczają się nawzajem —
     wydanie może być JEDNOCZEŚNIE tylko w jednym stanie — więc komunikat o wydaniu
     spoza macierzy nie ma prawa paść w tym samym przebiegu co komunikat o wydaniu
     wycofanym.

     To nie jest hipoteza. Przy tłumaczeniu trzy komunikaty przeszły tę asercję
     zielono i zostały złapane dopiero przez testy dymne: obrazy niepublikowane dla
     wydania, wydanie spoza macierzy, brakujący klucz o wartości domyślnej. Asercja
     mierząca jeden przebieg mierzy jedną ścieżkę, a nie narzędzie. */
  var VARIANTS = [
    { why: "distro dopuszczalne, ale bez publikowanych obrazów",
      st: { release: "2026.1", distro: "centos" } },
    { why: "wydanie spoza macierzy", st: { release: "stable/2019.2" } },
    { why: "wydanie w rozwoju", st: { release: "2026.2" } },
    { why: "wydanie bez utrzymania", st: { release: "2024.1" } },
    { why: "sieć amfor typu flat", st: { t_octavia: true, amp_net: "flat" } },
    { why: "różne VIP-y bez nazw FQDN",
      st: { vip: "10.0.0.250", ext_vip: "10.0.1.250", int_fqdn: "", ext_fqdn: "" } },
    { why: "usługi bez swoich zależności",
      st: { t_cinder: true, storage: "none", t_grafana: true, t_prometheus: false,
            t_octavia: true, t_barbican: false, t_masakari: true, t_hacluster: false } }
  ];
  VARIANTS.forEach(function (v) {
    var alt = {};
    Object.keys(G.DEFAULTS).forEach(function (k) { alt[k] = G.DEFAULTS[k]; });
    Object.keys(v.st).forEach(function (k) { alt[k] = v.st[k]; markData(v.st[k]); });
    G.validate(alt, null).forEach(function (d, i) {
      addSeg("diagnostic [" + v.why + "] " + (i + 1) + " (" + d.level + ")", d.msg);
    });
  });

  var bareSrc = '---\nkolla_base_distro: "rocky"\n';
  markData(bareSrc);
  var bare = G.GLOBALS.parse(bareSrc);
  var withDoc = {};
  Object.keys(G.DEFAULTS).forEach(function (k) { withDoc[k] = G.DEFAULTS[k]; });
  withDoc.release = "2026.1";
  G.validate(withDoc, bare).forEach(function (d, i) {
    addSeg("diagnostic [wczytany plik bez klucza] " + (i + 1) + " (" + d.level + ")", d.msg);
  });

  var built = G.buildYaml(st, G.badFields(diag));
  built.text.split("\n").forEach(function (line, i) {
    if (line.indexOf("#") !== -1) addSeg("emitted globals.yml line " + (i + 1), line);
  });

  var docSrc = '---\nkolla_base_distro: "rocky"\nnieznany_klucz: 1\n' +
               'om_enable_rabbitmq_high_availability: "yes"\n';
  markData(docSrc);
  var doc = G.GLOBALS.parse(docSrc);
  doc.findings.forEach(function (f) { addSeg("parser finding " + f.code, f.msg + " " + (f.hint || "")); });
  G.GLOBALS.review(doc, null, {}).forEach(function (f) {
    addSeg("import review " + f.code, f.msg + " " + (f.hint || ""));
  });
  Object.keys(G.I18N.dict).forEach(function (k) { addSeg("dictionary key " + k, G.I18N.dict[k]); });

} else if (mode === "fixture") {
  html = fs.readFileSync(htmlPath, "utf8");
  var tmpScript = fixtureScript(html);
  if (tmpScript) {
    try {
      var F = lib.loadTool(tmpScript, ["I18N"]);
      Object.keys(F.I18N.dict).forEach(function (k) { addSeg("dictionary key " + k, F.I18N.dict[k]); });
    } finally { fs.unlinkSync(tmpScript); }
  }

} else {
  var H = lib.loadTool(scriptPath, ["I18N"]);
  Object.keys(H.I18N.dict).forEach(function (k) { addSeg("dictionary key " + k, H.I18N.dict[k]); });
}

if (html === undefined) html = collectMarkup(htmlPath);
else collectMarkup(htmlPath);
collectCodeAttrs(html, path.basename(htmlPath));

/* Powiadomienia MUSZĄ iść przez słownik.
   Osiemnaście toastów wpisanych wprost w kod przetrwało całą migrację na angielski
   i przeszło tę asercję na zielono, bo nie ma ich ani w znacznikach, ani w słowniku,
   a padają tylko w obsłudze zdarzeń, których asercja nie wywołuje. Twierdzenie
   „cały widoczny tekst jest po angielsku" było wtedy nieprawdziwe.
   Skanowanie treści nic by nie dało — angielski literał wpisany w kod przeszedłby
   tak samo. Zakazujemy więc SAMEJ KONSTRUKCJI: komunikat ma mieć klucz, bo tylko
   wtedy widać go w słowniku, a słownik jest tym, co asercja czyta. */
var inlineToasts = [];
html.replace(/\btoast\(\s*(["'])/g, function (whole, q, at) {
  var line = html.slice(0, at).split("\n").length;
  inlineToasts.push(line + ": " + html.slice(at, at + 70).split("\n")[0]);
  return whole;
});
if (inlineToasts.length) {
  console.log("FAIL [" + mode + "] powiadomienie z literałem zamiast klucza słownika, " +
              inlineToasts.length + " razy:");
  inlineToasts.forEach(function (h) { console.log("  " + h); });
  process.exit(1);
}

/* ---- osąd: raz na słowo ----------------------------------------------------- */
var VOCAB = vocabulary();
var unknown = Object.create(null);
var distinct = Object.create(null);
var fromData = 0;

segments.forEach(function (seg) {
  words(seg.text).forEach(function (raw) {
    var w = raw.toLowerCase();
    distinct[w] = 1;
    if (VOCAB[w]) return;
    if (DATA_WORDS[w]) { fromData++; return; }
    if (!unknown[w]) unknown[w] = { count: 0, where: seg.where, sample: seg.text };
    unknown[w].count++;
  });
});

var list = Object.keys(unknown).sort();
var nDistinct = Object.keys(distinct).length;
var accepted = 0, dataOnly = 0;
Object.keys(distinct).forEach(function (w) {
  if (VOCAB[w]) accepted++;
  else if (DATA_WORDS[w]) dataOnly++;
});

/* Wszystkie cztery liczby, bo suma trzech pierwszych MUSI dać różne słowa —
   licznik, który się nie domyka, mierzy coś innego, niż mówi jego nazwa, a to
   jest awaria, której w tym repozytorium nikt nie złapał sześć razy z rzędu. */
console.log("[" + mode + "] źródeł: " + segments.length +
            "   różnych słów: " + nDistinct +
            "   przyjętych: " + accepted +
            "   z danych wejściowych: " + dataOnly +
            "   DO PRZECZYTANIA: " + list.length);
if (accepted + dataOnly + list.length !== nDistinct) {
  console.log("FAIL licznik się nie domyka: " + accepted + " + " + dataOnly + " + " +
              list.length + " != " + nDistinct);
  process.exit(1);
}

if (!list.length) {
  console.log("OK   [" + mode + "] każde słowo widocznego tekstu jest już przeczytane i przyjęte");
  process.exit(0);
}

console.log("FAIL [" + mode + "] " + list.length + " słów, których nikt jeszcze nie przeczytał:");
list.forEach(function (w) {
  var u = unknown[w];
  var plain = String(u.sample).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  console.log("  " + w + "   (×" + u.count + ")   " + u.where);
  console.log("      " + plain.slice(0, 110));
});
console.log("\nPRZECZYTAJ każde z nich i rozstrzygnij: angielskie słowo interfejsu");
console.log("czy tekst do przetłumaczenia. Angielskie dopisz do tools/vocabulary-en.txt");
console.log("(jedno w linii, alfabetycznie). Polskie przetłumacz — dopisanie polskiego");
console.log("słowa do tego pliku jest jedynym sposobem, w jaki ten strażnik może zawieść.\n");
list.forEach(function (w) { console.log(w); });
process.exit(1);
