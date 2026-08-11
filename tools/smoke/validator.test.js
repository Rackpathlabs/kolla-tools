/* Test dymny walidatora: reguły wydania, kworum i kolokacji. */
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2],
  ["parse", "analyse", "buildReport", "KOLLA_MATRIX", "findRelease",
   "defaultRelease", "SAMPLE_OK", "SAMPLE_BAD", "GLOBALS", "I18N",
   "inputFingerprint", "markStale"]);

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
ok("2026.1 (wspierane) -> brak wpisu", !hasCode(run("", "2026.1"), "RELEASE"));
var r = run("", "2024.2");
ok("2024.2 -> uwaga o EOL", hasCode(r, "RELEASE") && /end of life/.test(find(r, "RELEASE")[0].msg));
ok("2024.2 -> waga 'warn'", find(r, "RELEASE")[0].sev === "warn");
ok("2024.2 -> data wycofania z pola endsOn", /since: <code>2026-04-29<\/code>/.test(find(r, "RELEASE")[0].msg));
r = run("", "2024.1");
ok("2024.1 -> uwaga o braku utrzymania", /unmaintained/.test(find(r, "RELEASE")[0].msg));
r = run("", "2026.2");
ok("2026.2 -> data planowanego wydania, nie końca wsparcia",
   /planned release: <code>2026-09-30<\/code>/.test(find(r, "RELEASE")[0].msg));

console.log("grupy wycofane i przemianowane:");
r = run("\n[zun]\ncmp01\n", "2026.1");
ok("[zun] w 2026.1 -> GROUP-RETIRED", hasCode(r, "GROUP-RETIRED"));
ok("wskazuje linię deklaracji", find(r, "GROUP-RETIRED")[0].line > 0, String(find(r, "GROUP-RETIRED")[0].line));
ok("waga z macierzy (warn)", find(r, "GROUP-RETIRED")[0].sev === "warn");

r = run("\n[zun]\ncmp01\n", "2025.1");
ok("[zun] w 2025.1 -> bez wpisu", !hasCode(r, "GROUP-RETIRED"));

r = run("\n[kolla-toolbox]\nctl01\n", "2026.1");
ok("[kolla-toolbox] w 2026.1 -> GROUP-RENAMED", hasCode(r, "GROUP-RENAMED"));
ok("to błąd, nie uwaga", find(r, "GROUP-RENAMED")[0].sev === "error");
ok("podaje nową nazwę", /kolla_toolbox/.test(find(r, "GROUP-RENAMED")[0].msg));

r = run("\n[kolla_toolbox]\nctl01\n", "2026.1");
ok("[kolla_toolbox] (nowa nazwa) -> bez wpisu", !hasCode(r, "GROUP-RENAMED"));
ok("[kolla_toolbox] nie jest brany za literówkę", !hasCode(r, "NIEZNANA-GRUPA"),
   JSON.stringify(find(r, "NIEZNANA-GRUPA").map(function (f) { return f.msg; })));

r = run("\n[swift]\nctl01\n", "2025.1");
ok("[swift] w 2025.1 -> GROUP-RETIRED", hasCode(r, "GROUP-RETIRED"));
r = run("\n[swift]\nctl01\n", "2024.2");
ok("[swift] w 2024.2 -> bez wpisu", !hasCode(r, "GROUP-RETIRED"));

r = run("\n[cinder-volume]\ncmp01\n", "2026.1");
ok("[cinder-volume] w 2026.1 -> info o zmianie grupy nadrzędnej",
   find(r, "GROUP-RETIRED").some(function (f) { return f.sev === "info" && /cinder-volume/.test(f.msg); }));

console.log("odporność:");
r = run("", "2019.1");
ok("wydanie spoza macierzy -> brak reguł, brak wyjątku", !hasCode(r, "RELEASE"));
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
ok("3 węzły -> brak alarmu", !hasCode(r, "QUORUM-COUNT"));

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12", "",
                "[network]", "ctl01", "", "[compute]", "cmp01 ansible_host=10.0.0.21", "",
                "[storage]", "cmp01", "", "[monitoring]", "ctl01", ""]));
ok("2 węzły -> błąd", find(r, "QUORUM-COUNT")[0] && find(r, "QUORUM-COUNT")[0].sev === "error");
ok("2 węzły -> komunikat o parzystości (domyślnie po angielsku)",
   /an even number/.test(find(r, "QUORUM-COUNT")[0].msg), find(r, "QUORUM-COUNT")[0].msg);
