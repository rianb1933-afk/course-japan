(function (global) {
  'use strict';

  var KEYS = {
    preferences: 'nihongopro.user.preferences',
    goals: 'nihongopro.dailyGoals',
    activities: 'nihongopro.activityLog',
    dashboard: 'nihongopro.dashboard.v86',
    migration: 'nihongopro.dashboard.v86.migration'
  };
  var LEVEL_XP = 500;
  var MAX_ACTIVITIES = 500;
  var CATEGORY_ORDER = ['vocabulary', 'grammar', 'kanji', 'reading', 'listening', 'speaking', 'srs'];
  var CATEGORY = {
    vocabulary: { label: 'Vocabulary', unit: 'kata', target: 10, icon: '語', url: '../SRS-Flashcard.html' },
    grammar: { label: 'Grammar', unit: 'latihan', target: 2, icon: '文', url: '../Grammar-Checker.html' },
    kanji: { label: 'Kanji', unit: 'kanji', target: 5, icon: '漢', url: '../Kanji-Trainer-Pro.html' },
    reading: { label: 'Reading', unit: 'materi', target: 1, icon: '読', url: '../Materi/Reading-N5.html' },
    listening: { label: 'Listening', unit: 'latihan', target: 1, icon: '聴', url: '../Materi/Listening-Speaking.html' },
    speaking: { label: 'Speaking', unit: 'sesi', target: 1, icon: '話', url: '../Speaking-AI.html' },
    srs: { label: 'SRS Review', unit: 'kartu', target: 10, icon: '復', url: '../SRS-Flashcard.html' }
  };
  var QUICK_ACTIONS = [
    ['先', 'AI Tutor', 'Belajar dengan Sensei', '../AI-Tutor-Pro.html'],
    ['会', 'AI Kaiwa', 'Latihan percakapan', '../AI-Kaiwa.html'],
    ['話', 'Speaking AI', 'Latihan pelafalan', '../Speaking-AI.html'],
    ['復', 'SRS Flashcard', 'Review terjadwal', '../SRS-Flashcard.html'],
    ['漢', 'Kanji Trainer', 'Tulis dan hafalkan', '../Kanji-Trainer-Pro.html'],
    ['文', 'Grammar Checker', 'Periksa kalimat', '../Grammar-Checker.html'],
    ['試', 'JLPT CBT', 'Simulasi ujian', '../JLPT-CBT.html'],
    ['介', 'Materi Kaigo', 'Bahasa Jepang kerja', '../Materi/Kaigo.html']
  ];

  function byId(id) { return document.getElementById(id); }
  function clamp(n, min, max) { n = Number(n); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; }
  function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function array(value) { return Array.isArray(value) ? value : []; }
  function readJSON(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // Offline-first: localStorage tetap sumber utama. Bila pengguna login,
      // tandai data untuk disinkronkan ke Supabase (di-debounce oleh Sync).
      // Semua di dalam try/catch — dashboard tak boleh rusak jika Supabase absen.
      try {
        var SB = global.SupabaseClient;
        if (SB && SB.Sync && SB.Auth && SB.Auth.isLoggedIn && SB.Auth.isLoggedIn()) {
          SB.Sync.markDirty();
        }
      } catch (syncErr) { /* Supabase tak tersedia → lanjut offline saja */ }
      return true;
    }
    catch (e) { return false; }
  }
  function localDateKey(date) {
    date = date || new Date();
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function dateFromKey(key) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0) : null;
  }
  function dayDiff(a, b) {
    var da = dateFromKey(a); var db = dateFromKey(b);
    return da && db ? Math.round((da.getTime() - db.getTime()) / 86400000) : 0;
  }
  function safeText(value, fallback) {
    if (typeof value === 'string' || typeof value === 'number') {
      var text = String(value).trim();
      if (text && text !== 'undefined' && text !== 'null' && text !== '[object Object]') return text;
    }
    return fallback || '';
  }
  function formatNumber(value) { return Math.max(0, Number(value) || 0).toLocaleString('id-ID'); }
  function formatRelative(value) {
    var time = new Date(value).getTime();
    if (!Number.isFinite(time)) return 'Waktu tidak tersedia';
    var diff = Math.max(0, Date.now() - time);
    if (diff < 60000) return 'Baru saja';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' menit lalu';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' jam lalu';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' hari lalu';
    return new Date(time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
  function safeInternalUrl(value, fallback) {
    fallback = fallback || '../Materi/Materi.html';
    if (!value) return fallback;
    try {
      var url = new URL(String(value), location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return fallback;
      return url.pathname + url.search + url.hash;
    } catch (e) { return fallback; }
  }
  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = safeText(text);
    return node;
  }
  function emptyState(title, copy, url, label) {
    var wrap = element('div', 'empty-state');
    wrap.appendChild(element('strong', '', title));
    wrap.appendChild(element('span', '', copy));
    if (url) { var link = element('a', 'button button-soft', label || 'Buka'); link.href = url; wrap.appendChild(link); }
    return wrap;
  }
  function notify(message) {
    var live = byId('dashboardStatus'); var toast = byId('toast');
    if (live) live.textContent = message;
    if (toast) { toast.textContent = message; toast.classList.add('is-visible'); clearTimeout(notify.timer); notify.timer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2600); }
  }

  function normalizeLevel(value) {
    var match = /N?([1-5])/i.exec(String(value || ''));
    return match ? 'N' + match[1] : 'N5';
  }
  function inferCategory(value) {
    var id = String(value || '').toLowerCase();
    if (/srs|flashcard/.test(id)) return 'srs';
    if (/kosakata|vocab|goi/.test(id)) return 'vocabulary';
    if (/grammar|bunpou|tata-bahasa|partikel|konjugasi|verb|adjective|keigo|pola/.test(id)) return 'grammar';
    if (/kanji|radikal|onyomi|kunyomi/.test(id)) return 'kanji';
    if (/reading|dokkai|membaca/.test(id)) return 'reading';
    if (/listening|choukai|mendengar/.test(id)) return 'listening';
    if (/speaking|kaiwa|pronunciation|pelafalan/.test(id)) return 'speaking';
    if (/jlpt|quiz|cbt|mock/.test(id)) return 'jlpt';
    if (/kaigo/.test(id)) return 'kaigo';
    return 'materi';
  }
  function inferLevel(value) {
    var match = /(?:^|[^a-z0-9])n([1-5])(?:[^a-z0-9]|$)/i.exec(String(value || '').replace(/_/g, '-'));
    return match ? 'N' + match[1] : null;
  }
  function titleFromId(id) {
    return safeText(id, 'Materi').replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function activityDate(activity) { return localDateKey(new Date(activity.createdAt || activity.at || Date.now())); }

  function migrateLegacy() {
    if (localStorage.getItem(KEYS.migration)) return;
    // GENUINELY ditambahkan: bridge migrasi dari sistem Akun.html (skema
    // 'np-session'/'np-progress-{uid}'/'np-users'), yang dikonfirmasi audit
    // GENUINELY TERPUTUS TOTAL dari sistem ini -- pengguna yang mendaftar
    // via Akun.html sebelumnya tidak akan pernah melihat nama/progress
    // mereka di Dashboard.html, karena kedua sistem membaca key berbeda.
    // Bridge ini genuinely hanya membaca (read-only terhadap data lama),
    // tidak mengubah/menghapus data milik Akun.html/Sertifikat.html/
    // Misi.html/AI-Sensei.html yang masih genuinely bergantung padanya.
    try {
      var akunSession = readJSON('np-session', null);
      if (akunSession && akunSession.uid) {
        var akunUsers = readJSON('np-users', {});
        var akunUser = object(akunUsers[akunSession.uid]);
        var akunProgress = readJSON('np-progress-' + akunSession.uid, null);
        if (akunUser.name && !localStorage.getItem(KEYS.preferences)) {
          var akunNameText = safeText(akunUser.name);
          writeJSON(KEYS.preferences, {
            name: akunNameText,
            avatar: safeText(akunUser.avatar) || (akunNameText ? akunNameText.charAt(0).toUpperCase() : ''),
            jlptLevel: normalizeLevel(akunProgress && akunProgress.level),
          });
        }
      }
    } catch (e) { /* genuinely aman diabaikan -- bridge best-effort, tidak boleh menghalangi migrasi lain */ }
    // GENUINELY ditambahkan: bridge migrasi kedua dari sistem index.html
    // (skema 'nihongo_session', dikelola assets/index-page.js) -- audit
    // lanjutan mengonfirmasi ini GENUINELY sistem identitas KETIGA yang
    // terputus dari Dashboard.html, terpisah dari sistem Akun.html yang
    // sudah dijembatani di atas. Diverifikasi end-to-end: pengguna yang
    // mendaftar via index.html (mode local-demo, tanpa Supabase/Firebase
    // dikonfigurasi) menyimpan sesi ke 'nihongo_session', namun
    // Dashboard.html genuinely tidak pernah membacanya. Bridge ini
    // read-only, hanya berjalan jika preferences belum genuinely terisi
    // dari bridge Akun.html di atas maupun sumber lain.
    try {
      var indexSession = readJSON('nihongo_session', null);
      if (indexSession && indexSession.name && !localStorage.getItem(KEYS.preferences)) {
        var indexNameText = safeText(indexSession.name);
        writeJSON(KEYS.preferences, {
          name: indexNameText,
          avatar: indexNameText ? indexNameText.charAt(0).toUpperCase() : '',
          jlptLevel: normalizeLevel(null),
        });
      }
    } catch (e) { /* genuinely aman diabaikan -- bridge best-effort */ }
    var localState = object(readJSON('np-state-v3', {}));
    var legacyActivities = readJSON('np_daily_activity', []);
    var preferences = object(readJSON(KEYS.preferences, {}));
    var localUser = object(localState.user);
    if (!preferences.name && localUser.name) preferences.name = safeText(localUser.name);
    if (!preferences.avatar && localUser.avatar) preferences.avatar = safeText(localUser.avatar);
    if (!preferences.jlptLevel) preferences.jlptLevel = normalizeLevel(localUser.jlptLevel || localStorage.getItem('np_jlpt_level'));
    if (!localStorage.getItem(KEYS.preferences)) writeJSON(KEYS.preferences, preferences);
    if (!localStorage.getItem(KEYS.goals)) {
      var defaults = {};
      CATEGORY_ORDER.forEach(function (key) { defaults[key] = CATEGORY[key].target; });
      writeJSON(KEYS.goals, defaults);
    }
    if (!localStorage.getItem(KEYS.activities) && Array.isArray(legacyActivities)) {
      var migrated = legacyActivities.slice(-MAX_ACTIVITIES).map(function (item, index) {
        item = object(item);
        return {
          id: safeText(item.id, 'legacy-' + index + '-' + Date.now()),
          type: safeText(item.type, 'study_activity'), category: inferCategory(item.category || item.type),
          level: inferLevel(item.level || item.title), itemId: safeText(item.itemId), title: safeText(item.title, 'Aktivitas belajar'),
          value: Number(item.value) || 1, xp: Number(item.xp) || 0, durationSeconds: Number(item.durationSeconds || item.duration) || 0,
          accuracy: Number.isFinite(Number(item.accuracy)) ? clamp(item.accuracy, 0, 100) : null,
          createdAt: new Date(item.createdAt || item.at || Date.now()).toISOString(), url: safeText(item.url || item.href)
        };
      });
      writeJSON(KEYS.activities, migrated);
    }
    writeJSON(KEYS.migration, { version: 1, completedAt: new Date().toISOString() });
  }

  function getLegacyProfile() {
    var state = object(readJSON('np-state-v3', {})); var user = object(state.user);
    var accountSession = object(readJSON('nihongo_session', {}));
    var users = object(readJSON('nihongo_users', {})); var account = object(users[accountSession.uid]);
    var preferences = object(readJSON(KEYS.preferences, {}));
    return {
      name: safeText(user.name || account.name || preferences.name, 'Peserta'),
      avatar: safeText(user.avatar || account.avatar || preferences.avatar),
      avatarUrl: safeText(user.avatarUrl || user.avatar_url),
      target: normalizeLevel(user.jlptLevel || account.level || preferences.jlptLevel || localStorage.getItem('np_jlpt_level')),
      xp: Number(user.xp || 0), level: Number(user.level || 0)
    };
  }
  async function resolveProfile() {
    var local = getLegacyProfile(); var auth = global.SupabaseClient && global.SupabaseClient.Auth;
    var user = auth && typeof auth.user === 'function' ? auth.user() : null;
    var meta = object(user && user.user_metadata); var remote = null;
    if (user && global.SupabaseClient.DB && typeof global.SupabaseClient.DB.getProgress === 'function') {
      try { remote = await global.SupabaseClient.DB.getProgress(user.id); } catch (e) { remote = null; }
    }
    remote = object(remote);
    return {
      name: safeText(remote.name || meta.full_name || meta.name || local.name, 'Peserta'),
      avatar: safeText(meta.avatar || local.avatar), avatarUrl: safeText(meta.avatar_url || meta.picture || local.avatarUrl),
      target: normalizeLevel(remote.jlpt_level || meta.jlpt_level || local.target),
      xp: Math.max(Number(remote.xp || 0), Number(local.xp || 0)),
      level: Number(remote.level || local.level || 0), loggedIn: !!user
    };
  }

  function loadData() {
    var dash = object(readJSON('np-dash-v3', {}));
    var activities = array(readJSON(KEYS.activities, [])).filter(function (a) { return a && typeof a === 'object'; }).slice(-MAX_ACTIVITIES);
    var pages = object(readJSON('np-materi-progress-v1', {}));
    var kaigo = object(readJSON('np-kaigo-progress-v1', {}));
    var srs2 = object(readJSON('np-srs-v2', {})); var srs3 = object(readJSON('np-srs-v3', {}));
    var goals = object(readJSON(KEYS.goals, {})); var schedule = array(readJSON('nihongo-schedule', []));
    CATEGORY_ORDER.forEach(function (key) { goals[key] = clamp(goals[key] || CATEGORY[key].target, 1, 999); });
    return { dash: dash, activities: activities, pages: pages, kaigo: kaigo, srs2: srs2, srs3: srs3, goals: goals, schedule: schedule };
  }
  function getDueSRS(data) {
    var now = Date.now(); var status = {};
    Object.keys(data.srs2).forEach(function (id) { var card = object(data.srs2[id]); status[id] = !card.nextReview || Number(card.nextReview) <= now; });
    var cards3 = object(data.srs3.cards);
    Object.keys(cards3).forEach(function (id) {
      var card = object(cards3[id]); var dueAt = new Date(card.due || 0).getTime();
      var isDue = card.state === 'new' || !Number.isFinite(dueAt) || dueAt <= now;
      status[id] = status[id] === undefined ? isDue : status[id] || isDue;
    });
    var recordedIds = Object.keys(status); var due = recordedIds.filter(function (id) { return status[id]; }).length;
    var total = Number(global.NPDashboardCatalog && global.NPDashboardCatalog.srsBuiltInCards) || recordedIds.length;
    return due + Math.max(0, total - recordedIds.length);
  }
  function todayProgress(data) {
    var today = localDateKey(); var counts = {};
    CATEGORY_ORDER.forEach(function (key) { counts[key] = 0; });
    data.activities.forEach(function (a) {
      if (activityDate(a) !== today) return;
      if (a.type === 'xp_earned') return;
      var category = inferCategory(a.category || a.type || a.itemId);
      var value = Math.max(1, Number(a.value) || 1);
      if (counts[category] !== undefined) counts[category] += value;
    });
    var missions = object(data.dash.missions);
    counts.vocabulary = Math.max(counts.vocabulary, Number(missions.vocab) || 0);
    return counts;
  }
  function activityDates(data) {
    var dates = {};
    Object.keys(object(data.dash.history)).forEach(function (date) {
      var h = object(data.dash.history[date]); var amount = Number(h.xp || 0) + Number(h.quiz || 0) + Number(h.minutes || 0);
      if (amount > 0 && dateFromKey(date)) dates[date] = (dates[date] || 0) + amount;
    });
    data.activities.forEach(function (a) {
      var date = activityDate(a); dates[date] = (dates[date] || 0) + Math.max(1, Number(a.value) || 1, Math.round((Number(a.durationSeconds) || 0) / 60));
    });
    return dates;
  }
  function computeStreak(data) {
    var dates = activityDates(data); var keys = Object.keys(dates).filter(dateFromKey).sort(); var best = 0; var run = 0; var previous = null;
    keys.forEach(function (key) { run = previous && dayDiff(key, previous) === 1 ? run + 1 : 1; best = Math.max(best, run); previous = key; });
    var today = localDateKey(); var yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1); var yesterday = localDateKey(yesterdayDate);
    var cursor = dates[today] ? today : dates[yesterday] ? yesterday : null; var current = 0;
    while (cursor && dates[cursor]) { current++; var d = dateFromKey(cursor); d.setDate(d.getDate() - 1); cursor = localDateKey(d); }
    return { current: current, best: Math.max(best, Number(data.dash.maxStreak) || 0), todayDone: !!dates[today], dates: dates };
  }

  function setAvatar(container, profile) {
    if (!container) return; container.textContent = '';
    if (profile.avatarUrl && /^https?:\/\//i.test(profile.avatarUrl)) {
      var img = element('img'); img.src = profile.avatarUrl; img.alt = ''; img.referrerPolicy = 'no-referrer'; img.addEventListener('error', function () { container.textContent = initials(profile.name); }); container.appendChild(img);
    } else container.textContent = safeText(profile.avatar, initials(profile.name)).slice(0, 2);
  }
  function initials(name) { return safeText(name, 'P').split(/\s+/).map(function (word) { return word.charAt(0); }).join('').slice(0, 2).toUpperCase(); }
  function renderProfile(profile, data) {
    var dashXP = Number(data.dash.xp) || 0; var xp = Math.max(dashXP, profile.xp || 0); var level = Math.floor(xp / LEVEL_XP) + 1;
    if (profile.level > level) level = profile.level;
    var hour = new Date().getHours(); var greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
    byId('welcomeTitle').textContent = greeting + ', ' + profile.name + '.';
    var obGoalForSubtitle = safeText(localStorage.getItem('np_onboarding_goal'));
    var subtitleMap = {
      kaigo: 'Mari lanjutkan target Kaigo 介護福祉士 Anda dengan langkah yang paling berdampak.',
      conversation: 'Mari lanjutkan latihan percakapan Anda dengan langkah yang paling berdampak.',
      work: 'Mari lanjutkan target bahasa Jepang profesional Anda dengan langkah yang paling berdampak.',
    };
    byId('welcomeSubtitle').textContent = subtitleMap[obGoalForSubtitle] || ('Mari lanjutkan target JLPT ' + profile.target + ' Anda dengan langkah yang paling berdampak.');
    byId('localDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    ['sideName', 'topName'].forEach(function (id) { byId(id).textContent = profile.name; });
    byId('sideMeta').textContent = 'Level ' + level + ' · ' + profile.target; byId('targetLevel').textContent = profile.target;
    byId('heroXP').textContent = formatNumber(xp); byId('heroLevel').textContent = level;
    ['sideAvatar', 'topAvatar', 'heroAvatar'].forEach(function (id) { setAvatar(byId(id), profile); });
    return { xp: xp, level: level };
  }

  function renderGoals(data) {
    var counts = todayProgress(data); var list = byId('dailyGoalList'); list.textContent = ''; list.setAttribute('aria-busy', 'false'); var completed = 0;
    CATEGORY_ORDER.forEach(function (key) {
      var def = CATEGORY[key]; var value = Math.max(0, Math.round(counts[key] || 0)); var target = data.goals[key]; var pct = clamp(value / target * 100, 0, 100); if (pct >= 100) completed++;
      var row = element('div', 'goal-row' + (pct >= 100 ? ' is-done' : '')); var icon = element('span', 'goal-icon', pct >= 100 ? '✓' : def.icon); icon.setAttribute('aria-hidden', 'true'); row.appendChild(icon);
      var copy = element('div'); copy.appendChild(element('strong', '', def.label)); copy.appendChild(element('small', '', value + ' / ' + target + ' ' + def.unit));
      var track = element('div', 'mini-track'); var fill = element('span'); fill.style.width = pct + '%'; track.appendChild(fill); copy.appendChild(track); row.appendChild(copy);
      var link = element('a', '', '›'); link.href = def.url; link.setAttribute('aria-label', 'Buka latihan ' + def.label); row.appendChild(link); list.appendChild(row);
    });
    var pctAll = Math.round(completed / CATEGORY_ORDER.length * 100); byId('goalPercent').textContent = pctAll + '%'; byId('goalRing').style.setProperty('--p', pctAll); byId('goalRing').setAttribute('aria-label', 'Target harian ' + pctAll + ' persen');
    byId('goalSummary').textContent = completed + ' dari ' + CATEGORY_ORDER.length + ' target selesai';
    byId('goalEncouragement').textContent = completed === CATEGORY_ORDER.length ? 'Semua target tercapai. Kerja bagus!' : completed ? 'Pertahankan ritme belajar Anda.' : 'Mulai dari satu langkah kecil.';
  }
  function renderStreak(data, streak) {
    byId('currentStreak').textContent = streak.current; byId('bestStreak').textContent = streak.best;
    byId('todayStreakStatus').textContent = streak.todayDone ? 'Target hari ini aktif' : 'Belum aktif'; byId('todayStreakStatus').classList.toggle('is-done', streak.todayDone);
    byId('streakDeadline').textContent = streak.todayDone ? 'Streak hari ini aman. Kembali besok untuk melanjutkan.' : streak.current ? 'Lakukan satu aktivitas sebelum tengah malam agar streak tidak hilang.' : 'Selesaikan satu aktivitas hari ini untuk memulai streak.';
    var strip = byId('weekStrip'); strip.textContent = '';
    for (var i = 6; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); var key = localDateKey(d); var wrap = element('div', 'week-day' + (streak.dates[key] ? ' is-active' : '') + (i === 0 ? ' is-today' : '')); wrap.appendChild(element('small', '', d.toLocaleDateString('id-ID', { weekday: 'narrow' }))); var cell = element('span', '', d.getDate()); cell.title = d.toLocaleDateString('id-ID') + ': ' + (streak.dates[key] || 0) + ' aktivitas'; wrap.appendChild(cell); strip.appendChild(wrap); }
  }
  function renderXP(data, xpInfo) {
    var xp = xpInfo.xp; var inLevel = xp % LEVEL_XP; var today = localDateKey(); var todayXP = 0;
    data.activities.forEach(function (a) { if (activityDate(a) === today) todayXP += Number(a.xp) || 0; });
    todayXP = Math.max(todayXP, Number(object(object(data.dash.history)[today]).xp) || 0);
    byId('xpTotal').textContent = formatNumber(xp) + ' XP'; byId('xpToday').textContent = '+' + formatNumber(todayXP) + ' hari ini'; byId('levelChip').textContent = 'Lv. ' + xpInfo.level;
    byId('xpInLevel').textContent = inLevel + ' / ' + LEVEL_XP + ' XP'; byId('xpRemaining').textContent = (LEVEL_XP - inLevel) + ' XP lagi'; byId('xpProgressFill').style.width = (inLevel / LEVEL_XP * 100) + '%'; byId('xpProgress').setAttribute('aria-valuenow', inLevel);
    var list = byId('xpHistory'); list.textContent = ''; var withXP = data.activities.filter(function (a) { return Number(a.xp) > 0; }).slice(-3).reverse();
    if (!withXP.length) { var li = element('li'); li.appendChild(element('span', '', 'Belum ada riwayat XP')); li.appendChild(element('strong', '', '—')); list.appendChild(li); }
    withXP.forEach(function (a) { var li = element('li'); li.appendChild(element('span', '', safeText(a.title, titleFromId(a.type)))); li.appendChild(element('strong', '', '+' + formatNumber(a.xp) + ' XP')); list.appendChild(li); });
  }

  function materialUrl(id) { return id ? '../Materi/' + encodeURIComponent(id) + '.html' : '../Materi/Materi.html'; }
  function legacyLastPages() {
    var found = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i); if (!key || !/progress|tools|learning/i.test(key)) continue;
      var value = object(readJSON(key, {})); var page = object(value.lastPage);
      if (page.href && page.title) found.push({ title: page.title, url: safeInternalUrl(page.href), createdAt: page.at || value.updatedAt || Date.now(), category: inferCategory(page.title), value: 1 });
    }
    return found;
  }
  function renderContinue(data) {
    var list = byId('continueLearning'); list.textContent = '';
    var candidates = data.activities.filter(function (a) { return a.url || a.itemId; }).concat(legacyLastPages()).sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
    var seen = {}; candidates = candidates.filter(function (a) { var key = a.url || a.itemId; if (!key || seen[key]) return false; seen[key] = true; return true; }).slice(0, 3);
    if (!candidates.length) {
      // Pengguna baru (belum ada aktivitas tercatat) — kemungkinan baru saja
      // menyelesaikan Onboarding.html. Personalisasi CTA sesuai goal yang
      // dipilih di sana, alih-alih selalu mengarah ke Materi.html generik.
      var obGoal = safeText(localStorage.getItem('np_onboarding_goal'));
      var goalMap = {
        kaigo: { url: '../Materi/Kaigo.html', title: 'Mulai jalur Kaigo Anda', desc: 'Anda memilih tujuan Kaigo saat onboarding — mulai dari modul dasar 介護福祉士.', label: 'Buka materi Kaigo' },
        conversation: { url: '../AI-Kaiwa.html', title: 'Mulai latihan percakapan', desc: 'Anda memilih tujuan percakapan saat onboarding — latihan kaiwa dengan AI.', label: 'Buka AI Kaiwa' },
        work: { url: '../Materi/Materi.html', title: 'Mulai bahasa Jepang profesional', desc: 'Anda memilih tujuan kerja/profesional saat onboarding.', label: 'Pilih materi' },
      };
      var obDefault = { url: '../Materi/Materi.html', title: 'Belum ada aktivitas terakhir', desc: 'Buka materi pertama Anda; dashboard akan menyimpan posisi belajar berikutnya.', label: 'Pilih materi' };
      var picked = goalMap[obGoal] || obDefault;
      list.appendChild(emptyState(picked.title, picked.desc, picked.url, picked.label));
      byId('continuePrimary').href = picked.url;
      return;
    }
    byId('continuePrimary').href = candidates[0].url ? safeInternalUrl(candidates[0].url) : materialUrl(candidates[0].itemId);
    candidates.forEach(function (a) {
      var row = element('div', 'continue-item'); row.appendChild(element('span', 'item-icon', CATEGORY[inferCategory(a.category)] ? CATEGORY[inferCategory(a.category)].icon : '本'));
      var copy = element('div', 'item-copy'); copy.appendChild(element('strong', '', safeText(a.title, titleFromId(a.itemId)))); copy.appendChild(element('span', '', [safeText(a.category, 'Materi'), safeText(a.level), formatRelative(a.createdAt)].filter(Boolean).join(' · ')));
      if (Number(a.progress) > 0) { var p = element('div', 'item-progress'); var f = element('i'); f.style.width = clamp(a.progress, 0, 100) + '%'; p.appendChild(f); copy.appendChild(p); }
      row.appendChild(copy); var link = element('a', 'item-action', 'Lanjutkan'); link.href = a.url ? safeInternalUrl(a.url) : materialUrl(a.itemId); row.appendChild(link); list.appendChild(row);
    });
  }
  function lowAccuracyPages(data) {
    return Object.keys(data.pages).map(function (id) { var p = object(data.pages[id]); return { id: id, accuracy: Number(p.lastScore || p.bestScore), completed: !!p.completed, attempts: Number(p.attempts) || 0 }; }).filter(function (p) { return p.attempts > 0 && p.accuracy < 70; }).sort(function (a, b) { return a.accuracy - b.accuracy; });
  }
  function renderReview(data, due) {
    var wrap = byId('smartReview'); wrap.textContent = ''; var items = [];
    if (due > 0) items.push({ icon: '復', title: due + ' kartu SRS jatuh tempo', copy: 'Prioritas tertinggi · review terjadwal', url: '../SRS-Flashcard.html', priority: 'Overdue' });
    lowAccuracyPages(data).slice(0, 2).forEach(function (p) { items.push({ icon: CATEGORY[inferCategory(p.id)] ? CATEGORY[inferCategory(p.id)].icon : '文', title: titleFromId(p.id), copy: 'Akurasi terakhir ' + Math.round(p.accuracy) + '%', url: materialUrl(p.id), priority: 'Akurasi rendah' }); });
    var unfinished = Object.keys(data.pages).map(function (id) { return { id: id, p: object(data.pages[id]) }; }).filter(function (row) { return row.p.attempts && !row.p.completed && Number(row.p.bestScore) >= 50; }).sort(function (a, b) { return Number(b.p.bestScore) - Number(a.p.bestScore); })[0];
    if (unfinished) items.push({ icon: '本', title: titleFromId(unfinished.id), copy: 'Hampir selesai · nilai terbaik ' + Math.round(unfinished.p.bestScore) + '%', url: materialUrl(unfinished.id), priority: 'Lanjutkan' });
    if (!items.length) { wrap.appendChild(emptyState('Tidak ada review mendesak', 'Materi dengan akurasi rendah dan kartu jatuh tempo akan muncul di sini.', '../SRS-Flashcard.html', 'Buka SRS')); }
    items.slice(0, 4).forEach(function (item) { var row = element('div', 'review-item'); row.appendChild(element('span', 'item-icon', item.icon)); var copy = element('div', 'item-copy'); copy.appendChild(element('strong', '', item.title)); copy.appendChild(element('span', '', item.copy)); row.appendChild(copy); var link = element('a', 'review-priority', item.priority); link.href = item.url; row.appendChild(link); wrap.appendChild(row); });
    byId('startReview').href = items.length ? items[0].url : '../SRS-Flashcard.html';
    byId('navDueBadge').hidden = due <= 0; byId('navDueBadge').textContent = due; byId('heroDue').textContent = due;
  }

  function pageProgressByJLPT(data) {
    var result = {}; ['N5', 'N4', 'N3', 'N2', 'N1'].forEach(function (lv) { result[lv] = {}; Object.keys(CATEGORY).forEach(function (cat) { result[lv][cat] = 0; }); });
    Object.keys(data.pages).forEach(function (id) { var page = object(data.pages[id]); if (!page.completed) return; var level = inferLevel(id); var category = inferCategory(id); if (level && result[level] && result[level][category] !== undefined) result[level][category]++; });
    return result;
  }
  function renderJLPT(data, profile) {
    var tabs = byId('jlptTabs'); tabs.textContent = ''; var completed = pageProgressByJLPT(data); var catalog = object(global.NPDashboardCatalog && global.NPDashboardCatalog.levels); var active = profile.target;
    function select(level) {
      active = level; Array.from(tabs.children).forEach(function (button) { button.setAttribute('aria-selected', String(button.dataset.level === level)); });
      var totals = object(catalog[level]); var done = object(completed[level]); var totalAll = 0; var doneAll = 0;
      ['grammar', 'vocabulary', 'kanji', 'reading', 'listening', 'speaking'].forEach(function (cat) { totalAll += Number(totals[cat]) || 0; doneAll += Math.min(Number(done[cat]) || 0, Number(totals[cat]) || 0); });
      var pct = totalAll ? Math.round(doneAll / totalAll * 100) : 0; var panel = byId('jlptPanel'); panel.textContent = ''; var grid = element('div', 'jlpt-overview'); var score = element('div', 'jlpt-score'); score.appendChild(element('strong', '', pct + '%')); score.appendChild(element('span', '', doneAll + ' dari ' + totalAll + ' materi selesai')); grid.appendChild(score); var cats = element('div', 'category-progress');
      ['grammar', 'vocabulary', 'kanji', 'reading', 'listening', 'speaking'].forEach(function (cat) { var t = Number(totals[cat]) || 0; var d = Math.min(Number(done[cat]) || 0, t); var cp = t ? Math.round(d / t * 100) : 0; var row = element('div', 'category-row'); var head = element('div'); head.appendChild(element('strong', '', CATEGORY[cat].label)); head.appendChild(element('span', '', t ? d + '/' + t : 'Belum tersedia')); row.appendChild(head); var track = element('div', 'mini-track'); var fill = element('span'); fill.style.width = cp + '%'; track.appendChild(fill); row.appendChild(track); cats.appendChild(row); });
      grid.appendChild(cats); panel.appendChild(grid);
    }
    ['N5', 'N4', 'N3', 'N2', 'N1'].forEach(function (level) { var button = element('button', '', level); button.type = 'button'; button.dataset.level = level; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', 'false'); button.addEventListener('click', function () { select(level); }); tabs.appendChild(button); }); select(active);
  }

  function buildRecommendations(data, profile, due) {
    var recs = []; var lows = lowAccuracyPages(data); var dates = activityDates(data); var today = localDateKey();
    if (due > 0) recs.push({ score: 100, icon: '復', title: 'Review ' + due + ' kartu SRS', reason: 'Kartu ini sudah jatuh tempo dan menjadi prioritas pertama.', url: '../SRS-Flashcard.html' });
    if (lows[0]) recs.push({ score: 90, icon: CATEGORY[inferCategory(lows[0].id)] ? CATEGORY[inferCategory(lows[0].id)].icon : '文', title: 'Ulangi ' + titleFromId(lows[0].id), reason: 'Akurasi terakhir Anda masih ' + Math.round(lows[0].accuracy) + '%.', url: materialUrl(lows[0].id) });
    var progress = pageProgressByJLPT(data); var catalog = object(global.NPDashboardCatalog && global.NPDashboardCatalog.levels); var totals = object(catalog[profile.target]); var done = object(progress[profile.target]); var weakest = null;
    ['grammar', 'vocabulary', 'kanji', 'reading', 'listening', 'speaking'].forEach(function (cat) { var total = Number(totals[cat]) || 0; if (!total) return; var pct = (Number(done[cat]) || 0) / total; if (!weakest || pct < weakest.pct) weakest = { cat: cat, pct: pct }; });
    if (weakest) { var pickUrl = CATEGORY[weakest.cat].url; var pickTitle = 'Perkuat ' + CATEGORY[weakest.cat].label + ' ' + profile.target; var itemsCat = object(global.NPDashboardCatalog && global.NPDashboardCatalog.items); var lvlItems = object(itemsCat[profile.target]); var specific = array(lvlItems[weakest.cat]); if (specific.length) { var doneIds = data.activities.map(function (a) { return String(a.id || a.materialId || ''); }); var chosen = specific.filter(function (m) { return doneIds.indexOf(m.file) === -1; })[0] || specific[0]; pickUrl = '../' + chosen.file; pickTitle = 'Perkuat ' + CATEGORY[weakest.cat].label + ': ' + chosen.title; } recs.push({ score: 60, icon: CATEGORY[weakest.cat].icon, title: pickTitle, reason: 'Kategori ' + CATEGORY[weakest.cat].label + ' punya progres terendah (' + Math.round(weakest.pct * 100) + '%) di target ' + profile.target + '.', url: pickUrl }); }
    var listeningDates = data.activities.filter(function (a) { return inferCategory(a.category || a.type) === 'listening'; }).map(activityDate).sort(); var lastListening = listeningDates[listeningDates.length - 1];
    if (!lastListening || dayDiff(today, lastListening) >= 7) recs.push({ score: 55, icon: '聴', title: 'Latihan listening singkat', reason: lastListening ? 'Listening belum dipelajari selama ' + dayDiff(today, lastListening) + ' hari.' : 'Belum ada aktivitas listening yang tercatat.', url: '../Materi/Listening-Speaking.html' });
    var progressToday = todayProgress(data); var unmet = CATEGORY_ORDER.find(function (cat) { return progressToday[cat] < data.goals[cat]; });
    if (unmet) recs.push({ score: 40, icon: CATEGORY[unmet].icon, title: 'Selesaikan target ' + CATEGORY[unmet].label, reason: progressToday[unmet] + ' dari ' + data.goals[unmet] + ' ' + CATEGORY[unmet].unit + ' hari ini.', url: CATEGORY[unmet].url });
    return recs.sort(function (a, b) { return b.score - a.score; }).slice(0, 4);
  }
  function renderRecommendations(data, profile, due) {
    var wrap = byId('recommendationList'); wrap.textContent = ''; var recs = buildRecommendations(data, profile, due);
    if (!recs.length) { wrap.appendChild(emptyState('Belum ada rekomendasi', 'Lakukan satu latihan agar mesin rekomendasi dapat membaca pola belajar Anda.', '../Materi/Materi.html', 'Mulai belajar')); return; }
    recs.forEach(function (rec) { var row = element('div', 'recommendation-item'); row.appendChild(element('span', 'item-icon', rec.icon)); var copy = element('div', 'item-copy'); copy.appendChild(element('strong', '', rec.title)); copy.appendChild(element('span', '', rec.reason)); var link = element('a', 'item-action', 'Mulai →'); link.href = rec.url; copy.appendChild(link); row.appendChild(copy); wrap.appendChild(row); });
  }

  function renderSchedule(data) {
    var wrap = byId('upcomingSchedule'); wrap.textContent = ''; var now = Date.now(); var items = data.schedule.map(function (row) { row = object(row); return { title: safeText(row.n || row.name || row.title), type: safeText(row.tp || row.type), teacher: safeText(row.teacher || row.instructor), time: new Date(row.t || row.time || row.startsAt), url: safeInternalUrl(row.url, '../Kelas-Online.html') }; }).filter(function (row) { return row.title && Number.isFinite(row.time.getTime()) && row.time.getTime() >= now; }).sort(function (a, b) { return a.time - b.time; });
    if (!items.length) { wrap.appendChild(emptyState('Belum ada jadwal', 'Kelas yang Anda simpan akan tampil di sini tanpa membuat data kelas palsu.', '../Kelas-Online.html', 'Atur jadwal')); return; }
    var item = items[0]; var card = element('div', 'schedule-item'); card.appendChild(element('span', 'schedule-time', item.time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + item.time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))); card.appendChild(element('h3', '', item.title)); var status = item.time.getTime() - now <= 3600000 ? 'Segera dimulai' : 'Terjadwal'; var meta = [status, item.type, item.teacher].filter(Boolean).join(' · '); card.appendChild(element('p', 'schedule-meta', meta)); var link = element('a', 'button button-primary', 'Masuk kelas'); link.href = item.url; card.appendChild(link); wrap.appendChild(card);
  }

  function weeklyData(data) {
    var days = [];
    for (var i = 6; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); var key = localDateKey(d); days.push({ key: key, label: d.toLocaleDateString('id-ID', { weekday: 'short' }), minutes: 0, xp: 0, accuracySum: 0, accuracyCount: 0, completed: 0, activities: 0 }); }
    var map = {}; days.forEach(function (day) { map[day.key] = day; });
    data.activities.forEach(function (a) { var day = map[activityDate(a)]; if (!day) return; day.minutes += (Number(a.durationSeconds) || 0) / 60; day.xp += Number(a.xp) || 0; day.activities++; if (Number.isFinite(Number(a.accuracy))) { day.accuracySum += clamp(a.accuracy, 0, 100); day.accuracyCount++; } if (/completed/.test(a.type)) day.completed++; });
    Object.keys(object(data.dash.history)).forEach(function (key) { if (!map[key]) return; var h = object(data.dash.history[key]); map[key].minutes = Math.max(map[key].minutes, Number(h.minutes) || 0); map[key].xp = Math.max(map[key].xp, Number(h.xp) || 0); map[key].activities = Math.max(map[key].activities, Number(h.quiz) || 0); });
    return days;
  }
  function renderWeekly(data) {
    var days = weeklyData(data); var totals = days.reduce(function (sum, day) { sum.minutes += day.minutes; sum.xp += day.xp; sum.completed += day.completed; sum.activities += day.activities; sum.accSum += day.accuracySum; sum.accCount += day.accuracyCount; return sum; }, { minutes: 0, xp: 0, completed: 0, activities: 0, accSum: 0, accCount: 0 });
    var kpis = byId('weeklyKpis'); kpis.textContent = ''; [['Menit belajar', Math.round(totals.minutes)], ['XP diperoleh', Math.round(totals.xp)], ['Akurasi', totals.accCount ? Math.round(totals.accSum / totals.accCount) + '%' : '—'], ['Materi selesai', totals.completed]].forEach(function (row) { var box = element('div'); box.appendChild(element('strong', '', row[1])); box.appendChild(element('span', '', row[0])); kpis.appendChild(box); });
    var chart = byId('weeklyChart'); chart.textContent = ''; if (!totals.minutes && !totals.xp && !totals.activities) { chart.appendChild(element('div', 'chart-empty', 'Grafik akan muncul setelah aktivitas belajar pertama Anda.')); return; }
    var ns = 'http://www.w3.org/2000/svg'; var svg = document.createElementNS(ns, 'svg'); svg.setAttribute('class', 'chart-svg'); svg.setAttribute('viewBox', '0 0 760 240'); svg.setAttribute('aria-hidden', 'true'); var max = Math.max.apply(null, days.map(function (d) { return Math.max(d.minutes, d.xp); }).concat([1]));
    [40, 90, 140, 190].forEach(function (y) { var line = document.createElementNS(ns, 'line'); line.setAttribute('x1', '40'); line.setAttribute('x2', '745'); line.setAttribute('y1', y); line.setAttribute('y2', y); line.setAttribute('class', 'chart-grid'); svg.appendChild(line); });
    days.forEach(function (day, index) { var x = 54 + index * 99; var mh = day.minutes / max * 150; var xh = day.xp / max * 150; var minute = document.createElementNS(ns, 'rect'); minute.setAttribute('x', x); minute.setAttribute('y', 195 - mh); minute.setAttribute('width', '28'); minute.setAttribute('height', mh); minute.setAttribute('rx', '5'); minute.setAttribute('class', 'chart-minutes'); var xp = document.createElementNS(ns, 'rect'); xp.setAttribute('x', x + 32); xp.setAttribute('y', 195 - xh); xp.setAttribute('width', '28'); xp.setAttribute('height', xh); xp.setAttribute('rx', '5'); xp.setAttribute('class', 'chart-xp'); var label = document.createElementNS(ns, 'text'); label.setAttribute('x', x + 30); label.setAttribute('y', '219'); label.setAttribute('text-anchor', 'middle'); label.textContent = day.label; svg.appendChild(minute); svg.appendChild(xp); svg.appendChild(label); }); chart.appendChild(svg);
  }
  function renderHeatmap(data) {
    var dates = activityDates(data); var wrap = byId('activityHeatmap'); wrap.textContent = ''; var values = Object.values(dates); var max = Math.max.apply(null, values.concat([1]));
    for (var i = 89; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); var key = localDateKey(d); var value = dates[key] || 0; var level = value ? Math.max(1, Math.ceil(value / max * 4)) : 0; var cell = element('button', 'heat-cell'); cell.type = 'button'; cell.dataset.level = level; cell.setAttribute('aria-label', d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ': ' + value + ' aktivitas'); cell.title = d.toLocaleDateString('id-ID') + ' · ' + value + ' aktivitas'; wrap.appendChild(cell); }
  }
  function renderQuickActions() {
    var grid = byId('quickActions'); grid.textContent = ''; QUICK_ACTIONS.forEach(function (item) { var link = element('a', 'quick-action'); link.href = item[3]; link.appendChild(element('span', '', item[0])); var copy = element('span'); copy.appendChild(element('strong', '', item[1])); copy.appendChild(element('small', '', item[2])); link.appendChild(copy); grid.appendChild(link); });
  }

  function setupGoals(data, rerender) {
    var dialog = byId('goalDialog'); var fields = byId('goalFields'); fields.textContent = '';
    CATEGORY_ORDER.forEach(function (key) { var row = element('div', 'goal-field'); var label = element('label', '', CATEGORY[key].label + ' (' + CATEGORY[key].unit + ')'); label.htmlFor = 'goal-' + key; var input = element('input'); input.id = 'goal-' + key; input.name = key; input.type = 'number'; input.min = '1'; input.max = '999'; input.step = '1'; input.value = data.goals[key]; row.appendChild(label); row.appendChild(input); fields.appendChild(row); });
    byId('editGoals').addEventListener('click', function () { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); });
    byId('goalForm').addEventListener('submit', function (event) {
      if (event.submitter && event.submitter.value === 'cancel') return; event.preventDefault(); var next = {}; var valid = true;
      CATEGORY_ORDER.forEach(function (key) { var input = byId('goal-' + key); var value = Number(input.value); if (!Number.isInteger(value) || value < 1 || value > 999) { valid = false; input.focus(); } next[key] = value; });
      if (!valid) { notify('Target harus berupa angka 1 sampai 999.'); return; } writeJSON(KEYS.goals, next); data.goals = next; if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); renderGoals(data); notify('Target harian berhasil disimpan.'); if (rerender) rerender();
    });
  }
  function setupNavigation() {
    // Guard preventif (pola sama dengan index-page.js v233): tanpa ini, jika
    // struktur HTML Dashboard.html berubah (mobileMenu/.sidebar/themeToggle
    // dihapus/di-rename), fungsi ini melempar TypeError dan menghentikan
    // SELURUH sisa init() -- termasuk renderQuickActions, renderProfile, dsb
    // yang dipanggil setelahnya di baris yang sama.
    var menu = byId('mobileMenu'); var sidebar = document.querySelector('.sidebar');
    if (menu && sidebar) {
      menu.addEventListener('click', function () { var open = sidebar.classList.toggle('is-open'); menu.setAttribute('aria-expanded', String(open)); });
      document.addEventListener('click', function (event) { if (window.innerWidth <= 980 && sidebar.classList.contains('is-open') && !sidebar.contains(event.target) && !menu.contains(event.target)) { sidebar.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); } });
    }
    var stored = localStorage.getItem('np-theme') || localStorage.getItem('nihongo-theme'); if (stored === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    var themeBtn = byId('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', function () { var dark = document.documentElement.getAttribute('data-theme') === 'dark'; if (dark) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('np-theme', dark ? 'light' : 'dark'); });
  }
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:' || /^(127\.0\.0\.1|localhost|::1)$/.test(location.hostname)) return;
    global.addEventListener('load', function () { navigator.serviceWorker.register('../sw.js').catch(function () {}); });
  }

  // ── Progress jalur 介護 Kaigo ──
  // Dashboard sudah membaca np-kaigo-progress-v1 tapi belum menampilkannya.
  // Fungsi ini merangkum progres per kategori + menyarankan modul berikutnya.
  // ── Weak Skills & Strong Skills ──
  // Dashboard sudah mengumpulkan akurasi per halaman (lowAccuracyPages) dan
  // dapat mengelompokkan tiap halaman ke skill (inferCategory), tapi belum
  // menampilkannya sebagai analisis kekuatan/kelemahan. Fungsi ini merangkum
  // akurasi rata-rata per skill agar pelajar tahu fokus latihannya.
  function renderWeakSkills(data) {
    var host = byId('weakSkills');
    if (!host) return;
    host.textContent = '';

    var pages = object(data.pages);
    var agg = {}; // skill -> { sum, count }
    Object.keys(pages).forEach(function (id) {
      var p = object(pages[id]);
      var attempts = Number(p.attempts) || 0;
      if (attempts <= 0) return;
      var acc = Number(p.lastScore || p.bestScore);
      if (!Number.isFinite(acc)) return;
      var skill = inferCategory(id);
      if (skill === 'materi' || skill === 'srs') return; // lewati yang bukan skill terukur
      agg[skill] = agg[skill] || { sum: 0, count: 0 };
      agg[skill].sum += clamp(acc, 0, 100);
      agg[skill].count += 1;
    });

    var skills = Object.keys(agg).map(function (s) {
      return { skill: s, avg: Math.round(agg[s].sum / agg[s].count), count: agg[s].count };
    }).sort(function (a, b) { return a.avg - b.avg; });

    if (!skills.length) {
      host.appendChild(emptyState(
        'Belum ada data skill',
        'Kerjakan kuis di berbagai materi untuk melihat analisis kekuatan dan kelemahan Anda.',
        '../Materi/Materi.html', 'Mulai belajar'));
      return;
    }

    function skillMeta(s) {
      return CATEGORY[s] || { label: s.charAt(0).toUpperCase() + s.slice(1), icon: '技' };
    }
    function row(item, kind) {
      var meta = skillMeta(item.skill);
      var r = element('div', 'skill-row skill-' + kind);
      r.appendChild(element('span', 'skill-ic', meta.icon));
      var body = element('div', 'skill-body');
      var top = element('div', 'skill-top');
      top.appendChild(element('span', 'skill-name', meta.label));
      top.appendChild(element('span', 'skill-pct', item.avg + '%'));
      body.appendChild(top);
      var bar = element('div', 'skill-bar');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuenow', String(item.avg));
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-label', meta.label + ' rata-rata ' + item.avg + ' persen');
      var fill = element('i'); fill.style.width = item.avg + '%';
      bar.appendChild(fill); body.appendChild(bar);
      r.appendChild(body);
      return r;
    }

    // Weak = accuracy terendah (maks 3), Strong = tertinggi (maks 3)
    var weak = skills.slice(0, 3);
    var strong = skills.slice().reverse().slice(0, 3);

    var wrap = element('div', 'skills-split');
    var weakCol = element('div', 'skills-col');
    var wh = element('div', 'skills-col-head');
    wh.appendChild(element('span', 'skills-col-title', 'Perlu latihan'));
    wh.appendChild(element('span', 'skills-col-badge weak', '弱'));
    weakCol.appendChild(wh);
    weak.forEach(function (it) { weakCol.appendChild(row(it, 'weak')); });

    var strongCol = element('div', 'skills-col');
    var sh = element('div', 'skills-col-head');
    sh.appendChild(element('span', 'skills-col-title', 'Kekuatan Anda'));
    sh.appendChild(element('span', 'skills-col-badge strong', '強'));
    strongCol.appendChild(sh);
    strong.forEach(function (it) { strongCol.appendChild(row(it, 'strong')); });

    wrap.appendChild(weakCol);
    wrap.appendChild(strongCol);
    host.appendChild(wrap);

    // Ajakan latihan skill terlemah
    var weakest = weak[0];
    if (weakest) {
      var meta = skillMeta(weakest.skill);
      var cta = element('div', 'skills-cta');
      cta.appendChild(element('span', 'skills-cta-label', 'Rekomendasi fokus'));
      var link = element('a', 'skills-cta-link', 'Latih ' + meta.label + ' (' + weakest.avg + '%)');
      link.href = meta.url || '../Materi/Materi.html';
      cta.appendChild(link);
      host.appendChild(cta);
    }
  }

  // ── League / Divisi mingguan (gamifikasi kompetitif ala Duolingo) ──
  // Membangun DI ATAS XP mingguan yang sudah dihitung (weeklyData). Tidak
  // menduplikasi leaderboard: ini progresi tier personal berbasis XP minggu
  // ini, yang mendorong konsistensi. Reset tiap minggu secara alami karena
  // weeklyData hanya menghitung 7 hari terakhir.
  var LEAGUES = [
    { key: 'kayu',   name: 'Liga Kayu',   ja: '木',   min: 0,    color: '#8a6d4b' },
    { key: 'perunggu', name: 'Liga Perunggu', ja: '銅', min: 100,  color: '#b87333' },
    { key: 'perak',  name: 'Liga Perak',  ja: '銀',   min: 300,  color: '#9aa3ad' },
    { key: 'emas',   name: 'Liga Emas',   ja: '金',   min: 600,  color: '#c89b3c' },
    { key: 'giok',   name: 'Liga Giok',   ja: '翡',   min: 1000, color: '#4f9e7a' },
    { key: 'berlian', name: 'Liga Berlian', ja: '鑽', min: 1600, color: '#5b8fb0' },
  ];

  function leagueFor(weeklyXP) {
    var idx = 0;
    for (var i = 0; i < LEAGUES.length; i++) {
      if (weeklyXP >= LEAGUES[i].min) idx = i;
    }
    return idx;
  }

  function renderLeague(data) {
    var host = byId('leagueWidget');
    if (!host) return;
    host.textContent = '';

    var days = (typeof weeklyData === 'function') ? weeklyData(data) : [];
    var weeklyXP = Math.round(days.reduce(function (s, d) { return s + (Number(d.xp) || 0); }, 0));

    var idx = leagueFor(weeklyXP);
    var cur = LEAGUES[idx];
    var next = LEAGUES[idx + 1] || null;

    // Lencana liga
    var head = element('div', 'league-head');
    var badge = element('span', 'league-badge');
    badge.textContent = cur.ja;
    badge.style.background = cur.color;
    badge.setAttribute('aria-hidden', 'true');
    head.appendChild(badge);
    var info = element('div', 'league-info');
    info.appendChild(element('div', 'league-name', cur.name));
    info.appendChild(element('div', 'league-xp', weeklyXP + ' XP minggu ini'));
    head.appendChild(info);
    host.appendChild(head);

    // Progres ke liga berikutnya
    if (next) {
      var needed = next.min - cur.min;
      var got = weeklyXP - cur.min;
      var pct = Math.max(0, Math.min(100, Math.round(got / needed * 100)));
      var barWrap = element('div', 'league-bar');
      barWrap.setAttribute('role', 'progressbar');
      barWrap.setAttribute('aria-valuenow', String(pct));
      barWrap.setAttribute('aria-valuemin', '0');
      barWrap.setAttribute('aria-valuemax', '100');
      barWrap.setAttribute('aria-label', 'Menuju ' + next.name);
      var fill = element('i');
      fill.style.width = pct + '%';
      fill.style.background = next.color;
      barWrap.appendChild(fill);
      host.appendChild(barWrap);
      var hint = element('div', 'league-hint');
      hint.textContent = (next.min - weeklyXP) + ' XP lagi menuju ' + next.name;
      host.appendChild(hint);
    } else {
      var top = element('div', 'league-hint', 'Liga tertinggi tercapai — pertahankan konsistensi!');
      host.appendChild(top);
    }
  }

  function renderKaigo(data) {
    var host = byId('kaigoProgress');
    if (!host) return; // halaman lama tanpa kartu Kaigo → lewati diam-diam
    host.textContent = '';

    var catalog = object(global.NPDashboardCatalog).kaigo;
    if (!catalog || !array(catalog.modules).length) { host.parentNode && (host.parentNode.style.display = 'none'); return; }

    var progress = object(data.kaigo);
    var mods = array(catalog.modules);
    var cats = array(catalog.categories);

    // Hitung selesai per kategori (progressPercent>=100 atau completed)
    function isDone(slug) {
      var r = progress[slug];
      return !!(r && (r.completed || Number(r.progressPercent) >= 100));
    }
    var doneTotal = 0;
    var perCat = {};
    mods.forEach(function (m) {
      perCat[m.cat] = perCat[m.cat] || { total: 0, done: 0 };
      perCat[m.cat].total++;
      if (isDone(m.slug)) { perCat[m.cat].done++; doneTotal++; }
    });

    // Ringkasan total
    var pct = mods.length ? Math.round(doneTotal / mods.length * 100) : 0;
    var summary = element('div', 'kaigo-summary');
    var head = element('div', 'kaigo-sum-head');
    head.appendChild(element('strong', '', '介護 Kaigo'));
    head.appendChild(element('span', 'kaigo-sum-count', doneTotal + ' / ' + mods.length + ' modul (' + pct + '%)'));
    summary.appendChild(head);
    var bar = element('div', 'kaigo-bar'); var fill = element('i'); fill.style.width = pct + '%';
    bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuenow', String(pct));
    bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-label', 'Progres Kaigo ' + pct + ' persen');
    bar.appendChild(fill); summary.appendChild(bar);
    host.appendChild(summary);

    // Progress per kategori
    var grid = element('div', 'kaigo-cats');
    cats.forEach(function (c) {
      var pc = perCat[c.id]; if (!pc) return;
      var cpct = pc.total ? Math.round(pc.done / pc.total * 100) : 0;
      var cell = element('div', 'kaigo-cat');
      var top = element('div', 'kaigo-cat-top');
      top.appendChild(element('span', 'kaigo-cat-ic', c.icon));
      top.appendChild(element('span', 'kaigo-cat-nm', c.name));
      top.appendChild(element('span', 'kaigo-cat-ct', pc.done + '/' + pc.total));
      cell.appendChild(top);
      var cb = element('div', 'kaigo-bar kaigo-bar-sm'); var cf = element('i'); cf.style.width = cpct + '%'; cb.appendChild(cf);
      cell.appendChild(cb);
      grid.appendChild(cell);
    });
    host.appendChild(grid);

    // Rekomendasi modul berikutnya — menghormati prasyarat (prereq).
    // Prioritas: modul belum-selesai yang prasyaratnya sudah selesai (atau tanpa
    // prasyarat), diambil paling awal menurut urutan katalog. Ini mencegah
    // menyarankan modul lanjutan sebelum dasarnya dikuasai. Bila semua kandidat
    // "siap" habis (mis. semua terkunci prasyarat), jatuh ke modul belum-selesai
    // pertama sebagai cadangan.
    var next = null, fallback = null;
    for (var i = 0; i < mods.length; i++) {
      var m = mods[i];
      if (isDone(m.slug)) continue;
      if (!fallback) fallback = m;
      var ready = !m.prereq || isDone(m.prereq);
      if (ready) { next = m; break; }
    }
    if (!next) next = fallback;
    var cta = element('div', 'kaigo-next');
    if (next) {
      cta.appendChild(element('span', 'kaigo-next-label', doneTotal ? 'Lanjutkan Kaigo' : 'Mulai jalur Kaigo'));
      var link = element('a', 'kaigo-next-link', next.title);
      link.href = '../Materi/' + next.slug + '.html';
      cta.appendChild(link);
    } else {
      cta.appendChild(element('span', 'kaigo-next-label', '🎉 Semua modul Kaigo selesai!'));
      var hub = element('a', 'kaigo-next-link', 'Tinjau ulang di hub Kaigo');
      hub.href = '../Materi/Kaigo.html';
      cta.appendChild(hub);
    }
    host.appendChild(cta);
  }

  async function init() {
    migrateLegacy(); setupNavigation(); registerServiceWorker(); renderQuickActions(); var data = loadData(); var profile = await resolveProfile(); var xpInfo = renderProfile(profile, data); var due = getDueSRS(data); var streak = computeStreak(data);

    // Satu fungsi render agar bisa dipanggil ulang saat data berubah di tab lain
    // atau setelah sync Supabase — dashboard jadi "hidup" tanpa perlu refresh.
    function renderAll() {
      data = loadData(); due = getDueSRS(data); streak = computeStreak(data);
      xpInfo = renderProfile(profile, data);
      renderGoals(data); renderStreak(data, streak); renderXP(data, xpInfo);
      renderContinue(data); renderReview(data, due); renderJLPT(data, profile);
      renderRecommendations(data, profile, due); renderSchedule(data);
      renderWeekly(data); renderHeatmap(data); renderWeakSkills(data); renderLeague(data); renderKaigo(data);
    }

    renderGoals(data); renderStreak(data, streak); renderXP(data, xpInfo); renderContinue(data); renderReview(data, due); renderJLPT(data, profile); renderRecommendations(data, profile, due); renderSchedule(data); renderWeekly(data); renderHeatmap(data); renderWeakSkills(data); renderLeague(data); renderKaigo(data); setupGoals(data, function () { renderRecommendations(data, profile, due); });
    byId('refreshRecommendations').addEventListener('click', function () { data = loadData(); due = getDueSRS(data); renderRecommendations(data, profile, due); notify('Rekomendasi diperbarui dari data terbaru.'); });

    // ── Realtime lintas-tab ──
    // 'storage' event dipicu browser saat TAB LAIN menulis localStorage. Jadi
    // menyelesaikan kuis di satu tab langsung memperbarui dashboard di tab ini.
    // Di-debounce agar burst penulisan tidak memicu render berkali-kali.
    var syncKeys = [KEYS.activities, KEYS.dashboard, KEYS.goals, KEYS.preferences];
    var rerenderTimer = null;
    function scheduleRerender() {
      clearTimeout(rerenderTimer);
      rerenderTimer = setTimeout(function () {
        try { renderAll(); notify('Dashboard diperbarui dari aktivitas terbaru.'); }
        catch (e) { /* jangan rusak dashboard karena render ulang gagal */ }
      }, 400);
    }
    global.addEventListener('storage', function (event) {
      if (!event || !event.key) return;
      if (syncKeys.indexOf(event.key) !== -1) scheduleRerender();
    });
    // Setelah Sync Supabase menarik data terbaru dari server (login di perangkat
    // lain), ia memancarkan 'np:authChange' / 'np:progressSynced'.
    global.addEventListener('np:progressSynced', scheduleRerender);
    global.addEventListener('np:authChange', scheduleRerender);

    notify('Dashboard siap.');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init().catch(function () { byId('welcomeTitle').textContent = 'Dashboard belum dapat dimuat'; byId('welcomeSubtitle').textContent = 'Data Anda tetap aman. Muat ulang halaman untuk mencoba lagi.'; notify('Terjadi kesalahan saat memuat dashboard.'); }); });
  else init();
})(window);
