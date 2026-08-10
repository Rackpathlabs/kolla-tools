/* Golden round-trip parsera globals.yml.
 *
 * Dwie rzeczy są sprawdzane osobno, bo mają różny status:
 *
 *   1. TWARDA ASERCJA, bez pliku wzorcowego: emisja bez podmian musi odtworzyć
 *      wejście CO DO BAJTU. To jest definicja round-tripu, nie jego przybliżenie —
 *      plik wdrożeniowy, który po przejściu przez narzędzie wygląda inaczej, jest
 *      zniszczony, choćby „równoważnie". Obejmuje CRLF i brak znaku końca pliku.
 *
 *   2. WZORZEC: struktura wyniku parsowania (klucz, rodzaj, linia), zgłoszenia
 *      i przegląd kluczy pod kątem wydania — jako dane, nigdy jako tekst
 *      komunikatu, z tego samego powodu co przy wzorcach walidatora.
 *
 * Wydanie dla przeglądu kluczy siedzi w nagłówku pliku (# golden-release:),
 * tą samą konwencją co wzorce walidatora.
 *
 * Aktualizacja po zamierzonej zmianie: bash tools/run-tests.sh --update
 */

var fs = require("fs");
var path = require("path");
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2], ["GLOBALS", "KOLLA_MATRIX", "findRelease",
                                       "IMPORT_MAP", "KNOWN_NO_FIELD"]);

var dir = path.join(__dirname, "roundtrip");
var update = process.argv.indexOf("--update") !== -1;
var R = lib.runner();

var known = {};
Object.keys(T.IMPORT_MAP).forEach(function (k) { known[k] = 1; });
Object.keys(T.KNOWN_NO_FIELD).forEach(function (k) { known[k] = 1; });

var cases = fs.readdirSync(dir).filter(function (f) {
  return /\.yml$/.test(f) && !/\.emitted\.yml$/.test(f);
}).sort();

if (!cases.length) { console.log("  FAIL brak przypadków w " + dir); process.exit(1); }

function firstDiff(a, b) {
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    if (a.charAt(i) !== b.charAt(i)) {
      return "pierwsza różnica na bajcie " + i + ": " +
             JSON.stringify(a.slice(Math.max(0, i - 20), i + 20)) + " vs " +
             JSON.stringify(b.slice(Math.max(0, i - 20), i + 20));
    }
  }
  return "różna długość: " + a.length + " vs " + b.length;
}

cases.forEach(function (file) {
  var name = file.slice(0, -4);
  var input = fs.readFileSync(path.join(dir, file), "utf8");
  var rel = /^#\s*golden-release:\s*(\S+)\s*$/m.exec(input);
  var parsed = T.GLOBALS.parse(input);

  /* --- 1. round-trip bajtowy --- */
  var back = T.GLOBALS.emit(parsed, {}).text;
  if (!update) {
    R.ok(name + " — emisja bez podmian odtwarza wejście co do bajtu",
         back === input, back === input ? "" : firstDiff(input, back));
  }

  /* --- 2. wzorzec struktury --- */
  var actual = {
    ok: parsed.ok,
    keys: parsed.order.map(function (k) {
      return { key: k, kind: parsed.keys[k].kind, line: parsed.keys[k].line };
    }),
    findings: parsed.findings.map(function (f) {
      return { code: f.code, sev: f.sev, line: f.line };
    }),
    review: parsed.ok
      ? T.GLOBALS.review(parsed, rel ? T.findRelease(rel[1]) : null, known)
          .map(function (f) { return { code: f.code, sev: f.sev, key: f.key, line: f.line }; })
      : []
  };
  var goldenPath = path.join(dir, name + ".expected.json");
  var actualStr = JSON.stringify(actual, null, 2) + "\n";

  if (update) {
    fs.writeFileSync(goldenPath, actualStr);
    console.log("  zapisano " + name + ".expected.json (" + actual.keys.length + " kluczy, " +
                actual.findings.length + " zgłoszeń, " + actual.review.length + " uwag)");
  } else if (!fs.existsSync(goldenPath)) {
    R.ok(name, false, "brak wzorca " + name + ".expected.json — uruchom z --update");
  } else {
    var expected = fs.readFileSync(goldenPath, "utf8");
    R.ok(name + " — struktura zgodna", actualStr === expected,
         actualStr === expected ? "" : "wzorzec się rozjechał, porównaj " + name + ".expected.json");
  }

  /* --- 3. emisja z podmianami --- */
  var ovPath = path.join(dir, name + ".overrides.json");
  if (!fs.existsSync(ovPath)) return;
  var over = JSON.parse(fs.readFileSync(ovPath, "utf8"));
  var emitted = T.GLOBALS.emit(parsed, over).text;
  var emitPath = path.join(dir, name + ".emitted.yml");

  if (update) {
    fs.writeFileSync(emitPath, emitted);
    console.log("  zapisano " + name + ".emitted.yml");
  } else if (!fs.existsSync(emitPath)) {
    R.ok(name + " (podmiany)", false, "brak wzorca " + name + ".emitted.yml — uruchom z --update");
  } else {
    var exp = fs.readFileSync(emitPath, "utf8");
    R.ok(name + " — emisja z podmianami zgodna co do bajtu", emitted === exp,
         emitted === exp ? "" : firstDiff(exp, emitted));
  }
});

if (update) { console.log("\nwzorce zapisane — obejrzyj diff przed commitem"); process.exit(0); }
R.finish();
