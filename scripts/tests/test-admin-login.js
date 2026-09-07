/**
 * Test suite: admin-login.js (Netlify Function)
 *
 * Menguji KODE PRODUKSI asli (netlify/functions/admin-login.js) di sandbox
 * vm dengan fetch/Supabase di-mock -- bukan duplikat logika.
 *
 * Fokus regresi yang harus dicegah:
 *   - CORS mengizinkan origin asing memanggil endpoint admin (v175: bug yang
 *     sama pernah ditemukan nyata di 3 function lain)
 *   - Rate limit percobaan login tidak membatasi brute-force
 *   - Endpoint mengembalikan token untuk user yang BUKAN admin (fail-open)
 *   - Endpoint gagal fail-closed saat error mengambil role (harus dianggap
 *     bukan admin, bukan malah diloloskan)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const FN_PATH = path.join(__dirname, '..', '..', 'netlify', 'functions', 'admin-login.js');

/**
 * Muat admin-login.js di sandbox dengan:
 *  - fetch: mock yang bisa dikonfigurasi per-test (sukses/gagal auth)
 *  - createClient (Supabase): mock query builder chainable, hasil dikonfigurasi per-test
 *  - process.env: kredensial dummy supaya lolos guard awal
 */
function loadHandler({ fetchImpl, roleRowResult, rateLimitOk = true } = {}) {
  const rateLimitCalls = [];
  const roleQueryCalls = [];

  // Mock Supabase client chainable: sb.from(t).select().eq().eq().single()
  //                                  sb.from(t).upsert(...)
  function makeSbMock() {
    return {
      from(table) {
        return {
          select() {
            return {
              eq(col1, val1) {
                return {
                  eq(col2, val2) {
                    return { single: async () => ({ data: { count: rateLimitOk ? 1 : 999 } }) };
                  },
                  single: async () => {
                    roleQueryCalls.push({ table, col1, val1 });
                    return { data: roleRowResult };
                  },
                };
              },
            };
          },
          upsert(row) { rateLimitCalls.push(row); return Promise.resolve({}); },
        };
      },
    };
  }

  const sandbox = {
    require: (mod) => {
      if (mod === '@supabase/supabase-js') {
        return { createClient: () => makeSbMock() };
      }
      throw new Error('Unexpected require: ' + mod);
    },
    module: { exports: {} },
    exports: {},
    process: {
      env: {
        SUPABASE_URL: 'https://fake.supabase.co',
        SUPABASE_ANON_KEY: 'fake-anon-key',
        SUPABASE_SERVICE_KEY: 'fake-service-key',
      },
    },
    fetch: fetchImpl || (async () => ({ ok: true, json: async () => ({ access_token: 't', user: { id: 'u1' } }) })),
    console,
    JSON,
    Date,
    String,
  };
  sandbox.module.exports = sandbox.exports;
  vm.createContext(sandbox);
  const code = fs.readFileSync(FN_PATH, 'utf-8');
  vm.runInContext(code, sandbox, { filename: FN_PATH });
  return { handler: sandbox.module.exports.handler, rateLimitCalls, roleQueryCalls };
}

function makeEvent({ method = 'POST', origin = 'https://nihonggoproacademy.netlify.app', body = {} } = {}) {
  return {
    httpMethod: method,
    headers: { origin },
    body: JSON.stringify(body),
  };
}

// ── CORS ──────────────────────────────────────────────────────────────
test('CORS: origin resmi (nihonggoproacademy.netlify.app) diizinkan apa adanya', async () => {
  const { handler } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ origin: 'https://nihonggoproacademy.netlify.app', body: { email: 'a@a.com', password: 'x' } }));
  assert.strictEqual(res.headers['Access-Control-Allow-Origin'], 'https://nihonggoproacademy.netlify.app');
});

test('CORS: origin asing TIDAK diizinkan, fallback ke origin resmi (bukan diloloskan)', async () => {
  const { handler } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ origin: 'https://evil-attacker.com', body: { email: 'a@a.com', password: 'x' } }));
  assert.notStrictEqual(res.headers['Access-Control-Allow-Origin'], 'https://evil-attacker.com');
  assert.strictEqual(res.headers['Access-Control-Allow-Origin'], 'https://nihonggoproacademy.netlify.app');
});

