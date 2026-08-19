Pliki o ZNANEJ charakterystyce, do dowodzenia, że strażnicy nie tylko żyją, ale liczą.

Każdy niesie dokładnie tyle naruszeń, ile mówi jego nazwa. Asercja sprawdza LICZBĘ,
nie sam kolor: "czerwone" złapałoby tylko to, że strażnik działa, a "dokładnie dwa
trafienia" złapałoby licznik zliczający połówki par, licznik gubiący konkatenacje
i licznik z przesuniętym parowaniem cudzysłowów — czyli trzy z sześciu awarii
oprzyrządowania, których w tym repozytorium nie złapało nic.

MIGAWKA (#67) ma fixture na ODMOWE, nie tylko na kontrole. Ten straznik ma wlasny
tryb awarii nazwany przy narodzinach: umiera w dniu, w ktorym ktos odruchowo pusci
--update na czerwonym diffie, i robi to po cichu. Testowane jest wiec, ze --update
przy UBYTKU tekstu odmawia, wypisuje pozycje po pozycji i NIE RUSZA pliku — ostatnie
osobno, bo straznik wypisujacy odmowe i mimo to zapisujacy wyglada w logu identycznie.
Przyrost tekstu przechodzi bez ceregieli; gdyby odmawiał takze na nim, odmowa stalaby
sie szumem i ktos dopisalby --accept-removals do runnera na stale.

KAŻDA fixtura brudna niesie PRZYNĘTĘ: coś, co wygląda na naruszenie, a nim nie jest,
plus asercję, że nie zostało policzone. Strażnik za czuły jest szkodliwy tak samo jak
za luźny, tylko inaczej — nie przepuszcza błędu, lecz produkuje szum, aż ktoś go
osłabi albo zacznie ignorować. W regułach widzieliśmy to trzy razy (KV-04, KV-06,
KV-12a — wszystkie obniżone właśnie z tego powodu); przy strażnikach nie było na to
żadnej kontroli.

Przynęty, obecne i planowane:
  literały        poprawne wywołanie T() obok złych literałów                  ZROBIONE
  binarne         legalne znaki wielobajtowe (polskie diakrytyki w komentarzu) ZROBIONE
  klucz słownika  klucz istniejący, użyty w nietypowym miejscu                 DO ZROBIENIA
  język           ten sam napis PO ANGIELSKU w tym samym ujściu                ZROBIONE
                  + pięć dalszych w english-thirteen.html: atrybut sterujący
                    data-i18n-title, nazwa encji HTML, nazwa wstawki, nazwa
                    znacznika we wpisie słownika, identyfikator rozcięty na
                    granicy liter
  kryterium       napis ze słownika z liczbą z przodu ("5 hosts")              ZROBIONE
                  + cztery dalsze przynęty w report-known.json: liczba, krótki
                    segment przez równość, treść podglądu, wartość <option>
  pusty scenariusz  scenariusz legalnie nieruszajacy korpusu, ze zwolnieniem   DO ZROBIENIA
  migawka         przyrost tekstu (zwykla praca) obok ubytku (awaria)         ZROBIONE
                  + tresc podgladu pliku, ktora do migawki NIE wchodzi

Dwie ostatnie zamieniają dzisiejszy problem w przypadek testowy: „5 hosts" przestaje
być zagadką i staje się przynętą, na której normalizacja musi się udowodnić.

PARA english-thirteen.html / english-clean.html jest wyjatkiem od zdania nizej
i jedynym: jej zawartosc jest wzieta Z LISTY ZNALEZIONYCH POZYCJI, bo tym wlasnie
jest — zapisem trzynastu napisow, na ktorych check-english.js raportowal zero (#63).
W drzewie produktu tych napisow juz nie ma, wiec bez tej pary liczby 13 i 0 przestaja
byc sprawdzalne i zostaja zdaniem w opisie commita. Przynety w obu plikach sa juz
rozpisane normalnie, czyli z definicji kategorii.

Przynety rozpisuje sie Z DEFINICJI KATEGORII, nigdy z listy brakow. Wzieta z listy
brakow przyneta potwierdza stan zastany zamiast sprawdzac wymaganie — to ta sama
roznica co miedzy miernikiem postawionym przed praca a po niej. Przy dopisywaniu
kolejnej naturalnym odruchem bedzie siegniecie po pozycje, ktora akurat swieci na
czerwono; wlasnie dlatego to zdanie tu stoi.
