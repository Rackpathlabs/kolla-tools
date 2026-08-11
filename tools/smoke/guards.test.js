/* Strażnicy na fixturach o znanej charakterystyce.
 *
 * Do tej pory dowód, że kontrola potrafi upaść, był CZYNNOŚCIĄ: psuło się coś ręcznie
 * w dniu, w którym strażnik powstawał, patrzyło na czerwone i cofało. Działało za
 * każdym razem — i nie powtarza się przy zmianie strażnika ani nie łapie regresu.
 *
 * Sprawdzana jest LICZBA trafień, nie sam kolor. „Czerwone" mówi tylko, że strażnik
 * żyje. „Dokładnie trzy" złapałoby licznik zliczający polskie połówki par, licznik
 * gubiący konkatenacje i licznik z przesuniętym parowaniem cudzysłowów — czyli trzy
 * z sześciu awarii oprzyrządowania, których w tym repozytorium nie złapało nic.
 */

var cp = require("child_process");
var path = require("path");
var R = require("../testlib").runner();
R.section("strażnicy na fixturach o znanej charakterystyce:");

var root = path.join(__dirname, "..", "..");
var NODE = process.env.NODE || process.execPath;

function run(script, args) {
  var sh = /\.sh$/.test(script);
  var r = cp.spawnSync(sh ? "bash" : NODE,
                       ["tools/" + script].concat(args || []),
                       { cwd: root, encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

/* ---- check-literals: liczy ujścia tekstu ---- */
var clean = run("check-literals.js", ["tools/fixtures/clean.js"]);
R.ok("czysta fixtura -> zielone", clean.code === 0, "kod " + clean.code);

var one = run("check-literals.js", ["tools/fixtures/one-literal.js"]);
R.ok("jeden literał -> czerwone", one.code === 1, "kod " + one.code);
R.ok("jeden literał -> DOKŁADNIE jedno trafienie",
     /wpisany w kod, 1 razy/.test(one.out), one.out.split("\n")[1]);

var three = run("check-literals.js", ["tools/fixtures/three-literals.js"]);
R.ok("trzy literały -> DOKŁADNIE trzy trafienia",
     /wpisany w kod, 3 razy/.test(three.out), three.out.split("\n")[1]);
/* T(...) obok literałów nie ma prawa się doliczyć — inaczej strażnik liczyłby
   wywołania, a nie naruszenia. */
R.ok("wywołania T() nie są liczone jako naruszenia",
     !/t\.copied/.test(three.out));

/* ---- check-binary: bajt NUL ---- */
var binClean = run("check-binary.sh", ["tools/fixtures/clean.js"]);
R.ok("check-binary na czystym drzewie -> zielone", binClean.code === 0, "kod " + binClean.code);

var nul = run("check-binary.sh", ["tools/fixtures/has-nul.js"]);
R.ok("fixtura z NUL-em -> czerwone", nul.code !== 0, "kod " + nul.code);
R.ok("i nazywa plik, w którym siedzi", /has-nul\.js/.test(nul.out),
     nul.out.split("\n").slice(-2).join(" | "));

/* PRZYNĘTA: strażnik za czuły jest szkodliwy tak samo jak za luźny — produkuje szum,
   aż ktoś go osłabi. Legalny UTF-8 nie ma prawa być naruszeniem, inaczej strażnik
   przestałby przechodzić na własnych źródłach, bo komentarze są tu po polsku. */
var bait = run("check-binary.sh", ["tools/fixtures/utf8-bait.js"]);
R.ok("legalne znaki wielobajtowe NIE są naruszeniem", bait.code === 0,
     bait.out.split("\n").slice(-2).join(" | "));

R.finish();
