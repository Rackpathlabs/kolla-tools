#!/usr/bin/env bash
# Sprawdza, że każdy blok współdzielony jest identyczny we wszystkich kopiach.
# Kod wyjścia 1 = rozjazd. Wpięte w CI.
set -uo pipefail

cd "$(dirname "$0")/.."
. tools/blocks-lib.sh

ref=$(mktemp); cur=$(mktemp)
trap 'rm -f "$ref" "$cur"' EXIT

rc=0

for entry in $BLOCKS; do
  name=$(block_name "$entry")
  src=$(block_source "$entry")

  if [ ! -f "$src" ]; then
    echo "FAIL $name: brak pliku źródłowego $src"; rc=1; continue
  fi
  if ! has_block "$name" "$src"; then
    echo "FAIL $src: brak znaczników $name"; rc=1; continue
  fi

  extract_block "$name" "$src" > "$ref"
  if [ ! -s "$ref" ]; then
    echo "FAIL $src: pusty blok $name"; rc=1; continue
  fi

  for f in $(block_targets "$entry"); do
    if ! has_block "$name" "$f"; then
      echo "FAIL $f: brak bloku $name"; rc=1; continue
    fi
    extract_block "$name" "$f" > "$cur"
    if diff -u "$ref" "$cur" > /dev/null; then
      echo "OK   $f / $name"
    else
      echo "FAIL $f: blok $name rozjechał się z $src"
      diff -u --label "$src" --label "$f" "$ref" "$cur" | sed 's/^/     /'
      rc=1
    fi
  done
done

[ "$rc" -eq 0 ] && echo "Bloki współdzielone spójne we wszystkich kopiach." \
                || echo "Napraw: bash tools/sync-blocks.sh"
exit "$rc"
