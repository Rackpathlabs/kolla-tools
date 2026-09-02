/* Raport z audytu axe-core → treść zgłoszenia. Czytany przez .github/workflows/a11y-audit.yml.
 *
 * DLACZEGO W DRZEWIE, A NIE W WORKFLOW. Skrypt wklejony w krok YAML-a jest kodem, którego
 * nikt nie uruchomi lokalnie i którego nie pokrywa żaden test — a ten akurat odpowiada za
 * ROZRÓŻNIENIE, które jest w tym repozytorium najważniejsze: „przebieg się nie odbył" musi
 * wyglądać inaczej niż „przebieg nie znalazł nic". Zerwana sieć, zmiana nazwy paczki albo
 * padnięty chromedriver dałyby inaczej zgłoszenie „brak znalezisk", czyli najgorszy możliwy
 * wynik: taki, który wygląda jak dobra wiadomość. To jest ten sam kod 2, co u strażników,
 * tylko wypisany prozą do zgłoszenia.
 *
 * AXE NIE JEST BRAMKĄ i ten plik o tym pisze w każdym raporcie. Zestaw reguł cudzej paczki
 * zmienia się między wydaniami; kryterium bramkujące na nim oparte znaczy, że aktualizacja
 * u kogoś innego wywala build tutaj bez jednej zmiany w tym repozytorium. Wtedy dzieje się
 * rzecz gorsza od czerwonego builda: ktoś przypina wersję i przestaje ją podnosić.
 * Bramką zostają tools/check-a11y.js i tools/check-print.js — kryteria pierwszej ręki.
 *
 * Użycie:
 *     node tools/axe-report.js <raport.json> [drugi-kandydat ...] [--rc N] [--stderr plik] [--run URL]
 *
 * Zawsze kod 0: to jest generator tekstu, nie kontrola. Czerwień, gdyby tu była, zamieniłaby
 * audytora w bramkę tylnymi drzwiami.
 */

var fs = require("fs");

function arg(name) {
  var i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}

var plik = process.argv[2];
var rc = arg("--rc") || "?";
var errPlik = arg("--stderr");
var run = arg("--run");
var stopka = run ? "\nPrzebieg: " + run + "\n" : "";

function nieOdbylSie(powod) {
  var err = "";
  if (errPlik) {
    try { err = fs.readFileSync(errPlik, "utf8").split("\n").slice(-20).join("\n"); }
    catch (e) { err = "(nie ma czego pokazać)"; }
  }
  return "**Audyt się nie odbył.** " + powod + " Kod wyjścia `npx`: `" + rc + "`.\n" +
    "\n" +
    "To NIE znaczy, że znalezisk nie ma — znaczy, że nikt ich nie szukał. Zgłoszenie\n" +
    "powstaje właśnie po to, żeby te dwie sytuacje nie wyglądały tak samo: przebieg,\n" +
    "który się nie odbył, i przebieg czysty.\n" +
    "\n" +
    "Ostatnie linie stderr:\n\n```\n" + (err.trim() || "(brak)") + "\n```\n" + stopka;
}

/* WIĘCEJ NIŻ JEDNA ŚCIEŻKA, bo @axe-core/cli w zależności od wersji i przełączników raz
   zapisuje plik, a raz wypisuje wynik na standardowe wyjście. Zmierzone na przebiegu
   33618502648: kod wyjścia 0, puste stderr i BRAK pliku wskazanego przez --save. Strażnik
   powiedział wtedy poprawnie „audyt się nie odbył" — bo z jego punktu widzenia się nie
   odbył — ale przyczyną było miejsce zapisu, a nie audyt. Kandydaci są sprawdzani po kolei
   i pierwszy, z którego da się przeczytać JSON, wygrywa. */
var kandydaci = [plik].concat(process.argv.slice(3).filter(function (a, i, t) {
  return a.indexOf("--") !== 0 && (i === 0 || t[i - 1].indexOf("--") !== 0);
}));

/* Przed JSON-em bywa gadanina narzędzia. Szukamy pierwszego nawiasu otwierającego i od
   niego parsujemy — a jeśli i to nie jest JSON, kandydat odpada. */
