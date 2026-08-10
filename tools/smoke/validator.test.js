/* Test dymny walidatora: reguły zależne od wydania. */
var fs = require("fs");

function stub(id) {
  return {
    id: id, value: "", innerHTML: "", textContent: "", disabled: false, style: {}, _a: {},
    scrollTop: 0, offsetHeight: 400,
    classList: { toggle: function () {}, add: function () {}, remove: function () {}, contains: function () { return false; } },
    setAttribute: function (k, v) { this._a[k] = v; },
    removeAttribute: function (k) { delete this._a[k]; },
    hasAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this._a, k); },
    addEventListener: function () {}, appendChild: function () {}, removeChild: function () {},
    click: function () {}, select: function () {}, querySelector: function () { return null; }
  };
}
var nodes = {};
global.document = {
  getElementById: function (id) { return nodes[id] || (nodes[id] = stub(id)); },
  createElement: function () { return stub("tmp"); },
  addEventListener: function () {}, body: stub("body"), execCommand: function () { return true; }
};
global.window = { isSecureContext: false, getComputedStyle: function () { return { lineHeight: "21px", fontSize: "13px" }; } };
global.getComputedStyle = global.window.getComputedStyle;
global.navigator = {};

var src = fs.readFileSync(process.argv[2], "utf8");
var hook = ";globalThis.__t={parse:parse,analyse:analyse,buildReport:buildReport," +
           "renderVerdict:null,KOLLA_MATRIX:KOLLA_MATRIX,findRelease:findRelease," +
           "defaultRelease:defaultRelease};";
var at = src.lastIndexOf("})();");
eval(src.slice(0, at) + hook + src.slice(at));

var T = globalThis.__t;
var fails = 0;
function ok(name, cond, detail) {
  if (cond) console.log("  ok   " + name);
  else { console.log("  FAIL " + name + (detail ? "  -> " + detail : "")); fails++; }
}

var INV = [
  "[control]", "ctl[01:03] ansible_host=10.0.0.1[1:3]", "",
  "[network]", "ctl01", "",
  "[compute]", "cmp01 ansible_host=10.0.0.21", "",
  "[storage]", "cmp01", "",
  "[monitoring]", "ctl01", ""
].join("\n");

function run(extra, release) {
  return T.analyse(T.parse(INV + (extra || "")), release);
}
function find(res, code) {
  return res.findings.filter(function (f) { return f.code === code; });
}
function hasCode(res, code) { return find(res, code).length > 0; }

console.log("domyślne wydanie:");
ok("to najnowsze wspierane", T.defaultRelease() === "2026.1", T.defaultRelease());

console.log("status wydania:");
ok("2026.1 (wspierane) -> brak wpisu", !hasCode(run("", "2026.1"), "WYDANIE"));
var r = run("", "2024.2");
ok("2024.2 -> uwaga o EOL", hasCode(r, "WYDANIE") && /koniec życia/.test(find(r, "WYDANIE")[0].msg));
ok("2024.2 -> waga 'warn'", find(r, "WYDANIE")[0].sev === "warn");
r = run("", "2024.1");
ok("2024.1 -> uwaga o braku utrzymania", /bez utrzymania/.test(find(r, "WYDANIE")[0].msg));

console.log("grupy wycofane i przemianowane:");
r = run("\n[zun]\ncmp01\n", "2026.1");
ok("[zun] w 2026.1 -> GRUPA-WYCOFANA", hasCode(r, "GRUPA-WYCOFANA"));
ok("wskazuje linię deklaracji", find(r, "GRUPA-WYCOFANA")[0].line > 0, String(find(r, "GRUPA-WYCOFANA")[0].line));
ok("waga z macierzy (warn)", find(r, "GRUPA-WYCOFANA")[0].sev === "warn");

r = run("\n[zun]\ncmp01\n", "2025.1");
ok("[zun] w 2025.1 -> bez wpisu", !hasCode(r, "GRUPA-WYCOFANA"));

r = run("\n[kolla-toolbox]\nctl01\n", "2026.1");
ok("[kolla-toolbox] w 2026.1 -> GRUPA-PRZEMIANOWANA", hasCode(r, "GRUPA-PRZEMIANOWANA"));
ok("to błąd, nie uwaga", find(r, "GRUPA-PRZEMIANOWANA")[0].sev === "error");
ok("podaje nową nazwę", /kolla_toolbox/.test(find(r, "GRUPA-PRZEMIANOWANA")[0].msg));

r = run("\n[kolla_toolbox]\nctl01\n", "2026.1");
ok("[kolla_toolbox] (nowa nazwa) -> bez wpisu", !hasCode(r, "GRUPA-PRZEMIANOWANA"));
ok("[kolla_toolbox] nie jest brany za literówkę", !hasCode(r, "NIEZNANA-GRUPA"),
   JSON.stringify(find(r, "NIEZNANA-GRUPA").map(function (f) { return f.msg; })));

r = run("\n[swift]\nctl01\n", "2025.1");
ok("[swift] w 2025.1 -> GRUPA-WYCOFANA", hasCode(r, "GRUPA-WYCOFANA"));
r = run("\n[swift]\nctl01\n", "2024.2");
ok("[swift] w 2024.2 -> bez wpisu", !hasCode(r, "GRUPA-WYCOFANA"));

r = run("\n[cinder-volume]\ncmp01\n", "2026.1");
ok("[cinder-volume] w 2026.1 -> info o zmianie grupy nadrzędnej",
   find(r, "GRUPA-WYCOFANA").some(function (f) { return f.sev === "info" && /cinder-volume/.test(f.msg); }));

console.log("odporność:");
r = run("", "2019.1");
ok("wydanie spoza macierzy -> brak reguł, brak wyjątku", !hasCode(r, "WYDANIE"));
r = run("", "");
ok("puste wydanie -> brak wyjątku", Array.isArray(r.findings));

console.log("raport:");
var res = run("", "2026.1");
var rep = T.buildReport(res, { e: 0, w: 0, i: 0 });
ok("zawiera wiersz z wydaniem", /Wydanie: 2026\.1 Gazpacho \(kolla-ansible 22\.x\)/.test(rep),
   rep.split("\n").slice(0, 6).join(" | "));

console.log(fails ? "\n" + fails + " testów nie przeszło" : "\nwszystkie testy przeszły");
process.exit(fails ? 1 : 0);
