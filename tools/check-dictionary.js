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

var EMPTY_SEGMENTS = 0;

function corpus() {
  var s = fs.readFileSync(path.join(root, "i18n.js"), "utf8");
  var segs = [], m;
  var re = /"[\w.]+"\s*:\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)/g;
  while ((m = re.exec(s))) {
    var joined = m[1].replace(/"\s*\+\s*"/g, "").replace(/^"|"\s*$/g, "");
    /* Ciecie WYLACZNIE po wstawkach {…} i po kresce wariantow liczebnika.
       Wczesniej w tym wyrazeniu byla takze SPACJA, wiec korpus skladal sie
       z pojedynczych slow: 928 z 1824 segmentow mialo do czterech znakow,
       a najczestsze to "the", "and", "a", "is". Zdanie ze slownika nie mialo
       wtedy prawa sie dopasowac do niczego — kryterium bylo o wiele ZA OSTRE,
       dokladnie odwrotnie, niz podejrzewalismy po skoku liczby segmentow. */
    joined.replace(/<[^>]+>/g, " ").split(/\{[^}]*\}|\|/).forEach(function (seg) {
      seg = seg.replace(/\\"/g, '"').replace(/\s+/g, " ").trim();
      /* Pusty segment to ta sama pusta igla, wchodzaca DRUGA DROGA: nie
         z normalizacji napisu z ekranu, tylko z budowy korpusu. Wpis zlozony
         z samej wstawki ("{count}") po cieciu po {…} nie zostawia nic.
         Liczba odfiltrowanych jest raportowana, zeby drugie zrodlo tej awarii
         nie bylo niewidoczne. */
      var n = norm(seg);
      if (n) segs.push(n); else EMPTY_SEGMENTS++;
    });
  }
  return segs;
}

/* Fragment przechodzi, jesli wystepuje w segmencie jako ciag CALYCH slow —
   a segment krotszy niz prog pokrywa WYLACZNIE przez rownosc.
   Gwarancja konstrukcyjna zamiast pilnowania: nie trzeba wiedziec, skad biora
   sie krotkie segmenty, zeby przestaly byc grozne. "Clear" dalej pokrywa napis
   "Clear", ale "has" przestaje pokrywac "has 5 hosts". */
var MIN_CONTAIN = 4;
function wordsIn(hay, needle) {
  /* Pusta igla zawiesza petle NA ZAWSZE: hay.indexOf("", i + 1) przycina sie
     do dlugosci siana i nigdy nie zwraca -1. Igla robi sie pusta po normalizacji
     liczb — napis zlozony z samych cyfr, na przyklad numer linii w marginesie,
     redukuje sie do niczego. To zawiesilo pomiar na dziewiec minut. */
  if (!needle) return false;
  if (hay.length < MIN_CONTAIN) return hay === needle;
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
  /* DWIE ROZŁĄCZNE KATEGORIE DANYCH, nie jedna z szybszą ścieżką. Zmierzone:
     części wspólnej ZERO — 1003 zwolnień po jednej stronie, 95 po drugiej.
     Pierwsza to treść, którą wprowadził użytkownik, gdziekolwiek się pojawi:
     nazwa grupy z jego inventory w findingu albo w tabeli topologii. Druga to
     treść pliku, który wyprodukowało narzędzie — komentarze, klucze i wartości
     domyślne, których użytkownik nigdzie nie wpisał, więc pochodzenie nie ma
     prawa ich zwolnić. Obie są danymi i żadna nie jest przybliżeniem drugiej.
     Nazwa "szybsza ścieżka" obiecywała podzbiór i była szóstym przypadkiem
     nazwy węższej niż kod — złapanym, zanim zdążył kosztować. */
  { why: "dane użytkownika: treść wprowadzona do pól, gdziekolwiek się pojawi",
    test: function (f) { return f.fromInput === true; } },

  { why: "wytwór narzędzia: treść wygenerowanego pliku w podglądzie",
    test: function (f) { return f.inData === true; } },

  /* WARTOŚCI KONFIGURACJI to też dane. „rocky", „ubuntu", „eth0", „bond0",
     „yes" — literały Kolla-Ansible, których się nie tłumaczy. Nie mają ani _ ani
     kropki, więc nie są identyfikatorami według reguły niżej, a leżą poza podglądem.
     Bez tej kategorii trafiłyby na listę braków i najtańszym ruchem byłoby dopisanie
     ich po napisie — czyli to, czego ta lista ma nie zawierać. */
  /* Kategoria wrocila RAZEM Z PRZYPADKIEM, ktory ja uruchamia — tak, jak ustalilismy,
     ze wracaja usuniete wyjatki. Wczesniej nie zwalniala niczego, bo audyt nie siegal
     numerow linii w marginesie; po poprawieniu scenariuszy i normalizacji siega,
     a napis z samych cyfr nie jest tekstem interfejsu. */
  /* USUNIETA 2026-08-11, PRZYWROCONA 2026-08-11 — to nie jest niezdecydowanie,
     tylko dwie poprawne decyzje przy dwoch roznych stanach. Usunieta, bo nie
     zwalniala ANI JEDNEGO napisu: pusty wyjatek jest gorszy od pustej kontroli,
     bo wyglada na przemyslany. Przywrocona tego samego dnia, bo poprawione
     scenariusze i normalizacja liczb sprawily, ze audyt siega numerow linii
     w marginesie — kategoria wrocila RAZEM Z PRZYPADKIEM, ktory ja uruchamia. */
  { why: "liczby i interpunkcja: napis bez ani jednej litery",
    test: function (f) { return !/[A-Za-z\u0104-\u017c]/.test(f.text); } },

  /* PODZIAL PO FUNKCJI ATRYBUTU, nie po wygladzie tresci.
     aria-label, aria-description, title i alt z definicji standardu OPISUJA interfejs
     dla technologii asystujacych — nigdy nie niosą przykladowych wartosci, bo nie po to
     istnieja. Sa wiec zawsze interfejsem i NIE MA ich w zadnej kategorii zwalniajacej.
     Placeholder jest jedynym atrybutem ambiwalentnym: bywa podpowiedzia ("domyslnie
     adres VIP") i bywa przykladem wartosci (br-ex). Tylko tu potrzebna jest regula
     ksztaltu, i tylko tu jej ryzyko obowiazuje.

     Kontrprzyklad, ktory to ustawil: aria-label "Narzedzia" jest jednowyrazowy, wiec
     regula ksztaltu klasyfikowala go jako przyklad i zwolnilaby polski napis czytany
     na glos. Znikl jako problem nie przez obejscie, tylko dlatego, ze regula dla
     placeholderow nie ma prawa go dotyczyc. Przyneta pilnujaca tego siedzi w
     tools/smoke/guards.test.js i upadnie, gdyby ktos polaczyl te kategorie z powrotem. */
  { why: "przyklad wartosci w placeholderze: pojedynczy token konfiguracji",
    test: function (f) {
      return f.tag === "PLACEHOLDER" && /^[a-z][a-z0-9.:-]*$/.test(f.text);
    } },

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

/* Zwraca WSZYSTKIE pasujące kategorie, nie pierwszą.
   Zwolnienie jest alternatywą, a alternatywa jest przemienna — więc kolejność nigdy
   nie wpływała na WYNIK, tylko na ATRYBUCJĘ w raporcie: 721 napisów pasowało do
   więcej niż jednej kategorii, a licznik przypisywał je tej, która trafiła pierwsza.
   Statystyka "ta kategoria zwalnia 1003" znaczyła "tyle napisów do niej dotarło".
   Sprawdzone przed zmianą: żadna kategoria nie WYKLUCZA, wszystkie tylko zwalniają —
   gdyby któraś działała odwrotnie, przemienność by nie trzymała i kolejność byłaby
   definicją do zapisania, a nie artefaktem pętli do usunięcia. */
function excused(f) {
  var hit = [];
  for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].test(f)) hit.push(CATEGORIES[i]);
  return hit;
}

