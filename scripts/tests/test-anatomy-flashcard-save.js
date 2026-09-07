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
    // querySelector('.class') minimal — cukup untuk pencarian '.mat-actions' di
    // appendRemoveButton(); kembalikan cucu/anak pertama yang cocok.
    querySelector(sel) {
      const cls = String(sel).replace(/^\./, '');
      return findByClass(el, cls);
    },
    classList: {
      add: (c) => el._cls.add(c),
      remove: (c) => el._cls.delete(c),
      contains: (c) => el._cls.has(c),
      toggle: (c) => { if (el._cls.has(c)) { el._cls.delete(c); return false; } el._cls.add(c); return true; },
    },
    addEventListener(type, fn) { (el._handlers[type] = el._handlers[type] || []).push(fn); },
    removeEventListener() {},
    click() { (el._handlers.click || []).forEach((fn) => fn()); },
    appendChild(c) { el._children.push(c); return c; },
    setAttribute(k, v) { el._attrs[k] = v; },
    getAttribute(k) { return el._attrs[k] != null ? el._attrs[k] : null; },
    querySelectorAll: () => [],
    scrollIntoView: () => {},
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
  const materiRoot = makeEl('div');
  // Material merender ke wadah #materiLengkap; elemen fitur tersimpan
  // (#statFlashcard, #materiTersimpan + .mts-list, tombol toggle) dibuat
  // sekali dan DICACHE per id — modul dan tes harus melihat elemen yang sama.
  const byId = new Map();
  const stat = makeEl('div');
  const statB = makeEl('b');
  stat.querySelector = (sel) => (sel === 'b' ? statB : null);
  const mtsWrap = makeEl('div');
  const mtsList = makeEl('div');
  mtsList._cls.add('mts-list');
  mtsList.dataset = { savedView: '1' }; // penanda renderTermEntry utk menambah tombol Hapus
  mtsWrap.querySelector = (sel) => (sel === '.mts-list' ? mtsList : null);
  byId.set('materiLengkap', materiRoot);
  byId.set('statFlashcard', stat);
  byId.set('materiTersimpan', mtsWrap);
  const sandbox = {
    localStorage: storage,
    navigator: { userAgent: 'node-test' },
    console,
    setTimeout, clearTimeout,
    CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; } },
    speechSynthesis: null,
    document: {
      readyState: 'complete',
      createElement: (tag) => makeEl(tag),
      createTextNode: (t) => ({ textContent: t }),
      getElementById: (id) => {
        if (!byId.has(id)) byId.set(id, makeEl(id));
        return byId.get(id);
      },
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener() {},
      dispatchEvent() {},
      body: makeEl('body'),
    },
    _storage: storage,
  };
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

// Cari elemen pertama dengan class tertentu secara REKURSIF — .mat-actions
// adalah cucu entri (di dalam .mat-entry-head), bukan anak langsung.
function findByClass(node, cls) {
  return findAllByClass(node, cls)[0] || null;
}

