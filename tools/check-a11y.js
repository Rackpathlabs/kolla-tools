#!/usr/bin/env node
/* PIERWSZE PRZEJŚCIE DOSTĘPNOŚCI, mierzone na WYRENDEROWANEJ stronie (#17).
 *
 * Trzy pytania, wszystkie rozstrzygalne maszynowo i wszystkie dziś niepilnowane:
 *
 *   1. czy każdy element interaktywny ma ŹRÓDŁO nazwy dostępnej,
 *   2. czy każde pole formularza ma etykietę,
 *   3. czy kolejność nagłówków nie przeskakuje poziomów.
 *
 * ============================================================================
 * DLACZEGO NIE DRZEWO DOSTĘPNOŚCI, CHOĆ TAK BRZMIAŁ PLAN
 *
 * Plan zakładał `--dump-accessibility-tree`, bo to byłby pomiar SKUTKU: gotowa nazwa
 * policzona przez przeglądarkę, nie nasza rekonstrukcja. Zmierzone przed napisaniem
 * czegokolwiek, na Chrome 152.0.7977.64 w tym obrazie: flaga NIE PRODUKUJE ŻADNEGO
 * WYJŚCIA — ani na stdout, ani na stderr, kod wyjścia 0. Nie jest to awaria środowiska,
 * tylko flaga, której w headless nie ma.
 *
 * Drugą drogą byłby protokół DevTools przez własnego klienta WebSocket. Odrzucone:
 * implementacja cudzego protokołu ręcznie to dokładnie klasa, przed którą ostrzega
 * ADR-003 — trzeci przybliżony parser w tym repozytorium, tym razem z autorytetem
 * czegoś, co wygląda na klienta CDP.
 *
 * Zostaje pomiar na DOM-ie po wykonaniu skryptów, tą samą drogą co check-rendered.js.
 * ============================================================================
 * CO TO ZNACZY DLA ZAKRESU, powiedziane wprost, bo zieleń ma znaczyć tyle, ile znaczy
 *
 * NIE LICZYMY NAZWY DOSTĘPNEJ. Liczymy, czy istnieje ŹRÓDŁO nazwy: własny tekst,
 * aria-label, aria-labelledby wskazujące na istniejący element, title, alt, etykieta
 * powiązana z polem. Kryterium jest więc jednostronne i celowo:
 *
 *   wykrywa   BRAK WSZYSTKICH źródeł naraz — wtedy nazwy nie ma i nie może być
 *   przepuszcza  źródło obecne, ale rozwijające się do pustego napisu
 *
 * Fałszywego alarmu nie wyprodukuje; przeoczyć może. To jest właściwa strona pomyłki
 * dla strażnika, który dopiero powstaje, i jest to granica, a nie niedopatrzenie.
 *
 * KLAWIATURA I PUŁAPKI FOKUSA SĄ POZA ZAKRESEM, świadomie. Wymagają sterowania
 * przeglądarką w czasie rzeczywistym — wysyłania Tab, czytania document.activeElement
 * po każdym kroku — czego dzisiejsze oprzyrządowanie nie umie, bo `--dump-dom` daje
 * jeden zrzut po zakończeniu skryptów. Pomiar udawany byłby gorszy niż jego brak:
 * zieleń „nawigacja klawiaturą działa" bez ani jednego naciśnięcia Taba to trzeci
 * wariant pustego zielonego z docs/PRINCIPLES.md.
 *
 * PLACEHOLDER NIE JEST ETYKIETĄ. To rozstrzygnięcie, nie surowość: znika po wpisaniu
 * pierwszego znaku, więc pole bez etykiety przestaje mieć nazwę dokładnie wtedy, gdy
 * użytkownik zaczyna z niego korzystać.
 *
 * ============================================================================
 * WERSJA CHROME'A JEST ZMIENNĄ POMIARU, i to jest obserwacja z pierwszego przebiegu,
 * nie przypuszczenie. Zmierzone na Chrome 152.0.7977.64: `--dump-accessibility-tree`
 * nie produkuje wyjścia, a `--dump-dom` produkuje. Ten strażnik stoi więc na DOM-ie,
 * czyli na powierzchni znacznie stabilniejszej niż drzewo dostępności — ale nie na
 * stałej: `querySelectorAll` z selektorem atrybutowym i `aria-hidden` to zachowania
 * standardu, nie tej wersji.
 *
 * PRÓG STABILNOŚCI DO USTALENIA PO, NIE PRZED. Dopóki nie ma drugiego pomiaru na innej
 * wersji, każda liczba opisująca „jak bardzo to zależy od Chrome'a" byłaby liczbą
 * z głowy. Pierwszy przebieg na innej wersji jest tym pomiarem i to on ma tu dopisać
 * zdanie — albo je usunąć.
 * ============================================================================
 *
 * Użycie:
 *     node tools/check-a11y.js
 *     node tools/check-a11y.js --file validator.html      # jeden plik
 */

