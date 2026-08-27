# Plan Penyelarasan Tampilan — NihongoPro Academy

**Diperbarui:** 27 Agustus 2026
**Metodologi:** setiap angka di bawah diverifikasi langsung terhadap kode (grep menyeluruh 377 halaman), bukan estimasi. Menggantikan klaim lama "333/335 halaman CSS inline terduplikasi" dan "15+ breakpoint berbeda" yang ternyata meremehkan skala masalah sesungguhnya.

> ✅ **Status eksekusi (27 Agustus 2026)**: Fase 1 & 2 selesai, plus penyatuan warna skala besar yang ternyata jauh lebih luas dari perkiraan awal dokumen ini (lihat "Yang sudah dikerjakan" di bawah). Proyek kini punya git repository (diinisialisasi sesi ini) sebagai jaring pengaman — sebelumnya tidak ada versi kontrol sama sekali.

---

## Ringkasan masalah — lebih besar dari yang tercatat sebelumnya

1. **2 palet warna hidup berdampingan.** Palet baru "Kyoto" (`--primary:#6B4F3A` coklat, `--kyoto-red:#A63A3A`) di `kyoto-design-system.css`, vs palet lama (`--red:#be3428`, `--blue:#2f6fed`, `--green:#21875d`) yang masih dimuat lewat `assets/legacy-bundle.min.css` (13 halaman) dan `assets/pro-style.css` (89 halaman).
2. **84 warna hardcode lolos dari sistem variabel sama sekali** — `#be3428` (merah lama) ditulis langsung sebagai teks di 84 tempat dalam blok `<style>` inline, jadi tidak bisa diperbaiki cukup dengan mengganti variabel CSS. Ditemukan juga warna ad-hoc lain seperti `#1565c0` yang tidak ada di palet manapun.
3. **3 font berbeda dipakai bergantian**: `kyoto-design-system.css` mendeklarasikan DM Sans/Noto Serif JP, `kyoto-bundle.min.css` memuat Noto Sans JP, sementara **145+ halaman** (termasuk `index.html`, `About.html`, kebanyakan `Materi/*`) memuat font `Outfit` sendiri dan memakainya inline.
4. **69 nilai breakpoint responsif berbeda** ditemukan (bukan "15+" seperti klaim lama) — dari yang umum (`900px` dipakai 406×, `768px` 99×) sampai nilai sekali-pakai (`340px`, `280px`).
5. **7 halaman yatim tanpa design system apa pun** (koreksi dari klaim lama "6 halaman"): `Papan-Tulis.html`, `Analytics.html`, `Kanji-Trainer.html`, `Speaking-AI.html`, `Landing-Page/landing.html`, `Dashboard/Dashboard.html` — dan `Teacher-Dashboard.html` **bukan** halaman yatim (klaim lama salah, halaman ini sudah pakai `kyoto-bundle.min.css`).
6. **Tombol & kartu tidak tersentralisasi** — banyak halaman (`index.html`, `Kaigo-Simulator.html`, semua modul `Kaigo-*.html`/`Kaiwa-*.html`, `Dashboard.html`) tidak punya class `.btn` sama sekali; tombolnya `style=""` inline ad-hoc, masing-masing beda `border-radius`/`padding`/warna.
7. **Footer tidak konsisten** — hanya 123/377 halaman punya `<footer>`, tidak ada partial/komponen footer bersama.
8. **Dark mode tipis di halaman dengan CSS inline besar** — `Kelas-Online.html` (49KB CSS inline) cuma 2 referensi `data-theme`, `Akun.html` (14KB) cuma 1. Elemen berwarna hardcode di halaman ini kemungkinan tidak ikut berganti gelap.

---

## Fondasi yang sudah ada — jangan bangun ulang

Proyek ini **sudah punya standar resmi**, tinggal diadopsi penuh:

