#!/usr/bin/env python3
"""Perdalam pembahasan JLPT batch B: 6 modul Kaiwa (percakapan)."""
import json, os, re

DEEP = {
 # ── Kaiwa-Jikoshoukai ──
 "初対面の相手に最初に言う挨拶はどれか。": "「はじめまして」adalah salam khusus untuk pertemuan pertama kali, berbeda dari salam harian seperti こんにちは. Ungkapan ini menandai awal sebuah perkenalan dan selalu diikuti dengan menyebutkan nama diri.",
 "名前を伝えるときの自然な言い方はどれか。": "「わたしは〜です」(nama saya…) adalah pola paling dasar dan sopan untuk menyebutkan nama. Pola ini bisa diperluas dengan menambahkan asal, pekerjaan, atau hobi setelahnya dalam rangkaian perkenalan diri.",
 "「ご出身はどちらですか」への答えはどれか。": "出身 berarti asal daerah/kampung halaman. Jawaban yang tepat menggunakan pola 「〜出身です」atau「〜から来ました」, misalnya インドネシア出身です (saya berasal dari Indonesia).",
 "自己紹介の結びとして適切なのはどれか。": "「どうぞよろしくお願いします」(mohon kerja samanya) adalah kalimat penutup standar dalam perkenalan diri di Jepang. Ungkapan ini menyiratkan harapan untuk hubungan baik ke depannya, baik dalam konteks kerja maupun pertemanan.",
 "「どうぞよろしく」と言われたときの返事はどれか。": "「こちらこそ」(saya juga/justru saya) adalah balasan yang sopan dan natural, menyiratkan bahwa harapan yang sama juga berlaku dari pihak yang menjawab. Ini menciptakan kesan saling menghormati sejak awal perkenalan.",
 "仕事を尋ねる質問はどれか。": "「お仕事は何ですか」(pekerjaan apa?) adalah cara sopan menanyakan profesi seseorang. Menambahkan お di depan 仕事 membuat pertanyaan terdengar lebih halus dibanding hanya 仕事は何ですか.",
 "趣味を伝える言い方はどれか。": "「趣味は〜です」(hobi saya…) adalah pola dasar untuk memperkenalkan hobi, biasa dipakai setelah menyebutkan nama dan pekerjaan dalam rangkaian perkenalan diri yang lebih lengkap.",
 "部屋を出るときの丁寧な言葉はどれか。": "「失礼します」(permisi) adalah ungkapan serbaguna yang dipakai saat masuk/keluar ruangan, mengakhiri telepon, atau berpamitan dari pertemuan. Kata ini menunjukkan kesadaran akan sopan santun terhadap ruang orang lain.",
 "相手の名前を聞き取れなかったときの言い方はどれか。": "「もう一度お願いします」(tolong ulangi) adalah cara sopan meminta pengulangan tanpa terkesan tidak sopan. Bisa ditambah 「すみません」di depannya untuk kesan lebih halus: すみません、もう一度お願いします.",
 "自己紹介で避けたほうがよいのはどれか。": "Bahasa kasual/tameguchi sebaiknya dihindari saat perkenalan pertama, terutama dengan orang yang baru dikenal atau lebih senior. Menggunakan bahasa sopan (丁寧語) di awal perkenalan menciptakan kesan pertama yang baik dan aman diperbaiki nanti jika hubungan menjadi akrab.",
 # ── Kaiwa-Kaimono ──
 "値段を尋ねるときの言い方はどれか。": "「いくらですか」(berapa harganya?) adalah pertanyaan paling umum dan langsung untuk menanyakan harga. Bisa ditambah kata benda di depannya seperti これはいくらですか (ini berapa harganya?).",
 "商品を買いたいときの言い方はどれか。": "「〜をください」(minta/tolong…) adalah pola dasar untuk meminta atau membeli sesuatu di toko. Pola ini lebih sopan dibanding perintah langsung dan sangat umum digunakan dalam transaksi sehari-hari.",
 "「袋はいりますか」への断り方はどれか。": "「けっこうです」(tidak usah, terima kasih) adalah cara menolak dengan sopan tanpa terkesan kasar. 「いりません」juga bisa dipakai tapi terdengar sedikit lebih langsung/tegas dibanding けっこうです.",
 "支払い方法を伝える言い方はどれか。": "「カードでお願いします」(dengan kartu) menggunakan partikel で untuk menunjukkan alat/metode pembayaran. Pola yang sama berlaku untuk 現金でお願いします (dengan tunai).",
 "「高い」の反対の意味の語はどれか。": "安い(murah) adalah lawan kata dari 高い(mahal). Kedua kata sifat-i ini adalah pasangan dasar yang sering muncul bersamaan dalam percakapan tentang harga dan tawar-menawar.",
 "店員の「いらっしゃいませ」の意味はどれか。": "「いらっしゃいませ」(selamat datang) adalah sapaan khas pelayan toko/restoran saat pelanggan masuk. Kata ini tidak memerlukan balasan khusus dari pelanggan — cukup dianggap sebagai sapaan formal satu arah.",
 "数量を伝える言い方で正しいのはどれか。": "Angka dalam bahasa Jepang untuk benda umum memakai hitungan asli Jepang seperti ひとつ・ふたつ・みっつ, bukan angka Tionghoa-Jepang biasa. 「みっつください」berarti 'minta 3 buah'.",
 "「ありがとうございました」に対する店員の返事はどれか。": "「またお越しください」(datang lagi ya) adalah ungkapan sopan pelayan toko saat mengantar pelanggan pergi. Ungkapan ini menunjukkan harapan pelanggan akan kembali berbelanja di kemudian hari.",
 "試着したいときの言い方はどれか。": "「〜てもいいですか」(bolehkah…?) adalah pola meminta izin yang bisa dipakai untuk berbagai situasi, termasuk mencoba pakaian: 試着してもいいですか (bolehkah saya coba pakai?).",
 "支払いで現金を使うことを表す語はどれか。": "現金 (tunai) adalah lawan dari カード (kartu) dalam konteks pembayaran. Kedua istilah ini sering muncul saat kasir bertanya metode pembayaran di レジ (kasir/meja bayar).",
 # ── Kaiwa-Restoran ──
 "店員を呼んで注文したいときの言い方はどれか。": "「すみません」dipakai untuk memanggil perhatian pelayan, diikuti 「注文お願いします」(mau pesan). Kombinasi ini adalah cara standar dan sopan untuk memulai proses pemesanan di restoran Jepang.",
 "店員におすすめを尋ねる言い方はどれか。": "「おすすめは何ですか」(rekomendasinya apa?) adalah pertanyaan umum saat bingung memilih menu. Pelayan biasanya akan menjawab dengan menyebutkan menu andalan atau yang sedang populer hari itu.",
 "料理を一つ頼むときの言い方はどれか。": "「〜を一つください」(minta satu…) menggabungkan nama makanan dengan angka hitungan untuk memesan jumlah tertentu. Pola ini bisa disesuaikan jumlahnya: 二つ (dua), 三つ (tiga), dan seterusnya.",
 "食事の前に言う言葉はどれか。": "「いただきます」diucapkan sebelum makan sebagai ungkapan rasa syukur atas makanan yang akan disantap — bukan sekadar 'selamat makan', tapi mengandung makna menghargai sumber makanan tersebut.",
 "食事の後に言う言葉はどれか。": "「ごちそうさま(でした)」diucapkan setelah selesai makan sebagai ucapan terima kasih atas hidangan yang telah disajikan. Ungkapan ini adalah pasangan dari いただきます yang diucapkan sebelum makan.",
 "「お会計」の意味はどれか。": "お会計 berarti tagihan/proses pembayaran setelah makan. 「お会計お願いします」adalah cara meminta bon/nota untuk membayar, sering digunakan di restoran Jepang saat hendak pulang.",
 "水がほしいときの言い方はどれか。": "「お水をください」(minta air) menggunakan pola ～をください yang sama dengan permintaan barang lainnya. Di banyak restoran Jepang, air putih biasanya disediakan gratis tanpa perlu diminta.",
 "料理がおいしいと伝える言い方はどれか。": "「おいしいです」(enak) adalah cara sederhana dan tulus mengungkapkan kepuasan atas rasa makanan. Ungkapan ini sering disambut baik oleh pelayan atau koki sebagai bentuk apresiasi pelanggan.",
 "予約があることを伝える言い方はどれか。": "「予約しています」(sudah reservasi) diucapkan saat check-in di restoran yang mengharuskan pemesanan tempat sebelumnya. Biasanya diikuti dengan menyebutkan nama pemesan.",
 "注文を変えたいときの丁寧な言い方はどれか。": "「変更してもいいですか」(boleh ubah?) menggunakan pola izin ～てもいい yang sama seperti permintaan sopan lainnya, cocok dipakai saat ingin mengganti pesanan sebelum makanan disiapkan.",
 # ── Kaiwa-Michi-Annai ──
 "知らない場所を尋ねるときの切り出しはどれか。": "「すみません、〜はどこですか」(permisi, di mana…?) adalah pembuka standar untuk bertanya arah kepada orang asing di jalan. Kata すみません penting sebagai pembuka sopan sebelum mengajukan pertanyaan.",
 "「まっすぐ行ってください」の意味はどれか。": "まっすぐ berarti lurus, dan 「行ってください」berarti 'silakan pergi/jalan'. Kalimat ini adalah instruksi arah paling dasar yang sering muncul dalam petunjuk jalan sederhana.",
 "「次の信号を右に曲がってください」の「右」はどれか。": "右 berarti kanan, sedangkan 左 berarti kiri. Kalimat lengkapnya berarti 'di lampu lalu lintas berikutnya, silakan belok kanan' — pola umum dalam memberi arah menggunakan penanda lokasi seperti lampu lalu lintas.",
 "距離を尋ねる言い方はどれか。": "「遠いですか」(jauh?) adalah pertanyaan sederhana untuk mengetahui apakah tujuan masih jauh. Lawan katanya adalah 近い (dekat), yang sering muncul dalam jawaban seperti いいえ、近いです.",
 "道を教えてもらったお礼はどれか。": "Setelah diberi tahu arah jalan, ucapan terima kasih yang tepat adalah 「ありがとうございます」. Ini menunjukkan sopan santun dasar setelah menerima bantuan dari orang asing di jalan.",
 "「駅の近くです」の「近く」の意味はどれか。": "近く berarti dekat/di sekitar. Kalimat 「駅の近くです」berarti 'dekat stasiun', pola yang sama bisa dipakai untuk lokasi lain seperti 「コンビニの近く」(dekat minimarket).",
 "分からないとき丁寧に聞き返す言い方はどれか。": "「もう一度お願いします」(tolong ulangi) dipakai saat tidak menangkap penjelasan arah dengan jelas. Ungkapan ini sopan dan tidak akan membuat orang yang menjelaskan merasa tersinggung.",
 "「歩いて10分ぐらいです」の意味はどれか。": "Kalimat ini berarti 'sekitar 10 menit jalan kaki'. Pola 歩いて〜分ぐらい adalah cara umum menyampaikan estimasi waktu tempuh berjalan kaki menuju suatu tempat.",
 "目印(patokan)を尋ねる言い方はどれか。": "「近くに何がありますか」(ada apa di dekatnya?) dipakai untuk menanyakan penanda/landmark di sekitar tujuan, membantu memastikan lokasi yang benar tanpa harus mengandalkan alamat detail.",
 "道案内で「渡ってください」が使われる場所はどれか。": "渡る berarti menyeberang, biasanya dipakai untuk instruksi melewati zebra cross atau jembatan. 「渡ってください」berarti 'silakan menyeberang', bagian umum dari petunjuk arah yang melibatkan penyeberangan jalan.",
 # ── Kaiwa-Denwa ──
 "電話に出るときの第一声はどれか。": "「もしもし」(halo) adalah sapaan standar saat menjawab telepon dalam percakapan biasa. Dalam konteks bisnis, biasanya diikuti dengan menyebutkan nama perusahaan dan nama diri sendiri.",
 "相手を待たせるときの丁寧な言い方はどれか。": "「少々お待ちください」(mohon tunggu sebentar) adalah ungkapan sopan saat perlu menahan lawan bicara di telepon, misalnya saat mencari informasi atau menyambungkan ke orang lain.",
 "名前を尋ねる丁寧な言い方はどれか。": "「お名前をお願いします」(boleh tahu nama?) adalah cara sopan menanyakan nama penelepon, sering dipakai di awal percakapan telepon formal atau bisnis.",
 "伝言を頼むときの言い方はどれか。": "「伝言をお願いできますか」(bisa titip pesan?) dipakai saat orang yang dituju sedang tidak ada, dan penelepon ingin meninggalkan pesan untuk disampaikan kembali.",
 "相手が不在のとき言う言葉はどれか。": "「ただ今おりません」(sedang tidak ada) adalah ungkapan sopan (menggunakan kenjougo おる) untuk memberi tahu bahwa orang yang dicari sedang tidak di tempat, umum dipakai dalam konteks bisnis.",
 "電話を切るときの丁寧な言葉はどれか。": "「失礼します」(permisi) dipakai untuk menutup telepon dengan sopan. Kata yang sama juga dipakai saat masuk/keluar ruangan, menunjukkan fleksibilitas ungkapan ini dalam berbagai konteks perpisahan.",
 "かけ直すことを伝える言い方はどれか。": "「かけ直します」(saya telepon lagi) dipakai saat ingin memberi tahu bahwa akan menelepon kembali di lain waktu, biasanya karena situasi yang kurang tepat untuk melanjutkan percakapan.",
 "聞き取れないとき丁寧に確認する言い方はどれか。": "「もう一度お願いします」(tolong ulangi) juga berlaku dalam konteks telepon saat suara kurang jelas atau koneksi terputus-putus, sama seperti dalam percakapan tatap muka.",
 "電話番号を確認する言い方はどれか。": "「お電話番号をお願いします」(boleh minta nomornya?) dipakai untuk mengonfirmasi nomor telepon lawan bicara, penting dalam konteks bisnis untuk keperluan menghubungi kembali.",
 "間違い電話のときの対応はどれか。": "「失礼しました」(maaf) adalah respons sopan saat menyadari telah salah sambung. Ungkapan singkat ini menunjukkan permintaan maaf tanpa perlu penjelasan panjang.",
 # ── Kaiwa-Eki ──
 "切符を買いたいときの言い方はどれか。": "「〜までの切符をください」(minta tiket sampai…) menyebutkan tujuan sebelum meminta tiket, pola standar saat membeli tiket kereta di loket atau mesin otomatis.",
 "何番線か尋ねる言い方はどれか。": "「何番線ですか」(peron nomor berapa?) dipakai untuk menanyakan nomor peron kereta yang dituju, penting terutama di stasiun besar dengan banyak jalur.",
 "「乗り換え」の意味はどれか。": "乗り換え berarti transit/berganti kereta. Pola 「〜で乗り換えます」menunjukkan di stasiun mana penumpang harus turun dan naik kereta lain untuk melanjutkan perjalanan.",
 "次の電車の時刻を尋ねる言い方はどれか。": "「次の電車は何時ですか」(kereta berikutnya jam berapa?) adalah pertanyaan umum di stasiun untuk mengetahui jadwal kereta selanjutnya, terutama jika kereta yang diinginkan baru saja berangkat.",
 "「急行」と「各駅停車」の違いはどれか。": "急行 (ekspres) hanya berhenti di stasiun-stasiun utama sehingga lebih cepat, sedangkan 各駅停車 berhenti di semua stasiun. Memahami perbedaan ini penting agar tidak salah naik kereta dan melewatkan stasiun tujuan.",
 "料金を尋ねる言い方はどれか。": "「料金はいくらですか」(tarifnya berapa?) dipakai untuk menanyakan ongkos perjalanan kereta, biasanya dijawab dengan menyebutkan nominal dalam yen sesuai jarak tempuh.",
 "改札(kaisatsu)で必要なものはどれか。": "改札 adalah gerbang tiket yang harus dilewati untuk masuk/keluar peron. Yang diperlukan adalah tiket kertas atau kartu IC (seperti Suica/Pasmo) yang ditap atau dimasukkan ke mesin.",
 "道に迷ったとき駅員に尋ねる言い方はどれか。": "「すみません、〜線はどこですか」(di mana jalur…?) dipakai untuk bertanya kepada petugas stasiun saat bingung mencari jalur yang benar di stasiun besar dengan banyak jalur.",
 "電車が遅れているときのアナウンス語はどれか。": "遅れ berarti keterlambatan. Pengumuman 「電車が遅れています」sering terdengar di stasiun saat ada gangguan operasional, memberi tahu penumpang bahwa kereta tidak datang tepat waktu.",
 "目的の駅で降りる準備を表す言い方はどれか。": "「次で降ります」(turun di berikutnya) memberi tahu bahwa penumpang akan turun di stasiun selanjutnya, berguna saat memberi tahu orang di sekitar atau petugas kereta yang padat.",
}

