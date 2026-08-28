/* Data & interaksi Pembelajaran-Lain.html.
 * Dipindahkan dari <script> inline agar bisa di-cache terpisah
 * dari markup halamannya. Dimuat dengan defer.
 */

const subjects = [
  {category:'Bahasa', icon:'英', title:'Bahasa Inggris', level:'A1-B2', desc:'Speaking, grammar, vocabulary, listening, dan interview preparation.', modules:['Daily conversation','Grammar praktis','Pronunciation','Interview English'], tags:['Bahasa','Karier'], core:['Simple present untuk rutinitas: I work, she studies, they learn.','WH questions: what, where, when, why, who, how.','Chunk speaking: I think..., In my opinion..., Could you repeat that?','Listening aktif: dengar 30 detik, catat kata kunci, ulangi dengan suara.'], examples:[['Self introduction','Hi, I am Riyan. I learn English to improve my career.'],['Interview answer','My strength is consistency. I practice every day and review my mistakes.'],['Daily phrase','Could you help me with this task?']], practice:['Tulis 10 kalimat rutinitas harian memakai simple present.','Rekam perkenalan diri 45 detik.','Dengar satu video pendek dan tulis 5 kata baru.'], project:'Buat script interview 1 menit: perkenalan, pengalaman, kekuatan, dan tujuan karier.', checklist:['Bisa memperkenalkan diri tanpa membaca teks.','Bisa membuat 20 kalimat simple present dan past tense.','Bisa menjawab 5 pertanyaan interview dasar.']},
  {category:'Bahasa', icon:'한', title:'Bahasa Korea', level:'Basic-TOPIK I', desc:'Hangul, percakapan harian, kosakata K-drama, dan struktur kalimat TOPIK.', modules:['Hangul','Partikel dasar','Daily phrases','TOPIK starter','K-drama vocab'], tags:['Bahasa','Budaya'], 
core:[
'한글 (Hangul): 14 konsonan + 10 vokal dasar. Dibaca per blok suku kata: 한 = ㅎ+ㅏ+ㄴ.',
'Urutan kalimat: Subjek - Objek - Kata kerja (SOV). 저는 밥을 먹어요 = Saya makan nasi.',
'Partikel: 은/는 (topik), 이/가 (subjek), 을/를 (objek), 에/에서 (tempat).',
'Sopan dasar: 요 di akhir kata kerja. 가요 = pergi (sopan), 가 = pergi (kasual).',
'Honorifik tinggi: 시 → 드세요 (silakan makan), 계세요 (ada/sedang).',
], 
examples:[
['Salam','안녕하세요 (annyeonghaseyo) = halo/selamat siang'],
['Terima kasih','감사합니다 (gamsahamnida) = terima kasih (formal)'],
['Permisi','실례합니다 (sillyehamnida) = permisi'],
['Minta tolong','도와주세요 (dowajuseyo) = tolong bantu saya'],
['Tidak mengerti','이해가 안 돼요 (ihaega an dwaeo) = tidak mengerti'],
['Saya suka','저는 ~을/를 좋아해요 (johahaeyo) = saya suka ~'],
['Berapa harga','얼마예요? (eolmayeyo?) = berapa harganya?'],
['Di mana','어디예요? (eodiyeyo?) = di mana?'],
],
practice:[
'Hafal 한글 basic (40 karakter): mulai dengan 아이우에오 (a-i-u-e-o).',
'Kata harian: 물(mul)=air, 밥(bap)=nasi, 집(jip)=rumah, 학교(hakgyo)=sekolah.',
'Tonton drama K-drama dengan subtitle Korea, pause dan baca kalimat.',
'App: Duolingo Korea + Naver Dictionary untuk lookup cepat.',
'K-drama vocab: 사랑해(saranghae)=aku cinta, 왜(wae)=kenapa, 같이(gachi)=bersama.',
]},
  {category:'Bahasa', icon:'中', title:'Bahasa Mandarin', level:'HSK 1-2', desc:'Pinyin, nada dasar, kosakata sehari-hari, dan percakapan dasar Mandarin.', modules:['Pinyin & Nada','Kosakata HSK 1','Daily phrases','HSK 2 dasar'], tags:['Bahasa','Bisnis'], 
core:[
'Pinyin: romanisasi resmi Mandarin. 4 nada: mā (1=datar), má (2=naik), mǎ (3=turun-naik), mà (4=turun).',
'Nada 1: 妈(mā)=ibu, Nada 2: 麻(má)=rami, Nada 3: 马(mǎ)=kuda, Nada 4: 骂(mà)=mengumpat.',
'Urutan kalimat: Waktu-Subjek-Kata kerja-Objek. 我今天吃饭 = Saya hari ini makan nasi.',
'Tidak ada konjugasi kata kerja! 我吃 = saya makan, 他吃 = dia makan (kata kerjanya sama).',
'Partikel 了(le) = aspek selesai: 我吃了 = saya sudah makan.',
],
examples:[
['Halo','你好 (nǐhǎo) = halo, 你好吗 (nǐhǎo ma?) = apa kabar?'],
['Terima kasih','谢谢 (xièxiè) = terima kasih, 不客气 (bùkèqi) = sama-sama'],
['Berapa harga','多少钱? (duōshao qián?) = berapa harganya?'],
['Tidak mengerti','我不明白 (wǒ bù míngbái) = saya tidak mengerti'],
['Nama saya','我叫~ (wǒ jiào) = nama saya ~'],
['Saya dari Indonesia','我来自印度尼西亚 (wǒ lái zì Yìndùníxīyà)'],
['Mau ke mana','你去哪里? (nǐ qù nǎlǐ?) = mau ke mana?'],
['Saya suka','我喜欢~ (wǒ xǐhuān) = saya suka ~'],
],
practice:[
'Hafalkan 4 nada dengan kata 妈麻马骂 (mā má mǎ mà).',
'HSK 1 Vocab (150 kata): 人(rén)=orang, 水(shuǐ)=air, 好(hǎo)=baik, 大(dà)=besar.',
'Gunakan app: HelloChinese atau ChineseSkill untuk latihan harian.',
'Tonton Drama/Variety show China dengan subtitle Mandarin untuk listening.',
'Karakter dasar: 一二三四五 (1-5), 你我他她 (kamu/saya/dia), 日月水火木 (hari/bulan/air/api/kayu).',
]},
  {category:'Bahasa', icon:'商', title:'Bahasa Jepang Bisnis Lanjutan', level:'N3-N1', desc:'Email bisnis, presentasi, rapat, negosiasi, dan bahasa formal yang digunakan di perusahaan Jepang.', modules:['Keigo & Sonkeigo','Email bisnis','Rapat & Presentasi','Negosiasi N2-N1'], tags:['Bahasa','Karier'],
core:[
'Tiga jenis keigo: 尊敬語(sonkeigo/memuliakan orang lain), 謙譲語(kenjougo/merendahkan diri), 丁寧語(teineigo/sopan umum).',
'Salam email bisnis: いつもお世話になっております。(salam pembuka standar bisnis)',
'Membuat permintaan sopan: 〜ていただけますか/〜ていただけますでしょうか。',
'Respons dan konfirmasi: 承知いたしました (baik, formal), かしこまりました (siap, paling formal).',
'Ucapan terima kasih formal: お手数をおかけしました / ご協力いただきありがとうございます。',
],
examples:[
['Email pembuka','いつもお世話になっております。株式会社〜の田中と申します。'],
['Email permintaan','〜の件につきまして、ご確認いただけますでしょうか。'],
['Respons setuju','承知いたしました。早速対応いたします。'],
['Di telepon','ただいま担当の者が席を外しております。よろしければ折り返しご連絡いたします。'],
['Rapat','それでは次の議題に移りたいと思います。'],
['Memperkenalkan diri bisnis','はじめまして。〜株式会社の〜と申します。どうぞよろしくお願いいたします。'],
['Menolak sopan','あいにく、今の時点では難しい状況でございます。'],
['Salam penutup email','ご多忙のところ恐れ入りますが、よろしくお願いいたします。'],
],
practice:[
'Hafal 5 pola email bisnis paling penting sebelum lanjut ke negosiasi.',
'Latihan: Ubah kalimat kasual ke keigo: 食べる→召し上がる, 言う→おっしゃる, 来る→いらっしゃる.',
'Buat draft email bisnis sederhana: permintaan meeting, konfirmasi, tindak lanjut.',
'Dengarkan video roleplay bisnis Jepang di YouTube (cari: ビジネス日本語 会話).',
'Pelajari perbedaan 承知しました vs 了解しました (atasan=承知, sesama=OK keduanya).',
]},
  {category:'Teknologi', icon:'{}', title:'Coding Web', level:'Beginner-Pro', desc:'HTML, CSS, JavaScript, responsive UI, dan project portfolio.', modules:['HTML/CSS','JavaScript','UI component','Deploy website'], tags:['Coding','Portfolio'], core:['HTML membentuk struktur: header, main, section, article, footer.','CSS mengatur visual: layout, warna, spacing, typography, responsive.','JavaScript memberi interaksi: event, state, DOM update.','Project web bagus dimulai dari fitur kecil yang selesai dan bisa diuji.'], examples:[['HTML','<button class="primary">Mulai</button>'],['CSS','.primary { background: #ffb606; color: #252525; }'],['JavaScript','button.addEventListener("click", () => alert("Halo"));']], practice:['Buat halaman profil dengan header, foto, bio, dan tombol kontak.','Tambahkan responsive grid 2 kolom menjadi 1 kolom di mobile.','Buat tombol dark mode memakai class toggle.'], project:'Bangun portfolio mini 1 halaman berisi profil, 3 project, skill, dan form kontak dummy.', checklist:['Bisa menjelaskan fungsi HTML, CSS, dan JS.','Bisa membuat layout responsive.','Bisa menambahkan satu interaksi DOM.']},
  {category:'Akademik', icon:'Σ', title:'Matematika', level:'SMP-SMA', desc:'Aritmetika, aljabar, geometri, statistika, dan latihan problem solving.', modules:['Aljabar','Geometri','Fungsi','Statistika'], tags:['Akademik','Latihan'], core:['Aljabar memakai simbol untuk mewakili nilai yang belum diketahui.','Persamaan diselesaikan dengan menjaga kedua sisi tetap seimbang.','Fungsi menghubungkan input dan output: f(x) = 2x + 3.','Statistika membantu membaca data melalui mean, median, modus, dan sebaran.'], examples:[['Persamaan','2x + 6 = 14, maka 2x = 8, x = 4.'],['Fungsi','Jika f(x)=2x+3, maka f(5)=13.'],['Mean','Data 2, 4, 6 punya rata-rata 4.']], practice:['Selesaikan 10 persamaan linear satu variabel.','Buat tabel input-output untuk f(x)=3x-2.','Hitung mean, median, modus dari 5 set data kecil.'], project:'Buat lembar latihan 20 soal campuran aljabar, fungsi, dan statistika beserta pembahasannya.', checklist:['Bisa memindahkan ruas persamaan dengan benar.','Bisa membaca grafik fungsi linear sederhana.','Bisa memilih mean/median/modus sesuai konteks.']},
  {category:'Kreatif', icon:'図', title:'Desain Grafis', level:'Basic-Portfolio', desc:'Layout, warna, tipografi, poster, presentasi, dan brand kit sederhana.', modules:['Color system','Typography','Poster','Portfolio'], tags:['Desain','Kreatif'], core:['Desain yang baik punya hierarki: apa yang dilihat dulu, kedua, dan terakhir.','Gunakan maksimal 2 font untuk latihan awal: heading dan body.','Palet warna sebaiknya punya warna utama, aksen, netral, dan warna status.','Spacing konsisten membuat desain terlihat rapi bahkan tanpa banyak dekorasi.'], examples:[['Hierarki','Judul besar, subjudul sedang, detail kecil.'],['Palet','Primary yellow, accent blue, neutral white, text dark.'],['Layout','Grid 12 kolom untuk poster atau landing page.']], practice:['Buat poster event dengan 1 judul, 1 gambar, 3 info penting.','Desain ulang slide presentasi yang terlalu penuh.','Buat 3 variasi palet warna untuk satu brand.'], project:'Buat mini brand kit: logo teks, palet warna, font pairing, dan 3 template post.', checklist:['Bisa membuat hierarki visual jelas.','Bisa memilih warna dengan kontras cukup.','Bisa membuat satu karya portfolio yang konsisten.']},
  {category:'Bisnis', icon:'商', title:'Bisnis Digital', level:'Starter', desc:'Validasi ide, landing page, copywriting, funnel, dan analitik sederhana.', modules:['Validasi ide','Offer','Landing page','Analytics'], tags:['Bisnis','Marketing'], core:['Mulai dari masalah spesifik, bukan produk yang terlalu umum.','Offer kuat menjelaskan siapa dibantu, masalah apa, hasil apa, dan kenapa percaya.','Landing page sederhana cukup punya headline, benefit, bukti, cara beli/daftar.','Analytics dasar: traffic, conversion rate, cost, revenue, retention.'], examples:[['Problem','Mahasiswa sulit konsisten belajar bahasa asing.'],['Offer','Program 30 hari speaking habit dengan feedback harian.'],['Metric','100 pengunjung, 8 daftar = conversion rate 8%.']], practice:['Tulis 10 masalah yang sering dialami target pasar.','Buat 3 versi headline untuk satu produk.','Hitung conversion rate dari 5 skenario angka.'], project:'Buat landing page validasi ide dengan form minat dan 1 pesan WhatsApp CTA.', checklist:['Bisa menjelaskan target pasar secara spesifik.','Bisa menulis offer satu kalimat.','Bisa membaca conversion rate sederhana.']},
  {category:'Karier', icon:'話', title:'Public Speaking', level:'Praktis', desc:'Struktur presentasi, storytelling, latihan suara, dan simulasi pitch.', modules:['Struktur bicara','Storytelling','Voice drill','Pitch practice'], tags:['Karier','Komunikasi'], core:['Presentasi kuat punya pembuka, masalah, poin utama, contoh, dan penutup.','Gunakan jeda untuk menekankan ide penting.','Storytelling mudah dimulai dari situasi, konflik, perubahan, hasil.','Pitch singkat harus menjawab: apa, untuk siapa, manfaat, bukti, ajakan.'], examples:[['Opening','Hari ini saya ingin menunjukkan cara belajar 20 menit yang konsisten.'],['Story','Dulu saya sering berhenti belajar; perubahan dimulai saat target diperkecil.'],['Closing','Mulai hari ini, pilih satu latihan kecil dan lakukan 7 hari.']], practice:['Rekam presentasi 60 detik dan nilai kejelasan suara.','Latih jeda 2 detik setelah poin penting.','Buat outline 5 slide untuk ide pilihanmu.'], project:'Buat pitch 90 detik untuk memperkenalkan produk, project, atau diri sendiri.', checklist:['Bisa bicara 1 menit tanpa filler berlebihan.','Bisa membuat struktur presentasi 5 bagian.','Bisa menutup dengan ajakan yang jelas.']}
];
// Quick quiz data per subject
const subjectQuizzes = {
  'Bahasa Inggris': [
    { q: 'Mana yang benar?', opts: ['She don\'t like it', 'She doesn\'t like it', 'She not like it', 'She isn\'t like it'], ans: 1, exp: 'Subjek "she" (orang ketiga) + doesn\'t (bukan don\'t).' },
    { q: '"I have been studying for 2 hours" termasuk tense apa?', opts: ['Present Perfect', 'Past Continuous', 'Present Perfect Continuous', 'Simple Past'], ans: 2, exp: 'Present Perfect Continuous: have/has + been + verb-ing.' },
    { q: 'Pilih kata yang paling tepat: "The meeting was ___"', opts: ['postpone', 'postponed', 'postponing', 'postpones'], ans: 1, exp: 'Passive voice: was + past participle (postponed).' },
  ],
  'Bahasa Korea': [
    { q: '"Terima kasih" dalam bahasa Korea adalah...', opts: ['안녕하세요', '감사합니다', '죄송합니다', '반갑습니다'], ans: 1, exp: '감사합니다 = terima kasih (formal). 고마워요 = kasual.' },
    { q: 'Huruf Korea (Hangul) disebut?', opts: ['Hiragana', 'Hanja', '한글', '가나'], ans: 2, exp: '한글 (Hangul) adalah sistem penulisan bahasa Korea yang dibuat Raja Sejong.' },
  ],
  'Bahasa Mandarin': [
    { q: '"Nǐ hǎo" (你好) artinya?', opts: ['Selamat tinggal', 'Terima kasih', 'Halo/Hai', 'Maaf'], ans: 2, exp: '你好 (nǐ hǎo) adalah salam umum bahasa Mandarin, artinya "halo".' },
    { q: 'Bahasa Mandarin memiliki berapa nada?', opts: ['2', '3', '4', '5'], ans: 2, exp: 'Mandarin memiliki 4 nada utama + 1 nada netral (5 total).' },
  ],
  'Coding Web': [
    { q: 'HTML adalah singkatan dari...', opts: ['HyperText Markup Language', 'High Tech Modern Language', 'HyperText Modern Layout', 'HyperText Minimal Language'], ans: 0, exp: 'HTML (HyperText Markup Language) adalah bahasa markup untuk membuat halaman web.' },
    { q: 'Tag HTML yang digunakan untuk membuat link adalah?', opts: ['<link>', '<href>', '<a>', '<url>'], ans: 2, exp: 'Tag <a> (anchor) dengan atribut href digunakan untuk membuat hyperlink.' },
    { q: 'CSS singkatan dari?', opts: ['Creative Style Sheets', 'Cascading Style Sheets', 'Computer Style Syntax', 'Cascading Standard Style'], ans: 1, exp: 'CSS (Cascading Style Sheets) mengatur tampilan elemen HTML.' },
  ],
  'Matematika': [
    { q: 'Berapakah nilai dari 2³ × 4?', opts: ['24', '48', '32', '16'], ans: 2, exp: '2³ = 8, lalu 8 × 4 = 32.' },
    { q: 'Rumus luas lingkaran adalah...', opts: ['2πr', 'πr²', '2πr²', 'πd'], ans: 1, exp: 'Luas lingkaran = πr² (pi × jari-jari kuadrat).' },
  ],
  'Bisnis Digital': [
    { q: 'SEO adalah singkatan dari?', opts: ['Social Engine Optimization', 'Search Engine Optimization', 'Site Engagement Optimization', 'Social Engagement Online'], ans: 1, exp: 'SEO (Search Engine Optimization) = optimasi agar website muncul di halaman pertama mesin pencari.' },
    { q: 'ROI dalam bisnis artinya?', opts: ['Rate of Investment', 'Return on Investment', 'Revenue of Income', 'Rate on Income'], ans: 1, exp: 'ROI (Return on Investment) = keuntungan yang diperoleh dari investasi dibandingkan biayanya.' },
  ],
  'Public Speaking': [
    { q: 'Struktur presentasi yang baik adalah?', opts: ['Tengah-Akhir-Awal', 'Awal-Tengah-Akhir', 'Akhir-Awal-Tengah', 'Bebas asalkan menarik'], ans: 1, exp: 'Struktur klasik: Opening (Awal) → Body (Tengah) → Closing (Akhir).' },
    { q: 'Teknik "Rule of Three" dalam public speaking berarti?', opts: ['Bicara selama 3 menit', 'Gunakan 3 poin utama', 'Ulangi kalimat 3 kali', 'Beri jeda 3 detik'], ans: 1, exp: 'Rule of Three: otak lebih mudah mengingat informasi dalam kelompok tiga poin.' },
  ],
};

