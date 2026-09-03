# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ringkasan

Situs statis multi-halaman (388 file `.html`, tanpa framework/bundler untuk HTML) — platform belajar bahasa Jepang, Kaigo, dan persiapan kerja di Jepang. JavaScript vanilla, di-share lewat `assets/`. Backend hanya berupa serverless function untuk AI chat, payment, CMS, dan token live class.

Bahasa komentar & dokumentasi di repo ini: **Indonesia**. Ikuti gaya itu saat menambah komentar.

## Perintah

```bash
npm test                    # unit test (scripts/tests/test-*.js) — memuat assets/platform.js asli via vm
npm run build               # regenerasi semua assets/*.min.js dan *.min.css dari sumbernya
npm run build:check         # gagal (exit 1) bila ada .min yang basi — dipakai validator
npm run validate            # site validator, ~50 check; ini GERBANG DEPLOY
python3 scripts/validate.py --strict   # warning ikut menggagalkan
npm run test:min            # ulangi unit test terhadap platform.min.js (jalankan SESUDAH npm run build)
npm run release -- "Judul" "bullet 1" "bullet 2"   # bump versi + tulis CHANGELOG (lihat "Rilis")
npm run release:dry -- "Judul"                     # pratinjau tanpa menulis
```

Menjalankan satu suite unit test: `node -e "require('./scripts/tests/test-srs.js').tests.forEach(t=>t.fn())"` — `run-all.js` hanya menemukan file `scripts/tests/test-*.js` yang mengekspor `{ tests: [{name, fn}] }`.

Browser test (Playwright) sengaja **di luar** `npm test` supaya `npm ci`/CI tidak menarik Chromium ~300 MB:

```bash
npm install -D playwright && npx playwright install chromium   # sekali saja
npm run test:kaigo-browser
npm run test:payment-certificate-browser
```

## Arsitektur

### Anatomi halaman

Setiap halaman memuat aset bersama langsung lewat tag `<script>`/`<link>` — tidak ada import/bundling. Aset yang hampir universal: `kyoto-bundle.min.css`, `kyoto-navbar.min.js`, `kyoto-theme.js`, `env.js`, `supabase-client.js`, `analytics-loader.js`, `anime-theme.js`. Potongan `<head>`/footer/`<tail>` kanonis ada di `scripts/templates/*.tpl` — ubah template itu juga bila mengubah blok yang tersebar di banyak halaman.

Karena perubahan sering menyentuh ratusan halaman sekaligus, repo ini memakai **codemod**: `scripts/*.py` dan `scripts/*.js` (mis. `codemod_footer.py`, `fix-skip-link.js`, `upgrade-kaigo-v5.js`). Untuk edit lintas-halaman, tulis script semacam itu, jangan edit manual satu per satu.

### `assets/platform.js` — inti runtime

Modul IIFE yang mengekspor namespace `State`, `XP`, `SRS`, `AI`, `Toast`, `Theme`, `Nav`, `Achievements`, `Timer`. Persistensi di `localStorage`: `np-state-v3` (profil/XP/streak/progress) dan `np-srs-v2` (SM-2 flashcard).

Dua aturan penting:

- **Halaman hanya memuat `platform.min.js`** (242 halaman), tidak pernah sumbernya. Jangan pernah mengedit file `.min.*` — file itu dibangun `scripts/build-assets.mjs`. Edit sumbernya, lalu `npm run build`. Validator punya check `build_freshness` yang menangkap drift.
- **Status premium jangan dipercaya dari localStorage.** `u.isPremium` bisa diubah lewat DevTools. Gunakan `verifiedPremium()` yang membaca `user_metadata.is_premium` dari session Supabase; penegakan sebenarnya tetap server-side.

Namespace `localStorage` di repo ini campur (`np-*`, `nihongo*`, `eduma-*`) karena warisan; pakai prefiks `np-` untuk key baru.

### Konfigurasi environment

