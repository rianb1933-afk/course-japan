# Content Engine — Audit Global & Rencana Migrasi (v185, Fase 1)

*Ditulis sebagai respons terhadap spesifikasi 12-fase "Content Engine & AI Content Platform". Setiap angka di bawah diverifikasi langsung terhadap kode (grep, parse JSON, hitung file) — bukan estimasi.*

---

## Kesimpulan utama (baca ini dulu)

Proyek ini **bukan** kumpulan halaman dengan struktur data acak. Setelah audit menyeluruh, konten sebenarnya sudah punya **pola yang sangat konsisten** — ini kabar baik, migrasi ke Content Engine jauh lebih mudah daripada disangka, TAPI juga berarti skema yang diminta dokumen (`Content, Lesson, Media, Audio, Video, Bookmark, Revision History`, dst — 15+ entitas) **jauh lebih rumit dari yang genuinely dibutuhkan** konten yang ada. Membangun skema kaya untuk data yang faktanya sederhana adalah over-engineering, bukan "future-proof" seperti diklaim dokumen.

---

## 1. Inventarisasi konten nyata

| Sumber | Jumlah | Format data | Sudah di database? |
|---|---|---|---|
| `Materi/*.html` (non-Kaigo, ada kuis) | 90 halaman | `var Q=[{q,opts,a,e}]` inline JS | Sebagian (mirror di `jlpt_questions`, TIDAK dibaca balik) |
| `Materi/Kaigo-*.html` (ada kuis) | 60 halaman | Sama persis: `{q,opts,a,e}` | Sebagian (mirror di `kaigo_questions`, TIDAK dibaca balik) |
| Total soal kuis (kedua kategori) | **2.707 soal** | Skema seragam | — |
| `assets/vocab-all.csv` | 11.844 kata | `expression,reading,romaji,meaning,meaning_id,tags` | Tidak — file CSV statis, dibaca client-side |
| `Blog.html` artikel statis | 12 artikel | HTML langsung di file | Tidak (v184 baru bikin jalur BARU via `blog_posts`, 12 lama tetap statis) |
| Halaman "other" (bukan kuis: strategi, roadmap, dsb) | 67 halaman | Prosa HTML biasa | Tidak, dan **tidak semestinya** — ini konten editorial, bukan data terstruktur |

**Temuan kunci**: 90 + 60 = 150 dari 283 halaman `Materi/` (53%) formatnya **identik**: `{q: string, opts: string[4], a: number, e: string}`. Ini SATU skema, bukan 15 skema berbeda per Grammar/Vocab/Kanji/Listening/dst seperti diasumsikan dokumen — pembeda kategori sudah cukup direpresentasikan sebagai kolom `category`/`jlpt_level`/`tags` (persis seperti tabel `kaigo_questions`/`jlpt_questions` yang SUDAH ADA di schema sejak sebelum sesi ini).

**Yang TIDAK bisa/sebaiknya tidak dinormalisasi**: 67 halaman "other" adalah konten editorial (strategi belajar, roadmap, penjelasan panjang) dengan struktur unik per halaman — memaksakan skema generik ke sini akan merusak, bukan memperbaiki. Dokumen prompt mengasumsikan semua konten "dapat diubah jadi dynamic content"; audit menunjukkan sebagian genuinely tidak perlu.

---

## 2. Kenapa tabel `kaigo_questions`/`jlpt_questions` yang sudah ada TIDAK dipakai

Ditemukan di sesi sebelumnya (dicatat lagi di sini karena krusial untuk rencana migrasi): kedua tabel ini dibuat oleh `scripts/build_jlpt_question_bank.py`, tapi hanya proses **satu arah** (HTML → export JSON/SQL untuk dokumentasi), **tidak ada satu halaman pun** yang fetch balik dari tabel ini saat runtime. Artinya:
- Skema database sudah "siap pakai" sejak lama
- Yang belum ada adalah **jalur baca runtime** (frontend fetch dari Supabase) dan **jalur tulis via CMS** (bukan cuma script Python sekali jalan)

Ini mengubah pekerjaan dari "desain skema dari nol" (Fase 3 dokumen) menjadi **"sambungkan skema yang sudah ada ke jalur baca/tulis runtime"** — jauh lebih kecil scope-nya.

---

## 3. Rencana migrasi bertahap (realistis, bukan "semua sekaligus")

Dasar keputusan: pola yang sudah terbukti aman di v184 (Blog Post CMS) — tabel dengan RLS benar, Netlify Function CRUD dengan validasi, integrasi frontend **additive** (fallback, bukan penggantian paksa), test keamanan eksplisit, verifikasi Playwright end-to-end.

### Tahap A — Jalur baca runtime untuk bank soal (risiko rendah, manfaat langsung)
Sambungkan `kaigo_questions`/`jlpt_questions` yang sudah ada ke endpoint baca publik (mirip `GET /api/blog-cms`), supaya soal genuinely bisa dikelola dari CMS TANPA mengubah cara 150 halaman existing bekerja — halaman lama tetap pakai `var Q=[...]` inline (tidak disentuh), soal BARU yang ditambah lewat CMS muncul di halaman terpisah atau sebagai tambahan di halaman yang sudah ada (pola sama seperti Blog: additive).

### Tahap B — CMS admin untuk menulis soal baru
Form admin: pilih kategori (grammar/vocab/kanji/dst) + level JLPT, isi pertanyaan/4 opsi/jawaban/penjelasan — validasi struktur sama persis dengan yang sudah divalidasi `build_jlpt_question_bank.py` (4 opsi wajib, index jawaban 0-3, dll).

### Tahap C — Migrasi vocab-all.csv ke tabel (opsional, manfaat tidak jelas)
11.844 kata sudah berfungsi sebagai CSV statis, dibaca cepat client-side tanpa network round-trip. Memindah ke database menambah latency tanpa manfaat nyata KECUALI kalau tujuannya adalah admin bisa edit/tambah kata baru tanpa redeploy — kalau itu tujuannya, ini scope terpisah dari soal kuis.

### YANG SENGAJA TIDAK DIRENCANAKAN sekarang
- **Migrasi 67 halaman "other"** (editorial) ke Content Engine — salah sasaran, ini bukan data terstruktur.
- **15+ entitas dari Fase 3** (Media, Audio, Video, Bookmark, Favorite, Revision History) — tidak ada bukti kebutuhan nyata di konten yang ada sekarang. Membangun ini sekarang adalah desain spekulatif, bukan berbasis kebutuhan terverifikasi.
- **AI Content Generator (Fase 5), Search Engine (Fase 7), Recommendation (Fase 8), pemisahan API layer penuh (Fase 9)** — masing-masing proyek besar sendiri, dicatat sebagai roadmap, tidak dikerjakan sekaligus.

---

## 4. Yang akan dikerjakan di sesi ini (v185)

Berdasarkan rencana di atas, prioritas realistis untuk dieksekusi sekarang:
1. **Tahap A + B** untuk SATU kategori soal (mengikuti pola Blog v184) sebagai bukti konsep kedua — memvalidasi bahwa pola "additive CMS" bekerja untuk tipe konten kuis, bukan cuma artikel teks.
2. Dokumentasi arsitektur (Fase 12 dokumen) — laporan ini + update setelah Tahap A/B selesai.

Sisanya (Fase 5-11 dokumen) dicatat sebagai roadmap v186 di akhir sesi, dengan alasan jelas kenapa tidak dikerjakan sekarang, sama seperti pola jujur yang sudah ditegakkan sejak v175.
