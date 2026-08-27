# Analisis Kekurangan NihonggoPro Academy

<!-- markdownlint-disable MD012 MD022 MD029 MD032 -->

*Dibuat: sesi audit menyeluruh setelah v133. Setiap poin diverifikasi langsung terhadap kode — bukan dugaan.*

> ⚠️ **CATATAN v179**: dokumen ini TIDAK diperbarui sejak entri terakhir (v155) dan sudah usang. Cross-check terhadap kode & CHANGELOG di v179 menemukan SEMUA 3 item 🔴 di bawah **sudah selesai**: JLPT pembahasan 100% (v158, terverifikasi ulang: 265/277 soal ≥80 karakter, rata-rata 165), WhatsApp asli aktif (v159), RLS 20/20 tabel (v176). Jangan percaya status ✅/❌ di bawah ini tanpa verifikasi ulang terhadap kode — lihat `CHANGELOG.md` v155 ke atas untuk status sebenar-benarnya per item.

Cara pakai dokumen ini: setiap kali sebuah poin dikerjakan, tandai ✅ dan catat versinya (lihat pola di `CHANGELOG.md`). Prioritas ditandai 🔴 (tinggi) 🟡 (sedang) 🟢 (rendah/opsional).

---

## A. Konten — yang nyata masih kurang

- [x] 🔴 **100/100 modul Kaigo kini ≥20 soal** (v93). Gap terakhir (12 modul) ternyata bukan konten kurang, tapi dedup teks-persis lintas-modul di `build_question_bank.py` yang membuang soal duplikat — diperbaiki dengan 13 soal baru unik + rebuild bank (2002→2015 soal).
- [ ] 🟡 **Hanya 6 modul Kaiwa (percakapan) umum bahasa Jepang.** Skill speaking/percakapan masih tipis dibanding grammar/kosakata/kanji yang sudah kuat.
- [ ] 🟢 **0 dari 100 modul Kaigo punya ilustrasi/gambar.** Semua teks + audio, tak ada visual pendukung (diagram postur, alat bantu, dll).
- [ ] 🟡 **Hanya 1 modul Kaigo punya simulasi dialog interaktif** (mayoritas format kuis pilihan ganda saja, bukan latihan percakapan situasional).

## B. Fitur sudah dibangun tapi belum tersambung penuh

- [ ] 🔴 **Halaman verifikasi sertifikat tidak ada.** QR code di sertifikat Ujian.html mengarah ke `/verify?id=...` — halaman itu **tidak ada**, jadi scan QR akan 404. Bug dari v125, belum diperbaiki.
- [ ] 🔴 **LiveKit (solusi performa Kelas Online) baru fondasi, belum disambung ke alur kelas nyata.** Modul client sudah ada (v132), tapi titik penyambungan (join room/call) belum diintegrasikan — butuh akun LiveKit + pengujian bertahap.
- [ ] 🟡 **Riwayat ujian hanya tersimpan di localStorage** (per-device/browser), belum sync ke Supabase `exam_history` meski tabelnya sudah ada. Siswa ganti HP = riwayat hilang.
- [ ] 🟡 **Dark mode baru aktif di 3 dari 335 halaman** (index, Dashboard, Ujian — pilot v128). CSS-nya sudah ada di hampir semua file, tinggal tombol toggle-nya belum disebar.

## C. Butuh konfigurasi dari Anda (bukan bug kode, infrastruktur sudah siap)

- [ ] 🔴 **Nomor WhatsApp di tombol kontak adalah placeholder palsu** (`6281234567890`) — di index.html & FAQ.html. Perlu nomor asli.
- [ ] 🔴 **Kelas Online pakai server PeerJS publik yang tak andal** (`PEERJS_HOST` kosong). Perlu deploy PeerServer sendiri (panduan sudah ada: `PANDUAN-KELAS-ONLINE-SERVER.md`).
- [ ] 🟡 **Sistem pembayaran (Midtrans) sudah lengkap tapi belum aktif** — perlu `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY` dari akun Midtrans Anda.
- [ ] 🟡 **LiveKit perlu akun** (`LIVEKIT_API_KEY`/`SECRET`/`URL`) sebelum fase penyambungan bisa diuji nyata.

## D. Teknis — belum dirapikan

