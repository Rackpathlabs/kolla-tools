#!/usr/bin/env node
/* NA WYKONANYCH SCENARIUSZACH NIE ZAOBSERWOWANO ŻADNEGO ŻĄDANIA SIECIOWEGO.
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

/* Hosty z netlogu. Czytamy pole url zdarzeń — nie parsujemy całego formatu, bo
   interesuje nas obecność żądania, a nie jego przebieg. */
function hostsFrom(logFile) {
  if (!fs.existsSync(logFile)) return null;
  var raw = fs.readFileSync(logFile, "utf8");
  var out = Object.create(null), m;
  var re = /"url":"(https?:\/\/[^"]+)"/g;
  while ((m = re.exec(raw))) {
    var h = m[1].split("/")[2];
    if (h) out[h] = (out[h] || 0) + 1;
  }
  return out;
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

  var hosts = hostsFrom(log);
  /* FAIL CLOSED: brak netlogu znaczy, że pomiar się nie odbył. Zielone przy nieobecnym
     przedmiocie pomiaru to trzeci wariant pustego zielonego z docs/PRINCIPLES.md. */
  if (hosts === null) die(label + ": Chrome nie zapisał netlogu — pomiar się nie odbył");
  return hosts;
}

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
var background = {};
for (var ci = 0; ci < CONTROL_RUNS; ci++) {
  var one = render(blank, "", "przebieg kontrolny " + (ci + 1));
  Object.keys(one).forEach(function (h) { background[h] = (background[h] || 0) + one[h]; });
}
console.log("tło (własne żądania przeglądarki): " + Object.keys(background).length +
            " hostów, unia z " + CONTROL_RUNS + " przebiegów kontrolnych");
console.log("polityka CSP zdejmowana z kopii — mierzymy, co kod PRÓBUJE zrobić, " +
            "nie czego polityka nie dopuszcza");

/* --- scenariusze --- */
var cases = fixtureDir
  ? fs.readdirSync(path.resolve(root, fixtureDir))
      .filter(function (f) { return /\.html$/i.test(f); }).sort()
      .map(function (f) { return { file: path.join(fixtureDir, f), name: f, steps: "" }; })
  : lib.FILES.map(function (sc) {
      return { file: sc.file, name: sc.file + " [" + sc.name + "]", steps: sc.steps };
    });

if (!cases.length) die("zero scenariuszy — przedmiot pomiaru jest nieobecny");

/* Najpierw ZBIERAMY wszystkie scenariusze, dopiero potem rozstrzygamy. Reguła podejrzenia
   tła jest zdaniem o WSZYSTKICH scenariuszach naraz („w każdym, w żadnym kontrolnym") i nie
   da się jej wypowiedzieć, oceniając scenariusze po kolei. */
var results = cases.map(function (sc) {
  var hosts = render(path.join(root, sc.file), sc.steps, sc.name);
  return { name: sc.name,
           out: Object.keys(hosts).filter(function (h) { return !background[h]; }).sort(),
           hosts: hosts };
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
