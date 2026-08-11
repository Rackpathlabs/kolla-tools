/* Test dymny walidatora: reguły wydania, kworum i kolokacji. */
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2],
  ["parse", "analyse", "buildReport", "KOLLA_MATRIX", "findRelease",
   "defaultRelease", "SAMPLE_OK", "SAMPLE_BAD", "GLOBALS", "I18N"]);

var R = lib.runner();
var ok = R.ok;

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
ok("2024.2 -> data wycofania z pola endsOn", /od: <code>2026-04-29<\/code>/.test(find(r, "WYDANIE")[0].msg));
r = run("", "2024.1");
ok("2024.1 -> uwaga o braku utrzymania", /bez utrzymania/.test(find(r, "WYDANIE")[0].msg));
r = run("", "2026.2");
ok("2026.2 -> data planowanego wydania, nie końca wsparcia",
   /planowane wydanie: <code>2026-09-30<\/code>/.test(find(r, "WYDANIE")[0].msg));

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

/* ---- KV-02 / KV-03: kworum i liczebność ---- */

function inv(parts) { return parts.join("\n") + "\n"; }
function runInv(text, release) { return T.analyse(T.parse(text), release || "2026.1"); }

var CTL3 = ["[control]", "ctl[01:03] ansible_host=10.0.0.1[1:3]", "",
            "[network]", "ctl01", "", "[compute]", "cmp01 ansible_host=10.0.0.21", "",
            "[storage]", "cmp01", "", "[monitoring]", "ctl01", ""];

console.log("kworum [control] (KV-02):");
r = runInv(inv(CTL3));
ok("3 węzły -> brak alarmu", !hasCode(r, "KWORUM-LICZBA"));

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12", "",
                "[network]", "ctl01", "", "[compute]", "cmp01 ansible_host=10.0.0.21", "",
                "[storage]", "cmp01", "", "[monitoring]", "ctl01", ""]));
ok("2 węzły -> błąd", find(r, "KWORUM-LICZBA")[0] && find(r, "KWORUM-LICZBA")[0].sev === "error");
ok("2 węzły -> komunikat o parzystości (domyślnie po angielsku)",
   /an even number/.test(find(r, "KWORUM-LICZBA")[0].msg), find(r, "KWORUM-LICZBA")[0].msg);
ok("2 węzły -> opisany tryb awarii", /non-Primary/.test(find(r, "KWORUM-LICZBA")[0].hint));
ok("konkret trybu awarii zachowany w tłumaczeniu",
   /read-only/.test(find(r, "KWORUM-LICZBA")[0].hint) &&
   /returns 500/.test(find(r, "KWORUM-LICZBA")[0].hint));

r = runInv(inv(["[control]", "ctl[01:04] ansible_host=10.0.0.1[1:4]", "",
                "[network]", "ctl01", "", "[compute]", "cmp01 ansible_host=10.0.0.21", "",
                "[storage]", "cmp01", "", "[monitoring]", "ctl01", ""]));
ok("4 węzły -> błąd", hasCode(r, "KWORUM-LICZBA"));

console.log("wyjątek all-in-one:");
r = runInv(inv(["[control]", "aio01 ansible_host=10.0.0.11", "", "[network]", "aio01", "",
                "[compute]", "aio01", "", "[storage]", "aio01", "", "[monitoring]", "aio01", ""]));
ok("AIO -> informacja, nie błąd", hasCode(r, "KWORUM-AIO") && !hasCode(r, "KWORUM-LICZBA"));
ok("AIO -> waga 'info'", find(r, "KWORUM-AIO")[0].sev === "info");

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "", "[network]", "ctl01", "",
                "[compute]", "cmp01 ansible_host=10.0.0.21", "", "[storage]", "cmp01", "",
                "[monitoring]", "ctl01", ""]));
ok("1 węzeł sterujący bez roli compute -> błąd, nie wyjątek",
   hasCode(r, "KWORUM-LICZBA") && !hasCode(r, "KWORUM-AIO"));

console.log("grupy z własną obsadą:");
r = runInv(inv(CTL3.concat(["[mariadb:children]", "control", ""])));
ok("[mariadb] dziedziczące z control -> bez osobnego wpisu", !hasCode(r, "KWORUM-LICZBA"));

