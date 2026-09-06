/**
 * anatomy-viewer.js — Nihongo Pro Academy
 * Viewer anatomi 2D interaktif: hotspot aksesibel, panel info, zoom/pan/fullscreen,
 * mode belajar, progress & integrasi XP.
 *
 * CATATAN JUJUR (Tahap 2 spesifikasi): halaman ini memakai diagram SVG stylized
 * sederhana yang SUDAH ADA dan berfungsi (bukan foto/ilustrasi anatomi fotorealistik).
 * Membangun set lengkap gambar anatomi profesional (tampak depan/belakang, rangka,
 * otot, organ, saraf, sirkulasi, pernapasan, pencernaan — 9 tampilan berbeda per
 * spesifikasi) adalah pekerjaan aset visual besar yang classes di luar kemampuan
 * teks/kode murni; SVG placeholder yang rapi ini dipakai sebagai fondasi fungsional
 * sekarang, siap diganti aset final tanpa mengubah struktur kode (lihat imageHotspot
 * di anatomy-data.js). Prioritas Tahap 2 di rilis ini: kontrol zoom/pan/fullscreen,
 * hotspot aksesibel, dan panel info — SEMUA berfungsi penuh terlepas dari kualitas
 * gambar dasarnya.
 *
 * Tidak menggunakan innerHTML untuk data yang berasal dari pengguna/eksternal —
 * seluruh konten teks dimasukkan via textContent atau element creation manual.
 */
