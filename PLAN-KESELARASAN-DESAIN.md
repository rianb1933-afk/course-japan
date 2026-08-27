# Plan Penyelarasan Tampilan — NihonggoPro Academy

**Diperbarui:** 27 Agustus 2026
**Metodologi:** setiap angka di bawah diverifikasi langsung terhadap kode (grep menyeluruh 377 halaman), bukan estimasi. Menggantikan klaim lama "333/335 halaman CSS inline terduplikasi" dan "15+ breakpoint berbeda" yang ternyata meremehkan skala masalah sesungguhnya.

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

### Fase 1 — Tutup celah jembatan warna (🟢 cepat, nyaris tanpa risiko)
Tambahkan `<link rel="stylesheet" href="assets/kyoto-theme.css">` ke 19 halaman yang masih memuat palet lama tanpa jembatan ini. Satu baris per halaman, sudah dirancang aman untuk ini.

### Fase 2 — Bersihkan 84 hardcode hex (🟡 sedang, perlu spot-check)
Ganti `#be3428` dkk yang ditulis langsung di 84 tempat menjadi `var(--red)` (yang setelah Fase 1 otomatis jadi warna Kyoto). Bisa diotomasi via script regex per file, tapi tiap halaman perlu diverifikasi visual/validator setelahnya karena hardcode bisa muncul di konteks berbeda-beda (background, border, teks).

### Fase 3 — Migrasi 7 halaman yatim ke design system (🟡 sedang-besar, per halaman)
`Papan-Tulis.html`, `Analytics.html`, `Kanji-Trainer.html`, `Speaking-AI.html`, `Landing-Page/landing.html`, `Dashboard/Dashboard.html`. Ini bukan sekadar tambah link CSS — perlu migrasi markup navbar/footer ke `kyoto-navbar.js`, jadi harus dikerjakan & diuji satu per satu.

### Fase 4 — Satukan font (🔴 butuh keputusan Anda dulu, lihat di bawah)
Setelah keputusan diambil, ganti deklarasi font yang menyimpang di halaman-halaman minoritas.

### Fase 5 — Standarkan breakpoint (🟢 jangka panjang, batch bertahap)
69 nilai → target set kecil (mis. `480px`/`768px`/`1024px`/`1280px`, mengikuti nilai yang sudah paling umum: 900/920/768/640). Dikerjakan bertahap per kelompok halaman (pola sama seperti batch Kaigo/dark-mode sebelumnya), bukan sekali jalan ke 377 halaman.

### Fase 6 — Sentralisasi komponen tombol & kartu (🟡 besar, jangka panjang)
Definisikan `.btn`/`.card` standar di design system (kalau belum lengkap), lalu ganti `style=""` ad-hoc di halaman-halaman yang belum punya class ini. Pekerjaan besar karena menyentuh markup, bukan cuma CSS — cocok dikerjakan halaman-per-halaman seiring waktu.

### Fase 7 — Footer konsisten (🟢 opsional, prioritas rendah)
Tambahkan `<footer>` seragam ke sisa 254 halaman yang belum punya, atau putuskan footer memang tidak wajib di semua tipe halaman (mis. halaman kuis fullscreen).

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
