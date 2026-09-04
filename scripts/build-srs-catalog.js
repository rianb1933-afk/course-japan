#!/usr/bin/env node
/**
 * Bangun assets/srs/ (core.js + shard ekor) dari assets/srs-cards-data.js.
 * ========================================================================
 *
 * Kenapa script ini ada
 * ---------------------
 * assets/srs-cards-data.js berukuran 7,14 MB dan dimuat sebagai <script src>
 * SINKRON (tanpa defer/async) oleh SRS-Flashcard.html dan SRS-Statistics.html,
 * jadi ia memblokir render. Isinya 100.000 baris, lalu seluruhnya di-map
 * menjadi array objek KEDUA di main thread. Keduanya `const` global sehingga
 * tidak pernah dikoleksi GC (±57 MB heap tertahan).
 *
 * Padahal sesi belajar normal cuma butuh puluhan kartu baru (batas NPCap),
 * dan halaman statistik hanya perlu metadata kartu yang benar-benar pernah
 * diulas. Jadi 7 MB itu dibayar di muka untuk sesuatu yang hampir tidak
 * pernah dipakai seluruhnya.
 *
 * KENAPA BISA DIPECAH — tiga sifat data yang diverifikasi, bukan diasumsikan
 * ------------------------------------------------------------------------
 *   1. Datanya sudah terurut: semua baris `cat:'jmdict'` berada kontigu di
 *      AKHIR array. Bagian depan ('jlpt' + 'vocab') adalah "inti".
 *   2. SEMUA kartu ber-level JLPT ada di bagian inti. Ekor 100% `jlpt:''`.
 *   3. `id` bersifat posisional: id === 'v' + String(i+1).padStart(5,'0').
 *
 * Karena (3), keanggotaan dan metadata (cat/jlpt/type) sebuah id bisa dihitung
 * O(1) TANPA memuat shard apa pun. Karena (1) dan (2), inti+kurasi sudah
 * menutup semua filter kecuali `jmdict`, `due`, dan `all` saat kuota "Lainnya"
 * disetel tak terbatas.
 *
 * Ketiganya DIPERIKSA di sini dan script GAGAL KERAS bila dilanggar. Kalau
 * suatu saat dataset berubah bentuk, lebih baik build berhenti daripada
 * diam-diam mengirim data yang bergeser.
 *
 * Keluaran
 * --------
 *   assets/srs/core.js       — eager, dimuat <script defer>. Berisi manifest
 *                              (SRS_CORE_META) + baris inti (SRS_CORE_RAW),
 *                              jadi jalur eager tidak butuh fetch sama sekali.
 *   assets/srs/tail-NN.json  — lazy, di-fetch hanya bila filter benar-benar
 *                              membutuhkannya. id dibuang (diturunkan dari
 *                              `start`) dan tiga kolom konstan (cat/jlpt/type)
 *                              tidak ikut ditulis.
 *
 * srs-cards-data.js SENGAJA tidak dihapus: ia tetap menjadi sumber yang bisa
 * diproduksi ulang. Yang dilakukan adalah berhenti mengirimnya ke CDN (lihat
 * scripts/prune-publish.sh).
 *
 * Pemakaian
 * ---------
 *     node scripts/build-srs-catalog.js            # tulis ulang assets/srs/
 *     node scripts/build-srs-catalog.js --check    # bandingkan saja, exit 1 bila basi
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.dirname(__dirname);
const SRC = path.join(ROOT, 'assets', 'srs-cards-data.js');
const OUT_DIR = path.join(ROOT, 'assets', 'srs');
const SHARD_SIZE = 5000;

const CHECK_ONLY = process.argv.includes('--check');

function fail(msg) {
  console.error('✖ build-srs-catalog: ' + msg);
  process.exit(1);
}

/** Ambil array literal SRS_CARDS_RAW tanpa eval — cari kurung siku terluar. */
function readSourceRows() {
  if (!fs.existsSync(SRC)) fail('sumber tidak ada: ' + path.relative(ROOT, SRC));
  const src = fs.readFileSync(SRC, 'utf8');
  const anchor = src.indexOf('SRS_CARDS_RAW');
  if (anchor === -1) fail('SRS_CARDS_RAW tidak ditemukan di ' + path.relative(ROOT, SRC));
  const start = src.indexOf('[', anchor);
  const end = src.indexOf('];', start);
  if (start === -1 || end === -1) fail('tidak bisa menemukan batas array SRS_CARDS_RAW');
  let rows;
  try {
    rows = JSON.parse(src.slice(start, end + 1));
  } catch (e) {
    fail('array SRS_CARDS_RAW bukan JSON yang valid: ' + e.message);
  }
  if (!Array.isArray(rows) || !rows.length) fail('SRS_CARDS_RAW kosong');
  return rows;
}

