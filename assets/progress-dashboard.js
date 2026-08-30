/**
 * Progress Dashboard — Nihongo Pro Academy
 * Heatmap calendar, XP tracking, streak counter, mastery levels
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'np-progress';
  const XP_PER_QUIZ = 10;
  const XP_PER_LESSON = 5;

  /* ── Data ── */
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        xp: 0,
        streak: 0,
        lastActive: null,
        dailyXP: {},
        moduleProgress: {},
        quizScores: {},
        achievements: []
      };
    } catch (e) {
      return { xp: 0, streak: 0, lastActive: null, dailyXP: {}, moduleProgress: {}, quizScores: {}, achievements: [] };
    }
  }

  function saveData(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  /* ── XP System ── */
  function addXP(amount, source) {
    const data = loadData();
    data.xp += amount;
    const today = new Date().toISOString().split('T')[0];
    data.dailyXP[today] = (data.dailyXP[today] || 0) + amount;
    data.lastActive = today;

    // Update streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (data.lastActive === yesterday || data.streak === 0) {
      data.streak++;
    } else if (data.lastActive !== today) {
      data.streak = 1;
    }

    // Check achievements
    checkAchievements(data);
    saveData(data);
    return data;
  }

  function addQuizScore(moduleId, score, total) {
    const data = loadData();
    data.quizScores[moduleId] = { score, total, date: new Date().toISOString() };
    addXP(score * XP_PER_QUIZ, 'quiz');
    saveData(data);
  }

  function addLessonProgress(moduleId, progress) {
    const data = loadData();
    data.moduleProgress[moduleId] = { progress, lastAccess: new Date().toISOString() };
    if (progress >= 100) addXP(XP_PER_LESSON * 10, 'lesson-complete');
    saveData(data);
  }

  /* ── Achievements ── */
  function checkAchievements(data) {
    const checks = [
      { id: 'first-quiz', name: 'Kuis Pertama', icon: '🎯', condition: () => Object.keys(data.quizScores).length >= 1 },
      { id: 'streak-3', name: 'Streak 3 Hari', icon: '🔥', condition: () => data.streak >= 3 },
      { id: 'streak-7', name: 'Streak Seminggu', icon: '💪', condition: () => data.streak >= 7 },
      { id: 'xp-100', name: '100 XP', icon: '⭐', condition: () => data.xp >= 100 },
      { id: 'xp-500', name: '500 XP', icon: '🌟', condition: () => data.xp >= 500 },
      { id: 'xp-1000', name: '1000 XP', icon: '🏆', condition: () => data.xp >= 1000 },
      { id: 'modules-5', name: '5 Modul Selesai', icon: '📚', condition: () => Object.values(data.moduleProgress).filter(m => m.progress >= 100).length >= 5 },
      { id: 'perfect-quiz', name: 'Skor Sempurna', icon: '💯', condition: () => Object.values(data.quizScores).some(s => s.score === s.total) },
    ];

    for (const ach of checks) {
      if (!data.achievements.includes(ach.id) && ach.condition()) {
        data.achievements.push(ach.id);
        showAchievementToast(ach);
      }
    }
  }

  function showAchievementToast(ach) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#1c1e22;color:#C89B3C;padding:16px 24px;border-radius:12px;border:1px solid #C89B3C;z-index:10000;font-family:Outfit,sans-serif;animation:srs-flip .4s ease;box-shadow:0 8px 32px rgba(0,0,0,.3)';
    toast.innerHTML = `<div style="font-size:24px;margin-bottom:4px">${ach.icon}</div><div style="font-weight:700;font-size:14px">${ach.name}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  /* ── Heatmap ── */
  function renderHeatmap(container, weeks = 16) {
    const data = loadData();
    const today = new Date();
    const cells = [];

    for (let w = weeks - 1; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (w * 7 + (6 - d)));
        const key = date.toISOString().split('T')[0];
        const xp = data.dailyXP[key] || 0;
        let level = 0;
        if (xp > 0) level = 1;
        if (xp >= 20) level = 2;
        if (xp >= 50) level = 3;
        cells.push({ date: key, xp, level });
      }
    }

    const levelColors = ['#2D2D3E', '#1B5E20', '#388E3C', '#66BB6A', '#A5D6A7'];

    container.innerHTML = `
      <div class="heatmap-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;max-width:340px">
        ${cells.map(c => `<div title="${c.date}: ${c.xp} XP" style="width:14px;height:14px;border-radius:3px;background:${levelColors[c.level]};cursor:pointer"></div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:var(--ink-mid,#6B7280)">
        <span>Minim</span>
        ${levelColors.map(c => `<div style="width:12px;height:12px;border-radius:2px;background:${c}"></div>`).join('')}
        <span>Banyak</span>
      </div>
    `;
  }

  /* ── Dashboard UI ── */
  function renderDashboard(container) {
    const data = loadData();
    const stats = {
      totalXP: data.xp,
      streak: data.streak,
      modulesDone: Object.values(data.moduleProgress).filter(m => m.progress >= 100).length,
      quizzesTaken: Object.keys(data.quizScores).length,
      avgScore: Object.values(data.quizScores).length > 0
        ? Math.round(Object.values(data.quizScores).reduce((a, s) => a + (s.score / s.total * 100), 0) / Object.values(data.quizScores).length)
        : 0
    };

    const level = Math.floor(stats.totalXP / 100) + 1;
    const xpInLevel = stats.totalXP % 100;

    container.innerHTML = `
      <div class="progress-dashboard">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#C89B3C,#A87C28);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#1A1209">${level}</div>
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--ink,#2C3E50)">Level ${level}</div>
            <div style="font-size:13px;color:var(--ink-mid,#6B7280)">${xpInLevel}/100 XP ke Level ${level + 1}</div>
            <div style="width:200px;height:6px;background:var(--border-light,#E8E4DF);border-radius:3px;margin-top:4px"><div style="width:${xpInLevel}%;height:100%;background:linear-gradient(90deg,#C89B3C,#A87C28);border-radius:3px"></div></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
          <div style="text-align:center;padding:16px;background:var(--white,#FEFCF8);border:1px solid var(--border-light);border-radius:12px">
            <div style="font-size:24px;font-weight:800;color:#C89B3C">${stats.totalXP}</div>
            <div style="font-size:11px;color:var(--ink-mid);text-transform:uppercase">Total XP</div>
          </div>
          <div style="text-align:center;padding:16px;background:var(--white,#FEFCF8);border:1px solid var(--border-light);border-radius:12px">
            <div style="font-size:24px;font-weight:800;color:#EF4444">🔥 ${stats.streak}</div>
            <div style="font-size:11px;color:var(--ink-mid);text-transform:uppercase">Streak</div>
          </div>
          <div style="text-align:center;padding:16px;background:var(--white,#FEFCF8);border:1px solid var(--border-light);border-radius:12px">
            <div style="font-size:24px;font-weight:800;color:#059669">${stats.modulesDone}</div>
            <div style="font-size:11px;color:var(--ink-mid);text-transform:uppercase">Modul Selesai</div>
          </div>
          <div style="text-align:center;padding:16px;background:var(--white,#FEFCF8);border:1px solid var(--border-light);border-radius:12px">
            <div style="font-size:24px;font-weight:800;color:#2563EB">${stats.avgScore}%</div>
            <div style="font-size:11px;color:var(--ink-mid);text-transform:uppercase">Rata-rata Kuis</div>
          </div>
        </div>

        <div style="margin-bottom:24px">
          <h3 style="font-size:14px;font-weight:700;color:var(--ink,#2C3E50);margin-bottom:12px">📊 Heatmap Belajar</h3>
          <div id="progress-heatmap"></div>
        </div>

        ${data.achievements.length > 0 ? `
        <div>
          <h3 style="font-size:14px;font-weight:700;color:var(--ink,#2C3E50);margin-bottom:12px">🏆 Pencapaian</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${data.achievements.map(id => {
              const icons = { 'first-quiz':'🎯','streak-3':'🔥','streak-7':'💪','xp-100':'⭐','xp-500':'🌟','xp-1000':'🏆','modules-5':'📚','perfect-quiz':'💯' };
              return `<div style="padding:8px 12px;background:var(--gold-pale,#FBF4E3);border:1px solid rgba(200,155,60,.22);border-radius:8px;font-size:13px">${icons[id] || '🏅'} ${id.replace(/-/g,' ')}</div>`;
            }).join('')}
          </div>
        </div>` : ''}
      </div>
    `;

    const heatmapEl = container.querySelector('#progress-heatmap');
    if (heatmapEl) renderHeatmap(heatmapEl);
  }

  /* ── Public API ── */
  window.Progress = {
    addXP,
    addQuizScore,
    addLessonProgress,
    getData: loadData,
    renderDashboard,
    renderHeatmap
  };

})();