ok("2 węzły -> opisany tryb awarii", /non-Primary/.test(find(r, "QUORUM-COUNT")[0].hint));
ok("konkret trybu awarii zachowany w tłumaczeniu",
   /read-only/.test(find(r, "QUORUM-COUNT")[0].hint) &&
   /returns 500/.test(find(r, "QUORUM-COUNT")[0].hint));

r = runInv(inv(["[control]", "ctl[01:04] ansible_host=10.0.0.1[1:4]", "",
                "[network]", "ctl01", "", "[compute]", "cmp01 ansible_host=10.0.0.21", "",
                "[storage]", "cmp01", "", "[monitoring]", "ctl01", ""]));
ok("4 węzły -> błąd", hasCode(r, "QUORUM-COUNT"));

console.log("wyjątek all-in-one:");
r = runInv(inv(["[control]", "aio01 ansible_host=10.0.0.11", "", "[network]", "aio01", "",
                "[compute]", "aio01", "", "[storage]", "aio01", "", "[monitoring]", "aio01", ""]));
ok("AIO -> informacja, nie błąd", hasCode(r, "QUORUM-AIO") && !hasCode(r, "QUORUM-COUNT"));
ok("AIO -> waga 'info'", find(r, "QUORUM-AIO")[0].sev === "info");

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "", "[network]", "ctl01", "",
                "[compute]", "cmp01 ansible_host=10.0.0.21", "", "[storage]", "cmp01", "",
                "[monitoring]", "ctl01", ""]));
ok("1 węzeł sterujący bez roli compute -> błąd, nie wyjątek",
   hasCode(r, "QUORUM-COUNT") && !hasCode(r, "QUORUM-AIO"));

console.log("grupy z własną obsadą:");
r = runInv(inv(CTL3.concat(["[mariadb:children]", "control", ""])));
ok("[mariadb] dziedziczące z control -> bez osobnego wpisu", !hasCode(r, "QUORUM-COUNT"));

r = runInv(inv(CTL3.concat(["[mariadb]", "ctl01", "ctl02", ""])));
ok("[mariadb] z własnymi 2 hostami -> błąd", hasCode(r, "QUORUM-COUNT"));
ok("wpis dotyczy mariadb, nie control", /\[mariadb\]/.test(find(r, "QUORUM-COUNT")[0].msg));

r = runInv(inv(CTL3.concat(["[etcd]", "ctl01", "ctl02", "", "[rabbitmq]", "ctl01", "ctl02", ""])));
ok("każda grupa liczona osobno", find(r, "QUORUM-COUNT").length === 2);

console.log("klaster RAFT OVN (KV-03):");
r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", ""])));
ok("3 hosty -> brak alarmu", !hasCode(r, "QUORUM-OVN"));

r = runInv(inv(CTL3.concat(["[ovn-database]", "ctl01", "ctl02", ""])));
ok("2 hosty -> błąd", find(r, "QUORUM-OVN")[0] && find(r, "QUORUM-OVN")[0].sev === "error");
ok("opisany tryb awarii (zamrożona chmura)", /read-only/.test(find(r, "QUORUM-OVN")[0].hint));

r = runInv(inv(CTL3.concat(["[ovn-database]", "ctl01", "ctl02", "ctl03", "cmp01", "ctl04", ""])));
ok("5 hostów -> błąd (powyżej 3)", hasCode(r, "QUORUM-OVN"));

r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-nb-db:children]", "ovn-database", "",
                            "[ovn-sb-db:children]", "ovn-database", ""])));
ok("grupy dziedziczące -> bez zdublowanych wpisów", !hasCode(r, "QUORUM-OVN"));

r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-nb-db]", "ctl01", "ctl02", ""])));
ok("[ovn-nb-db] z własną obsadą -> jeden wpis", find(r, "QUORUM-OVN").length === 1);
ok("wpis dotyczy ovn-nb-db", /ovn-nb-db/.test(find(r, "QUORUM-OVN")[0].msg));

r = runInv(inv(CTL3.concat(["[ovn-database]", "ctl01", ""])));
ok("1 host przy 3 sterujących -> informacja o SPOF",
   find(r, "QUORUM-OVN")[0] && find(r, "QUORUM-OVN")[0].sev === "info");

