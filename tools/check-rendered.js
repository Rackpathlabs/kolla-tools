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
var AUDIT_OUT = (process.argv[2] === "--texts") ? process.argv[3] : null;
/* Wylacza zwolnienia, zeby test mogl udowodnic, ze scenariusz z mayNotChangeInterface
   BEZ tego zwolnienia upada. Dowodzilismy dotad upadku kontroli, ani razu upadku
   WYJATKU — a zwolnienie, ktorego nikt nie widzial jako potrzebnego, jest tym samym
   co kontrola, ktorej nikt nie widzial jako upadajacej. */
var NO_EXEMPTIONS = process.argv.indexOf("--no-exemptions") !== -1;
/* Scenariusze: JEDEN RENDER TO JEDNA ŚCIEŻKA. Zmierzone w przeglądarce, nie
   założone — stan początkowy walidatora daje 36 napisów, przykład z błędami 173,
   przykład poprawny 90 przy zupełnie innej warstwie tekstu (werdykt bez zastrzeżeń).

   Scenariusz trybu aktualizacji MUSI mieć własne inventory z czymś, co upstream
   przemianował albo usunął. Na wbudowanym przykładzie ścieżka 2024.1 -> 2026.1 daje
   ZERO findingów upgrade — poprawnie, bo tryb pokazuje tylko to, co dotyczy plików
   użytkownika, a przykład nie zawiera ani jednej deprecjonowanej rzeczy. Bez własnego
   inventory upgradeRules nie mogłoby ani przejść, ani nie przejść: to trzeci wariant
   pustego zielonego, ten sam, który opisuje docs/PRINCIPLES.md. */
/* Podstawienie wartości z wywołaniem zdarzenia — programowe przypisanie .value
   nie zapala żadnego nasłuchu, więc bez dispatchEvent scenariusz byłby pusty. */
function set(id, v) {
  return 'var e = document.getElementById("' + id + '");' +
         'if (!e) throw new Error("brak elementu #' + id + '");' +
         'e.value = ' + JSON.stringify(v) + ';' +
         'e.dispatchEvent(new Event("input", { bubbles: true }));' +
         'e.dispatchEvent(new Event("change", { bubbles: true }));';
}
function check(id, on) {
  return 'var e = document.getElementById("' + id + '");' +
         'if (!e) throw new Error("brak elementu #' + id + '");' +
         'e.checked = ' + (on ? "true" : "false") + ';' +
         'e.dispatchEvent(new Event("change", { bubbles: true }));';
}

var DEPRECATED_INV = [
  "[control]", "ctrl01 ansible_host=10.10.0.11", "",
  "[network]", "ctrl01", "",
  "[compute]", "cmp01 ansible_host=10.10.0.21", "",
  "[storage]", "str01 ansible_host=10.10.0.31", "",
  "[monitoring]", "ctrl01", "",
  "[kolla-toolbox]", "ctrl01", "",
  "[zun]", "ctrl01", ""
].join("\\n");

