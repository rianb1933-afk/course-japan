#!/usr/bin/env node
/**
 * Pasang assets/np-celebrate.js di semua halaman yang memuat platform.min.js.
 * ============================================================================
 * np-celebrate.js mendengarkan event 'np:xpAdded'/'np:achievement' yang
 * dikirim assets/platform.js — modul itu perlu ada di SETIAP halaman yang
 * memuat platform.min.js, langsung SESUDAH tag platform.min.js (defer
 * mengeksekusi berurutan sesuai posisi dokumen, jadi urutan ini menjamin
 * window.NP sudah terisi saat np-celebrate.js jalan).
 *
 * Idempoten: baris yang sudah punya np-celebrate.js dilewati.
 * Menangani dua bentuk prefix path yang dipakai di repo ini:
 *   assets/platform.min.js       (16 halaman di root)
 *   ../assets/platform.min.js    (226 halaman di subfolder)
 *
 * Pemakaian: node scripts/add-np-celebrate.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function allHtmlFiles(dir, out) {
  out = out || [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) allHtmlFiles(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const PATTERNS = [
  {
    tag: '<script src="../assets/platform.min.js" defer></script>',
    insert: '<script src="../assets/np-celebrate.js" defer></script>',
  },
  {
    tag: '<script src="assets/platform.min.js" defer></script>',
    insert: '<script src="assets/np-celebrate.js" defer></script>',
  },
];

let changed = 0, skipped = 0;

for (const file of allHtmlFiles(ROOT)) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('platform.min.js')) continue;

  let next = content;
  for (const { tag, insert } of PATTERNS) {
    if (!next.includes(tag)) continue;
    if (next.includes(insert)) continue; // sudah terpasang
    next = next.split(tag).join(tag + insert);
  }

  if (next !== content) {
    fs.writeFileSync(file, next, 'utf8');
    changed++;
  } else {
    skipped++;
  }
}

console.log(`✓ np-celebrate.js dipasang di ${changed} halaman (${skipped} sudah terpasang/tidak relevan).`);
