#!/usr/bin/env python3
"""
Hitung ulang `duration` setiap modul Kaigo dari isi halamannya.
==============================================================

Kenapa ada script ini
---------------------
Durasi di kaigo_catalog.py sempat diisi manual, lalu isi modul diperdalam
puluhan kali oleh script deepen_kaigo_*.py — durasinya tidak pernah ikut
dihitung ulang. Hasilnya 63 dari 100 modul tertulis "10 mnt" padahal isinya
sudah 25-30 menit, dan angka itu tampil di setiap kartu Materi/Kaigo.html
beserta total besar di header. Selisih rata-ratanya 12 menit per modul.

Rumus
-----
    menit = kata_latin / 200          # kecepatan baca teks Indonesia
          + karakter_jepang / 300     # pembaca N4-N3 dengan furigana & terjemahan
          + 1 per soal kuis           # membaca soal, memilih, membaca penjelasan

Lalu dibulatkan ke kelipatan 5 (minimum 5). Durasi adalah perkiraan; angka
seperti "27 mnt" memberi kesan presisi yang tidak dimiliki datanya.

Yang TIDAK dihitung: nav, footer, <head>, <script>, <style>, dan SVG — semua
itu boilerplate yang sama di tiap halaman, bukan materi yang dibaca.

Pemakaian
---------
    python3 scripts/compute_durations.py --check   # laporan saja, tidak menulis
    python3 scripts/compute_durations.py           # tulis ke kaigo_catalog.py

Setelah menulis, WAJIB rebuild halaman hub:
    python3 scripts/build_kaigo_page.py
    python3 scripts/validate.py
"""

import re
import os
import sys
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG = os.path.join(ROOT, 'scripts', 'kaigo_catalog.py')
MATERI = os.path.join(ROOT, 'Materi')

WPM_LATIN = 200      # kata per menit
CPM_JAPANESE = 300   # karakter per menit
MIN_PER_QUESTION = 1

sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from kaigo_catalog import MODULES  # noqa: E402


def visible_text(html):
    """Buang boilerplate; sisakan materi yang benar-benar dibaca pelajar."""
    for tag in ('script', 'style', 'nav', 'footer', 'head', 'svg'):
        html = re.sub(rf'<{tag}\b.*?</{tag}>', ' ', html, flags=re.S | re.I)
    return re.sub(r'<[^>]+>', ' ', html)


def quiz_arrays(html):
    """Semua array soal di halaman, apa pun nama variabelnya.

    Sengaja TIDAK mencari nama tertentu: materi Kaigo memakai enam nama
    berbeda (Q, QKZ, QQ, QUIZ, QX, KN2) karena ditulis oleh generator yang
    berbeda-beda. Mencari per-nama pernah membuat 280 soal luput terhitung.
    Yang dipakai sebagai penanda adalah BENTUK datanya: array of object
    dengan kunci q/opts/a.

    Mengembalikan [(nama, jumlah_soal, (awal, akhir)), ...].
    """
    found = []
    for m in re.finditer(r'(?:var|const|let)\s+(\w+)\s*=\s*\[', html):
        name = m.group(1)
        start = html.find('[', m.start())
        depth = 0
        for i in range(start, len(html)):
            if html[i] == '[':
                depth += 1
            elif html[i] == ']':
                depth -= 1
                if depth == 0:
                    try:
                        arr = json.loads(html[start:i + 1])
                    except json.JSONDecodeError:
                        arr = None
                    if (isinstance(arr, list) and arr
                            and isinstance(arr[0], dict)
                            and {'q', 'opts', 'a'} <= set(arr[0])):
                        found.append((name, len(arr), (start, i + 1)))
                    break
    return found


# Nama global yang dideteksi otomatis oleh assets/kaigo-quiz.js. Halaman yang
# memuat berkas itu tidak lagi punya kode render inline, jadi keberadaan nama
# di daftar ini yang menentukan soalnya tampil atau tidak.
AUTO_RENDERED = {'Q', 'QQ', 'QKZ'}
SHARED_ENGINE = 'kaigo-quiz.js'


