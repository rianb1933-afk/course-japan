# Mengaktifkan fitur yang butuh kunci API

Sebagian fitur situs ini tidak bisa dihidupkan dengan menambah data. Fitur itu
memanggil layanan luar, dan tanpa kredensial ia akan diam atau membalas galat —
berapa pun soal, kosakata, atau materi yang ditambahkan.

Dokumen ini menyebut variabel apa yang harus diisi, di mana mengambilnya, dan
**cara membuktikan tiap fitur benar-benar hidup**. Semua yang tertulis di sini
diverifikasi langsung terhadap kode di repo ini, bukan dari ingatan.

`netlify.toml` juga memuat catatan environment variable. Dokumen ini melengkapinya
pada satu hal yang tidak dibahas di sana: **mana yang boleh sampai ke browser dan
mana yang tidak.**

---

## Aturan paling penting: dua tempat yang berbeda

Ada dua jenis variabel di proyek ini, dan mencampurnya adalah kesalahan yang mahal.

**Rahasia — hanya boleh di server.** Dibaca oleh `netlify/functions/*.js` lewat
`process.env`. Tidak pernah dikirim ke browser.

| Variabel | Untuk |
|---|---|
| `ANTHROPIC_API_KEY` atau `OPENAI_API_KEY` | semua fitur AI |
| `SUPABASE_SERVICE_KEY` | rate limit, CMS, verifikasi peran |
| `LIVEKIT_API_SECRET` | kelas live |
| `MIDTRANS_SERVER_KEY` | pembayaran |

**Publik — memang dilihat browser.** Dibaca `assets/env.js`, harus berawalan
`EDUMA_` supaya jelas bahwa ia publik.

| Variabel | Catatan |
|---|---|
| `EDUMA_SUPABASE_URL` | URL proyek, bukan rahasia |
| `EDUMA_SUPABASE_ANON_KEY` | kunci *anon* memang dirancang untuk publik — keamanannya dari Row Level Security, bukan dari kerahasiaan |
| `EDUMA_GA_MEASUREMENT_ID` | ID Google Analytics |
| `LIVEKIT_URL`, `TURN_URL*` | alamat server, bukan kredensial |

> **Jangan pernah menaruh `ANTHROPIC_API_KEY` atau `OPENAI_API_KEY` di
> `localStorage`, atau membuatnya jadi `window.ANTHROPIC_API_KEY`.**
>
> `assets/env.js` membacanya dari `window[...] || localStorage`, dan
> `Kelas-Online.html` punya jalur cadangan yang memanggil api.anthropic.com
> **langsung dari browser** dengan header `anthropic-dangerous-direct-browser-access`.
> Jalur itu **tidak aktif secara default** — penjaganya melihat
> `EDUMA_AI_API_ENDPOINT`, yang bawaannya `/api/ai-chat` dan mengandung `/api/`,
> sehingga selalu lewat proxy server. Tapi kalau endpoint itu diubah ke alamat
> tanpa `/api/`, jalur langsung menyala dan kunci Anda ikut terkirim ke setiap
> pengunjung. Kunci yang bocor bisa dipakai siapa saja atas tagihan Anda.
>
> Biarkan `EDUMA_AI_API_ENDPOINT` kosong (default `/api/ai-chat`) kecuali Anda
> tahu persis sedang mengubah apa.

---

## 1. Fitur AI

**Yang mati tanpa ini:** AI Sensei, AI Tutor Pro, AI Kaiwa, AI Writing Practice,
Grammar Checker, Speaking AI Coach, dan asisten chat di Community, Analytics,
Kanji Trainer, Kelas Online.

**Isi salah satu saja sudah cukup:**

```
# Berbayar (ditagih per token)
ANTHROPIC_API_KEY  = sk-ant-api03-...     # console.anthropic.com
OPENAI_API_KEY     = sk-...               # platform.openai.com

# Bertingkat GRATIS — kunci diperoleh tanpa biaya & tanpa kartu kredit
GEMINI_API_KEY     = AI...                # aistudio.google.com
GROQ_API_KEY       = gsk_...              # console.groq.com
OPENROUTER_API_KEY = sk-or-...            # openrouter.ai/keys
```

Kelimanya opsional satu sama lain — `netlify/functions/ai-chat.js` memakai
kunci mana pun yang ada.

### Menjalankan fitur AI tanpa biaya

Tiga penyedia terakhir punya tingkat gratis yang tidak meminta kartu kredit.
**Isi salah satunya saja** dan seluruh fitur AI situs hidup: halaman mengirim
`provider = 'openai'` secara default, dan fungsi ini jatuh ke penyedia mana pun
yang kuncinya terpasang.

Perlu jujur soal batasnya: "gratis" berarti **tidak ditagih**, bukan **tanpa
akun**. Ketiganya tetap meminta pendaftaran untuk menerbitkan kunci, dan
masing-masing punya kuota permintaan per menit/hari sendiri. Tidak ada cara
menjalankan model bahasa tanpa kunci sama sekali.

### Mengganti model tanpa menyentuh kode

Penyedia rutin memensiunkan nama model. Setiap penyedia punya variabel
opsional untuk menimpa modelnya, jadi nama yang pensiun cukup diganti di
dasbor hosting:

