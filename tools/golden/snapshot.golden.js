/* MIGAWKA WIDOCZNEGO TEKSTU PER SCENARIUSZ — co użytkownik widział przed zmianą,
 * a co widzi po.
 *
 * POWÓD ISTNIENIA. #59 zamienił widoczny tekst generatora na puste elementy
 * z atrybutem data-i18n, nie dodając kodu, który je czyta. Pięćdziesiąt podstawień
 * renderowało się pusto przez trzynaście godzin i czterdzieści pięć minut na
 * opublikowanym serwisie. Czterej strażnicy byli zieloni i KAŻDY Z INNEGO POWODU —
 * żaden nie był zepsuty, każdy poprawnie odpowiadał na inne pytanie niż to, które
 * trzeba było zadać:
 *
 *   check-i18n.js       czy NAZWA KLUCZA występuje w plikach. Występuje — w atrybucie.
 *   check-dictionary.js mierzy stronę, ale pusty element nie ma własnego tekstu,
 *                       więc nie ma czego mierzyć. Zielone przy NIEOBECNYM przedmiocie.
 *   check-rendered.js   czy element z hidden jest widoczny i czy scenariusz cokolwiek
 *                       poruszył. Znikający tekst nie narusza żadnego z tych zdań.
 *   check-english.js    czyta SŁOWNIK, więc widzi treść, której na ekranie nie ma.
 *
 * Brakowało jednego pytania i nikt go nie zadawał. To jest ten plik.
 *
 * JEDNYM MECHANIZMEM ŁAPIE CZTERY KLASY: tekst znikający, tekst po polsku, klucz
 * martwy i finding nieosiągalny — bo wszystkie cztery zmieniają to, co widać.
 *
 * NIE URUCHAMIA PRZEGLĄDARKI. Korpus jest już zbierany przez check-rendered.js
 * (--texts) i już służy za odcisk do obrony przed pustym scenariuszem; brakowało
 * WYŁĄCZNIE utrwalenia go i porównania między przebiegami. Dlatego ten strażnik
 * czyta gotowy raport i nie kosztuje ani jednego dodatkowego przebiegu Chrome'a.
 *
 * ============================================================================
 * WŁASNY TRYB AWARII, NAZWANY PRZY NARODZINACH
 *
 * Migawka porównywana jak golden umiera w dniu, w którym ktoś odruchowo puści
 * --update na czerwonym diffie. Robi to po cichu: golden, który sam się poprawił,
 * wygląda identycznie jak golden, który przeszedł. To nie jest hipoteza —
 * docs/PRINCIPLES.md opisuje siedem czerwonych fixtur przyjętych jako nowe wyjście,
 * bo podmiana w runnerze cicho nie dopasowała niczego.
 *
 * Warunek jest więc wpisany w MECHANIZM, nie w dyscyplinę, i ma dwie części:
 *
 *   1. --update ODMAWIA, gdy z migawki UBYWA tekstu. Dodanie tekstu jest zwykłą
 *      pracą i przechodzi. Ubytek jest DOKŁADNIE tą klasą awarii, dla której ten
 *      strażnik powstaje, więc nie ma prawa być krokiem odruchowym. Przyjęcie
 *      ubytku wymaga --accept-removals, czyli osobnej, jawnej decyzji, którą widać
 *      w historii powłoki i w opisie commita.
 *
 *   2. Diff jest wypisywany W CAŁOŚCI. Skrócony diff zamienia przegląd w rzut oka,
 *      a rzut oka na "... i 40 dalszych" jest tym samym co --update bez patrzenia.
 *
 * Trzecia część, której zgłoszenie nie wymieniało, a która wynika z tej samej
 * zasady: ZNIKNIĘCIE CAŁEGO SCENARIUSZA jest ubytkiem największym z możliwych
 * i też wymaga --accept-removals. Repozytorium ma już przypadek predykcji opartej
 * o zapamiętaną liczbę scenariuszy, gdy jeden został skasowany dwie tury wcześniej.
 * ============================================================================
 *
 * Użycie:
 *     node tools/golden/snapshot.golden.js <raport.json>
 *     node tools/golden/snapshot.golden.js <raport.json> --update
 *     node tools/golden/snapshot.golden.js <raport.json> --update --accept-removals
 */

