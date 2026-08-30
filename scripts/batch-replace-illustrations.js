#!/usr/bin/env node
/**
 * Batch replace inline SVGs with external img tags in Kaigo modules.
 * Maps each module to the appropriate illustration file.
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'Materi');

// Module → Illustration mapping
const MODULE_MAP = {
  // Medical (Red)
  'Kaigo-CPR': { file: 'cpr-hero', cat: 'medical' },
  'Kaigo-Vital-Sign': { file: 'vital-signs', cat: 'medical' },
  'Kaigo-Kokyu-Junkan': { file: 'cpr-hero', cat: 'medical' },
  'Kaigo-Kasai-Hinan': { file: 'fire-safety', cat: 'safety' },
  'Kaigo-Jishin-Saigai': { file: 'earthquake', cat: 'safety' },
  'Kaigo-Hoko-Kaijo': { file: 'fire-safety', cat: 'safety' },
  'Kaigo-Emergency': { file: 'cpr-hero', cat: 'medical' },
  'Kaigo-Medis-Advanced': { file: 'medical-care', cat: 'medical' },
  'Kaigo-Medis-Lanjut': { file: 'medical-care', cat: 'medical' },
  'Kaigo-Penyakit': { file: 'medical-care', cat: 'medical' },
  'Kaigo-Stroke-Lanjut': { file: 'stroke-care', cat: 'medical' },
  'Kaigo-Diabetes-Care': { file: 'diabetes-care', cat: 'medical' },
  'Kaigo-Parkinson': { file: 'parkinson-care', cat: 'medical' },
  'Kaigo-Osteoporosis': { file: 'osteoporosis', cat: 'medical' },
  'Kaigo-Shouka-Haisetsu': { file: 'medical-care', cat: 'medical' },
  'Kaigo-Haisetsu-Care': { file: 'medical-care', cat: 'medical' },
  'Kaigo-Kuchiku-Care': { file: 'medical-care', cat: 'medical' },
  'Kaigo-Katan-Kyuin': { file: 'medical-care', cat: 'medical' },

  // Care (Green)
  'Kaigo-Rehabilitasi': { file: 'rehabilitation', cat: 'care' },
  'Kaigo-ADL-Guide': { file: 'adl-diagram', cat: 'care' },
  'Kaigo-Kurumaisu': { file: 'wheelchair', cat: 'care' },
  'Kaigo-Nyuyoku-Care': { file: 'bathing-care', cat: 'care' },
  'Kaigo-Bathing-Care': { file: 'bathing-care', cat: 'care' },
  'Kaigo-Shokuji-Guide': { file: 'meal-support', cat: 'care' },
  'Kaigo-Gizi': { file: 'nutrition-diet', cat: 'care' },
  'Kaigo-Nutrition': { file: 'nutrition-diet', cat: 'care' },
  'Kaigo-Terminal-Care': { file: 'terminal-care', cat: 'care' },
  'Kaigo-Fukuyaku': { file: 'medication', cat: 'care' },
  'Kaigo-Taino-Kanri': { file: 'care-process', cat: 'care' },
  'Kaigo-Fukushiyo-Gu': { file: 'assistive-equipment', cat: 'care' },
  'Kaigo-Iijo-Ido': { file: 'meal-support', cat: 'care' },
  'Kaigo-Setsugu': { file: 'care-process', cat: 'care' },
  'Kaigo-Roka-Shikumi': { file: 'home-care', cat: 'care' },
  'Kaigo-Taju-Renkei': { file: 'multidisciplinary', cat: 'care' },
  'Kaigo-Fukushishi-Overview': { file: 'care-process', cat: 'care' },
  'Kaigo-Homecare': { file: 'home-care', cat: 'care' },
  'Kaigo-Jiritsu-Shien': { file: 'self-reliance', cat: 'comm' },
  'Kaigo-Ninchi-Kino': { file: 'dementia-care', cat: 'comm' },
  'Kaigo-Prosedur': { file: 'care-process', cat: 'care' },
  'Kaigo-Prosedur-Lanjut': { file: 'care-process', cat: 'care' },
  'Kaigo-Yakan-Care': { file: 'bathing-care', cat: 'care' },
  'Kaigo-Shuhi-Gimu': { file: 'medication', cat: 'care' },

  // Safety (Yellow)
  'Kaigo-Safety-Guide': { file: 'safety-guide', cat: 'safety' },
  'Kaigo-Infection-Control': { file: 'infection-control', cat: 'safety' },
  'Kaigo-Risk-Management': { file: 'safety-guide', cat: 'safety' },
  'Kaigo-Gyakutai-Boshi': { file: 'safety-guide', cat: 'safety' },
  'Kaigo-Contraciton-Prevention': { file: 'contraction-prevention', cat: 'safety' },

  // Communication (Purple)
  'Kaigo-Komunikasi': { file: 'communication', cat: 'comm' },
  'Kaigo-Kaiwa-Technique': { file: 'speaking-practice', cat: 'comm' },
  'Kaigo-Higeongo-Comm': { file: 'communication', cat: 'comm' },
  'Kaigo-Dementia-Communication': { file: 'dementia-care', cat: 'comm' },
  'Kaigo-Speaking': { file: 'speaking-practice', cat: 'comm' },
  'Kaigo-Speaking-Advanced': { file: 'speaking-practice', cat: 'comm' },
  'Kaigo-Speaking-Lanjut': { file: 'speaking-practice', cat: 'comm' },
  'Kaigo-Speaking-N2': { file: 'speaking-practice', cat: 'comm' },
  'Kaigo-Bahasa': { file: 'speaking-practice', cat: 'comm' },
  'Kaigo-Kosakata-Klinik': { file: 'speaking-practice', cat: 'comm' },
  'Kaigo-Kazoku-Shien': { file: 'communication', cat: 'comm' },
  'Kaigo-Mental-Health': { file: 'mental-health', cat: 'comm' },

  // Social & Law (Blue)
  'Kaigo-Hukum': { file: 'legal-ethics', cat: 'social' },
  'Kaigo-Hukum-Lanjut': { file: 'legal-ethics', cat: 'social' },
  'Kaigo-Shakai-Hosho': { file: 'social-welfare', cat: 'social' },
  'Kaigo-Chiiki-Shakai': { file: 'social-welfare', cat: 'social' },
  'Kaigo-Shogaisha-Shien': { file: 'social-welfare', cat: 'social' },
  'Kaigo-Jinken-Fukushi': { file: 'legal-ethics', cat: 'social' },
  'Kaigo-Kojin-Joho': { file: 'legal-ethics', cat: 'social' },
  'Kaigo-Bunka': { file: 'social-welfare', cat: 'social' },
  'Kaigo-Baisutikku': { file: 'social-welfare', cat: 'social' },
  'Kaigo-Shokuba-Bunka': { file: 'social-welfare', cat: 'social' },
  'Kaigo-Dokumentasi': { file: 'documentation', cat: 'social' },
  'Kaigo-Rekod': { file: 'documentation', cat: 'social' },
  'Kaigo-Rekod-Lanjut': { file: 'documentation', cat: 'social' },
  'Kaigo-Mensetsu-Taisaku': { file: 'speaking-practice', cat: 'comm' },
  'Kaigo-Kaigo-Rinri': { file: 'legal-ethics', cat: 'social' },
  'Kaigo-Ningen-Kankei': { file: 'communication', cat: 'comm' },
  'Kaigo-Ningen-Songen': { file: 'legal-ethics', cat: 'social' },
  'Kaigo-Kaigo-Katei': { file: 'care-process', cat: 'care' },
  'Kaigo-Kaigo-Hoken-Detail': { file: 'social-welfare', cat: 'social' },

  // Dementia (Purple)
  'Kaigo-Alzheimer': { file: 'dementia-care', cat: 'comm' },
  'Kaigo-Alzheimer-Lanjut': { file: 'dementia-care', cat: 'comm' },
  'Kaigo-Demensia': { file: 'dementia-care', cat: 'comm' },

  // Exam (Cyan)
  'Kaigo-Ujian-Kihon': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Kaigo-Katei': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Ninchisho': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Kokoro-Karada': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Shogai': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Ningen-Kankei': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Seikatsu-Shien': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Hattatsu-Roka': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Iryo-Care': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Comm-Gijutsu': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Shakai': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Songen': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Sogo-Mondai': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-Nasional': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-N5': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Nihongo-N4': { file: 'exam-prep', cat: 'exam' },
  'Kaigo-Ujian-N2': { file: 'exam-prep', cat: 'exam' },
};

let updated = 0;
let skipped = 0;
let notFound = 0;

const files = fs.readdirSync(DIR).filter(f => f.startsWith('Kaigo-') && f.endsWith('.html'));

for (const file of files) {
  const moduleName = file.replace('.html', '');
  const filePath = path.join(DIR, file);
  let html = fs.readFileSync(filePath, 'utf8');
  
  const mapping = MODULE_MAP[moduleName];
  if (!mapping) {
    console.log(`⚠️  No mapping: ${moduleName}`);
    notFound++;
    continue;
  }
  
  // Find the km-illustration div with inline SVG
  const illuRegex = /<div[^>]*class="[^"]*km-illustration[^"]*"[^>]*>\s*<svg[\s\S]*?<\/svg>\s*<\/div>/;
  const match = html.match(illuRegex);
  
  if (!match) {
    // Check if it already has an img tag
    if (html.includes('../assets/illustrations/') || html.includes('assets/illustrations/')) {
      skipped++;
      continue;
    }
    console.log(`⚠️  No illustration found: ${moduleName}`);
    notFound++;
    continue;
  }
  
  // Get alt text from the div's aria-label
  const ariaMatch = match[0].match(/aria-label="([^"]*)"/);
  const altText = ariaMatch ? ariaMatch[1] : `Ilustrasi ${moduleName.replace('Kaigo-', '')}`;
  
  // Category class
  const catClass = `illu-${mapping.cat}`;
  
  // New illustration HTML
  const newIllu = `<div class="km-illustration ${catClass}" role="img" aria-label="${altText}">
<img src="../assets/illustrations/${mapping.file}.svg" alt="${altText}" loading="lazy" width="600" height="350">
</div>`;
  
  // Replace
  html = html.replace(illuRegex, newIllu);
  fs.writeFileSync(filePath, html, 'utf8');
  updated++;
  console.log(`✅ ${moduleName} → ${mapping.file}.svg (${mapping.cat})`);
}

console.log(`\n📊 Results:`);
console.log(`   Updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Not found: ${notFound}`);
console.log(`   Total: ${files.length}`);
