#!/usr/bin/env node
/* NA WYKONANYCH SCENARIUSZACH NIE ZAOBSERWOWANO ŻADNEGO ŻĄDANIA SIECIOWEGO.
 *
 * ŻĄDANIA, KTÓRE WYSTĄPIŁY, czytane po WPISACH ZDARZEŃ netlogu — nie napisy w pliku
 * diagnostycznym. Różnica nie jest szczegółem implementacji: netlog niesie na końcu zrzut
 * STANU przeglądarki, w którym stoją adresy, do których nikt nie wysłał ani jednego bajtu,
 * i właśnie je czytaliśmy jako ruch (#128). Kryterium pochodzenia stoi przy readLog.
 *
 * To zdanie jest całym zakresem tego pliku i jest napisane tak od pierwszej wersji.
 * NIE brzmi „narzędzie nie wychodzi do sieci" — bo tego ten strażnik nie dowodzi
 * i dowieść nie może. Dowodzi ZACHOWANIA NA ŚCIEŻKACH, KTÓRE PRZEJECHAŁ.
 *
 * Zdanie szersze niż dowód poprawialiśmy w tym repozytorium dwa razy tego samego dnia —
 * w docs/PRINCIPLES.md („każdy strażnik zepsuty celowo") i w nagłówku check-offline.js
 * („w kodzie nie ma API sieciowych"). Trzecie, wprowadzone świadomie, byłoby żartem
 * z samych siebie.
 *
 * ============================================================================
 * POWÓD ISTNIENIA (#101, decyzja z ADR-003, opcja D). check-offline.js sprawdza LISTĘ
 * SZEŚCIU NAZW w źródle. Przechodzą przez nią: nazwa składana w czasie działania, alias
 * bez nawiasu i `new Image().src = "https://…"` — z czego ostatnie nie jest obfuskacją,
 * tylko zwykłym kodem. Lista nazw jest kontrolą treści i przepuszcza to, o czym autor
 * listy nie pomyślał.
 *
 * Ten plik nie pyta o źródło. Uruchamia stronę i patrzy, CO WYSZŁO — mierzy skutek,
 * nie reprezentację. To jest najgłębsza reguła tego repozytorium i tutaj jest tania:
 * Chrome już jest w CI, netlog nie kosztuje ani jednej zależności.
 *
 * CZEGO TO NADAL PRZEPUSZCZA, wypisane, żeby nikt nie wziął zieleni za więcej:
 *
 *   ŚCIEŻKI NIEOSIĄGNIĘTE PRZEZ ŻADEN SCENARIUSZ. Żądanie z obsługi zdarzenia,
 *     której nikt nie kliknął, nie zostanie zaobserwowane. To jest ta sama granica,
 *     co w #56, i jedyny powód, dla którego check-offline.js nadal ma sens obok:
 *     tamten czyta źródło, więc widzi kod, który się nie wykonał, ale tylko taki,
 *     o którym pomyślał autor listy. Dwa niepełne pokrycia z różnych stron.
 *
 *   ŻĄDANIA WYCHODZĄCE PO ZAKOŃCZENIU POMIARU — netlog zamyka się razem z przeglądarką.
 * ============================================================================
 *
 * ============================================================================
 * REGUŁA MIEJSCA, NIEEGZEKWOWANA: TEN STRAŻNIK STOI W run-tests.sh I W ci.yml NARAZ.
 * PRZENIESIENIE GO DO SAMEGO CI JEST ZAKAZANE.
 *
 * Nic tego nie sprawdza — żaden strażnik nie pilnuje, w ilu miejscach stoi inny.
 * check-wiring.js żąda obecności w JEDNYM z dwóch, więc skasowanie linii z run-tests.sh
 * przeszłoby przez build bez słowa. Reguła stoi tutaj, przy przedmiocie, bo tutaj się ją
 * czyta w chwili, gdy się o niej myśli.
 *
 * Jedyny powód, dla którego ktoś by go stąd wyjął, to czas: przebieg kosztuje około
 * czternastu sekund lokalnie. To nie jest cena warta rozmowy. Kupując ją, płaci się tym,
 * że słowo „zielono" zaczyna znaczyć CO INNEGO na maszynie autora niż na PR-ze — a autor
 * dowiaduje się o czerwonym po wypchnięciu, czyli wtedy, gdy przestał na to patrzeć.
 * To jest dokładnie kształt #72: strażnik poza buildem, build zielony, strażnik czerwony.
 * Tam kosztowało to dwie kontrole niewykonywane nigdzie; tutaj kosztowałoby jedną
 * wykonywaną w połowie miejsc, co jest tą samą chorobą w łagodniejszym stadium.
 *
 * DOZWOLONE CIĘCIE, gdyby czas kiedyś zabolał naprawdę: MNIEJ SCENARIUSZY, dobranych
 * pod istotność sieciową — ścieżki, które faktycznie mogą coś wysłać, zamiast pełnej
 * piętnastki dzielonej z check-rendered.js. Wtedy oba przebiegi nadal mierzą to samo,
 * tylko krócej, a zawężenie jest widoczne w liście FILES zamiast w konfiguracji builda.
 * Cięcie przez przeniesienie do CI-only nie jest cięciem kosztu — jest przeniesieniem
 * kosztu na moment, w którym jest droższy.
 * ============================================================================
 *
 * POLITYKA CSP JEST ZDEJMOWANA Z KOPII — CELOWO, I TO JEST SEDNO TEGO PLIKU.
 *
 * Pierwsza wersja ładowała stronę taką, jaka jest, i była ZIELONA NA WSZYSTKIM. Powód:
 * `default-src 'none'` odrzuca żądanie ZANIM trafi ono do stosu sieciowego, więc netlog
 * nie widzi niczego. Zmierzone: ta sama strona z polityką daje zero trafień, bez polityki
 * daje szesnaście. Strażnik mierzyłby wtedy POLITYKĘ, nie kod — i byłby zielony niezależnie
 * od tego, co kod robi, czyli byłby pustym zielonym o najgorszej odmianie: takim, który
 * wygląda na pomiar.
 *
 * Dlatego kopia ma zdjęty znacznik polityki. Pytanie brzmi „czy w kodzie jest ścieżka,
 * która PODEJMUJE żądanie", a nie „czy polityka je zatrzyma". Polityka jest sprawdzana
 * osobno i przypięta co do znaku przez check-offline.js, punkt 1; sprawdzanie jej tutaj
 * drugi raz zastąpiłoby pytanie o kod pytaniem o nią.
 *
 * Kopia różni się więc od źródła DWOMA znanymi zmianami — zdjętym znacznikiem polityki
 * i wstrzykniętym blokiem scenariusza — i obie są weryfikowane bajtowo niżej. Trzecia
 * różnica oznaczałaby, że mierzymy plik, którego nikt nie wdroży.
 *
 * JAK ODDZIELAMY ŻĄDANIA STRONY OD WŁASNYCH ŻĄDAŃ CHROME'A. Nie listą znanych hostów —
 * to byłaby kontrola treści, czyli dokładnie ta klasa, przed którą ten plik ucieka.
 * Zamiast tego PRZEBIEG KONTROLNY: najpierw ładowana jest strona bez ani jednego
 * żądania, a hosty, które Chrome odpytał sam z siebie, stają się tłem. Scenariusz
 * zgłasza wyłącznie hosty, których w tle nie było.
 *
 * Tło jest liczone przy KAŻDYM uruchomieniu, nie zapisane w kodzie — bo Chrome w obrazie
 * CI odpytuje co innego niż Chrome na stacji roboczej, a lista hostów zapisana na stałe
 * zestarzałaby się cicho. Zmierzone: trzy kolejne przebiegi kontrolne dały identyczny
 * zbiór pięciu hostów.
 *
 * THE CONTROL PASS OBSERVES THE BROWSER FOR AT LEAST AS LONG AS THE LONGEST SCENARIO,
 * AND THAT WINDOW IS THE MEASURED NETLOG SPAN — NOT A NUMBER WRITTEN HERE (#191).
 *
 * Measured on Chrome 153.0.8010.36, 2026-09-21, before this rule existed. The blank control
 * page closed its netlog after 382 / 421 / 480 ms, the scenarios ran 540 ms on average, and
 * the browser's own component update arrived 283 to 458 ms after the first event in the log.
 * So the same host was seen in 44% of control passes and in 99% of scenarios — 20 of 45
 * against 223 of 225 over 270 launches — and four of fifteen consecutive runs of this section
 * went red on one commit.
 *
 * EVERY MILLISECOND BELOW IS A PROPERTY OF THAT BUILD ON THAT DAY, not a constant — the same
 * reading check-a11y.js records about its own flags. Which is the point of taking the target
 * from the run instead of from here: the numbers age, the comparison does not.
 *
 * That is not a race anybody can retry their way out of. The background was measured
 * through a SHORTER WINDOW than the thing it is used to judge, so the bias runs one way:
 * towards reporting the browser's own traffic as a violation of the product's.
 *
 * Hence the order below. The scenarios run FIRST, the longest of their spans is the target,
 * and each control pass is stretched until ITS OWN MEASURED SPAN reaches it. A control pass
 * that cannot reach the target is not a weaker measurement — it is no measurement, and it
 * is red, for the same reason a missing netlog is red.
 *
 * WHY A BUSY LOOP AND NOT A TIMER, measured rather than assumed, same browser and same day.
 * --virtual-time-budget fast-forwards timers, so waiting on one buys no observation: the blank
 * page spans 402 ms, and the same page waiting on a 3000 ms setTimeout spans 453 ms. Three
 * seconds of waiting bought fifty milliseconds, which is this measurement's noise. Virtual
 * time does not advance while a task is RUNNING, so synchronous work is the one thing that
 * holds the browser — and with it the log — open: the same page with 20e6 iterations spans
 * 749 ms. Scaling: 0 iterations 462 ms, 3e6 500 ms, 30e6 875 ms, 120e6 2162 ms.
 *
 * The iteration count is therefore nobody's constant to keep true. It starts at zero, doubles
 * until the measured span reaches the target, and the number that decides is the span. An
 * attempt that falls short is discarded, hosts and all: it is not a control pass, and the
 * union below says three because three is what it counts.
 *
 * Użycie:
 *     node tools/check-network.js
 *     node tools/check-network.js --dir <katalog>   # fixtura: wszystkie .html z katalogu
 */

