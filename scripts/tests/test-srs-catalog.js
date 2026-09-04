/**
 * Test suite: Katalog kartu SRS (assets/srs-catalog.js)
 * =====================================================
 * Katalog memecah assets/srs-cards-data.js (7,14 MB, <script> sinkron) jadi
 * inti eager (assets/srs/core.js) + 18 shard JMdict lazy. Refactor ini WAJIB
 * mempertahankan perilaku, jadi hampir semua tes di sini membandingkan
 * keluaran katalog dengan hasil EKSPRESI LAMA yang dijalankan atas array
 * penuh yang direkonstruksi dari sumber aslinya — bukan dengan angka
 * yang ditulis tangan.
 *
 * Yang dijaga secara khusus:
 *  - tidak ada kartu yang hilang atau berubah bentuk (tes "deep-equal penuh");
 *  - hitungan filter identik;
 *  - tiga kuirk `undefined` pada statistik (nextReview/reps/lastRating);
 *  - urutan array tetap kurasi → inti → ekor → kustom, karena NPCap.trim
 *    peka urutan;
 *  - shard hanya diminta untuk filter yang benar-benar membutuhkannya.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { LocalStorageMock } = require('./mock-dom');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function plain(x) { return JSON.parse(JSON.stringify(x)); }

const ROOT = path.join(__dirname, '..', '..');
const ASSETS = path.join(ROOT, 'assets');
const SRS_DIR = path.join(ASSETS, 'srs');
const EXAMPLE_SUFFIX = 'を覚えましょう。';

// ── sumber kebenaran: array penuh persis seperti yang dibangun kode LAMA ──
let _oldCards = null;
function oldFullCards() {
  if (_oldCards) return _oldCards;
  const src = fs.readFileSync(path.join(ASSETS, 'srs-cards-data.js'), 'utf8');
  const start = src.indexOf('[', src.indexOf('SRS_CARDS_RAW'));
  const end = src.indexOf('];', start);
  const raw = JSON.parse(src.slice(start, end + 1));
  // .map() yang sama persis dengan srs-cards-data.js
  const bulk = raw.map(c => ({
    id: c[0], type: 'VOCAB', jp: c[1], reading: c[2], meaning: c[3],
    example: c[1] + EXAMPLE_SUFFIX, cat: c[4], jlpt: c[5]
  }));
  _oldCards = { raw, bulk, curated: loadCurated() };
  return _oldCards;
}

function loadCurated() {
  const src = fs.readFileSync(path.join(ASSETS, 'srs-curated.js'), 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.SRS_CURATED || [];
}

/** fetch palsu yang membaca shard dari disk (mengabaikan ?v=). */
function diskFetch(opts) {
  opts = opts || {};
  return function (url) {
    if (opts.fail) return Promise.reject(new Error('jaringan mati'));
    const name = String(url).split('/').pop().split('?')[0];
    const p = path.join(SRS_DIR, name);
    if (opts.html) {
      // Simulasi service worker yang membalas offline.html berstatus 200.
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      });
    }
    if (!fs.existsSync(p)) return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
    const body = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (opts.corrupt) body.start = body.start + 1;   // start tidak sesuai
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  };
}

function loadCatalog(deps, fetchOpts) {
  const coreSrc = fs.readFileSync(path.join(SRS_DIR, 'core.js'), 'utf8');
  const catSrc = fs.readFileSync(path.join(ASSETS, 'srs-catalog.js'), 'utf8');
  const localStorage = new LocalStorageMock();
  const sandbox = { window: {}, localStorage, console, Promise, JSON, Math, Date };
  vm.createContext(sandbox);
  vm.runInContext(coreSrc, sandbox);          // isi SRS_CORE_META + SRS_CORE_RAW
  vm.runInContext(catSrc, sandbox);           // isi window.NPCatalog
  const C = sandbox.window.NPCatalog;
  assert.ok(C, 'srs-catalog.js tidak mengekspor window.NPCatalog');
  C.init(Object.assign({
    curated: loadCurated(),
    custom: [],
    storage: localStorage,
    fetch: diskFetch(fetchOpts),
    baseUrl: '',
  }, deps || {}));
  return { C, localStorage, sandbox };
}

// ═══ 1. hitungan filter identik dengan ekspresi lama ═══