/**
 * Periksa ketiga sifat yang menjadi dasar seluruh arsitektur, dan kembalikan
 * batas inti/ekor. Semua pelanggaran menghentikan build.
 */
function verifyAndSplit(rows) {
  const total = rows.length;
  const seen = new Set();
  let firstJmdict = -1;

  for (let i = 0; i < total; i++) {
    const r = rows[i];
    if (!Array.isArray(r) || r.length < 6) fail(`baris ${i} bukan tuple 6 kolom`);
    const [id, jp, reading, meaning, cat, jlpt] = r;

    // (3) id posisional
    const expectId = 'v' + String(i + 1).padStart(5, '0');
    if (id !== expectId) {
      fail(`id tidak posisional di indeks ${i}: "${id}" (diharapkan "${expectId}").\n` +
           '  Arsitektur katalog bergantung pada id posisional untuk has()/metaOf() O(1).\n' +
           '  Bila dataset memang berubah, shard ekor harus menulis id eksplisit.');
    }
    if (seen.has(id)) fail(`id duplikat: ${id}`);
    seen.add(id);

    if (cat === 'jmdict') {
      if (firstJmdict === -1) firstJmdict = i;
    } else if (firstJmdict !== -1) {
      // (1) kontiguitas
      fail(`baris non-jmdict (cat="${cat}") di indeks ${i} muncul SESUDAH jmdict pertama ` +
           `(indeks ${firstJmdict}). Ekor harus kontigu di akhir.`);
    }

    if (typeof jp !== 'string' || typeof reading !== 'string' || typeof meaning !== 'string') {
      fail(`kolom teks bukan string di indeks ${i}`);
    }
    if (jlpt !== '' && firstJmdict !== -1 && i >= firstJmdict) {
      // (2) ekor tidak boleh ber-level
      fail(`kartu ekor ber-level JLPT di indeks ${i} (jlpt="${jlpt}"). ` +
           'Semua kartu ber-level harus ada di bagian inti.');
    }
  }

  if (firstJmdict === -1) fail('tidak ada baris cat="jmdict" — bentuk dataset tidak dikenali');

  return { coreCount: firstJmdict, total };
}

function humanKB(n) { return (n / 1024).toFixed(0).padStart(6) + ' KB'; }

