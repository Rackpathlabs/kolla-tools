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

/* ---- check-dictionary: pokrycie i przynęty w obie strony ----
   Fixtura raportu o ZNANYM pokryciu. Pięć pozycji ma przejść, dwie nie — i to nie
   jest liczba dobrana do wyniku, tylko rozpisana z definicji kategorii:
     "5 hosts"      przynęta   napis ze słownika z liczbą z przodu
     "12"           przynęta   liczby i interpunkcja
     "Clear"        przynęta   krótki segment pokrywa przez RÓWNOŚĆ
     "yes" (inData) przynęta   treść podglądu pliku
     "rocky"        przynęta   wartość konfiguracji w <option>
     "5 błędów"     naruszenie normalizacja nie ma prawa tego przepuścić
     "has 5 hosts"  naruszenie krótki segment nie pokrywa przez zawieranie */
var dict = run("check-dictionary.js", ["tools/fixtures/report-known.json"]);
R.ok("fixtura o znanym pokryciu -> DOKŁADNIE dwa braki",
     /BEZ POKRYCIA: 2 /.test(dict.out), dict.out.split("\n")[1]);
R.ok("napis ze słownika z liczbą z przodu NIE jest brakiem",
     !/"5 hosts"/.test(dict.out));
R.ok("krótki segment nie pokrywa przez zawieranie", /has 5 hosts/.test(dict.out));
R.ok("normalizacja nie przepuszcza polskiego z liczbą", /5 błędów/.test(dict.out));

/* ---- dowód upadku WYJĄTKU, nie tylko kontroli ----
   Dowodziliśmy upadku kontroli wielokrotnie i ani razu upadku zwolnienia. Gdy
   spróbowaliśmy pierwszy raz, okazało się martwe: odcisk obejmował podgląd pliku,
   więc kontrola, od której zwolnienie miało uwalniać, na tym scenariuszu nigdy nie
   zapalała. Miało komentarz, przechodziło testy i zgodne liczby — nie było czego
   zauważyć. Ta asercja pilnuje, żeby zwolnienie dalej BYŁO POTRZEBNE. */
var withEx = run("check-rendered.js", []);
R.ok("ze zwolnieniem — pełny audyt zielony", withEx.code === 0, "kod " + withEx.code);

var noEx = run("check-rendered.js", ["--no-exemptions"]);
R.ok("bez zwolnienia — scenariusz przełącznika upada",
     /pojedynczy przełącznik[\s\S]*nie zmienił NICZEGO/.test(noEx.out) && noEx.code !== 0,
     "kod " + noEx.code);

/* ---- check-i18n: klucz spoza słownika, z przynętami ---- */
var keys = run("check-i18n.js", ["tools/fixtures/keys-one-typo.html"]);
R.ok("fixtura z jedną literówką -> DOKŁADNIE jedno odwołanie spoza słownika",
     /spoza słownika \(1\): v\.btn\.runn/.test(keys.out), keys.out.split("\n")[0]);
R.ok("istniejący klucz, inny atrybut, T() w kodzie i T() ze spacjami NIE są naruszeniem",
     !/v\.btn\.run,|t\.file\.read|t\.copied/.test(keys.out));

R.finish();
