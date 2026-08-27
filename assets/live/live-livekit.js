/* Nihonggo Pro Academy — Live Classroom via LiveKit (SFU)
   ───────────────────────────────────────────────────────────────────
   Alternatif untuk arsitektur PeerJS mesh yang ada di Kelas-Online.html.
   Mesh: tiap peserta upload video ke SEMUA peserta lain (tak skalabel).
   SFU (modul ini): tiap peserta upload SATU stream ke server LiveKit,
   server yang mendistribusikan ke peserta lain. Skalabel ke puluhan
   peserta.

   MODE OPT-IN: modul ini HANYA aktif bila LiveKit sudah dikonfigurasi
   (window.EDUMA_ENV.LIVEKIT_URL diisi via env.js/Netlify env vars).
   Bila belum dikonfigurasi, Kelas-Online.html tetap memakai PeerJS mesh
   seperti biasa — TIDAK ADA fitur yang hilang atau rusak.

   API yang disediakan ke Kelas-Online.html (window.NPLiveKit):
     .isConfigured()                    → boolean, LiveKit siap dipakai?
     .connect(room, identity, name, isHost, { onTrack, onTrackRemoved, onError })
                                         → Promise, join room + publish kamera/mic
     .toggleMic(enabled)                → mute/unmute mikrofon lokal
     .toggleCamera(enabled)             → nyala/mati kamera lokal
     .shareScreen()/.stopShareScreen()  → berbagi layar
     .disconnect()                      → keluar dari room, bersihkan semua track

   onTrack(participantId, mediaStream, participantName) dipanggil setiap
   kali ada track jarak jauh baru — Kelas-Online.html cukup memanggil
   fungsi addVT(pid, stream, label) yang SUDAH ADA, tanpa perlu menulis
   ulang logika tampilan video grid/breakout/spotlight.

   CATATAN JUJUR: kode ini disusun mengikuti dokumentasi resmi LiveKit
   client SDK dan diverifikasi sintaksnya, TAPI tidak bisa diuji dengan
   koneksi video sungguhan di lingkungan pengembangan ini (tidak ada
   browser/akun LiveKit nyata di sandbox). Uji nyata perlu dilakukan
   setelah LIVEKIT_URL/API key diisi dan dicoba di browser langsung. */
(function () {
  'use strict';

  var room = null;           // instance LivekitClient.Room
  var localVideoTrack = null;
  var localAudioTrack = null;
  var screenTrack = null;
  var callbacks = {};

  function isConfigured() {
    try {
      return !!(window.EDUMA_ENV && window.EDUMA_ENV.LIVEKIT_URL);
    } catch (e) { return false; }
  }

  function loadSdk() {
    if (window.LivekitClient) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.umd.min.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Gagal memuat LiveKit client SDK dari CDN')); };
      document.head.appendChild(s);
    });
  }

  function fetchToken(roomName, identity, name, isHost) {
    return fetch('/api/livekit-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomName, identity: identity, name: name, isHost: !!isHost })
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || 'Gagal mendapat token LiveKit'); });
      return r.json();
    });
  }

  function attachRemoteTrack(track, participant) {
    if (track.kind !== 'video' && track.kind !== 'audio') return;
    var pid = participant.identity;
    // Kumpulkan semua track (video+audio) milik peserta ini jadi satu MediaStream,
    // supaya cocok dengan signature addVT(pid, stream, label) yang sudah ada.
    if (!attachRemoteTrack._streams) attachRemoteTrack._streams = {};
    var streams = attachRemoteTrack._streams;
    if (!streams[pid]) streams[pid] = new MediaStream();
    try { streams[pid].addTrack(track.mediaStreamTrack); } catch (e) {}
    if (callbacks.onTrack) {
      callbacks.onTrack(pid, streams[pid], participant.name || pid);
    }
  }

  function detachParticipant(participant) {
    var pid = participant.identity;
    if (attachRemoteTrack._streams) delete attachRemoteTrack._streams[pid];
    if (callbacks.onTrackRemoved) callbacks.onTrackRemoved(pid);
  }

  function connect(roomName, identity, name, isHost, cb) {
    callbacks = cb || {};
    if (!isConfigured()) {
      return Promise.reject(new Error('LiveKit belum dikonfigurasi (LIVEKIT_URL kosong).'));
    }
    return loadSdk()
      .then(function () { return fetchToken(roomName, identity, name, isHost); })
      .then(function (res) {
        var LK = window.LivekitClient;
        room = new LK.Room({ adaptiveStream: true, dynacast: true });

        room.on(LK.RoomEvent.TrackSubscribed, function (track, pub, participant) {
          attachRemoteTrack(track, participant);
        });
        room.on(LK.RoomEvent.TrackUnsubscribed, function (track, pub, participant) {
          // hapus hanya jika peserta tak punya track lain tersisa
        });
        room.on(LK.RoomEvent.ParticipantDisconnected, function (participant) {
          detachParticipant(participant);
        });
        room.on(LK.RoomEvent.Disconnected, function () {
          if (callbacks.onError) callbacks.onError(new Error('Terputus dari server LiveKit'));
        });

        return room.connect(res.url, res.token).then(function () {
          return room.localParticipant.enableCameraAndMicrophone();
        }).then(function () {
          return room;
        });
      })
      .catch(function (err) {
        if (callbacks.onError) callbacks.onError(err);
        throw err;
      });
  }

  function toggleMic(enabled) {
    if (!room) return;
    room.localParticipant.setMicrophoneEnabled(!!enabled);
  }
  function toggleCamera(enabled) {
    if (!room) return;
    room.localParticipant.setCameraEnabled(!!enabled);
  }
  function shareScreen() {
    if (!room) return Promise.reject(new Error('Belum terhubung ke room'));
    return room.localParticipant.setScreenShareEnabled(true);
  }
  function stopShareScreen() {
    if (!room) return;
    return room.localParticipant.setScreenShareEnabled(false);
  }
  function disconnect() {
    if (room) { room.disconnect(); room = null; }
    if (attachRemoteTrack._streams) attachRemoteTrack._streams = {};
  }

  window.NPLiveKit = {
    isConfigured: isConfigured,
    connect: connect,
    toggleMic: toggleMic,
    toggleCamera: toggleCamera,
    shareScreen: shareScreen,
    stopShareScreen: stopShareScreen,
    disconnect: disconnect
  };
})();
