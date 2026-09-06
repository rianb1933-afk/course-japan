#!/usr/bin/env node
/**
 * audit-3d-lazy.js — Audit pola lazy-load viewer 3D (check validator "3d-lazy-pattern")
 * =====================================================================================
 * Dua keluarga viewer 3D hidup berdampingan, dan keduanya WAJIB lazy-load
 * (nol beban 3D saat halaman dibuka; library + model baru terunduh saat
 * panel/tab 3D benar-benar dipilih):
 *
 *   1. Materi/Sistem-*.html — Three.js via importmap + import('three') dinamis
 *      di dalam initXxx3D(), dipicu listener klik tab (jalur UTAMA) +
 *      IntersectionObserver (cadangan). Sejarahnya: import statis pernah membuat
 *      ~2,2 MB Three.js terunduh di setiap page load (check three-lazy menjaga
 *      sisi codemod-nya; check ini mengaudit pola lengkap per halaman).
 *
 *   2. Anatomi-Dasar.html — <model-viewer> yang library-nya (versi dipatok dari
 *      jsDelivr, sudah diizinkan CSP) di-import() dinamis saat tab 3D pertama
 *      kali diklik, merender assets/anatomy/models/human-body.glb dengan stamp
 *      ?v= (konstan ASSET_VERSION di align-asset-versions.py).
 *
 * Pemakaian:
 *   node scripts/audit-3d-lazy.js --check            # audit repo (exit 1 bila menyimpang)
 *   node scripts/audit-3d-lazy.js --check --root DIR # audit repo sintetis (untuk test)
 *
 * Halaman ditemukan lewat KONTEN, bukan nama: semua *.html di Materi/ yang
 * memuat importmap three ikut diaudit penuh — halaman 3D baru otomatis
 * tercakup tanpa mendaftar di mana pun. Halaman tanpa viewer (mis. tier
 * -Menengah/-Lanjutan) lolos karena tidak cocok kriteria discovery.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const rootIdx = args.indexOf('--root');
const ROOT = rootIdx !== -1 ? path.resolve(args[rootIdx + 1]) : path.resolve(__dirname, '..');

const failures = [];
const lines = [];

function fail(msg) { failures.push(msg); lines.push('!!  ' + msg); }
function pass(msg) { lines.push('OK  ' + msg); }

// ── Keluarga 1: halaman Three.js (discovery via importmap) ─────────────────
const materiDir = path.join(ROOT, 'Materi');
let threePages = [];
if (fs.existsSync(materiDir)) {
  threePages = fs.readdirSync(materiDir)
    .filter(f => f.endsWith('.html'))
    .map(f => ({ f, s: fs.readFileSync(path.join(materiDir, f), 'utf8') }))
    .filter(({ s }) => /type\s*=\s*["']importmap["']/.test(s) && /three@/.test(s));
}

for (const { f, s } of threePages) {
  const initFn = (s.match(/window\.(init\w+3D)\s*=/) || [])[1];
  if (!initFn) {
    fail(`${f}: importmap three ada tapi tidak ada ekspor window.initXxx3D (module scope terisolasi — listener tab tidak bisa memanggil viewer)`);
    continue;
  }

  // Import statis = evaluasi saat page load. Larang keras.
  const staticImport = /^\s*import\s+\{[^}]*\}\s+from\s+['"]three['"]/m.test(s) ||
                       /^\s*import\s+\*\s+as\s+THREE\s+from\s+['"]three['"]/m.test(s);
  if (staticImport) fail(`${f}: import statis "three" terdeteksi — wajib import('three') dinamis di dalam ${initFn}()`);

  if (!/import\(\s*['"]three['"]\s*\)/.test(s)) {
    fail(`${f}: tidak ada import('three') dinamis di dalam ${initFn}()`);
  }

  // Jalur UTAMA: listener klik tab memanggil init. Tanpa ini viewer 3D tidak
  // PERNAH muncul untuk elemen di tab tersembunyi (dimensi 0x0 → IO tak aktif).
  const tabCall = new RegExp(
    'dataset\\.tab\\s*===\\s*["\']\\w+["\'][\\s\\S]{0,200}?window\\.' + initFn + '\\('
  ).test(s);
  const guard = new RegExp('typeof\\s+window\\.' + initFn).test(s);
  if (!tabCall || !guard) {
    fail(`${f}: listener klik tab tidak memanggil window.${initFn}() (jalur UTAMA pemicu lazy-load)`);
  }

  // Jalur cadangan: IntersectionObserver tetap wajib terpasang.
  if (!/IntersectionObserver/.test(s)) {
    fail(`${f}: IntersectionObserver (jalur cadangan pemicu) tidak ditemukan`);
  }

  if (!failures.some(x => x.startsWith(f + ':'))) pass(`${f} — ${initFn} lazy penuh`);
}

// ── Keluarga 2: Anatomi-Dasar.html (model-viewer) ──────────────────────────
const anatomiPath = path.join(ROOT, 'Anatomi-Dasar.html');
if (fs.existsSync(anatomiPath)) {
  const a = fs.readFileSync(anatomiPath, 'utf8');
  let pageFail = false;
  const pf = (m) => { pageFail = true; fail('Anatomi-Dasar.html: ' + m); };

  // Library model-viewer wajib di-import() dinamis dengan versi DIPATOK.
  const mvImport = a.match(/import\(\s*['"]https:\/\/cdn\.jsdelivr\.net\/npm\/@google\/model-viewer@(\d+\.\d+\.\d+)[^'"]*['"]\s*\)/);
  if (!mvImport) {
    pf("library model-viewer tidak di-import() dinamis dari jsDelivr dengan versi dipatok (@google/model-viewer@x.y.z)");
  }

  // Tidak boleh ada <script src="...model-viewer..."> statis — itu meniadakan lazy-load.
  if (/<script[^>]+src=["'][^"']*model-viewer[^"']*["']/.test(a)) {
    pf("ada <script src> statis model-viewer — library akan terunduh saat page load");
  }

  // Model GLB wajib direferensikan DENGAN stamp ?v= (cache-buster satu konstan).
  if (!/human-body\.glb\?v=\w+/.test(a)) {
    pf("src model tidak memakai stamp ?v= (human-body.glb?v=ASSET_VERSION) — SW cache-first akan menyajikan model basi");
  }
  if (fs.existsSync(path.join(ROOT, 'assets', 'anatomy', 'models', 'human-body.glb')) === false) {
    pf("aset assets/anatomy/models/human-body.glb tidak ada (regenerasi: python3 scripts/build-human-body-glb.py)");
  }

  // Pemicu: klik tab 3D harus memanggil loadModel3D().
  if (!/vmTab3D['"]\)\.addEventListener[\s\S]{0,600}?loadModel3D\(\)/.test(a)) {
    pf("listener klik tab 3D (vmTab3D) tidak memanggil loadModel3D()");
  }

  // loading="eager" sengaja dipasang saat pembuatan elemen (elemen selalu
  // in-viewport saat dibuat); mode auto menggantung pada deteksi visibilitas
  // berbasis rAF yang bisa tak pernah selesai di webview tertanam/tab background.
  if (!/setAttribute\(\s*['"]loading['"]\s*,\s*['"]eager['"]\s*\)/.test(a)) {
    pf("elemen model-viewer tidak di-set loading=eager (mode auto bisa menggantung tanpa komposit rAF)");
  }

  if (!pageFail) pass('Anatomi-Dasar.html — model-viewer lazy penuh (import dinamis + stamp ?v= + pemicu tab)');
} else {
  lines.push('--  Anatomi-Dasar.html tidak ada — keluarga model-viewer dilewati');
}

// ── Ringkasan ───────────────────────────────────────────────────────────────
lines.push(`    halaman three teraudit: ${threePages.length}, model-viewer: ${fs.existsSync(anatomiPath) ? 1 : 0}`);

if (checkMode) {
  console.log(lines.join('\n'));
  if (failures.length) {
    console.error(`${failures.length} pelanggaran pola lazy-load 3D`);
    process.exit(1);
  }
} else {
  // Mode tanpa --check: hanya laporan informatif.
  console.log(lines.join('\n'));
  if (failures.length) console.log(`${failures.length} pelanggaran (mode laporan)`);
}
