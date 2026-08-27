# Panduan Deploy dan Domain Nihongo Pro Academy

Web ini sudah siap online sebagai static website. Pilihan termudah: Netlify atau Vercel.

## Opsi Domain

Saya sarankan pilih salah satu nama berikut, lalu cek ketersediaannya di registrar seperti Niagahoster, Rumahweb, Namecheap, Cloudflare Registrar, atau Google Domains/Squarespace:

- `nihongopro-riyan.com`
- `nihongopro.id`
- `belajarnihongo.id`
- `riyansensei.com`
- `jlptpro.id`

Catatan: saya tidak bisa membeli domain dari sini karena pembelian domain membutuhkan akun, pembayaran, dan akses DNS milik kamu.

## Deploy Cepat Netlify

1. Buka Netlify dan login.
2. Pilih `Add new site`.
3. Pilih `Deploy manually`.
4. Upload seluruh folder `web-neko-eduma-theme` atau ZIP terbaru.
5. Netlify akan memberi domain gratis seperti:
   `https://nama-site.netlify.app`
6. Buka `Site configuration` -> `Domain management`.
7. Tambahkan custom domain yang sudah kamu beli.
8. Ikuti instruksi DNS dari Netlify.

DNS umum untuk Netlify:

```text
Type: CNAME
Name: www
Value: your-site.netlify.app
```

Untuk root domain, gunakan nameserver Netlify atau A record yang Netlify berikan di dashboard.

## Deploy Cepat Vercel

1. Buka Vercel dan login.
2. Pilih `Add New Project`.
3. Upload/import folder website.
4. Framework preset: `Other`.
5. Build command kosong.
6. Output directory: `.`
7. Deploy.
8. Masuk `Settings` -> `Domains`, lalu tambahkan domain custom.

DNS umum untuk Vercel:

```text
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Root domain biasanya memakai A record:

```text
Type: A
Name: @
Value: 76.76.21.21
```

## Deploy Cloudflare Pages

1. Login Cloudflare.
2. Pages -> Create project.
3. Upload folder/ZIP.
4. Build command kosong.
5. Output directory: `/`
6. Tambahkan custom domain dari menu Pages.
7. Cloudflare otomatis memberi HTTPS.

## HTTPS

Netlify, Vercel, dan Cloudflare Pages otomatis memberi HTTPS gratis. Setelah domain aktif, cek:

- `https://domainmu.com` terbuka.
- PWA bisa install.
- `service-worker.js` tidak error.
- Halaman `/offline.html` tersedia.

## Mengaktifkan AI Sungguhan

Website ini sudah punya fallback AI lokal. Untuk jawaban dari model AI sungguhan, jangan taruh API key di JavaScript frontend. Pakai environment variable di hosting:

```text
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
AI_FREE_DAILY_LIMIT=10
```

Opsional untuk rate limit serverless yang konsisten antar instance:

```text
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Endpoint yang dipakai frontend:

- Vercel: `/api/ai-chat`
- Netlify: `/api/ai-chat` yang diarahkan ke `/.netlify/functions/ai-chat`

Setelah deploy, buka halaman `Platform-Features.html`, klik `Test AI`, atau buka tombol `AI Chat` dan kirim pertanyaan.

## Setelah Domain Aktif

Domain default di metadata proyek ini memakai `https://nihongopro.id`. Jika kamu memakai domain lain, ganti domain tersebut di:

- `robots.txt`
- `sitemap.xml`
- tag canonical/OG URL di halaman HTML jika ingin SEO memakai domain final.
- `manifest.webmanifest` jika ingin `start_url` memakai domain absolut.

## Catatan Penting

- Admin login saat ini masih demo/localStorage, bukan backend production auth.
- Materi utama sekarang terbuka gratis. Billing hanya diperlukan jika ingin menambahkan kelas live, donasi, corporate training, atau layanan opsional lain.
- Built-in AI bisa jalan lokal, tapi API AI sungguhan perlu backend proxy agar API key tidak bocor di browser.

## Mengaktifkan Auth, Billing Opsional, Analytics

Frontend sudah siap membaca konfigurasi production tanpa menyimpan secret di repo:

- Auth: set `window.NIHONGO_FIREBASE_CONFIG = {...}` sebelum `assets/pro-app.js`/script auth dimuat agar login/register memakai Firebase Auth dan JWT. LocalStorage hanya fallback demo lokal.
- Billing opsional: jika ingin menerima donasi atau pembayaran kelas live, set endpoint server sendiri seperti `window.NIHONGO_CHECKOUT_ENDPOINT = "/api/create-checkout"`. Endpoint backend harus membuat transaksi Midtrans/Stripe dan memverifikasi webhook sebelum mengaktifkan layanan opsional.
- Analytics: tambahkan script Plausible/GA4 di `<head>` hosting production sesuai domain. Jangan masukkan API secret analytics ke frontend.
