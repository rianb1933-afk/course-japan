#!/usr/bin/env python3
"""
align-site-url.py — Samakan SEMUA penyebutan alamat situs jadi SATU domain.

Latar belakang
--------------
Domain `nihongopro.id` tertanam di 2.000+ tempat: tag canonical, og:url,
og:image, JSON-LD, breadcrumb, sitemap, robots.txt, daftar `ALLOWED_ORIGINS`
di tiap serverless function, sampai teks footer. Selama domain itu tidak
dimiliki, setiap halaman memberi tahu mesin pencari "alamat asli saya ada di
tempat lain" — jadi alamat yang sebenarnya tidak akan pernah terindeks, dan
pratinjau tautan di media sosial menarik gambar dari domain mati.

Menyunting satu per satu mustahil dijaga konsistensinya. Sekarang: SATU
konstan, satu perintah. Pindah domain lagi nanti (misalnya sesudah membeli
domain sendiri)? Ubah SITE_DOMAIN, pindahkan yang lama ke LEGACY_DOMAINS,
jalankan ulang.

    python3 scripts/align-site-url.py           # tulis ulang
    python3 scripts/align-site-url.py --check   # verifikasi tanpa menulis

Sesudah menjalankan ini WAJIB `npm run build` — assets/pro-app.js ikut
berubah, dan bundel .min-nya dihasilkan dari sana.

Yang diubah
-----------
- Semua `*.html` di mana pun (root, Materi/, Dashboard/, QUIZ/, ...)
- `sitemap.xml`, `robots.txt`
- `scripts/templates/*.tpl` — blok <head>/footer kanonis
- Aset sumber non-min di `assets/` (env.js, pro-app.js)
- `netlify/functions/*.js` dan `api/*.js` — daftar ALLOWED_ORIGINS
- `scripts/**/*.py` dan `scripts/**/*.js` — TERMASUK `validate.py`
  (CANONICAL_DOMAIN), generator konten (`new_materi.py`,
  `build_kaigo_page.py`) yang menanam domain ke halaman baru, dan berkas tes
  yang menguji daftar origin. Kalau generator terlewat, halaman berikutnya
  yang dibuat langsung salah lagi.

Yang TIDAK diubah
-----------------
- **Alamat email** (`hello@`, `admin@`, `legal@`, `privacy@`, `bug@`).
  Ada 24 di seluruh situs. Sebuah alamat `*.netlify.app` tidak bisa menerima
  email, jadi menuliskannya di sana justru membuat kontak yang terlihat sah
  padahal mustahil dibalas. Domain email adalah keputusan tersendiri —
  regexnya sengaja menolak apa pun yang didahului "@".
- Berkas `.min.*` — hasil build, lihat catatan `npm run build` di atas.
- Script ini sendiri.
"""

import os
import re
import sys

# ── SATU-SATUNYA konstan yang perlu diubah saat alamat situs pindah. ──
# Tulis domain telanjang, tanpa skema dan tanpa garis miring penutup.
SITE_DOMAIN = "nimble-stroopwafel-9056c3.netlify.app"

# Domain yang PERNAH dipakai situs ini; semuanya ditulis ulang jadi
# SITE_DOMAIN. Saat pindah domain, pindahkan nilai SITE_DOMAIN yang lama
# ke sini supaya sisa-sisanya ikut tersapu.
LEGACY_DOMAINS = ["nihongopro.id"]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SELF = os.path.abspath(__file__)
CHECK_ONLY = "--check" in sys.argv

# Domain milik situs, opsional berawalan "www.".
#
# Lookbehind `(?<![@\w.-])` menjaga dua hal sekaligus:
#   - "hello@nihongopro.id" tidak tersentuh (didahului "@")
#   - "sub.nihongopro.id" tidak tercacah separuh (didahului ".")
# sementara "https://nihongopro.id" tetap kena karena didahului "/".
DOMAIN_RE = re.compile(
    r"(?<![@\w.-])(?:www\.)?(?:" + "|".join(re.escape(d) for d in LEGACY_DOMAINS) + r")\b"
)

# Dua entri origin identik yang bersebelahan, hasil 'x' dan 'www.x' menjadi
# sama. Sengaja berbasis pola, bukan baris: sebagian function menulis
# ALLOWED_ORIGINS memanjang dalam satu baris (create-payment, livekit-token)
# dan sebagian lagi satu entri per baris — bentuk ini menangani keduanya.
DUP_ORIGIN_RE = re.compile(r"(['\"]https?://[^'\"]+['\"])\s*,\s*\1")


