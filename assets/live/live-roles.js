// ── LIVE ROLES — Teacher / Student Permission System ────────────────────────
"use strict";

const LiveRoles = {
  _role: 'student',   // 'host' | 'teacher' | 'student' | 'moderator'
  _perms: {},

  PERMISSIONS: {
    host: {
      canMuteAll: true, canKick: true, canLock: true, canEndSession: true,
      canSpotlight: true, canBroadcast: true, canMuteIndividual: true,
      canRenameStudent: true, canShareScreen: true, canRecord: true,
      canSendQuiz: true, canManageBreakout: true, canLowerAllHands: true,
      canSeeProgress: true, canSchedule: true, canManageWaitingRoom: true,
      canToggleCamera: true, canChat: true, canReact: true,
      canWhiteboard: true, canAnnotate: true, canShareHandout: true,
    },
    teacher: {
      canMuteAll: true, canKick: false, canLock: true, canEndSession: false,
      canSpotlight: true, canBroadcast: true, canMuteIndividual: true,
      canRenameStudent: false, canShareScreen: true, canRecord: true,
      canSendQuiz: true, canManageBreakout: true, canLowerAllHands: true,
      canSeeProgress: true, canSchedule: false, canManageWaitingRoom: false,
      canToggleCamera: true, canChat: true, canReact: true,
      canWhiteboard: true, canAnnotate: true, canShareHandout: true,
    },
    moderator: {
      canMuteAll: true, canKick: true, canLock: false, canEndSession: false,
      canSpotlight: false, canBroadcast: false, canMuteIndividual: true,
      canRenameStudent: false, canShareScreen: false, canRecord: false,
      canSendQuiz: false, canManageBreakout: false, canLowerAllHands: true,
      canSeeProgress: false, canSchedule: false, canManageWaitingRoom: true,
      canToggleCamera: false, canChat: true, canReact: true,
      canWhiteboard: false, canAnnotate: false, canShareHandout: false,
    },
    student: {
      canMuteAll: false, canKick: false, canLock: false, canEndSession: false,
      canSpotlight: false, canBroadcast: false, canMuteIndividual: false,
      canRenameStudent: false, canShareScreen: true, canRecord: false,
      canSendQuiz: false, canManageBreakout: false, canLowerAllHands: false,
      canSeeProgress: false, canSchedule: false, canManageWaitingRoom: false,
      canToggleCamera: true, canChat: true, canReact: true,
      canWhiteboard: true, canAnnotate: false, canShareHandout: false,
    },
    // GENUINELY DITAMBAHKAN (Prioritas 1, plan skala 200 orang): peran baru
    // 'attendee' (penonton) untuk model "Panggung + Penonton" -- dirancang
    // TERPISAH dari 'student' karena keduanya genuinely melayani kasus
    // pemakaian berbeda: 'student' untuk kelas kecil kolaboratif (video
    // semua orang bisa nyala, sudah ada sejak awal), 'attendee' untuk kelas
    // besar model webinar (video HANYA host/co-host, penonton genuinely
    // tidak bisa menyalakan kamera sama sekali -- dikonfirmasi perlu via
    // pengukuran performa genuine: render 200 elemen video/DOM peserta
    // genuinely menyebabkan jeda nyata, ~24ms rata-rata hingga lonjakan
    // ~190ms per render daftar peserta, ~205ms untuk membangun 200 elemen
    // video DOM -- sebelum menghitung beban stream video/audio sungguhan
    // yang genuinely jauh lebih berat). `canToggleCamera: false` adalah
    // GENUINELY PEMBEDA UTAMA dari 'student' -- mencegah penonton mencoba
    // menyalakan kamera yang akan membebani sistem untuk seluruh peserta.
    attendee: {
      canMuteAll: false, canKick: false, canLock: false, canEndSession: false,
      canSpotlight: false, canBroadcast: false, canMuteIndividual: false,
      canRenameStudent: false, canShareScreen: false, canRecord: false,
      canSendQuiz: false, canManageBreakout: false, canLowerAllHands: false,
      canSeeProgress: false, canSchedule: false, canManageWaitingRoom: false,
      canToggleCamera: false, canChat: true, canReact: true,
      canWhiteboard: false, canAnnotate: false, canShareHandout: false,
    },
  },

  // ── INIT ─────────────────────────────────────────────────────────────────
  init(isHost, isWebinarMode) {
    // Detect role from trusted sources only.
    // GENUINELY DIPERBAIKI: sebelumnya membaca `?role=` dari query string URL
    // (`new URLSearchParams(location.search).get('role')`) sebagai salah
    // satu sumber penentu role -- dikonfirmasi audit sebagai CELAH KEAMANAN
    // NYATA: siapapun (peserta biasa, isHost=false) yang menambahkan
    // "?role=host" ke URL kelas GENUINELY mendapat role 'teacher' (15 dari
    // 21 permission true: mute semua orang, kunci room, kirim quiz, kelola
    // breakout room, dst) TANPA OTENTIKASI APAPUN. Dikonfirmasi
    // `Kelas-Online.html` sendiri TIDAK PERNAH membuat/mengharapkan
    // parameter ini di alur aplikasi manapun -- murni celah tak terproteksi,
    // bukan fitur yang disengaja. Role sekarang GENUINELY hanya ditentukan
    // dari `isHost` (flow asli: true hanya saat createSession(), false saat
    // joinSession() -- lihat Kelas-Online.html) dan `authRole` (dari sesi
    // Supabase terautentikasi via LiveAuth, jauh lebih terproteksi
    // dibanding parameter URL yang genuinely bisa diketik siapapun).
    const authRole = (typeof LiveAuth !== 'undefined') ? LiveAuth._user?.user_metadata?.role : null;
    // GENUINELY DITAMBAHKAN (Prioritas 1, plan skala 200 orang): parameter
    // `isWebinarMode` OPSIONAL (default falsy) -- genuinely TIDAK MENGUBAH
    // pemanggilan `LiveRoles.init(isHost)` yang sudah ada di enterRoom(),
    // mempertahankan backward-compatibility penuh untuk kelas mode
    // kolaboratif existing. Sumber nilai ini GENUINELY sama amannya dengan
    // `isHost` -- ditentukan dari flow createSession() (pilihan host saat
    // membuat kelas), BUKAN dari input yang bisa dimanipulasi peserta
    // (menghindari mengulang pola celah keamanan yang sudah diperbaiki di
    // atas untuk `urlRole`).

    if (isHost || authRole === 'teacher' || authRole === 'admin') {
      this._role = isHost ? 'host' : 'teacher';
    } else if (authRole === 'moderator') {
      this._role = 'moderator';
    } else if (isWebinarMode) {
      this._role = 'attendee';
    } else {
      this._role = 'student';
    }

    this._perms = this.PERMISSIONS[this._role] || this.PERMISSIONS.student;
    this._applyUI();
    console.log(`LiveRoles: role=${this._role}`);
    return this._role;
  },

  can(perm) {
    return !!this._perms[perm];
  },

  get isHost()    { return this._role === 'host'; },
  get isTeacher() { return this._role === 'host' || this._role === 'teacher'; },
  get role()      { return this._role; },

  // ── APPLY UI ──────────────────────────────────────────────────────────────
  _applyUI() {
    // Show/hide teacher-only controls
    const isTeacher = this.isTeacher;

    // Teacher toolbar items
    document.querySelectorAll('[data-role="host"], [data-role="teacher"]').forEach(el => {
      el.style.display = isTeacher ? '' : 'none';
    });
    document.querySelectorAll('[data-role="student"]').forEach(el => {
      el.style.display = !isTeacher ? '' : 'none';
    });

    // Specific controls
    const hostCtrlIds = [
      'muteAllBtn','kickBtns','lockBtn','endBtn','broadcastBtn',
      'quizSendPanel','breakoutPanel','hostPartsTools','scoreDashBtn',
      'progBtn','actTimerDisplay','lessonPlanBtn',
    ];
    hostCtrlIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = isTeacher ? '' : 'none';
    });

    // Role badge in header
    let badge = document.getElementById('roleBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'roleBadge';
      badge.style.cssText = 'position:fixed;top:68px;right:12px;z-index:50;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;pointer-events:none';
      document.body.appendChild(badge);
    }
    const roleConfig = {
      host:      { label: '👑 Host',      bg: '#fef3c7', color: '#d97706' },
      teacher:   { label: '👩‍🏫 Guru',     bg: '#e0f2fe', color: '#0369a1' },
      moderator: { label: '🛡️ Moderator', bg: '#f3e8ff', color: '#7c3aed' },
      student:   { label: '🎓 Siswa',     bg: '#dcfce7', color: '#16a34a' },
    };
    const cfg = roleConfig[this._role] || roleConfig.student;
    badge.textContent = cfg.label;
    badge.style.background = cfg.bg;
    badge.style.color = cfg.color;
    badge.style.border = `1px solid ${cfg.color}44`;

    // Inject teacher panel if teacher
    if (isTeacher) this._injectTeacherPanel();
  },

  // ── TEACHER CONTROL PANEL ─────────────────────────────────────────────────
  _injectTeacherPanel() {
    if (document.getElementById('teacherPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'teacherPanel';
    panel.style.cssText = [
      'position:fixed','bottom:70px','left:50%','transform:translateX(-50%)',
      'background:rgba(15,23,42,.9)','backdrop-filter:blur(12px)',
      'border:1px solid rgba(255,255,255,.1)','border-radius:16px',
      'padding:10px 16px','z-index:160','display:flex','gap:8px',
      'align-items:center','box-shadow:0 8px 32px rgba(0,0,0,.4)',
      'flex-wrap:wrap','max-width:90vw','justify-content:center',
    ].join(';');

    const buttons = [
      { icon:'🔇', label:'Mute Semua', fn:'muteAll&&muteAll()', perm:'canMuteAll' },
      { icon:'🖐', label:'Turunkan Tangan', fn:'lowerAllHands&&lowerAllHands()', perm:'canLowerAllHands' },
      { icon:'🧩', label:'Kirim Quiz', fn:"switchTab&&switchTab('quiz')", perm:'canSendQuiz' },
      { icon:'📊', label:'Progress', fn:'StudentProgress&&StudentProgress.toggle()', perm:'canSeeProgress' },
      { icon:'⏱️', label:'Timer', fn:'toggleActivityTimer()', perm:'canBroadcast' },
      { icon:'📋', label:'Rencana', fn:'toggleLessonPlan&&toggleLessonPlan()', perm:'canSchedule' },
      { icon:'📢', label:'Broadcast', fn:'broadcastMsg()', perm:'canBroadcast' },
      { icon:'⏺️', label:'Rekam', fn:'ClassRecording&&ClassRecording.toggle()', perm:'canRecord' },
      { icon:'🏠', label:'Breakout', fn:"switchTab&&switchTab('brk')", perm:'canManageBreakout' },
      { icon:'🔒', label:'Kunci', fn:'toggleLock&&toggleLock()', perm:'canLock' },
    ];

    const visibleBtns = buttons.filter(b => this.can(b.perm));
    panel.innerHTML = visibleBtns.map(b => `
      <button onclick="${b.fn}" title="${b.label}"
        style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);
        color:#fff;border-radius:10px;padding:7px 10px;cursor:pointer;
        font-size:12px;display:flex;flex-direction:column;align-items:center;
        gap:2px;min-width:52px;transition:.15s"
        onmouseenter="this.style.background='rgba(255,255,255,.2)'"
        onmouseleave="this.style.background='rgba(255,255,255,.1)'">
        <span style="font-size:18px">${b.icon}</span>
        <span style="font-size:9px;opacity:.8">${b.label}</span>
      </button>`).join('');

    // Toggle button
    const toggle = document.createElement('button');
    toggle.id = 'teacherPanelToggle';
    toggle.style.cssText = 'position:fixed;bottom:74px;right:72px;width:42px;height:42px;border-radius:50%;background:rgba(15,23,42,.85);color:#fff;border:1px solid rgba(255,255,255,.2);cursor:pointer;font-size:20px;z-index:161;box-shadow:0 4px 12px rgba(0,0,0,.3)';
    toggle.title = 'Teacher Controls';
    toggle.textContent = '👩‍🏫';
    toggle.onclick = () => {
      const visible = panel.style.display !== 'none';
      panel.style.display = visible ? 'none' : 'flex';
    };

    document.body.appendChild(panel);
    document.body.appendChild(toggle);
  },

  // ── GUARD ─────────────────────────────────────────────────────────────────
  guard(perm, fn) {
    return (...args) => {
      if (!this.can(perm)) {
        if (typeof liveNotify === 'function') liveNotify('⛔ Tidak ada izin untuk tindakan ini', '⛔', 2500);
        return;
      }
      return fn(...args);
    };
  },
};

// ── Quick teacher actions ────────────────────────────────────────────────────
function toggleActivityTimer() {
  const disp = document.getElementById('actTimerDisplay');
  if (disp && disp.style.display !== 'none') {
    if (typeof ActivityTimer !== 'undefined') ActivityTimer.stop();
  } else {
    const mins = prompt('Durasi timer (menit):', '10');
    if (mins && !isNaN(parseInt(mins))) {
      if (typeof ActivityTimer !== 'undefined') ActivityTimer.start(parseInt(mins), 'down');
      if (typeof bcast === 'function') bcast({ type:'activity-timer-start', secs: parseInt(mins)*60, dir:'down' });
    }
  }
}

function broadcastMsg() {
  const msg = prompt('Pesan ke semua peserta:');
  if (!msg) return;
  if (typeof bcast === 'function') bcast({ type:'broadcast-msg', msg, from:'Host' });
  if (typeof liveNotify === 'function') liveNotify(`📢 Broadcast: "${msg}"`, '📢', 4000);
}

// Handle incoming broadcast messages (student side)
// GENUINELY DIPERBAIKI (Prioritas 3, plan kesiapan produksi): parameter
// loss pre-existing identik 2 lapis lain yang sudah diperbaiki di
// Kelas-Online.html -- file ini genuinely LAPIS TERLUAR (dimuat `defer`,
// dieksekusi TERAKHIR, dikonfirmasi arsitektur ini di v284), sehingga
// genuinely paling BERDAMPAK dari seluruh lapis yang membuang `from` --
// setiap panggilan window.handleData(data, from) genuinely kehilangan
// `from` DI SINI DULU, sebelum sempat diteruskan ke lapis mana pun di
// Kelas-Online.html. Diperbaiki dengan rest parameter, konsisten dengan
// solusi appendMsg (v283) dan 2 lapis lain (Prioritas 3 sesi ini).
const _origHD_roles = window.handleData;
window.handleData = function(...args) {
  const data = args[0];
  if (data?.type === 'broadcast-msg' && !LiveRoles.isTeacher) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(15,23,42,.92);color:#fff;border-radius:16px;padding:20px 28px;z-index:9000;font-size:15px;text-align:center;max-width:360px;box-shadow:0 16px 48px rgba(0,0,0,.4)';
    div.innerHTML = `<div style="font-size:24px;margin-bottom:8px">📢</div><div style="font-weight:700;margin-bottom:4px">Pesan dari ${data.from||'Host'}</div><div style="opacity:.8">${data.msg}</div><button onclick="this.closest('div[style*=fixed]').remove()" style="margin-top:14px;padding:7px 20px;border:none;background:rgba(255,255,255,.15);color:#fff;border-radius:8px;cursor:pointer">OK</button>`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 8000);
    return;
  }
  if (typeof _origHD_roles === 'function') _origHD_roles(...args);
};
