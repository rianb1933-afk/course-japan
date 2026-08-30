#!/usr/bin/env node
/**
 * Fix duplicate quiz arrays in Kaigo pages.
 * Uses proper bracket matching to avoid matching inside strings.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MATTERI = path.join(ROOT, 'Materi');

function findBracketEnd(html, startIdx) {
  let depth = 0;
  let inStr = false;
  let strCh = '';
  for (let i = startIdx; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (ch === strCh && html[i-1] !== '\\') inStr = false;
    } else {
      if (ch === '"' || ch === "'") { inStr = true; strCh = ch; }
      else if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (depth === 0) return i + 1; }
    }
  }
  return -1;
}

function findBraceEnd(html, startIdx) {
  let depth = 0;
  let inStr = false;
  let strCh = '';
  for (let i = startIdx; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (ch === strCh && html[i-1] !== '\\') inStr = false;
    } else {
      if (ch === '"' || ch === "'") { inStr = true; strCh = ch; }
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) return i + 1; }
    }
  }
  return -1;
}

function fixFile(fname) {
  const fpath = path.join(MATTERI, fname);
  if (!fs.existsSync(fpath)) return;
  
  let html = fs.readFileSync(fpath, 'utf8');
  const origLen = html.length;
  
  // Find QUIZ array with proper bracket matching
  const quizStart = html.indexOf('var QUIZ=[');
  if (quizStart === -1) { console.log(`SKIP: ${fname} - no QUIZ`); return; }
  
  const arrStart = html.indexOf('[', quizStart);
  const arrEnd = findBracketEnd(html, arrStart);
  if (arrEnd === -1) { console.log(`SKIP: ${fname} - can't find QUIZ end`); return; }
  
  const quizArrStr = html.substring(arrStart, arrEnd);
  
  // Parse quiz items by finding each {q:...} object
  function parseItems(arrStr) {
    const inner = arrStr.slice(1, -1).trim();
    const items = [];
    let depth = 0;
    let inStr = false;
    let strCh = '';
    let current = '';
    
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (inStr) {
        if (ch === strCh && inner[i-1] !== '\\') inStr = false;
      } else {
        if (ch === '"' || ch === "'") { inStr = true; strCh = ch; }
        else if (ch === '{') depth++;
        else if (ch === '}') { depth--; }
        else if (ch === ',' && depth === 0) {
          items.push(current.trim());
          current = '';
          continue;
        }
      }
      current += ch;
    }
    if (current.trim()) items.push(current.trim());
    
    return items.map(item => {
      try { return JSON.parse(item.replace(/'/g, '"')); }
      catch { try { return eval('(' + item + ')'); } catch { return null; } }
    }).filter(Boolean);
  }
  
  const primaryItems = parseItems(quizArrStr);
  console.log(`  QUIZ: ${primaryItems.length} questions`);
  
  // Find and parse duplicate arrays
  const dupNames = ['QX', 'QKZ', 'QA', 'QB'];
  const allItems = [...primaryItems];
  const seen = new Set(primaryItems.map(q => q.q));
  const dupRanges = []; // {varStart, varEnd} for each duplicate var declaration
  
  for (const name of dupNames) {
    const varIdx = html.indexOf(`var ${name}=[`);
    if (varIdx === -1) continue;
    
    const dArrStart = html.indexOf('[', varIdx);
    const dArrEnd = findBracketEnd(html, dArrStart);
    if (dArrEnd === -1) continue;
    
    // Find end of var declaration (semicolon after state vars like qiX=0,okX=0,totX=0)
    let declEnd = html.indexOf(';', dArrEnd);
    if (declEnd === -1) declEnd = dArrEnd;
    else declEnd++; // include the semicolon
    
    const items = parseItems(html.substring(dArrStart, dArrEnd));
    console.log(`  ${name}: ${items.length} questions`);
    
    for (const q of items) {
      if (q && q.q && !seen.has(q.q)) {
        seen.add(q.q);
        allItems.push(q);
      }
    }
    
    dupRanges.push({ start: varIdx, end: declEnd });
  }
  
  console.log(`  Total: ${allItems.length} unique questions`);
  
  // Build new QUIZ array (use double-quoted strings for JSON safety)
  function esc(s) { return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
  const newItems = allItems.map(q => {
    const opts = (q.opts || q.o || []).map(o => `"${esc(o)}"`).join(',');
    return `{q:"${esc(q.q)}",opts:[${opts}],a:${q.a},e:"${esc(q.e)}"}`;
  });
  
  const newQuizDecl = `var QUIZ=[${newItems.join(',')}];\n`;
  html = html.substring(0, quizStart) + newQuizDecl + html.substring(arrEnd);
  
  // Remove duplicate var declarations (in reverse order to preserve indices)
  for (const range of dupRanges.sort((a,b) => b.start - a.start)) {
    html = html.substring(0, range.start) + html.substring(range.end);
  }
  
  // Remove duplicate render functions and their calls
  for (const name of dupNames) {
    const suffix = name.replace('Q', '');
    const fnames = [`rnd${suffix}`, `ans${suffix}`, `nQ${suffix}`, `rQ${suffix}`];
    
    for (const fn of fnames) {
      const fnIdx = html.indexOf(`function ${fn}(`);
      if (fnIdx === -1) continue;
      
      const braceIdx = html.indexOf('{', fnIdx);
      const fnEnd = findBraceEnd(html, braceIdx);
      if (fnEnd === -1) continue;
      
      // Also eat trailing newline
      let end = fnEnd;
      while (end < html.length && html[end] === '\n') end++;
      
      html = html.substring(0, fnIdx) + html.substring(end);
    }
    
    // Remove calls
    html = html.replace(new RegExp(`\\b${fnames[0]}\\(\\);?\\s*`, 'g'), '');
  }
  
  // Remove duplicate quiz DOM sections
  for (const name of dupNames) {
    const suffix = name.replace('Q', '');
    const cid = `id="qc${suffix}"`;
    const idx = html.indexOf(cid);
    if (idx === -1) continue;
    
    // Find the section wrapper
    let secStart = html.lastIndexOf('<section', idx);
    if (secStart === -1) continue;
    let secEnd = html.indexOf('</section>', secStart);
    if (secEnd === -1) continue;
    secEnd += 10; // include </section>
    
    html = html.substring(0, secStart) + html.substring(secEnd);
    console.log(`  Removed duplicate quiz section (${cid})`);
  }
  
  // Strip inline styles
  const styleCount = (html.match(/style="/g) || []).length;
  html = html.replace(/ style="[^"]*"/g, '');
  console.log(`  Stripped ${styleCount} inline style attributes`);
  
  // Clean up empty scripts and blank lines
  html = html.replace(/<script>\s*<\/script>/g, '');
  html = html.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(fpath, html, 'utf8');
  console.log(`  ✓ ${fname} (${origLen} → ${html.length}, -${origLen - html.length})`);
}

for (const f of ['Kaigo-Rehabilitasi.html', 'Kaigo-Medis-Lanjut.html']) {
  console.log(`\n=== ${f} ===`);
  fixFile(f);
}
console.log('\nDone!');