r = runInv(inv(CTL3.concat(["[mariadb]", "ctl01", "ctl02", ""])));
ok("[mariadb] z własnymi 2 hostami -> błąd", hasCode(r, "KWORUM-LICZBA"));
ok("wpis dotyczy mariadb, nie control", /\[mariadb\]/.test(find(r, "KWORUM-LICZBA")[0].msg));

r = runInv(inv(CTL3.concat(["[etcd]", "ctl01", "ctl02", "", "[rabbitmq]", "ctl01", "ctl02", ""])));
ok("każda grupa liczona osobno", find(r, "KWORUM-LICZBA").length === 2);

console.log("klaster RAFT OVN (KV-03):");
r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", ""])));
ok("3 hosty -> brak alarmu", !hasCode(r, "KWORUM-OVN"));

r = runInv(inv(CTL3.concat(["[ovn-database]", "ctl01", "ctl02", ""])));
ok("2 hosty -> błąd", find(r, "KWORUM-OVN")[0] && find(r, "KWORUM-OVN")[0].sev === "error");
ok("opisany tryb awarii (zamrożona chmura)", /tylko do odczytu/.test(find(r, "KWORUM-OVN")[0].hint));

r = runInv(inv(CTL3.concat(["[ovn-database]", "ctl01", "ctl02", "ctl03", "cmp01", "ctl04", ""])));
ok("5 hostów -> błąd (powyżej 3)", hasCode(r, "KWORUM-OVN"));

r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-nb-db:children]", "ovn-database", "",
                            "[ovn-sb-db:children]", "ovn-database", ""])));
ok("grupy dziedziczące -> bez zdublowanych wpisów", !hasCode(r, "KWORUM-OVN"));

r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-nb-db]", "ctl01", "ctl02", ""])));
ok("[ovn-nb-db] z własną obsadą -> jeden wpis", find(r, "KWORUM-OVN").length === 1);
ok("wpis dotyczy ovn-nb-db", /ovn-nb-db/.test(find(r, "KWORUM-OVN")[0].msg));

r = runInv(inv(CTL3.concat(["[ovn-database]", "ctl01", ""])));
ok("1 host przy 3 sterujących -> informacja o SPOF",
   find(r, "KWORUM-OVN")[0] && find(r, "KWORUM-OVN")[0].sev === "info");

r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-northd]", "ctl01", ""])));
ok("northd na innej liście -> uwaga", hasCode(r, "OVN-NORTHD"));
r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-northd:children]", "ovn-database", ""])));
ok("northd zgodny z bazą -> brak uwagi", !hasCode(r, "OVN-NORTHD"));

console.log("monitory Ceph:");
r = runInv(inv(CTL3.concat(["[ceph-mon]", "ctl01", "ctl02", ""])));
ok("obecność [ceph-mon] -> informacja o zakresie Kolli", hasCode(r, "CEPH-POZA-KOLLA"));
ok("2 monitory -> uwaga o kworum", hasCode(r, "KWORUM-CEPH"));
r = runInv(inv(CTL3));
ok("brak [ceph-mon] -> cisza", !hasCode(r, "CEPH-POZA-KOLLA") && !hasCode(r, "KWORUM-CEPH"));

console.log("brak fałszywych alarmów:");
r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-nb-db:children]", "ovn-database", "",
                            "[ovn-sb-db:children]", "ovn-database", "",
                            "[ovn-northd:children]", "ovn-database", "",
                            "[mariadb:children]", "control", "",
                            "[rabbitmq:children]", "control", "",
                            "[etcd:children]", "control", ""])));
ok("wzorcowe inventory 3-węzłowe -> zero błędów kworum",
   !hasCode(r, "KWORUM-LICZBA") && !hasCode(r, "KWORUM-OVN") && !hasCode(r, "OVN-NORTHD"));
ok("nazwy grup OVN nie są brane za literówki", !hasCode(r, "NIEZNANA-GRUPA"),
   JSON.stringify(find(r, "NIEZNANA-GRUPA").map(function (f) { return f.msg; })));

/* wbudowany przykład jest reklamowany jako poprawny — musi taki zostać */
r = T.analyse(T.parse(T.SAMPLE_OK()), "2026.1");
ok("wbudowany 'Przykład poprawny' -> zero błędów",
   r.findings.filter(function (f) { return f.sev === "error"; }).length === 0,
   JSON.stringify(r.findings.filter(function (f) { return f.sev === "error"; })
     .map(function (f) { return f.code; })));

