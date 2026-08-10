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
var T = lib.loadTool(process.argv[2], ["parse", "analyse", "GLOBALS"]);

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

  /* Opcjonalny towarzysz: <nazwa>.globals.yml włącza reguły wymagające obu plików.
     Potwierdzenia deklaruje się w inventory nagłówkiem "# golden-ack: nazwa,nazwa". */
  var gpath = path.join(dir, name + ".globals.yml");
  var hasGlobals = fs.existsSync(gpath);
  var glob = hasGlobals ? T.GLOBALS.parse(fs.readFileSync(gpath, "utf8")) : null;

  var acks = {};
  var am = /^#\s*golden-ack:\s*(\S+)\s*$/m.exec(text);
  if (am) am[1].split(",").forEach(function (a) { acks[a.trim()] = true; });

  function shape(r) {
    return r.findings.map(function (f) {
      return {
        code: f.code, sev: f.sev, src: f.src,
        line: f.line === undefined ? null : f.line,
        refs: (f.refs || []).map(function (x) { return x.src + ":" + (x.line || "-"); })
      };
    });
  }

  /* Ścieżkę aktualizacji deklaruje nagłówek "# golden-upgrade-to: <wydanie>". */
  var um = /^#\s*golden-upgrade-to:\s*(\S+)\s*$/m.exec(text);
  var to = um ? um[1] : "";

  var res = T.analyse(T.parse(text), m[1], glob, acks, to);
  var actual = { release: m[1], upgradeTo: to || null, globals: hasGlobals, findings: shape(res) };

  /* Degradacja jest asercją, nie deklaracją: ten sam plik bez globals musi dać
     zero findingów spoza inventory i dokładnie tę samą listę klasy A. */
  if (hasGlobals && !update) {
    var solo = T.analyse(T.parse(text), m[1], null, {}, to);
    var leaked = shape(solo).filter(function (f) { return f.src !== "inventory"; });
    R.ok(name + " — bez globals żaden finding spoza inventory", leaked.length === 0,
         JSON.stringify(leaked));
    var soloGolden = path.join(dir, name + ".no-globals.expected.json");
    var soloStr = JSON.stringify({ release: m[1], upgradeTo: to || null, globals: false,
                                   findings: shape(solo) }, null, 2) + "\n";
    if (fs.existsSync(soloGolden)) {
      R.ok(name + " — lista klasy A bez globals zgodna",
           soloStr === fs.readFileSync(soloGolden, "utf8"));
    } else {
      R.ok(name + " (bez globals)", false, "brak wzorca — uruchom z --update");
    }
  } else if (hasGlobals && update) {
    var solo2 = T.analyse(T.parse(text), m[1], null, {}, to);
    fs.writeFileSync(path.join(dir, name + ".no-globals.expected.json"),
      JSON.stringify({ release: m[1], upgradeTo: to || null, globals: false, findings: shape(solo2) }, null, 2) + "\n");
    console.log("  zapisano " + name + ".no-globals.expected.json");
  }
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
  var exp = JSON.parse(expected).findings.map(function (f) { return f.code + "/" + f.sev + "/" + f.src + "/" + f.line; });
  var got = actual.findings.map(function (f) { return f.code + "/" + f.sev + "/" + f.src + "/" + f.line; });
  var missing = exp.filter(function (x) { return got.indexOf(x) === -1; });
  var extra = got.filter(function (x) { return exp.indexOf(x) === -1; });
  R.ok(name, false,
       (missing.length ? "brakuje: " + missing.join(", ") + "  " : "") +
       (extra.length ? "nadmiarowe: " + extra.join(", ") : "") ||
       "ta sama treść, inna kolejność wpisów");
});

if (update) { console.log("\nwzorce zapisane — obejrzyj diff przed commitem"); process.exit(0); }
R.finish();
