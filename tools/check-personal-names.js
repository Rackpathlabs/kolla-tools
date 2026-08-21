#!/usr/bin/env node
/* ŁAPIE WYSTĄPIENIA NAPISÓW Z ZAMKNIĘTEJ LISTY SKRÓTÓW. NIE WYKRYWA PERSONALIÓW
 * W OGÓLNOŚCI — i nie będzie, bo nie da się.
 *
 * To zdanie jest całym zakresem tego pliku i stoi tu od pierwszej wersji, a nie od
 * pierwszej reklamacji. Nazwisko, którego nikt nie wpisał na listę, przejdzie przez tego
 * strażnika bez śladu. To jest KONTROLA TREŚCI NAD ZAMKNIĘTĄ LISTĄ — ta sama klasa, co
 * lista sześciu nazw API w check-offline.js, i granice ma te same: przepuszcza wszystko,
 * o czym autor listy nie pomyślał. Różnica wobec tamtego przypadku jest jedna i warto ją
 * powiedzieć wprost: tam istniała alternatywa mierząca SKUTEK (check-network.js), tutaj
 * nie istnieje. „Czy ten napis jest czyimś nazwiskiem" nie jest pytaniem, na które
 * odpowiada jakikolwiek pomiar — jest pytaniem o świat poza repozytorium.
 *
 * Dlatego ten plik jest wart tyle, ile lista, i ani grosza więcej.
 *
 * ============================================================================
 * WARUNEK KONSTRUKCYJNY: ZERO CHRONIONYCH NAPISÓW W KODZIE I W DANYCH.
 *
 * Repozytorium jest publiczne. Strażnik z listą imion i adresów w środku publikowałby
 * dokładnie to, czego broni — i byłby wygodniejszy dla zbierającego dane niż cokolwiek,
 * co miałby znaleźć sam. Porównujemy więc SKRÓTY: SHA-256 znormalizowanego słowa
 * (małe litery, obcięte białe znaki), lista skrótów w tools/personal-names.sha256.
 *
 * Z tego samego powodu KOMUNIKAT BŁĘDU NIE CYTUJE TRAFIENIA. Podaje powierzchnię,
 * numer linii, kolumnę, długość i dwanaście znaków skrótu. Autor patrzy we własną
 * linię i widzi, o co chodzi; log CI, który jest publiczny, nie niesie napisu.
 * Strażnik wypisujący znalezione nazwisko w publicznym logu byłby żartem z samego siebie.
 *
 * SKRÓT KRÓTKIEGO SŁOWA NIE JEST TAJEMNICĄ — przestrzeń imion jest mała i słownik
 * dopasuje je w kilka sekund. To zasłona przed przypadkowym czytelnikiem i przed
 * wyszukiwarką, nie ochrona kryptograficzna. Napisane, żeby nikt nie wziął tego
 * pliku za sejf.
 * ============================================================================
 *
 * CZEGO NIE ŁAPIE, wypisane, żeby zieleń nie znaczyła więcej, niż znaczy:
 *
 *   NAPISU SPOZA LISTY. Cała pozostała ludzkość.
 *   PODCIĄGU W DŁUŻSZYM SŁOWIE. Dopasowujemy CAŁE tokeny, więc słowo zawierające
 *     chroniony napis w środku przechodzi. Świadomie: dopasowanie po podciągu daje
 *     fałszywe alarmy na zwykłych słowach, a fałszywy alarm w strażniku, który nie
 *     może pokazać, co znalazł, jest nie do zdiagnozowania. Granica jest przypięta
 *     fixturą (clean-substring), więc widać ją, zamiast się jej domyślać.
 *   NAPISU ROZBITEGO ZNAKIEM. „M-a-r-…" rozpada się na tokeny jednoliterowe.
 *     Ta klasa jest poza zasięgiem listy z definicji — patrz zdanie otwierające.
 *   POWIERZCHNI SPOZA PODANYCH. Sprawdza to, co dostanie w argumentach, i nic więcej.
 *     Zwłaszcza NIE sprawdza pól author/committer commita — te bierze git z konfiguracji,
 *     nie autor z klawiatury, i pilnuje ich reguła w CLAUDE.md razem z konfiguracją
 *     lokalną repozytorium.
 *
 * POWIERZCHNIA JEST TA SAMA CO W check-closing-keyword.js: tytuł PR-a, opis PR-a,
 * komunikaty commitów z zakresu PR-a. Krok CI produkuje te trzy pliki raz i podaje
 * je obu strażnikom.
 *
 * DLACZEGO OSOBNY PLIK, A NIE DOPISEK DO TAMTEGO. Wspólna jest wyłącznie hydraulika.
 * check-closing-keyword.js jest kontrolą KSZTAŁTU: zakazuje konstrukcji niezależnie od
 * treści, jego reguła jest rozstrzygalna bez wiedzy o świecie i jego zieleń znaczy
 * „konstrukcji nie ma". Ten plik jest kontrolą TREŚCI nad listą i jego zieleń znaczy
 * „nie było niczego z listy". To dwa różne zdania o zakresie, a plik może mieć w nagłówku
 * tylko jedno — po połączeniu nazwa pliku obiecywałaby jedno, a połowa ciała robiłaby
 * drugie. Ta różnica jest w tym repozytorium ważniejsza niż oszczędność na jednym
 * require: reguła „nazwa mechanizmu jest twierdzeniem o jego zakresie" kosztowała
 * już trzy poprawki nagłówków.
 *
 * FAIL CLOSED. Nieczytelne wejście, pusta lista skrótów, linia listy, która nie jest
 * skrótem — wszystko to jest PORAŻKĄ POMIARU, nie czystym wynikiem. Strażnik, który
 * przy zepsutym wejściu mówi „ok", to #63 jeszcze raz.
 *
 * Użycie:
 *     node tools/check-personal-names.js --pr-title <plik> --pr-body <plik> --commits <plik>
 *     node tools/check-personal-names.js --hashes <plik> --commits <plik>      # fixtura
 */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var DEFAULT_HASHES = path.join(__dirname, "personal-names.sha256");

