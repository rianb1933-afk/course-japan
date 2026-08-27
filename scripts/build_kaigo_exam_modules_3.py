#!/usr/bin/env python3
"""
Modul simulasi ujian 介護福祉士 tahap 3 (final) — melengkapi 領域1 & 領域2.

- 人間の尊厳と自立           → Kaigo-Ujian-Songen
- 人間関係とコミュニケーション → Kaigo-Ujian-Ningen-Kankei
- コミュニケーション技術       → Kaigo-Ujian-Comm-Gijutsu
- 介護過程                   → Kaigo-Ujian-Kaigo-Katei

Setelah ini seluruh 12 mata pelajaran ujian nasional tercakup.

    python3 scripts/build_kaigo_exam_modules_3.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'Materi', 'Kaigo-Ujian-N2.html')

MODULES = {
    'Kaigo-Ujian-Songen.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 人間の尊厳と自立',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 人間の尊厳と自立 '
                 '(Martabat & Kemandirian): hak asasi, self-determination, '
                 'advokasi, pencegahan penelantaran. Soal dengan pembahasan dwibahasa.'),
        'vocab': [
            ["尊厳", "songen", "martabat"],
            ["自立", "jiritsu", "kemandirian"],
            ["自己決定", "jiko kettei", "penentuan diri"],
            ["権利擁護", "kenri yogo", "advokasi hak"],
            ["アドボカシー", "adobokashii", "advokasi"],
            ["QOL", "kyuu ō eru", "kualitas hidup"],
            ["ノーマライゼーション", "noomaraizeeshon", "normalisasi"],
            ["虐待防止", "gyakutai boshi", "pencegahan penelantaran"],
            ["身体拘束", "shintai kosoku", "pengekangan fisik"],
            ["インフォームドコンセント", "infoomudo konsento", "informed consent"],
        ],
        'questions': [
            {"q": "「自己決定の尊重」として適切な対応はどれか。",
             "opts": ["介護者が決める", "本人が選べるよう情報を提供し意思を尊重する", "家族が全て決める", "選択肢を与えない"], "a": 1,
             "e": "自己決定の尊重=本人が選べるよう情報提供し意思を尊重(hormati kehendak). 代行決定は最小限に。"},
            {"q": "権利擁護(アドボカシー)の説明として正しいのはどれか。",
             "opts": ["介護者の権利を守る", "利用者の権利や意思を代弁し守る", "施設の利益を守る", "家族の希望のみ"], "a": 1,
             "e": "アドボカシー=自ら声を上げにくい利用者の権利・意思を代弁(mewakili)し守る活動。"},
            {"q": "身体拘束が原則禁止される理由として正しいのはどれか。",
             "opts": ["手間がかかる", "人間の尊厳と身体の自由を侵害する", "費用がかかる", "記録が増える"], "a": 1,
             "e": "身体拘束は尊厳・身体の自由(kebebasan)を侵害するため原則禁止. 緊急時3要件のみ例外。"},
            {"q": "高齢者虐待防止法で定める虐待に含まれないのはどれか。",
             "opts": ["身体的虐待", "心理的虐待", "経済的虐待", "適切な介護"], "a": 3,
             "e": "虐待=身体的・心理的・性的・経済的・ネグレクト(penelantaran). 適切な介護は虐待ではない。"},
            {"q": "インフォームドコンセントの説明として正しいのはどれか。",
             "opts": ["説明なしに同意させる", "十分な説明を受け納得して同意すること", "家族の同意のみ", "書面不要"], "a": 1,
             "e": "インフォームドコンセント=十分な説明を受け理解・納得(paham & setuju)した上での同意。"},
            {"q": "利用者の尊厳を守る声かけとして適切なのはどれか。",
             "opts": ["赤ちゃん言葉で話す", "大人として敬意を持って接する", "命令口調", "無視する"], "a": 1,
             "e": "年齢に関わらず一人の大人として敬意(hormat)を持って接する. 幼児扱いは尊厳を損なう。"},
            {"q": "ノーマライゼーションの理念に沿う対応はどれか。",
             "opts": ["施設内で完結させる", "地域で当たり前の生活ができるよう支える", "隔離する", "行動を制限する"], "a": 1,
             "e": "ノーマライゼーション=障害等があっても地域で普通の生活(hidup normal)ができる社会を目指す。"},
            {"q": "経済的虐待に該当するのはどれか。",
             "opts": ["年金を本人に無断で使う", "食事を提供する", "散歩に付き添う", "話を聞く"], "a": 0,
             "e": "経済的虐待=本人の年金・財産を無断で使う・使わせない(penyalahgunaan keuangan)こと。"},
            {"q": "利用者の自立支援として適切なのはどれか。",
             "opts": ["すべて代行する", "できることは自分で行えるよう見守り支える", "危険だから動かさない", "急がせる"], "a": 1,
             "e": "自立支援=残存能力を活かし、できることは本人が行えるよう見守り支援(dukung mandiri)する。"},
            {"q": "ネグレクト(介護放棄)に該当するのはどれか。",
             "opts": ["必要な食事・排泄・清潔の世話をしない", "毎日入浴介助する", "会話する", "受診に付き添う"], "a": 0,
             "e": "ネグレクト=必要な世話を怠る(penelantaran). 食事・清潔・医療を放置することは虐待にあたる。"},
            {"q": "利用者のプライバシー保護として適切なのはどれか。",
             "opts": ["個人情報を自由に共有", "必要な範囲でのみ情報を扱い秘密を守る", "SNSに載せる", "誰にでも話す"], "a": 1,
             "e": "プライバシー保護=必要最小限の情報を適切に扱い秘密を守る(jaga rahasia). 尊厳の基本。"},
            {"q": "利用者主体の考え方として正しいのはどれか。",
             "opts": ["介護者中心", "本人の価値観・生活歴を尊重する", "効率優先", "画一的対応"], "a": 1,
             "e": "利用者主体=本人の価値観・生活歴・希望(nilai & riwayat hidup)を中心に据えたケア。"},
        ],
    },
    'Kaigo-Ujian-Ningen-Kankei.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 人間関係とコミュニケーション',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 人間関係とコミュニケーション '
                 '(Hubungan & Komunikasi): rapport, empati, mendengar aktif, '
                 'self-awareness, kerja tim. Soal dengan pembahasan dwibahasa.'),
        'vocab': [
            ["人間関係", "ningen kankei", "hubungan antarmanusia"],
            ["ラポール", "rapooru", "rapport (hubungan saling percaya)"],
            ["共感", "kyokan", "empati"],
            ["傾聴", "keicho", "mendengar aktif"],
            ["受容", "juyo", "penerimaan"],
            ["自己覚知", "jiko kakuchi", "kesadaran diri"],
            ["バイステック", "baisutikku", "Biestek (7 prinsip)"],
            ["非言語", "hi-gengo", "non-verbal"],
            ["共感的理解", "kyokanteki rikai", "pemahaman empatik"],
            ["チームワーク", "chiimuwaaku", "kerja tim"],
        ],
        'questions': [
            {"q": "「傾聴」の説明として正しいのはどれか。",
             "opts": ["自分の意見を述べる", "相手の話に耳を傾け受け止める", "話をさえぎる", "評価する"], "a": 1,
             "e": "傾聴=相手の話に関心を持って耳を傾け受け止める(mendengar dengan sungguh). 信頼関係の基礎。"},
            {"q": "「共感」の説明として正しいのはどれか。",
             "opts": ["同情する", "相手の気持ちを相手の立場で理解する", "評価する", "指導する"], "a": 1,
             "e": "共感(empati)=相手の立場に立って気持ちを理解する. 同情(哀れみ)とは異なる。"},
            {"q": "ラポールの説明として正しいのはどれか。",
             "opts": ["上下関係", "相互の信頼関係", "契約書", "命令系統"], "a": 1,
             "e": "ラポール=相互の信頼関係(hubungan saling percaya). 良好な援助関係の土台となる。"},
            {"q": "バイステックの7原則に含まれるのはどれか。",
             "opts": ["個別化", "画一化", "評価", "命令"], "a": 0,
             "e": "バイステックの原則=個別化・受容・非審判的態度・自己決定(individualisasi)など7つ。"},
            {"q": "自己覚知が援助者に必要な理由として正しいのはどれか。",
             "opts": ["自分の価値観の偏りに気づき援助に活かすため", "自慢するため", "評価を上げるため", "不要である"], "a": 0,
             "e": "自己覚知(kesadaran diri)=自分の感情・価値観の傾向を知り、援助に偏りが出ないようにする。"},
            {"q": "非言語コミュニケーションに含まれるのはどれか。",
             "opts": ["表情・視線・姿勢", "手紙の文章", "電子メール", "書類"], "a": 0,
             "e": "非言語=表情・視線・姿勢・声の調子(non-verbal). 言葉以上に気持ちを伝えることがある。"},
            {"q": "受容的な態度として適切なのはどれか。",
             "opts": ["相手を否定する", "ありのままを受け止める", "説教する", "急がせる"], "a": 1,
             "e": "受容=相手の感情や価値観をありのまま受け止める(menerima apa adanya). 批判・否定しない。"},
            {"q": "非審判的態度の説明として正しいのはどれか。",
             "opts": ["善悪を決めつけない", "厳しく評価する", "罰を与える", "指示する"], "a": 0,
             "e": "非審判的態度=善悪の判断で決めつけない(tidak menghakimi). 利用者が話しやすい関係を作る。"},
            {"q": "チームケアで重要なことはどれか。",
             "opts": ["情報を共有し役割を果たす", "自分だけで判断", "報告しない", "連携を避ける"], "a": 0,
             "e": "チームケア=情報共有・報連相(berbagi informasi)で各職種が役割を果たし利用者を支える。"},
            {"q": "利用者との会話で適切なのはどれか。",
             "opts": ["専門用語を多用", "分かりやすい言葉でゆっくり話す", "早口で話す", "一方的に話す"], "a": 1,
             "e": "分かりやすい言葉でゆっくり(pelan & jelas)、相手のペースに合わせる. 一方的にならない。"},
            {"q": "「開かれた質問(オープンクエスチョン)」の例はどれか。",
             "opts": ["はい/いいえで答える質問", "どのように感じましたか", "痛いですか", "食べましたか"], "a": 1,
             "e": "オープンクエスチョン=自由に答えられる質問(pertanyaan terbuka). 気持ちや状況を引き出せる。"},
            {"q": "報告・連絡・相談(報連相)が重要な理由はどれか。",
             "opts": ["事故防止と質の高いケアのため", "責任回避のため", "手間を増やすため", "不要である"], "a": 0,
             "e": "報連相=情報を的確に共有し事故防止・チーム連携(cegah kecelakaan)につなげる基本行動。"},
        ],
    },
    'Kaigo-Ujian-Comm-Gijutsu.html': {
        'title': 'Simulasi Ujian 介護福祉士 — コミュニケーション技術',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang コミュニケーション技術 '
                 '(Teknik Komunikasi): komunikasi dengan gangguan sensorik, afasia, '
                 'demensia, rekaman & pelaporan. Soal dengan pembahasan dwibahasa.'),
        'vocab': [
            ["コミュニケーション技術", "komyunikeeshon gijutsu", "teknik komunikasi"],
            ["失語症", "shitsugosho", "afasia"],
            ["構音障害", "kouon shogai", "gangguan artikulasi"],
            ["筆談", "hitsudan", "komunikasi tulis"],
            ["手話", "shuwa", "bahasa isyarat"],
            ["読話", "dokuwa", "membaca gerak bibir"],
            ["絵カード", "e-kaado", "kartu gambar"],
            ["記録", "kiroku", "rekaman/dokumentasi"],
            ["報告", "hokoku", "pelaporan"],
            ["受容と共感", "juyo to kyokan", "penerimaan & empati"],
        ],
        'questions': [
            {"q": "運動性失語(ブローカ失語)の人への対応として適切なのはどれか。",
             "opts": ["早口で質問する", "はい/いいえで答えられる質問や絵カードを使う", "無視する", "急がせる"], "a": 1,
             "e": "運動性失語=理解はできるが話しにくい. 閉じた質問・絵カード(kartu gambar)で意思疎通を補う。"},
            {"q": "難聴のある人とのコミュニケーションで適切なのはどれか。",
             "opts": ["後ろから話す", "正面から口を見せ、ゆっくり話す", "早口で話す", "小声で話す"], "a": 1,
             "e": "正面から口の動き(gerak bibir)を見せ、明瞭にゆっくり. 筆談や補聴器の活用も有効。"},
            {"q": "視覚障害のある人への情報伝達として適切なのはどれか。",
             "opts": ["指さしで示す", "言葉で具体的に説明する", "うなずく", "表情で伝える"], "a": 1,
             "e": "視覚障害では言葉で具体的に(deskripsi verbal)説明. 「あちら」ではなく方向・距離を明確に。"},
            {"q": "構音障害のある人への対応として適切でないのはどれか。",
             "opts": ["ゆっくり聞く", "分からないふりをして流す", "筆談を活用", "根気よく確認"], "a": 1,
             "e": "分からないまま流すのは不適切. 分かるまで確認・筆談(komunikasi tulis)で正確に理解する。"},
            {"q": "認知症の人とのコミュニケーションで適切なのはどれか。",
             "opts": ["否定・訂正を繰り返す", "安心できる態度で受容的に接する", "急がせる", "叱る"], "a": 1,
             "e": "認知症では否定せず受容的(menerima)に. 安心感を与え、短く分かりやすく伝える。"},
            {"q": "介護記録を書く際に適切なのはどれか。",
             "opts": ["主観的な決めつけを書く", "客観的事実を正確に記録する", "曖昧に書く", "後でまとめて記憶で書く"], "a": 1,
             "e": "記録は客観的事実(fakta objektif)を正確に. 推測や決めつけを避け、5W1Hで具体的に書く。"},
            {"q": "報告(ほうこく)で最も重要なことはどれか。",
             "opts": ["結論を後回しにする", "事実を正確・簡潔にタイムリーに伝える", "省略する", "感想中心に話す"], "a": 1,
             "e": "報告は事実を正確・簡潔・迅速(tepat & cepat)に. 緊急度の高い情報は優先して伝える。"},
            {"q": "絵カードやジェスチャーが有効なのはどのような場合か。",
             "opts": ["言語での意思疎通が難しい場合", "健康な成人のみ", "使ってはいけない", "記録のため"], "a": 0,
             "e": "言語が難しい失語・認知症等では絵カード・身振り(gambar & gestur)で意思疎通を補う。"},
            {"q": "利用者が興奮しているときの対応として適切なのはどれか。",
             "opts": ["大声で制止する", "落ち着いた声で気持ちを受け止める", "無視する", "力で抑える"], "a": 1,
             "e": "落ち着いた声・態度で感情を受け止める(menerima emosi). 興奮の背景を探り安心を促す。"},
            {"q": "秘密保持の観点から記録の取り扱いとして適切なのはどれか。",
             "opts": ["誰でも見られる場所に置く", "施錠管理し関係者のみ閲覧", "SNSで共有", "自宅に持ち帰る"], "a": 1,
             "e": "記録は個人情報. 施錠管理し関係者のみが適切に扱う(kelola aman). 守秘義務を徹底する。"},
            {"q": "家族とのコミュニケーションで適切なのはどれか。",
             "opts": ["専門用語で説明", "分かりやすく状況を伝え不安に配慮する", "情報を与えない", "一方的に指示"], "a": 1,
             "e": "家族へは分かりやすく状況を伝え、不安(kekhawatiran)に寄り添う. 家族も支援対象と捉える。"},
            {"q": "「閉じられた質問(クローズドクエスチョン)」が有効な場面はどれか。",
             "opts": ["自由に語ってほしいとき", "はい/いいえで確認したいとき", "感情を引き出すとき", "雑談のとき"], "a": 1,
             "e": "クローズドクエスチョン=事実確認・意思確認(konfirmasi)に有効. 失語や疲労時にも答えやすい。"},
        ],
    },
    'Kaigo-Ujian-Kaigo-Katei.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 介護過程',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 介護過程 '
                 '(Proses Perawatan): asesmen, perencanaan, implementasi, evaluasi, '
                 'ICF, kolaborasi. Soal dengan pembahasan dwibahasa.'),
        'vocab': [
            ["介護過程", "kaigo katei", "proses perawatan"],
            ["アセスメント", "asesumento", "asesmen (pengkajian)"],
            ["ニーズ", "niizu", "kebutuhan"],
            ["介護計画", "kaigo keikaku", "rencana perawatan"],
            ["目標設定", "mokuhyo settei", "penetapan tujuan"],
            ["実施", "jisshi", "implementasi"],
            ["評価", "hyoka", "evaluasi"],
            ["モニタリング", "monitaringu", "pemantauan"],
            ["PDCA", "pii dii shii ee", "siklus PDCA"],
            ["根拠", "konkyo", "dasar/rasional"],
        ],
        'questions': [
            {"q": "介護過程の正しい展開順序はどれか。",
             "opts": ["計画→評価→実施→アセスメント", "アセスメント→計画→実施→評価", "実施→計画→評価", "評価→実施→計画"], "a": 1,
             "e": "介護過程=アセスメント→計画→実施→評価(kaji→rencana→laksana→evaluasi)のPDCAで展開。"},
            {"q": "アセスメントの説明として正しいのはどれか。",
             "opts": ["感想を述べる", "情報収集・分析し課題(ニーズ)を明らかにする", "計画を実施する", "評価する"], "a": 1,
             "e": "アセスメント=情報収集・分析(pengkajian)し、利用者の生活課題・ニーズを明確にする段階。"},
            {"q": "介護計画の目標設定で適切なのはどれか。",
             "opts": ["介護者の都合で決める", "本人の意向を反映し具体的・実現可能に設定", "曖昧にする", "他人と同じにする"], "a": 1,
             "e": "目標は本人の意向を反映し、具体的・測定可能・実現可能(SMART/realistis)に設定する。"},
            {"q": "介護計画に「根拠」が必要な理由として正しいのはどれか。",
             "opts": ["形式のため", "なぜその支援を行うか説明でき質が高まるため", "記録を増やすため", "不要である"], "a": 1,
             "e": "根拠(dasar/rasional)を明確にすることで、支援の一貫性・質が高まり多職種で共有できる。"},
            {"q": "モニタリングの説明として正しいのはどれか。",
             "opts": ["計画作成", "実施状況と利用者の変化を継続的に確認する", "初回面接", "契約"], "a": 1,
             "e": "モニタリング=計画実施中の状況・変化を継続的に確認(pemantauan). 必要に応じ計画を修正。"},
            {"q": "評価の段階で行うこととして適切なのはどれか。",
             "opts": ["目標の達成度を確認し計画を見直す", "情報収集のみ", "契約する", "何もしない"], "a": 0,
             "e": "評価=目標の達成度(pencapaian)を確認し、次の計画に反映する. PDCAを循環させる。"},
            {"q": "ICFの視点を介護過程に活かす意義として正しいのはどれか。",
             "opts": ["できないことだけ見る", "生活機能と環境を含め全体を捉える", "病名で判断", "年齢で区別"], "a": 1,
             "e": "ICF=心身機能・活動・参加・環境(fungsi & lingkungan)を総合的に捉え、強みも活かす。"},
            {"q": "介護過程における「個別ケア」の考え方として正しいのはどれか。",
             "opts": ["全員同じ計画", "一人ひとりの状態・意向に合わせる", "効率優先", "家族の希望のみ"], "a": 1,
             "e": "個別ケア=利用者一人ひとりの状態・価値観・意向(kebutuhan individu)に合わせて計画する。"},
            {"q": "情報収集で「主観的情報」に当たるのはどれか。",
             "opts": ["血圧の数値", "本人が語る痛みやつらさ", "体温", "検査データ"], "a": 1,
             "e": "主観的情報=本人が語る訴え・気持ち(informasi subjektif). 客観的情報(数値等)と両方集める。"},
            {"q": "介護計画を多職種で共有する意義として正しいのはどれか。",
             "opts": ["責任回避", "一貫した支援と連携のため", "記録削減", "不要である"], "a": 1,
             "e": "計画共有で職種間の一貫した支援・連携(kolaborasi)が可能になり、ケアの質が向上する。"},
            {"q": "利用者の状態が変化したときの適切な対応はどれか。",
             "opts": ["計画を変えない", "再アセスメントし計画を見直す", "放置する", "評価しない"], "a": 1,
             "e": "状態変化時は再アセスメント(kaji ulang)し計画を修正. PDCAを循環させ最適なケアを保つ。"},
            {"q": "介護過程の目的として最も適切なのはどれか。",
             "opts": ["記録を残すこと", "根拠に基づき利用者の自立と QOL向上を支えること", "作業の効率化のみ", "職員評価"], "a": 1,
             "e": "介護過程の目的=根拠に基づく個別支援で利用者の自立・QOL向上(kualitas hidup)を実現すること。"},
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
               f'<title>{spec["title"]} | Nihonggo Pro Academy</title>', c, count=1)
    c = re.sub(r'(<meta name="description" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['desc'] + m.group(2), c, count=1)
    c = c.replace('Kaigo-Ujian-N2.html', slug)
    c = re.sub(r'(<meta property="og:title" content=")[^"]*(">)',
               lambda m: m.group(1) + spec['title'] + ' — Nihonggo Pro Academy' + m.group(2),
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
