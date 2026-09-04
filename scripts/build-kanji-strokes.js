#!/usr/bin/env node
/**
 * build-kanji-strokes.js — Bangun aset data urutan goresan kanji.
 *
 * Sumber: KanjiVG (https://kanjivg.tagaini.net) — © Ulrich Apel,
 * dilisensikan CC-BY-SA 3.0 (http://creativecommons.org/licenses/by-sa/3.0/).
 * Data ini diunduh dari rilis resmi GitHub KanjiVG/kanjivg, berkas
 * "kanjivg-YYYYMMDD-stripped.zip" (versi stripped = tanpa metadata ekstra).
 *
 * Cara pakai:
 *   1. Unduh & ekstrak sekali saja:
 *        curl -L -o /tmp/kanjivg.zip \
 *          "https://github.com/KanjiVG/kanjivg/releases/download/r20250816/kanjivg-20250816-stripped.zip"
 *        unzip -o -q /tmp/kanjivg.zip -d /tmp   # menghasilkan /tmp/stripped/*.svg
 *   2. Jalankan generator:
 *        node scripts/build-kanji-strokes.js [--src /tmp/stripped]
 *
 * Hasil: assets/kanji-strokes.js — peta { kanji: { n, s, p } }:
 *   n = jumlah gores, s = array path SVG per gores (urutan menulis),
 *   p = posisi [x,y] label nomor gores (dari KanjiVG).
 *
 * Catatan lisensi: aset hasil tetap CC-BY-SA 3.0 — atribusi di kepala
 * berkas hasil tidak boleh dihapus.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'kanji-strokes.js');
const SRC = process.argv.includes('--src')
  ? path.join(process.argv[process.argv.indexOf('--src') + 1])
  : path.join('/tmp', 'stripped');

// ── Kumpulkan kanji target ────────────────────────────────────────────────
function cjkChars(text) {
  const out = new Set();
  for (const ch of String(text || '')) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x3400 && cp <= 0x9fff) out.add(ch);
  }
  return out;
}

function collectTargets() {
  const targets = new Set();
  const sources = {};

  // 1. kanji-bank.json — semua kanji yang dipakai situs (N5..N1)
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'kanji-bank.json'), 'utf8'));
  for (const entry of bank) {
    targets.add(entry.k);
    sources[entry.k] = sources[entry.k] || [];
    sources[entry.k].push('kanji-bank.json');
  }

  // 2. Halaman Kanji-N1..N5 — kanji apa pun yang tampil di halaman
  for (const lv of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    const file = path.join(ROOT, 'Materi', `Kanji-${lv}.html`);
    if (!fs.existsSync(file)) continue;
    const body = fs.readFileSync(file, 'utf8');
    for (const ch of cjkChars(body)) {
      targets.add(ch);
      sources[ch] = sources[ch] || [];
      sources[ch].push(`Kanji-${lv}.html`);
    }
  }

  // 3. Kanji-Trainer.html — daftar kanji latihan (termasuk level Kaigo)
  const trainer = path.join(ROOT, 'Kanji-Trainer.html');
  if (fs.existsSync(trainer)) {
    const body = fs.readFileSync(trainer, 'utf8');
    for (const ch of cjkChars(body)) {
      targets.add(ch);
      sources[ch] = sources[ch] || [];
      sources[ch].push('Kanji-Trainer.html');
    }
  }

  return { targets, sources };
}

// ── Parse SVG KanjiVG ─────────────────────────────────────────────────────
function parseSvg(xml, codepoint) {
  const hex = codepoint.toString(16).padStart(5, '0');
  const strokes = [];

  // Ambil grup gores utama (id kvg:<hex>). Gores bisa dibungkus grup
  // bertingkat (kvg:<hex>-gN), jadi jepit sampai grup StrokeNumbers
  // yang selalu mengikuti — dengan begitu semua path gores ikut terbaca.
  const mainGroup = xml.match(new RegExp(`<g id="kvg:${hex}">([\\s\\S]*?)<g id="kvg:StrokeNumbers`));
  let groupBody = mainGroup ? mainGroup[1] : xml;
  // Fallback bila tidak ada grup StrokeNumbers: jepit sampai </g> terakhir.
  if (!mainGroup) {
    const loose = xml.match(new RegExp(`<g id="kvg:${hex}">([\\s\\S]*?)$`));
    if (loose) groupBody = loose[1];
  }

  const pathRe = /<path\b[^>]*\bd="([^"]+)"/g;
  let m;
  while ((m = pathRe.exec(groupBody)) !== null) strokes.push(m[1]);

  // Posisi label nomor gores tidak disimpan — renderer menghitungnya dari
  // bounding box tiap gores saat runtime (lebih ringkas & selalu pas).
  return { n: strokes.length, s: strokes };
}

// ── Utama ─────────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Direktori sumber tidak ditemukan: ${SRC}`);
    console.error('Unduh & ekstrak KanjiVG stripped dulu (lihat header script).');
    process.exit(1);
  }

  const { targets, sources } = collectTargets();
  console.log(`Kanji target: ${targets.size}`);

  const files = new Map();
  for (const name of fs.readdirSync(SRC)) {
    if (!name.endsWith('.svg')) continue;
    const hex = name.slice(0, -4);
    files.set(parseInt(hex, 16), name);
  }

  const data = {};
  let found = 0;
  let missing = [];
  for (const ch of targets) {
    const cp = ch.codePointAt(0);
    const name = files.get(cp);
    if (!name) { missing.push(ch); continue; }
    const xml = fs.readFileSync(path.join(SRC, name), 'utf8');
    const parsed = parseSvg(xml, cp);
    if (!parsed.n) { missing.push(ch); continue; }
    data[ch] = parsed;
    found++;
  }

  const json = JSON.stringify(data);
  const kb = (json.length / 1024).toFixed(0);
  console.log(`Tersimpan: ${found}/${targets.size} kanji (${kb} KB JSON)`);
  console.log(`Tanpa data: ${missing.length} → ${missing.slice(0, 40).join(' ')}`);

  const header = [
    '/*',
    ' * assets/kanji-strokes.js — data urutan goresan kanji.',
    ' * DIBANGUN OTOMATIS oleh scripts/build-kanji-strokes.js — jangan edit manual.',
    ' *',
    ' * Sumber: KanjiVG r20250816 (https://kanjivg.tagaini.net) © Ulrich Apel,',
    ' * CC-BY-SA 3.0 (http://creativecommons.org/licenses/by-sa/3.0/).',
    '   * Format: { kanji: { n: jumlah gores, s: [path d per gores] } }',
    ' */',
    'window.KANJI_STROKES = ' + json + ';',
    ''
  ].join('\n');

  fs.writeFileSync(OUT, header);
  const outKb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`Ditulis: ${OUT} (${outKb} KB)`);

  // Laporan cakupan per sumber (untuk debugging)
  const perSource = {};
  for (const [ch, srcs] of Object.entries(sources)) {
    if (!data[ch]) continue;
    for (const s of srcs) perSource[s] = (perSource[s] || 0) + 1;
  }
  console.log('Cakupan per sumber:', perSource);
}

main();