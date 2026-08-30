/**
 * SRS Flashcard Engine — Nihongo Pro Academy
 * SM-2 variant spaced repetition algorithm
 * 
 * Card types: kanji, vocabulary, grammar
 * Difficulty: again(0), hard(1), good(2), easy(3)
 * Intervals: 1d → 3d → 7d → 14d → 30d → 90d
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'np-srs-data';
  const MAX_CARDS_PER_SESSION = 20;

  /* ── SM-2 Algorithm ── */
  function sm2(card, quality) {
    // quality: 0=again, 1=hard, 2=good, 3=easy
    let { interval, easeFactor, repetitions } = card;

    if (quality < 2) {
      // Failed — reset
      repetitions = 0;
      interval = 1;
    } else {
      // Passed
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 3;
      else interval = Math.round(interval * easeFactor);
      repetitions++;
    }

    // Update ease factor
    easeFactor = easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    if (easeFactor > 3.0) easeFactor = 3.0;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      interval,
      easeFactor: Math.round(easeFactor * 100) / 100,
      repetitions,
      nextReview: nextReview.toISOString(),
      lastReview: new Date().toISOString(),
      totalReviews: (card.totalReviews || 0) + 1,
      correctStreak: quality >= 2 ? (card.correctStreak || 0) + 1 : 0
    };
  }

  /* ── Data Management ── */
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function getCardData(cardId) {
    const data = loadData();
    return data[cardId] || {
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: new Date().toISOString(),
      lastReview: null,
      totalReviews: 0,
      correctStreak: 0
    };
  }

  function setCardData(cardId, cardData) {
    const data = loadData();
    data[cardId] = cardData;
    saveData(data);
  }

  /* ── Queue Management ── */
  function getReviewQueue(allCards) {
    const now = new Date();
    const data = loadData();

    return allCards
      .filter(card => {
        const cardData = data[card.id];
        if (!cardData) return true; // New card
        return new Date(cardData.nextReview) <= now;
      })
      .sort((a, b) => {
        const da = data[a.id];
        const db = data[b.id];
        if (!da) return -1; // New cards first
        if (!db) return 1;
        return new Date(da.nextReview) - new Date(db.nextReview);
      })
      .slice(0, MAX_CARDS_PER_SESSION);
  }

  /* ── Statistics ── */
  function getStats(allCards) {
    const data = loadData();
    const now = new Date();
    let newCards = 0, dueCards = 0, masteredCards = 0, learningCards = 0;

    for (const card of allCards) {
      const cd = data[card.id];
      if (!cd) {
        newCards++;
      } else if (cd.repetitions >= 5 && cd.interval >= 30) {
        masteredCards++;
      } else if (new Date(cd.nextReview) <= now) {
        dueCards++;
      } else {
        learningCards++;
      }
    }

    return {
      total: allCards.length,
      new: newCards,
      due: dueCards,
      learning: learningCards,
      mastered: masteredCards,
      accuracy: calculateAccuracy(data)
    };
  }

  function calculateAccuracy(data) {
    let total = 0, correct = 0;
    for (const key in data) {
      total += data[key].totalReviews || 0;
      correct += (data[key].correctStreak || 0);
    }
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }

  /* ── UI Rendering ── */
  function renderFlashcard(container, card, onAnswer) {
    const front = container.querySelector('.srs-front') || document.createElement('div');
    const back = container.querySelector('.srs-back') || document.createElement('div');
    front.className = 'srs-front';
    back.className = 'srs-back';

    front.innerHTML = `
      <div class="srs-card-type">${card.type === 'kanji' ? '漢字' : card.type === 'grammar' ? '文法' : '語彙'}</div>
      <div class="srs-card-main">${card.front}</div>
      <div class="srs-card-hint">${card.hint || 'Klik untuk membalik'}</div>
    `;

    back.innerHTML = `
      <div class="srs-card-reading">${card.reading || ''}</div>
      <div class="srs-card-meaning">${card.meaning || card.back}</div>
      ${card.example ? `<div class="srs-card-example">${card.example}</div>` : ''}
      <div class="srs-card-actions">
        <button class="srs-btn srs-again" onclick="window._srsAnswer(0)">❌ Lagi</button>
        <button class="srs-btn srs-hard" onclick="window._srsAnswer(1)">😓 Sulit</button>
        <button class="srs-btn srs-good" onclick="window._srsAnswer(2)">👍 Bagus</button>
        <button class="srs-btn srs-easy" onclick="window._srsAnswer(3)">⚡ Mudah</button>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(front);
    container.appendChild(back);

    // Flip on click
    front.addEventListener('click', () => {
      front.classList.add('flipped');
      back.classList.add('show');
    });

    window._srsAnswer = (quality) => {
      const updated = sm2(getCardData(card.id), quality);
      setCardData(card.id, updated);
      if (onAnswer) onAnswer(quality);
    };
  }

  /* ── CSS Injection ── */
  function injectStyles() {
    if (document.getElementById('srs-styles')) return;
    const style = document.createElement('style');
    style.id = 'srs-styles';
    style.textContent = `
      .srs-container{max-width:500px;margin:0 auto;padding:20px}
      .srs-front,.srs-back{background:var(--white,#FEFCF8);border:2px solid var(--border-light,#E8E4DF);border-radius:16px;padding:40px 30px;text-align:center;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .3s}
      .srs-back{display:none}
      .srs-front.flipped{transform:rotateY(90deg);opacity:0}
      .srs-back.show{display:flex;animation:srs-flip .4s ease}
      @keyframes srs-flip{from{transform:rotateY(-90deg);opacity:0}to{transform:rotateY(0);opacity:1}}
      .srs-card-type{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-mid,#6B7280);margin-bottom:16px}
      .srs-card-main{font-size:3rem;font-weight:700;color:var(--ink,#2C3E50);margin-bottom:12px}
      .srs-card-hint{font-size:13px;color:var(--ink-soft,#9CA3AF)}
      .srs-card-reading{font-size:1.2rem;color:var(--primary,#6B4F3A);margin-bottom:8px}
      .srs-card-meaning{font-size:1.1rem;color:var(--ink,#2C3E50);margin-bottom:16px;line-height:1.6}
      .srs-card-example{font-size:.9rem;color:var(--ink-mid,#6B7280);padding:12px;background:var(--cream,#F8F3E9);border-radius:8px;margin-bottom:16px;font-style:italic}
      .srs-card-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
      .srs-btn{padding:10px 18px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
      .srs-again{background:#FEE2E2;color:#DC2626}.srs-again:hover{background:#FECACA}
      .srs-hard{background:#FEF3C7;color:#D97706}.srs-hard:hover{background:#FDE68A}
      .srs-good{background:#D1FAE5;color:#059669}.srs-good:hover{background:#A7F3D0}
      .srs-easy{background:#DBEAFE;color:#2563EB}.srs-easy:hover{background:#BFDBFE}
      .srs-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
      .srs-stat{text-align:center;padding:12px;background:var(--white,#FEFCF8);border:1px solid var(--border-light,#E8E4DF);border-radius:10px}
      .srs-stat-val{font-size:1.5rem;font-weight:700;color:var(--primary,#6B4F3A)}
      .srs-stat-lbl{font-size:11px;color:var(--ink-mid,#6B7280);text-transform:uppercase;letter-spacing:.05em}
      [data-theme="dark"] .srs-front,[data-theme="dark"] .srs-back{background:#1c1e22;border-color:#333;color:#E8E8E8}
      [data-theme="dark"] .srs-card-main{color:#E8E8E8}
      [data-theme="dark"] .srs-card-example{background:#232430}
      [data-theme="dark"] .srs-stat{background:#1c1e22;border-color:#333}
    `;
    document.head.appendChild(style);
  }

  /* ── Public API ── */
  window.SRS = {
    getCardData,
    setCardData,
    getReviewQueue,
    getStats,
    renderFlashcard: (container, card, cb) => {
      injectStyles();
      renderFlashcard(container, card, cb);
    },
    injectStyles,
    sm2
  };

})();
