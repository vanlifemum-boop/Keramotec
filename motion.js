/* Keramotec — Bewegung
 *
 * Ergaenzt die Buehnen-Engine (cinematic.js) um die Bewegung ausserhalb der
 * Buehnen. Alles laeuft ueber eine einzige rAF-Schleife und ausschliesslich
 * ueber transform und opacity — Layout-Eigenschaften zu animieren ruckelt.
 *
 * Sechs Stuecke:
 *   1. Schlagzeilen steigen wortweise aus einer Maske, zeilenweise gestaffelt
 *   2. Uebrige Elemente treten gestaffelt und aus wechselnder Richtung ein
 *   3. Flaechen werden per clip-path aufgedeckt statt eingeblendet
 *   4. Preise zaehlen hoch, sobald die Liste ins Bild kommt
 *   5. Knoepfe folgen dem Zeiger (nur Maus), dazu ein Cursor-Ring
 *   6. Das Laufband richtet sein Tempo nach der Scrollgeschwindigkeit
 *
 * Bei prefers-reduced-motion, Datensparmodus oder ohne JavaScript passiert
 * nichts davon — die Weiche im <head> setzt dann motion-off, und alle
 * Startzustaende bleiben unangetastet sichtbar.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  if (!root.classList.contains("js-cinematic")) return;

  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  root.classList.add("js-motion");

  // Scheitert hier irgendetwas, muss die Klasse wieder weg: an ihr haengen alle
  // Startzustaende. Ohne sie waeren halb animierte Ueberschriften unsichtbar.
  try {
    starten();
  } catch (err) {
    root.classList.remove("js-motion");
    document.querySelectorAll(".mw-ready").forEach(function (el) {
      el.classList.remove("mw-ready");
    });
    if (window.console) console.warn("Bewegung abgeschaltet:", err);
  }

  function starten() {

  var tasks = [];       // pro Frame auszufuehren
  var running = false;

  function loop() {
    for (var i = tasks.length - 1; i >= 0; i--) {
      if (tasks[i]() === false) tasks.splice(i, 1);
    }
    if (tasks.length) requestAnimationFrame(loop);
    else running = false;
  }

  function addTask(fn) {
    tasks.push(fn);
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  function onceVisible(el, fn, margin) {
    if (!("IntersectionObserver" in window)) return fn();
    var io = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        fn();
      },
      { threshold: 0.01, rootMargin: margin || "0px 0px -12% 0px" }
    );
    io.observe(el);
  }

  // ---------- 1. Schlagzeilen: Woerter steigen aus ihrer eigenen Maske ----------

  // Der Hero hat seine eigene Choreografie ueber die Buehne — dort nicht anfassen.
  var HEADS = ".statement h2, .section-head h2, .protection h2, .pricing h2, .craft h2, .contact h2, .display-copy";

  function wrapWords(node) {
    // Rekursiv, damit <em> und <span> im Markup erhalten bleiben.
    var kids = Array.prototype.slice.call(node.childNodes);
    kids.forEach(function (child) {
      if (child.nodeType === 3) {
        var parts = child.nodeValue.split(/(\s+)/);
        if (!child.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          var outer = document.createElement("span");
          outer.className = "mw";
          var inner = document.createElement("span");
          inner.className = "mw-i";
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== "BR") {
        wrapWords(child);
      }
    });
  }

  function splitHeading(el) {
    if (el.dataset.split) return;
    el.dataset.split = "1";
    wrapWords(el);

    // Zeilen ueber die Oberkante gruppieren und daraus die Staffelung ableiten.
    var words = el.querySelectorAll(".mw");
    var lastTop = null;
    var line = -1;
    for (var i = 0; i < words.length; i++) {
      var top = words[i].offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 4) {
        line++;
        lastTop = top;
      }
      words[i].firstChild.style.transitionDelay = (line * 90 + i * 18) + "ms";
    }
    el.classList.add("mw-ready");

    onceVisible(el, function () {
      el.classList.add("mw-in");
    });
  }

  document.querySelectorAll(HEADS).forEach(splitHeading);

  // ---------- 2. Gestaffelte Eintritte, wechselnde Richtung ----------

  var reveals = document.querySelectorAll("[data-reveal]");
  var perSection = new Map();
  reveals.forEach(function (el) {
    var sec = el.closest("section, footer") || document.body;
    var list = perSection.get(sec) || [];
    list.push(el);
    perSection.set(sec, list);
  });

  perSection.forEach(function (list) {
    list.forEach(function (el, i) {
      // Nicht alles von unten: jedes dritte Element kommt seitlich herein.
      el.style.setProperty("--rv-delay", Math.min(i, 6) * 70 + "ms");
      if (i % 3 === 2) el.classList.add("rv-side");
    });
  });

  // ---------- 3. Flaechen per clip-path aufdecken ----------

  // Achtung: clip-path verkleinert die Flaeche, die ein IntersectionObserver
  // sieht, auf null — beobachtet man das geclippte Element selbst, meldet es nie
  // einen Schnitt und bleibt fuer immer zugedeckt. Deshalb haengt der Beobachter
  // am Elternelement, und die Karten decken sich darin gestaffelt auf.
  var maskGruppen = new Map();
  document.querySelectorAll(".specialty-card, .craft-visual, .comparison-card, .benefit-grid").forEach(function (el) {
    var eltern = el.parentElement || el;
    var liste = maskGruppen.get(eltern) || [];
    liste.push(el);
    maskGruppen.set(eltern, liste);
  });

  maskGruppen.forEach(function (liste, eltern) {
    liste.forEach(function (el, i) {
      el.classList.add("mask-reveal");
      el.style.transitionDelay = i * 140 + "ms";
    });
    onceVisible(eltern, function () {
      liste.forEach(function (el) {
        el.classList.add("mask-in");
      });
    });
  });

  // ---------- 4. Preise zaehlen hoch ----------

  function countUp(el) {
    var raw = el.textContent;
    var match = raw.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/);
    if (!match) return;
    var ziel = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
    if (!isFinite(ziel) || ziel < 10) return;

    var nachkomma = /,\d{2}/.test(match[1]) ? 2 : 0;
    var start = null;
    var dauer = 900;
    var vorher = raw.slice(0, match.index);
    var nachher = raw.slice(match.index + match[1].length);
    el.style.fontVariantNumeric = "tabular-nums";

    addTask(function (t) {
      var now = performance.now();
      if (start === null) start = now;
      var p = Math.min((now - start) / dauer, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var wert = ziel * eased;
      el.textContent = vorher + wert.toLocaleString("de-DE", {
        minimumFractionDigits: nachkomma,
        maximumFractionDigits: nachkomma,
      }) + nachher;
      return p < 1;
    });
  }

  document.querySelectorAll(".price-group").forEach(function (group) {
    onceVisible(group, function () {
      group.querySelectorAll(".price-table b, summary small").forEach(countUp);
    });
  });

  // ---------- 5. Magnetische Knoepfe und Cursor-Ring (nur Maus) ----------

  if (fine && !coarse) {
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my, gross = false;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      var ziel = e.target.closest ? e.target.closest("a, button, summary") : null;
      if (!!ziel !== gross) {
        gross = !!ziel;
        ring.classList.toggle("is-over", gross);
      }
    }, { passive: true });

    addTask(function () {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0) translate(-50%,-50%)";
      return true;
    });

    document.querySelectorAll(".button, .nav-cta").forEach(function (btn) {
      var dx = 0, dy = 0, tx = 0, ty = 0, aktiv = false;

      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        // Hoechstens ein Achtel der Knopfbreite — sonst wirkt es albern.
        tx = ((e.clientX - r.left) / r.width - 0.5) * (r.width * 0.16);
        ty = ((e.clientY - r.top) / r.height - 0.5) * (r.height * 0.28);
        if (!aktiv) {
          aktiv = true;
          addTask(function () {
            dx += (tx - dx) * 0.16;
            dy += (ty - dy) * 0.16;
            btn.style.setProperty("--mag-x", dx.toFixed(2) + "px");
            btn.style.setProperty("--mag-y", dy.toFixed(2) + "px");
            if (!aktiv && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
              btn.style.removeProperty("--mag-x");
              btn.style.removeProperty("--mag-y");
              return false;
            }
            return true;
          });
        }
      });

      btn.addEventListener("mouseleave", function () {
        tx = 0;
        ty = 0;
        aktiv = false;
      });
    });
  }

  // ---------- 6. Laufband folgt der Scrollgeschwindigkeit ----------

  var track = document.querySelector(".service-track");
  if (track) {
    var offset = 0, letzterY = window.scrollY, tempo = 0;
    var breite = 0;

    var messen = function () { breite = track.scrollWidth / 2; };
    messen();
    window.addEventListener("resize", messen, { passive: true });

    track.style.animation = "none";

    onceVisible(track.parentElement, function () {
      addTask(function () {
        var y = window.scrollY;
        var delta = y - letzterY;
        letzterY = y;
        // Grundtempo plus Zuschlag aus der Scrollbewegung, gedaempft.
        tempo += (0.6 + Math.min(Math.abs(delta) * 0.18, 7) - tempo) * 0.08;
        offset = (offset + tempo) % (breite || 1);
        track.style.transform = "translate3d(" + (-offset).toFixed(1) + "px,0,0)";
        return true;
      });
    }, "200px 0px 200px 0px");
  }

  } /* Ende starten() */
})();
