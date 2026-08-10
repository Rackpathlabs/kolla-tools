# Wspólna funkcja dla sync-matrix.sh i check-matrix.sh.
# Wycina blok macierzy — od linii ze znacznikiem BEGIN do linii z END włącznie.

MATRIX_FILES="matrix.js generator.html validator.html"

extract_matrix() {
  awk '
    /== KOLLA-MATRIX BEGIN/ { inside = 1 }
    inside                  { print }
    /== KOLLA-MATRIX END/   { if (inside) exit }
  ' "$1"
}

has_markers() {
  grep -q '== KOLLA-MATRIX BEGIN' "$1" && grep -q '== KOLLA-MATRIX END' "$1"
}
