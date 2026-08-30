const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('Materi')
  .filter(f => f.startsWith('Kaigo-') && f.endsWith('.html'))
  .map(f => path.join('Materi', f));

let fixed = 0;
let errors = 0;

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Replace footer inline styles with CSS classes
    if (content.includes('style="background:var(--ink);color:#fff;padding:40px 20px;text-align:center"')) {
      content = content.replace(
        'style="background:var(--ink);color:#fff;padding:40px 20px;text-align:center"',
        'class="kaigo-footer"'
      );
      changed = true;
    }

    // Replace footer link styles
    content = content.replace(
      /style="color:rgba\(255,255,255,\.6\);text-decoration:none"/g,
      'class="kaigo-footer-link"'
    );
    if (content !== fs.readFileSync(file, 'utf8')) changed = true;

    // Replace footer copyright style
    content = content.replace(
      'style="font-size:12px;color:rgba(255,255,255,.4)"',
      'class="kaigo-footer-copy"'
    );
    if (content !== fs.readFileSync(file, 'utf8')) changed = true;

    // Replace footer container style
    content = content.replace(
      'style="max-width:800px;margin:0 auto"',
      'class="kaigo-footer-inner"'
    );
    if (content !== fs.readFileSync(file, 'utf8')) changed = true;

    // Replace footer title style
    content = content.replace(
      'style="font-weight:700;margin-bottom:12px"',
      'class="kaigo-footer-title"'
    );
    if (content !== fs.readFileSync(file, 'utf8')) changed = true;

    // Replace footer links container style
    content = content.replace(
      'style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:12px"',
      'class="kaigo-footer-links"'
    );
    if (content !== fs.readFileSync(file, 'utf8')) changed = true;

    if (changed) {
      fs.writeFileSync(file, content);
      fixed++;
    }
  } catch (e) {
    errors++;
    console.error(`Error fixing ${file}: ${e.message}`);
  }
}

console.log(`Fixed ${fixed} files, ${errors} errors`);
