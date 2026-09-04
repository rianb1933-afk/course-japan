/* Nihongo Pro Academy — Perbaikan Suara TTS (np-speech.js)
   ───────────────────────────────────────────────────────────────────
   MASALAH YANG DIPERBAIKI

   Situs ini memanggil speechSynthesis di 414 tempat pada 78 halaman, dan
   pola yang dipakai hampir di semuanya cuma begini:

       var u = new SpeechSynthesisUtterance(t);
       u.lang = 'ja-JP'; u.rate = 0.85;
       speechSynthesis.speak(u);

   Menyetel `lang` TIDAK menentukan suara yang dipakai. Bila `.voice` tidak
   diisi, browser memakai voice default sistem. Diukur langsung di mesin ini:
   tersedia 180 voice, yang pertama (dan default) adalah "Samantha" en-US —
   jadi teks Jepang dibacakan dengan suara Inggris. Untuk platform belajar
   bahasa Jepang, ini merusak fungsi intinya.

   Segelintir tempat memang memilih voice, tapi dengan cara naif:

       voices.find(v => v.lang.startsWith('ja'))

   Di macOS daftar ja-JP berisi 9 voice dan hanya SATU yang suara Jepang
   sungguhan (Kyoko, urutan ke-5). Delapan lainnya suara novelty — Eddy,
   Flo, Grandma, Grandpa, Reed, Rocko, Sandy, Shelley. `find()` selalu
   mengambil yang pertama, yaitu Eddy. Jadi jalur yang "sudah benar" pun
   menghasilkan suara lelucon.

   CARA KERJA PERBAIKAN

   Membungkus speechSynthesis.speak() alih-alih menulis ulang 414 pemanggil.
   Sebelum diucapkan, tiap utterance diperiksa:
     - bahasanya Jepang (atau teksnya mengandung kana/kanji), DAN
     - .voice belum diisi, ATAU diisi voice novelty
   maka voice-nya diganti voice Jepang terbaik yang tersedia.

   Voice yang dipilih SENGAJA tidak diacak/di-find asal: ada daftar urutan
   preferensi berisi nama voice Jepang standar di macOS, Windows, dan
   Chrome, lalu daftar-hitam novelty, baru sisanya.

   Juga menangani balapan pemuatan: getVoices() kerap masih kosong saat
   halaman baru dibuka. Bila itu terjadi, ucapan ditunda sampai event
   voiceschanged, bukan diucapkan dengan voice yang salah.

   Kecepatan & nada ikut diseragamkan di sini, sebab nilainya tersebar tidak
   konsisten akibat copy-paste (rate 0.85/0.8/0.82/0.88 tanpa pola).

   NPSpeech.speakRich() menyediakan jalur TTS awan untuk kalimat panjang,
   dengan cache dan fallback otomatis ke Web Speech. */
