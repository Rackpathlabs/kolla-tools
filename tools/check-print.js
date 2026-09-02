/* WYDRUK — co naprawdę wychodzi z drukarki, mierzone na PDF-ie, a nie na deklaracji CSS.
 *
 * ============================================================================
 * CO JEST MIERZALNE TANIO, A CO NIE — rozstrzygnięte pomiarem przed napisaniem tego pliku
 *
 * Headless Chrome umie wydrukować stronę bez żadnego połączenia DevTools: `--print-to-pdf`
 * renderuje z media `print`. Strumienie treści PDF-a są skompresowane algorytmem Flate,
 * czyli rozpakowuje je `zlib` wbudowany w Node — bez jednej zależności npm. Z rozpakowanego
 * strumienia czytamy DOKŁADNIE:
 *
 *   - operatory koloru (`r g b rg` / `RG`) z czterema miejscami po przecinku,
 *   - prostokąty wypełnienia (`re f`), czyli tła,
 *   - liczbę stron i liczbę glifów.
 *
 * CZEGO NIE CZYTAMY I DLACZEGO, powiedziane wprost, żeby cisza nie uchodziła za pokrycie:
 *
 *   TREŚĆ NAPISÓW. Tekst jedzie jako identyfikatory glifów podzestawu fontu
 *   (`<0027004C0056> Tj`), a ich odwzorowanie na znaki siedzi w tablicy `/ToUnicode`
 *   OSOBNEJ DLA KAŻDEGO FONTU. Zmierzone: sklejenie tych tablic w jedną — czyli wersja,
 *   którą pisze się odruchowo — daje bełkot, bo identyfikatory glifów kolidują między
 *   podzestawami. Poprawna wersja wymaga wiązania `Tf` z zasobami strony i jest tą częścią,
 *   która pęknie przy zmianie sposobu osadzania fontów przez Chrome'a. Nie ma jej tutaj.
 *
 *   CZYTELNOŚĆ. Czy 13 px w skali A4 da się przeczytać i czy kontrast wystarcza na papierze
 *   — to są pytania o farbę i wzrok, nie o plik.
 *
 *   MIEJSCE ŁAMANIA STRON. PDF mówi, gdzie łamanie wypadło, i nie mówi, czy tam wypaść
 *   powinno.
 *
 *   PRZEZROCZYSTOŚĆ. Alfa siedzi w stanie graficznym, a nie przy operatorze koloru, więc
 *   nakładka `rgba(...)` jest stąd nieodróżnialna od koloru nieprzezroczystego. Powód
 *   i cena stoją przy liście CIEMNE niżej.
 *
 *   CZY COŚ ZOSTAŁO UCIĘTE. Zmierzone, nie założone: usunięcie z bloku druku całego
 *   zdejmowania `max-height` i `overflow` NIE ZMIENIA wydruku ani o jeden glif ani o jedną
 *   stronę (8095 glifów i 6 stron w obu wariantach generatora). Chrome drukuje treść
 *   wystającą poza kontener niezależnie od tych reguł, więc różnica, którą ten strażnik
 *   mógłby zobaczyć, nie powstaje. Reguły zostają w arkuszu dla silników, które zachowują
 *   się inaczej, i ten strażnik o nich MILCZY zamiast udawać, że je sprawdził.
 * ============================================================================
 *
 * TRZY WYDRUKI NA STRONĘ, BO POJEDYNCZY NICZEGO NIE DOWODZI. Wydruk, który wygląda
 * poprawnie, wygląda tak samo jak wydruk, na który reguły druku w ogóle nie zadziałały —
 * strona bez `@media print` też się drukuje. Dlatego trzeci przebieg jest KONTROLĄ: ten
 * sam plik z blokiem druku unieważnionym warunkiem, którego żadna drukarka nie spełni.
 * Różnica między nim a właściwym wydrukiem jest dowodem, że reguły działają, i jednocześnie
 * dowodem, że ta kontrola potrafi upaść — bez fixtury, na produkcie.
 *
 *   A. reguły druku włączone, motyw ekranowy CIEMNY
 *   B. reguły druku włączone, motyw ekranowy JASNY
 *   C. reguły druku unieważnione, motyw ekranowy CIEMNY   (kontrola)
 *
 * MOTYW WYMUSZAMY W BLOKU PRZEŁĄCZNIKA, a nie atrybutem na <html>. Atrybut jest zdejmowany
 * przez sam produkt: bez zapisu w pamięci przełącznik startuje w stanie „za systemem"
 * i usuwa `data-theme` przy pierwszym wykonaniu. Pierwsza wersja tego pomiaru ustawiała
 * atrybut i mierzyła w kółko ten sam motyw, nie wiedząc o tym.
 *
 * Cztery zdania, każde upadające osobno:
 *   1. kolory(A) == kolory(B) co do wartości — wydruk nie zależy od motywu ekranowego.
 *   2. w A nie ma ANI JEDNEJ wartości z ciemnej palety ekranowej — bo obecność choćby
 *      jednej znaczy, że blok druku do tamtej reguły nie dotarł.
 *   3. w C te wartości SĄ — czyli zdanie 2 mierzy cokolwiek.
 *   4. glify(A) < glify(C) — nawigacja i przyciski zniknęły z papieru.
 *
 * Kod 2 przy braku przeglądarki: „nie zmierzyłem" to inna wiadomość niż „nie przeszło".
 *
 * Użycie:
 *     node tools/check-print.js
 *     node tools/check-print.js --file generator.html
 */