var fs = require("fs");
var os = require("os");
var path = require("path");
var cp = require("child_process");
var lib = require("./render-lib");

var root = path.join(__dirname, "..");
var dirArg = process.argv.indexOf("--dir");
var fixtureDir = dirArg !== -1 ? process.argv[dirArg + 1] : null;

/* Świeży profil i wyłączone usługi w tle. Bez własnego profilu Chrome sięga do profilu
   użytkownika i tło rośnie z pięciu hostów do dwudziestu sześciu — zmierzone. */
var FLAGS = [
  "--headless", "--disable-gpu", "--no-sandbox", "--dump-dom",
  "--virtual-time-budget=4000", "--disable-background-networking",
  "--disable-component-update", "--disable-client-side-phishing-detection",
  "--disable-sync", "--no-first-run", "--no-pings", "--no-default-browser-check",
  "--disable-domain-reliability", "--metrics-recording-only",
  "--safebrowsing-disable-auto-update", "--disable-default-apps"
];

function die(msg) { console.log("FAIL " + msg); process.exit(1); }

/* SZEW DLA FIXTURY. Wyciąganie hostów z netlogu jest tą częścią, w której leżał defekt
   z #128 — i jedyną, której nie da się pokazać bez przeglądarki, bo netlog produkuje
   Chrome. Podany plik jest więc czytany i wypisany, bez uruchamiania czegokolwiek:
   fixtura tools/fixtures/netlog/one-request.json to PRAWDZIWY, przycięty netlog z jednym
   żądaniem w `events` i prawdziwym wpisem csp.withgoogle.com w `polledData`. */
