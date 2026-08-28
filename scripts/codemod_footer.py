#!/usr/bin/env python3
"""
Pindahkan gaya footer dari atribut style= ke kelas .ft-* / .site-footer.
=======================================================================

Kenapa
------
126 halaman menyalin markup footer yang sama beserta gayanya sebagai atribut
style= — 3.397 atribut — ditambah 1.058 pasang handler onmouseover/onmouseout
inline yang tidak melakukan apa pun selain mengubah warna saat kursor lewat:

    onmouseover="this.style.color='#fff'"
    onmouseout="this.style.color='rgba(255,255,255,.65)'"

Warna hover lewat JavaScript berarti setiap tautan membawa dua penangan
peristiwa, dan warnanya tidak bisa disentuh tema maupun stylesheet.

Cakupan
-------
Hanya DI DALAM <footer>, dan hanya kecocokan PERSIS dengan tabel di bawah —
kelas-kelasnya menyalin deklarasi apa adanya, jadi tampilan tidak berubah.

Pasangan handler hanya dibuang pada elemen yang gayanya memang diganti dan
warna "keluar"-nya sama dengan warna dasar kelasnya; kalau tidak cocok,
handler dibiarkan agar perilakunya tidak diam-diam berubah.

Varian opasitas lain (.35, .4, .55) tidak dibuatkan kelas: perbedaannya
kemungkinan hasil salin-tempel yang menyimpang, dan menyeragamkannya akan
mengubah tampilan tanpa keputusan desain.

Pemakaian
---------
    python3 scripts/codemod_footer.py --check
    python3 scripts/codemod_footer.py
"""

import os
import re
import sys
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLESHEET = 'kyoto-elevation.css'

# Berkas yang sedang dikerjakan di tempat lain dan belum di-commit. Menyunting
# berkas begini akan mencampur perubahan codemod dengan pekerjaan orang lain
# di satu berkas yang sama, sehingga keduanya tidak bisa lagi dipisah menjadi
# commit tersendiri. Hapus dari daftar ini setelah pekerjaan itu selesai, lalu
# jalankan ulang.
SKIP = {
    'Kelas-Online.html',
    'Kelas-Report.html',
}

CLASSES = {
    'background:var(--ink);color:rgba(255,255,255,.7);'
    'padding:3rem clamp(16px,5vw,72px) 2rem;margin-top:auto': 'site-footer',

    'max-width:1200px;margin:0 auto': 'ft-inner',
    'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));'
    'gap:2rem;margin-bottom:2.5rem': 'ft-grid',
    "font-family:'Noto Serif JP',serif;color:#fff;font-size:20px;"
    'font-weight:700;margin-bottom:.5rem': 'ft-brand',
    'font-size:13px;line-height:1.75;margin-bottom:.875rem': 'ft-tagline',
    'display:flex;gap:.4rem;flex-wrap:wrap': 'ft-chips',
    'font-size:11px;font-weight:800;color:rgba(255,255,255,.4);'
    'letter-spacing:.08em;text-transform:uppercase;margin-bottom:.75rem': 'ft-heading',
    'display:flex;flex-direction:column;gap:.35rem': 'ft-links',
    'display:flex;gap:1rem;font-size:12px': 'ft-meta',
    'font-size:12px;color:rgba(255,255,255,.35)': 'ft-note',

    'color:rgba(255,255,255,.65);font-size:13px;text-decoration:none': 'ft-link',
    'color:rgba(255,255,255,.65);font-size:13px;text-decoration:none;'
    'transition:color .15s': 'ft-link',
    'color:rgba(255,255,255,.6);text-decoration:none': 'ft-link-dim',
}

# Warna dasar tiap kelas tautan; handler onmouseout harus mengembalikan warna
# ini agar boleh dibuang.
LINK_BASE = {
    'ft-link': 'rgba(255,255,255,.65)',
    'ft-link-dim': 'rgba(255,255,255,.6)',
}

FOOTER = re.compile(r'<footer\b.*?</footer>', re.S | re.I)
ELEMENT = re.compile(r'<[a-zA-Z][^>]*>')
HOVER = re.compile(
    r'\s*onmouseover="this\.style\.color=\'#fff\'"'
    r'\s*onmouseout="this\.style\.color=\'([^\']+)\'"')


def transform(html):
    styles = hovers = 0
    skipped = []

    def do_element(match):
        nonlocal styles, hovers
        tag = match.group(0)
        style = re.search(r'\sstyle="([^"]*)"', tag)
        if not style:
            return tag

        cls = CLASSES.get(style.group(1).strip())
        if not cls:
            return tag
        if 'class="' in tag:
            skipped.append(tag[:80])
            return tag

        tag = tag[:style.start()] + f' class="{cls}"' + tag[style.end():]
        styles += 1

        # Handler hover hanya dibuang bila mengembalikan warna dasar kelasnya.
        base = LINK_BASE.get(cls)
        if base:
            def drop(m):
                nonlocal hovers
                if m.group(1).replace(' ', '') != base:
                    return m.group(0)
                hovers += 1
                return ''
            tag = HOVER.sub(drop, tag)

        return tag

    def do_footer(match):
        return ELEMENT.sub(do_element, match.group(0))

    return FOOTER.sub(do_footer, html), styles, hovers, skipped


def main():
    check = '--check' in sys.argv
    rows, conflicts, skipped_pages = [], [], 0
    total_styles = total_hovers = 0

    for path in sorted(glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)):
        if 'node_modules' in path:
            continue
        if os.path.relpath(path, ROOT) in SKIP:
            continue
        with open(path, encoding='utf-8', errors='ignore') as f:
            html = f.read()
        if not FOOTER.search(html):
            continue
        if STYLESHEET not in html:
            skipped_pages += 1
            continue

        new, styles, hovers, conf = transform(html)
        conflicts += conf
        if not styles and not hovers:
            continue

        total_styles += styles
        total_hovers += hovers
        rows.append((os.path.relpath(path, ROOT), styles, hovers))
        if not check:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new)

    if conflicts:
        print(f'⚠️  {len(conflicts)} elemen dilewati karena sudah punya class=')
    if not rows:
        print('✅ Tidak ada gaya footer inline yang tersisa.')
        return 0

    print(f'{len(rows)} halaman: {total_styles:,} atribut style= → kelas, '
          f'{total_hovers:,} handler hover → CSS :hover.')
    if skipped_pages:
        print(f'{skipped_pages} halaman dilewati: tidak memuat {STYLESHEET}.')
    print()
    for name, s, hv in sorted(rows, key=lambda r: -(r[1] + r[2]))[:6]:
        print(f'  {s:4d} gaya  {hv:4d} hover   {name}')
    if len(rows) > 6:
        print(f'  …dan {len(rows) - 6} halaman lain')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