function czytaj(sciezka) {
  var tekst;
  try { tekst = fs.readFileSync(sciezka, "utf8"); } catch (e) { return null; }
  var i = tekst.search(/[[{]/);
  if (i === -1) return null;
  try { return JSON.parse(tekst.slice(i)); } catch (e) { return null; }
}

var dane = null, uzyty = null;
for (var k = 0; k < kandydaci.length; k++) {
  dane = czytaj(kandydaci[k]);
  if (dane) { uzyty = kandydaci[k]; break; }
}
if (!dane) {
  process.stdout.write(nieOdbylSie(
    "Z żadnego z plików nie dało się przeczytać raportu: `" + kandydaci.join("`, `") + "`."));
  process.exit(0);
}

var strony = Array.isArray(dane) ? dane : [dane];
if (!strony.length) {
  process.stdout.write(nieOdbylSie("Raport nie zawiera ani jednej strony."));
  process.exit(0);
}

/* ZIELEŃ Z LICZBĄ. „Zero znalezisk" bez liczby przebadanych reguł jest nieodróżnialne od
   audytu, który nie przebadał niczego — a to jest ta sama klasa awarii, przed którą broni
   kod 2 u strażników, tylko że tutaj wygląda jak dobra wiadomość. Zmierzone na przebiegu
   33619155354: zero naruszeń przy 1,35 MB raportu, czyli przy realnym pomiarze. Bez tych
   liczb nie dało się tego powiedzieć z samego zgłoszenia.

   `incomplete` to osobny kubełek axe: reguły, których narzędzie NIE ROZSTRZYGNĘŁO. Wliczone
   do zera byłyby przemilczeniem, więc stoją osobno. */
var razem = 0, przeszlo = 0, niepewne = 0, sekcje = [];
strony.forEach(function (p) {
  var url = p.url || "(bez adresu)";
  var v = p.violations || [];
  v.forEach(function (r) { razem += (r.nodes || []).length; });
  przeszlo += (p.passes || []).length;
  niepewne += (p.incomplete || []).length;
  sekcje.push("### " + url + "\n");
  if (!v.length) {
    sekcje.push("Bez znalezisk — reguł zdanych: " + (p.passes || []).length +
                ", nierozstrzygniętych: " + (p.incomplete || []).length + ".\n");
    return;
  }
  sekcje.push("| reguła | waga | wystąpień | opis |");
  sekcje.push("|---|---|---|---|");
  v.forEach(function (r) {
    sekcje.push("| `" + (r.id || "?") + "` | " + (r.impact || "?") + " | " +
                (r.nodes || []).length + " | " +
                String(r.help || "").split("|").join("\\|") + " |");
  });
  sekcje.push("");
});

process.stdout.write(
  "Znalezisk axe-core: **" + razem + "** na " + strony.length + " stronach, przy " +
  przeszlo + " zdanych regułach i " + niepewne + " nierozstrzygniętych. " +
  "Treść nadpisywana przy każdym przebiegu.\n" +
  "\n" +
  "Liczba zdanych reguł stoi obok zera znalezisk celowo: zero bez niej jest " +
  "nieodróżnialne\nod audytu, który nie przebadał niczego — a wygląda jak dobra " +
  "wiadomość. `Nierozstrzygnięte`\nto osobny kubełek axe, nie znaleziska i nie zaliczenia.\n" +
  "\n" +
  "**To jest audyt, nie bramka.** Nic tu nie blokuje builda i nic nie musi zostać naprawione\n" +
  "w ciągu tygodnia. Znalezisko jest kandydatem do przeglądu przez człowieka: część reguł\n" +
  "axe opisuje wzorce, które w tym interfejsie są świadomą decyzją, a część opisuje\n" +
  "prawdziwe wady. Rozstrzyga czytelnik, nie liczba.\n" +
  "\n" +
  "Kryteria bramkujące żyją w `tools/check-a11y.js` i `tools/check-print.js` i są zmienialne\n" +
  "wyłącznie stąd — po to, żeby wydanie cudzej paczki nie mogło wywalić builda bez jednej\n" +
  "zmiany w tym repozytorium.\n" +
  "\n" +
  "**Czego ten audyt NIE widzi**, żeby cisza nie uchodziła za pokrycie: motyw jest jeden —\n" +
  "ten, w którym strona otwiera się bez zapisanego wyboru. Kontrast w OBU motywach liczy\n" +
  "`tools/check-a11y.js`, arytmetyką WCAG, z tokenów.\n" +
  "\n" + sekcje.join("\n") + stopka);
process.exit(0);
