/**
 * Test suite: scripts/ssw-curriculum/kaigo.json — matriks kurikulum SSW Kaigo
 * ===========================================================================
 * Matriks ini adalah spesifikasi produksi konten pilot Kaigo. Yang dijaga:
 * angka ujian tetap sama dengan dokumen resmi MHLW, setiap bidang ujian
 * tercakup modul, bobot modul mengikuti distribusi soal, target per modul
 * mencapai standar di scripts/ssw-content-targets.json, dan modul Kaigo yang
 * ditaut untuk pendalaman benar-benar ada (tidak menjadi tautan mati).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const matrix = read('scripts/ssw-curriculum/kaigo.json');
const targets = read('scripts/ssw-content-targets.json');
const sum = obj => Object.values(obj).reduce((n, a) => n + a.questions, 0);

const tests = [
  {
    name: 'SSW-kurikulum: angka ujian sama dengan 試験実施要領 MHLW (45 soal/60 menit, 15 soal/30 menit)',
    fn() {
      const { skill, japanese } = matrix.exams;
      if (skill.questions !== 45 || skill.minutes !== 60) throw new Error('介護技能評価試験 harus 45 soal / 60 menit');
      if (japanese.questions !== 15 || japanese.minutes !== 30) throw new Error('介護日本語評価試験 harus 15 soal / 30 menit');
      if (sum(skill.areas) !== skill.questions) throw new Error(`distribusi soal skill ${sum(skill.areas)} ≠ ${skill.questions}`);
      if (sum(japanese.areas) !== japanese.questions) throw new Error(`distribusi soal bahasa ${sum(japanese.areas)} ≠ ${japanese.questions}`);
      if (!matrix.sources.every(s => /^https:\/\//.test(s.url) && /^\d{4}-\d{2}-\d{2}$/.test(s.checked))) {
        throw new Error('setiap sumber wajib punya URL https dan tanggal dicek');
      }
    },
  },
  {
    name: 'SSW-kurikulum: setiap bidang ujian tercakup, bobot modul mengikuti distribusi soal',
    fn() {
      const areas = { ...matrix.exams.skill.areas, ...matrix.exams.japanese.areas };
      const content = matrix.modules.filter(m => m.areas.length < Object.keys(areas).length); // tanpa modul ujian
      Object.keys(areas).forEach(a => {
        if (!content.some(m => m.areas.includes(a))) throw new Error(`bidang ujian "${a}" tidak punya modul materi`);
      });
      matrix.modules.forEach(m => m.areas.forEach(a => {
        if (!areas[a]) throw new Error(`${m.id}: area "${a}" tidak dikenal`);
      }));
      // 生活支援技術 = 25/45 soal: bidang terbesar wajib punya modul terbanyak.
      const count = a => content.filter(m => m.areas.includes(a)).length;
      ['kihon', 'kokoro', 'comm'].forEach(a => {
        if (count('seikatsu') <= count(a)) throw new Error(`seikatsu (${count('seikatsu')} modul) tidak lebih banyak dari ${a} (${count(a)})`);
      });
    },
  },
  {
    name: 'SSW-kurikulum: target per modul mencapai standar ssw-content-targets.json',
    fn() {
      const std = targets.standard;
      const n = matrix.modules.length;
      const per = matrix.perModule;
      if (n < std.modules) throw new Error(`${n} modul < standar ${std.modules}`);
      if (per.lessons < std.lessonsPerModule) throw new Error('lesson per modul di bawah standar');
      ['lessons', 'vocabulary', 'kanji', 'grammar', 'listening', 'reading', 'quizzes'].forEach(k => {
        if (per[k] * n < std[k]) throw new Error(`${k}: ${per[k]}×${n} = ${per[k] * n} < standar ${std[k]}`);
      });
      if (matrix.mocks.length < std.mock) throw new Error(`mock ${matrix.mocks.length} < standar ${std.mock}`);
      const exams = new Set(matrix.mocks.map(m => m.exam));
      if (!exams.has('skill') || !exams.has('japanese')) throw new Error('butuh satu mock untuk tiap ujian resmi');
    },
  },
  {
    name: 'SSW-kurikulum: modul Kaigo yang ditaut untuk pendalaman benar-benar ada',
    fn() {
      const ids = new Set();
      matrix.modules.forEach(m => {
        if (ids.has(m.id)) throw new Error('id modul ganda: ' + m.id);
        ids.add(m.id);
        if (!m.goals.length || !m.topics.length) throw new Error(`${m.id}: goals/topics kosong`);
        m.reuse.forEach(f => {
          if (!fs.existsSync(path.join(ROOT, 'Materi', f + '.html'))) throw new Error(`${m.id}: Materi/${f}.html tidak ada`);
        });
      });
    },
  },
];

module.exports = { tests };
