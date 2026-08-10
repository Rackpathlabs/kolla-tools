/* Golden-file: znane wejście -> bajtowo znany globals.yml.
 *
 * Sens tego testu jest inny niż testów dymnych. Tamte pytają o rzeczy, o które
 * ktoś pomyślał; golden pilnuje CAŁEGO wyjścia, więc łapie też zmiany, o które
 * nikt nie zapytał — łącznie z takimi, które nie zmieniają zachowania, a jednak
 * są pomyłką (dwa bajty NUL w #22 przeszły przez sto asercji właśnie dlatego,
 * że każda pytała o coś konkretnego).
 *
 * Aktualizacja wzorców po ZAMIERZONEJ zmianie wyjścia:
 *     bash tools/run-tests.sh --update
 * i obejrzenie diffa przed commitem — bo to jedyny moment, w którym ten test
 * daje się oszukać.
 */

var fs = require("fs");
var path = require("path");
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2], ["validate", "badFields", "buildYaml"]);

var dir = path.join(__dirname, "generator");
/* flaga argumentem, nie zmienną środowiskową: pod WSL testy potrafi
   wykonywać node.exe z Windows, do którego środowisko nie przechodzi */
var update = process.argv.indexOf("--update") !== -1;
var R = lib.runner();

function firstDiff(a, b) {
  var la = a.split("\n"), lb = b.split("\n");
  for (var i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      return "linia " + (i + 1) + ": wzorzec " + JSON.stringify(la[i]) +
             " != wynik " + JSON.stringify(lb[i]);
    }
  }
  return "różnica poza treścią linii (długość pliku)";
}

var cases = fs.readdirSync(dir).filter(function (f) {
  return f.slice(-5) === ".json";
}).sort();

if (!cases.length) { console.log("  FAIL brak przypadków w " + dir); process.exit(1); }

cases.forEach(function (file) {
  var name = file.slice(0, -5);
  var state = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  var built = T.buildYaml(state, T.badFields(T.validate(state)));
  /* dokładnie ten ciąg, który trafia do pobieranego pliku (exportText) */
  var actual = built.text.replace(/\n?$/, "\n");
  var goldenPath = path.join(dir, name + ".yml");

  if (update) {
    fs.writeFileSync(goldenPath, actual);
    console.log("  zapisano " + name + ".yml (" + actual.length + " B)");
    return;
  }

  if (!fs.existsSync(goldenPath)) {
    R.ok(name, false, "brak wzorca " + name + ".yml — uruchom z --update");
    return;
  }

  var expected = fs.readFileSync(goldenPath, "utf8");
  R.ok(name + " — wyjście zgodne co do bajtu", actual === expected,
       actual === expected ? "" : firstDiff(expected, actual));
  R.ok(name + " — serializer nie zatrzymał generowania", built.tripped === false);
});

if (update) { console.log("\nwzorce zapisane — obejrzyj diff przed commitem"); process.exit(0); }
R.finish();
