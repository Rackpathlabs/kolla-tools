/* Test dymny generatora: reguły macierzy wydań i walidacja pól. */
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2],
  ["validate", "findRelease", "DISTROS", "KOLLA_MATRIX", "buildYaml", "badFields",
   "DEFAULTS", "baseDev", "physnets", "LINT",
   "GLOBALS", "rawStateFromParsed", "changedOverrides", "yamlBool"]);

var R = lib.runner();
var ok = R.ok;

function base(over) {
  var s = {};
  Object.keys(T.DEFAULTS).forEach(function (k) { s[k] = T.DEFAULTS[k]; });
  s.vip = "10.0.0.250";
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
/* Kontrakt KV-12a: generator wypisuje ten klucz jawnie, więc jego własny plik
   nie wpada we własną regułę — wpis schodzi z uwagi do informacji. */
ok("om_enable_rabbitmq_stream_fanout -> informacja o jawnym ustawieniu",
   has(d, "info", /ustawiony jawnie/) &&
   !has(d, "warn", /om_enable_rabbitmq_stream_fanout/));
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

/* ---- ruleset KV po stronie globals.yml ---- */

console.log("KV-05 — magazyn i Corosync na jednym łączu:");
d = T.validate(base());
ok("domyślnie storage dziedziczy network -> uwaga", has(d, "warn", /leżą na tym samym urządzeniu/));
d = T.validate(base({ t_hacluster: true }));
ok("z enable_hacluster -> błąd", has(d, "error", /leżą na tym samym urządzeniu/));
d = T.validate(base({ t_hacluster: true, ack_link: true }));
ok("potwierdzenie obniża do informacji", has(d, "info", /leżą na tym samym urządzeniu/));
ok("potwierdzenie nie wycisza wpisu",
   !has(d, "error", /leżą na tym samym urządzeniu/) && has(d, "info", /zmierzony zapas pasma/));
d = T.validate(base({ api_if: "eth0", stg_if: "eth2" }));
ok("osobne urządzenia -> cisza", !has(d, "warn", /leżą na tym samym urządzeniu/));
d = T.validate(base({ api_if: "bond0.10", stg_if: "bond0.20" }));
ok("bond0.10 vs bond0.20 -> to samo bond0", has(d, "warn", /bond0/));
ok("porównanie po urządzeniu bazowym", T.baseDev("bond0.20") === "bond0");

console.log("KV-06 — migracja na łączu API:");
/* Drabina z Amendment: waga nie przekracza tego, co plik udowadnia. */
var MIG = /migration_interface<\/code> nie jest ustawione/;
d = T.validate(base());
ok("bez narzędzi HA -> informacja", has(d, "info", MIG) && !has(d, "warn", MIG));
d = T.validate(base({ t_hacluster: true }));
ok("z hacluster bez Masakari -> uwaga", has(d, "warn", MIG) && !has(d, "error", MIG));
d = T.validate(base({ t_masakari: true, t_hacluster: true }));
ok("z Masakari -> błąd", has(d, "error", MIG));
ok("drabina wag pochodzi z tabeli, nie z warunku w kodzie",
   JSON.stringify(T.LINT["KV-06"].sev) ===
   JSON.stringify({ masakari: "error", hacluster: "warn", plain: "info" }));
d = T.validate(base({ t_masakari: true, t_hacluster: true, ack_migration: true }));
ok("potwierdzenie obniża do informacji", has(d, "info", /migration_interface<\/code> nie jest ustawione/));
d = T.validate(base({ api_if: "eth0", mig_if: "eth3" }));
ok("osobny interfejs migracji -> cisza", !has(d, "warn", /migration_interface/));

console.log("KV-10 — interfejs zewnętrzny kontra zarządzanie:");
d = T.validate(base({ net_if: "eth0", ext_if: "eth0" }));
ok("równość wprost -> błąd", has(d, "error", /to ten sam interfejs co/));
d = T.validate(base({ net_if: "bond0.10", ext_if: "bond0" }));
ok("wspólny bond -> uwaga", has(d, "warn", /dzieli urządzenie bazowe/));
d = T.validate(base());
ok("różne urządzenia -> cisza", !has(d, "warn", /dzieli urządzenie bazowe/));

console.log("KV-13 — sieć amfor Octavii:");
var oct = { t_octavia: true, t_barbican: true, amp_net: "vlan", physnet: "physnet1" };
d = T.validate(base(oct));
ok("vlan bez sieci provider -> błąd", has(d, "error", /wymaga <code>enable_neutron_provider_networks/));
d = T.validate(base(Object.assign({}, oct, { t_provider: true })));
ok("physnet1 przy jednym interfejsie -> cisza", !has(d, "error", /nie wynika z listy/));
d = T.validate(base(Object.assign({}, oct, { t_provider: true, physnet: "physnet2" })));
ok("physnet2 przy jednym interfejsie -> błąd", has(d, "error", /nie wynika z listy/));
d = T.validate(base(Object.assign({}, oct, { t_provider: true, physnet: "physnet2",
                                            ext_if: "eth1,eth2", br_name: "br-ex,br-ex2" })));
ok("dwa interfejsy -> physnet2 dostępny", !has(d, "error", /nie wynika z listy/));
ok("physnety wynikają z pozycji na liście",
   T.physnets({ ext_if: "eth1,eth2,eth3" }).join(",") === "physnet1,physnet2,physnet3");
d = T.validate(base({ ext_if: "eth1,eth2", br_name: "br-ex" }));
ok("liczba mostków != liczba interfejsów -> błąd", has(d, "error", /odpowiada dokładnie jeden mostek/));

console.log("KV-14 — TLS wewnętrzny, nazwy i adresy:");
d = T.validate(base({ t_tls_int: true }));
ok("TLS bez CA i bez Let's Encrypt -> błąd", has(d, "error", /nie zaufają własnemu CA/));
d = T.validate(base({ t_tls_int: true, t_copy_ca: true }));
ok("z kolla_copy_ca_into_containers -> cisza", !has(d, "error", /nie zaufają własnemu CA/));
d = T.validate(base({ t_tls_int: true, t_letsencrypt: true }));
ok("z Let's Encrypt -> cisza", !has(d, "error", /nie zaufają własnemu CA/));
d = T.validate(base({ int_fqdn: "cloud.example.net", ext_fqdn: "cloud.example.net" }));
ok("identyczne FQDN -> błąd", has(d, "error", /są identyczne/));
d = T.validate(base({ ext_vip: "203.0.113.10" }));
ok("różne VIP-y bez FQDN -> błąd", has(d, "error", /obie nazwy FQDN pozostają puste/));
d = T.validate(base({ ext_vip: "10.0.0.250", ext_vip_if: "eth9" }));
ok("ten sam VIP na innym interfejsie -> błąd", has(d, "error", /ten sam adres dwa razy/));

console.log("zależności usług:");
d = T.validate(base({ t_cinder: true }));
ok("Cinder bez backendu -> błąd", has(d, "error", /enable_cinder<\/code> wymaga backendu/));
d = T.validate(base({ t_cinder: true, storage: "lvm" }));
ok("Cinder z LVM -> cisza", !has(d, "error", /enable_cinder<\/code> wymaga/));
d = T.validate(base({ t_grafana: true }));
ok("Grafana bez Prometheusa -> błąd", has(d, "error", /enable_grafana<\/code> wymaga/));
d = T.validate(base({ t_octavia: true }));
ok("Octavia bez Barbicana -> błąd", has(d, "error", /enable_octavia<\/code> wymaga/));
d = T.validate(base({ t_masakari: true }));
ok("Masakari bez hacluster -> błąd", has(d, "error", /enable_masakari<\/code> wymaga/));

/* ---- parser globals.yml (blok współdzielony, issue #7) ---- */

console.log("parser — podzbiór obsługiwany:");
var P = T.GLOBALS;
var doc = P.parse('---\nkolla_base_distro: "rocky"\nnetwork_interface: eth0  # zarządzanie\nempty_key:\n');
ok("skalar w cudzysłowie", doc.keys.kolla_base_distro.value === "rocky");
ok("skalar goły z komentarzem końcowym", doc.keys.network_interface.value === "eth0");
ok("klucz bez wartości daje null", doc.keys.empty_key.value === null);
ok("numer linii dla każdego klucza",
   doc.keys.kolla_base_distro.line === 2 && doc.keys.network_interface.line === 3);
ok("kolejność kluczy zachowana",
   doc.order.join(",") === "kolla_base_distro,network_interface,empty_key");

doc = P.parse("---\noctavia_amp_network:\n  provider_network_type: vlan\n  provider_physical_network: physnet2\n");
ok("mapping zagnieżdżony", doc.keys.octavia_amp_network.kind === "map" &&
   doc.keys.octavia_amp_network.value.provider_network_type === "vlan");
doc = P.parse("---\nlista:\n  - a\n  - b\nflow: [x, y]\n");
ok("lista blokowa", doc.keys.lista.kind === "list" && doc.keys.lista.value.join(",") === "a,b");
ok("lista przepływowa", doc.keys.flow.value.join(",") === "x,y");

console.log("parser — konstrukcje poza podzbiorem:");
doc = P.parse("---\nklucz: |\n  wiersz\n");
ok("skalar blokowy -> błąd", !doc.ok && doc.findings[0].sev === "error");
ok("błąd wskazuje linię", doc.findings[0].line === 2, String(doc.findings[0].line));
ok("jeden błąd, bez kaskady", doc.findings.length === 1, String(doc.findings.length));
doc = P.parse("---\nklucz: &kotwica\n  a: 1\n");
ok("kotwica -> błąd z linią", !doc.ok && doc.findings[0].line === 2);
doc = P.parse("---\nklucz: wartosc\n---\ninny: wartosc\n");
ok("drugi dokument -> błąd", !doc.ok && doc.findings.some(function (f) { return f.line === 3; }));
doc = P.parse("---\nklucz:\n\twartosc: 1\n");
ok("wcięcie tabulatorem -> błąd", !doc.ok);

console.log("parser — round-trip:");
var src = '---\n# komentarz\nklucz: "wartosc"   # koniec linii\ninny: 1\n';
ok("emisja bez podmian jest bajtowo identyczna", P.emit(P.parse(src), {}).text === src);
var em = P.emit(P.parse(src), { klucz: "nowa" });
ok("podmiana zachowuje komentarz końcowy", /klucz: "nowa"   # koniec linii/.test(em.text), em.text);
ok("podmiana nie rusza pozostałych linii", /^---\n# komentarz\n/.test(em.text));
ok("klucz spoza pliku trafia na koniec z adnotacją",
   /# Klucze dodane przy eksporcie/.test(P.emit(P.parse(src), { nowy: "x" }).text));
ok("klucz niebędący skalarem jest pomijany, nie psuty",
   P.emit(P.parse("---\nlista:\n  - a\n"), { lista: "x" }).skipped.join(",") === "lista");

console.log("parser — przegląd kluczy wobec wydania:");
doc = P.parse('---\nom_enable_rabbitmq_high_availability: "yes"\nnieznany_klucz: 1\n');
var rv = P.review(doc, T.findRelease("2025.1"), { om_enable_rabbitmq_high_availability: 1 });
ok("wycofany klucz z wagą z macierzy",
   rv.some(function (f) { return f.code === "KLUCZ-WYCOFANY" && f.sev === "error" && f.line === 2; }));
ok("nieznany klucz jako informacja",
   rv.some(function (f) { return f.code === "KLUCZ-NIEZNANY" && f.sev === "info" && f.line === 3; }));
ok("bez wydania brak uwag o wycofaniu",
   !P.review(doc, null, {}).some(function (f) { return f.code === "KLUCZ-WYCOFANY"; }));

console.log("import do formularza:");
doc = P.parse('---\nkolla_base_distro: "ubuntu"\nenable_cinder: "yes"\ncinder_backend_ceph: "yes"\n' +
              'octavia_amp_network:\n  provider_network_type: vlan\n  provider_physical_network: physnet2\n');
var st = T.rawStateFromParsed(doc);
ok("wartości tekstowe trafiają do pól", st.distro === "ubuntu");
ok("wartości logiczne z yes/no", st.t_cinder === true);
ok("backend magazynu wywnioskowany z kluczy backendów", st.storage === "ceph");
ok("mapping zagnieżdżony zasila dwa pola", st.amp_net === "vlan" && st.physnet === "physnet2");
ok("yes/no/true/false rozpoznane",
   T.yamlBool("yes") === true && T.yamlBool("FALSE") === false && T.yamlBool("cokolwiek") === null);

var st2 = T.rawStateFromParsed(doc);
st2.distro = "rocky";
var ov = T.changedOverrides(doc, st2);
ok("podmiana tylko dla zmienionych kluczy",
   Object.keys(ov).join(",") === "kolla_base_distro" && ov.kolla_base_distro === "rocky",
   JSON.stringify(ov));
ok("bez zmian brak podmian",
   Object.keys(T.changedOverrides(doc, T.rawStateFromParsed(doc))).length === 0);

console.log("YAML:");
var y = T.buildYaml(base(), {});
ok("nagłówek zawiera nazwę wydania", /Epoxy/.test(y.text), y.text.split("\n").slice(0, 8).join(" | "));
ok("nagłówek zawiera serię kolla-ansible", /kolla-ansible 20\.x/.test(y.text));
ok("serializer nie został zatrzymany", y.tripped === false);

R.finish();
