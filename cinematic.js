/* Keramotec — cinematic scroll stages
 *
 * Adaptiert aus dem scroll-cinematic-Skill (templates/scroll-cinematic.js).
 * Statt einer vorgeladenen Frame-Sequenz (~180 JPGs) laufen die Stages hier im
 * Render-Modus: die vorhandene Fotografie der Seite wird pro Frame neu auf ein
 * <canvas> gezeichnet und der Effekt aus der Scroll-Position berechnet. Ein
 * Handy lädt dadurch zwei Bilder statt mehrerer Megabyte Einzelframes.
 *
 * Stage 1 (#top)    — Push-in auf das Hero-Bild, dazu eine Versiegelungswelle,
 *                     die matte, ungeschützte Oberfläche in versiegelten Glanz
 *                     überführt. Overlay-Text in drei Beats.
 * Stage 2 (#schutz) — Oberflächen-Makro mit Lotus-Effekt: Wasserperlen bilden
 *                     sich, während der Abschnitt durch den Viewport läuft.
 *
 * Ohne JavaScript, bei prefers-reduced-motion oder bei aktiviertem Datensparen
 * bleibt die Seite auf dem statischen CSS-Layout stehen — dann wird kein Canvas
 * gezeichnet und keine rAF-Schleife gestartet.
 */
