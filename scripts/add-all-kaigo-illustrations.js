#!/usr/bin/env node
/**
 * Add SVG illustrations to ALL Kaigo modules that don't have them yet.
 * Maps each module to the most appropriate category illustration.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MATTERI = path.join(ROOT, 'Materi');
const ILLUSTRATIONS = path.join(ROOT, 'assets', 'illustrations');

// Module-to-illustration mapping for all 85 remaining modules
const MODULE_MAP = {
  // === UJIAN (Exam Prep) ===
  'Kaigo-Ujian-Comm-Gijutsu.html': 'exam-prep.svg',
  'Kaigo-Ujian-Hattatsu-Roka.html': 'exam-prep.svg',
  'Kaigo-Ujian-Iryo-Care.html': 'exam-prep.svg',
  'Kaigo-Ujian-Kaigo-Katei.html': 'exam-prep.svg',
  'Kaigo-Ujian-Kihon.html': 'exam-prep.svg',
  'Kaigo-Ujian-Kokoro-Karada.html': 'exam-prep.svg',
  'Kaigo-Ujian-N2.html': 'exam-prep.svg',
  'Kaigo-Ujian-Nasional.html': 'exam-prep.svg',
  'Kaigo-Ujian-Ninchisho.html': 'exam-prep.svg',
  'Kaigo-Ujian-Ningen-Kankei.html': 'exam-prep.svg',
  'Kaigo-Ujian-Seikatsu-Shien.html': 'exam-prep.svg',
  'Kaigo-Ujian-Shakai.html': 'exam-prep.svg',
  'Kaigo-Ujian-Shogai.html': 'exam-prep.svg',
  'Kaigo-Ujian-Sogo-Mondai.html': 'exam-prep.svg',
  'Kaigo-Ujian-Songen.html': 'exam-prep.svg',
  'Kaigo-N5.html': 'exam-prep.svg',
  'Kaigo-Nihongo-N4.html': 'exam-prep.svg',
  
  // === SPEAKING ===
  'Kaigo-Speaking.html': 'speaking-practice.svg',
  'Kaigo-Speaking-Lanjut.html': 'speaking-practice.svg',
  'Kaigo-Speaking-Advanced.html': 'speaking-practice.svg',
  'Kaigo-Speaking-N2.html': 'speaking-practice.svg',
  'Kaigo-Kaiwa-Technique.html': 'speaking-practice.svg',
  'Kaigo-Bahasa.html': 'speaking-practice.svg',
  'Kaigo-Kosakata-Klinik.html': 'speaking-practice.svg',
  
  // === MEDICAL / DISEASE ===
  'Kaigo-Diabetes-Care.html': 'medical-care.svg',
  'Kaigo-Stroke-Lanjut.html': 'medical-care.svg',
  'Kaigo-Parkinson.html': 'medical-care.svg',
  'Kaigo-Osteoporosis.html': 'medical-care.svg',
  'Kaigo-Penyakit.html': 'medical-care.svg',
  'Kaigo-Kyoshuku-Yobo.html': 'medical-care.svg',
  'Kaigo-Kokyu-Junkan.html': 'medical-care.svg',
  'Kaigo-Taino-Kanri.html': 'medical-care.svg',
  'Kaigo-Medis-Advanced.html': 'medical-care.svg',
  'Kaigo-Medis-Lanjut.html': 'medical-care.svg',
  'Kaigo-Ninchi-Kino.html': 'medical-care.svg',
  
  // === LEGAL / ETHICS ===
  'Kaigo-Hukum.html': 'legal-ethics.svg',
  'Kaigo-Hukum-Lanjut.html': 'legal-ethics.svg',
  'Kaigo-Kaigo-Rinri.html': 'legal-ethics.svg',
  'Kaigo-Jinken-Fukushi.html': 'legal-ethics.svg',
  'Kaigo-Gyakutai-Boshi.html': 'legal-ethics.svg',
  'Kaigo-Shuhi-Gimu.html': 'legal-ethics.svg',
  'Kaigo-Kaigo-Hoken-Detail.html': 'legal-ethics.svg',
  
  // === COMMUNICATION ===
  'Kaigo-Komunikasi.html': 'communication.svg',
  'Kaigo-Higeongo-Comm.html': 'communication.svg',
  'Kaigo-Ningen-Songen.html': 'communication.svg',
  'Kaigo-Koi-Kaijo.html': 'communication.svg',
  'Kaigo-Mensetsu-Taisaku.html': 'communication.svg',
  'Kaigo-Kazoku-Shien.html': 'communication.svg',
  
  // === DOCUMENTATION ===
  'Kaigo-Dokumentasi.html': 'documentation.svg',
  'Kaigo-Rekod.html': 'documentation.svg',
  'Kaigo-Rekod-Lanjut.html': 'documentation.svg',
  'Kaigo-Kaigo-Katei.html': 'documentation.svg',
  'Kaigo-Prosedur.html': 'documentation.svg',
  'Kaigo-Prosedur-Lanjut.html': 'documentation.svg',
  'Kaigo-Kojin-Joho.html': 'documentation.svg',
  
  // === SAFETY / EMERGENCY ===
  'Kaigo-Safety-Guide.html': 'safety-guide.svg',
  'Kaigo-Emergency.html': 'safety-guide.svg',
  'Kaigo-Risk-Management.html': 'safety-guide.svg',
  'Kaigo-Katan-Kyuin.html': 'safety-guide.svg',
  
  // === BATHING / TOILETING ===
  'Kaigo-Nyuyoku-Care.html': 'bathing-care.svg',
  'Kaigo-Haisetsu-Care.html': 'bathing-care.svg',
  'Kaigo-Shouka-Haisetsu.html': 'bathing-care.svg',
  'Kaigo-Higeongo-Comm.html': 'bathing-care.svg',
  
  // === NUTRITION ===
  'Kaigo-Gizi.html': 'nutrition-diet.svg',
  'Kaigo-Shokuji-Guide.html': 'nutrition-diet.svg',
  'Kaigo-Keikan-Eiyo.html': 'nutrition-diet.svg',
  'Kaigo-Chiiki-Shakai.html': 'nutrition-diet.svg',
  
  // === CARE PROCESS ===
  'Kaigo-ICF-Assessment.html': 'care-process.svg',
  'Kaigo-Taju-Renkei.html': 'care-process.svg',
  'Kaigo-Shokuba-Bunka.html': 'care-process.svg',
  
  // === SOCIAL WELFARE ===
  'Kaigo-Shakai-Hosho.html': 'social-welfare.svg',
  'Kaigo-Jiritsu-Shien.html': 'social-welfare.svg',
  'Kaigo-Shogaisha-Shien.html': 'social-welfare.svg',
  'Kaigo-Fukushishi-Overview.html': 'social-welfare.svg',
  'Kaigo-Juukankyo-Seibi.html': 'social-welfare.svg',
  
  // === HOME / NIGHT CARE ===
  'Kaigo-Homecare.html': 'home-care.svg',
  'Kaigo-Yakan-Care.html': 'home-care.svg',
  
  // === GENERAL / OTHER ===
  'Kaigo-Bunka.html': 'communication.svg',
  'Kaigo-Baisutikku.html': 'medical-care.svg',
  'Kaigo-Kuchiku-Care.html': 'bathing-care.svg',
  'Kaigo-Iijo-Ido.html': 'rehabilitation.svg',
  'Kaigo-Mental-Health.html': 'communication.svg',
  'Kaigo-Kurumaisu.html': 'wheelchair.svg',
};

// CSS for illustrations
const CSS = `
.km-illustration{display:block;max-width:400px;width:100%;height:auto;margin:0 auto 24px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
@media(prefers-color-scheme:dark){.km-illustration{box-shadow:0 2px 12px rgba(0,0,0,0.3)}}
`;

let added = 0;
let skipped = 0;

for (const [filename, svgFile] of Object.entries(MODULE_MAP)) {
  const fpath = path.join(MATTERI, filename);
  if (!fs.existsSync(fpath)) { skipped++; continue; }
  
  let html = fs.readFileSync(fpath, 'utf8');
  
  // Skip if already has illustration
  if (html.includes('km-illustration')) { skipped++; continue; }
  
  const svgPath = path.join(ILLUSTRATIONS, svgFile);
  if (!fs.existsSync(svgPath)) {
    console.log(`  ⚠️ ${svgFile} not found for ${filename}`);
    skipped++;
    continue;
  }
  
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const illustration = `\n<div class="km-illustration" role="img" aria-label="Ilustrasi ${filename.replace('.html','').replace('Kaigo-','')}">\n${svgContent}\n</div>\n`;
  
  // Insert strategy
  if (html.includes('class="ch"')) {
    // Book-style: insert after </header>
    html = html.replace('</header>', `</header>\n${illustration}`);
  } else if (html.includes('class="page-hero"')) {
    // Standard: insert after page-hero div
    const heroEnd = html.indexOf('</div>', html.indexOf('class="page-hero"'));
    if (heroEnd !== -1) {
      html = html.substring(0, heroEnd + 6) + illustration + html.substring(heroEnd + 6);
    }
  } else {
    // Fallback: insert after <main
    const mainIdx = html.indexOf('<main');
    if (mainIdx !== -1) {
      const closeTag = html.indexOf('>', mainIdx) + 1;
      html = html.substring(0, closeTag) + illustration + html.substring(closeTag);
    }
  }
  
  // Add CSS if not present
  if (!html.includes('.km-illustration')) {
    html = html.replace('</head>', `<style>${CSS}</style>\n</head>`);
  }
  
  fs.writeFileSync(fpath, html, 'utf8');
  added++;
}

console.log(`\nAdded illustrations to ${added} files, skipped ${skipped}`);
