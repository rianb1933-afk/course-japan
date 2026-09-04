/* Data & interaksi Materi/Kosakata-N5.html.
 * Dipindahkan dari <script> inline agar bisa di-cache terpisah
 * dari markup halamannya. Dimuat dengan defer.
 */

const VOCAB = [["ああ","ああ","ah, oh (seruan)"],["会う","あう","bertemu, berjumpa"],["青","あお","biru"],["青い","あおい","biru (warna)"],["赤","あか","merah"],["赤い","あかい","merah (warna)"],["明るい","あかるい","terang; ceria"],["秋","あき","musim gugur"],["開く","あく","terbuka"],["開ける","あける","membuka"],["上げる","あげる","menaikkan, mengangkat"],["朝","あさ","pagi"],["朝御飯","あさごはん","sarapan"],["明後日","あさって","lusa"],["足; 脚","あし","kaki; tungkai"],["明日","あした","besok"],["あそこ","あそこ","situ, di sana (jauh)"],["遊ぶ","あそぶ","bermain"],["頭","あたま","kepala"],["新しい","あたらしい","baru"],["あちら","あちら","sana (sopan); ke arah sana"],["暑い","あつい","panas (cuaca)"],["熱い","あつい","panas (benda)"],["厚い","あつい","tebal; hangat (hati)"],["あっち","あっち","sana (kasual)"],["後","あと","sesudah; nanti, kemudian"],["あなた","あなた","kamu, Anda"],["兄","あに","kakak laki-laki (saya)"],["姉","あね","kakak perempuan (saya)"],["アパート","アパート","apartemen"],["あの","あの","itu (jauh); anu…"],["浴びる","あびる","mandi (berendam/bersiram)"],["危ない","あぶない","berbahaya"],["甘い","あまい","manis; lunak (sikap)"],["余り","あまり","tidak begitu…; sisa, lebih"],["雨","あめ","hujan"],["飴","あめ","permen"],["洗う","あらう","mencuci"],["在る","ある","ada, berada (benda)"],["有る","ある","ada; punya"],["歩く","あるく","berjalan"],["あれ","あれ","itu (yang jauh)"],["いい; よい","いい; よい","baik, bagus"],["いいえ","いいえ","bukan; tidak"],["言う","いう","mengatakan, berkata"],["家","いえ","rumah"],["いかが","いかが","bagaimana (sopan)"],["行く","いく; ゆく","pergi"],["いくつ","いくつ","berapa (banyak/umur)"],["いくら","いくら","berapa (harga)"],["池","いけ","kolam"],["医者","いしゃ","dokter"],["椅子","いす","kursi"],["忙しい","いそがしい","sibuk"],["痛い","いたい","sakit (terasa nyeri)"],["一","いち","satu"],["一日","いちにち","satu hari (lamanya)"],["一番","いちばん","nomor satu, paling"],["いつ","いつ","kapan"],["五日","いつか","lima hari; tanggal 5"],["一緒","いっしょ","bersama-sama"],["五つ","いつつ","lima (benda)"],["いつも","いつも","selalu, biasanya"],["犬","いぬ","anjing"],["今","いま","sekarang"],["意味","いみ","arti, makna"],["妹","いもうと","adik perempuan"],["嫌","いや","tidak suka, tidak enak (perasaan)"],["入口","いりぐち","pintu masuk"],["居る","いる","ada (makhluk hidup)"],["要る","いる","perlu, membutuhkan"],["入れる","いれる","memasukkan"],["色","いろ","warna"],["色々","いろいろ","bermacam-macam"],["上","うえ","atas, di atas"],["後ろ","うしろ","belakang"],["薄い","うすい","tipis; lemah, encer"],["歌","うた","lagu"],["歌う","うたう","bernyanyi, menyanyi"],["うち","うち","rumah (sendiri); kami"],["生まれる","うまれる","dilahirkan, lahir"],["海","うみ","laut; pantai"],["売る","うる","menjual"],["うるさい","うるさい","berisik, menyebalkan"],["上着","うわぎ","jaket, baju luar"],["絵","え","gambar, lukisan"],["映画","えいが","film"],["映画館","えいがかん","bioskop"],["英語","えいご","bahasa Inggris"],["ええ","ええ","ya (kasual)"],["駅","えき","stasiun"],["エレベーター","エレベーター","lift, elevator"],["～円","～えん","~ yen (mata uang)"],["鉛筆","えんぴつ","pensil"],["お～","お～","~ (awalan hormat)"],["美味しい","おいしい","lezat, enak"],["多い","おおい","banyak"],["大きい","おおきい","besar"],["大きな","おおきな","besar (atributif)"],["大勢","おおぜい","banyak orang"],["お母さん","おかあさん","ibu"],["お菓子","おかし","kue, camilan"],["お金","おかね","uang"],["起きる","おきる","bangun (tidur); terjadi"],["置く","おく","meletakkan, menaruh"],["奥さん","おくさん","istri (orang lain)"],["お酒","おさけ","minuman keras, sake"],["お皿","おさら","piring"],["伯父; 叔父さん","おじさん","paman"],["おじいさん","おじいさん","kakek"],["教える","おしえる","mengajar, memberi tahu"],["押す","おす","menekan, mendorong"],["遅い","おそい","lambat; terlambat"],["お茶","おちゃ","teh (hijau)"],["お手洗い","おてあらい","toilet, kamar kecil"],["お父さん","おとうさん","ayah"],["弟","おとうと","adik laki-laki"],["男","おとこ","laki-laki, pria"],["男の子","おとこのこ","anak laki-laki"],["一昨日","おととい","kemarin lusa"],["おととし","おととし","dua tahun lalu"],["大人","おとな","orang dewasa"],["お腹","おなか","perut"],["同じ","おなじ","sama"],["お兄さん","おにいさん","kakak laki-laki (orang lain)"],["お姉さん","おねえさん","kakak perempuan (orang lain)"],["伯母さん; 叔母さん","おばさん","bibi"],["おばあさん","おばあさん","nenek"],["お弁当","おべんとう","bekal makan (bento)"],["覚える","おぼえる","mengingat, menghafal"],["おまわりさん","おまわりさん","polisi (akrab)"],["重い","おもい","berat"],["面白い","おもしろい","menarik, lucu"],["泳ぐ","およぐ","berenang"],["降りる","おりる","turun (dari kendaraan)"],["終る","おわる","selesai, berakhir"],["音楽","おんがく","musik"],["女","おんな","perempuan, wanita"],["女の子","おんなのこ","anak perempuan"],["～回","～かい","~ kali"],["～階","～かい","~ lantai (tingkat)"],["外国","がいこく","luar negeri"],["外国人","がいこくじん","orang asing"],["会社","かいしゃ","perusahaan"],["階段","かいだん","tangga"],["買い物","かいもの","belanja"],["買う","かう","membeli"],["返す","かえす","mengembalikan"],["帰る","かえる","pulang, kembali"],["顔","かお","wajah"],["かかる","かかる","memakan (waktu/biaya); butuh"],["鍵","かぎ","kunci"],["書く","かく","menulis"],["学生","がくせい","pelajar, mahasiswa"],["～か月","～かげつ","~ bulan (lamanya)"],["掛ける","かける","memakai (kacamata); menggantung"],["かける","かける","menelepon; duduk (silakan)"],["傘","かさ","payung"],["貸す","かす","meminjamkan"],["風","かぜ","angin"],["風邪","かぜ","masuk angin, pilek, flu"],["方","かた","cara; ~ (orang, hormat)"],["家族","かぞく","keluarga"],["片仮名","かたかな","katakana"],["～月","～がつ","bulan ~ (nama bulan)"],["学校","がっこう","sekolah"],["カップ","カップ","cangkir, gelas (cup)"],["家庭","かてい","rumah tangga, keluarga"],["角","かど","sudut, pojok"],["かばん","かばん","tas"],["花瓶","かびん","vas bunga"],["かぶる","かぶる","memakai (topi)"],["紙","かみ","kertas"],["カメラ","カメラ","kamera"],["火曜日","かようび","Selasa"],["辛い","からい","pedas; asin"],["体","からだ","badan, tubuh"],["借りる","かりる","meminjam"],["～がる","～がる","~ (merasa/berperilaku, sufiks)"],["軽い","かるい","ringan"],["カレー","カレー","kari"],["カレンダー","カレンダー","kalender"],["川; 河","かわ","sungai"],["可愛い","かわいい","imut, menggemaskan"],["漢字","かんじ","kanji (aksara Tionghoa-Jepang)"],["木","き","pohon; kayu"],["黄色","きいろ","kuning"],["黄色い","きいろい","kuning (warna)"],["消える","きえる","hilang, padam"],["聞く","きく","mendengar; bertanya"],["北","きた","utara"],["ギター","ギター","gitar"],["汚い","きたない","kotor"],["喫茶店","きっさてん","kafe, kedai kopi"],["切手","きって","perangko"],["切符","きっぷ","tiket"],["昨日","きのう","kemarin"],["九","きゅう","sembilan"],["牛肉","ぎゅうにく","daging sapi"],["牛乳","ぎゅうにゅう","susu"],["今日","きょう","hari ini"],["教室","きょうしつ","ruang kelas"],["兄弟","きょうだい","saudara kandung (laki-laki)"],["去年","きょねん","tahun lalu"],["嫌い","きらい","tidak suka, benci"],["切る","きる","memotong; menutup telepon"],["着る","きる","memakai (pakaian)"],["綺麗","きれい","cantik; bersih, rapi"],["キロ; キログラム","キロ; キログラム","kilo (kilogram)"],["キロ; キロメートル","キロ; キロメートル","kilo (kilometer)"],["銀行","ぎんこう","bank"],["金曜日","きんようび","Jumat"],["九","く","sembilan"],["薬","くすり","obat"],["下さい","ください","tolong ~ (mohon lakukan)"],["果物","くだもの","buah-buahan"],["口","くち","mulut"],["靴","くつ","sepatu"],["靴下","くつした","kaus kaki"],["国","くに","negara"],["曇り","くもり","berawan"],["曇る","くもる","menjadi berawan, mendung"],["暗い","くらい","gelap"],["～くらい; ぐらい","～くらい; ぐらい","sekitar ~, kira-kira ~"],["クラス","クラス","kelas"],["グラム","グラム","gram"],["来る","くる","datang"],["車","くるま","mobil"],["黒","くろ","hitam"],["黒い","くろい","hitam (warna)"],["警官","けいかん","polisi"],["今朝","けさ","pagi ini"],["消す","けす","menghapus; mematikan"],["結構","けっこう","baik, lumayan; cukup (menolak halus)"],["結婚","けっこん (する)","pernikahan, menikah"],["月曜日","げつようび","Senin"],["玄関","げんかん","pintu masuk (rumah), serambi"],["元気","げんき","sehat, semangat, bugar"],["～個","～こ","~ buah (benda kecil)"],["五","ご","lima"],["～語","～ご","~ bahasa (akhiran nama bahasa)"],["公園","こうえん","taman"],["交差点","こうさてん","perempatan, persimpangan"],["紅茶","こうちゃ","teh hitam"],["交番","こうばん","pos polisi"],["声","こえ","suara"],["コート","コート","mantel; lapangan (tenis)"],["コーヒー","コーヒー","kopi"],["ここ","ここ","di sini"],["午後","ごご","sore, siang (PM)"],["九日","ここのか","sembilan hari; tanggal 9"],["九つ","ここのつ","sembilan (benda)"],["午前","ごぜん","pagi (AM)"],["答える","こたえる","menjawab"],["こちら","こちら","sini (sopan); orang ini"],["こっち","こっち","sini (kasual)"],["コップ","コップ","gelas (minum)"],["今年","ことし","tahun ini"],["言葉","ことば","kata, bahasa, ungkapan"],["子供","こども","anak-anak"],["この","この","ini"],["御飯","ごはん","nasi; makanan"],["コピーする","コピーする","memfotokopi, menyalin"],["困る","こまる","kebingungan, kesulitan"],["これ","これ","ini"],["～ころ; ～ごろ","～ころ; ～ごろ","sekitar ~ (waktu)"],["今月","こんげつ","bulan ini"],["今週","こんしゅう","minggu ini"],["こんな","こんな","seperti ini"],["今晩","こんばん","malam ini"],["さあ","さあ","ayo; nah, begini"],["～歳","～さい","~ tahun (umur)"],["財布","さいふ","dompet"],["魚","さかな","ikan"],["先","さき","nanti, yang akan datang; sebelumnya"],["咲く","さく","mekar, berbunga"],["作文","さくぶん","karangan, komposisi"],["差す","さす","menaikkan (tangan); menyorot; memakai (payung)"],["～冊","～さつ","~ jilid (buku)"],["雑誌","ざっし","majalah"],["砂糖","さとう","gula"],["寒い","さむい","dingin (cuaca)"],["さ来年","さらいねん","tahun lusa (dua tahun lagi)"],["～さん","～さん","Bapak/Ibu/Saudara ~ (sapaan)"],["三","さん","tiga"],["散歩","さんぽ (する)","jalan-jalan santai"],["四","し","empat"],["～時","～じ","pukul ~"],["塩","しお","garam"],["しかし","しかし","akan tetapi, namun"],["時間","じかん","waktu, jam"],["～時間","～じかん","~ jam (lamanya)"],["仕事","しごと","pekerjaan"],["辞書","じしょ","kamus"],["静か","しずか","tenang, sepi"],["下","した","bawah, di bawah"],["七","しち","tujuh"],["質問","しつもん","pertanyaan"],["自転車","じてんしゃ","sepeda"],["自動車","じどうしゃ","mobil (kendaraan bermotor)"],["死ぬ","しぬ","mati"],["字引","じびき","kamus"],["自分","じぶん","diri sendiri"],["閉まる","しまる","tertutup, menutup (sendiri)"],["閉める","しめる","menutup"],["締める","しめる","mengikat, mengencangkan"],["じゃ; じゃあ","じゃ; じゃあ","kalau begitu; sampai jumpa"],["写真","しゃしん","foto"],["シャツ","シャツ","kemeja"],["シャワー","シャワー","pancuran, shower"],["十","じゅう","sepuluh"],["～中","～じゅう","sepanjang ~, selama ~"],["～週間","～しゅうかん","~ minggu (lamanya)"],["授業","じゅぎょう","pelajaran, jam pelajaran"],["宿題","しゅくだい","pekerjaan rumah (PR)"],["上手","じょうず","pandai, mahir"],["丈夫","じょうぶ","kuat, kokoh; sehat"],["醤油","しょうゆ","kecap asin (shoyu)"],["食堂","しょくどう","kantin, ruang makan"],["知る","しる","mengetahui, mengenal"],["白","しろ","putih"],["白い","しろい","putih (warna)"],["～人","～じん","~ orang; bangsa ~"],["新聞","しんぶん","koran, surat kabar"],["水曜日","すいようび","Rabu"],["吸う","すう","menghisap; menarik napas"],["スカート","スカート","rok"],["好き","すき","suka, senang"],["～すぎ","～すぎ","terlalu ~"],["少ない","すくない","sedikit"],["すぐに","すぐに","segera, langsung"],["少し","すこし","sedikit"],["涼しい","すずしい","sejuk, nyaman"],["～ずつ","～ずつ","masing-masing ~; tiap kali ~"],["ストーブ","ストーブ","pemanas (penghangat ruangan)"],["スプーン","スプーン","sendok"],["スポーツ","スポーツ","olahraga"],["ズボン","ズボン","celana panjang"],["住む","すむ","tinggal, menetap"],["する","する","melakukan; memakai (asesori)"],["座る","すわる","duduk"],["背","せい","tinggi badan; punggung"],["生徒","せいと","murid, siswa"],["セーター","セーター","sweater, sweter"],["石鹸","せっけん","sabun"],["背広","せびろ","setelan jas pria"],["狭い","せまい","sempit"],["ゼロ","ゼロ","nol"],["千","せん","seribu"],["先月","せんげつ","bulan lalu"],["先週","せんしゅう","minggu lalu"],["先生","せんせい","guru, dosen; dokter"],["洗濯","せんたく","cucian, mencuci (pakaian)"],["全部","ぜんぶ","semua, seluruhnya"],["そう; そうです","そう; そうです","ya, begitu; benar (demikian)"],["掃除","そうじ (する)","membersihkan (bersih-bersih)"],["そうして; そして","そうして; そして","lalu, kemudian"],["そこ","そこ","situ, di sana (dekat lawan bicara)"],["そちら","そちら","sana (sopan); pihak Anda"],["そっち","そっち","sana (kasual)"],["外","そと","luar"],["その","その","itu"],["そば","そば","dekat, samping; soba (mi)"],["空","そら","langit"],["それ","それ","itu"],["それから","それから","lalu, setelah itu"],["それでは","それでは","kalau begitu"],["～台","～だい","~ unit (kendaraan/mesin)"],["大学","だいがく","universitas, perguruan tinggi"],["大使館","たいしかん","kedutaan besar"],["大丈夫","だいじょうぶ","tidak apa-apa, aman"],["大好き","だいすき","sangat suka"],["大切","たいせつ","penting"],["台所","だいどころ","dapur"],["大変","たいへん","sangat; berat, susah"],["高い","たかい","tinggi; mahal"],["～だけ","～だけ","hanya ~, saja"],["沢山","たくさん","banyak"],["タクシー","タクシー","taksi"],["出す","だす","mengeluarkan; menyerahkan"],["～たち","～たち","~ (jamak orang)"],["立つ","たつ","berdiri"],["たて","たて","baru saja ~; panjang/tinggi"],["建物","たてもの","bangunan, gedung"],["楽しい","たのしい","menyenangkan, gembira"],["頼む","たのむ","meminta tolong, menitipkan"],["たばこ","たばこ","rokok, tembakau"],["多分","たぶん","mungkin, barangkali"],["食べ物","たべもの","makanan"],["食べる","たべる","makan"],["卵","たまご","telur"],["誰","だれ","siapa"],["誰か","だれか","seseorang"],["誕生日","たんじょうび","ulang tahun"],["段々","だんだん","lambat laun, berangsur-angsur; tangga"],["小さい","ちいさい","kecil"],["小さな","ちいさな","kecil (atributif)"],["近い","ちかい","dekat"],["違う","ちがう","berbeda; salah"],["近く","ちかく","dekat, sekitar"],["地下鉄","ちかてつ","kereta bawah tanah"],["地図","ちず","peta"],["父","ちち","ayah (saya)"],["茶色","ちゃいろ","cokelat"],["茶碗","ちゃわん","mangkuk nasi"],["～中","～ちゅう","sedang ~, dalam ~"],["丁度","ちょうど","tepat, persis"],["ちょっと","ちょっと","sedikit; sebentar; agak…"],["一日","ついたち","tanggal 1"],["使う","つかう","memakai, menggunakan"],["疲れる","つかれる","lelah, capai"],["次","つぎ","berikutnya"],["着く","つく","tiba, sampai"],["机","つくえ","meja (tulis)"],["作る","つくる","membuat"],["つける","つける","menyalakan; memasang; mencatat"],["勤める","つとめる","bekerja (di perusahaan)"],["つまらない","つまらない","membosankan; sepele"],["冷たい","つめたい","dingin (benda/sikap)"],["強い","つよい","kuat"],["手","て","tangan"],["テープ","テープ","pita, selotip"],["テープレコーダー","テープレコーダー","perekam kaset"],["テーブル","テーブル","meja"],["出かける","でかける","pergi keluar, berangkat"],["手紙","てがみ","surat"],["できる","できる","bisa, dapat; terjadi"],["出口","でぐち","pintu keluar"],["テスト","テスト","tes, ujian"],["では","では","kalau begitu"],["デパート","デパート","toserba, mal"],["でも","でも","tetapi, tapi"],["出る","でる","keluar; hadir"],["テレビ","テレビ","televisi"],["天気","てんき","cuaca"],["電気","でんき","listrik; lampu"],["電車","でんしゃ","kereta (listrik)"],["電話","でんわ","telepon"],["戸","と","pintu (model Jepang)"],["～度","～ど","~ kali; ~ derajat"],["ドア","ドア","pintu (model Barat)"],["トイレ","トイレ","toilet, WC"],["どう","どう","bagaimana"],["どうして","どうして","mengapa, kenapa"],["どうぞ","どうぞ","silakan, tolong"],["動物","どうぶつ","hewan, binatang"],["どうも","どうも","terima kasih; entah bagaimana; halo"],["十","(〜を) とお","sepuluh"],["遠い","とおい","jauh"],["十日","とおか","sepuluh hari; tanggal 10"],["～時","～とき","saat ~, ketika ~"],["時々","ときどき","kadang-kadang"],["時計","とけい","jam (arloji/dinding)"],["どこ","どこ","di mana"],["所","ところ","tempat"],["年","とし","tahun; umur"],["図書館","としょかん","perpustakaan"],["どちら","どちら","yang mana; ke mana (sopan)"],["どっち","どっち","yang mana (kasual)"],["とても","とても","sangat"],["どなた","どなた","siapa (sopan)"],["隣","となり","sebelah, tetangga"],["どの","どの","yang mana"],["飛ぶ","とぶ","terbang; melompat"],["止まる","とまる","berhenti"],["友達","ともだち","teman"],["土曜日","どようび","Sabtu"],["鳥","とり","burung; ayam"],["鶏肉","とりにく","daging ayam"],["取る","とる","mengambil; mendapat"],["撮る","とる","memotret, mengambil (gambar)"],["どれ","どれ","yang mana"],["どんな","どんな","seperti apa, jenis apa"],["ない","ない","tidak ada; tidak punya"],["ナイフ","ナイフ","pisau"],["中","なか","dalam, di dalam; tengah"],["長い","ながい","panjang"],["鳴く","なく","berbunyi, berkicau (hewan)"],["無くす","なくす","kehilangan, menghilangkan"],["なぜ","なぜ","mengapa"],["夏","なつ","musim panas"],["夏休み","なつやすみ","liburan musim panas"],["～など","～など","dan lain-lain, seperti ~"],["七つ","ななつ","tujuh (benda)"],["何","なん; なに","apa"],["七日","なのか","tujuh hari; tanggal 7"],["名前","なまえ","nama"],["習う","ならう","belajar (dari guru)"],["並ぶ","ならぶ","berbaris, berjajar"],["並べる","ならべる","menyusun, membariskan"],["なる","なる","menjadi"],["何～","なん～","~ apa"],["二","に","dua"],["にぎやか","にぎやか","ramai, meriah"],["肉","にく","daging"],["西","にし","barat"],["～日","～にち","~ hari; tanggal ~"],["日曜日","にちようび","Minggu"],["荷物","にもつ","barang bawaan, bagasi"],["ニュース","ニュース","berita"],["庭","にわ","halaman, taman"],["～人","～にん","~ orang"],["脱ぐ","ぬぐ","melepas (pakaian)"],["温い","ぬるい","suam-suam kuku, hangat"],["ネクタイ","ネクタイ","dasi"],["猫","ねこ","kucing"],["寝る","ねる","tidur"],["～年","～ねん","~ tahun (lamanya/tahun ke-~)"],["ノート","ノート","buku catatan"],["登る","のぼる","mendaki, naik"],["飲み物","のみもの","minuman"],["飲む","のむ","minum"],["乗る","のる","naik (kendaraan)"],["歯","は","gigi"],["パーティー","パーティー","pesta"],["はい","はい","ya"],["～杯","～はい","~ cangkir/gelas"],["灰皿","はいざら","asbak"],["入る","はいる","masuk; termuat"],["葉書","はがき","kartu pos"],["はく","はく","memakai (celana/sepatu)"],["箱","はこ","kotak"],["橋","はし","jembatan"],["箸","はし","sumpit"],["始まる","はじまる","dimulai"],["初め; 始め","はじめ","awal, permulaan"],["初めて","はじめて","pertama kali"],["走る","はしる","berlari"],["バス","バス","bus; bak mandi; bas"],["バター","バター","mentega"],["二十歳","はたち","usia 20 tahun"],["働く","はたらく","bekerja"],["八","はち","delapan"],["二十日","はつか","dua puluh hari; tanggal 20"],["花","はな","bunga"],["鼻","はな","hidung"],["話","はなし","cerita, pembicaraan"],["話す","はなす","berbicara"],["母","はは","ibu (saya)"],["早い","はやい","cepat (lebih awal); dini"],["速い","はやい","cepat, kencang"],["春","はる","musim semi"],["貼る","はる","menempel, memasang"],["晴れ","はれ","cerah (cuaca)"],["晴れる","はれる","cerah, menjadi terang (cuaca)"],["半","はん","setengah; lewat setengah (jam)"],["晩","ばん","malam"],["～番","～ばん","nomor ~; urutan ~"],["パン","パン","roti"],["ハンカチ","ハンカチ","saputangan"],["番号","ばんごう","nomor"],["晩御飯","ばんごはん","makan malam"],["半分","はんぶん","setengah"],["東","ひがし","timur"],["～匹","～ひき","~ ekor (hewan kecil)"],["引く","ひく","menarik; mengurangkan"],["弾く","ひく","memainkan (alat musik gesek/piano)"],["低い","ひくい","rendah, pendek"],["飛行機","ひこうき","pesawat terbang"],["左","ひだり","kiri"],["人","ひと","orang"],["一つ","ひとつ","satu (benda)"],["一月","ひとつき","satu bulan"],["一人","ひとり","satu orang, sendirian"],["暇","ひま","waktu luang"],["百","ひゃく","seratus"],["病院","びょういん","rumah sakit"],["病気","びょうき","penyakit, sakit"],["平仮名","ひらがな","hiragana"],["昼","ひる","siang"],["昼御飯","ひるごはん","makan siang"],["広い","ひろい","luas"],["フィルム","フィルム","film (gulungan)"],["封筒","ふうとう","amplop"],["プール","プール","kolam renang"],["フォーク","フォーク","garpu"],["吹く","ふく","bertiup (angin); meniup"],["服","ふく","pakaian, baju"],["二つ","ふたつ","dua (benda)"],["豚肉","ぶたにく","daging babi"],["二人","ふたり","dua orang"],["二日","ふつか","dua hari; tanggal 2"],["太い","ふとい","gemuk; tebal"],["冬","ふゆ","musim dingin"],["降る","ふる","turun (hujan/salju)"],["古い","ふるい","tua, lama (benda)"],["～分","～ふん","~ menit"],["文章","ぶんしょう","karangan, teks, kalimat"],["ページ","ページ","halaman (buku)"],["下手","へた","tidak pandai, payah"],["ベッド","ベッド","tempat tidur"],["ペット","ペット","hewan peliharaan"],["部屋","へや","kamar, ruangan"],["辺","へん","sekitar, daerah"],["ペン","ペン","pena, pulpen"],["勉強","べんきょう (する)","belajar"],["便利","べんり","praktis, berguna"],["帽子","ぼうし","topi"],["ボールペン","ボールペン","bolpoin"],["外","ほか","lain, selain itu"],["ポケット","ポケット","saku"],["欲しい","ほしい","ingin (memiliki)"],["ポスト","ポスト","kotak surat; pos, jabatan"],["細い","ほそい","tipis, ramping, halus"],["ボタン","ボタン","tombol; kancing"],["ホテル","ホテル","hotel"],["本","ほん","buku"],["～本","～ほん","~ batang (benda panjang)"],["本棚","ほんだな","rak buku"],["本当","ほんとう","sungguh, benar"],["～枚","～まい","~ lembar"],["毎朝","まいあさ","setiap pagi"],["毎月","まいげつ; まいつき","setiap bulan"],["毎週","まいしゅう","setiap minggu"],["毎日","まいにち","setiap hari"],["毎年","まいねん; まいとし","setiap tahun"],["毎晩","まいばん","setiap malam"],["前","まえ","depan; sebelum"],["～前","～まえ","di depan ~; ~ yang lalu"],["曲る","まがる","berbelok, membelok"],["まずい","まずい","tidak enak; buruk"],["また","また","lagi; juga"],["まだ","まだ","masih; belum"],["町","まち","kota"],["待つ","まつ","menunggu"],["まっすぐ","まっすぐ","lurus"],["マッチ","マッチ","korek api"],["窓","まど","jendela"],["丸い; 円い","まるい","bulat"],["万","まん","sepuluh ribu"],["万年筆","まんねんひつ","pulpen tinta (fountain pen)"],["磨く","みがく","menggosok (gigi); memoles"],["右","みぎ","kanan"],["短い","みじかい","pendek"],["水","みず","air"],["店","みせ","toko"],["見せる","みせる","memperlihatkan, menunjukkan"],["道","みち","jalan"],["三日","みっか","tiga hari; tanggal 3"],["三つ","みっつ","tiga (benda)"],["緑","みどり","hijau"],["皆さん","みなさん","semuanya, saudara-saudara"],["南","みなみ","selatan"],["耳","みみ","telinga"],["見る","みる","melihat, menonton"],["みんな","みんな","semua, semuanya"],["六日","むいか","enam hari; tanggal 6"],["向こう","むこう","seberang, di sana; lawan (bicara)"],["難しい","むずかしい","sulit"],["六つ","むっつ","enam (benda)"],["村","むら","desa"],["目","め","mata"],["メートル","メートル","meter"],["眼鏡","めがね","kacamata"],["もう","もう","sudah; lagi; sebentar lagi"],["木曜日","もくようび","Kamis"],["もしもし","もしもし","halo (lewat telepon)"],["持つ","もつ","memegang, membawa; memiliki"],["もっと","もっと","lebih (banyak/lagi)"],["物","もの","benda, barang"],["門","もん","gerbang"],["問題","もんだい","masalah, soal"],["八百屋","やおや","penjual sayur (toko sayur)"],["野菜","やさい","sayur, sayuran"],["易しい","やさしい","mudah"],["安い","やすい","murah"],["休み","やすみ","libur, istirahat, cuti"],["休む","やすむ","beristirahat; absen"],["八つ","やっつ","delapan (benda)"],["山","やま","gunung"],["やる","やる","melakukan; memberi (kepada bawahan/hewan)"],["夕方","ゆうがた","sore hari"],["夕飯","ゆうはん","makan malam"],["郵便局","ゆうびんきょく","kantor pos"],["昨夜","ゆうべ","tadi malam"],["有名","ゆうめい","terkenal"],["雪","ゆき","salju"],["ゆっくりと","ゆっくりと","dengan perlahan, santai"],["八日","ようか","delapan hari; tanggal 8"],["洋服","ようふく","pakaian gaya Barat"],["よく","よく","sering; baik, dengan baik"],["横","よこ","samping; lebar"],["四日","よっか","empat hari; tanggal 4"],["四つ","よっつ","empat (benda)"],["呼ぶ","よぶ","memanggil; mengundang"],["読む","よむ","membaca"],["夜","よる","malam"],["弱い","よわい","lemah"],["来月","らいげつ","bulan depan"],["来週","らいしゅう","minggu depan"],["来年","らいねん","tahun depan"],["ラジオ","ラジオ","radio"],["ラジオカセ","ラジオカセ","radio kaset"],["りっぱ","りっぱ","hebat, bagus sekali, megah"],["留学生","りゅうがくせい","pelajar asing"],["両親","りょうしん","orang tua (ayah-ibu)"],["料理","りょうり","masakan, memasak"],["旅行","りょこう","perjalanan, wisata"],["零","れい","nol"],["冷蔵庫","れいぞうこ","kulkas, lemari es"],["レコード","レコード","piringan hitam, rekaman"],["レストラン","レストラン","restoran"],["練習","れんしゅう (する)","latihan, berlatih"],["廊下","ろうか","lorong, koridor"],["六","ろく","enam"],["ワイシャツ","ワイシャツ","kemeja (kantor)"],["若い","わかい","muda"],["分かる","わかる","mengerti, paham"],["忘れる","わすれる","lupa, melupakan"],["私","わたし","saya"],["私","わたくし","saya (sangat formal)"],["渡す","わたす","menyerahkan, memberikan (dengan tangan)"],["渡る","わたる","menyeberang"],["悪い","わるい","buruk, jelek; bersalah"]];
const STOR  = 'vocab_N5_mastered';
const PER_PAGE = 50;
let page = 1, filtered = [...VOCAB], mode = 'list';
let flashIdx = 0, flashFlipped = false;
let qScore = 0, qTotal = 0;

