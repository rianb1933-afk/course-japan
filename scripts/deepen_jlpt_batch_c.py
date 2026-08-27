#!/usr/bin/env python3
"""Perdalam JLPT batch C: 8 modul kosakata/frasa/tata bahasa dasar."""
import json, os, re

DEEP = {
 # ── Frasa-Praktis-Harian ──
 "Bagaimana menanyakan harga suatu barang?": "いくらですか (ikura desu ka) berarti 'berapa harganya?'. Frasa ini bisa dipakai langsung sambil menunjuk barang, atau ditambah nama barang di depannya: これはいくらですか.",
 "Apa yang diucapkan SEBELUM makan?": "いただきます (itadakimasu) diucapkan sebelum makan sebagai ungkapan rasa syukur atas makanan, bukan sekadar 'selamat makan' — mengandung makna menghargai proses makanan sampai ke meja.",
 "'お会計をお願いします' artinya?": "お会計をお願いします (okaikei o onegaishimasu) berarti 'tolong hitung tagihannya', dipakai saat meminta bon di restoran. Ungkapan ini sopan dan umum digunakan di seluruh Jepang.",
 "Bagaimana menanyakan letak stasiun?": "駅はどこですか (eki wa doko desu ka) berarti 'di mana stasiun?'. Pola ini bisa diganti kata benda lain untuk menanyakan lokasi apa pun: トイレはどこですか (di mana toilet?).",
 "'まっすぐ行ってください' artinya?": "まっすぐ (massugu) berarti lurus, sehingga kalimat ini berarti 'silakan jalan lurus'. Kata arah lain yang penting: 右=kanan, 左=kiri, sering muncul bersama dalam petunjuk jalan.",
 "Bagaimana mengatakan 'Saya tidak mengerti'?": "わかりません (wakarimasen) berarti 'saya tidak mengerti/tidak tahu'. Frasa dasar ini penting dikuasai karena sering dipakai untuk memberi tahu lawan bicara agar menjelaskan dengan cara lain.",
 "Frasa untuk minta lawan bicara mengulang?": "もう一度お願いします (mou ichido onegaishimasu) berarti 'tolong sekali lagi'. Frasa ini sopan dan bisa dipakai dalam berbagai situasi, dari percakapan sehari-hari hingga telepon bisnis.",
 "Saat memperkenalkan asal negara, '____から来ました'": "〜から来ました (kara kimashita) berarti 'datang dari…'. Pola ini dipakai setelah menyebutkan nama negara/kota asal, misalnya インドネシアから来ました (saya datang dari Indonesia).",
 "'助けてください' digunakan saat?": "助けてください (tasukete kudasai) berarti 'tolong saya' — dipakai dalam situasi darurat atau saat benar-benar membutuhkan bantuan segera, bukan untuk permintaan bantuan sehari-hari yang ringan.",
 "Bagaimana menanyakan 'Bisa bayar pakai kartu?'": "カードで払えますか (kaado de haraemasu ka) berarti 'bisakah bayar dengan kartu?'. Partikel で menunjukkan alat pembayaran, dan 払えます adalah bentuk potensial dari 払う (membayar).",
 # ── Grammar-Perbandingan ──
 "'車は自転車___速いです' (Mobil lebih cepat dari sepeda). Isi ya": "より (yori) berarti 'daripada', dipakai untuk perbandingan dua hal. Pola lengkapnya: A は B より 〜 (A lebih ~ daripada B). Contoh: 車は自転車より速いです (mobil lebih cepat daripada sepeda).",
 "Apa arti 一番 (ichiban)?": "一番 (ichiban) berarti nomor satu/paling, dipakai untuk menyatakan superlatif (tingkat paling tinggi) dalam suatu kelompok. Contoh: これが一番好きです (ini yang paling saya suka).",
 "'富士山は日本___一番高い山です'. Partikel yang tepat:": "で menunjukkan lingkup/ruang lingkup perbandingan. 日本で一番高い山 berarti 'gunung tertinggi di Jepang', menunjukkan bahwa perbandingan dilakukan dalam cakupan negara Jepang.",
 "'今日は昨日___寒くないです' (tidak sedingin kemarin). Isi:": "ほど (hodo) dalam kalimat negatif menyatakan 'tidak se-...'. Pola AはBほど〜ない berarti A tidak se-~ seperti B. Kalimat ini berarti 'hari ini tidak sedingin kemarin'.",
 "Untuk bertanya 'mana yang lebih kamu suka?' antara 2 h": "どちら (dochira) berarti 'yang mana' untuk memilih dari dua pilihan. Pola lengkapnya: AとBとどちらが好きですか (di antara A dan B, mana yang lebih kamu suka?).",
 "より dipakai dalam kalimat...": "より dipakai untuk perbandingan positif, menyatakan bahwa satu hal melebihi hal lain dalam suatu aspek. Pola dasarnya: A は B より 〜です, dengan B sebagai patokan perbandingan.",
 "'私___弟より背が高い' (menekankan 'saya'). Isi:": "～のほうが menekankan subjek yang lebih unggul dalam perbandingan. 私のほうが弟より背が高い berarti 'sayalah yang lebih tinggi dibanding adik laki-laki', dengan penekanan pada pihak yang dibandingkan.",
 "'果物の中で何が一番好きですか' artinya?": "Kalimat ini berarti 'dari antara buah-buahan, mana yang paling kamu suka?'. Pola 〜の中で何が一番〜 dipakai untuk bertanya pilihan terbaik dari suatu kelompok/kategori.",
 "Manakah pola untuk menyatakan 'paling'?": "一番 (ichiban) dipakai untuk menyatakan superlatif/paling. Berbeda dengan より yang membandingkan dua hal, 一番 menunjukkan posisi teratas dalam suatu kelompok atau kategori.",
 "'大阪は東京ほど大きくないです' artinya?": "Kalimat ini berarti 'Osaka tidak sebesar Tokyo'. Pola AはBほど〜ない menyatakan bahwa A berada di bawah B dalam suatu aspek, tanpa menyebutkan secara langsung seberapa jauh perbedaannya.",
 # ── Grammar-Tsumori ──
 "Bagaimana membentuk \"berniat pergi\" dari 行く?": "行くつもりです. Pola: kata kerja bentuk kamus + つもりです. つもり menyatakan niat yang sudah dipikirkan matang-matang, bukan sekadar keinginan sesaat.",
 "Bentuk NEGATIF \"berniat tidak pergi\" adalah?": "行かないつもりです. Untuk menyatakan niat negatif, gunakan bentuk ない dari kata kerja diikuti つもり. Pola ini menunjukkan keputusan untuk TIDAK melakukan sesuatu, bukan sekadar ketidakpastian.",
 "Urutan tingkat KEPASTIAN dari rendah ke tinggi:": "たい (ingin) < つもり (niat) < 予定 (rencana tetap). たい hanya menyatakan keinginan tanpa kepastian, つもり menunjukkan niat yang sudah dipikirkan, sedangkan 予定 menyatakan rencana yang sudah pasti/terjadwal.",
 "\"日本に行くつもりです\" artinya?": "Artinya 'saya berniat pergi ke Jepang'. つもり menyiratkan bahwa keputusan ini sudah dipikirkan dengan matang, berbeda dengan 行きたいです yang hanya menyatakan keinginan tanpa kepastian rencana.",
 "Perbedaan つもり dan 予定?": "つもり adalah niat pribadi yang bisa berubah, sedangkan 予定 adalah rencana yang sudah lebih pasti/terjadwal, seperti janji temu atau jadwal resmi. 予定 terdengar lebih formal dan mengikat.",
 "つもり dipakai dengan kata kerja bentuk...": "つもり dipakai setelah kata kerja bentuk kamus (bentuk dasar), contoh: 行くつもり (berniat pergi), 見るつもり (berniat menonton). Untuk niat negatif, gunakan bentuk ない + つもり.",
 "\"今日は何もしないつもりです\" artinya?": "Artinya 'hari ini saya berniat tidak melakukan apa-apa'. しない (bentuk negatif dari する) + つもり menunjukkan niat yang sudah diputuskan untuk beristirahat total hari itu.",
 "Manakah yang menyatakan KEINGINAN, bukan niat?": "～たい menyatakan keinginan (ingin melakukan sesuatu), berbeda dengan つもり yang menyatakan niat/keputusan yang sudah dipikirkan matang. たい lebih bersifat emosional/spontan.",
 "\"来年、勉強するつもりです\" — kata kerja する dalam bentuk?": "する di sini adalah bentuk kamus (bentuk dasar), dipakai langsung sebelum つもり sesuai aturan pembentukan pola ini. Artinya kalimat tersebut berarti 'tahun depan saya berniat belajar'.",
 "Kapan つもり paling tepat dipakai?": "つもり paling tepat dipakai untuk menyatakan niat atau rencana pribadi yang sudah dipikirkan, tetapi belum tentu bersifat resmi/terjadwal seperti 予定. Cocok untuk rencana informal jangka pendek maupun panjang.",
 # ── Kata-Kerja-Dasar ──
 "食べる termasuk kelompok?": "食べる berakhiran -eru sehingga termasuk Grup 2 (ichidan/kata kerja -ru). Grup ini paling mudah dikonjugasi karena cukup membuang る dan menambahkan akhiran yang diinginkan.",
 "Bentuk ます dari 飲む adalah？": "飲みます. Untuk kata kerja Grup 1 (godan), akhiran -u diubah menjadi -i lalu ditambah ます. 飲む (nomu) → 飲み (nomi) → 飲みます.",
 "Bentuk ます dari 食べる adalah？": "食べます. Untuk kata kerja Grup 2 (ichidan), cukup buang akhiran る lalu tambahkan ます. Ini adalah salah satu alasan Grup 2 dianggap lebih mudah dipelajari pemula.",
 "Kata kerja Grup 3 (tidak beraturan) ada berapa？": "Hanya ada 2: する (melakukan) dan 来る (datang). Keduanya harus dihafal terpisah karena konjugasinya tidak mengikuti pola Grup 1 maupun Grup 2 secara konsisten.",
 "帰る (kaeru) termasuk kelompok？": "帰る adalah pengecualian penting — meski berakhiran -eru (seperti ciri Grup 2), kata ini sebenarnya termasuk Grup 1 (godan). Bentuk ますnya adalah 帰ります, bukan 帰えます.",
 "Bentuk ます dari 来る adalah？": "来ます (kimasu). Perhatikan bahwa bunyi 来 berubah dari 'ku' menjadi 'ki' — ini salah satu ciri unik Grup 3 yang harus dihafal karena tidak mengikuti pola konjugasi biasa.",
 "Ciri kata kerja Grup 2 adalah？": "Kata kerja Grup 2 (ichidan) umumnya berakhiran -iru atau -eru pada bentuk kamus, dan konjugasinya cukup dengan membuang る. Namun perlu waspada karena ada pengecualian seperti 帰る dan 入る yang sebenarnya Grup 1.",
 "Bentuk ます dari 書く adalah？": "書きます. Untuk Grup 1, akhiran -ku diubah menjadi -ki lalu ditambah ます: 書く (kaku) → 書き (kaki) → 書きます.",
 "する dipakai untuk membentuk kata kerja dari？": "Kata benda + する membentuk kata kerja baru, contoh: 勉強する (belajar), 電話する (menelepon), 掃除する (membersihkan). Pola ini sangat produktif dan banyak dipakai dalam bahasa Jepang modern.",
 "Mengapa penting mengenali kelompok kata kerja?": "Kelompok kata kerja menentukan cara membentuk berbagai konjugasi seperti bentuk ます, bentuk-て, bentuk kamus negatif, dan lainnya. Tanpa mengenali kelompoknya, pembentukan kalimat akan sering salah, terutama untuk pengecualian seperti 帰る.",
 # ── Kata-Sifat-Dasar ──
 "Manakah kata sifat-な？": "静か (shizuka, tenang) adalah kata sifat-な. Ciri utamanya: tidak berakhiran -i secara alami dan memerlukan partikel な saat menerangkan kata benda langsung, misalnya 静かな部屋 (kamar yang tenang).",
 "Bentuk negatif dari 高い adalah？": "高くないです. Untuk kata sifat-i, buang akhiran い lalu tambahkan くない. Pola ini konsisten untuk hampir semua kata sifat-i kecuali いい yang memiliki bentuk khusus (よくない).",
 "Bentuk negatif dari 静か adalah？": "静かじゃないです (atau 静かではないです). Untuk kata sifat-な, bentuk negatifnya memakai じゃない, mirip dengan konjugasi kata benda, bukan mengubah akhiran seperti kata sifat-i.",
 "Bagaimana 静か menerangkan 部屋 (kamar)?": "静かな部屋 (kamar yang tenang). Kata sifat-な memerlukan partikel な saat langsung menerangkan kata benda — berbeda dari kata sifat-i yang bisa langsung menempel tanpa partikel tambahan.",
 "綺麗 (kirei) adalah kata sifat jenis？": "Ini jebakan umum! Meski 綺麗 berakhiran huruf い dalam romaji, sebenarnya ini adalah kata sifat-な (bukan -i). Contoh: 綺麗な花 (bunga yang cantik), bukan 綺麗い花.",
 "Bentuk LAMPAU dari 高い adalah？": "高かったです. Untuk kata sifat-i, buang い lalu tambahkan かった untuk bentuk lampau. Pola: 高い → 高かった (dulu/tadinya mahal).",
 "Bentuk LAMPAU dari 便利 adalah？": "便利でした. Untuk kata sifat-な, bentuk lampaunya mirip kata benda: tambahkan でした setelah kata sifatnya. 便利 (praktis) → 便利でした (dulu praktis).",
 "好き (suka) memakai partikel？": "好き adalah kata sifat-な yang unik karena memakai partikel が untuk objek yang disukai, bukan を. Contoh: 音楽が好きです (saya suka musik), bukan 音楽を好きです.",
 "Lawan kata dari 大きい adalah？": "小さい (kecil) adalah lawan dari 大きい (besar). Kedua kata sifat-i ini adalah pasangan dasar paling umum yang sering muncul dalam deskripsi ukuran benda atau tempat.",
 "\"高い車\" — 高い di sini menerangkan?": "高い langsung menerangkan 車 (mobil) tanpa perlu partikel tambahan, karena ini adalah ciri kata sifat-i — bisa langsung menempel pada kata benda yang diterangkannya (berbeda dari kata sifat-な yang butuh な).",
 # ── Kosakata-Cuaca-Musim ──
 "Apa arti 春 (haru)?": "春 (haru) berarti musim semi, musim ketika bunga sakura mekar di Jepang. Musim ini biasanya berlangsung dari Maret hingga Mei dan identik dengan suasana segar dan awal tahun ajaran baru.",
 "Kata untuk \"hujan\" adalah？": "雨 (ame) berarti hujan, sedangkan 雪 (yuki) berarti salju. Kedua kata ini sering dipakai bersama kata kerja 降る (turun): 雨が降る (hujan turun), 雪が降る (salju turun).",
 "Apa perbedaan 暑い dan 熱い (sama-sama \"atsui\")?": "暑い dipakai untuk cuaca/suhu udara yang panas (seperti musim panas), sedangkan 熱い dipakai untuk benda yang panas seperti makanan atau air. Meski pelafalannya sama, penulisan kanji-nya berbeda sesuai konteks.",
 "梅雨 (tsuyu) adalah？": "梅雨 adalah periode musim hujan panjang di Jepang, biasanya berlangsung sekitar Juni hingga pertengahan Juli. Musim ini ditandai dengan hujan yang sering dan kelembapan tinggi sebelum musim panas tiba.",
 "Kata kerja yang dipakai untuk hujan/salju \"turun\" adal": "降る (furu) berarti turun, dipakai khusus untuk fenomena alam seperti hujan dan salju: 雨が降る (hujan turun), 雪が降る (salju turun). Kata kerja ini tidak dipakai untuk benda turun biasa.",
 "\"寒い\" (samui) artinya？": "寒い berarti dingin, khusus untuk cuaca/suhu udara. Untuk benda yang dingin (seperti air atau makanan), digunakan kata yang berbeda yaitu 冷たい — perbedaan ini sering menjadi jebakan bagi pembelajar.",
 "Apa arti 台風 (taifuu)?": "台風 (taifuu) berarti topan/badai tropis, fenomena cuaca yang sering melanda Jepang terutama pada musim panas hingga awal musim gugur, kadang menyebabkan gangguan transportasi dan sekolah.",
 "Untuk mengatakan \"airnya dingin\", kata yang tepat:": "冷たい dipakai untuk benda yang dingin seperti air (冷たい水). 寒い hanya dipakai untuk cuaca/suhu udara, bukan untuk benda — perbedaan penting yang sering tertukar oleh pembelajar pemula.",
 "\"蒸し暑い\" (mushiatsui) artinya？": "蒸し暑い berarti panas dan lembap, ciri khas cuaca musim panas di Jepang terutama setelah musim hujan (梅雨) berakhir. Kondisi ini membuat udara terasa berat dan menyesakkan.",
 "Musim 秋 (aki) terkenal dengan？": "秋 (aki) adalah musim gugur, terkenal dengan daun momiji yang berubah warna menjadi merah dan kuning keemasan. Musim ini biasanya berlangsung dari September hingga November dengan udara yang sejuk dan nyaman.",
 # ── Kosakata-Keluarga ──
 "Untuk menyebut ayah SENDIRI kepada orang lain, kata ya": "父 (chichi) dipakai untuk merendahkan/menyebut ayah sendiri saat berbicara dengan orang lain. Ini berbeda dari お父さん yang dipakai untuk menyebut ayah orang lain atau memanggil ayah sendiri secara langsung.",
 "Untuk menanyakan ayah ORANG LAIN:": "お父さん (otousan) adalah bentuk hormat untuk menanyakan atau menyebut ayah orang lain. Bahasa Jepang punya dua set istilah keluarga: satu untuk keluarga sendiri (merendah), satu untuk keluarga orang lain (menghormat).",
 "\"母\" (haha) artinya？": "母 berarti ibu saya, digunakan dengan nada merendah saat bicara dengan orang lain tentang ibu sendiri. Untuk ibu orang lain, digunakan bentuk hormat お母さん (okaasan).",
 "Kakak laki-laki (keluarga sendiri) adalah?": "兄 (ani) berarti kakak laki-laki saya, dipakai saat membicarakan kakak sendiri kepada orang lain. Untuk kakak laki-laki orang lain, digunakan bentuk hormat お兄さん (oniisan).",
 "Mengapa ada dua set kata keluarga?": "Satu set kata dipakai untuk merendahkan anggota keluarga sendiri (父・母・兄・姉, dst) saat bicara dengan orang luar, sementara set lain dipakai untuk menghormati keluarga orang lain (お父さん・お母さん, dst) — mencerminkan budaya sopan santun (uchi-soto) dalam bahasa Jepang.",
 "\"お姉さん\" artinya?": "お姉さん (oneesan) berarti kakak perempuan, dalam bentuk hormat. Bentuk ini dipakai untuk menyebut kakak perempuan orang lain, atau untuk memanggil kakak perempuan sendiri secara langsung.",
 "Kata untuk \"orang tua\" (sendiri) adalah?": "両親 (ryoushin) berarti orang tua saya (kedua-duanya, ayah dan ibu). Untuk orang tua orang lain, digunakan bentuk hormat ご両親 (goryoushin) dengan tambahan awalan ご.",
 "\"祖父\" (sofu) artinya?": "祖父 berarti kakek saya, dipakai dengan nada merendah saat bicara dengan orang lain. Untuk kakek orang lain atau memanggil kakek sendiri, digunakan bentuk hormat おじいさん (ojiisan).",
 "Saat MEMANGGIL ibu sendiri secara langsung, biasanya p": "Saat memanggil ibu sendiri secara langsung (bukan membicarakannya dengan orang lain), tetap digunakan お母さん (okaasan), bukan 母 (haha). Bentuk merendah 母 hanya dipakai saat MEMBICARAKAN ibu kepada orang lain.",
 "\"娘\" (musume) artinya?": "娘 berarti anak perempuan saya, sedangkan 息子 (musuko) berarti anak laki-laki saya. Kedua istilah ini dipakai dengan nada netral/merendah saat membicarakan anak sendiri kepada orang lain.",
}

FILES = ['Frasa-Praktis-Harian.html','Grammar-Perbandingan.html','Grammar-Tsumori.html','Kata-Kerja-Dasar.html','Kata-Sifat-Dasar.html','Kosakata-Cuaca-Musim.html','Kosakata-Keluarga.html']
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
