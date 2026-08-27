#!/usr/bin/env python3
"""4 modul Kaiwa lanjutan (situasi harian relevan untuk pekerja/pelajar di Jepang):
rumah sakit, konbini, obrolan kantor/kerja, dan membuat janji temu.

Meng-clone template Kaigo-Ujian-N2.html (pola terbukti dari build_kaiwa_umum.py
dan build_kaiwa_batch2.py).

    python3 scripts/build_kaiwa_batch3.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'Materi', 'Kaigo-Ujian-N2.html')

MODULES = {
 'Kaiwa-Byouin.html': {
   'title': 'Kaiwa: Di Rumah Sakit/Klinik 病院',
   'desc': 'Percakapan di rumah sakit/klinik bahasa Jepang 病院: menjelaskan gejala, membuat janji periksa, dan mengambil obat. Latihan pilih respons + kosakata dwibahasa.',
   'vocab': [
     ["具合が悪い","guai ga warui","kondisi tidak enak badan"],
     ["熱がある","netsu ga aru","demam"],
     ["痛い","itai","sakit (nyeri)"],
     ["薬","kusuri","obat"],
     ["診察","shinsatsu","pemeriksaan dokter"],
     ["保険証","hokenshou","kartu asuransi"],
     ["予約","yoyaku","reservasi/janji temu"],
     ["症状","shoujou","gejala"],
     ["処方箋","shohousen","resep obat"],
     ["お大事に","odaiji ni","semoga lekas sembuh"],
   ],
   'q': [
     {"q":"具合が悪いことを伝える言い方はどれか。","opts":["具合が悪いです","元気です","忙しいです","眠いです"],"a":0,"e":"「具合が悪いです」(kondisi tidak enak badan)で体調不良を伝える。"},
     {"q":"熱があることを伝える言い方はどれか。","opts":["熱があります","熱がないです","元気です","寒いです"],"a":0,"e":"「熱があります」(saya demam)で症状を伝える基本表現。"},
     {"q":"痛い場所を伝えるときの言い方はどれか。","opts":["ここが痛いです","ここが安いです","ここが遠いです","ここが高いです"],"a":0,"e":"「ここが痛いです」(di sini sakit)で患部を指して伝える。"},
     {"q":"初診で受付に出すものはどれか。","opts":["保険証","予約","処方箋","症状"],"a":0,"e":"初診では「保険証」(kartu asuransi)を受付に提示する。"},
     {"q":"診察の予約を取りたいときの言い方はどれか。","opts":["予約したいです","予約しました","予約ですか","予約します"],"a":0,"e":"「〜たいです」(ingin…)で希望を伝え、予約を申し込む。"},
     {"q":"薬局で処方箋を渡すときに言う言葉はどれか。","opts":["これをお願いします","これはいくらですか","これはだれのですか","これは何ですか"],"a":0,"e":"「これをお願いします」(tolong ini)で処方箋を渡し薬を頼む。"},
     {"q":"医者に症状の期間を伝える言い方はどれか。","opts":["三日前から具合が悪いです","三日前は元気でした","三日前に行きました","三日前は休みでした"],"a":0,"e":"「〜前から」(sejak…yang lalu)で症状が始まった時期を伝える。"},
     {"q":"診察が終わったときに医者が言う言葉はどれか。","opts":["お大事に","いらっしゃいませ","ただいま","おかえりなさい"],"a":0,"e":"「お大事に」(semoga lekas sembuh)は診察後の丁寧な締めくくりの言葉。"},
     {"q":"薬の飲み方を尋ねる言い方はどれか。","opts":["一日に何回飲みますか","いくらですか","どこで買いますか","いつ休みですか"],"a":0,"e":"「一日に何回」(berapa kali sehari)で服用回数を確認する。"},
     {"q":"「アレルギーはありますか」と聞かれたときに答える言い方はどれか。","opts":["いいえ、ありません","はい、痛いです","はい、忙しいです","いいえ、元気です"],"a":0,"e":"アレルギーの有無は「はい/いいえ、あります/ありません」で答える。"},
   ]},
 'Kaiwa-Konbini.html': {
   'title': 'Kaiwa: Di Konbini コンビニ',
   'desc': 'Percakapan di convenience store (konbini) bahasa Jepang コンビニ: dihangatkan, kantong plastik, pembayaran, dan kirim paket. Latihan pilih respons + kosakata dwibahasa.',
   'vocab': [
     ["温めますか","atatamemasu ka","mau dihangatkan?"],
     ["袋に入れますか","fukuro ni iremasu ka","mau dimasukkan kantong?"],
     ["お箸","ohashi","sumpit"],
     ["レジ袋","reji bukuro","kantong plastik kasir"],
     ["ポイントカード","pointo kaado","kartu poin"],
     ["公共料金","koukyou ryoukin","tagihan (listrik/air dll)"],
     ["支払い","shiharai","pembayaran"],
     ["両替","ryougae","tukar uang/pecahan"],
     ["レシート","reshiito","struk"],
     ["宅配便","takuhaibin","paket kiriman"],
   ],
   'q': [
     {"q":"店員に「温めますか」と聞かれたときに希望を伝える答えはどれか。","opts":["はい、お願いします","はい、そうです","いいえ、痛いです","いいえ、忙しいです"],"a":0,"e":"「はい、お願いします」(ya, tolong)で温めを頼む自然な返事。"},
     {"q":"レジ袋が必要なときの言い方はどれか。","opts":["袋をお願いします","袋はいらないです","袋は高いです","袋はどこですか"],"a":0,"e":"「袋をお願いします」(tolong kantongnya)で必要と伝える。"},
     {"q":"お箸が欲しいときの言い方はどれか。","opts":["お箸をつけてください","お箸は結構です","お箸はいくらですか","お箸はだれのですか"],"a":0,"e":"「〜をつけてください」(tolong sertakan…)で追加を頼む。"},
     {"q":"ポイントカードを持っていないときの答えはどれか。","opts":["持っていません","持っています","わかりません","知りません"],"a":0,"e":"「持っていません」(tidak punya)で率直に答えれば十分。"},
     {"q":"公共料金を払いたいときの言い方はどれか。","opts":["これを払いたいです","これをください","これは何ですか","これはいくらですか"],"a":0,"e":"「払いたいです」(ingin membayar)で用件を伝える。"},
     {"q":"支払い方法をカードにしたいときの言い方はどれか。","opts":["カードでお願いします","カードはだめです","カードはどこですか","カードは高いです"],"a":0,"e":"「〜でお願いします」(dengan…)で支払い方法を指定する。"},
     {"q":"トイレを借りたいときの丁寧な言い方はどれか。","opts":["トイレを借りてもいいですか","トイレは高いですか","トイレはだれのですか","トイレは何ですか"],"a":0,"e":"「〜てもいいですか」(bolehkah…?)で許可を求める丁寧な聞き方。"},
     {"q":"宅配便を送りたいときに伝える言い方はどれか。","opts":["荷物を送りたいです","荷物を買いたいです","荷物はいくらですか","荷物はどこですか"],"a":0,"e":"「送りたいです」(ingin mengirim)で宅配便の依頼を伝える。"},
     {"q":"小銭が足りないときに両替を頼む言い方はどれか。","opts":["両替をお願いします","両替はだめです","両替は高いです","両替はどこですか"],"a":0,"e":"「両替をお願いします」(tolong tukar uang)で頼む。"},
     {"q":"レシートが不要なときの言い方はどれか。","opts":["レシートは結構です","レシートをください","レシートは高いです","レシートはどこですか"],"a":0,"e":"「結構です」(tidak usah)で丁寧に断る表現。"},
   ]},
 'Kaiwa-Shokuba.html': {
   'title': 'Kaiwa: Obrolan di Tempat Kerja 職場',
   'desc': 'Percakapan di tempat kerja bahasa Jepang 職場: sapaan kerja, izin istirahat, lapor ke atasan, dan pamit pulang. Latihan pilih respons + kosakata dwibahasa.',
   'vocab': [
     ["お疲れ様です","otsukaresama desu","terima kasih atas kerja kerasnya (sapaan kerja)"],
     ["よろしくお願いします","yoroshiku onegai shimasu","mohon bantuannya"],
     ["休憩","kyuukei","istirahat"],
     ["シフト","shifuto","shift kerja"],
     ["報告","houkoku","laporan"],
     ["確認","kakunin","konfirmasi"],
     ["残業","zangyou","lembur"],
     ["有給休暇","yuukyuu kyuuka","cuti berbayar"],
     ["引き継ぎ","hikitsugi","serah terima tugas"],
     ["お先に失礼します","osaki ni shitsurei shimasu","permisi duluan (pulang lebih dulu)"],
   ],
   'q': [
     {"q":"同僚に会ったときの一般的な挨拶はどれか。","opts":["お疲れ様です","いただきます","ごちそうさま","おやすみ"],"a":0,"e":"「お疲れ様です」(terima kasih atas kerja kerasnya)は職場の基本挨拶。"},
     {"q":"新しい仕事を頼まれたときの丁寧な返事はどれか。","opts":["はい、よろしくお願いします","はい、そうです","いいえ、だめです","知りません"],"a":0,"e":"「よろしくお願いします」(mohon bantuannya)は依頼を受けたときの丁寧な返事。"},
     {"q":"休憩を取りたいときの言い方はどれか。","opts":["休憩してもいいですか","休憩はだめです","休憩は高いです","休憩はどこですか"],"a":0,"e":"「〜てもいいですか」(bolehkah…?)で許可を求める丁寧な表現。"},
     {"q":"シフトを確認したいときの言い方はどれか。","opts":["シフトを確認してもいいですか","シフトはいくらですか","シフトはだれですか","シフトは何ですか"],"a":0,"e":"「確認してもいいですか」(boleh saya cek?)でシフトの確認を丁寧に頼む。"},
     {"q":"上司に報告するときの切り出しはどれか。","opts":["ご報告があります","さようなら","おやすみなさい","いただきます"],"a":0,"e":"「ご報告があります」(ada laporan)は報告を切り出す丁寧な言い方。"},
     {"q":"残業を頼まれて引き受けるときの言い方はどれか。","opts":["わかりました、やります","知りません","だめです","いいです"],"a":0,"e":"「わかりました」(mengerti)で指示を受け入れる基本の返事。"},
     {"q":"有給休暇を申請したいときの言い方はどれか。","opts":["有給休暇を取りたいです","有給休暇はいくらですか","有給休暇はだれのですか","有給休暇はどこですか"],"a":0,"e":"「〜たいです」(ingin…)で有給休暇の希望を伝える。"},
     {"q":"引き継ぎを受けるときに確認する言い方はどれか。","opts":["もう一度説明してもらえますか","説明はいりません","知っています","わかりません"],"a":0,"e":"「もう一度説明してもらえますか」(bisa dijelaskan sekali lagi?)で丁寧に確認する。"},
     {"q":"先に帰るときに同僚に言う言葉はどれか。","opts":["お先に失礼します","ただいま","いってきます","おかえりなさい"],"a":0,"e":"「お先に失礼します」(permisi pulang duluan)は退勤時の丁寧な挨拶。"},
     {"q":"ミスを謝るときの丁寧な言い方はどれか。","opts":["申し訳ございません","ありがとうございます","おめでとうございます","こんにちは"],"a":0,"e":"「申し訳ございません」(mohon maaf sebesar-besarnya)はミスを謝る最も丁寧な表現。"},
   ]},
 'Kaiwa-Yakusoku.html': {
   'title': 'Kaiwa: Membuat Janji Temu 約束',
   'desc': 'Percakapan membuat janji temu bahasa Jepang 約束: mengatur waktu, tempat, konfirmasi jadwal, dan membatalkan janji. Latihan pilih respons + kosakata dwibahasa.',
   'vocab': [
     ["何時に会いましょうか","nanji ni aimashou ka","jam berapa kita bertemu?"],
     ["都合","tsugou","kesesuaian jadwal/keadaan"],
     ["予定","yotei","rencana/jadwal"],
     ["空いている","aiteiru","kosong/luang (waktu)"],
     ["変更","henkou","perubahan"],
     ["キャンセル","kyanseru","batal"],
     ["場所","basho","tempat"],
     ["集合","shuugou","berkumpul"],
     ["遅れる","okureru","terlambat"],
     ["楽しみにしています","tanoshimi ni shiteimasu","menantikan dengan senang"],
   ],
   'q': [
     {"q":"会う時間を提案する言い方はどれか。","opts":["何時に会いましょうか","何時ですか","いつですか","どこですか"],"a":0,"e":"「〜ましょうか」(bagaimana kalau kita…?)で提案する丁寧な表現。"},
     {"q":"都合を尋ねる言い方はどれか。","opts":["ご都合はいかがですか","元気ですか","忙しいですか","暇ですか"],"a":0,"e":"「ご都合はいかがですか」(bagaimana jadwal Anda?)は丁寧な確認の仕方。"},
     {"q":"その日は空いていることを伝える言い方はどれか。","opts":["その日は空いています","その日は忙しいです","その日は休みです","その日はだめです"],"a":0,"e":"「空いています」(kosong/luang)で予定がないことを伝える。"},
     {"q":"予定を変更したいときの言い方はどれか。","opts":["予定を変更してもいいですか","予定はいくらですか","予定はだれですか","予定はどこですか"],"a":0,"e":"「〜てもいいですか」(bolehkah…?)で丁寧に変更を申し出る。"},
     {"q":"約束をキャンセルしたいときの丁寧な言い方はどれか。","opts":["すみません、キャンセルしてもいいですか","キャンセルします","だめです","知りません"],"a":0,"e":"「すみません」を添えて丁寧にキャンセルを申し出る。"},
     {"q":"待ち合わせ場所を確認する言い方はどれか。","opts":["場所はどこですか","時間はいつですか","名前は何ですか","値段はいくらですか"],"a":0,"e":"「場所はどこですか」(tempatnya di mana?)で待ち合わせ場所を確認する。"},
     {"q":"集合時間を伝える言い方はどれか。","opts":["10時に集合しましょう","10時は忙しいです","10時はだめです","10時はいくらですか"],"a":0,"e":"「〜に集合しましょう」(mari berkumpul jam…)で集合時間を提案する。"},
     {"q":"遅れそうなときに連絡する言い方はどれか。","opts":["少し遅れます、すみません","もう着きました","時間通りです","早いです"],"a":0,"e":"「遅れます」(akan terlambat)と一言連絡するのがマナー。"},
     {"q":"会う約束を楽しみにしていると伝える言い方はどれか。","opts":["楽しみにしています","忙しいです","疲れました","眠いです"],"a":0,"e":"「楽しみにしています」(menantikan dengan senang)は約束前の前向きな一言。"},
     {"q":"相手の予定に合わせると伝える言い方はどれか。","opts":["いつでも大丈夫です","いつもだめです","いつも忙しいです","いつも遅いです"],"a":0,"e":"「いつでも大丈夫です」(kapan saja tidak masalah)で柔軟に合わせる意思を伝える。"},
   ]},
}


def js_vocab(vocab):
    return '[' + ', '.join(
        '[' + ', '.join('"' + str(x).replace('"', '\\"') + '"' for x in v) + ']'
        for v in vocab) + ']'


def build_one(slug, spec, template):
    c = template
    full_title = f'{spec["title"]} | Nihonggo Pro Academy'
    c = re.sub(r'<title>.*?</title>', f'<title>{full_title}</title>', c, count=1)
    c = re.sub(r'(<meta name="description" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['desc'] + m.group(2), c, count=1)
    c = c.replace('Kaigo-Ujian-N2.html', slug)
    c = re.sub(r'(<meta property="og:title" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['title'] + ' — Nihonggo Pro Academy' + m.group(2), c, count=1)
    # Field-field ini luput diperbaiki di 3 batch Kaiwa sebelumnya (masih
    # membawa teks "Quiz Kaigo Level N2" dari template) -- diperbaiki di sini
    # supaya modul baru tidak mewarisi bug metadata sosial-share/JSON-LD yang sama.
    c = re.sub(r'(<meta property="og:description" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['desc'] + m.group(2), c, count=1)
    c = re.sub(r'(<meta name="twitter:title" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['title'] + m.group(2), c, count=1)
    c = re.sub(r'(<meta name="twitter:description" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['desc'] + m.group(2), c, count=1)
    c = re.sub(r'("name": ")[^"]*(", "description": ")[^"]*(")',
               lambda m: m.group(1) + full_title + m.group(2) + spec['desc'] + m.group(3), c, count=1)
    c = re.sub(r'<span class="bdg">[^<]*</span><h1>[^<]*</h1>',
               f'<span class="bdg">🔰 Pemula·会話</span><h1>{spec["title"]}</h1>', c, count=1)
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
