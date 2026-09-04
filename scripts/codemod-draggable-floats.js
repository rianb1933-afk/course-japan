#!/usr/bin/env node
/**
 * codemod-draggable-floats.js — sisipkan `<script src="{prefix}assets/draggable-floats.js">`
 * tepat setelah baris `<script ... pro-app.min.js ...>` di tiap halaman HTML
 * yang memuat pro-app tetapi belum memuat draggable-floats.
 *
 * Sistem seret widget melayang (draggable-floats.js) tadinya hanya dimuat
 * index.html; 63 halaman lain mendapat pro-app (dock FAB, pilin AI Chat,
 * penerjemah, timer belajar) tanpa sistem itu, jadi widget tidak bisa
 * digeser pengguna. Prefix (`../assets/` vs `assets/`) diturunkan dari tag
 * pro-app yang sudah ada di halaman itu sendiri.
 *
 * Idempoten: halaman yang sudah memuat draggable-floats dilewati.
 *
 * Pemakaian:  node scripts/codemod-draggable-floats.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PRO_APP_RE = /(<script[^>]*\bsrc="([^"]*)pro-app\.min\.js[^"]*"[^>]*>\s*<\/script>)/g;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.') || ent.name === 'node_modules' || ent.name === 'scripts' || ent.name === 'docs' || ent.name === '.github' || ent.name === '.tmp-smoke') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let inserted = 0, skipped = 0;
for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes('draggable-floats')) { skipped++; continue; }
  if (!PRO_APP_RE.test(src)) { skipped++; continue; }

  PRO_APP_RE.lastIndex = 0;
  let match = PRO_APP_RE.exec(src);
  if (!match) { skipped++; continue; }

  const prefix = match[2]; // mis. "../assets/" atau "assets/"
  const tag = `<script src="${prefix}draggable-floats.js" defer></script>`;

  // Sisipkan tepat setelah tag pro-app PERTAMA yang ditemukan.
  const cut = match.index + match[0].length;
  const next = src.slice(0, cut) + '\n' + tag + src.slice(cut);

  fs.writeFileSync(file, next, 'utf8');
  inserted++;
  console.log(`  + ${path.relative(ROOT, file)}  (${tag})`);
}

console.log(`\nSelesai: ${inserted} halaman disisipi, ${skipped} dilewati (sudah ada / tanpa pro-app).`);
