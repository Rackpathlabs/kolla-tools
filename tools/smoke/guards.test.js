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

function run(script, args, env) {
  var sh = /\.sh$/.test(script);
  /* Nadpisania środowiska są potrzebne dokładnie jednej grupie asercji: tej, która
     odbiera strażnikowi przeglądarkę. Zdarzenia „nie ma czym mierzyć" nie da się
     wywołać inaczej — ścieżki kandydatów są bezwzględne i istnieją na tej maszynie. */
  var e = process.env;
  if (env) {
    e = {};
    Object.keys(process.env).forEach(function (k) { e[k] = process.env[k]; });
    Object.keys(env).forEach(function (k) { e[k] = env[k]; });
  }
  var r = cp.spawnSync(sh ? "bash" : NODE,
                       ["tools/" + script].concat(args || []),
                       { cwd: root, encoding: "utf8", env: e });
  /* Strumienie zostają połączone w out, bo asercje pytają o TREŚĆ i nie obchodzi ich,
     którym kanałem wyszła. err zostaje osobno wyłącznie dla kod(), niżej. */
  return { code: r.status, out: (r.stdout || "") + (r.stderr || ""), err: r.stderr || "" };
}

/* Komunikat „-> kod 2" nie odróżnia dwóch całkiem różnych zdarzeń: strażnik dał INNY
   WYNIK niż oczekiwany, czy w ogóle NIE RUSZYŁ. Drugie ma w tym repozytorium własny kod
   wyjścia (2) i własny komunikat na stderr — brak przeglądarki, brak raportu z
   poprzedniego kroku. Bez tej linii oba FAIL-e wyglądają w logu identycznie i wysyłają
   czytelnika do złego pliku: do strażnika, który akurat działa poprawnie, zamiast do
   kroku, który nie dostarczył mu przedmiotu pomiaru.

   Dopisywana jest PIERWSZA linia stderr, bo tam stoi zdanie „FAIL czego brakuje";
   reszta to uzasadnienie, które w jednolinijkowym FAIL-u i tak by się nie zmieściło. */
function kod(r) {
  var first = String(r.err || "").split("\n")[0].trim();
  return "kod " + r.code + (r.code === 2 && first ? " — " + first : "");
}

/* ---- check-literals: liczy ujścia tekstu ---- */
var clean = run("check-literals.js", ["tools/fixtures/clean.js"]);
R.ok("czysta fixtura -> zielone", clean.code === 0, kod(clean));

var one = run("check-literals.js", ["tools/fixtures/one-literal.js"]);
R.ok("jeden literał -> czerwone", one.code === 1, kod(one));
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
R.ok("check-binary na czystym drzewie -> zielone", binClean.code === 0, kod(binClean));

var nul = run("check-binary.sh", ["tools/fixtures/has-nul.js"]);
R.ok("fixtura z NUL-em -> czerwone", nul.code !== 0, kod(nul));
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

/* ---- JEDNOSTKA PROGU: RÓŻNE NAPISY, NIE WYSTĄPIENIA (#86) ----

   Wystąpienia skalują się z LICZBĄ SCENARIUSZY, nie z ilością tekstu. Zmierzone na
   main przed tą zmianą: 530 wystąpień to 138 różnych napisów, jeden szablon
   „inventory: line N" wnosi do progu 32 przy jednym napisie do przeniesienia,
   a dwunasty scenariusz dołożył 41 wystąpień i ZERO nowych napisów.

   Skutek jest gorszy niż nieporządna liczba: podniesienie progu wywołane samym
   dodaniem scenariusza przechodzi regułę z #85 jako „rozszerzenie pokrycia", bo
   strażnik formalnie zaczął widzieć więcej renderowań. Reguła jest przez to niepełna
   i da się jej użyć w dobrej wierze do przepchnięcia podniesienia, które nic nie znaczy.

   Test poprawności jednostki jest więc jeden i stoi niżej: DRUGI SCENARIUSZ NIOSĄCY
   TEN SAM TEKST NIE MA PRAWA RUSZYĆ LICZBY. Fixtury różnią się wyłącznie tym. */
function dictCount(out) {
  var m = /BEZ POKRYCIA: (\d+) RÓŻNYCH NAPISÓW w (\d+) wystąpieniach/.exec(out);
  return m ? { napisy: +m[1], wystapienia: +m[2] } : null;
}
var sc1 = run("check-dictionary.js", ["tools/fixtures/report-one-scenario.json"]);
var sc2 = run("check-dictionary.js", ["tools/fixtures/report-two-scenarios.json"]);
var c1 = dictCount(sc1.out), c2 = dictCount(sc2.out);

R.ok("komunikat podaje OBIE liczby: napisy i wystąpienia", c1 !== null && c2 !== null,
     sc1.out.split("\n")[1]);
/* NAJWAŻNIEJSZA ASERCJA TEJ GRUPY. Bez niej pozostałe przeszłyby także wtedy, gdyby
   ktoś tylko dopisał drugą liczbę do komunikatu, nie zmieniając jednostki progu. */
R.ok("drugi scenariusz z TYM SAMYM tekstem NIE rusza liczby napisów",
     c1 && c2 && c1.napisy === c2.napisy,
     c1 && c2 ? c1.napisy + " -> " + c2.napisy : "brak liczb w komunikacie");
/* KONTROLA DO POWYŻSZEJ: gdyby wystąpienia też nie urosły, fixtura nie dowodziłaby
   niczego — obie liczby byłyby stałe, bo scenariusz nic nie wniósł. */
R.ok("…choć wystąpień PRZYBYWA, więc fixtura naprawdę dokłada scenariusz",
     c1 && c2 && c2.wystapienia > c1.wystapienia,
     c1 && c2 ? c1.wystapienia + " -> " + c2.wystapienia : "—");
/* NORMALIZACJA, zapisana jako asercja, a nie tylko jako zdanie przy stałej:
   „inventory: line 2", „line 7" i „line 41" to JEDEN napis. Trzy wystąpienia
   szablonu w drugiej fixturze mają dać jedną pozycję długu. */
R.ok("ten sam szablon z inną liczbą to JEDEN napis", c2 && c2.napisy === 3,
     c2 ? "napisów: " + c2.napisy : "—");

/* PRÓG DOTYCZY NAPISÓW, NIE WYSTĄPIEŃ — i to jest sprawdzalne tylko wtedy, gdy próg
   da się podstawić. Ta sama konstrukcja co --dir w snapshot.golden.js i z tego samego
   powodu: dowód, że kontrola potrafi upaść, ma być TESTEM, nie czynnością wykonaną raz. */
var thrOk = run("check-dictionary.js", ["tools/fixtures/report-two-scenarios.json", "--baseline", "3"]);
R.ok("3 napisy w 7 wystąpieniach wobec progu 3 -> zielone (próg liczy NAPISY)",
     thrOk.code === 0, kod(thrOk) + " — pod starą jednostką 7 > 3 byłoby czerwone");
var thrBad = run("check-dictionary.js", ["tools/fixtures/report-two-scenarios.json", "--baseline", "2"]);
R.ok("te same 3 napisy wobec progu 2 -> czerwone", thrBad.code === 1, kod(thrBad));
R.ok("i FAIL mówi o napisach, nie o wystąpieniach",
     /FAIL 3 różnych napisów wobec progu 2/.test(thrBad.out), thrBad.out.split("\n").pop());

/* ---- BRAK ARTEFAKTU POPRZEDNIEGO KROKU ----
   check-dictionary.js nie renderuje niczego sam: mierzy raport, który produkuje
   check-rendered.js --texts. Gdy raportu nie ma, strażnik ma powiedzieć CZEGO nie ma
   i KTO to robi — a nie wysypać się śladem stosu na readFileSync, bo ślad stosu wysyła
   czytelnika do wnętrza strażnika zamiast do kroku, który nie wyprodukował pliku.

   Kod wyjścia jest tu OSOBNĄ informacją, nie ozdobą. 1 znaczy „zmierzyłem i nie
   przeszło", 2 znaczy „nie zmierzyłem w ogóle" — to samo rozróżnienie, które
   check-rendered.js robi już przy braku przeglądarki. Zlane w jedno, oba wyglądają
   w logu CI identycznie, a to jest trzeci wariant pustego zielonego z
   docs/PRINCIPLES.md widziany od strony czerwonej: kontrola pominięta wygląda jak
   kontrola wykonana. */
var MISSING_REPORT = "tools/fixtures/report-missing.json";
/* Fixturą jest tu NIEOBECNOŚĆ pliku, więc jej przedmiot trzeba sprawdzić wprost:
   gdyby ktoś kiedyś ten plik założył, poniższe asercje zaczęłyby mierzyć coś innego
   i dalej byłyby zielone. */
R.ok("fixtura nieobecności naprawdę nie istnieje",
     !require("fs").existsSync(path.join(root, MISSING_REPORT)), MISSING_REPORT);

var dictNoRep = run("check-dictionary.js", [MISSING_REPORT]);
R.ok("brak raportu -> kod 2 („nie ruszyła\"), nie 1 i nie ślad stosu",
     dictNoRep.code === 2, kod(dictNoRep));
