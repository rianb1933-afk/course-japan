/* Nihongo Pro Academy — Shared security utilities
   ───────────────────────────────────────────────────────────────────
   Satu tempat untuk helper keamanan yang dipakai lintas modul. Dibuat
   ADITIF: file lama yang punya htmlEscape/esc lokal TIDAK diubah (demi
   kompatibilitas), tapi kode baru sebaiknya memakai window.NPSecurity di
   sini agar tidak menduplikasi (DRY).

   Pemakaian:
     NPSecurity.escapeHtml(userText)        -> aman untuk innerHTML
     NPSecurity.escapeAttr(userText)        -> aman untuk atribut
     el.textContent = userText              -> paling aman (utamakan ini)
*/
(function (global) {
  'use strict';
  if (global.NPSecurity) return; // idempoten

  var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) { return MAP[ch]; });
  }

  // Untuk nilai yang masuk ke atribut (mis. data-*, title). Sama amannya,
  // tapi diberi nama berbeda agar niat kode jelas terbaca.
  function escapeAttr(value) {
    return escapeHtml(value);
  }

  // Helper aman untuk mengisi teks: selalu pakai textContent bila memungkinkan.
  function setText(el, value) {
    if (el) el.textContent = String(value == null ? '' : value);
    return el;
  }

  global.NPSecurity = {
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    setText: setText
  };
})(typeof window !== 'undefined' ? window : this);
