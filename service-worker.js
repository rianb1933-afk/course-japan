const CACHE_NAME = 'nihongo-pro-v219';
const CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './Premium.html',
  './Admin-Login.html',
  './Admin-Dashboard.html',
  './Platform-Features.html',
  './LMS-Features.html',
  './Pembelajaran-Lain.html',
  './Landing-Page/landing.html',
  './Materi/Materi.html',
  './Materi/Kana-Hiragana-Katakana.html',
  './Materi/Fondasi-Bahasa-Jepang.html',
  './Materi/Partikel-Dasar-Jepang.html',
  './Materi/Konjugasi-Dasar-Jepang.html',
  './Materi/Angka-Counter-Waktu.html',
  './Materi/Listening-Speaking.html',
  './Materi/Pelafalan-Pitch-Accent.html',
  './Materi/Reading-Writing.html',
  './Materi/Keigo-Bisnis.html',
  './Materi/Rencana-Belajar-JLPT.html',
  './Materi/Tes-Level-JLPT.html',
  './Materi/Review-Kesalahan.html',
  './Materi/Kesalahan-Umum-JLPT.html',
  './Materi/Pembuat-Kalimat.html',
  './Materi/Ungkapan-Natural.html',
  './Materi/JLPT-Lengkap.html',
  './Materi/Kurikulum-Checklist.html',
  './Materi/Cheat-Sheet-JLPT.html',
  './Materi/Glosarium-JLPT.html',
  './Materi/Template-Latihan-Mandiri.html',
  './Materi/Strategi-Ujian-JLPT.html',
  './Materi/Vocabulary-Lengkap.html',
  './Materi/Grammar-Lengkap.html',
  './Materi/Flashcard-Lengkap.html',
  './Materi/Flashcard-Kanji.html',
  './Materi/Flashcard-Kanji-N5.html',
  './Materi/Flashcard-Kanji-N4.html',
  './Materi/Flashcard-Kanji-N3.html',
  './Materi/Flashcard-Kanji-N2.html',
  './Materi/Flashcard-Kanji-N1.html',
  './Materi/Radikal-Kanji.html',
  './Materi/Kanji-N5.html',
  './Materi/Kanji-N4.html',
  './Materi/Kanji-N3.html',
  './Materi/Kanji-N2.html',
  './Materi/Kanji-N1.html',
  './Materi/Latihan-JLPT.html',
  './Dashboard/Dashboard.html',
  './assets/dashboard-v86.css',
  './assets/dashboard-catalog-v86.js',
  './assets/dashboard-v86.js',
  './assets/np-xp.js',
  './AI-Tutor-Page/AI.html',
  './QUIZ/nihongo-pro.html',
  './assets/pro-style.css',
  './assets/neko-theme.css?v=3',
  './assets/kanji-writing.css',
  './assets/kanji-writing.js?v=4',
  './assets/translator.css',
  './assets/translator.min.js',
'./Kaiwa.html',
  './Grammar.html',
  './assets/srs-engine.js',
  './assets/progress-dashboard.js',
  './assets/speaking-ai.js',
  './assets/fuzzy-search.js',
  './assets/vocab-all.csv',
  
  './assets/og-preview.svg',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './favicon.ico',
  
  // GENUINELY DIPERBAIKI (Fase Audit Website Putaran Kelima, Fase T):
  // dikonfirmasi via pemetaan sistematis terhadap seluruh halaman bahwa
  // versi non-minified lama dengan query string (index-page dan
  // pro-app) genuinely TIDAK PERNAH dimuat halaman manapun -- seluruh
  // halaman genuinely memakai versi .min. tanpa query string. Precache
  // versi lama genuinely sia-sia total (membuang kapasitas cache),
  // sementara versi .min. yang genuinely dipakai index.html TIDAK
  // ter-precache sama sekali. Ditambahkan versi .min. yang benar di sini.
  './assets/index-page.min.css',
  './assets/index-page.min.js',
  './assets/pro-app.min.js',
  
  './manifest.webmanifest'
];

const toCacheUrl = (asset) => new URL(asset, self.registration.scope).toString();
const offlineUrl = toCacheUrl('./offline.html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map(toCacheUrl).map(url => cache.add(url))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function canCache(request, response) {
  return request.url.startsWith(self.location.origin) && response && response.ok;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (canCache(event.request, response)) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone())).catch(() => null);
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match(offlineUrl)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (canCache(event.request, response)) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone())).catch(() => null);
          }
          return response;
        })
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});
