# Dokumentasi: `neko-theme.css` — Lapisan Override Warna "Eduma"

**Status:** Variasi resmi yang terdokumentasi (bukan bug/inkonsistensi tak disengaja).
**Ditulis:** Fase Audit Website Putaran Kelima, Fase W (Tema & Tampilan).

## Apa Ini?

`assets/neko-theme.css` adalah lapisan **override warna** (bukan tema gelap/terang penuh)
yang diterapkan di 76 halaman tertentu di platform. File ini menggunakan `!important` di
hampir seluruh deklarasinya, menandakan ia dirancang secara sengaja untuk menimpa palet
warna default "Kyoto Design System" pada elemen-elemen spesifik: kartu (`.page-card`,
`.kanji-card`, `.grammar-card`, dst.), detail navbar (logo, link aktif), dan tombol CTA
(`.btn-primary`, `.nav-cta`, `.plan-btn`, dst.).

Nama file "neko" (kucing) genuinely tidak cocok dengan isinya — komentar header file
menyebutnya "Eduma LMS global theme layer", mengindikasikan asal-usulnya dari integrasi
sistem "Eduma" (lihat `assets/eduma-platform.css/js`, dipakai penuh hanya di `index.html`
dan `Platform-App.html` sebagai demo/showcase white-label LMS).

## Klarifikasi Penting: Bukan Penyebab Tampilan Gelap/Terang

**Temuan awal audit ini SEMPAT salah menyimpulkan** bahwa `neko-theme.css` menyebabkan
sebagian halaman tampil gelap dan sebagian terang. Investigasi lebih dalam GENUINELY
MENGOREKSI kesimpulan ini:

- `neko-theme.css` sendiri men-set `body { background: ... var(--cream) !important; }` —
  genuinely tema **terang**, bukan gelap.
- Section berlatar gelap yang terlihat di beberapa halaman (mis. `Grammar-Lengkap.html`,
  `Angka-Counter-Waktu.html`) berasal dari class `.hero` yang genuinely **independen**
  dari `neko-theme.css` — halaman lain yang TIDAK memakai `neko-theme.css` (mis.
  `Sistem-Saraf.html`) genuinely juga bisa punya struktur berbeda (tab langsung tanpa
  hero) yang membuatnya terlihat berbeda karena alasan lain sama sekali.
- Navbar genuinely identik secara struktur di kedua kelompok halaman — hanya detail
  warna kecil (warna link aktif, dll.) yang berbeda.

## Cakupan: 76 Halaman

Daftar lengkap tersimpan dapat direproduksi dengan:
```bash
grep -l "neko-theme.css" *.html Materi/*.html Dashboard/*.html \
  Landing-Page/*.html AI-Tutor-Page/*.html QUIZ/*.html
```

Sebaran genuinely lintas-kategori tanpa pola tunggal yang jelas (bukan "seluruh kategori
X" atau "seluruh halaman versi lama") — mencakup campuran Grammar, Kaigo, Flashcard,
Kanji, JLPT, dan beberapa halaman root (`index.html`, `Admin-Dashboard.html`,
`Admin-Login.html`, `LMS-Features.html`, `Pembelajaran-Lain.html`,
`Platform-Features.html`).

## Keputusan: Dipertahankan, Bukan Dihapus

Mengingat dampak visualnya genuinely terbatas pada detail warna aksen (bukan
perombakan tata letak), dan menghapusnya dari 76 halaman berisiko regresi visual yang
tidak proporsional dengan manfaatnya, file ini **dipertahankan** sebagai variasi resmi.
Developer yang mengedit salah satu dari 76 halaman ini harus menyadari bahwa palet warna
render akhir genuinely berbeda tipis dari halaman Kyoto murni, khususnya pada warna
tombol CTA dan kartu.

## Jika Ingin Menyeragamkan di Masa Depan

Opsi yang genuinely tersedia (tidak dieksekusi dalam audit ini, memerlukan keputusan
produk terpisah):
1. Hapus baris `<link rel="stylesheet" href="...neko-theme.css">` dari 76 halaman.
2. Atau, sebaliknya, perluas ke seluruh platform jika warna "Eduma" genuinely diinginkan
   sebagai identitas visual utama — namun ini mengubah `eduma-*` dari "demo terpisah"
   menjadi "sistem desain utama", keputusan yang genuinely di luar cakupan audit teknis.
