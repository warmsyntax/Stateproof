/* ==========================================================================
   STATEPROOF — PROOF FIELD ENGINE
   Stepped (discrete) motion only. No smooth easing anywhere.
   1. Hero boot sequence (pixel reveals, stepped)
   2. Horizontal evidence rail (GSAP ScrollTrigger pin + scrub)
   3. Proof Field canvas — lines & symmetric squares that form on scroll
   4. Emblem CRT flicker reveals
   5. Copy chips + toast
   ========================================================================== */

(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';

  if (hasGsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ------------------------------------------------------------------
     1. HERO BOOT SEQUENCE — every reveal is a stepped state change
     ------------------------------------------------------------------ */
  function bootHero() {
    if (!hasGsap || prefersReduced) return;

    var tl = gsap.timeline({ defaults: { ease: 'steps(8)' } });

    tl.from('.ht-inner', {
      yPercent: 110,
      duration: 0.7,
      stagger: 0.14
    });

    tl.from('.boot-line', {
      opacity: 0,
      duration: 0.001,          // hard on/off, stepped via stagger
      stagger: 0.18,
      ease: 'steps(1)'
    }, '-=0.35');

    tl.from('.nav', {
      yPercent: -100,
      duration: 0.3,
      ease: 'steps(4)'
    }, 0);
  }

  /* ------------------------------------------------------------------
     2. HORIZONTAL EVIDENCE RAIL — vertical scroll drives lateral motion
     ------------------------------------------------------------------ */
  function initRail() {
    var section = document.getElementById('proof-line');
    var viewport = document.getElementById('rail-viewport');
    var track = document.getElementById('rail-track');
    var notches = Array.prototype.slice.call(document.querySelectorAll('.rp-notch'));
    if (!section || !viewport || !track) return;

    // Mobile / reduced motion / no GSAP: native horizontal snap-scroll strip
    if (!hasGsap || !window.ScrollTrigger || prefersReduced || window.innerWidth <= 900) {
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var idx = Array.prototype.indexOf.call(track.children, entry.target);
            notches.forEach(function (n, i) { n.classList.toggle('is-on', i <= idx); });
          });
        }, { root: viewport, threshold: 0.6 });
        Array.prototype.forEach.call(track.children, function (c) { io.observe(c); });
      }
      return;
    }

    // Canonical pinned-horizontal pattern:
    // the section pins in place; vertical wheel scroll scrubs the track
    // sideways until it finishes, then the page releases back to vertical.
    var getDistance = function () {
      return Math.max(0, track.scrollWidth - viewport.clientWidth);
    };

    gsap.to(track, {
      x: function () { return -getDistance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: function () { return '+=' + getDistance(); },
        pin: true,                 // pin the section element itself
        scrub: 1,                  // smooth-follow the wheel
        anticipatePin: 1,
        invalidateOnRefresh: true, // recompute on resize / font load
        onUpdate: function (self) {
          // Stepped notch progress — snaps discretely, never tweens
          var count = Math.min(notches.length, Math.floor(self.progress * notches.length) + 1);
          notches.forEach(function (n, i) { n.classList.toggle('is-on', i < count); });
        }
      }
    });

    // Keep measurements honest once images/fonts settle
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  /* ------------------------------------------------------------------
     3. PROOF FIELD — canvas of lines + symmetric squares forming on scroll
     ------------------------------------------------------------------ */
  function initProofField() {
    if (prefersReduced) return;

    var canvas = document.getElementById('proof-field');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var W = 0, H = 0, dpr = 1;
    var cells = [];          // mirrored square cells
    var GRID = 88;           // px grid pitch
    var scrollUnits = 0;     // quantized scroll progress
    var running = true;
    var raf = null;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildCells();
    }

    // Deterministic pseudo-random from cell coords (stable across resizes)
    function hash(x, y) {
      var h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
      h = (h ^ (h >> 13)) * 1274126177;
      return ((h ^ (h >> 16)) >>> 0) / 4294967295;
    }

    function buildCells() {
      cells = [];
      var cols = Math.ceil(W / GRID);
      var rows = Math.ceil(H / GRID);
      var midCol = cols / 2;
      for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
          var r = hash(x, y);
          if (r < 0.62) continue;                       // sparse field
          // threshold: center-out formation order
          var distFromCenter = Math.abs(x - midCol) / midCol;   // 0 center → 1 edge
          var order = (distFromCenter * 0.65) + (y / rows) * 0.35 + r * 0.18;
          cells.push({
            x: x * GRID,
            y: y * GRID,
            r: r,
            order: order,
            mirrorX: W - (x + 1) * GRID                 // symmetrical twin
          });
        }
      }
      cells.sort(function (a, b) { return a.order - b.order; });
    }

    function maxScroll() {
      return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      var progress = window.scrollY / maxScroll();            // 0 → 1
      // Quantize to discrete steps — the field "jumps", it never glides
      var STEPS = 48;
      scrollUnits = Math.floor(progress * STEPS) / STEPS;

      var midX = Math.round(W / 2);

      // --- central spine + horizontal scan lines -------------------------
      ctx.lineWidth = 1;

      var spineH = Math.min(1, 0.15 + scrollUnits * 1.4) * H;
      ctx.strokeStyle = 'rgba(232, 228, 216, 0.10)';
      ctx.beginPath();
      ctx.moveTo(midX + 0.5, (H - spineH) / 2);
      ctx.lineTo(midX + 0.5, (H + spineH) / 2);
      ctx.stroke();

      // horizontal lines extending from spine, count grows with scroll
      var lineCount = 3 + Math.floor(scrollUnits * 9);        // 3 → 12
      for (var i = 0; i < lineCount; i++) {
        var ly = Math.round(((i + 1) / (lineCount + 1)) * H) + 0.5;
        var reach = (0.12 + hash(i, 7) * 0.5) * Math.min(1, 0.2 + scrollUnits * 1.6);
        var len = reach * W * 0.5;
        var lime = (i % 4 === 0);
        ctx.strokeStyle = lime
          ? 'rgba(212, 246, 56, 0.20)'
          : 'rgba(232, 228, 216, 0.07)';
        ctx.beginPath();
        ctx.moveTo(midX - len, ly);
        ctx.lineTo(midX + len, ly);                            // symmetric about spine
        ctx.stroke();

        // square tick caps at line ends
        if (scrollUnits > 0.12) {
          ctx.strokeStyle = lime ? 'rgba(212, 246, 56, 0.35)' : 'rgba(232, 228, 216, 0.12)';
          ctx.strokeRect(midX - len - 3, ly - 3, 6, 6);
          ctx.strokeRect(midX + len - 3, ly - 3, 6, 6);
        }
      }

      // --- mirrored square cells ------------------------------------------
      var visibleCount = Math.floor(cells.length * Math.min(1, scrollUnits * 1.9));
      for (var c = 0; c < visibleCount; c++) {
        var cell = cells[c];
        // grow square size in 3 discrete steps
        var stage = Math.min(3, Math.floor((scrollUnits * 1.9 * cells.length - c) / 6) + 1);
        var s = stage * 5 * (cell.r > 0.85 ? 2 : 1);
        var alpha = cell.r > 0.9 ? 0.30 : 0.12;
        var isLime = cell.r > 0.93;

        ctx.strokeStyle = isLime
          ? 'rgba(212, 246, 56, ' + alpha + ')'
          : 'rgba(232, 228, 216, ' + alpha + ')';

        ctx.strokeRect(Math.round(cell.x) + 0.5, Math.round(cell.y) + 0.5, s, s);
        ctx.strokeRect(Math.round(cell.mirrorX) + 0.5, Math.round(cell.y) + 0.5, s, s); // twin

        // connectors from select cells to the spine
        if (cell.r > 0.95 && stage >= 3) {
          ctx.strokeStyle = 'rgba(158, 199, 187, 0.10)';
          ctx.beginPath();
          ctx.moveTo(Math.round(cell.x) + 0.5, Math.round(cell.y) + 0.5);
          ctx.lineTo(midX + 0.5, Math.round(cell.y) + 0.5);
          ctx.stroke();
        }
      }
    }

    function onScroll() {
      if (!running) return;
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = null; draw(); });
    }

    // Pause when hero is far off-screen (nothing visible to draw against)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        running = entries[0].isIntersecting || window.scrollY < window.innerHeight * 4;
      }, { threshold: 0 }).observe(document.body);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { resize(); draw(); });
    resize();
    draw();
  }

  /* ------------------------------------------------------------------
     4. EMBLEM CRT FLICKER — artworks gain signal in discrete steps
     ------------------------------------------------------------------ */
  function initEmblems() {
    var emblems = document.querySelectorAll('[data-flicker]');
    if (!emblems.length) return;

    if (!hasGsap || prefersReduced || !('IntersectionObserver' in window)) {
      emblems.forEach(function (el) { el.style.opacity = ''; });
      return;
    }

    emblems.forEach(function (el) {
      gsap.set(el, { opacity: 0 });
      var fired = false;
      new IntersectionObserver(function (entries, obs) {
        if (!entries[0].isIntersecting || fired) return;
        fired = true;
        obs.disconnect();
        var target = el.closest('.hero-emblem') ? 0.34 : (el.closest('.execute-emblem') ? 0.9 : 1);
        // stepped flicker: 0 → 1 → 0.2 → 0.9 → 0.4 → target
        gsap.timeline({ ease: 'steps(1)' })
          .to(el, { opacity: target, duration: 0.05 })
          .to(el, { opacity: 0.15, duration: 0.05 })
          .to(el, { opacity: target, duration: 0.05 })
          .to(el, { opacity: 0.4, duration: 0.04 })
          .to(el, { opacity: target, duration: 0.06 });
      }, { threshold: 0.25 }).observe(el);
    });
  }

  /* ------------------------------------------------------------------
     5. COPY CHIPS + TOAST
     ------------------------------------------------------------------ */
  function initCopy() {
    var toast = document.getElementById('toast');
    var toastTimer = null;

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 1600);
    }

    document.querySelectorAll('.copy-trigger').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy') || '';
        var tag = btn.querySelector('.chip-tag');

        function confirm() {
          btn.classList.add('is-copied');
          if (tag) {
            var original = 'COPY';
            tag.textContent = 'COPIED ✓';
            setTimeout(function () {
              tag.textContent = original;
              btn.classList.remove('is-copied');
            }, 1600);
          }
          showToast('COPIED TO CLIPBOARD ✓');
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(confirm).catch(function () {
            fallbackCopy(text); confirm();
          });
        } else {
          fallbackCopy(text); confirm();
        }
      });
    });

    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
    }
  }

  /* ------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------ */
  function init() {
    bootHero();
    initRail();
    initProofField();
    initEmblems();
    initCopy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
