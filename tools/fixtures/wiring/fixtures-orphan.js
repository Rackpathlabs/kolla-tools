/* Fixtura do przypadku WPIECIA: oba straznice maja tu wywolanie, zeby tamten test
   mierzyl wylacznie wpiecie i nie barwil go brakiem fixtury. */
var a = run("check-wpiety.js", []);
var b = run("check-sierota.js", []);
