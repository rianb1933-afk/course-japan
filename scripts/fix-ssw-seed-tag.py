#!/usr/bin/env python3
"""
Sisipkan <script src="assets/ssw-seed.js"> di halaman SSW yang kehilangannya.

MASALAH
assets/ssw-api.js memakai window.NP_SSW_SEED sebagai fallback offline —
dipakai saat Supabase belum dikonfigurasi ATAU tabel ssw_* masih kosong
(keadaan default proyek ini sekarang). Seed itu "disuntik per halaman"
lewat tag script, tapi hanya SSW/Field-Dashboard.html yang benar-benar
memuatnya. Di sembilan halaman lain window.NP_SSW_SEED undefined, sehingga
getFieldTree() mengembalikan { category: null } dan halaman berhenti di
`if (!category) return;` — render jadi cangkang kosong TANPA error apa pun.

Akibat nyatanya: lesson tidak bisa ditandai selesai dari Lesson.html, jadi
tidak ada progres yang bisa lahir lewat UI sungguhan sama sekali.

Idempoten: halaman yang sudah punya tagnya dilewati. Versi ?v= sengaja
tidak ditulis di sini — scripts/align-asset-versions.py yang menyeragamkan
seluruh URL aset ke satu konstan.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SSW = ROOT / 'SSW'


def asset_version():
    """Ambil ASSET_VERSION dari align-asset-versions.py — satu sumber kebenaran.

    Tag tanpa ?v= tidak akan pernah berubah URL-nya, dan karena service worker
    bersifat cache-first, pengguna lama akan terus disajikan seed versi basi.
    Membaca konstannya di sini (bukan menyalin angkanya) membuat tag hasil
    script ini otomatis lolos check `asset-version` di validate.py.
    """
    src = (ROOT / 'scripts' / 'align-asset-versions.py').read_text(encoding='utf-8')
    m = re.search(r'^ASSET_VERSION = "(\d+)"', src, re.M)
    if not m:
        raise SystemExit('ASSET_VERSION tidak terbaca dari align-asset-versions.py')
    return m.group(1)

# Disisipkan tepat sesudah tag ssw-api.js, urutan yang sama dengan
# Field-Dashboard.html. Urutan bebas secara teknis (ssw-api.js membaca
# NP_SSW_SEED saat fungsi dipanggil, bukan saat dimuat), tapi konsisten
# dengan halaman yang sudah benar lebih mudah dibaca.
API_RE = re.compile(r'(<script src="/assets/ssw-api\.js(?:\?v=\d+)?"></script>)')


def main():
    changed = []
    for path in sorted(SSW.glob('*.html')):
        text = path.read_text(encoding='utf-8')
        if 'ssw-seed.js' in text:
            continue
        m = API_RE.search(text)
        if not m:
            raise SystemExit(f'{path.name}: tag ssw-api.js tidak ditemukan — periksa manual')
        seed_tag = '\n<script src="/assets/ssw-seed.js?v=' + asset_version() + '"></script>'
        text = text[:m.end()] + seed_tag + text[m.end():]
        path.write_text(text, encoding='utf-8')
        changed.append(path.name)

    print(f'{len(changed)} halaman disisipi tag ssw-seed.js: {", ".join(changed) or "-"}')


if __name__ == '__main__':
    main()
