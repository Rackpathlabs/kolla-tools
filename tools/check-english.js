/* Kryterium kompletności: narzędzia mówią wyłącznie po angielsku.
 *
 * Ta asercja powstała PRZED tłumaczeniem i była czerwona od pierwszej chwili.
 * To nie jest szczegół procesu, tylko powód, dla którego można jej ufać: miernik
 * budowany PO pracy ma tendencję do jej potwierdzania — nie przez nieuczciwość,
 * tylko dlatego, że powstaje z patrzenia na to, co już jest, i opisuje stan
 * zastany zamiast wymagania. Poprzednik tego pliku (tools/untranslated.js)
 * powstał dokładnie tak i przepuścił nieprawdziwe twierdzenie o kompletności
 * do main.
 *
 * Mierzy PRZEDMIOT, nie kod: uruchamia walidator ścieżką renderującą maksimum
 * tekstu i zbiera to, co użytkownik faktycznie zobaczy — findingi z podpowiedziami,
 * raport, treść znaczników, oraz wszystkie wpisy słownika, czyli komplet
 * komunikatów, jakie narzędzie potrafi wyprodukować (w tym toasty).
 *
 * Przy porażce wypisuje CO i GDZIE, nie samą liczbę — dzięki temu jest
 * jednocześnie bramką i narzędziem roboczym.
 */

var fs = require("fs");
var path = require("path");
var lib = require("./testlib");

var root = path.join(__dirname, "..");

/* Wyjątki. Każdy Z UZASADNIENIEM, nie samą nazwą — od tego zależy, czy za miesiąc
   ktoś dopisze tu wpis, żeby przestało świecić na czerwono. Rosnąca lista jest
   sygnałem, że asercja jest obchodzona, a nie że wyjątki są uzasadnione. */
var EXCEPTIONS = [
  {
    match: /wezly sterujace|obliczeniowe|sieciowe|typowymi bledami|dzialania walidatora/,
    why: "Treść przykładowego inventory to DANE WEJŚCIOWE, nie interfejs. Nazwy hostów " +
         "i grup są częścią pliku, który użytkownik analizuje; ich zmiana przesunęłaby " +
         "numery linii w findingach i rozjechała wzorce golden."
  }
];

/* Polskie znaki oraz słowa funkcyjne — same diakrytyki nie wystarczą, bo część
   polskiego tekstu ich nie zawiera („nie zostanie rozpoznana"). */
var PL_CHARS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
var PL_WORDS = /\b(?:nie|jest|są|oraz|przy|dla|tego|która|który|żeby|ale|albo|czy|zostanie|musi|może|wszystkie|każdy|linia|linii|grupa|grupy|plik|pliku|wydanie|wydania|hostów|węzłów)\b/i;

function isPolish(text) {
  return PL_CHARS.test(text) || PL_WORDS.test(text);
}

function excused(text) {
  for (var i = 0; i < EXCEPTIONS.length; i++) {
    if (EXCEPTIONS[i].match.test(text)) return EXCEPTIONS[i];
  }
  return null;
}

lib.installDom();

/* Profil mówi, KTÓRE narzędzie sprawdzamy i jaką ścieżką je przepędzić.
   Każde ma własną drogę renderującą maksimum tekstu; wspólne jest to, że
   zbieramy wynik, a nie źródła. */
var mode = process.argv[4] || "validator";
var scriptPath = process.argv[2];
var htmlPath = process.argv[3];
var segments = [];

function addSeg(where, text) {
  if (text === undefined || text === null) return;
  if (String(text).trim().length < 3) return;
  segments.push({ where: where, text: String(text) });
}

