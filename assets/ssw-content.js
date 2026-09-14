/**
 * assets/ssw-content.js — tampilan konten SSW per jenis
 * =====================================================
 * Dipakai SSW/Kanji.html, Grammar.html, Listening.html, dan Reading.html.
 * Keempatnya dulu kerangka "segera lengkap" yang tidak menampilkan apa pun,
 * padahal datanya ada (tabel ssw_* dan seed offline) — Field-Dashboard
 * bahkan sudah menghitung jumlahnya dan menautkannya ke sini.
 *
 * Bentuk data = baris tabel ssw_* (supabase-schema.sql). Seed offline
 * (assets/ssw-seed.js) wajib memakai bentuk yang sama:
 *   kanji     examples   [{word, reading, meaning_id}]
 *   grammar   examples   [{jp, furigana, id}]
 *   reading   vocab      [{term, reading, meaning_id}]
 *   listening/reading questions:
 *     {type:'choice', question, choices[], correct:<index>,   explanation}
 *     {type:'tf',     question,            correct:<boolean>, explanation}
 * Tipe soal lain ditampilkan tanpa penilaian (pembahasan saja) — lebih baik
 * daripada diam-diam menilai dengan aturan tebakan. Contoh/kosakata yang
 * diisi admin sebagai string polos tetap ditampilkan.
 *
 * Fungsi render* murni (data → string HTML, semua teks di-escape) supaya
 * bisa diuji di Node (scripts/tests/test-ssw-content.js). Progres memakai
 * SSWAPI.markProgress(kind, id) dengan jenis yang sama dengan yang dihitung
 * categorySummary(), jadi bar di Field-Dashboard ikut bergerak.
 *
 * Suara lewat speechSynthesis.speak(), yang dibungkus assets/np-speech.js
 * (pilih voice Jepang terbaik; kalimat panjang ke /api/tts). Karena itu
 * tidak ada pengatur kecepatan di sini: np-speech sengaja mematok rate.
 *
 * IIFE, namespace window.SSWContent — pola assets/ssw-api.js.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const list = v => (Array.isArray(v) ? v : []);
  // Admin bisa mengisi contoh sebagai string polos alih-alih objek.
  const asObj = (v, key) => (typeof v === 'string' ? { [key]: v } : (v || {}));

  function sentence(jp, furigana, id) {
    if (!jp) return '';
    return '<div class="ssw-lesson-dialogue">' +
      '<div class="dg-jp">' + esc(jp) + '</div>' +
      (furigana ? '<div class="dg-furi">' + esc(furigana) + '</div>' : '') +
      (id ? '<div class="dg-id">' + esc(id) + '</div>' : '') + '</div>';
  }

  function details(label, inner) {
    return '<details class="ct-details"><summary>' + esc(label) + '</summary>' +
      '<div class="ssw-lesson-dialogue">' + inner + '</div></details>';
  }

  function actions(kind, id, say) {
    return '<div class="ct-actions">' +
      (say ? '<button type="button" class="ssw-btn ct-audio" data-say="' + esc(say) + '">🔊 Dengarkan</button>' : '') +
      '<button type="button" class="ssw-btn ct-done" data-kind="' + esc(kind) + '" data-id="' + esc(id) +
      '" aria-pressed="false">✓ Tandai dipahami</button></div>';
  }

  function renderQuestions(questions) {
    const qs = list(questions);
    if (!qs.length) return '';
    return '<div class="ct-sub">Soal</div>' + qs.map((q, i) => {
      let opts;
      if (q.type === 'choice') {
        opts = list(q.choices).map((c, ci) =>
          '<button type="button" class="ssw-opt" data-a="' + ci + '">' + esc(c) + '</button>').join('');
      } else if (q.type === 'tf') {
        opts = '<button type="button" class="ssw-opt" data-a="true">Benar</button>' +
               '<button type="button" class="ssw-opt" data-a="false">Salah</button>';
      } else {
        opts = '<button type="button" class="ssw-btn ct-reveal">Lihat pembahasan</button>';
      }
      return '<div class="ssw-q" data-q="' + i + '">' +
        '<div class="q-text">' + (i + 1) + '. ' + esc(q.question) + '</div>' +
        '<div class="ssw-opts">' + opts + '</div>' +
        '<p class="ssw-expl" hidden>' + esc(q.explanation || '') + '</p></div>';
    }).join('');
  }

  // true/false = dinilai; null = tipe yang tidak dikenal (tidak dinilai).
  function grade(q, raw) {
    if (!q) return null;
    if (q.type === 'choice') return Number(raw) === q.correct;
    if (q.type === 'tf') return (String(raw) === 'true') === (q.correct === true);
    return null;
  }

  function renderKanji(k, i) {
    const reads = [k.onyomi && '音 ' + k.onyomi, k.kunyomi && '訓 ' + k.kunyomi].filter(Boolean).join(' · ');
    const ex = list(k.examples).map(e => {
      e = asObj(e, 'word');
      return '<li><span class="jp">' + esc(e.word) + '</span>' +
        (e.reading ? ' <span class="ct-soft">(' + esc(e.reading) + ')</span>' : '') +
        (e.meaning_id ? ' — ' + esc(e.meaning_id) : '') + '</li>';
    }).join('');
    return '<article class="ssw-module ct-card" data-idx="' + i + '">' +
      '<div class="ct-head"><span class="ct-big jp">' + esc(k.kanji) + '</span><div>' +
      (k.furigana ? '<div class="ct-soft">' + esc(k.furigana) + '</div>' : '') +
      '<div class="ct-title">' + esc(k.meaning_id) + '</div>' +
      (reads ? '<div class="ct-soft">' + esc(reads) + '</div>' : '') + '</div></div>' +
      (ex ? '<ul class="ct-list">' + ex + '</ul>' : '') +
      sentence(k.sentence, k.sentence_furigana, k.sentence_id) +
      actions('kanji', k.id, k.sentence || k.kanji) + '</article>';
  }

  function renderGrammar(g, i) {
    const ex = list(g.examples).map(e => { e = asObj(e, 'jp'); return sentence(e.jp, e.furigana, e.id); }).join('');
    const first = asObj(list(g.examples)[0], 'jp').jp;
    return '<article class="ssw-module ct-card" data-idx="' + i + '">' +
      '<h3><span class="mj">' + esc(g.pattern) + '</span></h3>' +
      '<div class="ct-title">' + esc(g.meaning_id) + '</div>' +
      (g.structure ? '<div class="ct-structure jp">' + esc(g.structure) + '</div>' : '') +
      (g.explanation ? '<p class="ct-text">' + esc(g.explanation) + '</p>' : '') + ex +
      (g.notes ? '<p class="ssw-expl">' + esc(g.notes) + '</p>' : '') +
      actions('grammar', g.id, first) + '</article>';
  }

  function renderListening(l, i) {
    const script = '<div class="dg-jp">' + esc(l.transcript || l.audio_text) + '</div>' +
      (l.transcript_furigana ? '<div class="dg-furi">' + esc(l.transcript_furigana) + '</div>' : '');
    return '<article class="ssw-module ct-card" data-idx="' + i + '">' +
      '<h3><span class="mj">聴</span>' + esc(l.title) + '</h3>' +
      '<div class="ct-actions"><button type="button" class="ssw-btn primary ct-audio" data-say="' +
      esc(l.audio_text) + '">▶ Putar audio</button></div>' +
      details('Transkrip', script) +
      (l.translation_id ? details('Terjemahan', '<div class="dg-id">' + esc(l.translation_id) + '</div>') : '') +
      renderQuestions(l.questions) + actions('listening', l.id) + '</article>';
  }

  function renderReading(r, i) {
    const vocab = list(r.vocab).map(v => {
      v = asObj(v, 'term');
      return '<span class="ssw-chip"><span class="jp">' + esc(v.term) + '</span>' +
        (v.reading && v.reading !== v.term ? ' ' + esc(v.reading) : '') +
        (v.meaning_id ? ' · ' + esc(v.meaning_id) : '') + '</span>';
    }).join('');
    return '<article class="ssw-module ct-card" data-idx="' + i + '">' +
      '<h3><span class="mj">読</span>' + esc(r.title) + '</h3>' +
      '<p class="ct-reading jp">' + esc(r.text) + '</p>' +
      (r.furigana_text ? '<p class="ct-reading jp" hidden>' + esc(r.furigana_text) + '</p>' : '') +
      (r.furigana_text ? '<div class="ct-actions"><button type="button" class="ssw-btn ct-furi" aria-pressed="false">ふりがな</button></div>' : '') +
      (r.translation_id ? details('Terjemahan', '<div class="dg-id">' + esc(r.translation_id) + '</div>') : '') +
      (vocab ? '<div class="ct-sub">Kosakata</div><div class="ct-vocab">' + vocab + '</div>' : '') +
      renderQuestions(r.questions) + actions('reading', r.id, r.text) + '</article>';
  }

  const RENDER = { kanji: renderKanji, grammar: renderGrammar, listening: renderListening, reading: renderReading };

  function speak(text) {
    if (!text) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { /* perangkat tanpa suara — abaikan */ }
  }

  function setDone(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('primary', on);
    btn.textContent = on ? '✓ Sudah dipahami' : '✓ Tandai dipahami';
  }

  function answer(btn, items) {
    const qEl = btn.closest('.ssw-q');
    const card = btn.closest('.ct-card');
    const item = items[Number(card.dataset.idx)] || {};
    const q = list(item.questions)[Number(qEl.dataset.q)];
    const expl = qEl.querySelector('.ssw-expl');
    const opts = qEl.querySelectorAll('.ssw-opt');
    const ok = grade(q, btn.dataset.a);
    opts.forEach(o => { o.disabled = true; });
    if (ok !== null) {
      btn.classList.add(ok ? 'correct' : 'wrong');
      if (!ok) {
        const right = String(q.correct);
        opts.forEach(o => { if (o.dataset.a === right) o.classList.add('correct'); });
      }
      expl.classList.add(ok ? 'correct' : 'wrong');
      expl.innerHTML = '<strong>' + (ok ? 'Benar.' : 'Belum tepat.') + '</strong> ' + esc(q.explanation || '');
    }
    expl.hidden = false;
  }

  // Merender item satu jenis ke `root`; `empty` ditampilkan bila tidak ada.
  async function mount(kind, slug, root, empty) {
    const render = RENDER[kind];
    if (!render || !root) return 0;
    let items = [];
    try { items = list((await window.SSWAPI.getItems(slug, kind)).items); } catch (e) { items = []; }
    root.innerHTML = items.map(render).join('');
    if (empty) empty.hidden = items.length > 0;
    root.querySelectorAll('.ct-done').forEach(b => setDone(b, window.SSWAPI.isCompleted(kind, b.dataset.id)));

    root.addEventListener('click', ev => {
      const btn = ev.target.closest('button');
      if (!btn || !root.contains(btn)) return;
      if (btn.classList.contains('ct-audio')) {
        speak(btn.dataset.say);
      } else if (btn.classList.contains('ct-done')) {
        const on = btn.getAttribute('aria-pressed') !== 'true';
        window.SSWAPI.markProgress(kind, btn.dataset.id, { completed: on });
        setDone(btn, on);
      } else if (btn.classList.contains('ct-furi')) {
        const on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.closest('.ct-card').querySelectorAll('.ct-reading').forEach(p => { p.hidden = !p.hidden; });
      } else if (btn.classList.contains('ct-reveal')) {
        btn.closest('.ssw-q').querySelector('.ssw-expl').hidden = false;
      } else if (btn.classList.contains('ssw-opt') && !btn.disabled) {
        answer(btn, items);
      }
    });
    return items.length;
  }

  window.SSWContent = { mount, grade, esc, renderKanji, renderGrammar, renderListening, renderReading };
})();
