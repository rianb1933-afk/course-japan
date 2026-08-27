#!/usr/bin/env python3
"""
Bangun Kaigo Question Bank dari soal terautentikasi di modul.

Mengekstrak semua `var Q=[...]` dari file Materi/Kaigo-*.html, memperkaya
tiap soal dengan metadata dari kaigo_catalog (kategori, level→JLPT, tags,
difficulty), lalu menulis:
  - seed/kaigo_questions.sql   (INSERT untuk Supabase)
  - seed/kaigo_questions.json  (array JSON kompatibel Supabase)

Soal 100% asli (bukan generated) — setiap butir sudah ditulis manual dengan
pembahasan dwibahasa. Pipeline ini idempoten & bisa dijalankan ulang setiap
kali modul baru ditambah, sehingga bank tumbuh dengan konten nyata.

    python3 scripts/build_question_bank.py
"""
import json
import os
import re
import hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATERI = os.path.join(ROOT, 'Materi')
SEED_DIR = os.path.join(ROOT, 'seed')

import sys
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from kaigo_catalog import MODULES  # noqa: E402

# Peta level modul → JLPT (perkiraan; kaigo pakai istilah pemula/menengah/mahir)
LEVEL_JLPT = {'pemula': 'N5', 'menengah': 'N4', 'mahir': 'N3'}

# Peta kategori katalog → kategori question-bank (lebih spesifik bila tag cocok)
def derive_category(module_meta, tags):
    t = set(tags)
    # kategori spesifik berdasarkan tag
    specific = [
        ('dementia', {'demensia', 'ninchisho', 'bpsd'}),
        ('emergency', {'darurat', 'emergency', 'cpr', 'kyumei'}),
        ('interview', {'wawancara', 'mensetsu', 'epa', 'ssw'}),
        ('wheelchair', {'kursi-roda', 'kurumaisu'}),
        ('transfer', {'transfer', 'ijou', 'mobilitas'}),
        ('meals', {'makan', 'shokuji', 'enge'}),
        ('bath', {'mandi', 'nyuyoku'}),
        ('toilet', {'toilet', 'haisetsu'}),
        ('rehabilitation', {'rehab', 'rihabiri'}),
        ('infection_control', {'infeksi', 'kansen', 'higiene'}),
        ('vital_signs', {'vital', 'baital'}),
        ('medication', {'obat', 'fukuyaku', 'medikasi'}),
        ('care_plan', {'proses', 'katei', 'asesmen', 'care-plan'}),
        ('communication', {'komunikasi', 'empati', 'rapport', 'setsugu', 'pelayanan'}),
        ('ethics', {'martabat', 'songen', 'kerahasiaan', 'shuhi', 'etika'}),
        ('disaster', {'gempa', 'jishin', 'bencana', 'kebakaran', 'kasai'}),
        ('workplace', {'budaya', 'shokuba', 'kerja'}),
        ('walking', {'jalan', 'hoko'}),
    ]
    for cat, keys in specific:
        if t & keys:
            return cat
    # fallback ke kategori katalog
    return module_meta.get('category', 'kaigo')


def difficulty_for(level):
    return {'pemula': 'easy', 'menengah': 'medium', 'mahir': 'hard'}.get(level, 'medium')


def stable_seed(text):
    # seed reproducible dari hash pertanyaan (0..2^31-1)
    h = hashlib.md5(text.encode('utf-8')).hexdigest()
    return int(h[:8], 16) % (2**31)


def sql_escape(s):
    return s.replace("'", "''")


def sql_text_array(tags):
    inner = ', '.join('"' + t.replace('"', '\\"') + '"' for t in tags)
    return "'{" + inner + "}'"