R.ok("i NIE jest to ślad stosu z readFileSync",
     !/ENOENT|at Object\.|at Module/.test(dictNoRep.out),
     dictNoRep.out.split("\n")[0]);
R.ok("i nazywa plik, którego brakuje", /report-missing\.json/.test(dictNoRep.out),
     dictNoRep.out.split("\n")[0]);
R.ok("i nazywa PRODUCENTA raportu, czyli krok do naprawy",
     /check-rendered\.js --texts/.test(dictNoRep.out), dictNoRep.out.split("\n")[1]);
R.ok("i mówi wprost, że kontrola nie jest pomijana po cichu",
     /NIE jest pomijana po cichu/.test(dictNoRep.out), dictNoRep.out.split("\n")[2]);
/* Sam komunikat FAIL tego testu też jest przedmiotem pomiaru: gdyby niósł wyłącznie
   „kod 2", czytelnik nie wiedziałby, czy strażnik dał inny wynik, czy nie ruszył. Bierzemy
   PRAWDZIWY przebieg, nie atrapę — atrapa dowodziłaby czegoś o sobie. */
R.ok("FAIL przy kodzie 2 niesie pierwszą linię stderr, nie samą liczbę",
     /^kod 2 — FAIL brak raportu/.test(kod(dictNoRep)), kod(dictNoRep));
R.ok("i tylko przy kodzie 2 — „inny wynik\" zostaje samą liczbą", kod(one) === "kod 1",
     kod(one));
/* Brak argumentu to ta sama awaria co brak pliku — jeden krok wcześniej. Osobno,
   bo readFileSync(undefined) rzuca INNYM wyjątkiem niż ENOENT i naprawa jednej
   ścieżki nie naprawia drugiej. */
var dictNoArg = run("check-dictionary.js", []);
R.ok("brak argumentu -> ta sama awaria, ten sam kod 2", dictNoArg.code === 2,
     kod(dictNoArg));

/* Migawka czyta TEN SAM plik i miała ten komunikat od początku — brakowało jej
   wyłącznie kodu odróżniającego „nie ruszyła" od „nie przeszła". Asercja pilnuje,
   żeby dwaj konsumenci jednego artefaktu nie rozjechali się z powrotem. */
var snapNoRep = run("golden/snapshot.golden.js", [MISSING_REPORT]);
R.ok("migawka na tym samym braku -> ten sam kod 2", snapNoRep.code === 2,
     kod(snapNoRep));

/* ---- ten sam brak, drugi artefakt: wycięty blok <script> ----
   Pięciu konsumentów czyta plik, który tools/run-tests.sh wycina z HTML-a funkcją
   extract_script. Wewnątrz runnera ta funkcja przerywa cały przebieg, gdy wycinek
   wyjdzie pusty, więc tam plik nigdy nie jest nieobecny — i to jest dokładnie zakres
   tamtej ochrony. Plik testowy odpalony Z RĘKI, a robi się to przy każdej pracy nad
   pojedynczym strażnikiem, nie ma jej wcale: dostaje ślad stosu z node:fs i kod 1,
   czyli „zmierzyłem i jest naruszenie" o pomiarze, który się nie odbył.

   Klauzula siedzi w testlib.loadTool, bo tam jest jedno czytanie dla całej piątki.
   Asercje pytają każdego konsumenta OSOBNO: wspólna biblioteka to powód, dla którego
   dziś odpowiadają tak samo, a nie gwarancja, że jutro któryś nie zacznie czytać
   pliku sam. */
var MISSING_SCRIPT = "tools/fixtures/script-missing.js";
R.ok("fixtura nieobecności bloku <script> naprawdę nie istnieje",
     !require("fs").existsSync(path.join(root, MISSING_SCRIPT)), MISSING_SCRIPT);

var LOAD_TOOL = ["smoke/generator.test.js", "smoke/validator.test.js",
                 "golden/generator.golden.js", "golden/roundtrip.golden.js",
                 "golden/validator.golden.js"];
var loadRuns = LOAD_TOOL.map(function (name) {
  return { name: name, r: run(name, [MISSING_SCRIPT]) };
});
loadRuns.forEach(function (x) {
  R.ok("brak wyciętego bloku -> kod 2: " + x.name, x.r.code === 2, kod(x.r));
});

var lt = loadRuns[0].r;
R.ok("i NIE jest to ślad stosu z readFileSync",
     !/ENOENT|node:fs|at Object\./.test(lt.out), lt.out.split("\n")[0]);
R.ok("i nazywa plik, którego brakuje", /script-missing\.js/.test(lt.out),
     lt.out.split("\n")[0]);
R.ok("i nazywa PRODUCENTA: extract_script w tools/run-tests.sh",
     /extract_script/.test(lt.out) && /run-tests\.sh/.test(lt.out),
     lt.out.split("\n")[1]);
R.ok("i mówi wprost, że kontrola nie jest pomijana po cichu",
     /NIE jest pomijana po cichu/.test(lt.out), lt.out.split("\n")[2]);

/* check-english.js czyta ten sam wycinek przez loadTool, ale ma DRUGIE wejście,
   którego loadTool nie widzi: w trybie --fixture blok wycina sobie sam z HTML-a
   i do loadTool z argumentem z wiersza poleceń nigdy nie dochodzi. Jedna klauzula
   w bibliotece nie zamyka obu dróg, więc ten strażnik dostaje własną. */
var engNoScript = run("check-english.js", [MISSING_SCRIPT, "validator.html", "validator"]);
R.ok("check-english.js bez wycinka -> kod 2", engNoScript.code === 2, kod(engNoScript));

var engNoHtml = run("check-english.js", ["--fixture", "tools/fixtures/nie-ma-fixtury.html"]);
R.ok("check-english.js --fixture bez pliku -> kod 2", engNoHtml.code === 2, kod(engNoHtml));
R.ok("i nazywa plik oraz mówi, że kontrola nie jest pomijana po cichu",
     /nie-ma-fixtury\.html/.test(engNoHtml.out) &&
     /NIE jest pomijana po cichu/.test(engNoHtml.out), engNoHtml.out.split("\n")[0]);

/* ---- brak przeglądarki: JEDNO zdarzenie, jedna odpowiedź ----
   check-rendered.js odpowiadał na nie kodem 2, check-network.js kodem 1 — a to jest
   to samo zdarzenie widziane przez dwóch strażników, którzy szukają przeglądarki tą
   samą funkcją z render-lib.js. Dwa kody na jedno zdarzenie znaczą, że czytelnik logu
   musi wiedzieć, KTÓRY strażnik akurat mówi, zanim zrozumie, co powiedział.

   Zdarzenie wywołujemy jawnym wskazaniem na nieistniejącą ścieżkę. Jawne wskazanie
   jest rozstrzygające — patrz komentarz przy findChrome — więc to jest ta sama droga,
   którą przejdzie człowiek z literówką w CHROME=, a nie atrapa zbudowana pod test. */
var NO_CHROME = { CHROME: "/nie/ma/takiej/przegladarki" };
var renderNoChrome = run("check-rendered.js", [], NO_CHROME);
var netNoChrome = run("check-network.js", [], NO_CHROME);
R.ok("check-rendered.js bez przeglądarki -> kod 2", renderNoChrome.code === 2,
     kod(renderNoChrome));
R.ok("check-network.js bez przeglądarki -> kod 2", netNoChrome.code === 2,
     kod(netNoChrome));
R.ok("oba strażniki dają TEN SAM kod na tym samym zdarzeniu",
     renderNoChrome.code === netNoChrome.code,
     "check-rendered.js " + kod(renderNoChrome) + " / check-network.js " + kod(netNoChrome));

/* ---- dowód upadku WYJĄTKU, nie tylko kontroli ----
   Dowodziliśmy upadku kontroli wielokrotnie i ani razu upadku zwolnienia. Gdy
   spróbowaliśmy pierwszy raz, okazało się martwe: odcisk obejmował podgląd pliku,
   więc kontrola, od której zwolnienie miało uwalniać, na tym scenariuszu nigdy nie
   zapalała. Miało komentarz, przechodziło testy i zgodne liczby — nie było czego
   zauważyć. Ta asercja pilnuje, żeby zwolnienie dalej BYŁO POTRZEBNE. */
var withEx = run("check-rendered.js", []);
R.ok("ze zwolnieniem — pełny audyt zielony", withEx.code === 0, kod(withEx));

var noEx = run("check-rendered.js", ["--no-exemptions"]);
R.ok("bez zwolnienia — scenariusz przełącznika upada",
     /pojedynczy przełącznik[\s\S]*nie zmienił NICZEGO/.test(noEx.out) && noEx.code !== 0,
     kod(noEx));

