// The "Shelf" button: a link back to the launcher (demo shelf). Same behaviour as the family ShelfLink component
// (fetch GET /api/shelf once, render nothing until a URL is known), written as a plain script because this page has no React.
(function () {
  var bar = document.querySelector("header.masthead");
  if (!bar) return;
  fetch("/api/shelf", { credentials: "omit", headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.shelfUrl) return;
      var a = document.createElement("a");
      a.className = "shelf-link";
      a.href = d.shelfUrl;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.title = "Open the demo shelf (launcher)";
      a.textContent = "Shelf";
      var first = bar.querySelector(".mode-toggle");
      bar.insertBefore(a, first);
    })
    .catch(function () { /* stay hidden: no shelf, no button */ });
})();
