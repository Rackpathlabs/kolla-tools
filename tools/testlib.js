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
    addEventListener: function () {}, appendChild: function () {},
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
    addEventListener: function () {},
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
    addEventListener: function () {},
    removeEventListener: function () {}
  };
  global.getComputedStyle = global.window.getComputedStyle;
  global.navigator = {};
  /* run() planuje odświeżanie oznaczenia nieaktualności — stub musi mieć zegary. */
  if (!global.setInterval) global.setInterval = function () { return 0; };
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

/* Wykonuje blok skryptu i zwraca wskazane wnętrzności IIFE. */
function loadTool(scriptPath, names) {
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