/* ---- KV-04 / KV-11: kolokacja ról ---- */

var DISJOINT = ["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "net01 ansible_host=10.0.0.21", "net02 ansible_host=10.0.0.22", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""];

console.log("kolokacja [control]/[compute] (KV-04):");
r = runInv(inv(DISJOINT));
ok("role rozłączne -> cisza", !hasCode(r, "KOLOKACJA-CONTROL-COMPUTE"));

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "net01 ansible_host=10.0.0.21", "net02 ansible_host=10.0.0.22", "",
                "[compute]", "ctl01", "ctl02", "ctl03", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
/* Amendment KV-04: w walidatorze jednoplikowym to uwaga — warunek eskalacji
   (enable_masakari) leży w globals.yml, którego ten tool nie widzi. */
ok("hiperkonwergencja 3-węzłowa -> uwaga, nie błąd",
   find(r, "KOLOKACJA-CONTROL-COMPUTE")[0] &&
   find(r, "KOLOKACJA-CONTROL-COMPUTE")[0].sev === "warn");
ok("opisany tryb awarii (kaskada Masakari)",
   /hostmonitor/.test(find(r, "KOLOKACJA-CONTROL-COMPUTE")[0].hint));
ok("wpis nazywa warunek eskalacji",
   /enable_masakari/.test(find(r, "KOLOKACJA-CONTROL-COMPUTE")[0].hint));
ok("wpis mówi, że bez Masakari to poprawny wzorzec",
   /valid hyperconverged layout/.test(find(r, "KOLOKACJA-CONTROL-COMPUTE")[0].hint));
ok("KV-04 zachowuje konkret kaskady",
   /restrict_to_remotes = false/.test(find(r, "KOLOKACJA-CONTROL-COMPUTE")[0].hint) &&
   /Cascade/.test(find(r, "KOLOKACJA-CONTROL-COMPUTE")[0].hint));

/* regresja: stara reguła patrzyła na bezpośrednie członkostwo i tego nie widziała */
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12", "",
                "[control:children]", "dodatkowe", "",
                "[dodatkowe]", "cmp01", "",
                "[network]", "net01 ansible_host=10.0.0.21", "net02 ansible_host=10.0.0.22", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("przecięcie przez :children też wykryte", hasCode(r, "KOLOKACJA-CONTROL-COMPUTE"));

r = runInv(inv(["[control]", "aio01 ansible_host=10.0.0.11", "", "[network]", "aio01", "",
                "[compute]", "aio01", "", "[storage]", "aio01", "", "[monitoring]", "aio01", ""]));
ok("AIO -> bez alarmu kolokacji", !hasCode(r, "KOLOKACJA-CONTROL-COMPUTE"));
ok("AIO -> bez alarmu kolokacji magazynu", !hasCode(r, "KOLOKACJA-STORAGE"));

console.log("[network] pod OVN (KV-11):");
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network:children]", "control", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("[network:children] = control -> uwaga", hasCode(r, "KOLOKACJA-NETWORK"));
ok("uwaga, nie błąd", find(r, "KOLOKACJA-NETWORK")[0].sev === "warn");
ok("nazwany kompromis (enable-chassis-as-gw)",
   /enable-chassis-as-gw/.test(find(r, "KOLOKACJA-NETWORK")[0].hint));
ok("KV-11 niesie wyjątek z rulesetu (kolokacja z compute jest poprawna)",
   /valid pattern/.test(find(r, "KOLOKACJA-NETWORK")[0].hint));
ok("wskazany klucz łagodzący",
   /neutron_ovn_distributed_fip/.test(find(r, "KOLOKACJA-NETWORK")[0].hint));

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network:children]", "compute", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("[network:children] = compute -> poprawny wzorzec, cisza", !hasCode(r, "KOLOKACJA-NETWORK"));
ok("i bez alarmu o braku HA bramy", !hasCode(r, "BRAMA-BEZ-HA"));

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "ctl01", "net02 ansible_host=10.0.0.22", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("częściowe przecięcie network/control -> uwaga", hasCode(r, "KOLOKACJA-NETWORK"));
ok("wymienia konkretny host", /ctl01/.test(find(r, "KOLOKACJA-NETWORK")[0].msg));

