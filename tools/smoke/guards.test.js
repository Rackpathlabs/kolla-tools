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
     /ujściu tekstu[^,]*, 1 razy/.test(one.out), one.out.split("\n")[1]);

var three = run("check-literals.js", ["tools/fixtures/three-literals.js"]);
R.ok("trzy literały -> DOKŁADNIE trzy trafienia",
     /ujściu tekstu[^,]*, 3 razy/.test(three.out), three.out.split("\n")[1]);
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

/* ---- check-english: trzynaście pozycji, na których raportował zero ----
   Fixtura NIE jest wymyślona: to te same napisy, które skan ręczny znalazł przed
   93a75b6, przepisane stamtąd. W drzewie produktu ich już nie ma, więc ta para
   plików jest jedynym miejscem, w którym para liczb 13/0 zostaje sprawdzalna.

   Liczy się LICZBA, nie kolor: 28 różnych polskich słów w 13 pozycjach. Sam kolor
   przeszedłby licznikowi, który zapala się na wszystkim — a taki licznik jest
   dokładnie tym, czym była lista słów funkcyjnych widziana od drugiej strony. */
var engBad = run("check-english.js", ["--fixture", "tools/fixtures/english-thirteen.html"]);
R.ok("trzynaście pozycji -> czerwone", engBad.code === 1, "kod " + engBad.code);
R.ok("i DOKŁADNIE 28 różnych polskich słów",
     /DO PRZECZYTANIA: 28$/m.test(engBad.out), engBad.out.split("\n")[0]);

/* OBIE DROGI UCIECZKI z osobna. Jedna liczba nie odróżnia strażnika, który naprawił
   kryterium, od takiego, który naprawił zakres — a #63 opisuje dwie niezależne wady
   i naprawa jednej z nich zostawiłaby drugą całą. */
R.ok("droga ZAKRESU: polski w atrybucie (stara wersja usuwała go ze znacznikiem)",
     /^dziedziczy$/m.test(engBad.out));
R.ok("droga KRYTERIUM: polski bez diakrytyku i bez słowa funkcyjnego",
     /^webowy$/m.test(engBad.out) && /^brak$/m.test(engBad.out) && /^lokalny$/m.test(engBad.out));
/* Jednoliterowe polskie słowo. Odsianie krótkich tokenów jako szumu wycięłoby
   "w", "i" i "z" — czyli polszczyznę o dokładnie tej charakterystyce, dla której
   ten strażnik jest przepisywany. Kontrprzykład w teście, nie w komentarzu. */
R.ok("jednoliterowe polskie słowo NIE jest odsiane jako szum", /^w$/m.test(engBad.out));

/* PRZYNĘTY — każda jest osobną awarią strażnika, nie ozdobą fixtury. */
R.ok("ten sam napis po angielsku w tym samym ujściu NIE jest naruszeniem",
     !/^inherits$/m.test(engBad.out));
R.ok("atrybut sterujący data-i18n-title NIE jest widocznym tekstem",
     !/^releaseto$/m.test(engBad.out));
R.ok("nazwa encji HTML NIE jest słowem interfejsu",
     !/^rarr$/m.test(engBad.out) && !/^ldquo$/m.test(engBad.out));
R.ok("nazwa wstawki NIE jest słowem interfejsu", !/^computecount$/m.test(engBad.out));
R.ok("nazwa znacznika w wpisie słownika NIE jest słowem interfejsu",
     !/^code$/m.test(engBad.out));
R.ok("identyfikator rozcięty na granicy liter daje angielskie słowa",
     !/^octavia$/m.test(engBad.out) && !/^network$/m.test(engBad.out));

var engOk = run("check-english.js", ["--fixture", "tools/fixtures/english-clean.html"]);
R.ok("te same kształty po angielsku -> zielone", engOk.code === 0, engOk.out.split("\n")[0]);
R.ok("i zero do przeczytania", /DO PRZECZYTANIA: 0$/m.test(engOk.out), engOk.out.split("\n")[0]);

/* Licznik MUSI się domykać: przyjęte + z danych + do przeczytania = różne słowa.
   Licznik, który się nie domyka, mierzy co innego, niż mówi jego nazwa. */
R.ok("licznik słów domyka się na obu fixturach",
     !/licznik się nie domyka/.test(engBad.out + engOk.out));

