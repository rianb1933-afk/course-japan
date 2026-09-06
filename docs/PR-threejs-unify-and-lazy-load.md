# threejs-unify-and-lazy-load → main

15 commit · **411 berkas diubah, +4.718/−1.279** · gerbang lolos: `npm test` **189/189** (14 suite) · `build:check` bersih · `validate.py` **PASSED, 0 error**

> ⚠️ **Wajib dilakukan setelah merge (sekali jalan):** jalankan ulang seluruh `supabase-schema.sql` di Supabase SQL Editor. Berkas sekarang aman dijalankan ulang — semua `CREATE POLICY` dibungkus `DO $$ … EXCEPTION WHEN duplicate_object`, jadi cukup paste → Run. Eksekusi itu sekaligus menutup lubang RLS lama, menerapkan RPC penukaran token yang diperbaiki, dan menjalankan backfill XP.

---

## Ringkasan per tema

### 1. Three.js disatukan & lazy-load (`f6b1cbf`)
Sepuluh halaman anatomi mem-pinning `three@0.164.1` sementara satu sudah di `0.180.0` — URL berbeda = entri cache HTTP berbeda, jadi pengunjung mengunduh seluruh library dua kali saat berpindah halaman. Semua disatukan ke **0.180.0** (versi yang sudah terbukti dengan OrbitControls + GLTFLoader) dan **di-lazy-load di belakang tab Anatomi**: ~2,2 MB (~408 KB brotli) tidak lagi terunduh saat halaman dibuka, hanya saat viewer 3D benar-benar diminta. Pemicunya dua jalur: klik tab adalah jalur UTAMA (elemen di panel non-aktif berdimensi 0×0 sehingga IntersectionObserver tidak akan pernah menyala), observer hanya cadangan.

### 2. Cache-buster satu konstan (`04da08e`, `4e4f94d`)
Seluruh stamp `?v=` (957 URL di 385+ berkas) kini berasal dari satu konstan `ASSET_VERSION` di `scripts/align-asset-versions.py` — naik ke **5** lalu **6** saat navbar berubah. Sekalian memperbaiki bug laten regex yang memakan titik ekstensi (`min.css` → `mincss`) pada pass penulisan ulang nyata.

### 3. Grup kelas & token undangan (`d92a764`, `d85317e`, `b5e4435`)
Sistem grup per level (N5–N1, Kaigo, pengajar) dengan token undangan yang bisa dicabut, berkuota (`max_uses` 1–500), dan berbatas waktu (0–365 hari):
- Token disimpan **hanya sebagai SHA-256**; plaintext ditampilkan sekali saat diterbitkan; alfabet tanpa 0/O/1/I/L karena token diketik ulang manusia
- **Perbaikan keamanan RLS:** policy lama `FOR ALL USING (student_id = auth.uid())` pada `enrollments` memungkinkan siapa pun yang login mendaftarkan diri ke grup mana pun tanpa token — diganti; satu-satunya jalan masuk adalah RPC `redeem_group_token` via service role
- RPC dibuat **SECURITY INVOKER** dengan `search_path` dipatok dan `EXECUTE` dicabut dari `PUBLIC`/`anon`/`authenticated` (versi pertama SECURITY DEFINER tanpa REVOKE membatalkan seluruh penjagaan: siapa pun bisa mendaftarkan orang lain & melewati batas 30 percobaan/IP)
- Penukaran **atomik** (satu `UPDATE` berkondisi — dua permintaan bersamaan tidak bisa memakai kuota terakhir dua kali); peran dibaca dari `user_roles` di server, bukan body request
- **Grup terarsip kini menolak token** (`TOKEN_ARCHIVED` 410 dengan pesan jujur, dibedakan dari token tak dikenal via probe baca-saja)
- UI: `Grup-Kelas.html` + naik ke menu navbar tingkat atas (組 Grup); Teacher-Dashboard tersambung ke data nyata via `class-overview`/`create-assignment` (progres siswa sengaja lewat server, `email` tidak pernah dikirim ke klien)

