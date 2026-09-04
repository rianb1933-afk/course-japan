// fix-jlpt-glosses.js — Perbaiki glos Indonesia baris JLPT yang lahir dari
// terjemahan salah-sense (bukan terjemahan sungguhan), mengikuti konvensi
// scripts/repair_jmdict_meanings.py: "Inggris yang benar lebih berguna
// daripada Indonesia yang keliru".
//
// Masalah
// -------
// Commit 723db0d memperbaiki 165.002 entri bertag JMdict (substring-match bug)
// tapi MEMBIARKAN entri bertag JLPT/Genki (11.802) dengan anggapan itu tulisan
// manusia. Audit acak menunjukkan ~65% di antaranya salah-sense:
//
//     急ぐ   "to hurry"      → "ada; menjadi"
//     手紙   "letter"        → "karakter"          (letter = huruf)
//     文句   "complaint"     → "sebuah; suatu"
//     書類   "document"      → "disclosure"
//     閉じる "to close"      → "buku"              (close = tutup buku)
//     楽屋   "green room"    → "hijau; di belakang panggung"
//     電気   "electricity"   → "ringan"            (light)
//     では   "well then..."  → "sumur"             (well)
//
// Perbaikan
// ---------
// - Kata yang TERBUKTI benar (kurasi tabel/pool kanji + daftar manual hasil
//   audit) → glos Indonesianya DIPERTAHANKAN bahkan dinaikkan ke versi kurasi.
// - Kata lain yang ada di JMdict → diganti glos Inggris asli (≤3 glos),
//   meaning_id dikosongkan sebagai penanda "belum diterjemahkan",
//   tag JLPT dipertahankan (tetap terfilter per level) + ditambah JMdict-EN.
// - Kata tanpa entri JMdict (partikel/pola) → tidak disentuh.
//
// Pemakaian
// ---------
//     node scripts/fix-jlpt-glosses.js --check
//     node scripts/fix-jlpt-glosses.js
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const CSV = path.join(ROOT, 'assets', 'vocab-all.csv');
const JMDICT = path.join(ROOT, 'assets', 'JMdict.gz');

// ── parser CSV kutip-aware ──
function parseCSV(text) {
  const rows = []; let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else field += c;
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

// ── glos Inggris JMdict: indeks SEMUA keb/reb agar baris kana ikut tertangkap ──
function bacaJMDictEN() {
  const xml = zlib.gunzipSync(fs.readFileSync(JMDICT)).toString('utf8');
  const map = new Map();
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const keys = [...e.matchAll(/<(?:keb|reb)>([^<]+)<\/(?:keb|reb)>/g)].map(x => x[1]);
    const glos = (e.match(/<gloss>([^<]+)<\/gloss>/g) || []).map(g => g.replace(/<\/?gloss>/g, '').trim());
    if (!keys.length || !glos.length) continue;
    for (const k of keys) if (!map.has(k)) map.set(k, glos);
  }
  return map;
}

