/* Nihongo Pro Academy — Zen Background Builder (zen-background.js)
   Membangun taman zen: pegunungan berlapis, pasir bergaris rake, batu,
   lumut, gerbang torii, lentera batu, dan ranting maple.

   STATIS — tanpa animasi sama sekali, sesuai janji kartu temanya di
   Theme-Settings ("latar statis dan tenang"). Daun maple pun hanya
   ditempatkan, tidak jatuh.

   Urutan elemen menentukan kedalaman: gunung → pasir → lumut → batu →
   bangunan (torii/lentera) → ranting. Jangan diacak.
   Idempoten & ringan: seluruhnya div, tanpa gambar. */
(function () {
  'use strict';
  if (document.getElementById('npZenBg')) return;

  function build() {
    var bg = document.createElement('div');
    bg.id = 'npZenBg';
    bg.setAttribute('aria-hidden', 'true');

    var html =
      '<div class="zen-mountain back"></div>' +
      '<div class="zen-mountain front"></div>' +
      '<div class="zen-sand"></div>' +
      '<div class="zen-moss m1"></div><div class="zen-moss m2"></div>' +
      '<div class="zen-stone s1"></div><div class="zen-stone s2"></div>' +
      '<div class="zen-stone s3"></div><div class="zen-stone s4"></div>' +
      '<div class="zen-torii">' +
        '<div class="bar top"></div><div class="bar mid"></div>' +
        '<div class="leg l"></div><div class="leg r"></div>' +
      '</div>' +
      '<div class="zen-lantern">' +
        '<span class="base"></span><span class="post"></span>' +
        '<span class="body"></span><span class="roof"></span><span class="top"></span>' +
      '</div>' +
      '<div class="zen-branch"></div>';

    /* Beberapa helai daun di sekitar ranting. Ditulis di JS supaya posisinya
       bisa sedikit berbeda tiap muat — kalau ditetapkan di CSS, tiga daun di
       posisi identik langsung terbaca sebagai pola. Tetap tanpa animasi. */
    var leaves = [
      { top: 96,  right: 2.4 }, { top: 122, right: 5.6 },
      { top: 148, right: 3.0 }, { top: 74,  right: 6.2 }
    ];
    for (var i = 0; i < leaves.length; i++) {
      var l = leaves[i];
      var rot = Math.round(-40 + Math.random() * 80);
      html += '<div class="zen-leaf" style="top:' + (l.top + Math.round(Math.random() * 14)) +
              'px;right:' + l.right + '%;transform:rotate(' + rot + 'deg)"></div>';
    }

    bg.innerHTML = html;
    document.body.appendChild(bg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
