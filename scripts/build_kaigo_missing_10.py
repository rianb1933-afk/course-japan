#!/usr/bin/env python3
"""
10 modul Kaigo DEDICATED yang belum ada (dari audit brief 50-lesson).
Mengisi celah kurikulum nyata: teknik kursi roda, jalan, vital sign, obat,
CPR, kebakaran, gempa, kerahasiaan, budaya kerja, 接遇 (customer service).

Setiap modul: kosakata inti + bank soal latihan dwibahasa. Memakai template
& pola generator yang sudah terbukti (clone Kaigo-Ujian-N2, swap konten).

    python3 scripts/build_kaigo_missing_10.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'Materi', 'Kaigo-Ujian-N2.html')


def V(*rows):
    return list(rows)


MODULES = {
 'Kaigo-Kurumaisu.html': {
   'cat': 'praktik', 'order': 17, 'icon': '♿',
   'title': 'Teknik Kursi Roda 車椅子介助', 'ja': '車椅子介助',
   'desc': 'Modul teknik kursi roda 車椅子介助: bagian kursi roda, cara mendorong aman, naik-turun, rem, dan transfer. Latihan dwibahasa.',
   'tags': ['praktik', 'kursi-roda', 'kurumaisu', 'mobilitas'],
   'vocab': V(["車椅子","kurumaisu","kursi roda"],["ブレーキ","bureeki","rem"],["フットレスト","futto resuto","pijakan kaki"],
     ["アームレスト","aamu resuto","sandaran tangan"],["段差","dansa","perbedaan tinggi/undakan"],["坂道","sakamichi","jalan menurun/menanjak"],
     ["移乗","ijou","transfer/pindah"],["前輪","zenrin","roda depan"],["後輪","kourin","roda belakang"],["安全確認","anzen kakunin","cek keselamatan"]),
   'q': [
     {"q":"車椅子で段差を上るときの正しい方法はどれか。","opts":["前輪を上げてゆっくり上る","勢いよく突っ込む","後ろ向きで下る","確認せず進む"],"a":0,"e":"段差は前輪を上げ(angkat roda depan)ゆっくり. 声かけと安全確認を忘れない。"},
     {"q":"車椅子を止めるとき最初に行うことはどれか。","opts":["ブレーキをかける","手を離す","立ち上がらせる","放置する"],"a":0,"e":"停止時はまず両輪のブレーキ(rem)をかけ、動かないことを確認する。"},
     {"q":"移乗前に確認すべきことはどれか。","opts":["ブレーキとフットレスト","天気","時間","室温"],"a":0,"e":"移乗前にブレーキ・フットレスト(rem & pijakan)を確認し事故を防ぐ。"},
     {"q":"坂道を下るときの安全な方法はどれか。","opts":["後ろ向きでゆっくり下る","前向きで速く下る","手を離す","走る"],"a":0,"e":"急な下り坂は後ろ向き(mundur perlahan)で、利用者が前に傾かないようにする。"},
     {"q":"車椅子利用者への声かけとして適切なのはどれか。","opts":["「動きます」と伝えてから動かす","無言で動かす","急に動かす","強く押す"],"a":0,"e":"動作前に「動きます」と声かけ(beri tahu sebelum bergerak). 驚きと転落を防ぐ。"},
     {"q":"フットレストの正しい扱いはどれか。","opts":["移乗時は上げる/外す","常に下げたまま","踏みつける","無視する"],"a":0,"e":"移乗時はフットレストを上げるか外す(angkat/lepas). 足の巻き込みを防ぐ。"},
     {"q":"長時間車椅子に座る利用者への配慮はどれか。","opts":["定期的に姿勢を整え除圧する","放置する","動かさない","急がせる"],"a":0,"e":"長時間座位は褥瘡の原因. 姿勢を整え除圧(kurangi tekanan)し床ずれを防ぐ。"},
     {"q":"車椅子の点検で重要なのはどれか。","opts":["ブレーキとタイヤの状態","色","重さのみ","メーカー"],"a":0,"e":"使用前にブレーキ・タイヤ(rem & ban)を点検し安全を確保する。"},
   ]},
 'Kaigo-Hoko-Kaijo.html': {
   'cat': 'praktik', 'order': 18, 'icon': '🚶',
   'title': 'Bantuan Berjalan 歩行介助', 'ja': '歩行介助',
   'desc': 'Modul bantuan berjalan 歩行介助: posisi pendamping, alat bantu jalan, pencegahan jatuh, dan teknik untuk hemiplegia. Latihan dwibahasa.',
   'tags': ['praktik', 'jalan', 'hoko', 'jatuh'],
   'vocab': V(["歩行","hoko","berjalan"],["杖","tsue","tongkat"],["歩行器","hokoki","walker/alat bantu jalan"],
     ["手すり","tesuri","pegangan/handrail"],["患側","kansoku","sisi yang lemah"],["健側","kensoku","sisi yang sehat"],
     ["転倒","tento","jatuh"],["ふらつき","furatsuki","limbung"],["付き添い","tsukisoi","pendampingan"],["歩幅","hohaba","langkah kaki"]),
   'q': [
     {"q":"片麻痺のある人の歩行介助で介助者が立つ位置はどれか。","opts":["患側のやや後方","健側の前","真正面","遠く"],"a":0,"e":"患側(sisi lemah)のやや後方に立ち、転倒に備えて支える。"},
     {"q":"杖歩行で杖を持つ手はどちらか。","opts":["健側の手","患側の手","両手","持たない"],"a":0,"e":"杖は健側(sisi sehat)の手で持つ. 患側を杖と介助者で支える。"},
     {"q":"歩行介助中にふらついたときの対応はどれか。","opts":["体を支え安全な場所で休ませる","手を離す","急がせる","無視する"],"a":0,"e":"ふらつき時は体を支え(topang tubuh)、無理せず休息. 転倒を防ぐ。"},
     {"q":"歩行器使用時の注意点はどれか。","opts":["高さを合わせ滑り止めを確認","高さ無視","急いで使う","片手で持つ"],"a":0,"e":"歩行器は身長に合わせ、脚のゴム(anti-slip)を点検してから使う。"},
     {"q":"転倒予防の環境整備として適切なのはどれか。","opts":["床の障害物を除き手すりを設置","床に物を置く","照明を暗く","滑る床にする"],"a":0,"e":"障害物除去・手すり・明るい照明(bebas hambatan)で転倒予防。"},
     {"q":"階段の昇降介助で正しいのはどれか。","opts":["上りは健側から、下りは患側から","いつも患側から","走る","手を離す"],"a":0,"e":"上りは健側(sehat)から、下りは患側から一段ずつ. 安全第一。"},
     {"q":"歩行前に確認すべきことはどれか。","opts":["体調・履物・足元","髪型","時間","天気"],"a":0,"e":"歩行前に体調・滑らない履物・足元(kondisi & alas kaki)を確認する。"},
     {"q":"歩行介助での声かけとして適切なのはどれか。","opts":["「ゆっくり行きましょう」と安心させる","急がせる","無言","叱る"],"a":0,"e":"「ゆっくり」と声かけ(tenangkan)し、本人のペースに合わせる。"},
   ]},
 'Kaigo-Vital-Sign.html': {
   'cat': 'kesehatan', 'order': 22, 'icon': '🌡️',
   'title': 'Tanda Vital バイタルサイン', 'ja': 'バイタルサイン',
   'desc': 'Modul tanda vital バイタルサイン: suhu, nadi, tekanan darah, pernapasan, SpO2, nilai normal, dan kapan melapor. Latihan dwibahasa.',
   'tags': ['kesehatan', 'vital', 'baital', 'observasi'],
   'vocab': V(["バイタルサイン","baitaru sain","tanda vital"],["体温","taion","suhu tubuh"],["脈拍","myakuhaku","denyut nadi"],
     ["血圧","ketsuatsu","tekanan darah"],["呼吸","kokyu","pernapasan"],["体温計","taionkei","termometer"],
     ["発熱","hatsunetsu","demam"],["高血圧","koketsuatsu","hipertensi"],["酸素飽和度","sanso howado","saturasi oksigen"],["異常","ijo","kelainan/abnormal"]),
   'q': [
     {"q":"成人の平熱の範囲として適切なのはどれか。","opts":["36〜37℃台","34℃台","39℃台","40℃以上"],"a":0,"e":"平熱はおよそ36〜37℃台(suhu normal). 38℃以上は発熱として報告。"},
     {"q":"SpO2(酸素飽和度)の一般的な目安はどれか。","opts":["95%以上","70%","50%","30%"],"a":0,"e":"SpO2は95%以上(saturasi)が目安. 低下時は呼吸状態を観察し報告。"},
     {"q":"血圧測定で注意すべきことはどれか。","opts":["安静にして正しい体位で測る","運動直後に測る","会話しながら測る","急いで測る"],"a":0,"e":"血圧は安静・正しい体位(istirahat & posisi)で測定. 直前の運動は避ける。"},
     {"q":"脈拍を測る部位として一般的なのはどれか。","opts":["手首(橈骨動脈)","額","足の裏","背中"],"a":0,"e":"脈拍は手首の橈骨動脈(pergelangan tangan)で測ることが多い。"},
     {"q":"発熱が見られたときの対応はどれか。","opts":["記録し看護師へ報告する","放置する","冷水を飲ませる","運動させる"],"a":0,"e":"発熱時は記録し医療職へ報告(catat & lapor). 自己判断で処置しない。"},
     {"q":"バイタル測定の目的として正しいのはどれか。","opts":["体調変化を早期に把握する","時間つぶし","記録を増やす","運動のため"],"a":0,"e":"バイタルは体調変化の早期発見(deteksi dini)のため. 異常は速やかに報告。"},
     {"q":"高齢者の呼吸数の観察で正しいのはどれか。","opts":["安静時に1分間数える","走らせて数える","数えない","適当に書く"],"a":0,"e":"呼吸数は安静時に1分間(1 menit)測定. リズムや深さも観察する。"},
     {"q":"バイタルサインに含まれないのはどれか。","opts":["体重","体温","脈拍","血圧"],"a":0,"e":"基本のバイタル=体温・脈拍・血圧・呼吸(+SpO2). 体重は含まない。"},
   ]},
 'Kaigo-Fukuyaku.html': {
   'cat': 'kesehatan', 'order': 23, 'icon': '💊',
   'title': 'Dukungan Obat 服薬支援', 'ja': '服薬支援',
   'desc': 'Modul dukungan obat 服薬支援: aturan pemberian obat, batas kewenangan介護職, cek 5 benar, efek samping, dan pelaporan. Latihan dwibahasa.',
   'tags': ['kesehatan', 'obat', 'fukuyaku', 'medikasi'],
   'vocab': V(["服薬","fukuyaku","minum obat"],["薬","kusuri","obat"],["処方","shoho","resep"],
     ["副作用","fukusayo","efek samping"],["飲み忘れ","nomiwasure","lupa minum obat"],["内服","naifuku","obat oral"],
     ["軟膏","nanko","salep"],["点眼","tengan","obat tetes mata"],["確認","kakunin","konfirmasi/cek"],["与薬","yoyaku","pemberian obat"]),
   'q': [
     {"q":"介護職が服薬でできる支援はどれか。","opts":["医師の指示範囲で服薬を見守り・介助する","薬を処方する","量を変える","注射する"],"a":0,"e":"介護職は指示範囲で服薬介助・見守り(bantu & awasi). 処方・調整・注射は不可。"},
     {"q":"服薬介助で確認すべき「5R」に含まれるのはどれか。","opts":["正しい人・薬・量・時間・方法","色","値段","形"],"a":0,"e":"5R=正しい利用者・薬・量・時間・用法(5 benar). 誤薬を防ぐ基本。"},
     {"q":"薬を飲み忘れたときの対応はどれか。","opts":["自己判断せず看護師・医師に相談","2回分飲ませる","無視する","翌日まとめる"],"a":0,"e":"飲み忘れは自己判断せず医療職に相談(konsultasi). 勝手に倍量は危険。"},
     {"q":"副作用が疑われるときの対応はどれか。","opts":["観察し記録して速やかに報告","放置","薬を増やす","隠す"],"a":0,"e":"副作用(efek samping)の疑いは観察・記録・報告. 早期対応が重要。"},
     {"q":"服薬時の姿勢として適切なのはどれか。","opts":["座位で上体を起こす","寝たまま","急いで","歩きながら"],"a":0,"e":"服薬は座位・上体挙上(duduk tegak)で誤嚥を防ぐ. 水で飲む。"},
     {"q":"薬の保管で正しいのはどれか。","opts":["指示通りに保管し他人の薬と混ぜない","日光に当てる","混ぜる","放置"],"a":0,"e":"薬は指示通り保管し個人ごとに管理(jangan campur). 誤薬を防ぐ。"},
     {"q":"服薬介助の記録として適切なのはどれか。","opts":["服薬の有無・時間・様子を記録","記録しない","記憶に頼る","曖昧に書く"],"a":0,"e":"服薬の有無・時刻・利用者の様子(catat akurat)を正確に記録する。"},
     {"q":"内服薬を飲ませるとき誤嚥を防ぐ工夫はどれか。","opts":["一錠ずつ、十分な水で、姿勢を整える","一度に多く","水なし","急がせる"],"a":0,"e":"一錠ずつ十分な水・正しい姿勢(pelan, air cukup)で誤嚥を防ぐ。"},
   ]},
 'Kaigo-CPR.html': {
   'cat': 'kesehatan', 'order': 24, 'icon': '🫀',
   'title': 'Dasar CPR 心肺蘇生', 'ja': '心肺蘇生法',
   'desc': 'Modul dasar CPR 心肺蘇生法: cek kesadaran, panggil bantuan, kompresi dada, AED, dan alur救命. Untuk situasi darurat kaigo. Latihan dwibahasa.',
   'tags': ['kesehatan', 'cpr', 'darurat', 'kyumei'],
   'vocab': V(["心肺蘇生","shinpai sosei","CPR/resusitasi"],["意識","ishiki","kesadaran"],["胸骨圧迫","kyokotsu appaku","kompresi dada"],
     ["AED","ee ii dii","AED (defibrilator)"],["呼吸確認","kokyu kakunin","cek pernapasan"],["救急車","kyukyusha","ambulans"],
     ["応援","oen","bantuan"],["反応","hanno","respons"],["気道確保","kido kakuho","buka jalan napas"],["救命","kyumei","penyelamatan nyawa"]),
   'q': [
     {"q":"倒れている人を発見したとき最初に行うことはどれか。","opts":["周囲の安全と意識の確認","すぐ胸を押す","水をかける","放置"],"a":0,"e":"まず安全確認と意識(反応)の確認(aman & kesadaran). 反応なければ応援要請。"},
     {"q":"反応がないときに行うことはどれか。","opts":["大声で応援を呼び救急車とAEDを依頼","一人で運ぶ","待つ","帰る"],"a":0,"e":"応援を呼び119番・AED手配(panggil bantuan). 一人で抱えない。"},
     {"q":"胸骨圧迫の位置はどこか。","opts":["胸の真ん中(胸骨下半分)","腹部","首","足"],"a":0,"e":"胸骨圧迫は胸の中央(tengah dada). 強く速く絶え間なく行う。"},
     {"q":"胸骨圧迫のテンポの目安はどれか。","opts":["1分間に100〜120回","1分間に20回","1分間に300回","ゆっくり"],"a":0,"e":"圧迫は100〜120回/分(100-120 per menit)、深さ約5cm。"},
     {"q":"AEDの使い方として正しいのはどれか。","opts":["音声ガイドに従いパッドを貼る","自己判断で放電","水浸しで使う","無視する"],"a":0,"e":"AEDは音声ガイド(ikuti panduan suara)に従う. 濡れた胸は拭いてから。"},
     {"q":"介護職がCPRで果たす役割はどれか。","opts":["救命処置を行い医療へつなぐ","診断する","薬を出す","様子を見るだけ"],"a":0,"e":"介護職も一次救命処置(BLS)を行い医療へつなぐ(hubungkan ke medis). 日頃の訓練が大切。"},
     {"q":"胸骨圧迫を中断してよいのはどれか。","opts":["AED解析時や交代時など必要最小限","いつでも自由に","疲れたらすぐ","気が向いたら"],"a":0,"e":"圧迫の中断は最小限(minimal). AED解析・交代時のみ短く止める。"},
     {"q":"救急隊到着まで介護職がすべきことはどれか。","opts":["絶え間なく圧迫を続け情報を伝える","やめる","放置","隠す"],"a":0,"e":"到着まで圧迫継続・状況を伝える(lanjut & laporkan). 途切れさせない。"},
   ]},
 'Kaigo-Kasai-Hinan.html': {
   'cat': 'praktik', 'order': 19, 'icon': '🔥',
   'title': 'Evakuasi Kebakaran 火災避難', 'ja': '火災・避難',
   'desc': 'Modul evakuasi kebakaran 火災避難: alur saat kebakaran, prioritas evakuasi lansia, alat pemadam, dan pencegahan. Latihan dwibahasa.',
   'tags': ['praktik', 'kebakaran', 'kasai', 'keselamatan', 'evakuasi'],
   'vocab': V(["火災","kasai","kebakaran"],["避難","hinan","evakuasi"],["消火器","shokaki","alat pemadam api"],
     ["非常口","hijoguchi","pintu darurat"],["煙","kemuri","asap"],["通報","tsuho","lapor darurat"],
     ["初期消火","shoki shoka","pemadaman awal"],["誘導","yudo","memandu evakuasi"],["安否確認","anpi kakunin","cek keselamatan"],["防火","boka","pencegahan kebakaran"]),
   'q': [
     {"q":"火災を発見したとき最初に行うことはどれか。","opts":["大声で知らせ通報する","一人で消す","隠す","逃げるだけ"],"a":0,"e":"発見時はまず周囲に知らせ通報(beritahu & lapor)。「火事だ!」と大声で。"},
     {"q":"煙の中を避難するときの姿勢はどれか。","opts":["姿勢を低くし口を覆う","立って走る","煙を吸う","立ち止まる"],"a":0,"e":"煙は上に溜まる. 姿勢を低く(rendahkan tubuh)し口鼻を覆い避難。"},
     {"q":"歩けない利用者の避難で優先されるのはどれか。","opts":["安全確保しつつ職員で誘導・搬送","放置","自力で這わせる","後回し"],"a":0,"e":"自力困難な人を優先し職員で搬送・誘導(bantu evakuasi). 命を守る。"},
     {"q":"初期消火が可能なのはどれか。","opts":["火が小さく天井に達していないとき","天井まで燃えたとき","煙充満時","不可能なとき"],"a":0,"e":"初期消火は火が小さいうち(api masih kecil)のみ. 危険なら避難優先。"},
     {"q":"消火器の使い方の順序はどれか。","opts":["ピンを抜く→ホースを向ける→レバーを握る","レバーだけ","投げる","振る"],"a":0,"e":"消火器=ピンを抜き・向け・握る(cabut, arahkan, tekan). 火元の根元へ。"},
     {"q":"避難後に行うことはどれか。","opts":["安否確認(人数確認)","戻る","解散","放置"],"a":0,"e":"避難後は安否・人数確認(cek jumlah & keselamatan). 誰も残っていないか確認。"},
     {"q":"日頃の防火対策として適切なのはどれか。","opts":["避難経路の確認と訓練","放置","経路を塞ぐ","訓練しない"],"a":0,"e":"日頃から避難経路確認・訓練(latihan rutin)で被害を減らす。"},
     {"q":"非常口付近で避けるべきことはどれか。","opts":["物を置いて塞ぐこと","開けておく","表示する","点検する"],"a":0,"e":"非常口は塞がない(jangan halangi). 常に通れるようにしておく。"},
   ]},
 'Kaigo-Jishin-Saigai.html': {
   'cat': 'praktik', 'order': 20, 'icon': '🌊',
   'title': 'Respons Gempa & Bencana 地震・災害対応', 'ja': '地震・災害対応',
   'desc': 'Modul respons gempa & bencana 地震・災害対応: tindakan saat gempa, evakuasi lansia, persiapan darurat, dan BCP. Latihan dwibahasa.',
   'tags': ['praktik', 'gempa', 'jishin', 'bencana', 'saigai'],
   'vocab': V(["地震","jishin","gempa"],["災害","saigai","bencana"],["避難所","hinanjo","tempat pengungsian"],
     ["備蓄","bichiku","persediaan darurat"],["安全確保","anzen kakuho","memastikan keselamatan"],["余震","yoshin","gempa susulan"],
     ["津波","tsunami","tsunami"],["停電","teiden","mati listrik"],["非常持出袋","hijo mochidashi bukuro","tas siaga darurat"],["連携","renkei","koordinasi"]),
   'q': [
     {"q":"地震が起きた瞬間にまず行うことはどれか。","opts":["身の安全を確保し頭を守る","外へ走る","立ち上がる","放置"],"a":0,"e":"まず身の安全・頭を守る(lindungi kepala). 落下物から利用者も守る。"},
     {"q":"揺れが収まった後に行うことはどれか。","opts":["火の元確認と利用者の安否確認","すぐ外出","放置","解散"],"a":0,"e":"揺れ後は火元・安否確認(cek api & keselamatan). 二次災害を防ぐ。"},
     {"q":"車椅子や寝たきりの利用者の避難で大切なのはどれか。","opts":["複数職員で安全に搬送","一人で急ぐ","放置","後回し"],"a":0,"e":"自力困難な人は複数職員で搬送(bantu bersama). 無理な単独搬送は危険。"},
     {"q":"災害に備えて施設が準備すべきものはどれか。","opts":["水・食料・薬の備蓄と避難計画","何もしない","経路を塞ぐ","訓練しない"],"a":0,"e":"備蓄(persediaan)と避難計画(BCP)を整え、定期訓練を行う。"},
     {"q":"停電時の対応として適切なのはどれか。","opts":["非常電源・懐中電灯を使い安全確保","放置","慌てる","医療機器を止める"],"a":0,"e":"停電時は非常電源・照明(listrik darurat)を確保. 医療機器の代替も準備。"},
     {"q":"余震に対する注意として正しいのはどれか。","opts":["再度の揺れに備え安全な場所を保つ","安心して戻る","無視","急ぐ"],"a":0,"e":"余震(gempa susulan)に備え、安全確認を続ける. 油断しない。"},
     {"q":"津波警報が出た沿岸施設での行動はどれか。","opts":["直ちに高い場所へ避難","様子を見る","海へ行く","放置"],"a":0,"e":"津波警報時は直ちに高所へ避難(ke tempat tinggi). 時間との勝負。"},
     {"q":"災害時の多職種・地域連携で大切なのはどれか。","opts":["情報共有と役割分担","一人で抱える","連絡しない","隠す"],"a":0,"e":"災害時は情報共有・連携(koordinasi)で利用者を守る. 事前の取り決めが有効。"},
   ]},
 'Kaigo-Shuhi-Gimu.html': {
   'cat': 'hukum', 'order': 11, 'icon': '🔐',
   'title': 'Kerahasiaan 守秘義務', 'ja': '守秘義務',
   'desc': 'Modul kerahasiaan 守秘義務: kewajiban menjaga rahasia, perlindungan data pribadi, media sosial, dan etika informasi. Latihan dwibahasa.',
   'tags': ['hukum', 'kerahasiaan', 'shuhi', 'privasi', 'etika'],
   'vocab': V(["守秘義務","shuhi gimu","kewajiban rahasia"],["個人情報","kojin joho","informasi pribadi"],["プライバシー","puraibashii","privasi"],
     ["秘密","himitsu","rahasia"],["漏洩","roei","kebocoran"],["同意","doi","persetujuan"],
     ["記録管理","kiroku kanri","pengelolaan rekod"],["信頼","shinrai","kepercayaan"],["情報共有","joho kyoyu","berbagi informasi"],["違反","ihan","pelanggaran"]),
   'q': [
     {"q":"守秘義務の意味として正しいのはどれか。","opts":["業務上知った秘密を漏らさない","自由に話す","SNSに載せる","家族に話す"],"a":0,"e":"守秘義務=業務上知った個人情報・秘密を漏らさない(jaga rahasia). 退職後も継続。"},
     {"q":"利用者の情報をSNSに投稿することは。","opts":["禁止されている","自由","推奨される","問題ない"],"a":0,"e":"SNS投稿は守秘義務違反(pelanggaran). 顔・名前・状況の公開は厳禁。"},
     {"q":"個人情報を扱うときの原則はどれか。","opts":["必要な範囲でのみ扱い適切に管理","誰にでも共有","放置","自由にコピー"],"a":0,"e":"個人情報は目的の範囲で最小限(seperlunya)扱い、施錠管理する。"},
     {"q":"情報共有が許されるのはどのような場合か。","opts":["ケアに必要で関係者間の適切な共有","雑談","SNS","第三者へ自由に"],"a":0,"e":"ケアに必要な範囲で関係者間のみ(hanya yg berkepentingan)共有は可。"},
     {"q":"記録の取り扱いとして適切なのはどれか。","opts":["施錠管理し関係者のみ閲覧","誰でも見られる場所","持ち帰る","放置"],"a":0,"e":"記録は施錠管理・閲覧制限(kelola aman). 紛失・漏洩を防ぐ。"},
     {"q":"守秘義務違反が起こす影響はどれか。","opts":["利用者の信頼喪失と法的責任","何も起きない","評価が上がる","問題ない"],"a":0,"e":"違反は信頼喪失・法的責任(kehilangan kepercayaan & hukum). 重大な結果を招く。"},
     {"q":"家族から利用者の情報を聞かれたときの対応はどれか。","opts":["本人同意や規定を確認して対応","自由に話す","全て教える","無視"],"a":0,"e":"家族でも本人同意・施設規定(persetujuan)を確認してから対応する。"},
     {"q":"退職後の守秘義務はどうなるか。","opts":["退職後も継続する","退職で消える","1年で消える","関係ない"],"a":0,"e":"守秘義務は退職後も継続(tetap berlaku). 知り得た情報は生涯守る。"},
   ]},
 'Kaigo-Shokuba-Bunka.html': {
   'cat': 'bahasa', 'order': 16, 'icon': '🏢',
   'title': 'Budaya Kerja Jepang 職場文化', 'ja': '職場文化',
   'desc': 'Modul budaya kerja Jepang 職場文化: 報連相, ketepatan waktu, kerja tim, hierarki, dan adaptasi pekerja asing. Latihan dwibahasa.',
   'tags': ['bahasa', 'budaya', 'shokuba', 'kerja', 'houkoku'],
   'vocab': V(["職場","shokuba","tempat kerja"],["報連相","horenso","lapor-hubung-konsultasi"],["時間厳守","jikan genshu","tepat waktu"],
     ["協調性","kyochosei","kerja sama"],["上司","joshi","atasan"],["同僚","doryo","rekan kerja"],
     ["挨拶","aisatsu","salam"],["残業","zangyo","lembur"],["有給休暇","yukyu kyuka","cuti berbayar"],["改善","kaizen","perbaikan berkelanjutan"]),
   'q': [
     {"q":"「報連相(ほうれんそう)」の意味はどれか。","opts":["報告・連絡・相談","掃除","休憩","残業"],"a":0,"e":"報連相=報告・連絡・相談(lapor-hubung-konsultasi). 日本の職場の基本。"},
     {"q":"日本の職場で重視される時間の考え方はどれか。","opts":["時間厳守(遅刻しない)","遅れてよい","自由","気にしない"],"a":0,"e":"時間厳守(tepat waktu)が重視される. 5分前行動が好まれる。"},
     {"q":"仕事を休むときの適切な対応はどれか。","opts":["事前に上司へ連絡する","無断で休む","当日放置","同僚任せ"],"a":0,"e":"休む時は事前連絡(hubungi lebih dulu). 無断欠勤は信頼を失う。"},
     {"q":"職場での挨拶の役割はどれか。","opts":["良い人間関係の基礎","不要","形だけ","面倒"],"a":0,"e":"挨拶(salam)は人間関係の基礎. 「おはようございます」等を明るく。"},
     {"q":"分からない仕事があるときの対応はどれか。","opts":["自己判断せず相談・確認する","勝手に進める","放置","隠す"],"a":0,"e":"不明点は相談・確認(tanya & konfirmasi). 自己判断のミスを防ぐ。"},
     {"q":"チームで働くために大切な姿勢はどれか。","opts":["協調性と助け合い","自分勝手","競争のみ","無関心"],"a":0,"e":"協調性・助け合い(kerja sama)がチームケアの質を高める。"},
     {"q":"ミスをしたときの適切な対応はどれか。","opts":["速やかに報告し対策を相談","隠す","放置","言い訳"],"a":0,"e":"ミスは速やかに報告(lapor segera)し再発防止を相談. 隠さない。"},
     {"q":"外国人職員が職場に馴染むために有効なのはどれか。","opts":["積極的に挨拶し分からない事を質問する","黙って耐える","孤立する","諦める"],"a":0,"e":"挨拶と質問(salam & bertanya)で信頼を築く. 分からない事は早めに確認。"},
   ]},
 'Kaigo-Setsugu.html': {
   'cat': 'bahasa', 'order': 17, 'icon': '🙇',
   'title': 'Pelayanan (接遇) 接遇マナー', 'ja': '接遇マナー',
   'desc': 'Modul pelayanan 接遇マナー: sikap ramah, keigo dasar, senyum, dan menghormati利用者 sebagai pelanggan. Latihan dwibahasa.',
   'tags': ['bahasa', 'setsugu', 'pelayanan', 'keigo', 'manner'],
   'vocab': V(["接遇","setsugu","pelayanan/hospitality"],["笑顔","egao","senyum"],["言葉遣い","kotobazukai","cara berbicara"],
     ["敬語","keigo","bahasa hormat"],["身だしなみ","midashinami","kerapian penampilan"],["態度","taido","sikap"],
     ["おもてなし","omotenashi","keramahan Jepang"],["尊重","sonchо","menghormati"],["対応","taio","penanganan/respons"],["信頼関係","shinrai kankei","hubungan saling percaya"]),
   'q': [
     {"q":"接遇の基本として最も大切なのはどれか。","opts":["笑顔と丁寧な言葉遣い","無表情","命令口調","無視"],"a":0,"e":"接遇=笑顔・丁寧な言葉(senyum & sopan)で相手を尊重する姿勢。"},
     {"q":"利用者への言葉遣いとして適切なのはどれか。","opts":["敬語で丁寧に話す","タメ口","赤ちゃん言葉","命令"],"a":0,"e":"利用者には敬語(bahasa hormat)で. 一人の大人として尊重する。"},
     {"q":"身だしなみで介護職に求められるのはどれか。","opts":["清潔感と機能性","派手さ","華美な装飾","無頓着"],"a":0,"e":"身だしなみは清潔感・機能性(rapi & praktis). 衛生と安全に配慮。"},
     {"q":"利用者を待たせるときの適切な対応はどれか。","opts":["「お待たせします」と一声かける","黙って待たせる","無視","放置"],"a":0,"e":"待たせる時は一声かけ(beri tahu)、不安を与えない. 接遇の心配り。"},
     {"q":"接遇の「おもてなし」の心として正しいのはどれか。","opts":["相手の立場で考え心を込める","形だけ","効率のみ","無関心"],"a":0,"e":"おもてなし=相手の立場で心を込める(sepenuh hati). 表面的でない配慮。"},
     {"q":"クレーム(苦情)を受けたときの初期対応はどれか。","opts":["まず傾聴し誠実に受け止める","言い返す","無視","責任転嫁"],"a":0,"e":"苦情はまず傾聴・共感(dengarkan dulu). 誠実な対応が信頼につながる。"},
     {"q":"接遇で「第一印象」を左右するのはどれか。","opts":["表情・挨拶・身だしなみ","値段","場所","時間"],"a":0,"e":"第一印象は表情・挨拶・身だしなみ(kesan pertama)で決まる。"},
     {"q":"接遇マナーが介護で重要な理由はどれか。","opts":["利用者の尊厳と信頼関係を守るため","評価のため","形式のため","不要"],"a":0,"e":"接遇は利用者の尊厳・信頼(martabat & kepercayaan)を守る土台となる。"},
   ]},
}


def js_vocab(vocab):
    return '[' + ', '.join(
        '[' + ', '.join('"' + str(x).replace('"', '\\"') + '"' for x in v) + ']'
        for v in vocab) + ']'


def build_one(slug, spec, template):
    title = spec['title']
    c = template
    c = re.sub(r'<title>.*?</title>', f'<title>{title} | Nihonggo Pro Academy</title>', c, count=1)
    c = re.sub(r'(<meta name="description" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['desc'] + m.group(2), c, count=1)
    c = c.replace('Kaigo-Ujian-N2.html', slug)
    c = re.sub(r'(<meta property="og:title" content=")[^"]*(">)',
               lambda m: m.group(1) + title + ' — Nihonggo Pro Academy' + m.group(2), c, count=1)
    c = re.sub(r'PH_VOCAB=\[.*?\];', 'PH_VOCAB=' + js_vocab(spec['vocab']) + ';', c, count=1, flags=re.DOTALL)
    c = re.sub(r'var Q=\[.*?\];', 'var Q=' + json.dumps(spec['q'], ensure_ascii=False) + ';', c, count=1, flags=re.DOTALL)
    return c


def main():
    template = open(TEMPLATE, encoding='utf-8').read()
    for slug, spec in MODULES.items():
        out = os.path.join(ROOT, 'Materi', slug)
        open(out, 'w', encoding='utf-8').write(build_one(slug, spec, template))
        print(f"OK {slug}: {len(spec['q'])} soal, {len(spec['vocab'])} kosakata [{spec['cat']}]")


if __name__ == '__main__':
    main()
