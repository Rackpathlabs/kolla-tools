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
 *   PLIKÓW, KOMENTARZY W KODZIE I OPISÓW ISSUE — znana luka, dziś NIEZAMYKANA.
 *     Ten strażnik ogląda komunikaty commitów oraz tytuł i opis PR-a. Personalia
 *     w treści pliku, w komentarzu w kodzie albo w opisie issue przechodzą, bo nikt
 *     tam nie patrzy. Nie jest to przeoczenie ani zapowiedź: komentarz w kodzie
 *     złapano tu raz i ręcznie (tools/check-docs.sh, 2026-08-21), a opisy issue leżą
 *     poza drzewem i poza zakresem builda. Granica nazwana, żeby zieleń tego pliku
 *     nie była czytana jako „w repozytorium nie ma personaliów".
 *
 *   TRAILERÓW POZA `Co-authored-by`. `Signed-off-by`, `Reviewed-by` i reszta rodziny
 *     NIE są objęte — powód przy samym wzorcu, w ciele pliku.
 *   WZMIANKI O TRAILERZE W ŚRODKU ZDANIA. Reguła jest kotwiczona do początku linii,
 *     świadomie: o zakazie trzeba móc pisać, a strażnik, o którym nie da się napisać,
 *     zostanie osłabiony przy pierwszej próbie opisania go.
 *
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
 * ============================================================================
 * TRZY MECHANIZMY W JEDNYM PLIKU, I TO NIE JEST NIEKONSEKWENCJA — TO JEDYNY POWÓD,
 * DLA KTÓREGO POLA METADANYCH DA SIĘ OBRONIĆ LEPIEJ NIŻ TREŚĆ.
 *
 *   TREŚĆ (komunikat, tytuł, opis)     LISTA ZAKAZÓW, po skrótach.
 *   POLA author / committer            LISTA POZWOLEŃ, po jawnych napisach.
 *   TRAILER AUTORSTWA                  KSZTAŁT, bez względu na treść.
 *
 * Różnica nie jest wygodą implementacji, tylko własnością zbiorów, i za rok nie będzie
 * oczywista, więc stoi tutaj wprost.
 *
 * DLA METADANYCH ZBIÓR DOZWOLONYCH JEST ZAMKNIĘTY — dwie wartości, wypisane niżej —
 * więc możliwa jest ODMOWA DOMYŚLNA: czerwone jest wszystko, co nie jest jedną z nich.
 * To łapie także tożsamość, o której nikt nie pomyślał, czyli dokładnie ten przypadek,
 * którego lista zakazów nie umie złapać z definicji. Ten sam kształt co
 * `default-src 'none'` w polityce CSP tych narzędzi: nie wyliczaj tego, co zabronione,
 * wylicz to, co dozwolone, i odmów reszcie.
 *
 * DLA TREŚCI TO NIEMOŻLIWE, bo zbiór zakazanych to cała ludzkość, a zbiór dozwolonych
 * to cały język. Nie ma czego wyliczyć po żadnej ze stron, więc zostaje lista zakazów
 * z jej znaną granicą — opisaną wyżej i nieudawaną.
 *
 * TRZECI MECHANIZM JEST KONTROLĄ KSZTAŁTU I TO WYMAGA ZDANIA, BO NAGŁÓWEK NIŻEJ
 * ARGUMENTUJE, ŻE KSZTAŁT MIESZKA GDZIE INDZIEJ. Linia `Co-authored-by:` jest
 * naruszeniem NIEZALEŻNIE od tego, kogo wymienia — adres bywa czyjś, bywa usługi, bywa
 * `noreply`. Lista zakazów nie może jej złapać z definicji, bo pyta „czy ten napis jest
 * na liście", a tu odpowiedź „nie" nic nie zmienia. Zmierzone przed napisaniem tej
 * reguły: trailer z adresem spoza listy przechodził przez OBU strażników powierzchni
 * na zielono, a ochrona istniała wyłącznie jako proza w CLAUDE.md.
 *
 * Ten plik jest zorganizowany wokół PRZEDMIOTU — tożsamości — a nie wokół mechanizmu,
 * i trzeci mechanizm nie łamie podziału opisanego niżej. Tamten podział mówi, dlaczego
 * NIE jest to dopisek do check-closing-keyword.js: tamten plik ma inny PRZEDMIOT
 * (odnośniki do zgłoszeń), a nie inny mechanizm. Gdyby porządkować po mechanizmie,
 * lista pozwoleń dla author/committer musiałaby wyprowadzić się stąd pierwsza.
 *
 * DLACZEGO LISTA POZWOLEŃ MOŻE STAĆ JAWNYM NAPISEM, skoro lista zakazów nie może.
 * Warunek konstrukcyjny dotyczy napisów CHRONIONYCH. Tożsamość projektowa nie jest
 * chroniona — stoi w każdym ze 185 commitów tego repozytorium i jest publiczna z
 * definicji, więc jej ukrywanie byłoby teatrem. Odwrotnie: musi stać jawnie, bo
 * strażnik ma ją WYPISAĆ w komunikacie błędu jako podpowiedź. Napis nie na liście
 * jest hashowany jak wszystko inne — to on może być czyjąś tożsamością.
 * ============================================================================
 *
 * DWIE GRANICE TEGO ROZSZERZENIA, obie znane przed napisaniem kodu:
 *
 *   ZAPORA DLA main, OSTRZEŻENIE DLA GAŁĘZI. Krok CI widzi metadane commita dopiero
 *     wtedy, gdy commit istnieje i został wypchnięty — zła tożsamość jest już na
 *     gałęzi, zanim cokolwiek zaprotestuje. To, co strażnik kupuje, to że nie wejdzie
 *     na gałąź domyślną; naprawa to rebase przed merge'em, tania i nietykająca
 *     historii, którą ktokolwiek cytuje.
 *
 *   NIC MIESZKAJĄCE W REPOZYTORIUM NIE ZADZIAŁA PRZED COMMITEM. .git/config nie
 *     podlega klonowaniu, hooki też nie. Jedyne, co działa wcześniej, to dwie linie
 *     `git config --local`, które ktoś musi pamiętać, żeby wykonać — CLAUDE.md,
 *     sekcja „Commits carry the project identity, never a person".
 *
 * Użycie:
 *     node tools/check-personal-names.js --pr-title <plik> --pr-body <plik> \
 *                                        --commits <plik> --identities <plik>
 *     node tools/check-personal-names.js --hashes <plik> --commits <plik>      # fixtura
 *
 * Plik --identities: po jednej tożsamości w linii, w postaci „Nazwa <adres>", taki,
 * jaki produkuje `git log --no-merges --format='%an <%ae>%n%cn <%ce>'`.
 */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