/* ---- pomiar ---------------------------------------------------------------- */
var report = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
var SEGS = corpus();
var SHORT = 4;

var total = 0, ok = 0, overlap = 0, byCategory = {}, miss = [], missShort = 0;
report.forEach(function (f) {
  var t = String(f.text).replace(/\s+/g, " ").trim();
  if (!t) return;
  total++;
  var cats = excused({ tag: f.tag, text: t, inData: f.inData, fromInput: f.fromInput });
  if (cats.length) {
    cats.forEach(function (c) { byCategory[c.why] = (byCategory[c.why] || 0) + 1; });
    if (cats.length > 1) overlap++;
    ok++;
    return;
  }
  var low = norm(t);
  for (var i = 0; i < SEGS.length; i++) {
    if (wordsIn(SEGS[i], low)) { ok++; return; }
  }
  if (t.length < SHORT) missShort++;
  miss.push(f);
});

/* PRÓG, nie cel. Nie ma być osiągnięte zero — ma nie wzrosnąć: KAŻDY NOWY tekst musi
   iść przez słownik, bo inaczej liczba rośnie i build pada. Istniejąca zaległość jest
   długiem opisanym liczbą, nie ukrytym, i ma własne zgłoszenie (#58).

   Czerwony strażnik na stałe zostaje zignorowany w tydzień i przestaje cokolwiek
   znaczyć — tracimy go wtedy także dla przyszłości. Próg chroni dokładnie to, co
   ma sens chronić dziś.

   461, zmierzone 2026-08-19 na main @ e19a77d, raportem z check-rendered.js --texts
   (13 scenariuszy). PODNIESIONE Z 444 i to nie jest naginanie miernika do wyniku —
   powód jest taki, że 444 i 461 liczą różne rzeczy:

     444  stan sprzed #70
     461  stan po #70, ten sam kontrkorpus po obu stronach
          z tego artefakt pomiaru:  18 -> 74
          faktyczny dług:          394 -> 387   (SPADŁ o siedem)

   Naprawa z #70 przywróciła podpowiedzi niosące znaczniki, a jednostką po stronie
   ekranu jest WŁASNY TEKST ELEMENTU, do którego treść dzieci nie wchodzi:

       wpis w słowniku:  "Empty inherits <code>network_interface</code>."
       korpus widzi:      empty inherits network_interface .
       ekran widzi:       Empty inherits .

   Miernik ukarał naprawę. Zostawienie 444 zapisałoby jako regres coś, co regresem
   nie jest — a strażnik czerwony z powodu, którego nikt nie zamierza usuwać, to
   dokładnie ten strażnik, którego akapit wyżej zabrania.

   Artefaktu (74 pozycje) NIE naprawiamy tutaj, choć jest defektem pomiaru, a nie
   długiem: jego naprawa przesądza wybór z ADR-002, który czeka na decyzję. Po tej
   decyzji ta liczba znowu przestanie być porównywalna — i ma to być ogłoszone
   PRZED pracą, nie po.

   ---------------------------------------------------------------------------
   488, zmierzone 2026-08-19 przy #10. Rozbite na składniki PRZED podniesieniem,
   bo próg podniesiony bez rozbicia jest progiem dopasowanym do wyniku:

       461   main @ a8bc25a, 13 scenariuszy
     + 5     reguła HOST-NO-KOLLA-GROUP, te same 13 scenariuszy
     + 22    czternasty scenariusz (host poza zasięgiem Kolli)
     = 488

   TE DWA SKŁADNIKI ZNACZĄ CO INNEGO i dlatego stoją osobno.

   +22 to NOWE POKRYCIE, nie nowy dług: scenariusz renderuje findingi, których tekst
   od dawna leżał w kodzie i nigdy nie był mierzony. Rosnąca liczba przy rosnącym
   pokryciu jest dobrym znakiem — martwiąca byłaby stała, o czym mówi nagłówek tego
   pliku. Gdyby scenariusz nie wszedł razem z regułą, jej komunikat byłby findingiem
   nieosiągalnym w rozumieniu #56.

   +5 to wyposażenie wiersza findingu z nowymi wartościami (kod reguły, odnośnik
   „inventory: line N", licznik „3 warnings") ORAZ sam komunikat reguły — który
   JEST w słowniku i mimo to jest liczony. To jest artefakt opisany wyżej, a nie
   dług: wpis „Host <code>{host}</code> is in no group…" tnie się po wstawce na
   segmenty „Host" i „is in no group…", a ekran pokazuje ich sklejenie bez treści
   dziecka. Żaden z trzech napisów nie równa się żadnemu segmentowi.

   Sprawdzone, nie założone: przeniesienie tekstu reguły z literału do słownika
   obniżyło licznik o 3 (491 -> 488), nie o 8. Reszta została po stronie artefaktu.

   ---------------------------------------------------------------------------
   530, zmierzone 2026-08-19 przy #9. Rozbite tak samo i z tym samym wnioskiem
   w odwrotną stronę:

       488   main @ 3df500b, 14 scenariuszy
     +  0    widok różnic (#9), te same 14 scenariuszy
     + 42    piętnasty scenariusz (widok różnic)
     = 530

   ZERO. Cała nowa warstwa interfejsu — przełącznik, zdanie o linii odniesienia,
   nagłówki zestawienia, etykieta „not emitted" — idzie przez słownik, więc licznik
   na niezmienionym zestawie scenariuszy nie drgnął. To jest dokładnie to zachowanie,
   którego ten próg pilnuje, i pierwszy raz, kiedy nowa funkcja go nie ruszyła.

   +42 to znowu NOWE POKRYCIE: piętnasty scenariusz renderuje tabelę zestawienia,
   a razem z nią całą warstwę findingów i podglądu, której tamten stan nie pokazywał. */