var fs = require("fs");
var os = require("os");
var path = require("path");
var cp = require("child_process");
var zlib = require("zlib");
var lib = require("./render-lib");

var root = path.join(__dirname, "..");
var PAGES = ["generator.html", "validator.html"];
var fileArg = process.argv.indexOf("--file");
if (fileArg !== -1) PAGES = [process.argv[fileArg + 1]];

var chrome = lib.findChrome();
if (!chrome) {
  console.error("BŁĄD: nie znalazłem przeglądarki (ustaw CHROME=/ścieżka).");
  console.error("     Wydruk jest własnością WYRENDEROWANEJ strony; bez przeglądarki");
  console.error("     nie ma czego zmierzyć, a pominięta kontrola wygląda tak samo");
  console.error("     jak kontrola, która przeszła.");
  process.exit(2);
}
console.log("przeglądarka: " + chrome);

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kolla-print-"));

/* Unieważnienie bloku druku bez liczenia klamer: warunek dopisany do zapytania medialnego
   nie jest spełniony przez żadną drukarkę, więc blok zostaje w pliku i nie działa. */
function bezDruku(html) {
  return html.split("@media print{").join("@media print and (min-width:99999px){")
             .split("@media print{").join("@media print and (min-width:99999px){");
}

function przygotuj(file, nazwa, motyw, kontrola) {
  var html = fs.readFileSync(path.resolve(root, file), "utf8");
  if (kontrola) html = bezDruku(html);
  var przed = html;
  html = html.replace('var stan = "system";', 'var stan = "' + motyw + '";');
  if (html === przed) {
    console.error("BŁĄD: nie znalazłem stanu początkowego przełącznika w " + file + ".");
    console.error("     Bez wymuszenia motywu wszystkie trzy wydruki byłyby tym samym");
    console.error("     wydrukiem, a strażnik porównywałby plik sam ze sobą.");
    process.exit(2);
  }
  var out = path.join(tmp, nazwa + "-" + path.basename(file));
  fs.writeFileSync(out, html);
  return out;
}

/* Ciemna paleta czytana Z MIERZONEJ STRONY, a nie z theme.css. Blok motywu jest w każdej
   stronie wklejony, więc to jest to samo źródło — a fixtura, która ma własną paletę, mierzy
   się wtedy wobec swojej, nie cudzej. Lista wypisana w strażniku zestarzałaby się przy
   pierwszym nowym tokenie i to ona byłaby wtedy zielona.

   Wartości występujące także w bloku druku odpadają: nie odróżniłyby jednego od drugiego. */
