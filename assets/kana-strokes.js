/* Stroke order source: KanjiVG, CC BY-SA 3.0, https://kanjivg.tagaini.net/ */
(function () {
  'use strict';

  const SOURCE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';
  const cache = new Map();
  let timer = null;
  let current = null;

  function fileFor(character) {
    return character.codePointAt(0).toString(16).padStart(5, '0') + '.svg';
  }

  async function load(character) {
    if (cache.has(character)) return cache.get(character);
    const response = await fetch(SOURCE + fileFor(character));
    if (!response.ok) throw new Error('Stroke order tidak tersedia');
    const markup = await response.text();
    const documentNode = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const paths = Array.from(documentNode.querySelectorAll('path[d]'))
      .filter(path => path.getAttribute('id') && path.getAttribute('id').includes('-s'))
      .map(path => path.getAttribute('d'));
    if (!paths.length) throw new Error('Data stroke kosong');
    const data = { character, paths };
    cache.set(character, data);
    return data;
  }

  function svg() { return document.getElementById('kanaStrokeSvg'); }
  function status(text) {
    const element = document.getElementById('kanaStrokeStatus');
    if (element) element.textContent = text;
  }
  function pathElement(pathData, className) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    element.setAttribute('d', pathData);
    element.setAttribute('class', className);
    return element;
  }
  function clearStage() {
    const element = svg();
    if (element) element.innerHTML = '<g id="kanaStrokeGhost"></g><g id="kanaStrokeDone"></g><path id="kanaStrokeCurrent" class="kana-stroke-current"></path>';
  }
  function renderGhost(paths) {
    clearStage();
    const ghost = document.getElementById('kanaStrokeGhost');
    paths.forEach(pathData => ghost.appendChild(pathElement(pathData, 'kana-stroke-ghost')));
    status('Gores 0/' + paths.length);
  }
  function finishCurrent() {
    const currentPath = document.getElementById('kanaStrokeCurrent');
    const done = document.getElementById('kanaStrokeDone');
    if (!currentPath || !done || !currentPath.getAttribute('d')) return;
    done.appendChild(pathElement(currentPath.getAttribute('d'), 'kana-stroke-done'));
    currentPath.removeAttribute('d');
    currentPath.style.strokeDasharray = '';
    currentPath.style.strokeDashoffset = '';
  }
  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (current) current.playing = false;
    finishCurrent();
  }
  function draw(index) {
    if (!current || index >= current.paths.length) return;
    const currentPath = document.getElementById('kanaStrokeCurrent');
    const pathData = current.paths[index];
    currentPath.setAttribute('d', pathData);
    let length = 250;
    try { length = currentPath.getTotalLength(); } catch (_) {}
    currentPath.style.transition = 'none';
    currentPath.style.strokeDasharray = String(length);
    currentPath.style.strokeDashoffset = String(length);
    void currentPath.getBoundingClientRect();
    currentPath.style.transition = 'stroke-dashoffset 700ms linear';
    currentPath.style.strokeDashoffset = '0';
    current.index = index;
    status('Gores ' + (index + 1) + '/' + current.paths.length);
    timer = setTimeout(() => {
      finishCurrent();
      if (current && current.playing) draw(index + 1);
    }, 740);
  }
  async function select(character) {
    stop();
    current = { character, paths: [], index: -1, playing: false };
    status('Memuat urutan gores...');
    try {
      const data = await load(character[0]);
      current.paths = data.paths;
      renderGhost(data.paths);
      const note = document.getElementById('kanaStrokeNote');
      if (note) note.textContent = character.length > 1
        ? 'Animasi menampilkan kana pertama dari gabungan ini. Pelajari setiap kana dasar secara terpisah untuk urutan lengkap.'
        : 'Urutan gores berdasarkan data KanjiVG.';
    } catch (_) {
      clearStage();
      status('Animasi belum tersedia untuk karakter ini.');
      const note = document.getElementById('kanaStrokeNote');
      if (note) note.textContent = 'Gunakan petunjuk teks di atas sebagai panduan penulisan.';
    }
  }
  function next() {
    if (!current || !current.paths.length) return;
    stop();
    if (current.index + 1 < current.paths.length) draw(current.index + 1);
  }
  function restart() {
    stop();
    if (!current) return;
    current.index = -1;
    renderGhost(current.paths);
  }
  function play() {
    if (!current || !current.paths.length) return;
    if (current.index >= current.paths.length - 1) restart();
    current.playing = true;
    draw(current.index + 1);
  }

  window.KanaStrokePlayer = { select, next, restart, play, stop };
})();
