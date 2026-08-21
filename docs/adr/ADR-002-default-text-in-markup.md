# ADR-002: Pusty element z kluczem, czy angielski tekst domyślny nadpisywany przez applier

**Status:** **Accepted — opcja B** (właściciel repozytorium, 2026-08-19)
**Data:** 2026-08-13
**Dotyczy:** issue #58 (przeniesienie reszty tekstu do słownika), #67 (migawka widocznego
tekstu), #69 (applier w trzech kopiach), PR #70 (naprawa regresji z #59)
**Kontekst kodu:** main @ e19a77d, 109 podstawień `data-i18n*` (generator 50, walidator 33,
hub 26), słownik 217 kluczy

---

## Kontekst

`#59` przeniósł część tekstu generatora do słownika, zamieniając widoczny markup na pusty
element z atrybutem `data-i18n`. Kodu, który te atrybuty czyta, generator nigdy nie miał.
Pięćdziesiąt podstawień renderowało się pusto przez trzynaście godzin i czterdzieści pięć
minut na opublikowanym serwisie. Naprawione w #70; pełna analiza czterech strażników,
z których każdy był zielony i każdy z innego powodu, jest w #67.

Ta decyzja nie dotyczy tamtej awarii — tamta jest naprawiona i ma strażnika. Dotyczy
**wzorca**, w którym powstała, bo #58 ma go zastosować jeszcze co najmniej dwadzieścia razy
w samym generatorze.

### Dzisiejszy wzorzec

```html
<p class="hint" id="h-distro" data-i18n="g.hint.distro"></p>
```

Element jest pusty w źródle. Tekst pojawia się wyłącznie wtedy, gdy `applyI18n()` się
wykona. Bez JavaScriptu — albo bez appliera — użytkownik widzi pustkę.

### Co pomiar mówi o tym wzorcu

Przywrócenie pięćdziesięciu podstawień **podniosło** metrykę `check-dictionary.js`,
zamiast ją obniżyć. Zmierzone tym samym kontrkorpusem po obu stronach:

| | przed naprawą | po naprawie |
|---|---|---|
| niepokrytych razem | 412 | **461** |
| z tego artefakt pomiaru | 18 | **74** |
| faktyczny dług | 394 | **387** |

Faktyczny dług spadł o siedem. Artefakt urósł o pięćdziesiąt sześć, bo wpisy słownika niosą
znaczniki, a jednostką po stronie ekranu jest **własny tekst elementu**, do którego treść
dzieci nie wchodzi:

```
wpis w słowniku:  "Empty inherits <code>network_interface</code>."
korpus widzi:      empty inherits network_interface .        (znacznik → spacja, treść zostaje)
ekran widzi:       Empty inherits .                          (treść dziecka NIE wchodzi)
```

Miernik ukarał naprawę. To nie jest wada tej naprawy — to wada relacji między wzorcem
a miernikiem, i ona jest przedmiotem tej decyzji.

**Osobno, ale w tym samym miejscu:** dwaj strażnicy nie wykonują się w żadnym buildzie,
w tym `check-dictionary.js`, który jest dziś czerwony (461 wobec progu 444). Inwentaryzacja
wszystkich `tools/check-*` z dowodem z logu CI: **#72**, oznaczone jako blokujące #58.

---

## Rozważane opcje

### Opcja A — pusty element, applier wymagany (stan dzisiejszy)

```html
<p class="hint" id="h-distro" data-i18n="g.hint.distro"></p>
```

| Wymiar | Ocena |
|---|---|
| Złożoność | **Niska** — nic do zrobienia, tak jest dziś |
| Degradacja bez JS | **Brak tekstu.** Strona bez JavaScriptu jest pusta w tych miejscach |
| Odległość od awarii z #59 | **Jeden błąd** — brak wywołania, literówka w nazwie formy, nowa strona bez appliera |
| Ryzyko rozjazdu | Zerowe z definicji: tekst jest w jednym miejscu |
| Metryka #58 | Może dojść do zera — pusty element nie ma własnego tekstu, więc znika z korpusu ekranu |

**Za:** jedno źródło prawdy w sensie dosłownym; nie da się rozjechać czegoś, co istnieje raz.
Metryka #58 ma osiągalne dno.

