// ── DARK MODE ──
// Guard ditambahkan (pola sama dengan updateNavUI() di bawah): themeToggle
// bisa null karena navbar lama sudah digantikan kyoto-navbar.min.js dengan ID
// berbeda. Tanpa guard, baris ini melempar TypeError dan MENGHENTIKAN seluruh
// skrip index — termasuk hamburger menu, flashcard, kuis, dsb yang didefinisikan
// di bawahnya. Juga didelegasikan ke window.NPDark jika tersedia (dark-mode-toggle.js
// dimuat lebih dulu di index.html) supaya tidak bentrok dengan localStorage key lain.
const themeToggle = document.getElementById('themeToggle');
if (typeof window.NPDark === 'object' && window.NPDark !== null) {
  if (themeToggle) themeToggle.textContent = window.NPDark.isDarkActive() ? '☀️' : '🌙';
  if (themeToggle) themeToggle.addEventListener('click', () => {
    window.NPDark.toggle();
    themeToggle.textContent = window.NPDark.isDarkActive() ? '☀️' : '🌙';
  });
} else {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') { document.documentElement.setAttribute('data-theme','dark'); if (themeToggle) themeToggle.textContent = '☀️'; }
  if (themeToggle) themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.textContent = isDark ? '🌙' : '☀️';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  });
}

// ── HAMBURGER MENU ──
const ham = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (ham && mobileMenu) {
  ham.addEventListener('click', () => {
    ham.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  document.querySelectorAll('.mobile-link, .mobile-menu .btn-primary').forEach(a => {
    a.addEventListener('click', () => {
      ham.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ── FLASHCARD AUTO-CYCLE ──
const cards = [
  { kana: 'あ', romaji: 'a', meaning: 'Vokal pertama' },
  { kana: 'か', romaji: 'ka', meaning: 'Konsonan K' },
  { kana: 'さ', romaji: 'sa', meaning: 'Konsonan S' },
  { kana: 'た', romaji: 'ta', meaning: 'Konsonan T' },
  { kana: 'な', romaji: 'na', meaning: 'Konsonan N' },
  { kana: 'は', romaji: 'ha', meaning: 'Konsonan H' },
  { kana: 'ま', romaji: 'ma', meaning: 'Konsonan M' },
  { kana: 'や', romaji: 'ya', meaning: 'Semi-vokal Y' },
  { kana: 'ら', romaji: 'ra', meaning: 'Konsonan R' },
  { kana: 'わ', romaji: 'wa', meaning: 'Semi-vokal W' },
];
let ci = 0;
const fcKana = document.getElementById('fc-kana');
const fcRomaji = document.getElementById('fc-romaji');
const fcMeaning = document.getElementById('fc-meaning');
const fcCard = document.getElementById('flashcard');
function nextCard() {
  ci = (ci + 1) % cards.length;
  fcCard.style.opacity = '0';
  fcCard.style.transform = 'translateY(-10px)';
  setTimeout(() => {
    fcKana.textContent = cards[ci].kana;
    fcRomaji.textContent = cards[ci].romaji;
    fcMeaning.textContent = cards[ci].meaning;
    fcCard.style.transition = 'opacity 0.4s, transform 0.4s';
    fcCard.style.opacity = '1';
    fcCard.style.transform = 'translateY(0)';
  }, 300);
}
if (fcCard) { fcCard.addEventListener('click', nextCard); setInterval(nextCard, 3000); }

// ── KANA DATA ──
const hiraganaData = [
  {j:'あ',r:'a',ex:'あか',exR:'aka — merah',strokes:3},{j:'い',r:'i',ex:'いぬ',exR:'inu — anjing',strokes:2},{j:'う',r:'u',ex:'うみ',exR:'umi — laut',strokes:2},{j:'え',r:'e',ex:'えき',exR:'eki — stasiun',strokes:2},{j:'お',r:'o',ex:'おに',exR:'oni — hantu',strokes:3},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'か',r:'ka',ex:'かさ',exR:'kasa — payung',strokes:3},{j:'き',r:'ki',ex:'きく',exR:'kiku — krisan',strokes:4},{j:'く',r:'ku',ex:'くも',exR:'kumo — awan',strokes:1},{j:'け',r:'ke',ex:'けん',exR:'ken — pedang',strokes:3},{j:'こ',r:'ko',ex:'こい',exR:'koi — cinta',strokes:2},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'さ',r:'sa',ex:'さかな',exR:'sakana — ikan',strokes:3},{j:'し',r:'shi',ex:'しろ',exR:'shiro — putih',strokes:1},{j:'す',r:'su',ex:'すし',exR:'sushi',strokes:2},{j:'せ',r:'se',ex:'せかい',exR:'sekai — dunia',strokes:3},{j:'そ',r:'so',ex:'そら',exR:'sora — langit',strokes:1},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'た',r:'ta',ex:'たまご',exR:'tamago — telur',strokes:4},{j:'ち',r:'chi',ex:'ちず',exR:'chizu — peta',strokes:2},{j:'つ',r:'tsu',ex:'つき',exR:'tsuki — bulan',strokes:1},{j:'て',r:'te',ex:'てがみ',exR:'tegami — surat',strokes:2},{j:'と',r:'to',ex:'とり',exR:'tori — burung',strokes:2},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'な',r:'na',ex:'なつ',exR:'natsu — musim panas',strokes:4},{j:'に',r:'ni',ex:'にほん',exR:'Nihon — Jepang',strokes:3},{j:'ぬ',r:'nu',ex:'ぬの',exR:'nuno — kain',strokes:2},{j:'ね',r:'ne',ex:'ねこ',exR:'neko — kucing',strokes:2},{j:'の',r:'no',ex:'のり',exR:'nori — rumput laut',strokes:1},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'は',r:'ha',ex:'はな',exR:'hana — bunga',strokes:3},{j:'ひ',r:'hi',ex:'ひと',exR:'hito — orang',strokes:2},{j:'ふ',r:'fu',ex:'ふじ',exR:'Fuji — Gunung Fuji',strokes:4},{j:'へ',r:'he',ex:'へや',exR:'heya — kamar',strokes:1},{j:'ほ',r:'ho',ex:'ほし',exR:'hoshi — bintang',strokes:4},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'ま',r:'ma',ex:'まど',exR:'mado — jendela',strokes:3},{j:'み',r:'mi',ex:'みず',exR:'mizu — air',strokes:2},{j:'む',r:'mu',ex:'むし',exR:'mushi — serangga',strokes:3},{j:'め',r:'me',ex:'めだか',exR:'medaka — ikan kecil',strokes:2},{j:'も',r:'mo',ex:'もり',exR:'mori — hutan',strokes:3},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'や',r:'ya',ex:'やま',exR:'yama — gunung',strokes:3},{j:'',r:''},{j:'ゆ',r:'yu',ex:'ゆき',exR:'yuki — salju',strokes:2},{j:'',r:''},{j:'よ',r:'yo',ex:'よる',exR:'yoru — malam',strokes:2},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'ら',r:'ra',ex:'らいねん',exR:'rainen — tahun depan',strokes:2},{j:'り',r:'ri',ex:'りんご',exR:'ringo — apel',strokes:2},{j:'る',r:'ru',ex:'るす',exR:'rusu — tidak ada di rumah',strokes:1},{j:'れ',r:'re',ex:'れんあい',exR:'renai — percintaan',strokes:2},{j:'ろ',r:'ro',ex:'ろうか',exR:'rouka — koridor',strokes:1},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'わ',r:'wa',ex:'わたし',exR:'watashi — saya',strokes:2},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'を',r:'wo',ex:'(partikel objek)',exR:'partikel wo — objek',strokes:3},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'ん',r:'n',ex:'(nasal)',exR:'bunpai — distribusi',strokes:1},
  // Dakuten (voiced)
  {j:'が',r:'ga',ex:'がっこう',exR:'gakkou — sekolah',strokes:3},{j:'ぎ',r:'gi',ex:'ぎんこう',exR:'ginkou — bank',strokes:3},{j:'ぐ',r:'gu',ex:'ぐっすり',exR:'gussuri — nyenyak',strokes:2},{j:'げ',r:'ge',ex:'げんき',exR:'genki — semangat',strokes:3},{j:'ご',r:'go',ex:'ごはん',exR:'gohan — nasi',strokes:3},
  {j:'ざ',r:'za',ex:'ざっし',exR:'zasshi — majalah',strokes:3},{j:'じ',r:'ji',ex:'じかん',exR:'jikan — waktu',strokes:1},{j:'ず',r:'zu',ex:'ずっと',exR:'zutto — terus',strokes:2},{j:'ぜ',r:'ze',ex:'ぜんぜん',exR:'zenzen — sama sekali',strokes:3},{j:'ぞ',r:'zo',ex:'ぞう',exR:'zou — gajah',strokes:2},
  {j:'だ',r:'da',ex:'だいじょうぶ',exR:'daijoubu — tidak apa-apa',strokes:4},{j:'ぢ',r:'ji*',ex:'はなぢ',exR:'hanaji — mimisan',strokes:2},{j:'づ',r:'zu*',ex:'つづく',exR:'tsuzuku — berlanjut',strokes:1},{j:'で',r:'de',ex:'でんしゃ',exR:'densha — kereta',strokes:3},{j:'ど',r:'do',ex:'どうぞ',exR:'douzo — silakan',strokes:5},
  {j:'ば',r:'ba',ex:'ばんごはん',exR:'bangohan — makan malam',strokes:3},{j:'び',r:'bi',ex:'びょういん',exR:'byouin — RS',strokes:4},{j:'ぶ',r:'bu',ex:'ぶんか',exR:'bunka — budaya',strokes:3},{j:'べ',r:'be',ex:'べんきょう',exR:'benkyou — belajar',strokes:2},{j:'ぼ',r:'bo',ex:'ぼうし',exR:'boushi — topi',strokes:4},
  // Handakuten (semi-voiced)
  {j:'ぱ',r:'pa',ex:'ぱあと',exR:'paato — part-time',strokes:3},{j:'ぴ',r:'pi',ex:'ぴかぴか',exR:'pikapika — berkilau',strokes:4},{j:'ぷ',r:'pu',ex:'ぷれぜんと',exR:'purezento — hadiah',strokes:3},{j:'ぺ',r:'pe',ex:'ぺん',exR:'pen — pena',strokes:2},{j:'ぽ',r:'po',ex:'ぽすと',exR:'posuto — kotak pos',strokes:4},
];

