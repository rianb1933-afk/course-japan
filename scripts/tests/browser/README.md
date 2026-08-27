# Browser Tests (Playwright) — Kaigo Simulator

Test di folder ini butuh browser sungguhan (Chromium via Playwright) untuk
menguji DOM, klik, keyboard, dan localStorage secara nyata — beda dari
`scripts/tests/test-*.js` (unit test murni logic, tanpa browser).

## Kenapa terpisah dari `npm test`

Playwright + Chromium binary (~300MB) sengaja **tidak** dijadikan dependency
default proyek ini. Menambahkannya ke `package.json`/`npm ci` akan memperberat
dan memperlambat SETIAP install & CI run untuk seluruh proyek (337 halaman),
padahal hanya `Kaigo-Simulator.html` yang butuh test level ini sejauh ini.

## Cara menjalankan (manual, lokal)

```bash
# Sekali saja, jika Playwright belum ada di lingkungan Anda:
npm install -D playwright
npx playwright install chromium

# Jalankan test:
npm run test:kaigo-browser
# atau langsung:
node scripts/tests/browser/test-kaigo-simulator.js
```

Jika Chromium terinstal di path non-default, set env var:
```bash
CHROMIUM_PATH=/path/ke/chrome node scripts/tests/browser/test-kaigo-simulator.js
```

Smoke test payment dan sertifikat:
```bash
npm run test:payment-certificate-browser
```

Test ini memeriksa QR verification `?id=` tanpa konfigurasi Supabase serta
memastikan halaman payment menahan checkout ketika user belum login.

## Yang diuji (20 skenario, sesuai spesifikasi v185 Fase 14)

Script ini membuka `Kaigo-Simulator.html` lewat server HTTP lokal
(`python3 -m http.server`, dijalankan otomatis oleh script) dan menjalankan
kode produksi asli — bukan mock/simulasi logic terpisah. Mencakup:

- Inisialisasi dengan/tanpa `window.NP`, termasuk saat `NP.State.getUser()` throw
- Render skenario gratis + ikon yang benar
- Alur jawab pertanyaan (skor benar/salah, double-click tercegah)
- Next/Retry/Home navigasi
- Kegagalan XP/progress tidak menghentikan gameplay
- localStorage corrupt tidak merusak halaman
- Navigasi platform opsional tidak tersedia tidak merusak halaman
- Premium lock berperilaku benar
- Versi cache service worker ter-update
- 0 uncaught exception di alur lengkap 3 skenario gratis

## Manual verification tambahan (di luar otomatis)

Untuk verifikasi manual lebih lanjut sesuai spesifikasi Fase 15 (viewport
mobile, screen reader sungguhan, profil browser lama dengan cache basi),
buka langsung:

```bash
python3 -m http.server 8000
# lalu buka http://localhost:8000/Kaigo-Simulator.html di browser sungguhan
```

Uji manual tambahan yang direkomendasikan:
- DevTools → Network → set throttling/offline untuk simulasi `platform.min.js` gagal load
- DevTools → Application → Storage → set localStorage jadi string tidak valid
- DevTools → Application → Service Workers → unregister lalu register ulang untuk uji cache versi baru
- Resize viewport ke 320px, 375px, 430px, 768px, 1024px, 1440px
- Navigasi murni keyboard (Tab, Enter, Space) tanpa mouse sama sekali
