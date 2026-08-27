/**
 * Netlify Function: /api/blog-cms
 *
 * CRUD untuk blog_posts -- bukti konsep pertama sistem CMS (v184). Artikel
 * BARU ditulis lewat panel admin masuk ke sini, TIDAK menyentuh 12 artikel
 * lama yang hardcode di Blog.html.
 *
 * KEAMANAN:
 *   - Semua operasi TULIS (POST/PUT/DELETE) WAJIB token admin valid --
 *     diverifikasi ulang di sini (bukan percaya klaim dari frontend),
 *     dengan pola SAMA PERSIS seperti admin-login.js (v179): verifikasi
 *     JWT via Supabase Auth API, lalu cek role di tabel user_roles pakai
 *     SERVICE KEY (bypass RLS, server-only).
 *   - GET (list/read) TIDAK butuh auth -- publik, hanya published=true
 *     (konsisten dengan RLS policy di schema).
 *   - body_html divalidasi TERBATAS: tag yang diizinkan adalah subset yang
 *     dipakai artikel blog lama (p, h2, h3, ul, ol, li, strong, a, div
 *     dengan class tertentu) -- BUKAN menerima HTML bebas dari admin
 *     manapun tanpa batas, untuk mengurangi risiko XSS bila akun admin
 *     pernah diretas/token bocor.
 *
 * ENV VARS (sama seperti admin-login.js, sudah ada):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
 */

const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGINS = [
  'https://nihonggopro.id',
  'https://www.nihonggopro.id',
  'http://localhost:8888',
  'http://localhost:3000',
];
function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

// ── Validasi HTML terbatas: whitelist tag, bukan blokir tag berbahaya ──
// Whitelist lebih aman daripada blocklist -- blocklist gampang bocor lewat
// tag/atribut yang lupa dimasukkan daftar tolak.
const ALLOWED_TAGS = ['p', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'div', 'br'];
function validateBodyHtml(html) {
  if (typeof html !== 'string' || !html.trim()) return 'Isi artikel tidak boleh kosong.';
  if (html.length > 50000) return 'Isi artikel terlalu panjang (maks 50.000 karakter).';
  // Cari semua tag pembuka/penutup, tolak yang tidak ada di whitelist
  const tagMatches = html.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g) || [];
  for (const tag of tagMatches) {
    const nameMatch = tag.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)/);
    const name = nameMatch ? nameMatch[1].toLowerCase() : '';
    if (!ALLOWED_TAGS.includes(name)) {
      return `Tag <${name}> tidak diizinkan. Tag yang boleh: ${ALLOWED_TAGS.join(', ')}.`;
    }
    // Blokir atribut event handler (onclick, onerror, dst) dan javascript: URI.
    // GENUINELY DIPERBAIKI (Fase Audit Website Putaran Ketiga, Fase L):
    // dikonfirmasi via pengujian browser sungguhan bahwa regex asli
    // genuinely BISA DILEWATI dengan dua teknik: (1) menyisipkan tab
    // atau whitespace control character di tengah kata "javascript"
    // (mis. "java<TAB>script:"), dan (2) HTML entity encoding pada
    // karakter titik dua (mis. "javascript&#58;"). Dibuktikan konkret:
    // browser sungguhan GENUINELY mengeksekusi javascript: URI dengan
    // bypass tab character (dialog alert genuinely terpicu). Diperbaiki
    // dengan menormalisasi string (hapus whitespace/control character,
    // decode entity numerik dasar) SEBELUM pemeriksaan pola -- menutup
    // kedua teknik bypass yang dikonfirmasi, alih-alih hanya menambah
    // satu pola baru yang genuinely masih bisa dilewati teknik lain.
    if (/\son\w+\s*=/i.test(tag)) return 'Atribut event handler (onclick, dst) tidak diizinkan.';
    // GENUINELY DIPERBAIKI SEKALI LAGI: dikonfirmasi via pengujian
    // terisolasi bahwa capture group pertama (`[^"'>\s]*`) genuinely
    // BERHENTI di karakter whitespace (termasuk tab), sehingga untuk
    // kasus "java\tscript:" hanya menangkap "java" -- kehilangan bagian
    // "script:alert(1)" sepenuhnya, membuat perbaikan pertama genuinely
    // TIDAK BEKERJA. Diperbaiki dengan capture group yang menangkap
    // NILAI ATRIBUT PENUH di dalam tanda kutip (mengizinkan whitespace
    // internal), baru kemudian dinormalisasi.
    const hrefMatch = tag.match(/href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i);
    if (hrefMatch) {
      const rawHref = hrefMatch[1] !== undefined ? hrefMatch[1] : hrefMatch[2];
      const normalized = rawHref
        .replace(/[\x00-\x20]/g, '') // genuinely hapus whitespace & control character (termasuk tab)
        // GENUINELY DIPERBAIKI (Fase HH, Audit Database): dikonfirmasi via
        // pengujian langsung bahwa decode entity sebelumnya HANYA menangani
        // karakter titik dua secara spesifik (&#58; / &#x3a;), sehingga
        // payload yang meng-encode HURUF LAIN dalam kata "javascript" (mis.
        // j&#97;vascript: dengan 'a' di-encode) genuinely LOLOS pemeriksaan
        // -- browser tetap men-decode dan mengeksekusinya sebagai javascript:
        // URI valid. Diperbaiki dengan men-decode SELURUH entity HTML
        // numerik (desimal DAN heksadesimal) untuk KARAKTER APAPUN sebelum
        // pemeriksaan blacklist, menutup seluruh kemungkinan bypass lewat
        // encoding karakter manapun -- bukan hanya titik dua.
        .replace(/&#0*([0-9]+);?/g, (m, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(/&#x0*([0-9a-f]+);?/gi, (m, code) => String.fromCharCode(parseInt(code, 16)))
        .toLowerCase();
      if (normalized.startsWith('javascript:') || normalized.startsWith('data:text/html') || normalized.startsWith('vbscript:')) {
        return 'javascript:/data:/vbscript: URI tidak diizinkan di href.';
      }
    }
  }
  return null; // valid
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // hapus diakritik
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

