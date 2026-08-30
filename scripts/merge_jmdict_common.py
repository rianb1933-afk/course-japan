#!/usr/bin/env python3
"""
Tambahkan kata UMUM dari JMdict yang belum ada di assets/vocab-all.csv.
======================================================================

Kenapa hanya yang "umum"
------------------------
JMdict berisi 218.660 entri; kamus situs memuat 177.834. Selisihnya 40.329,
tapi menambahkan semuanya bukan perbaikan — mayoritasnya istilah langka,
bentuk arkais, dan varian ejaan yang justru mengubur kata yang dicari orang.

JMdict sendiri menandai kata yang benar-benar umum lewat <ke_pri>/<re_pri>
(news1, ichi1, spec1, spec2, gai1). Dari 40.329 yang hilang, 3.762 bertanda
begitu — dan di antaranya banyak kata tiruan bunyi yang sangat dipakai
sehari-hari tapi selama ini dicari di kamus situs hasilnya nihil:
キラキラ, ガタガタ, オドオド, キョロキョロ.

Bahasa
------
Glos JMdict berbahasa INGGRIS, sedangkan 177.834 entri yang ada seluruhnya
Indonesia. Tidak ada mesin penerjemah luring di repo ini, dan CSV yang ada
tidak menyimpan teks Inggris aslinya, jadi tidak ada memori terjemahan yang
bisa dipakai. Menerjemahkannya berarti mengarang.

Jadi entri baru ditulis apa adanya, dengan `meaning_id` DIKOSONGKAN. Itu
bukan kelalaian melainkan penandaan: Vocabulary-Lengkap.html hanya
menampilkan baris bendera 🇮🇩 kalau meaning_id terisi, sehingga entri yang
belum diterjemahkan terlihat berbeda dari yang sudah — tanpa perlu kolom
tambahan. Mencari キラキラ lalu mendapat "glittering" lebih berguna daripada
mendapat nihil, asal tidak menyamar sebagai entri Indonesia.

Tag `JMdict-EN` menandainya untuk dicari nanti. Ia sengaja TIDAK memuat
N1–N5: levelnya memang tidak diketahui, dan levelFromTags kini menyembunyikan
lencana untuk entri semacam itu alih-alih mengarang N1.

Pemakaian
---------
    python3 scripts/merge_jmdict_common.py            # tambahkan
    python3 scripts/merge_jmdict_common.py --check    # hanya hitung
"""

import csv
import gzip
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(ROOT, 'assets', 'vocab-all.csv')
JMDICT = os.path.join(ROOT, 'assets', 'JMdict.gz')
TAG = 'JMdict-EN'

PRI = re.compile(r'<(?:ke|re)_pri>(?:news1|ichi1|spec1|spec2|gai1)</(?:ke|re)_pri>')
KEB = re.compile(r'<keb>([^<]+)</keb>')
REB = re.compile(r'<reb>([^<]+)</reb>')
GLOSS = re.compile(r'<gloss(?: [^>]*)?>([^<]+)</gloss>')
ENTRY = re.compile(r'<entry>.*?</entry>', re.S)


def sudah_ada():
    ada = set()
    with io.open(CSV, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            e = (r.get('expression') or '').strip()
            if e:
                ada.add(e)
    return ada


def kandidat(ada):
    """Entri JMdict bertanda umum yang ekspresinya belum ada di kamus."""
    hasil = []
    buf = ''
    with gzip.open(JMDICT, 'rt', encoding='utf-8') as f:
        for baris in f:
            buf += baris
            if '</entry>' not in buf:
                continue
            for m in ENTRY.finditer(buf):
                e = m.group(0)
                if not PRI.search(e):
                    continue
                keb = KEB.search(e)
                reb = REB.search(e)
                if not (keb or reb):
                    continue
                ekspresi = (keb or reb).group(1)
                if ekspresi in ada:
                    continue
                baca = reb.group(1) if reb else ekspresi
                glos = [g.strip() for g in GLOSS.findall(e)[:3] if g.strip()]
                if not glos:
                    continue
                ada.add(ekspresi)          # jangan menambah dua kali
                hasil.append((ekspresi, baca, '', '; '.join(glos), '', TAG))
            buf = ''
    return hasil


def main():
    hanya_periksa = '--check' in sys.argv

    ada = sudah_ada()
    sebelum = len(ada)
    baru = kandidat(ada)

    print(f'  kamus sekarang        : {sebelum:,} entri')
    print(f'  kata umum JMdict baru : {len(baru):,}')
    if baru:
        print('  contoh:')
        for e, b, _, g, _, _ in baru[:6]:
            print(f'     {e:12s} {b:12s} {g[:44]}')

    if hanya_periksa:
        print('\n  --check: tidak ada yang ditulis.')
        return
    if not baru:
        print('\n  Tidak ada yang perlu ditambahkan.')
        return

    with io.open(CSV, 'a', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerows(baru)

    total = sebelum + len(baru)
    mb = os.path.getsize(CSV) / 1048576
    print(f'\n  ✅ {len(baru):,} entri ditambahkan → {total:,} total ({mb:.1f} MB)')


if __name__ == '__main__':
    main()