var explain = process.argv.indexOf("--explain-netlog");
if (explain !== -1) {
  var hosts = hostsFrom(path.resolve(root, process.argv[explain + 1] || ""));
  if (hosts === null) {
    console.log("FAIL nie mogę przeczytać netlogu: " + process.argv[explain + 1]);
    process.exit(1);
  }
  Object.keys(hosts).sort().forEach(function (h) { console.log("HOST " + h + " x" + hosts[h]); });
  console.log("hostów: " + Object.keys(hosts).length);
  process.exit(0);
}

var chrome = lib.findChrome();
/* Kod 2, nie 1, i to jest ten sam kod, którym na TO SAMO zdarzenie odpowiada
   check-rendered.js — obaj szukają przeglądarki jedną funkcją z render-lib.js. 1 znaczy
   w tym runnerze „zmierzyłem i jest naruszenie"; brak przeglądarki nie jest naruszeniem
   sieciowym, tylko brakiem pomiaru, i musi być odróżnialny bez czytania, który strażnik
   akurat mówi. Dlatego NIE idzie przez die(): die() jest dla naruszeń. */
if (!chrome) {
  console.error("FAIL brak przeglądarki do pomiaru żądań sieciowych. " +
                "Ustaw CHROME=/ścieżka/do/chrome.");
  console.error("     Bez niej nie da się zaobserwować, co wyszło — a kontrola sieci");
  console.error("     NIE jest pomijana po cichu.");
  process.exit(2);
}
console.log("przeglądarka: " + chrome);