console.log("redundancja bramy:");
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "net01 ansible_host=10.0.0.21", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("1 węzeł sieciowy przy 2 obliczeniowych -> uwaga", hasCode(r, "BRAMA-BEZ-HA"));
r = runInv(inv(DISJOINT));
ok("2 węzły sieciowe -> cisza", !hasCode(r, "BRAMA-BEZ-HA"));
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "net01 ansible_host=10.0.0.21", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("1 węzeł sieciowy przy 1 obliczeniowym -> poniżej progu, cisza", !hasCode(r, "BRAMA-BEZ-HA"));

console.log("kolokacja magazynu:");
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "net01 ansible_host=10.0.0.21", "net02 ansible_host=10.0.0.22", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "cmp01", "cmp02", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("[storage] na węzłach compute -> informacja",
   find(r, "KOLOKACJA-STORAGE")[0] && find(r, "KOLOKACJA-STORAGE")[0].sev === "info");
ok("nazwany kompromis (rezerwa zasobów)",
   /resource reserve/.test(find(r, "KOLOKACJA-STORAGE")[0].hint));
r = runInv(inv(DISJOINT));
ok("magazyn osobno -> cisza", !hasCode(r, "KOLOKACJA-STORAGE"));

/* Blok parsera jest w walidatorze obecny i sprawny, ale jeszcze nieużywany w UI —
   konsumentem będzie tryb łączony (#18). Test pilnuje, że blok nie zniknie po drodze. */
console.log("blok parsera globals (nieużywany w UI):");
ok("GLOBALS obecny w walidatorze", typeof T.GLOBALS === "object" && T.GLOBALS !== null);
var pdoc = T.GLOBALS.parse('---\nkolla_internal_vip_address: "10.0.0.250"\ncinder_cluster_name: prod\n');
ok("parsuje i podaje numery linii",
   pdoc.ok && pdoc.keys.kolla_internal_vip_address.line === 2 && pdoc.keys.cinder_cluster_name.line === 3);
ok("round-trip działa też tutaj",
   T.GLOBALS.emit(pdoc, {}).text === '---\nkolla_internal_vip_address: "10.0.0.250"\ncinder_cluster_name: prod\n');

/* ---- reguły wymagające obu plików (KV-01, KV-07, KV-09) ---- */

function withGlobals(invText, globText, acks) {
  return T.analyse(T.parse(invText), "2026.1",
                   globText === null ? null : T.GLOBALS.parse(globText), acks || {});
}

var INV3 = inv(["[control]", "c1 ansible_host=10.80.0.11", "c2 ansible_host=10.80.0.12",
                "c3 ansible_host=10.80.0.13", "",
                "[network]", "n1 ansible_host=10.80.0.21", "n2 ansible_host=10.80.0.22", "",
                "[compute]", "k1 ansible_host=10.80.0.31", "k2 ansible_host=10.80.0.32", "",
                "[storage]", "s1 ansible_host=10.80.0.41", "s2 ansible_host=10.80.0.42", "",
                "[monitoring]", "m1 ansible_host=10.80.0.51", ""]);

console.log("KV-01 — fencing:");
var HA = '---\nenable_masakari: "yes"\nenable_hacluster: "yes"\n';
r = withGlobals(INV3, HA);
ok("Masakari + hacluster bez pól BMC -> błąd", find(r, "KV-01-FENCING")[0] &&
   find(r, "KV-01-FENCING")[0].sev === "error");
ok("wpis wskazuje oba pliki jako źródło", find(r, "KV-01-FENCING")[0].src === "cross");
ok("KV-01 zachowuje konkret trybu awarii",
   /RBD descriptor/.test(find(r, "KV-01-FENCING")[0].hint) &&
   /same Ceph volume/.test(find(r, "KV-01-FENCING")[0].hint));
ok("odsyłacz do linii w globals",
   find(r, "KV-01-FENCING")[0].refs.some(function (x) { return x.src === "globals" && x.line === 2; }));
