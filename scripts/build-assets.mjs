#!/usr/bin/env node
/**
 * Bangun assets/<name>.min.js dan <name>.min.css dari sumbernya.
 * =============================================================
 *
 * Kenapa ada script ini
 * ---------------------
 * Halaman HANYA memuat versi .min — platform.min.js dipakai 228 halaman,
 * kyoto-navbar.min.js 371 halaman — sementara sumbernya tidak pernah dimuat
 * siapa pun. Selama ini keduanya disamakan dengan tangan, dan validator punya
 * check khusus (minified-drift) untuk menangkap saat penyamaan itu terlupa.
 *
 * Itu menambal gejala. Penyebabnya: tidak ada build step. Script ini yang
 * jadi penyebabnya, sehingga .min tidak mungkin lagi tertinggal dari sumber.
 *
 * Catatan penting soal hasil
 * --------------------------
 * File .min yang lama bukan hasil minify sungguhan — hanya dibuang komentar
 * dan indentasinya (eduma-data: 209 → 185 baris). Minify sebenarnya jauh
 * lebih kecil, mis. platform 22,7 KB → 12,0 KB.
 *
 * Target ES2015 dipilih supaya dukungan browser TIDAK berubah: sumber dan
 * .min lama sama-sama sudah ES2015+ (jumlah arrow/const/template-nya identik),
 * jadi tidak ada transpilasi yang hilang maupun bertambah.
 *
 * Pemakaian
 * ---------
 *     node scripts/build-assets.mjs           # tulis ulang semua .min
 *     node scripts/build-assets.mjs --check   # bandingkan saja, exit 1 bila basi
 *
 * Bundle TANPA sumber (kyoto-bundle.min.css, legacy-bundle.min.css) sengaja
 * tidak disentuh — keduanya tidak punya file asal di repo.
 */

import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ASSETS = path.join(ROOT, 'assets');

/** Sumber → .min. Ditulis eksplisit supaya penambahan aset selalu disadari. */
const TARGETS = [
  'eduma-data.js',
  'eduma-platform.js',
  'index-page.js',
  'kyoto-navbar.js',
  'platform.js',
  'pro-app.js',
  'translator.js',
  'index-page.css',
  'kyoto-navbar.css',
];

const BANNER = '/* Dibangun oleh scripts/build-assets.mjs — jangan diedit langsung. */\n';

function minName(file) {
  const ext = path.extname(file);
  return `${file.slice(0, -ext.length)}.min${ext}`;
}

async function minify(file) {
  const result = await build({
    entryPoints: [path.join(ASSETS, file)],
    minify: true,
    bundle: false,
    target: ['es2015'],
    charset: 'utf8',        // pertahankan teks Jepang apa adanya, jangan di-escape
    legalComments: 'none',
    write: false,
    logLevel: 'silent',
  });
  return BANNER + result.outputFiles[0].text;
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const stale = [];
  const rows = [];

  for (const file of TARGETS) {
    const src = path.join(ASSETS, file);
    if (!existsSync(src)) {
      console.error(`✗ sumber hilang: assets/${file}`);
      process.exit(1);
    }

    const out = minName(file);
    const outPath = path.join(ASSETS, out);
    const built = await minify(file);
    const current = existsSync(outPath) ? await readFile(outPath, 'utf8') : null;

    if (current !== built) {
      stale.push(out);
      if (!checkOnly) await writeFile(outPath, built, 'utf8');
    }

    rows.push({
      file,
      out,
      from: Buffer.byteLength(await readFile(src, 'utf8')),
      to: Buffer.byteLength(built),
      changed: current !== built,
    });
  }

  if (checkOnly) {
    if (stale.length) {
      console.error(
        `✗ ${stale.length} berkas .min tidak sesuai sumbernya: ${stale.join(', ')}\n` +
        `  Jalankan: npm run build`);
      process.exit(1);
    }
    console.log(`✓ ${TARGETS.length} berkas .min sudah sesuai sumbernya.`);
    return;
  }

  let saved = 0;
  for (const r of rows) {
    const mark = r.changed ? '~' : ' ';
    console.log(
      `${mark} ${r.out.padEnd(24)} ${(r.from / 1024).toFixed(1).padStart(7)} KB` +
      ` → ${(r.to / 1024).toFixed(1).padStart(7)} KB`);
    saved += r.from - r.to;
  }
  const touched = rows.filter(r => r.changed).length;
  console.log(
    `\n✓ ${rows.length} berkas dibangun, ${touched} berubah. ` +
    `Total ${(saved / 1024).toFixed(0)} KB lebih kecil dari sumbernya.`);
}

main().catch(e => { console.error(e); process.exit(1); });