/* Token = ciąg liter i cyfr Unicode. Adres pocztowy rozpada się na części, więc
   „ktos@example.com" daje „ktos", „example", „com" — i chroniona jest ta część,
   która jest chroniona, bez wpisywania na listę całej domeny. Osobno dokładamy
   CAŁY adres jako jeden token, bo na liście może stać adres, a nie jego kawałek. */
var WORD = /[\p{L}\p{N}]+/gu;
var EMAIL = /[^\s<>()[\]{},;:"']+@[^\s<>()[\]{},;:"']+/gu;

function die(msg) {
  console.log("FAIL " + msg);
  process.exit(1);
}

function sha(s) {
  return crypto.createHash("sha256").update(s.toLowerCase().trim(), "utf8").digest("hex");
}

/* ---- lista skrótów ---------------------------------------------------------- */
function loadHashes(file) {
  var raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (e) {
    die("nie mogę przeczytać listy skrótów " + file + " (" + e.code + "). " +
        "Brak listy to awaria pomiaru, nie pusta lista.");
  }
  var set = Object.create(null), n = 0;
  raw.split("\n").forEach(function (line, idx) {
    var t = line.replace(/^[ \t]+|[ \t\r]+$/g, "");
    if (t === "" || t.charAt(0) === "#") return;
    if (!/^[0-9a-f]{64}$/.test(t)) {
      /* Linia, która nie jest skrótem, znaczy listę zepsutą albo napisaną ręcznie
         z błędem — a lista krótsza, niż się autorowi wydaje, jest cichym przejściem. */
      die("lista skrótów " + file + ", linia " + (idx + 1) +
          ": nie jest skrótem SHA-256 (64 znaki 0-9a-f). Zepsuta lista przepuszcza po cichu.");
    }
    set[t] = true; n++;
  });
  if (!n) die("lista skrótów " + file + " jest PUSTA. Strażnik bez listy przechodzi zawsze.");
  return { set: set, count: n };
}

/* ---- wejście ---------------------------------------------------------------- */
var surfaces = [], hashFile = DEFAULT_HASHES;
for (var i = 2; i < process.argv.length; i += 2) {
  var flag = process.argv[i], file = process.argv[i + 1];
  if (file === undefined) die("brak ścieżki po " + flag);
  if (flag === "--hashes") { hashFile = file; continue; }
  if (flag !== "--pr-body" && flag !== "--commits" && flag !== "--pr-title") {
    die("nieznany argument " + JSON.stringify(flag) +
        " — użycie: --pr-title <plik> --pr-body <plik> --commits <plik> [--hashes <plik>]");
  }
  surfaces.push({ flag: flag, file: file });
}
if (!surfaces.length) die("nie podano żadnej powierzchni do sprawdzenia");

var H = loadHashes(hashFile);
var violations = 0, tokens = 0;

surfaces.forEach(function (s) {
  var text;
  try {
    text = fs.readFileSync(s.file, "utf8");
  } catch (e) {
    die(s.flag + ": nie mogę przeczytać " + s.file + " (" + e.code + "). " +
        "Brakujące wejście to awaria pomiaru, nie czysty wynik.");
  }

  if (text.trim() === "") {
    /* Te same rozstrzygnięcia co w check-closing-keyword.js, z tego samego powodu:
       pusty zakres commitów i pusty tytuł to awarie kroku, pusty opis jest legalny. */
    if (s.flag === "--commits") {
      die("--commits: lista commitów jest PUSTA. Zakres git został policzony źle " +
          "(za płytki checkout?). PR bez commitów nie istnieje.");
    }
    if (s.flag === "--pr-title") {
      die("--pr-title: tytuł jest PUSTY. PR bez tytułu nie istnieje — krok nie " +
          "wyprodukował wejścia.");
    }
    console.log("  " + s.flag + ": wejście puste (opis PR-a bez treści) — nic do sprawdzenia");
    return;
  }

  text.split("\n").forEach(function (line, idx) {
    [WORD, EMAIL].forEach(function (re) {
      re.lastIndex = 0;
      var m;
      while ((m = re.exec(line)) !== null) {
        tokens++;
        var h = sha(m[0]);
        if (!H.set[h]) continue;
        violations++;
        console.log("");
        console.log("  " + s.flag + ", linia " + (idx + 1) + ", kolumna " + (m.index + 1) +
                    ", długość " + m[0].length);
        console.log("      skrót " + h.slice(0, 12) + "…  (napisu NIE cytuję — log CI jest publiczny)");
      }
    });
  });
});

console.log("");
console.log("tokenów zbadanych: " + tokens + "   skrótów na liście: " + H.count +
            "   trafień: " + violations);

if (violations) {
  console.log("");
  console.log("FAIL napis z listy chronionej w treści PR-a albo commita, " +
              violations + " raz(y).");
  console.log("");
  console.log("  Commity w tym repozytorium idą z tożsamości projektowej i mówią o pracy,");
  console.log("  nie o ludziach. Zajrzyj we wskazaną linię — strażnik nie cytuje trafienia,");
  console.log("  bo log jest publiczny, a wypisanie znaleziska publikowałoby to, czego broni.");
  console.log("");
  console.log("  Komunikat commita poprawia się przez rebase PRZED wypchnięciem. Po wypchnięciu");
  console.log("  historii NIE przepisujemy — powód stoi w CLAUDE.md, sekcja");
  console.log("  „Commits carry the project identity, never a person\".");
  process.exit(1);
}

console.log("OK   żaden napis z listy nie wystąpił na sprawdzonych powierzchniach.");