if (mode === "validator") {
  var T = lib.loadTool(scriptPath,
    ["parse", "analyse", "buildReport", "SAMPLE_BAD", "GLOBALS", "I18N"]);

  /* przykład z błędami + globals włączający reguły dwuplikowe + ścieżka przez
     wydanie bez skatalogowanych deprecacji */
  var inv = T.SAMPLE_BAD() +
    "\n[murano]\nctrl01\n\n[ceph-mon]\nctrl01\nctrl02\n\n[ovn-database]\nctrl01\nctrl02\n";
  var globals = '---\nenable_masakari: "yes"\nenable_hacluster: "yes"\n' +
    'kolla_internal_vip_address: "10.10.0.11"\nletsencrypt_cert_server: "https://example.invalid"\n' +
    'om_enable_rabbitmq_quorum_queues: "yes"\nenable_redis: "yes"\n';

  var res = T.analyse(T.parse(inv), "2023.1", T.GLOBALS.parse(globals), {}, "2026.1");
  res.findings.forEach(function (f) {
    addSeg("finding " + f.code + " (msg)", f.msg);
    addSeg("finding " + f.code + " (hint)", f.hint);
  });
  T.buildReport(res, { e: 1, w: 1, i: 1 }).split("\n").forEach(function (line, i) {
    addSeg("report line " + (i + 1), line);
  });
  Object.keys(T.I18N.dict).forEach(function (k) { addSeg("dictionary key " + k, T.I18N.dict[k]); });

} else if (mode === "generator") {
  var G = lib.loadTool(scriptPath,
    ["validate", "badFields", "buildYaml", "DEFAULTS", "GLOBALS", "I18N"]);

  /* konfiguracja zapalająca możliwie wiele reguł naraz */
  var st = {};
  Object.keys(G.DEFAULTS).forEach(function (k) { st[k] = G.DEFAULTS[k]; });
  st.vip = "10.0.0.250"; st.net_if = "bond0.10"; st.api_if = "bond0.10";
  st.stg_if = "bond0.20"; st.ext_if = "bond0"; st.br_name = "br-ex,br-ex2";
  st.t_hacluster = true; st.t_masakari = true; st.t_octavia = true;
  st.t_cinder = true; st.t_grafana = true; st.t_tls_int = true;
  st.amp_net = "vlan"; st.physnet = "physnet9"; st.release = "2024.2";
  st.int_fqdn = "cloud.example.net"; st.ext_fqdn = "cloud.example.net";

  var diag = G.validate(st, null);
  diag.forEach(function (d, i) { addSeg("diagnostic " + (i + 1) + " (" + d.level + ")", d.msg); });

  /* Jedna konfiguracja nie dosięga wszystkiego. Reguły wykluczają się nawzajem —
     wydanie może być JEDNOCZEŚNIE tylko w jednym stanie — więc komunikat o wydaniu
     spoza macierzy nie ma prawa paść w tym samym przebiegu co komunikat o wydaniu
     wycofanym.

     To nie jest hipoteza. Przy tłumaczeniu trzy komunikaty przeszły tę asercję
     zielono i zostały złapane dopiero przez testy dymne: obrazy niepublikowane dla
     wydania, wydanie spoza macierzy, brakujący klucz o wartości domyślnej. Asercja
     mierząca jeden przebieg mierzy jedną ścieżkę, a nie narzędzie. */
  var VARIANTS = [
    { why: "distro dopuszczalne, ale bez publikowanych obrazów",
      st: { release: "2026.1", distro: "centos" } },
    { why: "wydanie spoza macierzy", st: { release: "stable/2019.2" } },
    { why: "wydanie w rozwoju", st: { release: "2026.2" } },
    { why: "wydanie bez utrzymania", st: { release: "2024.1" } },
    { why: "sieć amfor typu flat", st: { t_octavia: true, amp_net: "flat" } },
    { why: "różne VIP-y bez nazw FQDN",
      st: { vip: "10.0.0.250", ext_vip: "10.0.1.250", int_fqdn: "", ext_fqdn: "" } },
    { why: "usługi bez swoich zależności",
      st: { t_cinder: true, storage: "none", t_grafana: true, t_prometheus: false,
            t_octavia: true, t_barbican: false, t_masakari: true, t_hacluster: false } }
  ];
  VARIANTS.forEach(function (v) {
    var alt = {};
    Object.keys(G.DEFAULTS).forEach(function (k) { alt[k] = G.DEFAULTS[k]; });
    Object.keys(v.st).forEach(function (k) { alt[k] = v.st[k]; });
    G.validate(alt, null).forEach(function (d, i) {
      addSeg("diagnostic [" + v.why + "] " + (i + 1) + " (" + d.level + ")", d.msg);
    });
  });

  /* Klucz o wartości domyślnej wydania: komunikat pada tylko przy WCZYTANYM pliku,
     który tego klucza nie ustawia — ścieżka nieosiągalna dla trybu od zera. */
  var bare = G.GLOBALS.parse('---\nkolla_base_distro: "rocky"\n');
  var withDoc = {};
  Object.keys(G.DEFAULTS).forEach(function (k) { withDoc[k] = G.DEFAULTS[k]; });
  withDoc.release = "2026.1";
  G.validate(withDoc, bare).forEach(function (d, i) {
    addSeg("diagnostic [wczytany plik bez klucza] " + (i + 1) + " (" + d.level + ")", d.msg);
  });

  var built = G.buildYaml(st, G.badFields(diag));
  built.text.split("\n").forEach(function (line, i) {
    if (line.indexOf("#") !== -1) addSeg("emitted globals.yml line " + (i + 1), line);
  });

  /* import: komunikaty przeglądu kluczy */
  var doc = G.GLOBALS.parse('---\nkolla_base_distro: "rocky"\nnieznany_klucz: 1\n' +
                            'om_enable_rabbitmq_high_availability: "yes"\n');
  doc.findings.forEach(function (f) { addSeg("parser finding " + f.code, f.msg + " " + (f.hint || "")); });
  G.GLOBALS.review(doc, null, {}).forEach(function (f) {
    addSeg("import review " + f.code, f.msg + " " + (f.hint || ""));
  });
  Object.keys(G.I18N.dict).forEach(function (k) { addSeg("dictionary key " + k, G.I18N.dict[k]); });

} else {
  var H = lib.loadTool(scriptPath, ["I18N"]);
  Object.keys(H.I18N.dict).forEach(function (k) { addSeg("dictionary key " + k, H.I18N.dict[k]); });
}

