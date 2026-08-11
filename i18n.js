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
