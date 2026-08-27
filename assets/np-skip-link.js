/* Nihongo Pro Academy — Skip-link (aksesibilitas keyboard, WCAG AA)
   ───────────────────────────────────────────────────────────────────
   Menyuntikkan "Lewati ke konten utama" di awal <body> dan menandai
   landmark tujuan bila belum ada, tanpa mengubah HTML halaman. Aman
   dimuat di halaman mana pun; idempoten (tak menduplikasi bila halaman
   sudah punya skip-link sendiri).

   WCAG 2.4.1 (Bypass Blocks): pengguna keyboard/screen-reader bisa
   melompati navbar langsung ke konten. */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    // 1. Jangan dobel: halaman yang sudah punya skip-link dilewati.
    if (document.querySelector('.skip-link, .skip-to-content, [data-skip-link]')) return;
    if (document.querySelector('a[href="#main"], a[href="#konten"], a[href="#content"]')) return;

    // 2. Tentukan target landmark. Prioritas: <main> / #main / #konten.
    var target = document.querySelector('main, #main, #konten, #content, [role="main"]');

    // 3. Bila tak ada, jadikan blok konten utama pertama setelah nav/header
    //    sebagai target — tanpa mengubah struktur, hanya menambah id + role.
    if (!target) {
      var candidates = document.body.children;
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        var tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'noscript') continue;
        // lewati navbar/header agar skip benar-benar melompati navigasi
        if (el.matches('nav, header, .kn-nav, [class*="navbar"], [class*="-nav"]')) continue;
        target = el;
        break;
      }
    }

    if (!target) return; // tak ada yang bisa jadi target — hentikan diam-diam

    // Pastikan target bisa difokus & dikenali screen reader
    if (!target.id) target.id = 'main';
    if (!target.hasAttribute('role')) target.setAttribute('role', 'main');
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    var targetId = target.id;

    // 4. Buat link & sisipkan sebagai anak pertama <body>.
    var link = document.createElement('a');
    link.href = '#' + targetId;
    link.className = 'skip-link np-skip-injected';
    link.textContent = 'Lewati ke konten utama';
    link.addEventListener('click', function () {
      // pastikan fokus benar-benar berpindah (beberapa browser butuh ini)
      setTimeout(function () { target.focus(); }, 0);
    });
    document.body.insertBefore(link, document.body.firstChild);

    // 5. Style minimal bila belum ada .skip-link di CSS halaman (inline, aman).
    if (!document.getElementById('np-skip-style')) {
      var s = document.createElement('style');
      s.id = 'np-skip-style';
      s.textContent =
        '.np-skip-injected{position:absolute;left:-999px;top:0;z-index:10000;' +
        'background:#A63A3A;color:#fff;padding:10px 18px;border-radius:0 0 8px 0;' +
        'font:600 14px/1.2 system-ui,sans-serif;text-decoration:none;}' +
        '.np-skip-injected:focus{left:0;outline:3px solid #C89B3C;outline-offset:2px;}';
      document.head.appendChild(s);
    }
  });
})();
