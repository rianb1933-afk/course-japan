/* Data & interaksi Materi/Materi.html.
 * Dulu tertanam sebagai <script> inline 164 KB — 80% dari berkas HTML-nya —
 * sehingga setiap perubahan markup memaksa pengguna mengunduh ulang seluruh
 * data kana, kanji, tata bahasa, kosakata, dan percakapan.
 *
 * Dimuat dengan defer. Lima fungsi yang dipanggil dari atribut on*= sudah
 * tersedia jauh sebelum ada klik; inisialisasi tema sengaja DITINGGAL inline
 * di halaman agar tetap berjalan sebelum paint dan tidak berkedip.
 */

function switchTab(id,btn){
  document.querySelectorAll('.kana-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.mh-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
}

// Hiragana data
const hiragana=[
  ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o'],
  ['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko'],
  ['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so'],
  ['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to'],
  ['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no'],
  ['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho'],
  ['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo'],
  ['や','ya'],['',''],['ゆ','yu'],['',''],['よ','yo'],
  ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],
  ['わ','wa'],['',''],['',''],['',''],['を','wo'],
  ['ん','n'],['','',
  ['が','ga'],['ぎ','gi'],['ぐ','gu'],['げ','ge'],['ご','go'],
  ['ざ','za'],['じ','ji'],['ず','zu'],['ぜ','ze'],['ぞ','zo'],
  ['だ','da'],['ぢ','ji*'],['づ','zu*'],['で','de'],['ど','do'],
  ['ば','ba'],['び','bi'],['ぶ','bu'],['べ','be'],['ぼ','bo'],
  ['ぱ','pa'],['ぴ','pi'],['ぷ','pu'],['ぺ','pe'],['ぽ','po']],['',''],['',''],['',''],
];

const katakana=[
  ['ア','a'],['イ','i'],['ウ','u'],['エ','e'],['オ','o'],
  ['カ','ka'],['キ','ki'],['ク','ku'],['ケ','ke'],['コ','ko'],
  ['サ','sa'],['シ','shi'],['ス','su'],['セ','se'],['ソ','so'],
  ['タ','ta'],['チ','chi'],['ツ','tsu'],['テ','te'],['ト','to'],
  ['ナ','na'],['ニ','ni'],['ヌ','nu'],['ネ','ne'],['ノ','no'],
  ['ハ','ha'],['ヒ','hi'],['フ','fu'],['ヘ','he'],['ホ','ho'],
  ['マ','ma'],['ミ','mi'],['ム','mu'],['メ','me'],['モ','mo'],
  ['ヤ','ya'],['',''],['ユ','yu'],['',''],['ヨ','yo'],
  ['ラ','ra'],['リ','ri'],['ル','ru'],['レ','re'],['ロ','ro'],
  ['ワ','wa'],['',''],['',''],['',''],['ヲ','wo'],
  ['ン','n'],['','',
  ['ガ','ga'],['ギ','gi'],['グ','gu'],['ゲ','ge'],['ゴ','go'],
  ['ザ','za'],['ジ','ji'],['ズ','zu'],['ゼ','ze'],['ゾ','zo'],
  ['ダ','da'],['デ','de'],['ド','do'],
  ['バ','ba'],['ビ','bi'],['ブ','bu'],['ベ','be'],['ボ','bo'],
  ['パ','pa'],['ピ','pi'],['プ','pu'],['ペ','pe'],['ポ','po']],['',''],['',''],['',''],
];

const learnedHira=['あ','い','う','え','お','か','き','く','け','こ','さ','し','す','せ','そ','た','ち','つ','て','と','な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ','ま','み'];

function buildKanaGrid(data,containerId,learnedArr){
  const g=document.getElementById(containerId);
  data.forEach(([jp,rm])=>{
    const d=document.createElement('div');
    if(!jp){d.className='kana-cell empty';g.appendChild(d);return}
    d.className='kana-cell'+(learnedArr&&learnedArr.includes(jp)?' learned':'');
    d.innerHTML=`<span class="jp">${jp}</span><span class="rm">${rm}</span>`;
    d.onclick=()=>showKanaModal(jp,rm);
    g.appendChild(d);
  });
}
buildKanaGrid(hiragana,'hiraganaGrid',learnedHira);
buildKanaGrid(katakana,'katakanaGrid',[]);
buildKanaGrid(hiragana.filter(([jp])=>jp).slice(0,15),'zeroKanaGrid',[]);

function showKanaModal(jp,rm){
  document.getElementById('modalChar').textContent=jp;
  document.getElementById('modalRomaji').textContent=rm;
  document.getElementById('modalInfo').innerHTML=`<strong>Cara baca:</strong> <em>${rm}</em><br><strong>Stroke order:</strong> Klik untuk lihat animasi<br><strong>Contoh kata:</strong> ${getExample(jp)}`;
  document.getElementById('kanaModal').style.display='flex';
}
function getExample(jp){
  const ex={あ:'あおい (aoi) — Biru',か:'かさ (kasa) — Payung',さ:'さくら (sakura) — Bunga Sakura',た:'たべる (taberu) — Makan',な:'なまえ (namae) — Nama',は:'はな (hana) — Bunga',ま:'まち (machi) — Kota',や:'やまだ (yamada) — Nama keluarga',ら:'らくだ (rakuda) — Unta',わ:'わたし (watashi) — Saya'};
  return ex[jp]||`${jp}～ (contoh kata dengan ${jp})`;
}
function closeModal(){document.getElementById('kanaModal').style.display='none'}

// Kanji data
const kanjiData=[
  // N5
  {char:'日',read:'にち・ひ',mean:'Hari/Matahari',level:'N5',learned:true},
  {char:'月',read:'つき・げつ',mean:'Bulan',level:'N5',learned:true},
  {char:'火',read:'ひ・か',mean:'Api',level:'N5',learned:true},
  {char:'水',read:'みず・すい',mean:'Air',level:'N5',learned:true},
  {char:'木',read:'き・もく',mean:'Pohon',level:'N5',learned:true},
  {char:'金',read:'かね・きん',mean:'Emas/Uang',level:'N5',learned:true},
  {char:'土',read:'つち・ど',mean:'Tanah',level:'N5',learned:false},
  {char:'山',read:'やま・さん',mean:'Gunung',level:'N5',learned:true},
  {char:'川',read:'かわ・せん',mean:'Sungai',level:'N5',learned:false},
  {char:'空',read:'そら・くう',mean:'Langit',level:'N5',learned:true},
  {char:'花',read:'はな・か',mean:'Bunga',level:'N5',learned:true},
  {char:'車',read:'くるま・しゃ',mean:'Mobil',level:'N5',learned:true},
  {char:'駅',read:'えき',mean:'Stasiun',level:'N5',learned:false},
  {char:'店',read:'みせ・てん',mean:'Toko',level:'N5',learned:true},
  {char:'食',read:'たべる・しょく',mean:'Makan',level:'N5',learned:true},
  {char:'語',read:'ご・かたる',mean:'Bahasa/Bicara',level:'N5',learned:true},
  {char:'人',read:'ひと・じん・にん',mean:'Orang',level:'N5',learned:true},
  {char:'大',read:'おお・だい',mean:'Besar',level:'N5',learned:true},
  {char:'小',read:'ちい・しょう',mean:'Kecil',level:'N5',learned:true},
  {char:'中',read:'なか・ちゅう',mean:'Tengah/Dalam',level:'N5',learned:true},
  {char:'上',read:'うえ・じょう',mean:'Atas',level:'N5',learned:false},
  {char:'下',read:'した・か',mean:'Bawah',level:'N5',learned:false},
  {char:'出',read:'で・しゅつ',mean:'Keluar',level:'N5',learned:false},
  {char:'入',read:'はい・にゅう',mean:'Masuk',level:'N5',learned:false},
  {char:'見',read:'み・けん',mean:'Melihat',level:'N5',learned:true},
  {char:'聞',read:'き・ぶん',mean:'Mendengar',level:'N5',learned:false},
  {char:'話',read:'はな・わ',mean:'Berbicara',level:'N5',learned:false},
  {char:'書',read:'か・しょ',mean:'Menulis',level:'N5',learned:false},
  {char:'読',read:'よ・どく',mean:'Membaca',level:'N5',learned:false},
  {char:'行',read:'い・こう',mean:'Pergi',level:'N5',learned:true},
  {char:'来',read:'く・らい',mean:'Datang',level:'N5',learned:false},
  {char:'帰',read:'かえ・き',mean:'Pulang',level:'N5',learned:false},
  {char:'先',read:'さき・せん',mean:'Dulu/Depan',level:'N5',learned:false},
  {char:'生',read:'う・せい',mean:'Lahir/Hidup',level:'N5',learned:false},
  {char:'学',read:'まな・がく',mean:'Belajar',level:'N5',learned:true},
  {char:'校',read:'こう',mean:'Sekolah',level:'N5',learned:false},
  {char:'本',read:'ほん・もと',mean:'Buku/Asal',level:'N5',learned:true},
  {char:'毎',read:'まい',mean:'Setiap',level:'N5',learned:false},
  {char:'何',read:'なに・なん',mean:'Apa',level:'N5',learned:true},
  // N4
  {char:'海',read:'うみ・かい',mean:'Laut',level:'N4',learned:false},
  {char:'道',read:'みち・どう',mean:'Jalan',level:'N4',learned:false},
  {char:'森',read:'もり',mean:'Hutan',level:'N4',learned:false},
  {char:'電',read:'でん',mean:'Listrik',level:'N4',learned:true},
  {char:'会',read:'あ・かい',mean:'Bertemu/Rapat',level:'N4',learned:false},
  {char:'社',read:'しゃ',mean:'Perusahaan',level:'N4',learned:false},
  {char:'国',read:'くに・こく',mean:'Negara',level:'N4',learned:true},
  {char:'地',read:'ち',mean:'Tanah/Tempat',level:'N4',learned:false},
  {char:'図',read:'ず・と',mean:'Gambar/Peta',level:'N4',learned:false},
  {char:'家',read:'いえ・か',mean:'Rumah',level:'N4',learned:true},
  {char:'族',read:'ぞく',mean:'Suku/Keluarga',level:'N4',learned:false},
  {char:'病',read:'やまい・びょう',mean:'Sakit/Penyakit',level:'N4',learned:false},
  {char:'院',read:'いん',mean:'Institut/Gedung',level:'N4',learned:false},
  {char:'近',read:'ちか・きん',mean:'Dekat',level:'N4',learned:false},
  {char:'遠',read:'とお・えん',mean:'Jauh',level:'N4',learned:false},
  {char:'多',read:'おお・た',mean:'Banyak',level:'N4',learned:false},
  {char:'少',read:'すく・しょう',mean:'Sedikit',level:'N4',learned:false},
  {char:'急',read:'いそ・きゅう',mean:'Mendadak/Terburu',level:'N4',learned:false},
  {char:'止',read:'と・し',mean:'Berhenti',level:'N4',learned:false},
  {char:'開',read:'あ・かい',mean:'Membuka',level:'N4',learned:false},
  // N3
  {char:'感',read:'かん',mean:'Perasaan/Emosi',level:'N3',learned:false},
  {char:'情',read:'じょう',mean:'Perasaan/Kasih',level:'N3',learned:false},
  {char:'想',read:'そう',mean:'Pikiran/Bayangan',level:'N3',learned:false},
  {char:'例',read:'たとえ・れい',mean:'Contoh',level:'N3',learned:false},
  {char:'比',read:'くら・ひ',mean:'Membandingkan',level:'N3',learned:false},
  {char:'差',read:'さ',mean:'Perbedaan',level:'N3',learned:false},
  {char:'変',read:'か・へん',mean:'Berubah/Aneh',level:'N3',learned:false},
  {char:'続',read:'つづ・ぞく',mean:'Berlanjut',level:'N3',learned:false},
  {char:'始',read:'はじ・し',mean:'Mulai',level:'N3',learned:false},
  {char:'終',read:'お・しゅう',mean:'Selesai/Akhir',level:'N3',learned:false},
  // N2
  {char:'複',read:'ふく',mean:'Ganda/Kompleks',level:'N2',learned:false},
  {char:'雑',read:'ざつ',mean:'Rumit/Campur',level:'N2',learned:false},
  {char:'影',read:'かげ・えい',mean:'Bayangan/Pengaruh',level:'N2',learned:false},
  {char:'響',read:'ひび・きょう',mean:'Bergema/Pengaruh',level:'N2',learned:false},
  {char:'批',read:'ひ',mean:'Kritik',level:'N2',learned:false},
  {char:'判',read:'はん',mean:'Keputusan',level:'N2',learned:false},
  // N1
  {char:'憂',read:'うれ・ゆう',mean:'Sedih/Khawatir',level:'N1',learned:false},
  {char:'慮',read:'りょ',mean:'Pertimbangan',level:'N1',learned:false},
  {char:'謙',read:'けん',mean:'Rendah Hati',level:'N1',learned:false},
  {char:'遜',read:'そん',mean:'Merendah/Mengalah',level:'N1',learned:false},
];
let currentLevel='all';

function buildKanjiGrid(data){
  const g=document.getElementById('kanjiGrid');g.innerHTML='';
  data.forEach(k=>{
    const d=document.createElement('div');
    d.className='kanji-card'+(k.learned?' learned':'');
    d.dataset.level=k.level;
    d.innerHTML=`<span class="kc-char">${k.char}</span><span class="kc-read">${k.read}</span><span class="kc-mean">${k.mean}</span><span class="kc-badge">${k.level}</span>`;
    d.onclick=()=>alert(`${k.char} (${k.read})\n意味: ${k.mean}\nLevel: ${k.level}`);
    g.appendChild(d);
  });
}
buildKanjiGrid(kanjiData);

