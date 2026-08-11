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
# Oprzyrządowanie też. Do tools/check-dictionary.js trafiły dwa bajty NUL i przeszły
# przez CI, bo lista obejmowała wyłącznie artefakty — a plik z NUL-em grep traktuje
# jak binarny i przestaje w nim cokolwiek znajdować, po cichu.
for f in generator.html validator.html index.html matrix.js globals-parser.js theme.css \
         i18n.js tools/*.js tools/*.sh tools/smoke/*.js "$@"; do
  [ -e "$f" ] || continue
  # tools/fixtures/ nie trafia tu przez glob (tools/*.js nie sięga podkatalogu),
  # a podana jawnie fixtura MA być sprawdzona — na tym polega dowód.
  if [ ! -f "$f" ]; then
    echo "FAIL $f: brak pliku"; rc=1; continue
  fi

  n=$(tr -cd '\0' < "$f" | wc -c)
  if [ "$n" -ne 0 ]; then
    echo "FAIL $f: $n bajtów NUL"; rc=1; continue
  fi

  # Nazwy zamiast samych znaków SĄ KONIECZNE, nie ozdobne: ten plik jest w zakresie
  # własnej kontroli, więc dosłowny separator w komentarzu wywala strażnika na jego
  # własnym źródle. Czytelniej byłoby wpisać znak — i nie dałoby się tego zacommitować.
  # Ta sama klasa pomyłki co NUL, tylko trudniejsza do zobaczenia: escape U+0085,
  # U+2028 albo U+2029 zapisany jako znak dosłowny. U+2028 i U+2029 są w JavaScripcie
  # separatorami linii — w literale wyrażenia regularnego dają błąd składni, a w
  # literale napisu przechodzą i zostają niewidoczne. Nigdy nie są tu zamierzone.
  if LC_ALL=C.UTF-8 awk '/\xc2\x85|\xe2\x80\xa8|\xe2\x80\xa9/ { exit 1 }' "$f"; then
    echo "OK   $f"
  else
    echo "FAIL $f: niewidoczny separator linii (U+0085, U+2028 lub U+2029)"; rc=1
  fi
done

[ "$rc" -eq 0 ] || echo "Takie znaki biorą się zwykle z escape'u zapisanego dosłownie przy edycji literału."
exit "$rc"
