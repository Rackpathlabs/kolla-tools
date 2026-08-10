#!/usr/bin/env bash
# Strażnik plików wysyłanych do przeglądarki: żaden nie ma prawa zawierać bajtu NUL.
#
# Powód z incydentu: separator zapisany jako join("\0") zamiast join(" ") nie zmienił
# zachowania (parser HTML zamienia NUL na U+FFFD, też działający separator), ale
# uczynił plik binarnym dla narzędzi tekstowych — grep po całym validator.html
# milczał, łącznie z 'git show | grep'. Żadna asercja tego nie łapała, bo każda
# pytała o coś konkretnego.
#
# Uwaga: nie da się tego napisać grepem z wzorcem $'\x00'. Bash nie utrzyma bajtu
# NUL w napisie, więc wzorzec jest pusty i pasuje do każdego pliku — sprawdzenie
# przechodzi zawsze i wygląda jak działające.
set -uo pipefail

cd "$(dirname "$0")/.."

rc=0
for f in generator.html validator.html matrix.js; do
  if [ ! -f "$f" ]; then
    echo "FAIL $f: brak pliku"; rc=1; continue
  fi
  n=$(tr -cd '\0' < "$f" | wc -c)
  if [ "$n" -ne 0 ]; then
    echo "FAIL $f: $n bajtów NUL"; rc=1
  else
    echo "OK   $f"
  fi
done

[ "$rc" -eq 0 ] || echo "Bajt NUL bierze się zwykle z pomyłki w edycji literału znakowego."
exit "$rc"
