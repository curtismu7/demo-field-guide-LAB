// Text size control (shared TopMenu pattern) for the static field guide.
    (function () {
      var STEP = { S: "14px", M: "16px", L: "18px" };
      var order = ["S", "M", "L"];
      function apply(step) {
        document.documentElement.style.fontSize = STEP[step] || "16px";
        try { localStorage.setItem("dfg.font", step); } catch (e) {}
        var sel = document.getElementById("font-select");
        if (sel) sel.value = step;
      }
      document.addEventListener("DOMContentLoaded", function () {
        apply(localStorage.getItem("dfg.font") || "M");
        var sel = document.getElementById("font-select");
        sel.addEventListener("change", function () { apply(sel.value); });
        document.getElementById("font-minus").addEventListener("click", function () {
          apply(order[Math.max(0, order.indexOf(sel.value) - 1)]);
        });
        document.getElementById("font-plus").addEventListener("click", function () {
          apply(order[Math.min(2, order.indexOf(sel.value) + 1)]);
        });
      });
    })();
  