r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-northd]", "ctl01", ""])));
ok("northd na innej liście -> uwaga", hasCode(r, "OVN-NORTHD"));
r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-northd:children]", "ovn-database", ""])));
ok("northd zgodny z bazą -> brak uwagi", !hasCode(r, "OVN-NORTHD"));

console.log("monitory Ceph:");
r = runInv(inv(CTL3.concat(["[ceph-mon]", "ctl01", "ctl02", ""])));
ok("obecność [ceph-mon] -> informacja o zakresie Kolli", hasCode(r, "CEPH-OUTSIDE-KOLLA"));
ok("2 monitory -> uwaga o kworum", hasCode(r, "QUORUM-CEPH"));
r = runInv(inv(CTL3));
ok("brak [ceph-mon] -> cisza", !hasCode(r, "CEPH-OUTSIDE-KOLLA") && !hasCode(r, "QUORUM-CEPH"));

console.log("brak fałszywych alarmów:");
r = runInv(inv(CTL3.concat(["[ovn-database:children]", "control", "",
                            "[ovn-nb-db:children]", "ovn-database", "",
                            "[ovn-sb-db:children]", "ovn-database", "",
                            "[ovn-northd:children]", "ovn-database", "",
                            "[mariadb:children]", "control", "",
                            "[rabbitmq:children]", "control", "",
                            "[etcd:children]", "control", ""])));
ok("wzorcowe inventory 3-węzłowe -> zero błędów kworum",
   !hasCode(r, "QUORUM-COUNT") && !hasCode(r, "QUORUM-OVN") && !hasCode(r, "OVN-NORTHD"));
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
ok("role rozłączne -> cisza", !hasCode(r, "COLLOCATION-CONTROL-COMPUTE"));

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "net01 ansible_host=10.0.0.21", "net02 ansible_host=10.0.0.22", "",
                "[compute]", "ctl01", "ctl02", "ctl03", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
/* Amendment KV-04: w walidatorze jednoplikowym to uwaga — warunek eskalacji
   (enable_masakari) leży w globals.yml, którego ten tool nie widzi. */
ok("hiperkonwergencja 3-węzłowa -> uwaga, nie błąd",
   find(r, "COLLOCATION-CONTROL-COMPUTE")[0] &&
   find(r, "COLLOCATION-CONTROL-COMPUTE")[0].sev === "warn");
ok("opisany tryb awarii (kaskada Masakari)",
   /hostmonitor/.test(find(r, "COLLOCATION-CONTROL-COMPUTE")[0].hint));
ok("wpis nazywa warunek eskalacji",
   /enable_masakari/.test(find(r, "COLLOCATION-CONTROL-COMPUTE")[0].hint));
ok("wpis mówi, że bez Masakari to poprawny wzorzec",
   /valid hyperconverged layout/.test(find(r, "COLLOCATION-CONTROL-COMPUTE")[0].hint));
ok("KV-04 zachowuje konkret kaskady",
   /restrict_to_remotes = false/.test(find(r, "COLLOCATION-CONTROL-COMPUTE")[0].hint) &&
   /Cascade/.test(find(r, "COLLOCATION-CONTROL-COMPUTE")[0].hint));

/* regresja: stara reguła patrzyła na bezpośrednie członkostwo i tego nie widziała */
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12", "",
                "[control:children]", "dodatkowe", "",
                "[dodatkowe]", "cmp01", "",
                "[network]", "net01 ansible_host=10.0.0.21", "net02 ansible_host=10.0.0.22", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("przecięcie przez :children też wykryte", hasCode(r, "COLLOCATION-CONTROL-COMPUTE"));

r = runInv(inv(["[control]", "aio01 ansible_host=10.0.0.11", "", "[network]", "aio01", "",
                "[compute]", "aio01", "", "[storage]", "aio01", "", "[monitoring]", "aio01", ""]));
ok("AIO -> bez alarmu kolokacji", !hasCode(r, "COLLOCATION-CONTROL-COMPUTE"));
ok("AIO -> bez alarmu kolokacji magazynu", !hasCode(r, "COLLOCATION-STORAGE"));

console.log("[network] pod OVN (KV-11):");
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network:children]", "control", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("[network:children] = control -> uwaga", hasCode(r, "COLLOCATION-NETWORK"));
ok("uwaga, nie błąd", find(r, "COLLOCATION-NETWORK")[0].sev === "warn");
ok("nazwany kompromis (enable-chassis-as-gw)",
   /enable-chassis-as-gw/.test(find(r, "COLLOCATION-NETWORK")[0].hint));