(function (global) {
  'use strict';

  var D = global.NPAnatomyData;
  if (!D) { console.error('anatomy-viewer.js: NPAnatomyData belum dimuat. Pastikan anatomy-data.js dimuat lebih dulu.'); return; }

  function $(id) { return document.getElementById(id); }
  function safeText(el, text) { el.textContent = text == null ? '' : String(text); }

  // ═══════════ STATE ═══════════
  var state = {
    currentSystem: 'luar',
    mode: localStorage.getItem('np-anatomy-mode') || 'belajar', // belajar | eksplorasi | kuisvisual
    zoom: 1,
    panX: 0, panY: 0,
    isFullscreen: false,
    activeTermId: null,
    learnedIds: new Set(JSON.parse(localStorage.getItem('np-anatomy-learned') || '[]')),
    lastFiveOpened: [], // untuk XP "buka 5 hotspot berbeda"
  };

  function saveLearned() {
    localStorage.setItem('np-anatomy-learned', JSON.stringify([...state.learnedIds]));
  }
  function saveMode() {
    localStorage.setItem('np-anatomy-mode', state.mode);
  }

  // ═══════════ TOAST RINGAN (feedback gamifikasi, tanpa dependency baru) ═══════════
  var toastEl = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ana-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    safeText(toastEl, msg);
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  // ═══════════ INTEGRASI XP (Tahap 6) — pakai assets/np-xp.js yang SUDAH ADA ═══════════
  // Tidak membuat sistem XP duplikat. PERBAIKAN: modul diekspor sebagai
  // global.NPXP dengan metode award() — nama lama global.NPXp.add() tidak
  // pernah ada, jadi XP eksplorasi ini sebelumnya hilang diam-diam. Sumber
  // 'materi' = bucket default bucketOf() di np-xp.js (eksplorasi materi).
  // Jika np-xp.js tidak ikut dimuat halaman, award() tidak terpanggil — no-op aman.
  function grantXP(amount, reason) {
    try {
      if (global.NPXP && typeof global.NPXP.award === 'function') {
        global.NPXP.award('materi', amount, { title: 'Anatomi — ' + reason });
        showToast('✨ +' + amount + ' XP — ' + reason);
      }
    } catch (e) { /* aman diabaikan jika sistem XP tidak tersedia */ }
  }

  function onHotspotOpened(term) {
    if (state.learnedIds.has(term.id)) return; // sudah pernah dibuka, tak dobel XP
    state.learnedIds.add(term.id);
    saveLearned();
    updateProgressUI();

    state.lastFiveOpened.push(term.id);
    if (state.lastFiveOpened.length >= 5) {
      grantXP(5, 'Menjelajahi 5 bagian tubuh');
      state.lastFiveOpened = [];
    }

    // Cek apakah satu SISTEM baru saja selesai dipelajari semua
    var sysTerms = D.getTermsBySystem(term.system);
    var allLearned = sysTerms.every(function (t) { return state.learnedIds.has(t.id); });
    if (allLearned) {
      grantXP(20, 'Menyelesaikan sistem ' + (D.SYSTEMS[term.system] ? D.SYSTEMS[term.system].label : term.system));
    }
  }

  function updateProgressUI() {
    var bar = $('anaProgressFill');
    var label = $('anaProgressLabel');
    if (!bar || !label) return;
    var pct = Math.round((state.learnedIds.size / D.TOTAL_TERMS) * 100);
    bar.style.width = pct + '%';
    safeText(label, state.learnedIds.size + ' / ' + D.TOTAL_TERMS + ' bagian dipelajari (' + pct + '%)');
  }

  // ═══════════ RENDER DAFTAR ISTILAH (term-list) ═══════════
  function renderTerms(sysKey) {
    var data = D.SYSTEMS[sysKey];
    var list = $('termList');
    list.innerHTML = ''; // aman: kita bangun ulang dari nol, bukan menyisipkan HTML dari input pengguna
    if (!data) return;

    data.terms.forEach(function (t, i) {
      var card = document.createElement('div');
      card.className = 'term-card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', t.japanese + ', ' + t.indonesian);
      if (t.bodyId) card.dataset.bodyId = t.bodyId;
      card.dataset.termId = t.id;

      var numEl = document.createElement('div');
      numEl.className = 'term-num';
      safeText(numEl, String(i + 1));

      var dot = document.createElement('div');
      dot.className = 'term-progress-dot' + (state.learnedIds.has(t.id) ? ' learned' : '');

      var body = document.createElement('div');
      body.style.flex = '1';

      var jpLine = document.createElement('div');
      jpLine.className = 'term-jp';
      var furiSpan = document.createElement('span');
      furiSpan.className = 'furi';
      safeText(furiSpan, t.furigana);
      jpLine.appendChild(furiSpan);
      jpLine.appendChild(document.createTextNode(t.japanese));

      var romajiLine = document.createElement('div');
      romajiLine.className = 'term-romaji';
      safeText(romajiLine, t.romaji);

      var idLine = document.createElement('div');
      idLine.className = 'term-id';
      safeText(idLine, t.indonesian + (state.mode !== 'eksplorasi' ? '' : ''));

      var noteLine = document.createElement('div');
      noteLine.className = 'term-note';
      safeText(noteLine, t.kaigoNote);

      body.appendChild(jpLine);
      body.appendChild(romajiLine);
      body.appendChild(idLine);
      body.appendChild(noteLine);

      card.appendChild(numEl);
      card.appendChild(body);
      card.appendChild(dot);

      function openThis() { openInfoPanel(t); if (t.bodyId) highlightBodyPart(t.bodyId, card); }
      card.addEventListener('click', openThis);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThis(); }
      });
      if (t.bodyId) {
        card.addEventListener('mouseenter', function () { highlightBodyPart(t.bodyId, card); });
        card.addEventListener('mouseleave', function () { highlightBodyPart(null, card); });
      }
      list.appendChild(card);
    });

    renderHotspots(sysKey);
  }

  function highlightBodyPart(bodyId, card) {
    document.querySelectorAll('.body-part').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.hotspot-btn').forEach(function (h) { h.classList.remove('selected'); });
    document.querySelectorAll('.term-card').forEach(function (c) { c.classList.remove('hl'); });
    if (bodyId) {
      var el = document.querySelector('.body-part[data-id="' + bodyId + '"]');
      if (el) el.classList.add('active');
      var hs = document.querySelector('.hotspot-btn[data-body-id="' + bodyId + '"]');
      if (hs) hs.classList.add('selected');
      if (card) card.classList.add('hl');
    }
  }

  // ═══════════ HOTSPOT AKSESIBEL (Tahap 3) ═══════════
  // Hotspot dibuat sebagai <button> sungguhan (bukan cuma elemen SVG diklik) supaya
  // bisa diakses Tab/Enter dan pembaca layar. Posisi memakai koordinat % relatif
  // terhadap viewport diagram, disalin dari posisi bodyId di SVG viewBox 200x420.
  var BODY_HOTSPOT_POS = {
    'atama': { x: 50, y: 8 }, 'kubi': { x: 50, y: 16 }, 'mune': { x: 50, y: 30 },
    'ude-hidari': { x: 22, y: 32 }, 'ude-migi': { x: 78, y: 32 },
    'te-hidari': { x: 22, y: 49 }, 'te-migi': { x: 78, y: 49 },
    'onaka': { x: 50, y: 51 }, 'momo-hidari': { x: 38, y: 71 }, 'momo-migi': { x: 62, y: 71 },
    'ashi-hidari': { x: 38, y: 90 }, 'ashi-migi': { x: 62, y: 90 },
    'ashikubi-hidari': { x: 38, y: 98 }, 'ashikubi-migi': { x: 62, y: 98 },
    'shinzou': { x: 46, y: 28 }, 'hai-hidari': { x: 36, y: 27 }, 'hai-migi': { x: 60, y: 27 },
    'i': { x: 58, y: 40 }, 'kanzou': { x: 46, y: 37 }, 'chou': { x: 50, y: 51 },
  };

  function renderHotspots(sysKey) {
    var stage = $('diagramStage');
    var oldHotspots = stage.querySelectorAll('.hotspot-btn');
    oldHotspots.forEach(function (h) { h.remove(); });

    if (state.mode === 'kuisvisual') return; // hotspot disembunyikan saat mode kuis visual (lihat anatomy-quiz.js)

    var terms = D.getTermsBySystem(sysKey).filter(function (t) { return t.bodyId && BODY_HOTSPOT_POS[t.bodyId]; });
    var seenBodyId = {};
    terms.forEach(function (t) {
      if (seenBodyId[t.bodyId]) return; // satu bodyId satu hotspot saja (beberapa istilah berbagi lokasi)
      seenBodyId[t.bodyId] = true;
      var pos = BODY_HOTSPOT_POS[t.bodyId];
      var btn = document.createElement('button');
      btn.className = 'hotspot-btn';
      btn.type = 'button';
      btn.style.left = pos.x + '%';
      btn.style.top = pos.y + '%';
      btn.dataset.bodyId = t.bodyId;
      btn.dataset.termId = t.id;
      btn.setAttribute('aria-label', 'Lihat detail ' + t.japanese + ' (' + t.indonesian + ')');

      var tip = document.createElement('span');
      tip.className = 'hotspot-tooltip';
      safeText(tip, state.mode === 'belajar' ? (t.japanese + ' · ' + t.indonesian) : '?');
      btn.appendChild(tip);

      btn.addEventListener('click', function () {
        var card = document.querySelector('.term-card[data-body-id="' + t.bodyId + '"]');
        openInfoPanel(t);
        highlightBodyPart(t.bodyId, card);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      stage.appendChild(btn);
    });
  }

  // ═══════════ PANEL INFORMASI (Tahap 4) ═══════════
  var panelHistory = []; // untuk tombol sebelumnya/berikutnya dalam sesi
  var panelIdx = -1;

  function buildInfoPanelDOM() {
    if ($('anaInfoPanel')) return;

    var overlay = document.createElement('div');
    overlay.className = 'info-panel-overlay';
    overlay.id = 'anaInfoOverlay';

    var panel = document.createElement('div');
    panel.className = 'info-panel';
    panel.id = 'anaInfoPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'anaInfoTitle');

    var closeBtn = document.createElement('button');
    closeBtn.className = 'info-panel-close';
    closeBtn.setAttribute('aria-label', 'Tutup panel informasi');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', closeInfoPanel);

    var titleJp = document.createElement('h3');
    titleJp.className = 'jp-big';
    titleJp.id = 'anaInfoTitle';

    var furiBig = document.createElement('div');
    furiBig.className = 'furi-big';
    var romajiBig = document.createElement('div');
    romajiBig.className = 'romaji-big';

    var rows = document.createElement('div');
    rows.id = 'anaInfoRows';

    var actions = document.createElement('div');
    actions.className = 'ip-actions';

    var audioBtn = document.createElement('button');
    audioBtn.className = 'ip-btn'; audioBtn.type = 'button';
    audioBtn.innerHTML = ''; audioBtn.textContent = '🔊 Dengar';
    audioBtn.id = 'anaAudioBtn';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'ip-btn'; saveBtn.type = 'button';
    saveBtn.textContent = '💾 Simpan ke Flashcard';
    saveBtn.id = 'anaSaveBtn';

    var quizBtn = document.createElement('button');
    quizBtn.className = 'ip-btn primary'; quizBtn.type = 'button';
    quizBtn.textContent = '🎯 Mulai Kuis';
    quizBtn.addEventListener('click', function () {
      closeInfoPanel();
      var qSection = document.querySelector('.quiz-section');
      if (qSection) qSection.scrollIntoView({ behavior: 'smooth' });
    });

    actions.appendChild(audioBtn);
    actions.appendChild(saveBtn);
    actions.appendChild(quizBtn);

    var nav = document.createElement('div');
    nav.className = 'ip-nav';
    var prevBtn = document.createElement('button');
    prevBtn.className = 'ip-btn'; prevBtn.type = 'button'; prevBtn.textContent = '← Sebelumnya';
    prevBtn.id = 'anaPrevBtn';
    var nextBtn = document.createElement('button');
    nextBtn.className = 'ip-btn'; nextBtn.type = 'button'; nextBtn.textContent = 'Berikutnya →';
    nextBtn.id = 'anaNextBtn';
    nav.appendChild(prevBtn); nav.appendChild(nextBtn);

    panel.appendChild(closeBtn);
    panel.appendChild(titleJp);
    panel.appendChild(furiBig);
    panel.appendChild(romajiBig);
    panel.appendChild(rows);
    panel.appendChild(actions);
    panel.appendChild(nav);

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    overlay.addEventListener('click', closeInfoPanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) closeInfoPanel();
    });
  }

  function addRow(container, label, value) {
    if (!value) return;
    var row = document.createElement('div');
    row.className = 'ip-row';
    var l = document.createElement('div'); l.className = 'ip-label'; safeText(l, label);
    var v = document.createElement('div'); v.className = 'ip-val'; safeText(v, value);
    row.appendChild(l); row.appendChild(v);
    container.appendChild(row);
  }

  var lastFocusedBeforePanel = null;

  function openInfoPanel(term) {
    buildInfoPanelDOM();
    lastFocusedBeforePanel = document.activeElement;

    safeText($('anaInfoTitle'), term.japanese);
    safeText(document.querySelector('.furi-big'), term.furigana + ' · ' + term.romaji);
    safeText(document.querySelector('.romaji-big'), term.indonesian + ' / ' + term.english);

    var rows = $('anaInfoRows');
    rows.innerHTML = '';
    addRow(rows, 'Lokasi', term.location);
    addRow(rows, 'Fungsi', term.function);
    addRow(rows, 'Catatan Kaigo', term.kaigoNote);
    if (term.kaigoExample) addRow(rows, 'Contoh', term.kaigoExample);

    $('anaOverlay') || null; // no-op guard
    $('anaInfoOverlay').classList.add('open');
    $('anaInfoPanel').classList.add('open');

    state.activeTermId = term.id;
    onHotspotOpened(term);

    // Mode Eksplorasi: tandai kartu ini "revealed" supaya blur label dibuka permanen
    // untuk istilah yang sudah pernah dilihat (Tahap 5.2).
    var cardEl = document.querySelector('.term-card[data-term-id="' + term.id + '"]');
    if (cardEl) cardEl.classList.add('revealed');

    // URL hash (Tahap 3): halaman dibuka dengan hash langsung membuka istilah tsb
    history.replaceState(null, '', '#' + term.id);

    // Riwayat prev/next dalam sesi ini
    if (panelHistory[panelIdx] !== term.id) {
      panelHistory = panelHistory.slice(0, panelIdx + 1);
      panelHistory.push(term.id);
      panelIdx = panelHistory.length - 1;
    }
    updatePanelNavButtons();

    // Audio (Web Speech API)
    $('anaAudioBtn').onclick = function () { speakJapanese(term.audioText || term.japanese); };
    $('anaSaveBtn').onclick = function () { saveToFlashcard(term); };
    $('anaPrevBtn').onclick = function () { navigatePanel(-1); };
    $('anaNextBtn').onclick = function () { navigatePanel(1); };

    // Focus trap sederhana: pindah fokus ke tombol tutup
    setTimeout(function () { document.querySelector('.info-panel-close').focus(); }, 50);
  }

  function navigatePanel(dir) {
    var newIdx = panelIdx + dir;
    if (newIdx < 0 || newIdx >= panelHistory.length) {
      // Jika di ujung riwayat, lanjut ke istilah berikutnya/sebelumnya dalam sistem aktif
      var terms = D.getTermsBySystem(state.currentSystem);
      var curPos = terms.findIndex(function (t) { return t.id === state.activeTermId; });
      var nextPos = curPos + dir;
      if (nextPos >= 0 && nextPos < terms.length) openInfoPanel(terms[nextPos]);
      return;
    }
    panelIdx = newIdx;
    var t = D.getTermById(panelHistory[panelIdx]);
    if (t) openInfoPanel(t);
  }

  function updatePanelNavButtons() {
    // Selalu aktif — navigatePanel akan lanjut ke istilah lain dalam sistem jika riwayat habis.
  }

  function closeInfoPanel() {
    var overlay = $('anaInfoOverlay'), panel = $('anaInfoPanel');
    if (overlay) overlay.classList.remove('open');
    if (panel) panel.classList.remove('open');
    if (lastFocusedBeforePanel && typeof lastFocusedBeforePanel.focus === 'function') {
      lastFocusedBeforePanel.focus(); // kembalikan fokus ke hotspot/kartu semula (Tahap 9 aksesibilitas)
    }
  }

  // ═══════════ WEB SPEECH API (audio pengucapan) ═══════════
  var isSpeaking = false;
  function speakJapanese(text) {
    if (!('speechSynthesis' in window)) {
      showToast('⚠️ Browser tidak mendukung audio pengucapan.');
      return;
    }
    if (isSpeaking) { speechSynthesis.cancel(); } // cegah audio bertumpuk
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    utter.rate = 0.85;
    isSpeaking = true;
    utter.onend = function () { isSpeaking = false; };
    utter.onerror = function () { isSpeaking = false; };
    speechSynthesis.speak(utter);
  }

  // ═══════════ SIMPAN KE FLASHCARD ═══════════
  // Memakai localStorage sendiri (np-anatomy-flashcards) — terpisah dari SRS-Flashcard.html
  // agar tidak mengubah skema data SRS yang sudah ada tanpa koordinasi lebih lanjut.
  function saveToFlashcard(term) {
    try {
      var key = 'np-anatomy-flashcards';
      var saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (saved.indexOf(term.id) === -1) {
        saved.push(term.id);
        localStorage.setItem(key, JSON.stringify(saved));
        showToast('💾 Disimpan: ' + term.japanese);
      } else {
        showToast('Sudah tersimpan sebelumnya.');
      }
    } catch (e) { showToast('Gagal menyimpan.'); }
  }

  // ═══════════ ZOOM / PAN / FULLSCREEN (Tahap 2) ═══════════
  var MIN_ZOOM = 0.7, MAX_ZOOM = 2.5;
  function applyTransform() {
    var svg = $('bodySvg');
    svg.style.transform = 'translate(' + state.panX + 'px,' + state.panY + 'px) scale(' + state.zoom + ')';
  }
  function zoomBy(delta) {
    state.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom + delta));
    applyTransform();
  }
  function resetView() {
    state.zoom = 1; state.panX = 0; state.panY = 0;
    applyTransform();
  }
  function toggleFullscreen() {
    var vp = $('diagramViewport');
    state.isFullscreen = !state.isFullscreen;
    vp.classList.toggle('fullscreen-active', state.isFullscreen);
    $('vtFullscreen').setAttribute('aria-pressed', String(state.isFullscreen));
  }

  function setupZoomPanControls() {
    var vp = $('diagramViewport');
    $('vtZoomIn').addEventListener('click', function () { zoomBy(0.2); });
    $('vtZoomOut').addEventListener('click', function () { zoomBy(-0.2); });
    $('vtReset').addEventListener('click', resetView);
    $('vtFullscreen').addEventListener('click', toggleFullscreen);

    // Mouse wheel zoom
    vp.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 0.1 : -0.1);
    }, { passive: false });

    // Drag / pan (mouse)
    var dragging = false, lastX = 0, lastY = 0;
    vp.addEventListener('mousedown', function (e) {
      if (state.zoom <= 1) return;
      dragging = true; lastX = e.clientX; lastY = e.clientY; vp.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      state.panX += e.clientX - lastX; state.panY += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      applyTransform();
    });
    window.addEventListener('mouseup', function () { dragging = false; vp.style.cursor = ''; });

    // Pinch-to-zoom & pan (touch)
    var touchStartDist = 0, touchStartZoom = 1, lastTouchX = 0, lastTouchY = 0, lastTapTime = 0;
    function touchDist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
    vp.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        touchStartDist = touchDist(e.touches); touchStartZoom = state.zoom;
      } else if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
        var now = Date.now();
        if (now - lastTapTime < 300) { zoomBy(state.zoom < 1.5 ? 0.5 : -0.5); } // double-tap zoom
        lastTapTime = now;
      }
    }, { passive: true });
    vp.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        var scale = touchDist(e.touches) / (touchStartDist || 1);
        state.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, touchStartZoom * scale));
        applyTransform();
      } else if (e.touches.length === 1 && state.zoom > 1) {
        state.panX += e.touches[0].clientX - lastTouchX;
        state.panY += e.touches[0].clientY - lastTouchY;
        lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
        applyTransform();
      }
    }, { passive: false });

    // Keyboard: Escape keluar fullscreen
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isFullscreen) toggleFullscreen();
    });
  }

  // ═══════════ MODE BELAJAR / EKSPLORASI / KUIS VISUAL (Tahap 5) ═══════════
  function setMode(mode) {
    state.mode = mode; saveMode();
    document.querySelectorAll('.mode-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    document.body.dataset.anatomyMode = mode;
    renderTerms(state.currentSystem); // render ulang: label disembunyikan di mode eksplorasi via CSS [data-anatomy-mode="eksplorasi"]
    // GENUINELY DIPERBAIKI: toast generik mode Kuis Visual di sini DIHAPUS --
    // dikonfirmasi nyata (via pengujian interaktif) bahwa toast ini SELALU
    // menimpa toast soal spesifik ("「◯◯」をタップしてください") yang dipicu
    // NPAnatomyQuiz.startVisualQuiz() dari listener terpisah di Anatomi-Dasar.html
    // pada #modeSwitcher yang sama. Karena listener inline itu teregistrasi
    // LEBIH DULU (kode sinkron, sementara initModeSwitcher() di sini baru
    // jalan saat DOMContentLoaded), urutan tembak toast genuinely: soal
    // spesifik dulu, baru toast generik ini -- hasil akhir yang terlihat
    // pengguna SELALU toast generik, soal yang harus ditap tidak pernah
    // tampil. Akibatnya Kuis Visual genuinely tidak bisa dimainkan (state
    // internal benar, tapi pengguna tidak tahu target mana yang harus diklik).
    if (mode !== 'kuisvisual') {
      showToast(mode === 'belajar' ? '📖 Mode Belajar — semua label terlihat' :
        '🔍 Mode Eksplorasi — tebak dulu sebelum lihat nama');
    }
  }

  // ═══════════ INISIALISASI ═══════════
  function initTabs() {
    var tabsWrap = $('sysTabs');
    tabsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.sys-tab');
      if (!btn) return;
      document.querySelectorAll('.sys-tab').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
      state.currentSystem = btn.dataset.sys;
      renderTerms(state.currentSystem);
      $('organLayer').style.opacity = (state.currentSystem === 'organ') ? '1' : '0';
    });
  }

  function initModeSwitcher() {
    var wrap = $('modeSwitcher');
    if (!wrap) return;
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.mode-btn');
      if (!btn) return;
      setMode(btn.dataset.mode);
    });
    // Set tombol aktif sesuai localStorage saat load
    var activeBtn = wrap.querySelector('[data-mode="' + state.mode + '"]');
    if (activeBtn) { wrap.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); }); activeBtn.classList.add('active'); }
    document.body.dataset.anatomyMode = state.mode;
  }

  function initSvgClick() {
    $('bodySvg').addEventListener('click', function (e) {
      var part = e.target.closest('.body-part');
      if (!part) return;
      var bodyId = part.dataset.id;
      var term = D.TERMS_FLAT.find(function (t) { return t.bodyId === bodyId && t.system === state.currentSystem; })
        || D.TERMS_FLAT.find(function (t) { return t.bodyId === bodyId; });
      if (term) {
        var card = document.querySelector('.term-card[data-body-id="' + bodyId + '"]');
        openInfoPanel(term);
        highlightBodyPart(bodyId, card);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  function openFromHash() {
    var hash = location.hash.replace('#', '');
    if (!hash) return;
    var term = D.getTermById(hash);
    if (term) {
      // Pastikan tab sistem yang benar aktif dulu
      var tabBtn = document.querySelector('.sys-tab[data-sys="' + term.system + '"]');
      if (tabBtn) tabBtn.click();
      setTimeout(function () { openInfoPanel(term); }, 100);
    }
  }

  function init() {
    initTabs();
    initModeSwitcher();
    setupZoomPanControls();
    initSvgClick();
    renderTerms('luar');
    updateProgressUI();
    openFromHash();
    document.addEventListener('anatomy-toast', function (e) { showToast(e.detail); });
  }

  global.NPAnatomyViewer = { init: init, openInfoPanel: openInfoPanel, state: state };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
