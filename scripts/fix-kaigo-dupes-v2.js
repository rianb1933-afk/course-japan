#!/usr/bin/env node
/**
 * Fix Kaigo-Rehabilitasi.html and Kaigo-Medis-Lanjut.html:
 * 1. Merge duplicate quiz arrays (QUIZ+QX+QKZ → single QUIZ)
 * 2. Remove duplicate quiz DOM sections
 * 3. Strip inline style="" attributes (use kaigo-module.css instead)
 * 4. Apply book-style template classes
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
  
  // ===== STEP 1: Extract and merge all quiz arrays =====
  // Find var QUIZ=[...], var QX=[...], var QKZ=[...] etc.
  // They use single quotes inside, so can't JSON.parse directly
  
  function extractQuizArray(varName) {
    // Find "var VARNAME=[" 
    const pattern = new RegExp(`var\\s+${varName}\\s*=\\s*\\[`);
    const match = html.match(pattern);
    if (!match) return null;
    
    const start = html.indexOf(match[0]);
    const arrStart = html.indexOf('[', start);
    
    // Find matching closing bracket
    let depth = 0;
    let endIdx = -1;
    for (let i = arrStart; i < html.length && i < arrStart + 100000; i++) {
      if (html[i] === '[') depth++;
      if (html[i] === ']') depth--;
      if (depth === 0) { endIdx = i + 1; break; }
    }
    
    if (endIdx === -1) return null;
    
    const arrStr = html.substring(arrStart, endIdx);
    return { content: arrStr, start, end: endIdx };
  }
  
  // Extract all quiz arrays
  const arrayNames = ['QUIZ', 'QX', 'QKZ', 'QA', 'QB', 'QC'];
  const found = {};
  
  for (const name of arrayNames) {
    const result = extractQuizArray(name);
    if (result) {
      found[name] = result;
      console.log(`  Found var ${name} at position ${result.start}`);
    }
  }
  
  if (Object.keys(found).length <= 1) {
    console.log(`  No duplicate quizzes found in ${fname}`);
  } else {
    // Parse quiz objects from each array string
    function parseQuizItems(arrStr) {
      // Remove the outer brackets
      const inner = arrStr.slice(1, -1);
      const items = [];
      
      // Split by },{ pattern carefully (not inside strings)
      let depth = 0;
      let current = '';
      let inString = false;
      let stringChar = '';
      
      for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        
        if (inString) {
          if (ch === stringChar && inner[i-1] !== '\\') inString = false;
        } else {
          if (ch === '"' || ch === "'") {
            inString = true;
            stringChar = ch;
          } else if (ch === '{') depth++;
          else if (ch === '}') depth--;
          else if (ch === ',' && depth === 0) {
            items.push(current.trim());
            current = '';
            continue;
          }
        }
        
        current += ch;
      }
      if (current.trim()) items.push(current.trim());
      
      // Parse each item as JS object (convert single quotes to double)
      const parsed = [];
      for (const item of items) {
        try {
          // Convert single-quoted strings to double-quoted for JSON
          let jsonStr = item
            .replace(/'/g, '"')
            .replace(/,\s*$/, '');
          
          // Fix unescaped quotes inside strings
          // Handle patterns like: "text"inside"more" → "text\\"inside\\"more"
          // This is tricky with regex, so we'll be more careful
          
          const obj = JSON.parse(jsonStr);
          parsed.push(obj);
        } catch (e) {
          // Try eval as last resort (safe since these are simple objects)
          try {
            const obj = eval('(' + item + ')');
            parsed.push(obj);
          } catch (e2) {
            console.log(`    Warning: Could not parse quiz item: ${item.substring(0, 80)}...`);
          }
        }
      }
      return parsed;
    }
    
    // Merge all arrays, deduplicating by question text
    const seen = new Set();
    const merged = [];
    
    for (const name of Object.keys(found)) {
      const items = parseQuizItems(found[name].content);
      console.log(`  ${name}: ${items.length} questions`);
      
      for (const q of items) {
        if (q && q.q && !seen.has(q.q)) {
          seen.add(q.q);
          // Normalize: ensure opts property exists (some use 'opts', some might use other names)
          if (!q.opts && q.o) q.opts = q.o;
          merged.push(q);
        }
      }
    }
    
    console.log(`  Merged: ${merged.length} unique questions total`);
    
    // Replace the primary QUIZ array with merged data
    const primaryName = found['QUIZ'] ? 'QUIZ' : Object.keys(found)[0];
    const primary = found[primaryName];
    
    // Build new quiz array string
    const newQuizItems = merged.map(q => {
      const opts = (q.opts || q.o || []).map(o => `'${o.replace(/'/g, "\\'")}'`).join(',');
      return `{q:'${q.q.replace(/'/g, "\\'")}',opts:[${opts}],a:${q.a},e:'${(q.e||'').replace(/'/g, "\\'")}'}`;
    });
    
    const newQuizStr = `var ${primaryName}=[${newQuizItems.join(',')}];`;
    html = html.substring(0, primary.start) + newQuizStr + html.substring(primary.end);
    
    // ===== STEP 2: Remove duplicate quiz variables and functions =====
    for (const name of Object.keys(found)) {
      if (name === primaryName) continue;
      
      // Remove variable declaration (may span multiple lines)
      const varPatterns = [
        new RegExp(`;\\s*var\\s+${name}\\s*=\\s*\\[[\\s\\S]*?\\]\\s*,\\s*[a-z]+X?\\s*=\\s*\\d+(?:,\\s*[a-z]+X?\\s*=\\s*\\d+)*;?`),
        new RegExp(`var\\s+${name}\\s*=\\s*\\[[\\s\\S]*?\\]\\s*,\\s*[a-z]+X?\\s*=\\s*\\d+(?:,\\s*[a-z]+X?\\s*=\\s*\\d+)*;?`),
      ];
      
      for (const pat of varPatterns) {
        html = html.replace(pat, ';');
      }
      
      // Remove render function (rndX, rndZ, rndA, etc.)
      const suffix = name.replace('Q', '');
      const funcNames = [`rnd${suffix}`, `ans${suffix}`, `nQ${suffix}`, `rQ${suffix}`];
      
      for (const fn of funcNames) {
        // Match function declaration including body
        html = html.replace(new RegExp(`function\\s+${fn}\\s*\\([\\s\\S]*?\\}\\s*\\n?`), '');
        // Also match variable-style function: var fn = function...
        html = html.replace(new RegExp(`var\\s+${fn}\\s*=\\s*function[\\s\\S]*?\\}\\s*\\n?`), '');
      }
      
      // Remove render call
      html = html.replace(new RegExp(`rnd${suffix}\\(\\);?\\s*`), '');
    }
    
    // ===== STEP 3: Remove duplicate quiz DOM sections =====
    // Find all quiz containers (div with id="qc" or similar)
    const quizContainers = [];
    const containerRegex = /<(?:h2|h3)[^>]*>🧠\s*(?:Quiz|Latihan)[^<]*<\/(?:h2|h3)>[\s\S]*?<div[^>]*id="qc[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?:<div[^>]*style="[^"]*display:\s*flex[^"]*"[^>]*>[\s\S]*?<\/div>\s*)?(?:<p[^>]*id="qs[^"]*"[^>]*>[^<]*<\/p>\s*)?/g;
    
    let m;
    while ((m = containerRegex.exec(html)) !== null) {
      quizContainers.push({ start: m.index, end: m.index + m[0].length });
    }
    
    // Keep only the first quiz container
    if (quizContainers.length > 1) {
      for (let i = quizContainers.length - 1; i >= 1; i--) {
        const sec = quizContainers[i];
        html = html.substring(0, sec.start) + html.substring(sec.end);
        console.log(`  Removed duplicate quiz DOM section at ${sec.start}`);
      }
    }
    
    // Also remove orphaned score divs for removed quizzes
    html = html.replace(/<p[^>]*id="qs[AXZ]"[^>]*>[^<]*<\/p>/g, '');
    
    // ===== STEP 4: Strip inline style="" attributes =====
    // Replace style="..." with nothing (kaigo-module.css provides all styling)
    // Be careful not to remove data- attributes or class attributes
    const styleAttrs = / style="[^"]*"/g;
    let styleCount = 0;
    html = html.replace(styleAttrs, (match) => {
      styleCount++;
      return '';
    });
    console.log(`  Stripped ${styleCount} inline style attributes`);
    
    // ===== STEP 5: Clean up =====
    // Remove empty script blocks
    html = html.replace(/<script>\s*<\/script>/g, '');
    
    // Remove multiple blank lines
    html = html.replace(/\n{3,}/g, '\n\n');
    
    // Clean trailing whitespace
    html = html.replace(/[ \t]+$/gm, '');
    
    fs.writeFileSync(fpath, html, 'utf8');
    console.log(`  ✓ Written ${fname} (${origLen} → ${html.length} bytes, ${origLen - html.length} bytes removed)`);
  }
}

// Process files
const files = ['Kaigo-Rehabilitasi.html', 'Kaigo-Medis-Lanjut.html'];
for (const f of files) {
  console.log(`\n=== ${f} ===`);
  fixFile(f);
}

console.log('\nDone!');
