#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.resolve(__dirname, '../Materi');
const files = fs.readdirSync(MATERI_DIR).filter(f => f.endsWith('.html'));
let updated = 0;

for (const file of files) {
  const filePath = path.join(MATERI_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Remove ALL <style>...</style> blocks (greedy, non-overlapping)
  while (content.includes('<style>')) {
    content = content.replace(/<style>[\s\S]*?<\/style>/, '\n');
  }

  // Also remove <style type='text/css'>...</style> blocks
  while (content.includes("<style type='text/css'>")) {
    content = content.replace(/<style type=['"]text\/css['"]>[\s\S]*?<\/style>/g, '\n');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${file}`);
    updated++;
  }
}

console.log(`\nDone! Removed remaining inline styles from ${updated} files`);
