#!/usr/bin/env node
/* Kryterium SKUTKU: każdy atrybut data-i18n* produkuje NIEPUSTY tekst.
 *
 * Powód istnienia: generator.html dostał w #59 pięćdziesiąt atrybutów data-i18n
 * i nie dostał kodu, który je czyta. Elementy renderowały się PUSTE — formularz
 * bez nagłówków sekcji, bez podpowiedzi, bez opisów przełączników, bez metek pola
 * wymaganego — przez trzynaście godzin i czterdzieści pięć minut na opublikowanym
 * serwisie. Nie zauważył tego żaden z czterech strażników i każdy z innego powodu:
 *
 *   check-i18n.js       pyta, czy NAZWA KLUCZA występuje w plikach. Występuje —
 *                       w atrybucie. Pytanie o reprezentację, nie o skutek:
 *                       45 martwych kluczy przeszło jako "użyte".
 *   check-dictionary.js mierzy wyrenderowaną stronę, ale pusty element nie ma
 *                       własnego tekstu, więc nie ma czego mierzyć. Zielone przy
 *                       NIEOBECNYM przedmiocie — trzeci wariant pustego zielonego.
 *   check-rendered.js   pyta, czy element z hidden jest widoczny i czy scenariusz
 *                       cokolwiek poruszył. Znikający tekst nie narusza obu zdań.
 *   check-english.js    czyta wartości ze SŁOWNIKA, więc widzi treść, której na
 *                       ekranie nie ma.
 *
 * DLACZEGO OSOBNY PLIK, A NIE DOPISEK DO check-i18n.js. Tamten strażnik ma zapisany
 * w nagłówku warunek, którego nie wolno mu odebrać: czyta klucze Z TEKSTU ŹRÓDŁA,
 * "żeby działać także wtedy, gdy blok jest składniowo zepsuty". Ta kontrola musi
 * WYKONAĆ kod strony, bo inaczej znów mierzyłaby reprezentację. Wykonanie w tamtym
 * pliku zamieniłoby zepsuty blok w zielony wynik — czyli dokładnie tę awarię, przed
 * którą tamto zdanie broni. Dwie kontrole, dwa warunki, dwa pliki.
 *
 * MIERZY SKUTEK, NIE OBECNOŚĆ APPLIERA. Nie pyta "czy w pliku jest querySelectorAll"
 * — to byłaby ta sama pomyłka piętro niżej. Uruchamia blok <script> strony na DOM-ie
 * zbudowanym z JEJ WŁASNEGO markupu i czyta, co elementy dostały. Brak appliera daje
 * zero wypełnionych i czerwony wynik; applier obsługujący trzy formy z czterech daje
 * czerwony na czwartej.
 *
 * Użycie:
 *     node tools/check-i18n-apply.js                      # generator, walidator, hub
 *     node tools/check-i18n-apply.js tools/fixtures/…html  # fixtura
 */

var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var FILES = process.argv.length > 2
  ? process.argv.slice(2)
  : ["generator.html", "validator.html", "index.html"];

/* Cztery formy i ich miejsce docelowe. Lista jest DEFINICJĄ kategorii: atrybut,
   który niesie klucz słownika do konkretnego ujścia. Dopisanie piątej formy bez
   dopisania jej tutaj sprawi, że kontrola jej nie zobaczy — i to jest jedyny
   sposób, w jaki może przestać widzieć, bo reszta idzie z wykonania. */
var FORMS = [
  { attr: "data-i18n",       sink: "treść elementu" },
  { attr: "data-i18n-ph",    sink: "placeholder" },
  { attr: "data-i18n-title", sink: "title" },
  { attr: "data-i18n-label", sink: "aria-label" },
  { attr: "data-i18n-content", sink: "content" }
];