function getMastered(){ return JSON.parse(localStorage.getItem(STOR)||'[]'); }
function saveMastered(list){
  localStorage.setItem(STOR, JSON.stringify(list));
  document.getElementById('masteredCount').textContent = list.length;
  document.getElementById('progFill').style.width = Math.round(list.length/VOCAB.length*100)+'%';
}
function updateStats(){ saveMastered(getMastered()); }

function setMode(btn,m){
  document.querySelectorAll('.sec-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.sec-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById(m+'Mode').classList.add('active');
  mode=m;
  if(m==='flash')initFlash();
  if(m==='quiz')initQuiz();
}

// LIST
function renderList(){
  const q=document.getElementById('vSearch').value.toLowerCase().trim();
  filtered=VOCAB.filter(v=>{
    if(!q)return true;
    return(v[0]+v[1]+v[2]).toLowerCase().includes(q);
  });
  document.getElementById('totalShown').textContent=filtered.length;
  const pages=Math.ceil(filtered.length/PER_PAGE)||1;
  if(page>pages)page=1;
  document.getElementById('pageInfo').textContent=page+'/'+pages;
  const m=getMastered();
  const start=(page-1)*PER_PAGE, slice=filtered.slice(start,start+PER_PAGE);
  const nr=document.getElementById('noResult');
  if(!slice.length){document.getElementById('vocabList').innerHTML='';nr.style.display='';renderPag(pages);return;}
  nr.style.display='none';
  document.getElementById('vocabList').innerHTML=slice.map((v,i)=>`
    <div class="v-card">
      <span class="v-num">${start+i+1}</span>
      <div>
        <span class="v-jp">${v[0]}</span>
        <span class="v-read">${v[1]||''}</span>
        <span class="v-id">${v[2]}</span>
      </div>
      <div class="v-actions">
        <button aria-label="Ucapkan: ${v[0]}" class="v-btn" onclick="speak('${v[0]}')">🔊</button>
        <button class="v-btn" onclick="toggleV('${v[0].replace(/'/g,"&#39;")}',this)" style="background:${m.includes(v[0])?'rgba(107,79,58,.10)':''}">${m.includes(v[0])?'★':'☆'}</button>
      </div>
    </div>`).join('');
  renderPag(pages);
}
function renderPag(pages){
  const el=document.getElementById('pagination');
  el.innerHTML='';
  for(let p=1;p<=pages;p++){
    const btn=document.createElement('button');
    btn.className='pg-btn'+(p===page?' active':'');
    btn.textContent=p; btn.onclick=()=>{page=p;renderList();};
    el.appendChild(btn);
  }
}
function speak(t){if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=.85;const v=speechSynthesis.getVoices().find(x=>x.lang.startsWith('ja'));if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u);}
function toggleV(jp,btn){const m=getMastered();const idx=m.indexOf(jp);if(idx>=0){m.splice(idx,1);btn.textContent='☆';btn.style.background=''}else{m.push(jp);try{if(window.NPXP)NPXP.recordVocab('kosakata',1);}catch(e){}btn.textContent='★';btn.style.background='rgba(107,79,58,.10)'}saveMastered(m);}
document.getElementById('vSearch').addEventListener('input',()=>{page=1;renderList();});

