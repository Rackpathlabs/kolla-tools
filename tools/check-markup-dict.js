#!/usr/bin/env node
/* KRYTERIUM RÓWNOŚCI: tekst domyślny w markupie === wpis w słowniku.
 *
 * POWÓD ISTNIENIA (ADR-002, opcja B). Do 2026-08-19 element niosący klucz był w źródle
 * PUSTY, a tekst pojawiał się wyłącznie wtedy, gdy applier się wykonał. #59 pokazał,
 * ile to kosztuje: pięćdziesiąt podstawień renderowało się pusto przez trzynaście
 * godzin i czterdzieści pięć minut na opublikowanym serwisie, a czterej strażnicy byli
 * zieloni, każdy z innego i poprawnego powodu.
 *
 * Opcja B zamienia awarię, przed którą trzeba strzec, w stan, który nie ma jak zajść:
 * brak appliera nie usuwa tekstu, bo tekst stoi w markupie. Cena jest jedna — dwa
 * miejsca na ten sam napis — i jest to cena SPRAWDZALNA RÓWNOŚCIĄ dwóch napisów
 * leżących obok siebie w plikach. Bez przeglądarki, bez scenariuszy, bez pojęcia
 * „ścieżka, którą przejedzie". To jest jedyny strażnik w tym repozytorium, który nie
 * zależy od pokrycia.
 *
 * TEN PLIK POWSTAŁ CZERWONY, zanim wypełniono pierwszy element — warunek kolejności
 * postawiony przy akceptacji ADR-002 i ta sama zasada, dla której check-literals.js
 * powstał czerwony przed migracją, którą prowadził. Trzy mierniki w tym repozytorium
 * powstały PO pracy i każdy ją potwierdził zamiast sprawdzić.
 *
 * ============================================================================
 * CZTERY ROZSTRZYGNIĘCIA Z ADR-002 — wersja operacyjna. Dokument jest plikiem
 * roboczym i nie jest wersjonowany; to miejsce jest.
 *
 * 1. NORMALIZACJA. Ciągi białych znaków (w tym złamania linii i wcięcia) zwijamy
 *    do jednej spacji i przycinamy — PO OBU STRONACH. Tekst w markupie bywa zawinięty
 *    na trzy linie z wcięciem, wpis w słowniku jest jedną linią; bez tej reguły
 *    strażnik byłby czerwony na wszystkim od pierwszego dnia.
 *
 *    ENCJI NIE DEKODUJEMY. Mają być zapisane tak samo po obu stronach. Dekodowanie
 *    to druga warstwa interpretacji, w której rozjazd może się schować — a cała
 *    wartość tego strażnika bierze się z porównywania dwóch napisów bez niczyjej
 *    interpretacji. Świadoma strata: podwójna spacja w środku zdania przestaje być
 *    rozróżnialna.
 *
 * 2. ATRYBUTY OD PIERWSZEGO DNIA. Wszystkie cztery formy, nie sama treść elementu.
 *    Objęcie samej treści stworzyłoby drugą, cichszą klasę tekstu poza kontrolą —
 *    dokładnie tę, od której zaczęła się ta rodzina awarii.
 *
 * 3. KLUCZE SIEROCE. Napisy budowane w JS nie mają elementu w markupie, więc to
 *    kryterium NIE MA JAK ich zobaczyć. Strażnik ich nie zwalnia i nie udaje, że je
 *    sprawdza: RAPORTUJE ich liczbę i pilnuje, żeby nie rosła. Nazwa mówi „markup"
 *    i zakres ma się zgadzać z nazwą. Zostają domeną check-i18n-apply.js (czy klucz
 *    PRODUKUJE tekst) i check-dictionary.js (czy tekst z ekranu jest pokryty).
 *
 * 4. KIERUNEK BŁĘDU. Źródłem prawdy jest SŁOWNIK. Rozjazd naprawia się przepisaniem
 *    markupu, nigdy odwrotnie. Słownik jest jedynym miejscem, w którym widać wszystkie
 *    komunikaty naraz, i jest blokiem synchronizowanym z JEDNEGO pliku źródłowego,
 *    podczas gdy markup to trzy kopie strony.
 * ============================================================================
 *
 * TRZY KATEGORIE WYNIKU, bo znaczą co innego i mylenie ich kosztowałoby najwięcej:
 *
 *   PUSTY    element niesie klucz i nie niesie tekstu. Stan sprzed migracji.
 *   ROZJAZD  obie strony niosą tekst i są różne. Kategoria NOWA, wprowadzona tą
 *            decyzją, i ostrzejsza od pustego: pusty widać na ekranie bez JS,
 *            rozjazd nie widać nigdzie, dopóki ktoś nie porówna.
 *   OK       równe po normalizacji.
 *
 * Użycie:
 *     node tools/check-markup-dict.js                  # generator, walidator, hub
 *     node tools/check-markup-dict.js <plik.html> …    # fixtura
 */

