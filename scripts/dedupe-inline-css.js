#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.resolve(__dirname, '../Materi');
const files = fs.readdirSync(MATERI_DIR).filter(f => f.endsWith('.html'));
let updated = 0, skipped = 0;

for (const file of files) {
  const filePath = path.join(MATERI_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Check if there's a <style> block
  if (!content.includes('<style>')) {
    skipped++;
    continue;
  }

  // Remove the <style>...</style> block
  const styleRegex = /<style>[\s\S]*?<\/style>/;
  if (styleRegex.test(content)) {
    content = content.replace(styleRegex, '');
    changed = true;
  }

  // Determine which shared CSS to link
  const isKaigo = file.startsWith('Kaigo-');
  const isKanji = file.startsWith('Kanji-');
  const isGrammar = file.startsWith('Grammar-');
  const isKaiwa = file.startsWith('Kaiwa-');

  // Check if kaigo-module.css is already linked
  const hasKaigoCSS = content.includes('kaigo-module.css');
  const hasKanjiCSS = content.includes('kanji-module.css');
  const hasGrammarCSS = content.includes('grammar-module.css');

  // Add kaigo-module.css if missing and not Kanji
  if (!hasKaigoCSS && !hasKanjiCSS) {
    // Find the first <link rel="stylesheet"> to insert after
    const firstLink = content.indexOf('<link rel="stylesheet"');
    if (firstLink !== -1) {
      const insertPos = content.indexOf('>', firstLink) + 1;
      content = content.substring(0, insertPos) + '\n<link rel="stylesheet" href="../assets/kaigo-module.css">' + content.substring(insertPos);
      changed = true;
    }
  }

  // Add kanji-module.css for Kanji pages if missing
  if (isKanji && !hasKanjiCSS) {
    const firstLink = content.indexOf('<link rel="stylesheet"');
    if (firstLink !== -1) {
      const insertPos = content.indexOf('>', firstLink) + 1;
      content = content.substring(0, insertPos) + '\n<link rel="stylesheet" href="../assets/kanji-module.css">' + content.substring(insertPos);
      changed = true;
    }
  }

  // For Grammar pages that already have grammar-module.css, don't add kaigo-module.css
  if (isGrammar && hasGrammarCSS && content.includes('kaigo-module.css')) {
    // Remove the kaigo-module.css link we just added
    content = content.replace(/\n<link rel="stylesheet" href="[^"]*kaigo-module\.css">/, '');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${file}`);
    updated++;
  } else {
    console.log(`⏭️  ${file} (no changes needed)`);
    skipped++;
  }
}

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}, Total: ${files.length}`);
