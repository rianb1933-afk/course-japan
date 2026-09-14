/**
 * Test suite: Pencarian modul di Materi.html
 * ===========================================
 * Mengekstrak blok <script> pencarian modul dari Materi/Materi.html dan
 * menjalankannya di vm dengan mock DOM ber-API standar (textContent,
 * classList, style, hidden) — pelajaran dari bug pencarian anatomi: jangan
 * memakai properti mock-only di implementasi.
 *
 * Yang diuji: filter cocok/sebagian/kosong, case-insensitive, trim,
 * nilai balik jumlah tampil, elemen count/clear/empty, dan wiring input.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'Materi', 'Materi.html'), 'utf8');

function extractSearchScript() {
  const marker = 'Pencarian modul: filter kartu .hub-card';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('blok script pencarian tidak ditemukan di Materi.html');
  const open = html.lastIndexOf('<script>', start);
  const close = html.indexOf('</script>', start);
  return html.slice(open + 8, close);
}

// ── Mock DOM ber-API standar ──────────────────────────────────────────────
function makeEl(overrides) {
  const listeners = {};
  const el = Object.assign({
    textContent: '',
    style: {},
    hidden: false,
    value: '',
    classList: { contains: () => false },
    focus: () => {},
    addEventListener: (ev, fn) => { listeners[ev] = fn; },
    _listeners: listeners,
  }, overrides || {});
  return el;
}

function buildMockDOM(cardTitles, sectionIds) {
  const ids = sectionIds || ['sec-a', 'sec-b'];
  const cards = cardTitles.map((title, i) => makeEl({
    textContent: title,
    classList: { contains: c => c === 'hub-card' },
    closest: sel => (sel === '.materi-sec') ? (sections[i < 3 ? 0 : 1]) : null,
  }));
  // dua grid (dua seksi) — 3 kartu pertama di seksi pertama, sisanya di kedua
  const gridA = { children: cards.slice(0, 3) };
  const gridB = { children: cards.slice(3) };
  const sections = ids.map(id => ({ id, style: {} }));
  gridA.closest = sel => (sel === '.materi-sec') ? sections[0] : null;
  gridB.closest = sel => (sel === '.materi-sec') ? sections[1] : null;
  const els = {
    hubSearch: makeEl(),
    hubSearchClear: makeEl(),
    hubSearchCount: makeEl(),
    hubSearchEmpty: makeEl(),
  };
  const document = {
    getElementById: id => els[id] || null,
    querySelectorAll: sel => (sel === '#main-content .hub-grid') ? [gridA, gridB] : [],
  };
  return { document, window: {}, els, cards, sections };
}

function runScript() {
  const mock = buildMockDOM([
    'Kanji Per Tingkat — daftar kanji N5-N1, review, kartu flash',
    'Grammar N5-N1 — pola grammar dan contoh kalimat',
    'Menyimak & Berbicara — shadowing, dialog, roleplay',
    'Semua Kartu Flash — 9.000+ kartu vocabulary dan kanji',
  ]);
  vm.runInNewContext(extractSearchScript(), Object.assign({ setTimeout, clearTimeout }, mock), { timeout: 1000 });
  return mock;
}

const tests = [
  {
    name: 'Materi: script pencarian diekstrak & tereksekusi, filterModules terekspor',
    fn() {
      const mock = runScript();
      if (typeof mock.window.filterModules !== 'function') {
        throw new Error('window.filterModules tidak terekspor');
      }
    },
  },
  {
    name: 'Materi: filter cocok sebagian — kartu non-cocok disembunyikan',
    fn() {
      const mock = runScript();
      const shown = mock.window.filterModules('kanji');
      // kartu lintas dua grid dihitung menyatu: "Kanji Per Tingkat" + "Kartu Flash" (teksnya menyebut kanji)
      if (shown !== 2) throw new Error(`harusnya 2 tampil, dapat ${shown}`);
      if (mock.cards[0].style.display !== '') throw new Error('kartu cocok harus tetap tampil');
      if (mock.cards[1].style.display !== 'none') throw new Error('kartu grammar harus disembunyikan');
      if (mock.cards[2].style.display !== 'none') throw new Error('kartu menyimak harus disembunyikan');
    },
  },
  {
    name: 'Materi: filter case-insensitive + trim',
    fn() {
      const mock = runScript();
      if (mock.window.filterModules('  GRAMMAR  ') !== 1) {
        throw new Error('pencarian " GRAMMAR " harusnya menemukan 1 modul');
      }
      if (mock.cards[1].style.display !== '') throw new Error('kartu grammar harus tampil');
    },
  },
  {
    name: 'Materi: query kosong menampilkan semua lagi & menyembunyikan count/empty',
    fn() {
      const mock = runScript();
      mock.window.filterModules('zzz-empat-empat');
      mock.window.filterModules('');
      mock.cards.forEach((c, i) => {
        if (c.style.display !== '') throw new Error(`kartu ${i} harus tampil setelah reset`);
      });
      if (!mock.els.hubSearchCount.hidden) throw new Error('count harus tersembunyi saat kosong');
      if (!mock.els.hubSearchEmpty.hidden) throw new Error('empty harus tersembunyi saat kosong');
      if (!mock.els.hubSearchClear.hidden) throw new Error('tombol clear harus tersembunyi saat kosong');
    },
  },
  {
    name: 'Materi: tidak ada hasil — pesan empty tampil, count 0',
    fn() {
      const mock = runScript();
      const shown = mock.window.filterModules('zzzqqq');
      if (shown !== 0) throw new Error('harusnya 0 tampil');
      if (mock.els.hubSearchEmpty.hidden) throw new Error('pesan empty harus tampil');
      if (mock.els.hubSearchCount.hidden) throw new Error('count harus tampil');
      if (mock.els.hubSearchCount.textContent !== '0 modul ditemukan') {
        throw new Error('teks count salah: ' + mock.els.hubSearchCount.textContent);
      }
    },
  },
  {
    name: 'Materi: count menampilkan jumlah hasil + tombol clear muncul saat query aktif',
    fn() {
      const mock = runScript();
      mock.window.filterModules('kartu');
      if (mock.els.hubSearchCount.textContent !== '2 modul ditemukan') {
        throw new Error('teks count salah: ' + mock.els.hubSearchCount.textContent);
      }
      if (mock.els.hubSearchClear.hidden) throw new Error('tombol clear harus muncul');
    },
  },
  {
    name: 'Materi: input ter-wire event input (debounce) & tombol clear mereset',
    fn() {
      const mock = runScript();
      const input = mock.els.hubSearch;
      const clearBtn = mock.els.hubSearchClear;
      if (!input._listeners.input) throw new Error('listener input tidak terpasang');
      if (!clearBtn._listeners.click) throw new Error('listener clear tidak terpasang');
      // simulasi ketik: debounce 120ms — langsung filter belum berubah
      input.value = 'grammar';
      input._listeners.input();
      if (mock.cards[1].style.display === 'none') {
        throw new Error('filter harus ter-debounce, belum berjalan saat ini juga');
      }
      setTimeout(() => {
        if (mock.cards[1].style.display !== '') {
          throw new Error('setelah debounce, kartu grammar harus tampil');
        }
      }, 200);
      // tombol clear: kosongkan + tampilkan semua
      mock.window.filterModules('grammar');
      clearBtn._listeners.click();
      if (mock.cards[1].style.display !== '') throw new Error('clear harus menampilkan semua kartu');
      if (mock.els.hubSearch.value !== '') throw new Error('clear harus mengosongkan input');
    },
  },  {
    name: 'Materi: seksi yang semua kartunya tidak cocok ikut disembunyikan',
    fn() {
      const mock = runScript();
      // "grammar" hanya ada di kartu index 1 (seksi pertama) → seksi kedua kosong
      mock.window.filterModules('grammar');
      if (mock.sections[0].style.display !== '') throw new Error('seksi pertama harus tampil');
      if (mock.sections[1].style.display !== 'none') throw new Error('seksi kedua harus disembunyikan');
      // "9.000+" hanya ada di kartu seksi kedua
      mock.window.filterModules('9.000+');
      if (mock.sections[0].style.display !== 'none') throw new Error('seksi pertama harus disembunyikan');
      if (mock.sections[1].style.display !== '') throw new Error('seksi kedua harus tampil');
      mock.window.filterModules('');
      mock.sections.forEach((sec, i) => {
        if (sec.style.display !== '') throw new Error(`seksi ${i} harus tampil setelah reset`);
      });
    },
  },
];

module.exports = { tests };
