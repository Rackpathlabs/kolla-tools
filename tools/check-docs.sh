#!/usr/bin/env bash
# Strażnik dokumentu granic. SCOPE.md opisuje, czego narzędzia NIE sprawdzają —
# jego zniknięcie albo utrata odnośnika z README zmienia obietnicę produktu po cichu,
# a to jest dokładnie ta klasa zmian, której nikt nie zauważa w review.
set -uo pipefail

# Korzen podmienialny argumentem. Wszystkie sciezki nizej sa WZGLEDNE wobec tego cd,
# wiec jedna zmiana wystarcza za trzydziesci szesc wystapien nazw plikow — i nie ma
# ryzyka, ze ktores zostanie zaszyte na bezwzglednie.
here=$(cd "$(dirname "$0")" && pwd)
if [ "${1:-}" = "--root" ] && [ -n "${2:-}" ]; then cd "$here/../$2"; else cd "$here/.."; fi

rc=0
MIN_BYTES=2000

if [ ! -f SCOPE.md ]; then
  echo "FAIL SCOPE.md: brak pliku"; rc=1
else
  n=$(wc -c < SCOPE.md)
  if [ "$n" -lt "$MIN_BYTES" ]; then
    echo "FAIL SCOPE.md: $n bajtów — dokument granic wygląda na wypatroszony (próg $MIN_BYTES)"; rc=1
  else
    echo "OK   SCOPE.md ($n B)"
  fi

  # Sekcje, których usunięcie wydrążyłoby dokument, zostawiając samą nazwę pliku.
  for want in "What these tools check" \
              "What these tools deliberately do not check" \
              "Where certainty ends" \
              'What "no findings" means' \
              "The upgrade path mode"; do
    if grep -qF "$want" SCOPE.md; then
      echo "OK   sekcja: $want"
    else
      echo "FAIL SCOPE.md: brak sekcji \"$want\""; rc=1
    fi
  done
fi

# Zasady projektowe wyprowadzone do osobnego dokumentu: SCOPE.md jest dla inżyniera
# oceniającego, czy zaufać wynikowi, PRINCIPLES.md dla kogoś, kto zmienia ten kod.
# Strażnik musi objąć OBA — rozdzielenie, po którym połowa treści przestaje być
# czymkolwiek chroniona, jest gorsze niż jeden długi dokument.
if [ ! -f docs/PRINCIPLES.md ]; then
  echo "FAIL docs/PRINCIPLES.md: brak pliku"; rc=1
else
  n=$(wc -c < docs/PRINCIPLES.md)
  if [ "$n" -lt 3000 ]; then
    echo "FAIL docs/PRINCIPLES.md: $n bajtów — zasady wyglądają na wypatroszone (próg 3000)"; rc=1
  else
    echo "OK   docs/PRINCIPLES.md ($n B)"
  fi
  for want in "What the tools may not claim" \
              "Where a check has to stand"; do
    if grep -qF "$want" docs/PRINCIPLES.md; then
      echo "OK   zasady: $want"
    else
      echo "FAIL docs/PRINCIPLES.md: brak rodziny \"$want\""; rc=1
    fi
  done
  # Odesłanie w obie strony: dokument bez drogi powrotnej gubi czytelnika, który
  # trafił do niego z linku i szuka zakresu produktu.
  if grep -q "SCOPE.md" docs/PRINCIPLES.md; then
    echo "OK   PRINCIPLES.md odsyła do SCOPE.md"
  else
    echo "FAIL docs/PRINCIPLES.md: brak odnośnika do SCOPE.md"; rc=1
  fi
fi

# PROCEDURA RĘCZNA JEST W TYM KATALOGU JEDYNĄ RZECZĄ, KTÓREJ NIC NIE EGZEKWUJE, i właśnie
# dlatego trzyma ją tu strażnik. Zniknięcie strażnika widać w wynikach; zniknięcie procedury
# nie widać nigdzie — nie ma czerwonego, nie ma powiadomienia, nie ma nawet luki w liczbie.
# Ten warunek nie sprawdza, czy ktoś ją wykonał, i nie umie: sprawdza, że da się ją wykonać,
# bo istnieje i niesie kroki. To dwie różne gwarancje i tylko pierwsza z nich tu jest.
if [ ! -f docs/MANUAL-CHECKS.md ]; then
  echo "FAIL docs/MANUAL-CHECKS.md: brak pliku"; rc=1
