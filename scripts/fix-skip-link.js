#!/usr/bin/env node
/**
 * Fix skip-link placement in Materi pages.
 * The skip-link was incorrectly placed inside <head> due to </head><body> on same line.
 * This script moves it to after <body> and adds id="main-content" to the main content element.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const files = fs.readdirSync(MATERI_DIR)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(MATERI_DIR, f));

let fixedCount = 0;

// The skip-link HTML to find and remove
const SKIP_LINK_REGEX = /<a href="#main-content" class="skip-to-content"[^>]*>Langsung ke konten<\/a>[^<]*(?:<!--[^>]*-->)?/;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  let changed = false;

  // 1. Remove incorrectly placed skip-link (in <head> or before <body>)
  if (SKIP_LINK_REGEX.test(content)) {
    content = content.replace(SKIP_LINK_REGEX, '');
    changed = true;
  }

  // 2. Also handle the version with "Lewati ke konten utama"
  const SKIP_LINK_REGEX2 = /<a href="#main-content" class="skip-to-content"[^>]*>Lewati ke konten utama<\/a>/;
  if (SKIP_LINK_REGEX2.test(content)) {
    content = content.replace(SKIP_LINK_REGEX2, '');
    changed = true;
  }

  // 3. Add skip-link after <body> (before the first element inside body)
  if (!content.includes('skip-to-content')) {
    const skipLink = '<a href="#main-content" class="skip-to-content">Langsung ke konten</a>';
    // Find <body> and add skip-link right after it
    if (content.includes('</head><body>')) {
      content = content.replace('</head><body>', '</head><body>\n' + skipLink);
      changed = true;
    } else if (content.includes('<body>')) {
      content = content.replace('<body>', '<body>\n' + skipLink);
      changed = true;
    }
  }

  // 4. Add id="main-content" to <main> element if missing
  if (content.includes('skip-to-content') && !content.includes('id="main-content"')) {
    // Try to find <main> or <section> that serves as main content
    if (content.includes('<main')) {
      content = content.replace(/<main(?!\s+id=)/, '<main id="main-content"');
      changed = true;
    } else if (content.includes('class="hero"')) {
      // Some pages use section.hero as main content
      content = content.replace(/<section class="hero"/, '<section id="main-content" class="hero"');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
  }
}

console.log(`Fixed: ${fixedCount} files`);
