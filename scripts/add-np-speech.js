#!/usr/bin/env node
/* Menyisipkan <script src=".../np-speech.js" defer> ke halaman yang memakai
   speechSynthesis. Idempoten: halaman yang sudah punya dilewati.
   Prefix jalur dihitung dari kedalaman berkas (Materi/x.html -> ../assets/). */
const fs = require('fs'), path = require('path');
const files = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
let added = 0, skipped = 0;
for (const f of files) {
  let s;
  try { s = fs.readFileSync(f, 'utf8'); } catch (e) { console.log('  ! tidak terbaca:', f); continue; }
  if (s.includes('np-speech.js')) { skipped++; continue; }
  const depth = f.split('/').length - 1;
  const prefix = depth ? '../'.repeat(depth) : '';
  const tag = `<script src="${prefix}assets/np-speech.js" defer></script>\n`;
  const i = s.lastIndexOf('</body>');
  if (i < 0) { console.log('  ! tanpa </body>:', f); continue; }
  fs.writeFileSync(f, s.slice(0, i) + tag + s.slice(i), 'utf8');
  added++;
}
console.log(`ditambahkan: ${added}, dilewati (sudah ada): ${skipped}`);
