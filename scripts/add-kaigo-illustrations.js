#!/usr/bin/env node
/**
 * Add SVG illustrations to Kaigo modules.
 * Maps each module to its illustration and inserts it after the chapter header.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MATTERI = path.join(ROOT, 'Materi');
const ILLUSTRATIONS = path.join(ROOT, 'assets', 'illustrations');

// Map module filenames to their illustrations
const MODULE_ILLUSTRATIONS = {
  'Kaigo-CPR.html': 'cpr-hero.svg',
  'Kaigo-AED.html': 'aed-diagram.svg',
  'Kaigo-Vital-Sign.html': 'vital-signs.svg',
  'Kaigo-Rehabilitasi.html': 'rehabilitation.svg',
  'Kaigo-Infection-Control.html': 'infection-control.svg',
  'Kaigo-Alzheimer.html': 'dementia-care.svg',
  'Kaigo-Alzheimer-Lanjut.html': 'dementia-care.svg',
  'Kaigo-Demensia.html': 'dementia-care.svg',
  'Kaigo-Dementia-Communication.html': 'dementia-care.svg',
  'Kaigo-Kasai-Hinan.html': 'fire-safety.svg',
  'Kaigo-Fukuyaku.html': 'medication.svg',
  'Kaigo-Kurumaisu.html': 'wheelchair.svg',
  'Kaigo-Jishin-Saigai.html': 'earthquake.svg',
  'Kaigo-Terminal-Care.html': 'terminal-care.svg',
  'Kaigo-ADL-Guide.html': 'adl-diagram.svg',
  'Kaigo-Hoko-Kaijo.html': 'rehabilitation.svg',
};

// CSS class for illustration
const ILLUSTRATION_CSS = `
.km-illustration {
  display: block;
  max-width: 400px;
  width: 100%;
  height: auto;
  margin: 0 auto 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
@media (prefers-color-scheme: dark) {
  .km-illustration { box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
}
`;

let added = 0;

for (const [filename, svgFile] of Object.entries(MODULE_ILLUSTRATIONS)) {
  const fpath = path.join(MATTERI, filename);
  if (!fs.existsSync(fpath)) continue;
  
  const svgPath = path.join(ILLUSTRATIONS, svgFile);
  if (!fs.existsSync(svgPath)) {
    console.log(`  SKIP: ${svgFile} not found`);
    continue;
  }
  
  let html = fs.readFileSync(fpath, 'utf8');
  
  // Skip if already has illustration
  if (html.includes('km-illustration')) continue;
  
  // Read SVG content
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  
  // Create the illustration element
  const illustration = `\n<div class="km-illustration" role="img" aria-label="Ilustrasi ${filename.replace('.html','').replace('Kaigo-','')}">\n${svgContent}\n</div>\n`;
  
  // Strategy 1: Insert after chapter header (ch-title) if using book-style template
  if (html.includes('class="ch"')) {
    html = html.replace('</header>', `</header>\n${illustration}`);
  }
  // Strategy 2: Insert after page-hero
  else if (html.includes('class="page-hero"')) {
    html = html.replace('</div>\n<div class="wrap"', `</div>\n${illustration}<div class="wrap"`);
  }
  // Strategy 3: Insert after <main> tag
  else {
    html = html.replace('<main', `<main`);
    const mainIdx = html.indexOf('<main');
    if (mainIdx !== -1) {
      const closeTag = html.indexOf('>', mainIdx) + 1;
      html = html.substring(0, closeTag) + illustration + html.substring(closeTag);
    }
  }
  
  // Add CSS if not already present
  if (!html.includes('km-illustration')) {
    html = html.replace('</head>', `<style>${ILLUSTRATION_CSS}</style>\n</head>`);
  }
  
  // Add the CSS class reference
  if (!html.includes('km-illustration') && html.includes('.km-illustration')) {
    // CSS was already added above
  }
  
  fs.writeFileSync(fpath, html, 'utf8');
  added++;
  console.log(`  ✓ ${filename} → ${svgFile}`);
}

console.log(`\nAdded illustrations to ${added} files`);
