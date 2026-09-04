/* Nihongo Pro Academy — Tokyo Night Background Builder (tokyo-background.js)
   Membangun langit malam kota: bintang, bulan, cahaya cakrawala, kabut
   hanyut, siluet menara, papan neon, dan TIGA lapis gedung berjendela.

   Kenapa tiga lapis: versi lama cuma punya satu deret gedung memakai flex
   dengan lebar satuan vw, sehingga totalnya menembus lebar layar dan
   sebagian gedung terpotong. Di sini tiap gedung diposisikan absolut dengan
   left/width dalam PERSEN terhadap layar, jadi mustahil meluber, dan tiga
   lapis (jauh/tengah/dekat) memberi kedalaman yang dulu tidak ada.

   Idempoten & ringan: seluruhnya div, tanpa gambar, tanpa dependensi. */
(function () {
  'use strict';
  if (document.getElementById('npTokyoBg')) return;

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* Satu lapis gedung. `count` gedung dibagi rata sepanjang layar lalu
     digeser sedikit secara acak, supaya jaraknya tidak terlihat seperti
     penggaris tapi juga tidak pernah menumpuk atau menyisakan celah besar. */
  function layer(cls, count, minH, maxH, winChance) {
    var html = '<div class="tokyo-layer ' + cls + '">';
    var slot = 100 / count;
    for (var i = 0; i < count; i++) {
      var w = slot * rnd(0.62, 1.02);
      var left = i * slot + (slot - w) * rnd(0, 1);
      var h = rnd(minH, maxH);
      var cap = Math.random() < 0.35 ? ' cap' : '';

      var win = '';
      if (winChance > 0) {
        // kisi jendela mengikuti ukuran gedung, bukan angka tetap
        var cols = Math.max(1, Math.round(w * 1.5));
        var rows = Math.max(2, Math.round(h / 9));
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            if (Math.random() > winChance) continue;
            var cool = Math.random() < 0.22 ? ' cool' : '';
            var blink = (!reduce && Math.random() < 0.10) ? ' blink' : '';
            var wx = (100 / (cols + 1)) * (c + 1);
            var wy = 6 + r * ((88 - 6) / rows);
            win += '<i class="win' + cool + blink + '" style="left:' + wx.toFixed(1) +
                   '%;top:' + wy.toFixed(1) + '%"></i>';
          }
        }
      }
      html += '<div class="tokyo-bldg' + cap + '" style="left:' + left.toFixed(2) +
              '%;width:' + w.toFixed(2) + '%;height:' + h.toFixed(1) + '%">' + win + '</div>';
    }
    return html + '</div>';
  }

  function build() {
    var bg = document.createElement('div');
    bg.id = 'npTokyoBg';
    bg.setAttribute('aria-hidden', 'true');

    var html = '<div class="tokyo-glow"></div><div class="tokyo-moon"></div>';

    // Bintang di 2/3 atas; dijauhkan dari bulan supaya tidak menempel di halonya
    for (var i = 0; i < 34; i++) {
      var top = rnd(2, 58), left = rnd(0, 100);
      if (top < 16 && left > 88) continue;   // jangan menempel di halo bulan
      var s = rnd(1, 2.6);
      html += '<div class="tokyo-star" style="top:' + top.toFixed(1) + '%;left:' + left.toFixed(1) +
              '%;width:' + s.toFixed(1) + 'px;height:' + s.toFixed(1) + 'px;animation-delay:' +
              rnd(0, 3.4).toFixed(2) + 's"></div>';
    }

    html += '<div class="tokyo-haze h1"></div><div class="tokyo-haze h2"></div>';

    // Lapisan belakang → depan. Yang jauh tanpa jendela (terlalu kecil untuk terbaca).
    html += layer('l1', 16, 40, 95, 0);
    html += layer('l2', 11, 45, 100, 0.30);
    html += layer('l3', 8, 40, 92, 0.34);

    html += '<div class="tokyo-tower"></div>';

    // Papan neon menempel di sisi beberapa gedung dekat
    // Semua di pita sisi (< 19% atau > 81%), sebab kolom konten menutupi tengah.
    var neon = [
      { c: 'pink', left: 9,  bottom: 17, h: 84 },
      { c: 'cyan', left: 14, bottom: 24, h: 58 },
      { c: 'pink', left: 86, bottom: 15, h: 70 },
      { c: 'cyan', left: 92, bottom: 22, h: 46 }
    ];
    for (var n = 0; n < neon.length; n++) {
      var o = neon[n];
      html += '<div class="tokyo-neon ' + o.c + '" style="left:' + o.left + '%;bottom:' +
              o.bottom + 'vh;height:' + o.h + 'px"></div>';
    }

    bg.innerHTML = html;
    document.body.appendChild(bg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
