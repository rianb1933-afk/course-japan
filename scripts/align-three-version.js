#!/usr/bin/env node
/* Menyamakan versi Three.js di semua importmap halaman anatomi.
   ───────────────────────────────────────────────────────────────────
   Halaman model 3D memuat Three.js dari jsDelivr lewat <script type="importmap">
   dengan DUA entri yang harus selalu seversi:

       "three":         .../three@<VER>/build/three.module.js
       "three/addons/": .../three@<VER>/examples/jsm/

   Kenapa dipusatkan ke satu konstan: versi sempat melenceng — 10 halaman di
   0.164.1 sementara Sistem-Kardiovaskular.html sudah 0.180.0. Karena URL-nya
   beda, pengunjung yang membuka dua halaman anatomi mengunduh library Three.js
   DUA KALI; kalau seragam, unduhan kedua dilayani dari HTTP cache. Drift itu
   tidak terlihat di review per-file, jadi ditegakkan lewat script + --check.

   Ini BUKAN cache-buster '?v=' milik align-asset-versions.py — itu untuk aset
   same-origin. Yang ini pin versi dependensi pihak ketiga.

   Pakai:
     node scripts/align-three-version.js           # tulis
     node scripts/align-three-version.js --check   # exit 1 bila ada yang melenceng
*/
'use strict';
const fs = require('fs');
const path = require('path');

const THREE_VERSION = '0.180.0';

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', '.github', 'docs']);
// Menangkap versi di kedua bentuk URL (build/ dan examples/jsm/).
const RE = /(cdn\.jsdelivr\.net\/npm\/three@)(\d+\.\d+\.\d+)(\/)/g;

function htmlFiles(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmlFiles(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const check = process.argv.includes('--check');
const stale = [];
let touched = 0, refs = 0;

for (const file of htmlFiles(ROOT)) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('jsdelivr.net/npm/three@')) continue;

  const found = new Set();
  const next = src.replace(RE, (m, pre, ver, post) => {
    refs++;
    found.add(ver);
    return pre + THREE_VERSION + post;
  });

  const rel = path.relative(ROOT, file);
  if (next !== src) {
    stale.push(rel + '  (' + [...found].filter(v => v !== THREE_VERSION).join(', ') + ')');
    if (!check) { fs.writeFileSync(file, next); touched++; }
  }
}

if (check) {
  if (stale.length) {
    console.error('Versi Three.js melenceng dari ' + THREE_VERSION + ':');
    stale.forEach(s => console.error('  ' + s));
    console.error('\nJalankan: node scripts/align-three-version.js');
    process.exit(1);
  }
  console.log('Three.js seragam di ' + THREE_VERSION + ' (' + refs + ' referensi).');
} else {
  console.log('Three.js disamakan ke ' + THREE_VERSION + ': ' + touched + ' berkas diubah, ' + refs + ' referensi.');
  stale.forEach(s => console.log('  ' + s));
}
