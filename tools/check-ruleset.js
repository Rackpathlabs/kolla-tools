#!/usr/bin/env node
/* Rejestr reguł KV kontra oba rejestry kodów.
 *
 * CZEGO TEN STRAŻNIK PILNUJE: że sekcja `## KV-NN` w docs/RULESET-KV.md WSKAZUJE KOD,
 * który któreś z narzędzi faktycznie emituje — albo jawnie mówi, że kodu nie ma.
 *
 * CZEGO NIE PILNUJE, i to jest granica, nie przeoczenie: czy proza sekcji OPISUJE regułę,
 * którą ten kod realizuje. To jest zadanie do przeczytania, nie do porównania napisów.
 * Sekcja KV-05 wskazująca `KV-14-TLS-CA` przejdzie tu na zielono i będzie nieprawdziwa.
 * Dokument jest napisany tak, żeby człowiek mógł to sprawdzić; strażnik pilnuje tylko
 * tego, czego sprawdzenie da się powtórzyć.
 *
 * DLACZEGO REJESTRY CZYTAMY Z TEKSTU, a nie przez wykonanie bloku: ten sam powód, co
 * w tools/check-i18n.js — strażnik ma działać także wtedy, gdy narzędzie jest składniowo
 * zepsute. Wtedy właśnie najbardziej się przydaje.
 *
 * Użycie:
 *   node tools/check-ruleset.js
 *   node tools/check-ruleset.js --root tools/fixtures/ruleset/X --expect-diag 2 --expect-validator 1
 */

var fs = require("fs");
var path = require("path");

function arg(name, dflt) {
  var i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : dflt;
}
var repo = path.join(__dirname, "..");
var rootArg = arg("--root", null);
var root = rootArg ? path.join(repo, rootArg) : repo;
var EXPECT_DIAG = parseInt(arg("--expect-diag", "55"), 10);
var EXPECT_VAL  = parseInt(arg("--expect-validator", "51"), 10);

var rc = 0;
function fail(msg) { console.log("FAIL " + msg); rc = 1; }

function readTable(file, varName) {
  var full = path.join(root, file);
  if (!fs.existsSync(full)) { fail("brak pliku " + file + " w " + (rootArg || "korzeniu repo")); return []; }
  var src = fs.readFileSync(full, "utf8");
  var block = new RegExp("var " + varName + " = \\{([\\s\\S]*?)\\n\\s*\\};").exec(src);
  if (!block) { fail(file + ": nie znalazłem tabeli " + varName); return []; }
  /* Klasa znaków Z CYFRAMI, jak w tools/check-dictionary.js. Węższa nie widziałaby
     rodziny KV-NN, czyli dokładnie tych kodów, o które w tym strażniku chodzi. */
  var re = /"([A-Z][A-Z0-9-]*)":/g, m, out = [];
  while ((m = re.exec(block[1])) !== null) out.push(m[1]);
  return out;
}

var diag = readTable("generator.html", "DIAG_IDS");
var vids = readTable("validator.html", "VALIDATOR_IDS");

/* LICZNOŚĆ PRZED UŻYCIEM. Wzorzec, który po cichu przestanie trafiać, daje listę pustą,
   nieodróżnialną od poprawnego wyniku — #68, opisany na górze tools/testlib.js. Progi są
   parametrem, bo fixtury mają własne tabele; na repo są to rozmiary obu rejestrów i ich
   zmiana ma być czerwona, dopóki ktoś nie poprawi tu liczby świadomie. */
if (diag.length !== EXPECT_DIAG) fail("DIAG_IDS: " + diag.length + " pozycji, oczekiwano " + EXPECT_DIAG);
if (vids.length !== EXPECT_VAL)  fail("VALIDATOR_IDS: " + vids.length + " pozycji, oczekiwano " + EXPECT_VAL);

var known = Object.create(null);
diag.concat(vids).forEach(function (c) { known[c] = true; });