const katakanaData = [
  {j:'ア',r:'a',ex:'アイス',exR:'aisu — es krim',strokes:2},{j:'イ',r:'i',ex:'インク',exR:'inku — tinta',strokes:2},{j:'ウ',r:'u',ex:'ウマ',exR:'uma — kuda',strokes:3},{j:'エ',r:'e',ex:'エレベータ',exR:'erebeeta — lift',strokes:3},{j:'オ',r:'o',ex:'オレンジ',exR:'orenji — jeruk',strokes:3},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'カ',r:'ka',ex:'カメラ',exR:'kamera — kamera',strokes:2},{j:'キ',r:'ki',ex:'キウイ',exR:'kiui — kiwi',strokes:3},{j:'ク',r:'ku',ex:'クラス',exR:'kurasu — kelas',strokes:2},{j:'ケ',r:'ke',ex:'ケーキ',exR:'keeki — kue',strokes:3},{j:'コ',r:'ko',ex:'コーヒー',exR:'koohii — kopi',strokes:2},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'サ',r:'sa',ex:'サッカー',exR:'sakkaa — sepak bola',strokes:3},{j:'シ',r:'shi',ex:'シャツ',exR:'shatsu — kemeja',strokes:3},{j:'ス',r:'su',ex:'スポーツ',exR:'supootsu — olahraga',strokes:2},{j:'セ',r:'se',ex:'セーター',exR:'seetaa — sweater',strokes:3},{j:'ソ',r:'so',ex:'ソファ',exR:'sofa — sofa',strokes:2},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'タ',r:'ta',ex:'タクシー',exR:'takushii — taksi',strokes:3},{j:'チ',r:'chi',ex:'チケット',exR:'chiketto — tiket',strokes:3},{j:'ツ',r:'tsu',ex:'ツアー',exR:'tsua — tur',strokes:3},{j:'テ',r:'te',ex:'テレビ',exR:'terebi — TV',strokes:3},{j:'ト',r:'to',ex:'トマト',exR:'tomato — tomat',strokes:2},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'ナ',r:'na',ex:'ナイフ',exR:'naifu — pisau',strokes:2},{j:'ニ',r:'ni',ex:'ニュース',exR:'nyuusu — berita',strokes:2},{j:'ヌ',r:'nu',ex:'ヌードル',exR:'nuudoru — mie',strokes:2},{j:'ネ',r:'ne',ex:'ネクタイ',exR:'nekutai — dasi',strokes:4},{j:'ノ',r:'no',ex:'ノート',exR:'nooto — buku catatan',strokes:1},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'ハ',r:'ha',ex:'ハンバーガー',exR:'hanbaagaa — hamburger',strokes:2},{j:'ヒ',r:'hi',ex:'ヒーロー',exR:'hiiroo — hero',strokes:2},{j:'フ',r:'fu',ex:'フランス',exR:'Furansu — Prancis',strokes:1},{j:'ヘ',r:'he',ex:'ヘルメット',exR:'herumetto — helm',strokes:1},{j:'ホ',r:'ho',ex:'ホテル',exR:'hoteru — hotel',strokes:4},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'マ',r:'ma',ex:'マクドナルド',exR:'Makudonarudo — McDonald\'s',strokes:2},{j:'ミ',r:'mi',ex:'ミルク',exR:'miruku — susu',strokes:3},{j:'ム',r:'mu',ex:'ムービー',exR:'muubii — film',strokes:3},{j:'メ',r:'me',ex:'メニュー',exR:'menyuu — menu',strokes:2},{j:'モ',r:'mo',ex:'モデル',exR:'moderu — model',strokes:3},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'ヤ',r:'ya',ex:'ヤクルト',exR:'Yakuruto — Yakult',strokes:3},{j:'',r:''},{j:'ユ',r:'yu',ex:'ユニフォーム',exR:'yunifoomu — seragam',strokes:3},{j:'',r:''},{j:'ヨ',r:'yo',ex:'ヨーグルト',exR:'yooguruto — yogurt',strokes:3},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'ラ',r:'ra',ex:'ラーメン',exR:'raamen — ramen',strokes:2},{j:'リ',r:'ri',ex:'リモコン',exR:'rimokon — remote',strokes:2},{j:'ル',r:'ru',ex:'ルール',exR:'ruuru — aturan',strokes:2},{j:'レ',r:'re',ex:'レモン',exR:'remon — lemon',strokes:1},{j:'ロ',r:'ro',ex:'ロボット',exR:'robotto — robot',strokes:3},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},
  {j:'ワ',r:'wa',ex:'ワイン',exR:'wain — anggur',strokes:2},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'ヲ',r:'wo',ex:'(partikel)',exR:'partikel objek',strokes:3},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'',r:''},{j:'ン',r:'n',ex:'パン',exR:'pan — roti',strokes:2},
,
  {j:'ガ',r:'ga',ex:'ガス',exR:'gasu — gas',strokes:4},{j:'ギ',r:'gi',ex:'ギター',exR:'gitaa — gitar',strokes:4},
  {j:'グ',r:'gu',ex:'グラス',exR:'gurasu — gelas',strokes:3},{j:'ゲ',r:'ge',ex:'ゲーム',exR:'geemu — game',strokes:4},
  {j:'ゴ',r:'go',ex:'ゴール',exR:'gooru — gol',strokes:3},
  {j:'ザ',r:'za',ex:'ザーっと',exR:'zaatto — deras',strokes:4},{j:'ジ',r:'ji',ex:'ジュース',exR:'juusu — jus',strokes:3},
  {j:'ズ',r:'zu',ex:'ズボン',exR:'zubon — celana',strokes:4},{j:'ゼ',r:'ze',ex:'ゼロ',exR:'zero — nol',strokes:4},
  {j:'ゾ',r:'zo',ex:'ゾーン',exR:'zoon — zona',strokes:3},
  {j:'ダ',r:'da',ex:'ダンス',exR:'dansu — tari',strokes:4},{j:'デ',r:'de',ex:'デスク',exR:'desuku — meja',strokes:4},
  {j:'ド',r:'do',ex:'ドア',exR:'doa — pintu',strokes:3},
  {j:'バ',r:'ba',ex:'バス',exR:'basu — bus',strokes:4},{j:'ビ',r:'bi',ex:'ビール',exR:'biiru — bir',strokes:4},
  {j:'ブ',r:'bu',ex:'ブック',exR:'bukku — buku',strokes:4},{j:'ベ',r:'be',ex:'ベッド',exR:'beddo — kasur',strokes:3},
  {j:'ボ',r:'bo',ex:'ボール',exR:'booru — bola',strokes:4},
  {j:'パ',r:'pa',ex:'パン',exR:'pan — roti',strokes:4},{j:'ピ',r:'pi',ex:'ピアノ',exR:'piano — piano',strokes:4},
  {j:'プ',r:'pu',ex:'プール',exR:'puuru — kolam renang',strokes:4},{j:'ペ',r:'pe',ex:'ペン',exR:'pen — pena',strokes:3},
  {j:'ポ',r:'po',ex:'ポスト',exR:'posuto — kotak surat',strokes:5}];

let activeKanaType = 'hiragana';

function buildGrid(data, type) {
  const grid = document.getElementById('kana-grid');
  grid.innerHTML = '';
  data.forEach(k => {
    const cell = document.createElement('div');
    cell.className = k.j ? 'kana-cell' : 'kana-cell empty';
    if (k.j) {
      cell.innerHTML = `<span class="jp">${k.j}</span><span class="rm">${k.r}</span>`;
      cell.addEventListener('click', () => openCharModal(k, type));
    }
    grid.appendChild(cell);
  });
}

buildGrid(hiraganaData, 'hiragana');

document.querySelectorAll('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeKanaType = tab.dataset.tab;
    buildGrid(activeKanaType === 'hiragana' ? hiraganaData : katakanaData, activeKanaType);
  });
});

// ── CHARACTER MODAL ──
const charModal = document.getElementById('charModal');
function openCharModal(k, type) {
  document.getElementById('modalKana').textContent = k.j;
  document.getElementById('modalRomaji').textContent = k.r.toUpperCase();
  document.getElementById('modalInfo').textContent = `${type === 'hiragana' ? 'Hiragana' : 'Katakana'} · Bacaan: ${k.r} · ${k.strokes || '–'} goresan`;
  document.getElementById('modalWord').textContent = k.ex || k.j;
  document.getElementById('modalWordRomaji').textContent = k.exR || '';
  charModal.classList.add('open');
}
document.getElementById('charModalClose').addEventListener('click', () => charModal.classList.remove('open'));
charModal.addEventListener('click', e => { if (e.target === charModal) charModal.classList.remove('open'); });

// ── QUIZ ──
const quizData = hiraganaData.filter(k => k.j && k.r);
let qIndex = 0, qScore = 0, qAnswered = false;
const quizQuestions = [];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function generateQuestions() {
  const pool = shuffle(quizData).slice(0, 10);
  return pool.map(q => {
    const wrong = shuffle(quizData.filter(k => k.r !== q.r)).slice(0, 3).map(k => k.r);
    return { kana: q.j, answer: q.r, options: shuffle([q.r, ...wrong]) };
  });
}

let questions = generateQuestions();

function renderQuiz() {
  if (qIndex >= questions.length) { showResult(); return; }
  const q = questions[qIndex];
  document.getElementById('quiz-kana').textContent = q.kana;
  document.getElementById('quiz-prog-txt').textContent = `Soal ${qIndex+1} / ${questions.length}`;
  document.getElementById('quiz-score-pill').textContent = `Skor: ${qScore}`;
  document.getElementById('quiz-track-fill').style.width = `${((qIndex)/questions.length)*100}%`;
  document.getElementById('quiz-feedback').textContent = '';
  document.getElementById('quiz-feedback').className = 'quiz-feedback';
  document.getElementById('quiz-next').classList.remove('visible');
  qAnswered = false;
  const opts = document.getElementById('quiz-options');
  opts.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(btn, opt, q.answer));
    opts.appendChild(btn);
  });
}

function handleAnswer(btn, chosen, correct) {
  if (qAnswered) return;
  qAnswered = true;
  const fb = document.getElementById('quiz-feedback');
  const allBtns = document.querySelectorAll('.quiz-opt');
  allBtns.forEach(b => { b.disabled = true; });
  if (chosen === correct) {
    btn.classList.add('correct');
    fb.textContent = '✓ Benar! 正解！';
    fb.className = 'quiz-feedback correct';
    qScore++;
    document.getElementById('quiz-score-pill').textContent = `Skor: ${qScore}`;
  } else {
    btn.classList.add('wrong');
    allBtns.forEach(b => { if (b.textContent === correct) b.classList.add('correct'); });
    fb.textContent = `✗ Salah. Jawaban yang benar: "${correct}"`;
    fb.className = 'quiz-feedback wrong';
  }
  document.getElementById('quiz-next').classList.add('visible');
}

// GENUINELY DITAMBAHKAN (Fase Audit Website, Prioritas 1): panggilan
// render AWAL yang genuinely HILANG. Dikonfirmasi via investigasi
// interaktif mendalam bahwa KEDUA panggilan `renderQuiz()` di bawah
// genuinely HANYA terpicu dari event listener ("quiz-next"/"btn-retry"),
// namun genuinely TIDAK ADA cara memicu interaksi tersebut karena
// `#quiz-options` genuinely selalu kosong saat load dan tombol "Soal
// Berikutnya" genuinely baru muncul setelah menjawab -- dead-end
// sempurna, kuis genuinely tidak bisa dipakai sama sekali.
renderQuiz();

document.getElementById('quiz-next').addEventListener('click', () => {
  qIndex++;
  renderQuiz();
});

document.getElementById('btn-retry').addEventListener('click', () => {
  qIndex = 0; qScore = 0; qAnswered = false;
  questions = generateQuestions();
  document.getElementById('quiz-result').classList.remove('show');
  document.getElementById('quiz-body').style.display = '';
  renderQuiz();
});

function showResult() {
  document.getElementById('quiz-body').style.display = 'none';
  const r = document.getElementById('quiz-result');
  r.classList.add('show');
  document.getElementById('result-score').textContent = `${qScore}/${questions.length}`;
  const pct = qScore / questions.length;
  let msg, sub;
  if (pct === 1) { msg = '完璧！ Sempurna!'; sub = 'Anda menjawab semua soal dengan benar!'; }
  else if (pct >= 0.8) { msg = '素晴らしい！ Bagus sekali!'; sub = `Anda menjawab ${qScore} dari ${questions.length} soal dengan benar.`; }
  else if (pct >= 0.6) { msg = 'よくできました！ Cukup baik!'; sub = `Terus berlatih, Anda semakin dekat!`; }
  else { msg = 'がんばれ！ Terus semangat!'; sub = 'Coba lagi untuk meningkatkan skor Anda!'; }
  document.getElementById('result-msg').textContent = msg;
  document.getElementById('result-sub').textContent = sub;
}