r = withGlobals(INV3.replace("c1 ansible_host=10.80.0.11", "c1 ansible_host=10.80.0.11 ipmi_address=10.81.0.11"), HA);
ok("pole ipmi_address w inventory -> cisza", !hasCode(r, "KV-01-FENCING"));
r = withGlobals(INV3.replace("[control]", "[all:vars]\nbmc_username=admin\n\n[control]"), HA);
ok("pole BMC w zmiennych grupy też liczy się jako fencing", !hasCode(r, "KV-01-FENCING"));
r = withGlobals(INV3, HA, { ack_nobmc: true });
ok("potwierdzenie obniża do informacji", find(r, "KV-01-FENCING")[0].sev === "info");
ok("potwierdzenie nie wycisza wpisu", hasCode(r, "KV-01-FENCING"));
r = withGlobals(INV3, '---\nenable_masakari: "yes"\n');
ok("sam Masakari bez hacluster -> cisza", !hasCode(r, "KV-01-FENCING"));

console.log("KV-07 — klastrowanie Cindera:");
r = withGlobals(INV3, '---\nenable_cinder: "yes"\ncinder_backend_ceph: "yes"\n');
ok("dwa hosty storage bez cinder_cluster_name -> błąd",
   find(r, "KV-07-CINDER-KLASTER")[0] && find(r, "KV-07-CINDER-KLASTER")[0].sev === "error");
