#!/usr/bin/env node
/**
 * Kaigo Module Refactor Script
 * Batch-updates all Materi/Kaigo-*.html files to:
 * 1. Add shared CSS (kaigo-module.css) and JS (kaigo-quiz.js)
 * 2. Remove inline <style> blocks that duplicate kaigo-module.css
 * 3. Replace inline vocab rendering with renderVocabGrid()
 * 4. Remove duplicate speak() function definitions (now in kaigo-quiz.js)
 * 5. Remove inline service worker registration (now in kaigo-quiz.js)
 * 6. Fix JSON-LD metadata (many pages have copy-pasted "Quiz Kaigo Level N2")
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const files = fs.readdirSync(MATERI_DIR)
  .filter(f => f.startsWith('Kaigo-') && f.endsWith('.html'))
  .map(f => path.join(MATERI_DIR, f));

console.log(`Found ${files.length} Kaigo module files to process.`);

let updatedCount = 0;
let errorCount = 0;

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    let changed = false;

    // ── 1. Add shared CSS link ──
    if (!content.includes('kaigo-module.css')) {
      // Insert after the kyoto-bundle.min.css link
      const cssInsert = '<link rel="stylesheet" href="../assets/kaigo-module.css">\n';
      if (content.includes('../assets/kyoto-bundle.min.css')) {
        content = content.replace(
          /(<link rel="stylesheet" href="[^"]*kyoto-elevation\.css">)/,
          '$1\n' + cssInsert
        );
        changed = true;
      }
    }

    // ── 2. Add shared JS link ──
    if (!content.includes('kaigo-quiz.js')) {
      // Insert after the kyoto-theme.js script
      const jsInsert = '<script src="../assets/kaigo-quiz.js" defer></script>\n';
      if (content.includes('../assets/kyoto-theme.js')) {
        content = content.replace(
          /(<script src="[^"]*kyoto-theme\.js"[^>]*><\/script>)/,
          '$1\n' + jsInsert
        );
        changed = true;
      } else {
        // Fallback: insert before supabase-client.js
        content = content.replace(
          /(<script src="[^"]*supabase-client\.js"[^>]*><\/script>)/,
          jsInsert + '$1'
        );
        changed = true;
      }
    }

    // ── 3. Remove inline <style> block that matches the shared CSS ──
    // Pattern A: Exact match (900px) - remove entire block
    const styleRegex = /<style>\s*\.wrap\{max-width:\s*900px[\s\S]*?<\/style>/;
    if (styleRegex.test(content)) {
      content = content.replace(styleRegex, '');
      changed = true;
    }
    // Pattern B: 920px variant - leave inline CSS intact (has extra page-specific
    // classes not in kaigo-module.css). The shared CSS provides the base, inline
    // CSS provides overrides/additions. No removal needed.

    // ── 4. Remove inline speak() function definitions ──
    // Pattern: function speak(t){if('speechSynthesis' in window){...}}
    const speakRegex = /\nfunction speak\(t\)\{if\('speechSynthesis' in window\)\{[\s\S]*?speechSynthesis\.speak\(u\);\}\}/;
    if (speakRegex.test(content)) {
      content = content.replace(speakRegex, '');
      changed = true;
    }

    // ── 5. Remove service worker registration scripts ──
    // Simple approach: find 'if(\'serviceWorker'' and work backwards/forwards
    const swIdx = content.indexOf("if('serviceWorker' in navigator)");
    if (swIdx !== -1) {
      // Find the <script> tag before it
      const beforeSw = content.lastIndexOf('<script>', swIdx);
      // Find the </script> tag after it
      const afterSw = content.indexOf('</script>', swIdx);
      if (beforeSw !== -1 && afterSw !== -1) {
        const blockEnd = afterSw + '</script>'.length;
        // Check if the block before this is also </script> (adjacent blocks)
        const beforeBlock = content.substring(Math.max(0, beforeSw - 20), beforeSw);
        if (beforeBlock.trimEnd().endsWith('</script>')) {
          // Adjacent: remove from </script><script>...SW...</script> to just </script>
          content = content.substring(0, beforeSw) + content.substring(blockEnd);
        } else {
          // Standalone: remove the entire <script>...SW...</script> block
          content = content.substring(0, beforeSw) + content.substring(blockEnd);
        }
        changed = true;
      }
    }

    // ── 6. Replace PH_VOCAB inline vocab rendering with renderVocabGrid() ──
    // Pattern 1: PH_VOCAB with inline styles
    const phVocabRegex = /<script>\s*\ndocument\.addEventListener\('DOMContentLoaded',\s*function\(\)\{\nvar PH_VOCAB=\[[\s\S]*?\]\s*;\s*\nvar pgv=document\.getElementById\('pg'\);\s*\nif\(pgv\)PH_VOCAB\.forEach\([\s\S]*?\}\);\s*\n\}\);\s*\n<\/script>/;
    if (phVocabRegex.test(content)) {
      content = content.replace(phVocabRegex,
        '<script>\ndocument.addEventListener(\'DOMContentLoaded\', function(){\nrenderVocabGrid(\'pg\', PH_VOCAB);\n});\n</script>'
      );
      changed = true;
    }

    // Pattern 2: PH with class-based rendering (Kaigo-Chiiki-Shakai style)
    const phRegex2 = /var pg=document\.getElementById\('pg'\);\s*\nif\(pg\)\s*\n?PH\.forEach\(function\(p\)\{\s*\n?\s*var d=document\.createElement\('div'\);d\.className='pv';\s*\n?\s*d\.innerHTML='[^']*';\s*\n?\s*var btn=document\.createElement\('button'\);btn\.className='pv-btn';btn\.textContent='🔊';\s*\n?\s*var txt=p\[0\];btn\.onclick=function\(\)\{speak\(txt\);\};\s*\n?\s*d\.appendChild\(btn\);pg\.appendChild\(d\);\s*\n?\}\);/;
    if (phRegex2.test(content)) {
      content = content.replace(phRegex2,
        'renderVocabGrid(\'pg\', PH);'
      );
      changed = true;
    }

    // ── 7. Remove inline quiz engine functions ──
    // Remove rnd(), ans(), nQ(), rQ() functions (the ones using CSS classes)
    const quizFuncRegex = /\nfunction rnd\(\)\{\s*\n?\s*if\(!Q\.length\)return;[\s\S]*?function rQ\(\)\{qi=0;ok=0;tot=0;rnd\(\);\}/;
    if (quizFuncRegex.test(content)) {
      content = content.replace(quizFuncRegex, '');
      changed = true;
    }

    // Remove rndZ(), ansZ(), nQkZ(), rQkZ() functions (inline-style variant)
    const quizFuncZRegex = /\nfunction rndZ\(\)\{\s*\n?\s*if\(!QKZ\.length\)return;[\s\S]*?function rQkZ\(\)\{qiZ=0;okZ=0;totZ=0;rndZ\(\);\}/;
    if (quizFuncZRegex.test(content)) {
      content = content.replace(quizFuncZRegex, '');
      changed = true;
    }
    // Remove nextQ/resetQ wrapper functions (variant used in some files)
    const nextQRegex = /\nfunction nextQ\(\)\{qi=\(qi\+1\)%[A-Z]+\.length;rnd\(\);\}\nfunction resetQ\(\)\{qi=0;ok=0;tot=0;rnd\(\);\}/;
    if (nextQRegex.test(content)) {
      content = content.replace(nextQRegex, '');
      changed = true;
    }
    // Remove updateScore function (variant used in some files)
    const updateScoreRegex = /\nfunction updateScore\(\)\{[\s\S]*?\}/;
    if (updateScoreRegex.test(content)) {
      content = content.replace(updateScoreRegex, '');
      changed = true;
    }

    // Remove the init();rnd(); or rnd(); call at end of quiz script
    // Handle various spacing: init();rnd(); init(); rnd(); rnd(); etc.
    const initRndRegex = /\nif\(typeof init==='function'\)init\(\);\s*rnd\(\);/;
    if (initRndRegex.test(content)) {
      content = content.replace(initRndRegex, '');
      changed = true;
    }
    // Also handle just rnd(); at the end
    const rndOnlyRegex = /\nrnd\(\);\s*\n<\/script>/;
    if (rndOnlyRegex.test(content)) {
      content = content.replace(rndOnlyRegex, '\n</script>');
      changed = true;
    }
    // Handle rnd(); before </script> at end (without newline after rnd())
    const rndOnlyRegex2 = /\nrnd\(\);<\/script>/;
    if (rndOnlyRegex2.test(content)) {
      content = content.replace(rndOnlyRegex2, '</script>');
      changed = true;
    }
    // Handle rnd(); at end of multi-statement line (e.g., renderDialog();rnd();)
    const rndInlineRegex = /;rnd\(\);<\/script>/;
    if (rndInlineRegex.test(content)) {
      content = content.replace(rndInlineRegex, ';</script>');
      changed = true;
    }
    const rndInlineRegex2 = /;rnd\(\);\s*\n<\/script>/;
    if (rndInlineRegex2.test(content)) {
      content = content.replace(rndInlineRegex2, ';</script>');
      changed = true;
    }
    // Handle rndZ(); call at end of quiz data block
    const rndZCallRegex = /\nrndZ\(\);\s*\n<\/script>/;
    if (rndZCallRegex.test(content)) {
      content = content.replace(rndZCallRegex, '\n</script>');
      changed = true;
    }
    const rndZCallRegex2 = /\nrndZ\(\);<\/script>/;
    if (rndZCallRegex2.test(content)) {
      content = content.replace(rndZCallRegex2, '</script>');
      changed = true;
    }

    // ── 8. Fix JSON-LD metadata ──
    // Many pages have copy-pasted "Quiz Kaigo Level N2" - fix to use actual title
    // Extract the real title from the <title> tag
    const titleMatch = content.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      const realTitle = titleMatch[1].replace(' | Nihongo Pro Academy', '').trim();
      // Fix JSON-LD name
      content = content.replace(
        /"name":\s*"Quiz Kaigo Level N2 介護N2 \| Nihongo Pro Academy"/,
        `"name": "${realTitle} | Nihongo Pro Academy"`
      );
      // Fix JSON-LD description - use the page's actual meta description
      const descMatch = content.match(/<meta name="description" content="([^"]+)"/);
      if (descMatch) {
        const realDesc = descMatch[1].replace(/"/g, '\\"');
        content = content.replace(
          /"description":\s*"Latihan soal ujian kaigo level N2 介護N2\.[^"]*"/,
          `"description": "${realDesc}"`
        );
      }
      // Fix twitter:title
      content = content.replace(
        /<meta name="twitter:title" content="Quiz Kaigo Level N2 介護N2">/,
        `<meta name="twitter:title" content="${realTitle}">`
      );
      // Fix twitter:description
      if (descMatch) {
        const realDesc = descMatch[1].replace(/"/g, '&quot;');
        content = content.replace(
          /<meta name="twitter:description" content="Latihan soal ujian kaigo level N2 介護N2\.[^"]*">/,
          `<meta name="twitter:description" content="${realDesc}">`
        );
      }
      // Fix og:description
      content = content.replace(
        /<meta property="og:description" content="Latihan soal ujian kaigo level N2 介護N2\.[^"]*">/,
        `<meta property="og:description" content="${descMatch ? descMatch[1] : realTitle}">`
      );
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
      console.log(`✓ Updated: ${fileName}`);
    } else {
      console.log(`  No changes: ${fileName}`);
    }
  } catch (err) {
    errorCount++;
    console.error(`✗ Error processing ${path.basename(filePath)}: ${err.message}`);
  }
}

console.log(`\nDone. Updated: ${updatedCount}, Errors: ${errorCount}, Total: ${files.length}`);
