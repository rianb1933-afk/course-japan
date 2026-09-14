/* Regresi klien AI: kegagalan tidak menjadi riwayat belajar dan retry tetap terkunci. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '../../assets/nihongo-ai.js'), 'utf8');
function client(fetch) {
  const values = new Map();
  const storage = { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v) };
  const context = { window: {}, fetch, localStorage: storage, sessionStorage: storage,
    crypto: { randomUUID: () => 'test' }, AbortSignal: { timeout: () => undefined },
    setTimeout: fn => fn() };
  vm.runInNewContext(source, context);
  return context.window.NihongoAI;
}
const opts = { messages: [{ role: 'user', content: 'こんにちは' }], sessionId: 'test' };
const tests = [
  ...[429, 501, 503].map(status => ({
    name: `AI client: HTTP ${status} tidak disimpan sebagai percakapan sukses`,
    fn: async () => {
      let calls = 0;
      const ai = client(async () => { calls++; return { ok: false, status, json: async () => ({error: 'Layanan gagal', code: 'UNAVAILABLE'}) }; });
      const result = await ai.chat(opts);
      assert.equal(result.status, status);
      assert.equal(result.error, 'Layanan gagal');
      assert.equal(ai.Memory.getHistory('test').length, 0);
      assert.equal(calls, 1);
    }
  })),
  {
    name: 'AI client: jawaban kosong ditolak',
    fn: async () => {
      const ai = client(async () => ({ok: true, json: async () => ({text: ' '})}));
      assert.ok((await ai.chat(opts)).error);
      assert.equal(ai.Memory.getHistory('test').length, 0);
    }
  },
  {
    name: 'AI client: tombol terkunci sampai retry selesai, riwayat tersimpan sekali',
    fn: async () => {
      let calls = 0, complete;
      const btn = {disabled: false, style: {}};
      const ai = client(async (_, request) => {
        calls++;
        assert.equal(JSON.parse(request.body).temperature, 0);
        if (calls === 1) throw new TypeError('Failed to fetch');
        return new Promise(resolve => { complete = () => resolve({ok: true, json: async () => ({text: 'こんにちは！'})}); });
      });
      const pending = ai.chat({...opts, temperature: 0, btnEl: btn});
      for (let i = 0; i < 10; i++) await Promise.resolve();
      assert.equal(calls, 2);
      assert.equal(btn.disabled, true);
      complete();
      assert.equal((await pending).text, 'こんにちは！');
      assert.equal(btn.disabled, false);
      assert.equal(ai.Memory.getHistory('test').length, 2);
    }
  },
  {
    name: 'AI client: pesan error ditampilkan sebagai teks aman',
    fn: () => {
      const ai = client(() => {}), el = {};
      ai.UI.showError(el, '<img src=x onerror=alert(1)>');
      assert.ok(!el.innerHTML.includes('<img'));
      assert.ok(el.innerHTML.includes('&lt;img'));
    }
  }
];
module.exports = {tests};
