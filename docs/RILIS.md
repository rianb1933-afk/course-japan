# RILIS — Alur Rilis NihongoPro Academy

Nomor versi proyek = nomor cache service worker: `eduma-kaigo-vN` di `sw.js`.
Setiap rilis baru menaikkan angka itu dan mencatat perubahannya di `CHANGELOG.md`.

Alur rilis dipegang satu skrip: `scripts/release.js` (dipanggil lewat npm).

## Ringkasan alur

```
1. Jalankan rilis secara lokal (npm run release)  → menulis 4 artefak
2. Commit hasilnya ke main                        → deploy otomatis (deploy.yml)
3. (Opsional) Tag vN di-push                      → GitHub Actions dry-run validasi
```

## 1. Menjalankan rilis secara lokal

```bash
npm run release -- "Judul Rilis" "bullet 1" "bullet 2" ...
```

Bullet juga bisa datang dari stdin (pipa):

```bash
cat catatan-rilis.txt | npm run release -- "Judul Rilis"
```

Pratinjau tanpa menulis apa pun:

```bash
npm run release:dry -- "Judul Rilis" "bullet"
```

Skrip melakukan 4 langkah secara berurutan:

| Langkah | Berkas | Efek |
|---|---|---|
| 1 | `sw.js` | Cache `eduma-kaigo-vN` → `vN+1` |
| 2 | `CHANGELOG.md` | Entri `## vN+1 — <judul>` disisipkan di puncak, lengkap dengan bullet (`### Perubahan`) |
| 3 | `Changelog.html` | Meta `np-latest-version` diperbarui ke `vN+1` (disisipkan otomatis bila belum ada) |
| 4 | `assets/changelog-releases.json` | Diregenerasi: rilis terbaru, maks. 40 seksi & maks. 64 KB markdown, + `latest` = `vN+1` (data publik untuk halaman Catatan Rilis) |

Setelah skrip selesai, commit empat berkas tersebut bersama perubahan lain rilis ini.
Skrip **tidak** melakukan commit — itu keputusan Anda.

> **Kenapa `CHANGELOG.md` tidak dipublikasikan ke situs?**
> `scripts/prune-publish.sh` menghapus semua `*.md` dari direktori deploy (~1,2 MB, isinya
> internal). Karena itu halaman publik `Changelog.html` memuat **`assets/changelog-releases.json`**
> (JSON, tidak ikut dipangkas), bukan `CHANGELOG.md`. JSON ini wajib diregenerasi oleh langkah 4
> setiap rilis — jangan hapus berkasnya secara manual.

## 2. Tag dan GitHub Actions (validasi saja)

Workflow `.github/workflows/release.yml` berjalan saat tag `v*` di-push (atau manual via
`workflow_dispatch`). Isinya **dry-run murni**:

- checkout tag → Node 20 → `npm run release:dry -- "<judul dari commit tag>"`
- bila metadata rilis bermasalah (mis. versi cache tidak ditemukan), workflow gagal sebagai sinyal;
- workflow **tidak menulis apa pun** ke repo.

Alur yang disarankan: rilis dilakukan & di-commit di `main` lebih dulu, baru tag dibuat dari commit
tersebut agar tag berisi catatan rilisnya.

## Kendala umum

- `Entri ## vN+1 … sudah ada` — versi berikutnya sudah tercatat; bump sudah terjadi atau entri
  ditulis manual. Periksa `sw.js` dan puncak `CHANGELOG.md`.
- `Versi cache tidak ditemukan di sw.js` — pola `eduma-kaigo-v<angka>` hilang/berubah; jangan ganti
  formatnya.
- `assets/changelog-releases.json` ikut berubah besar — normal bila ada seksi baru; isinya markdown rilis terbaru (maks. 40 seksi / 64 KB). Seksi yang lewat anggaran ukuran tetap utuh di `CHANGELOG.md` (arsip), hanya tidak ikut ke payload publik.
- Toast "Apa yang baru?" hanya muncul sekali per perangkat (flag `np-sw-wn-seen` di localStorage);
  hapus flag itu bila perlu mengujinya lagi.
