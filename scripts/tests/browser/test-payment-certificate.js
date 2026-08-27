#!/usr/bin/env node
/**
 * Browser smoke tests for payment authentication and certificate verification.
 * Requires local Playwright; intentionally kept outside the default test suite.
 */

const path = require('path');
const { spawn } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (_) {
  console.error('Playwright tidak ditemukan. Jalankan: npm install -D playwright');
  console.error('Lalu: npx playwright install chromium');
  process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const PORT = 8961;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;

function waitForServer(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const http = require('http');
    function probe() {
      const request = http.get(url, response => { response.resume(); resolve(); });
      request.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('Server lokal tidak merespons'));
        else setTimeout(probe, 200);
      });
    }
    probe();
  });
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: PROJECT_ROOT, stdio: ['ignore', 'ignore', 'ignore']
  });
  let browser;
  try {
    await waitForServer(`${BASE_URL}/Verify.html`, 8000);
    browser = await chromium.launch({ executablePath: CHROMIUM_PATH, args: ['--no-sandbox'] });

    {
      const page = await browser.newPage();
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      await page.goto(`${BASE_URL}/Verify.html?id=UJIAN-TEST123`, { waitUntil: 'networkidle', timeout: 10000 });
      const state = await page.evaluate(() => ({
        value: document.getElementById('certIdInput')?.value,
        resultVisible: getComputedStyle(document.getElementById('result')).display !== 'none',
        warning: document.getElementById('result')?.textContent.includes('belum aktif')
      }));
      const supabaseCalls = requests.filter(url => url.includes('/rest/v1/exam_certificates'));
      if (state.value !== 'UJIAN-TEST123' || !state.resultVisible || !state.warning || supabaseCalls.length !== 0) {
        throw new Error(`Verifikasi QR gagal: ${JSON.stringify(state)}, Supabase calls=${supabaseCalls.length}`);
      }
      console.log('✅ Verify.html membaca ?id= dan gagal dengan pesan konfigurasi yang jujur');
      await page.close();
    }

    {
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}/Pricing-Pro.html`, { waitUntil: 'networkidle', timeout: 10000 });
      const state = await page.evaluate(() => {
        const modal = document.getElementById('payModal');
        return {
          processPayment: typeof window.processPayment,
          modalExists: !!modal,
          modalClosed: !modal?.classList.contains('open')
        };
      });
      if (state.processPayment !== 'function' || !state.modalExists || !state.modalClosed) {
        throw new Error(`Payment page tidak siap: ${JSON.stringify(state)}`);
      }
      await page.evaluate(() => {
        window.NP.Toast = { show() {} };
        window.curPayMethod = 'midtrans';
        window.curPlan = 'premium';
        window.processPayment();
      });
      const toastState = await page.evaluate(() => document.body.textContent.includes('Silakan login terlebih dahulu'));
      if (!toastState) throw new Error('Payment tanpa sesi login tidak menampilkan guard login');
      console.log('✅ Pricing-Pro.html menahan payment tanpa sesi login');
      await page.close();
    }

    console.log('RESULT: 2 passed, 0 failed');
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})();