/* ---- minimalny element, który UMIE zapamiętać, co dostał ------------------- */
function makeEl(tag, attrs, line) {
  return {
    tagName: tag.toUpperCase(), _a: attrs, _line: line,
    innerHTML: "", textContent: "", value: "", checked: false,
    disabled: false, style: {}, scrollTop: 0, offsetHeight: 400,
    classList: { toggle: function () {}, add: function () {},
                 remove: function () {}, contains: function () { return false; } },
    setAttribute: function (k, v) { this._a[k] = v; },
    removeAttribute: function (k) { delete this._a[k]; },
    hasAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this._a, k); },
    getAttribute: function (k) {
      return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null;
    },
    addEventListener: function () {}, appendChild: function () {},
    removeChild: function () {}, click: function () {}, select: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
}

/* ---- zbiór elementów niosących klucz, prosto z markupu --------------------- */
function collect(html) {
  var markup = html.replace(/<script[\s\S]*?<\/script>/g, function (m) {
    return m.replace(/[^\n]/g, " ");
  });
  var out = [], tagRe = /<([a-z][a-z0-9]*)\b([^>]*)>/gi, m;
  while ((m = tagRe.exec(markup))) {
    var raw = m[2], attrs = {}, aRe = /([\w-]+)\s*=\s*"([^"]*)"/g, a;
    while ((a = aRe.exec(raw))) attrs[a[1]] = a[2];
    var carries = FORMS.some(function (f) {
      return Object.prototype.hasOwnProperty.call(attrs, f.attr);
    });
    if (!carries) continue;
    out.push(makeEl(m[1], attrs, markup.slice(0, m.index).split("\n").length));
  }
  return out;
}

/* ---- DOM, w którym selektory NAPRAWDĘ coś zwracają ------------------------- */
/* Stub z testlib.js zwraca z querySelectorAll pustą tablicę. Uruchomiona na nim
   ta kontrola byłaby zielona zawsze i przy każdym pliku — zielone przy nieobecnym
   przedmiocie, po raz kolejny. Dlatego DOM jest tutaj, a nie tam. */
function installDom(els) {
  var byId = Object.create(null);
  var anon = function (id) { return byId[id] || (byId[id] = makeEl("div", {}, 0)); };
  els.forEach(function (e) { if (e._a.id) byId[e._a.id] = e; });

  function selectorMatch(sel) {
    var m = /^\[([\w-]+)\]$/.exec(String(sel).trim());
    if (!m) return null;
    return m[1];
  }
  global.document = {
    getElementById: function (id) { return anon(id); },
    createElement: function (t) { return makeEl(t || "div", {}, 0); },
    addEventListener: function () {},
    body: makeEl("body", {}, 0),
    documentElement: makeEl("html", {}, 0),
    querySelector: function () { return null; },
    querySelectorAll: function (sel) {
      var attr = selectorMatch(sel);
      if (!attr) return [];
      return els.filter(function (e) {
        return Object.prototype.hasOwnProperty.call(e._a, attr);
      });
    },
    execCommand: function () { return true; }
  };
  global.window = {
    isSecureContext: false,
    getComputedStyle: function () { return { lineHeight: "21px", fontSize: "13px" }; },
    addEventListener: function () {}, removeEventListener: function () {}
  };
  global.getComputedStyle = global.window.getComputedStyle;
  global.navigator = {};
  global.setInterval = function () { return 0; };
  global.clearInterval = function () {};
  global.localStorage = {
    _m: {},
    setItem: function (k, v) { this._m[k] = String(v); },
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null;
    },
    removeItem: function (k) { delete this._m[k]; }
  };
}

/* ---- pomiar ---------------------------------------------------------------- */
/* Pusty jest napis, który po podstawieniu nie niesie ani jednego znaku poza
   odstępem. NIE używamy tu fałszywości: wartość "0" jest tekstem i ma zostać
   policzona jako wypełniona. Licznik na !text uznałby ją za brak — to jest
   dokładnie ta klasa pomyłki, którą fixtura sprawdza przynętą. */
function blank(v) {
  return v === undefined || v === null || String(v).replace(/\s+/g, "") === "";
}

var rc = 0, totalChecked = 0, totalBlank = 0;

