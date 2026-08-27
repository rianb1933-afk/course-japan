# CI/CD Setup — NihongoPro

Project ini menggunakan GitHub Actions untuk validasi otomatis dan deploy.

## Workflow 1: `validate.yml` — Validasi Setiap Push/PR

Berjalan otomatis setiap kali ada push atau pull request ke branch `main`.
Menjalankan `scripts/validate.py` yang mengecek:

- Sintaks JS valid di semua file `.js`
- JSON config valid (manifest, vercel.json)
- Tidak ada broken internal link
- Domain konsisten (`nihongopro.id`) di semua canonical/og:url/sitemap
- Canonical URL cocok dengan nama file aslinya
- SEO dasar: meta description, title, H1, schema.org di semua halaman
- Tidak ada duplicate HTML id statis
- Aksesibilitas: alt text, lang attribute, form label
- Security: tidak ada API key hardcoded, tidak ada bypass premium via localStorage, tidak ada password admin hardcoded
- Tidak ada folder dengan nama berspasi
- Service worker pakai `allSettled` (resilient install)

**Tidak perlu setup apapun** — workflow ini jalan otomatis begitu repo di-push ke GitHub.

## Workflow 2: `deploy.yml` — Auto-Deploy ke Netlify

Berjalan otomatis setiap push ke `main`. Validasi (`validate.py`) jalan dulu sebagai gate —
jika ada error, deploy **tidak akan jalan**.

### Setup yang Diperlukan

1. Buat site di [Netlify](https://app.netlify.com) (drag & drop ZIP ini sekali untuk inisialisasi)
2. Ambil 2 nilai dari Netlify:
   - **NETLIFY_AUTH_TOKEN**: User Settings → Applications → Personal access tokens → New
   - **NETLIFY_SITE_ID**: Site Settings → General → Site details → Site ID
3. Di GitHub repo: Settings → Secrets and variables → Actions → New repository secret
   - Tambahkan `NETLIFY_AUTH_TOKEN`
   - Tambahkan `NETLIFY_SITE_ID`
4. Push ke `main` — deploy akan jalan otomatis

### Alur Kerja

```
git push origin main
        ↓
[validate.yml] jalan dulu — cek semua 11 kategori
        ↓ (jika lolos)
[deploy.yml] jalan — validasi lagi sebagai gate, lalu deploy ke Netlify
        ↓
Site live di nihongopro.id
```

### Tanpa GitHub (Manual Deploy)

Jika tidak pakai GitHub Actions, jalankan validasi manual sebelum deploy:

```bash
python3 scripts/validate.py
```

Jika output `RESULT: PASSED`, baru drag & drop ZIP ke Netlify/Vercel/Cloudflare Pages.

### Mode Strict

Untuk juga menggagalkan build jika ada warning (bukan cuma error):

```bash
python3 scripts/validate.py --strict
```

Berguna untuk era sebelum production-freeze, supaya warning kecil (seperti meta description pendek) tidak menumpuk.
