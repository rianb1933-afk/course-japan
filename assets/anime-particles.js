/* Light dust particles — canvas, 20 partikel, rAF, pause saat tab hidden,
   mati pada reduced-motion. Transform/alpha saja, target 60fps. */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.getElementById('npAnimeDust')) return;
  function build() {
    var cv = document.createElement('canvas');
    cv.id = 'npAnimeDust';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d'), W, Hh, ps = [], N = 20, run = true;
    function size() { W = cv.width = innerWidth; Hh = cv.height = innerHeight; }
    size(); addEventListener('resize', size);
    for (var i = 0; i < N; i++) ps.push({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      r: 1 + Math.random() * 3, a: .08 + Math.random() * .18,
      vx: .05 + Math.random() * .15, vy: -.02 - Math.random() * .08
    });
    function frame() {
      if (!run) return;
      ctx.clearRect(0, 0, W, Hh);
      for (var i = 0; i < N; i++) {
        var p = ps[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x > W + 5) p.x = -5;
        if (p.y < -5) p.y = Hh + 5;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = '#FFF3D0';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', function () {
      run = !document.hidden;
      if (run) requestAnimationFrame(frame);
    });
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
