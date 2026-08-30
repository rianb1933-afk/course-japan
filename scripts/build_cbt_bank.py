#!/usr/bin/env python3
"""
Bangun assets/cbt-bank.json dari seed/ untuk Simulator CBT.
===========================================================

Kenapa script ini ada
---------------------
JLPT-CBT.html — fitur simulator utama — berjalan di `const QBANK = [...]`
yang ditulis langsung di dalam halaman: 20 soal seluruhnya.

    N5: 10    N4: 4    N3: 2    N2: 0    N1: 0

Dua level teratas tidak punya satu soal pun, padahal keduanya ditawarkan di
UI dan bahkan sudah punya alokasi waktu sendiri (TIME = {... N2:6300, N1:6600}).
Sementara itu seed/ menyimpan 2.521 soal yang tidak pernah dibaca halaman itu:
729 dari modul JLPT dan 1.792 dari modul Kaigo.

Script ini menyambungkan keduanya. Tidak ada soal yang dikarang di sini —
semuanya sudah ada, hanya belum sampai ke layar.

Dua hal yang harus dibereskan sebelum seed layak dipakai
-------------------------------------------------------

1. LABEL LEVEL. 493 dari 729 soal JLPT tidak punya `jlpt_level`, jadi tidak
   bisa disajikan per level. Levelnya diturunkan dari modul asalnya: token
   N1–N5 yang paling sering muncul di halaman modul.

   Heuristik itu TIDAK dipercaya begitu saja — ia diuji lebih dulu terhadap
   42 modul yang soalnya sudah berlabel, dan tepat di 42-42nya. Pengujian itu
   dijalankan ulang setiap kali script ini jalan (lihat `uji_heuristik`), dan
   script berhenti kalau akurasinya turun. Kalau suatu hari sebuah modul
   ditulis ulang dan levelnya jadi ambigu, di sinilah ketahuannya.

2. BAHASA PENJELASAN. Penjelasan di seed sebagian besar Jepang saja — di sisi
   Kaigo hanya 6% yang berbahasa Indonesia. Menyambungkannya apa adanya akan
   memasang 1.677 penjelasan yang tidak bisa dibaca pelajar Indonesia, persis
   kebalikan dari kerja terjemahan yang sudah dilakukan di modulnya.

   seed/kaigo_explanation_id.json memetakan awalan penjelasan Jepang ke
   glos Indonesia — peta yang sama yang dipakai menerjemahkan modulnya.
   Dicocokkan dengan awalan TERPANJANG lebih dulu, supaya "介護福祉士=..."
   tidak kalah oleh awalan pendek yang kebetulan juga cocok.

Sisa yang tidak tertutup dicatat di ringkasan, bukan disembunyikan.

Pemakaian
---------
    python3 scripts/build_cbt_bank.py            # tulis assets/cbt-bank.json
    python3 scripts/build_cbt_bank.py --check    # hanya periksa, jangan tulis
"""

import collections
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, 'seed')
MATERI = os.path.join(ROOT, 'Materi')
OUT = os.path.join(ROOT, 'assets', 'cbt-bank.json')

LEVEL = re.compile(r'\bN[1-5]\b')

# Sama dengan penanda di validate.py: rangkaian Latin yang memuat kata
# fungsi Indonesia. Dipakai untuk memutuskan sebuah penjelasan sudah
# berbahasa Indonesia atau belum.
IDN = re.compile(
    r"\b(yang|dan|untuk|dengan|pada|dari|atau|tidak|adalah|bisa|agar|saat|oleh"
    r"|dalam|secara|harus|dapat|perlu|karena|artinya|berarti|menjadi)\b"
    r"|\b(?:me[mnl]?[a-z]{3,}|ber[a-z]{4,}|pe[mn]?[a-z]{4,}an|ke[a-z]{4,}an)\b",
    re.I)


def baca(nama):
    with open(os.path.join(SEED, nama), encoding='utf-8') as f:
        return json.load(f)


def level_modul(modul, _cache={}):
    """Level JLPT sebuah modul, ditebak dari token N1–N5 tersering di halamannya."""
    if modul in _cache:
        return _cache[modul]
    path = os.path.join(MATERI, modul)
    hasil = None
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            hitung = collections.Counter(LEVEL.findall(f.read()))
        if hitung:
            hasil = hitung.most_common(1)[0][0]
    _cache[modul] = hasil
    return hasil


def uji_heuristik(soal):
    """Uji tebakan level terhadap modul yang soalnya SUDAH berlabel.

    Mengembalikan (tepat, meleset, contoh). Script berhenti kalau ada yang
    meleset — tebakan yang tidak bisa dibuktikan tidak boleh dipakai untuk
    melabeli 493 soal lain.
    """
    asli = collections.defaultdict(collections.Counter)
    for q in soal:
        lv = str(q.get('jlpt_level'))
        if lv not in ('None', '', '?'):
            asli[q.get('source_module', '')][lv] += 1

    tepat = meleset = 0
    contoh = []
    for modul, hitung in asli.items():
        benar = hitung.most_common(1)[0][0]
        tebak = level_modul(modul)
        if tebak is None:
            continue
        if tebak == benar:
            tepat += 1
        else:
            meleset += 1
            contoh.append(f'{modul}: berlabel {benar}, tertebak {tebak}')
    return tepat, meleset, contoh


