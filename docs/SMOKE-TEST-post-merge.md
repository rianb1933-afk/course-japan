# Smoke Test Pasca-Merge — `threejs-unify-and-lazy-load` (17 commit, ?v=6)

> Jalankan setelah: (1) merge PR, (2) deploy Netlify hijau, (3) **`supabase-schema.sql` sudah dijalankan ulang** di SQL Editor.
> Estimasi total: ±20 menit. Tandai ✅/❌/— (tidak berlaku) di tiap butir.
> Ganti `https://nihongopro.id` sesuai domain produksi. Uji di **Chrome desktop + HP** (viewport 390px).

---

## 0. Prasyarat (semua harus ✅ sebelum mulai)

- [ ] Merge selesai; `main` sudah berisi commit puncak `126781d`
- [ ] Deploy Netlify hijau (di Netlify → Deploys, build tidak error)
- [ ] `supabase-schema.sql` sudah di-Run di SQL Editor dan hasilnya "Success"
- [ ] Browser uji: hard refresh dulu (Cmd+Shift+R) ATAU DevTools → Application → Service Workers → **Unregister** + Clear storage, supaya tidak menguji cache lama

---

## 1. Three.js — halaman anatomi (commit `f6b1cbf`)

**Target:** 3D viewer tetap muncul, tapi library (~2,2 MB) hanya terunduh saat tab Anatomi dibuka.

- [ ] Buka `https://nihongopro.id/Materi/Sistem-Kardiovaskular.html` dengan DevTools → tab **Network**, filter `three`
- [ ] **Saat halaman baru dibuka** (belum klik tab): **NOL** permintaan `three*.js` / `GLTFLoader` / `OrbitControls` dari jsDelivr ❗ (dulu: langsung terunduh)
- [ ] Klik tab **Anatomi** → sekarang `three.module.js` (0.180.0) + addons terunduh, viewer 3D muncul dan bisa dirotasi
- [ ] Buka halaman anatomi **kedua** (mis. `Sistem-Endokrin.html`) → klik tab Anatomi → three.js **tidak terunduh ulang** (cache HTTP hit — URL sama karena satu konstan `THREE_VERSION = 0.180.0`)
- [ ] Uji satu halaman anatomi di **HP** (390px): viewer tetap interaktif, tidak overflow horizontal
- [ ] Render halaman bebas error konsol: DevTools → Console bersih dari error merah

**Kalau gagal:** kemungkinan listener klik tab/observer tidak saling menggantikan — periksa konsol untuk `initXxx3D is not defined` (fungsi harus diekspos ke `window`).

---

## 2. Cache-buster & service worker (commit `04da08e`, `4e4f94d`)

**Target:** semua aset bertanda `?v=6`, SW cache-first tetap sehat.

- [ ] Buka beranda; DevTools → Network → muat ulang → semua CSS/JS bertanda versi memakai **`?v=6`** (bukan v=4/v=5/date-stamp): `kyoto-navbar.min.js?v=6`, `pro-style.css?v=6`, dst.
- [ ] **Muat ulang ke-2**: aset bertanda `?v=6` transferSize = 0 (di-serve cache SW) dan tetap 0 error
- [ ] DevTools → Application → Cache Storage: hanya **satu** cache, `eduma-kaigo-v363`; tidak ada cache `eduma-kaigo-v*` basi tersisa
- [ ] Cek 1 permintaan CSV: `vocab-all.csv?v=6` → 200
- [ ] Navigator.serviceWorker.controller != null (SW aktif mengendalikan halaman)

---

## 3. Grup kelas & token (`d92a764`, `d85317e`, `b5e4435`, `4e4f94d`, `3862b81`, `e6cac6f`)

**Target:** alur pengajar → token → pelajar berfungsi; arsip menolak token.

