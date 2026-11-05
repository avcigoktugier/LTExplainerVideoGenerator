// Shared helper for KetTek compositions. Load it in <body>, before the composition's own script:
//   <script src="assets/kettek.js"></script>
// Then:  KT.vars.title, KT.cue("stamp", 2.0), KT.dur, KT.list("lines"), KT.text("#el", "title")
(function () {
  var hf = window.__hyperframes;
  var v = hf && typeof hf.getVariables === "function" ? hf.getVariables() || {} : {};
  var root = document.querySelector("[data-composition-id]");
  var rootDur = root ? Number(root.getAttribute("data-duration")) : NaN;

  // Palette variables → CSS custom properties (--ink, --accent, ...)
  ["ink", "paper", "surface", "accent", "accent2", "muted", "danger", "cast1", "cast2", "cast3"].forEach(function (k) {
    if (typeof v[k] === "string" && v[k]) document.documentElement.style.setProperty("--" + k, v[k]);
  });

  var dur = typeof v.duration === "number" ? v.duration : isFinite(rootDur) ? rootDur : 6;

  window.KT = {
    vars: v,
    // Scene length in seconds (the clip is rendered exactly this long)
    dur: dur,
    // Seconds into the scene when the narration says this cue's word; fallback if not set.
    // Clamped so animations always finish before the end.
    cue: function (name, fallback) {
      var t = v["cue_" + name];
      var s = typeof t === "number" ? t : fallback;
      return Math.max(0, Math.min(s, dur - 0.4));
    },
    // A list variable. Declared as type "string" (HyperFrames has no list type); holds JSON text
    // (the pipeline converts storyboard arrays) or "a | b | c". Real arrays are accepted too.
    list: function (name) {
      var x = v[name];
      if (Array.isArray(x)) return x;
      if (typeof x === "string") {
        var s = x.trim();
        if (s.charAt(0) === "[") {
          try { var parsed = JSON.parse(s); if (Array.isArray(parsed)) return parsed; } catch (e) {}
        }
        return s.split("|").map(function (p) { return p.trim(); }).filter(Boolean);
      }
      return [];
    },
    // Scale a fixed-size design (designW × designH) to fit the canvas, centered. Put it on a wrapper GSAP never animates.
    fit: function (selector, designW, designH) {
      var el = document.querySelector(selector);
      if (!el || !root) return 1;
      var W = Number(root.getAttribute("data-width")) || root.clientWidth;
      var H = Number(root.getAttribute("data-height")) || root.clientHeight;
      var k = Math.min(W / designW, H / designH);
      el.style.position = "absolute";
      el.style.width = designW + "px";
      el.style.height = designH + "px";
      el.style.left = (W - designW * k) / 2 + "px";
      el.style.top = (H - designH * k) / 2 + "px";
      el.style.transformOrigin = "0 0";
      el.style.transform = "scale(" + k + ")";
      return k;
    },
    // Fill an element's text from a variable (keeps the HTML's text if the variable is empty)
    text: function (selector, name) {
      var el = document.querySelector(selector);
      if (el && v[name] !== undefined && v[name] !== null && v[name] !== "") el.textContent = String(v[name]);
      return el;
    },
  };
})();