test('counts() sama persis dengan ekspresi filter lama atas array penuh', () => {
  const { C } = loadCatalog();
  const { bulk, curated } = oldFullCards();
  const full = curated.concat(bulk);           // urutan lama: kurasi ++ bulk
  const got = C.counts();

  assert.strictEqual(got.all, full.length, 'all');
  assert.strictEqual(got.n5, full.filter(c => c.jlpt === 'N5').length, 'n5');
  assert.strictEqual(got.n4, full.filter(c => c.jlpt === 'N4').length, 'n4');
  assert.strictEqual(got.n3, full.filter(c => c.jlpt === 'N3').length, 'n3');
  assert.strictEqual(got.n2, full.filter(c => c.jlpt === 'N2').length, 'n2');
  assert.strictEqual(got.n1, full.filter(c => c.jlpt === 'N1').length, 'n1');
  assert.strictEqual(got.kaigo, full.filter(c => c.cat === 'kaigo').length, 'kaigo');
  assert.strictEqual(got.kanji, full.filter(c => c.type === 'KANJI').length, 'kanji');
  assert.strictEqual(got.grammar, full.filter(c => c.type === 'GRAMMAR').length, 'grammar');
  assert.strictEqual(got.jmdict, full.filter(c => c.cat === 'jmdict').length, 'jmdict');
  assert.strictEqual(got.vocab, full.filter(c => c.cat === 'vocab').length, 'vocab');
  assert.strictEqual(got.kustom, full.filter(c => String(c.id).indexOf('cust') === 0).length, 'kustom');
});

test('levelTotals() cocok dengan total chart JLPT lama', () => {
  const { C } = loadCatalog();
  const { bulk, curated } = oldFullCards();
  const full = curated.concat(bulk);
  const got = plain(C.levelTotals());
  ['N5', 'N4', 'N3', 'N2', 'N1'].forEach(lv => {
    assert.strictEqual(got[lv], full.filter(c => c.jlpt === lv).length, lv);
  });
});

// ═══ 2. tidak ada data hilang / berubah bentuk ═══

test('setelah loadAll(): 100.520 kartu, setiap kartu deep-equal bentuk lama', async () => {
  const { C } = loadCatalog();
  await C.loadAll();
  const got = C.cards();
  const { bulk, curated } = oldFullCards();

  assert.strictEqual(got.length, curated.length + bulk.length,
    'jumlah kartu berubah: ' + got.length + ' vs ' + (curated.length + bulk.length));

  // Urutan kanonis: kurasi dulu, lalu seluruh bulk (inti + ekor) berurutan.
  for (let i = 0; i < curated.length; i++) {
    assert.strictEqual(got[i].id, curated[i].id, 'kartu kurasi ke-' + i + ' bergeser');
  }
  // Bandingkan SEMUA kartu bulk, delapan field, tanpa sampling.
  for (let i = 0; i < bulk.length; i++) {
    const a = got[curated.length + i];
    const b = bulk[i];
    if (a.id !== b.id || a.jp !== b.jp || a.reading !== b.reading || a.meaning !== b.meaning ||
        a.example !== b.example || a.cat !== b.cat || a.jlpt !== b.jlpt || a.type !== b.type) {
      assert.fail('kartu bulk ke-' + i + ' berbeda:\n  dapat   ' + JSON.stringify(a) +
                  '\n  harusnya ' + JSON.stringify(b));
    }
  }
});

test('cards() selalu objek array yang SAMA meski shard menyusul', async () => {
  const { C } = loadCatalog();
  const before = C.cards();
  const lenBefore = before.length;
  await C.loadShards([0, 1]);
  assert.strictEqual(C.cards(), before, 'identitas array berubah — pemanggil lama akan memegang array basi');
  assert.ok(C.cards().length > lenBefore, 'shard tidak masuk ke array');
});

test('sebelum shard dimuat, katalog berisi kurasi + inti saja', () => {
  const { C } = loadCatalog();
  const { curated } = oldFullCards();
  assert.strictEqual(C.cards().length, curated.length + C.meta().coreCount);
});

// ═══ 3. tiga kuirk `undefined` pada statistik ═══