- [ ] 🟡 **333 dari 335 halaman masih punya CSS inline terduplikasi** (total ~1,4 juta karakter). Ditemukan di audit v127, belum direfactor jadi komponen bersama — ini alasan kenapa perubahan desain (spt dark mode) harus disebar halaman-per-halaman alih-alih otomatis semua.
- [ ] 🟢 **15+ nilai breakpoint responsive berbeda** dipakai lintas file (belum distandarkan, walau sudah ada dokumentasi konvensi baru di `kyoto-design-system.css`).
- [ ] 🟢 **Beberapa halaman (Kelas-Online.html 366KB, Materi.html 260KB) cukup berat** — belum ada code-splitting/lazy-load untuk bagian yang jarang dipakai.

## E. Kemungkinan hilang sepenuhnya (perlu konfirmasi apakah memang dibutuhkan)

- [ ] 🟢 **Tidak ada email transaksional untuk pembayaran** (struk/invoice setelah bayar via Midtrans). Auth (daftar/lupa password) sudah aman karena ditangani Supabase otomatis — ini spesifik untuk konfirmasi pembayaran.
- [ ] 🟢 **Push notification PWA minim** (baru 2 referensi di kode) — kalau mau reminder belajar harian via notifikasi HP, ini perlu dibangun lebih lengkap.

## Yang SUDAH baik (agar tak dikira kurang)

✅ Privacy.html & Terms.html ada · ✅ Structured data JSON-LD di 334/335 halaman · ✅ Skip-link aksesibilitas 330/335 halaman · ✅ Google Analytics terpasang · ✅ Admin-Dashboard.html & Teacher-Dashboard.html ada · ✅ 1654 soal bank Kaigo + 277 JLPT, semua terverifikasi valid · ✅ Animasi ringan (scroll-reveal) sudah di semua 335 halaman.

---

## Rekomendasi urutan pengerjaan

1. **Halaman verifikasi sertifikat** (cepat, mandiri, dampak langsung ke fitur yang sudah dipakai)
2. **Batch lanjutan 29 modul Kaigo** (pola sudah terbukti, tinggal lanjut)
3. **Sync riwayat ujian ke Supabase** (memanfaatkan tabel yang sudah ada)
4. **Sebar dark mode ke lebih banyak halaman** (setelah pilot 3 halaman terbukti aman)
5. **Konfigurasi dari Anda**: WhatsApp, PeerJS host, lalu LiveKit/Midtrans kalau sudah siap pakai

---

## Audit lanjutan — 18 dimensi (brief CTO/Product besar)

*Verifikasi nyata terhadap klaim "sudah punya AI Sensei, AI Kaiwa, dll" — bukan diterima mentah.*

### ✅ Terverifikasi BENAR ada & berfungsi (bukan cuma UI kosong)

- **AI Sensei/Tutor**: arsitektur solid — `assets/nihongo-ai.js` → `/api/ai-chat` → Netlify function, support OpenAI (gpt-4o-mini) & Anthropic (claude-haiku), **ada fallback ke basis pengetahuan lokal** kalau API key belum di-set (pola sama seperti PeerJS/LiveKit/Midtrans — butuh konfigurasi Anda, bukan kode rusak)
- Grammar Checker, Kanji Trainer, Admin/Teacher Dashboard, Certificate-Pro, Pricing-Pro: semua ada dan nyata
- Tidak ada API key/secret yang ter-expose di kode (aman)

### ⚠️ KOREKSI: audit cakupan AI sebelumnya keliru

Klaim awal "AI cuma dipakai di 4 halaman" **salah** — pencarian hanya mencari referensi client `NihongoAI`, melewatkan halaman yang memanggil `/api/ai-chat` langsung (tanpa lewat client module tersebut). Setelah dicek ulang dengan pola lebih luas: **AI genuinely terintegrasi di 12 halaman** — termasuk fitur yang tak terduga seperti **AI handwriting recognition di Kanji-Trainer** (kirim gambar tulisan tangan ke Claude untuk feedback skor). Cakupan AI jauh lebih luas dari dugaan awal saya.

### 🔴 Fitur AI yang diminta brief — BELUM ADA sama sekali (perlu dibangun dari nol, bukan tempelan)

AI Weakness Detection, AI Study Planner, AI Speaking/Pronunciation Score, AI Writing Correction (di luar Grammar Checker dasar), AI OCR, AI Voice Conversation, AI Lesson Generator, AI Review Scheduler (spaced repetition otomatis), AI Career Advisor, AI Interview Simulator penuh. **Ini masing-masing proyek besar sendiri** — brief minta ~18 fitur AI sekaligus, tidak realistis dibangun bersamaan tanpa fabrikasi/kualitas rendah.

### Business model

