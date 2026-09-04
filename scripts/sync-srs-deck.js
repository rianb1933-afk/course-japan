/**
 * sync-srs-deck.js — Selaraskan assets/srs-cards-data.js dengan arti
 * Indonesia (meaning_id) dari assets/vocab-all.csv, sekaligus menyimpan
 * glos Inggris sebagai hint.
 *
 * Latar belakang:
 *   Deck SRS (100.000 kartu) sebelumnya memakai glos pendek hasil kurasi
 *   yang di-embed saat deck dibangun, sedangkan vocab-all.csv kini menyimpan
 *   meaning_id yang lebih kaya (mis. "prinsip" → "prinsip; asas; aturan umum").
 *   Kartu yang cocok dengan meaning_id CSV dipakai arti Indonesianya sebagai
 *   kolom meaning (indeks 3), dan glos Inggris dari CSV (kolom `meaning`)
 *   disalin ke kolom 7 (`en`) sebagai hint sekunder di UI.
 *
 *   Kartu tanpa meaning_id (jmdict dsb.) tetap 6 kolom — meaning-nya memang
 *   sudah berbahasa Inggris, jadi tidak perlu hint.
 *
 * Cara pakai:
 *   node scripts/sync-srs-deck.js        # regenerasi srs-cards-data.js
 *   node scripts/sync-srs-deck.js --check  # hanya verifikasi tanpa menulis
 *
 * Setelah menjalankan script ini, jalankan:
 *   npm run build:srs                     # regenerasi assets/srs/ + catalog
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const CSV_PATH = path.join(ROOT, 'assets', 'vocab-all.csv');
const DECK_PATH = path.join(ROOT, 'assets', 'srs-cards-data.js');

const CHECK_ONLY = process.argv.includes('--check');

function fail(msg) {
  console.error('✖ sync-srs-deck: ' + msg);
  process.exit(1);
}

/* ── Parse CSV (ekspansi quote: "" di dalam field → ") ── */
function parseCSVLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const csv = fs.readFileSync(CSV_PATH, 'utf8');
const csvLines = csv.split(/\r?\n/);
const header = parseCSVLine(csvLines[0]);
const iExpr = header.indexOf('expression');
const iRead = header.indexOf('reading');
const iEn = header.indexOf('meaning');
const iMid = header.indexOf('meaning_id');
if (iExpr < 0 || iRead < 0 || iMid < 0) fail('header CSV berubah: ' + header.join('|'));
if (iEn < 0) fail('kolom `meaning` (Inggris) tidak ada di header CSV');

// key = expression + '\0' + reading → { id: meaning_id, en: gloss Inggris }
const idByKey = new Map();
for (let li = 1; li < csvLines.length; li++) {
  const line = csvLines[li];
  if (!line.trim()) continue;
  const p = parseCSVLine(line);
  if (p.length < 6) continue;
  const expr = p[iExpr], read = p[iRead] || '', idg = (p[iMid] || '').trim();
  if (!expr || !idg) continue;
  const key = expr + '\0' + read;
  if (!idByKey.has(key)) idByKey.set(key, { id: idg, en: (p[iEn] || '').trim() });
}
console.log('vocab-all.csv  : ' + idByKey.size + ' baris meaning_id Indonesia');

/* ── Parse array deck dengan cara yang sama seperti build-srs-catalog.js ── */
const src = fs.readFileSync(DECK_PATH, 'utf8');
const anchor = src.indexOf('SRS_CARDS_RAW');
if (anchor === -1) fail('SRS_CARDS_RAW tidak ditemukan di srs-cards-data.js');
const start = src.indexOf('[', anchor);
const end = src.indexOf('];', start);
let rows;
try { rows = JSON.parse(src.slice(start, end + 1)); }
catch (e) { fail('array deck bukan JSON valid: ' + e.message); }
if (!Array.isArray(rows)) fail('SRS_CARDS_RAW bukan array');
console.log('srs-cards-data : ' + rows.length + ' kartu');

