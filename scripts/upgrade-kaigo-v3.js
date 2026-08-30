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
  
  // Extract title
  const titleM = h.match(/<title>([^<]+)<\/title>/);
  const rawTitle = titleM ? titleM[1].replace(/\s*\|\s*Nihongo Pro Academy.*/,'').trim() : f.replace('.html','').replace('Kaigo-','');
  
  const descM = h.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  const desc = descM ? descM[1] : rawTitle;
  
  // Extract quiz data
  let quizData = '', qv = 'Q';
  let qm = h.match(/var\s+QUIZ\s*=\s*(\[[\s\S]*?\])\s*[;\n]/);
  if (qm) { quizData = qm[1]; qv = 'QUIZ'; }
  else {
    qm = h.match(/var\s+Q\s*=\s*(\[[\s\S]*?\])\s*[,;\n]/);
    if (qm) { quizData = qm[1]; qv = 'Q'; }
  }
  
  const quizCount = quizData ? (quizData.match(/"q"/g)||[]).length : 0;
  
  // Count dialog sections
  const dlgMatch = h.match(/Dialog \d+/g);
  const dialogCount = dlgMatch ? dlgMatch.length : 0;
  
  // Count vocab
  let vocabCount = 0;
  const pvMatch = h.match(/var\s+PH_VOCAB\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (pvMatch) vocabCount = (pvMatch[1].match(/\[/g)||[]).length;
  else {
    const vgi = h.match(/vocab-item/g);
    if (vgi) vocabCount = vgi.length;
  }
  
  const illu = getIllu(f);
  const badge = getBadge(f);
  const level = getLevel(f);
  
  let shortTitle = rawTitle.split('—')[0].trim().split('|')[0].trim();
  if (shortTitle.length > 50) shortTitle = shortTitle.substring(0, 50) + '...';
  
  // Extract ALL h3 and h2 headers from original content for TOC
  const sectionHeaders = [];
  // h3 with emoji prefix pattern: <h3>emoji Text</h3>
  const h3All = [...h.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)];
  for (const m of h3All) {
    let t = m[1].replace(/<[^>]+>/g,'').trim();
    // Remove leading emoji characters and spaces
    t = t.replace(/^[\p{Emoji_Presentation}\p{Emoji}\u200d\uFE0F]+\s*/u, '').trim();
    if (t && t.length > 3 && !t.match(/^(Quiz|Kosakata|語彙|重要|Latihan)/)) sectionHeaders.push(t);
  }
  // h2 with class st or plain
  const h2All = [...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  for (const m of h2All) {
    let t = m[1].replace(/<[^>]+>/g,'').trim();
    t = t.replace(/^[\p{Emoji_Presentation}\p{Emoji}\u200d\uFE0F]+\s*/u, '').trim();
    if (t && t.length > 3 && !t.match(/^(Quiz|Kosakata|語彙|Latihan|重要)/) && !sectionHeaders.includes(t)) sectionHeaders.push(t);
  }
  
  const tocItems = sectionHeaders.slice(0,12).map((t,i) => 
    `    <li><a class="toc-i" href="#s${i+1}"><span class="toc-n">${i+1}</span><span class="toc-l">${t}</span></a></li>`
  ).join('\n');
  
  // === Content extraction ===
  // Find the body content start (after <body> tag)
  const bodyIdx = h.indexOf('<body>');
  if (bodyIdx === -1) return 'error: no <body>';
  
  let content = h.substring(bodyIdx + 6);
  
  // Remove the old skip-to-content link
  content = content.replace(/<a href="#main-content"[^>]*>[\s\S]*?<\/a>/, '');
  
  // Remove old km-illustration (will add new one)
  content = content.replace(/<div class="km-illustration[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/, '');
  content = content.replace(/<div class="km-illustration[^"]*"[^>]*>[\s\S]*?<\/div>/, '');
  
  // Remove old hero div
  content = content.replace(/<div class="hero">[\s\S]*?<\/div>/, '');
  
  // Convert h3 headers: strip emoji, wrap in bsh
  content = content.replace(/<h3>([\s\S]*?)<\/h3>/g, (m, inner) => {
    let text = inner.replace(/<[^>]+>/g,'').trim();
    text = text.replace(/^[\p{Emoji_Presentation}\p{Emoji}\u200d\uFE0F]+\s*/u, '').trim();
    return `<div class="bsh"><h2 class="bst">${text}</h2></div>`;
  });
  
  // Convert h2 class="st" headers
  content = content.replace(/<h2 class="st">([\s\S]*?)<\/h2>/g, (m, inner) => {
    let text = inner.replace(/<[^>]+>/g,'').trim();
    text = text.replace(/^[\p{Emoji_Presentation}\p{Emoji}\u200d\uFE0F]+\s*/u, '').trim();
    return `<div class="bsh"><h2 class="bst">${text}</h2></div>`;
  });
  
  // Convert <div class="tip"> to kp (key point)
  content = content.replace(/<div class="tip">([\s\S]*?)<\/div>/g, '<div class="kp"><p>$1</p></div>');
  
  // Convert <div class="sec"> to <div class="bs" id="sN">
  let secIdx = 0;
  content = content.replace(/<div class="sec">/g, () => `<div class="bs" id="s${++secIdx}">`);
  
  // Convert old vocab grid to empty (quiz engine handles it)
  content = content.replace(/<div class="pg-vocab" id="pg"><\/div>/g, '');
  
  // Convert old dialog format to new
  content = content.replace(/<div class="dlg-row"><span>([^<]+)<\/span><div><div class="dlg-jp">([\s\S]*?)<button[^>]*>[^<]*<\/button><\/div><div class="dlg-id">([\s\S]*?)<\/div><\/div><\/div>/g,
    '<div class="bds"><div class="bda bda-d">_$1</div><div class="bdcn"><div class="bdj">$2</div><div class="bdj"><button class="bvc-tts" onclick="speak(\'$2\')">🔊</button></div><div class="bdi">$3</div></div></div>');
  
  // Remove old vocab section (section with id="vocab-grid")
  content = content.replace(/<section>\s*<h2[^>]*>📚[\s\S]*?<\/section>/g, '');
  content = content.replace(/<div id="vocab-grid">[\s\S]*?<\/div><\/section>/g, '');
  
  // Remove old quiz containers
  content = content.replace(/<div id="qkZ"><\/div>/g, '');
  content = content.replace(/<div id="qc"><\/div>/g, '');
  
  // Remove empty sections
  content = content.replace(/<div class="sec">\s*<\/div>/g, '');
  content = content.replace(/<div class="bs"[^>]*>\s*<\/div>/g, '');
  
  // Remove old <div class="wrap"> wrapper
  content = content.replace(/<div class="wrap">/g, '');
  
  // Remove old </div><!-- /wrap --> or </div></div> closings
  content = content.replace(/<\/div>\s*<\/div>\s*<\/main>/g, '</main>');
  
  // Clean up old script tags that were inside body
  content = content.replace(/<script>\s*var\s+PH_VOCAB[\s\S]*?<\/script>\s*<script>\s*document\.addEventListener[\s\S]*?<\/script>/g, '');
  content = content.replace(/<script>\s*var\s+Q\s*=[\s\S]*?<\/script>/g, '');
  content = content.replace(/<script>\s*var\s+QUIZ\s*=[\s\S]*?<\/script>/g, '');
  content = content.replace(/<script>\s*\nvar\s+Q[\s\S]*?<\/script>/g, '');
  content = content.replace(/<script>\s*\nvar\s+QUIZ[\s\S]*?<\/script>/g, '');
  content = content.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  content = content.replace(/<script>\s*var\s+qi[\s\S]*?<\/script>/g, '');
  
  // Remove old bottom scripts
  content = content.replace(/<button class="theme-toggle[\s\S]*?<\/button>/g, '');
  content = content.replace(/<button aria-label="Ganti tema"[\s\S]*?<\/button>/g, '');
  
  // Remove old footer
  content = content.replace(/<footer[\s\S]*?<\/footer>/g, '');
  
  // Remove old bottom nav script tags
  content = content.replace(/<\/body>[\s\S]*$/g, '');
  
  // Trim content
  content = content.trim();
  
  // === Build final HTML ===
  const tocSection = tocItems ? `
<div class="toc">
  <div class="toc-t">📋 Daftar Isi</div>
  <ul class="toc-list">
${tocItems}
  </ul>
</div>` : '';
  
  const quizSection = quizData ? `
<div class="bs" id="quiz">
  <div class="bsh"><h2 class="bst">Uji Pemahaman</h2></div>
  <div id="qc"></div>
</div>` : '';
  
  const final = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${rawTitle} | Nihongo Pro Academy</title>
<meta name="description" content="${desc.replace(/"/g,'&quot;')}">
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
</head>
<body>
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
${tocSection}
${content}
${quizSection}
</div><!-- /book -->
</main>

<div class="bmn">
  <a class="bmn-a" href="Kaigo.html">
    <div class="bmn-al">← Kembali</div>
    <div class="bmn-at">Daftar Modul</div>
  </a>
</div>

<button class="bttBtn" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Ke atas">↑</button>

${quizData ? `<script>\nvar ${qv}=${quizData}${qv==='Q'?',qi=0,ok=0,tot=0':''};\n</script>` : ''}

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
</footer>
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
    else if (typeof r === 'string') { stats.errors.push(f); console.log(`❌ ${f}: ${r}`); }
    else { stats.converted++; console.log(`✅ ${f} (q:${r.quizCount} v:${r.vocabCount} s:${r.sections})`); }
  } catch(e) { stats.errors.push(f); console.log(`❌ ${f}: ${e.message}`); }
}

console.log(`\n=== DONE: ${stats.converted} converted, ${stats.skipped} skipped, ${stats.errors.length} errors ===`);
if (stats.errors.length) console.log('Errors:', stats.errors);
