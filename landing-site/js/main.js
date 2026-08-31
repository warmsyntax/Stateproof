/* ==========================================================================
   STATEPROOF — PROOF FIELD ENGINE
   Stepped (discrete) motion only. No smooth easing anywhere.
   1. Dynamic Hero ASCII Flow Canvas (stepped particle & glyph streamlines)
   2. Horizontal evidence rail (GSAP ScrollTrigger pin + scrub)
   3. Proof Field global background canvas
   4. Hero boot sequence
   5. Copy chips + toast
   ========================================================================== */

(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ------------------------------------------------------------------
     1. HERO DYNAMIC ASCII / PARTICLE FLOW CANVAS
     ------------------------------------------------------------------ */
  function initHeroFlow() {
    var canvas = document.getElementById('hero-flow-canvas');
    var heroEl = document.getElementById('signal');
    if (!canvas || !heroEl || prefersReduced) return;
    var ctx = canvas.getContext('2d');

    var W = 0, H = 0, dpr = 1;
    var GRID_SIZE = 18;
    var cols = 0, rows = 0;
    var particles = [];
    var PARTICLE_COUNT = 100; // Lightweight & performant
    var ASCII_CHARS = ['·', '+', '×', '■', '░', '▓', '_', '/', '1', '0', '*', '~', '|', ':'];
    var mouse = { x: -1000, y: -1000, active: false };
    var isHeroVisible = true;
    var lastTick = 0;
    var tickInterval = 1000 / 25; // 25 FPS stepped cadence
    var rafId = null;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = heroEl.clientWidth || window.innerWidth;
      H = heroEl.clientHeight || window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(W / GRID_SIZE);
      rows = Math.ceil(H / GRID_SIZE);
      initParticles();
    }

    function initParticles() {
      particles = [];
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        var x = Math.floor(Math.random() * cols) * GRID_SIZE;
        var y = Math.floor(Math.random() * rows) * GRID_SIZE;
        var type = Math.random();
        particles.push({
          x: x,
          y: y,
          char: ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)],
          color: type > 0.82 ? '#D4F638' : (type > 0.65 ? '#9EC7BB' : '#E8E4D8'),
          alpha: 0.15 + Math.random() * 0.55,
          speed: 1 + Math.floor(Math.random() * 2),
          life: Math.floor(Math.random() * 100) + 40,
          age: 0
        });
      }
    }

    function getFlowAngle(x, y, t) {
      var nx = x * 0.0025;
      var ny = y * 0.003;
      var val = Math.sin(nx + t * 0.0008) + Math.cos(ny + t * 0.0005) + Math.sin((nx + ny) * 2);
      var octant = Math.floor(val * 4);
      return (octant * Math.PI) / 4;
    }

    function draw(timestamp) {
      if (!isHeroVisible) {
        rafId = null;
        return;
      }

      if (!lastTick || timestamp - lastTick >= tickInterval) {
        lastTick = timestamp;

        ctx.fillStyle = 'rgba(11, 11, 9, 0.32)';
        ctx.fillRect(0, 0, W, H);

        ctx.font = '11px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          p.age++;

          if (p.age > p.life || p.x < -GRID_SIZE || p.x > W + GRID_SIZE || p.y < -GRID_SIZE || p.y > H + GRID_SIZE) {
            p.x = Math.floor(Math.random() * cols) * GRID_SIZE;
            p.y = Math.floor(Math.random() * rows) * GRID_SIZE;
            p.age = 0;
            p.life = Math.floor(Math.random() * 100) + 40;
            p.char = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
            continue;
          }

          var angle = getFlowAngle(p.x, p.y, timestamp);
          var dx = Math.round(Math.cos(angle)) * GRID_SIZE * p.speed;
          var dy = Math.round(Math.sin(angle)) * GRID_SIZE * p.speed;

          if (mouse.active) {
            var mdx = p.x - mouse.x;
            var mdy = p.y - mouse.y;
            var distSq = mdx * mdx + mdy * mdy;
            var radius = 140;
            if (distSq < radius * radius && distSq > 1) {
              var push = Math.round((1 - Math.sqrt(distSq) / radius) * 2) * GRID_SIZE;
              dx += (mdx > 0 ? 1 : -1) * push;
              dy += (mdy > 0 ? 1 : -1) * push;
            }
          }

          p.x = Math.round((p.x + dx) / GRID_SIZE) * GRID_SIZE;
          p.y = Math.round((p.y + dy) / GRID_SIZE) * GRID_SIZE;

          if (p.age % 6 === 0) {
            p.char = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
          }

          ctx.save();
          ctx.globalAlpha = p.alpha * Math.sin((p.age / p.life) * Math.PI);
          ctx.fillStyle = p.color;
          ctx.fillText(p.char, p.x + GRID_SIZE / 2, p.y + GRID_SIZE / 2);

          if (p.color === '#D4F638' && p.age % 4 === 0) {
            ctx.strokeStyle = 'rgba(212, 246, 56, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x + 1, p.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
          }
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    heroEl.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    }, { passive: true });

    heroEl.addEventListener('mouseleave', function () {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var isVisible = entries[0].isIntersecting;
        if (isVisible !== isHeroVisible) {
          isHeroVisible = isVisible;
          if (isHeroVisible && !rafId) {
            lastTick = performance.now();
            rafId = requestAnimationFrame(draw);
          }
        }
      }, { threshold: 0.05 }).observe(heroEl);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    rafId = requestAnimationFrame(draw);
  }

  /* ------------------------------------------------------------------
     2. HORIZONTAL EVIDENCE RAIL (GSAP ScrollTrigger Pin + Scrub)
     ------------------------------------------------------------------ */
  function initRail() {
    var section = document.getElementById('proof-line');
    var viewport = document.getElementById('rail-viewport');
    var track = document.getElementById('rail-track');
    var notches = Array.prototype.slice.call(document.querySelectorAll('.rp-notch'));
    if (!section || !viewport || !track) return;

    // Mobile / reduced-motion fallback: native horizontal snap-scroll
    if (!hasGsap || prefersReduced || window.innerWidth <= 900) {
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

    var getDistance = function () {
      var diff = track.scrollWidth - viewport.clientWidth;
      return Math.max(0, diff + 60);
    };

    gsap.to(track, {
      x: function () { return -getDistance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: function () { return '+=' + getDistance(); },
        pin: true,
        pinSpacing: true,
        scrub: 0.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var count = Math.min(notches.length, Math.floor(self.progress * notches.length) + 1);
          notches.forEach(function (n, i) { n.classList.toggle('is-on', i < count); });
        }
      }
    });
  }

  /* ------------------------------------------------------------------
     3. GLOBAL PROOF FIELD (Background Canvas)
     ------------------------------------------------------------------ */
  function initProofField() {
    if (prefersReduced) return;

    var canvas = document.getElementById('proof-field');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var W = 0, H = 0, dpr = 1;
    var cells = [];
    var GRID = 96;
    var scrollUnits = 0;
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
      draw();
    }

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
          if (r < 0.70) continue;
          var distFromCenter = Math.abs(x - midCol) / midCol;
          var order = (distFromCenter * 0.65) + (y / rows) * 0.35 + r * 0.18;
          cells.push({
            x: x * GRID,
            y: y * GRID,
            r: r,
            order: order,
            mirrorX: W - (x + 1) * GRID
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

      var progress = window.scrollY / maxScroll();
      var STEPS = 36;
      scrollUnits = Math.floor(progress * STEPS) / STEPS;

      var midX = Math.round(W / 2);

      // Central spine + horizontal scanlines
      ctx.lineWidth = 1;
      var spineH = Math.min(1, 0.15 + scrollUnits * 1.4) * H;
      ctx.strokeStyle = 'rgba(232, 228, 216, 0.07)';
      ctx.beginPath();
      ctx.moveTo(midX + 0.5, (H - spineH) / 2);
      ctx.lineTo(midX + 0.5, (H + spineH) / 2);
      ctx.stroke();

      var lineCount = 3 + Math.floor(scrollUnits * 8);
      for (var i = 0; i < lineCount; i++) {
        var ly = Math.round(((i + 1) / (lineCount + 1)) * H) + 0.5;
        var reach = (0.12 + hash(i, 7) * 0.5) * Math.min(1, 0.2 + scrollUnits * 1.6);
        var len = reach * W * 0.5;
        var lime = (i % 4 === 0);
        ctx.strokeStyle = lime ? 'rgba(212, 246, 56, 0.16)' : 'rgba(232, 228, 216, 0.05)';
        ctx.beginPath();
        ctx.moveTo(midX - len, ly);
        ctx.lineTo(midX + len, ly);
        ctx.stroke();

        if (scrollUnits > 0.12) {
          ctx.strokeStyle = lime ? 'rgba(212, 246, 56, 0.28)' : 'rgba(232, 228, 216, 0.09)';
          ctx.strokeRect(midX - len - 3, ly - 3, 6, 6);
          ctx.strokeRect(midX + len - 3, ly - 3, 6, 6);
        }
      }

      // Mirrored square cells
      var visibleCount = Math.floor(cells.length * Math.min(1, scrollUnits * 1.9));
      for (var c = 0; c < visibleCount; c++) {
        var cell = cells[c];
        var stage = Math.min(3, Math.floor((scrollUnits * 1.9 * cells.length - c) / 6) + 1);
        var s = stage * 5 * (cell.r > 0.85 ? 2 : 1);
        var alpha = cell.r > 0.9 ? 0.22 : 0.08;
        var isLime = cell.r > 0.93;

        ctx.strokeStyle = isLime
          ? 'rgba(212, 246, 56, ' + alpha + ')'
          : 'rgba(232, 228, 216, ' + alpha + ')';

        ctx.strokeRect(Math.round(cell.x) + 0.5, Math.round(cell.y) + 0.5, s, s);
        ctx.strokeRect(Math.round(cell.mirrorX) + 0.5, Math.round(cell.y) + 0.5, s, s);
      }
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        draw();
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    resize();
  }

  /* ------------------------------------------------------------------
     4. HERO BOOT SEQUENCE
     ------------------------------------------------------------------ */
  function bootHero() {
    if (!hasGsap || prefersReduced) return;
    if (!document.querySelector('.ht-inner')) return;

    var tl = gsap.timeline({ defaults: { ease: 'steps(8)' } });

    tl.from('.ht-inner', {
      yPercent: 110,
      duration: 0.7,
      stagger: 0.14
    });

    tl.from('.boot-line', {
      opacity: 0,
      duration: 0.001,
      stagger: 0.16,
      ease: 'steps(1)'
    }, '-=0.35');

    tl.from('.nav', {
      yPercent: -100,
      duration: 0.3,
      ease: 'steps(4)'
    }, 0);
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
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.classList.remove('is-visible');
      }, 1800);
    }

    document.querySelectorAll('.copy-trigger').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var text = btn.getAttribute('data-copy') || '';
        var tag = btn.querySelector('.chip-tag') || (btn.classList.contains('chip') ? btn : null);

        function confirm() {
          btn.classList.add('is-copied');
          if (tag && tag.classList.contains('chip-tag')) {
            var original = tag.textContent;
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
            fallbackCopy(text);
            confirm();
          });
        } else {
          fallbackCopy(text);
          confirm();
        }
      });
    });

    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        // noop
      }
      document.body.removeChild(ta);
    }
  }

  /* ------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------ */
  function init() {
    bootHero();
    initHeroFlow();
    initRail();
    initProofField();
    initCopy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
