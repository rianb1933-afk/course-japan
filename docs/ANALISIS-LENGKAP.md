# Laporan Analisis & Perbaikan NihongoPro v24
**Tanggal:** 29 Juni 2026  
**Versi:** v24 (Final)  
**Total file:** 311 file | 240 halaman HTML | 3.0 MB

---

## Ringkasan Eksekutif

Audit menyeluruh terhadap seluruh 311 file project NihongoPro telah selesai dilaksanakan dalam 4 sesi perbaikan. Dimulai dari ZIP deploy mentah, seluruh bug kritis, celah keamanan, dan masalah SEO telah ditangani. Project kini siap deploy production.

**Sebelum audit:**
- 55 broken internal links (2 target unik)
- 35 halaman tanpa meta description
- 135 halaman tanpa schema.org
- 5 bug kritis (typo, domain split, security bypass)
- 2 folder nama berisi spasi (deployment risk)

**Setelah audit:**
- ✅ 0 broken internal links
- ✅ 240/240 halaman memiliki meta description
- ✅ 239/240 halaman memiliki schema.org
- ✅ 0 bug kritis tersisa
- ✅ Folder direname (AI-Tutor-Page, Landing-Page)

---

## Perubahan Per Sesi

### Sesi 1 — Perbaikan Dasar (v22)
| # | File | Perubahan |
|---|------|-----------|
| 1 | `sw.js` | v21→v22, path precache dikoreksi, `allSettled` install, API dikecualikan |
| 2 | `service-worker.js` | v61→v62, `addAll` → `allSettled` |
| 3 | `netlify/functions/ai-chat.js` | Model `claude-3-haiku-20240307` → `claude-haiku-4-5-20251001`, max_tokens 600→1200 |
| 4 | `Admin-Login.html` | Hardcoded `admin123` dihapus → env-var driven |
| 5 | `Admin-Dashboard.html` | Blokir `local-demo-*` token di production |
| 6 | `robots.txt` | Admin pages ditambah ke Disallow |
| 7 | `_headers` | Security headers + admin noindex + cache rules |
| 8 | `vercel.json` | Admin noindex + SW no-cache |
| 9 | `manifest.webmanifest` + `manifest.json` | `start_url` absolute, tambah `id` field |
| 10 | `DEPLOYMENT-GUIDE.md` | Diperbarui lengkap dengan tabel env vars dan model AI |

### Sesi 2 — Bug Kritis & Security (v23)
| # | File | Perubahan |
|---|------|-----------|
| 1 | `assets/pro-app.js` | Typo `nihongo-pro.html` → `nihongo-pro.html` (2 refs) |
| 2 | `sitemap.xml` | 113 URL domain: `nihongopro.id` → `nihongopro.id` |
| 3 | 8 HTML files | Canonical & og:url salah filename diperbaiki |
| 4 | 4 HTML files | GSC verification literal string dihapus → dynamic dari env |
| 5 | `assets/nihongo-ai.js` | Premium tidak lagi baca `localStorage` flag → Supabase JWT |
| 6 | `netlify/functions/ai-chat.js` | Server-side premium validation via Supabase auth API |
| 7 | `assets/nihongo-ai.js` | `Authorization: Bearer` dikirim bersama setiap request AI |
| 8 | `supabase-schema.sql` | RLS ditambahkan ke tabel `rate_limits` |
| 9 | `supabase-schema.sql` | Leaderboard: `USING (true)` → `USING (auth.role() = 'authenticated')` |
| 10 | `index.html` + 1 file | Email distandarisasi ke `hello@nihongopro.id` |
| 11 | `_redirects` | Disinkronkan dengan 30+ shortcut dari `netlify.toml` |

