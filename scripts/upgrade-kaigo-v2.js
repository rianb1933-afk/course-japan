const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'Materi');

// Illustration mapping
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
  
  // 1. Extract metadata
  const titleM = h.match(/<title>([^<]+)<\/title>/);
  const rawTitle = titleM ? titleM[1].replace(/\s*\|\s*Nihongo Pro Academy.*/,'').trim() : f.replace('.html','').replace('Kaigo-','');
  
  const descM = h.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  const desc = descM ? descM[1] : rawTitle;
  
  // 2. Extract quiz data
  let quizData = '', qv = 'Q';
  let qm = h.match(/var\s+QUIZ\s*=\s*(\[[\s\S]*?\])\s*[;\n]/);
  if (qm) { quizData = qm[1]; qv = 'QUIZ'; }
  else {
    qm = h.match(/var\s+Q\s*=\s*(\[[\s\S]*?\])\s*[,\n]/);
    if (qm) { quizData = qm[1]; qv = 'Q'; }
  }
  
  // 3. Count quiz questions
  const quizCount = quizData ? (quizData.match(/"q"/g)||[]).length : 0;
  
  // 4. Extract dialogs (count dialog sections)
  const dlgMatch = h.match(/Dialog \d+/g);
  const dialogCount = dlgMatch ? dlgMatch.length : 0;
  
  // 5. Count vocab items
  let vocabCount = 0;
  const pvMatch = h.match(/var\s+PH_VOCAB\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (pvMatch) vocabCount = (pvMatch[1].match(/\[/g)||[]).length;
  else {
    const vgi = h.match(/vocab-item/g);
    if (vgi) vocabCount = vgi.length;
  }
  
  // 6. Build chapter header
  const illu = getIllu(f);
  const badge = getBadge(f);
  const level = getLevel(f);
  
  // Extract short title (before any dash or pipe)
  let shortTitle = rawTitle.split('—')[0].trim().split('|')[0].trim();
  if (shortTitle.length > 50) shortTitle = shortTitle.substring(0, 50) + '...';
  
  const chapterHeader = `
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
</header>`;
  
  // 7. Build illustration
  const illuDiv = `
<div class="km-illustration illu-comm" role="img" aria-label="Ilustrasi ${shortTitle}">
<img src="../assets/illustrations/${illu}" alt="Ilustrasi ${f.replace('.html','').replace('Kaigo-','')}" loading="lazy" width="800" height="450">
</div>`;
  
  // 8. Extract section headers for TOC
  const sectionHeaders = [];
  // Try h3 first
  for (const m of h.matchAll(/<h3[^>]*>(?:<[^>]*>)*([^<]{3,})<\/h3>/g)) {
    const t = m[1].replace(/^[\s\S]{0,4}\s*/,'').trim();
    if (t && !t.match(/^(Quiz|Kosakata|語彙|重要)/) && t.length > 2) sectionHeaders.push(t);
  }
  // Then h2
  for (const m of h.matchAll(/<h2[^>]*>(?:<[^>]*>)*([^<]{3,})<\/h2>/g)) {
    const t = m[1].replace(/^[\s\S]{0,4}\s*/,'').trim();
    if (t && !t.match(/^(Quiz|Kosakata|語彙|Latihan|重要)/) && t.length > 2 && !sectionHeaders.includes(t)) sectionHeaders.push(t);
  }
  
  const tocItems = sectionHeaders.slice(0,10).map((t,i) => 
    `    <li><a class="toc-i" href="#s${i+1}"><span class="toc-n">${i+1}</span><span class="toc-l">${t}</span></a></li>`
  ).join('\n');
  
  // 9. Build new template - preserve all content between <body> and first script
  const bodyStart = h.indexOf('<body>');
  const firstScript = h.indexOf('<script>', bodyStart + 6);
  const endHtml = h.indexOf('</body>');
  
  if (bodyStart === -1) return 'error: no <body>';
  
  // Get all content after the old header/hero
  let content = h.substring(bodyStart + 6);
  
  // Remove old hero div
  content = content.replace(/<div class="hero">[\s\S]*?<\/div>/, '');
  
  // Remove old km-illustration (we'll add new one)
  content = content.replace(/<div class="km-illustration[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/, '');
  content = content.replace(/<div class="km-illustration[^"]*"[^>]*>[\s\S]*?<\/div>/, '');
  
  // Convert section headers: <h3> → <h2 class="bst"> wrapped in bsh
  content = content.replace(/<h3>([^<]+)<\/h3>/g, (m, text) => {
    const clean = text.replace(/^(📚|📊|💬|🌟|⚠️|💡|🧠|📋|🔗|📢|✅|🔍|📢|🛁|🍱|🏠|🎯|🔍)\s*/,'');
    return `<div class="bsh"><h2 class="bst">${clean}</h2></div>`;
  });
  
  // Convert h2 with class st to new format
  content = content.replace(/<h2 class="st">([^<]+)<\/h2>/g, '<div class="bsh"><h2 class="bst">$1</h2></div>');
  
  // Convert <div class="tip"> to kp
  content = content.replace(/<div class="tip">([\s\S]*?)<\/div>/g, '<div class="kp"><div class="kp-t">💡</div><p>$1</p></div>');
  
  // Convert <div class="sec"> to bs
  let secIdx = 0;
  content = content.replace(/<div class="sec">/g, () => {
    secIdx++;
    return `<div class="bs" id="s${secIdx}">`;
  });
  
  // Convert vocab grids
  content = content.replace(/<div class="pg-vocab" id="pg"><\/div>/g, '');
  content = content.replace(/<div id="vocab-grid">[\s\S]*?<\/section>/g, '');
  
  // Convert old dialog format to new
  content = content.replace(/<div class="dlg-row"><span>([^<]+)<\/span><div><div class="dlg-jp">([^<]+)/g, 
    '<div class="bds"><div class="bda bda-d">_$1</div><div class="bdcn"><div class="bdj">$2</div>');
  content = content.replace(/<div class="dlg-id">([^<]+)<\/div>/g, '<div class="bdi">$1</div></div></div>');
  
  // Remove old vocab section
  content = content.replace(/<section>\s*<h2[^>]*>📚[\s\S]*?<\/section>/g, '');
  
  // Remove old quiz sections  
  content = content.replace(/<h2[^>]*>🧠\s*Quiz[\s\S]*?<div id="qkZ"><\/div>/g, '');
  content = content.replace(/<h2[^>]*>🧠\s*Latihan[\s\S]*?<div id="qkZ"><\/div>/g, '');
  content = content.replace(/<div id="qkZ"><\/div>/g, '');
  
  // Convert old <div class="wrap"> to book
  content = content.replace(/<div class="wrap">/g, '<div class="book">');
  
  // Remove existing book wrapper if present
  content = content.replace(/<div class="book">/g, '<div class="book">');
  
  // Clean up empty sections
  content = content.replace(/<div class="bs"[^>]*>\s*<\/div>/g, '');
  
  // 10. Build final HTML
  const metaTags = `
<meta property="og:title" content="${rawTitle.replace(/"/g,'&quot;')}">
<meta property="og:type" content="article">
<link rel="icon" type="image/svg+xml" href="../assets/icon-192.svg">
<link rel="stylesheet" href="../assets/kyoto-bundle.min.css">
<link rel="stylesheet" href="../assets/kyoto-elevation.css">
<link rel="stylesheet" href="../assets/kaigo-module.css">
<link rel="stylesheet" href="../assets/kyoto-navbar.min.css?v=20260623">
<link rel="stylesheet" href="../assets/kyoto-bottom-nav.css">`;
  
  const scripts = `
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
<link rel="manifest" href="../manifest.json">`;

  const tocSection = `
<div class="toc">
  <div class="toc-t">📋 Daftar Isi</div>
  <ul class="toc-list">
${tocItems || '    <li><a class="toc-i" href="#s1"><span class="toc-n">1</span><span class="toc-l">Materi</span></a></li>'}
  </ul>
</div>`;

  const quizSection = quizData ? `
<div class="bs" id="quiz">
  <div class="bsh"><h2 class="bst">🧠 Uji Pemahaman</h2></div>
  <div id="qc"></div>
</div>
<script>
var ${qv}=${quizData}${qv==='Q'?',qi=0,ok=0,tot=0':''};
</script>` : '';
  
  const bottomNav = `
<div class="bmn">
  <a class="bmn-a" href="Kaigo.html">
    <div class="bmn-al">← Kembali</div>
    <div class="bmn-at">Daftar Modul</div>
  </a>
</div>`;

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

  const final = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${rawTitle} | Nihongo Pro Academy</title>
<meta name="description" content="${desc.replace(/"/g,'&quot;')}">
${metaTags}
${scripts}
</head>
<body>
<a href="#main-content" class="skip-to-content">Langsung ke konten</a>

${chapterHeader}
${illuDiv}

<main id="main-content">
${tocSection}
${content}
${quizSection}
${bottomNav}
</main>

<button class="bttBtn" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Ke atas">↑</button>
${footer}
</body>
</html>`;

  fs.writeFileSync(fp, final, 'utf8');
  return {quizCount, vocabCount, sections: sectionHeaders.length};
}

// Execute
const files = fs.readdirSync(DIR).filter(f => f.startsWith('Kaigo-') && f.endsWith('.html')).sort();
let stats = {converted:0, skipped:0, errors:[]};

for (const f of files) {
  try {
    const r = convert(f);
    if (r === 'skipped') { stats.skipped++; console.log(`⏭️ ${f}`); }
    else if (r === 'error: no <body>') { stats.errors.push(f); console.log(`❌ ${f}: ${r}`); }
    else { stats.converted++; console.log(`✅ ${f} (q:${r.quizCount} v:${r.vocabCount} s:${r.sections})`); }
  } catch(e) { stats.errors.push(f); console.log(`❌ ${f}: ${e.message}`); }
}

console.log(`\n=== DONE: ${stats.converted} converted, ${stats.skipped} skipped, ${stats.errors.length} errors ===`);
if (stats.errors.length) console.log('Errors:', stats.errors);
