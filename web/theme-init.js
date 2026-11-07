(function () {
  var t = localStorage.getItem("dfg.theme");
  if (t && t !== "auto") document.documentElement.dataset.theme = t;
})();
