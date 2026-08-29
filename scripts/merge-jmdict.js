/**
 * merge-jmdict.js — Parse JMdict XML and merge with existing vocab-all.csv
 * 
 * JMdict XML structure:
 * <entry>
 *   <ent_seq>1000010</ent_seq>
 *   <k_ele><keb>明日</keb></k_ele>
 *   <r_ele><reb>あした</reb></r_ele>
 *   <sense>
 *     <gloss>tomorrow</gloss>
 *   </sense>
 * </entry>
 */

const fs = require('fs');
const path = require('path');

const JMDICT_PATH = path.join(__dirname, '..', 'assets', 'JMdict');
const CSV_PATH = path.join(__dirname, '..', 'assets', 'vocab-all.csv');

// ═══════════════════════════════════════════════════════════════════
// ENGLISH → INDONESIAN TRANSLATION MAP (common words)
// ═══════════════════════════════════════════════════════════════════

const EN_ID_MAP = {
  // Common words
  'tomorrow': 'besok', 'yesterday': 'kemarin', 'today': 'hari ini',
  'morning': 'pagi', 'evening': 'malam', 'night': 'malam',
  'afternoon': 'siang', 'noon': 'tengah hari',
  'hello': 'halo', 'goodbye': 'selamat tinggal', 'thanks': 'terima kasih',
  'please': 'tolong', 'sorry': 'maaf', 'yes': 'ya', 'no': 'tidak',
  'water': 'air', 'food': 'makanan', 'drink': 'minuman',
  'house': 'rumah', 'school': 'sekolah', 'hospital': 'rumah sakit',
  'station': 'stasiun', 'airport': 'bandara', 'hotel': 'hotel',
  'restaurant': 'restoran', 'shop': 'toko', 'bank': 'bank',
  'post office': 'kantor pos', 'library': 'perpustakaan', 'park': 'taman',
  'city': 'kota', 'country': 'negara', 'world': 'dunia',
  'person': 'orang', 'man': 'pria', 'woman': 'wanita', 'child': 'anak',
  'friend': 'teman', 'teacher': 'guru', 'doctor': 'dokter',
  'student': 'siswa', 'worker': 'pekerja', 'family': 'keluarga',
  'father': 'ayah', 'mother': 'ibu', 'brother': 'saudara laki-laki',
  'sister': 'saudara perempuan', 'son': 'anak laki-laki', 'daughter': 'anak perempuan',
  'head': 'kepala', 'eye': 'mata', 'ear': 'telinga', 'mouth': 'mulut',
  'nose': 'hidung', 'hand': 'tangan', 'foot': 'kaki', 'body': 'tubuh',
  'face': 'wajah', 'hair': 'rambut', 'tooth': 'gigi',
  'heart': 'hati', 'blood': 'darah', 'bone': 'tulang',
  'big': 'besar', 'small': 'kecil', 'new': 'baru', 'old': 'lama/tua',
  'good': 'baik', 'bad': 'buruk', 'hot': 'panas', 'cold': 'dingin',
  'fast': 'cepat', 'slow': 'lambat', 'easy': 'mudah', 'difficult': 'sulit',
  'many': 'banyak', 'few': 'sedikit', 'all': 'semua', 'nothing': 'tidak ada',
  'eat': 'makan', 'drink': 'minum', 'sleep': 'tidur', 'wake': 'bangun',
  'go': 'pergi', 'come': 'datang', 'return': 'kembali', 'leave': 'pergi',
  'see': 'melihat', 'look': 'melihat', 'hear': 'mendengar', 'listen': 'mendengarkan',
  'speak': 'berbicara', 'talk': 'berbicara', 'read': 'membaca', 'write': 'menulis',
  'buy': 'membeli', 'sell': 'menjual', 'give': 'memberi', 'take': 'mengambil',
  'open': 'membuka', 'close': 'menutup', 'start': 'memulai', 'end': 'mengakhiri',
  'work': 'bekerja', 'study': 'belajar', 'teach': 'mengajar', 'learn': 'belajar',
  'think': 'berpikir', 'know': 'tahu', 'understand': 'mengerti', 'forget': 'lupa',
  'remember': 'ingat', 'want': 'ingin', 'need': 'perlu', 'can': 'bisa',
  'must': 'harus', 'may': 'boleh', 'try': 'mencoba', 'make': 'membuat',
  'do': 'melakukan', 'use': 'menggunakan', 'put': 'meletakkan', 'get': 'mendapatkan',
  'one': 'satu', 'two': 'dua', 'three': 'tiga', 'four': 'empat', 'five': 'lima',
  'six': 'enam', 'seven': 'tujuh', 'eight': 'delapan', 'nine': 'sembilan', 'ten': 'sepuluh',
  'red': 'merah', 'blue': 'biru', 'green': 'hijau', 'yellow': 'kuning',
  'white': 'putih', 'black': 'hitam', 'pink': 'merah muda',
  'spring': 'musim semi', 'summer': 'musim panas', 'autumn': 'musim gugur', 'winter': 'musim dingin',
  'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
  'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu',
  'January': 'Januari', 'February': 'Februari', 'March': 'Maret',
  'April': 'April', 'May': 'Mei', 'June': 'Juni',
  'July': 'Juli', 'August': 'Agustus', 'September': 'September',
  'October': 'Oktober', 'November': 'November', 'December': 'Desember',
  'year': 'tahun', 'month': 'bulan', 'week': 'minggu', 'day': 'hari',
  'hour': 'jam', 'minute': 'menit', 'second': 'detik',
  'time': 'waktu', 'place': 'tempat', 'thing': 'barang',
  'money': 'uang', 'price': 'harga', 'cheap': 'murah', 'expensive': 'mahal',
  'right': 'benar/kanan', 'wrong': 'salah', 'left': 'kiri',
  'up': 'atas', 'down': 'bawah', 'front': 'depan', 'back': 'belakang',
  'inside': 'dalam', 'outside': 'luar', 'near': 'dekat', 'far': 'jauh',
  'before': 'sebelum', 'after': 'sesudah', 'here': 'di sini', 'there': 'di sana',
  'now': 'sekarang', 'always': 'selalu', 'never': 'tidak pernah', 'sometimes': 'kadang-kadang',
  'very': 'sangat', 'also': 'juga', 'only': 'hanya', 'already': 'sudah',
  'not yet': 'belum', 'again': 'lagi', 'more': 'lebih', 'less': 'kurang',
  'love': 'cinta', 'like': 'suka', 'hate': 'benci', 'happy': 'senang',
  'sad': 'sedih', 'angry': 'marah', 'scared': 'takut', 'tired': 'lelah',
  'sick': 'sakit', 'healthy': 'sehat', 'alive': 'hidup', 'dead': 'mati',
  'beautiful': 'cantik', 'ugly': 'jelek', 'strong': 'kuat', 'weak': 'lemah',
  'long': 'panjang', 'short': 'pendek', 'wide': 'lebar', 'narrow': 'sempit',
  'heavy': 'berat', 'light': 'ringan/terang', 'dark': 'gelap', 'bright': 'terang',
  'clean': 'bersih', 'dirty': 'kotor', 'dry': 'kering', 'wet': 'basah',
  'safe': 'aman', 'dangerous': 'berbahaya', 'important': 'penting', 'necessary': 'perlu',
  'possible': 'mungkin', 'impossible': 'tidak mungkin', 'same': 'sama', 'different': 'berbeda',
  'correct': 'benar', 'usual': 'biasa', 'special': 'istimewa', 'normal': 'normal',
  'enough': 'cukup', 'empty': 'kosong', 'full': 'penuh', 'complete': 'lengkap',
  'first': 'pertama', 'last': 'terakhir', 'next': 'berikutnya', 'previous': 'sebelumnya',
  'early': 'awal', 'late': 'terlambat', 'quickly': 'cepat', 'slowly': 'perlahan',
  'together': 'bersama', 'alone': 'sendiri', 'other': 'lain', 'every': 'setiap',
  'each': 'masing-masing', 'both': 'kedua', 'another': 'yang lain',
  'north': 'utara', 'south': 'selatan', 'east': 'timur', 'west': 'barat',
  'rain': 'hujan', 'snow': 'salju', 'wind': 'angin', 'cloud': 'awan',
  'sun': 'matahari', 'moon': 'bulan', 'star': 'bintang', 'sky': 'langit',
  'sea': 'laut', 'river': 'sungai', 'mountain': 'gunung', 'forest': 'hutan',
  'tree': 'pohon', 'flower': 'bunga', 'bird': 'burung', 'fish': 'ikan',
  'dog': 'anjing', 'cat': 'kucing', 'horse': 'kuda', 'cow': 'sapi',
  'chicken': 'ayam', 'pig': 'babi', 'rabbit': 'kelinci',
  'book': 'buku', 'pen': 'pensil', 'paper': 'kertas', 'bag': 'tas',
  'key': 'kunci', 'clock': 'jam', 'phone': 'telepon', 'computer': 'komputer',
  'television': 'televise', 'radio': 'radio', 'camera': 'kamera',
  'car': 'mobil', 'bus': 'bus', 'train': 'kereta api', 'bicycle': 'sepeda',
  'airplane': 'pesawat', 'ship': 'kapal', 'taxi': 'taksi',
  'clothes': 'pakaian', 'shoes': 'sepatu', 'hat': 'topi', 'umbrella': 'payung',
  ' medicine': 'obat', 'disease': 'penyakit', 'fever': 'demam', 'pain': 'sakit',
  'doctor': 'dokter', 'nurse': 'perawat', 'medicine': 'obat', 'hospital': 'rumah sakit',
  'test': 'tes', 'exam': 'ujian', 'score': 'nilai', 'grade': 'nilai',
  'lesson': 'pelajaran', 'class': 'kelas', 'homework': 'PR',
  'question': 'pertanyaan', 'answer': 'jawaban', 'problem': 'masalah',
  'solution': 'solusi', 'reason': 'alasan', 'result': 'hasil',
  'history': 'sejarah', 'science': 'sains', 'math': 'matematika',
  'music': 'musik', 'art': 'seni', 'sport': 'olahraga',
  'game': 'permainan', 'movie': 'film', 'book': 'buku', 'story': 'cerita',
  'news': 'berita', 'weather': 'cuaca', 'season': 'musim',
  'country': 'negara', 'city': 'kota', 'village': 'desa',
  'road': 'jalan', 'bridge': 'jembatan', 'building': 'gedung',
  'room': 'ruangan', 'door': 'pintu', 'window': 'jendela',
  'table': 'meja', 'chair': 'kursi', 'bed': 'tempat tidur',
  'kitchen': 'dapur', 'bathroom': 'kamar mandi', 'garden': 'taman',
  'wall': 'tembok', 'floor': 'lantai', 'ceiling': 'langit-langit',
  'light': 'cahaya/lampu', 'sound': 'suara', 'color': 'warna',
  'shape': 'bentuk', 'size': 'ukuran', 'number': 'angka',
  'word': 'kata', 'language': 'bahasa', 'letter': 'surat/huruf',
  'name': 'nama', 'age': 'umur', 'height': 'tinggi', 'weight': 'berat',
  'left': 'kiri', 'right': 'kanan', 'straight': 'lurus',
  'turn': 'belok', 'pass': 'lewat', 'cross': 'menyeberang',
  'wait': 'tunggu', 'stop': 'berhenti', 'hurry': 'cepat',
  'walk': 'berjalan', 'run': 'berlari', 'swim': 'berenang', 'fly': 'terbang',
  'climb': 'memanjat', 'fall': 'jatuh', 'jump': 'melompat',
  'dance': 'menari', 'sing': 'bernyanyi', 'play': 'bermain',
  'cook': 'memasak', 'wash': 'mencuci', 'clean': 'membersihkan',
  'build': 'membangun', 'break': 'memecah', 'cut': 'memotong',
  'draw': 'menggambar', 'paint': 'melukis', 'print': 'mencetak',
  'copy': 'menyalin', 'paste': 'menempel', 'delete': 'menghapus',
  'save': 'menyimpan', 'load': 'memuat', 'send': 'mengirim',
  'receive': 'menerima', 'call': 'menelepon', 'answer': 'menjawab',
  'help': 'membantu', 'serve': 'melayani', 'support': 'mendukung',
  'protect': 'melindungi', 'defend': 'mempertahankan', 'attack': 'menyerang',
  'fight': 'bertarung', 'win': 'menang', 'lose': 'kalah',
  'draw': 'seri', 'tie': 'seri', 'compete': 'bersaing',
  'team': 'tim', 'player': 'pemain', 'coach': 'pelatih',
  'game': 'permainan', 'match': 'pertandingan', 'score': 'skor',
  'goal': 'gol', 'point': 'poin', 'prize': 'hadiah',
  'award': 'penghargaan', 'medal': 'medali', 'trophy': 'trofi',
};