// Active quiz state
let activeQuiz = null, quizIdx = 0, quizScore = 0;

function startSubjectQuiz(title) {
  const qs = subjectQuizzes[title];
  if (!qs || qs.length === 0) {
    window.proToast?.(`Quiz untuk ${title} belum tersedia.`);
    return;
  }
  activeQuiz = { title, qs };
  quizIdx = 0; quizScore = 0;
  showQuizModal();
}

function showQuizModal() {
  let modal = document.getElementById('subjectQuizModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'subjectQuizModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)';
    modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  }
  renderQuizModal(modal);
}

function renderQuizModal(modal) {
  if (!activeQuiz) return;
  const { title, qs } = activeQuiz;
  if (quizIdx >= qs.length) {
    modal.innerHTML = `<div style="background:var(--cream);border-radius:20px;width:min(480px,95vw);padding:2rem;text-align:center">
      <div style="font-size:48px;margin-bottom:.5rem">${quizScore === qs.length ? '🎉' : '📚'}</div>
      <h3 style="font-size:20px;font-weight:700;color:var(--ink);margin-bottom:.35rem">${quizScore}/${qs.length} Benar</h3>
      <p style="font-size:13px;color:var(--ink-soft)">${quizScore === qs.length ? 'Sempurna! Kamu sudah menguasai dasar-dasar ini.' : 'Bagus! Terus latihan untuk meningkatkan skor.'}</p>
      <div style="display:flex;gap:.75rem;justify-content:center;margin-top:1.5rem">
        <button onclick="quizIdx=0;quizScore=0;renderQuizModal(document.getElementById('subjectQuizModal'))" style="background:var(--red);color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer">Ulangi</button>
        <button onclick="document.getElementById('subjectQuizModal').remove()" style="background:var(--white);border:.5px solid var(--border-mid);border-radius:8px;padding:9px 18px;font-size:13px;cursor:pointer">Selesai</button>
      </div>
    </div>`;
    return;
  }
  const q = qs[quizIdx];
  const opts = q.opts.map((o, i) => `<button onclick="checkSubjectQ(${i})" style="width:100%;text-align:left;background:var(--white);border:.5px solid var(--border-mid);border-radius:8px;padding:10px 14px;font-size:13px;cursor:pointer;transition:all .15s">${String.fromCharCode(65+i)}. ${o}</button>`).join('');
  modal.innerHTML = `<div style="background:var(--cream);border-radius:20px;width:min(480px,95vw);padding:1.75rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <span style="font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase">${title} — Soal ${quizIdx+1}/${qs.length}</span>
      <button aria-label="Document.getelementbyid" onclick="document.getElementById('subjectQuizModal').remove()" style="width:28px;height:28px;border-radius:50%;background:var(--border);border:none;cursor:pointer">✕</button>
    </div>
    <h3 style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:1.25rem">${q.q}</h3>
    <div style="display:grid;gap:.5rem" id="quizOpts">${opts}</div>
    <div id="quizExp" style="display:none;margin-top:.75rem;padding:.75rem;background:var(--cream);border-radius:8px;font-size:12px;color:var(--ink-mid)"></div>
  </div>`;
  modal.__q = q;
}

