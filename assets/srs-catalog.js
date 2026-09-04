/**
 * assets/srs-catalog.js — Katalog kartu SRS: inti eager + ekor JMdict lazy
 * =======================================================================
 * Menggantikan pemuatan assets/srs-cards-data.js (7,14 MB, <script> SINKRON
 * sehingga memblokir render, lalu mem-map 100.000 baris jadi array objek
 * KEDUA di main thread).
 *
 * Sekarang:
 *   assets/srs/core.js       — 12.783 kartu inti + manifest, dimuat `defer`
 *   assets/srs/tail-NN.json  — 87.217 kartu JMdict, di-fetch hanya bila perlu
 *
 * Tiga sifat data (diverifikasi & ditegakkan scripts/build-srs-catalog.js):
 *   1. Baris `cat:'jmdict'` kontigu di akhir; depannya "inti".
 *   2. SEMUA kartu ber-level JLPT ada di inti; ekor 100% `jlpt:''`.
 *   3. id posisional: id === 'v' + String(idx+1).padStart(5,'0').
 *
 * Karena (3), has() dan metaOf() O(1) untuk id APA PUN tanpa memuat shard.
 * Karena (1)+(2), inti+kurasi menutup semua filter kecuali `jmdict`, `due`,
 * dan `all` saat kuota "Lainnya" = 0 (tak terbatas).
 *
 * KONTRAK PENTING: cards() SELALU mengembalikan objek array yang SAMA.
 * Shard yang datang belakangan mengisi ulang array itu di tempat, sehingga
 * seluruh pemanggil lama (`CARDS.filter(...)`, `CARDS.length`) tidak perlu
 * diubah. Urutannya dijaga persis seperti dulu — kurasi, inti, ekor, kustom —
 * supaya NPCap.trim (satu-satunya konsumen yang peka urutan) berperilaku sama.
 *
 * Semua dependensi bisa di-inject (meta/raw/curated/storage/fetch) agar bisa
 * diuji unit terhadap kode produksi asli — pola yang sama dengan
 * assets/srs-cap.js dan assets/srs-fsrs.js.
 */