// Entri tersimpan punya DUA tombol mat-save (Simpan + Hapus) — kumpulkan semua.
function findAllByClass(node, cls) {
  const out = [];
  (function walk(n) {
    if (!n || !n._children) return;
    for (const c of n._children) {
      if (c._cls && c._cls.has(cls)) out.push(c);
      walk(c);
    }
  })(node);
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
  {
    name: 'removeFromFlashcards menghapus id dan melaporkan false utk id asing',
    fn() {
      const sb = loadModules();
      sb.NPAnatomyViewer.addToFlashcards('atama');
      sb.NPAnatomyViewer.addToFlashcards('me');
      assert.strictEqual(sb.NPAnatomyViewer.removeFromFlashcards('atama'), true);
      assert.ok(jsonEq(sb.NPAnatomyViewer.readFlashcards(), ['me']));
      assert.strictEqual(sb.NPAnatomyViewer.removeFromFlashcards('atama'), false, 'id yang sudah tak ada harus false');
      assert.strictEqual(sb.NPAnatomyViewer.removeFromFlashcards('bukan-ada'), false);
      assert.ok(jsonEq(sb.NPAnatomyViewer.readFlashcards(), ['me']));
    },
  },
  {
    name: 'updateHeroStat menulis jumlah tersimpan ke #statFlashcard b',
    fn() {
      const sb = loadModules();
      const statB = sb.document.getElementById('statFlashcard').querySelector('b');
      assert.strictEqual(statB.textContent, '0');
      sb.NPAnatomyViewer.addToFlashcards('atama');
      sb.NPAnatomyViewer.addToFlashcards('me');
      sb.NPAnatomyMaterial.updateHeroStat();
      assert.strictEqual(statB.textContent, '2');
      sb.NPAnatomyViewer.removeFromFlashcards('atama');
      sb.NPAnatomyMaterial.updateHeroStat();
      assert.strictEqual(statB.textContent, '1');
    },
  },
  {
    name: 'renderSavedView merender entri penuh hanya utk id tersimpan (+ tombol Hapus)',
    fn() {
      const sb = loadModules();
      sb.NPAnatomyViewer.addToFlashcards('atama');
      sb.NPAnatomyViewer.addToFlashcards('me');
      sb.NPAnatomyMaterial.renderSavedView();
      const list = sb.document.getElementById('materiTersimpan').querySelector('.mts-list');
      const entries = list._children.filter((n) => n._cls && n._cls.has('mat-entry'));
      assert.strictEqual(entries.length, 2, 'harus tepat 2 entri tersimpan');
      // Tiap entri punya tombol Hapus di .mat-actions (cucu entri):
      entries.forEach((e) => {
        const actions = findByClass(e, 'mat-actions');
        assert.ok(actions, 'wadah aksi tidak ditemukan di entri tersimpan');
        const rm = findAllByClass(e, 'mat-save').find((b) => b.textContent === '🗑️ Hapus');
        assert.ok(rm, 'tombol Hapus tidak ditemukan di entri tersimpan');
      });
    },
  },
  {
    name: 'klik Hapus di tampilan tersimpan → storage berkurang + daftar & hero sinkron',
    fn() {
      const sb = loadModules();
      sb.NPAnatomyViewer.addToFlashcards('atama');
      sb.NPAnatomyViewer.addToFlashcards('me');
      sb.NPAnatomyMaterial.renderSavedView();
      const list = sb.document.getElementById('materiTersimpan').querySelector('.mts-list');
      const entries = list._children.filter((n) => n._cls && n._cls.has('mat-entry'));
      const rm = findAllByClass(entries[0], 'mat-save').find((b) => b.textContent === '🗑️ Hapus');
      assert.ok(rm, 'tombol Hapus tidak ditemukan');
      rm.click();
      assert.strictEqual(JSON.parse(sb._storage.getItem('np-anatomy-flashcards')).length, 1, 'storage harus tinggal 1');
      const statB = sb.document.getElementById('statFlashcard').querySelector('b');
      assert.strictEqual(statB.textContent, '1', 'hero stat harus ikut turun');
    },
  },
  {
    name: 'renderSavedView kosong → pesan mts-empty, tanpa entri',
    fn() {
      const sb = loadModules();
      sb.NPAnatomyMaterial.renderSavedView();
      const list = sb.document.getElementById('materiTersimpan').querySelector('.mts-list');
      const entries = list._children.filter((n) => n._cls && n._cls.has('mat-entry'));
      assert.strictEqual(entries.length, 0);
      const empty = list._children.find((n) => n._cls && n._cls.has('mts-empty'));
      assert.ok(empty, 'pesan kosong tidak dirender');
    },
  },
  {
    name: 'tombol toggle #btnLihatTersimpan membuka/menutup tampilan tersimpan',
    fn() {
      const sb = loadModules();
      const wrap = sb.document.getElementById('materiTersimpan');
      const btn = sb.document.getElementById('btnLihatTersimpan');
      btn.click();
      assert.ok(wrap.classList.contains('open'), 'klik pertama harus membuka');
      assert.strictEqual(wrap.getAttribute('aria-hidden'), 'false');
      btn.click();
      assert.ok(!wrap.classList.contains('open'), 'klik kedua harus menutup');
      assert.strictEqual(wrap.getAttribute('aria-hidden'), 'true');
    },
  },
];

module.exports = { tests };
