#!/usr/bin/env node
/*
 * scripts/release.js — rilis baru NihongoPro Academy
 *
 * Pemakaian:
 *   node scripts/release.js "Judul Rilis" "Bullet 1" "Bullet 2" ...
 *   cat catatan.txt | node scripts/release.js "Judul Rilis"
 *   node scripts/release.js --dry-run "Judul" "bullet"      # tampilkan tanpa menulis
 *
 * Langkah:
 *   1) Bump cache service worker  eduma-kaigo-vN  ->  vN+1  (sw.js)
 *   2) Sisip entri "## vN+1 — <judul>" di puncak CHANGELOG.md
 *   3) Regenerasi penanda versi terbaru di Changelog.html (meta np-latest-version).
 *   4) Regenerasi aset publik assets/changelog-releases.json (maks. 40 rilis terbaru)
 *      — CHANGELOG.md dipangkas sebelum deploy, jadi Changelog.html memuat JSON ini.
 */
'use strict';
const fs = require('fs');

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
const title = positional[0];
const argvBullets = positional.slice(1);

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    let got = false;
    let done = false;
    const finish = (v) => { if (done) return; done = true; resolve(v); };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { got = true; data += c; });
    process.stdin.on('end', () => finish(data));
    process.stdin.on('error', () => finish(data));
    setTimeout(() => {
      if (!got) { try { process.stdin.destroy(); } catch (e) {} finish(''); }
    }, 250);
  });
}

function fail(msg) {
  console.error('✖ ' + msg);
  process.exit(2);
}

(async () => {
  const stdinText = await readStdin();
  const bullets = [
    ...argvBullets,
    ...stdinText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  ].map((b) => (b.startsWith('- ') || b.startsWith('* ') ? b : '- ' + b));

  if (!title) {
    console.log(
      'Gunakan: node scripts/release.js "Judul Rilis" "bullet 1" "bullet 2" ...\n' +
      '         atau  cat catatan.txt | node scripts/release.js "Judul Rilis"\n' +
      'Flag:    --dry-run  (hitung & tampilkan tanpa menulis berkas)'
    );
    process.exit(0);
  }
  if (!dry && !bullets.length) {
    console.warn('⚠ Tidak ada bullet perubahan — entri dibuat tanpa daftar rincian.');
  }

  // ── 1) Bump sw.js ──
  const swPath = 'sw.js';
  const sw = fs.readFileSync(swPath, 'utf8');
  const m = sw.match(/eduma-kaigo-v(\d+)/);
  if (!m) fail('Versi cache tidak ditemukan di sw.js');
  const nextNum = parseInt(m[1], 10) + 1;
  const fromVer = m[0];
  const toVer = 'eduma-kaigo-v' + nextNum;
  if (dry) {
    console.log('1) sw.js      : ' + fromVer + '  ->  ' + toVer);
  } else {
    fs.writeFileSync(swPath, sw.replace(fromVer, toVer, 1));
    console.log('1) sw.js      : ' + fromVer + '  ->  ' + toVer + '  (ditulis)');
  }

  // ── 2) Sisip entri CHANGELOG.md ──
  const clPath = 'CHANGELOG.md';
  const cl = fs.readFileSync(clPath, 'utf8');
  const heading = '## v' + nextNum + ' \u2014 ' + title;
  if (cl.includes(heading)) fail('Entri ' + heading + ' sudah ada di CHANGELOG.md');
  const hm = cl.match(/^## .*$/m);
  if (!hm) fail('Tidak menemukan entri rilis di CHANGELOG.md');
  const parts = [heading, ''];
  if (bullets.length) {
    parts.push('### Perubahan', '');
    parts.push(bullets.join('\n'));
  }
  const entry = parts.join('\n') + '\n\n---\n\n';
  if (dry) {
    console.log('2) CHANGELOG.md: entri baru di puncak:\n' + entry);
  } else {
    fs.writeFileSync(clPath, cl.slice(0, hm.index) + entry + cl.slice(hm.index));
    console.log('2) CHANGELOG.md: entri "## v' + nextNum + ' — ' + title + '" disisipkan di puncak (ditulis)');
  }

  // ── 3) Regenerasi penanda versi terbaru di Changelog.html ──
  const chPath = 'Changelog.html';
  if (fs.existsSync(chPath)) {
    const ch = fs.readFileSync(chPath, 'utf8');
    const metaRe = /(np-latest-version" content="v)\d+(")/;
    let next;
    if (metaRe.test(ch)) {
      next = ch.replace(metaRe, '$1' + nextNum + '$2');
    } else {
      const anchor = '<meta name="description"';
      const ai = ch.indexOf(anchor);
      if (ai < 0) fail('Meta description tidak ditemukan di Changelog.html');
      const eol = ch.indexOf('\n', ai);
      next = ch.slice(0, eol + 1) + '<meta name="np-latest-version" content="v' + nextNum + '">\n' + ch.slice(eol + 1);
    }
    if (dry) {
      console.log('3) Changelog.html: meta np-latest-version -> v' + nextNum);
    } else {
      fs.writeFileSync(chPath, next);
      console.log('3) Changelog.html: meta np-latest-version -> v' + nextNum + ' (ditulis)');
    }
  } else {
    console.log('3) Changelog.html: dilewati (berkas tidak ada)');
  }

  // ── 4) Regenerasi aset publik changelog ──
  const jsonPath = 'assets/changelog-releases.json';
  const MAX_ENTRIES = 40;
  if (dry) {
    console.log('4) ' + jsonPath + ': ' + MAX_ENTRIES + ' rilis terbaru (direncanakan)');
  } else {
    const clText = fs.readFileSync(clPath, 'utf8');
    const idxs = [];
    const re = /^## .*$/gm;
    let mm;
    while ((mm = re.exec(clText)) !== null) idxs.push(mm.index);
    if (!idxs.length) fail('Tidak menemukan entri rilis untuk aset publik');
    const start = idxs[0];
    const end = idxs.length > MAX_ENTRIES ? idxs[MAX_ENTRIES] : clText.length;
    const payload = {
      latest: 'v' + nextNum,
      generatedAt: new Date().toISOString(),
      count: Math.min(idxs.length, MAX_ENTRIES),
      markdown: clText.slice(start, end)
    };
    const json = JSON.stringify(payload);
    fs.writeFileSync(jsonPath, json);
    console.log('4) ' + jsonPath + ': ditulis (' + Math.round(json.length / 1024) + ' KB, ' + payload.count + ' rilis terbaru)');
  }

  console.log(dry
    ? '\n✔ Dry-run selesai — tidak ada berkas yang diubah.'
    : '\n✔ Rilis v' + nextNum + ' siap. sw.js, CHANGELOG.md, Changelog.html, dan ' + jsonPath + ' sudah diperbarui.');
})();