**3a. Navbar**
- [ ] Desktop: bar atas memuat **組 Grup** antara 試 Ujian dan 庭 Dasbor — klik langsung ke `Grup-Kelas.html` tanpa buka dropdown
- [ ] Platform dropdown tidak memuat duplikat Grup (Dashboard Guru masih ada di sana)
- [ ] Mobile drawer (390px): Grup + Dashboard Guru keduanya ada; spasi antar item rapi (semua `<li>` terpisah)

**3b. Alur pengajar (akun ber-peran `teacher` di `user_roles`)**
- [ ] Masuk → `Grup-Kelas.html` → buat grup "Pelajar N5 — Smoke Test" (level N5)
- [ ] Terbitkan token: keterangan "smoke", batas 1, berlaku 1 hari → token muncul **sekali**, format `N5-XXXXX-XXXXX`, salin berhasil
- [ ] Tabel token menampilkan: Terpakai 0/1, status **Aktif**, tombol Cabut
- [ ] Terbitkan token kedua dengan batas 999 → server menjepit ke **500** (cek `max_uses` di kolom tabel tidak lebih dari 500)

**3c. Alur pelajar (akun lain / incognito)**
- [ ] Tukar token → "Berhasil bergabung ke grup …" → grup muncul di "Grup saya"
- [ ] Tukar token yang sama lagi → "Anda memang sudah anggota …" **tanpa** menghabiskan kuota (Terpakai tetap 1/1)
- [ ] Token huruf kecil + tanda hubung acak (`n5-7k2m9-qxa4b`) → tetap diterima

**3d. Arsip (verifikasi b5e4435 di database)**
- [ ] SQL Editor: `UPDATE classrooms SET archived = true WHERE name = 'Pelajar N5 — Smoke Test';`
- [ ] Pelajar coba tukar token yang belum terpakai dari grup itu → pesan **"Grup untuk token ini sudah ditutup."** (410 TOKEN_ARCHIVED) — bukan "Token tidak dikenal"
- [ ] Token tak dikenal acak (`N5-ZZZZZ-ZZZZZ`) → tetap "Token tidak dikenal…" (404)

**3e. Teacher-Dashboard**
- [ ] `Dashboard/Dashboard-Guru.html` (dari Platform menu): menampilkan statistik nyata, bukan fixture demo — nama kelas, jumlah siswa, status aktif
- [ ] Panel "Kode Gabung" sudah jadi tautan ke Grup & Token (bukan menampilkan `join_code` mati)

---

## 4. XP kelas live — alur log-id (`c5a01ad`, `5a74e20`)

**Target:** sesi kelas live menghasilkan baris `user_xp_log` ber-flag `xp_applied=true` dan `user_progress.xp` bertambah.

**Siapkan dua jendela:** SQL Editor (untuk memantau) + tab kelas.

- [ ] **Sebelum kelas**, catat XP awal pengguna uji:
  ```sql
  SELECT user_id, xp FROM user_progress WHERE user_id = '<uuid-pengguna-uji>';
  ```
- [ ] Masuk sebagai pengguna uji (bukan demo) → `Kelas-Online.html` → buat/join room → kumpulkan XP (ikut kuis, dsb.) → keluar kelas dengan tombol Keluar
- [ ] Console halaman (sebelum reload): ada **"XP kelas live tercatat (log #N)"** — bukan hanya fallback lokal
- [ ] SQL Editor:
  ```sql
  SELECT id, xp_earned, source, xp_applied, created_at
  FROM user_xp_log WHERE user_id = '<uuid>' ORDER BY created_at DESC LIMIT 3;
  -- baris terbaru: source = 'live_session', xp_applied = t
  SELECT xp FROM user_progress WHERE user_id = '<uuid>';
  -- xp = XP awal + xp_earned baris tadi
  ```