/* ── Patch: kolom meaning (3) = meaning_id, kolom 7 = glos Inggris ── */
let updated = 0, enAdded = 0, noEn = 0, sample = [];
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  if (!Array.isArray(r) || r.length < 6) fail('baris ' + i + ' bukan tuple 6 kolom');
  const hit = idByKey.get(r[1] + '\0' + (r[2] || ''));
  if (!hit) continue;
  if (r[3] !== hit.id) {
    if (!CHECK_ONLY) r[3] = hit.id;
    updated++;
  }
  // Hint hanya berguna bila glos Inggris-nya berbeda dari arti Indonesianya
  // (beberapa baris CSV tak bertag JMdict-EN menyimpan Indonesia di kolom
  // `meaning`, sehingga en === meaning_id → jangan tampilkan duplikat).
  if (hit.en && hit.en !== hit.id) {
    if (!CHECK_ONLY) {
      r.length = 6;             // buang kolom lama bila ada, lalu append rapi
      r.push(hit.en);
    }
    enAdded++;
    if (sample.length < 6) sample.push({ jp: r[1], arti: hit.id, en: hit.en });
  } else {
    // Tak ada glos Inggris yang berguna: pastikan kartu tetap 6 kolom
    // (buang sisa kolom 7 dari regenerasi sebelumnya bila ada).
    if (!CHECK_ONLY && r.length > 6) r.length = 6;
    noEn++;
  }
}
console.log('match meaning_id : ' + idByKey.size + ' map; ' + updated + ' arti diselaraskan, ' + enAdded + ' kartu dapat hint Inggris, ' + noEn + ' tanpa glos Inggris');
for (const s of sample) console.log('  ' + s.jp + ' → ' + s.arti + '  [en: ' + s.en + ']');

if (CHECK_ONLY) {
  const ok = updated === 0 && noEn === 0;
  console.log(ok
    ? '✓ unit: deck sudah selaras dengan CSV (arti Indonesia + hint Inggris)'
    : '✖ unit: ' + updated + ' arti dan ' + noEn + ' kartu tanpa hint belum selaras');
  process.exit(ok ? 0 : 1);
}

/* ── Regenerasi file dengan format identik ── */
const headerLines = src.slice(0, start);          // komentar + `const SRS_CARDS_RAW = `
const footer = src.slice(end + 1);                // `;` + kode .map() di bawah (end menunjuk ke `]` dari `];`)
const body = JSON.stringify(rows);                // format persis sama: ["v00001","現像",...]
const out = headerLines + body + footer;

fs.writeFileSync(DECK_PATH, out, 'utf8');
console.log('✓ srs-cards-data.js ditulis ulang (' + updated + ' arti + ' + enAdded + ' hint)');

// verifikasi ulang: parse kembali
const v = fs.readFileSync(DECK_PATH, 'utf8');
const va = v.indexOf('SRS_CARDS_RAW');
const vs = v.indexOf('[', va), ve = v.indexOf('];', vs);
const rows2 = JSON.parse(v.slice(vs, ve + 1));
if (rows2.length !== rows.length) fail('verifikasi gagal: jumlah baris berubah');
let diff = 0, enMiss = 0, enGood = 0;
for (let i = 0; i < rows2.length; i++) {
  const hit = idByKey.get(rows2[i][1] + '\0' + (rows2[i][2] || ''));
  if (!hit) continue;
  if (rows2[i][3] !== hit.id) diff++;
  const desired = (hit.en && hit.en !== hit.id) ? hit.en : '';
  if (desired) { if (rows2[i][6] === desired) enGood++; else enMiss++; }
  else if (rows2[i].length > 6) enMiss++;  // glos duplikat harus dibuang
}
console.log(diff === 0 && enMiss === 0
  ? '✓ verifikasi: 0 kartu tersisa tidak selaras (' + enGood + ' hint Inggris OK)'
  : '✖ verifikasi: ' + diff + ' arti / ' + enMiss + ' hint masih beda');
process.exit(diff === 0 && enMiss === 0 ? 0 : 1);
