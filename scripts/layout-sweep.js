#!/usr/bin/env node
/**
 * Sapu TAMPILAN seluruh halaman di Chromium sungguhan.
 * ====================================================
 *
 * Bedanya dengan browser-sweep.js
 * -------------------------------
 * browser-sweep.js memeriksa ISI: apakah kuisnya jalan, apakah penjelasannya
 * sampai ke layar. Skrip ini memeriksa BENTUK: apakah ada yang meluber,
 * bertindih, atau hilang karena warnanya.
 *
 * Empat hal yang diukur per halaman, pada tiga lebar
 * --------------------------------------------------
 *   1. luber mendatar   scrollWidth > innerWidth → halaman bisa digeser ke
 *                       samping, dan isinya terpotong di tepi
 *   2. tabrakan         dua elemen position:fixed yang bisa diklik saling
 *                       menumpuk — tombol yang tertimpa tidak bisa ditekan
 *   3. kontras          teks di bawah ambang WCAG AA 4,5 (3,0 untuk teks
 *                       besar), diukur di mode TERANG dan GELAP
 *   4. sasaran sentuh   tombol/tautan lebih kecil dari 24px pada layar mobile
 *
 * Kenapa perlu, padahal sudah ada validator
 * -----------------------------------------
 * validate.py membaca CSS sebagai teks. Ia bisa menemukan pola berbahaya
 * (lihat check_literal_bg_with_token_color) tapi tidak bisa tahu aturan mana
 * yang akhirnya MENANG di layar. Bug .mascot-bubble hanya terlihat setelah
 * empat berkas CSS bertengkar dan !important dari neko-theme.css menang.
 *
 * Yang BUKAN bug, dan sengaja diabaikan
 * -------------------------------------
 *   - path absolut ("/assets/...") gagal diambil lewat file:// — benar di
 *     server sungguhan
 *   - elemen dengan pointer-events:none (mis. .kn-drawer) tidak menghalangi
 *     apa pun meski kotaknya menutupi layar
 *   - latar transparan di atas gambar: kontrasnya tidak bisa dihitung, jadi
 *     dilewati alih-alih ditebak
 *
 * Pemakaian
 * ---------
 *     node scripts/layout-sweep.js                # halaman akar (53)
 *     node scripts/layout-sweep.js --all          # akar + Materi (380)
 *     node scripts/layout-sweep.js index.html     # saring per nama
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEBAR = [[390, 844, 'mobile'], [768, 1024, 'tablet'], [1280, 900, 'desktop']];
const AMBANG = 4.5;      // WCAG AA teks biasa
const AMBANG_BESAR = 3;  // WCAG AA teks besar (>=24px, atau >=18.66px tebal)
const SENTUH_MIN = 24;   // WCAG 2.2 target size (minimum)

function daftar(arg) {
  const akar = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
  const materi = fs.readdirSync(path.join(ROOT, 'Materi'))
    .filter((f) => f.endsWith('.html')).map((f) => 'Materi/' + f);
  if (arg === '--all') return [...akar, ...materi].sort();
  if (arg) return [...akar, ...materi].filter((f) => f.includes(arg)).sort();
  return akar.sort();
}

// Dijalankan DI DALAM halaman. Playwright hanya meneruskan SATU argumen ke
// page.evaluate, jadi seluruh ambang dibungkus dalam satu objek.
function ukur({ AMBANG, AMBANG_BESAR, SENTUH_MIN, mobile }) {
  const lum = (c) => {
    const m = String(c).match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    if (a !== undefined && a < 0.4) return null;   // terlalu tembus untuk dihitung
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const rasio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

  // Latar TEMBUS harus DIKOMPOSIT, bukan dilewati. Versi pertama skrip ini
  // melompati latar ber-alpha rendah lalu memakai latar induknya apa adanya —
  // hasilnya lencana hero dilaporkan "merah di atas abu gelap" padahal
  // sebenarnya merah di atas krem terang. Empat dari sepuluh temuan pertama
  // adalah positif palsu karena ini.
  const latarEfektif = (el) => {
    const tumpuk = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null; // gambar/gradien
      const m = String(s.backgroundColor).match(/[\d.]+/g);
      if (m) {
        const a = m.length < 4 ? 1 : Number(m[3]);
        if (a > 0.001) tumpuk.push({ r: +m[0], g: +m[1], b: +m[2], a });
        if (a >= 0.999) break;
      }
      n = n.parentElement;
    }
    const dasar = String(getComputedStyle(document.body).backgroundColor).match(/[\d.]+/g);
    let R = dasar ? +dasar[0] : 255, G = dasar ? +dasar[1] : 255, B = dasar ? +dasar[2] : 255;
    for (let i = tumpuk.length - 1; i >= 0; i--) {          // dari bawah ke atas
      const c = tumpuk[i];
      R = c.r * c.a + R * (1 - c.a);
      G = c.g * c.a + G * (1 - c.a);
      B = c.b * c.a + B * (1 - c.a);
    }
    return `rgb(${Math.round(R)}, ${Math.round(G)}, ${Math.round(B)})`;
  };

  // Emoji dan piktogram dirender dengan paletnya SENDIRI, bukan dengan
  // color: dari CSS. Mengukur kontrasnya terhadap warna teks tidak bermakna.
  const hanyaSimbol = (t) => !/[\p{L}\p{N}]/u.test(t.replace(/[\p{Extended_Pictographic}]/gu, ''));

  // Elemen di dalam wadah yang tidak bisa disentuh (drawer tertutup, panel
  // inert) tidak dilihat siapa pun meski kotaknya ada di layar.
  const tersembunyiEfektif = (e) => {
    let n = e;
    while (n && n !== document.documentElement) {
      if (n.hasAttribute && (n.hasAttribute('inert') || n.getAttribute('aria-hidden') === 'true')) return true;
      if (getComputedStyle(n).pointerEvents === 'none') return true;
      n = n.parentElement;
    }
    return false;
  };

  const tampak = (e) => {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.15) return false;
    const r = e.getBoundingClientRect();
    // Batas MENDATAR ikut diperiksa. Versi pertama hanya memeriksa batas
    // tegak, sehingga elemen yang diparkir di luar layar secara mendatar
    // (skip-link pada left:-999px) tetap terhitung terlihat.
    return r.width > 0 && r.height > 0
      && r.bottom > 0 && r.top < innerHeight
      && r.right > 0 && r.left < innerWidth;
  };

  // ── 1. luber mendatar ──
  const luber = document.documentElement.scrollWidth - innerWidth;
  let pelakuLuber = null;
  if (luber > 1) {
    let terjauh = 0;
    document.querySelectorAll('body *').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.right > terjauh && getComputedStyle(e).position !== 'fixed') {
        terjauh = r.right;
        pelakuLuber = (e.className && typeof e.className === 'string'
          ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.')
          : e.tagName.toLowerCase()) + ' →' + Math.round(r.right);
      }
    });
  }

  // ── 2. tabrakan elemen melayang yang bisa diklik ──
  //
  // Lapisan yang menutupi hampir seluruh viewport DILEWATI. Itu modal, backdrop,
  // atau layar pembuka — menutupi yang di bawahnya memang tugasnya, jadi
  // "tabrakan" dengan navbar bukan cacat. Akun.html punya #lampOverlay, layar
  // "tarik tali untuk menyalakan lampu" yang sengaja menutup halaman sampai
  // ditekan; tanpa saringan ini ia dilaporkan menabrak setiap tombol melayang
  // di halaman, empat temuan yang semuanya salah.
  const AMBANG_MODAL = 0.85;
  const melayang = [...document.querySelectorAll('body *')].filter((e) => {
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    if (r.width * r.height >= innerWidth * innerHeight * AMBANG_MODAL) return false;
    return s.position === 'fixed' && s.pointerEvents !== 'none' && tampak(e)
      && r.width > 20 && r.height > 20 && r.bottom <= innerHeight + 2 && r.top >= -2;
  }).map((e) => {
    const r = e.getBoundingClientRect();
    return {
      n: e.className && typeof e.className === 'string'
        ? e.className.trim().split(/\s+/)[0] : e.tagName.toLowerCase(),
      x: r.x, y: r.y, w: r.width, h: r.height,
    };
  });
  const tabrakan = [];
  for (let i = 0; i < melayang.length; i++) {
    for (let j = i + 1; j < melayang.length; j++) {
      const a = melayang[i], b = melayang[j];
      if (!(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)) {
        tabrakan.push(a.n + ' ✕ ' + b.n);
      }
    }
  }

  // ── 3. kontras teks ──
  const kontras = [];
  const dilihat = new Set();
  document.querySelectorAll('p,h1,h2,h3,h4,span,a,button,li,td,th,label,strong,em,div').forEach((e) => {
    if (kontras.length > 6) return;
    const langsung = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!langsung || !tampak(e) || tersembunyiEfektif(e)) return;
    if (hanyaSimbol(e.textContent.trim())) return;
    const s = getComputedStyle(e);
    const bg = latarEfektif(e);
    if (!bg) return;                       // di atas gambar/gradien — tidak dihitung
    const a = lum(s.color), b = lum(bg);
    if (a === null || b === null) return;
    const px = parseFloat(s.fontSize) || 16;
    const tebal = (parseInt(s.fontWeight) || 400) >= 700;
    const besar = px >= 24 || (px >= 18.66 && tebal);
    const k = rasio(a, b);
    const batas = besar ? AMBANG_BESAR : AMBANG;
    if (k < batas) {
      const kunci = s.color + '|' + bg + '|' + Math.round(px);
      if (dilihat.has(kunci)) return;
      dilihat.add(kunci);
      kontras.push({
        k: +k.toFixed(2), batas,
        t: e.textContent.trim().slice(0, 30).replace(/\s+/g, ' '),
        warna: s.color, bg,
      });
    }
  });

  // ── 4. sasaran sentuh (hanya mobile) ──
  const kecil = [];
  if (mobile) {
    document.querySelectorAll('a,button,[role=button],input[type=checkbox],input[type=radio]').forEach((e) => {
      if (kecil.length > 5 || !tampak(e) || tersembunyiEfektif(e)) return;
      const r = e.getBoundingClientRect();
      if (r.width < SENTUH_MIN || r.height < SENTUH_MIN) {
        kecil.push({
          n: (e.className && typeof e.className === 'string'
            ? '.' + e.className.trim().split(/\s+/)[0] : e.tagName.toLowerCase()),
          w: Math.round(r.width), h: Math.round(r.height),
          t: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18),
        });
      }
    });
  }

  return { luber: Math.max(0, luber), pelakuLuber, tabrakan, kontras, kecil };
}

(async () => {
  const berkas = daftar(process.argv[2]);
  if (!berkas.length) { console.error('Tidak ada halaman yang cocok.'); process.exit(1); }

  const browser = await chromium.launch();
  const masalah = { luber: [], tabrakan: [], kontras: [], kecil: [], error: [] };

  for (const f of berkas) {
    for (const [w, h, namaLebar] of LEBAR) {
      for (const mode of ['light', 'dark']) {
        // Kontras diperiksa di dua mode; luber & tabrakan cukup sekali (terang).
        if (mode === 'dark' && false) continue;
        const p = await browser.newPage({
          viewport: { width: w, height: h }, colorScheme: mode,
        });
        const errs = [];
        p.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
        try {
          await p.goto(`file://${ROOT}/${f}`, { waitUntil: 'load', timeout: 20000 });
          await p.waitForTimeout(700);
          // TRANSISI DIMATIKAN SEBELUM MENGUKUR.
          //
          // .kn-link punya `transition: color 120ms`. Mengganti tema lalu
          // membaca warna terlalu cepat menangkap NILAI ANTARA — warna mode
          // terang yang belum selesai berpindah ke nilai mode gelap. Itu
          // melahirkan puluhan temuan palsu yang tampak meyakinkan karena
          // pasangan warnanya nyata, hanya saja tidak pernah benar-benar
          // terlihat selama itu oleh siapa pun.
          //
          // Menunggu lebih lama menutupi gejalanya tapi tidak menghilangkan
          // kemungkinannya; mematikan transisi menghilangkan kelasnya.
          await p.addStyleTag({ content:
            '*,*::before,*::after{transition:none!important;animation:none!important}' });
          if (mode === 'dark') {
            await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
            await p.waitForTimeout(250);
          }
          const r = await p.evaluate(ukur,
            { AMBANG, AMBANG_BESAR, SENTUH_MIN, mobile: w <= 480 });
          const tag = `${f} · ${namaLebar} · ${mode}`;
          if (mode === 'light') {
            if (r.luber > 1) masalah.luber.push(`${tag}  +${r.luber}px  ${r.pelakuLuber || ''}`);
            r.tabrakan.forEach((t) => masalah.tabrakan.push(`${tag}  ${t}`));
            r.kecil.forEach((k) => masalah.kecil.push(`${tag}  ${k.n} ${k.w}×${k.h} "${k.t}"`));
          }
          r.kontras.forEach((c) => masalah.kontras.push(
            `${tag}  ${c.k}/${c.batas}  "${c.t}"  ${c.warna} di ${c.bg}`));
          if (errs.length && mode === 'light' && namaLebar === 'desktop'
              && !errs[0].includes('Failed to fetch')) {
            masalah.error.push(`${f}  ${errs[0]}`);
          }
        } catch (e) {
          masalah.error.push(`${f} · ${namaLebar}  NAVIGASI: ${e.message.split('\n')[0]}`);
        }
        await p.close();
      }
    }
    process.stdout.write('.');
  }
  await browser.close();
  console.log('\n');

  const bagian = [
    ['luber mendatar', masalah.luber],
    ['tabrakan elemen melayang', masalah.tabrakan],
    ['kontras di bawah WCAG AA', masalah.kontras],
    ['sasaran sentuh < 24px (mobile)', masalah.kecil],
    ['page error', masalah.error],
  ];
  console.log(`  ${berkas.length} halaman × 3 lebar × 2 mode\n`);
  let total = 0;
  for (const [label, arr] of bagian) {
    total += arr.length;
    console.log(`  ${String(arr.length).padStart(4)}  ${label}`);
    arr.slice(0, 10).forEach((x) => console.log(`        ${x}`));
    if (arr.length > 10) console.log(`        …dan ${arr.length - 10} lagi`);
  }
  // ── Ringkasan menurut AKAR PENYEBAB ────────────────────────────────
  // 1.332 temuan terdengar mustahil digarap, sampai dikelompokkan: hampir
  // semuanya adalah SATU pasangan warna yang berulang di ratusan halaman.
  // Yang perlu diperbaiki penyebabnya, bukan temuannya satu per satu.
  const pasangan = new Map();
  masalah.kontras.forEach((baris) => {
    const m = baris.match(/(\d+\.\d+)\/([\d.]+)\s+".*?"\s+(rgba?\([^)]*\))\s+di\s+(rgba?\([^)]*\))/);
    if (!m) return;
    const k = `${m[3]} di ${m[4]}`;
    const v = pasangan.get(k) || { n: 0, rasio: m[1], batas: m[2], halaman: new Set() };
    v.n++; v.halaman.add(baris.split(' · ')[0]);
    pasangan.set(k, v);
  });
  const urut = [...pasangan.entries()].sort((a, b) => b[1].n - a[1].n);
  if (urut.length) {
    console.log(`\n  AKAR PENYEBAB KONTRAS — ${urut.length} pasangan warna berbeda:\n`);
    urut.slice(0, 12).forEach(([k, v]) => {
      console.log(`    ${String(v.n).padStart(4)}×  rasio ${v.rasio}/${v.batas}  ${k}`);
      console.log(`          di ${v.halaman.size} halaman`);
    });
    if (urut.length > 12) console.log(`    …dan ${urut.length - 12} pasangan lain`);
  }

  const sentuh = new Map();
  masalah.kecil.forEach((b) => {
    const m = b.match(/\s(\.[\w-]+|\w+)\s(\d+)×(\d+)/);
    if (!m) return;
    const v = sentuh.get(m[1]) || { n: 0, u: `${m[2]}×${m[3]}` };
    v.n++; sentuh.set(m[1], v);
  });
  if (sentuh.size) {
    console.log(`\n  AKAR PENYEBAB SASARAN SENTUH:\n`);
    [...sentuh.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) =>
      console.log(`    ${String(v.n).padStart(4)}×  ${k}  (${v.u})`));
  }

  console.log(`\n  ${total} temuan`);
  process.exit(total === 0 ? 0 : 1);
})();
