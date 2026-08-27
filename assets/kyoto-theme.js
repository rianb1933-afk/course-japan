/**
 * 京都 KYOTO THEME SCRIPT
 * Handles dark/light mode toggle, Kyoto UI enhancements
 * for NihonggoPro platform.
 */
(function () {
  'use strict';

  /* ── THEME INIT ──
     Jika window.NPDark sudah ada (dark-mode-toggle.js dimuat lebih dulu
     di halaman ini), sistem itu adalah sumber kebenaran tunggal —
     script ini TIDAK BOLEH menimpa data-theme dengan key localStorage
     berbeda ('kyoto-theme' vs 'np-dark'). Toggle di halaman ini akan
     didelegasikan ke window.NPDark.toggle() supaya kedua sistem selalu
     sinkron, bukan saling menimpa. Di halaman TANPA dark-mode-toggle.js,
     perilaku lama (localStorage 'kyoto-theme') dipertahankan utuh. */
  const HAS_NPDARK = typeof window.NPDark === 'object' && window.NPDark !== null;
  const THEME_KEY = 'kyoto-theme';
  if (!HAS_NPDARK) {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : '');
  }

  /* ── THEME TOGGLE ── */
  function toggleTheme() {
    if (HAS_NPDARK) {
      window.NPDark.toggle();
      updateToggleIcons();
      return;
    }
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? '' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next === 'dark' ? 'dark' : 'light');
    updateToggleIcons();
  }

  function updateToggleIcons() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll(
      '[data-theme-toggle], .theme-toggle, .icon-btn[aria-label*="tema"], .icon-btn[aria-label*="mode"]'
    ).forEach(btn => {
      btn.textContent = isDark ? '☀️' : '🌙';
      btn.title = isDark ? 'Mode Terang' : 'Mode Gelap';
    });
  }

  /* ── BIND TOGGLE BUTTONS ── */
  document.addEventListener('DOMContentLoaded', () => {
    updateToggleIcons();

    document.querySelectorAll(
      '[data-theme-toggle], .theme-toggle, .icon-btn[aria-label*="tema"], .icon-btn[aria-label*="mode"]'
    ).forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });

    /* ── ADD KANJI WATERMARKS TO STAT CARDS ── */
    const kanjiMap = {
      'xp': '験', 'Total XP': '験', 'Streak': '炎', 'Kanji': '漢',
      'Grammar': '文', 'Kaigo': '介', 'Quiz': '問', 'Vocab': '語',
    };
    document.querySelectorAll('.stat-card, .stat-kyoto').forEach(card => {
      if (!card.hasAttribute('data-kanji')) {
        const label = card.querySelector('.stat-lbl');
        if (label) {
          const txt = label.textContent.trim();
          const kanji = Object.entries(kanjiMap).find(([k]) => txt.includes(k));
          if (kanji) card.setAttribute('data-kanji', kanji[1]);
        }
      }
    });

    /* ── RIPPLE EFFECT ON BUTTONS ── */
    document.querySelectorAll('.btn, .btn-primary, .btn-accent, .btn-gold, .btn-matcha').forEach(btn => {
      btn.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        ripple.className = 'kyoto-ripple';
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        ripple.style.cssText = `
          position:absolute; border-radius:50%; pointer-events:none;
          background:rgba(255,255,255,0.28); width:${size}px; height:${size}px;
          top:${e.clientY-rect.top-size/2}px; left:${e.clientX-rect.left-size/2}px;
          transform:scale(0); animation:kyoto-ripple-anim .55s ease-out forwards;
        `;
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    /* ── SMOOTH SCROLL TO TOP ── */
    const btt = document.getElementById('backToTop') || document.getElementById('btt');
    if (btt) {
      window.addEventListener('scroll', () => {
        btt.classList.toggle('visible', window.scrollY > 300);
        btt.style.opacity = window.scrollY > 300 ? '1' : '0';
      });
      btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    /* ── ANIMATE STAT VALUES ON SCROLL (safe, dengan viewport check) ── */
    if ('IntersectionObserver' in window) {
      const kyObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.transform = 'translateY(0)';
            entry.target.style.opacity = '1';
            kyObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px 40px 0px' });

      document.querySelectorAll('.stat-card, .card-hover').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          // Sudah di viewport → langsung tampil
          el.style.transform = 'translateY(0)';
          el.style.opacity = '1';
        } else {
          el.style.transform = 'translateY(8px)';
          el.style.opacity = '0';
          el.style.transition = 'transform 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.45s ease';
          kyObs.observe(el);
        }
      });
    }
  });

  /* ── INJECT RIPPLE KEYFRAMES ── */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes kyoto-ripple-anim {
      to { transform: scale(1); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

})();
