#!/usr/bin/env node
/**
 * scripts/tests/browser/test-kaigo-simulator.js
 *
 * Test RUNTIME NYATA (Playwright + Chromium) untuk Kaigo-Simulator.html --
 * bukan unit test sintaks/logic terisolasi seperti scripts/tests/test-*.js
 * lainnya, karena Kaigo Simulator butuh DOM/browser sungguhan untuk diuji
 * dengan jujur (klik, keyboard, localStorage, network blocking).
 *
 * SENGAJA DIPISAH dari scripts/tests/run-all.js dan package.json `npm test`:
 * menambah Playwright + Chromium binary ke dependency utama proyek akan
 * memperlambat/memperberat SETIAP `npm ci` dan CI run untuk 337 halaman lain
 * yang tidak butuh ini -- dampaknya jauh lebih besar dari manfaatnya.
 *
 * CARA MENJALANKAN (manual, lokal):
 *   1. npx playwright install chromium   (sekali saja, jika belum ada)
 *   2. node scripts/tests/browser/test-kaigo-simulator.js
 *
 * Test ini butuh Playwright terinstal di lingkungan lokal Anda (tidak
 * termasuk dependency package.json proyek ini secara sengaja).
 *
 * 20 skenario minimum sesuai spesifikasi v185 "PERBAIKAN TOTAL KAIGO
 * SIMULATOR" Fase 14, dijalankan terhadap KODE PRODUKSI ASLI
 * (Kaigo-Simulator.html) via server HTTP lokal -- bukan mock/simulasi logic.
 */

const path = require('path');
const { spawn } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('❌ Playwright tidak ditemukan. Install dulu: npm install -D playwright');
  console.error('   (Playwright sengaja TIDAK jadi dependency default proyek ini -- lihat komentar di atas file test ini)');
  process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const PORT = 8960;
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined; // pakai Playwright bundled default jika tidak di-set

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

async function playThroughScenario(page, cardIndex = 0) {
  const onHome = await page.evaluate(() => document.getElementById('scrHome')?.classList.contains('active'));
  if (!onHome) {
    await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
    await page.waitForTimeout(200);
  }
  await page.locator('.sc-card:not(.premium-lock)').nth(cardIndex).click();
  await page.waitForTimeout(300);
  for (let i = 0; i < 6; i++) {
    const resultActive = await page.evaluate(() => document.getElementById('scrResult')?.classList.contains('active'));
    if (resultActive) return true;
    const hasChoice = await page.evaluate(() => !!document.getElementById('ch0'));
    if (!hasChoice) return false;
    await page.click('#ch0').catch(() => {});
    await page.waitForTimeout(200);
    const nextVisible = await page.evaluate(() => document.getElementById('nextBtn')?.style.display === 'flex');
    if (nextVisible) { await page.click('#nextBtn'); await page.waitForTimeout(200); }
  }
  return await page.evaluate(() => document.getElementById('scrResult')?.classList.contains('active'));
}

