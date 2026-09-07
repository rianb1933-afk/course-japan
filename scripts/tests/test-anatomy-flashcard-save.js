/**
 * Test suite: Tombol "Simpan ke Flashcard" di Materi Lengkap anatomi
 * ===================================================================
 * Menguji integrasi anatomy-material.js ⇄ anatomy-viewer.js:
 *  - Viewer mengekspor addToFlashcards()/readFlashcards() yang menulis
 *    storage np-anatomy-flashcards (array JSON berisi id istilah) — storage
 *    yang PERSIS sama dengan tombol simpan di panel diagram.
 *  - Material merender tombol simpan per entri; klik memanggil API viewer,
 *    tombol berubah "✓ Tersimpan" dan disabled; re-render mengenali state.
 *
 * Modul dimuat via vm (pola load-platform) dengan DOM palsu minimal.
 * Storage palsu memakai LocalStorageMock (scripts/tests/mock-dom.js).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { LocalStorageMock } = require('./mock-dom.js');

// Array yang dibuat DI DALAM vm punya prototype realm berbeda — deepStrictEqual
// menolaknya meski isinya sama. Bandingkan lewat JSON untuk nilai lintas-realm.
function jsonEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const ROOT = path.join(__dirname, '..', '..');
const viewerSrc = fs.readFileSync(path.join(ROOT, 'assets', 'anatomy', 'anatomy-viewer.js'), 'utf8');
const materialSrc = fs.readFileSync(path.join(ROOT, 'assets', 'anatomy', 'anatomy-material.js'), 'utf8');

// ── DOM palsu minimal ─────────────────────────────────────────────
function makeEl(tag) {
  const el = {
    tag, id: '', textContent: '', innerHTML: '', disabled: false, type: '', style: {},
    _children: [], _cls: new Set(), _handlers: {}, _attrs: {}, dataset: {},
    classList: {
      add: (c) => el._cls.add(c),
      remove: (c) => el._cls.delete(c),
      contains: (c) => el._cls.has(c),
    },
    addEventListener(type, fn) { (el._handlers[type] = el._handlers[type] || []).push(fn); },
    removeEventListener() {},
    click() { (el._handlers.click || []).forEach((fn) => fn()); },
    appendChild(c) { el._children.push(c); return c; },
    setAttribute(k, v) { el._attrs[k] = v; },
    getAttribute(k) { return el._attrs[k] != null ? el._attrs[k] : null; },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  // `el.className = 'a b'` (dipakai helper el() material) harus mengisi _cls,
  // supaya pencarian tombol via classList.contains('mat-save') bekerja.
  Object.defineProperty(el, 'className', {
    get() { return [...el._cls].join(' '); },
    set(v) { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  // `innerHTML = ''` (render() membangun ulang dari nol) harus benar-benar
  // mengosongkan anak — kalau tidak, tombol render sebelumnya menempel dan
  // pemeriksaan re-render membaca tombol basi (jebakan yang sama di suite kuis).
  Object.defineProperty(el, 'innerHTML', {
    get() { return ''; },
    set() { el._children.length = 0; },
  });
  return el;
}

function makeSandbox() {
  const storage = new LocalStorageMock();
  const sandbox = {
    localStorage: storage,
    navigator: { userAgent: 'node-test' },
    console,
    setTimeout, clearTimeout,
    CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; } },
    speechSynthesis: null,
    // Material merender ke wadah #materiLengkap; semua id lain (elemen DOM
    // milik viewer) dibuat on-demand — cukup ada, tak pernah dipakai tes.
    document: {
      readyState: 'complete',
      createElement: (tag) => makeEl(tag),
      createTextNode: (t) => ({ textContent: t }),
      getElementById: (id) => (id === 'materiLengkap' ? materiRoot : makeEl(id)),
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener() {},
      dispatchEvent() {},
      body: makeEl('body'),
    },
    _storage: storage,
  };
  const materiRoot = makeEl('div');
  sandbox._materiRoot = materiRoot;
  return sandbox;
}

// Memuat kedua modul ke sandbox YANG SAMA (viewer dulu, seperti urutan <script> halaman)
function loadModules() {
  const sandbox = makeSandbox();
  sandbox.window = sandbox; // modul IIFE ditutup dengan })(window)
  sandbox.addEventListener = () => {};   // viewer memasang listener resize dsb.
  sandbox.removeEventListener = () => {};
  sandbox.location = { hash: '' };       // openFromHash() membaca location.hash
  const ctx = vm.createContext(sandbox);
  // Data dulu (viewer berhenti awal tanpanya), lalu viewer + material —
  // urutan yang sama dengan tag <script> di Anatomi-Dasar.html.
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'anatomy', 'anatomy-data.js'), 'utf8'), ctx, { filename: 'anatomy-data.js' });
  vm.runInContext(viewerSrc, ctx, { filename: 'anatomy-viewer.js' });
  vm.runInContext(materialSrc, ctx, { filename: 'anatomy-material.js' });
  return sandbox;
}

// Mencari tombol simpan di dalam entri yang dirender material
function findSaveButtons(root) {
  const out = [];
  (function walk(node) {
    if (!node || !node._children) return;
    for (const c of node._children) {
      if (c._cls && c._cls.has('mat-save')) out.push(c);
      walk(c);
    }
  })(root);
  return out;
}

const tests = [
  {
    name: 'viewer mengekspor addToFlashcards + readFlashcards di NPAnatomyViewer',
    fn() {
      const sb = loadModules();
      assert.ok(sb.NPAnatomyViewer, 'NPAnatomyViewer tidak terekspor');
      assert.strictEqual(typeof sb.NPAnatomyViewer.addToFlashcards, 'function');
      assert.strictEqual(typeof sb.NPAnatomyViewer.readFlashcards, 'function');
    },
  },
  {
    name: 'addToFlashcards menulis np-anatomy-flashcards (array id) — storage yang persis sama',
    fn() {
      const sb = loadModules();
      assert.strictEqual(sb.NPAnatomyViewer.addToFlashcards('atama'), 'added');
      assert.ok(jsonEq(JSON.parse(sb._storage.getItem('np-anatomy-flashcards')), ['atama']));
      // Sama dengan yang dibaca readFlashcards:
      assert.ok(jsonEq(sb.NPAnatomyViewer.readFlashcards(), ['atama']));
    },
  },
  {
    name: 'id dobel ditolak (exists) — tidak ada duplikasi di storage',
    fn() {
      const sb = loadModules();
      assert.strictEqual(sb.NPAnatomyViewer.addToFlashcards('me'), 'added');
      assert.strictEqual(sb.NPAnatomyViewer.addToFlashcards('me'), 'exists');
      assert.ok(jsonEq(sb.NPAnatomyViewer.readFlashcards(), ['me']));
    },
  },
  {
    name: 'storage korup → readFlashcards pulih ke [] dan addToFlashcards tetap bekerja',
    fn() {
      const sb = loadModules();
      sb._storage.setItem('np-anatomy-flashcards', '{oops');
      assert.ok(jsonEq(sb.NPAnatomyViewer.readFlashcards(), []));
      assert.strictEqual(sb.NPAnatomyViewer.addToFlashcards('kubi'), 'added');
      assert.ok(jsonEq(sb.NPAnatomyViewer.readFlashcards(), ['kubi']));
    },
  },
  {
    name: 'material merender satu tombol Simpan per entri (176 total)',
    fn() {
      const sb = loadModules();
      const btns = findSaveButtons(sb._materiRoot);
      const total = Object.keys(sb.NPAnatomyData.SYSTEMS).reduce((n, k) => n + sb.NPAnatomyData.SYSTEMS[k].terms.length, 0);
      assert.strictEqual(btns.length, total, 'jumlah tombol != jumlah istilah');
    },
  },
  {
    name: 'klik tombol → storage terisi, tombol berubah "✓ Tersimpan" + disabled',
    fn() {
      const sb = loadModules();
      const btns = findSaveButtons(sb._materiRoot);
      const target = btns[3];
      assert.strictEqual(target.textContent, '💾 Simpan ke Flashcard');
      target.click();
      const stored = JSON.parse(sb._storage.getItem('np-anatomy-flashcards'));
      assert.ok(stored.length >= 1, 'storage kosong setelah klik');
      assert.strictEqual(target.textContent, '✓ Tersimpan');
      assert.strictEqual(target.disabled, true);
      assert.ok(target.classList.contains('saved'));
      // Klik kedua: storage tidak bertambah (id yang sama tidak dobel)
      const n = stored.length;
      // tombol sudah disabled; panggil API langsung untuk verifikasi exists:
      assert.strictEqual(sb.NPAnatomyViewer.addToFlashcards(stored[0]), 'exists');
      assert.strictEqual(JSON.parse(sb._storage.getItem('np-anatomy-flashcards')).length, n);
    },
  },
  {
    name: 're-render mengenali id tersimpan (tombol mulai "✓ Tersimpan")',
    fn() {
      const sb = loadModules();
      const id = sb.NPAnatomyData.SYSTEMS.luar.terms[0].id;
      sb.NPAnatomyViewer.addToFlashcards(id);
      sb.NPAnatomyMaterial.render(); // render ulang
      const btns = findSaveButtons(sb._materiRoot);
      // Tombol entri pertama sistem pertama harus sudah tersimpan:
      assert.strictEqual(btns[0].textContent, '✓ Tersimpan');
      assert.strictEqual(btns[0].disabled, true);
      const fresh = btns.filter((b) => b.textContent === '💾 Simpan ke Flashcard');
      assert.strictEqual(fresh.length, btns.length - 1, 'tepat satu tombol harus tersimpan');
    },
  },
  {
    name: 'storage 176 id penuh → SEMUA tombol "✓ Tersimpan"',
    fn() {
      const sb = loadModules();
      const all = [];
      Object.keys(sb.NPAnatomyData.SYSTEMS).forEach((k) => sb.NPAnatomyData.SYSTEMS[k].terms.forEach((t) => all.push(t.id)));
      all.forEach((id) => sb.NPAnatomyViewer.addToFlashcards(id));
      sb.NPAnatomyMaterial.render();
      const btns = findSaveButtons(sb._materiRoot);
      assert.ok(btns.length > 0);
      btns.forEach((b) => assert.strictEqual(b.textContent, '✓ Tersimpan'));
    },
  },    {
    name: 'viewer offline (material dimuat sendirian) → tombol tidak dirender, tanpa crash',
    fn() {
      const sb = makeSandbox();
      sb.window = sb; // modul IIFE ditutup dengan })(window)
      const ctx = vm.createContext(sb);
      // Hanya data + material — TANPA viewer:
      vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'anatomy', 'anatomy-data.js'), 'utf8'), ctx, { filename: 'anatomy-data.js' });
      vm.runInContext(materialSrc, ctx, { filename: 'anatomy-material.js' });
      assert.ok(sb.NPAnatomyMaterial, 'material harus tetap terekspor');
      assert.strictEqual(findSaveButtons(sb._materiRoot).length, 0, 'tanpa viewer, tombol simpan tidak boleh ada');
    },
  },
];

module.exports = { tests };
