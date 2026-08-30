const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'Materi');

function getIllu(f) {
  const b = f.replace('Kaigo-','').replace('.html','');
  const m = {
    'Ujian':'exam-prep','Speaking':'speaking-practice','Bahasa':'speaking-practice',
    'CPR':'cpr-hero','Vital':'vital-signs','Rehabilitasi':'rehabilitation',
    'Infection':'infection-control','Dementia':'dementia-care','Alzheimer':'dementia-care',
    'Kasai':'fire-safety','Fukuyaku':'medication','Kurumaisu':'wheelchair',
    'Jishin':'earthquake','Terminal':'terminal-care','Palliative':'palliative-care',
    'Nyuyoku':'bathing-care','Gizi':'nutrition-diet','Nutrition':'nutrition-diet',
    'Communication':'communication','Komunikasi':'communication',
    'Dokumentasi':'documentation','Rekod':'documentation','Hoko':'documentation',
    'Hukum':'legal-ethics','Rinri':'legal-ethics','Jinken':'legal-ethics',
    'Songen':'legal-ethics','Ningen':'legal-ethics','Baisutikku':'legal-ethics',
    'Fukushishi':'legal-ethics','Koi':'legal-ethics','Kojin':'legal-ethics',
    'Shakai':'social-welfare','Hosho':'social-welfare','Bunka':'social-welfare',
    'Chiiki':'social-welfare','Kazoku':'social-welfare','Shokuba':'social-welfare',
    'Homecare':'home-care','Juukankyo':'home-care',
    'Taju':'multidisciplinary','Team':'multidisciplinary',
    'Medis':'medical-care','Penyakit':'medical-care',
    'Stroke':'stroke-care','Diabetes':'diabetes-care',
    'Parkinson':'parkinson-care','Osteoporosis':'osteoporosis',
    'Mental':'mental-health','Safety':'safety-guide','Risk':'safety-guide',
    'Emergency':'safety-guide','Katan':'safety-guide',
    'Self':'self-reliance','Jiritsu':'self-reliance',
    'ICF':'care-process','Roka':'care-process',
    'Setsugu':'assistive-equipment','Shogaisha':'assistive-equipment',
    'Kosakata':'speaking-practice','Kyoshuku':'contraction-prevention',
    'Meal':'meal-support','Shokuji':'meal-support',
    'Kuchiku':'infection-control','Yakan':'bathing-care',
    'Keikan':'nutrition-diet','Kokyu':'vital-signs',
    'Haisetsu':'medication','Shouka':'medication','Koken':'medication',
    'Higeongo':'communication','Iijo':'communication',
    'Kaiwa':'speaking-practice','Mensetsu':'speaking-practice',
    'Prosedur':'medical-care','N5':'exam-prep','Nihongo':'exam-prep'
  };
  for (const [k,v] of Object.entries(m)) { if (b.includes(k)) return v+'.svg'; }
  return 'care-process.svg';
}

function getBadge(f) {
  const b = f.replace('Kaigo-','').replace('.html','');
  if (b.startsWith('Ujian-')) return '📝 介護·受験';
  if (b.match(/Speaking|Bahasa|Kaiwa|Mensetsu/)) return '🎤 介護·スピーキング';
  if (b.match(/Nihongo|N5|N4/)) return '📖 日本語·語彙';
  if (b.match(/CPR|AED|Emergency|Katan/)) return '🏥 介護·応急';
  if (b.match(/Vital|Kokyu/)) return '📊 介護·バイタル';
  if (b.match(/Rehabilitasi|Iijo/)) return '🏋️ 介護·リハビリ';
  if (b.match(/Dementia|Alzheimer|Ninchi/)) return '🧠 介護·認知症';
  if (b.match(/Infection|Kuchiku/)) return '🛡️ 介護·感染';
  if (b.match(/Kasai|Jishin|Risk|Safety/)) return '⚠️ 介護·安全';
  if (b.match(/Fukuyaku|Haisetsu|Shouka|Koken/)) return '💊 介護·医療';
  if (b.match(/Hukum|Rinri|Jinken|Songen|Ningen|Baisutikku|Koi|Kojin|Fukushishi/)) return '⚖️ 介護·法';
  if (b.match(/Hosho|Shakai|Bunka|Chiiki|Kazoku|Shokuba/)) return '🏛️ 介護·社会';
  if (b.match(/Communication|Komunikasi|Higeongo/)) return '🗣️ 介護·コミュニケーション';
  if (b.match(/Dokumentasi|Rekod|Hoko|Prosedur/)) return '📋 介護·記録';
  if (b.match(/Nyuyoku|Yakan/)) return '🛁 介護·入浴';
  if (b.match(/Gizi|Nutrition|Keikan|Shokuji|Meal/)) return '🍱 介護·食事';
  if (b.match(/Terminal|Palliative/)) return '🕊️ 介護·ターミナル';
  if (b.match(/Self|Jiritsu/)) return '🌿 介護·自立';
  if (b.match(/Homecare|Juukankyo/)) return '🏠 介護·在宅';
  if (b.match(/ICF|Roka/)) return '🔄 介護·プロセス';
  if (b.match(/Medis|Penyakit/)) return '🏥 介護·疾患';
  if (b.match(/Stroke/)) return '🧠 介護·脳卒中';
  if (b.match(/Diabetes/)) return '💉 介護·糖尿病';
  if (b.match(/Parkinson/)) return '🧬 介護·パーキンソン';
  if (b.match(/Osteoporosis/)) return '🦴 介護·骨粗しょう症';
  if (b.match(/Mental/)) return '💚 介護·メンタル';
  if (b.match(/Setsugu|Shogaisha/)) return '♿ 介護·福祉用具';
  if (b.match(/Kosakata/)) return '📚 介護·語彙';
  if (b.match(/Kyoshuku/)) return '😮 介護·恐怖';
  if (b.match(/Taju|Team/)) return '🤝 介護·連携';
  return '🧑‍🤝‍🧑 介護·全般';
}

