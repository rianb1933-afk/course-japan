#!/usr/bin/env node
/**
 * scripts/tests/browser/test-kanji-writing-modal.js
 *
 * Test Playwright (Chromium) — modal "Cara Menulis Kanji" di emulasi perangkat.
 *
 * Latar: laporan pengguna iPhone 14 Pro Max (430px) — bar kontrol animasi
 * goresan (⏮ ▶ ⏭ ↺) dulu `position:absolute; bottom:0` DI DALAM kotak
 * panggung sehingga MENUTUPI goresan terbawah kanji, plus overlay "Memuat
 * data goresan…" yang nyangkut karena `.kanji-stage-status{display:flex}`
 * mengalahkan atribut [hidden]. Perbaikannya: bar kontrol jadi sibling
 * statis di bawah panggung, dan status disembunyikan dengan rule
 * `[hidden]{display:none}` eksplisit.
 *
 * Yang diassert (per lebar 430px, plus sweep 390/380/320):
 *   1. Modal terbuka dan stage + kanji hantu tergambar.
 *   2. Bar kontrol berada DI BAWAH panggung (top >= bottom stage, gap ~12px,
 *      position static) — bukan menumpuk dari dalam.
 *   3. Tidak ada geometri tumpang tindih antara bar kontrol dan panggung.
 *   4. Overlay "Memuat data goresan…" tersembunyi setelah data termuat.
 *   5. Dialog pas viewport: tidak ada overflow horizontal.
 *   6. Scroll sampai dasar: Pad Latihan Tulis + tombol Hantu/Kuis terjangkau
 *      (semua tepi bawah <= tinggi viewport setelah modal digulir maksimal).
 *   7. 0 error konsol saat seluruh alur.
 *
 * SENGAJA DIPISAH dari `npm test` — pola yang sama dengan
 * test-kaigo-simulator.js: Playwright + Chromium (~300 MB) tidak menjadi
 * dependency default proyek. Jalankan manual:
 *
 *   npx playwright install chromium          # sekali saja
 *   npm run test:kanji-writing-browser
 *
 * Script memakai halaman PRODUKSI ASLI (Materi/Kanji-N5.html) via server
 * HTTP lokal python3 yang dijalankan otomatis.
 */

const path = require('path');
const { spawn } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('❌ Playwright tidak ditemukan. Install dulu: npm install -D playwright && npx playwright install chromium');
  console.error('   (Playwright sengaja TIDAK jadi dependency default proyek ini — lihat komentar di atas)');
  process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const PORT = 8971;
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;

// Lebar yang diuji: 430 (iPhone 14 Pro Max, kasus laporan pengguna) adalah
// wajib; sisanya sweep singkat untuk memastikan tidak ada regresi di lebar lain.
const WIDTHS = [430, 390, 380, 320];
const HEIGHT = 932;

function waitForServer(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const http = require('http');
    function tryConnect() {
      const req = http.get(url, res => { res.resume(); resolve(); });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('Server tidak merespons'));
        else setTimeout(tryConnect, 200);
      });
    }
    tryConnect();
  });
}

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed });
  console.log(`${passed ? '✅' : '❌'} ${name}${detail ? '\n     ' + detail : ''}`);
}

async function openWritingModal(page) {
  // Klik tombol "Cara Tulis" pertama; modal dibuat dinamis oleh kanji-writing.js
  await page.locator('.kanji-write-btn').first().click();
  await page.waitForSelector('.kanji-writing-modal', { timeout: 5000 });
  // Tunggu data goresan KanjiVG termuat (badge "N goresan" muncul / status disembunyikan)
  await page.waitForFunction(() => {
    const st = document.querySelector('.kanji-stage-status');
    return st && getComputedStyle(st).display === 'none';
  }, { timeout: 8000 });
  await page.waitForTimeout(300); // beri animasi awal waktu menyiapkan canvas
}

function measure(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.kanji-stage');
    const controls = document.querySelector('.kanji-stage-controls');
    const status = document.querySelector('.kanji-stage-status');
    const dialog = document.querySelector('.kanji-writing-dialog');
    const modal = document.querySelector('.kanji-writing-modal');
    const padHead = [...document.querySelectorAll('.kanji-writing-panel h3, .kanji-writing-panel h4, .kanji-writing-panel strong')]
      .find(el => /Pad Latihan/i.test(el.textContent));
    const padPanel = padHead ? padHead.closest('.kanji-writing-panel') : null;
    const ghostBtn = [...document.querySelectorAll('.kanji-writing-panel button')].find(b => /Hantu/i.test(b.textContent));
    const r = el => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width }; };
    const modalScroll = modal ? { scrollTop: modal.scrollTop, scrollHeight: modal.scrollHeight, clientHeight: modal.clientHeight } : null;
    return {
      vw: innerWidth, vh: innerHeight,
      stage: stage ? r(stage) : null,
      controls: controls ? r(controls) : null,
      controlsPosition: controls ? getComputedStyle(controls).position : null,
      statusDisplay: status ? getComputedStyle(status).display : null,
      statusHiddenAttr: status ? status.hidden : null,
      dialog: dialog ? r(dialog) : null,
      padPanel: padPanel ? r(padPanel) : null,
      ghostBtn: ghostBtn ? r(ghostBtn) : null,
      modalScroll,
      hasHorizOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
}

