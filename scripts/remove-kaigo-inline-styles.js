/**
 * remove-kaigo-inline-styles.js
 * Removes inline <style> blocks from Kaigo pages that duplicate kaigo-module.css
 * and ensures each page links to kaigo-module.css
 */
const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const CSS_LINK = '<link rel="stylesheet" href="../assets/kaigo-module.css">';

// Pages that have inline <style> blocks
const kaigoFiles = fs.readdirSync(MATERI_DIR)
  .filter(f => f.startsWith('Kaigo-') && f.endsWith('.html'))
  .map(f => path.join(MATERI_DIR, f));

let updated = 0;
let skipped = 0;

for (const filePath of kaigoFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it has inline <style>
  if (!content.includes('<style>')) {
    skipped++;
    continue;
  }
  
  const original = content;
  
  // Remove all <style>...</style> blocks
  content = content.replace(/<style>[\s\S]*?<\/style>/g, '');
  
  // Ensure kaigo-module.css is linked
  if (!content.includes('kaigo-module.css')) {
    // Add after the last CSS link
    const lastCssIdx = content.lastIndexOf('<link rel="stylesheet"');
    if (lastCssIdx !== -1) {
      const endOfLine = content.indexOf('>', lastCssIdx) + 1;
      content = content.slice(0, endOfLine) + '\n' + CSS_LINK + content.slice(endOfLine);
    } else {
      // Add before </head>
      content = content.replace('</head>', CSS_LINK + '\n</head>');
    }
  }
  
  // Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
    console.log(`✅ ${path.basename(filePath)} — inline styles removed`);
  } else {
    skipped++;
  }
}

console.log(`\n📊 Summary: ${updated} files updated, ${skipped} skipped (no inline styles)`);
