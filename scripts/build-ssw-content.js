#!/usr/bin/env node
/**
 * scripts/build-ssw-content.js — generator konten kurikulum SSW
 * =============================================================
 * Sumber (tidak ter-deploy — scripts/ dibuang prune-publish.sh):
 *   scripts/ssw-curriculum/<bidang>.json          matriks kurikulum
 *   scripts/ssw-curriculum/<bidang>/<modul>.json  isi satu modul
 * Keluaran:
 *   1. Blok SQL di supabase-schema.sql antara penanda
 *      "-- >>> SSW-CONTENT generated" … "-- <<< SSW-CONTENT generated <<<".
 *      Upsert berkunci SLUG per bidang; ON CONFLICT hanya menimpa baris
 *      bertag 'generated', jadi baris buatan admin tidak pernah tertimpa.
 *      Baris 'generated' yang sudah dihapus dari sumber ikut dibersihkan.
 *   2. assets/ssw-content/<bidang>.json + index.json — cadangan statis yang
 *      dibaca assets/ssw-api.js saat DB belum siap (bentuk = seed.fields).
 *
 *   node scripts/build-ssw-content.js           tulis keluaran
 *   node scripts/build-ssw-content.js --check   exit 1 bila keluaran basi
 *
 * Konten generator = repo adalah sumber kebenarannya: sunting JSON-nya, bukan
 * barisnya di CMS (suntingan CMS pada baris 'generated' tertimpa saat schema
 * dijalankan ulang).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CURR = path.join(__dirname, 'ssw-curriculum');
const SCHEMA = path.join(ROOT, 'supabase-schema.sql');
const OUT_DIR = path.join(ROOT, 'assets', 'ssw-content');
const BEGIN = '-- >>> SSW-CONTENT generated — JANGAN DIEDIT MANUAL >>>';
const END = '-- <<< SSW-CONTENT generated <<<';
const GEN = 'generated';
const SOURCE_NAME = 'Nihongo Pro Academy — Generated Practice';

// ── SQL helpers ────────────────────────────────────────────────────────────
const lit = v => (v === null || v === undefined) ? 'NULL'
  : (typeof v === 'number' || typeof v === 'boolean') ? String(v)
  : "'" + String(v).replace(/'/g, "''") + "'";
const pgArr = list => "'{" + list.map(x => '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + "}'";
const json = v => lit(JSON.stringify(v));
const cat = f => `(SELECT id FROM ssw_categories WHERE slug=${lit(f)})`;
const modRef = (f, m) => `(SELECT id FROM ssw_modules WHERE category_id=${cat(f)} AND slug=${lit(m)})`;
const quizRef = (f, q) => `(SELECT id FROM ssw_quizzes WHERE category_id=${cat(f)} AND slug=${lit(q)})`;

function upsert(table, cols, rows, conflict, opts = {}) {
  if (!rows.length) return '';
  const set = cols.filter(c => !conflict.includes(c)).map(c => `${c} = EXCLUDED.${c}`);
  if (opts.touch) set.push('updated_at = now()');
  return `INSERT INTO ${table} (${cols.join(', ')}) VALUES\n` +
    rows.map(r => '  (' + r.join(', ') + ')').join(',\n') +
    `\nON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${set.join(', ')}\n  WHERE ${table}.tags @> '{${GEN}}';\n`;
}

// ── Muat & validasi ────────────────────────────────────────────────────────
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));

function loadCurricula() {
  return fs.readdirSync(CURR).filter(f => f.endsWith('.json')).sort().map(f => {
    const matrix = readJSON(path.join(CURR, f));
    const dir = path.join(CURR, matrix.field);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort() : [];
    const modules = files.map(x => ({ file: path.relative(ROOT, path.join(dir, x)), ...readJSON(path.join(dir, x)) }));
    return { matrix, modules };
  });
}

function handwrittenKeys(schemaSql) {
  // Konten tulisan tangan = schema tanpa blok generated.
  const { loadContent } = require('./audit-ssw-content.js');
  const { fields } = loadContent(stripBlock(schemaSql));
  const keys = {};
  Object.values(fields).forEach(f => {
    keys[f.slug] = {
      vocabulary: new Set(f.vocabulary.map(x => x.term)), kanji: new Set(f.kanji.map(x => x.kanji)),
      grammar: new Set(f.grammar.map(x => x.pattern)), listening: new Set(f.listening.map(x => x.title)),
      reading: new Set(f.reading.map(x => x.title)), modules: new Set(f.modules.map(x => x.title)),
      quizzes: new Set(f.quizzes.map(x => x.title)),
    };
  });
  return keys;
}

function validate(curricula, hand) {
  const { validateQuestion } = require(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js'));
  const { contentQuestionError } = require('./audit-ssw-content.js');
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const need = (where, obj, cols) => cols.forEach(c => {
    if (typeof obj[c] !== 'string' || !obj[c].trim()) err(where, `${c} wajib diisi`);
  });

  curricula.forEach(({ matrix, modules }) => {
    const field = matrix.field;
    const areas = Object.assign({}, ...Object.values(matrix.exams || {}).map(e => e.areas || {}));
    const moduleIds = new Set((matrix.modules || []).map(m => m.id));
    const seen = { vocabulary: new Map(), kanji: new Map(), grammar: new Map(), listening: new Map(), reading: new Map(), ids: new Map(), lessons: new Map() };
    const taken = (bucket, key, where) => {
      if (seen[bucket].has(key)) err(where, `"${key}" sudah dipakai di ${seen[bucket].get(key)}`);
      else seen[bucket].set(key, where);
    };
    const handKeys = hand[field] || {};

    modules.forEach(mod => {
      const w = mod.file;
      if (!moduleIds.has(mod.module)) return err(w, `modul "${mod.module}" tidak ada di matriks ${field}`);
      if (path.basename(w, '.json') !== mod.module) err(w, 'nama file harus sama dengan id modul');
      need(w, mod, ['description']);
      const vocabTerms = new Set((mod.vocabulary || []).map(v => v.term));

      (mod.vocabulary || []).forEach(v => {
        const at = `${w} vocabulary "${v.term}"`;
        need(at, v, ['term', 'furigana', 'romaji', 'meaning_id', 'example', 'example_furigana', 'example_id']);
        if (!['dasar', 'menengah', 'lanjut'].includes(v.level)) err(at, 'level harus dasar/menengah/lanjut');
        taken('vocabulary', v.term, at);
        if (handKeys.vocabulary && handKeys.vocabulary.has(v.term)) err(at, 'bentrok dengan kosakata tulisan tangan di schema — pindahkan barisnya ke sini');
      });
      (mod.kanji || []).forEach(k => {
        const at = `${w} kanji "${k.kanji}"`;
        need(at, k, ['kanji', 'onyomi', 'meaning_id', 'sentence', 'sentence_furigana', 'sentence_id']);
        if (!Array.isArray(k.examples) || !k.examples.length || k.examples.some(e => !e.word || !e.reading || !e.meaning_id)) err(at, 'examples wajib [{word, reading, meaning_id}]');
        taken('kanji', k.kanji, at);
        if (handKeys.kanji && handKeys.kanji.has(k.kanji)) err(at, 'bentrok dengan kanji tulisan tangan di schema');
      });
      (mod.grammar || []).forEach(g => {
        const at = `${w} grammar "${g.pattern}"`;
        need(at, g, ['id', 'pattern', 'meaning_id', 'explanation', 'structure']);
        if (!Array.isArray(g.examples) || g.examples.length < 2 || g.examples.some(e => !e.jp || !e.furigana || !e.id)) err(at, 'examples wajib ≥2 [{jp, furigana, id}]');
        taken('grammar', g.pattern, at);
        taken('ids', g.id, at);
        if (handKeys.grammar && handKeys.grammar.has(g.pattern)) err(at, 'bentrok dengan grammar tulisan tangan di schema');
      });
      ['listening', 'reading'].forEach(kind => (mod[kind] || []).forEach(x => {
        const at = `${w} ${kind} "${x.title}"`;
        need(at, x, kind === 'listening' ? ['id', 'title', 'audio_text', 'transcript', 'transcript_furigana', 'translation_id'] : ['id', 'title', 'text', 'furigana_text', 'translation_id']);
        if (!Array.isArray(x.questions) || !x.questions.length) err(at, 'questions wajib diisi');
        else x.questions.forEach((q, i) => { const e = contentQuestionError(q); if (e) err(at, `soal ${i + 1}: ${e}`); });
        taken(kind, x.title, at);
        taken('ids', x.id, at);
        if (handKeys[kind] && handKeys[kind].has(x.title)) err(at, 'bentrok dengan judul tulisan tangan di schema');
      }));
      (mod.lessons || []).forEach((l, i) => {
        const at = `${w} lesson ${i + 1}`;
        need(at, l, ['slug', 'title', 'title_jp', 'description', 'body_md']);
        if (!String(l.slug).startsWith(mod.module + '-')) err(at, `slug harus berawalan "${mod.module}-"`);
        taken('lessons', l.slug, at);
        (l.vocab || []).forEach(t => { if (!vocabTerms.has(t)) err(at, `vocab "${t}" tidak ada di kosakata modul ini`); });
        (String(l.body_md).match(/\]\((\/[^)]+)\)/g) || []).forEach(m => {
          const rel = m.slice(2, -1).split(/[?#]/)[0];
          if (!fs.existsSync(path.join(ROOT, rel))) err(at, `tautan mati ${rel}`);
        });
      });
      const quiz = mod.quiz;
      if (!quiz) err(w, 'quiz modul wajib ada');
      else {
        need(`${w} quiz`, quiz, ['title', 'description']);
        if (handKeys.quizzes && handKeys.quizzes.has(quiz.title)) err(`${w} quiz`, 'judul bentrok dengan kuis tulisan tangan');
        (quiz.questions || []).forEach((q, i) => {
          const at = `${w} quiz soal ${i + 1}`;
          const e = validateQuestion(q);
          if (e) err(at, e);
          if (!areas[q.area]) err(at, `area "${q.area}" tidak ada di matriks`);
        });
        if (!(quiz.questions || []).length) err(`${w} quiz`, 'tanpa soal');
      }
    });
  });
  return errors;
}

// ── Bangun keluaran ────────────────────────────────────────────────────────
const tagsOf = (mod, area) => [GEN, mod].concat(area ? ['area:' + area] : []);

function mocksFor(matrix, modules) {
  // Pool = semua soal kuis modul. Mock hanya dibuat bila SETIAP area
  // distribusi resminya punya soal cukup; kalau belum, dilaporkan saja.
  const pool = modules.flatMap(m => ((m.quiz && m.quiz.questions) || []).map(q => ({ ...q, module: m.module })));
  const made = [], pending = [];
  (matrix.mocks || []).forEach(mock => {
    const exam = matrix.exams[mock.exam];
    const dist = Object.fromEntries(Object.entries(exam.areas).map(([a, v]) => ['area:' + a, v.questions]));
    const short = Object.entries(dist).map(([t, n]) => [t, n, pool.filter(q => 'area:' + q.area === t).length]).filter(([, n, have]) => have < n);
    if (short.length) pending.push({ id: mock.id, short: short.map(([t, n, have]) => `${t} ${have}/${n}`) });
    else made.push({ ...mock, exam, dist, questions: pool.filter(q => dist['area:' + q.area]) });
  });
  return { made, pending };
}

function buildField({ matrix, modules }) {
  const field = matrix.field;
  const order = new Map((matrix.modules || []).map((m, i) => [m.id, i]));
  const mods = modules.slice().sort((a, b) => order.get(a.module) - order.get(b.module));
  const meta = id => matrix.modules.find(m => m.id === id);
  const sortOf = id => 110 + order.get(id) * 10;
  const { made, pending } = mocksFor(matrix, mods);

  // ── JSON statis (bentuk seed.fields[slug]) ──
  const out = { _generated: 'scripts/build-ssw-content.js — jangan disunting manual', slug: field,
    modules: [], vocabulary: [], kanji: [], grammar: [], listening: [], reading: [], quizzes: [], quizBanks: {} };
  const quizMeta = (slug, extra) => Object.assign({ id: slug, slug, category_id: null, source: 'practice', source_name: SOURCE_NAME, source_url: '', published: true }, extra);

  mods.forEach(mod => {
    const m = meta(mod.module);
    out.modules.push({ id: mod.module, slug: mod.module, title: m.title, title_jp: m.title_jp, description: mod.description,
      sort: sortOf(mod.module), published: true, tags: tagsOf(mod.module),
      ssw_lessons: (mod.lessons || []).map((l, i) => ({ id: l.slug, slug: l.slug, title: l.title, title_jp: l.title_jp,
        description: l.description, body_md: l.body_md, dialogues: l.dialogues || [], notes: l.notes || '',
        vocab: l.vocab || [], sort: i + 1, published: true, tags: tagsOf(mod.module) })) });
    (mod.vocabulary || []).forEach(v => out.vocabulary.push(Object.assign({ id: `${field}-v-${v.term}` }, v, { tags: tagsOf(mod.module, v.area), source: 'practice' })));
    (mod.kanji || []).forEach(k => out.kanji.push(Object.assign({ id: `${field}-k-${k.kanji}` }, k, { tags: tagsOf(mod.module), source: 'practice' })));
    ['grammar', 'listening', 'reading'].forEach(kind => (mod[kind] || []).forEach(x => out[kind].push(Object.assign({}, x, { tags: tagsOf(mod.module), source: 'practice' }))));
    const q = mod.quiz;
    const slug = `${mod.module}-quiz`;
    const qm = quizMeta(slug, { kind: 'quiz', title: q.title, description: q.description, pass_score: q.pass_score || 70,
      time_limit_min: null, question_count: null, randomize: Boolean(q.randomize), distribution: null, tags: tagsOf(mod.module), sort: sortOf(mod.module) });
    out.quizzes.push(qm);
    out.quizBanks[slug] = Object.assign({}, qm, { ssw_questions: q.questions.map((x, i) => ({ id: `${slug}-q${i + 1}`, type: x.type,
      payload: x.payload, answer: x.answer, explanation: x.explanation, points: x.points || 1, sort: i + 1, tags: tagsOf(mod.module, x.area) })) });
  });
  made.forEach((mk, n) => {
    const qm = quizMeta(mk.id, { kind: 'mock', title: mk.title, pass_score: 60, time_limit_min: mk.exam.minutes,
      question_count: mk.exam.questions, randomize: true, distribution: mk.dist, tags: [GEN, 'mock'], sort: 900 + n,
      description: `Simulasi ${mk.exam.name}: ${mk.exam.questions} soal / ${mk.exam.minutes} menit, proporsi per bidang mengikuti ujian resmi. Batas lulus 60% adalah ambang LATIHAN — batas resmi ditetapkan MHLW setelah koreksi tingkat kesulitan.` });
    out.quizzes.push(qm);
    out.quizBanks[mk.id] = Object.assign({}, qm, { ssw_questions: mk.questions.map((x, i) => ({ id: `${mk.id}-q${i + 1}`, type: x.type,
      payload: x.payload, answer: x.answer, explanation: x.explanation, points: x.points || 1, sort: i + 1, tags: tagsOf(x.module, x.area) })) });
  });

  // ── SQL ──
  const C = cat(field);
  const sql = [`-- ── ${field}: ${mods.length} modul dari scripts/ssw-curriculum/${field}/ ──`];
  sql.push(upsert('ssw_modules', ['category_id', 'slug', 'title', 'title_jp', 'description', 'sort', 'tags'],
    out.modules.map(m => [C, lit(m.slug), lit(m.title), lit(m.title_jp), lit(m.description), m.sort, pgArr(m.tags)]), ['category_id', 'slug']));
  sql.push(upsert('ssw_vocabulary', ['category_id', 'term', 'furigana', 'romaji', 'meaning_id', 'meaning_en', 'example', 'example_furigana', 'example_id', 'level', 'tags', 'source'],
    out.vocabulary.map(v => [C, lit(v.term), lit(v.furigana), lit(v.romaji), lit(v.meaning_id), lit(v.meaning_en || ''), lit(v.example), lit(v.example_furigana), lit(v.example_id), lit(v.level), pgArr(v.tags), lit('practice')]),
    ['category_id', 'term'], { touch: true }));
  sql.push(upsert('ssw_kanji', ['category_id', 'kanji', 'onyomi', 'kunyomi', 'furigana', 'meaning_id', 'examples', 'sentence', 'sentence_furigana', 'sentence_id', 'tags', 'source'],
    out.kanji.map(k => [C, lit(k.kanji), lit(k.onyomi), lit(k.kunyomi || ''), lit(k.furigana || ''), lit(k.meaning_id), json(k.examples), lit(k.sentence), lit(k.sentence_furigana), lit(k.sentence_id), pgArr(k.tags), lit('practice')]),
    ['category_id', 'kanji'], { touch: true }));
  sql.push(upsert('ssw_grammar', ['category_id', 'pattern', 'meaning_id', 'explanation', 'structure', 'examples', 'notes', 'tags', 'source'],
    out.grammar.map(g => [C, lit(g.pattern), lit(g.meaning_id), lit(g.explanation), lit(g.structure), json(g.examples), lit(g.notes || ''), pgArr(g.tags), lit('practice')]),
    ['category_id', 'pattern'], { touch: true }));
  sql.push(upsert('ssw_listening', ['category_id', 'title', 'audio_text', 'transcript', 'transcript_furigana', 'translation_id', 'questions', 'tags', 'source'],
    out.listening.map(l => [C, lit(l.title), lit(l.audio_text), lit(l.transcript), lit(l.transcript_furigana), lit(l.translation_id), json(l.questions), pgArr(l.tags), lit('practice')]),
    ['category_id', 'title'], { touch: true }));
  sql.push(upsert('ssw_reading', ['category_id', 'title', 'text', 'furigana_text', 'translation_id', 'vocab', 'questions', 'tags', 'source'],
    out.reading.map(r => [C, lit(r.title), lit(r.text), lit(r.furigana_text), lit(r.translation_id), json(r.vocab || []), json(r.questions), pgArr(r.tags), lit('practice')]),
    ['category_id', 'title'], { touch: true }));
  const lessons = out.modules.flatMap(m => m.ssw_lessons.map(l => ({ m, l })));
  sql.push(upsert('ssw_lessons', ['module_id', 'slug', 'title', 'title_jp', 'description', 'body_md', 'dialogues', 'notes', 'vocab_ids', 'sort', 'tags', 'source'],
    lessons.map(({ m, l }) => [modRef(field, m.slug), lit(l.slug), lit(l.title), lit(l.title_jp), lit(l.description), lit(l.body_md), json(l.dialogues), lit(l.notes),
      `ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=${C} AND term = ANY(${pgArr(l.vocab)}::text[]))`, l.sort, pgArr(l.tags), lit('practice')]),
    ['module_id', 'slug'], { touch: true }));
  sql.push(upsert('ssw_quizzes', ['category_id', 'slug', 'kind', 'title', 'description', 'pass_score', 'time_limit_min', 'question_count', 'randomize', 'distribution', 'source', 'source_name', 'tags'],
    out.quizzes.map(q => [C, lit(q.slug), lit(q.kind), lit(q.title), lit(q.description), q.pass_score, lit(q.time_limit_min), lit(q.question_count), q.randomize, q.distribution ? json(q.distribution) : 'NULL', lit('practice'), lit(SOURCE_NAME), pgArr(q.tags)]),
    ['category_id', 'slug']));
  const questions = out.quizzes.flatMap(q => out.quizBanks[q.id].ssw_questions.map(x => ({ q, x })));
  sql.push(upsert('ssw_questions', ['quiz_id', 'type', 'payload', 'answer', 'explanation', 'points', 'sort', 'tags'],
    questions.map(({ q, x }) => [quizRef(field, q.slug), lit(x.type), json(x.payload), json(x.answer), lit(x.explanation), x.points, x.sort, pgArr(x.tags)]),
    ['quiz_id', 'sort']));
  // Bersihkan baris generated yang sudah tidak ada di sumber.
  const g = `tags @> '{${GEN}}'`;
  sql.push(`DELETE FROM ssw_modules WHERE category_id=${C} AND ${g} AND slug <> ALL (${pgArr(out.modules.map(m => m.slug))}::text[]);`);
  sql.push(`DELETE FROM ssw_lessons l USING ssw_modules m WHERE l.module_id = m.id AND m.category_id=${C} AND l.${g} AND (m.slug || '/' || l.slug) <> ALL (${pgArr(lessons.map(({ m, l }) => m.slug + '/' + l.slug))}::text[]);`);
  [['ssw_vocabulary', 'term', out.vocabulary.map(v => v.term)], ['ssw_kanji', 'kanji', out.kanji.map(k => k.kanji)],
    ['ssw_grammar', 'pattern', out.grammar.map(x => x.pattern)], ['ssw_listening', 'title', out.listening.map(x => x.title)],
    ['ssw_reading', 'title', out.reading.map(x => x.title)], ['ssw_quizzes', 'slug', out.quizzes.map(q => q.slug)]]
    .forEach(([t, col, keys]) => sql.push(`DELETE FROM ${t} WHERE category_id=${C} AND ${g} AND ${col} <> ALL (${pgArr(keys)}::text[]);`));
  out.quizzes.forEach(q => sql.push(`DELETE FROM ssw_questions WHERE quiz_id = ${quizRef(field, q.slug)} AND ${g} AND sort > ${out.quizBanks[q.id].ssw_questions.length};`));

  return { field, json: out, sql: sql.filter(Boolean).join('\n'), pending };
}

function stripBlock(schema) {
  const a = schema.indexOf(BEGIN), b = schema.indexOf(END);
  if (a === -1 || b === -1 || b < a) throw new Error('penanda blok SSW-CONTENT tidak ditemukan di supabase-schema.sql');
  return schema.slice(0, a) + schema.slice(b + END.length);
}

function render(schema, built) {
  const a = schema.indexOf(BEGIN), b = schema.indexOf(END);
  if (a === -1 || b === -1 || b < a) throw new Error('penanda blok SSW-CONTENT tidak ditemukan di supabase-schema.sql');
  const head = [BEGIN,
    '-- Diisi `node scripts/build-ssw-content.js` dari scripts/ssw-curriculum/.',
    '-- Diletakkan SEBELUM konten tulisan tangan supaya kunci yang sama milik',
    '-- generator (ON CONFLICT … DO NOTHING di bawah lalu melewatinya).'].join('\n');
  const body = built.map(x => x.sql).join('\n');
  return schema.slice(0, a) + head + '\n' + body + (body ? '\n' : '') + schema.slice(b);
}

function build() {
  const curricula = loadCurricula();
  const schema = fs.readFileSync(SCHEMA, 'utf8');
  const errors = validate(curricula, handwrittenKeys(schema));
  if (errors.length) return { errors };
  const built = curricula.map(buildField).filter(b => b.json.modules.length);
  const files = { [path.join(OUT_DIR, 'index.json')]: JSON.stringify({ fields: built.map(b => b.field) }) + '\n' };
  built.forEach(b => { files[path.join(OUT_DIR, b.field + '.json')] = JSON.stringify(b.json) + '\n'; });
  files[SCHEMA] = render(schema, built);
  return { errors: [], files, built };
}

function run(argv) {
  const res = build();
  if (res.errors.length) {
    console.error(`✗ ${res.errors.length} masalah di scripts/ssw-curriculum/:`);
    res.errors.forEach(e => console.error('  - ' + e));
    process.exitCode = 1;
    return res;
  }
  const stale = Object.entries(res.files).filter(([p, s]) => !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== s).map(([p]) => path.relative(ROOT, p));
  res.built.forEach(b => {
    console.log(`• ${b.field}: ${b.json.modules.length} modul, ${b.json.vocabulary.length} kosakata, ${Object.keys(b.json.quizBanks).length} kuis`);
    b.pending.forEach(p => console.log(`  mock ${p.id} belum dibuat — bank soal kurang: ${p.short.join(', ')}`));
  });
  if (argv.includes('--check')) {
    if (stale.length) { console.error('✗ keluaran basi: ' + stale.join(', ') + ' — jalankan: node scripts/build-ssw-content.js'); process.exitCode = 1; }
    else console.log('✓ keluaran SSW-CONTENT sesuai sumbernya.');
    return res;
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  stale.forEach(rel => fs.writeFileSync(path.join(ROOT, rel), res.files[path.join(ROOT, rel)]));
  console.log(stale.length ? '✓ ditulis: ' + stale.join(', ') : '✓ tidak ada perubahan.');
  return res;
}

if (require.main === module) run(process.argv.slice(2));

module.exports = { build, stripBlock, BEGIN, END };
