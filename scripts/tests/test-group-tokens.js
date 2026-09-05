/* Uji otorisasi & penanganan token di netlify/functions/group-tokens.js.
   ───────────────────────────────────────────────────────────────────
   Tidak menyentuh Supabase sungguhan: modul @supabase/supabase-js diganti
   tiruan lewat require.cache, dan global.fetch (dipakai untuk memverifikasi
   JWT) juga disadap.

   Yang dijaga di sini adalah aturan yang kalau salah tidak menimbulkan error
   apa pun, hanya kebocoran diam-diam: pelajar membuat grup, pengajar
   menerbitkan token untuk grup milik orang lain, atau token tersimpan sebagai
   teks biasa sehingga basis data yang bocor ikut membocorkan akses. */
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const path = require('path');

const FN = path.join(__dirname, '..', '..', 'netlify', 'functions', 'group-tokens.js');
const SB = require.resolve('@supabase/supabase-js');

/* ── Klien Supabase tiruan ────────────────────────────────────────────
   Meniru bentuk berantai yang dipakai fungsi: .from().select().eq().single(),
   .insert().select().single(), .update().eq(), .upsert(), .in(), .order().
   Setiap builder adalah thenable yang selesai jadi {data, error}. */
function makeClient(db, log) {
  function builder(table) {
    const st = { table, op: 'select', filters: {}, row: null, single: false };
    const b = {
      select() { return b; },
      eq(k, v) { st.filters[k] = v; return b; },
      in(k, v) { st.filters[k] = v; return b; },
      order() { return b; },
      single() { st.single = true; return b; },
      insert(row) { st.op = 'insert'; st.row = row; return b; },
      update(row) { st.op = 'update'; st.row = row; return b; },
      upsert(row) { st.op = 'upsert'; st.row = row; return b; },
      then(resolve) { return Promise.resolve(run(st)).then(resolve); },
    };
    return b;
  }
  function run(st) {
    log.push({ table: st.table, op: st.op, filters: st.filters, row: st.row });
    if (st.op === 'insert') {
      const saved = Object.assign({ id: 'new-' + st.table }, st.row);
      (db[st.table] = db[st.table] || []).push(saved);
      return { data: st.single ? saved : [saved], error: null };
    }
    if (st.op === 'update' || st.op === 'upsert') return { data: null, error: null };
    let rows = (db[st.table] || []).filter((r) =>
      Object.entries(st.filters).every(([k, v]) => Array.isArray(v) ? v.includes(r[k]) : r[k] === v));
    return { data: st.single ? (rows[0] || null) : rows, error: null };
  }
  return { from: builder, rpc: (name, args) => Promise.resolve(db.__rpc(name, args)) };
}

function withMocks(db, user, fn) {
  const log = [];
  const savedSb = require.cache[SB];
  require.cache[SB] = { id: SB, filename: SB, loaded: true,
                        exports: { createClient: () => makeClient(db, log) } };
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: !!user, json: async () => (user || {}) });
  const savedEnv = {};
  ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'].forEach((k) => {
    savedEnv[k] = process.env[k]; process.env[k] = 'x';
  });
  delete require.cache[require.resolve(FN)];
  const handler = require(FN).handler;
  return Promise.resolve(fn(handler, log)).finally(() => {
    if (savedSb) require.cache[SB] = savedSb; else delete require.cache[SB];
    global.fetch = realFetch;
    Object.entries(savedEnv).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    });
  });
}

const ev = (body, auth) => ({
  httpMethod: 'POST',
  headers: Object.assign({ 'x-nf-client-connection-ip': '198.51.100.7' },
                         auth === null ? {} : { authorization: 'Bearer t' }),
  body: JSON.stringify(body),
});

