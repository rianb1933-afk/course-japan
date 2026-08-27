#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Isi field kaigoExample (kalimat contoh Jepang+terjemahan) dan aliases (sinonim nyata)
untuk seluruh 123 istilah anatomi. Ditulis manual per istilah untuk akurasi -- bukan
template generik yang berisiko tidak natural/tidak akurat secara medis-linguistik."""
import json, re

# Format kaigoExample: "Kalimat Jepang.\n(Terjemahan Indonesia.)"
# aliases: list string sinonim/istilah terkait YANG BENAR-BENAR ADA (dibiarkan kosong jika tak ada)
ENRICH = {
 # ═══ BAGIAN LUAR ═══
 'atama': {'ex':'頭を打たないように気をつけてください。\n(Hati-hati jangan sampai kepala terbentur.)','al':[]},
 'kubi': {'ex':'首を痛めないようにゆっくり動かしましょう。\n(Gerakkan pelan-pelan agar leher tidak sakit.)','al':[]},
 'kata': {'ex':'肩を揉んでもよろしいですか。\n(Bolehkah saya memijat bahu Anda?)','al':[]},
 'mune': {'ex':'胸に手を当てて深呼吸してください。\n(Letakkan tangan di dada dan tarik napas dalam.)','al':[]},
 'senaka': {'ex':'背中をさすりますね。\n(Saya akan mengusap punggung Anda ya.)','al':[]},
 'onaka': {'ex':'お腹の調子はいかがですか。\n(Bagaimana kondisi perut Anda?)','al':['腹']},
 'koshi': {'ex':'腰を痛めないよう気をつけて持ち上げてください。\n(Angkat dengan hati-hati agar pinggang tidak cedera.)','al':[]},
 'ude': {'ex':'腕をゆっくり上げてみましょう。\n(Coba angkat lengan perlahan-lahan.)','al':[]},
 'hiji': {'ex':'肘を軽く曲げてください。\n(Tolong tekuk siku sedikit.)','al':[]},
 'te': {'ex':'手を握ってもいいですか。\n(Bolehkah saya menggenggam tangan Anda?)','al':[]},
 'yubi': {'ex':'指を一本ずつ動かしてみてください。\n(Coba gerakkan jari satu per satu.)','al':[]},
 'momo': {'ex':'ももの筋肉が張っていますね。\n(Otot paha terasa tegang ya.)','al':['太もも']},
 'hiza': {'ex':'膝を曲げるとき痛みはありますか。\n(Apakah terasa sakit saat menekuk lutut?)','al':[]},
 'ashi': {'ex':'足の裏を見せていただけますか。\n(Bolehkah saya melihat telapak kaki Anda?)','al':[]},
 'ashikubi': {'ex':'足首が腫れていないか確認します。\n(Saya akan periksa apakah pergelangan kaki bengkak.)','al':[]},
 'tenohira': {'ex':'手のひらでしっかり体を支えてください。\n(Topang tubuh dengan kuat memakai telapak tangan.)','al':[]},
 'kou': {'ex':'手の甲に点滴の針を刺します。\n(Jarum infus akan ditusukkan di punggung tangan.)','al':[]},
 'kakato': {'ex':'踵に赤みがないか毎日確認しましょう。\n(Periksa setiap hari apakah ada kemerahan di tumit.)','al':[]},
 'waki': {'ex':'わきに体温計を挟んでください。\n(Jepitkan termometer di ketiak.)','al':['腋窩']},
 'heso': {'ex':'へそのあたりが痛みますか。\n(Apakah terasa sakit di sekitar pusar?)','al':[]},

 # ═══ PANCA INDERA ═══
 'me': {'ex':'目が見えにくいことはありますか。\n(Apakah ada kesulitan melihat?)','al':[]},
 'mabuta': {'ex':'まぶたが少し腫れていますね。\n(Kelopak matanya sedikit bengkak ya.)','al':[]},
 'kakumaku': {'ex':'角膜に傷がないか診てもらいましょう。\n(Mari periksakan apakah ada luka di kornea.)','al':[]},
 'suishoutai': {'ex':'水晶体が濁ると白内障になります。\n(Jika lensa mata mengeruh, terjadilah katarak.)','al':[]},
 'moumaku': {'ex':'網膜の検査を定期的に受けましょう。\n(Lakukan pemeriksaan retina secara berkala.)','al':[]},
 'komaku': {'ex':'鼓膜に異常がないか耳鼻科で診てもらいます。\n(Periksakan ke THT apakah gendang telinga normal.)','al':[]},
 'mimiaka': {'ex':'耳垢は無理に取らないでください。\n(Jangan mengeluarkan kotoran telinga dengan paksa.)','al':[]},
 'mimi': {'ex':'耳がよく聞こえますか。\n(Apakah Anda bisa mendengar dengan baik?)','al':[]},
 'mayuge': {'ex':'眉をひそめているので痛いのかもしれません。\n(Karena mengerutkan alis, mungkin terasa sakit.)','al':[]},
 'hoo': {'ex':'頬がこけてきたように見えます。\n(Pipinya terlihat semakin cekung.)','al':[]},
 'hitai': {'ex':'額に手を当てて熱を確認します。\n(Saya akan cek demam dengan menyentuh dahi.)','al':[]},
 'ago': {'ex':'あごを引いて飲み込んでください。\n(Tarik dagu ke bawah lalu telan.)','al':[]},
 'kuchibiru': {'ex':'唇が乾燥していますね。\n(Bibirnya kering ya.)','al':[]},
 'hana': {'ex':'鼻が詰まっていませんか。\n(Apakah hidung Anda tersumbat?)','al':[]},
 'kuchi': {'ex':'口を大きく開けてください。\n(Tolong buka mulut lebar-lebar.)','al':['お口']},
 'ha': {'ex':'歯をきれいに磨きましょう。\n(Mari sikat gigi sampai bersih.)','al':[]},
 'shita': {'ex':'舌を出してみてください。\n(Coba julurkan lidah Anda.)','al':[]},
 'nodo': {'ex':'喉が渇いていませんか。\n(Apakah Anda merasa haus?)','al':[]},
 'daeki': {'ex':'唾液が少ないと感じることはありますか。\n(Apakah Anda merasa air liur berkurang?)','al':[]},
 'namida': {'ex':'涙が出にくいときは目薬を使いましょう。\n(Kalau mata kering, gunakan obat tetes mata.)','al':[]},

 # ═══ RANGKA ═══
 'hone': {'ex':'骨が丈夫になるよう運動しましょう。\n(Mari berolahraga agar tulang tetap kuat.)','al':[]},
 'zugaikotsu': {'ex':'頭蓋骨を守るためヘルメットが必要です。\n(Helm diperlukan untuk melindungi tengkorak.)','al':[]},
 'sebone': {'ex':'背骨がまっすぐか姿勢を確認します。\n(Saya periksa postur untuk memastikan tulang belakang lurus.)','al':['脊椎']},
 'rokkotsu': {'ex':'肋骨のあたりを押すと痛みますか。\n(Apakah sakit jika ditekan di area tulang rusuk?)','al':[]},
 'kotsuban': {'ex':'骨盤を安定させる姿勢を保ちましょう。\n(Pertahankan posisi yang menstabilkan panggul.)','al':[]},
 'daitaikotsu': {'ex':'大腿骨を骨折すると歩行が難しくなります。\n(Jika femur patah, berjalan jadi sulit.)','al':[]},
 'jouwankotsu': {'ex':'転んだ拍子に上腕骨を折ってしまいました。\n(Humerus patah saat terjatuh.)','al':[]},
 'shitsugaikotsu': {'ex':'膝蓋骨のあたりに痛みはありますか。\n(Apakah ada nyeri di sekitar tempurung lutut?)','al':[]},
 'sakotsu': {'ex':'転倒して鎖骨を骨折しました。\n(Tulang selangka patah karena terjatuh.)','al':[]},
 'kenkoukotsu': {'ex':'肩甲骨を支点にして体を横向きにします。\n(Miringkan tubuh dengan tumpuan tulang belikat.)','al':[]},
 'kansetsu': {'ex':'関節を無理に動かさないでください。\n(Jangan menggerakkan sendi secara paksa.)','al':[]},
 'kokansetsu': {'ex':'股関節の手術を受けたことがありますか。\n(Apakah pernah operasi sendi panggul?)','al':[]},
 'katakansetsu': {'ex':'肩関節が動かしにくいと感じますか。\n(Apakah terasa sulit menggerakkan sendi bahu?)','al':[]},

 # ═══ ORGAN DALAM ═══
 'nou': {'ex':'脳の働きを保つために脳トレをしましょう。\n(Latihan otak untuk menjaga fungsi otak.)','al':[]},
 'dainou': {'ex':'大脳が思考や記憶を司っています。\n(Otak besar mengatur pikiran dan ingatan.)','al':[]},
 'shounou': {'ex':'小脳が弱ると体のバランスが崩れやすくなります。\n(Jika otak kecil melemah, keseimbangan tubuh mudah terganggu.)','al':[]},
 'noukan': {'ex':'脳幹は呼吸など生命維持に重要です。\n(Batang otak penting untuk fungsi vital seperti pernapasan.)','al':[]},
 'zentouyou': {'ex':'前頭葉の機能は判断力に関係します。\n(Fungsi lobus frontal terkait kemampuan menilai.)','al':[]},
 'kaiba': {'ex':'海馬は新しい記憶を作る役割があります。\n(Hipokampus berperan membentuk ingatan baru.)','al':[]},
 'shinzou': {'ex':'心臓の音を聴診器で聞きます。\n(Mendengarkan detak jantung dengan stetoskop.)','al':[]},
 'shinbou': {'ex':'心房細動という不整脈があります。\n(Ada gangguan irama jantung bernama fibrilasi atrium.)','al':[]},
 'shinshitsu': {'ex':'心室が血液を送り出す役割をします。\n(Ventrikel berperan memompa darah keluar.)','al':[]},
 'shinzouben': {'ex':'心臓弁の動きに異常がないか調べます。\n(Memeriksa apakah ada kelainan gerak katup jantung.)','al':[]},
 'hai': {'ex':'肺の音を聴診器で確認します。\n(Memeriksa suara paru-paru dengan stetoskop.)','al':[]},
 'kanzou': {'ex':'肝臓の数値を血液検査で調べます。\n(Memeriksa nilai fungsi hati lewat tes darah.)','al':[]},
 'i': {'ex':'胃の調子が悪いと感じますか。\n(Apakah Anda merasa lambung sedang tidak enak?)','al':[]},
 'chou': {'ex':'腸の動きを整えるため水分を摂りましょう。\n(Minum cukup air untuk menjaga pergerakan usus.)','al':[]},
 'jinzou': {'ex':'腎臓の機能を守るため塩分を控えましょう。\n(Kurangi garam untuk menjaga fungsi ginjal.)','al':[]},
 'boukou': {'ex':'膀胱に尿が溜まっている感じはありますか。\n(Apakah terasa urin menumpuk di kandung kemih?)','al':[]},
 'shokudou': {'ex':'食道を通る際にむせることはありますか。\n(Apakah pernah tersedak saat melewati esofagus?)','al':[]},
 'intou': {'ex':'咽頭のあたりに違和感がありますか。\n(Apakah ada rasa tidak nyaman di sekitar faring?)','al':[]},
 'chokuchou': {'ex':'直腸のあたりに便が溜まっています。\n(Feses menumpuk di sekitar rektum.)','al':[]},
 'daekisen': {'ex':'唾液腺の働きが弱ると口が乾きます。\n(Jika kelenjar air liur melemah, mulut jadi kering.)','al':[]},
 'kikan': {'ex':'気管切開の管理方法を確認します。\n(Memeriksa cara perawatan trakeostomi.)','al':[]},
 'kikanshi': {'ex':'気管支が狭くなると呼吸が苦しくなります。\n(Jika bronkus menyempit, napas jadi sesak.)','al':[]},
 'nyoudou': {'ex':'尿道からカテーテルを挿入します。\n(Kateter dimasukkan lewat uretra.)','al':[]},
 'shouchou': {'ex':'小腸で栄養の大部分が吸収されます。\n(Sebagian besar nutrisi diserap di usus halus.)','al':[]},
 'daichou': {'ex':'大腸の働きが弱いと便秘しやすいです。\n(Jika fungsi usus besar lemah, mudah sembelit.)','al':[]},
 'tannou': {'ex':'胆のうに石ができることがあります。\n(Kantong empedu bisa membentuk batu.)','al':[]},
 'hizou': {'ex':'脾臓は血液を作る働きにも関わります。\n(Limpa juga berperan dalam pembentukan darah.)','al':[]},
 'zenritsusen': {'ex':'前立腺のあたりに違和感はありますか。\n(Apakah ada rasa tidak nyaman di area prostat?)','al':[]},
 'koumon': {'ex':'肛門周りの皮膚を清潔に保ちます。\n(Menjaga kebersihan kulit di sekitar anus.)','al':[]},
 'suizou': {'ex':'膵臓の機能をインスリンの検査で調べます。\n(Fungsi pankreas diperiksa lewat tes insulin.)','al':[]},
 'koujousen': {'ex':'甲状腺の腫れがないか首を診ます。\n(Memeriksa leher apakah ada pembengkakan kelenjar tiroid.)','al':[]},

 # ═══ SIRKULASI & SARAF ═══
 'ketsueki': {'ex':'血液検査の結果を確認しましょう。\n(Mari periksa hasil tes darah.)','al':[]},
 'doumyaku': {'ex':'動脈の脈拍を手首で測ります。\n(Mengukur denyut arteri di pergelangan tangan.)','al':[]},
 'joumyaku': {'ex':'静脈から点滴の針を入れます。\n(Jarum infus dimasukkan melalui vena.)','al':[]},
 'rinpa': {'ex':'リンパの流れをよくするマッサージがあります。\n(Ada pijatan untuk melancarkan aliran getah bening.)','al':[]},
 'shinkei': {'ex':'神経が圧迫されるとしびれが出ます。\n(Jika saraf tertekan, timbul kesemutan.)','al':[]},
 'sekizui': {'ex':'脊髄を損傷すると麻痺が起こります。\n(Jika sumsum tulang belakang cedera, terjadi kelumpuhan.)','al':[]},
 'jiritsushinkei': {'ex':'自律神経の乱れで立ちくらみが起きます。\n(Gangguan saraf otonom menyebabkan pusing saat berdiri.)','al':[]},
 'sekkekkyuu': {'ex':'赤血球の数値が低いと貧血の可能性があります。\n(Jika nilai sel darah merah rendah, mungkin anemia.)','al':[]},
 'hakkekkyuu': {'ex':'白血球の数値で感染の有無がわかります。\n(Nilai sel darah putih menunjukkan ada-tidaknya infeksi.)','al':[]},
 'kesshouban': {'ex':'血小板が少ないとあざができやすいです。\n(Jika trombosit sedikit, mudah timbul memar.)','al':[]},

 # ═══ OTOT & KULIT ═══
 'kinniku': {'ex':'筋肉が落ちないよう体を動かしましょう。\n(Mari bergerak agar otot tidak menyusut.)','al':[]},
 'fukkin': {'ex':'腹筋を使って座る姿勢を保ちます。\n(Menggunakan otot perut untuk menjaga posisi duduk.)','al':[]},
 'shinkin': {'ex':'心筋の働きを心電図で確認します。\n(Memeriksa kerja otot jantung lewat EKG.)','al':[]},
 'katsuyakukin': {'ex':'肛門括約筋の力が弱まっています。\n(Kekuatan otot sfingter anus melemah.)','al':[]},
 'daitaishitoukin': {'ex':'大腿四頭筋を鍛える運動をしましょう。\n(Mari latih otot paha depan.)','al':[]},
 'sankakukin': {'ex':'三角筋を使って腕を持ち上げます。\n(Mengangkat lengan menggunakan otot deltoid.)','al':[]},
 'souboukin': {'ex':'僧帽筋が緊張して肩がこっています。\n(Otot trapezius tegang, bahu jadi pegal.)','al':[]},
 'hifukukin': {'ex':'腓腹筋を伸ばすストレッチをしましょう。\n(Mari lakukan peregangan otot betis.)','al':[]},
 'oukakumaku': {'ex':'横隔膜を使って深呼吸してください。\n(Tarik napas dalam menggunakan diafragma.)','al':[]},
 'hifu': {'ex':'皮膚が赤くなっていないか確認します。\n(Memeriksa apakah kulit memerah.)','al':[]},
 'ke': {'ex':'最近、抜け毛が増えたと感じますか。\n(Apakah Anda merasa rambut rontok belakangan ini?)','al':[]},
 'kansen': {'ex':'汗腺の働きが弱ると熱がこもりやすいです。\n(Jika kelenjar keringat melemah, panas mudah terperangkap.)','al':[]},
 'tsume': {'ex':'爪を切るときは深爪に注意します。\n(Hati-hati jangan terlalu pendek saat memotong kuku.)','al':[]},
 'kekkan': {'ex':'血管が見えにくいので注意して採血します。\n(Karena pembuluh darah sulit terlihat, pengambilan darah dilakukan hati-hati.)','al':[]},

 # ═══ SENDI & GERAKAN ═══
 'mageru': {'ex':'ひざをゆっくり曲げてください。\n(Tekuk lutut perlahan-lahan.)','al':[]},
 'nobasu': {'ex':'腕をまっすぐ伸ばしてみましょう。\n(Coba luruskan lengan.)','al':[]},
 'mawasu': {'ex':'首をゆっくり回してください。\n(Putar leher perlahan-lahan.)','al':[]},
 'ageru': {'ex':'手を肩の高さまで上げてください。\n(Angkat tangan sampai setinggi bahu.)','al':[]},
 'sasaeru': {'ex':'体をしっかり支えますので安心してください。\n(Saya akan menopang tubuh Anda dengan kuat, tenang saja.)','al':[]},

 # ═══ NAMA PENYAKIT ═══
 'haien': {'ex':'誤嚥性肺炎を防ぐため口腔ケアが大切です。\n(Perawatan mulut penting untuk mencegah pneumonia aspirasi.)','al':[]},
 'noukousoku': {'ex':'脳梗塞の後遺症でまひが残ることがあります。\n(Gejala sisa stroke bisa berupa kelumpuhan.)','al':[]},
 'shinkinkousoku': {'ex':'心筋梗塞の症状として胸の痛みがあります。\n(Nyeri dada adalah gejala serangan jantung.)','al':[]},
 'tounyoubyou': {'ex':'糖尿病の方は血糖値の管理が重要です。\n(Bagi penderita diabetes, mengelola gula darah itu penting.)','al':[]},
 'kouketsuatsu': {'ex':'高血圧の薬を毎日忘れずに飲みましょう。\n(Jangan lupa minum obat hipertensi setiap hari.)','al':[]},
 'kotsososhoushou': {'ex':'骨粗鬆症の予防にカルシウムを摂りましょう。\n(Konsumsi kalsium untuk mencegah osteoporosis.)','al':[]},
 'ninchishou': {'ex':'認知症の方には穏やかに接しましょう。\n(Berinteraksilah dengan lembut kepada penderita demensia.)','al':[]},
 'zenritsusenhidai': {'ex':'前立腺肥大で夜間トイレが増えます。\n(BPH menyebabkan lebih sering ke toilet malam hari.)','al':['BPH']},
 'hakunaishou': {'ex':'白内障の手術を検討していますか。\n(Apakah sedang mempertimbangkan operasi katarak?)','al':[]},
 'nyourokansenshou': {'ex':'尿路感染症の兆候として発熱があります。\n(Demam adalah tanda infeksi saluran kemih.)','al':['UTI']},
}

path = 'assets/anatomy/anatomy-data.js'
c = open(path, encoding='utf-8').read()

# Ekstrak blok ANATOMY_SYSTEMS = {...}; via bracket-balance, parse sbg JSON
m = re.search(r'var ANATOMY_SYSTEMS = (\{)', c)
start = m.end() - 1
depth = 0; i = start; instr = False; esc = False
while i < len(c):
    ch = c[i]
    if instr:
        if esc: esc = False
        elif ch == '\\': esc = True
        elif ch == '"': instr = False
    else:
        if ch == '"': instr = True
        elif ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: break
    i += 1
end = i + 1
data = json.loads(c[start:end])

updated = 0
missing = []
for sys_key, sys_data in data.items():
    for t in sys_data['terms']:
        e = ENRICH.get(t['id'])
        if e:
            t['kaigoExample'] = e['ex']
            t['aliases'] = e['al']
            updated += 1
        else:
            missing.append(t['id'])

print(f"Diisi: {updated} / {sum(len(v['terms']) for v in data.values())}")
if missing:
    print("BELUM ADA enrichment untuk id:", missing)

new_json = json.dumps(data, ensure_ascii=False, indent=2)
new_c = c[:start] + new_json + c[end:]
open(path, 'w', encoding='utf-8').write(new_c)
print("✅ anatomy-data.js diperbarui")
