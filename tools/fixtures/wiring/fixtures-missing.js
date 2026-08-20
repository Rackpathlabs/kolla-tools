/* Fixtura CZERWONA: check-b.js jest WPIETY w ci.yml, ale nie ma tu ani jednego
   uruchomienia na fixturze. Wpiety i nieudowodniony — dokladnie stan, w ktorym byly
   check-blocks.sh, check-docs.sh i check-offline.js do #96.

   PRZYNETA: nazwa check-b.js pada nizej, ale WYLACZNIE w komentarzu, wiec sie nie liczy —
   ta sama regula co przy wpieciu. Wzmianka o strazniku nie jest jego sprawdzeniem. */
var a = run("check-a.js", ["tools/fixtures/przyklad-brudny.js"]);
R.ok("check-a na brudnej fixturze -> czerwone", a.code === 1);
/* TODO: dopisac fixture dla check-b.js */
