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
var T = lib.loadTool(process.argv[2], ["validate", "badFields", "buildYaml", "DIAG_IDS"]);

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


/* ---- diagnostyka: {id, level, field} JAKO DANE, nigdy treść komunikatu ----
 *
 * Waga nie zmienia emisji, więc do #26 cała warstwa lintu leżała poza tym, co ten
 * plik dowodzi: drabinę KV-06 dało się odwrócić i wszystkie wzorce przechodziły dalej.
 *
 * Porównywane są TRZY POLA i ani jedno z nich nie jest tekstem. Wzorzec oparty na
 * treści komunikatu produkowałby czerwone przy każdej korekcie redakcyjnej, a czerwone
 * bez znaczenia jest gorsze od braku wzorca — po tygodniu przestaje się je czytać.
 *
 * KOLEJNOŚĆ TEŻ JEST WYNIKIEM. validate() sortuje po wadze, więc przesunięcie reguły
 * między error a warn zmienia miejsce wpisu na liście. Gdyby porównanie szło po
 * zbiorze, taka zmiana byłaby niewidoczna dokładnie dla tej klasy, dla której ten
 * wzorzec powstał.
 */
function shape(diag) {
  return diag.map(function (x) { return { id: x.id, level: x.level, field: x.field === undefined ? null : x.field }; });
}

function compareDiag(name, diag) {
  var file = path.join(dir, name + ".diag.json");
  var actual = JSON.stringify(shape(diag), null, 1) + "\n";

  if (update) {
    fs.writeFileSync(file, actual);
    console.log("  zapisano " + name + ".diag.json (" + diag.length + " wpisów)");
    return;
  }
  if (!fs.existsSync(file)) {
    R.ok(name + " — diagnostyka", false, "brak wzorca " + name + ".diag.json — uruchom z --update");
    return;
  }
  var expected = fs.readFileSync(file, "utf8");
  if (actual === expected) {
    R.ok(name + " — " + diag.length + " diagnostyk zgodnych ({id, level, field})", true);
    return;
  }
  R.ok(name + " — diagnostyka", false, firstDiff(expected, actual));

  /* Różnica wypisana JAKO POZYCJE, nie jako numer linii JSON-a: przy wadze
     odwróconej w LINT czytelnik ma zobaczyć, KTÓRA reguła zmieniła wagę. */
  var e = JSON.parse(expected), a = JSON.parse(actual);
  var byId = {};
  e.forEach(function (x) { byId[x.id + "|" + x.field] = x.level; });
  a.forEach(function (x) {
    var k = x.id + "|" + x.field;
    if (!(k in byId)) { console.log("      + " + x.id + "  " + x.level + "  " + x.field); return; }
    if (byId[k] !== x.level) console.log("      ! " + x.id + "  waga " + byId[k] + " -> " + x.level);
    delete byId[k];
  });
  Object.keys(byId).forEach(function (k) { console.log("      - " + k.split("|")[0] + "  " + byId[k]); });
}

/* .diag.json to WYNIK, nie przypadek. Bez tego wykluczenia każdy nowy wzorzec
   diagnostyki wracał jako fikcyjny przypadek wejściowy i runner szukał dla niego
   pliku <case>.diag.yml — pięć czerwonych o niczym, obok prawdziwych czerwonych.
   Złapane sondą odwracającą wagę w LINT, czyli tą, która miała sprawdzić co innego. */
var cases = fs.readdirSync(dir).filter(function (f) {
  return f.slice(-5) === ".json" && f.slice(-10) !== ".diag.json";
}).sort();

if (!cases.length) { console.log("  FAIL brak przypadków w " + dir); process.exit(1); }

cases.forEach(function (file) {
  var name = file.slice(0, -5);
  var state = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  var diag = T.validate(state);
  var built = T.buildYaml(state, T.badFields(diag));
  /* dokładnie ten ciąg, który trafia do pobieranego pliku (exportText) */
  var actual = built.text.replace(/\n?$/, "\n");
  var goldenPath = path.join(dir, name + ".yml");

  if (update) {
    fs.writeFileSync(goldenPath, actual);
    console.log("  zapisano " + name + ".yml (" + actual.length + " B)");
    compareDiag(name, diag);
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
  compareDiag(name, diag);
});

if (update) { console.log("\nwzorce zapisane — obejrzyj diff przed commitem"); process.exit(0); }
R.finish();