### Sesi 3 — SEO & Broken Links (v24)
| # | Scope | Perubahan |
|---|-------|-----------|
| 1 | 49 HTML files | `href` typo `nihongo-pro.html` → `nihongo-pro.html` diperbaiki di semua halaman |
| 2 | `Blog-SEO.html`, `Progress.html` | Link `JLPT-CBT-N3.html` diperbaiki ke `Materi/JLPT-CBT-N3.html` |
| 3 | `Ai Tutor Page/` | Renamed → `AI-Tutor-Page/` (aman di semua hosting) |
| 4 | `Main landing page with navigation/` | Renamed → `Landing-Page/` |
| 5 | 8 config files | Semua referensi folder lama diperbarui |
| 6 | `_redirects` | 301 redirect tambahan untuk URL folder lama |
| 7 | 35 HTML files | Meta description ditambahkan |
| 8 | 17 HTML files | Meta description terlalu pendek diperbaiki |
| 9 | 10 HTML files | H1 (SEO-hidden) ditambahkan |
| 10 | 134 HTML files | Schema.org (LearningResource / Quiz / WebPage / Blog) diinjeksi |
| 11 | `sitemap.xml` | Diregenerasi: 237 URL, lastmod hari ini, priority & changefreq tepat |
| 12 | `.env.example` | Domain dikoreksi ke `nihongopro.id` |

---

## Status Akhir: SEO Scorecard

| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| Meta description coverage | 205/240 (85%) | **240/240 (100%)** |
| Schema.org coverage | 105/240 (44%) | **239/240 (99%)** |
| Broken internal links | 55 | **0** |
| Domain konsisten | ❌ Split 2 domain | **✅ nihongopro.id** |
| Canonical akurat | ❌ 8 salah | **✅ Semua benar** |
| Sitemap URL | 113 | **237** |
| Folder URL-safe | ❌ 2 folder spasi | **✅ Semua aman** |
| H1 coverage | 230/240 (96%) | **240/240 (100%)** |

---

## Status Akhir: Security Scorecard

| Celah | Status Sebelum | Status Sesudah |
|-------|---------------|----------------|
| Hardcoded admin credentials | ❌ `admin123` di source | ✅ Dihapus |
| Demo token di production | ❌ Bisa masuk admin | ✅ Diblokir |
| Premium bypass localStorage | ❌ Siapapun bisa bypass | ✅ Server-side JWT |
| rate_limits tanpa RLS | ❌ User bisa baca semua | ✅ RLS aktif |
| Leaderboard terbuka publik | ❌ Anon bisa akses | ✅ Auth required |
| API key di source | ✅ Tidak ada | ✅ Tidak ada |
| Service Worker gagal total | ❌ 1 file miss = crash | ✅ allSettled |

---

## Arsitektur Teknis Final

```
nihongopro.id/
├── index.html                    # Landing utama
├── Landing-Page/landing.html     # Landing alt (renamed)
├── AI-Tutor-Page/AI.html         # AI Tutor (renamed)
├── Materi/ (195 halaman)
│   ├── Grammar-N5.html ~ N1.html
│   ├── Kanji-N5.html ~ N1.html
│   ├── Kosakata-N5.html ~ N1.html
│   ├── Kaigo-*.html (30+ halaman)
│   ├── Flashcard-*.html
│   └── JLPT-CBT-N3.html
├── QUIZ/nihongo-pro.html         # Quiz hub
├── Dashboard/Dashboard.html
├── assets/
│   ├── nihongo-ai.js             # AI frontend (JWT auth fixed)
│   ├── pro-app.js                # App shell (typo fixed)
│   ├── supabase-client.js
│   └── vocab-all.csv             # 11.843 kata
├── netlify/functions/ai-chat.js  # AI backend (server-side premium)
├── api/ai-chat.js                # Vercel mirror
├── supabase-schema.sql           # DB schema (RLS lengkap)
├── sw.js + service-worker.js     # PWA (v22/v62)
├── sitemap.xml                   # 237 URL
├── robots.txt
├── _headers                      # Security headers
├── _redirects                    # 35+ shortcuts + 301s
└── netlify.toml / vercel.json
```

---

## Cara Deploy