/* ██████████████████████████████████████████████████████████████████████████████
 * LISTA POZWOLEŃ DLA PÓL author / committer. DWIE WARTOŚCI. WSZYSTKO INNE JEST
 * CZERWONE — łącznie z tożsamością, o której nikt nie pomyślał.
 *
 * DOPISANIE TRZECIEJ MA BYĆ WIDOCZNĄ DECYZJĄ, nie linijką, która wpada w diff między
 * refaktoryzacjami. Dlatego stoi tu, w ramce, na górze pliku, a nie w konfiguracji
 * ani w danych: zmiana tej tablicy zajmuje w przeglądzie tyle miejsca, ile waży.
 *
 * ŻEBY DOPISAĆ TRZECIĄ, TRZEBA UDOWODNIĆ, ŻE JEST TOŻSAMOŚCIĄ PROJEKTOWĄ, A NIE
 * CZYJĄŚ WŁASNĄ: że nie niesie imienia, nazwiska ani adresu osoby, i że powstała
 * po to, żeby publikować pracę tego repozytorium, a nie dlatego, że ktoś sklonował
 * je na maszynie, na której akurat była taka konfiguracja.
 * ██████████████████████████████████████████████████████████████████████████████ */
var ALLOWED_IDENTITIES = [
  /* tożsamość projektowa — autor i committer wszystkich commitów pisanych ręcznie */
  "rackpathlabs-ops <310609378+rackpathlabs-ops@users.noreply.github.com>",
  /* committer commitów wytworzonych przez samą platformę: squash i merge z interfejsu.
     Zmierzone: 30 commitów bez merge'y ma ten committer, więc bez tego wpisu strażnik
     byłby czerwony na każdym PR-ze zawierającym wcześniejszy squash. */
  "GitHub <noreply@github.com>"
];

