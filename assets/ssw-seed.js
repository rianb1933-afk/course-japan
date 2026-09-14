/**
 * assets/ssw-seed.js — data contoh (fallback) platform SSW
 * =========================================================
 * Disuntikkan sebagai window.NP_SSW_SEED oleh setiap halaman SSW.
 * Dipakai assets/ssw-api.js hanya bila Supabase belum dikonfigurasi
 * ATAU tabel ssw_* belum ada — supaya UI tetap hidup di preview tanpa
 * error (pola "mode demo" yang sama dengan halaman lain di repo ini).
 *
 * Saat schema supabase-schema.sql sudah dijalankan, bidang di bawah
 * justru tersimpan sebagai baris ssw_categories (lihat bagian seed
 * schema) dan klien otomatis beralih membaca DB — file ini tinggal
 * jadi jaring pengaman offline. Daftar & flag di sini WAJIB sama dengan
 * INSERT ssw_categories di schema (dijaga scripts/tests/test-ssw-seed.js).
 *
 * Daftar bidang mengikuti ISA per 1 Juni 2026: 17 bidang 1号
 * (https://www.moj.go.jp/isa/policies/ssw/sswfield.html), 11 di antaranya
 * juga 2号 (https://www.moj.go.jp/isa/applications/ssw/10_00180.html).
 * 介護 TIDAK termasuk 2号 — jalur lanjutannya visa 介護 lewat 介護福祉士.
 *
 * Konten kaigo di bawah adalah CONTOH (bukan soal resmi) untuk
 * memperlihatkan struktur Modul → Lesson & Vocabulary.
 */
