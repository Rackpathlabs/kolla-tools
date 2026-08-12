/* PRZYNĘTA dla check-binary.sh: legalne znaki wielobajtowe, żadnego naruszenia.
 *
 * Polskie diakrytyki — ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ — to zwykły UTF-8. Myślnik — i cudzysłowy
 * „drukarskie" też. Strażnik zakazuje bajtów NUL i niewidocznych separatorów linii,
 * NIE wszystkiego, co wykracza poza ASCII. Fixtura pilnuje, żeby ktoś kiedyś nie
 * uprościł go do „odrzuć bajty spoza ASCII" — wtedy przestałby przechodzić na
 * własnych źródłach, bo te komentarze są po polsku.
 */
var opis = "ąćęłńóśźż — tekst, który MA przechodzić";
