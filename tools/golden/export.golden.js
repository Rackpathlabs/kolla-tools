/* SCHEMAT EKSPORTU JSON, pinowany bajtowo (#14).
 *
 * POWÓD ISTNIENIA. Eksport JSON jest KONTRAKTEM MASZYNOWYM: ktoś napisze skrypt, który go
 * czyta, i ten skrypt przestanie działać po cichu, gdy pole zmieni nazwę albo zniknie.
 * Raport na ekranie może się zmieniać z każdą poprawką redakcyjną — plik dla maszyny nie.
 *
 * DLACZEGO OSOBNY GOLDEN, A NIE ROZSZERZENIE validator.golden.js. Tamten pinuje WYNIK
 * ANALIZY — {code, sev, src, line, refs} — czyli odpowiedź narzędzia na pytanie o plik.
 * Ten pinuje KSZTAŁT SERIALIZACJI: nazwy pól, ich zagnieżdżenie, wcięcie, końcowy znak
 * nowej linii. To dwa różne zdania i ich zlanie w jedno dałoby wzorzec, który czerwienieje
 * z dwóch nieodróżnialnych powodów.
 *
 * CZEGO TEN WZORZEC NIE PINUJE, powiedziane wprost: treści `msg` ani `hint`, bo eksport
 * JSON ich nie niesie. To jest decyzja z #14, nie przeoczenie — tekst interfejsu podąża
 * za słownikiem, a kod findingu jest stabilny z mocy #26. Eksport Markdown niesie pełny
 * tekst i celowo NIE MA golden-a: pinowanie zdania, które ma się zmieniać przy migracji
 * do słownika, produkowałoby czerwone przy każdej takiej migracji i nauczyłoby ludzi
 * puszczać --update bez patrzenia.
 *
 * Użycie:
 *     node tools/golden/export.golden.js <script.tmp.js>
 *     node tools/golden/export.golden.js <script.tmp.js> --update
 */

var fs = require("fs");
var path = require("path");
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2], ["parse", "analyse", "GLOBALS", "buildExportJson"]);
var R = lib.runner();
R.section("golden: schemat eksportu JSON:");

var update = process.argv.indexOf("--update") !== -1;
var dir = path.join(__dirname, "export");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

/* Jedna fixtura wystarcza i to jest rozstrzygnięcie, nie oszczędność: przedmiotem tego
   wzorca jest KSZTAŁT, a kształt nie zależy od tego, ile findingów wpadło. Fixtura ma
   jednak nieść co najmniej jeden finding z odsyłaczem i jeden bez linii, inaczej dwa
   pola schematu nigdy by się nie pojawiły. */
var srcDir = path.join(__dirname, "validator");
var CASE = "broken-quorum";
var text = fs.readFileSync(path.join(srcDir, CASE + ".ini"), "utf8");
var m = /^#\s*golden-release:\s*(\S+)\s*$/m.exec(text);
if (!m) { R.ok("nagłówek wydania w fixturze", false, CASE + ".ini"); R.finish(); }

var res = T.analyse(T.parse(text), m[1], null, {}, "");
var actual = T.buildExportJson(res);
var goldenPath = path.join(dir, CASE + ".json");

if (update) {
  fs.writeFileSync(goldenPath, actual);
  console.log("  zapisano " + path.relative(path.join(__dirname, "..", ".."), goldenPath));
} else if (!fs.existsSync(goldenPath)) {
  R.ok("wzorzec istnieje", false, "brak " + goldenPath + " — uruchom z --update");
} else {
  var expected = fs.readFileSync(goldenPath, "utf8");
  R.ok("eksport JSON zgodny ze wzorcem CO DO BAJTU", actual === expected,
       firstDiff(expected, actual));
}

/* Pola schematu sprawdzane WPROST, nie tylko przez zgodność z plikiem. Wzorzec przyjęty
   odruchowym --update byłby zgodny sam ze sobą i nie powiedziałby nic o kontrakcie. */
var parsed = JSON.parse(actual);
R.ok("schema jest liczbą i wynosi 1", parsed.schema === 1, String(parsed.schema));
R.ok("niesie release, upgradeTo i hasGlobals",
     "release" in parsed && "upgradeTo" in parsed && "hasGlobals" in parsed,
     Object.keys(parsed).join(","));
R.ok("finding niesie code, sev, src, line, refs",
     parsed.findings.length > 0 &&
     ["code", "sev", "src", "line", "refs"].every(function (k) { return k in parsed.findings[0]; }),
     JSON.stringify(parsed.findings[0] || null));
/* PRZYNĘTA I CAŁA RÓŻNICA MIĘDZY KONTRAKTAMI: msg i hint NIE MAJĄ tu prawa być. */
R.ok("finding NIE niesie msg ani hint",
     parsed.findings.every(function (f) { return !("msg" in f) && !("hint" in f); }),
     JSON.stringify(parsed.findings[0] || null));

function firstDiff(a, b) {
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return "pierwsza różnica na bajcie " + i + ": " +
             JSON.stringify(a.slice(i, i + 24)) + " vs " + JSON.stringify(b.slice(i, i + 24));
    }
  }
  return "";
}

R.finish();
