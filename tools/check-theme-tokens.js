/* CZY MOTYW W OGÓLE DOCIERA DO REGUŁ — kolory nieprzezroczyste poza blokiem KOLLA-THEME.
 *
 * POWÓD ISTNIENIA (#16). Motyw jasny wchodzi przez podmianę WARTOŚCI tokenów: reguła
 * pisze `var(--panel)` i nie wie, który zestaw obowiązuje. Reguła, która pisze `#151b22`,
 * nie bierze udziału w tej podmianie — i to jest awaria cicha w najgorszy sposób, bo
 * strona nadal się renderuje. Zmierzone na dzisiejszym drzewie, ZANIM cokolwiek zostało
 * przeniesione: nagłówek miał `background:linear-gradient(180deg,#131a21,#0e1318)`, więc
 * w motywie jasnym ciemny pas nagłówka zostałby pod ciemnym tekstem. Nikt by tego nie
 * zobaczył w żadnym istniejącym strażniku: check-a11y.js liczy TOKENY, a nie to, czy
 * reguła po nie sięga.
 *
 * DLACZEGO TYLKO NIEPRZEZROCZYSTE. `rgba(239,106,106,.14)` to nie jest kolor, tylko
 * NAKŁADKA: kompozytuje się z tym, co pod spodem, więc na jasnym tle daje jasny odcień,
 * a na ciemnym ciemny — adaptuje się z konstrukcji i nie ma czego przenosić. `#151b22`
 * jest ten sam w obu motywach i to jest cała różnica. Kryterium jest więc o kanale alfa,
 * a nie o składni.
 *
 * POZA ZAKRESEM, wymienione, żeby cisza nie uchodziła za pokrycie:
 *   - atrybuty SVG w markupie (`stroke="#3ddc97"` w logo). Znak firmowy ma prawo mieć
 *     stałe barwy w obu motywach, a reguła CSS ich nie dotyka.
 *   - `<style>` w plikach innych niż podane w argumencie.
 *   - to, czy token ma SENSOWNĄ wartość w drugim motywie. Mierzy to check-a11y.js,
 *     i te dwa strażniki razem są dopiero pełnym zdaniem: „reguła sięga po token"
 *     plus „token ma kontrast".
 *
 * DRUGIE ZDANIE TEGO STRAŻNIKA: dwa warianty jasne muszą być identyczne. Zestaw jasny
 * stoi w theme.css DWA RAZY — raz jako `:root[data-theme="light"]` (wybór człowieka),
 * raz w `@media (prefers-color-scheme: light)` (ustawienie systemu) — bo czysty CSS nie
 * umie przypisać jednej listy wartości do dwóch selektorów bez powtórzenia jej. Powtórzenie
 * jest więc wymuszone, a jego rozjazd byłby awarią widoczną tylko dla części użytkowników:
 * ten, kto kliknął przełącznik, widziałby inne kolory niż ten, kto nie kliknął nic. Żaden
 * pomiar kontrastu tego nie złapie, bo obie listy z osobna mogą być poprawne.
 *
 * Użycie:
 *     node tools/check-theme-tokens.js [plik.html ...]
 *     node tools/check-theme-tokens.js --theme theme.css      # tylko zgodność wariantów
 */

var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
/* Wartość po --theme nie jest plikiem HTML do przejrzenia, tylko arkuszem do porównania.
   Bez tego wyjątku fixtura arkusza trafiałaby na obie listy naraz i strażnik raportowałby
   ją dwa razy — raz jako przedmiot, raz jako argument. */
var args = [];
for (var ai = 2; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--theme") { ai++; continue; }
  if (process.argv[ai].indexOf("--") === 0) continue;
  args.push(process.argv[ai]);
}
var files = args.length ? args
                       : ["index.html", "generator.html", "validator.html"].map(function (f) {
                           return path.join(root, f);
                         });

var total = 0;      /* kolory nieprzezroczyste poza blokiem */
var drift = 0;      /* tokeny, na których rozjechały się warianty jasne */