/* ---- check-i18n: klucz spoza słownika, z przynętami ---- */
var keys = run("check-i18n.js", ["tools/fixtures/keys-one-typo.html"]);
R.ok("fixtura z jedną literówką -> DOKŁADNIE jedno odwołanie spoza słownika",
     /spoza słownika \(1\): v\.btn\.runn/.test(keys.out), keys.out.split("\n")[0]);
R.ok("istniejący klucz, inny atrybut, T() w kodzie i T() ze spacjami NIE są naruszeniem",
     !/v\.btn\.run,|t\.file\.read|t\.copied/.test(keys.out));

/* ---- check-i18n-apply: klucz produkuje tekst, czy tylko istnieje ----
   Fixtura o ZNANEJ charakterystyce, rozpisana z definicji kategorii: atrybut
   data-i18n* niosący klucz do ujścia, które po wykonaniu kodu strony zostaje
   puste. Dwa naruszenia, trzy przynęty — a przynęty są tu tym, co odróżnia
   kontrolę skutku od kontroli obecności atrybutu. */
var applyClean = run("check-i18n-apply.js", ["tools/fixtures/i18n-apply-clean.html"]);
R.ok("applier kompletny -> zielone", applyClean.code === 0, applyClean.out.split("\n")[0]);

var applyBad = run("check-i18n-apply.js", ["tools/fixtures/i18n-apply-three-blank.html"]);
R.ok("applier niepełny -> czerwone", applyBad.code === 1, "kod " + applyBad.code);
R.ok("applier niepełny -> DOKŁADNIE trzy braki z ośmiu podstawień",
     /klucz bez tekstu na ekranie, 3 z 8 podstawień/.test(applyBad.out), applyBad.out.split("\n")[0]);
/* Nazwa formy, nie tylko liczba: licznik trafiający w trójkę przypadkiem, na
   innych trzech pozycjach, przeszedłby asercję na samej liczbie. */
R.ok("i nazywa obie nieobsłużone formy",
     /data-i18n-title="k\.title"/.test(applyBad.out) && /data-i18n-ph="k\.ph"/.test(applyBad.out));

/* JEDNOSTKI PO OBU STRONACH UŁAMKA. Pierwsza wersja liczyła braki w podstawieniach,
   a całość w elementach; na fixturze bez elementu o dwóch formach obie liczby były
   równe i pomyłka była niewidoczna. Fixtura ma teraz 8 podstawień na 7 elementach
   właśnie po to, żeby te dwie liczby dało się rozróżnić — i asercja czyta OBIE. */
R.ok("komunikat podaje podstawienia i elementy jako OSOBNE wielkości",
     /3 z 8 podstawień \(na 7 elementach\)/.test(applyBad.out), applyBad.out.split("\n")[0]);
R.ok("element o dwóch formach: wypełniona nie zakrywa pustej",
     /<label data-i18n-title="k\.title">/.test(applyBad.out) && !/<label data-i18n="k\.body">/.test(applyBad.out));

/* PRZYNĘTY. Każda jest osobną awarią licznika, nie ozdobą fixtury. */
R.ok('wartość "0" jest tekstem, nie brakiem', !/k\.zero/.test(applyBad.out));
R.ok("atrybut spoza czterech form nie jest ujściem", !/data-i18n-note/.test(applyBad.out));
/* Klucz spoza słownika daje widoczne "[[klucz]]" — jest błędem, ale NIE tym.
   Gdyby ta kontrola go liczyła, mówiłaby o cudzym błędzie cudzym językiem. */
R.ok("klucz spoza słownika należy do check-i18n.js, nie tutaj", !/k\.missing/.test(applyBad.out));

/* ---- migawka widocznego tekstu: kontrola ORAZ jej odmowa ----
   Strażnik z #67 ma własny tryb awarii nazwany przy narodzinach: umiera w dniu,
   w którym ktoś odruchowo puści --update na czerwonym diffie, i robi to po cichu.
   Dlatego testowana jest nie tylko kontrola, ale i ODMOWA — bo to ona jest tym,
   co odróżnia migawkę od migawki na jedną iterację. */
var SNAP = "tools/fixtures/snapshot";
function snap(report, extra) {
  return run("golden/snapshot.golden.js",
             ["tools/fixtures/snapshot-report-" + report + ".json", "--dir", SNAP].concat(extra || []));
}

var snapSame = snap("same");
R.ok("migawka zgodna -> zielone", snapSame.code === 0, "kod " + snapSame.code);

