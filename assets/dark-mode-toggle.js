/* Nihonggo Pro Academy — Dark Mode Toggle (dark-mode-toggle.js)
   ───────────────────────────────────────────────────────────────────
   PENTING: proyek ini SUDAH memiliki CSS dark mode lengkap di 25+
   halaman & hampir semua file CSS utama (kyoto-design-system.css,
   kyoto-bundle.min.css, dashboard-v86.css, dll) memakai konvensi
   atribut  [data-theme="dark"]  pada <html>. CSS itu sudah ada sejak
   lama tapi TIDAK PERNAH tersambung ke toggle/switch apa pun — inilah
   file yang menyambungkannya, bukan sistem baru.

   Preferensi disimpan di localStorage('np-dark'):
     null/unset → ikuti preferensi sistem (prefers-color-scheme)
     'on'       → paksa data-theme="dark"
     'off'      → paksa hapus atribut (light)

   Dijalankan SINKRON di <head> (bukan defer) sebelum CSS dievaluasi
   agar tidak ada "flash" warna salah saat halaman dimuat (anti-FOUC).

   Sediakan window.NPDark = { get, set, toggle, isDarkActive }. */
(function () {
  'use strict';
  var KEY = 'np-dark';
  var root = document.documentElement;

  function get() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function systemPrefersDark() {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  }
  function apply(val) {
    var dark = (val === 'on') || (val == null && systemPrefersDark());
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }
  function set(val) {
    try {
      if (val === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, val);
    } catch (e) {}
    apply(val);
    document.dispatchEvent(new CustomEvent('np-dark-change', { detail: { value: val } }));
  }
  function isDarkActive() {
    return root.getAttribute('data-theme') === 'dark';
  }
  function toggle() {
    set(isDarkActive() ? 'off' : 'on');
  }

  apply(get());
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (get() == null) apply(null);
    });
  } catch (e) {}

  window.NPDark = { get: get, set: set, toggle: toggle, isDarkActive: isDarkActive };
})();