var fs = require("fs");
var os = require("os");
var path = require("path");
var cp = require("child_process");
var lib = require("./render-lib");

var root = path.join(__dirname, "..");
var PAGES = ["generator.html", "validator.html", "index.html"];

var fileArg = process.argv.indexOf("--file");
if (fileArg !== -1) PAGES = [process.argv[fileArg + 1]];

/* Sonda wykonuje się W STRONIE, po jej własnych skryptach. Wynik wraca tą samą drogą
   co w check-rendered.js: element <script type="application/json">, czytany ze zrzutu. */
var PROBE = [
  '<script>',
  '(function () {',
  '  function textOf(el) { return (el.textContent || "").replace(/\\s+/g, " ").trim(); }',
  '  function labelledby(el) {',
  '    var v = el.getAttribute("aria-labelledby");',
  '    if (!v) return false;',
  '    var ids = v.split(/\\s+/), any = false;',
  '    for (var i = 0; i < ids.length; i++) { if (document.getElementById(ids[i])) any = true; }',
  '    return any;',
  '  }',
  '  function hasLabelElement(el) {',
  '    if (el.id && document.querySelector(\'label[for="\' + el.id + \'"]\')) return true;',
  '    var p = el.parentNode;',
  '    while (p && p.nodeType === 1) { if (p.tagName === "LABEL") return true; p = p.parentNode; }',
  '    return false;',
  '  }',
  '  /* aria-hidden ZDEJMUJE element z drzewa dostępności razem z poddrzewem, więc',
  '     nazwa jest mu niepotrzebna z definicji. Pierwszy pomiar na zastanym interfejsie',
  '     zgłosił trzy takie pola — ukryte inputy typu file, wyzwalane widocznym',
  '     przyciskiem — i to była wada KRYTERIUM, nie interfejsu. Złapane przez pomiar',
  '     wykonany PRZED jakąkolwiek naprawą, co jest całym powodem tej kolejności. */',
  '  function ariaHidden(el) {',
  '    var p = el;',
  '    while (p && p.nodeType === 1) {',
  '      if (p.getAttribute("aria-hidden") === "true") return true;',
  '      p = p.parentNode;',
  '    }',
  '    return false;',
  '  }',
  '  function where(el) {',
  '    return el.tagName.toLowerCase() +',
  '           (el.id ? "#" + el.id : "") +',
  '           (el.className && typeof el.className === "string" && el.className',
  '              ? "." + el.className.split(/\\s+/)[0] : "");',
  '  }',
  '  var out = { names: [], labels: [], headings: [] };',
  '',
  '  /* Pola formularza NIE wchodzą do kontroli nazwy — ma je ostrzejsze kryterium',
  '     etykiety niżej. Inaczej jedno pole bez etykiety zgłaszałoby się dwa razy, a lista',
  '     robocza mierzyłaby liczbę kryteriów zamiast liczby wad. */',
  '  var INTERACTIVE = "a[href], button, summary, [role=\'button\']";',
  '  var els = document.querySelectorAll(INTERACTIVE);',
  '  for (var i = 0; i < els.length; i++) {',
  '    var el = els[i];',
  '    if (el.type === "hidden" || ariaHidden(el)) continue;',
  '    var img = el.querySelector ? el.querySelector("img[alt]") : null;',
  '    var named = !!(textOf(el) || el.getAttribute("aria-label") || labelledby(el) ||',
  '                   el.getAttribute("title") || (img && img.getAttribute("alt")) ||',
  '                   ((el.tagName === "INPUT" || el.tagName === "SELECT" ||',
  '                     el.tagName === "TEXTAREA") && hasLabelElement(el)) ||',
  '                   (el.tagName === "INPUT" && el.value));',
  '    if (!named) out.names.push(where(el));',
  '  }',
  '',
  '  var fields = document.querySelectorAll("input, select, textarea");',
  '  for (var j = 0; j < fields.length; j++) {',
  '    var f = fields[j];',
  '    if (f.type === "hidden" || ariaHidden(f)) continue;',
  '    if (hasLabelElement(f) || f.getAttribute("aria-label") || labelledby(f)) continue;',
  '    out.labels.push(where(f));',
  '  }',
  '',
  '  var hs = document.querySelectorAll("h1, h2, h3, h4, h5, h6"), prev = 0;',
  '  for (var k = 0; k < hs.length; k++) {',
  '    var lvl = +hs[k].tagName.slice(1);',
  '    if (prev && lvl > prev + 1) {',
  '      out.headings.push("h" + prev + " -> h" + lvl + "  " + textOf(hs[k]).slice(0, 40));',
  '    }',
  '    prev = lvl;',
  '  }',
  '',
  '  var s = document.createElement("script");',
  '  s.type = "application/json"; s.id = "__a11y_out";',
  '  s.textContent = JSON.stringify(out);',
  '  document.body.appendChild(s);',
  '})();',
  '</script>'
].join("\n");

