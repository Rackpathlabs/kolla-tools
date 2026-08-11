#!/usr/bin/env node
/* Kryterium: każdy widoczny napis pochodzi ze słownika.
 *
 * Zastępuje heurystykę zgadującą język, która zawiodła na dwa niezależne sposoby
 * naraz — lista słów funkcyjnych nie widziała polszczyzny bez diakrytyków
 * („Obraz bazowy", „wymagane", „Kopiuj"), a jeden przebieg nie dosięgał większości
 * komunikatów. Tu pytanie „czy to angielski?" pada RAZ, nad wpisami słownika, które
 * czyta człowiek — zamiast tysiąc razy nad fragmentami, przez wyrażenie regularne.
 *
 * Ten strażnik WYKRYWA: mierzy wyrenderowaną stronę, więc widzi to, co naprawdę
 * trafiło na ekran, ale wyłącznie na ścieżkach, którymi przejedzie. Uzupełnia go
 * check-literals.js, który ZAPOBIEGA. Patrz nagłówek tamtego pliku.
 *
 * Jednostką porównania jest TEKST ELEMENTU, nie pojedynczy węzeł tekstowy. Wpis
 * „Group <code>[{group}]</code> has {count}" rozpada się w DOM na „Group ", „[",
 * „]", „ has " — osobno są to ułamki krótsze niż jakiekolwiek sensowne porównanie,
 * a sklejone wracają do postaci, w której równość znów coś znaczy.
 *
 * PUNKT ODNIESIENIA — obie liczby, bo różnica między nimi jest całą informacją:
 *
 *     1 scenariusz na narzędzie:   40 bez pokrycia z  339 napisów
 *    13 scenariuszy:              348 bez pokrycia z 2587 napisów
 *
 * Wzrost nie jest regresem. Zaległość zawsze miała ten rozmiar — jeden render
 * widział jej dziewiątą część, bo nie dosięgał findingów, etykiet wag, odnośników
 * „linia N", statusów wydań ani trybu aktualizacji. Rosnąca liczba przy rosnącym
 * pokryciu jest dobrym znakiem; martwiąca byłaby STAŁA.
 *
 * Dopasowanie idzie po GRANICACH SŁÓW, nie po znakach: podciąg znakowy przepuszcza
 * krótkie napisy masowo („na" siedzi w „name", „do" w „domain", „za" w „zone"),
 * a po rozbiciu na węzły krótkie fragmenty to większość materiału.
 */

var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");

/* ---- korpus ze słownika ---------------------------------------------------- */
/* Wpisy niosą znaczniki i wstawki {name}. Tniemy na segmenty literalne: to one,
   a nie całe wpisy, pojawiają się na ekranie po podstawieniu. */
/* Liczby znikaja z OBU stron przed porownaniem.
   "5 hosts" i "0 hosts" sprowadzaja sie do "hosts", ktore w slowniku jest — a igla
   dluzsza od siana przestaje byc powodem falszywego braku. Nic to nie przepuszcza:
   "5 bledow" normalizuje sie do "bledow", ktorego w slowniku nie ma, wiec dalej jest
   niepokryte. Fixtura pilnuje obu polowek naraz, wiec poluzowanie kryterium nie jest
   wyjsciem — jedynym wyjsciem jest zrobic to poprawnie. */