function sizes(buf) {
  return {
    raw: buf.length,
    gzip: zlib.gzipSync(buf, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(buf, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

function main() {
  const rows = readSourceRows();
  const { coreCount, total } = verifyAndSplit(rows);

  const coreRows = rows.slice(0, coreCount);
  const tailRows = rows.slice(coreCount);

  // Hitungan dipakai halaman untuk semua angka filter tanpa memindai apa pun.
  const counts = { jlpt: 0, vocab: 0, jmdict: 0, N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, none: 0 };
  for (const r of rows) {
    const cat = r[4], jlpt = r[5];
    if (counts[cat] === undefined) counts[cat] = 0;
    counts[cat]++;
    if (jlpt) counts[jlpt] = (counts[jlpt] || 0) + 1; else counts.none++;
  }

  const shardCount = Math.ceil(tailRows.length / SHARD_SIZE);
  const version = crypto.createHash('sha256')
    .update(fs.readFileSync(SRC))
    .digest('hex').slice(0, 8);

  const meta = {
    v: version,
    total,
    coreCount,
    idPrefix: 'v',
    idPad: 5,
    // `type` konstan 'VOCAB' untuk SELURUH dataset (bukan hanya ekor) —
    // aslinya di-hardcode di .map() srs-cards-data.js.
    type: 'VOCAB',
    tail: {
      start: coreCount,
      count: tailRows.length,
      shard: SHARD_SIZE,
      files: shardCount,
      cat: 'jmdict',
      jlpt: '',
    },
    counts,
  };

  const banner = '/* Dibangun oleh scripts/build-srs-catalog.js — jangan diedit langsung. */\n';
  const coreJs = banner +
    'window.SRS_CORE_META = ' + JSON.stringify(meta) + ';\n' +
    'window.SRS_CORE_RAW = ' + JSON.stringify(coreRows) + ';\n';

  const shardFiles = [];
  for (let s = 0; s < shardCount; s++) {
    const slice = tailRows.slice(s * SHARD_SIZE, (s + 1) * SHARD_SIZE);
    const body = {
      start: coreCount + s * SHARD_SIZE,
      n: slice.length,
      // hanya jp/reading/meaning — id, cat, jlpt, type semuanya diturunkan
      rows: slice.map(r => [r[1], r[2], r[3]]),
    };
    shardFiles.push({
      name: `tail-${String(s).padStart(2, '0')}.json`,
      text: JSON.stringify(body),
    });
  }

  // ── mode --check: bandingkan saja ──
  if (CHECK_ONLY) {
    const stale = [];
    const corePath = path.join(OUT_DIR, 'core.js');
    if (!fs.existsSync(corePath) || fs.readFileSync(corePath, 'utf8') !== coreJs) stale.push('core.js');
    for (const f of shardFiles) {
      const p = path.join(OUT_DIR, f.name);
      if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== f.text) stale.push(f.name);
    }
    if (stale.length) {
      console.error(`✖ ${stale.length} berkas katalog SRS tidak sesuai sumbernya: ` +
        stale.slice(0, 5).join(', ') + (stale.length > 5 ? ', …' : '') +
        '\n  Jalankan: npm run build:srs');
      process.exit(1);
    }
    console.log(`✓ katalog SRS sudah sesuai sumbernya (core + ${shardCount} shard).`);
    return;
  }

  // ── tulis ──
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // buang shard lama yang tidak lagi dihasilkan, supaya tidak ada sisa basi
  for (const existing of fs.readdirSync(OUT_DIR)) {
    if (/^tail-\d+\.json$/.test(existing) && !shardFiles.some(f => f.name === existing)) {
      fs.unlinkSync(path.join(OUT_DIR, existing));
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'core.js'), coreJs, 'utf8');
  for (const f of shardFiles) fs.writeFileSync(path.join(OUT_DIR, f.name), f.text, 'utf8');

  // ── laporan ukuran ──
  const srcSize = sizes(fs.readFileSync(SRC));
  const coreSize = sizes(Buffer.from(coreJs, 'utf8'));
  let tailRaw = 0, tailGz = 0, tailBr = 0, worstShard = 0;
  for (const f of shardFiles) {
    const s = sizes(Buffer.from(f.text, 'utf8'));
    tailRaw += s.raw; tailGz += s.gzip; tailBr += s.brotli;
    if (s.brotli > worstShard) worstShard = s.brotli;
  }

  console.log(`  ${total.toLocaleString('id-ID')} kartu → inti ${coreCount.toLocaleString('id-ID')} + ekor ${tailRows.length.toLocaleString('id-ID')} (${shardCount} shard)\n`);
  console.log('                         mentah       gzip     brotli');
  console.log(`  srs-cards-data.js  ${humanKB(srcSize.raw)} ${humanKB(srcSize.gzip)} ${humanKB(srcSize.brotli)}   (lama, sinkron)`);
  console.log(`  srs/core.js        ${humanKB(coreSize.raw)} ${humanKB(coreSize.gzip)} ${humanKB(coreSize.brotli)}   (baru, defer)`);
  console.log(`  srs/tail-*.json    ${humanKB(tailRaw)} ${humanKB(tailGz)} ${humanKB(tailBr)}   (baru, lazy; terbesar ${(worstShard / 1024).toFixed(0)} KB br)`);
  const eagerCut = 100 - (coreSize.brotli / srcSize.brotli) * 100;
  console.log(`\n✓ byte eager (brotli) turun ${eagerCut.toFixed(1)}% — dan 0 byte memblokir render (defer).`);
  console.log(`  versi katalog: ${version}`);
}

main();
