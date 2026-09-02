#!/usr/bin/env node
/* DOSTĘPNOŚĆ, mierzona na WYRENDEROWANEJ stronie i na ARKUSZACH (#17).
 *
 * Osiem pytań, wszystkie rozstrzygalne maszynowo:
 *
 *   1. czy każdy element interaktywny ma ŹRÓDŁO nazwy dostępnej,
 *   2. czy każde pole formularza ma etykietę,
 *   3. czy kolejność nagłówków nie przeskakuje poziomów,
 *   4. czy rzecz klikalna jest elementem, który przeglądarka sama wstawia w kolejność
 *      tabulacji,
 *   5. czy nikt nie przestawił tej kolejności dodatnim tabindeksem ani nie wypiął
 *      z niej elementu, który został w drzewie dostępności,
 *   6. czy pierścień fokusu istnieje i nie jest zdejmowany bez zamiennika,
 *   7. czy kontener diagnostyki ogłasza się sam,
 *   8. czy pole oznaczone jako niepoprawne mówi, CO jest nie tak.
 *
 * ============================================================================
 * DOWODZIMY KONSTRUKCJI, NIE ZACHOWANIA — i to jest przesunięta granica tego pliku,
 * nazwana tu od nowa, bo poprzednia wersja mówiła po prostu „klawiatura poza zakresem".
 *
 * Pytania 4-8 nie naciskają Taba. Sprawdzają, czy interfejs jest ZBUDOWANY tak, że
 * przeglądarka obsłuży klawiaturę sama: natywnie fokusowalny element trafia w kolejność
 * tabulacji bez niczyjej pomocy, dodatni tabindex tę kolejność psuje globalnie, a region
 * z aria-live ogłasza zmianę bez przenoszenia fokusu. To są własności DOM-u i arkusza,
 * więc dają się zmierzyć jednym zrzutem.
 *
 * CZEGO TAK ZMIERZYĆ NIE MOŻNA I DLACZEGO AKURAT TEGO. Zdarzenie klawiatury wstrzyknięte
 * skryptem NIE JEST zdarzeniem zaufanym: `isTrusted` ma fałsz, a przeglądarka nie
 * przesuwa po nim fokusu. Sonda „naciskająca Tab" przesuwałaby więc wyłącznie własną
 * zmienną i raportowała przejście, którego nie było — pomiar udawany, czyli trzeci wariant
 * pustego zielonego z docs/PRINCIPLES.md. Prawdziwe przejście Tabem wymaga sterowania
 * przeglądarką z zewnątrz, a to jest protokół DevTools i własny klient WebSocket, czyli
 * klasa odrzucona niżej z tego samego powodu co drzewo dostępności.
 *
 * DLATEGO PRAWDZIWE PRZEJŚCIE JEST PROCEDURĄ RĘCZNĄ: docs/MANUAL-CHECKS.md, dziesięć
 * minut, z datą ostatniego wykonania wpisywaną w plik. To NIE jest strażnik i nic go nie
 * egzekwuje — i właśnie dlatego stoi w osobnym dokumencie, a nie w tym nagłówku jako
 * zdanie o dobrych intencjach.
 *
 * Konstrukcja poprawna nie dowodzi, że da się przejść. Konstrukcja zepsuta dowodzi, że
 * się nie da. Ten plik odpowiada wyłącznie na drugie pytanie i tyle znaczy jego zieleń.
 * ============================================================================
 *
 * ============================================================================
 * DLACZEGO NIE DRZEWO DOSTĘPNOŚCI, CHOĆ TAK BRZMIAŁ PLAN
 *
 * Plan zakładał `--dump-accessibility-tree`, bo to byłby pomiar SKUTKU: gotowa nazwa
 * policzona przez przeglądarkę, nie nasza rekonstrukcja. Zmierzone przed napisaniem
 * czegokolwiek, na Chrome 152.0.7977.64 w tym obrazie: flaga NIE PRODUKUJE ŻADNEGO
 * WYJŚCIA — ani na stdout, ani na stderr, kod wyjścia 0. Nie jest to awaria środowiska,
 * tylko flaga, której w headless nie ma.
 *
 * Drugą drogą byłby protokół DevTools przez własnego klienta WebSocket. Odrzucone:
 * implementacja cudzego protokołu ręcznie to dokładnie klasa, przed którą ostrzega
 * ADR-003 — trzeci przybliżony parser w tym repozytorium, tym razem z autorytetem
 * czegoś, co wygląda na klienta CDP.
 *
 * Zostaje pomiar na DOM-ie po wykonaniu skryptów, tą samą drogą co check-rendered.js.
 * ============================================================================
 * CO TO ZNACZY DLA ZAKRESU, powiedziane wprost, bo zieleń ma znaczyć tyle, ile znaczy
 *
 * NIE LICZYMY NAZWY DOSTĘPNEJ. Liczymy, czy istnieje ŹRÓDŁO nazwy: własny tekst,
 * aria-label, aria-labelledby wskazujące na istniejący element, title, alt, etykieta
 * powiązana z polem. Kryterium jest więc jednostronne i celowo:
 *
 *   wykrywa   BRAK WSZYSTKICH źródeł naraz — wtedy nazwy nie ma i nie może być
 *   przepuszcza  źródło obecne, ale rozwijające się do pustego napisu
 *
 * Fałszywego alarmu nie wyprodukuje; przeoczyć może. To jest właściwa strona pomyłki
 * dla strażnika, który dopiero powstaje, i jest to granica, a nie niedopatrzenie.
 *
 * PUŁAPKI FOKUSA POZOSTAJĄ POZA ZAKRESEM. Pułapka to zdanie o SEKWENCJI — „stąd nie da
 * się wyjść dalej" — a nie o pojedynczym elemencie, więc żadna konstrukcja jej nie
 * wyklucza i żaden zrzut jej nie pokaże. Modal bez zarządzania fokusem, element
 * przechwytujący klawisze, iframe cudzego pochodzenia: wszystkie trzy mają poprawną
 * konstrukcję każdego węzła z osobna. To jest pierwsza pozycja procedury ręcznej.
 *
 * KOLEJNOŚĆ TABULACJI W SENSIE „czy jest sensowna" też jest poza zakresem. Kryterium 5
 * wyklucza jej JAWNE przestawienie, i na tym kończy się to, co da się rozstrzygnąć bez
 * czytania układu graficznego ze zrozumieniem.
 *
 * PLACEHOLDER NIE JEST ETYKIETĄ. To rozstrzygnięcie, nie surowość: znika po wpisaniu
 * pierwszego znaku, więc pole bez etykiety przestaje mieć nazwę dokładnie wtedy, gdy
 * użytkownik zaczyna z niego korzystać.
 *
 * ============================================================================
 * WERSJA CHROME'A JEST ZMIENNĄ POMIARU, i to jest obserwacja z pierwszego przebiegu,
 * nie przypuszczenie. Zmierzone na Chrome 152.0.7977.64: `--dump-accessibility-tree`
 * nie produkuje wyjścia, a `--dump-dom` produkuje. Ten strażnik stoi więc na DOM-ie,
 * czyli na powierzchni znacznie stabilniejszej niż drzewo dostępności — ale nie na
 * stałej: `querySelectorAll` z selektorem atrybutowym i `aria-hidden` to zachowania
 * standardu, nie tej wersji.
 *
 * PRÓG STABILNOŚCI DO USTALENIA PO, NIE PRZED. Dopóki nie ma drugiego pomiaru na innej
 * wersji, każda liczba opisująca „jak bardzo to zależy od Chrome'a" byłaby liczbą
 * z głowy. Pierwszy przebieg na innej wersji jest tym pomiarem i to on ma tu dopisać
 * zdanie — albo je usunąć.
 * ============================================================================
 *
 * Użycie:
 *     node tools/check-a11y.js
 *     node tools/check-a11y.js --file validator.html      # jeden plik
 *     node tools/check-a11y.js --theme tools/fixtures/theme/one.css   # inny arkusz
 *     node tools/check-a11y.js --focus-files a.css,b.css   # inna lista arkuszy
 *     node tools/check-a11y.js --contrast-only             # bez przeglądarki
 */