// ── korpus kurasi: kata → glos Indonesia TERVERIFIKASI ──
// HANYA dari sumber tulisan tangan: tabel rawKanji N4 & array N5 asli
// (BUKAN blob rawKanji N3/N2/N1 hasil generator — contoh katanya menyalin
// vocab-all sehingga ikut terkontaminasi), plus pasangan kata(reading)=arti
// dan 'kata = arti' dari kqPool kurasi N1-N5.
function bacaKurasi() {
  const trusted = new Map(); // word → gloss ID
  const add = (w, m) => {
    if (!w || !m || trusted.has(w)) return;
    if (!/[a-zà-ÿ]/i.test(m) || /[ぁ-んァ-ン]/.test(m)) return; // bukan glos Indonesia
    trusted.set(w, m.trim());
  };
  const tabel = [['Kanji-N4', 'raw'], ['Kanji-N5', 'n5']];
  for (const [name, tipe] of tabel) {
    const p = path.join(ROOT, 'Materi', name + '.html');
    if (!fs.existsSync(p)) continue;
    const h = fs.readFileSync(p, 'utf8');
    if (tipe === 'raw') {
      const rm = h.match(/const rawKanji = `([\s\S]*?)`;/);
      if (rm) for (const line of rm[1].trim().split('\n')) {
        const c = line.split('|');
        if (c.length >= 7) add(c[4], c[6]);
      }
    } else {
      const am = h.match(/const kanjiN5 = \[([\s\S]*?)\];/);
      if (am) for (const row of am[1].matchAll(/\[[^\]]*\]/g)) {
        const c = row[0].match(/'([^']*)'/g) || [];
        if (c.length >= 7) add(c[4].slice(1, -1), c[6].slice(1, -1));
      }
    }
  }
  // kqPool kurasi (semua halaman) — pasangan kata + arti ditulis tangan
  for (const name of ['Kanji-N1', 'Kanji-N2', 'Kanji-N3', 'Kanji-N4', 'Kanji-N5']) {
    const p = path.join(ROOT, 'Materi', name + '.html');
    if (!fs.existsSync(p)) continue;
    const h = fs.readFileSync(p, 'utf8');
    for (const x of h.matchAll(/([\u4e00-\u9fff]{2,4})\(([^()]{1,14})\)=([^,'\]]{2,60})/g)) add(x[1], x[3].trim());
    for (const x of h.matchAll(/'([\u4e00-\u9fff]{2,4}) = ([^',]{2,60})/g)) add(x[1], x[2].trim());
  }
  return trusted;
}

// Daftar manual hasil audit: kata dengan glos Indonesia yang memang benar.
const MANUAL_GOOD = {
  '仕事': 'pekerjaan', '募集': 'rekrutmen; perekrutan', '使う': 'menggunakan', '止まる': 'berhenti',
  '手袋': 'sarung tangan', '手': 'tangan', '意味': 'arti; makna', '皿': 'piring', '雪': 'salju',
  '入る': 'masuk', '金曜日': 'Jumat', '夏': 'musim panas', 'クラス': 'kelas', '万': 'sepuluh ribu',
  '下痢': 'diare', '貿易': 'perdagangan', '田舎': 'pedesaan', '起点': 'titik awal', '大工': 'tukang kayu',
  '定める': 'menetapkan; memutuskan', '模索': 'meraba-raba; mencari', '心理': 'keadaan jiwa; psikologi',
  '解剖': 'pembedahan; bedah', '筋': 'otot; urat', '危険性': 'tingkat bahaya', 'ばらまく': 'menyebarkan',
  'あるく': 'berjalan kaki', '行く': 'pergi', '来る': 'datang', '見る': 'melihat', '食べる': 'makan',
  '飲む': 'minum', '買う': 'membeli', '売る': 'menjual', '書く': 'menulis', '読む': 'membaca',
  '聞く': 'mendengar', '話す': 'berbicara', '会う': 'bertemu', '教える': 'mengajar', '習う': 'belajar',
  '待つ': 'menunggu', '持つ': 'memegang; membawa', '知る': 'mengetahui', '思う': 'berpikir', '作る': 'membuat',
  '働く': 'bekerja', '住む': 'tinggal', '帰る': 'pulang', '始まる': 'dimulai', '終わる': 'berakhir',
  '開く': 'membuka', '閉める': 'menutup', '起きる': 'bangun', '寝る': 'tidur', '遊ぶ': 'bermain',
  '泳ぐ': 'berenang', '走る': 'berlari', '歩く': 'berjalan kaki', '飛ぶ': 'terbang', '乗る': 'naik',
  '降りる': 'turun', '着く': 'tiba', '出る': 'keluar', '入れる': 'memasukkan', '渡す': 'menyerahkan; menyeberangkan',
  '急ぐ': 'bergegas; terburu-buru', '違う': 'berbeda', '留守': 'tidak di rumah', '文句': 'keluhan; protes',
  '毎週': 'setiap minggu', '晩御飯': 'makan malam', '考える': 'berpikir; mempertimbangkan', '書類': 'dokumen',
  '先輩': 'senior; kakak tingkat', '将来': 'masa depan', '黒': 'hitam', '黒い': 'hitam',
  '電気': 'listrik', '天気': 'cuaca', '手紙': 'surat', '電話': 'telepon', '出口': 'pintu keluar',
  '時計': 'jam; arloji', '十日': 'tanggal sepuluh', '遠い': 'jauh', 'トイレ': 'toilet; kamar kecil',
  'どうも': 'terima kasih; halo (sapaan)', '教書': 'pesan resmi (presiden/gubernur)', '金貨': 'koin emas',
  '裏面': 'sisi belakang; bagian belakang', '楽屋': 'ruang ganti (pemain); belakang panggung', '票': 'suara; surat suara',
  '発電': 'pembangkit listrik', '原形': 'bentuk asli', '態勢': 'sikap; kesiapan', '名字': 'nama keluarga',
  '青年': 'pemuda', '余暇': 'waktu luang', '減免': 'pengurangan dan pembebasan (pajak)', '祈願': 'doa permohonan',
  '疑問点': 'hal yang tidak jelas; keraguan', '裏': 'bagian belakang; sisi dalam', '特殊': 'khusus',
  '先天的': 'bawaan sejak lahir', '閉じる': 'menutup', '一月': 'satu bulan', '外(ほか)': 'lain',
  'カムバック': 'kemunculan kembali', '挿す': 'menyisipkan; memasukkan', '短気': 'pemarah; cepat marah',
  '晩年': 'masa tua; tahun-tahun terakhir', '冷凍': 'pembekuan', '小僧': 'anak laki-laki; bocah',
  '冠': 'mahkota', '行程': 'perjalanan; jarak tempuh', '特別養護老人ホーム': 'panti jompo perawatan intensif',
  '氏': 'nama keluarga; klan', '統': 'memerintah; menyatukan', '基': 'dasar; pondasi', '価': 'nilai; harga',
  '提': 'mengajukan', '挙': 'mengangkat; mengajukan', '応': 'menanggapi', '検': 'memeriksa',
  '証': 'bukti; kesaksian', '援': 'dukungan; bantuan', '護': 'melindungi', '視': 'memandang; melihat',
  '裁': 'mengadili; memutuskan', '救': 'menyelamatkan', '憲': 'konstitusi', '衛': 'pertahanan',
  '策': 'rencana; strategi', '治': 'memerintah; mengobati', '権': 'hak; kekuasaan', '論': 'teori; argumen',
};

function main() {
  const check = process.argv.includes('--check');
  const en = bacaJMDictEN();
  const kurasi = bacaKurasi();
  const trusted = new Map(kurasi);
  for (const [w, m] of Object.entries(MANUAL_GOOD)) if (!trusted.has(w)) trusted.set(w, m);

  const rows = parseCSV(fs.readFileSync(CSV, 'utf8'));
  const header = rows[0];
  let total = 0, idKurasi = 0, keInggris = 0, tanpaJMdict = 0, sudahEN = 0;
  const out = [header];
  for (const r of rows.slice(1)) {
    const [expr, reading, romaji, meaning, meaningId, tags] = r;
    if (tags.includes('JLPT') && !tags.includes('JMdict')) {
      total++;
      const trustedGloss = trusted.get(expr);
      if (meaningId.trim() === '' && meaning.trim() === '') {
        sudahEN++;
      } else if (trustedGloss) {
        // naikkan ke glos kurasi yang terverifikasi
        r[3] = trustedGloss; r[4] = trustedGloss;
        idKurasi++;
      } else {
        const glosEN = en.get(expr);
        if (glosEN) {
          r[3] = glosEN.slice(0, 3).join('; ');
          r[4] = '';
          r[5] = tags + ' JMdict-EN';
          keInggris++;
        } else {
          tanpaJMdict++;
        }
      }
    }
    out.push(r);
  }
  console.log(`baris JLPT ditinjau : ${total}`);
  console.log(`  → glos kurasi ID dipertahankan : ${idKurasi}`);
  console.log(`  → diganti glos Inggris JMdict  : ${keInggris}`);
  console.log(`  → tanpa entri JMdict (dibiarkan): ${tanpaJMdict}`);
  console.log(`  → meaning_id sudah kosong       : ${sudahEN}`);
  if (check) { console.log('\n--check: tidak ada yang ditulis.'); return; }

  // tulis ulang dengan kutip minimal
  const tmp = CSV + '.tmp';
  const w = fs.createWriteStream(tmp, { encoding: 'utf8' });
  const esc = v => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  for (const r of out) w.write(r.map(esc).join(',') + '\n');
  w.end(() => {
    fs.renameSync(tmp, CSV);
    const mb = fs.statSync(CSV).size / 1048576;
    console.log(`\n✅ vocab-all.csv ditulis ulang (${mb.toFixed(1)} MB)`);
  });
}
main();
