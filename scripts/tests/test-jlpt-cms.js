/**
 * Test suite: jlpt-cms.js (Netlify Function)
 *
 * Menguji KODE PRODUKSI asli di sandbox vm dengan fetch/Supabase di-mock.
 * Pola sama dengan test-blog-cms.js, tapi fokus pada validasi STRUKTUR
 * soal (4 opsi wajib, correct_index 0-3, dsb) yang jadi pembeda utama
 * dari blog-cms.js -- ini konsisten dengan syarat yang sudah ditegakkan
 * scripts/build_jlpt_question_bank.py untuk 2.707 soal existing.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const FN_PATH = path.join(__dirname, '..', '..', 'netlify', 'functions', 'jlpt-cms.js');

function loadHandler({ roleRowResult, insertResult, insertError, listResult, singleResult } = {}) {
  const insertCalls = [];
  const deleteCalls = [];

  function makeSbMock() {
    return {
      from(table) {
        return {
          select() {
            const builder = {
              eq(col, val) {
                if (col === 'user_id') return { single: async () => ({ data: roleRowResult }) };
                if (col === 'id') return { single: async () => singleResult ? { data: singleResult, error: null } : { data: null, error: { message: 'not found' } } };
                return builder;
              },
              order() { return builder; },
              limit() { return Promise.resolve({ data: listResult || [], error: null }); },
            };
            return builder;
          },
          insert(row) {
            insertCalls.push(row);
            return {
              select() {
                return {
                  single: async () => insertError
                    ? { data: null, error: { message: insertError } }
                    : { data: insertResult || { ...row, id: 'new-q-id' }, error: null },
                };
              },
            };
          },
          delete() {
            return { eq: async (col, val) => { deleteCalls.push(val); return { error: null }; } };
          },
        };
      },
    };
  }

  const sandbox = {
    require: (mod) => {
      if (mod === '@supabase/supabase-js') return { createClient: () => makeSbMock() };
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
    fetch: async () => ({ ok: true, json: async () => ({ id: 'admin-user-1' }) }),
    console, JSON, Date, String, Array, Number, RegExp,
  };
  sandbox.module.exports = sandbox.exports;
  vm.createContext(sandbox);
  const code = fs.readFileSync(FN_PATH, 'utf-8');
  vm.runInContext(code, sandbox, { filename: FN_PATH });
  return { handler: sandbox.module.exports.handler, insertCalls, deleteCalls };
}

function makeEvent({ method = 'GET', origin = 'https://nihonggoproacademy.netlify.app', body = {}, query = {}, headers = {} } = {}) {
  return { httpMethod: method, headers: { origin, ...headers }, queryStringParameters: query, body: JSON.stringify(body) };
}

const VALID_Q = {
  question: '「食べる」の意味は何ですか？',
  choices: ['Minum', 'Makan', 'Tidur', 'Berjalan'],
  correct_index: 1,
  explanation: '食べる (taberu) berarti "makan" -- kata kerja dasar golongan 2 (ichidan).',
  category: 'vocabulary',
  jlpt_level: 'N5',
};

// ── CORS & method dasar ──────────────────────────────────────────────
test('CORS: origin asing tidak diloloskan', async () => {
  const { handler } = loadHandler({ listResult: [] });
  const res = await handler(makeEvent({ origin: 'https://evil.com' }));
  assert.notStrictEqual(res.headers['Access-Control-Allow-Origin'], 'https://evil.com');
});

test('GET list publik tanpa auth', async () => {
  const { handler } = loadHandler({ listResult: [VALID_Q] });
  const res = await handler(makeEvent({ method: 'GET' }));
  assert.strictEqual(res.statusCode, 200);
});

test('POST tanpa token admin -> 403', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ method: 'POST', body: VALID_Q }));
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(insertCalls.length, 0);
});

// ── Validasi struktur soal (inti pembeda dari blog-cms.js) ───────────
test('POST dengan soal valid (4 opsi, index 0-3, penjelasan cukup) -> 201', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({
    method: 'POST', headers: { authorization: 'Bearer t' }, body: VALID_Q,
  }));
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(insertCalls.length, 1);
  assert.strictEqual(insertCalls[0].choices.length, 4);
});

test('POST dengan HANYA 3 opsi -> 400 (harus tepat 4)', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const bad = { ...VALID_Q, choices: ['A', 'B', 'C'] };
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: bad }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan 5 opsi -> 400 (harus tepat 4, bukan >=4)', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const bad = { ...VALID_Q, choices: ['A', 'B', 'C', 'D', 'E'] };
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: bad }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan correct_index=4 (di luar rentang 0-3) -> 400', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const bad = { ...VALID_Q, correct_index: 4 };
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: bad }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan correct_index=-1 -> 400', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const bad = { ...VALID_Q, correct_index: -1 };
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: bad }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan correct_index bertipe string ("1") -> 400 (harus integer)', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const bad = { ...VALID_Q, correct_index: '1' };
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: bad }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan salah satu opsi kosong -> 400', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const bad = { ...VALID_Q, choices: ['A', '', 'C', 'D'] };
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: bad }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST tanpa explanation -> 400', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const bad = { ...VALID_Q, explanation: '' };
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: bad }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan explanation terlalu pendek (<20 char) -> 400 (standar kualitas proyek)', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const bad = { ...VALID_Q, explanation: 'karena benar' }; // 12 karakter
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: bad }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan jlpt_level tidak dikenal ("N6") -> 400', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const bad = { ...VALID_Q, jlpt_level: 'N6' };
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: bad }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan jlpt_level kosong (opsional, tidak wajib diisi) -> 201', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const noLevel = { ...VALID_Q, jlpt_level: undefined };
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: noLevel }));
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(insertCalls.length, 1);
});

// ── Fail-closed role bukan admin ──────────────────────────────────────
test('POST dengan token valid tapi role student -> 403, tidak insert', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'student' } });
  const res = await handler(makeEvent({ method: 'POST', headers: { authorization: 'Bearer t' }, body: VALID_Q }));
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(insertCalls.length, 0);
});

// ── DELETE ─────────────────────────────────────────────────────────────
test('DELETE tanpa admin -> 403', async () => {
  const { handler } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ method: 'DELETE', query: { id: 'q1' } }));
  assert.strictEqual(res.statusCode, 403);
});

test('DELETE dengan admin valid -> 200', async () => {
  const { handler, deleteCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ method: 'DELETE', headers: { authorization: 'Bearer t' }, query: { id: 'q1' } }));
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(deleteCalls[0], 'q1');
});

module.exports = { tests };