(async () => {
  const serverProc = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: PROJECT_ROOT, stdio: ['ignore', 'ignore', 'ignore']
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, 8000);
  } catch (e) {
    console.error('❌ Server HTTP lokal gagal start:', e.message);
    serverProc.kill();
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox'],
  });

  // ── 1-2. Page initializes with/without NP ──────────────────────────
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    const npAvailable = await page.evaluate(() => typeof window.NP !== 'undefined');
    const cardsRendered = await page.evaluate(() => document.querySelectorAll('.sc-card').length);
    record('1. Page initializes when NP exists', npAvailable && cardsRendered === 6 && errors.length === 0,
      `NP available=${npAvailable}, cards=${cardsRendered}, errors=${errors.length}`);
    await page.close();
  }
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/assets/platform.min.js', route => route.abort());
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    const npAvailable = await page.evaluate(() => typeof window.NP !== 'undefined');
    const cardsRendered = await page.evaluate(() => document.querySelectorAll('.sc-card').length);
    record('2. Page initializes when NP does not exist', !npAvailable && cardsRendered === 6 && errors.length === 0,
      `NP available=${npAvailable}, cards=${cardsRendered}, errors=${errors.length}`);
    await page.close();
  }

  // ── 3. NP.State.getUser() throws ───────────────────────────────────
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.NP = { State: { getUser() { throw new Error('Simulated failure'); }, addXP() {}, updateUser() {} } };
    });
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    const cardsRendered = await page.evaluate(() => document.querySelectorAll('.sc-card').length);
    record('3. Page initializes when NP.State.getUser() throws', cardsRendered === 6 && errors.length === 0,
      `cards=${cardsRendered}, errors=${errors.length}`);
    await page.close();
  }

  // ── 4-5. Free scenarios + icons ─────────────────────────────────────
  {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    const freeCount = await page.evaluate(() => document.querySelectorAll('.sc-card:not(.premium-lock)').length);
    record('4. Free scenarios are rendered', freeCount === 3, `free scenarios found=${freeCount} (expected 3)`);

    const icons = await page.evaluate(() => Array.from(document.querySelectorAll('.sc-icon')).map(el => el.textContent));
    const allDistinct = new Set(icons).size === icons.length && !icons.every(i => i === '🏥');
    record('5. Correct scenario icon is displayed', allDistinct, `icons=${JSON.stringify(icons)}`);
    await page.close();
  }

  // ── 6-8. Open scenario, correct/wrong answer scoring ────────────────
  {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    await page.click('.sc-card:not(.premium-lock)');
    await page.waitForTimeout(300);
    const simActive = await page.evaluate(() => document.getElementById('scrSim')?.classList.contains('active'));
    record('6. A scenario can be opened', simActive);

    const correctIdx = await page.evaluate(() => curScenario.steps[curStep].choices.findIndex(c => c.ok));
    const scoreBefore = await page.evaluate(() => score);
    await page.click(`#ch${correctIdx}`);
    await page.waitForTimeout(200);
    const scoreAfterCorrect = await page.evaluate(() => score);
    record('7. A correct answer adds one point', scoreAfterCorrect === scoreBefore + 1,
      `before=${scoreBefore}, after=${scoreAfterCorrect}`);

    await page.click('#nextBtn');
    await page.waitForTimeout(300);
    const wrongIdx = await page.evaluate(() => curScenario.steps[curStep].choices.findIndex(c => !c.ok));
    const scoreBeforeWrong = await page.evaluate(() => score);
    await page.click(`#ch${wrongIdx}`);
    await page.waitForTimeout(200);
    const scoreAfterWrong = await page.evaluate(() => score);
    record('8. A wrong answer adds no point', scoreAfterWrong === scoreBeforeWrong,
      `before=${scoreBeforeWrong}, after=${scoreAfterWrong}`);
    await page.close();
  }

  // ── 9. Double-click cannot add two points ──────────────────────────
  {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    await page.click('.sc-card:not(.premium-lock)');
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => {
      const before = stepAnswers.length;
      answerStep(0); answerStep(1); answerStep(0);
      return { before, after: stepAnswers.length };
    });
    record('9. Double-click cannot add two points', result.after === result.before + 1,
      `stepAnswers before=${result.before}, after=${result.after} (expected +1 only)`);
    await page.close();
  }

  // ── 10-11. Next moves forward, final result accurate ────────────────
  {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    await page.click('.sc-card:not(.premium-lock)');
    await page.waitForTimeout(300);
    const stepBefore = await page.evaluate(() => curStep);
    await page.click('#ch0');
    await page.waitForTimeout(200);
    await page.click('#nextBtn');
    await page.waitForTimeout(200);
    const stepAfter = await page.evaluate(() => curStep);
    record('10. Next moves to the following step', stepAfter === stepBefore + 1, `before=${stepBefore}, after=${stepAfter}`);

    const finished = await playThroughScenario(page, 0);
    const scoreVal = await page.evaluate(() => score);
    const totalSteps = await page.evaluate(() => curScenario.steps.length);
    const displayedScore = await page.evaluate(() => document.getElementById('rScore')?.textContent);
    record('11. Final result is accurate', finished && displayedScore === `${scoreVal}/${totalSteps}`,
      `displayed="${displayedScore}", expected="${scoreVal}/${totalSteps}"`);
    await page.close();
  }

  // ── 12-13. Retry resets state, Home returns to list ─────────────────
  {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    await playThroughScenario(page, 0);
    await page.click('[onclick="retryScenario()"]');
    await page.waitForTimeout(300);
    const stepReset = await page.evaluate(() => curStep === 0 && score === 0);
    const simActiveAfterRetry = await page.evaluate(() => document.getElementById('scrSim')?.classList.contains('active'));
    record('12. Retry resets state', stepReset && simActiveAfterRetry, `curStep/score reset=${stepReset}, simActive=${simActiveAfterRetry}`);

    await page.click('[onclick="goHome()"]').catch(async () => {
      await page.evaluate(() => goHome());
    });
    await page.waitForTimeout(200);
    const homeActive = await page.evaluate(() => document.getElementById('scrHome')?.classList.contains('active'));
    record('13. Home returns to scenario list', homeActive);
    await page.close();
  }

  // ── 14-15. XP/progress failure does not stop gameplay ──────────────
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.NP = {
        State: {
          getUser() { return {}; },
          addXP() { throw new Error('Simulated XP failure'); },
          updateUser() { throw new Error('Simulated update failure'); },
        },
      };
    });
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    await page.click('.sc-card:not(.premium-lock)');
    await page.waitForTimeout(300);
    const correctIdx = await page.evaluate(() => curScenario.steps[curStep].choices.findIndex(c => c.ok));
    await page.click(`#ch${correctIdx}`);
    await page.waitForTimeout(200);
    const feedbackShown = await page.evaluate(() => document.getElementById('feedbackBox')?.classList.contains('show'));
    record('14. XP failure does not stop gameplay', feedbackShown && errors.length === 0, `feedbackShown=${feedbackShown}, errors=${errors.length}`);

    const finished = await playThroughScenario(page, 0);
    const resultShown = await page.evaluate(() => document.getElementById('rScore')?.textContent);
    record('15. Progress update failure does not stop result display', finished && !!resultShown && errors.length === 0,
      `finished=${finished}, resultShown="${resultShown}", errors=${errors.length}`);
    await page.close();
  }

  // ── 16. Corrupted localStorage does not break the page ─────────────
  {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      try { localStorage.setItem('np-state-v3', '{{{ invalid json'); } catch (e) {}
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    const cardsRendered = await page.evaluate(() => document.querySelectorAll('.sc-card').length);
    record('16. Corrupted localStorage does not break the page', cardsRendered === 6 && errors.length === 0,
      `cards=${cardsRendered}, errors=${errors.length}`);
    await page.close();
    await context.close();
  }

  // ── 17. Missing optional navigation does not break the page ────────
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.NP = { State: { getUser() { return {}; }, addXP() {}, updateUser() {} } }; // sengaja tanpa Nav
    });
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    const cardsRendered = await page.evaluate(() => document.querySelectorAll('.sc-card').length);
    record('17. Missing optional navigation does not break the page', cardsRendered === 6 && errors.length === 0,
      `cards=${cardsRendered}, errors=${errors.length}`);
    await page.close();
  }

  // ── 18. Premium lock behaves correctly ──────────────────────────────
  {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    const lockedCount = await page.evaluate(() => document.querySelectorAll('.sc-card.premium-lock').length);
    const lockBadges = await page.evaluate(() => document.querySelectorAll('.lock-badge').length);
    record('18. Premium lock behaves correctly', lockedCount === 3 && lockBadges === 3,
      `locked cards=${lockedCount}, lock badges=${lockBadges} (expected 3 masing-masing)`);
    await page.close();
  }

  // ── 19. Service-worker cache version is updated ─────────────────────
  {
    const fs = require('fs');
    const swContent = fs.readFileSync(path.join(PROJECT_ROOT, 'sw.js'), 'utf-8');
    const versionMatch = swContent.match(/const CACHE = 'eduma-kaigo-v(\d+)'/);
    record('19. Service-worker cache version is updated', !!versionMatch && parseInt(versionMatch[1], 10) >= 185,
      `sw.js cache version found: ${versionMatch ? versionMatch[1] : 'NOT FOUND'}`);
  }

  // ── 20. No uncaught exception during complete free-scenario flow ───
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/Kaigo-Simulator.html`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(500);
    // Mainkan SEMUA 3 skenario gratis dari awal sampai akhir + retry + home
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => goHome());
      await page.waitForTimeout(200);
      await playThroughScenario(page, i);
      await page.waitForTimeout(200);
    }
    record('20. No uncaught exception during complete free-scenario flow', errors.length === 0,
      `errors encountered: ${errors.length}${errors.length ? ' -> ' + JSON.stringify(errors) : ''}`);
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
    results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }
  process.exit(failed > 0 ? 1 : 0);
})();
