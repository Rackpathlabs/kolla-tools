/* Test dymny przełącznika motywu (#16).
 *
 * DLACZEGO OSOBNY PLIK, A NIE ASERCJE W guards.test.js. Tam mieszkają strażniki, czyli
 * zdania o KODZIE. To jest zdanie o ZACHOWANIU produktu: trzy stany, ich kolejność,
 * trwałość wyboru i nazwa dostępna, która się z nim zgadza. Strażnik statyczny nie
 * odróżni cyklu poprawnego od cyklu, który omija „za systemem" — a to jest dokładnie
 * ten stan, bez którego przełącznik przestaje umieć wrócić do ustawienia systemu.
 *
 * Argument: plik z wyciętymi blokami <script>, ten sam, który dostają pozostałe testy
 * dymne. Blok przełącznika stoi w <head>, więc wycinek niesie go razem z resztą.
 */
var lib = require("../testlib");

lib.installDom();
var T = lib.loadTool(process.argv[2], ["KOLLA_THEME", "I18N"]);
var R = lib.runner();
var ok = R.ok;

var html = document.documentElement;
var btn = document.getElementById("theme-btn");

console.log("stan początkowy:");
ok("bez zapisu obowiązuje „za systemem”", T.KOLLA_THEME.stan() === "system",
   T.KOLLA_THEME.stan());
ok("i wtedy na <html> NIE MA atrybutu data-theme", !html.hasAttribute("data-theme"),
   JSON.stringify(html.getAttribute("data-theme")));

T.KOLLA_THEME.init(T.I18N.t);
ok("przycisk niesie stan w data-stan", btn.getAttribute("data-stan") === "system",
   btn.getAttribute("data-stan"));
ok("i nazwę dostępną ze słownika",
   btn.getAttribute("aria-label") === T.I18N.dict["nav.theme.system"],
   btn.getAttribute("aria-label"));
ok("klik jest podpięty", btn.listensTo("click"));

console.log("");
console.log("cykl:");
btn.fire("click");
ok("system -> jasny", T.KOLLA_THEME.stan() === "light", T.KOLLA_THEME.stan());
ok("atrybut na <html> pojawia się", html.getAttribute("data-theme") === "light",
   html.getAttribute("data-theme"));
ok("nazwa dostępna idzie za stanem",
   btn.getAttribute("aria-label") === T.I18N.dict["nav.theme.light"],
   btn.getAttribute("aria-label"));
ok("wybór trafia do pamięci", localStorage.getItem("kolla.theme") === "light",
   String(localStorage.getItem("kolla.theme")));

btn.fire("click");
ok("jasny -> ciemny", T.KOLLA_THEME.stan() === "dark", T.KOLLA_THEME.stan());
ok("i to jest WYBÓR, nie powrót do domyślnego: atrybut zostaje",
   html.getAttribute("data-theme") === "dark", html.getAttribute("data-theme"));
ok("nazwa dostępna idzie za stanem",
   btn.getAttribute("aria-label") === T.I18N.dict["nav.theme.dark"],
   btn.getAttribute("aria-label"));

btn.fire("click");
ok("ciemny -> system, czyli cykl się zamyka", T.KOLLA_THEME.stan() === "system",
   T.KOLLA_THEME.stan());
/* TO JEST POWÓD ISTNIENIA TRZECIEGO STANU. Przełącznik dwustanowy potrafi tylko odejść
   od ustawienia systemu i nigdy do niego nie wrócić — od pierwszego kliknięcia zaczyna
   z nim walczyć, a użytkownik nie ma jak tego cofnąć inaczej niż czyszcząc dane strony. */
ok("i atrybut ZNIKA, więc arkusz znów słucha prefers-color-scheme",
   !html.hasAttribute("data-theme"), JSON.stringify(html.getAttribute("data-theme")));
ok("powrót do systemu też jest zapamiętany",
   localStorage.getItem("kolla.theme") === "system",
   String(localStorage.getItem("kolla.theme")));

R.finish();
