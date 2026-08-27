#!/usr/bin/env python3
"""
expand_anatomy.py — Tambah istilah anatomi baru ke anatomy-data.js
Fokus: gerakan, rangka, sirkulasi, byoumei, otot (sistem paling lemah)
"""

import re

ANATOMY_FILE = 'assets/anatomy/anatomy-data.js'

# New terms to add per system
NEW_TERMS = {
    'gerakan': [
        # GENUINELY DIPERBAIKI: entri "kata"/関節 dihapus dari sini -- ini duplikat
        # konten dari term "kansetsu" (関節/Sendi) yang sudah ada di system rangka.
        # Ditemukan saat audit anatomy-data.js menemukan 3 id bentrok akibat bug
        # penyisipan array bersarang di fungsi main() (lihat perbaikan di bawah).
        {
            "id": "hizakansetsu", "system": "gerakan",
            "japanese": "膝関節", "furigana": "ひざかんせつ", "romaji": "hizakansetsu",
            "indonesian": "Sendi Lutut", "english": "Knee Joint",
            "location": "Antara paha dan betis",
            "function": "Menekuk & meluruskan kaki, menahan beban tubuh",
            "kaigoNote": "膝関節症 = gonarthrosis, penyebab utama nyeri lutut lansia.",
            "kaigoExample": "膝関節の曲がり具合を確認します。\n(Saya akan memeriksa derajat tekukan sendi lutut.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "膝関節", "bodyId": None
        },
        {
            "id": "koubukansetsu", "system": "gerakan",
            "japanese": "股関節", "furigana": "こかんせつ", "romaji": "kokansetsu",
            "indonesian": "Sendi Panggul", "english": "Hip Joint",
            "location": "Pertemuan tulang paha dengan panggul",
            "function": "Menopang berat badan, memungkinkan gerak kaki leluasa",
            "kaigoNote": "股関節を壊す = patah pinggul, risiko jatuh paling berbahaya pada lansia.",
            "kaigoExample": "股関節が痛くて歩きにくいですか。\n(Apakah sendi panggul sakit sehingga sulit berjalan?)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "股関節", "bodyId": None
        },
        {
            "id": "kenkoukansetsu", "system": "gerakan",
            "japanese": "肩関節", "furigana": "けんかんせつ", "romaji": "kenkoukansetsu",
            "indonesian": "Sendi Bahu", "english": "Shoulder Joint",
            "location": "Pertemuan tulang lengan atas dan belikat",
            "function": "Memungkinkan gerak lengan paling luas di tubuh",
            "kaigoNote": "五十肩(ごじゅがた) = frozen shoulder, kaku sendi bahu yang umum pada lansia.",
            "kaigoExample": "肩関節をゆっくり回してみてください。\n(Coba putar sendi bahu perlahan.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": ["五十肩"], "audioText": "肩関節", "bodyId": None
        },
        {
            "id": "ujikansetsu", "system": "gerakan",
            "japanese": "手首関節", "furigana": "てくびかんせつ", "romaji": "tekubikansetsu",
            "indonesian": "Sendi Pergelangan Tangan", "english": "Wrist Joint",
            "location": "Antara lengan bawah dan telapak tangan",
            "function": "Memungkinkan gerak pergelangan tangan fleksibel",
            "kaigoNote": "手首をタオルで包む = teknik stabilisasi pergelangan tangan saat transfer.",
            "kaigoExample": "手首を固定してから動かしましょう。\nMari stabilkan pergelangan tangan sebelum digerakkan.",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "手首関節", "bodyId": None
        },
        {
            "id": "senaka-mageru", "system": "gerakan",
            "japanese": "背屈", "furigana": "はいくつ", "romaji": "haikutsu",
            "indonesian": "Dorsofleksi", "english": "Dorsiflexion",
            "location": "Pergelangan kaki",
            "function": "Menarik ujung kaki ke atas (arah tulang kering)",
            "kaigoNote": "背屈制限 = keterbatasan dorsofleksi, meningkatkan risiko jatuh saat berjalan.",
            "kaigoExample": "足の背屈を確認してください。\n(Tolong periksa dorsofleksi pergelangan kakinya.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "背屈", "bodyId": None
        },
        {
            "id": "jutsuku", "system": "gerakan",
            "japanese": "底屈", "furigana": "ていくつ", "romaji": "teikutsu",
            "indonesian": "Plantar fleksi", "english": "Plantarflexion",
            "location": "Pergelangan kaki",
            "function": "Menekuk pergelangan kaki ke bawah (ujung kaki ke bawah)",
            "kaigoNote": "底屈筋力 = kekuatan plantar fleksi, penting untuk keseimbangan berdiri.",
            "kaigoExample": "つま先を下に向けてください。\n(Tunjukkan ujung kaki ke bawah.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "底屈", "bodyId": None
        },
        {
            "id": "kaihyou", "system": "gerakan",
            "japanese": "回旋", "furigana": "かいせん", "romaji": "kaisen",
            "indonesian": "Rotasi", "english": "Rotation",
            "location": "Berbagai sendi (leher, bahu, pinggul)",
            "function": "Memutar tulang sumbu atau anggota gerak",
            "kaigoNote": "回旋可動域 = rentang gerak rotasi, dievaluasi saat cek ROM leher & bahu.",
            "kaigoExample": "首を左右に回してみてください。\n(Coba putar leher ke kiri dan kanan.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "回旋", "bodyId": None
        },
        {
            "id": "soutai", "system": "gerakan",
            "japanese": "外転", "furigana": "がいてん", "romaji": "gaiten",
            "indonesian": "Abduksi", "english": "Abduction",
            "location": "Bahu, pinggul, jari",
            "function": "Menggerakkan anggota gerak menjauhi garis tengah tubuh",
            "kaigoNote": "外転制限 = keterbatasan abduksi, mengganggu kemampuan mengangkat tangan.",
            "kaigoExample": "腕を横に広げてみてください。\n(Coba angkat lengan ke samping.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "外転", "bodyId": None
        },
        {
            "id": "naitai", "system": "gerakan",
            "japanese": "内転", "furigana": "ないてん", "romaji": "naiten",
            "indonesian": "Adduksi", "english": "Adduction",
            "location": "Bahu, pinggul, jari",
            "function": "Menggerakkan anggota gerak mendekati garis tengah tubuh",
            "kaigoNote": "内転筋 = otot aduktor, penting untuk stabilitas berjalan.",
            "kaigoExample": "足を内側に寄せてください。\n(Mendekatkan kaki ke dalam.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "内転", "bodyId": None
        },
    ],
    'rangka': [
        {
            "id": "zenshikotsu", "system": "rangka",
            "japanese": "仙骨", "furigana": "せんこつ", "romaji": "senkotsu",
            "indonesian": "Tulang Sakrum", "english": "Sacrum",
            "location": "Di antara kedua tulang panggul, dasar tulang belakang",
            "function": "Menghubungkan tulang belakang dengan panggul, menahan beban tubuh",
            "kaigoNote": "仙骨骨折 = fraktur sakrum, sering terjadi akibat jatuh pada lansia.",
            "kaigoExample": "仙骨のあたりが痛いですか。\n(Apakah sakit di area tulang sakrum?)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "仙骨", "bodyId": None
        },
        {
            "id": "kyotsukotsu", "system": "rangka",
            "japanese": "尾骨", "furigana": "びこつ", "romaji": "bikotsu",
            "indonesian": "Tulang Ekor", "english": "Coccyx",
            "location": "Ujung paling bawah tulang belakang",
            "function": "Titik penempelan otot dasar panggul & ligamen",
            "kaigoNote": "尾骨痛 = nyeri tulang ekor, sulit didiagnosis karena lokasinya.",
            "kaigoExample": "お尻の一番下が痛いですか。\n(Apakah bagian paling bawah pantat sakit?)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "尾骨", "bodyId": None
        },
        # GENUINELY DIPERBAIKI: entri "daitaikotsu"/大腿骨 dihapus dari sini -- duplikat
        # konten dari term "daitaikotsu" (大腿骨/Femur) yang sudah ada di data asli.
        {
            "id": "kyoutsukotsu", "system": "rangka",
            "japanese": "胸椎", "furigana": "きょうつい", "romaji": "kyoutsui",
            "indonesian": "Tulang Belakang Dada", "english": "Thoracic Vertebrae",
            "location": "Tulang belakang bagian dada (12 ruas)",
            "function": "Menopang rusuk, melindungi organ dada",
            "kaigoNote": "胸椎圧迫骨折 = fraktur kompresi torakika, umum pada osteoporosis lansia.",
            "kaigoExample": "背中が曲がってきた原因是胸椎の変形かもしれません。\n(Punggung yang membungkuk mungkin akibat deformasi torak.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "胸椎", "bodyId": None
        },
        {
            "id": "youitsukotsu", "system": "rangka",
            "japanese": "腰椎", "furigana": "ようつい", "romaji": "youitsui",
            "indonesian": "Tulang Belakang Pinggang", "english": "Lumbar Vertebrae",
            "location": "Tulang belakang bagian pinggang (5 ruas)",
            "function": "Menopang berat badan bagian atas, memungkinkan fleksi pinggang",
            "kaigoNote": "腰椎症 = spondylosis lumbal, penyebab umum nyeri pinggang lansia.",
            "kaigoExample": "腰椎を支える筋肉を鍛えましょう。\n(Mari perkuat otot yang menopang tulang belakang pinggang.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "腰椎", "bodyId": None
        },
        {
            "id": "kabutsubone", "system": "rangka",
            "japanese": "頭蓋骨", "furigana": "ずがいこつ", "romaji": "zugaikotsu",
            "indonesian": "Tengkorak", "english": "Skull",
            "location": "Membungkus otak",
            "function": "Melindungi otak dari cedera",
            "kaigoNote": "頭蓋骨骨折 = fraktur tengkorak, berisiko mengenai otak.",
            "kaigoExample": "頭部を打った場合は直ちに医師に報告してください。\n(Jika terjadi benturan kepala, segera laporkan ke dokter.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "頭蓋骨", "bodyId": None
        },
        {
            "id": "agotsukotsu", "system": "rangka",
            "japanese": "下顎骨", "furigana": "かがくこつ", "romaji": "kagakukotsu",
            "indonesian": "Tulang Rahang Bawah", "english": "Mandible",
            "location": "Rahang bawah, satu-satunya tulang wajah yang bergerak",
            "function": "Mengunyah, berbicara, menelan",
            "kaigoNote": "下顎が外れる = dislokasi rahang bawah, bisa terjadi saat menganga terlalu lebar.",
            "kaigoExample": "口を大きく開けたまま締め込みました。\n(Mulut terkunci saat menganga terlalu lebar.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "下顎骨", "bodyId": None
        },
        {
            "id": "hanshokotsu", "system": "rangka",
            "japanese": "反停止", "furigana": "はんていし", "romaji": "hanteishi",
            "indonesian": "Tulang Selangka", "english": "Clavicle",
            "location": "Menghubungkan tulang dada dengan belikat",
            "function": "Menopang bahu, melindungi pembuluh darah & saraf",
            "kaigoNote": "鎖骨(さこつ)骨折 = fraktur klavikula, cedera umum akibat jatuh.",
            "kaigoExample": "鎖骨のあたりを触ると痛いですか。\n(Apakah sakit saat disentuh area tulang selangka?)",
            "imageHotspot": None, "modelHotspot": None, "aliases": ["鎖骨"], "audioText": "鎖骨", "bodyId": None
        },
        {
            "id": "shikkotsu", "system": "rangka",
            "japanese": "指甲骨", "furigana": "しつこうこつ", "romaji": "shitsukoukotsu",
            "indonesian": "Tulang Patela", "english": "Patella (Kneecap)",
            "location": "Depan sendi lutut",
            "function": "Melindungi sendi lutut, meningkatkan leverage otot paha",
            "kaigoNote": "膝蓋骨(しつがいこつ) = patella, fraktur di sini mengganggu stabilisasi lutut.",
            "kaigoExample": "膝のお皿を叩いて反射を確認します。\n(Saya akan mengetuk tempurung lutut untuk memeriksa refleks.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": ["膝蓋骨"], "audioText": "膝蓋骨", "bodyId": None
        },
        {
            "id": "kyoukyotsu", "system": "rangka",
            "japanese": "肋骨", "furigana": "ろっこつ", "romaji": "rokkotsu",
            "indonesian": "Tulang Rusuk", "english": "Ribs",
            "location": "Membungkus rongga dada dari samping & belakang",
            "function": "Melindungi jantung, paru-paru; membantu pernapasan",
            "kaigoNote": "肋骨骨折 = fraktur rusuk, sering akibat batuk keras pada lansia.",
            "kaigoExample": "咳をするとき胸が痛いですか。\n(Apakah dada sakit saat batuk?)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "肋骨", "bodyId": None
        },
    ],
    'sirkulasi': [
        {
            "id": "shinkoumyaku", "system": "sirkulasi",
            "japanese": "心腔", "furigana": "しんくう", "romaji": "shinkuu",
            "indonesian": "Ruang Jantung", "english": "Heart Chamber",
            "location": "Di dalam otot jantung",
            "function": "4 ruang (serambi kanan-kiri, bilik kanan-kiri) memompa darah",
            "kaigoNote": "心腔の容積 = volume ruang jantung, berkurang seiring usia.",
            "kaigoExample": "心腔の機能を評価するため心エコーをします。\n(Untuk menilai fungsi ruang jantung, dilakukan echocardiography.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "心腔", "bodyId": None
        },
        {
            "id": "doumyakuryuu", "system": "sirkulasi",
            "japanese": "動脈瘤", "furigana": "どうみゃくりゅう", "romaji": "doumyakuryuu",
            "indonesian": "Aneurisma Arteri", "english": "Arterial Aneurysm",
            "location": "Pembuluh nadi yang melemah & membesar",
            "function": "Kondisi berbahaya — pembuluh darah membesar & bisa pecah",
            "kaigoNote": "大動脈瘤 = aneurisma aorta, risiko ruptur yang fatal pada lansia.",
            "kaigoExample": "腹部大動脈瘤の検査を定期的に受けましょう。\n(Lakukan pemeriksaan aneurisma aorta abdominalis secara berkala.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "動脈瘤", "bodyId": None
        },
        {
            "id": "joumyakubyouseki", "system": "sirkulasi",
            "japanese": "静脈瘤", "furigana": "じょうみゃくりゅう", "romaji": "joumyakuryuu",
            "indonesian": "Varises", "english": "Varicose Veins",
            "location": "Pembuluh balik di kaki",
            "function": "Pembuluh vena yang membesar & berkelok akibat katup lemah",
            "kaigoNote": "下肢静脈瘤 = varises ekstremitas bawah, umum pada lansia yang berdiri lama.",
            "kaigoExample": "脚の静脈が浮き出ていませんか。\n(Apakah pembuluh vena kaki menonjol?)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "静脈瘤", "bodyId": None
        },
        {
            "id": "kaiketsu", "system": "sirkulasi",
            "japanese": "血栓", "furigana": "けっせん", "romaji": "kessen",
            "indonesian": "Trombus/Gumpalan Darah", "english": "Blood Clot (Thrombus)",
            "location": "Di dalam pembuluh darah",
            "function": "Gumpalan darah yang menyumbat aliran — berisiko emboli paru atau stroke.",
            "kaigoNote": "深部静脈血栓 = DVT, risiko pada pasien tirah baring lama.",
            "kaigoExample": "長時間寝ていると血栓ができやすいです。\n(Jika berbaring lama, mudah terbentuk gumpalan darah.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": ["DVT"], "audioText": "血栓", "bodyId": None
        },
        {
            "id": "houboumyaku", "system": "sirkulasi",
            "japanese": "網膜動脈", "furigana": "もうまくどうみゃく", "romaji": "moumakudoumyaku",
            "indonesian": "Arteri Retina", "english": "Retinal Artery",
            "location": "Di dalam bola mata",
            "function": "Membawa darah kaya oksigen ke retina",
            "kaigoNote": "網膜動脈閉塞症 = oklusi arteri retina, stroke mata — kebutaan mendadak.",
            "kaigoExample": "急に目が見えなくなりました。\n(Tiba-tiba penglihatan hilang.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "網膜動脈", "bodyId": None
        },
        {
            "id": "jiritsushinkei-bu", "system": "sirkulasi",
            "japanese": "自律神経", "furigana": "じりつしんけい", "romaji": "jiritsushinkei",
            "indonesian": "Sistem Saraf Otonom", "english": "Autonomic Nervous System",
            "location": "Di sepanjang sumsum tulang belakang & organ dalam",
            "function": "Mengatur detak jantung, tekanan darah, pencernaan tanpa sadar",
            "kaigoNote": "自律神経失調症 = disautonomia, gangguan keseimbangan simpatis-parasimpatis.",
            "kaigoExample": "自律神経が乱れると眠れなくなります。\n(Jika saraf otonom terganggu, sulit tidur.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "自律神経", "bodyId": None
        },
        {
            "id": "tousuishinkei", "system": "sirkulasi",
            "japanese": "動眼神経", "furigana": "どうがんしんけい", "romaji": "douganshinkei",
            "indonesian": "Saraf Oculomotorius", "english": "Oculomotor Nerve (CN III)",
            "location": "Dari batang otak ke mata",
            "function": "Menggerakkan bola mata, mengatur ukuran pupil",
            "kaigoNote": "動眼神経麻痺 = paralisis saraf oculomotorius, bisa tanda stroke.",
            "kaigoExample": "瞳孔の大きさが左右で異なりますね。\n(Ukuran pupil kanan-kiri berbeda ya.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "動眼神経", "bodyId": None
        },
        {
            "id": "meninge", "system": "sirkulasi",
            "japanese": "髄膜", "furigana": "ずいまく", "romaji": "zuimaku",
            "indonesian": "Selaput Otak (Meninges)", "english": "Meninges",
            "location": "Membungkus otak & sumsum tulang belakang",
            "function": "3 lapis pelindung: dura mater, arachnoid, pia mater",
            "kaigoNote": "髄膜炎 = meningitis, peradangan selaput otak — demam tinggi + kaku leher.",
            "kaigoExample": "髄膜炎の疑いがあるので検査が必要です.\n(Kecurigaan meningitis, pemeriksaan diperlukan.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "髄膜", "bodyId": None
        },
        {
            "id": "noukaikei", "system": "sirkulasi",
            "japanese": "脳室", "furigana": "のうしつ", "romaji": "nou-shitsu",
            "indonesian": "Ventrikel Otak", "english": "Brain Ventricles",
            "location": "Di dalam otak, berisi cairan serebrospinal",
            "function": "Menghasilkan & mengalirkan cairan CSF untuk melindungi otak",
            "kaigoNote": "水頭症 = hidrosefalus, penumpukan CSF di ventrikel — memperbesar kepala pada bayi.",
            "kaigoExample": "脳室が拡大していないかMRIで確認します.\n(Pemeriksaan MRI untuk memastikan ventrikel tidak membesar.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "脳室", "bodyId": None
        },
    ],
    'byoumei': [
        {
            "id": "hiza-kanousei", "system": "byoumei",
            "japanese": "変形性膝関節症", "furigana": "へんせいせいひざかんせつしょう", "romaji": "henseisei-hizakansetsushou",
            "indonesian": "Osteoarthritis Lutut", "english": "Knee Osteoarthritis",
            "location": "Sendi lutut",
            "function": "Degenerasi rawan sendi lutut — nyeri, kaku, bengkak",
            "kaigoNote": "Penyebab utama nyeri lutut lansia — membatasi jalan & naik-turun tangga.",
            "kaigoExample": "変形性膝関節症で歩行が困難になりました。\n(Kesulitan berjalan akibat osteoarthritis lutut.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "変形性膝関節症", "bodyId": None
        },
        {
            "id": "kokkyoutsu-kekkanbyou", "system": "byoumei",
            "japanese": "狭心症", "furigana": "きょうしんしょう", "romaji": "kyoushinshou",
            "indonesian": "Angina Pektoris", "english": "Angina Pectoris",
            "location": "Jantung & pembuluh koroner",
            "function": "Sirkulasi darah ke otot jantung terhambat — nyeri dada",
            "kaigoNote": "胸が締め付けられるような痛み = nyeri dada seperti ditekan — tanda angina.",
            "kaigoExample": "胸が苦しくて動けません.\n(Dada terasa sesak hingga tidak bisa bergerak.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "狭心症", "bodyId": None
        },
        {
            "id": "kosokuchuusenbyou", "system": "byoumei",
            "japanese": "虚血性脳卒中", "furigana": "きょけつせいのうそっちゅう", "romaji": "kyokusetsusei-nousocchuu",
            "indonesian": "Stroke Iskemik", "english": "Ischemic Stroke",
            "location": "Pembuluh darah otak",
            "function": "Penyumbatan pembuluh darah otak — kematian jaringan otak",
            "kaigoNote": "80% stroke adalah tipe iskemik — darah ke otak terhambat oleh trombus/embolus.",
            "kaigoExample": "片方の手足が動かなくなりました.\n(Salah satu lengan/kaki tidak bisa digerakkan.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "虚血性脳卒中", "bodyId": None
        },
        {
            "id": "shoukakunaiyou", "system": "byoumei",
            "japanese": "消化管出血", "furigana": "しょうかかんしゅっけつ", "romaji": "shoukakkan-shukketsu",
            "indonesian": "Perdarahan GI", "english": "Gastrointestinal Bleeding",
            "location": "Saluran pencernaan",
            "function": "Perdarahan dari lambung, usus, atau kerongkongan",
            "kaigoNote": "吐血(とけつ) = muntah darah; 下血(げけつ) = BAB berdarah — laporkan segera.",
            "kaigoExample": "お便りに血が混じっています.\n(Kotoran bercampur darah.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "消化管出血", "bodyId": None
        },
        {
            "id": "nyouzui-suishou", "system": "byoumei",
            "japanese": "尿路結石", "furigana": "にょうろけっせき", "romaji": "nyourokesseki",
            "indonesian": "Batu Saluran Kemih", "english": "Urinary Stones (Nephrolithiasis)",
            "location": "Ginjal, ureter, kandung kemih",
            "function": "Kristal mineral mengeras di saluran kemih — nyeri hebat",
            "kaigoNote": "腰側の激しい痛み = nyeri hebat di sisi pinggang, bisa menjalar ke pangkal paha.",
            "kaigoExample": "腰の横が激しく痛いです.\n(Sisi pinggang terasa sangat sakit.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "尿路結石", "bodyId": None
        },
        {
            "id": "houjoubunpitoubyou", "system": "byoumei",
            "japanese": "冬肥分泌統病", "furigana": "とうひぶんぴつとうびょう", "romaji": "touhibunpitoubyou",
            "indonesian": "Diabetes Mellitus Tipe 2", "english": "Type 2 Diabetes Mellitus",
            "location": "Seluruh tubuh (metabolisme gula darah)",
            "function": "Resistensi insulin — gula darah tinggi kronis",
            "kaigoNote": "Paling umum pada lansia — komplikasi: neuropati, retinopati, nefropati.",
            "kaigoExample": "血糖値が高くて薬を飲んでいます.\n(Gula darah tinggi dan sedang minum obat.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": ["糖尿病"], "audioText": "糖尿病", "bodyId": None
        },
        {
            "id": "naibunpitoubyou", "system": "byoumei",
            "japanese": "認知症", "furigana": "にんちしょう", "romaji": "ninchishou",
            "indonesian": "Demensia", "english": "Dementia",
            "location": "Otak",
            "function": "Penurunan fungsi kognitif — memori, orientasi, perilaku",
            "kaigoNote": "Alzheimer(アルツハイマー) adalah tipe paling umum — 60-70% kasus demensia.",
            "kaigoExample": "最近物忘れが増えました.\n(Belakangan ini lupa-lupa semakin sering.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": ["アルツハイマー型認知症"], "audioText": "認知症", "bodyId": None
        },
        {
            "id": "zutsuu", "system": "byoumei",
            "japanese": "偏頭痛", "furigana": "へんずつう", "romaji": "henzutsuu",
            "indonesian": "Migrain", "english": "Migraine",
            "location": "Kepala (sering sepihak)",
            "function": "Sakit kepala berdenyut yang bisa disertai mual & fotosensitivitas",
            "kaigoNote": "前兆(ぜんちょう) = aura — kilat/pandangan kabur sebelum nyeri muncul.",
            "kaigoExample": "光が眩しくて頭が痛いです.\n(Cahaya terlalu silau dan kepala sakit.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "偏頭痛", "bodyId": None
        },
        {
            "id": "konbukkyoukou", "system": "byoumei",
            "japanese": "便秘", "furigana": "べんぴ", "romaji": "benpi",
            "indonesian": "Konstipasi", "english": "Constipation",
            "location": "Usus besar",
            "function": "BAB sulit, kurang dari 3x seminggu, tinja keras",
            "kaigoNote": "Sangat umum pada lansia — pengaruh obat, kurang gerak, kurang serat.",
            "kaigoExample": "3日間排便がありません.\n(Sudah 3 hari tidak BAB.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "便秘", "bodyId": None
        },
        {
            "id": "teioubyou", "system": "byoumei",
            "japanese": "低血圧", "furigana": "ていけつあつ", "romaji": "teiketsuatsu",
            "indonesian": "Hipotensi", "english": "Hypotension",
            "location": "Pembuluh darah arteri",
            "function": "Tekanan darah sistolik < 90 mmHg — risiko pusing & jatuh",
            "kaigoNote": "起立性低血圧 = hipotensi ortostatik — pusing saat berdiri dari duduk/berbaring.",
            "kaigoExample": "立ち上がるとめまいがします.\n(Pusing saat berdiri.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": ["起立性低血圧"], "audioText": "低血圧", "bodyId": None
        },
    ],
    'otot': [
        {
            "id": "daitaikinniku", "system": "otot",
            "japanese": "大腿筋", "furigana": "だいたいきん", "romaji": "daitaikin",
            "indonesian": "Otot Paha", "english": "Quadriceps Femoris",
            "location": "Bagian depan paha",
            "function": "Menekuk lutut & menegakkan tubuh dari posisi duduk",
            "kaigoNote": "大腿筋力 = kekuatan otot paha, kunci untuk naik-turun kursi & berjalan.",
            "kaigoExample": "大腿筋を鍛えて歩行を安定させましょう.\n(Mari perkuat otot paha untuk stabilisasi berjalan.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "大腿筋", "bodyId": None
        },
        {
            "id": "houkin", "system": "otot",
            "japanese": "腹筋", "furigana": "ふくきん", "romaji": "fukukin",
            "indonesian": "Otot Perut", "english": "Abdominal Muscles",
            "location": "Rongga perut",
            "function": "Menopang postur, membantu batuk & BAB",
            "kaigoNote": "腹筋が弱い = otot perut lemah, memengaruhi kemampuan batuk & bangun dari tidur.",
            "kaigoExample": "腹筋が弱いと咳き込めなくなります.\n(Jika otot perut lemah, sulit batuk.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "腹筋", "bodyId": None
        },
        {
            "id": "senbackinniku", "system": "otot",
            "japanese": "背筋", "furigana": "はいきん", "romaji": "haikin",
            "indonesian": "Otot Punggung", "english": "Erector Spinae",
            "location": "Sepanjang tulang belakang",
            "function": "Menegakkan tubuh, menjaga postur",
            "kaigoNote": "背筋が弱い = otot punggung lemah, memperparah postur membungkuk lansia.",
            "kaigoExample": "背筋を強化するエクササイズをしましょう.\n(Mari lakukan latihan penguat otot punggung.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "背筋", "bodyId": None
        },
        {
            "id": "ashi-no-otot", "system": "otot",
            "japanese": "下腿三頭筋", "furigana": "かたいさんとうきん", "romaji": "kataisantoukin",
            "indonesian": "Otot Betis (Triceps Surae)", "english": "Triceps Surae (Gastrocnemius + Soleus)",
            "location": "Bagian belakang betis",
            "function": "Plantar fleksi pergelangan kaki — dorongan saat berjalan",
            "kaigoNote": "下腿三頭筋萎缩 = atrofi otot betis, sering terjadi pada pasien tirah baring.",
            "kaigoExample": "つま先立ちをしてみてください.\n(Coba berjinjit.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": [], "audioText": "下腿三頭筋", "bodyId": None
        },
        {
            "id": "koutoubunniku", "system": "otot",
            "japanese": "喉頭筋", "furigana": "こうとうきん", "romaji": "koutoukin",
            "indonesian": "Otot Laring", "english": "Laryngeal Muscles",
            "location": "Tenggorokan (laring)",
            "function": "Mengatur suara & menutup jalan napas saat menelan",
            "kaigoNote": "喉頭蓋(こうとうがい) = epiglotis — menutup jalan napas saat makan, mencegah误嚥.",
            "kaigoExample": "喉頭蓋がきちんと閉じないと誤嚥します.\n(Jika epiglotis tidak menutup sempurna, terjadi aspirasi.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": ["喉頭蓋"], "audioText": "喉頭筋", "bodyId": None
        },
        {
            "id": "jyouhyoukinniku", "system": "otot",
            "japanese": "表情筋", "furigana": "ひょうじょうきん", "romaji": "hyoujoukin",
            "indonesian": "Otot Ekspresi Wajah", "english": "Facial Expression Muscles",
            "location": "Di bawah kulit wajah",
            "function": "Menghasilkan ekspresi wajah — tersenyum, mengerutkan alis, dll.",
            "kaigoNote": "表情筋麻痺 = paralisis wajah (Bell's palsy) — satu sisi wajah lumpuh.",
            "kaigoExample": "片方の口角が下がっていますね.\n(Sudut mulut satu sisi turun ya.)",
            "imageHotspot": None, "modelHotspot": None, "aliases": ["ボケ筋"], "audioText": "表情筋", "bodyId": None
        },
    ],
}

