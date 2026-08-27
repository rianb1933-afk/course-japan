// ── LIVE ERRORS — Error handling + UI display ──────────────────────────────
"use strict";

const LiveErrors = {
  _container: null,
  _active: {},

  init() {
    if (this._container) return;
    const el = document.createElement('div');
    el.id = 'liveErrorContainer';
    el.style.cssText = [
      'position:fixed','top:70px','left:50%','transform:translateX(-50%)',
      'width:min(90vw,480px)','z-index:9999','display:flex',
      'flex-direction:column','gap:8px','pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
    this._container = el;
  },

  show(code, opts = {}) {
    this.init();
    const def = LiveErrors.CODES[code] || LiveErrors.CODES.UNKNOWN;
    const id  = 'err-' + code + '-' + Date.now();

    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = [
      'background:' + (opts.bg || def.bg || '#fff'),
      'border:2px solid ' + (opts.border || def.border || '#e2e8f0'),
      'border-radius:14px','padding:14px 16px',
      'box-shadow:0 8px 32px rgba(0,0,0,.18)',
      'display:flex','gap:12px','align-items:flex-start',
      'pointer-events:all',
      'animation:errSlideIn .3s cubic-bezier(.34,1.56,.64,1)',
    ].join(';');

    const action = opts.action || def.action;
    const actionHtml = action
      ? `<button onclick="${action.fn}" style="font-size:11px;padding:4px 12px;border:none;background:${action.color||'#2563eb'};color:#fff;border-radius:8px;cursor:pointer;margin-top:6px;font-weight:700">${action.label}</button>`
      : '';

    el.innerHTML = `
      <div style="font-size:28px;flex-shrink:0">${def.icon}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:3px">${def.title}</div>
        <div style="font-size:12px;color:#475569;line-height:1.5">${opts.detail || def.detail}</div>
        ${actionHtml}
      </div>
      <button onclick="LiveErrors.dismiss('${id}')"
        style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;flex-shrink:0;pointer-events:all">✕</button>
    `;

    this._container.appendChild(el);
    this._active[id] = el;

    // Auto-dismiss after timeout (unless sticky)
    if (!def.sticky && !opts.sticky) {
      setTimeout(() => this.dismiss(id), opts.duration || def.duration || 8000);
    }

    return id;
  },

  dismiss(id) {
    const el = this._active[id];
    if (!el) return;
    el.style.animation = 'errSlideOut .2s ease forwards';
    setTimeout(() => { el.remove(); delete this._active[id]; }, 200);
  },

  dismissAll() {
    Object.keys(this._active).forEach(id => this.dismiss(id));
  },

  // ── ERROR CODE DEFINITIONS ────────────────────────────────────────────────
  CODES: {
    // Camera / Microphone
    CAM_DENIED: {
      icon: '🎥', title: 'Kamera diblokir browser',
      detail: 'Klik ikon 🔒 di address bar → Izinkan kamera dan mikrofon → Refresh halaman.',
      bg: '#fef2f2', border: '#fca5a5',
      action: { label: 'Cara Mengizinkan', fn: 'LiveErrors.showPermGuide()', color: '#dc2626' },
      sticky: true,
    },
    MIC_DENIED: {
      icon: '🎙️', title: 'Mikrofon diblokir browser',
      detail: 'Klik ikon 🔒 di address bar → Izinkan mikrofon → Refresh halaman.',
      bg: '#fef2f2', border: '#fca5a5',
      action: { label: 'Cara Mengizinkan', fn: 'LiveErrors.showPermGuide()', color: '#dc2626' },
      sticky: true,
    },
    CAM_NOT_FOUND: {
      icon: '📷', title: 'Kamera tidak ditemukan',
      detail: 'Pastikan kamera terhubung dan tidak digunakan oleh aplikasi lain (Zoom, Meet, dll).',
      bg: '#fff7ed', border: '#fed7aa',
      action: { label: 'Coba Lagi', fn: 'LiveErrors.retryCamera()', color: '#ea580c' },
      duration: 10000,
    },
    MIC_NOT_FOUND: {
      icon: '🎤', title: 'Mikrofon tidak ditemukan',
      detail: 'Periksa koneksi headset/earphone. Pilih perangkat audio di pengaturan browser.',
      bg: '#fff7ed', border: '#fed7aa',
      duration: 10000,
    },
    CAM_BUSY: {
      icon: '⚠️', title: 'Kamera sedang digunakan aplikasi lain',
      detail: 'Tutup Zoom, Teams, Meet, atau aplikasi lain yang menggunakan kamera, lalu coba lagi.',
      bg: '#fff7ed', border: '#fed7aa',
      action: { label: 'Coba Lagi', fn: 'LiveErrors.retryCamera()', color: '#ea580c' },
      duration: 10000,
    },
    // WebRTC / Peer
    PEER_INIT_FAIL: {
      icon: '🔌', title: 'Gagal terhubung ke server sinyal',
      detail: 'Server PeerJS tidak dapat dijangkau. Cek koneksi internet Anda.',
      bg: '#fef2f2', border: '#fca5a5',
      action: { label: '🔄 Reconnect', fn: 'LiveErrors.triggerReconnect()', color: '#2563eb' },
      sticky: true,
    },
    ICE_FAILED: {
      icon: '📡', title: 'Koneksi video gagal (ICE failed)',
      detail: 'Jaringan Anda mungkin memblokir WebRTC. Coba gunakan jaringan lain atau aktifkan VPN.',
      bg: '#fef2f2', border: '#fca5a5',
      action: { label: '🔄 Coba ICE Restart', fn: 'LiveErrors.triggerIceRestart()', color: '#2563eb' },
      sticky: true,
    },
    PEER_DISCONNECTED: {
      icon: '📶', title: 'Koneksi terputus',
      detail: 'Mencoba menghubungkan kembali...',
      bg: '#fff7ed', border: '#fed7aa',
      duration: 5000,
    },
    // Recording
    RECORD_FAIL: {
      icon: '⏺️', title: 'Gagal memulai rekaman',
      detail: 'Browser Anda mungkin tidak mendukung MediaRecorder API. Coba Chrome terbaru.',
      bg: '#fef2f2', border: '#fca5a5',
      duration: 6000,
    },
    // Screen share
    SCREEN_DENIED: {
      icon: '🖥️', title: 'Berbagi layar dibatalkan',
      detail: 'Anda membatalkan pemilihan layar. Klik tombol screen share untuk mencoba lagi.',
      bg: '#f8f9fb', border: '#e2e8f0',
      duration: 4000,
    },
    // Generic
    UNKNOWN: {
      icon: 'ℹ️', title: 'Terjadi kesalahan',
      detail: 'Silakan refresh halaman dan coba lagi.',
      bg: '#f8f9fb', border: '#e2e8f0',
      duration: 6000,
    },
  },

  // ── HELPER ACTIONS ────────────────────────────────────────────────────────
  retryCamera() {
    this.dismissAll();
    if (typeof startPreview === 'function') startPreview();
    else if (typeof initMedia === 'function') initMedia();
  },

  triggerReconnect() {
    this.dismissAll();
    if (typeof initPeer === 'function') { initPeer(); }
    else if (typeof LiveWebRTC !== 'undefined') { LiveWebRTC.initPeer(); }
  },

  triggerIceRestart() {
    this.dismissAll();
    if (typeof LiveWebRTC !== 'undefined') { LiveWebRTC.restartIce(); }
  },

  showPermGuide() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.onclick = e => { if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:28px;max-width:440px;width:100%">
        <h3 style="font-size:17px;font-weight:800;margin-bottom:16px">🎥 Cara Mengizinkan Kamera & Mikrofon</h3>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:13px">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div style="width:28px;height:28px;border-radius:50%;background:#eff6ff;color:#2563eb;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">1</div>
            <div>Klik ikon <b>🔒</b> atau <b>ℹ️</b> di sebelah kiri address bar browser</div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div style="width:28px;height:28px;border-radius:50%;background:#eff6ff;color:#2563eb;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">2</div>
            <div>Pilih <b>Site settings</b> atau <b>Izin situs</b></div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div style="width:28px;height:28px;border-radius:50%;background:#eff6ff;color:#2563eb;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">3</div>
            <div>Set <b>Kamera</b> dan <b>Mikrofon</b> ke <b>Izinkan</b></div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div style="width:28px;height:28px;border-radius:50%;background:#eff6ff;color:#2563eb;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">4</div>
            <div>Refresh halaman (<b>F5</b> atau <b>Ctrl+R</b>)</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px">
          <button onclick="window.location.reload()" style="flex:1;padding:10px;border:none;background:#2563eb;color:#fff;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700">🔄 Refresh Sekarang</button>
          <button onclick="this.closest('div[style*=fixed]').remove()" style="padding:10px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;cursor:pointer;font-size:13px">Tutup</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },
};

// CSS for animations
const _errStyle = document.createElement('style');
_errStyle.textContent = `
@keyframes errSlideIn{from{opacity:0;transform:translateY(-16px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes errSlideOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-8px)}}
`;
document.head.appendChild(_errStyle);
