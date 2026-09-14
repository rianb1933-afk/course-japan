#!/usr/bin/env node
/**
 * scripts/tests/browser/test-ssw-flow.js
 *
 * Rantai belajar SSW pilot Kaigo, dijalankan di browser sungguhan:
 *
 *   Field-Dashboard → Lesson → Vocabulary → Kanji/Grammar/Listening/Reading
 *     → Quiz → Mock Exam → Progress
 *
 * KENAPA PERLU BROWSER
 * Unit test (scripts/tests/test-ssw-*.js) menjaga kontrak data dan mesin
 * penilaian, tapi tidak pernah membuktikan bahwa progres yang ditulis satu
 * halaman benar-benar MUNCUL di halaman berikutnya. Kelas bug yang sudah
 * terbukti nyata di rantai ini semuanya tak bersuara: progress bar yang
 * permanen 0% karena penyaring tidak pernah cocok, halaman yang jadi
 * cangkang kosong karena seed-nya tidak dimuat, dan tombol "Lanjutkan"
 * yang mengarah ke halaman yang salah. Tidak satu pun memunculkan error.
 *
 * Dijalankan di dua lebar: desktop dan ponsel (390px). Selain alurnya,
 * lebar ponsel diperiksa agar tidak ada scroll horizontal — navigator
 * nomor soal dan baris menjodohkan adalah bagian yang paling mudah melebar.
 *
 * SENGAJA DIPISAH dari `npm test` — lihat catatan yang sama di
 * test-kaigo-simulator.js (Chromium tidak ikut ditarik CI).
 *
 * CARA MENJALANKAN:
 *   npx playwright install chromium   (sekali saja, bila belum ada)
 *   npm run test:ssw-flow-browser
 */

const path = require('path');
const { spawn } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('❌ Playwright tidak ditemukan. Install dulu: npm install -D playwright');
  process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const PORT = 8962;
const BASE = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { nama: 'desktop', width: 1280, height: 860 },
  { nama: 'ponsel 390px', width: 390, height: 844 },
];

