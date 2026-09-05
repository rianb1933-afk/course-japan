(function(){
  'use strict';
  const CJK_RE = /[\u3400-\u9fff]/u;
  // Basis URL aset — dihitung dari lokasi skrip ini supaya jalan baik dari
  // halaman root maupun Materi/ (mis. ../assets/kanji-writing.js?v=5).
  const BASE = (document.currentScript && document.currentScript.src)
    ? document.currentScript.src.replace(/[^/]*$/, '')
    : 'assets/';

  const RULES = [
    'Tulis dari atas ke bawah.',
    'Tulis dari kiri ke kanan.',
    'Garis horizontal biasanya sebelum garis vertikal.',
    'Bagian luar kotak ditulis sebelum bagian dalam; penutup bawah terakhir.',
    'Gores tengah lebih dulu, lalu sisi kiri dan kanan.',
    'Titik kecil dan gores tambahan biasanya ditulis setelah struktur utama.',
    'Gores yang memotong bagian lain biasanya ditulis menjelang akhir.',
    'Jaga proporsi di kotak 田字格: pusat, atas, bawah, kiri, dan kanan harus seimbang.'
  ];
  const STEPS = [
    'Lihat bentuk utuh dan pusatkan kanji di kotak.',
    'Ikuti aturan dasar gores sambil menyebut arti/reading.',
    'Tonton animasi urutan gores, lalu tiru di panggung.',
    'Tiru goresan hantu di pad latihan tulis (bisa dimatikan).',
    'Tulis ulang di pad tanpa bantuan hantu.',
    'Bandingkan proporsi, lalu ulangi 3 kali untuk memori otot.'
  ];

  // ── Data goresan (KanjiVG) — dimuat on-demand ──────────────────────────
  let strokesData = null;
  let strokesLoaded = false;
  let strokesPromise = null;
  function loadStrokes(){
    if (strokesLoaded) return Promise.resolve(strokesData);
    if (strokesPromise) return strokesPromise;
    strokesPromise = new Promise((resolve) => {
      if (window.KANJI_STROKES) {
        strokesData = window.KANJI_STROKES;
        strokesLoaded = true;
        resolve(strokesData);
        return;
      }
      const script = document.createElement('script');
      script.src = BASE + 'kanji-strokes.js';
      script.onload = () => {
        strokesData = window.KANJI_STROKES || {};
        strokesLoaded = true;
        resolve(strokesData);
      };
      script.onerror = () => {
        strokesData = {};
        strokesLoaded = true;
        resolve(strokesData);
      };
      document.head.appendChild(script);
    });
    return strokesPromise;
  }

  // ── Pemutar goresan ─────────────────────────────────────────────────────
  const player = {
    data: null,      // { n, s } untuk kanji aktif
    idx: -1,         // gores terakhir yang selesai digambar
    playing: false,
    timer: null,
    speed: 1000,     // ms per gores (1x)
    animTimer: null,
    kanji: ''
  };
  function stopPlayback(){
    player.playing = false;
    if (player.timer) { clearInterval(player.timer); player.timer = null; }
    if (player.animTimer) { clearTimeout(player.animTimer); player.animTimer = null; }
    // gores yang setengah jalan diselesaikan (dipindah ke grup solid),
    // supaya tidak menghilang saat dijeda.
    finishCurrentStroke();
    const btn = document.getElementById('kanjiPlayPause');
    if (btn) btn.textContent = '▶';
  }
  function finishCurrentStroke(){
    const el = document.getElementById('kanjiStrokeCurrent');
    if (!el || !el.getAttribute('d')) return;
    const d = el.getAttribute('d');
    const done = document.getElementById('kanjiStrokeDone');
    if (done) {
      const clone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      clone.setAttribute('d', d);
      clone.setAttribute('class', 'kanji-stroke-done');
      done.appendChild(clone);
    }
    el.removeAttribute('d');
    el.style.strokeDasharray = '';
    el.style.strokeDashoffset = '';
  }
  function progressText(){
    const el = document.getElementById('kanjiStrokeProgress');
    if (!el || !player.data) return;
    el.textContent = player.idx < 0
      ? `Gores 0/${player.data.n}`
      : player.idx >= player.data.n
        ? `Selesai ✓ (${player.data.n} gores)`
        : `Gores ${player.idx + 1}/${player.data.n}`;
  }
  function strokePathElement(){
    const svg = document.getElementById('kanjiStrokeSvg');
    let el = document.getElementById('kanjiStrokeCurrent');
    if (!el) {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.id = 'kanjiStrokeCurrent';
      el.setAttribute('class', 'kanji-stroke-current');
      svg.appendChild(el);
    }
    return el;
  }
  function drawStrokeAnimated(i, onDone){
    const el = strokePathElement();
    const d = player.data.s[i];
    el.setAttribute('d', d);
    let len = 0;
    try { len = el.getTotalLength(); } catch (err) { len = 200; }
    el.style.transition = 'none';
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    // paksa reflow supaya transisi berikutnya benar-benar berjalan
    void el.getBoundingClientRect();
    el.style.transition = `stroke-dashoffset ${player.speed * 0.85}ms linear`;
    el.style.strokeDashoffset = '0';
    player.animTimer = setTimeout(() => {
      // gores selesai → pindah ke grup "sudah jadi" (solid),
      // kecuali sudah dipindah duluan oleh finishCurrentStroke().
      if (el.getAttribute('d') === d) {
        const done = document.getElementById('kanjiStrokeDone');
        if (done) {
          const clone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          clone.setAttribute('d', d);
          clone.setAttribute('class', 'kanji-stroke-done');
          done.appendChild(clone);
        }
        el.removeAttribute('d');
        el.style.strokeDasharray = '';
        el.style.strokeDashoffset = '';
      }
      if (onDone) onDone();
    }, player.speed * 0.85 + 30);
  }
  function stepForward(){
    stopPlayback();
    if (!player.data) return;
    if (player.idx >= player.data.n - 1) return;
    player.idx++;
    drawStrokeAnimated(player.idx, progressText);
    progressText();
  }
  function stepBack(){
    stopPlayback();
    if (!player.data) return;
    if (player.idx < 0) return;
    const done = document.getElementById('kanjiStrokeDone');
    if (done.lastChild) done.removeChild(done.lastChild);
    player.idx--;
    progressText();
  }
  function restart(){
    stopPlayback();
    const done = document.getElementById('kanjiStrokeDone');
    if (done) done.innerHTML = '';
    const cur = document.getElementById('kanjiStrokeCurrent');
    if (cur) { cur.removeAttribute('d'); cur.style.strokeDasharray = ''; cur.style.strokeDashoffset = ''; }
    player.idx = -1;
    progressText();
  }
  function togglePlay(){
    if (!player.data) return;
    if (player.playing) { stopPlayback(); return; }
    if (player.idx >= player.data.n - 1) restart();
    player.playing = true;
    const btn = document.getElementById('kanjiPlayPause');
    if (btn) btn.textContent = '⏸';
    player.timer = setInterval(() => {
      if (!player.playing) return;
      if (player.idx >= player.data.n - 1) { stopPlayback(); return; }
      player.idx++;
      drawStrokeAnimated(player.idx, progressText);
      progressText();
    }, player.speed);
    // gores pertama langsung digambar tanpa menunggu interval pertama
    if (player.idx < 0) {
      player.idx++;
      drawStrokeAnimated(player.idx, progressText);
      progressText();
    }
  }
  function renderStage(){
    const ghost = document.getElementById('kanjiStrokeGhost');
    const done = document.getElementById('kanjiStrokeDone');
    const status = document.getElementById('kanjiStrokeStatus');
    const controls = document.getElementById('kanjiStrokeControls');
    const badge = document.getElementById('kanjiStrokeBadge');
    restart();
    if (!ghost || !player.data) return;
    ghost.innerHTML = '';
    player.data.s.forEach((d, i) => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'kanji-stroke-ghost');
      ghost.appendChild(p);
    });
    // nomor gores dihitung dari bounding box (selalu pas di posisi gores)
    const svg = document.getElementById('kanjiStrokeSvg');
    const ns = 'http://www.w3.org/2000/svg';
    ghost.querySelectorAll('path').forEach((p, i) => {
      let box;
      try { box = p.getBBox(); } catch (err) { return; }
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', String(box.x + box.width / 2 + 1.5));
      t.setAttribute('y', String(box.y + box.height / 2 + 2.5));
      t.setAttribute('class', 'kanji-stroke-num');
      t.textContent = String(i + 1);
      ghost.appendChild(t);
    });
    if (status) status.hidden = true;
    if (controls) controls.hidden = false;
    if (badge) { badge.textContent = `${player.data.n} goresan`; badge.hidden = false; }
    progressText();
    void svg;
  }

  // ── Modal ───────────────────────────────────────────────────────────────
  function findKanji(text){
    const match = String(text || '').match(CJK_RE);
    return match ? match[0] : '';
  }
  function ensureModal(){
    if (document.getElementById('kanjiWritingModal')) return;
    const modal = document.createElement('div');
    modal.id = 'kanjiWritingModal';
    modal.className = 'kanji-writing-modal';
    modal.innerHTML = `
      <div class="kanji-writing-dialog" role="dialog" aria-modal="true" aria-labelledby="kanjiWritingTitle">
        <div class="kanji-writing-head">
          <div class="kanji-writing-title"><strong id="kanjiWritingChar">字</strong><span id="kanjiWritingTitle">Cara Menulis Kanji</span><span class="kanji-stroke-badge" id="kanjiStrokeBadge" hidden></span></div>
          <button class="kanji-writing-close" type="button" aria-label="Tutup">&times;</button>
        </div>
        <div class="kanji-writing-body">
          <div class="kanji-writing-preview">
            <div class="kanji-stage">
              <svg class="kanji-stage-svg" id="kanjiStrokeSvg" viewBox="0 0 109 109" role="img" aria-label="Animasi urutan goresan kanji">
                <g id="kanjiStrokeGhost"></g>
                <g id="kanjiStrokeDone"></g>
              </svg>
              <div class="kanji-stage-status" id="kanjiStrokeStatus">Memuat data goresan…</div>
              <div class="kanji-stage-controls" id="kanjiStrokeControls" hidden>
                <button class="kanji-ctl" id="kanjiStepBack" type="button" aria-label="Gores sebelumnya" title="Gores sebelumnya (←)">⏮</button>
                <button class="kanji-ctl kanji-ctl-play" id="kanjiPlayPause" type="button" aria-label="Putar / jeda" title="Putar / jeda (spasi)">▶</button>
                <button class="kanji-ctl" id="kanjiStepFwd" type="button" aria-label="Gores berikutnya" title="Gores berikutnya (→)">⏭</button>
                <button class="kanji-ctl" id="kanjiRestart" type="button" aria-label="Ulang dari awal" title="Ulang dari awal">↺</button>
                <span class="kanji-speed" role="group" aria-label="Kecepatan animasi">
                  <button class="kanji-speed-btn" data-speed="0.5" type="button">0,5×</button>
                  <button class="kanji-speed-btn active" data-speed="1" type="button">1×</button>
                  <button class="kanji-speed-btn" data-speed="2" type="button">2×</button>
                </span>
                <span class="kanji-stage-progress" id="kanjiStrokeProgress">Gores 0/0</span>
              </div>
            </div>
          </div>
          <div class="kanji-writing-preview">
            <div class="kanji-writing-meta">
              <div class="kanji-writing-panel">
                <h3>Urutan Gores Dasar</h3>
                <ol id="kanjiWritingRules"></ol>
              </div>
              <div class="kanji-writing-panel">
                <h3>Latihan Mandiri</h3>
                <ol id="kanjiWritingSteps"></ol>
              </div>
            </div>
            <div class="kanji-writing-panel">
              <h3>Pad Latihan Tulis</h3>
              <div class="kanji-pad-toolbar">
                <button class="kanji-ghost-toggle on" id="kanjiGhostToggle" type="button" aria-pressed="true">Hantu: Nyala</button>
                <button class="kanji-ghost-toggle" id="kanjiQuizBtn" type="button">🎯 Kuis Urutan Gores</button>
                <span class="kanji-pad-hint" id="kanjiPadHint">Tiru goresan hantu, lalu tulis bebas.</span>
              </div>
              <div class="kanji-quiz-status" id="kanjiQuizStatus" hidden></div>
              <canvas class="kanji-draw-pad" id="kanjiDrawPad" width="900" height="600"></canvas>
              <div class="kanji-writing-actions">
                <button class="primary" type="button" id="kanjiClearPad">Bersihkan Pad</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('.kanji-writing-close')) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (!modal.classList.contains('open')) return;
      if (event.key === 'Escape') { closeModal(); return; }
      if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.key === ' ') { event.preventDefault(); togglePlay(); }
      else if (event.key === 'ArrowRight') stepForward();
      else if (event.key === 'ArrowLeft') stepBack();
    });
    const wire = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };
    wire('kanjiPlayPause', togglePlay);
    wire('kanjiStepFwd', stepForward);
    wire('kanjiStepBack', stepBack);
    wire('kanjiRestart', restart);
    document.querySelectorAll('.kanji-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        player.speed = parseFloat(btn.dataset.speed) * 1000;
        document.querySelectorAll('.kanji-speed-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
    wire('kanjiGhostToggle', () => {
      ghostOn = !ghostOn;
      const btn = document.getElementById('kanjiGhostToggle');
      if (btn) {
        btn.textContent = ghostOn ? 'Hantu: Nyala' : 'Hantu: Mati';
        btn.classList.toggle('on', ghostOn);
        btn.setAttribute('aria-pressed', String(ghostOn));
      }
      redrawPad();
    });
    wire('kanjiQuizBtn', toggleQuiz);
    setupCanvas();
  }
  let ghostOn = true;

  // ── Kuis urutan goresan (tap gores berikutnya di pad) ────────────────
  let quizActive = false;
  let quizNext = 0;
  let quizMistakes = 0;
  let quizBoxes = [];
  const QUIZ_PAD = 7; // toleransi tap di sekitar gores (satuan viewBox 109)
  function tokenColor(name, fallback){
    const probe = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return probe ? probe : fallback;
  }
  function quizStatus(msg, wrong){
    const el = document.getElementById('kanjiQuizStatus');
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    el.classList.remove('wrong');
    if (wrong) {
      void el.offsetWidth; // restart animasi shake
      el.classList.add('wrong');
      setTimeout(() => el.classList.remove('wrong'), 400);
    }
  }
  function quizHint(text){
    const el = document.getElementById('kanjiPadHint');
    if (el) el.textContent = text;
  }
  function quizSetButton(active){
    const btn = document.getElementById('kanjiQuizBtn');
    if (!btn) return;
    btn.textContent = active ? '✕ Keluar Kuis' : '🎯 Kuis Urutan Gores';
    btn.classList.toggle('on', active);
    const ghost = document.getElementById('kanjiGhostToggle');
    if (ghost) ghost.disabled = active;
  }
  function quizBoxesFor(){
    // bbox tiap gores dari panggung SVG (viewBox 109×109) + toleransi tap
    const out = [];
    document.querySelectorAll('#kanjiStrokeGhost path').forEach(p => {
      try {
        const b = p.getBBox();
        out.push({ x: b.x - QUIZ_PAD, y: b.y - QUIZ_PAD, w: b.width + QUIZ_PAD * 2, h: b.height + QUIZ_PAD * 2 });
      } catch (err) { out.push(null); }
    });
    return out;
  }
  function quizRedraw(){
    if (!padCtx || !player.data) return;
    const scale = 600 / 109;
    padCtx.clearRect(0, 0, 900, 600);
    // garis panduan tengah
    padCtx.save();
    padCtx.strokeStyle = 'rgba(128,128,128,.18)';
    padCtx.lineWidth = 2;
    padCtx.setLineDash([12, 12]);
    padCtx.beginPath();
    padCtx.moveTo(450, 0); padCtx.lineTo(450, 600);
    padCtx.moveTo(0, 300); padCtx.lineTo(900, 300);
    padCtx.stroke();
    padCtx.restore();
    // target: goresan yang sudah benar solid, sisanya samar (warna buku mewarnai)
    const ink = tokenColor('--red', '#be3428');
    padCtx.save();
    padCtx.translate((900 - 600) / 2, 0);
    padCtx.scale(scale, scale);
    padCtx.lineCap = 'round';
    padCtx.lineJoin = 'round';
    try {
      player.data.s.forEach((d, i) => {
        padCtx.strokeStyle = i < quizNext ? ink : 'rgba(150,150,150,.55)';
        padCtx.lineWidth = i < quizNext ? 4.2 : 3;
        padCtx.stroke(new Path2D(d));
      });
    } catch (err) { /* Path2D tak didukung */ }
    padCtx.restore();
  }
  function quizTap(p){
    if (!player.data || !quizBoxes.length || quizNext >= player.data.n) return;
    const scale = 600 / 109;
    const vx = (p.x - (900 - 600) / 2) / scale;
    const vy = p.y / scale;
    const box = quizBoxes[quizNext];
    const hit = box && vx >= box.x && vx <= box.x + box.w && vy >= box.y && vy <= box.y + box.h;
    if (!hit) {
      quizMistakes++;
      quizStatus(`❌ Bukan goresan itu — coba lagi. Kesalahan: ${quizMistakes}`, true);
      return;
    }
    quizNext++;
    quizRedraw();
    if (quizNext >= player.data.n) {
      quizStatus(quizMistakes
        ? `🎉 Selesai! Kesalahan: ${quizMistakes}`
        : '🏆 Sempurna! Tanpa kesalahan');
      quizSetButton(false);
      quizHint('Kuis selesai — tulis ulang bebas di pad, atau klik kuis untuk mencoba lagi.');
    } else {
      quizStatus(`✅ Benar! Tap goresan ke-${quizNext + 1} dari ${player.data.n}.`);
    }
  }
  function startQuiz(){
    if (!player.data || !player.data.s || !player.data.s.length) {
      quizStatus('Data goresan belum tersedia untuk kanji ini.', true);
      return;
    }
    quizActive = true;
    quizNext = 0;
    quizMistakes = 0;
    quizBoxes = quizBoxesFor();
    quizSetButton(true);
    quizHint('Kuis aktif — tap goresan yang benar secara urut.');
    quizRedraw();
    quizStatus(`🎯 Tap goresan ke-1 dari ${player.data.n}.`);
  }
  function resetQuizUI(){
    quizActive = false;
    quizNext = 0;
    quizMistakes = 0;
    quizBoxes = [];
    quizSetButton(false);
    quizHint('Tiru goresan hantu, lalu tulis bebas.');
    const st = document.getElementById('kanjiQuizStatus');
    if (st) st.hidden = true;
  }
  function exitQuiz(){
    resetQuizUI();
    redrawPad();
  }
  function toggleQuiz(){
    if (!quizActive) { startQuiz(); return; }
    // selesai semua → tombol memulai kuis baru; tengah jalan → keluar kuis
    if (player.data && quizNext >= player.data.n) startQuiz();
    else exitQuiz();
  }
  function onClearPad(){
    if (quizActive) {
      // restart progres kuis (goresan salah tetap masuk hitungan)
      quizNext = 0;
      quizMistakes = 0;
      quizRedraw();
      quizStatus(`🎯 Tap goresan ke-1 dari ${player.data.n}.`);
      return;
    }
    clearCanvas();
  }

  function openModal(kanji){
    if (!kanji) return;
    ensureModal();
    resetQuizUI();
    document.getElementById('kanjiWritingChar').textContent = kanji;
    document.getElementById('kanjiWritingRules').innerHTML = RULES.map(rule => `<li>${rule}</li>`).join('');
    document.getElementById('kanjiWritingSteps').innerHTML = STEPS.map(step => `<li>${step}</li>`).join('');
    clearCanvas();
    document.getElementById('kanjiWritingModal').classList.add('open');
    // Sembunyikan widget melayang lain (Kamus/translator) selama modal terbuka
    document.body.classList.add('kanji-writing-open');

    // status awal panggung
    player.kanji = kanji;
    player.data = null;
    const status = document.getElementById('kanjiStrokeStatus');
    const controls = document.getElementById('kanjiStrokeControls');
    const badge = document.getElementById('kanjiStrokeBadge');
    const ghostEl = document.getElementById('kanjiStrokeGhost');
    if (ghostEl) ghostEl.innerHTML = '';
    if (status) status.hidden = false;
    if (controls) controls.hidden = true;
    if (badge) badge.hidden = true;

    const quizBtn = document.getElementById('kanjiQuizBtn');
    if (quizBtn) quizBtn.disabled = true;
    loadStrokes().then(data => {
      const entry = data[kanji];
      if (!entry || !entry.s || !entry.s.length) {
        if (status) {
          status.textContent = 'Data goresan belum tersedia untuk kanji ini — coba kanji lain.';
          status.hidden = false;
        }
        if (quizBtn) quizBtn.disabled = true;
        return;
      }
      if (quizBtn) quizBtn.disabled = false;
      player.data = { n: entry.n || entry.s.length, s: entry.s };
      renderStage();
      redrawPad();
    });
  }
  function closeModal(){
    stopPlayback();
    resetQuizUI();
    const modal = document.getElementById('kanjiWritingModal');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('kanji-writing-open');
  }

  // ── Pad latihan (canvas) ────────────────────────────────────────────────
  let padCtx = null;
  function setupCanvas(){
    const canvas = document.getElementById('kanjiDrawPad');
    const clear = document.getElementById('kanjiClearPad');
    if (!canvas) return;
    padCtx = canvas.getContext('2d');
    let drawing = false;
    function point(event){
      const rect = canvas.getBoundingClientRect();
      const source = event.touches ? event.touches[0] : event;
      return {
        x: (source.clientX - rect.left) * (canvas.width / rect.width),
        y: (source.clientY - rect.top) * (canvas.height / rect.height)
      };
    }
    function inkColor(){
      // ikut tema: baca token CSS kalau ada, fallback warna gelap
      const probe = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
      return (probe && probe.startsWith('#')) ? probe : '#17181d';
    }
    function start(event){
      const p = point(event);
      event.preventDefault();
      if (quizActive) { quizTap(p); return; }
      drawing = true;
      padCtx.beginPath();
      padCtx.moveTo(p.x, p.y);
    }
    function move(event){
      if (!drawing) return;
      const p = point(event);
      padCtx.lineWidth = 18;
      padCtx.lineCap = 'round';
      padCtx.lineJoin = 'round';
      padCtx.strokeStyle = inkColor();
      padCtx.lineTo(p.x, p.y);
      padCtx.stroke();
      event.preventDefault();
    }
    function end(){ drawing = false; }
    ['mousedown','touchstart'].forEach(name => canvas.addEventListener(name, start, { passive:false }));
    ['mousemove','touchmove'].forEach(name => canvas.addEventListener(name, move, { passive:false }));
    ['mouseup','mouseleave','touchend','touchcancel'].forEach(name => canvas.addEventListener(name, end));
    if (clear) clear.addEventListener('click', onClearPad);
  }
  function drawPadGhost(){
    if (!padCtx || !ghostOn || !player.data) return;
    const scale = 600 / 109;
    padCtx.save();
    padCtx.translate((900 - 600) / 2, 0);
    padCtx.scale(scale, scale);
    padCtx.strokeStyle = 'rgba(150,150,150,.5)';
    padCtx.lineWidth = 3;
    padCtx.lineCap = 'round';
    padCtx.lineJoin = 'round';
    try {
      for (const d of player.data.s) {
        padCtx.stroke(new Path2D(d));
      }
    } catch (err) { /* Path2D tak didukung — biarkan pad kosong */ }
    padCtx.restore();
  }
  function redrawPad(){
    clearCanvas();
  }
  function clearCanvas(){
    const canvas = document.getElementById('kanjiDrawPad');
    if (!canvas) return;
    const ctx = padCtx || canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.strokeStyle = 'rgba(232,83,74,.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12,12]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.restore();
    drawPadGhost();
  }

  // ── Pasang tombol "Cara Tulis" di kartu kanji ───────────────────────────
  function addButton(target, kanji){
    if (!target || !kanji || target.querySelector(':scope > .kanji-write-btn')) return;
    const button = document.createElement('button');
    button.className = 'kanji-write-btn';
    button.type = 'button';
    button.textContent = 'Cara Tulis';
    button.dataset.kanjiWrite = kanji;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openModal(button.dataset.kanjiWrite);
    });
    target.appendChild(button);
  }
  function eachMatch(root, selector, callback){
    if (root.nodeType === 1 && root.matches(selector)) callback(root);
    root.querySelectorAll(selector).forEach(callback);
  }
  function enhance(root = document){
    ensureModal();
    eachMatch(root, '.kanji-card', card => {
      const kanji = findKanji((card.querySelector('.char') || card).textContent);
      addButton(card, kanji);
    });
    eachMatch(root, '.qcard', card => {
      const kanji = findKanji((card.querySelector('.qchar') || card).textContent);
      addButton(card, kanji);
    });
    eachMatch(root, '.queue-item', item => {
      const kanji = findKanji((item.querySelector('b') || item).textContent);
      addButton(item, kanji);
    });
    eachMatch(root, '.face', face => {
      const kanji = findKanji((face.querySelector('.kanji, #frontWord, #backWord') || face).textContent);
      if (kanji) addButton(face, kanji);
    });
  }
  window.openKanjiWriting = openModal;
  document.addEventListener('DOMContentLoaded', () => {
    enhance();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) enhance(node);
        });
      }
      document.querySelectorAll('.face > .kanji-write-btn').forEach(button => {
        const face = button.closest('.face');
        const kanji = findKanji((face.querySelector('.kanji, #frontWord, #backWord') || face).textContent);
        if (kanji) button.dataset.kanjiWrite = kanji;
      });
    });
    observer.observe(document.body, { childList:true, subtree:true });
  });
})();