function cleanup(tmp, dir) {
  try { if (tmp) fs.unlinkSync(tmp); } catch (e) { /* nie jest wynikiem testu */ }
  try { if (dir) fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* jw. */ }
}

function audit(chrome, file) {
  var srcPath = path.join(root, file);
  var src = fs.readFileSync(srcPath, "utf8");
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), "kolla-a11y-"));
  /* Sama nazwa pliku, nie ścieżka: fixtura leży w podkatalogu, a katalog tymczasowy
     jest płaski. */
  var tmp = path.join(dir, path.basename(file));
  fs.writeFileSync(tmp, src.replace("</body>", PROBE + "\n</body>"));
  /* Ta sama gwarancja co w check-rendered.js: kopia różni się od źródła WYŁĄCZNIE
     wstrzykniętą sondą. Inaczej mierzylibyśmy plik, którego nikt nie wdroży. */
  var back = fs.readFileSync(tmp, "utf8");
  if (back.replace(PROBE + "\n", "") !== src) {
    cleanup(tmp, dir);
    throw new Error(file + ": kopia różni się od źródła nie tylko sondą");
  }
  var url = "file:///" + tmp.replace(/\\/g, "/").replace(/^\//, "");
  var dom;
  try {
    dom = cp.execSync(JSON.stringify(chrome) +
      " --headless --disable-gpu --no-sandbox --dump-dom --virtual-time-budget=4000 " +
      JSON.stringify(url),
      { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).toString();
  } finally {
    cleanup(tmp, dir);
  }
  var m = dom.match(/<script type="application\/json" id="__a11y_out">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(file + ": sonda nie wypisała wyniku — czy JS się wykonał?");
  return JSON.parse(m[1]);
}

var chrome = lib.findChrome();
if (!chrome) {
  console.error("FAIL brak przeglądarki do pomiaru dostępności. Ustaw CHROME=/ścieżka/do/chrome.");
  console.error("     Kontrola dostępności NIE jest pomijana po cichu: bez przeglądarki");
  console.error("     nie ma wyrenderowanej strony, a nazwa dostępna jest jej własnością.");
  process.exit(2);
}
console.log("przeglądarka: " + chrome);

var bad = 0;
PAGES.forEach(function (file) {
  var r = audit(chrome, file);
  var n = r.names.length + r.labels.length + r.headings.length;
  if (!n) { console.log("OK   " + file + " — nazwy, etykiety i poziomy nagłówków w porządku"); return; }
  bad += n;
  console.log("FAIL " + file + " — " + n + " pozycji:");
  r.names.forEach(function (x) { console.log("  bez ŹRÓDŁA NAZWY        " + x); });
  r.labels.forEach(function (x) { console.log("  pole bez ETYKIETY       " + x); });
  r.headings.forEach(function (x) { console.log("  PRZESKOK POZIOMU        " + x); });
});

/* ---- KONTRAST, liczony z TOKENÓW, nie ze zrzutu ekranu -----------------------
 *
 * Pary tło/tekst stoją w theme.css jako zmienne, a WCAG to arytmetyka na luminancji
 * względnej — więc pomiar nie potrzebuje ani przeglądarki, ani obrazu. Zrzut ekranu
 * byłby tu gorszy, nie lepszy: mierzyłby piksele po antyaliasingu, czyli coś innego
 * niż to, co przeglądarka uznaje za kolor tekstu.
 *
 * PARY SĄ WYPISANE, i to jest granica. Nie wyprowadzamy ich z CSS-u, bo wymagałoby to
 * rozstrzygania kaskady — a kaskada jest dokładnie tym, czego nie da się policzyć bez
 * przeglądarki. Para, której nikt tu nie wpisał, nie jest sprawdzona; lista ma być
 * czytana jak lista, a nie jak wyczerpanie tematu.
 *
 * PRÓG 4.5:1 to WCAG 2.1 AA dla tekstu zwykłego. Tekst duży ma niższy próg (3:1), ale
 * rozmiar zależy od reguły CSS, nie od tokenu — więc stosujemy próg ostrzejszy dla
 * wszystkiego. Pomyłka idzie w stronę zawyżonego wymagania, nie zaniżonego. */
var TOKENS = {};
(function () {
  var css = fs.readFileSync(path.join(root, "theme.css"), "utf8");
  var re = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g, m;
  while ((m = re.exec(css))) TOKENS[m[1]] = m[2];
})();

function channel(v) {
  var c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  var h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function ratio(a, b) {
  var la = luminance(a), lb = luminance(b);
  var hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/* Pary FAKTYCZNIE występujące w arkuszach, sprawdzone gripem po `color:var(--x)`
   obok `background:var(--y)`. Nie każda kombinacja tokenów jest parą. */
var PAIRS = [
  ["fg", "bg"], ["muted", "bg"], ["dim", "bg"],
  ["fg", "panel"], ["muted", "panel"], ["dim", "panel"],
  ["fg", "panel-2"], ["muted", "panel-2"],
  ["blue", "bg"], ["blue", "panel"],
  ["accent", "panel"], ["accent", "bg"],
  ["amber", "panel"], ["red", "panel"]
];
var AA = 4.5;
var lowContrast = [];
PAIRS.forEach(function (p) {
  var fg = TOKENS[p[0]], bg = TOKENS[p[1]];
  if (!fg || !bg) { lowContrast.push("brak tokenu: --" + p[0] + " / --" + p[1]); return; }
  var r = ratio(fg, bg);
  if (r < AA) {
    lowContrast.push("--" + p[0] + " na --" + p[1] + ": " + r.toFixed(2) + ":1  (próg " + AA + ")");
  }
});
console.log("");
/* Najgorsza para wypisana ZAWSZE, także gdy przechodzi. Zieleń bez liczby nie mówi,
   czy motyw ma zapas, czy stoi o setną nad progiem — a to jest cała różnica między
   „sprawdzone" a „bezpieczne przy najbliższej zmianie koloru". */
var worst = null;
PAIRS.forEach(function (p) {
  if (!TOKENS[p[0]] || !TOKENS[p[1]]) return;
  var r = ratio(TOKENS[p[0]], TOKENS[p[1]]);
  if (!worst || r < worst.r) worst = { r: r, name: "--" + p[0] + " na --" + p[1] };
});
console.log("kontrast: " + PAIRS.length + " par z theme.css sprawdzonych wobec WCAG AA " +
            AA + ":1   poniżej progu: " + lowContrast.length +
            (worst ? "   najgorsza: " + worst.name + " = " + worst.r.toFixed(2) + ":1" : ""));
lowContrast.forEach(function (x) { console.log("  ZA NISKI KONTRAST  " + x); });
bad += lowContrast.length;

if (bad) {
  console.log("");
  console.log("Razem " + bad + " pozycji pierwszego przejścia dostępności.");
  console.log("  Kryterium jest JEDNOSTRONNE: wykrywa brak wszystkich źródeł nazwy naraz,");
  console.log("  a nie liczy nazwy dostępnej — patrz nagłówek. Fałszywego alarmu tu nie ma.");
  process.exit(1);
}
console.log("\nOK   pierwsze przejście dostępności bez zastrzeżeń");
process.exit(0);
