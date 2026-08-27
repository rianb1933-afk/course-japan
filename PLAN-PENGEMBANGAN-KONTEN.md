# Plan Pengembangan Konten Bahasa Jepang — NihonggoPro Academy

**Diperbarui:** 27 Agustus 2026
**Metodologi:** setiap angka di bawah dihitung langsung dari isi 322 halaman `Materi/` dan bank soal (`seed/jlpt_questions.json`), bukan estimasi — mengikuti disiplin yang sama dengan plan-plan sebelumnya di sesi ini (verifikasi dulu, baru simpulkan).

---

## Peta konten saat ini (322 halaman Materi)

| Kategori | Jumlah halaman | Catatan |
|---|---:|---|
| **Kaigo** (perawatan lansia, vokasional) | 100 | Paling matang & terdalam — 100/100 modul ≥20 soal, 2015 soal total, pembahasan 100% |
| **Anatomi/Sistem Tubuh** (untuk jalur Kaigo) | 30 | 10 sistem tubuh × 3 tingkat (dasar/menengah/lanjutan), istilah medis Jepang untuk calon perawat |
| **Grammar** | ~40 | N5–N1 tiap level + varian Review/Lanjut/Advanced, plus topik khusus (Sonkeigo-Kenjougo, Tsumori, dll) |
| **Kosakata/Vocabulary** | ~30 | N5–N1 + varian Review/Tambahan, plus tematik (Keluarga, Makanan, Emosi, Bisnis, dll) |
| **Kanji** | ~15 | N5–N1 "Full Kanji" + Review, plus Radikal, Onyomi-Kunyomi, Kanji-Writing |
| **JLPT Prep** | ~20 | CBT simulator N5–N1, Mock test N5–N1, strategy guides, cheat sheet, glosarium |
| **Reading/Listening/Speaking** | ~13 | 1 halaman per level per skill (Reading N5–N1, Listening N5–N1) + beberapa Speaking umum |
| **Keigo** (bahasa formal/bisnis) | 7 | Bisnis, email template, praktis |
| **Kaiwa** (percakapan umum) | 10 | Baru diperluas dari 6 sesi ini (lihat `CHANGELOG.md` Website v94) |
| **Flashcard** | 8 | Kanji N1–N5 + Lengkap + Grammar |
| Lainnya (partikel, konjugasi, angka, dll) | ~50 | Topik fondasi & pendukung |

**Kesimpulan umum: ini kurikulum yang sudah sangat matang**, bukan platform yang baru mulai. Prioritas pengembangan bukan "isi kekosongan besar", tapi menambal celah spesifik yang ditemukan lewat verifikasi di bawah.

---

## Temuan konkret (bukan dugaan)

### 🔴 1. Bank soal JLPT: field level rusak total — 0/277 soal punya `jlpt_level`

Diperiksa langsung isi `seed/jlpt_questions.json`: **semua 277 soal** (100%) punya `"jlpt_level": null`, tanpa terkecuali — termasuk soal dari modul yang jelas terikat level tertentu (mis. `Grammar-Sonkeigo-Kenjougo.html`, yang secara materi jelas N3/N2). Ini genuinely bug di `scripts/build_jlpt_question_bank.py` (field tidak pernah diisi), bukan desain sengaja. Dampak: fitur apa pun yang butuh filter "tampilkan soal N3 saja" dari bank ini tidak bisa berfungsi sama sekali — datanya ada, tapi tidak bisa disaring per level.

### 🟡 2. Speaking adalah skill paling tipis dari 4 skill inti (Reading/Listening/Writing/Speaking)

Cuma **4 halaman** murni speaking (`Speaking-Daily`, `Speaking-Practice`, `Speaking-N2-N1`, `Listening-Speaking`), masing-masing hanya **4-5 soal**. Bandingkan dengan Grammar/Kosakata yang punya puluhan halaman dengan varian Review/Lanjut per level. (Catatan: `Speaking-AI.html` & `Pronunciation.html` di root menutupi sebagian lewat AI, tapi materi terstruktur/kurikulum untuk speaking tetap jauh lebih tipis dari 3 skill lain.)