// ── KANJI N5 QUIZ ──
const kanjiN5 = [
  { k:'一', on:'イチ・イツ', kun:'ひと', meaning:'satu', ex:'一日 (ichinichi) — satu hari', stroke:1 },
  { k:'二', on:'ニ', kun:'ふた', meaning:'dua', ex:'二月 (nigatsu) — Februari', stroke:2 },
  { k:'三', on:'サン', kun:'み', meaning:'tiga', ex:'三時 (sanji) — jam tiga', stroke:3 },
  { k:'四', on:'シ', kun:'よ・よん', meaning:'empat', ex:'四月 (shigatsu) — April', stroke:5 },
  { k:'五', on:'ゴ', kun:'いつ', meaning:'lima', ex:'五円 (goen) — 5 yen', stroke:4 },
  { k:'六', on:'ロク', kun:'む', meaning:'enam', ex:'六月 (rokugatsu) — Juni', stroke:4 },
  { k:'七', on:'シチ', kun:'なな', meaning:'tujuh', ex:'七時 (shichiji) — jam tujuh', stroke:2 },
  { k:'八', on:'ハチ', kun:'や', meaning:'delapan', ex:'八月 (hachigatsu) — Agustus', stroke:2 },
  { k:'九', on:'キュウ・ク', kun:'ここの', meaning:'sembilan', ex:'九月 (kugatsu) — September', stroke:2 },
  { k:'十', on:'ジュウ', kun:'とお', meaning:'sepuluh', ex:'十年 (juunen) — 10 tahun', stroke:2 },
  { k:'百', on:'ヒャク', kun:'—', meaning:'ratus', ex:'百円 (hyakuen) — 100 yen', stroke:6 },
  { k:'千', on:'セン', kun:'ち', meaning:'ribu', ex:'千円 (senen) — 1000 yen', stroke:3 },
  { k:'万', on:'マン', kun:'よろず', meaning:'sepuluh ribu', ex:'一万円 (ichiman-en)', stroke:3 },
  { k:'円', on:'エン', kun:'まる', meaning:'lingkaran / yen', ex:'円 (en) — yen', stroke:4 },
  { k:'年', on:'ネン', kun:'とし', meaning:'tahun', ex:'今年 (kotoshi) — tahun ini', stroke:6 },
  { k:'月', on:'ゲツ・ガツ', kun:'つき', meaning:'bulan / bulan (benda)', ex:'月曜日 (getsuyoubi) — Senin', stroke:4 },
  { k:'日', on:'ニチ・ジツ', kun:'ひ・か', meaning:'hari / matahari', ex:'日本 (nihon) — Jepang', stroke:4 },
  { k:'時', on:'ジ', kun:'とき', meaning:'waktu / jam', ex:'何時 (nanji) — jam berapa', stroke:10 },
  { k:'分', on:'フン・ブン', kun:'わ', meaning:'menit / bagian', ex:'五分 (gofun) — 5 menit', stroke:4 },
  { k:'半', on:'ハン', kun:'なか', meaning:'setengah', ex:'三時半 (sanji han) — jam 3 setengah', stroke:5 },
  { k:'今', on:'コン・キン', kun:'いま', meaning:'sekarang', ex:'今日 (kyou) — hari ini', stroke:4 },
  { k:'何', on:'カ', kun:'なに・なん', meaning:'apa / berapa', ex:'何時 (nanji) — jam berapa', stroke:7 },
  { k:'人', on:'ジン・ニン', kun:'ひと', meaning:'orang', ex:'日本人 (nihonjin) — orang Jepang', stroke:2 },
  { k:'男', on:'ダン・ナン', kun:'おとこ', meaning:'laki-laki', ex:'男の子 (otokonoko) — anak laki', stroke:7 },
  { k:'女', on:'ジョ・ニョ', kun:'おんな', meaning:'perempuan', ex:'女の子 (onnanoko) — anak perempuan', stroke:3 },
  { k:'子', on:'シ・ス', kun:'こ', meaning:'anak', ex:'子供 (kodomo) — anak-anak', stroke:3 },
  { k:'父', on:'フ', kun:'ちち', meaning:'ayah', ex:'お父さん (otousan) — ayah', stroke:4 },
  { k:'母', on:'ボ', kun:'はは', meaning:'ibu', ex:'お母さん (okaasan) — ibu', stroke:5 },
  { k:'友', on:'ユウ', kun:'とも', meaning:'teman', ex:'友達 (tomodachi) — teman', stroke:4 },
  { k:'私', on:'シ', kun:'わたし', meaning:'saya', ex:'私 (watashi) — saya', stroke:7 },
  { k:'山', on:'サン', kun:'やま', meaning:'gunung', ex:'富士山 (fujisan) — Gunung Fuji', stroke:3 },
  { k:'川', on:'セン', kun:'かわ', meaning:'sungai', ex:'川 (kawa) — sungai', stroke:3 },
  { k:'海', on:'カイ', kun:'うみ', meaning:'laut', ex:'海 (umi) — laut', stroke:9 },
  { k:'空', on:'クウ', kun:'そら・から', meaning:'langit / kosong', ex:'空 (sora) — langit', stroke:8 },
  { k:'木', on:'モク・ボク', kun:'き', meaning:'pohon / kayu', ex:'木曜日 (mokuyoubi) — Kamis', stroke:4 },
  { k:'花', on:'カ', kun:'はな', meaning:'bunga', ex:'花 (hana) — bunga', stroke:7 },
  { k:'犬', on:'ケン', kun:'いぬ', meaning:'anjing', ex:'犬 (inu) — anjing', stroke:4 },
  { k:'猫', on:'ビョウ', kun:'ねこ', meaning:'kucing', ex:'猫 (neko) — kucing', stroke:11 },
  { k:'魚', on:'ギョ', kun:'さかな', meaning:'ikan', ex:'魚 (sakana) — ikan', stroke:11 },
  { k:'食', on:'ショク', kun:'た・く', meaning:'makan', ex:'食べる (taberu) — makan', stroke:9 },
  { k:'飲', on:'イン', kun:'の', meaning:'minum', ex:'飲む (nomu) — minum', stroke:12 },
  { k:'水', on:'スイ', kun:'みず', meaning:'air', ex:'水曜日 (suiyoubi) — Rabu', stroke:4 },
  { k:'火', on:'カ', kun:'ひ', meaning:'api', ex:'火曜日 (kayoubi) — Selasa', stroke:4 },
  { k:'土', on:'ド・ト', kun:'つち', meaning:'tanah', ex:'土曜日 (doyoubi) — Sabtu', stroke:3 },
  { k:'金', on:'キン・コン', kun:'かね・かな', meaning:'emas / uang', ex:'お金 (okane) — uang', stroke:8 },
  { k:'学', on:'ガク', kun:'まな', meaning:'belajar', ex:'学校 (gakkou) — sekolah', stroke:8 },
  { k:'校', on:'コウ', kun:'—', meaning:'sekolah', ex:'高校 (koukou) — SMA', stroke:10 },
  { k:'先', on:'セン', kun:'さき', meaning:'dahulu / depan', ex:'先生 (sensei) — guru', stroke:6 },
  { k:'生', on:'セイ・ショウ', kun:'い・う・は', meaning:'hidup / lahir', ex:'学生 (gakusei) — mahasiswa', stroke:5 },
  { k:'語', on:'ゴ', kun:'かた', meaning:'bahasa / kata', ex:'日本語 (nihongo) — bahasa Jepang', stroke:14 },
  { k:'本', on:'ホン', kun:'もと', meaning:'buku / asal', ex:'日本 (nihon) — Jepang', stroke:5 },
  { k:'国', on:'コク', kun:'くに', meaning:'negara', ex:'外国 (gaikoku) — negara asing', stroke:8 },
  { k:'外', on:'ガイ・ゲ', kun:'そと・はず', meaning:'luar', ex:'外国語 (gaikokugo) — bahasa asing', stroke:5 },
  { k:'中', on:'チュウ', kun:'なか', meaning:'tengah / dalam', ex:'中国 (chuugoku) — China', stroke:4 },
  { k:'大', on:'ダイ・タイ', kun:'おお', meaning:'besar', ex:'大学 (daigaku) — universitas', stroke:3 },
  { k:'小', on:'ショウ', kun:'ちい・こ・お', meaning:'kecil', ex:'小学校 (shougakkou) — SD', stroke:3 },
  { k:'高', on:'コウ', kun:'たか', meaning:'tinggi / mahal', ex:'高い (takai) — mahal/tinggi', stroke:10 },
  { k:'安', on:'アン', kun:'やす', meaning:'murah / aman', ex:'安い (yasui) — murah', stroke:6 },
  { k:'新', on:'シン', kun:'あたら・にい', meaning:'baru', ex:'新聞 (shinbun) — koran', stroke:13 },
  { k:'古', on:'コ', kun:'ふる', meaning:'tua / kuno', ex:'古い (furui) — tua', stroke:5 },
  { k:'右', on:'ウ・ユウ', kun:'みぎ', meaning:'kanan', ex:'右 (migi) — kanan', stroke:5 },
  { k:'左', on:'サ', kun:'ひだり', meaning:'kiri', ex:'左 (hidari) — kiri', stroke:5 },
  { k:'上', on:'ジョウ・ショウ', kun:'うえ・あが', meaning:'atas / naik', ex:'上 (ue) — atas', stroke:3 },
  { k:'下', on:'カ・ゲ', kun:'した・さが', meaning:'bawah / turun', ex:'下 (shita) — bawah', stroke:3 },
  { k:'前', on:'ゼン', kun:'まえ', meaning:'depan / sebelum', ex:'前 (mae) — depan', stroke:9 },
  { k:'後', on:'ゴ・コウ', kun:'あと・うし', meaning:'belakang / setelah', ex:'後 (ato) — setelah', stroke:9 },
  { k:'東', on:'トウ', kun:'ひがし', meaning:'timur', ex:'東京 (toukyou) — Tokyo', stroke:8 },
  { k:'西', on:'セイ・サイ', kun:'にし', meaning:'barat', ex:'西 (nishi) — barat', stroke:6 },
  { k:'南', on:'ナン', kun:'みなみ', meaning:'selatan', ex:'南 (minami) — selatan', stroke:9 },
  { k:'北', on:'ホク', kun:'きた', meaning:'utara', ex:'北 (kita) — utara', stroke:5 },
  { k:'車', on:'シャ', kun:'くるま', meaning:'mobil / kendaraan', ex:'電車 (densha) — kereta', stroke:7 },
  { k:'電', on:'デン', kun:'—', meaning:'listrik', ex:'電話 (denwa) — telepon', stroke:13 },
  { k:'話', on:'ワ', kun:'はな', meaning:'bicara / cerita', ex:'電話 (denwa) — telepon', stroke:13 },
  { k:'聞', on:'ブン・モン', kun:'き・きこ', meaning:'mendengar / menanya', ex:'聞く (kiku) — mendengar', stroke:14 },
  { k:'見', on:'ケン', kun:'み', meaning:'melihat', ex:'見る (miru) — melihat', stroke:7 },
  { k:'書', on:'ショ', kun:'か', meaning:'menulis', ex:'書く (kaku) — menulis', stroke:10 },
  { k:'読', on:'ドク・トク', kun:'よ', meaning:'membaca', ex:'読む (yomu) — membaca', stroke:14 },
  { k:'来', on:'ライ', kun:'く', meaning:'datang', ex:'来る (kuru) — datang', stroke:7 },
  { k:'行', on:'コウ・ギョウ', kun:'い・おこな', meaning:'pergi', ex:'行く (iku) — pergi', stroke:6 },
  { k:'出', on:'シュツ', kun:'で・だ', meaning:'keluar', ex:'出る (deru) — keluar', stroke:5 },
  { k:'入', on:'ニュウ', kun:'い・はい', meaning:'masuk', ex:'入る (hairu) — masuk', stroke:2 },
];

let kqMode = 'meaning';
let kqIndex = 0;
let kqScore = 0;
let kqWrong = 0;
let kqStreak = 0;
let kqAnswered = false;
let kqQuestions = [];
let kqHistory = [];

function kqShuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function kqGenerate() {
  const pool = kqShuffle(kanjiN5).slice(0, 10);
  return pool.map(q => {
    let questionText, answer, distractors, optionType;
    const useMeaning = kqMode === 'meaning' || (kqMode === 'mixed' && Math.random() > 0.5);
    if (useMeaning) {
      questionText = 'Apa arti kanji ini?';
      answer = q.meaning;
      distractors = kqShuffle(kanjiN5.filter(k => k.meaning !== q.meaning)).slice(0, 3).map(k => k.meaning);
      optionType = 'meaning';
    } else {
      questionText = 'Apa bacaan On-yomi kanji ini?';
      answer = q.on.split('・')[0];
      distractors = kqShuffle(kanjiN5.filter(k => k.on !== q.on)).slice(0, 3).map(k => k.on.split('・')[0]);
      optionType = 'reading';
    }
    return {
      kanji: q,
      questionText,
      answer,
      options: kqShuffle([answer, ...distractors]),
      optionType
    };
  });
}

function kqUpdateStats() {
  document.getElementById('kq-correct-count').textContent = kqScore;
  document.getElementById('kq-wrong-count').textContent = kqWrong;
  document.getElementById('kq-streak').textContent = kqStreak + (kqStreak >= 3 ? '🔥' : '');
}