- `assets/kyoto-design-system.css` — token warna/tipografi/radius/shadow resmi ("KYOTO DESIGN SYSTEM v1.0").
- `assets/kyoto-theme.css` — **jembatan yang sudah ditulis** khusus untuk masalah #1 di atas: comment di file ini secara eksplisit berkata *"Replaces all old red/blue brand colors with Kyoto palette. Import AFTER all other CSS files"*. File ini me-remap `--red`/`--blue`/`--green` versi lama ke warna Kyoto — artinya menyambungkan halaman lama ke palet baru **tanpa mengedit satu pun warna di halaman itu sendiri**, asal `<link>` ditambahkan.
- **Yang mengejutkan**: dari 90 halaman yang masih memuat palet lama (`legacy-bundle.min.css`/`pro-style.css`), **71 sudah memuat jembatan ini** — cuma **19 halaman** yang benar-benar bolong. Gap-nya jauh lebih kecil dari dugaan awal.

---

## Fase pengerjaan (diurutkan risiko rendah → tinggi)

### Fase 1 — Tutup celah jembatan warna ✅ SELESAI

Ditambahkan `<link rel="stylesheet" href="assets/kyoto-theme.css">` ke 19 halaman yang masih memuat palet lama tanpa jembatan ini.

### Fase 2 — Bersihkan hardcode hex legacy ✅ SELESAI (lebih besar dari perkiraan: 240 titik, bukan 84)

Angka "84" di ringkasan awal dokumen ini ternyata sampel parsial, bukan total. Setelah dihitung menyeluruh: `#be3428`/`#2f6fed`/`#21875d` dipakai **639+ kali**, tapi sebagian besar (423×) sudah aman lewat pola `var(--red,#be3428)`. Yang benar-benar hardcode telanjang (tidak lewat variabel): **240 titik di 68 halaman**, dibungkus ke `var(--red,...)`/`var(--blue,...)`/`var(--green,...)`. Konteks canvas/array warna-warni (confetti di `Kelas-Online.html`) sengaja dikecualikan karena bukan warna tema, melainkan warna gambar/dekorasi. Ditemukan & diperbaiki juga: 2 regresi kecil dari proses ini sendiri (`<meta theme-color>` sempat ter-isi `var()` yang tidak valid untuk atribut non-CSS, langsung dikoreksi ke nilai literal).

### Fase 2b (baru, ditemukan saat eksekusi) — Satukan warna hero & aksen template ✅ SELESAI

Investigasi lanjutan menemukan masalah **jauh lebih besar** dari klaim awal "#1565c0 di 120 halaman": ternyata ada **20+ galur warna hero berbeda** (biru, ungu, indigo, oranye, teal, dst) tersebar di ratusan halaman `Materi/`, hasil dari beberapa "galur" template berbeda yang di-clone dari waktu ke waktu tanpa pernah disatukan — bukan sistem kategori JLPT/level yang disengaja (dikonfirmasi: modul topik tak berhubungan seperti Kaigo-N2/Kaiwa-Restoran/Grammar-N4 semuanya pakai gradient biru identik).

Dikerjakan dalam 3 sub-batch, semua tervalidasi + di-commit terpisah:

1. **Theme-color mobile browser** disatukan ke `#6B4F3A` di 285 halaman (dari 250 halaman hijau leftover `#2e7d32` + ~35 nilai acak satu-pakai).
2. **Warna hero** (`.hero{background:linear-gradient(...)}` dan varian `.page-hero`) di 209 halaman dibungkus `var(--primary,...)`/`var(--primary-dark,...)` — 2998 titik total.
3. **Warna aksen sekunder** (heading/tabel/vocab-item non-hero: `#1a237e`, `#4a148c`, dll) di 122 halaman dibungkus `var(--accent,...)` — 3255 titik.

Selama proses ini dibangun & diverifikasi **proteksi berbasis posisi** untuk blok CSS semantik (`.qopt.correct`/`.qopt.wrong`/`.correct`/`.wrong`/`.incorrect`/`.flagged`) supaya warna "jawaban benar" (hijau) dan "jawaban salah" (pink/merah) tidak ikut tertukar ke warna brand meskipun kebetulan memakai hex yang sama dengan warna hero di sebagian file.

