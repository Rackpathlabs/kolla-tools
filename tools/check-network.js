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

var runNo = 0;
function render(file, steps, label) {
  runNo++;
  var prof = path.join(work, "prof" + runNo);
  var page = path.join(work, "page" + runNo + ".html");
  var log = path.join(work, "net" + runNo + ".json");
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
var background = render(blank, "", "przebieg kontrolny");
console.log("tło (własne żądania przeglądarki): " + Object.keys(background).length + " hostów");
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

var bad = 0;
cases.forEach(function (sc) {
  var hosts = render(path.join(root, sc.file), sc.steps, sc.name);
  var out = Object.keys(hosts).filter(function (h) { return !background[h]; }).sort();
  if (!out.length) { console.log("OK   " + sc.name + " — brak żądań poza tłem"); return; }
  console.log("FAIL " + sc.name + " — ZAOBSERWOWANE ŻĄDANIA: " +
              out.map(function (h) { return h + " (×" + hosts[h] + ")"; }).join(", "));
  bad = 1;
});

fs.rmSync(work, { recursive: true, force: true });

if (bad) {
  console.log("\nNa wykonanych scenariuszach ZAOBSERWOWANO żądania sieciowe.");
  console.log("  Narzędzia mają działać z file:// i nie sięgać nigdzie. Polityka CSP");
  console.log("  (default-src 'none') odrzuca takie żądanie w czasie działania, ale");
  console.log("  ŻĄDANIE ZOSTAŁO PODJĘTE — a to znaczy, że w kodzie jest ścieżka, która");
  console.log("  go podejmuje. #101: check-offline.js czyta listę nazw i tego nie widzi.");
  process.exit(1);
}
console.log("\nOK   na wykonanych scenariuszach nie zaobserwowano żadnego żądania sieciowego");
process.exit(0);
