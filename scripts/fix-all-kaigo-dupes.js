#!/usr/bin/env node
/**
 * Remove duplicate quiz sections from ALL Kaigo pages.
 * Keep original QUIZ array + renderQ function intact.
 * Only remove: var QX/QKZ declarations, rndX/rndZ functions, duplicate DOM sections.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MATTERI = path.join(ROOT, 'Materi');

// Find all Kaigo files with duplicate quiz arrays
const files = execSync('grep -l "var QX\\|var QKZ" Materi/Kaigo-*.html', { cwd: ROOT, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

console.log(`Found ${files.length} files with duplicate quizzes\n`);

let totalFixed = 0;
let totalStyles = 0;

for (const relPath of files) {
  const fpath = path.join(ROOT, relPath);
  const fname = path.basename(relPath);
  let html = fs.readFileSync(fpath, 'utf8');
  const origLen = html.length;
  let changed = false;
  
  // Remove duplicate quiz DOM sections
  for (const suffix of ['X', 'Z']) {
    const pattern = new RegExp(`<section[^>]*>\\s*(?:<h2[^>]*>🧠\\s*(?:Quiz|Latihan)[^<]*</h2>\\s*)?<div[^>]*id="qc${suffix}"[^>]*>[\\s\\S]*?</div>\\s*(?:<div[^>]*style="[^"]*display:\\s*flex[^"]*"[\\s\\S]*?</div>\\s*)?(?:<p[^>]*id="qs${suffix}"[^>]*>[\\s\\S]*?</p>\\s*)?</section>`, 'g');
    if (pattern.test(html)) {
      html = html.replace(pattern, '');
      changed = true;
    }
  }
  
  // Remove duplicate quiz variable declarations
  for (const name of ['QX', 'QKZ', 'QA', 'QB']) {
    const suffix = name.replace('Q', '');
    const varStart = html.indexOf(`var ${name}=[`);
    if (varStart === -1) continue;
    
    // Find the end by looking for the state vars pattern
    const statePattern = new RegExp(`,t(?:qi|ot|ok)${suffix}=\\d+;`);
    const searchArea = html.substring(varStart, varStart + 50000);
    const stateMatch = searchArea.match(statePattern);
    if (stateMatch) {
      const stateEnd = varStart + stateMatch.index + stateMatch[0].length;
      html = html.substring(0, varStart) + html.substring(stateEnd);
      changed = true;
    }
  }
  
  // Remove duplicate render functions
  for (const suffix of ['X', 'Z', 'A', 'B']) {
    const funcNames = [`rnd${suffix}`, `ans${suffix}`, `nQ${suffix}`, `rQ${suffix}`];
    
    for (const fn of funcNames) {
      const fnIdx = html.indexOf(`function ${fn}(`);
      if (fnIdx === -1) continue;
      
      const braceIdx = html.indexOf('{', fnIdx);
      if (braceIdx === -1 || braceIdx > fnIdx + 50) continue;
      
      let depth = 0, inStr = false, strCh = '', fnEnd = -1;
      for (let i = braceIdx; i < Math.min(braceIdx + 50000, html.length); i++) {
        const ch = html[i];
        if (inStr) {
          if (ch === strCh && html[i-1] !== '\\') inStr = false;
        } else {
          if (ch === '"' || ch === "'") { inStr = true; strCh = ch; }
          else if (ch === '{') depth++;
          else if (ch === '}') { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
        }
      }
      
      if (fnEnd !== -1) {
        while (fnEnd < html.length && html[fnEnd] === '\n') fnEnd++;
        html = html.substring(0, fnIdx) + html.substring(fnEnd);
        changed = true;
      }
    }
    
    // Remove function calls
    html = html.replace(new RegExp(`\\b${funcNames[0]}\\(\\);?\\s*\\n?`, 'g'), (m) => { changed = true; return ''; });
    html = html.replace(new RegExp(`\\b${funcNames[2]}\\(\\);?\\s*\\n?`, 'g'), (m) => { changed = true; return ''; });
    html = html.replace(new RegExp(`\\b${funcNames[3]}\\(\\);?\\s*\\n?`, 'g'), (m) => { changed = true; return ''; });
  }
  
  // Remove orphaned score elements
  html = html.replace(/<p[^>]*id="qs[AXZ]"[^>]*>[^<]*<\/p>/g, '');
  
  // Strip inline styles
  const styleCount = (html.match(/style="/g) || []).length;
  if (styleCount > 0) {
    html = html.replace(/ style="[^"]*"/g, '');
    totalStyles += styleCount;
    changed = true;
  }
  
  // Clean up empty scripts and blank lines
  html = html.replace(/<script>\s*<\/script>/g, '');
  html = html.replace(/<script>\s*\n\s*<\/script>/g, '');
  html = html.replace(/\n{3,}/g, '\n\n');
  
  if (changed) {
    fs.writeFileSync(fpath, html, 'utf8');
    const diff = origLen - html.length;
    totalFixed++;
    if (diff > 0) console.log(`  ✓ ${fname} (-${diff} bytes)`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${totalFixed} files`);
console.log(`Stripped: ${totalStyles} inline style attributes`);