### Netlify (Tercepat)
1. Buka [app.netlify.com](https://app.netlify.com)
2. Drag & drop ZIP ini
3. Isi env vars di Site Settings → Environment Variables
4. Done ✅

### Env Vars Wajib
```
ANTHROPIC_API_KEY=sk-ant-...
EDUMA_SUPABASE_URL=https://xxx.supabase.co
EDUMA_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxx.supabase.co        ← untuk server-side premium check
SUPABASE_ANON_KEY=eyJ...                    ← untuk server-side premium check
```

### Env Vars Opsional
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...
EDUMA_GA_MEASUREMENT_ID=G-XXXXXXXXXX
EDUMA_EMAILJS_PUBLIC_KEY=...
EDUMA_EMAILJS_SERVICE_ID=service_...
EDUMA_EMAILJS_TEMPLATE_ID=template_...
NIHONGO_ADMIN_LOGIN_ENDPOINT=/api/admin-login
```

---

## Catatan Penting

1. **Model AI** — Sekarang menggunakan `claude-haiku-4-5-20251001` (terbaru). Update berkala saat model baru rilis.

2. **Admin Panel** — Masih membutuhkan backend endpoint (`NIHONGO_ADMIN_LOGIN_ENDPOINT`) untuk production. Demo mode (`window.NIHONGO_ADMIN_DEMO_PASS`) hanya berfungsi di localhost — ini by design.

3. **supabase-schema.sql** — Jalankan sekali di SQL Editor Supabase sebelum pertama kali deploy. Jika sudah pernah jalan, cukup jalankan bagian ALTER TABLE baru (rate_limits RLS).

4. **GSC Verification** — Setelah deploy, tambahkan kode verifikasi Google Search Console ke env var `EDUMA_GSC_VERIFICATION`. analytics-loader.js akan menyuntikkannya secara otomatis.

5. **Premium feature** — Untuk mengaktifkan premium user, set `is_premium: true` di `user_metadata` Supabase Auth user. Tidak ada cara bypass dari client lagi.

---

*NihongoPro v24 — Audit selesai 29 Juni 2026*

---

## Sesi 4 — Performa, Aksesibilitas & Audit Konten (v25)

### Performa
| Pemeriksaan | Hasil |
|---|---|
| Asset minified digunakan di semua halaman | ✅ 0 halaman pakai versi non-min |
| Render-blocking scripts | ✅ 0 (semua pakai `defer`) |
| Google Fonts preconnect | ✅ 100% halaman sudah ada preconnect |
| Total ukuran HTML | 7.9 MB (240 halaman) |
| Total ukuran JS | 596 KB |
| Total ukuran CSS | 456 KB |
| Halaman terbesar | `Materi/Materi.html` (296 KB) — wajar untuk hub index materi |

### Aksesibilitas
| Pemeriksaan | Sebelum | Sesudah |
|---|---|---|
| Gambar tanpa alt text | 0 | ✅ 0 |
| Halaman tanpa `lang` attribute | 0 | ✅ 0 |
| Tombol tanpa teks/aria-label | 0 | ✅ 0 |
| Input tanpa label/aria-label | 19 | ✅ 0 (semua diberi aria-label) |

### Audit Konten 195 Halaman Materi
- **0 placeholder/lorem ipsum** tertinggal di seluruh halaman materi
- **0 mojibake/encoding rusak** ditemukan
- **0 judul duplikat** antar halaman
- 77 halaman awalnya terdeteksi "tipis" oleh pemindaian teks statis — **diverifikasi false positive**: konten dirender dinamis via JavaScript (array data kosakata/grammar/kuis dengan 25-95 entri per halaman, lengkap dengan terjemahan dan penjelasan bahasa Indonesia)
- Sample spot-check pada Grammar-N5, Kanji-N5, dan halaman Kaigo menunjukkan kualitas bahasa Jepang yang konsisten dan akurat

### Perbaikan Tambahan
| File | Perubahan |
|---|---|
| `Profil.html` | aria-label pada file input |
| `Sertifikat.html` | aria-label pada 4 checkbox pencapaian |
| `Materi/Review-Kesalahan.html` | aria-label pada checkbox |
| `Materi/Kurikulum-Checklist.html` | aria-label pada checkbox dinamis |
| `Materi/Strategi-Ujian-JLPT.html` | aria-label dinamis dari variabel item |
| `Materi/Rencana-Belajar-JLPT.html` | aria-label pada 2 checkbox target belajar |

**Kesimpulan:** Tidak ditemukan masalah performa atau aksesibilitas signifikan baru. Platform sudah dibangun dengan praktik baik (defer scripts, preconnect fonts, minified assets, alt text lengkap). Perbaikan yang dilakukan bersifat penyempurnaan minor pada form accessibility.

*Audit selesai 29 Juni 2026 — v25*

---

## Sesi 5 — Second-Pass Audit, Validasi Otomatis & CI/CD (v26)

### Second-Pass Audit: Bug Baru Ditemukan

Audit lanjutan menemukan bug nyata yang luput dari sesi sebelumnya:

| # | Temuan | File Terdampak | Fix |
|---|--------|----------------|-----|
| 1 | **13 stray orphan `<div>`** dengan id duplikat (`pqExp`, `cqExp`, `rqExp`, dll) — sisa copy-paste yang salah tempel di area footer/komponen lain | 13 halaman Materi (Pelafalan-Pitch-Accent, Konjugasi-Dasar, Radikal-Kanji, Partikel-Dasar, Ungkapan-Natural, Grammar-Lengkap, Kesalahan-Umum-JLPT, Kanji-N5, Kanji-N1 ×4, Keigo-Bisnis ×4, Listening-Speaking, Cheat-Sheet-JLPT, Fondasi-Bahasa-Jepang ×4) | Div duplikat dihapus, hanya elemen asli di dalam quiz widget yang dipertahankan |
| 2 | 15 meta description masih di bawah 50 karakter (luput dari sesi SEO sebelumnya) | Admin-Login + 14 halaman Materi | Diperpanjang dengan deskripsi natural dan informatif |

**Catatan penting:** Pola `qNum`/`qTot`/`qText` dkk yang muncul "duplikat" di 9 halaman Kaigo dan `Keigo-Fukushishi.html` **diverifikasi false positive** — itu adalah template literal JavaScript (`innerHTML = \`...\``) yang menulis ulang DOM saat fungsi reset dipanggil, bukan duplikasi statis nyata.

