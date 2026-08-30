#!/usr/bin/env node
/**
 * Remove inline <style> blocks from Kaigo modules.
 * All styles should be in kaigo-module.css now.
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'Materi');

const files = fs.readdirSync(DIR).filter(f => f.startsWith('Kaigo-') && f.endsWith('.html'));

let removed = 0;
let skipped = 0;

for (const file of files) {
  const filePath = path.join(DIR, file);
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has inline style tags
  if (!html.includes('<style')) {
    skipped++;
    continue;
  }
  
  // Remove all <style>...</style> blocks
  const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  const newHtml = html.replace(styleRegex, '');
  
  if (newHtml !== html) {
    fs.writeFileSync(filePath, newHtml, 'utf8');
    removed++;
    console.log(`✅ Removed inline styles: ${file}`);
  } else {
    skipped++;
  }
}

console.log(`\n📊 Results:`);
console.log(`   Removed: ${removed}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Total: ${files.length}`);