// ═══════════════════════════════════════════════════════════════════
// SIMPLE ENGLISH → INDONESIAN TRANSLATOR
// ═══════════════════════════════════════════════════════════════════

function translateToIndonesian(english) {
  if (!english) return '';
  
  // Try exact match first
  const lower = english.toLowerCase().trim();
  if (EN_ID_MAP[lower]) return EN_ID_MAP[lower];
  
  // Try partial match
  for (const [en, id] of Object.entries(EN_ID_MAP)) {
    if (lower.includes(en) || en.includes(lower)) {
      return id;
    }
  }
  
  // Return original English as fallback
  return english;
}

// ═══════════════════════════════════════════════════════════════════
// CSV UTILITIES
// ═══════════════════════════════════════════════════════════════════

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function csvEscape(value) {
  const str = String(value || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ═══════════════════════════════════════════════════════════════════
// PARSE JMDICT XML (streaming for memory efficiency)
// ═══════════════════════════════════════════════════════════════════

function parseJmdict() {
  console.log('Reading JMdict XML...');
  const xml = fs.readFileSync(JMDICT_PATH, 'utf8');
  console.log(`XML size: ${(xml.length / 1024 / 1024).toFixed(1)} MB`);
  
  const entries = [];
  let count = 0;
  
  // Split by <entry> tags
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    count++;
    if (count % 50000 === 0) {
      console.log(`  Processed ${count} entries...`);
    }
    
    const entryXml = match[1];
    
    // Extract kanji
    const kebMatch = entryXml.match(/<keb>([^<]+)<\/keb>/);
    const kanji = kebMatch ? kebMatch[1] : '';
    
    // Extract reading
    const rebMatch = entryXml.match(/<reb>([^<]+)<\/reb>/);
    const reading = rebMatch ? rebMatch[1] : '';
    
    // Extract English glosses
    const glossMatches = [...entryXml.matchAll(/<gloss[^>]*>([^<]+)<\/gloss>/g)];
    const englishMeanings = glossMatches.map(m => m[1].trim()).filter(Boolean);
    
    if (kanji && reading && englishMeanings.length > 0) {
      // Take first 3 meanings
      const meaningEn = englishMeanings.slice(0, 3).join('; ');
      const meaningId = translateToIndonesian(meaningEn);
      
      entries.push({
        expression: kanji,
        reading: reading,
        meaning: meaningId || meaningEn,
        meaningEn: meaningEn,
        level: 'JMdict'
      });
    }
  }
  
  console.log(`Total JMdict entries parsed: ${entries.length}`);
  return entries;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

console.log('=== JMdict Merge Script ===\n');

// 1. Parse JMdict
const jmdictEntries = parseJmdict();

// 2. Load existing vocab
console.log('\nLoading existing vocab-all.csv...');
const existingCsv = fs.readFileSync(CSV_PATH, 'utf8');
const existingLines = existingCsv.split('\n').filter(l => l.trim());
console.log(`Existing entries: ${existingLines.length - 1}`);

// 3. Build merged vocabulary
const merged = new Map();

// Add existing vocab first (highest priority)
for (let i = 1; i < existingLines.length; i++) {
  const parts = parseCsvLine(existingLines[i]);
  if (parts.length >= 5) {
    const expression = parts[0];
    const reading = parts[1];
    const romaji = parts[2];
    const meaning = parts[4] || parts[3];
    const tags = parts[5] || '';
    
    if (expression && meaning) {
      merged.set(expression, { 
        expression, reading, romaji, 
        meaning: meaning.replace(/"/g, ''), 
        tags 
      });
    }
  }
}

console.log(`\nExisting unique entries: ${merged.size}`);

// Add JMdict entries
let jmdictAdded = 0;
for (const entry of jmdictEntries) {
  if (!merged.has(entry.expression)) {
    merged.set(entry.expression, {
      expression: entry.expression,
      reading: entry.reading,
      romaji: '',
      meaning: entry.meaning,
      tags: 'JMdict'
    });
    jmdictAdded++;
  }
}

console.log(`JMdict entries added: ${jmdictAdded}`);
console.log(`Total unique entries: ${merged.size}`);

// 4. Write CSV
console.log('\nWriting vocab-all.csv...');
const csvHeader = 'expression,reading,romaji,meaning,meaning_id,tags';
const csvRows = Array.from(merged.values()).map(v => {
  return [
    csvEscape(v.expression),
    csvEscape(v.reading),
    csvEscape(v.romaji || ''),
    csvEscape(v.meaning),
    csvEscape(v.meaning),
    csvEscape(v.tags)
  ].join(',');
});

const csvContent = csvHeader + '\n' + csvRows.join('\n') + '\n';
fs.writeFileSync(CSV_PATH, csvContent, 'utf8');

console.log('\n=== MERGE COMPLETE ===');
console.log(`Total entries: ${merged.size}`);
console.log(`File size: ${(Buffer.byteLength(csvContent) / 1024 / 1024).toFixed(2)} MB`);
console.log(`Output: ${CSV_PATH}`);

// 5. Cleanup - remove JMdict XML (keep .gz for reference)
console.log('\nCleaning up...');
try {
  fs.unlinkSync(JMDICT_PATH);
  console.log('Removed JMdict XML (kept .gz)');
} catch(e) {}
