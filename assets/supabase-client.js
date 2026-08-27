/**
 * Supabase Client — Nihonggo Pro Academy / Nihonggo Pro Academy
 * Production-ready auth + database layer
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY in env.js or Netlify env vars
 */
(function(global) {
  'use strict';

  // ─── CONFIG ──────────────────────────────────────────────────────
  const SUPABASE_URL      = global.EDUMA_ENV?.SUPABASE_URL      || '';
  const SUPABASE_ANON_KEY = global.EDUMA_ENV?.SUPABASE_ANON_KEY || '';

  const STORAGE_KEY = 'np-auth-v1';

  // ─── HELPERS ────────────────────────────────────────────────────
  function headers(extra = {}) {
    const h = {
      'Content-Type': 'application/json',
      'apikey':       SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${Auth.session()?.access_token || SUPABASE_ANON_KEY}`,
      ...extra
    };
    return h;
  }

  async function sbFetch(path, opts = {}) {
    if (!SUPABASE_URL) throw new Error('SUPABASE_URL not configured');
    const res = await fetch(SUPABASE_URL + path, {
      ...opts,
      headers: headers(opts.headers || {}),
    });
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
    if (!res.ok) throw new Error(data?.message || data?.error_description || `HTTP ${res.status}`);
    return data;
  }

  // ─── AUTH ────────────────────────────────────────────────────────
  const Auth = {
    _session: null,
    _listeners: [],

    init() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Check expiry
          if (parsed.expires_at && parsed.expires_at * 1000 > Date.now()) {
            this._session = parsed;
          } else if (parsed.refresh_token) {
            this.refreshSession(parsed.refresh_token).catch(() => this.clearSession());
          } else {
            this.clearSession();
          }
        }
      } catch (_) { this.clearSession(); }
    },

    session()  { return this._session; },
    user()     { return this._session?.user || null; },
    isLoggedIn() { return !!this._session?.user; },

    saveSession(session) {
      this._session = session;
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else this.clearSession();
      this._notify(session?.user || null);
    },

    clearSession() {
      this._session = null;
      localStorage.removeItem(STORAGE_KEY);
      this._notify(null);
    },

    onAuthChange(fn) {
      this._listeners.push(fn);
      // Fire immediately with current state
      fn(this.user());
      return () => { this._listeners = this._listeners.filter(l => l !== fn); };
    },

    _notify(user) {
      this._listeners.forEach(fn => fn(user));
      global.dispatchEvent(new CustomEvent('np:authChange', { detail: { user } }));
    },

    async signUp(email, password, name) {
      const data = await sbFetch('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, data: { full_name: name } }),
      });
      if (data.session) this.saveSession(data.session);
      return data;
    },

    async signIn(email, password) {
      const data = await sbFetch('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      this.saveSession(data);
      // Sync progress from DB
      await DB.syncOnLogin(data.user?.id);
      return data;
    },

    async signOut() {
      try {
        await sbFetch('/auth/v1/logout', { method: 'POST' });
      } catch (_) {}
      this.clearSession();
    },

    async refreshSession(refresh_token) {
      const data = await sbFetch('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token }),
      });
      this.saveSession(data);
      return data;
    },

    async resetPassword(email) {
      return sbFetch('/auth/v1/recover', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    async updatePassword(new_password) {
      return sbFetch('/auth/v1/user', {
        method: 'PUT',
        body: JSON.stringify({ password: new_password }),
      });
    },
  };

  // ─── DATABASE ────────────────────────────────────────────────────
  const DB = {
    // Upsert user progress to Supabase
    async saveProgress(userId, progress) {
      if (!userId || !SUPABASE_URL) return null;
      return sbFetch('/rest/v1/user_progress', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates',
          'on_conflict': 'user_id'
        },
        body: JSON.stringify({ user_id: userId, ...progress, updated_at: new Date().toISOString() }),
      });
    },

    async getProgress(userId) {
      if (!userId || !SUPABASE_URL) return null;
      const data = await sbFetch(`/rest/v1/user_progress?user_id=eq.${userId}&limit=1`);
      return Array.isArray(data) ? data[0] : null;
    },

    async syncOnLogin(userId) {
      if (!userId || !SUPABASE_URL) return;
      try {
        const remote = await this.getProgress(userId);
        if (!remote) return;
        // Merge remote into local — remote wins for most fields
        const local = JSON.parse(localStorage.getItem('np-state-v3') || '{}');
        if (!local.user) local.user = {};
        const merged = {
          ...local.user,
          xp:           Math.max(local.user.xp || 0, remote.xp || 0),
          level:        remote.level || local.user.level || 1,
          streak:       remote.streak || local.user.streak || 0,
          jlptProgress: remote.jlpt_progress || local.user.jlptProgress,
          kaigoProgress:remote.kaigo_progress || local.user.kaigoProgress || 0,
          isPremium:    remote.is_premium || local.user.isPremium || false,
          name:         remote.name || local.user.name || '',
        };
        local.user = merged;
        localStorage.setItem('np-state-v3', JSON.stringify(local));
      } catch (e) { console.warn('Sync failed:', e); }
    },

    async saveSRSCard(userId, cardId, cardData) {
      if (!userId || !SUPABASE_URL) return null;
      return sbFetch('/rest/v1/srs_cards', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates', 'on_conflict': 'user_id,card_id' },
        body: JSON.stringify({ user_id: userId, card_id: cardId, ...cardData, updated_at: new Date().toISOString() }),
      });
    },

    async getSRSCards(userId) {
      if (!userId || !SUPABASE_URL) return [];
      return sbFetch(`/rest/v1/srs_cards?user_id=eq.${userId}&select=card_id,ef,interval,reps,next_review,last_rating`);
    },

    async saveCertificate(userId, cert) {
      if (!userId || !SUPABASE_URL) return null;
      return sbFetch('/rest/v1/certificates', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({ user_id: userId, ...cert, issued_at: new Date().toISOString() }),
      });
    },

    async getCertificates(userId) {
      if (!userId || !SUPABASE_URL) return [];
      return sbFetch(`/rest/v1/certificates?user_id=eq.${userId}&order=issued_at.desc`);
    },

    async verifyCertificate(certId) {
      if (!SUPABASE_URL) return null;
      const data = await sbFetch(`/rest/v1/certificates?cert_id=eq.${certId}&limit=1`);
      return Array.isArray(data) && data[0] ? data[0] : null;
    },

    async getLeaderboard(limit = 10) {
      if (!SUPABASE_URL) return [];
      return sbFetch(`/rest/v1/user_progress?select=name,xp,streak,level&order=xp.desc&limit=${limit}`);
    },

    async saveQuizResult(userId, result) {
      if (!userId || !SUPABASE_URL) return null;
      return sbFetch('/rest/v1/quiz_results', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({ user_id: userId, ...result, taken_at: new Date().toISOString() }),
      });
    },

    async getQuizHistory(userId, limit = 10) {
      if (!userId || !SUPABASE_URL) return [];
      return sbFetch(`/rest/v1/quiz_results?user_id=eq.${userId}&order=taken_at.desc&limit=${limit}`);
    },

    // Simpan record sertifikat UJIAN (Ujian.html) agar bisa diverifikasi lewat
    // Verify.html — terpisah dari saveCertificate/verifyCertificate di atas
    // yang menargetkan tabel "certificates" milik Certificate-Pro.html.
    // (best-effort: jika Supabase belum dikonfigurasi, gagal secara diam
    // dan sertifikat tetap bisa dicetak — hanya verifikasi online yg tak aktif)
    async saveExamCertificate(cert) {
      if (!SUPABASE_URL) return null;
      try {
        return await sbFetch('/rest/v1/exam_certificates', {
          method: 'POST',
          body: JSON.stringify({
            cert_id: cert.certId,
            recipient_name: cert.name,
            exam_type: cert.examType,
            score_pct: cert.scorePct,
            correct: cert.correct,
            total: cert.total,
            issued_at: new Date().toISOString(),
          }),
        });
      } catch (e) { console.warn('saveExamCertificate failed:', e.message); return null; }
    },

    async getExamCertificate(certId) {
      if (!SUPABASE_URL || !certId) return null;
      try {
        const data = await sbFetch(`/rest/v1/exam_certificates?cert_id=eq.${encodeURIComponent(certId)}&limit=1`);
        return Array.isArray(data) ? (data[0] || null) : null;
      } catch (e) { return null; }
    },

    // Sinkron riwayat ujian (Ujian.html) ke server agar tersedia lintas
    // perangkat. Hanya untuk user yang login (RLS: exam_history butuh
    // user_id). Guest tetap bisa ujian — riwayatnya hanya di localStorage.
    async saveExamHistory(userId, result) {
      if (!userId || !SUPABASE_URL) return null;
      try {
        return await sbFetch('/rest/v1/exam_history', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            exam_type: result.bank,
            category: result.cat,
            total: result.total,
            correct: result.correct,
            score_pct: result.pct,
            duration_sec: result.secs,
            taken_at: new Date(result.at || Date.now()).toISOString(),
          }),
        });
      } catch (e) { console.warn('saveExamHistory failed:', e.message); return null; }
    },

    async getExamHistory(userId, limit = 50) {
      if (!userId || !SUPABASE_URL) return [];
      try {
        return await sbFetch(`/rest/v1/exam_history?user_id=eq.${userId}&order=taken_at.desc&limit=${limit}`);
      } catch (e) { return []; }
    },
  };

  // ─── REALTIME PROGRESS SYNC ──────────────────────────────────────
  const Sync = {
    _timer: null,
    _dirty: false,

    markDirty() { this._dirty = true; },

    start() {
      // Debounced auto-sync every 30s
      this._timer = setInterval(() => {
        if (this._dirty && Auth.isLoggedIn()) {
          this.push().catch(e => console.warn('Auto-sync failed:', e));
        }
      }, 30000);
    },

    async push() {
      const userId = Auth.user()?.id;
      if (!userId || !SUPABASE_URL) return;
      const st = JSON.parse(localStorage.getItem('np-state-v3') || '{}');
      const u = st.user || {};
      await DB.saveProgress(userId, {
        name:            u.name || '',
        xp:              u.xp || 0,
        level:           u.level || 1,
        streak:          u.streak || 0,
        jlpt_progress:   u.jlptProgress || {},
        kaigo_progress:  u.kaigoProgress || 0,
        kanji_learned:   u.kanjiLearned || 0,
        quiz_total:      u.quizTotal || 0,
        study_dates:     u.studyDates || [],
        achievements:    u.achievements || [],
        is_premium:      u.isPremium || false,
      });
      this._dirty = false;
    },
  };

  // ─── INIT ────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Sync.start();
    // Auto-push when state changes
    global.addEventListener('np:userUpdated', () => Sync.markDirty());
  });

  // ─── EXPORTS ─────────────────────────────────────────────────────
  global.SupabaseClient = { Auth, DB, Sync };

})(window);
