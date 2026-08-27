#!/usr/bin/env python3
"""
Ekstrak komponen template dari materi yang sudah terverifikasi lengkap.

Template diambil dari file NYATA yang lolos validator, bukan ditulis manual.
Kalau komponen wajib berubah (misal SW di-upgrade), cukup jalankan ulang skrip
ini dan semua materi baru otomatis ikut versi terbaru.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'Materi', 'Grammar-Teiru.html')
OUT = os.path.join(ROOT, 'scripts', 'templates')

REQUIRED = {
    'serviceWorker.register': 'service worker (offline)',
    '<footer': 'footer',
    'floatingTimer': 'study timer',
    'np-materi-progress.js': 'progress hook',
    'np-xp.js': 'sistem XP',
    'kyoto-navbar': 'navbar',
}

def main():
    c = open(SOURCE, encoding='utf-8').read()

    missing = [label for token, label in REQUIRED.items() if token not in c]
    if missing:
        print(f'❌ Sumber template tidak lengkap, kurang: {", ".join(missing)}')
        print(f'   ({SOURCE})')
        return 1

    os.makedirs(OUT, exist_ok=True)

    head = c[:c.find('</head>') + 7]
    f0 = c.find('<footer')
    f1 = c.find('</footer>') + len('</footer>')
    footer = c[f0:f1]
    tail = c[f1:c.rfind('</body>')]   # study timer + SW + script includes

    for name, content in [('head.tpl', head), ('footer.tpl', footer), ('tail.tpl', tail)]:
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  ✅ {name} ({len(content)} bytes)')

    print(f'\nTemplate diekstrak dari {os.path.basename(SOURCE)} (lengkap: {len(REQUIRED)}/{len(REQUIRED)} komponen)')
    return 0

if __name__ == '__main__':
    sys.exit(main())
