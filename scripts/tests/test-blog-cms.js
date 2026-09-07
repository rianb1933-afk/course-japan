/**
 * Test suite: blog-cms.js (Netlify Function)
 *
 * Menguji KODE PRODUKSI asli (netlify/functions/blog-cms.js) di sandbox vm
 * dengan fetch/Supabase di-mock -- bukan duplikat logika.
 *
 * Fokus regresi yang harus dicegah:
 *   - GET tanpa auth tetap bisa baca artikel published (endpoint publik)
 *   - POST/DELETE tanpa token admin ditolak (bukan diam-diam diterima)
 *   - Tag HTML di luar whitelist masuk ke database (celah XSS)
 *   - Event handler (onclick dst) atau javascript: URI lolos validasi
 *   - CORS origin asing diloloskan (pola bug v175 yang berulang di function lain)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const FN_PATH = path.join(__dirname, '..', '..', 'netlify', 'functions', 'blog-cms.js');

function loadHandler({ fetchImpl, roleRowResult, insertResult, insertError, deleteError, listResult } = {}) {
  const insertCalls = [];

  function makeSbMock() {
    return {
      from(table) {
        return {
          select(cols) {
            const builder = {
              eq(col, val) {
                if (col === 'user_id') {
                  return { single: async () => ({ data: roleRowResult }) };
                }
                // eq('published', true) -- lanjut chainable untuk GET list/detail
                return builder;
              },
              order() { return builder; },
              limit() { return Promise.resolve({ data: listResult || [], error: null }); },
              single: async () => {
                if (listResult && listResult.length) return { data: listResult[0], error: null };
                return { data: null, error: { message: 'not found' } };
              },
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
                    : { data: insertResult || { ...row, id: 'new-id' }, error: null },
                };
              },
            };
          },
          delete() {
            return {
              eq: async () => deleteError ? { error: { message: deleteError } } : { error: null },
            };
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
    fetch: fetchImpl || (async () => ({ ok: true, json: async () => ({ id: 'admin-user-1' }) })),
    console, JSON, Date, String, Array, Number, RegExp,
  };
  sandbox.module.exports = sandbox.exports;
  vm.createContext(sandbox);
  const code = fs.readFileSync(FN_PATH, 'utf-8');
  vm.runInContext(code, sandbox, { filename: FN_PATH });
  return { handler: sandbox.module.exports.handler, insertCalls };
}

function makeEvent({ method = 'GET', origin = 'https://nihonggoproacademy.netlify.app', body = {}, query = {}, headers = {} } = {}) {
  return {
    httpMethod: method,
    headers: { origin, ...headers },
    queryStringParameters: query,
    body: JSON.stringify(body),
  };
}

// ── CORS ──────────────────────────────────────────────────────────────
test('CORS: origin asing tidak diloloskan (fallback ke origin resmi)', async () => {
  const { handler } = loadHandler({ listResult: [] });
  const res = await handler(makeEvent({ origin: 'https://evil.com' }));
  assert.notStrictEqual(res.headers['Access-Control-Allow-Origin'], 'https://evil.com');
});

test('OPTIONS preflight dibalas 204', async () => {
  const { handler } = loadHandler({});
  const res = await handler(makeEvent({ method: 'OPTIONS' }));
  assert.strictEqual(res.statusCode, 204);
});

// ── GET publik, tanpa auth ────────────────────────────────────────────
test('GET list tanpa token admin tetap berhasil (endpoint publik)', async () => {
  const { handler } = loadHandler({ listResult: [{ slug: 'a', title: 'A', published: true }] });
  const res = await handler(makeEvent({ method: 'GET' }));
  assert.strictEqual(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.posts.length, 1);
});

test('GET dengan slug spesifik yang tidak ada -> 404', async () => {
  const { handler } = loadHandler({ listResult: [] });
  const res = await handler(makeEvent({ method: 'GET', query: { slug: 'tidak-ada' } }));
  assert.strictEqual(res.statusCode, 404);
});

// ── POST/DELETE wajib admin ───────────────────────────────────────────
test('POST tanpa token -> 403, tidak pernah sampai ke insert', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ method: 'POST', body: { title: 'Judul Test', body_html: '<p>isi</p>' } }));
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan token tapi role bukan admin -> 403', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'student' } });
  const res = await handler(makeEvent({
    method: 'POST',
    headers: { authorization: 'Bearer faketoken' },
    body: { title: 'Judul Test', body_html: '<p>isi</p>' },
  }));
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan token admin valid + HTML valid -> 201, tersimpan', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({
    method: 'POST',
    headers: { authorization: 'Bearer faketoken' },
    body: { title: 'Tips Belajar Kanji', body_html: '<p>Isi artikel yang valid.</p>' },
  }));
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(insertCalls.length, 1);
  assert.strictEqual(insertCalls[0].slug, 'tips-belajar-kanji');
});

// ── Validasi whitelist HTML (celah XSS) ───────────────────────────────
test('POST dengan tag <script> ditolak (di luar whitelist)', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({
    method: 'POST',
    headers: { authorization: 'Bearer faketoken' },
    body: { title: 'Judul', body_html: '<p>halo</p><script>alert(1)</script>' },
  }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0, 'Tidak boleh tersimpan ke database');
});

test('POST dengan onclick handler ditolak', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({
    method: 'POST',
    headers: { authorization: 'Bearer faketoken' },
    body: { title: 'Judul', body_html: '<p onclick="alert(1)">halo</p>' },
  }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan javascript: URI di href ditolak', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({
    method: 'POST',
    headers: { authorization: 'Bearer faketoken' },
    body: { title: 'Judul', body_html: '<a href="javascript:alert(1)">klik</a>' },
  }));
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(insertCalls.length, 0);
});

test('POST dengan tag yang diizinkan (p, h2, ul, li, strong, a) -> diterima', async () => {
  const { handler, insertCalls } = loadHandler({ roleRowResult: { role: 'admin' } });
  const html = '<h2>Judul</h2><p>Teks <strong>tebal</strong> dan <a href="https://nihonggoproacademy.netlify.app">link</a>.</p><ul><li>Poin 1</li></ul>';
  const res = await handler(makeEvent({
    method: 'POST',
    headers: { authorization: 'Bearer faketoken' },
    body: { title: 'Artikel Valid', body_html: html },
  }));
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(insertCalls.length, 1);
});

test('POST tanpa judul -> 400', async () => {
  const { handler } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({
    method: 'POST',
    headers: { authorization: 'Bearer faketoken' },
    body: { body_html: '<p>isi</p>' },
  }));
  assert.strictEqual(res.statusCode, 400);
});

test('DELETE tanpa token admin -> 403', async () => {
  const { handler } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ method: 'DELETE', query: { slug: 'test' } }));
  assert.strictEqual(res.statusCode, 403);
});

test('DELETE dengan token admin valid -> 200', async () => {
  const { handler } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({
    method: 'DELETE',
    headers: { authorization: 'Bearer faketoken' },
    query: { slug: 'test' },
  }));
  assert.strictEqual(res.statusCode, 200);
});

test('Method tidak dikenal (PUT) -> 405', async () => {
  const { handler } = loadHandler({ roleRowResult: { role: 'admin' } });
  const res = await handler(makeEvent({ method: 'PUT', headers: { authorization: 'Bearer faketoken' } }));
  assert.strictEqual(res.statusCode, 405);
});

module.exports = { tests };
