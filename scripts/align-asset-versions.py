#!/usr/bin/env python3
"""
align-asset-versions.py — Samakan SEMUA cache-buster `?v=...` jadi SATU
generasi aset.

Latar belakang
--------------
Situs ini statis tanpa bundler, dan banyak halaman menulis URL aset dengan
query versi yang berbeda-beda & sewenang-wenang: ada yang bertanggal
(?v=20260623, ?v=20260830), ada yang bernomor kecil (kanji-writing.js?v=7,
neko-theme.css?v=3, whiteboard.js?v=219, np-xp.js?v=86), dan ada yang data
(vocab-all.csv?v=4). Karena service worker bersifat cache-first, URL lama
yang tidak ikut di-bump akan terus menyajikan konten basi. Mencari satu per
satu mana yang harus naik itu rapuh.

Sekarang: SATU konstan, dipakai oleh semua loader. Saat konten aset berubah,
naikkan ASSET_VERSION lalu jalankan ulang script ini — selesai.

    python3 scripts/align-asset-versions.py        # tulis ulang semua halaman
    python3 scripts/align-asset-versions.py --check  # verifikasi tanpa menulis

Yang diubah
-----------
- Semua `*.html` (halaman konten di root, Materi/, Dashboard/, QUIZ/, dll.)
- `scripts/templates/*.tpl` (blok <head>/footer kanonis)
- Aset sumber non-min di assets/ (*.js, *.css) — bundel .min.* dihasilkan
  `npm run build`, jangan disentuh langsung (build-assets punya check
  freshness sendiri).

Yang TIDAK diubah
-----------------
- `scripts/` lain (test/kode generator) — referensi di komentar/doc tidak
  memengaruhi runtime.
- URL yang versinya dihitung saat runtime (mis. shard SRS pakai hash konten
  dari SRS_CORE_META.v) — tidak ada literal `?v=` yang perlu diganti.
- sw.js — daftar precache memakai path telanjang.

Catatan: angka versi tidak punya arti urutan bagi cache — hanya perlu beda
agar cache service worker (yang menyimpan berdasarkan URL lengkap, termasuk
query) dianggap miss. Jadi menurunkan ?v=20260623 → ?v=4 itu aman.
"""

import os
import re
import sys

# ── SATU-SATUNYA konstan yang perlu dinaikkan saat konten aset berubah. ──
ASSET_VERSION = "5"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK_ONLY = "--check" in sys.argv

# URL aset statis: ekstensi lalu ?v=<nilai> MENEMPEL (tanpa spasi).
# Kelompok 1 = "." + ekstensi (titik IKUT tertangkap supaya tidak hilang),
# kelompok 2 = nilai versi lama.
VALUE_RE = re.compile(r"(?i)(\.(?:js|css|json|csv|mjs))\?v=([0-9a-z_]+)")


def candidate_files():
    found = []
    # 1) semua halaman html (di mana pun)
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if not d.startswith(".") and d != "node_modules"]
        for fn in filenames:
            if fn.endswith(".html"):
                found.append(os.path.join(dirpath, fn))
    # 2) template kanonis
    tpl = os.path.join(ROOT, "scripts", "templates")
    if os.path.isdir(tpl):
        for fn in os.listdir(tpl):
            if fn.endswith(".tpl"):
                found.append(os.path.join(tpl, fn))
    # 3) aset sumber non-min di assets/
    assets = os.path.join(ROOT, "assets")
    if os.path.isdir(assets):
        for dirpath, dirnames, filenames in os.walk(assets):
            dirnames[:] = [d for d in dirnames if not d.startswith(".")]
            for fn in filenames:
                if fn.endswith((".min.js", ".min.css")):
                    continue
                if fn.endswith((".js", ".css")):
                    found.append(os.path.join(dirpath, fn))
    return found


def main():
    files = candidate_files()
    changed = []
    total = 0
    for path in files:
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
        # Bangun ulang dari potongan-potongan (aman untuk multi-replace).
        out = []
        last = 0
        n = 0
        for m in VALUE_RE.finditer(src):
            if m.group(2) == ASSET_VERSION:
                continue          # sudah selaras — biarkan apa adanya
            out.append(src[last:m.start()])
            out.append(m.group(1) + "?v=" + ASSET_VERSION)  # group(1) sudah memuat titik
            last = m.end()
            n += 1
        if n:
            out.append(src[last:])
            total += n
            changed.append((path, n))
            if not CHECK_ONLY:
                with open(path, "w", encoding="utf-8") as f:
                    f.write("".join(out))
    for path, n in sorted(changed):
        print(f"  {n:4d}x  {os.path.relpath(path, ROOT)}")
    print("---")
    print(f"ASSET_VERSION={ASSET_VERSION}: {len(changed)} berkas, {total} URL diselaraskan")
    if CHECK_ONLY:
        print("✓ semua URL ?v= sudah memakai ASSET_VERSION" if total == 0
              else f"✖ masih ada {total} URL lama (jalankan tanpa --check)")
        sys.exit(0 if total == 0 else 1)


if __name__ == "__main__":
    main()