const QUIRK_STATE = {
  v00001: { reps: 8, nextReview: 9e15, lastRating: 3 },   // jauh di masa depan
  v00002: { reps: 6, nextReview: 1, lastRating: 2 },      // sudah lewat
  v00004: { reps: 0, nextReview: 1, lastRating: 0 },      // KUIRK reps === 0
  v00005: { reps: 3, lastRating: 2 },                     // KUIRK nextReview undefined
  v00006: { reps: 2, nextReview: 9e15 },                  // KUIRK lastRating undefined
  zzTidakAda: { reps: 9, nextReview: 1, lastRating: 3 },  // id di luar katalog
};

function oldStats(full, stored, now) {
  const ids = full.map(c => c.id);
  const rated = ids.filter(id => stored[id] && stored[id].lastRating !== null);
  const good = rated.filter(id => stored[id].lastRating >= 2).length;
  return {
    due: ids.filter(id => { const s = stored[id]; return !s || s.nextReview <= now; }).length,
    neu: ids.filter(id => !stored[id] || !stored[id].reps).length,
    learned: ids.filter(id => stored[id] && stored[id].reps > 0).length,
    retention: rated.length ? Math.round(good / rated.length * 100) : null,
  };
}

test('dueCount/newCount/learnedCount/retention cocok dengan ekspresi lama (termasuk kuirk undefined)', () => {
  const { C } = loadCatalog();
  const { bulk, curated } = oldFullCards();
  const full = curated.concat(bulk);
  const now = 1000000;
  const exp = oldStats(full, QUIRK_STATE, now);

  assert.strictEqual(C.dueCount(QUIRK_STATE, now), exp.due, 'due');
  assert.strictEqual(C.newCount(QUIRK_STATE), exp.neu, 'new');
  assert.strictEqual(C.learnedCount(QUIRK_STATE), exp.learned, 'learned');
  assert.strictEqual(C.retention(QUIRK_STATE), exp.retention, 'retention');
});

test('nextReview undefined dihitung TIDAK jatuh tempo (bukan `> now`)', () => {
  const { C } = loadCatalog();
  const base = C.dueCount({}, 1000);
  const withUndef = C.dueCount({ v00005: { reps: 1, lastRating: 1 } }, 1000);
  assert.strictEqual(withUndef, base - 1,
    'kartu dengan nextReview undefined seharusnya keluar dari hitungan jatuh tempo');
});

test('id di luar katalog dalam stored tidak mengubah hitungan', () => {
  const { C } = loadCatalog();
  const a = C.dueCount({}, 1000);
  const b = C.dueCount({ zzTidakAda: { reps: 5, nextReview: 9e15, lastRating: 3 } }, 1000);
  assert.strictEqual(a, b);
});

// ═══ 4. has() / metaOf() ═══

test('has() tepat: kurasi ∪ v00001..v100000 ∪ kustom', () => {
  const { C } = loadCatalog({ custom: [{ id: 'cust-1', jp: 'x', reading: 'x', meaning: 'x', cat: 'custom' }] });
  const { curated } = oldFullCards();
  assert.ok(C.has(curated[0].id), 'kartu kurasi pertama');
  assert.ok(C.has('v00001'), 'bulk pertama');
  assert.ok(C.has('v12783'), 'batas inti/ekor');
  assert.ok(C.has('v100000'), 'bulk terakhir');
  assert.ok(C.has('cust-1'), 'kartu kustom');
  assert.ok(!C.has('v100001'), 'melewati batas atas');
  assert.ok(!C.has('v00000'), 'indeks nol');
  assert.ok(!C.has('tidak-ada'), 'id sembarang');
});

test('metaOf() cocok dengan sumber untuk id inti DAN id ekor tanpa memuat shard', () => {
  const { C } = loadCatalog();
  const { raw } = oldFullCards();
  const samples = [0, 1, 5000, 12782, 12783, 50000, 99999];
  samples.forEach(idx => {
    const id = 'v' + String(idx + 1).padStart(5, '0');
    const m = C.metaOf(id);
    assert.ok(m, 'metaOf null untuk ' + id);
    assert.strictEqual(m.cat, raw[idx][4], 'cat ' + id);
    assert.strictEqual(m.jlpt, raw[idx][5], 'jlpt ' + id);
    assert.strictEqual(m.type, 'VOCAB', 'type ' + id);
  });
  assert.ok(!C.tailReady(), 'metaOf tidak boleh memicu pemuatan shard');
});