function filterLevel(level,btn){
  currentLevel=level;
  document.querySelectorAll('.kf-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const filtered=level==='all'?kanjiData:kanjiData.filter(k=>k.level===level);
  buildKanjiGrid(filtered);
}
function filterKanji(q){
  const filtered=kanjiData.filter(k=>k.char.includes(q)||k.read.includes(q)||k.mean.toLowerCase().includes(q.toLowerCase()));
  buildKanjiGrid(filtered);
}

// Grammar data
const grammarData=[
  // ── N5 ──
  {level:'N5',title:'〜は〜です',jp:'AはBです',meaning:'A adalah B. Partikel は (wa) menandai topik kalimat; です adalah kopula sopan.',examples:[{jp:'わたしは がくせい です。',id:'Saya adalah pelajar.'},{jp:'これは ほん です。',id:'Ini adalah buku.'},{jp:'たなかさんは せんせい です。',id:'Tanaka-san adalah guru.'}]},
  {level:'N5',title:'〜じゃないです (Negatif Nomina)',jp:'〜じゃないです / ではありません',meaning:'Bentuk negatif "bukan". Kasual: じゃないです. Formal: ではありません.',examples:[{jp:'わたしは にほんじん じゃないです。',id:'Saya bukan orang Jepang.'},{jp:'これは ねこ では ありません。',id:'Ini bukan kucing.'},{jp:'きょうは もくようび じゃないです。',id:'Hari ini bukan Kamis.'}]},
  {level:'N5',title:'〜が あります／います',jp:'〜に〜がある／いる',meaning:'Menyatakan keberadaan. あります untuk benda mati; います untuk makhluk hidup.',examples:[{jp:'つくえの うえに ほんが あります。',id:'Di atas meja ada buku.'},{jp:'こうえんに こどもが います。',id:'Di taman ada anak-anak.'},{jp:'れいぞうこに みずが あります。',id:'Di kulkas ada air.'}]},
  {level:'N5',title:'〜を〜します',jp:'〜を〜する',meaning:'Partikel を menandai objek langsung dari kata kerja.',examples:[{jp:'ごはんを たべます。',id:'Makan nasi.'},{jp:'にほんごを べんきょうします。',id:'Belajar bahasa Jepang.'},{jp:'おんがくを ききます。',id:'Mendengarkan musik.'}]},
  {level:'N5',title:'〜に〜へ (Tujuan)',jp:'〜に／〜へ いく・くる',meaning:'に dan へ menyatakan arah tujuan. へ lebih menekankan arah; に lebih menekankan titik tiba.',examples:[{jp:'がっこうに いきます。',id:'Pergi ke sekolah.'},{jp:'にほんへ きました。',id:'Datang ke Jepang.'},{jp:'えきに います。',id:'Berada di stasiun.'}]},
  {level:'N5',title:'〜で (Cara/Alat/Tempat)',jp:'〜で',meaning:'Partikel で menandai (1) tempat aktivitas, (2) alat/cara, (3) bahasa/bahan.',examples:[{jp:'でんしゃで いきます。',id:'Pergi dengan kereta.'},{jp:'にほんごで はなします。',id:'Berbicara dalam bahasa Jepang.'},{jp:'としょかんで べんきょうします。',id:'Belajar di perpustakaan.'}]},
  {level:'N5',title:'〜ない (Negatif Verba)',jp:'〜ない・〜ません',meaning:'Bentuk negatif kata kerja. ません untuk bentuk sopan; ない untuk bentuk biasa.',examples:[{jp:'きょうは いきません。',id:'Hari ini tidak pergi.'},{jp:'にほんごが わかりません。',id:'Tidak mengerti bahasa Jepang.'},{jp:'やさいを たべない。',id:'Tidak makan sayur. (kasual)'}]},
  {level:'N5',title:'〜たい (Keinginan)',jp:'動詞ます形＋たい',meaning:'Menyatakan keinginan pembicara ("ingin melakukan"). Hanya untuk keinginan diri sendiri.',examples:[{jp:'みずを のみたいです。',id:'Ingin minum air.'},{jp:'にほんに いきたいです。',id:'Ingin pergi ke Jepang.'},{jp:'アイスを たべたい！',id:'Ingin makan es krim!'}]},
  {level:'N5',title:'〜ている (Sedang/Keadaan)',jp:'動詞て形＋いる',meaning:'Menyatakan (1) aksi yang sedang berlangsung, atau (2) keadaan yang merupakan hasil aksi sebelumnya.',examples:[{jp:'いま ごはんを たべています。',id:'Sekarang sedang makan.'},{jp:'まどが あいています。',id:'Jendela terbuka (keadaan).'},{jp:'かれは けっこんしています。',id:'Dia sudah menikah.'}]},
  // ── N4 ──
  {level:'N4',title:'〜てから',jp:'〜てから',meaning:'Menyatakan urutan — setelah selesai A, baru B. A harus selesai dulu sebelum B dimulai.',examples:[{jp:'たべてから、べんきょうします。',id:'Setelah makan, belajar.'},{jp:'シャワーを あびてから、ねます。',id:'Setelah mandi, tidur.'},{jp:'にほんごを おわってから、えいごを します。',id:'Setelah selesai bahasa Jepang, lakukan bahasa Inggris.'}]},
  {level:'N4',title:'〜たら',jp:'〜たら',meaning:'Kondisional "jika/kalau/setelah". Lebih spesifik dari と/ば — bisa dipakai untuk kondisi masa depan satu kali.',examples:[{jp:'うちに かえったら、でんわして。',id:'Kalau sudah pulang, telepon ya.'},{jp:'あめが ふったら、いきません。',id:'Kalau hujan, tidak pergi.'},{jp:'じかんが あったら、てつだってください。',id:'Kalau ada waktu, tolong bantu.'}]},
  {level:'N4',title:'〜たことがある',jp:'動詞た形＋ことがある',meaning:'Menyatakan pengalaman — "pernah melakukan". Negatif: 〜たことがない (belum pernah).',examples:[{jp:'ふじさんに のぼったことが あります。',id:'Pernah mendaki Gunung Fuji.'},{jp:'すしを たべたことが あります。',id:'Pernah makan sushi.'},{jp:'まだ にほんに いったことが ありません。',id:'Belum pernah pergi ke Jepang.'}]},
  {level:'N4',title:'〜てもいい',jp:'動詞て形＋もいいです',meaning:'Memberikan izin — "boleh melakukan". Tanya: 〜てもいいですか？ Larangan: 〜てはいけません。',examples:[{jp:'ここで しゃしんを とっても いいです。',id:'Boleh mengambil foto di sini.'},{jp:'まどを あけても いいですか？',id:'Bolehkah saya membuka jendela?'},{jp:'ここで タバコを すっては いけません。',id:'Tidak boleh merokok di sini.'}]},
  {level:'N4',title:'〜なければならない',jp:'動詞ない形＋なければならない',meaning:'Keharusan/kewajiban — "harus". Bentuk kasual: 〜なきゃ. Bentuk sangat formal: 〜なければなりません.',examples:[{jp:'あした はやく おきなければ なりません。',id:'Besok harus bangun pagi.'},{jp:'くすりを のまなければ なりません。',id:'Harus minum obat.'},{jp:'しゅくだいを しなきゃ。',id:'Harus mengerjakan PR. (kasual)'}]},
  {level:'N4',title:'〜そうだ (Tampak)',jp:'形容詞語幹＋そうだ',meaning:'Kesan visual langsung — "tampaknya/kelihatannya". Berbeda dengan らしい (dari info luar).',examples:[{jp:'このケーキは おいしそうです。',id:'Kue ini kelihatannya enak.'},{jp:'そとは さむそうですね。',id:'Di luar kelihatannya dingin ya.'},{jp:'かれは つかれそうな かおを しています。',id:'Wajahnya kelihatan lelah.'}]},
  {level:'N4',title:'〜てあげる／もらう／くれる',jp:'〜てあげる・てもらう・てくれる',meaning:'Kata kerja pemberian perbuatan. あげる=memberi(ke orang lain); もらう=menerima; くれる=diberi(ke saya).',examples:[{jp:'ともだちに てがみを かいてあげました。',id:'Menulis surat untuk teman.'},{jp:'せんせいに おしえてもらいました。',id:'Diajarkan oleh guru.'},{jp:'はははっ かいものを してくれました。',id:'Ibu membelanjakan untuk saya.'}]},
  // ── N3 ──
  {level:'N3',title:'〜ようになる',jp:'〜ようになる',meaning:'Menyatakan perubahan kemampuan atau kebiasaan bertahap — "menjadi bisa / menjadi terbiasa".',examples:[{jp:'にほんごが はなせるように なりました。',id:'Sudah bisa berbicara bahasa Jepang.'},{jp:'はやく おきるように なった。',id:'Jadi terbiasa bangun pagi.'},{jp:'さかなが たべられるように なりました。',id:'Sudah bisa makan ikan.'}]},
  {level:'N3',title:'〜ながら',jp:'動詞ます形（除ます）＋ながら',meaning:'Dua aksi bersamaan oleh subjek yang sama — "sambil". Aksi utama di akhir kalimat.',examples:[{jp:'おんがくを ききながら べんきょうします。',id:'Belajar sambil mendengarkan musik.'},{jp:'あるきながら スマホを みるのは きけんです。',id:'Melihat HP sambil berjalan itu berbahaya.'},{jp:'はたらきながら にほんごを まなんでいます。',id:'Belajar bahasa Jepang sambil bekerja.'}]},
  {level:'N3',title:'〜ために',jp:'動詞辞書形＋ために',meaning:'Menyatakan tujuan — "untuk/demi". Berbeda dengan ように: ために untuk tujuan aktif; ように untuk kondisi harapan.',examples:[{jp:'にほんごを まなぶために にほんに きました。',id:'Datang ke Jepang untuk belajar bahasa Jepang.'},{jp:'けんこうの ために まいにち うんどうします。',id:'Olahraga setiap hari demi kesehatan.'},{jp:'しけんに うかるために いっしょうけんめい べんきょうしています。',id:'Belajar keras untuk lulus ujian.'}]},
  {level:'N3',title:'〜らしい',jp:'普通形＋らしい',meaning:'Inferensi dari informasi luar — "sepertinya/tampaknya (dari yang saya dengar)". Berbeda dengan ようだ (pengamatan langsung).',examples:[{jp:'あしたは あめらしいです。',id:'Sepertinya besok hujan.'},{jp:'かれは もう にほんに かえったらしい。',id:'Sepertinya dia sudah pulang ke Jepang.'},{jp:'あの えいがは おもしろいらしいですよ。',id:'Film itu katanya menarik.'}]},
  {level:'N3',title:'〜ば〜ほど',jp:'〜ば〜ほど',meaning:'Menyatakan hubungan proporsional — "semakin〜, semakin〜".',examples:[{jp:'れんしゅうすれば するほど うまくなる。',id:'Semakin banyak berlatih, semakin mahir.'},{jp:'はやければ はやいほど いいです。',id:'Semakin cepat semakin baik.'},{jp:'かんがえれば かんがえるほど むずかしい。',id:'Semakin dipikir semakin sulit.'}]},
  // ── N2 ──
  {level:'N2',title:'〜にもかかわらず',jp:'普通形／名詞＋にもかかわらず',meaning:'Kontras formal — "meskipun/walaupun/terlepas dari". Lebih formal dari のに; tidak mengandung nuansa menyesal.',examples:[{jp:'あくてんこうにもかかわらず イベントは よていどおり かいさいされた。',id:'Meskipun cuaca buruk, acara tetap berlangsung sesuai jadwal.'},{jp:'どりょくにもかかわらず しけんに しっぱいした。',id:'Meskipun sudah berusaha, gagal ujian.'},{jp:'ちゅうこくにもかかわらず おなじ まちがいを くりかえした。',id:'Meskipun sudah diperingatkan, mengulangi kesalahan yang sama.'}]},
  {level:'N2',title:'〜ざるを得ない',jp:'動詞ない形（除ない）＋ざるを得ない',meaning:'Keterpaksaan eksternal — "terpaksa harus / tidak bisa tidak melakukan". Lebih kuat dari なければならない.',examples:[{jp:'じょうきょうを かんがえると どういせざるを えない。',id:'Melihat situasinya, tidak bisa tidak setuju.'},{jp:'でんしゃが とまったので タクシーを つかわざるを えなかった。',id:'Karena kereta berhenti, terpaksa naik taksi.'},{jp:'しめきりが あるので はたらかざるを えない。',id:'Karena ada deadline, terpaksa harus bekerja.'}]},
  {level:'N2',title:'〜に対して',jp:'名詞＋に対して',meaning:'Menunjukkan arah sikap/tindakan — "terhadap/kepada". Bisa juga berarti kontras "sedangkan".',examples:[{jp:'こどもに たいして やさしく してください。',id:'Bersikaplah baik terhadap anak-anak.'},{jp:'かれの いけんに たいして いぎが あります。',id:'Ada keberatan terhadap pendapatnya.'},{jp:'あには まじめなのに たいして おとうとは のんきだ。',id:'Kakak serius, sedangkan adik santai.'}]},
  {level:'N2',title:'〜わけではない',jp:'普通形＋わけではない',meaning:'Menyatakan penyangkalan parsial — "bukan berarti / tidak selalu berarti". Meluruskan kesalahpahaman.',examples:[{jp:'にほんごが きらいな わけでは ありません。',id:'Bukan berarti saya tidak suka bahasa Jepang.'},{jp:'かねが ないから いかない わけでは ない。',id:'Bukan berarti tidak pergi karena tidak punya uang.'},{jp:'むずかしいから むりな わけではない。',id:'Bukan berarti tidak mungkin karena sulit.'}]},
  // ── N1 ──
  {level:'N1',title:'〜いかんによらず',jp:'名詞＋いかんによらず／にかかわらず',meaning:'Sangat formal — "terlepas dari/tidak peduli bagaimana". Hampir hanya muncul dalam tulisan resmi, hukum, pengumuman.',examples:[{jp:'りゆうの いかんによらず ちこくは ゆるされない。',id:'Terlepas dari alasan apapun, keterlambatan tidak diizinkan.'},{jp:'けっかの いかんにかかわらず さいぜんを つくします。',id:'Terlepas dari hasilnya, akan memberikan yang terbaik.'},{jp:'ねんれいの いかんによらず さんかできます。',id:'Terlepas dari usia, bisa ikut serta.'}]},
  {level:'N1',title:'〜をものともせず',jp:'名詞＋をものともせず（に）',meaning:'Tidak gentar menghadapi rintangan berat dan tetap maju. Bernuansa heroik/pujian.',examples:[{jp:'こんなんを ものともせず かれは ちょうせんし つづけた。',id:'Tidak gentar menghadapi kesulitan, dia terus menantang.'},{jp:'ひはんを ものともせず じぶんの ゆめを おいつづけた。',id:'Tidak peduli kritikan, terus mengejar mimpi.'},{jp:'けがを ものともせず しあいに でた。',id:'Tidak peduli cedera, tetap tampil di pertandingan.'}]},
  {level:'N1',title:'〜にして初めて',jp:'名詞／動詞て形＋にして初めて',meaning:'Hanya setelah kondisi tertentu terpenuhi, barulah sesuatu dapat terjadi — "baru setelah / hanya dengan".',examples:[{jp:'しっぱいして はじめて せいこうの たいせつさが わかる。',id:'Baru setelah gagal, memahami pentingnya kesuksesan.'},{jp:'おやに なって はじめて おやの きもちが わかる。',id:'Baru setelah jadi orang tua, mengerti perasaan orang tua.'},{jp:'じっさいに やって はじめて むずかしさが わかった。',id:'Baru setelah benar-benar melakukannya, baru tahu sulitnya.'}]},

  {level:'N5',title:'だ / です',jp:'Noun + です',meaning:'Saya adalah pelajar.',examples:[{jp:'私は学生です。',id:'Saya adalah pelajar.'}]},
  {level:'N5',title:'は',jp:'Topic + は + comment',meaning:'Hari ini panas.',examples:[{jp:'今日は暑いです。',id:'Hari ini panas.'}]},
  {level:'N5',title:'が',jp:'Subject + が',meaning:'Ada kucing.',examples:[{jp:'猫がいます。',id:'Ada kucing.'}]},
  {level:'N5',title:'を',jp:'Object + を + verb',meaning:'Saya minum air.',examples:[{jp:'水を飲みます。',id:'Saya minum air.'}]},
  {level:'N5',title:'に',jp:'Time/Place + に',meaning:'Saya bangun jam tujuh.',examples:[{jp:'七時に起きます。',id:'Saya bangun jam tujuh.'}]},
  {level:'N5',title:'で',jp:'Place/Tool + で',meaning:'Saya belajar di sekolah.',examples:[{jp:'学校で勉強します。',id:'Saya belajar di sekolah.'}]},
  {level:'N5',title:'も',jp:'Noun + も',meaning:'Saya juga pergi.',examples:[{jp:'私も行きます。',id:'Saya juga pergi.'}]},
  {level:'N5',title:'から / まで',jp:'A から B まで',meaning:'Bekerja dari jam 9 sampai 5.',examples:[{jp:'九時から五時まで働きます。',id:'Bekerja dari jam 9 sampai 5.'}]},
  {level:'N5',title:'ませんか',jp:'Verbます stem + ませんか',meaning:'Mau makan bersama?',examples:[{jp:'一緒に食べませんか。',id:'Mau makan bersama?'}]},
  {level:'N5',title:'ましょう',jp:'Verbます stem + ましょう',meaning:'Ayo pergi.',examples:[{jp:'行きましょう。',id:'Ayo pergi.'}]},
  {level:'N5',title:'たい',jp:'Verbます stem + たい',meaning:'Saya ingin pergi ke Jepang.',examples:[{jp:'日本へ行きたいです。',id:'Saya ingin pergi ke Jepang.'}]},
  {level:'N5',title:'てください',jp:'Verbて + ください',meaning:'Tolong lihat.',examples:[{jp:'見てください。',id:'Tolong lihat.'}]},
  {level:'N5',title:'てもいい',jp:'Verbて + もいい',meaning:'Boleh masuk.',examples:[{jp:'入ってもいいです。',id:'Boleh masuk.'}]},
  {level:'N5',title:'てはいけない',jp:'Verbて + はいけない',meaning:'Tidak boleh makan di sini.',examples:[{jp:'ここで食べてはいけません。',id:'Tidak boleh makan di sini.'}]},
  {level:'N5',title:'たことがある',jp:'Verbた + ことがある',meaning:'Saya pernah pergi ke Jepang.',examples:[{jp:'日本へ行ったことがあります。',id:'Saya pernah pergi ke Jepang.'}]},
  {level:'N5',title:'ほうがいい',jp:'Verbた/ない + ほうがいい',meaning:'Sebaiknya tidur lebih awal.',examples:[{jp:'早く寝たほうがいいです。',id:'Sebaiknya tidur lebih awal.'}]},
  {level:'N4',title:'間 / 間に',jp:'Verb dictionary + 間/間に',meaning:'Saat belajar, saya mendengar musik.',examples:[{jp:'勉強している間、音楽を聞きます。',id:'Saat belajar, saya mendengar musik.'}]},
  {level:'N4',title:'後で',jp:'Verbた / Noun の + 後で',meaning:'Setelah PR, saya tidur.',examples:[{jp:'宿題をした後で寝ます。',id:'Setelah PR, saya tidur.'}]},
  {level:'N4',title:'前に',jp:'Verb dictionary / Noun の + 前に',meaning:'Sebelum tidur saya membaca.',examples:[{jp:'寝る前に本を読みます。',id:'Sebelum tidur saya membaca.'}]},
  {level:'N4',title:'ば',jp:'Conditional ば',meaning:'Kalau murah saya beli.',examples:[{jp:'安ければ買います。',id:'Kalau murah saya beli.'}]},
  {level:'N3',title:'〜ことがある',jp:'Verbdic + ことがある',meaning:'Ada kalanya terlambat.',examples:[{jp:'遅刻することがあります。',id:'Ada kalanya terlambat.'}]},
  {level:'N3',title:'〜てみる',jp:'Verbて + みる',meaning:'Coba membuat masakan ini.',examples:[{jp:'この料理を作ってみます。',id:'Coba membuat masakan ini.'}]},
  {level:'N4',title:'なら',jp:'Noun/Verb + なら',meaning:'Kalau bahasa Jepang, saya bisa sedikit.',examples:[{jp:'日本語なら少し話せます。',id:'Kalau bahasa Jepang, saya bisa sedikit.'}]},
  {level:'N4',title:'かもしれない',jp:'Plain form + かもしれない',meaning:'Besok mungkin hujan.',examples:[{jp:'明日雨かもしれません。',id:'Besok mungkin hujan.'}]},
  {level:'N4',title:'はずだ',jp:'Plain form + はずだ',meaning:'Dia seharusnya datang.',examples:[{jp:'彼は来るはずです。',id:'Dia seharusnya datang.'}]},
  {level:'N4',title:'ようになる',jp:'Verb dictionary + ようになる',meaning:'Saya jadi bisa membaca kanji.',examples:[{jp:'漢字が読めるようになりました。',id:'Saya jadi bisa membaca kanji.'}]},
  {level:'N4',title:'ことができる',jp:'Verb dictionary + ことができる',meaning:'Bisa berenang.',examples:[{jp:'泳ぐことができます。',id:'Bisa berenang.'}]},
  {level:'N4',title:'なければならない',jp:'Verbない stem + なければならない',meaning:'Harus belajar.',examples:[{jp:'勉強しなければなりません。',id:'Harus belajar.'}]},
  {level:'N4',title:'なくてもいい',jp:'Verbない stem + なくてもいい',meaning:'Tidak harus datang.',examples:[{jp:'来なくてもいいです。',id:'Tidak harus datang.'}]},
  {level:'N4',title:'そうだ',jp:'Adj/Verb stem + そうだ',meaning:'Kelihatannya enak.',examples:[{jp:'おいしそうです。',id:'Kelihatannya enak.'}]},
  {level:'N4',title:'てしまう',jp:'Verbて + しまう',meaning:'Saya terlanjur lupa dompet.',examples:[{jp:'財布を忘れてしまいました。',id:'Saya terlanjur lupa dompet.'}]},
  {level:'N3',title:'あまり',jp:'Verb/Adj + あまり',meaning:'Karena terlalu sibuk, saya lupa.',examples:[{jp:'忙しさのあまり、忘れました。',id:'Karena terlalu sibuk, saya lupa.'}]},
  {level:'N3',title:'ばかりでなく',jp:'A ばかりでなく B',meaning:'Dia bisa Inggris dan juga Jepang.',examples:[{jp:'彼は英語ばかりでなく日本語も話せます。',id:'Dia bisa Inggris dan juga Jepang.'}]},
  {level:'N3',title:'べきだ',jp:'Verb dictionary + べきだ',meaning:'Janji harus ditepati.',examples:[{jp:'約束は守るべきです。',id:'Janji harus ditepati.'}]},
  {level:'N3',title:'わけではない',jp:'Plain + わけではない',meaning:'Bukan berarti saya benci.',examples:[{jp:'嫌いなわけではありません。',id:'Bukan berarti saya benci.'}]},
  {level:'N3',title:'はずがない',jp:'Plain + はずがない',meaning:'Tidak mungkin dia tidak tahu.',examples:[{jp:'彼が知らないはずがない。',id:'Tidak mungkin dia tidak tahu.'}]},
  {level:'N3',title:'によって',jp:'Noun + によって',meaning:'Cara berpikir berbeda tergantung orang.',examples:[{jp:'人によって考え方が違います。',id:'Cara berpikir berbeda tergantung orang.'}]},
  {level:'N3',title:'について',jp:'Noun + について',meaning:'Berbicara tentang budaya Jepang.',examples:[{jp:'日本文化について話します。',id:'Berbicara tentang budaya Jepang.'}]},
  {level:'N3',title:'として',jp:'Noun + として',meaning:'Bekerja sebagai guru.',examples:[{jp:'教師として働いています。',id:'Bekerja sebagai guru.'}]},
  {level:'N3',title:'うちに',jp:'Plain + うちに',meaning:'Ingin jalan-jalan selagi muda.',examples:[{jp:'若いうちに旅行したいです。',id:'Ingin jalan-jalan selagi muda.'}]},
  {level:'N3',title:'一方だ',jp:'Verb dictionary + 一方だ',meaning:'Harga terus naik.',examples:[{jp:'物価は上がる一方です。',id:'Harga terus naik.'}]},
  {level:'N3',title:'ことになっている',jp:'Verb dictionary + ことになっている',meaning:'Besok dijadwalkan ada rapat.',examples:[{jp:'明日会議があることになっています。',id:'Besok dijadwalkan ada rapat.'}]},
  {level:'N3',title:'ように',jp:'Verb dictionary/ない + ように',meaning:'Mencatat agar tidak lupa.',examples:[{jp:'忘れないようにメモします。',id:'Mencatat agar tidak lupa.'}]},
  {level:'N3',title:'間',jp:'Verb dictionary / ている + 間',meaning:'Tolong diam selama ibu sedang tidur.',examples:[{jp:'母が寝ている間、静かにしてください。',id:'Tolong diam selama ibu sedang tidur.'}]},
  {level:'N3',title:'間に',jp:'Verb dictionary / ている + 間に',meaning:'Saya kerja paruh waktu selama liburan musim panas.',examples:[{jp:'夏休みの間にアルバイトをしました。',id:'Saya kerja paruh waktu selama liburan musim panas.'}]},
  {level:'N3',title:'てからでないと',jp:'Verbて + からでないと',meaning:'Kalau belum bertanya ke guru, saya tidak bisa menjawab.',examples:[{jp:'先生に聞いてからでないと、答えられません。',id:'Kalau belum bertanya ke guru, saya tidak bisa menjawab.'}]},
  {level:'N3',title:'てからでなければ',jp:'Verbて + からでなければ',meaning:'Kalau belum membaca penjelasan, tidak bisa menggunakannya.',examples:[{jp:'説明を読んでからでなければ、使えません。',id:'Kalau belum membaca penjelasan, tidak bisa menggunakannya.'}]},
  {level:'N3',title:'とおりに',jp:'Verb dictionary/た + とおりに',meaning:'Tulis sesuai yang dikatakan guru.',examples:[{jp:'先生が言ったとおりに書いてください。',id:'Tulis sesuai yang dikatakan guru.'}]},
  {level:'N3',title:'Noun のとおりに',jp:'Noun + のとおりに',meaning:'Saya merakit sesuai petunjuk.',examples:[{jp:'説明書のとおりに組み立てました。',id:'Saya merakit sesuai petunjuk.'}]},
  {level:'N3',title:'たびに',jp:'Verb dictionary / Noun の + たびに',meaning:'Setiap kali mendengar lagu ini, saya teringat masa sekolah.',examples:[{jp:'この歌を聞くたびに、学生時代を思い出します。',id:'Setiap kali mendengar lagu ini, saya teringat masa sekolah.'}]},
  {level:'N3',title:'ば〜ほど',jp:'Verbば / Adjば + ほど',meaning:'Bahasa Jepang semakin dipelajari semakin menarik.',examples:[{jp:'日本語は勉強すればするほど面白くなります。',id:'Bahasa Jepang semakin dipelajari semakin menarik.'}]},
  {level:'N3',title:'によって（原因）',jp:'Noun + によって',meaning:'Kereta berhenti karena hujan deras.',examples:[{jp:'大雨によって電車が止まりました。',id:'Kereta berhenti karena hujan deras.'}]},
  {level:'N3',title:'によって（手段）',jp:'Noun + によって',meaning:'Mengumpulkan informasi melalui internet.',examples:[{jp:'インターネットによって情報を集めます。',id:'Mengumpulkan informasi melalui internet.'}]},
  {level:'N3',title:'によって（違い）',jp:'Noun + によって',meaning:'Budaya berbeda tergantung negaranya.',examples:[{jp:'国によって文化が違います。',id:'Budaya berbeda tergantung negaranya.'}]},
  {level:'N3',title:'くらい〜はない',jp:'Noun くらい + adjective + はない',meaning:'Tidak ada yang sepenting keluarga.',examples:[{jp:'家族くらい大切なものはありません。',id:'Tidak ada yang sepenting keluarga.'}]},
  {level:'N3',title:'くらい / ぐらい',jp:'Noun / Verb plain + くらい',meaning:'Saya lelah sampai tidak bisa berjalan.',examples:[{jp:'歩けないくらい疲れました。',id:'Saya lelah sampai tidak bisa berjalan.'}]},
  {level:'N3',title:'ほど',jp:'Plain form + ほど',meaning:'Saya senang sampai menangis.',examples:[{jp:'涙が出るほど嬉しかったです。',id:'Saya senang sampai menangis.'}]},
  {level:'N3',title:'に限る',jp:'Verb dictionary / Noun + に限る',meaning:'Saat lelah, yang terbaik adalah tidur.',examples:[{jp:'疲れた時は寝るに限ります。',id:'Saat lelah, yang terbaik adalah tidur.'}]},
  {level:'N3',title:'に対して',jp:'Noun + に対して',meaning:'Tidak boleh berkata tidak sopan kepada guru.',examples:[{jp:'先生に対して失礼なことを言ってはいけません。',id:'Tidak boleh berkata tidak sopan kepada guru.'}]},
  {level:'N3',title:'かわりに',jp:'Verb plain / Noun の + かわりに',meaning:'Saya pergi belanja menggantikan kakak.',examples:[{jp:'兄のかわりに買い物に行きました。',id:'Saya pergi belanja menggantikan kakak.'}]},
  {level:'N3',title:'反面',jp:'Plain form + 反面',meaning:'Pekerjaan ini berat, tetapi di sisi lain bermakna.',examples:[{jp:'この仕事は大変な反面、やりがいがあります。',id:'Pekerjaan ini berat, tetapi di sisi lain bermakna.'}]},
  {level:'N3',title:'というより',jp:'A というより B',meaning:'Dia lebih seperti teman daripada guru.',examples:[{jp:'彼は先生というより友達のようです。',id:'Dia lebih seperti teman daripada guru.'}]},
  {level:'N3',title:'ために',jp:'Verb dictionary / Noun の + ために',meaning:'Saya belajar setiap hari agar lulus.',examples:[{jp:'合格するために毎日勉強しています。',id:'Saya belajar setiap hari agar lulus.'}]},
  {level:'N3',title:'ためだ',jp:'Plain form + ためだ',meaning:'Saya terlambat karena kereta berhenti.',examples:[{jp:'遅れたのは電車が止まったためです。',id:'Saya terlambat karena kereta berhenti.'}]},
  {level:'N3',title:'たとえ〜ても',jp:'たとえ + plain form + ても',meaning:'Sekalipun gagal, saya tidak akan menyerah.',examples:[{jp:'たとえ失敗しても、あきらめません。',id:'Sekalipun gagal, saya tidak akan menyerah.'}]},
  {level:'N3',title:'さえ〜ば',jp:'Noun さえ + Verbば',meaning:'Asal ada waktu, saya ingin bepergian.',examples:[{jp:'時間さえあれば、旅行したいです。',id:'Asal ada waktu, saya ingin bepergian.'}]},
  {level:'N3',title:'ということだ',jp:'Plain form + ということだ',meaning:'Katanya besok libur.',examples:[{jp:'明日は休みということです。',id:'Katanya besok libur.'}]},
  {level:'N3',title:'とか',jp:'Plain form + とか',meaning:'Saya dengar katanya Tanaka pindah.',examples:[{jp:'田中さんは引っ越したとか聞きました。',id:'Saya dengar katanya Tanaka pindah.'}]},
  {level:'N3',title:'という',jp:'Noun + という + Noun',meaning:'Saya belajar di situs bernama NihongoPro.',examples:[{jp:'Nihongo Pro Academyというサイトで勉強しています。',id:'Saya belajar di situs bernama NihongoPro.'}]},
  {level:'N3',title:'と言われている',jp:'Plain form + と言われている',meaning:'Bahasa Jepang dikatakan sulit.',examples:[{jp:'日本語は難しいと言われています。',id:'Bahasa Jepang dikatakan sulit.'}]},
  {level:'N3',title:'ことは〜が',jp:'Verb/Adj + ことは + same word + が',meaning:'Memang bisa membaca, tapi tidak paham artinya.',examples:[{jp:'読めることは読めますが、意味は分かりません。',id:'Memang bisa membaca, tapi tidak paham artinya.'}]},
  {level:'N3',title:'とは限らない',jp:'Plain form + とは限らない',meaning:'Barang mahal belum tentu bagus.',examples:[{jp:'高いものがいいとは限りません。',id:'Barang mahal belum tentu bagus.'}]},
  {level:'N3',title:'ないことはない',jp:'Verbない + ことはない',meaning:'Bukan tidak bisa makan, tapi saya tidak suka.',examples:[{jp:'食べられないことはないですが、好きではありません。',id:'Bukan tidak bisa makan, tapi saya tidak suka.'}]},
  {level:'N2',title:'あげく',jp:'Verbた / Noun の + あげく',meaning:'Setelah banyak berpikir, saya menolak.',examples:[{jp:'考えたあげく、断りました。',id:'Setelah banyak berpikir, saya menolak.'}]},
  {level:'N2',title:'ばかりか',jp:'A ばかりか B',meaning:'Dia bukan hanya telat, PR juga lupa.',examples:[{jp:'彼は遅刻ばかりか宿題も忘れた。',id:'Dia bukan hanya telat, PR juga lupa.'}]},
  {level:'N2',title:'だけあって',jp:'Noun/Verb + だけあって',meaning:'Sesuai ekspektasi profesional, dia mahir.',examples:[{jp:'プロだけあって上手です。',id:'Sesuai ekspektasi profesional, dia mahir.'}]},
  {level:'N2',title:'に基づいて',jp:'Noun + に基づいて',meaning:'Menilai berdasarkan data.',examples:[{jp:'データに基づいて判断します。',id:'Menilai berdasarkan data.'}]},
  {level:'N2',title:'に応じて',jp:'Noun + に応じて',meaning:'Mengubah sesuai situasi.',examples:[{jp:'状況に応じて変えます。',id:'Mengubah sesuai situasi.'}]},
  {level:'N2',title:'に関して',jp:'Noun + に関して',meaning:'Ada pertanyaan terkait ujian.',examples:[{jp:'試験に関して質問があります。',id:'Ada pertanyaan terkait ujian.'}]},
  {level:'N2',title:'を通して',jp:'Noun + を通して',meaning:'Belajar melalui pengalaman.',examples:[{jp:'経験を通して学びました。',id:'Belajar melalui pengalaman.'}]},
  {level:'N2',title:'に違いない',jp:'Plain + に違いない',meaning:'Dia pasti tahu.',examples:[{jp:'彼は知っているに違いない。',id:'Dia pasti tahu.'}]},
  {level:'N2',title:'わけにはいかない',jp:'Verb dictionary + わけにはいかない',meaning:'Tidak bisa berhenti sekarang.',examples:[{jp:'今やめるわけにはいかない。',id:'Tidak bisa berhenti sekarang.'}]},
  {level:'N2',title:'ものの',jp:'Plain + ものの',meaning:'Sudah beli tapi belum dipakai.',examples:[{jp:'買ったものの使っていません。',id:'Sudah beli tapi belum dipakai.'}]},
  {level:'N2',title:'ざるを得ない',jp:'Verbない stem + ざるを得ない',meaning:'Terpaksa membatalkan.',examples:[{jp:'中止せざるを得ません。',id:'Terpaksa membatalkan.'}]},
  {level:'N2',title:'次第',jp:'Verbます stem + 次第',meaning:'Saya hubungi begitu tiba.',examples:[{jp:'着き次第連絡します。',id:'Saya hubungi begitu tiba.'}]},
  {level:'N1',title:'あえて',jp:'あえて + Verb',meaning:'Saya sengaja menyampaikan pendapat berbeda.',examples:[{jp:'あえて反対意見を言います。',id:'Saya sengaja menyampaikan pendapat berbeda.'}]},
  {level:'N1',title:'いかんだ',jp:'Noun + いかんだ',meaning:'Menilai tergantung hasil.',examples:[{jp:'結果いかんで判断します。',id:'Menilai tergantung hasil.'}]},
  {level:'N1',title:'を皮切りに',jp:'Noun + を皮切りに',meaning:'Pertunjukan dimulai dari Tokyo.',examples:[{jp:'東京を皮切りに公演が始まった。',id:'Pertunjukan dimulai dari Tokyo.'}]},
  {level:'N1',title:'に即して',jp:'Noun + に即して',meaning:'Berpikir sesuai realitas.',examples:[{jp:'現実に即して考える。',id:'Berpikir sesuai realitas.'}]},
  {level:'N1',title:'を余儀なくされる',jp:'Noun + を余儀なくされる',meaning:'Terpaksa mengubah rencana.',examples:[{jp:'計画の変更を余儀なくされた。',id:'Terpaksa mengubah rencana.'}]},
  {level:'N1',title:'までもない',jp:'Verb dictionary + までもない',meaning:'Tidak perlu dijelaskan.',examples:[{jp:'説明するまでもない。',id:'Tidak perlu dijelaskan.'}]},
  {level:'N1',title:'に堪えない',jp:'Noun/Verb + に堪えない',meaning:'Cerita yang tidak tertahankan untuk didengar.',examples:[{jp:'聞くに堪えない話です。',id:'Cerita yang tidak tertahankan untuk didengar.'}]},
  {level:'N1',title:'べく',jp:'Verb dictionary + べく',meaning:'Berusaha agar lulus.',examples:[{jp:'合格すべく努力しています。',id:'Berusaha agar lulus.'}]},
  {level:'N1',title:'が早いか',jp:'Verb dictionary + が早いか',meaning:'Begitu bel berbunyi, dia keluar.',examples:[{jp:'ベルが鳴るが早いか出て行った。',id:'Begitu bel berbunyi, dia keluar.'}]},
  {level:'N1',title:'にもまして',jp:'Noun + にもまして',meaning:'Lebih sibuk dari sebelumnya.',examples:[{jp:'以前にもまして忙しい。',id:'Lebih sibuk dari sebelumnya.'}]},
  {level:'N1',title:'ずにはおかない',jp:'Verbない stem + ずにはおかない',meaning:'Film ini pasti membuat terharu.',examples:[{jp:'この映画は感動させずにはおかない。',id:'Film ini pasti membuat terharu.'}]},
  {level:'N1',title:'ならでは',jp:'Noun + ならでは',meaning:'Suasana khas Kyoto.',examples:[{jp:'京都ならではの雰囲気です。',id:'Suasana khas Kyoto.'}]},
  {level:'N5',title:'～ませんでした',jp:'Verbます stem + ませんでした',meaning:'Kemarin tidak pergi ke sekolah.',examples:[{jp:'昨日は学校に行きませんでした。',id:'Kemarin tidak pergi ke sekolah.'}]},
  {level:'N5',title:'～ました',jp:'Verbます stem + ました',meaning:'Kemarin, saya menonton film.',examples:[{jp:'昨日、映画を見ました。',id:'Kemarin, saya menonton film.'}]},
  {level:'N5',title:'どんな / どれ / どこ',jp:'どんな + Noun',meaning:'Suka film seperti apa?',examples:[{jp:'どんな映画が好きですか。',id:'Suka film seperti apa?'}]},
  {level:'N5',title:'〜が好き / 嫌い / 上手 / 下手',jp:'Noun + が好き/嫌い/上手/下手',meaning:'Saya suka sushi.',examples:[{jp:'私はすしが好きです。',id:'Saya suka sushi.'}]},
  {level:'N5',title:'〜でしょう',jp:'Plain + でしょう',meaning:'Besok mungkin hujan.',examples:[{jp:'明日は雨でしょう。',id:'Besok mungkin hujan.'}]},
  {level:'N5',title:'〜と (quote particle)',jp:'Plain + と言います/思います',meaning:'Dia berkata "akan datang".',examples:[{jp:'彼は「来ます」と言いました。',id:'Dia berkata "akan datang".'}]},
  {level:'N5',title:'ちょっと',jp:'ちょっと + adj/req',meaning:'Tolong tunggu sebentar.',examples:[{jp:'ちょっと待ってください。',id:'Tolong tunggu sebentar.'}]},
  {level:'N5',title:'〜で (cause)',jp:'Noun + で',meaning:'Absen karena sakit.',examples:[{jp:'病気で休みました。',id:'Absen karena sakit.'}]},
  {level:'N5',title:'〜ね / 〜よ',jp:'Sentence + ね/よ',meaning:'Hari ini panas ya.',examples:[{jp:'今日は暑いですね。',id:'Hari ini panas ya.'}]},
  {level:'N4',title:'〜たり〜たりする',jp:'Verbた + り + Verbた + りする',meaning:'Akhir pekan menonton film, membaca buku, dsb.',examples:[{jp:'週末は映画を見たり、本を読んだりします。',id:'Akhir pekan menonton film, membaca buku, dsb.'}]},
  {level:'N4',title:'〜すぎる',jp:'Adj stem / Verb + すぎる',meaning:'Makan terlalu banyak, perut tidak enak.',examples:[{jp:'食べすぎて、気持ちが悪い。',id:'Makan terlalu banyak, perut tidak enak.'}]},
  {level:'N4',title:'〜てほしい',jp:'Verbて + ほしい',meaning:'Ingin (kamu) menjelaskan lebih lanjut.',examples:[{jp:'もっと説明してほしいです。',id:'Ingin (kamu) menjelaskan lebih lanjut.'}]},
  {level:'N4',title:'〜ことができる',jp:'Verb dictionary + ことができる',meaning:'Bisa menulis kanji.',examples:[{jp:'漢字を書くことができます。',id:'Bisa menulis kanji.'}]},
  {level:'N4',title:'〜なければならない / なきゃ',jp:'Verbない + なければならない',meaning:'Harus minum obat.',examples:[{jp:'薬を飲まなければなりません。',id:'Harus minum obat.'}]},
  {level:'N4',title:'〜てはいけない',jp:'Verbて + はいけない',meaning:'Di perpustakaan tidak boleh berbicara.',examples:[{jp:'図書館では話してはいけません。',id:'Di perpustakaan tidak boleh berbicara.'}]},
  {level:'N4',title:'〜ようだ / 〜みたいだ',jp:'Plain + ようだ/みたいだ',meaning:'Sepertinya dia lelah.',examples:[{jp:'彼は疲れているようです。',id:'Sepertinya dia lelah.'}]},
  {level:'N4',title:'〜間に',jp:'Verb + 間に',meaning:'(Saya) tertidur selama pelajaran.',examples:[{jp:'授業中に寝てしまいました。',id:'(Saya) tertidur selama pelajaran.'}]},
  {level:'N4',title:'〜前に',jp:'Verbdic / Noun の + 前に',meaning:'Sikat gigi sebelum tidur.',examples:[{jp:'寝る前に歯を磨きます。',id:'Sikat gigi sebelum tidur.'}]},
  {level:'N4',title:'〜後で',jp:'Verbた + 後で',meaning:'Setelah makan siang, jalan-jalan.',examples:[{jp:'昼ご飯を食べた後で、散歩します。',id:'Setelah makan siang, jalan-jalan.'}]},
  {level:'N3',title:'〜わけにはいかない',jp:'Verb + わけにはいかない',meaning:'Tidak bisa berhenti sekarang juga.',examples:[{jp:'今さらやめるわけにはいかない。',id:'Tidak bisa berhenti sekarang juga.'}]},
  {level:'N3',title:'〜てたまらない',jp:'Adj te + たまらない',meaning:'Mengantuk luar biasa / tidak tertahankan.',examples:[{jp:'眠くてたまらない。',id:'Mengantuk luar biasa / tidak tertahankan.'}]},
  {level:'N3',title:'〜てしまえば',jp:'Verbて + しまえば',meaning:'Begitu dimulai, ternyata cukup mudah.',examples:[{jp:'始めてしまえば、案外簡単です。',id:'Begitu dimulai, ternyata cukup mudah.'}]},
  {level:'N3',title:'〜かどうか',jp:'Plain form + かどうか',meaning:'Belum tahu apakah akan pergi atau tidak.',examples:[{jp:'行くかどうかまだ分かりません。',id:'Belum tahu apakah akan pergi atau tidak.'}]},
  {level:'N3',title:'〜ように言う / 頼む',jp:'〜ように + 言う/頼む',meaning:'Saya bilang agar cepat datang.',examples:[{jp:'早く来るように言いました。',id:'Saya bilang agar cepat datang.'}]},
  {level:'N3',title:'〜きる / 〜きれない',jp:'Verbます stem + きる',meaning:'Berhasil membaca sampai habis.',examples:[{jp:'最後まで読みきりました。',id:'Berhasil membaca sampai habis.'}]},
  {level:'N3',title:'〜でしょう / だろう',jp:'Plain + でしょう',meaning:'Dia sekarang mungkin sibuk.',examples:[{jp:'彼は今、忙しいでしょう。',id:'Dia sekarang mungkin sibuk.'}]},
  {level:'N3',title:'〜ばよかった',jp:'Verbば + よかった',meaning:'Seharusnya belajar lebih awal.',examples:[{jp:'もっと早く勉強しておけばよかった。',id:'Seharusnya belajar lebih awal.'}]},
  {level:'N3',title:'〜たほうがいい',jp:'Verbた + ほうがいい',meaning:'Sebaiknya pergi ke dokter lho.',examples:[{jp:'医者に行ったほうがいいですよ。',id:'Sebaiknya pergi ke dokter lho.'}]},
  {level:'N3',title:'〜に違いない',jp:'Plain + に違いない',meaning:'Dia pasti jujur.',examples:[{jp:'彼は正直に違いない。',id:'Dia pasti jujur.'}]},
  {level:'N3',title:'〜たとたん（に）',jp:'Verbた + とたん（に）',meaning:'Tepat saat telepon berbunyi, dia datang.',examples:[{jp:'電話が鳴ったとたん、彼が来た。',id:'Tepat saat telepon berbunyi, dia datang.'}]},
  {level:'N3',title:'〜ながらも',jp:'Plain + ながらも',meaning:'Meskipun gagal, terus melanjutkan.',examples:[{jp:'失敗しながらも続けています。',id:'Meskipun gagal, terus melanjutkan.'}]},
  {level:'N3',title:'〜てからというもの',jp:'Verbて + からというもの',meaning:'Sejak menikah, makan di luar berkurang.',examples:[{jp:'結婚してからというもの、外食が減った。',id:'Sejak menikah, makan di luar berkurang.'}]},
  {level:'N3',title:'〜たびに',jp:'Verbdic / Nounの + たびに',meaning:'Setiap kali datang ke Jepang pasti berkunjung.',examples:[{jp:'日本に来るたびに必ず訪ねます。',id:'Setiap kali datang ke Jepang pasti berkunjung.'}]},
  {level:'N3',title:'〜ような気がする',jp:'Plain + ような気がする',meaning:'Saya merasa dia belum datang.',examples:[{jp:'彼女はまだ来ていないような気がします。',id:'Saya merasa dia belum datang.'}]},
  {level:'N3',title:'〜をはじめ',jp:'Noun + をはじめ',meaning:'Mulai dari bahasa Jepang, sedang belajar bahasa-bahasa Asia.',examples:[{jp:'日本語をはじめ、アジアの言語を学んでいる。',id:'Mulai dari bahasa Jepang, sedang belajar bahasa-bahasa Asia.'}]},
  {level:'N2',title:'〜限り',jp:'Verb/Adj + 限り',meaning:'Akan membantu semaksimal mungkin.',examples:[{jp:'できる限り手伝います。',id:'Akan membantu semaksimal mungkin.'}]},
  {level:'N2',title:'〜一方で',jp:'Plain + 一方で',meaning:'Sambil belajar, juga bekerja.',examples:[{jp:'勉強している一方で、仕事もしています。',id:'Sambil belajar, juga bekerja.'}]},
  {level:'N2',title:'〜際（に）',jp:'Noun の / Verbdic + 際に',meaning:'Saat masuk, tunjukkan tiket Anda.',examples:[{jp:'ご入場の際に、チケットをご提示ください。',id:'Saat masuk, tunjukkan tiket Anda.'}]},
  {level:'N2',title:'〜に伴って',jp:'Noun / Verbdic + に伴って',meaning:'Seiring penuaan populasi, biaya medis juga meningkat.',examples:[{jp:'高齢化に伴って、医療費も増えています。',id:'Seiring penuaan populasi, biaya medis juga meningkat.'}]},
  {level:'N2',title:'〜つつある',jp:'Verbます stem + つつある',meaning:'Situasi sedang dalam proses perbaikan.',examples:[{jp:'状況は改善されつつあります。',id:'Situasi sedang dalam proses perbaikan.'}]},
  {level:'N2',title:'〜つつ',jp:'Verbます stem + つつ',meaning:'Meskipun mengerti, tidak bisa mengatakannya.',examples:[{jp:'分かりつつも、言えませんでした。',id:'Meskipun mengerti, tidak bisa mengatakannya.'}]},
  {level:'N2',title:'〜ものだ',jp:'Plain + ものだ',meaning:'Manusia pada suatu saat pasti mati.',examples:[{jp:'人間はいつか死ぬものだ。',id:'Manusia pada suatu saat pasti mati.'}]},
  {level:'N2',title:'〜ものがある',jp:'Plain + ものがある',meaning:'Ada kekuatan persuasi dalam perkataannya.',examples:[{jp:'彼の言葉には説得力があるものがある。',id:'Ada kekuatan persuasi dalam perkataannya.'}]},
  {level:'N2',title:'〜ほどだ',jp:'Verb/Adj + ほどだ',meaning:'Sangat tersentuh sampai bisa menangis.',examples:[{jp:'泣けるほど感動しました。',id:'Sangat tersentuh sampai bisa menangis.'}]},
  {level:'N2',title:'〜どころか',jp:'Noun/Plain + どころか',meaning:'Bukan hanya tidak bisa berjalan, berdiri pun tidak bisa.',examples:[{jp:'歩くどころか、立てません。',id:'Bukan hanya tidak bisa berjalan, berdiri pun tidak bisa.'}]},
  {level:'N2',title:'〜からこそ',jp:'Plain + からこそ',meaning:'Justru karena sulit, bisa berkembang.',examples:[{jp:'苦しいからこそ、成長できる。',id:'Justru karena sulit, bisa berkembang.'}]},
  {level:'N2',title:'〜のみならず',jp:'Noun/Plain + のみならず',meaning:'Bukan hanya biaya, waktu pun bisa dihemat.',examples:[{jp:'費用のみならず、時間も節約できます。',id:'Bukan hanya biaya, waktu pun bisa dihemat.'}]},
  {level:'N2',title:'〜べきではない',jp:'Verbdic + べきではない',meaning:'Tidak seharusnya berbohong.',examples:[{jp:'嘘をつくべきではない。',id:'Tidak seharusnya berbohong.'}]},
  {level:'N2',title:'〜といった',jp:'Noun + といった + Noun',meaning:'Sedang belajar bahasa seperti Inggris dan Jepang.',examples:[{jp:'英語や日本語といった言語を学んでいます。',id:'Sedang belajar bahasa seperti Inggris dan Jepang.'}]},
  {level:'N2',title:'〜にしたがって',jp:'Noun/Verbdic + にしたがって',meaning:'Seiring bertumbuh, tanggung jawab juga bertambah.',examples:[{jp:'成長するにしたがって、責任も増える。',id:'Seiring bertumbuh, tanggung jawab juga bertambah.'}]},
  {level:'N2',title:'〜を中心に',jp:'Noun + を中心に',meaning:'Berkembang dengan berpusat di Tokyo.',examples:[{jp:'東京を中心に展開しています。',id:'Berkembang dengan berpusat di Tokyo.'}]},
  {level:'N2',title:'〜に関わらず',jp:'Noun + に関わらず',meaning:'Terlepas dari cuaca, ada latihan.',examples:[{jp:'天気に関わらず、練習があります。',id:'Terlepas dari cuaca, ada latihan.'}]},
  {level:'N2',title:'〜かねる',jp:'Verbます stem + かねる',meaning:'Untuk hal itu saya tidak bisa menyetujuinya.',examples:[{jp:'その件については賛成しかねます。',id:'Untuk hal itu saya tidak bisa menyetujuinya.'}]},
  {level:'N1',title:'〜に至る',jp:'Noun/Verbdic + に至る',meaning:'Menyelidiki penyebab keadaan sampai di titik ini.',examples:[{jp:'事態がここまでに至った原因を調べる。',id:'Menyelidiki penyebab keadaan sampai di titik ini.'}]},
  {level:'N1',title:'〜とはいえ',jp:'Plain + とはいえ',meaning:'Meskipun gagal, jadi pengalaman.',examples:[{jp:'失敗したとはいえ、経験になりました。',id:'Meskipun gagal, jadi pengalaman.'}]},
  {level:'N1',title:'〜と相まって',jp:'Noun + と相まって',meaning:'Bakat dan usahanya bergabung sehingga berhasil.',examples:[{jp:'彼女の才能と努力が相まって成功した。',id:'Bakat dan usahanya bergabung sehingga berhasil.'}]},
  {level:'N1',title:'〜をもって',jp:'Noun + をもって',meaning:'Dengan hari ini, saya mengundurkan diri.',examples:[{jp:'今日をもって、退職いたします。',id:'Dengan hari ini, saya mengundurkan diri.'}]},
  {level:'N1',title:'〜に至っては',jp:'Noun + に至っては',meaning:'Kalau soal manajer, dia sama sekali tidak mendengarkan.',examples:[{jp:'部長に至っては全く聞いていない。',id:'Kalau soal manajer, dia sama sekali tidak mendengarkan.'}]},
  {level:'N1',title:'〜ずにはいられない',jp:'Verbない + ずにはいられない',meaning:'Menonton film itu, tidak bisa tidak menangis.',examples:[{jp:'あの映画を見て、泣かずにはいられなかった。',id:'Menonton film itu, tidak bisa tidak menangis.'}]},
  {level:'N1',title:'〜かのようだ',jp:'Clause + かのようだ',meaning:'Dia bertingkah seolah-olah tidak tahu apa-apa.',examples:[{jp:'彼女は何も知らないかのように振る舞った。',id:'Dia bertingkah seolah-olah tidak tahu apa-apa.'}]},
  {level:'N1',title:'〜にして',jp:'Noun + にして',meaning:'Menjadi orang jenius namun tetap rendah hati, luar biasa.',examples:[{jp:'天才にしてこの謙虚さはすばらしい。',id:'Menjadi orang jenius namun tetap rendah hati, luar biasa.'}]},
  {level:'N1',title:'〜が最後',jp:'Verbた + が最後',meaning:'Begitu dia ikut campur, pasti jadi repot.',examples:[{jp:'彼が絡むが最後、めんどくさいことになる。',id:'Begitu dia ikut campur, pasti jadi repot.'}]},
  {level:'N1',title:'〜ともなると',jp:'Noun + ともなると',meaning:'Kalau sudah jadi profesional, jumlah latihannya berbeda.',examples:[{jp:'プロともなると、練習量が違う。',id:'Kalau sudah jadi profesional, jumlah latihannya berbeda.'}]},
  {level:'N1',title:'〜ながらに',jp:'Noun/Verbます + ながらに',meaning:'Dia menceritakannya dengan berurai air mata.',examples:[{jp:'涙ながらに語ってくれました。',id:'Dia menceritakannya dengan berurai air mata.'}]},
  {level:'N1',title:'〜んばかり',jp:'Verbない + んばかり',meaning:'Mukanya hampir menangis.',examples:[{jp:'泣かんばかりの顔をしていた。',id:'Mukanya hampir menangis.'}]},
  {level:'N1',title:'〜を契機に',jp:'Noun + を契機に',meaning:'Mengambil momentum insiden ini, sistem berubah.',examples:[{jp:'この事件を契機に、制度が変わった。',id:'Mengambil momentum insiden ini, sistem berubah.'}]},

  {level:'N2',title:'〜とは',jp:'Noun + とは',meaning:'Yang disebut "konsistensi" adalah terus melanjutkan.',examples:[{jp:'「継続」とは続けることです。',id:'Yang disebut "konsistensi" adalah terus melanjutkan.'}]},
  {level:'N2',title:'〜というのは',jp:'Plain + というのは/というのも',meaning:'Alasan terlambat karena kereta berhenti.',examples:[{jp:'遅れたというのは電車が止まったから。',id:'Alasan terlambat karena kereta berhenti.'}]},
  {level:'N2',title:'〜といえば',jp:'Noun + といえば',meaning:'Kalau bicara tentang Jepang, itu Gunung Fuji.',examples:[{jp:'日本といえば富士山だ。',id:'Kalau bicara tentang Jepang, itu Gunung Fuji.'}]},
  {level:'N2',title:'〜として',jp:'Noun + として',meaning:'Menyatakan pendapat sebagai ahli.',examples:[{jp:'専門家として意見を述べる。',id:'Menyatakan pendapat sebagai ahli.'}]},
  {level:'N2',title:'〜にたいして',jp:'Noun + に対して',meaning:'Menjawab pertanyaan dengan sopan.',examples:[{jp:'質問に対して丁寧に答えた。',id:'Menjawab pertanyaan dengan sopan.'}]},
  {level:'N2',title:'〜に向けて',jp:'Noun + に向けて',meaning:'Berusaha menuju tujuan.',examples:[{jp:'目標に向けて努力する。',id:'Berusaha menuju tujuan.'}]},
  {level:'N2',title:'〜に反して',jp:'Noun + に反して',meaning:'Berlawanan dari perkiraan, ternyata sulit.',examples:[{jp:'予想に反して難しかった。',id:'Berlawanan dari perkiraan, ternyata sulit.'}]},
  {level:'N2',title:'〜によると',jp:'Noun + によると',meaning:'Menurut ramalan, besok hujan.',examples:[{jp:'予報によると明日は雨だ。',id:'Menurut ramalan, besok hujan.'}]},
  {level:'N2',title:'〜のもとで',jp:'Noun + のもとで',meaning:'Belajar di bawah bimbingan guru.',examples:[{jp:'先生の指導のもとで学んだ。',id:'Belajar di bawah bimbingan guru.'}]},
  {level:'N2',title:'〜をはじめとして',jp:'Noun + をはじめとして',meaning:'Diadakan di berbagai kota mulai dari Tokyo.',examples:[{jp:'東京をはじめとして各都市で開催。',id:'Diadakan di berbagai kota mulai dari Tokyo.'}]},
  {level:'N3',title:'〜にしても',jp:'Plain + にしても',meaning:'Bahkan jika memang begitu, ada masalah.',examples:[{jp:'そうだとしても、問題がある。',id:'Bahkan jika memang begitu, ada masalah.'}]},
  {level:'N3',title:'〜からすると',jp:'Noun + からすると/からすれば',meaning:'Kalau dilihat dari penampilannya, kelihatan sehat.',examples:[{jp:'外見からすると元気そうだ。',id:'Kalau dilihat dari penampilannya, kelihatan sehat.'}]},
  {level:'N3',title:'〜つつも',jp:'Verbます stem + つつも',meaning:'Walaupun mengerti, tidak bisa mengatakan.',examples:[{jp:'分かっていつつも言えなかった。',id:'Walaupun mengerti, tidak bisa mengatakan.'}]},
  {level:'N2',title:'〜いかんによって',jp:'Noun + いかんによって',meaning:'Penanganan berubah tergantung hasilnya.',examples:[{jp:'結果いかんによって対応が変わる。',id:'Penanganan berubah tergantung hasilnya.'}]},
  {level:'N2',title:'〜にほかならない',jp:'Plain/Noun + にほかならない',meaning:'Ini tidak lain adalah kesalahpahaman.',examples:[{jp:'これは誤解にほかならない。',id:'Ini tidak lain adalah kesalahpahaman.'}]},
  {level:'N2',title:'〜とともに',jp:'Noun/Verb + とともに',meaning:'Berubah seiring zaman.',examples:[{jp:'時代とともに変化する。',id:'Berubah seiring zaman.'}]},
  {level:'N2',title:'〜からして',jp:'Noun + からして',meaning:'Bahkan dari wajahnya pun sudah kelihatan capek.',examples:[{jp:'顔からして疲れている。',id:'Bahkan dari wajahnya pun sudah kelihatan capek.'}]},
  {level:'N2',title:'〜に際して',jp:'Noun/Verbdic + に際して',meaning:'Pada saat pembukaan, memberikan sambutan.',examples:[{jp:'開会に際して、挨拶をした。',id:'Pada saat pembukaan, memberikan sambutan.'}]},
  {level:'N2',title:'〜を通じて',jp:'Noun + を通じて',meaning:'Iklimnya hangat sepanjang tahun.',examples:[{jp:'一年を通じて温暖な気候だ。',id:'Iklimnya hangat sepanjang tahun.'}]},
  {level:'N2',title:'〜次第',jp:'Noun + 次第 / Verbます stem + 次第',meaning:'Segera setelah persiapan selesai, kami berangkat.',examples:[{jp:'準備が整い次第、出発します。',id:'Segera setelah persiapan selesai, kami berangkat.'}]},
  {level:'N2',title:'〜にわたって',jp:'Noun + にわたって',meaning:'Melanjutkan penelitian selama beberapa tahun.',examples:[{jp:'数年にわたって研究を続けた。',id:'Melanjutkan penelitian selama beberapa tahun.'}]},
  {level:'N2',title:'〜かねない',jp:'Verbます stem + かねない',meaning:'Jika terus seperti ini, bisa jadi gagal.',examples:[{jp:'このまま続くと失敗しかねない。',id:'Jika terus seperti ini, bisa jadi gagal.'}]},
  {level:'N1',title:'〜につけ',jp:'Nounの/Plain + につけ',meaning:'Baik senang maupun sedih.',examples:[{jp:'うれしいにつけ悲しいにつけ。',id:'Baik senang maupun sedih.'}]},
  {level:'N1',title:'〜ともなく',jp:'Verbdic + ともなく',meaning:'Melihat ke luar jendela tanpa bermaksud.',examples:[{jp:'見るともなく窓の外を見た。',id:'Melihat ke luar jendela tanpa bermaksud.'}]},
  {level:'N1',title:'〜ないものでもない',jp:'Verbない + ものでもない',meaning:'Bukan tidak bisa pergi.',examples:[{jp:'行けないものでもない。',id:'Bukan tidak bisa pergi.'}]},
  {level:'N1',title:'〜にたえない',jp:'Verbu/Noun + にたえない',meaning:'Cerita yang tidak tertahankan untuk didengar.',examples:[{jp:'聞くにたえない話だ。',id:'Cerita yang tidak tertahankan untuk didengar.'}]},
  {level:'N1',title:'〜をおいて',jp:'Noun + をおいて',meaning:'Selain kamu, siapa yang ada.',examples:[{jp:'君をおいて誰がいる。',id:'Selain kamu, siapa yang ada.'}]},
  {level:'N1',title:'〜まじき',jp:'Verbdic + まじき + Noun',meaning:'Perbuatan yang tidak seharusnya dilakukan seorang guru.',examples:[{jp:'教師にあるまじき行為だ。',id:'Perbuatan yang tidak seharusnya dilakukan seorang guru.'}]},
  {level:'N1',title:'〜ともすれば',jp:'ともすれば/ともすると',meaning:'Ada kecenderungan untuk terlupa.',examples:[{jp:'ともすれば忘れがちになる。',id:'Ada kecenderungan untuk terlupa.'}]},
  {level:'N1',title:'〜に即して',jp:'Noun + に即して',meaning:'Memberikan proposal yang sesuai realita.',examples:[{jp:'現実に即した提案をする。',id:'Memberikan proposal yang sesuai realita.'}]},
  {level:'N1',title:'〜なしに',jp:'Noun/Verbdic + なしに',meaning:'Tidak boleh masuk tanpa izin.',examples:[{jp:'許可なしに入ってはいけない。',id:'Tidak boleh masuk tanpa izin.'}]},
  {level:'N1',title:'〜ごとき / ごとく',jp:'Noun + の/Verbdic + ごとき/ごとく',meaning:'Muncul bagaikan badai.',examples:[{jp:'嵐のごとく現れた。',id:'Muncul bagaikan badai.'}]},
  {level:'N1',title:'〜に足る',jp:'Verbdic + に足る',meaning:'Ia adalah orang yang layak untuk dihormati.',examples:[{jp:'尊敬に足る人物だ。',id:'Ia adalah orang yang layak untuk dihormati.'}]},
  {level:'N1',title:'〜いかん',jp:'Noun + いかんで/いかんによっては',meaning:'Menilai tergantung hasilnya.',examples:[{jp:'結果いかんで判断します。',id:'Menilai tergantung hasilnya.'}]},
  {level:'N1',title:'〜を皮切りに',jp:'Noun + を皮切りに',meaning:'Tur nasional dimulai berawal dari Tokyo.',examples:[{jp:'東京を皮切りに全国ツアーが始まった。',id:'Tur nasional dimulai berawal dari Tokyo.'}]},
  {level:'N1',title:'〜ないまでも',jp:'Verbない + までも',meaning:'Walaupun tidak sempurna, usaha tetap perlu.',examples:[{jp:'完璧でないまでも、努力はすべきだ。',id:'Walaupun tidak sempurna, usaha tetap perlu.'}]},
  {level:'N1',title:'〜に堪えない',jp:'Verb辞書形 + に堪えない',meaning:'Perasaan yang tidak tertahankan kegembiraannya.',examples:[{jp:'喜びに堪えない気持ちだ。',id:'Perasaan yang tidak tertahankan kegembiraannya.'}]},
  {level:'N1',title:'〜べく',jp:'Verbdic + べく',meaning:'Berusaha setiap hari untuk mencapai tujuan.',examples:[{jp:'目標を達成すべく、日々努力する。',id:'Berusaha setiap hari untuk mencapai tujuan.'}]},];

const gl=document.getElementById('grammarList');
grammarData.forEach((g,i)=>{
  const d=document.createElement('div');d.className='grammar-card';
  const exHtml=g.examples.map(e=>`<div class="gc-ex"><span class="gc-jp">${e.jp}</span><span class="gc-id">${e.id}</span></div>`).join('');
  d.innerHTML=`<div class="gc-header" onclick="toggleGrammar(this.parentElement)"><div class="gc-left"><div class="gc-level">${g.level}</div><div><div class="gc-title">${g.title}</div><div class="gc-sub">${g.jp}</div></div></div><span class="gc-arrow">›</span></div><div class="gc-body"><div class="gc-content"><span class="gc-pattern">${g.jp}</span><div class="gc-meaning">${g.meaning}</div><div class="gc-examples">${exHtml}</div></div></div>`;
  gl.appendChild(d);
});
function toggleGrammar(el){el.classList.toggle('open')}

// Vocab — all themes
const vocabThemes={
  keluarga:[
    {jp:'家族',read:'かぞく',mean:'Keluarga',level:'N5'},{jp:'父',read:'ちち',mean:'Ayah (saya)',level:'N5'},{jp:'母',read:'はは',mean:'Ibu (saya)',level:'N5'},
    {jp:'兄',read:'あに',mean:'Kakak laki-laki',level:'N5'},{jp:'姉',read:'あね',mean:'Kakak perempuan',level:'N5'},{jp:'弟',read:'おとうと',mean:'Adik laki-laki',level:'N5'},
    {jp:'妹',read:'いもうと',mean:'Adik perempuan',level:'N5'},{jp:'友達',read:'ともだち',mean:'Teman',level:'N5'},{jp:'夫',read:'おっと',mean:'Suami (saya)',level:'N4'},
    {jp:'妻',read:'つま',mean:'Istri (saya)',level:'N4'},{jp:'息子',read:'むすこ',mean:'Anak laki-laki',level:'N4'},{jp:'娘',read:'むすめ',mean:'Anak perempuan',level:'N4'},
    {jp:'祖父',read:'そふ',mean:'Kakek (saya)',level:'N4'},{jp:'祖母',read:'そぼ',mean:'Nenek (saya)',level:'N4'},{jp:'親戚',read:'しんせき',mean:'Kerabat/Saudara jauh',level:'N3'},
    {jp:'おじさん',read:'おじさん',mean:'Paman',level:'N5'},{jp:'おばさん',read:'おばさん',mean:'Bibi',level:'N5'},{jp:'いとこ',read:'いとこ',mean:'Sepupu',level:'N4'},
  ,
    {jp:'親戚',read:'しんせき',mean:'Kerabat/Sanak saudara',level:'N3',ex:'親戚が集まる'},
    {jp:'夫',read:'おっと',mean:'Suami',level:'N4',ex:'夫が帰ってきた'},
],
  makanan:[
    {jp:'ご飯',read:'ごはん',mean:'Nasi/Makan',level:'N5'},{jp:'パン',read:'パン',mean:'Roti',level:'N5'},{jp:'肉',read:'にく',mean:'Daging',level:'N5'},
    {jp:'魚',read:'さかな',mean:'Ikan',level:'N5'},{jp:'野菜',read:'やさい',mean:'Sayuran',level:'N5'},{jp:'果物',read:'くだもの',mean:'Buah-buahan',level:'N5'},
    {jp:'水',read:'みず',mean:'Air (putih)',level:'N5'},{jp:'お茶',read:'おちゃ',mean:'Teh',level:'N5'},{jp:'コーヒー',read:'コーヒー',mean:'Kopi',level:'N5'},
    {jp:'牛乳',read:'ぎゅうにゅう',mean:'Susu sapi',level:'N5'},{jp:'卵',read:'たまご',mean:'Telur',level:'N5'},{jp:'塩',read:'しお',mean:'Garam',level:'N5'},
    {jp:'醤油',read:'しょうゆ',mean:'Kecap asin',level:'N4'},{jp:'味噌',read:'みそ',mean:'Pasta fermentasi kedelai',level:'N4'},{jp:'砂糖',read:'さとう',mean:'Gula',level:'N5'},
    {jp:'料理',read:'りょうり',mean:'Memasak/Masakan',level:'N5'},{jp:'定食',read:'ていしょく',mean:'Menu set (nasi+lauk)',level:'N4'},{jp:'刺身',read:'さしみ',mean:'Sashimi',level:'N4'},
    {jp:'寿司',read:'すし',mean:'Sushi',level:'N5'},{jp:'ラーメン',read:'ラーメン',mean:'Ramen',level:'N5'},{jp:'天ぷら',read:'てんぷら',mean:'Tempura',level:'N4'},
    {jp:'おにぎり',read:'おにぎり',mean:'Nasi kepal',level:'N5'},{jp:'弁当',read:'べんとう',mean:'Bekal makan siang',level:'N4'},{jp:'アレルギー',read:'アレルギー',mean:'Alergi',level:'N3'},
  ],
  transportasi:[
    {jp:'電車',read:'でんしゃ',mean:'Kereta listrik',level:'N5'},{jp:'バス',read:'バス',mean:'Bus',level:'N5'},{jp:'地下鉄',read:'ちかてつ',mean:'Kereta bawah tanah / MRT',level:'N5'},
    {jp:'タクシー',read:'タクシー',mean:'Taksi',level:'N5'},{jp:'自転車',read:'じてんしゃ',mean:'Sepeda',level:'N5'},{jp:'車',read:'くるま',mean:'Mobil',level:'N5'},
    {jp:'バイク',read:'バイク',mean:'Motor',level:'N5'},{jp:'飛行機',read:'ひこうき',mean:'Pesawat terbang',level:'N5'},{jp:'船',read:'ふね',mean:'Kapal',level:'N5'},
    {jp:'駅',read:'えき',mean:'Stasiun kereta',level:'N5'},{jp:'空港',read:'くうこう',mean:'Bandara',level:'N5'},{jp:'停留所',read:'ていりゅうじょ',mean:'Halte bus',level:'N4'},
    {jp:'乗り換え',read:'のりかえ',mean:'Ganti kereta/transit',level:'N4'},{jp:'切符',read:'きっぷ',mean:'Tiket',level:'N5'},{jp:'定期券',read:'ていきけん',mean:'Kartu langganan kereta',level:'N3'},
    {jp:'渋滞',read:'じゅうたい',mean:'Macet lalu lintas',level:'N3'},{jp:'信号',read:'しんごう',mean:'Lampu lalu lintas',level:'N4'},{jp:'交差点',read:'こうさてん',mean:'Persimpangan jalan',level:'N4'},
  ,
    {jp:'新幹線',read:'しんかんせん',mean:'Kereta Shinkansen',level:'N4',ex:'新幹線で移動する'},
    {jp:'乗り換え',read:'のりかえ',mean:'Transfer/Pindah kendaraan',level:'N3',ex:'東京で乗り換える'},
],
  pekerjaan:[
    {jp:'仕事',read:'しごと',mean:'Pekerjaan',level:'N5'},{jp:'会社',read:'かいしゃ',mean:'Perusahaan',level:'N5'},{jp:'会社員',read:'かいしゃいん',mean:'Karyawan',level:'N5'},
    {jp:'先生',read:'せんせい',mean:'Guru/Dokter',level:'N5'},{jp:'医者',read:'いしゃ',mean:'Dokter',level:'N5'},{jp:'看護師',read:'かんごし',mean:'Perawat',level:'N4'},
    {jp:'警察官',read:'けいさつかん',mean:'Polisi',level:'N4'},{jp:'消防士',read:'しょうぼうし',mean:'Pemadam kebakaran',level:'N4'},{jp:'エンジニア',read:'エンジニア',mean:'Insinyur/Engineer',level:'N4'},
    {jp:'デザイナー',read:'デザイナー',mean:'Desainer',level:'N4'},{jp:'プログラマー',read:'プログラマー',mean:'Programmer',level:'N4'},{jp:'公務員',read:'こうむいん',mean:'Pegawai negeri',level:'N3'},
    {jp:'弁護士',read:'べんごし',mean:'Pengacara',level:'N3'},{jp:'経営者',read:'けいえいしゃ',mean:'Pengusaha/Direktur',level:'N2'},{jp:'部長',read:'ぶちょう',mean:'Kepala divisi',level:'N3'},
    {jp:'給料',read:'きゅうりょう',mean:'Gaji',level:'N4'},{jp:'残業',read:'ざんぎょう',mean:'Lembur',level:'N3'},{jp:'転職',read:'てんしょく',mean:'Pindah kerja',level:'N3'},
  ,
    {jp:'就職',read:'しゅうしょく',mean:'Mendapatkan pekerjaan',level:'N3',ex:'就職活動をする'},
    {jp:'退職',read:'たいしょく',mean:'Pensiun/Mengundurkan diri',level:'N3',ex:'来年退職する予定'},
],
  alam:[
    {jp:'山',read:'やま',mean:'Gunung',level:'N5'},{jp:'川',read:'かわ',mean:'Sungai',level:'N5'},{jp:'海',read:'うみ',mean:'Laut',level:'N5'},
    {jp:'空',read:'そら',mean:'Langit',level:'N5'},{jp:'雲',read:'くも',mean:'Awan',level:'N5'},{jp:'雨',read:'あめ',mean:'Hujan',level:'N5'},
    {jp:'雪',read:'ゆき',mean:'Salju',level:'N5'},{jp:'風',read:'かぜ',mean:'Angin',level:'N5'},{jp:'太陽',read:'たいよう',mean:'Matahari',level:'N5'},
    {jp:'月',read:'つき',mean:'Bulan',level:'N5'},{jp:'星',read:'ほし',mean:'Bintang',level:'N5'},{jp:'森',read:'もり',mean:'Hutan',level:'N4'},
    {jp:'花',read:'はな',mean:'Bunga',level:'N5'},{jp:'木',read:'き',mean:'Pohon',level:'N5'},{jp:'草',read:'くさ',mean:'Rumput',level:'N5'},
    {jp:'台風',read:'たいふう',mean:'Topan',level:'N4'},{jp:'地震',read:'じしん',mean:'Gempa bumi',level:'N4'},{jp:'津波',read:'つなみ',mean:'Tsunami',level:'N3'},
  ,
    {jp:'地層',read:'ちそう',mean:'Lapisan tanah/geologi',level:'N2',ex:'地層の調査をする'},
    {jp:'生態系',read:'せいたいけい',mean:'Ekosistem',level:'N2',ex:'生態系を守る'},
    {jp:'二酸化炭素',read:'にさんかたんそ',mean:'Karbon dioksida (CO2)',level:'N2',ex:'二酸化炭素を削減する'},
    {jp:'再生可能',read:'さいせいかのう',mean:'Dapat diperbarui (energi)',level:'N2',ex:'再生可能エネルギー'},
    {jp:'絶滅',read:'ぜつめつ',mean:'Kepunahan',level:'N2',ex:'絶滅危惧種を守る'},
    {jp:'生息',read:'せいそく',mean:'Hidup/Berhabitat',level:'N2',ex:'クマが生息する森'},
    {jp:'汚染',read:'おせん',mean:'Pencemaran',level:'N3',ex:'水質汚染が問題だ'},
    {jp:'保護',read:'ほご',mean:'Perlindungan',level:'N3',ex:'自然環境を保護する'},
],
  emosi:[
      {jp:'嬉しい',read:'うれしい',mean:'senang',level:'N4',ex:'合格して嬉しい'},
      {jp:'悲しい',read:'かなしい',mean:'sedih',level:'N4',ex:'別れが悲しい'},
      {jp:'怒る',read:'おこる',mean:'marah',level:'N4',ex:'遅刻して怒る'},
      {jp:'怖い',read:'こわい',mean:'takut',level:'N4',ex:'暗い道が怖い'},
      {jp:'恥ずかしい',read:'はずかしい',mean:'malu',level:'N4',ex:'間違えて恥ずかしい'},
      {jp:'楽しい',read:'たのしい',mean:'menyenangkan',level:'N4',ex:'旅行が楽しい'},
      {jp:'寂しい',read:'さびしい',mean:'kesepian',level:'N4',ex:'一人で寂しい'},
      {jp:'驚く',read:'おどろく',mean:'terkejut',level:'N4',ex:'突然の知らせに驚く'},
      {jp:'心配する',read:'しんぱいする',mean:'khawatir',level:'N4',ex:'体調が心配'},
      {jp:'安心する',read:'あんしんする',mean:'tenang/lega',level:'N4',ex:'合格して安心した'},
      {jp:'緊張する',read:'きんちょうする',mean:'gugup',level:'N4',ex:'発表前に緊張する'},
      {jp:'感動する',read:'かんどうする',mean:'terharu',level:'N4',ex:'映画に感動した'},
      {jp:'困る',read:'こまる',mean:'kesulitan/bingung',level:'N4',ex:'道に迷って困った'},
      {jp:'飽きる',read:'あきる',mean:'bosan',level:'N4',ex:'同じ仕事に飽きた'},
      {jp:'後悔する',read:'こうかいする',mean:'menyesal',level:'N4',ex:'あの時後悔した'},
      {jp:'満足する',read:'まんぞくする',mean:'puas',level:'N4',ex:'仕事に満足している'},
      {jp:'失望する',read:'しつぼうする',mean:'kecewa',level:'N4',ex:'結果に失望した'},
      {jp:'期待する',read:'きたいする',mean:'mengharapkan',level:'N4',ex:'良い結果を期待する'},
      {jp:'感謝する',read:'かんしゃする',mean:'bersyukur',level:'N4',ex:'助けてくれて感謝する'},
      {jp:'羨む',read:'うらやむ',mean:'iri/dengki',level:'N4',ex:'友達の成功を羨む'},
      {jp:'懐かしい',read:'なつかしい',mean:'nostalgia/rindu',level:'N4',ex:'故郷が懐かしい'},
      {jp:'苦しい',read:'くるしい',mean:'tersiksa/berat',level:'N4',ex:'毎日が苦しい'},
      {jp:'辛い',read:'つらい',mean:'menyakitkan/berat',level:'N4',ex:'別れが辛い'},
      {jp:'ほっとする',read:'ほっとする',mean:'lega',level:'N4',ex:'無事着いてほっとした'},
      {jp:'むかつく',read:'むかつく',mean:'kesal/jengkel',level:'N4',ex:'態度にむかつく'},
      {jp:'うんざりする',read:'うんざりする',mean:'muak/jenuh',level:'N4',ex:'長い会議にうんざり'},
      {jp:'焦る',read:'あせる',mean:'panik/terburu',level:'N4',ex:'締め切りに焦る'},
      {jp:'誇らしい',read:'ほこらしい',mean:'bangga',level:'N4',ex:'子供の成長が誇らしい'},
      {jp:'胸がいっぱい',read:'むねがいっぱい',mean:'hati penuh (haru)',level:'N4',ex:'卒業式で胸がいっぱい'},
      {jp:'うれしい悲鳴',read:'うれしいひめい',mean:'menjerit kegirangan',level:'N4',ex:'プレゼントにうれしい悲鳴'}
    ,
    {jp:'焦り',read:'あせり',mean:'Ketergesa-gesaan/Panik',level:'N3',ex:'焦りを感じる'},
    {jp:'達成感',read:'たっせいかん',mean:'Rasa pencapaian',level:'N3',ex:'達成感を得る'},
],
    tubuh:[
      {jp:'頭',read:'あたま',mean:'Kepala',level:'N5',ex:'頭が痛い'},
      {jp:'目',read:'め',mean:'Mata',level:'N5',ex:'目が悪い'},
      {jp:'耳',read:'みみ',mean:'Telinga',level:'N5',ex:'耳が聞こえない'},
      {jp:'口',read:'くち',mean:'Mulut',level:'N5',ex:'口を開ける'},
      {jp:'鼻',read:'はな',mean:'Hidung',level:'N5',ex:'鼻が詰まる'},
      {jp:'手',read:'て',mean:'Tangan',level:'N5',ex:'手を洗う'},
      {jp:'足',read:'あし',mean:'Kaki',level:'N5',ex:'足が痛い'},
      {jp:'背中',read:'せなか',mean:'Punggung',level:'N4',ex:'背中が凝る'},
      {jp:'お腹',read:'おなか',mean:'Perut',level:'N4',ex:'お腹が空いた'},
      {jp:'肩',read:'かた',mean:'Bahu',level:'N4',ex:'肩が凝る'},
      {jp:'指',read:'ゆび',mean:'Jari',level:'N4',ex:'指を切った'},
      {jp:'髪',read:'かみ',mean:'Rambut',level:'N4',ex:'髪を切る'},
      {jp:'顔',read:'かお',mean:'Wajah',level:'N4',ex:'顔を洗う'},
      {jp:'歯',read:'は',mean:'Gigi',level:'N4',ex:'歯を磨く'},
      {jp:'体',read:'からだ',mean:'Tubuh',level:'N5',ex:'体に気をつける'},
      {jp:'皮膚',read:'ひふ',mean:'Kulit',level:'N3',ex:'皮膚が乾燥する'},
      {jp:'心臓',read:'しんぞう',mean:'Jantung',level:'N3',ex:'心臓が弱い'},
      {jp:'肺',read:'はい',mean:'Paru-paru',level:'N3',ex:'肺の病気'},
    ,
    {jp:'眉毛',read:'まゆげ',mean:'Alis',level:'N3',ex:'眉毛を整える'},
    {jp:'まつげ',read:'まつげ',mean:'Bulu mata',level:'N3',ex:'まつげが長い'},
],
    waktu:[
      {jp:'朝',read:'あさ',mean:'Pagi',level:'N5',ex:'毎朝起きる'},
      {jp:'昼',read:'ひる',mean:'Siang',level:'N5',ex:'昼ご飯を食べる'},
      {jp:'夜',read:'よる',mean:'Malam',level:'N5',ex:'夜遅くなった'},
      {jp:'今日',read:'きょう',mean:'Hari ini',level:'N5',ex:'今日は暑い'},
      {jp:'明日',read:'あした',mean:'Besok',level:'N5',ex:'明日会いましょう'},
      {jp:'昨日',read:'きのう',mean:'Kemarin',level:'N5',ex:'昨日食べた'},
      {jp:'今週',read:'こんしゅう',mean:'Minggu ini',level:'N5',ex:'今週忙しい'},
      {jp:'先週',read:'せんしゅう',mean:'Minggu lalu',level:'N5',ex:'先週旅行した'},
      {jp:'来週',read:'らいしゅう',mean:'Minggu depan',level:'N5',ex:'来週会議がある'},
      {jp:'今月',read:'こんげつ',mean:'Bulan ini',level:'N4',ex:'今月末に締め切り'},
      {jp:'去年',read:'きょねん',mean:'Tahun lalu',level:'N4',ex:'去年日本へ行った'},
      {jp:'来年',read:'らいねん',mean:'Tahun depan',level:'N4',ex:'来年卒業する'},
      {jp:'最近',read:'さいきん',mean:'Belakangan ini',level:'N4',ex:'最近忙しい'},
      {jp:'もうすぐ',read:'もうすぐ',mean:'Sebentar lagi',level:'N5',ex:'もうすぐ春'},
      {jp:'いつでも',read:'いつでも',mean:'Kapan saja',level:'N4',ex:'いつでも来てください'},
      {jp:'たまに',read:'たまに',mean:'Kadang-kadang',level:'N4',ex:'たまに外食する'},
      {jp:'ついに',read:'ついに',mean:'Akhirnya',level:'N3',ex:'ついに合格した'},
      {jp:'まもなく',read:'まもなく',mean:'Tidak lama lagi',level:'N3',ex:'まもなく出発'},
    ,
    {jp:'一瞬',read:'いっしゅん',mean:'Sejenak/Sekejap mata',level:'N3',ex:'一瞬で消えた'},
    {jp:'期間',read:'きかん',mean:'Jangka waktu/Periode',level:'N3',ex:'3ヶ月の期間'},
],
  pendidikan:[
    {jp:'学校',read:'がっこう',mean:'Sekolah',level:'N5',ex:'学校に行く'},
    {jp:'大学',read:'だいがく',mean:'Universitas',level:'N5',ex:'大学を卒業した'},
    {jp:'授業',read:'じゅぎょう',mean:'Pelajaran/Kelas',level:'N4',ex:'授業に出る'},
    {jp:'宿題',read:'しゅくだい',mean:'PR/Pekerjaan Rumah',level:'N5',ex:'宿題をする'},
    {jp:'試験',read:'しけん',mean:'Ujian/Tes',level:'N4',ex:'試験を受ける'},
    {jp:'成績',read:'せいせき',mean:'Nilai/Rapor',level:'N3',ex:'成績が上がった'},
    {jp:'奨学金',read:'しょうがくきん',mean:'Beasiswa',level:'N3',ex:'奨学金をもらう'},
    {jp:'卒業',read:'そつぎょう',mean:'Lulus/Wisuda',level:'N3',ex:'大学を卒業する'},
    {jp:'入学',read:'にゅうがく',mean:'Masuk sekolah/universitas',level:'N3',ex:'大学に入学する'},
    {jp:'研究',read:'けんきゅう',mean:'Penelitian',level:'N3',ex:'研究を続ける'},
  ,
    {jp:'教科書',read:'きょうかしょ',mean:'Buku teks',level:'N3',ex:'教科書を開く'},
    {jp:'試験',read:'しけん',mean:'Ujian/Test',level:'N4',ex:'試験に合格する'},
    {jp:'成績',read:'せいせき',mean:'Nilai/Prestasi',level:'N3',ex:'成績が上がった'},
    {jp:'入学',read:'にゅうがく',mean:'Masuk sekolah',level:'N3',ex:'大学に入学する'},
    {jp:'卒業',read:'そつぎょう',mean:'Lulus/Wisuda',level:'N3',ex:'大学を卒業した'},
    {jp:'奨学金',read:'しょうがくきん',mean:'Beasiswa',level:'N2',ex:'奨学金をもらう'},
    {jp:'研究',read:'けんきゅう',mean:'Penelitian',level:'N3',ex:'研究を続ける'},
    {jp:'論文',read:'ろんぶん',mean:'Skripsi/Esai akademik',level:'N2',ex:'論文を書く'},
    {jp:'留学',read:'りゅうがく',mean:'Belajar di luar negeri',level:'N3',ex:'日本に留学する'},
    {jp:'復習',read:'ふくしゅう',mean:'Mengulang pelajaran',level:'N4',ex:'毎日復習する'}],
  
  teknologi:[
    {jp:'パソコン',read:'ぱそこん',mean:'Komputer PC',level:'N4',ex:'パソコンで作業する'},
    {jp:'スマートフォン',read:'すまーとふぉん',mean:'Smartphone',level:'N4',ex:'スマートフォンを使う'},
    {jp:'インターネット',read:'いんたーねっと',mean:'Internet',level:'N4',ex:'インターネットで調べる'},
    {jp:'アプリ',read:'あぷり',mean:'Aplikasi (app)',level:'N4',ex:'アプリをダウンロードする'},
    {jp:'データ',read:'でーた',mean:'Data',level:'N3',ex:'データを保存する'},
    {jp:'ソフトウェア',read:'そふとうぇあ',mean:'Perangkat lunak',level:'N3',ex:'ソフトウェアを更新する'},
    {jp:'プログラム',read:'ぷろぐらむ',mean:'Program (komputer)',level:'N3',ex:'プログラムを実行する'},
    {jp:'人工知能',read:'じんこうちのう',mean:'Kecerdasan buatan / AI',level:'N2',ex:'人工知能の発展が著しい'},
    {jp:'クラウド',read:'くらうど',mean:'Cloud (komputasi awan)',level:'N3',ex:'クラウドにデータを保存する'},
    {jp:'セキュリティ',read:'せきゅりてぃ',mean:'Keamanan siber',level:'N3',ex:'セキュリティを強化する'},
    {jp:'通信',read:'つうしん',mean:'Telekomunikasi',level:'N3',ex:'通信技術が発展する'},
    {jp:'自動化',read:'じどうか',mean:'Otomatisasi',level:'N2',ex:'工場の自動化が進む'},
    {jp:'開発',read:'かいはつ',mean:'Pengembangan (software)',level:'N3',ex:'アプリを開発する'},
    {jp:'更新',read:'こうしん',mean:'Pembaruan / Update',level:'N3',ex:'システムを更新する'},
    {jp:'互換性',read:'ごかんせい',mean:'Kompatibilitas',level:'N2',ex:'互換性の問題が発生した'},
    {jp:'暗号化',read:'あんごうか',mean:'Enkripsi',level:'N2',ex:'データを暗号化する'},
    {jp:'バックアップ',read:'ばっくあっぷ',mean:'Cadangan data',level:'N3',ex:'データをバックアップする'},
    {jp:'起動',read:'きどう',mean:'Menjalankan / Boot',level:'N3',ex:'システムを起動する'},
    {jp:'障害',read:'しょうがい',mean:'Gangguan sistem',level:'N2',ex:'システム障害が発生した'},
    {jp:'仮想',read:'かそう',mean:'Virtual',level:'N2',ex:'仮想現実(VR)を体験する'}
  ],
  kesehatan:[
    {jp:'病気',read:'びょうき',mean:'Sakit/Penyakit',level:'N5',ex:'病気になった'},
    {jp:'薬',read:'くすり',mean:'Obat',level:'N5',ex:'薬を飲む'},
    {jp:'医者',read:'いしゃ',mean:'Dokter',level:'N5',ex:'医者に行く'},
    {jp:'病院',read:'びょういん',mean:'Rumah sakit',level:'N5',ex:'病院に入院する'},
    {jp:'熱',read:'ねつ',mean:'Demam/Panas',level:'N5',ex:'熱がある'},
    {jp:'痛い',read:'いたい',mean:'Sakit/Nyeri',level:'N5',ex:'頭が痛い'},
    {jp:'治療',read:'ちりょう',mean:'Pengobatan',level:'N3',ex:'治療を受ける'},
    {jp:'健康',read:'けんこう',mean:'Kesehatan',level:'N4',ex:'健康が大切だ'},
    {jp:'手術',read:'しゅじゅつ',mean:'Operasi',level:'N2',ex:'手術を受ける'},
    {jp:'入院',read:'にゅういん',mean:'Rawat inap RS',level:'N3',ex:'病院に入院する'},
    {jp:'退院',read:'たいいん',mean:'Keluar dari RS',level:'N3',ex:'来週退院する'},
    {jp:'アレルギー',read:'あれるぎー',mean:'Alergi',level:'N3',ex:'花粉アレルギーがある'},
    {jp:'予防',read:'よぼう',mean:'Pencegahan',level:'N3',ex:'病気の予防をする'},
    {jp:'血圧',read:'けつあつ',mean:'Tekanan darah',level:'N2',ex:'血圧を測る'},
    {jp:'体温',read:'たいおん',mean:'Suhu tubuh',level:'N4',ex:'体温を計る'},
    {jp:'診察',read:'しんさつ',mean:'Pemeriksaan dokter',level:'N2',ex:'診察を受ける'},
    {jp:'処方',read:'しょほう',mean:'Resep dokter',level:'N2',ex:'薬を処方する'},
    {jp:'症状',read:'しょうじょう',mean:'Gejala (penyakit)',level:'N3',ex:'症状を説明する'},
    {jp:'回復',read:'かいふく',mean:'Pemulihan',level:'N3',ex:'早く回復してください'},
    {jp:'注射',read:'ちゅうしゃ',mean:'Suntikan/Injeksi',level:'N3',ex:'注射を打つ'}],
  hobi:[
    {jp:'趣味',read:'しゅみ',mean:'Hobi',level:'N4',ex:'趣味は何ですか'},
    {jp:'旅行',read:'りょこう',mean:'Perjalanan/Wisata',level:'N4',ex:'旅行が好きだ'},
    {jp:'料理',read:'りょうり',mean:'Memasak/Masakan',level:'N4',ex:'料理を作る'},
    {jp:'読書',read:'どくしょ',mean:'Membaca buku',level:'N4',ex:'読書が趣味だ'},
    {jp:'映画',read:'えいが',mean:'Film',level:'N4',ex:'映画を見る'},
    {jp:'音楽',read:'おんがく',mean:'Musik',level:'N4',ex:'音楽を聴く'},
    {jp:'スポーツ',read:'すぽーつ',mean:'Olahraga',level:'N4',ex:'スポーツをする'},
    {jp:'写真',read:'しゃしん',mean:'Foto/Fotografi',level:'N4',ex:'写真を撮る'},
    {jp:'絵を描く',read:'えをかく',mean:'Menggambar/Melukis',level:'N3',ex:'絵を描くのが好きだ'},
    {jp:'ゲーム',read:'げーむ',mean:'Game',level:'N4',ex:'ゲームをする'},
  ,
    {jp:'釣り',read:'つり',mean:'Memancing',level:'N4',ex:'川で釣りをする'},
    {jp:'登山',read:'とざん',mean:'Mendaki gunung',level:'N3',ex:'登山が趣味だ'},
    {jp:'書道',read:'しょどう',mean:'Kaligrafi Jepang',level:'N3',ex:'書道を習う'},
    {jp:'散歩',read:'さんぽ',mean:'Jalan-jalan santai',level:'N5',ex:'公園を散歩する'},
    {jp:'将棋',read:'しょうぎ',mean:'Catur Jepang',level:'N2',ex:'将棋を指す'},
    {jp:'俳句',read:'はいく',mean:'Puisi haiku',level:'N2',ex:'俳句を詠む'},
    {jp:'陶芸',read:'とうげい',mean:'Keramik/Gerabah',level:'N2',ex:'陶芸教室に通う'},
    {jp:'コレクション',read:'これくしょん',mean:'Koleksi/Mengoleksi',level:'N3',ex:'切手コレクション'},
    {jp:'ジョギング',read:'じょぎんぐ',mean:'Jogging/Lari santai',level:'N4',ex:'毎朝ジョギングする'},
    {jp:'茶道',read:'さどう',mean:'Upacara minum teh',level:'N2',ex:'茶道を習っている'}],
  bisnis:[
    {jp:'会議',read:'かいぎ',mean:'Rapat',level:'N4',ex:'会議に出席する'},
    {jp:'取引',read:'とりひき',mean:'Transaksi/Bisnis',level:'N3',ex:'取引先と会う'},
    {jp:'契約',read:'けいやく',mean:'Kontrak',level:'N3',ex:'契約を結ぶ'},
    {jp:'交渉',read:'こうしょう',mean:'Negosiasi',level:'N3',ex:'交渉がまとまった'},
    {jp:'予算',read:'よさん',mean:'Anggaran',level:'N3',ex:'予算を組む'},
    {jp:'利益',read:'りえき',mean:'Keuntungan/Laba',level:'N2',ex:'利益を上げる'},
    {jp:'損失',read:'そんしつ',mean:'Kerugian',level:'N2',ex:'損失を出す'},
    {jp:'需要',read:'じゅよう',mean:'Permintaan',level:'N2',ex:'需要が増える'},
    {jp:'供給',read:'きょうきゅう',mean:'Pasokan',level:'N2',ex:'供給が不足する'},
    {jp:'競争',read:'きょうそう',mean:'Persaingan',level:'N3',ex:'競争が激しい'},
    {jp:'戦略',read:'せんりゃく',mean:'Strategi',level:'N2',ex:'新しい戦略を立てる'},
    {jp:'効率',read:'こうりつ',mean:'Efisiensi',level:'N2',ex:'効率を上げる'},
    {jp:'品質',read:'ひんしつ',mean:'Kualitas',level:'N3',ex:'品質を管理する'},
    {jp:'顧客',read:'こきゃく',mean:'Pelanggan',level:'N2',ex:'顧客満足度を高める'},
    {jp:'報告',read:'ほうこく',mean:'Laporan',level:'N3',ex:'上司に報告する'},
    {jp:'提案',read:'ていあん',mean:'Usulan/Proposal',level:'N3',ex:'提案を出す'},
    {jp:'承認',read:'しょうにん',mean:'Persetujuan',level:'N2',ex:'上司の承認を得る'},
    {jp:'締め切り',read:'しめきり',mean:'Tenggat waktu',level:'N3',ex:'締め切りを守る'},
    {jp:'残業',read:'ざんぎょう',mean:'Lembur',level:'N3',ex:'残業が続く'},
    {jp:'出張',read:'しゅっちょう',mean:'Perjalanan dinas',level:'N3',ex:'出張に行く'},
  ],
  perjalanan:[
    {jp:'旅行',read:'りょこう',mean:'Perjalanan/Wisata',level:'N4',ex:'旅行に行く'},
    {jp:'観光',read:'かんこう',mean:'Pariwisata',level:'N4',ex:'観光スポットを巡る'},
    {jp:'宿泊',read:'しゅくはく',mean:'Menginap',level:'N3',ex:'ホテルに宿泊する'},
    {jp:'航空券',read:'こうくうけん',mean:'Tiket pesawat',level:'N3',ex:'航空券を予約する'},
    {jp:'パスポート',read:'ぱすぽーと',mean:'Paspor',level:'N4',ex:'パスポートを持参する'},
    {jp:'荷物',read:'にもつ',mean:'Barang bawaan/Koper',level:'N4',ex:'荷物を預ける'},
    {jp:'乗り換え',read:'のりかえ',mean:'Transfer/Pindah kendaraan',level:'N3',ex:'東京で乗り換える'},
    {jp:'観光地',read:'かんこうち',mean:'Tempat wisata',level:'N3',ex:'有名な観光地を訪れる'},
    {jp:'土産',read:'みやげ',mean:'Oleh-oleh',level:'N4',ex:'土産を買う'},
    {jp:'滞在',read:'たいざい',mean:'Tinggal sementara',level:'N3',ex:'日本に2週間滞在する'},
    {jp:'案内',read:'あんない',mean:'Panduan/Petunjuk',level:'N3',ex:'観光案内所で地図をもらう'},
    {jp:'迷子',read:'まいご',mean:'Tersesat/Anak hilang',level:'N3',ex:'迷子になってしまった'},
    {jp:'集合',read:'しゅうごう',mean:'Berkumpul/Titik kumpul',level:'N3',ex:'午前9時に集合する'},
    {jp:'出発',read:'しゅっぱつ',mean:'Keberangkatan',level:'N4',ex:'明日出発する'},
    {jp:'帰国',read:'きこく',mean:'Pulang ke negara asal',level:'N3',ex:'来週帰国する予定'},
    {jp:'温泉',read:'おんせん',mean:'Pemandian air panas',level:'N4',ex:'温泉に入る'},
    {jp:'旅館',read:'りょかん',mean:'Penginapan Jepang tradisional',level:'N3',ex:'旅館に泊まる'},
    {jp:'免税',read:'めんぜい',mean:'Bebas pajak/Duty-free',level:'N3',ex:'免税品を購入する'},
    {jp:'両替',read:'りょうがえ',mean:'Penukaran mata uang',level:'N3',ex:'空港で両替する'},
    {jp:'目的地',read:'もくてきち',mean:'Tujuan/Destinasi',level:'N3',ex:'目的地に到着した'},
  ],
  makanan_jp:[
    {jp:'寿司',read:'すし',mean:'Sushi',level:'N5',ex:'寿司を食べる'},
    {jp:'刺身',read:'さしみ',mean:'Sashimi (ikan mentah)',level:'N4',ex:'刺身の盛り合わせ'},
    {jp:'天ぷら',read:'てんぷら',mean:'Tempura',level:'N4',ex:'海老の天ぷら'},
    {jp:'味噌汁',read:'みそしる',mean:'Sup miso',level:'N4',ex:'朝ごはんに味噌汁を飲む'},
    {jp:'焼き鳥',read:'やきとり',mean:'Sate ayam Jepang',level:'N4',ex:'居酒屋で焼き鳥を食べる'},
    {jp:'鍋料理',read:'なべりょうり',mean:'Masakan hotpot',level:'N3',ex:'冬は鍋料理が美味しい'},
    {jp:'そば',read:'そば',mean:'Mie soba',level:'N4',ex:'ざるそばを食べる'},
    {jp:'うどん',read:'うどん',mean:'Mie udon',level:'N4',ex:'うどんのつゆが美味しい'},
    {jp:'ラーメン',read:'らーめん',mean:'Ramen',level:'N4',ex:'豚骨ラーメンが好き'},
    {jp:'おにぎり',read:'おにぎり',mean:'Nasi kepal',level:'N4',ex:'コンビニでおにぎりを買う'},
    {jp:'弁当',read:'べんとう',mean:'Bento/Bekal',level:'N4',ex:'お弁当を作る'},
    {jp:'丼',read:'どんぶり',mean:'Nasi dalam mangkok besar',level:'N3',ex:'牛丼を注文する'},
    {jp:'煮物',read:'にもの',mean:'Makanan rebus (sayuran)',level:'N3',ex:'煮物を作る'},
    {jp:'漬物',read:'つけもの',mean:'Acar Jepang',level:'N3',ex:'漬物を食べる'},
    {jp:'お好み焼き',read:'おこのみやき',mean:'Pancake Jepang',level:'N3',ex:'大阪でお好み焼きを食べた'},
    {jp:'たこ焼き',read:'たこやき',mean:'Takoyaki',level:'N3',ex:'屋台でたこ焼きを食べる'},
    {jp:'抹茶',read:'まっちゃ',mean:'Teh matcha',level:'N3',ex:'抹茶アイスが好き'},
    {jp:'餅',read:'もち',mean:'Kue mochi/beras ketan',level:'N3',ex:'正月に餅を食べる'},
    {jp:'旬',read:'しゅん',mean:'Musim/Puncak kesegaran bahan makanan',level:'N3',ex:'旬の野菜を使う'},
    {jp:'出汁',read:'だし',mean:'Kaldu dasar masakan Jepang',level:'N3',ex:'昆布で出汁を取る'},
  ]};

let activeTheme='keluarga';
const vocabItems=vocabThemes.keluarga; // default

function showVocabTheme(t){
  activeTheme=t;
  const vl=document.getElementById('vocabList');
  vl.innerHTML='';
  (vocabThemes[t]||[]).forEach(v=>{
    const d=document.createElement('div');d.className='vocab-item';
    d.innerHTML=`<div class="vi-jp">${v.jp}</div><div class="vi-right"><div class="vi-read">${v.read}</div><div class="vi-mean">${v.mean}</div></div><div class="vi-badge">${v.level}</div>`;
    vl.appendChild(d);
  });
  document.querySelectorAll('.vt-card').forEach(c=>c.style.borderColor='');
  event.currentTarget.style.borderColor='var(--red)';
}

const vl=document.getElementById('vocabList');
vocabItems.forEach(v=>{
  const d=document.createElement('div');d.className='vocab-item';
  d.innerHTML=`<div class="vi-jp">${v.jp}</div><div class="vi-right"><div class="vi-read">${v.read}</div><div class="vi-mean">${v.mean}</div></div><div class="vi-badge">${v.level}</div>`;
  vl.appendChild(d);
});

// Percakapan — dialog lengkap
const percakapanData=[
  {
    title:'Di Restoran',icon:'🍜',desc:'Cara memesan makanan, memanggil pelayan, meminta tagihan',level:'N4',
    dialog:[
      {speaker:'店員',text:'いらっしゃいませ！何名様ですか？',romaji:'Irasshaimase! Nan-mei-sama desu ka?',tl:'Selamat datang! Berapa orang?'},
      {speaker:'客',text:'二人です。',romaji:'Futari desu.',tl:'Dua orang.'},
      {speaker:'店員',text:'こちらへどうぞ。ご注文はお決まりですか？',romaji:'Kochira e dōzo. Gochūmon wa okimari desu ka?',tl:'Silakan ke sini. Sudah siap memesan?'},
      {speaker:'客',text:'ラーメンをひとつと、餃子をふたつください。',romaji:'Rāmen o hitotsu to, gyōza o futatsu kudasai.',tl:'Satu ramen dan dua gyoza, tolong.'},
      {speaker:'店員',text:'かしこまりました。少々お待ちください。',romaji:'Kashikomarimashita. Shōshō omachi kudasai.',tl:'Baik. Mohon tunggu sebentar.'},
      {speaker:'客',text:'すみません、お勘定をおねがいします。',romaji:'Sumimasen, okanjō o onegaishimasu.',tl:'Permisi, tagihan/bill-nya tolong.'},
      {speaker:'店員',text:'合計で1,500円になります。',romaji:'Gōkei de sen-gohyaku-en ni narimasu.',tl:'Totalnya 1.500 yen.'},
    
    ],
    tips:['いらっしゃいませ = selamat datang (toko/restoran)',
      '〜名様 = berapa orang (sopan)',
      'ご注文はお決まりですか = sudah siap pesan?',
      'お会計 / おかんじょう = minta bill']
  },
  {
    title:'Di Stasiun',icon:'🚃',desc:'Membeli tiket, bertanya arah kereta, naik kereta',level:'N5',
    dialog:[
      {speaker:'A',text:'すみません、東京駅はどこですか？',romaji:'Sumimasen, Tōkyō-eki wa doko desu ka?',tl:'Permisi, Stasiun Tokyo di mana?'},
      {speaker:'B',text:'この道をまっすぐ行って、右に曲がってください。',romaji:'Kono michi o massugu itte, migi ni magatte kudasai.',tl:'Jalan lurus di jalan ini, lalu belok kanan.'},
      {speaker:'A',text:'どのくらいかかりますか？',romaji:'Dono kurai kakarimasu ka?',tl:'Butuh berapa lama?'},
      {speaker:'B',text:'歩いて10分くらいです。',romaji:'Aruite juppun kurai desu.',tl:'Sekitar 10 menit berjalan kaki.'},
      {speaker:'A',text:'大阪まで一枚ください。',romaji:'Ōsaka made ichimai kudasai.',tl:'(Di loket) Satu tiket ke Osaka, tolong.'},
      {speaker:'係員',text:'片道ですか、往復ですか？',romaji:'Katamichi desu ka, ōfuku desu ka?',tl:'Satu arah atau pulang-pergi?'},
      {speaker:'A',text:'片道でお願いします。',romaji:'Katamichi de onegaishimasu.',tl:'Satu arah saja.'},
    
    ],
    tips:['〜まで いくら = berapa ke ~',
      '〜番線 = peron nomor ~',
      'つぎの でんしゃ = kereta berikutnya',
      'いってらっしゃい = hati-hati di jalan']
  },
  {
    title:'Di Kantor (Keigo)',icon:'💼',desc:'Keigo (bahasa sopan), laporan kepada atasan, rapat',level:'N3',
    dialog:[
      {speaker:'部下',text:'部長、少しよろしいでしょうか？',romaji:'Buchō, sukoshi yoroshii deshō ka?',tl:'Pak Manajer, boleh saya bicara sebentar?'},
      {speaker:'部長',text:'ああ、どうぞ。',romaji:'Ā, dōzo.',tl:'Oh, silakan.'},
      {speaker:'部下',text:'先日のプロジェクトの件でご報告があります。',romaji:'Senjitsu no purojekuto no ken de go-hōkoku ga arimasu.',tl:'Ada laporan mengenai proyek kemarin.'},
      {speaker:'部長',text:'わかった。で、進捗はどうだ？',romaji:'Wakatta. De, shinchoku wa dō da?',tl:'Mengerti. Jadi, bagaimana progresnya?'},
      {speaker:'部下',text:'おかげさまで、予定通り進んでおります。',romaji:'Okagesama de, yotei dōri susunde orimasu.',tl:'Alhamdulillah, berjalan sesuai jadwal.'},
      {speaker:'部長',text:'そうか。引き続きよろしく頼む。',romaji:'Sō ka. Hikitsuzuki yoroshiku tanomu.',tl:'Begitu ya. Teruskan kerja baiknya.'},
    
    ],
    tips:['お疲れ様です = terima kasih sudah bekerja keras',
      'ただいま確認中 = sedang dikonfirmasi sekarang',
      'ご報告いたします = saya akan melaporkan (keigo)',
      '〜ございます = versi sangat sopan dari あります']
  },
  {
    title:'Perkenalan Diri',icon:'👋',desc:'Salam pertama, memperkenalkan diri, basa-basi',level:'N5',
    dialog:[
      {speaker:'A',text:'はじめまして。アンディと申します。',romaji:'Hajimemashite. Andi to mōshimasu.',tl:'Salam kenal. Nama saya Andi.'},
      {speaker:'B',text:'はじめまして。山田ゆきです。どうぞよろしく。',romaji:'Hajimemashite. Yamada Yuki desu. Dōzo yoroshiku.',tl:'Salam kenal. Saya Yamada Yuki. Senang berkenalan.'},
      {speaker:'A',text:'出身はどちらですか？',romaji:'Shusshin wa dochira desu ka?',tl:'Anda berasal dari mana?'},
      {speaker:'B',text:'東京です。アンディさんは？',romaji:'Tōkyō desu. Andi-san wa?',tl:'Dari Tokyo. Kalau Andi?'},
      {speaker:'A',text:'インドネシアのジャカルタです。',romaji:'Indoneshia no Jakarta desu.',tl:'Dari Jakarta, Indonesia.'},
      {speaker:'B',text:'そうですか！日本語がお上手ですね。',romaji:'Sō desu ka! Nihongo ga ojōzu desu ne.',tl:'Oh begitu! Bahasa Jepangnya bagus ya.'},
      {speaker:'A',text:'いいえ、まだまだです。これからもよろしくお願いします。',romaji:'Iie, madamada desu. Korekara mo yoroshiku onegaishimasu.',tl:'Tidak-tidak, masih jauh. Mohon bimbingannya ke depan.'},
    
    ],
    tips:['はじめまして = salam kenal (pertama bertemu)',
      '〜と申します = nama saya ~ (sopan)',
      'どうぞよろしく = mohon bantuannya',
      'おくには = berasal dari mana (sopan)']
  },
  {
    title:'Belanja',icon:'🛍️',desc:'Menanyakan harga, meminta ukuran, transaksi',level:'N5',
    dialog:[
      {speaker:'客',text:'すみません、これはいくらですか？',romaji:'Sumimasen, kore wa ikura desu ka?',tl:'Permisi, ini berapa harganya?'},
      {speaker:'店員',text:'2,800円でございます。',romaji:'Nisen-happyaku-en de gozaimasu.',tl:'2.800 yen.'},
      {speaker:'客',text:'少し高いですね。もう少し安いのはありますか？',romaji:'Sukoshi takai desu ne. Mō sukoshi yasui no wa arimasu ka?',tl:'Agak mahal ya. Ada yang sedikit lebih murah?'},
      {speaker:'店員',text:'こちらはいかがですか？1,500円です。',romaji:'Kochira wa ikaga desu ka? Sengohyaku-en desu.',tl:'Bagaimana yang ini? 1.500 yen.'},
      {speaker:'客',text:'これにします。袋はいりません。',romaji:'Kore ni shimasu. Fukuro wa irimasen.',tl:'Ambil yang ini. Kantong plastik tidak perlu.'},
      {speaker:'店員',text:'カードはお使いになりますか？',romaji:'Kādo wa o-tsukai ni narimasu ka?',tl:'Apakah ingin menggunakan kartu?'},
      {speaker:'客',text:'現金で払います。',romaji:'Genkin de haraimasu.',tl:'Bayar tunai.'},
    
    ],
    tips:['いらっしゃいませ = selamat datang di toko',
      '〜はありますか = apakah ada ~?',
      'カードで払えますか = bisa bayar kartu?',
      'Mサイズ / Lサイズ = ukuran M/L']
  },
  {
    title:'Di Rumah Sakit',icon:'🏥',desc:'Menjelaskan gejala, membuat janji dokter',level:'N3',
    dialog:[
      {speaker:'受付',text:'どうされましたか？',romaji:'Dō saremashita ka?',tl:'Ada apa? (Apa keluhannya?)'},
      {speaker:'患者',text:'昨日から熱があって、のどが痛いんです。',romaji:'Kinō kara netsu ga atte, nodo ga itain desu.',tl:'Sejak kemarin demam dan tenggorokan sakit.'},
      {speaker:'受付',text:'熱は何度ありますか？',romaji:'Netsu wa nando arimasu ka?',tl:'Suhunya berapa?'},
      {speaker:'患者',text:'38.5度です。咳も少しあります。',romaji:'Sanjūhachi-do go-bu desu. Seki mo sukoshi arimasu.',tl:'38,5 derajat. Batuk juga sedikit.'},
      {speaker:'医者',text:'口を開けてください。はい、扁桃腺が少し腫れていますね。',romaji:'Kuchi o akete kudasai. Hai, hentōsen ga sukoshi harete imasu ne.',tl:'Buka mulutnya. Ya, amandel sedikit bengkak ya.'},
      {speaker:'患者',text:'薬を出してもらえますか？',romaji:'Kusuri o dashite moraemasu ka?',tl:'Bisa diresepkan obat?'},
      {speaker:'医者',text:'はい。抗生物質と解熱剤を出しますね。3日分です。',romaji:'Hai. Kōsei busshitsu to kainetsu-zai o dashimasu ne. Mikkabun desu.',tl:'Ya. Saya resepkan antibiotik dan obat penurun demam. Untuk 3 hari.'},
    
    ],
    tips:['どうなさいましたか = ada keluhan apa? (sopan)',
      '〜が痛い = ~ sakit',
      '〜度の熱 = demam ~ derajat',
      '〜日分 = untuk ~ hari (resep)']
  },
  {
    title:'Minta Arah',icon:'🗺️',desc:'Bertanya arah di kota, memberi petunjuk, landmark',level:'N5',
    tips:['まっすぐ = lurus','まがる = belok','〜のとなり = di sebelah ~','〜のまえ = di depan ~'],
    dialog:[
      {speaker:'A',text:'すみません、コンビニはどこにありますか？',romaji:'Sumimasen, konbini wa doko ni arimasu ka?',tl:'Permisi, minimarket ada di mana?'},
      {speaker:'B',text:'この道をまっすぐ行くと、右側にありますよ。',romaji:'Kono michi wo massugu iku to, migi-gawa ni arimasu yo.',tl:'Kalau jalan lurus di jalan ini, ada di sisi kanan lho.'},
      {speaker:'A',text:'どのくらいかかりますか？',romaji:'Dono kurai kakarimasu ka?',tl:'Kira-kira berapa lama?'},
      {speaker:'B',text:'歩いて3分ぐらいです。角に赤い看板があります。',romaji:'Aruite san-pun gurai desu. Kado ni akai kanban ga arimasu.',tl:'Sekitar 3 menit jalan kaki. Ada papan merah di sudut jalan.'},
      {speaker:'A',text:'ありがとうございます。助かりました！',romaji:'Arigatou gozaimasu. Tasukarimashita!',tl:'Terima kasih. Sangat membantu!'},
      {speaker:'B',text:'いいえ、どうぞ気をつけて。',romaji:'Iie, douzo ki wo tsukete.',tl:'Sama-sama. Hati-hati ya.'},
    ]
  },
  {
    title:'Telepon Bisnis',icon:'📞',desc:'Menelepon kantor, keigo telepon, meninggalkan pesan',level:'N2',
    tips:['もしもし = halo (telepon)','ただいま席を外しております = sedang tidak ada di tempat','折り返しご連絡いたします = akan menghubungi kembali'],
    dialog:[
      {speaker:'B',text:'はい、山田商事でございます。',romaji:'Hai, Yamada Shōji de gozaimasu.',tl:'Ya, ini Yamada Shoji.'},
      {speaker:'A',text:'突然のお電話失礼いたします。田中物産の鈴木と申します。',romaji:'Totsuzen no o-denwa shitsurei itashimasu. Tanaka Bussan no Suzuki to mōshimasu.',tl:'Maaf mengganggu dengan telepon mendadak. Saya Suzuki dari Tanaka Bussan.'},
      {speaker:'B',text:'いつもお世話になっております。',romaji:'Itsumo osewa ni natte orimasu.',tl:'Terima kasih selalu atas dukungannya.'},
      {speaker:'A',text:'営業部の佐藤様はいらっしゃいますでしょうか。',romaji:'Eigyōbu no Satō-sama wa irasshaimasu deshō ka.',tl:'Apakah Satō-san dari divisi penjualan ada?'},
      {speaker:'B',text:'佐藤はただいま外出しております。よろしければ、ご伝言を承りますが。',romaji:'Satō wa tadaima gaishutsu shite orimasu. Yoroshikereba, go-dengon wo uketamawarimasu ga.',tl:'Satō sedang keluar sekarang. Kalau berkenan, boleh saya terima pesannya.'},
      {speaker:'A',text:'では、折り返しお電話いただけますようお伝えいただけますでしょうか。',romaji:'Dewa, orikaeshi o-denwa itadakemasu yō o-tsutae itadakemasu deshō ka.',tl:'Kalau begitu, boleh disampaikan agar beliau menghubungi saya kembali?'},
    ]
  },
  {
    title:'Izin & Negosiasi',icon:'🤝',desc:'Meminta izin, menolak dengan sopan, negosiasi ringan',level:'N3',
    tips:['差し支えなければ = kalau tidak keberatan','〜ていただけますか？ = bisakah saya minta agar ~?','あいにく = sayangnya','検討します = akan kami pertimbangkan'],
    dialog:[
      {speaker:'A',text:'差し支えなければ、来週の納期を少し延ばしていただけますでしょうか。',romaji:'Sashitsukae nakereba, raishū no nōki wo sukoshi nobashite itadakemasu deshō ka.',tl:'Kalau tidak keberatan, bisakah tenggat minggu depan diperpanjang sedikit?'},
      {speaker:'B',text:'どのくらいの延長をお考えですか？',romaji:'Dono kurai no enchō wo o-kangae desu ka?',tl:'Berapa lama perpanjangan yang Anda pikirkan?'},
      {speaker:'A',text:'3日ほどいただければ幸いです。品質確認のための時間です。',romaji:'Mikkka hodo itadakereba saiwai desu. Hinshitsu kakunin no tame no jikan desu.',tl:'Kalau bisa diberi sekitar 3 hari, saya akan berterima kasih. Ini untuk waktu pengecekan kualitas.'},
      {speaker:'B',text:'少々お時間をいただいて確認します。折り返しご連絡してもよいですか。',romaji:'Shōshō o-jikan wo itadaite kakunin shimasu. Orikaeshi go-renraku shite mo yoi desu ka.',tl:'Mohon beri saya waktu sebentar untuk mengkonfirmasi. Bolehkah saya menghubungi kembali?'},
      {speaker:'A',text:'もちろんです。よろしくお願いいたします。',romaji:'Mochiron desu. Yoroshiku onegai itashimasu.',tl:'Tentu saja. Mohon bantuannya.'},
    ]
  },,
  {
    title:'Cuaca & Lingkungan',icon:'🌤',desc:'Percakapan tentang cuaca, musim, dan lingkungan alam Jepang',level:'N5',
    dialog:[
   ,
    {jp:'釣り',read:'つり',mean:'Memancing',level:'N4',ex:'川で釣りをする'},
    {jp:'登山',read:'とざん',mean:'Mendaki gunung',level:'N3',ex:'登山が趣味だ'},
    {jp:'陶芸',read:'とうげい',mean:'Keramik/Gerabah',level:'N2',ex:'陶芸教室に通う'},
    {jp:'書道',read:'しょどう',mean:'Kaligrafi Jepang',level:'N3',ex:'書道を習う'},
    {jp:'華道',read:'かどう',mean:'Merangkai bunga',level:'N2',ex:'華道を習っている'},
    {jp:'歌舞伎',read:'かぶき',mean:'Kabuki (teater tradisional)',level:'N2',ex:'歌舞伎を観に行く'},
    {jp:'散歩',read:'さんぽ',mean:'Jalan-jalan santai',level:'N5',ex:'公園を散歩する'},
    {jp:'俳句',read:'はいく',mean:'Haiku (puisi pendek)',level:'N2',ex:'俳句を詠む'},
    {jp:'コレクション',read:'これくしょん',mean:'Koleksi',level:'N3',ex:'切手を集めるコレクション'},
    {jp:'将棋',read:'しょうぎ',mean:'Catur Jepang',level:'N2',ex:'将棋を指す'}
    ],
    tips:['趣味は何ですか？ = apa hobimu?', '〜のが好きです = suka melakukan ~', '暇な時 = waktu luang'],
  },
  {
    title:'Cuaca & Basa-basi',icon:'☀️',desc:'Membahas cuaca, basa-basi ringan sehari-hari',level:'N5',
    dialog:[
      {speaker:'A',text:'今日は天気がいいですね。',romaji:'Kyou wa tenki ga ii desu ne.',tl:'Hari ini cuacanya bagus ya.'},
      {speaker:'B',text:'そうですね。でも、明日は雨が降るそうです。',romaji:'Sou desu ne. Demo, ashita wa ame ga furu sou desu.',tl:'Iya ya. Tapi, katanya besok akan hujan.'},
      {speaker:'A',text:'えっ、本当ですか？外出の予定があるんですが…',romaji:'E, hontou desu ka? Gaishutsu no yotei ga arun desu ga...',tl:'Eh, benarkah? Saya ada rencana keluar...'},
      {speaker:'B',text:'傘を持っていくといいですよ。最近、天気が変わりやすいですから。',romaji:'Kasa wo motte iku to ii desu yo. Saikin, tenki ga kawari yasui desu kara.',tl:'Sebaiknya bawa payung. Belakangan ini cuaca mudah berubah.'},
      {speaker:'A',text:'ありがとうございます。そうします。',romaji:'Arigatou gozaimasu. Sou shimasu.',tl:'Terima kasih. Akan saya lakukan.'}
    ],
    tips:['〜そうです = katanya ~ (dari informasi luar)', '〜やすい = mudah untuk ~ / cenderung ~', '今日は天気がいい = cuaca hari ini bagus', '傘を持つ = membawa payung']
  },
  {
    title:'Di Bank / Transaksi',icon:'🏦',desc:'Percakapan di bank, menukar uang, membuka rekening',level:'N4',
    dialog:[
      {speaker:'客',text:'すみません、口座を開設したいんですが。',romaji:'Sumimasen, kouza wo kaisetsu shitain desu ga.',tl:'Permisi, saya ingin membuka rekening.'},
      {speaker:'行員',text:'かしこまりました。こちらの書類にご記入ください。',romaji:'Kashikomarimashita. Kochira no shorui ni go-kinyuu kudasai.',tl:'Baik. Mohon isi formulir ini.'},
      {speaker:'客',text:'ここに住所を書けばいいですか？',romaji:'Koko ni juusho wo kakeba ii desu ka?',tl:'Apakah saya cukup menulis alamat di sini?'},
      {speaker:'行員',text:'はい、そちらの欄にご記入ください。印鑑はお持ちですか？',romaji:'Hai, sochira no ran ni go-kinyuu kudasai. Inkan wa o-mochi desu ka?',tl:'Ya, isi di kolom tersebut. Apakah Anda membawa stempel?'},
      {speaker:'客',text:'はい、持ってきました。これでよろしいでしょうか。',romaji:'Hai, motte kimashita. Kore de yoroshii deshou ka?',tl:'Ya, sudah saya bawa. Apakah ini sudah cukup?'},
      {speaker:'行員',text:'確認いたします。少々お待ちください。手続きは10分ほどかかります。',romaji:'Kakunin itashimasu. Shoushou o-machi kudasai. Tetsuzuki wa juppun hodo kakarimasu.',tl:'Saya akan memeriksa. Mohon tunggu sebentar. Prosesnya sekitar 10 menit.'},
      {speaker:'客',text:'分かりました。ATMカードはすぐ作れますか？',romaji:'Wakarimashita. ATM kaado wa sugu tsukuremasu ka?',tl:'Baik. Kartu ATM bisa dibuat hari ini?'},
      {speaker:'行員',text:'はい、本日中に発行できます。暗証番号は4桁でお決めください。',romaji:'Hai, honjitsu-juu ni hakkou dekimasu. Anshou bangou wa yonketa de o-kime kudasai.',tl:'Ya, bisa diterbitkan hari ini. Silakan tentukan PIN 4 digit.'},
      {speaker:'客',text:'ありがとうございます。よろしくお願いいたします。',romaji:'Arigatou gozaimasu. Yoroshiku o-negai itashimasu.',tl:'Terima kasih banyak atas bantuannya.'}
    ],
    tips:['口座を開設する = membuka rekening', 'ご記入ください = silakan isi (sopan)', 'かしこまりました = baik (paling formal)', '〜欄 = kolom dalam formulir']
  }
,
  {
    title:'Di Hotel',icon:'🏨',desc:'Check-in, minta layanan, dan keluhan di hotel Jepang',level:'N4',
    dialog:[
      {speaker:'客',text:'チェックインをお願いします。',romaji:'Chekku-in wo o-negai shimasu.',tl:'Tolong proses check-in saya.'},
      {speaker:'フロント',text:'かしこまりました。お名前とご予約番号をお聞かせください。',romaji:'Kashikomarimashita. O-namae to go-yoyaku bangou wo o-kikase kudasai.',tl:'Baik. Boleh saya tahu nama dan nomor reservasi Anda?'},
      {speaker:'客',text:'アフマドと申します。予約番号は12345です。',romaji:'Afumado to moushimasu. Yoyaku bangou wa ichiman nisen sanbyaku yonjuu go desu.',tl:'Nama saya Ahmad. Nomor reservasinya 12345.'},
      {speaker:'フロント',text:'ありがとうございます。シングルルームを2泊でご予約いただいております。',romaji:'Arigatou gozaimasu. Shinguru ruumu wo futahaku de go-yoyaku itadaite orimasu.',tl:'Terima kasih. Anda memesan kamar single untuk 2 malam.'},
      {speaker:'客',text:'はい。朝食はついていますか？',romaji:'Hai. Choushoku wa tsuite imasu ka?',tl:'Ya. Apakah sarapan termasuk?'},
      {speaker:'フロント',text:'はい、7時から10時まで1階のレストランでお召し上がりいただけます。',romaji:'Hai, shichiji kara juuji made ikkai no resutoran de o-meshiagari itadakemasu.',tl:'Ya, tersedia di restoran lantai 1 dari jam 7 sampai 10.'},
      {speaker:'客',text:'部屋のWi-Fiはありますか？',romaji:'Heya no Wi-Fi wa arimasu ka?',tl:'Apakah ada Wi-Fi di kamar?'},
      {speaker:'フロント',text:'はい、無料でご利用いただけます。パスワードはカードキーの封筒に書いてあります。',romaji:'Hai, muryou de go-riyou itadakemasu. Pasuwaado wa kaado kii no fuutou ni kaite arimasu.',tl:'Ya, gratis. Password ada di amplop kartu kunci.'}
    ],
    tips:['かしこまりました = baik (respon paling formal di hotel/restoran)', 'お召し上がりいただけます = versi keigo dari 食べられます', '封筒(ふうとう) = amplop', '朝食付き = termasuk sarapan']
  },
  {
    title:'Wawancara Kerja',icon:'💼',desc:'Percakapan wawancara kerja formal dalam bahasa Jepang bisnis',level:'N3',
    dialog:[
      {speaker:'面接官',text:'本日はご来社いただき、ありがとうございます。では始めましょうか。まず自己紹介をお願いします。',romaji:'Honjitsu wa go-raisha itadaki, arigatou gozaimasu. Dewa hajimemashou ka. Mazu jiko shoukai wo o-negai shimasu.',tl:'Terima kasih sudah datang hari ini. Mari kita mulai. Pertama, silakan perkenalkan diri Anda.'},
      {speaker:'応募者',text:'はい。私はアフマドと申します。現在、IT企業でウェブ開発を担当しております。日本語は5年間学んでおり、N2を取得しております。',romaji:'Hai. Watashi wa Afumado to moushimasu. Genzai, IT kigyou de webu kaihatsu wo tantou shite orimasu. Nihongo wa gonenshikan manande ori, N2 wo shutoku shite orimasu.',tl:'Ya. Nama saya Ahmad. Saat ini bekerja di perusahaan IT di bidang pengembangan web. Saya belajar bahasa Jepang 5 tahun dan memiliki sertifikat N2.'},
      {speaker:'面接官',text:'志望理由をお聞かせください。',romaji:'Shibou riyuu wo o-kikase kudasai.',tl:'Boleh ceritakan alasan melamar ke perusahaan kami?'},
      {speaker:'応募者',text:'御社のグローバルな事業展開に魅力を感じております。私の技術と語学力で貢献できると確信しております。',romaji:'Onsha no gurobaru na jigyou tenkai ni miryoku wo kanjite orimasu. Watashi no gijutsu to gogakuryoku de kouken dekiru to kakushin shite orimasu.',tl:'Saya tertarik pada ekspansi bisnis global perusahaan Anda. Saya yakin bisa berkontribusi dengan kemampuan teknis dan bahasa saya.'},
      {speaker:'面接官',text:'長所と短所を教えてもらえますか。',romaji:'Chousho to tansho wo oshiete moraemasu ka.',tl:'Bisakah ceritakan kelebihan dan kekurangan Anda?'},
      {speaker:'応募者',text:'長所は問題解決力です。短所は完璧主義的な面がありますが、優先順位をつけて改善しています。',romaji:'Chousho wa mondai kaiketsuryoku desu. Tansho wa kanpeki shugiteki na men ga arimasu ga, yuusen jun-i wo tsukete kaizen shite imasu.',tl:'Kelebihan saya adalah kemampuan memecahkan masalah. Kekurangan saya agak perfeksionis, tapi saya berlatih memprioritaskan tugas.'}
    ],
    tips:['御社(おんしゃ) = perusahaan Anda (keigo tinggi)', 'おります = versi keigo dari います', '志望理由(しぼうりゆう) = alasan melamar', '貢献(こうけん) = kontribusi', '完璧主義(かんぺきしゅぎ) = perfeksionisme']
  },
  {
    title:'Di Klinik / Apotik',icon:'💊',desc:'Percakapan di klinik dan apotik dengan kosakata medis dasar N4-N3',level:'N4',
    dialog:[
      {speaker:'患者',text:'すみません、今日は熱があって、喉も痛いんですが...',romaji:'Sumimasen, kyou wa netsu ga atte, nodo mo itain desu ga...',tl:'Permisi, hari ini saya demam dan tenggorokan juga sakit...'},
      {speaker:'受付',text:'いつ頃から症状がありますか？',romaji:'Itsu goro kara shoujou ga arimasu ka?',tl:'Sejak kapan gejalanya muncul?'},
      {speaker:'患者',text:'昨日の夜から始まりました。今朝から38度の熱があります。',romaji:'Kinou no yoru kara hajimarimashita. Kesa kara sanjuu hachi do no netsu ga arimasu.',tl:'Mulai dari semalam. Dari tadi pagi sudah 38 derajat.'},
      {speaker:'医師',text:'口を開けてください。...少し炎症がありますね。念のため薬を出します。',romaji:'Kuchi wo akete kudasai. ...Sukoshi enshou ga arimasu ne. Nen no tame kusuri wo dashimasu.',tl:'Buka mulutnya... Ada sedikit peradangan ya. Untuk jaga-jaga saya keluarkan obat.'},
      {speaker:'患者',text:'薬はどのくらい飲めばいいですか？',romaji:'Kusuri wa dono kurai nomeba ii desu ka?',tl:'Harus minum obatnya berapa lama?'},
      {speaker:'医師',text:'毎食後に飲んでください。3日分出します。熱が続くようなら、また来てください。',romaji:'Maishokugo ni nonde kudasai. Mikkabun dashimasu. Netsu ga tsuzuku you nara, mata kite kudasai.',tl:'Minum setiap setelah makan. Saya keluarkan untuk 3 hari. Kalau demam berlanjut, datang lagi.'}
    ],
    tips:['症状(しょうじょう) = gejala', '炎症(えんしょう) = peradangan', '毎食後(まいしょくご) = setelah setiap makan', '念のため = untuk jaga-jaga']
  },
  {
    title:'Di Kantor Pos',icon:'📮',desc:'Mengirim paket, membeli perangko, dan layanan pos di Jepang',level:'N4',
    dialog:[
      {speaker:'客',text:'すみません、この荷物を台湾まで送りたいんですが。',romaji:'Sumimasen, kono nimotsu wo Taiwan made okuritain desu ga.',tl:'Permisi, saya ingin mengirim paket ini ke Taiwan.'},
      {speaker:'局員',text:'はい、船便と航空便がございます。船便は安いですが、2〜3週間かかります。航空便は1週間ほどです。',romaji:'Hai, funabin to koukuubin ga gozaimasu. Funabin wa yasui desu ga, ni-san-shuukan kakarimasu. Koukuubin wa isshuukan hodo desu.',tl:'Ya, tersedia pengiriman laut dan udara. Laut lebih murah tapi 2-3 minggu. Udara sekitar 1 minggu.'},
      {speaker:'客',text:'航空便でお願いします。中身は洋服です。',romaji:'Koukuubin de onegai shimasu. Nakami wa youfuku desu.',tl:'Tolong kirim via udara. Isinya pakaian.'},
      {speaker:'局員',text:'こちらに送り先のお名前と住所をご記入ください。',romaji:'Kochira ni okurisaki no o-namae to juusho wo go-kinyuu kudasai.',tl:'Mohon isi nama dan alamat tujuan di sini.'},
      {speaker:'客',text:'はい、分かりました。あと、切手を3枚ください。',romaji:'Hai, wakarimashita. Ato, kitte wo sanmai kudasai.',tl:'Baik, mengerti. Juga, minta 3 lembar perangko.'},
      {speaker:'局員',text:'封書用と葉書用、どちらですか？',romaji:'Fuusho-you to hagaki-you, dochira desu ka?',tl:'Untuk surat biasa atau kartu pos?'},
      {speaker:'客',text:'葉書用をお願いします。合計いくらになりますか。',romaji:'Hagaki-you wo onegai shimasu. Goukei ikura ni narimasu ka.',tl:'Yang untuk kartu pos. Total semuanya berapa?'}
    ],
    tips:['荷物(にもつ) = paket/barang bawaan','船便(ふなびん) = pengiriman via kapal laut','航空便(こうくうびん) = pengiriman via udara','切手(きって) = perangko','葉書(はがき) = kartu pos','中身(なかみ) = isi (paket)']
  },
  {
    title:'Di Toko Elektronik',icon:'📱',desc:'Percakapan saat membeli gadget dan elektronik di toko Jepang',level:'N4',
    dialog:[
      {speaker:'店員',text:'いらっしゃいませ。何かお探しですか？',romaji:'Irasshaimase. Nanika o-sagashi desu ka?',tl:'Selamat datang. Apakah Anda sedang mencari sesuatu?'},
      {speaker:'客',text:'スマートフォンを見ているんですが、最新機種はどれですか？',romaji:'Sumaatofon wo mite irun desu ga, saishin kishu wa dore desu ka?',tl:'Saya sedang melihat smartphone, yang model terbaru yang mana?'},
      {speaker:'店員',text:'こちらが今月発売されたばかりの最新モデルです。カメラ性能が大幅に向上しています。',romaji:'Kochira ga kontsuki hatsubai sareta bakari no saishin moderu desu. Kamera seinou ga oohaba ni koujou shite imasu.',tl:'Ini model terbaru yang baru saja dirilis bulan ini. Kemampuan kameranya meningkat drastis.'},
      {speaker:'客',text:'バッテリーの持ちはどうですか？',romaji:'Batterii no mochi wa dou desu ka?',tl:'Bagaimana ketahanan baterainya?'},
      {speaker:'店員',text:'フル充電で約2日間お使いいただけます。防水機能もついています。',romaji:'Furu jyuuden de yaku futsukakan o-tsukai itadakemasu. Bousui kinou mo tsuite imasu.',tl:'Dengan baterai penuh bisa digunakan sekitar 2 hari. Juga sudah dilengkapi fitur tahan air.'},
      {speaker:'客',text:'試しに触ってみてもいいですか？',romaji:'Tameshi ni sawatte mite mo ii desu ka?',tl:'Boleh saya coba pegang dulu?'},
      {speaker:'店員',text:'もちろんです。こちらの展示品をお試しください。分割払いも可能でございます。',romaji:'Mochiron desu. Kochira no tenjihin wo o-tameshi kudasai. Bunkatsu-barai mo kanou de gozaimasu.',tl:'Tentu. Silakan coba unit display ini. Cicilan juga tersedia.'},
      {speaker:'客',text:'カラーバリエーションは何色ありますか？',romaji:'Karaa barieeeshon wa nanshoku arimasu ka?',tl:'Tersedia dalam berapa warna?'}
    ],
    tips:['いらっしゃいませ = salam pelayan toko (paling umum di Jepang)','〜たばかり = baru saja ~','大幅に(おおはばに) = secara signifikan/drastis','防水(ぼうすい) = tahan air','分割払い(ぶんかつばらい) = cicilan','展示品(てんじひん) = barang display']
  },
  {
    title:'Di Universitas',icon:'🎓',desc:'Percakapan mahasiswa di kampus - daftar mata kuliah, konsultasi dosen N3-N2',level:'N3',
    dialog:[
      {speaker:'学生',text:'先生、少しよろしいでしょうか。',romaji:'Sensei, sukoshi yoroshii deshou ka.',tl:'Pak/Bu Dosen, apakah ada waktu sebentar?'},
      {speaker:'教授',text:'ええ、どうぞ。何か用ですか？',romaji:'Ee, douzo. Nanika you desu ka?',tl:'Ya, silakan. Ada keperluan apa?'},
      {speaker:'学生',text:'来学期の研究テーマについてご相談したいんですが、お時間を頂けますか。',romaji:'Raigakki no kenkyuu teema ni tsuite go-soudan shitain desu ga, o-jikan wo itadakemasu ka.',tl:'Saya ingin berkonsultasi tentang tema penelitian semester depan, bisakah saya minta waktu Anda?'},
      {speaker:'教授',text:'いいですよ。今週の金曜日の午後3時はどうですか？',romaji:'Ii desu yo. Konshuu no kinyoubi no gogo sanji wa dou desu ka?',tl:'Boleh saja. Bagaimana Jumat minggu ini pukul 3 siang?'},
      {speaker:'学生',text:'はい、大丈夫です。その時間にオフィスアワーに伺います。',romaji:'Hai, daijoubu desu. Sono jikan ni ofisu awaa ni ukagaimasu.',tl:'Baik, tidak masalah. Saya akan datang ke office hour pada waktu itu.'},
      {speaker:'教授',text:'わかりました。事前にテーマの概要をメールで送ってもらえますか？',romaji:'Wakarimashita. Jizen ni teema no gaiyou wo meeru de okutte moraemasu ka?',tl:'Mengerti. Bisakah Anda kirimkan ringkasan tema via email terlebih dahulu?'},
      {speaker:'学生',text:'承知しました。木曜日までに送ります。よろしくお願いいたします。',romaji:'Shouchi shimashita. Mokuyoubi made ni okurimasu. Yoroshiku onegai itashimasu.',tl:'Baik, saya mengerti. Akan saya kirim sebelum Kamis. Terima kasih atas perhatiannya.'}
    ],
    tips:['よろしいでしょうか = bentuk sopan dari いいですか (meminta izin)','伺う(うかがう) = kenjougo dari 行く/来る (saya pergi/datang)','承知しました = saya mengerti (formal, lebih sopan dari 分かりました)','概要(がいよう) = ringkasan/ikhtisar','事前に(じぜんに) = sebelumnya/terlebih dahulu']
  },
  {
    title:'Meminta Izin Kantor',icon:'✉️',desc:'Pengajuan izin tidak masuk dan memo formal di lingkungan kerja N3-N2',level:'N3',
    dialog:[
      {speaker:'部下',text:'課長、少々よろしいでしょうか。',romaji:'Kachou, shoushou yoroshii deshou ka.',tl:'Pak Kepala Seksi, boleh bicara sebentar?'},
      {speaker:'課長',text:'はい、どうぞ。何か？',romaji:'Hai, douzo. Nanika?',tl:'Ya, silakan. Ada apa?'},
      {speaker:'部下',text:'実は、来週の月曜日に急用が入りまして、午前中お休みをいただきたいのですが。',romaji:'Jitsu wa, raishuu no getsuyoubi ni kyuuyou ga hairimashite, gozenchu oyasumi wo itadakitai no desu ga.',tl:'Sebenarnya, minggu depan Senin ada urusan mendadak, saya ingin mengambil izin setengah hari pagi.'},
      {speaker:'課長',text:'月曜日の午前中ですね。その日、特に会議は入っていませんね。大丈夫ですよ。',romaji:'Getsuyoubi no gozenchu desu ne. Sono hi, toku ni kaigi wa haitte imasen ne. Daijoubu desu yo.',tl:'Senin pagi ya. Hari itu tidak ada rapat khusus. Tidak masalah.'},
      {speaker:'部下',text:'ありがとうございます。午後からは出社いたします。',romaji:'Arigatou gozaimasu. Gogo kara wa shussha itashimasu.',tl:'Terima kasih. Saya akan masuk kantor dari siang hari.'},
      {speaker:'課長',text:'分かりました。では、一応チームメンバーにも伝えておいてください。',romaji:'Wakarimashita. Dewa, ichiyou chiimu menbaa ni mo tsutaete oite kudasai.',tl:'Mengerti. Kalau begitu, tolong beritahu anggota tim juga.'},
      {speaker:'部下',text:'はい、承知いたしました。メールで共有します。ご配慮ありがとうございます。',romaji:'Hai, shouchi itashimashita. Meeru de kyouyuu shimasu. Go-hairyo arigatou gozaimasu.',tl:'Baik, saya mengerti. Akan saya bagikan via email. Terima kasih atas pengertiannya.'}
    ],
    tips:['課長(かちょう) = kepala seksi/bagian','急用(きゅうよう) = urusan mendadak','お休みをいただく = mengambil izin (sangat sopan)','出社(しゅっしゃ) = masuk kantor','一応(いちおう) = untuk jaga-jaga/sekedar formalitas','ご配慮(ごはいりょ) = perhatian/kebijaksanaan (sangat formal)']
  },
  {
    title:'Di Perpustakaan',icon:'📚',desc:'Mencari buku, peminjaman, dan layanan perpustakaan - N4-N3',level:'N4',
    dialog:[
      {speaker:'利用者',text:'すみません、日本語能力試験に関する参考書を探しているんですが。',romaji:'Sumimasen, nihongo nouryoku shiken ni kan suru sankousho wo sagashite irun desu ga.',tl:'Permisi, saya sedang mencari buku referensi tentang Ujian Kemampuan Bahasa Jepang.'},
      {speaker:'司書',text:'はい、語学・検定書のコーナーは3階の左側になります。JLPTのコーナーは特にN3〜N1の参考書が充実しています。',romaji:'Hai, gengaku kenteisho no koonaa wa sankai no hidarigawa ni narimasu. JLPT no koonaa wa toku ni N3 kara N1 no sankousho ga juujitsu shite imasu.',tl:'Ya, rak buku bahasa dan sertifikasi ada di lantai 3 sebelah kiri. Rak JLPT khususnya lengkap untuk N3-N1.'},
      {speaker:'利用者',text:'貸し出しはどのようにすればいいですか？',romaji:'Kashidashi wa dono you ni sureba ii desu ka?',tl:'Bagaimana cara meminjam buku?'},
      {speaker:'司書',text:'図書カードをお持ちですか？お持ちでない場合は、受付で発行いたします。カードがあれば、1回につき5冊まで2週間借りられます。',romaji:'Tosho kaado wo o-mochi desu ka? O-mochi de nai baai wa, uketsuke de hakkou itashimasu. Kaado ga areba, ikkai ni tsuki gosatsu made nishukan karirarerimasu.',tl:'Apakah Anda punya kartu perpustakaan? Kalau tidak, bisa dibuat di resepsionis. Dengan kartu, bisa meminjam 5 buku sekaligus selama 2 minggu.'},
      {speaker:'利用者',text:'カードは持っていますが、返却が遅れた場合はどうなりますか？',romaji:'Kaado wa motte imasu ga, henkyaku ga okureta baai wa dou nari masu ka?',tl:'Saya punya kartu, tapi kalau pengembalian terlambat bagaimana?'},
      {speaker:'司書',text:'延滞の場合、延滞した日数と同じ日数間、新たな貸し出しができなくなります。',romaji:'Entai no baai, entai shita nissuu to onaji nissuu kan, arata na kashidashi ga dekinaku nari masu.',tl:'Kalau terlambat, Anda tidak bisa meminjam buku baru selama jumlah hari yang sama dengan keterlambatan.'}
    ],
    tips:['参考書(さんこうしょ) = buku referensi','司書(ししょ) = pustakawan','貸し出し(かしだし) = peminjaman','返却(へんきゃく) = pengembalian','延滞(えんたい) = keterlambatan','〜につき = per ~ (satu kali per...)','充実している(じゅうじつ) = lengkap/kaya']
  },
  {
    title:'Wawancara Beasiswa',icon:'🏅',desc:'Persiapan dan simulasi wawancara beasiswa ke Jepang - N3-N2',level:'N3',
    dialog:[
      {speaker:'面接官',text:'本日はお越しいただきありがとうございます。まず、自己紹介をお願いできますか。',romaji:'Honjitsu wa o-koshi itadaki arigatou gozaimasu. Mazu, jiko shoukai wo onegai dekimasu ka.',tl:'Terima kasih sudah datang hari ini. Pertama, bisakah Anda memperkenalkan diri?'},
      {speaker:'志願者',text:'はい、ありがとうございます。私は〇〇大学の3年生で、日本語を3年間勉強しております。将来は日本の建築を学び、母国の都市開発に貢献したいと考えております。',romaji:'Hai, arigatou gozaimasu. Watashi wa XX daigaku no sannensee de, nihongo wo sannenkan benkyou shite orimasu. Shourai wa nihon no kenchiku wo manabi, bokoku no toshi kaihatsu ni kouken shitai to kangaete orimasu.',tl:'Ya, terima kasih. Saya mahasiswa tahun ke-3 di Universitas XX, sudah belajar bahasa Jepang selama 3 tahun. Ke depan, saya ingin mempelajari arsitektur Jepang dan berkontribusi pada pembangunan kota di negara saya.'},
      {speaker:'面接官',text:'日本の建築のどのような点に魅力を感じていますか？',romaji:'Nihon no kenchiku no dono you na ten ni miryoku wo kanjite imasu ka?',tl:'Aspek apa dari arsitektur Jepang yang Anda rasa menarik?'},
      {speaker:'志願者',text:'特に伝統と近代技術の融合に感銘を受けています。木造建築の耐震技術は、地震の多い私の国でも応用できると考えています。',romaji:'Toku ni dentou to kindai gijutsu no yuugou ni kanmei wo ukete imasu. Mokuzou kenchiku no taishin gijutsu wa, jishin no ooi watashi no kuni demo ouyou dekiru to kangaete imasu.',tl:'Saya sangat terkesan dengan perpaduan tradisi dan teknologi modern. Teknologi tahan gempa bangunan kayu menurut saya bisa diterapkan di negara saya yang juga banyak gempa.'},
      {speaker:'面接官',text:'留学中、困難なことがあったらどう対処しますか？',romaji:'Ryuugaku chuu, konnan na koto ga attara dou taisho shimasu ka?',tl:'Jika ada kesulitan selama belajar di Jepang, bagaimana Anda mengatasinya?'},
      {speaker:'志願者',text:'まず、担当の指導教員に相談します。また、同じ留学生のコミュニティを活用したり、積極的に日本人学生と交流したりして乗り越えようと思います。',romaji:'Mazu, tantou no shidou kyouin ni soudan shimasu. Mata, onaji ryuugakusee no komyuniti wo katsuyou shitari, sekkyoku-teki ni nihonjin gakusee to kouryu shitari shite norikoeyou to omoimasu.',tl:'Pertama, saya akan berkonsultasi dengan dosen pembimbing. Selain itu, saya akan memanfaatkan komunitas sesama mahasiswa asing dan aktif berinteraksi dengan mahasiswa Jepang untuk melewatinya.'}
    ],
    tips:['自己紹介(じこしょうかい) = perkenalan diri','〜と考えております = saya berpikir ~ (keigo dari と思っています)','融合(ゆうごう) = perpaduan/fusi','感銘を受ける(かんめいをうける) = sangat terkesan','指導教員(しどうきょういん) = dosen pembimbing','乗り越える(のりこえる) = mengatasi/melewati tantangan']
  },
  {
    title:'Di Salon / Barber',icon:'💇',desc:'Percakapan di salon rambut Jepang — potongan, gaya, perawatan N4-N3',level:'N4',
    dialog:[
      {speaker:'スタッフ',text:'いらっしゃいませ。本日はどのようになさいますか？',romaji:'Irasshaimase. Honjitsu wa dono you ni nasaimasu ka?',tl:'Selamat datang. Hari ini mau perawatan apa?'},
      {speaker:'客',text:'カットとシャンプーをお願いしたいんですが。',romaji:'Katto to shanpuu wo onegai shitain desu ga.',tl:'Saya ingin potong rambut dan keramas.'},
      {speaker:'スタッフ',text:'かしこまりました。どのくらい切りますか？',romaji:'Kashikomarimashita. Dono kurai kirimasu ka?',tl:'Baik. Mau dipotong berapa?'},
      {speaker:'客',text:'5センチくらい切ってください。サイドは短めにして、トップは少し残してほしいです。',romaji:'Gosenchikurai kitte kudasai. Saido wa mijikame ni shite, toppu wa sukoshi nokoshite hoshii desu.',tl:'Tolong potong sekitar 5 cm. Bagian samping pendek, bagian atas sisakan sedikit.'},
      {speaker:'スタッフ',text:'前髪はどうしますか？',romaji:'Maegami wa dou shimasu ka?',tl:'Bagaimana dengan poni depannya?'},
      {speaker:'客',text:'眉毛にかかるくらいに整えてください。あと、少しすいてほしいです。髪が多いので。',romaji:'Mayuge ni kakaru kurai ni totonoete kudasai. Ato, sukoshi suite hoshii desu. Kami ga ooi node.',tl:'Tolong rapikan sampai sekitar alis. Dan tolong sedikit ditipiskan. Karena rambutnya tebal.'},
      {speaker:'スタッフ',text:'分かりました。仕上がりはどのようなスタイルをご希望ですか？',romaji:'Wakarimashita. Shiagari wa dono you na sutairu wo go-kibou desu ka?',tl:'Mengerti. Untuk gaya akhirnya, Anda ingin seperti apa?'}
    ],
    tips:['カット(かっと) = memotong rambut','すく = mengurangi/menipiskan rambut tebal','前髪(まえがみ) = poni','仕上がり(しあがり) = hasil akhir/finishing','整える(ととのえる) = merapikan','かかる = menyentuh/sampai ke']
  },
  {
    title:'Di Kantor Imigrasi',icon:'🏛️',desc:'Mengurus izin tinggal dan perpanjangan visa di Jepang N3-N2',level:'N3',
    dialog:[
      {speaker:'申請者',text:'すみません、在留資格の更新手続きをしたいのですが。',romaji:'Sumimasen, zairyuu shikaku no koushin tetsuzuki wo shitain desu ga.',tl:'Permisi, saya ingin mengurus perpanjangan status kependudukan.'},
      {speaker:'職員',text:'更新の種類は何ですか？留学ですか、就労ですか。',romaji:'Koushin no shurui wa nan desu ka? Ryuugaku desu ka, shuurou desu ka.',tl:'Jenis perpanjangan apa? Pelajar atau pekerja?'},
      {speaker:'申請者',text:'留学の在留資格です。大学院に在学中です。',romaji:'Ryuugaku no zairyuu shikaku desu. Daigakuin ni zaigaku chuu desu.',tl:'Status kependudukan pelajar. Saya sedang kuliah di program pascasarjana.'},
      {speaker:'職員',text:'必要書類は、申請書、パスポート、在留カード、在学証明書、授業料の領収書、住民票です。',romaji:'Hitsuyou shorui wa, shinseisho, pasupoto, zairyuu kaado, zaigaku shomeisho, jugyouryou no ryoushuusho, juuminhyou desu.',tl:'Dokumen yang diperlukan: formulir, paspor, kartu izin tinggal, surat keterangan mahasiswa, bukti pembayaran kuliah, dan surat kependudukan.'},
      {speaker:'申請者',text:'在留カードと住民票は持参しています。他の書類はすべて揃えてあります。',romaji:'Zairyuu kaado to juuminhyou wa jisan shite imasu. Hoka no shorui wa subete soroete arimasu.',tl:'Kartu izin tinggal dan surat kependudukan sudah dibawa. Dokumen lainnya sudah semua disiapkan.'},
      {speaker:'職員',text:'では、窓口でご確認いたします。審査には通常2〜3週間かかります。結果は郵送でお知らせします。',romaji:'Dewa, madoguchi de go-kakunin itashimasu. Shinsa ni wa tsuujou ni kara sanshukan kakarimasu. Kekka wa yuusou de oshirase shimasu.',tl:'Baik, akan kami periksa di loket. Pemeriksaan biasanya membutuhkan 2-3 minggu. Hasilnya akan dikirimkan melalui pos.'},
      {speaker:'申請者',text:'もし不備があった場合はどうなりますか？',romaji:'Moshi fubi ga atta baai wa dou nari masu ka?',tl:'Kalau ada kekurangan dokumen, akan bagaimana?'}
    ],
    tips:['在留資格(ざいりゅうしかく) = status kependudukan (izin tinggal)','更新(こうしん) = perpanjangan','在留カード = kartu izin tinggal (selalu dibawa wajib)','住民票(じゅうみんひょう) = surat keterangan kependudukan','不備(ふび) = kekurangan/ketidaklengkapan','持参(じさん) = dibawa sendiri']
  },
  {
    title:'Di Kelas Bahasa Jepang',icon:'📓',desc:'Percakapan di kelas bahasa Jepang — pertanyaan, kesalahan, umpan balik — N3-N2',level:'N3',
    dialog:[
      {speaker:'先生',text:'今日は〜ておく と 〜てある の違いを練習しましょう。まず、どんな違いがあると思いますか？',romaji:'Kyou wa〜te oku to 〜te aru no chigai wo renshuu shimashou. Mazu, donna chigai ga aru to omoimasu ka?',tl:'Hari ini kita akan berlatih perbedaan 〜ておく dan 〜てある. Pertama, menurut kalian apa perbedaannya?'},
      {speaker:'学生A',text:'えっと...〜ておくは、何かのために前もってすることだと思います。',romaji:'Etto...〜te oku wa, nanika no tame ni maemotte suru koto da to omoimasu.',tl:'Emmm... saya rasa 〜ておく adalah melakukan sesuatu terlebih dahulu untuk suatu tujuan.'},
      {speaker:'先生',text:'よく気づきましたね！正解です。では、〜てあるはどうですか？',romaji:'Yoku kidzukimashita ne! Seikai desu. Dewa, 〜te aru wa dou desu ka?',tl:'Bagus sekali perhatiannya! Betul. Lalu, bagaimana dengan 〜てある?'},
      {speaker:'学生B',text:'すみません、例文で説明してもらえますか？ちょっと分かりにくくて。',romaji:'Sumimasen, reibun de setsumei shite moraemasu ka? Chotto wakarinikunakute.',tl:'Maaf, bisakah dijelaskan dengan contoh kalimat? Agak susah dipahami.'},
      {speaker:'先生',text:'もちろん！「旅行のために地図を調べておいた」と「地図が調べてある」を比べてみましょう。',romaji:'Mochiron! "Ryokou no tame ni chizu wo shirabe te oita" to "chizu ga shirabete aru" wo kurabete mimashou.',tl:'Tentu! Ayo kita bandingkan "sudah mencari tahu peta untuk perjalanan" dan "peta sudah dicari tahu (ada hasilnya)".'},
      {speaker:'学生A',text:'ああ、なるほど！ておくは意図的な行動で、てあるはその結果の状態ですね。',romaji:'Aa, naruhodo! Te oku wa itouteki na koudou de, te aru wa sono kekka no joutai desu ne.',tl:'Ohhh, saya mengerti! 〜ておく adalah aksi yang disengaja, sedangkan 〜てある adalah keadaan hasil dari aksi itu.'},
      {speaker:'先生',text:'完璧な説明です！では、宿題として例文を5つ作ってきてください。',romaji:'Kanpeki na setsumei desu! Dewa, shukudai toshite reibun wo itsutsu tsukutte kite kudasai.',tl:'Penjelasan yang sempurna! Kalau begitu, sebagai PR buatlah 5 kalimat contoh.'}
    ],
    tips:['〜ておく = melakukan X terlebih dahulu (sebagai persiapan)','〜てある = kondisi/keadaan hasil dari aksi X oleh seseorang','よく気づく(きづく) = memperhatikan dengan baik','例文(れいぶん) = kalimat contoh','なるほど = oh begitu / I see','完璧(かんぺき) = sempurna']
  },
  {
    title:'Di Rumah Sakit Umum',icon:'🏥',desc:'Mendaftar, konsultasi dokter, tebus resep — N3-N2',level:'N3',
    dialog:[
      {speaker:'患者',text:'受付です。今日初めて来たんですが、どうすればいいですか？',romaji:'Uketsuke desu. Kyou hajimete kita n desu ga, dou sureba ii desu ka?',tl:'Di resepsionis. Ini pertama kali saya datang, harus bagaimana?'},
      {speaker:'受付',text:'初診ですね。こちらの問診票にご記入いただけますか？保険証はお持ちですか？',romaji:'Shoshin desu ne. Kochira no monshinhyou ni go-kinyuu itadakemasu ka? Hokenshou wa o-mochi desu ka?',tl:'Kunjungan pertama ya. Bisakah mengisi formulir ini? Apakah Anda membawa kartu asuransi kesehatan?'},
      {speaker:'患者',text:'はい、保険証です。2日前から熱と喉の痛みがあって、咳も出ています。',romaji:'Hai, hokenshou desu. Futsuka mae kara netsu to nodo no itami ga atte, seki mo dete imasu.',tl:'Ya, ini kartu asuransinya. Sejak 2 hari lalu saya demam dan sakit tenggorokan, batuk juga.'},
      {speaker:'受付',text:'分かりました。内科でご案内します。しばらくお待ちください。番号札をお取りください。',romaji:'Wakarimashita. Naika de go-annai shimasu. Shibaraku o-machi kudasai. Bangousan wo o-tori kudasai.',tl:'Mengerti. Akan diarahkan ke poli penyakit dalam. Mohon tunggu sebentar. Ambil nomor antrean.'},
      {speaker:'医師',text:'どんな症状がありますか？いつから始まりましたか？',romaji:'Donna shoujou ga arimasu ka? Itsu kara hajimarimashita ka?',tl:'Gejala apa saja yang ada? Mulai kapan?'},
      {speaker:'患者',text:'2日前から38度の熱が続いていて、喉が痛くて飲み込みにくいです。食欲もありません。',romaji:'Futsuka mae kara sanjuuhachi do no netsu ga tsuzuite ite, nodo ga itakute nomikomi ni kui desu. Shokuoku mo arimasen.',tl:'Sudah 2 hari demam 38 derajat terus-menerus, tenggorokan sakit dan sulit menelan. Nafsu makan juga tidak ada.'}
    ],
    tips:['初診(しょしん) = kunjungan pertama ke dokter','問診票(もんしんひょう) = formulir pertanyaan medis','保険証(ほけんしょう) = kartu asuransi kesehatan','内科(ないか) = poli penyakit dalam','番号札(ばんごうふだ) = nomor antrean','飲み込む(のみこむ) = menelan','食欲(しょくよく) = nafsu makan']
  },
  {
    title:'Rapat Kantor',icon:'💼',desc:'Rapat proyek, presentasi, dan diskusi kerja formal — N3-N2',level:'N3',
    dialog:[
      {speaker:'司会',text:'では定刻になりましたので、始めさせていただきます。本日の議題は来期の販売戦略についてです。',romaji:'Dewa teikoku ni narimashita no de, hajimesasete itadakimasu. Honjitsu no gidai wa raiki no hanbai senryaku ni tsuite desu.',tl:'Baik, waktunya sudah tiba, mari kita mulai. Agenda hari ini adalah tentang strategi penjualan kuartal depan.'},
      {speaker:'田中',text:'資料はお手元にありますでしょうか？まず現状分析から始めます。先月の売上は前年同月比で15%減でした。',romaji:'Shiryou wa o-temoto ni arimasu deshyo ka? Mazu genjou bunseki kara hajimemasu. Sengetsu no uriage wa zennen dogetsu-hi de juugo paasento gen deshita.',tl:'Apakah dokumen sudah ada di tangan Anda semua? Pertama kita mulai dari analisis kondisi saat ini. Penjualan bulan lalu turun 15% dibanding bulan yang sama tahun lalu.'},
      {speaker:'山田',text:'その点について質問してもいいですか？競合他社の影響はどう分析していますか？',romaji:'Sono ten ni tsuite shitsumon shite mo ii desu ka? Kyougou-tasha no eikyou wa dou bunseki shite imasu ka?',tl:'Boleh saya bertanya tentang poin itu? Bagaimana analisis pengaruh perusahaan pesaing?'},
      {speaker:'田中',text:'おっしゃる通り、競合の新商品が大きく影響しています。そこで、我々は品質向上と価格見直しを提案します。',romaji:'Ossharu toori, kyougou no shinshouhin ga oukiku eikyou shite imasu. Soko de, wareware wa hinshitsu koujou to kakaku minaoshi wo teian shimasu.',tl:'Memang benar, produk baru pesaing sangat berpengaruh. Oleh karena itu, kami mengusulkan peningkatan kualitas dan peninjauan harga.'},
      {speaker:'司会',text:'では、その提案について各部署から意見をいただけますか？',romaji:'Dewa, sono teian ni tsuite kaku busho kara iken wo itadakemasu ka?',tl:'Baik, bisakah setiap departemen memberikan pendapatnya tentang usulan tersebut?'}
    ],
    tips:['議題(ぎだい) = agenda/topik pembahasan','現状分析(げんじょうぶんせき) = analisis kondisi saat ini','前年同月比(ぜんねんどうげつひ) = dibanding bulan sama tahun lalu','競合他社(きょうごうたしゃ) = perusahaan pesaing','品質向上(ひんしつこうじょう) = peningkatan kualitas','提案する(ていあんする) = mengusulkan']
  },
  {
    title:'Reservasi Hotel',icon:'🏨',desc:'Reservasi kamar, check-in, layanan hotel — N4-N3',level:'N4',
    dialog:[
      {speaker:'フロント',text:'お電話ありがとうございます。○○ホテルでございます。',romaji:'O-denwa arigatou gozaimasu. XX hoteru de gozaimasu.',tl:'Terima kasih sudah menelepon. Ini Hotel XX.'},
      {speaker:'客',text:'来週の金曜日から2泊、シングルルームを予約したいんですが。',romaji:'Raishuu no kin\'youbi kara nihaku, shinguru ruumu wo yoyaku shitain desu ga.',tl:'Saya ingin memesan kamar single 2 malam mulai Jumat depan.'},
      {speaker:'フロント',text:'ご確認いたします。来週の金曜日、8月15日から2泊、シングルルームですね。1泊8,500円になります。',romaji:'Go-kakunin itashimasu. Raishuu no kin\'youbi, hachigatsu juugo-nichi kara nihaku, shinguru ruumu desu ne. Ippaku hassen gohyaku-en ni narimasu.',tl:'Saya konfirmasi. Jumat depan 15 Agustus, 2 malam, kamar single. Harganya 8.500 yen per malam.'},
      {speaker:'客',text:'はい、お願いします。朝食は付いていますか？',romaji:'Hai, onegaishimasu. Choushoku wa tsuite imasu ka?',tl:'Ya, saya pesan. Apakah termasuk sarapan?'},
      {speaker:'フロント',text:'素泊まりプランになります。朝食は別途1,500円でご用意できます。いかがでしょうか？',romaji:'Sudomari puran ni narimasu. Choushoku wa betto sengohyaku-en de go-youi dekimasu. Ikaga deshou ka?',tl:'Ini paket tanpa sarapan. Sarapan bisa kami siapkan tambahan 1.500 yen. Bagaimana?'},
      {speaker:'客',text:'朝食も付けてください。お名前とクレジットカード番号を教えていただけますか？',romaji:'Choushoku mo tsukete kudasai. O-namae to kurejitto kaado bangou wo oshiete itadakemasu ka?',tl:'Tolong tambahkan sarapan. Boleh saya minta nama dan nomor kartu kredit Anda?'}
    ],
    tips:['2泊(にはく) = 2 malam menginap','素泊まり(すどまり) = menginap tanpa makan (room only)','別途(べっと) = terpisah/ekstra','1泊(いっぱく) = 1 malam','朝食付き(ちょうしょくつき) = termasuk sarapan','フロント = resepsionis hotel']
  },
  {
    title:'Konsultasi dengan Dokter',icon:'🩺',desc:'Menyampaikan gejala, diagnosis, dan resep obat — N3',level:'N3',
    dialog:[
      {speaker:'医師',text:'どのような症状ですか？',romaji:'Dono you na shoujou desu ka?',tl:'Gejala apa yang Anda alami?'},
      {speaker:'患者',text:'3日前から頭痛と発熱が続いています。昨日から喉も痛くなってきました。',romaji:'Mikkamae kara zutsuu to hatsunetsu ga tsuzuite imasu. Kinou kara nodo mo itaku natte kimashita.',tl:'Sakit kepala dan demam sudah berlanjut sejak 3 hari lalu. Mulai kemarin tenggorokan juga mulai sakit.'},
      {speaker:'医師',text:'体温を測りましょう。38.5度ですね。リンパ節の腫れもあります。インフルエンザの可能性がありますので、検査しましょう。',romaji:'Taion wo hakarimashou. Sanjuuhachi-ten-go do desu ne. Rinpasetsu no hare mo arimasu. Infuruenza no kanousei ga arimasu node, kensa shimashou.',tl:'Mari kita ukur suhu tubuhnya. 38,5 derajat. Ada pembengkakan kelenjar getah bening juga. Ada kemungkinan flu, jadi mari kita periksa.'},
      {speaker:'患者',text:'インフルエンザですか…。もし陽性だったら、どうなりますか？',romaji:'Infuruenza desu ka... Moshi yousei dattara, dou nari masu ka?',tl:'Flu ya... Kalau positif, harus bagaimana?'},
      {speaker:'医師',text:'抗ウイルス薬を処方します。5日間の自宅療養が必要です。周りの人にうつさないよう、外出は避けてください。',romaji:'Kou-uirusu-yaku wo shohousuru shimasu. Itsukakan no jitaku ryouyou ga hitsuyou desu. Mawari no hito ni utsusanai you, gaishutsu wa sakete kudasai.',tl:'Saya akan meresepkan obat antivirus. Perlu istirahat di rumah selama 5 hari. Agar tidak menularkan ke orang sekitar, hindari keluar rumah.'}
    ],
    tips:['発熱(はつねつ) = demam','リンパ節(りんぱせつ) = kelenjar getah bening','検査する(けんさする) = memeriksa/melakukan tes','陽性(ようせい) = positif (tes)','抗ウイルス薬(こうういるすやく) = obat antivirus','自宅療養(じたくりょうよう) = istirahat/pengobatan di rumah']
  },
  {
    title:'Di Toko Buku',icon:'📕',desc:'Mencari buku, minta rekomendasi, tanya ketersediaan — N4',level:'N4',
    dialog:[
      {speaker:'客',text:'すみません、日本語能力試験N3の参考書を探しているのですが。',romaji:'Sumimasen, nihongo nouryoku shiken N3 no sankousho wo sagashite iru no desu ga.',tl:'Permisi, saya sedang mencari buku referensi JLPT N3.'},
      {speaker:'店員',text:'はい、語学コーナーは2階でございます。ご案内しましょうか？',romaji:'Hai, gogaku koonaa wa nikai de gozaimasu. Go-annai shimashou ka?',tl:'Ya, sudut bahasa ada di lantai 2. Boleh saya antarkan?'},
      {speaker:'客',text:'お願いします。あと、最近話題になっている小説も探しているのですが…',romaji:'Onegaishimasu. Ato, saikin wadai ni natte iru shousetsu mo sagashite iru no desu ga...',tl:'Mohon dibantu. Selain itu, saya juga mencari novel yang baru-baru ini jadi pembicaraan...'},
      {speaker:'店員',text:'今月のベストセラーはこちらです。文学賞を受賞した作品もございます。どのジャンルがお好みですか？',romaji:'Kongetsu no besuto seraa wa kochira desu. Bungaku-shou wo jushousho shita sakuhin mo gozaimasu. Dono janru ga o-konomi desu ka?',tl:'Inilah bestseller bulan ini. Kami juga punya karya pemenang penghargaan sastra. Genre apa yang Anda sukai?'},
      {speaker:'客',text:'ミステリーが好きです。日本語の勉強にもなる本があれば、ぜひ教えてください。',romaji:'Misuteri ga suki desu. Nihongo no benkyou ni mo naru hon ga areba, zehi oshiete kudasai.',tl:'Saya suka misteri. Kalau ada buku yang sekaligus bisa untuk belajar bahasa Jepang, tolong rekomendasikan.'},
      {speaker:'店員',text:'では、この作家の本はいかがでしょう？文体が読みやすく、語彙も豊富です。ルビ付きの版もございます。',romaji:'Dewa, kono sakka no hon wa ikaga deshou? Buntai ga yomiyasuku, goi mo houfu desu. Rubi-tsuki no han mo gozaimasu.',tl:'Kalau begitu, bagaimana buku penulis ini? Gaya penulisannya mudah dibaca dan kosa katanya kaya. Ada versi dengan furigana juga.'}
    ],
    tips:['参考書(さんこうしょ) = buku referensi','語学コーナー(ごがくこーなー) = sudut bahasa (di toko)','話題(わだい) = topik pembicaraan / sedang hits','文学賞(ぶんがくしょう) = penghargaan sastra','文体(ぶんたい) = gaya penulisan','ルビ付き(るびつき) = dilengkapi furigana']
  },
  {
    title:'Membahas Rencana Liburan',icon:'🗺️',desc:'Merencanakan perjalanan wisata ke Kyoto bersama teman — N4',level:'N4',
    dialog:[
      {speaker:'Aさん',text:'来月の連休、京都に行かない？紅葉がきれいな季節だし。',romaji:'Raigetsu no renkyuu, Kyouto ni ikanai? Kouyou ga kirei na kisetsu da shi.',tl:'Liburan panjang bulan depan, mau ke Kyoto tidak? Musim daun merah yang indah.'},
      {speaker:'Bさん',text:'いいね！どのくらい行く予定？交通手段はどうする？',romaji:'Ii ne! Dono kurai iku yotei? Koutsuu shudan wa dou suru?',tl:'Bagus! Rencananya berapa hari? Transportasinya bagaimana?'},
      {speaker:'Aさん',text:'2泊3日くらいがいいかな。新幹線で行けば早いけど、夜行バスにすれば宿泊費が浮くよ。',romaji:'Nihaku mikkakan kurai ga ii ka na. Shinkansen de ikeba hayai kedo, yakoubus ni sureba shukuhakuhi ga uku yo.',tl:'Sekitar 2 malam 3 hari. Kalau naik shinkansen cepat, tapi kalau bus malam bisa hemat biaya hotel.'},
      {speaker:'Bさん',text:'じゃあ、夜行バスで行って、宿は民泊はどうかな？安くて雰囲気もいいし。',romaji:'Jaa, yakou basu de itte, yado wa minpaku wa dou ka na? Yasukute funiki mo ii shi.',tl:'Kalau gitu, naik bus malam dan menginap di minpaku (Airbnb)? Murah dan suasananya juga bagus.'},
      {speaker:'Aさん',text:'それいいかも！観光スポットは、金閣寺と嵐山は外せないね。',romaji:'Sore ii kamo! Kankou supotto wa, Kinkakuji to Arashiyama wa hazusenai ne.',tl:'Mungkin bagus! Untuk tempat wisata, Kinkakuji dan Arashiyama tidak boleh dilewatkan ya.'}
    ],
    tips:['連休(れんきゅう) = liburan panjang (hari libur berturut-turut)','紅葉(こうよう) = daun merah/gugur musim gugur','夜行バス(やこうバス) = bus malam','民泊(みんぱく) = penginapan rumah warga (seperti Airbnb)','宿泊費が浮く(しゅくはくひがうく) = hemat biaya menginap','外せない(はずせない) = tidak boleh dilewatkan']
  },
  {
    title:'Negosiasi Harga',icon:'💰',desc:'Menawar dan negosiasi harga di pasar tradisional — N3',level:'N3',
    dialog:[
      {speaker:'客',text:'すみません、このジャケット、少し高いですね。もう少し安くなりませんか？',romaji:'Sumimasen, kono jaketto, sukoshi takai desu ne. Mou sukoshi yasuku nari masen ka?',tl:'Permisi, jaket ini agak mahal ya. Apakah bisa sedikit lebih murah?'},
      {speaker:'店主',text:'これは職人が手作りしたものでして、品質には自信があります。それでも、特別に10%お値引きしましょう。',romaji:'Kore wa shokunin ga tezukuri shita mono deshite, hinshitsu ni wa jishin ga arimasu. Sore demo, tokubetsu ni juu-paasento o-nebiki shimashou.',tl:'Ini buatan tangan pengrajin, kami percaya diri dengan kualitasnya. Meski begitu, khusus untuk Anda kami diskon 10%.'},
      {speaker:'客',text:'ありがとうございます。実はこのジャケットと一緒にスカーフも買おうと思っているんですが、まとめて買ったらさらに割引はできますか？',romaji:'Arigatou gozaimasu. Jitsu wa kono jaketto to issho ni sukaafu mo kaou to omotte iru n desu ga, matomete kattara sara ni waribiki wa dekimasu ka?',tl:'Terima kasih. Sebenarnya saya juga ingin membeli syal bersama jaket ini, kalau beli sekaligus apakah bisa diskon lagi?'},
      {speaker:'店主',text:'セット購入でしたら、両方で20%オフにさせていただきます。',romaji:'Setto kounyuu deshitara, ryouhou de nijuu-paasento ofu ni sasete itadakimasu.',tl:'Kalau beli sepaket, keduanya bisa 20% off.'},
      {speaker:'客',text:'分かりました。では、セットでお願いします。カードも使えますか？',romaji:'Wakarimashita. Dewa, setto de onegaishimasu. Kaado mo tsukaemasu ka?',tl:'Baik. Kalau begitu, saya beli sepaket. Kartu kredit juga bisa dipakai?'}
    ],
    tips:['職人(しょくにん) = pengrajin/pengrajin terampil','お値引き(おねびき) = diskon/potongan harga','まとめて = sekaligus/sekaligus','割引(わりびき) = diskon','セット購入(せっとこうにゅう) = pembelian paket','特別に(とくべつに) = secara khusus/istimewa']
  },
  {
    title:'Di ATM / Bank',icon:'🏦',desc:'Tarik tunai, transfer, dan layanan bank Jepang — N4',level:'N4',
    dialog:[
      {speaker:'客',text:'すみません、このATMの使い方が分からないんですが、教えていただけますか？',romaji:'Sumimasen, kono ATM no tsukai-kata ga wakaranain desu ga, oshiete itadakemasu ka?',tl:'Permisi, saya tidak mengerti cara pakai ATM ini, bisakah Anda jelaskan?'},
      {speaker:'行員',text:'はい、もちろんです。まずカードを入れてください。次に暗証番号を4桁入力します。',romaji:'Hai, mochiron desu. Mazu kaado wo irete kudasai. Tsugi ni anshou bangou wo yonketa nyuuryoku shimasu.',tl:'Ya, tentu. Pertama masukkan kartu. Kemudian masukkan PIN 4 digit.'},
      {speaker:'客',text:'海外のカードでも使えますか？手数料はかかりますか？',romaji:'Kaigai no kaado demo tsukaemasu ka? Tesuuryou wa kakarimasu ka?',tl:'Kartu luar negeri juga bisa dipakai? Ada biaya administrasinya?'},
      {speaker:'行員',text:'海外発行のカードもご利用いただけます。ただし、1回の引き出しにつき220円の手数料がかかります。',romaji:'Kaigai hakkou no kaado mo go-riyou itadakemasu. Tadashi, ikkai no hikidashi ni tsuki nihyaku nijuu-en no tesuuryou ga kakarimasu.',tl:'Kartu yang diterbitkan di luar negeri juga bisa digunakan. Namun, ada biaya 220 yen per kali penarikan.'},
      {speaker:'客',text:'分かりました。あと、他行への送金もここでできますか？',romaji:'Wakarimashita. Ato, takou e no soukin mo koko de dekimasu ka?',tl:'Mengerti. Selain itu, apakah transfer ke bank lain juga bisa dilakukan di sini?'},
      {speaker:'行員',text:'はい、こちらのATMから他行への振り込みも可能です。ただし、平日15時以降と土日祝日は手数料が220円かかります。',romaji:'Hai, kochira no ATM kara takou e no furikomi mo kanou desu. Tadashi, heijitsu juugoji ikou to doyou nichiyou shukujitsu wa tesuuryou ga nihyaku nijuu-en kakarimasu.',tl:'Ya, transfer ke bank lain dari ATM ini juga bisa. Namun, ada biaya 220 yen untuk setelah jam 15 hari kerja dan di hari Sabtu, Minggu, serta hari libur.'}
    ],
    tips:['暗証番号(あんしょうばんごう) = PIN/nomor rahasia','手数料(てすうりょう) = biaya administrasi/transaksi','引き出し(ひきだし) = penarikan tunai','振り込み(ふりこみ) = transfer uang','他行(たこう) = bank lain','平日(へいじつ) = hari kerja']
  },
  {
    title:'Di Agen Perjalanan',icon:'✈️',desc:'Memesan paket wisata dan tiket — N4-N3',level:'N4',
    dialog:[
      {speaker:'客',text:'来月、家族で北海道に旅行したいのですが、おすすめのプランはありますか？',romaji:'Raigetsu, kazoku de Hokkaidou ni ryokou shitain desu ga, osusume no puran wa arimasu ka?',tl:'Bulan depan saya ingin berwisata ke Hokkaido bersama keluarga, apakah ada paket yang direkomendasikan?'},
      {speaker:'スタッフ',text:'ご家族は何名様ですか？また、ご出発地と予算はいかがでしょうか？',romaji:'Go-kazoku wa nanmei-sama desu ka? Mata, go-shuppatsu-chi to yosan wa ikaga deshou ka?',tl:'Keluarganya berapa orang? Juga, dari mana keberangkatannya dan bagaimana budgetnya?'},
      {speaker:'客',text:'大人2人、子供1人です。東京発で、3泊4日くらいで予算は1人5万円程度です。',romaji:'Otona futari, kodomo hitori desu. Toukyou hatsu de, mihaku yokka kurai de yosan wa hitori goman-en teido desu.',tl:'2 orang dewasa, 1 anak. Berangkat dari Tokyo, sekitar 3 malam 4 hari, budget sekitar 50.000 yen per orang.'},
      {speaker:'スタッフ',text:'それでしたら、こちらの札幌・富良野パックはいかがでしょう？ラベンダー畑見学と旭山動物園がセットになっております。',romaji:'Sore deshitara, kochira no Sapporo Furano pakku wa ikaga deshou? Rabenndaa hatake kengaku to Asahiyama doubutsuen ga setto ni natte orimasu.',tl:'Kalau begitu, bagaimana dengan paket Sapporo-Furano ini? Kunjungan kebun lavender dan kebun binatang Asahiyama sudah termasuk.'},
      {speaker:'客',text:'子供も喜びそうですね。キャンセル料はいつから発生しますか？',romaji:'Kodomo mo yorokobisou desu ne. Kyanseru ryou wa itsu kara hassei shimasu ka?',tl:'Anak saya pasti senang. Biaya pembatalan mulai kapan berlaku?'}
    ],
    tips:['ご出発地(ごしゅっぱつち) = kota/tempat keberangkatan','〜泊〜日(はく〜にち) = X malam Y hari','キャンセル料(りょう) = biaya pembatalan','パック = paket perjalanan','セットになっている = sudah termasuk/tersedia sebagai satu paket','発生する(はっせいする) = timbul/berlaku']
  },
  {
    title:'Perkenalan di Acara Networking',icon:'🤝',desc:'Self-introduction profesional dan tukar kartu nama — N3-N2',level:'N3',
    dialog:[
      {speaker:'田中',text:'初めまして。私、株式会社テクノ商事の田中と申します。',romaji:'Hajimemashite. Watashi, Kabushiki-gaisha Tekuno Shouji no Tanaka to moushimasu.',tl:'Salam kenal. Saya Tanaka dari PT Tekno Trading.'},
      {speaker:'Aさん',text:'初めまして。インドネシアのIT企業から参りました、アンドレと申します。名刺をどうぞ。',romaji:'Hajimemashite. Indonesia no IT kigyou kara mairimashita, Andore to moushimasu. Meishi wo douzo.',tl:'Salam kenal. Saya Andre dari perusahaan IT Indonesia. Ini kartu nama saya.'},
      {speaker:'田中',text:'ありがとうございます。頂戴いたします。インドネシアからいらっしゃったんですね。日本語がとてもお上手ですね。',romaji:'Arigatou gozaimasu. Choudai itashimasu. Indonesia kara irasshattan desu ne. Nihongo ga totemo o-jouzu desu ne.',tl:'Terima kasih. Saya terima dengan hormat. Oh dari Indonesia ya. Bahasa Jepangnya sangat bagus.'},
      {speaker:'Aさん',text:'ありがとうございます。まだまだ勉強中です。御社はどのような事業をされていますか？',romaji:'Arigatou gozaimasu. Madamada benkyou chuu desu. O-sha wa dono you na jigyou wo sarete imasu ka?',tl:'Terima kasih. Saya masih terus belajar. Perusahaan Anda bergerak di bidang apa?'},
      {speaker:'田中',text:'主にアジア向けのIT製品の輸出入を手がけております。御社とは何か連携できるかもしれませんね。'},
      {speaker:'田中',text:'主にアジア向けのIT製品の輸出入を手がけております。御社とは何か連携できるかもしれませんね。',romaji:'Omo ni Ajia muke no IT seihin no yushutsunyuu wo tegakete orimasu. O-sha to wa nanika renkei dekiru kamo shiremasen ne.',tl:'Kami terutama bergerak di ekspor-impor produk IT ke Asia. Mungkin ada kemungkinan kerjasama dengan perusahaan Anda.'}
    ],
    tips:['申す(もうす) = 謙譲語 untuk 言う/自己紹介','名刺(めいし) = kartu nama','頂戴いたします(ちょうだい〜) = menerima kartu nama dengan hormat','御社(おんしゃ) = 貴社=perusahaan Anda (dalam percakapan)', 'まだまだ = masih jauh dari sempurna (ungkapan rendah hati)','連携(れんけい) = kerjasama/kolaborasi']
  },
  {
    title:'Diskusi Film/Hiburan',icon:'🎬',desc:'Membicarakan film, anime, dan rekomendasi — N4',level:'N4',
    dialog:[
      {speaker:'Aさん',text:'最近、何か面白い映画やアニメ見た？',romaji:'Saikin, nani ka omoshiroi eiga ya anime mita?',tl:'Belakangan ini kamu nonton film atau anime yang bagus?'},
      {speaker:'Bさん',text:'うん、先週「君の名は。」を初めて見たんだけど、すごく感動した！もう泣いちゃったよ。',romaji:'Un, senshuu "Kimi no Na wa." wo hajimete mita n dakedo, sugoku kandou shita! Mou naichatta yo.',tl:'Iya, minggu lalu aku nonton "Your Name" untuk pertama kalinya, sangat mengharukan! Aku sampai nangis.'},
      {speaker:'Aさん',text:'えっ、まだ見てなかったの？あの映画、本当によかったよね。ストーリーが独特で、映像もきれいだし。',romaji:'E, mada mitenakatta no? Ano eiga, hontou ni yokatta yo ne. Sutoorii ga dokutoku de, eizou mo kirei da shi.',tl:'Eh, belum nonton? Film itu memang bagus banget. Ceritanya unik dan visualnya juga cantik.'},
      {speaker:'Bさん',text:'監督の新海誠の他の作品も見てみたくなった。何かおすすめある？',romaji:'Kantoku no Shinkai Makoto no hoka no sakuhin mo mite mitaku natta. Nani ka osusume aru?',tl:'Aku jadi pengen nonton karya sutradara Makoto Shinkai yang lain juga. Ada rekomendasi?'},
      {speaker:'Aさん',text:'「天気の子」も良かったよ。ただ、賛否両論あって、「君の名は。」とはまた違う雰囲気だけどね。',romaji:'Tenki no Ko mo yokatta yo. Tada, sanpi ryouron atte, "Kimi no Na wa." to wa mata chigau funiki dakedo ne.',tl:'天気の子 juga bagus. Tapi ada yang suka ada yang tidak, nuansanya sedikit berbeda dari 君の名は.'}
    ],
    tips:['感動する(かんどうする) = sangat tersentuh/terharu','泣く(なく) = menangis → 泣いちゃった = sampai nangis (不注意な感情)','独特(どくとく) = unik/khas','映像(えいぞう) = visual/gambar','賛否両論(さんぴりょうろん) = ada yang setuju ada yang tidak / kontroversial','〜てみたくなった = jadi ingin mencoba ~']
  },
  {
    title:'Masalah Transportasi',icon:'🚃',desc:'Menangani keterlambatan, kereta terlewat, dan perubahan rute — N4-N3',level:'N4',
    dialog:[
      {speaker:'客',text:'すみません、乗り換え案内で調べたら、この電車に乗れば渋谷に行けると思ったんですが…',romaji:'Sumimasen, norikae annai de shirabetara, kono densha ni noreba Shibuya ni ikeru to omotta n desu ga...',tl:'Permisi, waktu saya cek petunjuk transfer, saya pikir bisa ke Shibuya naik kereta ini...'},
      {speaker:'駅員',text:'この電車は急行ですので、渋谷には止まりません。次の各駅停車でお乗り換えください。',romaji:'Kono densha wa kyuukou desu node, Shibuya ni wa tomarimasen. Tsugi no kakueki-teisha de o-nori-kae kudasai.',tl:'Kereta ini adalah kereta ekspres, jadi tidak berhenti di Shibuya. Mohon pindah ke kereta lokal berikutnya.'},
      {speaker:'客',text:'そうですか。あの、実は大事な会議に遅刻しそうで…次の各駅停車は何分後ですか？',romaji:'Sou desu ka. Ano, jitsu wa daiji na kaigi ni chikoku-sou de... Tsugi no kakueki-teisha wa nanpun-go desu ka?',tl:'Begitu ya. Sebenarnya saya hampir terlambat ke rapat penting... Kereta lokal berikutnya berapa menit lagi?'},
      {speaker:'駅員',text:'4分後に参ります。それから渋谷まで約12分です。もし急ぐなら、タクシーの方が確実かもしれません。',romaji:'Yonpun-go ni mairimasu. Sorekara Shibuya made yaku juunifun desu. Moshi isogu nara, takushii no hou ga kakujitsu kamo shiremasen.',tl:'Akan datang 4 menit lagi. Kemudian sekitar 12 menit ke Shibuya. Kalau sedang terburu-buru, mungkin taksi lebih pasti.'},
      {speaker:'客',text:'分かりました。遅延証明書は発行していただけますか？会社に説明する必要があるので。',romaji:'Wakarimashita. Chien shomeisho wa hakkou shite itadakemasu ka? Kaisha ni setsumei suru hitsuyou ga aru no de.',tl:'Mengerti. Apakah bisa dikeluarkan surat keterangan keterlambatan? Saya perlu menjelaskan ke kantor.'}
    ],
    tips:['急行(きゅうこう) = kereta ekspres (tidak berhenti di semua stasiun)','各駅停車(かくえきていしゃ) = kereta lokal (berhenti di semua stasiun)','乗り換え(のりかえ) = transfer/ganti kereta','遅延証明書(ちえんしょうめいしょ) = surat keterangan keterlambatan kereta','〜そう = kelihatannya akan ~/hampir ~','確実(かくじつ) = pasti/dapat dipercaya']
  },
  {
    title:'Perkenalan Diri di Lingkungan Baru',icon:'🌸',desc:'Masuk kerja baru, perkenalan rekan tim — N4-N3',level:'N4',
    dialog:[
      {speaker:'先輩',text:'今日から配属される新入社員の方ですね。ようこそ！私は営業部の鈴木です。よろしくお願いします。',romaji:'Kyou kara haizoku sareru shinnyuu-shain no kata desu ne. Youkoso! Watashi wa eigyoubu no Suzuki desu. Yoroshiku onegaishimasu.',tl:'Anda karyawan baru yang mulai hari ini ya. Selamat datang! Saya Suzuki dari bagian penjualan. Mohon bantuannya.'},
      {speaker:'新入社員',text:'はじめまして。アンドレと申します。インドネシア出身で、東京大学を卒業しました。どうぞよろしくお願いいたします。',romaji:'Hajimemashite. Andore to moushimasu. Indonesia shusshin de, Toukyou daigaku wo sotsugyou shimashita. Douzo yoroshiku onegai itashimasu.',tl:'Perkenalan. Nama saya Andre. Saya berasal dari Indonesia dan lulus dari Universitas Tokyo. Mohon bimbingannya.'},
      {speaker:'先輩',text:'すごい！日本語もお上手ですね。今日は午後から部のミーティングがありますので、ぜひ参加してください。',romaji:'Sugoi! Nihongo mo o-jouzu desu ne. Kyou wa gogo kara bu no miitingu ga arimasu no de, zehi sanka shite kudasai.',tl:'Hebat! Bahasa Jepangnya juga bagus. Hari ini ada meeting departemen dari siang, silakan ikut.'},
      {speaker:'新入社員',text:'ありがとうございます。ところで、服装について何か規定はありますか？',romaji:'Arigatou gozaimasu. Tokoro de, fukusou ni tsuite nani ka kitei wa arimasu ka?',tl:'Terima kasih. Ngomong-ngomong, apakah ada ketentuan tentang cara berpakaian?'},
      {speaker:'先輩',text:'基本的にはスーツですが、金曜日はカジュアルフライデーで私服でも構いません。',romaji:'Kihonteki ni wa suutsu desu ga, kin\'youbi wa kajuaru furaidee de shihuku demo kamaimasen.',tl:'Pada dasarnya pakai setelan, tapi hari Jumat adalah Casual Friday, pakaian kasual pun tidak apa-apa.'}
    ],
    tips:['新入社員(しんにゅうしゃいん) = karyawan baru','配属(はいぞく) = penempatan/penugasan','出身(しゅっしん) = asal/berasal dari','服装規定(ふくそうきてい) = ketentuan berpakaian','カジュアルフライデー = Casual Friday','基本的に(きほんてきに) = pada dasarnya/secara umum']
  },
  {
    title:'Diskusi Masalah di Tempat Kerja',icon:'🔧',desc:'Membahas masalah proyek dan solusi bersama tim — N3-N2',level:'N3',
    dialog:[
      {speaker:'上司',text:'先週の報告書によると、プロジェクトの進捗が予定より2週間遅れているようですが、原因は何ですか？',romaji:'Senshuu no houkokusho ni yoru to, purojekuto no shinchou ga yotei yori nishukan okurete iru you desu ga, genin wa nan desu ka?',tl:'Menurut laporan minggu lalu, kemajuan proyek tampaknya terlambat 2 minggu dari rencana, apa penyebabnya?'},
      {speaker:'担当者',text:'申し訳ございません。仕様変更が重なり、エンジニアの工数が不足しております。現在、残業と外注で対応しておりますが、品質を保つのが難しい状況です。',romaji:'Moushiwake gozaimasen. Shiyou henkou ga kasanari, enjinia no kousuu ga fusoku shite orimasu. Genzai, zangyou to gaichu de taiou shite orimasu ga, hinshitsu wo tamotsu no ga muzukashii joukyou desu.',tl:'Mohon maaf. Ada beberapa perubahan spesifikasi, sehingga jam kerja engineer tidak cukup. Saat ini kami tangani dengan lembur dan outsourcing, tapi situasinya sulit untuk menjaga kualitas.'},
      {speaker:'上司',text:'分かりました。では、優先順位を見直して、まず核心機能に集中しましょう。追加機能は次フェーズに回してください。',romaji:'Wakarimashita. Dewa, yuusen jyunni wo minaosite, mazu kakkushin kinou ni shuuchuu shimashou. Tsuika kinou wa tsugi feezu ni mawashite kudasai.',tl:'Mengerti. Kalau begitu, mari tinjau ulang prioritas dan fokus dulu ke fitur inti. Fitur tambahan dipindah ke fase berikutnya.'},
      {speaker:'担当者',text:'承知しました。一点確認させていただきたいのですが、クライアントへの説明はどのようにいたしますか？',romaji:'Shouchi shimashita. Itten kakunin sasete itadakitai no desu ga, kuraianto e no setsumei wa dono you ni itashimasu ka?',tl:'Baik, saya mengerti. Satu hal yang ingin saya konfirmasi, bagaimana cara menjelaskan ke klien?'},
      {speaker:'上司',text:'私から直接クライアントに連絡します。あなたは対応策をまとめた資料を今週中に作成してください。',romaji:'Watashi kara chokusetsu kuraianto ni renraku shimasu. Anata wa taiousaku wo matometa shiryou wo konshuu chuu ni sakusei shite kudasai.',tl:'Saya akan menghubungi klien secara langsung. Kamu buat dokumen yang merangkum solusi penanganan sebelum akhir minggu ini.'}
    ],
    tips:['進捗(しんちょく) = kemajuan/progress','仕様変更(しようへんこう) = perubahan spesifikasi','工数(こうすう) = man-hour/jam kerja','外注(がいちゅう) = outsourcing','優先順位(ゆうせんじゅんい) = prioritas','対応策(たいおうさく) = langkah penanganan/solusi']
  },
  {
    title:'Obrolan Santai di Kedai Kopi',icon:'☕',desc:'Ngobrol dengan teman tentang hobi dan kehidupan sehari-hari — N4',level:'N4',
    dialog:[
      {speaker:'Aさん',text:'最近、新しい趣味が見つかってさ。写真を撮り始めたんだよね。',romaji:'Saikin, atarashii shumi ga mitsukatte sa. Shashin wo tori hajimeta n da yo ne.',tl:'Belakangan ini aku menemukan hobi baru. Aku mulai memotret.'},
      {speaker:'Bさん',text:'え、いいじゃん！どんな写真を撮るの？風景？',romaji:'E, ii jan! Donna shashin wo toru no? Fuukei?',tl:'Eh, bagus dong! Foto apa yang dipotret? Pemandangan?'},
      {speaker:'Aさん',text:'主に街のスナップ写真だね。古い建物とか、市場とか。なんか独特の雰囲気があって好きなんだよね。',romaji:'Omo ni machi no sunappu shashin da ne. Furui tatemono to ka, ichiba to ka. Nanka dokutoku no funiki ga atte suki nan da yo ne.',tl:'Terutama foto snapshoot kota. Gedung tua, pasar, dan semacamnya. Entah kenapa ada nuansa unik yang aku suka.'},
      {speaker:'Bさん',text:'素敵！カメラは一眼レフ？',romaji:'Suteki! Kamera wa ichigan-refu?',tl:'Keren! Kameranya DSLR?'},
      {speaker:'Aさん',text:'最初はスマホで撮ってたけど、最近ミラーレスを買ったんだ。ちょっと高かったけど、写真の質が全然違う。',romaji:'Saisho wa sumaho de totteta kedo, saikin miraaresu wo katta n da. Chotto takakatta kedo, shashin no shitsu ga zenzen chigau.',tl:'Awalnya pakai HP, tapi belakangan beli kamera mirrorless. Agak mahal sih, tapi kualitas fotonya beda banget.'},
      {speaker:'Bさん',text:'じゃあ今度一緒に撮りに行こうよ！私もやってみたいと思ってたんだよね。',romaji:'Jaa kondo issho ni tori ni ikou yo! Watashi mo yatte mitai to omottetan da yo ne.',tl:'Kalau begitu next time ayo pergi motret bareng! Aku juga sudah lama pengen nyoba.'}
    ],
    tips:['趣味(しゅみ) = hobi','スナップ写真(しゃしん) = foto candid/snapshoot','一眼レフ(いちがんれふ) = kamera DSLR','ミラーレス = kamera mirrorless','雰囲気(ふんいき) = suasana/atmosfer','全然違う(ぜんぜんちがう) = beda banget (positif)']
  },
  {
    title:'Reservasi Restoran',icon:'🍽️',desc:'Membuat reservasi dan memesan menu di restoran — N4',level:'N4',
    dialog:[
      {speaker:'客',text:'もしもし、予約をしたいんですが。',romaji:'Moshimoshi, yoyaku wo shitain desu ga.',tl:'Halo, saya ingin membuat reservasi.'},
      {speaker:'スタッフ',text:'はい、ありがとうございます。何名様でいつをご希望ですか？',romaji:'Hai, arigatou gozaimasu. Nanmei-sama de itsu wo go-kibou desu ka?',tl:'Ya, terima kasih. Untuk berapa orang dan kapan?'},
      {speaker:'客',text:'今週の土曜日、夜7時に4人でお願いしたいんですが、窓際の席は空いていますか？',romaji:'Konshuu no doyoubi, yoru shichiji ni yonin de onegaishitain desu ga, madogiwa no seki wa aite imasu ka?',tl:'Sabtu minggu ini, jam 7 malam untuk 4 orang. Apakah ada kursi di dekat jendela?'},
      {speaker:'スタッフ',text:'少々お待ちください。確認いたします。……はい、窓側のテーブルにご案内できます。お名前とご連絡先をお願いします。',romaji:'Shoushou o-machi kudasai. Kakunin itashimasu. ... Hai, madogawa no teeble ni go-annai dekimasu. O-namae to go-renraku-saki wo onegaishimasu.',tl:'Mohon tunggu sebentar. Saya cek dulu. ... Ya, bisa kami arahkan ke meja di sisi jendela. Boleh nama dan nomor kontaknya?'},
      {speaker:'客',text:'田中です。090-1234-5678です。アレルギーがある人がいるんですが、ピーナッツと卵を使わないメニューはありますか？',romaji:'Tanaka desu. Zero-kyuu-zero-ichi-ni-san-yon-go-roku-nana-hachi desu. Arerugii ga aru hito ga iru n desu ga, piinattsu to tamago wo tsukawanai menyuu wa arimasu ka?',tl:'Tanaka. 090-1234-5678. Ada yang alergi di kelompok kami, apakah ada menu yang tidak menggunakan kacang dan telur?'},
      {speaker:'スタッフ',text:'アレルギー対応メニューもございます。当日、担当スタッフにお申し付けください。お待ちしております。',romaji:'Arerugii taiou menyuu mo gozaimasu. Tounichi, tantou sutaffu ni o-moshi-tsuke kudasai. O-machi shite orimasu.',tl:'Kami juga punya menu untuk alergi. Mohon sampaikan kepada staf yang bertugas saat hari H. Kami tunggu kedatangan Anda.'}
    ],
    tips:['窓際(まどぎわ) = dekat jendela','連絡先(れんらくさき) = informasi kontak','アレルギー対応(たいおう) = penanganan alergi','少々(しょうしょう)お待ちください = mohon tunggu sebentar (formal)','担当スタッフ(たんとう) = staf yang bertugas','お申し付けください(もうしつけ) = mohon sampaikan kepada kami']
  },
  {
    title:'Mengurus Visa',icon:'📋',desc:'Konsultasi dan pengurusan visa di kedutaan — N3-N2',level:'N3',
    dialog:[
      {speaker:'申請者',text:'ビザの申請について相談したいのですが、学生ビザと就労ビザではどちらが私に合っていますか？',romaji:'Biza no shinsei ni tsuite soudan shitain desu ga, gakusei biza to shuurou biza dewa dochira ga watashi ni atte imasu ka?',tl:'Saya ingin konsultasi tentang pengajuan visa. Antara visa pelajar dan visa kerja, mana yang lebih cocok untuk saya?'},
      {speaker:'担当者',text:'目的によって異なります。日本の大学に入学する場合は学生ビザ、日本企業に就職する場合は就労ビザになります。現在の状況をお聞かせいただけますか？',romaji:'Mokuteki ni yotte kotonari masu. Nihon no daigaku ni nyuugaku suru baai wa gakusei biza, nihon kigyou ni shuushoku suru baai wa shuurou biza ni narimasu. Genzai no joukyou wo o-kikase itadakemasu ka?',tl:'Tergantung tujuannya. Kalau masuk universitas Jepang, visa pelajar. Kalau bekerja di perusahaan Jepang, visa kerja. Boleh ceritakan situasi Anda saat ini?'},
      {speaker:'申請者',text:'来年4月から東京の大学院に入学することが決まっています。入学許可書はすでに手元にあります。',romaji:'Rainen shigatsu kara Tokyo no daigakuin ni nyuugaku suru koto ga kimatte imasu. Nyuugaku kyouka-sho wa sude ni temoto ni arimasu.',tl:'Sudah dipastikan saya masuk pascasarjana di Tokyo mulai April tahun depan. Surat penerimaan sudah ada di tangan saya.'},
      {speaker:'担当者',text:'では学生ビザで間違いありません。必要書類はパスポート、証明写真、入学許可書、在学証明書の翻訳、財政証明書です。',romaji:'Dewa gakusei biza de machigai arimasen. Hitsuyou shorui wa pasupoto, shomeishashin, nyuugaku kyoukasho, zaigaku shomeisho no honyaku, zaisei shomeisho desu.',tl:'Kalau begitu visa pelajar sudah tepat. Dokumen yang diperlukan: paspor, foto, surat penerimaan, terjemahan surat status mahasiswa, dan bukti kecukupan finansial.'},
      {speaker:'申請者',text:'財政証明書はどのくらいの残高が必要ですか？また、申請から取得までどのくらいかかりますか？',romaji:'Zaisei shomeisho wa dono kurai no zandaka ga hitsuyou desu ka? Mata, shinsei kara shutoku made dono kurai kakarimasu ka?',tl:'Berapa saldo yang diperlukan untuk bukti finansial? Dan berapa lama dari pengajuan sampai visa diterima?'}
    ],
    tips:['申請(しんせい) = pengajuan/aplikasi','入学許可書(にゅうがくきょかしょ) = surat penerimaan masuk','財政証明書(ざいせいしょうめいしょ) = bukti kecukupan finansial','就労ビザ(しゅうろう) = visa kerja','取得(しゅとく) = mendapatkan/memperoleh','翻訳(ほんやく) = terjemahan']
  },
  {
    title:'Belanja Online & Pengiriman',icon:'📦',desc:'Memesan produk online, tracking, dan penanganan masalah — N4-N3',level:'N4',
    dialog:[
      {speaker:'客',text:'先週注文した商品がまだ届いていないんですが、確認していただけますか？注文番号は12345です。',romaji:'Senshuu chuumon shita shouhin ga mada todoite inaindesa ga, kakunin shite itadakemasu ka? Chuumon bangou wa ichi-ni-san-yon-go desu.',tl:'Produk yang saya pesan minggu lalu belum sampai, bisakah dicek? Nomor pesanan saya 12345.'},
      {speaker:'担当者',text:'ただいまお調べします。……配送状況を確認しましたところ、配送センターで一時的に遅延が生じているとのことです。大変申し訳ございません。',romaji:'Tadaima o-shirabe shimasu. ... Haisou joukyou wo kakunin shimashita tokoro, haisou sentaa de ichijiteki ni chien ga shoujite iru to no koto desu. Taihen moushiwake gozaimasen.',tl:'Saya cek sekarang. ... Setelah saya cek status pengiriman, terjadi keterlambatan sementara di pusat distribusi. Kami sangat mohon maaf.'},
      {speaker:'客',text:'いつ届きますか？明後日に急ぎで必要なんですが。',romaji:'Itsu todokimasu ka? Asatte ni isogi de hitsuyou nan desu ga.',tl:'Kapan sampainya? Saya butuhkan mendesak lusa.'},
      {speaker:'担当者',text:'明日中にはお届けできるよう手配いたします。万が一間に合わない場合は、速達での再配送か返金対応をさせていただきます。',romaji:'Ashita-juu ni wa o-todoke dekiru you tearai itashimasu. Mangaichi ma ni awanai baai wa, sokutatsu de no saihaison ka henkin taiou wo sasete itadakimasu.',tl:'Akan kami atur agar bisa sampai besok. Kalau tidak sempat, kami akan kirim ulang dengan pengiriman ekspres atau berikan pengembalian dana.'},
      {speaker:'客',text:'分かりました。もし明日の夜までに届かなければ、返金をお願いします。',romaji:'Wakarimashita. Moshi ashita no yoru made ni todokanakereba, henkin wo onegaishimasu.',tl:'Mengerti. Kalau belum sampai besok malam, mohon dikembalikan dananya.'}
    ],
    tips:['配送状況(はいそうじょうきょう) = status pengiriman','遅延(ちえん) = keterlambatan','万が一(まんがいち) = kalau seandainya / dalam kasus terburuk','速達(そくたつ) = pengiriman ekspres','返金(へんきん) = pengembalian dana','手配する(てはい) = mengatur/mempersiapkan']
  },
  {
    title:'Di Pemandian Umum (銭湯)',icon:'♨️',desc:'Pengalaman pertama ke sento (pemandian umum Jepang) — N4-N3',level:'N4',
    dialog:[
      {speaker:'客',text:'すみません、銭湯に初めて来たんですが、使い方を教えていただけますか？',romaji:'Sumimasen, sentou ni hajimete kita n desu ga, tsukaikata wo oshiete itadakemasu ka?',tl:'Permisi, ini pertama kali saya ke sento, bisakah Anda jelaskan cara pakainya?'},
      {speaker:'番台',text:'もちろんです！まず入浴料を払って、男湯か女湯に入ります。脱衣所で服を脱いで、ロッカーに入れてください。',romaji:'Mochiron desu! Mazu nyuuyokuryou wo haratte, otokoyu ka onnayu ni hairimasu. Datsuijo de fuku wo nuide, rokkaa ni irete kudasai.',tl:'Tentu! Pertama bayar biaya mandi, lalu masuk ke bagian pria atau wanita. Di ruang ganti, lepas pakaian dan masukkan ke loker.'},
      {speaker:'客',text:'洗い場はどこですか？また、タトゥーがあるんですが、入れますか？',romaji:'Araiba wa doko desu ka? Mata, tattoo ga aru n desu ga, hairemasu ka?',tl:'Di mana tempat mandi bilas? Dan saya punya tato, boleh masuk?'},
      {speaker:'番台',text:'洗い場は浴槽の手前にございます。お湯と水を使って体を洗ってから浴槽に入ってください。タトゥーについては、当施設では申し訳ありませんがお断りしております。',romaji:'Araiba wa yokusou no temae ni gozaimasu. O-yu to mizu wo tsukatte karada wo aratte kara yokusou ni haitte kudasai. Tattoo ni tsuite wa, tou-shisetsu dewa moushiwake arimasen ga o-kotowari shite orimasu.',tl:'Tempat bilas ada sebelum kolam rendam. Silakan cuci badan dulu dengan air panas dan air sebelum masuk kolam. Mengenai tato, mohon maaf di fasilitas kami tidak diperbolehkan.'},
      {speaker:'客',text:'分かりました。最後に確認ですが、シャンプーや石鹸は置いてありますか？',romaji:'Wakarimashita. Saigo ni kakunin desu ga, shanpuu ya sekken wa oite arimasu ka?',tl:'Mengerti. Terakhir, satu hal yang perlu dikonfirmasi, apakah tersedia sampo dan sabun?'}
    ],
    tips:['銭湯(せんとう) = pemandian umum berbayar','入浴料(にゅうよくりょう) = biaya masuk pemandian','脱衣所(だつい) = ruang ganti pakaian','洗い場(あらいば) = area mandi bilas','浴槽(よくそう) = kolam rendam besar','タトゥー = tato (sering dilarang di pemandian Jepang)']
  },
  {
    title:'Membeli Tiket Konser',icon:'🎵',desc:'Antrian tiket, pembelian, dan aturan konser Jepang — N4',level:'N4',
    dialog:[
      {speaker:'Aさん',text:'来月の山田太郎のコンサート、チケットが取れた！一緒に行かない？',romaji:'Raigetsu no Yamada Tarou no konsaato, chiketto ga toreta! Issho ni ikanai?',tl:'Tiket konser Yamada Taro bulan depan berhasil dapat! Mau pergi bareng?'},
      {speaker:'Bさん',text:'本当に？すごい！どうやってチケットを取ったの？ファンクラブ？',romaji:'Hontou ni? Sugoi! Douyatte chiketto wo totta no? Fankurabu?',tl:'Benaran? Keren! Gimana caramu dapat tiketnya? Fanclub?'},
      {speaker:'Aさん',text:'ファンクラブの先行予約で取れたんだよ。一般発売は即完売だったみたいだし、本当にラッキーだった。',romaji:'Fankurabu no senkou yoyaku de toreta n da yo. Ippan hatsubai wa soku kanbaifuru datta mitai da shi, hontou ni rakkii datta.',tl:'Berhasil dapat lewat pre-sale fanclub. Kalau penjualan umum kayaknya langsung habis, jadi benar-benar beruntung.'},
      {speaker:'Bさん',text:'ありがとう！当日は何か持っていくものある？カメラとか持って行っていい？',romaji:'Arigatou! Tounichi wa nani ka motte iku mono aru? Kamera to ka motte itte ii?',tl:'Terima kasih! Di hari H, ada sesuatu yang perlu dibawa? Boleh bawa kamera?'},
      {speaker:'Aさん',text:'カメラは基本的にNG。ライブ会場では撮影禁止が多いよ。スマホも公演中は使えないことが多いから、ルールを確認してみてね。',romaji:'Kamera wa kihonteki ni NG. Raibu kaijou dewa satsuei kinshi ga ooi yo. Sumaho mo kouen-chuu wa tsukaenai koto ga ooi kara, ruuru wo kakunin shite mite ne.',tl:'Kamera pada dasarnya tidak boleh. Di venue konser banyak yang melarang fotografi. HP juga sering tidak bisa dipakai saat pertunjukan, coba cek peraturannya ya.'}
    ],
    tips:['先行予約(せんこうよよく) = pre-sale/pembelian tiket awal','一般発売(いっぱんはつばい) = penjualan umum','即完売(そくかんばい) = langsung habis terjual','撮影禁止(さつえいきんし) = dilarang memotret','ライブ会場(かいじょう) = venue konser','公演中(こうえんちゅう) = selama pertunjukan berlangsung']
  },
  {
    title:'Di Gym / Pusat Kebugaran',icon:'💪',desc:'Daftar member, tanya program latihan, dan etika gym Jepang — N4-N3',level:'N4',
    dialog:[
      {speaker:'客',text:'こちらのジムに入会したいのですが、プランについて教えていただけますか？',romaji:'Kochira no jimu ni nyuukai shitain desu ga, puran ni tsuite oshiete itadakemasu ka?',tl:'Saya ingin bergabung dengan gym ini, bisakah dijelaskan tentang paket yang tersedia?'},
      {speaker:'スタッフ',text:'ありがとうございます。基本プランは月額6,600円で、使い放題です。プレミアムは9,900円でパーソナルトレーニングが月2回付きます。',romaji:'Arigatou gozaimasu. Kihon puran wa getsugaku rokusen roppyaku-en de, tsukaihoudai desu. Puremiamu wa kyuusen kyuuhyaku-en de paasonaru toreening ga tsuki nikai tsuki masu.',tl:'Terima kasih. Paket dasar 6.600 yen per bulan dengan akses tak terbatas. Paket premium 9.900 yen termasuk 2x sesi personal training per bulan.'},
      {speaker:'客',text:'トレーニングの経験はほぼないのですが、初心者向けのプログラムはありますか？',romaji:'Toreening no keiken wa hobo nai no desu ga, shoshinsha muke no puroguramu wa arimasu ka?',tl:'Saya hampir tidak ada pengalaman latihan, apakah ada program untuk pemula?'},
      {speaker:'スタッフ',text:'はい、初回は無料で体力測定とトレーニング説明を行っています。また、毎週水曜日に初心者向けグループレッスンも開催しています。',romaji:'Hai, shokai wa muryo de tairyoku sokutei to toreeningu setsumei wo okonatte imasu. Mata, maishuu suiyoubi ni shoshinsha muke guruupu ressun mo kaisai shite imasu.',tl:'Ya, pertama kali ada pengukuran kebugaran dan penjelasan latihan gratis. Selain itu, setiap Rabu ada kelas grup untuk pemula.'},
      {speaker:'客',text:'ロッカーや駐車場はありますか？また、見学はできますか？',romaji:'Rokkaa ya chuushajou wa arimasu ka? Mata, kengaku wa dekimasu ka?',tl:'Apakah ada loker dan tempat parkir? Dan apakah bisa tour/kunjungan?'}
    ],
    tips:['入会(にゅうかい) = mendaftar menjadi anggota','月額(げつがく) = biaya bulanan','使い放題(つかいほうだい) = akses tak terbatas / unlimited','体力測定(たいりょくそくてい) = pengukuran kebugaran fisik','初心者向け(しょしんしゃむけ) = untuk pemula','見学(けんがく) = kunjungan/tour']
  },
  {
    title:'Di Konbini (Convenience Store)',icon:'🏪',desc:'Transaksi di konbini — bayar tagihan, print, microwave — N4-N5',level:'N4',
    dialog:[
      {speaker:'店員',text:'いらっしゃいませ！',romaji:'Irasshaimase!',tl:'Selamat datang!'},
      {speaker:'客',text:'すみません、この荷物を送りたいのですが、ヤマト運輸の伝票はありますか？',romaji:'Sumimasen, kono nimotsu wo okuritain desu ga, Yamato Unyu no denbyou wa arimasu ka?',tl:'Permisi, saya ingin mengirimkan paket ini, apakah ada formulir pengiriman Yamato?'},
      {speaker:'店員',text:'はい、こちらにございます。サイズはどちらになりますか？',romaji:'Hai, kochira ni gozaimasu. Saizu wa dochira ni narimasu ka?',tl:'Ya, ada di sini. Ukurannya yang mana?'},
      {speaker:'客',text:'それと、電気代の支払いもできますか？このはがきを持っているんですが。',romaji:'Sorete, denki-dai no shiharai mo dekimasu ka? Kono hagaki wo motte iru n desu ga.',tl:'Selain itu, bisa juga bayar tagihan listrik? Saya punya kartu tagihan ini.'},
      {speaker:'店員',text:'はい、バーコードを読み取ります。金額は3,240円になります。現金のみとなりますがよろしいでしょうか？',romaji:'Hai, baakoodo wo yomitorimasu. Kingaku wa sanzen nihyaku yonjuu-en ni narimasu. Genkin nomi to nari masu ga yoroshii deshou ka?',tl:'Ya, kami scan barcodenya. Jumlahnya 3.240 yen. Hanya bisa tunai, apakah tidak apa-apa?'},
      {speaker:'客',text:'あ、カードは使えないんですね。現金で大丈夫です。あと、レンジも使っていいですか？',romaji:'A, kaado wa tsukaenain desu ne. Genkin de daijoubu desu. Ato, renji mo tsukatte ii desu ka?',tl:'Oh, kartu tidak bisa ya. Tunai tidak apa-apa. Boleh juga pakai microwave?'}
    ],
    tips:['いらっしゃいませ = selamat datang (kata sambutan di toko)','荷物(にもつ) = barang/paket','伝票(でんびょう) = formulir pengiriman','電気代(でんきだい) = tagihan listrik','バーコード = barcode','現金のみ(げんきんのみ) = hanya tunai','レンジ = microwave (di konbini untuk memanaskan makanan)']
  },
  {
    title:'Kunjungan ke Rumah Teman',icon:'🏠',desc:'Bertamu ke rumah teman Jepang dan etika berkunjung — N4',level:'N4',
    dialog:[
      {speaker:'訪問者',text:'こんにちは！お邪魔します。',romaji:'Konnichiwa! O-jama shimasu.',tl:'Halo! Permisi, saya masuk ya. (お邪魔します = ungkapan saat masuk rumah orang)'},
      {speaker:'主人',text:'よく来たね！どうぞ上がって。これ、つまらないものですが。',romaji:'Yoku kita ne! Douzo agatte. Kore, tsumaranai mono desu ga.',tl:'Senang kamu datang! Silakan masuk. Ini, hadiah kecil untukmu (お土産/oleh-oleh).'},
      {speaker:'訪問者',text:'あ、わざわざありがとうございます。これ、インドネシアのお菓子です。よかったら食べてみてください。',romaji:'A, wazawaza arigatou gozaimasu. Kore, Indonesia no o-kashi desu. Yokattara tabete mite kudasai.',tl:'Oh, terima kasih sudah repot. Ini kue khas Indonesia. Kalau mau, silakan coba.'},
      {speaker:'主人',text:'わあ、ありがとう！お茶でもどう？それとも、コーヒーの方がいい？',romaji:'Waa, arigatou! O-cha demo dou? Soretomo, koohii no hou ga ii?',tl:'Wah, terima kasih! Mau minum teh? Atau lebih suka kopi?'},
      {speaker:'訪問者',text:'お構いなく。でも、もし手間でなければお茶をいただけると嬉しいです。',romaji:'O-kamai naku. Demo, moshi tema de nakereba o-cha wo itadakeru to ureshii desu.',tl:'Jangan repot-repot. Tapi kalau tidak merepotkan, saya senang kalau ada teh.'},
      {speaker:'主人',text:'全然！ちょっと待ってね。先にリビングに座っていて。',romaji:'Zenzen! Chotto matte ne. Saki ni ribingu ni suwatte ite.',tl:'Sama sekali tidak repot! Tunggu sebentar ya. Silakan duduk dulu di ruang tamu.'}
    ],
    tips:['お邪魔します(おじゃまします) = permisi masuk (saat masuk rumah orang lain)','上がる(あがる) = naik/masuk ke dalam (dari teras/genkan)','つまらないものですが = ini hanya hadiah kecil (ungkapan rendah hati saat memberi)','わざわざ = dengan susah payah / repot-repot','お構いなく(おかまいなく) = jangan repot-repot / tidak perlu','お土産(おみやげ) = oleh-oleh']
  },
  {
    title:'Beli Obat di Apotek',icon:'💊',desc:'Tanya obat, jelaskan gejala ke apoteker — N4-N3',level:'N4',
    dialog:[
      {speaker:'客',text:'すみません、頭痛薬を探しているんですが、何かおすすめはありますか？',romaji:'Sumimasen, zutsuu-yaku wo sagashite iru n desu ga, nani ka osusume wa arimasu ka?',tl:'Permisi, saya sedang mencari obat sakit kepala, ada yang bisa direkomendasikan?'},
      {speaker:'薬剤師',text:'はい。どのような頭痛ですか？ズキズキする感じですか、それとも頭全体が重い感じですか？',romaji:'Hai. Dono you na zutsuu desu ka? Zukizuki suru kanji desu ka, soretomo atama zentai ga omoi kanji desu ka?',tl:'Ya. Sakit kepala seperti apa? Terasa berdenyut-denyut, atau terasa berat di seluruh kepala?'},
      {speaker:'客',text:'右側がズキズキ痛んで、光が眩しく感じます。もしかしたら偏頭痛かもしれないと思っているんですが。',romaji:'Migigawa ga zukizuki itande, hikari ga mabushiku kanji masu. Moshikashitara henzutsuu kamo shirenai to omotteiru n desu ga.',tl:'Sisi kanan berdenyut-denyut sakit dan terasa silau dengan cahaya. Saya pikir mungkin migrain.'},
      {speaker:'薬剤師',text:'症状からすると偏頭痛の可能性がありますね。市販の鎮痛剤として「ロキソニンS」や「イブプロフェン」が効果的ですが、頻繁に起こるようでしたら医師の診察をお勧めします。',romaji:'Shoujou kara suru to henzutsuu no kanousei ga arimasu ne. Shihan no chintsuuzai toshite Roxonin-S ya ibuprofen ga koukateki desu ga, hinpan ni okoru you deshitara isha no shinsatsu wo osusume shimasu.',tl:'Dari gejalanya ada kemungkinan migrain ya. Sebagai pereda nyeri yang dijual bebas, Loxonin-S atau ibuprofen efektif, tapi kalau sering terjadi sebaiknya periksa ke dokter.'},
      {speaker:'客',text:'ありがとうございます。空腹時には飲まない方がいいですよね？食事と一緒に飲んだ方がいいですか？',romaji:'Arigatou gozaimasu. Kuufuku-ji ni wa nomanai hou ga ii desu yo ne? Shokuji to issho ni nonda hou ga ii desu ka?',tl:'Terima kasih. Sebaiknya tidak diminum saat perut kosong kan? Lebih baik diminum bersamaan dengan makan?'}
    ],
    tips:['ズキズキ = berdenyut-denyut (onomatope sakit yang pulsatif)','眩しい(まぶしい) = silau','偏頭痛(へんずつう) = migrain','鎮痛剤(ちんつうざい) = obat pereda nyeri','市販(しはん) = dijual bebas (tanpa resep)','空腹時(くうふくじ) = saat perut kosong']
  },
  {
    title:'Meminta Bantuan di Toko',icon:'🛍️',desc:'Tanya stok, minta ukuran, dan coba produk di toko — N4',level:'N4',
    dialog:[
      {speaker:'客',text:'すみません、このシャツの S サイズはありますか？ここには M サイズしかないんですが。',romaji:'Sumimasen, kono shatsu no S saizu wa arimasu ka? Koko ni wa M saizu shika nain desu ga.',tl:'Permisi, apakah ada baju ini ukuran S? Di sini hanya ada ukuran M.'},
      {speaker:'店員',text:'少々お待ちください。確認してまいります。……在庫を確認しましたが、S サイズは現在切れておりまして、来週入荷予定となっております。',romaji:'Shoushou o-machi kudasai. Kakunin shite mairimasu. ... Zaiko wo kakunin shimashita ga, S saizu wa genzai kirete orimashite, raishuu nyuuka yotei to natte orimasu.',tl:'Mohon tunggu sebentar. Saya cek dulu. ... Saya sudah cek stok, ukuran S saat ini habis dan direncanakan masuk lagi minggu depan.'},
      {speaker:'客',text:'そうですか。入荷したら連絡してもらえますか？名前と電話番号を教えればいいですか？',romaji:'Sou desu ka. Nyuuka shitara renraku shite moraemasu ka? Namae to denwa bangou wo oshiereba ii desu ka?',tl:'Begitu ya. Kalau sudah masuk bisa dihubungi saya? Apakah cukup kasih nama dan nomor telepon?'},
      {speaker:'店員',text:'はい、お取り置きも可能です。お名前、ご連絡先、ご希望の色をお聞かせください。',romaji:'Hai, o-torioki mo kanou desu. O-namae, go-renraku-saki, go-kibou no iro wo o-kikase kudasai.',tl:'Ya, bisa disisihkan untuk Anda. Boleh saya minta nama, nomor kontak, dan warna yang diinginkan?'},
      {speaker:'客',text:'ブルーでお願いします。試着室はありますか？とりあえずMサイズを試してみてもいいですか？',romaji:'Buruu de onegaishimasu. Shichakushitsu wa arimasu ka? Toriaezu M saizu wo tameshite mite mo ii desu ka?',tl:'Warna biru. Apakah ada kamar pas? Boleh saya coba dulu ukuran M untuk sementara?'}
    ],
    tips:['在庫(ざいこ) = stok/persediaan','切れている(きれている) = habis (stok)','入荷予定(にゅうかよてい) = dijadwalkan masuk stok','お取り置き(おとりおき) = disisihkan/dipesan untuk ditahan','試着室(しちゃくしつ) = kamar pas (fitting room)','とりあえず = sementara/untuk sementara ini']
  },
  {
    title:'Meminta Petunjuk Jalan ke Tempat Wisata',icon:'🗺️',desc:'Tanya arah, naik kereta dan berjalan kaki ke destinasi — N4-N3',level:'N4',
    dialog:[
      {speaker:'観光客',text:'すみません、浅草寺へはどう行けばいいですか？',romaji:'Sumimasen, Sensouji e wa dou ikeba ii desu ka?',tl:'Permisi, bagaimana cara pergi ke Kuil Senso-ji?'},
      {speaker:'地元の人',text:'浅草寺ですね。ここから一番便利なのは地下鉄です。銀座線に乗って浅草駅で降りてください。3分ほど歩けば着きます。',romaji:'Sensouji desu ne. Koko kara ichiban benri na no wa chikatetsu desu. Ginzasen ni notte Asakusa-eki de orite kudasai. Sanpun hodo arukeba tsukimasu.',tl:'Senso-ji ya. Yang paling nyaman dari sini adalah naik subway. Naik Ginza Line dan turun di Stasiun Asakusa. Jalan sekitar 3 menit sudah sampai.'},
      {speaker:'観光客',text:'銀座線はどこから乗れますか？この辺に駅はありますか？',romaji:'Ginzasen wa doko kara noremasu ka? Kono hen ni eki wa arimasu ka?',tl:'Di mana bisa naik Ginza Line? Apakah ada stasiun di sekitar sini?'},
      {speaker:'地元の人',text:'そこの交差点を右に曲がって、まっすぐ行くと表参道駅があります。歩いて5分くらいです。',romaji:'Soko no kousaten wo migi ni magatte, massugu iku to Omotesandou-eki ga arimasu. Aruite gofun kurai desu.',tl:'Di persimpangan itu belok kanan, lalu jalan lurus ada Stasiun Omotesando. Sekitar 5 menit jalan kaki.'},
      {speaker:'観光客',text:'ありがとうございます。あと、浅草寺の近くでおすすめの食べ物屋さんはありますか？',romaji:'Arigatou gozaimasu. Ato, Sensouji no chikaku de osusume no tabemono-ya san wa arimasu ka?',tl:'Terima kasih. Oh ya, ada rekomendasi tempat makan dekat Senso-ji?'},
      {speaker:'地元の人',text:'仲見世通りに天ぷらや人形焼きのお店がたくさんありますよ。食べ歩きが楽しめます！',romaji:'Nakamise-doori ni tenpura ya ningyoyaki no o-mise ga takusan arimasu yo. Tabearuki ga tanoshimemasu!',tl:'Di jalan Nakamise ada banyak toko tempura dan ningyo-yaki (kue berbentuk boneka). Bisa makan sambil jalan!'}
    ],
    tips:['地下鉄(ちかてつ) = kereta bawah tanah / subway','交差点(こうさてん) = persimpangan jalan','まっすぐ = lurus','着く(つく) = sampai/tiba','食べ歩き(たべあるき) = makan sambil jalan / street food hopping','仲見世通り(なかみせどおり) = jalan belanja menuju Senso-ji']
  }
];

const pg=document.getElementById('percakapanGrid');
percakapanData.forEach((p,idx)=>{
  const d=document.createElement('div');
  d.style.cssText='background:var(--white);border:.5px solid var(--border-mid);border-radius:16px;padding:1.5rem;cursor:pointer;transition:all .2s';
  d.onmouseenter=e=>{e.currentTarget.style.borderColor='var(--red)';e.currentTarget.style.transform='translateY(-2px)'}
  d.onmouseleave=e=>{e.currentTarget.style.borderColor='';e.currentTarget.style.transform=''}
  d.innerHTML=`<div style="font-size:28px;margin-bottom:.5rem">${p.icon}</div><div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:.25rem">${p.title}</div><div style="font-size:12px;color:var(--ink-soft);line-height:1.6;margin-bottom:.75rem">${p.desc}</div><div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;background:var(--red-pale);color:var(--red)">${p.level}</span><span style="font-size:13px;color:var(--red);font-weight:600">Lihat Dialog →</span></div>`;
  d.onclick=()=>openPercakapan(idx);
  pg.appendChild(d);
});

// Modal percakapan dengan dialog lengkap
function openPercakapan(idx){
  const p=percakapanData[idx];
  const isRight=sp=>['客','A','学生','部下','患者'].includes(sp);
  const lines=p.dialog.map(l=>`
    <div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;${isRight(l.speaker)?'flex-direction:row-reverse':''}">
      <div style="width:34px;height:34px;border-radius:50%;background:${isRight(l.speaker)?'var(--red-pale)':'var(--gold-pale)'};color:${isRight(l.speaker)?'var(--red)':'var(--gold)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0">${l.speaker}</div>
      <div style="max-width:78%;background:${isRight(l.speaker)?'var(--red-pale)':'var(--cream)'};border:1px solid var(--border);border-radius:12px;padding:.6rem .9rem">
        <div style="font-family:'Noto Serif JP',serif;font-size:14px;color:var(--ink);line-height:1.7">${l.text}</div>
        ${l.romaji?`<div style="font-size:10px;color:var(--ink-faint);margin-top:2px;font-style:italic">${l.romaji}</div>`:''}
        <div style="font-size:12px;color:var(--ink-soft);margin-top:3px">${l.tl}</div>
      </div>
    </div>`).join('');
  const tips=p.tips?`<div style="background:var(--gold-pale);border-radius:10px;padding:.85rem;margin-top:.75rem"><div style="font-size:12px;font-weight:800;color:var(--gold);margin-bottom:.4rem">💡 Pola Penting</div><ul style="padding-left:1rem;font-size:12px;color:var(--ink-mid);display:grid;gap:.25rem">${p.tips.map(t=>`<li>${t}</li>`).join('')}</ul></div>`:'';
  document.getElementById('percModal').innerHTML=`
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)" onclick="if(event.target===this)closePM()">
      <div style="background:var(--cream);border:.5px solid var(--border-mid);border-radius:20px;width:min(600px,95vw);max-height:85vh;overflow-y:auto;animation:popIn .3s cubic-bezier(.34,1.56,.64,1)">
        <div style="padding:1.25rem 1.5rem;border-bottom:.5px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;background:var(--red-pale);color:var(--red)">${p.level}</span><div style="font-size:17px;font-weight:700;color:var(--ink);margin-top:.35rem">${p.icon} ${p.title}</div><div style="font-size:12px;color:var(--ink-soft)">${p.desc}</div></div>
          <button aria-label="Closepm" onclick="closePM()" style="width:30px;height:30px;border-radius:50%;background:var(--border);border:none;cursor:pointer;font-size:14px;flex-shrink:0">✕</button>
        </div>
        <div style="padding:1.25rem 1.5rem">${lines}${tips}</div>
        <div style="padding:.75rem 1.5rem;border-top:.5px solid var(--border);display:flex;gap:.75rem">
          <a href="../AI-Tutor-Pro.html" style="display:inline-flex;align-items:center;gap:6px;background:var(--red);color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none">🤖 Latihan dengan AI Tutor</a>
          <button onclick="closePM()" style="background:var(--white);border:.5px solid var(--border-mid);border-radius:8px;padding:9px 16px;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink-mid)">Tutup</button>
        </div>
      </div>
    </div>`;
  document.getElementById('percModal').style.display='block';
}
function closePM(){document.getElementById('percModal').innerHTML='';document.getElementById('percModal').style.display='none';}