/* ---- check-english: trzynaście pozycji, na których raportował zero ----
   Fixtura NIE jest wymyślona: to te same napisy, które skan ręczny znalazł przed
   93a75b6, przepisane stamtąd. W drzewie produktu ich już nie ma, więc ta para
   plików jest jedynym miejscem, w którym para liczb 13/0 zostaje sprawdzalna.

   Liczy się LICZBA, nie kolor: 28 różnych polskich słów w 13 pozycjach. Sam kolor
   przeszedłby licznikowi, który zapala się na wszystkim — a taki licznik jest
   dokładnie tym, czym była lista słów funkcyjnych widziana od drugiej strony. */
var engBad = run("check-english.js", ["--fixture", "tools/fixtures/english-thirteen.html"]);
R.ok("trzynaście pozycji -> czerwone", engBad.code === 1, kod(engBad));
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

/* ---- WŁASNOŚĆ, OD KTÓREJ ZALEŻY OPCJA B W ADR-004 ----
   Para wyżej dowodzi, że strażnik odróżnia języki. To jest zdanie węższe i osobne:
   wartość słownika jest czytana także wtedy, gdy klucz NIE MA KOTWICY w markupie
   i NIE RENDERUJE GO ŻADEN SCENARIUSZ.

   Bez tego zdania #58 nie ma prawa zostawić 123 kluczy bez kotwicy: cała zapłata za
   „nie kotwiczymy tego, czego nie widać w dokumencie" to właśnie ta ścieżka. Zmierzone
   przy pisaniu ADR-004 — strażnik już ją miał, nikt jej nie zapisał, a gwarancja
   niezapisana jest gwarancją, którą ktoś usuwa przy refaktorze, mając wszystko zielone.

   Markup fixtury jest CAŁY po angielsku i nie ma w nim ani jednego atrybutu data-i18n,
   więc czerwone może pochodzić wyłącznie ze słownika. */
var engOrphan = run("check-english.js", ["--fixture", "tools/fixtures/english-dict-orphan.html"]);
R.ok("wartość słownika przy kluczu BEZ KOTWICY i bez scenariusza -> czerwone",
     engOrphan.code === 1, kod(engOrphan));
R.ok("i DOKŁADNIE trzy słowa do przeczytania, nie „coś jest nie tak\"",
     /DO PRZECZYTANIA: 3$/m.test(engOrphan.out), engOrphan.out.split("\n")[0]);
/* Komunikat MA nazywać klucz. Słowo bez klucza jest nie do naprawienia w słowniku
   liczącym 231 pozycji — a to jest strażnik, który ma być też narzędziem roboczym. */
R.ok("i komunikat nazywa KLUCZ, nie samo słowo",
     /dictionary key v\.stale\.run/.test(engOrphan.out), engOrphan.out.split("\n")[2]);
/* PRZYNĘTA: drugi wpis fixtury jest poprawny i ma ten sam kształt. Bez niej czerwone
   mówiłoby, że strażnik czyta słownik — nie, że go ocenia. */
R.ok("angielski wpis o tym samym kształcie NIE jest naruszeniem",
     !/v\.stale\.bar/.test(engOrphan.out));

var engOk = run("check-english.js", ["--fixture", "tools/fixtures/english-clean.html"]);
R.ok("te same kształty po angielsku -> zielone", engOk.code === 0, engOk.out.split("\n")[0]);
R.ok("i zero do przeczytania", /DO PRZECZYTANIA: 0$/m.test(engOk.out), engOk.out.split("\n")[0]);

/* Licznik MUSI się domykać: przyjęte + z danych + do przeczytania = różne słowa.
   Licznik, który się nie domyka, mierzy co innego, niż mówi jego nazwa. */
R.ok("licznik słów domyka się na obu fixturach",
     !/licznik się nie domyka/.test(engBad.out + engOk.out));

/* ---- dokumenty normatywne ----
   Ten straznik byl w tej sesji zepsuty RECZNIE i ogladany na czerwono — jako CZYNNOSC.
   Czynnosc nie powtarza sie przy zmianie straznika i nie lapie regresu; to jest powod,
   dla ktorego ten plik w ogole istnieje. #96 zamienia tamta czynnosc w test. */
function docs(variant) {
  return run("check-docs.sh", ["--root", "tools/fixtures/docs/" + variant]);
}
R.ok("komplet dokumentów z sekcjami i odnośnikami -> zielone", docs("clean").code === 0,
     docs("clean").out.split("\n").pop());

/* WYPATROSZENIE: znika JEDNA sekcja, plik zostaje dlugi. CLAUDE.md ma tu 1711 bajtow,
   czyli PONAD progiem rozmiaru — kontrola rozmiaru przechodzi i lapie to wylacznie
   kontrola sekcji. Regula sciety do naglowka wazy prawie tyle, co regula z powodem. */
var dh = docs("hollowed");
R.ok("sekcja usunięta przy pliku wciąż dużym -> czerwone", dh.code === 1, kod(dh));
R.ok("i nazywa BRAKUJĄCĄ sekcję, nie sam fakt różnicy",
     /brak sekcji "A ratchet threshold may only fall"/.test(dh.out), dh.out.split("\n")[0]);
R.ok("a kontrola ROZMIARU tego nie złapała — plik jest nad progiem",
     !/CLAUDE\.md: [0-9]+ bajtów/.test(dh.out));

/* UTRATA ODNOSNIKA: README zachowuje dwa z trzech. Nikt nie liczy odnosnikow. */
var dl = docs("lost-link");
R.ok("README traci jeden z trzech odnośników -> czerwone", dl.code === 1, kod(dl));
R.ok("i mówi, którego brakuje", /brak odnośnika do CLAUDE\.md/.test(dl.out));

/* WYDRAZENIE: dokument skrocony do samych naglowkow. Kontrola rozmiaru istnieje
   wlasnie po to i nigdy nie zostala pokazana, jak zapala. */
var dg = docs("gutted");
R.ok("dokument skrócony do nagłówków -> czerwone na rozmiarze", dg.code === 1, kod(dg));
R.ok("i podaje liczbę bajtów oraz próg",
     /SCOPE\.md: 157 bajtów/.test(dg.out) && /próg 2000/.test(dg.out), dg.out.split("\n")[0]);

/* ---- spójność bloków współdzielonych ----
   Straznik bez dowodu upadku do #96, a to, czego pilnuje, jest niewidoczne z definicji:
   blok rozjechany ze zrodlem nie daje ZADNEGO objawu na ekranie. Dwie kopie tego samego
   kodu, rozne o jeden bajt, zachowuja sie inaczej i wygladaja identycznie.
   Dlatego fixtury to rozjazdy, ktorych nikt nie wypatrzy okiem — nie skasowana polowa
   bloku, ktora zlapalby dowolny naiwny grep. */
/* Lista blokow ARGUMENTEM, nie zmienna srodowiskowa. Pierwsza wersja szla przez
   srodowisko i cicho nie dzialala: node.exe z Windows nie przekazuje zmiennych do
   basha bez WSLENV, wiec straznik ruszal na domyslnej liscie i zglaszal brak
   matrix.js w fixturze. Ta sama pulapka jest opisana w check-rendered.js. */
function blocks(variant) {
  return run("check-blocks.sh",
             ["--root", "tools/fixtures/blocks/" + variant,
              "--blocks", "DEMO:demo.js:page.html"]);
}
R.ok("kopia identyczna ze źródłem -> zielone", blocks("clean").code === 0,
     blocks("clean").out.split("\n").pop());

/* SPACJA NA KONCU LINII. To robi edytor przy zapisie i jest to ksztalt czynnosci
   ZAKAZANEJ przez zasady repo: edycja kopii w HTML zamiast zrodla. */
var bt = blocks("trailing-space");
R.ok("spacja na końcu linii w kopii -> czerwone", bt.code === 1, kod(bt));
R.ok("i mówi, z którym plikiem źródłowym się rozjechało",
     /rozjechał się z demo\.js/.test(bt.out), bt.out.split("\n")[0]);

/* NBSP: U+00A0 tam, gdzie nalezy sie zwykla spacja. Bajtowo c2 a0 zamiast 20,
   wizualnie nie do odroznienia w zadnym przegladzie. */
R.ok("niełamliwa spacja zamiast zwykłej -> czerwone", blocks("nbsp").code === 1);
/* KOLEJNOSC: ta sama tresc, ta sama dlugosc, inny plik. */
R.ok("przestawione linie przy tej samej treści -> czerwone", blocks("reordered").code === 1);

/* ---- gwarancja offline ----
   Straznik, ktory do #96 nie mial NIGDZIE dowodu upadku — a stoi miedzy repozytorium
   a rdzeniem obietnicy produktu: jeden plik HTML, file://, zero sieci, polityka przypieta
   co do znaku. Kazda fixtura ma ksztalt realnej awarii, nie podrecznikowej; fixtura,
   ktora zlapalby dowolny naiwny grep, nie dowodzi niczego o TYM strazniku. */
var OFF = "tools/fixtures/offline/";
/* Straznik skanuje KATALOG, wiec kazdy przypadek musi stac OSOBNO — inaczej jedna
   czerwona fixtura barwilaby wynik pozostalych i „dokladnie ten jeden powod" byloby
   nie do odroznienia od „ktorykolwiek z czterech".
   Kopie ida do sciezki ignorowanej przez git (*.tmp), a nie obok fixtur: katalog
   pochodny w fixtures/ wygladalby po chwili jak fixtura, ktorej nikt nie pisal. */
