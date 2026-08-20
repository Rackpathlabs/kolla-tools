/* Strażnik gwarancji offline. Uruchamiany przez node, bez zależności.
 *
 * Zastępuje pierwotne AC issue ("headless test that fails the build if any
 * outbound request is attempted"). Test przeglądarkowy wymagałby Playwrighta
 * albo jsdom, czyli npm install — a zero zależności npm jest w tym repozytorium
 * zasadą twardszą niż sposób sprawdzenia. Zamiast tego trzy statyczne kontrole
 * na plikach, które faktycznie trafiają na Pages:
 *
 *   1. meta CSP istnieje, ma dokładnie oczekiwaną treść i stoi PRZED pierwszym
 *      znacznikiem ładującym zasób (inaczej nie obejmuje go polityka),
 *   2. w kodzie nie ma API wychodzących do sieci,
 *   3. w znacznikach ładujących zasoby nie ma adresów http(s).
 *
 * Sama polityka została zweryfikowana ręcznie w przeglądarce, w obu kontekstach
 * (file:// oraz http://), na headless Chrome: oba narzędzia wykonują swój skrypt,
 * fetch jest blokowany przez default-src 'none', a pobieranie przez blob: działa.
 * Dlatego treść polityki jest tu przypięta co do znaku — jej zmiana ma wywalić
 * build i zmusić do powtórzenia tamtej weryfikacji, zwłaszcza dla przycisku
 * „Pobierz", który idzie przez URL.createObjectURL.
 */

var fs = require("fs");
var path = require("path");

var EXPECTED_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "base-uri 'none'; form-action 'none'";

/* API, których obecność przeczy obietnicy „nic nie wychodzi do sieci” */
var FORBIDDEN = [
  { re: /\bfetch\s*\(/, name: "fetch()" },
  { re: /\bXMLHttpRequest\b/, name: "XMLHttpRequest" },
  { re: /\bsendBeacon\b/, name: "navigator.sendBeacon" },
  { re: /\bWebSocket\b/, name: "WebSocket" },
  { re: /\bEventSource\b/, name: "EventSource" },
  { re: /\bimportScripts\b/, name: "importScripts" }
];

/* znaczniki, które ładują zasób — w nich adres zewnętrzny jest realnym żądaniem */
var RESOURCE_TAGS = /<(script|link|img|iframe|frame|embed|object|source|track|video|audio)\b[^>]*>/gi;

/* Katalog jest podmienialny argumentem, żeby strażnika dało się uruchomić na fixturze
   o znanej charakterystyce — ten sam powód co w check-literals.js i check-wiring.js.
   Dowód, że kontrola potrafi upaść, ma być TESTEM, a nie czynnością wykonaną raz
   w dniu, w którym powstawała: czynność nie powtarza się przy zmianie strażnika. */
var dirArg = process.argv.indexOf("--dir");
var root = dirArg !== -1 && process.argv[dirArg + 1]
  ? path.resolve(path.join(__dirname, ".."), process.argv[dirArg + 1])
  : path.join(__dirname, "..");
var files = fs.readdirSync(root).filter(function (f) { return /\.html$/i.test(f); }).sort();

var rc = 0;
function fail(file, msg) { console.log("FAIL " + file + ": " + msg); rc = 1; }

/* Komentarze wycinamy przed skanowaniem: opis polityki wymienia z nazwy te same
   API, których zakazuje, i bez tego kroku strażnik zgłaszałby własny komentarz. */
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
}

if (!files.length) { console.log("FAIL brak plików HTML w korzeniu"); process.exit(1); }

files.forEach(function (file) {
  var src = fs.readFileSync(path.join(root, file), "utf8");
  var clean = stripComments(src);
  var okCount = 0;

  /* --- 1. meta CSP --- */
  /* Treść polityki sama zawiera apostrofy ('none', 'unsafe-inline'), więc wzorzec
     musi zapamiętać znak cudzysłowu i domykać się dopiero na nim. */
  var meta = /<meta\s+http-equiv=(["'])Content-Security-Policy\1\s+content=(["'])([\s\S]*?)\2\s*>/i.exec(clean);
  if (!meta) {
    fail(file, "brak znacznika meta Content-Security-Policy");
  } else if (meta[3].trim() !== EXPECTED_CSP) {
    fail(file, "polityka CSP różni się od oczekiwanej\n     oczekiwano: " + EXPECTED_CSP +
               "\n     jest:       " + meta[3].trim() +
               "\n     Zmiana polityki wymaga powtórzenia weryfikacji w przeglądarce " +
               "(file:// oraz http://), w tym pobierania pliku przez blob:.");
  } else {
    okCount++;
    var firstResource = clean.search(RESOURCE_TAGS);
    RESOURCE_TAGS.lastIndex = 0;
    if (firstResource !== -1 && firstResource < meta.index) {
      fail(file, "meta CSP stoi po pierwszym znaczniku ładującym zasób — polityka go nie obejmie");
    } else {
      okCount++;
    }
  }

  /* --- 2. API sieciowe --- */
  var hits = FORBIDDEN.filter(function (f) { return f.re.test(clean); });
  if (hits.length) {
    fail(file, "API wychodzące do sieci: " + hits.map(function (h) { return h.name; }).join(", "));
  } else {
    okCount++;
  }

  /* --- 3. adresy zewnętrzne w znacznikach ładujących zasoby --- */
  var bad = [];
  var m;
  RESOURCE_TAGS.lastIndex = 0;
  while ((m = RESOURCE_TAGS.exec(clean)) !== null) {
    if (/https?:\/\//i.test(m[0])) bad.push(m[0].slice(0, 80));
  }
  /* style: url(...) oraz @import również pobierają zasób */
  var cssUrl = clean.match(/url\(\s*['"]?https?:\/\/[^)]*\)/gi) || [];
  var cssImport = clean.match(/@import[^;]*https?:\/\/[^;]*/gi) || [];
  bad = bad.concat(cssUrl, cssImport);

  if (bad.length) {
    fail(file, "zewnętrzne zasoby: " + bad.join(" | "));
  } else {
    okCount++;
  }

  if (okCount === 4) console.log("OK   " + file);
});

/* Ścieżka pobierania idzie przez blob: i była osobno sprawdzana pod polityką.
   Jeśli zniknie, ktoś rozwiązał problem z CSP przez usunięcie funkcji — to ma
   być widoczne, a nie ciche. */
var gen = path.join(root, "generator.html");
if (fs.existsSync(gen)) {
  var g = fs.readFileSync(gen, "utf8");
  if (g.indexOf("URL.createObjectURL") === -1) {
    fail("generator.html", "zniknęła ścieżka pobierania przez blob: (URL.createObjectURL). " +
         "Jeśli to skutek zmiany CSP — polityka jest zła, nie funkcja.");
  } else {
    console.log("OK   generator.html — ścieżka pobierania przez blob: obecna");
  }
}

console.log(rc === 0 ? "Gwarancja offline: brak zastrzeżeń."
                     : "Gwarancja offline: są zastrzeżenia.");
process.exit(rc);
