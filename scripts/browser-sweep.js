#!/usr/bin/env node
/**
 * Sapu seluruh modul Kaigo di Chromium sungguhan.
 * ==============================================
 *
 * Kenapa ada, padahal sudah ada validator
 * ---------------------------------------
 * scripts/validate.py membaca SUMBER. Ia bisa memastikan tiap penjelasan kuis
 * memuat kalimat Indonesia di dalam berkas HTML — tapi tidak bisa memastikan
 * kalimat itu SAMPAI KE LAYAR. Di antara keduanya ada JavaScript yang bisa
 * gagal, selektor yang bisa meleset, dan mesin kuis yang bisa tidak terpanggil.
 *
 * Riwayat repo ini membuktikan jaraknya nyata: pernah 93 halaman punya tombol
 * "berikutnya" yang mati (nQ is not defined) dan 83 halaman punya grid kosakata
 * kosong (PH_VOCAB is not defined) — semuanya lolos pemeriksaan sumber, semuanya
 * ketahuan begitu halamannya benar-benar dibuka.
 *
 * Yang dibuktikan untuk tiap modul
 * --------------------------------
 *   1. termuat tanpa page error
 *   2. kuisnya benar-benar merender opsi
 *   3. satu opsi bisa diklik
 *   4. kotak penjelasan terisi SESUDAH menjawab (dan kosong sebelumnya —
 *      penjelasan yang sudah tampil duluan berarti jawabannya bocor)
 *   5. penjelasan itu memuat kalimat Indonesia utuh minimal 40 karakter
 *
 * TIGA MESIN KUIS HIDUP BERDAMPINGAN DI REPO INI
 * ----------------------------------------------
 *   lama     .qopt   → .qexp
 *   baru     .q-opt  → #qFb
 *   mandiri  .q-opt  → .q-fb   (id per-widget: #q1Fb .. #q4Fb)
 *
 * Ini sudah dua kali memakan korban. Versi pertama skrip ini hanya tahu dua
 * yang pertama, lalu melaporkan Kaigo-Ujian-Nasional GAGAL — padahal halaman
 * itu sehat, cuma memakai mesin ketiga. Sebelumnya Kaigo-Komunikasi tertuduh
 * dengan sebab yang sama. Kalau menambah mesin kuis baru, tambahkan
 * selektornya di FEEDBACK di bawah, atau skrip ini akan berbohong.
 *
 * Tidak ikut `npm test` karena butuh ~2 menit dan sebuah browser. Jalankan
 * sesudah menyunting banyak modul sekaligus.
 *
 * Pemakaian
 * ---------
 *     node scripts/browser-sweep.js            # seluruh 100 modul Kaigo
 *     node scripts/browser-sweep.js Kaigo-CPR  # saring per nama
 */

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const OPSI = '.qopt, .q-opt';
const FEEDBACK = '.qexp, #qFb, .q-exp, .q-fb';

// Sama persis dengan check_explanation_id_coverage di validate.py: sebuah
// rangkaian Latin >= 40 karakter yang memuat penanda bahasa Indonesia.
const LATIN = /[A-Za-z][A-Za-z0-9 ,.;:'"()\-—/%\\]{39,}/g;
const IDN =
  /\b(yang|dan|untuk|dengan|pada|dari|atau|tidak|adalah|bisa|agar|saat|oleh|dalam|secara|harus|dapat|perlu|karena|bukan|lewat|pun|juga|setiap|seperti|hingga|sampai|bila|maupun|berarti|menjadi|antara|tanpa|lebih|sendiri|orang|kerja|hidup|ini|itu|ia|sebagai|serta|sudah|masih|belum|hanya|akan|supaya|sehingga|namun|tetapi|atas|tiap|kepada|bagi|semua|banyak|kalau|justru)\b|\b(?:me[mnl]?[a-z]{3,}|ber[a-z]{4,}|pe[mn]?[a-z]{4,}an|ke[a-z]{4,}an)\b/i;

const punyaKalimatIndonesia = (t) => (t.match(LATIN) || []).some((r) => IDN.test(r));

function daftarModul(saring) {
  const out = execFileSync(
    'python3',
    ['-c',
     'import sys,json; sys.path.insert(0,"scripts"); from kaigo_catalog import MODULES; ' +
     'print(json.dumps([m["filename"] for m in MODULES.values()]))'],
    { cwd: ROOT, encoding: 'utf8' }
  );
  const semua = JSON.parse(out);
  return saring ? semua.filter((f) => f.includes(saring)) : semua;
}

(async () => {
  const modul = daftarModul(process.argv[2]);
  if (!modul.length) {
    console.error('Tidak ada modul yang cocok.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const hasil = [];

  for (const file of modul) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));

    const r = { file, errors, opsi: 0, penjelasan: null, idn: false, bocor: false };
    try {
      await page.goto(`file://${ROOT}/Materi/${file}`, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(500);

      r.opsi = await page.evaluate((s) => document.querySelectorAll(s).length, OPSI);

      if (r.opsi > 0) {
        r.bocor = await page.evaluate((s) => {
          const e = document.querySelector(s);
          return !!(e && e.innerText.trim());
        }, FEEDBACK);

        await page.click(OPSI);
        await page.waitForTimeout(400);

        r.penjelasan = await page.evaluate((s) => {
          const e = document.querySelector(s);
          return e ? e.innerText.trim() : null;
        }, FEEDBACK);
        r.idn = r.penjelasan ? punyaKalimatIndonesia(r.penjelasan) : false;
      }
    } catch (e) {
      r.errors.push('NAVIGASI: ' + e.message.split('\n')[0]);
    }
    await page.close();
    hasil.push(r);
    process.stdout.write(
      r.errors.length ? 'E' : !r.opsi ? '?' : r.bocor ? '!' : r.idn ? '.' : 'x'
    );
  }

  await browser.close();
  console.log('\n');

  const golongan = [
    ['page error', hasil.filter((r) => r.errors.length)],
    ['tanpa opsi kuis terender', hasil.filter((r) => !r.errors.length && !r.opsi)],
    ['diklik tapi penjelasan kosong', hasil.filter((r) => r.opsi && !r.penjelasan)],
    ['penjelasan tanpa kalimat Indonesia', hasil.filter((r) => r.penjelasan && !r.idn)],
    ['penjelasan bocor SEBELUM menjawab', hasil.filter((r) => r.bocor)],
  ];

  console.log(`  ${hasil.length} modul disapu di Chromium\n`);
  for (const [label, arr] of golongan) {
    console.log(`  ${String(arr.length).padStart(3)}  ${label}`);
    arr.slice(0, 6).forEach((r) => {
      const ket = r.errors[0] || (r.penjelasan || '').slice(0, 80).replace(/\n/g, ' ');
      console.log(`       ${r.file}${ket ? '  — ' + ket : ''}`);
    });
    if (arr.length > 6) console.log(`       …dan ${arr.length - 6} lagi`);
  }

  const lulus = hasil.filter(
    (r) => !r.errors.length && r.opsi && r.penjelasan && r.idn && !r.bocor
  ).length;
  console.log(`\n  ${lulus}/${hasil.length} modul lulus kelima-limanya`);
  process.exit(lulus === hasil.length ? 0 : 1);
})();