var FILES = [
  { file: "validator.html", name: "stan początkowy", steps: "" },
  { file: "validator.html", name: "przykład z błędami",
    steps: 'document.getElementById("btn-sample-bad").click();' },
  { file: "validator.html", name: "przykład poprawny",
    steps: 'document.getElementById("btn-sample-ok").click();' },
  { file: "validator.html", name: "tryb aktualizacji na własnym inventory",
    steps: 'document.getElementById("src").value = "' + DEPRECATED_INV + '";' +
           'document.getElementById("release").value = "2024.1";' +
           'document.getElementById("release_to").value = "2026.1";' +
           'document.getElementById("release").dispatchEvent(new Event("change"));' },
  { file: "validator.html", name: "reguły dwuplikowe (globals + inventory)",
    steps: 'document.getElementById("btn-sample-bad").click();' +
           'var g = document.getElementById("gsrc");' +
           'g.value = "---\\nenable_masakari: \\"yes\\"\\nenable_hacluster: \\"yes\\"\\n";' +
           'g.dispatchEvent(new Event("input"));' },
  { file: "generator.html", name: "stan początkowy", steps: "" },

  /* Scenariusze generatora celują w DIAGNOSTYKĘ, nie w przełączniki. Przełącznik
     zmienia wartość w emitowanym pliku — a plik żyje w <code>/<span>, czyli
     w kategorii wyjątku „dane, nie interfejs". Zmierzone: włączenie t_barbican
     zmienia podgląd o JEDEN znak ("no" -> "yes") i ani jednego napisu interfejsu.
     Diagnostyka natomiast produkuje tekst interfejsu, więc obrona przed pustym
     scenariuszem ma na czym działać. */
  { file: "generator.html", name: "KV-10: interfejs zewnętrzny na urządzeniu zarządzania",
    steps: set("net_if", "bond0.10") + set("ext_if", "bond0") },
  { file: "generator.html", name: "KV-06: Masakari bez interfejsu migracji",
    steps: check("t_masakari", true) + check("t_hacluster", true) + set("mig_if", "") },
  { file: "generator.html", name: "KV-05: magazyn i API na jednym bondzie, ze ścieżką potwierdzenia",
    steps: check("t_hacluster", true) + set("api_if", "bond0.10") + set("stg_if", "bond0.20") +
           check("ack_link", true) },
  { file: "generator.html", name: "KV-13: amfory na VLAN-ie z obcym physnetem",
    steps: check("t_octavia", true) + check("t_barbican", true) +
           set("amp_net", "vlan") + set("physnet", "physnet9") + set("ext_if", "bond0") },
  { file: "generator.html", name: "KV-14: TLS bez CA i równe FQDN",
    steps: check("t_tls_int", true) + check("t_copy_ca", false) +
           set("int_fqdn", "cloud.example.net") + set("ext_fqdn", "cloud.example.net") },
  /* Scenariusza "puste pole wymagane" tu nie ma, bo VIP jest pusty od startu:
     komunikat o polu wymaganym i werdykt niekompletnej konfiguracji stoją już
     w stanie początkowym. Osobny scenariusz czyszczący puste pole nie zmieniał
     niczego i obrona przed pustym scenariuszem słusznie go zgłosiła. */

  /* Wyjęty spod obrony przed pustym scenariuszem, z powodem: ten scenariusz zmienia
     WYŁĄCZNIE emitowany plik, który jest kategorią wyjątku. Brak zmiany w korpusie
     interfejsu jest tu oczekiwany, nie objawem. Bez tego wyjątku obrona zaczęłaby
     produkować fałszywe czerwone, a ktoś osłabiłby ją zamiast poprawić scenariusz. */
  { file: "generator.html", name: "pojedynczy przełącznik (zmienia tylko emitowany plik)",
    mayNotChangeInterface: true,
    steps: check("t_barbican", true) },

  { file: "index.html", name: "stan początkowy", steps: "" }
];

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
  '    try { /*__STEPS__*/ } catch (e) { document.title = "SCENARIUSZ PADŁ: " + e.message; }',
  '    var out = { visibleHidden: [], texts: [] };',
  /* Wejscie czytamy PO wykonaniu scenariusza, prosto z pol — dzieki temu dziala
     takze dla scenariuszy klikajacych wbudowane przyklady, ktorych tresci
     uruchamiajacy nie zna. */
  '    var INPUT_TOKENS = {};',
  '    ["src", "gsrc"].forEach(function (id) {',
  '      var e = document.getElementById(id);',
  '      if (!e || !e.value) return;',
  '      e.value.split(/\\s+/).forEach(function (w) {',
  '        if (!w) return;',
  '        INPUT_TOKENS[w] = 1;',
  '        INPUT_TOKENS[w.replace(/^\\[|\\]$/g, "")] = 1;',
  '        var eq = w.indexOf("=");',
  '        if (eq > 0) { INPUT_TOKENS[w.slice(0, eq)] = 1; INPUT_TOKENS[w.slice(eq + 1)] = 1; }',
  '      });',
  '    });',
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
  /* Jednostką jest TEKST ELEMENTU, nie pojedynczy węzeł: wpis słownika rozpada się
     w DOM na ułamki ("Group ", "[", "]", " has "), które osobno nie znaczą nic,
     a sklejone wracają do postaci porównywalnej ze słownikiem. */
  '    var els = document.body.querySelectorAll("*");',
  '    for (var k = 0; k < els.length; k++) {',
  '      var p = els[k];',
  '      if (p.tagName === "SCRIPT" || p.tagName === "STYLE") continue;',
  '      if (p.offsetParent === null && getComputedStyle(p).position !== "fixed") continue;',
  '      var own = "";',
  '      for (var c = 0; c < p.childNodes.length; c++) {',
  '        if (p.childNodes[c].nodeType === 3) own += p.childNodes[c].nodeValue;',
  '      }',
  '      own = own.replace(/\\s+/g, " ").trim();',
  '      if (own.length < 2) continue;',
  /* Czy element leży w obszarze DANYCH: podgląd wyrenderowanego pliku albo edytor
     wejścia. To przodek rozstrzyga, nie znacznik — <span class="s"> w podglądzie to
     dane, <span class="sev"> na liście findingów to interfejs. */
  '      var inData = !!p.closest("#out, #src, #gsrc, .editor, .yaml");',
  /* POCHODZENIE, nie polozenie. Napis jest danymi, jesli KAZDY jego token wystepuje
     doslownie w tym, co scenariusz wprowadzil do pol wejsciowych. Kryterium obejmuje
     kazde miejsce, w ktorym tresc uzytkownika wychodzi na ekran — takze widoki,
     ktorych jeszcze nie ma. Lista kontenerow starzala sie przy kazdym nowym widoku
     i zestarzala sie dwa razy. Dopasowanie po CALYCH tokenach, nie po podciagu:
     inaczej "control" z [control] zwolniloby kazdy napis zawierajacy to slowo. */
  '      var fromInput = own.split(/\\s+/).length > 0 && own.split(/\\s+/).every(function (w) {',
  '        return w.length === 0 || INPUT_TOKENS[w];',
  '      });',
  '      out.texts.push({ tag: p.tagName, cls: p.className || "", text: own, inData: inData, fromInput: fromInput });',
  '    }',
  /* Tekst, ktory nie jest wezlem tekstowym, a dociera do uzytkownika: placeholder
     widac w pustym polu, a aria-label i title sa CZYTANE NA GLOS — dla czesci
     uzytkownikow to caly interfejs. Kolektor chodzil po wezlach tekstowych, wiec
     nie widzial ich wcale: ta sama klasa co osiemnascie toastow, tylko druga droga. */
  '    var ATTRS = ["placeholder", "title", "aria-label", "aria-description", "alt"];',
  '    var withAttr = document.body.querySelectorAll("[" + ATTRS.join("],[") + "]");',
  '    for (var q = 0; q < withAttr.length; q++) {',
  '      var w = withAttr[q];',
  '      if (w.offsetParent === null && getComputedStyle(w).position !== "fixed") continue;',
  '      for (var r = 0; r < ATTRS.length; r++) {',
  '        var v = w.getAttribute(ATTRS[r]);',
  '        if (!v || v.trim().length < 2) continue;',
  '        out.texts.push({ tag: ATTRS[r].toUpperCase(), cls: w.id || w.className || "",',
  '                         text: v.replace(/\\s+/g, " ").trim(), inData: false, fromInput: false });',
  '      }',
  '    }',
  '    var box = document.createElement("script");',
  '    box.type = "application/json";',
  '    box.id = "__audit_out";',
  '    box.textContent = JSON.stringify(out);',
  '    document.body.appendChild(box);',
  '  }, 700);',
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
function writeAudited(target, srcPath, src, steps) {
  var block = AUDIT.replace("/*__STEPS__*/", steps || "");
  fs.writeFileSync(target, src.replace("</body>", block + "\n</body>"));
  var back = fs.readFileSync(target, "utf8");
  var stripped = Buffer.from(back.replace(block + "\n", ""), "utf8");
  if (Buffer.compare(stripped, fs.readFileSync(srcPath)) !== 0) {
    throw new Error("kopia różni się od źródła nie tylko wstrzykniętym blokiem — " +
                    "audyt mierzyłby plik, którego nikt nie wdroży");
  }
}

