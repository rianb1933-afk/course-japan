#!/usr/bin/env node
/**
 * Fix duplicate quiz arrays in Kaigo pages.
 * Merges QUIZ + QX/QA/QKZ into a single QUIZ array, removes extra quiz DOM sections.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MATTERI = path.join(ROOT, 'Materi');

// Files known to have duplicate quizzes
const FILES = [
  'Kaigo-Rehabilitasi.html',
  'Kaigo-Medis-Lanjut.html'
];

for (const fname of FILES) {
  const fpath = path.join(MATTERI, fname);
  if (!fs.existsSync(fpath)) { console.log(`SKIP: ${fname} not found`); continue; }
  
  let html = fs.readFileSync(fpath, 'utf8');
  
  // Strategy: find all quiz data arrays (QUIZ, QX, QKZ, QA, etc.)
  // and merge them into the primary QUIZ array
  
  // Extract all quiz arrays from script blocks
  const quizRegex = /var\s+(Q[A-Z]?)\s*=\s*(\[[\s\S]*?\])\s*[,;]/g;
  const allArrays = {};
  let match;
  
  while ((match = quizRegex.exec(html)) !== null) {
    const name = match[1] || 'QUIZ';
    try {
      allArrays[name] = JSON.parse(match[2]);
    } catch (e) {
      // Try to fix truncated JSON by evaluating
      console.log(`  Warning: could not parse ${name} array in ${fname}: ${e.message}`);
    }
  }
  
  if (Object.keys(allArrays).length <= 1) {
    console.log(`SKIP: ${fname} has only ${Object.keys(allArrays).length} quiz arrays`);
    continue;
  }
  
  console.log(`Processing ${fname}: found arrays: ${Object.keys(allArrays).join(', ')}`);
  
  // Merge all arrays into QUIZ, deduplicating by question text
  const seen = new Set();
  const merged = [];
  
  for (const [name, arr] of Object.entries(allArrays)) {
    for (const q of arr) {
      const key = q.q;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(q);
      }
    }
  }
  
  console.log(`  Merged: ${merged.length} unique questions from ${Object.keys(allArrays).reduce((s, k) => s + allArrays[k].length, 0)} total`);
  
  // Replace the primary QUIZ array
  const primaryName = allArrays['QUIZ'] ? 'QUIZ' : Object.keys(allArrays)[0];
  const quizVarRegex = new RegExp(`var\\s+${primaryName}\\s*=\\s*\\[`, 'g');
  
  // Find and replace from the first QUIZ definition to the end of its array
  // We need to find the full extent including nested brackets
  let startIdx = html.indexOf(`var ${primaryName}=[`);
  if (startIdx === -1) startIdx = html.indexOf(`var ${primaryName} = [`);
  if (startIdx === -1) { console.log(`  Could not find primary QUIZ start`); continue; }
  
  // Find matching closing bracket
  let depth = 0;
  let endIdx = -1;
  const arrStart = html.indexOf('[', startIdx);
  for (let i = arrStart; i < html.length; i++) {
    if (html[i] === '[') depth++;
    if (html[i] === ']') depth--;
    if (depth === 0) { endIdx = i + 1; break; }
  }
  
  if (endIdx === -1) { console.log(`  Could not find QUIZ array end`); continue; }
  
  // Replace the QUIZ array content
  const newQuizStr = `var ${primaryName}=${JSON.stringify(merged)};`;
  html = html.substring(0, startIdx) + newQuizStr + html.substring(endIdx);
  
  // Now remove the duplicate quiz sections (QX, QKZ, QA, etc.)
  for (const name of Object.keys(allArrays)) {
    if (name === primaryName) continue;
    
    // Remove the var declaration
    const varRegex = new RegExp(`;\\s*var\\s+${name}\\s*=\\s*\\[[\\s\\S]*?\\]\\s*,\\s*[a-z]+\\s*=\\s*\\d+(?:,\\s*[a-z]+\\s*=\\s*\\d+)*;?`, 'g');
    html = html.replace(varRegex, ';');
    
    // Also try without the leading semicolon
    const varRegex2 = new RegExp(`var\\s+${name}\\s*=\\s*\\[[\\s\\S]*?\\]\\s*,\\s*[a-z]+\\s*=\\s*\\d+(?:,\\s*[a-z]+\\s*=\\s*\\d+)*;?`, 'g');
    html = html.replace(varRegex2, '');
    
    // Remove the corresponding render function (rndX, renderQ2, etc.)
    const funcNames = {
      QX: ['rndX', 'ansX', 'nQX', 'rQX'],
      QKZ: ['rndZ', 'ansZ', 'nQZ', 'rQZ'],
      QA: ['rndA', 'ansA', 'nQA', 'rQA'],
      QB: ['rndB', 'ansB', 'nQB', 'rQB'],
    };
    
    if (funcNames[name]) {
      for (const fn of funcNames[name]) {
        const fnRegex = new RegExp(`function\\s+${fn}\\s*\\([\\s\\S]*?\\}\\s*`, 'g');
        html = html.replace(fnRegex, '');
      }
    }
  }
  
  // Remove duplicate quiz DOM sections (second <h2>🧠 Quiz</h2> and its container)
  // Find all occurrences of quiz heading + container
  const quizSections = [];
  const quizHeadingRegex = /<h2[^>]*>🧠\s*Quiz[^<]*<\/h2>\s*<div[^>]*id="qc[^"]*"[^>]*><\/div>/g;
  let m;
  while ((m = quizHeadingRegex.exec(html)) !== null) {
    quizSections.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  
  // If there are multiple quiz sections, remove the extras (keep the first)
  if (quizSections.length > 1) {
    // Remove in reverse order to preserve indices
    for (let i = quizSections.length - 1; i >= 1; i--) {
      const sec = quizSections[i];
      html = html.substring(0, sec.start) + html.substring(sec.end);
    }
    console.log(`  Removed ${quizSections.length - 1} duplicate quiz DOM sections`);
  }
  
  // Also remove duplicate "Latihan Soal" sections
  const latihanSections = [];
  const latihanRegex = /<h2[^>]*>🧠\s*Latihan[^<]*<\/h2>\s*<div[^>]*id="qc[A-Z]+"[^>]*><\/div>/g;
  while ((m = latihanRegex.exec(html)) !== null) {
    latihanSections.push({ start: m.index, end: m.index + m[0].length });
  }
  if (latihanSections.length > 0) {
    for (let i = latihanSections.length - 1; i >= 0; i--) {
      html = html.substring(0, latihanSections[i].start) + html.substring(latihanSections[i].end);
    }
    console.log(`  Removed ${latihanSections.length} Latihan Soal sections`);
  }
  
  // Clean up: remove orphaned score buttons for removed quizzes
  html = html.replace(/<button[^>]*onclick="nQ[AXZ]\(\)"[^>]*>.*?<\/button>\s*/g, '');
  html = html.replace(/<button[^>]*onclick="rQ[AXZ]\(\)"[^>]*>.*?<\/button>\s*/g, '');
  html = html.replace(/<p[^>]*id="qs[AXZ]"[^>]*>.*?<\/p>\s*/g, '');
  html = html.replace(/<p[^>]*id="qs[A-Z]"[^>]*>.*?<\/p>\s*/g, '');
  
  // Remove duplicate render functions
  html = html.replace(/function\s+rnd[AXZ]\(\)\{[\s\S]*?\}\s*/g, '');
  html = html.replace(/function\s+ans[AXZ]\([\s\S]*?\}\s*/g, '');
  html = html.replace(/function\s+nQ[AXZ]\(\)\{[\s\S]*?\}\s*/g, '');
  html = html.replace(/function\s+rQ[AXZ]\(\)\{[\s\S]*?\}\s*/g, '');
  
  // Remove duplicate render calls
  html = html.replace(/rnd[AXZ]\(\);?\s*/g, '');
  
  // Clean up orphaned <section> wrappers that only contained duplicate quizzes
  html = html.replace(/<section[^>]*style="[^"]*padding:\s*0\s+20px[^"]*"[^>]*>\s*(?:<h2[^>]*>🧠\s*Quiz[^<]*<\/h2>\s*)?<(?:div|p)[^>]*id="qs[^"]*"[^>]*>[^<]*<\/(?:div|p)>\s*<\/section>/g, '');
  
  // Remove empty script blocks
  html = html.replace(/<script>\s*<\/script>/g, '');
  html = html.replace(/<script>\s*\n\s*<\/script>/g, '');
  
  // Clean up multiple blank lines
  html = html.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(fpath, html, 'utf8');
  console.log(`  ✓ Written ${fpath} (${html.length} bytes)`);
}

console.log('\nDone!');