FILES.forEach(function (file) {
  var full = path.join(root, file);
  var html = fs.readFileSync(full, "utf8");
  var els = collect(html);

  if (!els.length) {
    console.log("     " + file + ": ani jednego atrybutu data-i18n* — nic do sprawdzenia");
    return;
  }

  /* WSZYSTKIE bloki <script>, w kolejności wystąpienia, a nie pierwszy z brzegu.
     Od #16 strona ma ich dwa: przełącznik motywu musi nałożyć wybór PRZED pierwszym
     malowaniem, więc siedzi w <head>, a reszta narzędzia zostaje na dole. Dopasowanie
     do pierwszego bloku raportowało wtedy 132 puste podstawienia na trzech stronach —
     czyli awarię, której nie było: applier stał w bloku, którego ten strażnik nie
     czytał. Zachowanie strony jest sumą jej skryptów i tak samo liczy je ten plik. */
  var bloki = [], re = /<script>\n([\s\S]*?)\n<\/script>/g, mm;
  while ((mm = re.exec(html))) bloki.push(mm[1]);
  if (!bloki.length) { console.log("FAIL " + file + ": nie znalazłem bloku <script>"); rc = 1; return; }

  installDom(els);
  try {
    /* eslint-disable no-eval */
    eval(bloki.join("\n"));
  } catch (e) {
    console.log("FAIL " + file + ": blok <script> rzucił wyjątkiem — " + e.message);
    rc = 1;
    return;
  }

  /* JEDNOSTKĄ JEST PODSTAWIENIE, nie element — po obu stronach ułamka.
     Pierwsza wersja liczyła braki w podstawieniach, a całość w elementach:
     "2 z 6" na fixturze i na generatorze wychodziło zgodnie, bo tam każdy element
     niesie dokładnie jeden atrybut. W validator.html nie wychodzi — 30 elementów
     niesie 33 atrybuty, bo trzy mają data-i18n obok data-i18n-title — więc braki
     na takim elemencie dałyby "3 z 2 elementów". Liczba elementów zostaje, ale
     jako osobna wielkość obok, nie jako mianownik cudzego licznika. */
  var bad = [], subs = 0;
  els.forEach(function (e) {
    FORMS.forEach(function (f) {
      if (!Object.prototype.hasOwnProperty.call(e._a, f.attr)) return;
      totalChecked++;
      subs++;
      /* Ujście brane Z DEFINICJI FORMY, nie z drabinki. Drabinka kończyła się
         gałęzią „w przeciwnym razie aria-label", więc każda forma dopisana do FORMS
         czytała cudze ujście i raportowała je jako puste — dopisanie piątej formy
         (data-i18n-content) trafiło w to od razu. Lista w jednym miejscu i drabinka
         w drugim to dwie listy, z których jedna zawsze zostaje w tyle. */
      var got = f.attr === "data-i18n" ? e.innerHTML : e.getAttribute(f.sink);
      if (blank(got)) {
        totalBlank++;
        bad.push({ line: e._line, key: e._a[f.attr], attr: f.attr, sink: f.sink,
                   tag: e.tagName.toLowerCase() });
      }
    });
  });

  if (bad.length) {
    console.log("FAIL " + file + ": klucz bez tekstu na ekranie, " + bad.length +
                " z " + subs + " podstawień (na " + els.length + " elementach):");
    bad.slice(0, 12).forEach(function (b) {
      console.log("  " + file + ":" + b.line + "  <" + b.tag + " " + b.attr +
                  '="' + b.key + '">  -> ' + b.sink + " pozostaje pusty");
    });
    if (bad.length > 12) console.log("  ... i " + (bad.length - 12) + " dalszych");
    rc = 1;
  } else {
    console.log("OK   " + file + ": " + subs + " podstawień (na " + els.length +
                " elementach), każde dało niepusty tekst");
  }
});

console.log(rc === 0
  ? "Każdy atrybut data-i18n* produkuje tekst (" + totalChecked + " sprawdzonych)."
  : "\n" + totalBlank + " z " + totalChecked + " atrybutów nie produkuje tekstu. " +
    "Klucz w atrybucie to jeszcze nie tekst na ekranie —\nmusi być kod, który go podstawia.");
process.exit(rc);
