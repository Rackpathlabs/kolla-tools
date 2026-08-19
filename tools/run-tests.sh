#!/usr/bin/env bash
# Pełny zestaw testów obu narzędzi. Wymaga wyłącznie Node — żadnych pakietów z npm.
# Uruchamiaj z katalogu repo:  bash tools/run-tests.sh
#
# bash tools/run-tests.sh --update   przepisuje wzorce golden zamiast je sprawdzać.
# Rób to tylko po zamierzonej zmianie wyjścia i obejrzyj diff przed commitem.
#
# Skrypty stron są osadzone w HTML, więc test wycina blok <script> do pliku
# tymczasowego obok pliku źródłowego. Katalog repo, a nie /tmp, bo pod WSL
# testy potrafi wykonywać node.exe z Windows, który nie widzi linuksowego /tmp.
set -uo pipefail

cd "$(dirname "$0")/.."

NODE=""
if command -v node >/dev/null 2>&1; then
  NODE="node"
elif [ -x "/mnt/c/Program Files/nodejs/node.exe" ]; then
  NODE="/mnt/c/Program Files/nodejs/node.exe"
else
  echo "Nie znalazłem Node — pomijam testy dymne."; exit 127
fi

tmp_files=""
cleanup() { rm -f $tmp_files; }
trap cleanup EXIT

extract_script() {
  awk '/^<script>$/{f=1;next} /^<\/script>$/{f=0} f' "$1" > "$2"
  tmp_files="$tmp_files $2"
  [ -s "$2" ] || { echo "Nie udało się wyciąć bloku <script> z $1"; exit 1; }
}

GOLDEN_FLAG=""
[ "${1:-}" = "--update" ] && GOLDEN_FLAG="--update"

rc=0

echo "== higiena plików =="
bash tools/check-binary.sh || rc=1

echo
echo "== gwarancja offline =="
"$NODE" tools/check-offline.js || rc=1

echo
echo "== dokument granic =="
bash tools/check-docs.sh || rc=1

echo
echo "== słownik interfejsu =="
"$NODE" tools/check-i18n.js || rc=1

echo
echo "== słownik: klucz produkuje tekst na ekranie =="
"$NODE" tools/check-i18n-apply.js || rc=1

echo
echo "== literały w ujściach tekstu =="
"$NODE" tools/check-literals.js || rc=1

echo
echo "== spójność bloków współdzielonych =="
bash tools/check-blocks.sh || rc=1

echo
echo "== składnia =="
extract_script generator.html .gen.test.tmp.js
extract_script validator.html .val.test.tmp.js
"$NODE" --check .gen.test.tmp.js && echo "  ok   generator.html" || rc=1
"$NODE" --check .val.test.tmp.js && echo "  ok   validator.html" || rc=1

echo
echo "== generator =="
"$NODE" tools/smoke/generator.test.js .gen.test.tmp.js || rc=1

echo
echo "== walidator =="
"$NODE" tools/smoke/validator.test.js .val.test.tmp.js || rc=1

echo
echo "== kompletność: wyłącznie angielski =="
extract_script index.html .idx.test.tmp.js
"$NODE" tools/smoke/guards.test.js || rc=1
"$NODE" tools/check-english.js .val.test.tmp.js validator.html validator || rc=1
"$NODE" tools/check-english.js .gen.test.tmp.js generator.html generator || rc=1
"$NODE" tools/check-english.js .idx.test.tmp.js index.html hub || rc=1

echo
echo "== golden: generator =="
"$NODE" tools/golden/generator.golden.js .gen.test.tmp.js $GOLDEN_FLAG || rc=1

echo
echo "== golden: round-trip parsera =="
"$NODE" tools/golden/roundtrip.golden.js .gen.test.tmp.js $GOLDEN_FLAG || rc=1

echo
echo "== golden: walidator =="
"$NODE" tools/golden/validator.golden.js .val.test.tmp.js $GOLDEN_FLAG || rc=1

# Na końcu, bo jako jedyna sekcja uruchamia przeglądarkę i trwa dziesiątki sekund.
# Nie jest to sekcja opcjonalna: runner NIE przechodzi dziś bez przeglądarki także bez
# niej, bo guards.test.js uruchamia check-rendered.js dwukrotnie i żąda konkretnych
# kodów wyjścia. Zmierzone na kopii drzewa z pustą listą kandydatów (#72): rc=1.
# Raport kasujemy przed przebiegiem — check-rendered.js DOPISUJE do istniejącego pliku,
# więc pozostałość po poprzednim uruchomieniu zawyżyłaby korpus i pokrycie zmierzone
# na niej mówiłoby o dwóch przebiegach naraz.
echo
echo "== widoczność i pokrycie słownikiem (przeglądarka) =="
rm -f .audit.tmp.json
tmp_files="$tmp_files .audit.tmp.json"
"$NODE" tools/check-rendered.js --texts .audit.tmp.json || rc=1
"$NODE" tools/check-dictionary.js .audit.tmp.json || rc=1

echo
[ "$rc" -eq 0 ] && echo "Wszystko przeszło." || echo "Są niepowodzenia."
exit "$rc"
