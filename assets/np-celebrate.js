/* Nihongo Pro Academy — Celebration Layer (np-celebrate.js)
   ───────────────────────────────────────────────────────────────────
   Menggantikan toast teks polos yang platform.js pakai untuk +XP, naik
   level, dan achievement dengan umpan balik visual: chip XP mengambang,
   overlay konfeti + kartu besar saat naik level, dan badge pencapaian.

   platform.js mendeteksi kehadiran modul ini lewat window.NPCelebrate
   dan MELEWATI toast bawaannya bila modul ini aktif — lihat
   assets/platform.js, State.addXP() dan Achievements.check(). Kedua
   fungsi itu tetap mengirim CustomEvent ('np:xpAdded', 'np:achievement')
   apa pun kondisinya, jadi modul ini murni pendengar, tidak pernah
   dipanggil langsung oleh halaman.

   Mandiri (self-contained): menyuntik <style> sendiri dengan var()+
   fallback hex, jadi tampilannya tetap on-brand di halaman yang sudah
   memuat kyoto-design-system.css maupun yang belum.

   WAJIB aksesibilitas: menghormati prefers-reduced-motion — bila aktif,
   modul ini TIDAK mendaftarkan window.NPCelebrate sama sekali, sehingga
   platform.js otomatis jatuh kembali ke toast teks biasa (tidak ada
   konfeti, tidak ada overlay, tidak ada listener yang terpasang di
   sini). Setiap event yang tampil di sini juga diumumkan ke pembaca
   layar lewat region aria-live tersembunyi, supaya kabar +XP/naik
   level/pencapaian tidak hilang bagi pengguna non-visual. */