`assets/env.js` membangun `window.EDUMA_ENV` dengan membaca `window[KEY]` yang di-inject hosting, lalu fallback ke `localStorage` untuk dev lokal. Semua kunci client-side berprefiks `EDUMA_`; kunci tanpa prefiks (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_KEY`) **server-side saja**. Daftar lengkap + cara isi ada di komentar kepala `netlify.toml` dan `docs/SETUP-KUNCI-API.md`. Validator punya check `env_variable_consistency` — menambah var baru berarti menyentuh keduanya.

### Serverless — dua target hosting paralel

- `netlify/functions/*.js` — jalur utama (ai-chat, create-payment, payment-webhook, livekit-token, admin-login, blog-cms, jlpt-cms).
- `api/ai-chat.js` — varian Vercel dari fungsi AI saja.

Netlify **tidak** otomatis mengekspos `/api/<nama>`. Setiap function baru wajib punya entri `[[redirects]]` eksplisit di `netlify.toml`, kalau tidak akan 404 di production.

`ai-chat` adalah abstraksi multi-provider (Anthropic → OpenAI → Gemini, auto-fallback) dengan rate limit `free: 10/hari` vs `premium: 500/hari`, disimpan di memori atau Supabase bila `SUPABASE_SERVICE_KEY` tersedia.

### Service worker

**`sw.js` adalah yang aktif** — didaftarkan 272 halaman, cache `eduma-kaigo-vN`. `service-worker.js` warisan lama, hanya disebut dari `assets/pro-app.js`.

`PRECACHE` di `sw.js` sengaja dibatasi pada kerangka aplikasi; fetch handler bersifat cache-first dan menyimpan setiap respons same-origin, jadi halaman yang pernah dibuka tetap offline-capable. Menambah entri precache membebani setiap pengguna baru — validator menegakkan `precache_budget`.

Update diterapkan otomatis (`SKIP_WAITING` + reload ±1,5 detik + toast), tanpa dialog `confirm`.

### Konten & data

- `Materi/`, `QUIZ/`, `Dashboard/`, `Landing-Page/` — halaman konten.
- `seed/*.json` — bank soal yang dibaca frontend (`Ujian.html`). `seed/*.sql` tidak pernah dibaca frontend.
- `assets/cbt-bank.json`, `assets/vocab-all.csv`, `assets/srs-curated.js`, `assets/materi-data.js` — dataset bersama; masing-masing punya check validator sendiri (`kanji_bank`, `cbt_bank`, `vocab_csv_columns`, `kaigo_seed_sync`).
- Generator konten: `scripts/build_*.py`, `scripts/deepen_*.py`, `scripts/merge-*.js`.

### Tema

Beberapa tema hidup berdampingan: `kyoto-*` (design system utama), plus `anime-`, `neko-`, `tokyo-`, `zen-theme.css`. Dark mode lewat `assets/dark-mode-toggle.js` (`window.NPDark`) yang `platform.js` deteksi bila dimuat lebih dulu. Validator menolak warna abu-abu literal tanpa varian gelap (`literal_grey_without_dark_variant`) dan `background` literal berpasangan token warna (`literal_bg_with_token_color`) — pakai token design system, bukan hex mentah.

## Alur deploy

`.github/workflows/deploy.yml` (push ke `main`): `npm ci` → `run-all.js` → `validate.py` → `prune-publish.sh` → Netlify.

`publish-dir` adalah `.` — **seluruh isi repo terunggah ke CDN publik**. `scripts/prune-publish.sh` yang membuang `scripts/`, `docs/`, `.github/`, semua `*.md`, `supabase-schema.sql`, dan `seed/*.sql` (~4,3 MB) sebelum upload, dengan jaring pengaman yang menggagalkan deploy bila masih ada sisa. Script itu dijalankan dari salinan `/tmp` karena ia menghapus `scripts/` di tengah eksekusi. Konsekuensi praktis: **jangan pernah mereferensikan file `.md`/`.sql`/`.py` dari HTML atau JS runtime** — file itu tidak ada di production. (Itu sebabnya `Changelog.html` membaca `assets/changelog-releases.json`, bukan `CHANGELOG.md`.)

CSP terduplikasi di `netlify.toml` dan `vercel.json` — ubah keduanya bersamaan. `Kelas-Online.html` punya override CSP sendiri (WebRTC/mediastream).

## Rilis & versioning

Nomor versi proyek = **nomor cache service worker** (`eduma-kaigo-vN` di `sw.js`), saat ini v335. `npm run release` melakukan satu alur atomik: bump `sw.js` → sisipkan entri `## vN — judul` di puncak `CHANGELOG.md` → perbarui meta `np-latest-version` di `Changelog.html` → regenerasi `assets/changelog-releases.json` (40 rilis terakhir). Jangan bump `sw.js` manual.

## Sebelum commit

`python3 scripts/validate.py` adalah gerbangnya, dan ia relatif mahal (~memindai 388 halaman). Jalankan minimal `npm test` + `npm run build:check` untuk iterasi cepat, dan `validate.py` sebelum push.
