#!/usr/bin/env python3
"""
Terapkan CSS yang di-preload tapi tidak pernah dipasang.
=========================================================

Bug
---
98 halaman menulis:

    <link rel="preload" href="../assets/kyoto-bundle.min.css" as="style">

tanpa pernah memasangnya sebagai stylesheet. Tidak ada onload="this.rel=
'stylesheet'", tidak ada JS yang menukar rel-nya, tidak ada <noscript>.
Berkasnya diunduh lalu dibuang.

Akibatnya dua, dan yang kedua terlihat pengguna:

  1. 40 KB terunduh percuma di tiap kunjungan halaman itu.

  2. SELURUH token desain tidak terdefinisi. Diperiksa di Chromium pada
     Materi/Kosakata-N2.html: --ink, --cream, --white, dan --primary semuanya
     kosong. Halaman tetap terlihat benar HANYA karena hampir setiap
     pemakaiannya menulis fallback literal, var(--ink, #2D2D2D).

     Yang tidak punya fallback adalah MODE GELAP. Override [data-theme="dark"]
     tinggal di berkas yang tidak pernah dipasang itu, jadi menyetel
     data-theme="dark" tidak mengubah apa pun:

       Kosakata-N2  terang rgb(248,243,233) → gelap rgb(248,243,233)  tak berubah
       Kaigo-CPR    terang rgb(248,243,233) → gelap rgb(18,18,18)     berubah

     Padahal halaman-halaman itu punya tombol ganti tema. Menekannya tidak
     melakukan apa-apa.

Perbaikan
---------
rel="preload" … as="style"  →  rel="stylesheet"

Tautan preload itu sudah berada sebelum stylesheet lain di head, jadi urutan
cascade-nya sama dengan halaman yang memuatnya dengan benar. Nilai fallback
yang selama ini terpakai sama persis dengan nilai token di berkasnya
(--ink #2D2D2D, --cream #F8F3E9), sehingga mode terang tidak berubah.

Pemakaian
---------
    python3 scripts/fix_preloaded_css.py --check
    python3 scripts/fix_preloaded_css.py
"""

import os
import re
import sys
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Berkas yang sedang dikerjakan di tempat lain dan belum di-commit.
SKIP = {'Kelas-Online.html', 'Kelas-Report.html'}

PRELOAD = re.compile(
    r'<link\s+rel="preload"\s+href="([^"]+\.css[^"]*)"\s+as="style"\s*/?>')


def stylesheet_hrefs(html):
    out = set()
    for m in re.finditer(r'<link[^>]*>', html):
        tag = m.group(0)
        if 'rel="stylesheet"' not in tag:
            continue
        href = re.search(r'href="([^"]+)"', tag)
        if href:
            out.add(href.group(1).split('?')[0])
    return out


def main():
    check = '--check' in sys.argv
    rows = []

    for page in sorted(glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)):
        rel = os.path.relpath(page, ROOT)
        if 'node_modules' in rel or rel in SKIP:
            continue

        with open(page, encoding='utf-8', errors='ignore') as f:
            html = f.read()

        applied = stylesheet_hrefs(html)
        fixed = []

        def swap(m):
            href = m.group(1)
            if href.split('?')[0] in applied:
                return m.group(0)          # sudah dipasang di tempat lain
            fixed.append(href)
            return f'<link rel="stylesheet" href="{href}">'

        new = PRELOAD.sub(swap, html)
        if not fixed:
            continue

        rows.append((rel, fixed))
        if not check:
            with open(page, 'w', encoding='utf-8') as f:
                f.write(new)

    if not rows:
        print('✅ Tidak ada CSS yang di-preload tanpa dipasang.')
        return 0

    counts = {}
    for _, hrefs in rows:
        for h in hrefs:
            counts[os.path.basename(h.split('?')[0])] = counts.get(
                os.path.basename(h.split('?')[0]), 0) + 1

    print(f'{len(rows)} halaman diperbaiki:\n')
    for name, n in sorted(counts.items(), key=lambda x: -x[1]):
        path = os.path.join(ROOT, 'assets', name)
        size = os.path.getsize(path) / 1024 if os.path.exists(path) else 0
        print(f'  {n:4d} halaman × {size:5.0f} KB   {name}')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
