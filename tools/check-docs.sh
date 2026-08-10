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
              "Design principles"; do
    if grep -qF "$want" SCOPE.md; then
      echo "OK   sekcja: $want"
    else
      echo "FAIL SCOPE.md: brak sekcji \"$want\""; rc=1
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
else
  echo "--   README.md jeszcze nie istnieje (issue #1) — sprawdzenie odnośnika pominięte"
fi

[ "$rc" -eq 0 ] && echo "Dokument granic na miejscu." || echo "Dokument granic wymaga uwagi."
exit "$rc"
