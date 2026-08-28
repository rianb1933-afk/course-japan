#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Get the Grammar N5 CSS (most complete)
const c = fs.readFileSync(path.join(__dirname, '..', 'Materi', 'Grammar-N5.html'), 'utf8');
const styleMatch = c.match(/<style>([\s\S]*?)<\/style>/);
const css = styleMatch[1];

// Add dark mode support
const darkModeCss = [
  '/* Dark Mode */',
  '[data-theme="dark"] .page{background:var(--kyoto-dark-surface,#1a1a2e)}',
  '[data-theme="dark"] .g-card,[data-theme="dark"] .sec{background:#1e1e2e;border-color:#333}',
  '[data-theme="dark"] .g-head{border-color:#444}',
  '[data-theme="dark"] .search-box{background:#1e1e2e;border-color:#555;color:#ccc}',
  '[data-theme="dark"] .cat-btn{background:#2a2a3e;border-color:#555;color:#ccc}',
  '[data-theme="dark"] .cat-btn.active{background:var(--primary,#1565c0);color:#fff}',
  '[data-theme="dark"] .controls select{background:#1e1e2e;border-color:#555;color:#ccc}',
  '[data-theme="dark"] .jp-word{color:#90caf9;border-bottom-color:#90caf9}',
].join('\n');

const sharedCss = '/* Grammar Module Shared Styles — shared by Grammar-N1..N5 */\n' + css + '\n' + darkModeCss + '\n';
const outPath = path.join(__dirname, '..', 'assets', 'grammar-module.css');
fs.writeFileSync(outPath, sharedCss);
console.log('Created assets/grammar-module.css (' + sharedCss.length + ' chars)');
