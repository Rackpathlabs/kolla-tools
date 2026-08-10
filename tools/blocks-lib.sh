# Wspólne funkcje dla sync-blocks.sh i check-blocks.sh.
#
# Narzędzia są samodzielnymi plikami HTML działającymi z file://, więc kod dzielony
# między nie nie może być osobnym <script src>. Zamiast tego każdy wspólny fragment
# ma źródło prawdy w pliku .js i jest wklejany bajtowo identycznie do obu plików HTML
# między znaczniki BEGIN/END o tej samej nazwie.
#
# Dodanie kolejnego bloku = dopisanie pary "NAZWA:plik" do BLOCKS. Skrypty niżej
# nie znają żadnej nazwy z osobna.

BLOCKS="KOLLA-MATRIX:matrix.js GLOBALS-PARSER:globals-parser.js"
TARGETS="generator.html validator.html"

block_name()   { echo "${1%%:*}"; }
block_source() { echo "${1##*:}"; }

# extract_block NAZWA PLIK — wycina blok wraz z liniami znaczników
extract_block() {
  awk -v tag="$1" '
    index($0, "== " tag " BEGIN") { inside = 1 }
    inside                        { print }
    index($0, "== " tag " END")   { if (inside) exit }
  ' "$2"
}

# has_block NAZWA PLIK
has_block() {
  grep -q "== $1 BEGIN" "$2" && grep -q "== $1 END" "$2"
}
