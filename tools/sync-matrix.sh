#!/usr/bin/env bash
# Przepisuje blok macierzy z matrix.js do generator.html i validator.html.
# Uruchamiaj z katalogu repo:  bash tools/sync-matrix.sh
set -euo pipefail

cd "$(dirname "$0")/.."
. tools/matrix-lib.sh

has_markers matrix.js || { echo "matrix.js: brak znaczników KOLLA-MATRIX"; exit 1; }

block=$(mktemp); trap 'rm -f "$block"' EXIT
extract_matrix matrix.js > "$block"
[ -s "$block" ] || { echo "matrix.js: pusty blok macierzy"; exit 1; }

changed=0
for f in generator.html validator.html; do
  if ! has_markers "$f"; then
    echo "  ! $f: brak znaczników KOLLA-MATRIX — wstaw je ręcznie"; exit 1
  fi

  tmp=$(mktemp)
  awk -v blockfile="$block" '
    /== KOLLA-MATRIX BEGIN/ {
      skip = 1
      while ((getline line < blockfile) > 0) print line
      close(blockfile)
    }
    skip && /== KOLLA-MATRIX END/ { skip = 0; next }
    !skip { print }
  ' "$f" > "$tmp"

  if cmp -s "$f" "$tmp"; then
    rm -f "$tmp"; echo "  = $f (bez zmian)"
  else
    cat "$tmp" > "$f"; rm -f "$tmp"; changed=1; echo "  + $f zaktualizowany"
  fi
done

[ "$changed" -eq 1 ] && echo "Gotowe. Sprawdź: bash tools/check-matrix.sh" || true
