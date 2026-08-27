#!/usr/bin/env python3
"""
Bangun modul Kaigo baru dari template Kaigo-Ujian-N2.html.

Meng-clone kerangka (head, navbar, script src, progress hook) lalu mengganti:
- <title>, description, canonical, OG
- heading & intro
- PH_VOCAB (kosakata inti bidang)
- Q (bank soal simulasi ujian)

Modul baru: Kaigo-Ujian-Kokoro-Karada.html
Bidang: こころとからだのしくみ (Struktur Jiwa & Tubuh) — domain inti ujian
nasional 介護福祉士 dengan bobot soal terbesar.
"""
import re
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'Materi', 'Kaigo-Ujian-N2.html')
OUT = os.path.join(ROOT, 'Materi', 'Kaigo-Ujian-Kokoro-Karada.html')

NEW_TITLE = 'Simulasi Ujian 介護福祉士 — こころとからだのしくみ'
NEW_DESC = ('Latihan soal ujian nasional 介護福祉士 bidang こころとからだのしくみ '
            '(Struktur Jiwa & Tubuh): psikologi, sistem tubuh, penyakit lansia, '
            'dan penuaan. 20 soal simulasi dengan pembahasan dwibahasa.')
NEW_SLUG = 'Kaigo-Ujian-Kokoro-Karada.html'

# Kosakata inti bidang (jepang, romaji, arti Indonesia)
VOCAB = [
    ["こころとからだのしくみ", "kokoro to karada no shikumi", "struktur jiwa & tubuh"],
    ["尊厳", "songen", "martabat"],
    ["自己実現", "jiko jitsugen", "aktualisasi diri"],
    ["記憶", "kioku", "ingatan"],
    ["加齢", "karei", "penuaan"],
    ["恒常性", "kojosei", "homeostasis"],
    ["関節可動域", "kansetsu kadoiki", "rentang gerak sendi"],
    ["嚥下", "enge", "menelan"],
    ["褥瘡", "jokuso", "luka tekan (dekubitus)"],
    ["脱水", "dassui", "dehidrasi"],
]

