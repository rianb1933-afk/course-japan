(function(){
  const CJK_RE = /[\u3400-\u9fff]/u;
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
    'Trace kotak contoh yang opacity-nya tebal.',
    'Tulis ulang di kotak kosong tanpa melihat.',
    'Bandingkan proporsi, lalu ulangi 3 kali untuk memori otot.'
  ];
  function findKanji(text){
    const match = String(text || '').match(CJK_RE);
    return match ? match[0] : '';
  }
  function esc(value){
    return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  }
  function ensureModal(){
    if (document.getElementById('kanjiWritingModal')) return;
    const modal = document.createElement('div');
    modal.id = 'kanjiWritingModal';
    modal.className = 'kanji-writing-modal';
    modal.innerHTML = `
      <div class="kanji-writing-dialog" role="dialog" aria-modal="true" aria-labelledby="kanjiWritingTitle">
        <div class="kanji-writing-head">
          <div class="kanji-writing-title"><strong id="kanjiWritingChar">字</strong><span id="kanjiWritingTitle">Cara Menulis Kanji</span></div>
          <button class="kanji-writing-close" type="button" aria-label="Tutup">&times;</button>
        </div>
        <div class="kanji-writing-body">
          <div class="kanji-writing-preview">
            <div class="kanji-practice-grid"><span id="kanjiWritingPreview">字</span></div>
            <div class="kanji-writing-sheets" id="kanjiWritingSheets"></div>
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
              <p>Tulis kanji dengan mouse atau sentuhan. Gunakan grid besar di kiri sebagai panduan proporsi.</p>
              <canvas class="kanji-draw-pad" id="kanjiDrawPad" width="900" height="600"></canvas>
              <div class="kanji-writing-actions">
                <button class="primary" type="button" id="kanjiClearPad">Bersihkan Pad</button>
                <a id="kanjiStrokeLink" target="_blank" rel="noopener">Detail Stroke Order</a>
                <a id="kanjiJishoLink" target="_blank" rel="noopener">Kamus Kanji</a>
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
      if (event.key === 'Escape') closeModal();
    });
    setupCanvas();
  }
  function openModal(kanji){
    if (!kanji) return;
    ensureModal();
    document.getElementById('kanjiWritingChar').textContent = kanji;
    document.getElementById('kanjiWritingPreview').textContent = kanji;
    document.getElementById('kanjiWritingSheets').innerHTML = [0.75,0.55,0.35,0.18,0.08,0,0,0].map((opacity) => `<div class="kanji-writing-box"><span style="opacity:${opacity}">${opacity ? esc(kanji) : ''}</span></div>`).join('');
    document.getElementById('kanjiWritingRules').innerHTML = RULES.map(rule => `<li>${rule}</li>`).join('');
    document.getElementById('kanjiWritingSteps').innerHTML = STEPS.map(step => `<li>${step}</li>`).join('');
    document.getElementById('kanjiStrokeLink').href = `https://kanji.sljfaq.org/kanjivg.html?kanji=${encodeURIComponent(kanji)}`;
    document.getElementById('kanjiJishoLink').href = `https://jisho.org/search/${encodeURIComponent(kanji)}%20%23kanji`;
    clearCanvas();
    document.getElementById('kanjiWritingModal').classList.add('open');
  }
  function closeModal(){
    const modal = document.getElementById('kanjiWritingModal');
    if (modal) modal.classList.remove('open');
  }
  function setupCanvas(){
    const canvas = document.getElementById('kanjiDrawPad');
    const clear = document.getElementById('kanjiClearPad');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;
    function point(event){
      const rect = canvas.getBoundingClientRect();
      const source = event.touches ? event.touches[0] : event;
      return {
        x: (source.clientX - rect.left) * (canvas.width / rect.width),
        y: (source.clientY - rect.top) * (canvas.height / rect.height)
      };
    }
    function start(event){
      drawing = true;
      const p = point(event);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      event.preventDefault();
    }
    function move(event){
      if (!drawing) return;
      const p = point(event);
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#17181d';
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      event.preventDefault();
    }
    function end(){ drawing = false; }
    ['mousedown','touchstart'].forEach(name => canvas.addEventListener(name, start, { passive:false }));
    ['mousemove','touchmove'].forEach(name => canvas.addEventListener(name, move, { passive:false }));
    ['mouseup','mouseleave','touchend','touchcancel'].forEach(name => canvas.addEventListener(name, end));
    if (clear) clear.addEventListener('click', clearCanvas);
  }
  function clearCanvas(){
    const canvas = document.getElementById('kanjiDrawPad');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
  }
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
