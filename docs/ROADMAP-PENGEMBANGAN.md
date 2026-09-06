# Roadmap Pengembangan NihongoPro — 5 Target

**Tanggal:** 16 Juli 2026
**Basis:** build v86 (302 halaman, validator PASSED)

Dokumen ini menandai apa yang **sudah dikerjakan** di build ini vs apa yang
**butuh server** (harus Anda deploy sendiri).

---

## ✅ Target 2 — AI Tutor Personal (SELESAI di build ini)

**Sebelum:** rekomendasi generik — "Perkuat Grammar N5" → satu URL kategori.

**Sesudah:** rekomendasi menunjuk **materi konkret** dari kategori terlemah,
memilih materi yang belum dikerjakan.

**File diubah:**
- `assets/dashboard-catalog-v86.js` — ditambah `items`: daftar 39 materi
  spesifik per level+kategori (mis. N3 grammar → `Grammar-N3-Lanjut.html`,
  `Grammar-N3-Review.html`, `Grammar-N3.html`)
- `assets/dashboard-v86.js` — `buildRecommendations()` memilih materi konkret
  dari `items`, melewati yang sudah dikerjakan

**Cara kerja:** dashboard menghitung persentase progres tiap kategori di level
target → kategori terendah jadi "kelemahan" → rekomendasi menunjuk materi
spesifik pertama yang belum diselesaikan di kategori itu.

**Pengembangan lanjutan (opsional):**
- Bobot per sub-topik, bukan hanya kategori (butuh tracking per-materi lebih detail)
- Rekomendasi berbasis akurasi kuis, bukan hanya "sudah dibuka/belum"

---

## ✅ Target 3 — Dashboard Analitik Real-Time (SELESAI di build ini)

**Sebelum:** dashboard murni localStorage — progres hilang jika ganti perangkat.

**Sesudah:** adapter sync Supabase, **offline-first**. localStorage tetap sumber
utama; bila pengguna login, setiap perubahan data ditandai untuk disinkronkan
ke Supabase (di-debounce). Bila Supabase tidak tersedia → tetap jalan offline,
tanpa crash.

**File diubah:**
- `assets/dashboard-v86.js` — `writeJSON()` memanggil `SupabaseClient.Sync.markDirty()`
  saat login, dibungkus try/catch berlapis

**Sudah teruji:** dashboard load tanpa crash baik dengan maupun tanpa Supabase.

**Yang perlu Anda siapkan agar sync aktif:**
1. Tabel Supabase untuk progress (lihat `supabase-schema.sql` bila ada)
2. Aktifkan realtime replication di Supabase dashboard
3. Env vars `SUPABASE_URL` + `SUPABASE_ANON_KEY` (sudah ada di `netlify.toml`)

**Pengembangan lanjutan:**
- Realtime subscription (bukan hanya push) agar progres muncul lintas-tab langsung
- Grafik tren mingguan/bulanan dari `activityLog`

---

## ✅ Target 4 — Optimasi Performa (SUDAH BAIK — tidak perlu perubahan besar)

**Temuan:** situs ini **sudah dioptimasi dengan baik** oleh pengembang sebelumnya:
- Gambar sudah `loading="lazy"`
- `index.html` sudah punya 4 `preconnect` untuk font/CDN
- Script non-kritis sudah `defer`

**Yang TIDAK diubah (dan alasannya):**
- `env.js` + `supabase-client.js` blocking di `<head>` — ini **disengaja dan benar**:
  `supabase-client.js` membaca `EDUMA_ENV` dari `env.js`, dan script lain
  bergantung pada auth. Menambah `defer` akan memutus urutan dependency dan
  merusak login. **Tidak ada quick win yang aman di sini.**

**Kalau ingin optimasi lebih jauh (butuh restrukturisasi):**
- Halaman terbesar: `Kelas-Online.html` (360 KB), `Materi.html` (260 KB)
- Pertimbangkan: split CSS kritis vs non-kritis, bundling dengan tree-shaking,
  konversi gambar ke WebP/AVIF, HTTP/2 push via Netlify headers

---

## ✅ Target 1 — Live Classroom SFU (INTEGRASI SELESAI, BUTUH SERVER)

**Kondisi sekarang:** jalur LiveKit sudah terintegrasi secara opt-in ke
`Kelas-Online.html`. Jika `LIVEKIT_URL` tersedia, kelas mencoba memakai SFU;
jika tidak tersedia atau koneksi gagal, sistem kembali ke PeerJS mesh.

Yang masih dibutuhkan untuk produksi adalah deploy dan uji server LiveKit,
TURN, serta kamera/mikrofon nyata. PeerJS tetap dipertahankan sebagai fallback
untuk kelas kecil.

