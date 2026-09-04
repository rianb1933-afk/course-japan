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
   voiceschanged, bukan diucapkan dengan voice yang salah. */
(function () {
  'use strict';

  if (!('speechSynthesis' in window) || window.__npSpeechPatched) return;
  window.__npSpeechPatched = true;

  var synth = window.speechSynthesis;

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
    } catch (e) { /* jangan sampai perbaikan ini malah membuat suara gagal */ }
    return nativeSpeak(u);
  };

  // Daftar voice bisa berubah (mis. voice diunduh belakangan).
  try {
    synth.addEventListener('voiceschanged', function () { cached = null; });
  } catch (e) {}

  /* Dibuka supaya halaman yang ingin memilih sendiri tidak perlu mengulang
     logika daftar preferensi di atas. */
  window.NPSpeech = { bestJapaneseVoice: bestJapaneseVoice };
})();