var fsx = require("fs"), pathx = require("path");
var CASES = ".offline-cases.tmp";
["clean", "bait-a-csp-permissive", "bait-a2-csp-single-quoted",
 "bait-b-runtime-network", "bait-c-no-csp"].forEach(function (name) {
  var d = pathx.join(root, CASES, name);
  fsx.mkdirSync(d, { recursive: true });
  fsx.copyFileSync(pathx.join(root, OFF, name + ".html"), pathx.join(d, name + ".html"));
});
function offline(file) { return run("check-offline.js", ["--dir", CASES + "/" + file]); }

R.ok("polityka zgodna, brak API sieciowych -> zielone", offline("clean").code === 0,
     offline("clean").out.split("\n").pop());

/* (a) Bajtowo inna i semantycznie PRZEPUSZCZALNA: jedna dyrektywa wiecej. Tak wyglada
   edycja zrobiona po to, zeby „cos zadzialalo", a nie zlosliwa podmiana. */
var oa = offline("bait-a-csp-permissive");
R.ok("polityka z dodatkową dyrektywą (connect-src) -> czerwone", oa.code === 1, kod(oa));
R.ok("i pokazuje OBIE polityki, nie sam fakt różnicy",
     /oczekiwano:/.test(oa.out) && /connect-src https:/.test(oa.out));

/* (a2) KSZTALT HISTORYCZNEJ AWARII z docs/PRINCIPLES.md: wzorzec wykluczal apostrofy,
   a polityka jest ich pelna, wiec nie znalazl znacznika w ogole. Tutaj ogranicznik
   atrybutu JEST apostrofem, a polityka jest szeroko otwarta. Dzisiejszy wzorzec
   zapamietuje ogranicznik — to jest dokladnie ta poprawka, ktorej tamten nie mial. */
var oa2 = offline("bait-a2-csp-single-quoted");
R.ok("ogranicznik apostrofowy + polityka otwarta -> czerwone", oa2.code === 1, kod(oa2));
R.ok("i wzorzec ODCZYTAŁ politykę, zamiast zgubić się na apostrofach",
     /default-src \*/.test(oa2.out), oa2.out.split("\n")[1]);

/* (c) Brak znacznika. Obrona przed zielonym przy NIEOBECNYM przedmiocie — jedyna klasa,
   ktorej nie da sie wykryc psuciem, bo popsucie rzeczy nieobecnej tez nie zapala lampki. */
var oc = offline("bait-c-no-csp");
R.ok("brak znacznika CSP -> czerwone, nie „nic do sprawdzenia\"",
     oc.code === 1 && /brak znacznika meta/.test(oc.out), kod(oc));

/* (b) GRANICA, nie dziura — i to jest rozstrzygniete, a nie odlozone. check-offline.js
   czyta ZRODLO i szuka szesciu nazw; wywolanie skladane w czasie dzialania nie wyglada
   jak zadna z nich, wiec przechodzi. ADR-003 rozstrzygnal, ze tej klasy NIE gonimy
   dluzsza lista literalow: lista jest przegrana z gory wobec kodu, ktory sie sklada,
   a kazdy dopisany wzorzec podnosilby wrazenie osloniecia, nie osloniecie.
   Klase pokrywa tools/check-network.js — pyta o SKUTEK na wykonanych scenariuszach
   zamiast o ksztalt zrodla (docs/adr/ADR-003-js-tokens-vs-zero-npm.md, opcja D).
   Zakres check-offline.js zostal zwezony do tego, co faktycznie sprawdza (#103), wiec
   ta fixtura nie opisuje juz niedotrzymanej obietnicy.

   Asercja zostaje PRZYPIETA mimo rozstrzygniecia: mowi, ze granica lezy TAM, GDZIE
   ZAPISANO. Gdyby check-offline.js kiedys zaczal to lapac — nowym wzorcem albo cudza
   poprawka — zapali sie na czerwono i zmusi do sprawdzenia, czy ktos nie wraca do
   drogi, ktora ADR-003 odrzucil. Straznik milczacy o wlasnej granicy jest gorszy od
   granicy zapisanej. */
var ob = offline("bait-b-runtime-network");
R.ok("GRANICA check-offline.js: wywołania składane w czasie działania przechodzą (ADR-003, pokrywa check-network.js)",
     ob.code === 0, kod(ob) + " — jeśli to czerwone, zakres straznika sie zmienil; " +
     "sprawdz ADR-003 i tools/check-network.js zanim uznasz to za poprawe");

/* ---- zadania sieciowe na wykonanych scenariuszach ----
   ADR-003 opcja D dla #101. check-offline.js czyta LISTE SZESCIU NAZW i przepuszcza
   new Image().src — zwykly kod, nie obfuskacja. Ten straznik nie czyta zrodla: uruchamia
   strone i patrzy, co wyszlo. */
function network(variant) { return run("check-network.js", ["--dir", "tools/fixtures/network/" + variant]); }

/* DETAL asercji tej grupy. Do 2026-09-01 był to `out.split("\n").pop()`, a wyjście
   strażnika ZAWSZE kończy się znakiem nowej linii — więc detal był pusty przy KAŻDYM
   wyniku, zielonym i czerwonym. Asercja, która upada, nie umiała powiedzieć, co
   zobaczyła; #128 opisuje przypadek, w którym to bolało naprawdę. */
function netDetail(r) { return r.out.split("\n").pop(); }

var netClean = network("clean");
R.ok("strona bez żądań -> zielone", netClean.code === 0, netDetail(netClean));
/* PRZYNETA: dokument WYMIENIA adres http i przypisuje go do zmiennej, ale nikt go nie
   pobiera. Straznik obserwuje SKUTEK — napis nie jest zadaniem. Gdyby liczyl tresc,
   bylby drugim check-offline.js, tyle ze wolniejszym. */
R.ok("adres w treści i w zmiennej NIE jest żądaniem", !/example\.invalid/.test(netClean.out));

var netDirty = network("dirty");
/* (c) DETAL PRZY CZERWONYM MA COŚ NIEŚĆ. To jest ta sama klasa co „-> kod 2" bez linii
   stderr: komunikat, który nie odróżnia jednej awarii od drugiej, wysyła czytelnika do
   złego pliku. */
R.ok("detal czerwonego przebiegu jest NIEPUSTY", netDetail(netDirty) !== "",
     JSON.stringify(netDetail(netDirty)));
R.ok("i nazywa host, do którego poszło żądanie",
     /telemetry\.example\.invalid/.test(netDetail(netDirty)), netDetail(netDirty));

/* (a) DOWÓD, KTÓRY ZNIKA PRZED OBEJRZENIEM, NIE JEST DOWODEM.
   Strażnik kasował katalog roboczy BEZWARUNKOWO, zanim wypisał werdykt — więc netlog
   nie istniał już w chwili, w której ktokolwiek mógłby do niego zajrzeć. #128 rozstrzygnięto
   liczbą z nagłówka, bo netlogu nie było; następny rozjazd może nie mieć tak wygodnego
   kształtu. Przy CZERWONYM netlog ma zostać na dysku, mieć nazwę scenariusza w ścieżce
   i być WYMIENIONY w komunikacie — inaczej nikt go nie znajdzie. */
var NETWORK_WORK = path.join(root, ".netcheck.tmp");
R.ok("przy czerwonym netlog ZOSTAJE na dysku",
     require("fs").existsSync(NETWORK_WORK), NETWORK_WORK);
R.ok("i komunikat wymienia ścieżkę do niego",
     /\.netcheck\.tmp/.test(netDirty.out), netDetail(netDirty));
R.ok("i nazwa scenariusza jest w nazwie pliku, nie sam numer przebiegu",
     require("fs").existsSync(NETWORK_WORK) &&
     require("fs").readdirSync(NETWORK_WORK).some(function (f) { return /pixel/.test(f); }),
     require("fs").existsSync(NETWORK_WORK)
       ? require("fs").readdirSync(NETWORK_WORK).join(" ") : "katalogu nie ma");
R.ok("new Image().src = https://… -> czerwone", netDirty.code === 1, kod(netDirty));
R.ok("i nazywa HOSTA, do którego poszło żądanie",
     /telemetry\.example\.invalid/.test(netDirty.out), netDirty.out.split("\n")[2]);
/* To jest DOKLADNIE ten przypadek, ktory przechodzi przez check-offline.js — para
   fixtur po obu stronach jednej GRANICY pokazuje, ze te dwa straznice sie uzupelniaja,
   a nie dubluja. Granica jest zamierzona i opisana w ADR-003, nie zaleglosc. */
R.ok("czyli łapie to, co check-offline.js przepuszcza (granica z ADR-003)",
     run("check-offline.js", ["--dir", "tools/fixtures/network/dirty"]).code === 0);

R.ok("brak katalogu -> czerwone, nie „zero scenariuszy\"", network("nie-ma").code === 1);

