(function () {
  // "auto" (no stored choice) follows the OS setting here, so styles.css needs no prefers-color-scheme block
  // (the family CSS standard keeps media queries for colour scheme in the shared stylesheet only).
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function apply() {
    var t = localStorage.getItem("dfg.theme") || "auto";
    document.documentElement.dataset.theme = t !== "auto" ? t : (mq && mq.matches ? "dark" : "light");
  }
  apply();
  if (mq && mq.addEventListener) mq.addEventListener("change", apply);
})();