else
  n=$(wc -c < docs/MANUAL-CHECKS.md)
  if [ "$n" -lt 2000 ]; then
    echo "FAIL docs/MANUAL-CHECKS.md: $n bajtów — procedura wygląda na wypatroszoną (próg 2000)"; rc=1
  else
    echo "OK   docs/MANUAL-CHECKS.md ($n B)"
  fi
  # Trzy zdania, których brak zamieniłby procedurę w listę życzeń: że nie jest strażnikiem,
  # dlaczego pomiar maszynowy tu nie sięga, i gdzie zapisać wykonanie.
  for want in "This is a procedure, not a guard" \
              "is not a trusted" \
              "## Last run"; do
    if grep -qF "$want" docs/MANUAL-CHECKS.md; then
      echo "OK   procedura: $want"
    else
      echo "FAIL docs/MANUAL-CHECKS.md: brak fragmentu \"$want\""; rc=1
    fi
  done
fi

# CLAUDE.md niesie zakazy, nie opisy — a zakaz, który da się usunąć bez śladu w review,
# jest zakazem na jedną iterację. Objęty tym samym strażnikiem i z tego samego powodu,
# który stoi wyżej przy PRINCIPLES.md: rozdzielenie, po którym połowa treści przestaje
# być czymkolwiek chroniona, jest gorsze niż jeden długi dokument.
#
# Sprawdzana jest OBECNOŚĆ SEKCJI, nie sama długość pliku. Reguła wypatroszona do
# nagłówka waży tyle samo bajtów co reguła z uzasadnieniem, a uzasadnienie jest tym,
# co powstrzymuje przed jej skasowaniem za miesiąc.
if [ ! -f CLAUDE.md ]; then
  echo "FAIL CLAUDE.md: brak pliku"; rc=1
else
  n=$(wc -c < CLAUDE.md)
  if [ "$n" -lt 1500 ]; then
    echo "FAIL CLAUDE.md: $n bajtów — reguły wyglądają na wypatroszone (próg 1500)"; rc=1
  else
    echo "OK   CLAUDE.md ($n B)"
  fi
  # Reguła o nazwach milestone'ów jest NIEEGZEKWOWANA co do treści — nikt nie sprawdzi,
  # czy issue pasuje tematycznie. Jej OBECNOŚĆ w dokumencie pilnujemy tak samo jak reszty:
  # to dwie różne gwarancje i tylko ta druga istnieje.
  # Sekcja o tożsamości jest tu z tego samego powodu, co reguła o milestone'ach:
  # jej połowa dotycząca pól author/committer jest NIEEGZEKWOWANA i opiera się na
  # nieśledzonym .git/config. Pilnujemy OBECNOŚCI zapisu, bo to jedyna gwarancja,
  # jaka w tej połowie istnieje — a dwie różne gwarancje trzeba umieć rozróżnić.
  for want in "Never write a closing keyword next to an issue number" \
              "The defect that produced this rule" \
              "A ratchet threshold may only fall" \
              "A milestone's name describes what is in it" \
              "Commits carry the project identity, never a person" \
              "A citation carries the evidence; the SHA is an aid" \
              "A guard's criterion never rides in a commit that changes the product"; do
    if grep -qF "$want" CLAUDE.md; then
      echo "OK   reguła: $want"
    else
      echo "FAIL CLAUDE.md: brak sekcji \"$want\""; rc=1
    fi
  done
fi

# README powstał w ramach issue #1, dziś zamkniętego. Warunek „dopóki nie istnieje"
# zostaje mimo to: plik może zniknąć, a sprawdzenie odnośnika w nieistniejącym pliku
# ma być POMINIĘTE GŁOŚNO, żeby pominięcie nie wyglądało jak zaliczenie.
#
# Do 2026-08-21 stało tu imię osoby prowadzącej tamto issue. Skasowane bez zastępnika:
# komunikaty i komentarze w tym repozytorium mówią o pracy, nie o ludziach —
# CLAUDE.md, sekcja „Commits carry the project identity, never a person".
if [ -f README.md ]; then
  if grep -q "SCOPE.md" README.md; then
    echo "OK   README.md odsyła do SCOPE.md"
  else
    echo "FAIL README.md: brak odnośnika do SCOPE.md"; rc=1
  fi
  if grep -q "CLAUDE.md" README.md; then
    echo "OK   README.md odsyła do CLAUDE.md"
  else
    echo "FAIL README.md: brak odnośnika do CLAUDE.md"; rc=1
  fi
  if grep -q "PRINCIPLES.md" README.md; then
    echo "OK   README.md odsyła do PRINCIPLES.md"
  else
    echo "FAIL README.md: brak odnośnika do PRINCIPLES.md"; rc=1
  fi
else
  echo "--   README.md jeszcze nie istnieje (issue #1) — sprawdzenie odnośnika pominięte"
fi

[ "$rc" -eq 0 ] && echo "Dokument granic na miejscu." || echo "Dokument granic wymaga uwagi."
exit "$rc"
