#!/usr/bin/env node
/* KAŻDY STRAŻNIK MA SIĘ WYKONYWAĆ W BUILDZIE I MIEĆ DOWÓD, ŻE POTRAFI UPAŚĆ —
 * i jedno, i drugie jest sprawdzane, a nie tylko zapisane.
 *
 * POWÓD. #72: dwaj strażnicy z tools/ nie wykonywali się w żadnym buildzie. Jeden
 * z nich był wtedy CZERWONY — 461 wystąpień wobec własnego progu 444 — i nikt tego
 * nie widział, bo build raportował sukces. Naprawa polegała na ręcznym wpięciu obu
 * i dopisaniu reguły do docs/PRINCIPLES.md.
 *
 * Reguła brzmiała: „A guard that does not execute in the build is not a guard, and only
 * the build log proves it does". Inwentaryzacja do #94 wykazała, że ta reguła jest SAMA
 * NIEEGZEKWOWANA: nic nie sprawdzało, czy tools/check-* ma jakiekolwiek wystąpienie
 * w run-tests.sh albo ci.yml. Strażnik dodany jutro i niewpięty odtworzyłby #72 co do
 * joty, a jedyną obroną była czyjaś pamięć.
 *
 * Ten plik jest tą obroną. Sam też do niej należy — nazywa się check-*, więc pilnuje
 * także własnego wpięcia.
 *
 * ============================================================================
 * CO DOKŁADNIE SPRAWDZA, i czego NIE.
 *
 * Wystąpienie liczy się WYŁĄCZNIE w linii, która nie jest komentarzem — po przycięciu
 * nie zaczyna się od „#". Bez tego zastrzeżenia wzmianka w komentarzu wystarczałaby
 * za wpięcie, a ci.yml niesie dziś taką wzmiankę: przy kroku przeglądarkowym stoi
 * akapit tłumaczący, dlaczego check-dictionary.js NIE dostaje osobnego kroku. Nazwa
 * pliku pada tam w zdaniu o jego NIEobecności — i naiwne „szukaj nazwy" uznałoby to
 * za dowód obecności.
 *
 * CZEGO TO NADAL NIE ŁAPIE, wypisane, żeby nikt nie wziął zieleni za więcej, niż znaczy:
 *   - nazwy w napisie wewnątrz działającej linii, która niczego nie uruchamia;
 *   - kroku CI wyłączonego przez `if:`, który nigdy się nie wykonuje;
 *   - strażnika wpiętego, ale wywoływanego na fixturze zamiast na produkcie.
 * To jest kontrola OBECNOŚCI W BUILDZIE, nie kontrola sensu wywołania. Nazwa mówi
 * dokładnie tyle i ani słowa więcej.
 * ============================================================================
 *
 * WYJĄTKI SĄ JAWNE I Z POWODEM. Pusta lista jest stanem docelowym; wpis bez uzasadnienia
 * jest zakazany, bo lista wyjątków rosnąca po cichu to sposób, w jaki ta kontrola
 * przestanie cokolwiek znaczyć. Rosnąca lista jest sygnałem, że kontrola jest obchodzona.
 *
 * Użycie:
 *     node tools/check-wiring.js
 *     node tools/check-wiring.js --dir <katalog> --runner <plik> --ci <plik>   # fixtura
 */

var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

