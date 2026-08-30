/**
 * Fuzzy Search — Nihongo Pro Academy
 * Japanese text normalization + fuzzy matching
 */
(function() {
  'use strict';

  /* ── Japanese Normalization ── */
  function normalizeJP(text) {
    return text
      // Full-width to half-width
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      // Normalize katakana to hiragana
      .replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      // Normalize prolonged sound mark
      .replace(/ー/g, 'う')
      // Remove particles for matching
      .replace(/[はがをにへでとものでも]/g, '')
      // Trim and lowercase
      .trim().toLowerCase();
  }

  /* ── Levenshtein Distance ── */
  function levenshtein(a, b) {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i-1] === b[j-1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j-1][i] + 1,
          matrix[j][i-1] + 1,
          matrix[j-1][i-1] + cost
        );
      }
    }
    return matrix[b.length][a.length];
  }

  /* ── Search Score ── */
  function searchScore(query, item) {
    const q = normalizeJP(query);
    const title = normalizeJP(item.title || '');
    const content = normalizeJP(item.content || item.meaning || '');
    const tags = (item.tags || []).map(t => normalizeJP(t)).join(' ');

    // Exact match bonus
    if (title.includes(q)) return 100;
    if (content.includes(q)) return 80;
    if (tags.includes(q)) return 70;

    // Fuzzy match
    const titleDist = levenshtein(q, title.substring(0, q.length + 5));
    const titleScore = Math.max(0, 60 - titleDist * 10);

    return titleScore;
  }

  /* ── Search Index ── */
  let searchIndex = [];

  function buildIndex(pages) {
    searchIndex = pages.map(page => ({
      id: page.id,
      title: page.title,
      content: page.content || '',
      url: page.url,
      type: page.type || 'page',
      tags: page.tags || [],
      level: page.level || '',
      icon: page.icon || '📄'
    }));
  }

  function search(query, limit = 10) {
    if (!query || query.length < 1) return [];

    const results = searchIndex
      .map(item => ({ ...item, score: searchScore(query, item) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /* ── UI ── */
  function renderSearchBox(container, onSelect) {
    container.innerHTML = `
      <div class="fuzzy-search" style="position:relative;max-width:600px;margin:0 auto">
        <input type="search" class="fuzzy-input" placeholder="🔍 Cari kosakata, modul, atau topik..." style="width:100%;padding:14px 20px;border:2px solid var(--border-light,#E8E4DF);border-radius:14px;font-size:16px;background:var(--white,#FEFCF8);color:var(--ink,#2C3E50);outline:none;transition:border-color .2s;box-sizing:border-box">
        <div class="fuzzy-results" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--white,#FEFCF8);border:1px solid var(--border-light);border-radius:12px;margin-top:4px;max-height:400px;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:100"></div>
      </div>
    `;

    const input = container.querySelector('.fuzzy-input');
    const results = container.querySelector('.fuzzy-results');

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (q.length < 1) {
        results.style.display = 'none';
        return;
      }

      const matches = search(q);
      if (matches.length === 0) {
        results.innerHTML = '<div style="padding:16px;text-align:center;color:var(--ink-mid)">Tidak ditemukan</div>';
      } else {
        results.innerHTML = matches.map(m => `
          <a href="${m.url}" class="fuzzy-result-item" style="display:flex;align-items:center;gap:12px;padding:12px 16px;text-decoration:none;color:var(--ink);border-bottom:1px solid var(--border-light);transition:background .15s">
            <span style="font-size:20px">${m.icon}</span>
            <div style="flex:1">
              <div style="font-weight:600;font-size:14px">${m.title}</div>
              <div style="font-size:12px;color:var(--ink-mid)">${m.type}${m.level ? ' · ' + m.level : ''}</div>
            </div>
          </a>
        `).join('');
      }
      results.style.display = 'block';
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1) results.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) results.style.display = 'none';
    });

    // Hover effects
    const style = document.createElement('style');
    style.textContent = `.fuzzy-result-item:hover{background:var(--cream,#F8F3E9) !important}`;
    document.head.appendChild(style);
  }

  /* ── Dark Mode ── */
  function injectDarkStyles() {
    if (document.getElementById('fuzzy-dark')) return;
    const s = document.createElement('style');
    s.id = 'fuzzy-dark';
    s.textContent = `
      [data-theme="dark"] .fuzzy-input{background:#1c1e22 !important;color:#E8E8E8 !important;border-color:#444 !important}
      [data-theme="dark"] .fuzzy-results{background:#1c1e22 !important;border-color:#444 !important}
      [data-theme="dark"] .fuzzy-result-item{color:#D0CFC9 !important;border-color:#333 !important}
      [data-theme="dark"] .fuzzy-result-item:hover{background:#232430 !important}
    `;
    document.head.appendChild(s);
  }

  /* ── Public API ── */
  window.FuzzySearch = {
    buildIndex,
    search,
    renderSearchBox: (container, cb) => {
      injectDarkStyles();
      renderSearchBox(container, cb);
    },
    normalizeJP
  };

})();
