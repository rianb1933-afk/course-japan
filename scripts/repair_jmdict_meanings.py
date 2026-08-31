#!/usr/bin/env python3
"""
Buang arti yang lahir dari pencocokan substring, kembalikan glos aslinya.
=========================================================================

Bug-nya
-------
scripts/merge-jmdict.js menerjemahkan glos Inggris ke Indonesia lewat tabel
438 kata, dengan pencocokan seperti ini:

    for (const [en, id] of Object.entries(EN_ID_MAP)) {
      if (lower.includes(en) || en.includes(lower)) return id;
    }

Substring, tanpa batas kata, dan mengembalikan yang PERTAMA cocok. Akibatnya:

    自虐ネタ   "self-deprecating routine"        → "kucing"   ("cat" di depreCATing)
    天狼星    "Sirius … constellation Canis …"  → "bisa"     ("can" di CANis)
    燃料不足   "fuel shortage; Brennstoffmangel" → "pria"     ("man" di BrennstoffMANgel)
    ○       "circle"                          → "baik"     ("good")
    ＣＤプレーヤー "CD player"                     → "bermain"  ("play")

Glos berbahasa Jerman ikut terbaca — JMdict memuat glos multi-bahasa dalam
elemen yang sama — sehingga kata Jerman pun bisa memicu kecocokan.

Seberapa luas
-------------
165.002 dari 165.051 entri bertag JMdict mereproduksi PERSIS keluaran
algoritma itu, jadi asal-usulnya tidak perlu ditebak. Dari jumlah itu
123.701 lewat jalur substring; hanya 37 lewat pencocokan tepat.

Kenapa semuanya dibuang, bukan disaring
---------------------------------------
Sempat dicoba menyelamatkan yang "kata utuh dan glosnya pendek" — 10.960
entri. Hasilnya tetap tidak layak: "shape up!" → "atas", "haunted house" →
"rumah", "very easily" → "sangat", "O-back" → "belakang". Reduksi satu kata
yang membuang inti maknanya, dan sebagian salah arah. Tidak ada ambang yang
memisahkan yang selamat dari yang rusak, karena mekanismenya memang tidak
pernah menerjemahkan — ia hanya menebak satu kata.

Jadi ketiganya diganti glos Inggris asli dari JMdict, dengan meaning_id
DIKOSONGKAN sebagai penanda "belum diterjemahkan" — sama seperti 3.744 entri
JMdict-EN yang ditambahkan sebelumnya. Kartunya lalu tampil tanpa bendera
🇮🇩, sehingga terlihat berbeda dari entri yang artinya sungguh Indonesia.

Inggris yang benar lebih berguna daripada Indonesia yang keliru, dan yang
ditandai bisa diterjemahkan ulang nanti dengan mesin yang sebenarnya.

Entri bertag JLPT/Materi TIDAK disentuh — itu yang ditulis manusia dan
diperiksa; 闇 → "kegelapan; melanggar hukum" memang benar.

Pemakaian
---------
    python3 scripts/repair_jmdict_meanings.py --check
    python3 scripts/repair_jmdict_meanings.py
"""

import csv
import gzip
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT, 'assets', 'vocab-all.csv')
JMDICT = os.path.join(ROOT, 'assets', 'JMdict.gz')
MERGER = os.path.join(ROOT, 'scripts', 'merge-jmdict.js')
JUDUL = ['expression', 'reading', 'romaji', 'meaning', 'meaning_id', 'tags']


def baca_peta():
    s = io.open(MERGER, encoding='utf-8').read()
    i = s.find('const EN_ID_MAP')
    j = s.find('};', i)
    return dict(re.findall(r"'([^']+)'\s*:\s*'([^']*)'", s[i:j]))