**Sengaja belum disentuh** (didokumentasikan sebagai keputusan sadar, bukan lupa):

- `Kelas-Online.html` — satu-satunya file dengan 4 gradient panel berbeda (bukan 1 identitas halaman tunggal), butuh peninjauan manual.
- Latar pucat berpasangan (`#f3e5f5`, `#e3f2fd`, dll) — sangat desaturasi, dampak visual "off-brand" kecil dibanding aksen gelapnya yang sudah diperbaiki.
- Warna kategori exam UI (`.flagged` — oranye "ditandai untuk ditinjau") — sengaja dilindungi, ini status fungsional bukan branding.

### Fase 3 — 7 halaman yatim ✅ SEBAGIAN BESAR TERNYATA TIDAK PERLU "MIGRASI"

Asumsi awal ("perlu migrasi navbar/footer ke `kyoto-navbar.js`, pekerjaan besar per halaman") ternyata salah setelah diperiksa satu per satu — 4 dari 6 halaman *tool* ternyata memang sengaja punya UI ringkas sendiri (wajar untuk halaman fokus/full-screen), dan masalah sebenarnya lebih sempit:

- **`Analytics.html`, `Kanji-Trainer.html`, `Speaking-AI.html`** ✅ diperbaiki — bukan "tanpa design system", tapi punya sistem dark-mode SENDIRI (`[data-dark]`) yang genuinely tidak nyambung dengan `[data-theme]`+localStorage yang dipakai situs lain. Preferensi gelap/terang pengguna tidak terbawa saat pindah ke/dari 3 halaman ini. Diperbaiki dengan menjembatani kedua mekanisme toggle (state-sync saja, warna internal halaman — sengaja slate/biru-abu, beda dari coklat Kyoto — tidak disentuh, itu pilihan wajar untuk nuansa tool/dashboard).
- **`Papan-Tulis.html`** ✅ diperbaiki — ternyata SUDAH kompatibel penuh (`dark-mode-toggle.js` + CSS `[data-theme="dark"]` lengkap di `whiteboard.css`), cuma tidak ada tombol toggle di markup. Ditambahkan 1 tombol.
- **`Dashboard/Dashboard.html`** ✅ TIDAK PERLU DIPERBAIKI — diperiksa `dashboard-v86.css`: sudah punya sistem variabel sendiri yang lengkap (`--paper`/`--surface`/`--ink`/`--green` dst.) dengan satu blok `[data-theme="dark"]` yang me-remap SEMUA variabel sekaligus, dipakai konsisten di seluruh 140 baris CSS. Sudah benar sejak awal — grep dangkal sebelumnya ("cuma 1 referensi data-theme") salah membaca ini sebagai kurang, padahal itu satu blok besar yang cukup.
- **`Landing-Page/landing.html`** ⏳ sengaja belum disentuh — benar-benar berdiri sendiri (0 stylesheet bersama, 0 dark mode). Kemungkinan disengaja untuk landing page (performa maksimal untuk trafik iklan/konversi, wajar minim dependency). Butuh keputusan Anda: apakah halaman ini memang harus ikut identitas Kyoto, atau boleh tetap independen karena fungsinya beda (marketing funnel vs platform utama)?
- **`Teacher-Dashboard.html`** — dikonfirmasi ulang bukan halaman yatim (sudah pakai `kyoto-bundle.min.css` sejak awal, klaim lama di dokumen ini salah).

### Fase 4 — Satukan font ✅ SELESAI (ternyata bukan keputusan desain, tapi bug cascade CSS)

Investigasi CSS cascade (bukan sekadar grep deklarasi) membuktikan "3 font berbeda" bukan inkonsistensi visual nyata: `kyoto-bundle.min.css` punya `body{font-family:'DM Sans','Noto Sans JP',...!important}` yang **selalu menang** atas `body{font-family:Outfit,...}` halaman manapun yang juga memuat bundle ini (specificity sama, `!important` menang mutlak). Jadi font yang benar-benar dirender di 369/377 halaman **sudah** DM Sans — tidak perlu "memilih pemenang" seperti dugaan awal.

