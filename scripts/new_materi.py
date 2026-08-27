#!/usr/bin/env python3
"""
Generator halaman materi NihongoPro.

Alasan skrip ini ada
--------------------
Materi v70-v74 dibuat manual dengan menyalin <head> dari materi lain. Cara itu
melewatkan komponen yang letaknya di <body>: service worker (offline), footer,
dan study timer. Akibatnya 7 materi harus diperbaiki belakangan (v75).

Skrip ini merakit halaman dari template yang sudah terverifikasi, sehingga
setiap komponen wajib SELALU ikut. Materi baru tidak bisa "lupa" service worker.

Pemakaian
---------
    from new_materi import build_materi, Section, Table, Cards, Quiz
    build_materi(slug='Grammar-Nagara', title='...', sections=[...], quiz=[...])

Validasi
--------
Setelah generate, jalankan:
    python3 scripts/validate.py     (cek paritas: SW + progress hook)
    node scripts/tests/run-all.js   (cek rantai XP)
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATERI_DIR = os.path.join(ROOT, 'Materi')
TPL_DIR = os.path.join(ROOT, 'scripts', 'templates')

BASE_URL = 'https://nihongopro.id'


# ── Blok konten ────────────────────────────────────────────────────

class Section:
    """Bagian dengan judul dan sub-judul; isinya diisi blok lain."""

    def __init__(self, label, heading, sub='', body=''):
        self.label, self.heading, self.sub, self.body = label, heading, sub, body

    def render(self):
        sub = f'<p class="sub">{self.sub}</p>' if self.sub else ''
        return f'''  <section class="section">
    <div class="inner">
      <div class="section-head"><div><div class="label">{self.label}</div><h2>{self.heading}</h2></div>{sub}</div>
{self.body}
    </div>
  </section>
'''


def speak_btn(jp):
    """Tombol TTS. Teks Jepang di-escape agar aman di dalam atribut onclick."""
    safe = jp.replace('\\', '\\\\').replace("'", "\\'")
    return (f'<button class="listen-btn" onclick="speak(\'{safe}\')" '
            f'aria-label="Dengar pengucapan">🔊</button>')


def Table(headers, rows, note=''):
    """Tabel kosakata/frasa. Baris terakhir tiap row boleh berupa teks Jepang
    untuk TTS: rows = [(jp, bacaan, arti), ...]"""
    th = ''.join(f'<th>{h}</th>' for h in headers)
    trs = []
    for row in rows:
        jp = row[0]
        tds = f'<td class="jp">{jp}</td>' + ''.join(f'<td>{c}</td>' for c in row[1:])
        trs.append(f'          <tr>{tds}<td>{speak_btn(jp)}</td></tr>')
    body = '\n'.join(trs)
    n = (f'\n      <p style="margin-top:.8rem;font-size:.9rem;color:var(--ink3,#666)">{note}</p>'
         if note else '')
    return f'''      <table class="table">
        <thead><tr>{th}<th>Audio</th></tr></thead>
        <tbody>
{body}
        </tbody>
      </table>{n}'''


def Cards(cards):
    """Kartu penjelasan. cards = [(judul, html_isi), ...]"""
    arts = []
    for title, inner in cards:
        arts.append(f'        <article class="card"><h3>{title}</h3>\n{inner}\n        </article>')
    return '      <div class="grid">\n' + '\n'.join(arts) + '\n      </div>'


def Examples(items):
    """Daftar contoh kalimat + TTS. items = [(jp, arti), ...]"""
    lis = []
    for jp, arti in items:
        lis.append(f'            <li><span class="jp">{jp}</span> {speak_btn(jp)}<br>{arti}</li>')
    return '          <ul>\n' + '\n'.join(lis) + '\n          </ul>'


# ── Kuis ───────────────────────────────────────────────────────────

def _js_str(s):
    """String JS aman: escape backslash, kutip, dan newline."""
    return (s.replace('\\', '\\\\').replace('"', '\\"')
             .replace('\n', ' ').replace('\r', ''))


def Quiz(questions):
    """questions = [{'q':..., 'opts':[4], 'a':idx, 'e':...}, ...]

    Memvalidasi setiap soal supaya jawaban selalu menunjuk opsi yang ada —
    kesalahan indeks tidak akan lolos diam-diam ke produksi.
    """
    for i, q in enumerate(questions, 1):
        if not (0 <= q['a'] < len(q['opts'])):
            raise ValueError(f"Soal {i}: indeks jawaban {q['a']} di luar {len(q['opts'])} opsi")
        if len(q['opts']) < 2:
            raise ValueError(f"Soal {i}: butuh minimal 2 opsi")

    items = []
    for q in questions:
        opts = ','.join(f'"{_js_str(o)}"' for o in q['opts'])
        items.append(
            f'  {{"q":"{_js_str(q["q"])}","opts":[{opts}],'
            f'"a":{q["a"]},"e":"{_js_str(q["e"])}"}}'
        )
    return 'var Q=[\n' + ',\n'.join(items) + '\n];'


QUIZ_ENGINE = '''
var ok=0,tot=0,qi=0,answered=false;
function renderQ(){
  if(qi>=Q.length){document.getElementById('quizBox').innerHTML='<div style="text-align:center;padding:1rem"><h3>Selesai! 🎉</h3><p>Skor akhir: '+ok+'/'+Q.length+'</p><button class="listen-btn" onclick="restartQ()" style="margin-top:.5rem">Ulangi</button></div>';return;}
  var q=Q[qi];answered=false;
  var html='<div style="font-weight:700;margin-bottom:.8rem">'+(qi+1)+'. '+q.q+'</div>';
  q.opts.forEach(function(o,i){html+='<button class="quiz-opt listen-btn" style="display:block;width:100%;text-align:left;margin:.35rem 0;background:var(--surface,#f5f5f5);color:var(--ink,#222)" onclick="ans('+i+')">'+o+'</button>';});
  html+='<div id="qexp" style="margin-top:.6rem;font-size:.9rem"></div>';
  document.getElementById('quizBox').innerHTML=html;
}
function ans(i){
  if(answered)return;answered=true;tot++;
  var q=Q[qi];var correct=i===q.a;if(correct)ok++;
  document.getElementById('okc').textContent=ok;
  document.getElementById('totc').textContent=tot;
  var btns=document.querySelectorAll('.quiz-opt');
  btns[q.a].style.background='#dcfce7';
  if(!correct)btns[i].style.background='#fee2e2';
  document.getElementById('qexp').innerHTML=(correct?'✅ Benar! ':'❌ ')+q.e+'<br><button class="listen-btn" onclick="nextQ()" style="margin-top:.5rem">Lanjut →</button>';
}
function nextQ(){qi++;renderQ();}
function restartQ(){qi=0;ok=0;tot=0;document.getElementById('okc').textContent=0;document.getElementById('totc').textContent=0;renderQ();}
renderQ();
'''

TTS_ENGINE = '''
function speak(t){
  if(!('speechSynthesis' in window)){alert('Browser tidak mendukung audio');return;}
  var u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=0.85;
  speechSynthesis.cancel();speechSynthesis.speak(u);
}
'''


def quiz_section(heading='🎯 Kuis'):
    return f'''  <section class="section">
    <div class="inner">
      <div class="section-head"><div><div class="label">Latihan</div><h2>{heading}</h2></div><p class="sub">Uji pemahamanmu. Jawab semua soal untuk menyelesaikan materi.</p></div>
      <div id="quizBox" class="card"></div>
      <div id="qs" style="text-align:center;margin-top:1rem;font-weight:700">Skor: <span id="okc">0</span>/<span id="totc">0</span></div>
    </div>
  </section>
'''


# ── Perakitan halaman ──────────────────────────────────────────────

def _read_tpl(name):
    path = os.path.join(TPL_DIR, name)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f'Template {name} tidak ada. Jalankan scripts/extract_templates.py dulu.')
    with open(path, encoding='utf-8') as f:
        return f.read()


def build_materi(slug, title, kicker, h1, lead, sections, quiz,
                 description, quiz_heading='🎯 Kuis'):
    """Rakit satu halaman materi lengkap dan tulis ke Materi/<slug>.html.

    Semua komponen wajib (service worker, footer, study timer, progress hook,
    NPXP) diambil dari template terverifikasi, jadi tidak mungkin terlewat.
    """
    head = _read_tpl('head.tpl')
    footer = _read_tpl('footer.tpl')
    tail = _read_tpl('tail.tpl')   # study timer + SW + script includes

    fname = f'{slug}.html'

    # Head: ganti judul, deskripsi, dan SEMUA URL kanonik ke slug ini.
    head = re.sub(r'<title>.*?</title>', f'<title>{html.escape(title)}</title>', head, flags=re.S)
    for attr in ['name="description"', 'property="og:description"', 'name="twitter:description"']:
        head = re.sub(rf'<meta {re.escape(attr)} content="[^"]*"',
                      f'<meta {attr} content="{html.escape(description)}"', head)
    for attr in ['property="og:title"', 'name="twitter:title"']:
        head = re.sub(rf'<meta {re.escape(attr)} content="[^"]*"',
                      f'<meta {attr} content="{html.escape(title)}"', head)
    # Kanonik + og:url harus menunjuk file ini, bukan file template.
    head = re.sub(r'(<link rel="canonical" href=")[^"]*(")',
                  rf'\g<1>{BASE_URL}/Materi/{fname}\g<2>', head)
    head = re.sub(r'(<meta property="og:url" content=")[^"]*(")',
                  rf'\g<1>{BASE_URL}/Materi/{fname}\g<2>', head)

    # JSON-LD: template menyalin nama/deskripsi materi lain (Google akan membaca
    # metadata yang salah). Tulis ulang dari data materi ini.
    course_ld = json.dumps({
        '@context': 'https://schema.org',
        '@type': 'Course',
        'name': title,
        'description': description,
        'url': f'{BASE_URL}/Materi/{fname}',
        'provider': {'@type': 'Organization', 'name': 'NihongoPro', 'url': BASE_URL},
        'inLanguage': 'id',
    }, ensure_ascii=False)

    breadcrumb_ld = json.dumps({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Beranda', 'item': f'{BASE_URL}/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Materi',
             'item': f'{BASE_URL}/Materi/Materi.html'},
            {'@type': 'ListItem', 'position': 3, 'name': title,
             'item': f'{BASE_URL}/Materi/{fname}'},
        ],
    }, ensure_ascii=False)

    ld_blocks = iter([course_ld, breadcrumb_ld])
    head = re.sub(
        r'<script type="application/ld\+json">.*?</script>',
        lambda m: f'<script type="application/ld+json">{next(ld_blocks, m.group(0))}</script>',
        head, count=2, flags=re.DOTALL,
    )

    body_sections = '\n'.join(s.render() for s in sections) + '\n' + quiz_section(quiz_heading)

    page = f'''{head}<body>
<main id="main-content">
  <section class="hero">
    <div class="inner">
      <div class="kicker">{kicker}</div>
      <h1>{h1}</h1>
      <p class="lead">{lead}</p>
    </div>
  </section>

{body_sections}</main>

{footer}

<script>{TTS_ENGINE}</script>

<script>
{Quiz(quiz)}
{QUIZ_ENGINE}</script>
{tail}
</body>
</html>'''

    out = os.path.join(MATERI_DIR, fname)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(page)
    return out


# ── Pendaftaran navigasi ───────────────────────────────────────────

def register(slug, nav_label, search_title, search_desc, search_tags,
             search_icon='📘', sitemap_label=None):
    """Daftarkan materi ke 4 lokasi navigasi.

    Menyisipkan sebagai DATA (object literal / elemen <a>), bukan lewat regex
    umum pada seluruh HTML — regex umum pernah merusak inline script Search.html.
    """
    fname = f'{slug}.html'
    sitemap_label = sitemap_label or search_title
    done = []

    # 1. Materi/Materi.html — hub Fondasi
    p = os.path.join(MATERI_DIR, 'Materi.html')
    c = open(p, encoding='utf-8').read()
    if slug not in c:
        anchor = '<a href="Fondasi-Bahasa-Jepang.html">Buka Fondasi</a>'
        if anchor in c:
            c = c.replace(anchor, anchor + f'<a href="{fname}">{nav_label}</a>', 1)
            open(p, 'w', encoding='utf-8').write(c)
            done.append('Materi.html')

    # 2. Search.html — data pencarian
    p = os.path.join(ROOT, 'Search.html')
    c = open(p, encoding='utf-8').read()
    if slug not in c:
        m = re.search(r"\{cat:'materi',", c)
        if m:
            entry = (f"{{cat:'materi',icon:'{search_icon}',title:'{search_title}',"
                     f"desc:'{search_desc}',url:'/Materi/{fname}',tags:'{search_tags}'}},\n  ")
            c = c[:m.start()] + entry + c[m.start():]
            open(p, 'w', encoding='utf-8').write(c)
            done.append('Search.html')

    # 3. Sitemap.html — salin elemen <a> materi yang sudah ada
    p = os.path.join(ROOT, 'Sitemap.html')
    c = open(p, encoding='utf-8').read()
    if slug not in c:
        i = c.find('Materi/Grammar-Teiru.html')
        if i > 0:
            a0 = c.rfind('<a ', 0, i)
            a1 = c.find('</a>', i) + 4
            tpl = c[a0:a1]
            new = tpl.replace('Grammar-Teiru.html', fname)
            new = re.sub(r'>[^<]*<span', f'>{html.escape(sitemap_label)}<span', new, count=1)
            c = c[:a0] + new + '\n' + c[a0:]
            open(p, 'w', encoding='utf-8').write(c)
            done.append('Sitemap.html')

    # 4. sitemap.xml
    p = os.path.join(ROOT, 'sitemap.xml')
    c = open(p, encoding='utf-8').read()
    if slug not in c:
        i = c.find('Grammar-Teiru')
        if i > 0:
            u0 = c.rfind('<url>', 0, i)
            u1 = c.find('</url>', i) + 6
            c = c[:u0] + c[u0:u1].replace('Grammar-Teiru', slug) + '\n' + c[u0:]
            open(p, 'w', encoding='utf-8').write(c)
            done.append('sitemap.xml')

    return done