function getLevel(f) {
  const b = f.replace('Kaigo-','').replace('.html','');
  if (b.includes('Nasional')) return 'N1';
  if (b.startsWith('Ujian-') || b.includes('Advanced') || b.includes('Lanjut')) return 'N2';
  if (b.includes('N5')) return 'N5';
  if (b.includes('N4') || b.includes('Nihongo')) return 'N4';
  return 'N2';
}

function convert(f) {
  const fp = path.join(DIR, f);
  let h = fs.readFileSync(fp, 'utf8');
  if (h.includes('class="ch"') && h.includes('class="book"')) return 'skipped';
  
  // Extract metadata
  const titleM = h.match(/<title>([^<]+)<\/title>/);
  const rawTitle = titleM ? titleM[1].replace(/\s*\|\s*Nihongo Pro Academy.*/,'').trim() : f.replace('.html','').replace('Kaigo-','');
  
  // Count quiz questions
  let quizCount = 0;
  const qMatch = h.match(/var\s+(?:QUIZ|Q)\s*=\s*\[/);
  if (qMatch) {
    const qStart = qMatch.index;
    const qSection = h.substring(qStart);
    quizCount = (qSection.match(/"q"/g)||[]).length || (qSection.match(/q:"/g)||[]).length || (qSection.match(/q: '/g)||[]).length;
  }
  
  const dlgMatch = h.match(/Dialog \d+/g);
  const dialogCount = dlgMatch ? dlgMatch.length : 0;
  
  let vocabCount = 0;
  const pvMatch = h.match(/var\s+PH_VOCAB\s*=\s*\[/);
  if (pvMatch) {
    const vSection = h.substring(pvMatch.index);
    const arrMatch = vSection.match(/=\s*(\[[\s\S]*?\])\s*;/);
    if (arrMatch) vocabCount = (arrMatch[1].match(/\[/g)||[]).length;
  }
  if (!vocabCount) {
    const vgi = h.match(/vocab-item/g);
    if (vgi) vocabCount = Math.floor(vgi.length / 2); // each item appears twice
  }
  
  const illu = getIllu(f);
  const badge = getBadge(f);
  const level = getLevel(f);
  let shortTitle = rawTitle.split('—')[0].trim().split('|')[0].trim();
  if (shortTitle.length > 50) shortTitle = shortTitle.substring(0, 50) + '...';
  
  // === SURGICAL APPROACH: Only replace head and body chrome ===
  
  // 1. Replace <head> contents
  const newHead = `<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${rawTitle} | Nihongo Pro Academy</title>
<meta name="description" content="${(h.match(/content="([^"]+)"/)||['',''])[1].replace(/"/g,'&quot;')}">
<meta property="og:title" content="${rawTitle.replace(/"/g,'&quot;')}">
<meta property="og:type" content="article">
<link rel="icon" type="image/svg+xml" href="../assets/icon-192.svg">
<link rel="stylesheet" href="../assets/kyoto-bundle.min.css">
<link rel="stylesheet" href="../assets/kyoto-elevation.css">
<link rel="stylesheet" href="../assets/kaigo-module.css">
<link rel="stylesheet" href="../assets/kyoto-navbar.min.css?v=20260623">
<link rel="stylesheet" href="../assets/kyoto-bottom-nav.css">
<script src="../assets/env.js" defer></script>
<script src="../assets/supabase-client.js" defer></script>
<script src="../assets/analytics-loader.js" defer></script>
<script src="../assets/platform.min.js" defer></script>
<script src="../assets/kyoto-theme.js" defer></script>
<script src="../assets/kaigo-quiz.js" defer></script>
<script src="../assets/kaigo-progress.js" defer></script>
<script src="../assets/kyoto-navbar.min.js?v=20260623" defer></script>
<script src="../assets/kyoto-bottom-nav.js" defer></script>
<script src="../assets/np-skip-link.js" defer></script>
<script src="../assets/site-motion.js" defer></script>
<script src="../assets/anime-theme.js" defer></script>
<link rel="manifest" href="../manifest.json">
</head>`;
  
  h = h.replace(/<head>[\s\S]*?<\/head>/, newHead);
  
  // 2. Replace body opening (add skip link + chapter header + illustration + book wrapper)
  const bookOpen = `<body>
<a href="#main-content" class="skip-to-content">Langsung ke konten</a>

<header class="ch">
  <div class="ch-badge">${badge} · Level ${level}</div>
  <h1 class="ch-title">${shortTitle}</h1>
  <p class="ch-sub">${rawTitle}</p>
  <div class="ch-meta">
    <div class="meta-i"><div class="meta-ic">📝</div><span>${quizCount} Soal</span></div>
    <div class="meta-i"><div class="meta-ic">💬</div><span>${dialogCount || '—'} Dialog</span></div>
    <div class="meta-i"><div class="meta-ic">📖</div><span>${vocabCount} Kosakata</span></div>
    <div class="meta-i"><div class="meta-ic">⏱️</div><span>~${Math.max(15,quizCount*2)} Menit</span></div>
  </div>
</header>

<div class="km-illustration illu-comm" role="img" aria-label="Ilustrasi ${shortTitle}">
<img src="../assets/illustrations/${illu}" alt="Ilustrasi ${f.replace('.html','').replace('Kaigo-','')}" loading="lazy" width="800" height="450">
</div>

<main id="main-content">
<div class="book">
`;
  
  // Find the <body> tag and everything after it until first content
  const bodyMatch = h.match(/<body[^>]*>/);
  if (!bodyMatch) return 'error: no <body>';
  
  const bodyIdx = bodyMatch.index;
  const afterBody = h.substring(bodyIdx + bodyMatch[0].length);
  
  // Remove everything before the first real content (skip-to-content link, old main tag, etc.)
  const cleanAfterBody = afterBody.replace(/^\s*(?:<a href="#main-content"[^>]*>[\s\S]*?<\/a>\s*)?(?:<main[^>]*>)?\s*(?:<div class="km-illustration[^"]*"[^>]*>[\s\S]*?<\/div>\s*)?(?:<div class="hero">[\s\S]*?<\/div>\s*)?/, '');
  
  h = h.substring(0, bodyIdx) + bookOpen + cleanAfterBody;
  
  // 3. Add book closing and bottom nav before </footer> or </body>
  const bookClose = `
</div><!-- /book -->
</main>

<div class="bmn">
  <a class="bmn-a" href="Kaigo.html">
    <div class="bmn-al">← Kembali</div>
    <div class="bmn-at">Daftar Modul</div>
  </a>
</div>

<button class="bttBtn" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Ke atas">↑</button>

`;
  
  // Insert before </body>
  h = h.replace(/<\/body>/, bookClose + '</body>');
  
  // Add footer if missing
  if (!h.includes('<footer')) {
    const footer = `
<footer style="background:var(--ink);color:#fff;padding:40px 20px;text-align:center">
  <div style="max-width:800px;margin:0 auto">
    <div style="font-weight:700;margin-bottom:12px">Nihongo Pro Academy</div>
    <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:12px">
      <a href="../index.html" style="color:rgba(255,255,255,.6);text-decoration:none">Beranda</a>
      <a href="Materi.html" style="color:rgba(255,255,255,.6);text-decoration:none">Materi</a>
      <a href="Kaigo.html" style="color:rgba(255,255,255,.6);text-decoration:none">介護</a>
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,.4)">© 2025 NihongoPro</div>
  </div>
</footer>`;
    h = h.replace(/<\/body>/, footer + '\n</body>');
  }
  
  fs.writeFileSync(fp, h, 'utf8');
  return {quizCount, vocabCount};
}

// Execute
const files = fs.readdirSync(DIR).filter(f => f.startsWith('Kaigo-') && f.endsWith('.html')).sort();
let stats = {converted:0, skipped:0, errors:[]};

for (const f of files) {
  try {
    const r = convert(f);
    if (r === 'skipped') { stats.skipped++; console.log(`⏭️ ${f}`); }
    else if (typeof r === 'string') { stats.errors.push(f); console.log(`❌ ${f}: ${r}`); }
    else { stats.converted++; console.log(`✅ ${f} (q:${r.quizCount} v:${r.vocabCount})`); }
  } catch(e) { stats.errors.push(f); console.log(`❌ ${f}: ${e.message}`); }
}

console.log(`\n=== DONE: ${stats.converted} converted, ${stats.skipped} skipped, ${stats.errors.length} errors ===`);
if (stats.errors.length) console.log('Errors:', stats.errors);
