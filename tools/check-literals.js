#!/usr/bin/env node
/* Tekst interfejsu nie ma prawa być literałem w kodzie.
 *
 * Ten strażnik powstał PRZED migracją, którą ma prowadzić, i jest czerwony od
 * pierwszego commitu. To nie jest szczegół procesu. Trzy mierniki w tym repozytorium
 * powstały PO pracy i każdy ją potwierdził zamiast sprawdzić: licznik tłumaczeń,
 * pierwsza asercja end-to-end i sonda paska nieaktualności. Trzy postawione PRZED
 * pracą nie przepuściły dotąd niczego.
 *
 * Zakazuje KONSTRUKCJI, nie języka — angielski literał wpada tak samo jak polski.
 * Sprawdzanie treści przepuszcza to, o czym autor nie pomyślał; sprawdzanie kształtu
 * nie ma jak. Osiemnaście polskich toastów przeszło skan języka, bo padały ze
 * ścieżek, których nikt nie wywołał.
 *
 * NIE JEST TO WĘŻSZA WERSJA KRYTERIUM SŁOWNIKOWEGO i nie wolno go usunąć jako
 * zbędnego, gdy tamto stanie. Robią dwie różne rzeczy:
 *
 *   ten strażnik ZAPOBIEGA — działa na kodzie, więc nie ma pojęcia „scenariusz":
 *     nie pozwala wpisać tekstu tam, gdzie nie wolno, niezależnie od języka i od
 *     tego, czy ktokolwiek kiedykolwiek tę ścieżkę wywoła. Ciasny i pewny.
 *
 *   kryterium słownikowe WYKRYWA — działa na wyrenderowanej stronie: znajduje to,
 *     co już jest na ekranie, ale wyłącznie na ścieżkach, którymi przejedzie.
 *     Szerokie i zależne od pokrycia.
 *
 * Zapobieganie bez wykrywania przepuszcza to, co weszło innym ujściem; wykrywanie
 * bez zapobiegania przepuszcza to, czego scenariusz nie dotknął.
 *
 * Wyjątki są KATEGORIAMI STRUKTURALNYMI, nie listą napisów: napis złożony wyłącznie
 * ze znaków interpunkcyjnych, cyfr albo identyfikatora nie jest zdaniem interfejsu.
 * Lista konkretnych napisów rośnie o jeden przy każdym czerwonym przebiegu, aż
 * przestaje cokolwiek znaczyć.
 */

var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var FILES = ["validator.html", "generator.html", "index.html", "globals-parser.js"];

/* Ujścia, którymi tekst trafia na ekran. */
var SINKS = [
  { re: /\.(?:textContent|innerHTML)\s*=\s*("(?:[^"\\]|\\.)*")/g, what: "przypisanie do DOM" },
  { re: /\btoast\(\s*("(?:[^"\\]|\\.)*")/g,                        what: "powiadomienie" },
  { re: /\.setAttribute\(\s*"(?:title|placeholder|aria-label)"\s*,\s*("(?:[^"\\]|\\.)*")/g,
    what: "atrybut widoczny dla użytkownika" }
];

/* Kategorie strukturalne, nie napisy. Każda mówi, CZYM jest dopuszczony ciąg. */
var CATEGORIES = [
  { why: "puste albo samo formatowanie", test: function (t) { return !/[A-Za-zĄ-ż]/.test(t); } },
  { why: "pojedynczy identyfikator, nazwa klucza lub klasy CSS",
    test: function (t) { return /^[A-Za-z_][\w.-]*$/.test(t) && !/\s/.test(t); } },
  { why: "znacznik HTML bez treści",
    test: function (t) { return /^<[^>]+>$/.test(t.trim()); } }
];

function excused(t) {
  for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].test(t)) return CATEGORIES[i];
  return null;
}

var hits = [], scanned = 0;
FILES.forEach(function (file) {
  var s = fs.readFileSync(path.join(root, file), "utf8");
  SINKS.forEach(function (sink) {
    var re = new RegExp(sink.re.source, "g"), m;
    while ((m = re.exec(s))) {
      scanned++;
      var text = m[1].slice(1, -1);
      if (excused(text)) continue;
      hits.push({ file: file, line: s.slice(0, m.index).split("\n").length,
                  what: sink.what, text: text.slice(0, 72) });
    }
  });
});

console.log("ujść tekstu przejrzanych: " + scanned);
if (!hits.length) {
  console.log("OK   żaden tekst interfejsu nie jest literałem w kodzie");
  process.exit(0);
}

console.log("FAIL tekst interfejsu wpisany w kod, " + hits.length + " razy:");
hits.forEach(function (h) {
  console.log("  " + h.file + ":" + h.line + "  (" + h.what + ")");
  console.log("      \"" + h.text + "\"");
});
console.log("\nKażdy z nich ma dostać klucz w i18n.js. Słownik jest jedynym miejscem,");
console.log("w którym widać wszystkie komunikaty naraz — i tym, co czyta asercja.");
process.exit(1);