function kqRender() {
  if (kqIndex >= kqQuestions.length) { kqShowResult(); return; }
  const q = kqQuestions[kqIndex];
  const k = q.kanji;
  document.getElementById('kq-kanji-char').textContent = k.k;
  document.getElementById('kq-kanji-char').style.animation = 'none';
  void document.getElementById('kq-kanji-char').offsetWidth;
  document.getElementById('kq-kanji-char').style.animation = '';
  document.getElementById('kq-box').dataset.kanji = k.k;
  document.getElementById('kq-question-num').textContent = `Soal ${kqIndex + 1} dari ${kqQuestions.length}`;
  document.getElementById('kq-question-text').textContent = q.questionText;
  document.getElementById('kq-type-badge').textContent = q.optionType === 'meaning' ? '📖 Arti' : '🔤 Bacaan';
  document.getElementById('kq-hint').textContent = `💡 JLPT N5 · ${k.stroke} goresan`;
  document.getElementById('kq-progress-fill').style.width = `${(kqIndex / kqQuestions.length) * 100}%`;
  document.getElementById('kq-feedback').textContent = '';
  document.getElementById('kq-feedback').className = 'kq-feedback';
  document.getElementById('kq-explain').className = 'kq-explain';
  document.getElementById('kq-next').className = 'kq-next';
  kqAnswered = false;

  const opts = document.getElementById('kq-options');
  opts.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'kq-opt';
    btn.textContent = opt;
    btn.addEventListener('click', () => kqHandleAnswer(btn, opt, q));
    opts.appendChild(btn);
  });
  kqUpdateStats();
}

function kqHandleAnswer(btn, chosen, q) {
  if (kqAnswered) return;
  kqAnswered = true;
  const allBtns = document.querySelectorAll('.kq-opt');
  allBtns.forEach(b => b.disabled = true);
  const fb = document.getElementById('kq-feedback');
  const isCorrect = chosen === q.answer;

  if (isCorrect) {
    btn.classList.add('correct');
    fb.textContent = '✓ 正解！ Benar!';
    fb.className = 'kq-feedback correct';
    kqScore++;
    kqStreak++;
  } else {
    btn.classList.add('wrong');
    allBtns.forEach(b => { if (b.textContent === q.answer) b.classList.add('correct'); });
    fb.textContent = `✗ Salah. Jawaban: "${q.answer}"`;
    fb.className = 'kq-feedback wrong';
    kqWrong++;
    kqStreak = 0;
  }

  kqHistory.push({ kanji: q.kanji, correct: isCorrect });

  // Show explanation
  const k = q.kanji;
  const explainBox = document.getElementById('kq-explain');
  document.getElementById('kq-explain-row').innerHTML = `
    <div class="kq-explain-item"><span class="kq-explain-key">Kanji</span><span class="kq-explain-val jp">${k.k}</span></div>
    <div class="kq-explain-item"><span class="kq-explain-key">Arti</span><span class="kq-explain-val">${k.meaning}</span></div>
    <div class="kq-explain-item"><span class="kq-explain-key">On-yomi</span><span class="kq-explain-val">${k.on}</span></div>
    <div class="kq-explain-item"><span class="kq-explain-key">Kun-yomi</span><span class="kq-explain-val">${k.kun}</span></div>
    <div class="kq-explain-item" style="flex:1 1 100%"><span class="kq-explain-key">Contoh</span><span class="kq-explain-val" style="font-size:13px;font-family:'Outfit',sans-serif;font-weight:400;">${k.ex}</span></div>
  `;
  explainBox.className = 'kq-explain show';
  document.getElementById('kq-next').className = 'kq-next visible';
  kqUpdateStats();
}

function kqShowResult() {
  document.getElementById('kq-progress-fill').style.width = '100%';
  document.getElementById('kq-body').style.display = 'none';
  const result = document.getElementById('kq-result');
  result.className = 'kq-result show';

  const pct = kqScore / kqQuestions.length;
  let gradeText, gradeClass, emoji;
  if (pct === 1)      { gradeText = 'S RANK — 完璧！'; gradeClass = 's'; emoji = '合'; }
  else if (pct >= 0.8) { gradeText = 'A RANK — 素晴らしい！'; gradeClass = 'a'; emoji = '良'; }
  else if (pct >= 0.6) { gradeText = 'B RANK — よくできました！'; gradeClass = 'b'; emoji = '可'; }
  else                 { gradeText = 'C RANK — がんばれ！'; gradeClass = 'c'; emoji = '再'; }

  document.getElementById('kq-result-kanji').textContent = emoji;
  document.getElementById('kq-result-grade').textContent = gradeText;
  document.getElementById('kq-result-grade').className = `kq-result-grade ${gradeClass}`;
  document.getElementById('kq-result-score').textContent = `${kqScore} / ${kqQuestions.length} Benar`;
  const msgs = { s:'Luar biasa! Semua kanji N5 dikuasai!', a:'Hampir sempurna! Terus pertahankan!', b:'Cukup baik! Ulangi yang salah ya.', c:'Jangan menyerah! Latihan membuat mahir.' };
  document.getElementById('kq-result-sub').textContent = msgs[gradeClass];

  // Review grid
  const grid = document.getElementById('kq-review-grid');
  grid.innerHTML = '';
  kqHistory.forEach(h => {
    const item = document.createElement('div');
    item.className = `kq-review-item ${h.correct ? 'correct' : 'wrong'}`;
    item.innerHTML = `
      <span class="kq-review-status">${h.correct ? '✓' : '✗'}</span>
      <span class="kq-review-kanji">${h.kanji.k}</span>
      <span class="kq-review-reading">${h.kanji.on.split('・')[0]}</span>
      <span class="kq-review-meaning">${h.kanji.meaning}</span>
    `;
    grid.appendChild(item);
  });
}

function kqReset() {
  kqIndex = 0; kqScore = 0; kqWrong = 0; kqStreak = 0; kqAnswered = false; kqHistory = [];
  kqQuestions = kqGenerate();
  document.getElementById('kq-body').style.display = '';
  document.getElementById('kq-result').className = 'kq-result';
  kqRender();
}

// Mode tabs
document.querySelectorAll('.kq-mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.kq-mode-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    kqMode = tab.dataset.mode;
    kqReset();
  });
});

document.getElementById('kq-next').addEventListener('click', () => { kqIndex++; kqRender(); });
document.getElementById('kq-btn-retry').addEventListener('click', kqReset);
document.getElementById('kq-btn-change').addEventListener('click', () => {
  document.getElementById('kq-result').className = 'kq-result';
  document.getElementById('kq-body').style.display = '';
  window.scrollTo({ top: document.getElementById('kuis-kanji').offsetTop - 80, behavior: 'smooth' });
});

// Build mini kanji chart (cuplikan 20 dari 80 -- lengkapnya di halaman Kanji-N5,
// supaya homepage tidak menanam referensi 80-kanji penuh yang bikin halaman sangat panjang)
const kqGrid = document.getElementById('kq-kanji-grid');
kanjiN5.slice(0, 20).forEach(k => {
  const cell = document.createElement('div');
  cell.className = 'kq-kanji-cell';
  cell.innerHTML = `<span class="kqk-char">${k.k}</span><span class="kqk-read">${k.on.split('・')[0]}</span><span class="kqk-mean">${k.meaning}</span>`;
  cell.title = `${k.k} — ${k.meaning} (${k.on})`;
  kqGrid.appendChild(cell);
});

// Initialize
kqQuestions = kqGenerate();
kqRender();


document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// ── COUNTDOWN ──
function getNextLiveClassDate() {
  const now = new Date();
  const target = new Date(now);
  const targetDay = 6;
  const daysUntilSaturday = (targetDay - now.getDay() + 7) % 7;
  target.setDate(now.getDate() + daysUntilSaturday);
  target.setHours(19, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 7);
  return target;
}
const targetDate = getNextLiveClassDate();
const liveSubtitle = document.getElementById('liveSubtitle');
if (liveSubtitle) {
  const liveDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(targetDate);
  liveSubtitle.textContent = `Bersama Kak Riyan · via Zoom · ${liveDate} · 19:00 WIB`;
}
function updateCountdown() {
  const now = new Date();
  const diff = targetDate - now;
  if (diff <= 0) {
    document.getElementById('cd-d').textContent = '00';
    document.getElementById('cd-h').textContent = '00';
    document.getElementById('cd-m').textContent = '00';
    document.getElementById('cd-s').textContent = '00';
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cd-d').textContent = String(d).padStart(2,'0');
  document.getElementById('cd-h').textContent = String(h).padStart(2,'0');
  document.getElementById('cd-m').textContent = String(m).padStart(2,'0');
  document.getElementById('cd-s').textContent = String(s).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown, 1000);

// ── SCROLL REVEAL — No-hide approach, semua elemen selalu visible ──
(function () {
  const revEls = document.querySelectorAll('.reveal');
  // Langsung tambah .visible — CSS sudah set opacity:1 di semua kondisi
  revEls.forEach(el => el.classList.add('visible'));
  // Optional IntersectionObserver untuk konsistensi
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 80px 0px' });
    revEls.forEach(el => obs.observe(el));
  }
})();

// ── PROGRESS BAR ANIMATION ──
const progCards = document.querySelectorAll('.progress-card');
const progObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('animated'), 200);
      progObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });
progCards.forEach(c => progObserver.observe(c));

// ── STICKY BAR ──
const stickyBar = document.getElementById('stickyBar');
const stickyClose = document.getElementById('stickyClose');
let stickyDismissed = localStorage.getItem('np-sticky-bar-dismissed') === '1';
window.addEventListener('scroll', () => {
  if (stickyDismissed) return;
  if (window.scrollY > 600) stickyBar.classList.add('show');
  else stickyBar.classList.remove('show');
});
stickyClose.addEventListener('click', () => {
  stickyDismissed = true;
  stickyBar.classList.remove('show');
  try { localStorage.setItem('np-sticky-bar-dismissed', '1'); } catch (e) {}
});
// ── AUTH SYSTEM ──
let currentUser = null;
let firebaseAuthReady = null;

async function getFirebaseAuth() {
  if (!window.NIHONGO_FIREBASE_CONFIG) return null;
  if (!firebaseAuthReady) {
    firebaseAuthReady = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js')
    ]).then(([appMod, authMod]) => {
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(window.NIHONGO_FIREBASE_CONFIG);
      return { auth: authMod.getAuth(app), ...authMod };
    }).catch((error) => {
      console.warn('Firebase Auth belum aktif:', error);
      return null;
    });
  }
  return firebaseAuthReady;
}

// Simple in-memory user store (keyed by email)
const users = JSON.parse(localStorage.getItem('nihongo_users') || '{}');

function saveUsers() {
  localStorage.setItem('nihongo_users', JSON.stringify(users));
}

async function saveSession(user) {
  const secureAuth = await getFirebaseAuth();
  if (secureAuth?.auth?.currentUser) {
    user.idToken = await secureAuth.auth.currentUser.getIdToken();
    user.uid = secureAuth.auth.currentUser.uid;
    user.authProvider = 'firebase';
  } else {
    user.authProvider = 'local-demo';
  }
  localStorage.setItem('nihongo_session', JSON.stringify(user));
}

function loadSession() {
  const s = localStorage.getItem('nihongo_session');
  return s ? JSON.parse(s) : null;
}

function clearSession() {
  localStorage.removeItem('nihongo_session');
}

// Open/close auth modal
function openAuth(tab = 'login') {
  document.getElementById('authOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchTab(tab);
  // Reset success screen
  document.getElementById('authSuccess').className = 'auth-success';
  document.getElementById('panelLogin').className = 'auth-form-panel' + (tab === 'login' ? ' active' : '');
  document.getElementById('panelRegister').className = 'auth-form-panel' + (tab === 'register' ? ' active' : '');
}

function closeAuth() {
  document.getElementById('authOverlay').classList.remove('open');
  document.body.style.overflow = '';
  clearErrors();
}

function switchTab(tab) {
  document.getElementById('tabLogin').className = 'auth-tab' + (tab === 'login' ? ' active' : '');
  document.getElementById('tabRegister').className = 'auth-tab' + (tab === 'register' ? ' active' : '');
  document.getElementById('panelLogin').className = 'auth-form-panel' + (tab === 'login' ? ' active' : '');
  document.getElementById('panelRegister').className = 'auth-form-panel' + (tab === 'register' ? ' active' : '');
  document.getElementById('authSuccess').className = 'auth-success';
  if (tab === 'login') {
    document.getElementById('authBannerTitle').textContent = 'Selamat datang kembali';
    document.getElementById('authBannerSub').textContent = 'Masuk untuk melanjutkan belajar';
  } else {
    document.getElementById('authBannerTitle').textContent = 'Bergabung sekarang';
    document.getElementById('authBannerSub').textContent = 'Buat akun gratis dan mulai belajar';
  }
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.auth-error').forEach(e => { e.className = 'auth-error'; e.textContent = ''; });
  document.querySelectorAll('.auth-input').forEach(i => i.classList.remove('error'));
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'auth-error show';
}

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  // aria-label diperbarui dinamis -- lihat catatan identik di inline script
  // index.html (fungsi ini genuinely MENIMPA versi inline karena timing
  // defer script, konsisten dengan pola bug yang sudah ditemukan sebelumnya
  // di proyek ini untuk openAuth/handleLogin/dsb).
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; btn.setAttribute('aria-label', 'Sembunyikan kata sandi'); }
  else { inp.type = 'password'; btn.textContent = '👁️'; btn.setAttribute('aria-label', 'Tampilkan kata sandi'); }
}