def is_rendered(html, name, span):
    """Array benar-benar tampil ke pembaca?

    Dua cara sebuah array bisa dirender:
      1. kode inline di halaman itu sendiri membacanya (pola lama), atau
      2. halaman memuat kaigo-quiz.js, yang mencari global Q / QQ / QKZ dan
         merendernya sendiri (pola sesudah kode kuis diekstrak jadi bersama).

    Array bernama lain (QUIZ, QX, KN2) TIDAK dikenali mesin bersama itu, jadi
    di halaman tanpa kode inline ia tetap terhitung tidak tampil — dan itu
    memang yang ingin diketahui.
    """
    body = html[:span[0]] + html[span[1]:]
    body = re.sub(r'<[^>]*>', '', body)
    if re.search(rf'\b{name}\s*(?:\[|\.length|\.map|\.forEach|\.slice|\.filter)', body):
        return True
    return SHARED_ENGINE in html and name in AUTO_RENDERED


def quiz_count(html):
    """Jumlah soal yang benar-benar DIRENDER — array mati tidak memakan waktu."""
    return sum(n for name, n, span in quiz_arrays(html)
               if is_rendered(html, name, span))


def estimate(filename):
    path = os.path.join(MATERI, filename)
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8', errors='ignore') as f:
        html = f.read()
    text = visible_text(html)
    latin = len(re.findall(r"[A-Za-z][A-Za-z'-]*", text))
    japanese = len(re.findall(r'[぀-ヿ一-鿿]', text))
    minutes = latin / WPM_LATIN + japanese / CPM_JAPANESE
    minutes += quiz_count(html) * MIN_PER_QUESTION
    return max(5, round(minutes / 5) * 5)


def main():
    check_only = '--check' in sys.argv
    computed, missing = {}, []

    for slug, m in MODULES.items():
        got = estimate(m['filename'])
        if got is None:
            missing.append(m['filename'])
        else:
            computed[slug] = got

    if missing:
        print(f'❌ {len(missing)} modul tidak ditemukan di Materi/:')
        for f in missing:
            print(f'   {f}')
        return 1

    changed = {s: (MODULES[s]['duration'], v)
               for s, v in computed.items() if MODULES[s]['duration'] != v}

    print(f'{len(computed)} modul dihitung, {len(changed)} berbeda dari katalog.')
    print(f'Total: {sum(m["duration"] for m in MODULES.values())} mnt '
          f'→ {sum(computed.values())} mnt '
          f'({sum(computed.values()) / 60:.1f} jam)\n')

    if changed:
        print('Selisih terbesar:')
        for slug, (old, new) in sorted(changed.items(),
                                       key=lambda kv: -abs(kv[1][1] - kv[1][0]))[:10]:
            print(f'   {old:3d} → {new:3d} mnt   {slug}')

    if check_only:
        if changed:
            print(f'\n❌ {len(changed)} modul perlu dihitung ulang. '
                  f'Jalankan: python3 scripts/compute_durations.py')
            return 1
        print('\n✅ Semua durasi sudah sesuai isi modul.')
        return 0

    if not changed:
        print('\n✅ Tidak ada yang perlu diubah.')
        return 0

    # Tulis balik: ganti hanya baris "duration" di dalam blok modul terkait,
    # supaya sisa katalog (komentar, urutan, format) tidak tersentuh.
    with open(CATALOG, encoding='utf-8') as f:
        src = f.read()

    written = 0
    for slug, (_, new) in changed.items():
        pattern = re.compile(
            r"(^    '" + re.escape(slug) + r"': \{.*?^        \"duration\": )\d+(,)",
            re.S | re.M)
        src, n = pattern.subn(rf'\g<1>{new}\g<2>', src, count=1)
        if n != 1:
            print(f'❌ gagal menulis duration untuk {slug} — katalog tidak diubah.')
            return 1
        written += n

    with open(CATALOG, 'w', encoding='utf-8') as f:
        f.write(src)

    print(f'\n✅ {written} durasi diperbarui di scripts/kaigo_catalog.py')
    print('   Lanjutkan: python3 scripts/build_kaigo_page.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
