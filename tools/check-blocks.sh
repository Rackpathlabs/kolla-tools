#!/usr/bin/env bash
# Sprawdza, że każdy blok współdzielony jest identyczny we wszystkich kopiach.
# Kod wyjścia 1 = rozjazd. Wpięte w CI.
set -uo pipefail

# Biblioteka idzie z katalogu SKRYPTU, korzen moze byc podmieniony argumentem —
# inaczej uruchomienie na fixturze szukaloby tools/ wewnatrz fixtury.
here=$(cd "$(dirname "$0")" && pwd)

# Korzen i lista blokow ARGUMENTAMI, nie zmiennymi srodowiskowymi. Powod jest zapisany
# w check-rendered.js i kosztowal juz raz: proces Windows uruchomiony z WSL nie dziedziczy
# zmiennych bez WSLENV, wiec przekazanie przez srodowisko cicho by nie zadzialalo —
# a straznik ruszylby wtedy na domyslnej liscie i zglosil brak matrix.js w fixturze.
root_arg=""
blocks_arg=""
while [ $# -gt 0 ]; do
  case "$1" in
    --root)   root_arg="${2:-}"; shift 2 ;;
    --blocks) blocks_arg="${2:-}"; shift 2 ;;
    *) echo "FAIL nieznany argument: $1"; exit 1 ;;
  esac
done

[ -n "$blocks_arg" ] && BLOCKS="$blocks_arg"
. "$here/blocks-lib.sh"

root="$here/.."
[ -n "$root_arg" ] && root="$here/../$root_arg"
cd "$root"

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
