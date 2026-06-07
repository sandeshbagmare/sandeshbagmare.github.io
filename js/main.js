/* =====================================================================
   Sandesh Bagmare — Portfolio · main.js
   Drives: preloader, smooth-scroll, cursor, nav, reveals, counters,
   tilt/magnetic, hero split-in, cinematic journey, horizontal projects.
   Designed to degrade gracefully: if a CDN lib is missing or the user
   prefers reduced motion, the page still works and the preloader clears.
   ===================================================================== */
(function () {
  "use strict";

  var doc = document;
  var win = window;
  var reduceMotion = win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasFinePointer = !(win.matchMedia && win.matchMedia("(hover: none)").matches);

  var hasGSAP = typeof win.gsap !== "undefined";
  var hasST = hasGSAP && typeof win.ScrollTrigger !== "undefined";
  var hasMotionPath = hasGSAP && typeof win.MotionPathPlugin !== "undefined";
  var hasLenis = typeof win.Lenis !== "undefined";

  if (hasST) win.gsap.registerPlugin(win.ScrollTrigger);
  if (hasMotionPath) win.gsap.registerPlugin(win.MotionPathPlugin);

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ------------------------------------------------------------------ *
   * Footer year (do it immediately — cheap and always safe)
   * ------------------------------------------------------------------ */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------ *
   * Preloader — fake progress to 100%, then reveal. Always clears.
   * ------------------------------------------------------------------ */
  (function preloader() {
    var pre = $("#preloader");
    var pct = $("#loadPct");
    if (!pre) return;

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (pct) pct.textContent = "100";
      pre.classList.add("done");
      doc.body.removeAttribute("data-loading");
      // Kick reveal/animations now that things are visible
      win.dispatchEvent(new Event("preloader:done"));
    }

    if (reduceMotion) {
      finish();
      return;
    }

    var value = 0;
    var timer = setInterval(function () {
      value += Math.max(2, (100 - value) * 0.12);
      if (value >= 99) value = 99;
      if (pct) pct.textContent = String(Math.round(value));
    }, 90);

    function settle() {
      clearInterval(timer);
      // brief beat at 100 then fade
      setTimeout(finish, 280);
    }

    if (doc.readyState === "complete") {
      settle();
    } else {
      win.addEventListener("load", settle);
    }
    // Hard fallback so a slow/blocked asset can never trap the user.
    setTimeout(function () { clearInterval(timer); finish(); }, 4500);
  })();

  /* ------------------------------------------------------------------ *
   * Smooth scrolling (Lenis) — wired to GSAP ticker when available.
   * ------------------------------------------------------------------ */
  var lenis = null;
  if (hasLenis && !reduceMotion) {
    try {
      lenis = new win.Lenis({ duration: 1.1, smoothWheel: true, lerp: 0.1 });
      if (hasGSAP) {
        win.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        win.gsap.ticker.lagSmoothing(0);
        if (hasST) lenis.on("scroll", win.ScrollTrigger.update);
      } else {
        var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    } catch (e) { lenis = null; }
  }

  function scrollToTarget(target) {
    var el = typeof target === "string" ? doc.querySelector(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -70 });
    else el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  // Intercept in-page anchor links for consistent offset behavior.
  $all('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute("href");
    if (!href || href === "#") return;
    a.addEventListener("click", function (e) {
      var t = doc.querySelector(href);
      if (!t) return;
      e.preventDefault();
      scrollToTarget(t);
      closeNav();
    });
  });

  /* ------------------------------------------------------------------ *
   * Custom cursor
   * ------------------------------------------------------------------ */
  (function cursor() {
    if (!hasFinePointer || reduceMotion) return;
    var ring = $("#cursor");
    var dot = $("#cursorDot");
    if (!ring || !dot) return;

    var rx = win.innerWidth / 2, ry = win.innerHeight / 2;
    var dx = rx, dy = ry;

    win.addEventListener("mousemove", function (e) {
      dx = e.clientX; dy = e.clientY;
      dot.style.transform = "translate(" + dx + "px," + dy + "px) translate(-50%,-50%)";
    }, { passive: true });

    (function loop() {
      rx += (dx - rx) * 0.18;
      ry += (dy - ry) * 0.18;
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();

    // Delegate hover state so dynamically focused elements work too.
    doc.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest('[data-cursor="hover"]')) ring.classList.add("is-hover");
    });
    doc.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest('[data-cursor="hover"]')) ring.classList.remove("is-hover");
    });
  })();

  /* ------------------------------------------------------------------ *
   * Nav: scrolled state, burger toggle, active link on scroll
   * ------------------------------------------------------------------ */
  var nav = $("#nav");
  var navLinks = $("#navLinks");
  var burger = $("#burger");

  function closeNav() {
    if (navLinks) navLinks.classList.remove("open");
  }

  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });
  }

  function onScrollNav() {
    if (nav) nav.classList.toggle("scrolled", win.scrollY > 24);
  }
  onScrollNav();
  win.addEventListener("scroll", onScrollNav, { passive: true });

  // Scroll progress bar
  var scrollBar = $("#scrollBar");
  function onScrollProgress() {
    if (!scrollBar) return;
    var h = doc.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (win.scrollY / max) * 100 : 0;
    scrollBar.style.width = clamp(p, 0, 100) + "%";
  }
  onScrollProgress();
  win.addEventListener("scroll", onScrollProgress, { passive: true });

  // Active nav link via section observation
  (function activeLinks() {
    var links = $all(".nav__links a");
    if (!links.length || !("IntersectionObserver" in win)) return;
    var map = {};
    links.forEach(function (l) {
      var id = (l.getAttribute("href") || "").replace("#", "");
      if (id) map[id] = l;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var l = map[en.target.id];
        if (!l) return;
        if (en.isIntersecting) {
          links.forEach(function (x) { x.classList.remove("active"); });
          l.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    Object.keys(map).forEach(function (id) {
      var sec = doc.getElementById(id);
      if (sec) io.observe(sec);
    });
  })();

  /* ------------------------------------------------------------------ *
   * Reveal on scroll
   * ------------------------------------------------------------------ */
  (function reveals() {
    var els = $all(".reveal");
    if (!els.length) return;
    if (reduceMotion || !("IntersectionObserver" in win)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------------ *
   * Animated counters ([data-count], data-suffix, data-decimals)
   * ------------------------------------------------------------------ */
  (function counters() {
    var nums = $all("[data-count]");
    if (!nums.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count")) || 0;
      var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduceMotion) {
        el.textContent = target.toFixed(dec) + suffix;
        return;
      }
      var start = null;
      var dur = 1500;
      function step(ts) {
        if (start === null) start = ts;
        var p = clamp((ts - start) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = (target * eased).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(dec) + suffix;
      }
      requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in win)) {
      nums.forEach(run);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------------ *
   * Tilt + magnetic micro-interactions
   * ------------------------------------------------------------------ */
  (function tilt() {
    if (!hasFinePointer || reduceMotion) return;
    $all("[data-tilt]").forEach(function (el) {
      var max = 8;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateX(" + (-py * max) + "deg) rotateY(" + (px * max) + "deg)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });

    $all("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + mx * 0.25 + "px," + my * 0.35 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  })();

  /* ------------------------------------------------------------------ *
   * Hero headline split-in
   * ------------------------------------------------------------------ */
  (function heroSplit() {
    var parts = $all(".hero__title [data-split]");
    if (!parts.length) return;
    if (!hasGSAP || reduceMotion) {
      parts.forEach(function (p) { p.style.transform = "none"; });
      return;
    }
    function play() {
      win.gsap.from(parts, {
        yPercent: 120, opacity: 0, duration: 1, ease: "expo.out",
        stagger: 0.08, delay: 0.15
      });
    }
    win.addEventListener("preloader:done", play, { once: true });
  })();

  /* ------------------------------------------------------------------ *
   * Background FX canvas — soft pollen / seed motes drifting on a breeze
   * ------------------------------------------------------------------ */
  (function fx() {
    var canvas = $("#fx");
    if (!canvas || reduceMotion) return;
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;

    var dpr = Math.min(win.devicePixelRatio || 1, 2);
    var w = 0, h = 0, motes = [];
    // gentle green / honey tones to match the garden-glass theme
    var tints = ["124,193,151", "79,157,107", "216,162,74", "143,195,212"];

    function spawn(seeded) {
      return {
        x: Math.random() * w,
        y: seeded ? Math.random() * h : h + 20 * dpr,
        r: (1 + Math.random() * 2.6) * dpr,
        drift: (Math.random() - 0.5) * 0.3 * dpr,   // sideways sway base
        rise: (0.18 + Math.random() * 0.4) * dpr,   // upward speed
        phase: Math.random() * Math.PI * 2,
        sway: (0.4 + Math.random() * 0.9),
        alpha: 0.18 + Math.random() * 0.35,
        tint: tints[(Math.random() * tints.length) | 0]
      };
    }

    function resize() {
      w = canvas.width = Math.floor(win.innerWidth * dpr);
      h = canvas.height = Math.floor(win.innerHeight * dpr);
      canvas.style.width = win.innerWidth + "px";
      canvas.style.height = win.innerHeight + "px";
      var count = Math.min(48, Math.floor((win.innerWidth * win.innerHeight) / 34000));
      motes = [];
      for (var i = 0; i < count; i++) motes.push(spawn(true));
    }
    resize();
    win.addEventListener("resize", resize);

    var t = 0;
    function frame() {
      t += 0.01;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.y -= m.rise;
        m.x += m.drift + Math.sin(t * m.sway + m.phase) * 0.4 * dpr;
        if (m.y < -20 * dpr || m.x < -30 * dpr || m.x > w + 30 * dpr) {
          motes[i] = spawn(false);
          continue;
        }
        var grd = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 2.4);
        grd.addColorStop(0, "rgba(" + m.tint + "," + m.alpha + ")");
        grd.addColorStop(1, "rgba(" + m.tint + ",0)");
        ctx.beginPath();
        ctx.fillStyle = grd;
        ctx.arc(m.x, m.y, m.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------------------ *
   * Cinematic JOURNEY — cargo pod travels the path as you scroll.
   * Needs GSAP + ScrollTrigger + MotionPath; otherwise falls back to a
   * static, all-lit layout (CSS already pins it; we just light stations).
   * ------------------------------------------------------------------ */
  (function journey() {
    var section = $("#journey");
    var cargo = $("#cargo");
    var path = $("#trackLine");
    var stations = $all(".journey .station");
    var bar = $("#journeyBar");
    var cap = $("#journeyCap");
    if (!section) return;

    var caps = [
      "Watch a request travel through the agentic stack I build.",
      "A prompt arrives — raw user intent enters the system.",
      "LangGraph plans: it decomposes the goal into a sequence of steps.",
      "The agent acts — calling tools and retrieving context via RAG.",
      "DeepEval scores the result, keeping the agent honest in production."
    ];

    if (!hasGSAP || !hasST || !hasMotionPath || reduceMotion) {
      stations.forEach(function (s) { s.classList.add("lit"); });
      if (bar) bar.style.width = "100%";
      return;
    }

    var lastIdx = -1;
    win.gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: function (self) {
          var p = self.progress;
          if (bar) bar.style.width = (p * 100).toFixed(1) + "%";
          var idx = clamp(Math.floor(p * stations.length + 0.0001), 0, stations.length - 1);
          stations.forEach(function (s, i) { s.classList.toggle("lit", i <= idx); });
          var capIdx = clamp(Math.round(p * (caps.length - 1)), 0, caps.length - 1);
          if (cap && capIdx !== lastIdx) {
            lastIdx = capIdx;
            cap.style.opacity = "0";
            setTimeout(function () { cap.textContent = caps[capIdx]; cap.style.opacity = "1"; }, 160);
          }
        }
      }
    }).to(cargo, {
      motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true },
      ease: "none"
    });
  })();

  /* ------------------------------------------------------------------ *
   * Horizontal PROJECTS gallery — vertical scroll drives sideways motion.
   * ------------------------------------------------------------------ */
  (function projects() {
    var wrap = $("#hwrap");
    var track = $("#htrack");
    if (!wrap || !track) return;

    if (!hasGSAP || !hasST || reduceMotion) {
      // Fallback: let users scroll the gallery horizontally by hand.
      wrap.style.overflowX = "auto";
      wrap.style.scrollSnapType = "x proximity";
      return;
    }

    function amount() { return Math.max(0, track.scrollWidth - win.innerWidth); }

    win.gsap.to(track, {
      x: function () { return -amount(); },
      ease: "none",
      scrollTrigger: {
        trigger: wrap,
        start: "center center",
        end: function () { return "+=" + amount(); },
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
  })();

  // Recompute ScrollTrigger once everything (incl. fonts/images) settles.
  if (hasST) {
    win.addEventListener("load", function () { win.ScrollTrigger.refresh(); });
    win.addEventListener("preloader:done", function () { win.ScrollTrigger.refresh(); });
  }
})();
