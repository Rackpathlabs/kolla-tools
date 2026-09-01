/* Slownik fixturowy dla listy oznaczen. Trzy klucze, bo tyle wystarczy:
   jeden zakotwiczony i dwa nie. Prawdziwy i18n.js ma 232 i na nim nie da sie
   pokazac, ze zbior "bez kotwicy i bez oznaczenia" jest pusty ALBO nie jest —
   widac tylko, ze jest duzy. */
(function () {
  var I18N = {
    dict: {
      "x.anchored": "Anchored text",
      "x.orphan1":  "First orphan",
      "x.orphan2":  "Second orphan"
    }
  };
  globalThis.__probe = I18N;
})();
