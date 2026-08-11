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
var entryRe = /"([A-Za-z0-9_.\-]+)":\s*("(?:[^"\\]|\\.)*")/g;
var seen = Object.create(null);
var keys = [];
var m;

while ((m = entryRe.exec(src)) !== null) {
  var key = m[1], body = m[2];
  if (body === '""') fail("klucz " + key + " ma pustą treść");
  if (seen[key]) { fail("klucz zdublowany w słowniku: " + key); continue; }
  seen[key] = true;
  keys.push(key);


}

if (!keys.length) { fail("nie znalazłem ani jednego wpisu słownika"); }
else { console.log("OK   " + keys.length + " kluczy"); }

/* --- kierunek odwrotny: odwołanie do klucza, którego w słowniku NIE MA ---
   Przy przenoszeniu dziewięćdziesięciu siedmiu elementów na data-i18n najczęstszym
   błędem jest literówka w nazwie klucza. t() zwraca wtedy widoczne "[[klucz]]",
   więc dziura nie jest pusta — ale kryterium słownikowe zobaczyłoby ją jako zwykłą
   zaległość, nieodróżnialną od tekstu jeszcze nieprzeniesionego. Tutaj czyta się
   jak to, czym jest: literówka z nazwą pliku i klucza.

   Strażnik stoi PRZED migracją, tak jak trzy pozostałe: wiadomo z góry, że będzie
   dziewięćdziesiąt siedem okazji, żeby ten błąd popełnić. */
var USE_RE = /data-i18n(?:-title|-label)?="([\w.]+)"|\bT\(\s*"([\w.]+)"|\bt\(\s*"([\w.]+)"/g;
var known = Object.create(null);
keys.forEach(function (k) { known[k] = true; });

["generator.html", "validator.html", "index.html", "i18n.js"].forEach(function (f) {
  var text = fs.readFileSync(path.join(root, f), "utf8"), u, missing = [];
  USE_RE.lastIndex = 0;
  while ((u = USE_RE.exec(text)) !== null) {
    var key = u[1] || u[2] || u[3];
    if (!known[key]) missing.push(key);
  }
  if (missing.length) {
    var uniq = missing.filter(function (v, i) { return missing.indexOf(v) === i; });
    fail(f + ": odwołanie do klucza spoza słownika (" + uniq.length + "): " + uniq.join(", "));
  }
});

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

console.log(rc === 0 ? "Słownik spójny." : "Słownik wymaga uwagi.");
process.exit(rc);
