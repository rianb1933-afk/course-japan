/* Uji halaman asli di Chromium dengan respons API terkontrol; tidak memakai profil pribadi. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../..');
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml'};
(async () => {
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, data) => {
      res.writeHead(error ? 404 : 200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'});
      res.end(error ? 'Not found' : data);
    });
  });
  let browser;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const installedChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    browser = await chromium.launch({headless:true,
      executablePath: process.env.CHROMIUM_PATH || (fs.existsSync(chromium.executablePath()) ? undefined : installedChrome)});
    for (const width of [390, 1440]) {
      const context = await browser.newContext({viewport:{width, height:900}, serviceWorkers:'block'});
      const page = await context.newPage();
      let status = 200, requestCount = 0, release, lastBody;
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        const url = route.request().url();
        if (!url.startsWith(origin + '/')) return route.abort();
        if (url.endsWith('/api/ai-chat')) {
          requestCount++;
          lastBody = route.request().postDataJSON();
          if (status === 503) await new Promise(resolve => { release = resolve; });
          return route.fulfill({status, contentType:'application/json', body:JSON.stringify(status === 200
            ? {text:'【こんにちは。】Halo! [VOCAB: 猫=kucing, 犬=anjing] [KOREKSI: Gunakan は untuk topik]', provider:'test'}
            : {error:'Layanan sementara tidak tersedia', code:'UNAVAILABLE'})});
        }
        return route.continue();
      });
      await page.goto(origin + '/AI-Sensei.html', {waitUntil:'load'});
      await page.locator('#coachSummaryBtn').click();
      assert.ok((await page.locator('#coachSummaryContent').innerText()).includes('Kirim pesan'));
      await page.getByRole('button', {name:'Lanjut latihan', exact:true}).click();
      await page.locator('#coachGoal').selectOption('grammar');
      await page.locator('#chatInput').fill('こんにちは');
      await page.locator('#sendBtn').click();
      await page.waitForFunction(() => !document.getElementById('sendBtn').disabled);
      assert.ok((await page.locator('#messages').innerText()).includes('Halo!'), JSON.stringify({messages:await page.locator('#messages').innerText(), errors, requestCount}));
      assert.equal(requestCount, 1);
      assert.ok(lastBody.scenario.includes('Prioritaskan koreksi tata bahasa'));
      assert.equal(await page.locator('#coachProgress').innerText(), '1/5 giliran');
      await page.locator('#coachSummaryBtn').click();
      assert.ok((await page.locator('#coachSummaryContent').innerText()).includes('犬 — anjing'));
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', {name:'Unduh catatan', exact:true}).click();
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), 'catatan-sensei.txt');
      assert.ok(fs.readFileSync(await download.path(), 'utf8').includes('Gunakan は'));
      await page.getByRole('button', {name:'Latih pola ini', exact:true}).click();
      assert.ok((await page.locator('#chatInput').inputValue()).includes('Jangan tampilkan jawabannya dulu'));
      console.log(`PASS ${width}px: tujuan terkirim, ringkasan, unduh, latihan ulang`);
      assert.equal(await page.evaluate(() => NP.State.getUser().vocabLearned), 2);
      const xpAfterSuccess = await page.evaluate(() => NP.State.getUser().xp);
      console.log(`PASS ${width}px: kirim pesan dan tampilkan jawaban/kosakata`);
      status = 503;
      await page.locator('#chatInput').fill('失敗テスト');
      await page.locator('#sendBtn').click();
      await page.waitForFunction(() => document.getElementById('sendBtn').disabled);
      while (!release) await new Promise(resolve => setTimeout(resolve, 20));
      assert.equal(await page.locator('#sendBtn').isDisabled(), true);
      release();
      await page.waitForFunction(() => !document.getElementById('sendBtn').disabled);
      assert.equal(await page.locator('#chatInput').inputValue(), '失敗テスト');
      assert.equal(await page.evaluate(() => NP.State.getUser().xp), xpAfterSuccess);
      assert.equal(await page.evaluate(() => NP.State.getUser().vocabLearned), 2);
      assert.ok((await page.locator('#messages').innerText()).includes('Layanan sementara tidak tersedia'));
      console.log(`PASS ${width}px: gagal 503, tombol pulih, input dipulihkan`);
      status = 200;
      await page.locator('#sendBtn').click();
      await page.waitForFunction(() => !document.getElementById('sendBtn').disabled);
      assert.equal(await page.locator('#chatInput').inputValue(), '');
      assert.equal(requestCount, 3);
      assert.equal(await page.locator('#coachProgress').innerText(), '2/5 giliran');
      assert.equal(await page.evaluate(() => NP.State.getUser().vocabLearned), 2);
      for (let turn = 0; turn < 3; turn++) {
        await page.locator('#chatInput').fill('練習します');
        await page.locator('#sendBtn').click();
        await page.waitForFunction(() => !document.getElementById('sendBtn').disabled);
      }
      assert.ok((await page.locator('#coachProgress').innerText()).includes('Target tercapai'));
      await page.locator('#coachGoal').selectOption('vocabulary');
      assert.equal(await page.locator('#coachProgress').innerText(), '0/5 giliran');
      console.log(`PASS ${width}px: target lima giliran dan reset sesi baru`);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: kirim ulang berhasil, tanpa error JavaScript`);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
