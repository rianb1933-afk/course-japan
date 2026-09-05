/* Uji konfigurasi penyedia AI di netlify/functions/ai-chat.js.
   ───────────────────────────────────────────────────────────────────
   Tidak memerlukan kunci API sungguhan: global.fetch disadap sehingga kita
   bisa memeriksa PERMINTAAN yang akan dikirim (URL, header auth, isi body)
   dan mengembalikan balasan tiruan berbentuk sama seperti penyedia aslinya.

   Yang dijaga di sini adalah hal yang mudah salah tanpa ketahuan: sebuah
   penyedia baru bisa saja "terpasang" tapi memakai header auth yang keliru
   atau membaca balasan dari field yang salah, dan gejalanya baru muncul di
   produksi sebagai kegagalan diam. */
'use strict';
const assert = require('assert');
const path = require('path');

const FN = path.join(__dirname, '..', '..', 'netlify', 'functions', 'ai-chat.js');
const KEYS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY',
              'GROQ_API_KEY', 'OPENROUTER_API_KEY'];

let ipCounter = 0;
function freshHandler() {
  delete require.cache[require.resolve(FN)];   // env dibaca saat modul dimuat
  return require(FN).handler;
}

function eventFor(body) {
  // IP berbeda tiap panggilan supaya rate-limit per-menit tidak ikut campur.
  return {
    httpMethod: 'POST',
    headers: { 'x-nf-client-connection-ip': '203.0.113.' + (++ipCounter % 250) },
    body: JSON.stringify(Object.assign({ messages: [{ role: 'user', content: 'halo' }] }, body)),
  };
}

// Balasan tiruan per bentuk API.
const REPLY = {
  openaiShape: { choices: [{ message: { content: 'JAWABAN' } }] },
  anthropic:   { content: [{ text: 'JAWABAN' }] },
  gemini:      { candidates: [{ content: { parts: [{ text: 'JAWABAN' }] } }] },
};

async function callWith(envKeys, bodyOverride, replyBody) {
  const saved = {};
  KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; });
  Object.entries(envKeys).forEach(([k, v]) => { process.env[k] = v; });

  const realFetch = global.fetch;
  let seen = null;
  global.fetch = async (url, opts) => {
    seen = { url: String(url), opts };
    return { ok: true, status: 200, json: async () => replyBody };
  };

  try {
    const res = await freshHandler()(eventFor(bodyOverride || {}));
    return { seen, res, payload: JSON.parse(res.body || '{}') };
  } finally {
    global.fetch = realFetch;
    KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    });
  }
}

const tests = [
  {
    name: 'groq: URL, Bearer, dan model benar; jawaban terbaca',
    fn: async () => {
      const { seen, res, payload } = await callWith(
        { GROQ_API_KEY: 'kunci-groq' }, { provider: 'groq' }, REPLY.openaiShape);
      assert.strictEqual(res.statusCode, 200, 'harus 200, dapat ' + res.statusCode);
      assert.ok(seen.url.startsWith('https://api.groq.com/openai/v1/chat/completions'), seen.url);
      assert.strictEqual(seen.opts.headers.Authorization, 'Bearer kunci-groq');
      const body = JSON.parse(seen.opts.body);
      assert.strictEqual(body.model, 'llama-3.3-70b-versatile');
      assert.ok(Array.isArray(body.messages) && body.messages.length >= 2);
      assert.strictEqual(payload.text, 'JAWABAN');
      assert.strictEqual(payload.provider, 'groq');
    },
  },
  {
    name: 'openrouter: header atribusi terkirim dan model :free dipakai',
    fn: async () => {
      const { seen, payload } = await callWith(
        { OPENROUTER_API_KEY: 'kunci-or' }, { provider: 'openrouter' }, REPLY.openaiShape);
      assert.ok(seen.url.startsWith('https://openrouter.ai/api/v1/chat/completions'), seen.url);
      assert.strictEqual(seen.opts.headers.Authorization, 'Bearer kunci-or');
      assert.ok(seen.opts.headers['HTTP-Referer'], 'HTTP-Referer wajib ada');
      assert.strictEqual(seen.opts.headers['X-Title'], 'Nihongo Pro Academy');
      assert.ok(JSON.parse(seen.opts.body).model.endsWith(':free'));
      assert.strictEqual(payload.text, 'JAWABAN');
    },
  },
  {
    name: 'gemini: kunci lewat URL (bukan header) dan batas token 1200',
    fn: async () => {
      const { seen, payload } = await callWith(
        { GEMINI_API_KEY: 'kunci-gem' }, { provider: 'gemini' }, REPLY.gemini);
      assert.ok(seen.url.includes('generativelanguage.googleapis.com'), seen.url);
      assert.ok(seen.url.includes('key=kunci-gem'), 'kunci harus di query string');
      assert.strictEqual(seen.opts.headers.Authorization, undefined,
        'gemini tidak memakai header Authorization');
      assert.strictEqual(JSON.parse(seen.opts.body).generationConfig.maxOutputTokens, 1200);
      assert.strictEqual(payload.text, 'JAWABAN');
    },
  },
  {
    name: 'model dapat ditimpa lewat environment',
    fn: async () => {
      const saved = process.env.GROQ_MODEL;
      process.env.GROQ_MODEL = 'model-uji';
      try {
        const { seen } = await callWith(
          { GROQ_API_KEY: 'k' }, { provider: 'groq' }, REPLY.openaiShape);
        assert.strictEqual(JSON.parse(seen.opts.body).model, 'model-uji');
      } finally {
        if (saved === undefined) delete process.env.GROQ_MODEL; else process.env.GROQ_MODEL = saved;
      }
    },
  },
  {
    name: 'fallback: hanya kunci gratis terpasang, permintaan default tetap dilayani',
    fn: async () => {
      // Halaman situs mengirim provider default 'openai'. Tanpa fallback,
      // pemilik yang hanya memasang kunci gratis akan melihat fitur AI mati.
      const { res, payload } = await callWith(
        { GROQ_API_KEY: 'kunci-groq' }, {}, REPLY.openaiShape);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(payload.provider, 'groq');
      assert.strictEqual(payload.text, 'JAWABAN');
    },
  },
  {
    name: 'tanpa kunci apa pun: 501 dan menyebut kelima nama variabel',
    fn: async () => {
      const { res, payload } = await callWith({}, {}, REPLY.openaiShape);
      assert.strictEqual(res.statusCode, 501);
      assert.strictEqual(payload.code, 'NO_API_KEY');
      KEYS.forEach((k) => assert.ok(payload.error.includes(k), 'harus menyebut ' + k));
    },
  },
];

module.exports = { tests };