# Bank soal — bidang こころとからだのしくみ, gaya ujian nasional 介護福祉士.
# Format: pertanyaan Jepang, 4 opsi, index jawaban benar, penjelasan dwibahasa.
QUESTIONS = [
    {
        "q": "マズローの欲求階層で最も高次の欲求はどれか。",
        "opts": ["生理的欲求", "安全の欲求", "承認の欲求", "自己実現の欲求"],
        "a": 3,
        "e": "自己実現の欲求(aktualisasi diri)が最高次。介護では利用者の尊厳と自己実現を支えることが基本。"
    },
    {
        "q": "加齢に伴う身体変化として正しいのはどれか。",
        "opts": ["皮膚の弾力が増す", "唾液分泌が増える", "予備力が低下する", "骨密度が上がる"],
        "a": 2,
        "e": "加齢では予備力(cadangan fungsi)が低下し、回復に時間がかかる。皮膚弾力・唾液・骨密度はいずれも低下する。"
    },
    {
        "q": "恒常性(ホメオスタシス)の説明として正しいのはどれか。",
        "opts": ["体内環境を一定に保つしくみ", "老化を早めるしくみ", "免疫を無くすしくみ", "記憶を消すしくみ"],
        "a": 0,
        "e": "恒常性=homeostasis。体温・血糖・水分などの体内環境を一定範囲に保つ働き。加齢で調整能力が低下する。"
    },
    {
        "q": "短期記憶に関する説明で正しいのはどれか。",
        "opts": ["数十年前の記憶", "数秒〜数分保持される記憶", "生まれつきの記憶", "永久に消えない記憶"],
        "a": 1,
        "e": "短期記憶(memori jangka pendek)は数秒〜数分。加齢や認知症でまず短期記憶が障害されやすい。"
    },
    {
        "q": "嚥下のプロセスで、食塊が咽頭を通過する時期はどれか。",
        "opts": ["先行期", "準備期", "咽頭期", "食道期"],
        "a": 2,
        "e": "咽頭期(fase faring)で食塊が咽頭を通過。この時期に誤嚥が起こりやすく、観察が重要。"
    },
    {
        "q": "褥瘡が最もできやすい部位はどれか。",
        "opts": ["手のひら", "仙骨部", "額", "前腕"],
        "a": 1,
        "e": "仙骨部(daerah sakrum)は骨突出があり体圧が集中するため褥瘡好発部位。体位変換で予防する。"
    },
    {
        "q": "高齢者の脱水が起こりやすい理由として正しいのはどれか。",
        "opts": ["体内水分量が増える", "口渇感が鈍くなる", "腎機能が高まる", "発汗が増える"],
        "a": 1,
        "e": "加齢で口渇感(rasa haus)が鈍くなり水分摂取が減る。体内水分量も減少するため脱水リスクが高い。"
    },
    {
        "q": "関節可動域(ROM)訓練の目的として正しいのはどれか。",
        "opts": ["筋肉を減らす", "拘縮を予防する", "体温を上げる", "血圧を下げる"],
        "a": 1,
        "e": "ROM訓練は拘縮(kontraktur/kekakuan sendi)の予防が目的。動かさないと関節が固まるため定期的に行う。"
    },
    {
        "q": "パーキンソン病の代表的な症状として正しいのはどれか。",
        "opts": ["振戦・筋固縮・無動", "多幸感", "多弁", "食欲増進"],
        "a": 0,
        "e": "パーキンソン病:振戦(tremor)・筋固縮(kekakuan)・無動(bradikinesia)が三大症状。転倒に注意。"
    },
    {
        "q": "認知症の中核症状に当てはまるのはどれか。",
        "opts": ["記憶障害", "徘徊", "興奮", "抑うつ"],
        "a": 0,
        "e": "中核症状=記憶障害・見当識障害など脳機能低下による症状。徘徊・興奮・抑うつはBPSD(周辺症状)。"
    },
    {
        "q": "廃用症候群の説明として正しいのはどれか。",
        "opts": ["使いすぎによる障害", "安静・不活動により心身機能が低下する状態", "感染症の一種", "薬の副作用"],
        "a": 1,
        "e": "廃用症候群(sindrom disuse)=過度の安静・不活動で筋力低下・関節拘縮などが生じる。早期離床が重要。"
    },
    {
        "q": "睡眠に関する加齢変化として正しいのはどれか。",
        "opts": ["深い睡眠が増える", "中途覚醒が増える", "睡眠時間が長くなる", "夢を見なくなる"],
        "a": 1,
        "e": "加齢では中途覚醒(terbangun tengah malam)が増え、深い睡眠が減る。日中の活動や光で調整を支援する。"
    },
    {
        "q": "誤嚥性肺炎の予防として最も適切なのはどれか。",
        "opts": ["食後すぐ臥床させる", "口腔ケアを行う", "水分を制限する", "早口で話しかける"],
        "a": 1,
        "e": "口腔ケア(perawatan mulut)で細菌を減らし誤嚥性肺炎を予防。食後は座位保持、適切なとろみも有効。"
    },
    {
        "q": "老年期のうつに関する説明で正しいのはどれか。",
        "opts": ["必ず自覚がある", "身体症状として現れることがある", "認知症と無関係", "治療不要"],
        "a": 1,
        "e": "高齢者のうつは食欲不振・不眠など身体症状(gejala fisik)で現れやすく、認知症との鑑別が必要。"
    },
    {
        "q": "皮膚の乾燥(ドライスキン)への対応として適切なのはどれか。",
        "opts": ["熱いお湯で長く洗う", "保湿剤を塗布する", "強くこすって洗う", "水分を控える"],
        "a": 1,
        "e": "高齢者は皮脂が減り乾燥しやすい。保湿剤(pelembap)を使い、こすらず優しく洗う。褥瘡予防にもつながる。"
    },
    {
        "q": "体位変換の主な目的として正しいのはどれか。",
        "opts": ["体重を増やす", "褥瘡と関節拘縮を予防する", "体温を下げる", "食欲を増す"],
        "a": 1,
        "e": "体位変換(perubahan posisi)は同一部位への圧迫を避け褥瘡を防ぎ、拘縮予防にもなる。原則2時間ごと。"
    },
    {
        "q": "難聴のある高齢者とのコミュニケーションで適切なのはどれか。",
        "opts": ["後ろから大声で話す", "正面から口を見せてゆっくり話す", "早口で話す", "筆談は避ける"],
        "a": 1,
        "e": "正面から表情と口の動きを見せ、ゆっくり明瞭に話す。必要に応じ筆談も活用する。"
    },
    {
        "q": "血圧が急に下がる起立性低血圧で注意すべき場面はどれか。",
        "opts": ["食事中", "立ち上がり動作時", "就寝中", "会話中"],
        "a": 1,
        "e": "起立性低血圧(hipotensi ortostatik)は立ち上がり時にめまい・転倒を起こしやすい。ゆっくり動作を促す。"
    },
    {
        "q": "終末期ケアにおいて最も尊重すべきことはどれか。",
        "opts": ["延命を最優先する", "本人の意思と尊厳", "家族の都合のみ", "施設の効率"],
        "a": 1,
        "e": "終末期(fase akhir kehidupan)では本人の意思と尊厳(martabat)を尊重。ACPで事前に希望を確認しておく。"
    },
    {
        "q": "フレイル(虚弱)の説明として正しいのはどれか。",
        "opts": ["回復不可能な状態", "適切な介入で改善しうる虚弱状態", "感染症の名称", "薬の名前"],
        "a": 1,
        "e": "フレイル=健康と要介護の中間。運動・栄養など適切な介入(intervensi)で改善が期待できる可逆的状態。"
    },
]