// Simple client-side hash untuk local-demo mode (bukan pengganti server-side hashing)
// Perlindungan password: SEBELUMNYA memakai salt STATIS hardcoded
// ('nihongo-salt-2025') yang genuinely sama untuk seluruh pengguna --
// itu berarti satu rainbow table yang dibuat sekali bisa dipakai untuk
// menyerang SEMUA akun sekaligus. Diganti dengan salt ACAK PER-PENGGUNA,
// disimpan bersama hash (praktik standar -- salt tidak perlu dirahasiakan,
// hanya perlu unik per-pengguna supaya rainbow table generik tidak berlaku).
async function hashPw(pw, salt) {
  const msgBuffer = new TextEncoder().encode(pw + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function genSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleLogin() {
  clearErrors();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email) { document.getElementById('loginEmail').classList.add('error'); showError('loginError', 'Email tidak boleh kosong.'); return; }
  if (!password) { document.getElementById('loginPassword').classList.add('error'); showError('loginError', 'Kata sandi tidak boleh kosong.'); return; }

  const btn = document.getElementById('loginSubmit');
  btn.classList.add('loading');
  btn.textContent = 'Memproses...';

  // Prioritas tertinggi: SupabaseClient (backend production nyata), jika genuinely
  // terkonfigurasi (SUPABASE_URL tidak kosong). window.SupabaseClient SELALU ada
  // sebagai objek meski URL kosong, jadi mengecek keberadaan objeknya saja tidak
  // cukup — harus cek konfigurasinya agar tidak salah pilih backend yang pasti gagal.
  const hasSupabaseConfig = !!(window.EDUMA_ENV && window.EDUMA_ENV.SUPABASE_URL) && typeof window.SupabaseClient === 'object';
  if (hasSupabaseConfig) {
    try {
      const data = await window.SupabaseClient.Auth.signIn(email, password);
      const sbUser = data.user || {};
      await loginUser({
        name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Pengguna',
        email: sbUser.email,
        joined: sbUser.created_at,
        quizCount: 0, bestScore: null, streak: 0,
        authProvider: 'supabase',
      });
      btn.classList.remove('loading');
      btn.textContent = 'Masuk — ログイン';
      return;
    } catch (error) {
      btn.classList.remove('loading');
      btn.textContent = 'Masuk — ログイン';
      showError('loginError', error.message || 'Email atau kata sandi salah.');
      return;
    }
  }

  const secureAuth = await getFirebaseAuth();
  if (secureAuth) {
    try {
      const cred = await secureAuth.signInWithEmailAndPassword(secureAuth.auth, email, password);
      const fbUser = cred.user;
      await loginUser({ name: fbUser.displayName || fbUser.email.split('@')[0], email: fbUser.email, joined: fbUser.metadata?.creationTime, quizCount: 0, bestScore: null, streak: 0 });
      btn.classList.remove('loading');
      btn.textContent = 'Masuk — ログイン';
      return;
    } catch (error) {
      btn.classList.remove('loading');
      btn.textContent = 'Masuk — ログイン';
      showError('loginError', error.message || 'Login Firebase gagal.');
      return;
    }
  }

  (async () => {
    await new Promise(r => setTimeout(r, 800));
    btn.classList.remove('loading');
    btn.textContent = 'Masuk — ログイン';

    const stored = users[email.toLowerCase()];
    if (!stored) { showError('loginError', 'Email tidak terdaftar. Silakan daftar terlebih dahulu.'); return; }
    let verified = false;
    if (stored.passwordSalt) {
      // Akun genuinely sudah pakai skema salt-per-pengguna.
      const hashed = await hashPw(password, stored.passwordSalt);
      verified = stored.password === hashed;
    } else {
      // Migrasi transparan: akun lama masih pakai salt statis dari sebelum
      // perbaikan ini. Verifikasi dengan skema lama SEKALI, lalu upgrade
      // diam-diam ke salt acak per-pengguna.
      const legacyHashed = await hashPw(password, 'nihongo-salt-2025');
      if (stored.password === legacyHashed) {
        verified = true;
        const newSalt = genSalt();
        stored.password = await hashPw(password, newSalt);
        stored.passwordSalt = newSalt;
        saveUsers();
      }
    }
    if (!verified) { showError('loginError', 'Kata sandi salah. Coba lagi.'); document.getElementById('loginPassword').classList.add('error'); return; }

    loginUser(stored);
  })();
}

async function handleRegister() {
  clearErrors();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pw = document.getElementById('regPassword').value;
  const pw2 = document.getElementById('regPassword2').value;

  if (!name) { document.getElementById('regName').classList.add('error'); showError('registerError', 'Nama tidak boleh kosong.'); return; }
  if (!email || !email.includes('@')) { document.getElementById('regEmail').classList.add('error'); showError('registerError', 'Format email tidak valid.'); return; }
  if (pw.length < 6) { document.getElementById('regPassword').classList.add('error'); showError('registerError', 'Kata sandi minimal 6 karakter.'); return; }
  if (pw !== pw2) { document.getElementById('regPassword2').classList.add('error'); showError('registerError', 'Konfirmasi kata sandi tidak cocok.'); return; }
  if (users[email.toLowerCase()]) { document.getElementById('regEmail').classList.add('error'); showError('registerError', 'Email sudah terdaftar. Silakan masuk.'); return; }

  const btn = document.getElementById('registerSubmit');
  btn.classList.add('loading');
  btn.textContent = 'Membuat akun...';

  const hasSupabaseConfig = !!(window.EDUMA_ENV && window.EDUMA_ENV.SUPABASE_URL) && typeof window.SupabaseClient === 'object';
  if (hasSupabaseConfig) {
    try {
      const data = await window.SupabaseClient.Auth.signUp(email, pw, name);
      const sbUser = data.user || {};
      document.getElementById('panelRegister').className = 'auth-form-panel';
      document.getElementById('authSuccess').className = 'auth-success show';
      document.getElementById('successTitle').textContent = `ようこそ、${name.split(' ')[0]}さん！`;
      document.getElementById('successSub').textContent = 'Akun berhasil dibuat. Sesi memakai token Auth production.';
      btn.classList.remove('loading');
      btn.textContent = 'Buat Akun — アカウント作成';
      setTimeout(() => {
        loginUser({
          name,
          email: sbUser.email || email.toLowerCase(),
          joined: sbUser.created_at || new Date().toISOString(),
          quizCount: 0, bestScore: null, streak: 1,
          authProvider: 'supabase',
        });
      }, 1000);
      return;
    } catch (error) {
      btn.classList.remove('loading');
      btn.textContent = 'Buat Akun — アカウント作成';
      showError('registerError', error.message || 'Gagal membuat akun. Coba lagi.');
      return;
    }
  }

  const secureAuth = await getFirebaseAuth();
  if (secureAuth) {
    try {
      const cred = await secureAuth.createUserWithEmailAndPassword(secureAuth.auth, email, pw);
      await secureAuth.updateProfile(cred.user, { displayName: name });
      const user = { name, email: email.toLowerCase(), joined: new Date().toISOString(), quizCount: 0, bestScore: null, streak: 1 };
      document.getElementById('panelRegister').className = 'auth-form-panel';
      document.getElementById('authSuccess').className = 'auth-success show';
      document.getElementById('successTitle').textContent = `ようこそ、${name.split(' ')[0]}さん！`;
      document.getElementById('successSub').textContent = 'Akun Firebase berhasil dibuat. Sesi memakai token Auth production.';
      btn.classList.remove('loading');
      btn.textContent = 'Buat Akun — アカウント作成';
      setTimeout(() => { loginUser(user); }, 1000);
      return;
    } catch (error) {
      btn.classList.remove('loading');
      btn.textContent = 'Buat Akun — アカウント作成';
      showError('registerError', error.message || 'Register Firebase gagal.');
      return;
    }
  }

  (async () => {
    await new Promise(r => setTimeout(r, 900));
    btn.classList.remove('loading');
    btn.textContent = 'Buat Akun — アカウント作成';

    const salt = genSalt();
    const hashed = await hashPw(pw, salt);
    const user = { name, email: email.toLowerCase(), password: hashed, passwordSalt: salt, joined: new Date().toISOString(), quizCount: 0, bestScore: null, streak: 1 };
    users[email.toLowerCase()] = user;
    saveUsers();

    // Show success
    document.getElementById('panelRegister').className = 'auth-form-panel';
    document.getElementById('authSuccess').className = 'auth-success show';
    document.getElementById('successTitle').textContent = `ようこそ、${name.split(' ')[0]}さん！`;
    document.getElementById('successSub').textContent = 'Akun berhasil dibuat! Anda siap memulai perjalanan belajar bahasa Jepang.';

    setTimeout(() => { loginUser(user); }, 1800);
  })();
}

async function handleSocialLogin(provider) {
  // SEBELUMNYA genuinely langsung ke Firebase lalu fallback ke akun DEMO
  // PALSU (demo@nihongo.id) -- menimpa versi inline (window.handleSocialLogin)
  // yang redirect ke OAuth Supabase genuine. Ini berarti pengguna yang klik
  // "Login dengan Google" TIDAK PERNAH genuinely login dengan akun Google
  // mereka sendiri meski backend Supabase sudah dikonfigurasi dengan benar
  // -- selalu masuk sebagai akun demo yang sama. Ditambahkan prioritas
  // SupabaseClient di depan, konsisten dengan handleLogin/handleRegister.
  const hasSupabaseConfig = !!(window.EDUMA_ENV && window.EDUMA_ENV.SUPABASE_URL) && typeof window.SupabaseClient === 'object';
  if (hasSupabaseConfig) {
    const redirectTo = window.location.origin + '/Dashboard/Dashboard.html';
    window.location.href = window.EDUMA_ENV.SUPABASE_URL + '/auth/v1/authorize?provider=' +
      provider.toLowerCase() + '&redirect_to=' + encodeURIComponent(redirectTo);
    return;
  }
  const secureAuth = await getFirebaseAuth();
  if (secureAuth && provider === 'Google') {
    try {
      const result = await secureAuth.signInWithPopup(secureAuth.auth, new secureAuth.GoogleAuthProvider());
      const fbUser = result.user;
      document.getElementById('panelLogin').className = 'auth-form-panel';
      document.getElementById('panelRegister').className = 'auth-form-panel';
      document.getElementById('authSuccess').className = 'auth-success show';
      document.getElementById('successTitle').textContent = `ようこそ！ Masuk via ${provider}`;
      document.getElementById('successSub').textContent = 'Login Firebase berhasil. Sesi memakai token Auth production.';
      setTimeout(() => { loginUser({ name: fbUser.displayName || 'Pengguna', email: fbUser.email, joined: fbUser.metadata?.creationTime, quizCount: 0, bestScore: null, streak: 0 }); }, 800);
      return;
    } catch (error) {
      showError('loginError', error.message || 'Login Google gagal.');
      return;
    }
  }
  // Simulate social login with a demo account
  const demoUser = { name: 'Pengguna Demo', email: 'demo@nihongo.id', password: '', joined: new Date().toISOString(), quizCount: 3, bestScore: 8, streak: 2 };
  users['demo@nihongo.id'] = demoUser;
  saveUsers();
  document.getElementById('panelLogin').className = 'auth-form-panel';
  document.getElementById('panelRegister').className = 'auth-form-panel';
  document.getElementById('authSuccess').className = 'auth-success show';
  document.getElementById('successTitle').textContent = `ようこそ！ Masuk via ${provider}`;
  document.getElementById('successSub').textContent = `Berhasil masuk menggunakan akun ${provider} Anda.`;
  setTimeout(() => { loginUser(demoUser); }, 1600);
}

async function loginUser(user) {
  currentUser = user;
  await saveSession(user);
  closeAuth();
  updateNavUI();
  showProfileBar();
  if (user.authProvider === 'local-demo') {
    setTimeout(() => alert('Mode auth lokal hanya untuk demo. Untuk production, set window.NIHONGO_FIREBASE_CONFIG agar login memakai Firebase Auth + JWT.'), 120);
  }
}

function updateNavUI() {
  // Elemen ini milik navbar versi LAMA. Navbar sekarang di-inject oleh
  // kyoto-navbar.min.js dengan ID berbeda, jadi elemen di bawah tidak selalu ada.
  // Tanpa guard, fungsi ini melempar TypeError dan MENGHENTIKAN seluruh skrip
  // index — padahal dipanggil saat login, logout, dan saat memuat sesi tersimpan.
  const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };

  if (!currentUser) {
    set('navLoginBtn', el => { el.style.display = ''; });
    set('navCtaBtn',   el => { el.style.display = ''; });
    set('navUser',     el => { el.className = 'nav-user'; });
    // Sinkronkan juga navbar kyoto-navbar.min.js (sistem terpisah, ID prefix 'kn')
    // supaya status login yang genuinely tersimpan di nihongo_session tercermin
    // di navbar, bukan hanya di navbar lama yang sudah tidak dipakai.
    set('knLoginBtn', el => { el.style.display = ''; });
    set('knCtaBtn',   el => { el.style.display = ''; });
    set('knUser',     el => { el.style.display = 'none'; });
    return;
  }

  set('navLoginBtn', el => { el.style.display = 'none'; });
  set('navCtaBtn',   el => { el.style.display = 'none'; });
  set('navUser',     el => { el.className = 'nav-user visible'; });

  const name = currentUser.name || '';
  const initials = name.split(' ').map(w => w[0]).filter(Boolean)
                       .slice(0, 2).join('').toUpperCase();
  set('navAvatar',     el => { el.textContent = initials; });
  set('navUserName',   el => { el.textContent = name.split(' ')[0] || ''; });
  set('dropdownName',  el => { el.textContent = name; });
  set('dropdownEmail', el => { el.textContent = currentUser.email || ''; });

  // Sinkronkan navbar kyoto-navbar.min.js
  set('knLoginBtn', el => { el.style.display = 'none'; });
  set('knCtaBtn',   el => { el.style.display = 'none'; });
  set('knUser',     el => { el.style.display = 'flex'; });
  set('knAvatar',     el => { el.textContent = initials; });
  set('knUserName',   el => { el.textContent = name.split(' ')[0] || ''; });
  set('knDropName',   el => { el.textContent = name; });
  set('knDropEmail',  el => { el.textContent = currentUser.email || ''; });
}

