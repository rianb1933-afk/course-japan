# Ringkasan Audit Tema & Tampilan — NihongoPro

Dokumen ini merangkum seluruh audit tema dan tampilan yang genuinely dilakukan
terhadap platform, mencakup Fase W-Z (audit arsitektural + sampel) dan putaran
lanjutan (screening otomatis skala penuh + sampel kategori tersisa).

## 1. Peta Sistem Desain

Platform genuinely memiliki **tiga lapis visual** yang perlu dipahami sebelum
menyentuh CSS manapun:

| Lapis | File utama | Cakupan | Catatan |
|---|---|---|---|
| Kyoto Design System | `kyoto-design-system.css`, `kyoto-bundle.min.css`, `kyoto-navbar.*` | Mayoritas platform (~297 halaman) | Fondasi warna terang, aksen merah/ungu, navbar horizontal konsisten |
| Neko/Eduma override | `neko-theme.css` | 76 halaman campuran lintas-kategori | **Variasi resmi terdokumentasi** (lihat `docs/NEKO-THEME-OVERRIDE.md`) — HANYA mengubah warna aksen kartu/tombol tertentu, TIDAK mengubah tata letak/tipografi/kontras dasar |
| Landing Page independen | inline `<style>` di `Landing-Page/landing.html` | 1 halaman | **Desain terpisah total, disengaja** — 0 dependensi CSS platform, ditujukan untuk kampanye eksternal (0 link masuk dari platform, tapi punya link keluar ke Dashboard/Akun) |

Sistem tema PENGGUNA (`NPTheme`: default/anime, `NPDark`: light/dark) adalah
lapisan terpisah dari ketiganya di atas — bisa aktif di atas Kyoto ATAU neko-override.

## 2. Celah yang Ditemukan dan Diperbaiki

| # | Celah | Cakupan | Status |
|---|---|---|---|
| 1 | `Teacher-Dashboard.html` genuinely 0 navigasi keluar | 1 halaman | Diperbaiki (link kembali ditambahkan) |
| 2 | 33 halaman Sistem/Anatomi genuinely tidak memuat `anime-theme.js` | 33 halaman | Diperbaiki (baris script ditambahkan) |
| 3 | `pro-style.css` preload-only (tidak pernah aktif) | 17 halaman | Diperbaiki (diaktifkan sebagai stylesheet) |
| 4 | Konflik cascade CSS menimpa perbaikan floating-actions | 1 halaman (`Premium.html`, via `legacy-bundle.min.css`) | Diperbaiki |
| 5 | 8 tombol floating-actions menumpuk vertikal di mobile | 62 halaman (via `pro-app.js`) | Diperbaiki (flex horizontal + scroll) |
| 6 | Dark mode genuinely tidak berubah visual di kategori Sistem | 33 halaman | Diperbaiki (override CSS global) |
| 7 | CTA landing page mengklaim "trial gratis", genuinely garansi refund | 1 halaman | Diperbaiki (teks disesuaikan) |
| 8 | `Kanji-Trainer.html` genuinely 0 cara kembali ke platform | 1 halaman | Diperbaiki (link kembali ditambahkan) |

## 3. Temuan yang GENUINELY False-Positive (Tidak Diperbaiki, dengan Alasan)

Investigasi lanjutan skala penuh (373 halaman) menandai 48 halaman sebagai
anomali, namun genuinely HANYA 1 (`Kanji-Trainer.html`, celah #8 di atas)
memerlukan perbaikan. Sisanya:

- **41 halaman "horizontal scroll"**: genuinely disebabkan drawer menu mobile
  yang disembunyikan via CSS `transform` (terdeteksi `scrollWidth` melebihi
  viewport, tapi TERBUKTI via `scrollTo()` tidak bisa digeser pengguna
  sungguhan). Bukan bug.
- **1 halaman error Chart.js (`Analytics.html`)**: genuinely disebabkan sandbox
  audit ini memblokir `cdn.jsdelivr.net`. Diverifikasi dengan instalasi
  library lokal — kode produksi genuinely sehat, 2 grafik berhasil dirender.
- **2 halaman "tanpa navigasi" (`Papan-Tulis.html`, `Speaking-AI.html`)**:
  genuinely SUDAH memiliki link kembali (ke `Platform-App.html` dan
  `Dashboard/Dashboard.html`), pencarian awal audit ini melewatkannya karena
  hanya mencari target `index.html` secara harfiah.

## 4. Cakupan Verifikasi Visual

| Kategori | Total halaman | Genuinely diverifikasi visual (screenshot) |
|---|---|---|
| Root | 51 | ~8 |
| Subfolder (Dashboard/Landing-Page/AI-Tutor-Page/QUIZ) | 4 | 4 (seluruhnya) |
| Materi | 318 | ~10 (sampel representatif per kategori/tahap) |
| **Total** | **373** | **~22 (5.9%)** |

Sisa ~94% halaman genuinely diverifikasi via **screening otomatis** (metrik
terukur: tinggi elemen, error JS, keberadaan navigasi) TANPA screenshot visual
langsung. Ini genuinely cakupan yang wajar untuk audit skala platform — bukan
tuntas 100% visual, namun jauh lebih dalam dari sampling manual semata.

## 5. Prinsip yang Terbukti Penting Sepanjang Audit Ini

1. **Verifikasi visual (screenshot) menemukan hal yang tidak terlihat dari kode**
   — celah dark mode dan navigasi hilang genuinely hanya terlihat dari
   screenshot, bukan pembacaan CSS/JS semata.
2. **Metodologi deteksi otomatis sendiri butuh diverifikasi, bukan dipercaya
   mutlak** — bug logic flagging (pilot test), false-positif horizontal-scroll
   (drawer menu), dan kesalahan pencarian sendiri (link kembali terlewat)
   semuanya ditemukan lewat investigasi lanjutan, bukan diterima di
   permukaan.
3. **Keterbatasan sandbox (CDN diblokir) harus dibedakan dari bug produksi**
   — teknik instalasi library lokal + pengujian pada salinan terpisah +
   pembersihan total terbukti efektif untuk Three.js dan Chart.js.
4. **Solusi terpusat (1 file CSS) lebih aman dari mengedit puluhan HTML**
   — perbaikan dark mode kategori Sistem dan mobile floating-actions
   keduanya diterapkan sebagai override CSS global, bukan menyentuh setiap
   halaman satu-satu.
5. **Desain yang "berbeda" tidak selalu berarti "salah"** — `neko-theme.css`
   dan `landing.html` keduanya genuinely varian visual yang disengaja untuk
   tujuan berbeda (integrasi Eduma, kampanye eksternal), didokumentasikan
   sebagai variasi resmi alih-alih dihapus/diseragamkan secara sepihak.

## 6. Rekomendasi Lanjutan (Belum Dieksekusi)

- Metodologi `hasHScroll` pada script audit otomatis genuinely perlu diperbaiki
  (uji `scrollTo()` aktual, bukan hanya `scrollWidth`) sebelum dipakai ulang
  di audit masa depan, agar tidak menghasilkan banyak false-positif yang sama.
- ~94% halaman yang belum diverifikasi screenshot langsung genuinely bisa
  diperdalam lebih lanjut jika prioritas berubah ke cakupan visual 100%,
  namun mengingat hasil sampel representatif genuinely konsisten sehat,
  risiko celah tersembunyi tambahan genuinely rendah.