def main():
    os.makedirs(SEED_DIR, exist_ok=True)
    # index modul by filename
    by_file = {m['filename']: (key, m) for key, m in MODULES.items()}

    rows = []
    for fn in sorted(os.listdir(MATERI)):
        if not (fn.startswith('Kaigo') and fn.endswith('.html')):
            continue
        c = open(os.path.join(MATERI, fn), encoding='utf-8').read()
        # Deteksi array kuis apa pun (var Q=, var QQ=, var QKZ=, dst) — bukan
        # cuma "Q" persis. Menggunakan bracket-balance agar tepat memotong
        # array bersarang (opts di dalamnya) alih-alih regex non-greedy yang
        # terpotong prematur. Melewati PH_VOCAB (array-of-array, bukan objek).
        Q = None
        for vm in re.finditer(r'var\s+\w+\s*=\s*\[\s*\{', c):
            start = vm.start() + vm.group(0).index('[')
            depth = 0
            i = start
            in_str = False
            esc = False
            while i < len(c):
                ch = c[i]
                if in_str:
                    if esc:
                        esc = False
                    elif ch == '\\':
                        esc = True
                    elif ch == '"':
                        in_str = False
                else:
                    if ch == '"':
                        in_str = True
                    elif ch == '[':
                        depth += 1
                    elif ch == ']':
                        depth -= 1
                        if depth == 0:
                            break
                i += 1
            arrtxt = c[start:i + 1]
            try:
                candidate = json.loads(arrtxt)
            except Exception:
                continue
            if candidate and isinstance(candidate[0], dict) and 'q' in candidate[0] and 'opts' in candidate[0]:
                Q = candidate
                break
        if Q is None:
            continue
        meta = by_file.get(fn, (None, {}))[1]
        tags = meta.get('tags', [])
        level = meta.get('level', 'menengah')
        category = derive_category(meta, tags)
        jlpt = LEVEL_JLPT.get(level)
        diff = difficulty_for(level)
        for q in Q:
            if not (isinstance(q, dict) and q.get('q') and q.get('opts') and 'a' in q and q.get('e')):
                continue
            if len(q['opts']) != 4:
                continue
            rows.append({
                'source_module': fn,
                'category': category,
                'question': q['q'],
                'choices': q['opts'],
                'correct_index': int(q['a']),
                'explanation': q['e'],
                'difficulty': diff,
                'jlpt_level': jlpt,
                'tags': tags,
                'seed': stable_seed(q['q']),
            })

    # dedupe soal identik (pertanyaan sama persis)
    seen = set()
    uniq = []
    for r in rows:
        if r['question'] in seen:
            continue
        seen.add(r['question'])
        uniq.append(r)

    # tulis JSON
    json_path = os.path.join(SEED_DIR, 'kaigo_questions.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(uniq, f, ensure_ascii=False, indent=1)

    # tulis SQL
    sql_path = os.path.join(SEED_DIR, 'kaigo_questions.sql')
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write('-- Kaigo Question Bank seed — auto-generated dari soal modul terautentikasi\n')
        f.write('-- Jalankan setelah kaigo_questions table dibuat (lihat supabase-schema.sql)\n')
        f.write('-- Idempoten: hapus dulu isi lama bila ingin re-seed penuh:\n')
        f.write('--   TRUNCATE kaigo_questions;\n\n')
        for r in uniq:
            choices = json.dumps(r['choices'], ensure_ascii=False).replace("'", "''")
            jlpt = "'" + r['jlpt_level'] + "'" if r['jlpt_level'] else 'NULL'
            f.write(
                "INSERT INTO kaigo_questions "
                "(source_module,category,question,choices,correct_index,explanation,difficulty,jlpt_level,tags,seed) VALUES ("
                f"'{sql_escape(r['source_module'])}',"
                f"'{sql_escape(r['category'])}',"
                f"'{sql_escape(r['question'])}',"
                f"'{choices}'::jsonb,"
                f"{r['correct_index']},"
                f"'{sql_escape(r['explanation'])}',"
                f"'{r['difficulty']}',"
                f"{jlpt},"
                f"{sql_text_array(r['tags'])},"
                f"{r['seed']}"
                ");\n"
            )

    # ringkasan kategori
    from collections import Counter
    cats = Counter(r['category'] for r in uniq)
    print(f"✅ {len(uniq)} soal unik → seed/kaigo_questions.sql + .json")
    print("   Distribusi kategori:")
    for cat, n in cats.most_common():
        print(f"     {n:4} {cat}")


if __name__ == '__main__':
    main()