Masalah sebenarnya: 145 halaman men-download font Google `Outfit` (bandwidth terbuang), 139 di antaranya (yang juga memuat `kyoto-bundle.min.css`) tidak pernah benar-benar menampilkannya. Dibersihkan: link Google Fonts `Outfit` dari query string gabungan + 221 deklarasi `body{font-family:Outfit,...}` mati. Zero perubahan visual — murni bandwidth/dead-code.

6 halaman dikecualikan (genuinely tidak memuat `kyoto-bundle.min.css`, jadi Outfit genuinely dirender di sana): `Analytics.html`, `Kanji-Trainer.html`, `Speaking-AI.html`, `Dashboard/Dashboard.html`, `Landing-Page/landing.html`, `Materi/Kaigo.html`.

### Fase 5 — Breakpoint ✅ DIPERIKSA, TERNYATA BUKAN MASALAH SIGNIFIKAN

Klaim "69 nilai breakpoint berbeda" (dan revisi lanjutannya "900px dipakai 406×, 920px 233×") ternyata salah hitung — angka itu menghitung SEMUA properti `max-width`/`min-width` di seluruh CSS (termasuk ukuran gambar/ikon/kartu, yang wajar bervariasi), bukan cuma nilai di dalam kondisi `@media(...)` yang sungguh mempengaruhi breakpoint responsif.

Setelah dihitung akurat (hanya nilai di dalam `@media`): **cuma 22 nilai berbeda**, dari 266 total deklarasi, dan **61% di antaranya sudah 2 nilai dominan** (`768px` 101×, `900px` 55×). Sisanya nilai satu-dua-pakai (mis. `620px`, `940px`, `1100px`) yang wajar untuk konten spesifik per halaman (tabel lebar, grid kartu, dll) — bukan inkonsistensi sistemik yang perlu dipaksa seragam. **Kesimpulan: tidak ada tindakan besar yang perlu diambil di sini** — memaksa semua ke 1-2 nilai berisiko merusak layout yang sudah disetel pas untuk konten masing-masing, demi manfaat visual yang nyaris tidak terlihat pengguna.

### Fase 6 — Sentralisasi komponen tombol & kartu ✅ SELESAI (tombol quiz)

Dikonfirmasi nyata (bukan salah baca seperti Fase 3/4/5/7): hanya **10 dari 377 halaman** punya class `.btn` terdefinisi — mayoritas mutlak tombol di situs pakai `style=""` ad-hoc langsung di markup. Border-radius yang ditemukan (8px/10px/12px/100px-pill) cukup terkonsentrasi, tapi tetap bukan sistem komponen bersama.

**Kenapa sempat ditunda**: perbaikan Fase 1-5/7 aman diotomasi karena TIDAK mengubah struktur HTML — cuma mengganti nilai CSS/atribut dengan variabel setara. Fase 6 butuh **mengubah markup** (`style="..."` → `class="btn btn-primary"`), yang berisiko merusak tata letak tanpa peninjauan visual per halaman.

**Yang dikerjakan**: pola tombol quiz "Soal Berikutnya"/"Reset" (persis sama di 91 halaman `Materi/*.html`, semua mengikuti template `Kaigo-Ujian-N2.html`) diganti dari inline `style=""` ad-hoc menjadi `class="btn btn-primary"`/`class="btn btn-outline"` — class-class ini sudah lengkap didefinisikan di `kyoto-design-system.css` (`.btn-primary` pakai `--kyoto-brown` yang identik dengan `--primary`), sehingga tampilan visual tombol **tidak berubah**, hanya markup-nya yang disentralisasi.