(function () {
  'use strict';

  var EXAMPLE_SUFFIX = 'を覚えましょう。';

  var meta = null;          // SRS_CORE_META
  var curated = [];         // kartu kurasi (objek penuh)
  var coreCards = [];       // kartu inti hasil materialisasi
  var customCards = [];     // kartu kustom pengguna
  var tailShards = [];      // sparse: index shard -> array kartu
  var tailLoadedCount = 0;
  var arr = [];             // SATU-SATUNYA array yang dikembalikan cards()
  var inflight = {};        // index shard -> Promise (dedupe)
  var degraded = false;     // true bila core.js gagal dimuat
  var baseUrl = 'assets/srs/';
  var fetchImpl = null;

  function parseJSON(raw, fallback) {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  /** Bentuk objek kartu HARUS identik dengan .map() lama di srs-cards-data.js. */
  function toCard(row) {
    return {
      id: row[0],
      type: meta && meta.type ? meta.type : 'VOCAB',
      jp: row[1],
      reading: row[2],
      meaning: row[3],
      example: row[1] + EXAMPLE_SUFFIX,
      cat: row[4],
      jlpt: row[5]
    };
  }

  /** Kartu ekor: id/cat/jlpt/type diturunkan, baris hanya [jp, reading, meaning]. */
  function toTailCard(row, absIndex) {
    var jp = row[0];
    return {
      id: meta.idPrefix + String(absIndex + 1).padStart(meta.idPad, '0'),
      type: meta.type,
      jp: jp,
      reading: row[1],
      meaning: row[2],
      example: jp + EXAMPLE_SUFFIX,
      cat: meta.tail.cat,
      jlpt: meta.tail.jlpt
    };
  }

  /**
   * Isi ulang `arr` di tempat dengan urutan kanonis: kurasi, inti, ekor
   * (menurut urutan shard), kustom. Identitas objek array dipertahankan.
   */
  function rebuild() {
    arr.length = 0;
    var i, j;
    for (i = 0; i < curated.length; i++) arr.push(curated[i]);
    for (i = 0; i < coreCards.length; i++) arr.push(coreCards[i]);
    if (meta) {
      for (i = 0; i < meta.tail.files; i++) {
        var sh = tailShards[i];
        if (sh) for (j = 0; j < sh.length; j++) arr.push(sh[j]);
      }
    }
    for (i = 0; i < customCards.length; i++) arr.push(customCards[i]);
  }

  /** Indeks 0-based dari id posisional, atau -1 bila bukan id bulk. */
  function indexOfId(id) {
    if (!meta || typeof id !== 'string') return -1;
    if (id.charAt(0) !== meta.idPrefix) return -1;
    var n = id.slice(1);
    if (!/^\d+$/.test(n)) return -1;
    var idx = parseInt(n, 10) - 1;
    if (idx < 0 || idx >= meta.total) return -1;
    return idx;
  }

  function shardOfIndex(idx) {
    return Math.floor((idx - meta.tail.start) / meta.tail.shard);
  }

  // ── inisialisasi ───────────────────────────────────────────────────
  function init(deps) {
    deps = deps || {};
    var w = (typeof window !== 'undefined') ? window : {};
    var storage = deps.storage || (typeof localStorage !== 'undefined' ? localStorage : null);

    meta = deps.meta || w.SRS_CORE_META || null;
    var raw = deps.raw || w.SRS_CORE_RAW || null;
    if (deps.baseUrl) baseUrl = deps.baseUrl;
    if (deps.fetch) fetchImpl = deps.fetch;

    var cur = deps.curated || w.SRS_CURATED;
    curated = Array.isArray(cur) ? cur.slice() : [];

    // Kartu kustom: `Array.isArray` sengaja dipakai — kode lama memakai
    // CARDS.concat(x) yang, bila x bukan array, menyisipkan x SENDIRI
    // sebagai satu "kartu" rusak. Itu bug laten, tidak direproduksi di sini.
    if (deps.custom !== undefined) {
      customCards = Array.isArray(deps.custom) ? deps.custom.slice() : [];
    } else if (storage) {
      var parsed = parseJSON(storage.getItem('np-srs-custom') || '[]', []);
      customCards = Array.isArray(parsed) ? parsed : [];
    } else {
      customCards = [];
    }

    coreCards = [];
    tailShards = [];
    tailLoadedCount = 0;
    inflight = {};

    if (meta && Array.isArray(raw)) {
      degraded = false;
      for (var i = 0; i < raw.length; i++) coreCards.push(toCard(raw[i]));
      // Lepaskan tuple mentah supaya bisa dikoleksi GC — inilah separuh
      // dari penghematan heap; menahannya berarti dua salinan seperti dulu.
      if (!deps.raw && typeof window !== 'undefined') window.SRS_CORE_RAW = null;
    } else {
      // core.js gagal dimuat: jalankan dengan kurasi saja — persis perilaku
      // lama ketika srs-cards-data.js gagal (CARDS = CARDS_ORIGINAL).
      degraded = true;
    }

    rebuild();
    return api;
  }

  function cards() { return arr; }
  function isDegraded() { return degraded; }
  function metaData() { return meta; }

  /** Jumlah seluruh kartu katalog (kurasi + bulk + kustom). */
  function total() {
    return curated.length + (meta ? meta.total : 0) + customCards.length;
  }

  function has(id) {
    if (indexOfId(id) !== -1) return true;
    var i;
    for (i = 0; i < curated.length; i++) if (curated[i].id === id) return true;
    for (i = 0; i < customCards.length; i++) if (customCards[i].id === id) return true;
    return false;
  }

  /** {cat, jlpt, type} untuk id APA PUN — id ekor tidak perlu shard. */
  function metaOf(id) {
    var idx = indexOfId(id);
    if (idx !== -1) {
      if (idx < meta.coreCount) {
        var c = coreCards[idx];
        return c ? { cat: c.cat, jlpt: c.jlpt, type: c.type } : null;
      }
      return { cat: meta.tail.cat, jlpt: meta.tail.jlpt, type: meta.type };
    }
    var i;
    for (i = 0; i < curated.length; i++) {
      if (curated[i].id === id) return { cat: curated[i].cat, jlpt: curated[i].jlpt || '', type: curated[i].type };
    }
    for (i = 0; i < customCards.length; i++) {
      if (customCards[i].id === id) {
        return { cat: customCards[i].cat || 'custom', jlpt: customCards[i].jlpt || '', type: customCards[i].type };
      }
    }
    return null;
  }

  /** Kartu penuh bila shard-nya sudah termuat, selain itu null. */
  function get(id) {
    var idx = indexOfId(id);
    if (idx !== -1) {
      if (idx < meta.coreCount) return coreCards[idx] || null;
      var s = tailShards[shardOfIndex(idx)];
      if (!s) return null;
      return s[(idx - meta.tail.start) % meta.tail.shard] || null;
    }
    var i;
    for (i = 0; i < curated.length; i++) if (curated[i].id === id) return curated[i];
    for (i = 0; i < customCards.length; i++) if (customCards[i].id === id) return customCards[i];
    return null;
  }

  /**
   * Hitungan untuk semua tombol filter, TANPA memindai 100rb kartu.
   * Bagian kecil (kurasi + kustom) dipindai; bagian bulk diambil dari manifest.
   */
  function counts() {
    var small = curated.concat(customCards);
    var mc = (meta && meta.counts) ? meta.counts : {};
    function smallBy(fn) { var n = 0; for (var i = 0; i < small.length; i++) if (fn(small[i])) n++; return n; }

    return {
      all: total(),
      n5: (mc.N5 || 0) + smallBy(function (c) { return c.jlpt === 'N5'; }),
      n4: (mc.N4 || 0) + smallBy(function (c) { return c.jlpt === 'N4'; }),
      n3: (mc.N3 || 0) + smallBy(function (c) { return c.jlpt === 'N3'; }),
      n2: (mc.N2 || 0) + smallBy(function (c) { return c.jlpt === 'N2'; }),
      n1: (mc.N1 || 0) + smallBy(function (c) { return c.jlpt === 'N1'; }),
      kaigo: (mc.kaigo || 0) + smallBy(function (c) { return c.cat === 'kaigo'; }),
      // type bulk konstan 'VOCAB', jadi KANJI/GRAMMAR hanya dari bagian kecil
      kanji: smallBy(function (c) { return c.type === 'KANJI'; }),
      grammar: smallBy(function (c) { return c.type === 'GRAMMAR'; }),
      jmdict: (mc.jmdict || 0) + smallBy(function (c) { return c.cat === 'jmdict'; }),
      vocab: (mc.vocab || 0) + smallBy(function (c) { return c.cat === 'vocab'; }),
      kustom: smallBy(function (c) { return String(c.id).indexOf('cust') === 0; })
    };
  }

  /** Total per level untuk chart JLPT halaman statistik. */
  function levelTotals() {
    var c = counts();
    return { N5: c.n5, N4: c.n4, N3: c.n3, N2: c.n2, N1: c.n1 };
  }

  /*
   * Tiga hitungan di bawah menyalin PERSIS ekspresi lama, termasuk tiga
   * kuirk `undefined` yang mudah rusak bila "dirapikan":
   *   - `s.nextReview <= now` bernilai false saat nextReview undefined, jadi
   *     komplemennya WAJIB `!(s.nextReview <= now)`, bukan `s.nextReview > now`.
   *   - `!s.reps` truthy saat reps === 0.
   *   - `s.lastRating !== null` bernilai TRUE saat lastRating undefined.
   */
  function dueCount(stored, now) {
    var notDue = 0;
    for (var id in stored) {
      if (!Object.prototype.hasOwnProperty.call(stored, id)) continue;
      var s = stored[id];
      if (!s || !has(id)) continue;
      if (!(s.nextReview <= now)) notDue++;
    }
    return total() - notDue;
  }

  function newCount(stored) {
    var notNew = 0;
    for (var id in stored) {
      if (!Object.prototype.hasOwnProperty.call(stored, id)) continue;
      var s = stored[id];
      if (!s || !has(id)) continue;
      if (s.reps) notNew++;            // sengaja truthy, bukan > 0
    }
    return total() - notNew;
  }

  function learnedCount(stored) {
    var n = 0;
    for (var id in stored) {
      if (!Object.prototype.hasOwnProperty.call(stored, id)) continue;
      var s = stored[id];
      if (s && has(id) && s.reps > 0) n++;
    }
    return n;
  }

  function retention(stored) {
    var rated = 0, good = 0;
    for (var id in stored) {
      if (!Object.prototype.hasOwnProperty.call(stored, id)) continue;
      var s = stored[id];
      if (!s || !has(id)) continue;
      if (s.lastRating !== null) {     // undefined pun ikut terhitung
        rated++;
        if (s.lastRating >= 2) good++;
      }
    }
    return rated ? Math.round(good / rated * 100) : null;
  }

  // ── shard mana yang benar-benar dibutuhkan ─────────────────────────
  function allShards() {
    var out = [];
    if (!meta) return out;
    for (var i = 0; i < meta.tail.files; i++) if (!tailShards[i]) out.push(i);
    return out;
  }

  function shardsFor(ids) {
    var need = {}, out = [];
    if (!meta) return out;
    for (var i = 0; i < ids.length; i++) {
      var idx = indexOfId(ids[i]);
      if (idx < meta.tail.start) continue;
      var s = shardOfIndex(idx);
      if (!tailShards[s] && !need[s]) { need[s] = true; out.push(s); }
    }
    return out.sort(function (a, b) { return a - b; });
  }

  /**
   * Filter yang BISA dilayani inti+kurasi saja: n5..n1 (semua kartu ber-level
   * ada di inti), kaigo/kanji/grammar/vocab (bulk tidak menyumbang atau sudah
   * ada di inti), kustom. Sisanya butuh ekor.
   */
  function shardsNeededFor(filter, stored, caps) {
    if (degraded || !meta) return [];
    switch (filter) {
      case 'jmdict':
        return allShards();
      case 'due':
        // `due` menampilkan setiap kartu yang belum dijadwalkan — termasuk
        // seluruh ekor yang belum pernah disentuh.
        return allShards();
      case 'all':
        // Dengan kuota "lain" terbatas, NPCap.trim hanya mengambil segelintir
        // kartu baru dan semuanya berasal dari inti. Kuota 0 = tak terbatas,
        // barulah ekor ikut ditarik.
        if (caps && caps.lain === 0) return allShards();
        return shardsFor(studiedIds(stored));
      case 'bookmark':
        return [];               // dilayani pemanggil lewat shardsFor(bookmarks)
      default:
        return [];
    }
  }

  function studiedIds(stored) {
    var out = [];
    for (var id in stored) {
      if (!Object.prototype.hasOwnProperty.call(stored, id)) continue;
      var s = stored[id];
      if (s && s.reps > 0) out.push(id);
    }
    return out;
  }

  // ── pemuatan shard ────────────────────────────────────────────────
  function shardUrl(i) {
    return baseUrl + 'tail-' + String(i).padStart(2, '0') + '.json?v=' + (meta ? meta.v : '0');
  }

  function doFetch(url) {
    var f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!f) return Promise.reject(new Error('fetch tidak tersedia'));
    return f(url, { credentials: 'same-origin' });
  }

  /**
   * Muat satu shard. Validasi BENTUK, bukan cuma res.ok: service worker
   * membalas permintaan gagal dengan offline.html berstatus 200, sehingga
   * res.ok true tapi isinya HTML. Tanpa cek ini, kegagalan offline muncul
   * sebagai SyntaxError yang membingungkan, bukan error jaringan.
   */
  function loadShard(i) {
    if (tailShards[i]) return Promise.resolve(tailShards[i]);
    if (inflight[i]) return inflight[i];

    var expectStart = meta.tail.start + i * meta.tail.shard;

    var attempt = function (retriesLeft) {
      return doFetch(shardUrl(i)).then(function (res) {
        if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : '?'));
        return res.json();
      }).then(function (data) {
        if (!data || !Array.isArray(data.rows) || data.start !== expectStart) {
          throw new Error('bentuk shard tidak valid (start=' + (data && data.start) + ', diharapkan ' + expectStart + ')');
        }
        var out = [];
        for (var k = 0; k < data.rows.length; k++) out.push(toTailCard(data.rows[k], expectStart + k));
        tailShards[i] = out;
        tailLoadedCount++;
        return out;
      }).catch(function (err) {
        if (retriesLeft > 0) return attempt(retriesLeft - 1);
        throw err;
      });
    };

    var p = attempt(1).then(function (out) {
      delete inflight[i];
      return out;
    }, function (err) {
      delete inflight[i];
      throw err;
    });
    inflight[i] = p;
    return p;
  }

  /** Muat sekumpulan shard paralel; rebuild sekali di akhir. */
  function loadShards(list, onProgress) {
    if (!list || !list.length) return Promise.resolve(arr);
    var done = 0, tot = list.length;
    var ps = list.map(function (i) {
      return loadShard(i).then(function (r) {
        done++;
        if (onProgress) { try { onProgress(done, tot); } catch (e) {} }
        return r;
      });
    });
    return Promise.all(ps).then(function () {
      rebuild();
      return arr;
    });
  }

  function loadAll(onProgress) { return loadShards(allShards(), onProgress); }

  function tailReady() {
    return !!meta && tailLoadedCount >= meta.tail.files;
  }

  /** Peta id -> {jp,reading,meaning,cat,jlpt} untuk halaman statistik. */
  function lookup() {
    var map = {};
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      if (map[c.id]) continue;
      map[c.id] = { jp: c.jp, reading: c.reading, meaning: c.meaning, cat: c.cat || 'custom', jlpt: c.jlpt || '' };
    }
    return map;
  }

  function addCustom(card) {
    customCards.push(card);
    rebuild();
    return arr;
  }

  var api = {
    init: init,
    cards: cards,
    meta: metaData,
    isDegraded: isDegraded,
    total: total,
    has: has,
    metaOf: metaOf,
    get: get,
    counts: counts,
    levelTotals: levelTotals,
    dueCount: dueCount,
    newCount: newCount,
    learnedCount: learnedCount,
    retention: retention,
    shardsFor: shardsFor,
    shardsNeededFor: shardsNeededFor,
    loadShards: loadShards,
    loadAll: loadAll,
    tailReady: tailReady,
    lookup: lookup,
    addCustom: addCustom
  };

  window.NPCatalog = api;
})();
