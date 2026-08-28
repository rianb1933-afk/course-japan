#!/usr/bin/env node
/**
 * Add dark mode toggle to Materi pages that lack it.
 * Adds kyoto-theme.js (which wires up .theme-toggle buttons) and
 * a floating toggle button to each page.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const files = fs.readdirSync(MATERI_DIR)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(MATERI_DIR, f));

let updatedCount = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  let changed = false;

  // 1. Add kyoto-theme.js if missing
  if (!content.includes('kyoto-theme.js')) {
    // Insert after dark-mode-toggle.js or after env.js
    if (content.includes('dark-mode-toggle.js')) {
      content = content.replace(
        /(<script src="[^"]*dark-mode-toggle\.js"><\/script>)/,
        '$1\n<script src="../assets/kyoto-theme.js" defer></script>'
      );
      changed = true;
    } else if (content.includes('../assets/env.js')) {
      content = content.replace(
        /(<script src="[^"]*env\.js"[^>]*><\/script>)/,
        '$1\n<script src="../assets/kyoto-theme.js" defer></script>'
      );
      changed = true;
    }
  }

  // 2. Add toggle button if missing
  if (!content.includes('theme-toggle') && !content.includes('data-theme-toggle') && !content.includes('Ganti tema')) {
    // Add a floating toggle button before </body>
    const toggleBtn = '\n<button aria-label="Ganti tema" class="theme-toggle" onclick="toggleTheme()" style="position:fixed;top:12px;right:12px;z-index:9999;background:var(--white,#fff);border:1px solid var(--border-mid,#ddd);border-radius:50%;width:40px;height:40px;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center">🌙</button>\n';

    if (content.includes('</body>')) {
      content = content.replace('</body>', toggleBtn + '</body>');
      changed = true;
    }
  }

  // 3. Add skip-to-content link if missing (accessibility)
  if (!content.includes('skip-to-content') && !content.includes('Lewati ke konten') && !content.includes('Langsung ke konten')) {
    if (content.includes('<body>')) {
      content = content.replace(
        /<body([^>]*)>/,
        '<body$1>\n<a href="#main-content" class="skip-to-content" style="position:absolute;top:-100%;left:1rem;z-index:9999;background:var(--red,#be3428);color:#fff;padding:.5rem 1rem;border-radius:0 0 8px 8px;font-weight:700;font-size:14px;text-decoration:none;transition:top .2s">Langsung ke konten</a>'
      );
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log(`✓ ${fileName}`);
  }
}

console.log(`\nDone. Updated: ${updatedCount} files`);
