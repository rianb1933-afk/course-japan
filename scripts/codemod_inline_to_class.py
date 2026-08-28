#!/usr/bin/env python3
"""
Ganti atribut style= yang persis sama dengan kelas CSS yang sudah ada.
======================================================================

Kenapa
------
Sebagian besar gaya inline di situs ini BUKAN gaya khas satu elemen, melainkan
salinan aturan yang sudah tertulis di stylesheet. Contohnya kartu dialog materi
Kaigo: kaigo-module.css sudah punya .dlg-row, .dlg-jp, dan .dlg-id, tapi tiap
baris dialog tetap menuliskan deklarasi yang sama persis di HTML-nya.

Selain menggandakan byte, itu mengunci gaya di luar jangkauan tema: sebuah
aturan [data-theme="dark"] tidak bisa mengalahkan atribut style=.

Cara kerja
----------
Hanya kecocokan PERSIS yang diganti. Nilai style= dibandingkan apa adanya
dengan tabel di bawah — tidak ada penguraian CSS, tidak ada penyamaan sebagian.
Kalau sebuah elemen gayanya berbeda satu karakter pun, ia dibiarkan.

Tiga pengaman:
  1. isi <script> dan <style> tidak pernah disentuh — percobaan pertama pada
     codemod kartu kosakata tidak melakukan ini, dan regex elemennya melahap
     komentar JS yang menyebut "<body>", merusak tiga berkas;
  2. elemen yang SUDAH punya class= dilewati, karena menambah atribut class
     kedua menghasilkan HTML tidak sah;
  3. halaman yang tidak memuat stylesheet pemilik kelasnya dilewati.

Menambah pola baru
------------------
Tambahkan entri di MAPPINGS. Pastikan dulu polanya eksklusif — bahwa setiap
kemunculan gaya itu memang elemen yang dimaksud kelasnya — karena kecocokan
persis pada string pendek seperti "flex:1" bisa mengenai elemen tak terkait.

Pemakaian
---------
    python3 scripts/codemod_inline_to_class.py --check
    python3 scripts/codemod_inline_to_class.py
"""

import os
import re
import sys
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Berkas yang sedang dikerjakan di tempat lain dan belum di-commit. Menyunting
# berkas begini mencampur perubahan codemod dengan pekerjaan orang lain di satu
# berkas, sehingga keduanya tidak bisa lagi dipisah jadi commit tersendiri.
SKIP = {
    'Kelas-Online.html',
    'Kelas-Report.html',
}

# (stylesheet pemilik kelas, {nilai style= persis: nama kelas})
MAPPINGS = [
    ('kaigo-module.css', {
        # Baris dialog materi — ketiganya sudah ada di kaigo-module.css
        # dengan deklarasi yang identik karakter demi karakter.
        'display:flex;gap:10px;margin:9px 0;align-items:flex-start':
            'dlg-row',
        'font-size:.91rem;font-weight:500;color:var(--ink);line-height:1.6':
            'dlg-jp',
        'font-size:.79rem;color:var(--ink-mid);margin-top:2px':
            'dlg-id',
    }),
    ('kyoto-elevation.css', {
        # Sel tabel materi. Tabelnya tidak punya kelas, jadi tidak ada aturan
        # yang bisa menjangkaunya — kelas ini menyalin gaya inline apa adanya.
        'padding:8px 12px;border-bottom:1px solid rgba(0,0,0,.06);'
        'font-size:.85rem;vertical-align:top;line-height:1.6': 'tbl-cell',
        'padding:7px 10px;border-bottom:1px solid rgba(0,0,0,.06)': 'tbl-cell-sm',
        'font-size:11px;color:var(--ink-soft)': 'tbl-cell-meta',

        # Utilitas satu-properti. Kelasnya ber-!important supaya menyalin
        # perilaku atribut style= yang digantikannya — lihat komentarnya di
        # kyoto-elevation.css.
        'margin-bottom:0': 'u-mb-0',
        'margin-top:0': 'u-mt-0',
        'flex:1': 'u-flex-1',
    }),
]

PROTECTED = re.compile(r'<(script|style)\b[^>]*>.*?</\1>', re.S | re.I)
ELEMENT = re.compile(r'<[a-zA-Z][^>]*>')


def transform(html, table):
    replaced = 0
    skipped = []

    def do_element(match):
        nonlocal replaced
        tag = match.group(0)
        style = re.search(r'\sstyle="([^"]*)"', tag)
        if not style:
            return tag

        cls = table.get(style.group(1).strip())
        if not cls:
            return tag
        if 'class="' in tag:
            skipped.append(tag[:80])
            return tag

        replaced += 1
        return tag[:style.start()] + f' class="{cls}"' + tag[style.end():]

    out, cursor = [], 0
    for block in PROTECTED.finditer(html):
        out.append(ELEMENT.sub(do_element, html[cursor:block.start()]))
        out.append(block.group(0))
        cursor = block.end()
    out.append(ELEMENT.sub(do_element, html[cursor:]))

    return ''.join(out), replaced, skipped


def main():
    check = '--check' in sys.argv
    rows, skipped_pages, conflicts = [], 0, []

    for stylesheet, table in MAPPINGS:
        for path in sorted(glob.glob(os.path.join(ROOT, '**', '*.html'),
                                     recursive=True)):
            if 'node_modules' in path:
                continue
            if os.path.relpath(path, ROOT) in SKIP:
                continue
            with open(path, encoding='utf-8', errors='ignore') as f:
                html = f.read()

            if not any(s in html for s in table):
                continue
            if stylesheet not in html:
                skipped_pages += 1
                continue

            new, n, conf = transform(html, table)
            conflicts += conf
            if not n:
                continue
            rows.append((os.path.relpath(path, ROOT), n))
            if not check:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new)

    if conflicts:
        print(f'⚠️  {len(conflicts)} elemen dilewati karena sudah punya class=')

    if not rows:
        print('✅ Tidak ada gaya inline yang cocok persis dengan kelas.')
        return 0

    total = sum(n for _, n in rows)
    print(f'{len(rows)} halaman, {total:,} atribut style= diganti kelas.')
    if skipped_pages:
        print(f'{skipped_pages} halaman dilewati: tidak memuat stylesheet pemilik kelas.')
    print()
    for name, n in sorted(rows, key=lambda r: -r[1])[:6]:
        print(f'  {n:5d}  {name}')
    if len(rows) > 6:
        print(f'  …dan {len(rows) - 6} halaman lain')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
