/* ══════════════════════════════════════════════════════════════════════════════
   NPMateriProgress — progress tracking untuk materi non-Kaigo (Grammar, Kanji,
   Kosakata, dll). Auto-hook fungsi jawaban quiz → sumbang XP ke dashboard via NPXP.

   Bekerja tanpa mengubah kode quiz tiap halaman: membungkus fungsi jawaban (ans, dll)
   yang ada, lalu mendeteksi kuis selesai dari variabel global ok/tot & panjang array.

   Bergantung pada: np-xp.js (NPXP). Aman bila NPXP belum ada (progress lokal tetap jalan).
   ══════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var PAGE_KEY = 'np-materi-progress-v1';

  function pageId() {
    return (location.pathname.split('/').pop() || 'unknown').replace(/\.html$/, '');
  }

  function loadPages() {
    try {
      var raw = localStorage.getItem(PAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function savePages(p) {
    try { localStorage.setItem(PAGE_KEY, JSON.stringify(p)); } catch (e) {}
  }

  // Kategori materi dari nama file (untuk sumber XP)
  function category() {
    var id = pageId().toLowerCase();
    if (/kanji/.test(id)) return 'kanji';
    if (/kosakata|vocab|goi/.test(id)) return 'kosakata';
    if (/grammar|bunpou|partikel|verb|keigo/.test(id)) return 'grammar';
    if (/kana|hiragana|katakana/.test(id)) return 'kana';
    if (/jlpt|latihan/.test(id)) return 'jlpt';
    return 'materi';
  }

  var NPMateriProgress = {
    PAGE_KEY: PAGE_KEY,
    _recorded: {},

    recordQuiz: function (correct, total) {
      correct = +correct || 0; total = +total || 0;
      if (total <= 0) return;
      var id = pageId();
      var score = Math.round((correct / total) * 100);

      // Sumbang ke dashboard global via NPXP (jika tersedia)
      if (global.NPXP && typeof global.NPXP.recordQuiz === 'function') {
        global.NPXP.recordQuiz(category(), correct, total);
      }

      // Progress per halaman
      var pages = loadPages();
      var prev = pages[id] || { bestScore: 0, attempts: 0, completed: false };
      prev.bestScore = Math.max(prev.bestScore, score);
      prev.attempts += 1;
      prev.completed = prev.completed || score >= 70;
      prev.lastScore = score;
      pages[id] = prev;
      savePages(pages);
      if (prev.completed && global.NPXP && typeof global.NPXP.recordActivity === 'function') {
        global.NPXP.recordActivity({
          type: 'lesson_completed', category: category(), itemId: id,
          title: (document.title || id).split(/[—|]/)[0].trim(), value: 1,
          accuracy: score, url: location.pathname
        });
      }
      return { score: score };
    },

    getPageStatus: function () {
      return loadPages()[pageId()] || { bestScore: 0, attempts: 0, completed: false };
    },

    // Bungkus fungsi jawaban yang ada tanpa tahu namanya
    autoHook: function () {
      var self = this;
      var candidates = ['ans', 'ans2', 'ansT', 'ansx', 'ansX', 'answerQuiz', 'answer', 'cek', 'pilih'];
      candidates.forEach(function (name) {
        var fn = global[name];
        if (typeof fn !== 'function' || fn._npHooked) return;
        var wrapped = function () {
          var r = fn.apply(this, arguments);
          try { self._checkComplete(); } catch (e) {}
          return r;
        };
        wrapped._npHooked = true;
        try { global[name] = wrapped; } catch (e) {}
      });
    },

    _checkComplete: function () {
      var ok = typeof global.ok === 'number' ? global.ok : null;
      var tot = typeof global.tot === 'number' ? global.tot : null;
      if (ok === null || tot === null || tot === 0) return;

      var qlen = 0;
      var vars = ['Q', 'Q2', 'QT', 'Qx', 'QX', 'QUIZ', 'RQ'];
      for (var i = 0; i < vars.length; i++) {
        var v = global[vars[i]];
        if (Array.isArray(v) && v.length > qlen) qlen = v.length;
      }
      if (qlen === 0) return;

      var id = pageId();
      var tag = id + ':' + qlen + ':' + tot;
      if (tot >= qlen && !this._recorded[tag]) {
        this._recorded = {};
        this._recorded[tag] = true;
        this.recordQuiz(ok, tot);
        this.renderBadge();
      }
      if (tot < qlen) this._recorded = {};
    },

    renderBadge: function () {
      try {
        var st = this.getPageStatus();
        if (!st || st.attempts === 0) return;
        var anchor = document.getElementById('qs') || document.querySelector('[id*="skor"],[id*="score"]');
        if (!anchor || document.getElementById('np-materi-badge')) return;
        var done = st.completed || st.bestScore >= 70;
        var badge = document.createElement('div');
        badge.id = 'np-materi-badge';
        badge.style.cssText = 'text-align:center;margin:10px auto;padding:8px 14px;border-radius:20px;font-size:.8rem;font-weight:700;display:inline-block;' +
          (done ? 'background:#dcfce7;color:#166534;border:1px solid #86efac' : 'background:#fef9c3;color:#854d0e;border:1px solid #fde047');
        badge.textContent = done
          ? '\u2705 Selesai \u2014 nilai terbaik ' + st.bestScore + '%'
          : '\ud83d\udcd6 Nilai terbaik ' + st.bestScore + '% (target 70%)';
        var wrap = document.createElement('div');
        wrap.style.textAlign = 'center';
        wrap.appendChild(badge);
        anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
      } catch (e) {}
    }
  };

  global.NPMateriProgress = NPMateriProgress;

    if (typeof document !== 'undefined') {
    var init = function () {
      setTimeout(function () {
        NPMateriProgress.autoHook();
        NPMateriProgress.renderBadge();
        try {
          var openedKey = 'np-opened:' + pageId();
          if (!sessionStorage.getItem(openedKey) && global.NPXP && typeof global.NPXP.recordActivity === 'function') {
            sessionStorage.setItem(openedKey, '1');
            global.NPXP.recordActivity({
              type: 'lesson_opened', category: category(), itemId: pageId(),
              title: (document.title || pageId()).split(/[—|]/)[0].trim(), value: 1,
              url: location.pathname
            });
          }
        } catch (e) {}
      }, 300);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : this);