ok("KV-07 zachowuje konkret naprawy",
   /cinder-manage volume update_host/.test(find(r, "KV-07-CINDER-KLASTER")[0].hint) &&
   /@ceph#ceph/.test(find(r, "KV-07-CINDER-KLASTER")[0].hint));
ok("wskazuje linię grupy w inventory i brak klucza w globals",
   find(r, "KV-07-CINDER-KLASTER")[0].refs.some(function (x) { return x.src === "inventory" && x.line > 0; }) &&
   find(r, "KV-07-CINDER-KLASTER")[0].refs.some(function (x) { return x.src === "globals" && !x.line; }));
r = withGlobals(INV3, '---\ncinder_cluster_name: prod\n');
ok("z cinder_cluster_name -> cisza", !hasCode(r, "KV-07-CINDER-KLASTER"));
r = withGlobals(INV3, '---\nenable_cinder_backend_lvm: "yes"\n');
ok("backend LVM bez współdzielenia -> zwolnienie z reguły", !hasCode(r, "KV-07-CINDER-KLASTER"));

console.log("KV-09 — VIP wobec adresów hostów:");
r = withGlobals(INV3, '---\nkolla_internal_vip_address: "10.80.0.31"\n');
ok("VIP równy adresowi hosta -> błąd", find(r, "KV-09-VIP-KOLIZJA")[0] &&
   find(r, "KV-09-VIP-KOLIZJA")[0].sev === "error");
ok("wskazuje host w inventory i klucz w globals",
   find(r, "KV-09-VIP-KOLIZJA")[0].refs.length === 2);
r = withGlobals(INV3, '---\nkolla_internal_vip_address: "192.168.5.9"\n');
ok("VIP poza wnioskowaną podsiecią -> uwaga, nie błąd",
   find(r, "KV-09-VIP-PODSIEC")[0] && find(r, "KV-09-VIP-PODSIEC")[0].sev === "warn");
/* Maska musi paść w treści — reguła bez tego zdania jest blefem. Sprawdzamy to
   w OBU językach, bo zgubienie zastrzeżenia w tłumaczeniu byłoby cichą utratą
   pokory, a nie usterką kosmetyczną. */
ok("wpis podaje założoną maskę wprost (en)",
   /10\.80\.0\.0\/24/.test(find(r, "KV-09-VIP-PODSIEC")[0].msg) &&
   /inference rather than a reading/.test(find(r, "KV-09-VIP-PODSIEC")[0].hint));
T.I18N.setLang("pl");
var rPl = withGlobals(INV3, '---\nkolla_internal_vip_address: "192.168.5.9"\n');
ok("wpis podaje założoną maskę wprost (pl)",
   /10\.80\.0\.0\/24/.test(find(rPl, "KV-09-VIP-PODSIEC")[0].msg) &&
   /wnioskowanie, a nie odczyt/.test(find(rPl, "KV-09-VIP-PODSIEC")[0].hint));
T.I18N.setLang("en");
r = withGlobals(INV3, '---\nkolla_internal_vip_address: "10.80.0.250"\n');
ok("VIP wolny w tej samej podsieci -> cisza",
   !hasCode(r, "KV-09-VIP-KOLIZJA") && !hasCode(r, "KV-09-VIP-PODSIEC"));
r = withGlobals(INV3, '---\nenable_haproxy: "no"\nkolla_internal_vip_address: "10.80.0.31"\n');
ok("zewnętrzny load balancer (enable_haproxy: no) -> zwolnienie", !hasCode(r, "KV-09-VIP-KOLIZJA"));

console.log("globals nieparsowalny:");
r = withGlobals(INV3, '---\nklucz: |\n  blok\n');
ok("błąd parsera globals trafia do listy ze źródłem globals",
   r.findings.some(function (f) { return f.src === "globals" && f.sev === "error"; }));
ok("reguły dwuplikowe nie ruszają na niepełnym pliku",
   !hasCode(r, "KV-01-FENCING") && !hasCode(r, "KV-07-CINDER-KLASTER"));

console.log("degradacja bez globals:");
var solo = T.analyse(T.parse(INV3), "2026.1", null, {});
var duo = withGlobals(INV3, '---\nenable_masakari: "yes"\nenable_hacluster: "yes"\n');
ok("bez globals ani jednego findingu spoza inventory",
   solo.findings.every(function (f) { return f.src === "inventory"; }));
ok("klasa A identyczna z globals i bez",
   JSON.stringify(solo.findings.map(function (f) { return f.code + f.sev + f.line; })) ===
   JSON.stringify(duo.findings.filter(function (f) { return f.src === "inventory"; })
     .map(function (f) { return f.code + f.sev + f.line; })));

/* ---- styk reguł wydania z trybem aktualizacji ---- */
/* Walidator ma teraz dwa wydania. Podział pracy między releaseRules() a
   upgradeRules() jest dziś skutkiem decyzji projektowej — te asercje robią z niego
   zapisane oczekiwanie, żeby nikt nie odwrócił go przypadkiem. */

function withPath(invText, from, to, globText) {
  return T.analyse(T.parse(invText), from,
                   globText ? T.GLOBALS.parse(globText) : null, {}, to || "");
}
function mentioning(res, needle) {
  return res.findings.filter(function (f) { return (f.msg + (f.hint || "")).indexOf(needle) !== -1; });
}

var INV_ZUN = INV3 + "\n[zun]\nk1\n";

console.log("podział pracy: wydanie obecne kontra ścieżka:");
r = withPath(INV_ZUN, "2026.1", "");
ok("grupa wycofana w wydaniu OBECNYM -> zgłasza releaseRules",
   hasCode(r, "GRUPA-WYCOFANA") && !hasCode(r, "UPGRADE-GRUPA-WYCOFANY"));
ok("i dokładnie raz", mentioning(r, "zun").length === 1,
   JSON.stringify(mentioning(r, "zun").map(function (f) { return f.code; })));

r = withPath(INV_ZUN, "2025.1", "2026.1");
ok("grupa wycofana w wydaniu DOCELOWYM -> zgłasza tryb aktualizacji",
   hasCode(r, "UPGRADE-GRUPA-WYCOFANY") && !hasCode(r, "GRUPA-WYCOFANA"));
ok("i dokładnie raz, bez dubla w dwóch wagach", mentioning(r, "zun").length === 1,
   JSON.stringify(mentioning(r, "zun").map(function (f) { return f.code + "/" + f.sev; })));

/* Wydanie startowe nie jest punktem na ścieżce — ale jego własne deprecacje grup
   nadal łapie releaseRules. To jest miejsce, w którym mogłaby powstać luka. */
var INV_MURANO = INV3 + "\n[murano]\nc1\n";
r = withPath(INV_MURANO, "2024.1", "2026.1");
ok("deprecacja z wydania startowego nie ginie między regułami",
   mentioning(r, "murano").length === 1 && hasCode(r, "GRUPA-WYCOFANA"));
ok("i nie jest powtórzona przez tryb aktualizacji", !hasCode(r, "UPGRADE-GRUPA-WYCOFANY"));

console.log("granica kluczy globals.yml:");
var GLOB_LE = '---\nletsencrypt_cert_server: "https://acme-v02.api.letsencrypt.org/directory"\n';
r = withPath(INV3, "2025.1", "", GLOB_LE);
ok("klucz wycofany w wydaniu obecnym -> walidator milczy (to zakres generatora)",
   mentioning(r, "letsencrypt_cert_server").length === 0);
r = withPath(INV3, "2024.2", "2025.1", GLOB_LE);
ok("ten sam klucz na ścieżce -> zgłoszony raz przez tryb aktualizacji",
   mentioning(r, "letsencrypt_cert_server").length === 1 &&
   hasCode(r, "UPGRADE-KLUCZ-PRZEMIANOWANY"));

/* ---- niezależność wyniku od języka ---- */
console.log("dwa języki, ten sam wynik:")
var CASES = [
  inv(CTL3.concat(["[mariadb]", "ctl01", "ctl02", ""])),
  inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12", "",
       "[network]", "ctl01", "", "[compute]", "cmp01 ansible_host=10.0.0.21", "",
       "[storage]", "cmp01", "", "[monitoring]", "ctl01", ""]),
  inv(CTL3.concat(["[zun]", "cmp01", ""]))
];
function shapeOf(text) {
  return T.analyse(T.parse(text), "2026.1", null, {}).findings
    .map(function (f) { return f.code + "/" + f.sev + "/" + f.src + "/" + f.line; }).join(";");
}
function proseOf(text) {
  return T.analyse(T.parse(text), "2026.1", null, {}).findings
    .map(function (f) { return f.msg + "|" + (f.hint || ""); }).join(";");
}
/* Kształt wyniku sprawdzamy na wszystkich przypadkach — musi być niezależny od
   języka już teraz. Różnicę treści sprawdzamy na razie na rodzinach, które są
   przetłumaczone; ta lista rośnie razem z etapem 2 i na jego koniec obejmie
   wszystkie przypadki. Póki co jej zawężenie jest jawne, a nie przemilczane. */