def baca_glos():
    glos = {}
    buf = ''
    with gzip.open(JMDICT, 'rt', encoding='utf-8') as f:
        for baris in f:
            buf += baris
            if '</entry>' not in buf:
                continue
            for m in re.finditer(r'<entry>.*?</entry>', buf, re.S):
                e = m.group(0)
                keb = re.search(r'<keb>([^<]+)</keb>', e)
                reb = re.search(r'<reb>([^<]+)</reb>', e)
                kata = (keb or reb).group(1) if (keb or reb) else None
                if kata and kata not in glos:
                    # DUA daftar, dan perbedaannya penting.
                    #
                    # `semua` meniru masukan algoritma lama, yang regexnya
                    # <gloss[^>]*> menangkap SEMUA bahasa meski komentarnya
                    # menulis "English glosses". Itu bagian kedua dari bug —
                    # kata Jerman ikut dipakai mencari kecocokan, dan begitulah
                    # "Brennstoffmangel" menghasilkan "pria". Dipakai hanya
                    # untuk MENDETEKSI entri mana yang lahir dari bug itu.
                    #
                    # `inggris` hanya <gloss> tanpa atribut. Itu yang DITULIS
                    # sebagai pengganti, supaya artinya bersih satu bahasa.
                    semua = re.findall(r'<gloss(?: [^>]*)?>([^<]+)</gloss>', e)
                    inggris = re.findall(r'<gloss>([^<]+)</gloss>', e)
                    if semua:
                        glos[kata] = (semua, inggris or semua)
            buf = ''
    return glos


def main():
    hanya_periksa = '--check' in sys.argv
    peta = baca_peta()
    glos = baca_glos()

    def tiru(g):
        low = g.lower().strip()
        if low in peta:
            return peta[low], 'TEPAT'
        for en, idn in peta.items():
            if en in low or low in en:
                return idn, en
        return g, None

    baris_baru = []
    diperbaiki = dipertahankan = tak_tersentuh = tanpa_glos = 0
    tak_diterjemah = 0

    with io.open(CSV_PATH, encoding='utf-8') as f:
        pembaca = csv.DictReader(f)
        for r in pembaca:
            tag = (r.get('tags') or '').strip()
            k = r.get('expression') or ''
            if tag != 'JMdict':
                tak_tersentuh += 1
                baris_baru.append([r.get(c, '') for c in JUDUL])
                continue
            pasangan = glos.get(k)
            if not pasangan:
                tanpa_glos += 1
                baris_baru.append([r.get(c, '') for c in JUDUL])
                continue
            semua, inggris = pasangan
            gabung = '; '.join(semua[:3])          # persis masukan algoritma lama
            bersih = '; '.join(inggris[:3])        # penggantinya, satu bahasa
            hasil, cara = tiru(gabung)
            rusak = (cara not in (None, 'TEPAT')
                     and hasil.strip() == (r.get('meaning_id') or '').strip())
            if rusak:
                diperbaiki += 1
                r['meaning'] = bersih
                r['meaning_id'] = ''          # penanda: belum diterjemahkan
                r['tags'] = 'JMdict-EN'
            elif (r.get('meaning_id') or '').strip() == (r.get('meaning') or '').strip():
                # Algoritma lama, saat tak menemukan kecocokan sama sekali,
                # mengembalikan glos aslinya lalu menyalinnya ke meaning_id.
                # Isinya bukan bahasa Indonesia — kadang malah Belanda atau
                # Spanyol, karena glos multi-bahasa ikut terbawa. Kolom itu
                # yang dipakai kartu untuk memasang bendera 🇮🇩, jadi hasilnya
                # bendera Indonesia di atas teks asing.
                tak_diterjemah += 1
                r['meaning'] = bersih
                r['meaning_id'] = ''
                r['tags'] = 'JMdict-EN'
            else:
                dipertahankan += 1
            baris_baru.append([r.get(c, '') for c in JUDUL])

    print(f'  entri diperiksa      : {len(baris_baru):,}')
    print(f'  bertag JLPT/Materi   : {tak_tersentuh:,}  (tidak disentuh)')
    print(f'  tanpa glos di JMdict : {tanpa_glos:,}  (tidak disentuh)')
    print(f'  dipertahankan        : {dipertahankan:,}')
    print(f'  DIPERBAIKI           : {diperbaiki:,}  arti substring → glos Inggris asli')
    print(f'  ditandai apa adanya  : {tak_diterjemah:,}  glos asing yang menyamar Indonesia')

    if hanya_periksa:
        print('\n  --check: tidak ada yang ditulis.')
        return

    tmp = CSV_PATH + '.tmp'
    with io.open(tmp, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(JUDUL)
        w.writerows(baris_baru)
    os.replace(tmp, CSV_PATH)
    mb = os.path.getsize(CSV_PATH) / 1048576
    print(f'\n  ✅ vocab-all.csv ditulis ulang ({mb:.1f} MB)')


if __name__ == '__main__':
    main()