var fs = require("fs");
var os = require("os");
var path = require("path");
var cp = require("child_process");
var lib = require("./render-lib");

var root = path.join(__dirname, "..");
var PAGES = ["generator.html", "validator.html", "index.html"];

var fileArg = process.argv.indexOf("--file");
if (fileArg !== -1) PAGES = [process.argv[fileArg + 1]];

/* Sonda wykonuje się W STRONIE, po jej własnych skryptach. Wynik wraca tą samą drogą
   co w check-rendered.js: element <script type="application/json">, czytany ze zrzutu. */
/* ŁATKA W <head>, wstrzykiwana PRZED skryptami strony. Nasłuch kliknięcia nie jest
   własnością DOM-u — `addEventListener` nic po sobie nie zostawia — więc jedyny sposób,
   żeby wiedzieć, KTÓRY element go dostał, to podmienić metodę, zanim strona ją wywoła.
   Sonda na końcu <body> jest na to za późna o cały skrypt narzędzia.

   To jest pomiar KONSTRUKCJI, a nie zachowania: pytamy, czy rzecz klikalna jest elementem,
   który przeglądarka sama wstawia w kolejność tabulacji. Czy Tab tam naprawdę dojedzie,
   ten strażnik nie twierdzi — patrz nagłówek. */
var HEAD_PATCH = [
  '<script>',
  '(function () {',
  '  window.__a11yKlik = [];',
  '  var orig = EventTarget.prototype.addEventListener;',
  '  EventTarget.prototype.addEventListener = function (t, f, o) {',
  '    if (t === "click" && this && this.nodeType === 1) window.__a11yKlik.push(this);',
  '    return orig.call(this, t, f, o);',
  '  };',
  '})();',
  '</script>'
].join("\n");