function ciemnaPaleta(html) {
  function tokens(od, doKtorego) {
    var i = html.indexOf(od);
    if (i === -1) return {};
    var open = html.indexOf("{", i), close = html.indexOf(doKtorego, open);
    var out = {}, re = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/g, m;
    var blok = html.slice(open, close);
    while ((m = re.exec(blok))) out[m[2].toLowerCase()] = m[1];
    return out;
  }
  var ciemne = tokens("\n:root{", "}");
  /* Z KLAMRĄ, i to nie jest kosmetyka. `"@media print"` bez niej trafia też w zdanie
     o bloku druku napisane w komentarzu — zmierzone na fixturze, gdzie dopasowanie do
     komentarza rozciągnęło „blok druku" na cały arkusz i lista przecieków wyszła pusta.
     Strażnik był wtedy zielony przy NIEOBECNYM przedmiocie. */
  var druk = tokens("@media print{", "}");
  var out = {};
  Object.keys(ciemne).forEach(function (hex) { if (!druk[hex]) out[hex] = ciemne[hex]; });

  /* Znak firmowy ma stałe barwy w atrybutach SVG, nie w regule CSS — poza zasięgiem
     bloku druku i poza zasięgiem tools/check-theme-tokens.js, z tego samego powodu. */
  delete out["#3ddc97"];
  delete out["#5aa9ff"];

  /* NAKŁADKI ALFA ODPADAJĄ, I TO JEST OGRANICZENIE POMIARU, nie zwolnienie z reguły.
     `rgba(239,106,106,.14)` trafia do PDF-a jako CZYSTY #ef6a6a, a jego przezroczystość
     siedzi osobno, w stanie graficznym (`/GS gs`), którego ten czytnik nie rozwija.
     Widziane stąd nakładka jest nieodróżnialna od koloru nieprzezroczystego — więc kolory
     będące podstawą jakiejkolwiek nakładki na tej stronie są z listy zdejmowane.

     Cena jest nazwana: gdyby ten sam odcień trafił na wydruk NAPRAWDĘ nieprzezroczyście,
     ten strażnik by go nie zobaczył. Alternatywą było dopisanie tokenów wyłącznie po to,
     żeby przyrząd miał wygodniej — czyli naginanie produktu do miernika. Na papierze
     nakładka i tak kompozytuje się z bielą, więc jest poprawna z konstrukcji; to samo
     zdanie stoi w nagłówku tools/check-theme-tokens.js. */
  var re2 = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/g, m2;
  while ((m2 = re2.exec(html))) {
    var h = "#" + [m2[1], m2[2], m2[3]].map(function (v) {
      var n = Number(v); return (n < 16 ? "0" : "") + n.toString(16);
    }).join("");
    delete out[h];
  }
  return out;
}

function drukuj(src, pdf) {
  var r = cp.spawnSync(chrome, [
    "--headless", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
    "--print-to-pdf=" + pdf, "file://" + src
  ], { encoding: "utf8", timeout: 120000 });
  if (!fs.existsSync(pdf)) {
    console.error("BŁĄD: przeglądarka nie wyprodukowała " + pdf);
    console.error("     " + String(r.stderr || "").split("\n")[0]);
    process.exit(2);
  }
  return pdf;
}

/* Rozpakowanie wszystkich strumieni treści. Strumień, który nie jest skompresowany
   algorytmem Flate, bierzemy jak leży — nie zgadujemy filtra. */
function tresc(pdf) {
  var s = fs.readFileSync(pdf).toString("latin1");
  var out = "", re = /stream\r?\n/g, m;
  while ((m = re.exec(s))) {
    var a = m.index + m[0].length, b = s.indexOf("endstream", a);
    if (b === -1) continue;
    var raw = s.slice(a, b);
    try { out += zlib.inflateSync(Buffer.from(raw, "latin1")).toString("latin1"); }
    catch (e) { out += raw; }
  }
  return { strumien: out, stron: (s.match(/\/Type\s*\/Page[^s]/g) || []).length };
}