Marketplace, Live 1-on-1 Tutor booking, Corporate Package, Affiliate/Referral program — **belum ada infrastrukturnya sama sekali** (beda dengan subscription Midtrans yang sudah lengkap tinggal konfigurasi).

### Struktur folder

Brief minta restrukturisasi total ke `components/layouts/pages/api/services/hooks` — ini pola **framework modern (React/Vue/Next.js)**. Proyek ini adalah **static HTML multi-halaman** (335 file) yang sudah punya sistemnya sendiri (kyoto-design-system, scripts/ generator, validate.py). Migrasi ke struktur framework adalah **rewrite total arsitektur**, bukan "rapikan folder" — risiko sangat tinggi mematahkan semua yang sudah teruji.


---

## Koreksi besar: "12 fitur AI belum ada" — SEBAGIAN SUDAH ADA


Klaim v138 (18-dimensi) yang bilang "AI Weakness Detection, AI Study Planner, dst belum ada sama sekali" **keliru**. `AI-Tutor-Pro.html` (dilewatkan dalam audit sebelumnya karena tidak masuk daftar halaman yang dicek detail) ternyata sudah berisi **8 tool AI berfungsi nyata** (panggil `/api/ai-chat` sungguhan, bukan UI kosong):

AI Study Planner, AI Lesson Generator, AI Grammar Checker, AI Speaking Coach, AI Writing Coach, AI Conversation Partner, AI JLPT Level Test, **AI Weakness Detection**.

Ini pola audit yang sama berulang (dark mode, deteksi kuis, cakupan AI 4→12 halaman) — saya harus SELALU verifikasi mendalam sebelum menyimpulkan sesuatu "belum ada". Perbaikan yang dilakukan: cross-link dari `AI-Sensei.html` (persona chat sederhana) ke `AI-Tutor-Pro.html` (suite 8-tool) supaya tool yang sudah ada lebih mudah ditemukan, bukan membangun ulang dari nol.


---

## Update analisis — status per v155 (setelah pembahasan Kaigo 100%)

### ✅ Selesai sejak analisis terakhir

- **Pembahasan Kaigo: 100% (2002/2002 soal)** — dari rata-rata 55 → 87 karakter, semua soal punya penjelasan mengajar (kenapa benar/salah/konteks nyata)
- **Sertifikat & verifikasi**: `Verify.html` + tabel `exam_certificates` terpisah dari sistem lama, method tak bentrok (setelah 2 ronde perbaikan bug)
- **Riwayat ujian sync ke server**: `saveExamHistory` tersambung untuk user login
- **Onboarding → Dashboard**: goal (Kaigo/JLPT/Percakapan/Kerja) kini memengaruhi CTA & sapaan Dashboard

### 🔴 Prioritas tinggi — belum dikerjakan

1. **Bank JLPT baru 38.6% pembahasan mendalam** (107/277) — 21 modul tersisa. Kaigo sudah 100%, JLPT jadi kesenjangan kualitas yang mencolok antar dua bank soal utama platform.
2. **334/336 halaman masih CSS inline terduplikasi** — angka ini nyaris tak berubah dari audit pertama kali (333/335), karena setiap perbaikan yang saya lakukan bersifat aditif/lokal, bukan refactor sistemik.
3. **Nomor WhatsApp masih placeholder palsu** (`6281234567890`) di index.html & FAQ.html — item ini disebutkan sejak analisis pertama, belum pernah ditindaklanjuti karena butuh nomor asli dari Anda.

### 🟡 Prioritas sedang — sengaja ditunda dengan alasan jelas

4. **Dark mode baru di 3/336 halaman** — rollout ditahan sampai ada bukti pola aman di skala lebih besar (keputusan sadar, bukan lupa).
5. **LiveKit fondasi ada, belum tersambung** (`NPLiveKit.connect` dipanggil 0 kali di Kelas-Online.html) — masih menunggu akun LiveKit nyata dari Anda untuk fase pengujian.
6. **4 halaman AI belum digabung**, baru cross-link — konsolidasi penuh perlu pengujian manual tiap tool yang saya tak bisa lakukan tanpa browser nyata.

### Kesimpulan pola kerja sesi ini

Pekerjaan paling matang dan tuntas: **konten Kaigo** (via siklus tulis→validasi→gate→pack yang konsisten 20 kali berturut-turut). Pekerjaan paling tertunda: **refactor teknis skala besar** (CSS/dark mode/LiveKit) karena secara sadar saya prioritaskan yang aman & terverifikasi di atas yang besar & berisiko.