### 🟡 3. Reading & Listening: 1 set soal per level, tanpa varian lanjutan

Beda dari Grammar/Kosakata (yang punya Review/Tambahan/Lanjut per level → lebih banyak repetisi), `Reading-N*.html` dan `Listening-N*.html` masing-masing cuma **5-6 soal** per level, satu halaman, tanpa halaman "Reading-N3-Lanjut" dsb. Volume latihan jauh lebih sedikit dibanding skill lain untuk level yang sama.

### 🟢 4. Kanji N1 (331 karakter unik) lebih sedikit dari N2 (517)

Halaman "Full Kanji N1" genuinely menyebut **lebih sedikit** kanji unik (331) dibanding "Full Kanji N2" (517) — seharusnya terbalik (N1 kumulatif butuh kanji lebih banyak dari N2). Perlu diverifikasi lebih lanjut apakah ini karena N1 sengaja kurasi kanji berfrekuensi tinggi saja (pilihan wajar), atau genuinely belum lengkap.

### 🟢 5. Kaiwa masih 10 modul vs Kaigo 100 modul (progres berjalan)

Sudah ditambah 6→10 sesi ini (`Kaiwa-Byouin`, `Kaiwa-Konbini`, `Kaiwa-Shokuba`, `Kaiwa-Yakusoku`). Kesenjangan dengan Kaigo masih besar tapi ini memang 2 kategori beda tujuan (Kaigo = sertifikasi vokasional terstruktur, Kaiwa = percakapan situasional umum) — tidak harus sama banyaknya, tapi 10 modul untuk "percakapan sehari-hari" masih tergolong tipis untuk skill yang sangat dicari pemula.

---

## Yang SUDAH sangat baik — jangan disentuh/dikira kurang

- **Kaigo**: 100/100 modul ≥20 soal, 2015 soal total, 100% modul punya pembahasan mendalam. Ini level kedalaman konten terbaik di seluruh platform.
- **Grammar & Kosakata**: cakupan N5–N1 lengkap dengan multiple varian per level (Review, Lanjut, Tambahan) — pola repetisi yang sehat untuk penguasaan.
- **Anatomi/Sistem Tubuh untuk Kaigo**: 10 sistem × 3 tingkat kedalaman, sangat spesifik dan niche — nilai jual unik dibanding kompetitor bahasa Jepang generik.
- **JLPT CBT Simulator**: ada untuk semua 5 level, format ujian nyata (bukan cuma kuis kosakata).

---

## Rekomendasi urutan pengerjaan

1. **🔴 Perbaiki `jlpt_level` di bank soal JLPT** — bug teknis murni, cepat diperbaiki (isi ulang field saat build bank dari level yang sudah tersirat di nama/isi modul sumber), berdampak langsung ke fitur filter level mana pun yang bergantung pada data ini.
2. **🟡 Perluas materi Speaking terstruktur** — tambah beberapa modul speaking per level/skenario (mengikuti pola soal pilih-respons yang sudah terbukti di Kaiwa/Kaigo), bukan cuma andalkan AI Speaking Coach yang sifatnya generik.
3. **🟡 Tambah varian Reading/Listening per level** (mis. `Reading-N3-Lanjut.html`) — replikasi pola yang sudah terbukti di Grammar/Kosakata untuk menambah volume latihan.
4. **🟢 Audit kanji N1** — konfirmasi apakah 331 karakter itu representasi lengkap kurasi N1, atau perlu ditambah menuju cakupan yang lebih sepadan dengan N2.
5. **🟢 Lanjutkan ekspansi Kaiwa** kalau prioritas — dari 10 modul saat ini menuju cakupan situasi sehari-hari yang lebih luas.

---

## Keputusan yang perlu Anda ambil

- **Skala speaking/reading/listening**: berapa modul tambahan yang realistis per skill? (Menyamakan volume dengan Grammar berarti 8-10× lipat lebih banyak konten baru — perlu diputuskan targetnya bertahap, bukan sekaligus.)
- **Prioritas**: perbaikan bug teknis (#1, cepat) dulu, atau langsung ke penambahan konten baru (#2-5, lebih lambat tapi dampak ke pengguna lebih terasa)?
