/* Fixtura udajaca guards.test.js: oba straznice sa TU uruchamiane na fixturach. */
var a = run("check-a.js", ["tools/fixtures/przyklad-brudny.js"]);
R.ok("check-a na brudnej fixturze -> czerwone", a.code === 1);
var b = run("check-b.js", ["tools/fixtures/przyklad-brudny.js"]);
R.ok("check-b na brudnej fixturze -> czerwone", b.code === 1);