var BASELINE = 530;

console.log("segmentów w słowniku: " + SEGS.length +
            "   pustych odfiltrowanych: " + EMPTY_SEGMENTS);
console.log("widocznych napisów:   " + total + "   ze słownika lub wyjątku: " + ok +
            "   BEZ POKRYCIA: " + miss.length +
            "   (w tym krótsze niż " + SHORT + " znaki: " + missShort + ")");
console.log("napisów pasujących do WIĘCEJ NIŻ JEDNEJ kategorii: " + overlap +
            "   (sumy poniżej nakładają się i nie zsumują się do liczby zwolnionych)");
Object.keys(byCategory).forEach(function (k) {
  console.log("  wyjątek: " + byCategory[k] + "  " + k);
});
miss.slice(0, 30).forEach(function (f) {
  console.log("  BEZ POKRYCIA  <" + f.tag.toLowerCase() +
              (f.cls ? " class=\"" + String(f.cls).slice(0, 22) + "\"" : "") + ">  " +
              JSON.stringify(String(f.text).slice(0, 78)));
});
if (miss.length > 30) console.log("  ... i " + (miss.length - 30) + " dalszych");
if (miss.length > BASELINE) {
  console.log("\nFAIL " + miss.length + " wystąpień wobec progu " + BASELINE +
              " — nowy tekst musi iść przez słownik.");
  process.exit(1);
}
console.log("\nOK   " + miss.length + " wystąpień, próg " + BASELINE + " nieprzekroczony" +
            (miss.length < BASELINE ? "  (dług zmalał — obniż próg w tym pliku)" : ""));
process.exit(0);
