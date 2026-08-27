/* Anime wall clock — jam analog mengikuti waktu perangkat. Ringan (update 1s). */
(function () {
  'use strict';
  if (document.getElementById('npAnimeClock')) return;
  function build() {
    var c = document.createElement('div');
    c.id = 'npAnimeClock';
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', 'Jam dinding kelas');
    c.innerHTML = '<div class="hand h"></div><div class="hand m"></div><div class="hand s"></div><div class="pin"></div>';
    document.body.appendChild(c);
    var H = c.querySelector('.h'), M = c.querySelector('.m'), S = c.querySelector('.s');
    function tick() {
      var d = new Date();
      var s = d.getSeconds(), m = d.getMinutes(), h = d.getHours() % 12;
      S.style.transform = 'rotate(' + (s * 6) + 'deg)';
      M.style.transform = 'rotate(' + (m * 6 + s * .1) + 'deg)';
      H.style.transform = 'rotate(' + (h * 30 + m * .5) + 'deg)';
    }
    tick();
    setInterval(tick, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
