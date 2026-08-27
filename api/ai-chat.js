/**
 * /api/ai-chat.js — Vercel Serverless Function
 * NihongoPro Universal AI Backend v4
 * Multi-provider: Anthropic → OpenAI → Gemini (auto-fallback)
 */

const PROVIDERS = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-haiku-latest',
    buildHeaders: k => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }),
    buildBody: (model, messages, temperature) => {
      const sys  = messages.find(m => m.role === 'system');
      const rest = messages.filter(m => m.role !== 'system');
      return JSON.stringify({ model, system: sys?.content || '', messages: rest, temperature, max_tokens: 1200 });
    },
    extract: d => d.content?.[0]?.text || '',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    buildHeaders: k => ({ 'Authorization': `Bearer ${k}`, 'Content-Type': 'application/json' }),
    buildBody: (model, messages, temperature) => JSON.stringify({ model, messages, temperature, max_tokens: 1200 }),
    extract: d => d.choices?.[0]?.message?.content || '',
  },
  gemini: {
    urlFn: (model, k) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${k}`,
    keyEnv: 'GEMINI_API_KEY',
    defaultModel: 'gemini-1.5-flash',
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (_, messages) => {
      const sys = messages.find(m => m.role === 'system');
      const contents = messages.filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      return JSON.stringify({ contents, systemInstruction: sys ? { parts: [{ text: sys.content }] } : undefined, generationConfig: { maxOutputTokens: 1200, temperature: 0.5 } });
    },
    extract: d => d.candidates?.[0]?.content?.parts?.[0]?.text || '',
  },
};

const SYSTEM_PROMPTS = {
  grammar:      `Kamu adalah Tanaka Sensei, pakar grammar Bahasa Jepang Nihongo Pro Academy.\nKoreksi grammar dan BALAS JSON:\n{"score":85,"errors":[{"original":"...","corrected":"...","explanation":"...","type":"particle","severity":"medium"}],"overall":"...","tips":["..."]}`,
  conversation: (level, scenario) => `Kamu adalah Tanaka Sensei, partner percakapan Bahasa Jepang. Level: ${level}. Skenario: ${scenario||'umum'}.\nSesuaikan bahasa dengan level. Koreksi dalam [コレクション:...]. Vocab baru dalam [VOCAB:語=arti]. Respons 2-3 kalimat, akhiri dengan pertanyaan.`,
  jlpt:         (level) => `Kamu adalah JLPT Coach profesional Nihongo Pro Academy. Level target: ${level}.\nBuat soal latihan JLPT, jelaskan jawaban, berikan mnemonic dan strategi ujian.`,
  kaigo:        `Kamu adalah Kaigo Language Specialist Nihongo Pro Academy 介護日本語専門.\nFokus: kosakata kaigo (尊厳・見守り・申し送り), keigo profesional, prosedur perawatan.\nFormat: 日本語→よみかた→Arti→Contoh nyata di lingkungan kaigo.`,
  interview:    `Kamu adalah pewawancara perusahaan Jepang formal.\nSimulasi wawancara kerja/kaigo dalam Bahasa Jepang. Ajukan 1 pertanyaan per giliran.\nEvaluasi: naturalness, keigo, konten. Berikan feedback setelah jawaban.\nMulai: どうぞよろしくお願いします。自己紹介からお願いします。`,
  kaiwa:        (scenario) => `Kamu adalah aktor roleplay percakapan Bahasa Jepang. Skenario: ${scenario||'umum'}.\nMainkan karakter konsisten. Koreksi jika user salah kritis. Skor [スコア:N/10] di akhir.`,
  kanji:        `Kamu adalah Kanji Sensei Nihongo Pro Academy.\nJelaskan kanji: makna, onyomi, kunyomi, radical, stroke tips, contoh kata & kalimat, mnemonic.`,
  vocabulary:   (level) => `Kamu adalah Vocab Coach Nihongo Pro Academy.\nJelaskan kosakata: arti, cara baca, contoh (formal/informal), nuansa. Level: ${level}. Bandingkan kata serupa jika relevan.`,
  translate:    `Kamu adalah penerjemah profesional Jepang-Indonesia Nihongo Pro Academy.\nTerjemahkan akurat, pertahankan nuansa, jelaskan pilihan terjemahan sulit.`,
  sentence:     (level) => `Kamu adalah Sentence Builder Coach Nihongo Pro Academy.\nBuat 3 variasi kalimat: sederhana, menengah, natural. Level: ${level}.`,
};

function buildSysPrompt(mode, level, scenario) {
  const p = SYSTEM_PROMPTS[mode];
  if (!p) return SYSTEM_PROMPTS.conversation(level || 'N5', scenario);
  if (typeof p === 'function') return p(level || 'N5', scenario);
  return p;
}

// Rate limit (in-memory, resets per cold start)
const _mem = new Map();
function checkLimit(userId, isPremium) {
  const key = `${userId}:${new Date().toISOString().slice(0,10)}`;
  const count = (_mem.get(key) || 0) + 1;
  _mem.set(key, count);
  const limit = isPremium ? 200 : 15;
  return { allowed: count <= limit, count, limit, remaining: Math.max(0, limit - count) };
}

function localFallback(mode) {
  if (mode === 'grammar') return JSON.stringify({ score: 0, errors: [], overall: '⚠️ AI offline. Periksa partikel, konjugasi, dan struktur kalimat secara manual.', tips: ['Periksa partikel は vs が','Pastikan verba di akhir kalimat'] });
  return '申し訳ありません。AI sedang tidak tersedia. Coba lagi dalam beberapa menit. 頑張ってください！🌸';
}

// CORS: SEBELUMNYA '*' (wildcard) -- mengizinkan situs MANAPUN memanggil
// endpoint ini dari browser pengguna, meski rate-limit internal membatasi
// jumlah panggilan. Diganti dengan dynamic origin validation, pola yang
// sama persis dengan netlify/functions/ai-chat.js (yang sudah diperbaiki
// di sesi sebelumnya dari wildcard yang sama) -- whitelist origin resmi
// + localhost untuk pengembangan, header Vary: Origin untuk caching yang
// benar.
const ALLOWED_ORIGINS = [
  'https://nihongopro.id',
  'https://www.nihongopro.id',
  'http://localhost:8888',
  'http://localhost:3000',
];
function corsHeadersFor(req) {
  const reqOrigin = req.headers['origin'] || req.headers['Origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default async function handler(req, res) {
  const CORS = corsHeadersFor(req);
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'JSON tidak valid' }); }

  const {
    messages = [], mode = 'conversation', level = 'N5', scenario = '',
    userId = 'anonymous', isPremium = false,
    provider = 'anthropic', model = null, temperature = 0.5,
  } = body;

  // Input validation: cegah abuse & biaya membengkak
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages harus array non-kosong' });
  }
  if (messages.length > 50) {
    return res.status(400).json({ error: 'Terlalu banyak pesan (maks 50)' });
  }
  const _totalChars = messages.reduce((n, m) => n + (typeof m?.content === 'string' ? m.content.length : JSON.stringify(m?.content || '').length), 0);
  if (_totalChars > 40000) {
    return res.status(413).json({ error: 'Input terlalu panjang (maks ~40k karakter)' });
  }

  const allMsgs = messages.length
    ? messages
    : [{ role: 'user', content: String(body.prompt || body.message || body.text || '') }];

  if (!allMsgs.find(m => m.role === 'user')?.content?.trim())
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });

  const rate = checkLimit(userId, isPremium);
  if (!rate.allowed)
    return res.status(429).json({ error: `Limit ${rate.count}/${rate.limit} tercapai.`, code: 'RATE_LIMITED', remaining: 0 });

  const order = [provider, 'anthropic', 'openai', 'gemini'].filter((v,i,a) => a.indexOf(v) === i);
  let lastErr = null;

  for (const name of order) {
    const prov = PROVIDERS[name];
    if (!prov) continue;
    const apiKey = process.env[prov.keyEnv];
    if (!apiKey) continue;

    try {
      const sysPrompt = buildSysPrompt(mode, level, scenario);
      const fullMsgs  = [{ role: 'system', content: sysPrompt }, ...allMsgs.slice(-14)];
      const usedModel = model || process.env[`${name.toUpperCase()}_MODEL`] || prov.defaultModel;
      const url = prov.urlFn ? prov.urlFn(usedModel, apiKey) : prov.url;

      const aiRes = await fetch(url, {
        method: 'POST',
        headers: prov.buildHeaders(apiKey),
        body: prov.buildBody(usedModel, fullMsgs, temperature),
        signal: AbortSignal.timeout(25000),
      });
      const data = await aiRes.json();
      if (!aiRes.ok) { lastErr = data.error?.message || `${name} error ${aiRes.status}`; continue; }

      const text = prov.extract(data);
      if (!text) { lastErr = 'Respons kosong'; continue; }

      return res.status(200).json({ text, provider: name, model: usedModel, remaining: rate.remaining });
    } catch(e) { lastErr = e.message; continue; }
  }

  const anyKey = Object.values(PROVIDERS).some(p => !!process.env[p.keyEnv]);
  return res.status(anyKey ? 503 : 501).json({
    error: anyKey ? (lastErr || 'Provider error') : 'API key belum dikonfigurasi di hosting.',
    code: anyKey ? 'PROVIDER_ERROR' : 'NO_API_KEY',
    text: localFallback(mode),
    provider: 'local', model: 'fallback', remaining: rate.remaining,
  });
}