(async () => {
  const serverProc = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: PROJECT_ROOT, stdio: ['ignore', 'ignore', 'ignore']
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}/Materi/Kanji-N5.html`, 8000);
  } catch (e) {
    console.error('❌ Server HTTP lokal gagal start:', e.message);
    serverProc.kill();
    process.exit(1);
  }

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, args: ['--no-sandbox'] });
  const url = `http://127.0.0.1:${PORT}/Materi/Kanji-N5.html`;

  // ── Skenario utama: 430 × 932 (iPhone 14 Pro Max — kasus laporan) ──
  {
    const page = await browser.newPage({ viewport: { width: 430, height: HEIGHT } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await openWritingModal(page);
    const m = await measure(page);

    // 1. Bar kontrol DI BAWAH panggung — inti perbaikan
    const below = m.controls && m.stage && m.controls.top >= m.stage.bottom - 1;
    const gap = (m.controls && m.stage) ? +(m.controls.top - m.stage.bottom).toFixed(1) : null;
    record('1. Bar kontrol di bawah panggung (430px)', below,
      `controls.top=${m.controls?.top?.toFixed(1)}, stage.bottom=${m.stage?.bottom?.toFixed(1)}, gap=${gap}px`);

    // 2. position static — bukan overlay absolute
    record('2. Bar kontrol position:static (bukan overlay)', m.controlsPosition === 'static', `position=${m.controlsPosition}`);

    // 3. Tidak ada irisan geometris dengan panggung
    const noOverlap = m.controls && m.stage && (m.controls.top >= m.stage.bottom - 0.5);
    record('3. Tidak ada tumpang tindih kontrol×panggung', noOverlap, `gap=${gap}px (harus >= 0)`);

    // 4. Overlay loading tersembunyi
    record('4. Overlay "Memuat…" tersembunyi', m.statusDisplay === 'none' && m.statusHiddenAttr === true,
      `display=${m.statusDisplay}, hidden=${m.statusHiddenAttr}`);

    // 5. Tidak ada overflow horizontal
    record('5. Tanpa overflow horizontal', !m.hasHorizOverflow, `scrollWidth vs vw=${m.vw}`);

    // 6. Dasar dialog terjangkau: modal (satu penggulir) dapat digulir sampai dasar
    //    dan setelah digulir maksimal, dialog + panel pad + tombol hantu <= viewport.
    //    Font JP dimuat async — tunggu dulu supaya tinggi konten stabil, lalu gulir
    //    dua kali (scroll ulang setelah layout final; scrollTop tidak otomatis numpang
    //    saat konten bertambah tinggi).
    await page.evaluate(() => document.fonts.ready.then(() => {}));
    await page.waitForTimeout(150);
    const scrollToBottom = () => page.evaluate(() => {
      const modal = document.querySelector('.kanji-writing-modal');
      if (modal) modal.scrollTop = modal.scrollHeight;
    });
    await scrollToBottom();
    await page.waitForTimeout(150);
    await scrollToBottom();
    await page.waitForTimeout(200);
    const m2 = await measure(page);
    const padReachable = !m2.padPanel || m2.padPanel.bottom <= m2.vh + 1;
    const ghostReachable = !m2.ghostBtn || m2.ghostBtn.bottom <= m2.vh + 1;
    // ukur dialog SETELAH scroll — sebelum scroll, dialog > viewport memang wajar
    // (justru itu alasan modal bisa digulir)
    const inViewport = m2.dialog && m2.dialog.bottom <= m2.vh + 1;
    record('6. Dialog + pad + tombol Hantu terjangkau setelah scroll dasar (430px)',
      padReachable && ghostReachable && inViewport,
      `dialog.bottom=${m2.dialog?.bottom?.toFixed(1)} vs vh=${m2.vh}, pad.bottom=${m2.padPanel?.bottom?.toFixed(1)}, ghost.bottom=${m2.ghostBtn?.bottom?.toFixed(1)}`);

    // 7. 0 error konsol sepanjang alur
    record('7. 0 error konsol (alur 430px)', errors.length === 0, errors.join(' | ') || 'bersih');

    await page.close();
  }

  // ── Sweep lebar lain: 1 (bawah) + 4 (overlay) + 5 (overflow) saja ──
  for (const width of WIDTHS.slice(1)) {
    const page = await browser.newPage({ viewport: { width, height: HEIGHT } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await openWritingModal(page);
    const m = await measure(page);
    const below = m.controls && m.stage && m.controls.top >= m.stage.bottom - 1;
    const gap = (m.controls && m.stage) ? +(m.controls.top - m.stage.bottom).toFixed(1) : null;
    record(`Sweep ${width}px: kontrol di bawah panggung + overlay tersembunyi + tanpa overflow`,
      below && m.statusDisplay === 'none' && !m.hasHorizOverflow,
      `gap=${gap}px, display=${m.statusDisplay}, overflow=${m.hasHorizOverflow}, errors=${errors.length}`);
    await page.close();
  }

  await browser.close();
  serverProc.kill();

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  console.log('\n' + '='.repeat(60));
  console.log(`RESULT: ${passed}/${results.length} passed`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.name}`));
    console.log('\nPetunjuk: periksa assets/kanji-writing.css — .kanji-stage-controls harus');
    console.log('static & sibling DI LUAR .kanji-stage; status perlu rule [hidden]{display:none};');
    console.log('dan halaman harus memuat kanji-writing.css dengan stamp ?v= terbaru.');
  }
  process.exit(failed > 0 ? 1 : 0);
})();
