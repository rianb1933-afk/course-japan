const assert = require('assert');

const handler = require('../../netlify/functions/create-payment').handler;
const originalFetch = global.fetch;
const originalEnv = { ...process.env };

function restore() {
  global.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

function setup() {
  process.env.MIDTRANS_SERVER_KEY = 'server-key';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon-key';
  process.env.MIDTRANS_IS_PRODUCTION = 'false';
}

const tests = [
  {
    name: 'Payment tanpa JWT ditolak',
    async fn() {
      setup();
      try {
        const response = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ planId: 'premium-monthly' }) });
        assert.strictEqual(response.statusCode, 401);
      } finally { restore(); }
    }
  },
  {
    name: 'Payment memakai user ID dari JWT, bukan body',
    async fn() {
      setup();
      const verifiedUserId = '11111111-1111-4111-8111-111111111111';
      let midtransPayload;
      global.fetch = async (url, options) => {
        if (url.endsWith('/auth/v1/user')) {
          return { ok: true, json: async () => ({ id: verifiedUserId }) };
        }
        midtransPayload = JSON.parse(options.body);
        return { ok: true, json: async () => ({ token: 'snap-token' }) };
      };
      try {
        const response = await handler({
          httpMethod: 'POST',
          headers: { authorization: 'Bearer genuine-token', origin: 'http://localhost:8888' },
          body: JSON.stringify({ planId: 'premium-monthly', userId: 'attacker-chosen-id' })
        });
        assert.strictEqual(response.statusCode, 200);
        assert.ok(response.body.includes('U' + Buffer.from(verifiedUserId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')));
        assert.ok(!Object.prototype.hasOwnProperty.call(midtransPayload, 'userId'));
      } finally { restore(); }
    }
  }
];

module.exports = { tests };