### Script Validasi Otomatis: `scripts/validate.py`

Dibuat script Python yang mengonsolidasikan **11 kategori pengecekan** dari seluruh sesi audit manual sebelumnya menjadi satu script yang bisa dijalankan kapan saja:

1. Sintaks JS valid
2. JSON config valid
3. Broken internal links
4. Konsistensi domain (canonical/og:url/sitemap)
5. Canonical URL cocok nama file
6. SEO dasar (meta desc, title, H1, schema.org)
7. Duplicate static HTML id (dengan deteksi cerdas — mengecualikan template literal JS)
8. Aksesibilitas (alt text, lang, form label — termasuk deteksi implicit `<label>` wrapping)
9. Security (hardcoded secrets, premium bypass, admin password)
10. Folder nama aman URL
11. Service worker resilience

```bash
python3 scripts/validate.py            # mode normal
python3 scripts/validate.py --strict   # gagal juga jika ada warning
```

**Hasil run pertama:** Script langsung menemukan 1 bug di dirinya sendiri (false positive domain dari XML namespace `sitemaps.org`) dan 2 kategori warning baru — keduanya diperbaiki dan sekarang script lolos sempurna: **19/19 checks passed, 0 warning, 0 error.**

### CI/CD: GitHub Actions

Dua workflow ditambahkan di `.github/workflows/`:

- **`validate.yml`** — Jalan otomatis di setiap push/PR ke `main`, menjalankan validator sebagai quality gate
- **`deploy.yml`** — Jalan di push ke `main`: validasi dulu (gate), baru deploy otomatis ke Netlify jika lolos

Dokumentasi setup lengkap (cara ambil token Netlify, cara setup GitHub Secrets) ada di `CI-CD-SETUP.md`.

### Status Akhir Validator

```
✅ PASSED (19/19)
⚠️  WARNINGS (0)
❌ ERRORS (0)
RESULT: PASSED
```

*Audit selesai 30 Juni 2026 — v26*

---

## Sesi 6 — Third-Pass Audit, Test Suite & Optimasi (v27)

### Third-Pass Audit: Bug Logic Tersembunyi Ditemukan

Audit dengan teknik cross-reference JS↔HTML menemukan kelas bug baru yang tidak tertangkap oleh pemeriksaan statis biasa:

| # | Temuan | Dampak | Fix |
|---|--------|--------|-----|
| 1 | **Variable name mismatch**: `env.js` mendefinisikan `AI_ENDPOINT`, tapi `nihongo-ai.js` membaca `AI_API_ENDPOINT` | Custom AI endpoint override via env var `EDUMA_AI_API_ENDPOINT` tidak pernah terbaca — selalu fallback ke hardcoded default. Berfungsi normal tapi tidak bisa dikustomisasi | Nama variabel disamakan di `env.js` |
| 2 | **6 halaman memanggil `NihongoProgress` tanpa load `platform.js`** (Kanji-Writing, Keigo-Fukushishi, Listening-Speaking, Sertifikat, Grammar-Checker, AI-Sensei) | XP/progress tracking diam-diam tidak tersimpan di halaman ini (dijaga `if` jadi tidak crash, tapi silent failure) | `<script src="platform.min.js">` ditambahkan ke 6 halaman |

### Bug Logic di Algoritma SRS — Ditemukan via Unit Test

Saat menulis test suite untuk `NP.SRS.rate()`, ditemukan **2 bug nyata** di logika inti:

1. **Rating tidak valid diam-diam diperlakukan sebagai "Easy"** (interval terpanjang) tanpa validasi sama sekali. Risiko: jika ada bug caller di masa depan yang mengirim nilai salah, kartu SRS bisa langsung lompat ke interval 4 hari tanpa alasan.
2. **Edge case `null`**: validasi pertama (`Number(rating)`) gagal menangani `null` dengan benar karena `Number(null) === 0` (rating "Again" yang valid) — `null` lolos validasi padahal seharusnya ditolak. Ditemukan oleh test, diperbaiki dengan pengecekan tipe sebelum konversi.

### Bug Logic di Sistem XP — Ditemukan via Unit Test

`levelProgress()` tidak melakukan clamping hasil akhir ke rentang 0-100%. Dengan XP negatif (skenario tidak normal tapi bisa terjadi jika ada bug penalti XP di masa depan), fungsi mengembalikan persentase negatif (`-10%`) yang akan merusak tampilan progress bar di UI manapun yang memakainya. Diperbaiki dengan `Math.max(0, Math.min(100, pct))`.

### Bug Performa: Hero Image Salah Lazy-Load

Gambar maskot di hero section `index.html` — elemen visual pertama yang dilihat user begitu halaman dibuka — diset `loading="lazy"`. Ini salah: lazy loading seharusnya hanya untuk gambar di bawah fold. Untuk gambar above-the-fold (kemungkinan besar elemen LCP/Largest Contentful Paint halaman), `lazy` justru menunda render dan memperlambat persepsi kecepatan loading. Diperbaiki ke `loading="eager" fetchpriority="high"`.

Audit menyeluruh ke 48 `<img>` tag lain mengonfirmasi sisanya (thumbnail video YouTube, gambar chat dinamis) memang tepat menggunakan `lazy`.

### 4 Alt Text Kosong Diperbaiki

`Video-Pembelajaran.html` punya 4 thumbnail video dengan `alt=""` kosong meski ada `data-vtitle` yang bisa dipakai. Diisi dengan judul video yang sebenarnya untuk SEO dan screen reader.

### Test Suite Otomatis: `scripts/tests/`

Dibuat infrastruktur testing yang menjalankan **kode produksi asli** (`assets/platform.js`) di dalam Node `vm` sandbox dengan mock `localStorage`/`document`/`window` — bukan duplikasi logic yang bisa drift dari kode asli.

```
scripts/tests/
├── mock-dom.js        # localStorage mock in-memory
├── load-platform.js   # Loader: jalankan platform.js asli di Node vm sandbox
├── test-srs.js        # 13 test untuk algoritma SRS (SM-2)
├── test-xp.js          # 17 test untuk sistem XP/Level
└── run-all.js          # Test runner: discover & jalankan semua suite
```

**Hasil:** 30/30 test passed. Selama proses penulisan test, **3 bug nyata ditemukan dan diperbaiki langsung** (2 di SRS, 1 di XP) — termasuk satu bug di fix saya sendiri (`null` edge case) yang baru ketahuan setelah test dijalankan, bukan dari review manual.

```bash
node scripts/tests/run-all.js
```

### Integrasi ke Validator & CI

