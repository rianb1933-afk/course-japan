/**
 * assets/ssw-api.js — klien data platform SSW (特定技能)
 * =======================================================
 * Semua halaman SSW memakai modul ini untuk membaca konten dari
 * Supabase (PostgREST, RLS published=true) dan menulis progres/favorit
 * milik user sendiri. Memakai window.EDUMA_ENV (assets/env.js) untuk
 * URL+anon key dan window.SupabaseClient.Auth (assets/supabase-client.js)
 * untuk sesi/user id — dua-duanya wajib dimuat SEBELUM file ini.
 * Fallback offline: bila Supabase belum dikonfigurasi atau tabelnya
 * belum ada, kategori & konten contoh dimuat dari window.NP_SSW_SEED
 * (disuntik per halaman) supaya UI tetap hidup di preview — pola yang
 * sama dengan halaman lain di proyek ini (mode demo tanpa error merah).
 *
 * Progres lokal: localStorage np-ssw-v1 (aturan repo: key baru pakai
 * prefiks np-). Push ke Supabase (ssw_progress/ssw_favorites/
 * ssw_exam_results) hanya saat user login — diam saja saat belum.
 *
 * IIFE, namespace window.SSWAPI — pola assets/platform.js.
 */
(function () {
  'use strict';

  const LS_KEY = 'np-ssw-v1';

  // ── Jembatan Supabase ────────────────────────────────────────
  // Proyek ini TIDAK memuat @supabase/supabase-js. Yang tersedia adalah
  // pembungkus buatan sendiri window.SupabaseClient ({Auth, DB, Sync},
  // berbasis fetch) dari assets/supabase-client.js, plus window.EDUMA_ENV
  // dari assets/env.js. Versi sebelumnya di sini membaca window.__supabase
  // dan window.NPSupabase.session — dua global yang tidak pernah dibuat
  // siapa pun, jadi setiap halaman SSW selamanya jatuh ke NP_SSW_SEED dan
  // progres tidak pernah tersinkron. Sekarang panggil PostgREST langsung,
  // pola yang sama dengan sbFetch() internal supabase-client.js.
  function sbUrl()  { try { return window.EDUMA_ENV && window.EDUMA_ENV.SUPABASE_URL || ''; } catch (e) { return ''; } }
  function sbKey()  { try { return window.EDUMA_ENV && window.EDUMA_ENV.SUPABASE_ANON_KEY || ''; } catch (e) { return ''; } }
  function sbAuth() { return (window.SupabaseClient && window.SupabaseClient.Auth) || null; }

  function sbConfigured() { return Boolean(sbUrl() && sbKey()); }

  function isLoggedIn() {
    const a = sbAuth();
    try { return Boolean(a && a.isLoggedIn && a.isLoggedIn()); } catch (e) { return false; }
  }
  function userId() {
    const a = sbAuth();
    try { return (a && a.user && a.user() && a.user().id) || null; } catch (e) { return null; }
  }

  // GET/POST/DELETE ke /rest/v1/. `token` sesi dipakai bila ada supaya RLS
  // memberi baris milik user; kalau belum login, anon key cukup untuk
  // konten published=true. Melempar pada !ok — pemanggil membungkus try.
  async function sbRest(path, opts = {}) {
    const base = sbUrl();
    if (!base) throw new Error('SUPABASE_URL belum dikonfigurasi');
    const a = sbAuth();
    let token = sbKey();
    try { token = (a && a.session && a.session() && a.session().access_token) || sbKey(); } catch (e) { /* pakai anon */ }
    const res = await fetch(base + '/rest/v1/' + path, Object.assign({}, opts, {
      headers: Object.assign({
        'Content-Type': 'application/json',
        'apikey': sbKey(),
        'Authorization': 'Bearer ' + token,
      }, opts.headers || {}),
    }));
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('json') ? await res.json().catch(() => null) : null;
    if (!res.ok) throw new Error((body && (body.message || body.hint)) || ('HTTP ' + res.status));
    return body;
  }

  const enc = encodeURIComponent;

  // ── Konteks bidang aktif ──────────────────────────────────────
  // Progres disimpan dengan key `kind:itemId` — BUKAN `field:kind:itemId` —
  // supaya cermin persis dengan ssw_progress di Supabase, yang identitas
  // barisnya UNIQUE (user_id, item_kind, item_id) dan menyimpan bidang
  // sebagai KOLOM TERPISAH (category_id). Kalau bidang ikut dijadikan key,
  // satu item yang sama tidak akan pernah cocok lagi dengan barisnya di DB
  // saat sinkronisasi.
  //
  // Konsekuensinya bidang harus ikut disimpan sebagai properti nilai, dan
  // di sinilah asalnya: setiap halaman SSW selalu memanggil getFieldTree()
  // atau getItems() dengan slug bidangnya, jadi keduanya sekalian mencatat
  // bidang aktif. Tidak ada halaman SSW yang menampilkan dua bidang
  // sekaligus, jadi satu konteks per dokumen sudah cukup.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let fieldCtx = { slug: null, categoryId: null };

  // categoryId hanya ada di mode DB — seed (assets/ssw-seed.js) tidak punya
  // kolom id sama sekali. Jangan pernah menimpa uuid yang sudah diketahui
  // dengan undefined dari pemanggil berikutnya yang tidak tahu.
  function setFieldContext(slug, categoryId) {
    if (slug && slug !== fieldCtx.slug) fieldCtx = { slug, categoryId: null };
    if (UUID_RE.test(String(categoryId || ''))) fieldCtx.categoryId = categoryId;
    return fieldCtx;
  }
  function getFieldContext() { return { slug: fieldCtx.slug, categoryId: fieldCtx.categoryId }; }

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveLocal(state) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* penuh/privat — abaikan */ }
  }
  /* Migrasi entri lama: sebelum bidang ikut disimpan, progres tersimpan tanpa
     properti `field` sehingga tidak terhitung di ringkasan bidang mana pun.
     Sebagian bisa dipulihkan TANPA menebak, karena id-nya memuat slug bidang
     (mis. 'l-kaigo-1', 'qz-kaigo-1', 'kaigo-vocab'). Sisanya — id pendek
     seperti 'v1' dan uuid dari DB — memang tidak menyimpan bidangnya di mana
     pun; itu dibiarkan apa adanya alih-alih diberi atribusi karangan yang
     bisa memindahkan progres orang ke bidang yang salah.

     Dijalankan sekali (ditandai di store), dan hanya setelah daftar bidang
     tersedia: assets/ssw-seed.js dimuat SESUDAH berkas ini, jadi saat modul
     ini dievaluasi window.NP_SSW_SEED belum tentu ada. */
  function migrateLegacy(s) {
    if (s.migrated_field) return false;
    const slugs = ((window.NP_SSW_SEED || {}).categories || []).map(c => c.slug).filter(Boolean);
    if (!slugs.length) return false;   // belum bisa dinilai — coba lagi nanti

    for (const [key, val] of Object.entries(s.progress)) {
      if (!val || val.field) continue;
      const itemId = key.slice(key.indexOf(':') + 1);
      // Slug harus berdiri sebagai potongan utuh, bukan kebetulan tersisip.
      const cocok = slugs.filter(sl => new RegExp('(^|[^a-z0-9])' + sl + '($|[^a-z0-9])', 'i').test(itemId));
      if (cocok.length === 1) val.field = cocok[0];
    }
    // Selalu perlu disimpan: penandanya sendiri bagian dari state. Tanpa itu
    // migrasi memindai ulang seluruh progres di SETIAP pembacaan, selamanya.
    s.migrated_field = true;
    return true;
  }

  function local() {
    const s = loadLocal();
    if (!s.progress) s.progress = {};   // key: kind:id -> {completed, score, last_at}
    if (!s.favorites) s.favorites = {}; // key: kind:id -> label
    if (migrateLegacy(s)) saveLocal(s);
    return s;
  }

  // ── Konten (baca) ─────────────────────────────────────────────
  // Konten contoh satu bidang dari seed, dikunci slug (seed.fields[slug]).
  // null = bidang terdaftar tapi belum punya konten contoh.
  function seedField(slug) {
    const fields = (window.NP_SSW_SEED || {}).fields || {};
    return Object.prototype.hasOwnProperty.call(fields, slug) ? fields[slug] : null;
  }

  // Konten hasil generator (scripts/build-ssw-content.js) per bidang —
  // cadangan statis saat DB belum siap. index.json dulu supaya bidang tanpa
  // file tidak menembak 404 (Chromium mencatatnya sebagai error konsol).
  // Versi ditulis MENEMPEL pada ekstensi di URL di bawah: aligner
  // (scripts/align-asset-versions.py) hanya mengenali ekstensi yang langsung
  // diikuti query versi — konstanta versi terpisah tidak ikut naik saat bump.
  const STATIC_BASE = '/assets/ssw-content/';
  let staticIndex = null;
  const staticCache = {};
  function getJSON(url) {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(url).then(r => (r && r.ok ? r.json() : null)).catch(() => null);
  }
  function staticField(slug) {
    if (!slug) return Promise.resolve(null);
    if (!staticIndex) staticIndex = getJSON(STATIC_BASE + 'index.json?v=9');
    if (!staticCache[slug]) {
      staticCache[slug] = staticIndex.then(idx => {
        const list = (idx && Array.isArray(idx.fields)) ? idx.fields : [];
        return list.includes(slug) ? getJSON(STATIC_BASE + enc(slug) + '.json?v=9') : null;
      });
    }
    return staticCache[slug];
  }

  // Gabungan contoh seed + hasil generator. Untuk kunci yang sama, versi
  // generator menang — ia sumber yang dikurasi; contoh seed hanya pengisi.
  const MERGE_KEYS = { vocabulary: 'term', kanji: 'kanji', grammar: 'pattern', listening: 'title', reading: 'title', quizzes: 'id' };
  function mergeField(sample, gen) {
    if (!gen || !sample) return gen || sample;
    const out = Object.assign({}, sample, { slug: gen.slug || sample.slug });
    const bySort = (a, b) => (a.sort || 0) - (b.sort || 0);
    const genModuleIds = new Set((gen.modules || []).map(m => m.id));
    out.modules = (sample.modules || []).filter(m => !genModuleIds.has(m.id)).concat(gen.modules || []).sort(bySort);
    Object.keys(MERGE_KEYS).forEach(kind => {
      const key = MERGE_KEYS[kind];
      const genList = Array.isArray(gen[kind]) ? gen[kind] : [];
      const taken = new Set(genList.map(x => x && x[key]));
      out[kind] = (Array.isArray(sample[kind]) ? sample[kind] : []).filter(x => !taken.has(x && x[key])).concat(genList);
    });
    return out;
  }
  async function fallbackField(slug) {
    return mergeField(seedField(slug), await staticField(slug));
  }
  // Id kuis hasil generator berawalan slug bidang ('kaigo-m05-quiz'); dipakai
  // saat getQuiz() dipanggil sebelum halaman menetapkan konteks bidang.
  function slugFromQuizId(quizId) {
    const slugs = ((window.NP_SSW_SEED || {}).categories || []).map(c => c.slug).filter(Boolean);
    return slugs.filter(s => String(quizId).indexOf(s + '-') === 0).sort((a, b) => b.length - a.length)[0] || null;
  }

  async function getCategories() {
    if (sbConfigured()) {
      try {
        const data = await sbRest('ssw_categories?published=eq.true&order=sort&select=*');
        if (Array.isArray(data) && data.length) return { categories: data, source: 'db' };
      } catch (e) { /* jatuh ke seed */ }
    }
    return { categories: (window.NP_SSW_SEED && window.NP_SSW_SEED.categories) || [], source: 'seed' };
  }

  async function getFieldTree(slug) {
    setFieldContext(slug);
    if (sbConfigured()) {
      try {
        const cats = await sbRest('ssw_categories?slug=eq.' + enc(slug) + '&published=eq.true&select=*&limit=1');
        const cat = Array.isArray(cats) && cats[0];
        if (cat) {
          setFieldContext(slug, cat.id);
          const modules = await sbRest('ssw_modules?category_id=eq.' + enc(cat.id) + '&published=eq.true&order=sort&select=*,ssw_lessons(*)');
          return { category: cat, modules: Array.isArray(modules) ? modules : [], source: 'db' };
        }
      } catch (e) { /* jatuh ke seed */ }
    }
    // seed.fields hanya berisi konten contoh untuk sebagian bidang, sedangkan
    // seed.categories memuat semua bidang resmi. Kategorinya dicari terpisah
    // dari kontennya: bidang yang terdaftar tapi belum ada isinya harus tetap
    // mengembalikan category supaya dashboard menampilkan nama bidang +
    // keadaan kosong, bukan "Bidang tidak ditemukan" — hampir semua bidang di
    // hub sempat terlihat seperti tautan rusak padahal isinya memang belum
    // diisi admin.
    const seed = (window.NP_SSW_SEED || {});
    const cat = (seed.categories || []).find(c => c.slug === slug) || null;
    const f = await fallbackField(slug);
    return { category: cat, modules: (f && f.modules) || [], source: 'seed' };
  }

  async function getItems(slug, kind) {
    setFieldContext(slug);
    if (sbConfigured()) {
      try {
        const cats = await sbRest('ssw_categories?slug=eq.' + enc(slug) + '&select=id&limit=1');
        const cat = Array.isArray(cats) && cats[0];
        if (cat) {
          setFieldContext(slug, cat.id);
          const data = await sbRest('ssw_' + enc(kind) + '?category_id=eq.' + enc(cat.id) + '&published=eq.true&limit=500&select=*');
          if (Array.isArray(data)) return { items: data, source: 'db' };
        }
      } catch (e) { /* jatuh ke seed */ }
    }
    const f = await fallbackField(slug);
    return { items: (f && f[kind]) || [], source: 'seed' };
  }

  async function getQuiz(quizId) {
    if (sbConfigured()) {
      try {
        const rows = await sbRest('ssw_quizzes?id=eq.' + enc(quizId) + '&published=eq.true&select=*,ssw_questions(*)&limit=1');
        const data = Array.isArray(rows) && rows[0];
        if (data) {
          (data.ssw_questions || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
          return { quiz: data, source: 'db' };
        }
      } catch (e) { /* jatuh ke seed */ }
    }
    const seed = (window.NP_SSW_SEED || {});
    if (seed.quizzes && seed.quizzes[quizId]) return { quiz: seed.quizzes[quizId], source: 'seed' };
    const gen = await staticField(fieldCtx.slug || slugFromQuizId(quizId));
    const bank = gen && gen.quizBanks && gen.quizBanks[quizId];
    return { quiz: bank || null, source: 'seed' };
  }

  // ── Progres (lokal selalu, push DB saat login) ────────────────
  // `opts.field`/`opts.categoryId` boleh diisi eksplisit; kalau tidak,
  // dipakai bidang aktif dari getFieldTree()/getItems(). Bidang lama
  // dipertahankan supaya "sentuhan" last_at (mis. Lesson.html yang menulis
  // ulang status yang sama) tidak menghapus atribusi bidang yang sudah benar.
  function markProgress(kind, itemId, opts) {
    const s = local();
    const key = kind + ':' + itemId;
    const prev = s.progress[key] || {};
    const o = opts || {};
    s.progress[key] = {
      completed: o.completed !== undefined ? Boolean(o.completed) : Boolean(prev.completed),
      score: o.score !== undefined ? o.score : (prev.score || null),
      last_at: new Date().toISOString(),
      field: o.field || prev.field || fieldCtx.slug || null,
      category_id: (UUID_RE.test(String(o.categoryId || '')) ? o.categoryId : null)
        || prev.category_id || fieldCtx.categoryId || null,
    };
    saveLocal(s);
    pushProgress(kind, itemId, s.progress[key]);
    return s.progress[key];
  }

  function getProgress(kind, itemId) {
    const s = local();
    return s.progress[kind + ':' + itemId] || null;
  }

  function isCompleted(kind, itemId) {
    const p = getProgress(kind, itemId);
    return Boolean(p && p.completed);
  }

  // Rekap per bidang utk progress bar.
  // Difilter lewat val.field, BUKAN lewat prefiks key. Versi sebelumnya
  // mencari key berawalan `slug:` padahal markProgress() tidak pernah
  // menulis bentuk itu — semua key berbentuk `kind:itemId`, sehingga
  // filternya tidak pernah cocok dan setiap progress bar bidang permanen 0%
  // tanpa error apa pun. Entri lama (sebelum bidang ikut disimpan) tidak
  // punya val.field dan memang tidak dihitung: bidangnya tidak terekam di
  // mana pun, jadi menebaknya justru berisiko salah atribusi.
  const PROGRESS_KINDS = ['lesson', 'vocab', 'kanji', 'grammar', 'listening', 'reading', 'quiz'];
  function categorySummary(slug, totals) {
    const s = local();
    const t = totals || {};
    const done = {};
    PROGRESS_KINDS.forEach(k => { done[k] = 0; });
    for (const [key, val] of Object.entries(s.progress)) {
      if (!val || !val.completed || val.field !== slug) continue;
      const kind = key.split(':')[0];
      if (done[kind] !== undefined) done[kind]++;
    }
    // Dijepit 0..100: `done` datang dari localStorage sedangkan `totals` dari
    // DB, jadi keduanya bisa melenceng secara sah — admin menghapus lesson
    // yang sudah diselesaikan seseorang, atau progres kuis dicatat dengan id
    // sintetis (mis. Vocabulary.html memakai `<slug>-vocab`) yang tidak ada
    // di daftar kuis. Tanpa penjepit, bar-nya bisa menampilkan 120%.
    const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0);
    // percent menjumlah HANYA jenis yang punya total > 0, supaya pemanggil
    // yang cuma melacak sebagian jenis (mis. dashboard yang baru mengirim
    // total lesson) tidak ikut terbagi penyebut nol.
    const tracked = PROGRESS_KINDS.filter(k => (t[k] || 0) > 0);
    const out = {
      done,
      percent: pct(
        tracked.reduce((n, k) => n + done[k], 0),
        tracked.reduce((n, k) => n + (t[k] || 0), 0)
      ),
    };
    PROGRESS_KINDS.forEach(k => { out[k] = pct(done[k], t[k] || 0); });
    return out;
  }

  // ── Favorit ───────────────────────────────────────────────────
  function toggleFavorite(kind, itemId, label) {
    const s = local();
    const key = kind + ':' + itemId;
    if (s.favorites[key]) { delete s.favorites[key]; saveLocal(s); pushFavorite(kind, itemId, 'remove'); return false; }
    s.favorites[key] = label || ''; saveLocal(s); pushFavorite(kind, itemId, 'add', label); return true;
  }
  function isFavorite(kind, itemId) {
    return Boolean(local().favorites[kind + ':' + itemId]);
  }
  function listFavorites() {
    const s = local();
    return Object.entries(s.favorites).map(([key, label]) => {
      const [kind, ...rest] = key.split(':');
      return { kind, id: rest.join(':'), label };
    });
  }

  // ── Push diam ke Supabase (best effort, tanpa error merah) ────
  // upsert PostgREST = POST + Prefer: resolution=merge-duplicates + on_conflict.
  async function pushProgress(kind, itemId, val) {
    const uid = userId();
    if (!sbConfigured() || !uid) return;
    try {
      const row = {
        user_id: uid, item_kind: kind, item_id: String(itemId),
        completed: val.completed, score: val.score, last_at: val.last_at,
      };
      // category_id adalah uuid FK ke ssw_categories. Hanya dikirim bila
      // uuid-nya memang diketahui: di mode seed bidang cuma punya slug, dan
      // mengirim slug ke kolom uuid membuat SELURUH baris ditolak Postgres —
      // progres batal tersinkron demi kolom yang sekadar pelengkap.
      if (UUID_RE.test(String(val.category_id || ''))) row.category_id = val.category_id;
      await sbRest('ssw_progress?on_conflict=user_id,item_kind,item_id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(row),
      });
    } catch (e) { /* offline — lokal sudah tersimpan */ }
  }
  async function pushFavorite(kind, itemId, op, label) {
    const uid = userId();
    if (!sbConfigured() || !uid) return;
    try {
      if (op === 'add') {
        await sbRest('ssw_favorites?on_conflict=user_id,item_kind,item_id', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ user_id: uid, item_kind: kind, item_id: String(itemId), label: label || '' }),
        });
      } else {
        await sbRest('ssw_favorites?user_id=eq.' + enc(uid) + '&item_kind=eq.' + enc(kind) + '&item_id=eq.' + enc(String(itemId)), {
          method: 'DELETE', headers: { 'Prefer': 'return=minimal' },
        });
      }
    } catch (e) { /* offline */ }
  }
  // Hasil ujian selalu tersimpan lokal dulu (dipakai Progress.html walau
  // belum login), baru didorong ke DB. `slug` diisi dari bidang aktif kalau
  // pemanggil tidak menyebutnya — tanpa itu listExamResults(slug) di bawah
  // menyaring lewat r.slug yang tidak pernah ada isinya.
  async function saveExamResult(result) {
    const r = result || {};
    const slug = r.slug || fieldCtx.slug || null;
    const categoryId = UUID_RE.test(String(r.category_id || '')) ? r.category_id : fieldCtx.categoryId;
    const s = local();
    s.exam_results = s.exam_results || [];
    s.exam_results.unshift({ ...r, slug, category_id: categoryId || null, created_at: new Date().toISOString() });
    s.exam_results = s.exam_results.slice(0, 50);
    saveLocal(s);
    const uid = userId();
    if (sbConfigured() && uid) {
      try {
        const row = {
          user_id: uid,
          quiz_id: UUID_RE.test(String(r.quiz_id || '')) ? r.quiz_id : null,
          score: r.score, passed: r.passed,
          duration_s: r.duration_s || 0,
          detail: r.detail || [],
        };
        // Sama seperti pushProgress: kolom uuid hanya diisi bila uuid-nya nyata.
        if (UUID_RE.test(String(categoryId || ''))) row.category_id = categoryId;
        await sbRest('ssw_exam_results', {
          method: 'POST',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify(row),
        });
      } catch (e) { /* offline */ }
    }
    return s.exam_results[0];
  }
  function listExamResults(slug) {
    const s = local();
    return (s.exam_results || []).filter(r => !slug || r.slug === slug);
  }

  /* ── Tarik dari server (dua arah) ─────────────────────────────
     Penulisan lokal sudah didorong ke Supabase satu per satu, tapi tanpa
     penarikan balik arahnya cuma satu jalur: pengguna yang login di
     perangkat kedua melihat progresnya kosong padahal datanya ada di DB.

     Penggabungan progres memakai last_at (yang lebih baru menang) — kedua
     sisi menyimpannya, jadi aturannya tegas tanpa perlu jam server.

     Bidang dipulihkan lewat category_id: baris di ssw_progress menyimpan
     uuid bidang, bukan slug, jadi peta id→slug diambil sekali dari
     ssw_categories. Inilah gunanya category_id ikut dikirim saat push;
     tanpa itu progres yang ditarik balik tidak akan terhitung di ringkasan
     bidang mana pun.

     Favorit digabung sebagai union dan yang hanya ada lokal ikut didorong
     naik. Konsekuensi yang perlu diketahui: PENGHAPUSAN favorit tidak
     merambat antar perangkat — menghapus di perangkat A tidak menghapusnya
     di perangkat B yang masih menyimpannya. Menanganinya dengan benar
     butuh penanda tombstone di skema, dan itu keputusan skema, bukan
     sesuatu yang pantas dikarang diam-diam di klien. */
  let syncing = null;
  async function syncFromServer() {
    const uid = userId();
    if (!sbConfigured() || !uid) return { synced: false, reason: 'not-logged-in' };
    if (syncing) return syncing;                 // satu sinkronisasi saja pada satu waktu

    syncing = (async () => {
      const s = local();
      let ditarik = 0;
      try {
        const cats = await sbRest('ssw_categories?select=id,slug');
        const slugOf = {};
        (Array.isArray(cats) ? cats : []).forEach(c => { if (c && c.id) slugOf[c.id] = c.slug; });

        const rows = await sbRest('ssw_progress?user_id=eq.' + enc(uid) + '&select=*');
        (Array.isArray(rows) ? rows : []).forEach(r => {
          const key = r.item_kind + ':' + r.item_id;
          const lokal = s.progress[key];
          // Yang lebih baru menang; seri dimenangkan data lokal supaya
          // perubahan yang belum sempat terdorong tidak tertimpa.
          if (lokal && new Date(lokal.last_at || 0) >= new Date(r.last_at || 0)) return;
          s.progress[key] = {
            completed: Boolean(r.completed),
            score: r.score == null ? null : r.score,
            last_at: r.last_at,
            field: slugOf[r.category_id] || (lokal && lokal.field) || null,
            category_id: r.category_id || null,
          };
          ditarik++;
        });

        const favs = await sbRest('ssw_favorites?user_id=eq.' + enc(uid) + '&select=*');
        (Array.isArray(favs) ? favs : []).forEach(f => {
          const key = f.item_kind + ':' + f.item_id;
          if (!(key in s.favorites)) s.favorites[key] = f.label || '';
        });
        const remoteFav = new Set((Array.isArray(favs) ? favs : []).map(f => f.item_kind + ':' + f.item_id));
        Object.keys(s.favorites).forEach(key => {
          if (remoteFav.has(key)) return;
          const [kind, ...sisa] = key.split(':');
          pushFavorite(kind, sisa.join(':'), 'add', s.favorites[key]);
        });

        const exams = await sbRest('ssw_exam_results?user_id=eq.' + enc(uid) + '&select=*&order=created_at.desc&limit=50');
        const punya = new Set((s.exam_results || []).map(r => r.quiz_id + '|' + r.created_at));
        (Array.isArray(exams) ? exams : []).forEach(r => {
          if (punya.has(r.quiz_id + '|' + r.created_at)) return;
          s.exam_results = s.exam_results || [];
          s.exam_results.push({
            quiz_id: r.quiz_id, score: r.score, passed: r.passed,
            duration_s: r.duration_s, detail: r.detail || [],
            category_id: r.category_id || null,
            slug: slugOf[r.category_id] || null,
            created_at: r.created_at,
          });
        });
        s.exam_results = (s.exam_results || [])
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 50);

        saveLocal(s);
        return { synced: true, pulled: ditarik };
      } catch (e) {
        return { synced: false, reason: 'offline' };   // lokal tetap utuh
      } finally {
        syncing = null;
      }
    })();
    return syncing;
  }

  // Sesi baru = perangkat ini mungkin tertinggal. Auth.init() dipanggil di
  // dalam DOMContentLoaded oleh supabase-client.js, jadi pemeriksaan saat
  // muat harus menunggu dokumen siap — kalau tidak, sesinya selalu null.
  try {
    window.addEventListener('np:authChange', () => { syncFromServer(); });
    const saatSiap = () => { if (isLoggedIn()) syncFromServer(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', saatSiap);
    else saatSiap();
  } catch (e) { /* lingkungan tanpa DOM (unit test) */ }

  // Terakhir diakses (Continue Learning)
  function setLastAccessed(entry) {
    const s = local();
    s.last = { ...entry, at: new Date().toISOString() };
    saveLocal(s);
  }
  function getLastAccessed() { return local().last || null; }

  window.SSWAPI = {
    getCategories, getFieldTree, getItems, getQuiz,
    setFieldContext, getFieldContext,
    markProgress, getProgress, isCompleted, categorySummary,
    toggleFavorite, isFavorite, listFavorites,
    saveExamResult, listExamResults, syncFromServer,
    setLastAccessed, getLastAccessed,
  };
})();
