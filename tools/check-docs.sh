#!/usr/bin/env bash
# Strażnik dokumentu granic. SCOPE.md opisuje, czego narzędzia NIE sprawdzają —
# jego zniknięcie albo utrata odnośnika z README zmienia obietnicę produktu po cichu,
# a to jest dokładnie ta klasa zmian, której nikt nie zauważa w review.
set -uo pipefail

cd "$(dirname "$0")/.."

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
  for want in "Never write a closing keyword next to an issue number" \
              "The defect that produced this rule"; do
    if grep -qF "$want" CLAUDE.md; then
      echo "OK   reguła: $want"
    else
      echo "FAIL CLAUDE.md: brak sekcji \"$want\""; rc=1
    fi
  done
fi

# README należy do issue #1 (Igor). Dopóki nie istnieje, sprawdzenie odnośnika jest
# pomijane — ale głośno, żeby pominięcie nie wyglądało jak zaliczenie.
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