/* ============================================================================
 * DRUGI WARUNEK: FIXTURA. Dodany, bo „13 z 13 ma dowód upadku" trzymało się UWAGĄ,
 * nie mechanizmem — odnotowane w docs/PRINCIPLES.md przy tamtym zdaniu. Wymaganie
 * ma ten sam kształt co wpięcie (czy strażnik jest gdzieś wymieniony), więc należy
 * do tego samego pliku, a nie do nowego.
 *
 * PO CZYM POZNAJEMY POWIĄZANIE: po WYWOŁANIU strażnika w tools/smoke/guards.test.js,
 * czyli po wystąpieniu run("<nazwa>". Rozstrzygnięte przed napisaniem kodu.
 *
 * KSZTAŁT WYWOŁANIA, NIE „gdzieś w linii niekomentarzowej" — poprawka zrobiona po tym,
 * jak pierwsza wersja dała się nabrać na WŁASNĄ fixturę. Filtr komentarzy przepuszcza
 * linię KONTYNUACJI komentarza blokowego, która nie zaczyna się od gwiazdki, a
 * guards.test.js jest pełen takich komentarzy — więc sama wzmianka o strażniku w prozie
 * liczyła się za jego sprawdzenie. Trzeci raz w tym repozytorium, gdy rozpoznawanie
 * komentarzy wyrażeniem regularnym daje zły wynik; poprzednie dwa to skanery do #77.
 * Kryterium kształtu wywołania nie musi wiedzieć, co jest komentarzem: proza nie
 * zawiera run("check-x.js".
 *
 *   Konwencja nazw ODRZUCONA. Żadna dzisiejsza fixtura jej nie spełnia —
 *     one-literal.js należy do check-literals.js, has-nul.js do check-binary.sh,
 *     keys-one-typo.html do check-i18n.js. Przyjęcie konwencji to przemianowanie
 *     dwudziestu plików, a potem łamie się dokładnie przy przemianowaniu, czyli
 *     w momencie, w którym powiązanie ma się trzymać najmocniej.
 *
 *   Jawny rejestr ODRZUCONY. Druga lista obok pierwszej, utrzymywana ręcznie.
 *     Lista starzeje się, kryterium nie — to jest zdanie z docs/PRINCIPLES.md
 *     i obowiązuje też tutaj.
 *
 *   WYWOŁANIE W guards.test.js WYBRANE, bo nie jest listą równoległą, tylko
 *     PLIKIEM, W KTÓRYM STRAŻNIK JEST FAKTYCZNIE URUCHAMIANY NA FIXTURZE.
 *     Wynika z prawdziwego kodu, więc nie może rozejść się z rzeczywistością.
 *     Przemianowanie strażnika bez poprawienia testu i tak wywala build, bo test
 *     próbuje uruchomić plik, którego nie ma — dwa mechanizmy zapalają się razem
 *     i sprzężenie jest po właściwej stronie.
 *
 * CZEGO TEN WARUNEK NIE WYMUSZA, wypisane, żeby nie zamalować granicy:
 *   - że któraś z tych fixtur robi strażnika CZERWONYM. Strażnik uruchamiany
 *     wyłącznie na czystej fixturze przechodzi ten warunek. Dowód upadku wymaga
 *     przeczytania asercji, a to jest ocena, nie porównanie napisów;
 *   - że pomocnik nazywa się run(). Nazwa jest tu zaszyta; gdyby się zmieniła, ŻADEN
 *     strażnik nie miałby powiązania i build stanąłby głośno — awaria w dobrą stronę;
 *   - że fixtura ma sensowny kształt — przynęta niebędąca kształtem realnej awarii
 *     liczy się tak samo jak dobra;
 *   - jak przy wpięciu: to jest obecność napisu, nie wykonanie kodu.
 * ============================================================================ */

/* Wzorzec rodziny. Prototypy i oprzyrządowanie celowo NIE mają tego przedrostka,
   więc nie wpadają w to zestawienie — patrz tools/prototype-rule-pointers.js (#94),
   który stoi poza buildem świadomie i którego nazwa została dobrana właśnie tak. */
var GUARD_RE = /^check-.*\.(js|sh)$/;

/* Każdy wpis MUSI mieć powód. Pusta lista to stan docelowy — w OBU. */
var EXEMPT_WIRING = [
  /* { file: "check-cos.js", why: "powód, dla którego stoi poza buildem" } */
];
var EXEMPT_FIXTURE = [
  /* { file: "check-cos.js", why: "powód, dla którego nie ma dowodu upadku" } */
];

