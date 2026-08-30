const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const ILLUSTRATIONS_DIR = path.join(__dirname, '..', 'assets', 'illustrations');

// Category to illustration mapping
const ILLUSTRATION_MAP = {
  'Ujian': 'exam-prep.svg',
  'Speaking': 'speaking-practice.svg',
  'Bahasa': 'speaking-practice.svg',
  'CPR': 'cpr-hero.svg',
  'Vital': 'vital-signs.svg',
  'AED': 'aed-diagram.svg',
  'Rehabilitasi': 'rehabilitation.svg',
  'Infection': 'infection-control.svg',
  'Dementia': 'dementia-care.svg',
  'Alzheimer': 'dementia-care.svg',
  'Kasai': 'fire-safety.svg',
  'Fukuyaku': 'medication.svg',
  'Kurumaisu': 'wheelchair.svg',
  'Jishin': 'earthquake.svg',
  'Terminal': 'terminal-care.svg',
  'Palliative': 'palliative-care.svg',
  'Bathing': 'bathing-care.svg',
  'Nyuyoku': 'bathing-care.svg',
  'Meal': 'meal-support.svg',
  'Gizi': 'nutrition-diet.svg',
  'Nutrition': 'nutrition-diet.svg',
  'Communication': 'communication.svg',
  'Komunikasi': 'communication.svg',
  'Documentation': 'documentation.svg',
  'Dokumentasi': 'documentation.svg',
  'Rekod': 'documentation.svg',
  'Legal': 'legal-ethics.svg',
  'Hukum': 'legal-ethics.svg',
  'Rinri': 'legal-ethics.svg',
  'Jinken': 'legal-ethics.svg',
  'Ningen': 'legal-ethics.svg',
  'Songen': 'legal-ethics.svg',
  'Social': 'social-welfare.svg',
  'Shakai': 'social-welfare.svg',
  'Hosho': 'social-welfare.svg',
  'Homecare': 'home-care.svg',
  'Home': 'home-care.svg',
  'Team': 'multidisciplinary.svg',
  'Taju': 'multidisciplinary.svg',
  'Tashoku': 'multidisciplinary.svg',
  'Medis': 'medical-care.svg',
  'Penyakit': 'medical-care.svg',
  'Stroke': 'stroke-care.svg',
  'Diabetes': 'diabetes-care.svg',
  'Parkinson': 'parkinson-care.svg',
  'Osteoporosis': 'osteoporosis.svg',
  'Mental': 'mental-health.svg',
  'Safety': 'safety-guide.svg',
  'Risk': 'safety-guide.svg',
  'Emergency': 'safety-guide.svg',
  'Katan': 'safety-guide.svg',
  'Self': 'self-reliance.svg',
  'Jiritsu': 'self-reliance.svg',
  'ICF': 'care-process.svg',
  'Kosakata': 'speaking-practice.svg',
  'Baisutikku': 'legal-ethics.svg',
  'Kasai': 'fire-safety.svg',
  'Bunka': 'social-welfare.svg',
  'Hoko': 'documentation.svg',
  'Setsugu': 'assistive-equipment.svg',
  'Fukushishi': 'legal-ethics.svg',
  'Chiiki': 'social-welfare.svg',
  'Kazoku': 'social-welfare.svg',
  'Shogaisha': 'assistive-equipment.svg',
  'Shokuba': 'social-welfare.svg',
  'Kyoshuku': 'contraction-prevention.svg',
  'Yakan': 'bathing-care.svg',
  'Kuchiku': 'infection-control.svg',
  'Keikan': 'nutrition-diet.svg',
  'Kokyu': 'vital-signs.svg',
  'Haisetsu': 'medication.svg',
  'Shouka': 'medication.svg',
  'Shokuji': 'nutrition-diet.svg',
  'Koi': 'legal-ethics.svg',
  'Kojin': 'legal-ethics.svg',
  'Higeongo': 'communication.svg',
  'Roka': 'care-process.svg',
  'Kaiwa': 'speaking-practice.svg',
  'Mensetsu': 'speaking-practice.svg',
  'Juukankyo': 'home-care.svg',
  'Koken': 'medication.svg',
  'Iijo': 'communication.svg',
  'Katan': 'safety-guide.svg',
  'Prosedur': 'medical-care.svg',
  'Kurumaisu': 'wheelchair.svg',
  'Haise': 'medication.svg',
  'Default': 'care-process.svg'
};

