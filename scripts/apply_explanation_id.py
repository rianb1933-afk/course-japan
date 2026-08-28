#!/usr/bin/env python3
"""
Sisipkan glos bahasa Indonesia ke depan penjelasan kuis Kaigo.
===============================================================

Kenapa
------
2.104 dari 2.183 penjelasan kuis di modul Kaigo tidak memuat satu kata
Indonesia pun; 77 dari 100 modul nol sama sekali. Rata-rata 82 karakter
dengan 45% kanji.

Penjelasan adalah momen mengajarnya — yang membacanya justru orang yang baru
saja salah menjawab. Untuk pembelajar N4-N3, yang paling membutuhkannya justru
paling tidak bisa membacanya.

Bentuk
------
Mengikuti gaya yang sudah dipakai 73 penjelasan lain di modul ini: satu
kalimat Indonesia di depan, teks Jepang aslinya dipertahankan utuh sesudahnya.
Pembaca mendapat jawabannya, sekaligus tetap terpapar bahasa ujiannya.

    Dukungan kemandirian: manfaatkan kemampuan yang masih ada …
    自立支援=残存機能を活かし、できることは自分でしてもらう。

Data
----
seed/kaigo_explanation_id.json memetakan POTONGAN AWAL penjelasan Jepang ke
glos Indonesianya. Potongan dipakai, bukan teks penuh, supaya satu glos bisa
mencakup penjelasan yang sama yang muncul di beberapa modul dengan ekor
kalimat sedikit berbeda.

Aman diulang: penjelasan yang glosnya sudah terpasang dilewati.

Pemakaian
---------
    python3 scripts/apply_explanation_id.py --check
    python3 scripts/apply_explanation_id.py
"""

import os
import re
import sys
import json
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLOSS_FILE = os.path.join(ROOT, 'seed', 'kaigo_explanation_id.json')

sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import compute_durations as engine  # noqa: E402

# Nilai penjelasan di dalam array soal, apa pun gaya kutipnya.
EXPLANATION = re.compile(
    r'(["\']?(?:e|exp|explanation)["\']?\s*:\s*)(["\'])((?:[^\\]|\\.)*?)\2', re.S)


def load_glosses():
    with open(GLOSS_FILE, encoding='utf-8') as f:
        return json.load(f)


def gloss_for(text, glosses):
    """Glos yang potongan awalnya cocok dengan penjelasan ini."""
    for prefix, gloss in glosses.items():
        if text.startswith(prefix):
            return gloss
    return None


def main():
    check = '--check' in sys.argv
    glosses = load_glosses()
    touched, already, rows = 0, 0, {}

    for page in sorted(glob.glob(os.path.join(ROOT, 'Materi', 'Kaigo-*.html'))):
        with open(page, encoding='utf-8', errors='ignore') as f:
            html = f.read()

        spans = [span for name, _, span in engine.quiz_arrays(html)
                 if engine.is_rendered(html, name, span)]
        if not spans:
            continue

        # Sunting dari belakang agar offset span sebelumnya tetap sahih.
        new = html
        count = 0
        for start, end in sorted(spans, reverse=True):
            body = new[start:end]

            def swap(m):
                nonlocal count, already
                head, quote, text = m.group(1), m.group(2), m.group(3)
                gloss = gloss_for(text, glosses)
                if not gloss:
                    return m.group(0)
                if text.startswith(gloss[:24]):
                    already += 1
                    return m.group(0)
                count += 1
                # Kutip di dalam glos di-escape sesuai gaya kutip aslinya.
                safe = gloss.replace('\\', '\\\\').replace(quote, '\\' + quote)
                return f'{head}{quote}{safe} {text}{quote}'

            new = new[:start] + EXPLANATION.sub(swap, body) + new[end:]

        if count:
            rows[os.path.basename(page)] = count
            touched += count
            if not check:
                with open(page, 'w', encoding='utf-8') as f:
                    f.write(new)

    if already:
        print(f'{already} penjelasan sudah punya glosnya — dilewati.')
    if not touched:
        print('✅ Tidak ada glos baru yang perlu disisipkan.')
        return 0

    print(f'{len(rows)} modul, {touched} penjelasan diberi glos Indonesia.\n')
    for name, n in sorted(rows.items(), key=lambda r: -r[1]):
        print(f'  {n:4d}  {name}')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