test('OPTIONS preflight dibalas 204 tanpa proses login', async () => {
  const { handler } = loadHandler({});
  const res = await handler(makeEvent({ method: 'OPTIONS' }));
  assert.strictEqual(res.statusCode, 204);
});

test('Method selain POST/OPTIONS ditolak 405', async () => {
  const { handler } = loadHandler({});
  const res = await handler(makeEvent({ method: 'GET' }));
  assert.strictEqual(res.statusCode, 405);
});

// ── Validasi input ────────────────────────────────────────────────────
test('Body kosong (tanpa email/password) ditolak 400', async () => {
  const { handler } = loadHandler({});
  const res = await handler(makeEvent({ body: {} }));
  assert.strictEqual(res.statusCode, 400);
});

// ── Alur autentikasi + otorisasi role ─────────────────────────────────
test('Kredensial salah (Supabase Auth menolak) -> 401, TIDAK cek role sama sekali', async () => {
  const fetchImpl = async () => ({ ok: false, json: async () => ({ error: 'invalid_grant' }) });
  const { handler, roleQueryCalls } = loadHandler({ fetchImpl, roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ body: { email: 'a@a.com', password: 'salah' } }));
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(roleQueryCalls.length, 0, 'Tidak boleh query role jika auth gagal');
});

test('Login valid TAPI role bukan admin -> 403, TIDAK ada token di response', async () => {
  const { handler } = loadHandler({ roleRowResult: { role: 'student' } });
  const res = await handler(makeEvent({ body: { email: 'student@a.com', password: 'benar' } }));
  const parsedBody = JSON.parse(res.body);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(parsedBody.token, undefined, 'Response tidak boleh membocorkan token untuk non-admin');
});

test('Login valid DAN role admin -> 200 dengan token', async () => {
  const { handler } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ body: { email: 'admin@a.com', password: 'benar' } }));
  const parsedBody = JSON.parse(res.body);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(parsedBody.role, 'admin');
  assert.ok(parsedBody.token, 'Token harus ada untuk admin valid');
});

test('Fail-closed: error mengambil role (row null / query gagal) -> dianggap BUKAN admin, 403', async () => {
  // roleRowResult null mensimulasikan user tanpa row di user_roles sama sekali
  // (default 'student' di schema, atau baris belum ada)
  const { handler } = loadHandler({ roleRowResult: null });
  const res = await handler(makeEvent({ body: { email: 'norole@a.com', password: 'benar' } }));
  assert.strictEqual(res.statusCode, 403, 'Tanpa row user_roles yang eksplisit admin, harus ditolak (fail-closed)');
});

test('Rate limit: percobaan berlebih (count > batas) -> 429, tidak lanjut ke auth', async () => {
  let fetchCalled = false;
  const fetchImpl = async () => { fetchCalled = true; return { ok: true, json: async () => ({ access_token: 't', user: { id: 'u1' } }) }; };
  const { handler } = loadHandler({ fetchImpl, roleRowResult: { role: 'admin' }, rateLimitOk: false });
  const res = await handler(makeEvent({ body: { email: 'spam@a.com', password: 'x' } }));
  assert.strictEqual(res.statusCode, 429);
  assert.strictEqual(fetchCalled, false, 'Auth tidak boleh dipanggil jika rate limit sudah terlampaui');
});

// ── Runner ────────────────────────────────────────────────────────────
async function run() {
  let pass = 0, fail = 0;
  const failures = [];
  for (const t of tests) {
    try {
      await t.fn();
      pass++;
    } catch (e) {
      fail++;
      failures.push({ name: t.name, error: e.message });
    }
  }
  console.log(`\n📋 test-admin-login.js: ${pass} passed, ${fail} failed (${tests.length} total)`);
  if (failures.length) {
    for (const f of failures) console.log(`  ❌ ${f.name}\n     ${f.error}`);
  }
  return { pass, fail, total: tests.length };
}

if (require.main === module) {
  run().then(({ fail }) => process.exit(fail > 0 ? 1 : 0));
} else {
  module.exports = { run, tests };
}