- [ ] **Path anti-manipulasi** (verifikasi server-side, opsional tapi penting): dari konsol halaman yang sudah login,
  ```js
  SupabaseClient.DB.recordLiveXP('<uuid-anda>', 9999, {test:1})
  ```
  → log tercatat dengan 9999, TAPI jumlah yang masuk ke `user_progress.xp` tetap **dibaca server dari baris log** — RPC `apply_user_xp` tidak menerima angka dari klien. (Jalur ini benar: log 9999 tercatat, xp bertambah 9999 via log itu sendiri — yang tidak mungkin adalah mengarang XP **tanpa** jejak log.)
- [ ] Uji **tanpa login** (incognito): ikut kelas → keluar → console hanya "tidak dikirim ke Supabase: belum masuk", tidak ada error merah; XP tetap tercatat lokal (profil naik)
- [ ] Hapus baris uji: `DELETE FROM user_xp_log WHERE session_data->>'test' = '1';`

**Kalau `xp_applied` tetap `false` setelah kelas:** RPC gagal di tengah — jalankan backfill:
```sql
-- aman dijalankan kapan saja; hanya menyentuh baris xp_applied=false
WITH backlog AS (SELECT user_id, SUM(xp_earned) xp_total FROM user_xp_log
                 WHERE xp_applied=false AND xp_earned<>0 AND source='live_session' GROUP BY user_id),
ditandai AS (UPDATE user_xp_log SET xp_applied=true
             WHERE xp_applied=false AND xp_earned<>0 AND source='live_session' RETURNING user_id)
INSERT INTO user_progress (user_id, xp) SELECT b.user_id, GREATEST(b.xp_total,0) FROM backlog b
WHERE EXISTS (SELECT 1 FROM ditandai d WHERE d.user_id=b.user_id)
ON CONFLICT (user_id) DO UPDATE SET xp=COALESCE(user_progress.xp,0)+EXCLUDED.xp, updated_at=NOW();
```

---

## 5. Admin & AI chat (`02b11db`, `8abb373`, `04b3c83`)

- [ ] `Admin-Login.html` di produksi: form login **berfungsi** (POST ke `/api/admin-login`); akun admin masuk ke `Admin-Dashboard.html`
- [ ] Sebagai pelajar biasa: command palette (⌘K / Ctrl+K) **tidak** menampilkan "Admin Login"/"CMS Admin"; dock tidak punya tab Admin — setelah login admin, keduanya muncul kembali
- [ ] AI chat (homepage / AI Tools): kirim pesan → jawaban mengalir; jika hanya kunci gratis yang dipasang (Gemini/Groq/OpenRouter), tetap terjawab; tanpa kunci apa pun → pesan ramah, bukan error 500
- [ ] Hero homepage di HP 390px: **headline + deskripsi + tombol CTA terlihat di layar pertama**; tidak ada widget floating menutupi tombol; teks tidak "melompat" saat efek typing berjalan

---

## 6. UX lain (`acddf5d`, `04f20ba`, `126781d`)

- [ ] Homepage di HP: tabel hiragana bisa **discroll horizontal** sampai kolom terakhir; **ん terlihat dan tersentuh** (dulu 9 kana terpotong); halaman tetap tidak scroll sideways
- [ ] Navbar desktop: jarak antar item konsisten (1px), semua kontrol setinggi 36px, tidak ada item kembar
- [ ] Halaman dengan login demo (mis. `Teacher-Dashboard` di localhost/file://): pesan demo mengarahkan langkah yang jelas (commit `126781d`)

---

## 7. Lulus / gagal

**Lulus bila:** semua butir yang berlaku ✅, dan **tidak ada satu pun** temuan berikut:
- error konsol merah di halaman utama yang diuji
- permintaan aset `?v=` lama (v≤5 / date-stamp) di halaman baru
- `user_xp_log` tidak bertambah setelah kelas live dengan login
- token grup arsip masih bisa mendaftarkan orang

**Satu temuan ❌ =** catat URL + langkah reproduksi + screenshot, balik ke branch dan perbaiki sebelum umumkan fitur.
