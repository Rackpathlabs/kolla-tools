/* WSPÓLNE dla check-rendered.js i check-network.js: lista scenariuszy oraz znalezienie
 * przeglądarki.
 *
 * Wyciągnięte, a nie skopiowane, bo drugi zestaw scenariuszy byłby drugą odpowiedzią na
 * pytanie „co użytkownik uruchamia" — i te dwie odpowiedzi rozjechałyby się przy pierwszym
 * dopisanym scenariuszu, cicho, bo obie dalej by przechodziły. Jeden zestaw znaczy, że
 * kontrola widoczności i kontrola sieci mówią o tych samych ścieżkach.
 *
 * Scenariusze są tu bez zmian wobec stanu z #67 — migawki w tools/golden/snapshot/ są
 * z nimi powiązane co do bajtu i każda zmiana tej listy rusza tamte wzorce.
 */

var fs = require("fs");

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

/* Inventory z hostem stojącym WYŁĄCZNIE we własnej grupie — jedyny układ, w którym
   zapala się HOST-NO-KOLLA-GROUP. Własne inventory z tego samego powodu, co przy
   trybie aktualizacji: na wbudowanym przykładzie reguła nie ma prawa paść, więc
   scenariusz nie mógłby ani przejść, ani nie przejść. */
var ORPHAN_INV = [
  "[control]", "ctrl01 ansible_host=10.10.0.11", "ctrl02 ansible_host=10.10.0.12",
  "ctrl03 ansible_host=10.10.0.13", "",
  "[network]", "ctrl01", "ctrl02", "ctrl03", "",
  "[compute]", "cmp01 ansible_host=10.10.0.21", "",
  "[storage]", "cmp01", "",
  "[monitoring]", "ctrl01", "",
  "[moja_grupa]", "x1 ansible_host=10.10.0.90", ""
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
  /* Reguła z #10 nie pada w żadnym z pozostałych scenariuszy, więc jej tekst byłby
     poza zasięgiem check-english.js, check-dictionary.js i migawki z #67 — czyli
     finding nieosiągalny w rozumieniu #56, tyle że wprowadzony świadomie razem
     z regułą. Scenariusz wchodzi RAZEM z nią, a nie „kiedyś potem". */
  { file: "validator.html", name: "host poza zasięgiem Kolli",
    steps: 'document.getElementById("src").value = "' + ORPHAN_INV + '";' +
           'document.getElementById("btn-run").click();' },
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

  /* Widok różnic (#9). Tabela zestawienia i jej nagłówki nie renderują się w żadnym
     innym scenariuszu — bez tego wpisu ich tekst byłby poza zasięgiem check-english.js,
     check-dictionary.js i migawki. Scenariusz wchodzi razem z funkcją. */
  { file: "generator.html", name: "widok różnic wobec stanu początkowego",
    steps: set("vip", "10.0.0.250") + set("net_if", "bond0") + check("t_cinder", true) +
           'document.getElementById("view-diff").checked = true;' +
           'document.getElementById("view-diff").dispatchEvent(new Event("change", { bubbles: true }));' },

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

module.exports = { FILES: FILES, findChrome: findChrome };
