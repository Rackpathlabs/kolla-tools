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
  /* Teksty interfejsu. Narzędzia są wyłącznie angielskie — druga wersja językowa
     kosztowała przy każdej nowej regule, a polskojęzycznych użytkowników
     Kolla-Ansible jest znikomo mało.

     Słownik zostaje mimo jednego języka, bo jest jedynym miejscem, w którym widać
     wszystkie komunikaty narzędzia naraz, i to on umożliwia asercję kompletności.

     Klucze liczebników trzymają dwie formy rozdzielone pionową kreską: jeden|reszta.
     Wstawki: {nazwa} w treści, podstawiane przez drugi argument t(). */
  var I18N = (function () {
    /* Teksty, które nie mają własnego miejsca w danych: elementy interfejsu
       i komunikaty budowane w kodzie. Teksty żyjące już w tabelach danych
       (macierz wydań, tabele reguł) trzymają pary {en, pl} przy sobie —
       nadawanie im kluczy oznaczałoby rozdzielenie tekstu od rzeczy, którą
       opisuje, i wprowadzenie osierocenia, przed którym strażnik ma bronić. */
    var DICT = {


      /* --- nawigacja, wspólna --- */
      "nav.start":             "start",
      "nav.generator":         "globals.yml",
      "nav.validator":         "inventory validator",
      "nav.tools":             "Tools",
      "nav.skip":              "Skip to content",
      "brand.sub":             "OpenStack tooling",

      /* --- hub --- */
      "hub.title":             "Rackpathlabs — Kolla-Ansible tools",
      "hub.desc":              "Two Kolla-Ansible tools: a globals.yml generator and an inventory validator. They run in your browser, offline, and upload nothing.",
      /* Opis meta generatora. Do 2026-09-01 stał w markupie jako literał poza
         słownikiem — jedyny wpis rejestru #77, którego żaden scenariusz nie mógł
         osiągnąć, bo opisu meta nie renderuje strona, tylko wyszukiwarka. */
      /* Piętnaście wpisów przeniesionych 2026-09-01 z markupu generatora, w którym
         stały BEZ ŻADNEGO KLUCZA — check-markup-dict.js ich nie widział, bo pilnuje
         zgodności tam, gdzie klucz JEST, a check-i18n.js nie miał czego porównać.
         Wartości wzięte z markupu, nie przepisane: migracja przenosi tekst, nie
         zmienia go, a migawka piętnastu scenariuszy potwierdza to bajtowo. */
      "g.h1":                      "<code>globals.yml</code> generator for Kolla-Ansible",
      "g.lede":                    "Fill in the deployment parameters — the file assembles live on the right. Settings are saved locally in the browser; nothing leaves this machine.",
      "g.import.hint":             "Paste or drop a <code>globals.yml</code>. The form fills with the values from the file, and from then on the export <strong>edits the original</strong> instead of rewriting it — comments, key order and entries the generator does not know stay untouched.",
      "g.btn.import":              "Load from the field",
      "g.btn.importFile":          "Load a file…",
      "g.btn.importClear":         "Discard the import",
      "g.hint.ml2":                "ML2 backend. OVN and openvswitch are mutually exclusive.",
      "g.ack.hint":                "Some rules describe a risk the file alone cannot settle. An acknowledgment does not silence the finding — it lowers it to information and records the decision as a comment in the generated file.",
      "g.ack.kv05":                "the shared link has headroom and QoS",
      "g.ack.kv06":                "migration has its own network outside Kolla",
      "g.toggle.comments":         "Explanatory comments",
      "g.btn.reset":               "Restore defaults",
      "g.out.fname":               "/etc/kolla/globals.yml",
      "g.btn.download":            "Download globals.yml",
      "g.footer":                  "Rackpathlabs — OpenStack tools. A single HTML file, no external dependencies, works offline.",
      "g.desc":                "Generator for a Kolla-Ansible globals.yml: base image, release matrix, interface assignment. Runs offline, with no external dependencies.",
      "hub.h1":                "Two tools for Kolla-Ansible",
      "hub.lede":              "One writes <code>globals.yml</code> and keeps it free of configuration that passes a deployment and breaks weeks later. The other reads a <em>multinode</em> inventory and looks for what reading it will not show you: quorum, role collocation, group names retired in your release.",
      "hub.forWhom":           "For people who deploy and run OpenStack with Kolla — from a single-node lab to a multinode installation with HA.",
      "hub.gen.h":             "globals.yml generator",
      "hub.gen.p":             "Fill in a form, get a finished file with comments explaining every decision.",
      "hub.gen.li1":           "release against base image",
      "hub.gen.li2":           "interfaces: collisions and shared base devices",
      "hub.gen.li3":           "TLS, endpoint names, service dependencies",
      "hub.gen.li4":           "import an existing file — it patches your original instead of rewriting it",
      "hub.gen.go":            "Open the generator &rarr;",
      "hub.val.h":             "Inventory validator",
      "hub.val.p":             "Paste an inventory, get a list of problems with line numbers and what each one will cause.",
      "hub.val.li1":           "quorum and group sizes, role collocation",
      "hub.val.li2":           "duplicate hosts and addresses, syntax, group cycles",
      "hub.val.li3":           "<strong>combined mode</strong> — add <code>globals.yml</code> and check what only both files together can show",
      "hub.val.li4":           "<strong>upgrade mode</strong> — pick a target release and see what in your files changes on the way",
      "hub.val.go":            "Open the validator &rarr;",
      "hub.limits.h":          "Before you click — two boundaries",
      "hub.limits.offline":    "<strong>Everything happens in your browser.</strong> Files are never uploaded or stored, the tools make no network requests at all, and each one is a single HTML file — download it and use it offline, from <code>file://</code>.",
      "hub.limits.scope":      "<strong>The tools do not check everything</strong>, and they say so outright. Some failures do not follow from the contents of these files: deployment history, switch configuration and database state cannot be read out of YAML. <a href=\"SCOPE.md\">SCOPE.md</a> lists what is deliberately left out, where an answer is an inference rather than a fact, and what an empty result means. The document is in English.",

      /* --- powiadomienia (toasty) ---
         Trzymane w słowniku, nie wpisane w kod. Nie chodzi o wielojęzyczność —
         narzędzia są jednojęzyczne — tylko o to, że słownik jest JEDYNYM miejscem,
         w którym widać wszystkie komunikaty naraz, a asercja kompletności czyta
         właśnie jego. Toast wpisany w kod jest niewidzialny dla asercji: osiemnaście
         takich przetrwało migrację na angielski i zostało zauważonych dopiero
         przypadkiem. Strażnik w check-english.js pilnuje, żeby nie wróciły. */
      "t.file.read":            "Loaded {name}",
      "t.file.failed":          "Could not read the file.",
      "t.report.copied":        "Report copied to the clipboard.",
      "t.report.copyFailed":    "Could not copy the report.",
      "t.sample.ok":            "Loaded the clean example.",
      "t.sample.bad":           "Loaded the example with problems.",
      "t.globals.loaded":       "Loaded globals.yml — the two-file rules are on.",
      "t.globals.cleared":      "Dropped globals.yml — the inventory rules remain.",
      "t.parser.unsupported":   "The file uses constructs the parser does not handle.",
      "t.import.loaded":        "Loaded {count} keys from the file.",
      "t.copied":               "Copied to the clipboard.",
      "t.copyFailed":           "Could not copy — select the text and press Ctrl+C.",
      "t.download.handed":      "Handed {name} to the browser.",
      "t.download.blocked":     "The browser blocked the download — use the Copy button.",
      "t.defaults.restored":    "Defaults restored.",
      "t.import.empty":         "The import field is empty.",
      "t.import.dropped":       "Import dropped — the file is built from the form again.",
      "t.export.blocked":       "Export blocked — the configuration contains errors.",

      /* --- generator: etykiety pól, które nie są samą nazwą klucza ---
         Rejestr: nazwa klucza zostaje nazwą klucza. Gdy etykieta niesie coś poza
         nią, dopisek jest ROZDZIELANY strukturalnie, a nie tłumaczony razem
         z identyfikatorem ani zwalniany rozszerzonym wyjątkiem. */
      "g.field.storage":       "storage backend",
      "g.field.ampNetType":    "type",

      /* --- generator: metka pola obowiązkowego ---
         Rejestr: małą literą, bo to metka, nie krzyk. Wielkie litery należą do CSS. */
      "g.field.required":      "required",

      /* --- etykiety wag, wspólne dla obu narzędzi ---
         Małą literą: to metka przy findingu, nie krzyk. Wielkość liter należy do CSS. */
      "sev.error":             "error",
      "sev.warn":              "warning",
      "sev.info":              "info",

      /* --- generator: werdykt o pliku ---
         Rejestr: zdanie o PLIKU, nie o narzędziu. "This file is not ready to
         deploy", nie "The generator found errors". */
      /* Stan PRZED sprawdzeniem. Nie jest werdyktem i nie ma prawa nim być: z JS-em
         widać go przez moment przed pierwszym renderem, bez JS-u widać go zawsze,
         a bez JS-u nic nie zostało sprawdzone. Poprzednik ("Konfiguracja poprawna."
         wpisana w markup) orzekał w tym miejscu, że plik jest poprawny — przy pustym
         VIP-ie, czyli akurat wtedy, gdy audyt renderuje tam błąd. #64 */
      /* Widok wyjścia (#9). LINIA ODNIESIENIA JEST NAZWANA WPROST i ani jeden z tych
         napisów nie mówi „Kolla defaults" — narzędzie nie zna wartości domyślnych
         upstreamu dla 24 z 25 emitowanych kluczy, więc takie zdanie byłoby
         twierdzeniem bez pokrycia, czyli dokładnie tym, czego zabrania SCOPE.md.
         Pełne porównanie z upstreamem czeka na skuratowaną tabelę defaultów. */
      "g.view.group":          "Output view",
      "g.view.full":           "full file",
      "g.view.diff":           "only what differs",
      "g.view.note":           "Showing only the keys whose value differs from this tool's initial values — the state this form starts in. This is <strong>not</strong> a comparison against kolla-ansible defaults: this tool does not know them, so a key missing here may still differ from upstream.",
      "g.view.tableNote":      "Left is this tool's initial value, right is the value in the file above.",
      "g.h.diff":              "Differences from the initial values",
      "g.diff.key":            "key",
      "g.diff.initial":        "initial value",
      "g.diff.thisFile":       "this file",
      "g.diff.absent":         "not emitted",

      "g.verdict.pending":     "Not checked yet.",
      "g.verdict.blocked":     "This file is not ready to deploy: {errors}{warnings}. Export is blocked.",
      "g.verdict.warn":        "This file is ready. {warnings} to check before deploying.",
      "g.verdict.clean":       "Nothing to flag within what the generator checks. The file is ready to download.",

      /* --- generator: proza reguł KV ---
         Brzmienie z RULESET-KV.tmp, nie z tłumaczenia polskiego kodu. Rejestr:
         opis skutku, czas teraźniejszy, konkret zamiast oceny. */
      "g.rule.kv05.why":           "Corosync takes its ring from <code>api_interface</code>. A Ceph backfill, an OSD-replace rebalance or a single 64 GB migration can saturate the link; Corosync loses its token (3000 ms by default), Pacemaker declares the node lost, and Masakari starts evacuating a healthy host under load. The classic &ldquo;everything worked for three weeks and then the cloud killed its own compute node&rdquo;.",
      "g.rule.kv05.ackNote":       "Acknowledged: measured bandwidth headroom and switch-side queueing. The bond alone settles nothing — LACP hashes per flow, and one migration stream can own an entire member link.",
      "g.rule.kv06.why":           "A host-failure evacuation is a burst of migrations at exactly the moment the control plane is busiest. Migration traffic starves RPC, <code>nova-compute</code> on healthy hosts misses heartbeats (<code>service_down_time</code>, 60 s by default), Nova marks them down, and Masakari sees more hosts to evacuate. Avalanche: one host failure takes down the cluster.",
      "g.rule.kv06.ackNote":       "Acknowledged: a dedicated migration network configured outside Kolla through <code>live_migration_inbound_addr</code> in a nova-compute override.",
      "g.rule.kv10.why":           "Kolla plugs the interface into an OVS bridge and strips its addressing. On a direct match you lose the host mid-deploy, at the <code>neutron : Bootstrap</code> task. On a shared base device the VLAN subinterface theoretically survives its parent joining OVS, but that depends on initialisation order at boot — the deployment passes and the host does not come back after a reboot.",
      "g.rule.kv13.why":           "The deployment passes and so does <code>loadbalancer create</code>. The amphora boots and goes ACTIVE in Nova — while the load balancer hangs in <code>PENDING_CREATE</code> and dies to <code>ERROR</code> after about 25 minutes: the health manager never receives its UDP 5555 heartbeats.",

      /* --- generator: teksty pomocnicze pod polami ---
         Rejestr: jedno zdanie oznajmujące z kropką, mówiące CO ma być w polu
         albo czego dotyczy — nie jak go użyć. */
      "g.hint.distro":             "Base distribution of the container images. Must match the images in the registry.",
      "g.hint.release":            "Image tag, for example <code>2025.1</code>. Should match the kolla-ansible version.",
      "g.hint.vip":                "A free IPv4 address on the management network — not held by any host.",
      "g.hint.netIf":              "Management/API network interface. Needs an IP address on every node.",
      "g.hint.extIf":              "External traffic interface. No IP address, no configuration — Neutron takes it over entirely. Several comma-separated interfaces mean several physical networks.",
      "g.hint.brName":             "OVS bridges, one per external interface. The counts must match.",
      "g.hint.apiIf":              "API traffic and the Corosync ring. Empty inherits <code>network_interface</code>.",
      "g.hint.stgIf":              "Storage traffic (Ceph). Empty inherits <code>network_interface</code>.",
      "g.hint.migIf":              "Live migration. Empty inherits <code>api_interface</code>.",
      "g.hint.extVip":             "Address of the public endpoints. Empty means the same as internal.",
      "g.hint.extVipIf":           "Interface that carries the external VIP.",
      "g.hint.intFqdn":            "Name of the internal endpoints in the service catalogue.",
      "g.hint.extFqdn":            "Name of the public endpoints. Must differ from the internal one.",
      "g.hint.storage":            "Source of volumes and images. Kolla does not deploy Ceph — the cluster must already exist.",
      "g.hint.ampNet":             "Amphora management network. <code>vlan</code> and <code>flat</code> need a provider network.",
      "g.hint.physnet":            "Physical network name. Must follow from the external interface list.",

      /* --- generator: opisy przełączników ---
         Rejestr jak wyżej; opis mówi, co przełącznik włącza i czego wymaga. */
      "g.toggle.d01":              "TLS on internal traffic between services.",
      "g.toggle.d02":              "Copies a private CA into the container trust store.",
      "g.toggle.d03":              "Let's Encrypt certificates — the images' system trust store suffices.",
      "g.toggle.d04":              "HAProxy + keepalived — required for the VIP and HA API endpoints.",
      "g.toggle.d05":              "Block volumes. Needs a selected storage backend.",
      "g.toggle.d06":              "Template orchestration.",
      "g.toggle.d07":              "Web dashboard.",
      "g.toggle.d08":              "Secret store. Octavia needs it for the amphora certificates.",
      "g.toggle.d09":              "Load balancing (amphorae). Needs Barbican and a management network.",
      "g.toggle.d10":              "Metrics collection. Needs hosts in the <em>monitoring</em> group.",
      "g.toggle.d11":              "Metric dashboards. Without Prometheus there is nothing to draw.",
      "g.toggle.d12":              "Corosync and Pacemaker. The Corosync ring runs over <code>api_interface</code>.",
      "g.toggle.d13":              "Automatic evacuation of VMs after a host failure.",
      "g.toggle.d14":              "Provider networks (flat/VLAN) mapped straight onto the physical network.",
      "g.toggle.d15":              "Measured bandwidth headroom and switch-side queueing for storage and migration traffic.",
      "g.toggle.d16":              "A dedicated migration VLAN configured through <code>live_migration_inbound_addr</code> in a nova-compute override.",
      "g.toggle.d17":              "Section headers and deployment notes that follow from the chosen configuration.",

      /* --- generator: nagłówki sekcji ---
         Rejestr: fraza rzeczownikowa, bez rodzajnika, bez kropki. Wielkie litery
         należą do CSS, nie do treści. */
      "g.h.params":              "Deployment parameters",
      "g.h.import":              "Import an existing file",
      "g.h.baseImage":           "Base image",
      "g.h.network":             "Networking",
      "g.h.names":               "Names and TLS",
      "g.h.services":            "Services",
      "g.h.octavia":             "Octavia",
      "g.h.decisions":           "Deliberate decisions",
      "g.h.output":              "Output",
      "g.h.lint":                "Configuration check",

      /* --- walidator: szkielet interfejsu --- */
      /* --- walidator: aktualność wyniku --- */
      "v.stale.bar":           "The input has changed since this result was produced.",
      "v.stale.run":           "Analyse now",
      "v.btn.run":             "Analyse",
      "v.btn.run.title":       "Run the analysis against the current contents of the fields",

      "v.title":               "Rackpathlabs — multinode inventory validator (Kolla-Ansible)",
      "v.desc":                "Validator for a Kolla-Ansible multinode inventory: groups, duplicates, empty groups. Runs offline, with no external dependencies.",
      "v.h1":                  "<em>Multinode</em> inventory validator for Kolla-Ansible",
      "v.lede":                "Reads an INI inventory and checks it: the presence and membership of the <code>control</code>, <code>network</code>, <code>compute</code>, <code>storage</code> and <code>monitoring</code> groups, duplicate hosts, empty groups, contradictory variables and syntax errors. Optionally takes a <code>globals.yml</code> and adds the rules that need both files at once. Everything is analysed in your browser — the file is never uploaded or stored. Scope and limits are described in <a href=\"https://github.com/Rackpathlabs/kolla-tools/blob/main/SCOPE.md\">SCOPE.md</a>.",
      "v.btn.file":            "Load file…",
      "v.btn.sampleOk":        "Valid example",
      "v.btn.sampleBad":       "Example with errors",
      "v.btn.clear":           "Clear",
      "v.btn.report":          "Copy report",
      "v.editor.label":        "Inventory file contents",
      "v.editor.placeholder":  "[control]\nctrl01 ansible_host=10.0.0.11\n\n[network]\n…\n\nPaste the contents of your multinode file, or drag it here.",
      "v.release.label":       "release",
      "v.release.title":       "The release the group names are checked against",
      "v.releaseTo.label":     "&rarr; target",
      "v.releaseTo.title":     "Optional: the release you plan to move to",
      "v.releaseTo.none":      "— no upgrade planned —",
      "v.topology":            "Topology",
      "v.topology.group":      "Group",
      "v.topology.hosts":      "Hosts",
      "v.topology.count":      "Count",
      "v.topology.required":   "required",
      "v.topology.missing":    "section absent from the file",
      "v.topology.subgroups":  "subgroups: {list}",
      "v.result":              "Validation result",
      "v.empty":               "No data — paste an inventory file.",
      "v.start":               "Paste an inventory file to begin.",
      "v.globals.h":           "globals.yml",
      "v.globals.none":        "not loaded",
      "v.globals.loaded":      "loaded",
      "v.globals.label":       "Contents of globals.yml — optional",
      "v.globals.placeholder": "Optional. Paste or drag a globals.yml to enable the rules that need both files at once.",
      "v.ack.nobmc.h":         "Lab without BMC — Masakari for testing only",
      "v.ack.nobmc.p":         "Acknowledging this lowers the fencing finding to informational. It does not silence it: an environment <em>named</em> \"dev\" is not an exemption, because the configuration gets copied to production.",
      "v.scope.note":          "<strong>This file is used here only for the rules that need both files at once</strong> — VIP collisions, Cinder clustering and Masakari fencing. The validator <strong>does not check</strong> the <code>globals.yml</code> itself: interfaces, TLS, service dependencies and release compatibility are linted by the <a href=\"generator.html\">globals.yml generator</a>. An empty list below does not mean the file is correct — it means there is no conflict with this inventory.",
      "v.footer":              "Rackpathlabs — OpenStack tooling. A single HTML file, no external dependencies, works offline.",

      /* --- liczebniki: en dwie formy, pl trzy --- */
      "n.node":                "node|nodes",
      "n.host":                "host|hosts",
      "n.error":               "error|errors",
      "n.warning":             "warning|warnings",
/* --- walidator: raport tekstowy --- */
/* --- walidator: kworum (KV-02) --- */
/* --- walidator: wbudowane przykłady (jedna linia komentarza, patrz kod) --- */
/* --- walidator: reguły wymagające obu plików (KV-01, KV-07, KV-09) ---
         Angielskie brzmienie wzięte z rulesetu, który powstał po angielsku
         z terminologią upstreamu — nie z tłumaczenia polskiego kodu. */
/* --- walidator: kolokacja ról (KV-04, KV-11) — brzmienie z rulesetu,
         wraz z sekcjami "Not a bug when", bo to one odróżniają regułę od alarmu --- */
/* --- walidator: reguły wydania i tryb aktualizacji --- */
/* --- walidator: status wydania --- */
      "v.rs.development":      "a development branch — the release has not shipped as stable yet",
      "v.rs.unmaintained":     "unmaintained — no fixes are produced for it, security ones included",
      "v.rs.eol":              "the release has reached end of life",
      "v.src.path":            "path",
      "v.src.both":            "both files",
      "v.rel.planned":         "planned release",
      "v.rel.since":           "since",

      "v.r.renamed":           "was renamed to <code>{to}</code> in release <code>{rel}</code>.",
      "v.r.removed":           "is no longer supported in release <code>{rel}</code>.",
      "v.r.group":             "Group <code>[{group}]</code> ",

      "v.q.ovnSpof.msg":       "Group <code>[{group}]</code> has one host against {count} control nodes.",
      "v.q.ovnSpof.hint":      "Allowed, but {label} becomes a single point of failure for the network control plane.",
      "v.q.ceph.msg":          "Group <code>[ceph-mon]</code> has {count} — Ceph monitors need an odd number, no fewer than {min}.",

      "v.u.todo.renameKey":    "Rename the key in globals.yml before upgrading — the old one will not be recognised.",
      "v.u.todo.renameGroup":  "Rename the section in the inventory before upgrading — the old name will not be recognised.",
      "v.u.gap.hint":          "Changes made in {which} are not shown here — not because there were none, but because they have not been reviewed against the release notes. An empty list would look exactly like no changes, so the gap is stated outright. Read the release notes for those releases yourself.",
      "v.u.gap.which1":        "that release",
      "v.u.gap.whichN":        "those releases",

      "v.c.ctlcmp.msg":        "{n} also serves as both a control node and a compute node: {hosts}.",
      "v.c.ctlcmp.escalated":  "The <code>globals.yml</code> shows HA tooling, so the escalation condition is met and this is an error rather than a trade-off. ",
      "v.c.ctlcmp.hint":       "Without Masakari this is a valid hyperconverged layout — plan a CPU and memory reserve for the control services. With <code>enable_masakari</code> the same configuration is an error that risks data corruption: either Pacemaker Remote cannot start on a host that is already a full Corosync member, or — with <code>restrict_to_remotes = false</code> — hostmonitor treats a control node as an evacuation candidate, and a maintenance reboot makes Masakari evacuate VMs from the host running MariaDB and RabbitMQ, through an API that is currently down. Cascade.",
      "v.c.ctlcmp.needGlobals": " Settling it needs the <code>globals.yml</code> — load it in the panel alongside and the tool can make the call.",

      "v.c.net.same.msg":      "The membership of <code>[network]</code> is identical to <code>[control]</code>.",
      "v.c.net.same.hint":     "Under OVN the hosts in <code>[network]</code> get <code>enable-chassis-as-gw</code> and become gateway chassis. The default <code>[network:children] = control</code> pattern therefore pushes all north-south traffic — SNAT and non-DVR floating IPs — through the controllers. A three-VM lab never shows it; at around fifty instances <code>ovn-controller</code> competes for CPU with MariaDB and RabbitMQ, and on gateway failover BFD flaps and takes Corosync with it. Setting <code>neutron_ovn_distributed_fip: \"yes\"</code> softens the floating-IP part, but SNAT still goes through the gateway chassis. Collocation with <code>[compute]</code> is a valid pattern — the alarm is specifically about inheriting from <code>[control]</code>.",
      "v.c.net.partial.msg":   "Some network nodes are also control nodes: {hosts}.",
      "v.c.net.partial.hint":  "The dataplane lands on the control plane — OVN gateways share CPU with MariaDB and RabbitMQ. The effect only shows under load.",
      "v.c.gw.msg":            "Group <code>[network]</code> has {count} against {computeCount} compute nodes.",
      "v.c.gw.hint":           "The OVN gateway has nowhere to fail over to — losing that host takes north-south traffic for the whole cloud with it. Redundancy starts at {min} network nodes.",
      "v.c.storage.msg":       "{n} combines the compute and storage roles: {hosts}.",
      "v.c.storage.hint":      "A hyperconverged layout. Volume services compete for memory and CPU with the virtual machines — a node under memory pressure degrades storage for the whole cloud, not only for itself. Plan a resource reserve.",
      "v.c.n.hostServes":      "One host|{n} hosts",
      "v.c.n.hostCombines":    "One host|{n} hosts",
      "n.computeNode":         "compute node|compute nodes",

      "v.x.kv01.msg":          "<code>enable_masakari</code> and <code>enable_hacluster</code> are on, and the inventory carries no management controller field at all (<code>ipmi_*</code>, <code>bmc_*</code>, <code>drac_*</code>, <code>ilo_*</code>, <code>redfish_*</code>) — fencing has nothing to be built from.",
      "v.x.kv01.hint":         "Network isolation of a compute node — not a real host failure — looks the same to hostmonitor: it reports the host down, Masakari evacuates, Nova rebuilds the VM elsewhere, and the original QEMU is still alive holding an open RBD descriptor. Two instances write to the same Ceph volume and the guest filesystem is corrupted. Without fencing there is no way to force-release the lock. Full confidence cannot come from these two files: <code>masakari-monitors.conf</code> (<code>disable_ipmi_check</code>, true by default) and the hacluster overrides live outside them.",

      "v.x.kv07.msg":          "Group <code>[storage]</code> has {count}, and <code>globals.yml</code> does not set <code>cinder_cluster_name</code>.",
      "v.x.kv07.hint":         "This is not high availability; it is as many independent backends as there are hosts, sharing one pool. Without clustering every volume gets <code>host = &lt;node&gt;@ceph#ceph</code> in the database. Everything works, because Ceph is shared and attach goes through Nova — until that node is lost. Then <code>delete</code>, <code>extend</code>, <code>retype</code> and <code>snapshot</code> on its volumes hang in <code>deleting</code> or <code>error</code> forever, because no other cinder-volume picks them up. The fix is a manual <code>cinder-manage volume update_host</code> against a production database.",

      "v.x.kv09.collision.msg": "<code>{key}</code> is set to <code>{vip}</code>, which is already the address of host {hosts}.",
      "v.x.kv09.collision.hint": "The deployment will pass — keepalived raises the address without asking anyone. What follows is a duplicate IP, ARP flapping and random API timeouts visible only from parts of the network.",
      "v.x.kv09.subnet.msg":   "<code>{key}</code> (<code>{vip}</code>) lies outside <code>{prefix}.0/{mask}</code>, the subnet inferred from the host addresses.",
      "v.x.kv09.subnet.hint":  "Assumption: every <code>ansible_host</code> address sits in one subnet with a <code>/{mask}</code> mask. Inventories rarely carry masks, so this is an inference rather than a reading — under a different network layout this finding is a false alarm, and you should ignore it. If it is not: HAProxy binds, keepalived raises the address, but return routing fails outside the local segment — \"works from the control node, not from a workstation\".",

      "v.sample.ok":           "Multinode inventory: 3 control, 2 network, 4 compute nodes",
      "v.sample.bad":          "Inventory with typical mistakes - to see what the validator does",

      "v.q.aio.msg":           "All-in-one inventory: the only host in <code>[control]</code> is also a compute node.",
      "v.q.aio.hint":          "A lab layout — the absence of high availability is a choice here, not a fault. A production deployment needs at least {min} control nodes.",
      "v.q.single.msg":        "Group <code>[{group}]</code> has one host — {label} has neither quorum nor redundancy.",
      "v.q.needOdd":           "An odd number of hosts is required, no fewer than {min}.",
      "v.q.count.msg":         "Group <code>[{group}]</code> has {count} — {reason} for quorum ({label}).",
      "v.q.even":              "an even number",
      "v.q.tooFew":            "too few",

      "v.rep.title":           "Rackpathlabs — multinode inventory validation report",
      "v.rep.hosts":           "Hosts: {hosts}   Groups: {groups}",
      "v.rep.path":            "Upgrade path: {from} -> {to}",
      "v.rep.globalsYes":      "globals.yml: loaded — the rules needing both files are active",
      "v.rep.globalsNo":       "globals.yml: not loaded — inventory rules only",
      "v.rep.release":         "Release: {id} {name}{kolla}",
      "v.rep.result":          "Result: {errors}, {warnings}, {info} info",
      "v.rep.clean":           "No problems found.",
      "v.rep.topology":        "Topology:",
      "v.rep.absent":          "group not present",
      "v.rep.refLine":         "line {line}",
      "v.rep.refMissing":      "key absent",
      "v.rep.both":            "both",
      "v.sev.error":           "ERROR",
      "v.sev.warn":            "WARN ",
      "v.sev.info":            "INFO ",

      /* Findingi walidatora są dziś składane z literałów w kodzie — wszystkie 27.
         Ten jest pierwszym, który idzie przez słownik, i nie jest to niekonsekwencja,
         tylko kierunek: próg w check-dictionary.js mówi wprost, że KAŻDY NOWY tekst
         ma iść przez słownik, bo inaczej liczba rośnie. Migracja pozostałych 26 to
         #58 i nie robimy jej tutaj — dopisanie nowego długu i tak byłoby ruchem
         w przeciwną stronę niż to zgłoszenie. Mechanizm jest gotowy (wstawki {…}
         w t()), więc nie powstaje tu nic nowego poza dwoma kluczami. */
      /* Sześć wpisów przeniesionych z literałów w kodzie 2026-09-01 — rejestr #77.
         Żadnego z nich nie wykonywał ani jeden z trzynastu scenariuszy, więc nie
         widział ich ani check-english.js, ani migawka, ani goldeny; znalazło je
         czytanie. Od chwili wejścia do słownika obejmuje je statyczny przebieg po
         WARTOŚCIACH słownika, niezależny od pokrycia (ADR-004, opcja B). */
      /* Rodzina PARSERA — przeniesione 2026-09-01 z literałów w kodzie walidatora (#58).
         Wartości przepisane BAJT W BAJT z literałów; migawka piętnastu scenariuszy
         potwierdza, że na ekranie nic się nie zmieniło. */
      "v.f.syntax.malformed":      "Malformed section header: <code>{header}</code>.",
      "v.f.syntax.emptyName":      "The section header has an empty group name.",
      "v.f.outsideGroup":          "Entry <code>{entry}</code> appears before any group header.",
      "v.f.outsideGroup.hint":     "Ansible puts it in <code>ungrouped</code>, so no Kolla role covers it.",
      "v.f.groupVar":              "In <code>[{group}:vars]</code> the entry <code>{entry}</code> is not a variable assignment.",
      "v.f.groupVar.hint":         "Ansible expects <code>key=value</code>, with no spaces around the equals sign.",
      "v.f.range":                 "Pattern <code>{pattern}</code> is not a valid host range.",
      "v.f.range.hint":            "Ansible expects <code>name[01:10]</code> or <code>name[a:f]</code>, optionally with a step " +
                                   "(<code>[01:10:2]</code>). Both ends must be of the same kind, and with a leading zero also of the same length.",
      /* Rodzina STRUKTURY — przeniesione 2026-09-01 z literałów walidatora (#58). */
      "v.f.emptyGroup":            "Group <code>[{group}]</code> holds no host.",
      "v.f.emptyGroup.hint":       "An empty group is ignored at deploy time; drop it or give it hosts.",
      "v.f.groupUndefined":        "Group <code>{group}</code> is listed as a child group but defined nowhere.",
      "v.f.groupUndefined.hint":   "Add a <code>[{group}]</code> section, or drop the entry from the children list.",
      "v.f.duplicateHost":         "Host <code>{host}</code> is listed twice in group <code>[{group}]</code>.",
      "v.f.duplicateHost.hint":    "First occurrence: line {line}. The repeated entry can override the host variables.",
      "v.f.conflictingVar":        "Host <code>{host}</code> has two different values for <code>{key}</code>: " +
                                   "<code>{first}</code> (line {line}) and <code>{second}</code>.",
      "v.f.conflictingVar.hint":   "Ansible takes the last definition — a mismatch here is almost always a mistake in the file.",
      "v.f.duplicateEndpoint":     "Endpoint <code>{endpoint}</code> is assigned to different hosts: {hosts}.",
      "v.f.duplicateEndpoint.hint": "Kolla treats them as separate nodes and deploys conflicting configurations onto one machine.",
      /* Rodzina GRUP WYMAGANYCH i NAZW — przeniesione 2026-09-01 (#58).
         Pięć wariantów podpowiedzi dla pustej grupy wymaganej stoi pod pięcioma kluczami,
         a nie pod jednym ze wstawką: to są PIĘĆ RÓŻNYCH ZDAŃ o pięciu różnych rolach,
         a nie jedno zdanie z podstawianą nazwą. Klucze są WYPISANE JAWNIE w drabince
         warunków, a nie składane z nazwy grupy: check-i18n.js czyta klucze jako literały
         i klucz składany w czasie działania jest dla niego niewidzialny. Pierwsza wersja
         składała go i strażnik zgłosił jedno odwołanie spoza słownika oraz pięć kluczy
         bez użycia — czyli dokładnie to, przed czym ta reguła broni. */
      "v.f.missingGroup":          "Required group <code>[{group}]</code> is missing.",
      "v.f.missingGroup.hint":     "A Kolla-Ansible multinode inventory is built on the groups: {groups}.",
      "v.f.requiredEmpty":         "Group <code>[{group}]</code> is declared but holds no host.",
      "v.f.requiredEmpty.compute": "With no compute nodes no instance can start.",
      "v.f.requiredEmpty.network": "With no network nodes the L3, DHCP and metadata agents have nowhere to run.",
      "v.f.requiredEmpty.control": "With no control nodes the control plane services cannot be deployed.",
      "v.f.requiredEmpty.storage": "The deployment succeeds, but the volume services (Cinder) have nowhere to start.",
      "v.f.requiredEmpty.monitoring": "The deployment succeeds, but Prometheus and Grafana have nowhere to start.",
      "v.f.typo":                  "Group <code>{group}</code> resembles the standard group <code>{standard}</code>.",
      "v.f.typo.hint":             "Kolla-Ansible will not recognise a group under a different name — check the spelling.",
      "v.f.groupCustom":           "Group <code>{group}</code> does not appear in the reference Kolla-Ansible inventory.",
      "v.f.groupCustom.hint":      "That is fine as long as it is used deliberately, for example for custom roles or a hardware split.",
      /* Rodzina STATUSU WYDANIA — przeniesione 2026-09-01 (#58).

         W tej rodzinie ZOSTAJE 40 napisów, których TU NIE MA, i to jest decyzja, a nie
         niedokończona robota: pola `note:` w matrix.js opisują konkretne wycofanie
         w konkretnym wydaniu upstreamu. Macierz jest DANYMI ZE ŹRÓDŁA ZEWNĘTRZNEGO
         (tools/upstream_watch.py, kamień milowy v0.4), a przeniesienie jej treści do
         słownika oznaczałoby, że tekst opisujący cudze wydanie jest utrzymywany po naszej
         stronie i rozjeżdża się przy każdej regeneracji macierzy. Klasa jest opisana
         w #58; z tych 40 tylko 2 renderuje jakikolwiek scenariusz. */
      /* Diagnostyka GENERATORA — przeniesione 2026-09-01 z literałów (#58).
         Rodzina jest większa niż to, co widać w progu: w generator.html stoi 48 literałów
         msg:/hint:, a scenariusze renderują 8 z nich. Przeniesione są te renderowane;
         liczba i powód stoją w #58, żeby reszta była planem, a nie zapomnieniem. */
      "g.d.ifaceRequired":         "Field {field} is required.",
      "g.d.extDirect":             "<code>neutron_external_interface</code> (<code>{iface}</code>) is the same interface as <code>{role}</code>.",
      "g.d.extShared":             "<code>neutron_external_interface</code> (<code>{iface}</code>) shares a base device with <code>{role}</code> (<code>{device}</code>).",
      "g.d.ampProviderOff":        "<code>octavia_amp_network</code> of type <code>vlan</code> requires <code>enable_neutron_provider_networks</code>.",
      "g.d.ampPhysnet":            "<code>{physnet}</code> does not follow from the external interface list — available: {available}. " +
                                   "One external interface cannot map two physical networks.",
      "g.d.ampFlat":               "An amphora network of type <code>flat</code> also rests on a provider network — " +
                                   "check that <code>enable_neutron_provider_networks</code> matches the design.",
      "g.d.tlsNoCa":               "<code>kolla_enable_tls_internal</code> without <code>kolla_copy_ca_into_containers</code> " +
                                   "and without Let's Encrypt: the containers will not trust a private CA. At Keystone " +
                                   "bootstrap, or on the first call between services, every log fills at once with " +
                                   "<code>SSLError: certificate verify failed</code>. It looks like a Keystone " +
                                   "failure; it is a trust store failure.",
      "g.d.fqdnIdentical":         "<code>kolla_internal_fqdn</code> and <code>kolla_external_fqdn</code> are identical. " +
                                   "The internal and public endpoints in the service catalogue then point at the same " +
                                   "place: traffic between services leaves through the external VIP, and admin " +
                                   "endpoints become reachable from the public network. An audit usually finds this, " +
                                   "not an outage.",
      "g.d.dependency":            "<code>{what}</code> requires {needs}.",
      "v.f.release.hint":          "Group names are checked against this release.",
      "v.f.syntax.hint":           "Expected format: <code>[name]</code>, <code>[name:children]</code> or <code>[name:vars]</code>.",
      "v.f.sectionKind":           "Unknown section type <code>{kind}</code>.",
      "v.f.childrenFormat":        "Section <code>[{group}:children]</code> may contain only group names, one per line.",
      "v.f.groupCycle.hint":       "Ansible will refuse an inventory like this when it loads it.",
      "v.f.duplicateVar":          "Variable <code>{key}</code> is set twice in <code>[{group}:vars]</code>.",
      /* Dwie wstawki, jeden klucz, ŻADNEGO wariantu liczebnika — i to jest
         rozstrzygnięcie, nie przeoczenie. Po angielsku nie odmienia się tu nic:
         „and 1 more" i „and 4 more" różnią się wyłącznie liczbą. Wariant liczebnika
         byłby wpisem, który nigdy nie wybiera drugiej formy. */
      "v.hostList.more":           "{shown} and {more} more",
      "v.f.hostNoKollaGroup":      "Host <code>{host}</code> is in no group that Kolla-Ansible deploys onto.",
      "v.f.hostNoKollaGroup.hint": "Its groups are {groups}, and Kolla-Ansible selects hosts by group name. No service will be deployed on this host.",
      "v.f.hostNoKollaGroup.none": "It belongs to no group beyond the implicit ones. No service will be deployed on this host.",

      "v.verdict.errors":      "The inventory contains errors that block deployment.",
      "v.verdict.warnings":    "Syntax is valid — there are warnings to review.",
      "v.verdict.clean":       "No objections within what this tool checks.",

      "hub.footer":            "Rackpathlabs — OpenStack tooling. Code and issues: <a href=\"https://github.com/Rackpathlabs/kolla-tools\">github.com/Rackpathlabs/kolla-tools</a>. MIT licence."
    };

    function t(key, vars) {
      var s = DICT[key];
      /* Brakującego klucza nie ukrywamy pustym napisem — ma być widoczny. */
      if (s === undefined) return "[[" + key + "]]";
      if (!vars) return s;
      return String(s).replace(/\{(\w+)\}/g, function (whole, name) {
        return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole;
      });
    }

    function plural(key, n) {
      var forms = String(t(key)).split("|");
      return forms[Math.min(n === 1 ? 0 : 1, forms.length - 1)];
    }

    function count(key, n) { return n + " " + plural(key, n); }

    return {
      t: t, plural: plural, count: count,
      dict: DICT,
      keys: function () { return Object.keys(DICT); }
    };
  })();

  var T = I18N.t;
  /* == KOLLA-I18N END == */