var TRANSLATED = [CASES[0]];
var sameShape = true, differentProse = true;
CASES.forEach(function (c) {
  T.I18N.setLang("en"); var en = shapeOf(c), enP = proseOf(c);
  T.I18N.setLang("pl"); var pl = shapeOf(c), plP = proseOf(c);
  if (en !== pl) sameShape = false;
  if (TRANSLATED.indexOf(c) !== -1 && enP === plP) differentProse = false;
});
T.I18N.setLang("en");
ok("kody, wagi, źródła i linie identyczne w obu językach", sameShape);
ok("treść komunikatów faktycznie się różni (rodziny przetłumaczone)", differentProse);

/* Przykłady wbudowane to jedyne dane wejściowe, które sami produkujemy w dwóch
   wariantach — więc najbardziej narażone na rozjazd. Komentarz nagłówkowy wolno
   przetłumaczyć, ale nie wolno mu zmienić liczby linii ani niczego przesunąć. */
console.log("wbudowane przykłady w obu językach:");
[["SAMPLE_OK", T.SAMPLE_OK], ["SAMPLE_BAD", T.SAMPLE_BAD]].forEach(function (pair) {
  T.I18N.setLang("en");
  var en = pair[1](), enShape = shapeOf(en);
  T.I18N.setLang("pl");
  var pl = pair[1](), plShape = shapeOf(pl);
  T.I18N.setLang("en");
  ok(pair[0] + " — ta sama liczba linii", en.split("\n").length === pl.split("\n").length,
     en.split("\n").length + " vs " + pl.split("\n").length);
  ok(pair[0] + " — identyczny wynik w obu językach", enShape === plShape);
  ok(pair[0] + " — komentarz faktycznie przetłumaczony",
     en.split("\n")[0] !== pl.split("\n")[0]);
  ok(pair[0] + " — struktura poniżej komentarza nietknięta",
     en.split("\n").slice(1).join("\n") === pl.split("\n").slice(1).join("\n"));
});

/* ---- teksty niosące pokorę i zastrzeżenia ----
   Te zdania istnieją po to, żeby narzędzie nie twierdziło więcej, niż udowadnia.
   Zgubienie któregokolwiek w tłumaczeniu nie byłoby usterką kosmetyczną, tylko
   cichą utratą uczciwości — dlatego każde jest przypięte w OBU językach. */
console.log("pokora i zastrzeżenia w obu językach:");

function bothLangs(fn) {
  var out = {};
  ["en", "pl"].forEach(function (l) { T.I18N.setLang(l); out[l] = fn(); });
  T.I18N.setLang("en");
  return out;
}