**Bonus temuan bug nyata**: verifikasi Playwright atas perubahan ini menemukan 4 modul kaiwa (`Kaiwa-Shokuba/Byouin/Konbini/Yakusoku.html`) punya tombol quiz utama yang memanggil `nQ()`/`rQ()` yang **tidak pernah didefinisikan** sejak file-file ini dibuat (generator batch-nya menyalin sebagian template tapi lupa menyalin fungsi `rnd()`/`ans()`/`nQ()`/`rQ()`). Sudah diperbaiki di commit yang sama — quiz utama ke-4 modul ini sekarang berfungsi penuh (sebelumnya tombol "Soal Berikutnya" error di console dan tidak melakukan apa-apa).

**Belum disentuh (di luar cakupan)**: kartu (`.card`) dan pola tombol lain di luar quiz (CTA, navigasi, dsb) — audit tersebut belum dilakukan, jadi belum diklaim selesai. Kalau mau dilanjutkan: pendekatan yang sama (audit pola persis-sama dulu, verifikasi Playwright sebelum commit massal) tetap berlaku.

### Fase 7 — Footer konsisten ✅ SELESAI (ternyata cuma 2 halaman yang genuinely kelewat)

"254 halaman tanpa footer" di klaim awal salah kaprah — mayoritas mutlak itu memang **sengaja** tidak punya footer, konsisten dengan konvensi proyek sendiri (`scripts/validate.py`: *"Footer bukan standar universal di semua materi... hanya dilaporkan sebagai catatan, bukan error"*). Diperiksa 12 halaman root tanpa footer satu per satu:

- **10 genuinely sengaja**: `Admin-Pro`, `Analytics`, `Kanji-Trainer`, `Papan-Tulis`, `Payment-Receipt`, `Speaking-AI`, `Teacher-Dashboard`, `Theme-Settings`, `Ujian` (fokus ujian, footer akan mengganggu), `Verify` (struk/verifikasi, bukan halaman jelajah).
- **2 genuinely kelewat**: `Blog-SEO.html` ("Blog & Artikel" — halaman konten biasa) dan `Progress.html` ("Progress Belajar Saya") — ditambahkan footer standar (sama persis dengan `FAQ.html`/`About.html`).

242/321 halaman Materi (kuis/latihan) **sengaja tidak disentuh** — footer di tengah sesi kuis akan jadi distraksi, bukan bug.

### Fase 8 — Perkuat dark-mode override (🟡 sedang, terkait Fase 2)
Setelah hardcode hex dibersihkan (Fase 2), audit ulang halaman dengan CSS inline besar (`Kelas-Online.html`, `Akun.html`, `Materi/Kana-Hiragana-Katakana.html`) untuk memastikan elemen custom-nya benar-benar berganti warna saat dark mode aktif.

---

## Keputusan yang perlu Anda ambil sebelum lanjut ke Fase 4+

1. **Font final**: `Outfit` (sudah dipakai nyata di 145+ halaman, lebih murah untuk "menang" karena tinggal jadikan standar resmi) vs `DM Sans`/`Noto Serif JP` (standar yang tertulis di `kyoto-design-system.css` tapi belum diadopsi luas). Mengubah ke arah minoritas berarti mengedit lebih banyak halaman.
2. **Toleransi risiko pembersihan hex (Fase 2)**: dikerjakan otomatis via script lalu displot-check per batch (lebih cepat), atau manual halaman-per-halaman (lebih lambat tapi lebih aman)?
3. **Prioritas**: brand/visual dulu (Fase 1→2→4, dampak terlihat langsung ke pengguna) atau technical debt dulu (Fase 5→6, lebih terasa untuk maintainability jangka panjang)?

---

## Urutan eksekusi disarankan

1. **Fase 1** sekarang juga — murni menang cepat, tidak perlu keputusan apa pun dari Anda.
2. **Fase 2** setelah Fase 1 (manfaatnya baru terasa penuh setelah jembatan warna aktif di semua halaman).
3. Tunggu keputusan Anda soal font (poin 1 di atas) sebelum masuk Fase 4.
4. Fase 3, 5, 6, 7, 8 dikerjakan bertahap sebagai proyek jangka panjang — batch per batch seperti pola yang sudah terbukti aman di 100 modul Kaigo dan rollout dark mode sebelumnya, bukan sekali jalan ke semua halaman.
