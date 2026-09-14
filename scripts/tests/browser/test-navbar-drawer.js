/* Uji fokus drawer mobile navbar (Chromium, viewport ponsel).
   Latar: #knDrawer mendeklarasikan role="dialog" tapi initDrawer() tidak
   pernah mengelola fokus — membuka drawer tidak memindahkan fokus ke
   dalamnya, Tab bisa lolos ke konten halaman di baliknya, dan menutup
   tidak mengembalikan fokus ke tombol hamburger. Diperbaiki di
   assets/kyoto-navbar.js; script ini memverifikasi via keyboard sungguhan
   (Playwright), karena Tab lewat CDP interaktif tidak stabil untuk kasus
   fokus lintas-elemen di sandbox devtools. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../..');
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json'};
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
    const context = await browser.newContext({viewport:{width:390, height:800}, serviceWorkers:'block'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/index.html', {waitUntil:'load'});

    await page.locator('#knHamburger').click();
    assert.equal(await page.locator('#knDrawer').getAttribute('aria-hidden'), 'false', 'drawer harus terbuka');
    assert.ok(await page.locator('#knDrawerClose').evaluate(el => el === document.activeElement),
      'fokus harus pindah ke tombol tutup saat drawer dibuka');
    console.log('PASS: buka drawer memindahkan fokus ke tombol tutup');

    // Regresi: #knDrawerLogin berbagi class .kn-btn-ghost dengan #knLoginBtn
    // di navbar atas. Aturan @media(max-width:768px) yang menyembunyikan
    // #knLoginBtn (digantikan hamburger) sempat ikut menyembunyikan tombol
    // login drawer sendiri -- satu-satunya jalan masuk login di ponsel.
    assert.notEqual(await page.locator('#knDrawerLogin').evaluate(el => getComputedStyle(el).display), 'none',
      'tombol "Masuk ke Akun" di drawer harus TETAP terlihat di lebar mobile');
    console.log('PASS: tombol login drawer terlihat di lebar mobile');

    // Batas trap: fokus langsung ke elemen PERTAMA (logo drawer, sebelum
    // tombol tutup dalam urutan DOM) lalu Shift+Tab harus melingkar ke
    // elemen TERAKHIR (bukan lolos ke konten halaman di baliknya).
    await page.locator('.kn-drawer-logo').evaluate(el => el.focus());
    await page.keyboard.press('Shift+Tab');
    const wrappedToLast = await page.locator('.kn-drawer-footer #knDrawerLogin').evaluate(el => el === document.activeElement);
    assert.ok(wrappedToLast, 'Shift+Tab dari elemen pertama harus melingkar ke tombol terakhir (Masuk ke Akun)');
    console.log('PASS: Shift+Tab dari elemen pertama melingkar ke elemen terakhir');

    // Batas trap arah sebaliknya: fokus di elemen TERAKHIR, Tab harus
    // melingkar kembali ke elemen PERTAMA (logo drawer).
    await page.keyboard.press('Tab');
    const wrappedToFirst = await page.locator('.kn-drawer-logo').evaluate(el => el === document.activeElement);
    assert.ok(wrappedToFirst, 'Tab dari elemen terakhir harus melingkar ke elemen pertama (logo drawer)');
    console.log('PASS: Tab dari elemen terakhir melingkar ke elemen pertama');

    // Escape menutup drawer dan mengembalikan fokus ke tombol hamburger.
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#knDrawer').getAttribute('aria-hidden'), 'true', 'Escape harus menutup drawer');
    assert.ok(await page.locator('#knHamburger').evaluate(el => el === document.activeElement),
      'fokus harus kembali ke tombol hamburger setelah drawer ditutup');
    console.log('PASS: Escape menutup drawer dan mengembalikan fokus ke hamburger');

    assert.deepEqual(errors, []);
    console.log('PASS: tanpa error JavaScript');
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
