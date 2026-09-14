'use strict';
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../assets/sensei-coach.js'),'utf8'), context);
const coach = context.SenseiCoach;
module.exports.tests = [
  {name:'Sensei Coach: ekstrak beberapa kosakata dan hilangkan duplikat', fn() {
    const result = coach.parseReply('【こんにちは】Halo [VOCAB: 猫=kucing, 犬=anjing, 猫=kucing]');
    assert.equal(result.clean, '【こんにちは】Halo');
    assert.equal(result.vocab.length, 2);
    assert.equal(result.vocab[1].id, 'anjing');
  }},
  {name:'Sensei Coach: format koreksi kedua backend dikenali', fn() {
    const result = coach.parseReply('Bagus [KOREKSI: Gunakan は]\n[コレクション: Pakai です]');
    assert.equal(result.corrections.length, 2);
    assert.equal(result.clean, 'Bagus');
  }},
  {name:'Sensei Coach: kosakata tidak lengkap tidak dihitung', fn() {
    assert.equal(coach.parseReply('[VOCAB: 猫=, =kucing, rusak]').vocab.length, 0);
  }},
  {name:'Sensei Coach: latihan ulang memakai koreksi dan level murid', fn() {
    const prompt = coach.reviewPrompt('Gunakan に untuk waktu', 'N4');
    assert.ok(prompt.includes('N4'));
    assert.ok(prompt.includes('Gunakan に untuk waktu'));
    assert.ok(prompt.includes('Jangan tampilkan jawabannya dulu'));
  }}
];
