# Roadmap Konsolidasi — NihongoPro Academy

**Diperbarui:** 27 Agustus 2026
**Metodologi:** setiap klaim di bawah diverifikasi ulang langsung terhadap kode/data pada tanggal di atas (grep, baca file, hitung isi JSON) — bukan disalin mentah dari `ANALISIS-KEKURANGAN.md` atau `ROADMAP-PENGEMBANGAN.md`. Kedua dokumen itu sebagian sudah usang (lihat catatan v179 di `ANALISIS-KEKURANGAN.md`); dokumen ini menggantikannya sebagai sumber prioritas yang berlaku sekarang. `CHANGELOG.md` (373 halaman, 200+ entri versi) tetap jadi arsip riwayat detail — dokumen ini hanya meringkas **apa yang masih perlu dikerjakan**.

---

## Ringkasan eksekutif

Proyek ini jauh lebih matang dari yang tercatat di kedua dokumen lama. Area yang sudah selesai sejak dokumen itu ditulis: halaman verifikasi sertifikat, pembahasan JLPT mendalam, 100/100 modul Kaigo, sinkronisasi riwayat ujian, RLS Supabase, serta audit keamanan backend penuh (Fase FF–HH) dan hardening Kelas Online sistematis (v293–v322: kick/moderasi, kebocoran skor, XSS, rate-limit bypass, dll). LiveKit juga sudah tersambung ke alur kelas nyata (bukan cuma fondasi seperti yang tertulis di roadmap lama).

Yang tersisa terkonsentrasi di 3 area: **konfigurasi dari pemilik situs** (PeerJS/LiveKit/Midtrans), **rollout yang belum merata** (dark mode, moderasi LiveKit), dan **konten yang masih tipis** (Kaiwa, ilustrasi Kaigo).

---

## 🔴 Prioritas tinggi

- [x] **Nomor WhatsApp `Kontak.html` tidak konsisten dengan halaman lain** — sudah diperbaiki ke `6281297225557` (dikonfirmasi pemilik proyek: `62818000000` memang salah).
- [ ] **`roomAdmin` LiveKit di-hardcode `false`.** Ditemukan celah eskalasi hak akses di `netlify/functions/livekit-token.js` (client bisa klaim `isHost` tanpa verifikasi) — sudah dimitigasi dengan menonaktifkan grant admin sepenuhnya, tapi ini berarti **moderasi (mute/kick) via jalur LiveKit belum berfungsi** sampai verifikasi kepemilikan room yang aman dibangun. Prioritas tinggi begitu LiveKit mulai dipakai produksi (lihat item konfigurasi di bawah).

## 🟡 Prioritas sedang

- [x] **6 halaman yang dicatat "tidak punya dark mode sama sekali"** — diperiksa satu-per-satu, ternyata beragam, bukan satu masalah tunggal: `Papan-Tulis.html` genuinely sudah lengkap & benar (kanvas gambar sengaja tetap putih, itu bukan bug). `Analytics.html`/`Kanji-Trainer.html`/`Speaking-AI.html` sudah punya dark mode fungsional penuh sejak awal — cuma tombol toggle-nya punya bug (aria-label auto-generate rusak + ikon tidak pernah berganti 🌙/☀️), sudah diperbaiki. `Teacher-Dashboard.html` sudah memuat CSS dark mode tapi belum punya script+tombol toggle, ditambahkan (pakai `kyoto-theme.js`, BUKAN `kyoto-navbar.js` — skrip itu memaksa injeksi navbar publik penuh dan akan merusak header dashboard). `Landing-Page/landing.html` satu-satunya yang genuinely nol dark mode dari awal — dibangun baru (variabel `[data-dark]` + toggle), memakai palet warna sama dengan Analytics/Kanji-Trainer/Speaking-AI. Diverifikasi Playwright + screenshot per halaman, `validate.py` PASSED di setiap commit.
- [x] **Modul Kaiwa (percakapan umum) diperluas 6 → 10** (v94): tambah Rumah Sakit, Konbini, Tempat Kerja, Janji Temu. Masih jauh dari 100 modul Kaigo — bisa dilanjutkan lagi kalau perlu, tapi kesenjangan paling mencolok sudah dikurangi. Sekaligus ditemukan & diperbaiki bug: 6 modul Kaiwa lama salah tampil di preview share Facebook/Twitter (leftover metadata "Quiz Kaigo Level N2" dari template kloning).
- [ ] **CSS inline terduplikasi di mayoritas halaman** — belum direfactor jadi komponen bersama. Ini akar masalah kenapa rollout seperti dark mode harus disebar halaman-per-halaman, bukan sekali jalan.

