#!/usr/bin/env bash
#
# Pangkas file non-publik sebelum deploy.
# ======================================
# publish dir = "." — Netlify mengunggah SELURUH isi repo ke CDN publik.
# Tanpa pemangkasan ini yang ikut terbit antara lain:
#
#   supabase-schema.sql   70 CREATE TABLE/POLICY/FUNCTION — struktur DB
#                         dan seluruh aturan RLS terbaca siapa pun
#   CHANGELOG.md          1,2 MB catatan internal
#   seed/*.sql            1,5 MB, tidak pernah dibaca frontend
#   scripts/              logika build + __pycache__
#
# Total ~4,3 MB. Tidak satu pun direferensikan HTML/JS runtime (sudah dicek:
# semua penyebutan "scripts/" dan "*.sql" di kode hanya berupa komentar).
#
# JALANKAN HANYA DI CHECKOUT CI — bukan di repo kerja. Pemanggil menyalin
# script ini ke /tmp lebih dulu supaya bash tidak kehilangan file sumbernya
# saat direktori scripts/ ikut terhapus di tengah eksekusi.
#
# Dipakai oleh:
#   - .github/workflows/deploy.yml  (jalur utama: actions-netlify)
#   - netlify.toml [build] command  (jalur cadangan: Netlify build dari git)

set -euo pipefail

if [ ! -f index.html ] || [ ! -d assets ]; then
  echo "prune-publish: bukan root situs (index.html/assets tidak ada) — batal." >&2
  exit 1
fi

before=$(du -sk . 2>/dev/null | cut -f1)

# Direktori build-only
rm -rf scripts docs .github

# Dokumentasi internal — seluruh .md di mana pun, termasuk Materi/
find . -name '*.md' -not -path './node_modules/*' -delete

# Skema & seed SQL: hanya seed/*.json yang dibaca frontend (Ujian.html + sw.js)
rm -f supabase-schema.sql
find seed -name '*.sql' -delete 2>/dev/null || true

# Contoh konfigurasi
rm -f .env.example CNAME.example

# Sumber katalog SRS (7,1 MB). Sejak dipecah jadi assets/srs/core.js + shard,
# TIDAK ADA halaman yang memuatnya — tapi publish-dir "." tetap mengunggahnya
# ke CDN. Berkasnya sengaja dipertahankan di repo sebagai masukan yang bisa
# diproduksi ulang oleh scripts/build-srs-catalog.js dan sebagai pembanding
# di scripts/tests/test-srs-catalog.js; yang dihentikan hanya pengirimannya.
rm -f assets/srs-cards-data.js

after=$(du -sk . 2>/dev/null | cut -f1)
echo "prune-publish: $(( (before - after) / 1024 )) MB dipangkas sebelum upload."

# Jaring pengaman: apa pun yang tersisa dan tidak boleh publik = gagalkan deploy
leftover=$(find . -not -path './node_modules/*' \
  \( -name '*.md' -o -name '*.sql' -o -name '*.py' -o -name '*.pyc' \) 2>/dev/null | head -5)
if [ -n "$leftover" ]; then
  echo "prune-publish: GAGAL — file non-publik masih tersisa:" >&2
  echo "$leftover" >&2
  exit 1
fi
