/**
 * Kontrak progres SSW — assets/ssw-api.js (Fase 1 platform SSW).
 * =================================================================
 * Memuat SUMBER ASLI lewat vm (pola scripts/tests/load-platform.js),
 * bukan salinan logika, supaya kontraknya tidak bisa diam-diam melenceng.
 *
 * BUG YANG DIJAGA DI SINI
 * categorySummary() dulu menyaring progres lewat prefiks key `slug:`,
 * padahal markProgress() tidak pernah menulis bentuk itu — semua key
 * berbentuk `kind:itemId`. Akibatnya filternya tidak pernah cocok dan
 * SETIAP progress bar bidang permanen 0% tanpa error apa pun: kelas bug
 * yang tidak akan pernah ditangkap validator maupun cek sintaks.
 *
 * Bentuk key sengaja dipertahankan `kind:itemId` agar cermin dengan
 * ssw_progress di Supabase (UNIQUE user_id,item_kind,item_id + kolom
 * category_id terpisah); bidang ikut disimpan sebagai properti nilai.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { LocalStorageMock } = require('./mock-dom');

// Bawaannya sumber asli. NP_SSW_API boleh menunjuk berkas lain — dipakai
// untuk membuktikan test ini benar-benar gagal terhadap versi berbugnya
// (pola env override yang sama dengan NP_PLATFORM=min di load-platform.js).
const SRC = process.env.NP_SSW_API || path.join(__dirname, '..', '..', 'assets', 'ssw-api.js');
const UUID_A = '11111111-2222-4333-8444-555555555555';

/* Memuat ssw-api.js segar. `env` mengatur apakah Supabase dianggap
   terkonfigurasi dan apakah user login; `fetchImpl` menyadap seluruh
   panggilan PostgREST sehingga push bisa diperiksa/ dibuat gagal. */
function load(opts = {}) {
  const localStorage = new LocalStorageMock();
  const calls = [];
  const fetchImpl = opts.fetch || (async () => ({
    ok: true, headers: { get: () => 'application/json' }, json: async () => [],
  }));

  const sandbox = {
    window: {},
    localStorage, console, Date, Math, JSON, Number, String, Boolean, Object, Array, RegExp, Error,
    encodeURIComponent,
    setTimeout,
    fetch: async (url, init) => { calls.push({ url: String(url), init }); return fetchImpl(url, init); },
  };
  sandbox.window.localStorage = localStorage;
  sandbox.window.EDUMA_ENV = opts.configured === false ? {} : {
    SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon',
  };
  sandbox.window.SupabaseClient = {
    Auth: {
      isLoggedIn: () => Boolean(opts.user),
      user: () => (opts.user ? { id: opts.user } : null),
      session: () => (opts.user ? { access_token: 'jwt' } : null),
    },
  };
  sandbox.window.NP_SSW_SEED = opts.seed || {};
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf-8'), sandbox, { filename: 'ssw-api.js' });
  if (!sandbox.window.SSWAPI) throw new Error('ssw-api.js tidak mengekspor window.SSWAPI');
  return { API: sandbox.window.SSWAPI, localStorage, calls };
}

const progressPushes = calls => calls.filter(c => c.url.includes('ssw_progress'));

/* fetch tiruan yang membalas per tabel. GET mengembalikan baris dari `tabel`;
   POST/DELETE (push) dibalas kosong supaya tidak ikut mengubah hasil tarikan. */
function rute(tabel) {
  return async (url, init) => {
    const u = String(url);
    const metode = (init && init.method) || 'GET';
    const nama = Object.keys(tabel).find(t => u.includes(t));
    const data = metode === 'GET' && nama ? tabel[nama] : [];
    return { ok: true, headers: { get: () => 'application/json' }, json: async () => data };
  };
}