**Przeciw:** metryka dochodzi do zera **także wtedy, gdy tekst zniknął** — to jest dokładnie
mechanizm z #59 i on nie znika wraz z dodaniem strażnika. `check-i18n-apply.js` zamyka drogę,
którą tamto weszło, ale klasa pozostaje: dopóki widoczność tekstu zależy od wykonania kodu,
każdy nowy sposób niewykonania go jest nową awarią tej samej rodziny. Strażnik z #67 też
mierzy skutek, ale wyłącznie na ścieżkach, którymi przejedzie.

### Opcja B — angielski tekst domyślny w markupie, nadpisywany przez applier

```html
<p class="hint" id="h-distro" data-i18n="g.hint.distro">Base distribution of the
   container images. Must match the images in the registry.</p>
```

Applier działa jak dziś — podstawia treść ze słownika. Różnica: gdy się nie wykona,
w elemencie stoi ten sam tekst.

| Wymiar | Ocena |
|---|---|
| Złożoność | **Średnia** — trzeba wypełnić 109 elementów i utrzymać zgodność |
| Degradacja bez JS | **Pełny tekst.** Strona bez JavaScriptu czyta się w całości |
| Odległość od awarii z #59 | **Strukturalnie niemożliwa** — brak appliera nie usuwa tekstu, bo tekst jest w markupie |
| Ryzyko rozjazdu | Realne — dwa miejsca na ten sam napis |
| Metryka #58 | **Nie może dojść do zera** — tekst w markupie przestaje być długiem, więc kryterium wymaga redefinicji |

**Za:** zamienia awarię, przed którą trzeba strzec, w stan, który nie ma jak zajść. To jest
ta sama różnica co między sprawdzaniem treści a zakazywaniem konstrukcji, opisana
w `docs/PRINCIPLES.md`: kontrola treści przepuszcza to, o czym autor nie pomyślał, kontrola
kształtu nie ma jak.

I drugie, ważniejsze: **ryzyko rozjazdu jest SPRAWDZALNĄ RÓWNOŚCIĄ.** `tekst domyślny
w markupie === wartość ze słownika` to porównanie dwóch napisów, wykonalne statycznie, bez
przeglądarki, bez scenariuszy i bez pojęcia „ścieżka, którą przejedzie". Czyli dokładnie ten
strażnik skutku, którego dziś nie ma — a którego brak kosztował trzynaście godzin
i czterdzieści pięć minut.

**Przeciw:** dwa miejsca na ten sam napis to dług, nawet pilnowany. Rośnie rozmiar plików.
I kosztuje redefinicję kryterium #58, opisaną niżej — a kryterium, które zmienia definicję
w trakcie migracji prowadzonej jego liczbą, wymaga ogłoszenia z góry, żeby dało się odróżnić
„miernik pokazuje co innego" od „miernik zrobił to, co zapowiedzieliśmy".

### Opcja C — tekst domyślny tylko tam, gdzie element jest krytyczny

Wariant B ograniczony do nagłówków i metek pól, z pominięciem podpowiedzi.

**Odrzucona bez analizy wymiarów:** wymaga kryterium „co jest krytyczne", którego nie da się
obronić — a lista pozycji krytycznych starzeje się przy każdym nowym widoku, tak jak
zestarzała się lista kontenerów w kategorii danych i lista plików w strażniku bajtowym.
Trzeci przypadek tej samej pomyłki w tym repozytorium byłby wyborem, nie przeoczeniem.

---

## Konsekwencje dla `check-dictionary.js`, wprost

Opcja B zmienia **definicję długu**, nie tylko liczbę. Wypisane, bo to jest najdroższa część
tej decyzji i jedyna, która nie cofa się łatwo.

**Dziś** kryterium brzmi: napis widoczny na ekranie, który nie pochodzi z segmentu słownika,
jest długiem. Tekst w markupie jest długiem **z definicji** — bo nie przeszedł przez `T()`.

**Po opcji B** tekst w markupie może być dosłownie tym samym napisem co wpis słownika. Nie
jest długiem; jest drugą kopią pod strażnikiem. Kryterium musi wtedy rozróżnić:

1. **napis w markupie równy wpisowi słownika** — nie dług, pilnowany równością;
2. **napis w markupie bez odpowiadającego klucza** — dług, dokładnie jak dziś;
3. **napis w markupie różny od wpisu przy tym samym kluczu** — nie dług, tylko **rozjazd**,
   czyli osobna, ostrzejsza kategoria błędu niż jedno i drugie.