def candidate_files():
    found = []

    # 1) semua halaman html
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if not d.startswith(".") and d != "node_modules"]
        for fn in filenames:
            if fn.endswith(".html"):
                found.append(os.path.join(dirpath, fn))

    # 2) berkas SEO di root
    for fn in ("sitemap.xml", "robots.txt"):
        p = os.path.join(ROOT, fn)
        if os.path.isfile(p):
            found.append(p)

    # 3) template kanonis
    tpl = os.path.join(ROOT, "scripts", "templates")
    if os.path.isdir(tpl):
        for fn in os.listdir(tpl):
            if fn.endswith(".tpl"):
                found.append(os.path.join(tpl, fn))

    # 4) aset sumber non-min
    assets = os.path.join(ROOT, "assets")
    if os.path.isdir(assets):
        for dirpath, dirnames, filenames in os.walk(assets):
            dirnames[:] = [d for d in dirnames if not d.startswith(".")]
            for fn in filenames:
                if fn.endswith((".min.js", ".min.css")):
                    continue
                if fn.endswith((".js", ".css")):
                    found.append(os.path.join(dirpath, fn))

    # 5) serverless function (dua target hosting)
    for sub in (os.path.join("netlify", "functions"), "api"):
        d = os.path.join(ROOT, sub)
        if os.path.isdir(d):
            for fn in sorted(os.listdir(d)):
                if fn.endswith(".js"):
                    found.append(os.path.join(d, fn))

    # 6) script build/validator/generator/tes — kecuali script ini sendiri
    scripts = os.path.join(ROOT, "scripts")
    for dirpath, dirnames, filenames in os.walk(scripts):
        dirnames[:] = [d for d in dirnames
                       if not d.startswith(".") and d != "__pycache__"]
        for fn in filenames:
            if not fn.endswith((".py", ".js")):
                continue
            p = os.path.join(dirpath, fn)
            if os.path.abspath(p) != SELF:
                found.append(p)

    # os.walk bisa menemukan berkas yang sama lewat dua cabang (assets/ dan
    # scripts/ tidak beririsan, tapi urutan tetap dijaga agar laporannya stabil)
    seen, unique = set(), []
    for p in found:
        ap = os.path.abspath(p)
        if ap not in seen:
            seen.add(ap)
            unique.append(p)
    return unique


def drop_duplicate_origins(text):
    """Buang entri origin kembar yang lahir dari 'x' dan 'www.x' jadi sama.

    Hanya entri identik yang BERSEBELAHAN yang dibuang, jadi daftar origin
    berisi beberapa alamat berbeda tidak tersentuh. Diulang sampai stabil
    supaya rangkaian tiga kembar atau lebih ikut runtuh.
    """
    removed = 0
    while True:
        text, n = DUP_ORIGIN_RE.subn(r"\1", text)
        if not n:
            return text, removed
        removed += n


def main():
    if not SITE_DOMAIN or "/" in SITE_DOMAIN:
        print(f"✖ SITE_DOMAIN harus domain telanjang, dapatnya: {SITE_DOMAIN!r}")
        sys.exit(2)

    changed = []
    total = 0
    total_dupes = 0

    for path in candidate_files():
        try:
            with open(path, "r", encoding="utf-8") as f:
                src = f.read()
        except (UnicodeDecodeError, OSError):
            continue

        new, n = DOMAIN_RE.subn(SITE_DOMAIN, src)
        if not n:
            continue

        new, dupes = drop_duplicate_origins(new)
        total += n
        total_dupes += dupes
        changed.append((path, n, dupes))
        if not CHECK_ONLY:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new)

    for path, n, dupes in sorted(changed):
        extra = f"  (-{dupes} origin kembar)" if dupes else ""
        print(f"  {n:5d}x  {os.path.relpath(path, ROOT)}{extra}")
    print("---")
    print(f"SITE_DOMAIN={SITE_DOMAIN}: "
          f"{len(changed)} berkas, {total} penyebutan diselaraskan"
          + (f", {total_dupes} origin kembar dibuang" if total_dupes else ""))

    if CHECK_ONLY:
        if total == 0:
            print("✓ semua penyebutan alamat sudah memakai SITE_DOMAIN")
        else:
            print(f"✖ masih ada {total} penyebutan domain lama "
                  f"(jalankan tanpa --check)")
        sys.exit(0 if total == 0 else 1)

    if total:
        print("\nLangkah berikutnya: npm run build  (assets/pro-app.min.js ikut basi)")


if __name__ == "__main__":
    main()
