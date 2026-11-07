(function () {
  var sel = document.getElementById("theme-select");
  if (!sel) return;
  sel.value = localStorage.getItem("dfg.theme") || "auto";
  sel.addEventListener("change", function () {
    var v = sel.value;
    if (v === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = v;
    localStorage.setItem("dfg.theme", v);
  });
})();
