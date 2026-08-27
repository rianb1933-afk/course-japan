/* ══════════════════════════════════════════════════════════════════════════════
   NPXP — Modul XP terpusat untuk seluruh platform NihongoPro
   Satu sumber kebenaran: semua fitur (SRS, Kanji, Speaking, Quiz, JLPT, Materi)
   menyumbang XP + streak ke dashboard global (np-dash-v3) lewat modul ini.

   Pemakaian sederhana:
     NPXP.award('srs', 15);              // beri 15 XP dari sumber 'srs'
     NPXP.recordQuiz('kanji', 8, 10);    // 8 benar dari 10 → XP + akurasi
     NPXP.recordVocab('srs', 20);        // 20 kartu dipelajari

   Aman dipanggil dari mana saja; tidak melempar error bila localStorage penuh.
   ══════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var DASH_KEY = 'np-dash-v3';
  var SRC_KEY = 'np-xp-sources-v1'; // rekap XP per sumber (untuk analytics)
  var ACTIVITY_KEY = 'nihongopro.activityLog';
  var MAX_ACTIVITIES = 500;

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function emptyDash() {
    return {
      xp: 0, streak: 0, maxStreak: 0, vocab: 0, quiz: 0, sessions: 0,
      weekXP: 0, monthXP: 0, badges: [], lastDate: null,
      history: {}, missions: { vocab: 0, quiz: 0, minutes: 0 },
      todayDone: {}, weeklyProgress: { streak: 0, weekXP: 0, kaigo: 0 },
      quizAccuracy: 0, missionDate: today()
    };
  }

  function loadDash() {
    try {
      var raw = localStorage.getItem(DASH_KEY);
      var d = raw ? JSON.parse(raw) : emptyDash();
      // Reset misi harian jika hari sudah berganti
      var t = today();
      if (d.missionDate !== t) {
        d.missions = { vocab: 0, quiz: 0, minutes: 0 };
        d.missionDate = t;
      }
      // _rev genuinely dipakai saveDash() untuk mendeteksi apakah data ini
      // sudah ditulis ulang oleh tab lain sejak dibaca (race-condition
      // antar-tab -- dikonfirmasi via simulasi eksplisit bahwa tanpa ini,
      // dua tab yang menulis near-simultan bisa membuat salah satu update
      // GENUINELY HILANG tanpa error apapun yang terlihat pengguna).
      d._rev = raw ? (JSON.parse(raw)._rev || 0) : 0;
      return d;
    } catch (e) { return emptyDash(); }
  }

  function saveDash(d) {
    try {
      // Optimistic lock: sebelum menulis, cek apakah _rev di localStorage
      // GENUINELY masih sama dengan _rev yang dibaca saat loadDash() terakhir
      // dipanggil. Jika sudah berbeda, berarti tab lain sudah menulis di
      // antara waktu baca dan tulis tab ini -- data 'd' di sini dihitung dari
      // state yang SUDAH USANG (stale), menulisnya akan menimpa/menghilangkan
      // update dari tab lain. Fungsi mengembalikan false (conflict) supaya
      // PEMANGGIL (award/recordQuiz/dst) bisa retry: loadDash() ulang lalu
      // terapkan kembali operasi yang sama dari awal -- bukan mencoba
      // menggabung objek secara buta di sini (yang genuinely tidak tahu
      // delta asli mutasi milik pemanggil).
      var currentRaw = localStorage.getItem(DASH_KEY);
      var currentRev = currentRaw ? (JSON.parse(currentRaw)._rev || 0) : 0;
      var incomingRev = d._rev || 0;
      if (currentRaw && currentRev > incomingRev) {
        return false; // conflict terdeteksi -- pemanggil harus retry
      }
      d._rev = incomingRev + 1;
      localStorage.setItem(DASH_KEY, JSON.stringify(d));
      return true;
    }
    catch (e) { return false; }
  }

  // Retry-loop optimistic-lock: menerima fungsi mutator(dash) yang GENUINELY
  // idempoten (aman dipanggil ulang dari state terbaru) -- dipakai seluruh
  // fungsi publik (award, recordQuiz, dst) supaya logic retry konsisten di
  // satu tempat, bukan diduplikasi 4x. Maksimal 3 percobaan sebelum
  // menyerah (mencegah infinite loop jika genuinely ada bug lain).
  function saveDashWithRetry(mutator) {
    for (var attempt = 0; attempt < 3; attempt++) {
      var dash = loadDash();
      mutator(dash);
      if (saveDash(dash)) return dash;
    }
    // Percobaan terakhir: paksa tulis meski masih conflict (lebih baik
    // genuinely menyimpan sesuatu daripada kehilangan progress sepenuhnya
    // setelah 3x retry gagal -- skenario ini genuinely sangat jarang).
    var finalDash = loadDash();
    mutator(finalDash);
    localStorage.setItem(DASH_KEY, JSON.stringify(finalDash));
    return finalDash;
  }

  // Streak harian: naik jika hari berbeda & berurutan; reset jika bolong
  function bumpStreak(dash) {
    var t = today();
    if (dash.lastDate === t) return;
    if (dash.lastDate) {
      var diff = Math.round((new Date(t) - new Date(dash.lastDate)) / 86400000);
      if (diff === 1) dash.streak = (dash.streak || 0) + 1;
      else if (diff > 1) dash.streak = 1;
    } else {
      dash.streak = 1;
    }
    dash.maxStreak = Math.max(dash.maxStreak || 0, dash.streak);
    dash.lastDate = t;
  }

  function ensureHistory(dash) {
    var t = today();
    dash.history = dash.history || {};
    if (!dash.history[t]) dash.history[t] = { xp: 0, quiz: 0, minutes: 0 };
    return dash.history[t];
  }

  // Rekap XP per sumber (untuk Analytics: "dari mana XP-mu berasal")
  function recordSource(source, xp) {
    try {
      var raw = localStorage.getItem(SRC_KEY);
      var s = raw ? JSON.parse(raw) : {};
      s[source] = (s[source] || 0) + xp;
      localStorage.setItem(SRC_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  // Log ringan untuk dashboard v86. Hanya metadata belajar; tidak menyimpan
  // jawaban, isi percakapan, email, atau data sensitif pengguna.
  function appendActivity(activity) {
    try {
      var raw = localStorage.getItem(ACTIVITY_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      var now = new Date();
      var item = {
        id: activity.id || ('act-' + now.getTime() + '-' + Math.random().toString(36).slice(2, 8)),
        type: String(activity.type || 'study_activity'),
        category: String(activity.category || activity.source || 'materi'),
        level: activity.level ? String(activity.level) : null,
        itemId: activity.itemId ? String(activity.itemId) : null,
        title: String(activity.title || 'Aktivitas belajar'),
        value: Math.max(0, Number(activity.value) || 0),
        xp: Math.max(0, Number(activity.xp) || 0),
        durationSeconds: Math.max(0, Number(activity.durationSeconds) || 0),
        accuracy: Number.isFinite(Number(activity.accuracy)) ? Math.max(0, Math.min(100, Number(activity.accuracy))) : null,
        createdAt: activity.createdAt || now.toISOString(),
        url: activity.url ? String(activity.url) : null
      };
      list.push(item);
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(-MAX_ACTIVITIES)));
      try { global.dispatchEvent(new CustomEvent('nihongopro:activity', { detail: item })); } catch (e) {}
      return item;
    } catch (e) { return null; }
  }

  var NPXP = {
    DASH_KEY: DASH_KEY,

    // Inti: beri XP dari sumber tertentu. Update streak + history + rekap sumber.
    award: function (source, xp, opts) {
      xp = Math.round(+xp || 0);
      if (xp <= 0) return null;
      opts = opts || {};
      var dash = saveDashWithRetry(function (dash) {
        dash.xp = (dash.xp || 0) + xp;
        dash.weekXP = (dash.weekXP || 0) + xp;
        dash.monthXP = (dash.monthXP || 0) + xp;
        bumpStreak(dash);
        var h = ensureHistory(dash);
        h.xp += xp;
        if (opts.minutes) { h.minutes += opts.minutes; dash.missions.minutes = (dash.missions.minutes || 0) + opts.minutes; }
      });
      recordSource(source || 'lain', xp);
      appendActivity({
        type: 'xp_earned', category: source || 'lain', title: opts.title || ('Aktivitas ' + (source || 'belajar')),
        value: 1, xp: xp, durationSeconds: Math.max(0, Number(opts.minutes) || 0) * 60,
        level: opts.level, itemId: opts.itemId, url: opts.url
      });
      return { xp: dash.xp, gained: xp, streak: dash.streak };
    },

    // Quiz: catat benar/total → XP (10/benar + bonus 20 bila sempurna) + akurasi + misi
    recordQuiz: function (source, correct, total) {
      correct = +correct || 0;
      total = +total || 0;
      if (total <= 0) return null;
      var xpGain = correct * 10 + (correct === total ? 20 : 0);
      var thisAcc = Math.round((correct / total) * 100);
      var dash = saveDashWithRetry(function (dash) {
        dash.xp = (dash.xp || 0) + xpGain;
        dash.weekXP = (dash.weekXP || 0) + xpGain;
        dash.monthXP = (dash.monthXP || 0) + xpGain;
        dash.quiz = (dash.quiz || 0) + total;
        dash.missions = dash.missions || {};
        dash.missions.quiz = (dash.missions.quiz || 0) + total;
        // akurasi rata-rata berjalan
        var prevAcc = dash.quizAccuracy || 0;
        dash.quizAccuracy = prevAcc ? Math.round((prevAcc + thisAcc) / 2) : thisAcc;
        bumpStreak(dash);
        var h = ensureHistory(dash);
        h.xp += xpGain; h.quiz += total;
      });
      recordSource(source || 'quiz', xpGain);
      appendActivity({
        type: 'quiz_completed', category: source || 'quiz', title: 'Kuis ' + (source || 'materi'),
        value: total, xp: xpGain, accuracy: thisAcc
      });
      return { gained: xpGain, accuracy: thisAcc, streak: dash.streak };
    },

    // Vocab/kartu dipelajari
    recordVocab: function (source, count) {
      count = +count || 0;
      if (count <= 0) return null;
      var xpGain = count * 2; // 2 XP per kata
      var dash = saveDashWithRetry(function (dash) {
        dash.vocab = (dash.vocab || 0) + count;
        dash.xp = (dash.xp || 0) + xpGain;
        dash.weekXP = (dash.weekXP || 0) + xpGain;
        dash.monthXP = (dash.monthXP || 0) + xpGain;
        dash.missions = dash.missions || {};
        dash.missions.vocab = (dash.missions.vocab || 0) + count;
        bumpStreak(dash);
        ensureHistory(dash).xp += xpGain;
      });
      recordSource(source || 'vocab', xpGain);
      appendActivity({
        type: source === 'srs' ? 'srs_review' : 'vocabulary_learned',
        category: source === 'srs' ? 'srs' : 'vocabulary',
        title: source === 'srs' ? 'Review SRS' : 'Latihan vocabulary', value: count, xp: xpGain
      });
      return { gained: xpGain, vocab: dash.vocab };
    },

    // Sesi belajar selesai (mis. Speaking, AI Tutor) — catat menit + XP
    recordSession: function (source, minutes, xp) {
      var dash = saveDashWithRetry(function (dash) {
        dash.sessions = (dash.sessions || 0) + 1;
      });
      if (xp) this.award(source, xp, { minutes: minutes || 0 });
      else if (minutes) this.award(source, minutes, { minutes: minutes });
      appendActivity({
        type: 'practice_completed', category: source || 'materi', title: 'Sesi ' + (source || 'belajar'),
        value: 1, durationSeconds: Math.max(0, Number(minutes) || 0) * 60
      });
      return { sessions: dash.sessions };
    },

    // Ambil ringkasan cepat (untuk badge/tampilan)
    summary: function () {
      var d = loadDash();
      return { xp: d.xp || 0, streak: d.streak || 0, quiz: d.quiz || 0, vocab: d.vocab || 0 };
    },

    // Rekap XP per sumber
    sources: function () {
      try {
        var raw = localStorage.getItem(SRC_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) { return {}; }
    },

    // API untuk fitur yang perlu mencatat aktivitas tanpa memberi XP ganda.
    recordActivity: function (activity) { return appendActivity(activity || {}); }
  };

  global.NPXP = NPXP;
})(typeof window !== 'undefined' ? window : this);
