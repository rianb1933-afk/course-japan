#!/usr/bin/env python3
"""3 modul Kaiwa lanjutan (situasi umum intermediate)."""
import json, os, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE=os.path.join(ROOT,'Materi','Kaigo-Ujian-N2.html')
MODULES={
 'Kaiwa-Michi-Annai.html':{
  'title':'Kaiwa: Bertanya Arah 道案内',
  'desc':'Percakapan bertanya & menunjukkan arah bahasa Jepang 道案内: menanyakan lokasi, arah belok, patokan, dan jarak. Latihan pilih respons + kosakata dwibahasa.',
  'vocab':[["すみません","sumimasen","permisi/maaf"],["どこ","doko","di mana"],["まっすぐ","massugu","lurus"],["右","migi","kanan"],["左","hidari","kiri"],["曲がる","magaru","belok"],["近く","chikaku","dekat"],["遠い","tooi","jauh"],["信号","shingou","lampu lalu lintas"],["駅","eki","stasiun"]],
  'q':[
   {"q":"知らない場所を尋ねるときの切り出しはどれか。","opts":["すみません、駅はどこですか","こんばんは","いただきます","おやすみ"],"a":0,"e":"「すみません、〜はどこですか」(permisi, di mana…?)で丁寧に尋ねる。"},
   {"q":"「まっすぐ行ってください」の意味はどれか。","opts":["lurus terus","belok kanan","berhenti","kembali"],"a":0,"e":"まっすぐ=lurus. 「行ってください」で「pergilah/jalan terus」。"},
   {"q":"「次の信号を右に曲がってください」の「右」はどれか。","opts":["kanan","kiri","depan","belakang"],"a":0,"e":"右=kanan、左=kiri. 信号(lampu lalu lintas)で曲がる指示。"},
   {"q":"距離を尋ねる言い方はどれか。","opts":["ここから遠いですか","何時ですか","いくらですか","だれですか"],"a":0,"e":"「遠いですか」(jauh?)で距離を尋ねる. 近い=chikai。"},
   {"q":"道を教えてもらったお礼はどれか。","opts":["ありがとうございます","さようなら","いただきます","はじめまして"],"a":0,"e":"教えてもらったら「ありがとうございます」(terima kasih)とお礼を。"},
   {"q":"「駅の近くです」の「近く」の意味はどれか。","opts":["dekat","jauh","dalam","atas"],"a":0,"e":"近く=dekat. 「駅の近く」=dekat stasiun。"},
   {"q":"分からないとき丁寧に聞き返す言い方はどれか。","opts":["もう一度お願いします","だめです","知りません","いいです"],"a":0,"e":"「もう一度お願いします」(tolong ulangi)で丁寧に確認する。"},
   {"q":"「歩いて10分ぐらいです」の意味はどれか。","opts":["sekitar 10 menit jalan kaki","10 jam","10 km naik mobil","tidak tahu"],"a":0,"e":"歩いて(jalan kaki)〜分ぐらい(sekitar…menit)で所要時間を伝える。"},
   {"q":"目印(patokan)を尋ねる言い方はどれか。","opts":["近くに何がありますか","いくらですか","何時ですか","だれですか"],"a":0,"e":"「近くに何がありますか」(ada apa di dekatnya?)で目印を尋ねる。"},
   {"q":"道案内で「渡ってください」が使われる場所はどれか。","opts":["横断歩道・橋","部屋の中","椅子","机"],"a":0,"e":"渡る(menyeberang)=横断歩道・橋など. 「渡ってください」で指示。"},
  ]},
 'Kaiwa-Denwa.html':{
  'title':'Kaiwa: Percakapan Telepon 電話',
  'desc':'Percakapan telepon bahasa Jepang 電話: menjawab, menyebut identitas, menyampaikan pesan, dan menutup telepon dengan sopan. Latihan pilih respons + kosakata dwibahasa.',
  'vocab':[["もしもし","moshimoshi","halo (telepon)"],["電話","denwa","telepon"],["少々お待ちください","shosho omachi kudasai","mohon tunggu sebentar"],["伝言","dengon","pesan"],["また後で","mata ato de","nanti lagi"],["失礼します","shitsurei shimasu","permisi (menutup)"],["お名前","onamae","nama (hormat)"],["おります","orimasu","ada (rendah hati)"],["かけ直す","kakenaosu","menelepon ulang"],["番号","bangou","nomor"]],
  'q':[
   {"q":"電話に出るときの第一声はどれか。","opts":["もしもし","いただきます","ただいま","おやすみ"],"a":0,"e":"電話は「もしもし」(halo)で出る. ビジネスでは社名・名前も名乗る。"},
   {"q":"相手を待たせるときの丁寧な言い方はどれか。","opts":["少々お待ちください","早くして","だめです","知りません"],"a":0,"e":"「少々お待ちください」(mohon tunggu)で丁寧に保留を伝える。"},
   {"q":"名前を尋ねる丁寧な言い方はどれか。","opts":["お名前をお願いします","名前","だれ","何"],"a":0,"e":"「お名前をお願いします」(boleh tahu nama?)で丁寧に尋ねる。"},
   {"q":"伝言を頼むときの言い方はどれか。","opts":["伝言をお願いできますか","伝言","伝えろ","知らない"],"a":0,"e":"「伝言をお願いできますか」(bisa titip pesan?)で依頼する。"},
   {"q":"相手が不在のとき言う言葉はどれか。","opts":["ただ今おりません","います","来ます","知りません"],"a":0,"e":"「ただ今おりません」(sedang tidak ada)と丁寧(謙譲語)に伝える。"},
   {"q":"電話を切るときの丁寧な言葉はどれか。","opts":["失礼します","さようなら","おやすみ","こんにちは"],"a":0,"e":"電話を切るときは「失礼します」(permisi)で締める。"},
   {"q":"かけ直すことを伝える言い方はどれか。","opts":["また後でかけ直します","もう電話しない","知らない","だめ"],"a":0,"e":"「かけ直します」(saya telepon lagi)で再度連絡を伝える。"},
   {"q":"聞き取れないとき丁寧に確認する言い方はどれか。","opts":["もう一度お願いします","うるさい","早く","だめ"],"a":0,"e":"「もう一度お願いします」(tolong ulangi)で丁寧に聞き返す。"},
   {"q":"電話番号を確認する言い方はどれか。","opts":["お電話番号をお願いします","番号","電話","だれ"],"a":0,"e":"「お電話番号をお願いします」(boleh minta nomornya?)で確認する。"},
   {"q":"間違い電話のときの対応はどれか。","opts":["失礼しました、番号をお確かめください","怒る","切るだけ","無視"],"a":0,"e":"間違い電話は「失礼しました」(maaf)と丁寧に対応する。"},
  ]},
 'Kaiwa-Eki.html':{
  'title':'Kaiwa: Di Stasiun 駅',
  'desc':'Percakapan di stasiun bahasa Jepang 駅: membeli tiket, menanyakan peron, jadwal kereta, dan transit. Latihan pilih respons + kosakata dwibahasa.',
  'vocab':[["切符","kippu","tiket"],["電車","densha","kereta"],["ホーム","hoomu","peron"],["次の","tsugi no","berikutnya"],["乗り換え","norikae","transit/ganti kereta"],["何番線","nanbansen","peron nomor berapa"],["料金","ryoukin","tarif"],["急行","kyuukou","kereta ekspres"],["各駅停車","kakueki teisha","kereta lokal (tiap stasiun)"],["改札","kaisatsu","gerbang tiket"]],
  'q':[
   {"q":"切符を買いたいときの言い方はどれか。","opts":["東京までの切符をください","切符","東京","ください切符"],"a":0,"e":"「〜までの切符をください」(minta tiket sampai…)で購入する。"},
   {"q":"何番線か尋ねる言い方はどれか。","opts":["何番線ですか","いくらですか","何時ですか","だれですか"],"a":0,"e":"「何番線ですか」(peron nomor berapa?)でホームを尋ねる。"},
   {"q":"「乗り換え」の意味はどれか。","opts":["ganti kereta/transit","turun","tiket","peron"],"a":0,"e":"乗り換え=transit/ganti kereta. 「〜で乗り換えます」で使う。"},
   {"q":"次の電車の時刻を尋ねる言い方はどれか。","opts":["次の電車は何時ですか","次","電車","何"],"a":0,"e":"「次の電車は何時ですか」(kereta berikutnya jam berapa?)で尋ねる。"},
   {"q":"「急行」と「各駅停車」の違いはどれか。","opts":["急行は速く主要駅のみ停車","同じ","各駅が速い","急行は遅い"],"a":0,"e":"急行(ekspres)=主要駅のみ停車で速い. 各駅停車=すべての駅に停車。"},
   {"q":"料金を尋ねる言い方はどれか。","opts":["料金はいくらですか","料金","いくら料金","だれ"],"a":0,"e":"「料金はいくらですか」(tarifnya berapa?)で運賃を尋ねる。"},
   {"q":"改札(kaisatsu)で必要なものはどれか。","opts":["切符またはICカード","パスポート","財布のみ","何もいらない"],"a":0,"e":"改札=gerbang tiket. 切符・ICカード(tiket/kartu)が必要。"},
   {"q":"道に迷ったとき駅員に尋ねる言い方はどれか。","opts":["すみません、〜線はどこですか","うるさい","早く","知らない"],"a":0,"e":"「すみません、〜線はどこですか」(di mana jalur…?)で駅員に尋ねる。"},
   {"q":"電車が遅れているときのアナウンス語はどれか。","opts":["遅れ(keterlambatan)","出発","到着","満員"],"a":0,"e":"遅れ=keterlambatan. 「電車が遅れています」でアナウンスされる。"},
   {"q":"目的の駅で降りる準備を表す言い方はどれか。","opts":["次で降ります","乗ります","待ちます","戻ります"],"a":0,"e":"「次で降ります」(turun di berikutnya)で下車を伝える. 降りる=turun。"},
  ]},
}
def jsv(v): return '['+', '.join('['+', '.join('"'+str(x).replace('"','\\"')+'"' for x in r)+']' for r in v)+']'
def main():
    t=open(TEMPLATE,encoding='utf-8').read()
    for slug,s in MODULES.items():
        c=t
        c=re.sub(r'<title>.*?</title>',f'<title>{s["title"]} | Nihonggo Pro Academy</title>',c,count=1)
        c=re.sub(r'(<meta name="description" content=")[^"]*(">)',lambda m:m.group(1)+s['desc']+m.group(2),c,count=1)
        c=c.replace('Kaigo-Ujian-N2.html',slug)
        c=re.sub(r'(<meta property="og:title" content=")[^"]*(">)',lambda m:m.group(1)+s['title']+' — Nihonggo Pro Academy'+m.group(2),c,count=1)
        c=re.sub(r'PH_VOCAB=\[.*?\];','PH_VOCAB='+jsv(s['vocab'])+';',c,count=1,flags=re.DOTALL)
        c=re.sub(r'var Q=\[.*?\];','var Q='+json.dumps(s['q'],ensure_ascii=False)+';',c,count=1,flags=re.DOTALL)
        open(os.path.join(ROOT,'Materi',slug),'w',encoding='utf-8').write(c)
        print(f"OK {slug}: {len(s['q'])} soal, {len(s['vocab'])} kosakata")
if __name__=='__main__': main()
