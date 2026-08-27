#!/usr/bin/env python3
"""Perdalam pembahasan JLPT batch A: 6 modul grammar."""
import json, os, re

DEEP = {
 # ── Grammar-Izin-Kewajiban ──
 "Bagaimana meminta izin 'Bolehkah saya memotret?'": "写真を撮ってもいいですか。 Pola ～てもいいですか dipakai untuk meminta izin secara sopan. Bentuknya: kata kerja bentuk-て + もいいですか. Kesalahan umum adalah memakai bentuk kamus (撮るてもいい) — harus bentuk-て dulu (撮って).",
 "'ここでタバコを吸ってはいけません' artinya?": "Artinya 'dilarang merokok di sini'. Pola ～てはいけません menyatakan larangan tegas, sering dipakai pada aturan tempat umum atau instruksi resmi. Ini kebalikan dari ～てもいい (boleh) yang menyatakan izin.",
 "Pola untuk menyatakan KEWAJIBAN (harus):": "～なければならない menyatakan kewajiban (harus melakukan). Dibentuk dari bentuk negatif (ない-form) dengan mengganti ない menjadi なければならない. Contoh: 行く → 行かない → 行かなければならない (harus pergi).",
 "'明日は来なくてもいいです' artinya?": "Artinya 'besok tidak perlu datang'. Pola ～なくてもいい menyatakan bahwa sesuatu tidak wajib dilakukan. Perhatikan bedanya dengan ～てはいけない (dilarang) — 'tidak perlu' berbeda dengan 'tidak boleh'.",
 "Bentuk 'harus pergi' dari 行く adalah?": "行かなければならない. Langkahnya: 行く → bentuk negatif 行かない → buang い → tambah ければならない. Bentuk ini sering muncul di JLPT N4 dan digunakan dalam situasi formal maupun tulisan.",
 "Bentuk kasual dari ～なければならない adalah?": "Bentuk kasualnya adalah ～なきゃ atau ～ないと, misalnya 行かなきゃ (harus pergi). Bentuk ini sangat umum dalam percakapan sehari-hari, tetapi sebaiknya dihindari dalam situasi formal atau saat berbicara dengan atasan.",
 "Bentuk kasual dari ～てはいけない adalah?": "Bentuk kasualnya adalah ～ちゃだめ atau ～ちゃいけない, misalnya 食べちゃだめ (jangan dimakan). Bentuk ini terdengar akrab dan sering dipakai orang tua kepada anak atau antar teman dekat.",
 "'急がなくてもいいです' artinya?": "Artinya 'tidak perlu terburu-buru'. Terbentuk dari 急ぐ (terburu-buru) → 急がない → 急がなくてもいい. Ungkapan ini sering dipakai untuk menenangkan lawan bicara agar tidak merasa tertekan oleh waktu.",
 "Manakah yang berarti 'boleh makan'?": "食べてもいい berarti 'boleh makan'. Pola ～てもいい menyatakan izin. Perhatikan bentuk-て dari 食べる adalah 食べて, bukan 食べるて — kesalahan pembentukan bentuk-て adalah kesalahan paling umum pemula.",
 "Untuk memberi izin, jawaban yang tepat adalah:": "はい、いいですよ atau どうぞ dipakai untuk memberikan izin. どうぞ terdengar lebih ramah dan mempersilakan. Jika ingin menolak dengan sopan, biasanya digunakan すみません、ちょっと… tanpa mengatakan 'tidak' secara langsung.",
 # ── Grammar-Nagara ──
 "Bagaimana membentuk ～ながら dari 食べる?": "食べながら. Caranya: ubah ke bentuk ます (食べます), buang ます, lalu tambahkan ながら. Pola ini menyatakan dua aksi yang dilakukan bersamaan oleh orang yang sama.",
 "Aturan penting ～ながら adalah...": "Kedua aksi harus dilakukan oleh subjek yang sama. Kalimat seperti '弟が音楽を聞きながら私が勉強します' salah karena subjeknya berbeda. Untuk subjek berbeda, gunakan pola lain seperti ～ている間に.",
 "Dalam \"音楽を聞きながら勉強します\", aksi UTAMA-nya adalah?": "勉強します (belajar) adalah aksi utama karena berada di akhir kalimat. Dalam pola ～ながら, aksi sebelum ながら adalah aksi sampingan, sedangkan aksi di akhir kalimat merupakan fokus utamanya.",
 "～ながら bisa dipakai pada...": "～ながら hanya bisa dipakai pada kata kerja, bukan kata benda atau kata sifat. Kata kerja tersebut juga harus berupa aksi yang bisa berlangsung dalam durasi tertentu, bukan aksi sesaat.",
 "Manakah kalimat yang BENAR?": "Kalimat yang benar harus memenuhi tiga syarat: subjeknya satu, menggunakan kata kerja (bukan kata benda/sifat), dan kedua aksi berlangsung bersamaan. Pelanggaran salah satu syarat membuat kalimat menjadi tidak alami.",
 "\"テレビを見ながらご飯を食べます\" artinya?": "Artinya 'makan sambil menonton TV'. Aksi utamanya adalah 食べます (makan) karena berada di akhir, sedangkan 見ながら (sambil menonton) adalah aksi sampingan yang menyertainya.",
 "Bentuk ながら dari 歩く adalah?": "歩きながら. Prosesnya: 歩く → 歩きます → buang ます → 歩き + ながら. Contoh pemakaian: 歩きながら話す (berbicara sambil berjalan).",
 "\"歩きながらスマホを見ないでください\" artinya?": "Artinya 'jangan melihat ponsel sambil berjalan'. 見ないでください adalah bentuk larangan sopan. Kalimat ini sering ditemui sebagai peringatan di stasiun atau tempat umum di Jepang.",
 "Jika ingin menekankan \"mendengarkan musik\" sebagai aksi utama:": "勉強しながら音楽を聞きます. Karena aksi utama selalu diletakkan di akhir kalimat, menukar posisi kedua kata kerja akan mengubah fokus makna kalimat tersebut.",
 "Bentuk ながら dari 見る adalah?": "見ながら. Prosesnya: 見る → 見ます → buang ます → 見 + ながら. Contoh: テレビを見ながら (sambil menonton TV).",
 # ── Grammar-Keinginan ──
 "Bagaimana mengubah 食べます menjadi 'ingin makan'?": "食べたい. Caranya: buang ます dari bentuk ます, lalu tambahkan たい. Pola ～たい hanya digunakan untuk menyatakan keinginan diri sendiri, bukan keinginan orang lain.",
 "Untuk 'ingin MEMILIKI benda', pola yang tepat:": "Kata benda + が欲しい, misalnya 車が欲しい (ingin punya mobil). Perhatikan partikelnya が, bukan を. Sedangkan ～たい dipakai untuk keinginan melakukan aksi (kata kerja).",
 "'日本に行きたいです' artinya?": "Artinya 'saya ingin pergi ke Jepang'. Terbentuk dari 行きます + たい = 行きたい. Menambahkan です di akhir membuatnya menjadi bentuk sopan yang cocok untuk percakapan formal.",
 "Bentuk negatif dari 食べたい adalah?": "食べたくない (tidak ingin makan). Karena ～たい berkonjugasi seperti kata sifat-i, akhiran い berubah menjadi くない untuk bentuk negatif — sama seperti 高い → 高くない.",
 "Manakah yang BENAR untuk 'ingin mobil baru'?": "新しい車が欲しい. Untuk keinginan memiliki benda, gunakan pola 'kata benda + が欲しい'. Kesalahan umum adalah memakai partikel を atau menggunakan ～たい yang seharusnya untuk kata kerja.",
 "'何が欲しいですか' artinya?": "Artinya 'kamu ingin (punya) apa?'. 欲しい dipakai untuk menanyakan keinginan memiliki suatu benda. Jika ingin menanyakan aksi yang ingin dilakukan, gunakan 何がしたいですか.",
 "たい dan 欲しい berubah mengikuti pola kata...": "Keduanya berkonjugasi mengikuti pola kata sifat-i. Contohnya bentuk negatif menjadi ～くない (食べたくない、欲しくない) dan bentuk lampau menjadi ～かった (食べたかった、欲しかった).",
 "Bentuk lampau 'ingin makan' (食べたい):": "食べたかった (tadinya ingin makan). Karena ～たい berkonjugasi seperti kata sifat-i, bentuk lampaunya mengubah い menjadi かった — sama seperti 高い → 高かった.",
 "Bagaimana mengatakan 'Saya ingin (punya) waktu'?": "時間が欲しいです. Karena 時間 (waktu) adalah kata benda, digunakan pola が欲しい, bukan ～たい. Ungkapan ini sering dipakai saat merasa sibuk dan membutuhkan waktu luang.",
 # ── Grammar-Sugiru ──
 "Bagaimana membentuk \"makan terlalu banyak\" dari 食べる?": "食べすぎる. Caranya: ubah ke bentuk ます (食べます), buang ます, lalu tambahkan すぎる. Pola ini menyatakan sesuatu yang melebihi batas wajar dan umumnya bernuansa negatif.",
 "Bagaimana membentuk \"terlalu mahal\" dari 高い?": "高すぎる. Untuk kata sifat-i, buang akhiran い lalu tambahkan すぎる. Ungkapan ini menyiratkan bahwa harganya di luar batas kewajaran, bukan sekadar mahal.",
 "Apa perbedaan とても高い dan 高すぎる?": "とても高い bersifat netral (sangat mahal, tapi mungkin tetap dibeli), sedangkan 高すぎる mengandung nuansa negatif bahwa harganya melewati batas wajar sehingga menjadi masalah. Pemilihan keduanya menunjukkan sikap pembicara.",
 "\"昨日、飲みすぎました\" artinya?": "Artinya 'kemarin saya minum terlalu banyak', dengan nuansa penyesalan. Pola ～すぎる sering digunakan untuk mengungkapkan bahwa sesuatu dilakukan berlebihan dan berdampak kurang baik.",
 "Bentuk すぎる dari kata sifat-na 静か adalah?": "静かすぎる. Untuk kata sifat-na, すぎる langsung ditempelkan tanpa perlu menghapus apa pun (tidak perlu な). Contoh lain: 便利すぎる (terlalu praktis).",
 "Bentuk すぎる dari いい (bagus) adalah?": "よすぎる. Kata sifat いい adalah pengecualian karena berkonjugasi dari bentuk asal よい. Aturan yang sama berlaku pada bentuk lain seperti よくない dan よかった.",
 "\"働きすぎです\" — すぎ di sini berfungsi sebagai?": "～すぎ tanpa る berfungsi sebagai kata benda, sehingga 働きすぎ berarti 'kerja berlebihan' sebagai suatu kondisi. Bentuk ini sering muncul dalam pembahasan sosial seperti 食べすぎ atau 飲みすぎ.",
 "Bagaimana mengatakan \"jangan makan terlalu banyak\"?": "食べすぎないで. Karena すぎる berkonjugasi sebagai ru-verb, bentuk negatifnya adalah すぎない, lalu ditambah で untuk membentuk larangan yang lembut.",
 "すぎる berkonjugasi seperti kata kerja kelompok...": "すぎる termasuk ru-verb (kata kerja kelompok 2), sehingga konjugasinya menjadi すぎます、すぎました、すぎない. Memahami ini penting agar bisa membentuk kalimat lampau maupun negatif dengan benar.",
 # ── Grammar-Sonkeigo-Kenjougo ──
 "Sonkeigo dipakai untuk tindakan siapa?": "尊敬語 (sonkeigo) dipakai untuk tindakan ORANG LAIN, khususnya atasan atau pelanggan, dengan cara meninggikan mereka. Menggunakan sonkeigo untuk tindakan diri sendiri adalah kesalahan yang terdengar sombong.",
 "Kenjougo dipakai untuk tindakan siapa?": "謙譲語 (kenjougo) dipakai untuk tindakan DIRI SENDIRI dengan cara merendahkan diri, sehingga secara tidak langsung meninggikan lawan bicara. Ini adalah pasangan dari sonkeigo dalam sistem keigo bahasa Jepang.",
 "Sonkeigo dari 食べる adalah?": "召し上がる (meshiagaru) adalah sonkeigo untuk makan dan minum. Contoh: どうぞ召し上がってください (silakan dinikmati). Bentuk ini sering dipakai di restoran atau saat menjamu tamu.",
 "Kenjougo dari 行く adalah?": "参る (mairu) atau 伺う (ukagau) adalah kenjougo untuk pergi. 伺う terdengar lebih sopan dan sering dipakai saat akan mengunjungi tempat atasan atau klien.",
 "\"社長がいらっしゃいます\" — いらっしゃる di sini adalah?": "いらっしゃる adalah sonkeigo yang meninggikan direktur (orang lain). Kata ini serbaguna karena bisa berarti いる (ada)、行く (pergi)、maupun 来る (datang) tergantung konteksnya.",
 "Kesalahan FATAL dalam keigo adalah?": "Menggunakan sonkeigo untuk tindakan diri sendiri, karena itu berarti meninggikan diri sendiri dan terdengar sangat sombong. Contoh salah: 私が召し上がります — seharusnya 私がいただきます.",
 "Sonkeigo dari 言う adalah?": "おっしゃる (ossharu) adalah sonkeigo untuk berbicara atau berkata. Contoh: 先生がおっしゃいました (Bapak/Ibu guru berkata). Kenjougo-nya adalah 申す atau 申し上げる.",
 "Pola \"お + ます形 + する\" adalah?": "Pola お＋ます形＋する adalah kenjougo yang merendahkan diri, misalnya お持ちします (saya yang membawakan). Sedangkan pola sonkeigo-nya adalah お＋ます形＋になる, misalnya お持ちになる.",
 "Kenjougo dari 見る adalah?": "拝見する (haiken suru) adalah kenjougo untuk melihat. Contoh: 資料を拝見しました (saya sudah melihat dokumennya). Sonkeigo untuk melihat adalah ご覧になる.",
 "\"お食事を召し上がりましたか\" ditujukan kepada?": "Kalimat ini ditujukan kepada orang lain yang dihormati, karena 召し上がる adalah sonkeigo. Jika ingin membicarakan diri sendiri, seharusnya digunakan kenjougo: いただきました.",
 # ── Grammar-Teiru ──
 "Bagaimana membentuk ～ている dari 食べる?": "食べている. Caranya: ubah ke bentuk て (食べて) lalu tambahkan いる. Pola ini bisa berarti aksi sedang berlangsung, kebiasaan, atau keadaan hasil — tergantung jenis kata kerjanya.",
 "'今、ご飯を食べています' termasuk makna...": "Ini menunjukkan aksi yang sedang berlangsung, ditandai kata 今 (sekarang) dan kata kerja durasi. Pola ～ている memiliki beberapa makna, sehingga kata keterangan waktu membantu menentukan maknanya.",
 "'東京に住んでいます' artinya?": "Artinya 'tinggal di Tokyo' sebagai keadaan menetap, bukan 'sedang dalam proses tinggal'. Kata kerja seperti 住む、結婚する、知る menyatakan keadaan hasil ketika digabung dengan ～ている.",
 "'毎朝、ジョギングをしています' termasuk makna...": "Ini menunjukkan kebiasaan atau rutinitas, ditandai kata 毎朝 (setiap pagi). Pola ～ている dengan kata keterangan frekuensi menyatakan aktivitas yang dilakukan berulang secara teratur.",
 "'窓が開いています' artinya?": "Artinya 'jendela dalam keadaan terbuka'. Karena 開く adalah kata kerja sesaat, penambahan ～ている menyatakan keadaan hasil dari aksi tersebut, bukan proses yang sedang berlangsung.",
 "Bentuk kasual/sehari-hari dari 食べている adalah?": "食べてる — huruf い sering dihilangkan dalam percakapan sehari-hari. Bentuk ini sangat umum dalam percakapan santai, tetapi sebaiknya tetap menggunakan bentuk lengkap dalam situasi formal atau tulisan.",
 "'知っています' artinya?": "Artinya '(sudah) tahu', menyatakan keadaan hasil karena 知る adalah kata kerja sesaat. Yang menarik, bentuk negatifnya bukan 知っていません melainkan 知りません — ini pengecualian yang sering diujikan.",
 "Bentuk sopan dari ～ている adalah?": "～ています adalah bentuk sopan (masu-form) dari ～ている. Bentuk ini digunakan dalam percakapan formal, dengan orang yang baru dikenal, atau dalam situasi kerja.",
}

FILES = ['Grammar-Izin-Kewajiban.html','Grammar-Nagara.html','Grammar-Keinginan.html','Grammar-Sugiru.html','Grammar-Sonkeigo-Kenjougo.html','Grammar-Teiru.html']
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
