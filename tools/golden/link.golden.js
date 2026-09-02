/* Golden stanu w adresie (#15) — dwa zdania o jednej parze funkcji.
 *
 *   1. TWARDA ASERCJA, bez pliku wzorcowego: stan -> fragment -> stan musi odtworzyć
 *      stan CO DO BAJTU, dla każdego pola z osobna i dla wszystkich naraz. To jest
 *      definicja round-tripu, nie jego przybliżenie. Link, który po powrocie opisuje
 *      inną konfigurację niż ta, z której powstał, jest gorszy od braku linku: wygląda
 *      dokładnie tak samo jak działający.
 *
 *   2. WZORZEC: dokładna postać fragmentu, bajt w bajt. Zapis jest częścią kontraktu —
 *      link zapisany dziś ma dać się odczytać jutro, a golden jest jedynym miejscem,
 *      w którym zmiana tego zapisu przestaje być niezauważalna. Kolejność par idzie za
 *      kolejnością pól w TEXT_FIELDS i BOOL_FIELDS, więc jest deterministyczna.
 *
 * ODMOWY SĄ TU RAZEM Z ROUND-TRIPEM, i to nie z oszczędności. Ten sam plik, który mówi,
 * co jest przyjmowane, mówi też, co jest odrzucane — inaczej pierwsza lista rośnie,
 * a druga zostaje w tyle, bo nikt nie czyta dwóch plików naraz. Każda odmowa jest
 * sprawdzana na TREŚCI powodu, a nie tylko na tym, że coś odmówiło: „odrzucone" bez
 * powodu jest komunikatem, z którego nie da się nic zrobić.
 *
 * NIGDY CZĘŚCIOWO. Osobna asercja pilnuje, że fragment z jednym złym polem nie
 * przepuszcza pozostałych — bo to jest ta awaria, której nie widać: konfiguracja,
 * której nikt nie ustawił, wyglądająca jak przyjęta w całości.
 *
 * Aktualizacja po zamierzonej zmianie: bash tools/run-tests.sh --update
 */

var fs = require("fs");
var path = require("path");
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2],
  ["stateToFragment", "stateFromFragment", "DEFAULTS", "TEXT_FIELDS", "BOOL_FIELDS",
   "sanitize"]);

var dir = path.join(__dirname, "link");
var update = process.argv.indexOf("--update") !== -1;
var R = lib.runner();

function base(over) {
  var s = {};
  Object.keys(T.DEFAULTS).forEach(function (k) { s[k] = T.DEFAULTS[k]; });
  Object.keys(over || {}).forEach(function (k) { s[k] = over[k]; });
  return s;
}

/* Stan, w którym KAŻDE pole odbiega od domyślnego — inaczej round-trip przechodziłby
   dla pola, którego kodek nigdy nie dotknął, bo wartość i tak była domyślna. */
var PELNY = base({
  distro: "ubuntu", release: "2024.2", vip: "10.0.0.250",
  net_if: "eno1", ext_if: "eno2", br_name: "br-ext", api_if: "eno3",
  stg_if: "eno4", mig_if: "eno5", ext_vip: "192.0.2.10", ext_vip_if: "eno6",
  int_fqdn: "internal.example.org", ext_fqdn: "external.example.org",
  ml2: "openvswitch", storage: "ceph", amp_net: "vlan", physnet: "physnet2"
});
T.BOOL_FIELDS.forEach(function (id) { PELNY[id] = !T.DEFAULTS[id]; });

function equalState(a, b) {
  var keys = T.TEXT_FIELDS.concat(T.BOOL_FIELDS);
  for (var i = 0; i < keys.length; i++) {
    if (a[keys[i]] !== b[keys[i]]) return keys[i];
  }
  return null;
}

console.log("round-trip:");
var pusty = T.stateToFragment(T.DEFAULTS);
R.ok("stan domyślny daje sam znacznik wersji", pusty === "v=1", pusty);
R.ok("i wraca jako stan domyślny",
     equalState(T.stateFromFragment(pusty).state, T.DEFAULTS) === null,
     equalState(T.stateFromFragment(pusty).state, T.DEFAULTS));