def main():
    with open(ANATOMY_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Idempotency: skip terms that already exist in the file
    existing_jp = set(re.findall(r'"japanese":\s*"([^"]+)"', content))
    
    total_added = 0
    skipped = 0
    
    for system_name, terms in NEW_TERMS.items():
        # Filter out already-existing terms
        original_count = len(terms)
        terms = [t for t in terms if t['japanese'] not in existing_jp]
        skipped_count = original_count - len(terms)
        skipped += skipped_count
        if not terms:
            print(f'Skipped {system_name}: all {original_count} terms already exist')
            continue
        # Find the closing of the terms array for this system
        # Pattern: look for the system block and find where its "terms" array ends
        
        # Find the system's terms array start
        sys_pattern = f'"{system_name}":'
        sys_idx = content.find(sys_pattern)
        if sys_idx == -1:
            print(f'WARNING: System {system_name} not found')
            continue
        
        # Find "terms": [ after the system start
        terms_start = content.find('"terms":', sys_idx)
        if terms_start == -1:
            print(f'WARNING: terms not found for {system_name}')
            continue
        
        # Find the [ after "terms":
        bracket_start = content.find('[', terms_start)
        
        # Count depth to find matching ]
        depth = 0
        i = bracket_start
        while i < len(content):
            if content[i] == '[':
                depth += 1
            elif content[i] == ']':
                depth -= 1
                if depth == 0:
                    # This is the end of the terms array
                    # Insert new terms before the closing ]
                    # GENUINELY DIPERBAIKI: versi sebelumnya memakai json.dumps(terms, ...)
                    # atas SELURUH LIST sekaligus -- itu menghasilkan string berbungkus
                    # "[...]" (karena `terms` adalah list), yang kalau disisipkan langsung
                    # menjadi SUB-ARRAY BERSARANG di dalam array "terms" yang sudah ada,
                    # bukan elemen-elemen sibling. Akibatnya `terms.length` di JS meleset
                    # (elemen baru "tersembunyi" sebagai satu elemen array-di-dalam-array)
                    # dan tiap elemen individual tidak pernah dirender sebagai term asli.
                    # Dikonfirmasi nyata di anatomy-data.js: 5 sistem (gerakan/rangka/
                    # sirkulasi/byoumei/otot) semuanya kena, TOTAL_TERMS 178 vs count
                    # riil cuma 138 sebelum diperbaiki manual.
                    # Perbaikan: dump SETIAP term SATU PER SATU (bukan seluruh list),
                    # supaya hasilnya genuinely jadi elemen sibling, bukan sub-array.
                    term_strs = []
                    for t in terms:
                        term_json = json.dumps(t, indent=2, ensure_ascii=False)
                        reindented = '\n'.join('      ' + line for line in term_json.split('\n'))
                        term_strs.append(reindented)
                    insert_text = ',\n' + ',\n'.join(term_strs)

                    content = content[:i] + insert_text + content[i:]
                    total_added += len(terms)
                    print(f'Added {len(terms)} terms to {system_name}')
                    break
            i += 1
    
    with open(ANATOMY_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'\nTotal: {total_added} terms added')
    if skipped:
        print(f'Skipped: {skipped} terms (already exist)')
    # Count total in file after changes
    with open(ANATOMY_FILE, 'r', encoding='utf-8') as f:
        final = f.read()
    final_count = len(re.findall(r'"japanese":\s*"([^"]+)"', final))
    print(f'New total: {final_count} terms')

import json
if __name__ == '__main__':
    main()
