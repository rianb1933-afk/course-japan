/* Nihongo Pro Academy — Bushidō Background Builder (samurai-background.js)
   Membangun layer sumi-e: serat washi, matahari merah, mon emas, tiga lapis
   gunung, bambu di kedua tepi, dan dua pita kabut.

   Urutan elemen menentukan kedalaman (matahari & mon di belakang gunung,
   gunung berlapis dari terang ke gelap, bambu paling depan), jadi jangan
   diacak. Statis kecuali dua animasi lambat yang diatur CSS. Idempoten. */
(function () {
  'use strict';
  if (document.getElementById('npSamuraiBg')) return;

  function build() {
    var bg = document.createElement('div');
    bg.id = 'npSamuraiBg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML =
      '<div class="sam-paper"></div>' +
      '<div class="sam-sun"></div>' +
      '<div class="sam-mon"></div>' +
      '<div class="sam-mist f1"></div>' +
      '<div class="sam-mount m1"></div>' +
      '<div class="sam-mount m2"></div>' +
      '<div class="sam-mist f2"></div>' +
      '<div class="sam-mount m3"></div>' +
      '<div class="sam-bamboo b1"></div>' +
      '<div class="sam-bamboo b2"></div>' +
      '<div class="sam-bamboo b3"></div>' +
      '<div class="sam-bamboo b4"></div>';
    document.body.appendChild(bg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
