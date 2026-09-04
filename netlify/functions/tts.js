/**
 * Netlify Function: /api/tts
 * ───────────────────────────────────────────────────────────────────
 * Text-to-speech kualitas tinggi untuk KALIMAT PANJANG saja.
 *
 * KENAPA HANYA KALIMAT PANJANG
 * Pengucapan kata/kartu tetap memakai Web Speech API di perangkat (lihat
 * assets/np-speech.js): gratis, instan, dan sejak voice-nya diperbaiki ke
 * Kyoko sudah memadai untuk satu-dua kata. TTS awan dibayar per karakter,
 * sementara situs ini memicu pengucapan di ribuan kartu kosakata & kanji —
 * memakainya untuk semua ucapan berarti tagihan tumbuh mengikuti intensitas
 * belajar, bukan mengikuti jumlah pengguna. Yang benar-benar terasa lebih
 * baik dengan suara natural adalah kalimat/dialog panjang, dan itu jauh
 * lebih jarang dipanggil.
 *
 * PENYEDIA
 * OpenAI /v1/audio/speech, karena OPENAI_API_KEY memang sudah dipakai
 * ai-chat.js — tidak menambah kunci/vendor baru. Perlu jujur soal batasnya:
 * suaranya bukan penutur asli Jepang, jadi hasilnya lebih natural dari Web
 * Speech untuk kalimat, tapi bukan setara narator ja-JP profesional. Kalau
 * nanti kualitas itu yang dikejar, Google Cloud TTS punya voice Neural2
 * ja-JP dan tinggal ditambah sebagai provider kedua di bawah.
 *
 * CACHING
 * Respons memakai Cache-Control immutable ber-ETag hash teks, sehingga CDN
 * dan browser tidak meminta ulang kalimat yang sama. Sisi klien juga
 * menyimpannya lewat Cache API. Tanpa ini satu kalimat yang sama dibayar
 * berulang kali. Repo ini tidak punya penyimpanan audio sendiri, jadi cache
 * HTTP adalah satu-satunya lapisan yang tersedia.
 *
 * CSP tidak perlu diubah: endpoint sesama origin, dan netlify.toml sudah
 * mengizinkan connect-src 'self' serta media-src 'self' blob:.
 */
const crypto = require('crypto');

// Ambang: di bawah ini pakai Web Speech saja, tidak usah bayar.
const MIN_CHARS = 12;
// Batas atas menjaga biaya & waktu respons tetap terduga.
const MAX_CHARS = 400;

const VOICES = {
  sensei: 'nova',    // hangat, tenang — cocok untuk narasi pelajaran
  alt:    'shimmer',
};

const ALLOWED_ORIGINS = [
  'https://nihongopro.id',
  'https://www.nihongopro.id',
  'http://localhost:8888',
  'http://localhost:3000',
];

function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary':                         'Origin',
  };
}

exports.handler = async (event) => {
  const CORS = corsHeadersFor(event);
  const json = (code, obj) => ({
    statusCode: code,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS),
    body: JSON.stringify(obj),
  });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(503, { error: 'TTS belum dikonfigurasi (OPENAI_API_KEY kosong)' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return json(400, { error: 'Invalid JSON' }); }

  const text = String(body.text || '').trim();
  if (!text) return json(400, { error: 'text wajib diisi' });
  if (text.length < MIN_CHARS) {
    // Bukan error: klien memang diharapkan memakai Web Speech untuk yang pendek.
    return json(400, { error: 'Terlalu pendek untuk TTS awan', useWebSpeech: true, minChars: MIN_CHARS });
  }
  if (text.length > MAX_CHARS) return json(413, { error: `Maksimal ${MAX_CHARS} karakter` });

  const voice = VOICES[body.voice] || VOICES.sensei;
  const etag = '"' + crypto.createHash('sha1').update(voice + '\n' + text).digest('hex') + '"';

  // Teks & voice sama => audio sama. Kalau klien sudah punya, hemat biaya panggilan.
  const inm = event.headers['if-none-match'] || event.headers['If-None-Match'];
  if (inm && inm === etag) {
    return { statusCode: 304, headers: Object.assign({ ETag: etag }, CORS), body: '' };
  }

  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice, input: text, response_format: 'mp3', speed: 0.95 }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return json(502, { error: 'TTS provider gagal', status: r.status, detail: detail.slice(0, 300) });
    }

    const buf = Buffer.from(await r.arrayBuffer());
    return {
      statusCode: 200,
      headers: Object.assign({
        'Content-Type':  'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag':          etag,
      }, CORS),
      body: buf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    return json(500, { error: 'TTS gagal', detail: String(e && e.message || e).slice(0, 200) });
  }
};
