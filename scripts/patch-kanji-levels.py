#!/usr/bin/env python3
# patch-kanji-levels.py — Sisipkan blob rawKanji (hasil build-kanji-levels.js) ke
# Kanji-N3/N2/N1.html beserta CSS & renderer kartu kaya ala N4.
# Menulis ke /tmp dulu; salin ke Materi/ setelah dicek.
import re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, 'Materi')
ORIG = '/tmp/orig'  # salinan halaman pra-patch (git HEAD)

N4CSS_START = '<style>\n*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}'

def read(p):
    # utk 3 halaman kanji: baca versi pra-patch bila tersedia
    o = os.path.join(ORIG, os.path.basename(p))
    if os.path.exists(o): p = o
    with open(p, encoding='utf-8') as f: return f.read()

def grab_n4_css():
    h = read(os.path.join(MAT, 'Kanji-N4.html'))
    i = h.index(N4CSS_START)
    j = h.index('</style>', i)
    return h[i:j]  # tanpa tag penutup

def renderer(level, blob_path, hero_total=False):
    """Isi script renderer kartu (nama var kanjiN{lv}) — pola sama dengan N4. Tanpa tag <script>."""
    blob = read(blob_path).strip()
    total = "document.getElementById('totalHero').textContent=kanjiN%s.length;" % level if hero_total else ''
    return '''const catLabel = {
  'number':'Angka','time':'Waktu','people':'Orang','place':'Tempat',
  'verb':'Aksi','nature':'Alam','action':'Aksi','feeling':'Perasaan',
  'business':'Bisnis','abstract':'Abstrak','body':'Tubuh','other':'Lainnya'
};
const rawKanji = `%s`;

const kanjiN%s = rawKanji.trim().split('\\n').map((line, index) => {
  const [kanji, on, kun, meaning, word, reading, example] = line.split('|');
  return { index: index + 1, kanji, on, kun, meaning, word, reading, example, category: categorize(meaning, word, example) };
});
function categorize(meaning, word, example) {
  const t = `${meaning} ${word || ''} ${example || ''}`.toLowerCase();
  if (/orang|guru|dokter|teman|keluarga|ibu|ayah|anak|pria|wanita|murid|anggota|karyawan|manusia|tuan|pemimpin|saudara|suami|istri|bayi|tamu/.test(t)) return 'people';
  if (/tempat|kota|negara|sekolah|rumah|toko|stasiun|jalan|kantor|gedung|ruang|pulau|pantai|danau|gunung|universitas|desa|wilayah|daerah|pasar|pelabuhan|istana|kuil/.test(t)) return 'place';
  if (/waktu|hari|bulan|tahun|minggu|pagi|malam|siang|sore|musim|kemarin|besok|sekarang|masa|awal|akhir|zaman|jam|menit|detik|sejarah/.test(t)) return 'time';
  if (/air|api|laut|langit|bumi|sungai|pohon|bunga|alam|hujan|salju|angin|kayu|tanah|hutan|bintang|matahari|awan|es |salju|pasir|tumbuhan|hewan|ikan|burung|cuaca/.test(t)) return 'nature';
  if (/bisnis|usaha|kerja|dagang|pajak|uang|gaji|harga|bank|perusahaan|modal|investasi|ekonomi|biaya|keuntungan|perdagangan|industri|jual|beli|upah|sewa/.test(t)) return 'business';
  if (/^me|^men|^mem|^meng|^meny|^ber|^ter|^di|^pe|^per|mel|menjadi|menaruh|membuat/.test(t)) return 'action';
  return 'abstract';
}

const grid = document.getElementById('kanjiGrid');
const search = document.getElementById('search');
const countNote = document.getElementById('countNote');
let activeCat = 'all';
%s
function render(){
  const q = search.value.trim().toLowerCase();
  const rows = kanjiN%s.filter(k => {
    const catOk = activeCat === 'all' || k.category === activeCat;
    const text = `${k.kanji} ${k.on} ${k.kun} ${k.meaning} ${k.word} ${k.reading} ${k.example}`.toLowerCase();
    return catOk && text.includes(q);
  });
  grid.innerHTML = rows.map(k => `
    <article class="kanji-card">
      <div class="char">${k.kanji}</div>
      <div>
        <div class="meta"><span class="tag">N%s</span><span class="tag">${catLabel[k.category] || k.category}</span><span class="tag">#${String(k.index).padStart(3,'0')}</span></div>
        <div class="meaning">${k.meaning || '—'}</div>
        <div class="reading"><b>On:</b> ${k.on || '-'}</div>
        <div class="reading"><b>Kun:</b> ${k.kun || '-'}</div>
      </div>
      ${k.word ? `<div class="example"><span class="jp">${k.word}</span> ・ ${k.reading || ''}<br>${k.example || ''}</div>` : ''}
    </article>
  `).join('');
  countNote.textContent = `Menampilkan ${rows.length} dari ${kanjiN%s.length} kartu kanji N%s.`;
}

document.getElementById('filters').addEventListener('click', e => {
  if(e.target.tagName !== 'BUTTON') return;
  document.querySelectorAll('#filters button').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  activeCat = e.target.dataset.cat;
  render();
});
search.addEventListener('input', render);
render();
''' % (blob, level, total, level, level, level, level)