var fs = require("fs");
var path = require("path");
var lib = require("../testlib");

/* Katalog migawek jest podmienialny argumentem, żeby strażnika dało się uruchomić
   na fixturze o znanej charakterystyce. Dowód, że kontrola potrafi upaść — i że
   ODMOWA potrafi odmówić — ma być TESTEM, a nie czynnością wykonaną raz w dniu,
   w którym powstawała: czynność nie powtarza się przy zmianie strażnika. */
var dirArg = process.argv.indexOf("--dir");
var dir = dirArg !== -1 ? path.resolve(process.argv[dirArg + 1])
                        : path.join(__dirname, "snapshot");
var reportPath = process.argv[2];
var update = process.argv.indexOf("--update") !== -1;
var acceptRemovals = process.argv.indexOf("--accept-removals") !== -1;
var R = lib.runner();

if (!reportPath || !fs.existsSync(reportPath)) {
  console.log("  FAIL brak raportu z check-rendered.js --texts: " + reportPath);
  console.log("       Migawka mierzy WYRENDEROWANĄ stronę; bez raportu nie ma czego porównać,");
  console.log("       a pusty raport wygląda dokładnie tak samo jak wszystko pokryte.");
  process.exit(1);
}
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

/* Nazwa pliku z nazwy scenariusza. Diakrytyki mapowane, nie wycinane — wycięte
   zlepiłyby "wezly" i "wezli" w jedną nazwę, a dwa scenariusze o jednej nazwie
   to jedna migawka nadpisywana dwa razy i cicha utrata połowy pomiaru. */
var FOLD = { "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o",
             "ś": "s", "ź": "z", "ż": "z" };
