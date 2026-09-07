/**
 * Netlify Function: /api/group-tokens
 * ───────────────────────────────────────────────────────────────────
 * Grup kelas (pengajar, pelajar N5..N1, dsb.), token untuk bergabung, dan
 * ringkasan kelas untuk Teacher-Dashboard.html (anggota + progres + tugas).
 *
 * KENAPA SEMUANYA DI SERVER
 * Keanggotaan grup menentukan siapa melihat materi/tugas siapa, jadi ia tidak
 * boleh ditentukan klien. Dua hal khususnya hanya aman di sini:
 *   1. Verifikasi token — klien tidak pernah diberi daftar token, hanya
 *      mengirim satu tebakan dan menerima ya/tidak.
 *   2. Penulisan enrollments — RLS sengaja TIDAK memberi klien izin INSERT
 *      (lihat catatan perbaikan di supabase-schema.sql), sehingga satu-satunya
 *      jalan masuk grup adalah token yang lolos di sini.
 *
 * TOKEN
 * Dibuat dari crypto.randomBytes, ditampilkan SEKALI, dan disimpan hanya
 * sebagai SHA-256. Alfabetnya membuang karakter yang mudah tertukar saat
 * dibacakan atau disalin (0/O, 1/I/L) karena token ini akan diketik ulang
 * orang dari papan tulis atau pesan chat.
 *
 * ENV VARS: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
 */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGINS = [
  'https://nihonggoproacademy.netlify.app',
  'http://localhost:8888',
  'http://localhost:3000',
];

// Tanpa 0 O 1 I L — token ini disalin manual oleh manusia.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const TOKEN_LEN = 10;                 // 31^10 ≈ 8,2e14 kemungkinan
const REDEEM_ATTEMPTS_PER_DAY = 30;   // rem tebak-tebakan, per IP

function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/* Token dibaca manusia, jadi normalisasi dulu: huruf besar, buang spasi dan
   tanda hubung. Dengan begitu "n5-7k2m-9qxa" dan "N57K2M9QXA" sama saja. */
const normalizeToken = (s) => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

function generateToken(prefix) {
  const bytes = crypto.randomBytes(TOKEN_LEN);
  let out = '';
  for (let i = 0; i < TOKEN_LEN; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  const body = out.slice(0, 5) + '-' + out.slice(5);
  return prefix ? `${prefix}-${body}` : body;
}

/* Identitas pemanggil: JWT diverifikasi ke Supabase, peran dibaca dengan
   service key. Peran TIDAK PERNAH diambil dari body request. */
async function identify(authHeader, sbService) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, code: 401, error: 'Silakan masuk terlebih dahulu.' };
  }
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: process.env.SUPABASE_ANON_KEY },
    });
    if (!res.ok) return { ok: false, code: 401, error: 'Sesi tidak valid, silakan masuk lagi.' };
    const user = await res.json();
    if (!user?.id) return { ok: false, code: 401, error: 'Sesi tidak valid, silakan masuk lagi.' };

    const { data: roleRow } = await sbService
      .from('user_roles').select('role').eq('user_id', user.id).single();
    return { ok: true, userId: user.id, email: user.email || '', role: roleRow?.role || 'student' };
  } catch (e) {
    return { ok: false, code: 502, error: 'Gagal memverifikasi sesi.' };
  }
}

/* Pengajar hanya boleh menyentuh grup miliknya; admin boleh semuanya. */
async function assertCanManage(sbService, me, classroomId) {
  const { data: room } = await sbService
    .from('classrooms').select('id, teacher_id, name, level, kind').eq('id', classroomId).single();
  if (!room) return { ok: false, code: 404, error: 'Grup tidak ditemukan.' };
  if (me.role !== 'admin' && room.teacher_id !== me.userId) {
    return { ok: false, code: 403, error: 'Grup ini bukan milik Anda.' };
  }
  return { ok: true, room };
}

