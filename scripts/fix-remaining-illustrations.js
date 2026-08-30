#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'Materi');

const FIX_MAP = {
  'Kaigo-ICF-Assessment': { file: 'care-process', cat: 'care' },
  'Kaigo-Juukankyo-Seibi': { file: 'home-care', cat: 'care' },
  'Kaigo-Keikan-Eiyo': { file: 'nutrition-diet', cat: 'care' },
  'Kaigo-Koi-Kaijo': { file: 'communication', cat: 'comm' },
  'Kaigo-Kyoshuku-Yobo': { file: 'medical-care', cat: 'medical' },
  'Kaigo-Vital-Sign': { file: 'vital-signs', cat: 'medical' },
};

for (const [moduleName, mapping] of Object.entries(FIX_MAP)) {
  const filePath = path.join(DIR, moduleName + '.html');
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${moduleName}.html`);
    continue;
  }
  
  let html = fs.readFileSync(filePath, 'utf8');
  
  // More robust regex: match div with km-illustration class, then any SVG inside
  const divStart = html.indexOf('<div class="km-illustration"');
  if (divStart === -1) {
    // Try other patterns
    const altStart = html.indexOf("class=\"km-illustration\"");
    if (altStart === -1) {
      console.log(`⚠️  No km-illustration div: ${moduleName}`);
      continue;
    }
  }
  
  // Find the div opening tag
  const divRegex = /<div[^>]*class="[^"]*km-illustration[^"]*"[^>]*>/;
  const divMatch = html.match(divRegex);
  if (!divMatch) {
    console.log(`⚠️  Could not parse div: ${moduleName}`);
    continue;
  }
  
  // Find the closing </div> after the SVG
  const afterDiv = html.indexOf(divMatch[0]) + divMatch[0].length;
  const svgStart = html.indexOf('<svg', afterDiv);
  if (svgStart === -1) {
    console.log(`⚠️  No SVG found: ${moduleName}`);
    continue;
  }
  
  // Find </svg>
  const svgEnd = html.indexOf('</svg>', svgStart);
  if (svgEnd === -1) {
    console.log(`⚠️  No closing SVG: ${moduleName}`);
    continue;
  }
  
  // Find the closing </div> after </svg>
  const afterSvg = html.indexOf('</svg>', svgStart) + 6;
  const closeDiv = html.indexOf('</div>', afterSvg);
  if (closeDiv === -1) {
    console.log(`⚠️  No closing div: ${moduleName}`);
    continue;
  }
  
  // Extract the full illustration block
  const fullBlock = html.substring(divMatch.index, closeDiv + 6);
  
  // Get alt text
  const ariaMatch = fullBlock.match(/aria-label="([^"]*)"/);
  const altText = ariaMatch ? ariaMatch[1] : `Ilustrasi ${moduleName.replace('Kaigo-', '')}`;
  
  // New illustration HTML
  const newIllu = `<div class="km-illustration illu-${mapping.cat}" role="img" aria-label="${altText}">
<img src="../assets/illustrations/${mapping.file}.svg" alt="${altText}" loading="lazy" width="600" height="350">
</div>`;
  
  // Replace
  html = html.substring(0, divMatch.index) + newIllu + html.substring(closeDiv + 6);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✅ ${moduleName} → ${mapping.file}.svg (${mapping.cat})`);
}

console.log('\nDone!');