/* Treść znaczników — to, co widać przed jakąkolwiek interakcją. */
var html = fs.readFileSync(htmlPath, "utf8");
var body = html.slice(html.indexOf("<body"), html.indexOf("</body>"));
body = body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<!--[\s\S]*?-->/g, " ");
body.replace(/<[^>]+>/g, "\n").split("\n").forEach(function (line) { addSeg("markup", line.trim()); });

/* Powiadomienia MUSZĄ iść przez słownik.
   Osiemnaście toastów wpisanych wprost w kod przetrwało całą migrację na angielski
   i przeszło tę asercję na zielono, bo nie ma ich ani w znacznikach, ani w słowniku,
   a padają tylko w obsłudze zdarzeń, których asercja nie wywołuje. Twierdzenie
   „cały widoczny tekst jest po angielsku" było wtedy nieprawdziwe.
   Skanowanie treści nic by nie dało — angielski literał wpisany w kod przeszedłby
   tak samo. Zakazujemy więc SAMEJ KONSTRUKCJI: komunikat ma mieć klucz, bo tylko
   wtedy widać go w słowniku, a słownik jest tym, co asercja czyta. */
var inlineToasts = [];
html.replace(/\btoast\(\s*(["'])/g, function (whole, q, at) {
  var line = html.slice(0, at).split("\n").length;
  inlineToasts.push(line + ": " + html.slice(at, at + 70).split("\n")[0]);
  return whole;
});
if (inlineToasts.length) {
  console.log("FAIL [" + mode + "] powiadomienie z literałem zamiast klucza słownika, " +
              inlineToasts.length + " razy:");
  inlineToasts.forEach(function (h) { console.log("  " + h); });
  process.exit(1);
}

var hits = [], excusedCount = 0;
segments.forEach(function (seg) {
  var plain = String(seg.text).replace(/<[^>]*>/g, " ");
  if (!isPolish(plain)) return;
  if (excused(plain)) { excusedCount++; return; }
  hits.push(seg);
});

console.log("[" + mode + "] sprawdzono fragmentów widocznego tekstu: " + segments.length +
            (excusedCount ? "  (wyjątków: " + excusedCount + ")" : ""));

if (!hits.length) {
  console.log("OK   [" + mode + "] cały widoczny tekst jest po angielsku");
  process.exit(0);
}

console.log("FAIL [" + mode + "] polski tekst w " + hits.length + " miejscach:");
var seen = Object.create(null);
hits.forEach(function (h) {
  var key = h.where + "|" + h.text.slice(0, 40);
  if (seen[key]) return;
  seen[key] = 1;
  var plain = String(h.text).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  console.log("  " + h.where);
  console.log("      " + plain.slice(0, 120));
});
process.exit(1);
