# Wspólne funkcje dla sync-blocks.sh i check-blocks.sh.
#
# Narzędzia są samodzielnymi plikami HTML działającymi z file://, więc kod dzielony
# między nie nie może być osobnym <script src>. Zamiast tego każdy wspólny fragment
# ma źródło prawdy w pliku .js i jest wklejany bajtowo identycznie do obu plików HTML
# między znaczniki BEGIN/END o tej samej nazwie.
#
# Dodanie kolejnego bloku = dopisanie pary "NAZWA:plik" do BLOCKS. Skrypty niżej
# nie znają żadnej nazwy z osobna.

# Format wpisu: NAZWA:plik-źródłowy:cel,cel,...
# Cele są per blok, bo nie każdy blok należy wszędzie — hub w korzeniu potrzebuje
# motywu, ale nie macierzy wydań ani parsera globals.
# Podmienialna z zewnatrz, zeby straznika dalo sie uruchomic na fixturze o znanej
# charakterystyce. Dowod, ze kontrola potrafi upasc, ma byc TESTEM, a nie czynnoscia
# wykonana raz w dniu, w ktorym powstawala.
BLOCKS="${BLOCKS:-KOLLA-MATRIX:matrix.js:generator.html,validator.html
GLOBALS-PARSER:globals-parser.js:generator.html,validator.html
KOLLA-THEME:theme.css:generator.html,validator.html,index.html
KOLLA-I18N:i18n.js:generator.html,validator.html,index.html
KOLLA-I18N-APPLY:i18n-apply.js:generator.html,validator.html,index.html}"

block_name()    { echo "$1" | cut -d: -f1; }
block_source()  { echo "$1" | cut -d: -f2; }
block_targets() { echo "$1" | cut -d: -f3 | tr ',' ' '; }

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
