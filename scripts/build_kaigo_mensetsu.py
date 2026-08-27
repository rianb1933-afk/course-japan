#!/usr/bin/env python3
"""
Modul 介護 面接対策 (Interview Preparation) — celah nyata untuk kandidat
EPA / Tokutei Ginou. Tidak ada modul dedicated面接 sebelumnya (hanya sebutan
di 4 file). Format: kosakata inti + bank soal latihan (pertanyaan wawancara
dengan jawaban model & penjelasan dwibahasa).

    python3 scripts/build_kaigo_mensetsu.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'Materi', 'Kaigo-Ujian-N2.html')
SLUG = 'Kaigo-Mensetsu-Taisaku.html'
TITLE = 'Persiapan Wawancara Kaigo 面接対策 (EPA/SSW)'
DESC = ('Persiapan wawancara kerja kaigo 面接対策 untuk kandidat EPA & Tokutei '
        'Ginou: pertanyaan umum, jawaban model, perkenalan diri, keigo, dan '
        'etika wawancara Jepang. Latihan dengan pembahasan dwibahasa.')

VOCAB = [
    ["面接", "mensetsu", "wawancara"],
    ["自己紹介", "jiko shokai", "perkenalan diri"],
    ["志望動機", "shibo doki", "motivasi melamar"],
    ["長所", "chosho", "kelebihan"],
    ["短所", "tansho", "kekurangan"],
    ["経験", "keiken", "pengalaman"],
    ["資格", "shikaku", "kualifikasi/sertifikat"],
    ["敬語", "keigo", "bahasa hormat"],
    ["御社", "onsha", "perusahaan Anda (hormat)"],
    ["よろしくお願いします", "yoroshiku onegai shimasu", "mohon kerja samanya"],
    ["長く働きたい", "nagaku hatarakitai", "ingin bekerja lama"],
    ["体力", "tairyoku", "stamina/fisik"],
    ["責任感", "sekininkan", "rasa tanggung jawab"],
    ["利用者", "riyosha", "penerima perawatan"],
    ["笑顔", "egao", "senyum"],
]

QUESTIONS = [
    {"q": "面接の最初に行う「自己紹介」で最も適切なのはどれか。",
     "opts": ["いきなり給料の話をする", "名前・出身・経歴を簡潔に述べ、よろしくお願いしますで結ぶ", "無言で座る", "長々と趣味だけ話す"],
     "a": 1,
     "e": "自己紹介=名前・出身・経歴を簡潔に(perkenalan singkat)、最後に「よろしくお願いします」で礼を示す。"},
    {"q": "「志望動機」を聞かれたときの良い答え方はどれか。",
     "opts": ["家が近いから", "高齢者を支える仕事にやりがいを感じ、御社の理念に共感したから", "何となく", "他に仕事がないから"],
     "a": 1,
     "e": "志望動機(motivasi)=仕事への意欲と応募先への共感を具体的に. 消極的理由は避ける。"},
    {"q": "面接で「長所」を聞かれた。介護職に適した答えはどれか。",
     "opts": ["体力があり、人と接することが好きで責任感が強い", "特にありません", "お金が好き", "早く帰りたい"],
     "a": 0,
     "e": "長所は仕事に結びつけて(kelebihan terkait kerja): 体力・コミュニケーション・責任感などが介護向き。"},
    {"q": "「短所」を聞かれたときの適切な答え方はどれか。",
     "opts": ["短所はない", "短所を述べ、改善の努力も一緒に伝える", "他人の悪口を言う", "黙り込む"],
     "a": 1,
     "e": "短所は正直に、かつ改善努力(upaya perbaikan)を添える. 「ない」は不誠実に見える。"},
    {"q": "面接官への言葉遣いとして正しいのはどれか。",
     "opts": ["タメ口で話す", "敬語(です・ます)で丁寧に話す", "友達言葉", "無言"],
     "a": 1,
     "e": "面接では敬語(keigo/bahasa hormat)を使い、です・ます調で丁寧に話すのが基本。"},
    {"q": "面接室に入るときのマナーとして適切なのはどれか。",
     "opts": ["ノックせず入る", "ノックして「失礼します」と言い、一礼して入る", "走って入る", "無言でドアを閉める"],
     "a": 1,
     "e": "入室マナー=ノック→「失礼します」→一礼(ketuk, salam, membungkuk). 第一印象を大切に。"},
    {"q": "「なぜ日本で介護の仕事をしたいのか」への良い答えはどれか。",
     "opts": ["お金のためだけ", "日本の介護技術を学び、高齢者を支える経験を積みたいから", "観光がしたい", "特に理由はない"],
     "a": 1,
     "e": "学ぶ意欲と貢献の姿勢(niat belajar & berkontribusi)を示す. 前向きな動機が評価される。"},
    {"q": "面接で「長く働けますか」と聞かれたときの答えはどれか。",
     "opts": ["すぐ辞めます", "はい、長く働き、資格取得も目指したいです", "分かりません", "できるだけ短く"],
     "a": 1,
     "e": "定着意欲(niat bekerja lama)と成長意欲を示す. 資格取得(介護福祉士)への意欲は好印象。"},
    {"q": "利用者とのコミュニケーションについて聞かれた。適切な答えはどれか。",
     "opts": ["笑顔で相手の話をよく聞き、丁寧に接します", "無視します", "急がせます", "命令します"],
     "a": 0,
     "e": "笑顔・傾聴・丁寧さ(senyum, mendengar, sopan)が介護コミュニケーションの基本として評価される。"},
    {"q": "面接で日本語が分からない質問をされたときの適切な対応はどれか。",
     "opts": ["適当に答える", "「もう一度お願いします」と丁寧に聞き返す", "黙る", "帰る"],
     "a": 1,
     "e": "分からないときは「もう一度お願いします」(tolong ulangi)と聞き返す. 誠実さが伝わる。"},
    {"q": "面接の終わりの挨拶として適切なのはどれか。",
     "opts": ["無言で出る", "「本日はありがとうございました」と一礼する", "手を振る", "走って出る"],
     "a": 1,
     "e": "退室時は「本日はありがとうございました」(terima kasih hari ini)と感謝し一礼する。"},
    {"q": "面接での服装・身だしなみとして適切なのはどれか。",
     "opts": ["清潔感のある服装で髪を整える", "派手な服", "汚れた服", "サンダル"],
     "a": 0,
     "e": "清潔感(kerapian)が最重要. 介護は衛生が大切な仕事なので身だしなみも評価対象。"},
    {"q": "「体力に自信はありますか」と聞かれたときの答えはどれか。",
     "opts": ["ありません", "はい、日頃から体調管理をして体力を維持しています", "分かりません", "疲れやすいです"],
     "a": 1,
     "e": "介護は体力仕事. 自己管理(manajemen diri)で体力を保っていると前向きに答える。"},
    {"q": "面接で「チームワーク」について聞かれた。適切な答えはどれか。",
     "opts": ["一人で全部やる", "報連相を大切にし、他の職員と協力します", "他人に任せる", "自分勝手にする"],
     "a": 1,
     "e": "報連相と協力(kerja sama)を重視する姿勢を示す. 介護は多職種チームで行う仕事。"},
    {"q": "面接前の準備として最も適切なのはどれか。",
     "opts": ["何もしない", "施設の情報を調べ、自己紹介と志望動機を練習する", "遅刻する", "履歴書を忘れる"],
     "a": 1,
     "e": "事前準備=施設研究・回答練習・持ち物確認(riset & latihan). 準備が自信につながる。"},
]


def js_vocab(vocab):
    return '[' + ', '.join(
        '[' + ', '.join('"' + x.replace('"', '\\"') + '"' for x in v) + ']'
        for v in vocab) + ']'


def main():
    c = open(TEMPLATE, encoding='utf-8').read()
    c = re.sub(r'<title>.*?</title>', f'<title>{TITLE} | Nihongo Pro Academy</title>', c, count=1)
    c = re.sub(r'(<meta name="description" content=")[^"]*(">)',
               lambda m: m.group(1) + DESC + m.group(2), c, count=1)
    c = c.replace('Kaigo-Ujian-N2.html', SLUG)
    c = re.sub(r'(<meta property="og:title" content=")[^"]*(">)',
               lambda m: m.group(1) + TITLE + ' — Nihongo Pro Academy' + m.group(2), c, count=1)
    c = re.sub(r'PH_VOCAB=\[.*?\];', 'PH_VOCAB=' + js_vocab(VOCAB) + ';', c, count=1, flags=re.DOTALL)
    c = re.sub(r'var Q=\[.*?\];', 'var Q=' + json.dumps(QUESTIONS, ensure_ascii=False) + ';', c, count=1, flags=re.DOTALL)
    out = os.path.join(ROOT, 'Materi', SLUG)
    open(out, 'w', encoding='utf-8').write(c)
    print(f"✅ {SLUG}: {len(QUESTIONS)} soal wawancara, {len(VOCAB)} kosakata")


if __name__ == '__main__':
    main()
