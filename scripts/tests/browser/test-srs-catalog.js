#!/usr/bin/env node
/**
 * scripts/tests/browser/test-srs-catalog.js
 *
 * Test RUNTIME NYATA (Playwright + Chromium) untuk katalog kartu SRS —
 * jalur yang TIDAK bisa diuji unit: klik filter, pemuatan shard lewat
 * jaringan, keadaan gagal/offline, dan pemulihan setelahnya.
 *
 * Latar: assets/srs-cards-data.js (7,14 MB, <script> sinkron sehingga
 * memblokir render) diganti assets/srs/core.js (eager, defer) + 18 shard
 * JMdict yang di-fetch sesuai kebutuhan. Logika murninya diuji di
 * scripts/tests/test-srs-catalog.js; berkas ini menguji perilaku halaman.
 *
 * SENGAJA DIPISAH dari `npm test`, sama seperti dua suite browser lain:
 * Playwright + Chromium (~300 MB) tidak pantas dibebankan ke setiap
 * `npm ci`/CI run untuk ratusan halaman yang tidak membutuhkannya.
 *
 * CARA MENJALANKAN (manual, lokal):
 *   1. npx playwright install chromium   (sekali saja, jika belum ada)
 *   2. node scripts/tests/browser/test-srs-catalog.js
 */

const path = require('path');
const { spawn } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('✖ Playwright belum terpasang. Jalankan: npm install -D playwright && npx playwright install chromium');
  process.exit(1);
}

const PORT = 8961;
const ROOT = path.join(__dirname, '..', '..', '..');
const BASE = `http://127.0.0.1:${PORT}`;

let pass = 0, fail = 0;
function ok(name) { pass++; console.log('   ✅ ' + name); }
function bad(name, err) { fail++; console.log('   ❌ ' + name + '\n      ' + String(err && err.message || err).split('\n')[0]); }
async function t(name, fn) { try { await fn(); ok(name); } catch (e) { bad(name, e); } }

function waitForServer(url, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const http = require('http');
    (function attempt() {
      http.get(url, res => { res.resume(); resolve(); })
        .on('error', () => {
          if (Date.now() - started > timeoutMs) return reject(new Error('server tidak siap'));
          setTimeout(attempt, 150);
        });
    })();
  });
}

// State berisi satu kartu EKOR JMdict yang pernah diulas (v50000) supaya
// jalur hidrasi shard di halaman statistik ikut teruji.
const SEED = {
  v00001: { reps: 8, ef: 2.6, interval: 43200, nextReview: Date.now() + 864e5, lastRating: 3 },
  v00007: { reps: 4, ef: 2.0, interval: 3000, nextReview: Date.now() + 3600e3, lastRating: 1 },
  v50000: { reps: 5, ef: 1.9, interval: 7200, nextReview: Date.now() + 7200e3, lastRating: 1 },
};