async function tooManyRedeemAttempts(sbService, ip) {
  const key = `grp-redeem:${ip}`;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sbService
    .from('rate_limits').select('count').eq('user_id', key).eq('date', today).single();
  const count = data?.count || 0;
  if (count >= REDEEM_ATTEMPTS_PER_DAY) return true;
  await sbService.from('rate_limits')
    .upsert({ user_id: key, date: today, count: count + 1 }, { onConflict: 'user_id,date' });
  return false;
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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SUPABASE_ANON_KEY) {
    return json(501, {
      error: 'Fitur grup belum aktif: SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_KEY '
           + 'harus diisi di Netlify (Site settings → Environment variables).',
      code: 'NOT_CONFIGURED',
    });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return json(400, { error: 'Invalid JSON' }); }

  const sbService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const me = await identify(event.headers['authorization'] || event.headers['Authorization'], sbService);
  if (!me.ok) return json(me.code, { error: me.error });

  const isManager = me.role === 'teacher' || me.role === 'admin';
  const action = String(body.action || '');

  try {
    switch (action) {

      /* Daftar grup. Pengajar melihat grupnya, admin melihat semua, pelajar
         melihat grup yang ia ikuti. Satu action, tiga sudut pandang. */
      case 'list-groups': {
        if (isManager) {
          let q = sbService.from('classrooms')
            .select('id, name, description, level, kind, archived, created_at, teacher_id')
            .eq('archived', false).order('created_at', { ascending: false });
          if (me.role !== 'admin') q = q.eq('teacher_id', me.userId);
          const { data, error } = await q;
          if (error) throw error;
          const ids = (data || []).map((g) => g.id);
          const counts = {};
          if (ids.length) {
            const { data: rows } = await sbService
              .from('enrollments').select('classroom_id').in('classroom_id', ids);
            (rows || []).forEach((r) => { counts[r.classroom_id] = (counts[r.classroom_id] || 0) + 1; });
          }
          return json(200, {
            role: me.role,
            groups: (data || []).map((g) => Object.assign({ members: counts[g.id] || 0 }, g)),
          });
        }
        const { data: mine } = await sbService
          .from('enrollments').select('classroom_id, joined_at, classrooms(id, name, level, kind)')
          .eq('student_id', me.userId);
        return json(200, { role: me.role, groups: (mine || []).map((r) => r.classrooms).filter(Boolean) });
      }

      case 'create-group': {
        if (!isManager) return json(403, { error: 'Hanya pengajar atau admin yang bisa membuat grup.' });
        const name = String(body.name || '').trim();
        if (name.length < 3 || name.length > 80) {
          return json(400, { error: 'Nama grup harus 3–80 karakter.' });
        }
        const kind = body.kind === 'pengajar' ? 'pengajar' : 'pelajar';
        const level = String(body.level || 'umum').trim().slice(0, 20) || 'umum';
        /* join_code lama masih NOT NULL UNIQUE di skema; diisi nilai acak agar
           kolom warisan itu tetap sah, tapi TIDAK dipakai untuk bergabung —
           pendaftaran sepenuhnya lewat group_tokens. */
        const { data, error } = await sbService.from('classrooms').insert({
          teacher_id: me.userId,
          name,
          description: String(body.description || '').trim().slice(0, 300) || null,
          level, kind,
          join_code: 'legacy-' + crypto.randomUUID(),
        }).select('id, name, description, level, kind, created_at').single();
        if (error) throw error;
        return json(200, { group: Object.assign({ members: 0 }, data) });
      }

      case 'mint-token': {
        if (!isManager) return json(403, { error: 'Hanya pengajar atau admin yang bisa membuat token.' });
        const can = await assertCanManage(sbService, me, body.classroomId);
        if (!can.ok) return json(can.code, { error: can.error });

        const maxUses = Math.min(Math.max(parseInt(body.maxUses, 10) || 1, 1), 500);
        const days = Math.min(Math.max(parseInt(body.expiresInDays, 10) || 0, 0), 365);
        const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;

        const prefix = (can.room.level || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6);
        const token = generateToken(prefix);
        const { data, error } = await sbService.from('group_tokens').insert({
          classroom_id: can.room.id,
          token_hash: sha256(normalizeToken(token)),
          label: String(body.label || '').trim().slice(0, 60) || null,
          max_uses: maxUses,
          expires_at: expiresAt,
          created_by: me.userId,
        }).select('id, label, max_uses, used_count, expires_at, created_at').single();
        if (error) throw error;

        // Satu-satunya saat plaintext ada; sesudah ini hanya hash yang tersimpan.
        return json(200, { token, tokenRow: data, warning: 'Token hanya ditampilkan sekali. Salin sekarang.' });
      }

      case 'list-tokens': {
        if (!isManager) return json(403, { error: 'Tidak diizinkan.' });
        const can = await assertCanManage(sbService, me, body.classroomId);
        if (!can.ok) return json(can.code, { error: can.error });
        const { data, error } = await sbService.from('group_tokens')
          .select('id, label, max_uses, used_count, expires_at, revoked_at, created_at')
          .eq('classroom_id', can.room.id).order('created_at', { ascending: false });
        if (error) throw error;
        return json(200, { tokens: data || [] });
      }

      case 'revoke-token': {
        if (!isManager) return json(403, { error: 'Tidak diizinkan.' });
        const { data: tok } = await sbService.from('group_tokens')
          .select('id, classroom_id').eq('id', body.tokenId).single();
        if (!tok) return json(404, { error: 'Token tidak ditemukan.' });
        const can = await assertCanManage(sbService, me, tok.classroom_id);
        if (!can.ok) return json(can.code, { error: can.error });
        const { error } = await sbService.from('group_tokens')
          .update({ revoked_at: new Date().toISOString() }).eq('id', tok.id);
        if (error) throw error;
        return json(200, { ok: true });
      }

      case 'list-members': {
        if (!isManager) return json(403, { error: 'Tidak diizinkan.' });
        const can = await assertCanManage(sbService, me, body.classroomId);
        if (!can.ok) return json(can.code, { error: can.error });
        const { data, error } = await sbService.from('enrollments')
          .select('id, student_id, joined_at').eq('classroom_id', can.room.id)
          .order('joined_at', { ascending: false });
        if (error) throw error;
        return json(200, { members: data || [] });
      }

      /* Ringkasan kelas untuk dashboard pengajar.
         ──────────────────────────────────────────────────────────────
         Progres siswa SENGAJA diambil di sini, bukan langsung dari klien.
         Dulu klien BISA membaca user_progress lewat policy warisan
         "Leaderboard read" yang mengizinkan setiap pengguna terautentikasi
         membaca SELURUH baris tabel itu, termasuk email dan status langganan
         semua orang. Dashboard ini sengaja tidak bersandar padanya, supaya
         tidak ikut rusak saat policy itu dipersempit.

         Policy itu kini memang sudah dibuang: papan peringkat pindah ke view
         `leaderboard` yang hanya memuat name/xp/streak/level. Kehati-hatian
         di atas terbayar -- fitur ini tidak perlu diubah sama sekali. Akses
         di sini dibatasi kepemilikan kelas, lewat service role.

         Kolom `email` tidak pernah ikut dikembalikan: pengajar butuh nama dan
         progres, bukan alamat surel muridnya. */
      case 'class-overview': {
        if (!isManager) return json(403, { error: 'Hanya pengajar atau admin.' });

        let q = sbService.from('classrooms')
          .select('id, name, description, level, kind, created_at, teacher_id')
          .eq('archived', false).order('created_at', { ascending: false });
        if (me.role !== 'admin') q = q.eq('teacher_id', me.userId);
        const { data: classes, error: e1 } = await q;
        if (e1) throw e1;
        const ids = (classes || []).map((c) => c.id);
        if (!ids.length) return json(200, { role: me.role, classes: [] });

        const { data: enr } = await sbService.from('enrollments')
          .select('classroom_id, student_id, joined_at').in('classroom_id', ids);
        const sids = [...new Set((enr || []).map((e) => e.student_id))];

        let prog = [];
        if (sids.length) {
          const { data } = await sbService.from('user_progress')
            .select('user_id, name, xp, level, streak, last_study, jlpt_progress')
            .in('user_id', sids);
          prog = data || [];
        }
        const byUser = {};
        prog.forEach((r) => { byUser[r.user_id] = r; });

        const { data: asg } = await sbService.from('assignments')
          .select('id, classroom_id, title, material_url, due_at, created_at').in('classroom_id', ids);
        const aids = (asg || []).map((a) => a.id);
        let subs = [];
        if (aids.length) {
          const { data } = await sbService.from('assignment_submissions')
            .select('assignment_id, completed').in('assignment_id', aids);
          subs = data || [];
        }
        const doneBy = {};
        subs.forEach((x) => { if (x.completed) doneBy[x.assignment_id] = (doneBy[x.assignment_id] || 0) + 1; });

        /* jlpt_progress adalah objek {N5..N1}; dashboard menampilkan satu angka
           persen, jadi dirata-ratakan. Tanpa data sama sekali -> 0, bukan NaN. */
        const persen = (r) => {
          const j = r && r.jlpt_progress;
          if (!j || typeof j !== 'object') return 0;
          const v = Object.values(j).map(Number).filter((n) => Number.isFinite(n));
          return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
        };
        const HARI = 86400000;
        const status = (r) => {
          if (!r || !r.last_study) return 'perlu perhatian';
          const jarak = (Date.now() - new Date(r.last_study).getTime()) / HARI;
          if (jarak <= 7) return 'aktif';
          if (jarak <= 30) return 'kurang aktif';
          return 'perlu perhatian';
        };

        const out = (classes || []).map((c) => {
          const anggota = (enr || []).filter((e) => e.classroom_id === c.id);
          const students = anggota.map((e) => {
            const r = byUser[e.student_id];
            return {
              name: (r && r.name) || ('Siswa ' + String(e.student_id).slice(0, 6)),
              progress: persen(r),
              streak: (r && r.streak) || 0,
              status: status(r),
            };
          });
          const tugas = (asg || []).filter((a) => a.classroom_id === c.id).map((a) => ({
            id: a.id,
            title: a.title,
            due: a.due_at ? String(a.due_at).slice(0, 10) : '',
            done: doneBy[a.id] || 0,
            total: students.length,
          }));
          return {
            id: c.id, name: c.name, level: c.level, kind: c.kind,
            students: students, assignments: tugas,
          };
        });
        return json(200, { role: me.role, classes: out });
      }

      case 'create-assignment': {
        if (!isManager) return json(403, { error: 'Hanya pengajar atau admin.' });
        const can = await assertCanManage(sbService, me, body.classroomId);
        if (!can.ok) return json(can.code, { error: can.error });
        const title = String(body.title || '').trim();
        if (title.length < 3 || title.length > 120) {
          return json(400, { error: 'Judul tugas harus 3-120 karakter.' });
        }
        let dueAt = null;
        if (body.dueAt) {
          const d = new Date(body.dueAt);
          if (!isNaN(d.getTime())) dueAt = d.toISOString();
        }
        const { data, error } = await sbService.from('assignments').insert({
          classroom_id: can.room.id,
          title,
          material_url: String(body.materialUrl || '').trim().slice(0, 300) || null,
          due_at: dueAt,
        }).select('id, title, due_at').single();
        if (error) throw error;
        return json(200, { assignment: data });
      }

      /* Menukar token. Terbuka untuk SEMUA pengguna yang sudah masuk — di
         sinilah pelajar bergabung. Dibatasi per IP karena inilah satu-satunya
         endpoint yang menerima tebakan berulang. */
      case 'redeem': {
        const ip = event.headers['x-nf-client-connection-ip']
          || (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
        if (await tooManyRedeemAttempts(sbService, ip)) {
          return json(429, { error: 'Terlalu banyak percobaan hari ini. Coba lagi besok.', code: 'RATE_LIMITED' });
        }
        const token = normalizeToken(body.token);
        if (token.length < 8) return json(400, { error: 'Token tidak lengkap.' });

        const { data, error } = await sbService.rpc('redeem_group_token', {
          p_hash: sha256(token), p_user: me.userId,
        });
        if (error) {
          const m = String(error.message || '');
          const known = {
            TOKEN_INVALID:  [404, 'Token tidak dikenal. Periksa kembali penulisannya.'],
            TOKEN_REVOKED:  [410, 'Token ini sudah dicabut pengajar.'],
            TOKEN_EXPIRED:  [410, 'Token ini sudah kedaluwarsa.'],
            TOKEN_EXHAUSTED:[409, 'Kuota token ini sudah habis terpakai.'],
          };
          /* TOKEN_INVALID juga dikirim database saat grup sudah diarsipkan, tapi
             pesan "tidak dikenal" menyesatkan pemegang token yang sah. Bedakan
             dari kegagalan asli dengan memeriksa tokennya sendiri. */
          const hit = Object.keys(known).find((k) => m.includes(k));
          if (hit === 'TOKEN_INVALID') {
            const probe = await sbService.from('group_tokens')
              .select('id').eq('token_hash', sha256(token)).single();
            if (probe.data?.id) {
              return json(410, { error: 'Grup untuk token ini sudah ditutup.', code: 'TOKEN_ARCHIVED' });
            }
          }
          if (hit) return json(known[hit][0], { error: known[hit][1], code: hit });
          throw error;
        }
        const row = Array.isArray(data) ? data[0] : data;
        return json(200, {
          ok: true,
          alreadyMember: !!row?.already_member,
          group: { id: row?.classroom_id, name: row?.classroom_name },
        });
      }

      default:
        return json(400, { error: 'Action tidak dikenal.' });
    }
  } catch (err) {
    console.error('group-tokens error:', err);
    return json(500, { error: 'Terjadi kesalahan di server.' });
  }
};
