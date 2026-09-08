#!/usr/bin/env node
/* Rejestr wartości domyślnych upstreamu kontra klucze, które generator emituje (ADR-005).
 *
 * CZTERY KRYTERIA: liczność obu wyciągów przed użyciem; każdy emitowany klucz ma wpis;
 * każdy wpis jest emitowany; każdy wpis scalar/derived/map ma źródło dla każdego wydania
 * oznaczonego jako catalogued.
 *
 * KLUCZE EMITOWANE LICZYMY, GENERUJĄC PLIKI, a nie regexpem po `L.push("klucz: `.
 * Regexp już się pomylił: nie widział `L.push("octavia_amp_network:")` (klucz bez wartości
 * w tej samej linii) ani `L.push('octavia_network_type: ' + …)` (apostrofy), i podał 29
 * zamiast 31. Emisja jest kodem z warunkami, więc jedyną uczciwą odpowiedzią na pytanie
 * „co ten generator wypisuje" jest uruchomienie go na stanach pokrywających gałęzie.
 * Dlatego strażnik dostaje WYCINEK <script> argumentem, tak jak testy dymne.
 *
 * KIND "absent" NIE ISTNIEJE. Wpis mówiący „nie wiem, gdzie upstream to definiuje" byłby
 * niewiedzą zapisaną jako dane — a właśnie taka niewiedza kosztowała cztery nazwy kluczy
 * (#182, #184, #185). Klucz bez źródła nie ma prawa być emitowany; jego obecność tutaj
 * z kind "absent" jest błędem, nie stanem.
 *
 * Użycie:
 *   node tools/check-defaults.js .gen.test.tmp.js
 *   node tools/check-defaults.js <skrypt> --root tools/fixtures/defaults/X --expect-keys N --expect-entries N
 */

var fs = require("fs");
var path = require("path");
var lib = require("./testlib");

function arg(name, dflt) {
  var i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : dflt;
}
var repo = path.join(__dirname, "..");
var rootArg = arg("--root", null);
var root = rootArg ? path.join(repo, rootArg) : repo;
var EXPECT_KEYS = parseInt(arg("--expect-keys", "31"), 10);
var EXPECT_ENTRIES = parseInt(arg("--expect-entries", "31"), 10);
var script = process.argv[2] && process.argv[2].charAt(0) !== "-" ? process.argv[2] : null;

var rc = 0;
function fail(msg) { console.log("FAIL " + msg); rc = 1; }

/* --- 1. klucze emitowane: URUCHAMIAMY generator --- */
var emitted = [];
if (rootArg) {
  /* Fixtura podaje listę wprost — nie ma w niej narzędzia do uruchomienia, a przedmiotem
     testu jest kryterium, nie emisja. Plik nazywa się emitted.txt i jest jawny. */
  var ef = path.join(root, "emitted.txt");
  if (!fs.existsSync(ef)) fail("fixtura bez emitted.txt: " + rootArg);
  else emitted = fs.readFileSync(ef, "utf8").split("\n").map(function (l) { return l.trim(); })
                   .filter(function (l) { return l && l.charAt(0) !== "#"; });
} else if (!script) {
  fail("brak wycinka <script> generatora — produkuje go extract_script w tools/run-tests.sh; " +
       "bez niego nie da się policzyć emitowanych kluczy, a pusty wynik wygląda jak zgodność");
} else {
  lib.installDom();
  var T = lib.loadTool(script, ["buildYaml", "validate", "badFields", "DEFAULTS"]);
  var seen = Object.create(null);
  /* Stany pokrywające gałęzie emisji. Każdy nowy warunek w buildYaml wymaga tu stanu —
     inaczej klucz, który wychodzi tylko na tej gałęzi, jest dla strażnika niewidzialny. */
  var STATES = [
    {},
    { t_octavia: true, t_barbican: true, amp_net: "vlan", physnet: "physnet1", t_provider: true },
    { t_octavia: true, t_barbican: true, amp_net: "tenant" },
    { api_if: "eth1", stg_if: "eth2", mig_if: "eth3", ext_vip: "198.51.100.10",
      ext_vip_if: "eth4", int_fqdn: "i.example", ext_fqdn: "e.example",
      t_tls_int: true, t_copy_ca: true, t_letsencrypt: true, br_name: "br-ex",
      t_hacluster: true, t_masakari: true, release: "2025.1" }
  ];
  STATES.forEach(function (over) {
    var s = {};
    Object.keys(T.DEFAULTS).forEach(function (k) { s[k] = T.DEFAULTS[k]; });
    s.vip = "192.0.2.10";   /* RFC 5737, jak w nowych plikach (CONTRIBUTING.md) */
    Object.keys(over).forEach(function (k) { s[k] = over[k]; });
    T.buildYaml(s, T.badFields(T.validate(s, null))).text.split("\n").forEach(function (line) {
      var m = /^([a-z_0-9]+):/.exec(line);
      if (m) seen[m[1]] = 1;
    });
  });
  emitted = Object.keys(seen).sort();
}

