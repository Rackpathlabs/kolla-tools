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
 *
 * ZNANE OGRANICZENIE, nienaprawione: dla matrix.js licznik zwraca 0, mimo że plik
 * zawiera kilkadziesiąt polskich wartości why/label/note. Po wycięciu komentarzy
 * zostaje 8,6 kB treści, a mimo to żadne dopasowanie nie wchodzi — przyczyny nie
 * ustaliłem. Do czasu jej znalezienia NIE traktować zera dla matrix.js jako
 * potwierdzenia, że plik jest przetłumaczony; etap 3 musi to zweryfikować inaczej.
 * Zapisane tutaj, a nie przemilczane, bo miernik z cichą dziurą jest gorszy od
 * jego braku — to jest dokładnie ta klasa błędu, którą ten plik ma pomagać łapać.
 */

var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var FILES = ["generator.html", "validator.html", "index.html", "globals-parser.js", "matrix.js"];
/* Kopie bloków w plikach HTML liczyłyby ten sam tekst po raz drugi — mierzymy
   źródła prawdy, nie ich odbicia. */
var BLOCK_SOURCES = { "globals-parser.js": 1, "matrix.js": 1 };
/* Wycinamy TYLKO słownik i motyw. Macierz i parser zawierają prozę podlegającą
   tłumaczeniu — ich wycięcie dawało zero dla matrix.js, czyli pliku z największym
   blokiem tekstu w repozytorium. Drugi raz ten sam licznik mierzył nie to. */
var BLOCKS = ["KOLLA-I18N", "KOLLA-THEME"];
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
  var raw = fs.readFileSync(full, "utf8");
  /* W plikach HTML wycinamy bloki współdzielone, bo ich źródła liczymy osobno. */
  var src = stripComments(BLOCK_SOURCES[file] ? raw
    : raw.replace(/== KOLLA-MATRIX BEGIN[\s\S]*?== KOLLA-MATRIX END ==\s*\*\//g, " ")
         .replace(/== GLOBALS-PARSER BEGIN[\s\S]*?== GLOBALS-PARSER END ==\s*\*\//g, " "));
  src = stripBlocks(src);

  var hits = [];
  var re = /(pl:\s*)?"((?:[^"\\]|\\.){6,})"/g;
  var m;
  while ((m = re.exec(src)) !== null) {
    if (m[1]) continue;                 // połówka pl: pary — już przetłumaczone
    if (!PL.test(m[2])) continue;
    /* Numer linii liczymy w ORYGINALE, nie w tekście po wycięciach: wycinanie
       bloków i komentarzy przesuwa wszystko, a numer, który nie wskazuje miejsca
       w pliku, jest gorszy od jego braku — wysyła do niewłaściwej linii z pełnym
       przekonaniem. Poprzednia wersja podawała właśnie takie. */
    var at = raw.indexOf(m[2]);
    hits.push({ line: at === -1 ? 0 : raw.slice(0, at).split("\n").length, text: m[2] });
  }

  total += hits.length;
  console.log((hits.length ? "  " : "  ") + file.padEnd(20) + hits.length);
  if (list) hits.forEach(function (h) { console.log("       " + h.line + "  " + h.text.slice(0, 100)); });
});

console.log("razem nieprzetłumaczonych literałów: " + total);