var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var FILES = process.argv.length > 2
  ? process.argv.slice(2)
  : ["generator.html", "validator.html", "index.html"];

/* Te same cztery formy co w check-i18n-apply.js i z tego samego powodu: lista jest
   DEFINICJĄ kategorii, a nie wyliczeniem tego, co akurat występuje. Piąta forma
   dopisana bez dopisania jej tutaj przestanie być widziana — i to jest jedyny sposób,
   w jaki ten strażnik może przestać patrzeć. Patrz #69: applier stoi w trzech kopiach,
   więc forma to dziś zmiana w czterech miejscach. */
var FORMS = [
  { attr: "data-i18n",       sink: "treść elementu" },
  { attr: "data-i18n-ph",    sink: "placeholder" },
  { attr: "data-i18n-title", sink: "title" },
  { attr: "data-i18n-label", sink: "aria-label" }
];
var ATTR_SINK = { "data-i18n-ph": "placeholder", "data-i18n-title": "title",
                  "data-i18n-label": "aria-label" };

/* Reguła 1. */
function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }

/* SEKWENCJE UCIECZKI DEKODUJEMY, i to nie jest szczegół.
   Pierwsza wersja rozwijała wyłącznie \\" i przez to wpis niosący \\n dawała jako
   dwa znaki: odwrotny ukośnik i literę. Skutek był PODWÓJNIE niewidoczny — filler
   wpisał do atrybutu literalne „\\n", a strażnik porównał je z tym samym literalnym
   „\\n" i zapalił zielone. Obie strony były zgodne co do napisu, którego przeglądarka
   nigdy nie zobaczy: w czasie wykonania T() zwraca PRAWDZIWE złamanie linii.

   Złapało to dopiero check-english.js, raportując słowa „n", „nctrl", „npaste" —
   czyli kontrola pytająca o co innego. Strażnik równości, który dekoduje inaczej niż
   silnik JavaScriptu, porównuje własną interpretację ze swoją własną interpretacją
   i przechodzi zawsze. */
function unescapeJs(t) {
  return String(t).replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, function (whole, e) {
    if (e.charAt(0) === "u") return String.fromCharCode(parseInt(e.slice(1), 16));
    if (e.charAt(0) === "x") return String.fromCharCode(parseInt(e.slice(1), 16));
    if (e === "n") return "\n";
    if (e === "t") return "\t";
    if (e === "r") return "\r";
    return e;
  });
}

/* ---- słownik: źródło prawdy ------------------------------------------------ */
/* Czytany z i18n.js, nie z kopii w HTML. Kopie pilnuje check-blocks.sh; gdyby ten
   strażnik czytał kopię, rozjazd bloku uczyniłby go zielonym na złej podstawie. */
function dictionary() {
  var s = fs.readFileSync(path.join(root, "i18n.js"), "utf8");
  var dict = Object.create(null), m;
  var re = /"([\w.]+)"\s*:\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)/g;
  while ((m = re.exec(s))) {
    dict[m[1]] = unescapeJs(m[2].replace(/"\s*\+\s*"/g, "").replace(/^"|"\s*$/g, ""));
  }
  return dict;
}

/* ---- treść elementu --------------------------------------------------------
   Znajdujemy znacznik otwierający, z niego nazwę, i domykamy PO NAZWIE z licznikiem
   zagnieżdżeń. Naiwne "do pierwszego </" gubi się na <p>…<p> wewnątrz, a naiwne
   "do ostatniego" połyka pół dokumentu. Fixtura z zagnieżdżonym znacznikiem tej samej
   nazwy pilnuje obu pomyłek naraz. */
var VOID = { input: 1, img: 1, br: 1, hr: 1, meta: 1, link: 1, source: 1, area: 1 };

function innerOf(html, attrAt) {
  var open = html.lastIndexOf("<", attrAt);
  if (open === -1) return null;
  var nm = /^<([a-zA-Z][\w-]*)/.exec(html.slice(open, open + 40));
  if (!nm) return null;
  var tag = nm[1].toLowerCase();
  if (VOID[tag]) return null;
  var gt = html.indexOf(">", attrAt);
  if (gt === -1) return null;
  if (html.charAt(gt - 1) === "/") return null;   /* <span … /> */

  var openRe = new RegExp("<" + tag + "(?=[\\s/>])", "gi");
  var closeRe = new RegExp("</" + tag + "\\s*>", "gi");
  var depth = 1, i = gt + 1;
  while (i < html.length) {
    openRe.lastIndex = i; closeRe.lastIndex = i;
    var o = openRe.exec(html), c = closeRe.exec(html);
    if (!c) return null;
    if (o && o.index < c.index) { depth++; i = o.index + 1; continue; }
    depth--;
    if (!depth) return html.slice(gt + 1, c.index);
    i = c.index + 1;
  }
  return null;
}

