#!/usr/bin/env python3
"""
Pindahkan gaya kartu kosakata dari atribut style= ke kelas CSS.
===============================================================

Kenapa
------
Tiap kartu kosakata menulis gayanya sendiri di HTML:

    <div class="vocab-item" style="background:#fff;border-radius:8px;padding:10px;
                                   border-left:4px solid var(--accent,#1565c0)">
      <div style="font-size:1.05rem;font-weight:700;color:var(--accent,#1565c0)">🔊 …</div>
      <div style="font-size:.8rem;color:#777">…</div>
      <div style="font-size:.85rem;color:#333;margin-top:3px">…</div>
    </div>

Ini bukan sekadar berantakan — ia MERUSAK MODE GELAP. kaigo-module.css sudah
punya `.vocab-item{background:var(--white)}` beserta aturan
`[data-theme="dark"] .vocab-item{background:#1e1e2e}`, tapi tidak ada satu pun
!important di berkas itu, jadi `background:#fff` inline selalu menang. Di mode
gelap 555 kartu tetap putih, dan teks #333/#777 menempel pada latar terang itu.

Yang diganti
------------
    wrapper  : seluruh style= dihapus — .vocab-item sudah memberi hasil yang
               sama persis. Warna border-left inline tampak berbeda-beda
               antar halaman (#1565c0, #1b5e20, …) tapi semuanya ditulis
               sebagai var(--accent, <fallback>), dan --accent TERDEFINISI
               global (kyoto-red di terang, gold di gelap). Fallback itu tidak
               pernah terpakai, jadi menghapusnya tidak mengubah tampilan.
    judul    : → .vocab-term
    romaji   : → .vocab-romaji   (#777 → var(--ink-soft), #6E6E6E di terang)
    arti     : → .vocab-meaning  (#333 → var(--ink),      #2D2D2D di terang)

Pergeseran warna di mode terang tidak kasat mata; di mode gelap barulah
keduanya berubah menjadi terbaca.

Cakupan
-------
Hanya halaman yang MEMUAT kaigo-module.css. Keempat pola sudah diperiksa
eksklusif milik kartu kosakata — 1.260 kemunculan, semuanya di dalam
<div class="vocab-item">, tidak satu pun di tempat lain — sehingga penggantian
bisa dilakukan langsung tanpa menebak batas blok.

Sisa 150 kemunculan ada di 10 halaman Materi/Kaiwa-* yang memakai markup
vocab-item yang sama tapi tidak memuat kaigo-module.css. Halaman itu SENGAJA
dilewati: berkas tersebut juga mendefinisikan .hero, .sec, .st, dan .wrap —
nama yang cukup umum untuk menabrak tata letak halaman yang tidak dirancang
untuknya. Menyatukan gaya Materi lintas keluarga halaman adalah pekerjaan
konsolidasi CSS tersendiri.

Pemakaian
---------
    python3 scripts/codemod_vocab_card.py --check   # laporan saja
    python3 scripts/codemod_vocab_card.py           # tulis perubahan
"""

import os
import re
import sys
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLESHEET = 'kaigo-module.css'

# Wrapper: style= dibuang seluruhnya, .vocab-item sudah memberi hasil sama.
WRAPPER = re.compile(
    r'\s+style="background:#fff;border-radius:8px;padding:10px;'
    r'border-left:4px solid [^"]+"')

# Anak kartu: (pola style yang harus cocok persis, kelas penggantinya)
CHILDREN = [
    (re.compile(r'style="font-size:1\.05rem;font-weight:700;color:[^"]+"'), 'vocab-term'),
    (re.compile(r'style="font-size:\.8rem;color:#777"'), 'vocab-romaji'),
    (re.compile(r'style="font-size:\.85rem;color:#333;margin-top:3px"'), 'vocab-meaning'),
]

# Elemen yang SUDAH punya class= tidak boleh diberi class kedua.
ELEMENT = re.compile(r'<[a-zA-Z][^>]*>')

# Isi <script> dan <style> HARUS dilewati. Percobaan pertama tidak melakukan
# ini dan regex elemen di atas melahap komentar JS yang kebetulan menyebut
# "<body>", merusak tiga berkas. Markup di dalam string JS memang juga memakai
# gaya inline, tapi memperbaikinya berarti menyunting kode — pekerjaan lain.
PROTECTED = re.compile(r'<(script|style)\b[^>]*>.*?</\1>', re.S | re.I)


def transform(html):
    """Kembalikan (html_baru, jumlah_atribut_yang_hilang, konflik)."""
    removed = 0
    conflicts = []

    def do_element(match):
        nonlocal removed
        tag = match.group(0)

        tag, n = WRAPPER.subn('', tag)
        removed += n

        for pattern, cls in CHILDREN:
            if not pattern.search(tag):
                continue
            if 'class="' in tag:
                # Menambah class kedua akan menghasilkan HTML tidak sah; ini
                # tidak pernah terjadi pada data yang ada, tapi kalau markup
                # berubah, lebih baik dilewati daripada dirusak diam-diam.
                conflicts.append(tag[:80])
                continue
            tag = pattern.sub(f'class="{cls}"', tag)
            removed += 1

        return tag

    # Bangun ulang dokumen: bagian di LUAR <script>/<style> saja yang diubah,
    # blok terlindung disalin apa adanya.
    out, cursor = [], 0
    for block in PROTECTED.finditer(html):
        out.append(ELEMENT.sub(do_element, html[cursor:block.start()]))
        out.append(block.group(0))
        cursor = block.end()
    out.append(ELEMENT.sub(do_element, html[cursor:]))

    return ''.join(out), removed, conflicts


def main():
    check = '--check' in sys.argv
    rows, all_conflicts, skipped = [], [], 0

    for path in sorted(glob.glob(os.path.join(ROOT, 'Materi', '*.html'))):
        with open(path, encoding='utf-8', errors='ignore') as f:
            html = f.read()

        if 'vocab-item' not in html:
            continue
        if STYLESHEET not in html:
            skipped += 1
            continue

        new, removed, conflicts = transform(html)
        all_conflicts += conflicts
        if not removed:
            continue

        rows.append((os.path.basename(path), removed))
        if not check:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new)

    if all_conflicts:
        print(f'⚠️  {len(all_conflicts)} elemen dilewati karena sudah punya class=:')
        for c in all_conflicts[:3]:
            print(f'    {c}')

    total = sum(n for _, n in rows)
    if not rows:
        print('✅ Tidak ada gaya kartu kosakata inline yang tersisa.')
        if skipped:
            print(f'   ({skipped} halaman dilewati: tidak memuat {STYLESHEET})')
        return 0

    print(f'{len(rows)} halaman, {total:,} atribut style= dipindahkan ke kelas.')
    if skipped:
        print(f'{skipped} halaman dilewati karena tidak memuat {STYLESHEET}.')
    print()
    for name, n in sorted(rows, key=lambda r: -r[1])[:8]:
        print(f'  {n:5d}  {name}')
    if len(rows) > 8:
        print(f'  …dan {len(rows) - 8} halaman lain')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
