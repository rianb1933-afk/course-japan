#!/usr/bin/env node
/**
 * Bangun assets/kanji-bank.json dari halaman Materi/Kanji-N*.html.
 * =================================================================
 *
 * Kenapa script ini ada
 * ---------------------
 * Data kanji satu-satunya yang berbahasa Indonesia di repo ini tertanam
 * di dalam empat halaman Materi, masing-masing dengan bentuk berbeda:
 * N5 memakai `const kanjiN5`, N3 dan N2 memakai nama serupa, dan N4 tidak
 * punya array bernama sama sekali. Variabelnya juga tidak global, jadi tidak
 * bisa dibaca dari luar.
 *
 * Sementara itu Kanji-Trainer-Pro.html mengiklankan "lebih dari 2.000 kanji"
 * dengan rincian N5·80 N4·166 N3·367 N2·367 N1·1000+, padahal KANJI_DB
 * miliknya hanya berisi 92 entri (N5:82, N4:10). Memilih N3, N2, atau N1 di
 * sana tidak menghasilkan apa pun.
 *
 * Jadi datanya ADA, hanya terkurung di halaman yang tidak bisa dibaca
 * halaman lain.
 *
 * KENAPA DIAMBIL DARI DOM, BUKAN DARI SUMBER
 * ------------------------------------------
 * Bentuk arraynya berbeda-beda per halaman dan satu di antaranya tidak punya
 * array sama sekali — mem-parse empat bentuk berbeda dengan regex berarti
 * empat cara baru untuk salah diam-diam. Yang dirender ke DOM justru seragam
 * (#kanjiGrid > .kanji-card) di keempatnya, dan yang lebih penting: itulah
 * yang benar-benar dilihat pengguna. Kalau sebuah kartu tidak muncul di
 * layar, ia memang tidak ada.
 *
 * CATATAN ISI: N5 dan N4 punya on-yomi/kun-yomi; N3 dan N2 TIDAK — kartunya
 * hanya memuat arti dan petunjuk belajar. Itu kekurangan data yang nyata,
 * dicatat apa adanya di sini (bacaannya dikosongkan) alih-alih ditebak.
 *
 * Pemakaian
 * ---------
 *     node scripts/build-kanji-bank.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'kanji-bank.json');
const LEVEL = ['N5', 'N4', 'N3', 'N2'];
const PORT = 8917;

// Halaman memuat asetnya lewat path relatif, jadi file:// pun cukup —
// tapi beberapa skrip bersama mengambil data lewat fetch, yang diblokir di
// file://. Server sekali pakai menghindari seluruh kelas masalah itu.
function layani() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(p, (e, data) => {
        if (e) { res.writeHead(404); res.end(); return; }
        const ext = path.extname(p);
        res.writeHead(200, {
          'Content-Type': ext === '.html' ? 'text/html; charset=utf-8'
            : ext === '.js' ? 'text/javascript'
            : ext === '.css' ? 'text/css'
            : ext === '.json' ? 'application/json' : 'application/octet-stream',
        });
        res.end(data);
      });
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

(async () => {
  const srv = await layani();
  const browser = await chromium.launch();
  const bank = [];
  const ringkas = {};

  for (const lv of LEVEL) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', () => {});
    await page.goto(`http://localhost:${PORT}/Materi/Kanji-${lv}.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);

    const rows = await page.evaluate((level) => {
      const grid = document.querySelector('#kanjiGrid');
      if (!grid) return [];
      const bersih = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
      return [...grid.children].map((c) => {
        const tags = [...c.querySelectorAll('.tag')].map((t) => t.textContent.trim());
        const bacaan = [...c.querySelectorAll('.reading')].map((r) => r.textContent.replace(/\s+/g, ' ').trim());
        const on = (bacaan.find((b) => /^On:/i.test(b)) || '').replace(/^On:\s*/i, '');
        const kun = (bacaan.find((b) => /^Kun:/i.test(b)) || '').replace(/^Kun:\s*/i, '');
        return {
          k: bersih(c.querySelector('.char')),
          lv: level,
          arti: bersih(c.querySelector('.meaning')),
          on, kun,
          kat: tags[1] || '',
        };
      }).filter((x) => x.k && x.arti);
    }, lv);

    // Aksara ganda antar-level: yang pertama menang (level lebih mudah).
    let baru = 0;
    for (const r of rows) {
      if (bank.some((b) => b.k === r.k)) continue;
      bank.push(r); baru++;
    }
    ringkas[lv] = { dirender: rows.length, masuk: baru,
                    berbacaan: rows.filter((r) => r.on || r.kun).length };
    await page.close();
  }

  await browser.close();
  srv.close();

  fs.writeFileSync(OUT, JSON.stringify(bank), 'utf8');

  console.log(`  ${bank.length} kanji unik → ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)\n`);
  for (const lv of LEVEL) {
    const s = ringkas[lv];
    const catatan = s.berbacaan === 0 ? '  ⚠️ tanpa on/kun sama sekali'
      : s.berbacaan < s.dirender ? `  (${s.berbacaan} berbacaan)` : '';
    console.log(`     ${lv}: ${String(s.dirender).padStart(3)} dirender · ${String(s.masuk).padStart(3)} masuk${catatan}`);
  }
  const tanpa = bank.filter((b) => !b.on && !b.kun).length;
  if (tanpa) console.log(`\n  ${tanpa} entri tanpa on/kun — kekurangan data di sumbernya, bukan di sini.`);
})();