```
OPENAI_MODEL       = gpt-4o-mini
GEMINI_MODEL       = gemini-2.0-flash
GROQ_MODEL         = llama-3.3-70b-versatile
OPENROUTER_MODEL   = meta-llama/llama-3.3-70b-instruct:free
```

### Menaikkan kuota pemakaian

Batas bawaan sengaja konservatif karena dibuat untuk penyedia berbayar:
**10 permintaan/hari** untuk pengguna gratis, 500 untuk premium. Pada penyedia
bertingkat gratis biaya per permintaan nol, jadi batas itu bisa dilonggarkan:

```
AI_FREE_DAILY      = 100
AI_FREE_PER_MIN    = 5
AI_PREMIUM_DAILY   = 1000
AI_PREMIUM_PER_MIN = 20
```

Nilai bawaannya tidak diubah — menaikkan kuota adalah keputusan biaya dan
risiko penyalahgunaan milik pemilik situs.

> Sebelum perbaikan di commit ini, ia tidak begitu. Request default-nya
> `provider = 'openai'` dan tidak ada satu halaman pun yang mengirim provider
> lain, jadi siapa pun yang mengikuti `netlify.toml` — yang menyebut
> `ANTHROPIC_API_KEY` sebagai kunci utama — mengisi kunci Anthropic dengan
> benar, lalu setiap fitur AI tetap membalas `501 API key untuk openai belum
> dikonfigurasi`. Kunci benar, dokumentasi benar, hasilnya tetap mati.

**Cara menguji:**

```bash
curl -s -X POST https://SITUS-ANDA.netlify.app/api/ai-chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"halo"}]}' | head -c 300
```

| Yang muncul | Artinya |
|---|---|
| `{"text":"...","provider":"anthropic"}` | hidup — `provider` menyebut yang benar-benar dipakai |
| `501` + `NO_API_KEY` | belum ada kunci sama sekali |
| `401` | kunci terpasang tapi ditolak penyedia — salah ketik atau sudah dicabut |
| `429` / `RATE_LIMITED` | jalan, cuma kena batas harian |

**Batas pemakaian** (`netlify/functions/ai-chat.js`): gratis 10/hari dan 3/menit,
premium 500/hari dan 20/menit. Tanpa Supabase, hitungannya disimpan di memori
dan hilang tiap fungsi dingin — batasnya jadi longgar, bukan ketat.

---

## 2. Akun, progres, dan CMS — Supabase

**Yang mati tanpa ini:** login, sinkronisasi progres antar-perangkat, dasbor
admin, CMS blog & soal JLPT, dan rate limit AI yang benar-benar persisten.

```
SUPABASE_URL            = https://xxxx.supabase.co
SUPABASE_ANON_KEY       = eyJ...
SUPABASE_SERVICE_KEY    = eyJ...        # RAHASIA — melewati semua RLS

EDUMA_SUPABASE_URL      = https://xxxx.supabase.co    # sama, untuk browser
EDUMA_SUPABASE_ANON_KEY = eyJ...                      # sama, untuk browser
```

Dari **Supabase → Project Settings → API**. Skemanya ada di
`supabase-schema.sql`. Tabel yang benar-benar dibaca fungsi:
`blog_posts`, `jlpt_questions`, `rate_limits`, `user_roles`.

`SUPABASE_SERVICE_KEY` melewati seluruh Row Level Security. Ia hanya boleh ada di
environment Netlify. Kalau pernah masuk ke berkas yang ter-deploy, cabut dan
buat baru — jangan sekadar dihapus dari kode.

---

## 2b. Grup kelas & token undangan

**Yang mati tanpa ini:** `Grup-Kelas.html` (membuat grup pengajar/pelajar per level dan menerbitkan token gabung).

Tidak butuh kunci baru — memakai tiga variabel Supabase yang sama seperti bagian 2. Yang perlu dilakukan sekali:

**1. Jalankan skemanya.** Buka Supabase → SQL Editor, tempel isi `supabase-schema.sql`, jalankan. Aman diulang: semuanya `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS`.

> Jika basis data Anda sudah dipakai sebelum versi ini, bagian baru itu **mencabut** policy lama `"Students manage own enrollment"`. Policy itu mengizinkan siapa pun yang login menyisipkan dirinya ke kelas mana pun tanpa token, karena syaratnya hanya `student_id = auth.uid()` tanpa syarat apa pun soal kelasnya. Menjalankan skema baru menutup lubang itu.

**2. Tandai siapa pengajar.** Hanya `teacher` dan `admin` yang bisa membuat grup dan menerbitkan token; sisanya hanya bisa menukar token. Dari SQL Editor:

```sql
INSERT INTO user_roles (user_id, role) VALUES ('<uuid-pengguna>', 'teacher')
ON CONFLICT (user_id) DO UPDATE SET role = 'teacher';
```

UUID pengguna ada di Supabase → Authentication → Users.

