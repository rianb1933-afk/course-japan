/**
 * assets/ssw-seed.js — data contoh (fallback) platform SSW
 * =========================================================
 * Disuntikkan sebagai window.NP_SSW_SEED oleh setiap halaman SSW.
 * Dipakai assets/ssw-api.js hanya bila Supabase belum dikonfigurasi
 * ATAU tabel ssw_* belum ada — supaya UI tetap hidup di preview tanpa
 * error (pola "mode demo" yang sama dengan halaman lain di repo ini).
 *
 * Saat schema supabase-schema.sql sudah dijalankan, 14 bidang di bawah
 * justru tersimpan sebagai baris ssw_categories (lihat bagian seed
 * schema) dan klien otomatis beralih membaca DB — file ini tinggal
 * jadi jaring pengaman offline.
 *
 * Konten kaigo di bawah adalah CONTOH (bukan soal resmi) untuk
 * memperlihatkan struktur Modul → Lesson & Vocabulary.
 */
window.NP_SSW_SEED = {
  categories: [
    { slug:'kaigo', name_jp:'介護', name_id:'Perawatan Lansia', name_en:'Caregiving', icon:'🧑‍🦳', type1_ok:true, type2_ok:true, description:'Perawatan harian lansia di fasilitas/rumah — ekosistem materi Kaigo situs ini tersedia penuh.' },
    { slug:'building-clean', name_jp:'ビルクリーニング', name_id:'Pembersihan Gedung', name_en:'Building Cleaning', icon:'🧹', type1_ok:true, type2_ok:true },
    { slug:'manufaktur', name_jp:'工業製品製造業', name_id:'Manufaktur Produk Industri', name_en:'Industrial Product Manufacturing', icon:'🏭', type1_ok:true, type2_ok:true },
    { slug:'kensetsu', name_jp:'建設', name_id:'Konstruksi', name_en:'Construction', icon:'🏗️', type1_ok:true, type2_ok:true },
    { slug:'zousen', name_jp:'造船・舶用工業', name_id:'Perkapalan', name_en:'Shipbuilding & Marine Equipment', icon:'🚢', type1_ok:true, type2_ok:true },
    { slug:'jidousha-seibi', name_jp:'自動車整備', name_id:'Servis Otomotif', name_en:'Automobile Maintenance', icon:'🔧', type1_ok:true, type2_ok:true },
    { slug:'koukuu', name_jp:'航空', name_id:'Penerbangan', name_en:'Aviation', icon:'✈️', type1_ok:true, type2_ok:true },
    { slug:'shukuhaku', name_jp:'宿泊', name_id:'Perhotelan', name_en:'Accommodation', icon:'🏨', type1_ok:true, type2_ok:true },
    { slug:'unten', name_jp:'自動車運送業', name_id:'Transportasi Kendaraan', name_en:'Automobile Transportation', icon:'🚌', type1_ok:true, type2_ok:false },
    { slug:'tetsudou', name_jp:'鉄道', name_id:'Kereta Api', name_en:'Railway', icon:'🚉', type1_ok:true, type2_ok:true },
    { slug:'nougyou', name_jp:'農業', name_id:'Pertanian', name_en:'Agriculture', icon:'🌾', type1_ok:true, type2_ok:true },
    { slug:'gyogyou', name_jp:'漁業', name_id:'Perikanan', name_en:'Fishery', icon:'🐟', type1_ok:true, type2_ok:true },
    { slug:'shokuhin', name_jp:'飲食料品製造業', name_id:'Manufaktur Makanan', name_en:'Food & Beverage Manufacturing', icon:'🍱', type1_ok:true, type2_ok:true },
    { slug:'gaishoku', name_jp:'外食業', name_id:'Restoran', name_en:'Food Service', icon:'🍜', type1_ok:true, type2_ok:true },
  ],

  // Contoh pohon bidang kaigo (Modul → Lesson + Vocabulary)
  field: {
    slug: 'kaigo',
    vocabulary: [
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
    ],
    modules: [
      {
        id:'m-kaigo-1', title:'Dasar Perawatan Lansia', title_jp:'介護の基礎', sort:1, published:true,
        description:'Kosakata dan sikap dasar saat menemani pengguna di fasilitas perawatan.',
        ssw_lessons: [
          { id:'l-kaigo-1', title:'Menyapa dan mengenali pengguna', description:'Sapaan kerja, sebutan ご利用者, dan sikap dasar.', sort:1, published:true },
          { id:'l-kaigo-2', title:'移乗 — memindahkan pengguna', description:'Kosakata inti 移乗 + langkah aman beda ke kursi roda.', sort:2, published:true },
          { id:'l-kaigo-3', title:'食事介助 — bantu makan', description:'Istilah makan, posisi, dan keselamatan tenggorokan.', sort:3, published:true },
        ],
      },
      {
        id:'m-kaigo-2', title:'Kesehatan & Observasi', title_jp:'健康と観察', sort:2, published:true,
        description:'Istilah kondisi tubuh dan pengamatan harian yang dicatat caregiver.',
        ssw_lessons: [
          { id:'l-kaigo-4', title:'Vital sign — suhu, nadi, tekanan darah', description:'Kosakata pengukuran dan cara melapor ke perawat.', sort:1, published:true },
          { id:'l-kaigo-5', title:'体位変換 dan pencegahan luka', description:'Mengubah posisi tubuh dan menjaga kulit.', sort:2, published:true },
        ],
      },
    ],
  },
};
