#!/usr/bin/env python3
"""
Tutup komentar HTML yang tidak pernah ditutup di 32 halaman Kaigo.
==================================================================

Bug
---
32 halaman membuka komentar penjelas dan lupa menutupnya:

    <!-- GENUINELY DIPERBAIKI (Fase Audit Website Putaran Keempat, Fase N):
         dikonfirmasi pola bug identik dengan Kaigo-Alzheimer-Lanjut.html --
         tag script eksternal genuinely mengabaikan konten inline karena
         atribut src hadir. Dipisah ke tag terpisah, dibungkus
         DOMContentLoaded untuk mengantisipasi masalah timing DOM
                                                    ↑ tidak ada -->

Browser lalu memperlakukan SEMUA markup sesudahnya sebagai komentar, sampai
menemukan `-->` milik komentar lain jauh di bawah. Diperiksa di Chromium pada
Materi/Kaigo-Nutrition.html:

    <h1>       tidak ada di DOM
    .tip       tidak ada di DOM
    teks tampak  1.629 karakter  (halaman sehat: 5.144)

Judul halaman dan paragraf pembukanya tidak pernah terlihat pembaca. Ikut
tertelan juga <link rel="manifest"> dan meta apple-mobile-web-app — jadi
manifest PWA-nya pun tidak pernah dimuat di halaman-halaman itu.

Bug ini tidak menimbulkan error apa pun. Halaman memuat dengan tenang,
hanya isinya berkurang.

Perbaikan
---------
Sisipkan ` -->` tepat setelah baris terakhir prosa komentar itu. Polanya
identik di ke-32 halaman: prosa selalu berakhir dengan "timing DOM".

Pemakaian
---------
    python3 scripts/fix_unclosed_comment.py --check
    python3 scripts/fix_unclosed_comment.py
"""

import os
import re
import sys
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {'Kelas-Online.html', 'Kelas-Report.html'}

OPENER = '<!-- GENUINELY DIPERBAIKI'
# Akhir prosa komentar; ` -->` disisipkan tepat sesudahnya.
PROSE_END = re.compile(r'(DOMContentLoaded untuk mengantisipasi masalah timing DOM)(?!\s*-->)')


def unbalanced(html):
    stripped = re.sub(r'<script\b[^>]*>.*?</script>|<style[^>]*>.*?</style>', '',
                      html, flags=re.S | re.I)
    return len(re.findall(r'<!--', stripped)) != len(re.findall(r'-->', stripped))


def main():
    check = '--check' in sys.argv
    fixed, skipped = [], []

    for page in sorted(glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)):
        rel = os.path.relpath(page, ROOT)
        if 'node_modules' in rel or os.path.basename(page) in SKIP:
            continue

        with open(page, encoding='utf-8', errors='ignore') as f:
            html = f.read()

        if not unbalanced(html) or OPENER not in html:
            continue

        new, n = PROSE_END.subn(r'\1 -->', html, count=1)
        if n != 1 or unbalanced(new):
            skipped.append(rel)
            continue

        fixed.append(rel)
        if not check:
            with open(page, 'w', encoding='utf-8') as f:
                f.write(new)

    if skipped:
        print(f'⚠️  {len(skipped)} halaman polanya tidak dikenali — dilewati:')
        for r in skipped[:5]:
            print(f'    {r}')

    if not fixed:
        print('✅ Tidak ada komentar HTML yang tidak ditutup.')
        return 0

    print(f'{len(fixed)} halaman: komentar ditutup, markup di bawahnya kembali terbaca.\n')
    for r in fixed[:8]:
        print(f'  {r}')
    if len(fixed) > 8:
        print(f'  …dan {len(fixed) - 8} halaman lain')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