async function newPage(ctx) {
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('pageerror', e => page.__errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.__errors.push(m.text()); });
  return page;
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore',
  });
  try {
    await waitForServer(`${BASE}/SRS-Flashcard.html`, 8000);
  } catch (e) {
    console.error('✖ tidak bisa menjalankan server lokal');
    server.kill();
    process.exit(1);
  }

  const browser = await chromium.launch();
  // serviceWorkers:'block' — WAJIB. sw.js milik situs ini menangkap fetch
  // same-origin, dan permintaan yang berasal dari service worker TIDAK
  // melewati page.route(), sehingga simulasi gagal-jaringan diam-diam tidak
  // aktif dan ujinya lulus palsu. Perilaku SW itu sendiri (membalas
  // offline.html berstatus 200 untuk shard) diuji di unit test katalog.
  const CTX = { viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' };
  const mkCtx = async () => {
    const ctx = await browser.newContext(CTX);
    // addInitScript jalan di SETIAP navigasi (termasuk reload), jadi
    // np-srs-custom hanya di-seed bila memang belum ada — kalau ditimpa
    // tanpa syarat, uji "bertahan setelah reload" jadi menguji dirinya sendiri.
    await ctx.addInitScript((s) => {
      try {
        localStorage.setItem('np-srs-v2', JSON.stringify(s));
        if (localStorage.getItem('np-srs-custom') === null) localStorage.setItem('np-srs-custom', '[]');
        if (localStorage.getItem('np-srs-bookmarks') === null) localStorage.setItem('np-srs-bookmarks', '[]');
      } catch (e) {}
    }, SEED);
    return ctx;
  };

  console.log('🧪 SRS catalog — browser\n' + '='.repeat(50));

  // ── 1. muat dingin: tidak ada 7 MB, tidak ada error ──
  await t('cold load Flashcard: srs-cards-data.js TIDAK diminta', async () => {
    const ctx = await mkCtx();
    const page = await newPage(ctx);
    const urls = [];
    page.on('request', r => urls.push(r.url()));
    await page.goto(`${BASE}/SRS-Flashcard.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1200);
    const assert = require('assert');
    assert.ok(!urls.some(u => u.includes('srs-cards-data.js')), 'berkas 7 MB lama masih diminta');
    assert.ok(urls.some(u => u.includes('srs/core.js')), 'core.js tidak dimuat');
    assert.deepStrictEqual(page.__errors, [], 'ada error JS: ' + page.__errors.join(' | '));
    await ctx.close();
  });

  // ── 2. semua 14 filter menghasilkan deck (tidak ada yang kosong/rusak) ──
  await t('14 filter dapat diklik; jmdict memuat shard lalu menampilkan kartu', async () => {
    const assert = require('assert');
    const ctx = await mkCtx();
    const page = await newPage(ctx);
    await page.goto(`${BASE}/SRS-Flashcard.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1000);

    const filters = ['n5','n4','n3','n2','n1','kaigo','kanji','grammar','vocab','kustom','bookmark','due','jmdict','all'];
    for (const f of filters) {
      await page.click(`[data-filter="${f}"]`);
      // jmdict/due memuat 18 shard — beri waktu, lalu tunggu loader hilang
      await page.waitForFunction(
        () => document.getElementById('catalogLoading').style.display === 'none',
        { timeout: 45000 }
      );
      const st = await page.evaluate(() => ({
        deck: (typeof deck !== 'undefined') ? deck.length : -1,
        filter: (typeof curFilter !== 'undefined') ? curFilter : '?',
      }));
      assert.strictEqual(st.filter, f, 'filter tidak berubah untuk ' + f);
      if (f === 'jmdict') assert.ok(st.deck > 1000, 'deck jmdict seharusnya besar, dapat ' + st.deck);
    }
    assert.deepStrictEqual(page.__errors, [], 'ada error JS: ' + page.__errors.join(' | '));
    await ctx.close();
  });

  // ── 3. offline: jangan pernah deck kosong ──
  await t('shard gagal (offline) → toast + deck fallback, BUKAN kosong', async () => {
    const assert = require('assert');
    const ctx = await mkCtx();
    const page = await newPage(ctx);
    await page.goto(`${BASE}/SRS-Flashcard.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1000);
    // Matikan HANYA permintaan shard, biar halaman tetap hidup.
    // Pencocokan pakai FUNGSI, bukan glob: pada glob Playwright tanda `?`
    // adalah wildcard satu karakter, sehingga '**/srs/tail-*.json*' TIDAK
    // cocok dengan '…/tail-00.json?v=cc5de11f' dan rute diam-diam tidak aktif.
    await page.route(u => u.pathname.includes('/srs/tail-'), route => route.abort());
    await page.click('[data-filter="jmdict"]');
    await page.waitForFunction(
      () => document.getElementById('catalogLoading').style.display === 'none',
      { timeout: 45000 }
    );
    const st = await page.evaluate(() => ({
      degraded: (typeof catalogDegraded !== 'undefined') ? catalogDegraded : null,
      deck: (typeof deck !== 'undefined') ? deck.length : -1,
      retryShown: document.getElementById('catalogRetryBtn').style.display !== 'none',
      cards: (typeof CARDS !== 'undefined') ? CARDS.length : -1,
    }));
    assert.strictEqual(st.degraded, true, 'harus menandai degraded');
    assert.ok(st.cards > 0, 'katalog inti harus tetap ada');
    assert.ok(st.retryShown, 'tombol coba lagi harus tampil');
    await ctx.close();
  });

  // ── 4. service worker membalas offline.html berstatus 200 ──
  await t('respons HTML berstatus 200 untuk shard ditolak (tidak jadi kartu palsu)', async () => {
    const assert = require('assert');
    const ctx = await mkCtx();
    const page = await newPage(ctx);
    await page.goto(`${BASE}/SRS-Flashcard.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1000);
    await page.route(u => u.pathname.includes('/srs/tail-'), route =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>offline</title>' }));
    await page.click('[data-filter="jmdict"]');
    await page.waitForFunction(
      () => document.getElementById('catalogLoading').style.display === 'none',
      { timeout: 45000 }
    );
    const st = await page.evaluate(() => ({
      degraded: (typeof catalogDegraded !== 'undefined') ? catalogDegraded : null,
      cards: (typeof CARDS !== 'undefined') ? CARDS.length : -1,
    }));
    assert.strictEqual(st.degraded, true, 'HTML 200 harus diperlakukan sebagai gagal');
    assert.ok(st.cards > 0 && st.cards < 30000, 'tidak boleh menelan HTML sebagai kartu');
    await ctx.close();
  });

  // ── 5. kuota "lain" = 0 (tak terbatas) menarik seluruh pustaka ──
  await t('kuota lain=0 → filter "all" mencapai seluruh 100.520 kartu', async () => {
    const assert = require('assert');
    const ctx = await mkCtx();
    await ctx.addInitScript(() => {
      try { localStorage.setItem('np-srs-new-caps', JSON.stringify({ n5:20,n4:15,n3:10,n2:5,n1:3,lain:0 })); } catch (e) {}
    });
    const page = await newPage(ctx);
    await page.goto(`${BASE}/SRS-Flashcard.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(
      () => document.getElementById('catalogLoading').style.display === 'none' && typeof CARDS !== 'undefined',
      { timeout: 60000 }
    );
    await page.waitForTimeout(500);
    const n = await page.evaluate(() => CARDS.length);
    assert.strictEqual(n, 100520, 'seharusnya seluruh pustaka termuat, dapat ' + n);
    await ctx.close();
  });

  // ── 6. pencarian tetap melihat kamus penuh ──
  await t('pencarian menarik ekor sehingga hasilnya tidak menyusut', async () => {
    const assert = require('assert');
    const ctx = await mkCtx();
    const page = await newPage(ctx);
    await page.goto(`${BASE}/SRS-Flashcard.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1000);
    const before = await page.evaluate(() => CARDS.length);
    await page.evaluate(() => { searchQuery = 'mahjong'; buildDeck('all'); });
    await page.waitForFunction(
      () => document.getElementById('catalogLoading').style.display === 'none',
      { timeout: 45000 }
    );
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => CARDS.length);
    assert.ok(after > before, 'pencarian harus memicu pemuatan ekor (' + before + ' -> ' + after + ')');
    await ctx.close();
  });

  // ── 7. kartu kustom bertahan ──
  await t('kartu kustom: tersimpan, terhitung, dan bertahan setelah reload', async () => {
    const assert = require('assert');
    const ctx = await mkCtx();
    const page = await newPage(ctx);
    await page.goto(`${BASE}/SRS-Flashcard.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const custom = JSON.parse(localStorage.getItem('np-srs-custom') || '[]');
      const card = { id: 'cust-uji-1', type:'VOCAB', jp:'試験', reading:'しけん', meaning:'ujian', example:'', cat:'custom', jlpt:'' };
      custom.push(card);
      localStorage.setItem('np-srs-custom', JSON.stringify(custom));
      window.NPCatalog.addCustom(card);
      updateFilterCounts();
    });
    const c1 = await page.evaluate(() => document.getElementById('fc-kustom').textContent.trim());
    assert.strictEqual(c1, '1', 'hitungan kustom setelah tambah');

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const c2 = await page.evaluate(() => document.getElementById('fc-kustom').textContent.trim());
    assert.strictEqual(c2, '1', 'hitungan kustom setelah reload');
    const found = await page.evaluate(() => { buildDeck('kustom'); return deck.length; });
    assert.strictEqual(found, 1, 'kartu kustom harus ditemukan filter kustom');
    await ctx.close();
  });

  // ── 8. halaman statistik: label kartu ekor terisi ──
  await t('Statistik: label kartu JMdict yang diulas terisi (bukan id mentah)', async () => {
    const assert = require('assert');
    const ctx = await mkCtx();
    const page = await newPage(ctx);
    const urls = [];
    page.on('request', r => urls.push(r.url()));
    await page.goto(`${BASE}/SRS-Statistics.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500);
    assert.ok(!urls.some(u => u.includes('srs-cards-data.js')), 'berkas 7 MB lama masih diminta');
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#weakList table tr')).slice(1)
        .map(r => r.cells[0] ? r.cells[0].textContent.trim().replace(/\s+/g, ' ') : ''));
    assert.ok(labels.some(l => l.includes('脂肪太り')),
      'kartu ekor v50000 harus tampil dengan teks Jepang, dapat: ' + JSON.stringify(labels));
    assert.deepStrictEqual(page.__errors, [], 'ada error JS: ' + page.__errors.join(' | '));
    await ctx.close();
  });

  // ── 9. statistik tanpa riwayat JMdict tidak meminta shard sama sekali ──
  await t('Statistik tanpa kartu ekor di riwayat → NOL permintaan shard', async () => {
    const assert = require('assert');
    const ctx = await browser.newContext(CTX);
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('np-srs-v2', JSON.stringify({ v00001: { reps: 3, ef: 2.5, nextReview: Date.now() + 1e6, lastRating: 2 } }));
      } catch (e) {}
    });
    const page = await newPage(ctx);
    const shardReqs = [];
    page.on('request', r => { if (r.url().includes('/srs/tail-')) shardReqs.push(r.url()); });
    await page.goto(`${BASE}/SRS-Statistics.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2000);
    assert.deepStrictEqual(shardReqs, [], 'seharusnya tidak ada fetch shard, ada: ' + shardReqs.length);
    await ctx.close();
  });

  await browser.close();
  server.kill();

  console.log('\n' + '='.repeat(50));
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