function probeFor(steps) { return [
  '<script>',
  '(function () {',
  /* Kroki scenariusza wykonują się TU: po skryptach strony, przed pomiarem. Bez nich
     lista findingów jest pusta, a kryteria (a), (d) i (e) nie mają przedmiotu — pusty
     kontener przechodzi każde z nich i wygląda dokładnie jak przechodzący. */
  '  try { /*KROKI*/ } catch (e) { window.__a11yKrokiPadly = String(e && e.message); }',
  '  function textOf(el) { return (el.textContent || "").replace(/\\s+/g, " ").trim(); }',
  '  function labelledby(el) {',
  '    var v = el.getAttribute("aria-labelledby");',
  '    if (!v) return false;',
  '    var ids = v.split(/\\s+/), any = false;',
  '    for (var i = 0; i < ids.length; i++) { if (document.getElementById(ids[i])) any = true; }',
  '    return any;',
  '  }',
  '  function hasLabelElement(el) {',
  '    if (el.id && document.querySelector(\'label[for="\' + el.id + \'"]\')) return true;',
  '    var p = el.parentNode;',
  '    while (p && p.nodeType === 1) { if (p.tagName === "LABEL") return true; p = p.parentNode; }',
  '    return false;',
  '  }',
  '  /* aria-hidden ZDEJMUJE element z drzewa dostępności razem z poddrzewem, więc',
  '     nazwa jest mu niepotrzebna z definicji. Pierwszy pomiar na zastanym interfejsie',
  '     zgłosił trzy takie pola — ukryte inputy typu file, wyzwalane widocznym',
  '     przyciskiem — i to była wada KRYTERIUM, nie interfejsu. Złapane przez pomiar',
  '     wykonany PRZED jakąkolwiek naprawą, co jest całym powodem tej kolejności. */',
  '  function ariaHidden(el) {',
  '    var p = el;',
  '    while (p && p.nodeType === 1) {',
  '      if (p.getAttribute("aria-hidden") === "true") return true;',
  '      p = p.parentNode;',
  '    }',
  '    return false;',
  '  }',
  '  function where(el) {',
  '    return el.tagName.toLowerCase() +',
  '           (el.id ? "#" + el.id : "") +',
  '           (el.className && typeof el.className === "string" && el.className',
  '              ? "." + el.className.split(/\\s+/)[0] : "");',
  '  }',
  '  /* Natywnie fokusowalne = przeglądarka wstawia to w kolejność tabulacji SAMA, bez',
  "     tabindex. Lista jest zamknięta i taka ma zostać: [role='button'] na <div> jest",
  '     dokładnie tym, czego to kryterium szuka, a nie zwolnieniem od niego. */',
  '  var FOCUSABLE = { BUTTON: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, SUMMARY: 1 };',
  '  function focusable(el) {',
  '    if (FOCUSABLE[el.tagName]) return true;',
  '    if (el.tagName === "A" && el.hasAttribute("href")) return true;',
  '    return false;',
  '  }',
  '  function maFokusowalnegoPotomka(el) {',
  '    return el.querySelectorAll("button, a[href], input, select, textarea, summary").length > 0;',
  '  }',
  '  /* Czy w środku jest cokolwiek, co ZAPRASZA do kliknięcia, a fokusu nie przyjmuje.',
  '     Kursor jest jedynym sygnałem, jaki DOM naprawdę niesie o tym, gdzie użytkownik',
  '     spróbuje kliknąć. Element bez tego sygnału może mieć nasłuch i nie być wadą —',
  '     nikt nie próbuje go kliknąć. */',
  '  function cosWyglada(el) {',
  '    var w = [el].concat(Array.prototype.slice.call(el.querySelectorAll("*")));',
  '    for (var i2 = 0; i2 < w.length; i2++) {',
  '      if (focusable(w[i2])) continue;',
  '      if (getComputedStyle(w[i2]).cursor === "pointer") return true;',
  '    }',
  '    return false;',
  '  }',
  '  var out = { names: [], labels: [], headings: [],',
  '              klik: [], tabidx: [], live: [], opis: [] };',
  '',
  '  /* Pola formularza NIE wchodzą do kontroli nazwy — ma je ostrzejsze kryterium',
  '     etykiety niżej. Inaczej jedno pole bez etykiety zgłaszałoby się dwa razy, a lista',
  '     robocza mierzyłaby liczbę kryteriów zamiast liczby wad. */',
  '  var INTERACTIVE = "a[href], button, summary, [role=\'button\']";',
  '  var els = document.querySelectorAll(INTERACTIVE);',
  '  for (var i = 0; i < els.length; i++) {',
  '    var el = els[i];',
  '    if (el.type === "hidden" || ariaHidden(el)) continue;',
  '    var img = el.querySelector ? el.querySelector("img[alt]") : null;',
  '    var named = !!(textOf(el) || el.getAttribute("aria-label") || labelledby(el) ||',
  '                   el.getAttribute("title") || (img && img.getAttribute("alt")) ||',
  '                   ((el.tagName === "INPUT" || el.tagName === "SELECT" ||',
  '                     el.tagName === "TEXTAREA") && hasLabelElement(el)) ||',
  '                   (el.tagName === "INPUT" && el.value));',
  '    if (!named) out.names.push(where(el));',
  '  }',
  '',
  '  var fields = document.querySelectorAll("input, select, textarea");',
  '  for (var j = 0; j < fields.length; j++) {',
  '    var f = fields[j];',
  '    if (f.type === "hidden" || ariaHidden(f)) continue;',
  '    if (hasLabelElement(f) || f.getAttribute("aria-label") || labelledby(f)) continue;',
  '    out.labels.push(where(f));',
  '  }',
  '',
  '',
  '  /* (a) KLIKALNE MUSI BYĆ FOKUSOWALNE.',
  '     Wyjątek dla DELEGACJI jest konieczny i nie jest wygodą: nasłuch na kontenerze,',
  '     w którym prawdziwe cele są przyciskami, to konstrukcja poprawna i najczęstsza.',
  '     Zmierzone na zastanym interfejsie PRZED naprawami: ul#findings walidatora ma nasłuch',
  '     kliknięcia, a jego celem są <button class="f-line">. Kryterium bez tego wyjątku',
  '     oskarżyłoby element zbudowany dobrze — i to jest przynęta w fixturze.',
  '',
  '     Kontener PUSTY też przechodzi, i to nie jest złagodzenie: w pustym elemencie nie ma',
  '     czego kliknąć. Zmierzone: ul#findings w stanie początkowym jest pusty, a w scenariuszu',
  '     "przykład z błędami" ma w środku przyciski — ten sam element wypadał raz jako',
  '     naruszenie, a raz jako poprawny, wyłącznie dlatego, że pierwszy pomiar oglądał go bez',
  '     zawartości. Po to są tu dwa przebiegi na stronę zamiast jednego.',
  '',
  '     Kontener, w którym NIC nie wygląda na klikalne, też przechodzi — i to nie jest',
  '     złagodzenie. Zmierzone: ul#findings walidatora ma nasłuch, a w stanie początkowym',
  '     w środku jest wyłącznie zdanie zachęty; kryterium patrzące na sam nasłuch oskarżało',
  '     ten element także wtedy, i był to fałszywy alarm.',
  '',
  '     Atrybut onclick w markupie wyjątku NIE dostaje: nazywa element wprost, więc o żadnej',
  '     delegacji nie ma mowy. */',
  '  var klikacze = (window.__a11yKlik || []).slice();',
  '  var zNasluchu = klikacze.length;',
  '  var inline = document.querySelectorAll("[onclick]");',
  '  for (var q1 = 0; q1 < inline.length; q1++) klikacze.push(inline[q1]);',
  '  var widziane = [];',
  '  for (var w1 = 0; w1 < klikacze.length; w1++) {',
  '    var kl = klikacze[w1];',
  '    if (!kl || kl.nodeType !== 1) continue;',
  '    if (kl === document.body || kl === document.documentElement) continue;',
  '    if (widziane.indexOf(kl) !== -1) continue;',
  '    widziane.push(kl);',
  '    if (ariaHidden(kl) || focusable(kl)) continue;',
  '    if (w1 < zNasluchu && maFokusowalnegoPotomka(kl)) continue;',
  '    if (w1 < zNasluchu && !cosWyglada(kl)) continue;',
  '    out.klik.push(where(kl) + (w1 < zNasluchu ? "" : "  (onclick w markupie)"));',
  '  }',
  '',
  '  /* (b) TABINDEX. Dodatni przestawia kolejność tabulacji wobec kolejności dokumentu i psuje',
  '     ją globalnie: jeden taki atrybut wypycha WSZYSTKIE elementy bez tabindex na koniec.',
  '     Wartość -1 jest legalna wyłącznie na tym, co i tak jest zdjęte z drzewa dostępności;',
  '     na elemencie widocznym znaczy "da się tu dojść myszą, ale nie Tabem". */',
  '  var ti = document.querySelectorAll("[tabindex]");',
  '  for (var t2 = 0; t2 < ti.length; t2++) {',
  '    var tv = ti[t2].getAttribute("tabindex"), tn = parseInt(tv, 10);',
  '    if (tn > 0) out.tabidx.push("tabindex=" + tv + " (dodatni)  " + where(ti[t2]));',
  '    else if (tn < 0 && !ariaHidden(ti[t2])) {',
  '      out.tabidx.push("tabindex=-1 na elemencie W DRZEWIE  " + where(ti[t2]));',
  '    }',
  '  }',
  '',
  '  /* (d) KONTENER DIAGNOSTYKI OGŁASZA SIĘ SAM. Lista findingów zmienia się bez zmiany',
  '     fokusu, więc czytnik ekranu nie ma skąd wiedzieć, że coś się stało — chyba że region',
  '     jest żywy. Podmiotem jest LISTA, a nie pasek werdyktu obok: pasek mówi "są',
  '     zastrzeżenia", a treść jest w liście. */',
  '  var LIVE = ["#diag", "#findings"];',
  '  for (var L = 0; L < LIVE.length; L++) {',
  '    var box = document.querySelector(LIVE[L]);',
  '    if (!box) continue;',
  '    if (box.getAttribute("aria-live") !== "polite") {',
  '      out.live.push(LIVE[L] + "  aria-live=" + JSON.stringify(box.getAttribute("aria-live")));',
  '    }',
  '  }',
  '',
  '  /* (e) POLE NIEPOPRAWNE MÓWI, CO JEST NIE TAK. aria-invalid bez opisu to czerwona ramka',
  '     i nic więcej, czyli informacja wyłącznie dla patrzących. Wymagamy, żeby',
  '     aria-describedby wskazywał element ISTNIEJĄCY i niosący tekst, i żeby wśród',
  '     wskazanych był inny niż sama podpowiedź do pola: podpowiedź stoi tam zawsze i nie',
  '     jest findingiem. Podpowiedzi mają w tym interfejsie identyfikatory "h-<pole>". */',
  '  var zle = document.querySelectorAll("[aria-invalid=\'true\']");',
  '  for (var z1 = 0; z1 < zle.length; z1++) {',
  '    var pole = zle[z1];',
  '    var ids = (pole.getAttribute("aria-describedby") || "").split(/\\s+/);',
  '    var istnieje = 0, niosace = 0;',
  '    for (var y1 = 0; y1 < ids.length; y1++) {',
  '      if (!ids[y1]) continue;',
  '      var cel = document.getElementById(ids[y1]);',
  '      if (!cel) continue;',
  '      istnieje++;',
  '      if (textOf(cel) && ids[y1].indexOf("h-") !== 0) niosace++;',
  '    }',
  '    if (!istnieje) out.opis.push(where(pole) + "  aria-describedby nie wskazuje NICZEGO");',
  '    else if (!niosace) out.opis.push(where(pole) + "  opisy są tylko podpowiedziami do pola");',
  '  }',
  '',
  '  var hs = document.querySelectorAll("h1, h2, h3, h4, h5, h6"), prev = 0;',
  '  for (var k = 0; k < hs.length; k++) {',
  '    var lvl = +hs[k].tagName.slice(1);',
  '    if (prev && lvl > prev + 1) {',
  '      out.headings.push("h" + prev + " -> h" + lvl + "  " + textOf(hs[k]).slice(0, 40));',
  '    }',
  '    prev = lvl;',
  '  }',
  '',
  '  var s = document.createElement("script");',
  '  s.type = "application/json"; s.id = "__a11y_out";',
  '  s.textContent = JSON.stringify(out);',
  '  document.body.appendChild(s);',
  '})();',
  '</script>'
].join("\n").replace("/*KROKI*/", steps || ""); }

