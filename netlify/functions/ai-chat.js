/**
 * Netlify Function: /api/ai-chat
 * Production-ready AI abstraction layer
 * Supports: OpenAI, Anthropic Claude, Google Gemini
 * Features: rate limiting, system prompts, multi-turn conversation
 */
const { createClient } = require('@supabase/supabase-js');

// ── PROVIDER CONFIG ──────────────────────────────────────────────────
const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    format: (model, messages, temp) => ({
      model, messages, temperature: temp, max_tokens: 1200,
    }),
    extract: (data) => data.choices?.[0]?.message?.content || '',
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-haiku-4-5-20251001',
    format: (model, messages, temp) => {
      const sys = messages.find(m => m.role === 'system');
      const rest = messages.filter(m => m.role !== 'system');
      return { model, messages: rest, system: sys?.content || '', temperature: temp, max_tokens: 1200 };
    },
    extract: (data) => data.content?.[0]?.text || '',
    headers: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }),
  },
  gemini: {
    url: (model, key) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    keyEnv: 'GEMINI_API_KEY',
    defaultModel: 'gemini-1.5-flash',
    format: (model, messages) => ({
      contents: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: { parts: [{ text: messages.find(m => m.role === 'system')?.content || '' }] },
      generationConfig: { maxOutputTokens: 600 },
    }),
    extract: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    noAuthHeader: true,
  },
};

// ── RATE LIMITING ────────────────────────────────────────────────────
const memStore = new Map();
const RATE_LIMIT = {
  free:    { daily: 10,  perMinute: 3 },
  premium: { daily: 500, perMinute: 20 },
};

async function checkRateLimit(userId, isPremium) {
  // Use Supabase as rate limit store if available
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const day = new Date().toISOString().slice(0, 10);
      const { data: row } = await sb.from('rate_limits').select().eq('user_id', userId).eq('date', day).single();
      const count = (row?.count || 0) + 1;
      const limit = isPremium ? RATE_LIMIT.premium.daily : RATE_LIMIT.free.daily;
      if (count > limit) return { allowed: false, count, limit };
      await sb.from('rate_limits').upsert({ user_id: userId, date: day, count }, { onConflict: 'user_id,date' });
      return { allowed: true, count, limit };
    } catch (_) {}
  }
  // Fallback: in-memory
  const day = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${day}`;
  const count = (memStore.get(key) || 0) + 1;
  memStore.set(key, count);
  const limit = isPremium ? RATE_LIMIT.premium.daily : RATE_LIMIT.free.daily;
  return { allowed: count <= limit, count, limit };
}

// ── SYSTEM PROMPTS ───────────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  grammar: `Kamu adalah Tanaka Sensei, pakar grammar bahasa Jepang dari platform Nihongo Pro Academy.
TUGAS: Koreksi grammar kalimat Jepang user.
FORMAT RESPONS:
❌ Salah: [kalimat asli]
✅ Benar: [koreksi]
📖 Penjelasan: [aturan grammar dalam bahasa Indonesia]
💡 Tip: [tips mengingat]
Jika tidak ada kesalahan, katakan bagus dan berikan saran untuk meningkatkan naturalness.`,

  conversation: `Kamu adalah Tanaka Sensei, partner percakapan bahasa Jepang.
TUGAS: Percakapan natural sesuai level dan skenario.
ATURAN:
- Gunakan bahasa sesuai level user (N5=sangat sederhana, N1=advanced)
- Koreksi kesalahan dengan gentle, dalam tanda [コレクション: ...]
- Vocabulary baru dalam [VOCAB: 語=arti]
- Respons max 3-4 kalimat, natural dan encouraging
- Akhiri dengan pertanyaan untuk lanjutkan percakapan`,

  jlpt: `Kamu adalah JLPT Coach profesional dari Nihongo Pro Academy.
TUGAS: Bantu persiapan ujian JLPT dengan soal, penjelasan, dan strategi.
FORMAT:
- Soal latihan dengan pilihan jawaban (A/B/C/D)
- Penjelasan jawaban benar + mengapa yang lain salah  
- Mnemonic untuk mengingat
- Tips strategi ujian
Fokus: grammar pattern, vocabulary usage, reading comprehension`,

  kaigo: `Kamu adalah Kaigo Language Specialist dari Nihongo Pro Academy.
