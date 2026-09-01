/* Wspólna obsługa testów obu narzędzi. Nie trafia do przeglądarki — tylko Node.
 *
 * Narzędzia są pojedynczymi plikami HTML z jednym blokiem <script> zamkniętym
 * w IIFE. Test wykonuje ten blok w Node na minimalnym stubie DOM i sięga do jego
 * wnętrza przez hak wstrzykiwany tuż przed zamknięciem IIFE. Pliki źródłowe
 * zostają nietknięte — nie ma w nich ani jednej linii istniejącej dla testów.
 *
 * Zero zależności npm. Świadomie nie ma tu jsdom ani Playwrighta: instalacja
 * czegokolwiek z npm jest w tym repozytorium zakazana, a warstwa, która niesie
 * reguły, i tak nie dotyka DOM.
 */

var fs = require("fs");

function stubNode(id) {
  return {
    id: id, value: "", checked: false, innerHTML: "", textContent: "",
    title: "", disabled: false, style: {}, scrollTop: 0, offsetHeight: 400,
    _a: {},
    classList: {
      toggle: function () {}, add: function () {},
      remove: function () {}, contains: function () { return false; }
    },
    setAttribute: function (k, v) { this._a[k] = v; },
    removeAttribute: function (k) { delete this._a[k]; },
    hasAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this._a, k); },
    getAttribute: function (k) { return this._a[k]; },
    /* Zapamiętujemy, CO zostało podpięte. Bez tego test wyzwalaczy sprawdzałby
       tylko, że wywołanie addEventListener nie rzuca — czyli nic. Issue #38 wzięło
       się z brakującego wyzwalacza, więc asercja musi umieć go nie znaleźć. */
    addEventListener: function (ev) { (this._ev || (this._ev = {}))[ev] = true; },
    listensTo: function (ev) { return !!(this._ev && this._ev[ev]); },
    appendChild: function () {},
    removeChild: function () {}, click: function () {}, select: function () {},
    querySelector: function () { return null; }
  };
}

function installDom() {
  var nodes = Object.create(null);
  /* Warstwa i18n dotyka documentElement i selektorów. Stub musi je mieć, inaczej
     samo wczytanie narzędzia rzuca wyjątkiem — a test ma sprawdzać reguły,
     nie przewracać się na szkielecie strony. */
  global.document = {
    getElementById: function (id) { return nodes[id] || (nodes[id] = stubNode(id)); },
    createElement: function () { return stubNode("tmp"); },
    addEventListener: function (ev) { (this._ev || (this._ev = {}))[ev] = true; },
    listensTo: function (ev) { return !!(this._ev && this._ev[ev]); },
    body: stubNode("body"),
    documentElement: stubNode("html"),
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    execCommand: function () { return true; }
  };
  global.window = {
    isSecureContext: false,
    getComputedStyle: function () { return { lineHeight: "21px", fontSize: "13px" }; },
    /* Walidator nasłuchuje pageshow, żeby złapać powrót z bfcache. */
    addEventListener: function (ev) { (this._ev || (this._ev = {}))[ev] = true; },
    listensTo: function (ev) { return !!(this._ev && this._ev[ev]); },
    removeEventListener: function () {}
  };
  global.getComputedStyle = global.window.getComputedStyle;
  global.navigator = {};
  /* Walidator rejestruje setInterval na oznaczanie nieaktualności wyniku. Pod
     Node'em ZAWSZE go zaślepiamy, także gdy prawdziwy istnieje: żywy zegar trzyma
     pętlę zdarzeń i proces nigdy nie kończy się sam. Warunek "jeśli nie ma" tego
     nie łapał — na Node'ie setInterval jest zawsze, więc rejestrował się prawdziwy,
     a harness wisiał do timeoutu i wyglądał na zawieszoną analizę. */
  global.setInterval = function () { return 0; };
  global.clearInterval = function () {};
  global.localStorage = {
    _m: {},
    setItem: function (k, v) { this._m[k] = String(v); },
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null;
    },
    removeItem: function (k) { delete this._m[k]; }
  };
  return nodes;
}

/* Wykonuje blok skryptu i zwraca wskazane wnętrzności IIFE.
 *
 * Wycinek NIE JEST plikiem repozytorium: produkuje go extract_script w
 * tools/run-tests.sh, wycinając blok <script> z generator.html, validator.html albo
 * index.html. Pięciu konsumentów czyta go przez tę funkcję, więc klauzula stoi tutaj —
 * jedno czytanie, jedno miejsce.
 *
 * Wewnątrz runnera extract_script przerywa przebieg, gdy wycinek wyjdzie pusty, więc
 * tam ten plik nie bywa nieobecny. Ochrona kończy się na krawędzi runnera: plik testowy
 * odpalony z ręki — a tak się z nimi pracuje — nie ma jej wcale i dostawał ślad stosu
 * z node:fs, czyli nazwę wnętrza biblioteki zamiast nazwy kroku, który nie wyprodukował
 * pliku.
 *
 * Kod 2, nie 1: 1 znaczy w tym runnerze „zmierzyłem i jest naruszenie", 2 znaczy
 * „nie zmierzyłem". Zlane w jedno, kontrola pominięta czyta się jak wykonana. Ten sam
 * kod niosą check-rendered.js i check-network.js przy braku przeglądarki oraz
 * check-dictionary.js i snapshot.golden.js przy braku raportu o widocznym tekście. */
function loadTool(scriptPath, names) {
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    console.error("FAIL brak wyciętego bloku <script>: " +
                  (scriptPath || "(nie podano ścieżki)"));
    console.error("     Produkuje go extract_script w tools/run-tests.sh z pliku HTML " +
                  "narzędzia.");
    console.error("     Kontrola NIE jest pomijana po cichu: bez wycinka nie ma czego " +
                  "wykonać, a test");
    console.error("     bez przedmiotu wygląda dokładnie tak samo jak test, który " +
                  "przeszedł.");
    process.exit(2);
  }
  var src = fs.readFileSync(scriptPath, "utf8");
  var at = src.lastIndexOf("})();");
  if (at === -1) throw new Error("nie znalazłem zamknięcia IIFE w " + scriptPath);
  var hook = ";globalThis.__tool={" +
    names.map(function (n) { return n + ":" + n; }).join(",") + "};";
  eval(src.slice(0, at) + hook + src.slice(at));
  var api = globalThis.__tool;
  names.forEach(function (n) {
    if (!(n in api)) throw new Error("brak " + n + " w " + scriptPath);
  });
  return api;
}

/* Prosty licznik asercji, wspólny dla wszystkich testów. */
function runner() {
  var fails = 0;
  return {
    ok: function (name, cond, detail) {
      if (cond) { console.log("  ok   " + name); }
      else { console.log("  FAIL " + name + (detail ? "  -> " + detail : "")); fails++; }
    },
    section: function (name) { console.log(name); },
    finish: function () {
      console.log(fails ? "\n" + fails + " testów nie przeszło" : "\nwszystkie testy przeszły");
      process.exit(fails ? 1 : 0);
    },
    failed: function () { return fails; }
  };
}

module.exports = { installDom: installDom, loadTool: loadTool, runner: runner };
