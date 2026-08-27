/**
 * Netlify Function: /api/create-payment
 * Membuat transaksi Midtrans Snap dan mengembalikan token untuk popup pembayaran.
 *
 * KEAMANAN:
 *   - MIDTRANS_SERVER_KEY adalah RAHASIA. Hanya boleh di sini (server), TIDAK di frontend.
 *   - Frontend hanya menerima `token` Snap, bukan Server Key.
 *   - Harga divalidasi server-side dari PLANS di bawah — TIDAK diambil dari request,
 *     supaya klien tidak bisa memalsukan harga.
 *
 * ENV VARS (set di Netlify Dashboard → Environment variables):
 *   MIDTRANS_SERVER_KEY   = SB-Mid-server-xxxx  (Sandbox) / Mid-server-xxxx (Production)
 *   MIDTRANS_IS_PRODUCTION = 'true' | 'false'  (default false = sandbox)
 */

// Katalog harga — SUMBER KEBENARAN harga ada di server, bukan frontend.
const PLANS = {
  'premium-monthly': { name: 'Premium Bulanan', price: 49000 },
  'premium-lifetime': { name: 'Premium Lifetime + Kaigo', price: 399000 },
};

// ── ORIGIN VALIDATION ────────────────────────────────────────────────
// '*' sebelumnya mengizinkan domain manapun memicu pembuatan transaksi
// Midtrans atas nama situs ini — risiko keamanan pada endpoint pembayaran.
const ALLOWED_ORIGINS = ['https://nihonggopro.id', 'https://www.nihonggopro.id', 'http://localhost:8888', 'http://localhost:3000'];
function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

exports.handler = async (event) => {
  const headers = corsHeadersFor(event);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Payment belum dikonfigurasi. Set MIDTRANS_SERVER_KEY di Netlify.' }),
    };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Silakan login terlebih dahulu.' }) };
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Autentikasi pembayaran belum dikonfigurasi.' }) };
  }

  let authUser;
  try {
    const userResp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': authHeader, 'apikey': process.env.SUPABASE_ANON_KEY },
    });
    if (!userResp.ok) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sesi login tidak valid. Silakan login kembali.' }) };
    }
    authUser = await userResp.json();
  } catch (_) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Layanan autentikasi sedang tidak tersedia.' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body tidak valid' }) }; }

  const plan = PLANS[body.planId];
  if (!plan) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paket tidak dikenal' }) };
  }

  // Data pelanggan (opsional, untuk struk Midtrans). Tidak dipakai untuk harga.
  const customer = {
    first_name: String(body.name || 'Pengguna').slice(0, 40),
    email: String(body.email || '').slice(0, 60),
  };

  // Identitas wajib berasal dari JWT yang diverifikasi, bukan dari body klien.
  const userId = String(authUser.id || '').trim();
  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'userId wajib diisi (silakan login terlebih dahulu).' }),
    };
  }

  // order_id menyimpan userId di bagian akhir (base64url, tanpa strip "-")
  // supaya webhook bisa mengekstraknya kembali tanpa ambigu terhadap "-"
  // dalam planId (mis. "premium-lifetime").
  const userIdEncoded = Buffer.from(userId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const orderId = `NP-${body.planId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-U${userIdEncoded}`;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const snapUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const payload = {
    transaction_details: { order_id: orderId, gross_amount: plan.price },
    item_details: [{ id: body.planId, price: plan.price, quantity: 1, name: plan.name }],
    customer_details: customer,
    credit_card: { secure: true },
  };

  try {
    const auth = Buffer.from(serverKey + ':').toString('base64');
    const resp = await fetch(snapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok || !data.token) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Gagal membuat transaksi', detail: data.error_messages || data }),
      };
    }

    // Frontend memakai `token` untuk snap.pay(token). orderId dikembalikan
    // supaya frontend bisa menampilkan status; verifikasi FINAL tetap via webhook.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token: data.token, orderId, plan: plan.name, amount: plan.price }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Kesalahan server saat memproses pembayaran' }),
    };
  }
};
