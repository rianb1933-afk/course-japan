/* Inventaris materi JLPT v86, dibangun dari nama file yang benar-benar tersedia di /Materi.
   `levels` = jumlah materi per kategori (dipakai untuk menghitung persentase progres).
   `items`  = daftar materi spesifik per level+kategori, dipakai AI Tutor untuk
              merekomendasikan HALAMAN konkret (bukan sekadar nama kategori). */
(function (global) {
  'use strict';
  global.NPDashboardCatalog = Object.freeze({
    version: 2,
    generatedAt: '2026-07-16',
    srsBuiltInCards: 25,
    levels: Object.freeze({
      N5: Object.freeze({ grammar: 2, vocabulary: 2, kanji: 2, reading: 1, listening: 1, speaking: 0 }),
      N4: Object.freeze({ grammar: 2, vocabulary: 2, kanji: 3, reading: 1, listening: 1, speaking: 0 }),
      N3: Object.freeze({ grammar: 4, vocabulary: 4, kanji: 3, reading: 1, listening: 1, speaking: 0 }),
      N2: Object.freeze({ grammar: 4, vocabulary: 7, kanji: 3, reading: 1, listening: 1, speaking: 2 }),
      N1: Object.freeze({ grammar: 5, vocabulary: 4, kanji: 3, reading: 1, listening: 1, speaking: 0 })
    }),
    items: Object.freeze({
      N5: Object.freeze({
        grammar: [{ file: "Materi/Grammar-N5-Review.html", title: "Review Grammar N5 \u6587\u6cd5N5\u57fa\u790e\u56fa\u3081" }, { file: "Materi/Grammar-N5.html", title: "Grammar N5" }],
        vocabulary: [{ file: "Materi/Kosakata-N5-Review.html", title: "Review Kosakata N5 \u8a9e\u5f59N5\u57fa\u790e" }, { file: "Materi/Kosakata-N5.html", title: "Kosakata N5" }],
        kanji: [{ file: "Materi/Kanji-N5.html", title: "Full Kanji N5" }]
      }),
      N4: Object.freeze({
        grammar: [{ file: "Materi/Grammar-N4-Review.html", title: "Review Grammar N4 \u6587\u6cd5N4\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Grammar-N4.html", title: "Grammar N4" }],
        vocabulary: [{ file: "Materi/Kosakata-N4-Review.html", title: "Review Kosakata N4 \u8a9e\u5f59N4\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Kosakata-N4.html", title: "Kosakata N4" }],
        kanji: [{ file: "Materi/Kanji-N4-Review.html", title: "Review Kanji N4 \u6f22\u5b57N4\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Kanji-N4.html", title: "Full Kanji N4" }]
      }),
      N3: Object.freeze({
        grammar: [{ file: "Materi/Grammar-N3-Lanjut.html", title: "Grammar N3 Lanjutan" }, { file: "Materi/Grammar-N3-Review.html", title: "Review Grammar N3 \u6587\u6cd5N3\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Grammar-N3.html", title: "Grammar N3" }],
        vocabulary: [{ file: "Materi/Kosakata-Kaigo-N3.html", title: "Kosakata Kaigo N3" }, { file: "Materi/Kosakata-N3-Review.html", title: "Review Kosakata N3 \u8a9e\u5f59N3\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Kosakata-N3-Tambahan.html", title: "Kosakata N3 Tambahan \u8a9e\u5f59\u88dc\u5145" }, { file: "Materi/Kosakata-N3.html", title: "Kosakata N3" }],
        kanji: [{ file: "Materi/Kanji-N3-Review.html", title: "Review Kanji N3 \u6f22\u5b57N3\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Kanji-N3.html", title: "Full Kanji N3" }]
      }),
      N2: Object.freeze({
        grammar: [{ file: "Materi/Grammar-N2-Advanced.html", title: "Grammar N2 Advanced \u6587\u6cd5N2\u6df1\u5316" }, { file: "Materi/Grammar-N2-Lanjut.html", title: "Grammar N2 Lanjutan \u6587\u6cd5N2\u5fdc\u7528" }, { file: "Materi/Grammar-N2.html", title: "Grammar JLPT N2" }],
        vocabulary: [{ file: "Materi/Kosakata-Bisnis-N2.html", title: "Kosakata Bisnis N2 \u30d3\u30b8\u30cd\u30b9\u8a9e\u5f59" }, { file: "Materi/Kosakata-N2-Bisnis.html", title: "Kosakata Bisnis N2 \u30d3\u30b8\u30cd\u30b9\u8a9e\u5f59N2" }, { file: "Materi/Kosakata-N2-Lanjut.html", title: "Kosakata N2 Lanjutan \u526f\u8a5e \u91cd\u8981\u8a9e\u5f59" }, { file: "Materi/Kosakata-N2-Review.html", title: "Review Kosakata N2 \u8a9e\u5f59N2\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Kosakata-N2-Tambahan.html", title: "Kosakata N2 Tambahan \u8a9e\u5f59N2\u88dc\u5145" }, { file: "Materi/Kosakata-N2.html", title: "Kosakata JLPT N2" }],
        kanji: [{ file: "Materi/Kanji-N2-Review.html", title: "Review Kanji N2 \u6f22\u5b57N2\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Kanji-N2.html", title: "Full Kanji N2" }]
      }),
      N1: Object.freeze({
        grammar: [{ file: "Materi/Grammar-N1-Lanjut.html", title: "Grammar N1 Lanjutan \u6587\u6cd5N1\u5fdc\u7528" }, { file: "Materi/Grammar-N1-Review.html", title: "Review Grammar N1 \u6587\u6cd5N1\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Grammar-N1.html", title: "Grammar JLPT N1" }],
        vocabulary: [{ file: "Materi/Kosakata-N1-Review.html", title: "Review Kosakata N1 \u8a9e\u5f59N1\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Kosakata-N1-Tambahan.html", title: "Kosakata N1 Tambahan \u8a9e\u5f59N1\u88dc\u5145" }, { file: "Materi/Kosakata-N1.html", title: "Kosakata JLPT N1" }],
        kanji: [{ file: "Materi/Kanji-N1-Review.html", title: "Review Kanji N1 \u6f22\u5b57N1\u7dcf\u5fa9\u7fd2" }, { file: "Materi/Kanji-N1.html", title: "Full Kanji N1" }]
      })
    }),
    kaigo: Object.freeze({
      total: 76,
      categories: Object.freeze([
      { id: "dasar", name: "Dasar Kaigo", icon: "\ud83c\udfe0" },
      { id: "bahasa", name: "Bahasa & Komunikasi", icon: "\ud83d\udcac" },
      { id: "praktik", name: "Praktik Perawatan", icon: "\ud83e\udd32" },
      { id: "kesehatan", name: "Kesehatan & Medis", icon: "\ud83c\udfe5" },
      { id: "dokumen", name: "Dokumentasi", icon: "\ud83d\udcdd" },
      { id: "hukum", name: "Hukum, Etika & Sistem Sosial", icon: "\u2696\ufe0f" },
      { id: "ujian", name: "Persiapan Ujian", icon: "\ud83c\udf93" }
      ]),
      modules: Object.freeze([
      { slug: "Kaigo-Fukushishi-Overview", cat: "dasar", title: "Jalur, Ujian, Roadmap", order: 1, next: "Kaigo-Ningen-Songen" },
      { slug: "Kaigo-N5", cat: "bahasa", title: "Kaigo N5", order: 1, next: "Kaigo-Bahasa" },
      { slug: "Kaigo-ADL-Guide", cat: "praktik", title: "Panduan ADL Lengkap 日常生活動作完全ガイド", order: 1, next: "Kaigo-Iijo-Ido" },
      { slug: "Kaigo-Roka-Shikumi", cat: "kesehatan", title: "Fisiologi Penuaan Kaigo", order: 1, next: "Kaigo-Kokyu-Junkan" },
      { slug: "Kaigo-Dokumentasi", cat: "dokumen", title: "Dokumentasi Kaigo 介護記録", order: 1, next: "Kaigo-Rekod" },
      { slug: "Kaigo-Jinken-Fukushi", cat: "hukum", title: "Hak Asasi Manusia & Kesejahteraan", order: 1, next: "Kaigo-Kaigo-Rinri" },
      { slug: "Kaigo-Ujian-N2", cat: "ujian", title: "Quiz Kaigo Level N2 介護N2", order: 1, next: "Kaigo-Ujian-Nasional" },
      { slug: "Kaigo-Ningen-Songen", cat: "dasar", title: "Martabat Manusia & Kemandirian", order: 2, next: "Kaigo-Jiritsu-Shien" },
      { slug: "Kaigo-Bahasa", cat: "bahasa", title: "Kosakata, Dialog, Keigo", order: 2, next: "Kaigo-Nihongo-N4" },
      { slug: "Kaigo-Iijo-Ido", cat: "praktik", title: "Bantuan Transfer & Mobilitas Kaigo", order: 2, prereq: "Kaigo-ADL-Guide", next: "Kaigo-Koi-Kaijo" },
      { slug: "Kaigo-Kokyu-Junkan", cat: "kesehatan", title: "Fisiologi Pernapasan & Sirkulasi dalam Kaigo", order: 2, prereq: "Kaigo-Roka-Shikumi", next: "Kaigo-Shouka-Haisetsu" },
      { slug: "Kaigo-Rekod", cat: "dokumen", title: "Penulisan Rekod & Dokumentasi Asuhan", order: 2, prereq: "Kaigo-Dokumentasi", next: "Kaigo-Kaigo-Katei" },
      { slug: "Kaigo-Kaigo-Rinri", cat: "hukum", title: "Etika Perawatan Profesional", order: 2, next: "Kaigo-Hukum" },
      { slug: "Kaigo-Ujian-Nasional", cat: "ujian", title: "介護福祉士", order: 2, prereq: "Kaigo-Ujian-N2" },
      { slug: "Kaigo-Jiritsu-Shien", cat: "dasar", title: "自立支援介護 じりつしえんかいご", order: 3, next: "Kaigo-Baisutikku" },
      { slug: "Kaigo-Nihongo-N4", cat: "bahasa", title: "Bahasa Jepang Kaigo N4", order: 3, prereq: "Kaigo-Bahasa", next: "Kaigo-Kosakata-Klinik" },
      { slug: "Kaigo-Koi-Kaijo", cat: "praktik", title: "Bantuan Ganti Pakaian", order: 3, prereq: "Kaigo-Iijo-Ido", next: "Kaigo-Shokuji-Guide" },
      { slug: "Kaigo-Shouka-Haisetsu", cat: "kesehatan", title: "Fisiologi Pencernaan & Ekskresi", order: 3, prereq: "Kaigo-Kokyu-Junkan", next: "Kaigo-Ninchi-Kino" },
      { slug: "Kaigo-Kaigo-Katei", cat: "dokumen", title: "Proses Perawatan / Care Process Kaigo", order: 3, prereq: "Kaigo-Rekod", next: "Kaigo-Rekod-Lanjut" },
      { slug: "Kaigo-Hukum", cat: "hukum", title: "介護福祉士", order: 3, prereq: "Kaigo-Kaigo-Rinri", next: "Kaigo-Kaigo-Hoken-Detail" },
      { slug: "Kaigo-Baisutikku", cat: "dasar", title: "7 Prinsip Biestek dalam Komunikasi Kaigo", order: 4, next: "Kaigo-Bunka" },
      { slug: "Kaigo-Kosakata-Klinik", cat: "bahasa", title: "介護福祉士", order: 4, prereq: "Kaigo-Nihongo-N4", next: "Kaigo-Komunikasi" },
      { slug: "Kaigo-Shokuji-Guide", cat: "praktik", title: "Bantuan Makan & Perawatan Menelan", order: 4, prereq: "Kaigo-Koi-Kaijo", next: "Kaigo-Nyuyoku-Care" },
      { slug: "Kaigo-Ninchi-Kino", cat: "kesehatan", title: "Fungsi Kognitif & Gangguan Fungsi Otak Tingg", order: 4, prereq: "Kaigo-Shouka-Haisetsu", next: "Kaigo-Penyakit" },
      { slug: "Kaigo-Rekod-Lanjut", cat: "dokumen", title: "Rekod & Dokumentasi Kaigo Lanjutan 介護記録", order: 4, prereq: "Kaigo-Kaigo-Katei" },
      { slug: "Kaigo-Kaigo-Hoken-Detail", cat: "hukum", title: "Detail Sistem Asuransi Perawatan", order: 4, prereq: "Kaigo-Hukum", next: "Kaigo-Shakai-Hosho" },
      { slug: "Kaigo-Bunka", cat: "dasar", title: "介護の文化と倫理 介護文化・職業倫理", order: 5, next: "Kaigo-ICF-Assessment" },
      { slug: "Kaigo-Komunikasi", cat: "bahasa", title: "Komunikasi & Psikologi Perawatan", order: 5, next: "Kaigo-Kaiwa-Technique" },
      { slug: "Kaigo-Nyuyoku-Care", cat: "praktik", title: "Bantuan Mandi Lansia", order: 5, prereq: "Kaigo-Shokuji-Guide", next: "Kaigo-Haisetsu-Care" },
      { slug: "Kaigo-Penyakit", cat: "kesehatan", title: "Penyakit Utama Lansia & Pendekatan Kaigo", order: 5, prereq: "Kaigo-Ninchi-Kino", next: "Kaigo-Demensia" },
      { slug: "Kaigo-Shakai-Hosho", cat: "hukum", title: "Sistem Jaminan Sosial Jepang", order: 5, prereq: "Kaigo-Kaigo-Hoken-Detail", next: "Kaigo-Shogaisha-Shien" },
      { slug: "Kaigo-ICF-Assessment", cat: "dasar", title: "ICF & アセスメント完全ガイド ICF・介護過程", order: 6, prereq: "Kaigo-Bunka", next: "Kaigo-Fukushiyo-Gu" },
      { slug: "Kaigo-Kaiwa-Technique", cat: "bahasa", title: "Teknik Komunikasi dalam Kaigo", order: 6, next: "Kaigo-Higeongo-Comm" },
      { slug: "Kaigo-Haisetsu-Care", cat: "praktik", title: "Bantuan Toilet & Higiene", order: 6, prereq: "Kaigo-Nyuyoku-Care", next: "Kaigo-Kuchiku-Care" },
      { slug: "Kaigo-Demensia", cat: "kesehatan", title: "Kaigo Demensia 認知症ケア", order: 6, prereq: "Kaigo-Penyakit", next: "Kaigo-Alzheimer" },
      { slug: "Kaigo-Shogaisha-Shien", cat: "hukum", title: "Sistem Dukungan Penyandang Disabilitas", order: 6, prereq: "Kaigo-Shakai-Hosho", next: "Kaigo-Gyakutai-Boshi" },
      { slug: "Kaigo-Fukushiyo-Gu", cat: "dasar", title: "Alat Bantu Perawatan Lansia", order: 7, prereq: "Kaigo-ICF-Assessment", next: "Kaigo-Chiiki-Shakai" },
      { slug: "Kaigo-Higeongo-Comm", cat: "bahasa", title: "Komunikasi Non-Verbal dalam Kaigo", order: 7, prereq: "Kaigo-Kaiwa-Technique", next: "Kaigo-Speaking" },
      { slug: "Kaigo-Kuchiku-Care", cat: "praktik", title: "Perawatan Mulut Lansia", order: 7, prereq: "Kaigo-Haisetsu-Care", next: "Kaigo-Taino-Kanri" },
      { slug: "Kaigo-Alzheimer", cat: "kesehatan", title: "Alzheimer & Perawatan Khusus アルツハイマー", order: 7, prereq: "Kaigo-Demensia", next: "Kaigo-Parkinson" },
      { slug: "Kaigo-Gyakutai-Boshi", cat: "hukum", title: "Pencegahan Kekerasan pada Lansia", order: 7, prereq: "Kaigo-Shogaisha-Shien", next: "Kaigo-Kojin-Joho" },
      { slug: "Kaigo-Chiiki-Shakai", cat: "dasar", title: "Masyarakat Inklusif Berbasis Komunitas", order: 8, next: "Kaigo-Homecare" },
      { slug: "Kaigo-Speaking", cat: "bahasa", title: "Kaigo Speaking 介護スピーキング", order: 8, prereq: "Kaigo-Higeongo-Comm", next: "Kaigo-Kazoku-Shien" },
      { slug: "Kaigo-Taino-Kanri", cat: "praktik", title: "Manajemen Posisi & Pencegahan Luka Tekan", order: 8, prereq: "Kaigo-Kuchiku-Care", next: "Kaigo-Kyoshuku-Yobo" },
      { slug: "Kaigo-Parkinson", cat: "kesehatan", title: "Perawatan Parkinson パーキンソン病ケア", order: 8, prereq: "Kaigo-Alzheimer", next: "Kaigo-Osteoporosis" },
      { slug: "Kaigo-Kojin-Joho", cat: "hukum", title: "Perlindungan Data Pribadi dalam Kaigo", order: 8, prereq: "Kaigo-Gyakutai-Boshi", next: "Kaigo-Risk-Management" },
      { slug: "Kaigo-Homecare", cat: "dasar", title: "訪問介護完全ガイド 在宅ケア", order: 9 },
      { slug: "Kaigo-Kazoku-Shien", cat: "bahasa", title: "Dukungan Keluarga & Komunikasi", order: 9, prereq: "Kaigo-Speaking", next: "Kaigo-Taju-Renkei" },
      { slug: "Kaigo-Kyoshuku-Yobo", cat: "praktik", title: "Pencegahan Kontraktur Kaigo", order: 9, prereq: "Kaigo-Taino-Kanri", next: "Kaigo-Juukankyo-Seibi" },
      { slug: "Kaigo-Osteoporosis", cat: "kesehatan", title: "骨粗鬆症ケア 骨を守るケア", order: 9, prereq: "Kaigo-Parkinson", next: "Kaigo-Diabetes-Care" },
      { slug: "Kaigo-Risk-Management", cat: "hukum", title: "Manajemen Risiko dalam Kaigo", order: 9, prereq: "Kaigo-Kojin-Joho", next: "Kaigo-Hukum-Lanjut" },
      { slug: "Kaigo-Taju-Renkei", cat: "bahasa", title: "Kolaborasi Multidisiplin", order: 10, prereq: "Kaigo-Kazoku-Shien", next: "Kaigo-Dementia-Communication" },
      { slug: "Kaigo-Juukankyo-Seibi", cat: "praktik", title: "Penataan Lingkungan Rumah yang Aman Kaigo", order: 10, prereq: "Kaigo-Kyoshuku-Yobo", next: "Kaigo-Yakan-Care" },
      { slug: "Kaigo-Diabetes-Care", cat: "kesehatan", title: "Perawatan Diabetes Kaigo 糖尿病管理", order: 10, prereq: "Kaigo-Osteoporosis", next: "Kaigo-Mental-Health" },
      { slug: "Kaigo-Hukum-Lanjut", cat: "hukum", title: "Hukum & Regulasi Kaigo 介護法規", order: 10, prereq: "Kaigo-Risk-Management" },
      { slug: "Kaigo-Dementia-Communication", cat: "bahasa", title: "Kaigo Dementia Communication 認知症コミュニケーション", order: 11, prereq: "Kaigo-Taju-Renkei", next: "Kaigo-Speaking-Lanjut" },
      { slug: "Kaigo-Yakan-Care", cat: "praktik", title: "Perawatan Malam", order: 11, prereq: "Kaigo-Juukankyo-Seibi", next: "Kaigo-Safety-Guide" },
      { slug: "Kaigo-Mental-Health", cat: "kesehatan", title: "Mental Health Kaigo 高齢者の精神的健康", order: 11, prereq: "Kaigo-Diabetes-Care", next: "Kaigo-Gizi" },
      { slug: "Kaigo-Speaking-Lanjut", cat: "bahasa", title: "Speaking Kaigo Lanjutan 介護会話応用", order: 12, prereq: "Kaigo-Dementia-Communication", next: "Kaigo-Speaking-Advanced" },
      { slug: "Kaigo-Safety-Guide", cat: "praktik", title: "Panduan Keselamatan Kaigo 介護安全管理", order: 12, next: "Kaigo-Prosedur" },
      { slug: "Kaigo-Gizi", cat: "kesehatan", title: "Gizi & Nutrisi Kaigo 栄養", order: 12, prereq: "Kaigo-Mental-Health", next: "Kaigo-Nutrition" },
      { slug: "Kaigo-Speaking-Advanced", cat: "bahasa", title: "Kaigo Speaking Advanced 介護会話応用", order: 13, prereq: "Kaigo-Speaking-Lanjut", next: "Kaigo-Speaking-N2" },
      { slug: "Kaigo-Prosedur", cat: "praktik", title: "Prosedur Perawatan Standar", order: 13, prereq: "Kaigo-Safety-Guide", next: "Kaigo-Rehabilitasi" },
      { slug: "Kaigo-Nutrition", cat: "kesehatan", title: "Nutrisi & Gizi Kaigo 栄養管理", order: 13, prereq: "Kaigo-Gizi", next: "Kaigo-Infection-Control" },
      { slug: "Kaigo-Speaking-N2", cat: "bahasa", title: "Kaigo Speaking N2 介護会話N2", order: 14, prereq: "Kaigo-Speaking-Advanced" },
      { slug: "Kaigo-Rehabilitasi", cat: "praktik", title: "Rehabilitasi Kaigo リハビリ", order: 14, prereq: "Kaigo-Prosedur", next: "Kaigo-Prosedur-Lanjut" },
      { slug: "Kaigo-Infection-Control", cat: "kesehatan", title: "Pengendalian Infeksi Kaigo 感染対策", order: 14, prereq: "Kaigo-Nutrition", next: "Kaigo-Emergency" },
      { slug: "Kaigo-Prosedur-Lanjut", cat: "praktik", title: "Prosedur Kaigo Lanjutan 介護手順応用", order: 15, prereq: "Kaigo-Rehabilitasi", next: "Kaigo-Terminal-Care" },
      { slug: "Kaigo-Emergency", cat: "kesehatan", title: "Prosedur Darurat Kaigo 緊急時対応完全ガイド", order: 15, prereq: "Kaigo-Infection-Control", next: "Kaigo-Medis-Lanjut" },
      { slug: "Kaigo-Terminal-Care", cat: "praktik", title: "Terminal Care & Paliatif 終末期ケア", order: 16, prereq: "Kaigo-Prosedur-Lanjut" },
      { slug: "Kaigo-Medis-Lanjut", cat: "kesehatan", title: "Prosedur Medis Kaigo 医療的ケア", order: 16, prereq: "Kaigo-Emergency", next: "Kaigo-Alzheimer-Lanjut" },
      { slug: "Kaigo-Alzheimer-Lanjut", cat: "kesehatan", title: "Alzheimer & Demensia Lanjutan 認知症深化", order: 17, prereq: "Kaigo-Medis-Lanjut", next: "Kaigo-Stroke-Lanjut" },
      { slug: "Kaigo-Stroke-Lanjut", cat: "kesehatan", title: "Perawatan Pasca Stroke 脳卒中後ケア応用", order: 18, prereq: "Kaigo-Alzheimer-Lanjut", next: "Kaigo-Medis-Advanced" },
      { slug: "Kaigo-Medis-Advanced", cat: "kesehatan", title: "Kaigo Medis Lanjutan 医療連携応用", order: 19, prereq: "Kaigo-Stroke-Lanjut", next: "Kaigo-Katan-Kyuin" },
      { slug: "Kaigo-Katan-Kyuin", cat: "kesehatan", title: "Suction Dahak Kaigo", order: 20, prereq: "Kaigo-Medis-Advanced", next: "Kaigo-Keikan-Eiyo" },
      { slug: "Kaigo-Keikan-Eiyo", cat: "kesehatan", title: "Nutrisi Enteral / Tube Feeding", order: 21, prereq: "Kaigo-Katan-Kyuin" }
      ])
    })
  });
})(window);
