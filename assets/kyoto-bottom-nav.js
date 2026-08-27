/* Nihongo Pro Academy — Bottom Navigation (mobile) 2026
   Self-inject: menambahkan bilah navigasi bawah khas aplikasi untuk layar
   kecil. Muncul hanya di mobile (dikontrol CSS @media). Tidak mengubah navbar
   atas yang sudah ada — ini pelengkap untuk akses cepat di satu tangan.
   Aman dimuat di halaman mana pun; idempoten (tidak menduplikasi). */
(function () {
  'use strict';

  // Jangan tampilkan di halaman admin / cetak / receipt.
  var path = (location.pathname || '').toLowerCase();
  if (/admin|payment-receipt|_review|offline\.html/.test(path)) return;

  // Item navigasi inti — lima tujuan tersering.
  var ITEMS = [
    { href: '/index.html', label: 'Beranda', icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
    { href: '/Materi/Materi.html', label: 'Materi', icon: 'M4 5h16v14H4zM8 5v14' },
    { href: '/Materi/Kaigo.html', label: '介護', icon: 'M12 3l8 4v6c0 4-3 7-8 8-5-1-8-4-8-8V7z', jp: true },
    { href: '/Dashboard/Dashboard.html', label: 'Progres', icon: 'M4 19V5m5 14V9m5 10V4m5 15v-7' },
    { href: '/Akun.html', label: 'Akun', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0' },
  ];

  function isActive(href) {
    var target = href.replace(/^\//, '').toLowerCase();
    var cur = path.replace(/^\//, '');
    if (target === 'index.html') return cur === '' || cur === 'index.html';
    // cocok bila nama file sama
    var t = target.split('/').pop();
    var c = cur.split('/').pop();
    return t === c;
  }

  function iconSvg(d, jp) {
    if (jp) {
      // untuk item Kaigo pakai teks 介 di dalam bentuk perisai sederhana
      return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        + '<path d="' + d + '" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
        + '<text x="12" y="15" text-anchor="middle" font-size="8" fill="currentColor" font-family="serif">介</text>'
        + '</svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
      + '<path d="' + d + '" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
  }

  function build() {
    if (document.getElementById('knBottomNav')) return; // idempoten
    var nav = document.createElement('nav');
    nav.id = 'knBottomNav';
    nav.className = 'kn-bottom-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Navigasi bawah');

    ITEMS.forEach(function (it) {
      var a = document.createElement('a');
      a.href = it.href;
      a.className = 'kn-bn-item' + (isActive(it.href) ? ' is-active' : '');
      a.setAttribute('aria-label', it.label);
      if (isActive(it.href)) a.setAttribute('aria-current', 'page');
      a.innerHTML = '<span class="kn-bn-ic">' + iconSvg(it.icon, it.jp) + '</span>'
        + '<span class="kn-bn-label">' + it.label + '</span>';
      nav.appendChild(a);
    });

    document.body.appendChild(nav);
    // beri ruang agar konten tidak tertutup bilah (hanya mobile via class)
    document.body.classList.add('has-bottom-nav');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