- `scripts/validate.py` ditambah **3 check baru**: `global-deps` (cross-reference script loading), `env-consistency` (cross-reference nama variabel env.js), dan `unit-tests` (menjalankan test suite sebagai bagian dari validasi)
- `.github/workflows/validate.yml` dan `deploy.yml` ditambah step eksplisit `node scripts/tests/run-all.js`

### Status Akhir Validator

```
✅ PASSED (22/22 checks, termasuk 30 unit test)
⚠️  WARNINGS (0)
❌ ERRORS (0)
RESULT: PASSED
```

**Catatan metodologi:** Sesi ini menunjukkan nilai unit testing dibanding audit manual saja — bug SRS/XP yang ditemukan adalah bug *logic* tersembunyi di balik kode yang terlihat benar saat dibaca sekilas, dan baru ketahuan saat dijalankan dengan input edge-case sistematis (rating tidak valid, XP negatif, dll).

*Audit selesai 30 Juni 2026 — v27*

---

## Sesi 7 — Pembuatan 8 Halaman Materi Baru (v28)

### Halaman yang Ditambahkan

Berdasarkan audit kurikulum yang menemukan gap di level reading/listening bawah-atas dan tidak ada CBT/Mock khusus untuk N4/N5:

| Halaman | Isi | Soal |
|---------|-----|------|
| `Materi/Reading-N5.html` | Teks pendek (perkenalan, memo, pengumuman toko) · strategi reading N5 · tabel kosakata kunci | 6 quiz |
| `Materi/Reading-N4.html` | Email formal, pengumuman perubahan · pola kalimat N4 · strategi reading N4 | 6 quiz |
| `Materi/Listening-N1.html` | Dialog implisit/婉曲, tabel ekspresi tidak langsung, strategi統合理解 | 6 quiz |
| `Materi/Listening-N4.html` | Dialog sehari-hari (janji, memesan, arah) · 4 tipe soal N4 · tabel ekspresi kunci | 6 quiz |
| `Materi/JLPT-CBT-N5.html` | 30 soal N5 (文法/語彙) · timer 25 menit · skor otomatis · pembahasan lengkap BI | 30 soal |
| `Materi/JLPT-CBT-N4.html` | 30 soal N4 (文法/語彙/読解) · timer 35 menit · skor otomatis · pembahasan | 30 soal |
| `Materi/JLPT-Mock-N5.html` | 25 soal campuran N5 · timer 40 menit · simulasi ujian asli | 25 soal |
| `Materi/JLPT-Mock-N4.html` | 25 soal campuran N4 · timer 50 menit · simulasi ujian asli | 25 soal |

### Teknis
- Semua halaman menggunakan pola template yang konsisten dengan halaman yang sudah ada (Reading-N3, Listening-N3, JLPT-CBT-N1)
- CBT/Mock menggunakan generator Python reusable (`/tmp/gen_cbt.py`) dengan CSS tema warna berbeda per halaman untuk menghindari kesan duplikat
- Semua halaman divalidasi: JS valid, canonical benar, meta description unik, H1 ada, schema.org LD+JSON, 0 duplicate ID
- 8 shortcut baru ditambahkan ke `_redirects` (`/cbt-n4`, `/cbt-n5`, `/mock-n4`, dll)
- Link per-level (N1–N5) ditambahkan ke hub `Materi/Materi.html` untuk Listening dan Reading
- Sitemap: 237 → **245 URL**
- Halaman total: 240 → **248 halaman**
- Validator: **248/248 pages, 22/22 checks, 0 error, 0 warning**

### Distribusi Kurikulum Setelah Perbaikan

| Kategori | Sebelum | Sesudah |
|----------|---------|---------|
| Reading | N1, N2, N3 ✅ N4 ❌ N5 ❌ | **N1-N5 lengkap ✅** |
| Listening | N1 ❌ N2 ✅ N3 ✅ N4 ❌ N5 ✅ | **N1-N5 lengkap ✅** |
| JLPT CBT | N1, N2, N3 ✅ N4 ❌ N5 ❌ | **N1-N5 lengkap ✅** |
| JLPT Mock | N1, N2, N3 ✅ N4 ❌ N5 ❌ | **N1-N5 lengkap ✅** |

*Sesi 7 selesai 1 Juli 2026 — v28*