/* Sprzątanie w finally, nie na końcu szczęśliwej ścieżki. Audyt, który rzuci
   wyjątkiem w połowie scenariusza — albo zostanie przerwany — zostawiał kopię
   i proces przeglądarki. Po kilku takich przerwaniach w jednej sesji uzbierało
   się kilkadziesiąt osieroconych procesów i pomiar, który wcześniej trwał
   półtorej minuty, przestał się kończyć.

   To ta sama klasa co setInterval trzymający pętlę zdarzeń Node'a: sprzątanie,
   które wykonuje się wyłącznie wtedy, gdy nic złego się nie stało. */
function cleanup(tmp, tmpDir) {
  try { if (tmp) fs.unlinkSync(tmp); } catch (e) { /* nie jest wynikiem testu */ }
  try { if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* jw. */ }
}

function render(chrome, file, steps) {
  var srcPath = path.join(root, file);
  var src = fs.readFileSync(srcPath, "utf8");
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kolla-render-"));
  var tmp = path.join(tmpDir, file);
  writeAudited(tmp, srcPath, src, steps);

  /* Chrome pod Windowsem nie zobaczy ścieżki /tmp/... z WSL-a — w tym układzie
     kopia musi powstać w drzewie repozytorium, które widzą obie strony. */
  var winChrome = /\.exe$/i.test(chrome);
  if (winChrome) {
    tmp = path.join(root, ".render-audit.tmp.html");
    writeAudited(tmp, srcPath, src, steps);
  }

  var url = "file:///" + tmp.replace(/\\/g, "/").replace(/^\//, "");

  var dom;
  try {
    dom = cp.execSync(
    JSON.stringify(chrome) + " --headless --disable-gpu --no-sandbox --dump-dom" +
    " --virtual-time-budget=4000 " + JSON.stringify(url),
      { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).toString();
  } finally {
    cleanup(tmp, tmpDir);
  }

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

/* Scenariusz, po którym korpus jest IDENTYCZNY jak w stanie początkowym, niczego
   nie uruchomił — a wtedy wszystko, co miał pokazać, nie może ani przejść, ani nie
   przejść. To trzeci wariant pustego zielonego z docs/PRINCIPLES.md, tym razem
   we własnym oprzyrządowaniu. Nie da się go wykryć psuciem, więc sprawdzamy wprost:
   czy scenariusz w ogóle zmienił to, co widać. */
var baseline = {};

var bad = 0;
FILES.forEach(function (sc) {
  var file = sc.file + " [" + sc.name + "]";
  var res;
  try {
    res = render(chrome, sc.file, sc.steps);
  } catch (e) {
    console.log("FAIL " + file + ": " + e.message);
    bad = 1;
    return;
  }

  /* Ścieżka argumentem, nie zmienną środowiskową: proces Windows uruchomiony
     z WSL nie dziedziczy zmiennych bez WSLENV, więc raport cicho by nie powstał —
     a pusty raport wygląda dokładnie jak "wszystko pokryte". */
  /* Odcisk WYLACZNIE z czesci interfejsowej. Wczesniej obejmowal caly zebrany
     tekst, wiec i podglad emitowanego pliku — przelaczenie uslugi ruszalo odcisk,
     choc interfejs stal w miejscu, a komunikat mowil o "niczym widocznym".
     Nazwa mechanizmu obiecywala wezej, niz kod robil, i przez to zwolnienie
     mayNotChangeInterface nie zapalalo sie ANI RAZU: martwy wyjatek z uzasadnieniem,
     grozniejszy od martwej kategorii bez niego, bo uzasadnienie jest wlasnie tym,
     co powstrzymuje przed sprawdzeniem. */
  var fingerprint = res.texts.filter(function (t) { return !t.inData; })
                            .map(function (t) { return t.tag + "|" + t.text; })
                            .join("\u0000");
  if (!sc.steps) {
    baseline[sc.file] = fingerprint;
  } else if (baseline[sc.file] === fingerprint &&
             !(sc.mayNotChangeInterface && !NO_EXEMPTIONS)) {
    console.log("FAIL " + file + ": scenariusz nie zmienił NICZEGO widocznego —" +
                " nie ma czego mierzyć, więc zielone nic nie znaczy");
    bad = 1;
  }

  if (AUDIT_OUT) {
    var acc = [];
    try { acc = JSON.parse(fs.readFileSync(AUDIT_OUT, "utf8")); } catch (e) { acc = []; }
    fs.writeFileSync(AUDIT_OUT, JSON.stringify(acc.concat(res.texts)));
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