FILES = ['Kaiwa-Jikoshoukai.html','Kaiwa-Kaimono.html','Kaiwa-Restoran.html','Kaiwa-Michi-Annai.html','Kaiwa-Denwa.html','Kaiwa-Eki.html']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def extract_span(c):
    for m in re.finditer(r'var\s+(\w+)\s*=\s*\[\s*\{', c):
        start = m.start() + m.group(0).index('[')
        depth=0; i=start; instr=False; esc=False
        while i < len(c):
            ch = c[i]
            if instr:
                if esc: esc=False
                elif ch=='\\': esc=True
                elif ch=='"': instr=False
            else:
                if ch=='"': instr=True
                elif ch=='[': depth+=1
                elif ch==']':
                    depth-=1
                    if depth==0:
                        try:
                            arr = json.loads(c[start:i+1])
                            if arr and isinstance(arr[0], dict) and 'q' in arr[0] and 'opts' in arr[0]:
                                return start, i+1
                        except Exception: pass
                        break
            i+=1
    return None, None

total = 0
for fname in FILES:
    path = os.path.join(ROOT, 'Materi', fname)
    c = open(path, encoding='utf-8').read()
    start, end = extract_span(c)
    if start is None:
        print(f"FAIL {fname}"); continue
    arr = json.loads(c[start:end])
    n = 0
    for q in arr:
        if q['q'] in DEEP:
            q['e'] = DEEP[q['q']]
            n += 1
    new_c = c[:start] + json.dumps(arr, ensure_ascii=False) + c[end:]
    open(path, 'w', encoding='utf-8').write(new_c)
    avg = sum(len(q['e']) for q in arr) / len(arr)
    short = sum(1 for q in arr if len(q['e'])<70)
    print(f"OK {fname}: {n} diperbaiki, avg={avg:.0f}, masih pendek={short}")
    total += n

print(f"\nTOTAL: {total} soal")
