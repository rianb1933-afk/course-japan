const CACHE = 'eduma-kaigo-v366';
// Precache = diunduh saat service worker dipasang, SEBELUM pengguna memintanya.
// Isinya sengaja dibatasi pada kerangka aplikasi: halaman masuk, aset, dan
// halaman cadangan offline.
//
// Yang TIDAK di sini bukan berarti tidak bisa dipakai offline. Fetch handler di
// bawah bersifat cache-first dan menyimpan setiap respons same-origin yang
// berhasil, jadi apa pun yang pernah dibuka tetap tersedia offline.
//
// Yang dikeluarkan (3,11 MB dari 4,66 MB):
//   seed/*.json          1,63 MB, hanya dipakai Ujian.html — pengguna yang tak
//                        pernah membuka ujian ikut menanggung unduhannya
//   Materi/*.html        1,39 MB, 23 halaman materi; dicache saat dibuka
//   '/'                  88 KB, kembar dengan '/index.html' — dua entri cache
//                        untuk isi yang sama, keduanya ikut diunduh
//
// Menambah entri di sini membebani SETIAP pengguna baru. Pertimbangkan dulu
// apakah caching saat dibuka sudah cukup.
const PRECACHE = [
  '/offline.html',
  '/index.html',
  '/Ujian.html',
  '/Verify.html',
  '/Theme-Settings.html',
  '/assets/anime-theme.js',
  '/assets/site-motion.js',
  '/assets/home-animations.js',
  '/assets/anime-theme.css',
  '/assets/anime-animation.css',
  '/assets/anime-background.js',
  '/assets/anime-clock.js',
  '/assets/anime-particles.js',
  // Materi pages (verified exist)
  // Dashboard
  '/Dashboard/Dashboard.html',
  '/assets/dashboard-v86.css',
  '/assets/dashboard-catalog-v86.js',
  '/assets/dashboard-v86.js',
  '/assets/np-xp.js',
  // App pages
  '/Akun.html',
  '/Platform-App.html',
  '/AI-Tutor-Pro.html',
  '/AI-Kaiwa.html',
  '/AI-Sensei.html',
  '/AI-Writing-Practice.html',
  '/Kelas-Report.html',
  '/assets/live/live-class.css',
  '/Pronunciation.html',
  '/Kanji-Trainer-Pro.html',
  '/JLPT-CBT.html',
  '/Kaigo-Simulator.html',
  '/Anatomi-Dasar.html',
  '/assets/anatomy/anatomy-data.js',
  '/assets/anatomy/anatomy-viewer.css',
  '/assets/anatomy/anatomy-viewer.js',
  '/assets/anatomy/anatomy-quiz.js',
  '/SRS-Flashcard.html',
  '/Certificate-Pro.html',
  '/Blog-SEO.html',
  '/Pricing-Pro.html',
  '/Payment-Receipt.html',
  '/Grammar-Checker.html',
  '/Papan-Tulis.html',
  '/assets/whiteboard.css',
  '/assets/whiteboard.js',
  '/404.html',
  // Assets
  '/assets/pro-style.css',
  '/assets/neko-theme.css',
  '/assets/og-preview.svg',
  '/assets/mascot-kucing.svg',
  '/assets/my-kucing.svg',
  // Hanya WebP yang di-precache; fallback .jpg di-cache oleh fetch handler
  // saat benar-benar dipakai (browser hanya mengunduh salah satu dari keduanya).
  '/assets/hero-kucing.webp',
  '/assets/eduma-platform.css',
  '/assets/eduma-data.js',
  '/assets/eduma-platform.js',
  '/assets/env.js',
  '/assets/analytics-loader.js',
  '/assets/kyoto-navbar.min.css',
  '/assets/kyoto-bottom-nav.js',
  '/assets/np-skip-link.js',
  '/assets/kyoto-bottom-nav.css',
  '/assets/kyoto-elevation.css',
  
  '/assets/kyoto-navbar.min.js',
  // Aset yang dipakai pusat materi Kaigo (Materi/Kaigo.html).
  // Tanpa ini halaman tetap terbuka offline tapi tampil tanpa gaya.
  '/assets/kyoto-design-system.css',
  '/assets/kyoto-theme.css',
  '/assets/kyoto-navbar.css',
  '/assets/kyoto-theme.js',
  '/assets/kaigo-progress.js',
  // Dipakai seluruh 100 halaman Materi/Kaigo-*.html sejak mesin kuis, TTS,
  // dan gaya modul diekstrak keluar dari HTML masing-masing.
  '/assets/kaigo-quiz.js',
  '/assets/kaigo-module.css',
  '/assets/design-system.css',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => {
        // Cache one by one to avoid failing entire install on a missing file
        return Promise.allSettled(PRECACHE.map(url => c.add(url)));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!url.protocol.startsWith('http')) return;
  // Don't cache API calls
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/.netlify/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached || caches.match('/offline.html') || caches.match('/404.html'));
      return cached || network;
    })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});


// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch(e) { data = { title: 'NihongoPro', body: event.data?.text() || '' }; }

  const title   = data.title || 'NihongoPro 日本語';
  const options = {
    body:    data.body    || 'Ada yang baru untuk Anda!',
    icon:    data.icon    || '/assets/icon-192.svg',
    badge:   data.badge   || '/assets/icon-192.svg',
    image:   data.image,
    tag:     data.tag     || 'nihongopro-notif',
    renotify: true,
    data:    { url: data.url || '/', type: data.type || 'general' },
    actions: data.actions || [
      { action: 'open',    title: '📖 Buka',  icon: '/assets/icon-192.svg' },
      { action: 'dismiss', title: '✕ Tutup',  icon: '/assets/icon-192.svg' },
    ],
    vibrate: [200, 100, 200],
    requireInteraction: data.urgent || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});

// ── BACKGROUND SYNC: Daily Study Reminder ─────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'daily-reminder') {
    event.waitUntil(sendDailyReminder());
  }
});

async function sendDailyReminder() {
  const hasSubscription = await self.registration.pushManager.getSubscription();
  if (!hasSubscription) return;
  return self.registration.showNotification('⏰ Waktunya Belajar!', {
    body: 'Jangan lupa latihan Kaigo hari ini. Streak kamu menunggu! 🔥',
    icon: '/assets/icon-192.svg',
    badge: '/assets/icon-192.svg',
    tag: 'daily-reminder',
    data: { url: '/Dashboard/Dashboard.html' },
  });
}
