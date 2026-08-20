#!/usr/bin/env node
/* SŁOWO-KLUCZ ZAMYKAJĄCE WOLNO POSTAWIĆ OBOK #NN WYŁĄCZNIE JAKO CAŁĄ LINIĘ.
 *
 * POWÓD. GitHub parsuje frazę, nie zdanie. Przeczenie nie pomaga, cudzysłów nie pomaga,
 * i nie pomaga argument, w środku którego fraza stoi. To repozytorium zapłaciło za to
 * DWA RAZY:
 *
 *   #41 (2026-08-11)  PR#42 „Stop escaping backticks in the watcher's issue body" niósł
 *                     w środku zdania „so this fixes #41 in place on the next run".
 *                     Zdanie mówiło o naprawie RENDEROWANIA treści tamtego issue.
 *                     #41 zamknęło się 81 sekund po utworzeniu. Watcher szuka issue
 *                     o stałym tytule w stanie OPEN i nie znajdując go tworzy nowe —
 *                     27 sekund później powstał duplikat #43.
 *
 *   #58 (2026-08-19)  PR#83 niósł w opisie zdanie napisane PO TO, żeby issue zostało
 *                     otwarte: „Does not close #58". Merge je zamknął.
 *
 * Oba razy fraza stała W ŚRODKU ZDANIA i oba razy zamknęła coś, czego nie zamierzano
 * zamknąć — po cichu, bo issue zamknięte automatycznie wygląda identycznie jak zamknięte
 * świadomie. Ta sama klasa co reszta w docs/PRINCIPLES.md: mechanizm zrobił to, co mówią
 * jego reguły, a nie to, co sugeruje jego nazwa, a intencja autora nigdy nie była częścią
 * wejścia.
 *
 * ============================================================================
 * REGUŁA, rozstrzygnięta przed napisaniem kodu, nie odkryta w trakcie.
 *
 * DOZWOLONE:   ^<słowo-klucz> #<cyfry>\.?$   (linia przycięta z białych znaków,
 *              wielkość liter bez znaczenia)
 * ZAKAZANE:    każde inne sąsiedztwo słowa-klucza z #NN
 *
 * BEZ SUFIKSU. „Closes #38. Diagnosis first, as the issue asked." pokazuje, jak trailer
 * zamienia się w zdanie: gdy za numerem wolno postawić prozę, linia znów jest zdaniem
 * i reguła przestaje być regułą KSZTAŁTU. Sufiks przepisuje się na drugą linię.
 *
 * BEZ WIELU ODWOŁAŃ W JEDNEJ LINII. Nie dlatego, że to niebezpieczne, tylko dlatego,
 * że to repozytorium ma zasadę „jeden issue = jeden PR" — trailer wymieniający dwa
 * numery jest sygnałem sam w sobie. Zakaz nic nie kosztuje: dwie linie.
 *
 * KROPKA NA KOŃCU WOLNO. To interpunkcja, nie proza.
 *
 * Zweryfikowane na historii przed wdrożeniem: 40 ostatnich commitów niesie 6 wystąpień,
 * wszystkie w formie „Fixes #NN" jako cała linia — ZERO fałszywych alarmów. Opisy PR-ów
 * niosą 9 wystąpień, z których 3 zapaliłyby strażnika: dwa sufiksy (do przepisania na
 * dwie linie) i jedno prawdziwe trafienie, czyli PR#42 opisany wyżej.
 * ============================================================================
 *
 * DWIE POWIERZCHNIE, JEDNA REGUŁA. GitHub zamyka issues z opisu PR-a ORAZ z komunikatów
 * commitów, które trafiają na gałąź domyślną. To repozytorium ma włączone wszystkie trzy
 * strategie merge'a (squash, merge commit, rebase) i faktycznie merguje przez merge
 * commit, więc komunikaty pojedynczych commitów lądują na main.
 *
 * Powierzchnia commitowa jest w tym repozytorium NIEUDOWODNIONA, a nie obalona: wszystkie
 * osiem zamkniętych issue ma commit_id=null, czyli zamknął je PR — ale słowo-klucz stał
 * za każdym razem w OBU miejscach naraz, więc historia nie rozstrzyga, które zadziałało.
 * Strażnik obejmuje ją mimo to, świadomie: strażnik pilnujący jednej powierzchni
 * i zostawiający drugą otwartą jest gorszy od swojego braku, bo daje poczucie osłony.
 *
 * FAIL CLOSED. Każde wejście, którego nie da się przeczytać albo które wygląda na
 * niekompletne, jest PORAŻKĄ, nie przejściem. Pusta lista commitów znaczy, że zakres
 * git został policzony źle — a strażnik, który przy błędzie mówi „ok", to jest #63
 * jeszcze raz: zielone, bo przedmiot pomiaru się nie wykonał.
 *
 * Użycie:
 *     node tools/check-closing-keyword.js --pr-body <plik> --commits <plik>
 *     node tools/check-closing-keyword.js --pr-body <plik>          # fixtura
 *     node tools/check-closing-keyword.js --commits <plik>          # fixtura
 */

