/* Shared behaviour: notch nav geometry, theme toggle, scroll reveals, mobile menu */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  /* ---------- Theme toggle (remembers the choice; otherwise follows the system) ---------- */
  var root = document.documentElement;
  var THEME_KEY = "knotch-theme";
  function storedTheme() {
    try { var t = localStorage.getItem(THEME_KEY); return t === "light" || t === "dark" ? t : null; } catch (e) { return null; }
  }
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    });
  }
  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  });
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  var onSystemChange = function (e) { if (!storedTheme()) applyTheme(e.matches ? "dark" : "light"); };
  if (systemDark.addEventListener) systemDark.addEventListener("change", onSystemChange);

  /* ---------- Notch nav: one outline shared by glass, tint, sheen, rim and shadow ---------- */
  var shell = document.querySelector(".nav-shell");
  if (shell && "ResizeObserver" in window) {
    var lastKey = "";
    var outline = function (w, h, e, r, closed) {
      // start top-left, concave ear down to the bar edge, round the bottom corners, mirror on the right
      var d = "M0 0 A" + e + " " + e + " 0 0 1 " + e + " " + e +
        " L" + e + " " + (h - r) + " A" + r + " " + r + " 0 0 0 " + (e + r) + " " + h +
        " L" + (w - e - r) + " " + h + " A" + r + " " + r + " 0 0 0 " + (w - e) + " " + (h - r) +
        " L" + (w - e) + " " + e + " A" + e + " " + e + " 0 0 1 " + w + " 0";
      return closed ? d + " Z" : d;
    };
    var layoutNotch = function () {
      var cs = getComputedStyle(shell);
      var e = parseFloat(cs.getPropertyValue("--ear")) || 20;
      var rect = shell.getBoundingClientRect();
      var w = Math.round(rect.width) + 2 * e, h = Math.round(rect.height);
      if (!w || !h) return;
      var r = Math.min(parseFloat(cs.getPropertyValue("--nav-r")) || 30, h / 2, (w - 2 * e) / 2);
      var key = w + "x" + h + "@" + e + "/" + r;
      if (key === lastKey) return;
      lastKey = key;
      var closed = outline(w, h, e, r, true), open = outline(w, h, e, r, false);
      shell.style.setProperty("--nav-clip", "path('" + closed + "')");
      // the glass layer is masked as well as clipped: masks clip a backdrop-filter reliably where clip-path can leak at curved corners
      var maskSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + w + " " + h + "' preserveAspectRatio='none'><path d='" + closed + "' fill='black'/></svg>";
      shell.style.setProperty("--nav-mask", 'url("data:image/svg+xml,' + encodeURIComponent(maskSvg) + '")');
      shell.querySelectorAll("svg.nav-rim-svg, svg.nav-shadow").forEach(function (svg) {
        svg.setAttribute("viewBox", "0 0 " + w + " " + h);
        svg.querySelectorAll("[data-outline]").forEach(function (p) { p.setAttribute("d", open); });
        svg.querySelectorAll("[data-shape], [data-cut]").forEach(function (p) { p.setAttribute("d", closed); });
        var field = svg.querySelector("[data-field]");
        if (field) {
          field.setAttribute("x", -60); field.setAttribute("y", -60);
          field.setAttribute("width", w + 120); field.setAttribute("height", h + 120);
          var mask = svg.querySelector("mask");
          ["x", "y"].forEach(function (a) { mask.setAttribute(a, -60); });
          mask.setAttribute("width", w + 120); mask.setAttribute("height", h + 120);
        }
      });
    };
    layoutNotch();
    new ResizeObserver(layoutNotch).observe(shell);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutNotch);
  }

  /* ---------- Scroll reveals ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById("navBurger");
  var mobileMenu = document.getElementById("mobileMenu");
  if (burger && mobileMenu) {
    var setMenu = function (open) {
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    };
    burger.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    mobileMenu.addEventListener("click", function (e) {
      if (e.target === mobileMenu) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 700) setMenu(false);
    });
  }
})();