function waitForServer(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const http = require('http');
    (function coba() {
      const req = http.get(url, res => { res.resume(); resolve(); });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('server tidak merespons'));
        else setTimeout(coba, 200);
      });
    })();
  });
}

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? '✅' : '❌'} ${name}${detail ? '\n     ' + detail : ''}`);
}

/* Jawab soal yang sedang tampil, apa pun tipenya. Dipakai Quiz (semua soal
   dalam satu halaman) maupun Mock Exam (satu soal per layar). */
async function jawabDalam(scope) {
  return scope.evaluate(el => {
    const opt = el.querySelector('.ssw-opt');
    const fill = el.querySelector('.ssw-fill');
    const sels = el.querySelectorAll('select');
    if (opt) { opt.click(); return 'pilihan'; }
    if (fill) { fill.value = 'にゅうよく'; fill.dispatchEvent(new Event('input', { bubbles: true })); return 'isian'; }
    if (sels.length) {
      sels.forEach(s => { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); });
      return 'menjodohkan';
    }
    return 'kosong';
  });
}

async function overflowHorizontal(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

async function jalankan(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const L = s => `[${vp.nama}] ${s}`;
  page.on('dialog', d => d.accept());

  try {
    // ── 1. Dashboard bidang, keadaan bersih ──
    await page.goto(`${BASE}/SSW/Field-Dashboard.html?field=kaigo`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.removeItem('np-ssw-v1'));
    await page.reload({ waitUntil: 'networkidle' });
    const awal = await page.evaluate(() => ({
      persen: document.getElementById('heroPercent').textContent,
      lesson: document.querySelectorAll('.ssw-lesson-item').length,
    }));
    record(L('1. Dashboard memuat bidang + daftar lesson, progres mulai 0%'),
      awal.lesson > 0 && awal.persen === '0%', `lesson=${awal.lesson}, persen=${awal.persen}`);

    // ── 2. Lesson: tandai selesai ──
    await page.goto(`${BASE}/SSW/Lesson.html?field=kaigo&lesson=l-kaigo-1`, { waitUntil: 'networkidle' });
    await page.click('#btnComplete');
    const lesson = await page.evaluate(() => ({
      tombol: document.getElementById('btnComplete').textContent.trim(),
      tersimpan: (JSON.parse(localStorage.getItem('np-ssw-v1') || '{}').progress || {})['lesson:l-kaigo-1'],
    }));
    record(L('2. Lesson bisa ditandai selesai dan tercatat dengan bidangnya'),
      lesson.tombol.includes('Selesai') && lesson.tersimpan && lesson.tersimpan.field === 'kaigo',
      `tombol="${lesson.tombol}", field=${lesson.tersimpan && lesson.tersimpan.field}`);

    // ── 3. Vocabulary: flashcard menandai kosakata dipelajari ──
    // Mode flashcard ada di balik <select id="viewMode">; tampilan bawaannya
    // daftar, dan zona flashcard-nya hidden sampai mode itu dipilih.
    await page.goto(`${BASE}/SSW/Vocabulary.html?field=kaigo`, { waitUntil: 'networkidle' });
    await page.selectOption('#viewMode', 'flashcard');
    await page.waitForSelector('#fcNext', { state: 'visible' });

    // Prev/Next ADA DI SISI BELAKANG kartu (.fcv-back), jadi alur nyatanya:
    // balik kartu dulu, baru tombolnya bisa ditekan. Sebelum dibalik, muka
    // depan menutupinya — itu desain, bukan tumpang tindih yang keliru.
    // paintFlashcard() melepas kelas .flipped tiap ganti kartu, jadi tiap
    // langkah harus dibalik lagi. Diklik sungguhan (bukan dispatch) supaya
    // keterjangkauan tombolnya ikut teruji.
    await page.click('#flashcard');
    const bisaDiklik = await page.locator('#fcNext').isEnabled()
      && await page.evaluate(() => document.querySelector('.ssw-flashcard').classList.contains('flipped'));
    record(L('3a. Kartu bisa dibalik dan tombol navigasinya terjangkau di sisi belakang'), bisaDiklik);

    for (let i = 0; i < 3; i++) {
      await page.click('#fcNext');
      await page.click('#flashcard');   // kartu berikutnya kembali tertutup
    }
    const vocab = await page.evaluate(() => {
      const p = (JSON.parse(localStorage.getItem('np-ssw-v1') || '{}').progress) || {};
      return Object.entries(p).filter(([k, v]) => k.startsWith('vocab:') && v.completed).length;
    });
    record(L('3. Flashcard vocabulary menandai kosakata dipelajari'), vocab >= 3, `vocab selesai=${vocab}`);

    // Mengetik di pencarian TIDAK boleh menulis progres (dulu satu penulisan
    // per kartu per ketikan — ratusan POST saat pengguna login).
    await page.selectOption('#viewMode', 'list');
    const sebelum = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('np-ssw-v1') || '{}').progress || {}));
    await page.fill('#searchBox', 'kaigo');
    await page.waitForTimeout(150);
    const sesudah = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('np-ssw-v1') || '{}').progress || {}));
    record(L('3b. Mengetik di pencarian tidak menulis progres apa pun'), sebelum === sesudah);

    // ── 3c. Kanji/Grammar/Listening/Reading merender kontennya ──
    // Keempatnya dulu kerangka "segera lengkap" meski dashboard sudah
    // menghitung itemnya dan menautkan ke sana.
    const konten = {};
    for (const hal of ['Kanji', 'Grammar', 'Listening', 'Reading']) {
      await page.goto(`${BASE}/SSW/${hal}.html?field=kaigo`, { waitUntil: 'networkidle' });
      konten[hal] = await page.evaluate(() => ({
        kartu: document.querySelectorAll('#sswItems .ct-card').length,
        kosong: !document.getElementById('sswEmpty').hidden,
      }));
    }
    record(L('3c. Kanji/Grammar/Listening/Reading menampilkan kartu konten'),
      Object.values(konten).every(k => k.kartu > 0 && !k.kosong),
      Object.entries(konten).map(([h, k]) => `${h}=${k.kartu}`).join(', '));

    // Halaman terakhir yang dibuka: Reading. Jawab satu soal & tandai dipahami.
    await page.click('#sswItems .ssw-q .ssw-opt');
    await page.click('#sswItems .ct-done');
    const baca = await page.evaluate(() => ({
      pembahasan: !document.querySelector('#sswItems .ssw-q .ssw-expl').hidden,
      dinilai: !!document.querySelector('#sswItems .ssw-q .ssw-opt.correct'),
      tersimpan: (JSON.parse(localStorage.getItem('np-ssw-v1') || '{}').progress || {})['reading:r-kaigo-1'],
    }));
    record(L('3d. Soal bacaan dinilai + pembahasan tampil, "dipahami" tercatat dengan bidangnya'),
      baca.pembahasan && baca.dinilai && baca.tersimpan && baca.tersimpan.completed && baca.tersimpan.field === 'kaigo',
      `pembahasan=${baca.pembahasan}, dinilai=${baca.dinilai}, field=${baca.tersimpan && baca.tersimpan.field}`);

    // ── 3e. Modul hasil generator (kaigo-m05) lewat cadangan statis ──
    // Tanpa Supabase, konten scripts/ssw-curriculum/ hanya sampai ke pengguna
    // lewat assets/ssw-content/*.json. Lesson-nya pernah macet di "Memuat
    // lesson…" (breadcrumb dihapus navbar sebelum data selesai dimuat) tanpa
    // satu langkah pun di test ini yang membuka lesson generator.
    await page.goto(`${BASE}/SSW/Lesson.html?field=kaigo&lesson=kaigo-m05-l3`, { waitUntil: 'networkidle' });
    const gen = await page.evaluate(() => ({
      judul: document.getElementById('lessonTitle').textContent,
      tautan: document.querySelectorAll('.ssw-lesson-body a[href^="/Materi/"]').length,
    }));
    await page.goto(`${BASE}/SSW/Quiz.html?field=kaigo&quiz=kaigo-m05-quiz`, { waitUntil: 'networkidle' });
    const genSoal = await page.evaluate(() => document.querySelectorAll('.ssw-q').length);
    record(L('3e. Modul hasil generator tampil offline: lesson + tautan pendalaman, kuis dari bank statis'),
      gen.judul !== 'Memuat lesson…' && gen.tautan > 0 && genSoal >= 10,
      `judul="${gen.judul}", tautan=${gen.tautan}, soal=${genSoal}`);

    // ── 4. Quiz: kerjakan sampai muncul skor ──
    await page.goto(`${BASE}/SSW/Quiz.html?field=kaigo&quiz=qz-kaigo-1`, { waitUntil: 'networkidle' });
    const soalQuiz = await page.locator('#questionWrap .ssw-q').count();
    for (let i = 0; i < soalQuiz; i++) await jawabDalam(page.locator('#questionWrap .ssw-q').nth(i));
    await page.click('#btnSubmit');
    await page.waitForSelector('#viewResult.active', { timeout: 5000 });
    const quiz = await page.evaluate(() => ({
      skor: document.getElementById('scoreNum').textContent,
      review: document.querySelectorAll('#reviewWrap .ssw-q').length,
      tersimpan: (JSON.parse(localStorage.getItem('np-ssw-v1') || '{}').progress || {})['quiz:qz-kaigo-1'],
    }));
    record(L('4. Quiz dinilai, pembahasan tampil, hasil masuk progres'),
      /%$/.test(quiz.skor) && quiz.review === soalQuiz && Boolean(quiz.tersimpan && quiz.tersimpan.completed),
      `skor=${quiz.skor}, review=${quiz.review}/${soalQuiz}`);

    // ── 5. Mock exam: timer, navigator, submit ──
    await page.goto(`${BASE}/SSW/Mock-Exam.html?field=kaigo&exam=qz-kaigo-mock`, { waitUntil: 'networkidle' });
    await page.click('#btnStart');
    await page.waitForSelector('.ssw-navbtn');
    const timerAwal = await page.textContent('#timerText');
    const jumlahNav = await page.locator('.ssw-navbtn').count();

    // Tandai satu soal untuk ditinjau, lalu pastikan penandanya terlihat.
    await page.click('#btnFlag');
    const adaTanda = await page.locator('.ssw-navbtn.flagged').count();

    for (let i = 0; i < jumlahNav; i++) {
      await page.locator('.ssw-navbtn').nth(i).click();
      await jawabDalam(page.locator('#questionWrap .ssw-q'));
    }
    const overflowUjian = await overflowHorizontal(page);
    await page.click('#btnSubmit');
    await page.waitForSelector('#viewResult.active', { timeout: 5000 });
    const mock = await page.evaluate(() => ({
      skor: document.getElementById('scoreNum').textContent,
      sub: document.getElementById('scoreSub').textContent,
    }));
    record(L('5. Mock exam: timer berjalan, navigator + penanda review, submit dinilai'),
      /^\d?\d:\d\d$/.test(timerAwal) && jumlahNav > 0 && adaTanda === 1 && /%$/.test(mock.skor),
      `timer=${timerAwal}, nav=${jumlahNav}, ditandai=${adaTanda}, skor=${mock.skor}`);
    record(L('5b. Batas lulus kuis dipakai apa adanya di ringkasan hasil'),
      /batas lulus \d+%/.test(mock.sub), mock.sub);

    // ── 6. Progress: seluruh jejak di atas harus muncul ──
    await page.goto(`${BASE}/SSW/Progress.html?field=kaigo`, { waitUntil: 'networkidle' });
    const prog = await page.evaluate(() => ({
      persen: document.getElementById('fieldPercent').textContent,
      riwayat: document.querySelectorAll('#historyList .ssw-hrow').length,
      ringkas: document.getElementById('scoreSummary').textContent,
      lanjut: document.getElementById('continueLink').getAttribute('href'),
      bidang: document.querySelectorAll('#allFields .ssw-hrow').length,
      terdaftar: ((window.NP_SSW_SEED || {}).categories || []).length,
    }));
    record(L('6. Progress menampilkan progres, riwayat 2 percobaan, dan skor terbaik'),
      prog.persen !== '0%' && prog.riwayat === 2 && /Skor terbaik/.test(prog.ringkas),
      `persen=${prog.persen}, riwayat=${prog.riwayat}`);
    record(L('6b. "Lanjutkan" mengarah ke Mock-Exam (bukan Quiz) sesudah simulasi'),
      String(prog.lanjut).includes('/SSW/Mock-Exam.html'), `href=${prog.lanjut}`);
    // Dibandingkan dengan seed, bukan angka tetap: daftar ISA berubah
    // (12 → 14 → 17 bidang) dan angka tetap di sini ikut basi tiap kali.
    record(L('6c. Semua bidang terdaftar di ringkasan lintas bidang'),
      prog.terdaftar > 0 && prog.bidang === prog.terdaftar, `bidang=${prog.bidang}/${prog.terdaftar}`);

    // ── 7. Tata letak & konsol ──
    const overflowProgress = await overflowHorizontal(page);
    record(L('7. Tidak ada scroll horizontal di halaman ujian & progress'),
      !overflowUjian && !overflowProgress, `ujian=${overflowUjian}, progress=${overflowProgress}`);
    record(L('8. 0 error konsol di seluruh rantai'), errors.length === 0,
      errors.length ? errors.slice(0, 3).join(' | ') : 'bersih');
  } catch (e) {
    record(L('rantai selesai tanpa exception'), false, e.message);
  } finally {
    await ctx.close();
  }
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: PROJECT_ROOT, stdio: ['ignore', 'ignore', 'ignore'] });

  try {
    await waitForServer(`${BASE}/index.html`, 10000);
  } catch (e) {
    console.error('❌ server lokal gagal start:', e.message);
    server.kill();
    process.exit(1);
  }

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const vp of VIEWPORTS) await jalankan(browser, vp);
  await browser.close();
  server.kill();

  const lulus = results.filter(r => r.passed).length;
  const gagal = results.length - lulus;
  console.log('\n' + '='.repeat(60));
  console.log(`RESULT: ${lulus}/${results.length} passed`);
  if (gagal) {
    console.log('\nGagal:');
    results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }
  process.exit(gagal > 0 ? 1 : 0);
})();