var DEFAULT_HASHES = path.join(__dirname, "personal-names.sha256");

/* Token = ciąg liter i cyfr Unicode. Adres pocztowy rozpada się na części, więc
   „ktos@example.com" daje „ktos", „example", „com" — i chroniona jest ta część,
   która jest chroniona, bez wpisywania na listę całej domeny. Osobno dokładamy
   CAŁY adres jako jeden token, bo na liście może stać adres, a nie jego kawałek. */
var WORD = /[\p{L}\p{N}]+/gu;
var EMAIL = /[^\s<>()[\]{},;:"']+@[^\s<>()[\]{},;:"']+/gu;
/* UCHWYT: login z myslnikiem, kropka albo podkresleniem w srodku. Dodany, bo bez niego
   wpis „mb-itdev" na liscie bylby wpisem MARTWYM — WORD rozbija go na „mb" i „itdev",
   wiec skrot calosci nie mialby szansy paść. Lista, ktorej czesc nie moze zadzialac,
   jest gorsza od krotszej: wyglada na pokrycie, ktorego nie ma. */
var HANDLE = /[\p{L}\p{N}][\p{L}\p{N}._-]*[\p{L}\p{N}]/gu;

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
var surfaces = [], identityFiles = [], hashFile = DEFAULT_HASHES;
for (var i = 2; i < process.argv.length; i += 2) {
  var flag = process.argv[i], file = process.argv[i + 1];
  if (file === undefined) die("brak ścieżki po " + flag);
  if (flag === "--hashes") { hashFile = file; continue; }
  if (flag === "--identities") { identityFiles.push(file); continue; }
  if (flag !== "--pr-body" && flag !== "--commits" && flag !== "--pr-title") {
    die("nieznany argument " + JSON.stringify(flag) +
        " — użycie: --pr-title <plik> --pr-body <plik> --commits <plik> " +
        "--identities <plik> [--hashes <plik>]");
  }
  surfaces.push({ flag: flag, file: file });
}
if (!surfaces.length && !identityFiles.length) die("nie podano żadnej powierzchni do sprawdzenia");

var H = loadHashes(hashFile);
/* Wyłącznie `Co-authored-by`. GRANICA NAZWANA, ŻEBY NIE BYŁA DOMYSŁEM: `Signed-off-by`,
   `Reviewed-by` i reszta rodziny NIE są tu objęte. Nie dlatego, że są mile widziane —
   dlatego, że nikt ich w tym repozytorium nie pisał, a wzorzec obejmujący konstrukcje,
   których nikt nie widział, jest listą zgadywaną. Ta sama pomyłka co lista sześciu nazw
   API w check-offline.js, tylko po drugiej stronie. Dopisanie kolejnej ma być decyzją
   z fixturą, a nie alternatywą doklejoną do wyrażenia. */
var TRAILER = /^[ \t]*co-authored-by[ \t]*:/i;

var violations = 0, tokens = 0, trailers = 0;

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
    /* KSZTAŁT, nie treść: liczy się konstrukcja, nie to, kogo wymienia. Kotwica na
       początku linii, bo trailerem jest linia, a nie napis — inaczej nie dałoby się
       o tej regule NAPISAĆ, a napisana jest w CLAUDE.md, w opisie tego PR-a i w tym
       komentarzu. Nie cytujemy linii: adres po dwukropku bywa czyjś. */
    if (TRAILER.test(line)) {
      trailers++;
      console.log("");
      console.log("  " + s.flag + ", linia " + (idx + 1) +
                  ": TRAILER PRZYPISUJĄCY AUTORSTWO, długość " + line.trim().length);
      console.log("      (linii NIE cytuję — log CI jest publiczny)");
    }
    [WORD, EMAIL, HANDLE].forEach(function (re) {
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

/* ---- POLA author / committer: ODMOWA DOMYŚLNA ------------------------------- */
var identLines = 0, identBad = 0;
identityFiles.forEach(function (file) {
  var text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    die("--identities: nie mogę przeczytać " + file + " (" + e.code + "). " +
        "Brakujące wejście to awaria pomiaru, nie czysty wynik.");
  }
  if (text.trim() === "") {
    /* Ta sama klasa co pusty --commits: zakres policzony źle wygląda jak czysty wynik.
       PR bez commitów nie istnieje, więc nie istnieje też PR bez ani jednej tożsamości. */
    die("--identities: plik jest PUSTY. Zakres git został policzony źle " +
        "(za płytki checkout?). PR bez commitów nie istnieje.");
  }
  text.split("\n").forEach(function (line, idx) {
    var t = line.replace(/^[ \t]+|[ \t\r]+$/g, "");
    if (t === "") return;
    identLines++;
    if (ALLOWED_IDENTITIES.indexOf(t) !== -1) return;
    identBad++;
    console.log("");
    console.log("  --identities, linia " + (idx + 1) + ", długość " + t.length);
    console.log("      skrót " + sha(t).slice(0, 12) + "…  (tożsamości NIE cytuję — " +
                "to ona może być czyimś nazwiskiem)");
  });
});

console.log("");
console.log("tokenów zbadanych: " + tokens + "   skrótów na liście: " + H.count +
            "   trafień: " + violations);
if (surfaces.length) {
  console.log("trailerów autorstwa: " + trailers);
}
if (identityFiles.length) {
  console.log("tożsamości zbadanych: " + identLines + "   dozwolonych wartości: " +
              ALLOWED_IDENTITIES.length + "   spoza listy: " + identBad);
}

if (identBad) {
  console.log("");
  console.log("FAIL tożsamość spoza listy pozwoleń w polu author albo committer, " +
              identBad + " raz(y).");
  console.log("");
  console.log("  Dozwolone są DWIE wartości i nic więcej:");
  ALLOWED_IDENTITIES.forEach(function (a) { console.log("      " + a); });
  console.log("");
  console.log("  Najczęstsza przyczyna: świeży klon bez `git config --local`. .git/config");
  console.log("  NIE podlega klonowaniu, więc commit poszedł z konfiguracji maszyny.");
  console.log("      git config --local user.name  rackpathlabs-ops");
  console.log("      git config --local user.email 310609378+rackpathlabs-ops@users.noreply.github.com");
  console.log("");
  console.log("  Naprawa: ustaw powyższe i przepisz commity TEJ GAŁĘZI przez rebase, PRZED");
  console.log("  merge'em. Na gałęzi to jest tanie i nie rusza historii, którą ktoś cytuje.");
  console.log("  Po wejściu na main byłoby już za późno — CLAUDE.md, sekcja");
  console.log("  „Commits carry the project identity, never a person\".");
}

if (trailers) {
  console.log("");
  console.log("FAIL trailer przypisujący autorstwo, " + trailers + " raz(y).");
  console.log("");
  console.log("  Jest to reguła KSZTAŁTU: linia zaczynająca się od `Co-authored-by:` jest");
  console.log("  naruszeniem NIEZALEŻNIE od adresu po dwukropku. Commity tego repozytorium");
  console.log("  mówią o pracy, nie o tym, kto ją wykonał — CLAUDE.md, sekcja");
  console.log("  „Commits carry the project identity, never a person\".");
  console.log("");
  console.log("  Jeżeli trailer dopisuje narzędzie, wyłącz to w konfiguracji, a nie ręcznie");
  console.log("  przy każdym commicie: .claude/settings.json niesie \"includeCoAuthoredBy\": false");
  console.log("  i jest wersjonowany właśnie po to, żeby obowiązywał w każdym klonie.");
  console.log("");
  console.log("  Wzmianka o trailerze w ŚRODKU zdania nie jest trailerem i przechodzi —");
  console.log("  reguła jest kotwiczona do początku linii, żeby dało się o niej pisać.");
}

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

if (trailers || identBad) process.exit(1);

/* Komunikat sukcesu wymienia to, co FAKTYCZNIE zbadano. „OK" mówiące o powierzchniach,
   których nie podano, jest zieloną odpowiedzią na niezadane pytanie — a to jest ta sama
   klasa co zdanie szersze niż dowód, tylko na wyjściu zamiast w nagłówku. */
var done = [];
if (surfaces.length) done.push("żaden napis z listy nie wystąpił w treści");
if (surfaces.length) done.push("żadna linia nie jest trailerem autorstwa");
if (identityFiles.length) done.push("każda tożsamość jest na liście pozwoleń");
console.log("OK   " + done.join("; ") + ".");