function norm(t) {
  return String(t).replace(/[0-9]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function corpus() {
  var s = fs.readFileSync(path.join(root, "i18n.js"), "utf8");
  var segs = [], m;
  var re = /"[\w.]+"\s*:\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)/g;
  while ((m = re.exec(s))) {
    var joined = m[1].replace(/"\s*\+\s*"/g, "").replace(/^"|"\s*$/g, "");
    joined.replace(/<[^>]+>/g, " ").split(/\{[^}]*\}| |\|/).forEach(function (seg) {
      seg = seg.replace(/\\"/g, '"').replace(/\s+/g, " ").trim();
      if (seg) segs.push(norm(seg));
    });
  }
  return segs;
}

/* Fragment przechodzi, jeśli występuje w segmencie jako ciąg CAŁYCH słów. */
function wordsIn(hay, needle) {
  var i = hay.indexOf(needle);
  while (i !== -1) {
    var before = i === 0 || /[^\wąćęłńóśźż]/i.test(hay[i - 1]);
    var afterAt = i + needle.length;
    var after = afterAt === hay.length || /[^\wąćęłńóśźż]/i.test(hay[afterAt]);
    if (before && after) return true;
    i = hay.indexOf(needle, i + 1);
  }
  return false;
}

/* ---- kategorie strukturalne wyjątków --------------------------------------- */
/* Kategorie, nie napisy: wyjątek opisany kategorią da się przeczytać i ocenić,
   lista napisów rośnie o jeden przy każdym czerwonym przebiegu. */
var CATEGORIES = [
  /* DANE to treść podglądu wyrenderowanego pliku i edytora wejścia. Rozstrzyga
     PRZODEK, nie znacznik: przez trzy dni kategoria brzmiała „treść <code>/<span>"
     i zwalniała 1922 napisy, w tym „błąd", „wymagane" i „uwaga" — czyli dokładnie
     tę polszczyznę, której kryterium miało szukać. Lista znaczników nie da się
     obronić; zdanie o przodku tak. */
  { why: "dane: treść podglądu pliku i edytora wejścia",
    test: function (f) { return f.inData === true; } },

  /* WARTOŚCI KONFIGURACJI to też dane. „rocky", „ubuntu", „eth0", „bond0",
     „yes" — literały Kolla-Ansible, których się nie tłumaczy. Nie mają ani _ ani
     kropki, więc nie są identyfikatorami według reguły niżej, a leżą poza podglądem.
     Bez tej kategorii trafiłyby na listę braków i najtańszym ruchem byłoby dopisanie
     ich po napisie — czyli to, czego ta lista ma nie zawierać. */
  { why: "wartość konfiguracji: treść <option> i wartości kontrolek",
    test: function (f) { return f.tag === "OPTION"; } },

  /* IDENTYFIKATOR poznaje się po kształcie tokenu, nie po braku spacji: kryterium
     „bez spacji" zwalniało przyciski „Clear" i odnośniki „start". Klucz, nazwa pliku
     i nazwa interfejsu niosą podkreślenie, kropkę albo ukośnik; słowo interfejsu nie. */
  { why: "identyfikator: klucz, nazwa pliku, nazwa interfejsu",
    test: function (f) { return /^[A-Za-z_][\w./:-]*$/.test(f.text) && /[_./]/.test(f.text); } }

  /* Kategorii „brak liter" i „nazwa własna wydania" tu nie ma. Nie zwalniały ANI
     JEDNEGO napisu, więc nie mogły ani przejść, ani nie przejść — pusty wyjątek jest
     gorszy od pustej kontroli, bo wygląda na przemyślany. Wrócą razem z przypadkiem,
     który je uruchomi, nie zapobiegawczo. */
];

function excused(f) {
  for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].test(f)) return CATEGORIES[i];
  return null;
}

/* ---- pomiar ---------------------------------------------------------------- */
var report = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
var SEGS = corpus();
var SHORT = 4;

var total = 0, ok = 0, byCategory = {}, miss = [], missShort = 0;
report.forEach(function (f) {
  var t = String(f.text).replace(/\s+/g, " ").trim();
  if (!t) return;
  total++;
  var cat = excused({ tag: f.tag, text: t, inData: f.inData });
  if (cat) { byCategory[cat.why] = (byCategory[cat.why] || 0) + 1; ok++; return; }
  var low = norm(t);
  for (var i = 0; i < SEGS.length; i++) {
    if (wordsIn(SEGS[i], low)) { ok++; return; }
  }
  if (t.length < SHORT) missShort++;
  miss.push(f);
});

console.log("segmentów w słowniku: " + SEGS.length);
console.log("widocznych napisów:   " + total + "   ze słownika lub wyjątku: " + ok +
            "   BEZ POKRYCIA: " + miss.length +
            "   (w tym krótsze niż " + SHORT + " znaki: " + missShort + ")");
Object.keys(byCategory).forEach(function (k) {
  console.log("  wyjątek: " + byCategory[k] + "  " + k);
});
miss.slice(0, 30).forEach(function (f) {
  console.log("  BEZ POKRYCIA  <" + f.tag.toLowerCase() +
              (f.cls ? " class=\"" + String(f.cls).slice(0, 22) + "\"" : "") + ">  " +
              JSON.stringify(String(f.text).slice(0, 78)));
});
if (miss.length > 30) console.log("  ... i " + (miss.length - 30) + " dalszych");
process.exit(miss.length ? 1 : 0);
