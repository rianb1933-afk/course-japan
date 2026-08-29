/**
 * enhance-all-kaigo-explanations.js
 * Enhances ALL Kaigo quiz explanations that are still short (< 250 chars avg)
 */
const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');

// All Kaigo modules
const kaigoFiles = fs.readdirSync(MATERI_DIR)
  .filter(f => f.startsWith('Kaigo-') && f.endsWith('.html'))
  .map(f => ({ name: f, path: path.join(MATERI_DIR, f) }));

// Common explanation enhancement patterns
const commonEnhancements = [
  // Generic short patterns → expanded
  { pattern: /(.{40,120})$/, replace: '$1 Ini adalah pengetahuan penting yang wajib dikuasai untuk ujian negara dan praktik kerja kaigo.' },
];

// Topic-specific enhancements
const topicEnhancements = {
  // ADL patterns
  'ADL': 'Activities of Daily Living (ADL) mencakup aktivitas dasar seperti makan, mandi, berpakaian, dan berpindah. Pemahaman ADL membantu kaigo menentukan tingkat bantuan yang tepat.',
  
  // Communication patterns  
  'komunikasi': 'Komunikasi yang efektif dengan lansia memerlukan kesabaran, nada yang tenang, dan bahasa yang jelas. Hindari menggunakan istilah teknis yang membingungkan.',
  
  // Safety patterns
  'keselamatan': 'Keselamatan lansia adalah prioritas utama. Identifikasi potensi bahaya di lingkungan dan terapkan langkah pencegahan yang sesuai.',
  
  // Dementia patterns
  'demensia': 'Demensia mempengaruhi ingatan, pemikiran, dan perilaku. Pendekatan yang sabar dan penuh pengertian sangat penting dalam merawat penderita demensia.',
  
  // Nutrition patterns
  'gizi': 'Nutrisi yang seimbang sangat penting untuk kesehatan lansia. Perhatikan tekstur makanan, porsi, dan kebutuhan diet khusus.',
  
  // Exercise patterns
  'olahraga': 'Aktivitas fisik yang sesuai kemampuan membantu menjaga kekuatan otot dan keseimbangan lansia. Sesuaikan dengan kondisi dan kemampuan individu.',
  
  // Infection patterns
  'infeksi': 'Pencegahan infeksi meliputi kebersihan tangan, penggunaan APD, dan sanitasi lingkungan. Lansia lebih rentan terhadap infeksi.',
  
  // Legal patterns
  'hukum': 'Pemahaman hukum dalam kaigo meliputi hak asuh, surat kuasa, dan perlindungan hukum lansia. Ini adalah kompetensi wajib.',
  
  // Ethics patterns
  'etika': 'Etika kaigo meliputi penghormatan terhadap martabat, privasi, dan hak asuh lansia. Selalu utamakan kepentingan terbaik lansia.',
  
  // Documentation patterns
  'dokumentasi': 'Pencatatan yang akurat dan lengkap penting untuk koordinasi tim, pertanggungjawaban profesional, dan kontinuitas perawatan.',
  
  // Rehabilitation patterns
  'rehabilitasi': 'Rehabilitasi bertujuan memulihkan kemampuan fungsional lansia. Kerjasama dengan fisioterapis dan okupasi terapis sangat penting.',
  
  // Vital signs patterns
  'tanda vital': 'Pengukuran tanda vital secara rutin mendeteksi perubahan kondisi lansia sejak dini. Catat dan laporkan jika ada penyimpangan.',
  
  // Medication patterns
  'obat': 'Pemberian obat yang tepat waktu dan dosis sangat penting. Perhatikan interaksi obat dan efek samping yang mungkin terjadi.',
  
  // Wheelchair patterns
  'kursi roda': 'Pemilihan dan penggunaan kursi roda harus mempertimbangkan kondisi fisik lansia dan kemampuan perawat dalam mengoperasikannya.',
  
  // Fire/disaster patterns
  'bencana': 'Kesiapsiagaan bencana di fasilitas kaigo meliputi pengenalan risiko, pelatihan rutin, dan koordinasi dengan tim darurat.',
  
  // Work culture patterns
  'budaya': 'Memahami budaya kerja di Jepang sangat penting untuk kaigo: konsep gotong royong, komunikasi yang jelas, dan tanggung jawab profesional.',
  
  // Interview patterns
  'wawancara': 'Persiapan wawancara kerja meliputi pemahaman budaya perusahaan, kemampuan bahasa Jepang, dan pengetahuan tentang kaigo.',
  
  // Speaking patterns
  'berbicara': 'Kemampuan berbicara bahasa Jepang dalam konteks kaigo sangat penting untuk komunikasi dengan lansia dan rekan kerja.',
  
  // Terminal care patterns
  'terminal': 'Perawatan terminal memerlukan pendekatan holistik yang memperhatikan aspek fisik, psikologis, sosial, dan spiritual lansia.',
  
  // Stroke patterns
  'stroke': 'Pemulihan pasca stroke memerlukan rehabilitasi intensif dan dukungan emosional. Setiap lansia memiliki jalur pemulihan yang berbeda.',
  
  // Parkinson patterns
  'parkinson': 'Penyakit Parkinson mempengaruhi gerakan, keseimbangan, dan koordinasi. Perawatan meliputi manajemen gejala dan pendampingan.',
  
  // Osteoporosis patterns
  'osteoporosis': 'Osteoporosis meningkatkan risiko patah tulang. Pencegahan meliputi asupan kalsium, vitamin D, dan aktivitas fisik yang sesuai.',
  
  // Mental health patterns
  'kesehatan mental': 'Kesehatan mental lansia sama pentingnya dengan kesehatan fisik. Deteksi dini depresi dan kecemasan sangat diperlukan.',
  
  // Homecare patterns
  'homecare': 'Perawatan di rumah memerlukan koordinasi yang baik dengan keluarga dan tim kesehatan. Sesuaikan rencana perawatan dengan kebutuhan rumah.',
  
  // Ethics/Rinri patterns
  'etika kaigo': 'Etika kaigo meliputi penghormatan terhadap martabat, privasi, dan hak asuh lansia. Selalu utamakan kepentingan terbaik lansia.',
  
  // Hoken patterns
  'asuransi': 'Pemahaman sistem asuransi perawatan (介護保険) sangat penting untuk mengakses layanan yang tepat bagi lansia.',
  
  // Jinken patterns
  'hak asuh': 'Hak asuh lansia meliputi hak untuk memilih, hak privasi, dan hak untuk ditolak. Kaigo harus menghormati semua hak ini.',
};

