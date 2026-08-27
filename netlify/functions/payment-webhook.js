/**
 * Netlify Function: /api/payment-webhook
 * Menerima notifikasi status pembayaran dari Midtrans (server-to-server).
 *
 * INI SUMBER KEBENARAN status premium — BUKAN localStorage frontend.
 * Frontend boleh menampilkan "sedang diproses", tapi hak premium hanya
 * diberikan di sini setelah signature Midtrans terverifikasi.
 *
 * Set URL ini di Midtrans Dashboard → Settings → Configuration →
 *   Payment Notification URL: https://<situs-anda>/api/payment-webhook
 *
 * ENV VARS:
 *   MIDTRANS_SERVER_KEY       (untuk verifikasi signature)
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY  (untuk menandai user premium)
 */
const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return { statusCode: 503, body: 'Payment belum dikonfigurasi' };

  let n;
  try { n = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, body: 'Body tidak valid' }; }

  // ── Verifikasi signature Midtrans ──
  // signature = sha512(order_id + status_code + gross_amount + server_key)
  const expected = crypto
    .createHash('sha512')
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${serverKey}`)
    .digest('hex');

  if (expected !== n.signature_key) {
    // Signature tidak cocok → request palsu, tolak.
    return { statusCode: 403, body: 'Signature tidak valid' };
  }

  // ── Tentukan apakah pembayaran sukses ──
  const status = n.transaction_status;
  const fraud = n.fraud_status;
  const isPaid =
    (status === 'capture' && fraud === 'accept') ||
    status === 'settlement';

  if (!isPaid) {
    // pending / deny / expire / cancel → tidak memberikan premium, cukup 200 OK
    // supaya Midtrans tidak mengulang notifikasi.
    return { statusCode: 200, body: JSON.stringify({ received: true, status }) };
  }

  // ── Ekstrak planId dan userId dari order_id ──
  // Format: NP-<planId>-<timestamp>-<rand>-U<userIdBase64Url>
  const orderId = n.order_id || '';
  const uMatch = orderId.match(/-U([A-Za-z0-9_-]+)$/);
  let userId = null;
  if (uMatch) {
    try {
      let b64 = uMatch[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      userId = Buffer.from(b64, 'base64').toString('utf8');
    } catch (e) { userId = null; }
  }
  const withoutUserSuffix = uMatch ? orderId.slice(0, orderId.length - uMatch[0].length) : orderId;
  const planId = withoutUserSuffix.split('-').slice(1, -2).join('-');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!userId) {
    // Tanpa userId, tidak ada akun yang bisa ditandai premium. Catat sebagai
    // anomali tapi tetap balas 200 (bukan error Midtrans) supaya tidak diulang
    // tanpa henti — masalah ini ada di sisi kita, bukan sisi Midtrans.
    return { statusCode: 200, body: JSON.stringify({ received: true, status, warning: 'userId tidak ditemukan di order_id' }) };
  }

  if (supabaseUrl && serviceKey) {
    try {
      // 1) Catat transaksi untuk audit trail (tabel payments — lihat supabase-schema.sql).
      await fetch(`${supabaseUrl}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          order_id: orderId,
          user_id: userId,
          plan_id: planId,
          amount: Number(n.gross_amount),
          status: 'paid',
          paid_at: new Date().toISOString(),
        }),
      });

      // 2) INI YANG SEBENARNYA MEMBERI AKSES: tandai is_premium = true pada
      // user_progress milik user tersebut. Tanpa langkah ini, pembayaran
      // tercatat tapi user tidak pernah benar-benar mendapat akses premium.
      const upsertResp = await fetch(`${supabaseUrl}/rest/v1/user_progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ user_id: userId, is_premium: true }),
      });
      if (!upsertResp.ok) {
        return { statusCode: 500, body: 'Gagal memberikan akses premium' };
      }
    } catch (err) {
      // Jika gagal tulis DB, kembalikan 500 supaya Midtrans MENGULANG notifikasi
      // (jangan sampai pembayaran hilang tanpa tercatat / user tak dapat akses).
      return { statusCode: 500, body: 'Gagal mencatat pembayaran' };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true, status: 'paid', plan: planId, userId }) };
};
