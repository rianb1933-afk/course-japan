/**
 * env.js — NihongoPro / Nihongo Pro Academy
 * Konfigurasi environment untuk production.
 *
 * CARA MENGISI:
 * 1. Netlify: Site settings → Environment variables → Add variable
 * 2. Vercel:  Project settings → Environment Variables
 * 3. Lokal:   Buat file .env dan isi (jangan di-commit ke git)
 *
 * File ini membaca dari window[key] yang di-inject oleh hosting,
 * atau dari localStorage sebagai fallback (untuk development lokal).
 */
(function () {
  const read = (key, fallback) => {
    if (fallback === undefined) fallback = "";
    try {
      return window[key] || localStorage.getItem(key) || fallback;
    } catch (_) {
      return window[key] || fallback;
    }
  };

  window.EDUMA_ENV = Object.assign(
    {
      // ── SITE ──────────────────────────────────────────────────────────────
      SITE_URL:            read("EDUMA_SITE_URL", "https://nihonggoproacademy.netlify.app"),

      // ── ANALYTICS ─────────────────────────────────────────────────────────
      GA_MEASUREMENT_ID:   read("EDUMA_GA_MEASUREMENT_ID", ""),
      GSC_VERIFICATION:    read("EDUMA_GSC_VERIFICATION", ""),

      // ── SUPABASE ──────────────────────────────────────────────────────────
      SUPABASE_URL:        read("EDUMA_SUPABASE_URL", ""),
      SUPABASE_ANON_KEY:   read("EDUMA_SUPABASE_ANON_KEY", ""),

      // ── AI (Anthropic / Claude) ───────────────────────────────────────────
      AI_API_ENDPOINT:     read("EDUMA_AI_API_ENDPOINT", "/api/ai-chat"),
      ANTHROPIC_API_KEY:   read("ANTHROPIC_API_KEY", ""),

      // ── EMAIL (EmailJS) ───────────────────────────────────────────────────
      EMAILJS_PUBLIC_KEY:  read("EDUMA_EMAILJS_PUBLIC_KEY", ""),
      EMAILJS_SERVICE_ID:  read("EDUMA_EMAILJS_SERVICE_ID", ""),
      EMAILJS_TEMPLATE_ID: read("EDUMA_EMAILJS_TEMPLATE_ID", ""),

      // ── WebRTC / PeerJS ───────────────────────────────────────────────────
      // Set PEERJS_HOST di Netlify env vars untuk self-hosted PeerServer.
      // Jika kosong, akan fallback ke 0.peerjs.com (public, tidak untuk produksi).
      PEERJS_HOST:         read("PEERJS_HOST", ""),
      PEERJS_PORT:         read("PEERJS_PORT", "443"),
      PEERJS_PATH:         read("PEERJS_PATH", "/"),
      // Set LIVEKIT_URL (wss://xxx.livekit.cloud) di Netlify env vars untuk
      // mengaktifkan Live Classroom via LiveKit SFU (skalabel), menggantikan
      // PeerJS mesh untuk kelas besar. Kosong = tetap pakai PeerJS mesh.
      LIVEKIT_URL:         read("LIVEKIT_URL", ""),

      // ── TURN Server (metered.ca free tier atau self-hosted) ───────────────
      // Daftar gratis di https://www.metered.ca/tools/openrelay/
      TURN_URL:            read("TURN_URL",         "turn:global.relay.metered.ca:80"),
      TURN_URL_TCP:        read("TURN_URL_TCP",     "turn:global.relay.metered.ca:80?transport=tcp"),
      TURN_URL_TLS:        read("TURN_URL_TLS",     "turns:global.relay.metered.ca:443?transport=tcp"),
      TURN_USERNAME:       read("TURN_USERNAME",     "nihongopro"),
      TURN_CREDENTIAL:     read("TURN_CREDENTIAL",   "kaigo2025"),

      // ── Payment (Midtrans) ────────────────────────────────────────────────
      // CLIENT_KEY boleh di frontend. SERVER_KEY TIDAK — hanya di Netlify function.
      // Daftar: https://dashboard.sandbox.midtrans.com (sandbox dulu)
      MIDTRANS_CLIENT_KEY:    read("MIDTRANS_CLIENT_KEY",    ""),
      MIDTRANS_IS_PRODUCTION: read("MIDTRANS_IS_PRODUCTION", "false"),

      // ── Live Classroom SFU (LiveKit) ──────────────────────────────────────
      // URL WebSocket boleh di frontend. API_SECRET TIDAK — hanya di function.
      // Deploy: https://cloud.livekit.io (gratis untuk mulai)
      LIVEKIT_URL:         read("LIVEKIT_URL", ""),
    },
    window.EDUMA_ENV || {}
  );
})();