test('get() null untuk id ekor sebelum shard dimuat, terisi sesudahnya', async () => {
  const { C } = loadCatalog();
  const { raw } = oldFullCards();
  assert.strictEqual(C.get('v50000'), null, 'seharusnya belum ada');
  await C.loadShards(C.shardsFor(['v50000']));
  const c = C.get('v50000');
  assert.ok(c, 'setelah shard dimuat harus ada');
  assert.strictEqual(c.jp, raw[49999][1]);
  assert.strictEqual(c.reading, raw[49999][2]);
  assert.strictEqual(c.meaning, raw[49999][3]);
  assert.strictEqual(c.example, raw[49999][1] + EXAMPLE_SUFFIX);
});

// ═══ 5. shard hanya diminta bila perlu ═══

test('shardsNeededFor(): filter yang tertutup inti tidak meminta shard', () => {
  const { C } = loadCatalog();
  const caps = { n5: 20, n4: 15, n3: 10, n2: 5, n1: 3, lain: 20 };
  ['n5', 'n4', 'n3', 'n2', 'n1', 'kaigo', 'kanji', 'grammar', 'vocab', 'kustom', 'bookmark']
    .forEach(f => {
      assert.deepStrictEqual(plain(C.shardsNeededFor(f, {}, caps)), [], 'filter ' + f);
    });
});

test('shardsNeededFor(): jmdict & due meminta seluruh 18 shard', () => {
  const { C } = loadCatalog();
  const caps = { lain: 20 };
  assert.strictEqual(C.shardsNeededFor('jmdict', {}, caps).length, 18);
  assert.strictEqual(C.shardsNeededFor('due', {}, caps).length, 18);
});

test('shardsNeededFor("all"): kosong dengan kuota terbatas, 18 saat lain=0', () => {
  const { C } = loadCatalog();
  assert.deepStrictEqual(plain(C.shardsNeededFor('all', {}, { lain: 20 })), [],
    'kuota terbatas: deck default seluruhnya dari inti');
  assert.strictEqual(C.shardsNeededFor('all', {}, { lain: 0 }).length, 18,
    'kuota 0 = tak terbatas, ekor ikut ditarik');
});

test('shardsNeededFor("all") menarik shard kartu ekor yang PERNAH diulas', () => {
  const { C } = loadCatalog();
  const need = C.shardsNeededFor('all', { v50000: { reps: 4 } }, { lain: 20 });
  assert.deepStrictEqual(plain(need), plain(C.shardsFor(['v50000'])));
  assert.strictEqual(need.length, 1, 'cukup satu shard, bukan semuanya');
});

test('shardsFor() mengabaikan id inti dan id non-katalog', () => {
  const { C } = loadCatalog();
  assert.deepStrictEqual(plain(C.shardsFor(['v00001', 'v12000', 'tidak-ada'])), []);
});

// ═══ 6. urutan tetap aman untuk NPCap.trim ═══

test('NPCap.trim menghasilkan histogram bucket yang sama dengan array lama', async () => {
  const capSrc = fs.readFileSync(path.join(ASSETS, 'srs-cap.js'), 'utf8');
  const capBox = { window: {}, localStorage: new LocalStorageMock(), console };
  vm.createContext(capBox);
  vm.runInContext(capSrc, capBox);
  const NPCap = capBox.window.NPCap;

  const { C } = loadCatalog();
  await C.loadAll();
  const { bulk, curated } = oldFullCards();
  const oldArr = curated.concat(bulk);

  const caps = plain(NPCap.DEFAULTS);
  const stored = {};
  // arg keempat trim() adalah data "hari ini" (dibaca lewat usedToday →
  // today.newByLevel), bukan peta pemakaian mentah.
  const today = { reviewed: [], new: 0, review: 0, newByLevel: {} };

  const hist = (deck) => {
    const h = { n5: 0, n4: 0, n3: 0, n2: 0, n1: 0, lain: 0 };
    deck.forEach(c => { h[NPCap.bucketOf(c)]++; });
    return h;
  };

  const a = hist(NPCap.trim(C.cards(), stored, caps, today));
  const b = hist(NPCap.trim(oldArr, stored, caps, today));
  assert.deepStrictEqual(plain(a), plain(b),
    'komposisi deck berubah — urutan katalog tidak setara dengan urutan lama');
});

