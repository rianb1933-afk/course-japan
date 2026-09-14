#!/usr/bin/env node
/**
 * scripts/tests/browser/test-anatomy-3d.js
 *
 * Test RUNTIME NYATA (Playwright + Chromium) untuk viewer 3D lazy-load di
 * halaman Materi/Sistem-*.html -- validator (`three-lazy`, `three-version`)
 * hanya memeriksa POLA SUMBER secara statis (regex "await import('three')"
 * di dalam initXxx3D, versi importmap seragam), TIDAK PERNAH benar-benar
 * membuka browser, mengklik tab "解剖 Anatomi", dan memastikan Three.js
 * sungguhan ter-import serta canvas WebGL benar-benar tergambar.
 *
 * KENAPA JALUR INI RAWAN REGRESI (lihat CLAUDE.md):
 * Trigger-nya DUA JALUR dan keduanya wajib -- listener klik tab adalah
 * jalur UTAMA, IntersectionObserver hanya cadangan (elemen di dalam
 * .organ-panel non-aktif berdimensi 0x0, jadi observer sendirian tidak
 * akan pernah menganggapnya intersecting). Salah satu init function juga
 * sengaja diekspos ke `window` supaya listener tab (script biasa) bisa
 * memanggilnya -- module script punya scope terisolasi. Kesalahan re-wiring
 * salah satu bagian ini TIDAK menimbulkan error konsol yang jelas, hanya
 * viewer 3D yang diam-diam tidak pernah muncul -- persis kelas bug yang
 * hanya kelihatan lewat browser sungguhan, bukan pembacaan sumber statis.
 *
 * SENGAJA DIPISAH dari npm test -- lihat catatan yang sama di
 * test-kaigo-simulator.js (Playwright + Chromium bukan dependency default).
 *
 * CARA MENJALANKAN (manual, lokal):
 *   1. npx playwright install chromium   (sekali saja, jika belum ada)
 *   2. node scripts/tests/browser/test-anatomy-3d.js
 *
 * Diuji di 3 sistem organ berbeda (Rangka/tulang, Kardiovaskular/jantung,
 * Saraf/otak) sebagai sampel representatif -- pola HTML+JS-nya identik di
 * ke-33 halaman Sistem-*.html (dihasilkan lewat codemod yang sama,
 * scripts/lazy-load-three.js), jadi satu bug re-wiring akan muncul di
 * ketiganya sekaligus.
 */

const path = require('path');
const { spawn } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('❌ Playwright tidak ditemukan. Install dulu: npm install -D playwright');
  console.error('   (Playwright sengaja TIDAK jadi dependency default proyek ini)');
  process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const PORT = 8961;

const PAGES = [
  { file: 'Materi/Sistem-Rangka.html', label: 'Rangka (tulang)' },
  { file: 'Materi/Sistem-Kardiovaskular.html', label: 'Kardiovaskular (jantung)' },
  { file: 'Materi/Sistem-Saraf.html', label: 'Saraf (otak)' },
];

function waitForServer(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const http = require('http');
    function tryConnect() {
      const req = http.get(url, res => { res.resume(); resolve(); });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('Server tidak merespons dalam waktu yang ditentukan'));
        else setTimeout(tryConnect, 200);
      });
    }
    tryConnect();
  });
}

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? '✅' : '❌'} ${name}${detail ? '\n     ' + detail : ''}`);
}

(async () => {
  const serverProc = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: PROJECT_ROOT, stdio: ['ignore', 'ignore', 'ignore'],
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}/index.html`, 10000);
  } catch (e) {
    console.error('❌ Server HTTP lokal gagal start:', e.message);
    serverProc.kill();
    process.exit(1);
  }

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  for (const { file, label } of PAGES) {
    const page = await browser.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    try {
      await page.goto(`http://127.0.0.1:${PORT}/${file}`, { waitUntil: 'networkidle', timeout: 15000 });

      // Sebelum klik: viewer 3D TIDAK BOLEH sudah dimuat (itu justru
      // membuktikan Three.js diimpor statis, bukan lazy — beban ~2,2 MB
      // ditanggung semua pengunjung walau tab Anatomi tak pernah dibuka).
      const canvasBeforeClick = await page.locator('#panel-anatomi canvas').count();
      record(`${label}: canvas TIDAK ada sebelum tab Anatomi diklik (lazy-load asli)`,
        canvasBeforeClick === 0, `canvas ditemukan sebelum klik: ${canvasBeforeClick}`);

      // Jalur UTAMA: klik nyata pada tab, bukan memanggil initXxx3D() langsung —
      // supaya wiring listener klik yang sesungguhnya ikut teruji.
      await page.click('.organ-tab[data-tab="anatomi"]');
      await page.waitForSelector('#panel-anatomi canvas', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(400); // beri waktu render frame pertama

      const canvasBox = await page.locator('#panel-anatomi canvas').first()
        .boundingBox().catch(() => null);
      const hasRenderedCanvas = !!canvasBox && canvasBox.width > 0 && canvasBox.height > 0;
      record(`${label}: klik tab Anatomi memunculkan canvas WebGL berukuran nyata`,
        hasRenderedCanvas,
        canvasBox ? `${canvasBox.width}x${canvasBox.height}` : 'canvas tidak ditemukan setelah klik');

      record(`${label}: 0 uncaught page error saat lazy-load Three.js`,
        pageErrors.length === 0, pageErrors.join(' | '));
      record(`${label}: 0 console.error saat lazy-load Three.js`,
        consoleErrors.length === 0, consoleErrors.join(' | '));
    } catch (e) {
      record(`${label}: alur tab Anatomi selesai tanpa exception`, false, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  serverProc.kill();

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  console.log('\n' + '='.repeat(60));
  console.log(`RESULT: ${passed}/${results.length} passed`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }
  process.exit(failed > 0 ? 1 : 0);
})();
