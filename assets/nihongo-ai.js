/**
 * nihongo-ai.js — NihonggoPro Universal AI Client SDK v3.1
 * Endpoint: /api/ai-chat (Vercel) atau /.netlify/functions/ai-chat (Netlify)
 * TIDAK ada API key di sini — semua di backend
 */
(function(global) {
  'use strict';

  var ENDPOINT = (global.EDUMA_ENV && global.EDUMA_ENV.AI_API_ENDPOINT) || '/api/ai-chat';

  /* ── MEMORY ── */
  var Memory = {
    get: function(key) {
      try { return JSON.parse(sessionStorage.getItem('np_ai_' + key) || 'null'); } catch(e) { return null; }
    },
    set: function(key, val) {
      try { sessionStorage.setItem('np_ai_' + key, JSON.stringify(val)); } catch(e) {}
    },
    getHistory: function(sid) { return this.get('h_' + sid) || []; },
    pushHistory: function(sid, role, content) {
      var h = this.getHistory(sid);
      h.push({ role: role, content: content });
      this.set('h_' + sid, h.slice(-30));
    },
    getLevel: function() { return localStorage.getItem('np_jlpt_level') || 'N5'; },
    setLevel: function(lv) { localStorage.setItem('np_jlpt_level', lv); },
  };

  /* ── UI HELPERS ── */
  var UI = {
    setLoading: function(btnEl, loadingEl, isLoading, text) {
      if (btnEl) { btnEl.disabled = isLoading; btnEl.style.opacity = isLoading ? '0.6' : ''; }
      if (loadingEl) { loadingEl.style.display = isLoading ? '' : 'none'; if (isLoading && text) loadingEl.textContent = text; }
    },
    showError: function(el, msg) {
      if (!el) return;
      el.innerHTML = '<div style="background:#FEE2E2;color:#991B1B;padding:.75rem 1rem;border-radius:.75rem;font-size:14px;margin:.5rem 0;border:1px solid #FECACA"><strong>⚠️ Terjadi kesalahan</strong><br>' + msg + '</div>';
    },
  };

  /* ── CORE CHAT ── */
  async function chat(opts) {
    opts = opts || {};
    var _retries = (typeof opts.retries === 'number') ? opts.retries : 1; // 1× retry untuk error jaringan sementara
    return _chatAttempt(opts, _retries);
  }

  async function _chatAttempt(opts, retriesLeft) {
    var messages    = opts.messages    || [];
    var mode        = opts.mode        || 'conversation';
    var level       = opts.level       || Memory.getLevel();
    var scenario    = opts.scenario    || '';
    var sessionId   = opts.sessionId   || 'default';
    var provider    = opts.provider    || 'anthropic';
    var temperature = opts.temperature || 0.5;
    var btnEl       = opts.btnEl       || null;
    var loadingEl   = opts.loadingEl   || null;
    var errorEl     = opts.errorEl     || null;
    var loadingText = opts.loadingText || 'AI sedang berpikir...';

    UI.setLoading(btnEl, loadingEl, true, loadingText);

    // Get userId from Supabase session (trusted) or fallback to localStorage
    var sbSession  = null;
    try {
      var raw = localStorage.getItem('np-auth-v1');
      if (raw) sbSession = JSON.parse(raw);
    } catch(_) {}
    var userId    = sbSession?.user?.id || (function(){
      // ID anonim stabil: buat sekali & simpan agar konsisten lintas sesi (untuk rate-limit)
      try {
        var u = localStorage.getItem('np-uid');
        if (!u) {
          u = 'anon-' + (crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
          localStorage.setItem('np-uid', u);
        }
        return u;
      } catch(_) { return 'anonymous'; }
    })();
    // isPremium: trust Supabase session user_metadata, NOT a standalone localStorage flag
    // The rate-limit enforcement is done server-side anyway; this is just a UX hint
    var isPremium = !!(sbSession?.user?.user_metadata?.is_premium || sbSession?.user?.app_metadata?.is_premium);

    try {
      // Get Supabase access token to send server-side for premium validation
      var accessToken = '';
      try {
        var authRaw = localStorage.getItem('np-auth-v1');
        if (authRaw) accessToken = JSON.parse(authRaw)?.access_token || '';
      } catch(_) {}

      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': 'Bearer ' + accessToken } : {})
        },
        body: JSON.stringify({
          messages: messages,
          mode: mode,
          level: level,
          scenario: scenario,
          userId: userId,
          isPremium: isPremium,
          provider: provider,
          temperature: temperature,
        }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
      });

      var data = await res.json();

      if (!res.ok && res.status !== 501 && res.status !== 503) {
        var errMsg = (data && data.error) || ('Error ' + res.status);
        UI.showError(errorEl, errMsg);
        throw new Error(errMsg);
      }

      var lastUser = null;
      for (var i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') { lastUser = messages[i].content; break; }
      }
      if (lastUser) Memory.pushHistory(sessionId, 'user', lastUser);
      if (data && data.text) Memory.pushHistory(sessionId, 'assistant', data.text);

      return data;

    } catch(err) {
      // Retry sekali untuk error jaringan/timeout sementara (bukan error 4xx)
      var isTransient = err.name === 'AbortError' || err.name === 'TimeoutError' ||
                        err.message === 'Failed to fetch' || (err.message && err.message.includes('fetch'));
      if (isTransient && retriesLeft > 0) {
        await new Promise(function(r){ setTimeout(r, 1200); }); // backoff singkat
        return _chatAttempt(opts, retriesLeft - 1);
      }
      var msg;
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        msg = 'Koneksi timeout. Cek internet dan coba lagi.';
      } else if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
        msg = 'Tidak ada koneksi internet.';
      } else {
        msg = err.message || 'Terjadi kesalahan tidak diketahui.';
      }
      UI.showError(errorEl, msg);
      return {
        error: msg,
        text: 'Maaf, AI sedang tidak tersedia. Coba lagi dalam beberapa saat. 🙏',
        provider: 'local',
        model: 'fallback',
        remaining: -1,
      };
    } finally {
      UI.setLoading(btnEl, loadingEl, false);
    }
  }

  /* ── SHORTCUTS ── */
  function checkGrammar(text, opts) {
    return chat(Object.assign({ messages: [{ role: 'user', content: text }], mode: 'grammar' }, opts || {}));
  }
  function translate(text, opts) {
    return chat(Object.assign({ messages: [{ role: 'user', content: text }], mode: 'translate' }, opts || {}));
  }
  function explainKanji(kanji, opts) {
    return chat(Object.assign({ messages: [{ role: 'user', content: '\u300c' + kanji + '\u300d\u3092\u8aac\u660e\u3057\u3066\u304f\u3060\u3055\u3044\u3002' }], mode: 'kanji' }, opts || {}));
  }
  function explainVocab(word, opts) {
    return chat(Object.assign({ messages: [{ role: 'user', content: '\u300c' + word + '\u300d\u306b\u3064\u3044\u3066\u6559\u3048\u3066\u304f\u3060\u3055\u3044\u3002' }], mode: 'vocabulary' }, opts || {}));
  }
  function makeSentence(input, opts) {
    return chat(Object.assign({ messages: [{ role: 'user', content: input }], mode: 'sentence' }, opts || {}));
  }

  /* ── EXPORT ── */
  global.NihongoAI = {
    chat: chat,
    checkGrammar: checkGrammar,
    translate: translate,
    explainKanji: explainKanji,
    explainVocab: explainVocab,
    makeSentence: makeSentence,
    Memory: Memory,
    UI: UI,
    ENDPOINT: ENDPOINT,
  };

})(window);
