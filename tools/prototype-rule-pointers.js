#!/usr/bin/env node
/* PROTOTYP — ŚWIADOMIE NIEWPIĘTY. Nie jest to strażnik i nie ma się nim stać bez
 * decyzji: patrz #94. Nazwa nie zaczyna się od
 * „check-", żeby nie wyglądał na jednego z nich ani nie wpadł w przyszłe zestawienie
 * strażników.
 *
 * Powód, dla którego stoi tu nieuruchamiany, jest ten sam, który docs/PRINCIPLES.md
 * dopuszcza dla strażnika poza buildem: zapisać jawnie, dlaczego nie. Tutaj: ma
 * najpierw powstać inwentaryzacja i decyzja, czy ten pomysł w ogóle wchodzi.
 *
 * ============================================================================
 * PROBLEM. CLAUDE.md dopuszczał słowo-klucz w tytule PR-a „jeśli zamierzasz zamknąć",
 * podczas gdy strażnik opisujący dokładnie tę samą rzecz zakazywał go bezwarunkowo.
 * Dokument przeczył kodowi, który go egzekwuje. Znalezione CZYTANIEM, nie kontrolą —
 * drugi raz w tym repozytorium.
 *
 * CZEGO NIE ROBIMY. Strażnika „proza zgadza się z kodem" nie da się napisać: wymagałby
 * zrozumienia treści reguły i treści strażnika, a potem porównania znaczeń. To jest
 * nierozstrzygalne i każda próba skończyłaby się heurystyką, czyli kontrolą treści —
 * dokładnie tą klasą, którą to repozytorium wyrzuciło z check-english.js.
 *
 * PROJEKT ODWROTNY. Nie sprawdzamy, czy reguła zgadza się ze strażnikiem. Sprawdzamy,
 * czy reguła W OGÓLE WSKAZUJE strażnika — i czy ten wskaźnik się rozwiązuje.
 *
 *   każda reguła normatywna niesie wskaźnik: nazwę pliku strażnika albo identyfikator
 *     fixtury, ALBO jawny znacznik „nieegzekwowana" z powodem;
 *   kontrola sprawdza WYŁĄCZNIE, czy wskaźnik się rozwiązuje: czy plik istnieje, czy
 *     fixtura o tym identyfikatorze istnieje;
 *   zero rozumienia treści. Porównanie napisów i obecność pliku.
 *
 * Co to łapie: regułę wskazującą strażnika, którego skasowano albo przemianowano, oraz
 * regułę dopisaną bez żadnego wskaźnika. Czego NIE łapie: reguły wskazującej strażnika,
 * który istnieje, ale egzekwuje co innego. Ta granica jest wpisana w projekt, nie jest
 * jego wadą — i musi być zapisana, bo inaczej ktoś uzna wskaźnik za dowód zgodności.
 * ============================================================================
 *
 * Użycie:
 *     node tools/prototype-rule-pointers.js <dokument.md> …
 *     node tools/prototype-rule-pointers.js --inventory        # policz reguły w repo
 */

var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

/* REGUŁA NORMATYWNA to akapit zaczynający się od pogrubienia w pierwszej kolumnie.
   Kryterium KSZTAŁTU, nie treści: nie próbujemy zgadywać, czy zdanie coś nakazuje. */
var RULE_LEAD = /^\*\*(?!This rule is incomplete)/;
/* Wskaźnik stoi we własnej linii, jako cytat, żeby był WIDOCZNY po wyrenderowaniu.
   Niewidoczny znacznik (komentarz HTML) byłby wygodniejszy do pisania i gorszy do
   czytania — a reguła nieegzekwowana, która ukrywa swój status, jest dokładnie tym
   trybem awarii, dla którego to powstaje. */
var MARK = /^>\s*(enforced by|NOT ENFORCED):\s*(.*)$/;

function rules(file) {
  var lines = fs.readFileSync(path.join(root, file), "utf8").split("\n");
  var out = [];
  lines.forEach(function (line, i) {
    if (!RULE_LEAD.test(line)) return;
    /* Wskaźnik ma stać bezpośrednio pod regułą — pomijamy puste linie. */
    var j = i + 1, mark = null;
    while (j < lines.length && lines[j].trim() === "") j++;
    var m = j < lines.length ? MARK.exec(lines[j].trim()) : null;
    if (m) mark = { kind: m[1], value: m[2].trim(), line: j + 1 };
    out.push({ file: file, line: i + 1, lead: line.slice(0, 76), mark: mark });
  });
  return out;
}

function resolves(value) {
  if (/^fixture:/.test(value)) {
    var id = value.replace(/^fixture:/, "").trim();
    var dir = path.join(root, "tools", "fixtures");
    if (!fs.existsSync(dir)) return false;
    return fs.readdirSync(dir).some(function (f) {
      return f === id || f.indexOf(id + ".") === 0;
    });
  }
  return fs.existsSync(path.join(root, value));
}

if (process.argv[2] === "--inventory") {
  var total = 0;
  ["CLAUDE.md", "docs/PRINCIPLES.md"].forEach(function (f) {
    var r = rules(f);
    total += r.length;
    console.log(f + ": " + r.length + " reguł normatywnych, " +
                r.filter(function (x) { return x.mark; }).length + " ze wskaźnikiem");
    r.forEach(function (x) { console.log("   :" + x.line + "  " + x.lead); });
  });
  console.log("\nRAZEM: " + total + " reguł");
  process.exit(0);
}

var files = process.argv.slice(2);
if (!files.length) { console.log("FAIL nie podano dokumentu"); process.exit(1); }

var missing = [], broken = [], noReason = [], ok = 0, count = 0;
files.forEach(function (f) {
  rules(f).forEach(function (r) {
    count++;
    if (!r.mark) { missing.push(r); return; }
    if (r.mark.kind === "NOT ENFORCED") {
      if (!r.mark.value) noReason.push(r); else ok++;
      return;
    }
    if (!resolves(r.mark.value)) { broken.push(r); return; }
    ok++;
  });
});

console.log("reguł: " + count + "   ze wskaźnikiem, który się rozwiązuje: " + ok +
            "   bez wskaźnika: " + missing.length +
            "   wskaźnik NIEROZWIĄZYWALNY: " + broken.length +
            "   „nieegzekwowana" + '"' + " bez powodu: " + noReason.length);

broken.forEach(function (r) {
  console.log("\n  " + r.file + ":" + r.line + "  wskaźnik nie rozwiązuje się");
  console.log("      reguła:    " + r.lead);
  console.log("      wskazuje:  " + JSON.stringify(r.mark.value) + "  — nie istnieje");
});
missing.forEach(function (r) {
  console.log("\n  " + r.file + ":" + r.line + "  BRAK wskaźnika");
  console.log("      reguła:    " + r.lead);
});
noReason.forEach(function (r) {
  console.log("\n  " + r.file + ":" + r.line + "  „nieegzekwowana" + '"' + " bez powodu");
  console.log("      reguła:    " + r.lead);
});

if (broken.length || missing.length || noReason.length) {
  console.log("\nFAIL wskaźnik egzekucji nie rozwiązuje się albo go nie ma.");
  console.log("  Kontrola sprawdza WYŁĄCZNIE istnienie celu — nie to, czy strażnik");
  console.log("  egzekwuje akurat tę regułę. Tamtego nie da się sprawdzić maszyną.");
  process.exit(1);
}
console.log("\nOK   każda reguła niesie wskaźnik, który się rozwiązuje");
process.exit(0);