// FLASHCARD
let deck=[];
function initFlash(){
  deck=[...VOCAB].sort(()=>Math.random()-.5);
  flashIdx=0;flashFlipped=false;
  showFlash();
}
function showFlash(){
  if(!deck.length)return;
  const v=deck[flashIdx%deck.length];
  document.getElementById('flashJP').textContent=v[0];
  document.getElementById('flashRead').textContent=v[1]||'';
  document.getElementById('flashID').textContent=v[2]||'';
  document.getElementById('flashFront').style.display='';
  document.getElementById('flashBack').style.display='none';
  document.getElementById('flashProgress').textContent='Kartu '+(flashIdx+1)+' dari '+deck.length;
  flashFlipped=false;
}
function flipFlash(){
  if(!flashFlipped){document.getElementById('flashFront').style.display='none';document.getElementById('flashBack').style.display='';flashFlipped=true;}
}
function speakFlash(){if(deck.length)speak(deck[flashIdx%deck.length][0]);}
function rateFlash(knew){
  const v=deck[flashIdx%deck.length];
  if(knew){const m=getMastered();if(!m.includes(v[0])){m.push(v[0]);saveMastered(m);}}
  flashIdx++;showFlash();
}

// QUIZ
let quizDeck=[];
function initQuiz(){
  quizDeck=[...VOCAB].sort(()=>Math.random()-.5);
  qScore=0;qTotal=0;
  nextQuiz();
}
function nextQuiz(){
  if(!quizDeck.length)return;
  const correct=quizDeck[qTotal%quizDeck.length];
  document.getElementById('quizQ').textContent=correct[0];
  document.getElementById('quizHint').textContent=(correct[1]?correct[1]+' ● ':'')+'N5 vocab';
  const wrongs=VOCAB.filter(v=>v[0]!==correct[0]).sort(()=>Math.random()-.5).slice(0,3);
  const choices=[...wrongs,correct].sort(()=>Math.random()-.5);
  const fb=document.getElementById('quizFeedback');
  fb.textContent='';fb.className='quiz-feedback';
  document.getElementById('quizChoices').innerHTML=choices.map(ch=>`
    <button class="qc-btn" onclick="answerQuiz('${ch[0].replace(/'/g,"&#39;")}','${correct[0].replace(/'/g,"&#39;")}','${correct[2].replace(/'/g,"&#39;").replace(/"/g,"&quot;")||correct[1]||""}',this)">${ch[2]||ch[1]}</button>
  `).join('');
}
function answerQuiz(chosen,correct,meaning,btn){
  document.querySelectorAll('.qc-btn').forEach(b=>b.disabled=true);
  const ok=chosen===correct;
  btn.classList.add(ok?'correct':'wrong');
  if(!ok)document.querySelectorAll('.qc-btn').forEach(b=>{if(b.textContent===(meaning))b.classList.add('correct');});
  const fb=document.getElementById('quizFeedback');
  fb.textContent=ok?'✅ Benar! '+correct+' = '+meaning:'❌ Salah. '+correct+' = '+meaning;
  fb.className='quiz-feedback '+(ok?'ok':'ng');
  if(ok)qScore++;qTotal++;
  document.getElementById('quizScore').textContent='Skor: '+qScore+'/'+qTotal+' ('+Math.round(qScore/qTotal*100)+'%)';
  setTimeout(nextQuiz,1600);
}

// INIT
document.addEventListener('DOMContentLoaded',()=>{renderList();updateStats();});
if(window.speechSynthesis)speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();