function showProfileBar() {
  if (!currentUser) { document.getElementById('profileBar').className = 'profile-bar'; return; }
  document.getElementById('profileBar').className = 'profile-bar visible';
  const initials = currentUser.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  document.getElementById('profileBarAvatar').textContent = initials;
  document.getElementById('profileBarName').textContent = currentUser.name;
  document.getElementById('statKuisCount').textContent = currentUser.quizCount || 0;
  document.getElementById('statBestScore').textContent = currentUser.bestScore !== null ? `${currentUser.bestScore}/10` : '—';
  document.getElementById('statStreak').textContent = (currentUser.streak || 0) + '🔥';
}

async function showForgot() {
  // SEBELUMNYA hanya alert() demo -- genuinely menimpa versi inline
  // (window.showForgot) yang lebih matang: validasi email, panggil
  // SupabaseClient.Auth.resetPassword() genuine, tampilkan hasil di
  // loginError. Pola sama dengan handleLogin/handleRegister -- cek
  // konfigurasi SupabaseClient dulu, fallback ke pesan demo jika belum
  // tersedia.
  const hasSupabaseConfig = !!(window.EDUMA_ENV && window.EDUMA_ENV.SUPABASE_URL) && typeof window.SupabaseClient === 'object';
  if (hasSupabaseConfig) {
    const email = document.getElementById('loginEmail')?.value.trim();
    if (!email) {
      showError('loginError', 'Masukkan email terlebih dahulu untuk reset password.');
      return;
    }
    try {
      await window.SupabaseClient.Auth.resetPassword(email);
      showError('loginError', '✅ Link reset password telah dikirim ke ' + email);
    } catch (err) {
      showError('loginError', err.message || 'Gagal mengirim link reset.');
    }
    return;
  }
  alert('🔑 Link reset kata sandi telah dikirim ke email Anda.\n(Ini adalah demo — tidak ada email yang benar-benar dikirim.)');
}

function scrollToProfile() {
  closeDropdown();
  document.getElementById('profileBar').scrollIntoView({ behavior: 'smooth' });
}

function closeDropdown() {
  // Navbar lama; elemen tidak selalu ada (navbar kini dari kyoto-navbar.min.js).
  const dd = document.getElementById('userDropdown');
  if (dd) dd.className = 'user-dropdown';
}

// Nav user click → toggle dropdown
document.getElementById('navUser')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const dd = document.getElementById('userDropdown');
  dd.className = dd.className.includes('open') ? 'user-dropdown' : 'user-dropdown open';
});
document.addEventListener('click', () => closeDropdown());

// Nav login button
document.getElementById('navLoginBtn')?.addEventListener('click', () => openAuth('login'));

// Close modal
document.getElementById('authClose').addEventListener('click', closeAuth);
document.getElementById('authOverlay')?.addEventListener('click', (e) => { if (e.target === document.getElementById('authOverlay')) closeAuth(); });

// Logout
// Diekspos sebagai window.handleLogout supaya bisa dipanggil dari sistem
// navbar terpisah (kyoto-navbar.js's #knLogoutBtn) yang genuinely tidak tahu
// soal sesi 'nihongo_session' — tombol logout navbar sebelumnya hanya
// mengecek Supabase (yang genuinely tidak pernah dikonfigurasi di proyek ini)
// dan diam-diam tidak melakukan apa pun untuk pengguna yang login lewat
// jalur local-demo/Firebase.
window.handleLogout = function() {
  getFirebaseAuth().then((secureAuth) => secureAuth?.signOut?.(secureAuth.auth)).catch(() => null);
  currentUser = null;
  clearSession();
  // GENUINELY ditambahkan: bug "sesi hantu" identik dengan yang ditemukan di
  // Akun.html -- clearSession() hanya menghapus 'nihongo_session', tidak
  // menyentuh 'nihongopro.user.preferences' (hasil bridge migrasi v273 ke
  // Dashboard.html). Dihapus di sini agar logout dari index.html juga
  // genuinely membersihkan bridge, konsisten dengan perbaikan Akun.html.
  localStorage.removeItem('nihongopro.user.preferences');
  closeDropdown();
  updateNavUI();
  const bar = document.getElementById('profileBar');
  if (bar) bar.className = 'profile-bar';
};
document.getElementById('logoutBtn')?.addEventListener('click', window.handleLogout);

// Enter key on inputs
['loginEmail','loginPassword'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
});
['regName','regEmail','regPassword','regPassword2'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });
});

// Also hook CTA "Mulai Gratis" buttons to open register
document.querySelectorAll('.btn-white, [href="#daftar"]').forEach(el => {
  el.addEventListener('click', (e) => {
    if (!currentUser) { e.preventDefault(); openAuth('register'); }
  });
});

// Update quiz stats on quiz complete (hook into existing showResult)
const _origShowResult = typeof showResult === 'function' ? showResult : null;
if (_origShowResult) {
  window.showResult = function() {
    _origShowResult();
    if (currentUser) {
      currentUser.quizCount = (currentUser.quizCount || 0) + 1;
      if (currentUser.bestScore === null || qScore > currentUser.bestScore) currentUser.bestScore = qScore;
      users[currentUser.email] = currentUser;
      saveUsers(); saveSession(currentUser); showProfileBar();
    }
  };
}

// Restore session on page load
const restored = loadSession();
if (restored) {
  currentUser = restored;
  updateNavUI();
  showProfileBar();
}

