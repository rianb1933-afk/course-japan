/**
 * Test suite: scripts/audit-ssw-content.js — quality gate konten SSW
 * ==================================================================
 * Audit membaca seed SQL dengan parser sendiri (tanpa Postgres), jadi
 * parsernya diuji dulu pada bentuk yang benar-benar dipakai seed: escape '',
 * subquery bersarang berkoma, dan komentar di antara baris. Lalu audit
 * dijalankan pada supabase-schema.sql sungguhan: nol error adalah GERBANG.
 * Terakhir, setiap kelas masalah dibuktikan tertangkap dengan SQL sintetis.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { parseInserts, audit } = require(path.join(ROOT, 'scripts', 'audit-ssw-content.js'));
const { validateQuestion } = require(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js'));
const TARGETS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'ssw-content-targets.json'), 'utf8'));

const cat = s => `(SELECT id FROM ssw_categories WHERE slug='${s}')`;
function sql(extra) {
  return `INSERT INTO ssw_categories (slug, name_jp) VALUES ('a', 'A'), ('b', 'B') ON CONFLICT (slug) DO NOTHING;
INSERT INTO ssw_modules (category_id, title, title_jp, description, sort) VALUES
  (${cat('a')}, 'Modul A', 'A', 'desk', 10);
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Modul A'), 'l1', 'L', 'L', 'd', '${'isi '.repeat(120)}', ARRAY[]::uuid[], 1);
INSERT INTO ssw_quizzes (category_id, kind, title, description, pass_score, time_limit_min, question_count, randomize, source, source_name) VALUES
  (${cat('a')}, 'practice', 'Kuis A', 'd', 60, 10, 1, true, 'practice', 'NPA');
INSERT INTO ssw_questions (quiz_id, type, payload, answer, explanation, sort) VALUES
  ((SELECT id FROM ssw_quizzes WHERE title='Kuis A'), 'mc', '{"question": "q", "choices": ["x", "y"]}', '{"index": 1}', 'karena', 1);
${extra || ''}`;
}
const errorsOf = s => audit(s, TARGETS, validateQuestion).issues.filter(i => i.level === 'error').map(i => i.detail);
function expectError(extraSql, pattern, label) {
  const errs = errorsOf(sql(extraSql));
  if (!errs.some(e => pattern.test(e))) throw new Error(`${label} tidak tertangkap — error: ${JSON.stringify(errs)}`);
}

const tests = [
  {
    name: 'SSW-audit: parser menangani escape \'\', subquery bersarang berkoma, dan komentar',
    fn() {
      const t = parseInserts(`INSERT INTO ssw_vocabulary (category_id, term, meaning_id, tags) VALUES
  (${cat('a')}, 'Rock''n''roll, (ya)', 'arti; "kutip"', ARRAY(SELECT id FROM x WHERE term IN ('p', 'q'))), -- komentar
  -- baris komentar sendiri
  (${cat('b')}, '二', 'dua', NULL)
ON CONFLICT (category_id, term) DO NOTHING;`);
      const rows = t.ssw_vocabulary;
      if (!rows || rows.length !== 2) throw new Error('harus 2 baris, dapat ' + (rows && rows.length));
      if (rows[0].term !== "Rock'n'roll, (ya)") throw new Error('escape salah: ' + rows[0].term);
      if (rows[0].meaning_id !== 'arti; "kutip"') throw new Error('string berkutip ganda rusak');
      if (!rows[0].tags || !/IN \('p', 'q'\)/.test(rows[0].tags.sql)) throw new Error('subquery bersarang terpotong');
      if (rows[1].tags !== null || rows[1].term !== '二') throw new Error('baris sesudah komentar salah');
    },
  },
  {
    name: 'SSW-audit: seed SQL sungguhan bebas error integritas (GERBANG)',
    fn() {
      const real = fs.readFileSync(path.join(ROOT, 'supabase-schema.sql'), 'utf8');
      const res = audit(real, TARGETS, validateQuestion);
      if (res.report.length < 17) throw new Error('bidang terbaca hanya ' + res.report.length);
      const kaigo = res.report.find(r => r.slug === 'kaigo');
      if (!kaigo || kaigo.metrics.vocabulary === 0 || kaigo.metrics.questions === 0) throw new Error('konten kaigo tidak terbaca parser');
      const errs = res.issues.filter(i => i.level === 'error');
      if (errs.length) throw new Error(errs.slice(0, 5).map(e => `[${e.field}] ${e.table}: ${e.detail}`).join(' | '));
    },
  },
  {
    name: 'SSW-audit: SQL sintetis yang bersih tidak menghasilkan error',
    fn() {
      const errs = errorsOf(sql());
      if (errs.length) throw new Error(JSON.stringify(errs));
    },
  },
  {
    name: 'SSW-audit: relasi judul ambigu / hilang tertangkap',
    fn() {
      expectError(`INSERT INTO ssw_modules (category_id, title, title_jp, description, sort) VALUES (${cat('b')}, 'Modul A', 'B', 'd', 10);`,
        /Modul A.*ambigu|dipakai 2×/, 'judul modul ganda antarbidang');
      expectError(`INSERT INTO ssw_questions (quiz_id, type, payload, answer, explanation, sort) VALUES
  ((SELECT id FROM ssw_quizzes WHERE title='Kuis Hantu'), 'mc', '{"question": "q", "choices": ["x", "y"]}', '{"index": 0}', 'e', 2);`,
        /Kuis Hantu.*tidak ada/, 'soal ke kuis yang tidak ada');
    },
  },
  {
    name: 'SSW-audit: kunci jawaban, pembahasan, sumber official, dan placeholder tertangkap',
    fn() {
      expectError(`INSERT INTO ssw_questions (quiz_id, type, payload, answer, explanation, sort) VALUES
  ((SELECT id FROM ssw_quizzes WHERE title='Kuis A'), 'mc', '{"question": "q", "choices": ["x", "y"]}', '{"index": 5}', 'e', 2);`,
        /answer\.index tidak valid/, 'indeks jawaban di luar pilihan');
      expectError(`INSERT INTO ssw_questions (quiz_id, type, payload, answer, explanation, sort) VALUES
  ((SELECT id FROM ssw_quizzes WHERE title='Kuis A'), 'tf', '{"question": "q"}', '{"bool": true}', '', 3);`,
        /Pembahasan wajib/, 'soal tanpa pembahasan');
      expectError(`INSERT INTO ssw_quizzes (category_id, kind, title, description, pass_score, time_limit_min, question_count, randomize, source, source_name) VALUES
  (${cat('a')}, 'quiz', 'Resmi', 'd', 60, 10, 1, false, 'official', 'ISA');
INSERT INTO ssw_questions (quiz_id, type, payload, answer, explanation, sort) VALUES
  ((SELECT id FROM ssw_quizzes WHERE title='Resmi'), 'tf', '{"question": "q"}', '{"bool": true}', 'e', 1);`,
        /official tanpa source_url/, 'label official tanpa URL');
      expectError(`INSERT INTO ssw_grammar (category_id, pattern, meaning_id, explanation) VALUES (${cat('a')}, '〜て', 'TODO isi arti', 'x');`,
        /placeholder/, 'placeholder');
      expectError(`INSERT INTO ssw_reading (category_id, title, text, questions) VALUES
  (${cat('a')}, 'Bacaan', 'teks', '[{"type":"choice","question":"q","choices":["a","b"],"correct":2,"explanation":"e"}]');`,
        /correct bukan indeks/, 'soal bacaan dengan correct di luar pilihan');
    },
  },
  {
    name: 'SSW-audit: target hanya DITEGAKKAN untuk bidang berstatus complete',
    fn() {
      const draft = audit(sql(), TARGETS, validateQuestion).issues.filter(i => i.table === 'target');
      if (draft.length) throw new Error('bidang draft tidak boleh gagal karena target');
      const complete = { ...TARGETS, fields: { a: { status: 'complete' } } };
      const errs = audit(sql(), complete, validateQuestion).issues.filter(i => i.table === 'target' && i.field === 'a');
      if (!errs.some(e => /vocabulary kurang/.test(e.detail))) throw new Error('bidang complete yang kurang target harus error');
    },
  },
];

module.exports = { tests };
