/* Nihongo Pro Academy — Neko Café Background Builder (neko-cafe-background.js)
   Membangun layer kafe kucing: dinding, dua rak kayu berisi toples, tanaman
   gantung, cangkir kopi beruap, dan kucing tidur. Idempoten & ringan —
   hanya elemen div, tanpa gambar, tanpa dependensi.

   Jejak kaki dibuat di JS (bukan ditulis di HTML) supaya posisi, kecepatan,
   dan jedanya acak — kalau ditulis tetap, semuanya bergerak seragam dan
   langsung terlihat sebagai pola. Jumlahnya sengaja kecil (10) mengikuti
   anggaran partikel tema lain; latar dekoratif tidak pantas membebani. */
(function () {
  'use strict';
  if (document.getElementById('npNekoBg')) return;

  var PAWS = 10;

  function build() {
    var bg = document.createElement('div');
    bg.id = 'npNekoBg';
    bg.setAttribute('aria-hidden', 'true');

    var html =
      '<div class="neko-wall"></div>' +
      '<div class="neko-shelf s1"></div>' +
      '<div class="neko-shelf s2"></div>' +
      '<div class="neko-jar j1"></div>' +
      '<div class="neko-jar j2"></div>' +
      '<div class="neko-jar j3"></div>' +
      '<div class="neko-plant p1"><span class="vine v1"></span><span class="vine v2"></span>' +
        '<span class="vine v3"></span><span class="pot"></span></div>' +
      '<div class="neko-plant p2"><span class="vine v1"></span><span class="vine v2"></span>' +
        '<span class="vine v3"></span><span class="pot"></span></div>' +
      '<div class="neko-cup"></div>' +
      '<div class="neko-steam st1"></div><div class="neko-steam st2"></div><div class="neko-steam st3"></div>' +
      '<div class="neko-ear e1"></div><div class="neko-ear e2"></div>' +
      '<div class="neko-cat"></div>';

    // Jejak kaki: posisi & tempo acak supaya tidak terbaca sebagai pola.
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    for (var i = 0; i < PAWS; i++) {
      var left = Math.round(Math.random() * 96);
      var dur = (14 + Math.random() * 12).toFixed(1);
      var delay = (Math.random() * 14).toFixed(1);
      var scale = (0.6 + Math.random() * 0.6).toFixed(2);
      var style = 'left:' + left + '%;bottom:-20px;transform:scale(' + scale + ');';
      // Saat reduce-motion, CSS mematikan animasinya; sebarkan vertikal
      // supaya tetap jadi dekorasi diam, bukan tumpukan di satu garis.
      if (reduce) style = 'left:' + left + '%;bottom:' + Math.round(Math.random() * 80) + '%;transform:scale(' + scale + ');';
      else style += 'animation-duration:' + dur + 's;animation-delay:' + delay + 's;';
      html += '<div class="neko-paw" style="' + style + '"></div>';
    }

    bg.innerHTML = html;
    document.body.appendChild(bg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
