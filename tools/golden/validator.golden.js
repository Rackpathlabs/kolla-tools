/* Golden-file: znane inventory -> znana lista findingów.
 *
 * Porównywane są DANE (kod reguły, waga, linia), nie HTML. Treść komunikatów
 * zmienia się przy każdej korekcie językowej i wzorzec oparty na niej byłby
 * generatorem fałszywych alarmów; kod, waga i linia to kontrakt reguły.
 *
 * Wydanie jest częścią przypadku, więc siedzi w samym pliku inventory:
 *     # golden-release: 2026.1
 * Celowo wymagane, a nie brane z domyślnego wyboru narzędzia — domyślne wydanie
 * to "najnowsze wspierane" i przesuwa się przy aktualizacji macierzy, co po cichu
 * zmieniałoby wynik wzorca.
 *
 * Aktualizacja po ZAMIERZONEJ zmianie reguł:
 *     bash tools/run-tests.sh --update
 */

var fs = require("fs");
var path = require("path");
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2], ["parse", "analyse"]);

var dir = path.join(__dirname, "validator");
/* flaga argumentem, nie zmienną środowiskową: pod WSL testy potrafi
   wykonywać node.exe z Windows, do którego środowisko nie przechodzi */
var update = process.argv.indexOf("--update") !== -1;
var R = lib.runner();

var cases = fs.readdirSync(dir).filter(function (f) {
  return f.slice(-4) === ".ini";
}).sort();

if (!cases.length) { console.log("  FAIL brak przypadków w " + dir); process.exit(1); }

cases.forEach(function (file) {
  var name = file.slice(0, -4);
  var text = fs.readFileSync(path.join(dir, file), "utf8");
  var m = /^#\s*golden-release:\s*(\S+)\s*$/m.exec(text);
  if (!m) {
    R.ok(name, false, "brak nagłówka '# golden-release: <wydanie>' w " + file);
    return;
  }

  var res = T.analyse(T.parse(text), m[1]);
  var actual = {
    release: m[1],
    findings: res.findings.map(function (f) {
      return { code: f.code, sev: f.sev, line: f.line === undefined ? null : f.line };
    })
  };
  var goldenPath = path.join(dir, name + ".expected.json");
  var actualStr = JSON.stringify(actual, null, 2) + "\n";

  if (update) {
    fs.writeFileSync(goldenPath, actualStr);
    console.log("  zapisano " + name + ".expected.json (" +
                actual.findings.length + " findingów)");
    return;
  }

  if (!fs.existsSync(goldenPath)) {
    R.ok(name, false, "brak wzorca " + name + ".expected.json — uruchom z --update");
    return;
  }

  var expected = fs.readFileSync(goldenPath, "utf8");
  if (actualStr === expected) {
    R.ok(name + " — " + actual.findings.length + " findingów zgodnych", true);
    return;
  }

  /* Różnicę pokazujemy na poziomie wpisów, nie znaków — inaczej raport z CI
     jest nieczytelny. */
  var exp = JSON.parse(expected).findings.map(function (f) { return f.code + "/" + f.sev + "/" + f.line; });
  var got = actual.findings.map(function (f) { return f.code + "/" + f.sev + "/" + f.line; });
  var missing = exp.filter(function (x) { return got.indexOf(x) === -1; });
  var extra = got.filter(function (x) { return exp.indexOf(x) === -1; });
  R.ok(name, false,
       (missing.length ? "brakuje: " + missing.join(", ") + "  " : "") +
       (extra.length ? "nadmiarowe: " + extra.join(", ") : "") ||
       "ta sama treść, inna kolejność wpisów");
});

if (update) { console.log("\nwzorce zapisane — obejrzyj diff przed commitem"); process.exit(0); }
R.finish();
