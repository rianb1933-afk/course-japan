# Panduan Setup Server Kelas Online (PeerJS)

## Masalah yang diperbaiki (v122)

Kelas Online memakai **PeerJS** untuk koneksi video/audio antar-peserta (WebRTC).
Secara default, bila `PEERJS_HOST` belum diatur, kode jatuh ke server publik
gratis **`0.peerjs.com`**. Server publik ini:

- Sering **down / rate-limited** (penyebab utama "kelas tidak berjalan")
- Tidak dijamin untuk penggunaan produksi
- Membuat koneksi gagal **tanpa pesan jelas** (sudah diperbaiki di v122 — sekarang
  user mendapat notifikasi bila server sinyal tidak dapat dijangkau)

Agar Kelas Online **andal**, jalankan PeerServer sendiri lalu set `PEERJS_HOST`.

---

## Opsi A — PeerServer sendiri (gratis, direkomendasikan)

### 1. Deploy PeerServer

PeerServer adalah server sinyal ringan (Node.js). Deploy ke Railway, Render,
Fly.io, atau VPS mana pun:

```bash
npm install -g peer
peerjs --port 9000 --key peerjs --path /myapp
```

Atau via Docker:

```bash
docker run -p 9000:9000 -d peerjs/peerjs-server
```

Atau sebagai kode (server.js):

```js
const { PeerServer } = require('peer');
const port = process.env.PORT || 9000;
PeerServer({ port, path: '/myapp' });
```

### 2. Set environment variables di hosting (Netlify/Vercel)

Netlify: **Site settings → Environment variables → Add variable**

| Variable       | Nilai contoh                    | Keterangan               |
|----------------|---------------------------------|--------------------------|
| `PEERJS_HOST`  | `peer.nihonggopro.id`           | domain PeerServer Anda   |
| `PEERJS_PORT`  | `443`                           | 443 untuk HTTPS          |
| `PEERJS_PATH`  | `/myapp`                        | sesuai `--path` di atas  |

> `env.js` membaca variabel ini otomatis. Setelah di-set, **redeploy** situs.

### 3. Verifikasi

Buka Kelas Online → buat kelas. Jika tersambung tanpa notifikasi error server,
berarti PeerServer Anda aktif.

---

## Opsi B — Layanan berbayar (paling andal)

Untuk skala besar / kualitas tinggi, gunakan SFU seperti **LiveKit** atau
**Daily.co**. Proyek sudah punya `netlify/functions/livekit-token.js` untuk
integrasi LiveKit — set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`.
(Lihat `ROADMAP-PENGEMBANGAN.md` untuk detail LiveKit SFU.)

---

## Catatan penting

- **HTTPS wajib**: `getUserMedia` (kamera/mikrofon) hanya bekerja di HTTPS atau
  `localhost`. Netlify sudah HTTPS, jadi aman. Membuka file `.html` langsung
  (`file://`) tidak akan bisa akses kamera.
- **Izin browser**: peserta harus mengizinkan kamera/mikrofon saat diminta.
- **TURN server** (opsional): untuk peserta di balik NAT/firewall ketat, set
  `TURN_URL` di environment agar koneksi tetap tembus. Tanpa TURN, sebagian
  koneksi antar-jaringan bisa gagal.
- Logika WebRTC inti (kamera, mikrofon, PeerJS) **tidak diubah** — perbaikan
  v122 hanya menambah pesan error yang jelas saat server sinyal tak tersedia.
