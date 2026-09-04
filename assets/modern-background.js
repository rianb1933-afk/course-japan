/* Nihongo Pro Academy — Nihon Modern Background Builder (modern-background.js)
   Membangun layer arsitektur Jepang kontemporer: bidang beton, kisi shoji,
   lingkaran pucat, pita kayu, satu garis aksen merah, dan sapuan cahaya.

   Seluruhnya statis kecuali satu sapuan cahaya — tema ini justru bertumpu
   pada ruang kosong, jadi tidak ada partikel/elemen acak seperti tema lain.
   Idempoten & ringan. */
(function () {
  'use strict';
  if (document.getElementById('npModernBg')) return;

  function build() {
    var bg = document.createElement('div');
    bg.id = 'npModernBg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML =
      '<div class="mod-slab"></div>' +
      '<div class="mod-grid"></div>' +
      '<div class="mod-circle"></div>' +
      '<div class="mod-accent"></div>' +
      '<div class="mod-wood"></div>' +
      '<div class="mod-light"></div>';
    document.body.appendChild(bg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
