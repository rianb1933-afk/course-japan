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
                grade = re.search(r'<grade>(\d+)</grade>', e)
                # <meaning> tanpa atribut m_lang = Inggris; yang lain fr/es/pt.
                arti_en = re.findall(r'<meaning>([^<]+)</meaning>', e)
                peta[lit.group(1)] = {
                    'on': ', '.join(on[:4]),
                    'kun': ', '.join(kun[:4]),
                    'gores': int(gores.group(1)) if gores else 0,
                    'grade': int(grade.group(1)) if grade else 0,
                    'arti_en': arti_en,
                }
            buf = ''
    return peta



def tambah_n1(bank, kd_mentah):
    """Tambahkan kanji jōyō tingkat lanjut sebagai N1.

    Bank hanya mencakup N5–N2. Kanji-Trainer-Pro menawarkan N1 tapi tidak
    punya isinya, dan Materi/Kanji-N1.html bukan menyimpan data sendiri
    melainkan MENYEMATKAN situs pihak ketiga (kanji.tools) lewat iframe —
    bergantung pada layanan luar, mati saat luring, dan tidak berbahasa
    Indonesia.

    Yang dipakai di sini: kanji <grade>8</grade> — jōyō yang tidak diajarkan
    di sekolah dasar — yang belum ada di bank. Itu padanan paling dekat untuk
    "sisa jōyō setelah N2", definisi umum wilayah N1.

    Kanji grade 1–6 yang belum tercakup (542 buah) SENGAJA TIDAK dimasukkan
    ke sini. Itu kanji sekolah dasar; kalau ditumpuk ke N1 mereka akan
    membuat level tersulit berisi karakter termudah. Kekurangannya nyata,
    tapi tempatnya di N5–N3, dan menempatkannya butuh keputusan kurikulum,
    bukan tebakan script.

    ARTI. KANJIDIC2 hanya menyediakan arti dalam Inggris, Prancis, Spanyol,
    dan Portugis — diperiksa, tidak ada Indonesia. Arti Inggrisnya dipakai
    apa adanya dan ditandai `artiEn`, sehingga antarmuka bisa
    membedakannya dari arti Indonesia alih-alih menyamarkannya. Alternatifnya
    adalah memungut arti dari vocab-all.csv, dan itu sudah dibuktikan salah
    (亜 "detik", 偉 "makan") — Inggris yang benar lebih berguna daripada
    Indonesia yang keliru.
    """
    punya = {b['k'] for b in bank}
    baru = 0
    for k, info in kd_mentah.items():
        if k in punya or info['grade'] != 8:
            continue
        if not info['arti_en']:
            continue
        bank.append({
            'k': k, 'lv': 'N1',
            'arti': '; '.join(info['arti_en'][:3]),
            'artiEn': True,
            'on': info['on'], 'kun': info['kun'],
            'kat': '', 'gores': info['gores'],
        })
        baru += 1
    return baru


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

    n1_baru = tambah_n1(bank, kd)

    kosong_akhir = sum(1 for b in bank if not b.get('on') and not b.get('kun'))
    json.dump(bank, io.open(BANK, 'w', encoding='utf-8'), ensure_ascii=False)

    print(f'  entri tanpa on/kun : {kosong_awal} → {kosong_akhir}')
    print(f'  bacaan dilengkapi  : {diisi}')
    print(f'  goresan ditambahkan: {digores}')
    print(f'  arti Indonesia      : tidak disentuh sama sekali')
    print(f'  N1 ditambahkan      : {n1_baru} (arti Inggris, ditandai artiEn)')
    per = {}
    for b in bank:
        per[b['lv']] = per.get(b['lv'], 0) + 1
    print('  bank akhir          : ' + ' · '.join(f'{l}:{per.get(l,0)}' for l in ('N5','N4','N3','N2','N1')))


if __name__ == '__main__':
    main()
