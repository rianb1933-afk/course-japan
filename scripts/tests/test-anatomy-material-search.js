/**
 * Test suite: Pencarian Materi Lengkap anatomi
 * ============================================
 * Menguji fitur pencarian di anatomy-material.js:
 *  - Kotak pencarian dirender paling atas (sebelum daftar isi) dengan input
 *    #materiSearch + tombol bersihkan + hitungan hasil + pesan kosong.
 *  - applySearch(q) memfilter entri per kanji, furigana, romaji, arti
 *    Indonesia/Inggris, dan alias — case-insensitive; sistem tanpa hasil
 *    disembunyikan; hitungan dan tombol bersihkan mengikuti state query.
 *  - Query bertahan (direstorasi) setelah render() ulang.
 *
 * Modul dimuat via vm (pola test-anatomy-flashcard-save) dengan DOM palsu
 * minimal; storage palsu memakai LocalStorageMock (scripts/tests/mock-dom.js).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { LocalStorageMock } = require('./mock-dom.js');

const ROOT = path.join(__dirname, '..', '..');
const viewerSrc = fs.readFileSync(path.join(ROOT, 'assets', 'anatomy', 'anatomy-viewer.js'), 'utf8');
const materialSrc = fs.readFileSync(path.join(ROOT, 'assets', 'anatomy', 'anatomy-material.js'), 'utf8');

// ── DOM palsu minimal (sama pola dengan test-anatomy-flashcard-save) ──
function makeEl(tag) {
  const el = {
    tag, id: '', textContent: '', disabled: false, type: '', style: {}, value: '',
    _children: [], _cls: new Set(), _handlers: {}, _attrs: {}, dataset: {},
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
    focus() {},
  };
  // children: getter standar DOM yang kini dibaca applySearch (paritas
  // browser — implementasinya memakai API DOM standar, bukan _children).
  Object.defineProperty(el, 'children', {
    get() { return el._children.filter((c) => c._cls && c._cls.size >= 0); }
  });
  Object.defineProperty(el, 'className', {
    get() { return [...el._cls].join(' '); },
    set(v) { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return ''; },
    set() { el._children.length = 0; },
  });
  return el;
}

function findByClass(node, cls) {
  return findAllByClass(node, cls)[0] || null;
}
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

function makeSandbox() {
  const storage = new LocalStorageMock();
  const materiRoot = makeEl('div');
  const byId = new Map();
  const stat = makeEl('div');
  const statB = makeEl('b');
  stat.querySelector = (sel) => (sel === 'b' ? statB : null);
  const mtsWrap = makeEl('div');
  const mtsList = makeEl('div');
  mtsList._cls.add('mts-list');
  mtsList.dataset = { savedView: '1' };
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
  sandbox.window = sandbox;
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.location = { hash: '' };
  sandbox._materiRoot = materiRoot;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'anatomy', 'anatomy-data.js'), 'utf8'), ctx, { filename: 'anatomy-data.js' });
  vm.runInContext(viewerSrc, ctx, { filename: 'anatomy-viewer.js' });
  vm.runInContext(materialSrc, ctx, { filename: 'anatomy-material.js' });
  return sandbox;
}

function findSearchBox(root) { return findByClass(root, 'mat-search'); }
function findInput(root) { return findByClass(root, 'mat-search-input'); }
function findClear(root) { return findByClass(root, 'mat-search-clear'); }
function findCount(root) { return findByClass(root, 'mat-search-count'); }
function findEmpty(root) { return findByClass(root, 'mat-search-empty'); }
function findSystems(root) { return findAllByClass(root, 'mat-system'); }
// Blok sistem TIDAK bisa dicari via getElementById di mock (auto-create elemen
// kosong) — cari di pohon render berdasarkan id blok (materi-<key>).
function findSystemById(root, key) {
  return findSystems(root).find((s) => s.id === 'materi-' + key) || null;
}
function findEntryById(sys, id) {
  return findAllByClass(sys, 'mat-entry').find((e) => e.id === 'mat-' + id) || null;
}
function visibleEntries(sys) {
  return sys._children.filter((c) => c._cls && c._cls.has('mat-entry') && c.style.display !== 'none');
}
function hiddenEntries(sys) {
  return sys._children.filter((c) => c._cls && c._cls.has('mat-entry') && c.style.display === 'none');
}

const tests = [
  {
    name: 'kotak pencarian dirender paling atas, sebelum daftar isi dan sistem',
    fn() {
      const sb = makeSandbox();
      const root = sb._materiRoot;
      assert.ok(findSearchBox(root), 'wadah .mat-search tidak dirender');
      assert.ok(findInput(root), 'input pencarian tidak dirender');
      assert.strictEqual(findInput(root).id, 'materiSearch');
      assert.ok(findClear(root), 'tombol bersihkan tidak dirender');
      // Posisi: anak pertama root harus kotak pencarian (sebelum TOC/sistem)
      assert.ok(root._children[0]._cls.has('mat-search'), 'kotak pencarian harus anak pertama');
      const toc = findByClass(root, 'mat-toc');
      assert.ok(toc, 'daftar isi tetap dirender');
      const idxBox = root._children.indexOf(findSearchBox(root));
      const idxToc = root._children.indexOf(toc);
      assert.ok(idxBox < idxToc, 'kotak pencarian harus di atas daftar isi');
    },
  },
  {
    name: 'applySearch("") menampilkan semua 176 entri dan menyembunyikan hitungan',
    fn() {
      const sb = makeSandbox();
      const res = sb.NPAnatomyMaterial.applySearch('');
      const total = Object.keys(sb.NPAnatomyData.SYSTEMS).reduce((n, k) => n + sb.NPAnatomyData.SYSTEMS[k].terms.length, 0);
      assert.strictEqual(res.total, total, 'semua entri harus tampil saat query kosong');
      assert.strictEqual(res.systems, 9, 'semua 9 sistem harus tampil');
      findSystems(sb._materiRoot).forEach((s) => assert.notStrictEqual(s.style.display, 'none'));
      assert.strictEqual(findCount(sb._materiRoot).textContent, '', 'hitungan harus kosong tanpa query');
      assert.strictEqual(findClear(sb._materiRoot).style.display, 'none', 'tombol bersihkan tersembunyi tanpa query');
    },
  },
  {
    name: 'pencarian romaji (atama) → entri 頭 tampil, sistem lain disembunyikan',
    fn() {
      const sb = makeSandbox();
      const res = sb.NPAnatomyMaterial.applySearch('atama');
      assert.ok(res.total >= 1, 'minimal 頭 harus cocok');
      const sysLuar = findSystemById(sb._materiRoot, 'luar');
      assert.ok(sysLuar, 'blok sistem luar harus dirender');
      assert.ok(visibleEntries(sysLuar).length >= 1, 'entri atama harus tampil di sistem luar');
      const atamaEntry = findEntryById(sysLuar, 'atama');
      assert.ok(atamaEntry, 'entri #mat-atama harus ada');
      assert.notStrictEqual(atamaEntry.style.display, 'none');
      // Sistem tanpa kecocokan disembunyikan:
      const sysRangka = findSystemById(sb._materiRoot, 'rangka');
      assert.ok(sysRangka, 'blok sistem rangka harus dirender');
      assert.strictEqual(sysRangka.style.display, 'none', 'sistem rangka (tanpa atama) harus disembunyikan');
      assert.strictEqual(findCount(sb._materiRoot).textContent, res.total + ' istilah ditemukan');
      assert.notStrictEqual(findClear(sb._materiRoot).style.display, 'none', 'tombol bersihkan tampil saat ada query');
    },
  },
  {
    name: 'pencarian arti Indonesia (kepala) case-insensitive → 頭 cocok',
    fn() {
      const sb = makeSandbox();
      const res = sb.NPAnatomyMaterial.applySearch('kepala');
      assert.ok(res.total >= 1, 'arti Indonesia harus ikut dicari');
      const atamaEntry = findEntryById(findSystemById(sb._materiRoot, 'luar'), 'atama');
      assert.ok(atamaEntry, 'entri atama harus dirender');
      assert.notStrictEqual(atamaEntry.style.display, 'none', '頭 (Kepala) harus tampil untuk query kepala');
      // Kapitalisasi tidak boleh mempengaruhi:
      const res2 = sb.NPAnatomyMaterial.applySearch('Kepala');
      assert.strictEqual(res2.total, res.total, 'pencarian harus case-insensitive');
    },
  },
  {
    name: 'pencarian kanji (頭) → entri 頭 tampil',
    fn() {
      const sb = makeSandbox();
      const res = sb.NPAnatomyMaterial.applySearch('頭');
      assert.ok(res.total >= 1, 'kanji harus ikut dicari');
      const atamaEntry = findEntryById(findSystemById(sb._materiRoot, 'luar'), 'atama');
      assert.ok(atamaEntry, 'entri atama harus dirender');
      assert.notStrictEqual(atamaEntry.style.display, 'none');
    },
  },
  {
    name: 'query tanpa hasil → semua sistem tersembunyi + pesan kosong tampil',
    fn() {
      const sb = makeSandbox();
      const res = sb.NPAnatomyMaterial.applySearch('zzz-tidak-ada-xyz');
      assert.strictEqual(res.total, 0);
      assert.strictEqual(res.systems, 0);
      findSystems(sb._materiRoot).forEach((s) => assert.strictEqual(s.style.display, 'none', 'semua sistem harus disembunyikan'));
      const empty = findEmpty(sb._materiRoot);
      assert.ok(empty, 'pesan kosong harus dirender');
      assert.strictEqual(empty.style.display, '', 'pesan kosong harus tampil');
    },
  },
  {
    name: 'tombol bersihkan mengembalikan tampilan penuh dan mengosongkan input',
    fn() {
      const sb = makeSandbox();
      sb.NPAnatomyMaterial.applySearch('atama');
      const clr = findClear(sb._materiRoot);
      assert.notStrictEqual(clr.style.display, 'none');
      clr.click();
      const res = { total: 0 };
      const total = Object.keys(sb.NPAnatomyData.SYSTEMS).reduce((n, k) => n + sb.NPAnatomyData.SYSTEMS[k].terms.length, 0);
      findSystems(sb._materiRoot).forEach((s) => { res.total += visibleEntries(s).length; });
      assert.strictEqual(res.total, total, 'setelah bersihkan, semua entri harus tampil lagi');
      assert.strictEqual(findInput(sb._materiRoot).value, '', 'input harus kosong setelah bersihkan');
      assert.strictEqual(findCount(sb._materiRoot).textContent, '');
      assert.strictEqual(findClear(sb._materiRoot).style.display, 'none');
    },
  },
  {
    name: 'input event (dengan debounce) menerapkan filter — pola pengguna nyata',
    fn() {
      const sb = makeSandbox();
      const input = findInput(sb._materiRoot);
      input.value = 'atama';
      input._handlers.input.forEach((fn) => fn());
      // Sebelum debounce selesai, DOM belum berubah:
      const sysRangka = sb.document.getElementById('materi-rangka');
      assert.notStrictEqual(sysRangka.style.display, 'none', 'sebelum debounce, tampilan belum terfilter');
    },
  },
  {
    name: 'render() ulang merestorasi query pencarian (input + filter)',
    fn() {
      const sb = makeSandbox();
      sb.NPAnatomyMaterial.applySearch('atama');
      sb.NPAnatomyMaterial.render(); // mis. sinkronisasi tombol simpan
      const input = findInput(sb._materiRoot);
      assert.strictEqual(input.value, 'atama', 'input harus diisi ulang dengan query lama');
      const sysRangka = findSystemById(sb._materiRoot, 'rangka');
      assert.ok(sysRangka, 'blok sistem rangka harus dirender ulang');
      assert.strictEqual(sysRangka.style.display, 'none', 'filter harus diterapkan lagi setelah render ulang');
      const atamaEntry = findEntryById(findSystemById(sb._materiRoot, 'luar'), 'atama');
      assert.ok(atamaEntry, 'entri atama harus dirender ulang');
      assert.notStrictEqual(atamaEntry.style.display, 'none');
    },
  },
  {
    name: 'pencarian alias: istilah terkait ikut dicocokkan',
    fn() {
      const sb = makeSandbox();
      // Cari istilah yang punya alias, lalu pastikan pencarian alias menampilkannya.
      let aliased = null;
      Object.keys(sb.NPAnatomyData.SYSTEMS).forEach((k) => {
        sb.NPAnatomyData.SYSTEMS[k].terms.forEach((t) => {
          if (!aliased && t.aliases && t.aliases.length) aliased = t;
        });
      });
      if (!aliased) return; // tidak ada alias di data — lewati
      const alias = String(aliased.aliases[0]).toLowerCase();
      const res = sb.NPAnatomyMaterial.applySearch(alias);
      assert.ok(res.total >= 1, 'alias "' + alias + '" harus menampilkan minimal satu istilah');
      const entry = findEntryById(findSystemById(sb._materiRoot, aliased.system), aliased.id);
      assert.ok(entry, 'entri istilah ber-alias harus ada');
      assert.notStrictEqual(entry.style.display, 'none', 'istilah dengan alias harus tampil saat alias dicari');
    },
  },
];

module.exports = { tests };