files.forEach(function (file) {
  var src;
  try {
    src = fs.readFileSync(file, "utf8");
  } catch (e) {
    /* Kod 2: „nie zmierzyłem" to inna wiadomość niż „zmierzyłem i jest źle". */
    console.error("BŁĄD: nie mogę odczytać " + file + " — " + e.message);
    process.exit(2);
  }

  var lines = src.split("\n");
  var inStyle = false, inTheme = false, hits = [];
  for (var i = 0; i < lines.length; i++) {
    var L = lines[i];
    if (L.indexOf("<style") !== -1) inStyle = true;
    if (L.indexOf("== KOLLA-THEME BEGIN") !== -1) inTheme = true;
    if (!inTheme && inStyle) {
      /* Nieprzezroczysty zapis szesnastkowy: #rgb, #rrggbb. Cztero- i ośmiocyfrowe
         formy niosą alfę, więc podlegają temu samemu zwolnieniu co rgba(). */
      var re = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/g, m;
      while ((m = re.exec(L))) {
        if (m[0].length !== 4 && m[0].length !== 7) continue;
        hits.push({ line: i + 1, hex: m[0], text: L.trim().slice(0, 90) });
      }
    }
    if (L.indexOf("== KOLLA-THEME END") !== -1) inTheme = false;
    if (L.indexOf("</style>") !== -1) inStyle = false;
  }

  var name = path.basename(file);
  if (!hits.length) {
    console.log("OK   " + name + " — każda reguła sięga po token motywu");
  } else {
    total += hits.length;
    console.log("FAIL " + name + " — " + hits.length +
                " kolorów nieprzezroczystych poza blokiem motywu:");
    hits.forEach(function (h) {
      console.log("     " + name + ":" + h.line + "  " + h.hex + "   " + h.text);
    });
  }
});

/* ---- dwa warianty jasne, jedna lista wartości ---- */
(function () {
  var tArg = process.argv.indexOf("--theme");
  var themeFile = tArg !== -1 ? path.resolve(process.argv[tArg + 1])
                              : path.join(root, "theme.css");
  var css;
  try {
    css = fs.readFileSync(themeFile, "utf8");
  } catch (e) {
    console.error("BŁĄD: nie mogę odczytać " + themeFile + " — " + e.message);
    process.exit(2);
  }
  function tokensAfter(marker) {
    var i = css.indexOf(marker);
    if (i === -1) return null;
    var open = css.indexOf("{", i), close = css.indexOf("}", open);
    var out = {}, re = /--([a-z0-9-]+)\s*:\s*([^;}]+)/g, m;
    var block = css.slice(open, close);
    while ((m = re.exec(block))) out[m[1]] = m[2].trim();
    return out;
  }
  var wybor = tokensAfter(':root[data-theme="light"]');
  var system = tokensAfter("prefers-color-scheme: light");
  if (!wybor || !system) {
    console.error("BŁĄD: " + path.basename(themeFile) +
                  " nie ma obu wariantów jasnych — nie ma czego porównać.");
    process.exit(2);
  }
  var keys = {};
  Object.keys(wybor).forEach(function (k) { keys[k] = 1; });
  Object.keys(system).forEach(function (k) { keys[k] = 1; });
  var rozjazd = Object.keys(keys).filter(function (k) { return wybor[k] !== system[k]; });
  if (!rozjazd.length) {
    console.log("OK   " + path.basename(themeFile) +
                " — oba warianty jasne niosą tę samą listę (" +
                Object.keys(wybor).length + " tokenów)");
  } else {
    drift += rozjazd.length;
    console.log("FAIL " + path.basename(themeFile) + " — warianty jasne rozjechały się " +
                "na " + rozjazd.length + " tokenach:");
    rozjazd.forEach(function (k) {
      console.log("     --" + k + "   wybór: " + (wybor[k] || "(brak)") +
                  "   system: " + (system[k] || "(brak)"));
    });
  }
})();

console.log("");
console.log("kolory nieprzezroczyste poza KOLLA-THEME: " + total +
            "   rozjazd wariantów jasnych: " + drift);
if (total) {
  console.log("");
  console.log("Reguła z kolorem nieprzezroczystym nie bierze udziału w podmianie motywu:");
  console.log("przenieś wartość do theme.css jako token i sięgnij po nią przez var(--nazwa).");
  process.exit(1);
}
if (drift) {
  console.log("");
  console.log("Warianty jasne muszą nieść tę samą listę wartości: kto kliknął przełącznik");
  console.log("i kto nie kliknął nic, mają widzieć ten sam motyw.");
  process.exit(1);
}
console.log("");
console.log("OK   motyw dociera do wszystkich reguł");
process.exit(0);
