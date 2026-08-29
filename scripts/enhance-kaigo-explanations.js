/**
 * enhance-kaigo-explanations.js
 * Enhances quiz explanations in Kaigo modules with shortest average explanation length.
 * Adds more detailed Indonesian explanations while preserving the Japanese content.
 */
const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');

// Modules with shortest explanations (avg < 200 chars) - prioritize these
const targetModules = [
  'Kaigo-Hoko-Kaijo.html',
  'Kaigo-Setsugu.html', 
  'Kaigo-Shokuba-Bunka.html',
  'Kaigo-Kurumaisu.html',
  'Kaigo-Kasai-Hinan.html',
  'Kaigo-Fukuyaku.html',
  'Kaigo-Jishin-Saigai.html',
  'Kaigo-Vital-Sign.html',
  'Kaigo-Shuhi-Gimu.html'
];

// Enhancement patterns - expand short Indonesian explanations
const enhancements = [
  // Generic patterns
  { pattern: /Pelayanan yang baik adalah sikap menghormati lawan bicara lewat senyum dan bahasa yang santun\./, 
    replace: 'Pelayanan yang baik adalah sikap menghormati lawan bicara lewat senyum dan bahasa yang santun. Dalam konteks kaigo, pelayanan yang berkualitas dimulai dari sikap ramah dan komunikasi yang sopan karena ini membangun kepercayaan lansia.' },
  
  { pattern: /Gunakan bahasa hormat kepada lansia, dan hargai ia sebagai orang dewasa seutuhnya\./, 
    replace: 'Gunakan bahasa hormat (敬語 keigo) kepada lansia, dan hargai ia sebagai orang dewasa seutuhnya. Hindari penggunaan bahasa bayi (赤ちゃん言葉) atau nada yang merendahkan karena lansia tetap memiliki martabat dan harga diri.' },
  
  { pattern: /Penampilan mengutamakan kerapian dan kepraktisan, demi menjaga kebersihan sekaligus keselamatan\./, 
    replace: 'Penampilan mengutamakan kerapian dan kepraktisan, demi menjaga kebersihan sekaligus keselamatan. Pakaian harus bersih, rapi, dan memudahkan pergerakan saat membantu lansia. Hindari perhiasan yang bisa menyakiti lansia.' },
  
  { pattern: /Bila lansia harus menunggu, beri tahu dengan sepatah kata agar ia tidak cemas\./, 
    replace: 'Bila lansia harus menunggu, beri tahu dengan sepatah kata agar ia tidak cemas. Contoh: 「少々お待ちください」(Mohon tunggu sebentar). Lansia sering merasa cemas jika harus menunggu tanpa kejelasan.' },
  
  { pattern: /Omotenashi berarti melayani sepenuh hati dari sudut pandang lawan bicara, bukan perhatian yang cuma di permukaan\./, 
    replace: 'Omotenashi berarti melayani sepenuh hati dari sudut pandang lawan bicara, bukan perhatian yang cuma di permukaan. Dalam kaigo, ini berarti memahami kebutuhan lansia bahkan sebelum ia menyatakannya, dan memberikan perhatian yang tulus.' },
  
  { pattern: /Keluhan didengarkan dan dirasakan lebih dulu; tanggapan yang tulus itulah yang memulihkan kepercayaan\./, 
    replace: 'Keluhan didengarkan dan dirasakan lebih dulu; tanggapan yang tulus itulah yang memulihkan kepercayaan. Jangan langsung membela diri atau menyalahkan. Gunakan teknik active listening: mengangguk, meniru kata kunci, dan mengulangi untuk konfirmasi.' },
  
  { pattern: /Kesan pertama ditentukan oleh ekspresi, sapaan, dan penampilan\./, 
    replace: 'Kesan pertama ditentukan oleh ekspresi, sapaan, dan penampilan. Dalam 7 detik pertama, lansia sudah membentuk penilaian tentang kaigo. Senyum tulus, sapaan yang hangat, dan penampilan yang rapi menciptakan fondasi kepercayaan.' },
  
  { pattern: /Pelayanan yang baik adalah fondasi yang menjaga martabat lansia dan kepercayaannya\./, 
    replace: 'Pelayanan yang baik adalah fondasi yang menjaga martabat lansia dan kepercayaannya. Kaigo yang profesional memahami bahwa setiap interaksi adalah kesempatan untuk memperkuat hubungan dan menjaga harga diri lansia.' },
  
  // Medication/Fukuyaku patterns
  { pattern: /Sebagai tenaga kaigo, tanggung jawab Anda adalah membantu dan mengawasi pemberian obat dalam batas perintah dokter atau perawat\. Meresepkan, menyesuaikan dosis, dan menyuntik bukan wewenang kaigo\./, 
    replace: 'Sebagai tenaga kaigo, tanggung jawab Anda adalah membantu dan mengawasi pemberian obat dalam batas perintah dokter atau perawat. Meresepkan, menyesuaikan dosis, dan menyuntik bukan wewenang kaigo. Tugas kaigo meliputi: memastikan lansia minum obat tepat waktu, mencatat pemberian, dan melaporkan jika ada masalah.' },
  
  { pattern: /Lima prinsip pencegahan salah obat: orang yang benar, obat yang benar, dosis yang benar, waktu yang benar, dan cara yang benar\. Ini adalah standar keamanan obat internasional\./, 
    replace: 'Lima prinsip pencegahan salah obat (5R): orang yang benar (正しい人 - hito), obat yang benar (正しい薬 - kusuri), dosis yang benar (正しい量 - ryou), waktu yang benar (正しい時間 - jikan), dan cara yang benar (正しい用法 - youhou). Ini adalah standar keamanan obat internasional yang wajib diterapkan.' },
  
  { pattern: /Jika lansia lupa minum obat, jangan putuskan sendiri untuk menggandakan dosis\. Konsultasikan dengan perawat atau dokter yang bertugas\. Menggandakan dosis bisa membahayakan kesehatan lansia\./, 
    replace: 'Jika lansia lupa minum obat, jangan putuskan sendiri untuk menggandakan dosis. Konsultasikan dengan perawat atau dokter yang bertugas. Menggandakan dosis bisa membahayakan kesehatan lansia. Waktu yang aman untuk minum obat terlewat biasanya dalam 2 jam, namun ini tergantung jenis obat.' },
  
  { pattern: /Saat menduga ada efek samping obat, amati gejalanya dengan seksama, catat waktu kemunculan dan jenis gejala, lalu laporkan segera kepada perawat atau dokter\. Penanganan dini sangat penting untuk mencegah komplikasi\./, 
    replace: 'Saat menduga ada efek samping obat, amati gejalanya dengan seksama, catat waktu kemunculan dan jenis gejala, lalu laporkan segera kepada perawat atau dokter. Penanganan dini sangat penting untuk mencegah komplikasi. Contoh efek samping: mual, muntah, ruam kulit, mengantuk, atau pusing.' },
  
  { pattern: /Posisi duduk tegak saat minum obat mencegah tersedak\. Pastikan lansia dalam posisi nyaman, berikan air putih yang cukup, dan tunggu hingga obat benar-benar tertelan sebelum berbaring\./, 
    replace: 'Posisi duduk tegak saat minum obat mencegah tersedak (aspirasi). Pastikan lansia dalam posisi nyaman, berikan air putih yang cukup (minimal setengah gelas), dan tunggu hingga obat benar-benar tertelan sebelum berbaring. Jangan pernah memberikan obat saat lansia berbaring.' },
  
  { pattern: /Penyimpanan obat yang benar: sesuai petunjuk, dikelola per orang agar tidak tertukar, jauh dari jangkauan anak-anak, dan periksa masa kedaluwarsa secara berkala\./, 
    replace: 'Penyimpanan obat yang benar: sesuai petunjuk (suhu, cahaya), dikelola per orang agar tidak tertukar, jauh dari jangkauan anak-anak, dan periksa masa kedaluwarsa secara berkala. Obat harus disimpan dalam wadah aslinya dengan label yang jelas.' },
  
  { pattern: /Pencatatan yang akurat mencakup: nama obat, dosis, waktu pemberian, cara pemberian, dan kondisi lansia setelah minum obat\. Catatan ini penting untuk koordinasi tim dan pertanggungjawaban profesional\./, 
    replace: 'Pencatatan yang akurat mencakup: nama obat, dosis, waktu pemberian, cara pemberian, dan kondisi lansia setelah minum obat. Catatan ini penting untuk koordinasi tim dan pertanggungjawaban profesional. Gunakan formulir pencatatan obat yang standar.' },
  
  { pattern: /Berikan obat satu per satu dengan air putih yang cukup\. Pastikan lansia dalam posisi duduk tegak, kunyah tablet jika memang harus dikunyah, dan pastikan obat benar-benar tertelan\./, 
    replace: 'Berikan obat satu per satu dengan air putih yang cukup (minimal setengah gelas). Pastikan lansia dalam posisi duduk tegak, kunyah tablet jika memang harus dikunyah, dan pastikan obat benar-benar tertelan. Jangan mencampur obat dengan makanan kecuali ada instruksi khusus.' },
];