TUGAS: Bahasa Jepang khusus lingkungan perawatan (介護).
FOKUS:
- Kosakata kaigo resmi (尊厳, 見守り, 申し送り, dll)
- Komunikasi dengan 利用者 (residen) dan 看護師 (perawat)
- Keigo yang tepat untuk lingkungan profesional kaigo
- Prosedur kaigo dalam bahasa Jepang (入浴介助, 食事介助, dll)
Format: Japanese → Reading → Arti → Contoh penggunaan nyata`,

  interview: `Kamu adalah pewawancara kerja perusahaan Jepang (formal).
TUGAS: Simulasi wawancara kerja dalam bahasa Jepang.
ATURAN:
- Ajukan pertanyaan interview formal satu per satu
- Evaluasi jawaban user (naturalness, keigo, content)
- Berikan feedback konstruktif setelah setiap jawaban
- Skenario: perusahaan Jepang atau fasilitas kaigo
Mulai dengan: どうぞよろしくお願いします。自己紹介からお願いします。`,

  writing: `Kamu adalah editor bahasa Jepang profesional.
TUGAS: Review dan koreksi tulisan bahasa Jepang.
ANALISIS:
1. Grammar (文法): Kesalahan tata bahasa
2. Naturalness (自然さ): Apakah terdengar natural bagi penutur asli
3. Formality (丁寧さ): Tingkat keformalan yang tepat
4. Kesan (印象): Kesan keseluruhan tulisan
FORMAT: Berikan versi yang diperbaiki + penjelasan perubahan`,

  kaiwa: `Kamu adalah aktor dalam roleplay percakapan bahasa Jepang.