/* ---- zero zależności npm ----
   Do 2026-08-20 ta kontrola byla krokiem w ci.yml i sprawdzala PIEC SCIEZEK W KORZENIU.
   tools/package.json przechodzil bez slowa. Fixtura brudna niesie dokladnie ten przypadek. */
function npm(variant) { return run("check-npm.js", ["--dir", "tools/fixtures/npm/" + variant]); }

var npmClean = npm("clean");
R.ok("drzewo bez śladów npm -> zielone", npmClean.code === 0, npmClean.out.split("\n")[0]);

var npmDirty = npm("dirty");
R.ok("package.json w PODKATALOGU -> czerwone", npmDirty.code === 1, kod(npmDirty));
R.ok("i node_modules w podkatalogu też", /sub\/node_modules\//.test(npmDirty.out), npmDirty.out);
R.ok("i wskazuje ŚCIEŻKĘ, nie sam fakt", /tools\/package\.json/.test(npmDirty.out));

/* PRZYNETY. Kontrola idzie po SCIEZKACH, nie po tresci — jej wlasny naglowek wymienia
   zakazane nazwy czterokrotnie i nie ma prawa zapalic sie na sobie. */
R.ok("wzmianka w TREŚCI pliku nie jest naruszeniem", npmClean.code === 0);
R.ok("nazwa PODOBNA (package.json.example) nie jest naruszeniem",
     !/package\.json\.example/.test(npmClean.out));
R.ok("katalog ZAWIERAJĄCY zakazaną nazwę (node_modules_backup) nie jest naruszeniem",
     !/node_modules_backup/.test(npmClean.out));
R.ok("brak katalogu -> czerwone, nie „nic nie znalazłem\"",
     npm("nie-ma-takiego").code === 1);

/* ---- wpięcie strażników w build ----
   #72: dwaj straznicy nie wykonywali sie nigdzie, jeden byl czerwony, build byl zielony.
   Regula, ktora z tego powstala, byla do dzis SAMA NIEEGZEKWOWANA — nic nie sprawdzalo,
   czy tools/check-* ma jakiekolwiek wystapienie w buildzie. */
var W = "tools/fixtures/wiring/";
function wiring(dir, runner, ci, fixtures) {
  return run("check-wiring.js", ["--dir", W + dir, "--runner", W + runner, "--ci", W + ci,
                                 "--fixtures", W + (fixtures || "fixtures-clean.js")]);
}

var wClean = wiring("guards-clean", "runner-clean.sh", "ci-clean.yml");
R.ok("każdy strażnik wpięty -> zielone", wClean.code === 0, wClean.out.split("\n")[0]);
/* Jeden w runnerze, drugi w ci.yml — dowod, ze WYSTARCZY jedno z dwoch zrodel,
   a nie ze sprawdzamy tylko jedno i drugie przechodzi przypadkiem. */
R.ok("i wystarczy jedno ze ŹRÓDEŁ, nie oba", /wpiętych: 2/.test(wClean.out), wClean.out.split("\n")[0]);

var wOrphan = wiring("guards-orphan", "runner-orphan.sh", "ci-orphan.yml", "fixtures-orphan.js");
R.ok("strażnik poza buildem -> czerwone", wOrphan.code === 1, kod(wOrphan));
R.ok("i nazywa go", /check-sierota\.js/.test(wOrphan.out));
/* PRZYNETA, ktora jest istota tej kontroli: nazwa pliku pada w KOMENTARZU runnera.
   Dokladnie taki akapit stoi dzis w ci.yml przy check-dictionary.js — wymienia go
   w zdaniu o jego NIEobecnosci. Naiwne „szukaj nazwy" uznaloby to za wpiecie. */
R.ok("wzmianka w KOMENTARZU nie liczy się jako wpięcie",
     /NIEWPIĘTYCH: 1/.test(wOrphan.out), wOrphan.out.split("\n")[0]);
R.ok("a strażnik wymieniony w linii wykonywalnej liczy się",
     !/check-wpiety\.js/.test(wOrphan.out.split("FAIL")[1] || ""));

/* FAIL CLOSED w obie strony. */
R.ok("brak źródła -> czerwone, nie przejście",
     wiring("guards-clean", "nie-ma.sh", "ci-clean.yml").code === 1);
/* Zero straznikow w katalogu = nieobecny przedmiot pomiaru. Zielone znaczyloby
   wtedy „nic nie sprawdzilem", czyli trzeci wariant pustego zielonego. */
var wEmpty = run("check-wiring.js", ["--dir", "tools/fixtures", "--runner", W + "runner-clean.sh", "--ci", W + "ci-clean.yml"]);
R.ok("katalog bez ani jednego strażnika -> czerwone, nie „wszystko wpięte\"",
     wEmpty.code === 1 && /przedmiot pomiaru jest nieobecny/.test(wEmpty.out), kod(wEmpty));

/* ---- drugi warunek: fixtura obok wpiecia ----
   „13 z 13 ma dowod upadku" trzymalo sie UWAGA, nie mechanizmem. Wymaganie ma ten sam
   ksztalt co wpiecie, wiec siedzi w tym samym strazniku. */
var wNoFix = wiring("guards-clean", "runner-clean.sh", "ci-clean.yml", "fixtures-missing.js");
R.ok("wpięty, ale BEZ fixtury -> czerwone", wNoFix.code === 1, kod(wNoFix));
R.ok("i nazywa strażnika bez dowodu upadku",
     /BEZ FIXTURY: 1/.test(wNoFix.out) && /check-b\.js/.test(wNoFix.out), wNoFix.out.split("\n")[0]);
/* PRZYNETA, ktora zlapala PIERWSZA wersje tego warunku: nazwa straznika pada w prozie
   komentarza. Linia kontynuacji komentarza blokowego nie zaczyna sie od gwiazdki, wiec
   filtr komentarzy uznawal ja za wykonywalna i wzmianka liczyla sie za sprawdzenie.
   Kryterium jest teraz KSZTALTEM WYWOLANIA — proza nie zawiera run("check-x.js". */
R.ok("wzmianka w PROZIE komentarza nie liczy się za fixturę",
     /BEZ FIXTURY: 1/.test(wNoFix.out), wNoFix.out.split("\n")[0]);

var wBothOk = wiring("guards-clean", "runner-clean.sh", "ci-clean.yml", "fixtures-clean.js");
R.ok("wpięty I wywołany na fixturze -> zielone", wBothOk.code === 0, wBothOk.out.split("\n")[0]);
R.ok("brak pliku z fixturami -> czerwone, nie przejście",
     wiring("guards-clean", "runner-clean.sh", "ci-clean.yml", "nie-ma.js").code === 1);

/* PROTOTYP z #94 celowo nie ma przedrostka check-, wiec NIE MA go w zestawieniu. */
var wReal = run("check-wiring.js", []);
R.ok("prototyp bez przedrostka check- nie wpada w zestawienie",
     !/prototype-rule-pointers/.test(wReal.out), wReal.out.split("\n")[0]);

/* ---- słowo-klucz zamykające obok #NN ----
   Straznik pilnuje DWOCH powierzchni jedna regula: opisu PR-a i komunikatow commitow.
   Fixtury sa parami, a jedna z nich jest DOSLOWNA KOPIA opisu PR#42 — tekstu, ktory
   naprawde zamknal #41 osiemdziesiat jeden sekund po jego utworzeniu. Przypadek
   wymyslony dowodzi, ze kontrola zyje; przypadek z historii dowodzi, ze lapie to,
   co juz raz kosztowalo. */
function ck(args) { return run("check-closing-keyword.js", args); }
var F = "tools/fixtures/closing-keyword-";

var ckClean = ck(["--pr-body", F + "clean-pr.txt"]);
R.ok("legalny „Fixes #NN\" jako cała linia -> zielone", ckClean.code === 0, ckClean.out.split("\n").pop());

var ckNeg = ck(["--pr-body", F + "negated-pr.txt"]);
R.ok("„Does not close #NN\" w środku zdania -> czerwone", ckNeg.code === 1, kod(ckNeg));
R.ok("i wskazuje LINIĘ, nie tylko fakt", /--pr-body, linia 3:/.test(ckNeg.out), ckNeg.out.split("\n")[1]);

/* PRAWDZIWY tekst, nie wymyslony: opis PR#42 pobrany z GitHuba bajtowo. */
var ckReal = ck(["--pr-body", F + "real-pr42.txt"]);
R.ok("prawdziwy opis PR#42 (ten, który zamknął #41) -> czerwone", ckReal.code === 1, kod(ckReal));

/* DRUGA POWIERZCHNIA. Straznik pilnujacy jednej i zostawiajacy druga otwarta jest
   gorszy od swojego braku, bo daje poczucie oslony. */
var ckCommitsOk = ck(["--commits", F + "clean-commits.txt"]);
R.ok("commity z trailerem „Fixes #NN\" -> zielone", ckCommitsOk.code === 0, ckCommitsOk.out.split("\n").pop());
R.ok("i liczy OBA sąsiedztwa, także to z kropką na końcu",
     /z #NN: 2   naruszeń: 0/.test(ckCommitsOk.out), ckCommitsOk.out.split("\n")[1]);

var ckCommitsBad = ck(["--commits", F + "midsentence-commits.txt"]);
R.ok("commit ze słowem-kluczem w środku zdania -> czerwone", ckCommitsBad.code === 1, kod(ckCommitsBad));
R.ok("i nazywa powierzchnię, na której zapalił", /--commits, linia/.test(ckCommitsBad.out));

/* PRZYNETY. Kazda jest osobna awaria straznika za czulego — a straznik za czuly
   produkuje szum, az ktos go oslabi. */
R.ok("„refs #NN\" nie jest słowem-kluczem", !/refs #58/i.test(ckClean.out));
R.ok("„prefixes #12\" NIE jest trafieniem — granica słowa, nie podciąg",
     ckClean.code === 0 && !/prefixes/.test(ckClean.out));
R.ok("słowo-klucz i numer w jednej linii, ale NIESĄSIADUJĄCE, nie są trafieniem",
     /z #NN: 1 /.test(ckClean.out), ckClean.out.split("\n")[1]);

/* PUSTE WEJSCIE — punkt 2 rozstrzygniecia. Opis PR-a bywa null w payloadzie
   i nie ma prawa wywalic kroku bledem interpretera; ma przejsc, ale JAWNIE. */
var ckEmptyPr = ck(["--pr-body", F + "empty-pr.txt"]);
R.ok("pusty opis PR-a przechodzi", ckEmptyPr.code === 0, kod(ckEmptyPr));
R.ok("ale mówi o tym wprost, zamiast milczeć",
     /wejście puste/.test(ckEmptyPr.out), ckEmptyPr.out.split("\n")[0]);

/* FAIL CLOSED — punkt 4. Straznik, ktory przy bledzie mowi „ok", to jest #63
   jeszcze raz: zielone, bo przedmiot pomiaru sie nie wykonal. */
var ckEmptyCommits = ck(["--commits", F + "empty-commits.txt"]);
R.ok("PUSTA lista commitów to awaria zakresu, nie czysty wynik",
     ckEmptyCommits.code === 1 && /Zakres git został policzony źle/.test(ckEmptyCommits.out),
     kod(ckEmptyCommits));

var ckMissing = ck(["--pr-body", F + "nie-ma-takiego.txt"]);
R.ok("brakujący plik wejściowy -> czerwone, nie przejście",
     ckMissing.code === 1 && /awaria pomiaru/.test(ckMissing.out), kod(ckMissing));

var ckBadArg = ck(["--body", F + "clean-pr.txt"]);
R.ok("nieznany argument -> czerwone", ckBadArg.code === 1, kod(ckBadArg));
R.ok("brak jakiejkolwiek powierzchni -> czerwone", ck([]).code === 1);

/* TRZECIA POWIERZCHNIA: TYTUL PR-a, z INNA regula — zakaz blankietowy zamiast
   „calej linii". Nie jest to niekonsekwencja i asercje maja to udowodnic wprost:
   TEN SAM napis przechodzi jako opis i upada jako tytul. */
var ckTitleOk = ck(["--pr-title", F + "title-clean.txt"]);
R.ok("tytuł opisowy -> zielone", ckTitleOk.code === 0, ckTitleOk.out.split("\n").pop());

/* PRAWDZIWY tytul PR#52 — ten, ktory wszedl na main jako komunikat commita 0fd2f9e. */
var ckTitleReal = ck(["--pr-title", F + "title-real-pr52.txt"]);
R.ok("prawdziwy tytuł PR#52 (wszedł na main jako komunikat commita) -> czerwone",
     ckTitleReal.code === 1, kod(ckTitleReal));

var ckTitleTrailer = ck(["--pr-title", F + "title-trailer.txt"]);
var ckBodyTrailer  = ck(["--pr-body",  F + "title-trailer.txt"]);
R.ok("legalny trailer W TYTULE -> czerwone mimo poprawnej formy", ckTitleTrailer.code === 1,
     kod(ckTitleTrailer));
R.ok("TEN SAM napis w OPISIE -> zielone", ckBodyTrailer.code === 0, kod(ckBodyTrailer));
/* Bez tej pary „inna regula" byloby zdaniem w komentarzu, a nie wlasciwoscia kodu. */
R.ok("czyli reguła zależy od POWIERZCHNI, nie od kształtu napisu",
     ckTitleTrailer.code !== ckBodyTrailer.code);
R.ok("i komunikat tłumaczy, dlaczego reguły się różnią",
     /W TYTULE PR-a NIE MA FORMY DOZWOLONEJ/.test(ckTitleTrailer.out));
R.ok("a przy naruszeniu w opisie NIE straszy regułą tytułu",
     !/W TYTULE PR-a/.test(ckNeg.out));

/* PR bez tytulu nie istnieje — pusty plik znaczy, ze krok nie wyprodukowal wejscia. */
var ckTitleEmpty = ck(["--pr-title", F + "empty-pr.txt"]);
R.ok("PUSTY tytuł to awaria pomiaru, nie czysty wynik",
     ckTitleEmpty.code === 1 && /tytuł jest PUSTY/.test(ckTitleEmpty.out), kod(ckTitleEmpty));

/* ---- personalia z zamknietej listy skrotow ----
   TA SAMA POWIERZCHNIA co wyzej i INNE PYTANIE: tamten pyta o KSZTALT, ten o TRESC
   wobec listy. Powod rozdzielenia plikow stoi w naglowku straznika.

   FIXTURA UZYWA WLASNEJ PRZYNETY Z WLASNYM SKROTEM. Fixtura dowodzaca straznika, ktory
   chroni napisy, nie ma prawa niesc tych napisow — byloby to ich publikacja pod pozorem
   testu, czyli dokladnie ta awaria, ktorej straznik broni.

   KSZTALT PRZYNETY ODPOWIADA KSZTALTOWI REALNEGO SLADU: imie w SRODKU ZDANIA w ciele
   komunikatu commita, nie w polu autora. Tak wyglada b2c3867 na main. */
function pn(args) { return run("check-personal-names.js", args); }
var PN = "tools/fixtures/personal-names/";
var PNH = ["--hashes", PN + "hashes.txt"];

var pnDirty = pn(PNH.concat(["--commits", PN + "dirty-commits.txt"]));
R.ok("napis z listy w środku zdania -> czerwone", pnDirty.code === 1, kod(pnDirty));
/* NAJWAZNIEJSZA ASERCJA W TYM BLOKU. Log CI jest publiczny; straznik wypisujacy
   znalezisko publikowalby to, czego broni — i bylby zartem z samego siebie. */
R.ok("i NIE cytuje trafienia, tylko pozycję i skrót",
     /kolumna \d+, długość \d+/.test(pnDirty.out) && /skrót [0-9a-f]{12}…/.test(pnDirty.out) &&
     !/qwarglep/.test(pnDirty.out), pnDirty.out.split("\n")[1]);

/* DWIE DROGI DOJSCIA DO TOKENU, KAZDA Z WLASNYM DOWODEM. Bez drugiej fixtury galaz
   adresowa bylaby kodem, ktorego nikt nigdy nie wykonal. */
var pnMail = pn(PNH.concat(["--commits", PN + "dirty-email.txt"]));
R.ok("napis z listy WEWNĄTRZ adresu pocztowego -> czerwone", pnMail.code === 1, kod(pnMail));
var pnMailWhole = pn(PNH.concat(["--commits", PN + "dirty-email-whole.txt"]));
R.ok("CAŁY adres na liście -> czerwone, choć żadna jego część słowna na niej nie stoi",
     pnMailWhole.code === 1, kod(pnMailWhole));

var pnClean = pn(PNH.concat(["--commits", PN + "clean-commits.txt"]));
R.ok("ten sam komunikat bez napisu z listy -> zielone", pnClean.code === 0, pnClean.out.split("\n").pop());

/* UCHWYT Z MYSLNIKIEM ma wlasny dowod, bo bez niego wpis takiego ksztaltu na liscie
   bylby MARTWY: rozbicie na czesci sprawia, ze skrot calosci nigdy nie pada. Lista,
   ktorej czesc nie moze zadzialac, wyglada na pokrycie, ktorego nie ma. */
var pnHandle = pn(PNH.concat(["--commits", PN + "dirty-handle.txt"]));
R.ok("login z myślnikiem jako CAŁY token -> czerwone", pnHandle.code === 1, kod(pnHandle));

/* PRZYPIETA GRANICA, nie przeoczenie: dopasowujemy CALE tokeny. Dopasowanie po podciagu
   dawaloby falszywe alarmy na zwyklych slowach, a falszywy alarm w strazniku, ktory nie
   moze pokazac, co znalazl, jest nie do zdiagnozowania. */
var pnSub = pn(PNH.concat(["--commits", PN + "clean-substring.txt"]));
R.ok("GRANICA: napis z listy jako podciąg dłuższego słowa PRZECHODZI", pnSub.code === 0,
     kod(pnSub) + " — jeśli to czerwone, ktoś zmienił dopasowanie na podciągowe");

/* ---- TRAILER PRZYPISUJĄCY AUTORSTWO: reguła KSZTAŁTU w pliku, który poza tym jest
   kontrolą TREŚCI ----

   Zasada „commity mówią o pracy, nie o tym, kto ją wykonał" żyła wyłącznie jako proza
   w CLAUDE.md. Zmierzone przed napisaniem tych asercji: linia `Co-Authored-By:` z adresem
   spoza listy skrótów przechodziła przez OBU strażników powierzchni na zielono.

   Lista skrótów nie mogła jej złapać z definicji — to kontrola treści, a trailer jest
   naruszeniem NIEZALEŻNIE od tego, kogo wymienia. Adres bywa cudzy, bywa usługi, bywa
   `noreply`; wspólny jest KSZTAŁT. Dlatego reguła jest kształtowa i dlatego ma własne
   asercje: zieleń jednej nie może być czytana jako zieleń drugiej. */
var pnTrailer = pn(PNH.concat(["--commits", PN + "dirty-trailer.txt"]));
R.ok("trailer autorstwa w komunikacie commita -> czerwone", pnTrailer.code === 1,
     kod(pnTrailer));
/* NAJWAŻNIEJSZA W TEJ GRUPIE: dowodzi, że zadziałał KSZTAŁT, a nie lista. Bez niej
   asercja wyżej byłaby zielona także wtedy, gdyby ktoś po prostu dopisał adres do
   skrótów — czyli mierzyłaby coś innego, niż mówi. */
R.ok("i powodem jest KSZTAŁT, nie lista — żaden skrót nie padł",
     /trafień: 0/.test(pnTrailer.out) && /trailer/i.test(pnTrailer.out),
     pnTrailer.out.split("\n").filter(function (l) { return /trafień/.test(l); })[0]);

var pnTrailerLoose = pn(PNH.concat(["--commits", PN + "dirty-trailer-loose.txt"]));
R.ok("inna wielkość liter, inne odstępy, inny adres -> też czerwone",
     pnTrailerLoose.code === 1, kod(pnTrailerLoose));

/* WSZYSTKIE TRZY POWIERZCHNIE, z tego samego powodu, dla którego zakaz słowa-klucza
   obejmuje tytuł: ustawienia merge'a tego repozytorium przepisują tytuł i opis PR-a
   w komunikat commita na gałęzi domyślnej. Trailer, który tam trafi, jest trailerem. */
var pnTrailerTitle = pn(PNH.concat(["--pr-title", PN + "trailer-only.txt"]));
var pnTrailerBody  = pn(PNH.concat(["--pr-body",  PN + "trailer-only.txt"]));
R.ok("ten sam trailer w TYTULE PR-a -> czerwone", pnTrailerTitle.code === 1,
     kod(pnTrailerTitle));
R.ok("i w OPISIE PR-a -> czerwone", pnTrailerBody.code === 1, kod(pnTrailerBody));

/* PRZYNĘTA. Strażnik za czuły produkuje szum, aż ktoś go osłabi — a o tej regule
   trzeba móc PISAĆ: w CLAUDE.md, w opisie PR-a, w tym komentarzu. Trailer jest
   konstrukcją zakotwiczoną na początku linii, nie napisem do wyszukania. */
var pnMention = pn(PNH.concat(["--commits", PN + "clean-mentions-trailer.txt"]));
R.ok("WZMIANKA o trailerze w środku zdania NIE jest trailerem", pnMention.code === 0,
     kod(pnMention) + " — jeśli to czerwone, reguła przestała być kotwiczona do linii");

/* FAIL CLOSED NA SAMEJ LISCIE — klasa, ktorej pozostali straznicy nie maja, bo nie maja
   danych na zewnatrz. Lista krotsza, niz sie autorowi wydaje, jest cichym przejsciem. */
var pnBroken = pn(["--hashes", PN + "broken-hashes.txt", "--commits", PN + "clean-commits.txt"]);
R.ok("linia listy, która nie jest skrótem -> czerwone", pnBroken.code === 1, kod(pnBroken));
var pnEmpty = pn(["--hashes", PN + "empty-hashes.txt", "--commits", PN + "clean-commits.txt"]);
R.ok("PUSTA lista skrótów -> czerwone, nie „nic do sprawdzenia\"",
     pnEmpty.code === 1 && /jest PUSTA/.test(pnEmpty.out), kod(pnEmpty));
var pnNoList = pn(["--hashes", PN + "nie-ma.txt", "--commits", PN + "clean-commits.txt"]);
R.ok("brak pliku listy -> czerwone", pnNoList.code === 1, kod(pnNoList));

/* LISTA PRODUKCYJNA JEST ZYWA, a nie tylko poprawna skladniowo. Bez tej asercji plik
   tools/personal-names.sha256 moglby zostac oprozniony i wszystko zostaloby zielone,
   bo kazda pozostala asercja tego bloku uzywa listy fixturowej. */
var pnReal = run("check-personal-names.js", ["--commits", "tools/fixtures/personal-names/clean-commits.txt"]);
R.ok("domyślna lista produkcyjna wczytana i NIEPUSTA",
     pnReal.code === 0 && /skrótów na liście: [1-9]/.test(pnReal.out), pnReal.out.split("\n").pop());

/* POLA author / committer: ODMOWA DOMYSLNA. Druga polowa tego samego pliku i JEDYNA
   w tym repozytorium lista POZWOLEN — mozliwa dlatego, ze zbior dozwolonych tozsamosci
   jest zamkniety i ma dwa elementy. Powod rozdzielenia mechanizmow stoi w naglowku. */
var idClean = pn(["--identities", PN + "identities-clean.txt"]);
R.ok("obie dozwolone tożsamości -> zielone", idClean.code === 0, idClean.out.split("\n").pop());

var idBad = pn(["--identities", PN + "identities-foreign.txt"]);
R.ok("trzecia tożsamość -> czerwone", idBad.code === 1, kod(idBad));
/* KSZTALT REALNEGO RYZYKA, nie podrecznikowego: swiezy klon bez `git config --local`
   commituje z loginu i nazwy hosta. To jest wlasnie ta tozsamosc, o ktorej nikt nie
   pomyslal — i lista ZAKAZOW nie mialaby jej skad znac. */
var idHost = pn(["--identities", PN + "identities-hostname.txt"]);
R.ok("login i nazwa hosta -> czerwone, choć nikt ich nie przewidział", idHost.code === 1,
     kod(idHost));
R.ok("i NIE cytuje tożsamości, tylko linię i skrót",
     /--identities, linia \d+, długość \d+/.test(idHost.out) &&
     /skrót [0-9a-f]{12}…/.test(idHost.out) && !/DESKTOP/.test(idHost.out),
     idHost.out.split("\n")[1]);
/* PODPOWIEDZ MA BYC JAWNA. Tozsamosc projektowa stoi w kazdym commicie i jest publiczna
   z definicji — ukrywanie jej byloby teatrem, a strażnik ma ja WYPISAC. */
R.ok("ale dozwolone wartości wypisuje wprost, bo są publiczne z definicji",
     /rackpathlabs-ops </.test(idHost.out) && /GitHub <noreply@github\.com>/.test(idHost.out));

var idEmpty = pn(["--identities", PN + "identities-empty.txt"]);
R.ok("PUSTY zakres tożsamości -> czerwone, nie „nic do sprawdzenia\"",
     idEmpty.code === 1 && /jest PUSTY/.test(idEmpty.out), kod(idEmpty));

/* Komunikat sukcesu ma mowic o powierzchniach, ktore FAKTYCZNIE zbadano. */
R.ok("„OK\" nie mówi o powierzchni, której nie podano",
     !/w treści/.test(idClean.out.split("\n").pop()), idClean.out.split("\n").pop());

/* ---- markup kontra słownik (ADR-002, opcja B) ----
   Jedyna kontrola tekstu w tym repozytorium, która NIE zależy od pokrycia: porównuje
   dwa napisy leżące obok siebie w plikach. Powstała czerwona przed migracją — 108
   pustych elementów — więc dowód, że umie upaść, jest tu utrwalony fixturą, a nie
   wspomnieniem z dnia, w którym powstawała. */
/* ---- PIĄTA FORMA KOTWICY: atrybut content (ADR-004, podklasa (b)) ----
   Opis meta MA element w dokumencie początkowym, więc z kryterium ADR-004 nie jest
   sierotą z natury — brakowało wyłącznie formy, którą strażnik potrafi przeczytać.
   To odróżnia lukę narzędzia od fizyki, a bez tego rozróżnienia klucz naprawialny
   parkuje się jako trwały.

   Klasa jest wzięta z rejestru #77: generator.html:16 był jedynym wpisem, którego
   ŻADEN scenariusz nie mógł osiągnąć, bo opisu meta nie renderuje strona, tylko
   wyszukiwarka i podgląd linku. Kotwica jest jedynym mechanizmem, który go dosięga —
   porównuje dwa napisy leżące obok siebie w plikach i nie uruchamia niczego. */
/* ---- LISTA OZNACZEŃ ZAMIAST PROGU (ADR-004, Accepted) ----
   ORPHAN_BASELINE była jedną liczbą i nie umiała odróżnić klucza, który kotwicy NIGDY
   nie będzie miał, od takiego, którego nikt jeszcze nie przeniósł. Każdy był anonimowym
   długiem, a stan uczciwy — „ten klucz nigdy nie dostanie kotwicy, oto powód" — wyglądał
   identycznie jak zaniedbanie.

   Kryterium jest teraz ZBIOREM PUSTYM: klucz bez kotwicy i bez oznaczenia wywala build.
   Progu nie da się podnieść, bo nie ma progu; jest lista, którą człowiek czyta i z którą
   może się nie zgodzić.

   Fixtura ma WŁASNY słownik na trzy klucze. Na prawdziwych 232 nie da się pokazać, że
   zbiór jest pusty albo że nie jest — widać tylko, że jest duży. */
var MK = "tools/fixtures/markings/";
function mark(file) {
  return run("check-markup-dict.js", [MK + "anchors.html", "--dict", MK + "dict.js",
                                      "--markings", MK + file]);
}
var mkMissing = mark("missing.txt");
R.ok("klucz bez kotwicy i BEZ oznaczenia -> czerwone", mkMissing.code === 1, kod(mkMissing));
R.ok("i nazywa DOKŁADNIE ten klucz, nie liczbę",
     /x\.orphan2/.test(mkMissing.out) && !/x\.orphan1/.test(mkMissing.out),
     mkMissing.out.split("\n").pop());

var mkA = mark("complete-a.txt");
R.ok("wszystkie sieroty oznaczone kodem a -> zielone", mkA.code === 0,
     kod(mkA) + " " + mkA.out.split("\n").pop());

/* (b) MA ZNIKNĄĆ, (a) ma zostać. Licznik, który ich nie rozdziela, nie odpowiada na
   jedyne pytanie, które ta lista ma obsłużyć: czy cokolwiek zostało naprawione. */
var mkB = mark("complete-b.txt");
R.ok("wszystkie oznaczone kodem b -> zielone", mkB.code === 0, kod(mkB));
R.ok("ale b jest LICZONE OSOBNO od a", /tymczasowych \(b\): 2/.test(mkB.out),
     mkB.out.split("\n").filter(function (l) { return /b\)/.test(l); })[0]);
R.ok("…a przy samym a ta liczba jest zerem", /tymczasowych \(b\): 0/.test(mkA.out),
     mkA.out.split("\n").filter(function (l) { return /b\)/.test(l); })[0]);

/* Oznaczenie tymczasowe bez adresu jest oznaczeniem trwałym, które udaje tymczasowe. */
var mkNoIssue = mark("b-without-issue.txt");
R.ok("kod b BEZ numeru zgłoszenia -> czerwone", mkNoIssue.code === 1, kod(mkNoIssue));

/* Lista, której nikt nie sprząta, po roku opisuje repozytorium sprzed roku — i wtedy
   pusty zbiór nie znaczy już nic. */
var mkStale = mark("stale.txt");
R.ok("oznaczenie klucza, który JEST zakotwiczony -> czerwone", mkStale.code === 1,
     kod(mkStale));
R.ok("i nazywa nieaktualną linię", /x\.anchored/.test(mkStale.out),
     mkStale.out.split("\n").pop());

var mdContent = run("check-markup-dict.js", ["tools/fixtures/markup-dict-content.html"]);
R.ok("rozjazd na atrybucie content -> czerwone", mdContent.code === 1, kod(mdContent));
R.ok("i DOKŁADNIE jeden rozjazd, nie zapalenie się na całym pliku",
     /ROZJAZDÓW: 1\b/.test(mdContent.out), mdContent.out.split("\n")[0]);
R.ok("i pokazuje OBIE strony, słownik i markup",
     /słownik: "Two Kolla-Ansible tools: a globals/.test(mdContent.out) &&
     /markup:  "Two Kolla-Ansible tools that run somewhere else/.test(mdContent.out),
     mdContent.out.split("\n")[2]);
/* Applier musi tę formę UMIEĆ, inaczej kotwica jest zapisem, którego nikt nie wykonuje:
   markup zgadzałby się ze słownikiem, a atrybut na stronie zostawałby nietknięty.
   Mierzone LICZBĄ podstawień, nie obecnością napisu w logu: forma nieznana strażnikowi
   nie jest ujściem, więc nie doliczy się — i to jest jedyna różnica, którą widać. */
var apContent = run("check-i18n-apply.js", ["tools/fixtures/i18n-apply-clean.html"]);
R.ok("i check-i18n-apply.js LICZY tę formę jako ujście tekstu",
     /9 podstawień \(na 8 elementach\)/.test(apContent.out), apContent.out.split("\n")[0]);

var mdClean = run("check-markup-dict.js", ["tools/fixtures/markup-dict-clean.html"]);
R.ok("markup zgodny ze słownikiem -> zielone", mdClean.code === 0, mdClean.out.split("\n")[0]);

var mdBad = run("check-markup-dict.js", ["tools/fixtures/markup-dict-drift.html"]);
R.ok("rozjazd albo pusty -> czerwone", mdBad.code === 1, kod(mdBad));
/* DWIE KATEGORIE, NIE JEDNA. Pusty widać na ekranie bez JS; rozjazdu nie widać nigdzie,
   dopóki ktoś nie porówna. Licznik zliczający je razem nie umiałby powiedzieć, która
   awaria zaszła — a to jest cała informacja, jaką ten strażnik ma do przekazania. */
R.ok("i liczy je OSOBNO: dokładnie jeden rozjazd i dokładnie jeden pusty",
     /PUSTYCH: 1   ROZJAZDÓW: 1/.test(mdBad.out), mdBad.out.split("\n")[0]);
R.ok("rozjazd pokazuje OBIE strony, nie samą liczbę",
     /słownik: "Deployment parameters"/.test(mdBad.out) && /markup:  "Deploy parameters"/.test(mdBad.out));
/* Kierunek naprawy jest rozstrzygnięciem, nie preferencją — ma stać w komunikacie,
   żeby przy pierwszym czerwonym CI nie było dyskusji (ADR-002, punkt 4). */
R.ok("i nazywa kierunek naprawy: źródłem prawdy jest słownik",
     /ŹRÓDŁEM PRAWDY JEST SŁOWNIK/.test(mdBad.out));

/* PRZYNĘTY. Każda jest osobną awarią strażnika. */
R.ok("zawinięty i wcięty tekst NIE jest rozjazdem (normalizacja białych znaków)",
     !/g\.field\.required/.test(mdClean.out));
R.ok("zagnieżdżony znacznik tej samej nazwy nie ucina ani nie połyka treści",
     /równych: 5/.test(mdClean.out), mdClean.out.split("\n")[0]);
R.ok("forma atrybutowa jest objęta tak samo jak treść elementu",
     !/v\.btn\.run/.test(mdClean.out));
R.ok("klucz spoza słownika należy do check-i18n.js, nie tutaj",
     !/nie\.ma\.takiego/.test(mdClean.out));

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
R.ok("applier niepełny -> czerwone", applyBad.code === 1, kod(applyBad));
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
R.ok("migawka zgodna -> zielone", snapSame.code === 0, kod(snapSame));

var snapRm = snap("removed");
R.ok("z migawki UBYWA napis -> czerwone", snapRm.code === 1, kod(snapRm));
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
     kod(snapRefuse));
R.ok("i wypisuje pozycję po pozycji, co miało zniknąć",
     /- SPAN "required"/.test(snapRefuse.out));
R.ok("i NIE nadpisuje migawki mimo odmowy", before === after);
R.ok("i nazywa flagę, która jest osobną decyzją", /--accept-removals/.test(snapRefuse.out));

/* PRZYROST jest zwykłą pracą i --update ma go przyjąć bez ceregieli — inaczej
   odmowa stałaby się szumem i ktoś dopisałby --accept-removals do runnera. */
var snapAddUpd = snap("added", ["--update"]);
R.ok("--update na PRZYROŚCIE przechodzi bez odmowy",
     snapAddUpd.code === 0 && !/ODMOWA/.test(snapAddUpd.out), kod(snapAddUpd));
/* przywracamy fixturę, bo powyższy przebieg ją zapisał */
require("fs").writeFileSync(path.join(root, SNAP, "demo--scenariusz.txt"), before);

var snapUntagged = snap("untagged");
R.ok("raport sprzed #67 (bez nazwy scenariusza) -> czerwone, nie cicha migawka undefined",
     snapUntagged.code === 1 && /bez nazwy scenariusza/.test(snapUntagged.out), kod(snapUntagged));

var snapOrphan = snap("orphan");
R.ok("scenariusz zniknął z raportu -> czerwone (ubytek największy z możliwych)",
     snapOrphan.code === 1 && /scenariusza w raporcie NIE MA/.test(snapOrphan.out), kod(snapOrphan));

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