(function () {
  'use strict';

  if (!('speechSynthesis' in window) || window.__npSpeechPatched) return;
  window.__npSpeechPatched = true;

  var synth = window.speechSynthesis;

  /* Kecepatan & nada baku untuk ucapan Jepang.
     Nilai di situs sekarang tidak konsisten karena copy-paste: rate 0.85
     (98x), 0.8 (6x), 0.82 (3x), 0.88 (1x) — variasinya tidak mengikuti pola
     apa pun, jadi ini drift, bukan pilihan sengaja per halaman. Diseragamkan
     di sini supaya satu tempat saja yang perlu diubah kalau mau disetel lagi.
     0.9 sedikit di bawah kecepatan alami: masih terdengar wajar tapi tiap
     mora masih terpisah jelas untuk pemula. */
  var RATE = 0.9;
  var PITCH = 1.1;

  /* Voice Jepang standar, diurutkan dari yang paling layak dipakai untuk
     belajar. Dicocokkan sebagai substring, tidak case-sensitive. */
  var PREFERRED = [
    'Kyoko',            // macOS / iOS — voice Jepang baku
    'O-Ren',            // macOS
    'Otoya', 'Hattori', // iOS
    'Google 日本語', 'Google Japanese',
    'Nanami', 'Ayumi', 'Haruka', 'Ichiro', 'Sayaka' // Microsoft
  ];

  /* Voice novelty macOS: semuanya terdaftar ja-JP tapi bukan suara bicara
     normal. Ini yang tanpa sengaja terpilih oleh find() di kode lama. */
  var NOVELTY = [
    'Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley',
    'Bells', 'Bad News', 'Good News', 'Jester', 'Organ', 'Superstar',
    'Trinoids', 'Whisper', 'Wobble', 'Boing', 'Bubbles', 'Cellos', 'Zarvox',
    'Albert', 'Bahh', 'Deranged', 'Hysterical', 'Junior', 'Kathy', 'Ralph'
  ];

  function isNovelty(voice) {
    if (!voice || !voice.name) return false;
    var n = voice.name.toLowerCase();
    for (var i = 0; i < NOVELTY.length; i++) {
      if (n.indexOf(NOVELTY[i].toLowerCase()) === 0) return true;
    }
    return false;
  }

  var cached = null;
  function bestJapaneseVoice() {
    if (cached) return cached;
    var all = synth.getVoices() || [];
    var ja = all.filter(function (v) { return /^ja(-|_|$)/i.test(v.lang || ''); });
    if (!ja.length) return null;

    for (var i = 0; i < PREFERRED.length; i++) {
      var want = PREFERRED[i].toLowerCase();
      for (var j = 0; j < ja.length; j++) {
        if ((ja[j].name || '').toLowerCase().indexOf(want) !== -1) {
          cached = ja[j];
          return cached;
        }
      }
    }
    // Tidak ada nama yang dikenal: ambil yang bukan novelty dulu.
    for (var k = 0; k < ja.length; k++) {
      if (!isNovelty(ja[k])) { cached = ja[k]; return cached; }
    }
    cached = ja[0];   // benar-benar tidak ada pilihan lain
    return cached;
  }

  // Kana atau kanji — dipakai bila utterance tidak menyetel lang sama sekali.
  var JP_TEXT = /[぀-ヿ㐀-䶿一-鿿]/;

  function needsJapanese(u) {
    if (u.lang && /^ja/i.test(u.lang)) return true;
    if (!u.lang && JP_TEXT.test(u.text || '')) return true;
    return false;
  }

  var nativeSpeak = synth.speak.bind(synth);

  synth.speak = function (u) {
    try {
      if (u && needsJapanese(u)) {
        if (!u.lang) u.lang = 'ja-JP';
        u.rate = RATE;
        u.pitch = PITCH;
        if (!u.voice || isNovelty(u.voice)) {
          var best = bestJapaneseVoice();
          if (best) {
            u.voice = best;
          } else if (!(synth.getVoices() || []).length) {
            /* Daftar voice belum termuat. Menunggu lebih baik daripada
               terlanjur bicara dengan voice yang salah — inilah kondisi
               yang paling sering terjadi tepat setelah halaman dibuka. */
            var spoken = false;
            var go = function () {
              if (spoken) return;
              spoken = true;
              cached = null;
              var v = bestJapaneseVoice();
              if (v) u.voice = v;
              nativeSpeak(u);
            };
            synth.addEventListener('voiceschanged', go, { once: true });
            window.setTimeout(go, 1200);   // jaring pengaman
            return;
          }
        }
      }
      /* Kalimat panjang dialihkan ke TTS awan. Ini yang membuat /api/tts
         benar-benar terpakai: tanpa pengalihan di sini, endpoint-nya cuma
         infrastruktur tanpa pemanggil. speakRich() sendiri yang mengurus
         cache dan jatuh balik ke Web Speech bila gagal, jadi kegagalan
         apa pun tetap berujung ada suara. */
      if (u && !u.__npRich && !cloudDown &&
          needsJapanese(u) && (u.text || '').trim().length >= AUTO_CLOUD_CHARS &&
          window.fetch && window.caches) {
        u.__npRich = true;
        speakRich(u.text, { viaWrapper: true });
        return;
      }
    } catch (e) { /* jangan sampai perbaikan ini malah membuat suara gagal */ }
    return nativeSpeak(u);
  };

  // Daftar voice bisa berubah (mis. voice diunduh belakangan).
  try {
    synth.addEventListener('voiceschanged', function () { cached = null; });
  } catch (e) {}

  /* Dibuka supaya halaman yang ingin memilih sendiri tidak perlu mengulang
     logika daftar preferensi di atas. */
  /* ── TTS awan untuk kalimat panjang ──────────────────────────────
     Web Speech tetap dipakai untuk kata/kartu: gratis, instan, dan sejak
     voice-nya benar sudah memadai. speakRich() dipakai HANYA bila kalimatnya
     cukup panjang sehingga suara natural benar-benar terasa bedanya —
     lihat alasan biaya di netlify/functions/tts.js.

     Hasilnya disimpan di Cache API, jadi kalimat yang sama tidak pernah
     dibayar dua kali di perangkat itu. Bila apa pun gagal (endpoint mati,
     kunci belum diisi, offline), otomatis jatuh kembali ke Web Speech —
     pengguna tidak boleh kehilangan suaranya hanya karena TTS awan bermasalah. */
  var CLOUD_MIN_CHARS = 12;
  /* Ambang untuk PENGALIHAN OTOMATIS dari speechSynthesis.speak(). Lebih
     tinggi dari CLOUD_MIN_CHARS: kata & frasa pendek harus tetap instan dan
     gratis, sedangkan kalimat penuh (dialog Kaigo, contoh percakapan) yang
     benar-benar terasa bedanya dengan suara natural. */
  var AUTO_CLOUD_CHARS = 24;
  var CACHE_NAME = 'np-tts-v1';
  /* Sekali endpoint terbukti tidak tersedia (mis. OPENAI_API_KEY belum diisi
     sehingga balas 503), berhenti mencobanya untuk sisa sesi ini — kalau
     tidak, tiap kalimat panjang membayar satu permintaan gagal dan menunda
     suaranya. */
  var cloudDown = false;

  function webSpeechFallback(text) {
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = RATE;
    u.pitch = PITCH;
    var v = bestJapaneseVoice();
    if (v) u.voice = v;
    u.__npRich = true;       // tandai supaya tidak dialihkan balik ke awan
    synth.cancel();
    nativeSpeak(u);          // langsung ke engine: mencegah rekursi wrapper
  }

  function speakRich(text, opts) {
    text = String(text || '').trim();
    if (!text) return Promise.resolve(false);
    if (text.length < CLOUD_MIN_CHARS || !window.fetch || !window.caches) {
      webSpeechFallback(text);
      return Promise.resolve(false);
    }
    var voice = (opts && opts.voice) || 'sensei';
    var req = new Request('/api/tts?v=' + encodeURIComponent(voice) +
                          '&t=' + encodeURIComponent(text.slice(0, 400)));

    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req).then(function (hit) {
        if (hit) return hit.blob();
        return fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text, voice: voice })
        }).then(function (r) {
          /* Status yang berarti endpointnya memang tidak bisa dipakai:
             belum dikonfigurasi (503), tidak terdaftar (404), atau server
             tidak mendukung POST sama sekali (501 — persis yang terjadi
             saat situs dilayani sebagai berkas statis tanpa Netlify).
             Selain itu dianggap gangguan sementara dan boleh dicoba lagi. */
          if (r.status === 404 || r.status === 501 || r.status === 503) cloudDown = true;
          if (!r.ok) throw new Error('tts ' + r.status);
          return r.blob().then(function (blob) {
            // Disimpan memakai kunci GET buatan sendiri; Cache API tidak
            // bisa menyimpan respons dari permintaan POST.
            try { cache.put(req, new Response(blob.slice(0), { headers: { 'Content-Type': 'audio/mpeg' } })); } catch (e) {}
            return blob;
          });
        });
      });
    }).then(function (blob) {
      synth.cancel();
      var url = URL.createObjectURL(blob);
      var audio = new Audio(url);
      audio.addEventListener('ended', function () { URL.revokeObjectURL(url); });
      return audio.play().then(function () { return true; });
    }).catch(function (e) {
      // fetch yang gagal di level jaringan juga berarti percuma dicoba lagi
      if (e && e.name === 'TypeError') cloudDown = true;
      webSpeechFallback(text);
      return false;
    });
  }

  window.NPSpeech = {
    bestJapaneseVoice: bestJapaneseVoice,
    speakRich: speakRich,
    /* Supaya nilainya bisa disetel tanpa mengedit berkas ini. */
    setProsody: function (rate, pitch) {
      if (typeof rate === 'number') RATE = rate;
      if (typeof pitch === 'number') PITCH = pitch;
    }
  };
})();
