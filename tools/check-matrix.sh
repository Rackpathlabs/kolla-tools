#!/usr/bin/env bash
# Sprawdza, że blok macierzy jest identyczny w matrix.js, generator.html i validator.html.
# Kod wyjścia 1 = rozjazd. Do wpięcia w CI (issue #5).
set -uo pipefail

cd "$(dirname "$0")/.."
. tools/matrix-lib.sh

ref=$(mktemp); cur=$(mktemp)
trap 'rm -f "$ref" "$cur"' EXIT

has_markers matrix.js || { echo "FAIL matrix.js: brak znaczników KOLLA-MATRIX"; exit 1; }
extract_matrix matrix.js > "$ref"
[ -s "$ref" ] || { echo "FAIL matrix.js: pusty blok macierzy"; exit 1; }

rc=0
for f in generator.html validator.html; do
  if ! has_markers "$f"; then
    echo "FAIL $f: brak znaczników KOLLA-MATRIX"; rc=1; continue
  fi
  extract_matrix "$f" > "$cur"
  if diff -u "$ref" "$cur" > /dev/null; then
    echo "OK   $f"
  else
    echo "FAIL $f: blok rozjechał się z matrix.js"
    diff -u --label "matrix.js" --label "$f" "$ref" "$cur" | sed 's/^/     /'
    rc=1
  fi
done

[ "$rc" -eq 0 ] && echo "Macierz spójna we wszystkich kopiach." \
                || echo "Napraw: bash tools/sync-matrix.sh"
exit "$rc"
