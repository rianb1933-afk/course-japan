/* ══════════════════════════════════════════════════════════════════════════════
   KaigoProgress — mencatat penyelesaian materi Kaigo ke dashboard (np-dash-v3)
   Dipakai di semua halaman Materi/Kaigo*.html. Ringan, tanpa dependency.
   Konsisten dengan Store dashboard: { xp, streak, quiz, vocab, history, lastDate }
   ══════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var DASH_KEY = 'np-dash-v3';
  var PAGE_KEY = 'np-kaigo-progress-v1';

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function loadDash() {
    try {
      var raw = localStorage.getItem(DASH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function emptyDash() {
    return { xp: 0, streak: 0, maxStreak: 0, vocab: 0, quiz: 0, sessions: 0,
             weekXP: 0, monthXP: 0, badges: [], lastDate: null, history: {} };
  }

  function saveDash(d) {
    try { localStorage.setItem(DASH_KEY, JSON.stringify(d)); return true; }
    catch (e) { return false; }
  }

  function loadPageProgress() {
    try {
      var raw = localStorage.getItem(PAGE_KEY);
      var data = raw ? JSON.parse(raw) : {};
      return migrate(data);
    } catch (e) { return {}; }
  }

  /* Skema lama:  { bestScore, attempts, completed, lastScore, lastDate }
     Skema baru:  + progressPercent, lastOpenedAt, completedAt

     Migrasi in-place, non-destruktif: field lama DIPERTAHANKAN (dashboard dan
     halaman lain masih membacanya), field baru diturunkan dari yang sudah ada.
     Data pengguna lama tidak hilang dan tidak perlu direset. */
  function migrate(data) {
    if (!data || typeof data !== 'object') return {};

    Object.keys(data).forEach(function (id) {
      var r = data[id];
      if (!r || typeof r !== 'object') { delete data[id]; return; }

      if (typeof r.progressPercent !== 'number') {
        // Selesai = 100%. Belum selesai → pakai skor terbaik sebagai perkiraan.
        r.progressPercent = r.completed ? 100 : Math.max(0, Math.min(100, +r.bestScore || 0));
      }
      if (!r.lastOpenedAt && r.lastDate) {
        r.lastOpenedAt = r.lastDate;          // tanggal aktivitas terakhir yang diketahui
      }
      if (r.completed && !r.completedAt) {
        r.completedAt = r.lastDate || null;   // null bila memang tak terekam
      }
    });

    return data;
  }

  function savePageProgress(p) {
    try { localStorage.setItem(PAGE_KEY, JSON.stringify(p)); } catch (e) {}
  }

  function nowISO() {
    try { return new Date().toISOString(); } catch (e) { return null; }
  }

  // Update streak berdasarkan tanggal aktivitas terakhir
  function bumpStreak(dash) {
    var t = today();
    if (dash.lastDate === t) return; // sudah aktif hari ini
    if (dash.lastDate) {
      var last = new Date(dash.lastDate);
      var now = new Date(t);
      var diffDays = Math.round((now - last) / 86400000);
      if (diffDays === 1) dash.streak = (dash.streak || 0) + 1;
      else if (diffDays > 1) dash.streak = 1; // streak putus
    } else {
      dash.streak = 1;
    }
    dash.maxStreak = Math.max(dash.maxStreak || 0, dash.streak);
    dash.lastDate = t;
  }

  var KaigoProgress = {
    PAGE_KEY: PAGE_KEY,

    // ID halaman dari nama file
    pageId: function () {
      var p = (location.pathname.split('/').pop() || 'unknown').replace(/\.html$/, '');
      return p;
    },

    /* Seluruh progress Kaigo, sudah dimigrasikan ke skema baru.
       Dipakai Materi/Kaigo.html untuk menandai kartu & menghitung progress
       per kategori. Aman bila localStorage tidak tersedia → {} */
    getAll: function () {
      return loadPageProgress();
    },

    /* Progress satu modul. Selalu mengembalikan objek, tak pernah null. */
    get: function (slug) {
      var pages = loadPageProgress();
      return pages[slug] || {
        completed: false, progressPercent: 0,
        lastOpenedAt: null, completedAt: null,
        bestScore: 0, attempts: 0,
      };
    },

    /* Catat bahwa modul dibuka. Dipanggil otomatis di setiap halaman Kaigo-*
       (lihat auto-hook di bawah) supaya sorting "Terakhir dibuka" punya data.
       Tidak menyentuh status completed. */
    markOpened: function (slug) {
      var id = slug || this.pageId();
      var pages = loadPageProgress();
      var r = pages[id] || {
        completed: false, progressPercent: 0,
        lastOpenedAt: null, completedAt: null,
        bestScore: 0, attempts: 0,
      };
      r.lastOpenedAt = nowISO();
      pages[id] = r;
      savePageProgress(pages);
      return r;
    },

    /* Tandai modul selesai tanpa kuis (mis. materi bacaan).
       progressPercent 0–100; ≥100 dianggap selesai. */
    setProgress: function (slug, percent) {
      var id = slug || this.pageId();
      var pct = Math.max(0, Math.min(100, +percent || 0));
      var pages = loadPageProgress();
      var r = pages[id] || {
        completed: false, progressPercent: 0,
        lastOpenedAt: null, completedAt: null,
        bestScore: 0, attempts: 0,
      };
      var wasCompleted = r.completed;
      r.progressPercent = Math.max(r.progressPercent || 0, pct);
      r.lastOpenedAt = nowISO();
      if (pct >= 100) {
        r.completed = true;
        if (!wasCompleted) r.completedAt = nowISO();
      }
      pages[id] = r;
      savePageProgress(pages);
      return r;
    },

    // Panggil saat siswa menyelesaikan satu kuis
    // correct = jumlah benar, total = jumlah soal
    recordQuiz: function (correct, total) {
      correct = +correct || 0;
      total = +total || 0;
      var id = this.pageId();

      // XP: 10 per jawaban benar + bonus 20 jika semua benar
      var xpGain = correct * 10 + (total > 0 && correct === total ? 20 : 0);

      var dash = loadDash() || emptyDash();
      dash.xp = (dash.xp || 0) + xpGain;
      dash.weekXP = (dash.weekXP || 0) + xpGain;
      dash.monthXP = (dash.monthXP || 0) + xpGain;
      dash.quiz = (dash.quiz || 0) + total;
      bumpStreak(dash);

      // history harian
      var t = today();
      dash.history = dash.history || {};
      if (!dash.history[t]) dash.history[t] = { xp: 0, quiz: 0, minutes: 0 };
      dash.history[t].xp += xpGain;
      dash.history[t].quiz += total;
      saveDash(dash);

      // progress per halaman
      var pages = loadPageProgress();
      var prev = pages[id] || { bestScore: 0, attempts: 0, completed: false, progressPercent: 0 };
      var score = total > 0 ? Math.round((correct / total) * 100) : 0;
      var wasCompleted = prev.completed;

      prev.bestScore = Math.max(prev.bestScore, score);
      prev.attempts += 1;
      prev.completed = prev.completed || score >= 70;
      prev.lastScore = score;
      prev.lastDate = t;

      // Field skema baru
      prev.progressPercent = prev.completed
        ? 100
        : Math.max(prev.progressPercent || 0, score);
      prev.lastOpenedAt = nowISO();
      if (prev.completed && !wasCompleted) {
        prev.completedAt = nowISO();   // hanya saat PERTAMA kali selesai
      }

      pages[id] = prev;
      savePageProgress(pages);

      // Catat kelemahan ke AdaptiveLearning jika tersedia (cross-tab via localStorage)
      if (total > 0 && correct / total < 0.6) {
        this._recordWeakness(id);
      }

      return { xpGain: xpGain, score: score, streak: dash.streak };
    },

    // Catat vocab yang dipelajari
    recordVocab: function (count) {
      count = +count || 0;
      if (count <= 0) return;
      var dash = loadDash() || emptyDash();
      dash.vocab = (dash.vocab || 0) + count;
      bumpStreak(dash);
      saveDash(dash);
    },

    _recordWeakness: function (pageId) {
      try {
        var KEY = 'np-adaptive-v1';
        var raw = localStorage.getItem(KEY);
        var w = raw ? JSON.parse(raw) : {};
        // petakan halaman ke topik kasar
        var topic = 'kaigo';
        if (/speaking|kaiwa/i.test(pageId)) topic = 'speaking';
        else if (/kanji|kosakata/i.test(pageId)) topic = 'kanji';
        else if (/n5|n4|n3|n2|nihongo|bahasa/i.test(pageId)) topic = 'grammar';
        var key = topic + '::' + pageId;
        w[key] = (w[key] || 0) + 1;
        localStorage.setItem(KEY, JSON.stringify(w));
      } catch (e) {}
    },

    // Ambil ringkasan progress halaman ini
    getPageStatus: function () {
      var pages = loadPageProgress();
      return pages[this.pageId()] || { bestScore: 0, attempts: 0, completed: false };
    },

    // Auto-hook: bungkus fungsi ans*/quiz agar progress tercatat saat kuis selesai,
    // tanpa perlu tahu nama fungsi (ans, ansZ, ansQ, dll).
    // Bekerja dengan membaca variabel global ok/tot dan panjang array quiz.
    _recorded: {},
    autoHook: function () {
      var self = this;
      // Nama fungsi jawaban yang umum dipakai di halaman Kaigo
      var candidates = ['ans', 'ansZ', 'ansQ', 'ansT', 'ansKZ', 'answer', 'cek', 'check'];
      candidates.forEach(function (name) {
        var fn = global[name];
        if (typeof fn !== 'function' || fn._kpHooked) return;
        var wrapped = function () {
          var r = fn.apply(this, arguments);
          try { self._checkComplete(); } catch (e) {}
          return r;
        };
        wrapped._kpHooked = true;
        try { global[name] = wrapped; } catch (e) {}
      });
    },

    // Deteksi kuis selesai: tot mencapai jumlah soal → catat sekali per ronde
    _checkComplete: function () {
      var ok = typeof global.ok === 'number' ? global.ok : null;
      var tot = typeof global.tot === 'number' ? global.tot : null;
      if (ok === null || tot === null || tot === 0) return;

      // Cari panjang array quiz dari nama var yang umum
      var qlen = 0;
      var vars = ['Q', 'QKZ', 'QUIZ', 'QZ', 'QX', 'QQ', 'KN2'];
      for (var i = 0; i < vars.length; i++) {
        var v = global[vars[i]];
        if (Array.isArray(v) && v.length > qlen) qlen = v.length;
      }
      if (qlen === 0) return;

      // Semua soal terjawab → catat sekali per "ronde" (reset saat tot balik ke 0)
      var id = this.pageId();
      if (tot >= qlen && !this._recorded[id + ':' + qlen + ':' + tot]) {
        this._recorded = {}; // reset penanda ronde sebelumnya
        this._recorded[id + ':' + qlen + ':' + tot] = true;
        this.recordQuiz(ok, tot);
      }
      // reset penanda saat kuis di-restart (tot kembali kecil)
      if (tot < qlen) {
        this._recorded = {};
      }
    }
  };

  global.KaigoProgress = KaigoProgress;

  // Tampilkan badge status progress halaman (di dekat elemen skor #qs jika ada)
  KaigoProgress.renderBadge = function () {
    try {
      var st = this.getPageStatus();
      if (!st || st.attempts === 0) return;
      var anchor = document.getElementById('qs');
      if (!anchor || document.getElementById('kp-badge')) return;
      var badge = document.createElement('div');
      badge.id = 'kp-badge';
      var done = st.completed || st.bestScore >= 70;
      badge.style.cssText = 'text-align:center;margin:10px auto;padding:8px 14px;border-radius:20px;font-size:.8rem;font-weight:700;display:inline-block;' +
        (done ? 'background:#dcfce7;color:#166534;border:1px solid #86efac' : 'background:#fef9c3;color:#854d0e;border:1px solid #fde047');
      badge.textContent = done
        ? '\u2705 Materi selesai \u2014 nilai terbaik ' + st.bestScore + '%'
        : '\ud83d\udcd6 Sedang dipelajari \u2014 nilai terbaik ' + st.bestScore + '% (target 70%)';
      var wrap = document.createElement('div');
      wrap.style.textAlign = 'center';
      wrap.appendChild(badge);
      anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    } catch (e) {}
  };

  // Auto-hook setelah DOM siap (fungsi ans biasanya sudah terdefinisi di script inline)
  if (typeof document !== 'undefined') {
    var _kpInit = function () {
      // Catat "terakhir dibuka" untuk sorting di pusat materi Kaigo.
      // Hanya di halaman MODUL (Kaigo-*), bukan di hub (Kaigo.html) — kalau hub
      // ikut tercatat, ia akan muncul sebagai modul dalam data progress.
      try {
        var id = KaigoProgress.pageId();
        if (/^Kaigo-/.test(id)) KaigoProgress.markOpened(id);
      } catch (e) {}

      setTimeout(function () {
        KaigoProgress.autoHook();
        KaigoProgress.renderBadge();
      }, 300);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _kpInit);
    } else {
      _kpInit();
    }
  }
})(typeof window !== 'undefined' ? window : this);
