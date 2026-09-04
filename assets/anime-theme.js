/* Nihongo Pro Academy — Theme Manager (anime-theme.js)
   ───────────────────────────────────────────────────────────────────
   Mengelola tema situs via localStorage('np-decor-theme'):
     'default' → Kyoto (design system existing, tak tersentuh)
     'anime'   → Anime Classroom (memuat CSS/JS tema secara dinamis)
     'zen'     → Zen Temple (taman zen statis, memuat CSS/JS tema secara dinamis)
     'tokyo'   → Tokyo Night (langit malam kota, memuat CSS/JS tema secara dinamis)
     'neko' / 'modern' / 'samurai' → Neko Café, Nihon Modern, Bushidō

   Hanya file ini yang dimuat di semua halaman. Aset tema lain (mis.
   anime-theme.css, zen-theme.css, tokyo-theme.css, dan background
   builder JS masing-masing) HANYA dimuat bila tema itu aktif —
   pengguna tema default tidak membayar biaya apa pun. Idempoten. */
(function () {
  'use strict';
  /* Daftar tema dipindah ke atas karena migrasi kunci di bawah perlu tahu
     nama-nama yang sah sebelum apa pun dibaca. */
  var THEMES = ['anime', 'zen', 'tokyo', 'neko', 'modern', 'samurai'];

  /* KUNCI TERPISAH — jangan pakai 'np-theme' lagi.
     ────────────────────────────────────────────────────────────────
     Dulu berkas ini menyimpan nama tema dekoratif ke 'np-theme', kunci
     localStorage yang SAMA dipakai platform.js untuk mode terang/gelap:

         platform.js:382  baca  np-theme  -> harap 'light' | 'dark'
         platform.js:394  tulis np-theme  <- 'light' | 'dark'

     Keduanya saling menimpa. Menekan tombol mode gelap menghapus pilihan
     tema pengguna, dan sebaliknya memilih tema membuat platform.js membaca
     setelan mode sebagai 'light'. Terpapar di 243 halaman yang memuat
     platform.min.js tanpa dark-mode-toggle.js.

     platform.js sengaja TIDAK diubah: kuncinya juga menyimpan preferensi
     terang/gelap milik pengguna, dan menggesernya akan mereset preferensi
     itu. Yang dipindah adalah konsep yang lebih baru & lebih spesifik. */
  var KEY = 'np-decor-theme';
  var LEGACY_KEY = 'np-theme';

  function read(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  /* Migrasi sekali jalan. Tanpa ini, semua pengguna yang sudah memilih tema
     akan terlempar balik ke Kyoto begitu versi ini dirilis.
     Nilai lama HANYA dipindah bila ia benar-benar nama tema — kalau isinya
     'light'/'dark', itu milik platform.js dan tidak boleh disentuh. */
  (function migrate() {
    if (read(KEY)) return;                       // sudah pernah migrasi
    var old = read(LEGACY_KEY);
    if (!old || THEMES.indexOf(old) === -1) return;
    try {
      localStorage.setItem(KEY, old);
      /* Kunci lama dibersihkan supaya platform.js berhenti membaca nama tema
         sebagai mode. Ia akan jatuh ke default 'light', yang memang perilaku
         semula bagi pengguna yang belum pernah menyetel mode. */
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {}
  })();

  function get() {
    try { return localStorage.getItem(KEY) || 'default'; } catch (e) { return 'default'; }
  }
  function set(name) {
    try { localStorage.setItem(KEY, name); } catch (e) {}
    location.reload(); // apply bersih tanpa sisa state tema lama
  }

  function prefix() {
    // deteksi prefix asset dari tag script ini (root: assets/, subfolder: ../assets/)
    var s = document.currentScript || document.querySelector('script[src*="anime-theme.js"]');
    if (s && s.src) {
      var m = s.src.match(/^(.*\/)assets\/anime-theme\.js/);
      if (m) return m[1] + 'assets/';
    }
    return 'assets/';
  }

  /* Memuat versi .min: seluruh aset tema kini dibangun scripts/build-assets.mjs
     (aset tema turun ~74,6 KB -> ~37,5 KB). Tidak ada HTML yang merujuk berkas
     tema secara langsung, jadi peralihan ini tidak butuh codemod. */
  function loadCss(href) {
    if (document.querySelector('link[href$="' + href.split('/').pop() + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }
  function loadJs(src) {
    if (document.querySelector('script[src$="' + src.split('/').pop() + '"]')) return;
    var s = document.createElement('script');
    s.src = src; s.defer = true;
    document.head.appendChild(s);
  }

  // Kelas waktu-hari: morning 06-11, afternoon 11-17, sunset 17-19, night 19-05
  function todClass() {
    var h = new Date().getHours();
    if (h >= 6 && h < 11) return 'morning';
    if (h >= 11 && h < 17) return 'afternoon';
    if (h >= 17 && h < 19) return 'sunset';
    return 'night';
  }
  function applyTod() {
    document.documentElement.setAttribute('data-np-tod', todClass());
  }

  /* Tema dekoratif yang latarnya GELAP.
     ────────────────────────────────────────────────────────────────
     Situs ini punya DUA sistem yang selama ini tidak saling tahu:

       [data-theme="dark"]     → mode gelap; seluruh chrome situs punya
                                 varian untuk ini (mis. `[data-theme="dark"]
                                 .cat-btn` di grammar-module.css)
       [data-np-theme="..."]   → tema dekoratif; HANYA mengganti latar

     Akibatnya memilih tema gelap membuat halaman jadi gelap tapi chrome-nya
     tetap bergaya terang: tombol filter `.cat-btn` transparan berteks cokelat
     #6B4F3A duduk di atas latar indigo/hitam dan praktis tak terbaca.
     Dikonfirmasi lewat tangkapan layar: tema `tokyo` yang sudah lama ada pun
     mengalaminya, jadi ini cacat lama, bukan bawaan tema baru.

     Perbaikannya memakai ulang seluruh CSS mode gelap yang SUDAH ada dan sudah
     teruji, bukan menulis aturan kontras baru untuk 388 halaman. */
  var DARK_THEMES = { tokyo: 1, samurai: 1 };

  /* Menyalakan mode gelap SAAT ITU JUGA saja — sengaja TIDAK menulis ke
     localStorage. Preferensi terang/gelap milik pengguna tidak boleh
     diam-diam ditimpa; begitu ia kembali ke tema terang, pilihannya utuh.

     Perlu ditegaskan ulang beberapa kali karena platform.js `Theme.init()`
     berjalan di DOMContentLoaded dan membaca kunci localStorage YANG SAMA
     ('np-theme') — kunci itu dipakai berbarengan oleh dua sistem di atas.
     Karena isinya nama tema (mis. 'samurai') dan bukan 'dark', platform.js
     menyimpulkan "terang" lalu mengosongkan data-theme. Dibuktikan di
     Kaigo-Simulator.html: atribut berubah jadi "" sesudah load. Ada 236
     halaman yang memuat platform.min.js tanpa dark-mode-toggle.js.

     Penegasan ulang sengaja DIBATASI pada fase pemuatan (bukan
     MutationObserver permanen) supaya pengguna tetap bisa menekan tombol
     mode terang/gelap sesudahnya tanpa dipaksa balik. */
  function applyDarkPolarity(theme) {
    if (!DARK_THEMES[theme]) return;
    var set = function () {
      var el = document.documentElement;
      if (el.getAttribute('data-theme') !== 'dark') el.setAttribute('data-theme', 'dark');
    };
    set();
    document.addEventListener('DOMContentLoaded', function () { setTimeout(set, 0); });
    window.addEventListener('load', set);
  }

  function activate(theme) {
    var p = prefix();
    document.documentElement.setAttribute('data-np-theme', theme);
    if (document.body) document.body.setAttribute('data-np-theme', theme);
    applyDarkPolarity(theme);
    // Berlaku untuk SEMUA tema: menembuskan permukaan halaman yang opaque
    // (terutama .hero) supaya latar tema benar-benar terlihat. Lihat
    // theme-surface.css untuk alasan angka scrim-nya.
    loadCss(p + 'theme-surface.min.css');
    if (theme === 'anime') {
      applyTod();
      setInterval(applyTod, 60000); // cek tiap menit
      loadCss(p + 'anime-theme.min.css');
      loadCss(p + 'anime-animation.min.css');
      loadJs(p + 'anime-background.min.js');
      loadJs(p + 'anime-clock.min.js');
      loadJs(p + 'anime-particles.min.js');
    } else if (theme === 'zen') {
      loadCss(p + 'zen-theme.min.css');
      loadJs(p + 'zen-background.min.js');
    } else if (theme === 'tokyo') {
      loadCss(p + 'tokyo-theme.min.css');
      loadJs(p + 'tokyo-background.min.js');
    } else if (theme === 'neko') {
      // Berkasnya bernama neko-cafe-* , BUKAN neko-theme.css: nama itu sudah
      // dipakai lapisan palet dasar global yang dimuat di ~66 halaman.
      loadCss(p + 'neko-cafe-theme.min.css');
      loadJs(p + 'neko-cafe-background.min.js');
    } else if (theme === 'modern') {
      loadCss(p + 'modern-theme.min.css');
      loadJs(p + 'modern-background.min.js');
    } else if (theme === 'samurai') {
      loadCss(p + 'samurai-theme.min.css');
      loadJs(p + 'samurai-background.min.js');
    }
  }

  window.NPTheme = { get: get, set: set };

  var current = get();
  if (THEMES.indexOf(current) !== -1) {
    if (document.body) activate(current);
    else document.addEventListener('DOMContentLoaded', function () { activate(current); });
  }
})();