(function (global) {
  'use strict';

  var reduce = false;
  try { reduce = global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) return;
  if (typeof document === 'undefined') return;

  // ── Suntik CSS sendiri (transform/opacity saja → 60fps aman) ──
  var css = ''
    + '#npCelebrate{position:fixed;inset:0;z-index:10000;pointer-events:none}'
    // Chip XP — pil kecil turun dari atas-tengah
    + '.np-cel-chip{position:fixed;top:18px;left:50%;transform:translate(-50%,-140%);opacity:0;'
    + 'transition:transform .32s cubic-bezier(.34,1.56,.64,1),opacity .28s ease-out;'
    + 'background:var(--gold,#C89B3C);color:var(--charcoal,#2D2D2D);padding:9px 16px;border-radius:999px;'
    + 'font:700 13px/1.3 inherit;box-shadow:0 10px 28px rgba(0,0,0,.18);display:flex;align-items:center;'
    + 'gap:8px;max-width:min(90vw,340px)}'
    + '.np-cel-chip.np-in{transform:translate(-50%,0);opacity:1}'
    + '.np-cel-chip-reason{opacity:.75;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.np-cel-chip-bar{width:40px;height:4px;border-radius:2px;background:rgba(0,0,0,.15);overflow:hidden;flex:none}'
    + '.np-cel-chip-bar>div{height:100%;background:var(--charcoal,#2D2D2D);transition:width .4s ease-out}'
    // Badge pencapaian — kartu kecil di sudut kanan-bawah (sama seperti posisi toast lama)
    + '.np-cel-badge{position:fixed;right:20px;bottom:20px;opacity:0;transform:translateX(24px);'
    + 'transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .3s ease-out;'
    + 'background:var(--surface,#FEFCF8);color:var(--ink,#2D2D2D);border:1px solid var(--gold,#C89B3C);'
    + 'border-radius:14px;padding:12px 16px;box-shadow:0 12px 32px rgba(0,0,0,.2);display:flex;'
    + 'align-items:center;gap:12px;max-width:min(90vw,320px);pointer-events:auto;cursor:pointer}'
    + '.np-cel-badge.np-in{opacity:1;transform:translateX(0)}'
    + '.np-cel-badge-icon{font-size:26px;line-height:1}'
    + '.np-cel-badge-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;opacity:.6;font-weight:700}'
    + '.np-cel-badge-title{font-size:14px;font-weight:700}'
    // Naik level — overlay penuh layar dengan kartu di tengah + konfeti
    + '.np-cel-levelup{position:fixed;inset:0;pointer-events:auto}'
    + '.np-cel-backdrop{position:absolute;inset:0;background:rgba(45,45,45,0);transition:background .32s ease-out}'
    + '.np-cel-levelup.np-in .np-cel-backdrop{background:rgba(45,45,45,.5)}'
    + '.np-cel-card{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.82);opacity:0;'
    + 'transition:transform .38s cubic-bezier(.34,1.56,.64,1),opacity .3s ease-out;background:var(--surface,#FEFCF8);'
    + 'color:var(--ink,#2D2D2D);border-radius:20px;padding:28px 34px;text-align:center;'
    + 'box-shadow:0 24px 70px rgba(0,0,0,.35);min-width:240px;cursor:pointer}'
    + '.np-cel-levelup.np-in .np-cel-card{transform:translate(-50%,-50%) scale(1);opacity:1}'
    + '.np-cel-stars{font-size:20px;letter-spacing:3px;margin-bottom:4px}'
    + '.np-cel-level-num{font-size:28px;font-weight:800;color:var(--gold,#C89B3C);letter-spacing:.02em}'
    + '.np-cel-level-title{font-size:14px;font-weight:600;opacity:.75;margin-top:2px}'
    + '.np-cel-xp-line{font-size:13px;font-weight:600;margin-top:14px;opacity:.85}'
    + '.np-cel-bar{width:180px;height:6px;border-radius:3px;background:rgba(0,0,0,.1);overflow:hidden;margin:10px auto 0}'
    + '.np-cel-bar-fill{height:100%;background:var(--gold,#C89B3C);transition:width .5s ease-out}'
    + '.np-cel-confetti{position:absolute;inset:0;width:100%;height:100%}';
  var style = document.createElement('style');
  style.setAttribute('data-np-celebrate', '');
  style.textContent = css;
  document.head.appendChild(style);

  // ── Root layer (dibuat sekali, dipakai ulang) + region aria-live ──
  var root = null, live = null;
  function ensureRoot() {
    if (root) return root;
    root = document.createElement('div');
    root.id = 'npCelebrate';
    root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);
    return root;
  }
  function announce(msg) {
    if (!live) {
      live = document.createElement('div');
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      // Sembunyikan visual tanpa display:none (yang membuat pembaca layar
      // mengabaikannya juga) — pola sr-only standar.
      live.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;'
        + 'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      document.body.appendChild(live);
    }
    live.textContent = msg;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function progressPct(xp) {
    try { return global.NP.XP.levelProgress(xp); } catch (e) { return 0; }
  }
  function levelTitle(lv) {
    try { return global.NP.XP.levelTitle(lv); } catch (e) { return ''; }
  }

  // ── Konfeti — dua "meriam" dari sudut bawah, warna palet Kyoto ──
  function burstConfetti(container) {
    var cv = document.createElement('canvas');
    cv.className = 'np-cel-confetti';
    cv.setAttribute('aria-hidden', 'true');
    container.appendChild(cv);
    var ctx = cv.getContext('2d');
    function size() { cv.width = innerWidth; cv.height = innerHeight; }
    size();
    var onResize = function () { size(); };
    addEventListener('resize', onResize);

    var colors = ['#C89B3C', '#D4AA56', '#5B7C5B', '#A63A3A', '#FEFCF8'];
    var ps = [], N = 70, i, origin;
    for (i = 0; i < N; i++) {
      origin = i % 2 === 0 ? 0.08 : 0.92; // dua meriam: kiri & kanan-bawah
      ps.push({
        x: innerWidth * origin,
        y: innerHeight * 0.96,
        vx: (origin < 0.5 ? 1 : -1) * (2.4 + Math.random() * 3.2),
        vy: -(8 + Math.random() * 5),
        rot: Math.random() * 6.283,
        vr: (Math.random() - 0.5) * 0.3,
        w: 5 + Math.random() * 4,
        h: 8 + Math.random() * 6,
        color: colors[i % colors.length],
        life: 1,
      });
    }

    var start = null, DURATION = 1900;
    function frame(ts) {
      if (!start) start = ts;
      var elapsed = ts - start;
      ctx.clearRect(0, 0, cv.width, cv.height);
      var active = false;
      for (i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.vy += 0.32; // gravitasi
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        p.life = Math.max(0, 1 - elapsed / DURATION);
        if (p.life <= 0 || p.y > cv.height + 20) continue;
        active = true;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (active && elapsed < DURATION + 400) {
        requestAnimationFrame(frame);
      } else {
        removeEventListener('resize', onResize);
        cv.remove();
      }
    }
    requestAnimationFrame(frame);
  }

  // ── Chip XP ──
  function showChip(d) {
    var r = ensureRoot();
    var old = r.querySelector('.np-cel-chip');
    if (old) old.remove();

    var chip = document.createElement('div');
    chip.className = 'np-cel-chip';
    chip.innerHTML =
      '<span>+' + Math.round(d.amount) + ' XP</span>' +
      (d.reason ? '<span class="np-cel-chip-reason">' + esc(d.reason) + '</span>' : '') +
      '<span class="np-cel-chip-bar"><div style="width:' + progressPct(d.total) + '%"></div></span>';
    r.appendChild(chip);
    requestAnimationFrame(function () { requestAnimationFrame(function () { chip.classList.add('np-in'); }); });

    setTimeout(function () {
      chip.classList.remove('np-in');
      setTimeout(function () { chip.remove(); }, 300);
    }, 1800);

    announce('+' + Math.round(d.amount) + ' XP' + (d.reason ? (' — ' + d.reason) : ''));
  }

  // ── Overlay naik level ──
  function showLevelUp(d) {
    var r = ensureRoot();
    var old = r.querySelector('.np-cel-levelup');
    if (old) old.remove();

    var title = levelTitle(d.level);
    var pct = progressPct(d.total);
    var stars = new Array(Math.min(d.level, 5) + 1).join('⭐');

    var wrap = document.createElement('div');
    wrap.className = 'np-cel-levelup';
    wrap.innerHTML =
      '<div class="np-cel-backdrop"></div>' +
      '<div class="np-cel-card" role="status">' +
        '<div class="np-cel-stars">' + stars + '</div>' +
        '<div class="np-cel-level-num">🎉 LEVEL ' + d.level + '</div>' +
        (title ? '<div class="np-cel-level-title">' + esc(title) + '</div>' : '') +
        '<div class="np-cel-xp-line">+' + Math.round(d.amount) + ' XP' + (d.reason ? (' — ' + esc(d.reason)) : '') + '</div>' +
        '<div class="np-cel-bar"><div class="np-cel-bar-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
    r.appendChild(wrap);
    burstConfetti(wrap);

    requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add('np-in'); }); });

    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      wrap.classList.remove('np-in');
      setTimeout(function () { wrap.remove(); }, 340);
    }
    wrap.addEventListener('click', dismiss);
    setTimeout(dismiss, 3600);

    announce('Naik ke Level ' + d.level + (title ? (', ' + title) : '') + '!');
  }

  // ── Badge pencapaian ──
  function showAchievement(a) {
    if (!a) return;
    var r = ensureRoot();
    var badge = document.createElement('div');
    badge.className = 'np-cel-badge';
    badge.innerHTML =
      '<span class="np-cel-badge-icon" aria-hidden="true">' + (a.icon || '🏅') + '</span>' +
      '<span><span class="np-cel-badge-label">Pencapaian Baru</span>' +
      '<div class="np-cel-badge-title">' + esc(a.title || '') + '</div></span>';
    r.appendChild(badge);
    requestAnimationFrame(function () { requestAnimationFrame(function () { badge.classList.add('np-in'); }); });

    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      badge.classList.remove('np-in');
      setTimeout(function () { badge.remove(); }, 300);
    }
    badge.addEventListener('click', dismiss);
    setTimeout(dismiss, 4200);

    announce('Pencapaian baru: ' + (a.title || ''));
  }

  // ── Daftarkan diri SEBELUM memasang listener — platform.js membaca
  // window.NPCelebrate secara sinkron saat addXP()/Achievements.check()
  // dipanggil, jadi flag ini harus sudah ada begitu skrip ini dieksekusi. ──
  global.NPCelebrate = true;

  global.addEventListener('np:xpAdded', function (e) {
    var d = e.detail || {};
    if (d.leveledUp) showLevelUp(d);
    else showChip(d);
  });
  global.addEventListener('np:achievement', function (e) {
    showAchievement(e.detail);
  });
})(window);
