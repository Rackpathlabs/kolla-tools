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
var T = lib.loadTool(process.argv[2],
  ["parse", "analyse", "buildReport", "SAMPLE_BAD", "GLOBALS", "I18N"]);

/* --- ścieżka renderująca maksimum tekstu ---
   przykład z błędami + globals.yml włączający reguły dwuplikowe + tryb upgrade
   prowadzący przez wydanie bez skatalogowanych deprecacji. */
var inv = T.SAMPLE_BAD() +
  "\n[murano]\nctrl01\n\n[ceph-mon]\nctrl01\nctrl02\n\n[ovn-database]\nctrl01\nctrl02\n";
var globals = '---\nenable_masakari: "yes"\nenable_hacluster: "yes"\n' +
  'kolla_internal_vip_address: "10.10.0.11"\nletsencrypt_cert_server: "https://example.invalid"\n' +
  'om_enable_rabbitmq_quorum_queues: "yes"\nenable_redis: "yes"\n';

var res = T.analyse(T.parse(inv), "2023.1", T.GLOBALS.parse(globals), {}, "2026.1");

var segments = [];
res.findings.forEach(function (f) {
  segments.push({ where: "finding " + f.code + " (msg)", text: f.msg });
  if (f.hint) segments.push({ where: "finding " + f.code + " (hint)", text: f.hint });
});

T.buildReport(res, { e: 1, w: 1, i: 1 }).split("\n").forEach(function (line, i) {
  if (line.trim()) segments.push({ where: "report line " + (i + 1), text: line });
});

Object.keys(T.I18N.dict).forEach(function (key) {
  segments.push({ where: "dictionary key " + key, text: String(T.I18N.dict[key]) });
});

/* Treść znaczników — to, co widać przed jakąkolwiek analizą. */
var html = fs.readFileSync(process.argv[3] || path.join(root, "validator.html"), "utf8");
var body = html.slice(html.indexOf("<body"), html.indexOf("</body>"));
body = body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<!--[\s\S]*?-->/g, " ");
body.replace(/<[^>]+>/g, "\n").split("\n").forEach(function (line, i) {
  if (line.trim().length > 2) segments.push({ where: "markup", text: line.trim() });
});

var hits = [], excusedCount = 0;
segments.forEach(function (seg) {
  var plain = String(seg.text).replace(/<[^>]*>/g, " ");
  if (!isPolish(plain)) return;
  if (excused(plain)) { excusedCount++; return; }
  hits.push(seg);
});

console.log("sprawdzono fragmentów widocznego tekstu: " + segments.length +
            (excusedCount ? "  (wyjątków: " + excusedCount + ")" : ""));

if (!hits.length) {
  console.log("OK   cały widoczny tekst jest po angielsku");
  process.exit(0);
}

console.log("FAIL polski tekst w " + hits.length + " miejscach:");
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
