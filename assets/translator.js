/**
 * translator.js — NihongoPro Translator Pro v2
 *
 * v2 improvements over v1:
 *   - Indonesia→Japan mode now genuinely calls AI (was broken reverse-search)
 *   - TTS (text-to-speech) for Japanese & Indonesian via Web Speech API
 *   - JLPT level filtering in token breakdown
 *   - Click-to-translate: select text on any page for instant lookup
 *   - Favorites: save words to localStorage
 *   - Draggable panel (grab header to move)
 *   - Keyboard shortcuts: Ctrl+Shift+T (toggle), Escape (close), Ctrl+Enter (translate)
 *   - Fullscreen mode on mobile (< 600px)
 *   - Improved token cards: ruby reading, level badges, click-to-hear
 */
(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════════════
     CONSTANTS & DATA
     ════════════════════════════════════════════════════════════════════ */

  const KANA = {
    あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',
    さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',
    な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',
    ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',
    ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',を:'wo',ん:'n',
    が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',
    だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',
    ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',
    // Katakana
    ア:'a',イ:'i',ウ:'u',エ:'e',オ:'o',カ:'ka',キ:'ki',ク:'ku',ケ:'ke',コ:'ko',
    サ:'sa',シ:'shi',ス:'su',セ:'se',ソ:'so',タ:'ta',チ:'chi',ツ:'tsu',テ:'te',ト:'to',
    ナ:'na',ニ:'ni',ヌ:'nu',ネ:'ne',ノ:'no',ハ:'ha',ヒ:'hi',フ:'fu',ヘ:'he',ホ:'ho',
    マ:'ma',ミ:'mi',ム:'mu',メ:'me',モ:'mo',ヤ:'ya',ユ:'yu',ヨ:'yo',
    ラ:'ra',リ:'ri',ル:'ru',レ:'re',ロ:'ro',ワ:'wa',ヲ:'wo',ン:'n',
    ガ:'ga',ギ:'gi',グ:'gu',ゲ:'ge',ゴ:'go',ザ:'za',ジ:'ji',ズ:'zu',ゼ:'ze',ゾ:'zo',
    ダ:'da',ヂ:'ji',ヅ:'zu',デ:'de',ド:'do',バ:'ba',ビ:'bi',ブ:'bu',ベ:'be',ボ:'bo',
    パ:'pa',ピ:'pi',プ:'pu',ペ:'pe',ポ:'po'
  };

  const PARTICLES = {
    は:'topik/subject marker',が:'penanda subjek atau fokus',を:'penanda objek langsung',
    に:'waktu, tujuan, lokasi',へ:'arah/tujuan',で:'tempat aksi atau alat',
    と:'dengan/dan/kutipan',も:'juga',の:'kepunyaan/penjelas',
    から:'dari/karena',まで:'sampai',より:'daripada/dari',
    ね:'ya kan/konfirmasi',よ:'penegasan',か:'pertanyaan'
  };

  const COMMON = [
    ['私','わたし','saya'],['あなた','あなた','kamu'],['彼','かれ','dia laki-laki'],
    ['彼女','かのじょ','dia perempuan'],['日本','にほん','Jepang'],['日本語','にほんご','bahasa Jepang'],
    ['勉強','べんきょう','belajar'],['学校','がっこう','sekolah'],['先生','せんせい','guru'],
    ['学生','がくせい','pelajar'],['今日','きょう','hari ini'],['明日','あした','besok'],
    ['昨日','きのう','kemarin'],['食べる','たべる','makan'],['飲む','のむ','minum'],
    ['行く','いく','pergi'],['来る','くる','datang'],['見る','みる','melihat'],
    ['読む','よむ','membaca'],['書く','かく','menulis'],['話す','はなす','berbicara'],
    ['聞く','きく','mendengar/bertanya'],['大きい','おおきい','besar'],['小さい','ちいさい','kecil'],
    ['新しい','あたらしい','baru'],['古い','ふるい','lama'],['良い','いい','baik'],
    ['悪い','わるい','buruk']
  ];

  const JLPT_LEVELS = ['Core','N5','N4','N3','N2','N1','Particle','Kana','Unknown','Punctuation'];

  /* ════════════════════════════════════════════════════════════════════
     STATE
     ════════════════════════════════════════════════════════════════════ */

  function safeJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (_) { localStorage.removeItem(key); return fallback; }
  }

  let vocabPromise;
  let entries = [];
  let byExpression = new Map();
  let history = safeJson('nihongoTranslatorHistory', []);
  let favorites = safeJson('nihongoTranslatorFavorites', []);
  let activeLevelFilter = 'All';

  const rootPrefix = (() => {
    const p = location.pathname;
    if (p.includes('/Materi/') || p.includes('/Dashboard/') || p.includes('/QUIZ/') ||
        p.includes('/AI-Tutor-Page/') || p.includes('/Landing-Page/')) return '../';
    return '';
  })();

  /* ════════════════════════════════════════════════════════════════════
     UTILITIES
     ════════════════════════════════════════════════════════════════════ */

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    })[c]);
  }

  function parseCsv(text) {
    const rows = []; let row = [], cell = '', quote = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i + 1];
      if (ch === '"' && quote && next === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { quote = !quote; continue; }
      if (ch === ',' && !quote) { row.push(cell); cell = ''; continue; }
      if ((ch === '\n' || ch === '\r') && !quote) {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell);
        if (row.some(Boolean)) rows.push(row);
        row = []; cell = ''; continue;
      }
      cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function levelFromTags(tags) {
    const t = String(tags);
    for (const n of [5, 4, 3, 2, 1])
      if (t.includes(`JLPT_N${n}`) || t.includes(`JLPT_${n}`) || new RegExp(`\\bN${n}\\b`).test(t))
        return `N${n}`;
    return 'N1';
  }

  function hasJapanese(text) { return /[\u3040-\u30ff\u3400-\u9fff]/.test(text); }

  function romanize(kana) {
    const small = {ゃ:'ya',ゅ:'yu',ょ:'yo',ャ:'ya',ュ:'yu',ョ:'yo'};
    let out = '';
    for (let i = 0; i < String(kana).length; i++) {
      const ch = kana[i], next = kana[i + 1];
      if ((ch === 'っ' || ch === 'ッ') && next) {
        const n = KANA[next] || '';
        out += n ? n[0] : '';
        continue;
      }
      if (small[next] && KANA[ch]) {
        out += KANA[ch].replace(/i$/, '') + small[next];
        i++; continue;
      }
      if (ch === 'ー') continue;
      out += KANA[ch] || ch;
      if (KANA[ch] && i < String(kana).length - 1) out += ' ';
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  /* ════════════════════════════════════════════════════════════════════
     VOCAB LOADING
     ════════════════════════════════════════════════════════════════════ */

  async function loadVocab() {
    if (vocabPromise) return vocabPromise;
    vocabPromise = fetch(`${rootPrefix}assets/vocab-all.csv?v=6`).then(r => r.text()).then(text => {
      const parsed = parseCsv(text).slice(1).map((r, i) => ({
        expression: r[0], reading: r[1], romaji: r[2],
        meaning: (r[4] || '').trim() || r[3],
        level: levelFromTags(r[5] || ''), id: i
      })).filter(x => x.expression && x.meaning);
      entries = [
        ...COMMON.map((x, i) => ({ expression: x[0], reading: x[1], meaning: x[2], level: 'Core', id: `core-${i}` })),
        ...parsed
      ];
      byExpression = new Map();
      entries.forEach(item => { if (!byExpression.has(item.expression)) byExpression.set(item.expression, item); });
      return entries;
    }).catch(() => {
      entries = COMMON.map((x, i) => ({ expression: x[0], reading: x[1], meaning: x[2], level: 'Core', id: `core-${i}` }));
      byExpression = new Map(entries.map(item => [item.expression, item]));
      return entries;
    });
    return vocabPromise;
  }

  /* ════════════════════════════════════════════════════════════════════
     TOKENIZER
     ════════════════════════════════════════════════════════════════════ */

  function tokenizeJapanese(text) {
    const clean = String(text).replace(/\s+/g, '');
    const tokens = [];
    let i = 0;
    while (i < clean.length) {
      let found = null;
      const max = Math.min(12, clean.length - i);
      for (let len = max; len > 0; len--) {
        const part = clean.slice(i, i + len);
        if (byExpression.has(part)) { found = byExpression.get(part); break; }
      }
      if (found) { tokens.push(found); i += found.expression.length; continue; }
      const two = clean.slice(i, i + 2);
      if (PARTICLES[two]) {
        tokens.push({ expression: two, reading: two, meaning: PARTICLES[two], level: 'Particle' });
        i += 2; continue;
      }
      const one = clean[i];
      if (PARTICLES[one]) tokens.push({ expression: one, reading: one, meaning: PARTICLES[one], level: 'Particle' });
      else if (/[。、！？,.!?]/.test(one)) tokens.push({ expression: one, reading: '', meaning: 'tanda baca', level: 'Punctuation' });
      else tokens.push({ expression: one, reading: one, meaning: KANA[one] ? romanize(one) : 'belum ada di kamus lokal', level: KANA[one] ? 'Kana' : 'Unknown' });
      i++;
    }
    return tokens;
  }

  function translateJapanese(text) {
    const exact = byExpression.get(text.trim());
    if (exact) return { output: `${exact.meaning}\nReading: ${exact.reading}\nLevel: ${exact.level}`, tokens: [exact], source: 'Exact dictionary match' };
    const tokens = tokenizeJapanese(text);
    const meaningful = tokens.filter(t => t.level !== 'Punctuation');
    const output = meaningful.map(t => t.meaning).join(' / ');
    const reading = meaningful.map(t => t.reading).filter(Boolean).join(' ');
    return {
      output: `${output || 'Belum ditemukan.'}${reading ? `\nReading: ${reading}` : ''}${reading ? `\nRomaji: ${romanize(reading)}` : ''}`,
      tokens, source: 'Local vocabulary + particle parser'
    };
  }

  function translateSearch(text) {
    const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
    const results = entries.filter(item => {
      const hay = `${item.expression} ${item.reading} ${item.meaning}`.toLowerCase();
      return terms.every(term => hay.includes(term));
    }).slice(0, 24);
    const output = results.length
      ? results.slice(0, 8).map(item => `${item.expression}（${item.reading}）= ${item.meaning} [${item.level}]`).join('\n')
      : 'Belum ditemukan di kamus lokal. Coba kata kunci lain, atau aktifkan mode AI.';
    return { output, tokens: results, source: 'Reverse dictionary search' };
  }

  /* ════════════════════════════════════════════════════════════════════
     AI INTEGRATION
     ════════════════════════════════════════════════════════════════════ */

  let nihongoAiLoadPromise;
  function ensureNihongoAi() {
    if (window.NihongoAI) return Promise.resolve(window.NihongoAI);
    if (nihongoAiLoadPromise) return nihongoAiLoadPromise;
    nihongoAiLoadPromise = new Promise(resolve => {
      const existing = document.querySelector('script[src$="nihongo-ai.js"]');
      if (existing) { existing.addEventListener('load', () => resolve(window.NihongoAI || null)); return; }
      const s = document.createElement('script');
      s.src = `${rootPrefix}assets/nihongo-ai.js`;
      s.onload = () => resolve(window.NihongoAI || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
    return nihongoAiLoadPromise;
  }

  /**
   * v2 FIX: Both ja-id AND id-ja genuinely call the AI.
   * v1 was broken: id-ja only did reverse dictionary search.
   * Now both directions use NihongoAI.translate() with the correct prompt prefix.
   */
  async function callApi(text, direction) {
    const ai = await ensureNihongoAi();
    if (!ai) return null;
    try {
      const hint = direction === 'ja-id' ? 'Terjemahkan ke bahasa Indonesia: '
        : direction === 'id-ja' ? 'Terjemahkan ke bahasa Jepang: '
        : '';
      const data = await ai.translate(hint + text);
      if (!data || !data.text) return null;
      // Don't use AI fallback error messages as translation results
      const t = data.text;
      if (t.includes('Maaf') || t.includes('tidak tersedia') || t.includes('Tidak ada koneksi') || 
          t.includes('timeout') || t.includes('Error') || t.includes('kesalahan')) return null;
      return t;
    } catch (_) {
      return null;
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     TTS (TEXT-TO-SPEECH)
     ════════════════════════════════════════════════════════════════════ */

  function speak(text, lang) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'ja-JP';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    // Try to find a Japanese voice
    const voices = window.speechSynthesis.getVoices();
    const targetLang = lang || 'ja';
    const voice = voices.find(v => v.lang.startsWith(targetLang));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  // Pre-load voices
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }

  /* ════════════════════════════════════════════════════════════════════
     FAVORITES
     ════════════════════════════════════════════════════════════════════ */

  function isFavorite(expression) {
    return favorites.some(f => f.expression === expression);
  }

  function toggleFavorite(item) {
    const idx = favorites.findIndex(f => f.expression === item.expression);
    if (idx >= 0) {
      favorites.splice(idx, 1);
    } else {
      favorites.unshift({ expression: item.expression, reading: item.reading, meaning: item.meaning, level: item.level, added: Date.now() });
    }
    localStorage.setItem('nihongoTranslatorFavorites', JSON.stringify(favorites));
    renderFavorites();
    // Update star buttons
    document.querySelectorAll('.translator-star').forEach(btn => {
      btn.classList.toggle('active', isFavorite(btn.dataset.expr));
      btn.innerHTML = isFavorite(btn.dataset.expr) ? '★' : '☆';
    });
  }

  function renderFavorites() {
    const box = document.getElementById('translatorFavorites');
    if (!box) return;
    if (favorites.length === 0) {
      box.innerHTML = '<div class="translator-muted">Klik ★ pada kata untuk menyimpan ke favorit.</div>';
      return;
    }
    box.innerHTML = favorites.slice(0, 12).map(item => `
      <button type="button" class="translator-fav-item" data-text="${esc(item.expression)}">
        <b>${esc(item.expression)}</b>
        <span>${esc(item.reading || '')}</span>
        <span>${esc(item.meaning)}</span>
        <span class="translator-level-badge">${esc(item.level)}</span>
      </button>`).join('');
    box.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('translatorInput').value = btn.dataset.text;
        runTranslate();
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════
     DRAG FUNCTIONALITY
     ════════════════════════════════════════════════════════════════════ */

  function makeDraggable(panel, handle) {
    let isDragging = false, startX, startY, startLeft, startTop;

    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('touchstart', startDragTouch, { passive: false });

    function startDrag(e) {
      if (e.target.closest('button, select, input')) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left; startTop = rect.top;
      panel.style.position = 'fixed';
      panel.style.right = 'auto';
      panel.style.left = startLeft + 'px';
      panel.style.top = startTop + 'px';
      panel.style.bottom = 'auto';
      panel.style.transition = 'none';
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      e.preventDefault();
    }

    function startDragTouch(e) {
      if (e.target.closest('button, select, input')) return;
      const t = e.touches[0];
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      startX = t.clientX; startY = t.clientY;
      startLeft = rect.left; startTop = rect.top;
      panel.style.position = 'fixed';
      panel.style.right = 'auto';
      panel.style.left = startLeft + 'px';
      panel.style.top = startTop + 'px';
      panel.style.bottom = 'auto';
      panel.style.transition = 'none';
      document.addEventListener('touchmove', onDragTouch, { passive: false });
      document.addEventListener('touchend', stopDrag);
      e.preventDefault();
    }

    function onDrag(e) {
      if (!isDragging) return;
      panel.style.left = (startLeft + e.clientX - startX) + 'px';
      panel.style.top = (startTop + e.clientY - startY) + 'px';
    }

    function onDragTouch(e) {
      if (!isDragging) return;
      const t = e.touches[0];
      panel.style.left = (startLeft + t.clientX - startX) + 'px';
      panel.style.top = (startTop + t.clientY - startY) + 'px';
      e.preventDefault();
    }

    function stopDrag() {
      isDragging = false;
      panel.style.transition = '';
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', onDragTouch);
      document.removeEventListener('touchend', stopDrag);
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     CLICK-TO-TRANSLATE (text selection)
     ════════════════════════════════════════════════════════════════════ */

  let selectionTooltip = null;

  function initClickToTranslate() {
    document.addEventListener('mouseup', () => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (!text || text.length < 1 || text.length > 80) {
        if (selectionTooltip) selectionTooltip.style.display = 'none';
        return;
      }
      // Check if selection is inside the translator panel
      if (sel.anchorNode && sel.anchorNode.closest && sel.anchorNode.closest('.translator-panel')) return;

      showSelectionTooltip(text, sel);
    });
  }

  function showSelectionTooltip(text, selection) {
    if (!selectionTooltip) {
      selectionTooltip = document.createElement('div');
      selectionTooltip.className = 'translator-selection-tooltip';
      selectionTooltip.innerHTML = `
        <button class="translator-sel-btn" data-action="translate">訳 Translate</button>
        <button class="translator-sel-btn" data-action="speak">🔊 Dengar</button>
        <button class="translator-sel-btn" data-action="favorite">☆ Simpan</button>
      `;
      document.body.appendChild(selectionTooltip);

      selectionTooltip.querySelector('[data-action="translate"]').addEventListener('click', () => {
        document.getElementById('translatorInput').value = text;
        const panel = document.querySelector('.translator-panel');
        if (panel) { panel.classList.add('open'); runTranslate(); }
        selectionTooltip.style.display = 'none';
      });
      selectionTooltip.querySelector('[data-action="speak"]').addEventListener('click', () => {
        speak(text, hasJapanese(text) ? 'ja-JP' : 'id-ID');
        selectionTooltip.style.display = 'none';
      });
      selectionTooltip.querySelector('[data-action="favorite"]').addEventListener('click', () => {
        const exact = byExpression.get(text);
        if (exact) {
          toggleFavorite(exact);
          window.proToast?.(`"${text}" ditambahkan ke favorit.`);
        } else {
          toggleFavorite({ expression: text, reading: text, meaning: text, level: 'Unknown' });
          window.proToast?.(`"${text}" disimpan.`);
        }
        selectionTooltip.style.display = 'none';
      });
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    selectionTooltip.style.display = 'flex';
    selectionTooltip.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
    selectionTooltip.style.top = (rect.top - 44 + window.scrollY) + 'px';
  }

  // Hide tooltip on scroll/click elsewhere
  document.addEventListener('mousedown', (e) => {
    if (selectionTooltip && !selectionTooltip.contains(e.target)) {
      selectionTooltip.style.display = 'none';
    }
  });

  /* ════════════════════════════════════════════════════════════════════
     UI CONSTRUCTION
     ════════════════════════════════════════════════════════════════════ */

  function ensureUi() {
    if (document.querySelector('.translator-launch')) return;

    // Launch button
    const launcher = document.createElement('button');
    launcher.className = 'translator-launch';
    launcher.type = 'button';
    launcher.innerHTML = '<span>訳</span> Kamus';
    document.body.appendChild(launcher);

    // Panel
    const panel = document.createElement('section');
    panel.className = 'translator-panel';
    panel.innerHTML = `
      <div class="translator-head">
        <div class="translator-title"><strong>訳</strong><span>Translator Pro <em class="translator-badge">AI + Kamus Lokal</em></span></div>
        <div style="display:flex;gap:6px">
          <button class="translator-close translator-minimize-btn" type="button" aria-label="Minimize" id="translatorMinimize">—</button>
          <button class="translator-close translator-close-btn" type="button" aria-label="Tutup" id="translatorClose">&times;</button>
        </div>
      </div>
      <div class="translator-body">
        <div class="translator-toolbar">
          <select class="translator-select" id="translatorDirection">
            <option value="auto">🔍 Deteksi Otomatis</option>
            <option value="ja-id">🇯🇵 → 🇮🇩 Jepang ke Indonesia</option>
            <option value="id-ja">🇮🇩 → 🇯🇵 Indonesia ke Jepang</option>
          </select>
          <button class="translator-chip" type="button" id="translatorApiToggle">⚙️ Pengaturan</button>
          <button class="translator-chip" type="button" id="translatorClear">✕ Clear</button>
        </div>
        <div class="translator-api" id="translatorApiBox">
          <div class="translator-muted" style="margin-bottom:6px">AI Tanaka Sensei aktif otomatis untuk semua arah terjemahan. Di bawah hanya untuk endpoint kustom.</div>
          <input class="translator-api-input" id="translatorEndpoint" placeholder="Endpoint kustom (opsional)">
          <input class="translator-api-input" id="translatorModel" placeholder="Model name (opsional)">
        </div>
        <textarea class="translator-input" id="translatorInput" placeholder="Tulis teks Jepang, Indonesia, atau English.&#10;Contoh: 食べる / 日本語を勉強します / makan, belajar..." rows="4"></textarea>
        <div class="translator-actions">
          <button class="primary" type="button" id="translatorRun">🔍 Terjemahkan</button>
          <button type="button" id="translatorSpeakResult" title="Dengarkan hasil">🔊 Dengar</button>
          <button type="button" id="translatorCopy">📋 Copy</button>
          <button type="button" id="translatorSwap">⇄ Swap</button>
          <button type="button" id="translatorPasteCard" title="Ambil dari flashcard">📎 Kartu</button>
        </div>
        <div class="translator-grid">
          <div class="translator-box">
            <div class="translator-muted">Hasil</div>
            <div class="translator-output" id="translatorOutput">Masukkan teks lalu klik Terjemahkan.</div>
          </div>
          <div class="translator-box">
            <div class="translator-muted">Analisis</div>
            <div class="translator-output" id="translatorMeta">Kamus lokal siap dimuat.</div>
          </div>
        </div>
        <div class="translator-section">
          <h4>🔤 Breakdown Kata</h4>
          <div class="translator-level-tabs" id="translatorLevelTabs">
            <button class="translator-level-chip active" data-level="All">Semua</button>
            <button class="translator-level-chip" data-level="Core">Core</button>
            <button class="translator-level-chip" data-level="N5">N5</button>
            <button class="translator-level-chip" data-level="N4">N4</button>
            <button class="translator-level-chip" data-level="N3">N3</button>
            <button class="translator-level-chip" data-level="N2">N2</button>
            <button class="translator-level-chip" data-level="N1">N1</button>
            <button class="translator-level-chip" data-level="Particle">Partikel</button>
          </div>
          <div class="translator-token-list" id="translatorTokens"></div>
        </div>
        <div class="translator-section">
          <h4>📝 Contoh Cepat</h4>
          <div class="translator-tabs" id="translatorSamples">
            <button class="translator-chip" type="button">食べる</button>
            <button class="translator-chip" type="button">日本語を勉強します</button>
            <button class="translator-chip" type="button">selamat pagi</button>
            <button class="translator-chip" type="button">責任</button>
            <button class="translator-chip" type="button">お元気ですか</button>
            <button class="translator-chip" type="button">terima kasih</button>
          </div>
        </div>
        <div class="translator-section">
          <h4>⭐ Favorit</h4>
          <div class="translator-favorites" id="translatorFavorites"></div>
        </div>
        <div class="translator-section">
          <h4>🕐 Riwayat</h4>
          <div class="translator-history" id="translatorHistory"></div>
        </div>
      </div>`;
    document.body.appendChild(panel);

    // Drag
    makeDraggable(panel, panel.querySelector('.translator-head'));

    // Event listeners
    launcher.addEventListener('click', () => panel.classList.add('open'));
    // Close button — use dedicated ID for reliability
    panel.querySelector('#translatorClose').addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.remove('open');
      panel.classList.remove('minimized');
    });
    panel.querySelector('#translatorMinimize').addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('minimized');
    });
    panel.querySelector('#translatorApiToggle').addEventListener('click', () =>
      panel.querySelector('#translatorApiBox').classList.toggle('open'));
    panel.querySelector('#translatorClear').addEventListener('click', () => {
      panel.querySelector('#translatorInput').value = '';
      renderResult({ output: 'Masukkan teks lalu klik Terjemahkan.', tokens: [], source: 'Ready' });
    });
    panel.querySelector('#translatorRun').addEventListener('click', runTranslate);
    panel.querySelector('#translatorInput').addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runTranslate();
      if (e.key === 'Escape') panel.classList.remove('open');
    });
    panel.querySelector('#translatorCopy').addEventListener('click', async () => {
      const text = panel.querySelector('#translatorOutput').textContent;
      try {
        await navigator.clipboard.writeText(text);
        window.proToast?.('Hasil disalin ke clipboard.');
      } catch (_) {
        window.proToast?.('Gagal menyalin.');
      }
    });
    panel.querySelector('#translatorSpeakResult').addEventListener('click', () => {
      const text = panel.querySelector('#translatorOutput').textContent.split('\n')[0];
      if (text) speak(text, hasJapanese(text) ? 'ja-JP' : 'id-ID');
    });
    panel.querySelector('#translatorPasteCard').addEventListener('click', () => {
      const candidates = ['#frontWord','#backWord','#frontKanji','#backKanji','#prompt','.front-word','.back-word','.kanji','.char'];
      const found = candidates.map(sel => document.querySelector(sel)?.textContent?.trim()).find(Boolean);
      if (found) {
        panel.querySelector('#translatorInput').value = found;
        runTranslate();
      }
      panel.classList.add('open');
    });
    panel.querySelector('#translatorSwap').addEventListener('click', () => {
      const input = panel.querySelector('#translatorInput');
      const output = panel.querySelector('#translatorOutput').textContent.split('\n')[0] || '';
      if (output && output !== 'Masukkan teks lalu klik Terjemahkan.') {
        input.value = output;
        const dir = panel.querySelector('#translatorDirection');
        dir.value = dir.value === 'ja-id' ? 'id-ja' : dir.value === 'id-ja' ? 'ja-id' : 'auto';
        runTranslate();
      }
    });

    // API config
    panel.querySelector('#translatorEndpoint').value = safeJson('nihongoTranslatorApi', { endpoint: '', model: '' }).endpoint || '';
    panel.querySelector('#translatorModel').value = safeJson('nihongoTranslatorApi', { endpoint: '', model: '' }).model || '';
    ['translatorEndpoint', 'translatorModel'].forEach(id => {
      panel.querySelector(`#${id}`).addEventListener('input', () => {
        const cfg = {
          endpoint: panel.querySelector('#translatorEndpoint').value.trim(),
          model: panel.querySelector('#translatorModel').value.trim()
        };
        localStorage.setItem('nihongoTranslatorApi', JSON.stringify(cfg));
      });
    });

    // Level filter tabs
    panel.querySelector('#translatorLevelTabs').addEventListener('click', e => {
      const chip = e.target.closest('.translator-level-chip');
      if (!chip) return;
      panel.querySelectorAll('.translator-level-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeLevelFilter = chip.dataset.level;
      // Re-render tokens with filter
      const lastTokens = panel.dataset.lastTokens ? JSON.parse(panel.dataset.lastTokens) : [];
      renderTokens(lastTokens);
    });

    // Sample clicks
    panel.querySelector('#translatorSamples').addEventListener('click', e => {
      if (!e.target.matches('button')) return;
      panel.querySelector('#translatorInput').value = e.target.textContent.trim();
      runTranslate();
    });

    renderHistory();
    renderFavorites();
    initClickToTranslate();
  }

  /* ════════════════════════════════════════════════════════════════════
     RENDERING
     ════════════════════════════════════════════════════════════════════ */

  function renderTokens(tokens) {
    const box = document.getElementById('translatorTokens');
    if (!box) return;
    const filtered = activeLevelFilter === 'All' ? tokens : tokens.filter(t => t.level === activeLevelFilter);
    const meaningful = filtered.filter(t => t.level !== 'Punctuation').slice(0, 30);
    if (meaningful.length === 0) {
      box.innerHTML = '<div class="translator-muted">Tidak ada token untuk level ini.</div>';
      return;
    }
    box.innerHTML = meaningful.map(t => {
      const fav = isFavorite(t.expression);
      const levelColor = { Core:'#6B4F3A', N5:'#16A34A', N4:'#2563EB', N3:'#9333EA', N2:'#DC2626', N1:'#B91C1C', Particle:'#6B7280', Kana:'#9CA3AF', Unknown:'#D1D5DB' }[t.level] || '#6B7280';
      return `<div class="translator-token">
        <div class="translator-token-head">
          <b>${esc(t.expression)}</b>
          <button class="translator-star ${fav ? 'active' : ''}" data-expr="${esc(t.expression)}" title="Favorit">${fav ? '★' : '☆'}</button>
          <button class="translator-token-speak" data-text="${esc(t.expression)}" title="Dengarkan">🔊</button>
        </div>
        <span class="translator-token-reading">${esc(t.reading || '-')} ${t.romaji ? '<small>(' + esc(t.romaji) + ')</small>' : ''}</span>
        <span class="translator-token-meaning">${esc(t.meaning)}</span>
        <span class="translator-level-badge" style="background:${levelColor}22;color:${levelColor}">${esc(t.level)}</span>
      </div>`;
    }).join('');

    // Star click handlers
    box.querySelectorAll('.translator-star').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = byExpression.get(btn.dataset.expr) || { expression: btn.dataset.expr, reading: '', meaning: '', level: 'Unknown' };
        toggleFavorite(entry);
      });
    });

    // TTS click handlers
    box.querySelectorAll('.translator-token-speak').forEach(btn => {
      btn.addEventListener('click', () => speak(btn.dataset.text, 'ja-JP'));
    });
  }

  function renderResult(result) {
    document.getElementById('translatorOutput').textContent = result.output;
    document.getElementById('translatorMeta').textContent = `${result.source}\nItem: ${result.tokens?.length || 0}\nDictionary: ${entries.length.toLocaleString('id-ID')} entries`;
    // Store tokens for re-render on level filter change
    const panel = document.querySelector('.translator-panel');
    if (panel) panel.dataset.lastTokens = JSON.stringify(result.tokens || []);
    renderTokens(result.tokens || []);
  }

  function renderHistory() {
    const box = document.getElementById('translatorHistory');
    if (!box) return;
    box.innerHTML = history.slice(0, 8).map(item => `
      <button type="button" data-text="${esc(item.text)}">
        <b>${esc(item.text)}</b><br>${esc(item.output.slice(0, 120))}
      </button>`).join('') || '<div class="translator-muted">Belum ada riwayat.</div>';
    box.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      document.getElementById('translatorInput').value = btn.dataset.text || '';
      runTranslate();
    }));
  }

  /* ════════════════════════════════════════════════════════════════════
     MAIN TRANSLATE LOGIC
     ════════════════════════════════════════════════════════════════════ */

  async function runTranslate() {
    await loadVocab();
    const input = document.getElementById('translatorInput');
    const text = input.value.trim();
    if (!text) return;
    const direction = document.getElementById('translatorDirection').value;

    renderResult({ output: 'Menerjemahkan...', tokens: [], source: 'Loading' });

    // v2: Both directions try AI first for natural translations
    const api = await callApi(text, direction);
    let result;
    if (api) {
      // AI provides natural translation; local tokenizer still provides educational breakdown
      const localTokens = hasJapanese(text) ? tokenizeJapanese(text).filter(t => t.level !== 'Punctuation') : [];
      result = { output: api, tokens: localTokens, source: 'AI translation (Tanaka Sensei)' };
    } else if (direction === 'ja-id' || (direction === 'auto' && hasJapanese(text))) {
      result = translateJapanese(text);
    } else {
      result = translateSearch(text);
    }

    renderResult(result);

    history = [{ text, output: result.output, time: Date.now() }, ...history.filter(h => h.text !== text)].slice(0, 20);
    localStorage.setItem('nihongoTranslatorHistory', JSON.stringify(history));
    renderHistory();
  }

  /* ════════════════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════════════════ */

  window.openTranslatorPro = function (text) {
    ensureUi();
    document.querySelector('.translator-panel').classList.add('open');
    // Lazy load vocab
    loadVocab().then(() => {
      const meta = document.getElementById('translatorMeta');
      if (meta) meta.textContent = `Kamus lokal siap.\nDictionary: ${entries.length.toLocaleString('id-ID')} entries\nMode: AI Tanaka Sensei (fallback: kamus lokal 181.500+ kata)`;
    });
    if (text) {
      document.getElementById('translatorInput').value = text;
      runTranslate();
    }
  };

  // Quick lookup from any page — exposes a global function
  window.kamusLookup = function (word) {
    ensureUi();
    document.getElementById('translatorInput').value = word;
    document.querySelector('.translator-panel').classList.add('open');
    loadVocab().then(() => runTranslate());
  };

  /* ════════════════════════════════════════════════════════════════════
     KEYBOARD SHORTCUTS
     ════════════════════════════════════════════════════════════════════ */

  document.addEventListener('keydown', e => {
    // Ctrl+Shift+T or Cmd+Shift+T — toggle panel
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      ensureUi();
      document.querySelector('.translator-panel').classList.toggle('open');
    }
    // Escape — close panel
    if (e.key === 'Escape') {
      const panel = document.querySelector('.translator-panel');
      if (panel && panel.classList.contains('open')) {
        e.preventDefault();
        panel.classList.remove('open');
      }
    }
  });

  /* ════════════════════════════════════════════════════════════════════
     CLICK OUTSIDE TO CLOSE
     ════════════════════════════════════════════════════════════════════ */

  document.addEventListener('mousedown', (e) => {
    const panel = document.querySelector('.translator-panel');
    if (!panel || !panel.classList.contains('open')) return;
    // Don't close if clicking inside panel, on launcher, or on selection tooltip
    if (panel.contains(e.target)) return;
    if (e.target.closest('.translator-launch')) return;
    if (selectionTooltip && selectionTooltip.contains(e.target)) return;
    panel.classList.remove('open');
    panel.classList.remove('minimized');
  });

  /* ════════════════════════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', ensureUi);
})();
