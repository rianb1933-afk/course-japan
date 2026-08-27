/**
 * home-animations.js — Nihongo Pro Academy
 * Animasi moderen untuk halaman utama (index.html)
 *
 * Fitur:
 *   1. Counter animation — angka statistik berputar saat muncul
 *   2. Hero parallax — efek kedalaman halus pada hero section
 *   3. Typing effect — teks subtitle muncul character-by-character
 *   4. Floating particles — partikel melayang di background hero
 *   5. Card 3D tilt — kartu fitur bergerak mengikuti mouse
 *   6. Section reveal — section muncul dengan scale+fade saat discroll
 *   7. Gradient shift — gradient hero bergerak perlahan
 *
 * WAJIB: menghormati prefers-reduced-motion — jika aktif,
 * semua animasi dinonaktifkan (CSS class 'reduced-motion' ditambahkan).
 *
 * Berat: ~4KB uncompressed, 0 dependency.
 */
(function () {
  'use strict';

  // ── Reduced motion check ──
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  if (reduce) {
    document.documentElement.classList.add('reduced-motion');
    return;
  }

  // ── Inject CSS ──
  var css = '\n'
    + '/* ── HOME ANIMATIONS CSS ── */\n'
    // Counter
    + '.ha-counter{transition:color .3s ease}\n'
    // Parallax
    + '.hero{overflow:hidden}\n'
    + '.hero .hero-left,.hero .hero-right{will-change:transform}\n'
    // Typing
    + '.ha-typing::after{content:"|";animation:ha-blink .8s step-end infinite;color:var(--red);font-weight:300}\n'
    + '@keyframes ha-blink{50%{opacity:0}}\n'
    // Particles
    + '.ha-particles{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}\n'
    + '.ha-particle{position:absolute;border-radius:50%;opacity:0;animation:ha-float linear infinite}\n'
    + '@keyframes ha-float{\n'
    + '  0%{transform:translateY(0) translateX(0) scale(0);opacity:0}\n'
    + '  10%{opacity:1;transform:scale(1)}\n'
    + '  90%{opacity:1}\n'
    + '  100%{transform:translateY(-100vh) translateX(var(--drift)) scale(0);opacity:0}\n'
    + '}\n'
    // Card tilt
    + '.ha-tilt{transition:transform .15s ease-out,box-shadow .15s ease-out}\n'
    + '.ha-tilt:hover{box-shadow:0 20px 40px rgba(0,0,0,.12)}\n'
    // Section reveal
    + '.ha-reveal{opacity:0;transform:translateY(30px) scale(.97);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}\n'
    + '.ha-reveal.ha-visible{opacity:1;transform:none}\n'
    // Gradient shift
    + '.hero::before{animation:ha-gradient-shift 8s ease-in-out infinite alternate}\n'
    + '@keyframes ha-gradient-shift{\n'
    + '  0%{background-position:0% 50%}\n'
    + '  100%{background-position:100% 50%}\n'
    + '}\n'
    // Reduced motion override
    + '.reduced-motion .ha-typing::after,.reduced-motion .ha-particle,\n'
    + '.reduced-motion .ha-reveal{animation:none!important;transition:none!important;opacity:1!important;transform:none!important}\n';

  var style = document.createElement('style');
  style.setAttribute('data-home-animations', '');
  style.textContent = css;
  document.head.appendChild(style);

  // ── Helpers ──
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  // ── 1. Counter Animation ──
  function animateCounters() {
    var counters = document.querySelectorAll('.stat-num, [data-count]');
    if (!counters.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);

        var text = el.textContent.trim();
        var match = text.match(/^([\d.,]+)(.*)/);
        if (!match) return;

        var rawNum = match[1].replace(/[.,]/g, '');
        var suffix = match[2];
        var target = parseInt(rawNum, 10);
        if (isNaN(target) || target === 0) return;

        var duration = 1200;
        var start = performance.now();

        function tick(now) {
          var elapsed = now - start;
          var progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          var eased = 1 - Math.pow(1 - progress, 3);
          var current = Math.round(lerp(0, target, eased));

          // Format with original separators
          var formatted = current.toLocaleString('id-ID');
          el.textContent = formatted + suffix;

          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        }

        el.textContent = '0' + suffix;
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.3 });

    counters.forEach(function (el) { io.observe(el); });
  }

  // ── 2. Hero Parallax ──
  function initParallax() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    var left = hero.querySelector('.hero-left');
    var right = hero.querySelector('.hero-right');
    var badge = hero.querySelector('.hero-badge');
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var scrollY = window.scrollY;
        var heroH = hero.offsetHeight;
        if (scrollY > heroH) { ticking = false; return; }

        var factor = scrollY / heroH;

        if (left) left.style.transform = 'translateY(' + (factor * 18) + 'px)';
        if (right) right.style.transform = 'translateY(' + (factor * -12) + 'px) scale(' + (1 - factor * 0.015) + ')';
        if (badge) badge.style.opacity = 1 - factor * 1.5;

        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── 3. Typing Effect ──
  function initTyping() {
    var target = document.querySelector('.hero-desc') || document.querySelector('.sub-jp');
    if (!target) return;

    var original = target.textContent;
    target.textContent = '';
    target.classList.add('ha-typing');

    var i = 0;
    var speed = 28;

    function type() {
      if (i < original.length) {
        target.textContent += original.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        // Remove cursor after typing finishes
        setTimeout(function () {
          target.classList.remove('ha-typing');
        }, 1500);
      }
    }

    // Start when hero is visible
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        io.disconnect();
        setTimeout(type, 400);
      }
    }, { threshold: 0.3 });

    io.observe(target);
  }

  // ── 4. Floating Particles ──
  function initParticles() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    var container = document.createElement('div');
    container.className = 'ha-particles';
    hero.prepend(container);

    var colors = ['rgba(190,52,40,.3)', 'rgba(47,111,237,.25)', 'rgba(185,137,47,.2)', 'rgba(255,255,255,.15)'];
    var count = 18;

    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'ha-particle';
      var size = 3 + Math.random() * 6;
      var left = Math.random() * 100;
      var duration = 8 + Math.random() * 12;
      var delay = Math.random() * 10;
      var drift = (Math.random() - 0.5) * 80;

      p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;'
        + 'left:' + left + '%;bottom:-10px;'
        + 'background:' + colors[i % colors.length] + ';'
        + '--drift:' + drift + 'px;'
        + 'animation-duration:' + duration + 's;'
        + 'animation-delay:' + delay + 's;';

      container.appendChild(p);
    }
  }

  // ── 5. Card 3D Tilt ──
  function initCardTilt() {
    var cards = document.querySelectorAll('.feat-card, .level-card, .stat-pill');
    if (!cards.length) return;

    cards.forEach(function (card) {
      card.classList.add('ha-tilt');

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var cx = rect.width / 2;
        var cy = rect.height / 2;
        var rotateX = ((y - cy) / cy) * -6;
        var rotateY = ((x - cx) / cx) * 6;

        card.style.transform = 'perspective(600px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  // ── 6. Section Reveal ──
  function initSectionReveal() {
    var sections = document.querySelectorAll(
      '.features-bg, .chart-section, .instructor-section, .cta-section, '
      + '.daily-mission-section, .progress-section, .quiz-section, '
      + '.study-tools-section, .lms-section, .faq-section, .testi-section'
    );

    if (!sections.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ha-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

    sections.forEach(function (s) {
      s.classList.add('ha-reveal');
      io.observe(s);
    });
  }

  // ── 7. Gradient Shift ──
  // Already handled by CSS animation on .hero::before

  // ── Initialize ──
  ready(function () {
    // Small delay to let other scripts settle
    setTimeout(function () {
      animateCounters();
      initParallax();
      initTyping();
      initParticles();
      initCardTilt();
      initSectionReveal();
    }, 100);
  });

})();
