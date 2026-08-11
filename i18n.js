/* Rackpathlabs — słownik interfejsu.
 *
 * ŹRÓDŁO PRAWDY. Ten plik nie jest nigdzie ładowany — narzędzia i hub są
 * samodzielnymi plikami HTML działającymi z file://, więc blok poniżej jest
 * wklejony bajtowo identycznie do generator.html, validator.html i index.html.
 *
 * Zmiana tekstów = edycja TEGO pliku, potem:
 *     bash tools/sync-blocks.sh
 *     bash tools/check-blocks.sh
 *
 * Wcięcie dwóch spacji jest celowe — blok żyje wewnątrz IIFE w plikach HTML.
 *
 * KODY REGUŁ NIE SĄ TEKSTEM. KWORUM-LICZBA, KV-09-VIP-KOLIZJA i pozostałe to
 * stabilne identyfikatory: nie tłumaczymy ich, żeby raporty i wzorce golden
 * pozostały porównywalne między wersjami i między językami.
 */

  /* == KOLLA-I18N BEGIN — generowane z i18n.js, nie edytuj w miejscu == */
  /* Słownik interfejsu. Angielski jest domyślny i zawsze kompletny; polski jest
     przełącznikiem. Nie wykrywamy języka przeglądarki — przewidywalność jest tu
     warta więcej niż domyślanie się, a zrzuty ekranu wychodzą powtarzalne.

     Klucze liczebników trzymają formy rozdzielone pionową kreską:
     angielski dwie (jeden|reszta), polski trzy (jeden|dwa-cztery|reszta).

     Wstawki: {nazwa} w treści, podstawiane przez drugi argument t(). */
  var I18N = (function () {
    /* Teksty, które nie mają własnego miejsca w danych: elementy interfejsu
       i komunikaty budowane w kodzie. Teksty żyjące już w tabelach danych
       (macierz wydań, tabele reguł) trzymają pary {en, pl} przy sobie —
       nadawanie im kluczy oznaczałoby rozdzielenie tekstu od rzeczy, którą
       opisuje, i wprowadzenie osierocenia, przed którym strażnik ma bronić. */
    var DICT = {

      /* --- przełącznik języka, wspólny dla trzech plików --- */
      "lang.label":            { en: "Language", pl: "Język" },
      "lang.en":               { en: "English", pl: "angielski" },
      "lang.pl":               { en: "Polish", pl: "polski" },

      /* --- nawigacja, wspólna --- */
      "nav.start":             { en: "start", pl: "start" },
      "nav.generator":         { en: "globals.yml", pl: "globals.yml" },
      "nav.validator":         { en: "inventory validator", pl: "walidator inventory" },
      "nav.tools":             { en: "Tools", pl: "Narzędzia" },
      "nav.skip":              { en: "Skip to content", pl: "Przejdź do treści" },
      "brand.sub":             { en: "OpenStack tooling", pl: "OpenStack tooling" },

      /* --- hub --- */
      "hub.title":             { en: "Rackpathlabs — Kolla-Ansible tools",
                                 pl: "Rackpathlabs — narzędzia Kolla-Ansible" },
      "hub.desc":              { en: "Two Kolla-Ansible tools: a globals.yml generator and an inventory validator. They run in your browser, offline, and upload nothing.",
                                 pl: "Dwa narzędzia do Kolla-Ansible: generator globals.yml i walidator inventory. Działają w przeglądarce, offline, bez wysyłania plików." },
      "hub.h1":                { en: "Two tools for Kolla-Ansible",
                                 pl: "Dwa narzędzia do Kolla-Ansible" },
      "hub.lede":              { en: "One writes <code>globals.yml</code> and keeps it free of configuration that passes a deployment and breaks weeks later. The other reads a <em>multinode</em> inventory and looks for what reading it will not show you: quorum, role collocation, group names retired in your release.",
                                 pl: "Jedno pisze <code>globals.yml</code> i pilnuje, żeby nie zawierał konfiguracji, która przechodzi wdrożenie, a psuje się tygodnie później. Drugie czyta inventory <em>multinode</em> i szuka w nim rzeczy, których nie widać przy przeglądaniu: kworum, kolokacji ról, nazw grup wycofanych w Twoim wydaniu." },
      "hub.forWhom":           { en: "For people who deploy and run OpenStack with Kolla — from a single-node lab to a multinode installation with HA.",
                                 pl: "Dla osób, które wdrażają i utrzymują OpenStacka Kollą — od laboratorium na jednym węźle po instalację wielowęzłową z HA." },
      "hub.gen.h":             { en: "globals.yml generator", pl: "Generator globals.yml" },
      "hub.gen.p":             { en: "Fill in a form, get a finished file with comments explaining every decision.",
                                 pl: "Wypełniasz formularz, dostajesz gotowy plik z komentarzami wyjaśniającymi każdą decyzję." },
      "hub.gen.li1":           { en: "release against base image", pl: "zgodność wydania z obrazem bazowym" },
      "hub.gen.li2":           { en: "interfaces: collisions and shared base devices",
                                 pl: "interfejsy: kolizje, wspólne urządzenia bazowe" },
      "hub.gen.li3":           { en: "TLS, endpoint names, service dependencies",
                                 pl: "TLS, nazwy punktów końcowych, zależności usług" },
      "hub.gen.li4":           { en: "import an existing file — it patches your original instead of rewriting it",
                                 pl: "import istniejącego pliku — poprawia oryginał zamiast pisać go od nowa" },
      "hub.gen.go":            { en: "Open the generator &rarr;", pl: "Otwórz generator &rarr;" },
      "hub.val.h":             { en: "Inventory validator", pl: "Walidator inventory" },
      "hub.val.p":             { en: "Paste an inventory, get a list of problems with line numbers and what each one will cause.",
                                 pl: "Wklejasz inventory, dostajesz listę problemów z numerem linii i opisem, czym grożą." },
      "hub.val.li1":           { en: "quorum and group sizes, role collocation",
                                 pl: "kworum i liczebność grup, kolokacja ról" },
      "hub.val.li2":           { en: "duplicate hosts and addresses, syntax, group cycles",
                                 pl: "duplikaty hostów i adresów, składnia, cykle grup" },
      "hub.val.li3":           { en: "<strong>combined mode</strong> — add <code>globals.yml</code> and check what only both files together can show",
                                 pl: "<strong>tryb łączony</strong> — dołóż <code>globals.yml</code> i sprawdź rzeczy widoczne dopiero z obu plików naraz" },
      "hub.val.li4":           { en: "<strong>upgrade mode</strong> — pick a target release and see what in your files changes on the way",
                                 pl: "<strong>tryb aktualizacji</strong> — wybierz wydanie docelowe i zobacz, co w Twoich plikach zmieni się po drodze" },
      "hub.val.go":            { en: "Open the validator &rarr;", pl: "Otwórz walidator &rarr;" },
      "hub.limits.h":          { en: "Before you click — two boundaries", pl: "Zanim klikniesz — dwie granice" },
      "hub.limits.offline":    { en: "<strong>Everything happens in your browser.</strong> Files are never uploaded or stored, the tools make no network requests at all, and each one is a single HTML file — download it and use it offline, from <code>file://</code>.",
                                 pl: "<strong>Wszystko dzieje się w Twojej przeglądarce.</strong> Pliki nie są nigdzie wysyłane ani zapisywane, narzędzia nie wykonują żadnych żądań sieciowych, a każde z nich to jeden plik HTML — możesz go pobrać i używać offline, z <code>file://</code>." },
      "hub.limits.scope":      { en: "<strong>The tools do not check everything</strong>, and they say so outright. Some failures do not follow from the contents of these files: deployment history, switch configuration and database state cannot be read out of YAML. <a href=\"SCOPE.md\">SCOPE.md</a> lists what is deliberately left out, where an answer is an inference rather than a fact, and what an empty result means. The document is in English.",
                                 pl: "<strong>Narzędzia nie sprawdzają wszystkiego</strong>, i mówią o tym wprost. Część awarii nie wynika z treści tych plików: historii wdrożenia, konfiguracji przełącznika czy stanu bazy nie da się odczytać z YAML-a. <a href=\"SCOPE.md\">SCOPE.md</a> wymienia, czego świadomie nie sprawdzamy, gdzie odpowiedzi są wnioskowaniem, a nie faktem, i co znaczy pusta lista wyników. Dokument jest po angielsku." },

      /* --- walidator: szkielet interfejsu --- */
      "v.title":               { en: "Rackpathlabs — multinode inventory validator (Kolla-Ansible)",
                                 pl: "Rackpathlabs — walidator inventory multinode (Kolla-Ansible)" },
      "v.desc":                { en: "Validator for a Kolla-Ansible multinode inventory: groups, duplicates, empty groups. Runs offline, with no external dependencies.",
                                 pl: "Walidator pliku inventory multinode dla Kolla-Ansible: grupy, duplikaty, puste grupy. Działa offline, bez zależności zewnętrznych." },
      "v.h1":                  { en: "<em>Multinode</em> inventory validator for Kolla-Ansible",
                                 pl: "Walidator inventory <em>multinode</em> dla Kolla-Ansible" },
      "v.lede":                { en: "Reads an INI inventory and checks it: the presence and membership of the <code>control</code>, <code>network</code>, <code>compute</code>, <code>storage</code> and <code>monitoring</code> groups, duplicate hosts, empty groups, contradictory variables and syntax errors. Optionally takes a <code>globals.yml</code> and adds the rules that need both files at once. Everything is analysed in your browser — the file is never uploaded or stored. Scope and limits are described in <a href=\"https://github.com/Rackpathlabs/kolla-tools/blob/main/SCOPE.md\">SCOPE.md</a>.",
                                 pl: "Sprawdza plik inventory w formacie INI: obecność i obsadę grup <code>control</code>, <code>network</code>, <code>compute</code>, <code>storage</code>, <code>monitoring</code>, duplikaty hostów, puste grupy, sprzeczne zmienne i błędy składni. Opcjonalnie przyjmuje <code>globals.yml</code> i dokłada reguły wymagające obu plików naraz. Analiza działa wyłącznie w przeglądarce — plik nie jest nigdzie wysyłany ani zapisywany. Zakres i granice opisuje <a href=\"https://github.com/Rackpathlabs/kolla-tools/blob/main/SCOPE.md\">SCOPE.md</a>." },
      "v.btn.file":            { en: "Load file…", pl: "Wczytaj plik…" },
      "v.btn.sampleOk":        { en: "Valid example", pl: "Przykład poprawny" },
      "v.btn.sampleBad":       { en: "Example with errors", pl: "Przykład z błędami" },
      "v.btn.clear":           { en: "Clear", pl: "Wyczyść" },
      "v.btn.report":          { en: "Copy report", pl: "Kopiuj raport" },
      "v.editor.label":        { en: "Inventory file contents", pl: "Zawartość pliku inventory" },
      "v.editor.placeholder":  { en: "[control]\nctrl01 ansible_host=10.0.0.11\n\n[network]\n…\n\nPaste the contents of your multinode file, or drag it here.",
                                 pl: "[control]\nctrl01 ansible_host=10.0.0.11\n\n[network]\n…\n\nWklej zawartość pliku multinode albo przeciągnij go tutaj." },
      "v.release.label":       { en: "release", pl: "wydanie" },
      "v.release.title":       { en: "The release the group names are checked against",
                                 pl: "Wydanie, względem którego sprawdzane są nazwy grup" },
      "v.releaseTo.label":     { en: "&rarr; target", pl: "&rarr; docelowe" },
      "v.releaseTo.title":     { en: "Optional: the release you plan to move to",
                                 pl: "Opcjonalnie: wydanie, na które planujesz przejść" },
      "v.releaseTo.none":      { en: "— no upgrade planned —", pl: "— bez planu aktualizacji —" },
      "v.topology":            { en: "Topology", pl: "Topologia" },
      "v.topology.group":      { en: "Group", pl: "Grupa" },
      "v.topology.hosts":      { en: "Hosts", pl: "Hosty" },
      "v.topology.count":      { en: "Count", pl: "Liczba" },
      "v.topology.required":   { en: "required", pl: "wymagana" },
      "v.topology.missing":    { en: "section absent from the file", pl: "brak sekcji w pliku" },
      "v.topology.subgroups":  { en: "subgroups: {list}", pl: "podgrupy: {list}" },
      "v.result":              { en: "Validation result", pl: "Wynik walidacji" },
      "v.empty":               { en: "No data — paste an inventory file.", pl: "Brak danych — wklej plik inventory." },
      "v.start":               { en: "Paste an inventory file to begin.", pl: "Wklej plik inventory, aby rozpocząć." },
      "v.globals.h":           { en: "globals.yml", pl: "globals.yml" },
      "v.globals.none":        { en: "not loaded", pl: "nie wczytano" },
      "v.globals.loaded":      { en: "loaded", pl: "wczytano" },
      "v.globals.label":       { en: "Contents of globals.yml — optional", pl: "Zawartość pliku globals.yml — opcjonalna" },
      "v.globals.placeholder": { en: "Optional. Paste or drag a globals.yml to enable the rules that need both files at once.",
                                 pl: "Opcjonalnie. Wklej albo przeciągnij globals.yml, żeby włączyć reguły wymagające obu plików naraz." },
      "v.ack.nobmc.h":         { en: "Lab without BMC — Masakari for testing only",
                                 pl: "Laboratorium bez BMC — Masakari wyłącznie testowo" },
      "v.ack.nobmc.p":         { en: "Acknowledging this lowers the fencing finding to informational. It does not silence it: an environment <em>named</em> \"dev\" is not an exemption, because the configuration gets copied to production.",
                                 pl: "Potwierdzenie obniża wpis o fencingu do informacji. Nie wycisza go: środowisko <em>nazwane</em> „dev” nie jest zwolnieniem, bo konfiguracja bywa kopiowana na produkcję." },
      "v.scope.note":          { en: "<strong>This file is used here only for the rules that need both files at once</strong> — VIP collisions, Cinder clustering and Masakari fencing. The validator <strong>does not check</strong> the <code>globals.yml</code> itself: interfaces, TLS, service dependencies and release compatibility are linted by the <a href=\"generator.html\">globals.yml generator</a>. An empty list below does not mean the file is correct — it means there is no conflict with this inventory.",
                                 pl: "<strong>Ten plik służy tu wyłącznie regułom wymagającym obu plików naraz</strong> — kolizji VIP-a, klastrowania Cindera i fencingu Masakari. Walidator <strong>nie sprawdza samego</strong> <code>globals.yml</code>: interfejsy, TLS, zależności usług i zgodność z wydaniem lintuje <a href=\"generator.html\">generator globals.yml</a>. Brak wpisów poniżej nie znaczy, że plik jest poprawny — znaczy, że nie ma konfliktu z tym inventory." },
      "v.footer":              { en: "Rackpathlabs — OpenStack tooling. A single HTML file, no external dependencies, works offline.",
                                 pl: "Rackpathlabs — narzędzia OpenStack. Pojedynczy plik HTML, bez zależności zewnętrznych, działa offline." },

      /* --- liczebniki: en dwie formy, pl trzy --- */
      "n.node":                { en: "node|nodes", pl: "węzeł|węzły|węzłów" },
      "n.host":                { en: "host|hosts", pl: "host|hosty|hostów" },
      "n.error":               { en: "error|errors", pl: "błąd|błędy|błędów" },
      "n.warning":             { en: "warning|warnings", pl: "uwaga|uwagi|uwag" },
/* --- walidator: raport tekstowy --- */
/* --- walidator: kworum (KV-02) --- */
/* --- walidator: wbudowane przykłady (jedna linia komentarza, patrz kod) --- */
/* --- walidator: reguły wymagające obu plików (KV-01, KV-07, KV-09) ---
         Angielskie brzmienie wzięte z rulesetu, który powstał po angielsku
         z terminologią upstreamu — nie z tłumaczenia polskiego kodu. */
/* --- walidator: kolokacja ról (KV-04, KV-11) — brzmienie z rulesetu,
         wraz z sekcjami "Not a bug when", bo to one odróżniają regułę od alarmu --- */
/* --- walidator: reguły wydania i tryb aktualizacji --- */
      "v.r.renamed":           { en: "was renamed to <code>{to}</code> in release <code>{rel}</code>.",
                                 pl: "została w wydaniu <code>{rel}</code> przemianowana na <code>{to}</code>." },
      "v.r.removed":           { en: "is no longer supported in release <code>{rel}</code>.",
                                 pl: "nie jest już obsługiwana w wydaniu <code>{rel}</code>." },
      "v.r.group":             { en: "Group <code>[{group}]</code> ", pl: "Grupa <code>[{group}]</code> " },

      "v.q.ovnSpof.msg":       { en: "Group <code>[{group}]</code> has one host against {count} control nodes.",
                                 pl: "Grupa <code>[{group}]</code> ma jeden host przy {count} sterujących." },
      "v.q.ovnSpof.hint":      { en: "Allowed, but {label} becomes a single point of failure for the network control plane.",
                                 pl: "Dopuszczalne, ale {label} staje się pojedynczym punktem awarii płaszczyzny sterowania sieci." },
      "v.q.ceph.msg":          { en: "Group <code>[ceph-mon]</code> has {count} — Ceph monitors need an odd number, no fewer than {min}.",
                                 pl: "Grupa <code>[ceph-mon]</code> ma {count} — monitory Ceph wymagają nieparzystej liczby, nie mniejszej niż {min}." },

      "v.u.todo.renameKey":    { en: "Rename the key in globals.yml before upgrading — the old one will not be recognised.",
                                 pl: "Zmień nazwę klucza w globals.yml przed aktualizacją — stara nie zostanie rozpoznana." },
      "v.u.todo.renameGroup":  { en: "Rename the section in the inventory before upgrading — the old name will not be recognised.",
                                 pl: "Zmień nazwę sekcji w inventory przed aktualizacją — stara nie zostanie rozpoznana." },
      "v.u.gap.hint":          { en: "Changes made in {which} are not shown here — not because there were none, but because they have not been reviewed against the release notes. An empty list would look exactly like no changes, so the gap is stated outright. Read the release notes for those releases yourself.",
                                 pl: "Zmiany wprowadzone w {which} nie są tu pokazane — nie dlatego, że ich nie było, tylko dlatego, że nie zostały przejrzane w release notes. Pusta lista wyglądałaby identycznie jak brak zmian, więc mówimy o luce wprost. Przejrzyj release notes tych wydań ręcznie." },
      "v.u.gap.which1":        { en: "that release", pl: "tym wydaniu" },
      "v.u.gap.whichN":        { en: "those releases", pl: "tych wydaniach" },

      "v.c.ctlcmp.msg":        { en: "{n} also serves as both a control node and a compute node: {hosts}.",
                                 pl: "{n} jednocześnie rolę sterującą i obliczeniową: {hosts}." },
      "v.c.ctlcmp.escalated":  { en: "The <code>globals.yml</code> shows HA tooling, so the escalation condition is met and this is an error rather than a trade-off. ",
                                 pl: "W <code>globals.yml</code> widać narzędzia HA, więc warunek eskalacji jest spełniony i to jest błąd, nie kompromis. " },
      "v.c.ctlcmp.hint":       { en: "Without Masakari this is a valid hyperconverged layout — plan a CPU and memory reserve for the control services. With <code>enable_masakari</code> the same configuration is an error that risks data corruption: either Pacemaker Remote cannot start on a host that is already a full Corosync member, or — with <code>restrict_to_remotes = false</code> — hostmonitor treats a control node as an evacuation candidate, and a maintenance reboot makes Masakari evacuate VMs from the host running MariaDB and RabbitMQ, through an API that is currently down. Cascade.",
                                 pl: "Bez Masakari to poprawny układ hiperkonwergentny — zaplanuj rezerwę procesora i pamięci na usługi sterowania. Z <code>enable_masakari</code> ta sama konfiguracja jest błędem grożącym uszkodzeniem danych: albo Pacemaker Remote nie wystartuje na hoście będącym już pełnym członkiem Corosync, albo — przy <code>restrict_to_remotes = false</code> — hostmonitor uzna węzeł sterujący za kandydata do ewakuacji i restart serwisowy każe Masakari ewakuować maszyny z węzła, na którym stoją MariaDB i RabbitMQ, przez API, które właśnie leży. Kaskada." },
      "v.c.ctlcmp.needGlobals": { en: " Settling it needs the <code>globals.yml</code> — load it in the panel alongside and the tool can make the call.",
                                  pl: " Rozstrzygnięcie wymaga <code>globals.yml</code> — wczytaj go w panelu obok, żeby narzędzie mogło je podjąć." },

      "v.c.net.same.msg":      { en: "The membership of <code>[network]</code> is identical to <code>[control]</code>.",
                                 pl: "Obsada <code>[network]</code> jest identyczna z <code>[control]</code>." },
      "v.c.net.same.hint":     { en: "Under OVN the hosts in <code>[network]</code> get <code>enable-chassis-as-gw</code> and become gateway chassis. The default <code>[network:children] = control</code> pattern therefore pushes all north-south traffic — SNAT and non-DVR floating IPs — through the controllers. A three-VM lab never shows it; at around fifty instances <code>ovn-controller</code> competes for CPU with MariaDB and RabbitMQ, and on gateway failover BFD flaps and takes Corosync with it. Setting <code>neutron_ovn_distributed_fip: \"yes\"</code> softens the floating-IP part, but SNAT still goes through the gateway chassis. Collocation with <code>[compute]</code> is a valid pattern — the alarm is specifically about inheriting from <code>[control]</code>.",
                                 pl: "Pod OVN hosty z <code>[network]</code> dostają <code>enable-chassis-as-gw</code> i stają się bramami. Domyślny wzorzec <code>[network:children] = control</code> przepycha więc cały ruch północ-południe — SNAT i pływające adresy bez DVR — przez kontrolery. Trzymaszynowe laboratorium tego nie pokaże; przy około pięćdziesięciu instancjach <code>ovn-controller</code> zaczyna walczyć o procesor z MariaDB i RabbitMQ, a przy przełączeniu bramy migocze BFD i pociąga za sobą Corosync. Klucz <code>neutron_ovn_distributed_fip: \"yes\"</code> łagodzi część z pływającymi adresami — SNAT nadal idzie przez bramy. Kolokacja z <code>[compute]</code> jest poprawnym wzorcem; alarm dotyczy wyłącznie dziedziczenia z <code>[control]</code>." },
      "v.c.net.partial.msg":   { en: "Some network nodes are also control nodes: {hosts}.",
                                 pl: "Część węzłów sieciowych to zarazem węzły sterujące: {hosts}." },
      "v.c.net.partial.hint":  { en: "The dataplane lands on the control plane — OVN gateways share CPU with MariaDB and RabbitMQ. The effect only shows under load.",
                                 pl: "Warstwa danych ląduje na płaszczyźnie sterowania — bramy OVN dzielą procesor z MariaDB i RabbitMQ. Skutki widać dopiero przy obciążeniu." },
      "v.c.gw.msg":            { en: "Group <code>[network]</code> has {count} against {computeCount} compute nodes.",
                                 pl: "Grupa <code>[network]</code> ma {count} przy {computeCount} obliczeniowych." },
      "v.c.gw.hint":           { en: "The OVN gateway has nowhere to fail over to — losing that host takes north-south traffic for the whole cloud with it. Redundancy starts at {min} network nodes.",
                                 pl: "Brama OVN nie ma gdzie się przełączyć — utrata tego hosta zabiera ruch północ-południe całej chmury. Redundancja zaczyna się od {min} węzłów sieciowych." },
      "v.c.storage.msg":       { en: "{n} combines the compute and storage roles: {hosts}.",
                                 pl: "{n} rolę obliczeniową i magazynową: {hosts}." },
      "v.c.storage.hint":      { en: "A hyperconverged layout. Volume services compete for memory and CPU with the virtual machines — a node under memory pressure degrades storage for the whole cloud, not only for itself. Plan a resource reserve.",
                                 pl: "Układ hiperkonwergentny. Usługi wolumenów konkurują o pamięć i procesor z maszynami wirtualnymi — węzeł pod presją pamięci degraduje magazyn dla całej chmury, nie tylko dla siebie. Zaplanuj rezerwę zasobów." },
      "v.c.n.hostServes":      { en: "One host|{n} hosts", pl: "Host pełni|Hosty pełnią|Hostów pełni" },
      "v.c.n.hostCombines":    { en: "One host|{n} hosts", pl: "Host łączy|Hosty łączą|Hostów łączy" },
      "n.computeNode":         { en: "compute node|compute nodes", pl: "węźle|węzłach|węzłach" },

      "v.x.kv01.msg":          { en: "<code>enable_masakari</code> and <code>enable_hacluster</code> are on, and the inventory carries no management controller field at all (<code>ipmi_*</code>, <code>bmc_*</code>, <code>drac_*</code>, <code>ilo_*</code>, <code>redfish_*</code>) — fencing has nothing to be built from.",
                                 pl: "<code>enable_masakari</code> i <code>enable_hacluster</code> są włączone, a inventory nie zawiera ani jednego pola kontrolera zarządzania (<code>ipmi_*</code>, <code>bmc_*</code>, <code>drac_*</code>, <code>ilo_*</code>, <code>redfish_*</code>) — fencing nie ma z czego powstać." },
      "v.x.kv01.hint":         { en: "Network isolation of a compute node — not a real host failure — looks the same to hostmonitor: it reports the host down, Masakari evacuates, Nova rebuilds the VM elsewhere, and the original QEMU is still alive holding an open RBD descriptor. Two instances write to the same Ceph volume and the guest filesystem is corrupted. Without fencing there is no way to force-release the lock. Full confidence cannot come from these two files: <code>masakari-monitors.conf</code> (<code>disable_ipmi_check</code>, true by default) and the hacluster overrides live outside them.",
                                 pl: "Izolacja sieciowa węzła obliczeniowego — a nie prawdziwa awaria hosta — wygląda dla hostmonitora tak samo: zgłasza host jako niedostępny, Masakari ewakuuje, Nova odtwarza maszynę gdzie indziej, a pierwotny QEMU wciąż żyje i trzyma otwarty deskryptor RBD. Dwie instancje zapisują ten sam wolumen Ceph i system plików gościa zostaje uszkodzony. Bez fencingu nie ma jak wymusić zwolnienia blokady. Pełnej pewności nie da się uzyskać z tych dwóch plików: <code>masakari-monitors.conf</code> (<code>disable_ipmi_check</code>, domyślnie true) i nadpisania hacluster leżą poza nimi." },

      "v.x.kv07.msg":          { en: "Group <code>[storage]</code> has {count}, and <code>globals.yml</code> does not set <code>cinder_cluster_name</code>.",
                                 pl: "Grupa <code>[storage]</code> ma {count}, a <code>globals.yml</code> nie ustawia <code>cinder_cluster_name</code>." },
      "v.x.kv07.hint":         { en: "This is not high availability; it is as many independent backends as there are hosts, sharing one pool. Without clustering every volume gets <code>host = &lt;node&gt;@ceph#ceph</code> in the database. Everything works, because Ceph is shared and attach goes through Nova — until that node is lost. Then <code>delete</code>, <code>extend</code>, <code>retype</code> and <code>snapshot</code> on its volumes hang in <code>deleting</code> or <code>error</code> forever, because no other cinder-volume picks them up. The fix is a manual <code>cinder-manage volume update_host</code> against a production database.",
                                 pl: "To nie jest wysoka dostępność, tylko tyle niezależnych backendów, ile hostów, dzielących jedną pulę. Bez klastrowania każdy wolumen dostaje w bazie <code>host = &lt;węzeł&gt;@ceph#ceph</code>. Działa, bo Ceph jest współdzielony, a podłączenie idzie przez Novę — dopóki ten węzeł żyje. Po jego utracie operacje <code>delete</code>, <code>extend</code>, <code>retype</code> i <code>snapshot</code> na jego wolumenach wiszą w <code>deleting</code> albo <code>error</code> na zawsze, bo żaden inny cinder-volume ich nie przejmie. Naprawa to ręczny <code>cinder-manage volume update_host</code> na produkcyjnej bazie." },

      "v.x.kv09.collision.msg": { en: "<code>{key}</code> is set to <code>{vip}</code>, which is already the address of host {hosts}.",
                                  pl: "<code>{key}</code> ma wartość <code>{vip}</code>, która jest już adresem hosta {hosts}." },
      "v.x.kv09.collision.hint": { en: "The deployment will pass — keepalived raises the address without asking anyone. What follows is a duplicate IP, ARP flapping and random API timeouts visible only from parts of the network.",
                                   pl: "Wdrożenie przejdzie — keepalived podnosi adres nie pytając nikogo o zgodę. Potem: zduplikowany adres IP, migotanie ARP i losowe przekroczenia czasu w API, widoczne tylko z części sieci." },
      "v.x.kv09.subnet.msg":   { en: "<code>{key}</code> (<code>{vip}</code>) lies outside <code>{prefix}.0/{mask}</code>, the subnet inferred from the host addresses.",
                                 pl: "<code>{key}</code> (<code>{vip}</code>) leży poza podsiecią <code>{prefix}.0/{mask}</code> wywnioskowaną z adresów hostów." },
      "v.x.kv09.subnet.hint":  { en: "Assumption: every <code>ansible_host</code> address sits in one subnet with a <code>/{mask}</code> mask. Inventories rarely carry masks, so this is an inference rather than a reading — under a different network layout this finding is a false alarm, and you should ignore it. If it is not: HAProxy binds, keepalived raises the address, but return routing fails outside the local segment — \"works from the control node, not from a workstation\".",
                                 pl: "Założenie: wszystkie adresy <code>ansible_host</code> mieszczą się w jednej podsieci o masce <code>/{mask}</code>. Inventory rzadko niesie maski, więc to jest wnioskowanie, a nie odczyt — przy innym podziale sieci ten wpis jest fałszywym alarmem i należy go zignorować. Jeśli nie jest: HAProxy się zwiąże, keepalived podniesie adres, ale ruch powrotny nie znajdzie drogi spoza segmentu — „działa z węzła sterującego, nie działa ze stacji”." },

      "v.sample.ok":           { en: "Multinode inventory: 3 control, 2 network, 4 compute nodes",
                                 pl: "Inventory multinode: 3 wezly sterujace, 2 sieciowe, 4 obliczeniowe" },
      "v.sample.bad":          { en: "Inventory with typical mistakes - to see what the validator does",
                                 pl: "Inventory z typowymi bledami - do sprawdzenia dzialania walidatora" },

      "v.q.aio.msg":           { en: "All-in-one inventory: the only host in <code>[control]</code> is also a compute node.",
                                 pl: "Inventory all-in-one: jedyny host w <code>[control]</code> pełni równocześnie rolę obliczeniową." },
      "v.q.aio.hint":          { en: "A lab layout — the absence of high availability is a choice here, not a fault. A production deployment needs at least {min} control nodes.",
                                 pl: "Układ laboratoryjny — brak wysokiej dostępności jest tu wyborem, nie usterką. Do wdrożenia produkcyjnego potrzebne są co najmniej {min} węzły sterujące." },
      "v.q.single.msg":        { en: "Group <code>[{group}]</code> has one host — {label} has neither quorum nor redundancy.",
                                 pl: "Grupa <code>[{group}]</code> ma jeden host — {label} nie ma kworum ani redundancji." },
      "v.q.needOdd":           { en: "An odd number of hosts is required, no fewer than {min}.",
                                 pl: "Wymagana nieparzysta liczba hostów, nie mniejsza niż {min}." },
      "v.q.count.msg":         { en: "Group <code>[{group}]</code> has {count} — {reason} for quorum ({label}).",
                                 pl: "Grupa <code>[{group}]</code> ma {count} — {reason} dla kworum ({label})." },
      "v.q.even":              { en: "an even number", pl: "liczba parzysta" },
      "v.q.tooFew":            { en: "too few", pl: "za mało" },

      "v.rep.title":           { en: "Rackpathlabs — multinode inventory validation report",
                                 pl: "Rackpathlabs — raport walidacji inventory multinode" },
      "v.rep.hosts":           { en: "Hosts: {hosts}   Groups: {groups}",
                                 pl: "Hosty: {hosts}   Grupy: {groups}" },
      "v.rep.path":            { en: "Upgrade path: {from} -> {to}",
                                 pl: "Ścieżka aktualizacji: {from} -> {to}" },
      "v.rep.globalsYes":      { en: "globals.yml: loaded — the rules needing both files are active",
                                 pl: "globals.yml: wczytany — działają też reguły wymagające obu plików" },
      "v.rep.globalsNo":       { en: "globals.yml: not loaded — inventory rules only",
                                 pl: "globals.yml: nie wczytano — wyłącznie reguły inventory" },
      "v.rep.release":         { en: "Release: {id} {name}{kolla}", pl: "Wydanie: {id} {name}{kolla}" },
      "v.rep.result":          { en: "Result: {errors}, {warnings}, {info} info",
                                 pl: "Wynik: {errors}, {warnings}, {info} info" },
      "v.rep.clean":           { en: "No problems found.", pl: "Nie wykryto problemów." },
      "v.rep.topology":        { en: "Topology:", pl: "Topologia:" },
      "v.rep.absent":          { en: "group not present", pl: "grupa nie występuje" },
      "v.rep.refLine":         { en: "line {line}", pl: "linia {line}" },
      "v.rep.refMissing":      { en: "key absent", pl: "klucza brak" },
      "v.rep.both":            { en: "both", pl: "oba" },
      "v.sev.error":           { en: "ERROR", pl: "BŁĄD " },
      "v.sev.warn":            { en: "WARN ", pl: "UWAGA" },
      "v.sev.info":            { en: "INFO ", pl: "INFO " },

      "v.verdict.errors":      { en: "The inventory contains errors that block deployment.",
                                 pl: "Inventory zawiera błędy blokujące wdrożenie." },
      "v.verdict.warnings":    { en: "Syntax is valid — there are warnings to review.",
                                 pl: "Składnia poprawna — są uwagi do przeglądu." },
      "v.verdict.clean":       { en: "No objections within what this tool checks.",
                                 pl: "Brak zastrzeżeń w zakresie sprawdzanym przez to narzędzie." },

      "hub.footer":            { en: "Rackpathlabs — OpenStack tooling. Code and issues: <a href=\"https://github.com/Rackpathlabs/kolla-tools\">github.com/Rackpathlabs/kolla-tools</a>. MIT licence.",
                                 pl: "Rackpathlabs — narzędzia OpenStack. Kod i zgłoszenia: <a href=\"https://github.com/Rackpathlabs/kolla-tools\">github.com/Rackpathlabs/kolla-tools</a>. Licencja MIT." }
    };

    var lang = "en";

    function setLang(value) { lang = (value === "pl") ? "pl" : "en"; }
    function getLang() { return lang; }

    function t(key, vars) {
      var entry = DICT[key];
      /* Brakującego klucza nie ukrywamy pustym napisem — ma być widoczny.
         Strażnik kompletności w CI i tak nie przepuści takiego stanu do main. */
      if (!entry) return "[[" + key + "]]";
      var s = entry[lang];
      if (s === undefined || s === null) s = entry.en;
      if (!vars) return s;
      return String(s).replace(/\{(\w+)\}/g, function (whole, name) {
        return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole;
      });
    }

    /* Forma liczebnika dla bieżącego języka. */
    function plural(key, n) {
      var forms = String(t(key)).split("|");
      var i;
      if (lang === "pl") {
        i = (n === 1) ? 0
          : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2;
      } else {
        i = (n === 1) ? 0 : 1;
      }
      return forms[Math.min(i, forms.length - 1)];
    }

    function count(key, n) { return n + " " + plural(key, n); }

    /* Pamięć wyboru języka. Przy file:// bywa niedostępna — wtedy narzędzie
       działa dalej po angielsku i nie zostawia śladu w konsoli. */
    var STORE_KEY = "rackpathlabs.lang";

    function load() {
      try {
        var v = localStorage.getItem(STORE_KEY);
        if (v === "pl" || v === "en") setLang(v);
      } catch (e) { /* brak pamięci to nie jest błąd, tylko mniej wygody */ }
    }

    function save() {
      try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* jak wyżej */ }
    }

    return {
      t: t, plural: plural, count: count,
      setLang: setLang, getLang: getLang,
      load: load, save: save,
      dict: DICT,
      keys: function () { return Object.keys(DICT); }
    };
  })();

  var T = I18N.t;
  /* == KOLLA-I18N END == */
