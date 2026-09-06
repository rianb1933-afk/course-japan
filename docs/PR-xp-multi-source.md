# Multi-source server-verified XP: log-id flow untuk semua sumber, mirror pusat, drift report

> **6 commit** · 16 berkas (+822/−27) · tip `54b6d1b` · gerbang hijau: **203/203 test (15 suite)**, `build:check` fresh, `validate.py` PASSED (2 warning pra-ada).
>
> ⚠️ **WAJIB setelah merge:** jalankan ulang seluruh `supabase-schema.sql` di SQL Editor. `apply_user_xp` versi baru menerima whitelist 8 sumber — schema lama akan menyimpan log kanji/kuis tapi tidak meng-apply-nya sampai schema dijalankan (barisnya aman sebagai backlog backfill, tidak hilang).

---

## Ringkasan

XP kelas live sudah punya jalur tervalidasi server (log-id): klien menyisipkan `user_xp_log`, lalu RPC `apply_user_xp` membaca jumlah XP dari baris log milik pemanggil — klien tidak bisa mengarang angka. Masalahnya, jalur itu hanya menerima `source = 'live_session'`, jadi XP dari kuis, kanji, SRS, dan semua fitur platform lain hidup hanya di localStorage tanpa jejak database, dan `Sync.push` menimpa `user_progress.xp` dengan angka absolut tiap 30 detik — membuat setiap push di antara "XP diberi" dan "RPC apply terkirim" menggandakan XP itu.

PR ini menggeneralisasi jalur log-id ke semua sumber, menutup celah dobel, dan menambahkan dua lapisan observability.

## Perubahan per tema

### 1. Whitelist sumber di skema (`329e717`)
`apply_user_xp` dan CTE backfill menerima `source IN ('live_session','kanji','quiz','kanji_quiz','srs','vocab','game','materi')` — whitelist, bukan bebas: kolom `source` disisipkan klien, tanpa daftar tetap klien bisa memanen apply berulang dengan sumber fiktif. Backfill kini menyapu SEMUA sumber sah, jadi log dari fitur mana pun yang RPC-nya gagal tetap pulih tanpa dobel.

### 2. `DB.recordXP` generik (`329e717`)
`assets/supabase-client.js` punya API generik dengan jaminan yang sama seperti jalur live: log insert dulu (`return=representation`), RPC hanya menerima `(p_user, p_log_id)`. `XP_SOURCES` di klien mencerminkan whitelist SQL; sumber ilegal ditolak sebelum satu pun panggilan jaringan (log yang tak akan pernah di-apply adalah sampah). `recordLiveXP` menjadi wrapper kompatibilitas.

### 3. Mirror NPXP + halaman (`329e717`)
`assets/np-xp.js` (award/recordQuiz/recordVocab) memirror tiap pemberian XP lokal ke `recordXP` — best-effort, tak pernah melempar; kategori fitur dipetakan `bucketOf()` ke bucket sah (kanji quiz → `kanji_quiz`, sisanya → `materi`). `Kanji-Writing.html` mirror langsung dengan metadata `{char, score}`; `QUIZ/nihongo-pro.html` memuat `supabase-client.js` yang selama ini hilang.

### 4. Anti-dobel + mirror pusat (`6247017`)
`Sync.push` **tidak lagi mengirim kolom `xp`** — XP remote kini hanya bertambah lewat `apply_user_xp`; kolom lain tetap tersinkron. Pendengar `np:xpAdded` yang terpusat mengirim semua pemberian platform tanpa jalur sendiri (timer belajar, achievement, JLPT-CBT, AI Tutor, Kaigo Simulator, sertifikat) sebagai `materi`. Pemberian yang sudah mengirim sendiri ditandai `opts.mirrored` (platform.js `addXP`; dipakai Kanji-Writing dan Kelas-Online). Satu pemberian XP = satu baris log.

### 5. Observability (`efa09bb`, `54b6d1b`)
- **`/api/xp-drift`** (admin-only, pola `verifyAdmin` bersama): drift per pengguna = `user_progress.xp − SUM(log.xp_applied)`. Drift positif = XP pra-log/penulisan manual (kini terlihat); drift negatif = baris menunggu backfill. Panel "Laporan Drift XP" di Admin-Dashboard.
- **Kartu "Sumber XP"** di SRS-Statistics: doughnut per bucket sumber, membaca ledger lokal `np-xp-sources-v1` dengan aturan bucket yang sama persis seperti mirror server — konsisten dengan kolom `source` tanpa membuat halaman offline-first ini bergantung pada Supabase.

### 6. Checklist smoke-test (`013db5b`, `81d8503`)
Bagian 4b `docs/SMOKE-TEST-post-merge.md`: peta sumber yang diharapkan per aktivitas, cek mirror pusat via timer 5 menit, asersi "satu pemberian = satu baris", uji sumber palsu, dan drill kegagalan (schema lama → re-run → backfill memulihkan).

## Test & verifikasi

- **14 test baru** di tiga suite: passthrough sumber + penolakan sumber ilegal (klien), bucket mapping + mirror diam tanpa sesi + isolasi error (NPXP), push tanpa kolom `xp` + pendengar pusat + skip `mirrored` (log-id), 5 test endpoint drift (401/403/405/501, matematika drift, email tak pernah bocor)
- Live: halaman kanji & quiz memuat API baru, jalur tanpa sesi no-op diam, tanpa error konsol

## Catatan deploy

1. **Urutan:** jalankan `supabase-schema.sql` → merge/deploy (atau di hari yang sama)
2. Cek backlog setelah schema: `SELECT count(*), SUM(xp_earned) FROM user_xp_log WHERE xp_applied = false;`
3. `netlify.toml` menambah redirect `/api/xp-drift` (fungsi tidak pernah terekspos otomatis)
4. Smoke test bagian 4 di `docs/SMOKE-TEST-post-merge.md`

## Checklist

- [ ] `supabase-schema.sql` dijalankan ulang di SQL Editor setelah merge
- [ ] Tulis 1 kanji di Kanji-Writing (login) → baris `source='kanji'`, `xp_applied=true`, **tanpa** baris kembar `materi`
- [ ] Timer belajar 5 menit → baris `source='materi'`
- [ ] `recordXP('<uuid>', 500, 'cheat_source')` dari konsol → `{ok:false, skipped:true}`, tanpa baris baru
- [ ] Admin: Laporan Drift XP memuat; XP profil ≈ jumlah log applied
