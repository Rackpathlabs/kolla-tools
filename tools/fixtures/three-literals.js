/* Dokładnie TRZY literały w trzech różnych ujściach. */
function demo(el, node) {
  el.textContent = "First sink";
  node.innerHTML = "Second sink";
  toast("Third sink");
  el.setAttribute("class", "not-a-sink");
  toast(T("t.copied"));
}