## 🟢 Prioritas rendah / opsional

- [ ] **0 dari 100 modul Kaigo punya ilustrasi/gambar** — semua teks + audio.
- [ ] **Hanya 1 modul Kaigo punya simulasi dialog interaktif** (sisanya kuis pilihan ganda).
- [ ] **Tidak ada email transaksional pembayaran** (struk/invoice setelah bayar Midtrans). Auth (daftar/lupa password) sudah ditangani Supabase otomatis — ini spesifik konfirmasi pembayaran.
- [ ] **Push notification PWA minim** — perlu dibangun lebih lengkap kalau mau reminder belajar harian.
- [ ] **Halaman besar tanpa code-splitting** (`Kelas-Online.html` ~360KB, `Materi.html` ~260KB, `Kelas-Online.html` di root ~446KB).

## Perlu konfigurasi/akun dari Anda (bukan tugas kode — infrastruktur sudah siap)

- [ ] **PeerJS host sendiri** (`PEERJS_HOST` masih kosong di `.env.example`) — kelas kecil (2-4 orang) masih bergantung server publik PeerJS yang tak andal. Panduan: `PANDUAN-KELAS-ONLINE-SERVER.md`.
- [ ] **Akun LiveKit** (`LIVEKIT_URL`/`API_KEY`/`SECRET`) — kode `Room.connect()` sudah terpasang dengan fallback ke PeerJS mesh, tapi belum pernah diuji dengan server LiveKit nyata. Setelah aktif, prioritas 🔴 di atas (perbaikan `roomAdmin`) harus dikerjakan sebelum kelas besar mengandalkan moderasi LiveKit.
- [ ] **Kredensial Midtrans produksi** (`MIDTRANS_SERVER_KEY`/`CLIENT_KEY`) — integrasi Snap + webhook sudah lengkap dan aman (harga divalidasi server-side, tidak ada bypass localStorage), tinggal isi kunci sandbox lalu produksi.

## Sudah selesai — jangan dikerjakan ulang

Diverifikasi ulang langsung hari ini, bukan disalin dari dokumen lama:

- ✅ **Verify.html ada dan berfungsi** — klaim lama "halaman verifikasi tidak ada" sudah usang.
- ✅ **Pembahasan JLPT mendalam: 265/277 soal (95.7%) ≥80 karakter**, rata-rata 165 karakter — bukan 38.6% seperti tercatat di `ANALISIS-KEKURANGAN.md`.
- ✅ **100/100 modul Kaigo ≥20 soal unik** (2015 soal total di bank).
- ✅ **Riwayat ujian sync ke Supabase** (`exam_history`) untuk user login.
- ✅ **RLS aktif** di seluruh tabel Supabase utama (21 tabel, 29 statement RLS, 48 policy di `supabase-schema.sql`).
- ✅ **Widget chatbot `pro-app.js`** (dipakai 62+ halaman) — sempat rusak total (format request salah + tanpa auth header) sejak backend memperketat validasi, sudah diperbaiki dan disinkronkan ke versi `.min.js`.
- ✅ **Audit keamanan backend penuh (Fase FF–HH)**: fondasi payment & admin auth solid, 1 XSS diperbaiki (`blog-cms.js`), 1 rate-limit bypass finansial diperbaiki (`ai-chat.js`).
- ✅ **Hardening Kelas Online sistematis (v293–v322)**: kebocoran skor antar-peserta, celah kick/moderasi, XSS di OSCE, notifikasi saling-menimpa, dan lebih dari 30 bug lain ditemukan & diperbaiki via audit fase-per-fase.

---

## Urutan pengerjaan yang disarankan

1. **Cek nomor WhatsApp `Kontak.html`** — cepat, mandiri, kemungkinan cuma butuh konfirmasi lalu 1 baris perubahan.
2. **Sebar dark mode ke lebih banyak halaman** — pola sudah terbukti aman di 51 halaman, tinggal lanjutkan bertahap.
3. **Perluas modul Kaiwa** (6 → target berapa banyak) — pola penulisan soal sudah terbukti dari 100 modul Kaigo, tinggal direplikasi untuk topik percakapan umum.
4. **Refactor CSS inline** — pekerjaan besar & berisiko, tapi jadi pembuka jalan untuk rollout desain (dark mode, dll) tanpa harus halaman-per-halaman.
5. **Konfigurasi dari Anda** (paralel, tidak perlu menunggu urutan di atas): PeerJS host → Midtrans production key → akun LiveKit, lalu perbaiki `roomAdmin` sebelum mengandalkan moderasi LiveKit di kelas besar.
