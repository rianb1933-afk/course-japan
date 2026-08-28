#!/usr/bin/env python3
"""
Pindahkan blok <script> inline besar ke berkas .js tersendiri.
==============================================================

Kenapa
------
22 halaman menyimpan 1,24 MB data sebagai <script> inline: tabel kosakata,
tata bahasa, bank soal. Karena tertanam di HTML, data itu ikut terunduh ulang
setiap kali markup berubah sedikit pun, dan tidak satu pun bisa di-cache
terpisah dari halamannya.

Pemeriksaan keamanan
--------------------
Sebuah blok hanya dipindahkan bila memindahkannya TIDAK mengubah urutan
eksekusi. Blok yang dipindah dimuat dengan `defer`, artinya ia berjalan
setelah seluruh HTML selesai diurai. Itu aman untuk data dan untuk fungsi
yang dipanggil dari atribut on*= (klik terjadi jauh sesudahnya), tapi TIDAK
aman bila ada kode lain yang memakai simbolnya saat halaman masih diurai.

Karena itu blok dilewati bila:
  - ada <script> inline LAIN di halaman yang menyebut salah satu simbol
    tingkat-atas blok ini (fungsi maupun variabel),
  - blok itu sendiri memuat pernyataan yang harus jalan sebelum paint —
    penanda yang dipakai: penyetelan data-theme, atau
  - blok membaca global yang disediakan berkas <script src> ber-defer di
    halaman yang sama (mis. window.NP dari platform.js).

Syarat ketiga ditambahkan setelah Kaigo-Simulator.html lolos dua syarat
pertama tapi tetap berubah perilakunya. Bloknya memanggil window.NP.Nav.init();
saat inline, itu berjalan ketika platform.js ber-defer BELUM dimuat, sehingga
gagal diam-diam dan ditangani try/catch. Setelah ikut di-defer, NP sudah ada,
pemanggilan berhasil, dan halaman merender satu <nav> lebih sedikit. Tidak ada
error — hanya hasil yang berbeda, jenis perubahan yang paling mudah lolos.

Yang tersisa setelah saringan itu praktis hanya deklarasi data dan fungsi
penanganan klik.

Pemakaian
---------
    python3 scripts/extract_page_data.py --check
    python3 scripts/extract_page_data.py
"""

import os
import re
import sys
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, 'assets', 'page-data')
MIN_BYTES = 25_000

# Berkas yang sedang dikerjakan di tempat lain dan belum di-commit.
SKIP = {
    'Kelas-Online.html',
    'Kelas-Report.html',
}

# Halaman yang GAGAL saringan statis tapi TERBUKTI aman di browser sungguhan.
#
# Saringan di bawah menolak blok yang membaca global milik berkas lain, karena
# blok begitu bisa berubah perilaku saat ikut di-defer. Tapi saringan itu tidak
# bisa membedakan dua hal yang sangat berbeda:
#
#   Kaigo-Simulator  memanggil window.NP.Nav.init() di jalur yang berjalan saat
#                    blok dieksekusi → benar-benar berubah (satu <nav> hilang)
#   Kosakata-*       membaca window.NPXP hanya di dalam penangan klik, yang
#                    baru berjalan setelah semua berkas dimuat → tidak berubah
#
# Membedakannya butuh tahu apa yang benar-benar dijalankan, bukan apa yang
# tertulis. Karena itu keputusannya diserahkan pada bukti: tiap halaman di
# bawah dirender di Chromium sebelum dan sesudah, dan dinyatakan identik pada
# teks tampak, jumlah elemen per jenis tag, serta jumlah error halaman.
#
# JANGAN menambah entri ke sini tanpa menjalankan pembandingan itu.
VERIFIED_IN_BROWSER = {
    'Materi/Kosakata-N1.html',
    'Materi/Kosakata-N2.html',
    'Materi/Kosakata-N3.html',
    'Materi/Kosakata-N4.html',
    'Materi/Kosakata-N5.html',
}

