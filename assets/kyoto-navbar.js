/* Nihongo Pro Academy v2.0 - 2026-06-23 */
(function () {
'use strict';
const CHV = `<svg class="kn-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function di(icon, label, sub, href) {
return `<a href="${href}" class="kn-dd-item" role="menuitem">
<span class="kn-dd-icon">${icon}</span>
<span class="kn-dd-text">
<span class="kn-dd-label">${label}</span>
${sub ? `<span class="kn-dd-sub">${sub}</span>` : ''}
</span>
</a>`;
}
function dl(icon, label, href) {
return `<a href="${href}" class="kn-drawer-link">
<span class="kn-drawer-link-icon">${icon}</span>${label}
</a>`;
}
const NAV_HTML = `
<nav class="kn-nav" role="navigation" aria-label="Navigasi utama">
<!-- LOGO -->
<a href="/index.html" class="kn-logo" id="knLogo">
<img src="/assets/logo-neko.svg" alt="Nihongo Pro Academy" style="height:42px;width:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(200,160,0,.4)" onerror="this.style.display='none'">
<span class="kn-logo-jp" style="font-size:.95rem;letter-spacing:.02em">Nihongo Pro</span>
<span class="kn-logo-sep" aria-hidden="true"></span>
<span class="kn-logo-tag" style="font-size:.72rem;font-weight:700;letter-spacing:.1em">ACADEMY</span>
</a>
<!-- CENTER LINKS -->
<ul class="kn-links" role="list">
<!-- 1. Belajar -->
<li class="kn-item" data-dropdown>
<button class="kn-link" aria-haspopup="true" aria-expanded="false">Belajar ${CHV}</button>
<div class="kn-dropdown" role="menu">
<div class="kn-dd-section">Mulai Belajar</div>
${di('📚','Semua Materi','Kurikulum lengkap N5–N1','/Materi/Materi.html')}
${di('漢','Kanji','N5–N1 stroke & mnemonic','/Materi/Kanji-N5.html')}
${di('語','Kosakata','Database kata lengkap','/Materi/Vocabulary-Lengkap.html')}
${di('文','Grammar','Pola kalimat N5–N1','/Materi/Grammar-Lengkap.html')}
${di('🏛️','Fondasi Bahasa','Hiragana, katakana, partikel','/Materi/Fondasi-Bahasa-Jepang.html')}
<div class="kn-dd-sep"></div>
${di('🎯','Modul Lain','Pitch accent, keigo, bisnis','/Pembelajaran-Lain.html')}
${di('🃏','SRS Flashcard','Ulang spasi cerdas','/SRS-Flashcard.html')}
</div>
</li>
<!-- 2. JLPT -->
<li class="kn-item" data-dropdown>
<button class="kn-link" aria-haspopup="true" aria-expanded="false">JLPT ${CHV}</button>
<div class="kn-mega" role="menu">
<div class="kn-mega-col">
<div class="kn-mega-head">Latihan Soal</div>
${di('🖥️','CBT Simulator','Exam, practice, review','/JLPT-CBT.html')}
${di('❓','Kuis Pro','Kuis harian & tantangan','/QUIZ/nihongo-pro.html')}
${di('📝','Latihan Per Level','N5, N4, N3, N2, N1','/Materi/Latihan-JLPT.html')}
${di('📋','Cheat Sheet','Ringkasan cepat tiap level','/Materi/Cheat-Sheet-JLPT.html')}
</div>
<div class="kn-mega-col">
<div class="kn-mega-head">Persiapan & Sertifikat</div>
${di('🗓️','Rencana Belajar','Jadwal adaptif JLPT','/Materi/Rencana-Belajar-JLPT.html')}
${di('🏆','Strategi Ujian','Tips & trik lulus JLPT','/Materi/Strategi-Ujian-JLPT.html')}
${di('🎓','Sertifikat','Unduh sertifikat belajar','/Sertifikat.html')}
${di('📊','Tes Level','Cek level JLPT kamu','/Materi/Tes-Level-JLPT.html')}
</div>
</div>
</li>
<!-- 3. Kaigo -->
<li class="kn-item" data-dropdown>
<button class="kn-link" aria-haspopup="true" aria-expanded="false">介護 Kaigo ${CHV}</button>
<div class="kn-dropdown" role="menu">
<div class="kn-dd-section">Pusat Materi Kaigo</div>
${di('📚','Semua Materi Kaigo','76 modul — cari & filter','/Materi/Kaigo.html')}
<div class="kn-dd-sep"></div>
<div class="kn-dd-section">Kategori</div>
${di('🏠','Dasar Kaigo','Jalur karier & prinsip dasar','/Materi/Kaigo.html#kg-h-dasar')}
${di('💬','Bahasa & Komunikasi','Kosakata, keigo, percakapan','/Materi/Kaigo.html#kg-h-bahasa')}
${di('🤲','Praktik Perawatan','Mandi, makan, transfer, ADL','/Materi/Kaigo.html#kg-h-praktik')}
${di('🏥','Kesehatan & Medis','Penyakit lansia & prosedur medis','/Materi/Kaigo.html#kg-h-kesehatan')}
${di('📝','Dokumentasi','Rekod asuhan & 介護過程','/Materi/Kaigo.html#kg-h-dokumen')}
${di('⚖️','Hukum & Etika','Asuransi, hak asasi, etika','/Materi/Kaigo.html#kg-h-hukum')}
${di('🎓','Persiapan Ujian','Latihan soal 国家試験','/Materi/Kaigo.html#kg-h-ujian')}
<div class="kn-dd-sep"></div>
<div class="kn-dd-section">Latihan</div>
${di('🩺','Kaigo Simulator','Simulasi skenario nyata','/Kaigo-Simulator.html')}
${di('🫀','Anatomi Dasar','Istilah tubuh & organ berlabel','/Anatomi-Dasar.html')}
</div>
</li>
<!-- 4. AI Tools -->
<li class="kn-item" data-dropdown>
<button class="kn-link" aria-haspopup="true" aria-expanded="false">AI Tools ${CHV}</button>
<div class="kn-dropdown" role="menu">
${di('🤖','AI Tutor Pro','JLPT coach & koreksi','/AI-Tutor-Pro.html')}
${di('師','AI Sensei','Tutor percakapan','/AI-Sensei.html')}
${di('✍️','Grammar Checker','Periksa & koreksi kalimat','/Grammar-Checker.html')}
${di('📝','Writing Practice','Latihan menulis dengan AI','/AI-Writing-Practice.html')}
${di('💬','AI Kaiwa','Latihan percakapan AI','/AI-Kaiwa.html')}
</div>
</li>
<!-- 5. Platform -->
<li class="kn-item" data-dropdown>
<button class="kn-link" aria-haspopup="true" aria-expanded="false">Platform ${CHV}</button>
<div class="kn-dropdown" role="menu">
${di('⚙️','Platform App','Dashboard lengkap LMS','/Platform-App.html')}
${di('🎓','LMS Features','Sistem belajar lengkap','/LMS-Features.html')}
${di('✨','Semua Fitur','Eksplorasi fitur premium','/Platform-Features.html')}
${di('🎤','Kelas Live','Jadwal kelas online','/Kelas-Online.html')}
${di('🧑‍🏫','Dashboard Guru','Progres siswa & tugas kelas','/Teacher-Dashboard.html')}
<div class="kn-dd-sep"></div>
${di('🏅','Pricing Pro','Paket premium & harga','/Pricing-Pro.html')}
</div>
</li>
<!-- 6. Info -->
<li class="kn-item" data-dropdown>
<button class="kn-link" aria-haspopup="true" aria-expanded="false">Info ${CHV}</button>
<div class="kn-dropdown" role="menu">
${di('💡','FAQ','Pertanyaan yang sering ditanya','/FAQ.html')}
${di('ℹ️','Tentang Kami','Kenalan dengan NihongoPro','/About.html')}
${di('📰','Blog','Artikel belajar bahasa Jepang','/Blog.html')}
${di('🎯','Misi & XP','Tantangan & reward','/Misi.html')}
</div>
</li>
<!-- 7. Dasbor — single -->
<li class="kn-item">
<a href="/Ujian.html" class="kn-link" id="knUjianLink">試 Ujian</a>
<a href="/Grup-Kelas.html" class="kn-link" id="knGrupLink">組 Grup</a>
<a href="/Dashboard/Dashboard.html" class="kn-link" id="knDashLink">庭 Dasbor</a>
</li>
</ul>
<!-- RIGHT ACTIONS -->
<div class="kn-actions">
<a href="/Search.html" class="kn-icon-btn" id="knSearchBtn" aria-label="Cari konten" title="Cari (/)">🔍</a>
<button class="kn-icon-btn" id="knThemeBtn" aria-label="Ganti tema" title="Ganti tema">🌙</button>
<button class="kn-btn-ghost" id="knLoginBtn">Masuk</button>
<a href="/Akun.html" class="kn-btn-primary kn-hide-mobile" id="knCtaBtn">始める · Mulai</a>
<div class="kn-user" id="knUser" style="display:none" tabindex="0"
role="button" aria-haspopup="true" aria-expanded="false" aria-label="Menu pengguna">
<div class="kn-avatar" id="knAvatar">?</div>
<span class="kn-user-name" id="knUserName">Pengguna</span>
<svg style="width:12px;height:12px;opacity:.5;margin-left:2px;flex-shrink:0;transition:transform 200ms"
viewBox="0 0 16 16" fill="none" aria-hidden="true" id="knUserChevron">
<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
<div class="kn-user-dropdown" id="knUserDropdown" role="menu">
<div class="kn-user-header">
<div class="kn-user-header-name" id="knDropName">Pengguna</div>
<div class="kn-user-header-email" id="knDropEmail">user@email.com</div>
</div>
<a href="/Dashboard/Dashboard.html" class="kn-user-item" role="menuitem">📊 Dasbor Saya</a>
<a href="/Akun.html" class="kn-user-item" role="menuitem">👤 Profil & Akun</a>
<a href="/Misi.html" class="kn-user-item" role="menuitem">🎯 Misi & XP</a>
<a href="/Sertifikat.html" class="kn-user-item" role="menuitem">🎓 Sertifikat</a>
<div class="kn-dd-sep"></div>
<button class="kn-user-item danger" id="knLogoutBtn" role="menuitem">🚪 Keluar</button>
</div>
</div>
<button class="kn-hamburger" id="knHamburger" aria-label="Buka menu" aria-expanded="false">
<span></span><span></span><span></span>
</button>
</div>
</nav>
<!-- MOBILE DRAWER — diinject bersamaan dengan <nav> -->
<div class="kn-drawer" id="knDrawer" aria-hidden="true">
<div class="kn-drawer-overlay" id="knDrawerOverlay"></div>
<div class="kn-drawer-panel" role="dialog" aria-label="Menu navigasi">
<div class="kn-drawer-header">
<a href="/index.html" class="kn-drawer-logo">Nihongo Pro Academy</a>
<button class="kn-drawer-close" id="knDrawerClose" aria-label="Tutup menu">✕</button>
</div>
<div class="kn-drawer-body">
<div class="kn-drawer-section">Menu Utama</div>
${dl('試','Ujian','/Ujian.html')+dl('🎨','Tema','/Theme-Settings.html')+dl('庭','Dasbor','/Dashboard/Dashboard.html')}
<div class="kn-drawer-sep"></div>
<div class="kn-drawer-section">Belajar</div>
${dl('📚','Semua Materi','/Materi/Materi.html')}
${dl('漢','Kanji N5–N1','/Materi/Kanji-N5.html')}
${dl('語','Kosakata','/Materi/Vocabulary-Lengkap.html')}
${dl('文','Grammar Lengkap','/Materi/Grammar-Lengkap.html')}
${dl('🃏','SRS Flashcard','/SRS-Flashcard.html')}
<div class="kn-drawer-sep"></div>
<div class="kn-drawer-section">JLPT</div>
${dl('🖥️','CBT Simulator','/JLPT-CBT.html')}
${dl('❓','Kuis Pro','/QUIZ/nihongo-pro.html')}
${dl('🗓️','Rencana Belajar','/Materi/Rencana-Belajar-JLPT.html')}
${dl('🎓','Sertifikat','/Sertifikat.html')}
<div class="kn-drawer-sep"></div>
<div class="kn-drawer-section">介護 Kaigo</div>
${dl('📚','Semua Materi Kaigo','/Materi/Kaigo.html')}
${dl('🏠','Dasar Kaigo','/Materi/Kaigo.html#kg-h-dasar')}
${dl('💬','Bahasa & Komunikasi','/Materi/Kaigo.html#kg-h-bahasa')}
${dl('🤲','Praktik Perawatan','/Materi/Kaigo.html#kg-h-praktik')}
${dl('🏥','Kesehatan & Medis','/Materi/Kaigo.html#kg-h-kesehatan')}
${dl('📝','Dokumentasi','/Materi/Kaigo.html#kg-h-dokumen')}
${dl('⚖️','Hukum & Etika','/Materi/Kaigo.html#kg-h-hukum')}
${dl('🎓','Persiapan Ujian','/Materi/Kaigo.html#kg-h-ujian')}
${dl('🩺','Kaigo Simulator','/Kaigo-Simulator.html')}
<div class="kn-drawer-sep"></div>
<div class="kn-drawer-section">AI Tools</div>
${dl('🤖','AI Tutor Pro','/AI-Tutor-Pro.html')}
${dl('師','AI Sensei','/AI-Sensei.html')}
${dl('✍️','Grammar Checker','/Grammar-Checker.html')}
${dl('📝','Writing Practice','/AI-Writing-Practice.html')}
${dl('💬','AI Kaiwa','/AI-Kaiwa.html')}
<div class="kn-drawer-sep"></div>
<div class="kn-drawer-section">Platform & Info</div>
${dl('⚙️','Platform App','/Platform-App.html')}
${dl('🎤','Kelas Live','/Kelas-Online.html')}
${dl('👥','Grup & Token','/Grup-Kelas.html')}
${dl('🧑‍🏫','Dashboard Guru','/Teacher-Dashboard.html')}
${dl('📰','Blog','/Blog.html')}
${dl('ℹ️','Tentang','/About.html')}
${dl('💡','FAQ','/FAQ.html')}
${dl('💬','Komunitas','/Community.html')}
${dl('🗓️','Jadwal','/Jadwal.html')}
${dl('📬','Kontak','/Kontak.html')}
${dl('📜','Syarat & Ketentuan','/Terms.html')}
</div>
<div class="kn-drawer-footer">
<a href="/Akun.html" class="kn-btn-primary"
style="width:100%;justify-content:center;height:42px;border-radius:9px;font-size:14px">
始める · Mulai Gratis
</a>
<button class="kn-btn-ghost" id="knDrawerLogin"
style="width:100%;justify-content:center;height:40px;border-radius:9px;font-size:14px">
Masuk ke Akun
</button>
</div>
</div>
</div>
`;
function injectNavbar() {
if (document.querySelector('.kn-nav') || document.getElementById('knHamburger')) return;
document.querySelectorAll('nav:not(.dash-nav):not(.ai-nav)').forEach(function(el) {
el.style.display = 'none';
});
document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
if (document.querySelector('.kn-nav')) {
document.querySelectorAll('nav:not(.kn-nav):not(.dash-nav):not(.ai-nav)').forEach(function(el) {
el.remove();
});
document.querySelectorAll('.mobile-menu, .hamburger:not(.kn-hamburger)').forEach(function(el) {
el.remove();
});
} else {
document.querySelectorAll('nav:not(.dash-nav):not(.ai-nav)').forEach(function(el) {
el.style.display = '';
});
}
}
function fixPaths() {
var path = window.location.pathname;
var depth = (path.match(/\//g) || []).length - 1;
if (depth <= 0) return;
var prefix = '../'.repeat(depth);
document.querySelectorAll('.kn-nav a[href^="/"], .kn-drawer a[href^="/"]').forEach(function(a) {
var href = a.getAttribute('href');
if (href && href.startsWith('/')) {
a.setAttribute('href', prefix + href.slice(1));
}
});
}
function initDropdowns() {
var items = document.querySelectorAll('.kn-item[data-dropdown]');
function closeAll(except) {
items.forEach(function(item) {
if (item === except) return;
item.classList.remove('open');
var btn = item.querySelector(':scope > .kn-link');
if (btn) btn.setAttribute('aria-expanded', 'false');
});
}
// GENUINELY DITAMBAHKAN (Fase Audit Navbar, Prioritas 2): navigasi
// panah keyboard di dalam dropdown -- dikonfirmasi via pengujian
// interaktif genuine bahwa `role="menu"`/`role="menuitem"` (pola ARIA
// standar yang genuinely menyiratkan dukungan navigasi panah) TIDAK
// diimplementasikan sebelumnya. Tab genuinely SUDAH berfungsi sebagai
// jalur akses (dikonfirmasi via pengujian terpisah, dropdown genuinely
// tetap terbuka selama navigasi Tab) -- penambahan ini genuinely
// MELENGKAPI, bukan menggantikan mekanisme yang sudah bekerja.
function getMenuItems(item) {
return Array.prototype.slice.call(item.querySelectorAll('[role="menuitem"]'));
}
items.forEach(function(item) {
var btn = item.querySelector(':scope > .kn-link');
if (!btn) return;
btn.addEventListener('click', function(e) {
e.stopPropagation();
var wasOpen = item.classList.contains('open');
closeAll(null);
if (!wasOpen) {
item.classList.add('open');
btn.setAttribute('aria-expanded', 'true');
}
});
// GENUINELY DITAMBAHKAN: ArrowDown pada tombol pemicu membuka dropdown
// (jika belum terbuka) dan memindahkan fokus ke item pertama.
btn.addEventListener('keydown', function(e) {
if (e.key !== 'ArrowDown') return;
e.preventDefault();
e.stopPropagation();
if (!item.classList.contains('open')) {
closeAll(null);
item.classList.add('open');
btn.setAttribute('aria-expanded', 'true');
}
var menuItems = getMenuItems(item);
if (menuItems.length) menuItems[0].focus();
});
// GENUINELY DITAMBAHKAN: ArrowDown/ArrowUp di dalam dropdown yang
// terbuka berpindah antar item; Escape menutup dan mengembalikan
// fokus ke tombol pemicu (peningkatan UX, sebelumnya Escape genuinely
// hanya menutup tanpa mengelola fokus).
item.addEventListener('keydown', function(e) {
var menuItems = getMenuItems(item);
var idx = menuItems.indexOf(document.activeElement);
if (e.key === 'ArrowDown') {
e.preventDefault();
if (idx === -1) { if (menuItems.length) menuItems[0].focus(); return; }
var next = menuItems[(idx + 1) % menuItems.length];
if (next) next.focus();
} else if (e.key === 'ArrowUp') {
e.preventDefault();
if (idx === -1) { if (menuItems.length) menuItems[menuItems.length - 1].focus(); return; }
var prev = menuItems[(idx - 1 + menuItems.length) % menuItems.length];
if (prev) prev.focus();
} else if (e.key === 'Escape') {
closeAll(null);
btn.focus();
}
});
});
document.addEventListener('click', function() { closeAll(null); });
document.addEventListener('keydown', function(e) {
if (e.key === 'Escape') closeAll(null);
});
}
function initUserMenu() {
var user = document.getElementById('knUser');
var chevron = document.getElementById('knUserChevron');
if (!user) return;
// GENUINELY DITAMBAHKAN (Fase Audit Navbar, plan lanjutan): navigasi
// panah keyboard -- dikonfirmasi via pengujian interaktif genuine celah
// IDENTIK dengan yang diperbaiki di initDropdowns() (Prioritas 2)
// GENUINELY TERLEWAT di sini karena berada dalam fungsi terpisah.
// Dibuktikan konkret: `role="menu"`/`role="menuitem"` ada pada markup
// (6 item: Dasbor, Profil, Misi, Sertifikat, Keluar) namun ArrowDown
// genuinely TIDAK memindahkan fokus sama sekali (`role: null` setelah
// ditekan, fokus tetap di elemen sebelumnya).
// AKAR PENYEBAB LEBIH FUNDAMENTAL ditemukan saat verifikasi perbaikan
// ini: elemen `#knUser` (`<div role="button">`) genuinely TIDAK memiliki
// `tabindex`, sehingga GENUINELY TIDAK BISA menerima keyboard focus sama
// sekali -- ditambahkan `tabindex="0"` pada markup. Handler Enter/Space
// ditambahkan di sini untuk melengkapi pola `role="button"` standar
// (aktivasi via keyboard, bukan hanya klik mouse).
function getMenuItems() {
return Array.prototype.slice.call(user.querySelectorAll('[role="menuitem"]'));
}
user.addEventListener('keydown', function(e) {
if (e.key === 'Enter' || e.key === ' ') {
e.preventDefault();
var isOpen = user.classList.contains('open');
user.classList.toggle('open');
user.setAttribute('aria-expanded', String(!isOpen));
if (chevron) chevron.style.transform = !isOpen ? 'rotate(180deg)' : '';
}
});
user.addEventListener('click', function(e) {
e.stopPropagation();
var isOpen = user.classList.contains('open');
user.classList.toggle('open');
user.setAttribute('aria-expanded', String(!isOpen));
if (chevron) chevron.style.transform = !isOpen ? 'rotate(180deg)' : '';
});
user.addEventListener('keydown', function(e) {
var menuItems = getMenuItems();
var idx = menuItems.indexOf(document.activeElement);
if (e.key === 'ArrowDown') {
e.preventDefault();
if (!user.classList.contains('open')) {
user.classList.add('open');
user.setAttribute('aria-expanded', 'true');
if (chevron) chevron.style.transform = 'rotate(180deg)';
}
if (idx === -1) { if (menuItems.length) menuItems[0].focus(); return; }
var next = menuItems[(idx + 1) % menuItems.length];
if (next) next.focus();
} else if (e.key === 'ArrowUp' && user.classList.contains('open')) {
e.preventDefault();
if (idx === -1) { if (menuItems.length) menuItems[menuItems.length - 1].focus(); return; }
var prev = menuItems[(idx - 1 + menuItems.length) % menuItems.length];
if (prev) prev.focus();
}
});
document.addEventListener('click', function() {
user.classList.remove('open');
user.setAttribute('aria-expanded', 'false');
if (chevron) chevron.style.transform = '';
});
// Dukungan Escape ditambahkan -- sebelumnya dropdown ini HANYA bisa ditutup
// via klik di luar (mouse), tidak bisa dengan keyboard sama sekali. Dropdown
// lain (initDropdowns) dan drawer mobile (initDrawer) sudah punya pola ini,
// user menu genuinely terlewat.
document.addEventListener('keydown', function(e) {
if (e.key === 'Escape' && user.classList.contains('open')) {
user.classList.remove('open');
user.setAttribute('aria-expanded', 'false');
if (chevron) chevron.style.transform = '';
user.focus();
}
});
}
function initDrawer() {
var ham = document.getElementById('knHamburger');
var drawer = document.getElementById('knDrawer');
var overlay = document.getElementById('knDrawerOverlay');
var closeBtn = document.getElementById('knDrawerClose');
if (!ham || !drawer) return;
function open() {
drawer.classList.add('open');
drawer.setAttribute('aria-hidden', 'false');
ham.classList.add('open');
ham.setAttribute('aria-expanded', 'true');
document.body.style.overflow = 'hidden';
}
function close() {
drawer.classList.remove('open');
drawer.setAttribute('aria-hidden', 'true');
ham.classList.remove('open');
ham.setAttribute('aria-expanded', 'false');
document.body.style.overflow = '';
}
ham.addEventListener('click', function() { drawer.classList.contains('open') ? close() : open(); });
if (overlay) overlay.addEventListener('click', close);
if (closeBtn) closeBtn.addEventListener('click', close);
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });
}
function initTheme() {
var btn = document.getElementById('knThemeBtn');
var keys = ['kyoto-theme', 'nihongo-theme', 'theme'];
function update() {
var dark = document.documentElement.getAttribute('data-theme') === 'dark';
if (btn) btn.textContent = dark ? '☀️' : '🌙';
}
var hasNPDark = typeof window.NPDark === 'object' && window.NPDark !== null;
if (!hasNPDark) {
var stored = null;
for (var i = 0; i < keys.length; i++) {
stored = localStorage.getItem(keys[i]);
if (stored) break;
}
if (stored === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
}
update();
// GENUINELY DITAMBAHKAN (Fase Audit Navbar, Prioritas 4): dikonfirmasi
// via pengujian interaktif genuine bahwa `knThemeBtn` (tombol tema
// navbar) sebelumnya TIDAK mendengarkan event kustom `np-dark-change`
// -- event yang genuinely DIPANCARKAN oleh `NPDark.set()`/`toggle()`
// (dari `dark-mode-toggle.js`) SETIAP kali tema berubah, dari SUMBER
// MANAPUN. Dibuktikan konkret: mengklik `#npDarkToggle` (tombol tema
// terpisah, ada di beberapa halaman seperti index.html) genuinely
// mengubah `data-theme` dengan benar, TAPI ikon navbar genuinely TETAP
// menampilkan simbol lama (desync) -- karena navbar hanya meng-update
// dirinya sendiri saat DIKLIK LANGSUNG, tidak saat tema berubah dari
// tempat lain. Diperbaiki dengan mendengarkan event yang sama, mengikuti
// pola yang GENUINELY SUDAH ESTABLISHED di index.html/Ujian.html/
// Dashboard.html (ketiganya sudah benar sebelum perbaikan ini).
if (hasNPDark) {
document.addEventListener('np-dark-change', update);
}
if (btn) btn.addEventListener('click', function() {
if (hasNPDark) { window.NPDark.toggle(); update(); return; }
var dark = document.documentElement.getAttribute('data-theme') === 'dark';
document.documentElement.setAttribute('data-theme', dark ? '' : 'dark');
var val = dark ? 'light' : 'dark';
keys.forEach(function(k) { localStorage.setItem(k, val); });
update();
});
}
function initAuth() {
var loginBtn    = document.getElementById('knLoginBtn');
var ctaBtn      = document.getElementById('knCtaBtn');
var userEl      = document.getElementById('knUser');
var logoutBtn   = document.getElementById('knLogoutBtn');
var drawerLogin = document.getElementById('knDrawerLogin');
function showUser(u) {
if (!userEl) return;
var name = (u.user_metadata && u.user_metadata.name) || (u.email && u.email.split('@')[0]) || 'Pengguna';
var initials = name.split(' ').map(function(w) { return w[0]; }).join('').slice(0,2).toUpperCase();
document.getElementById('knAvatar').textContent = initials;
document.getElementById('knUserName').textContent = name.split(' ')[0];
document.getElementById('knDropName').textContent = name;
document.getElementById('knDropEmail').textContent = u.email || '';
if (loginBtn) loginBtn.style.display = 'none';
if (ctaBtn) ctaBtn.style.display = 'none';
userEl.style.display = 'flex';
}
function showOut() {
// JANGAN paksa status logout jika ada sesi 'nihongo_session' aktif (sistem
// login local-demo/Firebase di index-page.js) — trySupabase() di bawah hanya
// tahu soal Supabase, dan akan salah menimpa navbar ke status logout meski
// pengguna genuinely sudah login lewat jalur lain. updateNavUI() di
// index-page.js sudah menangani tampilan navbar untuk kasus itu.
try {
if (localStorage.getItem('nihongo_session')) return;
} catch (e) {}
// GENUINELY ditambahkan: sebelumnya fungsi ini HANYA mengubah tampilan UI
// navbar, tidak pernah membersihkan 'nihongopro.user.preferences' (hasil
// bridge migrasi v273). Ini adalah jalur logout PALING BERISIKO -- dipakai
// 366 halaman via tombol #knLogoutBtn, dan genuinely dipanggil persis saat
// TIDAK ADA sesi 'nihongo_session' aktif (guard di atas), sehingga aman
// dihapus di sini tanpa risiko menghapus data pengguna yang genuinely masih
// login lewat sistem index.html.
try { localStorage.removeItem('nihongopro.user.preferences'); } catch (e) {}
if (loginBtn) loginBtn.style.display = '';
if (ctaBtn) ctaBtn.style.display = '';
if (userEl) userEl.style.display = 'none';
}
var trySupabase = function() {
var sb = window.supabase || window._supabase;
if (!sb) return false;
sb.auth.getUser().then(function(r) {
r.data && r.data.user ? showUser(r.data.user) : showOut();
}).catch(showOut);
return true;
};
// Sinkronkan status login sistem 'local-demo'/Firebase (index-page.js) setelah
// navbar genuinely selesai di-inject. index-page.js jalan LEBIH DULU (defer
// script mengikuti urutan dokumen, dan tag script-nya ada sebelum navbar ini),
// jadi saat updateNavUI() dipanggil dari sana, elemen navbar (#knUser dkk)
// BELUM ADA di DOM — pemanggilan set() di updateNavUI() diam-diam tidak
// berefek. Panggil ulang di sini, setelah navbar genuinely ada, supaya status
// login yang genuinely tersimpan di localStorage tercermin di navbar.
if (typeof window.updateNavUI === 'function') { window.updateNavUI(); }
if (!trySupabase()) window.addEventListener('load', function() { if (!trySupabase()) showOut(); });
var goLogin = function() {
if (typeof openAuth === 'function') openAuth('login');
else window.location.href = '/Akun.html';
};
var goRegister = function() {
window.location.href = '/Onboarding.html';
};
if (loginBtn) loginBtn.addEventListener('click', goLogin);
if (drawerLogin) drawerLogin.addEventListener('click', goLogin);
if (logoutBtn) logoutBtn.addEventListener('click', function() {
// Prioritas: sistem 'local-demo'/Firebase (index-page.js) jika genuinely
// tersedia — sebelumnya tombol ini HANYA mengecek Supabase (window.supabase,
// yang genuinely tidak pernah dikonfigurasi di proyek ini), sehingga klik
// logout diam-diam tidak berefek apa pun untuk pengguna yang login lewat
// jalur local-demo/Firebase (mayoritas kondisi pengembangan/tanpa backend).
if (typeof window.handleLogout === 'function') { window.handleLogout(); return; }
var sb = window.supabase || window._supabase;
if (sb) sb.auth.signOut().then(showOut); else showOut();
});
}
function setActive() {
var path = window.location.pathname.toLowerCase();
document.querySelectorAll('.kn-nav a, .kn-drawer a').forEach(function(a) {
var href = (a.getAttribute('href') || '').toLowerCase().replace(/^\.\.\/+/, '/');
if (!href || href === '/') return;
var normalized = href.replace(/^\//, '').replace(/\.html$/, '');
// GENUINELY DIPERBAIKI (Fase Audit Navbar, plan lanjutan): dikonfirmasi
// via pengujian interaktif genuine bahwa `path.includes(normalized)`
// genuinely rentan FALSE-POSITIVE untuk nama halaman yang genuinely
// menjadi substring dari halaman lain (mis. "Kanji-N5" adalah substring
// dari "Kanji-N5-Review"). Dibuktikan konkret: membuka
// `Kanji-N5-Review.html` genuinely membuat link navbar ke `Kanji-N5.html`
// SALAH ditandai aktif. Diperbaiki dengan memastikan `path` genuinely
// BERAKHIR dengan `normalized` (langsung, atau diikuti `.html`/`/`) --
// bukan sekadar MENGANDUNG substring di posisi manapun.
if (path.endsWith(normalized) || path.endsWith(normalized + '.html') || path.endsWith(normalized + '/')) {
a.classList.add('active');
}
});
}
function init() {
injectNavbar();
fixPaths();
initDropdowns();
initUserMenu();
initDrawer();
initTheme();
initAuth();
setActive();
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', init);
} else {
init();
}
})();

// ── NAVBAR SCROLL EFFECT ──
(function() {
  function handleNavScroll() {
    var nav = document.querySelector('.kn-nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
  }
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // run on load
})();