ok("KV-11 niesie wyjątek z rulesetu (kolokacja z compute jest poprawna)",
   /valid pattern/.test(find(r, "COLLOCATION-NETWORK")[0].hint));
ok("wskazany klucz łagodzący",
   /neutron_ovn_distributed_fip/.test(find(r, "COLLOCATION-NETWORK")[0].hint));

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network:children]", "compute", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("[network:children] = compute -> poprawny wzorzec, cisza", !hasCode(r, "COLLOCATION-NETWORK"));
ok("i bez alarmu o braku HA bramy", !hasCode(r, "GATEWAY-NO-HA"));

r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "ctl01", "net02 ansible_host=10.0.0.22", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("częściowe przecięcie network/control -> uwaga", hasCode(r, "COLLOCATION-NETWORK"));
ok("wymienia konkretny host", /ctl01/.test(find(r, "COLLOCATION-NETWORK")[0].msg));

console.log("redundancja bramy:");
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "net01 ansible_host=10.0.0.21", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("1 węzeł sieciowy przy 2 obliczeniowych -> uwaga", hasCode(r, "GATEWAY-NO-HA"));
r = runInv(inv(DISJOINT));
ok("2 węzły sieciowe -> cisza", !hasCode(r, "GATEWAY-NO-HA"));
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "net01 ansible_host=10.0.0.21", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "",
                "[storage]", "str01 ansible_host=10.0.0.41", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("1 węzeł sieciowy przy 1 obliczeniowym -> poniżej progu, cisza", !hasCode(r, "GATEWAY-NO-HA"));

console.log("kolokacja magazynu:");
r = runInv(inv(["[control]", "ctl01 ansible_host=10.0.0.11", "ctl02 ansible_host=10.0.0.12",
                "ctl03 ansible_host=10.0.0.13", "",
                "[network]", "net01 ansible_host=10.0.0.21", "net02 ansible_host=10.0.0.22", "",
                "[compute]", "cmp01 ansible_host=10.0.0.31", "cmp02 ansible_host=10.0.0.32", "",
                "[storage]", "cmp01", "cmp02", "",
                "[monitoring]", "mon01 ansible_host=10.0.0.51", ""]));
ok("[storage] na węzłach compute -> informacja",
   find(r, "COLLOCATION-STORAGE")[0] && find(r, "COLLOCATION-STORAGE")[0].sev === "info");
ok("nazwany kompromis (rezerwa zasobów)",
   /resource reserve/.test(find(r, "COLLOCATION-STORAGE")[0].hint));
r = runInv(inv(DISJOINT));
ok("magazyn osobno -> cisza", !hasCode(r, "COLLOCATION-STORAGE"));

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
   find(r, "KV-07-CINDER-CLUSTER")[0] && find(r, "KV-07-CINDER-CLUSTER")[0].sev === "error");
