/**
 * Netlify Function: /api/ai-chat
 * Production-ready AI abstraction layer
 * Supports: OpenAI, Anthropic Claude, Google Gemini
 * Features: rate limiting, system prompts, multi-turn conversation
 */
const { createClient } = require('@supabase/supabase-js');

// ── PROVIDER CONFIG ──────────────────────────────────────────────────
/* Banyak penyedia memakai bentuk API yang SAMA dengan OpenAI (endpoint
   /chat/completions, body {model, messages}, auth Bearer). Pabrik kecil ini
   memakai ulang bentuk itu supaya menambah penyedia baru tidak berarti
   menyalin format/extract yang identik. */
const openAICompatible = (url, keyEnv, defaultModel, extraHeaders) => ({
  url, keyEnv, defaultModel,
  format: (model, messages, temp) => ({
    model, messages, temperature: temp, max_tokens: 1200,
  }),
  extract: (data) => data.choices?.[0]?.message?.content || '',
  ...(extraHeaders ? { headers: extraHeaders } : {}),
});

/* Nama model boleh ditimpa lewat environment. Penyedia rutin memensiunkan
   nama model, dan tanpa ini setiap pensiun berarti ganti kode + deploy ulang;
   dengan ini cukup ubah satu variabel di dasbor hosting. */
const MODEL = (envKey, fallback) => process.env[envKey] || fallback;

const PROVIDERS = {
  openai: openAICompatible(
    'https://api.openai.com/v1/chat/completions',
    'OPENAI_API_KEY',
    MODEL('OPENAI_MODEL', 'gpt-4o-mini'),
  ),
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
    /* Pensiun kedua yang tercatat di sini: gemini-1.5-flash lebih dulu
       diganti ke gemini-2.0-flash, lalu gemini-2.0-flash sendiri dipensiunkan
       Google (dikonfirmasi lewat respons API sungguhan: "This model
       models/gemini-2.0-flash is no longer available... use
       models/gemini-3.6-flash"). Nama model bisa diganti lewat GEMINI_MODEL
       tanpa menyentuh kode -- itulah kenapa nilainya dibaca dari environment,
       bukan konstanta biasa. */
    defaultModel: MODEL('GEMINI_MODEL', 'gemini-3.6-flash'),
    format: (model, messages) => ({
      contents: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: { parts: [{ text: messages.find(m => m.role === 'system')?.content || '' }] },
      /* Dulu 600 sementara penyedia lain 1200, jadi jawaban di jalur GRATIS
         terpotong lebih awal tanpa alasan. Disamakan. */
      generationConfig: { maxOutputTokens: 1200 },
    }),
    extract: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    noAuthHeader: true,
  },

  /* ── Penyedia dengan tingkat GRATIS ────────────────────────────────
     Keduanya tetap butuh kunci API, tapi kuncinya diperoleh tanpa biaya dan
     tanpa kartu kredit — berbeda dari openai/anthropic di atas yang menagih
     per token. Dipakai lewat mekanisme fallback yang sudah ada: begitu salah
     satu kuncinya terpasang dan kunci berbayar tidak ada, seluruh fitur AI
     situs otomatis memakainya. */
  groq: openAICompatible(
    'https://api.groq.com/openai/v1/chat/completions',
    'GROQ_API_KEY',
    // llama-3.3-70b-versatile dipensiunkan dari tingkat gratis Groq --
    // dikonfirmasi respons API sungguhan: "The model llama-3.3-70b-versatile
    // does not exist or you do not have access to it." Bukan sekadar ganti
    // nama seperti Gemini sebelumnya: seluruh model chat Llama sudah hilang
    // dari daftar tingkat gratis Groq (per docs/rate-limits mereka), diganti
    // model bobot-terbuka lain -- gpt-oss-120b (OpenAI, di-hosting Groq)
    // adalah yang paling sepadan sebagai pengganti umum.
    MODEL('GROQ_MODEL', 'openai/gpt-oss-120b'),
  ),

  openrouter: openAICompatible(
    'https://openrouter.ai/api/v1/chat/completions',
    'OPENROUTER_API_KEY',
    MODEL('OPENROUTER_MODEL', 'meta-llama/llama-3.3-70b-instruct:free'),
    /* OpenRouter memakai header ini untuk atribusi; opsional, tapi tanpa
       Referer permintaan dari kunci gratis lebih sering dibatasi. */
    () => ({
      'HTTP-Referer': process.env.SITE_URL || 'https://nihonggoproacademy.netlify.app',
      'X-Title': 'Nihongo Pro Academy',
    }),
  ),
};

// ── RATE LIMITING ────────────────────────────────────────────────────
const memStore = new Map();
/* Batas bisa dinaikkan lewat environment tanpa menyentuh kode. Nilai
   bawaannya sengaja TIDAK diubah: menaikkan kuota adalah keputusan biaya &
   penyalahgunaan milik pemilik situs, bukan default yang pantas saya geser
   sendiri. Pada penyedia bertarif gratis, menaikkan AI_FREE_DAILY adalah
   cara membuat fitur AI benar-benar terpakai penuh. */