def terjemahkan(soal, kunci_terurut, peta):
    """Isi penjelasan Jepang dengan glos Indonesia dari peta awalan.

    Awalan TERPANJANG dicoba lebih dulu: beberapa kunci saling menjadi awalan
    satu sama lain, dan yang pendek akan mencuri kecocokan yang lebih tepat.
    """
    sudah = ditambal = gagal = 0
    for q in soal:
        e = str(q.get('explanation', '') or '')
        if IDN.search(e):
            sudah += 1
            continue
        for k in kunci_terurut:
            if e.startswith(k):
                q['explanation'] = peta[k] + (' ' + e if e else '')
                ditambal += 1
                break
        else:
            gagal += 1
    return sudah, ditambal, gagal


def main():
    hanya_periksa = '--check' in sys.argv

    jlpt = baca('jlpt_questions.json')
    kaigo = baca('kaigo_questions.json')

    # ── 1. label level ────────────────────────────────────────────────────
    tepat, meleset, contoh = uji_heuristik(jlpt)
    print(f'  Heuristik level diuji di {tepat + meleset} modul berlabel: '
          f'{tepat} tepat, {meleset} meleset')
    if meleset:
        for c in contoh[:6]:
            print(f'     {c}')
        sys.exit('  ✗ Heuristik tidak lagi tepat — jangan dipakai melabeli '
                 'soal lain sampai sebabnya jelas.')

    tanpa_level = 0
    for q in jlpt:
        if str(q.get('jlpt_level')) in ('None', '', '?'):
            lv = level_modul(q.get('source_module', ''))
            if lv:
                q['jlpt_level'] = lv
            else:
                tanpa_level += 1

    # ── 2. bahasa penjelasan ──────────────────────────────────────────────
    with open(os.path.join(SEED, 'kaigo_explanation_id.json'), encoding='utf-8') as f:
        peta = json.load(f)
    kunci = sorted(peta.keys(), key=len, reverse=True)

    js, jt, jg = terjemahkan(jlpt, kunci, peta)
    ks, kt, kg = terjemahkan(kaigo, kunci, peta)
    print(f'  Penjelasan JLPT  : {js} sudah Indonesia · {jt} ditambal peta · {jg} sisa')
    print(f'  Penjelasan Kaigo : {ks} sudah Indonesia · {kt} ditambal peta · {kg} sisa')

    # ── 3. rakit bank ─────────────────────────────────────────────────────
    bank = []
    for asal, soal in (('jlpt', jlpt), ('kaigo', kaigo)):
        for i, q in enumerate(soal):
            pilihan = q.get('choices')
            if isinstance(pilihan, str):
                try:
                    pilihan = json.loads(pilihan.replace("'", '"'))
                except Exception:
                    continue
            if not isinstance(pilihan, list) or len(pilihan) < 2:
                continue
            jawab = q.get('correct_index')
            try:
                jawab = int(jawab)
            except (TypeError, ValueError):
                continue
            if not 0 <= jawab < len(pilihan):
                continue
            lv = str(q.get('jlpt_level') or '')
            if lv not in ('N1', 'N2', 'N3', 'N4', 'N5'):
                continue
            bank.append({
                'id': f'{asal}{i}',
                'lv': lv,
                'cat': str(q.get('category') or 'general'),
                'src': 'Kaigo' if asal == 'kaigo' else 'JLPT',
                'q': str(q.get('question') or ''),
                'opts': [str(x) for x in pilihan],
                'ans': jawab,
                'ex': str(q.get('explanation') or ''),
            })

    per = collections.Counter(b['lv'] for b in bank)
    print(f'\n  Bank: {len(bank)} soal')
    for lv in ('N5', 'N4', 'N3', 'N2', 'N1'):
        print(f'     {lv}: {per.get(lv, 0)}')
    if tanpa_level:
        print(f'  {tanpa_level} soal JLPT tetap tanpa level (modulnya tak memberi petunjuk)')

    kosong = [lv for lv in ('N5', 'N4', 'N3', 'N2', 'N1') if per.get(lv, 0) == 0]
    if kosong:
        print(f'  ⚠️  Level tanpa soal sama sekali: {", ".join(kosong)}')

    if hanya_periksa:
        print('\n  --check: tidak ada yang ditulis.')
        return

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(bank, f, ensure_ascii=False, separators=(',', ':'))
    kb = os.path.getsize(OUT) // 1024
    print(f'\n  ✅ {os.path.relpath(OUT, ROOT)} ditulis ({kb} KB)')


if __name__ == '__main__':
    main()
