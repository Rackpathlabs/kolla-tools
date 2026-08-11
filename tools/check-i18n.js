/* Strażnik słownika. Bez niego dwa języki rozjeżdżają się w tydzień.
 *
 * Sprawdza dwie rzeczy, obie na źródle prawdy (i18n.js), nie na kopiach —
 * zgodność kopii pilnuje check-blocks.sh:
 *
 *   1. KOMPLETNOŚĆ — każdy klucz istnieje w obu językach i żaden nie jest pusty.
 *      Brakujący klucz wywala build i podaje nazwę.
 *   2. BRAK SIEROT — każdy klucz jest gdzieś użyty w plikach wysyłanych do
 *      przeglądarki. Klucz, którego nikt nie woła, to tekst, którego nikt nie
 *      przeczyta, utrzymywany w dwóch językach na zawsze.
 *
 * Kontroli "brak tekstu zaszytego w kodzie" tu jeszcze nie ma: dopóki oba
 * narzędzia nie są przetłumaczone, zgłaszałaby setki trafień i nie dałoby się
 * jej odróżnić od szumu. Wchodzi razem z przetłumaczeniem drugiego narzędzia.
 */

var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var src = fs.readFileSync(path.join(root, "i18n.js"), "utf8");

var rc = 0;
function fail(msg) { console.log("FAIL " + msg); rc = 1; }

/* Klucze czytamy z tekstu źródła, a nie przez wykonanie bloku: strażnik ma
   działać także wtedy, gdy blok jest składniowo zepsuty. */
var entryRe = /"([A-Za-z0-9_.\-]+)":\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
var seen = Object.create(null);
var keys = [];
var m;

while ((m = entryRe.exec(src)) !== null) {
  var key = m[1], body = m[2];
  if (seen[key]) { fail("klucz zdublowany w słowniku: " + key); continue; }
  seen[key] = true;
  keys.push(key);

  ["en", "pl"].forEach(function (lang) {
    var re = new RegExp("(^|[,{\\s])" + lang + ":\\s*\"");
    if (!re.test(body)) fail("klucz " + key + " nie ma tłumaczenia: " + lang);
  });
  if (/(^|[,{\s])(en|pl):\s*""/.test(body)) fail("klucz " + key + " ma puste tłumaczenie");
}

if (!keys.length) { fail("nie znalazłem ani jednego wpisu słownika"); }
else { console.log("OK   " + keys.length + " kluczy, każdy w obu językach"); }

/* --- sieroty --- */
var consumers = ["generator.html", "validator.html", "index.html"].map(function (f) {
  return fs.readFileSync(path.join(root, f), "utf8");
});

var orphans = keys.filter(function (key) {
  var needle = '"' + key + '"';
  var alt = "'" + key + "'";
  return !consumers.some(function (text) {
    /* Wycinamy CAŁY region bloku, nie tylko to, co przed nim: w hubie blok stoi
       na końcu pliku, więc szukanie "po markerze końca" nie znajdowało niczego.
       Użycie musi być poza definicją, gdziekolwiek ta definicja leży. */
    var body = text.replace(/== KOLLA-I18N BEGIN[\s\S]*?== KOLLA-I18N END ==\s*\*\//, " ");
    return body.indexOf(needle) !== -1 || body.indexOf(alt) !== -1;
  });
});

if (orphans.length) {
  fail("klucze bez użycia (" + orphans.length + "): " + orphans.slice(0, 12).join(", ") +
       (orphans.length > 12 ? " …" : ""));
} else {
  console.log("OK   żaden klucz nie jest sierotą");
}

/* --- pary {en, pl} w tabelach danych ---
   Teksty żyjące przy danych (tabele reguł, macierz wydań) nie mają kluczy
   słownika — i to jest świadoma decyzja, żeby opis nie odrywał się od rzeczy,
   którą opisuje. Ale kompletność musi obowiązywać je tak samo: wpis z samym
   "en" ma wywalić build dokładnie jak brakujący klucz słownika. */
["generator.html", "validator.html", "matrix.js", "globals-parser.js"].forEach(function (file) {
  var full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  var text = fs.readFileSync(full, "utf8");
  /* Blok słownika sprawdzamy osobno wyżej — tu interesują nas pary przy danych. */
  var body = text.replace(/== KOLLA-I18N BEGIN[\s\S]*?== KOLLA-I18N END ==\s*\*\//, " ");

  var re = /\ben:\s*"/g, m, lone = [];
  while ((m = re.exec(body)) !== null) {
    /* Para jest zapisywana jako { en: "…", pl: "…" }, więc "pl:" musi wystąpić
       przed kolejnym "en:". Okno zamiast liczenia nawiasów, bo wartości zawierają
       wstawki {nazwa} i licznik nawiasów by się na nich wykładał. */
    var rest = body.slice(m.index + 1);
    var nextEn = rest.search(/\ben:\s*"/);
    var window = nextEn === -1 ? rest : rest.slice(0, nextEn);
    if (!/\bpl:\s*"/.test(window)) {
      lone.push(file + ":" + (body.slice(0, m.index).split("\n").length));
    }
  }
  if (lone.length) {
    fail("pary {en, pl} bez polskiej połowy (" + lone.length + "): " + lone.slice(0, 8).join(", "));
  } else {
    console.log("OK   " + file + " — pary przy danych kompletne");
  }
});

console.log(rc === 0 ? "Słownik spójny." : "Słownik wymaga uwagi.");
process.exit(rc);