function arg(name, dflt) {
  var i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

var dir = path.resolve(root, arg("--dir", "tools"));
var sources = [
  path.resolve(root, arg("--runner", "tools/run-tests.sh")),
  path.resolve(root, arg("--ci", ".github/workflows/ci.yml"))
];
var fixturesFile = path.resolve(root, arg("--fixtures", "tools/smoke/guards.test.js"));

/* FAIL CLOSED: brak któregokolwiek wejścia to awaria pomiaru, nie czysty wynik.
   Bez tego zły argument dałby „zero wystąpień wszędzie" i zielone przez pomyłkę
   w drugą stronę — albo czerwone bez powodu. */
sources.concat([fixturesFile]).forEach(function (f) {
  if (!fs.existsSync(f)) {
    console.log("FAIL nie mogę przeczytać " + path.relative(root, f) +
                " — bez niego nie da się powiedzieć, co się wykonuje.");
    process.exit(1);
  }
});
if (!fs.existsSync(dir)) {
  console.log("FAIL nie ma katalogu " + path.relative(root, dir));
  process.exit(1);
}

/* Linie wykonywalne: wszystko, co po przycięciu nie zaczyna się od znaku komentarza.
   Cztery przedrostki, bo źródła są w trzech językach: "#" dla basha i YAML-a,
   "//" oraz "/*" i "*" dla JavaScriptu.

   ŚWIADOMA NIESZCZELNOŚĆ: linia wewnątrz komentarza blokowego, która NIE zaczyna się
   od gwiazdki, zostanie uznana za wykonywalną. Błąd idzie w stronę zaliczania wzmianki,
   nie odrzucania kodu — czyli w stronę słabszą, nie fałszywie surową. Zapisane, bo
   następny czytelnik ma wiedzieć, w którą stronę ten wzorzec się myli. */
var COMMENT = ["#", "//", "/*", "*"];
function executableLines(f) {
  return fs.readFileSync(f, "utf8").split("\n").filter(function (l) {
    var t = l.trim();
    if (t === "") return false;
    return !COMMENT.some(function (c) { return t.indexOf(c) === 0; });
  });
}

var executable = sources.map(function (f) {
  return { name: path.relative(root, f), lines: executableLines(f) };
});
/* Plik fixtur czytamy W CAŁOŚCI i szukamy KSZTAŁTU WYWOŁANIA, nie linii
   niekomentarzowej — patrz nagłówek. */
var fixtureSrc = fs.readFileSync(fixturesFile, "utf8");
function invoked(guard) {
  return new RegExp("run\\(\\s*[\"']" +
                    guard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\"']").test(fixtureSrc);
}

var guards = fs.readdirSync(dir).filter(function (f) { return GUARD_RE.test(f); }).sort();

/* Zero strażników znaczy, że katalog jest zły albo wzorzec przestał pasować — a wtedy
   „wszystko wpięte" byłoby zielenią przy nieobecnym przedmiocie pomiaru. */
if (!guards.length) {
  console.log("FAIL w " + path.relative(root, dir) + " nie ma ANI JEDNEGO pliku check-*.*" +
              " — przedmiot pomiaru jest nieobecny, więc zielone nic by nie znaczyło.");
  process.exit(1);
}

var exemptBad = EXEMPT_WIRING.concat(EXEMPT_FIXTURE)
  .filter(function (e) { return !e.why || !e.why.trim(); });
if (exemptBad.length) {
  console.log("FAIL wyjątek bez powodu: " +
              exemptBad.map(function (e) { return e.file; }).join(", "));
  process.exit(1);
}

var orphans = [], wired = 0, noFixture = [], withFixture = 0;
guards.forEach(function (g) {
  var exW = EXEMPT_WIRING.filter(function (e) { return e.file === g; })[0];
  if (exW) { console.log("  WYJĄTEK (wpięcie)  " + g + " — " + exW.why); }
  else if (executable.some(function (src) {
             return src.lines.some(function (l) { return l.indexOf(g) !== -1; });
           })) { wired++; }
  else { orphans.push(g); }

  var exF = EXEMPT_FIXTURE.filter(function (e) { return e.file === g; })[0];
  if (exF) { console.log("  WYJĄTEK (fixtura)  " + g + " — " + exF.why); return; }
  if (invoked(g)) { withFixture++; return; }
  noFixture.push(g);
});

console.log("strażników: " + guards.length +
            "   wpiętych: " + wired + "   NIEWPIĘTYCH: " + orphans.length +
            "   z fixturą: " + withFixture + "   BEZ FIXTURY: " + noFixture.length);

if (orphans.length) {
  console.log("\nFAIL strażnik nie wykonuje się w żadnym buildzie, " + orphans.length + ":");
  orphans.forEach(function (g) { console.log("  " + g); });
  console.log("\n  Wpnij go w tools/run-tests.sh albo w .github/workflows/ci.yml — wystąpienie");
  console.log("  musi stać w linii WYKONYWALNEJ, nie w komentarzu. Jeśli ma świadomie zostać");
  console.log("  poza buildem, dopisz go do EXEMPT_WIRING w tym pliku RAZEM Z POWODEM.");
  console.log("  #72: dwaj strażnicy stali poza buildem, jeden był czerwony, build był zielony.");
}

if (noFixture.length) {
  console.log("\nFAIL strażnik bez powiązanej fixtury, " + noFixture.length + ":");
  noFixture.forEach(function (g) { console.log("  " + g); });
  console.log("\n  Wywołaj go w " + path.relative(root, fixturesFile) + " przez run(\"…\")");
  console.log("  na fixturze o znanej charakterystyce — i niech co najmniej jedna robi go");
  console.log("  CZERWONYM. Ten warunek sprawdza samo WYWOŁANIE; że fixtura potrafi");
  console.log("  go wywalić, sprawdza czytelnik. Wyjątek: EXEMPT_FIXTURE, Z POWODEM.");
  console.log("  #96: trzej strażnicy nie mieli dowodu upadku NIGDZIE, w tym check-offline.js,");
  console.log("  jedyny mechanizm broniący obietnicy „zero sieci\".");
}

if (orphans.length || noFixture.length) process.exit(1);

console.log("\nOK   każdy strażnik ma wystąpienie w buildzie i powiązaną fixturę");
process.exit(0);