function getIllustration(filename) {
  const base = filename.replace('Kaigo-', '').replace('.html', '');
  for (const [key, svg] of Object.entries(ILLUSTRATION_MAP)) {
    if (base.includes(key)) return svg;
  }
  return ILLUSTRATION_MAP.Default;
}

function getBadge(filename) {
  const base = filename.replace('Kaigo-', '').replace('.html', '');
  if (base.startsWith('Ujian-')) return '📝 介護·受験';
  if (base.includes('Speaking') || base.includes('Bahasa') || base.includes('Kaiwa') || base.includes('Mensetsu')) return '🎤 介護·スピーキング';
  if (base.includes('Nihongo') || base.includes('N5') || base.includes('N4')) return '📖 日本語·語彙';
  if (base.includes('CPR') || base.includes('AED') || base.includes('Emergency') || base.includes('Katan')) return '🏥 介護·応急';
  if (base.includes('Vital')) return '📊 介護·バイタル';
  if (base.includes('Rehabilitasi') || base.includes('Iijo')) return '🏋️ 介護·リハビリ';
  if (base.includes('Dementia') || base.includes('Alzheimer') || base.includes('Ninchi')) return '🧠 介護·認知症';
  if (base.includes('Infection') || base.includes('Kuchiku')) return '🛡️ 介護·感染';
  if (base.includes('Kasai') || base.includes('Jishin') || base.includes('Risk') || base.includes('Safety')) return '⚠️ 介護·安全';
  if (base.includes('Fukuyaku') || base.includes('Haise') || base.includes('Shouka') || base.includes('Haisetsu')) return '💊 介護·医療';
  if (base.includes('Hukum') || base.includes('Rinri') || base.includes('Jinken') || base.includes('Songen') || base.includes('Ningen') || base.includes('Baisutikku') || base.includes('Koi') || base.includes('Kojin')) return '⚖️ 介護·法';
  if (base.includes('Hosho') || base.includes('Shakai') || base.includes('Bunka') || base.includes('Chiiki') || base.includes('Kazoku') || base.includes('Shokuba')) return '🏛️ 介護·社会';
  if (base.includes('Communication') || base.includes('Komunikasi') || base.includes('Higeongo') || base.includes('Iijo')) return '🗣️ 介護·コミュニケーション';
  if (base.includes('Dokumentasi') || base.includes('Rekod') || base.includes('Hoko') || base.includes('Prosedur')) return '📋 介護·記録';
  if (base.includes('Nyuyoku') || base.includes('Bathing')) return '🛁 介護·入浴';
  if (base.includes('Meal') || base.includes('Gizi') || base.includes('Nutrition') || base.includes('Shokuji') || base.includes('Keikan')) return '🍱 介護·食事';
  if (base.includes('Terminal') || base.includes('Palliative')) return '🕊️ 介護·ターミナル';
  if (base.includes('Jiritsu') || base.includes('Self')) return '🌿 介護·自立';
  if (base.includes('Homecare') || base.includes('Home') || base.includes('Juukankyo')) return '🏠 介護·在宅';
  if (base.includes('ICF') || base.includes('Roka')) return '🔄 介護·プロセス';
  if (base.includes('Medis') || base.includes('Penyakit')) return '🏥 介護·疾患';
  if (base.includes('Stroke')) return '🧠 介護·脳卒中';
  if (base.includes('Diabetes')) return '💉 介護·糖尿病';
  if (base.includes('Parkinson')) return '🧬 介護·パーキンソン';
  if (base.includes('Osteoporosis')) return '🦴 介護·骨粗しょう症';
  if (base.includes('Mental')) return '💚 介護·メンタル';
  if (base.includes('Setsugu')) return '🔧 介護·福祉用具';
  if (base.includes('Shogaisha')) return '♿ 介護·障害者';
  if (base.includes('Fukushishi')) return '🧑‍🎓 介護·福祉士';
  if (base.includes('Taju') || base.includes('Team') || base.includes('Tashoku')) return '🤝 介護·連携';
  if (base.includes('Kosakata')) return '📚 介護·語彙';
  if (base.includes('Kyoshuku')) return '😮 介護·恐怖';
  if (base.includes('Yakan')) return '🌙 介護·夜間';
  return '🧑‍🤝‍🧑 介護·全般';
}