function cleanup(tmp, dir) {
  try { if (tmp) fs.unlinkSync(tmp); } catch (e) { /* nie jest wynikiem testu */ }
  try { if (dir) fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* jw. */ }
}

function audit(chrome, file, steps) {
  var srcPath = path.join(root, file);
  var src = fs.readFileSync(srcPath, "utf8");
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), "kolla-a11y-"));
  /* Sama nazwa pliku, nie ścieżka: fixtura leży w podkatalogu, a katalog tymczasowy
     jest płaski. */
  var tmp = path.join(dir, path.basename(file));
  var probe = probeFor(steps);
  fs.writeFileSync(tmp, src.replace("<head>", "<head>\n" + HEAD_PATCH)
                            .replace("</body>", probe + "\n</body>"));
  /* Ta sama gwarancja co w check-rendered.js: kopia różni się od źródła WYŁĄCZNIE
     wstrzykniętymi wycinkami. Inaczej mierzylibyśmy plik, którego nikt nie wdroży.
     Wycinki są teraz dwa, bo jeden z nich MUSI stać przed skryptami strony. */
  var back = fs.readFileSync(tmp, "utf8");
  if (back.replace(probe + "\n", "").replace("\n" + HEAD_PATCH, "") !== src) {
    cleanup(tmp, dir);
    throw new Error(file + ": kopia różni się od źródła nie tylko sondą");
  }
  var url = "file:///" + tmp.replace(/\\/g, "/").replace(/^\//, "");
  var dom;
  try {
    dom = cp.execSync(JSON.stringify(chrome) +
      " --headless --disable-gpu --no-sandbox --dump-dom --virtual-time-budget=4000 " +
      JSON.stringify(url),
      { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).toString();
  } finally {
    cleanup(tmp, dir);
  }
  var m = dom.match(/<script type="application\/json" id="__a11y_out">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(file + ": sonda nie wypisała wyniku — czy JS się wykonał?");
  return JSON.parse(m[1]);
}

/* OBA MOTYWY, nie jeden. Motyw jasny wszedł razem z pomiarem (#16), a nie z obietnicą:
   jego wartości nie są odwróceniem ciemnych, bo odwrócenie kanałów daje kontrast, który
   wygląda na policzony i nie jest. Zestawy czytamy z tych samych bloków, w których żyją —
   `:root{…}` to ciemny, `:root[data-theme="light"]{…}` to jasny. */
var THEMES = {};
(function () {
  /* Ścieżka podmienialna argumentem, żeby dowód, że kontrola potrafi upaść, był TESTEM,
     a nie czynnością wykonaną raz w dniu, w którym powstawała. */
  var tArg = process.argv.indexOf("--theme");
  var themeFile = tArg !== -1 ? path.resolve(process.argv[tArg + 1])
                              : path.join(root, "theme.css");
  var css;
  try {
    css = fs.readFileSync(themeFile, "utf8");
  } catch (e) {
    console.error("BŁĄD: nie mogę odczytać " + themeFile + " — " + e.message);
    console.error("     Kontrast liczy się z tokenów; bez pliku nie ma czego policzyć,");
    console.error("     a pominięta kontrola wygląda tak samo jak kontrola, która przeszła.");
    process.exit(2);
  }
  function tokensOf(block) {
    var out = {}, re = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g, m;
    while ((m = re.exec(block))) out[m[1]] = m[2];
    return out;
  }
  function blockAfter(marker) {
    var i = css.indexOf(marker);
    if (i === -1) return "";
    var open = css.indexOf("{", i);
    var close = css.indexOf("}", open);
    return css.slice(open, close);
  }
  var dark = tokensOf(blockAfter("\n:root{"));
  var light = tokensOf(blockAfter('[data-theme="light"]'));
  /* Kod 2, nie 1 ani 0. Brak drugiego zestawu nie znaczy „drugi motyw jest w porządku"
     — znaczy, że nie było czego zmierzyć. Gdyby scalenie niżej pobrało wtedy same
     wartości ciemne, strażnik wypisałby dwie identyczne linie i nazwał je dwoma
     motywami: zieleń przy NIEOBECNYM przedmiocie, dokładnie ta klasa awarii, którą
     ten katalog strażników już raz zapłacił. */
  if (!Object.keys(light).length) {
    console.error("BŁĄD: " + themeFile + " nie ma bloku :root[data-theme=\"light\"].");
    console.error("     Drugi zestaw tokenów NIE ZOSTAŁ zmierzony — to nie to samo,");
    console.error("     co zmierzony i poprawny.");
    process.exit(2);
  }
  /* Jasny dziedziczy to, czego sam nie nadpisuje — tak jak w kaskadzie. */
  var merged = {};
  Object.keys(dark).forEach(function (k) { merged[k] = dark[k]; });
  Object.keys(light).forEach(function (k) { merged[k] = light[k]; });
  THEMES = { ciemny: dark, jasny: merged };
})();

/* Kontrast liczy się z pliku, a nazwy i etykiety wymagają przeglądarki. Rozdzielenie
   jest po to, żeby fixtura arkusza kosztowała odczyt pliku, a nie trzy przebiegi
   Chrome'a — i żeby brak drugiego zestawu tokenów był widoczny PRZED nimi. */
var contrastOnly = process.argv.indexOf("--contrast-only") !== -1;

var chrome = contrastOnly ? null : lib.findChrome();
if (!chrome && !contrastOnly) {
  console.error("FAIL brak przeglądarki do pomiaru dostępności. Ustaw CHROME=/ścieżka/do/chrome.");
  console.error("     Kontrola dostępności NIE jest pomijana po cichu: bez przeglądarki");
  console.error("     nie ma wyrenderowanej strony, a nazwa dostępna jest jej własnością.");
  process.exit(2);
}
if (!contrastOnly) console.log("przeglądarka: " + chrome);

/* PRZEBIEGI. Stan początkowy każdej strony plus DWA scenariusze, w których lista
   findingów jest niepusta — bo kryteria klawiaturowe bez findingów nie mają przedmiotu,
   a pusty kontener przechodzi je wszystkie i wygląda przy tym jak przechodzący.

   Scenariusze są WYBRANE Z tools/render-lib.js, a nie napisane tutaj. Drugi zestaw byłby
   drugą odpowiedzią na pytanie „co użytkownik uruchamia" i te dwie odpowiedzi rozjechałyby
   się przy pierwszym dopisanym scenariuszu — cicho, bo obie dalej by przechodziły. */
var SCENARIUSZE = [
  { file: "validator.html", name: "przykład z błędami" },
  { file: "generator.html", name: "KV-10: interfejs zewnętrzny na urządzeniu zarządzania" }
].map(function (want) {
  var m = lib.FILES.filter(function (f) {
    return f.file === want.file && f.name === want.name;
  })[0];
  if (!m) {
    console.error("BŁĄD: w tools/render-lib.js nie ma scenariusza " +
                  want.file + " / " + want.name + ".");
    console.error("     Nazwa scenariusza jest tu ODNOŚNIKIEM, nie kopią: gdyby wolno");
    console.error("     jej było nie trafić, strażnik po cichu mierzyłby stan początkowy");
    console.error("     i nie miałby ani jednego findingu do obejrzenia.");
    process.exit(2);
  }
  return m;
});

/* --file zawęża pomiar do jednego pliku, więc scenariusze cudzych stron do niego nie
   dochodzą: fixtura ma być mierzona sama, inaczej jej wynik niesie cudze pozycje. */
var PRZEBIEGI = PAGES.map(function (f) { return { file: f, name: "stan początkowy", steps: "" }; })
  .concat((contrastOnly || fileArg !== -1) ? [] : SCENARIUSZE);

var bad = 0;
(contrastOnly ? [] : PRZEBIEGI).forEach(function (p) {
  var file = p.file;
  var etyk = file + " [" + p.name + "]";
  var r = audit(chrome, file, p.steps);
  var n = r.names.length + r.labels.length + r.headings.length +
          r.klik.length + r.tabidx.length + r.live.length + r.opis.length;
  if (!n) { console.log("OK   " + etyk + " — konstrukcja obsługi klawiaturą w porządku"); return; }
  bad += n;
  console.log("FAIL " + etyk + " — " + n + " pozycji:");
  r.names.forEach(function (x) { console.log("  bez ŹRÓDŁA NAZWY        " + x); });
  r.labels.forEach(function (x) { console.log("  pole bez ETYKIETY       " + x); });
  r.headings.forEach(function (x) { console.log("  PRZESKOK POZIOMU        " + x); });
  r.klik.forEach(function (x) { console.log("  KLIK BEZ FOKUSU         " + x); });
  r.tabidx.forEach(function (x) { console.log("  KOLEJNOŚĆ TABULACJI     " + x); });
  r.live.forEach(function (x) { console.log("  REGION NIEŻYWY          " + x); });
  r.opis.forEach(function (x) { console.log("  POLE BEZ OPISU BŁĘDU    " + x); });
});

/* ---- KONTRAST, liczony z TOKENÓW, nie ze zrzutu ekranu -----------------------
 *
 * Pary tło/tekst stoją w theme.css jako zmienne, a WCAG to arytmetyka na luminancji
 * względnej — więc pomiar nie potrzebuje ani przeglądarki, ani obrazu. Zrzut ekranu
 * byłby tu gorszy, nie lepszy: mierzyłby piksele po antyaliasingu, czyli coś innego
 * niż to, co przeglądarka uznaje za kolor tekstu.
 *
 * PARY SĄ WYPISANE, i to jest granica. Nie wyprowadzamy ich z CSS-u, bo wymagałoby to
 * rozstrzygania kaskady — a kaskada jest dokładnie tym, czego nie da się policzyć bez
 * przeglądarki. Para, której nikt tu nie wpisał, nie jest sprawdzona; lista ma być
 * czytana jak lista, a nie jak wyczerpanie tematu.
 *
 * PRÓG 4.5:1 to WCAG 2.1 AA dla tekstu zwykłego. Tekst duży ma niższy próg (3:1), ale
 * rozmiar zależy od reguły CSS, nie od tokenu — więc stosujemy próg ostrzejszy dla
 * wszystkiego. Pomyłka idzie w stronę zawyżonego wymagania, nie zaniżonego. */

function channel(v) {
  var c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  var h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function ratio(a, b) {
  var la = luminance(a), lb = luminance(b);
  var hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/* Pary FAKTYCZNIE występujące w arkuszach, sprawdzone gripem po `color:var(--x)`
   obok `background:var(--y)`. Nie każda kombinacja tokenów jest parą. */
/* Pary są parami FAKTYCZNIE WYSTĘPUJĄCYMI na ekranie, nie iloczynem kartezjańskim
   tokenów. Iloczyn dałby setki liczb, z których większość opisuje zestawienie, którego
   żadna reguła nie tworzy — a strażnik, który każe naprawiać nieistniejące, zostaje
   wyłączony przy pierwszej niewygodzie.

   Druga połowa listy weszła z #16 razem z tokenami, które nazwała: dopóki kolor siedział
   w regule jako `#0c1116`, nie było czego wpisać do pary, więc tekst edytora, numeracja
   linii i podświetlenie składni nie były mierzone WCALE. To nie jest zaostrzenie progu,
   tylko poszerzenie przedmiotu — ta sama klasa, co nowy scenariusz w innym mierniku. */
var PAIRS = [
  ["fg", "bg"], ["muted", "bg"], ["dim", "bg"],
  ["fg", "panel"], ["muted", "panel"], ["dim", "panel"],
  ["fg", "panel-2"], ["muted", "panel-2"],
  ["blue", "bg"], ["blue", "panel"],
  ["accent", "panel"], ["accent", "bg"],
  ["amber", "panel"], ["red", "panel"],
  /* pola wejściowe i edytor */
  ["fg", "sunken"], ["code-fg", "sunken"], ["gutter-fg", "gutter-bg"],
  /* podświetlenie składni na tle edytora */
  ["syn-c", "sunken"], ["syn-k", "sunken"], ["syn-p", "sunken"], ["syn-v", "sunken"],
  /* tekst pomocniczy i plakietki */
  ["fg-soft", "panel"], ["fg-soft", "bg"], ["muted", "chip"], ["dim", "chip-2"],
  ["knob", "track"],
  /* przyciski i stany */
  ["on-accent", "accent-dim"], ["fg", "hover"], ["accent", "chip"],
  ["blue-hover", "panel"], ["amber", "warn-bg"], ["red", "err-bg"]
];
var AA = 4.5;
var lowContrast = [];
Object.keys(THEMES).forEach(function (theme) {
  var TOK = THEMES[theme];
  PAIRS.forEach(function (p) {
    var fg = TOK[p[0]], bg = TOK[p[1]];
    if (!fg || !bg) {
      lowContrast.push(theme + ": brak tokenu --" + p[0] + " / --" + p[1]); return;
    }
    var r = ratio(fg, bg);
    if (r < AA) {
      lowContrast.push(theme + ": --" + p[0] + " na --" + p[1] + " = " + r.toFixed(2) +
                       ":1  (próg " + AA + ")");
    }
  });
});
/* ---- (c) PIERŚCIEŃ FOKUSU, czytany z REGUŁ, nie ze strony -------------------
 *
 * Tu, obok kontrastu, i z tego samego powodu: to jest własność ARKUSZA, a nie stanu
 * przeglądarki. `outline` zdjęty bez zamiennika jest widoczny wyłącznie dla kogoś, kto
 * akurat idzie Tabem — czyli dla tej jednej osoby, dla której ma znaczenie, i dla nikogo,
 * kto patrzy na zrzut ekranu.
 *
 * DWA ZDANIA, NIE JEDNO:
 *   1. theme.css musi w ogóle znać `:focus-visible` — bez tego cały wspólny motyw nie ma
 *      pojęcia o klawiaturze i każda strona musi wymyślać to sama.
 *   2. Żadna reguła stanu fokusu nie może zdejmować obrysu, nie dając nic widocznego
 *      w zamian. `outline:none` PLUS `box-shadow` to konstrukcja poprawna i częsta —
 *      obrys prostokątny bywa brzydki przy zaokrąglonych rogach — więc kryterium pyta
 *      o ZAMIENNIK, a nie o samo słowo.
 *
 * Granica: to nie mówi, czy zamiennik jest WIDOCZNY. Kontrast pierścienia wobec tła
 * mierzy sekcja wyżej, i tylko dla par, które ktoś tam wpisał. */
/* Lista podmienialna argumentem, żeby dowód, że kontrola potrafi upaść, był TESTEM,
   a nie czynnością wykonaną raz w dniu, w którym powstawała. Zdanie o :focus-visible
   dotyczy PIERWSZEGO pliku z listy — w produkcie to theme.css, czyli wspólny motyw. */
var FOCUS_PLIKI = ["theme.css", "index.html", "generator.html", "validator.html"];
var ffArg = process.argv.indexOf("--focus-files");
if (ffArg !== -1) FOCUS_PLIKI = String(process.argv[ffArg + 1] || "").split(",").filter(Boolean);
var ZAMIENNIKI = ["box-shadow", "border-color", "background", "text-decoration", "outline:"];
var focusBrak = [];
(function () {
  var maFocusVisible = false;
  FOCUS_PLIKI.forEach(function (f) {
    var tekst;
    try { tekst = fs.readFileSync(path.join(root, f), "utf8"); } catch (e) { return; }
    /* KOMENTARZE ODPADAJĄ PRZED PYTANIEM. Zdanie o :focus-visible napisane w komentarzu
       jest zdaniem o regule, a nie regułą — a różnicy nie widać, dopóki ktoś jej nie
       zmierzy. Zmierzone: fixtura, której komentarz wymienia :focus-visible właśnie po to,
       żeby powiedzieć, że go w niej NIE MA, przechodziła to kryterium. Ten sam kształt
       złapał dziś tools/check-print.js na słowach "@media print" w komentarzu. */
    var bezKomentarzy = tekst.replace(/\/\*[\s\S]*?\*\//g, function (m) {
      /* Komentarz zastąpiony taką samą liczbą końców linii, a nie skasowany: numer linii
         w komunikacie ma wskazywać miejsce w PLIKU, a nie w tekście po obróbce. Strażnik,
         który podaje pozycję o kilkanaście linii obok, jest gorszy od takiego, który nie
         podaje jej wcale — bo tam się idzie i nic tam nie ma. */
      return m.replace(/[^\n]/g, "");
    });
    if (f === FOCUS_PLIKI[0] && /:focus-visible/.test(bezKomentarzy)) maFocusVisible = true;
    var linie = bezKomentarzy.split("\n");
    linie.forEach(function (L, i) {
      if (L.indexOf(":focus") === -1) return;
      if (!/outline\s*:\s*(none|0)\b/.test(L)) return;
      /* Zamiennik musi stać w TEJ SAMEJ regule. Reguła rozbita na kilka linii jest tu
         poza zasięgiem i tak jest napisane, zamiast udawać, że jej nie ma. */
      var reszta = L.replace(/outline\s*:\s*(none|0)\b/, "");
      var ma = ZAMIENNIKI.some(function (z) { return reszta.indexOf(z) !== -1; });
      if (!ma) focusBrak.push(f + ":" + (i + 1) + "  " + L.trim().slice(0, 90));
    });
  });
  if (!maFocusVisible) {
    focusBrak.push(FOCUS_PLIKI[0] +
                   "  nie zna :focus-visible — motyw wspólny nic nie wie o klawiaturze");
  }
})();

console.log("");
if (!focusBrak.length) {
  console.log("pierścień fokusu: " + FOCUS_PLIKI.length +
              " arkuszy, żadna reguła stanu fokusu nie zdejmuje obrysu bez zamiennika");
} else {
  console.log("FAIL pierścień fokusu — " + focusBrak.length + " reguł:");
  focusBrak.forEach(function (x) { console.log("  OBRYS BEZ ZAMIENNIKA    " + x); });
}

console.log("");
/* Najgorsza para wypisana ZAWSZE, także gdy przechodzi. Zieleń bez liczby nie mówi,
   czy motyw ma zapas, czy stoi o setną nad progiem — a to jest cała różnica między
   „sprawdzone" a „bezpieczne przy najbliższej zmianie koloru". */
var worstPer = {};
Object.keys(THEMES).forEach(function (theme) {
  var TOK = THEMES[theme];
  PAIRS.forEach(function (p) {
    if (!TOK[p[0]] || !TOK[p[1]]) return;
    var r = ratio(TOK[p[0]], TOK[p[1]]);
    if (!worstPer[theme] || r < worstPer[theme].r) {
      worstPer[theme] = { r: r, name: "--" + p[0] + " na --" + p[1] };
    }
  });
});
console.log("kontrast: " + PAIRS.length + " par x " + Object.keys(THEMES).length +
            " motywy wobec WCAG AA " + AA + ":1   poniżej progu: " + lowContrast.length);
Object.keys(worstPer).forEach(function (theme) {
  console.log("  najgorsza para, motyw " + theme + ": " + worstPer[theme].name +
              " = " + worstPer[theme].r.toFixed(2) + ":1");
});
lowContrast.forEach(function (x) { console.log("  ZA NISKI KONTRAST  " + x); });
bad += lowContrast.length + focusBrak.length;

if (bad) {
  console.log("");
  console.log("Razem " + bad + " pozycji dostępności.");
  console.log("  Kryteria są JEDNOSTRONNE: wykrywają brak konstrukcji, a nie mierzą");
  console.log("  zachowania — patrz nagłówek. Fałszywego alarmu tu nie ma; przejście");
  console.log("  Tabem pozostaje procedurą ręczną, docs/MANUAL-CHECKS.md.");
  process.exit(1);
}
console.log("\nOK   dostępność: nazwy, etykiety, nagłówki, konstrukcja klawiatury, kontrast");
process.exit(0);
