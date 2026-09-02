/* Applier data-i18n* — źródło prawdy dla bloku KOLLA-I18N-APPLY.
 *
 * Wklejany bajtowo identycznie do generator.html, validator.html i index.html przez
 * tools/sync-blocks.sh; rozjazd kopii wywala tools/check-blocks.sh. Nie ma tu `<script src>`,
 * bo narzędzia są samodzielnymi plikami HTML działającymi z file://.
 *
 * DLACZEGO FAKTORYZACJA DOPIERO TERAZ (#69). Zgłoszenie opisywało przeszkodę: bloku nie da
 * się wkleić bajtowo, bo każda kopia otwierała się kluczami właściwymi dla swojej strony —
 * `v.title` / `v.desc` w walidatorze, `hub.title` / `hub.desc` w hubie. Ta przeszkoda
 * zniknęła: wszystkie cztery klucze mają dziś kotwice w markupie (`data-i18n` na <title>,
 * `data-i18n-content` na <meta>), więc applier nie musi znać ani jednej nazwy klucza.
 * Zniknęła też trzecia różnica — walidator ustawiał `nav.tools` ręcznie, a dziś <nav> ma
 * `data-i18n-label` jak w hubie.
 *
 * JEDNA LISTA FORM, NIE DRABINKA. Ujście każdej formy stoi w definicji formy i pętla je
 * stamtąd czyta. Poprzednio ujścia były wypisane w czterech osobnych pętlach, a w
 * tools/check-i18n-apply.js — w drabince warunków kończącej się gałęzią „w przeciwnym razie
 * aria-label". Przy dopisaniu piątej formy (`data-i18n-content`) drabinka została w tyle za
 * listą i strażnik czytał CUDZE ujście, raportując je jako puste. Lista, którą trzeba
 * zaktualizować w dwóch miejscach, prędzej czy później jest zaktualizowana w jednym.
 *
 * Strażniki mają WŁASNE listy form i to nie jest niekonsekwencja: ich lista jest DEFINICJĄ
 * kategorii, a nie odczytem stanu. Gdyby czytały tę, produkt mógłby zawęzić zakres kontroli,
 * skracając własną listę — czyli strażnik podążałby za kodem zamiast go ograniczać.
 */
/* == KOLLA-I18N-APPLY BEGIN — generowane z i18n-apply.js, nie edytuj w miejscu == */
  /* Forma = atrybut niosący klucz plus UJŚCIE, do którego trafia tekst. `null` znaczy
     treść elementu; wszystko inne to nazwa atrybutu. Dopisanie formy to jedna linia. */
  var I18N_FORMS = [
    { attr: "data-i18n",         sink: null },
    { attr: "data-i18n-ph",      sink: "placeholder" },
    { attr: "data-i18n-title",   sink: "title" },
    { attr: "data-i18n-label",   sink: "aria-label" },
    { attr: "data-i18n-content", sink: "content" }
  ];

  function applyI18n() {
    for (var f = 0; f < I18N_FORMS.length; f++) {
      var form = I18N_FORMS[f];
      var nodes = document.querySelectorAll("[" + form.attr + "]");
      for (var i = 0; i < nodes.length; i++) {
        var text = T(nodes[i].getAttribute(form.attr));
        if (form.sink === null) nodes[i].innerHTML = text;
        else nodes[i].setAttribute(form.sink, text);
      }
    }
  }
/* == KOLLA-I18N-APPLY END == */
