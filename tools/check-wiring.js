#!/usr/bin/env node
/* KAŻDY STRAŻNIK MA SIĘ WYKONYWAĆ W BUILDZIE — i to jest sprawdzane, a nie tylko
 * zapisane.
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

/* Wzorzec rodziny. Prototypy i oprzyrządowanie celowo NIE mają tego przedrostka,
   więc nie wpadają w to zestawienie — patrz tools/prototype-rule-pointers.js (#94),
   który stoi poza buildem świadomie i którego nazwa została dobrana właśnie tak. */
var GUARD_RE = /^check-.*\.(js|sh)$/;

/* Każdy wpis MUSI mieć powód. Pusta lista to stan docelowy. */
var EXEMPT = [
  /* { file: "check-cos.js", why: "powód, dla którego stoi poza buildem" } */
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

/* FAIL CLOSED: brak któregokolwiek wejścia to awaria pomiaru, nie czysty wynik.
   Bez tego zły argument dałby „zero wystąpień wszędzie" i zielone przez pomyłkę
   w drugą stronę — albo czerwone bez powodu. */
sources.forEach(function (f) {
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

/* Linie wykonywalne: wszystko, co po przycięciu nie zaczyna się od "#".
   Jeden znak komentarza dla basha i dla YAML-a — oba używają tego samego. */
var executable = sources.map(function (f) {
  return {
    name: path.relative(root, f),
    lines: fs.readFileSync(f, "utf8").split("\n")
             .filter(function (l) { return l.trim() !== "" && l.trim().charAt(0) !== "#"; })
  };
});

var guards = fs.readdirSync(dir).filter(function (f) { return GUARD_RE.test(f); }).sort();

/* Zero strażników znaczy, że katalog jest zły albo wzorzec przestał pasować — a wtedy
   „wszystko wpięte" byłoby zielenią przy nieobecnym przedmiocie pomiaru. */
if (!guards.length) {
  console.log("FAIL w " + path.relative(root, dir) + " nie ma ANI JEDNEGO pliku check-*.*" +
              " — przedmiot pomiaru jest nieobecny, więc zielone nic by nie znaczyło.");
  process.exit(1);
}

var exemptBad = EXEMPT.filter(function (e) { return !e.why || !e.why.trim(); });
if (exemptBad.length) {
  console.log("FAIL wyjątek bez powodu: " +
              exemptBad.map(function (e) { return e.file; }).join(", "));
  process.exit(1);
}

var orphans = [], wired = 0;
guards.forEach(function (g) {
  var ex = EXEMPT.filter(function (e) { return e.file === g; })[0];
  if (ex) { console.log("  WYJĄTEK  " + g + " — " + ex.why); return; }
  var hits = executable.filter(function (src) {
    return src.lines.some(function (l) { return l.indexOf(g) !== -1; });
  }).map(function (src) { return src.name; });
  if (hits.length) { wired++; return; }
  orphans.push(g);
});

console.log("strażników: " + guards.length + "   wpiętych: " + wired +
            "   wyjątków: " + EXEMPT.length + "   NIEWPIĘTYCH: " + orphans.length);

if (orphans.length) {
  console.log("\nFAIL strażnik nie wykonuje się w żadnym buildzie, " + orphans.length + ":");
  orphans.forEach(function (g) { console.log("  " + g); });
  console.log("\n  Wpnij go w tools/run-tests.sh albo w .github/workflows/ci.yml — wystąpienie");
  console.log("  musi stać w linii WYKONYWALNEJ, nie w komentarzu. Jeśli ma świadomie zostać");
  console.log("  poza buildem, dopisz go do EXEMPT w tym pliku RAZEM Z POWODEM.");
  console.log("  #72: dwaj strażnicy stali poza buildem, jeden był czerwony, build był zielony.");
  process.exit(1);
}

console.log("\nOK   każdy strażnik ma wystąpienie w linii wykonywalnej buildu");
process.exit(0);
