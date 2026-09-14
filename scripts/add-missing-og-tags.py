#!/usr/bin/env python3
"""
Tambahkan Open Graph + Twitter Card yang hilang di 110 halaman (validator
check `seo-open-graph`), dan schema.org di Changelog.html (`seo-schema`).

Tiga kelompok halaman, tiga bentuk kondisi awal:
1. 99 halaman Materi/Kaigo-*.html — sudah punya og:title + og:type (kadang
   + og:description), tapi tidak pernah punya og:url atau twitter:*.
2. 10 halaman (Changelog.html + 9 SSW/*.html) — tidak punya og:* sama sekali.
3. Changelog.html juga satu-satunya halaman publik tanpa JSON-LD schema.org.

Bukan diedit manual satu-satu — polanya seragam per kelompok, jadi cukup
diturunkan dari <title>/<meta name="description"> yang sudah ada.
"""
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://nihonggoproacademy.netlify.app'

TITLE_SUFFIXES = [
    ' | Nihongo Pro Academy',
    ' — Nihongo Pro Academy',
    ' – NihongoPro Academy',
    ' - Nihongo Pro Academy',
]


def strip_title_suffix(title: str) -> str:
    for suf in TITLE_SUFFIXES:
        if title.endswith(suf):
            return title[: -len(suf)]
    return title


def get_attr(text: str, pattern: str) -> str | None:
    m = re.search(pattern, text)
    return m.group(1) if m else None


def process_kaigo_page(path: Path) -> bool:
    """Kelompok 1: og:title (+ og:type, kadang og:description) sudah ada."""
    text = path.read_text(encoding='utf-8')

    # [^>]* toleran terhadap atribut tambahan seperti id="ogTitle" (dipakai
    # SSW/Field-Dashboard.html untuk menimpa og:title lewat JS per bidang).
    og_title_m = re.search(r'<meta property="og:title"[^>]*content="([^"]*)"[^>]*>', text)
    og_type_m = re.search(r'<meta property="og:type"[^>]*content="([^"]*)"[^>]*>', text)
    if not og_title_m or not og_type_m:
        return False

    og_title = og_title_m.group(1)
    desc_m = re.search(r'<meta name="description" content="([^"]*)">', text)
    description = get_attr(text, r'<meta property="og:description"[^>]*content="([^"]*)"[^>]*>') \
        or (desc_m.group(1) if desc_m else '')

    rel_url = f'{SITE}/{path.relative_to(ROOT).as_posix()}'

    # Sisipkan og:description (bila belum ada) + og:url tepat sebelum og:type,
    # supaya urutannya seragam dengan Kaigo-CPR.html (satu-satunya halaman
    # Kaigo yang sudah lengkap): title, description, url, type.
    insert_before_type = ''
    if 'og:description' not in text:
        insert_before_type += f'<meta property="og:description" content="{description}">\n'
    if 'og:url' not in text:
        insert_before_type += f'<meta property="og:url" content="{rel_url}">\n'

    if insert_before_type:
        type_line = og_type_m.group(0)
        text = text.replace(type_line, insert_before_type + type_line, 1)

    if 'twitter:card' not in text:
        type_line = og_type_m.group(0)
        twitter_block = (
            '<meta name="twitter:card" content="summary">\n'
            f'<meta name="twitter:title" content="{og_title}">\n'
            f'<meta name="twitter:description" content="{description}">'
        )
        text = text.replace(type_line, type_line + '\n' + twitter_block, 1)

    path.write_text(text, encoding='utf-8')
    return True


def process_bare_page(path: Path, og_type: str = 'website') -> bool:
    """Kelompok 2: tidak ada og:* sama sekali — bangun blok penuh dari
    <title> + <meta name="description">."""
    text = path.read_text(encoding='utf-8')
    if 'og:title' in text:
        return False

    title_m = re.search(r'<title>([^<]+)</title>', text)
    desc_m = re.search(r'<meta name="description" content="([^"]*)">', text)
    if not title_m or not desc_m:
        raise SystemExit(f'{path}: <title>/<meta description> tidak ditemukan')

    og_title = strip_title_suffix(title_m.group(1).strip())
    description = desc_m.group(1)
    rel_url = f'{SITE}/{path.relative_to(ROOT).as_posix()}'

    block = (
        f'<meta property="og:title" content="{og_title}">\n'
        f'<meta property="og:description" content="{description}">\n'
        f'<meta property="og:url" content="{rel_url}">\n'
        f'<meta property="og:type" content="{og_type}">\n'
        '<meta name="twitter:card" content="summary">\n'
        f'<meta name="twitter:title" content="{og_title}">\n'
        f'<meta name="twitter:description" content="{description}">'
    )

    desc_line = desc_m.group(0)
    text = text.replace(desc_line, desc_line + '\n' + block, 1)
    path.write_text(text, encoding='utf-8')
    return True


def add_changelog_schema() -> bool:
    path = ROOT / 'Changelog.html'
    text = path.read_text(encoding='utf-8')
    if 'application/ld+json' in text:
        return False

    title_m = re.search(r'<title>([^<]+)</title>', text)
    desc_m = re.search(r'<meta name="description" content="([^"]*)">', text)
    og_title = strip_title_suffix(title_m.group(1).strip())
    description = desc_m.group(1)
    rel_url = f'{SITE}/Changelog.html'

    schema = (
        '<script type="application/ld+json">'
        '{"@context":"https://schema.org","@type":"WebPage",'
        f'"name":"{og_title}","url":"{rel_url}","description":"{description}"}}'
        '</script>'
    )
    og_line = re.search(r'<meta property="og:type" content="[^"]*">\n', text).group(0)
    text = text.replace(og_line, og_line + schema + '\n', 1)
    path.write_text(text, encoding='utf-8')
    return True


def main():
    kaigo_dir = ROOT / 'Materi'
    kaigo_fixed = 0
    for f in sorted(kaigo_dir.glob('Kaigo-*.html')):
        if 'og:title' in f.read_text(encoding='utf-8') and process_kaigo_page(f):
            kaigo_fixed += 1
    print(f'Kaigo: {kaigo_fixed} halaman diperbaiki (og:url + twitter:*)')

    ssw_dir = ROOT / 'SSW'
    ssw_fixed = 0
    for f in sorted(ssw_dir.glob('*.html')):
        # Field-Dashboard.html sudah punya og:title (di-set ulang oleh JS per
        # bidang terpilih, makanya ada atribut id="ogTitle") + og:type — jadi
        # butuh kelompok 1, sisanya (tanpa og:* sama sekali) butuh kelompok 2.
        has_og_title = 'og:title' in f.read_text(encoding='utf-8')
        fixed = process_kaigo_page(f) if has_og_title else process_bare_page(f)
        if fixed:
            ssw_fixed += 1
    print(f'SSW: {ssw_fixed} halaman diperbaiki (og:* + twitter:*)')

    # Changelog.html: og:* penuh + schema.org WebPage.
    process_bare_page(ROOT / 'Changelog.html')
    add_changelog_schema()
    print('Changelog.html: og:* + schema.org WebPage ditambahkan')


if __name__ == '__main__':
    main()
