#!/usr/bin/env node
/**
 * Fix skip-link placement v2: more robust handling.
 * Removes skip-link from anywhere in the file and adds it after <body>.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const files = fs.readdirSync(MATERI_DIR)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(MATERI_DIR, f));

let fixedCount = 0;

// Match skip-link with any surrounding content (comments, whitespace)
const SKIP_LINK_PATTERNS = [
  /<!--[^>]*-->\s*<a href="#main-content" class="skip-to-content"[^>]*>[^<]*<\/a>\s*/g,
  /<a href="#main-content" class="skip-to-content"[^>]*>[^<]*<\/a>\s*/g,
  /<!--[^>]*-->\s*<a href="#main-content" class="skip-to-content"[^>]*>[^<]*<\/a>\s*<!--[^>]*-->\s*/g,
];

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  let changed = false;

  // 1. Remove ALL skip-link occurrences (there should only be one)
  for (const pattern of SKIP_LINK_PATTERNS) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      changed = true;
    }
  }

  // 2. Check if skip-link is still present somewhere before <body>
  const bodyIdx = content.indexOf('<body');
  const skipIdx = content.indexOf('skip-to-content');
  if (skipIdx !== -1 && bodyIdx !== -1 && skipIdx < bodyIdx) {
    // Skip-link is before <body>, remove it
    const beforeBody = content.substring(0, bodyIdx);
    const afterBody = content.substring(bodyIdx);
    const fixedBefore = beforeBody.replace(/<a href="#main-content" class="skip-to-content"[^>]*>[^<]*<\/a>/g, '');
    content = fixedBefore + afterBody;
    changed = true;
  }

  // 3. Add skip-link after <body> if not present
  if (!content.includes('skip-to-content')) {
    const skipLink = '<a href="#main-content" class="skip-to-content">Langsung ke konten</a>';
    if (content.includes('</head><body>')) {
      content = content.replace('</head><body>', '</head><body>\n' + skipLink);
      changed = true;
    } else if (content.includes('<body>')) {
      content = content.replace('<body>', '<body>\n' + skipLink);
      changed = true;
    }
  }

  // 4. Add id="main-content" to <main> or first <section> if missing
  if (content.includes('skip-to-content') && !content.includes('id="main-content"')) {
    if (content.includes('<main')) {
      content = content.replace(/<main(?!\s+id=)/, '<main id="main-content"');
      changed = true;
    } else {
      // Find first <section> after <body> and add id
      const bodyIdx2 = content.indexOf('<body');
      if (bodyIdx2 !== -1) {
        const afterBody2 = content.substring(bodyIdx2);
        const sectionMatch = afterBody2.match(/<section(?!\s+id=)/);
        if (sectionMatch) {
          const insertIdx = bodyIdx2 + sectionMatch.index;
          content = content.substring(0, insertIdx) + '<section id="main-content"' + content.substring(insertIdx + '<section'.length);
          changed = true;
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
  }
}

console.log(`Fixed: ${fixedCount} files`);
