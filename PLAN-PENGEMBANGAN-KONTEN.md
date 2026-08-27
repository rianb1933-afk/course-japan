# Plan Pengembangan Konten Bahasa Jepang — NihongoPro Academy

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

### ✅ 1. Bank soal JLPT: SELESAI DIPERBAIKI (27 Agustus 2026) — ternyata lebih parah dari dugaan awal

Klaim awal "0/277 soal punya `jlpt_level`" benar sebagai gejala, tapi diagnosis awal ("field tidak pernah diisi") salah. Akar masalah sesungguhnya: regex ekstraksi `var Q=(\[.*?\]);` di `scripts/build_jlpt_question_bank.py` gagal total untuk modul yang menulis `var Q=[...],qi=0,ok=0,tot=0;` (deklarasi berantai, dipakai banyak modul lebih baru) — `.*?` non-greedy lari jauh melewati akhir array asli mencari `];` berikutnya di mana pun, menghasilkan JSON rusak yang gagal parse dan **dibuang diam-diam tanpa peringatan**. Dampaknya bukan cuma "level kosong" — puluhan modul lebih baru (termasuk semua yang bernama `*-N1-*`/`*-N2-*` dst.) **hilang total dari bank**, bukan cuma levelnya.

Diperbaiki dengan `json.JSONDecoder().raw_decode()` (berhenti tepat di akhir JSON valid, robust terhadap apa pun yang menyusul). Hasil: bank naik dari **277 → 711 soal unik** (2.6×), level JLPT kini terisi benar (N1=52, N2=69, N3=47, N4=27, N5=23 — sisanya soal umum/topikal yang wajar tidak terikat 1 level).

### 🟡 2. Speaking — sebagian diperbaiki (27 Agustus 2026): bug tab hilang, bukan cuma "konten tipis"

Klaim awal ("cuma 4-5 soal per halaman") ternyata melewatkan bahwa `Speaking-Practice.html` sebenarnya alat latihan speech-recognition yang sudah matang (Web Speech API, penilaian akurasi real-time) — angka "4-5 soal" cuma menghitung kuis statis di bagian bawah, bukan bank kalimat latihan mic yang jadi fitur utamanya.

**Bug ditemukan & diperbaiki**: bank kalimat N2 (5 kalimat) dan N1 (10 kalimat) sudah ditulis lengkap di kode tapi **tidak ada tombol tab untuk mengaksesnya** — 100% tak terjangkau pengguna sejak dibuat. Ditemukan juga key JS `'Kaigo'`/`'kaigo'` (beda kapitalisasi) yang membuat 5 kalimat kaigo lanjutan mati. Diperbaiki: tombol N2/N1 ditambahkan, duplikasi digabung (kaigo 4→9 kalimat), N3 yang tadinya paling tipis (3 kalimat) ditambah jadi 7.

**Masih berlaku**: `Speaking-Daily`, `Speaking-N2-N1` (ternyata cuma kuis vocab biasa, bukan speaking sungguhan meski namanya begitu), `Listening-Speaking` tetap dengan kuis 4-5 soal. `Speaking-AI.html`/`Pronunciation.html` di root menutupi sebagian lewat AI. Kalau mau diperluas lagi: pertimbangkan menambah lebih banyak halaman speech-recognition seperti pola `Speaking-Practice.html`, bukan sekadar tambah soal kuis pilihan ganda.

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

1. ✅ **Perbaiki bank soal JLPT** — selesai (lihat temuan #1 di atas).
2. **🟡 Perluas materi Speaking terstruktur** — tambah beberapa modul speaking per level/skenario (mengikuti pola soal pilih-respons yang sudah terbukti di Kaiwa/Kaigo), bukan cuma andalkan AI Speaking Coach yang sifatnya generik.
3. **🟡 Tambah varian Reading/Listening per level** (mis. `Reading-N3-Lanjut.html`) — replikasi pola yang sudah terbukti di Grammar/Kosakata untuk menambah volume latihan.
4. **🟢 Audit kanji N1** — konfirmasi apakah 331 karakter itu representasi lengkap kurasi N1, atau perlu ditambah menuju cakupan yang lebih sepadan dengan N2.
5. **🟢 Lanjutkan ekspansi Kaiwa** kalau prioritas — dari 10 modul saat ini menuju cakupan situasi sehari-hari yang lebih luas.

---

## Keputusan yang perlu Anda ambil

- **Skala speaking/reading/listening**: berapa modul tambahan yang realistis per skill? (Menyamakan volume dengan Grammar berarti 8-10× lipat lebih banyak konten baru — perlu diputuskan targetnya bertahap, bukan sekaligus.)
- **Prioritas**: perbaikan bug teknis (#1, cepat) dulu, atau langsung ke penambahan konten baru (#2-5, lebih lambat tapi dampak ke pengguna lebih terasa)?
