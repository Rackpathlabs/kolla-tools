/* Test dymny generatora: reguły macierzy wydań i walidacja pól. */
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2],
  ["validate", "findRelease", "DISTROS", "KOLLA_MATRIX", "buildYaml", "badFields"]);

var R = lib.runner();
var ok = R.ok;

function base(over) {
  var s = { distro: "rocky", release: "2025.1", vip: "10.0.0.250",
            net_if: "eth0", ext_if: "eth1",
            t_haproxy: true, t_cinder: false, t_prometheus: false,
            t_provider: false, t_comments: true };
  for (var k in over) s[k] = over[k];
  return s;
}
function levels(d, lv) { return d.filter(function (x) { return x.level === lv; }); }
function has(d, lv, re) {
  return d.some(function (x) { return x.level === lv && re.test(x.msg); });
}

console.log("macierz:");
var M = T.KOLLA_MATRIX;
var ids = M.releases.map(function (r) { return r.id; });
ok("id wydań są unikalne", new Set(ids).size === ids.length, ids.join(","));
ok("statusy są znane", M.releases.every(function (r) {
  return ["development", "maintained", "unmaintained", "eol"].indexOf(r.status) !== -1;
}));
ok("unpublished zawiera się w baseDistros", M.releases.every(function (r) {
  return (r.unpublished || []).every(function (u) { return r.baseDistros && r.baseDistros.indexOf(u) !== -1; });
}));
ok("klucze z defaults mają opis w keys[]", M.releases.every(function (r) {
  return Object.keys(r.defaults).every(function (k) { return !!M.keys[k]; });
}));
ok("tylko wydanie rozwojowe ma datę planowaną", M.releases.every(function (r) {
  return r.status === "development" ? !!r.expected : r.expected === null;
}));
ok("wydanie rozwojowe nie ma daty końca wsparcia", M.releases.every(function (r) {
  return r.status !== "development" || r.endsOn === null;
}));
ok("wydanie rozwojowe nie ma daty wydania", M.releases.every(function (r) {
  return r.status !== "development" || r.released === null;
}));
ok("deprecated ma poprawne rodzaje", M.releases.every(function (r) {
  return r.deprecated.every(function (x) { return ["key", "group", "service"].indexOf(x.kind) !== -1 && !!x.name; });
}));
ok("DISTROS = unia obrazów bazowych", T.DISTROS.join(",") === "centos,debian,rocky,ubuntu", T.DISTROS.join(","));

console.log("findRelease:");
ok("2025.1", T.findRelease("2025.1").name === "Epoxy");
ok("stable/2025.1", T.findRelease("stable/2025.1").id === "2025.1");
ok("nazwa własna (Epoxy)", T.findRelease("Epoxy").id === "2025.1");
ok("nieznane -> null", T.findRelease("2019.1") === null);
ok("puste -> null", T.findRelease("") === null);

console.log("walidacja:");
var d;
d = T.validate(base());
ok("2025.1/rocky bez błędów", levels(d, "error").length === 0, JSON.stringify(levels(d, "error")));
/* KV-12a: brak klucza = wartość domyślna = działa, ryzyko dopiero przy skali.
   Uwaga, nie błąd — error na każdym labowym pliku uczy ignorowania narzędzia. */
ok("brak om_enable_rabbitmq_stream_fanout -> uwaga, nie informacja",
   has(d, "warn", /om_enable_rabbitmq_stream_fanout/) &&
   !has(d, "info", /om_enable_rabbitmq_stream_fanout/));
ok("komunikat mówi, że plik klucza nie ustawia", has(d, "warn", /Plik nie ustawia/));
ok("2025.1 nie wspomina o kluczach nie-notable",
   !has(d, "info", /enable_ironic_inspector/));
ok("2025.1 wypisuje systemy hosta", has(d, "info", /Ubuntu Noble/));

d = T.validate(base({ release: "2025.2", distro: "centos" }));
ok("centos w 2025.2 -> uwaga o braku obrazów", has(d, "warn", /nie publikuje dla niego obrazów/));

/* docs 2025.1: "Kolla does not publish CS9/10 based images" */
d = T.validate(base({ release: "2025.1", distro: "centos" }));
ok("centos w 2025.1 -> uwaga o braku obrazów", has(d, "warn", /nie publikuje dla niego obrazów/));

/* docs 2024.1: "Kolla does not publish CS9 based images" */
d = T.validate(base({ release: "2024.1", distro: "centos" }));
ok("centos w 2024.1 -> uwaga o braku obrazów", has(d, "warn", /nie publikuje dla niego obrazów/));

d = T.validate(base({ release: "2025.1", distro: "rocky" }));
ok("rocky w 2025.1 -> bez uwagi o obrazach", !has(d, "warn", /nie publikuje/));

d = T.validate(base({ release: "2024.2" }));
ok("2024.2 -> uwaga o EOL", has(d, "warn", /koniec życia/));
ok("2024.2 -> data wycofania z pola endsOn", has(d, "warn", /od: <code>2026-04-29<\/code>/));

d = T.validate(base({ release: "2024.1" }));
ok("2024.1 -> uwaga o braku utrzymania", has(d, "warn", /bez utrzymania/));
ok("2024.1 bez znanej daty -> bez ogona z datą", !has(d, "warn", /bez utrzymania.* — od:/));

d = T.validate(base({ release: "2026.2" }));
ok("2026.2 -> uwaga o gałęzi rozwojowej", has(d, "warn", /gałąź rozwojowa/));
ok("2026.2 -> data planowanego wydania, nie końca wsparcia",
   has(d, "warn", /planowane wydanie: <code>2026-09-30<\/code>/));

d = T.validate(base({ release: "2026.1" }));
ok("2026.1 (wspierane) -> brak uwagi o statusie",
   !has(d, "warn", /koniec życia|bez utrzymania|gałąź rozwojowa/));
ok("2026.1 podaje prefetch QoS jako informację, nie uwagę",
   has(d, "info", /om_rabbitmq_qos_prefetch_count/) &&
   !has(d, "warn", /om_rabbitmq_qos_prefetch_count/));
ok("waga wpisu pochodzi z macierzy, nie z kodu",
   M.keys.om_enable_rabbitmq_stream_fanout.sev === "warn" &&
   M.keys.om_rabbitmq_qos_prefetch_count.sev === "info");

d = T.validate(base({ release: "2019.1" }));
ok("spoza macierzy -> uwaga", has(d, "warn", /nie występuje w macierzy/));

d = T.validate(base({ release: "master" }));
ok("master -> bez uwagi o macierzy", !has(d, "warn", /nie występuje w macierzy/));

console.log("YAML:");
var y = T.buildYaml(base(), {});
ok("nagłówek zawiera nazwę wydania", /Epoxy/.test(y.text), y.text.split("\n").slice(0, 8).join(" | "));
ok("nagłówek zawiera serię kolla-ansible", /kolla-ansible 20\.x/.test(y.text));
ok("serializer nie został zatrzymany", y.tripped === false);

R.finish();
