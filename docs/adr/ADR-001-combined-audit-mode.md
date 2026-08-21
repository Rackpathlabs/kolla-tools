# ADR-001: Gdzie mieszka tryb łączony (combined audit mode)

**Status:** **Accepted** — opcja B zatwierdzona przez właściciela repozytorium 2026-08-10
**Data:** 2026-08-10
**Dotyczy:** issue #18 (combined audit mode), #7 (import globals.yml), #20 (SCOPE.md)
**Kontekst kodu:** main @ 98838fa (po #27), generator.html 88 KB, validator.html 83 KB

---

## Kontekst

Ruleset KV wskazuje trzy reguły, w których — cytując go — „siedzi wartość nie do
zastąpienia": **KV-01** (Masakari bez fencingu), **KV-07** (cinder-volume bez
`cinder_cluster_name`), **KV-09** (VIP kolidujący z adresem hosta). Wszystkie trzy
wymagają `globals.yml` **i** inventory jednocześnie. Żadne z dzisiejszych narzędzi
nie widzi obu plików, więc żadnej z nich nie da się dziś zaimplementować.

Ograniczenia, które nie podlegają negocjacji (ustalone wcześniej, potwierdzone w CI):

- każdy plik HTML jest **samodzielny** i działa z `file://`,
- **zero zależności npm**, brak kroku budowania dla artefaktu publikowanego,
- **zero ruchu sieciowego** (CSP przypięta co do znaku, strażniki w CI),
- deploy = merge do `main` (Pages serwuje `main/(root)`, brak stagingu).

Dzisiejszy wzorzec współdzielenia kodu jest jeden i działa: blok `KOLLA-MATRIX`
(176 linii) wklejony bajtowo identycznie do obu plików, źródło prawdy w `matrix.js`,
`tools/sync-matrix.sh` zapisuje, `tools/check-matrix.sh` wywala build przy rozjeździe.

### Odkrycie, które zmienia obraz

**Generator nie ma parsera `globals.yml`.** Ma `readState()` czytający wartości
z formularza HTML i `buildYaml()` produkujący tekst. Kierunek jest jednostronny:
formularz → YAML. Wczytania YAML-a nie ma nigdzie w repo.

Konsekwencja: tryb łączony to nie jest „spięcie dwóch istniejących parserów".
Brakujący parser YAML trzeba napisać — a to jest dokładnie zakres **issue #7**
(import istniejącego `globals.yml`, round-trip). Czyli #18 ma nierozpoznaną
zależność od #7, albo musi ten parser wytworzyć sam.

Walidator jest w odwrotnej sytuacji — ma komplet: `tokenize()`, `parse()`,
`expandPattern()`, `effectiveHosts()`, `detectCycle()`, plus trzy rodziny reguł
(`quorumRules`, `collocationRules`, `releaseRules`) i renderowanie findingów
z kodami, wagami i numerami linii.

### Gdzie leży ciężar trzech reguł klasy B

| Reguła | Strona inventory | Strona globals |
|---|---|---|
| KV-01 | brak pól BMC/IPMI w hostach | `enable_masakari`, `enable_hacluster` |
| KV-07 | liczność `[storage]` po rozwinięciu | `cinder_cluster_name` |
| KV-09 | wszystkie `ansible_host`, wnioskowana podsieć | `kolla_internal_vip_address` |

We wszystkich trzech: **cała praca analityczna jest po stronie inventory**, a globals
dokłada jeden lub dwa fakty skalarne. To nie jest symetryczne połączenie dwóch analiz.

---

## Rozważane opcje

### Opcja A — trzeci plik `audit.html`

Nowe narzędzie przyjmujące oba pliki, z blokami synchronizowanymi z obu istniejących.

| Wymiar | Ocena |
|---|---|
| Złożoność | **Wysoka** — trzeci konsument bloków, sync obejmuje parser inventory (~300 linii), parser globals, reguły |
| Koszt utrzymania | Wysoki — każda zmiana reguły dotyka trzech plików |
| Rozmiar artefaktu | ~150 KB single-file; działa, ale edycja pliku przez model staje się kosztowna |
| Zgodność z zasadami | Pełna (samodzielność zachowana) |

**Za:** czysty podział — trzy zadania, trzy narzędzia. Nazwy nie kłamią.
**Przeciw:** trzecia kopia parsera inventory to dokładnie ten dług, przed którym
broni `check-matrix.sh` — tyle że tym razem chodzi o setki linii logiki, nie o tabelę
danych. Użytkownik dostaje pytanie „które z trzech narzędzi otworzyć", na które nie ma
oczywistej odpowiedzi.

