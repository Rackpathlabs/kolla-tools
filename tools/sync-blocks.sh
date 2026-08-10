#!/usr/bin/env bash
# Przepisuje wszystkie bloki współdzielone z ich plików źródłowych do generator.html
# i validator.html. Uruchamiaj z katalogu repo:  bash tools/sync-blocks.sh
set -euo pipefail

cd "$(dirname "$0")/.."
. tools/blocks-lib.sh

changed=0

for entry in $BLOCKS; do
  name=$(block_name "$entry")
  src=$(block_source "$entry")

  [ -f "$src" ] || { echo "  ! brak pliku źródłowego $src"; exit 1; }
  has_block "$name" "$src" || { echo "  ! $src: brak znaczników $name"; exit 1; }

  block=$(mktemp)
  extract_block "$name" "$src" > "$block"
  [ -s "$block" ] || { rm -f "$block"; echo "  ! $src: pusty blok $name"; exit 1; }

  for f in $TARGETS; do
    if ! has_block "$name" "$f"; then
      rm -f "$block"
      echo "  ! $f: brak znaczników $name — wstaw je ręcznie"; exit 1
    fi

    tmp=$(mktemp)
    awk -v blockfile="$block" -v tag="$name" '
      index($0, "== " tag " BEGIN") {
        skip = 1
        while ((getline line < blockfile) > 0) print line
        close(blockfile)
      }
      skip && index($0, "== " tag " END") { skip = 0; next }
      !skip { print }
    ' "$f" > "$tmp"

    if cmp -s "$f" "$tmp"; then
      rm -f "$tmp"; echo "  = $f / $name (bez zmian)"
    else
      cat "$tmp" > "$f"; rm -f "$tmp"; changed=1; echo "  + $f / $name zaktualizowany"
    fi
  done

  rm -f "$block"
done

[ "$changed" -eq 1 ] && echo "Gotowe. Sprawdź: bash tools/check-blocks.sh" || true