var winChrome = /\.exe$/i.test(chrome);
var work = path.join(root, ".netcheck.tmp");
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

function winPath(p) { return p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:"); }

/* HOSTY Z WPISÓW ZDARZEŃ, NIGDY Z GREPA PO PLIKU (#128).

   Do 2026-09-02 hosty wyciągało wyrażenie po CAŁEJ treści pliku. Netlog ma jednak dwie
   części: `events` — co się wydarzyło — oraz `polledData`, zrzut STANU dopisywany na końcu.
   `csp.withgoogle.com` nie występował w `events` ANI RAZU; stał wyłącznie w rejestrze
   punktów Reporting API, zbieranym przez Chrome z nagłówków `report-to:` cudzych odpowiedzi,
   z własnymi licznikami mówiącymi `reports: 0, uploads: 0`. Żądania nie było. A mimo to host
   trafiał do wyniku — raz na jakiś czas, zależnie od tego, co zdążyło dojść przed zamknięciem
   logu, i to jest cały flake opisany w #128.

   Był to pomiar REPREZENTACJI w strażniku zbudowanym po to, żeby mierzyć SKUTEK (ADR-003,
   opcja D). Ta funkcja odpowiada teraz na pytanie „jakie żądania WYSTĄPIŁY".

   It returns the log's span ALONGSIDE the hosts, because that span is this launch's WINDOW
   OF OBSERVATION — the one number that says how long anything could have been seen at all
   (#191). Read from the same events as the hosts, so that it cannot be declared beside
   them. */
function readLog(logFile) {
  if (!fs.existsSync(logFile)) return null;
  var raw = fs.readFileSync(logFile, "utf8");
  var log;
  try {
    log = JSON.parse(raw);
  } catch (e) {
    /* Netlog urwany w połowie zdarzenia zdarza się, gdy proces kończy się w trakcie zapisu.
       Doklejamy domknięcie i próbujemy raz jeszcze — ale gdy i to zawiedzie, zwracamy null,
       a wywołujący traktuje to jako BRAK POMIARU, nie jako czysty wynik. */
    var cut = raw.lastIndexOf("},");
    try { log = JSON.parse(raw.slice(0, cut + 1) + "]}"); } catch (e2) { return null; }
  }
  if (!log || !Array.isArray(log.events)) return null;

  var URL_REQUEST = log.constants && log.constants.logSourceType &&
                    log.constants.logSourceType.URL_REQUEST;
  var out = Object.create(null);
  log.events.forEach(function (ev) {
    var p = ev && ev.params;
    if (!p || typeof p.url !== "string") return;
    /* KRYTERIUM POCHODZENIA: zdarzenie musi nieść adres ORAZ jedno ze znamion prawdziwego
       żądania — `traffic_annotation`, którą Chrome nadaje każdemu żądaniu sieciowemu, albo
       źródło typu URL_REQUEST. Wpis rejestru punktów raportowania nie ma ani jednego z nich:
       nie ma adnotacji, nie ma inicjatora, nie ma metody i nie leży w `events`. */
    var fromRequest = p.traffic_annotation !== undefined ||
                      (URL_REQUEST !== undefined && ev.source && ev.source.type === URL_REQUEST);
    if (!fromRequest) return;
    var m = /^https?:\/\/([^/]+)/.exec(p.url);
    if (m) out[m[1]] = (out[m[1]] || 0) + 1;
  });

  /* THE WINDOW IS COUNTED OVER ALL EVENTS, not over requests alone: the question is how
     long the log was open, not when the first request went out. A launch that sent nothing
     still has a window, and still has to be comparable with one that did. */
  var lo = Infinity, hi = -Infinity;
  log.events.forEach(function (ev) {
    var t = Number(ev && ev.time);
    if (!isFinite(t)) return;
    if (t < lo) lo = t;
    if (t > hi) hi = t;
  });
  return { hosts: out, span: hi >= lo ? hi - lo : 0 };
}

/* The --explain-netlog seam asks about hosts alone and stays that way: the fixture from #128
   demonstrates the ORIGIN CRITERION and not the window, and handing it a second number would
   change what that pass shows. */
function hostsFrom(logFile) {
  var r = readLog(logFile);
  return r === null ? null : r.hosts;
}

/* Nazwa scenariusza w NAZWIE PLIKU, nie sam numer przebiegu. Netlog nazwany „net7.json"
   jest dowodem, którego nikt nie przypisze do scenariusza bez liczenia w głowie, a liczy
   się go wtedy, gdy build jest czerwony i nikt nie ma na to głowy. */
function slug(t) {
  return String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

var runNo = 0;
function render(file, steps, label) {
  runNo++;
  var tag = runNo + "-" + (slug(label) || "bez-nazwy");
  var prof = path.join(work, "prof" + runNo);
  var page = path.join(work, "page" + tag + ".html");
  var log = path.join(work, "net" + tag + ".json");
  fs.mkdirSync(prof, { recursive: true });

  var src = fs.readFileSync(file, "utf8");
  /* Zdjęcie polityki — patrz nagłówek. Bez tego netlog jest pusty zawsze. */
  var CSP_TAG = /[ \t]*<meta\s+http-equiv=(["'])Content-Security-Policy\1[\s\S]*?>\n?/i;
  var stripped = src.replace(CSP_TAG, "");
  var removedCsp = stripped !== src;
  var block = steps ? "<script>try{" + steps + "}catch(e){}</script>" : "";
  fs.writeFileSync(page, block ? stripped.replace("</body>", block + "\n</body>") : stripped);
  /* Ta sama gwarancja co w check-rendered.js, rozszerzona o drugą znaną zmianę:
     kopia różni się od źródła WYŁĄCZNIE zdjętym znacznikiem polityki i wstrzykniętym
     blokiem. Trzecia różnica znaczy, że mierzymy plik, którego nikt nie wdroży. */
  var back = fs.readFileSync(page, "utf8");
  if ((block ? back.replace(block + "\n", "") : back) !== stripped) {
    die(label + ": kopia różni się od źródła nie tylko znanymi zmianami");
  }
  if (label.indexOf("kontroln") === -1 && !removedCsp && /\.html$/i.test(file)) {
    /* Brak polityki w źródle jest sprawą check-offline.js, nie tego pliku — ale
       odnotowujemy, bo inaczej „nie zdjęto" wyglądałoby jak „zdjęto". */
    console.log("     (uwaga: " + label + " nie ma znacznika CSP w źródle)");
  }

  var url = "file:///" + (winChrome ? winPath(page) : page).replace(/^\//, "");
  var args = FLAGS.concat(["--user-data-dir=" + (winChrome ? winPath(prof) : prof),
                           "--log-net-log=" + (winChrome ? winPath(log) : log), url]);
  try {
    cp.execFileSync(chrome, args, { stdio: ["ignore", "ignore", "ignore"], timeout: 120000 });
  } catch (e) { /* kod wyjścia przeglądarki nie jest wynikiem pomiaru */ }

  var read = readLog(log);
  /* FAIL CLOSED: brak netlogu znaczy, że pomiar się nie odbył. Zielone przy nieobecnym
     przedmiocie pomiaru to trzeci wariant pustego zielonego z docs/PRINCIPLES.md. */
  if (read === null) die(label + ": Chrome nie zapisał netlogu — pomiar się nie odbył");
  return read;
}

/* --- scenariusze --- */
var cases = fixtureDir
  ? fs.readdirSync(path.resolve(root, fixtureDir))
      .filter(function (f) { return /\.html$/i.test(f); }).sort()
      .map(function (f) { return { file: path.join(fixtureDir, f), name: f, steps: "" }; })
  : lib.FILES.map(function (sc) {
      return { file: sc.file, name: sc.file + " [" + sc.name + "]", steps: sc.steps };
    });

if (!cases.length) die("zero scenariuszy — przedmiot pomiaru jest nieobecny");

console.log("polityka CSP zdejmowana z kopii — mierzymy, co kod PRÓBUJE zrobić, " +
            "nie czego polityka nie dopuszcza");

/* Najpierw ZBIERAMY wszystkie scenariusze, dopiero potem rozstrzygamy. Reguła podejrzenia
   tła jest zdaniem o WSZYSTKICH scenariuszach naraz („w każdym, w żadnym kontrolnym") i nie
   da się jej wypowiedzieć, oceniając scenariusze po kolei.

   THE SCENARIOS NOW RUN FIRST, BEFORE THE BACKGROUND, and that is a change of order rather
   than of layout (#191). The background has to be measured through a window NO SHORTER than
   the window of the thing it judges — and how long that is, is known only once the scenarios
   have been measured. The other order would force the target to be written down from memory,
   which is a number standing in for a measurement. */
var results = cases.map(function (sc) {
  var r = render(path.join(root, sc.file), sc.steps, sc.name);
  return { name: sc.name, hosts: r.hosts, span: r.span, out: null };
});

/* --- przebieg kontrolny: tło --- */
var blank = path.join(work, "control.html");
fs.writeFileSync(blank,
  "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">" +
  "<title>control</title></head><body></body></html>\n");
/* TŁO Z UNII K PRZEBIEGÓW, NIE Z JEDNEGO — i K jest wybrane, a nie zgadnięte.

   #128: w CI przebieg kontrolny zobaczył raz 4 hosty, raz 5, na tym samym commicie, a
   brakującym był `csp.withgoogle.com` — po czym pojawiał się w KAŻDYM z piętnastu
   scenariuszy i był raportowany jako naruszenie. Tło mierzone jednym przebiegiem jest
   pojedynczą próbką i tak właśnie się zachowuje.

   K = 3, i powód jest zapisany razem z tym, czego pomiar NIE pokazał. Lokalnie
   dziesięć przebiegów kontrolnych dało DZIESIĘĆ RAZY TEN SAM zbiór pięciu hostów —
   wariancja zero, więc lokalny pomiar nie mówi nic o rozkładzie, który widać w CI.
   Wybranie K z rozkładu, którego się nie zmierzyło, byłoby liczbą z głowy. K = 3 to
   najmniejsze K większe od jednego: kosztuje dwa dodatkowe uruchomienia przeglądarki
   i trzykrotnie zwiększa szansę zobaczenia hosta, który bywa w tle.

   Ciężar naprawy NIE leży jednak w K, tylko w regule niżej: host obecny w KAŻDYM
   scenariuszu i w ŻADNYM przebiegu kontrolnym jest zgłaszany jako PODEJRZENIE TŁA, a nie
   jako naruszenie. Ta reguła nie zależy od K i sama zamyka awarię z #128. */
var CONTROL_RUNS = 3;

/* THE CONTROL WINDOW IS STRETCHED TO THE LONGEST SCENARIO — the reason is in the header
   (#191). Against a fixture whose scenarios are short, nothing is injected at all. */
var BUSY_SEED = 20000000;
var BUSY_ATTEMPTS = 6;
function busySteps(n) {
  return n ? "var __s = 0; for (var __i = 0; __i < " + n + "; __i++) " +
             "{ __s += Math.sqrt(__i % 97 + 1); } window.__controlBusy = __s;" : "";
}

var target = results.reduce(function (m, r) { return r.span > m ? r.span : m; }, 0);
var background = {};
var controlSpans = [];
var discarded = [];
var busy = 0;
for (var ci = 0; ci < CONTROL_RUNS; ci++) {
  var one = null;
  for (var attempt = 1; ; attempt++) {
    /* THE ATTEMPT NUMBER GOES IN THE NAME, for the same reason the scenario's name does:
       a rejected attempt stays on disk, and a netlog named like the accepted one would leave
       somebody guessing, on a red build, which of them reached the background. */
    one = render(blank, busySteps(busy),
                 "przebieg kontrolny " + (ci + 1) + " proba " + attempt);
    if (one.span >= target) break;
    discarded.push(one.span);
    /* FAIL CLOSED, exactly as for a missing netlog: a window shorter than the scenarios' is
       not a weaker measurement of the background, it is none — and it is what produced the
       red runs in #191. */
    if (attempt >= BUSY_ATTEMPTS) {
      die("przebieg kontrolny " + (ci + 1) + ": okno " + one.span + " ms nie sięgnęło " +
          "najdłuższego scenariusza (" + target + " ms) w " + attempt + " próbach — " +
          "tło byłoby zmierzone krótszym oknem niż to, co ma osądzać");
    }
    busy = busy ? busy * 2 : BUSY_SEED;
  }
  controlSpans.push(one.span);
  /* Attempts that fell short are discarded, hosts and all: they are not control passes, and
     the union below says three because three is what it counts. */
  Object.keys(one.hosts).forEach(function (h) {
    background[h] = (background[h] || 0) + one.hosts[h];
  });
}
console.log("okno obserwacji: najdłuższy scenariusz " + target + " ms, przebiegi kontrolne " +
            controlSpans.join(", ") + " ms — każdy nie krótszy");
if (discarded.length) {
  /* Printed, because those attempts' netlogs stay on disk next to the accepted ones. Silence
     here would mean that on a red build somebody reads one control pass too many. */
  console.log("     (odrzucone próby kalibracji okna: " + discarded.join(", ") +
              " ms — hosty z nich NIE weszły do tła)");
}
console.log("tło (własne żądania przeglądarki): " + Object.keys(background).length +
            " hostów, unia z " + CONTROL_RUNS + " przebiegów kontrolnych");

results.forEach(function (r) {
  r.out = Object.keys(r.hosts).filter(function (h) { return !background[h]; }).sort();
});

/* PODEJRZENIE TŁA, nie naruszenie. Host w KAŻDYM scenariuszu i w ŻADNYM z przebiegów
   kontrolnych zachowuje się jak własne żądanie przeglądarki, którego tło nie złapało —
   a nie jak ścieżka w kodzie, bo ta trafiłaby do scenariuszy, które jej dotykają, a nie
   do wszystkich naraz. Zmierzone w #128: dokładnie ten kształt, piętnaście z piętnastu.

   Nie zwalniamy tego po cichu. Strażnik mówi, CO widzi i JAK to rozstrzygnąć, bo różnica
   między „tło" a „żądanie z każdej strony" jest rozstrzygalna tylko przez człowieka. */
/* CO NAJMNIEJ DWA SCENARIUSZE, inaczej reguła nie ma o czym mówić: przy jednym „w każdym
   scenariuszu" jest prawdą dla każdego zaobserwowanego hosta i reguła zwolniłaby JEDYNE
   naruszenie, jakie ten przebieg umie znaleźć. Złapane na fixturze `dirty`, która ma jeden
   plik — pierwsza wersja tej reguły przepuściła ją na zielono.

   KOSZT, nazwany tutaj, a nie odkryty przy awarii: żądanie wychodzące z bloku
   WSPÓŁDZIELONEGO przez wszystkie strony trafi do wszystkich scenariuszy naraz i zostanie
   zgłoszone jako podejrzenie tła zamiast jako naruszenie. To jest dokładnie klasa #101,
   czyli ta, dla której ten strażnik powstał. Reguła nie zwalnia po cichu — wypisuje host,
   liczbę scenariuszy i sposób rozstrzygnięcia — ale zieleń przy takim wyniku znaczy mniej
   niż zieleń bez niego i tak trzeba ją czytać. */
var everywhere = results.length >= 2
  ? results[0].out.filter(function (h) {
      return results.every(function (r) { return r.out.indexOf(h) !== -1; });
    })
  : [];
var suspect = {};
everywhere.forEach(function (h) { suspect[h] = true; });

var bad = 0;
results.forEach(function (r) {
  var real = r.out.filter(function (h) { return !suspect[h]; });
  if (!real.length) { console.log("OK   " + r.name + " — brak żądań poza tłem"); return; }
  console.log("FAIL " + r.name + " — ZAOBSERWOWANE ŻĄDANIA: " +
              real.map(function (h) { return h + " (×" + r.hosts[h] + ")"; }).join(", "));
  bad = 1;
});

if (everywhere.length) {
  console.log("");
  console.log("FAIL PODEJRZENIE TŁA: " + everywhere.join(", "));
  console.log("  Każdy z tych hostów wystąpił we WSZYSTKICH " + results.length +
              " scenariuszach i w ŻADNYM z " + CONTROL_RUNS + " przebiegów kontrolnych.");
  console.log("  Dwie rzeczy mają ten kształt i tylko jedna z nich jest niegroźna:");
  console.log("    ŻĄDANIE Z BLOKU WSPÓŁDZIELONEGO — matrix.js i globals-parser.js są");
  console.log("      wklejane do wszystkich plików, więc ich żądanie trafia wszędzie naraz.");
  console.log("      To jest NARUSZENIE i to jest powód, dla którego ten wynik jest czerwony.");
  console.log("    WŁASNE ŻĄDANIE PRZEGLĄDARKI, którego przebieg kontrolny nie złapał.");
  console.log("  ROZSTRZYGNIĘCIE: netlogi zostały w " + path.relative(root, work) + ".");
  console.log("  Jeśli host wskazuje zasób strony albo wywołanie w kodzie — to naruszenie.");
  console.log("  Jeśli nie wskazuje go nic ze strony — to tło, i wtedy trzeba je dopisać.");
}

/* PODEJRZENIE JEST CZERWONE, i to ODWRACA rozstrzygnięcie z PR #134.

   Tamten PR uczynił z tego wynik zielony z blokiem informacyjnym i nazwał koszt przy
   regule. Koszt okazał się nie do przyjęcia: matrix.js i globals-parser.js są wklejane
   bajt w bajt do wszystkich trzech plików, więc żądanie z bloku współdzielonego trafia
   do każdego scenariusza i do żadnego przebiegu kontrolnego — czyli DOKŁADNIE w kształt,
   który tamta reguła zwalniała. To nie jest przypadek brzegowy, tylko domyślny kształt
   kodu współdzielonego w tym repozytorium, i zieleń przy nim wpuszczała z powrotem klasę
   #101, dla której ten strażnik powstał. Fixtura tools/fixtures/network/shared trzyma
   ten kształt: dwie strony, jeden blok, jedno żądanie.

   ROZRÓŻNIENIE ZOSTAJE, ZIELONY WERDYKT NIE. Przy naruszeniu wiadomo, że to kod; przy
   podejrzeniu trzeba rozstrzygnąć, czy to kod, czy przeglądarka — i to jest inny
   komunikat, a nie inny kod wyjścia. */
var suspicionIsRed = everywhere.length > 0;

/* Katalog roboczy kasujemy TYLKO przy zielonym. Dowód, który znika przed obejrzeniem,
   nie jest dowodem — #128 rozstrzygnięto liczbą z nagłówka, bo netlogu już nie było. */
if (!bad && !suspicionIsRed) {
  fs.rmSync(work, { recursive: true, force: true });
}

if (suspicionIsRed && !bad) {
  console.log("");
  console.log("Werdykt CZERWONY na samym podejrzeniu, bez ani jednego pewnego naruszenia.");
  console.log("  Zieleń tutaj wpuszczałaby klasę #101: blok współdzielony jest wklejany do");
  console.log("  wszystkich plików, więc jego żądanie ma dokładnie ten kształt. Rozstrzygnij");
  console.log("  po netlogach — zostały na dysku — i albo usuń ścieżkę z kodu, albo dopisz");
  console.log("  host do tła, jeśli okaże się własnym żądaniem przeglądarki.");
  process.exit(1);
}

if (bad) {
  console.log("\nNa wykonanych scenariuszach ZAOBSERWOWANO żądania sieciowe.");
  console.log("  Narzędzia mają działać z file:// i nie sięgać nigdzie. Polityka CSP");
  console.log("  (default-src 'none') odrzuca takie żądanie w czasie działania, ale");
  console.log("  ŻĄDANIE ZOSTAŁO PODJĘTE — a to znaczy, że w kodzie jest ścieżka, która");
  console.log("  go podejmuje. #101: check-offline.js czyta listę nazw i tego nie widzi.");
  console.log("");
  console.log("  NETLOGI ZOSTAŁY na dysku, w " + path.relative(root, work) + " — po jednym");
  console.log("  na scenariusz, z jego nazwą w nazwie pliku. To jest jedyny artefakt, który");
  console.log("  odpowiada na pytanie o hosta i jego źródło, i dlatego nie jest kasowany.");
  process.exit(1);
}
console.log("\nOK   na wykonanych scenariuszach nie zaobserwowano żadnego żądania sieciowego");
process.exit(0);
