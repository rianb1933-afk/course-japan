#!/usr/bin/env python3
"""Berikan label level eksplisit ke soal JLPT yang sumbernya tidak punya level.

Tujuannya memetakan 9 soal yang masuk `tanpa level` di build_cbt_bank.py,
bukan mendidik ulang kategori atau keakuratan soal.

Level diturunkan dari tingkat dominan modul asalnya (tebakan yang sudah
diuji akurasinya 42/42 di build_cbt_bank.py).
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, 'seed')
INPUT = os.path.join(SEED, 'jlpt_questions.json')

# level yang diturunkan dari level_modul() di build_cbt_bank.py
LEVEL_FOR_MODULE = {
    'Adjective-Review.html': 'N5',
    'Grammar-Izin-Kewajiban.html': 'N5',
    'Grammar-Keinginan.html': 'N5',
    'Kata-Sifat-Dasar.html': 'N5',
    'Te-Form-Guide.html': 'N4',
    'Kaiwa-Konbini.html': 'N2',
    'Salam-Sapaan-Jepang.html': 'N5',
    'Onomatopoeia-Bisnis.html': 'N2',
    'JLPT-Strategy-Guide.html': 'N3',
}


def main() -> None:
    soal = json.load(open(INPUT, encoding='utf-8'))

    awal_sil = sum(
        1 for q in soal
        if str(q.get('jlpt_level', '')).strip() in ('', 'None', '?')
    )
    Tambah = 0

    for q in soal:
        modul = str(q.get('source_module', '')).strip()
        if not modul or modul not in LEVEL_FOR_MODULE:
            continue
        level_saat_ini = str(q.get('jlpt_level', '')).strip()
        if level_saat_ini not in ('', 'None', '?'):
            continue
        q['jlpt_level'] = LEVEL_FOR_MODULE[modul]
        Tambah += 1

    akhir_sil = sum(
        1 for q in soal
        if str(q.get('jlpt_level', '')).strip() in ('', 'None', '?')
    )

    print(f'{INPUT}')
    print(f'  awal tanpa level : {awal_sil}')
    print(f'  label baru       : {Tambah}')
    print(f'  akhir tanpa level: {akhir_sil}')

    json.dump(soal, open(INPUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'  disimpan ulang   : ya')


if __name__ == '__main__':
    main()
