#!/usr/bin/env node
/* Kontrola mierzona NA WYRENDEROWANEJ STRONIE, nie na reprezentacji.
 *
 * Powód istnienia tego pliku: pasek nieaktualności walidatora miał ustawiony
 * atrybut hidden i był widoczny. Reguła .stale{display:flex} unieważniała
 * [hidden]{display:none} z arkusza przeglądarki — autorska klasa bije user-agent.
 * Sonda, która zrzucała DOM i sprawdzała OBECNOŚĆ atrybutu, odpowiadała „ukryty",
 * bo odpowiadała na inne pytanie niż zadane: czy kod ustawił flagę, a nie czy
 * użytkownik to widzi.
 *
 * Trzy kontrole tego samego dnia zawiodły z jednego powodu: mierzyły
 * reprezentację zamiast skutku. Ta mierzy skutek — offsetParent i getComputedStyle
 * w prawdziwym silniku układu graficznego.
 *
 * Zero zależności npm. Chrome w trybie headless z file:// — żadnej sieci,
 * żadnej instalacji, żaden plik źródłowy nie jest modyfikowany (audyt wstrzykuje
 * się do KOPII w katalogu tymczasowym).
 *
 * Użycie:
 *     node tools/check-rendered.js                 # wszystkie narzędzia
 *     CHROME=/path/to/chrome node tools/check-rendered.js
 */

var fs = require("fs");
var os = require("os");
var path = require("path");
var cp = require("child_process");

var root = path.join(__dirname, "..");
var FILES = ["validator.html", "generator.html", "index.html"];

/* Kolejność prób: jawne wskazanie, potem typowe ścieżki Linuksa (CI), potem
   Windows (WSL). Brak przeglądarki ma być JAWNYM błędem, nie cichym pominięciem
   — kontrola, która sama siebie wyłącza, gdy jest niewygodna, nie jest kontrolą. */
var CANDIDATES = [
  process.env.CHROME,
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
  "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  /* to samo widziane od strony Windowsa — w WSL bywa dostępny tylko node.exe */
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
];

function findChrome() {
  for (var i = 0; i < CANDIDATES.length; i++) {
    if (CANDIDATES[i] && fs.existsSync(CANDIDATES[i])) return CANDIDATES[i];
  }
  return null;
}

/* Skrypt audytu działa W PRZEGLĄDARCE i wypisuje wynik do elementu, który
   --dump-dom przyniesie z powrotem. Pyta o to, co widzi człowiek:
   offsetParent === null znaczy, że element nie zajmuje miejsca w układzie. */
var AUDIT = [
  '<script id="__audit_run">',
  'window.addEventListener("load", function () {',
  '  setTimeout(function () {',
  '    var out = { visibleHidden: [], texts: [] };',
  '    var all = document.querySelectorAll("[hidden]");',
  '    for (var i = 0; i < all.length; i++) {',
  '      var e = all[i], cs = getComputedStyle(e);',
  '      var shown = e.offsetParent !== null || cs.position === "fixed";',
  '      if (shown && cs.display !== "none" && cs.visibility !== "hidden") {',
  '        out.visibleHidden.push({',
  '          id: e.id || e.className || e.tagName,',
  '          display: cs.display,',
  '          text: (e.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 60)',
  '        });',
  '      }',
  '    }',
  '    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);',
  '    var n;',
  '    while ((n = walk.nextNode())) {',
  '      var t = (n.nodeValue || "").replace(/\\s+/g, " ").trim();',
  '      if (t.length < 2) continue;',
  '      var p = n.parentElement;',
  '      if (!p || p.tagName === "SCRIPT" || p.tagName === "STYLE") continue;',
  '      if (p.offsetParent === null && getComputedStyle(p).position !== "fixed") continue;',
  '      out.texts.push({ tag: p.tagName, cls: p.className || "", text: t });',
  '    }',
  '    var box = document.createElement("script");',
  '    box.type = "application/json";',
  '    box.id = "__audit_out";',
  '    box.textContent = JSON.stringify(out);',
  '    document.body.appendChild(box);',
  '  }, 400);',
  '});',
  "</" + "script>"
].join("\n");