### Opcja B — walidator przyjmuje drugi, opcjonalny plik

`validator.html` dostaje drugie pole wejściowe na `globals.yml`. Bez niego działa
dokładnie jak dziś. Z nim — dokłada reguły klasy B do tej samej listy findingów.

| Wymiar | Ocena |
|---|---|
| Złożoność | **Niska** — parser inventory, reguły, renderowanie, kody i wagi już są |
| Koszt utrzymania | Niski — jeden nowy blok synchronizowany (parser globals, wspólny z #7) |
| Rozmiar artefaktu | +~15 KB do 83 KB |
| Zgodność z zasadami | Pełna |

**Za:** idzie po ciężarze pracy (analiza jest inventory-centryczna). Degradacja jest
naturalna: brak globals = dzisiejszy zestaw reguł, zero zmian dla obecnych
użytkowników. Parser globals powstaje raz i obsługuje **oba** issues — #7 (generator,
import) i #18 (walidator, audyt).
**Przeciw:** nazwa „validator inventory" przestaje opisywać całość. Do rozwiązania
opisem w UI i README, nie zmianą nazwy pliku (link jest już publiczny).

### Opcja C — generator przyjmuje inventory

Odwrotność B.

**Odrzucona bez analizy wymiarów:** wymagałaby przeniesienia całego parsera inventory
(~300 linii) i trzech rodzin reguł do generatora, czyli duplikacji większej niż
w opcji A, przy jednoczesnym zaśmieceniu narzędzia, którego zadaniem jest **tworzenie**
pliku, nie ocenianie cudzych.

### Opcja D — konsolidacja w jeden plik `kolla-tools.html`

Scalenie obu narzędzi w jeden artefakt z zakładkami.

**Odrzucona:** unieważnia publiczne linki, na których stoi zadanie #3 Igora i cała
komunikacja projektu; ~170 KB w jednym pliku; a przede wszystkim niszczy własność,
która jest realnym atutem — „pobierz jeden plik, który robi jedną rzecz".

---

## Rekomendacja

**Opcja B**, z jednym warunkiem kolejności.

Parser `globals.yml` to wspólny mianownik #7 i #18. Powinien powstać **raz**, jako
trzeci blok synchronizowany (obok `KOLLA-MATRIX`), i zostać zużyty przez oba narzędzia.
Kolejność: najpierw parser (w ramach #7, gdzie ma naturalny kontrakt — round-trip
przez formularz generatora jest ostrzejszym testem poprawności niż odczyt kilku
kluczy), potem #18 konsumuje gotowy blok.

