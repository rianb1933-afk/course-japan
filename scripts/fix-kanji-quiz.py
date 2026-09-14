#!/usr/bin/env python3
"""
Perbaikan kuis kanji di 5 halaman Kanji-NX.html.

Masalah yang diperbaiki:
1. Pool `kqPoolN*` korup: baris koma nyasar (`,`) membuat lubang (sparse hole)
   di array — saat indeks itu tergambar, `item[0]` melempar
   "Cannot read properties of undefined" (eror yang dilaporkan pengguna).
2. Entri ekor berbentuk 5 field `[kanji, readings, arti, contoh, mnemonik]`
   (bentuk salah, sisa data lama) — opsi jawaban jadi campur readings/arti dan
   counter soal membengkak (mis. "Soal 1/36" padahal intro janji 10).
3. Intro tertulis "cara baca (reading)" padahal soalnya menanyakan arti.
4. N2–N5 punya mount kuis kosong `kqBoxN*` (dead div) sementara hanya N5 & N1
   yang punya kuis lama (N5 crash; N1 punya dua kuis sekaligus dan yang modern
   crash saat menjawab karena kqExpN1 dihancurkan re-render). Semua kini
   disatukan ke pola modern: 10 soal acak per sesi + layar skor + Ulangi,
   di-render otomatis ke kqBoxN*.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Entri 5-bentuk yang ditemukan setelah koma nyasar, dikurasi ulang ke bentuk
# 4 field `[kanji, arti, reading, contoh]` bergaya entri yang benar.
# 金/土 N5 duplikat entri awal → ikut terbuang lewat dedupe.
CURATED = {
    'N5': {
        '百': "['百','seratus','ひゃく','百円(ひゃくえん)=100 yen, 百貨店(ひゃっかてん)=toko serba ada']",
        '千': "['千','seribu','せん','千円(せんえん)=1.000 yen, 千葉(ちば)=Chiba']",
        '万': "['万','sepuluh ribu','まん','一万円(いちまんえん)=10.000 yen, 万年筆(まんねんひつ)=pena']",
    },
    'N4': {
        '図': "['図','gambar/peta','ず・ト','地図(ちず)=peta, 図書館(としょかん)=perpustakaan']",
        '科': "['科','mata pelajaran/ilmu','か','科学(かがく)=ilmu, 科目(かもく)=mata pelajaran']",
        '術': "['術','teknik/seni','じゅつ','技術(ぎじゅつ)=teknologi, 手術(しゅじゅつ)=operasi']",
        '医': "['医','dokter/pengobatan','い','医者(いしゃ)=dokter, 医療(いりょう)=pengobatan']",
        '病': "['病','sakit/penyakit','びょう','病気(びょうき)=sakit, 病院(びょういん)=rumah sakit']",
    },
    'N3': {
        '議': "['議','diskusi/rapat','ぎ','会議(かいぎ)=rapat, 議論(ぎろん)=perdebatan']",
        '査': "['査','memeriksa','さ','調査(ちょうさ)=penyelidikan, 検査(けんさ)=pemeriksaan']",
        '率': "['率','tingkat/rasio','りつ','確率(かくりつ)=probabilitas, 効率(こうりつ)=efisiensi']",
        '複': "['複','ganda/rumit','ふく','複雑(ふくざつ)=rumit, 複数(ふくすう)=jamak']",
        '然': "['然','alami/begitu','ぜん','自然(しぜん)=alam, 当然(とうぜん)=tentu saja']",
    },
    'N2': {
        '廃': "['廃','menghapus/usang','はい','廃棄(はいき)=pembuangan, 廃止(はいし)=penghapusan']",
        '維': "['維','mempertahankan/serat','い','維持(いじ)=pemeliharaan, 繊維(せんい)=serat']",
        '敏': "['敏','peka/cekatan','びん','敏感(びんかん)=sensitif, 敏速(びんそく)=cepat & tepat']",
        '賦': "['賦','memberikan/iuran','ふ','賦与(ふよ)=pemberian, 月賦(げっぷ)=cicilan']",
        '醸': "['醸','fermentasi/menumbuhkan','じょう','醸造(じょうぞう)=pembuatan sake, 醸成(じょうせい)=pembentukan']",
    },
    'N1': {
        '憂': "['憂','sedih/khawatir','ゆう','憂鬱(ゆううつ)=depresi, 憂慮(ゆうりょ)=kekhawatiran']",
        '凌': "['凌','melampaui/bertahan','りょう','凌駕(りょうが)=melampaui']",
        '斡': "['斡','menengahi','あつ','斡旋(あっせん)=mediasi']",
        '嘱': "['嘱','mempercayakan','しょく','嘱託(しょくたく)=komisioner']",
        '憤': "['憤','marah/amarah','ふん','憤慨(ふんがい)=sangat marah, 憤怒(ふんぬ)=kemarahan']",
    },
}

INTRO_OK = 'Pilih arti yang tepat untuk setiap kanji. 10 soal acak per sesi.'

# Kuis modern (10 soal acak per sesi + layar skor). {L} = angka level (5..1).
# Id elemen mengikuti pola halaman: kqBoxN{L}, kqOptsN{L}, kqExpN{L}.
MODERN = """let kqIdxN{L}=0,kqScoreN{L}=0,kqActiveN{L}=[];
function shn{L}(a){return[...a].sort(()=>Math.random()-0.5);}
kqActiveN{L}=shn{L}(kqPoolN{L}).slice(0,10);
function renderKQN{L}(){
  const box=document.getElementById('kqBoxN{L}');
  if(kqIdxN{L}>=kqActiveN{L}.length){
    const pct=Math.round(kqScoreN{L}/kqActiveN{L}.length*100);
    box.innerHTML=`<div style="background:var(--white);border:.5px solid var(--border-mid);border-radius:12px;padding:1.5rem;text-align:center">
      <div style="font-size:40px;font-weight:800;color:${pct>=80?'var(--green-pale,#27ae60)':pct>=60?'var(--gold)':'var(--red)'}">${kqScoreN{L}}/${kqActiveN{L}.length}</div>
      <div style="font-size:13px;color:var(--ink-soft);margin:.5rem 0">soal benar (${pct}%)</div>
      <button onclick="kqIdxN{L}=0;kqScoreN{L}=0;kqActiveN{L}=shn{L}(kqPoolN{L}).slice(0,10);renderKQN{L}()" style="background:var(--red);color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer">Ulangi</button>
    </div>`;
    return;
  }
  const [kanji,mean,read,ex]=kqActiveN{L}[kqIdxN{L}];
  const wp=shn{L}(kqPoolN{L}.filter(e=>e[1]!==mean)).slice(0,3).map(e=>e[1]);
  const ao=shn{L}([mean,...wp]);
  const ai=ao.indexOf(mean);
  const opts=ao.map((o,i)=>`<button onclick="ckn{L}(${i},${ai})" style="width:100%;text-align:left;background:var(--white);border:.5px solid var(--border-mid);border-radius:8px;padding:10px 14px;font-size:13px;cursor:pointer;transition:all .15s">${o}</button>`).join('');
  box.innerHTML=`<div style="background:var(--white);border:.5px solid var(--border-mid);border-radius:12px;padding:1.25rem">
    <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:var(--red);margin-bottom:.5rem">
      <span>SOAL ${kqIdxN{L}+1}/${kqActiveN{L}.length} · N{L}</span><span>${kqScoreN{L}} benar</span>
    </div>
    <div style="text-align:center;margin:.75rem 0">
      <div style="font-family:'Noto Serif JP',serif;font-size:52px;color:var(--ink)">${kanji}</div>
      <div style="font-size:12px;color:var(--ink-soft)">${read}</div>
    </div>
    <p style="font-size:13px;color:var(--ink-mid);text-align:center;margin-bottom:.75rem">Artinya?</p>
    <div style="display:grid;gap:.5rem" id="kqOptsN{L}">${opts}</div>
    <div id="kqExpN{L}" style="display:none;margin-top:.75rem;padding:.625rem .875rem;border-radius:8px;font-size:13px;font-weight:600;line-height:1.5;background:var(--cream)"></div>
  </div>`;
}
function ckn{L}(c,a){
  const q=kqActiveN{L}[kqIdxN{L}];const ok=c===a;
  if(ok)kqScoreN{L}++;
  document.querySelectorAll('#kqOptsN{L} button').forEach((b,i)=>{b.disabled=true;if(i===a)b.style.background='var(--green-pale,#eafaf1)';if(i===c&&!ok)b.style.background='var(--red-pale,#fadbd8)';});
  const e=document.getElementById('kqExpN{L}');
  e.style.display='block';
  e.textContent=(ok?'✓ Benar! ':'✗ Salah. ')+q[0]+' ('+q[2]+') = '+q[1]+'. '+q[3];
  setTimeout(()=>{kqIdxN{L}++;renderKQN{L}();},1600);
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', renderKQN{L}); } else { renderKQN{L}(); }"""


def fix_pool(text: str, label: str, varname: str) -> str:
    """Normalisasi blok const <varname> = [...]; — hapus lubang, kurasi 5-bentuk, dedupe."""
    m = re.search(r'const ' + varname + r' = \[([\s\S]*?)\];', text)
    if not m:
        raise SystemExit(f'{label}: blok {varname} tidak ditemukan')
    entries = []
    for ln in m.group(1).split('\n'):
        # baris pool adalah satu entri utuh berakhiran "']," (atau "']" utk baris
        # terakhir — closer array "]" sudah dikonsumsi regex). Jangan buang "]":
        # itu penutup entri, bukan penutup array.
        s = ln.strip().rstrip(',')
        if not s or s == ',':
            continue  # koma nyasar / lubang array — dibuang
        km = re.match(r"\['(.)',", s)
        if not km:
            raise SystemExit(f'{label}: baris pool tak dikenali: {s[:80]}')
        nfields = len(re.findall(r"'((?:[^'\\]|\\.)*)'", s))
        entries.append((km.group(1), nfields, s))
    # dedupe per kanji, simpan yang pertama — entri 5-bentuk yang duplikat
    # ikut terbuang di sini (mis. 金/土 N5 yang sudah ada di bagian awal pool)
    seen, uniq, replaced, dropped = set(), [], [], []
    for kanji, nfields, s in entries:
        if kanji in seen:
            dropped.append(kanji)
            continue
        seen.add(kanji)
        if nfields == 5:
            rep = CURATED[label].get(kanji)
            if rep is None:
                raise SystemExit(f'{label}: entri 5-bentuk tanpa kurasi: {kanji}')
            uniq.append(rep)
            replaced.append(kanji)
        else:
            uniq.append(s)
    print(f'{label}: {len(uniq)} entri — kurasi {",".join(replaced) or "-"} | dedupe {",".join(dropped) or "-"}')
    new_block = (f'const {varname} = [\n'
                 + '\n'.join('  ' + e + ',' for e in uniq[:-1])
                 + '\n  ' + uniq[-1] + '\n];')
    return text[:m.start()] + new_block + text[m.end():]


def inject_modern(text: str, label: str) -> str:
    """Ganti alur kuis lama (let kqIdx… s.d. akhir checkKQ*) dalam blok script yang
    sama dengan pool, dengan kuis modern. Idempoten: kalau kuis modern sudah
    terpasang, lewati."""
    suf = label[1]
    if f'function renderKQN{suf}' in text:
        return text
    pat = re.compile(
        r'\nlet kqIdx\w+ ?= ?0;[\s\S]*?function checkKQ\w+\([\s\S]*?\n\}\n')
    if not pat.search(text):
        raise SystemExit(f'{label}: blok fungsi kuis lama tidak ditemukan')
    return pat.sub('\n' + MODERN.replace('{L}', suf) + '\n', text, count=1)


def fix_simple(path: Path, label: str) -> None:
    """N5/N4/N3/N2: pool + intro + kuis modern; hapus tombol/area lama bila ada."""
    text = path.read_text(encoding='utf-8')
    text = fix_pool(text, label, f'kqPoolN{label[1]}')
    text = re.sub(r'<p class="sub">Pilih cara baca[^<]*</p>',
                  f'<p class="sub">{INTRO_OK}</p>', text)
    # Tombol + area kuis lama — beberapa varian markup (N5 di dalam section,
    # N4/N3 terbungkus div, N2 berindentasi)
    text = re.sub(
        r'\n?<div[^>]*>\s*<button onclick="startKanjiQuizN\w+\(\)"[^>]*>🎯[^<]*</button>\s*\n<div id="kqArea\w+"[^>]*></div></div>',
        '', text)
    text = re.sub(
        r'\n\s*<button onclick="startKanjiQuizN\w+\(\)"[^>]*>🎯[^<]*</button>\n\s*<div id="kqArea\w+"[^>]*></div>',
        '', text)
    text = inject_modern(text, label)
    path.write_text(text, encoding='utf-8')
    print(f'  intro + kuis modern + pembersihan tombol lama OK')


def fix_n1(path: Path) -> None:
    """N1: pool + perbaiki kuis modern yang sudah ada (tambah kqExpN1 di template)
    + buang kuis lama duplikat (blok script kedua + tombol hero)."""
    text = path.read_text(encoding='utf-8')
    text = fix_pool(text, 'N1', 'kqPoolN1')

    # Template renderKQN1 tidak punya kqExpN1 (dihancurkan re-render) → ckn1 null.
    old_tpl = """<div style="display:grid;gap:.5rem" id="kqOptsN1">${opts}</div>
    
  </div>`;"""
    new_tpl = """<div style="display:grid;gap:.5rem" id="kqOptsN1">${opts}</div>
    <div id="kqExpN1" style="display:none;margin-top:.75rem;padding:.625rem .875rem;border-radius:8px;font-size:13px;font-weight:600;line-height:1.5;background:var(--surface,#f9f9f9);border:1px solid var(--border-mid,#e0e0e0)"></div>
  </div>`;"""
    if old_tpl not in text:
        if new_tpl in text:
            pass  # sudah diperbaiki sebelumnya — idempoten
        else:
            raise SystemExit('N1: template renderKQN1 tidak ditemukan')
    else:
        text = text.replace(old_tpl, new_tpl, 1)

    # Intro N1: angka "30 kanji" tidak lagi akurat → frasa netral
    text = text.replace('diacak otomatis dari 30 kanji N1 penting.',
                        'diacak otomatis dari koleksi kanji N1.')

    # Buang blok script kedua yang hanya berisi alur kuis lama (idempoten)
    m = re.search(r'<script>\nlet kqIdx1=0;[\s\S]*?</script>\n', text)
    if m:
        text = text[:m.start()] + text[m.end():]

    # Buang tombol hero + kqArea1 (idempoten)
    m = re.search(r'\n<div style="margin-top:2rem;padding:0 1rem">\n  <button onclick="startKanjiQuizN1\(\)"[\s\S]*?<div id="kqArea1"[^>]*></div>\n</div>', text)
    if m:
        text = text[:m.start()] + text[m.end():]

    path.write_text(text, encoding='utf-8')
    print('  template diperbaiki + kuis lama dibuang')


def main():
    for label in ['N5', 'N4', 'N3', 'N2']:
        fix_simple(ROOT / 'Materi' / f'Kanji-{label}.html', label)
    fix_n1(ROOT / 'Materi' / 'Kanji-N1.html')


if __name__ == '__main__':
    main()