// ── STUDY TOOLS ──
const studyToolRoot = document.getElementById('tools');
if (studyToolRoot) {
  const planBank = {
    kana: ['Review 10 hiragana/katakana yang paling sering tertukar.', 'Kerjakan kuis kana sampai skor minimal 8/10.', 'Tulis ulang 5 contoh kata dengan suara keras.'],
    kanji: ['Pilih 8 kanji N5 dari chart dan baca on/kun-nya.', 'Kerjakan kuis kanji mode campuran.', 'Catat 3 kanji yang salah ke daftar review besok.'],
    grammar: ['Pelajari 1 pola grammar dasar dan 3 contoh kalimat.', 'Ubah contoh kalimat ke bentuk negatif atau lampau.', 'Buat 2 kalimat versi sendiri.'],
    listening: ['Dengarkan 1 audio pendek tanpa melihat teks.', 'Putar ulang sambil menulis kata kunci yang terdengar.', 'Ucapkan kembali 3 kalimat dengan intonasi yang mirip.']
  };

  const focusLabel = { kana: 'Kana', kanji: 'Kanji N5', grammar: 'Grammar', listening: 'Listening' };
  const studyFocus = document.getElementById('studyFocus');
  const studyMinutes = document.getElementById('studyMinutes');
  const studyMinutesLabel = document.getElementById('studyMinutesLabel');
  const planOutput = document.getElementById('planOutput');
  const savePlanBtn = document.getElementById('savePlanBtn');

  function renderStudyPlan() {
    const focus = studyFocus.value;
    const minutes = Number(studyMinutes.value);
    studyMinutesLabel.textContent = `${minutes} menit`;
    const steps = planBank[focus].map((step, idx) => `<li>${Math.max(5, Math.round(minutes / 3))} menit: ${step}</li>`).join('');
    planOutput.innerHTML = `<strong>Target ${focusLabel[focus]} hari ini</strong><ul>${steps}</ul>`;
    savePlanBtn.classList.remove('saved');
    savePlanBtn.textContent = 'Simpan Target Hari Ini';
  }

  studyFocus.addEventListener('change', renderStudyPlan);
  studyMinutes.addEventListener('input', renderStudyPlan);
  savePlanBtn.addEventListener('click', () => {
    localStorage.setItem('nihongoDailyPlan', JSON.stringify({
      focus: studyFocus.value,
      minutes: Number(studyMinutes.value),
      savedAt: new Date().toISOString()
    }));
    savePlanBtn.classList.add('saved');
    savePlanBtn.textContent = 'Target Tersimpan';
  });
  renderStudyPlan();

  const vocabMini = [
    // N5 dasar
    { jp: '学校', kana: 'がっこう', romaji: 'gakkou', id: 'sekolah' },
    { jp: '先生', kana: 'せんせい', romaji: 'sensei', id: 'guru' },
    { jp: '猫', kana: 'ねこ', romaji: 'neko', id: 'kucing' },
    { jp: '水', kana: 'みず', romaji: 'mizu', id: 'air' },
    { jp: '食べます', kana: 'たべます', romaji: 'tabemasu', id: 'makan' },
    { jp: '見ます', kana: 'みます', romaji: 'mimasu', id: 'melihat/menonton' },
    { jp: '日本語', kana: 'にほんご', romaji: 'nihongo', id: 'bahasa Jepang' },
    { jp: '友達', kana: 'ともだち', romaji: 'tomodachi', id: 'teman' },
    { jp: '電車', kana: 'でんしゃ', romaji: 'densha', id: 'kereta listrik' },
    { jp: '図書館', kana: 'としょかん', romaji: 'toshokan', id: 'perpustakaan' },
    { jp: '病院', kana: 'びょういん', romaji: 'byouin', id: 'rumah sakit' },
    { jp: '空港', kana: 'くうこう', romaji: 'kuukou', id: 'bandara' },
    { jp: '行きます', kana: 'いきます', romaji: 'ikimasu', id: 'pergi' },
    { jp: '来ます', kana: 'きます', romaji: 'kimasu', id: 'datang' },
    { jp: '帰ります', kana: 'かえります', romaji: 'kaerimasu', id: 'pulang' },
    { jp: '話します', kana: 'はなします', romaji: 'hanashimasu', id: 'berbicara' },
    { jp: '聞きます', kana: 'ききます', romaji: 'kikimasu', id: 'mendengar/bertanya' },
    { jp: '書きます', kana: 'かきます', romaji: 'kakimasu', id: 'menulis' },
    { jp: '読みます', kana: 'よみます', romaji: 'yomimasu', id: 'membaca' },
    { jp: '買います', kana: 'かいます', romaji: 'kaimasu', id: 'membeli' },
    // N4 vocab
    { jp: '準備', kana: 'じゅんび', romaji: 'junbi', id: 'persiapan' },
    { jp: '説明', kana: 'せつめい', romaji: 'setsumei', id: 'penjelasan' },
    { jp: '連絡', kana: 'れんらく', romaji: 'renraku', id: 'menghubungi/kabar' },
    { jp: '経験', kana: 'けいけん', romaji: 'keiken', id: 'pengalaman' },
    { jp: '練習', kana: 'れんしゅう', romaji: 'renshuu', id: 'latihan/berlatih' },
    { jp: '心配', kana: 'しんぱい', romaji: 'shinpai', id: 'khawatir/cemas' },
    { jp: '覚えます', kana: 'おぼえます', romaji: 'oboemasu', id: 'mengingat/menghafal' },
    { jp: '忘れます', kana: 'わすれます', romaji: 'wasuremasu', id: 'melupakan' },
    { jp: '始めます', kana: 'はじめます', romaji: 'hajimemasu', id: 'memulai' },
    { jp: '続けます', kana: 'つづけます', romaji: 'tsuzukemasu', id: 'melanjutkan' },
    // N3 vocab
    { jp: '影響', kana: 'えいきょう', romaji: 'eikyou', id: 'pengaruh' },
    { jp: '状況', kana: 'じょうきょう', romaji: 'joukyou', id: 'situasi/kondisi' },
    { jp: '必要', kana: 'ひつよう', romaji: 'hitsuyou', id: 'perlu/diperlukan' },
    { jp: '方法', kana: 'ほうほう', romaji: 'houhou', id: 'cara/metode' },
    { jp: '目的', kana: 'もくてき', romaji: 'mokuteki', id: 'tujuan' },
    { jp: '判断', kana: 'はんだん', romaji: 'handan', id: 'penilaian/keputusan' },
    { jp: '達成', kana: 'たっせい', romaji: 'tassei', id: 'pencapaian' },
    { jp: '発展', kana: 'はってん', romaji: 'hatten', id: 'perkembangan' },
    { jp: '可能', kana: 'かのう', romaji: 'kanou', id: 'mungkin/memungkinkan' },
    { jp: '重要', kana: 'じゅうよう', romaji: 'juuyou', id: 'penting' },
  
    { jp: '影響', kana: 'えいきょう', romaji: 'eikyou', id: 'pengaruh' },
    { jp: '状況', kana: 'じょうきょう', romaji: 'joukyou', id: 'situasi' },
    { jp: '判断', kana: 'はんだん', romaji: 'handan', id: 'penilaian' },
    { jp: '改善', kana: 'かいぜん', romaji: 'kaizen', id: 'perbaikan' },
    { jp: '達成', kana: 'たっせい', romaji: 'tassei', id: 'pencapaian' },
    { jp: '発展', kana: 'はってん', romaji: 'hatten', id: 'perkembangan' },
    { jp: '重要', kana: 'じゅうよう', romaji: 'juuyou', id: 'penting' },
    { jp: '可能', kana: 'かのう', romaji: 'kanou', id: 'mungkin' },
    { jp: '解決', kana: 'かいけつ', romaji: 'kaiketsu', id: 'penyelesaian' },
    { jp: '目的', kana: 'もくてき', romaji: 'mokuteki', id: 'tujuan' },
    { jp: '方法', kana: 'ほうほう', romaji: 'houhou', id: 'cara/metode' },
    { jp: '適切', kana: 'てきせつ', romaji: 'tekisetsu', id: 'tepat/sesuai' },
    { jp: '根拠', kana: 'こんきょ', romaji: 'konkyo', id: 'dasar/alasan' },
    { jp: '傾向', kana: 'けいこう', romaji: 'keikou', id: 'kecenderungan' },
    { jp: '促進', kana: 'そくしん', romaji: 'sokushin', id: 'mendorong/mempercepat' },
    { jp: '対応', kana: 'たいおう', romaji: 'taiou', id: 'respons/penanganan' },
    { jp: '概念', kana: 'がいねん', romaji: 'gainen', id: 'konsep' },
    { jp: '批判', kana: 'ひはん', romaji: 'hihan', id: 'kritik' },
    { jp: '配慮', kana: 'はいりょ', romaji: 'hairyo', id: 'kepedulian' },
    { jp: '維持', kana: 'いじ', romaji: 'iji', id: 'mempertahankan' },];
  const vocabInput = document.getElementById('miniVocabSearch');
  const vocabResults = document.getElementById('miniVocabResults');

  function renderVocabResults() {
    const q = vocabInput.value.trim().toLowerCase();
    const hits = vocabMini.filter(item => !q || [item.jp, item.kana, item.romaji, item.id].some(v => v.toLowerCase().includes(q))).slice(0, 4);
    vocabResults.innerHTML = hits.map(item => `
      <div class="mini-vocab-item">
        <strong>${item.jp}</strong>
        <span>${item.kana} · ${item.romaji}</span>
        <span>${item.id}</span>
      </div>
    `).join('') || '<div class="mini-vocab-item"><span>Belum ada hasil. Coba kata lain.</span></div>';
  }
  vocabInput.addEventListener('input', renderVocabResults);
  renderVocabResults();

  const subject = document.getElementById('sentenceSubject');
  const particle = document.getElementById('sentenceParticle');
  const object = document.getElementById('sentenceObject');
  const verb = document.getElementById('sentenceVerb');
  const sentenceOutput = document.getElementById('sentenceOutput');
  const sentenceNote = document.getElementById('sentenceNote');
  const verbNotes = {
    'べんきょうします': 'Pola umum: topik + は + objek + を + kata kerja. Untuk belajar, にほんごをべんきょうします paling natural.',
    'たべます': 'Kata kerja makan biasanya memakai partikel を untuk objek yang dimakan.',
    'みます': 'Kata kerja melihat/menonton juga biasanya memakai を untuk objek.'
  };

  function renderSentence() {
    sentenceOutput.textContent = `${subject.value}${particle.value}${object.value}を${verb.value}`;
    sentenceNote.textContent = verbNotes[verb.value];
  }
  [subject, particle, object, verb].forEach(el => el.addEventListener('change', renderSentence));
  renderSentence();

  const srsDeck = [
    // Hari dan alam
    { front: '日', back: 'hari / matahari · ニチ・ひ · 日本語, 毎日' },
    { front: '月', back: 'bulan · ゲツ・つき · 一月, 月曜日' },
    { front: '水', back: 'air · スイ・みず · 水曜日, 水泳' },
    { front: '火', back: 'api · カ・ひ · 火曜日, 花火' },
    { front: '木', back: 'pohon · モク・き · 木曜日, 木材' },
    { front: '金', back: 'emas/uang · キン・かね · 金曜日, お金' },
    { front: '土', back: 'tanah · ド・つち · 土曜日, 土地' },
    { front: '山', back: 'gunung · サン・やま · 富士山, 山道' },
    { front: '川', back: 'sungai · セン・かわ · 川辺, 河川' },
    { front: '空', back: 'langit/kosong · クウ・そら · 青空, 空港' },
    // Orang dan hubungan
    { front: '人', back: 'orang · ジン・ひと · 人口, 外国人' },
    { front: '子', back: 'anak · シ・こ · 子供, 女の子' },
    { front: '父', back: 'ayah · フ・ちち · お父さん, 父母' },
    { front: '母', back: 'ibu · ボ・はは · お母さん, 母語' },
    { front: '先', back: 'dulu/depan · セン・さき · 先生, 先週' },
    { front: '生', back: 'hidup/lahir · セイ・う · 学生, 先生' },
    { front: '友', back: 'teman · ユウ・とも · 友達, 友人' },
    // Tempat dan bangunan
    { front: '学', back: 'belajar · ガク・まな · 学校, 大学' },
    { front: '校', back: 'sekolah · コウ · 学校, 高校' },
    { front: '駅', back: 'stasiun · エキ · 駅前, 終点駅' },
    { front: '店', back: 'toko · テン・みせ · 本屋, お店' },
    { front: '家', back: 'rumah/keluarga · カ・いえ · 家族, 家庭' },
    // Aktivitas
    { front: '食', back: 'makan · ショク・た · 食事, 食堂' },
    { front: '飲', back: 'minum · イン・の · 飲み物, 飲食' },
    { front: '見', back: 'melihat · ケン・み · 見学, 見物' },
    { front: '聞', back: 'mendengar · ブン・き · 聞く, 新聞' },
    { front: '書', back: 'menulis · ショ・か · 書類, 辞書' },
    { front: '読', back: 'membaca · ドク・よ · 読書, 読者' },
    { front: '来', back: 'datang · ライ・く · 来年, 未来' },
    { front: '行', back: 'pergi · コウ・い · 旅行, 行動' },
    // Waktu
    { front: '時', back: 'waktu/jam · ジ・とき · 時間, 何時' },
    { front: '年', back: 'tahun · ネン・とし · 来年, 年齢' },
    { front: '今', back: 'sekarang · コン・いま · 今日, 今年' },
    { front: '毎', back: 'setiap · マイ · 毎日, 毎週' },
    // Sifat
    { front: '大', back: 'besar · ダイ・おお · 大学, 大切' },
    { front: '小', back: 'kecil · ショウ・ちい · 小学校, 小説' },
    { front: '高', back: 'tinggi/mahal · コウ・たか · 高校, 高い' },
    { front: '新', back: 'baru · シン・あたら · 新聞, 新しい' },
    { front: '古', back: 'lama/kuno · コ・ふる · 古典, 古い' },
    { front: '長', back: 'panjang · チョウ・なが · 長い, 身長' },
  ,
    { front: '書', back: 'menulis · しょ・か · 書く, 辞書, 手書き' },
    { front: '語', back: 'kata/bahasa · ご・かた · 日本語, 英語, 語る' },
    { front: '食', back: 'makan · しょく・た · 食べる, 食堂, 食事' },
    { front: '学', back: 'belajar · がく・まな · 学校, 大学, 学ぶ' },
    { front: '先', back: 'sebelum/depan · せん・さき · 先生, 先週, 先に' },
    { front: '生', back: 'hidup/lahir · せい・い · 学生, 先生, 生まれる' },
    { front: '名', back: 'nama · めい・な · 名前, 有名, 名刺' },
    { front: '白', back: 'putih · はく・しろ · 白い, 白紙, 告白' },
    { front: '黒', back: 'hitam · こく・くろ · 黒い, 黒板, 暗黒' },
    { front: '青', back: 'biru/hijau · せい・あお · 青い, 青年, 青空' },
    { front: '赤', back: 'merah · せき・あか · 赤い, 赤ちゃん, 赤字' },
    { front: '半', back: 'setengah · はん · 半分, 半年, 半島' },
    { front: '全', back: 'semua · ぜん・すべ · 全部, 全員, 全力' },
    { front: '少', back: 'sedikit · しょう・すく · 少し, 少ない, 少年' },
    { front: '多', back: 'banyak · た・おお · 多い, 多分, 多数' },
    { front: '近', back: 'dekat · きん・ちか · 近い, 最近, 近所' },
    { front: '遠', back: 'jauh · えん・とお · 遠い, 遠足, 遠慮' },
    { front: '早', back: 'cepat/pagi · そう・はや · 早い, 早朝, 素早い' },
    { front: '遅', back: 'lambat/terlambat · ち・おそ · 遅い, 遅刻, 遅延' },
    { front: '新', back: 'baru · しん・あたら · 新しい, 新聞, 新年' },
    // Kanji N4 penting
    { front: '特', back: 'khusus/spesial · トク · 特別(とくべつ), 特定(とくてい)' },
    { front: '意', back: 'maksud/niat · イ · 意味(いみ), 注意(ちゅうい), 意見(いけん)' },
    { front: '場', back: 'tempat/lokasi · ジョウ/ば · 場所(ばしょ), 場合(ばあい)' },
    { front: '方', back: 'cara/arah/orang · ホウ/かた · 方法(ほうほう), 方向(ほうこう)' },
    { front: '以', back: 'lebih dari/sejak · イ · 以上(いじょう), 以下(いか), 以前(いぜん)' },
    { front: '開', back: 'membuka · カイ/ひら.く · 開く(ひらく), 開発(かいはつ), 公開(こうかい)' },
    { front: '決', back: 'memutuskan · ケツ/き.める · 決める(きめる), 決定(けってい)' },
    { front: '様', back: 'gaya/Tuan/状態 · ヨウ/さま · 様子(ようす), 様々(さまざま)' },
    { front: '続', back: 'berlanjut/terus · ゾク/つづ.く · 続ける(つづける), 継続(けいぞく)' },
    { front: '関', back: 'berhubungan/terkait · カン · 関係(かんけい), 関心(かんしん)' },
    // N3 vocab
    { front: '経験', back: 'けいけん · pengalaman · N3 · 経験を積む(つむ)=menumpuk pengalaman' },
    { front: '成功', back: 'せいこう · sukses/berhasil · N3 · 成功する=berhasil' },
    { front: '失敗', back: 'しっぱい · kegagalan · N3 · 失敗から学ぶ=belajar dari kegagalan' },
    { front: '努力', back: 'どりょく · usaha keras · N3 · 努力する=berusaha keras' },
    { front: '目標', back: 'もくひょう · target/sasaran · N3 · 目標を立てる=menetapkan target' },
    // N2 vocab  
    { front: '判断', back: 'はんだん · penilaian/keputusan · N2 · 判断する=menilai/memutuskan' },
    { front: '状況', back: 'じょうきょう · situasi/kondisi · N2 · 状況を把握する' },
    { front: '可能', back: 'かのう · mungkin/bisa · N2 · 可能性(かのうせい)=kemungkinan' },
    { front: '確認', back: 'かくにん · konfirmasi · N2 · 確認する=mengkonfirmasi' },
    { front: '影響', back: 'えいきょう · pengaruh/dampak · N2 · 影響を与える=memberikan pengaruh' },
    // N1 vocab
    { front: '矛盾', back: 'むじゅん · kontradiksi · N1 · 矛盾している=saling bertentangan' },
    { front: '懸念', back: 'けねん · kekhawatiran · N1 · 懸念される=dikhawatirkan' },
    { front: '概念', back: 'がいねん · konsep/pengertian · N1 · 新しい概念=konsep baru' },
    { front: '促進', back: 'そくしん · promosi/dorongan · N1 · 促進する=mendorong/memfasilitasi' },
    { front: '傾向', back: 'けいこう · kecenderungan/tren · N1 · 〜する傾向がある=cenderung ~' },
    // Frase penting
    { front: 'お疲れ様です', back: 'おつかれさまです · "Terima kasih atas kerja kerasmu" · sapaan kolega/setelah kerja' },
    { front: 'よろしくお願いします', back: 'よろしくおねがいします · "Mohon kerjasama/dukungannya" · pembuka percakapan/email' },
    { front: 'いただきます', back: 'いただきます · ucapan sebelum makan · 頂く(いただく)=menerima' },
    { front: 'おかげさまで', back: 'おかげさまで · "Berkat Anda/Berkat semua orang" · respons sopan atas kabar baik' },
    { front: 'お世話になっています', back: 'おせわになっています · "Terima kasih atas kebaikannya" · pembuka email bisnis standar' },
,
  { front: '努力(どりょく)', back: 'usaha / kerja keras', ex: '努力が実る。', level: 'N4' },
  { front: '可能(かのう)', back: 'mungkin / bisa', ex: '可能性がある。', level: 'N4' },
  { front: '必要(ひつよう)', back: 'perlu / diperlukan', ex: '練習が必要だ。', level: 'N4' },
  { front: '注意(ちゅうい)', back: 'perhatian / hati-hati', ex: '注意してください。', level: 'N4' },
  { front: '準備(じゅんび)', back: 'persiapan', ex: '準備ができた。', level: 'N4' },
  { front: '改善(かいぜん)', back: 'perbaikan / peningkatan', ex: '品質を改善する。', level: 'N3' },
  { front: '役割(やくわり)', back: 'peran / fungsi', ex: '重要な役割を果たす。', level: 'N3' },
  { front: '課題(かだい)', back: 'tugas / tantangan / isu', ex: '多くの課題がある。', level: 'N3' },
  { front: '取り組む(とりくむ)', back: 'menangani dengan serius', ex: '問題に取り組む。', level: 'N3' },
  { front: '目指す(めざす)', back: 'mengincar / berusaha menuju', ex: '夢を目指す。', level: 'N3' }];
  let srsIndex = Number(localStorage.getItem('nihongoSrsIndex') || 0) % srsDeck.length;
  let srsKnown = Number(localStorage.getItem('nihongoSrsKnown') || 0);
  let srsFlipped = false;
  const srsCard = document.getElementById('srsCard');
  const srsFront = document.getElementById('srsFront');
  const srsKembali = document.getElementById('srsKembali');
  const srsProgress = document.getElementById('srsProgress');

  function renderSrsCard() {
    const card = srsDeck[srsIndex];
    srsFront.textContent = card.front;
    if (srsKembali) srsKembali.textContent = srsFlipped ? card.back : 'Klik kartu untuk lihat arti';
    srsProgress.textContent = `Kartu ${srsIndex + 1}/${srsDeck.length} · ${srsKnown} ditandai hafal`;
    localStorage.setItem('nihongoSrsIndex', String(srsIndex));
    localStorage.setItem('nihongoSrsKnown', String(srsKnown));
  }

  function nextSrsCard(known) {
    if (known) srsKnown = Math.min(srsDeck.length, srsKnown + 1);
    srsIndex = (srsIndex + 1) % srsDeck.length;
    srsFlipped = false;
    renderSrsCard();
  }

  srsCard.addEventListener('click', () => {
    srsFlipped = !srsFlipped;
    renderSrsCard();
  });
  document.getElementById('srsAgainBtn').addEventListener('click', () => nextSrsCard(false));
  document.getElementById('srsKnowBtn').addEventListener('click', () => nextSrsCard(true));
  renderSrsCard();
}