function checkSubjectQ(i) {
  const modal = document.getElementById('subjectQuizModal');
  if (!modal) return;
  const q = modal.__q;
  const correct = i === q.ans;
  if (correct) quizScore++;
  const btns = modal.querySelectorAll('#quizOpts button');
  btns.forEach((b, idx) => {
    b.disabled = true;
    if (idx === q.ans) b.style.background = 'var(--green-pale, #eafaf1)';
    if (idx === i && !correct) b.style.background = 'var(--red-pale)';
  });
  const exp = modal.querySelector('#quizExp');
  if (exp) { exp.style.display = 'block'; exp.innerHTML = `${correct?'✓ Benar!':'✗ Salah.'} ${q.exp}`; exp.style.color = correct?'var(--red)':'var(--ink-mid)'; }
  setTimeout(() => { quizIdx++; renderQuizModal(modal); }, 1600);
}

const tabs = ['Semua', ...new Set(subjects.map((item) => item.category))];
let activeCategory = 'Semua';
let generatedPlan = '';

function renderTabs(){
  document.getElementById('subjectTabs').innerHTML = tabs.map((tab) => `<button type="button" class="${tab===activeCategory?'active':''}" onclick="setCategory('${tab}')">${tab}</button>`).join('');
}
function renderSubjects(){
  const rows = subjects.filter((item) => activeCategory === 'Semua' || item.category === activeCategory);
  document.getElementById('subjectGrid').innerHTML = rows.map((item) => {
    const index = subjects.indexOf(item);
    return `
    <article class="card">
      <div class="card-icon">${item.icon}</div>
      <h3>${item.title}</h3>
      <p>${item.desc}</p>
      <ul>${item.modules.map((module) => `<li>${module}</li>`).join('')}</ul>
      <div class="tag-row">${item.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}<span class="tag">${item.level}</span></div>
      <div class="card-actions">
        <button type="button" onclick="viewLessons(${index})">Lihat Materi</button>
        <button class="primary" type="button" onclick="selectSubject(${index})">Buat Roadmap</button>
        <button type="button" onclick="recordSubject('${item.title}')">Catat 15 menit</button>
      </div>
    </article>`;
  }).join('');
}
function renderLessonMenu(activeIndex = 0){
  document.getElementById('lessonMenu').innerHTML = subjects.map((item, index) => `
    <button type="button" class="${index === activeIndex ? 'active' : ''}" onclick="viewLessons(${index})">
      <span>${item.icon} ${item.title}</span><span>${item.category}</span>
    </button>`).join('');
}
function viewLessons(index = 0, shouldScroll = true){
  const item = subjects[index] || subjects[0];
  renderLessonMenu(index);
  document.getElementById('lessonBoard').innerHTML = `
    <article class="lesson-hero">
      <div class="lesson-hero-top">
        <div>
          <div class="label">${item.category}</div>
          <h3>${item.title}</h3>
        </div>
        <span class="lesson-pill">${item.level}</span>
      </div>
      <p>${item.desc}</p>
      <div class="lesson-actions">
        <button class="primary" type="button" onclick="selectSubject(${index})">Buat Roadmap ${item.title}</button>
        <button type="button" onclick="recordSubject('${item.title}')">Catat 15 menit</button>
        <button type="button" onclick="saveLessonNote(${index})">Simpan Materi ke Catatan</button>
      </div>
    </article>
    <div class="lesson-grid">
      <article class="lesson-block">
        <h4>Konsep Inti</h4>
        <ol>${item.core.map((row) => `<li>${row}</li>`).join('')}</ol>
      </article>
      <article class="lesson-block">
        <h4>Contoh Praktis</h4>
        <div class="example-list">${item.examples.map(([title, body]) => `<div><b>${title}</b><span>${body}</span></div>`).join('')}</div>
      </article>
      <article class="lesson-block">
        <h4>Latihan Harian</h4>
        <ul>${item.practice.map((row) => `<li>${row}</li>`).join('')}</ul>
      </article>
      <article class="lesson-block">
        <h4>Project Mini</h4>
        <p>${item.project}</p>
        <h4 style="margin-top:1rem">Checklist Lulus</h4>
        <ul>${item.checklist.map((row) => `<li>${row}</li>`).join('')}</ul>
      </article>
    </div>`;
  if (shouldScroll) document.getElementById('lessonContent').scrollIntoView({behavior:'smooth', block:'start'});
}
function setCategory(category){
  activeCategory = category;
  renderTabs();
  renderSubjects();
}
function selectSubject(index){
  document.getElementById('planSubject').value = subjects[index].title;
  document.getElementById('planGoal').value = `Saya ingin belajar ${subjects[index].title} secara konsisten dan bisa memakai skill ini untuk kebutuhan nyata.`;
  generatePlan();
  document.getElementById('planOutput').scrollIntoView({behavior:'smooth', block:'center'});
}
function recordSubject(title){
  const key = 'nihongoProfessionalTools';
  let data = {};
  try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch (error) { data = {}; }
  const sessions = [{title:`Pembelajaran Lain: ${title}`, minutes:15, href:location.href, at:Date.now()}, ...(data.sessions || [])].slice(0,60);
  localStorage.setItem(key, JSON.stringify({...data, sessions, lastPage:{title:`Pembelajaran Lain: ${title}`, href:location.href, at:Date.now()}}));
  window.proToast?.(`Sesi ${title} dicatat.`);
}
function generatePlan(){
  const subject = document.getElementById('planSubject').value;
  const level = document.getElementById('planLevel').value;
  const weeks = Number(document.getElementById('planWeeks').value || 8);
  const goal = document.getElementById('planGoal').value.trim() || `Menguasai dasar ${subject}.`;
  const selected = subjects.find((item) => item.title === subject) || subjects[0];
  generatedPlan = `Target: ${goal}\nBidang: ${subject} (${level})\nDurasi: ${weeks} minggu\n\nMinggu 1-${Math.max(1, Math.floor(weeks/4))}: Fondasi\n- ${selected.modules[0]}\n- Catat 10 konsep penting\n- Latihan 20 menit per hari\n\nMinggu ${Math.max(2, Math.floor(weeks/4)+1)}-${Math.max(3, Math.floor(weeks/2))}: Praktik inti\n- ${selected.modules[1]}\n- Buat 3 latihan kecil\n- Review kesalahan setiap akhir pekan\n\nMinggu ${Math.max(4, Math.floor(weeks/2)+1)}-${Math.max(5, weeks-1)}: Project dan simulasi\n- ${selected.modules[2]}\n- Terapkan ke kasus nyata\n- Minta feedback dari AI Tutor\n\nMinggu ${weeks}: Evaluasi\n- ${selected.modules[3]}\n- Buat rangkuman satu halaman\n- Catat progres di Study Hub`;
  document.getElementById('planOutput').textContent = generatedPlan;
}
function saveGeneratedPlan(){
  if (!generatedPlan) generatePlan();
  const key = 'nihongoProfessionalTools';
  let data = {};
  try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch (error) { data = {}; }
  const notes = {...(data.notes || {}), '/Pembelajaran-Lain.html': generatedPlan};
  localStorage.setItem(key, JSON.stringify({...data, notes, lastPage:{title:'Pembelajaran Lain', href:location.href, at:Date.now()}}));
  window.proToast?.('Rencana belajar disimpan ke catatan.');
}
function saveLessonNote(index){
  const item = subjects[index] || subjects[0];
  const content = `${item.title}\n\nKonsep inti:\n- ${item.core.join('\n- ')}\n\nLatihan:\n- ${item.practice.join('\n- ')}\n\nProject:\n${item.project}`;
  const key = 'nihongoProfessionalTools';
  let data = {};
  try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch (error) { data = {}; }
  const notes = {...(data.notes || {}), [`/Pembelajaran-Lain.html#${item.title}`]: content};
  localStorage.setItem(key, JSON.stringify({...data, notes, lastPage:{title:`Materi ${item.title}`, href:location.href, at:Date.now()}}));
  window.proToast?.(`Materi ${item.title} disimpan.`);
}
function answerQuiz(kind){
  const mapping = {
    karier: 'Prioritaskan Bahasa Jepang Bisnis Lanjutan, Bahasa Inggris, atau Public Speaking. Ketiganya cepat terasa untuk interview, meeting, email kerja, dan presentasi.',
    produk: 'Prioritaskan Coding Web atau Bisnis Digital. Kamu bisa membuat landing page, portfolio, dan eksperimen ide.',
    akademik: 'Prioritaskan Matematika. Fokus aljabar, fungsi, dan problem solving sebelum materi yang lebih berat.',
    kreatif: 'Prioritaskan Desain Grafis. Mulai dari layout, warna, tipografi, lalu buat 3 karya portfolio.'
  };
  document.getElementById('quizResult').textContent = mapping[kind];
}
function init(){
  document.getElementById('planSubject').innerHTML = subjects.map((item) => `<option>${item.title}</option>`).join('');
  renderTabs();
  renderSubjects();
  viewLessons(0, false);
  document.getElementById('quizOptions').innerHTML = [
    ['karier','Lebih percaya diri untuk karier Jepang/global'],
    ['produk','Bisa membuat produk/proyek'],
    ['akademik','Nilai dan logika makin kuat'],
    ['kreatif','Punya karya visual menarik']
  ].map(([key,label]) => `<button type="button" onclick="answerQuiz('${key}')">${label}</button>`).join('');
}
init();
