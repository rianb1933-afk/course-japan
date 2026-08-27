#!/usr/bin/env python3
"""
3 modul Kaiwa (percakapan) bahasa Jepang umum — celah nyata (0 file mandiri).
Situasi paling umum untuk pemula: perkenalan diri, belanja/toko, restoran.

Format: kosakata/frasa inti + bank soal (pilih respons percakapan yang tepat),
pembahasan dwibahasa. Meng-clone template Kaigo-Ujian-N2 (struktur terbukti:
PH_VOCAB + var Q + progress + SEO), path & tema disesuaikan untuk materi umum.

    python3 scripts/build_kaiwa_umum.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'Materi', 'Kaigo-Ujian-N2.html')

MODULES = {
 'Kaiwa-Jikoshoukai.html': {
   'title': 'Kaiwa: Perkenalan Diri 自己紹介',
   'desc': 'Percakapan perkenalan diri bahasa Jepang 自己紹介: menyapa, menyebut nama, asal, pekerjaan, dan salam penutup. Latihan pilih respons + kosakata dwibahasa.',
   'vocab': [
     ["はじめまして","hajimemashite","salam kenalan (pertama bertemu)"],
     ["自己紹介","jiko shokai","perkenalan diri"],
     ["名前","namae","nama"],
     ["出身","shusshin","asal daerah"],
     ["仕事","shigoto","pekerjaan"],
     ["どうぞよろしく","dozo yoroshiku","senang berkenalan"],
     ["お願いします","onegai shimasu","mohon (bantuannya)"],
     ["趣味","shumi","hobi"],
     ["失礼します","shitsurei shimasu","permisi"],
     ["こちらこそ","kochira koso","saya juga (balasan)"],
   ],
   'q': [
     {"q":"初対面の相手に最初に言う挨拶はどれか。","opts":["はじめまして","おやすみ","ただいま","いただきます"],"a":0,"e":"初対面は「はじめまして」(salam pertama kali bertemu)から始める。"},
     {"q":"名前を伝えるときの自然な言い方はどれか。","opts":["わたしは田中です","田中する","田中ください","田中ですか"],"a":0,"e":"「わたしは〜です」(nama saya…)で名乗る. 丁寧で基本的な自己紹介。"},
     {"q":"「ご出身はどちらですか」への答えはどれか。","opts":["インドネシアです","元気です","そうです","わかりません"],"a":0,"e":"出身=asal daerah. 「〜です」で国や地域を答える。"},
     {"q":"自己紹介の結びとして適切なのはどれか。","opts":["どうぞよろしくお願いします","さようなら","おやすみなさい","いただきます"],"a":0,"e":"結びは「どうぞよろしくお願いします」(mohon kerja samanya)が定番。"},
     {"q":"「どうぞよろしく」と言われたときの返事はどれか。","opts":["こちらこそ、よろしくお願いします","いいえ","けっこうです","だめです"],"a":0,"e":"「こちらこそ」(saya juga)で返すと丁寧で自然。"},
     {"q":"仕事を尋ねる質問はどれか。","opts":["お仕事は何ですか","元気ですか","何時ですか","いくらですか"],"a":0,"e":"「お仕事は何ですか」(pekerjaan apa?)で職業を尋ねる。"},
     {"q":"趣味を伝える言い方はどれか。","opts":["趣味は音楽です","趣味します","趣味ください","趣味ですか"],"a":0,"e":"「趣味は〜です」(hobi saya…)で好きなことを紹介する。"},
     {"q":"部屋を出るときの丁寧な言葉はどれか。","opts":["失礼します","いただきます","ただいま","おかえり"],"a":0,"e":"「失礼します」(permisi)は入退室や別れ際の丁寧な表現。"},
     {"q":"相手の名前を聞き取れなかったときの言い方はどれか。","opts":["もう一度お願いします","だめです","知りません","いいです"],"a":0,"e":"「もう一度お願いします」(tolong ulangi)で丁寧に聞き返す。"},
     {"q":"自己紹介で避けたほうがよいのはどれか。","opts":["いきなりタメ口で話す","丁寧語を使う","笑顔で話す","名前を言う"],"a":0,"e":"初対面はタメ口を避け丁寧語(bahasa sopan)で. 良い第一印象に。"},
   ]},
 'Kaiwa-Kaimono.html': {
   'title': 'Kaiwa: Belanja di Toko 買い物',
   'desc': 'Percakapan belanja bahasa Jepang 買い物: menanyakan harga, jumlah, ukuran, membayar, dan ungkapan di kasir. Latihan pilih respons + kosakata dwibahasa.',
   'vocab': [
     ["いくらですか","ikura desu ka","berapa harganya?"],
     ["ください","kudasai","tolong/minta"],
     ["これ","kore","ini"],
     ["円","en","yen"],
     ["袋","fukuro","kantong"],
     ["レジ","reji","kasir"],
     ["カード","kaado","kartu"],
     ["現金","genkin","tunai"],
     ["安い","yasui","murah"],
     ["高い","takai","mahal"],
   ],
   'q': [
     {"q":"値段を尋ねるときの言い方はどれか。","opts":["これはいくらですか","これは何ですか","これはどこですか","これはだれですか"],"a":0,"e":"「いくらですか」(berapa harganya?)で値段を尋ねる。"},
     {"q":"商品を買いたいときの言い方はどれか。","opts":["これをください","これをします","これをですか","これをいます"],"a":0,"e":"「〜をください」(minta/tolong…)で購入や依頼を伝える。"},
     {"q":"「袋はいりますか」への断り方はどれか。","opts":["いいえ、けっこうです","はい、そうです","わかりません","高いです"],"a":0,"e":"「けっこうです」(tidak usah)で丁寧に断る。「いりません」も可。"},
     {"q":"支払い方法を伝える言い方はどれか。","opts":["カードでお願いします","カードします","カードですか","カードください"],"a":0,"e":"「カードでお願いします」(dengan kartu)で支払い方法を伝える。"},
     {"q":"「高い」の反対の意味の語はどれか。","opts":["安い","大きい","新しい","多い"],"a":0,"e":"安い(murah)⇔高い(mahal). 値段を表す基本の形容詞。"},
     {"q":"店員の「いらっしゃいませ」の意味はどれか。","opts":["ようこそ(いらっしゃい)","さようなら","ありがとう","ごめんなさい"],"a":0,"e":"「いらっしゃいませ」(selamat datang)は店で客を迎える挨拶。"},
     {"q":"数量を伝える言い方で正しいのはどれか。","opts":["みっつください","みっつします","みっつですか","みっついます"],"a":0,"e":"「〜ください」に数を付け「みっつ(3個)ください」(minta 3)と言う。"},
     {"q":"「ありがとうございました」に対する店員の返事はどれか。","opts":["またお越しくださいませ","いくらですか","高いです","だめです"],"a":0,"e":"「またお越しください」(datang lagi ya)は退店時の丁寧な見送り。"},
     {"q":"試着したいときの言い方はどれか。","opts":["試着してもいいですか","試着します","試着ください","試着ですか"],"a":0,"e":"「〜てもいいですか」(bolehkah…?)で許可を求める丁寧な表現。"},
     {"q":"支払いで現金を使うことを表す語はどれか。","opts":["現金","カード","袋","レジ"],"a":0,"e":"現金(tunai)⇔カード. レジ(kasir)で支払う。"},
   ]},
 'Kaiwa-Restoran.html': {
   'title': 'Kaiwa: Di Restoran レストラン',
   'desc': 'Percakapan di restoran bahasa Jepang レストラン: memesan, menanyakan menu, meminta, dan membayar. Latihan pilih respons + kosakata dwibahasa.',
   'vocab': [
     ["メニュー","menyuu","menu"],
     ["注文","chumon","pesanan"],
     ["おすすめ","osusume","rekomendasi"],
     ["水","mizu","air"],
     ["お会計","okaikei","tagihan/bayar"],
     ["おいしい","oishii","enak"],
     ["注文お願いします","chumon onegai shimasu","tolong, mau pesan"],
     ["いただきます","itadakimasu","selamat makan (sebelum makan)"],
     ["ごちそうさま","gochisosama","terima kasih (setelah makan)"],
     ["一つ","hitotsu","satu (buah)"],
   ],
   'q': [
     {"q":"店員を呼んで注文したいときの言い方はどれか。","opts":["すみません、注文お願いします","さようなら","ただいま","おやすみ"],"a":0,"e":"「すみません」で呼び「注文お願いします」(mau pesan)と伝える。"},
     {"q":"店員におすすめを尋ねる言い方はどれか。","opts":["おすすめは何ですか","いくらですか","どこですか","だれですか"],"a":0,"e":"「おすすめは何ですか」(rekomendasinya apa?)でおすすめを聞く。"},
     {"q":"料理を一つ頼むときの言い方はどれか。","opts":["これを一つください","これを一つします","これを一つですか","これ一ついます"],"a":0,"e":"「〜を一つください」(minta satu…)で数を添えて注文する。"},
     {"q":"食事の前に言う言葉はどれか。","opts":["いただきます","ごちそうさま","さようなら","はじめまして"],"a":0,"e":"食前は「いただきます」(selamat makan). 感謝を表す挨拶。"},
     {"q":"食事の後に言う言葉はどれか。","opts":["ごちそうさまでした","いただきます","いらっしゃいませ","おはよう"],"a":0,"e":"食後は「ごちそうさま」(terima kasih makanannya)と言う。"},
     {"q":"「お会計」の意味はどれか。","opts":["支払い(tagihan)","入口","予約","注文"],"a":0,"e":"お会計(tagihan/bayar)=食事後の支払い. 「お会計お願いします」で頼む。"},
     {"q":"水がほしいときの言い方はどれか。","opts":["お水をください","お水します","お水ですか","お水います"],"a":0,"e":"「お水をください」(minta air)で丁寧に頼む。"},
     {"q":"料理がおいしいと伝える言い方はどれか。","opts":["おいしいです","たかいです","さむいです","ねむいです"],"a":0,"e":"「おいしいです」(enak)で感想を伝える. 店の人も喜ぶ表現。"},
     {"q":"予約があることを伝える言い方はどれか。","opts":["予約しています","予約ください","予約ですか","予約します"],"a":0,"e":"「予約しています」(sudah reservasi)で来店時に伝える。"},
     {"q":"注文を変えたいときの丁寧な言い方はどれか。","opts":["すみません、変更してもいいですか","変える","だめです","知りません"],"a":0,"e":"「変更してもいいですか」(boleh ubah?)で丁寧に許可を求める。"},
   ]},
}


def js_vocab(vocab):
    return '[' + ', '.join(
        '[' + ', '.join('"' + str(x).replace('"', '\\"') + '"' for x in v) + ']'
        for v in vocab) + ']'


def build_one(slug, spec, template):
    c = template
    c = re.sub(r'<title>.*?</title>', f'<title>{spec["title"]} | Nihongo Pro Academy</title>', c, count=1)
    c = re.sub(r'(<meta name="description" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['desc'] + m.group(2), c, count=1)
    c = c.replace('Kaigo-Ujian-N2.html', slug)
    c = re.sub(r'(<meta property="og:title" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['title'] + ' — Nihongo Pro Academy' + m.group(2), c, count=1)
    c = re.sub(r'PH_VOCAB=\[.*?\];', 'PH_VOCAB=' + js_vocab(spec['vocab']) + ';', c, count=1, flags=re.DOTALL)
    c = re.sub(r'var Q=\[.*?\];', 'var Q=' + json.dumps(spec['q'], ensure_ascii=False) + ';', c, count=1, flags=re.DOTALL)
    return c


def main():
    template = open(TEMPLATE, encoding='utf-8').read()
    for slug, spec in MODULES.items():
        out = os.path.join(ROOT, 'Materi', slug)
        open(out, 'w', encoding='utf-8').write(build_one(slug, spec, template))
        print(f"OK {slug}: {len(spec['q'])} soal, {len(spec['vocab'])} kosakata")


if __name__ == '__main__':
    main()