window.NP_SSW_SEED = {
  categories: [
    { slug:'kaigo', name_jp:'介護', name_id:'Perawatan Lansia', name_en:'Caregiving', icon:'🧑‍🦳', type1_ok:true, type2_ok:false, description:'Perawatan harian lansia di fasilitas/rumah — ekosistem materi Kaigo situs ini tersedia penuh.' },
    { slug:'building-clean', name_jp:'ビルクリーニング', name_id:'Pembersihan Gedung', name_en:'Building Cleaning', icon:'🧹', type1_ok:true, type2_ok:true },
    { slug:'linen-supply', name_jp:'リネンサプライ', name_id:'Binatu Linen', name_en:'Linen Supply', icon:'🧺', type1_ok:true, type2_ok:false },
    { slug:'manufaktur', name_jp:'工業製品製造業', name_id:'Manufaktur Produk Industri', name_en:'Industrial Product Manufacturing', icon:'🏭', type1_ok:true, type2_ok:true },
    { slug:'kensetsu', name_jp:'建設', name_id:'Konstruksi', name_en:'Construction', icon:'🏗️', type1_ok:true, type2_ok:true },
    { slug:'zousen', name_jp:'造船・舶用工業', name_id:'Perkapalan', name_en:'Shipbuilding & Marine Equipment', icon:'🚢', type1_ok:true, type2_ok:true },
    { slug:'jidousha-seibi', name_jp:'自動車整備', name_id:'Servis Otomotif', name_en:'Automobile Maintenance', icon:'🔧', type1_ok:true, type2_ok:true },
    { slug:'koukuu', name_jp:'航空', name_id:'Penerbangan', name_en:'Aviation', icon:'✈️', type1_ok:true, type2_ok:true },
    { slug:'shukuhaku', name_jp:'宿泊', name_id:'Perhotelan', name_en:'Accommodation', icon:'🏨', type1_ok:true, type2_ok:true },
    { slug:'unten', name_jp:'自動車運送業', name_id:'Transportasi Kendaraan', name_en:'Automobile Transportation', icon:'🚌', type1_ok:true, type2_ok:false },
    { slug:'tetsudou', name_jp:'鉄道', name_id:'Kereta Api', name_en:'Railway', icon:'🚉', type1_ok:true, type2_ok:false },
    { slug:'nougyou', name_jp:'農業', name_id:'Pertanian', name_en:'Agriculture', icon:'🌾', type1_ok:true, type2_ok:true },
    { slug:'gyogyou', name_jp:'漁業', name_id:'Perikanan', name_en:'Fishery', icon:'🐟', type1_ok:true, type2_ok:true },
    { slug:'shokuhin', name_jp:'飲食料品製造業', name_id:'Manufaktur Makanan', name_en:'Food & Beverage Manufacturing', icon:'🍱', type1_ok:true, type2_ok:true },
    { slug:'gaishoku', name_jp:'外食業', name_id:'Restoran', name_en:'Food Service', icon:'🍜', type1_ok:true, type2_ok:true },
    { slug:'ringyou', name_jp:'林業', name_id:'Kehutanan', name_en:'Forestry', icon:'🌲', type1_ok:true, type2_ok:false },
    { slug:'mokuzai', name_jp:'木材産業', name_id:'Industri Kayu', name_en:'Wood Industry', icon:'🪵', type1_ok:true, type2_ok:false },
  ],

  // ── Konten contoh per bidang, dikunci slug (dibaca SSWAPI.getFieldTree/
  // getItems lewat seedField()). Bidang tanpa entri di sini tetap tampil
  // di hub dengan keadaan kosong. Isinya CONTOH untuk mode offline; konten
  // lengkap tiap bidang ada di seed SQL dan dibaca dari DB.
  fields: {
    kaigo: { slug:'kaigo', vocabulary:[
      { id:'v1', term:'移乗', furigana:'いじょう', romaji:'ijō', meaning_id:'Pemindahan/transfer pengguna', category:'perawatan', level:'dasar',
        example:'利用者をベッドから車いすへ移乗させます。', example_furigana:'りようしゃをベッドからくるまいすへいじょうさせます。', example_id:'Memindahkan pengguna dari tempat tidur ke kursi roda.' },
      { id:'v2', term:'食事介助', furigana:'しょくじかいじょ', romaji:'shokuji kaijo', meaning_id:'Bantuan makan', category:'perawatan', level:'dasar',
        example:'利用者に食事介助を行います。', example_furigana:'りようしゃにしょくじかいじょをおこないます。', example_id:'Melakukan bantuan makan kepada pengguna.' },
      { id:'v3', term:'入浴', furigana:'にゅうよく', romaji:'nyūyoku', meaning_id:'Mandi', category:'perawatan', level:'dasar',
        example:'入浴の介助をします。', example_furigana:'にゅうよくのかいじょをします。', example_id:'Membantu mandi.' },
      { id:'v4', term:'排泄', furigana:'はいせつ', romaji:'haisetsu', meaning_id:'Buang air (besar/kecil)', category:'perawatan', level:'dasar',
        example:'排泄のサポートが必要です。', example_furigana:'はいせつのサポートがひつようです。', example_id:'Butuh dukungan buang air.' },
      { id:'v5', term:'血圧', furigana:'けつあつ', romaji:'ketsuatsu', meaning_id:'Tekanan darah', category:'kesehatan', level:'dasar',
        example:'朝、血圧を測ります。', example_furigana:'あさ、けつあつをはかります。', example_id:'Mengukur tekanan darah di pagi hari.' },
      { id:'v6', term:'認知症', furigana:'にんちしょう', romaji:'ninchishō', meaning_id:'Demensia', category:'kesehatan', level:'dasar',
        example:'認知症のご利用者です。', example_furigana:'にんちしょうのごりようしゃです。', example_id:'Ini pengguna dengan demensia.' },
      { id:'v7', term:'体位変換', furigana:'たいいへんかん', romaji:'taii henkan', meaning_id:'Pengubahan posisi tubuh', category:'perawatan', level:'menengah',
        example:'2時間ごとに体位変換をします。', example_furigana:'にじかんごとにたいいへんかんをします。', example_id:'Mengubah posisi tubuh setiap dua jam.' },
      { id:'v8', term:'ベッドメーキング', furigana:'ベッドメーキング', romaji:'beddo mēkingu', meaning_id:'Merapikan tempat tidur', category:'lingkungan', level:'dasar',
        example:'ベッドメーキングを覚えます。', example_furigana:'ベッドメーキングをおぼえます。', example_id:'Belajar merapikan tempat tidur.' },
      { id:'v9', term:'見守り', furigana:'みまもり', romaji:'mimamori', meaning_id:'Pengawasan / menjaga dari kejauhan', category:'perawatan', level:'dasar',
        example:'徘徊しないよう見守ります。', example_furigana:'はいかいしないようみまもります。', example_id:'Mengawasi agar pengguna tidak berkeliaran tanpa arah (徘徊).' },
      { id:'v10', term:'口腔ケア', furigana:'こうくうケア', romaji:'kōkū kēa', meaning_id:'Perawatan mulut', category:'kesehatan', level:'menengah',
        example:'毎食後に口腔ケアをします。', example_furigana:'まいしょくごにこうくうケアをします。', example_id:'Merawat mulut setiap setelah makan — penting demi mencegah pneumonia aspirasi.' },
      { id:'v11', term:'感染対策', furigana:'かんせんたいさく', romaji:'kansen taisaku', meaning_id:'Pencegahan infeksi', category:'kesehatan', level:'menengah',
        example:'手洗いなどの感染対策を徹底します。', example_furigana:'てあらいなどのかんせんたいさくをてっていします。', example_id:'Pencegahan infeksi dengan cuci tangan dan aturan kebersihan.' },
      { id:'v12', term:'褥瘡', furigana:'じょくそう', romaji:'jokusō', meaning_id:'Luka tekan (decubitus)', category:'kesehatan', level:'lanjut',
        example:'体位変換で褥瘡を予防します。', example_furigana:'たいいへんかんでじょくそうをよぼうします。', example_id:'Mencegah luka tekan lewat perubahan posisi rutin.' },
      { id:'v13', term:'転倒予防', furigana:'てんとうよぼう', romaji:'tentō yobō', meaning_id:'Pencegahan jatuh', category:'keamanan', level:'menengah',
        example:'転倒予防のために床の状態を確認します。', example_furigana:'てんとうよぼうのためにゆかのじょうたいをかくにんします。', example_id:'Memastikan lantai bebas hambatan untuk mencegah jatuh.' },
      { id:'v14', term:'レポート', furigana:'レポート', romaji:'repōto', meaning_id:'Laporan (hasil observasi)', category:'komunikasi', level:'menengah',
        example:'朝の観察結果をレポートに書きます。', example_furigana:'あさのかんさつけっかをレポートにかきます。', example_id:'Menulis hasil observasi pagi ke laporan harian.' },
    ], modules:[
      { id:'m-kaigo-1', title:'Dasar Perawatan Lansia', title_jp:'介護の基礎', sort:1, published:true,
        description:'Kosakata dan sikap dasar saat menemani pengguna di fasilitas perawatan.',
        ssw_lessons: [
          { id:'l-kaigo-1', title:'Menyapa dan mengenali pengguna', description:'Sapaan kerja, sebutan ご利用者, dan sikap dasar.', sort:1, published:true,
            body_md:`Perkenalan singkat dan sikap dasar saat pertama kali menemani pengguna.
## セッションの目的
- ご利用者を安心させる
- 名前とあいさつを覚える
- プライバシーを尊重する

### あいさつ例
- おはようございます、ご利用者様
- 今日は調子はいかがですか

### 注意
- 急がせない
- 声をかけないで突然体に触らない`, dialogues:[
            { speaker:'Caregiver', jp:'おはようございます。きょうもよろしくおねがいします。', id:'Selamat pagi. Mohon kerja samanya hari ini juga, ya.' },
            { speaker:'Pengguna', jp:'おはよう。だるいんだよな。', id:'Pagi. Badanku rasanya lemas, nih.' } ] },
          { id:'l-kaigo-2', title:'移乗 — memindahkan pengguna', description:'Kosakata inti 移乗 + langkah aman ke kursi roda.', sort:2, published:true,
            body_md:`## 移乗とは
移乗 (いじょう) = memindahkan pengguna antar permukaan (tempat tidur ↔ kursi roda ↔ toilet).

### Urutan aman
- Rem kursi roda dikunci
- Pengguna dibaringkan di pinggir tempat tidur dulu
- Bantu berdiri sedikit, lalu belok ke kursi
- Pastikan tangan pengguna bertumpu aman

### Kosakata kunci
- 移乗 / ベッド / 車いす / 介助 / ブレーキ`, dialogues:[
            { speaker:'Caregiver', jp:'では、車いすに移りましょうね。ブレーキをかけますね。', id:'Baik, kita pindah ke kursi roda, ya. Remnya saya kunci dulu.' },
            { speaker:'Pengguna', jp:'はい、がんばるね。', id:'Iya, saya coba, ya.' } ] },
          { id:'l-kaigo-3', title:'食事介助 — bantu makan', description:'Istilah makan, posisi, dan keselamatan tenggorokan.', sort:3, published:true,
            body_md:`## 食事介助とは
利用者が自分で食べにくくなったとき、食べることを支援すること (食事 = makan, 介助 = bantuan).

### Posisi yang aman
- Duduk tegak ±90°
- Kepala sedikit condong ke depan
- Jeda antar suapan

### Hal yang harus diwaspadai
- 誤嚥 (ごえん) = tersedak / makanan masuk jalan napas
- Suara “げっぷ” atau batuk tanda kesulitan
- Jangan paksakan makanan keras/berserat kalau pengguna lemas`, dialogues:[
            { speaker:'Caregiver', jp:'すこしずつ食べましょうね。', id:'Kita makan sedikit-sedikit, ya.' },
            { speaker:'Pengguna', jp:'ほんとにおいしいです。', id:'Enak sekali.' } ] },
        ] },
      { id:'m-kaigo-2', title:'Kesehatan & Observasi', title_jp:'健康と観察', sort:2, published:true,
        description:'Istilah kondisi tubuh dan pengamatan harian yang dicatat caregiver.',
        ssw_lessons: [
          { id:'l-kaigo-4', title:'Vital sign — suhu, nadi, tekanan darah', description:'Kosakata pengukuran dan cara melapor ke perawat.', sort:1, published:true,
            body_md:`## Pengukuran harian
- 体温 (たいおん) — suhu tubuh
- 脈拍 (みゃくはく) — nadi / detak jantung
- 血圧 (けつあつ) — tekanan darah

### Cara melapor
- Nilai normal: dicatat biasa
- Nilai tidak biasa: segera laporkan ke perawat
- Semua perubahan dicatat di レポート`, dialogues:[
            { speaker:'Caregiver', jp:'体温は36.5度、血圧は上が120、下が80です。', id:'Suhu 36,5°C, tekanan darah 120/80.' },
            { speaker:'Perawat', jp:'ありがとう。レポートに記入しておいてね。', id:'Terima kasih. Tolong catat di laporan, ya.' } ] },
          { id:'l-kaigo-5', title:'体位変換 dan pencegahan luka', description:'Mengubah posisi tubuh dan menjaga kulit.', sort:2, published:true,
            body_md:`## Mengapa perlu 体位変換
- Tekanan lama → aliran darah menurun → 褥瘡 (じょくそう)
- Rutin tiap 2 jam (disesuaikan kondisi)
- Perhatikan bagian menonjol: 仙骨 (terletak di dekat tulang ekor), tumit, pinggul

### Tanda awal perlu perhatian
- Kulit kemerahan yang tidak hilang setelah tekan
- Perubahan suhu / sensasi di area itu`, dialogues:[
            { speaker:'Caregiver', jp:'いまから体位変換しますね。はい、横を向きましょう。', id:'Sekarang kita ubah posisi tubuh, ya. Nah, miring ke samping.' },
            { speaker:'Pengguna', jp:'ありがとう、ちょうど腰が痛かったよ。', id:'Terima kasih, kebetulan pinggang saya sedang sakit.' } ] },
        ] },
    ], quizzes:[
      { id:'qz-kaigo-1', category_id:null, kind:'quiz', title:'Kosakata Dasar Kaigo', sort:1, published:true,
        description:'Delapan kosakata inti perawatan harian — pilihan ganda, benar/salah, isian, dan menjodohkan.',
        pass_score:60, randomize:false, source:'practice', source_name:'', source_url:'' },
      { id:'qz-kaigo-2', category_id:null, kind:'practice', title:'Observasi & Keselamatan', sort:2, published:true,
        description:'Latihan singkat seputar vital sign dan pencegahan luka tekan.',
        pass_score:70, randomize:true, source:'practice', source_name:'', source_url:'' },
      { id:'qz-kaigo-mock', category_id:null, kind:'mock', title:'Simulasi Ujian Kaigo', sort:3, published:true,
        description:'Simulasi bergaya ujian: 6 soal acak dari bank, batas waktu 10 menit, lulus ≥ 65%.',
        pass_score:65, randomize:true, question_count:6, time_limit_min:10,
        source:'practice', source_name:'', source_url:'' },
    // Bentuk tiap jenis di bawah = baris tabel ssw_* (supabase-schema.sql),
    // karena SSW/Kanji|Grammar|Listening|Reading.html merender keduanya
    // dengan kode yang sama (assets/ssw-content.js).
    ], kanji:[
      { id:'k-kaigo-1', kanji:'介護', onyomi:'かいご', kunyomi:'', furigana:'かいご', meaning_id:'Perawatan / penanganan lansia',
        examples:[{ word:'介護職員', reading:'かいごしょくいん', meaning_id:'petugas perawatan' }, { word:'介護現場', reading:'かいごげんば', meaning_id:'lapangan kerja perawatan' }, { word:'介護保険', reading:'かいごほけん', meaning_id:'asuransi perawatan jangka panjang' }],
        sentence:'介護の仕事は大変ですが、やりがいがあります。', sentence_furigana:'かいごのしごとはたいへんですが、やりがいがあります。', sentence_id:'Pekerjaan perawatan memang berat, tetapi sangat bermakna.' },
      { id:'k-kaigo-2', kanji:'観察', onyomi:'かんさつ', kunyomi:'', furigana:'かんさつ', meaning_id:'Observasi / pengamatan',
        examples:[{ word:'観察記録', reading:'かんさつきろく', meaning_id:'catatan observasi' }, { word:'変化を観察する', reading:'へんかをかんさつする', meaning_id:'mengamati perubahan' }],
        sentence:'毎朝、利用者の様子を観察します。', sentence_furigana:'まいあさ、りようしゃのようすをかんさつします。', sentence_id:'Setiap pagi, saya mengamati kondisi pengguna.' },
      { id:'k-kaigo-3', kanji:'報告', onyomi:'ほうこく', kunyomi:'', furigana:'ほうこく', meaning_id:'Laporan / melaporkan',
        examples:[{ word:'看護師に報告する', reading:'かんごしにほうこくする', meaning_id:'melapor ke perawat' }, { word:'異常を報告する', reading:'いじょうをほうこくする', meaning_id:'melaporkan kelainan' }],
        sentence:'異常があったらすぐに報告してください。', sentence_furigana:'いじょうがあったらすぐにほうこくしてください。', sentence_id:'Jika ada kelainan, segera laporkan.' },
      { id:'k-kaigo-4', kanji:'予防', onyomi:'よぼう', kunyomi:'', furigana:'よぼう', meaning_id:'Pencegahan',
        examples:[{ word:'転倒予防', reading:'てんとうよぼう', meaning_id:'pencegahan jatuh' }, { word:'感染予防', reading:'かんせんよぼう', meaning_id:'pencegahan infeksi' }, { word:'褥瘡予防', reading:'じょくそうよぼう', meaning_id:'pencegahan luka tekan' }],
        sentence:'褥瘡の予防が大切です。', sentence_furigana:'じょくそうのよぼうがたいせつです。', sentence_id:'Pencegahan luka tekan itu penting.' },
      { id:'k-kaigo-5', kanji:'安全', onyomi:'あんぜん', kunyomi:'', furigana:'あんぜん', meaning_id:'Keamanan / aman',
        examples:[{ word:'安全確認', reading:'あんぜんかくにん', meaning_id:'pemeriksaan keamanan' }, { word:'安全対策', reading:'あんぜんたいさく', meaning_id:'langkah keamanan' }, { word:'生活の安全', reading:'せいかつのあんぜん', meaning_id:'keamanan hidup sehari-hari' }],
        sentence:'移乗のときは安全を確認します。', sentence_furigana:'いじょうのときはあんぜんをかくにんします。', sentence_id:'Saat 移乗 (memindahkan pengguna), pastikan keamanannya.' },
    ], grammar:[
      { id:'g-kaigo-1', pattern:'〜てください', meaning_id:'Minta seseorang melakukan sesuatu (sopan)',
        explanation:'Bentuk permintaan sopan — sangat sering dipakai saat meminta pengguna atau rekan kerja melakukan sesuatu.',
        structure:'Vて + ください',
        examples:[{ jp:'ベッドを少し上げてください。', furigana:'ベッドをすこしあげてください。', id:'Tolong naikkan tempat tidurnya sedikit.' }, { jp:'看護師を呼んでください。', furigana:'かんごしをよんでください。', id:'Tolong panggilkan perawat.' }],
        notes:'Sopan, tetapi tetap permintaan langsung. Kepada pengguna lansia jangan memakai 〜なさい — terdengar memerintah dan tidak sopan.' },
      { id:'g-kaigo-2', pattern:'〜なければなりません / 〜ないといけません', meaning_id:'Harus melakukan sesuatu',
        explanation:'Kedua bentuk ini menyatakan kewajiban — 「〜なければならない」lebih formal, 「〜ないといけない」lebih santai. Pola: bentuk ない tanpa い + なければならない (行わない → 行わなければならない), atau bentuk ない utuh + といけない (行わないといけない).',
        structure:'Vない → Vなければなりません / Vないといけません',
        examples:[{ jp:'2時間ごとに体位変換をしなければなりません。', furigana:'にじかんごとにたいいへんかんをしなければなりません。', id:'Harus mengubah posisi tubuh setiap 2 jam.' }, { jp:'手を洗わないといけません。', furigana:'てをあらわないといけません。', id:'Harus mencuci tangan.' }],
        notes:'Keputusan keamanan di kaigo biasanya kewajiban, bukan pilihan.' },
      { id:'g-kaigo-3', pattern:'〜てくださいませんか', meaning_id:'Minta tolong dengan lebih sopan / tidak langsung',
        explanation:'Bentuk permintaan yang lebih lembut daripada 〜てください, sering dipakai ke rekan kerja atau perawat.',
        structure:'Vて + くださいませんか',
        examples:[{ jp:'看護師さん、ちょっと見てくださいませんか。', furigana:'かんごしさん、ちょっとみてくださいませんか。', id:'Permisi (kepada perawat), bisakah melihat sebentar?' }, { jp:'もう少し手伝ってくださいませんか。', furigana:'もうすこしてつだってくださいませんか。', id:'Bisakah membantu sedikit lagi?' }],
        notes:'Cocok untuk situasi yang ingin menghindari kesan perintah mendadak.' },
    ], listening:[
      { id:'lt-kaigo-1', title:'パジャマ交換の指示を聞く',
        audio_text:'パジャマを替えてください。はい、かしこまりました。着替える前に、トイレはいかがですか。',
        transcript:'利用者：「パジャマを替えてください。」 介護職員：「はい、かしこまりました。着替える前に、トイレはいかがですか。」',
        transcript_furigana:'りようしゃ：「パジャマをかえてください。」 かいごしょくいん：「はい、かしこまりました。きがえるまえに、トイレはいかがですか。」',
        translation_id:'Pengguna: “Tolong ganti piyama saya.” Petugas: “Baik. Sebelum ganti baju, apakah mau ke toilet dulu?”',
        questions:[
          { type:'tf', question:'Petugas langsung mengganti piyama tanpa bertanya apa-apa.', correct:false, explanation:'Petugas bertanya dulu 「トイレはいかがですか」 — konfirmasi kebutuhan dasar sebelum tindakan lain.' },
          { type:'choice', question:'Apa yang ditanyakan petugas sebelum mengganti pakaian?', choices:['Apakah mau ke toilet dulu','Apakah mau makan dulu','Apakah mau mandi dulu','Apakah mau tidur lagi'], correct:0, explanation:'「トイレはいかがですか」 = "Bagaimana dengan toilet?" — menawarkan ke toilet lebih dulu.' } ] },
      { id:'lt-kaigo-2', title:'看護師からの指示を聞く',
        audio_text:'利用者さんの血圧がいつもより低いみたいです。様子を見てください。',
        transcript:'看護師：「利用者さんの血圧がいつもより低いみたいです。様子を見てください。」',
        transcript_furigana:'かんごし：「りようしゃさんのけつあつがいつもよりひくいみたいです。ようすをみてください。」',
        translation_id:'Perawat: “Tekanan darah pengguna tampaknya lebih rendah dari biasanya. Tolong pantau kondisinya.”',
        questions:[
          { type:'choice', question:'Apa inti pesan perawat?', choices:['血圧が低いので様子を見る','食事を増やす','体を動かす','入浴させる'], correct:0, explanation:'Perawat meminta kondisi pengguna dipantau karena tekanan darahnya rendah.' },
          { type:'choice', question:'Apa yang TIDAK diminta dalam pesan ini?', choices:['経過を見守る','すぐに薬を飲ませる','変化があれば報告する','いつもの数値と比べる'], correct:1, explanation:'Tidak ada instruksi memberi obat — itu wewenang perawat/dokter, bukan caregiver.' } ] },
    ], reading:[
      { id:'r-kaigo-1', title:'高齢者との一日の流れ',
        text:'朝、施設に来ると、利用者の様子を最初に見ます。まだ寝ている人も多いです。利用者のベッドサイドに立ち、声をかけて様子を確認します。熱がある人、食事が取れなかった人、機嫌が悪い人など、一人ひとり違います。介護職員はそれを記録して、看護師に報告します。観察するときは、急がず、丁寧に、相手の表情や話し方も見ます。',
        furigana_text:'あさ、しせつにくると、りようしゃのようすをさいしょにみます。まだねているひともおおいです。りようしゃのベッドサイドにたち、こえをかけてようすをかくにんします。ねつがあるひと、しょくじがとれなかったひと、きげんがわるいひとなど、ひとりひとりちがいます。かいごしょくいんはそれをきろくして、かんごしにほうこくします。かんさつするときは、いそがず、ていねいに、あいてのひょうじょうやはなしかたもみます。',
        translation_id:'Saat tiba di fasilitas pada pagi hari, hal pertama yang dilakukan adalah melihat kondisi pengguna. Banyak yang masih tidur. Berdiri di samping tempat tidur, sapa, lalu periksa kondisinya. Ada yang demam, ada yang tidak bisa makan, ada yang suasana hatinya buruk — setiap orang berbeda. Petugas kaigo mencatatnya dan melapor ke perawat (看護師). Saat mengamati, jangan terburu-buru, lakukan dengan teliti, dan perhatikan juga ekspresi serta cara bicaranya.',
        vocab:[{ term:'利用者', reading:'りようしゃ', meaning_id:'pengguna layanan' }, { term:'ベッドサイド', reading:'ベッドサイド', meaning_id:'sisi tempat tidur' }, { term:'熱', reading:'ねつ', meaning_id:'demam' }, { term:'食事', reading:'しょくじ', meaning_id:'makan' }, { term:'機嫌', reading:'きげん', meaning_id:'suasana hati' }, { term:'記録', reading:'きろく', meaning_id:'catatan' }, { term:'看護師', reading:'かんごし', meaning_id:'perawat' }, { term:'観察', reading:'かんさつ', meaning_id:'observasi' }],
        questions:[
          { type:'choice', question:'Kepada siapa petugas melaporkan hasil observasi?', choices:['看護師','利用者本人','家族','事務員'], correct:0, explanation:'Hasil observasi dicatat dan dilaporkan ke perawat (看護師).' },
          { type:'tf', question:'Setiap pengguna selalu dalam keadaan sama setiap pagi.', correct:false, explanation:'Kondisi pengguna berbeda-beda: demam, tidak makan, suasana hati, dll. (「一人ひとり違います」).' },
          { type:'choice', question:'Selain kondisi fisik, apa yang juga diperhatikan saat observasi?', choices:['Ekspresi wajah dan cara bicara','Merek pakaian','Jumlah kunjungan keluarga','Cuaca hari itu'], correct:0, explanation:'Teks: 「相手の表情や話し方も見ます」.' } ] },
    ], },
  },

  // Bank soal contoh. source:'practice' — BUKAN soal ujian resmi 特定技能;
  // soal resmi hanya boleh masuk lewat CMS dengan source_url (ditegakkan
  // netlify/functions/ssw-cms.js). Tiap soal wajib punya pembahasan.
  quizzes: {
    'qz-kaigo-1': {
      id:'qz-kaigo-1', kind:'quiz', title:'Kosakata Dasar Kaigo', pass_score:60, randomize:false,
      source:'practice', description:'Delapan kosakata inti perawatan harian.',
      ssw_questions: [
        { id:'qq1', type:'vocab', sort:1, points:1,
          payload:{ question:'「移乗」(いじょう) berarti…', choices:['Pemindahan/transfer pengguna','Bantuan makan','Mengukur tekanan darah','Merapikan tempat tidur'] },
          answer:{ index:0 },
          explanation:'移乗 (いじょう) = memindahkan pengguna antar permukaan, mis. dari tempat tidur ke kursi roda. Bantuan makan adalah 食事介助.' },
        { id:'qq2', type:'vocab', sort:2, points:1,
          payload:{ question:'Istilah Jepang untuk "mandi" dalam konteks kaigo adalah…', choices:['排泄','入浴','体位変換','血圧'] },
          answer:{ index:1 },
          explanation:'入浴 (にゅうよく) = mandi. 排泄 (はいせつ) = buang air, 体位変換 = mengubah posisi tubuh, 血圧 = tekanan darah.' },
        { id:'qq3', type:'tf', sort:3, points:1,
          payload:{ question:'「認知症」(にんちしょう) adalah istilah untuk demensia.' },
          answer:{ bool:true },
          explanation:'Benar. 認知症 = demensia. Istilah lama 痴呆 sudah tidak dipakai karena merendahkan.' },
        { id:'qq4', type:'tf', sort:4, points:1,
          payload:{ question:'「体位変換」cukup dilakukan sekali sehari untuk mencegah luka tekan.' },
          answer:{ bool:false },
          explanation:'Salah. 体位変換 umumnya tiap ±2 jam; menunda terlalu lama meningkatkan risiko 褥瘡 (じょくそう, luka tekan).' },
        { id:'qq5', type:'fill', sort:5, points:1,
          payload:{ question:'Tulis bacaan (hiragana) dari 血圧:' },
          answer:{ accept:['けつあつ','ketsuatsu'] },
          explanation:'血圧 dibaca けつあつ (ketsuatsu) = tekanan darah. Diukur rutin dan dicatat dalam laporan harian.' },
        { id:'qq6', type:'fill', sort:6, points:1,
          payload:{ question:'Apa arti 食事介助 dalam bahasa Indonesia? (satu frasa singkat)' },
          answer:{ accept:['bantuan makan','membantu makan','bantu makan'] },
          explanation:'食事介助 (しょくじかいじょ) = bantuan makan: menemani dan membantu pengguna saat makan, termasuk menjaga posisi agar tidak tersedak.' },
        { id:'qq7', type:'match', sort:7, points:2,
          payload:{ question:'Jodohkan istilah dengan artinya:',
            pairs:[{ left:'入浴', right:'Mandi' },{ left:'排泄', right:'Buang air' },{ left:'移乗', right:'Pemindahan' }] },
          answer:{ pairs:[{ left:'入浴', right:'Mandi' },{ left:'排泄', right:'Buang air' },{ left:'移乗', right:'Pemindahan' }] },
          explanation:'Ketiganya adalah 三大介助 — tiga bantuan utama dalam perawatan harian: 入浴 (mandi), 排泄 (buang air), dan 食事 (makan); 移乗 menyertai hampir semuanya.' },
      ],
    },
    'qz-kaigo-2': {
      id:'qz-kaigo-2', kind:'practice', title:'Observasi & Keselamatan', pass_score:70, randomize:true,
      source:'practice', description:'Latihan singkat vital sign dan pencegahan luka tekan.',
      ssw_questions: [
        { id:'qr1', type:'mc', sort:1, points:1,
          payload:{ question:'Pengguna mengeluh pusing setelah bangun cepat dari tempat tidur. Tindakan pertama yang paling tepat?', choices:['Langsung memindahkannya ke kursi roda','Mendudukkannya kembali dan mengamati kondisinya','Meninggalkannya agar beristirahat sendiri','Segera memandikannya'] },
          answer:{ index:1 },
          explanation:'Gejala itu mengarah ke 起立性低血圧 (hipotensi ortostatik). Dudukkan kembali, amati, lalu laporkan ke perawat — memaksakan perpindahan berisiko jatuh (転倒).' },
        { id:'qr2', type:'mc', sort:2, points:1,
          payload:{ question:'Apa yang WAJIB dilakukan setelah mengukur vital sign?', choices:['Mencatat dan melaporkannya','Menyimpannya sampai akhir pekan','Memberitahukan ke keluarga lebih dulu','Tidak perlu dicatat bila normal'] },
          answer:{ index:0 },
          explanation:'Hasil pengukuran selalu dicatat di 記録 dan dilaporkan (報告) — termasuk yang normal, karena nilainya jadi pembanding untuk perubahan berikutnya.' },
        { id:'qr3', type:'tf', sort:3, points:1,
          payload:{ question:'褥瘡 (じょくそう) paling sering muncul di bagian tubuh yang menonjol dan tertekan lama.' },
          answer:{ bool:true },
          explanation:'Benar. Titik rawan: 仙骨部 (tulang ekor), tumit, dan pinggul — karena tekanan lama menghambat aliran darah.' },
        { id:'qr4', type:'fill', sort:4, points:1,
          payload:{ question:'Setiap berapa jam 体位変換 umumnya dilakukan? (tulis angkanya saja)' },
          answer:{ accept:['2','２','dua'] },
          explanation:'Umumnya tiap 2 jam, disesuaikan kondisi kulit dan instruksi perawat.' },
      ],
    },
    // Bank soal simulasi: 8 soal, tiap sesi menarik 6 secara acak
    // (question_count) dengan batas waktu 10 menit.
    'qz-kaigo-mock': {
      id:'qz-kaigo-mock', kind:'mock', title:'Simulasi Ujian Kaigo', pass_score:65,
      randomize:true, question_count:6, time_limit_min:10, source:'practice',
      description:'Simulasi bergaya ujian — bukan soal resmi 特定技能.',
      ssw_questions: [
        { id:'qm1', type:'mc', sort:1, points:1,
          payload:{ question:'Sebelum melakukan 移乗, hal pertama yang harus dipastikan adalah…', choices:['Rem kursi roda terkunci','Suhu ruangan','Jadwal makan berikutnya','Nama keluarga pengguna'] },
          answer:{ index:0 },
          explanation:'Mengunci rem (ブレーキ) mencegah kursi bergeser saat beban berpindah — penyebab 転倒 yang paling sering terjadi saat transfer.' },
        { id:'qm2', type:'mc', sort:2, points:1,
          payload:{ question:'Saat 食事介助, posisi tubuh pengguna yang paling aman adalah…', choices:['Berbaring telentang penuh','Duduk tegak ±90 derajat','Miring ke kiri','Setengah tengkurap'] },
          answer:{ index:1 },
          explanation:'Duduk tegak menurunkan risiko 誤嚥 (ごえん, tersedak/aspirasi). Berbaring saat makan sangat berbahaya bagi lansia.' },
        { id:'qm3', type:'tf', sort:3, points:1,
          payload:{ question:'Caregiver boleh mengubah dosis obat pengguna bila gejalanya terlihat memburuk.' },
          answer:{ bool:false },
          explanation:'Salah, dan ini batas hukum yang tegas. Perubahan dosis adalah kewenangan medis; caregiver hanya melapor (報告) ke perawat/dokter.' },
        { id:'qm4', type:'tf', sort:4, points:1,
          payload:{ question:'Mencuci tangan sebelum dan sesudah kontak dengan tiap pengguna adalah dasar 感染対策.' },
          answer:{ bool:true },
          explanation:'Benar. 手洗い adalah tindakan pencegahan infeksi paling dasar dan paling efektif di fasilitas perawatan.' },
        { id:'qm5', type:'fill', sort:5, points:1,
          payload:{ question:'Tulis bacaan (hiragana) dari 入浴:' },
          answer:{ accept:['にゅうよく','nyuuyoku','nyūyoku'] },
          explanation:'入浴 dibaca にゅうよく = mandi/berendam. Perhatikan suhu air dan kondisi pengguna sebelum memulai.' },
        { id:'qm6', type:'fill', sort:6, points:1,
          payload:{ question:'Apa istilah Jepang untuk "luka tekan" (decubitus)? Tulis kanji atau hiragana.' },
          answer:{ accept:['褥瘡','じょくそう','jokusou','jokusō'] },
          explanation:'褥瘡 (じょくそう) = luka tekan, muncul akibat tekanan lama pada bagian tubuh yang menonjol. Dicegah dengan 体位変換 rutin.' },
        { id:'qm7', type:'match', sort:7, points:2,
          payload:{ question:'Jodohkan istilah dengan bidang tindakannya:',
            pairs:[{ left:'感染対策', right:'Pencegahan infeksi' },{ left:'口腔ケア', right:'Perawatan mulut' },{ left:'見守り', right:'Pengawasan' }] },
          answer:{ pairs:[{ left:'感染対策', right:'Pencegahan infeksi' },{ left:'口腔ケア', right:'Perawatan mulut' },{ left:'見守り', right:'Pengawasan' }] },
          explanation:'Ketiganya adalah tugas harian caregiver: 感染対策 (pencegahan infeksi), 口腔ケア (perawatan mulut, mencegah pneumonia aspirasi), dan 見守り (mengawasi tanpa mengambil alih kemandirian).' },
        { id:'qm8', type:'mc', sort:8, points:1,
          payload:{ question:'Prinsip 自立支援 dalam kaigo berarti…', choices:['Mengerjakan semuanya untuk pengguna','Mendukung pengguna melakukan sendiri sebisanya','Membiarkan pengguna tanpa bantuan','Mempercepat semua tindakan'] },
          answer:{ index:1 },
          explanation:'自立支援 = mendukung kemandirian: bantu hanya pada bagian yang benar-benar tidak bisa dilakukan sendiri, agar kemampuan yang tersisa tidak ikut hilang.' },
      ],
    },
  },
};