def js_array_vocab(vocab):
    items = ', '.join(
        '[' + ', '.join('"' + x.replace('"', '\\"') + '"' for x in v) + ']'
        for v in vocab
    )
    return '[' + items + ']'


def js_array_questions(qs):
    import json
    return json.dumps(qs, ensure_ascii=False)


def main():
    c = open(TEMPLATE, encoding='utf-8').read()

    # 1. Title
    c = re.sub(r'<title>.*?</title>',
               f'<title>{NEW_TITLE} | Nihonggo Pro Academy</title>', c, count=1)
    # 2. Description
    c = re.sub(r'(<meta name="description" content=")[^"]*(">)',
               lambda m: m.group(1) + NEW_DESC + m.group(2), c, count=1)
    # 3. Canonical + OG url + og:title + og image tetap
    c = c.replace('Kaigo-Ujian-N2.html', NEW_SLUG)
    c = re.sub(r'(<meta property="og:title" content=")[^"]*(">)',
               lambda m: m.group(1) + NEW_TITLE + ' — Nihonggo Pro Academy' + m.group(2),
               c, count=1)

    # 4. Ganti PH_VOCAB
    c = re.sub(r'PH_VOCAB=\[.*?\];',
               'PH_VOCAB=' + js_array_vocab(VOCAB) + ';', c, count=1, flags=re.DOTALL)

    # 5. Ganti bank soal var Q=[...]
    c = re.sub(r'var Q=\[.*?\];',
               'var Q=' + js_array_questions(QUESTIONS) + ';', c, count=1, flags=re.DOTALL)

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"✅ Modul baru dibuat: {os.path.relpath(OUT, ROOT)}")
    print(f"   {len(QUESTIONS)} soal, {len(VOCAB)} kosakata inti")


if __name__ == '__main__':
    main()