Trzeci przypadek dziś nie istnieje i nie ma dla niego ani nazwy, ani wagi.

**Konsekwencja liczbowa:** dzisiejsze 461 przestaje być porównywalne z tym, co miernik pokaże
po zmianie. Ogłoszenie przed pracą, nie po — tak jak przy kryterium pochodzenia, gdzie
liczba zmieniła się po raz czwarty i dopiero zapowiedź pozwoliła odróżnić sprawdzenie od
odkrycia.

**Konsekwencja druga, korzystna:** artefakt z 74 pozycji znika sam. Jeśli w markupie stoi
`Base distribution of the <code>container</code> images.`, to własny tekst elementu i wpis
słownika rozjeżdżają się dokładnie tak samo po obu stronach — porównanie przestaje być
„ekran kontra korpus" i staje się „markup kontra słownik", a te dwa mają identyczną strukturę.
Kategoria E przestaje istnieć jako kategoria, nie jako liczba do odjęcia.

---

## Rekomendacja

**Opcja B**, z dwoma warunkami kolejności.

Uzasadnienie w jednym zdaniu: A trzyma metrykę czystą kosztem produktu, B trzyma produkt
kosztem metryki — a metryka jest po to, żeby chronić produkt, więc gdy stają naprzeciw siebie,
przegrywa metryka.

Rozwinięcie, bo to jest decyzja, przy której łatwo pomylić kierunek. Opcja A ma jedną wadę
i jest to wada strukturalna: **widoczność tekstu zależy od wykonania kodu**. Każdy strażnik,
jakiego da się przeciw temu postawić, mierzy skutek na ścieżkach, którymi przejedzie —
`check-i18n-apply.js` wykonuje applier na DOM zbudowanym z markupu, migawka z #67 wykona
scenariusze. Obie są dobre i obie zależą od pokrycia. Opcja B nie potrzebuje pokrycia,
bo porównuje dwa napisy leżące obok siebie w plikach.

Warunki:

1. **Najpierw równość, potem tekst.** Strażnik `markup === słownik` powstaje i jest CZERWONY,
   zanim zostanie wypełniony pierwszy element — tak jak `check-literals.js` powstał czerwony
   przed migracją, którą prowadził. Odwrotna kolejność daje miernik zbudowany z patrzenia na
   to, co już jest, i ten w tym repozytorium zawiódł trzy razy.
2. **Przed pierwszym wypełnieniem ogłoszona nowa liczba.** Redefinicja kryterium zmienia
   metrykę #58 skokowo; wartość spodziewana idzie do commita przed pracą, nie po.

---

## Konsekwencje

**Łatwiejsze:**

- awaria z #59 przestaje być możliwa zamiast być pilnowana — brak appliera daje stronę
  z tekstem, nie stronę pustą;
- narzędzia działają bez JavaScriptu w warstwie tekstowej, co jest zgodne z obietnicą
  „pojedynczy plik HTML, otwierasz z `file://`";
- artefakt pomiaru (74 pozycje) znika jako kategoria, nie jako poprawka;
- `check-i18n-apply.js` zostaje sensowny i nie dubluje nowego strażnika: on pyta, czy klucz
  **produkuje** tekst, nowy pyta, czy tekst domyślny **zgadza się** z kluczem. Dwa pytania.

**Trudniejsze:**

- 109 elementów do wypełnienia, każde ręcznie i każde do sprawdzenia;
- pliki rosną o sumę długości wpisów — do zmierzenia przed decyzją, nie po;
- `#58` przestaje mieć dno w zerze i potrzebuje nowego zdania o tym, co jest celem;
- trzeci przypadek (rozjazd) potrzebuje nazwy, wagi i miejsca w raporcie.

**Do rewizji, jeśli:**

- równość okaże się niesprawdzalna dla wpisów ze wstawkami `{name}` — wtedy część elementów
  wraca do wariantu A i decyzja staje się mieszana, co jest gorsze od obu czystych;
- przyrost rozmiaru `generator.html` przekroczy próg, przy którym edycja pliku staje się
  wąskim gardłem (ADR-001 stawiał to pytanie przy ~100 KB dla walidatora).

---

## Cztery rzeczy rozstrzygnięte PRZED migracją