INLINE_SCRIPT = re.compile(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', re.S)
TOP_LEVEL = re.compile(r'^\s*(?:function\s+(\w+)|(?:var|const|let)\s+(\w+))', re.M)
# Kode yang harus berjalan sebelum paint; memindahkannya membuat tema berkedip.
BEFORE_PAINT = re.compile(r"setAttribute\(\s*['\"]data-theme")


def symbols(code):
    out = set()
    for m in TOP_LEVEL.finditer(code):
        out.add(m.group(1) or m.group(2))
    return {s for s in out if s and len(s) > 2}


# Global bawaan browser; membacanya tidak bergantung pada berkas skrip lain.
BROWSER_GLOBALS = {
    'Array', 'Audio', 'Blob', 'Boolean', 'CustomEvent', 'Date', 'Error', 'Event',
    'File', 'FileReader', 'Function', 'Image', 'Intl', 'JSON', 'Map', 'Math',
    'MutationObserver', 'Notification', 'Number', 'Object', 'Promise', 'Proxy',
    'RegExp', 'Set', 'SpeechSynthesisUtterance', 'String', 'Symbol', 'URL',
    'WeakMap', 'WebSocket', 'Worker', 'XMLHttpRequest',
}

# Pembacaan global aplikasi: window.Nama dengan huruf awal kapital.
WINDOW_READ = re.compile(r'\bwindow\.([A-Z]\w+)')


def foreign_globals(code):
    """Global aplikasi yang DIBACA blok ini tapi tidak dibuatnya sendiri.

    Blok yang bergantung pada global milik berkas lain bergantung pula pada
    URUTAN MUAT. Saat inline ia berjalan sebelum semua berkas ber-defer, jadi
    globalnya belum ada; ikut di-defer membuatnya ada. Perubahan itu tidak
    memunculkan error — hanya hasil yang berbeda, dan justru itu yang paling
    mudah lolos dari pemeriksaan.

    Karena itu cukup diperiksa dari sisi bloknya saja: apa pun yang ia baca
    tapi tidak ia buat, dianggap ikatan lintas berkas.
    """
    read = set(WINDOW_READ.findall(code)) - BROWSER_GLOBALS
    made = set(re.findall(r'\bwindow\.([A-Z]\w+)\s*=(?!=)', code))
    return read - made


def analyse(html, page):
    """(blok, alasan_dilewati). blok None bila tidak ada kandidat."""
    blocks = list(INLINE_SCRIPT.finditer(html))
    if not blocks:
        return None, None

    biggest = max(blocks, key=lambda m: len(m.group(1)))
    code = biggest.group(1)
    if len(code.encode()) < MIN_BYTES:
        return None, None

    if BEFORE_PAINT.search(code):
        return biggest, 'memuat penyetelan tema yang harus jalan sebelum paint'

    foreign = foreign_globals(code)
    if foreign and os.path.relpath(page, ROOT) not in VERIFIED_IN_BROWSER:
        names = ', '.join('window.' + g for g in sorted(foreign)[:3])
        return biggest, (f'membaca {names} yang dibuat berkas lain — '
                         f'memindahkannya mengubah urutan muat')

    syms = symbols(code)
    if not syms:
        return biggest, 'tidak ada simbol tingkat-atas yang bisa dikenali'

    for other in blocks:
        if other is biggest:
            continue
        body = other.group(1)
        used = {s for s in syms if re.search(r'\b' + re.escape(s) + r'\b', body)}
        if used:
            return biggest, (f'simbol {sorted(used)[:3]} dipakai <script> inline lain '
                             f'yang berjalan saat halaman diurai')

    return biggest, None


def rel_asset_path(page):
    depth = len(os.path.relpath(page, ROOT).split(os.sep)) - 1
    return ('../' * depth) + 'assets/page-data/'


def main():
    check = '--check' in sys.argv
    moved, skipped = [], []

    for page in sorted(glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)):
        rel = os.path.relpath(page, ROOT)
        if 'node_modules' in rel or rel in SKIP:
            continue

        with open(page, encoding='utf-8', errors='ignore') as f:
            html = f.read()

        block, reason = analyse(html, page)
        if block is None:
            continue
        if reason:
            skipped.append((rel, len(block.group(1).encode()), reason))
            continue

        name = os.path.splitext(os.path.basename(page))[0].lower() + '-data.js'
        out = os.path.join(OUTDIR, name)
        code = block.group(1)

        if not check:
            os.makedirs(OUTDIR, exist_ok=True)
            with open(out, 'w', encoding='utf-8') as f:
                f.write(f'/* Data & interaksi {rel}.\n'
                        f' * Dipindahkan dari <script> inline agar bisa di-cache terpisah\n'
                        f' * dari markup halamannya. Dimuat dengan defer.\n'
                        f' */\n' + code)
            tag = f'<script src="{rel_asset_path(page)}{name}" defer></script>'
            new = html[:block.start()] + tag + html[block.end():]
            with open(page, 'w', encoding='utf-8') as f:
                f.write(new)

        moved.append((rel, len(code.encode()), name))

    if moved:
        total = sum(n for _, n, _ in moved)
        print(f'{len(moved)} halaman, {total / 1024:.0f} KB dipindah ke assets/page-data/\n')
        for rel, n, name in sorted(moved, key=lambda r: -r[1]):
            print(f'  {n / 1024:6.0f} KB  {rel}')
    else:
        print('Tidak ada blok yang memenuhi syarat.')

    if skipped:
        print(f'\n{len(skipped)} dilewati demi keamanan:')
        for rel, n, why in sorted(skipped, key=lambda r: -r[1]):
            print(f'  {n / 1024:6.0f} KB  {rel}\n            {why}')

    if check and moved:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    if moved:
        print('\n✅ Perubahan ditulis.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
