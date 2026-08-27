/* Nihonggo Pro Academy — Theme Manager (anime-theme.js)
   ───────────────────────────────────────────────────────────────────
   Mengelola tema situs via localStorage('np-theme'):
     'default' → Kyoto (design system existing, tak tersentuh)
     'anime'   → Anime Classroom (memuat CSS/JS tema secara dinamis)

   Hanya file ini yang dimuat di semua halaman. Aset tema lain
   (anime-theme.css, anime-animation.css, anime-background.js,
   anime-clock.js, anime-particles.js) HANYA dimuat bila tema aktif —
   pengguna tema default tidak membayar biaya apa pun. Idempoten. */
(function () {
  'use strict';
  var KEY = 'np-theme';

  function get() {
    try { return localStorage.getItem(KEY) || 'default'; } catch (e) { return 'default'; }
  }
  function set(name) {
    try { localStorage.setItem(KEY, name); } catch (e) {}
    location.reload(); // apply bersih tanpa sisa state tema lama
  }

  function prefix() {
    // deteksi prefix asset dari tag script ini (root: assets/, subfolder: ../assets/)
    var s = document.currentScript || document.querySelector('script[src*="anime-theme.js"]');
    if (s && s.src) {
      var m = s.src.match(/^(.*\/)assets\/anime-theme\.js/);
      if (m) return m[1] + 'assets/';
    }
    return 'assets/';
  }

  function loadCss(href) {
    if (document.querySelector('link[href$="' + href.split('/').pop() + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }
  function loadJs(src) {
    if (document.querySelector('script[src$="' + src.split('/').pop() + '"]')) return;
    var s = document.createElement('script');
    s.src = src; s.defer = true;
    document.head.appendChild(s);
  }

  // Kelas waktu-hari: morning 06-11, afternoon 11-17, sunset 17-19, night 19-05
  function todClass() {
    var h = new Date().getHours();
    if (h >= 6 && h < 11) return 'morning';
    if (h >= 11 && h < 17) return 'afternoon';
    if (h >= 17 && h < 19) return 'sunset';
    return 'night';
  }
  function applyTod() {
    document.documentElement.setAttribute('data-np-tod', todClass());
  }

  function activate() {
    var p = prefix();
    document.documentElement.setAttribute('data-np-theme', 'anime');
    if (document.body) document.body.setAttribute('data-np-theme', 'anime');
    applyTod();
    setInterval(applyTod, 60000); // cek tiap menit
    loadCss(p + 'anime-theme.css');
    loadCss(p + 'anime-animation.css');
    loadJs(p + 'anime-background.js');
    loadJs(p + 'anime-clock.js');
    loadJs(p + 'anime-particles.js');
  }

  window.NPTheme = { get: get, set: set };

  if (get() === 'anime') {
    if (document.body) activate();
    else document.addEventListener('DOMContentLoaded', activate);
  }
})();