const num = (envKey, fallback) => {
  const v = Number(process.env[envKey]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
const RATE_LIMIT = {
  free:    { daily: num('AI_FREE_DAILY', 10),     perMinute: num('AI_FREE_PER_MIN', 3) },
  premium: { daily: num('AI_PREMIUM_DAILY', 500), perMinute: num('AI_PREMIUM_PER_MIN', 20) },
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

  translate: `Kamu adalah Tanaka Sensei, penerjemah profesional Jepang-Indonesia dari platform Nihongo Pro Academy.
TUGAS: Terjemahkan teks yang diberikan user, dua arah (Jepang→Indonesia atau Indonesia→Jepang) — deteksi otomatis bahasa sumber dari teks, kecuali user secara eksplisit meminta arah tertentu.
FORMAT RESPONS:
訳: [hasil terjemahan]
読み方: [romaji, HANYA jika hasil/sumbernya bahasa Jepang — lewati baris ini jika tidak relevan]
💡 [catatan singkat: nuansa makna, tingkat formalitas, atau alternatif kata — HANYA jika benar-benar perlu, jangan dipaksakan]
ATURAN:
- Utamakan hasil terjemahan yang ringkas dan natural, bukan terjemahan kaku kata-per-kata
- Pertahankan nuansa formal/informal dari teks asli
- Untuk 1 kata/frasa ambigu, beri 1-2 alternatif arti singkat dipisah "/"
- Jangan menambahkan basa-basi atau penjelasan panjang di luar format di atas`,

  kanji: `Kamu adalah Kanji Sensei dari platform Nihongo Pro Academy.
TUGAS: Jelaskan 1 kanji yang ditanyakan user secara ringkas dan terstruktur.
FORMAT RESPONS:
漢字: [kanji]
読み方: [cara baca on'yomi & kun'yomi utama]
意味: [arti dalam bahasa Indonesia]
画数: [jumlah goresan]
例: [1-2 contoh kata yang memakai kanji ini, dengan bacaan & arti singkat]
Ringkas, tanpa basa-basi.`,

  vocabulary: `Kamu adalah Vocabulary Sensei dari platform Nihongo Pro Academy.
TUGAS: Jelaskan 1 kata/frasa bahasa Jepang yang ditanyakan user secara ringkas.
FORMAT RESPONS:
単語: [kata]
読み方: [cara baca]
意味: [arti dalam bahasa Indonesia]
例文: [1 contoh kalimat memakai kata ini, dengan terjemahan]
Ringkas, tanpa basa-basi.`,

  sentence: `Kamu adalah Sentence Coach dari platform Nihongo Pro Academy.
TUGAS: Buatkan 2-3 contoh kalimat bahasa Jepang natural memakai kata/pola yang diberikan user, sesuai konteks yang diminta.
FORMAT RESPONS per kalimat:
日本語: [kalimat Jepang]
読み方: [romaji]
意味: [terjemahan Indonesia]
Ringkas, tanpa basa-basi di luar format di atas.`,
};

// ── ORIGIN VALIDATION ────────────────────────────────────────────────
// Dulu Access-Control-Allow-Origin: '*' — mengizinkan domain MANAPUN memanggil
// endpoint ini, berisiko penyalahgunaan API key & kuota rate-limit user lain.
// Sekarang hanya origin resmi NihongoPro (+ localhost untuk pengembangan)
// yang diizinkan.
const ALLOWED_ORIGINS = [
  'https://nihonggoproacademy.netlify.app',
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
  //
  // Kalau provider yang diminta tidak punya kunci, JATUH KE provider lain yang
  // punya — bukan langsung gagal. Sebelumnya tidak begitu, dan akibatnya halus:
  // request default-nya `provider = 'openai'` (lihat destructuring di atas) dan
  // tidak ada satu halaman pun yang mengirim provider lain. Jadi siapa pun yang
  // mengikuti netlify.toml — yang mendokumentasikan ANTHROPIC_API_KEY sebagai
  // kunci utama — mengisi kunci Anthropic dengan benar, lalu SETIAP fitur AI
  // tetap membalas 501 "API key untuk openai belum dikonfigurasi". Kunci sudah
  // benar, dokumentasi sudah benar, hasilnya tetap mati.
  let namaProvider = PROVIDERS[provider] ? provider : 'openai';
  let prov = PROVIDERS[namaProvider];
  let apiKey = process.env[prov.keyEnv];
  if (!apiKey) {
    const tersedia = Object.keys(PROVIDERS).find((n) => process.env[PROVIDERS[n].keyEnv]);
    if (tersedia) {
      namaProvider = tersedia;
      prov = PROVIDERS[tersedia];
      apiKey = process.env[prov.keyEnv];
    }
  }
  if (!apiKey) {
    const daftar = Object.values(PROVIDERS).map((p) => p.keyEnv).join(', ');
    return {
      statusCode: 501, headers: CORS,
      body: JSON.stringify({
        error: 'Fitur AI belum aktif: tidak ada kunci API yang terpasang. '
             + `Set salah satu di Netlify (Site settings → Environment variables): ${daftar}.`,
        code: 'NO_API_KEY',
      }),
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

  // Kandidat provider untuk DICOBA BERURUTAN saat runtime -- dimulai dari
  // yang barusan dipilih, lalu provider LAIN yang kuncinya juga terpasang.
  //
  // GENUINELY DITAMBAHKAN: sebelum ini, "fallback" cuma bekerja saat kunci
  // provider yang diminta TIDAK ADA SAMA SEKALI (lihat blok "Select
  // provider" di atas) -- begitu kuncinya ADA tapi provider itu gagal saat
  // runtime (429 kuota habis, 5xx sedang gangguan, dst.), errornya langsung
  // dikembalikan ke klien, walau provider lain yang punya kunci masih sehat.
  // Dikonfirmasi nyata di produksi: satu-satunya kunci yang terpasang
  // (Gemini) kena kuota Google "generate_content_free_tier_requests" akibat
  // pengujian beruntun, dan SETIAP fitur AI di situs (semuanya lewat fungsi
  // yang sama) ikut mati bersamaan -- padahal sesuai desain multi-provider
  // di CLAUDE.md, mestinya cukup satu provider lain yang punya kunci untuk
  // tetap hidup.
  const candidates = [namaProvider, ...Object.keys(PROVIDERS).filter(
    (n) => n !== namaProvider && process.env[PROVIDERS[n].keyEnv]
  )];

  // Anggaran waktu BERSAMA lintas semua percobaan, bukan per percobaan --
  // batas sinkron Netlify 26 detik itu untuk SELURUH pemanggilan fungsi,
  // jadi mencoba provider kedua dengan timeout 25 detik penuh lagi (seperti
  // percobaan pertama) hampir pasti membuat Netlify sendiri yang memotong
  // fungsi sebelum sempat membalas apa pun ke klien. 24 detik menyisakan
  // ruang untuk overhead verifikasi Supabase/rate-limit yang sudah berjalan
  // sebelum baris ini.
  const deadline = Date.now() + 24000;
  let lastFailure = { statusCode: 502, body: { error: 'Gagal menghubungi AI provider' } };

  for (const candidateName of candidates) {
    const remaining = deadline - Date.now();
    if (remaining < 3000) break; // sisa waktu tidak cukup untuk percobaan berarti

    const candidateProv = PROVIDERS[candidateName];
    const candidateKey = process.env[candidateProv.keyEnv];

    try {
      const reqBody = candidateProv.format(
        body.model || candidateProv.defaultModel,
        fullMessages,
        body.temperature || 0.5
      );

      const url = typeof candidateProv.url === 'function'
        ? candidateProv.url(body.model || candidateProv.defaultModel, candidateKey)
        : candidateProv.url;

      const reqHeaders = {
        'Content-Type': 'application/json',
        ...(candidateProv.noAuthHeader ? {} : { 'Authorization': `Bearer ${candidateKey}` }),
        ...(candidateProv.headers ? candidateProv.headers(candidateKey) : {}),
      };

      // Timeout per percobaan dibatasi sisa anggaran BERSAMA di atas, supaya
      // satu provider yang menggantung tidak menghabiskan seluruh jatah 26
      // detik dan menutup kemungkinan mencoba kandidat berikutnya.
      const _ac = new AbortController();
      const _to = setTimeout(() => _ac.abort(), Math.min(remaining - 500, 15000));
      let res, data;
      try {
        res = await fetch(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(reqBody), signal: _ac.signal });
        data = await res.json();
      } catch (fetchErr) {
        clearTimeout(_to);
        const isTimeout = fetchErr.name === 'AbortError';
        lastFailure = { statusCode: isTimeout ? 504 : 502, body: { error: isTimeout ? 'AI timeout — coba lagi' : 'Gagal menghubungi AI provider' } };
        continue; // coba kandidat berikutnya
      }
      clearTimeout(_to);

      if (!res.ok) {
        const errMsg = data.error?.message || data.error?.code || `Provider error ${res.status}`;
        lastFailure = { statusCode: res.status, body: { error: errMsg } };
        continue; // provider ini gagal (mis. kuota habis) -- coba kandidat lain
      }

      const text = candidateProv.extract(data);

      return {
        statusCode: 200, headers: CORS,
        body: JSON.stringify({
          text,
          provider: candidateName,   // yang BENAR-BENAR menjawab, bukan yang diminta di awal
          model: body.model || candidateProv.defaultModel,
          remaining: rate.limit - rate.count,
          usage: data.usage || null,
        }),
      };
    } catch (err) {
      console.error('AI Chat Error:', err);
      lastFailure = { statusCode: 500, body: { error: 'Internal server error. Coba lagi.' } };
    }
  }

  // Semua kandidat gagal (atau tinggal satu-satunya dari awal, seperti kasus
  // paling umum saat hanya satu kunci provider yang terpasang) -- kembalikan
  // kegagalan TERAKHIR, bukan yang pertama, supaya pesannya mencerminkan
  // percobaan paling relevan/terbaru.
  return { statusCode: lastFailure.statusCode, headers: CORS, body: JSON.stringify(lastFailure.body) };
};
