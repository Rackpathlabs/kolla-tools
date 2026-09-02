/* Test dymny generatora: reguły macierzy wydań i walidacja pól. */
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2],
  ["validate", "findRelease", "DISTROS", "KOLLA_MATRIX", "buildYaml", "badFields",
   "DEFAULTS", "baseDev", "physnets", "LINT", "DIAG_IDS",
   "overrides", "overridesText", "I18N",
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
  return r.deprecated.every(function (x) {
    return ["key", "group", "service", "procedure"].indexOf(x.kind) !== -1 && !!x.name;
  });
}));
ok("każde wydanie deklaruje, czy deprecacje są skatalogowane",
   M.releases.every(function (r) { return typeof r.deprecationsCatalogued === "boolean"; }));
/* Pusta lista przy zadeklarowanym katalogowaniu jest dopuszczalna, ale odwrotność
   nie: wydanie nieskatalogowane nie ma prawa udawać, że coś wie. */
ok("wydanie nieskatalogowane ma pustą listę deprecacji",
   M.releases.every(function (r) { return r.deprecationsCatalogued || r.deprecated.length === 0; }));
ok("każda deprecacja ma wagę z dozwolonego zbioru",
   M.releases.every(function (r) {
     return r.deprecated.every(function (x) { return ["error", "warn", "info"].indexOf(x.sev) !== -1; });
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
   has(d, "info", /set explicitly in the file/) &&
   !has(d, "warn", /om_enable_rabbitmq_stream_fanout/));
ok("2025.1 nie wspomina o kluczach nie-notable",
   !has(d, "info", /enable_ironic_inspector/));
ok("2025.1 wypisuje systemy hosta", has(d, "info", /Ubuntu Noble/));

d = T.validate(base({ release: "2025.2", distro: "centos" }));
ok("centos w 2025.2 -> uwaga o braku obrazów", has(d, "warn", /publishes no images for it/));

/* docs 2025.1: "Kolla does not publish CS9/10 based images" */
d = T.validate(base({ release: "2025.1", distro: "centos" }));
ok("centos w 2025.1 -> uwaga o braku obrazów", has(d, "warn", /publishes no images for it/));

/* docs 2024.1: "Kolla does not publish CS9 based images" */
d = T.validate(base({ release: "2024.1", distro: "centos" }));
ok("centos w 2024.1 -> uwaga o braku obrazów", has(d, "warn", /publishes no images for it/));

d = T.validate(base({ release: "2025.1", distro: "rocky" }));
ok("rocky w 2025.1 -> bez uwagi o obrazach", !has(d, "warn", /nie publikuje/));

d = T.validate(base({ release: "2024.2" }));
ok("2024.2 -> uwaga o EOL", has(d, "warn", /end of life/));
ok("2024.2 -> data wycofania z pola endsOn", has(d, "warn", /since: <code>2026-04-29<\/code>/));

d = T.validate(base({ release: "2024.1" }));
ok("2024.1 -> uwaga o braku utrzymania", has(d, "warn", /unmaintained/));
ok("2024.1 bez znanej daty -> bez ogona z datą", !has(d, "warn", /unmaintained.* — since:/));

d = T.validate(base({ release: "2026.2" }));
ok("2026.2 -> uwaga o gałęzi rozwojowej", has(d, "warn", /development branch/));
ok("2026.2 -> data planowanego wydania, nie końca wsparcia",
   has(d, "warn", /expected release: <code>2026-09-30<\/code>/));

d = T.validate(base({ release: "2026.1" }));
ok("2026.1 (wspierane) -> brak uwagi o statusie",
   !has(d, "warn", /end of life|unmaintained|development branch/));
ok("2026.1 podaje prefetch QoS jako informację, nie uwagę",
   has(d, "info", /om_rabbitmq_qos_prefetch_count/) &&
   !has(d, "warn", /om_rabbitmq_qos_prefetch_count/));
ok("waga wpisu pochodzi z macierzy, nie z kodu",
   M.keys.om_enable_rabbitmq_stream_fanout.sev === "warn" &&
   M.keys.om_rabbitmq_qos_prefetch_count.sev === "info");

d = T.validate(base({ release: "2019.1" }));
ok("spoza macierzy -> uwaga", has(d, "warn", /does not appear in the release matrix/));

d = T.validate(base({ release: "master" }));
ok("master -> bez uwagi o macierzy", !has(d, "warn", /does not appear in the release matrix/));

/* ---- ruleset KV po stronie globals.yml ---- */

console.log("KV-05 — magazyn i Corosync na jednym łączu:");
d = T.validate(base());
ok("domyślnie storage dziedziczy network -> uwaga", has(d, "warn", /sit on the same device/));
d = T.validate(base({ t_hacluster: true }));
ok("z enable_hacluster -> błąd", has(d, "error", /sit on the same device/));
d = T.validate(base({ t_hacluster: true, ack_link: true }));
ok("potwierdzenie obniża do informacji", has(d, "info", /sit on the same device/));
ok("potwierdzenie nie wycisza wpisu",
   !has(d, "error", /sit on the same device/) && has(d, "info", /measured bandwidth headroom/));
d = T.validate(base({ api_if: "eth0", stg_if: "eth2" }));
ok("osobne urządzenia -> cisza", !has(d, "warn", /sit on the same device/));
d = T.validate(base({ api_if: "bond0.10", stg_if: "bond0.20" }));
ok("bond0.10 vs bond0.20 -> to samo bond0", has(d, "warn", /bond0/));
ok("porównanie po urządzeniu bazowym", T.baseDev("bond0.20") === "bond0");

console.log("KV-06 — migracja na łączu API:");
/* Drabina z Amendment: waga nie przekracza tego, co plik udowadnia. */
var MIG = /migration_interface<\/code> is unset/;
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
ok("potwierdzenie obniża do informacji", has(d, "info", /migration_interface<\/code> is unset/));
d = T.validate(base({ api_if: "eth0", mig_if: "eth3" }));
ok("osobny interfejs migracji -> cisza", !has(d, "warn", /migration_interface/));

console.log("KV-10 — interfejs zewnętrzny kontra zarządzanie:");
d = T.validate(base({ net_if: "eth0", ext_if: "eth0" }));
ok("równość wprost -> błąd", has(d, "error", /is the same interface as/));
d = T.validate(base({ net_if: "bond0.10", ext_if: "bond0" }));
ok("wspólny bond -> uwaga", has(d, "warn", /shares a base device/));
d = T.validate(base());
ok("różne urządzenia -> cisza", !has(d, "warn", /shares a base device/));

console.log("KV-13 — sieć amfor Octavii:");
var oct = { t_octavia: true, t_barbican: true, amp_net: "vlan", physnet: "physnet1" };
d = T.validate(base(oct));
ok("vlan bez sieci provider -> błąd", has(d, "error", /requires <code>enable_neutron_provider_networks/));
d = T.validate(base(Object.assign({}, oct, { t_provider: true })));
ok("physnet1 przy jednym interfejsie -> cisza", !has(d, "error", /does not follow from the external interface list/));
d = T.validate(base(Object.assign({}, oct, { t_provider: true, physnet: "physnet2" })));
ok("physnet2 przy jednym interfejsie -> błąd", has(d, "error", /does not follow from the external interface list/));
d = T.validate(base(Object.assign({}, oct, { t_provider: true, physnet: "physnet2",
                                            ext_if: "eth1,eth2", br_name: "br-ex,br-ex2" })));
ok("dwa interfejsy -> physnet2 dostępny", !has(d, "error", /does not follow from the external interface list/));
ok("physnety wynikają z pozycji na liście",
   T.physnets({ ext_if: "eth1,eth2,eth3" }).join(",") === "physnet1,physnet2,physnet3");
d = T.validate(base({ ext_if: "eth1,eth2", br_name: "br-ex" }));
ok("liczba mostków != liczba interfejsów -> błąd", has(d, "error", /Exactly one bridge belongs/));

console.log("KV-14 — TLS wewnętrzny, nazwy i adresy:");
d = T.validate(base({ t_tls_int: true }));
ok("TLS bez CA i bez Let's Encrypt -> błąd", has(d, "error", /will not trust a private CA/));
d = T.validate(base({ t_tls_int: true, t_copy_ca: true }));
ok("z kolla_copy_ca_into_containers -> cisza", !has(d, "error", /will not trust a private CA/));
d = T.validate(base({ t_tls_int: true, t_letsencrypt: true }));
ok("z Let's Encrypt -> cisza", !has(d, "error", /will not trust a private CA/));
d = T.validate(base({ int_fqdn: "cloud.example.net", ext_fqdn: "cloud.example.net" }));
ok("identyczne FQDN -> błąd", has(d, "error", /are identical/));
d = T.validate(base({ ext_vip: "203.0.113.10" }));
ok("różne VIP-y bez FQDN -> błąd", has(d, "error", /both FQDNs are empty/));
d = T.validate(base({ ext_vip: "10.0.0.250", ext_vip_if: "eth9" }));
ok("ten sam VIP na innym interfejsie -> błąd", has(d, "error", /claim one address twice/));

console.log("zależności usług:");
d = T.validate(base({ t_cinder: true }));
ok("Cinder bez backendu -> błąd", has(d, "error", /enable_cinder<\/code> requires a storage backend/));
d = T.validate(base({ t_cinder: true, storage: "lvm" }));
ok("Cinder z LVM -> cisza", !has(d, "error", /enable_cinder<\/code> wymaga/));
d = T.validate(base({ t_grafana: true }));
ok("Grafana bez Prometheusa -> błąd", has(d, "error", /enable_grafana<\/code> requires/));
d = T.validate(base({ t_octavia: true }));
ok("Octavia bez Barbicana -> błąd", has(d, "error", /enable_octavia<\/code> requires/));
d = T.validate(base({ t_masakari: true }));
ok("Masakari bez hacluster -> błąd", has(d, "error", /enable_masakari<\/code> requires/));

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
   /# Keys added on export from the generator/.test(P.emit(P.parse(src), { nowy: "x" }).text));
ok("klucz niebędący skalarem jest pomijany, nie psuty",
   P.emit(P.parse("---\nlista:\n  - a\n"), { lista: "x" }).skipped.join(",") === "lista");

console.log("parser — przegląd kluczy wobec wydania:");
doc = P.parse('---\nom_enable_rabbitmq_high_availability: "yes"\nnieznany_klucz: 1\n');
var rv = P.review(doc, T.findRelease("2025.1"), { om_enable_rabbitmq_high_availability: 1 });
ok("wycofany klucz z wagą z macierzy",
   rv.some(function (f) { return f.code === "KEY-DEPRECATED" && f.sev === "error" && f.line === 2; }));
ok("nieznany klucz jako informacja",
   rv.some(function (f) { return f.code === "KEY-UNKNOWN" && f.sev === "info" && f.line === 3; }));
ok("bez wydania brak uwag o wycofaniu",
   !P.review(doc, null, {}).some(function (f) { return f.code === "KEY-DEPRECATED"; }));

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

console.log("styk kontraktu KV-12a z importem:");
/* Jedyne miejsce, gdzie dwie zasady się stykają: kontrakt „generator wypisuje klucz
   krytyczny jawnie" kontra „import niczego nie dopisuje". Wygrywa round-trip bajtowy,
   a brak klucza ma być diagnostyką — nie edycją cudzego pliku. */
var noKey = '---\nkolla_base_distro: "rocky"\nopenstack_release: "2025.1"\nenable_haproxy: "yes"\n';
var docNo = P.parse(noKey);
var stNo = T.rawStateFromParsed(docNo);
var dNo = T.validate(stNo, docNo);
ok("import bez klucza -> uwaga, a nie fałszywa informacja o jawnym ustawieniu",
   has(dNo, "warn", /om_enable_rabbitmq_stream_fanout/) && !has(dNo, "info", /set explicitly in the file/));
ok("komunikat mówi wprost, że import nie dopisuje kluczy",
   has(dNo, "warn", /does not add missing keys/));
ok("eksport nie dopisuje klucza — plik wraca bajtowo identyczny",
   P.emit(docNo, T.changedOverrides(docNo, stNo)).text === noKey);

var docYes = P.parse(noKey.replace("enable_haproxy",
  'om_enable_rabbitmq_stream_fanout: "yes"\nenable_haproxy'));
ok("import z kluczem -> informacja o jawnym ustawieniu",
   has(T.validate(T.rawStateFromParsed(docYes), docYes), "info", /set explicitly in the file/));

ok("tryb generowania od zera nadal spełnia kontrakt KV-12a",
   has(T.validate(base(), null), "info", /set explicitly in the file/) &&
   !has(T.validate(base(), null), "warn", /om_enable_rabbitmq_stream_fanout/));

/* ZAKAZ KONSTRUKCJI, nie kontrola treści. #64: #status-txt niósł w markupie
   "Konfiguracja poprawna." — werdykt orzeczony, zanim cokolwiek zostało sprawdzone,
   i w formie, której SCOPE.md zabrania wprost ("correct" o cudzej konfiguracji).
   Widać go było wyłącznie przed wykonaniem JS albo gdy JS padnie, czyli dokładnie
   wtedy, gdy nic nie zostało sprawdzone i kiedy kłamał najgłośniej.

   Asercja pyta o KSZTAŁT, nie o treść: kontrola „nie ma tam słowa correct" przepuściłaby
   każde inne zdanie, o którym autor nie pomyślał, a zakazane jest ORZEKANIE, nie wyraz.

   KSZTAŁT ZMIENIŁ SIĘ PRZY ADR-002 (opcja B) i jest to jedyne miejsce, w którym te dwie
   decyzje się zderzyły. Do 2026-08-19 brzmiał „element jest w źródle PUSTY". Opcja B
   wymaga, żeby tekst domyślny stał w markupie, więc pustego elementu już nie ma i nie ma
   go mieć: bez JavaScriptu użytkownik ma przeczytać „Not checked yet." zamiast patrzeć
   na puste miejsce.

   Zakaz jest ten sam i dalej jest kształtem, tylko przeniesiony o jeden poziom:
   element ma nieść klucz stanu sprzed sprawdzenia, jego tekst ma być RÓWNY wpisowi
   słownika przy tym kluczu (pilnuje tego check-markup-dict.js na wszystkich 119
   podstawieniach), a ten wpis nie ma prawa orzekać poprawności. Dowolne zdanie wpisane
   tu ręcznie przestaje przechodzić nie dlatego, że ktoś je przeczytał, tylko dlatego,
   że nie równa się słownikowi. Osłabieniem byłoby dopiero porzucenie któregokolwiek
   z tych trzech ogniw. */
console.log("werdykt:");
var pendingVal = (require("fs").readFileSync(require("path").join(__dirname, "..", "..", "i18n.js"), "utf8")
  .match(/"g\.verdict\.pending"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1];
var genHtml = require("fs").readFileSync(require("path").join(__dirname, "..", "..", "generator.html"), "utf8");
var statusEl = genHtml.match(/<span id="status-txt"[^>]*>([\s\S]*?)<\/span>/);
ok("element werdyktu istnieje w markupie", !!statusEl);
ok("i jego tekst w źródle jest RÓWNY wpisowi słownika, a nie zdaniem wpisanym ręcznie",
   !!statusEl && !!pendingVal && statusEl[1].replace(/\s+/g, " ").trim() === pendingVal,
   statusEl && JSON.stringify(statusEl[1]));
ok("niesie klucz stanu sprzed sprawdzenia",
   !!statusEl && /data-i18n="g\.verdict\.pending"/.test(statusEl[0]), statusEl && statusEl[0]);
/* Pierwsza wersja tej asercji brzmiała !/correct|valid/.test(T.I18N ? "" : "") —
   czyli testowała pusty napis i przechodziła zawsze. Pusty zielony we własnym
   teście, napisany w commicie o werdykcie orzekanym bez sprawdzenia. Zostaje
   zapisana, bo trafiła dokładnie w klasę, którą ten commit naprawia. */
var pending = require("fs").readFileSync(require("path").join(__dirname, "..", "..", "i18n.js"), "utf8")
  .match(/"g\.verdict\.pending"\s*:\s*"((?:[^"\\]|\\.)*)"/);
ok("klucz stanu początkowego istnieje w słowniku", !!pending);
ok("i nie orzeka poprawności — SCOPE.md zabrania twierdzenia 'correct' o cudzym pliku",
   !!pending && !/\b(correct|valid|poprawn)/i.test(pending[1]), pending && pending[1]);


/* ---- stabilne identyfikatory diagnostyki (#26) ----
   Kontrakt jest DWUKIERUNKOWY i drugi kierunek jest ważniejszy.

   W jedną stronę: żaden emitowany identyfikator nie może być spoza DIAG_IDS.
   To zamyka drogę „wymyśl ID w miejscu wywołania", przez którą tabela stałaby się
   dokumentacją nieaktualną od pierwszej nowej reguły.

   W drugą: żadna pozycja tabeli nie może być nieosiągalna inaczej niż z zapisanym
   powodem. Martwy wpis wygląda na przemyślany i właśnie dlatego jest gorszy od
   braku wpisu — to samo zdanie co przy martwej kategorii wyjątku i przy martwym
   zwolnieniu w check-rendered.js. */
console.log("identyfikatory diagnostyki:");

var DRIVE = [
  {}, {distro:"zzz"}, {release:""}, {release:"a b!"}, {release:"stable/master"},
  {release:"victoria"}, {release:"20.1"}, {release:"stable/2019.2"}, {release:"2026.2"},
  {release:"2024.1"}, {release:"2026.1",distro:"centos"},
  /* 2026.2 zdjęło centosa (nota wydania), więc ta para przestała być hipotetyczna:
     distro jest na liście DISTROS i nie ma go na baseDistros wydania. Do wczoraj
     ta pozycja stała w UNREACHED z powodem „żadne wydanie nie odrzuca dziś obrazu
     z DISTROS" — powód przestał być prawdziwy razem ze zmianą danych. */
  {release:"2026.2",distro:"centos"},
  {vip:""}, {vip:"999.1.1.1"}, {vip:"127.0.0.1"}, {vip:"169.254.1.1"}, {vip:"10.0.0.0"},
  {vip:"10.0.0.255"}, {vip:"192.0.2.5"}, {vip:"100.70.0.5"}, {vip:"8.8.8.8"},
  {ext_if:""}, {net_if:""}, {net_if:"averyveryverylongifname0"}, {net_if:"10.0.0.1"},
  {net_if:"eth0!"}, {net_if:"lo"}, {br_name:"br-ex,br-ex2"}, {ext_if:"bond0,bond1",br_name:"br-ex"},
  {net_if:"bond0.10",api_if:"bond0.10",stg_if:"bond0.10",t_hacluster:true},
  {t_masakari:true,t_hacluster:true,mig_if:""},
  {net_if:"bond0.10",ext_if:"bond0"}, {net_if:"bond0",ext_if:"bond0"},
  {t_octavia:true,amp_net:"vlan",physnet:"physnet9",ext_if:"bond0"},
  {t_octavia:true,amp_net:"vlan",t_provider:true,physnet:"physnet1"},
  {t_octavia:true,amp_net:"flat"}, {t_tls_int:true,t_copy_ca:false},
  {int_fqdn:"a.example.net",ext_fqdn:"a.example.net"},
  {int_fqdn:"",ext_fqdn:"",vip:"10.0.0.250",ext_vip:"10.0.1.250"},
  {vip:"10.0.0.250",ext_vip:"10.0.0.250",ext_vip_if:"bond9"},
  {t_cinder:true,storage:"none"}, {t_grafana:true,t_prometheus:false},
  {t_octavia:true,t_barbican:false}, {t_masakari:true,t_hacluster:false},
  {t_haproxy:false}, {t_prometheus:true}, {storage:"ceph"}, {t_provider:true,ext_if:"bond0,bond1"}
];

var fired = {};
DRIVE.forEach(function (c) {
  T.validate(base(c), null).forEach(function (x) { fired[x.id] = (fired[x.id] || 0) + 1; });
});
T.validate(base({release:"2026.1"}), T.GLOBALS.parse('---\nkolla_base_distro: "rocky"\n'))
 .forEach(function (x) { fired[x.id] = (fired[x.id] || 0) + 1; });

var alien = Object.keys(fired).filter(function (i) { return !T.DIAG_IDS[i]; });
ok("każda diagnostyka niesie identyfikator z DIAG_IDS", alien.length === 0, alien.join(","));
ok("żadna diagnostyka nie jest bez identyfikatora",
   Object.keys(fired).every(function (i) { return i && i !== "undefined"; }), Object.keys(fired).join(",").slice(0,80));

/* Pozycje, których te konfiguracje nie zapalają — KAŻDA Z POWODEM, nie z liczbą.
   Lista jest zamknięta: dopisanie reguły bez scenariusza ją powiększa i test pada. */
var UNREACHED = {
  /* Poza validate(): te cztery padają w doImport() i refresh(), których ten test
     nie wywołuje — wymagają wczytanego pliku i DOM-u formularza. */
  "IMPORT-VALUE-SANITISED":   "ścieżka importu, nie validate()",
  "IMPORT-NON-SCALAR-KEPT":   "ścieżka importu, nie validate()",
  "IMPORT-TEMPLATE-WITHHELD": "ścieżka importu, nie validate()",
  "SERIALISER-TRIPPED":       "zapora serializera, nie validate()",
  /* Zależy od ŚRODOWISKA, nie od stanu formularza: przeglądarka blokująca
     localStorage. Żadna konfiguracja tego nie ustawia i nie ma jak. */
  "STORAGE-UNAVAILABLE":      "warunek środowiskowy (storageOk), nie stan",
  /* DISTRO-NOT-IN-RELEASE stało tu do 2026-09-02 z powodem „żadne wydanie w macierzy
     nie odrzuca dziś obrazu z DISTROS", policzonym iteracją po wszystkich parach
     (wydanie × distro) i dającym wtedy zero trafień. Zdjęcie centosa z 2026.2 dało
     pierwsze trafienie, więc reguła jest osiągalna i ma własną pozycję w DRIVE.

     Zostawione jako zdanie, a nie skasowane bez śladu: wpis mówił „nieosiągalne przy
     tych danych", nie „martwe", i to rozróżnienie właśnie się opłaciło — reguła odżyła
     przy zmianie danych, dokładnie tak, jak przewidywał. */
};

var unreached = Object.keys(T.DIAG_IDS).filter(function (i) { return !fired[i]; }).sort();
var undocumented = unreached.filter(function (i) { return !UNREACHED[i]; });
ok("każda niezapalona pozycja ma zapisany powód", undocumented.length === 0,
   "bez powodu: " + undocumented.join(","));
var staleReasons = Object.keys(UNREACHED).filter(function (i) { return fired[i]; });
ok("i żaden powód nie jest nieaktualny (pozycja jednak się zapala)",
   staleReasons.length === 0, staleReasons.join(","));
ok("pokrycie: " + (Object.keys(T.DIAG_IDS).length - unreached.length) + " z " +
   Object.keys(T.DIAG_IDS).length + " pozycji zapalonych", true);

/* Reguły rulesetu KV niosą swój numer z przodu — ta sama rodzina co
   KV-01-FENCING i KV-09-VIP-COLLISION po stronie walidatora. */
ok("każda reguła z LINT ma identyfikator z własnym numerem KV",
   Object.keys(T.LINT).filter(function (k) { return /^KV-/.test(k); }).every(function (k) {
     return Object.keys(T.DIAG_IDS).some(function (i) { return i.indexOf(k + "-") === 0; });
   }));

/* ---- widok „tylko to, co się różni" (#9) ----
   Linia odniesienia to STAN POCZĄTKOWY TEGO NARZĘDZIA. Zgłoszenie prosiło o różnicę
   wobec wartości domyślnych Kolla-Ansible i tego nie da się dowieźć uczciwie: macierz
   zna upstreamowy default dla jednego z emitowanych kluczy. Asercje pilnują GRANICY
   TWIERDZENIA, nie tylko działania — bo to ona jest tu najłatwiejsza do zgubienia
   przy pierwszej korekcie redakcyjnej. */
console.log("widok różnic:");

function diffOf(over) {
  var s = base(over);
  return T.overrides(T.buildYaml(s, T.badFields(T.validate(s, null))).text);
}
/* base() ustawia vip, więc stanem POCZĄTKOWYM jest samo DEFAULTS. */
var pristine = {};
Object.keys(T.DEFAULTS).forEach(function (k) { pristine[k] = T.DEFAULTS[k]; });
var zero = T.overrides(T.buildYaml(pristine, T.badFields(T.validate(pristine, null))).text);
ok("stan początkowy nie różni się od samego siebie", zero.length === 0,
   JSON.stringify(zero.map(function (r) { return r.key; })));

var one = diffOf({ vip: "10.0.0.250" });
ok("zmiana jednego pola daje DOKŁADNIE jedną różnicę", one.length === 1,
   JSON.stringify(one.map(function (r) { return r.key; })));
ok("i jest nią ten klucz", one.length === 1 && one[0].key === "kolla_internal_vip_address");

/* Klucz, który w stanie początkowym BYŁ, a teraz go nie ma. Jedyna różnica,
   której nie da się zapisać linią — ma być w zestawieniu i nie ma jej w snippecie. */
var gone = diffOf({ vip: "10.0.0.250", br_name: "" });
var goneRow = gone.filter(function (r) { return r.key === "neutron_bridge_name"; });
ok("klucz zniknięty jest różnicą", goneRow.length === 1, JSON.stringify(gone.map(function(r){return r.key;})));
ok("i ma pustą stronę „teraz\"", goneRow.length === 1 && goneRow[0].now === null);
ok("i NIE trafia do snippetu, bo nie jest linią",
   T.overridesText(gone).indexOf("neutron_bridge_name") === -1, T.overridesText(gone));

/* Wartość odrzucona przez walidację nie jest różnicą WARTOŚCI. Bez tego stan
   początkowy raportował jedną różnicę wobec samego siebie — pusty VIP kontra
   pusty VIP z adnotacją. */
ok("adnotacja odrzucenia nie jest różnicą wartości", diffOf({ vip: "999.9.9.9" }).length === 0,
   JSON.stringify(diffOf({ vip: "999.9.9.9" })));

/* GRANICA TWIERDZENIA. Snippet wyjeżdża poza przeglądarkę i nikt nie zobaczy obok
   niego zdania z interfejsu, więc musi nieść je sam. */
var snip = T.overridesText(one);
ok("snippet nazywa linię odniesienia", /this tool's initial values/.test(snip), snip.split("\n")[0]);
ok("snippet WPROST zaprzecza porównaniu z upstreamem",
   /NOT a comparison against kolla-ansible defaults/.test(snip), snip.split("\n")[1]);

/* Żaden wpis słownika nie ma prawa TWIERDZIĆ porównania z defaultami Kolli.
   Kontrola kształtu, nie treści: szukamy twierdzenia, nie konkretnego zdania. */
var claims = Object.keys(T.I18N.dict).filter(function (k) {
  var v = String(T.I18N.dict[k]);
  return /(differs?|different|compared?)[^.]{0,40}(kolla|upstream)[^.]{0,20}default/i.test(v) &&
         !/\bnot\b/i.test(v);
});
ok("żaden wpis słownika nie twierdzi porównania z defaultami Kolli/upstreamu",
   claims.length === 0, claims.join(","));

/* Wybór widoku nie jest polem konfiguracji — inaczej pojawiłby się we własnym
   zestawieniu jako klucz, którego nie ma w pliku. */
ok("wybór widoku nie jest polem stanu",
   !Object.prototype.hasOwnProperty.call(T.DEFAULTS, "view") &&
   !Object.prototype.hasOwnProperty.call(T.DEFAULTS, "showDiff"));

console.log("YAML:");
var y = T.buildYaml(base(), {});
ok("nagłówek zawiera nazwę wydania", /Epoxy/.test(y.text), y.text.split("\n").slice(0, 8).join(" | "));
ok("nagłówek zawiera serię kolla-ansible", /kolla-ansible 20\.x/.test(y.text));
ok("serializer nie został zatrzymany", y.tripped === false);

R.finish();
