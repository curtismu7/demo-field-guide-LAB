(function () {
  var sel = document.getElementById("theme-select");
  if (!sel) return;
  sel.value = localStorage.getItem("dfg.theme") || "auto";
  sel.addEventListener("change", function () {
    var v = sel.value;
    localStorage.setItem("dfg.theme", v);
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = v !== "auto" ? v : (dark ? "dark" : "light");
  });
})();
