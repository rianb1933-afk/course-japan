#!/usr/bin/env python3
"""
Bangun beberapa modul simulasi ujian 介護福祉士 baru dari template.

Melengkapi 領域 (bidang) ujian nasional yang belum punya modul simulasi:
- 認知症の理解     (Pemahaman Demensia)      → Kaigo-Ujian-Ninchisho
- 医療的ケア        (Perawatan Medis)          → Kaigo-Ujian-Iryo-Care
- 社会の理解        (Pemahaman Sosial/Sistem)  → Kaigo-Ujian-Shakai

Setiap modul: kosakata inti + bank soal gaya ujian nasional dengan
pembahasan dwibahasa (Jepang + Indonesia).

    python3 scripts/build_kaigo_exam_modules.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'Materi', 'Kaigo-Ujian-N2.html')

MODULES = {
    'Kaigo-Ujian-Ninchisho.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 認知症の理解',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 認知症の理解 '
                 '(Pemahaman Demensia): jenis demensia, gejala BPSD, pendekatan '
                 'person-centred, dan dukungan keluarga. Soal simulasi dengan '
                 'pembahasan dwibahasa.'),
        'vocab': [
            ["認知症", "ninchisho", "demensia"],
            ["中核症状", "chukaku shojo", "gejala inti"],
            ["周辺症状", "shuhen shojo", "gejala perilaku (BPSD)"],
            ["見当識障害", "kentoshiki shogai", "disorientasi"],
            ["徘徊", "haikai", "mengembara (wandering)"],
            ["アルツハイマー型", "aruzuhaimaa-gata", "tipe Alzheimer"],
            ["レビー小体型", "rebii shotai-gata", "tipe Lewy body"],
            ["パーソンセンタードケア", "paason sentaado kea", "perawatan berpusat pada orang"],
            ["回想法", "kaisoho", "terapi reminisensi"],
            ["ユマニチュード", "yumanichuudo", "Humanitude (metode komunikasi)"],
        ],
        'questions': [
            {"q": "認知症の中核症状に該当するのはどれか。",
             "opts": ["記憶障害", "抑うつ", "徘徊", "睡眠障害"], "a": 0,
             "e": "中核症状=脳の細胞障害による症状(記憶障害・見当識障害など). 抑うつ・徘徊はBPSD(周辺症状)。"},
            {"q": "アルツハイマー型認知症の特徴として正しいのはどれか。",
             "opts": ["急激に発症する", "ゆるやかに進行する", "運動麻痺が主症状", "幻視が中心"], "a": 1,
             "e": "アルツハイマー型はゆるやかに進行(progresif lambat). 幻視が中心なのはレビー小体型。"},
            {"q": "レビー小体型認知症に特徴的な症状はどれか。",
             "opts": ["繰り返す幻視", "多幸感", "失語のみ", "けいれん"], "a": 0,
             "e": "レビー小体型=リアルな幻視(halusinasi visual)・パーキンソン症状・症状の変動が特徴。"},
            {"q": "血管性認知症の説明として正しいのはどれか。",
             "opts": ["原因不明", "脳梗塞・脳出血が原因", "感染症が原因", "遺伝のみ"], "a": 1,
             "e": "血管性認知症は脳梗塞・脳出血(stroke)が原因. まだら認知症・段階的悪化が特徴。"},
            {"q": "BPSD(認知症の行動・心理症状)に含まれるのはどれか。",
             "opts": ["記憶障害", "見当識障害", "暴言・興奮", "計算障害"], "a": 2,
             "e": "BPSD=周辺症状(暴言・興奮・徘徊・不安など). 環境やケアの工夫で軽減できる。"},
            {"q": "パーソンセンタードケアの考え方として正しいのはどれか。",
             "opts": ["効率を最優先", "その人らしさと尊厳を中心に据える", "全員同じ対応", "身体拘束を活用"], "a": 1,
             "e": "パーソンセンタードケア=本人を中心に、その人らしさ・尊厳(martabat)を尊重するケア。"},
            {"q": "認知症の人への声かけとして適切なのはどれか。",
             "opts": ["後ろから急に触れる", "正面から目線を合わせ穏やかに話す", "早口で指示する", "複数人で同時に話す"], "a": 1,
             "e": "正面から目線を合わせ、穏やかに一つずつ(pelan & satu per satu)伝える。驚かせない。"},
            {"q": "回想法の目的として正しいのはどれか。",
             "opts": ["過去の記憶を刺激し心の安定を図る", "計算力を鍛える", "身体を鍛える", "薬を減らす"], "a": 0,
             "e": "回想法(terapi reminisensi)は昔の思い出を語り合い、情緒の安定・自己肯定感を高める。"},
            {"q": "徘徊のある利用者への対応として適切でないのはどれか。",
             "opts": ["安全な環境を整える", "行動の背景を考える", "身体拘束で動けなくする", "気持ちに寄り添う"], "a": 2,
             "e": "身体拘束(pengekangan fisik)は原則禁止. 徘徊には理由があり、背景を理解し安全確保を優先。"},
            {"q": "認知症の人の家族介護者への支援として適切なのはどれか。",
             "opts": ["介護を全て任せる", "レスパイトケアを紹介する", "情報を与えない", "孤立させる"], "a": 1,
             "e": "レスパイトケア(perawatan jeda)で家族の負担を軽減. 家族も支援対象と捉える。"},
            {"q": "認知症の早期発見が重要な理由として正しいのはどれか。",
             "opts": ["治療・進行遅延の機会を得られる", "施設入所を早める", "薬を増やす", "運転を続けられる"], "a": 0,
             "e": "早期発見で治療可能な原因の除外・進行遅延・生活調整(penyesuaian hidup)が可能になる。"},
            {"q": "せん妄と認知症の違いとして正しいのはどれか。",
             "opts": ["せん妄は急激で可逆的なことが多い", "せん妄は治らない", "認知症は数時間で治る", "両者は同じ"], "a": 0,
             "e": "せん妄(delirium)は急激発症・意識障害を伴い可逆的なことが多い。認知症は緩徐・慢性。"},
            {"q": "ユマニチュードの4つの柱に含まれるのはどれか。",
             "opts": ["見る・話す・触れる・立つ", "叱る", "急がせる", "拘束する"], "a": 0,
             "e": "ユマニチュード=「見る・話す・触れる・立つ」を柱にしたケア技法(teknik komunikasi)。"},
            {"q": "認知症の人が食事を拒否するときの対応として適切なのはどれか。",
             "opts": ["無理やり食べさせる", "理由を探り環境や声かけを工夫する", "放置する", "叱る"], "a": 1,
             "e": "拒否には理由(体調・不安・環境). 原因を探り、雰囲気や声かけを工夫(penyesuaian)する。"},
            {"q": "認知症ケアで身体拘束が例外的に許されるのはどのような場合か。",
             "opts": ["職員が忙しいとき", "切迫性・非代替性・一時性の3要件を満たすとき", "家族が希望したとき", "夜間はいつでも"], "a": 1,
             "e": "身体拘束は切迫性・非代替性・一時性(3要件)を全て満たす緊急時のみ。原則は禁止。"},
        ],
    },
    'Kaigo-Ujian-Iryo-Care.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 医療的ケア',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 医療的ケア '
                 '(Perawatan Medis):痰の吸引 (penyedotan dahak), 経管栄養 '
                 '(nutrisi enteral), tanda vital, dan keselamatan. Soal simulasi '
                 'dengan pembahasan dwibahasa.'),
        'vocab': [
            ["医療的ケア", "iryoteki kea", "perawatan medis"],
            ["喀痰吸引", "kakutan kyuin", "penyedotan dahak"],
            ["経管栄養", "keikan eiyo", "nutrisi enteral (lewat selang)"],
            ["胃ろう", "iro", "gastrostomi (PEG)"],
            ["バイタルサイン", "baitaru sain", "tanda vital"],
            ["誤嚥", "goen", "aspirasi (salah menelan)"],
            ["感染予防", "kansen yobo", "pencegahan infeksi"],
            ["清潔操作", "seiketsu sosa", "prosedur aseptik"],
            ["パルスオキシメーター", "parusu okishimeetaa", "pulse oximeter"],
            ["急変", "kyuhen", "perubahan kondisi mendadak"],
        ],
        'questions': [
            {"q": "介護福祉士が実施できる医療的ケアはどれか。",
             "opts": ["注射", "喀痰吸引と経管栄養", "投薬の処方", "採血"], "a": 1,
             "e": "研修を修了した介護福祉士は喀痰吸引・経管栄養が可能(dengan pelatihan). 注射・処方は不可。"},
            {"q": "喀痰吸引で吸引時間の目安として適切なのはどれか。",
             "opts": ["1回30秒以内", "1回3分", "制限なし", "5分以上"], "a": 0,
             "e": "1回の吸引は10〜15秒、長くても30秒以内. 長すぎると低酸素(hipoksia)を招く。"},
            {"q": "経管栄養の注入前に確認すべきことはどれか。",
             "opts": ["室温", "チューブの位置と本人の状態", "天気", "職員数"], "a": 1,
             "e": "注入前にチューブ位置・本人の体調・体位(posisi)を確認. 誤注入・逆流を防ぐ。"},
            {"q": "経管栄養時の望ましい体位はどれか。",
             "opts": ["仰臥位(平ら)", "上半身を30〜60度挙上", "うつ伏せ", "左側臥位のみ"], "a": 1,
             "e": "上半身を30〜60度挙上(posisi setengah duduk)し逆流・誤嚥を防ぐ。注入後もしばらく保持。"},
            {"q": "成人の正常な体温の範囲として最も適切なのはどれか。",
             "opts": ["34〜35℃", "36〜37℃台", "38〜39℃", "40℃以上"], "a": 1,
             "e": "平熱はおよそ36〜37℃台. 38℃以上は発熱として観察・報告(lapor)が必要。"},
            {"q": "パルスオキシメーターで測定するのはどれか。",
             "opts": ["血圧", "経皮的動脈血酸素飽和度(SpO2)", "血糖", "体温"], "a": 1,
             "e": "SpO2(saturasi oksigen)を測定. 一般に95%以上が目安、低下時は要注意。"},
            {"q": "吸引で感染を防ぐために重要なのはどれか。",
             "opts": ["素手で行う", "清潔操作と手指衛生", "使い回しのカテーテル", "換気しない"], "a": 1,
             "e": "清潔操作(prosedur aseptik)・手指衛生・カテーテル管理で感染予防(pencegahan infeksi)。"},
            {"q": "経管栄養中に嘔吐した場合、まず行うべき対応はどれか。",
             "opts": ["注入を続ける", "注入を止め顔を横に向け誤嚥を防ぐ", "水を飲ませる", "放置する"], "a": 1,
             "e": "直ちに注入中止・顔を横向き(cegah aspirasi)にし、看護師へ報告。誤嚥性肺炎を防ぐ。"},
            {"q": "喀痰吸引後に観察すべき項目として適切なのはどれか。",
             "opts": ["痰の性状・量・呼吸状態", "室温のみ", "体重", "髪型"], "a": 0,
             "e": "吸引後は痰の色・量・粘り、呼吸・顔色・SpO2(kondisi napas)を観察・記録する。"},
            {"q": "医療的ケアの実施記録として適切なのはどれか。",
             "opts": ["記録は不要", "実施内容・時刻・状態を正確に記録", "記憶に頼る", "後でまとめて曖昧に書く"], "a": 1,
             "e": "実施内容・時刻・利用者の状態を正確に記録(dokumentasi akurat). 事故時の根拠にもなる。"},
            {"q": "利用者の急変時に介護福祉士がとるべき対応はどれか。",
             "opts": ["自分で診断し投薬", "看護師・医師へ速やかに報告し指示を仰ぐ", "様子を見て放置", "家族の帰りを待つ"], "a": 1,
             "e": "急変(kondisi mendadak)時は速やかに医療職へ報告・連携. 介護福祉士は診断・投薬はしない。"},
            {"q": "胃ろうの説明として正しいのはどれか。",
             "opts": ["鼻から入れる管", "腹壁から胃へ造設した栄養ルート", "点滴", "血管ルート"], "a": 1,
             "e": "胃ろう(PEG/gastrostomi)は腹壁から胃に造設した栄養投与ルート. 皮膚の観察が重要。"},
        ],
    },
    'Kaigo-Ujian-Shakai.html': {
        'title': 'Simulasi Ujian 介護福祉士 — 社会の理解',
        'desc': ('Latihan soal ujian nasional 介護福祉士 bidang 社会の理解 '
                 '(Pemahaman Sosial): 介護保険制度 (asuransi perawatan), '
                 '障害者総合支援, dan sistem jaminan sosial Jepang. Soal simulasi '
                 'dengan pembahasan dwibahasa.'),
        'vocab': [
            ["社会保障", "shakai hosho", "jaminan sosial"],
            ["介護保険", "kaigo hoken", "asuransi perawatan"],
            ["要介護認定", "yokaigo nintei", "sertifikasi tingkat perawatan"],
            ["ケアマネジャー", "kea maneejaa", "care manager"],
            ["ケアプラン", "kea puran", "rencana perawatan"],
            ["地域包括支援センター", "chiiki hokatsu shien sentaa", "pusat dukungan komprehensif wilayah"],
            ["障害者総合支援法", "shogaisha sogo shien-ho", "UU dukungan menyeluruh disabilitas"],
            ["自己負担", "jiko futan", "biaya mandiri (co-payment)"],
            ["保険者", "hokensha", "penyelenggara asuransi"],
            ["被保険者", "hihokensha", "peserta asuransi"],
        ],
        'questions': [
            {"q": "日本の介護保険制度の保険者はどれか。",
             "opts": ["国", "市町村", "都道府県", "民間企業"], "a": 1,
             "e": "介護保険の保険者は市町村(pemerintah kota/desa). 制度運営の主体となる。"},
            {"q": "介護保険の第1号被保険者の年齢はどれか。",
             "opts": ["40歳以上", "65歳以上", "20歳以上", "75歳以上"], "a": 1,
             "e": "第1号被保険者は65歳以上. 第2号は40〜64歳(特定疾病の場合に給付)。"},
            {"q": "要介護認定を申請する窓口はどれか。",
             "opts": ["市町村", "税務署", "警察署", "病院の受付"], "a": 0,
             "e": "要介護認定(sertifikasi perawatan)は市町村に申請. 訪問調査と審査会で判定される。"},
            {"q": "ケアプランを作成する専門職はどれか。",
             "opts": ["医師", "介護支援専門員(ケアマネジャー)", "薬剤師", "栄養士"], "a": 1,
             "e": "ケアプラン(rencana perawatan)はケアマネジャー(介護支援専門員)が作成する。"},
            {"q": "介護保険サービス利用時の原則的な自己負担割合はどれか。",
             "opts": ["原則1〜3割", "全額自己負担", "負担なし", "5割"], "a": 0,
             "e": "利用者負担は原則1割、所得により2〜3割(co-payment). 残りは保険給付。"},
            {"q": "地域包括支援センターの役割として正しいのはどれか。",
             "opts": ["高齢者の総合相談・支援", "手術を行う", "年金を支給する", "税を徴収する"], "a": 0,
             "e": "地域包括支援センターは高齢者の総合相談・権利擁護・介護予防(dukungan wilayah)を担う。"},
            {"q": "障害者総合支援法に基づくサービスの説明として正しいのはどれか。",
             "opts": ["高齢者のみ対象", "障害者の自立と社会参加を支援", "医療保険の一部", "任意加入"], "a": 1,
             "e": "障害者総合支援法は障害者の自立・社会参加(partisipasi sosial)を支援する制度。"},
            {"q": "社会保険に含まれないのはどれか。",
             "opts": ["医療保険", "年金保険", "介護保険", "生命保険(民間)"], "a": 3,
             "e": "社会保険=医療・年金・介護・雇用・労災. 民間の生命保険は含まれない(bukan jaminan sosial)。"},
            {"q": "介護予防の目的として正しいのはどれか。",
             "opts": ["要介護状態の予防・改善", "施設入所を促す", "医療費を増やす", "外出を制限する"], "a": 0,
             "e": "介護予防は要介護状態になることの予防・悪化防止(pencegahan). 自立支援につながる。"},
            {"q": "成年後見制度の目的として正しいのはどれか。",
             "opts": ["判断能力が不十分な人の権利を守る", "財産を国が管理する", "介護を無料にする", "年金を増やす"], "a": 0,
             "e": "成年後見制度は認知症等で判断能力が不十分な人の財産・権利を保護(perlindungan hak)する。"},
            {"q": "生活保護制度の説明として正しいのはどれか。",
             "opts": ["富裕層向け", "最低限度の生活を保障する", "任意加入の保険", "高齢者限定"], "a": 1,
             "e": "生活保護は憲法25条に基づき最低限度の生活(kehidupan minimum)を保障する公的扶助。"},
            {"q": "介護保険で要支援・要介護は何段階に区分されるか。",
             "opts": ["要支援1〜2・要介護1〜5の7段階", "3段階", "10段階", "区分なし"], "a": 0,
             "e": "要支援1・2と要介護1〜5の計7区分(7 tingkat). 数字が大きいほど必要な介護量が多い。"},
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
