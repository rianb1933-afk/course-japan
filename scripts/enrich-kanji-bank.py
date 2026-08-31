#!/usr/bin/env python3
"""
Lengkapi assets/kanji-bank.json dengan on/kun dan goresan dari KANJIDIC2.
=========================================================================

Kenapa aman, dan kenapa terbatas
--------------------------------
Bank kanji dibangun dari halaman Materi (lihat scripts/build-kanji-bank.js).
454 dari 685 entrinya — seluruh N3 dan N2 — tidak punya on-yomi maupun
kun-yomi sama sekali, karena halaman sumbernya memang hanya memuat arti dan
petunjuk belajar.

Bacaan on/kun adalah KANA, bukan terjemahan. Jadi mengambilnya dari KANJIDIC2
tidak menimbulkan masalah bahasa apa pun — berbeda dari arti, yang di
KANJIDIC2 hanya tersedia dalam Inggris, Prancis, Spanyol, dan Portugis.

Karena itu script ini HANYA menyentuh on, kun, dan jumlah goresan. Arti
Indonesia yang sudah ada di bank tidak diubah sedikit pun.

Kenapa arti tidak diambil dari kamus situs
------------------------------------------
assets/vocab-all.csv memuat 2.411 kanji tunggal berarti Indonesia, dan
sempat terpikir memakainya. Diperiksa dulu terhadap sumbernya, dan hasilnya
menutup pintu itu: 亜 tercatat "detik" (seharusnya "Asia"), 宛 "waktu"
(seharusnya "ditujukan kepada"), 偉 "makan" (seharusnya "hebat"), 尉 "pria"
(sebuah pangkat militer). Bacaannya benar, artinya milik kata lain.

Memakainya berarti menanam arti yang salah ke dalam alat latihan kanji —
justru tempat yang paling merugikan, karena arti itulah yang diuji.

Sumber
------
KANJIDIC2 dari EDRDG (https://www.edrdg.org/kanjidic/kanjidic2.xml.gz),
penerbit yang sama dengan JMdict yang sudah dipakai repo ini. Berkasnya
TIDAK disimpan di repo — diunduh ke /tmp saat dibutuhkan, karena 1,4 MB
tambahan ikut ter-deploy ke setiap pengunjung tanpa ada yang membacanya.

Pemakaian
---------
    python3 scripts/enrich-kanji-bank.py
"""

import gzip
import io
import json
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, 'assets', 'kanji-bank.json')
SUMBER = 'https://www.edrdg.org/kanjidic/kanjidic2.xml.gz'
SINGGAH = '/tmp/kanjidic2.xml.gz'


def ambil_kanjidic():
    if os.path.exists(SINGGAH) and os.path.getsize(SINGGAH) > 500_000:
        return SINGGAH
    print(f'  mengunduh KANJIDIC2 dari {SUMBER} …')
    urllib.request.urlretrieve(SUMBER, SINGGAH)
    return SINGGAH


def baca_kanjidic(path):
    """{kanji: {on, kun, goresan}} — hanya yang netral bahasa."""
    peta = {}
    buf = ''
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        for baris in f:
            buf += baris
            if '</character>' not in buf:
                continue
            for m in re.finditer(r'<character>.*?</character>', buf, re.S):
                e = m.group(0)
                lit = re.search(r'<literal>(.)</literal>', e)
                if not lit:
                    continue
                on = re.findall(r'<reading r_type="ja_on">([^<]+)</reading>', e)
                kun = re.findall(r'<reading r_type="ja_kun">([^<]+)</reading>', e)
                gores = re.search(r'<stroke_count>(\d+)</stroke_count>', e)
                peta[lit.group(1)] = {
                    'on': ', '.join(on[:4]),
                    'kun': ', '.join(kun[:4]),
                    'gores': int(gores.group(1)) if gores else 0,
                }
            buf = ''
    return peta


def main():
    bank = json.load(io.open(BANK, encoding='utf-8'))
    kd = baca_kanjidic(ambil_kanjidic())
    print(f'  KANJIDIC2: {len(kd):,} kanji')

    kosong_awal = sum(1 for b in bank if not b.get('on') and not b.get('kun'))
    diisi = digores = 0
    for b in bank:
        info = kd.get(b['k'])
        if not info:
            continue
        # Bacaan hanya DIISI kalau kosong — jangan menimpa yang sudah ada di
        # halaman Materi, karena itu yang sudah dipakai dan diperiksa manusia.
        if not b.get('on') and not b.get('kun') and (info['on'] or info['kun']):
            b['on'] = info['on']
            b['kun'] = info['kun']
            diisi += 1
        if info['gores'] and not b.get('gores'):
            b['gores'] = info['gores']
            digores += 1

    kosong_akhir = sum(1 for b in bank if not b.get('on') and not b.get('kun'))
    json.dump(bank, io.open(BANK, 'w', encoding='utf-8'), ensure_ascii=False)

    print(f'  entri tanpa on/kun : {kosong_awal} → {kosong_akhir}')
    print(f'  bacaan dilengkapi  : {diisi}')
    print(f'  goresan ditambahkan: {digores}')
    print(f'  arti Indonesia      : tidak disentuh sama sekali')


if __name__ == '__main__':
    main()
