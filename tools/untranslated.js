/* Licznik nieprzetłumaczonego tekstu. Narzędzie robocze, nie strażnik CI —
 * odpowiada na pytanie "czy przy dokładaniu reguły nie zostawiłem czegoś po polsku".
 *
 *     node tools/untranslated.js            # podsumowanie
 *     node tools/untranslated.js --list     # z treścią
 *
 * Historia, dla której to tu leży: pierwsza wersja tego licznika zliczała także
 * POLSKIE POŁÓWKI PAR {en, pl}, czyli tekst już przetłumaczony. Pokazywał 123
 * pozycje i nie drgnął po przetłumaczeniu całej rodziny reguł — mierzył obecność
 * polszczyzny zamiast braku tłumaczenia. Miernik wyglądający na działający jest
 * tym samym, co strażnik wyglądający na działający: wysyła na poszukiwanie błędu,
 * którego nie ma.
 *
 * Dlatego pomijane są:
 *   - bloki współdzielone (słownik zawiera polski z definicji),
 *   - połówki pl: par {en, pl} — to jest tłumaczenie, nie jego brak,
 *   - komentarze w kodzie: nie trafiają do interfejsu.
 */

var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var FILES = ["generator.html", "validator.html", "index.html", "globals-parser.js", "matrix.js"];
var BLOCKS = ["KOLLA-MATRIX", "GLOBALS-PARSER", "KOLLA-I18N", "KOLLA-THEME"];
var PL = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
var list = process.argv.indexOf("--list") !== -1;

function stripBlocks(src) {
  BLOCKS.forEach(function (tag) {
    src = src.replace(new RegExp("== " + tag + " BEGIN[\\s\\S]*?== " + tag + " END ==\\s*\\*/", "g"), " ");
  });
  return src;
}

/* Komentarze wycinamy, bo polski w komentarzu jest w tym repozytorium normą,
   a nie długiem — do interfejsu nie trafia. */
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
}

var total = 0;
FILES.forEach(function (file) {
  var full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  var src = stripComments(stripBlocks(fs.readFileSync(full, "utf8")));

  var hits = [];
  var re = /(pl:\s*)?"((?:[^"\\]|\\.){6,})"/g;
  var m;
  while ((m = re.exec(src)) !== null) {
    if (m[1]) continue;                 // połówka pl: pary — już przetłumaczone
    if (!PL.test(m[2])) continue;
    hits.push({ line: src.slice(0, m.index).split("\n").length, text: m[2] });
  }

  total += hits.length;
  console.log((hits.length ? "  " : "  ") + file.padEnd(20) + hits.length);
  if (list) hits.forEach(function (h) { console.log("       " + h.line + "  " + h.text.slice(0, 100)); });
});

console.log("razem nieprzetłumaczonych literałów: " + total);
