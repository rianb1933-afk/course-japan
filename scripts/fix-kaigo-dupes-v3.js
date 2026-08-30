#!/usr/bin/env node
/**
 * Fix Kaigo-Rehabilitasi.html and Kaigo-Medis-Lanjut.html:
 * 1. Merge duplicate quiz arrays (QUIZ+QX+QKZ → single QUIZ)
 * 2. Remove duplicate quiz DOM sections and their scripts
 * 3. Strip inline style="" attributes
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MATTERI = path.join(ROOT, 'Materi');

function fixFile(fname) {
  const fpath = path.join(MATTERI, fname);
  if (!fs.existsSync(fpath)) { console.log(`SKIP: ${fname}`); return; }
  
  let html = fs.readFileSync(fpath, 'utf8');
  const origLen = html.length;
  
  // ===== STEP 1: Extract QUIZ array and all duplicate arrays =====
  
  function extractArrayContent(html, varName) {
    // Find "var VARNAME=["
    const searchStr = `var ${varName}=[`;
    const altSearch = `var ${varName} = [`;
    let startIdx = html.indexOf(searchStr);
    if (startIdx === -1) startIdx = html.indexOf(altSearch);
    if (startIdx === -1) return null;
    
    // Find the array start bracket
    const arrStart = html.indexOf('[', startIdx);
    
    // Find matching closing bracket by counting depth
    let depth = 0;
    let endIdx = -1;
    for (let i = arrStart; i < html.length; i++) {
      if (html[i] === '[') depth++;
      else if (html[i] === ']') depth--;
      if (depth === 0) { endIdx = i + 1; break; }
    }
    
    if (endIdx === -1) return null;
    return html.substring(arrStart, endIdx);
  }
  
  // Extract primary QUIZ
  const quizContent = extractArrayContent(html, 'QUIZ');
  if (!quizContent) { console.log(`  No QUIZ array found in ${fname}`); return; }
  
  console.log(`  Found QUIZ array (${quizContent.length} chars)`);
  
  // Extract duplicate arrays
  const duplicates = {};
  for (const name of ['QX', 'QKZ', 'QA', 'QB', 'QC']) {
    const content = extractArrayContent(html, name);
    if (content) {
      duplicates[name] = content;
      console.log(`  Found duplicate ${name} array (${content.length} chars)`);
    }
  }
  
  if (Object.keys(duplicates).length === 0) {
    console.log(`  No duplicates found in ${fname}`);
    return;
  }
  
  // ===== STEP 2: Parse quiz items from each array =====
  // The arrays use JS object literals with single-quoted strings
  // We need to parse them carefully
  
  function parseQuizArray(arrStr) {
    // Remove outer brackets
    const inner = arrStr.slice(1, -1).trim();
    if (!inner) return [];
    
    // Split by }, { but not inside strings
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
        if (ch === '"' || ch === "'") {
          inStr = true;
          strCh = ch;
        } else if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
        } else if (ch === ',' && depth === 0) {
          items.push(current.trim());
          current = '';
          continue;
        }
      }
      current += ch;
    }
    if (current.trim()) items.push(current.trim());
    
    // Parse each item
    const parsed = [];
    for (const item of items) {
      try {
        // Convert single quotes to double quotes for JSON
        let jsonStr = item.replace(/'/g, '"');
        // Fix: unescaped quotes inside string values
        // Pattern: "text"word" → need to escape inner quotes
        // This is handled by replacing '"word"' patterns
        const obj = JSON.parse(jsonStr);
        parsed.push(obj);
      } catch (e) {
        // Try eval as fallback
        try {
          const obj = eval('(' + item + ')');
          parsed.push(obj);
        } catch (e2) {
          console.log(`    WARN: Could not parse: ${item.substring(0, 60)}...`);
        }
      }
    }
    return parsed;
  }
  
  const primaryItems = parseQuizArray(quizContent);
  console.log(`  QUIZ: ${primaryItems.length} questions`);
  
  const allItems = [...primaryItems];
  const seen = new Set(primaryItems.map(q => q.q));
  
  for (const [name, content] of Object.entries(duplicates)) {
    const items = parseQuizArray(content);
    console.log(`  ${name}: ${items.length} questions`);
    for (const q of items) {
      if (q && q.q && !seen.has(q.q)) {
        seen.add(q.q);
        allItems.push(q);
      }
    }
  }
  
  console.log(`  Total merged: ${allItems.length} unique questions`);
  
  // ===== STEP 3: Replace QUIZ array in HTML =====
  // Find the exact range of the QUIZ array declaration
  const quizVarStart = html.indexOf('var QUIZ=[');
  const quizVarEnd = html.indexOf('];', quizVarStart) + 2;
  
  // Build new QUIZ array
  const newQuizItems = allItems.map(q => {
    const opts = (q.opts || q.o || []).map(o => `'${o.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(',');
    const e = (q.e || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `{q:'${q.q.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',opts:[${opts}],a:${q.a},e:'${e}'}`;
  });
  
  const newQuizStr = `var QUIZ=[${newQuizItems.join(',')}];`;
  html = html.substring(0, quizVarStart) + newQuizStr + html.substring(quizVarEnd);
  
  console.log(`  Replaced QUIZ array (${newQuizStr.length} chars)`);
  
  // ===== STEP 4: Remove duplicate variable declarations =====
  for (const name of Object.keys(duplicates)) {
    const searchStr = `var ${name}=[`;
    let idx = html.indexOf(searchStr);
    if (idx === -1) continue;
    
    // Find the end of the var declaration (semicolon after the array and state vars)
    // Pattern: var QX=[...],qiX=0,okX=0,totX=0;
    const semicolonIdx = html.indexOf(';', idx);
    if (semicolonIdx !== -1) {
      const removed = html.substring(idx, semicolonIdx + 1);
      html = html.substring(0, idx) + html.substring(semicolonIdx + 1);
      console.log(`  Removed var ${name} declaration (${removed.length} chars)`);
    }
  }
  
  // ===== STEP 5: Remove duplicate render functions =====
  for (const name of Object.keys(duplicates)) {
    const suffix = name.replace('Q', '');
    
    // Remove function rndX/rndZ/etc - find "function rndX()" and its body
    const funcNames = [`rnd${suffix}`, `ans${suffix}`, `nQ${suffix}`, `rQ${suffix}`];
    
    for (const fn of funcNames) {
      const fnStart = html.indexOf(`function ${fn}(`);
      if (fnStart === -1) continue;
      
      // Find the function body end by counting braces
      let braceStart = html.indexOf('{', fnStart);
      if (braceStart === -1) continue;
      
      let depth = 0;
      let fnEnd = -1;
      for (let i = braceStart; i < html.length; i++) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') {
          depth--;
          if (depth === 0) { fnEnd = i + 1; break; }
        }
      }
      
      if (fnEnd !== -1) {
        // Include trailing whitespace/newline
        while (fnEnd < html.length && (html[fnEnd] === '\n' || html[fnEnd] === '\r')) fnEnd++;
        html = html.substring(0, fnStart) + html.substring(fnEnd);
        console.log(`  Removed function ${fn}()`);
      }
    }
    
    // Also remove var-style functions: var rndX = function...
    for (const fn of funcNames) {
      const fnStart = html.indexOf(`var ${fn} = function`);
      if (fnStart === -1) continue;
      
      let braceStart = html.indexOf('{', fnStart);
      if (braceStart === -1) continue;
      
      let depth = 0;
      let fnEnd = -1;
      for (let i = braceStart; i < html.length; i++) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') {
          depth--;
          if (depth === 0) { fnEnd = i + 1; break; }
        }
      }
      
      if (fnEnd !== -1) {
        while (fnEnd < html.length && (html[fnEnd] === '\n' || html[fnEnd] === '\r')) fnEnd++;
        html = html.substring(0, fnStart) + html.substring(fnEnd);
        console.log(`  Removed var ${fn} = function`);
      }
    }
    
    // Remove function calls: rndX(); rQX(); etc.
    html = html.replace(new RegExp(`\\b${funcNames[0]}\\(\\);?\\s*\\n?`, 'g'), '');
    html = html.replace(new RegExp(`\\b${funcNames[3] || 'rQ'}\\(\\);?\\s*\\n?`, 'g'), '');
  }
  
  // ===== STEP 6: Remove duplicate quiz DOM sections =====
  // Find all sections with "🧠 Quiz" heading followed by a quiz container
  // We keep the FIRST one (which uses the QUIZ array via kaigo-quiz.js)
  // Remove subsequent ones (which use QX/QKZ via rndX/rndZ)
  
  // Strategy: find all occurrences of quiz headings and their associated containers
  // The duplicate sections have id="qcX", "qcZ" etc.
  
  for (const name of Object.keys(duplicates)) {
    const suffix = name.replace('Q', '');
    const containerId = `qc${suffix}`;
    
    // Find the section containing this container
    // Look for: <section> ... <h2>🧠 Quiz</h2> ... <div id="qcX"> ... </section>
    const sectionStart = html.lastIndexOf('<section', html.indexOf(`id="${containerId}"`));
    if (sectionStart === -1) continue;
    
    const sectionEnd = html.indexOf('</section>', sectionStart);
    if (sectionEnd === -1) continue;
    
    const section = html.substring(sectionStart, sectionEnd + 10);
    html = html.substring(0, sectionStart) + html.substring(sectionEnd + 10);
    console.log(`  Removed duplicate quiz section (id=${containerId})`);
  }
  
  // ===== STEP 7: Remove orphaned score elements for removed quizzes =====
  html = html.replace(/<p[^>]*id="qs[AXZ]"[^>]*>[^<]*<\/p>/g, '');
  html = html.replace(/<p[^>]*id="qs[A-Z]"[^>]*>Skor: 0\/0<\/p>/g, '');
  
  // ===== STEP 8: Strip inline style="" attributes =====
  const origStyles = (html.match(/style="/g) || []).length;
  html = html.replace(/ style="[^"]*"/g, '');
  const strippedStyles = origStyles - (html.match(/style="/g) || []).length;
  console.log(`  Stripped ${strippedStyles} inline style attributes`);
  
  // ===== STEP 9: Clean up =====
  // Remove orphaned <script> tags that are now empty
  html = html.replace(/<script>\s*<\/script>/g, '');
  html = html.replace(/<script>\s*\n\s*<\/script>/g, '');
  
  // Remove multiple blank lines
  html = html.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(fpath, html, 'utf8');
  console.log(`  ✓ Written ${fname} (${origLen} → ${html.length} bytes, ${origLen - html.length} bytes removed)`);
  
  return allItems.length;
}

// Process files
const files = ['Kaigo-Rehabilitasi.html', 'Kaigo-Medis-Lanjut.html'];
for (const f of files) {
  console.log(`\n=== ${f} ===`);
  fixFile(f);
}

console.log('\nDone!');