(function () {
  "use strict";

  var root = document.documentElement;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var saveData = !!(conn && (conn.saveData || /2g/.test(conn.effectiveType || "")));

  if (reducedMotion.matches || saveData || !window.requestAnimationFrame) {
    root.classList.add("motion-off");
    return;
  }

  root.classList.add("js-cinematic");

  // Zurück auf das statische Layout, wenn der Nutzer Bewegung später abschaltet.
  var onMotionChange = function () {
    if (reducedMotion.matches) window.location.reload();
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", onMotionChange);
  else if (reducedMotion.addListener) reducedMotion.addListener(onMotionChange);

  var coarse = window.matchMedia("(pointer: coarse)").matches;
  // Auf Touchgeräten kostet jede zusätzliche Pixelzeile Akku: DPR niedriger
  // deckeln und die Gesamtfläche des Backing-Stores begrenzen.
  var DPR_CAP = coarse ? 1.5 : 2;
  var MAX_PIXELS = coarse ? 2.1e6 : 4.2e6;

  var stages = [];
  var lenis = null;

  // ---------- Hilfsfunktionen ----------

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function loadImage(src) {
    var img = new Image();
    img.decoding = "async";
    img.src = src;
    return img;
  }

  // Deckt sich mit CSS `background-size: cover`, zusätzlich mit Zoom und
  // vertikalem Versatz für die Kamerafahrt.
  function drawCover(ctx, img, w, h, zoom, shiftY, focusX) {
    if (!img.complete || !img.naturalWidth) return false;
    var scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    var dw = img.naturalWidth * scale;
    var dh = img.naturalHeight * scale;
    var dx = (w - dw) * (focusX == null ? 0.5 : focusX);
    var dy = (h - dh) * 0.5 + shiftY;
    ctx.drawImage(img, dx, dy, dw, dh);
    return true;
  }

  // Blend-Modes im Canvas (Safari/Chrome/Firefox unterstützen sie, ältere
  // WebViews nicht) — einmal prüfen und sonst auf einfache Deckflächen fallen.
  var blendOk = (function () {
    try {
      var c = document.createElement("canvas").getContext("2d");
      c.globalCompositeOperation = "saturation";
      return c.globalCompositeOperation === "saturation";
    } catch (err) {
      return false;
    }
  })();

  // ---------- Stage 1: Hero, Versiegelungswelle ----------

  var heroImage = loadImage("assets/keramotec-hero.webp");

  function renderHero(ctx, p, w, h) {
    // Hochformat (Handy) braucht einen anderen Bildausschnitt: der Wagen steht
    // im Foto rechts und faellt bei mittigem Cover-Crop sonst aus dem Bild.
    var portrait = h > w;
    var eased = easeOutCubic(clamp(p / 0.9, 0, 1));
    var zoom = (portrait ? 1.1 : 1.16) - (portrait ? 0.1 : 0.16) * eased;
    var shiftY = -h * 0.05 * eased;

    ctx.fillStyle = "#080a0b";
    ctx.fillRect(0, 0, w, h);
    if (!drawCover(ctx, heroImage, w, h, zoom, shiftY, portrait ? 0.68 : 0.58)) return;

    // Die Welle läuft von links nach rechts und steht leicht schräg, damit die
    // Kante wie eine aufgetragene Bahn wirkt und nicht wie ein Bildschnitt.
    var edge = (-0.18 + 1.42 * clamp(p / 0.86, 0, 1)) * w;
    // Auf hohen, schmalen Flaechen wuerde h * 0.16 die Kante fast waagerecht
    // legen — deshalb zusaetzlich an der Breite deckeln.
    var tilt = Math.min(h * 0.16, w * 0.18);

    // Bereich links der Welle: noch unversiegelt — entsättigt und abgedunkelt.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-1, -1);
    ctx.lineTo(edge + tilt, -1);
    ctx.lineTo(edge - tilt, h + 1);
    ctx.lineTo(-1, h + 1);
    ctx.closePath();
    ctx.clip();
    if (blendOk) {
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "multiply";
      // Auf dem Handy liegt ohnehin ein kraeftiger Verlauf hinter der Typo,
      // deshalb dort weniger abdunkeln, sonst kippt das Bild ins Schwarze.
      ctx.fillStyle = portrait ? "rgba(140, 146, 149, 0.7)" : "rgba(122, 128, 131, 0.92)";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = portrait ? "rgba(10, 12, 13, 0.32)" : "rgba(10, 12, 13, 0.46)";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    // Bereich rechts der Welle: frisch versiegelt — Tiefenglanz.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(edge + tilt, -1);
    ctx.lineTo(w + 1, -1);
    ctx.lineTo(w + 1, h + 1);
    ctx.lineTo(edge - tilt, h + 1);
    ctx.closePath();
    ctx.clip();
    if (blendOk) {
      ctx.globalCompositeOperation = "overlay";
      var gloss = ctx.createLinearGradient(edge - tilt, 0, edge + w * 0.55, h);
      gloss.addColorStop(0, "rgba(255, 255, 255, 0.30)");
      gloss.addColorStop(0.45, "rgba(255, 255, 255, 0.07)");
      gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gloss;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    // Die Kante selbst: schmaler Lichtsaum, solange die Welle im Bild ist.
    if (edge > -tilt && edge < w + tilt) {
      var band = Math.max(w * 0.035, 26);
      ctx.save();
      ctx.globalCompositeOperation = blendOk ? "screen" : "source-over";
      var seam = ctx.createLinearGradient(edge - band, 0, edge + band * 0.4, 0);
      seam.addColorStop(0, "rgba(255, 255, 255, 0)");
      seam.addColorStop(0.72, "rgba(255, 252, 245, 0.42)");
      seam.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = seam;
      ctx.beginPath();
      ctx.moveTo(edge + tilt - band, -1);
      ctx.lineTo(edge + tilt + band * 0.4, -1);
      ctx.lineTo(edge - tilt + band * 0.4, h + 1);
      ctx.lineTo(edge - tilt - band, h + 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Vignette, damit die Overlay-Typo auf jedem Format lesbar bleibt.
    ctx.save();
    var vignette = ctx.createRadialGradient(
      w * 0.5, h * 0.5, Math.min(w, h) * 0.28,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.78
    );
    vignette.addColorStop(0, "rgba(5, 7, 8, 0)");
    vignette.addColorStop(1, portrait ? "rgba(5, 7, 8, 0.46)" : "rgba(5, 7, 8, 0.62)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ---------- Stage 2: Lotus-Effekt auf dem Oberflächen-Makro ----------

  var surfaceImage = loadImage("assets/keramotec-surface-detail.webp");

  // Feste Pseudo-Zufallsverteilung: gleiche Perlen bei jedem Aufruf und auf
  // jedem Gerät, damit beim Resize nichts springt.
  var BEADS = (function () {
    var list = [];
    var seed = 20260830;
    function rnd() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }
    for (var i = 0; i < 34; i++) {
      list.push({
        x: rnd(),
        y: rnd(),
        r: 0.009 + rnd() * 0.03,
        delay: rnd() * 0.55,
        drift: 0.2 + rnd() * 0.9,
      });
    }
    return list;
  })();

  function renderSurface(ctx, p, w, h) {
    // Die Wasserperlen im Foto liegen rechts; im Hochformat wandert der
    // Ausschnitt dorthin, sonst zeigt das Handy nur die dunkle Flaeche.
    var portrait = h > w;
    ctx.fillStyle = "#0a0c0d";
    ctx.fillRect(0, 0, w, h);
    // Gegenläufiger Parallax-Versatz zum Scroll.
    if (!drawCover(ctx, surfaceImage, w, h, portrait ? 1.06 : 1.12, (0.5 - p) * h * 0.09, portrait ? 0.72 : 0.5)) return;

    var count = w < 900 ? 16 : BEADS.length;
    var unit = Math.min(w, h);

    for (var i = 0; i < count; i++) {
      var b = BEADS[i];
      var t = clamp((p - b.delay) / 0.45, 0, 1);
      if (t <= 0) continue;

      var radius = b.r * unit * (0.35 + 0.65 * easeOutCubic(t));
      var cx = b.x * w;
      var cy = b.y * h + t * b.drift * unit * 0.06;
      var alpha = Math.min(t * 1.6, 1) * 0.85;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Körper der Perle: heller Rand, dunkler Kern — wie eine Linse auf Lack.
      var body = ctx.createRadialGradient(
        cx - radius * 0.32, cy - radius * 0.36, radius * 0.12,
        cx, cy, radius
      );
      body.addColorStop(0, "rgba(255, 255, 255, 0.6)");
      body.addColorStop(0.4, "rgba(206, 219, 226, 0.14)");
      body.addColorStop(0.78, "rgba(255, 255, 255, 0.04)");
      body.addColorStop(0.93, "rgba(255, 255, 255, 0.24)");
      body.addColorStop(1, "rgba(255, 255, 255, 0.52)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Glanzpunkt.
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      ctx.beginPath();
      ctx.ellipse(
        cx - radius * 0.34, cy - radius * 0.4,
        radius * 0.2, radius * 0.14,
        -0.5, 0, Math.PI * 2
      );
      ctx.fill();

      // Schatten unter der Perle.
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + radius * 0.92, radius * 0.72, radius * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ---------- Stage-Konfiguration ----------

  var CONFIG = [
    // "pin": klassische Sticky-Bühne, Fortschritt über die Sektionshöhe.
    { section: "#top", canvas: ".stage-canvas", mode: "pin", render: renderHero, image: heroImage },
    // "pass": Hintergrund-Canvas, Fortschritt vom Eintritt bis zum Austritt.
    // Per Attribut statt per ID, damit Start- und Partnerseite dieselbe Buehne
    // nutzen koennen, ohne dass eine von beiden eine fremde ID tragen muss.
    { section: "[data-stage='surface']", canvas: ".protection-canvas", mode: "pass", render: renderSurface, image: surfaceImage },
  ];

  // ---------- Engine ----------

  function setupStage(cfg) {
    var outer = document.querySelector(cfg.section);
    if (!outer) return null;
    var canvas = outer.querySelector(cfg.canvas);
    if (!canvas || !canvas.getContext) return null;

    var stage = {
      cfg: cfg,
      outer: outer,
      canvas: canvas,
      ctx: canvas.getContext("2d", { alpha: false }),
      beats: outer.querySelectorAll("[data-in]"),
      width: 0,
      height: 0,
      last: -1,
      visible: true,
    };

    // Erstes Bild zeichnen, sobald das Foto da ist.
    if (cfg.image && !cfg.image.complete) {
      cfg.image.addEventListener("load", function () {
        stage.last = -1;
        draw(stage, progressOf(stage));
      });
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          stage.visible = entries[0].isIntersecting;
        },
        { rootMargin: "120px 0px" }
      );
      io.observe(outer);
    }

    return stage;
  }

  function resize(stage) {
    var rect = stage.canvas.getBoundingClientRect();
    var cssW = Math.round(rect.width) || window.innerWidth;
    var cssH = Math.round(rect.height) || window.innerHeight;

    var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    var pixels = cssW * cssH * dpr * dpr;
    if (pixels > MAX_PIXELS) dpr *= Math.sqrt(MAX_PIXELS / pixels);

    var w = Math.max(1, Math.round(cssW * dpr));
    var h = Math.max(1, Math.round(cssH * dpr));
    if (w === stage.width && h === stage.height) return;

    stage.canvas.width = w;
    stage.canvas.height = h;
    stage.width = w;
    stage.height = h;
    stage.last = -1;
    draw(stage, progressOf(stage));
  }

  function progressOf(stage) {
    var rect = stage.outer.getBoundingClientRect();
    var vh = window.innerHeight;
    if (stage.cfg.mode === "pass") {
      // 0 = Sektion tritt unten in den Viewport, 1 = sie verlässt ihn oben.
      var span = vh + rect.height;
      return clamp((vh - rect.top) / span, 0, 1);
    }
    var scrollable = rect.height - vh;
    if (scrollable <= 0) return 0;
    return clamp(-rect.top / scrollable, 0, 1);
  }

  function draw(stage, p) {
    if (Math.abs(p - stage.last) < 0.0006) return;
    stage.last = p;
    stage.cfg.render(stage.ctx, p, stage.width, stage.height);
  }

  // Overlay-Beats: Ein- und Ausblenden über [data-in]/[data-out]-Fenster.
  // Ausgeblendete Beats werden auch für Maus und Tastatur stillgelegt, damit
  // unsichtbare Buttons nicht anklickbar oder antabbar bleiben.
  var FADE = 0.09;

  function updateBeats(stage, p) {
    for (var i = 0; i < stage.beats.length; i++) {
      var el = stage.beats[i];
      var inP = parseFloat(el.getAttribute("data-in")) || 0;
      var outAttr = el.getAttribute("data-out");
      var outP = outAttr == null ? 1.2 : parseFloat(outAttr);

      var opacity;
      if (p < inP) opacity = 0;
      else if (p < inP + FADE) opacity = (p - inP) / FADE;
      else if (p < outP - FADE) opacity = 1;
      else if (p < outP) opacity = (outP - p) / FADE;
      else opacity = 0;

      opacity = clamp(opacity, 0, 1);
      var hidden = opacity < 0.04;
      if (el._hidden !== hidden) {
        el._hidden = hidden;
        el.style.pointerEvents = hidden ? "none" : "auto";
        el.setAttribute("aria-hidden", hidden ? "true" : "false");
        el.inert = hidden;
      }
      if (el._opacity === opacity) continue;
      el._opacity = opacity;
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = "translate3d(0, " + ((1 - opacity) * 22).toFixed(1) + "px, 0)";
    }
  }

  function tick(time) {
    if (lenis) lenis.raf(time);
    for (var i = 0; i < stages.length; i++) {
      var stage = stages[i];
      if (!stage.visible) continue;
      var p = progressOf(stage);
      draw(stage, p);
      if (stage.beats.length) updateBeats(stage, p);
    }
    requestAnimationFrame(tick);
  }

  function init() {
    for (var i = 0; i < CONFIG.length; i++) {
      var stage = setupStage(CONFIG[i]);
      if (stage) stages.push(stage);
    }
    if (!stages.length) {
      root.classList.remove("js-cinematic");
      root.classList.add("motion-off");
      return;
    }

    // Lenis nur am Zeigegerät: auf Touch bleibt der native Scroll erhalten,
    // weil gekaperter Touch-Scroll auf dem Handy träge wirkt und mit
    // Pull-to-Refresh und Adressleiste kollidiert.
    if (!coarse && typeof window.Lenis === "function") {
      lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
      root.classList.add("has-lenis");
    }

    // Sprungmarken muessen ueber Lenis laufen, sonst springt die Seite hart,
    // weil natives Smooth-Scrolling neben Lenis abgeschaltet ist.
    if (lenis) {
      document.addEventListener("click", function (event) {
        var link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
        if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
        var id = link.getAttribute("href");
        if (!id || id === "#") return;
        var target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        lenis.scrollTo(target, { offset: -88, duration: 1.1 });
        if (history.replaceState) history.replaceState(null, "", id);
      });
    }

    stages.forEach(resize);

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          for (var s = 0; s < stages.length; s++) {
            if (stages[s].canvas === entries[i].target) resize(stages[s]);
          }
        }
      });
      stages.forEach(function (s) { ro.observe(s.canvas); });
    } else {
      window.addEventListener("resize", function () { stages.forEach(resize); }, { passive: true });
    }

    // Ausrichtung wechseln heißt neues Seitenverhältnis: einmal neu vermessen.
    window.addEventListener("orientationchange", function () {
      setTimeout(function () { stages.forEach(resize); }, 250);
    });

    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
