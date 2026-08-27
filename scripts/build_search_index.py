#!/usr/bin/env python3
"""
Bangun ulang indeks pencarian Search.html dari file materi yang ADA.

Masalah yang dipecahkan
-----------------------
INDEX di Search.html ditulis manual. Akibatnya 205 dari 254 materi tidak pernah
didaftarkan — pengguna mencari "Kanji Writing" dan tidak menemukan apa pun,
padahal materinya ada. Menambah 205 entri dengan tangan hanya menunda masalah:
materi berikutnya akan terlupa lagi.

Skrip ini membaca judul & deskripsi langsung dari tiap file materi, lalu menulis
ulang blok MATERI di INDEX. Entri non-materi (tools, blog, jlpt, kaigo, ai)
dipertahankan apa adanya.

Pemakaian
---------
    python3 scripts/build_search_index.py

Jalankan ulang setiap kali materi ditambah/dihapus. Idempoten — aman diulang.
"""
import glob
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEARCH = os.path.join(ROOT, 'Search.html')

# Ikon per tema, dipilih dari nama file.
ICONS = [
    (r'kaigo', '🏥'),
    (r'kanji', '🈶'),
    (r'kosakata|vocab', '📖'),
    (r'grammar|partikel|konjugasi|kata-kerja|kata-sifat|verb|adjective|keigo', '📐'),
    (r'jlpt|cbt|ujian|latihan', '🎓'),
    (r'listening|speaking|audio', '🎧'),
    (r'reading|dokkai', '📕'),
    (r'flashcard', '🃏'),
    (r'video', '🎬'),
    (r'kana|hiragana|katakana', '🔤'),
    (r'salam|frasa|ungkapan|idiom', '💬'),
    (r'budaya|culture|bunka', '🎎'),
]


def pick_icon(slug):
    s = slug.lower()
    for pattern, icon in ICONS:
        if re.search(pattern, s):
            return icon
    return '📘'


def js_str(s):
    """String aman untuk single-quoted JS literal."""
    s = s.replace('\\', '\\\\').replace("'", "\\'")
    return re.sub(r'\s+', ' ', s).strip()


def extract(path):
    """Ambil judul + deskripsi dari sebuah halaman materi."""
    with open(path, encoding='utf-8') as f:
        head = f.read().split('</head>')[0]

    m = re.search(r'<title>(.*?)</title>', head, re.DOTALL)
    title = m.group(1) if m else ''
    # Buang nama brand yang berulang di setiap judul.
    title = re.split(r'[—|]\s*Nihongg?o\s*Pro', title)[0].strip(' —|')
    title = html.unescape(title)

    m = re.search(r'<meta name="description" content="([^"]*)"', head)
    desc = html.unescape(m.group(1)) if m else ''
    if len(desc) > 95:
        desc = desc[:92].rstrip(' .,') + '...'

    return title, desc


def build_tags(slug, title, desc):
    """Kata kunci pencarian: dari slug + judul + deskripsi, di-dedup."""
    raw = f'{slug} {title} {desc}'.lower()
    # Ambil kata latin (kata Jepang sudah tercakup lewat title yang dicocokkan terpisah)
    words = re.findall(r'[a-z0-9]{2,}', raw)
    stop = {
        'html', 'dan', 'untuk', 'yang', 'dengan', 'ini', 'itu', 'the', 'and', 'for',
        'dari', 'ke', 'di', 'pada', 'atau', 'juga', 'akan', 'bisa', 'dalam', 'materi',
        'nihongo', 'pro', 'academy', 'lengkap', 'panduan', 'belajar', 'jepang',
        'bahasa', 'audio', 'kuis', 'contoh',
    }
    seen, tags = set(), []
    for w in words:
        if w in stop or w in seen:
            continue
        seen.add(w)
        tags.append(w)
        if len(tags) >= 14:
            break
    return ' '.join(tags)


def main():
    src = open(SEARCH, encoding='utf-8').read()

    m_start = re.search(r'const INDEX = \[\s*\n(\s*//\s*MATERI\s*\n)?', src)
    if not m_start:
        print('❌ Blok "const INDEX = [" tidak ditemukan di Search.html')
        return 1

    # Batas akhir array: kurung siku penutup di level nol.
    i = src.index('[', m_start.start())
    depth, j, in_str, quote, esc = 0, i, False, '', False
    while j < len(src):
        ch = src[j]
        if esc:
            esc = False
        elif ch == '\\':
            esc = True
        elif in_str:
            if ch == quote:
                in_str = False
        elif ch in '"\'':
            in_str, quote = True, ch
        elif ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                break
        j += 1
    array_body = src[i + 1:j]

    # Pertahankan entri NON-materi apa adanya (tools, blog, jlpt, kaigo, ai).
    kept = [
        line for line in array_body.splitlines()
        if line.strip().startswith('{cat:') and not line.strip().startswith("{cat:'materi'")
    ]

    # Bangun ulang seluruh entri materi dari file yang benar-benar ada.
    entries = []
    materi_urls = set()
    for path in sorted(glob.glob(os.path.join(ROOT, 'Materi', '*.html'))):
        fname = os.path.basename(path)
        slug = fname[:-5]
        if slug == 'Materi' or slug.startswith('_'):
            continue   # halaman indeks & file internal
        title, desc = extract(path)
        if not title:
            continue
        cat = 'kaigo' if 'kaigo' in slug.lower() else 'materi'
        url = f'/Materi/{fname}'
        materi_urls.add(url)
        entries.append(
            f"  {{cat:'{cat}',icon:'{pick_icon(slug)}',title:'{js_str(title)}',"
            f"desc:'{js_str(desc)}',url:'{url}',"
            f"tags:'{js_str(build_tags(slug, title, desc))}'}},"
        )

    # Entri manual lama yang menunjuk halaman materi kini sudah dicakup indeks
    # otomatis (dengan judul yang lebih akurat). Membiarkannya = hasil ganda.
    def points_to_materi(line):
        m = re.search(r"url:'([^']+)'", line)
        return bool(m) and m.group(1) in materi_urls

    dropped = [l for l in kept if points_to_materi(l)]
    kept = [l for l in kept if not points_to_materi(l)]

    new_body = (
        '\n  // MATERI (dibangun otomatis oleh scripts/build_search_index.py)\n'
        + '\n'.join(entries)
        + '\n\n  // NON-MATERI\n'
        + '\n'.join(kept)
        + '\n'
    )

    out = src[:i + 1] + new_body + src[j:]
    with open(SEARCH, 'w', encoding='utf-8') as f:
        f.write(out)

    print(f'✅ Indeks pencarian dibangun ulang')
    print(f'   {len(entries)} materi + {len(kept)} entri non-materi = {len(entries) + len(kept)} total')
    if dropped:
        print(f'   {len(dropped)} entri manual usang dibuang (URL-nya sudah dicakup indeks otomatis)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
