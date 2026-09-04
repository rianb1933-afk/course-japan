#!/usr/bin/env node
/**
 * Terjemahan kurasi Indonesia untuk daftar kata JLPT per tingkat.
 *
 * Cara pakai:
 *   node scripts/translate-kosakata.js n5        # tulis ulang glos page-data tingkat n5
 *   node scripts/translate-kosakata.js n5 --check  # cek cakupan mapping tanpa menulis
 *   node scripts/translate-kosakata.js all --merge # sinkronkan meaning_id ke vocab-all.csv
 *
 * Mapping kurasi: scripts/data/id-gloss-<level>-*.json
 *   Setiap berkas: { "from": <indeks awal>, "glosses": ["arti", ...] }
 *   Array glosses sejajar urutan VOCAB pada assets/page-data/kosakata-<level>-data.js.
 *   Glos kosong ("") berarti pertahankan glos lama (fallback Inggris).
 *
 * Konvensi repo (v353): meaning_id hanya diisi hasil kurasi; tidak menimpa
 * meaning_id terverifikasi yang sudah ada.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'];

// Blok entri terkontaminasi (konten salah tingkat + glos MT rusak) yang harus
// dibuang dari daftar. Format: [indeksAwal, indeksAkhirExclusive) per tingkat.
const TRIMS = { n4: [[680, 995]], n2: [[1748, 2548], [3659, 3678]], n1: [[2927, 2934]] };

// ── pemindai array literal JS (paham string ber-tanda kutip + escape) ──
function findArrayRange(src, marker) {
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('Marker tidak ditemukan: ' + marker);
  const arrStart = start + marker.length;
  let i = arrStart, depth = 1, inStr = false, q = ''; // 1 = kurung pembuka '['
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === q) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; q = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return [arrStart, i + 1]; }
  }
  throw new Error('Array tidak tertutup: ' + marker);
}

function parseVocab(file) {
  const src = fs.readFileSync(file, 'utf8');
  const [a, b] = findArrayRange(src, 'const VOCAB = [');
  const raw = src.slice(a - 1, b); // sertakan '[' pembuka
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    // cadangan: jalankan sebagai JS (aman — data statis lokal)
    arr = new Function('return ' + raw + ';')();
  }
  if (!Array.isArray(arr)) throw new Error('VOCAB bukan array');
  return { src, a: a - 1, b, arr };
}

function loadChunks(level) {
  const dir = path.join(ROOT, 'scripts', 'data');
  const files = fs.readdirSync(dir)
    .filter((f) => new RegExp('^id-gloss-' + level + '-\\d+\\.json$').test(f))
    .sort((x, y) => parseInt(x.match(/-(\d+)\.json$/)[1], 10) - parseInt(y.match(/-(\d+)\.json$/)[1], 10));
  if (!files.length) throw new Error('Tidak ada mapping untuk ' + level + ' di ' + dir);
  const chunks = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  chunks.sort((x, y) => x.from - y.from);
  // gabung & pastikan kontigu
  const total = chunks[chunks.length - 1].from + chunks[chunks.length - 1].glosses.length;
  const merged = new Array(total).fill('');
  for (const c of chunks) {
    for (let i = 0; i < c.glosses.length; i++) merged[c.from + i] = c.glosses[i];
  }
  for (let i = 0; i < total; i++) {
    if (typeof merged[i] !== 'string') throw new Error('Celah mapping di indeks ' + i);
  }
  return merged;
}

function applyLevel(level, write) {
  const dataFile = path.join(ROOT, 'assets', 'page-data', 'kosakata-' + level + '-data.js');
  const glosses = loadChunks(level);
  const { src, a, b, arr } = parseVocab(dataFile);
  const trims = TRIMS[level] || [];
  const buang = trims.reduce((n, [x, y]) => n + (y - x), 0);
  // Cek cakupan per-indeks: setiap entri di luar blok trim wajib punya glos.
  const missing = [];
  for (let i = 0; i < arr.length; i++) {
    if (trims.some(([x, y]) => i >= x && i < y)) continue;
    if (!(glosses[i] || '').trim()) missing.push(i);
  }
  if (missing.length) {
    throw new Error(level + ': ' + missing.length + ' entri tanpa glos, mis. ' + missing.slice(0, 5).join(', '));
  }
  let ganti = 0, tetap = 0;
  for (let i = 0; i < arr.length; i++) {
    const g = (glosses[i] || '').trim();
    if (!g) { tetap++; continue; }
    if (arr[i][2] !== g) ganti++;
    arr[i][2] = g;
  }
  // buang blok terkontaminasi dari belakang supaya indeks mapping tetap sejajar
  for (const [x, y] of trims.slice().sort((p, q) => q[0] - p[0])) {
    arr.splice(x, y - x);
  }
  const out = src.slice(0, a) + JSON.stringify(arr) + src.slice(b);
  if (write) fs.writeFileSync(dataFile, out);
  return { level, entri: arr.length, ganti, tetap, trim: buang };
}

function normalizeKey(s) {
  // ambil bentuk pertama sebelum ';', buang spasi & tanda ～, romaji kecil
  return (s || '').split(';')[0].trim().replace(/[～〜\s]/g, '');
}

function csvRows(text) {
  // tokenizer CSV sederhana yang menghormati tanda kutip
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function mergeCsv(allLevels) {
  const csvPath = path.join(ROOT, 'assets', 'vocab-all.csv');
  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = csvRows(text);
  const header = rows.shift();
  if (header.join(',') !== 'expression,reading,romaji,meaning,meaning_id,tags') {
    throw new Error('Header CSV berubah: ' + header.join(','));
  }
  // bangun mapping expression|reading → glos Indonesia (semua tingkat)
  const map = new Map();
  for (const level of allLevels) {
    const dataFile = path.join(ROOT, 'assets', 'page-data', 'kosakata-' + level + '-data.js');
    const { arr } = parseVocab(dataFile);
    for (const e of arr) {
      const g = (e[2] || '').trim();
      if (!g) continue;
      const exprs = String(e[0]).split(';');
      const read = String(e[1]).split(';');
      const readFirst = normalizeKey(read[0]);
      for (const ex of exprs) {
        const key = normalizeKey(ex) + '|' + readFirst;
        if (!map.has(key)) map.set(key, g);
      }
    }
  }
  let terisi = 0;
  for (const r of rows) {
    if (r.length < 6) continue;
    const key = normalizeKey(r[0]) + '|' + normalizeKey(r[1]);
    const g = map.get(key);
    if (g && !(r[4] || '').trim()) { r[4] = g; terisi++; }
  }
  rows.unshift(header);
  const out = rows.map((r) => r.map((f) => {
    if (/[",\n]/.test(f)) return '"' + f.replace(/"/g, '""') + '"';
    return f;
  }).join(',')).join('\n') + (text.endsWith('\n') ? '\n' : '');
  fs.writeFileSync(csvPath, out);
  return { kandidat: map.size, terisi };
}

const levelArg = process.argv[2];
const flag = process.argv[3];

if (levelArg === 'all' && flag === '--merge') {
  const res = mergeCsv(LEVELS);
  console.log('Merge CSV: ' + res.terisi + ' meaning_id terisi (dari ' + res.kandidat + ' kandidat)');
} else if (LEVELS.includes(levelArg)) {
  const write = flag !== '--check';
  const r = applyLevel(levelArg, write);
  console.log(
    r.level.toUpperCase() + ': ' + r.entri + ' entri, ' + r.ganti + ' glos diganti, ' + r.tetap + ' fallback EN'
    + (write ? ' → ditulis' : ' (dry-run)')
  );
} else {
  console.error('Pakai: node scripts/translate-kosakata.js <n5|n4|n3|n2|n1> [--check]  |  all --merge');
  process.exit(1);
}