const tests = [
  {
    name: 'categorySummary menghitung progres yang benar-benar ditulis markProgress (regresi bar 0% permanen)',
    fn: () => {
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });
      API.markProgress('lesson', 'l2', { completed: true });

      const sum = API.categorySummary('kaigo', { lesson: 4 });
      assert.strictEqual(sum.done.lesson, 2, 'dua lesson selesai harus terhitung');
      assert.strictEqual(sum.lesson, 50, '2 dari 4 lesson = 50%');
      assert.strictEqual(sum.percent, 50);
    },
  },
  {
    name: 'Progres satu bidang TIDAK bocor ke bidang lain',
    fn: () => {
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });
      API.markProgress('vocab', 'v1', { completed: true });

      API.setFieldContext('kensetsu');
      API.markProgress('lesson', 'l9', { completed: true });

      const kaigo = API.categorySummary('kaigo', { lesson: 2, vocab: 1 });
      const kensetsu = API.categorySummary('kensetsu', { lesson: 2, vocab: 1 });
      assert.strictEqual(kaigo.done.lesson, 1);
      assert.strictEqual(kaigo.done.vocab, 1);
      assert.strictEqual(kensetsu.done.lesson, 1);
      assert.strictEqual(kensetsu.done.vocab, 0, 'vocab kaigo tidak boleh terhitung di kensetsu');
    },
  },
  {
    name: 'Toggle selesai → batal selesai mengurangi hitungan, bukan menumpuk',
    fn: () => {
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });
      assert.strictEqual(API.isCompleted('lesson', 'l1'), true);
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 2 }).done.lesson, 1);

      API.markProgress('lesson', 'l1', { completed: false });
      assert.strictEqual(API.isCompleted('lesson', 'l1'), false);
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 2 }).done.lesson, 0);
    },
  },
  {
    name: 'Menyentuh ulang progres (last_at) tidak menghapus atribusi bidang',
    fn: () => {
      // Lesson.html & Vocabulary.html menulis ulang status yang SAMA hanya
      // untuk memperbarui last_at, kadang sebelum konteks bidang sempat ada.
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });

      API.setFieldContext(null);
      API.markProgress('lesson', 'l1', { completed: true });

      assert.strictEqual(API.categorySummary('kaigo', { lesson: 1 }).done.lesson, 1,
        'bidang asal harus bertahan walau konteks sedang kosong');
    },
  },
  {
    name: 'localStorage rusak tidak membuat API melempar — dianggap kosong lalu bisa ditulis lagi',
    fn: () => {
      const { API, localStorage } = load({ configured: false });
      localStorage.setItem('np-ssw-v1', '{bukan json');

      assert.strictEqual(API.getProgress('lesson', 'l1'), null);
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 3 }).done.lesson, 0);
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 3 }).done.lesson, 1);
    },
  },
  {
    name: 'percent dijepit 100% walau progres melebihi total (id kuis sintetis / konten dihapus admin)',
    fn: () => {
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });
      API.markProgress('lesson', 'l2', { completed: true });
      API.markProgress('lesson', 'l3', { completed: true });

      const sum = API.categorySummary('kaigo', { lesson: 1 });
      assert.strictEqual(sum.lesson, 100);
      assert.strictEqual(sum.percent, 100);
    },
  },
  {
    name: 'percent hanya membagi jenis yang totalnya > 0 (penyebut nol tidak menenggelamkan hasil)',
    fn: () => {
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });
      // vocab/kanji/grammar belum diisi admin → totalnya 0, tidak boleh
      // membuat lesson 1/1 tampak jadi 25%.
      const sum = API.categorySummary('kaigo', { lesson: 1, vocab: 0, kanji: 0, grammar: 0 });
      assert.strictEqual(sum.percent, 100);
    },
  },
  {
    name: 'listening & reading ikut terhitung (bukan diam-diam dibuang)',
    fn: () => {
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo');
      API.markProgress('listening', 'a1', { completed: true });
      API.markProgress('reading', 'r1', { completed: true });
      const sum = API.categorySummary('kaigo', { listening: 2, reading: 1 });
      assert.strictEqual(sum.done.listening, 1);
      assert.strictEqual(sum.done.reading, 1);
      assert.strictEqual(sum.reading, 100);
    },
  },

  // ── Sinkronisasi ke Supabase ────────────────────────────────────
  {
    name: 'Belum login: progres tetap tersimpan lokal dan TIDAK ada push',
    fn: () => {
      const { API, calls } = load({ user: null });
      API.setFieldContext('kaigo', UUID_A);
      API.markProgress('lesson', 'l1', { completed: true });
      assert.strictEqual(API.isCompleted('lesson', 'l1'), true);
      assert.strictEqual(progressPushes(calls).length, 0, 'tanpa user id tidak boleh menembak DB');
    },
  },
  {
    name: 'Login: push membawa category_id saat uuid bidang diketahui',
    fn: async () => {
      const { API, calls } = load({ user: 'user-1' });
      API.setFieldContext('kaigo', UUID_A);
      API.markProgress('lesson', 'l1', { completed: true });
      await new Promise(r => setTimeout(r, 0));

      const push = progressPushes(calls)[0];
      assert.ok(push, 'harus ada satu push ssw_progress');
      const body = JSON.parse(push.init.body);
      assert.strictEqual(body.item_kind, 'lesson');
      assert.strictEqual(body.item_id, 'l1');
      assert.strictEqual(body.category_id, UUID_A);
    },
  },
  {
    name: 'Mode seed (bidang tanpa uuid): category_id TIDAK dikirim, bukan dikirim sebagai slug',
    fn: async () => {
      // ssw_progress.category_id bertipe uuid — mengirim "kaigo" membuat
      // Postgres menolak SELURUH baris, jadi progresnya batal tersinkron
      // demi kolom yang cuma pelengkap.
      const { API, calls } = load({ user: 'user-1' });
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });
      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse(progressPushes(calls)[0].init.body);
      assert.ok(!('category_id' in body), 'slug tidak boleh masuk kolom uuid');
      assert.strictEqual(body.item_id, 'l1', 'progresnya sendiri tetap terkirim');
    },
  },
  {
    name: 'Push gagal lalu berhasil: kegagalan tidak merusak data lokal, penulisan berikutnya tetap terkirim',
    fn: async () => {
      let fail = true;
      const { API, calls } = load({
        user: 'user-1',
        fetch: async () => {
          if (fail) throw new Error('offline');
          return { ok: true, headers: { get: () => 'application/json' }, json: async () => [] };
        },
      });

      API.setFieldContext('kaigo', UUID_A);
      API.markProgress('lesson', 'l1', { completed: true });
      await new Promise(r => setTimeout(r, 0));
      assert.strictEqual(API.isCompleted('lesson', 'l1'), true, 'push gagal tidak boleh membatalkan progres lokal');

      fail = false;
      API.markProgress('lesson', 'l2', { completed: true });
      await new Promise(r => setTimeout(r, 0));
      assert.strictEqual(progressPushes(calls).length, 2, 'percobaan kedua tetap dikirim setelah pulih');
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 2 }).done.lesson, 2);
    },
  },

  // ── Migrasi entri lama ──────────────────────────────────────────
  {
    name: 'Migrasi: progres lama tanpa `field` dipulihkan bila id-nya memuat slug bidang',
    fn: () => {
      const seed = { categories: [{ slug: 'kaigo' }, { slug: 'kensetsu' }] };
      const { API, localStorage } = load({ configured: false, seed });
      localStorage.setItem('np-ssw-v1', JSON.stringify({
        progress: {
          'lesson:l-kaigo-1': { completed: true, score: null, last_at: 'x' },
          'quiz:kaigo-vocab': { completed: true, score: 80, last_at: 'x' },
          'lesson:l-kensetsu-2': { completed: true, score: null, last_at: 'x' },
        },
      }));

      assert.strictEqual(API.categorySummary('kaigo', { lesson: 1, quiz: 1 }).done.lesson, 1);
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 1, quiz: 1 }).done.quiz, 1);
      assert.strictEqual(API.categorySummary('kensetsu', { lesson: 1 }).done.lesson, 1);
      assert.strictEqual(API.categorySummary('kensetsu', { lesson: 1 }).done.quiz, 0,
        'progres kaigo tidak boleh berpindah ke kensetsu');
    },
  },
  {
    name: 'Migrasi TIDAK menebak: id yang tidak memuat slug dibiarkan tanpa bidang',
    fn: () => {
      // 'v1' dan uuid DB tidak menyimpan bidangnya di mana pun. Menebaknya
      // berarti memindahkan progres orang ke bidang yang salah.
      const seed = { categories: [{ slug: 'kaigo' }, { slug: 'kensetsu' }] };
      const { API, localStorage } = load({ configured: false, seed });
      localStorage.setItem('np-ssw-v1', JSON.stringify({
        progress: {
          'vocab:v1': { completed: true, score: null, last_at: 'x' },
          'lesson:11111111-2222-4333-8444-555555555555': { completed: true, score: null, last_at: 'x' },
        },
      }));
      assert.strictEqual(API.categorySummary('kaigo', { vocab: 1, lesson: 1 }).done.vocab, 0);
      assert.strictEqual(API.categorySummary('kensetsu', { vocab: 1, lesson: 1 }).done.vocab, 0);
      assert.strictEqual(API.isCompleted('vocab', 'v1'), true, 'tanda selesainya sendiri tetap utuh');
    },
  },
  {
    name: 'Migrasi tidak menimpa bidang yang sudah benar dan tidak mengulang terus-menerus',
    fn: () => {
      const seed = { categories: [{ slug: 'kaigo' }, { slug: 'kensetsu' }] };
      const { API, localStorage } = load({ configured: false, seed });
      // Entri ini ber-id kaigo tapi sudah terlanjur tercatat di kensetsu —
      // migrasi tidak boleh ikut campur pada yang sudah punya field.
      localStorage.setItem('np-ssw-v1', JSON.stringify({
        progress: { 'lesson:l-kaigo-1': { completed: true, score: null, last_at: 'x', field: 'kensetsu' } },
      }));
      assert.strictEqual(API.categorySummary('kensetsu', { lesson: 1 }).done.lesson, 1);
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 1 }).done.lesson, 0);
      assert.strictEqual(JSON.parse(localStorage.getItem('np-ssw-v1')).migrated_field, true,
        'ditandai supaya tidak dijalankan berulang tiap pembacaan');
    },
  },

  // ── Fallback seed ───────────────────────────────────────────────
  {
    name: 'Bidang terdaftar tapi belum ada kontennya tetap mengembalikan category (bukan "tidak ditemukan")',
    fn: async () => {
      // seed.fields hanya mengisi sebagian bidang; sisanya terdaftar di
      // seed.categories tanpa konten. Dashboard-nya harus menampilkan nama
      // bidang + keadaan kosong, bukan seolah tautannya rusak.
      const seed = {
        categories: [{ slug: 'kaigo', name_jp: '介護' }, { slug: 'kensetsu', name_jp: '建設' }],
        fields: { kaigo: { slug: 'kaigo', modules: [{ id: 'm1', ssw_lessons: [{ id: 'l1' }] }] } },
      };
      const { API } = load({ configured: false, seed });

      const kaigo = await API.getFieldTree('kaigo');
      assert.strictEqual(kaigo.category.slug, 'kaigo');
      assert.strictEqual(kaigo.modules.length, 1, 'bidang dengan konten tetap membawa modulnya');

      const kensetsu = await API.getFieldTree('kensetsu');
      assert.ok(kensetsu.category, 'bidang tanpa konten tetap harus punya category');
      assert.strictEqual(kensetsu.category.name_jp, '建設');
      assert.strictEqual(kensetsu.modules.length, 0);

      const asing = await API.getFieldTree('bidang-tidak-ada');
      assert.strictEqual(asing.category, null, 'slug yang benar-benar asing tetap null');
    },
  },
  {
    name: 'Konten seed dibaca per bidang dari seed.fields — tidak bocor ke bidang lain',
    fn: async () => {
      // Dulu seed hanya punya satu `field` (kaigo). Dengan fields per slug,
      // tiap bidang wajib membaca entrinya sendiri.
      const seed = {
        categories: [{ slug: 'kaigo' }, { slug: 'kensetsu' }, { slug: 'nougyou' }],
        fields: {
          kaigo: { slug: 'kaigo', modules: [], vocabulary: [{ id: 'v1' }, { id: 'v2' }] },
          kensetsu: { slug: 'kensetsu', modules: [{ id: 'mk', ssw_lessons: [] }], vocabulary: [{ id: 'kv1' }] },
        },
      };
      const { API } = load({ configured: false, seed });

      assert.deepStrictEqual((await API.getItems('kaigo', 'vocabulary')).items.map(v => v.id), ['v1', 'v2']);
      assert.deepStrictEqual((await API.getItems('kensetsu', 'vocabulary')).items.map(v => v.id), ['kv1']);
      assert.strictEqual((await API.getFieldTree('kensetsu')).modules[0].id, 'mk');
      // .length, bukan deepStrictEqual: array kosong dibuat di realm vm
      assert.strictEqual((await API.getItems('nougyou', 'vocabulary')).items.length, 0, 'bidang tanpa konten → kosong');
      assert.strictEqual((await API.getItems('kaigo', 'kanji')).items.length, 0, 'jenis yang tidak ada → kosong');
    },
  },

  // ── Sinkronisasi dua arah ───────────────────────────────────────
  {
    name: 'Sync menarik progres server DAN memulihkan bidang lewat category_id',
    fn: async () => {
      // Inti perangkat-kedua: baris remote hanya menyimpan uuid bidang.
      // Tanpa pemetaan id→slug, progres yang ditarik tidak akan terhitung
      // di ringkasan bidang mana pun.
      const { API } = load({ user: 'u1', fetch: rute({
        ssw_categories: [{ id: UUID_A, slug: 'kaigo' }],
        ssw_progress: [
          { item_kind: 'lesson', item_id: 'l1', completed: true, score: null, last_at: '2026-01-02T00:00:00Z', category_id: UUID_A },
          { item_kind: 'vocab', item_id: 'v9', completed: true, score: null, last_at: '2026-01-02T00:00:00Z', category_id: UUID_A },
        ],
      }) });

      const hasil = await API.syncFromServer();
      assert.strictEqual(hasil.synced, true);
      assert.strictEqual(hasil.pulled, 2);
      assert.strictEqual(API.isCompleted('lesson', 'l1'), true);
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 1, vocab: 1 }).done.lesson, 1,
        'bidang harus pulih dari category_id, bukan hilang');
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 1, vocab: 1 }).done.vocab, 1);
    },
  },
  {
    name: 'Sync: yang last_at-nya lebih baru menang, seri dimenangkan data lokal',
    fn: async () => {
      const { API, localStorage } = load({ user: 'u1', fetch: rute({
        ssw_categories: [{ id: UUID_A, slug: 'kaigo' }],
        ssw_progress: [
          // Remote lebih tua → kalah dari lokal.
          { item_kind: 'lesson', item_id: 'lama', completed: false, last_at: '2026-01-01T00:00:00Z', category_id: UUID_A },
          // Remote lebih baru → menang.
          { item_kind: 'lesson', item_id: 'baru', completed: true, last_at: '2026-06-01T00:00:00Z', category_id: UUID_A },
        ],
      }) });
      localStorage.setItem('np-ssw-v1', JSON.stringify({
        migrated_field: true,
        progress: {
          'lesson:lama': { completed: true, score: null, last_at: '2026-03-01T00:00:00Z', field: 'kaigo' },
          'lesson:baru': { completed: false, score: null, last_at: '2026-02-01T00:00:00Z', field: 'kaigo' },
        },
      }));

      await API.syncFromServer();
      assert.strictEqual(API.isCompleted('lesson', 'lama'), true, 'lokal lebih baru harus bertahan');
      assert.strictEqual(API.isCompleted('lesson', 'baru'), true, 'remote lebih baru harus menimpa');
    },
  },
  {
    name: 'Sync tidak berjalan saat belum login, dan tidak merusak data lokal',
    fn: async () => {
      const { API, calls } = load({ user: null });
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });

      const hasil = await API.syncFromServer();
      assert.strictEqual(hasil.synced, false);
      assert.strictEqual(hasil.reason, 'not-logged-in');
      assert.strictEqual(API.isCompleted('lesson', 'l1'), true);
      assert.strictEqual(calls.filter(c => c.url.includes('ssw_categories')).length, 0, 'tidak menembak DB sama sekali');
    },
  },
  {
    name: 'Sync gagal (offline) tidak menghapus progres lokal',
    fn: async () => {
      const { API } = load({ user: 'u1', fetch: async () => { throw new Error('offline'); } });
      API.setFieldContext('kaigo');
      API.markProgress('lesson', 'l1', { completed: true });

      const hasil = await API.syncFromServer();
      assert.strictEqual(hasil.synced, false);
      assert.strictEqual(hasil.reason, 'offline');
      assert.strictEqual(API.isCompleted('lesson', 'l1'), true, 'data lokal wajib utuh setelah sync gagal');
      assert.strictEqual(API.categorySummary('kaigo', { lesson: 1 }).done.lesson, 1);
    },
  },
  {
    name: 'Sync favorit: union, dan favorit yang hanya ada lokal ikut didorong naik',
    fn: async () => {
      const { API, calls } = load({ user: 'u1', fetch: rute({
        ssw_categories: [{ id: UUID_A, slug: 'kaigo' }],
        ssw_favorites: [{ item_kind: 'vocab', item_id: 'dari-server', label: 'S' }],
      }) });
      API.toggleFavorite('vocab', 'hanya-lokal', 'L');

      await API.syncFromServer();
      const ids = API.listFavorites().map(f => f.id).sort();
      assert.deepStrictEqual(ids, ['dari-server', 'hanya-lokal'], 'kedua sisi harus bertemu');
      const naik = calls.filter(c => c.url.includes('ssw_favorites') && c.init && c.init.method === 'POST');
      assert.ok(naik.some(c => String(c.init.body).includes('hanya-lokal')), 'favorit lokal harus didorong ke server');
    },
  },
  {
    name: 'Sync riwayat ujian: digabung tanpa duplikat dan tetap urut terbaru dulu',
    fn: async () => {
      const { API } = load({ user: 'u1', fetch: rute({
        ssw_categories: [{ id: UUID_A, slug: 'kaigo' }],
        ssw_exam_results: [
          { quiz_id: null, score: 70, passed: true, duration_s: 60, created_at: '2026-05-01T00:00:00Z', category_id: UUID_A },
          { quiz_id: null, score: 30, passed: false, duration_s: 60, created_at: '2026-01-01T00:00:00Z', category_id: UUID_A },
        ],
      }) });
      API.setFieldContext('kaigo', UUID_A);
      await API.saveExamResult({ score: 55, passed: false, duration_s: 10 });

      await API.syncFromServer();
      const hasil = API.listExamResults('kaigo');
      assert.strictEqual(hasil.length, 3, 'hasil lokal + 2 dari server');
      assert.strictEqual(hasil[0].score, 55, 'yang paling baru tetap di depan');

      await API.syncFromServer();   // sinkronisasi kedua tidak boleh menggandakan
      assert.strictEqual(API.listExamResults('kaigo').length, 3);
    },
  },

  // ── Hasil ujian ─────────────────────────────────────────────────
  {
    name: 'saveExamResult mencap bidang aktif sehingga listExamResults(slug) menyaring dengan benar',
    fn: async () => {
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo', UUID_A);
      await API.saveExamResult({ score: 80, passed: true, duration_s: 120 });

      API.setFieldContext('kensetsu');
      await API.saveExamResult({ score: 40, passed: false, duration_s: 90 });

      assert.strictEqual(API.listExamResults('kaigo').length, 1);
      assert.strictEqual(API.listExamResults('kaigo')[0].score, 80);
      assert.strictEqual(API.listExamResults('kensetsu').length, 1);
      assert.strictEqual(API.listExamResults().length, 2, 'tanpa slug = semua hasil');
    },
  },
  {
    name: 'listExamResults mengembalikan yang TERBARU lebih dulu (dasar "Skor terakhir" di Progress.html)',
    fn: async () => {
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo');
      await API.saveExamResult({ score: 40, passed: false, title: 'lama' });
      await API.saveExamResult({ score: 90, passed: true, title: 'baru' });

      const hasil = API.listExamResults('kaigo');
      assert.strictEqual(hasil[0].title, 'baru', 'indeks 0 harus percobaan terakhir');
      assert.strictEqual(hasil[0].score, 90);
      // "Skor terbaik" dihitung dari seluruh riwayat, bukan hanya yang terakhir.
      assert.strictEqual(Math.max.apply(null, hasil.map(h => h.score)), 90);
    },
  },
  {
    name: 'Riwayat ujian dibatasi 50 entri terakhir supaya localStorage tidak tumbuh tanpa batas',
    fn: async () => {
      const { API } = load({ configured: false });
      API.setFieldContext('kaigo');
      for (let i = 0; i < 55; i++) await API.saveExamResult({ score: i, passed: true, title: 'ke-' + i });
      const hasil = API.listExamResults();
      assert.strictEqual(hasil.length, 50);
      assert.strictEqual(hasil[0].title, 'ke-54', 'yang terbaru tetap dipertahankan');
    },
  },
  {
    name: 'saveExamResult: quiz_id non-uuid tidak dikirim ke kolom uuid',
    fn: async () => {
      const { API, calls } = load({ user: 'user-1' });
      API.setFieldContext('kaigo', UUID_A);
      await API.saveExamResult({ quiz_id: 'kaigo-vocab', score: 70, passed: true });

      const push = calls.filter(c => c.url.includes('ssw_exam_results'))[0];
      assert.ok(push, 'hasil ujian harus dicoba dikirim');
      const body = JSON.parse(push.init.body);
      assert.strictEqual(body.quiz_id, null);
      assert.strictEqual(body.category_id, UUID_A);
      assert.strictEqual(body.score, 70);
    },
  },
];

module.exports = { tests };
