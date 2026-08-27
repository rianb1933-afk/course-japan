#!/usr/bin/env python3
"""Perdalam JLPT batch D: Kosakata-Makanan, Profesi, Tubuh-Kesehatan, Warna, Salam-Sapaan, Verb-Intransitif, Suru-Verbs, Speaking-Daily."""
import json, os, re

DEEP = {
 # ── Kosakata-Makanan ──
 "Apa arti ご飯 (gohan)?": "ご飯 berarti nasi, tetapi juga sering dipakai secara umum untuk berarti 'makanan/santapan'. Contoh: ご飯を食べる bisa berarti 'makan nasi' atau lebih luas 'makan (secara umum)'.",
 "豚肉 (butaniku) adalah？": "豚肉 berarti daging babi. Penting dikenali bagi pembelajar dengan pantangan makanan tertentu, karena sering muncul di menu restoran Jepang bersama 牛肉 (daging sapi) dan 鶏肉 (daging ayam).",
 "Apa arti 魚 (sakana)?": "魚 berarti ikan, salah satu bahan makanan pokok dalam masakan Jepang, terutama untuk sushi dan sashimi. Kata ini sering muncul bersama kata kerja 食べる (makan) dan 釣る (memancing).",
 "Kata untuk \"enak\" adalah？": "美味しい (oishii) berarti enak, kata sifat-i paling umum untuk memuji rasa makanan. Lawan katanya adalah まずい (tidak enak), meski jarang diucapkan langsung karena terkesan kasar.",
 "辛い (karai) artinya？": "辛い berarti pedas. Lawan katanya adalah 甘い (amai, manis). Kedua kata sifat-i ini adalah pasangan dasar yang sering dipakai untuk mendeskripsikan rasa makanan di Jepang.",
 "Kata kerja \"minum\" adalah？": "飲む (nomu) berarti minum, sedangkan 食べる (taberu) berarti makan. Kedua kata kerja dasar ini penting dibedakan karena keduanya termasuk kelompok kata kerja yang berbeda (Grup 1 dan Grup 2).",
 "お茶 (ocha) adalah？": "お茶 berarti teh, biasanya merujuk pada teh hijau (green tea) yang umum diminum di Jepang. Awalan お menunjukkan kesopanan dan kelaziman kata ini dalam percakapan sehari-hari.",
 "Apa arti 野菜 (yasai)?": "野菜 berarti sayuran, sedangkan 果物 (kudamono) berarti buah-buahan. Kedua kategori makanan ini sering muncul bersama dalam percakapan tentang pola makan sehat.",
 "鶏肉 (toriniku) adalah？": "鶏肉 berarti daging ayam, sedangkan 鶏 (tori) sendiri berarti ayam (hewannya). Perbedaan ini penting: kanji 肉 (niku) menunjukkan bahwa yang dimaksud adalah dagingnya, bukan hewannya secara utuh.",
 "Kata untuk \"susu\" adalah？": "牛乳 (gyuunyuu) berarti susu sapi, kata paling umum untuk menyebut susu dalam bahasa Jepang sehari-hari. Kanji 牛 (sapi) dan 乳 (susu/air susu) menyusun kata majemuk ini.",
 # ── Kosakata-Profesi ──
 "会社員 (kaishain) artinya？": "会社員 berarti karyawan perusahaan, salah satu jawaban paling umum saat ditanya pekerjaan di Jepang. 会社 berarti perusahaan, dan 員 menunjukkan anggota/pegawai dari suatu organisasi.",
 "Perbedaan 看護師 dan 介護士?": "看護師 (kangoshi) adalah perawat medis yang bekerja di rumah sakit dan menangani perawatan kesehatan, sedangkan 介護士 (kaigoshi) adalah pekerja perawatan lansia yang fokus pada bantuan hidup sehari-hari, bukan tindakan medis.",
 "先生 (sensei) artinya？": "先生 berarti guru/dosen, tetapi juga dipakai sebagai sebutan hormat untuk dokter, pengacara, dan profesi lain yang dianggap ahli. Kata ini bisa dipakai sebagai gelar setelah nama, misalnya 田中先生.",
 "Bagaimana menanyakan \"Apa pekerjaan Anda?\"": "お仕事は何ですか berarti 'apa pekerjaan Anda?'. 仕事 berarti pekerjaan, dan menambahkan お di depannya membuat pertanyaan terdengar lebih sopan dibanding hanya 仕事は何ですか.",
 "\"銀行で働いています\" artinya？": "[tempat] で働いています berarti 'bekerja di [tempat]'. Kalimat ini berarti 'saya bekerja di bank'. Partikel で menunjukkan lokasi tempat aktivitas (bekerja) berlangsung.",
 "医者 (isha) adalah？": "医者 berarti dokter. Kata ini sering dipakai bersama 先生 sebagai sebutan hormat: お医者さん, terutama saat berbicara langsung dengan atau tentang seorang dokter.",
 "学生 (gakusei) artinya？": "学生 berarti pelajar/mahasiswa, istilah umum untuk siapa saja yang sedang menempuh pendidikan formal, baik di sekolah menengah maupun perguruan tinggi.",
 "運転手 (untenshu) adalah？": "運転手 berarti sopir/pengemudi. 運転する berarti mengemudi (kata kerja), sedangkan 運転手 adalah orang yang melakukan pekerjaan tersebut sebagai profesi.",
 "Kata kerja \"bekerja\" adalah？": "働く (hataraku) berarti bekerja, kata kerja Grup 1 (godan) yang paling umum dipakai untuk menyatakan aktivitas bekerja dalam konteks profesi maupun pekerjaan sehari-hari.",
 "公務員 (koumuin) artinya？": "公務員 berarti pegawai negeri/PNS, orang yang bekerja untuk instansi pemerintah. Profesi ini di Jepang dianggap stabil dan sering menjadi pilihan populer karena jaminan kerja jangka panjang.",
 # ── Kosakata-Tubuh-Kesehatan ──
 "Apa arti 頭 (atama)?": "頭 (atama) berarti kepala. Kata ini sering muncul dalam keluhan kesehatan seperti 頭が痛い (kepala sakit/pusing), salah satu keluhan paling umum dalam percakapan medis dasar.",
 "Bagaimana mengatakan 'perut saya sakit'?": "お腹が痛いです (onaka ga itai desu) berarti 'perut saya sakit'. Pola ini [bagian tubuh] + が痛いです adalah struktur dasar untuk menyatakan rasa sakit di bagian tubuh tertentu.",
 "'熱があります' artinya？": "熱があります (netsu ga arimasu) berarti 'saya demam'. 熱 berarti panas/demam, dan pola ～があります dipakai untuk menyatakan keberadaan suatu gejala atau kondisi pada tubuh.",
 "Apa arti 手 (te)?": "手 (te) berarti tangan, sedangkan 足 (ashi) berarti kaki. Kedua kata dasar anggota tubuh ini sering muncul bersama dalam percakapan tentang cedera atau pemeriksaan kesehatan.",
 "'看護師' (kangoshi) artinya？": "看護師 (kangoshi) berarti perawat medis yang bekerja merawat pasien di fasilitas kesehatan, sedangkan 医者 (isha) berarti dokter yang mendiagnosis dan menentukan pengobatan.",
 "Ungkapan 'めまいがします' berarti？": "めまいがします (memai ga shimasu) berarti 'pusing/kepala berputar'. Ungkapan ini penting dikenali dalam konteks perawatan karena bisa menjadi tanda berbagai kondisi kesehatan yang perlu diperhatikan.",
 "Kata 痛い (itai) berarti？": "痛い (itai) berarti sakit/nyeri, kata sifat-i dasar untuk menyatakan rasa sakit. Dipakai dengan pola [bagian tubuh]+が痛い, contoh: 頭が痛い (kepala sakit), 歯が痛い (gigi sakit).",
 "Bagaimana menanyakan 'ada apa/kenapa?' ke pasien?": "どうしましたか (dou shimashita ka) berarti 'ada apa/kenapa?', pertanyaan standar yang diucapkan tenaga medis/perawat untuk menanyakan keluhan awal pasien.",
 "Apa arti 薬 (kusuri)?": "薬 (kusuri) berarti obat. Kata kerja yang sering menyertainya adalah 飲む: 薬を飲む berarti 'minum obat', meski dalam bahasa Indonesia biasanya dikatakan 'makan obat'.",
 "'ゆっくり休んでください' artinya？": "ゆっくり休んでください berarti 'istirahatlah pelan-pelan/dengan tenang'. Ungkapan ini sering diucapkan sebagai bentuk perhatian kepada seseorang yang sedang sakit atau kelelahan.",
 # ── Kosakata-Warna ──
 "Apa arti 赤い (akai)?": "赤い berarti merah, salah satu kata sifat-i dasar untuk warna. Sebagian besar nama warna dalam bahasa Jepang bisa berakhiran -i dan berfungsi sebagai kata sifat-i langsung.",
 "Manakah yang BENAR untuk \"mobil hijau\"?": "緑の車 adalah bentuk yang benar. Karena 緑 (hijau) adalah kata benda (bukan kata sifat-i), diperlukan partikel の untuk menghubungkannya dengan kata benda lain yang diterangkan.",
 "Mengapa 緑い SALAH?": "緑 hanya berfungsi sebagai kata benda, bukan kata sifat-i, sehingga tidak bisa langsung ditambah い untuk menerangkan benda. Warna yang berbentuk kata sifat-i sejati misalnya 赤い, 青い, 黒い, 白い.",
 "青信号 (aoshingou) sebenarnya berwarna？": "Lampu hijau lalu lintas di Jepang disebut 青信号 (secara harfiah 'sinyal biru'), meski warnanya sebenarnya hijau. Ini adalah kekhasan budaya bahasa Jepang yang mengelompokkan sebagian warna hijau ke dalam kategori 青 (biru).",
 "Bentuk kata benda dari 白い adalah？": "白 (shiro). Untuk mengubah kata sifat-i warna menjadi kata benda, cukup buang akhiran い: 白い (putih, sifat) → 白 (putih, benda), dipakai misalnya dalam 白のシャツ (kemeja putih).",
 "Apa arti 紫 (murasaki)?": "紫 berarti ungu, dan merupakan kata benda (bukan kata sifat-i), sehingga memerlukan partikel の saat menerangkan benda lain, contoh: 紫の花 (bunga ungu).",
 "Warna yang BISA jadi kata sifat-i adalah？": "黒い (hitam) adalah kata sifat-i sejati yang bisa langsung menerangkan benda tanpa partikel tambahan. Sebaliknya, 緑 (hijau), ピンク (pink), dan オレンジ (oranye) adalah kata benda yang memerlukan partikel の.",
 "Apa arti 茶色い (chairoi)?": "茶色い berarti cokelat, secara harfiah berasal dari 茶 (teh) + 色 (warna) + い (akhiran sifat-i). Kata ini adalah salah satu warna yang meski merupakan kata majemuk, tetap berfungsi sebagai kata sifat-i.",
 "青りんご artinya？": "青りんご berarti apel hijau. Ini adalah contoh lain di mana kata 青 (yang secara harfiah berarti biru) dipakai untuk beberapa hal berwarna hijau dalam bahasa Jepang, mirip dengan 青信号.",
 "Bagaimana mengatakan \"bunga ungu\"?": "紫の花 adalah bentuk yang benar. Karena 紫 (ungu) adalah kata benda, diperlukan partikel の untuk menghubungkannya dengan kata benda lain yang diterangkan, dalam hal ini 花 (bunga).",
 # ── Salam-Sapaan-Jepang ──
 "Bagaimana mengucapkan 'Selamat pagi' secara sopan?": "おはようございます (ohayou gozaimasu) adalah bentuk sopan dari salam pagi. Bentuk kasualnya (おはよう saja) dipakai dengan teman dekat atau keluarga, bukan dengan atasan atau orang yang baru dikenal.",
 "Kapan こんばんは digunakan?": "こんばんは (konbanwa) dipakai sore hingga malam hari, berbeda dari こんにちは yang dipakai siang hari. Kedua salam ini tidak memiliki bentuk sopan tambahan seperti ございます.",
 "Apa arti すみません?": "すみません (sumimasen) bersifat multifungsi: bisa berarti maaf, permisi (untuk memanggil perhatian), atau bahkan terima kasih dalam konteks tertentu. Kata ini adalah salah satu ungkapan paling serbaguna dalam bahasa Jepang.",
 "Ungkapan yang tepat saat pertama kali bertemu seseoran": "はじめまして (hajimemashite) berarti 'salam kenal', diucapkan khusus saat pertemuan pertama kali dan selalu diikuti dengan penyebutan nama diri dalam rangkaian perkenalan.",
 "Apa yang diucapkan saat pulang dan tiba di rumah?": "ただいま (tadaima) diucapkan saat tiba di rumah, secara harfiah berarti 'saya baru saja pulang'. Anggota keluarga di rumah biasanya menjawab dengan おかえりなさい (selamat datang kembali).",
 "Balasan untuk ありがとう adalah？": "どういたしまして (dou itashimashite) berarti 'sama-sama/terima kasih kembali', balasan standar untuk ucapan terima kasih. Dalam percakapan santai, terkadang cukup dibalas dengan いいえ atau senyuman.",
 "よろしくお願いします artinya？": "よろしくお願いします dipakai saat berkenalan atau memulai kerja sama, mengandung harapan akan hubungan baik ke depannya. Tidak ada padanan tunggal dalam bahasa Indonesia, tapi maknanya mendekati 'mohon bantuannya/kerja samanya'.",
 "Manakah salam perpisahan yang KASUAL?": "またね (mata ne) berarti 'sampai jumpa', bentuk kasual yang dipakai dengan teman dekat. Bentuk lebih formal untuk perpisahan adalah さようなら, meski jarang dipakai dalam percakapan sehari-hari modern.",
 "Apa yang diucapkan saat KELUAR dari rumah?": "いってきます (ittekimasu) berarti 'saya berangkat (dan akan kembali)', diucapkan saat keluar rumah. Anggota keluarga yang tinggal biasanya menjawab dengan いってらっしゃい (hati-hati di jalan).",
 "Mengapa は pada こんにちは dibaca 'wa'?": "は dibaca 'wa' ketika berfungsi sebagai partikel topik dalam kalimat, meskipun ditulis dengan huruf hiragana は (biasanya dibaca 'ha'). Ini adalah salah satu aturan pengecualian pelafalan penting dalam bahasa Jepang.",
 # ── Verb-Intransitif-Guide ──
 "「窓を（　）」に入る他動詞は？": "開ける (akeru) adalah 他動詞 (transitif) yang memerlukan partikel を, seperti dalam 窓を開ける (membuka jendela). Kata kerja transitif menunjukkan subjek yang secara sengaja melakukan tindakan pada objek.",
 "「ドアが（　）」に入る自動詞は？": "閉まる (shimaru) adalah 自動詞 (intransitif), dipakai dalam ドアが閉まる (pintu tertutup dengan sendirinya). Kata kerja intransitif menunjukkan perubahan keadaan tanpa menyebutkan pelaku yang menyebabkannya.",
 "「〜てある」は他動詞・自動詞どちら？": "てある hanya dipakai dengan kata kerja 他動詞 (transitif) untuk menunjukkan hasil suatu tindakan yang disengaja: 窓が開けてある (jendela sengaja dibuka/dalam keadaan terbuka karena seseorang membukanya) adalah benar, sedangkan ×窓が開いてある salah karena 開く adalah intransitif.",
 "「増やす」の自動詞ペアは？": "増える (fueru) adalah pasangan intransitif dari 増やす (fuyasu, menambah). 収入が増える berarti 'penghasilan bertambah (dengan sendirinya)', berbeda dari 収入を増やす yang berarti 'menambah penghasilan (secara sengaja)'.",
 "「電気が（　）」自動詞は？": "付く (tsuku) adalah kata kerja intransitif, dipakai dalam 電気が付く (lampu menyala). Pasangan transitifnya adalah 付ける (tsukeru), dipakai dalam 電気を付ける (menyalakan lampu).",
 "「変える」の自動詞ペアは？": "変わる (kawaru) adalah pasangan intransitif dari 変える (kaeru, mengubah). 状況が変わる berarti 'situasi berubah (dengan sendirinya)', berbeda dari 状況を変える yang berarti 'mengubah situasi (secara sengaja)'.",
 "「〜ている」で他動詞と自動詞の違いは？": "窓を開けている berarti 'sedang membuka jendela' (aksi sedang berlangsung, memakai kata kerja transitif), sedangkan 窓が開いている berarti 'jendela sudah dalam keadaan terbuka' (hasil keadaan, memakai kata kerja intransitif).",
 "「壊す」の自動詞ペアは？": "壊れる (kowareru) adalah pasangan intransitif dari 壊す (kowasu, merusak). 機械が壊れる berarti 'mesin rusak (dengan sendirinya)', berbeda dari 機械を壊す yang berarti 'merusak mesin (secara sengaja)'.",
 # ── Suru-Verbs-List ──
 "「確認する」の意味は？": "確認する berarti memeriksa/mengkonfirmasi. Sering dipakai dalam konteks formal seperti ご確認をお願いします (mohon dikonfirmasi), umum ditemui dalam email bisnis atau instruksi kerja.",
 "「提案する」の意味は？": "提案する berarti mengajukan proposal/menyarankan. Kata kerja する ini sering dipakai dalam konteks rapat atau diskusi ketika seseorang mengusulkan ide atau solusi baru.",
 "「貢献する」の意味は？": "貢献する berarti berkontribusi/memberikan sumbangsih. Kata ini sering dipakai dalam konteks formal untuk menggambarkan peran seseorang dalam kesuksesan tim atau organisasi.",
 "「発展する」の意味は？": "発展する berarti berkembang/maju. Contoh: 経済が発展する berarti 'ekonomi berkembang'. Kata kerja ini sering dipakai dalam konteks pembahasan sosial, ekonomi, atau teknologi.",
 "「妥協する」の意味は？": "妥協する berarti berkompromi. Dalam negosiasi, 妥協 dipakai untuk menggambarkan proses mencari titik temu antara pihak-pihak yang memiliki kepentingan berbeda.",
 # ── Speaking-Daily ──
 "食事介助の声かけで大切なのは？": "Poin penting dalam menyapa saat bantuan makan: memanggil nama (menghargai individu), menyampaikan isi menu (menimbulkan antisipasi), dan mengajak makan bersama secara hangat — bukan sekadar menyodorkan makanan tanpa kata-kata.",
 "「いかがですか？」の代わりに使える丁寧な表現は？": "いかがでしょうか lebih sopan dibanding いかがですか. Contoh penggunaan: ご気分はいかがでしょうか (bagaimana perasaan Anda?), sering dipakai dalam konteks perawatan untuk menanyakan kondisi dengan lebih halus.",
 "就寝前の声かけで必ず伝えることは？": "Sebelum tidur, ucapan yang wajib disampaikan: お疲れさまでした (mengapresiasi usaha hari itu) + おやすみなさい (selamat tidur) + tawaran bantuan jika ada yang dibutuhkan di malam hari — kombinasi ini menunjukkan perhatian menyeluruh.",
 "利用者が「腰が痛い」と言った時の適切な対応は？": "Menanggapi keluhan nyeri: pertama dengarkan dengan empati, lalu tanyakan detail (sejak kapan, seberapa parah, jenis nyerinya) sebelum melaporkan ke tenaga medis — jangan langsung mengabaikan atau menyimpulkan sendiri tanpa konfirmasi lebih lanjut.",
}

FILES = ['Kosakata-Makanan.html','Kosakata-Profesi.html','Kosakata-Tubuh-Kesehatan.html','Kosakata-Warna.html','Salam-Sapaan-Jepang.html','Verb-Intransitif-Guide.html','Suru-Verbs-List.html','Speaking-Daily.html']
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