# ── template renderer untuk N1 (tanpa totalHero, memakai filter tombol N4) ──
def css_override(level_char):
    return N4CSS + ('\n.hero::before{content:\'%s\'}' % level_char)

def replace_region(html, start_anchor, end_anchor, new_text, what):
    i = html.find(start_anchor)
    if i < 0: raise SystemExit('ANCHOR START TIDAK DITEMUKAN: ' + what + ' :: ' + start_anchor[:60])
    j = html.find(end_anchor, i)
    if j < 0: raise SystemExit('ANCHOR END TIDAK DITEMUKAN: ' + what + ' :: ' + end_anchor[:60])
    j += len(end_anchor)
    return html[:i] + new_text + html[j:]

N4CSS = grab_n4_css()

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'n3'
    out_dir = '/tmp/kanji-patched'
    os.makedirs(out_dir, exist_ok=True)
    if mode == 'n3':
        h = read(os.path.join(MAT, 'Kanji-N3.html'))
        # 1) CSS utama → CSS N4 (kartu kaya), hero::before disesuaikan
        i0 = h.index(N4CSS_START); j0 = h.index('</style>', i0)
        h = h[:i0] + css_override('三級') + h[j0:]
        # 2) data compact + renderer
        a = h.index('<script>\nconst catLabel = {')
        b = h.index('</script>', a)
        h = h[:a] + '<script>\n' + renderer('3', '/tmp/kanji-blob-n3.txt', hero_total=True) + '</script>' + h[b + len('</script>'):]
        # 3) copy bagian grid
        old_sub = '<p class="section-sub">Pada level N3, fokuskan belajar pada compound vocabulary dan reading dalam konteks. Kartu ini dibuat ringan agar cepat dipindai dan mudah dicari.</p>'
        if old_sub in h:
            h = h.replace(old_sub, '<p class="section-sub">Setiap kartu memuat cara baca on&#39;yomi &amp; kun&#39;yomi, arti, dan contoh kata dengan furigana — fokus pada compound vocabulary dan reading dalam konteks.</p>')
        if '<script src="../assets/draggable-floats.js" defer></script>' not in h:
            h = h.replace('<script src="../assets/pro-app.min.js" defer></script>', '<script src="../assets/pro-app.min.js" defer></script>\n<script src="../assets/draggable-floats.js" defer></script>', 1)
        with open(os.path.join(out_dir, 'Kanji-N3.html'), 'w', encoding='utf-8') as f: f.write(h)
        print('Kanji-N3.html OK')
    elif mode == 'n2':
        h = read(os.path.join(MAT, 'Kanji-N2.html'))
        i0 = h.index(N4CSS_START); j0 = h.index('</style>', i0)
        h = h[:i0] + css_override('二級') + h[j0:]
        a = h.index('<script>\nconst catLabel = {')
        b = h.index('</script>', a)
        h = h[:a] + '<script>\n' + renderer('2', '/tmp/kanji-blob-n2.txt', hero_total=True) + '</script>' + h[b + len('</script>'):]
        old_sub = '<p class="section-sub">N2 menuntut pengenalan cepat pada compound words. Gunakan search untuk mencari karakter/meaning, lalu baca contoh dari artikel asli.</p>'
        if old_sub in h:
            h = h.replace(old_sub, '<p class="section-sub">Setiap kartu memuat on&#39;yomi &amp; kun&#39;yomi, arti, dan contoh kata ber-furigana — latih pengenalan cepat pada compound words, lalu baca contoh dari artikel asli.</p>')
        if '<script src="../assets/draggable-floats.js" defer></script>' not in h:
            h = h.replace('<script src="../assets/pro-app.min.js" defer></script>', '<script src="../assets/pro-app.min.js" defer></script>\n<script src="../assets/draggable-floats.js" defer></script>', 1)
        with open(os.path.join(out_dir, 'Kanji-N2.html'), 'w', encoding='utf-8') as f: f.write(h)
        print('Kanji-N2.html OK')
    elif mode == 'n1':
        h = read(os.path.join(MAT, 'Kanji-N1.html'))
        # 1) sisipkan CSS kartu kaya (N4) sebelum </head>
        style = '<style>\n' + N4CSS + '\n.hero::before{content:\'一級\'}\n</style>\n'
        h = h.replace('</head>', style + '</head>', 1)
        # 2) hero <main> → <section> (id main-content pindah ke grid baru)
        h = h.replace('<main id="main-content" class="hero" role="main">', '<section class="hero" role="banner">', 1)
        # hero stat 1,235 → jumlah deck lokal
        h = h.replace('<div class="hero-stat"><strong>1,235</strong><span>daftar kanji N1</span></div>',
                      '<div class="hero-stat"><strong>277</strong><span>kartu kanji N1 lokal</span></div>', 1)
        h = h.replace('<strong id="totalHero">', '<strong id="totalHero">', 1)
        # tutup hero </main> (yg pertama) menjadi </section> + toolbar + grid utama
        a = h.index('</main>')
        deck = '''</section>

<div class="toolbar"><div class="toolbar-inner">
  <input class="search" id="search" placeholder="Cari kanji, arti, reading, contoh..." aria-label="Cari">
  <div class="filter" id="filters">
    <button class="active" data-cat="all">Semua</button>
    <button data-cat="people">Orang</button>
    <button data-cat="place">Tempat</button>
    <button data-cat="time">Waktu</button>
    <button data-cat="nature">Alam</button>
    <button data-cat="business">Bisnis</button>
    <button data-cat="action">Aksi</button>
    <button data-cat="abstract">Abstrak</button>
  </div>
</div></div>
<main id="main-content" class="wrap" role="main">
  <div class="section-head">
    <div><div class="section-label">Tabel Kanji</div><h2 class="section-title">Daftar Kanji N1 — Deck Utama</h2></div>
    <p class="section-sub">Deck lokal 277 kanji N1 prioritas: cara baca, arti Indonesia, dan contoh kata ber-furigana. Gunakan search untuk mencari kanji/arti/reading.</p>
  </div>
  <div class="kanji-grid" id="kanjiGrid"></div>
  <div class="note" id="countNote"></div>
</main>
'''
        h = h[:a] + deck + h[a + len('</main>'):]
        # 3) hapus section "Pratinjau Cepat" lama (EN qcard) beserta script renderGrid
        old_sec_start = '<section class="wrap">\n  <div class="section-head">\n    <div><div class="section-label">Pratinjau Cepat</div>'
        i_sec = h.find(old_sec_start)
        if i_sec < 0: raise SystemExit('ANCHOR Pratinjau tidak ditemukan')
        # ujung section: cari '</section>' setelah quick grid — ada 2 section (strategi sebelum, sumber sesudah)
        j_sec = h.find('</section>', i_sec)
        # pastikan ini menutup Pratinjau (bukan sumber): cari section pembuka berikutnya
        next_sec = h.find('<section class="wrap">', i_sec + 10)
        j_sec = h.rfind('</section>', i_sec, next_sec)
        h = h[:i_sec] + h[j_sec + len('</section>'):]
        # 4) ganti data preview + renderGrid script dengan renderer deck
        a = h.index('<script>\nconst catLabel = {')
        b = h.index('</script>', a)
        h = h[:a] + '<script>\n' + renderer('1', '/tmp/kanji-blob-n1.txt') + '</script>' + h[b + len('</script>'):]
        # 5) meta & copy hero & sub sumber
        h = h.replace('Belajar 183+ kanji JLPT N1: kartu kanji interaktif, pencarian, on&#39;yomi, kun&#39;yomi, dan contoh kalimat konteks.',
                      'Belajar 277 kanji JLPT N1 prioritas: kartu interaktif dengan on&#39;yomi, kun&#39;yomi, arti Indonesia, dan contoh kata.')
        h = h.replace('<p>Halaman persiapan Kanji N1 untuk membaca editorial, akademik, kontrak, esai abstrak, dan teks profesional. Sumber full list di-embed dari Kanji Tools yang menampilkan 1.235 karakter N1; beberapa sumber lain memakai angka berbeda karena JLPT modern tidak menerbitkan daftar resmi final.</p>',
                      '<p>Deck lokal 277 kanji N1 prioritas untuk membaca editorial, akademik, kontrak, dan teks profesional — lengkap dengan cara baca on&#39;yomi/kun&#39;yomi, arti Indonesia, dan contoh kata. Sumber eksternal Kanji Tools di bawah menampilkan 1.235 karakter untuk eksplorasi lebih jauh.</p>')
        # label heading sumber tetap, tapi tambah konteks lokal
        h = h.replace('<div class="section-label">Sumber Lengkap</div><h2 class="section-title">Full Kanji N1 1.235 Karakter</h2>',
                      '<div class="section-label">Sumber Lengkap</div><h2 class="section-title">Daftar Lengkap Eksternal — 1.235 Karakter</h2>')
        if '<script src="../assets/draggable-floats.js" defer></script>' not in h:
            h = h.replace('<script src="../assets/pro-app.min.js" defer></script>', '<script src="../assets/pro-app.min.js" defer></script>\n<script src="../assets/draggable-floats.js" defer></script>', 1)
        with open(os.path.join(out_dir, 'Kanji-N1.html'), 'w', encoding='utf-8') as f: f.write(h)
        print('Kanji-N1.html OK')
    else:
        raise SystemExit('mode: n3|n2|n1')
    print('→', os.path.join(out_dir, 'Kanji-N' + mode[-1] + '.html'))

if __name__ == '__main__':
    main()