/* Werdykt przy zerze findingów nie ma prawa twierdzić poprawności — powstał
   właśnie po to, żeby jej NIE twierdzić. */
var clean = bothLangs(function () { return T.I18N.t("v.verdict.clean"); });
ok("werdykt czysty ogranicza się do zakresu narzędzia (en)",
   /within what this tool checks/.test(clean.en), clean.en);
ok("werdykt czysty ogranicza się do zakresu narzędzia (pl)",
   /w zakresie sprawdzanym przez to narzędzie/.test(clean.pl), clean.pl);
ok("werdykt czysty nie twierdzi poprawności w żadnym języku",
   !/\bcorrect\b|\bvalid\b/i.test(clean.en) && !/poprawn/i.test(clean.pl));

/* Notka o zakresie w trybie łączonym — najważniejszy tekst w interfejsie. */
var note = bothLangs(function () { return T.I18N.t("v.scope.note"); });
ok("notka o zakresie: pusta lista nie znaczy poprawności (en)",
   /does not mean the file is correct/.test(note.en));
ok("notka o zakresie: pusta lista nie znaczy poprawności (pl)",
   /nie znaczy, że plik jest poprawny/.test(note.pl));
ok("notka o zakresie mówi, czyją robotą jest lint globals (obie wersje)",
   /generator/i.test(note.en) && /generator/i.test(note.pl));

var gap = bothLangs(function () {
  var r = T.analyse(T.parse(inv(["[control]", "c1 ansible_host=10.9.0.11", "c2 ansible_host=10.9.0.12",
    "c3 ansible_host=10.9.0.13", "", "[network]", "n1 ansible_host=10.9.0.21", "n2 ansible_host=10.9.0.22", "",
    "[compute]", "k1 ansible_host=10.9.0.31", "k2 ansible_host=10.9.0.32", "",
    "[storage]", "s1 ansible_host=10.9.0.41", "", "[monitoring]", "m1 ansible_host=10.9.0.51", "",
    "[murano]", "c1", ""])), "2023.1", null, {}, "2024.1");
  return find(r, "UPGRADE-LUKA")[0];
});
ok("UPGRADE-LUKA mówi, że luka to brak przeglądu, nie brak zmian (en)",
   /not because there were none/.test(gap.en.hint) && /would look exactly like no changes/.test(gap.en.hint));
ok("UPGRADE-LUKA zachowuje to samo zastrzeżenie (pl)",
   /nie dlatego, że ich nie było/.test(gap.pl.hint) && /wyglądałaby identycznie jak brak zmian/.test(gap.pl.hint));

var ack = bothLangs(function () {
  return find(withGlobals(INV3, '---\nenable_masakari: "yes"\nenable_hacluster: "yes"\n',
                          { ack_nobmc: true }), "KV-01-FENCING")[0];
});
ok("potwierdzenie obniża wagę, a nie wycisza wpis (obie wersje)",
   ack.en.sev === "info" && ack.pl.sev === "info" &&
   ack.en.msg.length > 0 && ack.pl.msg.length > 0);

console.log("raport:");
var res = run("", "2026.1");
var rep = T.buildReport(res, { e: 0, w: 0, i: 0 });
ok("zawiera wiersz z wydaniem", /Release: 2026\.1 Gazpacho \(kolla-ansible 22\.x\)/.test(rep),
   rep.split("\n").slice(0, 6).join(" | "));
/* Etykieta języka zostaje po angielsku w obu wersjach — to metadane dla kogoś,
   kto nie zna języka reszty dokumentu. Wartość jest kodem ISO. */
ok("raport niesie język, w którym powstał", /^Language: en$/m.test(rep));
T.I18N.setLang("pl");
var repPl = T.buildReport(res, { e: 0, w: 0, i: 0 });
ok("po polsku etykieta nadal angielska, wartość to kod", /^Language: pl$/m.test(repPl));
ok("reszta nagłówka tłumaczy się normalnie", /Wydanie: 2026\.1 Gazpacho/.test(repPl));
ok("kody reguł nie zależą od języka",
   T.analyse(T.parse(INV3), "2026.1", null, {}).findings.map(function (f) { return f.code; }).join(",") ===
   (T.I18N.setLang("en"), T.analyse(T.parse(INV3), "2026.1", null, {}).findings.map(function (f) { return f.code; }).join(",")));

R.finish();