function getLevel(filename) {
  const base = filename.replace('Kaigo-', '').replace('.html', '');
  if (base.startsWith('Ujian-') && base.includes('Nasional')) return 'N1';
  if (base.startsWith('Ujian-')) return 'N2';
  if (base.includes('Advanced') || base.includes('Lanjut')) return 'N2';
  if (base.includes('N5')) return 'N5';
  if (base.includes('N4') || base.includes('Nihongo')) return 'N4';
  return 'N2';
}

function convertFile(filename) {
  const filepath = path.join(MATERI_DIR, filename);
  let html = fs.readFileSync(filepath, 'utf8');
  
  // Skip already converted files
  if (html.includes('class="ch"') && html.includes('class="book"')) {
    return { filename, status: 'skipped', reason: 'already converted' };
  }
  
  // Extract title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const rawTitle = titleMatch ? titleMatch[1].replace(' | Nihongo Pro Academy', '').trim() : filename.replace('.html', '').replace('Kaigo-', '');
  
  // Extract description
  const descMatch = html.match(/content="([^"]+)"/);
  const description = descMatch ? descMatch[1] : rawTitle;
  
  // Extract quiz variable (try both Q and QUIZ)
  let quizData = '';
  let quizVarName = 'Q';
  
  // Try QUIZ first
  let quizMatch = html.match(/var\s+QUIZ\s*=\s*(\[[\s\S]*?\])\s*;?\s*(?:qi|var)/);
  if (!quizMatch) {
    quizMatch = html.match(/var\s+QUIZ\s*=\s*(\[[\s\S]*?\])\s*;/);
  }
  if (quizMatch) {
    quizData = quizMatch[1];
    quizVarName = 'QUIZ';
  } else {
    // Try Q
    quizMatch = html.match(/var\s+Q\s*=\s*(\[[\s\S]*?\])\s*,\s*qi/);
    if (!quizMatch) {
      quizMatch = html.match(/var\s+Q\s*=\s*(\[[\s\S]*?\])\s*;?\s*(?:qi|ok|tot)/);
    }
    if (!quizMatch) {
      // Try more aggressive pattern
      quizMatch = html.match(/var\s+Q\s*=\s*(\[[\s\S]*?\])\s*[;,]\s*(?:qi|ok|tot)/);
    }
    if (quizMatch) {
      quizData = quizMatch[1];
      quizVarName = 'Q';
    }
  }
  
  // Extract PH_VOCAB
  let vocabData = '';
  const vocabMatch = html.match(/var\s+PH_VOCAB\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (vocabMatch) {
    vocabData = vocabMatch[1];
  }
  
  // Extract inline vocab grid
  let inlineVocab = '';
  const vocabSectionMatch = html.match(/<div id="vocab-grid">([\s\S]*?)<\/section>/);
  if (vocabSectionMatch) {
    const items = vocabSectionMatch[1].match(/<div class="vocab-item">([\s\S]*?)<\/div>/g);
    if (items) {
      inlineVocab = items.map(item => {
        const term = item.match(/speak\('([^']+)'\)/);
        const romaji = item.match(/<div class="vocab-romaji">([^<]+)<\/div>/);
        const meaning = item.match(/<div class="vocab-meaning">([^<]+)<\/div>/);
        if (term && romaji && meaning) {
          return `[${JSON.stringify(term[1])}, ${JSON.stringify(romaji[1].trim())}, ${JSON.stringify(meaning[1].trim())}]`;
        }
        return null;
      }).filter(Boolean).join(', ');
    }
  }
  
  // Determine which vocab to use
  const finalVocab = vocabData || (inlineVocab ? `[${inlineVocab}]` : '[]');
  const vocabCount = finalVocab === '[]' ? 0 : (finalVocab.match(/\[/g) || []).length;
  
  // Count quiz questions
  const quizCount = quizData ? (quizData.match(/"q"/g) || quizData.match(/q:/g) || []).length : 0;
  
  // Count dialog sections
  const dialogCount = (html.match(/dlg-row|bdc-/g) || []).length > 0 ? 
    Math.max(1, Math.floor((html.match(/dlg-row/g) || []).length / 3)) : 0;
  
  // Extract section headers (h3 tags inside div.sec or h2 tags)
  const sectionHeaders = [];
  const h3Matches = html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g);
  for (const m of h3Matches) {
    const text = m[1].replace(/^(📚|📊|💬|🌟|⚠️|💡|🧠|📋|🔗|📢|✅|🔍)\s*/, '').trim();
    if (text && text.length > 2) sectionHeaders.push(text);
  }
  // Also try h2
  const h2Matches = html.matchAll(/<h2[^>]*>(?:<[^>]+>)*([^<]+)<\/h2>/g);
  for (const m of h2Matches) {
    const text = m[1].replace(/^(📚|📊|💬|🌟|⚠️|💡|🧠|📋|🔗|📢|✅|🔍)\s*/, '').trim();
    if (text && text.length > 2 && !sectionHeaders.includes(text)) sectionHeaders.push(text);
  }
  
  const illustration = getIllustration(filename);
  const badge = getBadge(filename);
  const level = getLevel(filename);
  const chNum = String(sectionHeaders.length || 6).padStart(2, '0');
  
  // Build TOC
  const tocItems = sectionHeaders.slice(0, 12).map((h, i) => 
    `<li><a class="toc-i" href="#s${i+1}"><span class="toc-n">${i+1}</span><span class="toc-l">${h}</span></a></li>`
  ).join('\n');
  
  // Extract main content sections (everything between wrap div and quiz)
  let mainContent = '';
  
  // Get sections from the old template
  const wrapMatch = html.match(/<div class="wrap">([\s\S]*?)(?=<h2[^>]*>📚\s*Kosakata|<h2[^>]*>📊\s*語彙|var\s+Q[\s=])/);
  if (wrapMatch) {
    let rawContent = wrapMatch[1];
    // Convert h3 section headers
    rawContent = rawContent.replace(/<h3>([^<]+)<\/h3>/g, '<h2 class="bst">$1</h2>');
    // Convert section divs
    rawContent = rawContent.replace(/<div class="sec">/g, '<div class="bs" id="s' + (sectionHeaders.indexOf(rawContent) + 1) + '">');
    mainContent = rawContent;
  }
  
  // Build the new HTML
  const newHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${rawTitle} | Nihongo Pro Academy</title>
<meta name="description" content="${description.replace(/"/g, '&quot;')}">
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
  <div class="ch-num">${chNum}</div>
  <h1 class="ch-title">${rawTitle.split('—')[0].trim().split('|')[0].trim()}</h1>
  <p class="ch-sub">${rawTitle.split('—')[1] ? rawTitle.split('—')[1].trim() : rawTitle}</p>
  <div class="ch-meta">
    <div class="meta-i"><div class="meta-ic">📝</div><span>${quizCount} Soal</span></div>
    <div class="meta-i"><div class="meta-ic">💬</div><span>${dialogCount || '—'} Dialog</span></div>
    <div class="meta-i"><div class="meta-ic">📖</div><span>${vocabCount} Kosakata</span></div>
    <div class="meta-i"><div class="meta-ic">⏱️</div><span>~${Math.max(15, quizCount * 2)} Menit</span></div>
  </div>