var frag = T.stateToFragment(PELNY);
var back = T.stateFromFragment(frag);
R.ok("stan z każdym polem zmienionym wraca bez różnicy", back.error === null &&
     equalState(back.state, T.sanitize(PELNY)) === null,
     back.error || equalState(back.state, T.sanitize(PELNY)));

/* Pole po polu: awaria jednego kodowania ginie w porównaniu całości, bo wystarczy,
   że reszta się zgadza, żeby diff wyglądał na drobiazg. */
T.TEXT_FIELDS.concat(T.BOOL_FIELDS).forEach(function (id) {
  var one = base();
  one[id] = PELNY[id];
  var r = T.stateFromFragment(T.stateToFragment(one));
  R.ok("round-trip pola " + id, r.error === null && equalState(r.state, T.sanitize(one)) === null,
       r.error || equalState(r.state, T.sanitize(one)));
});

R.ok("pusty fragment nie jest błędem — to wejście bez linku",
     T.stateFromFragment("").error === null && T.stateFromFragment("").state === null);
R.ok("wiodący # jest zdejmowany",
     T.stateFromFragment("#" + frag).error === null);

console.log("");
console.log("odmowy:");
var ODMOWY = [
  ["v=2&vip=10.0.0.1",                    "version",   "inna wersja zapisu"],
  ["vip=10.0.0.1",                        "version",   "brak znacznika wersji"],
  ["v=1&vip",                             "syntax",    "para bez znaku równości"],
  ["v=1&VIP=10.0.0.1",                    "syntax",    "klucz wielkimi literami"],
  ["v=1&nie_ma_takiego=1",                "unknown",   "pole spoza formularza"],
  ["v=1&vip=10.0.0.1&vip=10.0.0.2",       "duplicate", "to samo pole dwa razy"],
  ["v=1&distro=nieistniejaca",            "value",     "dystrybucja spoza listy"],
  ["v=1&ml2=cokolwiek",                   "value",     "wartość spoza listy wyboru"],
  ["v=1&vip=to nie jest adres",           "value",     "wartość niezgodna z wyrażeniem pola"],
  ["v=1&t_cinder=tak",                    "value",     "wartość logiczna inna niż 0 albo 1"],
  ["v=1&t_cinder=",                       "value",     "wartość logiczna pusta"],
  ["v=1&vip=" + new Array(80).join("a"),  "value",     "wartość dłuższa niż 64 znaki"],
  ["v=1&vip=%E0%A4%A",                    "syntax",    "niepoprawne kodowanie procentowe"],
  ["v=1&" + new Array(2100).join("a"),    "tooLong",   "fragment dłuższy niż próg"]
];
ODMOWY.forEach(function (c) {
  var r = T.stateFromFragment(c[0]);
  R.ok(c[2] + " -> " + c[1], r.error === c[1], String(r.error));
  R.ok("  i nie niesie stanu", !r.state, JSON.stringify(r.state && Object.keys(r.state).length));
});

/* NIGDY CZĘŚCIOWO. Osiem poprawnych pól i jedno złe: całość odpada. */
var czesciowy = "v=1&vip=10.0.0.250&net_if=eno1&ml2=openvswitch&storage=cokolwiek&t_heat=1";
var cz = T.stateFromFragment(czesciowy);
R.ok("fragment z jednym złym polem odpada w CAŁOŚCI", cz.error === "value", String(cz.error));
R.ok("i nie zostawia po sobie żadnego z poprawnych pól", !cz.state);

console.log("");
console.log("wzorzec zapisu:");
var golden = path.join(dir, "pelny.txt");
if (update) {
  fs.writeFileSync(golden, frag + "\n");
  console.log("  zaktualizowano " + path.basename(golden));
} else if (!fs.existsSync(golden)) {
  console.log("  FAIL brak wzorca " + golden + " — uruchom z --update");
  process.exit(1);
} else {
  var oczek = fs.readFileSync(golden, "utf8").replace(/\n$/, "");
  R.ok("fragment stanu pełnego zgadza się co do bajtu z wzorcem", oczek === frag,
       oczek === frag ? "" : "wzorzec: " + oczek + "\n       teraz:   " + frag);
}

R.finish();
