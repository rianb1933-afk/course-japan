#!/usr/bin/env python3
"""
Kembalikan blok <style> yang dihapus tanpa penggantinya.
========================================================

Bug
---
Penyeragaman CSS mengganti blok <style> inline di 261 halaman dengan tautan ke
stylesheet bersama. Untuk 97 halaman itu benar. Untuk 164 halaman lainnya
aturannya TIDAK ada di stylesheet manapun yang dimuat halaman itu — nama
kelasnya berbeda (.page-hero vs .hero, .badge vs .bdg), sehingga 2.586 kelas
kehilangan definisinya.

Diukur di Chromium pada Materi/Kaigo.html — hub berisi 100 kartu modul:

    .kg-card   latar #FEFCF8 → transparan, padding 14,4px → 0, flex → inline
    .kg-badge  badge hijau   → teks polos
    .kg-chip   pil merah     → tombol abu bawaan browser

Materi/Kana-Hiragana-Katakana.html tingginya 3204 → 8620 piksel.

Perbaikan
---------
Blok <style> dikembalikan dari commit sebelum penyeragaman, HANYA untuk
halaman yang kelasnya benar-benar jadi yatim. 97 halaman yang penggantiannya
berhasil tidak disentuh — kerja itu memang benar dan tetap dipertahankan.

Memindahkan aturan yang hilang ke stylesheet bersama adalah perbaikan yang
lebih benar, tapi itu 2.586 kelas di 164 halaman: pekerjaan konsolidasi
tersendiri, bukan penambal regresi. check_orphan_classes di validator kini
menjaga supaya percobaan berikutnya tidak bisa dikirim setengah jadi.

Pemakaian
---------
    python3 scripts/restore_inline_styles.py --check
    python3 scripts/restore_inline_styles.py
"""

import os
import re
import sys
import glob
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Sumber pemulihan, dicoba berurutan dari yang paling baru.
#
# Kelas bug ini terjadi DUA KALI: sebagian halaman kehilangan <style>-nya saat
# penyeragaman CSS (setelah 92e4ed1), sebagian lagi lebih awal saat kode kuis
# Kaigo diekstrak (22dfdca). Yang lebih baru dicoba lebih dulu supaya perbaikan
# yang sudah dilakukan sejak itu tidak ikut terbawa mundur.
SOURCES = ['92e4ed1', '22dfdca~1']

SKIP = {'Kelas-Online.html', 'Kelas-Report.html'}

STYLE_BLOCK = re.compile(r'<style[^>]*>.*?</style>', re.S | re.I)
LINKED_CSS = re.compile(r'<link[^>]+href="([^"?]+\.css)')
CLASS_ATTR = re.compile(r'class="([^"]+)"')
CSS_CLASS = re.compile(r'\.([a-zA-Z][\w-]*)')

_sheet_cache = {}


def classes_in_sheet(path):
    if path not in _sheet_cache:
        try:
            with open(path, encoding='utf-8', errors='ignore') as f:
                _sheet_cache[path] = set(CSS_CLASS.findall(f.read()))
        except OSError:
            _sheet_cache[path] = set()
    return _sheet_cache[path]


def orphan_classes(page, html):
    """Kelas yang dipakai markup tapi tidak terdefinisi di manapun."""
    available = set()
    for block in STYLE_BLOCK.findall(html):
        available |= set(CSS_CLASS.findall(block))
    for href in LINKED_CSS.findall(html):
        available |= classes_in_sheet(
            os.path.normpath(os.path.join(os.path.dirname(page), href)))

    used = set()
    for attr in CLASS_ATTR.findall(html):
        used |= set(attr.split())
    return used - available


def main():
    check = '--check' in sys.argv
    restored, healthy = [], 0

    for page in sorted(glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)):
        rel = os.path.relpath(page, ROOT)
        if 'node_modules' in rel or os.path.basename(page) in SKIP:
            continue

        with open(page, encoding='utf-8', errors='ignore') as f:
            html = f.read()

        old_blocks = []
        for source in SOURCES:
            old = subprocess.run(['git', 'show', f'{source}:{rel}'],
                                 cwd=ROOT, capture_output=True, text=True).stdout
            old_blocks = STYLE_BLOCK.findall(old) if old else []
            if old_blocks:
                break
        if not old_blocks:
            continue
        if len(STYLE_BLOCK.findall(html)) >= len(old_blocks):
            continue                       # tidak ada yang hilang

        missing = orphan_classes(page, html)
        # Hanya kembalikan bila blok lama memang mendefinisikan yang hilang itu.
        recoverable = set()
        for block in old_blocks:
            recoverable |= set(CSS_CLASS.findall(block))
        if not (missing & recoverable):
            healthy += 1
            continue

        restored.append((rel, len(missing & recoverable)))
        if not check:
            head_end = html.find('</head>')
            block = '\n'.join(old_blocks) + '\n'
            with open(page, 'w', encoding='utf-8') as f:
                f.write(html[:head_end] + block + html[head_end:])

    if not restored:
        print('✅ Tidak ada halaman yang kehilangan definisi kelasnya.')
        return 0

    total = sum(n for _, n in restored)
    print(f'{len(restored)} halaman, {total} kelas dikembalikan definisinya.')
    print(f'{healthy} halaman lain penggantiannya benar — tidak disentuh.\n')
    for rel, n in sorted(restored, key=lambda r: -r[1])[:8]:
        print(f'  {n:4d} kelas  {rel}')
    if len(restored) > 8:
        print(f'  …dan {len(restored) - 8} halaman lain')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
