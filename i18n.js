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
      "n.host":                { en: "host|hosts", pl: "host|hosty|hostów" },
      "n.error":               { en: "error|errors", pl: "błąd|błędy|błędów" },
      "n.warning":             { en: "warning|warnings", pl: "uwaga|uwagi|uwag" },
/* --- walidator: raport tekstowy --- */
/* --- walidator: kworum (KV-02) --- */
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
