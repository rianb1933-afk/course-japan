#!/usr/bin/env python3
"""
Bank soal JLPT terpisah — dari soal terautentikasi di materi non-Kaigo.
Mengekstrak var Q dari Materi/*.html (Grammar/Kosakata/Kanji/JLPT/Kaiwa),
memperkaya kategori & JLPT level dari nama file, tulis SQL + JSON.

    python3 scripts/build_jlpt_question_bank.py
"""
import json, os, re, hashlib
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATERI=os.path.join(ROOT,'Materi'); SEED=os.path.join(ROOT,'seed')

def category_of(fn):
    f=fn.lower()
    if 'kanji' in f: return 'kanji'
    if 'grammar' in f or 'bunpou' in f or 'tata' in f: return 'grammar'
    if 'kosakata' in f or 'vocab' in f or 'goi' in f: return 'vocabulary'
    if 'kaiwa' in f or 'conversation' in f: return 'conversation'
    if 'listening' in f or 'choukai' in f: return 'listening'
    if 'reading' in f or 'dokkai' in f: return 'reading'
    if 'frasa' in f or 'expression' in f: return 'expression'
    return 'general'

def jlpt_of(fn):
    m=re.search(r'N([1-5])', fn)
    return 'N'+m.group(1) if m else None

def difficulty_of(jlpt):
    return {'N5':'easy','N4':'easy','N3':'medium','N2':'hard','N1':'hard'}.get(jlpt,'medium')

def seed_of(t): return int(hashlib.md5(t.encode()).hexdigest()[:8],16)%(2**31)
def esc(s): return s.replace("'","''")
def arr(tags): return "'{"+', '.join('"'+t+'"' for t in tags)+"}'"

def extract_q(c):
    """Ekstrak array var Q=[...] dengan aman terhadap deklarasi berantai
    (var Q=[...],qi=0,ok=0,tot=0;) yang genuinely dipakai di banyak modul
    lebih baru. Regex lama (`var Q=(\\[.*?\\]);`) mengharuskan `]` langsung
    diikuti `;` -- ketika diikuti `,qi=0...` malah, `.*?` non-greedy
    genuinely lari jauh melewati akhir array asli sampai menemukan `];`
    berikutnya di mana pun itu (bisa di fungsi lain), menghasilkan JSON
    tercampur teks JS lain yang gagal di-parse (dibuang diam-diam lewat
    `except: continue`). json.JSONDecoder().raw_decode berhenti tepat di
    akhir struktur JSON yang valid, apa pun yang menyusul setelahnya."""
    idx = c.find('var Q=[')
    if idx == -1:
        return None
    start = idx + len('var Q=')
    try:
        Q, _ = json.JSONDecoder().raw_decode(c, start)
    except ValueError:
        return None
    return Q

def main():
    os.makedirs(SEED,exist_ok=True)
    rows=[]
    for fn in sorted(os.listdir(MATERI)):
        if fn.startswith('Kaigo') or not fn.endswith('.html'): continue
        c=open(os.path.join(MATERI,fn),encoding='utf-8').read()
        Q=extract_q(c)
        if Q is None: continue
        cat=category_of(fn); jlpt=jlpt_of(fn); diff=difficulty_of(jlpt)
        tags=[cat]+([jlpt.lower()] if jlpt else [])
        for q in Q:
            if not (isinstance(q,dict) and q.get('q') and q.get('opts') and 'a' in q and q.get('e')): continue
            if len(q['opts'])!=4: continue
            rows.append({'source_module':fn,'category':cat,'question':q['q'],'choices':q['opts'],
                'correct_index':int(q['a']),'explanation':q['e'],'difficulty':diff,
                'jlpt_level':jlpt,'tags':tags,'seed':seed_of(q['q'])})
    # dedupe
    seen=set(); uniq=[]
    for r in rows:
        if r['question'] in seen: continue
        seen.add(r['question']); uniq.append(r)
    json.dump(uniq,open(os.path.join(SEED,'jlpt_questions.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    with open(os.path.join(SEED,'jlpt_questions.sql'),'w',encoding='utf-8') as f:
        f.write('-- JLPT Question Bank seed — auto-generated dari materi non-Kaigo\n')
        f.write('-- Butuh tabel jlpt_questions (struktur sama dgn kaigo_questions)\n\n')
        for r in uniq:
            ch=json.dumps(r['choices'],ensure_ascii=False).replace("'","''")
            jl="'"+r['jlpt_level']+"'" if r['jlpt_level'] else 'NULL'
            f.write("INSERT INTO jlpt_questions (source_module,category,question,choices,correct_index,explanation,difficulty,jlpt_level,tags,seed) VALUES ("
                f"'{esc(r['source_module'])}','{esc(r['category'])}','{esc(r['question'])}','{ch}'::jsonb,{r['correct_index']},'{esc(r['explanation'])}','{r['difficulty']}',{jl},{arr(r['tags'])},{r['seed']});\n")
    from collections import Counter
    cats=Counter(r['category'] for r in uniq); jl=Counter(r['jlpt_level'] for r in uniq if r['jlpt_level'])
    print(f"✅ {len(uniq)} soal JLPT unik → seed/jlpt_questions.sql + .json")
    print("   Kategori:",dict(cats))
    print("   JLPT:",dict(jl))

if __name__=='__main__': main()