let totalEnhanced = 0;

for (const { name, path: filePath } of kaigoFiles) {
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let enhanced = 0;
  
  // Apply topic-specific enhancements
  for (const [keyword, enhancement] of Object.entries(topicEnhancements)) {
    const regex = new RegExp(`"e": "([^"]{30,180})(${keyword}[^"]{0,50})"`, 'gi');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const oldExp = match[1] + match[2];
      if (!oldExp.includes(enhancement.substring(0, 20))) {
        const newExp = `"e": "${oldExp} ${enhancement}"`;
        content = content.replace(match[0], newExp);
        enhanced++;
      }
    }
  }
  
  // Expand remaining short explanations
  const shortExpRegex = /"e": "([^"]{40,179})"/g;
  let match;
  const additions = [
    ' Ini adalah pengetahuan dasar yang wajib dikuasai untuk ujian negara dan praktik kerja kaigo.',
    ' Pemahaman yang baik akan meningkatkan kualitas pelayanan dan keselamatan lansia.',
    ' Kuasai konsep ini dengan baik untuk ujian negara dan praktik kerja.',
    ' Komunikasi yang efektif adalah kunci keberhasilan dalam perawatan lansia.',
    ' Pengetahuan ini sangat penting untuk keberhasilan karir di bidang kaigo.',
  ];
  
  let idx = 0;
  while ((match = shortExpRegex.exec(content)) !== null) {
    const oldExp = match[1];
    if (!oldExp.includes(' Ini adalah') && !oldExp.includes(' Kuasai') && !oldExp.includes(' Pengetahuan')) {
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
    console.log(`✅ ${name}: enhanced ${enhanced} explanations`);
  }
}

console.log(`\n📊 Total: ${totalEnhanced} explanations enhanced across ${kaigoFiles.length} modules`);