const cuteClockTime = document.getElementById('cuteClockTime');
const cuteClockPeriod = document.getElementById('cuteClockPeriod');
const cuteClockDay = document.getElementById('cuteClockDay');
const cuteClockDate = document.getElementById('cuteClockDate');

if (cuteClockTime && cuteClockPeriod && cuteClockDay && cuteClockDate) {
  const timeFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const dayFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Tokyo',
    weekday: 'long'
  });
  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Tokyo',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  function renderCuteClock() {
    const now = new Date();
    cuteClockTime.textContent = timeFormatter.format(now).replaceAll('.', ':');
    cuteClockPeriod.textContent = 'JST';
    cuteClockDay.textContent = `${dayFormatter.format(now)} · neko time`;
    cuteClockDate.textContent = `${dateFormatter.format(now)} · Tokyo にゃん`;
  }

  renderCuteClock();
  setInterval(renderCuteClock, 1000);
}

const missionLevel = document.getElementById('missionLevel');
const missionLevelTitle = document.getElementById('missionLevelTitle');
const missionList = document.getElementById('missionList');
const missionProgressBar = document.getElementById('missionProgressBar');
const missionProgressText = document.getElementById('missionProgressText');
const missionLessonLink = document.getElementById('missionLessonLink');
const missionQuizLink = document.getElementById('missionQuizLink');

if (missionLevel && missionList && missionProgressBar && missionProgressText) {
  const missionBank = {
    N5: [
      ['Kana warm-up', 'Baca 15 hiragana/katakana dengan suara pelan.'],
      ['Vocab dasar', 'Hafalkan 10 kata tema rumah, sekolah, atau makanan.'],
      ['Grammar mini', 'Buat 3 kalimat dengan は dan です.'],
      ['Latihan soal', 'Kerjakan 20 soal N5 di bank latihan JLPT.']
    ],
    N4: [
      ['Kanji review', 'Ulangi 12 kanji N4 dan contoh katanya.'],
      ['Grammar bentuk te', 'Buat 3 kalimat permintaan atau izin.'],
      ['Listening pendek', 'Dengarkan 1 audio dan tulis 5 kata kunci.'],
      ['Latihan soal', 'Kerjakan 20 soal N4 dan cek review salah.']
    ],
    N3: [
      ['Reading chunk', 'Baca 1 teks pendek dan tandai partikel penting.'],
      ['Grammar pola', 'Ulangi 2 pola grammar N3 dan buat contoh sendiri.'],
      ['Kaiwa kantor', 'Latih 5 kalimat situasi kerja atau sekolah.'],
      ['Mock drill', 'Kerjakan 25 soal N3 dengan timer ringan.']
    ],
    N2: [
      ['Vocabulary abstrak', 'Catat 12 kosakata formal dan sinonimnya.'],
      ['Reading speed', 'Baca teks menengah selama 10 menit.'],
      ['Grammar nuance', 'Bandingkan 2 pola grammar yang mirip.'],
      ['Mock drill', 'Kerjakan 30 soal N2 lalu review kesalahan.']
    ],
    N1: [
      ['Kanji prioritas', 'Ulangi 15 kanji N1 dan compound word.'],
      ['Reading opini', 'Ringkas 1 paragraf berita atau esai.'],
      ['Grammar lanjut', 'Buat 3 kalimat formal dengan pola N1.'],
      ['Mock drill', 'Kerjakan 30 soal N1 dan tandai yang ragu.']
    ]
  };
  const lessonLinks = {
    N5: 'Materi/Fondasi-Bahasa-Jepang.html',
    N4: 'Materi/Kanji-N4.html',
    N3: 'Materi/Kanji-N3.html',
    N2: 'Materi/Kanji-N2.html',
    N1: 'Materi/Kanji-N1.html'
  };
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const storageKey = `nihongoDailyMission:${todayKey}`;
  let missionState = {};
  try { missionState = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (error) { missionState = {}; }
  missionLevel.value = missionState.level || localStorage.getItem('nihongoMissionLevel') || 'N5';

  function saveMissionState() {
    localStorage.setItem(storageKey, JSON.stringify(missionState));
    localStorage.setItem('nihongoMissionLevel', missionLevel.value);
  }

  function renderMission() {
    const level = missionLevel.value;
    const items = missionBank[level];
    missionState.level = level;
    missionState.done = missionState.done || {};
    if (missionLevelTitle) missionLevelTitle.textContent = `JLPT ${level}`;
    if (missionLessonLink) missionLessonLink.href = lessonLinks[level] || 'Materi/Materi.html';
    if (missionQuizLink) missionQuizLink.href = `Materi/Latihan-JLPT.html?level=${level}`;
    missionList.innerHTML = items.map(([title, desc], index) => {
      const key = `${level}-${index}`;
      const checked = missionState.done[key] ? 'checked' : '';
      return `<label class="mission-item"><input type="checkbox" data-mission-key="${key}" ${checked}><span><b>${title}</b><span>${desc}</span></span></label>`;
    }).join('');
    updateMissionProgress(false);
  }

  function updateMissionProgress(allowAward = true) {
    const total = missionBank[missionLevel.value].length;
    const checked = missionList.querySelectorAll('input:checked').length;
    missionProgressBar.style.width = `${Math.round((checked / total) * 100)}%`;
    missionProgressText.textContent = `${checked}/${total} selesai`;
    const completionKey = `${missionLevel.value}:completed`;
    if (allowAward && checked === total && !missionState[completionKey]) {
      missionState[completionKey] = true;
      saveMissionState();
      window.nihongoProgress?.record?.('xp', 10, `Daily mission ${missionLevel.value}`);
      window.proToast?.('Daily mission selesai. Mantap, progress tersimpan.');
    }
  }

  missionLevel.addEventListener('change', () => {
    missionState.level = missionLevel.value;
    saveMissionState();
    renderMission();
  });
  missionList.addEventListener('change', (event) => {
    const key = event.target?.dataset?.missionKey;
    if (!key) return;
    missionState.done = missionState.done || {};
    missionState.done[key] = event.target.checked;
    saveMissionState();
    updateMissionProgress();
  });
  renderMission();
}