var snapRm = snap("removed");
R.ok("z migawki UBYWA napis -> czerwone", snapRm.code === 1, "kod " + snapRm.code);
R.ok("i diff wypisuje CO ubyło, nie samą liczbę",
     /- SPAN "required"/.test(snapRm.out), snapRm.out.split("\n")[0]);

var snapAdd = snap("added");
R.ok("do migawki DOCHODZI napis -> też czerwone (zmiana jest zmianą)",
     snapAdd.code === 1 && /\+1 \/ -0/.test(snapAdd.out), snapAdd.out.split("\n")[0]);

/* PRZYNĘTA: podgląd emitowanego pliku to WYTWÓR NARZĘDZIA, nie interfejs.
   Gdyby wchodził do migawki, przełączenie usługi ruszałoby ją przy nieruszonym
   interfejsie — i migawka zaczęłaby produkować fałszywe czerwone, aż ktoś by ją
   osłabił. Ta sama jednostka co odcisk w check-rendered.js, ten sam powód. */
var snapData = snap("data");
R.ok("treść podglądu pliku (inData) NIE wchodzi do migawki", snapData.code === 0,
     snapData.out.split("\n")[0]);

/* ODMOWA. Najważniejsza asercja tej grupy: --update na ubytku ma NIE zadziałać
   i ma NIE ruszyć pliku. Sam komunikat nie wystarcza — strażnik, który wypisuje
   odmowę i mimo to zapisuje, wygląda identycznie w logu. */
var before = require("fs").readFileSync(path.join(root, SNAP, "demo--scenariusz.txt"), "utf8");
var snapRefuse = snap("removed", ["--update"]);
var after = require("fs").readFileSync(path.join(root, SNAP, "demo--scenariusz.txt"), "utf8");
R.ok("--update na UBYTKU odmawia", snapRefuse.code === 1 && /ODMOWA --update/.test(snapRefuse.out),
     "kod " + snapRefuse.code);
R.ok("i wypisuje pozycję po pozycji, co miało zniknąć",
     /- SPAN "required"/.test(snapRefuse.out));
R.ok("i NIE nadpisuje migawki mimo odmowy", before === after);
R.ok("i nazywa flagę, która jest osobną decyzją", /--accept-removals/.test(snapRefuse.out));

/* PRZYROST jest zwykłą pracą i --update ma go przyjąć bez ceregieli — inaczej
   odmowa stałaby się szumem i ktoś dopisałby --accept-removals do runnera. */
var snapAddUpd = snap("added", ["--update"]);
R.ok("--update na PRZYROŚCIE przechodzi bez odmowy",
     snapAddUpd.code === 0 && !/ODMOWA/.test(snapAddUpd.out), "kod " + snapAddUpd.code);
/* przywracamy fixturę, bo powyższy przebieg ją zapisał */
require("fs").writeFileSync(path.join(root, SNAP, "demo--scenariusz.txt"), before);

var snapUntagged = snap("untagged");
R.ok("raport sprzed #67 (bez nazwy scenariusza) -> czerwone, nie cicha migawka undefined",
     snapUntagged.code === 1 && /bez nazwy scenariusza/.test(snapUntagged.out), "kod " + snapUntagged.code);

var snapOrphan = snap("orphan");
R.ok("scenariusz zniknął z raportu -> czerwone (ubytek największy z możliwych)",
     snapOrphan.code === 1 && /scenariusza w raporcie NIE MA/.test(snapOrphan.out), "kod " + snapOrphan.code);

/* ---- przynęta: kontrprzykład reguły kształtu ----
   "Narzędzia" to aria-label: jednowyrazowy, więc reguła kształtu dla placeholderów
   zwolniłaby go i polski napis czytany na głos nigdy by się nie przetłumaczył.
   Nie dotyczy go, bo aria-* opisuje interfejs z definicji standardu. Ten test upadnie,
   gdyby ktoś kiedyś połączył obie kategorie z powrotem — kontrprzykład w teście,
   nie w komentarzu. */
var attrs = run("check-dictionary.js", ["tools/fixtures/report-attrs.json"]);
R.ok("jednowyrazowy placeholder konfiguracji -> zwolniony", !/"br-ex"/.test(attrs.out));
R.ok("jednowyrazowy aria-label -> NIE zwolniony", /Narzędzia/.test(attrs.out), attrs.out.split("\n")[3]);
R.ok("podpowiedź w placeholderze -> NIE zwolniona", /domyślnie adres VIP/.test(attrs.out));

R.finish();