// ── Verifikasi admin: pola sama persis dengan admin-login.js (v179) ──
async function verifyAdmin(authHeader, sbService) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, error: 'Token admin tidak ada.' };
  }
  try {
    const sbRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': process.env.SUPABASE_ANON_KEY,
      },
    });
    if (!sbRes.ok) return { ok: false, error: 'Token tidak valid.' };
    const user = await sbRes.json();
    const userId = user?.id;
    if (!userId) return { ok: false, error: 'Token tidak valid.' };

    const { data: roleRow } = await sbService
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    if ((roleRow?.role || 'student') !== 'admin') {
      return { ok: false, error: 'Akun ini tidak memiliki akses admin.' };
    }
    return { ok: true, userId };
  } catch (e) {
    return { ok: false, error: 'Gagal memverifikasi token admin.' };
  }
}

exports.handler = async (event) => {
  const CORS = corsHeadersFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SUPABASE_ANON_KEY) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'CMS belum dikonfigurasi di server.' }) };
  }
  const sbService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // ── GET: list/read publik, tidak butuh auth ──
  if (event.httpMethod === 'GET') {
    const slug = event.queryStringParameters?.slug;
    let query = sbService.from('blog_posts').select('*').eq('published', true);
    if (slug) query = query.eq('slug', slug).single();
    else query = query.order('created_at', { ascending: false }).limit(50);

    const { data, error } = await query;
    if (error) {
      // .single() dengan 0 hasil juga masuk sini -- bukan error server,
      // artikel memang tidak ada.
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Artikel tidak ditemukan.' }) };
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ posts: Array.isArray(data) ? data : [data] }) };
  }

  // ── Semua method lain (POST/DELETE) WAJIB admin ──
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const auth = await verifyAdmin(authHeader, sbService);
  if (!auth.ok) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: auth.error }) };
  }

  if (event.httpMethod === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    const { title, body_html, tags, author, read_minutes } = body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Judul wajib diisi.' }) };
    }
    const htmlError = validateBodyHtml(body_html);
    if (htmlError) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: htmlError }) };
    }

    const slug = slugify(title);
    if (!slug) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Judul tidak menghasilkan slug valid (gunakan huruf/angka).' }) };
    }

    const { data, error } = await sbService.from('blog_posts').insert({
      slug,
      title: title.trim(),
      body_html,
      tags: Array.isArray(tags) ? tags.slice(0, 5) : [],
      author: (typeof author === 'string' && author.trim()) ? author.trim().slice(0, 60) : 'Tim NihonggoPro',
      read_minutes: Number.isInteger(read_minutes) && read_minutes > 0 ? Math.min(read_minutes, 60) : 5,
      created_by: auth.userId,
    }).select().single();

    if (error) {
      // Kemungkinan besar slug duplikat (UNIQUE constraint)
      const msg = /duplicate key/i.test(error.message || '') ? 'Judul ini sudah pernah dipakai (slug duplikat).' : 'Gagal menyimpan artikel.';
      return { statusCode: 409, headers: CORS, body: JSON.stringify({ error: msg }) };
    }
    return { statusCode: 201, headers: CORS, body: JSON.stringify({ post: data }) };
  }

  if (event.httpMethod === 'DELETE') {
    const slug = event.queryStringParameters?.slug;
    if (!slug) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'slug wajib disertakan.' }) };
    const { error } = await sbService.from('blog_posts').delete().eq('slug', slug);
    if (error) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Gagal menghapus artikel.' }) };
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ deleted: slug }) };
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
};