function hex(c) {
  return "#" + c.split(" ").map(function (v) {
    var n = Math.round(parseFloat(v) * 255);
    return (n < 16 ? "0" : "") + n.toString(16);
  }).join("");
}
function kolory(t) {
  return (t.match(/[\d.]+ [\d.]+ [\d.]+ rg\b/g) || []).map(function (x) {
    return hex(x.replace(/ rg$/, ""));
  });
}
/* Wartości z ciemnej palety, które przedostały się na wydruk. Nazwa tokenu jest w wyniku,
   bo „#151b22 na wydruku" nie mówi nikomu, której reguły szukać. */
function przecieki(t, ciemne) {
  var out = {};
  kolory(t).forEach(function (h) { if (ciemne[h]) out[h] = ciemne[h]; });
  return Object.keys(out).map(function (h) { return "--" + out[h] + " (" + h + ")"; });
}
function glify(t) {
  var n = 0, re = /<([0-9A-Fa-f]+)>\s*Tj/g, m;
  while ((m = re.exec(t))) n += m[1].length / 4;
  return n;
}
var bad = 0;
function ok(nazwa, warunek, szczegol) {
  if (warunek) { console.log("  ok   " + nazwa); }
  else { console.log("  FAIL " + nazwa + (szczegol ? "  -> " + szczegol : "")); bad++; }
}

PAGES.forEach(function (file) {
  console.log("");
  console.log(file + ":");
  var nazwa = path.basename(file);
  var zrodlo;
  try {
    zrodlo = fs.readFileSync(path.resolve(root, file), "utf8");
  } catch (e) {
    /* Kod 2: „nie zmierzyłem" to inna wiadomość niż „zmierzyłem i jest źle". Ślad stosu
       z node:fs nazywa wnętrze biblioteki zamiast kroku, który nie dostarczył pliku. */
    console.error("BŁĄD: nie mogę odczytać " + file + " — " + e.message);
    console.error("     Wydruk mierzy się na stronie; bez niej nie ma czego wydrukować.");
    process.exit(2);
  }
  var ciemne = ciemnaPaleta(zrodlo);
  var A = tresc(drukuj(przygotuj(file, "a-ciemny", "dark", false), path.join(tmp, "a-" + nazwa + ".pdf")));
  var B = tresc(drukuj(przygotuj(file, "b-jasny", "light", false), path.join(tmp, "b-" + nazwa + ".pdf")));
  var C = tresc(drukuj(przygotuj(file, "c-kontrola", "dark", true), path.join(tmp, "c-" + nazwa + ".pdf")));

  var ka = kolory(A.strumien), kb = kolory(B.strumien);
  var zbiorA = ka.slice().sort().join(","), zbiorB = kb.slice().sort().join(",");
  ok("wydruk nie zależy od motywu ekranowego (" + ka.length + " operatorów koloru)",
     zbiorA === zbiorB,
     zbiorA === zbiorB ? "" : "ciemny ma " + ka.length + ", jasny " + kb.length);

  var pa = przecieki(A.strumien, ciemne);
  ok("żadna wartość z ciemnej palety nie dotarła na papier", pa.length === 0,
     pa.slice(0, 5).join(", "));

  var pc = przecieki(C.strumien, ciemne);
  ok("KONTROLA: bez reguł druku te wartości SĄ, czyli zdanie wyżej cokolwiek mierzy",
     pc.length > 0, "przecieków w kontroli: " + pc.length);

  var ga = glify(A.strumien), gc = glify(C.strumien);
  ok("sterowanie zniknęło z papieru (" + ga + " glifów wobec " + gc + " w kontroli)",
     ga < gc, ga + " >= " + gc);

  console.log("     stron: " + A.stron + " (kontrola: " + C.stron + ")");
});

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

console.log("");
if (bad) {
  console.log("Razem " + bad + " zastrzeżeń do wydruku.");
  process.exit(1);
}
console.log("OK   wydruk niezależny od motywu ekranowego, bez wartości z ciemnej palety");
process.exit(0);