**Cara pakainya:** pengajar membuka `Grup-Kelas.html`, membuat grup (mis. "Pelajar N5 — Angkatan 1", jenis *pelajar*, level *N5*), lalu menerbitkan token dengan batas pemakaian dan masa berlaku. Token muncul **sekali** — yang tersimpan di server hanya SHA-256-nya, jadi salin saat itu juga. Pelajar membuka halaman yang sama, menempel token, dan langsung tergabung.

Percobaan tukar dibatasi 30 per IP per hari untuk mencegah tebak-tebakan.

## 2c. Login admin

**Halamannya:** `Admin-Login.html` → berhasil masuk diarahkan ke `Admin-Dashboard.html`.

Tidak butuh kunci baru — memakai tiga variabel Supabase yang sama. Endpointnya
`/api/admin-login`, sudah terdaftar di `netlify.toml` dan dipakai otomatis;
`window.NIHONGO_ADMIN_LOGIN_ENDPOINT` hanya perlu diisi kalau ingin menimpanya.

**Cara membuat akun admin — tiga langkah, semuanya di Supabase:**

**1. Buat penggunanya.** Supabase → Authentication → Users → *Add user*, isi
email dan password. (Akun admin harus pengguna Supabase Auth sungguhan; akun
yang dibuat lewat `Akun.html` tersimpan di browser saja dan tidak berlaku di
sini.)

**2. Salin UUID-nya** dari daftar pengguna itu.

**3. Beri peran admin.** Supabase → SQL Editor:

```sql
INSERT INTO user_roles (user_id, role) VALUES ('<uuid-pengguna>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

Lalu buka `Admin-Login.html` dan masuk dengan email + password tadi.

**Yang terjadi di balik layar:** `netlify/functions/admin-login.js` memverifikasi
kredensial ke Supabase Auth, lalu memeriksa `user_roles` memakai service key.
Kalau perannya bukan `admin`, ia membalas **403 dan tidak mengembalikan token
sama sekali** — meski email dan passwordnya benar. Kalau pembacaan peran gagal,
hasilnya juga ditolak (*fail closed*). Jadi pelajar biasa tidak bisa masuk lewat
halaman ini, dan sebaliknya akun admin tidak diperlukan untuk belajar.

> **Login lokal.** Di `file://` atau `localhost`, halaman memakai mode demo dan
> tidak menyentuh `/api/admin-login` sama sekali — server statis biasa memang
> tidak punya endpoint itu. Setel `window.NIHONGO_ADMIN_DEMO_PASS` di konsol
> untuk mencobanya, atau jalankan `netlify dev` dan setel
> `window.NIHONGO_ADMIN_LOGIN_ENDPOINT` bila ingin menguji jalur aslinya.

## 3. Kelas live — LiveKit

**Yang mati tanpa ini:** Kelas Online, Kelas Report, dasbor guru.

```
LIVEKIT_URL        = wss://xxxx.livekit.cloud
LIVEKIT_API_KEY    = API...
LIVEKIT_API_SECRET = ...                 # RAHASIA
```

Dari **cloud.livekit.io → Settings → Keys**. `livekit-token.js` juga membaca
Supabase untuk memastikan peran pengguna, jadi bagian 2 harus lebih dulu jalan.

Uji: buka Kelas Online, buat ruang. Kalau token gagal, tab Network akan
menunjukkan `/api/livekit-token` membalas 4xx beserta alasannya.

---

## 4. Pembayaran — Midtrans

**Yang mati tanpa ini:** halaman Pricing/Premium tetap tampil, tapi tombol
bayar tidak menghasilkan transaksi.

```
MIDTRANS_SERVER_KEY     = SB-Mid-server-...     # RAHASIA
MIDTRANS_IS_PRODUCTION  = false                 # true saat sudah live
```

Mulai dengan kunci **Sandbox** dan `false`. Arahkan webhook Midtrans ke
`https://SITUS-ANDA/api/payment-webhook`; `payment-webhook.js` memverifikasi
tanda tangan memakai server key yang sama, jadi keduanya harus cocok.

---

## Cara mengisi di Netlify

**Site settings → Environment variables → Add a variable.**

Sesudah menambah variabel, **deploy ulang**. Netlify hanya memberikan
environment variable saat build dan saat fungsi dijalankan; menambahkannya
tidak mengubah deploy yang sudah berjalan.

Jangan menaruh kunci rahasia di blok `[build.environment]` pada `netlify.toml` —
berkas itu ikut masuk repositori.

Untuk mencoba di komputer sendiri:

```bash
npm i -g netlify-cli
netlify dev          # membaca .env, menyajikan /api/* seperti di produksi
```

Buat `.env` di root (sudah diabaikan git) dengan variabel yang sama.

---

## Setelah semuanya diisi

Fitur yang **tidak** butuh kunci apa pun dan sudah berjalan sekarang:

- Kamus — 177.834 entri di `assets/vocab-all.csv`
- Simulator CBT — 2.512 soal, kelima level (`assets/cbt-bank.json`)
- 100 modul Kaigo dengan kuis dan penjelasan Indonesia
- Flashcard SRS, Kanji Trainer, Ujian, materi JLPT N5–N1

Semuanya berjalan sepenuhnya di browser dan tetap hidup meski seluruh
layanan luar mati.