Odwrotna kolejność (#18 pierwsze) też jest wykonalna, ale wtedy parser powstaje pod
wymagania „odczytaj pięć kluczy" i przy #7 trzeba go rozbudować — czyli zapłacić
dwa razy.

### Konsekwencja dla wag — już rozstrzygnięta

Trzy Amendments rulesetu ustaliły prawo: *waga nie może przekraczać tego, co widoczny
plik udowadnia*. Tryb łączony **podnosi** widoczność, więc eskalacje są już
zaprojektowane i czekają: KV-04 warning → error przy widocznym `enable_masakari`,
KV-06 pełna drabina. Mechanizm `LINT[id].by` z #25 (wybór wagi z danych) jest gotowym
wzorcem — reguły klasy B powinny go użyć zamiast wprowadzać drugi.

---

## Konsekwencje

**Łatwiejsze:**
- KV-01/07/09 wchodzą do istniejącej listy findingów — bez nowego renderowania,
  bez nowego formatu raportu, bez nowych kodów poza samymi regułami;
- golden walidatora rozszerza się o przypadki dwuplikowe w istniejącym formacie
  (dane, nie HTML);
- #7 i #18 przestają być niezależne i zaczynają się nawzajem finansować.

**Trudniejsze:**
- `validator.html` rośnie do ~100 KB — przy kolejnych zmianach warto pilnować, czy
  edycja pliku nie staje się wąskim gardłem;
- opis narzędzia musi jasno mówić, że drugi plik jest opcjonalny, inaczej użytkownicy
  z samym inventory poczują się wykluczeni;
- SCOPE.md (#20) trzeba pisać **po** #18 — inaczej opisze jako niesprawdzalne to,
  co #18 właśnie zaczął sprawdzać.

**Do rewizji, jeśli:**
- liczba reguł klasy B przekroczy ~10 — wtedy osobne narzędzie zaczyna się bronić;
- pojawi się potrzeba trzeciego pliku wejściowego (np. `host_vars`) — wtedy wracamy
  do rozmowy o `audit.html` z prawdziwym powodem, nie z estetyki.

---

## Działania

1. [x] Decyzja: **opcja B** (właściciel repozytorium, 2026-08-10)
2. [ ] #7 przed #18 — parser globals jako blok synchronizowany
3. [ ] `tools/check-matrix.sh` uogólnić na dowolną liczbę bloków (dziś zna tylko jeden)
4. [ ] Reguły klasy B używają wzorca `LINT[id].by` z #25, nie nowego mechanizmu
5. [ ] W #18 dopisać zależność od #7 (dziś nieopisana)
6. [ ] SCOPE.md (#20) dopiero po #18
7. [ ] Rozważyć wersję ADR po angielsku w `docs/adr/` — repo publiczne, a ten dokument
       pokazuje, że decyzje zapadają świadomie (dobry sygnał dla inżynierów)

---

## Weryfikacja po fakcie (2026-08-21)

Dopisane przy przenoszeniu tego dokumentu do repozytorium, jedenaście dni po decyzji.
**Rozumowanie wyżej jest nietknięte.** ADR jest zapisem tego, co wiedzieliśmy wtedy;
poprawianie go pod dzisiejszy stan wiedzy zamieniłoby rejestr decyzji w opis stanu
i skasowałoby jedyną rzecz, dla której warto go trzymać — możliwość sprawdzenia,
co się sprawdziło.

### Co się sprawdziło

**Opcja B stoi i nie była rewidowana.** Reguły klasy B siedzą w walidatorze jako
`KV-01-FENCING`, `KV-07-CINDER-CLUSTER`, `KV-09-VIP-COLLISION` i `KV-09-VIP-SUBNET` —
trzy reguły, cztery kody. Wyzwalacz rewizji („liczba reguł klasy B przekroczy ~10")
jest odległy.

**Kolejność #7 przed #18 została zachowana** i parser `globals.yml` powstał raz, jako
blok `GLOBALS-PARSER`, zużyty przez oba narzędzia — dokładnie tak, jak zakładała
rekomendacja.

**Działanie 3 wykonane i przerosło własny opis.** `check-matrix.sh` nie został
„uogólniony na dowolną liczbę bloków" — został zastąpiony przez `tools/check-blocks.sh`
z listą w `tools/blocks-lib.sh`. Bloków jest dziś **cztery**: `KOLLA-MATRIX`,
`GLOBALS-PARSER`, `KOLLA-THEME`, `KOLLA-I18N`. Dokument przewidywał trzeci; są cztery.

**Działanie 4 wykonane.** Wzorzec `LINT[id].by` obowiązuje i został użyty ponownie
przy #26; przy #10 zapisano wprost, dlaczego tam NIE ma zastosowania (waga jest stała,
więc nie ma z czego wybierać) — czyli reguła zadziałała także jako pytanie, na które
trzeba odpowiedzieć, a nie tylko jako mechanizm.

**Działanie 7 wykonane dziś**, właśnie tym przeniesieniem. Wtedy zapisane jako
„rozważyć"; zajęło jedenaście dni i stało się pilne dopiero wtedy, gdy zauważono,
że oba dokumenty istnieją w jednym egzemplarzu na jednym dysku.

### Czego dokument nie przewidział

**Rozmiar.** Przewidywano `+~15 KB do 83 KB`, czyli około 100 KB, i zapisano ostrzeżenie
„warto pilnować, czy edycja pliku nie staje się wąskim gardłem". Dziś `validator.html`
ma **159 KB** — o połowę więcej niż górna granica z tamtego zdania.

Nie jest to skutek samej opcji B: doszły reguły grupowe (#10), migawka widocznego
tekstu (#67), tekst domyślny w markupie (ADR-002) i słownik. Ale ostrzeżenie było
trafne, a próg, przy którym miało zadziałać, minął niezauważony — bo nikt go nie
zamienił w liczbę, którą coś sprawdza. To jest ta sama klasa, co progi opisane
w `CLAUDE.md`: zdanie „warto pilnować" nie pilnuje.

### Czego nie weryfikujemy

Działania 5 i 6 dotyczyły treści zgłoszeń i kolejności pisania `SCOPE.md`. Oba
są dziś nieodtwarzalne z drzewa i nie próbujemy ich zgadywać.
