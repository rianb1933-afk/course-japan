/* Nihonggo Pro Academy — Anime Background Builder (anime-background.js)
   Membangun layer classroom (langit, matahari, jendela, tirai, meja),
   maskot AI Sensei (SVG placeholder) dengan greeting di Dashboard, dan
   IntersectionObserver untuk reveal kartu. Idempoten & ringan. */
(function () {
  'use strict';
  if (document.getElementById('npAnimeBg')) return;

  function build() {
    // ── Layer background ──
    var bg = document.createElement('div');
    bg.id = 'npAnimeBg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML =
      '<div class="an-sky"></div>' +
      '<div class="an-sun"></div>' +
      '<div class="an-window"></div>' +
      '<div class="an-curtain left"></div>' +
      '<div class="an-curtain right"></div>' +
      '<div class="an-desk"><div class="an-props">' +
      '<span title="Notebook">📓</span><span title="Pensil">✏️</span>' +
      '<span title="Buku JLPT">📖</span><span title="Laptop">💻</span>' +
      '<span title="Teh hijau">🍵</span></div></div>';
    document.body.appendChild(bg);

    // ── AI Sensei (SVG placeholder sederhana) ──
    var btn = document.createElement('button');
    btn.id = 'npSensei';
    btn.setAttribute('aria-label', 'AI Sensei — klik untuk sapaan');
    btn.innerHTML =
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="32" cy="26" r="16" fill="#FBF6EA" stroke="#8B5E3C" stroke-width="2"/>' +
      '<path d="M16 26a16 16 0 0 1 32 0c0-9-6-15-16-15S16 17 16 26z" fill="#4a3628"/>' +
      '<circle cx="26" cy="27" r="2.2" fill="#3a3a3a"/><circle cx="38" cy="27" r="2.2" fill="#3a3a3a"/>' +
      '<path d="M27 33q5 4 10 0" stroke="#3a3a3a" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      '<rect x="18" y="42" width="28" height="18" rx="8" fill="#2F5D50"/>' +
      '<rect x="28" y="46" width="8" height="6" rx="2" fill="#FBF6EA"/>' +
      '</svg>';
    var say = document.createElement('div');
    say.id = 'npSenseiSay';
    say.setAttribute('role', 'status');
    document.body.appendChild(btn);
    document.body.appendChild(say);

    function greeting() {
      var h = new Date().getHours();
      var salam = h < 11 ? 'おはようございます! Selamat pagi' :
                  h < 17 ? 'こんにちは! Selamat siang' :
                  h < 19 ? 'こんばんは! Selamat sore' : 'こんばんは! Selamat malam';
      var target = 'Target hari ini: 20 kosakata · 2 tata bahasa · review SRS.';
      try {
        // GENUINELY diperbaiki: sebelumnya membaca g.daily (field yang tidak
        // pernah ada -- dashboard-v86.js genuinely menulis target PER KATEGORI
        // seperti {vocabulary:20, kanji:10, grammar:2, ...}, bukan {daily:N}
        // menit). Kondisi lama selalu false, fitur personalisasi ini genuinely
        // tidak pernah berfungsi. Sekarang membaca vocabulary+kanji (dua
        // kategori paling representatif untuk sapaan harian).
        var g = JSON.parse(localStorage.getItem('np-goals-v1') || 'null');
        if (g && (g.vocabulary || g.kanji)) {
          var parts = [];
          if (g.vocabulary) parts.push(g.vocabulary + ' kosakata');
          if (g.kanji) parts.push(g.kanji + ' kanji');
          if (g.grammar) parts.push(g.grammar + ' tata bahasa');
          target = 'Target harian Anda: ' + parts.join(' · ') + '. 頑張って!';
        }
      } catch (e) {}
      return salam + ' 👋<br>' + target;
    }
    var timer = null;
    btn.addEventListener('click', function () {
      say.innerHTML = greeting();
      say.classList.toggle('show');
      clearTimeout(timer);
      if (say.classList.contains('show')) timer = setTimeout(function(){ say.classList.remove('show'); }, 8000);
    });
    // Auto-greet sekali di Dashboard
    if (/dashboard/i.test(location.pathname)) {
      setTimeout(function () {
        say.innerHTML = greeting();
        say.classList.add('show');
        timer = setTimeout(function(){ say.classList.remove('show'); }, 8000);
      }, 900);
    }

    // ── Reveal kartu via IntersectionObserver ──
    if ('IntersectionObserver' in window &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: .08 });
      document.querySelectorAll('.card, .panel').forEach(function (el, i) {
        if (i > 40) return; // batasi jumlah observed demi performa
        el.classList.add('an-reveal');
        io.observe(el);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