/* Kopia mierzona przez audyt musi różnić się od pliku w repozytorium WYŁĄCZNIE
   wstrzykniętym blokiem. Czytamy ją z powrotem z dysku, wycinamy blok i porównujemy
   bajtowo ze źródłem. Bez tego "audyt przeszedł" znaczyłoby "przeszedł na czymś, co
   powstało z pliku" — a im więcej wstrzykujemy (kolektor, potem scenariusze:
   kliknięcia, podstawienia, zmiany wyboru), tym bliżej do zielonego wyniku
   dotyczącego czegoś, czego nikt nie wdroży.

   Gwarancja jest konstrukcyjna, nie dyscyplinarna: nie da się o niej zapomnieć
   przy dopisywaniu kolejnego kroku scenariusza. */
function writeAudited(target, srcPath, src) {
  fs.writeFileSync(target, src.replace("</body>", AUDIT + "\n</body>"));
  var back = fs.readFileSync(target, "utf8");
  var stripped = Buffer.from(back.replace(AUDIT + "\n", ""), "utf8");
  if (Buffer.compare(stripped, fs.readFileSync(srcPath)) !== 0) {
    throw new Error("kopia różni się od źródła nie tylko wstrzykniętym blokiem — " +
                    "audyt mierzyłby plik, którego nikt nie wdroży");
  }
}

function render(chrome, file) {
  var srcPath = path.join(root, file);
  var src = fs.readFileSync(srcPath, "utf8");
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kolla-render-"));
  var tmp = path.join(tmpDir, file);
  writeAudited(tmp, srcPath, src);

  /* Chrome pod Windowsem nie zobaczy ścieżki /tmp/... z WSL-a — w tym układzie
     kopia musi powstać w drzewie repozytorium, które widzą obie strony. */
  var winChrome = /\.exe$/i.test(chrome);
  if (winChrome) {
    tmp = path.join(root, ".render-audit.tmp.html");
    writeAudited(tmp, srcPath, src);
  }

  var url = "file:///" + tmp.replace(/\\/g, "/").replace(/^\//, "");

  var dom = cp.execSync(
    JSON.stringify(chrome) + " --headless --disable-gpu --no-sandbox --dump-dom" +
    " --virtual-time-budget=4000 " + JSON.stringify(url),
    { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).toString();

  try { fs.unlinkSync(tmp); } catch (e) { /* sprzątanie nie jest wynikiem testu */ }
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* jw. */ }

  var m = dom.match(/<script type="application\/json" id="__audit_out">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("strona nie wypisała wyniku audytu — czy JS się wykonał?");
  return JSON.parse(m[1]);
}

var chrome = findChrome();
if (!chrome) {
  console.error("FAIL brak przeglądarki do renderowania. Ustaw CHROME=/ścieżka/do/chrome.");
  console.error("     Kontrola widoczności NIE jest pomijana po cichu: bez przeglądarki");
  console.error("     nie da się odpowiedzieć na pytanie, które ona zadaje.");
  process.exit(2);
}
console.log("przeglądarka: " + chrome);

var bad = 0;
FILES.forEach(function (file) {
  var res;
  try {
    res = render(chrome, file);
  } catch (e) {
    console.log("FAIL " + file + ": " + e.message);
    bad = 1;
    return;
  }

  if (res.visibleHidden.length) {
    console.log("FAIL " + file + ": element z atrybutem hidden JEST WIDOCZNY, " +
                res.visibleHidden.length + " razy:");
    res.visibleHidden.forEach(function (h) {
      console.log("  #" + h.id + "  display:" + h.display + "  \"" + h.text + "\"");
    });
    bad = 1;
  } else {
    console.log("OK   " + file + " — każdy element z hidden jest niewidoczny " +
                "(" + res.texts.length + " widocznych fragmentów tekstu)");
  }
});

process.exit(bad);
