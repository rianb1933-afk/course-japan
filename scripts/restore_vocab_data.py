#!/usr/bin/env python3
"""
Kembalikan data kosakata yang terhapus tapi masih dipanggil.
=============================================================

Bug
---
83 halaman memanggil renderer kosakata dengan array yang tidak ada lagi:

    document.addEventListener('DOMContentLoaded', function(){
      renderVocabGrid('pg', PH_VOCAB);      ← PH_VOCAB tidak terdefinisi
    });

Saat mesin kuis dan renderer kosakata diekstrak ke assets/kaigo-quiz.js,
blok `var PH_VOCAB=[...]` di tiap halaman ikut terbuang bersama kode render
inline-nya — tapi panggilan barunya tetap menunjuk nama itu.

Akibatnya di browser: "PH_VOCAB is not defined", dan grid kosakata kosong.

Perbaikan
---------
Datanya tidak hilang; masih ada di commit sebelum refactor. Script ini
mengambilnya kembali dari git dan menyisipkannya sebelum pemanggilan
renderer, sebagai <script> tersendiri agar urutannya jelas.

Nama variabelnya dibaca dari pemanggilan di halaman itu sendiri — tidak
diasumsikan selalu PH_VOCAB.

Pemakaian
---------
    python3 scripts/restore_vocab_data.py --check
    python3 scripts/restore_vocab_data.py
"""

import os
import re
import sys
import glob
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Commit terakhir sebelum ekstraksi membuang blok datanya.
BEFORE_REFACTOR = '22dfdca~1'

SKIP = {'Kelas-Online.html', 'Kelas-Report.html'}

CALL = re.compile(r'renderVocabGrid\(\s*[\'"][^\'"]+[\'"]\s*,\s*(\w+)\s*\)')


def declaration(text, name):
    """Blok `var <name> = [...]` lengkap dengan titik komanya, atau None."""
    m = re.search(rf'(?:var|const|let)\s+{re.escape(name)}\s*=\s*\[', text)
    if not m:
        return None
    start = text.find('[', m.start())
    depth = 0
    for i in range(start, len(text)):
        if text[i] == '[':
            depth += 1
        elif text[i] == ']':
            depth -= 1
            if depth == 0:
                end = i + 1
                if text[end:end + 1] == ';':
                    end += 1
                return text[m.start():end]
    return None


def main():
    check = '--check' in sys.argv
    fixed, unrecoverable = [], []

    for page in sorted(glob.glob(os.path.join(ROOT, 'Materi', '*.html'))):
        rel = os.path.relpath(page, ROOT)
        if os.path.basename(page) in SKIP:
            continue

        with open(page, encoding='utf-8', errors='ignore') as f:
            html = f.read()

        call = CALL.search(html)
        if not call:
            continue
        name = call.group(1)
        if re.search(rf'(?:var|const|let)\s+{re.escape(name)}\s*=', html):
            continue                        # datanya masih ada — tidak rusak

        old = subprocess.run(['git', 'show', f'{BEFORE_REFACTOR}:{rel}'],
                             cwd=ROOT, capture_output=True, text=True).stdout
        decl = declaration(old, name)
        if not decl:
            unrecoverable.append((rel, name))
            continue

        fixed.append((rel, name, len(decl)))
        if not check:
            # Sisipkan sebagai <script> tersendiri tepat sebelum blok pemanggil,
            # supaya datanya pasti terdefinisi lebih dulu.
            anchor = html.rfind('<script', 0, call.start())
            block = f'<script>\n{decl}\n</script>\n'
            with open(page, 'w', encoding='utf-8') as f:
                f.write(html[:anchor] + block + html[anchor:])

    if unrecoverable:
        print(f'⚠️  {len(unrecoverable)} halaman datanya tidak ada di {BEFORE_REFACTOR}:')
        for rel, name in unrecoverable[:5]:
            print(f'    {rel}  ({name})')

    if not fixed:
        print('✅ Tidak ada pemanggilan renderVocabGrid tanpa datanya.')
        return 0

    total = sum(n for _, _, n in fixed)
    print(f'{len(fixed)} halaman, {total / 1024:.0f} KB data kosakata dikembalikan.\n')
    for rel, name, n in sorted(fixed, key=lambda r: -r[2])[:6]:
        print(f'  {n / 1024:5.1f} KB  {name:10s} {rel}')
    if len(fixed) > 6:
        print(f'  …dan {len(fixed) - 6} halaman lain')

    if check:
        print('\n❌ Jalankan tanpa --check untuk menerapkan.')
        return 1
    print('\n✅ Perubahan ditulis.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