**Batas nyata mesh:**

| Peserta | Koneksi P2P | Upload per orang |
|---:|---:|---|
| 2 | 1 | 1 stream |
| 4 | 6 | 3 stream |
| 6 | 15 | 5 stream |
| 8 | 28 | 7 stream (~7 Mbps) |
| 10 | 45 | 9 stream |

Di atas ~4-5 peserta, upload bandwidth tiap orang meledak. **Ini sebabnya butuh SFU**
(Selective Forwarding Unit): tiap peserta upload **1 stream** ke server, server
mendistribusikan.

**Opsi SFU (pilih satu, deploy sendiri):**

1. **LiveKit** (rekomendasi — open source, Cloud tersedia)
   - Deploy: LiveKit Cloud (gratis untuk mulai) atau self-host via Docker
   - Client SDK: `livekit-client` (npm)
  - Adapter `Room.connect()` sudah tersedia melalui `assets/live/live-livekit.js`

2. **mediasoup** (paling fleksibel, butuh Node server sendiri)
   - Kontrol penuh, tapi setup lebih kompleks

3. **Jitsi Videobridge** (paling cepat jalan, kurang fleksibel)

**Langkah migrasi (garis besar):**
```
1. Deploy LiveKit server → dapat WS_URL + API key
2. Tambah env: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
3. Buat netlify/functions/livekit-token.js → generate JWT peserta
4. Di Kelas-Online.html: ganti PeerJS mesh dengan LiveKit Room
5. Pertahankan UI grid kamera yang sudah ada (.video-grid)
```

**Yang tersisa setelah server siap:** uji end-to-end, tuning reconnect dan
permission, lalu tetapkan batas peserta berdasarkan hasil beban nyata.

---

## ✅ Target 5 — Payment Gateway (INTEGRASI SELESAI, BUTUH API KEY)

**Kondisi sekarang:** `Pricing-Pro.html` sudah memanggil endpoint Midtrans
Snap, dan webhook server sudah memvalidasi notifikasi sebelum mengaktifkan
status premium. Tanpa API key, tombol menampilkan status layanan belum aktif
dan tidak memberikan premium palsu.

**Opsi gateway (untuk pasar Indonesia):**

1. **Midtrans** (rekomendasi — lokal, populer, dukung QRIS/GoPay/VA/kartu)
   - Snap.js untuk frontend popup
   - Butuh Server Key (rahasia, HANYA di Netlify function)

2. **Xendit** (alternatif kuat, dukung e-wallet lengkap)

3. **Stripe** (kalau target internasional)

**Arsitektur aman (WAJIB):**
```
Frontend (Premium.html)
    ↓ minta transaksi
netlify/functions/create-payment.js   ← Server Key DI SINI (jangan di frontend!)
    ↓ panggil Midtrans API
Midtrans → kembalikan Snap token
    ↓
Frontend buka Snap popup → user bayar
    ↓
netlify/functions/payment-webhook.js  ← Midtrans notif → update status premium di Supabase
```

**Env vars yang perlu Anda siapkan:**
- `MIDTRANS_SERVER_KEY` (rahasia — hanya di function)
- `MIDTRANS_CLIENT_KEY` (boleh di frontend)

**PENTING keamanan:** status premium **tidak boleh** hanya dari localStorage
(validator proyek ini sudah cek itu). Harus divalidasi server-side via webhook →
Supabase. Build ini sudah lolos cek `security-premium-bypass`.

**Yang tersisa setelah Anda punya akun Midtrans:** uji sandbox, konfigurasi
notification URL, uji refund/pembayaran gagal, lalu pindah ke production key.

---

## Ringkasan

| Target | Status | Perlu dari Anda |
|---|---|---|
| AI Tutor personal | ✅ Selesai | — |
| Dashboard real-time | ✅ Selesai (adapter) | Aktifkan tabel + realtime Supabase |
| Optimasi performa | ✅ Sudah baik | — |
| Live Classroom SFU | ✅ Terintegrasi | Deploy dan uji LiveKit |
| Payment gateway | ✅ Terintegrasi | Akun Midtrans + API key |

**Dua target terakhir sudah memiliki integrasi kode dan fallback yang aman.**
Yang tersisa adalah konfigurasi infrastruktur dan pengujian production dengan
akun serta kredensial pemilik situs.

---

# LANJUTAN (v88) — Kerangka Server Siap-Pakai

## ✅ Realtime lintas-tab (SELESAI, tanpa server)

`assets/dashboard-v86.js` kini mendengarkan `storage` event — menyelesaikan
kuis di satu tab langsung memperbarui dashboard di tab lain. Juga siap menerima
`np:progressSynced` dari Supabase Sync. Ter-debounce 400ms, dibungkus try/catch.