// ═══ 7. degradasi & kegagalan jaringan ═══

test('tanpa core.js: jatuh ke kurasi saja, tidak melempar (seperti kegagalan lama)', () => {
  const catSrc = fs.readFileSync(path.join(ASSETS, 'srs-catalog.js'), 'utf8');
  const sandbox = { window: {}, localStorage: new LocalStorageMock(), console, Promise, JSON, Math, Date };
  vm.createContext(sandbox);
  vm.runInContext(catSrc, sandbox);
  const C = sandbox.window.NPCatalog;
  const curated = loadCurated();
  C.init({ curated, custom: [], storage: sandbox.localStorage, meta: null, raw: null });
  assert.ok(C.isDegraded(), 'harus menandai dirinya degraded');
  assert.strictEqual(C.cards().length, curated.length, 'deck kurasi tetap tersedia');
  assert.deepStrictEqual(plain(C.shardsNeededFor('jmdict', {}, { lain: 20 })), [],
    'degraded tidak boleh mencoba fetch');
});

test('shard gagal (jaringan mati) menolak promise, katalog tetap utuh', async () => {
  const { C } = loadCatalog(null, { fail: true });
  const lenBefore = C.cards().length;
  let threw = false;
  try { await C.loadShards([0]); } catch (e) { threw = true; }
  assert.ok(threw, 'kegagalan jaringan harus terlihat oleh pemanggil');
  assert.strictEqual(C.cards().length, lenBefore, 'katalog tidak boleh rusak');
});

test('respons offline.html berstatus 200 ditolak, bukan diterima sebagai data', async () => {
  const { C } = loadCatalog(null, { html: true });
  let threw = false;
  try { await C.loadShards([0]); } catch (e) { threw = true; }
  assert.ok(threw, 'HTML berstatus 200 dari service worker harus ditolak');
  assert.ok(!C.tailReady());
});

test('shard dengan start tidak sesuai ditolak (validasi bentuk, bukan cuma res.ok)', async () => {
  const { C } = loadCatalog(null, { corrupt: true });
  let threw = false;
  try { await C.loadShards([0]); } catch (e) { threw = true; }
  assert.ok(threw, 'start yang tidak cocok harus ditolak');
});

// ═══ 8. kartu kustom ═══

test('addCustom() menambah kartu di AKHIR dan menaikkan hitungan kustom', () => {
  const { C } = loadCatalog();
  const before = C.counts().kustom;
  const n = C.cards().length;
  C.addCustom({ id: 'cust-99', type: 'VOCAB', jp: 'テスト', reading: 'てすと', meaning: 'tes', example: '', cat: 'custom', jlpt: '' });
  assert.strictEqual(C.counts().kustom, before + 1);
  assert.strictEqual(C.cards().length, n + 1);
  assert.strictEqual(C.cards()[C.cards().length - 1].id, 'cust-99', 'kustom harus di akhir');
  assert.ok(C.has('cust-99'));
});

test('np-srs-custom rusak (bukan array) diabaikan, tidak jadi kartu palsu', () => {
  const { C } = loadCatalog({ custom: undefined, storage: (() => {
    const s = new LocalStorageMock();
    s.setItem('np-srs-custom', '{"bukan":"array"}');
    return s;
  })() });
  const { curated } = oldFullCards();
  assert.strictEqual(C.cards().length, curated.length + C.meta().coreCount,
    'objek rusak seharusnya tidak masuk sebagai kartu');
});

// ═══ 9. lookup() untuk halaman statistik ═══

test('lookup() memuat kartu kurasi & inti, dan kartu ekor setelah shard dimuat', async () => {
  const { C } = loadCatalog();
  let map = C.lookup();
  assert.ok(map['v00001'], 'kartu inti harus ada sejak awal');
  assert.ok(!map['v50000'], 'kartu ekor belum ada sebelum shard dimuat');
  await C.loadShards(C.shardsFor(['v50000']));
  map = C.lookup();
  assert.ok(map['v50000'], 'kartu ekor harus muncul setelah shard dimuat');
  assert.ok(map['v50000'].jp, 'punya teks Jepang');
});

module.exports = { tests };