function attrValue(html, attrAt, name) {
  var gt = html.indexOf(">", attrAt);
  var open = html.lastIndexOf("<", attrAt);
  if (gt === -1 || open === -1) return null;
  var tagText = html.slice(open, gt + 1);
  var m = new RegExp("[\\s\"'](" + name + ')\\s*=\\s*"([^"]*)"').exec(tagText);
  return m ? m[2] : null;
}

/* ---- pomiar ---------------------------------------------------------------- */
var DICT = dictionary();
var empty = [], drift = [], ok = 0, anchored = Object.create(null);

FILES.forEach(function (file) {
  var html = fs.readFileSync(path.join(root, file), "utf8");
  FORMS.forEach(function (form) {
    var re = new RegExp("\\s(" + form.attr + ')="([^"]*)"', "g"), m;
    while ((m = re.exec(html))) {
      var key = m[2];
      anchored[key] = 1;
      var want = DICT[key];
      if (want === undefined) continue;   /* klucz spoza słownika to check-i18n.js */
      var got = form.attr === "data-i18n"
        ? innerOf(html, m.index + 1)
        : attrValue(html, m.index + 1, ATTR_SINK[form.attr]);
      var line = html.slice(0, m.index).split("\n").length;
      var where = file + ":" + line + "  " + key + " -> " + form.sink;
      if (got === null || norm(got) === "") { empty.push({ where: where, want: want }); continue; }
      if (norm(got) !== norm(want)) { drift.push({ where: where, want: want, got: got }); continue; }
      ok++;
    }
  });
});

/* Rozstrzygnięcie 3: liczba, nie milczenie. */
var orphan = Object.keys(DICT).filter(function (k) { return !anchored[k]; });

/* PRÓG, nie cel — i pilnowany tylko na PEŁNYM zestawie plików, bo na fixturze liczba
   sieroctwa mówi o fixturze, nie o produkcie.

   123, zmierzone 2026-08-19 przy migracji z ADR-002. Tyle kluczy słownika nie ma
   kotwicy w markupie, bo ich tekst jest składany w JS. Ta liczba NIE MA ROSNĄĆ:
   nowy klucz bez elementu to nowy tekst poza zasięgiem kryterium równości, a jego
   jedynym strażnikiem zostają wtedy kontrole zależne od pokrycia scenariuszami.
   Spadek jest dobrym znakiem i wtedy próg się obniża. */
var ORPHAN_BASELINE = 123;
var FULL_RUN = process.argv.length <= 2;

console.log("podstawień z kluczem w słowniku: " + (ok + empty.length + drift.length) +
            "   równych: " + ok + "   PUSTYCH: " + empty.length + "   ROZJAZDÓW: " + drift.length);
console.log("kluczy słownika bez kotwicy w markupie (budowane w JS): " + orphan.length +
            "   — poza zakresem tego kryterium, patrz nagłówek, punkt 3");

if (drift.length) {
  console.log("\nFAIL ROZJAZD markup/słownik, " + drift.length + " razy." +
              "  ŹRÓDŁEM PRAWDY JEST SŁOWNIK — popraw markup, nie i18n.js:");
  drift.forEach(function (d) {
    console.log("  " + d.where);
    console.log("      słownik: " + JSON.stringify(norm(d.want).slice(0, 100)));
    console.log("      markup:  " + JSON.stringify(norm(d.got).slice(0, 100)));
  });
}
if (empty.length) {
  console.log("\nFAIL PUSTY element z kluczem, " + empty.length + " razy — tekst domyślny" +
              " ma stać w markupie (ADR-002, opcja B):");
  empty.slice(0, 12).forEach(function (e) {
    console.log("  " + e.where);
    console.log("      wstaw: " + JSON.stringify(norm(e.want).slice(0, 100)));
  });
  if (empty.length > 12) console.log("  ... i " + (empty.length - 12) + " dalszych");
}
if (FULL_RUN && orphan.length > ORPHAN_BASELINE) {
  console.log("\nFAIL kluczy bez kotwicy w markupie: " + orphan.length + " wobec progu " +
              ORPHAN_BASELINE + ". Nowy klucz ma dostać element z tekstem domyślnym," +
              " inaczej rośnie tekst poza zasięgiem kryterium równości.");
  console.log("  nowe: " + orphan.slice(-(orphan.length - ORPHAN_BASELINE)).join(", "));
  process.exit(1);
}
if (drift.length || empty.length) process.exit(1);

console.log("\nOK   każdy tekst domyślny w markupie jest równy wpisowi słownika");
process.exit(0);
