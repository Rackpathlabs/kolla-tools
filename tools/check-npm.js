#!/usr/bin/env node
/* ZERO ZALEŻNOŚCI npm — W CAŁYM DRZEWIE, nie tylko w korzeniu.
 *
 * Narzędzia są pojedynczymi plikami HTML działającymi z file://. Cokolwiek z npm
 * w repozytorium znaczy, że ktoś zaczął budować to inaczej, niż brzmi obietnica
 * produktu — i dotyczy to także oprzyrządowania, bo oprzyrządowanie jest tym, co
 * tę obietnicę weryfikuje.
 *
 * ============================================================================
 * DLACZEGO POWSTAŁ TEN PLIK. Do 2026-08-20 ta kontrola była krokiem wpisanym wprost
 * w ci.yml i sprawdzała PIĘĆ ŚCIEŻEK W KORZENIU:
 *
 *     for p in package.json package-lock.json yarn.lock pnpm-lock.yaml node_modules; do
 *       if [ -e "$p" ]; then …
 *
 * `tools/package.json` i `tools/node_modules` przechodziły bez słowa. Sprawdzone,
 * nie wywnioskowane. Nazwa kroku brzmiała „Zero zależności npm" — zdanie o całym
 * repozytorium — a kod pytał o korzeń. Szósty przypadek nazwy szerszej niż zakres
 * w tym repozytorium.
 *
 * Wyszło przy pisaniu ADR-003, gdzie jedną z rozważanych opcji było odstępstwo od
 * zero-npm wyłącznie dla tools/. Opcja została ODRZUCONA — i właśnie dlatego ta
 * kontrola musi obejmować całe drzewo. Odrzucona opcja nie jest tym samym co opcja
 * niemożliwa: gdyby ktoś ją kiedyś wprowadził po cichu, nic by tego nie zauważyło.
 *
 * GRANICA, KTÓRA PRZESUWA SIĘ PO CICHU, JEST GORSZA NIŻ GRANICA, KTÓREJ NIE MA —
 * o braku przynajmniej wiadomo.
 * ============================================================================
 *
 * SPRAWDZA ŚCIEŻKI, NIE TREŚĆ. Plik wymieniający „package.json" w zdaniu nie jest
 * naruszeniem; ten nagłówek wymienia go czterokrotnie. Naruszeniem jest ISTNIENIE
 * pliku albo katalogu o tej nazwie.
 *
 * Użycie:
 *     node tools/check-npm.js
 *     node tools/check-npm.js --dir <katalog>      # fixtura
 */

var fs = require("fs");
var path = require("path");

var repoRoot = path.join(__dirname, "..");
var dirArg = process.argv.indexOf("--dir");
var root = dirArg !== -1 && process.argv[dirArg + 1]
  ? path.resolve(repoRoot, process.argv[dirArg + 1])
  : repoRoot;

var FORBIDDEN = ["package.json", "package-lock.json", "yarn.lock",
                 "pnpm-lock.yaml", "node_modules"];

/* Katalogi pomijane przy schodzeniu. .git to nie nasze drzewo, a jego zawartości
   nie kontrolujemy; reszta to artefakty przebiegów, ignorowane przez git. */
var SKIP = [".git"];

/* Każdy wyjątek MUSI mieć powód. Pusta lista to stan docelowy i dzisiejszy —
   a lista rosnąca po cichu jest sposobem, w jaki ta kontrola przestanie znaczyć
   cokolwiek. Wyjątek zapisany tutaj jest widoczny w review; wyjątek zrobiony przez
   ciszę nie jest. */
var EXEMPT = [
  /* Brudna fixtura TEGO strażnika. Musi zawierać PRAWDZIWE pliki o zakazanych nazwach,
     bo inaczej nie dowodziłaby niczego — fixtura z nazwą podobną sprawdzałaby coś
     innego niż kontrola. Dwie DOKŁADNE ścieżki, nie przedrostek katalogu: trzeci ślad
     npm dołożony tam kiedykolwiek ma się zapalić, a nie schować pod zwolnieniem. */
  { at: "tools/fixtures/npm/dirty/tools/package.json",
    why: "brudna fixtura check-npm.js — dowód, że kontrola potrafi upaść" },
  { at: "tools/fixtures/npm/dirty/sub/node_modules",
    why: "brudna fixtura check-npm.js — dowód, że kontrola potrafi upaść" }
];

var exemptBad = EXEMPT.filter(function (e) { return !e.why || !e.why.trim(); });
if (exemptBad.length) {
  console.log("FAIL wyjątek bez powodu: " + exemptBad.map(function (e) { return e.at; }).join(", "));
  process.exit(1);
}

if (!fs.existsSync(root)) {
  console.log("FAIL nie ma katalogu " + path.relative(repoRoot, root) +
              " — bez niego nie da się powiedzieć, czego w nim nie ma.");
  process.exit(1);
}

var hits = [], scanned = 0;

function walk(dir) {
  var entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    /* FAIL CLOSED: katalogu, którego nie da się przeczytać, nie wolno uznać za czysty. */
    console.log("FAIL nie mogę przeczytać " + path.relative(repoRoot, dir) + " (" + e.code + ")");
    process.exit(1);
  }
  entries.forEach(function (e) {
    if (SKIP.indexOf(e.name) !== -1) return;
    var full = path.join(dir, e.name);
    var rel = path.relative(root, full).replace(/\\/g, "/");
    scanned++;
    if (FORBIDDEN.indexOf(e.name) !== -1) {
      if (EXEMPT.some(function (x) { return x.at === rel; })) {
        console.log("  WYJĄTEK  " + rel + " — " +
                    EXEMPT.filter(function (x) { return x.at === rel; })[0].why);
        return;
      }
      hits.push(rel + (e.isDirectory() ? "/" : ""));
      /* W node_modules nie schodzimy: jedno trafienie wystarczy, a schodzenie
         w drzewo zależności potrafi trwać minuty i nic nie dodaje. */
      return;
    }
    if (e.isDirectory()) walk(full);
  });
}

walk(root);

console.log("przejrzanych pozycji: " + scanned + "   śladów npm: " + hits.length +
            "   wyjątków: " + EXEMPT.length);

if (hits.length) {
  console.log("\nFAIL ślad npm w drzewie, " + hits.length + ":");
  hits.forEach(function (h) { console.log("  " + h); });
  console.log("\n  Produkt to samodzielne pliki HTML bez kroku budowania. Oprzyrządowanie");
  console.log("  też nie ma zależności — to ono weryfikuje tę obietnicę. Odstępstwo dla");
  console.log("  tools/ było rozważane w ADR-003 i ODRZUCONE; jeśli ma wrócić, wraca");
  console.log("  decyzją zapisaną w ADR-ze, a nie plikiem, którego nikt nie zauważył.");
  process.exit(1);
}

console.log("\nOK   brak śladów npm w całym drzewie");
process.exit(0);
