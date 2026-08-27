#!/usr/bin/env python3
"""Perdalam 3 modul baru ke 20+ soal dgn konten nyata. Idempoten (dedupe teks)."""
import json, os, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRA={
 'Kaigo-Mensetsu-Taisaku.html':[
   {"q":"面接で「残業はできますか」と聞かれたときの前向きな答えはどれか。","opts":["絶対にできません","可能な範囲で協力したいです","考えたくないです","分かりません"],"a":1,"e":"柔軟性(fleksibilitas)を示しつつ無理はしない姿勢. 「可能な範囲で」が誠実で前向き。"},
   {"q":"面接で緊張したときの適切な対応はどれか。","opts":["黙り込む","深呼吸し落ち着いて答える","帰る","泣く"],"a":1,"e":"緊張時は深呼吸(tarik napas)し落ち着く. 完璧でなくても誠実さが伝わればよい。"},
   {"q":"「介護でつらいことがあったらどうしますか」への良い答えはどれか。","opts":["すぐ辞める","先輩や同僚に相談し乗り越えます","一人で抱える","我慢だけする"],"a":1,"e":"相談・報連相(konsultasi)で解決する姿勢を示す. 定着性の評価にもつながる。"},
   {"q":"面接官の目を見て話すことの意味はどれか。","opts":["失礼になる","誠実さと自信を伝える","不要である","威圧的になる"],"a":1,"e":"適度なアイコンタクト(kontak mata)は誠実さ・自信の表れ. 睨まず自然に。"},
   {"q":"日本語がまだ上手でない場合の面接での姿勢はどれか。","opts":["諦める","学ぶ意欲と努力を具体的に伝える","黙る","嘘をつく"],"a":1,"e":"完璧でなくても学習意欲(niat belajar)と努力を伝えれば好印象. 資格取得目標も有効。"},
 ],
 'Kaigo-Shuhi-Gimu.html':[
   {"q":"利用者の写真を撮ってよいのはどのような場合か。","opts":["いつでも自由に","本人・家族の同意と施設の許可がある場合","こっそり","SNS用に"],"a":1,"e":"写真は同意と許可(persetujuan & izin)が必須. 無断撮影・投稿は守秘義務違反。"},
   {"q":"守秘義務が特に問われる場面はどれか。","opts":["休憩中の雑談で利用者の話をする","一人で記録する","手洗いする","掃除する"],"a":0,"e":"休憩中でも利用者情報を話すのは漏洩リスク(risiko bocor). 場所を選ばず守る。"},
 ],
 'Kaigo-Shokuba-Bunka.html':[
   {"q":"日本の職場で「5分前行動」が意味することはどれか。","opts":["5分遅れてよい","予定より少し early に準備を整える","5分早く帰る","関係ない"],"a":1,"e":"5分前行動=余裕を持って準備(siap lebih awal). 時間厳守文化の表れ。"},
   {"q":"先輩から指導を受けたときの適切な態度はどれか。","opts":["無視する","感謝しメモを取り実践する","反論する","聞き流す"],"a":1,"e":"指導は成長の機会. 感謝・メモ・実践(terima kasih & catat)で信頼を得る。"},
 ],
}
def main():
    for fn,extra in EXTRA.items():
        path=os.path.join(ROOT,'Materi',fn)
        c=open(path,encoding='utf-8').read()
        m=re.search(r'var Q=(\[.*?\]);',c,re.DOTALL)
        Q=json.loads(m.group(1))
        seen={q['q'] for q in Q}
        add=[e for e in extra if e['q'] not in seen]
        if not add: print(f"SKIP {fn}"); continue
        Q.extend(add)
        open(path,'w',encoding='utf-8').write(c[:m.start()]+'var Q='+json.dumps(Q,ensure_ascii=False)+';'+c[m.end():])
        print(f"OK {fn}: +{len(add)} -> {len(Q)}")
main()
