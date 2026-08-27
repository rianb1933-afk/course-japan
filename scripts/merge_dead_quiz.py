#!/usr/bin/env python3
"""
Gabungkan soal kuis yang mati ke array yang benar-benar dirender.
=================================================================

Masalah
-------
24 modul Kaigo mendeklarasikan DUA array soal:

    var Q   = [...]   ← soal khusus modul, TIDAK PERNAH dibaca kode manapun
    var QKZ = [...]   ← 6 soal generik, inilah yang dirender ke #qkZ

Akibatnya pelajar yang membuka Kaigo-CPR mendapat 6 soal tentang ICF dan
成年後見制度 — tidak satu pun tentang CPR — sementara 8 soal CPR yang sudah
ditulis dan diperdalam tersembunyi di file. Total 280 soal khusus modul tidak
pernah terlihat. Yang paling parah Kaigo-Ujian-Sogo-Mondai: 30 soal ujian
komprehensif mati, diganti 6 soal generik yang sama persis dengan 24 modul lain.

Perbaikan
---------
QKZ := soal khusus modul (dari Q) + soal generik yang belum ada, lalu
deklarasi `var Q` yang mati dihapus. Urutannya disengaja: pelajar mengerjakan
materi modulnya dulu, 6 soal generik jadi pengulangan di akhir.

Aman karena sudah diverifikasi:
  - `Q` tidak dibaca di halaman manapun di luar deklarasinya sendiri
  - tidak ada assets/*.js yang membaca global `Q` / `window.Q`
  - 0 duplikat antara Q dan QKZ, jadi tidak ada soal yang hilang

Pemakaian
---------
    python3 scripts/merge_dead_quiz.py --check   # laporan saja
    python3 scripts/merge_dead_quiz.py           # tulis perubahan
"""

import re
import os
import sys
import json
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATERI = os.path.join(ROOT, 'Materi')


def find_array(html, name):
    """Kembalikan (isi_list, (awal, akhir)) dari deklarasi `var <name> = [...]`."""
    m = re.search(rf'(?:var|const|let)\s+{name}\s*=\s*\[', html)
    if not m:
        return None, None
    start = html.find('[', m.start())
    depth = 0
    for i in range(start, len(html)):
        if html[i] == '[':
            depth += 1
        elif html[i] == ']':
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(html[start:i + 1]), (start, i + 1)
                except json.JSONDecodeError:
                    return None, None
    return None, None


def read_count(html, name, span):
    """Berapa kali `name` dipakai sebagai array, di luar deklarasinya."""
    body = html[:span[0]] + html[span[1]:]
    body = re.sub(r'<[^>]*>', '', body)
    return len(re.findall(rf'\b{name}\s*(?:\[|\.length|\.map|\.forEach|\.slice|\.filter)', body))


def process(path, write):
    with open(path, encoding='utf-8', errors='ignore') as f:
        html = f.read()

    Q, qspan = find_array(html, 'Q')
    K, kspan = find_array(html, 'QKZ')
    if not (isinstance(Q, list) and isinstance(K, list)):
        return None
    if read_count(html, 'Q', qspan) > 0:
        return None                      # Q dipakai — bukan kasus kita
    if read_count(html, 'QKZ', kspan) == 0:
        return None                      # QKZ juga mati — di luar cakupan

    seen = {q['q'].strip() for q in Q}
    merged = Q + [q for q in K if q['q'].strip() not in seen]
    if len(merged) == len(K):
        return None                      # tidak ada tambahan

    if write:
        # Tulis QKZ dulu (indeks lebih besar) agar span Q tetap valid.
        assert qspan[1] < kspan[0], f'{path}: urutan deklarasi tak terduga'
        html = html[:kspan[0]] + json.dumps(merged, ensure_ascii=False) + html[kspan[1]:]

        # Hapus deklarasi Q yang mati, termasuk `var ` dan `;` pembungkusnya.
        decl = re.compile(r'(?:var|const|let)\s+Q\s*=\s*\[', re.S)
        m = decl.search(html)
        end = html.find(';', qspan[1] - 1)
        html = html[:m.start()] + html[end + 1:]

        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)

    return len(K), len(merged), len(merged) - len(K)


def main():
    check = '--check' in sys.argv
    rows = []
    for path in sorted(glob.glob(os.path.join(MATERI, 'Kaigo-*.html'))):
        r = process(path, write=not check)
        if r:
            rows.append((os.path.basename(path), *r))

    if not rows:
        print('✅ Tidak ada array kuis mati — semua soal sudah dirender.')
        return 0

    print(f"{'modul':38s} {'sebelum':>8s} {'sesudah':>8s} {'+':>4s}")
    for name, before, after, added in rows:
        print(f'{name:38s} {before:8d} {after:8d} {added:+4d}')
    total = sum(r[3] for r in rows)
    print(f'\n{len(rows)} modul, {total} soal yang tadinya tersembunyi kini dirender.')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    print('   Lanjutkan: python3 scripts/compute_durations.py && '
          'python3 scripts/build_kaigo_page.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
