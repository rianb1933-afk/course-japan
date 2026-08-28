#!/usr/bin/env python3
"""
Kembalikan soal seed ke 7 modul Kaigo yang kuisnya ditulis ulang.
=================================================================

Kenapa
------
Tujuh modul kuisnya diganti dari array 20 soal menjadi array baru tulisan
tangan berisi 5-10 soal, memakai format berbeda:

    const QUIZ_HK = [{q:'…', opts:[…], ans:2, exp:'…'}]

Soal lamanya tidak hilang dari proyek — semuanya masih ada di
seed/kaigo_questions.json dan tetap tersaji lewat Ujian.html — tapi 140 soal
berhenti muncul di halaman modulnya sendiri, tempat pembelajar mengerjakannya
sambil membaca materi.

Soal baru dan soal seed TIDAK beririsan sama sekali (diperiksa: 0 dari 47
soal baru ada di seed). Jadi keduanya digabung, bukan salah satu dipilih:
tiap modul kembali punya 25-30 soal unik.

Bentuk data
-----------
Seed memakai {question, choices, correct_index, explanation}; mesin kuis di
halaman memakai {q, opts, ans, exp}. Konversi dilakukan saat penyisipan.

Entri tambahan ditulis sebagai objek bergaya JSON (kunci berkutip ganda) —
tetap JavaScript yang sah, dan json.dumps menjamin escaping benar untuk teks
Jepang berisi tanda kutip, yang gampang salah kalau dirangkai tangan.

Pemakaian
---------
    python3 scripts/restore_seed_quiz.py --check
    python3 scripts/restore_seed_quiz.py
"""

import os
import re
import sys
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, 'seed', 'kaigo_questions.json')
MATERI = os.path.join(ROOT, 'Materi')

DECL = re.compile(r'const\s+QUIZ_\w+\s*=\s*\[')
# Kunci `q` pada objek soal, baik bergaya literal JS maupun JSON.
QKEY = re.compile(r"[{,]\s*\"?q\"?\s*:")
# Teks pertanyaan bergaya literal JS, untuk mendeteksi duplikat.
QTEXT = re.compile(r"[{,]\s*q\s*:\s*'((?:[^'\\]|\\.)*)'")


def array_span(html, decl_match):
    """(awal, akhir) tanda kurung siku array, akhir eksklusif."""
    start = html.find('[', decl_match.start())
    depth = 0
    for i in range(start, len(html)):
        if html[i] == '[':
            depth += 1
        elif html[i] == ']':
            depth -= 1
            if depth == 0:
                return start, i + 1
    raise ValueError('array tidak tertutup')


def to_page_shape(q):
    return {
        'q': q['question'],
        'opts': q['choices'],
        'ans': q['correct_index'],
        'exp': q['explanation'],
    }


def main():
    check = '--check' in sys.argv

    with open(SEED, encoding='utf-8') as f:
        seed = json.load(f)
    by_module = {}
    for q in seed:
        by_module.setdefault(q['source_module'], []).append(q)

    rows = []
    for filename, questions in sorted(by_module.items()):
        path = os.path.join(MATERI, filename)
        if not os.path.exists(path):
            continue

        with open(path, encoding='utf-8', errors='ignore') as f:
            html = f.read()

        decl = DECL.search(html)
        if not decl:
            continue                      # modul ini tidak memakai format baru

        start, end = array_span(html, decl)
        body = html[start:end]
        before = len(QKEY.findall(body))

        existing = {t.replace("\\'", "'").strip() for t in QTEXT.findall(body)}
        adding = [q for q in questions if q['question'].strip() not in existing]
        if not adding:
            continue

        entries = ',\n  '.join(
            json.dumps(to_page_shape(q), ensure_ascii=False) for q in adding)
        merged = body[:-1].rstrip().rstrip(',') + ',\n  ' + entries + '\n]'

        rows.append((filename, before, before + len(adding)))
        if not check:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(html[:start] + merged + html[end:])

    if not rows:
        print('✅ Semua soal seed sudah ada di halaman modulnya.')
        return 0

    total = sum(after - before for _, before, after in rows)
    print(f'{len(rows)} modul, {total} soal seed dikembalikan ke halamannya.\n')
    for name, before, after in rows:
        print(f'  {before:3d} → {after:3d}   {name}')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    print('   Lanjutkan: python3 scripts/compute_durations.py && '
          'python3 scripts/build_kaigo_page.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
