/* Przełącznik motywu — źródło prawdy dla bloku KOLLA-THEME-SWITCH.
 *
 * Wklejany bajtowo identycznie do generator.html, validator.html i index.html przez
 * tools/sync-blocks.sh; rozjazd kopii wywala tools/check-blocks.sh. Nie ma tu
 * `<script src>`, bo narzędzia są samodzielnymi plikami HTML działającymi z file://.
 *
 * BLOK STOI W <head>, A NIE PRZY RESZCIE SKRYPTU, i to jest cała jego konstrukcja.
 * Wybór trzeba nałożyć PRZED pierwszym malowaniem: skrypt na końcu <body> ustawiłby
 * atrybut po tym, jak przeglądarka pokazała już stronę w motywie domyślnym, więc
 * człowiek, który wybrał jasny, dostawałby ciemny błysk przy każdym otwarciu. To nie
 * jest kosmetyka — to jedyna widoczna różnica między „ustawienie działa" a „ustawienie
 * działa z opóźnieniem", a druga rzecz czyta się jak usterka.
 *
 * DLATEGO TEŻ ETYKIETA NIE JEST TU ZŁOŻONA. W <head> nie ma jeszcze ani słownika, ani
 * przycisku. Blok wystawia `KOLLA_THEME.init(T)`, a każdy plik woła to na dole, tam gdzie
 * już woła applyI18n() — ta sama para: blok definiuje, plik wywołuje.
 *
 * TRZY STANY, NIE DWA: "system" (brak atrybutu), "light", "dark". Bez trzeciego nie da
 * się wrócić do ustawienia systemu po jednym kliknięciu, a przełącznik, który potrafi
 * tylko odejść od systemu i nigdy do niego nie wrócić, zaczyna z tym ustawieniem walczyć.
 * Kolejność cyklu jest system -> jasny -> ciemny -> system, więc dwa kliknięcia z każdego
 * stanu wracają do punktu wyjścia.
 *
 * ZAPIS PRZEZ GOŁE `localStorage`, nie `window.localStorage` — reszta generatora sięga
 * po nie tak samo, a różnica jest widoczna dopiero pod stubem DOM: `window` bywa tam
 * obiektem bez tego pola, więc zapis milcząco nie działałby w każdym teście naraz.
 *
 * ZAPIS MOŻE NIE ISTNIEĆ. Pliki otwierane z file:// bywają uruchamiane w kontekstach,
 * w których localStorage rzuca wyjątkiem przy samym odczycie — to nie jest sytuacja
 * hipotetyczna, tylko domyślne zachowanie przeglądarki przy zablokowanych danych stron.
 * Wyjątek zjadamy i zostajemy przy stanie "system": narzędzie ma działać, a nie
 * tłumaczyć się z pamięci, której nie dostało.
 */
/* == KOLLA-THEME-SWITCH BEGIN — generowane z theme-switch.js, nie edytuj w miejscu == */
var KOLLA_THEME = (function () {
  var KEY = "kolla.theme";
  var CYKL = ["system", "light", "dark"];
  /* Klucze wypisane dosłownie, po jednym na stan. Złożenie ich w locie ("nav.theme." +
     stan) byłoby krótsze i NIEWIDOCZNE dla tools/check-i18n.js, który szuka nazwy klucza
     w źródle — martwy klucz przestałby być wykrywalny. Ten sam powód stoi przy
     v.f.requiredEmpty w walidatorze. */
  var ETYKIETA = {
    system: "nav.theme.system",
    light:  "nav.theme.light",
    dark:   "nav.theme.dark"
  };
  var stan = "system";

  try {
    var zapis = localStorage.getItem(KEY);
    if (zapis === "light" || zapis === "dark" || zapis === "system") stan = zapis;
  } catch (e) { /* pamięć niedostępna: zostajemy przy ustawieniu systemu */ }

  function naloz() {
    if (stan === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", stan);
  }
  naloz();

  return {
    stan: function () { return stan; },
    /* T jest podawane z zewnątrz, bo w <head> słownika jeszcze nie ma. */
    init: function (T) {
      var btn = document.getElementById("theme-btn");
      if (!btn) return;
      function opisz() {
        btn.setAttribute("data-stan", stan);
        btn.setAttribute("aria-label", T(ETYKIETA[stan]));
      }
      opisz();
      btn.addEventListener("click", function () {
        stan = CYKL[(CYKL.indexOf(stan) + 1) % CYKL.length];
        naloz();
        opisz();
        try { localStorage.setItem(KEY, stan); } catch (e) { /* jw. */ }
      });
    }
  };
})();
/* == KOLLA-THEME-SWITCH END == */
