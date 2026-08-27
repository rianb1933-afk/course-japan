/* Nihongo Pro Academy — Tokyo Night Background Builder (tokyo-background.js)
   Membangun layer langit malam kota Tokyo: bintang berkelip (dimatikan
   otomatis bila reduce-motion aktif), cahaya neon ambient, dan siluet
   gedung dengan jendela menyala (posisi/tinggi acak tapi deterministik
   per sesi via seed sederhana). Idempoten & ringan. */
(function () {
  'use strict';
  if (document.getElementById('npTokyoBg')) return;

  function build() {
    var bg = document.createElement('div');
    bg.id = 'npTokyoBg';
    bg.setAttribute('aria-hidden', 'true');

    var html = '<div class="tokyo-glow"></div>';

    // Bintang: posisi acak di 2/3 atas layar, jumlah dibatasi demi performa
    var starCount = 26;
    for (var i = 0; i < starCount; i++) {
      var top = Math.random() * 62; // %
      var left = Math.random() * 100; // %
      var size = 1 + Math.random() * 2; // px
      var delay = (Math.random() * 3.4).toFixed(2);
      html += '<div class="tokyo-star" style="top:' + top.toFixed(1) + '%;left:' +
        left.toFixed(1) + '%;width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) +
        'px;animation-delay:' + delay + 's"></div>';
    }

    // Skyline: gedung dengan lebar & tinggi bervariasi, beberapa jendela menyala
    html += '<div class="tokyo-skyline">';
    var bldgCount = 14;
    for (var b = 0; b < bldgCount; b++) {
      var w = 5 + Math.random() * 6; // % lebar relatif (flex basis via vw approx)
      var h = 30 + Math.random() * 70; // % tinggi dari kontainer skyline
      var winHtml = '';
      var winRows = 3 + Math.floor(Math.random() * 4);
      var winCols = 2 + Math.floor(Math.random() * 3);
      for (var r = 0; r < winRows; r++) {
        for (var c = 0; c < winCols; c++) {
          if (Math.random() < 0.45) continue; // sebagian jendela gelap
          var neon = Math.random() < 0.15;
          var wx = 15 + c * (70 / winCols);
          var wy = 12 + r * (76 / winRows);
          winHtml += '<div class="win' + (neon ? ' neon' : '') + '" style="left:' +
            wx.toFixed(0) + '%;top:' + wy.toFixed(0) + '%"></div>';
        }
      }
      html += '<div class="tokyo-bldg" style="width:' + w.toFixed(1) + 'vw;height:' +
        h.toFixed(0) + '%">' + winHtml + '</div>';
    }
    html += '</div>';

    bg.innerHTML = html;
    document.body.appendChild(bg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
