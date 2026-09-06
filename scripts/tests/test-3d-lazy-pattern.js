/**
 * Test suite: Audit pola lazy-load viewer 3D (check "3d-lazy-pattern")
 * ====================================================================
 * Menguji scripts/audit-3d-lazy.js terhadap repo SINTETIS di tmpdir
 * (pola fixture env-docs). Check ini menjaga dua keluarga viewer 3D:
 * halaman Three.js (Materi/Sistem-*.html — importmap + import dinamis +
 * pemicu klik tab + IO cadangan) dan Anatomi-Dasar.html (model-viewer
 * dinamis ber-versi + GLB ber-stamp ?v= + pemicu tab + loading=eager).
 *
 * Tiap kasus membangun repo mini lalu menjalankan
 *   node scripts/audit-3d-lazy.js --check --root <tmpdir>
 * memastikan exit code dan pesan pelanggarannya tepat.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const AUDIT = path.join(__dirname, '..', 'audit-3d-lazy.js');

function runAudit(root) {
  try {
    const out = execFileSync('node', [AUDIT, '--check', '--root', root],
      { encoding: 'utf8', cwd: path.join(__dirname, '..', '..') });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

// ── Perakit repo sintetis ─────────────────────────────────────────
function threePage({ initFn = 'initFoo3D', tab = 'anatomi', staticImport = false, withTabCall = true, withIO = true } = {}) {
  const im = `<!DOCTYPE html><html><head>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/"}}</script>
</head><body>
<script type="module">
${staticImport ? "import * as THREE from 'three';" : ''}
async function ${initFn}() { const THREE = await import('three'); }
window.${initFn} = ${initFn};
const c = document.getElementById('x');
${withIO ? `if (c && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) io.unobserve(c); });
  io.observe(c);
}` : ''}
</script>
<script>
tabs.addEventListener('click', function (e) {
  var btn = e.target.closest('.tab');
  if (!btn) return;
  ${withTabCall ? `if (btn.dataset.tab === '${tab}' && typeof window.${initFn} === 'function') { window.${initFn}(); }` : ''}
});
</script>
</body></html>`;
  return im;
}

function anatomiPage({ dynamicImport = true, staticScript = false, stamp = true, trigger = true, eager = true } = {}) {
  const src = `assets/anatomy/models/human-body.glb${stamp ? '?v=6' : ''}`;
  return `<!DOCTYPE html><html><head>
${staticScript ? '<script src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js"></script>' : ''}
</head><body>
<div id="model3dContainer"></div>
<script>
var mv3dStarted = false;
function loadModel3D() {
  if (mv3dStarted) return;
  mv3dStarted = true;
  var container = document.getElementById('model3dContainer');
  ${dynamicImport ? `import('https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js')
    .then(function () {
      var mv = document.createElement('model-viewer');
      mv.setAttribute('src', '${src}');
      ${eager ? "mv.setAttribute('loading', 'eager');" : ''}
      container.appendChild(mv);
    });` : ''}
}
document.getElementById('vmTab3D').addEventListener('click', function () {
  ${trigger ? 'loadModel3D();' : ''}
});
</script>
</body></html>`;
}

function makeRepo({ three = true, anatomi = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), '3dlazy-'));
  fs.mkdirSync(path.join(root, 'Materi'));
  fs.writeFileSync(path.join(root, 'Materi', 'Sistem-Foo.html'), threePage());
  if (anatomi) {
    fs.writeFileSync(path.join(root, 'Anatomi-Dasar.html'), anatomiPage());
    fs.mkdirSync(path.join(root, 'assets', 'anatomy', 'models'), { recursive: true });
    fs.writeFileSync(path.join(root, 'assets', 'anatomy', 'models', 'human-body.glb'), 'GLB-fixture');
  }
  return root;
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Tests ────────────────────────────────────────────────────────

test('repo konsisten: 1 halaman three + anatomi model-viewer → lolos', () => {
  const root = makeRepo({});
  try {
    const r = runAudit(root);
    assert.strictEqual(r.code, 0, 'harus lolos: ' + r.out);
    assert.ok(r.out.includes('Sistem-Foo.html'), 'halaman three teraudit');
    assert.ok(r.out.includes('model-viewer lazy penuh'), 'anatomi teraudit');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('halaman tanpa importmap tidak ikut diaudit (discovery via konten)', () => {
  const root = makeRepo({});
  try {
    fs.writeFileSync(path.join(root, 'Materi', 'Biasa.html'),
      '<html><body><p>tanpa viewer 3D</p></body></html>');
    const r = runAudit(root);
    assert.strictEqual(r.code, 0, 'halaman biasa tidak boleh gagal: ' + r.out);
    assert.ok(!r.out.includes('Biasa.html'), 'halaman biasa tak disebut');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('import statis three → gagal dengan pesan import statis', () => {
  const root = makeRepo({});
  try {
    fs.writeFileSync(path.join(root, 'Materi', 'Sistem-Foo.html'), threePage({ staticImport: true }));
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/import statis/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('tanpa import dinamis three → gagal', () => {
  const root = makeRepo({});
  try {
    const s = threePage().replace(/import\('three'\)/g, "THREE.Stub");
    fs.writeFileSync(path.join(root, 'Materi', 'Sistem-Foo.html'), s);
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/import\('three'\)/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('listener tab tidak memanggil initXxx3D → gagal (viewer tak pernah muncul)', () => {
  const root = makeRepo({});
  try {
    fs.writeFileSync(path.join(root, 'Materi', 'Sistem-Foo.html'), threePage({ withTabCall: false }));
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/initFoo3D/.test(r.out) && /listener klik tab/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('tanpa IntersectionObserver → gagal (jalur cadangan wajib)', () => {
  const root = makeRepo({});
  try {
    fs.writeFileSync(path.join(root, 'Materi', 'Sistem-Foo.html'), threePage({ withIO: false }));
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/IntersectionObserver/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('anatomi: <script src> statis model-viewer → gagal (meniadakan lazy-load)', () => {
  const root = makeRepo({});
  try {
    fs.writeFileSync(path.join(root, 'Anatomi-Dasar.html'), anatomiPage({ staticScript: true }));
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/statis/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('anatomi: import dinamis hilang → gagal', () => {
  const root = makeRepo({});
  try {
    fs.writeFileSync(path.join(root, 'Anatomi-Dasar.html'), anatomiPage({ dynamicImport: false }));
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/model-viewer/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('anatomi: GLB tanpa stamp ?v= → gagal (SW cache-first menyajikan basi)', () => {
  const root = makeRepo({});
  try {
    fs.writeFileSync(path.join(root, 'Anatomi-Dasar.html'), anatomiPage({ stamp: false }));
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/\?v=/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('anatomi: file GLB tidak ada → gagal dengan petunjuk regenerasi', () => {
  const root = makeRepo({});
  try {
    fs.rmSync(path.join(root, 'assets', 'anatomy', 'models', 'human-body.glb'));
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/build-human-body-glb\.py/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('anatomi: pemicu tab hilang → gagal', () => {
  const root = makeRepo({});
  try {
    fs.writeFileSync(path.join(root, 'Anatomi-Dasar.html'), anatomiPage({ trigger: false }));
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/loadModel3D/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('anatomi: tanpa loading=eager → gagal (mode auto menggantung tanpa rAF)', () => {
  const root = makeRepo({});
  try {
    fs.writeFileSync(path.join(root, 'Anatomi-Dasar.html'), anatomiPage({ eager: false }));
    const r = runAudit(root);
    assert.strictEqual(r.code, 1);
    assert.ok(/eager/.test(r.out), 'pesan salah: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('anatomi tanpa file anatomi (repo three saja) → dilewati, tetap lolos', () => {
  const root = makeRepo({ anatomi: false });
  try {
    const r = runAudit(root);
    assert.strictEqual(r.code, 0, 'anatomi tidak ada harus skip: ' + r.out);
    assert.ok(/dilewati/.test(r.out), 'harus disebut dilewati: ' + r.out);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

module.exports = { tests };