const baseDb = () => ({
  user_roles: [
    { user_id: 'guru-1', role: 'teacher' },
    { user_id: 'guru-2', role: 'teacher' },
    { user_id: 'bos',    role: 'admin' },
    { user_id: 'siswa',  role: 'student' },
  ],
  classrooms: [
    { id: 'g1', teacher_id: 'guru-1', name: 'Pelajar N5', level: 'N5', kind: 'pelajar', archived: false },
  ],
  enrollments: [],
  group_tokens: [],
  rate_limits: [],
  __rpc: () => ({ data: [{ classroom_id: 'g1', classroom_name: 'Pelajar N5', already_member: false }], error: null }),
});

const tests = [
  {
    name: 'tanpa sesi: 401, tidak menyentuh data sama sekali',
    fn: () => withMocks(baseDb(), null, async (h) => {
      const r = await h(ev({ action: 'list-groups' }, null));
      assert.strictEqual(r.statusCode, 401);
    }),
  },
  {
    name: 'pelajar TIDAK bisa membuat grup',
    fn: () => withMocks(baseDb(), { id: 'siswa' }, async (h) => {
      const r = await h(ev({ action: 'create-group', name: 'Grup Bikinan Siswa' }));
      assert.strictEqual(r.statusCode, 403);
    }),
  },
  {
    name: 'pelajar TIDAK bisa menerbitkan token',
    fn: () => withMocks(baseDb(), { id: 'siswa' }, async (h) => {
      const r = await h(ev({ action: 'mint-token', classroomId: 'g1' }));
      assert.strictEqual(r.statusCode, 403);
    }),
  },
  {
    name: 'pengajar TIDAK bisa menerbitkan token untuk grup pengajar lain',
    fn: () => withMocks(baseDb(), { id: 'guru-2' }, async (h) => {
      const r = await h(ev({ action: 'mint-token', classroomId: 'g1' }));
      assert.strictEqual(r.statusCode, 403, 'guru-2 bukan pemilik g1');
      assert.ok(JSON.parse(r.body).error.includes('bukan milik Anda'));
    }),
  },
  {
    name: 'admin boleh mengelola grup milik siapa pun',
    fn: () => withMocks(baseDb(), { id: 'bos' }, async (h) => {
      const r = await h(ev({ action: 'mint-token', classroomId: 'g1' }));
      assert.strictEqual(r.statusCode, 200);
    }),
  },
  {
    name: 'token disimpan sebagai HASH, bukan teks biasa, dan berawalan level',
    fn: () => withMocks(baseDb(), { id: 'guru-1' }, async (h, log) => {
      const r = await h(ev({ action: 'mint-token', classroomId: 'g1', maxUses: 5 }));
      assert.strictEqual(r.statusCode, 200);
      const { token } = JSON.parse(r.body);
      assert.ok(token.startsWith('N5-'), 'awalan level: ' + token);
      const ins = log.find((l) => l.table === 'group_tokens' && l.op === 'insert');
      const norm = token.toUpperCase().replace(/[^0-9A-Z]/g, '');
      assert.strictEqual(ins.row.token_hash, crypto.createHash('sha256').update(norm).digest('hex'));
      assert.ok(!JSON.stringify(ins.row).includes(token), 'plaintext tidak boleh tersimpan');
      assert.strictEqual(ins.row.max_uses, 5);
    }),
  },
  {
    name: 'token unik tiap penerbitan',
    fn: () => withMocks(baseDb(), { id: 'guru-1' }, async (h) => {
      const a = JSON.parse((await h(ev({ action: 'mint-token', classroomId: 'g1' }))).body).token;
      const b = JSON.parse((await h(ev({ action: 'mint-token', classroomId: 'g1' }))).body).token;
      assert.notStrictEqual(a, b);
    }),
  },
  {
    name: 'penukaran menormalkan huruf kecil & tanda hubung ke hash yang sama',
    fn: () => {
      const db = baseDb();
      const seen = [];
      db.__rpc = (name, args) => {
        seen.push({ name, hash: args.p_hash, user: args.p_user });
        return { data: [{ classroom_id: 'g1', classroom_name: 'Pelajar N5', already_member: false }], error: null };
      };
      return withMocks(db, { id: 'siswa' }, async (h) => {
        await h(ev({ action: 'redeem', token: 'n5-7k2m9-qxa4b' }));
        await h(ev({ action: 'redeem', token: '  N5 7K2M9 QXA4B ' }));
        assert.strictEqual(seen.length, 2, 'kedua penukaran harus sampai ke rpc');
        assert.strictEqual(seen[0].name, 'redeem_group_token');
        // Bentuk penulisan berbeda, hash yang dikirim harus identik...
        assert.strictEqual(seen[0].hash, seen[1].hash);
        // ...dan memang SHA-256 dari bentuk yang sudah dinormalkan.
        assert.strictEqual(seen[0].hash,
          crypto.createHash('sha256').update('N57K2M9QXA4B').digest('hex'));
        // Identitas penukar diambil dari sesi terverifikasi, bukan dari body.
        assert.strictEqual(seen[0].user, 'siswa');
      });
    },
  },
  {
    name: 'token kependekan ditolak sebelum menyentuh basis data',
    fn: () => withMocks(baseDb(), { id: 'siswa' }, async (h) => {
      const r = await h(ev({ action: 'redeem', token: 'ABC' }));
      assert.strictEqual(r.statusCode, 400);
    }),
  },
  {
    name: 'percobaan tukar dibatasi per IP (rem tebak-tebakan)',
    fn: () => {
      const db = baseDb();
      db.rate_limits = [{ user_id: 'grp-redeem:198.51.100.7',
                          date: new Date().toISOString().slice(0, 10), count: 30 }];
      return withMocks(db, { id: 'siswa' }, async (h) => {
        const r = await h(ev({ action: 'redeem', token: 'N5-7K2M9-QXA4B' }));
        assert.strictEqual(r.statusCode, 429);
        assert.strictEqual(JSON.parse(r.body).code, 'RATE_LIMITED');
      });
    },
  },
  {
    name: 'kesalahan token dari database dipetakan ke pesan yang bisa dibaca',
    fn: () => {
      const db = baseDb();
      db.__rpc = () => ({ data: null, error: { message: 'TOKEN_EXPIRED' } });
      return withMocks(db, { id: 'siswa' }, async (h) => {
        const r = await h(ev({ action: 'redeem', token: 'N5-7K2M9-QXA4B' }));
        assert.strictEqual(r.statusCode, 410);
        assert.strictEqual(JSON.parse(r.body).code, 'TOKEN_EXPIRED');
        assert.ok(JSON.parse(r.body).error.includes('kedaluwarsa'));
      });
    },
  },
  {
    name: 'peran diambil dari basis data, BUKAN dari body request',
    fn: () => withMocks(baseDb(), { id: 'siswa' }, async (h) => {
      // Klien mengaku admin; harus tetap ditolak.
      const r = await h(ev({ action: 'create-group', name: 'Coba Naik Pangkat', role: 'admin' }));
      assert.strictEqual(r.statusCode, 403);
    }),
  },
  {
    name: 'nama grup divalidasi panjangnya',
    fn: () => withMocks(baseDb(), { id: 'guru-1' }, async (h) => {
      assert.strictEqual((await h(ev({ action: 'create-group', name: 'ab' }))).statusCode, 400);
      assert.strictEqual((await h(ev({ action: 'create-group', name: 'x'.repeat(81) }))).statusCode, 400);
    }),
  },
  {
    name: 'grup pengajar dibuat dengan kind=pengajar',
    fn: () => withMocks(baseDb(), { id: 'guru-1' }, async (h, log) => {
      const r = await h(ev({ action: 'create-group', name: 'Grup Pengajar', kind: 'pengajar', level: 'staf' }));
      assert.strictEqual(r.statusCode, 200);
      const ins = log.find((l) => l.table === 'classrooms' && l.op === 'insert');
      assert.strictEqual(ins.row.kind, 'pengajar');
      assert.strictEqual(ins.row.level, 'staf');
    }),
  },
];

module.exports = { tests };
