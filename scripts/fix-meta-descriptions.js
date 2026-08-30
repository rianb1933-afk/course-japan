const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('Materi')
  .filter(f => f.startsWith('Kaigo-') && f.endsWith('.html'))
  .map(f => path.join('Materi', f));

let fixed = 0;

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const basename = path.basename(file, '.html');
    
    // Generate meaningful description from filename
    const topic = basename.replace('Kaigo-', '').replace(/-/g, ' ');
    const titleMatch = content.match(/<h1[^>]*>([^<]+)/);
    const title = titleMatch ? titleMatch[1].trim() : topic;
    
    const description = `Modul lengkap ${title}: kosakata, dialog, dan latihan soal untuk ujian 介護福祉士. Pelajari istilah penting kaigo dalam bahasa Jepang.`;
    
    // Replace the bad meta description
    content = content.replace(
      /<meta name="description" content="#[0-9a-fA-F]{6}">/,
      `<meta name="description" content="${description}">`
    );
    
    // Also fix og:description if it has the same issue
    content = content.replace(
      /<meta property="og:description" content="#[0-9a-fA-F]{6}">/,
      `<meta property="og:description" content="${description}">`
    );
    
    // Also fix twitter:description
    content = content.replace(
      /<meta name="twitter:description" content="#[0-9a-fA-F]{6}">/,
      `<meta name="twitter:description" content="${description}">`
    );
    
    fs.writeFileSync(file, content);
    fixed++;
  } catch (e) {
    console.error(`Error: ${file}: ${e.message}`);
  }
}

console.log(`Fixed ${fixed} meta descriptions`);