### 4. XP kelas live: alur log-id tervalidasi server (`c5a01ad`, `5a74e20`)
Ditemukan saat audit: `Kelas-Online.html` **tidak pernah memuat `supabase-client.js`** dan membaca `window.NP.db` yang tidak ada — `saveSessionXP` selama ini kode mati yang diam-diam jatuh ke localStorage. Rantainya kini utuh:
- `DB.recordLiveXP`: insert `user_xp_log` dulu (`Prefer: return=representation` → id baris), lalu RPC `apply_user_xp(p_user, p_log_id)` — **jumlah XP dibaca server dari baris log milik pemanggil**, bukan diterima sebagai argumen (klien tidak bisa mengarang angka)
- **`add_user_xp` lama merujuk kolom `total_xp` yang tidak ada** → setiap panggilan gagal diam-diam di belakang `.catch(()=>{})`; diperbaiki ke kolom `xp`
- Skema jadi **re-runnable**: 49 `CREATE POLICY` dibungkus `DO $$ … duplicate_object`; penanda `xp_applied` + CTE backfill **idempoten** mengembalikan XP yang hilang tanpa dobel saat dijalankan ulang; `apply_user_xp` menandai baris lewat helper `SECURITY DEFINER` terbatas (UPDATE langsung adalah no-op karena tabel audit sengaja deny-all)
- Uji baru `test-live-xp.js` (6 kasus): urutan panggilan, bentuk header, larangan argumen jumlah XP, fallback representasi, kedua jalur kegagalan

### 5. Admin: bisa masuk, tidak terpampang (`02b11db`, `8abb373`)
`Admin-Login.html` membaca `window.NIHONGO_ADMIN_LOGIN_ENDPOINT` yang tidak pernah di-set siapa pun → login admin tidak bisa berhasil sama sekali di produksi; kini default `/api/admin-login`. Sebaliknya tiga pintu admin di UI siswa (tab dock, palette ⌘K, pencarian) disembunyikan tanpa sesi admin — penyembunyian tautan bukan kontrol akses, gate sesungguhnya tetap server-side.

### 6. Perbaikan UX nyata (`04b3c83`, `acddf5d`, `04f20ba`, `3862b81`)
- **Hero homepage mobile**: headline terdorong 184 px di bawah lipatan layar oleh gambar maskot (`order:-1`); teks kini di depan, widget floating dikumpulkan ke rel kanan (AI Chat pill menutupi tombol CTA), tinggi efek typing dikunci (pergeseran 76 px → ≤2 px)
- **AI chat punya jalur gratis**: provider `groq` + `openrouter` ditambahkan di samping `gemini` (bertingkat gratis), nama model & kuota dapat dikonfigurasi env (`GEMINI_MODEL`, `AI_FREE_DAILY`, …) karena provider rutin memensiunkan nama model; dijaga `test-ai-providers.js` tanpa kunci sungguhan
- **Tabel hiragana mobile**: 9 kana (ざ…ぞ, ば…ぼ, ん) terpotong tak bisa dijangkau — grid `1fr` mengikuti konten; kini scroll horizontal dalam kontainernya, semua 125 sel dapat disentuh (target 44 px); kontras label JST diperbaiki (3,03:1 → lolos AA) — audit mentah sempat melaporkan 13 "kegagalan", 12 di antaranya palsu saat diukur terhadap piksel yang benar-benar dirender
- **Navbar**: spasi 1px diratakan (tiga tautan berbagi satu `<li>` — gap flex tidak bekerja), tinggi komponen disatukan ke 36px, Grup naik ke bar utama

## Catatan deploy & operasional
- **Supabase:** jalankan ulang `supabase-schema.sql` (wajib — lihat peringatan di atas). Cek backlog backfill: `SELECT count(*), SUM(xp_earned) FROM user_xp_log WHERE xp_applied = false;`
- **Cache-buster:** konstan kini di `ASSET_VERSION = 6` (`scripts/align-asset-versions.py`); perubahan konten aset berikutnya cukup naikkan konstan itu + `npm run build`
- **Kelas-Online XP**: jalur baru membutuhkan sesi login (SupabaseClient.Auth); tanpa sesi XP tetap tercatat lokal seperti sebelumnya

## Test plan
- [ ] `npm test` → 189/189 · `npm run build:check` · `python3 scripts/validate.py`
- [ ] Jalankan ulang `supabase-schema.sql` di Supabase → Success, dan cek `prosrc` dari `redeem_group_token` mengandung `archived`
- [ ] Grup: buat grup → terbitkan token → arsipkan grup → tukar token dengan akun lain → 410 TOKEN_ARCHIVED
- [ ] XP kelas live: masuk, ikuti kelas, keluar → baris baru di `user_xp_log` (xp_applied=true) dan `user_progress.xp` bertambah
- [ ] Halaman anatomi: buka tanpa membuka tab Anatomi → tidak ada permintaan three.js di Network; buka tab → loader 0.180.0 sekali
- [ ] Mobile 390px: hero menampilkan headline + CTA tanpa tertutup widget; tabel hiragana bisa discroll sampai ん

🤖 Generated with Codebuff
