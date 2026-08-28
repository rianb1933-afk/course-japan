#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get files without <main> tag
const files = execSync(
  'grep -rL "<main" Materi/*.html',
  { cwd: path.resolve(__dirname, '..'), encoding: 'utf-8' }
).trim().split('\n').filter(Boolean);

let fixed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  // Find <section id="main-content" or <div id="main-content" and replace with <main id="main-content"
  const openRegex = /<(section|div)(\s+id="main-content"[^>]*)>/;
  const openMatch = content.match(openRegex);
  if (openMatch) {
    const tag = openMatch[1]; // 'section' or 'div'
    const attrs = openMatch[2]; // everything after tag name
    const newOpen = `<main${attrs}>`;
    content = content.replace(openRegex, newOpen);

    // Now we need to find the matching closing tag
    // Strategy: count nesting depth from the opening <main> to find the matching </tag>
    const mainIdx = content.indexOf('<main id="main-content"');
    if (mainIdx === -1) {
      console.error(`WARN: Could not find <main> after edit in ${file}`);
      continue;
    }

    // Find the position right after the opening tag
    const afterOpen = content.indexOf('>', mainIdx) + 1;

    // Count nesting from afterOpen to find matching closing tag
    let depth = 1;
    let pos = afterOpen;
    let closeTag = `</${tag}>`;
    let openTagRegex = new RegExp(`<${tag}[\\s>]|<${tag}>`, 'g');
    let closeTagRegex = new RegExp(`</${tag}>`, 'g');

    while (depth > 0 && pos < content.length) {
      // Find next open or close of this tag type
      openTagRegex.lastIndex = pos;
      closeTagRegex.lastIndex = pos;
      const nextOpen = openTagRegex.exec(content);
      const nextClose = closeTagRegex.exec(content);

      if (!nextClose) {
        console.error(`WARN: Unclosed ${tag} in ${file}`);
        break;
      }

      if (nextOpen && nextOpen.index < nextClose.index) {
        depth++;
        pos = nextOpen.index + nextOpen[0].length;
      } else {
        depth--;
        if (depth === 0) {
          // Replace this closing tag with </main>
          const closeStart = nextClose.index;
          const closeEnd = closeStart + closeTag.length;
          content = content.substring(0, closeStart) + '</main>' + content.substring(closeEnd);
          changed = true;
        } else {
          pos = nextClose.index + nextClose[0].length;
        }
      }
    }

    // Also ensure id="main-content" is on the <main> tag (already there from the replacement)
  } else {
    console.error(`WARN: No main-content element found in ${file}`);
    continue;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`✅ Fixed: ${file}`);
    fixed++;
  }
}

console.log(`\nDone! Fixed ${fixed}/${files.length} files`);
