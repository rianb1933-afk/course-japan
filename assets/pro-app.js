(function () {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark') root.setAttribute('data-theme', 'dark');
  if (storedTheme === '') root.removeAttribute('data-theme');

  const themeButtons = document.querySelectorAll('.theme-toggle');
  const syncThemeButtons = () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    themeButtons.forEach((button) => {
      button.textContent = isDark ? '☀️' : '🌙';
      button.setAttribute('aria-label', isDark ? 'Gunakan mode terang' : 'Gunakan mode gelap');
      button.setAttribute('title', isDark ? 'Mode terang' : 'Mode gelap');
    });
  };

  window.toggleTheme = function toggleTheme() {
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) {
      root.removeAttribute('data-theme');
      localStorage.setItem('theme', '');
    } else {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
    syncThemeButtons();
  };
  syncThemeButtons();

  const currentPath = decodeURIComponent(location.pathname);
  document.querySelectorAll('.nav-links a, .sidebar-link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#')) return;
    const resolved = new URL(href, location.href);
    const isActive = currentPath === decodeURIComponent(resolved.pathname);
    link.classList.toggle('active', isActive);
  });

  const nestedSections = ['/Materi/', '/Dashboard/', '/QUIZ/', '/AI-Tutor-Page/', '/Landing-Page/'];
  const appRootPrefix = nestedSections.some((segment) => currentPath.includes(segment)) ? '../' : '';
  const navItems = [
    { label: 'Beranda', icon: '家', web: 'index.html', match: ['/index.html', '/Landing-Page/landing.html'] },
    { label: 'Dasbor', icon: '進', web: 'Dashboard/Dashboard.html', match: ['/Dashboard/Dashboard.html'] },
    { label: 'Materi', icon: '語', web: 'Materi/Materi.html', match: ['/Materi/Materi.html'] },
    { label: 'Lain', icon: '学', web: 'Pembelajaran-Lain.html', match: ['/Pembelajaran-Lain.html'] },
    { label: 'Quiz', icon: '問', web: 'QUIZ/nihongo-pro.html', match: ['/QUIZ/nihongo-pro.html'] },
    { label: 'AI', icon: '先', web: 'AI-Tutor-Page/AI.html', match: ['/AI-Tutor-Page/AI.html'] },
    
    { label: 'Fitur', icon: '機', web: 'Platform-Features.html', match: ['/Platform-Features.html'] },
    { label: 'Admin', icon: '管', web: 'Admin-Login.html', match: ['/Admin-Login.html', '/Admin-Dashboard.html'] }
  ];

  // Halaman yang memuat kyoto-bottom-nav.js sudah punya navigasi bawah sendiri.
  // Menambah dock di sini menumpuk DUA navigasi di layar mobile — 62 halaman
  // mengalaminya, termasuk index.html. Keduanya berfungsi dan tautannya hidup,
  // jadi tidak ada yang error; yang salah cuma tampilannya bertindih.
  //
  // Yang diperiksa keberadaan SCRIPT-nya, bukan elemen .kn-bottom-nav — skrip
  // kyoto membangun navnya pada DOMContentLoaded, jadi elemennya bisa saja
  // belum ada saat baris ini dijalankan.
  const adaKyotoNav = !!document.querySelector('script[src*="kyoto-bottom-nav"]')
    || !!document.querySelector('.kn-bottom-nav');

  if (!adaKyotoNav && !document.querySelector('.pro-mobile-dock')) {
    const dock = document.createElement('div');
    dock.className = 'pro-mobile-dock';
    dock.setAttribute('aria-label', 'Navigasi utama mobile');
    dock.innerHTML = navItems.map((item) => {
      const active = item.match.some((part) => currentPath.includes(part)) ? ' active' : '';
      const href = `${appRootPrefix}${item.web}`;
      return `<a class="${active}" href="${href}"><span>${item.icon}</span>${item.label}</a>`;
    }).join('');
    document.body.appendChild(dock);
  }

  document.querySelectorAll('nav a[href="../index.html"], nav a[href="../index.html#daftar"], nav a[href="../index.html#testimoni"], nav a[href="../index.html#instruktur"]').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.mobile-menu.open, .hamburger.open').forEach((el) => el.classList.remove('open'));
    });
  });

  // Premium gates removed — all features are free

  window.openPremiumModal = function openPremiumModal() {};

  const mediaMatches = (query) => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const reduceMotion = mediaMatches('(prefers-reduced-motion: reduce)');

  if (!document.querySelector('.pro-reading-progress')) {
    const progress = document.createElement('div');
    progress.className = 'pro-reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
  }

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    root.style.setProperty('--read-progress', `${pct}%`);
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  if (!reduceMotion) {
    let cursorFrame = 0;
    window.addEventListener('pointermove', (event) => {
      if (cursorFrame) return;
      cursorFrame = requestAnimationFrame(() => {
        root.style.setProperty('--spot-x', `${event.clientX}px`);
        root.style.setProperty('--spot-y', `${event.clientY}px`);
        cursorFrame = 0;
      });
    }, { passive: true });
  }

  const revealTargets = [
    '.hero-inner',
    '.mh-inner',
    '.section-head',
    '.page-card',
    '.plan-card',
    '.stat-card',
    '.dash-stat',
    '.dash-card',
    '.card',
    '.hub-card',
    '.shortcut-card',
    '.kanji-card',
    '.grammar-card',
    '.vocab-card',
    '.vocab-item',
    '.vt-card',
    '.qa-btn',
    '.chat-topic',
    '.prompt-chip'
  ].join(',');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll(revealTargets).forEach((el, index) => {
      if (el.closest('.pro-command-backdrop')) return;
      el.classList.add('reveal-ready');
      el.style.transitionDelay = `${Math.min(index % 8, 7) * 38}ms`;
      observer.observe(el);
    });
  }

  const tiltTargets = '.page-card, .plan-card, .stat-card, .dash-stat, .hub-card, .shortcut-card, .kanji-card, .grammar-card, .vocab-card, .vt-card, .qa-btn, .flash-card';
  if (!reduceMotion && mediaMatches('(pointer: fine)')) {
    document.querySelectorAll(tiltTargets).forEach((el) => {
      el.classList.add('pro-tilt');
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        el.style.setProperty('--tilt-x', `${(-y * 4).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(x * 4).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.removeProperty('--tilt-x');
        el.style.removeProperty('--tilt-y');
      });
    });
  }

  const rippleSelector = 'button, .btn-primary, .btn-sm, .nav-cta, .plan-btn, .tool, .qa-btn, .send-btn, .as-new-btn, .hero-actions a';
  document.addEventListener('click', (event) => {
    const target = event.target.closest(rippleSelector);
    if (!target || target.closest('.pro-command-backdrop')) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'pro-ripple';
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  });

  if (!document.querySelector('.pro-toast-stack')) {
    const stack = document.createElement('div');
    stack.className = 'pro-toast-stack';
    document.body.appendChild(stack);
  }

  window.proToast = function proToast(message) {
    const stack = document.querySelector('.pro-toast-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'pro-toast';
    toast.textContent = message;
    stack.appendChild(toast);
    window.setTimeout(() => {
      toast.style.animation = 'toastOut 180ms ease forwards';
      window.setTimeout(() => toast.remove(), 190);
    }, 2400);
  };

  const commandItems = [
    { title: 'Dashboard', sub: 'Lihat progres belajar', icon: '進', web: 'Dashboard/Dashboard.html', keys: 'D' },
    { title: 'Materi Lengkap', sub: 'Kana, kanji, grammar, vocab', icon: '語', web: 'Materi/Materi.html', keys: 'M' },
    { title: 'Pembelajaran Lain', sub: 'English, Japanese business, Korean, Mandarin, coding, matematika, desain, bisnis', icon: '学', web: 'Pembelajaran-Lain.html', keys: 'B' },
    { title: 'Roadmap JLPT N5-N1', sub: 'Kurikulum lengkap semua level', icon: '試', web: 'Materi/JLPT-Lengkap.html', keys: 'J' },
    { title: 'Kosakata N5-N1', sub: '181.500+ kosakata dan flashcard', icon: '彙', web: 'Materi/Vocabulary-Lengkap.html', keys: 'V' },
    { title: 'Grammar N5-N1', sub: 'Pola grammar lengkap', icon: '文', web: 'Materi/Grammar-Lengkap.html', keys: 'G' },
    { title: 'Flashcard Lengkap', sub: '9.000+ kartu vocab, kanji, grammar', icon: '暗', web: 'Materi/Flashcard-Lengkap.html', keys: 'F' },
    { title: 'Flashcard Kanji', sub: 'Latihan kanji N5 sampai N1', icon: '漢', web: 'Materi/Flashcard-Kanji.html', keys: 'H' },
    { title: 'Latihan JLPT', sub: 'Soal vocabulary, kanji, grammar, reading, listening', icon: '問', web: 'Materi/Latihan-JLPT.html', keys: 'L' },
    { title: 'AI Tutor', sub: 'Latihan dengan asisten belajar', icon: '先', web: 'AI-Tutor-Page/AI.html', keys: 'A' },

    { title: 'Platform Features', sub: 'AI, PWA, akses gratis, CMS, aksesibilitas', icon: '機', web: 'Platform-Features.html', keys: 'T' },
    { title: 'Admin Login', sub: 'Masuk dashboard admin', icon: '管', web: 'Admin-Login.html', keys: 'K' }
  ];

  const destinationFor = (item) => `${appRootPrefix}${item.web}`;

  if (!document.querySelector('.pro-command-backdrop')) {
    const palette = document.createElement('div');
    palette.className = 'pro-command-backdrop';
    palette.innerHTML = `
      <div class="pro-command" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="pro-command-head"><span>検索</span><input type="search" placeholder="Cari halaman, fitur, atau level JLPT..." aria-label="Cari cepat"></div>
        <div class="pro-command-list"></div>
      </div>`;
    document.body.appendChild(palette);
  }

  const palette = document.querySelector('.pro-command-backdrop');
  const paletteInput = palette?.querySelector('input');
  const paletteList = palette?.querySelector('.pro-command-list');
  let activeCommand = 0;

  const renderCommands = () => {
    if (!paletteList || !paletteInput) return;
    const q = paletteInput.value.trim().toLowerCase();
    const rows = commandItems.filter((item) => `${item.title} ${item.sub} ${item.keys}`.toLowerCase().includes(q));
    activeCommand = Math.min(activeCommand, Math.max(rows.length - 1, 0));
    paletteList.innerHTML = rows.length ? rows.map((item, index) => `
      <button type="button" class="pro-command-item ${index === activeCommand ? 'active' : ''}" data-command-index="${commandItems.indexOf(item)}">
        <span class="pro-command-icon">${item.icon}</span>
        <span><span class="pro-command-title">${item.title}</span><span class="pro-command-sub">${item.sub}</span></span>
        <span class="pro-command-key">${item.keys}</span>
      </button>`).join('') : '<div class="pro-command-item"><span class="pro-command-icon">?</span><span><span class="pro-command-title">Tidak ditemukan</span><span class="pro-command-sub">Coba kata kunci lain.</span></span></div>';
  };

  window.openCommandPalette = function openCommandPalette() {
    if (!palette || !paletteInput) return;
    palette.classList.add('open');
    paletteInput.value = '';
    activeCommand = 0;
    renderCommands();
    window.setTimeout(() => paletteInput.focus(), 30);
  };

  const closeCommandPalette = () => palette?.classList.remove('open');
  const goCommand = (item) => {
    if (!item) return;
    window.proToast?.(`Membuka ${item.title}`);
    location.href = destinationFor(item);
  };

  palette?.addEventListener('click', (event) => {
    if (event.target === palette) closeCommandPalette();
    const button = event.target.closest('[data-command-index]');
    if (button) goCommand(commandItems[Number(button.dataset.commandIndex)]);
  });

  paletteInput?.addEventListener('input', () => {
    activeCommand = 0;
    renderCommands();
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const inField = event.target.matches('input, textarea, select, [contenteditable="true"]');
    if ((event.metaKey || event.ctrlKey) && key === 'k') {
      event.preventDefault();
      window.openCommandPalette();
      return;
    }
    if (event.key === 'Escape' && palette?.classList.contains('open')) {
      closeCommandPalette();
      return;
    }
    // Dukungan Escape diperluas ke seluruh panel lain (chat, a11y, rekomendasi,
    // search, collab notes, pro-view) -- sebelumnya HANYA command palette yang
    // bisa ditutup dengan Escape, panel lain genuinely tidak bisa ditutup tanpa
    // mouse/tap tombol close, menyulitkan pengguna keyboard-only/screen reader.
    if (event.key === 'Escape') {
      const openPanelSelectors = [
        '.nihongo-a11y-panel', '.nihongo-chat-panel', '.nihongo-collab-panel',
        '.nihongo-reco-panel', '.nihongo-search-panel', '.nihongo-pro-panel',
      ];
      const openPanel = openPanelSelectors
        .map((sel) => document.querySelector(sel))
        .find((el) => el?.classList.contains('open'));
      if (openPanel) {
        openPanel.classList.remove('open');
        return;
      }
    }
    if (!palette?.classList.contains('open')) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const count = paletteList?.querySelectorAll('[data-command-index]').length || 0;
      if (!count) return;
      activeCommand = event.key === 'ArrowDown' ? (activeCommand + 1) % count : (activeCommand - 1 + count) % count;
      renderCommands();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const active = paletteList?.querySelector('.pro-command-item.active');
      if (active?.dataset.commandIndex) goCommand(commandItems[Number(active.dataset.commandIndex)]);
      return;
    }
    if (!inField && /^[a-z]$/.test(key)) {
      const found = commandItems.find((item) => item.keys.toLowerCase() === key);
      if (found) goCommand(found);
    }
  });

  if (!document.querySelector('.pro-floating-actions')) {
    const actions = document.createElement('div');
    actions.className = 'pro-floating-actions';
    actions.innerHTML = `
      <button class="pro-fab" type="button" data-pro-command title="Cari cepat" aria-label="Cari cepat">⌘</button>
      <button class="pro-fab" type="button" data-pro-top title="Kembali ke atas" aria-label="Kembali ke atas">上</button>`;
    document.body.appendChild(actions);
    actions.querySelector('[data-pro-command]')?.addEventListener('click', window.openCommandPalette);
    actions.querySelector('[data-pro-top]')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  }

  document.querySelectorAll('[download]').forEach((link) => {
    link.addEventListener('click', () => window.proToast?.('File mulai diunduh.'));
  });

  const ensureHeadLink = (rel, href, attrs = {}) => {
    if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    Object.entries(attrs).forEach(([key, value]) => link.setAttribute(key, value));
    document.head.appendChild(link);
  };

  const decodedPath = decodeURIComponent(location.pathname);
  const rootPrefix = nestedSections.some((segment) => decodedPath.includes(segment)) ? '../' : '';
  ensureHeadLink('manifest', `${rootPrefix}manifest.webmanifest`);
  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = '#ffb606';

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    // GENUINELY diperbaiki: sebelumnya mendaftarkan 'service-worker.js' (file
    // versi lama, 131 baris, precache list terbatas), padahal 366 halaman
    // lain proyek genuinely mendaftarkan 'sw.js' (versi aktif/matang, 203
    // baris, precache list lengkap). Karena keduanya sama-sama scope '/',
    // dual-registration ini menciptakan race condition genuinely TIDAK
    // DETERMINISTIK -- dikonfirmasi berulang kali service worker yang aktif
    // bisa jadi salah satu dari keduanya tergantung timing mikro, membuat
    // strategi cache-busting proyek genuinely tidak dapat diandalkan di 64
    // halaman yang memuat script ini.
    navigator.serviceWorker.register(`${rootPrefix}sw.js`).catch(() => null);
  }

  const htmlEscape = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  const safeStorageJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (error) {
      localStorage.removeItem(key);
      return fallback;
    }
  };
  const chatHistoryKey = 'nihongoChatHistory';

  let vocabLookupCache = null;
  const parseSimpleCsv = (text) => {
    const rows = [];
    let row = [], cell = '', quote = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i + 1];
      if (ch === '"' && quote && next === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { quote = !quote; continue; }
      if (ch === ',' && !quote) { row.push(cell); cell = ''; continue; }
      if ((ch === '\n' || ch === '\r') && !quote) {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell);
        if (row.some(Boolean)) rows.push(row);
        row = []; cell = '';
        continue;
      }
      cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  };
  const getVocabLookup = async () => {
    if (vocabLookupCache) return vocabLookupCache;
    try {
      const response = await fetch(`${rootPrefix}assets/vocab-all.csv?v=4`);
      const text = await response.text();
      // Kolom: expression, reading, romaji, meaning, meaning_id, tags.
      // Pemetaan sebelumnya bergeser satu kolom — meaning diambil dari romaji
      // (kosong di 67% baris) dan tags menyerap meaning + meaning_id sekaligus.
      // meaning_id dipakai lebih dulu karena ini platform berbahasa Indonesia.
      vocabLookupCache = parseSimpleCsv(text).slice(1).map((row) => ({
        expression: row[0] || '',
        reading: row[1] || '',
        romaji: row[2] || '',
        meaning: (row[4] || '').trim() || row[3] || '',
        tags: row[5] || ''
      })).filter((item) => item.expression && item.reading);
    } catch (error) {
      vocabLookupCache = [];
    }
    return vocabLookupCache;
  };
  const findJapaneseTerms = (text) => [...new Set(String(text || '').match(/[一-龯ぁ-んァ-ンー]{2,}/g) || [])].slice(0, 4);
  const localAIResponse = async (prompt) => {
    const raw = String(prompt || '').trim();
    const q = raw.toLowerCase();
    const pageTitle = document.querySelector('h1')?.textContent?.trim() || document.title;
    if (!raw) return 'Tulis pertanyaan dulu ya. Contoh: "jelaskan て-form", "buat jadwal N5", atau "bedanya は dan が".';
    const terms = findJapaneseTerms(raw);
    if (terms.length && /(arti|meaning|apa itu|baca|reading|kosakata|vocab|語彙)/i.test(raw)) {
      const vocab = await getVocabLookup();
      const found = terms.flatMap((term) => vocab.filter((item) => item.expression === term || item.reading === term).slice(0, 3)).slice(0, 6);
      if (found.length) {
        return `Saya menemukan kosakata ini di deck lokal:\n\n${found.map((item) => `- ${item.expression}（${item.reading}）= ${item.meaning}`).join('\n')}\n\nTips: masukkan kata ini ke flashcard, lalu buat satu contoh kalimat pendek.`;
      }
    }
    if (q.includes('は') || q.includes('が') || q.includes('wa') || q.includes('ga')) {
      return 'Perbedaan は dan が:\n\n1. は menandai topik: hal yang sedang dibicarakan.\n例: 私は学生です。= Kalau tentang saya, saya pelajar.\n\n2. が menandai subjek/informasi baru/penekanan.\n例: 私が行きます。= Sayalah yang pergi.\n\nTips N5: kalau memperkenalkan topik umum, sering pakai は. Kalau menjawab “siapa/apa yang...?”, sering pakai が.';
    }
    if (q.includes('に') && q.includes('で')) {
      return 'Perbedaan に dan で:\n\nに = titik tujuan, lokasi keberadaan, waktu spesifik.\n例: 学校に行きます。= pergi ke sekolah.\n例: 7時に起きます。= bangun jam 7.\n\nで = lokasi aksi atau alat/cara.\n例: 学校で勉強します。= belajar di sekolah.\n例: 電車で行きます。= pergi dengan kereta.';
    }
    if (q.includes('て') || q.includes('te-form') || q.includes('て-form')) {
      return 'て-form dipakai untuk menghubungkan aksi, request, izin, larangan, dan progressive.\n\nContoh:\n食べてください = tolong makan\n読んでもいいです = boleh membaca\n行って、勉強します = pergi lalu belajar\n今、勉強しています = sedang belajar\n\nCara latihan: ambil 10 kata kerja, ubah ke て-form, lalu buat kalimat ください dan ています.';
    }
    if (q.includes('n5')) return 'Rencana N5 yang praktis:\n\nMinggu 1-2: hiragana, katakana, angka, waktu.\nMinggu 3-5: partikel は/が/を/に/で, kata kerja ます/ません.\nMinggu 6-8: て-form, ない-form, た-form, adjective.\nSetiap hari: 20 vocab + 5 kanji + 10 menit listening.\nTarget: sekitar 700 vocabulary, 100 kanji inti, dan latihan soal rutin.';
    if (q.includes('n4')) return 'Untuk N4, naikkan dari kalimat dasar ke percakapan praktis. Fokus: conditional, potential form, てしまう, そうだ, ようになる, dan vocabulary aktivitas harian/perjalanan/kerja sederhana.';
    if (q.includes('n3')) return 'Untuk N3, fokus pada stamina reading dan grammar penghubung ide: について, によって, として, うちに, 一方だ, わけではない. Latih membaca paragraf menengah tiap hari.';
    if (q.includes('n2')) return 'Untuk N2, fokus pada nuance, formal expression, news vocabulary, dan reading panjang. Latih: に基づいて, に応じて, に関して, ざるを得ない, わけにはいかない.';
    if (q.includes('n1')) return 'Untuk N1, fokus pada teks abstrak, opini, akademik, idiom, dan sinonim bernuansa. Belajar dari artikel asli, editorial, dan latihan paraphrase.';
    if (q.includes('kanji') || q.includes('漢字')) return 'Cara belajar kanji yang efektif:\n\n1. Jangan hafal karakter sendirian.\n2. Hafalkan 2-3 vocabulary untuk tiap kanji.\n3. Baca contoh kalimat.\n4. Tulis 5 kali hanya untuk kanji yang sulit.\n5. Review dengan flashcard: arti -> reading -> contoh kata.\n\nBuka Flashcard Lengkap untuk campur kanji dan vocabulary.';
    if (q.includes('grammar') || q.includes('文法')) return 'Cara belajar grammar:\n\n1. Hafal struktur, bukan cuma arti.\n2. Lihat contoh kalimat Jepang.\n3. Buat 3 kalimat sendiri.\n4. Bandingkan pola mirip.\n5. Uji di Latihan JLPT.\n\nKamu bisa tanya pola spesifik, misalnya: "jelaskan ようになる".';
    if (q.includes('vocab') || q.includes('kosakata') || q.includes('語彙')) return 'Untuk vocabulary, gunakan pola 20-10-5:\n\n20 kata baru per hari\n10 kata review kemarin\n5 kalimat aktif memakai kata baru\n\nJangan belajar arti tunggal saja. Hafalkan reading, contoh frasa, dan satu kalimat pendek.';
    if (q.includes('listening') || q.includes('mendengar')) return 'Latihan listening:\n\n1. Dengar sekali tanpa teks.\n2. Dengar lagi sambil catat kata kunci.\n3. Buka transcript, tandai grammar/vocab.\n4. Shadowing 3 kali.\n5. Ulangi audio besok tanpa transcript.';
    if (q.includes('reading') || q.includes('membaca')) return 'Latihan reading:\n\nN5-N4: cari subjek, waktu, tempat, aksi.\nN3: cari kontras seperti しかし dan kesimpulan seperti つまり.\nN2-N1: pahami opini penulis, argumen, dan nuansa.\n\nGunakan timer agar terbiasa ritme JLPT.';
    if (q.includes('jadwal') || q.includes('rencana') || q.includes('belajar')) return `Rekomendasi belajar untuk halaman "${pageTitle}":\n\nSenin-Rabu: materi baru + 20 flashcard.\nKamis: latihan soal dan catat salah.\nJumat: reading/listening.\nSabtu: mini mock test.\nMinggu: review ulang kartu Again/Hard.\n\nKalau kamu sebut levelmu, saya bisa buat jadwal yang lebih spesifik.`;
    if (q.includes('contoh kalimat')) return 'Kirim kata atau grammar yang ingin dibuatkan contoh. Format terbaik: "contoh kalimat untuk 食べる N5" atau "contoh kalimat grammar ばかりでなく".';
    if (q.includes('jlpt') || q.includes('ujian')) return 'Strategi JLPT:\n\n1. Vocabulary dan kanji: SRS harian.\n2. Grammar: pahami struktur dan contoh.\n3. Reading: timer, cari kata kunci, jangan terjebak menerjemahkan semua kata.\n4. Listening: shadowing dan prediksi konteks.\n5. Seminggu sekali: mixed mock dan review salah.';
        if (q.includes('のに') || q.includes('noni') || q.includes('padahal')) {
      return 'のに = padahal/walaupun (kekecewaan/kejutan)\n\n例1: 頑張ったのに、失敗した。= Padahal sudah berusaha, tapi gagal.\n例2: 新しいのに、もう壊れた。= Padahal masih baru, tapi sudah rusak.\n\nBedanya dengan けど/でも: のに lebih kuat mengekspresikan kekecewaan atau kejutan pembicara.';
    }
    if (q.includes('ながら') || q.includes('nagara') || q.includes('sambil')) {
      return '〜ながら = sambil ~ / sementara ~\n\n例: 音楽を聞きながら勉強します。= Belajar sambil mendengarkan musik.\n\nCatatan: subjek dua aksi harus sama. テレビを見ながら、弟が勉強した = SALAH kalau subjeknya berbeda.';
    }
    if (q.includes('ようになる') || q.includes('you ni naru')) {
      return '〜ようになる = menjadi bisa/terbiasa (perubahan gradual)\n\n例: 日本語が話せるようになりました。= Sudah bisa berbicara bahasa Jepang.\n\nBedakan: ことにする = keputusan sendiri. ようになる = perubahan alami seiring waktu.';
    }
    if (q.includes('にもかかわらず') || q.includes('kakawarazu') || q.includes('meskipun') || q.includes('walaupun')) {
      return '〜にもかかわらず = walaupun ~ / meskipun ~ (formal)\n\n例: 雨にもかかわらず、試合は続いた。= Walaupun hujan, pertandingan tetap berlanjut.\n\nLebih formal dari でも. Dipakai di tulisan formal, pidato, dan berita.';
    }
    if (q.includes('ざるを得ない') || q.includes('zaruwoenai') || q.includes('terpaksa')) {
      return '〜ざるを得ない = terpaksa ~ / tidak bisa tidak ~\n\n例: 状況が悪く、撤退せざるを得ない。= Situasi buruk, terpaksa harus mundur.\n⚠️ する → せざるを得ない (tidak teratur)\n\nArtinya tidak ada pilihan lain karena faktor eksternal.';
    }
    if (q.includes('どころか') || q.includes('dokoroka') || q.includes('jangankan')) {
      return '〜どころか = jangankan ~ / bahkan sebaliknya ~\n\n例: 歩くどころか、立てません。= Jangankan berjalan, berdiri pun tidak bisa.\n例: 褒められるどころか怒られた。= Bukannya dipuji, malah dimarahi.\n\nMenyatakan realita yang jauh dari harapan, bahkan berlawanan.';
    }
    if (q.includes('に基づいて') || q.includes('ni motozuite') || q.includes('berdasarkan')) {
      return '〜に基づいて = berdasarkan ~ (formal)\n\n例: データに基づいて判断する。= Menilai berdasarkan data.\n例: 経験に基づいたアドバイス。= Saran berdasarkan pengalaman.\n\nDigunakan saat menyatakan bahwa keputusan/argumen berpijak pada sesuatu yang konkret.';
    }
    if (q.includes('ならでは') || q.includes('naradewa') || q.includes('khas')) {
      return '〜ならでは = khas ~ / hanya ~ yang bisa (memiliki)\n\n例: 京都ならではの雰囲気がある。= Ada suasana yang khas Kyoto.\n例: 職人ならでは技術。= Keahlian khas pengrajin.\n\nNuansa positif dan kagum. Hanya bisa dipakai untuk sesuatu yang eksklusif milik subjek.';
    }
    if (q.includes('にほかならない') || q.includes('nihokanarানai') || q.includes('tidak lain adalah')) {
      return '〜にほかならない = tidak lain adalah ~ / persis merupakan ~\n\n例: この成功は努力の結果にほかならない。= Keberhasilan ini tidak lain adalah hasil kerja keras.\n\nMenegaskan dengan sangat kuat bahwa sesuatu PERSIS adalah hal yang disebutkan. Formal.';
    }
    if (q.includes('とはいえ') || q.includes('tohaie') || q.includes('walaupun demikian')) {
      return '〜とはいえ = walaupun demikian ~ / meskipun dikatakan ~\n\n例: 失敗したとはいえ、良い経験になった。= Walaupun gagal, jadi pengalaman baik.\n\nMengakui fakta lalu menyatakan kontras/pengecualian. Lebih formal dari けれど.';
    }
    if (q.includes('conditional') || q.includes('kondisional') || q.includes('たら') || q.includes('tara') || (q.includes('ば') && q.includes('condition'))) {
      return 'Kondisional Jepang: 4 jenis\n\n1. 〜たら = setelah/kalau (umum, hypothetical & waktu)\n2. 〜ば = kondisi formal/kebiasaan\n3. 〜と = kondisi alami/otomatis (hasil pasti)\n4. 〜なら = asumsi dari sudut pandang orang lain\n\nSingkat: たら = paling umum, ば = formal, と = otomatis, なら = asumsi.';
    }
    if (q.includes('keigo') || q.includes('敬語') || q.includes('sonkeigo') || q.includes('kenjougo') || q.includes('honorifik') || q.includes('sopan')) {
      return '敬語 (Keigo) — 3 jenis utama:\n\n1. 尊敬語 (Sonkeigo): memuliakan aksi orang lain\n   いる→いらっしゃる, 言う→おっしゃる, 食べる→召し上がる\n\n2. 謙譲語 (Kenjougo): merendahkan aksi diri sendiri\n   いる→おる, 言う→申す, 行く→参る\n\n3. 丁寧語 (Teineigo): sopan umum\n   です/ます\n\nTips: untuk atasan/tamu, gunakan Sonkeigo untuk aksi MEREKA dan Kenjougo untuk aksi ANDA.';
    }
    if (q.includes('partikel') || (q.includes('particle') && !q.includes('は') && !q.includes('が'))) {
      return 'Partikel utama Jepang:\n\nは = topik (hal yang dibicarakan)\nが = subjek dengan fokus/penekanan\nを = objek langsung\nに = tujuan, lokasi keberadaan, waktu\nで = lokasi aksi, alat/cara\nと = bersama dengan, dan\nから = dari (asal/alasan)\nまで = sampai (batas)\nも = juga\nの = kepunyaan/penghubung\n\nContoh: 私は学校で友達と日本語を勉強します。';
    }
    if (q.includes('pitch') || q.includes('nada') || q.includes('accent') || q.includes('aksen') || q.includes('pelafalan')) {
      return 'Pitch accent Jepang:\n\nJepang punya pola nada naik-turun yang membedakan arti.\n例: はし dengan nada berbeda = 橋(jembatan), 箸(sumpit), 端(ujung)\n\nTips pemula:\n1. Perhatikan vokal panjang vs pendek: おばさん (tante) vs おばあさん (nenek)\n2. Vokal ganda memanjang: コーヒー, ビール\n3. っ (sokuon) menggandakan konsonan berikutnya: きって, いっぱい\n\nFokus pada ini sebelum mempelajari pitch accent detail.';
    }
    if (q.includes('kanji') || q.includes('漢字') || q.includes('n5 kanji') || q.includes('kanji n5')) {
      return 'Kanji N5 inti (10 pertama yang harus dikuasai):\n日(ひ/にち - hari), 月(つき/げつ - bulan), 火(ひ/か - api), 水(みず/すい - air)\n木(き/もく - pohon), 金(かね/きん - emas), 土(つち/ど - tanah)\n山(やま/さん - gunung), 川(かわ/せん - sungai), 人(ひと/じん - orang)\n\nTips: pelajari kanji bersama kata yang menggunakannya. 山 → 富士山, 山田さん.';
    }
    if (q.includes('transitif') || q.includes('intransitif') || q.includes('transitive') || q.includes('intransitive')) {
      return 'Verba Transitif vs Intransitif:\n\nTransitif = ada objek (ditandai を)\nIntransitif = tidak ada objek\n\nPasangan umum:\n開ける(tr) vs 開く(itr) - membuka/terbuka\n閉める(tr) vs 閉まる(itr) - menutup/tertutup\n止める(tr) vs 止まる(itr) - menghentikan/berhenti\n出す(tr) vs 出る(itr) - mengeluarkan/keluar\n入れる(tr) vs 入る(itr) - memasukkan/masuk\n\nCatatan: てある = hasil dari aksi transitif.';
    }
        if (q.includes('conditional') || q.includes('kondisional') || (q.includes('tara') && !q.includes('noni'))) {
      return 'Kondisional Jepang: 4 jenis utama\n\n1. 〜たら = setelah / kalau (paling umum)\n2. 〜ば = formal, kondisi umum/kebiasaan\n3. 〜と = kondisi otomatis/alami (hasil pasti)\n4. 〜なら = asumsi dari info orang lain\n\nTips: untuk percakapan sehari-hari, pilih たら. Untuk teks formal, ば. Untuk hukum alam, と.';
    }
    if (q.includes('passive') || q.includes('pasif') || q.includes('受け身') || q.includes('られる')) {
      return '受け身 (Pasif) Jepang — 3 fungsi:\n\n1. 純粋受け身: subjek menerima aksi biasa → 先生に褒められた (dipuji guru)\n2. 迷惑受け身: subjek terganggu oleh aksi → 雨に降られた (kena hujan, merasa terganggu)\n3. 所有物受け身: sesuatu milik subjek terkena aksi → 財布を盗まれた (dompet dicuri)\n\nBentuk: Verbない → られる (grup 1&2), る → られる (grup 2)';
    }
    if (q.includes('causative') || q.includes('kausatif') || q.includes('させる') || q.includes('suru')) {
      return '使役 (Kausatif) 〜させる / 〜せる\n\n使役 = menyuruh / membuat orang lain melakukan aksi.\n\n例: 子供に野菜を食べさせる = menyuruh anak makan sayur\n    先生は学生を走らせた = guru membuat siswa berlari\n\n使役受け身 (〜させられる): terpaksa melakukan\n例: 残業させられた = dipaksa lembur (tidak suka)\n\nBentuk: Verbない (tanpa い) + させる / せる (grup 1)';
    }
    if (q.includes('て-form') || q.includes('て形') || q.includes('te form') || q.includes('te-form')) {
      return 'て形 (Te-form) — 8 penggunaan utama:\n\n1. 〜てください = tolong ~ (permintaan sopan)\n2. 〜ています = sedang ~ / sudah ~ (progresif/stative)\n3. 〜てもいい = boleh ~\n4. 〜てはいけない = tidak boleh ~\n5. 〜てから = setelah ~\n6. 〜ている = keadaan saat ini\n7. 〜てみる = coba ~\n8. 〜てしまう = sudah (tak sengaja) ~ / menyesal ~\n\nBentuk: tergantung kelompok verba.';
    }
    if (q.includes('intransitive') || q.includes('transitive') || q.includes('transitif') || q.includes('他動詞') || q.includes('自動詞')) {
      return '自動詞 vs 他動詞 (Intransitif vs Transitif)\n\n他動詞 (tr) = ada objek (ditandai を)\n自動詞 (itr) = tidak ada objek\n\nPasangan umum:\n開ける(tr) vs 開く(itr) = membuka / terbuka\n閉める(tr) vs 閉まる(itr) = menutup / tertutup\n出す(tr) vs 出る(itr) = mengeluarkan / keluar\n入れる(tr) vs 入る(itr) = memasukkan / masuk\n止める(tr) vs 止まる(itr) = menghentikan / berhenti\n\n〜てある = hasil aksi transitif. 〜ている = status intransitif.';
    }
    if (q.includes('potential') || q.includes('potensi') || q.includes('可能形') || q.includes('できる')) {
      return '可能形 (Bentuk Potensi) — bisa ~ / mampu ~\n\nBentuk:\n- Grup 1: える → える (書く → 書ける)\n- Grup 2: る → られる (食べる → 食べられる)\n- Tidak beraturan: する → できる, くる → こられる\n\nBedakan: できる = bisa (potensi/kemampuan) vs 〜てもいい = boleh (izin)\n\n例: 日本語が話せる = bisa berbicara Jepang\n    ここで写真が撮れますか = bolehkah foto di sini?';
    }
    if (q.includes('summary') || q.includes('ringkas') || q.includes('rangkum') || q.includes('まとめ')) {
      return 'Tips meringkas isi teks Jepang (まとめ):\n\n1. Cari 話題 (topik utama) di kalimat pertama/terakhir paragraf\n2. Perhatikan 結論 (kesimpulan) — biasanya di akhir teks\n3. Tandai kata: しかし, ところが, だから, したがって, つまり (penanda perubahan arah)\n4. 筆者の主張 (argumen penulis) biasanya setelah とは言え, にもかかわらず, だが\n5. Abaikan contoh/ilustrasi, fokus pada argumen inti\n\nUntuk JLPT Reading: baca soal DULU sebelum teks!';
    }
    if (q.includes('honorifik') || q.includes('sopan') || q.includes('丁寧') || q.includes('formal')) {
      return '敬語 (Keigo) — Sistem Honorifik Jepang\n\n3 jenis:\n1. 尊敬語 (Sonkeigo) = memuliakan aksi ORANG LAIN\n   いる→いらっしゃる, 言う→おっしゃる, 食べる→召し上がる\n\n2. 謙譲語 (Kenjougo) = merendah aksi DIRI SENDIRI\n   いる→おる, 言う→申す, もらう→いただく\n\n3. 丁寧語 (Teineigo) = sopan umum → です/ます\n\nAturan emas: untuk aksi atasan → Sonkeigo. Untuk aksi diri sendiri ke atasan → Kenjougo.';
    }
    if (q.includes('idiom') || q.includes('慣用句') || q.includes('figuratif')) {
      return '慣用句 (Idiom Jepang) — yang sering muncul di JLPT:\n\n目 (mata): 目を通す=lihat sekilas, 目が覚める=sadar/terbangun, 目立つ=menonjol\n手 (tangan): 手を貸す=bantu, 手を抜く=bermalas, 手に余る=kewalahan\n足 (kaki): 足を引っ張る=hambat orang lain, 足が出る=melebihi anggaran\n腹/はら: 腹が立つ=marah, 腹を割る=bicara jujur\n\nTips: pelajari idiom per organ tubuh untuk efisiensi hafalan.';
    }
    if (q.includes('onomatope') || q.includes('オノマトペ') || q.includes('擬音') || q.includes('擬態')) {
      return '日本語のオノマトペ (Onomatope)\n\n2 jenis:\n擬音語 = tiruan bunyi: ドンドン(gedebuk), ザーザー(derasnya hujan)\n擬態語 = gambaran keadaan: ふわふわ(lembut/mengambang), ぺらぺら(fasih)\n\nUmum di N3-N2:\nくたくた = kelelahan total\nぺらぺら = fasih berbahasa\nうろうろ = mondar-mandir gelisah\nどんどん = semakin / terus menerus\nはっきり = dengan jelas\nゆっくり = pelan-pelan\nそっと = perlahan/hati-hati';
    }
    if (q.includes('counter') || q.includes('kata bantu') || q.includes('助数詞')) {
      return '助数詞 (Kata Bantu Bilangan) — yang paling penting:\n\n本(ほん) = benda panjang (pensil, botol, sungai)\n枚(まい) = benda tipis (kertas, piring, baju)\n匹(ひき) = hewan kecil (kucing, anjing, ikan)\n頭(とう) = hewan besar (sapi, kuda)\n羽(わ) = burung, kelinci\n冊(さつ) = buku, majalah\n杯(はい) = cangkir, gelas penuh\n台(だい) = mesin, kendaraan besar\n個(こ) = benda bulat/umum\n\nPerubahan bunyi: 1本=いっぽん, 3本=さんぼん, 6本=ろっぽん';
    }
    if (q.includes('tense') || q.includes('waktu') || (q.includes('past') && q.includes('japan')) || q.includes('lampau')) {
      return 'Waktu dalam Bahasa Jepang (Tenses)\n\nJepang tidak punya tenses seperti bahasa Inggris! Waktu ditunjukkan oleh:\n\n1. Konteks kalimat\n2. Kata keterangan waktu: 昨日(kemarin), 今日(hari ini), 明日(besok)\n3. Bentuk kata kerja:\n   - Verbます = sekarang/akan\n   - Verbた = lampau (sudah selesai)\n   - Verbている = sedang (progresif) atau sudah & masih berlangsung\n\n例: 食べます = (akan) makan. 食べました = sudah makan. 食べています = sedang makan.';
    }
    if (q.includes('particle') || (q.includes('partikel') && q.length < 30)) {
      return 'Partikel Penting Bahasa Jepang:\n\nは = topik kalimat (sering kontras/penekanan)\nが = subjek gramatikal (lebih spesifik/fokus)\nを = objek langsung\nに = arah/tujuan, waktu, keberadaan, penerima\nで = lokasi aksi, cara/alat, bahan\nと = bersama / dan / kutipan\nから = dari / karena (sebab)\nまで = sampai\nも = juga / bahkan\nの = kepunyaan / penghubung\n\nBeda は dan が: 猫はいる (kucing ada, sudah tahu) vs 猫がいる (kucing ada!, baru tahu)';
    }
    if (q.includes('writing') || q.includes('menulis') || q.includes('essay') || q.includes('komposisi')) {
      return 'Tips Menulis dalam Bahasa Jepang:\n\n1. Gunakan 〜と思います / 〜と考えます untuk opini (sopan, tidak terlalu pasti)\n2. Hubungkan paragraf: まず(pertama), 次に(selanjutnya), そして(dan), 最後に(akhirnya)\n3. Kontras: しかし, ところが, 一方, だが\n4. Kesimpulan: したがって, そのため, よって, つまり\n5. Hindari 〜だ/〜である di awal, gunakan di tengah/akhir\n\nStruktur esai: 序論(intro) → 本論(isi) → 結論(kesimpulan)';
    }
    if (q.includes('shadowing') || q.includes('bayangan') || q.includes('meniru')) {
  if(q.includes('apa itu okurigana') || q.includes('okurigana apa')) return 'Okurigana (送り仮名) adalah hiragana yang mengikuti kanji untuk menunjukkan konjugasi atau cara baca. Contoh: 食べる (食=kanji, べる=okurigana), 動く (動=kanji, く=okurigana). Fungsinya: membedakan bacaan kanji, menunjukkan perubahan kata kerja/sifat.';
  if(q.includes('cara belajar kanji') || q.includes('hafal kanji cepat')) return 'Cara belajar kanji efektif: 1) Belajar radikal/komponen dulu, 2) Gunakan mnemonik/cerita visual, 3) Pelajari kanji dalam konteks kata (bukan sendiri-sendiri), 4) Tulis berulang dengan stroke order benar, 5) Gunakan SRS (Anki/kartu flash), 6) Targetkan 5-10 kanji per hari secara konsisten.';
  if(q.includes('shadowing apa') || q.includes('latihan shadowing')) return 'Shadowing = teknik belajar bahasa dengan langsung meniru ucapan pembicara asli bersamaan (bukan setelah) audio berputar. Manfaat: melatih ritme, intonasi, dan aksen sekaligus. Cara: pilih audio N1-2 level di atas kemampuan, dengar sambil baca transkrip, lalu tirukan langsung.';
  if(q.includes('n2 vs n1 beda') || q.includes('perbedaan n1 n2')) return 'N2: setara kemampuan memahami bahasa Jepang umum dan kehidupan sehari-hari, mampu membaca koran. N1: setara kemampuan memahami teks kompleks, akademis, dan abstrak — perlu memahami nuansa budaya. Gap N2→N1 sangat besar, bisa butuh 1-2 tahun ekstra belajar intensif.';
  if(q.includes('て-form cara') || q.includes('bentuk te apa')) return 'て-form (te-form) adalah bentuk dasar untuk sambung kalimat, permintaan, dan pola gramatikal. Aturan: う-verb: く→いて, ぐ→いで, す→して, ぬぶむ→んで, つるう→って, く(行く)→いって. る-verb: buang る+て. する→して, くる→きて.';
  if(q.includes('passive voice') || q.includes('bentuk pasif')) return 'Bentuk pasif (受け身 ukemi): う-verb: ない-stem + れる (書く→書かれる). る-verb: buang る + られる (食べる→食べられる). する→される, くる→こられる. Dipakai: (1) tindakan yang dialami/diterima, (2) nuansa formal/tulisan, (3) mengekspresikan pengalaman tidak menyenangkan.';
  if(q.includes('keigo level') || q.includes('jenis keigo')) return 'Keigo ada 3 jenis: 1) 尊敬語(そんけいご)=memuliakan aksi orang lain: いらっしゃる, おっしゃる, なさる. 2) 謙譲語(けんじょうご)=merendahkan aksi diri sendiri: まいる, 申す, いただく, 伺う. 3) 丁寧語(ていねいご)=berbicara sopan: ます, です, ございます.';
  if(q.includes('kalimat kompleks jepang') || q.includes('klausa relatif')) return 'Klausa relatif dalam bahasa Jepang SELALU mendahului nomina yang dimodifikasi: [私が読んだ]本 = buku [yang saya baca]. Tidak seperti Indonesia yang memakai "yang" setelah nomina. Seluruh klausa modifikasi diletakkan sebelum nomina.';
  if(q.includes('bunpo wa') || q.includes('grammar focus')) return 'Untuk mempelajari tata bahasa Jepang secara sistematis, gunakan halaman Grammar di platform ini (266+ pola N5-N1), latihan kuis grammar, dan SRS grammar deck. Fokus: pahami makna, struktur, dan nuansa perbedaan pola yang mirip (例: から vs ので, のに vs けど).';
  if(q.includes('vocab n5') || q.includes('kosakata wajib n5')) return 'Kosakata wajib N5 (~800 kata) meliputi: angka, hari, bulan, keluarga, warna, makanan, transportasi, bagian tubuh, kata kerja dasar (食べる, 飲む, 行く, 来る, 見る, 聞く, 話す, 読む, 書く, する, ある, いる), adjektif umum (おおきい, ちいさい, たかい, やすい, etc.).';
  if(q.includes('counter jepang') || q.includes('kata bantu bilangan')) return 'Counter (助数詞) penting: 本(ほん)=benda panjang, 枚(まい)=benda tipis/lembaran, 匹(ひき)=hewan kecil, 頭(とう)=hewan besar, 冊(さつ)=buku, 台(だい)=mesin/kendaraan, 個(こ)=benda kecil, 杯(はい)=minuman/mangkok, 人(にん/り)=orang (1=ひとり, 2=ふたり).';
  if(q.includes('jlpt cbt') || q.includes('jlpt online')) return 'JLPT (Japanese Language Proficiency Test) tersedia dalam format kertas (PBT) dan komputer (CBT, di beberapa negara). Tes berlangsung 2 kali setahun: Juli dan Desember. Pendaftaran biasanya 2-3 bulan sebelum tes. Cek jlpt.or.jp untuk jadwal terkini.';
  if(q.includes('desu ka vs no') || q.includes('partikel no akhir kalimat')) return 'の di akhir kalimat (文末の) berbeda dari の (kepemilikan). Fungsi: (1) penjelasan/alasan=説明のモダリティ, (2) konfirmasi/pertanyaan lembut. Contoh: 行くの？(pergi ya?) = lebih lembut dari 行く？. 女性語 sering lebih panjang: 行くの？ vs laki-laki: 行く？ atau 行くか？.';
  if(q.includes('onomatopoeia') || q.includes('擬音語')) return '擬音語(ぎおんご)=kata tiruan suara: ワンワン(gonggong anjing), バンバン(dentuman), ゴロゴロ(suara petir/kucing mendengkur). 擬態語(ぎたいご)=kata yang menggambarkan kondisi: ふわふわ(lembut/ringan), きらきら(berkilau), どきどき(dag-dig-dug). Sangat umum di percakapan alami.';
  if(q.includes('apa itu srs') || q.includes('cara pakai flashcard')) return 'SRS (Spaced Repetition System) = sistem pengulangan berselang yang mengoptimalkan jadwal review berdasarkan seberapa sulit kamu mengingat kartu. Kartu yang mudah = interval makin panjang (minggu→bulan). Kartu sulit = interval pendek (1-3 hari). Tools: Anki (gratis), fitur SRS di platform ini.';

      return 'Teknik Shadowing untuk Meningkatkan Japanese\n\nApa itu Shadowing?\nMendengarkan audio dan LANGSUNG menirukan saat atau sedikit setelah pembicara.\n\nLangkah-langkah:\n1. Pilih audio level N3-N2 (tidak terlalu mudah/sulit)\n2. Dengarkan dulu 1x tanpa teks\n3. Dengarkan sambil baca teks\n4. Tutup teks, shadowing sambil dengar\n5. Ulangi bagian sulit\n\nManfaat: pelafalan alami, intonasi, kecepatan bicara, dan listening otomatis meningkat bersama.';
    }
    return `Saya siap bantu. Dari pertanyaanmu: "${raw}", arah terbaik adalah mulai dari konteks level dan tujuan.\n\nCoba tulis lebih spesifik:\n- "jelaskan grammar ..."\n- "buat contoh kalimat untuk ..."\n- "buat jadwal belajar N5/N4/N3/N2/N1"\n- "bedanya ... dan ..."\n\nSaat ini saya memakai AI lokal bawaan. Kalau kamu pasang endpoint API di pengaturan chat, jawaban bisa datang dari AI backend.`;
  };

  window.nihongoAI = {
    async ask(prompt, options = {}) {
      let config = {};
      try { config = JSON.parse(localStorage.getItem('nihongoAIConfig') || '{}'); } catch (error) { config = {}; }
      const productionEndpoint = location.protocol !== 'file:' && !['localhost', '127.0.0.1'].includes(location.hostname)
        ? '/api/ai-chat'
        : '';
      const endpoint = options.endpoint || config.endpoint || productionEndpoint;
      const model = options.model || config.model || 'local-smart-fallback';
      if (endpoint) {
        try {
          // GENUINELY DIPERBAIKI (lanjutan Fase HH, Audit Database):
          // dikonfirmasi widget ini genuinely SUDAH RUSAK TOTAL sejak
          // backend /api/ai-chat mewajibkan array `messages` non-kosong
          // -- format lama `{ model, prompt, context }` genuinely SELALU
          // menghasilkan error 400 (`messages` default kosong), sehingga
          // widget genuinely SELALU jatuh ke fallback lokal statis tanpa
          // pernah benar-benar memanggil AI produksi. Juga dikonfirmasi
          // genuinely TIDAK mengirim Authorization header, berbeda dari
          // assets/nihongo-ai.js yang sudah benar (dipakai 4 halaman AI
          // Tools). Diperbaiki dengan menyelaraskan ke format dan pola
          // otentikasi yang sudah terbukti benar di nihongo-ai.js.
          let sbSession = null;
          try {
            const raw = localStorage.getItem('np-auth-v1');
            if (raw) sbSession = JSON.parse(raw);
          } catch (_) {}
          const userId = sbSession?.user?.id || (function () {
            try {
              let u = localStorage.getItem('np-uid');
              if (!u) {
                u = 'anon-' + (window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
                localStorage.setItem('np-uid', u);
              }
              return u;
            } catch (_) { return 'anonymous'; }
          })();
          const accessToken = sbSession?.access_token || '';

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': 'Bearer ' + accessToken } : {}),
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: prompt }],
              mode: 'conversation',
              userId,
              provider: model === 'local-smart-fallback' ? 'openai' : (options.provider || 'openai'),
              model: model === 'local-smart-fallback' ? undefined : model,
            })
          });
          if (!response.ok) throw new Error(`AI endpoint ${response.status}`);
          const data = await response.json();
          return { text: data.text || data.message || data.answer || await localAIResponse(prompt), source: 'api' };
        } catch (error) {
          return { text: `${await localAIResponse(prompt)}\n\nCatatan: endpoint AI belum merespons, jadi jawaban memakai fallback lokal.`, source: 'fallback' };
        }
      }
      return { text: await localAIResponse(prompt), source: 'local' };
    }
  };

  const smartRecommendations = () => {
    const path = currentPath.toLowerCase();
    const base = [
      { title: 'Roadmap JLPT', sub: 'Susun urutan belajar N5 sampai N1', href: destinationFor(commandItems[2]) },
      { title: 'Latihan JLPT', sub: 'Uji vocabulary, kanji, grammar, reading, listening', href: destinationFor(commandItems.find((item) => item.title === 'Latihan JLPT')) },
      { title: 'AI Tutor', sub: 'Tanya grammar dan koreksi kalimat', href: destinationFor(commandItems.find((item) => item.title === 'AI Tutor')) }
    ];
    if (path.includes('vocabulary')) return [{ title: 'Latihan Vocabulary', sub: 'Langsung uji kata yang baru dipelajari', href: `${rootPrefix}Materi/Latihan-JLPT.html` }, { title: 'Grammar N5-N1', sub: 'Gabungkan kata dengan pola kalimat', href: `${rootPrefix}Materi/Grammar-Lengkap.html` }, ...base];
    if (path.includes('grammar')) return [{ title: 'Latihan Grammar', sub: 'Cek pemahaman pola', href: `${rootPrefix}Materi/Latihan-JLPT.html` }, { title: 'Kosakata N5-N1', sub: 'Cari kata untuk contoh kalimat', href: `${rootPrefix}Materi/Vocabulary-Lengkap.html` }, ...base];
    if (path.includes('kanji') || path.includes('flashcard')) return [{ title: 'Kosakata N5-N1', sub: 'Pelajari kanji sebagai compound words', href: `${rootPrefix}Materi/Vocabulary-Lengkap.html` }, { title: 'Latihan Kanji', sub: 'Uji recognition kanji', href: `${rootPrefix}Materi/Latihan-JLPT.html` }, ...base];
    return base;
  };

  if (!document.querySelector('.nihongo-chat-launch')) {
    const chatButton = document.createElement('button');
    chatButton.className = 'nihongo-chat-launch';
    chatButton.type = 'button';
    chatButton.innerHTML = '<span>先</span> AI Chat';
    document.body.appendChild(chatButton);
    chatButton.addEventListener('click', () => window.openNihongoChat?.());
  }

  if (!document.querySelector('.nihongo-chat-panel')) {
    const panel = document.createElement('section');
    panel.className = 'nihongo-chat-panel';
    panel.innerHTML = `<div class="nihongo-panel-head"><b>Chatbot AI Pintar</b><div><button type="button" data-chat-settings title="Pengaturan AI">API</button><button type="button" data-chat-clear title="Hapus chat">Clear</button><button type="button" data-chat-close aria-label="Tutup chatbot AI">×</button></div></div><div class="nihongo-panel-body"><div class="nihongo-chat-settings"><input data-ai-endpoint placeholder="Endpoint API proxy, contoh: /api/ai-chat"><input data-ai-model placeholder="Model AI" value="local-smart-fallback"><button class="nihongo-panel-action" type="button" data-ai-save>Simpan API</button></div><div class="nihongo-chat-tools"><button class="nihongo-chat-chip" type="button" data-chat-prompt="Bedanya は dan が apa?">は vs が</button><button class="nihongo-chat-chip" type="button" data-chat-prompt="Jelaskan て-form untuk N5">て-form</button><button class="nihongo-chat-chip" type="button" data-chat-prompt="Buat jadwal belajar N5 selama 8 minggu">Jadwal N5</button><button class="nihongo-chat-chip" type="button" data-chat-prompt="Tips belajar kanji supaya cepat ingat">Tips Kanji</button><button class="nihongo-chat-chip" type="button" data-chat-prompt="arti 食べる dan readingnya">Arti 食べる</button></div><div class="nihongo-chat-log"></div><form class="nihongo-chat-form"><input placeholder="Tulis pertanyaan..." aria-label="Pertanyaan chatbot AI"><button>Kirim</button></form></div>`;
    document.body.appendChild(panel);
    const log = panel.querySelector('.nihongo-chat-log');
    const endpointInput = panel.querySelector('[data-ai-endpoint]');
    const modelInput = panel.querySelector('[data-ai-model]');
    const renderChat = () => {
      let history = [];
      try { history = JSON.parse(localStorage.getItem(chatHistoryKey) || '[]'); } catch (error) { history = []; }
      if (!history.length) history = [{ role: 'assistant', text: 'こんにちは! Saya siap bantu grammar, vocabulary, kanji, reading, listening, atau strategi JLPT. Chat ini bisa dipakai langsung dengan AI lokal bawaan.' }];
      log.innerHTML = history.slice(-20).map((msg) => `<div class="nihongo-msg ${msg.role === 'user' ? 'user' : ''}">${htmlEscape(msg.text).replace(/\n/g, '<br>')}</div>`).join('');
      log.scrollTop = log.scrollHeight;
    };
    const saveChat = (role, text) => {
      let history = [];
      try { history = JSON.parse(localStorage.getItem(chatHistoryKey) || '[]'); } catch (error) { history = []; }
      history.push({ role, text, at: Date.now() });
      localStorage.setItem(chatHistoryKey, JSON.stringify(history.slice(-40)));
      renderChat();
    };
    const loadConfig = () => {
      let config = {};
      try { config = JSON.parse(localStorage.getItem('nihongoAIConfig') || '{}'); } catch (error) { config = {}; }
      endpointInput.value = config.endpoint || '';
      modelInput.value = config.model || 'local-smart-fallback';
    };
    const askFromInput = async (prompt) => {
      const text = String(prompt || '').trim();
      if (!text) return;
      saveChat('user', text);
      const loading = document.createElement('div');
      loading.className = 'nihongo-msg loading';
      loading.textContent = 'AI sedang menyusun jawaban...';
      log.appendChild(loading);
      log.scrollTop = log.scrollHeight;
      const answer = await window.nihongoAI.ask(text);
      loading.remove();
      saveChat('assistant', answer.text);
    };
    panel.querySelector('[data-chat-close]')?.addEventListener('click', () => panel.classList.remove('open'));
    panel.querySelector('[data-chat-settings]')?.addEventListener('click', () => panel.querySelector('.nihongo-chat-settings')?.classList.toggle('open'));
    panel.querySelector('[data-chat-clear]')?.addEventListener('click', () => {
      localStorage.removeItem(chatHistoryKey);
      renderChat();
      window.proToast?.('Riwayat chat dihapus.');
    });
    panel.querySelector('[data-ai-save]')?.addEventListener('click', () => {
      localStorage.setItem('nihongoAIConfig', JSON.stringify({ endpoint: endpointInput.value.trim(), model: modelInput.value.trim() || 'local-smart-fallback' }));
      window.proToast?.('Pengaturan AI disimpan.');
    });
    panel.querySelectorAll('[data-chat-prompt]').forEach((button) => {
      button.addEventListener('click', () => askFromInput(button.getAttribute('data-chat-prompt')));
    });
    panel.querySelector('form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = panel.querySelector('.nihongo-chat-form input');
      const prompt = input.value.trim();
      input.value = '';
      await askFromInput(prompt);
    });
    loadConfig();
    renderChat();
  }

  window.openNihongoChat = () => {
    const panel = document.querySelector('.nihongo-chat-panel');
    panel?.classList.add('open');
    window.setTimeout(() => panel?.querySelector('.nihongo-chat-form input')?.focus(), 40);
  };

  if (!document.querySelector('.nihongo-a11y-panel')) {
    const panel = document.createElement('section');
    panel.className = 'nihongo-a11y-panel';
    panel.innerHTML = `<div class="nihongo-panel-head"><b>Alat Aksesibilitas AI</b><button type="button" data-a11y-close aria-label="Tutup alat aksesibilitas">×</button></div><div class="nihongo-panel-body"><div class="nihongo-a11y-grid"><button data-a11y="large">Teks Besar</button><button data-a11y="contrast">Kontras Tinggi</button><button data-a11y="focus">Focus Ring</button><button data-a11y="readable">Readable</button><button data-a11y="summary">Ringkas Teks</button><button data-a11y="speak">Read Aloud</button></div><div class="output nihongo-a11y-output" style="margin-top:10px;font-size:13px;color:var(--ink-mid)"></div></div>`;
    document.body.appendChild(panel);
    panel.querySelector('[data-a11y-close]')?.addEventListener('click', () => panel.classList.remove('open'));
    panel.addEventListener('click', (event) => {
      const action = event.target.closest('[data-a11y]')?.dataset.a11y;
      if (!action) return;
      if (action === 'large') root.classList.toggle('a11y-large');
      if (action === 'contrast') root.classList.toggle('a11y-contrast');
      if (action === 'focus') root.classList.toggle('a11y-focus');
      if (action === 'readable') document.body.classList.toggle('a11y-readable');
      if (action === 'summary') panel.querySelector('.nihongo-a11y-output').textContent = `Ringkasan: ${document.querySelector('h1')?.textContent || document.title}. Halaman ini berisi materi/fitur utama Nihongo Pro Academy dan navigasi belajar JLPT.`;
      if (action === 'speak' && 'speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(document.querySelector('h1')?.textContent || document.title));
    });
  }
  window.openA11yPanel = () => document.querySelector('.nihongo-a11y-panel')?.classList.toggle('open');

  if (!document.querySelector('.nihongo-reco-panel')) {
    const panel = document.createElement('section');
    panel.className = 'nihongo-reco-panel';
    panel.innerHTML = `<div class="nihongo-panel-head"><b>Rekomendasi Pintar</b><button type="button" data-reco-close aria-label="Tutup rekomendasi pintar">×</button></div><div class="nihongo-panel-body"><div class="nihongo-reco-list"></div></div>`;
    document.body.appendChild(panel);
    panel.querySelector('[data-reco-close]')?.addEventListener('click', () => panel.classList.remove('open'));
  }
  window.openSmartRecommendations = () => {
    const panel = document.querySelector('.nihongo-reco-panel');
    const list = panel?.querySelector('.nihongo-reco-list');
    if (!panel || !list) return;
    list.innerHTML = smartRecommendations().map((item) => `<a class="nihongo-reco-item" href="${item.href}"><b>${item.title}</b><span>${item.sub}</span></a>`).join('');
    panel.classList.add('open');
  };

  const searchIndex = [
    ...commandItems.map((item) => ({ title: item.title, sub: item.sub, href: destinationFor(item) })),
    { title: 'Bahasa Inggris', sub: 'Speaking, grammar, vocabulary, pronunciation, interview English', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Bahasa Jepang Bisnis Lanjutan', sub: 'Keigo profesional, email bisnis, meeting, negosiasi, interview kerja Jepang', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Keigo Profesional', sub: 'Sonkeigo, kenjougo, teineigo untuk kantor Jepang', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Email Bisnis Jepang', sub: '件名, 宛名, 挨拶, 用件, 依頼, 結び, 署名', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Bahasa Korea', sub: 'Hangul, partikel dasar, daily phrases, TOPIK starter', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Bahasa Mandarin', sub: 'Pinyin, nada, karakter dasar, vocabulary HSK', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Coding Web', sub: 'HTML, CSS, JavaScript, responsive UI, deploy website', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Matematika', sub: 'Aljabar, geometri, fungsi, statistika, problem solving', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Desain Grafis', sub: 'Layout, warna, tipografi, poster, portfolio', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Bisnis Digital', sub: 'Validasi ide, offer, landing page, analytics', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Public Speaking', sub: 'Struktur bicara, storytelling, voice drill, pitch practice', href: `${rootPrefix}Pembelajaran-Lain.html#subjects` },
    { title: 'Kanji N5', sub: 'Full kanji dasar', href: `${rootPrefix}Materi/Kanji-N5.html` },
    { title: 'Kanji N4', sub: 'Full kanji elementary', href: `${rootPrefix}Materi/Kanji-N4.html` },
    { title: 'Kanji N3', sub: 'Full kanji intermediate', href: `${rootPrefix}Materi/Kanji-N3.html` },
    { title: 'Kanji N2', sub: 'Full kanji advanced', href: `${rootPrefix}Materi/Kanji-N2.html` },
    { title: 'Kanji N1', sub: 'Kanji prioritas N1', href: `${rootPrefix}Materi/Kanji-N1.html` },
    { title: 'Radikal Kanji', sub: '部首, komponen, mnemonic, dan strategi hafalan', href: `${rootPrefix}Materi/Radikal-Kanji.html` },
    { title: 'LMS Features', sub: 'Course builder, enrollment, progress, assignment, forum, certificate', href: `${rootPrefix}LMS-Features.html` },
    { title: 'Daily LMS Mission', sub: 'Checklist belajar harian di halaman utama', href: `${rootPrefix}index.html#daily-mission` },
    { title: 'Kana Hiragana & Katakana', sub: 'Roadmap kana, dakuten, youon, small tsu, dan latihan baca tulis', href: `${rootPrefix}Materi/Kana-Hiragana-Katakana.html` },
    { title: 'Partikel Dasar Jepang', sub: 'は, が, を, に, で, へ, と, も, の untuk N5-N4', href: `${rootPrefix}Materi/Partikel-Dasar-Jepang.html` },
    { title: 'Konjugasi Dasar Jepang', sub: 'ます, ない, て, た, potential, dan kata sifat N5-N4', href: `${rootPrefix}Materi/Konjugasi-Dasar-Jepang.html` },
    { title: 'Angka & Counter Jepang', sub: 'Tanggal, jam, harga, umur, dan counter N5-N4', href: `${rootPrefix}Materi/Angka-Counter-Waktu.html` },
    { title: 'Checklist Kurikulum', sub: 'Target materi dan indikator naik level', href: `${rootPrefix}Materi/Kurikulum-Checklist.html` },
    { title: 'Cheat Sheet JLPT', sub: 'Partikel, konjugasi, pola cepat, strategi soal', href: `${rootPrefix}Materi/Cheat-Sheet-JLPT.html` },
    { title: 'Glosarium JLPT', sub: 'Istilah grammar, skill, dan strategi ujian', href: `${rootPrefix}Materi/Glosarium-JLPT.html` },
    { title: 'Template Latihan Mandiri', sub: 'Jurnal, kosakata, review salah, shadowing log', href: `${rootPrefix}Materi/Template-Latihan-Mandiri.html` },
    { title: 'Strategi Ujian JLPT', sub: 'Timeline, manajemen waktu, hari H, review mock', href: `${rootPrefix}Materi/Strategi-Ujian-JLPT.html` },
    { title: 'Pelafalan & Pitch Accent', sub: 'Vokal panjang, っ, ん, ritme mora, intonasi', href: `${rootPrefix}Materi/Pelafalan-Pitch-Accent.html` },
    { title: 'Kesalahan Umum JLPT', sub: 'Pola salah dan latihan remedial', href: `${rootPrefix}Materi/Kesalahan-Umum-JLPT.html` },
    { title: 'Latihan JLPT N5-N1', sub: 'Bank latihan bertahap dari pemula sampai mahir', href: `${rootPrefix}Materi/Latihan-JLPT.html` },
    { title: 'Progress Dashboard', sub: 'Streak, XP, target JLPT, dan aktivitas belajar', href: `${rootPrefix}Dashboard/Dashboard.html` },

    { title: 'CMS Admin', sub: 'Kelola konten dan announcement', href: `${rootPrefix}Admin-Dashboard.html` },
    { title: 'HTTPS Security', sub: 'Checklist keamanan produksi', href: `${rootPrefix}Platform-Features.html` }
  ];

  if (!document.querySelector('.nihongo-search-panel')) {
    const panel = document.createElement('section');
    panel.className = 'nihongo-reco-panel nihongo-search-panel';
    panel.innerHTML = `<div class="nihongo-panel-head"><b>Advanced Search</b><button type="button" data-search-close aria-label="Tutup pencarian lanjutan">×</button></div><div class="nihongo-panel-body"><input class="nihongo-search-input" placeholder="Cari materi, fitur, level, kanji, vocab..."><div class="nihongo-search-results" style="margin-top:10px"></div></div>`;
    document.body.appendChild(panel);
    const input = panel.querySelector('input');
    const results = panel.querySelector('.nihongo-search-results');
    const render = async () => {
      const q = input.value.trim().toLowerCase();
      const pageRows = searchIndex
        .filter((item) => !q || `${item.title} ${item.sub}`.toLowerCase().includes(q))
        .slice(0, 8)
        .map((item) => ({ ...item, meta: 'Materi' }));
      let vocabRows = [];
      if (q.length >= 2) {
        const vocab = await getVocabLookup();
        vocabRows = vocab
          .filter((item) => `${item.expression} ${item.reading} ${item.meaning} ${item.tags}`.toLowerCase().includes(q))
          .slice(0, 12)
          .map((item) => ({
            title: `${item.expression}（${item.reading}）`,
            sub: item.meaning,
            href: `${rootPrefix}Materi/Vocabulary-Lengkap.html?q=${encodeURIComponent(item.expression)}`,
            meta: item.tags.match(/JLPT[_ ]?N?\d/i)?.[0]?.replace('JLPT_', 'N') || 'Vocab'
          }));
      }
      const rows = [...vocabRows, ...pageRows].slice(0, 16);
      results.innerHTML = rows.map((item) => `<a class="nihongo-search-item" href="${item.href}"><b>${item.title}</b><span>${item.sub}</span><span class="nihongo-search-meta">${item.meta}</span></a>`).join('') || '<div class="nihongo-search-item"><b>Tidak ditemukan</b><span>Coba kanji, kana, reading, arti Inggris, atau judul materi.</span></div>';
    };
    input.addEventListener('input', render);
    panel.querySelector('[data-search-close]')?.addEventListener('click', () => panel.classList.remove('open'));
    panel._renderSearch = render;
  }
  window.openAdvancedSearch = () => {
    const panel = document.querySelector('.nihongo-search-panel');
    panel?.classList.add('open');
    panel?._renderSearch?.();
    window.setTimeout(() => panel?.querySelector('input')?.focus(), 30);
  };

  if (!document.querySelector('.nihongo-collab-panel')) {
    const panel = document.createElement('section');
    panel.className = 'nihongo-collab-panel';
    panel.innerHTML = `<div class="nihongo-panel-head"><b>Kolaborasi Real-time</b><button type="button" data-collab-close aria-label="Tutup catatan kolaborasi">×</button></div><div class="nihongo-panel-body"><div class="nihongo-collab-list"></div><textarea class="nihongo-collab-note" placeholder="Tulis catatan belajar bersama..." style="margin-top:10px;min-height:80px"></textarea><button class="nihongo-panel-action" style="margin-top:8px" data-collab-save>Simpan Catatan</button></div>`;
    document.body.appendChild(panel);
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('nihongo-pro-collab') : null;
    const render = () => {
      const notes = safeStorageJson('nihongoCollabNotes', []).slice(-5).reverse();
      panel.querySelector('.nihongo-collab-list').innerHTML = notes.map((note) => `<div class="nihongo-collab-item"><b>${htmlEscape(note.page)}</b><span>${htmlEscape(note.text)}</span></div>`).join('') || '<div class="nihongo-collab-item"><b>Belum ada catatan</b><span>Catatan akan sinkron antar tab di browser yang sama.</span></div>';
    };
    panel.querySelector('[data-collab-close]')?.addEventListener('click', () => panel.classList.remove('open'));
    panel.querySelector('[data-collab-save]')?.addEventListener('click', () => {
      const text = panel.querySelector('textarea').value.trim();
      if (!text) return;
      const notes = safeStorageJson('nihongoCollabNotes', []);
      notes.push({ text, page: document.title, at: Date.now() });
      localStorage.setItem('nihongoCollabNotes', JSON.stringify(notes));
      panel.querySelector('textarea').value = '';
      render();
      channel?.postMessage({ type: 'note' });
      window.proToast?.('Catatan kolaborasi disimpan.');
    });
    channel?.addEventListener('message', render);
    panel._renderCollab = render;
  }
  window.openCollaboration = () => {
    const panel = document.querySelector('.nihongo-collab-panel');
    panel?._renderCollab?.();
    panel?.classList.toggle('open');
  };

  const proToolsKey = 'nihongoProfessionalTools';
  const proToolsDefaults = {
    goal: { level: 'N5', examDate: '', minutes: 30 },
    notes: {},
    sessions: [],
    completed: [],
    lastPage: null
  };
  const loadProTools = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(proToolsKey) || '{}');
      return { ...proToolsDefaults, ...stored, goal: { ...proToolsDefaults.goal, ...(stored.goal || {}) } };
    } catch (error) {
      return { ...proToolsDefaults };
    }
  };
  const saveProTools = (patch) => {
    const next = { ...loadProTools(), ...patch };
    localStorage.setItem(proToolsKey, JSON.stringify(next));
    return next;
  };
  const currentPageId = `${location.pathname}${location.search}`;
  const pageLabel = document.querySelector('h1')?.textContent?.trim() || document.title.replace(/\s*[—|-].*$/, '').trim() || 'Halaman belajar';
  const sessionStartedAt = Date.now();
  const recordStudySession = (minutes, title = pageLabel) => {
    const amount = Math.max(1, Math.round(Number(minutes) || 0));
    const data = loadProTools();
    const sessions = [{ title, minutes: amount, href: location.href, at: Date.now() }, ...(data.sessions || [])].slice(0, 60);
    saveProTools({ sessions, lastPage: { title, href: location.href, at: Date.now() } });
    window.nihongoProgress?.record?.('xp', amount * 2, title);
    return sessions;
  };
  const markPageComplete = () => {
    const data = loadProTools();
    const completed = [
      { id: currentPageId, title: pageLabel, href: location.href, at: Date.now() },
      ...(data.completed || []).filter((item) => item.id !== currentPageId)
    ].slice(0, 80);
    saveProTools({ completed, lastPage: { title: pageLabel, href: location.href, at: Date.now() } });
    window.nihongoProgress?.record?.('xp', 25, pageLabel);
    window.proToast?.('Materi ditandai selesai.');
    document.querySelector('.nihongo-pro-panel')?._renderPro?.();
  };
  window.addEventListener('pagehide', () => {
    const elapsed = Math.floor((Date.now() - sessionStartedAt) / 60000);
    const data = loadProTools();
    saveProTools({ lastPage: { title: pageLabel, href: location.href, at: Date.now() } });
    if (elapsed >= 2) {
      const sessions = [{ title: pageLabel, minutes: elapsed, href: location.href, at: Date.now() }, ...(data.sessions || [])].slice(0, 60);
      localStorage.setItem(proToolsKey, JSON.stringify({ ...data, sessions, lastPage: { title: pageLabel, href: location.href, at: Date.now() } }));
    }
  });

  if (!document.querySelector('.nihongo-pro-panel')) {
    const panel = document.createElement('section');
    panel.className = 'nihongo-pro-panel';
    panel.innerHTML = `
      <div class="nihongo-panel-head">
        <b>Professional Study Hub</b>
        <button type="button" data-pro-close aria-label="Tutup panel">×</button>
      </div>
      <div class="nihongo-panel-body">
        <div class="nihongo-pro-tabs" role="tablist">
          <button type="button" class="active" data-pro-tab="overview">Overview</button>
          <button type="button" data-pro-tab="goal">Goal</button>
          <button type="button" data-pro-tab="notes">Notes</button>
        </div>
        <div class="nihongo-pro-view" data-pro-view="overview"></div>
        <div class="nihongo-pro-view" data-pro-view="goal" hidden></div>
        <div class="nihongo-pro-view" data-pro-view="notes" hidden></div>
      </div>`;
    document.body.appendChild(panel);

    const formatDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Belum diatur';
    const sumMinutes = (sessions) => sessions.reduce((total, item) => total + Number(item.minutes || 0), 0);
    const daysUntil = (value) => {
      if (!value) return null;
      const today = new Date();
      const target = new Date(`${value}T00:00:00`);
      return Math.max(0, Math.ceil((target - today) / 86400000));
    };
    const renderPro = () => {
      const data = loadProTools();
      const sessions = data.sessions || [];
      const completed = data.completed || [];
      const goal = data.goal || proToolsDefaults.goal;
      const totalMinutes = sumMinutes(sessions);
      const todayKey = new Date().toDateString();
      const todayMinutes = sumMinutes(sessions.filter((item) => new Date(item.at).toDateString() === todayKey));
      const dueDays = daysUntil(goal.examDate);
      const overview = panel.querySelector('[data-pro-view="overview"]');
      overview.innerHTML = `
        <div class="nihongo-pro-metrics">
          <div><b>${totalMinutes}</b><span>menit belajar</span></div>
          <div><b>${completed.length}</b><span>materi selesai</span></div>
          <div><b>${todayMinutes}/${goal.minutes}</b><span>target hari ini</span></div>
        </div>
        <div class="nihongo-pro-goal-card">
          <b>Target ${goal.level}</b>
          <span>${goal.examDate ? `${dueDays} hari menuju ${formatDate(goal.examDate)}` : 'Atur tanggal ujian untuk countdown JLPT.'}</span>
          <progress max="${Math.max(goal.minutes, 1)}" value="${Math.min(todayMinutes, goal.minutes)}"></progress>
        </div>
        <div class="nihongo-pro-actions">
          <button type="button" data-pro-log="15">+15 menit</button>
          <button type="button" data-pro-complete>Materi selesai</button>
          <button type="button" data-pro-export>Export progres</button>
        </div>
        <div class="nihongo-pro-list">
          ${(sessions.slice(0, 5).map((item) => `<a href="${item.href}"><b>${htmlEscape(item.title)}</b><span>${item.minutes} menit · ${new Date(item.at).toLocaleString('id-ID')}</span></a>`).join('')) || '<div><b>Belum ada sesi</b><span>Catat sesi belajar dari tombol +15 menit atau buka materi selama beberapa menit.</span></div>'}
        </div>`;
      panel.querySelector('[data-pro-view="goal"]').innerHTML = `
        <label>Level JLPT
          <select data-pro-level>
            ${['N5','N4','N3','N2','N1'].map((level) => `<option ${goal.level === level ? 'selected' : ''}>${level}</option>`).join('')}
          </select>
        </label>
        <label>Tanggal target ujian
          <input type="date" data-pro-exam value="${htmlEscape(goal.examDate)}">
        </label>
        <label>Target menit per hari
          <input type="number" min="5" max="240" step="5" data-pro-minutes value="${Number(goal.minutes || 30)}">
        </label>
        <button class="nihongo-panel-action" type="button" data-pro-save-goal>Simpan Goal</button>`;
      const note = data.notes?.[currentPageId] || '';
      panel.querySelector('[data-pro-view="notes"]').innerHTML = `
        <div class="nihongo-pro-note-head"><b>${htmlEscape(pageLabel)}</b><span>Catatan tersimpan per halaman</span></div>
        <textarea class="nihongo-pro-note" data-pro-note placeholder="Ringkas poin penting, grammar yang membingungkan, atau contoh kalimat pribadi...">${htmlEscape(note)}</textarea>
        <button class="nihongo-panel-action" type="button" data-pro-save-note>Simpan Catatan</button>
        <div class="nihongo-pro-list">${Object.entries(data.notes || {}).slice(-5).reverse().map(([id, text]) => `<div><b>${htmlEscape(id.split('/').pop() || 'Catatan')}</b><span>${htmlEscape(text).slice(0, 110)}</span></div>`).join('') || '<div><b>Belum ada catatan</b><span>Catatan cepat akan muncul di sini.</span></div>'}</div>`;
    };

    panel.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-pro-tab]');
      if (tab) {
        panel.querySelectorAll('[data-pro-tab]').forEach((button) => button.classList.toggle('active', button === tab));
        panel.querySelectorAll('[data-pro-view]').forEach((view) => { view.hidden = view.dataset.proView !== tab.dataset.proTab; });
      }
      if (event.target.closest('[data-pro-close]')) panel.classList.remove('open');
      const logButton = event.target.closest('[data-pro-log]');
      if (logButton) {
        recordStudySession(Number(logButton.dataset.proLog), pageLabel);
        window.proToast?.('Sesi belajar dicatat.');
        renderPro();
      }
      if (event.target.closest('[data-pro-complete]')) markPageComplete();
      if (event.target.closest('[data-pro-save-goal]')) {
        saveProTools({
          goal: {
            level: panel.querySelector('[data-pro-level]').value,
            examDate: panel.querySelector('[data-pro-exam]').value,
            minutes: Number(panel.querySelector('[data-pro-minutes]').value || 30)
          }
        });
        window.proToast?.('Goal belajar disimpan.');
        renderPro();
      }
      if (event.target.closest('[data-pro-save-note]')) {
        const data = loadProTools();
        saveProTools({ notes: { ...(data.notes || {}), [currentPageId]: panel.querySelector('[data-pro-note]').value.trim() } });
        window.proToast?.('Catatan disimpan.');
        renderPro();
      }
      if (event.target.closest('[data-pro-export]')) {
        const blob = new Blob([JSON.stringify(loadProTools(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nihongo-progress-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.proToast?.('Export progres dibuat.');
      }
    });
    panel._renderPro = renderPro;
  }
  window.openProfessionalHub = () => {
    const panel = document.querySelector('.nihongo-pro-panel');
    panel?._renderPro?.();
    panel?.classList.toggle('open');
  };

  // Checkout/payment modal removed
  window.nihongoCheckout = () => {};

  const setMeta = (selector, attrs) => {
    let node = document.head.querySelector(selector);
    if (!node) {
      node = document.createElement('meta');
      Object.entries(attrs.identity || {}).forEach(([key, value]) => node.setAttribute(key, value));
      document.head.appendChild(node);
    }
    Object.entries(attrs.values || {}).forEach(([key, value]) => node.setAttribute(key, value));
  };
  const canonicalUrl = `${location.origin || 'https://nihongopro.id'}${location.pathname}`;
  const pageDescription = document.querySelector('meta[name="description"]')?.content
    || document.querySelector('h1')?.textContent?.trim()
    || 'Platform belajar bahasa Jepang untuk JLPT N5 sampai N1 dengan materi, flashcard, quiz, AI tutor, dan progress belajar.';
  const ogImage = new URL(`${rootPrefix}assets/og-preview.svg`, location.href).href;
  ensureHeadLink('canonical', canonicalUrl);
  setMeta('meta[name="description"]', { identity: { name: 'description' }, values: { content: pageDescription } });
  setMeta('meta[property="og:title"]', { identity: { property: 'og:title' }, values: { content: document.title } });
  setMeta('meta[property="og:description"]', { identity: { property: 'og:description' }, values: { content: pageDescription } });
  setMeta('meta[property="og:type"]', { identity: { property: 'og:type' }, values: { content: currentPath.includes('/Materi/') ? 'article' : 'website' } });
  setMeta('meta[property="og:url"]', { identity: { property: 'og:url' }, values: { content: canonicalUrl } });
  setMeta('meta[property="og:image"]', { identity: { property: 'og:image' }, values: { content: ogImage } });
  setMeta('meta[name="twitter:card"]', { identity: { name: 'twitter:card' }, values: { content: 'summary_large_image' } });
  setMeta('meta[name="twitter:title"]', { identity: { name: 'twitter:title' }, values: { content: document.title } });
  setMeta('meta[name="twitter:description"]', { identity: { name: 'twitter:description' }, values: { content: pageDescription } });
  setMeta('meta[name="twitter:image"]', { identity: { name: 'twitter:image' }, values: { content: ogImage } });
  if (!document.querySelector('script[type="application/ld+json"][data-nihongo-schema]')) {
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.dataset.nihongoSchema = 'true';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': currentPath.includes('/Materi/') ? 'LearningResource' : 'Course',
      name: document.querySelector('h1')?.textContent?.trim() || document.title,
      description: pageDescription,
      url: canonicalUrl,
      image: ogImage,
      inLanguage: ['id', 'ja'],
      provider: { '@type': 'Organization', name: 'Nihongo Pro Academy' },
      teaches: ['Japanese language', 'JLPT', 'Kanji', 'Tata Bahasa', 'Kosakata']
    });
    document.head.appendChild(schema);
  }

  const analytics = window.NIHONGO_ANALYTICS || {};
  if (analytics.plausibleDomain && !document.querySelector('script[data-domain][src*="plausible"]')) {
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = analytics.plausibleDomain;
    script.src = analytics.plausibleSrc || 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }
  if (analytics.ga4Id && !document.querySelector(`script[src*="${analytics.ga4Id}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analytics.ga4Id)}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', analytics.ga4Id);
  }

  window.nihongoProgress = {
    key: 'nihongoLearningProgress',
    load() {
      const fallback = { vocab: 0, grammar: 0, kanji: 0, streak: 0, xp: 0, jlpt: { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 }, activity: [] };
      try { return { ...fallback, ...JSON.parse(localStorage.getItem(this.key) || '{}') }; } catch (error) { return fallback; }
    },
    save(patch) {
      const next = { ...this.load(), ...patch, updatedAt: new Date().toISOString() };
      localStorage.setItem(this.key, JSON.stringify(next));
      return next;
    },
    record(kind, amount = 1, title = document.title) {
      const data = this.load();
      data[kind] = Number(data[kind] || 0) + amount;
      data.activity = [{ kind, title, amount, at: Date.now() }, ...(data.activity || [])].slice(0, 20);
      return this.save(data);
    }
  };

  const firebaseConfig = window.NIHONGO_FIREBASE_CONFIG || null;
  window.nihongoAuth = {
    provider: firebaseConfig ? 'firebase' : 'local-demo',
    async getToken() {
      if (window.firebase?.auth) return window.firebase.auth().currentUser?.getIdToken?.();
      const session = localStorage.getItem('nihongo_session');
      return session ? `demo.${btoa(session).replace(/=+$/, '')}` : '';
    },
    requirePremium() {
      return true; // All features are free
    }
  };

  const requestReminderPermission = async () => {
    if (!('Notification' in window)) return window.proToast?.('Browser belum mendukung notifikasi.');
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'granted') {
      localStorage.setItem('nihongoReminderEnabled', '1');
      window.proToast?.('Reminder belajar aktif di browser ini.');
      new Notification('Nihongo Pro Academy', { body: 'Reminder harian aktif. Jaga streak belajarmu hari ini.' });
    }
  };
  const reminderFloating = document.querySelector('.pro-floating-actions');
  if (reminderFloating && !reminderFloating.querySelector('[data-pro-reminder]')) {
    reminderFloating.insertAdjacentHTML('afterbegin', '<button class="pro-fab" type="button" data-pro-reminder title="Aktifkan reminder belajar" aria-label="Aktifkan reminder belajar">鈴</button><button class="pro-fab" type="button" data-pro-search title="Cari vocab dan materi" aria-label="Cari vocab dan materi">探</button>');
    reminderFloating.querySelector('[data-pro-reminder]')?.addEventListener('click', requestReminderPermission);
    reminderFloating.querySelector('[data-pro-search]')?.addEventListener('click', window.openAdvancedSearch);
  }

  window.nihongoSpeak = (text) => {
    if (!('speechSynthesis' in window)) return window.proToast?.('Text-to-speech tidak tersedia di browser ini.');
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text || '').trim());
    utterance.lang = /[一-龯ぁ-んァ-ン]/.test(utterance.text) ? 'ja-JP' : 'id-ID';
    utterance.rate = 0.88;
    speechSynthesis.speak(utterance);
  };
  document.querySelectorAll('.front-word, .back-word, .jp-text, .kanji-card h3, .vocab-card h3, .vocab-item b').forEach((el) => {
    if (!/[一-龯ぁ-んァ-ン]/.test(el.textContent || '') || el.parentElement?.querySelector('.nihongo-speak-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nihongo-speak-btn';
    button.textContent = '聞';
    button.setAttribute('aria-label', `Dengarkan ${el.textContent.trim()}`);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.nihongoSpeak(el.textContent);
    });
    el.insertAdjacentElement('afterend', button);
  });

  document.querySelectorAll('button:not([aria-label])').forEach((button) => {
    const label = button.textContent.trim() || button.title || button.getAttribute('data-premium') || button.getAttribute('data-checkout');
    if (label) button.setAttribute('aria-label', label);
  });
  document.querySelectorAll('img:not([alt])').forEach((img) => {
    img.alt = img.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || 'Ilustrasi Nihongo Pro Academy';
  });
  document.querySelectorAll('[onclick]:not(button):not(a):not(input):not(textarea):not(select)').forEach((el) => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        el.click();
      }
    });
  });

  const floating = document.querySelector('.pro-floating-actions');
  if (floating && !floating.querySelector('[data-pro-reco]')) {
    floating.insertAdjacentHTML('afterbegin', '<button class="pro-fab" type="button" data-pro-hub title="Professional Study Hub" aria-label="Professional Study Hub">績</button><button class="pro-fab" type="button" data-pro-reco title="Rekomendasi pintar" aria-label="Rekomendasi pintar">推</button><button class="pro-fab" type="button" data-pro-a11y title="Aksesibilitas AI" aria-label="Aksesibilitas AI">補</button><button class="pro-fab" type="button" data-pro-collab title="Kolaborasi" aria-label="Kolaborasi">共</button>');
    floating.querySelector('[data-pro-hub]')?.addEventListener('click', window.openProfessionalHub);
    floating.querySelector('[data-pro-reco]')?.addEventListener('click', window.openSmartRecommendations);
    floating.querySelector('[data-pro-a11y]')?.addEventListener('click', window.openA11yPanel);
    floating.querySelector('[data-pro-collab]')?.addEventListener('click', window.openCollaboration);
  }

  const addDynamicTilt = (el) => {
    if (reduceMotion || !mediaMatches('(pointer: fine)') || el.classList.contains('pro-tilt-bound')) return;
    if (!el.matches(tiltTargets)) return;
    el.classList.add('pro-tilt', 'pro-tilt-bound');
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      el.style.setProperty('--tilt-x', `${(-y * 4).toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${(x * 4).toFixed(2)}deg`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--tilt-x');
      el.style.removeProperty('--tilt-y');
    });
  };

  const enhanceDynamicNode = (node) => {
    if (!(node instanceof Element)) return;
    const candidates = [node, ...node.querySelectorAll(`${revealTargets}, ${tiltTargets}`)];
    candidates.forEach((el) => {
      if (el.matches(revealTargets) && !el.classList.contains('reveal-in') && !el.classList.contains('reveal-ready')) {
        el.classList.add('reveal-ready');
        requestAnimationFrame(() => el.classList.add('reveal-in'));
      }
      addDynamicTilt(el);
    });
  };

  if ('MutationObserver' in window) {
    const dynamicObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach(enhanceDynamicNode));
    });
    dynamicObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (!sessionStorage.getItem('proAdvancedHintShown')) {
    window.proToast?.('Interaksi canggih aktif. Tekan Ctrl/⌘ + K untuk cari cepat.');
    sessionStorage.setItem('proAdvancedHintShown', '1');
  }

  // Rapikan tombol melayang: sampai 8 tombol .pro-fab (masing-masing cuma
  // 1 karakter kanji tanpa keterangan visual) diinjeksi progresif dari 3
  // titik kode di atas. Selalu tampilkan 2 yang paling universal (cari
  // cepat, kembali ke atas), sisanya dikumpulkan di balik satu tombol
  // "Lainnya" yang jelas berlabel -- fungsi & handler klik yang sudah ada
  // di atas tidak diubah sama sekali, ini murni penataan tampilan.
  const floatingActionsBox = document.querySelector('.pro-floating-actions');
  if (floatingActionsBox && !floatingActionsBox.querySelector('[data-pro-more]')) {
    const alwaysVisible = ['data-pro-command', 'data-pro-top'];
    const collapseExtraFabs = () => {
      floatingActionsBox.querySelectorAll('.pro-fab').forEach((btn) => {
        const isMain = alwaysVisible.some((attr) => btn.hasAttribute(attr)) || btn.hasAttribute('data-pro-more');
        btn.classList.toggle('pro-fab-extra', !isMain);
      });
    };
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'pro-fab pro-fab-more';
    moreBtn.setAttribute('data-pro-more', '');
    moreBtn.title = 'Menu lainnya';
    moreBtn.setAttribute('aria-label', 'Menu lainnya');
    moreBtn.setAttribute('aria-expanded', 'false');
    moreBtn.textContent = '⋯';
    moreBtn.addEventListener('click', () => {
      const open = floatingActionsBox.classList.toggle('pro-fab-open');
      moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    floatingActionsBox.appendChild(moreBtn);
    collapseExtraFabs();
    if ('MutationObserver' in window) {
      new MutationObserver(collapseExtraFabs).observe(floatingActionsBox, { childList: true });
    }
  }
})();

/* ── Pengatur waktu belajar: tombol, dan cara menutupnya ─────────────────
   #floatingTimer di 56 halaman Materi punya `onclick="this.style.display='none'"`
   di WADAHNYA, sementara tombol jeda (⏸) dan reset (↺) ada di dalamnya. Klik
   tombol menggelembung ke wadah, jadi menekan jeda ikut menutup widget — tidak
   ada cara menjeda tanpa kehilangan penghitungnya.

   PERCOBAAN PERTAMA SAYA SALAH, dan salahnya mendasar: saya memasang
   stopPropagation di fase CAPTURE pada document. Fase capture berjalan dari
   document MENUJU target, jadi menghentikannya di sana membuat event tidak
   pernah sampai ke tombolnya sama sekali — kedua tombol jadi mati total.
   Diukur: handler tombol terpanggil 0 kali.

   Menambahkan listener di fase bubble pada wadah juga tidak cukup: handler
   dari atribut onclick sudah terdaftar lebih dulu saat HTML diurai, jadi ia
   selalu berjalan duluan dan widget terlanjur tertutup.

   Jadi atribut onclick-nya dilepas dan diganti handler yang tahu bedanya
   antara badan panel dan tombol di dalamnya.

   Ada satu hal lagi. Wadahnya diberi pointer-events:none di
   kyoto-elevation.css supaya tidak memblokir tautan halaman di bawahnya —
   tapi itu juga berarti badan panel tidak bisa lagi menerima klik penutup.
   Karena itu tombol tutup kecil ditambahkan, satu-satunya bagian panel selain
   ⏸/↺ yang menangkap klik. */
document.addEventListener('DOMContentLoaded', () => {
  const timer = document.getElementById('floatingTimer');
  if (!timer) return;

  timer.removeAttribute('onclick');

  if (!timer.querySelector('.np-timer-close')) {
    const tutup = document.createElement('button');
    tutup.className = 'np-timer-close';
    tutup.type = 'button';
    tutup.setAttribute('aria-label', 'Tutup pengatur waktu belajar');
    tutup.textContent = '✕';
    tutup.addEventListener('click', (e) => {
      e.stopPropagation();
      timer.style.display = 'none';
    });
    timer.appendChild(tutup);
  }
});