TUGAS: Mainkan karakter sesuai skenario, respons dalam bahasa Jepang.
ATURAN:
- Mainkan karakter dengan konsisten (pelayan restoran, staff hotel, dll)
- Gunakan bahasa yang sesuai karakter dan situasi
- Jika user membuat kesalahan kritis, keluar dari karakter sebentar dan koreksi
- Berikan skor naturalness (1-10) di akhir setiap exchange
- Format: [Karakter]: dialog | [Feedback: ...]`,
};

// ── ORIGIN VALIDATION ────────────────────────────────────────────────
// Dulu Access-Control-Allow-Origin: '*' — mengizinkan domain MANAPUN memanggil
// endpoint ini, berisiko penyalahgunaan API key & kuota rate-limit user lain.
// Sekarang hanya origin resmi NihongoPro (+ localhost untuk pengembangan)
// yang diizinkan.
const ALLOWED_ORIGINS = [
  'https://nihongopro.id',
  'https://www.nihongopro.id',
  'http://localhost:8888',   // netlify dev
  'http://localhost:3000',
];

function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type':                 'application/json',
    'Vary':                         'Origin',
  };
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────
exports.handler = async (event) => {
  const CORS = corsHeadersFor(event);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const {
    messages = [],        // Full conversation history
    mode = 'conversation', // AI mode
    level = 'N5',          // JLPT level
    scenario = '',         // Scenario context
    provider = 'openai',   // AI provider
  } = body;

  // ── Input validation: cegah abuse & biaya membengkak ──
  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'messages harus array non-kosong' }) };
  }
  if (messages.length > 50) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Terlalu banyak pesan (maks 50)' }) };
  }
  const _totalChars = messages.reduce((n, m) => n + (typeof m?.content === 'string' ? m.content.length : JSON.stringify(m?.content || '').length), 0);
  if (_totalChars > 40000) {
    return { statusCode: 413, headers: CORS, body: JSON.stringify({ error: 'Input terlalu panjang (maks ~40k karakter)' }) };
  }

  // GENUINELY DIPERBAIKI (Fase HH, Audit Database): dikonfirmasi
  // `userId` sebelumnya diambil MENTAH dari body request client
  // (`body.userId || 'anonymous'`) tanpa verifikasi apa pun, dan dipakai
  // LANGSUNG sebagai kunci rate-limiting. Ini genuinely memungkinkan
  // BYPASS TOTAL rate-limit -- siapa pun bisa mengirim `userId` acak
  // berbeda di setiap request untuk mendapat kuota baru setiap saat,
  // berpotensi menyebabkan biaya API (dibayar per token) yang tidak
  // terbatas bagi pemilik proyek. Diperbaiki dengan mengikat identitas
  // rate-limit ke SUMBER YANG TIDAK BISA DIPALSUKAN KLIEN: token JWT
  // Supabase yang sudah diverifikasi server (sama seperti verifikasi
  // `isPremium` di bawah), dengan fallback ke alamat IP klien (dari
  // header Netlify, tidak bisa diklaim bebas oleh pemanggil) untuk
  // permintaan tanpa token -- memastikan TIDAK ADA jalur yang genuinely
  // bebas dari pembatasan berarti, sesuai keputusan pemilik proyek untuk
  // mewajibkan identitas genuine sambil tetap menyediakan fallback IP.
  let isPremium = false;
  let verifiedUserId = null;
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  if (authHeader.startsWith('Bearer ') && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const sbRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': authHeader,
          'apikey': process.env.SUPABASE_ANON_KEY
        }
      });
      if (sbRes.ok) {
        const sbUser = await sbRes.json();
        isPremium = !!(sbUser?.user_metadata?.is_premium || sbUser?.app_metadata?.is_premium);
        verifiedUserId = sbUser?.id || null;
      }
    } catch (_) { isPremium = false; }
  }
  // Fallback: alamat IP klien genuine dari header Netlify (bukan klaim
  // client) -- x-nf-client-connection-ip paling andal, x-forwarded-for
  // (segmen pertama) sebagai cadangan.
  const clientIp = event.headers['x-nf-client-connection-ip']
    || (event.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || 'unknown-ip';
  const userId = verifiedUserId || `ip:${clientIp}`;

  // Input validation
  if (!messages.length && !body.prompt) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Messages required' }) };
  }

  // Rate limiting
  const rate = await checkRateLimit(userId, isPremium);
  if (!rate.allowed) {
    return {
      statusCode: 429, headers: CORS,
      body: JSON.stringify({
        error: `Limit harian tercapai (${rate.count}/${rate.limit}). Upgrade Premium untuk unlimited.`,
        code: 'RATE_LIMITED', remaining: 0,
      }),
    };
  }

  // Select provider
  const prov = PROVIDERS[provider] || PROVIDERS.openai;
  const apiKey = process.env[prov.keyEnv];
  if (!apiKey) {
    return {
      statusCode: 501, headers: CORS,
      body: JSON.stringify({ error: `API key untuk ${provider} belum dikonfigurasi.` }),
    };
  }

  // Build system prompt
  const systemContent = [
    SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.conversation,
    `\nKonteks: Level=${level}, Skenario=${scenario || 'umum'}`,
    `User ID: ${userId} | Premium: ${isPremium}`,
  ].join('\n');

  // Build messages array
  const fullMessages = [
    { role: 'system', content: systemContent },
    // Support both old format (prompt) and new (messages array)
    ...(body.prompt
      ? [{ role: 'user', content: String(body.prompt) }]
      : messages.slice(-12) // Last 12 messages for context
    ),
  ];

  try {
    const reqBody = prov.format(
      body.model || prov.defaultModel,
      fullMessages,
      body.temperature || 0.5
    );

    const url = typeof prov.url === 'function'
      ? prov.url(body.model || prov.defaultModel, apiKey)
      : prov.url;

    const reqHeaders = {
      'Content-Type': 'application/json',
      ...(prov.noAuthHeader ? {} : { 'Authorization': `Bearer ${apiKey}` }),
      ...(prov.headers ? prov.headers(apiKey) : {}),
    };

    // Timeout 30 detik agar function tidak menggantung (batas Netlify 26s untuk sync)
    const _ac = new AbortController();
    const _to = setTimeout(() => _ac.abort(), 25000);
    let res, data;
    try {
      res = await fetch(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(reqBody), signal: _ac.signal });
      data = await res.json();
    } catch (fetchErr) {
      clearTimeout(_to);
      const isTimeout = fetchErr.name === 'AbortError';
      return { statusCode: isTimeout ? 504 : 502, headers: CORS, body: JSON.stringify({ error: isTimeout ? 'AI timeout — coba lagi' : 'Gagal menghubungi AI provider' }) };
    }
    clearTimeout(_to);

    if (!res.ok) {
      const errMsg = data.error?.message || data.error?.code || `Provider error ${res.status}`;
      return { statusCode: res.status, headers: CORS, body: JSON.stringify({ error: errMsg }) };
    }

    const text = prov.extract(data);

    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({
        text,
        provider,
        model: body.model || prov.defaultModel,
        remaining: rate.limit - rate.count,
        usage: data.usage || null,
      }),
    };
  } catch (err) {
    console.error('AI Chat Error:', err);
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: 'Internal server error. Coba lagi.' }),
    };
  }
};
