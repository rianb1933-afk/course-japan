/**
 * assets/srs-cap.js — Kuota kartu baru SRS per level JLPT (N5 > N1)
 * =================================================================
 * Logika murni batas kartu BARU per hari, dipisah dari DOM supaya bisa
 * diuji unit (scripts/tests/test-srs-cap.js) terhadap kode produksi asli
 * — pola yang sama dengan assets/srs-fsrs.js (window.NPFSRS).
 *
 * Kebijakan:
 *  - Setiap kartu masuk ke bucket level: jlpt N1–N5, selainnya "lain"
 *    (Kaigo, Kanji/Grammar tanpa level, JMdict, kartu kustom, dll).
 *  - Kuota per bucket disimpan sebagai JSON di key `np-srs-new-caps`.
 *  - Key lama `np-srs-new-cap` (satu angka) tetap dibaca dan dipakai
 *    sebagai nilai semua bucket bila key baru belum pernah ditulis.
 *  - Nilai 0 = tanpa batas.
 *  - Pemakaian harian dicatat per level pada key `np-srs-today-<tanggal>`
 *    → objek `newByLevel`, selaras dengan penghitung lama `new`/`review`.
 *
 * Semua fungsi murni: storage & data hari ini di-inject agar pengujian
 * lintas hari (day boundary) tidak bergantung pada Date sungguhan.
 */
(function () {
  'use strict';

  var BUCKETS = ['n5', 'n4', 'n3', 'n2', 'n1', 'lain'];
  var DEFAULTS = { n5: 20, n4: 15, n3: 10, n2: 5, n1: 3, lain: 20 };
  var OPTIONS = [0, 3, 5, 10, 15, 20, 30, 50, 100];

  function parseJSON(raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  // Level kartu: jlpt "N1"–"N5" (huruf besar/kecil) → bucket kecil;
  // kosong / bukan JLPT → bucket "lain".
  function bucketOf(card) {
    var j = card && card.jlpt ? String(card.jlpt).trim() : '';
    if (/^N[1-5]$/i.test(j)) return j.toLowerCase();
    return 'lain';
  }

  // Baca kuota per level; migrasi dari satu nilai lama bila key baru belum ada
  function readCaps(storage) {
    var map = parseJSON(storage.getItem('np-srs-new-caps') || 'null') || {};
    var legacy = null;
    var raw = parseInt(storage.getItem('np-srs-new-cap'), 10);
    if (!isNaN(raw)) legacy = raw;
    var out = {};
    for (var i = 0; i < BUCKETS.length; i++) {
      var b = BUCKETS[i];
      var v = (typeof map[b] === 'number') ? map[b] : (legacy !== null ? legacy : DEFAULTS[b]);
      if (typeof v !== 'number' || isNaN(v) || v < 0) v = DEFAULTS[b];
      out[b] = v;
    }
    return out;
  }

  function saveCaps(storage, caps) {
    storage.setItem('np-srs-new-caps', JSON.stringify(caps));
  }

  // Normalisasi data aktivitas harian `np-srs-today-<tanggal>`.
  // Shape lama {reviewed:[], new, review} tetap dipahami; newByLevel
  // ditambahkan untuk pencatatan pemakaian per level.
  function readToday(storage, todayKey) {
    var d = parseJSON(storage.getItem(todayKey) || '{}') || {};
    return {
      reviewed: Array.isArray(d.reviewed) ? d.reviewed : [],
      new: (typeof d.new === 'number') ? d.new : 0,
      review: (typeof d.review === 'number') ? d.review : 0,
      newByLevel: (d.newByLevel && typeof d.newByLevel === 'object') ? d.newByLevel : {}
    };
  }

  // Kartu baru yang sudah dipakai hari ini untuk satu bucket
  function usedToday(today, bucket) {
    return (typeof today.newByLevel[bucket] === 'number') ? today.newByLevel[bucket] : 0;
  }

  // Sisa kuota satu bucket hari ini; kuota 0 = tanpa batas → Infinity
  function left(today, caps, bucket) {
    var cap = (typeof caps[bucket] === 'number') ? caps[bucket] : DEFAULTS[bucket];
    return cap === 0 ? Infinity : Math.max(0, cap - usedToday(today, bucket));
  }

  // Total sisa kuota seluruh bucket (Infinity bila semuanya tanpa batas)
  function totalLeft(today, caps) {
    var sum = 0;
    var anyFinite = false;
    for (var i = 0; i < BUCKETS.length; i++) {
      var b = BUCKETS[i];
      var cap = (typeof caps[b] === 'number') ? caps[b] : DEFAULTS[b];
      if (cap === 0) continue;
      anyFinite = true;
      sum += Math.max(0, cap - usedToday(today, b));
    }
    return anyFinite ? sum : Infinity;
  }

  // Catat pemakaian satu kartu baru (dipanggil sekali per kartu per hari,
  // setelah guard `reviewed[]` di trackReview). Memutasi objek `today`.
  function accountNew(today, bucket) {
    var b = bucket || 'lain';
    today.new = (typeof today.new === 'number' ? today.new : 0) + 1;
    today.newByLevel[b] = (typeof today.newByLevel[b] === 'number' ? today.newByLevel[b] : 0) + 1;
    return today;
  }

  // Tombol "Reset kuota hari ini": kosongkan pemakaian per level agar kuota
  // langsung penuh lagi. Penghitung `new`/`reviewed` sengaja TIDAK disentuh —
  // kartu memang sudah diulas hari ini, hanya jatah kartu barunya yang dipulihkan.
  function resetUsage(today) {
    today.newByLevel = {};
    return today;
  }

  // Potong kartu baru yang levelnya sudah kehabisan kuota hari ini.
  // Kartu yang sudah pernah dipelajari (s.reps > 0) dan bucket tanpa batas
  // tidak disentuh. Kartu yang lolos menghabiskan jatahnya hanya di memori
  // (`used`) — tidak menulis storage. `stored` = peta id → state kartu.
  function trim(cards, stored, caps, today) {
    var used = {};
    for (var i = 0; i < BUCKETS.length; i++) used[BUCKETS[i]] = usedToday(today, BUCKETS[i]);
    return cards.filter(function (c) {
      var s = stored[c.id];
      var isNew = !s || !s.reps;
      if (!isNew) return true;
      var b = bucketOf(c);
      var cap = (typeof caps[b] === 'number') ? caps[b] : DEFAULTS[b];
      if (cap === 0) return true; // tanpa batas
      var u = used[b];
      if (u >= cap) return false;
      used[b] = u + 1;
      return true;
    });
  }

  window.NPCap = {
    BUCKETS: BUCKETS.slice(),
    DEFAULTS: DEFAULTS,
    OPTIONS: OPTIONS.slice(),
    bucketOf: bucketOf,
    readCaps: readCaps,
    saveCaps: saveCaps,
    readToday: readToday,
    usedToday: usedToday,
    resetUsage: resetUsage,
    left: left,
    totalLeft: totalLeft,
    accountNew: accountNew,
    trim: trim
  };
})();
