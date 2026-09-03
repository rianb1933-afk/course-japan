/**
 * FSRS-5 Engine — Nihongo Pro Academy
 * ===================================
 * Algoritma spaced repetition FSRS-5 (Free Spaced Repetition Scheduler),
 * standar modern yang dipakai Anki, berbasis model memori DSR: setiap kartu
 * punya STABILITY (S — waktu sampai R turun ke 90%) dan DIFFICULTY (D),
 * yang diperbarui setelah setiap ulasan.
 *
 * Rating UI (0-3) dipetakan ke grade FSRS (1-4): 0=Again→1, 1=Hard→2,
 * 2=Good→3, 3=Easy→4.
 *
 * Formula & bobot default (19 parameter) mengikuti referensi resmi FSRS-5:
 *   https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
 *
 * Modul ini TANPA efek samping: hanya mendaftarkan window.NPFSRS. Halaman
 * pemakai (SRS-Flashcard.html, SRS-Statistics.html) yang memegang kendali
 * atas penyimpanan `np-srs-v2`.
 *
 * Pemakaian ringkas:
 *   const c  = NPFSRS.rate(cardLama, rating, now);  // migrasi + ulasan
 *   const r  = NPFSRS.currentRetention(c, now);     // prediksi ingat hari ini
 */
(function () {
  'use strict';

  /* ── Bobot default FSRS-5 (19) ── */
  var W = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
    1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315,
    2.9898, 0.51655, 0.6621
  ];

  /* Peluruhan kurva lupa (FSRS-4.5/5): R(t) = (1 + F*t/S)^C */
  var DECAY = -0.5;
  var FACTOR = 19 / 81; // 19/81 dipakai FSRS-4.5/5 (bukan turunan 0.9)

  var MIN_S = 0.01;      // stabilitas minimal (hari)
  var MAX_S = 36500;     // plafon 100 tahun
  var GRADUATING_REPS = 2; // 2 sukses berturut → lepas tahap belajar
  var SECS_PER_DAY = 86400;

  /* Tahap belajar (menit): 1 mnt utk Again, 1/10 mnt utk Hard/Good */
  var STEPS_AGAIN = [1];
  var STEPS_NEW = [1, 10];

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function ratingToGrade(r) { return (r === 0 || r === 1 || r === 2 || r === 3) ? r + 1 : 3; }
  function gradeToRating(g) { return (g === 1 || g === 2 || g === 3 || g === 4) ? g - 1 : 2; }

  /** Probabilitas mengingat setelah `t` hari sejak ulasan terakhir. */
  function retention(stability, tDays) {
    if (!(stability > 0)) return 0;
    return Math.pow(1 + FACTOR * Math.max(0, tDays) / stability, DECAY);
  }

  /** Interval (hari) agar retensi tinggal `requestedRetention`. */
  function nextIntervalDays(stability, requestedRetention) {
    if (!(stability > 0)) return 0;
    var r = clamp(requestedRetention || 0.9, 0.7, 0.97);
    return (stability / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
  }

  /** R saat ini utk kartu yang sudah lulus (due = ts jadwal berikutnya, ms). */
  function currentRetention(card, now) {
    var f = card && card.fsrs;
    if (!f || !(f.stability > 0)) return 0;
    var ts = (typeof now === 'number') ? now : Date.now();
    if (f.due > ts) return 1; // belum lewat jadwal → masih segar
    var t = Math.max(0, (ts - f.due) / 1000 / SECS_PER_DAY + 1); // 1 hari sejak ulasan
    return retention(f.stability, t);
  }

  /** Retensi target user (default 0.9), disimpan di np-srs-retention. */
  function desiredRetention() {
    try {
      var v = parseFloat(localStorage.getItem('np-srs-retention'));
      if (!isNaN(v) && v >= 0.7 && v <= 0.97) return v;
    } catch (e) { /* abaikan */ }
    return 0.9;
  }

  /** Estimasi stabilitas dari interval SM-2 (menit) → hari. */
  function sm2MinutesToStability(mins) {
    if (!(mins > 0)) return 0;
    var days = mins / 1440;
    // S didefinisikan sbg t saat R=0.9: asumsikan ulasan lama terjadi saat
    // R≈0.8-0.9 → S ≈ interval berjalan.
    return days;
  }

  function estimateFromHistory(hist) {
    var best = 0;
    if (!Array.isArray(hist)) return 0;
    for (var i = 0; i < hist.length; i++) {
      var h = hist[i];
      if (h && typeof h === 'object' && typeof h.ivl === 'number' && h.ivl > best) best = h.ivl;
    }
    return sm2MinutesToStability(best);
  }

  /**
   * Pastikan `card.fsrs` ada — migrasi SATU KALI dari data SM-2.
   * Kartu lama: stability diestimasi dari interval, difficulty 5 (netral),
   * `due` mengikuti `nextReview` yang ada (tidak menggeser jadwal).
   */
  function ensureState(card) {
    var c = card || {};
    if (!c.fsrs) c.fsrs = {};
    var f = c.fsrs;
    var ts = Date.now();

    if (typeof f.stability !== 'number') {
      var st = estimateFromHistory(c.history);
      if (!(st > 0)) st = sm2MinutesToStability(c.interval || 0);
      if (!(st > 0)) st = W[2]; // setara Good pertama
      f.stability = clamp(st, MIN_S, MAX_S);
    }
    if (typeof f.difficulty !== 'number') {
      f.difficulty = 5.0;
    }
    if (typeof f.due !== 'number') {
      var nr = (typeof c.nextReview === 'number') ? c.nextReview : 0;
      f.due = (nr > ts) ? nr : ts;
    }
    if (typeof f.lastDate !== 'number') {
      f.lastDate = (typeof c.lastReviewed === 'number' && c.lastReviewed > 0)
        ? Math.floor(c.lastReviewed / 1000) : Math.floor(ts / 1000);
    }
    if (typeof f.repsSinceLapse !== 'number') f.repsSinceLapse = 0;
    if (typeof f.lapses !== 'number') {
      f.lapses = (typeof c.lapses === 'number') ? c.lapses : 0;
    }
    if (typeof f.postLapseS !== 'number') f.postLapseS = 0;
    if (typeof f.graduated !== 'boolean') {
      // Kartu SM-2 lama dengan reps >= ambang dianggap sudah lulus tahap belajar.
      f.graduated = (typeof c.reps === 'number') ? c.reps >= GRADUATING_REPS : false;
    }
    if (typeof f.firstReviewDone !== 'boolean') {
      // Migran SM-2 yang sudah punya interval: jangan lewati ulasan pertamanya
      // lewat jalur S0 — stabilitasnya sudah diestimasi dari interval lama.
      f.firstReviewDone = f.graduated;
    }
    return c;
  }

  /** Ulasan inti FSRS. rating UI 0-3. Hasil: state baru (tidak menulis kartu). */
  function review(card, rating, now) {
    var g = ratingToGrade(rating); // 1..4
    var ts = (typeof now === 'number') ? now : Date.now();
    ensureState(card);
    var f = card.fsrs;
    var secsNow = Math.floor(ts / 1000);

    var reps = (typeof card.reps === 'number') ? card.reps : 0;
    var learning = !f.graduated;
    // Ulasan pertama di tahap ulasan: HANYA untuk kartu yang baru pertama kali
    // lulus dari tahap belajar (belum pernah menjalani ulasan FSRS penuh).
    var firstReview = f.graduated && !f.firstReviewDone && reps <= GRADUATING_REPS;

    var S, D, dueMs, ivlDays, repsOut, lapsesOut, rslOut;

    if (learning) {
      // ── Tahap belajar: langkah pendek (menit) ──
      if (g === 1) {
        repsOut = 0;
        lapsesOut = f.lapses + 1;
        rslOut = 0;
        ivlDays = STEPS_AGAIN[0] / 1440;
      } else {
        repsOut = reps + 1;
        lapsesOut = f.lapses;
        rslOut = (f.repsSinceLapse || 0) + 1;
        ivlDays = STEPS_NEW[g - 2] / 1440;
        if (repsOut >= GRADUATING_REPS) {
          f.graduated = true; // lulus setelah 2 sukses
          // Bila kartu sedang bangkit dari lapse, lulus dengan stabilitas
          // pasca-lupa (S_f) sebagai dasar — bukan langkah 10 mnt.
          if (f.postLapseS > 0) S = clamp(f.postLapseS, MIN_S, MAX_S);
        }
      }
      D = 5.0;
      if (f.postLapseS > 0 && repsOut >= GRADUATING_REPS) {
        // Lulus dari re-learn: dasar S_f — jadwal pertama pasca-lupa memakai
        // stabilitas baru itu (bukan langkah 10 mnt), sekali pakai.
        S = clamp(f.postLapseS, MIN_S, MAX_S);
        f.postLapseS = 0;
        ivlDays = nextIntervalDays(S, desiredRetention());
        dueMs = secsNow * 1000 + Math.max(SECS_PER_DAY, Math.round(ivlDays * SECS_PER_DAY)) * 1000;
      } else {
        S = clamp(ivlDays, MIN_S, MAX_S);
        dueMs = secsNow * 1000 + Math.round(ivlDays * SECS_PER_DAY * 1000);
      }
    } else if (firstReview) {
      // ── Ulasan pertama di tahap ulasan: state awal FSRS by grade ──
      if (g === 1) {
        // Lupa sebelum sempat "lulus" sungguhan → lapse, ulang tahap belajar.
        repsOut = 0;
        lapsesOut = f.lapses + 1;
        rslOut = 0;
        S = clamp(W[0], MIN_S, MAX_S);
        D = clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
        ivlDays = STEPS_AGAIN[0] / 1440;
        dueMs = secsNow * 1000 + STEPS_AGAIN[0] * 60 * 1000;
        f.graduated = false;
      } else {
        S = clamp(W[g - 1], MIN_S, MAX_S); // S0 by grade
        D = clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10); // D0 by grade
        repsOut = reps + 1;
        lapsesOut = f.lapses;
        rslOut = 1;
        ivlDays = nextIntervalDays(S, desiredRetention());
        dueMs = secsNow * 1000 + Math.max(SECS_PER_DAY, Math.round(ivlDays * SECS_PER_DAY)) * 1000;
        f.firstReviewDone = true;
      }
    } else if (g === 1) {
      // ── Lupa di tahap ulasan ──
      // S_f = stabilitas pasca-lupa (FSRS-5), D naik ke arah D0(Again).
      // Kartu kembali ke tahap belajar (langkah 1 mnt) seperti Anki, namun
      // state S/D yang baru dipertahankan — begitu lulus lagi, ulasan
      // berikutnya tumbuh dari S_f, bukan dari nol.
      var R = retention(f.stability, Math.max(0, (secsNow - f.lastDate) / SECS_PER_DAY));
      var Sf = W[11] * Math.pow(f.difficulty, -W[12]) * (Math.pow(f.stability + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R));
      var d0Again = clamp(W[4] - Math.exp(W[5] * 0) + 1, 1, 10); // D0(grade=Again)
      var d0Easy = clamp(W[4] - Math.exp(W[5] * 3) + 1, 1, 10);  // target mean reversion
      D = clamp(W[7] * d0Easy + (1 - W[7]) * d0Again, 1, 10);
      S = clamp(Math.min(Sf, f.stability), MIN_S, MAX_S);
      repsOut = 0;
      lapsesOut = f.lapses + 1;
      rslOut = 0;
      ivlDays = STEPS_AGAIN[0] / 1440;
      dueMs = secsNow * 1000 + STEPS_AGAIN[0] * 60 * 1000;
      f.postLapseS = S;      // simpan utk dipakai saat lulus lagi
      f.graduated = false;   // re-learn: 1 mnt -> 10 mnt -> lulus lagi
    } else {
      // ── Sukses di tahap ulasan: model penuh ──
      var elapsedD = Math.max(0, (secsNow - f.lastDate) / SECS_PER_DAY);
      var R2 = (f.lastDate && f.stability > 0) ? retention(f.stability, elapsedD) : 1;
      var Dp = f.difficulty + (-W[6] * (g - 3)) * ((10 - f.difficulty) / 9);
      D = clamp(W[7] * (W[4] - Math.exp(W[5] * 3) + 1) + (1 - W[7]) * Dp, 1, 10);
      var Sinc = 1 + (11 - D) * Math.pow(f.stability, -W[9]) * (Math.exp(W[10] * (1 - R2)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1) * Math.exp(W[8]);
      S = clamp(f.stability * Sinc, MIN_S, MAX_S);
      repsOut = reps + 1;
      lapsesOut = f.lapses;
      rslOut = (f.repsSinceLapse || 0) + 1;
      ivlDays = nextIntervalDays(S, desiredRetention());
      dueMs = secsNow * 1000 + Math.max(SECS_PER_DAY, Math.round(ivlDays * SECS_PER_DAY)) * 1000;
    }

    f.stability = Math.round(S * 10000) / 10000;
    f.difficulty = Math.round(D * 100) / 100;
    f.due = dueMs;
    f.lastDate = secsNow;
    f.repsSinceLapse = rslOut;
    f.lapses = lapsesOut;
    f.meanReint = f.meanReint; // placeholder konsistensi (tidak dipakai FSRS-5 murni)

    return {
      stability: f.stability,
      difficulty: f.difficulty,
      due: dueMs,
      ivlDays: ivlDays,
      reps: repsOut,
      lapses: lapsesOut,
      repsSinceLapse: rslOut,
      lastDate: secsNow,
      card: card
    };
  }

  /**
   * Ulasan + tulis balik state kartu (field lama ikut disinkronkan supaya
   * halaman lain — statistik, dashboard, backup/restore — tetap terbaca).
   */
  function rate(card, rating, now) {
    var c = ensureState(card);
    var out = review(c, rating, now);
    var ts = (typeof now === 'number') ? now : Date.now();

    c.reps = out.reps;
    c.lapses = out.lapses;
    c.lastRating = rating;
    c.lastReviewed = ts;
    c.nextReview = out.due;                       // alias filter "jatuh tempo"
    c.ef = clamp(2.5 - (out.difficulty - 5) * 0.15, 1.3, 3.0); // turunan visual
    c.interval = Math.max(1, Math.round(out.ivlDays * 1440));  // menit, kompatibel
    if (!c.history) c.history = [];
    c.history.push({
      r: rating, t: ts,
      stability: out.stability, difficulty: out.difficulty,
      ivl: c.interval, ivlDays: Math.round(out.ivlDays * 100) / 100,
      reps: out.reps, lapses: out.lapses
    });
    if (c.history.length > 30) c.history = c.history.slice(-30);
    return c;
  }

  /** Label manusiawi utk interval dlm hari. */
  function formatDays(days) {
    if (!(days > 0)) return 'hari ini';
    if (days < 1) return Math.max(1, Math.round(days * 24)) + ' jam';
    if (days < 7) return Math.round(days) + ' hari';
    if (days < 31) return Math.round(days / 7) + ' mgg';
    if (days < 365) return Math.round(days / 30) + ' bln';
    return Math.round(days / 365 * 10) / 10 + ' thn';
  }

  /* ── Ekspor ── */
  var NPFSRS = {
    version: '5.0',
    weights: W.slice(),
    retention: retention,
    nextIntervalDays: nextIntervalDays,
    currentRetention: currentRetention,
    desiredRetention: desiredRetention,
    ensureState: ensureState,
    review: review,
    rate: rate,
    formatDays: formatDays,
    ratingToGrade: ratingToGrade,
    SECS_PER_DAY: SECS_PER_DAY
  };

  if (typeof window !== 'undefined') window.NPFSRS = NPFSRS;
  if (typeof module !== 'undefined' && module.exports) module.exports = NPFSRS;
})();