var docPath = path.join(root, "docs", "RULESET-KV.md");
if (!fs.existsSync(docPath)) {
  fail("brak docs/RULESET-KV.md w " + (rootArg || "korzeniu repo"));
  console.log(rc === 0 ? "Rejestr reguł spójny z kodem." : "Rejestr reguł wymaga uwagi.");
  process.exit(rc);
}
var lines = fs.readFileSync(docPath, "utf8").split("\n");

/* Sekcja to nagłówek drugiego poziomu z numerem reguły. Wariant a/b dla KV-12, bo to
   jedna reguła rozdzielona na dwie o różnej klasie sprawdzalności. */
var SECTION_RE = /^## (KV-[0-9]{2}[ab]?)\b/;
var CODES_RE = /^\*\*Codes:\*\*/;
/* Znacznik ZASTĘPUJE kod: sekcja nim oznaczona mówi, że kodu nie ma i dlaczego. Reszta
   takiej linii jest prozą — nazwa kodu, który dopiero powstanie, albo nazwa kodu z innej
   rodziny — więc tokenów z niej NIE czytamy. Inaczej strażnik żądałby istnienia kodu,
   którego brak sam dokumentuje. */
var MARKER_RE = /^\*\*Codes:\*\*\s*(not implemented:|class C:)/;

var sections = Object.create(null);   // KV-NN -> { codes: [], marker: bool, line: n }
var current = null;
lines.forEach(function (line, i) {
  var h = SECTION_RE.exec(line);
  if (h) { current = h[1]; sections[current] = { codes: [], marker: false, line: i + 1 }; return; }
  if (!current || !CODES_RE.test(line)) return;
  var rec = sections[current];
  if (MARKER_RE.test(line)) { rec.marker = true; return; }
  /* Linia "Codes:" bywa zawijana — czytamy ją do pierwszej pustej linii. */
  for (var j = i; j < lines.length && lines[j].trim() !== ""; j++) {
    var t = /`([A-Z][A-Z0-9-]*)`/g, m;
    while ((m = t.exec(lines[j])) !== null) rec.codes.push(m[1]);
  }
});

var names = Object.keys(sections);
if (!names.length) fail("docs/RULESET-KV.md: nie znalazłem ani jednej sekcji ## KV-NN");

/* 1. Sekcja wskazuje kod znany albo niesie znacznik. */
names.forEach(function (n) {
  var rec = sections[n];
  if (rec.marker) return;
  if (!rec.codes.length) {
    fail("sekcja " + n + " (linia " + rec.line + ") nie wskazuje żadnego kodu ani znacznika");
    return;
  }
  rec.codes.forEach(function (c) {
    if (!known[c]) fail("sekcja " + n + " wskazuje kod " + c + ", którego nie emituje żadne narzędzie");
  });
});

/* 2. Każdy kod z prefiksem KV- ma sekcję. */
Object.keys(known).forEach(function (c) {
  var m = /^(KV-[0-9]{2})[-]/.exec(c);
  if (!m) return;
  var n = m[1];
  if (sections[n] || sections[n + "a"] || sections[n + "b"]) return;
  fail("kod " + c + " nie ma sekcji " + n + " w docs/RULESET-KV.md");
});

/* 3. Znacznik nieaktualny: sekcja mówi „not implemented", a kod już istnieje. Bez tego
   KV-08 zostałoby oznaczone jako niezaimplementowane na zawsze, także po #173. */
names.forEach(function (n) {
  var rec = sections[n];
  if (!rec.marker) return;
  var base = n.replace(/[ab]$/, "");
  var hit = Object.keys(known).filter(function (c) { return c.indexOf(base + "-") === 0; });
  if (hit.length) {
    fail("sekcja " + n + " nosi znacznik, a kod " + hit.join(", ") + " już istnieje — znacznik nieaktualny");
  }
});

console.log("sekcji: " + names.length + "   kodów w rejestrach: " + Object.keys(known).length +
            "   (DIAG_IDS " + diag.length + ", VALIDATOR_IDS " + vids.length + ")");
console.log(rc === 0 ? "OK   rejestr reguł spójny z oboma rejestrami kodów."
                     : "Rejestr reguł wymaga uwagi.");
process.exit(rc);
