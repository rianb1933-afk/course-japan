'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../AI-Sensei.html'), 'utf8');
const start = html.indexOf('async function sendMessage(){');
const source = html.slice(start, html.indexOf('// ── SYSTEM GREETING', start));
module.exports.tests = ['', 'Draf berikutnya'].map(draft => ({
  name: 'AI Sensei gagal: tanpa XP/riwayat, ' + (draft ? 'draf baru tetap utuh' : 'pesan dipulihkan'),
  fn: async () => {
    const input = {value: 'こんにちは'}, button = {}, shown = [];
    let xp = 0;
    const context = {
      isLoading: false, chatHistory: [], currentScenario: 'cafe', currentMode: 'guided', currentLevel: 'N5',
      SCENARIOS: {cafe: {icon: '', name: 'Cafe', desc: ''}},
      document: {getElementById: id => id === 'chatInput' ? input : button},
      autoResize() {}, addMessage: (role, content) => shown.push({role, content}),
      addTypingIndicator() {}, removeTypingIndicator() {},
      getUserContext: () => ({}), getSenseiMemory: () => ({corrections: [], topics: []}),
      NihongoAI: {chat: async () => { input.value = draft; return {error: 'Layanan tidak tersedia'}; }},
      window: {NihongoProgress: {addXP: () => xp++}}
    };
    vm.runInNewContext(source, context);
    await context.sendMessage();
    assert.equal(context.chatHistory.length, 0);
    assert.equal(xp, 0);
    assert.equal(input.value, draft || 'こんにちは');
    assert.equal(button.disabled, false);
    assert.equal(context.isLoading, false);
    assert.ok(shown.at(-1).content.includes('Layanan tidak tersedia'));
  }
}));
