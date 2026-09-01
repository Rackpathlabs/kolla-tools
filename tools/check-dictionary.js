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

/* ---- rejestr kodów findingów, czytany ze źródła ---------------------------- */
/* Czytamy PLIKI NARZĘDZI, nie osobną listę — patrz uzasadnienie przy kategorii niżej.
   Gdy któregoś pliku nie ma (fixtura uruchamiana poza drzewem), rejestr jest po prostu
   uboższy; nie jest to awaria pomiaru, bo kategoria tylko ZWALNIA i jej milczenie
   przesuwa wynik w stronę ostrzejszą, a nie łagodniejszą. */
function codeRegistry() {
  var out = Object.create(null);
  ["generator.html", "validator.html", "index.html"].forEach(function (file) {
    var p = path.join(root, file), src;
    try { src = fs.readFileSync(p, "utf8"); } catch (e) { return; }
    var pats = [
      /* Pierwszy argument bywa ZMIENNĄ — add(sev, "MISSING-GROUP", …) — więc wzorzec nie
         może wymagać literału wagi. Wymaga natomiast, żeby drugi argument był literałem,
         bo to on jest kodem. */
      /\badd\(\s*[^,()]+,\s*"([A-Z][A-Z0-9-]*)"/g,
      /\bcode:\s*"([A-Z][A-Z0-9-]*)"/g,
      /\bid:\s*"([A-Z][A-Z0-9-]*)"/g,
      /"([A-Z][A-Z0-9-]*)"\s*:\s*"/g,
      /* PIĄTE ŹRÓDŁO: literał WERSALIKAMI Z MYŚLNIKIEM, gdziekolwiek w źródle narzędzia.
         Potrzebne, bo dwa kody nie istnieją w źródle jako całość — powstają jako
         `base + "-RETIRED"` — a ich BAZA („UPGRADE-GROUP", „UPGRADE-KEY") jest zwykłym
         literałem przypisanym do zmiennej i żaden z czterech wzorców wyżej jej nie widzi.

         Sprawdzone przed dopisaniem, a nie założone: ten wzorzec zbiera ze wszystkich
         trzech plików 108 napisów i WSZYSTKIE są kodami findingów albo identyfikatorami
         reguł. Ani jeden nie jest tekstem interfejsu — narzędzie nie pisze literałów
         wersalikami z myślnikiem do niczego innego. Gdyby kiedyś zaczęło, ta kategoria
         zwolniłaby tekst i przynęta w fixturze tego nie złapie, bo przynęta pilnuje
         napisu SPOZA źródła. Zapisane jako granica, nie jako przeoczenie. */
      /"([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)"/g
    ];
    var diag = src.indexOf("DIAG_IDS");
    pats.forEach(function (re, i) {
      /* Czwarty wzorzec — klucz obiektu — jest ZAWĘŻONY DO BLOKU DIAG_IDS, bo poza nim
         „KLUCZ": "wartość" trafia też w zwykły słownik i zwalniałby cokolwiek pisanego
         wersalikami. Zakres kategorii ma być wąski tam, gdzie wzorzec jest szeroki. */
      var hay = i === 3 ? (diag === -1 ? "" : src.slice(diag, diag + 6000)) : src;
      var m;
      re.lastIndex = 0;
      while ((m = re.exec(hay))) out[m[1]] = true;
    });
  });
  return out;
}
var CODES = codeRegistry();

/* KOD SKŁADANY Z BAZY. Dwa kody nie istnieją w źródle jako całe napisy, bo powstają
   w czasie działania: `base + "-RETIRED"`, gdzie base to "UPGRADE-GROUP" albo
   "UPGRADE-KEY". Rejestr czytany ze źródła nie może ich zobaczyć — z konstrukcji, nie
   z niedopatrzenia. Zwalniamy więc także napis, którego PRZEDROSTEK ograniczony myślnikiem
   jest członkiem rejestru.

   To NIE poszerza kategorii na przypadkowe napisy: podział idzie po myślnikach, więc
   „OUTSIDE-GROUPZ" ma przedrostki „OUTSIDE" i „OUTSIDE-GROUPZ", z których żaden nie jest
   w rejestrze — a „OUTSIDE-GROUP" jest, ale nim nie jest. Przynęta w fixturze pilnuje
   dokładnie tej różnicy. */
function inRegistry(t) {
  if (CODES[t] === true) return true;
  var parts = String(t).split("-");
  for (var i = 1; i < parts.length; i++) {
    if (CODES[parts.slice(0, i).join("-")] === true) return true;
  }
  return false;
}

/* DWIE POSTACI KAŻDEGO WPISU, bo ekran ma dwie i jedna z nich była niewidzialna.

   Jednostką po stronie ekranu jest WŁASNY TEKST ELEMENTU — treść elementów-dzieci do niego
   nie wchodzi (uzasadnienie w nagłówku). Wpis „Host <code>{host}</code> is in no group…"
   ma więc na ekranie postać „Host is in no group…", jeden napis, i NIE pojawia się w niej
   ani „host", ani nic z wnętrza <code>.

   Korpus zamieniał znacznik na spację i zostawiał treść dziecka, przez co ten sam wpis dawał
   segmenty „Host " oraz „ is in no group…", a napis z ekranu był dłuższy od obu. Zmierzone
   na main 2026-09-01: 90 wystąpień w 20 różnych napisach raportowanych jako niepokryte,
   mimo że pochodziły ze słownika. ADR-002 przewidywał, że klasa zniknie sama przy opcji B;
   nie zniknęła i nie mogła, bo to wada MIERNIKA, nie stan tekstu.

   KEEP  treść dzieci zostaje — postać, w której element nie ma dzieci albo ma je puste
   DROP  treść dzieci znika razem ze znacznikiem — postać „własny tekst elementu"

   To jest DOŁOŻENIE, nie podmiana: wpis bez dzieci pokrywa dalej przez postać KEEP,
   a poluzowaniem nie jest, bo obie postaci pochodzą z tego samego wpisu słownika i żaden
   napis spoza słownika nie staje się przez to pokryty. Fixtura report-child-text.json
   pilnuje wszystkich trzech zdań naraz. */
var KEEP = /<[^>]+>/g;
var DROP = /<[^>]+>[^<]*<\/[^>]+>|<[^>]+>/g;

function corpus(stripTags) {
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
    joined.replace(stripTags, " ").split(/\{[^}]*\}|\|/).forEach(function (seg) {
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
    test: function (f) { return /^[A-Za-z_][\w./:-]*$/.test(f.text) && /[_./]/.test(f.text); } },

  /* ---- TRZY KATEGORIE DANYCH, dodane 2026-09-01 (#86) ----
     Zmierzone na main: 15 + 10 + 8 = 33 różne napisy liczone jako dług tekstowy, z których
     żaden nie jest tekstem interfejsu. Kod findingu nie jest zdaniem, nazwa hosta nie ma
     języka, a treść <code> to składnia i wartości konfiguracji. Żadna z kategorii wyżej
     ich nie łapie: kody mają myślniki, więc nie przechodzą reguły identyfikatora, a lista
     hostów sklejona przecinkami nie występuje DOSŁOWNIE w tym, co użytkownik wpisał, więc
     kryterium pochodzenia jej nie widzi.

     Wszystkie trzy idą po KSZTAŁCIE, nie po liście napisów — lista rośnie o jeden przy
     każdym czerwonym przebiegu, kształt nie. */

  /* KOD FINDINGU — przez PRZYNALEŻNOŚĆ DO REJESTRU, nie przez wzorzec.

     Pierwsza wersja pytała o kształt: wielkie litery i co najmniej jeden myślnik. Myślnik
     był tam po to, żeby nie zwalniać pojedynczego słowa pisanego wersalikami — i przez to
     przepuszczała RANGE oraz TYPO, które są prawdziwymi kodami findingów. Przemianowanie
     ich odpada: #26 wymaga stabilnych identyfikatorów, bo kod findingu jest tym, co ludzie
     cytują w zgłoszeniach.

     DLACZEGO TO NIE JEST ZŁAMANIE ZASADY „KSZTAŁT, NIE LISTA". Zasada jest o listach
     UTRZYMYWANYCH RĘCZNIE — takich, które rosną o jeden przy każdym czerwonym przebiegu
     i starzeją się w ciszy, bo nikt nie pamięta ich zaktualizować. Ta lista nie istnieje
     jako plik: jest ODCZYTYWANA ZE ŹRÓDŁA PRAWDY przy każdym przebiegu. Kod dopisany do
     narzędzia zwalnia się sam, kod usunięty przestaje zwalniać w tym samym commicie,
     a napisu nie da się do niej dopisać inaczej niż zgłaszając nim finding.

     Trzy konstrukcje, bo tyle ich jest w kodzie i żadna nie jest ważniejsza od pozostałych:
       DIAG_IDS: { "KOD": "opis" }        generator, tabela identyfikatorów
       add("error", "KOD", …)             walidator, zgłoszenie findingu
       { sev: …, code: "KOD" }            walidator, tabele rodzin reguł
       { id: "KOD", level: …}             generator, diagnostyka

     PRZYNĘTA pilnująca, żeby to nie wróciło po cichu do wzorca: napis o kształcie kodu,
     ale spoza rejestru, ma NIE być zwolniony (tools/fixtures/report-shapes.json). */
  { why: "kod findingu: identyfikator z rejestru narzędzia, nie proza",
    test: function (f) { return inRegistry(f.text); } },

  /* TREŚĆ <code>. Składnia i wartości konfiguracji: name[01:10], key=value, eth0.

     GRANICA, NAZWANA TUTAJ, A NIE ODKRYTA PRZY AWARII: polski tekst wewnątrz <code>
     PRZEJDZIE. Zwolnienie jest zdaniem o ELEMENCIE, a element nie ma zdania o języku
     swojej treści — i to jest cena za to, że kryterium nie jest listą napisów. Przypięte
     asercją, która upadnie, gdyby ktoś zaczął to łapać: wtedy granica się przesunęła
     i ten akapit jest nieprawdziwy. */
  { why: "treść <code>: składnia i wartości konfiguracji",
    test: function (f) { return f.tag === "CODE"; } },

  /* LISTA HOSTÓW. Zwalnia ELEMENT, nie wzorzec przecinków — „hosts, groups" jest zdaniem
     interfejsu i ma pozostać liczone. Nazwa klasy jest tu kształtem: to narzędzie samo
     oznacza w markupie miejsce, w którym renderuje dane użytkownika po obróbce.
     docs/PRINCIPLES.md mówi, że napis jest danymi, gdy występuje DOSŁOWNIE w tym, co
     wpisano — sklejka przecinkiem już nie występuje, i tę lukę ta kategoria zamyka
     strukturą zamiast rozluźnianiem tamtej reguły. */
  { why: "lista hostów: dane użytkownika po obróbce, w elemencie oznaczonym jako lista",
    test: function (f) {
      return /(^|\s)hostlist(\s|$)/.test(String(f.cls || ""));
    } }

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
/* Ten strażnik nie renderuje niczego sam — mierzy raport z POPRZEDNIEGO kroku runnera.
   Brak raportu jest więc awarią tamtego kroku, nie tego, i komunikat ma prowadzić tam:
   nazywa plik, nazywa producenta i mówi, że kontrola nie odbyła się wcale.

   Kod wyjścia 2, nie 1, i to jest cała różnica. 1 znaczy „zmierzyłem i próg został
   przekroczony"; 2 znaczy „nie zmierzyłem". Zlane w jedno wyglądają w logu CI tak samo,
   a wtedy pominięta kontrola czyta się jak wykonana — trzeci wariant pustego zielonego
   z docs/PRINCIPLES.md, oglądany od strony czerwonej. check-rendered.js robi to samo
   rozróżnienie tym samym kodem przy braku przeglądarki; tools/golden/snapshot.golden.js,
   drugi konsument tego samego pliku, dostał je razem z tą zmianą.

   Ślad stosu z readFileSync był gorszy niż nic: nazywał wnętrze strażnika i numer linii
   w node:fs, czyli wysyłał czytelnika dokładnie tam, gdzie nic nie jest zepsute. */
var reportPath = process.argv[2];
if (!reportPath || !fs.existsSync(reportPath)) {
  console.error("FAIL brak raportu o widocznym tekście: " +
                (reportPath || "(nie podano ścieżki)"));
  console.error("     Produkuje go check-rendered.js --texts <plik>, krok wcześniej " +
                "w tools/run-tests.sh.");
  console.error("     Kontrola pokrycia słownikiem NIE jest pomijana po cichu: bez " +
                "korpusu nie ma czego");
  console.error("     mierzyć, a pusty korpus wygląda dokładnie tak samo jak " +
                "wszystko pokryte.");
  process.exit(2);
}
var report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
var SEGS = corpus(KEEP);
var SEGS_OWN = corpus(DROP);
var SHORT = 4;

var total = 0, ok = 0, overlap = 0, byCategory = {}, miss = [], missShort = 0;
report.forEach(function (f) {
  var t = String(f.text).replace(/\s+/g, " ").trim();
  if (!t) return;
  total++;
  /* cls DOCHODZI do zestawu pól przekazywanych kategoriom. Kategoria listy hostów pyta
     o klasę elementu, a nie o kształt treści — i bez tego pola milczała, przechodząc
     fixturę na zielono z powodu, którego nie było. Złapane fixturą przy wprowadzaniu. */
  var cats = excused({ tag: f.tag, cls: f.cls, text: t,
                       inData: f.inData, fromInput: f.fromInput });
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
  for (var j = 0; j < SEGS_OWN.length; j++) {
    if (wordsIn(SEGS_OWN[j], low)) { ok++; return; }
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
/* ===========================================================================
   ZASADA ZMIANY TEGO PROGU — pełna wersja w CLAUDE.md, sekcja
   „A ratchet threshold may only fall". Tu jest to, co musi przeczytać ktoś,
   kto właśnie chce podnieść tę liczbę:

     PODNIESIENIE, BO STRAŻNIK ZACZĄŁ WIDZIEĆ NOWĄ KLASĘ TEKSTU — wolno.
       Nowy scenariusz, nowe ujście, poszerzony zakres zbierania. Dług nie urósł,
       urósł przyrząd. Opis PR-a MUSI nieść rozbicie z arytmetyką.

     PODNIESIENIE, BO PRZYBYŁO NIEOKOTWICZONEGO TEKSTU — ZAKAZANE, bez wyjątków.
       PR schodzi do zera nowego długu albo nie wchodzi. Po to jest ten próg.

     DOCELOWO LICZBA MOŻE JUŻ TYLKO SPADAĆ. Gdy spadnie — obniż próg w tym samym
       PR-ze. Próg zostawiony nad pomiarem przestaje chronić odległość między nimi.

   Powód: w jednej sesji ta liczba przeszła 444 -> 461 -> 488 -> 530. Każdy krok
   był rozbity i każdy dało się obronić, a ciąg i tak czyta się jak próg, który
   podąża za kodem zamiast go ograniczać.

   ---------------------------------------------------------------------------
   JEDNOSTKĄ TEGO PROGU SĄ RÓŻNE NAPISY, NIE WYSTĄPIENIA (#86, zmienione 2026-09-01).

   Do tej zmiany próg liczył wystąpienia, a wystąpienia skalują się z LICZBĄ
   SCENARIUSZY, nie z ilością tekstu. Zmierzone na main tuż przed zmianą, na tym
   samym raporcie:

       530 wystąpień  =  138 różnych napisów
       jeden szablon „inventory: line N": 32 wystąpienia, 1 napis
       dwunasty scenariusz: +41 wystąpień, +0 napisów

   To nie była nieporządna liczba, tylko dziura w zasadzie powyżej: podniesienie
   wywołane samym dodaniem scenariusza przechodziło test jako „pokrycie nowej klasy
   tekstu", bo strażnik formalnie zaczynał widzieć więcej renderowań. Przy różnych
   napisach ten ruch nie istnieje — nowy scenariusz nie wnosi nowego napisu — więc
   zasada wraca do dwóch przypadków i zaczyna być prawdziwa.

   NORMALIZACJA, czyli co znaczy „ten sam napis". Kluczem jest wynik norm():

       białe znaki   ciągi zwijane do jednej spacji, końce obcinane
       wielkość liter  ignorowana
       liczby        USUWANE — „inventory: line 2" i „line 41" to JEDEN napis

   To NIE jest osobna definicja dobrana pod próg: to dokładnie ten napis, który
   strażnik porównuje ze słownikiem. Dwie pozycje, których kryterium pokrycia nie
   umie odróżnić, są jedną pozycją długu — i jedną poprawką, bo do słownika idzie
   jeden wpis z wstawką, nie czterdzieści.

   Usunięcie liczb jest tu decyzją, nie skutkiem ubocznym, i ma swój koszt: „5 hosts"
   i „7 hosts" byłyby jednym napisem także wtedy, gdyby były dwoma osobnymi wpisami.
   Koszt jest przyjęty, bo idzie w stronę zaniżania długu o pozycje, które i tak
   pokrywa jeden wpis ze wstawką, a odwrotny wybór przywracałby dokładnie tę
   zależność od scenariuszy, którą ta zmiana usuwa.
   =========================================================================== */
/* 138, zmierzone 2026-09-01 na main @ fec3d18 — ta sama liczba, którą #86 podaje jako
   138 różnych napisów w 530 wystąpieniach. Próg NIE został przeliczony ani zaokrąglony:
   to odczyt z tego samego przebiegu, na którym stało 530.

   Podstawialny z wiersza poleceń, żeby dało się pokazać, że kontrola potrafi upaść —
   ta sama konstrukcja co --dir w snapshot.golden.js i z tego samego powodu: dowód
   ma być testem, a nie czynnością wykonaną raz w dniu, w którym próg powstawał. */
/* 138 -> 118, obniżone 2026-09-01 w tym samym PR-ze, w którym spadł pomiar. Spadek co do
   jednego równy klasie artefaktu zmierzonej w #86 — 20 różnych napisów, 90 wystąpień — bo
   naprawa dotyczy dokładnie jej i niczego więcej. To NIE jest spłata długu tekstowego:
   ani jeden napis nie został przeniesiony, poprawił się przyrząd. */
/* 118 -> 83, obniżone 2026-09-01 razem z trzema kategoriami danych. Spadek 35, a klasy
   zmierzone w #86 dawały 33 (15 kodów + 10 treści <code> + 8 list hostów) — dwa napisy
   ponad to były w „reszcie" i mają ten sam kształt. Różnica jest wypisana, bo liczba bez
   rozbicia nie jest pomiarem, tylko prośbą o zaufanie. */
/* 83 -> 81, obniżone 2026-09-01 razem ze zmianą kategorii kodów na przynależność do
   rejestru. Spadek to dokładnie RANGE i TYPO — jednowyrazowe kody, których poprzedni
   wzorzec nie mógł objąć, bo wymagał myślnika. */
/* 81 -> 65, obniżone 2026-09-01 partią migracyjną #58: piętnaście napisów stojących
   w markupie generatora BEZ ŻADNEGO KLUCZA dostało klucz i kotwicę. Spadek 16, o jeden
   większy niż liczba kotwic — „edits the original" siedzi w <strong> wewnątrz wpisu
   g.import.hint i pokrywa się teraz przez postać korpusu z treścią dzieci. */
/* 65 -> 60, partia #58: rodzina PARSERA walidatora, osiem kluczy z pięciu wywołań.
   Spadek 5, nie 8 — trzy z ośmiu wpisów nie renderują się w żadnym z trzynastu
   scenariuszy, więc nigdy nie były w tej liczbie. */
/* 60 -> 55, partia #58: rodzina STRUKTURY walidatora, dziesięć kluczy z pięciu wywołań.
   Znowu spadek o połowę liczby kluczy — pięć wpisów nie renderuje się w żadnym
   scenariuszu i nigdy nie było w tej liczbie. */
var BASELINE = 55;
var bArg = process.argv.indexOf("--baseline");
if (bArg !== -1) {
  var bVal = Number(process.argv[bArg + 1]);
  if (!isFinite(bVal) || bVal < 0) {
    console.error("FAIL --baseline wymaga liczby nieujemnej, dostałem " +
                  JSON.stringify(process.argv[bArg + 1]) + ".");
    process.exit(2);
  }
  BASELINE = bVal;
}

/* Różne napisy liczone po tym samym kluczu, którym mierzone jest pokrycie. */
var missKeys = Object.create(null);
miss.forEach(function (f) { missKeys[norm(String(f.text))] = true; });
var missStrings = Object.keys(missKeys).length;

console.log("segmentów w słowniku: " + SEGS.length + " z treścią dzieci, " +
            SEGS_OWN.length + " bez niej   pustych odfiltrowanych: " + EMPTY_SEGMENTS);
console.log("widocznych napisów:   " + total + "   ze słownika lub wyjątku: " + ok);
/* OBIE LICZBY, zawsze, i to nie jest ozdoba. Kto pamięta „530" i zobaczy samo „138",
   przeczyta to jako czterokrotny spadek długu zamiast jako zmianę jednostki. */
console.log("BEZ POKRYCIA: " + missStrings + " RÓŻNYCH NAPISÓW w " + miss.length +
            " wystąpieniach   (w tym krótsze niż " + SHORT + " znaki: " + missShort +
            " wystąpień)");
console.log("PRÓG DOTYCZY NAPISÓW, nie wystąpień — jednostka zmieniona 2026-09-01 (#86), " +
            "bo wystąpienia liczyły scenariusze, a nie tekst");
console.log("napisów pasujących do WIĘCEJ NIŻ JEDNEJ kategorii: " + overlap +
            "   (sumy poniżej nakładają się i nie zsumują się do liczby zwolnionych)");
Object.keys(byCategory).forEach(function (k) {
  console.log("  wyjątek: " + byCategory[k] + "  " + k);
});
/* Lista też idzie po NAPISACH, z liczbą wystąpień obok. Trzydzieści wystąpień jednego
   szablonu wypełniało tę listę i wypychało z niej trzydzieści różnych pozycji do
   przeniesienia — czyli lista robocza pokazywała najmniej tam, gdzie było najwięcej
   do zrobienia. Jednostka listy musi być jednostką progu, inaczej czyta się je razem
   i wychodzi z tego trzecia liczba. */
var missByKey = Object.create(null);
miss.forEach(function (f) {
  var k = norm(String(f.text));
  if (!missByKey[k]) missByKey[k] = { n: 0, f: f };
  missByKey[k].n++;
});
var missList = Object.keys(missByKey).map(function (k) { return missByKey[k]; })
                     .sort(function (a, b) { return b.n - a.n; });
missList.slice(0, 30).forEach(function (e) {
  console.log("  BEZ POKRYCIA  x" + e.n + "  <" + e.f.tag.toLowerCase() +
              (e.f.cls ? " class=\"" + String(e.f.cls).slice(0, 22) + "\"" : "") + ">  " +
              JSON.stringify(String(e.f.text).slice(0, 78)));
});
if (missList.length > 30) console.log("  ... i " + (missList.length - 30) + " dalszych napisów");
if (missStrings > BASELINE) {
  console.log("\nFAIL " + missStrings + " różnych napisów wobec progu " + BASELINE +
              " — nowy tekst musi iść przez słownik.");
  process.exit(1);
}
console.log("\nOK   " + missStrings + " różnych napisów, próg " + BASELINE + " nieprzekroczony" +
            (missStrings < BASELINE ? "  (dług zmalał — obniż próg w tym pliku)" : ""));
process.exit(0);