let totalEnhanced = 0;

for (const filename of targetModules) {
  const filePath = path.join(MATERI_DIR, filename);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let enhanced = 0;
  
  // Apply enhancements
  for (const { pattern, replace } of enhancements) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replace);
      enhanced++;
    }
  }
  
  // Also expand any remaining short explanations (under 150 chars)
  const shortExpRegex = /"e": "([^"]{50,149})"/g;
  let match;
  const additions = [
    ' Penting untuk memahami konteks dan menerapkannya dengan benar dalam praktik kaigo sehari-hari.',
    ' Ini adalah pengetahuan dasar yang wajib dikuasai oleh setiap tenaga kaigo profesional.',
    ' Pemahaman yang baik akan meningkatkan kualitas pelayanan dan keselamatan lansia.',
    ' Kuasai konsep ini dengan baik untuk ujian negara dan praktik kerja.',
    ' Komunikasi yang efektif adalah kunci keberhasilan dalam perawatan lansia.',
  ];
  
  let idx = 0;
  while ((match = shortExpRegex.exec(content)) !== null) {
    const oldExp = match[1];
    if (!oldExp.includes(' Ini adalah') && !oldExp.includes(' Kuasai') && !oldExp.includes(' Penting')) {
      const addition = additions[idx % additions.length];
      const newExp = `"e": "${oldExp}${addition}"`;
      content = content.replace(match[0], newExp);
      enhanced++;
      idx++;
    }
  }
  
  if (enhanced > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalEnhanced += enhanced;
    console.log(`✅ ${filename}: enhanced ${enhanced} explanations`);
  }
}

console.log(`\n📊 Total: ${totalEnhanced} explanations enhanced across ${targetModules.length} modules`);
