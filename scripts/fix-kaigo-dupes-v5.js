#!/usr/bin/env node
/**
 * Surgically remove duplicate quiz sections from Kaigo pages.
 * Keep the original QUIZ array + renderQ function + DOM untouched.
 * Only remove: var QX/QKZ declarations, rndX/rndZ functions, duplicate DOM sections.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MATTERI = path.join(ROOT, 'Materi');

function removeRange(html, startPattern, endPattern, flags) {
  const startIdx = html.search(startPattern);
  if (startIdx === -1) return { html, removed: false };
  const endIdx = html.search(endPattern, startIdx + 1);
  if (endIdx === -1) return { html, removed: false };
  const removed = html.substring(startIdx, endIdx);
  html = html.substring(0, startIdx) + html.substring(endIdx);
  return { html, removed: true, len: removed.length };
}

function fixFile(fname) {
  const fpath = path.join(MATTERI, fname);
  let html = fs.readFileSync(fpath, 'utf8');
  const origLen = html.length;
  
  // Step 1: Remove duplicate quiz DOM sections
  // These are <section> blocks containing id="qcX" or id="qcZ"
  for (const suffix of ['X', 'Z']) {
    const pattern = new RegExp(`<section[^>]*id="qc${suffix}"[\\s\\S]*?</section>`);
    if (pattern.test(html)) {
      html = html.replace(pattern, '');
      console.log(`  Removed duplicate quiz DOM section (qc${suffix})`);
    }
    
    // Also remove the section wrapper that contains the quiz heading + container + buttons
    const sectionPattern = new RegExp(`<section[\\s\\S]*?id="qc${suffix}"[\\s\\S]*?</section>`, 'g');
    html = html.replace(sectionPattern, '');
    
    // Remove standalone sections with "🧠 Quiz" followed by qcX/qcZ
    const h2Pattern = new RegExp(`<h2[^>]*>🧠\\s*Quiz[^<]*</h2>\\s*<div[^>]*id="qc${suffix}"[^>]*>[\\s\\S]*?</div>\\s*(?:<div[^>]*style="[^"]*display:\\s*flex[^"]*"[\\s\\S]*?</div>\\s*)?(?:<p[^>]*id="qs${suffix}"[^>]*>[\\s\\S]*?</p>\\s*)?`, 'g');
    html = html.replace(h2Pattern, '');
    
    // Remove "Latihan Soal" sections
    const latihanPattern = new RegExp(`<h2[^>]*>🧠\\s*Latihan[^<]*</h2>\\s*<div[^>]*id="qc${suffix}"[^>]*>[\\s\\S]*?</div>\\s*(?:<div[^>]*style="[^"]*display:\\s*flex[^"]*"[\\s\\S]*?</div>\\s*)?(?:<p[^>]*id="qs${suffix}"[^>]*>[\\s\\S]*?</p>\\s*)?`, 'g');
    html = html.replace(latihanPattern, '');
  }
  
  // Step 2: Remove duplicate quiz variable declarations (var QX=[...], qiX=0, okX=0, totX=0;)
  // These are single-line declarations
  for (const name of ['QX', 'QKZ', 'QA', 'QB']) {
    // Match: var QX=[...],qiX=0,okX=0,totX=0;
    // The tricky part is the array content contains }], which could match prematurely
    // So we need to find the full declaration by looking for the pattern with state vars
    
    // Find "var QX=[" and then find "totX=0;" or similar after it
    const varStart = html.indexOf(`var ${name}=[`);
    if (varStart === -1) continue;
    
    // Find the end: look for the pattern like ],qiX=0 or ],totX=0
    const suffix = name.replace('Q', '');
    const statePattern = new RegExp(`,t(?:qi|ot|ok)${suffix}=\\d+;`);
    const stateMatch = html.substring(varStart).match(statePattern);
    if (stateMatch) {
      const stateEnd = varStart + stateMatch.index + stateMatch[0].length;
      const removed = html.substring(varStart, stateEnd);
      html = html.substring(0, varStart) + html.substring(stateEnd);
      console.log(`  Removed var ${name} declaration (${removed.length} chars)`);
    }
  }
  
  // Step 3: Remove duplicate render functions (rndX, rndZ, ansX, ansZ, nQX, rQX, etc.)
  for (const name of ['QX', 'QKZ', 'QA', 'QB']) {
    const suffix = name.replace('Q', '');
    const funcNames = [`rnd${suffix}`, `ans${suffix}`, `nQ${suffix}`, `rQ${suffix}`];
    
    for (const fn of funcNames) {
      // Find "function rndX(" and its body
      const fnIdx = html.indexOf(`function ${fn}(`);
      if (fnIdx === -1) continue;
      
      // Find the opening brace
      const braceIdx = html.indexOf('{', fnIdx);
      if (braceIdx === -1 || braceIdx > fnIdx + 50) continue;
      
      // Count braces to find the matching close
      let depth = 0;
      let inStr = false;
      let strCh = '';
      let fnEnd = -1;
      
      for (let i = braceIdx; i < Math.min(braceIdx + 50000, html.length); i++) {
        const ch = html[i];
        if (inStr) {
          if (ch === strCh && html[i-1] !== '\\') inStr = false;
        } else {
          if (ch === '"' || ch === "'") { inStr = true; strCh = ch; }
          else if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) { fnEnd = i + 1; break; }
          }
        }
      }
      
      if (fnEnd !== -1) {
        // Include trailing newlines
        while (fnEnd < html.length && html[fnEnd] === '\n') fnEnd++;
        html = html.substring(0, fnIdx) + html.substring(fnEnd);
        console.log(`  Removed function ${fn}()`);
      }
    }
    
    // Remove function calls: rndX(); nQX(); rQX();
    html = html.replace(new RegExp(`\\b${funcNames[0]}\\(\\);?\\s*\\n?`, 'g'), '');
    html = html.replace(new RegExp(`\\b${funcNames[2] || 'nQ' + suffix}\\(\\);?\\s*\\n?`, 'g'), '');
    html = html.replace(new RegExp(`\\b${funcNames[3] || 'rQ' + suffix}\\(\\);?\\s*\\n?`, 'g'), '');
  }
  
  // Step 4: Remove orphaned score elements
  html = html.replace(/<p[^>]*id="qs[AXZ]"[^>]*>[^<]*<\/p>/g, '');
  
  // Step 5: Remove inline style="" attributes
  const styleCount = (html.match(/style="/g) || []).length;
  html = html.replace(/ style="[^"]*"/g, '');
  console.log(`  Stripped ${styleCount} inline style attributes`);
  
  // Step 6: Clean up empty scripts and blank lines
  html = html.replace(/<script>\s*<\/script>/g, '');
  html = html.replace(/<script>\s*\n\s*<\/script>/g, '');
  html = html.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(fpath, html, 'utf8');
  console.log(`  ✓ ${fname} (${origLen} → ${html.length}, -${origLen - html.length})`);
}

for (const f of ['Kaigo-Rehabilitasi.html', 'Kaigo-Medis-Lanjut.html']) {
  console.log(`\n=== ${f} ===`);
  fixFile(f);
}
console.log('\nDone!');
