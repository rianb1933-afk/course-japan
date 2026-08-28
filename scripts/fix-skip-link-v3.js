#!/usr/bin/env node
/**
 * Fix skip-link placement v3: nuclear approach.
 * Remove ALL skip-link elements from every file, then add them properly.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const files = fs.readdirSync(MATERI_DIR)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(MATERI_DIR, f));

let fixedCount = 0;

const SKIP_LINK = '<a href="#main-content" class="skip-to-content">Langsung ke konten</a>';

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Remove ALL skip-link elements (with or without surrounding comments)
  const before = content;
  // Remove skip-link that might be inside comments or standalone
  content = content.replace(/<a href="#main-content" class="skip-to-content">[^<]*<\/a>/g, '');
  // Also remove any orphaned comment fragments that contained the skip-link
  content = content.replace(/<!--[^>]*elemen target[^>]*-->/g, '');
  content = content.replace(/<!--[^>]*skip[^>]*-->/g, '');
  // Clean up empty lines left behind
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  if (content !== before) changed = true;

  // 2. Add skip-link after <body> (first occurrence)
  if (!content.includes('skip-to-content')) {
    if (content.includes('</head><body>')) {
      content = content.replace('</head><body>', '</head><body>\n' + SKIP_LINK);
      changed = true;
    } else if (content.includes('<body>')) {
      content = content.replace('<body>', '<body>\n' + SKIP_LINK);
      changed = true;
    }
  }

  // 3. Add id="main-content" to first <main> or <section> after <body>
  if (content.includes('skip-to-content') && !content.includes('id="main-content"')) {
    const bodyIdx = content.indexOf('<body');
    if (bodyIdx !== -1) {
      const afterBody = content.substring(bodyIdx);
      // Try <main> first
      const mainMatch = afterBody.match(/<main(?!\s+id=)[^>]*>/);
      if (mainMatch) {
        const insertIdx = bodyIdx + mainMatch.index;
        const original = mainMatch[0];
        const fixed = original.replace(/<main/, '<main id="main-content"');
        content = content.substring(0, insertIdx) + fixed + content.substring(insertIdx + original.length);
        changed = true;
      } else {
        // Try first <section>
        const secMatch = afterBody.match(/<section(?!\s+id=)[^>]*>/);
        if (secMatch) {
          const insertIdx = bodyIdx + secMatch.index;
          const original = secMatch[0];
          const fixed = original.replace(/<section/, '<section id="main-content"');
          content = content.substring(0, insertIdx) + fixed + content.substring(insertIdx + original.length);
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