ok("KV-07 zachowuje konkret naprawy",
   /cinder-manage volume update_host/.test(find(r, "KV-07-CINDER-CLUSTER")[0].hint) &&
   /@ceph#ceph/.test(find(r, "KV-07-CINDER-CLUSTER")[0].hint));
ok("wskazuje linię grupy w inventory i brak klucza w globals",
   find(r, "KV-07-CINDER-CLUSTER")[0].refs.some(function (x) { return x.src === "inventory" && x.line > 0; }) &&
   find(r, "KV-07-CINDER-CLUSTER")[0].refs.some(function (x) { return x.src === "globals" && !x.line; }));
r = withGlobals(INV3, '---\ncinder_cluster_name: prod\n');
ok("z cinder_cluster_name -> cisza", !hasCode(r, "KV-07-CINDER-CLUSTER"));
r = withGlobals(INV3, '---\nenable_cinder_backend_lvm: "yes"\n');
ok("backend LVM bez współdzielenia -> zwolnienie z reguły", !hasCode(r, "KV-07-CINDER-CLUSTER"));

console.log("KV-09 — VIP wobec adresów hostów:");
r = withGlobals(INV3, '---\nkolla_internal_vip_address: "10.80.0.31"\n');
ok("VIP równy adresowi hosta -> błąd", find(r, "KV-09-VIP-COLLISION")[0] &&
   find(r, "KV-09-VIP-COLLISION")[0].sev === "error");
ok("wskazuje host w inventory i klucz w globals",
   find(r, "KV-09-VIP-COLLISION")[0].refs.length === 2);
r = withGlobals(INV3, '---\nkolla_internal_vip_address: "192.168.5.9"\n');
ok("VIP poza wnioskowaną podsiecią -> uwaga, nie błąd",
   find(r, "KV-09-VIP-SUBNET")[0] && find(r, "KV-09-VIP-SUBNET")[0].sev === "warn");
/* Maska musi paść w treści — reguła bez tego zdania jest blefem. Sprawdzamy to
   w OBU językach, bo zgubienie zastrzeżenia w tłumaczeniu byłoby cichą utratą
   pokory, a nie usterką kosmetyczną. */
ok("wpis podaje założoną maskę wprost",
   /10\.80\.0\.0\/24/.test(find(r, "KV-09-VIP-SUBNET")[0].msg) &&
   /inference rather than a reading/.test(find(r, "KV-09-VIP-SUBNET")[0].hint));
r = withGlobals(INV3, '---\nkolla_internal_vip_address: "10.80.0.250"\n');
ok("VIP wolny w tej samej podsieci -> cisza",
   !hasCode(r, "KV-09-VIP-COLLISION") && !hasCode(r, "KV-09-VIP-SUBNET"));
r = withGlobals(INV3, '---\nenable_haproxy: "no"\nkolla_internal_vip_address: "10.80.0.31"\n');
ok("zewnętrzny load balancer (enable_haproxy: no) -> zwolnienie", !hasCode(r, "KV-09-VIP-COLLISION"));

console.log("globals nieparsowalny:");
r = withGlobals(INV3, '---\nklucz: |\n  blok\n');
ok("błąd parsera globals trafia do listy ze źródłem globals",
   r.findings.some(function (f) { return f.src === "globals" && f.sev === "error"; }));
ok("reguły dwuplikowe nie ruszają na niepełnym pliku",
   !hasCode(r, "KV-01-FENCING") && !hasCode(r, "KV-07-CINDER-CLUSTER"));

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
   hasCode(r, "GROUP-RETIRED") && !hasCode(r, "UPGRADE-GROUP-RETIRED"));
ok("i dokładnie raz", mentioning(r, "zun").length === 1,
   JSON.stringify(mentioning(r, "zun").map(function (f) { return f.code; })));

r = withPath(INV_ZUN, "2025.1", "2026.1");
ok("grupa wycofana w wydaniu DOCELOWYM -> zgłasza tryb aktualizacji",
   hasCode(r, "UPGRADE-GROUP-RETIRED") && !hasCode(r, "GROUP-RETIRED"));
ok("i dokładnie raz, bez dubla w dwóch wagach", mentioning(r, "zun").length === 1,
   JSON.stringify(mentioning(r, "zun").map(function (f) { return f.code + "/" + f.sev; })));

/* Wydanie startowe nie jest punktem na ścieżce — ale jego własne deprecacje grup
   nadal łapie releaseRules. To jest miejsce, w którym mogłaby powstać luka. */
var INV_MURANO = INV3 + "\n[murano]\nc1\n";
r = withPath(INV_MURANO, "2024.1", "2026.1");
ok("deprecacja z wydania startowego nie ginie między regułami",
   mentioning(r, "murano").length === 1 && hasCode(r, "GROUP-RETIRED"));
ok("i nie jest powtórzona przez tryb aktualizacji", !hasCode(r, "UPGRADE-GROUP-RETIRED"));

console.log("granica kluczy globals.yml:");
var GLOB_LE = '---\nletsencrypt_cert_server: "https://acme-v02.api.letsencrypt.org/directory"\n';
r = withPath(INV3, "2025.1", "", GLOB_LE);
ok("klucz wycofany w wydaniu obecnym -> walidator milczy (to zakres generatora)",
   mentioning(r, "letsencrypt_cert_server").length === 0);
r = withPath(INV3, "2024.2", "2025.1", GLOB_LE);
ok("ten sam klucz na ścieżce -> zgłoszony raz przez tryb aktualizacji",
   mentioning(r, "letsencrypt_cert_server").length === 1 &&
   hasCode(r, "UPGRADE-KEY-RENAMED"));