Warunek postawiony przy akceptacji: te odpowiedzi mają stać w dokumencie, a nie zostać
odkryte w trakcie. Wersja operacyjna każdej z nich siedzi w nagłówku
`tools/check-markup-dict.js`, bo tam trafi następny czytelnik — ten plik jest robocza
i nie jest wersjonowany.

### 1. Normalizacja porównania

**Ciągi białych znaków (w tym złamania linii i wcięcia) zwijamy do jednej spacji
i przycinamy z obu końców — PO OBU STRONACH.** Tekst w markupie bywa zawinięty na trzy
linie z wcięciem dwunastu spacji, wpis w słowniku jest jedną linią; bez tej reguły
strażnik byłby czerwony na wszystkim od pierwszego dnia.

**Encji HTML NIE dekodujemy.** Wymagamy, żeby po obu stronach były zapisane tak samo.
Dekodowanie wprowadza drugą warstwę interpretacji, w której rozjazd może się schować —
a cała wartość tego strażnika bierze się z tego, że porównuje dwa napisy leżące obok
siebie w plikach, bez niczyjej interpretacji. Cena: `&lt;` w słowniku wymaga `&lt;`
w markupie. To jest cena, nie wada.

Świadoma strata: podwójna spacja w środku zdania przestaje być rozróżnialna. Zapisane,
bo reguła zwijania zawsze coś traci i lepiej wiedzieć co.

### 2. Atrybuty — od pierwszego dnia, nie „kiedyś potem"

Wszystkie **cztery** formy są objęte od początku, bo trzy z nich niosą tekst widoczny
tak samo jak treść elementu:

| forma | ujście |
|---|---|
| `data-i18n` | treść elementu |
| `data-i18n-ph` | `placeholder` |
| `data-i18n-title` | `title` |
| `data-i18n-label` | `aria-label` |

Objęcie samej treści elementu stworzyłoby **drugą, cichszą klasę tekstu poza kontrolą** —
dokładnie tę, od której zaczęła się ta rodzina awarii. Dziś takich atrybutów jest osiem
(walidator: 2 × `ph`, 3 × `title`, 2 × `label`; generator: 1 × `label`).

**Związek z #69.** Applier `data-i18n*` istnieje w trzech kopiach, więc piąta forma
oznacza edycję trzech plików. Ten strażnik czyta MARKUP, więc jest od tych kopii
niezależny — ale jego lista form to piąte miejsce, o którym trzeba pamiętać. Dopóki #69
nie sfaktoryzuje appliera, dodanie formy jest zmianą w czterech miejscach i to jest
argument za #69, nie przeciw temu strażnikowi.

### 3. Klucze sieroce — nazwane i policzone, nie przemilczane

Napisy budowane w JS nie mają elementu w markupie, więc kryterium „markup === słownik"
**nie ma jak ich zobaczyć**. Milczenie tutaj dałoby #58 domknięte na papierze.

**Rozstrzygnięcie: strażnik RAPORTUJE liczbę kluczy bez kotwicy w markupie i pilnuje,
żeby nie rosła.** Nie zwalnia ich i nie udaje, że je sprawdza — jego nazwa mówi „markup"
i zakres ma się zgadzać z nazwą. Te klucze zostają domeną dwóch istniejących kontroli:
`check-i18n-apply.js` (czy klucz PRODUKUJE tekst) i `check-dictionary.js` (czy tekst
z ekranu jest pokryty słownikiem). Trzeci strażnik dla nich nie powstaje w #58.

Liczba jest w pliku, więc widać ją bez uruchamiania czegokolwiek — i widać, kiedy rośnie.

### 4. Kierunek błędu przy rozjeździe

**Źródłem prawdy jest SŁOWNIK.** Rozjazd naprawia się przepisaniem markupu, nigdy
odwrotnie.

Powód nie jest estetyczny. Słownik jest jedynym miejscem, w którym widać wszystkie
komunikaty naraz — to ta właściwość umożliwiła twierdzenie o kompletności i pozwoliła
rozstrzygnąć pytanie przeglądem 214 wpisów w jednym spojrzeniu. Jest też blokiem
synchronizowanym z jednego pliku źródłowego (`i18n.js`), podczas gdy markup to trzy
kopie strony. Naprawianie „w drugą stronę" znaczyłoby przepisywanie źródła prawdy pod
jedną z trzech kopii.