</header>

<div class="km-illustration illu-comm" role="img" aria-label="Ilustrasi ${rawTitle.split('—')[0].trim().split('|')[0].trim()}">
<img src="../assets/illustrations/${illustration}" alt="Ilustrasi ${filename.replace('.html','').replace('Kaigo-','')}" loading="lazy" width="800" height="450">
</div>

<main id="main-content">
<div class="book">

<!-- Table of Contents -->
<div class="toc">
  <div class="toc-t">📋 Daftar Isi</div>
  <ul class="toc-list">
${tocItems || '    <li><a class="toc-i" href="#s1"><span class="toc-n">1</span><span class="toc-l">Materi</span></a></li>'}
  </ul>
</div>

${mainContent || '<div class="bs" id="s1"><div class="bsh"><div class="bsi">1</div><div><div class="bsn">Bagian 1</div><h2 class="bst">Materi Inti</h2></div></div><p>Detail materi tersedia di halaman ini.</p></div>'}

<!-- Vocab Section -->
<div class="bs" id="vocab">
  <div class="bsh">
    <div class="bsi">📚</div>
    <div>
      <div class="bsn">Kosakata</div>
      <h2 class="bst">Kosakata Penting</h2>
    </div>
  </div>
  <div class="bvg">
    <div class="bvc"><div class="bvc-j">—</div><div class="bvc-r">—</div><div class="bvc-m">Lihat kosakata di halaman ini</div></div>
  </div>
