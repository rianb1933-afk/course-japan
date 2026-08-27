#!/usr/bin/env python3
"""
Modul simulasi ujian 介護福祉士 tahap 2 — melengkapi 領域2 & 領域3.

- 介護の基本          → Kaigo-Ujian-Kihon
- 生活支援技術         → Kaigo-Ujian-Seikatsu-Shien
- 発達と老化の理解      → Kaigo-Ujian-Hattatsu-Roka
- 障害の理解          → Kaigo-Ujian-Shogai

Memakai template & helper yang sama dengan build_kaigo_exam_modules.py.

    python3 scripts/build_kaigo_exam_modules_2.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'Materi', 'Kaigo-Ujian-N2.html')

MODULES = {
    'Kaigo-Ujian-Kihon.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 介護の基本',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 介護の基本 '
                 '(Dasar Perawatan): martabat, kemandirian, ICF, keselamatan, '
                 'kerja tim, dan etika profesi. Soal dengan pembahasan dwibahasa.'),
        'vocab': [
            ["介護の基本", "kaigo no kihon", "dasar perawatan"],
            ["自立支援", "jiritsu shien", "dukungan kemandirian"],
            ["尊厳の保持", "songen no hoji", "menjaga martabat"],
            ["ICF", "ai shii efu", "klasifikasi fungsi (ICF)"],
            ["QOL", "kyuu ō eru", "kualitas hidup"],
            ["リスクマネジメント", "risuku manejimento", "manajemen risiko"],
            ["多職種連携", "tashokushu renkei", "kolaborasi multiprofesi"],
            ["守秘義務", "shuhi gimu", "kewajiban menjaga rahasia"],
            ["ノーマライゼーション", "noomaraizeeshon", "normalisasi"],
            ["エンパワメント", "enpawamento", "pemberdayaan"],
        ],
        'questions': [
            {"q": "介護における「自立支援」の考え方として正しいのはどれか。",
             "opts": ["すべて介護者が代行する", "できることは本人が行い、できない部分を支える", "本人に任せて関与しない", "効率を最優先する"], "a": 1,
             "e": "自立支援=残存能力を活かし、できることを奪わない(dukung kemandirian). できない部分だけ支援。"},
            {"q": "ICF(国際生活機能分類)の特徴として正しいのはどれか。",
             "opts": ["障害のマイナス面のみ捉える", "生活機能と背景因子を総合的に捉える", "病名の分類のみ", "高齢者専用"], "a": 1,
             "e": "ICFは心身機能・活動・参加と環境・個人因子(faktor lingkungan)を総合的に捉える枠組み。"},
            {"q": "利用者の尊厳を守る対応として適切なのはどれか。",
             "opts": ["呼び捨てにする", "プライバシーに配慮し本人の意思を尊重する", "急がせる", "選択肢を与えない"], "a": 1,
             "e": "尊厳の保持=プライバシー配慮・意思尊重(hormati kehendak). 呼称や声かけにも配慮する。"},
            {"q": "ノーマライゼーションの理念として正しいのはどれか。",
             "opts": ["障害者を隔離する", "障害の有無に関わらず共に生活できる社会", "施設中心の生活", "効率優先"], "a": 1,
             "e": "ノーマライゼーション=障害があっても地域で当たり前に暮らせる社会(hidup bersama)を目指す。"},
            {"q": "介護における守秘義務の説明として正しいのはどれか。",
             "opts": ["退職後は守らなくてよい", "業務上知った秘密を漏らしてはならない", "家族には自由に話せる", "SNSに書いてよい"], "a": 1,
             "e": "守秘義務=業務上知った個人情報・秘密を漏らさない(rahasia jabatan). 退職後も継続する。"},
            {"q": "リスクマネジメントの目的として正しいのはどれか。",
             "opts": ["事故の責任追及のみ", "事故を予防し安全を確保する", "記録を減らす", "利用者を拘束する"], "a": 1,
             "e": "リスクマネジメント=ヒヤリハットを分析し事故を予防(cegah kecelakaan). 拘束が目的ではない。"},
            {"q": "多職種連携が重要な理由として正しいのはどれか。",
             "opts": ["責任を分散するため", "利用者を多面的に支えるため", "会議を増やすため", "介護職の負担を回避するため"], "a": 1,
             "e": "多職種連携(kolaborasi)=医師・看護・リハ等が情報共有し利用者を総合的に支援するため。"},
            {"q": "ヒヤリハットの説明として正しいのはどれか。",
             "opts": ["重大事故のみ", "事故に至らなかったが危なかった出来事", "利用者の苦情", "職員の遅刻"], "a": 1,
             "e": "ヒヤリハット=事故寸前の出来事(nyaris celaka). 分析し重大事故を未然に防ぐ手がかりにする。"},
            {"q": "利用者主体のケアとして適切なのはどれか。",
             "opts": ["介護者の都合を優先", "本人の希望や生活習慣を尊重する", "全員同じ時間に起こす", "選択を認めない"], "a": 1,
             "e": "利用者主体=本人の希望・生活歴・習慣(kebiasaan hidup)を尊重した個別ケアを行う。"},
            {"q": "介護職の職業倫理として適切でないのはどれか。",
             "opts": ["利用者を尊重する", "秘密を守る", "利用者を差別的に扱う", "安全に配慮する"], "a": 2,
             "e": "差別的な扱いは倫理違反(pelanggaran etika). 公平・尊重・守秘・安全配慮が職業倫理の基本。"},
            {"q": "エンパワメントの考え方として正しいのはどれか。",
             "opts": ["本人の力を引き出し主体性を高める", "すべて指示する", "依存を強める", "選択を制限する"], "a": 0,
             "e": "エンパワメント=本人が本来持つ力を引き出し、自己決定・主体性(kemandirian)を高める。"},
            {"q": "QOL(生活の質)を高めるケアとして適切なのはどれか。",
             "opts": ["身体面のみ重視", "身体・精神・社会面を含め満足感を支える", "医療処置だけ行う", "画一的に対応"], "a": 1,
             "e": "QOL(kualitas hidup)=身体だけでなく精神・社会的満足も含めて生活全体を豊かに支える。"},
        ],
    },
    'Kaigo-Ujian-Seikatsu-Shien.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 生活支援技術',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 生活支援技術 '
                 '(Teknik Dukungan Hidup): makan, mandi, ekskresi, berpakaian, '
                 'transfer, dan lingkungan. Soal dengan pembahasan dwibahasa.'),
        'vocab': [
            ["生活支援技術", "seikatsu shien gijutsu", "teknik dukungan hidup"],
            ["食事介助", "shokuji kaijo", "bantuan makan"],
            ["入浴介助", "nyuyoku kaijo", "bantuan mandi"],
            ["排泄介助", "haisetsu kaijo", "bantuan ekskresi"],
            ["移乗", "ijo", "transfer (pindah)"],
            ["ボディメカニクス", "bodi mekanikusu", "mekanika tubuh"],
            ["更衣", "koi", "ganti pakaian"],
            ["体位変換", "taii henkan", "perubahan posisi"],
            ["残存機能", "zanzon kino", "fungsi yang tersisa"],
            ["福祉用具", "fukushi yogu", "alat bantu kesejahteraan"],
        ],
        'questions': [
            {"q": "片麻痺のある利用者の更衣で原則となるのはどれか。",
             "opts": ["脱健着患", "着健脱患", "どちらでもよい", "両手同時"], "a": 0,
             "e": "脱健着患=脱ぐときは健側から、着るときは患側から(sisi lemah dulu saat memakai). 負担を減らす。"},
            {"q": "ボディメカニクスの原則として正しいのはどれか。",
             "opts": ["支持基底面を狭くする", "重心を近づけ大きな筋群を使う", "膝を伸ばす", "腰をひねる"], "a": 1,
             "e": "対象に重心を近づけ、大きな筋群(otot besar)を使う. 腰痛予防にもなる。支持基底面は広く。"},
            {"q": "食事介助で誤嚥を防ぐ姿勢として適切なのはどれか。",
             "opts": ["顎を上げて仰向け", "やや前傾で顎を引いた座位", "寝たまま", "急いで食べさせる"], "a": 1,
             "e": "顎を引き、やや前傾の座位(posisi duduk sedikit condong)で誤嚥予防. 一口量とペースにも配慮。"},
            {"q": "入浴の効果として適切でないのはどれか。",
             "opts": ["清潔保持", "血行促進", "リラックス", "脱水の予防"], "a": 3,
             "e": "入浴はむしろ発汗で脱水を招きやすい(risiko dehidrasi). 前後の水分補給・体調確認が必要。"},
            {"q": "排泄介助で尊重すべきことはどれか。",
             "opts": ["羞恥心とプライバシー", "作業の速さ", "職員の都合", "音を立てること"], "a": 0,
             "e": "排泄は羞恥心(rasa malu)を伴う. プライバシーを守り、自尊心に配慮した対応をする。"},
            {"q": "移乗介助で車いすを置く位置として適切なのはどれか。",
             "opts": ["健側に20〜30度の角度で", "患側の真後ろ", "遠くに離して", "ベッドと平行"], "a": 0,
             "e": "健側(sisi sehat)に20〜30度で置くと立ち上がり・方向転換がしやすい。ブレーキ確認も必須。"},
            {"q": "褥瘡予防のための体位変換の目安はどれか。",
             "opts": ["原則2時間ごと", "1日1回", "1週間に1回", "変換しない"], "a": 0,
             "e": "同一部位の圧迫を避けるため原則2時間ごと(setiap 2 jam)に体位変換. 除圧マットも活用。"},
            {"q": "残存機能を活かす介護として適切なのはどれか。",
             "opts": ["すべて介助する", "できる動作は本人に行ってもらう", "見守らない", "急がせる"], "a": 1,
             "e": "残存機能(fungsi tersisa)を活かし、できる動作は本人に. 過介助は自立を妨げる。"},
            {"q": "口腔ケアの目的として適切でないのはどれか。",
             "opts": ["誤嚥性肺炎予防", "口腔内の清潔", "唾液分泌の促進", "体重増加"], "a": 3,
             "e": "口腔ケアは清潔・誤嚥性肺炎予防・唾液分泌(air liur)促進が目的. 体重増加とは無関係。"},
            {"q": "福祉用具の選定で最も重視すべきことはどれか。",
             "opts": ["価格の安さ", "利用者の状態と生活環境への適合", "見た目", "最新製品か"], "a": 1,
             "e": "福祉用具(alat bantu)は本人の身体状況・生活環境に適合するか(kecocokan)を最優先に選ぶ。"},
            {"q": "衣服を選ぶ際に配慮すべきことはどれか。",
             "opts": ["着脱のしやすさと本人の好み", "職員が選んだ物のみ", "季節を無視", "同じ服を毎日"], "a": 0,
             "e": "着脱しやすさ・本人の好み・季節(selera & musim)を尊重. 自己選択はQOL向上につながる。"},
            {"q": "安全な歩行介助として適切なのはどれか。",
             "opts": ["患側後方に立って支える", "前を歩いて引っ張る", "手を離す", "急がせる"], "a": 0,
             "e": "介助者は患側のやや後方(sisi lemah, agak belakang)に立ち、転倒に備えて支える。"},
        ],
    },
    'Kaigo-Ujian-Hattatsu-Roka.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 発達と老化の理解',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 発達と老化の理解 '
                 '(Perkembangan & Penuaan): tahap perkembangan, perubahan penuaan, '
                 'penyakit lansia. Soal dengan pembahasan dwibahasa.'),
        'vocab': [
            ["発達", "hattatsu", "perkembangan"],
            ["老化", "roka", "penuaan"],
            ["加齢", "karei", "bertambah usia"],
            ["エリクソン", "erikuson", "Erikson (teori perkembangan)"],
            ["生理的老化", "seiriteki roka", "penuaan fisiologis"],
            ["病的老化", "byoteki roka", "penuaan patologis"],
            ["予備力", "yobiryoku", "cadangan fungsi"],
            ["適応力", "tekioryoku", "daya adaptasi"],
            ["サルコペニア", "sarukopenia", "sarkopenia (kehilangan otot)"],
            ["老年症候群", "ronen shokogun", "sindrom geriatri"],
        ],
        'questions': [
            {"q": "エリクソンの発達段階で老年期の課題はどれか。",
             "opts": ["信頼対不信", "自我統合対絶望", "親密対孤立", "勤勉対劣等感"], "a": 1,
             "e": "老年期の課題は自我統合対絶望(integritas vs putus asa). 人生を受容できるかが鍵。"},
            {"q": "生理的老化の特徴として正しいのはどれか。",
             "opts": ["誰にでも起こる不可逆的変化", "病気による変化", "治療で治る", "一部の人だけ"], "a": 0,
             "e": "生理的老化=加齢で誰にでも起こる不可逆的(tidak dapat dibalik)変化. 病的老化は疾患による。"},
            {"q": "加齢に伴う変化として正しいのはどれか。",
             "opts": ["予備力が増す", "予備力が低下する", "回復が早まる", "免疫が高まる"], "a": 1,
             "e": "加齢で予備力(cadangan fungsi)が低下し、ストレスや病気からの回復に時間がかかる。"},
            {"q": "サルコペニアの説明として正しいのはどれか。",
             "opts": ["骨密度低下", "加齢による筋肉量・筋力の低下", "視力低下", "難聴"], "a": 1,
             "e": "サルコペニア=加齢に伴う筋肉量・筋力の低下(kehilangan otot). 転倒・フレイルの原因。"},
            {"q": "高齢者の薬物代謝の特徴として正しいのはどれか。",
             "opts": ["代謝・排泄が速い", "代謝・排泄が遅く作用が強く出やすい", "影響を受けない", "若年者と同じ"], "a": 1,
             "e": "加齢で肝・腎機能が低下し薬の代謝・排泄が遅い(lambat). 副作用が出やすく観察が重要。"},
            {"q": "老年症候群に含まれるのはどれか。",
             "opts": ["転倒・失禁・低栄養など", "骨折のみ", "感染症のみ", "がんのみ"], "a": 0,
             "e": "老年症候群=転倒・失禁・低栄養・認知機能低下(sindrom geriatri)など高齢者に多い症状群。"},
            {"q": "高齢者の感覚機能の変化として正しいのはどれか。",
             "opts": ["高音域が聞こえにくくなる", "視野が広がる", "味覚が鋭くなる", "触覚が敏感になる"], "a": 0,
             "e": "加齢で高音域の聴力低下(高音が聞こえにくい/nada tinggi). 味覚・視覚・触覚も鈍化する。"},
            {"q": "高齢者の体温調節の特徴として正しいのはどれか。",
             "opts": ["調節機能が高い", "調節機能が低下し熱中症・低体温になりやすい", "汗を多くかく", "変化しない"], "a": 1,
             "e": "体温調節機能が低下(regulasi suhu menurun)し、熱中症や低体温のリスクが高い。環境調整が重要。"},
            {"q": "発達の原則として正しいのはどれか。",
             "opts": ["一定の順序で進む", "順序は無関係", "全員同じ速度", "後戻りする"], "a": 0,
             "e": "発達は一定の方向・順序(urutan tertentu)で進むが、速度には個人差がある。"},
            {"q": "高齢者の脱水が起こりやすい理由として正しいのはどれか。",
             "opts": ["体内水分量が多い", "口渇感が低下し水分摂取が減る", "腎機能が高い", "汗が多い"], "a": 1,
             "e": "加齢で口渇感が鈍り(rasa haus menurun)、体内水分量も減少するため脱水になりやすい。"},
            {"q": "廃用症候群を防ぐために重要なのはどれか。",
             "opts": ["安静を保つ", "適度な活動と早期離床", "動かさない", "寝たきりにする"], "a": 1,
             "e": "廃用症候群予防には適度な活動・早期離床(mobilisasi dini). 不活動は機能低下を招く。"},
            {"q": "高齢者の心理的特徴として配慮すべきことはどれか。",
             "opts": ["喪失体験が重なりやすい", "感情がなくなる", "記憶が全て失われる", "学習できない"], "a": 0,
             "e": "退職・死別など喪失体験(pengalaman kehilangan)が重なりやすい. 心理的支援と傾聴が大切。"},
        ],
    },
    'Kaigo-Ujian-Shogai.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 障害の理解',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 障害の理解 '
                 '(Pemahaman Disabilitas): jenis disabilitas fisik/intelektual/'
                 'psikis, ICF, dukungan kemandirian. Soal dengan pembahasan dwibahasa.'),
        'vocab': [
            ["障害の理解", "shogai no rikai", "pemahaman disabilitas"],
            ["身体障害", "shintai shogai", "disabilitas fisik"],
            ["知的障害", "chiteki shogai", "disabilitas intelektual"],
            ["精神障害", "seishin shogai", "disabilitas psikis"],
            ["発達障害", "hattatsu shogai", "disabilitas perkembangan"],
            ["内部障害", "naibu shogai", "disabilitas internal"],
            ["合理的配慮", "goriteki hairyo", "akomodasi yang wajar"],
            ["バリアフリー", "baria furii", "bebas hambatan"],
            ["障害受容", "shogai juyo", "penerimaan disabilitas"],
            ["自助具", "jijogu", "alat bantu mandiri"],
        ],
        'questions': [
            {"q": "「合理的配慮」の説明として正しいのはどれか。",
             "opts": ["特別扱いの禁止", "障害者が平等に参加できるための調整", "医療行為", "施設入所"], "a": 1,
             "e": "合理的配慮=障害者が他者と平等に社会参加(partisipasi setara)できるよう環境や方法を調整。"},
            {"q": "内部障害に含まれるのはどれか。",
             "opts": ["視覚障害", "心臓機能障害", "肢体不自由", "聴覚障害"], "a": 1,
             "e": "内部障害=心臓・腎臓・呼吸器など外見で分かりにくい機能障害(disabilitas internal)。"},
            {"q": "障害受容の過程で最終段階とされるのはどれか。",
             "opts": ["ショック期", "否認期", "受容・適応期", "混乱期"], "a": 2,
             "e": "障害受容は概ねショック→否認→混乱→適応・受容(penerimaan)へ. 個人差があり一様ではない。"},
            {"q": "知的障害のある人への支援として適切なのはどれか。",
             "opts": ["専門用語で説明", "分かりやすい言葉と具体的な方法で伝える", "急がせる", "選択させない"], "a": 1,
             "e": "平易な言葉・絵・具体例(bahasa sederhana)で伝え、本人のペースと自己決定を尊重する。"},
            {"q": "精神障害のある人への対応として適切なのはどれか。",
             "opts": ["症状を否定する", "安心できる環境で本人の話を傾聴する", "強く指導する", "距離を置く"], "a": 1,
             "e": "安心できる関係の中で傾聴(mendengarkan)し、服薬・生活リズムを支える。否定や強制は避ける。"},
            {"q": "バリアフリーの説明として正しいのはどれか。",
             "opts": ["段差など障壁を取り除くこと", "障害者を分けること", "医療の一種", "資格制度"], "a": 0,
             "e": "バリアフリー=物理的・心理的な障壁(hambatan)を取り除き、誰もが暮らしやすくする考え方。"},
            {"q": "ユニバーサルデザインの考え方として正しいのはどれか。",
             "opts": ["障害者専用の設計", "最初から誰もが使いやすい設計", "高齢者専用", "後から改修する"], "a": 1,
             "e": "ユニバーサルデザイン=はじめから年齢・障害に関わらず誰もが使える(desain universal)設計。"},
            {"q": "視覚障害者の誘導で適切なのはどれか。",
             "opts": ["腕をつかんで引っ張る", "介助者の肘の少し上を持ってもらい半歩前を歩く", "後ろから押す", "放置する"], "a": 1,
             "e": "介助者の肘付近を持ってもらい半歩前(setengah langkah di depan)を歩く. 段差は事前に伝える。"},
            {"q": "発達障害の特性として正しいのはどれか。",
             "opts": ["生まれつきの脳機能の特性", "後天的な病気のみ", "しつけの問題", "一時的なもの"], "a": 0,
             "e": "発達障害=生まれつきの脳機能の特性(karakteristik bawaan). 環境調整と特性理解が支援の鍵。"},
            {"q": "障害者総合支援法のサービス利用の流れで最初に行うのはどれか。",
             "opts": ["市町村への申請", "入院", "施設契約", "薬の処方"], "a": 0,
             "e": "まず市町村へ申請(pengajuan)し、調査・支給決定を経てサービス等利用計画を作成する。"},
            {"q": "自助具の目的として正しいのはどれか。",
             "opts": ["介助者の作業", "障害があっても自分で動作できるよう補助する", "医療処置", "拘束"], "a": 1,
             "e": "自助具(alat bantu mandiri)=握りやすいスプーン等で本人が自力で動作できるよう支える。"},
            {"q": "障害のある人の「エンパワメント」として適切なのはどれか。",
             "opts": ["すべて代行する", "本人の強みを活かし自己決定を支える", "依存させる", "選択を制限"], "a": 1,
             "e": "エンパワメント=本人の強み(kekuatan)を活かし、自己決定・社会参加を支える関わり。"},
        ],
    },
}


def js_vocab(vocab):
    return '[' + ', '.join(
        '[' + ', '.join('"' + x.replace('"', '\\"') + '"' for x in v) + ']'
        for v in vocab) + ']'


def build_one(slug, spec, template):
    c = template
    c = re.sub(r'<title>.*?</title>',
               f'<title>{spec["title"]} | Nihongo Pro Academy</title>', c, count=1)
    c = re.sub(r'(<meta name="description" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['desc'] + m.group(2), c, count=1)
    c = c.replace('Kaigo-Ujian-N2.html', slug)
    c = re.sub(r'(<meta property="og:title" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['title'] + ' — Nihongo Pro Academy' + m.group(2),
               c, count=1)
    c = re.sub(r'PH_VOCAB=\[.*?\];', 'PH_VOCAB=' + js_vocab(spec['vocab']) + ';',
               c, count=1, flags=re.DOTALL)
    c = re.sub(r'var Q=\[.*?\];',
               'var Q=' + json.dumps(spec['questions'], ensure_ascii=False) + ';',
               c, count=1, flags=re.DOTALL)
    return c


def main():
    template = open(TEMPLATE, encoding='utf-8').read()
    for slug, spec in MODULES.items():
        out = os.path.join(ROOT, 'Materi', slug)
        html = build_one(slug, spec, template)
        with open(out, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ {slug}: {len(spec['questions'])} soal, {len(spec['vocab'])} kosakata")


if __name__ == '__main__':
    main()
