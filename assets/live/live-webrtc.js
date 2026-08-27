/**
 * live-webrtc.js — NihongoPro Live Classroom
 * WebRTC / PeerJS layer: camera, mic, screen share, connections
 * Requires: peerjs, EDUMA_ENV (from env.js)
 */

'use strict';

const LiveWebRTC = {
  _peer: null,
  _localStream: null,
  _screenStream: null,
  _connections: {},   // peerId → { call, conn }
  _myPeerId: null,
  _isHost: false,

  // ── CONFIG ─────────────────────────────────────────────────────────────────
  get config() {
    return {
      host:   window.EDUMA_ENV?.PEERJS_HOST       || '0.peerjs.com',
      port:   parseInt(window.EDUMA_ENV?.PEERJS_PORT || '443'),
      path:   window.EDUMA_ENV?.PEERJS_PATH        || '/',
      secure: true,
      debug:  0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
          {
            urls:       window.EDUMA_ENV?.TURN_URL        || 'turn:global.relay.metered.ca:80',
            username:   window.EDUMA_ENV?.TURN_USERNAME   || 'nihongopro',
            credential: window.EDUMA_ENV?.TURN_CREDENTIAL || 'kaigo2025',
          },
          {
            urls:       window.EDUMA_ENV?.TURN_URL_TCP    || 'turn:global.relay.metered.ca:80?transport=tcp',
            username:   window.EDUMA_ENV?.TURN_USERNAME   || 'nihongopro',
            credential: window.EDUMA_ENV?.TURN_CREDENTIAL || 'kaigo2025',
          },
          {
            urls:       window.EDUMA_ENV?.TURN_URL_TLS    || 'turns:global.relay.metered.ca:443?transport=tcp',
            username:   window.EDUMA_ENV?.TURN_USERNAME   || 'nihongopro',
            credential: window.EDUMA_ENV?.TURN_CREDENTIAL || 'kaigo2025',
          },
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
      },
    };
  },

  // ── INIT PEER ──────────────────────────────────────────────────────────────
  initPeer(id, isHost = false) {
    return new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') {
        reject(new Error('PeerJS not loaded'));
        return;
      }

      this._isHost = isHost;

      // Cleanup existing peer
      if (this._peer) { try { this._peer.destroy(); } catch(e){} this._peer = null; }

      const peer = new Peer(id, this.config);
      this._peer = peer;
      this._myPeerId = id;
      window._myPeerId = id;

      // Success
      peer.on('open', (peerId) => {
        console.log('[WebRTC] Peer open:', peerId);
        this._myPeerId = peerId;
        window._myPeerId = peerId;
        resolve(peerId);
      });

      // Incoming call
      peer.on('call', (call) => {
        console.log('[WebRTC] Incoming call from:', call.peer);
        this._answerCall(call);
      });

      // Incoming data connection
      peer.on('connection', (conn) => {
        console.log('[WebRTC] Incoming data conn from:', conn.peer);
        this._handleDataConn(conn);
      });

      // Error handling
      peer.on('error', (err) => {
        console.error('[WebRTC] PeerJS error:', err.type, err.message);
        this._handlePeerError(err, id, isHost, resolve, reject);
      });

      // Disconnected (not destroyed)
      peer.on('disconnected', () => {
        console.warn('[WebRTC] Peer disconnected, attempting reconnect...');
        this._scheduleReconnect(id, isHost);
      });

      // Destroyed
      peer.on('close', () => {
        console.log('[WebRTC] Peer closed');
        this._peer = null;
      });
    });
  },

  // ── CAMERA / MIC ──────────────────────────────────────────────────────────
  async getLocalStream(constraints = { video: true, audio: true }) {
    try {
      // Try full constraints first
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this._localStream = stream;
      window.localStream = stream;
      return stream;
    } catch(err) {
      return this._handleMediaError(err, constraints);
    }
  },

  async _handleMediaError(err, constraints) {
    console.error('[WebRTC] getUserMedia error:', err.name, err.message);

    const msgs = {
      NotAllowedError:       'Izin kamera/mikrofon ditolak. Klik ikon kunci di address bar → izinkan Camera & Microphone.',
      PermissionDeniedError: 'Izin kamera/mikrofon ditolak. Periksa pengaturan browser.',
      NotFoundError:         'Kamera atau mikrofon tidak ditemukan. Pastikan perangkat terhubung.',
      NotReadableError:      'Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain dan coba lagi.',
      OverconstrainedError:  'Resolusi kamera tidak didukung. Mencoba resolusi lebih rendah...',
      TypeError:             'Akses media tidak tersedia. Pastikan halaman menggunakan HTTPS.',
      AbortError:            'Akses kamera dibatalkan. Coba lagi.',
    };

    const msg = msgs[err.name] || `Error: ${err.message}`;
    LiveErrors.show(err.name === 'NotAllowedError' ? 'CAM_DENIED' : err.name === 'NotFoundError' ? 'CAM_NOT_FOUND' : err.name === 'NotReadableError' ? 'CAM_BUSY' : 'UNKNOWN', { detail: msg });

    // ── Fallback strategy ───────────────────────────────────────────────────
    if (err.name === 'OverconstrainedError') {
      // Try lower resolution
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 }, audio: true
        });
        this._localStream = fallback;
        window.localStream = fallback;
        LiveErrors.show('UNKNOWN', { detail: '⚠️ Kamera berjalan di resolusi rendah (320x240)' });
        return fallback;
      } catch(e2) {}
    }

    if (err.name === 'NotFoundError' || err.name === 'NotAllowedError') {
      // Try audio only
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        this._localStream = audioOnly;
        window.localStream = audioOnly;
        LiveErrors.show('CAM_NOT_FOUND', { detail: '⚠️ Kamera tidak tersedia. Menggunakan audio saja.' });
        return audioOnly;
      } catch(e3) {
        // No media at all — create silent stream
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();
        const stream = dest.stream;
        this._localStream = stream;
        window.localStream = stream;
        LiveErrors.show('CAM_NOT_FOUND', { detail: '⚠️ Tidak ada kamera/mikrofon. Mode viewer aktif.' });
        return stream;
      }
    }

    throw err;
  },

  // ── SCREEN SHARE ──────────────────────────────────────────────────────────
  async startScreenShare() {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: { echoCancellation: false, noiseSuppression: false }
      });
      this._screenStream = screen;
      window.screenStream = screen;

      // Replace video track in all calls
      const videoTrack = screen.getVideoTracks()[0];
      Object.values(this._connections).forEach(({ call }) => {
        if (!call?.peerConnection) return;
        const sender = call.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack).catch(()=>{});
      });

      // Auto-stop when user clicks "Stop sharing"
      videoTrack.onended = () => this.stopScreenShare();
      return screen;
    } catch(err) {
      if (err.name !== 'AbortError') {
        LiveErrors.show('SCREEN_DENIED', { detail: `Screen share gagal: ${err.message}` });
      }
      return null;
    }
  },

  async stopScreenShare() {
    if (!this._screenStream) return;
    this._screenStream.getTracks().forEach(t => t.stop());
    this._screenStream = null;
    window.screenStream = null;

    // Restore camera
    if (this._localStream) {
      const camTrack = this._localStream.getVideoTracks()[0];
      if (camTrack) {
        Object.values(this._connections).forEach(({ call }) => {
          if (!call?.peerConnection) return;
          const sender = call.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(camTrack).catch(()=>{});
        });
      }
    }
  },

  // ── CALL A PEER ───────────────────────────────────────────────────────────
  callPeer(peerId) {
    if (!this._peer || !this._localStream) return;
    const call = this._peer.call(peerId, this._localStream);
    this._trackCall(peerId, call);
    return call;
  },

  _answerCall(call) {
    call.answer(this._localStream || new MediaStream());
    this._trackCall(call.peer, call);
  },

  _trackCall(peerId, call) {
    if (!call) return;
    if (!this._connections[peerId]) this._connections[peerId] = {};
    this._connections[peerId].call = call;

    call.on('stream', (remoteStream) => {
      console.log('[WebRTC] Remote stream from:', peerId);
      if (typeof window.onRemoteStream === 'function') window.onRemoteStream(peerId, remoteStream);
    });

    call.on('error', (err) => {
      console.error('[WebRTC] Call error:', peerId, err);
      LiveErrors.show('ICE_FAILED', { detail: `Koneksi dengan ${peerId} bermasalah: ${err.message}` });
    });

    call.on('close', () => {
      console.log('[WebRTC] Call closed:', peerId);
      delete this._connections[peerId];
      if (typeof window.onPeerLeft === 'function') window.onPeerLeft(peerId);
    });

    // Monitor ICE connection state
    if (call.peerConnection) {
      call.peerConnection.oniceconnectionstatechange = () => {
        const state = call.peerConnection.iceConnectionState;
        console.log(`[WebRTC] ICE state (${peerId}):`, state);
        if (state === 'failed') {
          LiveErrors.show('ICE_FAILED', { detail: `Koneksi dengan ${peerId} gagal (ICE failed). Mencoba restart...` });
          call.peerConnection.restartIce?.();
        }
        if (state === 'disconnected') {
          LiveErrors.show('PEER_DISCONNECTED', { detail: `Koneksi ${peerId} terputus sementara...` });
        }
        if (state === 'connected' || state === 'completed') {
          LiveErrors.dismiss('ice');
        }
      };
    }
  },

  // ── DATA CONNECTION ────────────────────────────────────────────────────────
  connectData(peerId) {
    const conn = this._peer?.connect(peerId, { reliable: true, serialization: 'json' });
    if (!conn) return;
    this._handleDataConn(conn);
    return conn;
  },

  _handleDataConn(conn) {
    if (!this._connections[conn.peer]) this._connections[conn.peer] = {};
    this._connections[conn.peer].conn = conn;

    conn.on('open', () => {
      console.log('[WebRTC] Data conn open:', conn.peer);
    });

    conn.on('data', (data) => {
      if (typeof window.handleData === 'function') window.handleData(data, conn.peer);
    });

    conn.on('error', (err) => {
      console.error('[WebRTC] Data conn error:', conn.peer, err);
    });

    conn.on('close', () => {
      delete this._connections[conn.peer]?.conn;
    });
  },

  // ── ICE RESTART ────────────────────────────────────────────────────────────
  // GENUINELY ditambahkan: sebelumnya LiveErrors.triggerIceRestart() memanggil
  // LiveWebRTC.restartIce() yang TIDAK PERNAH ADA -- dikonfirmasi audit
  // menyebabkan TypeError diam-diam (hanya terlihat di console, bukan ke
  // pengguna) setiap kali tombol "🔄 Coba ICE Restart" diklik pada notifikasi
  // ICE_FAILED. Method ini genuinely me-restart ICE pada SELURUH koneksi
  // aktif (bukan hanya satu peer), mengikuti pola akses `_connections` yang
  // sudah dipakai method broadcast()/destroy() di atas.
  restartIce() {
    Object.entries(this._connections).forEach(([peerId, { call }]) => {
      try {
        if (call?.peerConnection?.restartIce) {
          call.peerConnection.restartIce();
          console.log('[WebRTC] ICE restart dipicu untuk', peerId);
        }
      } catch (e) { console.warn('[WebRTC] Gagal restart ICE untuk', peerId, e.message); }
    });
  },

  // ── BROADCAST ─────────────────────────────────────────────────────────────
  broadcast(data) {
    Object.entries(this._connections).forEach(([peerId, {conn}]) => {
      if (conn?.open) {
        try { conn.send(data); } catch(e) { console.warn('[WebRTC] broadcast err to', peerId); }
      }
    });
  },

  // ── CLEANUP ───────────────────────────────────────────────────────────────
  destroy() {
    this._localStream?.getTracks().forEach(t => t.stop());
    this._screenStream?.getTracks().forEach(t => t.stop());
    Object.values(this._connections).forEach(({call, conn}) => {
      try { call?.close(); conn?.close(); } catch(e){}
    });
    this._connections = {};
    try { this._peer?.destroy(); } catch(e){}
    this._peer = null;
    this._localStream = null;
    this._screenStream = null;
  },

  // ── RECONNECT ─────────────────────────────────────────────────────────────
  _reconnectAttempts: 0,
  _reconnectTimer: null,

  _scheduleReconnect(id, isHost) {
    if (this._reconnectAttempts >= 5) {
      LiveErrors.show('PEER_INIT_FAIL', { detail: 'Gagal terhubung setelah 5 percobaan. Periksa koneksi internet.' });
      return;
    }
    this._reconnectAttempts++;
    const delay = Math.min(2000 * this._reconnectAttempts, 10000);
    console.log(`[WebRTC] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts})`);

    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(async () => {
      try {
        if (this._peer?.disconnected) this._peer.reconnect();
        LiveErrors.show('PEER_DISCONNECTED', { detail: `Menyambung kembali... (percobaan ${this._reconnectAttempts}/5)` });
      } catch(e) {
        await this.initPeer(id, isHost).catch(()=>{});
      }
    }, delay);
  },

  _handlePeerError(err, id, isHost, resolve, reject) {
    const retryable = ['disconnected', 'network', 'server-error', 'socket-error', 'socket-closed'];
    const errMsgs = {
      'unavailable-id':   'Room code sudah dipakai. Coba kode lain.',
      'invalid-id':       'Format Room Code tidak valid.',
      'invalid-key':      'PeerJS API key tidak valid.',
      'ssl-unavailable':  'HTTPS diperlukan untuk akses kamera/mikrofon.',
      'server-error':     'Server PeerJS tidak merespons. Mencoba server backup...',
      'socket-error':     'Koneksi WebSocket terputus.',
      'network':          'Masalah jaringan. Periksa koneksi internet.',
      'browser-incompatible': 'Browser tidak mendukung WebRTC. Gunakan Chrome/Edge terbaru.',
    };

    const msg = errMsgs[err.type] || `Peer error: ${err.message}`;
    LiveErrors.show('PEER_INIT_FAIL', { detail: msg });

    if (retryable.includes(err.type)) {
      this._scheduleReconnect(id, isHost);
    } else if (err.type === 'browser-incompatible') {
      reject(err);
    }
    // Don't reject for retryable errors
    if (!retryable.includes(err.type) && err.type !== 'unavailable-id') {
      resolve(null); // Allow partial initialization
    }
  },

  // ── DEVICE ENUMERATION ────────────────────────────────────────────────────
  async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter(d => d.kind === 'videoinput'),
        mics:    devices.filter(d => d.kind === 'audioinput'),
        speakers:devices.filter(d => d.kind === 'audiooutput'),
      };
    } catch(e) { return { cameras: [], mics: [], speakers: [] }; }
  },

  async switchCamera() {
    const { cameras } = await this.getDevices();
    if (cameras.length < 2) return false;

    const currentTrack = this._localStream?.getVideoTracks()[0];
    const currentId = currentTrack?.getSettings()?.deviceId;
    const nextCam = cameras.find(c => c.deviceId !== currentId) || cameras[0];

    try {
      const newTrack = (await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextCam.deviceId } }
      })).getVideoTracks()[0];

      // Replace in local stream
      if (currentTrack) {
        this._localStream.removeTrack(currentTrack);
        currentTrack.stop();
      }
      this._localStream.addTrack(newTrack);

      // Replace in all calls
      Object.values(this._connections).forEach(({ call }) => {
        if (!call?.peerConnection) return;
        const sender = call.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newTrack).catch(()=>{});
      });

      return newTrack;
    } catch(e) {
      LiveErrors.show('CAM_NOT_FOUND', { detail: `Gagal ganti kamera: ${e.message}` });
      return false;
    }
  },
};

// Make globally available
window.LiveWebRTC = LiveWebRTC;
