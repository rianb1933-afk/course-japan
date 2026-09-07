/**
 * anatomy-material.js — Nihongo Pro Academy
 * ==========================================
 * Render "Materi Lengkap" di Anatomi-Dasar.html: SELURUH istilah anatomi
 * (dari NPAnatomyData — satu sumber kebenaran, tanpa duplikasi data) dengan
 * SEMUA field-nya (lokasi, fungsi, catatan Kaigo, contoh kalimat Jepang),
 * dikelompokkan per 9 sistem tubuh + paragraf pengantar per sistem.
 *
 * Prinsip yang sama dengan anatomy-viewer.js: TIDAK ADA innerHTML untuk data
 * — semuanya dibangun via createElement/textContent. Audio memakai Web Speech
 * API lokal (tidak bergantung pada viewer), dan tiap entri punya tombol
 * "Buka di diagram" yang memanggil NPAnatomyViewer.openInfoPanel bila viewer
 * tersedia, sehingga materi lengkap dan diagram interaktif saling terhubung.
 */
(function (global) {
  'use strict';

  var D = global.NPAnatomyData;
  if (!D) return; // anatomy-data.js wajib dimuat lebih dulu

  // Pengantar per sistem (urutan mengikuti tab di halaman).
  var SYSTEM_INTRO = {
    luar: 'Fondasi komunikasi Kaigo: nama bagian tubuh luar yang dipakai setiap hari — saat membantu mandi, membalikkan posisi tidur, atau menunjukkan lokasi nyeri. Kuasai dulu 20 istilah ini sebelum lanjut ke sistem lain.',
    indera: 'Lima indera dan organ pendukungnya. Lansia sering mengalami penurunan indera (presbiakusis, presbiopia), jadi Kaigo wajib paham istilahnya untuk menyesuaikan cara komunikasi dan lingkungan perawatan.',
    rangka: '206 tulang menyusun rangka manusia. Kaigo perlu familiar dengan nama tulang utama — terutama femur dan panggul — karena patah tulang lansia adalah risiko terbesar saat transfer dan jatuh.',
    organ: 'Organ dalam yang menopang kehidupan. Memahami letak dan fungsi organ membantu Kaigo memahami penyakit lansia (hepatitis, kolesistitis, gastritis) dan keluhan yang menyertainya.',
    sirkulasi: 'Jantung, pembuluh darah, dan saraf — dua sistem yang menentukan kondisi vital. Darah tinggi, aritmia, dan stroke adalah penyakit lansia paling umum di fasilitas Kaigo.',
    otot: 'Otot dan kulit: penopang gerak dan pelindung tubuh. Sarkopenia (penuaan otot) dan luka tekan (床ずれ) adalah dua tantangan harian perawatan lansia yang berakar di sistem ini.',
    gerakan: 'Sendi dan gerakan dasar tubuh. Kata kerja gerak (angkat, duduk, berjalan) adalah kosakata inti dalam prosedur transfer — gabungan istilah sendi + gerakan = instruksi perawatan yang benar.',
    byoumei: 'Nama penyakit per organ: gabungan nama organ + sufiks penyakit (炎 = radang, 症 = kondisi). Pola ini membuat ratusan nama penyakit Jepang mudah diurai selama nama organnya hafal.',
    menekiei: 'Sistem kekebalan tubuh dan pertahanannya. Imunosenesensi (menurunnya imun lansia) membuat pencegahan infeksi menjadi rutinitas wajib di fasilitas perawatan.'
  };

  var SYSTEM_ORDER = ['luar', 'indera', 'rangka', 'organ', 'sirkulasi', 'otot', 'gerakan', 'byoumei', 'menekiei'];

  // ── Simpan ke Flashcard: hero stat + tampilan "hanya tersimpan" ──
  // Hero stat (#statFlashcard) menghitung isi np-anatomy-flashcards lewat
  // NPAnatomyViewer.readFlashcards(); tampilan tersimpan (#materiTersimpan)
  // merender ulang entri penuh untuk id-id itu saja, memakai renderTermEntry
  // yang sama — satu sumber tampilan, tanpa duplikasi markup.
  function readSavedIds() {
    try { return (global.NPAnatomyViewer && typeof global.NPAnatomyViewer.readFlashcards === 'function') ? (global.NPAnatomyViewer.readFlashcards() || []) : []; }
    catch (e) { return []; }
  }

  function updateHeroStat() {
    var stat = document.getElementById('statFlashcard');
    if (!stat) return;
    var b = stat.querySelector('b');
    if (b) b.textContent = String(readSavedIds().length);
  }

  function toggleSavedView() {
    var wrap = document.getElementById('materiTersimpan');
    if (!wrap) return;
    var open = wrap.classList.toggle('open');
    wrap.setAttribute('aria-hidden', String(!open));
    if (open) {
      renderSavedView();
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderSavedView() {
    var wrap = document.getElementById('materiTersimpan');
    if (!wrap) return;
    var list = wrap.querySelector('.mts-list');
    if (!list) return;
    var saved = readSavedIds();
    list.textContent = '';
    list.appendChild(el('p', 'mts-count', saved.length + ' istilah tersimpan di flashcard anatomi.'));
    if (!saved.length) {
      list.appendChild(el('p', 'mts-empty', 'Belum ada istilah tersimpan. Klik "💾 Simpan ke Flashcard" pada istilah mana pun di bawah untuk mulai mengumpulkan.'));
      return;
    }
    var byId = {};
    SYSTEM_ORDER.forEach(function (key) {
      var sys = D.SYSTEMS[key];
      if (!sys) return;
      sys.terms.forEach(function (t) { byId[t.id] = t; });
    });
    saved.forEach(function (id) {
      var t = byId[id];
      if (t) renderTermEntry(list, t); // entri penuh: audio, diagram, simpan/hapus state
    });
  }

  // Tombol hapus hanya ada di tampilan tersimpan: removeFromFlashcards di
  // viewer melengkapi API, dan entri di daftar utama tetap sinkron karena
  // keduanya membaca storage yang sama setiap render.
  function appendRemoveButton(entry, t) {
    var actions = entry.querySelector('.mat-actions');
    if (!actions) return;
    var rm = el('button', 'mat-btn mat-save');
    rm.type = 'button';
    rm.textContent = '🗑️ Hapus';
    rm.setAttribute('aria-label', 'Hapus ' + t.japanese + ' dari flashcard');
    rm.addEventListener('click', function () {
      var ok = false;
      try { ok = global.NPAnatomyViewer.removeFromFlashcards(t.id); } catch (e) { ok = false; }
      if (ok) {
        toast('🗑️ Dihapus: ' + t.japanese);
        renderSavedView();
        updateHeroStat();
        render(); // sinkronkan tombol di daftar utama
      }
    });
    actions.appendChild(rm);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function speak(text) {
    try {
      if (!global.speechSynthesis) return;
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.85;
      global.speechSynthesis.speak(u);
    } catch (e) { /* audio opsional */ }
  }

  // Toast ringan milik modul materi (sama pola dengan anatomy-toast viewer):
  // dipancarkan sebagai event agar tak bergantung pada internal viewer; viewer
  // memasang listener 'anatomy-toast' di init() dan menampilkannya di elemen toast-nya.
  function toast(msg) {
    try { document.dispatchEvent(new CustomEvent('anatomy-toast', { detail: msg })); }
    catch (e) { /* toast opsional */ }
  }

  function renderTermEntry(sysBlock, t) {
    var entry = el('article', 'mat-entry');
    entry.id = 'mat-' + t.id;

    // Kepala entri: kanji besar + bacaan + romaji + makna + aksi
    var head = el('div', 'mat-entry-head');
    var jp = el('div', 'mat-jp');
    jp.appendChild(el('div', 'mat-kanji', t.japanese));
    jp.appendChild(el('div', 'mat-furi', t.furigana + ' · ' + t.romaji));
    head.appendChild(jp);

    var actions = el('div', 'mat-actions');
    var audio = el('button', 'mat-btn', '🔊');
    audio.type = 'button';
    audio.setAttribute('aria-label', 'Dengar pelafalan ' + t.japanese);
    audio.addEventListener('click', function () { speak(t.audioText || t.japanese); });
    actions.appendChild(audio);

    // Simpan ke Flashcard — menulis storage np-anatomy-flashcards yang PERSIS
    // sama dengan tombol simpan di panel diagram (NPAnatomyViewer.addToFlashcards).
    // ID dipakai sebagai kunci sehingga satu istilah tak bisa tersimpan dobel;
    // tombol berubah '✓ Tersimpan' permanen (state di-recheck tiap render).
    if (global.NPAnatomyViewer && typeof global.NPAnatomyViewer.addToFlashcards === 'function') {
      var save = el('button', 'mat-btn mat-save');
      save.type = 'button';
      var savedIds = null;
      try { savedIds = global.NPAnatomyViewer.readFlashcards(); } catch (e) { savedIds = null; }
      if (savedIds && savedIds.indexOf(t.id) !== -1) { save.textContent = '✓ Tersimpan'; save.classList.add('saved'); save.disabled = true; }
      else {
        save.textContent = '💾 Simpan ke Flashcard';
        save.addEventListener('click', function () {
          var res = 'error';
          try { res = global.NPAnatomyViewer.addToFlashcards(t.id); } catch (e) { res = 'error'; }
          if (res === 'added' || res === 'exists') {
            save.textContent = '✓ Tersimpan';
            save.classList.add('saved');
            save.disabled = true;
            toast(res === 'added' ? '💾 Disimpan: ' + t.japanese : 'Sudah tersimpan sebelumnya.');
            updateHeroStat();
            var sv = document.getElementById('materiTersimpan');
            if (sv && sv.classList.contains('open')) renderSavedView();
          } else {
            toast('Gagal menyimpan.');
          }
        });
      }
      actions.appendChild(save);
    }

    if (global.NPAnatomyViewer && typeof global.NPAnatomyViewer.openInfoPanel === 'function') {
      var open = el('button', 'mat-btn', '🗂️ Diagram');
      open.type = 'button';
      open.setAttribute('aria-label', 'Buka ' + t.japanese + ' di diagram interaktif');
      open.addEventListener('click', function () {
        try { global.NPAnatomyViewer.openInfoPanel(t); } catch (e) { /* viewer offline */ }
      });
      actions.appendChild(open);
    }
    head.appendChild(actions);
    entry.appendChild(head);

    entry.appendChild(el('div', 'mat-meaning', t.indonesian + ' — ' + t.english));

    // Detail lengkap: lokasi, fungsi, catatan Kaigo, contoh
    var dl = el('div', 'mat-detail');
    [['📍 Lokasi', t.location], ['⚙️ Fungsi', t['function']], ['🧑‍⚕️ Catatan Kaigo', t.kaigoNote]]
      .forEach(function (row) {
        if (!row[1]) return;
        var r = el('div', 'mat-row');
        r.appendChild(el('span', 'mat-row-label', row[0]));
        r.appendChild(el('span', 'mat-row-val', row[1]));
        dl.appendChild(r);
      });
    if (t.kaigoExample) {
      var ex = el('div', 'mat-example');
      // Contoh: baris Jepang + baris terjemahan dalam tanda kurung
      String(t.kaigoExample).split('\n').forEach(function (line) {
        if (!line.trim()) return;
        ex.appendChild(el('div', line.trim().charAt(0) === '(' ? 'mat-ex-id' : 'mat-ex-jp', line.trim()));
      });
      dl.appendChild(ex);
    }
    if (t.aliases && t.aliases.length) {
      dl.appendChild(el('div', 'mat-alias', 'Istilah terkait: ' + t.aliases.join(' · ')));
    }
    entry.appendChild(dl);
    sysBlock.appendChild(entry);
    if (sysBlock.dataset && sysBlock.dataset.savedView === '1') appendRemoveButton(entry, t);
    return entry;
  }

  function render() {
    var root = document.getElementById('materiLengkap');
    if (!root) return;
    root.innerHTML = ''; // bangun ulang dari nol

    // Daftar isi: chip per sistem dengan jumlah istilah
    var toc = el('nav', 'mat-toc');
    toc.setAttribute('aria-label', 'Daftar isi materi lengkap');
    SYSTEM_ORDER.forEach(function (key) {
      var sys = D.SYSTEMS[key];
      if (!sys) return;
      var a = el('a', 'mat-toc-chip', sys.label.split(' (')[0] + ' · ' + sys.terms.length);
      a.href = '#materi-' + key;
      toc.appendChild(a);
    });
    root.appendChild(toc);

    SYSTEM_ORDER.forEach(function (key) {
      var sys = D.SYSTEMS[key];
      if (!sys) return;

      var block = el('section', 'mat-system');
      block.id = 'materi-' + key;
      var head = el('div', 'mat-sys-head');
      head.appendChild(el('h3', 'mat-sys-title', sys.label));
      head.appendChild(el('span', 'mat-sys-count', sys.terms.length + ' istilah'));
      block.appendChild(head);
      block.appendChild(el('p', 'mat-sys-intro', SYSTEM_INTRO[key] || ''));

      sys.terms.forEach(function (t) { renderTermEntry(block, t); });
      root.appendChild(block);
    });
  }

  function initExtras() {
    updateHeroStat();
    var btn = document.getElementById('btnLihatTersimpan');
    if (btn) btn.addEventListener('click', toggleSavedView);
    var close = document.getElementById('btnTutupTersimpan');
    if (close) close.addEventListener('click', function () {
      var wrap = document.getElementById('materiTersimpan');
      if (wrap) { wrap.classList.remove('open'); wrap.setAttribute('aria-hidden', 'true'); }
    });
  }

  global.NPAnatomyMaterial = {
    render: render,
    updateHeroStat: updateHeroStat,
    toggleSavedView: toggleSavedView,
    renderSavedView: renderSavedView,
    renderTermEntry: renderTermEntry
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { render(); initExtras(); });
  } else {
    render(); initExtras();
  }
})(window);