function slug(s) {
  return String(s).toLowerCase()
    .replace(/[ąćęłńóśźż]/g, function (c) { return FOLD[c]; })
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* JEDNOSTKA MIGAWKI to ta sama jednostka, którą check-rendered.js liczy jako odcisk
   scenariusza: tag i własny tekst elementu, z pominięciem inData. Pominięcie jest
   tam uzasadnione i uzasadnienie przenosi się tutaj bez zmian — podgląd emitowanego
   pliku to WYTWÓR NARZĘDZIA, nie interfejs, a jego zmiana przy przełączeniu usługi
   ruszałaby migawkę przy nieruszonym interfejsie. Gdyby te dwie jednostki się
   rozjechały, obrona przed pustym scenariuszem i migawka mówiłyby o innych
   rzeczach tym samym słowem. */
function linesFor(records) {
  return records.filter(function (t) { return !t.inData; })
                .map(function (t) { return t.tag + " " + JSON.stringify(String(t.text)); });
}

/* Różnica WIELOZBIOROWA, nie zbiorowa: ten sam napis pokazany dwa razy i pokazany
   raz to nie jest ten sam ekran. Etykieta wagi zniknęłaby z jednego findingu
   i migawka by tego nie zauważyła. */
function multisetDiff(from, minus) {
  var pool = Object.create(null);
  minus.forEach(function (l) { pool[l] = (pool[l] || 0) + 1; });
  var out = [];
  from.forEach(function (l) {
    if (pool[l]) { pool[l]--; return; }
    out.push(l);
  });
  return out;
}

var report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

/* Rekordy bez pola scenario pochodzą ze starego raportu. Cicha praca na takim
   raporcie dałaby migawkę jednego wielkiego scenariusza "undefined" i zielone
   porównanie o niczym. */
var untagged = report.filter(function (t) { return !t.scenario; }).length;
if (untagged) {
  console.log("  FAIL " + untagged + " rekordów bez nazwy scenariusza — raport pochodzi");
  console.log("       sprzed #67. Przegeneruj: node tools/check-rendered.js --texts <plik>");
  process.exit(1);
}

var byScenario = Object.create(null);
report.forEach(function (t) {
  var key = slug(t.file.replace(/\.html$/, "")) + "--" + slug(t.scenario);
  (byScenario[key] || (byScenario[key] = [])).push(t);
});

var seen = Object.create(null);
var removalsBlocked = [];

Object.keys(byScenario).sort().forEach(function (key) {
  seen[key] = 1;
  var actual = linesFor(byScenario[key]);
  var file = path.join(dir, key + ".txt");
  var text = actual.join("\n") + "\n";

  if (!fs.existsSync(file)) {
    if (update) {
      fs.writeFileSync(file, text);
      console.log("  zapisano " + key + ".txt (" + actual.length + " napisów) — NOWY");
    } else {
      R.ok(key, false, "brak migawki " + key + ".txt — uruchom z --update");
    }
    return;
  }

  var golden = fs.readFileSync(file, "utf8").replace(/\n$/, "").split("\n");
  var removed = multisetDiff(golden, actual);
  var added = multisetDiff(actual, golden);

  if (!removed.length && !added.length) {
    R.ok(key + " — " + actual.length + " napisów bez zmian", true);
    return;
  }

  if (update && removed.length && !acceptRemovals) {
    removalsBlocked.push({ key: key, removed: removed });
    return;
  }

  if (update) {
    fs.writeFileSync(file, text);
    console.log("  zapisano " + key + ".txt  (+" + added.length + " / -" + removed.length + ")");
    return;
  }

  /* CAŁY diff, bez skracania. Patrz nagłówek. */
  R.ok(key, false, "+" + added.length + " / -" + removed.length + " napisów");
  removed.forEach(function (l) { console.log("      - " + l); });
  added.forEach(function (l) { console.log("      + " + l); });
});

/* Migawka bez scenariusza w raporcie: scenariusz zniknął albo zmienił nazwę. */
var orphans = fs.readdirSync(dir).filter(function (f) {
  return f.slice(-4) === ".txt" && !seen[f.slice(0, -4)];
}).sort();

orphans.forEach(function (f) {
  var key = f.slice(0, -4);
  if (update && !acceptRemovals) {
    removalsBlocked.push({ key: key, removed: ["(CAŁY SCENARIUSZ — nie ma go w raporcie)"] });
    return;
  }
  if (update) {
    fs.unlinkSync(path.join(dir, f));
    console.log("  usunięto " + f + " — scenariusza nie ma w raporcie");
    return;
  }
  R.ok(key, false, "migawka istnieje, scenariusza w raporcie NIE MA — " +
       "scenariusz skasowany albo przemianowany");
});

if (removalsBlocked.length) {
  var n = removalsBlocked.reduce(function (a, x) { return a + x.removed.length; }, 0);
  console.log("\n  ODMOWA --update: z migawki UBYWA " + n + " napisów w " +
              removalsBlocked.length + " scenariuszach.");
  console.log("  Dodanie tekstu jest zwykłą pracą. Ubytek jest tą klasą awarii, dla której");
  console.log("  ten strażnik powstał (#59: 50 podstawień renderowało się pusto przez 825 minut).");
  console.log("  Przeczytaj CO ubywa, pozycja po pozycji:\n");
  removalsBlocked.forEach(function (x) {
    console.log("  " + x.key + ":");
    x.removed.forEach(function (l) { console.log("      - " + l); });
  });
  console.log("\n  Jeśli każdy z nich ma zniknąć, powtórz z --accept-removals i uzasadnij");
  console.log("  w opisie commita. Osobna flaga, bo osobna decyzja.");
  process.exit(1);
}

if (update) { console.log("\nmigawki zapisane"); process.exit(0); }
R.finish();
