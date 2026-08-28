#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const grammarFiles = ['Grammar-N1.html', 'Grammar-N2.html', 'Grammar-N3.html', 'Grammar-N4.html', 'Grammar-N5.html'];

let updatedCount = 0;

for (const fname of grammarFiles) {
  const filePath = path.join(MATERI_DIR, fname);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Add grammar-module.css link (after kyoto-bundle.min.css)
  if (!content.includes('grammar-module.css')) {
    if (content.includes('kyoto-bundle.min.css')) {
      content = content.replace(
        /(<link rel="stylesheet" href="[^"]*kyoto-elevation\.css">)/,
        '$1\n<link rel="stylesheet" href="../assets/grammar-module.css">'
      );
      changed = true;
    }
  }

  // 2. Remove the inline <style> block that contains .g-card
  const styleRegex = /<style>\s*\*,\*::before,\*::after\{box-sizing:border-box[\s\S]*?<\/style>/;
  if (styleRegex.test(content)) {
    content = content.replace(styleRegex, '');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log('Updated: ' + fname);
  } else {
    console.log('No changes: ' + fname);
  }
}

console.log('\nDone. Updated: ' + updatedCount + ' files');
