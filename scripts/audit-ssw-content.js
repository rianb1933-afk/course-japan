#!/usr/bin/env node
/**
 * scripts/audit-ssw-content.js — audit baseline & quality gate konten SSW
 * =======================================================================
 * Membaca seed konten SSW di supabase-schema.sql (jalur DB = konten produksi;
 * assets/ssw-seed.js hanyalah contoh offline) lalu melaporkan, per bidang:
 * jumlah tiap jenis konten, selisihnya terhadap target, dan masalah kualitas.
 *
 *   node scripts/audit-ssw-content.js            laporan tabel
 *   node scripts/audit-ssw-content.js --json     keluaran mesin
 *   node scripts/audit-ssw-content.js --strict   exit 1 bila ada error
 *
 * Tingkat masalah:
 *   error — merusak seed atau pengalaman belajar: relasi judul yang tidak
 *           ada/ambigu (subquery `WHERE title=` mengembalikan >1 baris dan
 *           seluruh INSERT gagal), field wajib kosong, kunci jawaban tidak
 *           valid, soal tanpa pembahasan, label Official tanpa URL sumber,
 *           placeholder, dan target yang kurang pada bidang berstatus complete.
 *   warn  — kualitas: konten tipis, isi templat yang sama persis di banyak
 *           bidang, duplikat yang diam-diam dibuang ON CONFLICT DO NOTHING.
 *
 * Target & status bidang: scripts/ssw-content-targets.json. Aturan soal kuis
 * diambil dari netlify/functions/ssw-cms.js (validateQuestion) supaya seed dan
 * CMS tidak punya dua versi aturan.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Parser INSERT … VALUES (…),(…) ─────────────────────────────────────────
// Cukup untuk bentuk seed ini: literal string ('' sebagai escape), angka,
// true/false/NULL, dan subquery bersarang (disimpan mentah sebagai {sql}).

function skipGap(s, i) {
  for (;;) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (s.startsWith('--', i)) { i = s.indexOf('\n', i); if (i === -1) return s.length; continue; }
    return i;
  }
}

function literal(raw) {
  const t = raw.trim();
  if (/^'(?:[^']|'')*'$/s.test(t)) return t.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (/^true$/i.test(t)) return true;
  if (/^false$/i.test(t)) return false;
  if (/^null$/i.test(t)) return null;
  return { sql: t };
}

function parseTuple(s, i) {
  const fields = [];
  let depth = 0, start = i + 1, q = false;
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (q) {
      if (c === "'") { if (s[j + 1] === "'") j++; else q = false; }
      continue;
    }
    if (c === "'") q = true;
    else if (c === '(') depth++;
    else if (c === ')') {
      if (depth === 0) { fields.push(literal(s.slice(start, j))); return [fields, j + 1]; }
      depth--;
    } else if (c === ',' && depth === 0) { fields.push(literal(s.slice(start, j))); start = j + 1; }
  }
  throw new Error('tuple tidak tertutup di posisi ' + i);
}

function parseInserts(sql) {
  const tables = {};
  const re = /INSERT INTO (ssw_[a-z_]+) \(([^)]*)\) VALUES/g;
  let m;
  while ((m = re.exec(sql))) {
    const cols = m[2].split(',').map(c => c.trim());
    const rows = tables[m[1]] || (tables[m[1]] = []);
    let i = skipGap(sql, re.lastIndex);
    while (sql[i] === '(') {
      const [vals, end] = parseTuple(sql, i);
      rows.push(Object.fromEntries(cols.map((c, k) => [c, vals[k]])));
      i = skipGap(sql, end);
      if (sql[i] !== ',') break;
      i = skipGap(sql, i + 1);
    }
    re.lastIndex = i;
  }
  return tables;
}

// ── Model konten per bidang ────────────────────────────────────────────────
const ref = (v, re) => ((v && v.sql ? v.sql : '').match(re) || [])[1];
const slugRef = v => ref(v, /ssw_categories WHERE slug='([^']+)'/);
const titleRef = (v, table) => {
  const hit = ref(v, new RegExp(table + " WHERE title='((?:[^']|'')*)'"));
  return hit && hit.replace(/''/g, "'");
};
const json = v => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return undefined; } };

const KINDS = ['vocabulary', 'kanji', 'grammar', 'listening', 'reading'];

function loadContent(sql) {
  const t = parseInserts(sql);
  const slugs = (t.ssw_categories || []).map(r => r.slug);
  const fields = Object.fromEntries(slugs.map(s => [s, {
    slug: s, modules: [], lessons: [], quizzes: [], questions: [],
    ...Object.fromEntries(KINDS.map(k => [k, []])),
  }]));
  const orphans = [];
  const put = (slug, key, row, table) => {
    if (fields[slug]) fields[slug][key].push(row);
    else orphans.push({ table, detail: 'bidang tidak dikenal: ' + slug });
  };
  (t.ssw_modules || []).forEach(r => put(slugRef(r.category_id), 'modules', r, 'ssw_modules'));
  KINDS.forEach(k => (t['ssw_' + k] || []).forEach(r => put(slugRef(r.category_id), k, r, 'ssw_' + k)));
  (t.ssw_quizzes || []).forEach(r => put(slugRef(r.category_id), 'quizzes', r, 'ssw_quizzes'));

  // Relasi lewat judul: lesson → modul, soal → kuis. Judul harus unik
  // GLOBAL, karena subquery-nya tidak menyaring bidang.
  const byTitle = (list) => {
    const map = new Map();
    list.forEach(({ slug, row }) => map.set(row.title, (map.get(row.title) || []).concat(slug)));
    return map;
  };
  const allModules = Object.values(fields).flatMap(f => f.modules.map(row => ({ slug: f.slug, row })));
  const allQuizzes = Object.values(fields).flatMap(f => f.quizzes.map(row => ({ slug: f.slug, row })));
  const moduleOwners = byTitle(allModules);
  const quizOwners = byTitle(allQuizzes);

  // Relasi berkunci slug (keluaran scripts/build-ssw-content.js):
  // `… WHERE category_id=(… slug='kaigo') AND slug='kaigo-m05'` — tidak ambigu.
  const slugRel = (v, table) => {
    const m = (v && v.sql ? v.sql : '').match(new RegExp(table + " WHERE category_id=\\(SELECT id FROM ssw_categories WHERE slug='([^']+)'\\) AND slug='((?:[^']|'')*)'"));
    return m && { field: m[1], slug: m[2].replace(/''/g, "'") };
  };
  const bySlug = (rel, key) => rel && fields[rel.field] && fields[rel.field][key].find(x => x.slug === rel.slug);

  (t.ssw_lessons || []).forEach(r => {
    const rel = slugRel(r.module_id, 'ssw_modules');
    if (rel) {
      const mod = bySlug(rel, 'modules');
      if (mod) fields[rel.field].lessons.push({ ...r, _module: mod.title });
      else orphans.push({ table: 'ssw_lessons', detail: `lesson "${r.slug}" → modul slug "${rel.slug}" (${rel.field}) tidak ada` });
      return;
    }
    const title = titleRef(r.module_id, 'ssw_modules');
    const owners = moduleOwners.get(title) || [];
    if (owners.length === 1) fields[owners[0]].lessons.push({ ...r, _module: title });
    else orphans.push({ table: 'ssw_lessons', detail: `lesson "${r.slug}" → modul "${title}" ${owners.length ? 'ambigu (' + owners.join(', ') + ')' : 'tidak ada'}` });
  });
  (t.ssw_questions || []).forEach(r => {
    const rel = slugRel(r.quiz_id, 'ssw_quizzes');
    if (rel) {
      const quiz = bySlug(rel, 'quizzes');
      if (quiz) fields[rel.field].questions.push({ ...r, _quiz: quiz.title });
      else orphans.push({ table: 'ssw_questions', detail: `soal → kuis slug "${rel.slug}" (${rel.field}) tidak ada` });
      return;
    }
    const title = titleRef(r.quiz_id, 'ssw_quizzes');
    const owners = quizOwners.get(title) || [];
    if (owners.length === 1) fields[owners[0]].questions.push({ ...r, _quiz: title });
    else orphans.push({ table: 'ssw_questions', detail: `soal → kuis "${title}" ${owners.length ? 'ambigu (' + owners.join(', ') + ')' : 'tidak ada'}` });
  });
  const dupTitles = (owners, table) => [...owners].filter(([, s]) => s.length > 1)
    .map(([title, s]) => ({ table, detail: `judul "${title}" dipakai ${s.length}× (${s.join(', ')}) — subquery WHERE title= jadi ambigu` }));

  return { fields, orphans: orphans.concat(dupTitles(moduleOwners, 'ssw_modules'), dupTitles(quizOwners, 'ssw_quizzes')) };
}

// ── Pemeriksaan ────────────────────────────────────────────────────────────
const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem ipsum|placeholder)\b|\?\?\?|xxx/i;
const REQUIRED = {
  vocabulary: ['term', 'meaning_id'], kanji: ['kanji', 'meaning_id'], grammar: ['pattern', 'meaning_id'],
  listening: ['title', 'audio_text'], reading: ['title', 'text'],
};
const THIN_LESSON_CHARS = 400;

function contentQuestionError(q) {
  if (!q || typeof q.question !== 'string' || !q.question.trim()) return 'pertanyaan kosong';
  if (q.type === 'choice') {
    if (!Array.isArray(q.choices) || q.choices.length < 2) return 'pilihan < 2';
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.choices.length) return 'correct bukan indeks pilihan yang valid';
  } else if (q.type === 'tf') {
    if (typeof q.correct !== 'boolean') return 'correct tf harus boolean';
  } else return `tipe "${q.type}" tidak dinilai renderer (hanya choice/tf)`;
  if (!q.explanation || !String(q.explanation).trim()) return 'tanpa pembahasan';
  return null;
}

function metrics(f) {
  const perModule = f.modules.map(m => f.lessons.filter(l => l._module === m.title).length);
  return {
    modules: f.modules.length,
    lessons: f.lessons.length,
    lessonsPerModule: perModule.length ? Math.min(...perModule) : 0,
    vocabulary: f.vocabulary.length, kanji: f.kanji.length, grammar: f.grammar.length,
    listening: f.listening.length, reading: f.reading.length,
    quizzes: f.quizzes.filter(q => q.kind !== 'mock').length,
    mock: f.quizzes.filter(q => q.kind === 'mock').length,
    questions: f.questions.length,
  };
}

function audit(sql, targetsCfg, validateQuestion) {
  const { fields, orphans } = loadContent(sql);
  const issues = orphans.map(o => ({ level: 'error', field: '-', ...o }));
  const add = (level, field, table, detail) => issues.push({ level, field, table, detail });
  const std = targetsCfg.standard || {};

  const report = Object.values(fields).map(f => {
    const cfg = (targetsCfg.fields || {})[f.slug] || {};
    const status = cfg.status || targetsCfg.defaultStatus || 'draft';
    const target = { ...std, ...(cfg.min || {}) };
    const m = metrics(f);

    KINDS.forEach(k => {
      const seen = new Set();
      const key = { vocabulary: 'term', kanji: 'kanji', grammar: 'pattern', listening: 'title', reading: 'title' }[k];
      f[k].forEach(r => {
        const miss = REQUIRED[k].filter(c => typeof r[c] !== 'string' || !r[c].trim());
        if (miss.length) add('error', f.slug, 'ssw_' + k, `"${r[key]}" tanpa ${miss.join(', ')}`);
        if (seen.has(r[key])) add('warn', f.slug, 'ssw_' + k, `"${r[key]}" ganda — baris kedua dibuang ON CONFLICT DO NOTHING`);
        seen.add(r[key]);
        if (PLACEHOLDER.test(JSON.stringify(r))) add('error', f.slug, 'ssw_' + k, `"${r[key]}" berisi placeholder`);
        if (k === 'listening' || k === 'reading') {
          const qs = json(r.questions);
          if (!Array.isArray(qs)) add('error', f.slug, 'ssw_' + k, `"${r.title}" questions bukan JSON array`);
          else qs.forEach((q, i) => { const e = contentQuestionError(q); if (e) add('error', f.slug, 'ssw_' + k, `"${r.title}" soal ${i + 1}: ${e}`); });
        }
      });
    });
    f.vocabulary.filter(v => !v.example).forEach(v => add('warn', f.slug, 'ssw_vocabulary', `"${v.term}" tanpa contoh kalimat`));
    f.lessons.forEach(l => {
      const body = typeof l.body_md === 'string' ? l.body_md : '';
      if (body.trim().length < THIN_LESSON_CHARS) add('warn', f.slug, 'ssw_lessons', `"${l.slug}" tipis (${body.trim().length} karakter)`);
      if (PLACEHOLDER.test(body)) add('error', f.slug, 'ssw_lessons', `"${l.slug}" berisi placeholder`);
    });
    f.quizzes.forEach(q => {
      if (q.source === 'official' && !q.source_url) add('error', f.slug, 'ssw_quizzes', `"${q.title}" berlabel official tanpa source_url`);
      const n = f.questions.filter(x => x._quiz === q.title).length;
      if (!n) add('error', f.slug, 'ssw_quizzes', `"${q.title}" tanpa soal`);
      else if (q.question_count && n < q.question_count) add('error', f.slug, 'ssw_quizzes', `"${q.title}" menarik ${q.question_count} soal dari bank berisi ${n}`);
    });
    f.questions.forEach(q => {
      const e = validateQuestion({ type: q.type, payload: json(q.payload), answer: json(q.answer), explanation: q.explanation });
      if (e) add('error', f.slug, 'ssw_questions', `"${q._quiz}" #${q.sort}: ${e}`);
    });

    const gaps = Object.fromEntries(Object.keys(target).map(k => [k, Math.max(0, target[k] - (m[k] || 0))]).filter(([, g]) => g > 0));
    if (status === 'complete') Object.entries(gaps).forEach(([k, g]) => add('error', f.slug, 'target', `${k} kurang ${g} dari target ${target[k]} (status complete)`));
    return { slug: f.slug, status, metrics: m, target, gaps };
  });

  // Isi templat: teks identik di ≥3 bidang biasanya berarti satu paragraf
  // disalin dengan nama bidang saja yang diganti — bukan konten bidang.
  const TEMPLATE_COLS = { ssw_lessons: 'body_md', ssw_grammar: 'explanation', ssw_modules: 'description' };
  Object.entries(TEMPLATE_COLS).forEach(([table, col]) => {
    const key = table.replace('ssw_', '');
    const seen = new Map();
    Object.values(fields).forEach(f => f[key].forEach(r => {
      const txt = String(r[col] || '').trim();
      if (txt.length > 40) seen.set(txt, (seen.get(txt) || new Set()).add(f.slug));
    }));
    seen.forEach((s, txt) => { if (s.size >= 3) add('warn', '-', table, `${col} identik di ${s.size} bidang: "${txt.slice(0, 60)}…"`); });
  });

  return { report, issues };
}

function run(argv) {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase-schema.sql'), 'utf8');
  const targets = JSON.parse(fs.readFileSync(path.join(__dirname, 'ssw-content-targets.json'), 'utf8'));
  const { validateQuestion } = require(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js'));
  const result = audit(sql, targets, validateQuestion);
  const errors = result.issues.filter(i => i.level === 'error');

  if (argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const cols = ['modules', 'lessons', 'vocabulary', 'kanji', 'grammar', 'listening', 'reading', 'quizzes', 'mock', 'questions'];
    const head = ['bidang', 'status', ...cols.map(c => c.slice(0, 5))];
    const rows = result.report.map(r => [r.slug, r.status, ...cols.map(c => {
      const t = r.target[c];
      return t ? `${r.metrics[c]}/${t}` : String(r.metrics[c]);
    })]);
    const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
    const line = r => r.map((c, i) => c.padEnd(w[i])).join('  ');
    console.log(line(head));
    rows.forEach(r => console.log(line(r)));
    const byLevel = lvl => result.issues.filter(i => i.level === lvl);
    console.log(`\n${errors.length} error, ${byLevel('warn').length} warning`);
    ['error', 'warn'].forEach(lvl => {
      const list = byLevel(lvl);
      if (!list.length) return;
      console.log(`\n── ${lvl.toUpperCase()} ──`);
      list.slice(0, argv.includes('--all') ? Infinity : 40)
        .forEach(i => console.log(`  [${i.field}] ${i.table}: ${i.detail}`));
      if (!argv.includes('--all') && list.length > 40) console.log(`  … ${list.length - 40} lagi (--all)`);
    });
  }
  if (argv.includes('--strict') && errors.length) process.exitCode = 1;
  return result;
}

if (require.main === module) run(process.argv.slice(2));

module.exports = { parseInserts, loadContent, audit, contentQuestionError };