/* --- 2. wpisy rejestru: czytamy TEKST defaults.js --- */
var dfPath = path.join(root, "defaults.js");
var entries = [], kinds = Object.create(null), sources = Object.create(null);
if (!fs.existsSync(dfPath)) {
  fail("brak defaults.js w " + (rootArg || "korzeniu repo"));
} else {
  var src = fs.readFileSync(dfPath, "utf8");
  var keysBlock = /keys:\s*\{([\s\S]*)\n\s*\}\s*;?\s*$/.exec(src);
  if (!keysBlock) fail("defaults.js: nie znalazłem sekcji keys");
  else {
    /* Ciało wpisu tniemy DO POCZĄTKU NASTĘPNEGO, nie oknem o stałej długości. Okno
       wchodziłoby na sąsiada i brak pola w jednym wpisie byłby maskowany przez to samo
       pole w następnym — strażnik świeciłby na zielono nad luką, którą ma znaleźć. */
    var re = /"([a-z_0-9]+)":\s*\{\s*kind:\s*"([a-z]+)"/g, m, starts = [];
    while ((m = re.exec(keysBlock[1])) !== null) {
      entries.push(m[1]); kinds[m[1]] = m[2];
      starts.push([m[1], m.index]);
    }
    starts.forEach(function (cur, i) {
      var end = i + 1 < starts.length ? starts[i + 1][1] : keysBlock[1].length;
      sources[cur[0]] = keysBlock[1].slice(cur[1], end);
    });
  }
}

/* --- 3. liczność PRZED użyciem list --- */
if (emitted.length !== EXPECT_KEYS)
  fail("kluczy emitowanych " + emitted.length + ", oczekiwano " + EXPECT_KEYS);
if (entries.length !== EXPECT_ENTRIES)
  fail("wpisów w defaults.js " + entries.length + ", oczekiwano " + EXPECT_ENTRIES);

var have = Object.create(null);
entries.forEach(function (k) { have[k] = 1; });

emitted.forEach(function (k) {
  if (!have[k]) fail("klucz " + k + " jest emitowany, a nie ma wpisu w defaults.js");
});
var em = Object.create(null);
emitted.forEach(function (k) { em[k] = 1; });
entries.forEach(function (k) {
  if (!em[k]) fail("wpis " + k + " w defaults.js nie jest emitowany — martwy wpis");
});

var KINDS = { scalar: 1, derived: 1, map: 1 };
entries.forEach(function (k) {
  if (!KINDS[kinds[k]]) {
    fail("wpis " + k + ": kind \"" + kinds[k] + "\" nie jest jednym z scalar/derived/map" +
         (kinds[k] === "absent" ? " — „absent\" to niewiedza zapisana jako dane" : ""));
    return;
  }
  var body = sources[k] || "";
  ["path", "line"].forEach(function (f) {
    if (body.indexOf(f + ":") === -1)
      fail("wpis " + k + " (" + kinds[k] + ") nie niesie pola " + f);
  });
});

console.log("kluczy emitowanych: " + emitted.length + "   wpisów: " + entries.length +
            "   (scalar " + entries.filter(function (k) { return kinds[k] === "scalar"; }).length +
            ", derived " + entries.filter(function (k) { return kinds[k] === "derived"; }).length +
            ", map " + entries.filter(function (k) { return kinds[k] === "map"; }).length + ")");
console.log(rc === 0 ? "OK   każdy emitowany klucz ma źródłowany wpis."
                     : "Rejestr wartości domyślnych wymaga uwagi.");
process.exit(rc);