/* ---- aktualność wyniku (#38) ----
   Odcisk wejścia jest jedyną częścią rozwiązania, która chroni przed przypadkiem,
   którego nie przewidzieliśmy: naprawa wyzwalaczy leczy znane, odcisk leczy klasę. */
console.log("odcisk wejścia:");
var fp1 = T.inputFingerprint();
ok("odcisk jest napisem", typeof fp1 === "string" && fp1.length > 0);
document.getElementById("src").value = "[control]\nc1\n";
ok("zmiana inventory zmienia odcisk", T.inputFingerprint() !== fp1);
var fp2 = T.inputFingerprint();
document.getElementById("gsrc").value = "---\nenable_masakari: \"yes\"\n";
ok("zmiana globals zmienia odcisk", T.inputFingerprint() !== fp2);
var fp3 = T.inputFingerprint();
document.getElementById("release_to").value = "2026.1";
ok("zmiana wydania docelowego zmienia odcisk", T.inputFingerprint() !== fp3);
var fp4 = T.inputFingerprint();
document.getElementById("ack_nobmc").checked = true;
ok("zmiana potwierdzenia zmienia odcisk", T.inputFingerprint() !== fp4);
document.getElementById("ack_nobmc").checked = false;
ok("cofnięcie potwierdzenia przywraca odcisk", T.inputFingerprint() === fp4);
/* Odcisk musi zależeć WYŁĄCZNIE od wejścia. Gdyby zależał od czegokolwiek innego,
   pasek nieaktualności zapalałby się bez powodu i nauczyłby ignorowania siebie. */
ok("ten sam stan pól daje ten sam odcisk", T.inputFingerprint() === T.inputFingerprint());

/* ---- tabela wyzwalaczy (#38) ----
   Zgłoszenie brzmiało "wynik czasem się nie odświeża". Diagnoza: KAŻDE pole musi
   mieć podpięte zdarzenie, którym przeglądarka rzeczywiście sygnalizuje zmianę —
   a to nie zawsze jest 'input'. Autouzupełnianie i zatwierdzenie wartości przy
   utracie ogniska dają w części przeglądarek wyłącznie 'change'; powrót karty
   z bfcache nie daje żadnego zdarzenia i wymaga 'pageshow'.

   Ta tabela jest asercją, nie komentarzem: stub DOM zapamiętuje podpięcia, więc
   brak wyzwalacza nie przechodzi. Bez tego test sprawdzałby tylko, że wywołanie
   addEventListener nie rzuca. */
console.log("wyzwalacze ponownej analizy:");
var TRIGGERS = [
  ["src", "input", "pisanie i wklejanie w inventory"],
  ["src", "change", "autouzupełnianie i zatwierdzenie przy utracie ogniska"],
  ["gsrc", "input", "pisanie i wklejanie w globals"],
  ["gsrc", "change", "autouzupełnianie w globals"],
  ["release", "change", "zmiana wydania"],
  ["release_to", "change", "zmiana wydania docelowego"],
  ["ack_nobmc", "change", "potwierdzenie świadomej decyzji"],
  ["file", "change", "wybór pliku inventory z dialogu"],
  ["gfile", "change", "wybór pliku globals z dialogu"]
];
TRIGGERS.forEach(function (t) {
  ok(t[0] + " nasłuchuje " + t[1] + " — " + t[2],
     document.getElementById(t[0]).listensTo(t[1]));
});
ok("edytor przyjmuje upuszczenie pliku", document.getElementById("editor").listensTo("drop"));
ok("pole globals przyjmuje upuszczenie pliku", document.getElementById("gsrc").listensTo("drop"));
/* Powrót z bfcache nie daje żadnego zdarzenia wejścia — bez pageshow pola wracają
   wypełnione, a na ekranie zostaje wynik sprzed uśpienia karty. */
ok("okno nasłuchuje pageshow — powrót karty z bfcache", window.listensTo("pageshow"));

console.log("raport:");
var res = run("", "2026.1");
var rep = T.buildReport(res, { e: 0, w: 0, i: 0 });
ok("zawiera wiersz z wydaniem", /Release: 2026\.1 Gazpacho \(kolla-ansible 22\.x\)/.test(rep),
   rep.split("\n").slice(0, 6).join(" | "));
ok("raport nie niesie wiersza o języku — narzędzie jest jednojęzyczne",
   !/^Language:/m.test(rep));
R.finish();
