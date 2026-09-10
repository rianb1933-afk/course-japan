/**
 * assets/ssw-api.js — klien data platform SSW (特定技能)
 * =======================================================
 * Semua halaman SSW memakai modul ini untuk membaca konten dari
 * Supabase (PostgREST, RLS published=true) dan menulis progres/favorit
 * milik user sendiri. Memakai window.EDUMA_ENV (assets/env.js) untuk
 * URL+anon key dan window.SupabaseClient.Auth (assets/supabase-client.js)
 * untuk sesi/user id — dua-duanya wajib dimuat SEBELUM file ini.
 * Fallback offline: bila Supabase belum dikonfigurasi atau tabelnya
 * belum ada, kategori & konten contoh dimuat dari window.NP_SSW_SEED
 * (disuntik per halaman) supaya UI tetap hidup di preview — pola yang
 * sama dengan halaman lain di proyek ini (mode demo tanpa error merah).
 *
 * Progres lokal: localStorage np-ssw-v1 (aturan repo: key baru pakai
 * prefiks np-). Push ke Supabase (ssw_progress/ssw_favorites/
 * ssw_exam_results) hanya saat user login — diam saja saat belum.
 *
 * IIFE, namespace window.SSWAPI — pola assets/platform.js.
 */
(function () {
  'use strict';

  const LS_KEY = 'np-ssw-v1';

  // ── Jembatan Supabase ────────────────────────────────────────
  // Proyek ini TIDAK memuat @supabase/supabase-js. Yang tersedia adalah
  // pembungkus buatan sendiri window.SupabaseClient ({Auth, DB, Sync},
  // berbasis fetch) dari assets/supabase-client.js, plus window.EDUMA_ENV
  // dari assets/env.js. Versi sebelumnya di sini membaca window.__supabase
  // dan window.NPSupabase.session — dua global yang tidak pernah dibuat
  // siapa pun, jadi setiap halaman SSW selamanya jatuh ke NP_SSW_SEED dan
  // progres tidak pernah tersinkron. Sekarang panggil PostgREST langsung,
  // pola yang sama dengan sbFetch() internal supabase-client.js.
  function sbUrl()  { try { return window.EDUMA_ENV && window.EDUMA_ENV.SUPABASE_URL || ''; } catch (e) { return ''; } }
  function sbKey()  { try { return window.EDUMA_ENV && window.EDUMA_ENV.SUPABASE_ANON_KEY || ''; } catch (e) { return ''; } }
  function sbAuth() { return (window.SupabaseClient && window.SupabaseClient.Auth) || null; }

  function sbConfigured() { return Boolean(sbUrl() && sbKey()); }

  function isLoggedIn() {
    const a = sbAuth();
    try { return Boolean(a && a.isLoggedIn && a.isLoggedIn()); } catch (e) { return false; }
  }
  function userId() {
    const a = sbAuth();
    try { return (a && a.user && a.user() && a.user().id) || null; } catch (e) { return null; }
  }

  // GET/POST/DELETE ke /rest/v1/. `token` sesi dipakai bila ada supaya RLS
  // memberi baris milik user; kalau belum login, anon key cukup untuk
  // konten published=true. Melempar pada !ok — pemanggil membungkus try.
  async function sbRest(path, opts = {}) {
    const base = sbUrl();
    if (!base) throw new Error('SUPABASE_URL belum dikonfigurasi');
    const a = sbAuth();
    let token = sbKey();
    try { token = (a && a.session && a.session() && a.session().access_token) || sbKey(); } catch (e) { /* pakai anon */ }
    const res = await fetch(base + '/rest/v1/' + path, Object.assign({}, opts, {
      headers: Object.assign({
        'Content-Type': 'application/json',
        'apikey': sbKey(),
        'Authorization': 'Bearer ' + token,
      }, opts.headers || {}),
    }));
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('json') ? await res.json().catch(() => null) : null;
    if (!res.ok) throw new Error((body && (body.message || body.hint)) || ('HTTP ' + res.status));
    return body;
  }

  const enc = encodeURIComponent;

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveLocal(state) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* penuh/privat — abaikan */ }
  }
  function local() {
    const s = loadLocal();
    if (!s.progress) s.progress = {};   // key: kind:id -> {completed, score, last_at}
    if (!s.favorites) s.favorites = {}; // key: kind:id -> label
    return s;
  }

  // ── Konten (baca) ─────────────────────────────────────────────
  async function getCategories() {
    if (sbConfigured()) {
      try {
        const data = await sbRest('ssw_categories?published=eq.true&order=sort&select=*');
        if (Array.isArray(data) && data.length) return { categories: data, source: 'db' };
      } catch (e) { /* jatuh ke seed */ }
    }
    return { categories: (window.NP_SSW_SEED && window.NP_SSW_SEED.categories) || [], source: 'seed' };
  }

  async function getFieldTree(slug) {
    if (sbConfigured()) {
      try {
        const cats = await sbRest('ssw_categories?slug=eq.' + enc(slug) + '&published=eq.true&select=*&limit=1');
        const cat = Array.isArray(cats) && cats[0];
        if (cat) {
          const modules = await sbRest('ssw_modules?category_id=eq.' + enc(cat.id) + '&published=eq.true&order=sort&select=*,ssw_lessons(*)');
          return { category: cat, modules: Array.isArray(modules) ? modules : [], source: 'db' };
        }
      } catch (e) { /* jatuh ke seed */ }
    }
    const seed = (window.NP_SSW_SEED || {});
    if (seed.field && seed.field.slug === slug) return { ...seed.field, source: 'seed' };
    return { category: null, modules: [], source: 'seed' };
  }

  async function getItems(slug, kind) {
    if (sbConfigured()) {
      try {
        const cats = await sbRest('ssw_categories?slug=eq.' + enc(slug) + '&select=id&limit=1');
        const cat = Array.isArray(cats) && cats[0];
        if (cat) {
          const data = await sbRest('ssw_' + enc(kind) + '?category_id=eq.' + enc(cat.id) + '&published=eq.true&limit=500&select=*');
          if (Array.isArray(data)) return { items: data, source: 'db' };
        }
      } catch (e) { /* jatuh ke seed */ }
    }
    const seed = (window.NP_SSW_SEED || {});
    if (seed.field && seed.field.slug === slug) {
      return { items: seed.field[kind] || [], source: 'seed' };
    }
    return { items: [], source: 'seed' };
  }

  async function getQuiz(quizId) {
    if (sbConfigured()) {
      try {
        const rows = await sbRest('ssw_quizzes?id=eq.' + enc(quizId) + '&published=eq.true&select=*,ssw_questions(*)&limit=1');
        const data = Array.isArray(rows) && rows[0];
        if (data) {
          (data.ssw_questions || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
          return { quiz: data, source: 'db' };
        }
      } catch (e) { /* jatuh ke seed */ }
    }
    const seed = (window.NP_SSW_SEED || {});
    if (seed.quizzes && seed.quizzes[quizId]) return { quiz: seed.quizzes[quizId], source: 'seed' };
    return { quiz: null, source: 'seed' };
  }

  // ── Progres (lokal selalu, push DB saat login) ────────────────
  function markProgress(kind, itemId, opts) {
    const s = local();
    const key = kind + ':' + itemId;
    const prev = s.progress[key] || {};
    s.progress[key] = {
      completed: opts && opts.completed !== undefined ? Boolean(opts.completed) : Boolean(prev.completed),
      score: opts && opts.score !== undefined ? opts.score : (prev.score || null),
      last_at: new Date().toISOString(),
    };
    saveLocal(s);
    pushProgress(kind, itemId, s.progress[key]);
    return s.progress[key];
  }

  function getProgress(kind, itemId) {
    const s = local();
    return s.progress[kind + ':' + itemId] || null;
  }

  function isCompleted(kind, itemId) {
    const p = getProgress(kind, itemId);
    return Boolean(p && p.completed);
  }

  // Rekap per bidang utk progress bar
  function categorySummary(slug, totals) {
    const s = local();
    const done = { lesson: 0, vocab: 0, kanji: 0, grammar: 0, quiz: 0 };
    const prefix = slug + ':';
    for (const [key, val] of Object.entries(s.progress)) {
      if (!val || !val.completed || !key.startsWith(prefix)) continue;
      const kind = key.slice(prefix.length).split(':')[0];
      if (done[kind] !== undefined) done[kind]++;
    }
    const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
    return {
      lesson: pct(done.lesson, totals.lesson || 0),
      vocab: pct(done.vocab, totals.vocab || 0),
      kanji: pct(done.kanji, totals.kanji || 0),
      grammar: pct(done.grammar, totals.grammar || 0),
      done, percent: pct(done.lesson + done.vocab + done.kanji + done.grammar,
        (totals.lesson || 0) + (totals.vocab || 0) + (totals.kanji || 0) + (totals.grammar || 0)),
    };
  }

  // ── Favorit ───────────────────────────────────────────────────
  function toggleFavorite(kind, itemId, label) {
    const s = local();
    const key = kind + ':' + itemId;
    if (s.favorites[key]) { delete s.favorites[key]; saveLocal(s); pushFavorite(kind, itemId, 'remove'); return false; }
    s.favorites[key] = label || ''; saveLocal(s); pushFavorite(kind, itemId, 'add', label); return true;
  }
  function isFavorite(kind, itemId) {
    return Boolean(local().favorites[kind + ':' + itemId]);
  }
  function listFavorites() {
    const s = local();
    return Object.entries(s.favorites).map(([key, label]) => {
      const [kind, ...rest] = key.split(':');
      return { kind, id: rest.join(':'), label };
    });
  }

  // ── Push diam ke Supabase (best effort, tanpa error merah) ────
  // upsert PostgREST = POST + Prefer: resolution=merge-duplicates + on_conflict.
  async function pushProgress(kind, itemId, val) {
    const uid = userId();
    if (!sbConfigured() || !uid) return;
    try {
      await sbRest('ssw_progress?on_conflict=user_id,item_kind,item_id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_id: uid, item_kind: kind, item_id: String(itemId),
          completed: val.completed, score: val.score, last_at: val.last_at,
        }),
      });
    } catch (e) { /* offline — lokal sudah tersimpan */ }
  }
  async function pushFavorite(kind, itemId, op, label) {
    const uid = userId();
    if (!sbConfigured() || !uid) return;
    try {
      if (op === 'add') {
        await sbRest('ssw_favorites?on_conflict=user_id,item_kind,item_id', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ user_id: uid, item_kind: kind, item_id: String(itemId), label: label || '' }),
        });
      } else {
        await sbRest('ssw_favorites?user_id=eq.' + enc(uid) + '&item_kind=eq.' + enc(kind) + '&item_id=eq.' + enc(String(itemId)), {
          method: 'DELETE', headers: { 'Prefer': 'return=minimal' },
        });
      }
    } catch (e) { /* offline */ }
  }
  async function saveExamResult(result) {
    const s = local();
    s.exam_results = s.exam_results || [];
    s.exam_results.unshift({ ...result, created_at: new Date().toISOString() });
    s.exam_results = s.exam_results.slice(0, 50);
    saveLocal(s);
    const uid = userId();
    if (sbConfigured() && uid) {
      try {
        await sbRest('ssw_exam_results', {
          method: 'POST',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            user_id: uid,
            quiz_id: result.quiz_id || null,
            category_id: result.category_id || null,
            score: result.score, passed: result.passed,
            duration_s: result.duration_s || 0,
            detail: result.detail || [],
          }),
        });
      } catch (e) { /* offline */ }
    }
    return s.exam_results[0];
  }
  function listExamResults(slug) {
    const s = local();
    return (s.exam_results || []).filter(r => !slug || r.slug === slug);
  }

  // Terakhir diakses (Continue Learning)
  function setLastAccessed(entry) {
    const s = local();
    s.last = { ...entry, at: new Date().toISOString() };
    saveLocal(s);
  }
  function getLastAccessed() { return local().last || null; }

  window.SSWAPI = {
    getCategories, getFieldTree, getItems, getQuiz,
    markProgress, getProgress, isCompleted, categorySummary,
    toggleFavorite, isFavorite, listFavorites,
    saveExamResult, listExamResults,
    setLastAccessed, getLastAccessed,
  };
})();