Zmiana zamierzona idzie więc zawsze przez `i18n.js`, a markup podąża. Zapisane, żeby
przy pierwszym czerwonym CI nie było dyskusji.

---

## Działania

1. [x] Decyzja: **opcja B** (właściciel repozytorium, 2026-08-19)
2. [ ] Niezależnie od decyzji: **#72** — strażnicy niewykonujący się w żadnym buildzie.
       Blokuje #58, bo to jest miernik, którym #58 ma być prowadzone
3. [ ] Przy B: strażnik `markup === słownik`, czerwony przed pierwszym wypełnieniem
4. [ ] Przy B: zmierzyć przyrost rozmiaru plików przed wypełnianiem
5. [ ] Przy B: ogłosić nową wartość metryki #58 przed pracą
6. [ ] Przy B: nazwa i waga dla kategorii „rozjazd markup/słownik"
7. [ ] Przy A: zapisać w #58, że dno w zerze jest osiągalne także przez zniknięcie tekstu,
       i czym to jest pilnowane

---

## Weryfikacja po fakcie (2026-08-21)

Dopisane przy przenoszeniu do repozytorium, dwa dni po decyzji. **Rozumowanie wyżej jest
nietknięte** — również to, które okazało się błędne. Cicha poprawka zamieniłaby rejestr
decyzji w opis stanu.

### Przewidywanie, które się NIE sprawdziło

Sekcja „Konsekwencje dla `check-dictionary.js`, wprost" mówi:

> **Konsekwencja druga, korzystna:** artefakt z 74 pozycji znika sam.

**Nie zniknął.** Zmierzone po migracji: `check-dictionary.js` pokazuje te same liczby
co przed nią — 3110 widocznych napisów, 2580 pokrytych, 530 bez pokrycia — a artefakt
urósł do **90 wystąpień / 20 różnych napisów** (#86), bo doszły scenariusze i reguły,
których wpisy też niosą znaczniki.

**Dlaczego przewidywanie było błędne.** Opierało się na cichym założeniu, że kryterium
zostanie **przepisane** na „markup kontra słownik". Nie zostało: powstał zamiast tego
osobny strażnik `tools/check-markup-dict.js`. `check-dictionary.js` dalej porównuje
**EKRAN** ze słownikiem, a opcja B zmieniła **ŹRÓDŁO** — po wykonaniu appliera ekran
wygląda dokładnie tak samo, więc miernik nie miał na co zareagować.

Błąd był w zdaniu o mierniku, nie w decyzji. Opcja B zrobiła to, co obiecywała:
awaria z #59 przestała być możliwa zamiast być pilnowana.

### Co się sprawdziło

**Warunek kolejności utrzymany.** Strażnik równości powstał **czerwony** — 108 pustych
elementów, exit 1 — osobnym commitem przed wypełnieniem pierwszego elementu, i jest to
widoczne w historii, a nie tylko w opisie.

**Predykcja o ekranie trafiła co do jedności.** Przed pracą zapisano, że
`check-dictionary` zostanie na 530, a wszystkie 15 migawek bez zmian, bo applier
nadpisuje markup tą samą wartością. Zmierzone po: dokładnie tak.

**Cztery rozstrzygnięcia z sekcji dopisanej przy akceptacji** (normalizacja, atrybuty,
klucze sieroce, kierunek błędu) są w nagłówku `tools/check-markup-dict.js`, bo ten
dokument był plikiem roboczym i do dziś nie był wersjonowany.

**Koszt rozmiaru zmierzony, nie oszacowany:** 372 197 → 379 230 bajtów, +7 033 (+1,9%).

### Rzecz, której dokument nie mógł przewidzieć

Przy wypełnianiu wyszło, że dekoder słownika w nowym strażniku rozwijał wyłącznie `\"`
i zostawiał `\n` jako dwa znaki. Filler wpisał do atrybutu literalne „backslash-n",
strażnik porównał je z tym samym literałem i **zapalił zielone** — obie strony zgodne
co do napisu, którego przeglądarka nigdy nie zobaczy. Złapało to `check-english.js`,
raportując słowa „n", „nctrl", „npaste", czyli kontrola pytająca o coś zupełnie innego.

Zapisane tutaj, bo jest to najczystszy przykład reguły z `docs/PRINCIPLES.md`: strażnik,
który dekoduje inaczej niż silnik, porównuje własną interpretację ze swoją własną
interpretacją i przechodzi zawsze.
