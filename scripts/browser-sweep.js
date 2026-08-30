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
 *     node scripts/browser-sweep.js --all      # SELURUH Materi/*.html
 *
 * --all menyisir 379 halaman, bukan hanya modul Kaigo. Mode itulah yang
 * menemukan `rndZ is not defined` di empat halaman Kaiwa: sisa refactor, saat
 * kode kuis dipindah ke kaigo-quiz.js dan definisi fungsinya ikut pergi tapi
 * panggilannya tertinggal. Kuisnya tetap terender oleh mesin bersama, jadi
 * tidak ada yang menyadarinya — hanya sebuah error diam di konsol setiap kali
 * halaman dibuka.
 *
 * SATU DERAU YANG BUKAN BUG
 * Halaman dibuka lewat file://, jadi rujukan path absolut seperti
 * "/assets/logo-neko.svg" menunjuk akar filesystem dan gagal diambil —
 * muncul sebagai "Failed to fetch". Di server sungguhan path itu benar.
 * Abaikan; jangan menghabiskan waktu mengejarnya.
 */

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const OPSI = '.qopt, .q-opt';
const FEEDBACK = '.qexp, #qFb, .q-exp, .q-fb';

// Sama persis dengan check_explanation_id_coverage di validate.py: sebuah
// rangkaian Latin yang memuat penanda bahasa Indonesia — DUA AMBANG, karena
// bentuk isinya berbeda. Modul Kaigo memakai paragraf Jepang panjang yang
// modus gagalnya satu kata dalam kurung, jadi ambangnya 40. Halaman non-Kaigo
// berisi butir tata bahasa yang memang ringkas ("berapa umurmu?" adalah
// terjemahan lengkap), jadi ambangnya 15.
//
// Kedua angka ini HARUS sama dengan validate.py. Sempat berbeda, dan skrip ini
// lalu melaporkan 43 halaman gagal padahal semuanya sudah diterjemahkan —
// alat ukur yang tidak sepakat dengan pagarnya hanya menyesatkan.
const LATIN_KAIGO = /[A-Za-z][A-Za-z0-9 ,.;:'"()\-—/%\\→·×]{39,}/g;
const LATIN_LAIN = /[A-Za-z][A-Za-z0-9 ,.;:'"()\-—/%\\→·×]{14,}/g;
const IDN =
  /\b(yang|dan|untuk|dengan|pada|dari|atau|tidak|adalah|bisa|agar|saat|oleh|dalam|secara|harus|dapat|perlu|karena|bukan|lewat|pun|juga|setiap|seperti|hingga|sampai|bila|maupun|berarti|menjadi|antara|tanpa|lebih|sendiri|orang|kerja|hidup|ini|itu|ia|sebagai|serta|sudah|masih|belum|hanya|akan|supaya|sehingga|namun|tetapi|atas|tiap|kepada|bagi|semua|banyak|kalau|justru)\b|\b(?:me[mnl]?[a-z]{3,}|ber[a-z]{4,}|pe[mn]?[a-z]{4,}an|ke[a-z]{4,}an)\b/i;

const punyaKalimatIndonesia = (t, kaigo) =>
  (t.match(kaigo ? LATIN_KAIGO : LATIN_LAIN) || []).some((r) => IDN.test(r));

function daftarModul(saring) {
  if (saring === '--all') {
    return require('fs')
      .readdirSync(path.join(ROOT, 'Materi'))
      .filter((f) => f.endsWith('.html'))
      .sort();
  }
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
        r.idn = r.penjelasan
          ? punyaKalimatIndonesia(r.penjelasan, file.startsWith('Kaigo-'))
          : false;
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

  // Halaman tanpa kuis BUKAN kegagalan. Materi/ berisi 119 halaman rujukan —
  // flashcard, lembar contekan, daftar kosakata — yang memang tidak punya
  // kuis. Menghitungnya sebagai gagal membuat angka utama berbohong: pernah
  // terbaca "200/327 lulus" padahal tidak satu pun halaman berkuis bermasalah.
  const takBerkuis = hasil.filter((r) => !r.errors.length && !r.opsi);
  const berkuis = hasil.filter((r) => r.opsi > 0);

  const golongan = [
    ['page error', hasil.filter((r) => r.errors.length)],
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

  const lulus = berkuis.filter(
    (r) => !r.errors.length && r.penjelasan && r.idn && !r.bocor
  ).length;
  console.log(`\n  ${takBerkuis.length} halaman rujukan tanpa kuis (bukan kegagalan)`);
  console.log(`  ${lulus}/${berkuis.length} halaman BERKUIS lulus semuanya`);
  process.exit(lulus === berkuis.length && !hasil.some((r) => r.errors.length) ? 0 : 1);
})();
