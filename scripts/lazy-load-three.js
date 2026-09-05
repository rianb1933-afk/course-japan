#!/usr/bin/env node
/* Mengubah viewer 3D halaman anatomi dari import statis menjadi lazy-load.
   ───────────────────────────────────────────────────────────────────
   MASALAH
   Sepuluh halaman Materi/Sistem-*.html memuat Three.js lewat import statis di
   top-level <script type="module">. Import statis dievaluasi saat halaman
   dibuka, jadi setiap pengunjung mengunduh ~2,2 MB library (±408 KB setelah
   brotli) SEBELUM melihat apa pun -- padahal viewer 3D-nya berada di dalam
   panel tab "Anatomi" yang
   display:none secara default, dan mayoritas pengunjung tidak pernah membukanya.

   Sistem-Kardiovaskular.html sudah memecahkan ini di v232. Script ini
   menerapkan pola yang sama ke sepuluh halaman sisanya.

   DUA JALUR PEMICU -- keduanya WAJIB
   Kontainer 3D berada di dalam .organ-panel yang display:none kecuali .active.
   Elemen di panel tersembunyi berdimensi 0x0, jadi IntersectionObserver TIDAK
   PERNAH menganggapnya intersecting. Karena itu jalur UTAMA adalah listener
   klik tab "Anatomi" (satu-satunya titik yang tahu kapan panel ditampilkan),
   dan observer hanya jalur cadangan bila struktur halaman berubah kelak.
   Memasang observer saja akan membuat SEMUA viewer 3D berhenti muncul.

   Unduhan ditaruh SESUDAH cek WebGL supaya browser tanpa WebGL tidak menarik
   1,2 MB percuma (Kardiovaskular menaruhnya sebelum cek -- di sini diperbaiki).

   Idempoten: berkas yang sudah memakai await import('three') dilewati.

   Pakai:
     node scripts/lazy-load-three.js           # tulis
     node scripts/lazy-load-three.js --check   # exit 1 bila masih ada import statis
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'Materi');
const check = process.argv.includes('--check');

const STATIC_IMPORTS =
  "import * as THREE from 'three';\n" +
  "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';\n" +
  "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';";

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Mengganti tepat satu kemunculan; melempar bila jumlahnya bukan satu, supaya
// perubahan struktur halaman ketahuan sebagai kegagalan, bukan diam-diam lolos.
function replaceOnce(src, needle, repl, what, file) {
  const parts = src.split(needle);
  if (parts.length !== 2) {
    throw new Error(`${file}: "${what}" ditemukan ${parts.length - 1}x, harus tepat 1x`);
  }
  return parts[0] + repl + parts[1];
}

function transformModule(block, file) {
  const idm = block.match(/getElementById\('(\w+?)3dContainer'\)/);
  if (!idm) throw new Error(`${file}: id kontainer 3D tidak ditemukan`);
  const base = idm[1];                       // mis. 'muscle'
  const key = base + '3d';                   // mis. 'muscle3d'
  const fn = 'init' + cap(base) + '3D';      // mis. 'initMuscle3D'

  const lm = block.match(/console\.warn\('\[([^\]]+)\]/);
  if (!lm) throw new Error(`${file}: label console.warn tidak ditemukan`);
  const label = lm[1];                       // mis. 'Muscle 3D Viewer'

  let out = block;

  out = replaceOnce(out, STATIC_IMPORTS,
    "// Three.js TIDAK diimpor statis di sini: import top-level dievaluasi saat\n" +
    "// halaman dibuka, sehingga library ~2,2 MB (±408 KB brotli) terunduh meski\n" +
    "// viewer 3D berada di panel tab tersembunyi. Unduhan dipindah ke dalam " + fn + "()\n" +
    "// di bawah, yang baru dipanggil saat panel Anatomi benar-benar dibuka.",
    'blok import statis', file);

  out = replaceOnce(out, '(async function () {',
    'async function ' + fn + '() {\n' +
    '  // Guard idempoten: fungsi ini bisa dipicu dari DUA jalur (klik tab\n' +
    '  // "Anatomi" dan IntersectionObserver cadangan di bawah) -- mencegah\n' +
    '  // viewer diinisialisasi dua kali untuk elemen yang sama.\n' +
    '  if (window.__' + key + 'InitStarted) return;\n' +
    '  window.__' + key + 'InitStarted = true;\n',
    'pembuka IIFE async', file);

  out = replaceOnce(out, '  let metadata = {};',
    '  // Titik unduh Three.js. Sengaja SESUDAH cek WebGL di atas: browser tanpa\n' +
    '  // WebGL tidak perlu menarik ~2,2 MB yang tidak akan terpakai.\n' +
    '  let THREE, OrbitControls, GLTFLoader;\n' +
    '  try {\n' +
    "    THREE = await import('three');\n" +
    "    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));\n" +
    "    ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'));\n" +
    '  } catch (err) {\n' +
    '    // Dengan import statis, kegagalan jaringan di sini menghentikan SELURUH\n' +
    '    // module script. Sekarang terisolasi: hanya area 3D yang gagal.\n' +
    "    console.warn('[" + label + "] Gagal memuat library Three.js:', err);\n" +
    "    showError('Model 3D gagal dimuat (masalah jaringan). Coba muat ulang halaman -- fitur lain tetap berfungsi normal.');\n" +
    '    return;\n' +
    '  }\n\n' +
    '  let metadata = {};',
    'anchor let metadata', file);

  out = replaceOnce(out, '\n})();',
    '\n}\n\n' +
    '// Module script punya scope terisolasi, jadi fungsi ini harus diekspos agar\n' +
    '// listener klik tab (script biasa di bawah) bisa memanggilnya.\n' +
    'window.' + fn + ' = ' + fn + ';\n\n' +
    '// Jalur CADANGAN. Selama #' + key + 'Container berada di dalam panel tab\n' +
    '// yang display:none, elemennya berdimensi 0x0 dan observer ini tidak akan\n' +
    '// pernah menyala -- itu disengaja. Ia ada untuk berjaga bila struktur\n' +
    '// halaman berubah dan kontainernya tidak lagi tersembunyi.\n' +
    'const ' + key + 'ContainerEl = document.getElementById(\'' + key + 'Container\');\n' +
    'if (' + key + 'ContainerEl && \'IntersectionObserver\' in window) {\n' +
    '  const ' + key + 'Observer = new IntersectionObserver(function (entries) {\n' +
    '    entries.forEach(function (entry) {\n' +
    '      if (entry.isIntersecting) {\n' +
    '        ' + key + 'Observer.unobserve(entry.target);\n' +
    '        ' + fn + '();\n' +
    '      }\n' +
    '    });\n' +
    "  }, { rootMargin: '200px' });\n" +
    '  ' + key + 'Observer.observe(' + key + 'ContainerEl);\n' +
    '} else {\n' +
    '  // Browser tanpa IntersectionObserver: langsung inisialisasi seperti\n' +
    '  // perilaku lama. Lebih baik tanpa lazy-load daripada model tidak muncul.\n' +
    '  ' + fn + '();\n' +
    '}',
    'penutup IIFE', file);

  return { out, fn };
}

const TAB_ANCHOR = "    if (panel) panel.classList.add('active');";
const files = fs.readdirSync(DIR).filter(f => /^Sistem-.*\.html$/.test(f));
const pending = [];
let changed = 0;

for (const name of files) {
  const file = path.join(DIR, name);
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes(STATIC_IMPORTS)) continue;   // sudah lazy, atau bukan halaman 3D
  pending.push(name);
  if (check) continue;

  const fns = [];
  src = src.replace(/<script type="module">[\s\S]*?<\/script>/g, (block) => {
    if (!block.includes(STATIC_IMPORTS)) return block;
    const r = transformModule(block, name);
    fns.push(r.fn);
    return r.out;
  });
  if (!fns.length) throw new Error(`${name}: tidak ada modul yang diubah`);

  const calls = fns.map(fn =>
    "      if (typeof window." + fn + " === 'function') window." + fn + "();").join('\n');
  src = replaceOnce(src, TAB_ANCHOR,
    TAB_ANCHOR + '\n' +
    '    // Pemicu UTAMA lazy-load model 3D. Kontainernya berada di dalam panel\n' +
    '    // "anatomi" yang display:none secara default, sehingga\n' +
    '    // IntersectionObserver di module script tidak pernah menyala. Klik tab\n' +
    '    // ini satu-satunya titik yang tahu kapan panel Anatomi ditampilkan.\n' +
    "    if (btn.dataset.tab === 'anatomi') {\n" + calls + '\n    }',
    'anchor listener tab', name);

  fs.writeFileSync(file, src);
  changed++;
  console.log('  ' + name + '  →  ' + fns.join(', '));
}

if (check) {
  if (pending.length) {
    console.error('Masih memakai import statis Three.js:');
    pending.forEach(f => console.error('  Materi/' + f));
    console.error('\nJalankan: node scripts/lazy-load-three.js');
    process.exit(1);
  }
  console.log('Semua viewer 3D sudah lazy-load.');
} else {
  console.log(changed ? '\n' + changed + ' berkas diubah.' : 'Tidak ada yang perlu diubah.');
}