## 🔧 Payment gateway — kerangka siap, tinggal isi API key

**File baru:**
- `netlify/functions/create-payment.js` — buat transaksi Midtrans Snap
- `netlify/functions/payment-webhook.js` — terima notifikasi, verifikasi
  signature sha512, tandai premium di Supabase

**Yang perlu Anda lakukan:**
1. Daftar Midtrans (sandbox dulu): dashboard.sandbox.midtrans.com
2. Set env di Netlify: `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION=false`
3. Set Payment Notification URL di Midtrans → `https://situs-anda/api/payment-webhook`
4. Di frontend Premium.html, muat Snap.js dan panggil `/api/create-payment`,
   lalu `snap.pay(token)`. (Saya bisa buatkan integrasi frontend ini kapan saja.)

**Keamanan sudah benar:** Server Key hanya di function, harga divalidasi
server-side (klien tak bisa palsukan), premium hanya via webhook terverifikasi.

## 🔧 Live Classroom SFU — kerangka siap, tinggal deploy LiveKit

**File baru:**
- `netlify/functions/livekit-token.js` — generate JWT peserta untuk LiveKit

**Yang perlu Anda lakukan:**
1. Deploy LiveKit (LiveKit Cloud gratis untuk mulai: cloud.livekit.io)
2. Set env: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`
3. `npm install livekit-server-sdk` untuk functions
4. Di Kelas-Online.html, ganti blok `new Peer(...)` dengan LiveKit `Room.connect()`
   memakai token dari `/api/livekit-token`. UI grid kamera (.video-grid) tetap
   dipakai. (Saya bisa tulis adapter ini setelah LiveKit Anda live.)

**Catatan:** PeerJS mesh yang sekarang TETAP dipertahankan dan berfungsi untuk
kelas kecil (2-4 orang). LiveKit untuk kelas besar — bisa berdampingan.

---

# LANJUTAN (v89) — Payment frontend LIVE + keamanan

## ✅ Payment gateway frontend (SELESAI — tinggal isi API key)

`Pricing-Pro.html` sekarang memakai Midtrans sungguhan:
- Snap.js dimuat dinamis dari `MIDTRANS_CLIENT_KEY` (env.js)
- `processPayment()` memanggil `/api/create-payment`, buka Snap popup
- Bila belum dikonfigurasi (503) → pesan jujur "belum aktif", TIDAK memberi premium

**BUG KEAMANAN yang diperbaiki:** `processPayment()` lama adalah "Demo Mode"
yang langsung menandai `isPremium: true` di frontend tanpa bayar — siapa pun
bisa jadi premium via DevTools. Sudah dihapus.

**Env vars baru (placeholder di env.js, isi di Netlify):**
- `MIDTRANS_CLIENT_KEY` (frontend, boleh publik)
- `MIDTRANS_IS_PRODUCTION` (default false = sandbox)
- `MIDTRANS_SERVER_KEY` (RAHASIA — hanya di function, jangan di env.js)

**Uji cepat:** daftar sandbox Midtrans, isi CLIENT_KEY + SERVER_KEY, buka
Pricing-Pro.html → klik Upgrade → Snap popup muncul → bayar dengan kartu tes
Midtrans. Webhook menandai premium di Supabase.

## 🔧 Live Classroom SFU — SENGAJA belum disuntik ke Kelas-Online.html

**Keputusan teknis:** `Kelas-Online.html` (360 KB) memakai PeerJS mesh yang
matang dan BERFUNGSI. LiveKit punya model koneksi sangat berbeda (Room/Track vs
Peer/call). Menyuntik adapter yang belum bisa diuji (LiveKit belum di-deploy)
berisiko merusak fitur yang sekarang jalan.

**Titik integrasi persis (saat LiveKit siap):**
- Baris ~1343 `const p = new Peer(id, PEER_CONFIG)` — ini titik masuk koneksi
- `participants[]`, `conns{}` — state peserta, perlu dipetakan ke LiveKit `Room.participants`
- `.video-grid` / `#videoGrid` — UI dipertahankan, hanya sumber stream berubah
- Kontrol mic/cam/kick — dari `conn.send()` ke LiveKit `localParticipant.setMicrophoneEnabled()` dll

**Rencana:** `livekit-token.js` sudah siap. Begitu LiveKit di-deploy dan
env terisi, saya tulis adapter yang: coba LiveKit dulu, fallback ke PeerJS mesh
bila SFU tidak tersedia — sehingga kelas kecil tetap jalan P2P, kelas besar
pakai SFU. Diuji sungguhan sebelum menggantikan alur yang ada.
