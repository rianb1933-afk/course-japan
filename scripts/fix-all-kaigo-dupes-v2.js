#!/usr/bin/env node
/**
 * Surgical removal of duplicate quiz sections from Kaigo pages.
 * Only targets QX/QKZ/QA/QB — NEVER touches the main QUIZ array.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// Find all files with duplicate quiz arrays
const files = execSync('grep -rl "var QX\\|var QKZ" Materi/Kaigo-*.html', { cwd: ROOT, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

console.log(`Found ${files.length} files with duplicate quizzes\n`);

for (const relPath of files) {
  const fpath = path.join(ROOT, relPath);
  const fname = path.basename(relPath);
  let html = fs.readFileSync(fpath, 'utf8');
  const origLen = html.length;
  
  // Step 1: Remove var QX=[...],qiX=0,okX=0,totX=0;  (single-line)
  // and var QKZ=[...],qiZ=0,okZ=0,totZ=0;
  for (const pattern of [
    /var QX=\[[^\]]*\][^\n]*qiX=\d+,okX=\d+,totX=\d+;\n?/g,
    /var QKZ=\[[^\]]*\][^\n]*qiZ=\d+,okZ=\d+,totZ=\d+;\n?/g,
    /var QA=\[[^\]]*\][^\n]*qiA=\d+,okA=\d+,totA=\d+;\n?/g,
  ]) {
    html = html.replace(pattern, '');
  }
  
  // Step 2: Remove rndX/rndZ/rndA functions (single-line or multi-line)
  for (const fn of ['rndX', 'rndZ', 'rndA', 'ansX', 'ansZ', 'ansA', 'nQX', 'nQZ', 'nQA', 'rQX', 'rQZ', 'rQA']) {
    // Single-line: function rndX(){...}
    const singleLine = new RegExp(`function ${fn}\\([^)]*\\)\\{[^}]*\\}\\n?`, 'g');
    html = html.replace(singleLine, '');
  }
  
  // Step 3: Remove duplicate quiz DOM sections
  // Target: sections containing id="qcX" or id="qcZ" or id="qcA"
  // These are <section> blocks. Find them by looking for the pattern.
  for (const suffix of ['X', 'Z', 'A']) {
    // Pattern: <section...>...<h2>🧠 Quiz</h2>...<div id="qcX">...</div>...buttons...<p id="qsX">...</p>...</section>
    // Or: <section...>...<h2>🧠 Latihan Soal</h2>...<div id="qcX">...</div>...buttons...<p id="qsX">...</p>...</section>
    const sectionRegex = new RegExp(
      `<section[^>]*>\\s*(?:<h2[^>]*>🧠\\s*(?:Quiz|Latihan[^<]*)</h2>\\s*)?` +
      `<div[^>]*id="qc${suffix}"[^>]*>[\\s\\S]*?</div>` +
      `(?:\\s*<div[^>]*>[\\s\\S]*?</div>\\s*)?` +
      `(?:\\s*<p[^>]*id="qs${suffix}"[^>]*>[\\s\\S]*?</p>\\s*)?` +
      `</section>`,
      'g'
    );
    html = html.replace(sectionRegex, '');
    
    // Also handle standalone divs (not wrapped in section)
    const divRegex = new RegExp(
      `<h2[^>]*>🧠\\s*(?:Quiz|Latihan[^<]*)</h2>\\s*` +
      `<div[^>]*id="qc${suffix}"[^>]*>[\\s\\S]*?</div>` +
      `(?:\\s*<div[^>]*>[\\s\\S]*?</div>\\s*)?` +
      `(?:\\s*<p[^>]*id="qs${suffix}"[^>]*>[\\s\\S]*?</p>\\s*)?`,
      'g'
    );
    html = html.replace(divRegex, '');
  }
  
  // Step 4: Remove rndX() calls
  html = html.replace(/\brndX\(\);?\s*\n?/g, '');
  html = html.replace(/\brndZ\(\);?\s*\n?/g, '');
  html = html.replace(/\brndA\(\);?\s*\n?/g, '');
  
  // Step 5: Strip inline styles
  const styleCount = (html.match(/style="/g) || []).length;
  html = html.replace(/ style="[^"]*"/g, '');
  
  // Step 6: Clean up
  html = html.replace(/<script>\s*<\/script>/g, '');
  html = html.replace(/\n{3,}/g, '\n\n');
  
  // Verify: QUIZ array must still exist
  if (!html.includes('var QUIZ=[')) {
    console.log(`  ❌ FATAL: ${fname} lost QUIZ array! Restoring...`);
    fs.writeFileSync(fpath, fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
    continue;
  }
  
  const diff = origLen - html.length;
  fs.writeFileSync(fpath, html, 'utf8');
  console.log(`  ✓ ${fname} (-${diff} bytes, -${styleCount} inline styles)`);
}

console.log('\nDone!');
