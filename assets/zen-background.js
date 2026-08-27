/* Nihonggo Pro Academy — Zen Background Builder (zen-background.js)
   Membangun layer taman zen (pegunungan, pasir, batu, lumut, torii).
   Statis (tanpa animasi) sesuai suasana "ketenangan". Idempoten & ringan. */
(function () {
  'use strict';
  if (document.getElementById('npZenBg')) return;

  function build() {
    var bg = document.createElement('div');
    bg.id = 'npZenBg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML =
      '<div class="zen-mountain back"></div>' +
      '<div class="zen-mountain"></div>' +
      '<div class="zen-torii"><div class="leg l"></div><div class="leg r"></div>' +
        '<div class="bar top"></div><div class="bar mid"></div></div>' +
      '<div class="zen-sand"></div>' +
      '<div class="zen-moss m1"></div><div class="zen-moss m2"></div>' +
      '<div class="zen-stone s1"></div><div class="zen-stone s2"></div>' +
      '<div class="zen-stone s3"></div><div class="zen-stone s4"></div>';
    document.body.appendChild(bg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