</div>

<!-- Quiz Section -->
<div class="bs" id="quiz">
  <div class="bsh">
    <div class="bsi">🧠</div>
    <div>
      <div class="bsn">Quiz</div>
      <h2 class="bst">Uji Pemahaman</h2>
    </div>
  </div>
  <div id="qc"></div>
</div>

</div><!-- /book -->
</main>

<div class="bmn">
  <a class="bmn-a" href="Kaigo.html">
    <div class="bmn-al">← Kembali</div>
    <div class="bmn-at">Daftar Modul</div>
  </a>
</div>

</div><!-- /wrap -->
${quizVarName === 'QUIZ' ? `<script>\nvar QUIZ=${quizData};\n</script>` : `<script>\nvar Q=${quizData},qi=0,ok=0,tot=0;\n</script>`}
${finalVocab !== '[]' ? `<script>\nvar PH_VOCAB=${finalVocab};\n</script>\n<script>\ndocument.addEventListener('DOMContentLoaded', function(){\nrenderVocabGrid('pg', PH_VOCAB);\n});\n</script>` : ''}
<script src="../assets/kyoto-theme.js" defer></script>

<button class="bttBtn" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Ke atas">↑</button>

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
  
  // Write file
  fs.writeFileSync(filepath, newHtml, 'utf8');
  
  return { filename, status: 'converted', quizCount, vocabCount: finalVocab === '[]' ? 0 : vocabCount };
}

// Main execution
const files = fs.readdirSync(MATERI_DIR)
  .filter(f => f.startsWith('Kaigo-') && f.endsWith('.html'))
  .sort();

let stats = { converted: 0, skipped: 0, errors: 0 };
let results = [];

for (const file of files) {
  try {
    const result = convertFile(file);
    results.push(result);
    if (result.status === 'converted') stats.converted++;
    else stats.skipped++;
    console.log(`${result.status === 'converted' ? '✅' : '⏭️'} ${file} (quiz: ${result.quizCount || 0}, vocab: ${result.vocabCount || 0})`);
  } catch (err) {
    console.error(`❌ ${file}: ${err.message}`);
    stats.errors++;
  }
}

console.log(`\n=== DONE ===`);
console.log(`Converted: ${stats.converted}`);
console.log(`Skipped: ${stats.skipped}`);
console.log(`Errors: ${stats.errors}`);
