/* Rackpathlabs — parser globals.yml.
 *
 * ŹRÓDŁO PRAWDY. Ten plik nie jest nigdzie ładowany — narzędzia są samodzielnymi
 * plikami HTML działającymi z file://, więc blok poniżej jest wklejony bajtowo
 * identycznie do generator.html i validator.html między te same znaczniki.
 *
 * Zmiana parsera = edycja TEGO pliku, potem:
 *     bash tools/sync-blocks.sh      # przepisuje bloki do obu plików HTML
 *     bash tools/check-blocks.sh     # sprawdza, że wszystkie kopie są zgodne
 *
 * Wcięcie dwóch spacji jest celowe — blok żyje wewnątrz IIFE w obu plikach HTML
 * i musi być tam identyczny co do bajtu.
 */

  /* == GLOBALS-PARSER BEGIN — generowane z globals-parser.js, nie edytuj w miejscu == */
  /* Parser globals.yml dla dwóch konsumentów: generatora (import do formularza,
     issue #7) i walidatora (reguły klasy B w trybie łączonym, issue #18).

     TO NIE JEST PARSER YAML-a i nie ma nim być. globals.yml jest w praktyce płaskim
     mappingiem klucz: wartość z komentarzami, z kilkoma wyjątkami, które faktycznie
     występują. Obsługiwany podzbiór:

       - znacznik początku dokumentu ---
       - komentarze pełnoliniowe i końcówkowe (# po białym znaku)
       - klucze na wcięciu zerowym: klucz: wartość
       - skalary: gołe, "w cudzysłowie", 'w apostrofach', puste (= null)
       - listy blokowe (- element) oraz przepływowe ([a, b])
       - mapping zagnieżdżony o jednym poziomie (octavia_amp_network i podobne)

     Wszystko poza tym — skalary blokowe | i >, kotwice, aliasy, tagi, wiele
     dokumentów, sekwencje mappingów, wcięcie tabulatorami, zagnieżdżenie głębsze
     niż jeden poziom — kończy się JAWNYM błędem z numerem linii. Nigdy cichym
     pominięciem: plik wdrożeniowy, z którego coś po cichu zniknęło, jest gorszy
     niż plik odrzucony.

     Wynik parsowania to dane, nie efekt uboczny na formularzu. Każdy klucz niesie
     numer linii — wymaganie twarde, bo findingi trybu łączonego mają wskazywać
     linię tak samo jak dzisiejsze reguły inventory. */
  var GLOBALS = (function () {

    /* Rozbicie zachowujące separatory linii. Dzięki temu wyjście bez zmian jest
       bajtowo identyczne z wejściem, łącznie z CRLF i brakiem znaku końca pliku. */
    function splitLines(text) {
      var parts = String(text == null ? "" : text).split(/(\r\n|\n|\r)/);
      var lines = [], seps = [];
      for (var i = 0; i < parts.length; i += 2) {
        lines.push(parts[i]);
        seps.push(i + 1 < parts.length ? parts[i + 1] : "");
      }
      return { lines: lines, seps: seps };
    }

    /* Komentarzem jest '#' na początku linii albo poprzedzony białym znakiem.
       Wewnątrz cudzysłowów '#' jest zwykłym znakiem. */
    function splitComment(s) {
      var quote = null;
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        if (quote) {
          if (ch === "\\" && quote === '"') { i++; continue; }
          if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") {
          quote = ch;
        } else if (ch === "#" && (i === 0 || /\s/.test(s.charAt(i - 1)))) {
          return { body: s.slice(0, i), comment: s.slice(i) };
        }
      }
      return { body: s, comment: "" };
    }

    function unquote(raw) {
      var s = raw.trim();
      if (s.length >= 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') {
        return s.slice(1, -1)
          .replace(/\\n/g, "\n").replace(/\\t/g, "\t")
          .replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
      if (s.length >= 2 && s.charAt(0) === "'" && s.charAt(s.length - 1) === "'") {
        return s.slice(1, -1).replace(/''/g, "'");
      }
      return s;
    }

    /* lista przepływowa: [a, "b", c] */
    function parseFlowList(raw) {
      var inner = raw.trim().slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(",").map(function (x) { return unquote(x); });
    }

    var KEY_RE = /^([A-Za-z_][A-Za-z0-9_.-]*)\s*:(.*)$/;
    var INDENTED_KEY_RE = /^(\s+)([A-Za-z_][A-Za-z0-9_.-]*)\s*:(.*)$/;
    var LIST_ITEM_RE = /^(\s+)-\s*(.*)$/;

    /* Po odrzuceniu klucza pochłaniamy jego blok podrzędny. Bez tego każda wcięta
       linia zgłasza się osobno jako „nieoczekiwane wcięcie" i pierwszy komunikat —
       ten wskazujący prawdziwą przyczynę — tonie w kaskadzie. */
    function endOfIndentedBlock(lines, from) {
      var k = from;
      while (k < lines.length && (/^\s+\S/.test(lines[k]) || /^\s*$/.test(lines[k]))) k++;
      /* puste linie na końcu bloku należą do tego, co po nim */
      while (k > from && /^\s*$/.test(lines[k - 1])) k--;
      return k - 1;
    }

    function parse(text) {
      var split = splitLines(text);
      var lines = split.lines;
      var findings = [];
      var keys = Object.create(null);
      var order = [];
      var docSeen = false;

      function fail(line, msg, hint) {
        findings.push({ sev: "error", code: "UNSUPPORTED", line: line, msg: msg, hint: hint || null });
      }

      /* Tabulatory sprawdzamy przed pętlą główną: linie wewnątrz bloku podrzędnego
         są w niej przeskakiwane, więc kontrola umieszczona w środku pętli nie
         zobaczyłaby wcięcia tabulatorem w zagnieżdżonym mappingu. */
      for (var t = 0; t < lines.length; t++) {
        if (/^\s*$/.test(lines[t])) continue;
        if (/\t/.test((lines[t].match(/^\s*/) || [""])[0])) {
          fail(t + 1, "Wcięcie tabulatorem w linii " + (t + 1) + ".",
               "YAML nie dopuszcza tabulatorów we wcięciu — zamień je na spacje.");
        }
      }

      for (var i = 0; i < lines.length; i++) {
        var lineNo = i + 1;
        var rawLine = lines[i];

        if (/^\s*$/.test(rawLine)) continue;

        var sc = splitComment(rawLine);
        var body = sc.body;
        if (/^\s*$/.test(body)) continue;          // linia wyłącznie z komentarzem

        var trimmed = body.trim();

        if (trimmed === "---") {
          if (docSeen) {
            fail(lineNo, "Drugi dokument YAML w linii " + lineNo + ".",
                 "globals.yml jest pojedynczym dokumentem; wiele dokumentów nie jest obsługiwane.");
          }
          docSeen = true;
          continue;
        }
        if (trimmed === "...") continue;

        if (/^\s/.test(body)) {
          /* linia wcięta bez klucza nadrzędnego — nadrzędny konsumuje swoje linie sam */
          fail(lineNo, "Nieoczekiwane wcięcie w linii " + lineNo + ".",
               "Linia wcięta nie należy do żadnego klucza zadeklarowanego wyżej.");
          continue;
        }

        var m = KEY_RE.exec(body);
        if (!m) {
          fail(lineNo, "Nieobsługiwana konstrukcja w linii " + lineNo + ": <code>" +
                       trimmed.slice(0, 60) + "</code>.",
               "Obsługiwane są wyłącznie wpisy postaci <code>klucz: wartość</code> " +
               "na wcięciu zerowym, listy i mapping o jednym poziomie zagnieżdżenia.");
          continue;
        }

        var key = m[1];
        var rest = m[2];
        var restTrim = rest.trim();

        if (Object.prototype.hasOwnProperty.call(keys, key)) {
          findings.push({
            sev: "warn", code: "KEY-REPEATED", line: lineNo,
            msg: "Key <code>" + key + "</code> appears again on line " + lineNo + ".",
            hint: "Ansible takes the last occurrence; the earlier ones are dead."
          });
        }

        /* --- wartość w tej samej linii --- */
        if (restTrim !== "") {
          if (/^[|>]/.test(restTrim)) {
            fail(lineNo, "Skalar blokowy (<code>" + restTrim.charAt(0) + "</code>) w linii " +
                         lineNo + " przy kluczu <code>" + key + "</code>.",
                 "Wartości wielolinijkowe nie są obsługiwane.");
            i = endOfIndentedBlock(lines, i + 1);
            continue;
          }
          if (/^[&*!]/.test(restTrim)) {
            fail(lineNo, "Kotwica, alias lub tag w linii " + lineNo + " przy kluczu <code>" +
                         key + "</code>.", "Konstrukcje referencyjne YAML nie są obsługiwane.");
            i = endOfIndentedBlock(lines, i + 1);
            continue;
          }

          var entry = { line: lineNo, endLine: lineNo, raw: restTrim, comment: sc.comment };
          if (restTrim.charAt(0) === "[" && restTrim.charAt(restTrim.length - 1) === "]") {
            entry.kind = "list";
            entry.value = parseFlowList(restTrim);
          } else if (restTrim.charAt(0) === "{") {
            fail(lineNo, "Mapping przepływowy w linii " + lineNo + " przy kluczu <code>" +
                         key + "</code>.", "Obsługiwany jest wyłącznie mapping blokowy.");
            i = endOfIndentedBlock(lines, i + 1);
            continue;
          } else {
            entry.kind = "scalar";
            entry.value = unquote(restTrim);
          }
          keys[key] = entry;
          order.push(key);
          continue;
        }

        /* --- wartość w liniach poniżej: lista albo mapping --- */
        var j = i + 1;
        while (j < lines.length && (/^\s*$/.test(lines[j]) || /^\s*#/.test(lines[j]))) j++;

        if (j >= lines.length || !/^\s/.test(lines[j])) {
          /* klucz bez wartości — dopuszczalny, znaczy null */
          keys[key] = { line: lineNo, endLine: lineNo, raw: "", comment: sc.comment,
                        kind: "scalar", value: null };
          order.push(key);
          continue;
        }

        var isList = LIST_ITEM_RE.test(lines[j]);
        var childIndent = (lines[j].match(/^\s*/) || [""])[0].length;
        var value = isList ? [] : Object.create(null);
        var last = lineNo;
        var broken = false;

        for (var k = j; k < lines.length; k++) {
          var cur = lines[k];
          if (/^\s*$/.test(cur)) continue;
          if (/^\s*#/.test(cur)) continue;
          if (!/^\s/.test(cur)) break;                    // koniec bloku podrzędnego

          var curIndent = (cur.match(/^\s*/) || [""])[0].length;
          if (curIndent < childIndent) break;
          if (curIndent > childIndent) {
            fail(k + 1, "Zagnieżdżenie głębsze niż jeden poziom w linii " + (k + 1) +
                        " przy kluczu <code>" + key + "</code>.",
                 "Obsługiwany jest mapping o jednym poziomie zagnieżdżenia.");
            broken = true;
            while (k + 1 < lines.length &&
                   /^\s*\S/.test(lines[k + 1]) &&
                   (lines[k + 1].match(/^\s*/) || [""])[0].length > childIndent) k++;
            last = k + 1; continue;
          }

          var cb = splitComment(cur).body;
          if (/^\s*$/.test(cb)) continue;

          if (isList) {
            var li = LIST_ITEM_RE.exec(cb);
            if (!li) {
              fail(k + 1, "Nieobsługiwana konstrukcja w linii " + (k + 1) + " wewnątrz listy <code>" +
                          key + "</code>.", "Elementy listy zapisuje się jako <code>- wartość</code>.");
              broken = true; last = k + 1; continue;
            }
            if (/:\s/.test(li[2]) || /:$/.test(li[2].trim())) {
              fail(k + 1, "Sekwencja mappingów w linii " + (k + 1) + " przy kluczu <code>" +
                          key + "</code>.", "Lista obiektów nie jest obsługiwana.");
              broken = true; last = k + 1; continue;
            }
            value.push(unquote(li[2]));
          } else {
            var mi = INDENTED_KEY_RE.exec(cb);
            if (!mi) {
              fail(k + 1, "Nieobsługiwana konstrukcja w linii " + (k + 1) + " wewnątrz <code>" +
                          key + "</code>.",
                   "Wewnątrz mappingu obsługiwane są wyłącznie wpisy <code>klucz: wartość</code>.");
              broken = true; last = k + 1; continue;
            }
            if (mi[3].trim() === "") {
              fail(k + 1, "Zagnieżdżenie głębsze niż jeden poziom w linii " + (k + 1) +
                          " przy kluczu <code>" + key + "</code>.",
                   "Obsługiwany jest mapping o jednym poziomie zagnieżdżenia.");
              broken = true; last = k + 1; continue;
            }
            value[mi[2]] = unquote(mi[3]);
          }
          last = k + 1;
        }

        keys[key] = {
          line: lineNo, endLine: last, raw: "", comment: sc.comment,
          kind: isList ? "list" : "map", value: value, broken: broken
        };
        order.push(key);
        i = last - 1;
      }

      return {
        ok: !findings.some(function (f) { return f.sev === "error"; }),
        findings: findings, keys: keys, order: order,
        lines: lines, seps: split.seps
      };
    }

    /* Serializacja skalara na potrzeby podmiany. Cudzysłów podwójny zawsze —
       globals.yml Kolli i tak trzyma wartości logiczne jako "yes"/"no". */
    function quote(value) {
      var s = String(value == null ? "" : value)
        .replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        .replace(/[\x00-\x1f\x7f]/g, function (ch) {
          return "\\x" + ("0" + ch.charCodeAt(0).toString(16)).slice(-2);
        });
      return '"' + s + '"';
    }

    /* Odtworzenie pliku z podmienionymi wartościami wskazanych kluczy.
       Bez podmian wynik jest bajtowo identyczny z wejściem — to jest test
       poprawności round-tripu, nie efekt uboczny.

       Podmieniane są wyłącznie skalary w jednej linii. Listy i mappingi zostają
       nietknięte: przepisanie ich w miejscu wymagałoby decyzji o formatowaniu
       cudzego pliku, a to jest dokładnie ta klasa szkód, przed którą ma bronić
       zachowanie komentarzy i kolejności. */
    function emit(parsed, overrides) {
      overrides = overrides || {};
      var out = parsed.lines.slice();
      var applied = Object.create(null);
      var skipped = [];

      Object.keys(overrides).forEach(function (key) {
        var e = parsed.keys[key];
        if (!e) return;
        if (e.kind !== "scalar") { skipped.push(key); return; }
        var idx = e.line - 1;
        var line = out[idx];
        var sc = splitComment(line);
        var m = KEY_RE.exec(sc.body);
        if (!m) return;
        var lead = sc.body.slice(0, sc.body.indexOf(m[1]));
        var spacing = /^(\s*)/.exec(m[2])[1] || " ";
        /* Odstęp między wartością a komentarzem końcowym należy do części wartości —
           bez jego zachowania komentarz przykleiłby się do nowej wartości. */
        var trail = /(\s*)$/.exec(m[2])[1];
        out[idx] = lead + m[1] + ":" + spacing + quote(overrides[key]) + trail + sc.comment;
        applied[key] = true;
      });

      var added = Object.keys(overrides).filter(function (k) {
        return !parsed.keys[k];
      });

      var text = "";
      for (var i = 0; i < out.length; i++) text += out[i] + (parsed.seps[i] || "");

      if (added.length) {
        var tail = [];
        if (text.length && text.charAt(text.length - 1) !== "\n") tail.push("");
        tail.push("# Klucze dodane przy eksporcie z generatora");
        added.forEach(function (k) { tail.push(k + ": " + quote(overrides[k])); });
        text += tail.join("\n") + "\n";
      }

      return { text: text, applied: Object.keys(applied), skipped: skipped, added: added };
    }

    /* Przegląd kluczy pod kątem wydania. Lista wycofanych pochodzi z macierzy
       (rel.deprecated), nie z drugiej listy utrzymywanej osobno — konsument
       podaje wpis wydania, parser nie sięga po globalną tabelę. */
    function review(parsed, rel, known) {
      var out = [];
      var dep = Object.create(null);
      if (rel && rel.deprecated) {
        rel.deprecated.forEach(function (x) { if (x.kind === "key") dep[x.name] = x; });
      }

      parsed.order.forEach(function (key) {
        var e = parsed.keys[key];
        if (dep[key]) {
          var d = dep[key];
          out.push({
            sev: d.sev || "warn", code: "KEY-DEPRECATED", key: key, line: e.line,
            msg: "<code>" + key + "</code> " + (d.replacedBy
              ? "został przemianowany na <code>" + d.replacedBy + "</code>"
              : "nie jest już obsługiwany") +
              (rel ? " w wydaniu <code>" + rel.id + "</code>" : "") + ".",
            hint: d.note || null
          });
          return;
        }
        if (known && !known[key]) {
          out.push({
            sev: "info", code: "KEY-UNKNOWN", key: key, line: e.line,
            msg: "<code>" + key + "</code> is not a form field.",
            hint: "The key is kept in the file unchanged — the generator does not interpret it."
          });
        }
      });

      return out;
    }

    return { parse: parse, emit: emit, review: review, quote: quote };
  })();
  /* == GLOBALS-PARSER END == */
