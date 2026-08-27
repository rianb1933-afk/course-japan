/* Nihongo Pro Academy — Site Motion (site-motion.js)
   ───────────────────────────────────────────────────────────────────
   Animasi ringan universal untuk SEMUA halaman: elemen muncul dengan
   fade+slide halus saat discroll ke layar (scroll reveal), dan
   micro-interaction lembut (hover lift) pada kartu & tombol umum.

   Mandiri (self-contained): menyuntik <style> sendiri, jadi bekerja
   di semua halaman tanpa bergantung file CSS lain sudah dimuat atau
   tidak. Durasi 180-220ms sesuai standar animasi ringan.

   WAJIB aksesibilitas: menghormati prefers-reduced-motion — jika
   pengguna memilih "kurangi gerakan" di OS, script ini tidak
   melakukan apa pun (tidak ada observer, tidak ada style baru). */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) return;

  // ── Suntik CSS sendiri (transform/opacity saja → 60fps aman) ──
  var css = ''
    + '.np-reveal{opacity:0;transform:translateY(14px);transition:opacity .22s ease-out,transform .22s ease-out;will-change:opacity,transform}'
    + '.np-reveal.np-in{opacity:1;transform:translateY(0)}'
    + '.card,.panel,.btn,.hub-card,.stat-box,button{transition:transform .18s ease-out,box-shadow .18s ease-out}'
    + '.card:hover,.panel:hover,.hub-card:hover{transform:translateY(-2px)}'
    + '.btn:hover,button:hover{transform:translateY(-1px)}'
    + '.card:active,.panel:active,.btn:active,button:active{transform:translateY(0) scale(.99)}';
  var style = document.createElement('style');
  style.setAttribute('data-np-motion', '');
  style.textContent = css;
  document.head.appendChild(style);

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    // Target elemen umum yang aman dianimasikan saat scroll:
    // kartu/panel yang sudah ada, plus heading section utama.
    var targets = document.querySelectorAll(
      '.card, .panel, .hub-card, .stat-box, .empty-state, .error-state, main > section, main > article'
    );
    if (!targets.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('np-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    var count = 0;
    targets.forEach(function (el) {
      if (count >= 60) return; // batas wajar agar tak membebani halaman sangat panjang
      el.classList.add('np-reveal');
      io.observe(el);
      count++;
    });

    // Never leave content invisible if an embedded preview or browser delays
    // IntersectionObserver callbacks while the page is being restored.
    window.setTimeout(function () {
      targets.forEach(function (el) {
        if (el.classList.contains('np-reveal') && !el.classList.contains('np-in')) {
          el.classList.add('np-in');
        }
      });
    }, 1200);
  });
})();