var fs = require("fs");

var KEYWORDS = "close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved";
/* Sąsiedztwo: słowo-klucz, potem opcjonalny dwukropek i białe znaki, potem #NN.
   Granica słowa z przodu, żeby „prefixes #12" nie było trafieniem. */
var ADJACENT = new RegExp("\\b(?:" + KEYWORDS + ")\\b[ \\t]*:?[ \\t]*#\\d+", "i");
/* Jedyna dozwolona postać. Kotwiczona z obu stron. */
var ALLOWED = new RegExp("^(?:" + KEYWORDS + ")[ \\t]+#\\d+\\.?$", "i");

function die(msg) {
  console.log("FAIL " + msg);
  process.exit(1);
}

/* ---- wejście ---------------------------------------------------------------- */
var surfaces = [];
for (var i = 2; i < process.argv.length; i += 2) {
  var flag = process.argv[i], file = process.argv[i + 1];
  if (flag !== "--pr-body" && flag !== "--commits") {
    die("nieznany argument " + JSON.stringify(flag) +
        " — użycie: --pr-body <plik> --commits <plik>");
  }
  if (file === undefined) die("brak ścieżki po " + flag);
  surfaces.push({ flag: flag, file: file });
}
if (!surfaces.length) die("nie podano żadnej powierzchni do sprawdzenia");

var violations = 0, scanned = 0;

surfaces.forEach(function (s) {
  var text;
  try {
    text = fs.readFileSync(s.file, "utf8");
  } catch (e) {
    /* FAIL CLOSED: brakującego wejścia nie wolno uznać za czyste. Krok CI, który
       nie wyprodukował pliku, jest awarią pomiaru, a nie pustym wynikiem. */
    die(s.flag + ": nie mogę przeczytać " + s.file + " (" + e.code + "). " +
        "Brakujące wejście to awaria pomiaru, nie czysty wynik.");
  }

  if (text.trim() === "") {
    if (s.flag === "--commits") {
      /* Zakres git policzony źle daje pustą listę i wyglądałby na przejście —
         a PR bez ani jednego commita nie istnieje. */
      die("--commits: lista commitów jest PUSTA. Zakres git został policzony źle " +
          "(za płytki checkout?). PR bez commitów nie istnieje.");
    }
    /* Pusty opis PR-a jest legalny: body bywa null w payloadzie. Przechodzi, ale
       JAWNIE — cicha zgoda na pustkę jest nieodróżnialna od cichej zgody na błąd. */
    console.log("  " + s.flag + ": wejście puste (opis PR-a bez treści) — nic do sprawdzenia");
    return;
  }

  var lines = text.split("\n");
  lines.forEach(function (line, idx) {
    var trimmed = line.replace(/^[ \t]+|[ \t\r]+$/g, "");
    if (!ADJACENT.test(trimmed)) return;
    scanned++;
    if (ALLOWED.test(trimmed)) return;
    violations++;
    console.log("");
    console.log("  " + s.flag + ", linia " + (idx + 1) + ":");
    console.log("      " + JSON.stringify(trimmed.slice(0, 110)));
  });
});

console.log("");
console.log("sąsiedztw słowa-klucza z #NN: " + scanned + "   naruszeń: " + violations);

if (violations) {
  console.log("");
  console.log("FAIL słowo-klucz zamykające obok #NN poza formą „cała linia\", " +
              violations + " razy.");
  console.log("");
  console.log("  GitHub parsuje FRAZĘ, nie zdanie. Przeczenie nie działa: to repozytorium");
  console.log("  zamknęło tak #41 (PR#42, w środku zdania) i #58 (PR#83, „Does not close\").");
  console.log("");
  console.log("  DOZWOLONE:  Fixes #58            (cała linia, ewentualnie z kropką)");
  console.log("  ZAMIAST:    issue #58 stays open / part of #58 / refs #58");
  console.log("");
  console.log("  Sufiks przepisz na drugą linię. Zasada: CLAUDE.md, sekcja");
  console.log("  „Never write a closing keyword next to an issue number\".");
  process.exit(1);
}

console.log("OK   każde sąsiedztwo słowa-klucza z #NN jest całą linią");
process.exit(0);
