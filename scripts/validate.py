#!/usr/bin/env python3
"""
NihongoPro — Automated Site Validator
========================================
Consolidates every audit check performed manually during the v22-v26
review cycles into one repeatable script. Run this before every deploy.

Usage:
    python3 scripts/validate.py
    python3 scripts/validate.py --strict   # exit 1 on any warning too

Exit codes:
    0 = all checks passed (or only warnings, without --strict)
    1 = at least one ERROR found (or a WARNING with --strict)
"""

import re
import os
import sys
import json
import glob
import subprocess
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STRICT = '--strict' in sys.argv

errors = []
warnings = []
passed = []


def err(check, msg):
    errors.append(f"[{check}] {msg}")


def warn(check, msg):
    warnings.append(f"[{check}] {msg}")


def ok(check, msg):
    passed.append(f"[{check}] {msg}")


def all_html_files():
    return _index().html_paths


def rel(fpath):
    return os.path.relpath(fpath, ROOT)


def read(fpath):
    """Isi file, di-cache. Tiap file dibaca dari disk PERSIS SEKALI per run."""
    idx = _index()
    if fpath in idx.text:
        return idx.text[fpath]
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            idx.text[fpath] = f.read()
    except OSError:
        idx.text[fpath] = ''
    return idx.text[fpath]


class _Index:
    """Indeks proyek — dikumpulkan sekali, dipakai semua check.

    Validator lama memanggil glob.glob 10x dan membaca file yang sama berulang
    di 20 check berbeda: 28 detik untuk 304 halaman. Di sini tiap file dibaca
    sekali; check-check berikutnya memakai data yang sudah ada.
    """

    def __init__(self):
        self.html_paths = sorted(
            path for path in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)
            if 'node_modules' not in os.path.relpath(path, ROOT).split(os.sep)
        )

        # Semua file di repo (untuk cek src/href menunjuk file yang ada)
        self.all_files = set()
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames
                           if d not in ('.git', 'node_modules', '__pycache__')]
            for fn in filenames:
                self.all_files.add(os.path.join(dirpath, fn))

        self.text = {}      # path -> isi mentah
        self.ids = {}       # path -> set(id)
        self.markup = {}    # path -> isi TANPA <script> (href/src NYATA saja)
        self.hrefs = {}     # path -> [href]
        self.srcs = {}      # path -> [src]

        for p in self.html_paths:
            # Baca LANGSUNG, bukan lewat read(): read() memanggil _index(), dan
            # _IDX belum ter-assign selama __init__ masih berjalan → rekursi tak
            # terbatas. Cache-nya diisi di sini, jadi read() tetap nol-I/O nanti.
            try:
                with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                    c = f.read()
            except OSError:
                c = ''
            self.text[p] = c

            self.ids[p] = set(re.findall(r'\bid=["\']([^"\']+)["\']', c))

            # markup = HTML tanpa isi <script>. Dipakai untuk href & struktur
            # anchor, supaya string di dalam JS (mis. href="#'+id+'") tidak
            # dikira tautan sungguhan.
            m = re.sub(r'<script[\s\S]*?</script>', '', c)
            self.markup[p] = m
            self.hrefs[p] = re.findall(r'href=["\']([^"\']+)["\']', m)

            # src justru HARUS diambil dari teks mentah: <script src="..."> ada di
            # dalam tag <script>, jadi kalau kita pakai `m` (yang membuang seluruh
            # blok script) setiap JS eksternal luput dari pemeriksaan.
            self.srcs[p] = re.findall(r'<(?:script|img|iframe|source|audio|video)\b[^>]*?\bsrc=["\']([^"\']+)["\']', c)


_IDX = None


def _index():
    global _IDX
    if _IDX is None:
        _IDX = _Index()
    return _IDX


EXTERNAL_PREFIXES = ('http://', 'https://', 'mailto:', 'tel:', 'javascript:',
                     'data:', '//', 'sms:', 'intent:', '#!')


def is_external(href):
    return href.startswith(EXTERNAL_PREFIXES)


def resolve(href, from_path):
    """(path_absolut, fragment) untuk href lokal; (None, None) bila eksternal.

    Menangani: root-relative (/x.html), relatif (../x.html), query (?a=1),
    fragment (#id), dan href kosong.
    """
    if not href or is_external(href):
        return None, None

    frag = None
    if '#' in href:
        href, frag = href.split('#', 1)
    href = href.split('?')[0]

    if not href:                     # "#id" → halaman itu sendiri
        return from_path, frag

    if href.startswith('/'):
        target = os.path.join(ROOT, href.lstrip('/'))
    else:
        target = os.path.normpath(os.path.join(os.path.dirname(from_path), href))

    return target, frag


def is_in_script_tag(content, pos):
    before = content[:pos]
    return before.rfind('<script') > before.rfind('</script>')


# ──────────────────────────────────────────────────────────────────
# CHECK 1: JS syntax validity
# ──────────────────────────────────────────────────────────────────
def check_inline_js_syntax():
    """Syntax semua blok <script> inline, diperiksa seakurat browser (node).

    Versi lama menjalankan `node --check` sebagai subprocess TERPISAH untuk tiap
    blok script — ratusan proses, 23 detik dari total 30 detik runtime validator.
    Di sini semua blok dikirim ke SATU proses node yang memeriksanya berurutan
    dan melaporkan hasilnya sebagai JSON.
    """
    idx = _index()

    script_re = re.compile(r'<script((?![^>]*\bsrc=)[^>]*)>(.*?)</script>', re.DOTALL)
    blocks = []          # (file_rel, urutan, kode, is_module)

    for p in idx.html_paths:
        for n, (attrs, body) in enumerate(script_re.findall(idx.text[p])):
            b = body.strip()
            if len(b) < 10:
                continue
            # JSON-LD dan blok data murni bukan JavaScript — lewati.
            if b.startswith('{') or b.startswith('['):
                continue
            # type="module" mendukung import/export -- vm.Script (non-module)
            # akan salah melaporkan "Cannot use import statement outside a
            # module" sebagai error sintaks padahal itu genuinely valid ES
            # module. Ditandai terpisah supaya diperiksa dengan cara yang benar.
            is_module = bool(re.search(r'type\s*=\s*["\']module["\']', attrs))
            blocks.append({'file': rel(p), 'i': n, 'code': body, 'is_module': is_module})

    if not blocks:
        ok('inline-js-syntax', 'No inline scripts to check')
        return

    # Satu proses node memeriksa semua blok. Blok type="module" divalidasi
    # lewat vm.SourceTextModule (butuh --experimental-vm-modules) karena
    # vm.Script biasa tidak mendukung import/export -- salah lapor sebagai
    # error sintaks padahal modul itu valid.
    checker = """
const vm = require('vm');
let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', async () => {
  const blocks = JSON.parse(input);
  const bad = [];
  for (const b of blocks) {
    try {
      if (b.is_module) {
        if (typeof vm.SourceTextModule !== 'function') {
          continue;
        }
        const mod = new vm.SourceTextModule(b.code, { identifier: b.file });
        await mod.link(() => { throw new Error('__skip_link__'); }).catch(e => {
          if (!String(e.message).includes('__skip_link__')) throw e;
        });
      } else {
        new vm.Script(b.code, { filename: b.file });
      }
    } catch (e) {
      bad.push({ file: b.file, i: b.i, msg: String(e.message).slice(0, 150) });
    }
  }
  process.stdout.write(JSON.stringify(bad));
});
"""

    try:
        proc = subprocess.run(
            ['node', '--experimental-vm-modules', '-e', checker],
            input=json.dumps(blocks),
            capture_output=True, text=True, timeout=120,
        )
    except FileNotFoundError:
        warn('inline-js-syntax', 'node tidak ditemukan — validasi JS inline dilewati')
        return
    except subprocess.TimeoutExpired:
        err('inline-js-syntax', 'Pemeriksaan JS inline melebihi batas waktu')
        return

    try:
        bad = json.loads(proc.stdout or '[]')
    except json.JSONDecodeError:
        err('inline-js-syntax', f'Pemeriksa JS gagal: {proc.stderr[:200]}')
        return

    if bad:
        for b in bad[:6]:
            err('inline-js-syntax', f"{b['file']} (script #{b['i']}): {b['msg']}")
        if len(bad) > 6:
            err('inline-js-syntax', f'…dan {len(bad) - 6} blok bermasalah lainnya')
    else:
        ok('inline-js-syntax',
           f'{len(blocks)} inline scripts across {len(idx.html_paths)} HTML files have valid syntax')


def check_js_syntax():
    js_files = glob.glob(os.path.join(ROOT, 'assets', '*.js')) + \
        glob.glob(os.path.join(ROOT, 'netlify', 'functions', '*.js')) + \
        glob.glob(os.path.join(ROOT, 'api', '*.js'))
    bad = []
    for f in js_files:
        try:
            result = subprocess.run(['node', '--check', f], capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                bad.append((rel(f), result.stderr.strip()[:200]))
        except FileNotFoundError:
            warn('js-syntax', 'node not found — skipping JS syntax validation')
            return
        except Exception as e:
            bad.append((rel(f), str(e)))
    if bad:
        for f, e in bad:
            err('js-syntax', f'{f}: {e}')
    else:
        ok('js-syntax', f'{len(js_files)} JS files have valid syntax')


# ──────────────────────────────────────────────────────────────────
# CHECK 2: JSON validity (manifests, configs)
# ──────────────────────────────────────────────────────────────────
def check_json_validity():
    json_files = ['manifest.webmanifest', 'manifest.json', 'vercel.json']
    bad = []
    checked = 0
    for name in json_files:
        fpath = os.path.join(ROOT, name)
        if not os.path.exists(fpath):
            continue
        checked += 1
        try:
            json.loads(read(fpath))
        except json.JSONDecodeError as e:
            bad.append((name, str(e)))
    if bad:
        for f, e in bad:
            err('json-validity', f'{f}: {e}')
    else:
        ok('json-validity', f'{checked} JSON config files are valid')


# ──────────────────────────────────────────────────────────────────
# CHECK 3: Broken internal links
# ──────────────────────────────────────────────────────────────────
def check_broken_links():
    files = all_html_files()
    all_set = {rel(f) for f in files}
    broken = []
    for fpath in files:
        r = rel(fpath)
        c = read(fpath)
        for link in re.findall(r'href="([^"#?]+\.html)"', c):
            if link.startswith('http') or link.startswith('//'):
                continue
            folder = os.path.dirname(r)
            target = link.lstrip('/') if link.startswith('/') else os.path.normpath(os.path.join(folder, link))
            target = target.replace('\\', '/')
            if target not in all_set:
                broken.append((r, link, target))
    if broken:
        for r, link, target in broken:
            err('broken-links', f'{r} → "{link}" (resolved: {target}) does not exist')
    else:
        ok('broken-links', f'0 broken internal links across {len(files)} pages')


# ──────────────────────────────────────────────────────────────────
# CHECK 4: Domain consistency in canonical / og:url / sitemap
# ──────────────────────────────────────────────────────────────────
CANONICAL_DOMAIN = 'nihongopro.id'


def check_domain_consistency():
    files = all_html_files()
    bad_domain = []
    for fpath in files:
        r = rel(fpath)
        c = read(fpath)
        for m in re.finditer(r'(?:canonical|og:url)["\']?\s+(?:href|content)="(https?://([^/"]+))', c):
            domain = m.group(2)
            if domain != CANONICAL_DOMAIN:
                bad_domain.append((r, domain))
    sitemap_path = os.path.join(ROOT, 'sitemap.xml')
    if os.path.exists(sitemap_path):
        sm = read(sitemap_path)
        loc_urls = re.findall(r'<loc>(https?://([^/]+))/', sm)
        sm_domains = {d for _, d in loc_urls}
        for d in sm_domains:
            if d != CANONICAL_DOMAIN:
                bad_domain.append(('sitemap.xml', d))
    if bad_domain:
        for r, d in bad_domain:
            err('domain-consistency', f'{r}: uses domain "{d}" instead of "{CANONICAL_DOMAIN}"')
    else:
        ok('domain-consistency', f'All canonical/og:url/sitemap entries use {CANONICAL_DOMAIN}')


# ──────────────────────────────────────────────────────────────────
# CHECK 5: Canonical URL matches actual filename
# ──────────────────────────────────────────────────────────────────
def check_canonical_filename_match():
    files = all_html_files()
    mismatches = []
    for fpath in files:
        r = rel(fpath)
        fname = os.path.basename(fpath)
        c = read(fpath)
        m = re.search(r'rel="canonical"\s+href="(https?://[^"]+)"', c)
        if m:
            url_fname = m.group(1).split('/')[-1]
            if url_fname and url_fname != fname and url_fname.endswith('.html'):
                mismatches.append((r, url_fname))
    if mismatches:
        for r, f in mismatches:
            err('canonical-match', f'{r}: canonical points to "{f}" (filename mismatch)')
    else:
        ok('canonical-match', 'All canonical URLs match their actual filename')


# ──────────────────────────────────────────────────────────────────
# CHECK 6: SEO basics — meta description, title, H1, schema.org
# ──────────────────────────────────────────────────────────────────
def check_seo_basics():
    # File berawalan '_' adalah halaman internal (mis. _REVIEW.html) yang di-noindex,
    # jadi tidak wajib punya meta SEO publik.
    files = [f for f in all_html_files() if not os.path.basename(f).startswith('_')]
    no_desc, short_desc, no_title, no_h1, no_schema = [], [], [], [], []
    no_og = []
    for fpath in files:
        r = rel(fpath)
        c = read(fpath)

        # Halaman noindex (privat/redirect) tidak wajib punya Open Graph.
        head = c[:c.find('</head>')] if '</head>' in c else c
        is_noindex = 'noindex' in head
        if not is_noindex:
            if 'og:title' not in c or 'og:description' not in c or 'twitter:card' not in c:
                no_og.append(r)

        desc_m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', c)
        if not desc_m or not desc_m.group(1).strip():
            no_desc.append(r)
        elif len(desc_m.group(1)) < 50:
            short_desc.append(r)

        title_m = re.search(r'<title>([^<]+)</title>', c)
        if not title_m or not title_m.group(1).strip():
            no_title.append(r)

        if not re.search(r'<h1[\s>]', c):
            no_h1.append(r)

        if 'application/ld+json' not in c and 'Admin' not in r:
            no_schema.append(r)

    if no_desc:
        err('seo-meta-desc', f'{len(no_desc)} pages missing meta description: {no_desc[:5]}{"..." if len(no_desc) > 5 else ""}')
    else:
        ok('seo-meta-desc', f'All {len(files)} pages have a meta description')

    if short_desc:
        warn('seo-meta-desc-length', f'{len(short_desc)} pages have a meta description under 50 chars: {short_desc[:5]}')

    if no_title:
        err('seo-title', f'{len(no_title)} pages missing <title>: {no_title}')
    else:
        ok('seo-title', f'All {len(files)} pages have a title')

    if no_h1:
        err('seo-h1', f'{len(no_h1)} pages missing <h1>: {no_h1}')
    else:
        ok('seo-h1', f'All {len(files)} pages have an H1')

    if no_schema:
        warn('seo-schema', f'{len(no_schema)} non-admin pages missing schema.org: {no_schema}')
    else:
        ok('seo-schema', 'All non-admin pages have schema.org markup')

    if no_og:
        warn('seo-open-graph', f'{len(no_og)} indexable pages missing og:/twitter: tags: {no_og[:5]}')
    else:
        ok('seo-open-graph', 'All indexable pages have Open Graph + Twitter cards')


# ──────────────────────────────────────────────────────────────────
# CHECK 7: Duplicate static HTML ids (excludes JS template literals)
# ──────────────────────────────────────────────────────────────────
def check_duplicate_ids():
    files = all_html_files()
    issues = []
    for fpath in files:
        r = rel(fpath)
        c = read(fpath)
        static_ids = []
        for m in re.finditer(r'\bid="([a-zA-Z][\w-]*)"', c):
            if not is_in_script_tag(c, m.start()):
                static_ids.append(m.group(1))
        dupes = [i for i, cnt in Counter(static_ids).items() if cnt > 1]
        if dupes:
            issues.append((r, dupes))
    if issues:
        for r, d in issues:
            err('duplicate-ids', f'{r}: duplicate static IDs {d}')
    else:
        ok('duplicate-ids', f'No duplicate static HTML ids across {len(files)} pages')


# ──────────────────────────────────────────────────────────────────
# CHECK 8: Accessibility — alt text, lang attribute, form labels
# ──────────────────────────────────────────────────────────────────
def check_accessibility():
    files = all_html_files()
    no_alt, no_lang, unlabeled = [], [], []
    for fpath in files:
        r = rel(fpath)
        c = read(fpath)

        for img in re.findall(r'<img\s+[^>]*>', c):
            if 'alt=' not in img:
                no_alt.append((r, img[:60]))

        if not re.search(r'<html[^>]*\slang=', c):
            no_lang.append(r)

        for inp_m in re.finditer(r'<input\s+[^>]*>', c):
            inp = inp_m.group(0)
            if 'type="hidden"' in inp:
                continue
            has_aria = 'aria-label' in inp or 'aria-labelledby' in inp
            id_m = re.search(r'id="([^"]+)"', inp)
            has_for_label = bool(id_m) and f'for="{id_m.group(1)}"' in c
            # Check implicit wrapping: <label> ... <input> ... </label>
            before = c[:inp_m.start()]
            last_label_open = before.rfind('<label')
            last_label_close = before.rfind('</label>')
            is_wrapped_in_label = last_label_open > last_label_close
            if not has_aria and not has_for_label and not is_wrapped_in_label and 'placeholder' not in inp:
                unlabeled.append((r, inp[:60]))

    if no_alt:
        err('a11y-alt', f'{len(no_alt)} images missing alt text')
    else:
        ok('a11y-alt', f'All images have alt text across {len(files)} pages')

    if no_lang:
        err('a11y-lang', f'{len(no_lang)} pages missing lang attribute: {no_lang}')
    else:
        ok('a11y-lang', 'All pages have a lang attribute')

    if unlabeled:
        warn('a11y-labels', f'{len(unlabeled)} form inputs without label/aria-label: {[u[0] for u in unlabeled][:5]}')
    else:
        ok('a11y-labels', 'All form inputs have labels or aria-labels')


# ──────────────────────────────────────────────────────────────────
# CHECK 9: Security — no hardcoded secrets, no localStorage premium trust
# ──────────────────────────────────────────────────────────────────
def check_security():
    files = all_html_files() + glob.glob(os.path.join(ROOT, 'assets', '*.js')) + \
        glob.glob(os.path.join(ROOT, 'netlify', 'functions', '*.js'))
    secret_pattern = re.compile(r'sk-ant-[a-zA-Z0-9_-]{10,}|sk-proj-[a-zA-Z0-9_-]{10,}|AIza[a-zA-Z0-9_-]{20,}')
    leaks = []
    for fpath in files:
        c = read(fpath)
        for m in secret_pattern.finditer(c):
            leaks.append((rel(fpath), m.group(0)[:15] + '...'))
    if leaks:
        for r, s in leaks:
            err('security-secrets', f'{r}: possible hardcoded API key "{s}"')
    else:
        ok('security-secrets', 'No hardcoded API keys found')

    # Check premium trust isn't solely client-side localStorage flag
    ai_js = os.path.join(ROOT, 'assets', 'nihongo-ai.js')
    if os.path.exists(ai_js):
        c = read(ai_js)
        if re.search(r"localStorage\.getItem\('np-premium'\)\s*===\s*'1'", c):
            err('security-premium-bypass', 'nihongo-ai.js still trusts localStorage np-premium flag directly')
        else:
            ok('security-premium-bypass', 'Premium status is not solely trusted from localStorage')

    # Check admin login has no hardcoded plaintext password
    admin_login = os.path.join(ROOT, 'Admin-Login.html')
    if os.path.exists(admin_login):
        c = read(admin_login)
        if re.search(r"password\s*===\s*'[a-zA-Z0-9]{4,}'", c):
            err('security-hardcoded-admin', 'Admin-Login.html contains a hardcoded plaintext password check')
        else:
            ok('security-hardcoded-admin', 'No hardcoded admin password found')

    # Check TURN/STUN credentials are not hardcoded as literal fallbacks in the
    # frontend. TURN credentials in `credential: '...'` string literals are
    # visible to every visitor and let anyone abuse relay bandwidth. They must
    # come from EDUMA_ENV (Netlify env), not literal defaults.
    turn_leaks = []
    for fpath in all_html_files():
        c = read(fpath)
        # Only inspect files that actually configure WebRTC ICE servers.
        if 'iceServers' not in c:
            continue
        # A hardcoded `credential: '...'` literal is the reliable TURN-secret
        # signal (STUN needs no credential; only TURN does). `username` alone is
        # too generic (guest usernames etc.), so key on credential literals.
        for m in re.finditer(r"credential\s*:\s*'([^']{3,})'", c):
            turn_leaks.append((rel(fpath), m.group(1)[:12]))
    if turn_leaks:
        for r, v in turn_leaks[:5]:
            err('security-turn-credentials', f'{r}: hardcoded TURN credential literal "{v}..." — move to EDUMA_ENV')
    else:
        ok('security-turn-credentials', 'No hardcoded TURN/ICE credentials in frontend')

    # Payment identity must come from a server-verified Supabase JWT. A userId
    # supplied by the browser can otherwise bind a successful payment to the
    # wrong account.
    payment_fn = os.path.join(ROOT, 'netlify', 'functions', 'create-payment.js')
    if os.path.exists(payment_fn):
        c = read(payment_fn)
        has_jwt_check = "auth/v1/user" in c and "authHeader.startsWith('Bearer ')" in c
        trusts_body_user = re.search(r"body\.userId|body\[['\"]userId['\"]\]", c)
        if not has_jwt_check or trusts_body_user:
            err('security-payment-identity', 'create-payment.js must derive user identity from a verified JWT, not request body')
        else:
            ok('security-payment-identity', 'Payment identity is derived from a verified Supabase JWT')


# ──────────────────────────────────────────────────────────────────
# CHECK 10: No URL-unsafe folder names (spaces)
# ──────────────────────────────────────────────────────────────────
def check_folder_names():
    space_folders = []
    for f in glob.glob(os.path.join(ROOT, '**/'), recursive=True):
        if os.path.normpath(f) == os.path.normpath(ROOT):
            continue
        name = os.path.basename(f.rstrip('/'))
        if ' ' in name:
            space_folders.append(rel(f))
    if space_folders:
        err('folder-names', f'Folders with spaces (URL-unsafe): {space_folders}')
    else:
        ok('folder-names', 'No folders with spaces in their name')


# ──────────────────────────────────────────────────────────────────
# CHECK 11: Service worker cache version present
# ──────────────────────────────────────────────────────────────────
def check_service_worker():
    for fname in ['sw.js', 'service-worker.js']:
        fpath = os.path.join(ROOT, fname)
        if not os.path.exists(fpath):
            continue
        c = read(fpath)
        if 'allSettled' not in c:
            warn('sw-resilience', f'{fname} does not use Promise.allSettled for precache — one missing file may fail entire install')
        else:
            ok('sw-resilience', f'{fname} uses allSettled for resilient precache install')


# ──────────────────────────────────────────────────────────────────
# CHECK 12: Global object usage cross-referenced with script loading
# ──────────────────────────────────────────────────────────────────
GLOBAL_OBJECT_DEPENDENCIES = {
    'NihongoProgress': ('platform.min.js', 'platform.js'),
    'NihongoAI': ('nihongo-ai.js',),
    'EDUMA_DATA': ('eduma-data.js',),
}


def check_global_object_dependencies():
    files = all_html_files()
    issues = []
    for fpath in files:
        r = rel(fpath)
        c = read(fpath)
        defines_own = re.search(r'(?:window|global)\.NihongoProgress\s*=\s*\{', c)
        for obj_name, script_names in GLOBAL_OBJECT_DEPENDENCIES.items():
            if not re.search(r'\b' + obj_name + r'\b', c):
                continue
            if obj_name == 'NihongoProgress' and defines_own:
                continue
            loaded = any(s in c for s in script_names) or any(
                re.search(r'src="[^"]*' + re.escape(s.replace('.min', '')) + r'"', c) for s in script_names
            )
            if not loaded:
                issues.append((r, obj_name, script_names[0]))
    if issues:
        for r, obj, src in issues:
            err('global-deps', f'{r}: uses "{obj}" but does not load {src}')
    else:
        ok('global-deps', 'All pages load the scripts their global object usage depends on')


# ──────────────────────────────────────────────────────────────────
# CHECK 13: env.js variable names match what consumer scripts read
# ──────────────────────────────────────────────────────────────────
def check_env_variable_consistency():
    env_path = os.path.join(ROOT, 'assets', 'env.js')
    if not os.path.exists(env_path):
        return
    env_c = read(env_path)
    defined_vars = set(re.findall(r'(\w+):\s*read\(', env_c))

    consumer_files = glob.glob(os.path.join(ROOT, 'assets', '*.js')) + all_html_files()
    used_vars = set()
    for fpath in consumer_files:
        if fpath == env_path or '.min.' in fpath:
            continue
        c = read(fpath)
        used_vars |= set(re.findall(r'EDUMA_ENV\??\.(\w+)', c))
        used_vars |= set(re.findall(r'\benv\.(\w+)', c))

    # Only flag vars that look like they SHOULD be env vars (uppercase convention)
    used_vars = {v for v in used_vars if v.isupper() or '_' in v}
    missing = used_vars - defined_vars
    # Filter out known false positives (generic .env access on non-EDUMA objects)
    missing = {v for v in missing if v not in ('NODE_ENV', 'PROD', 'DEV', 'MODE')}

    if missing:
        err('env-consistency', f'Variables read by consumers but not defined in env.js: {sorted(missing)}')
    else:
        ok('env-consistency', 'All EDUMA_ENV variables read by consumers are defined in env.js')


# ──────────────────────────────────────────────────────────────────
# CHECK 14: Unit test suite (SRS algorithm, XP/level system)
# ──────────────────────────────────────────────────────────────────
def check_unit_tests():
    runner = os.path.join(ROOT, 'scripts', 'tests', 'run-all.js')
    if not os.path.exists(runner):
        warn('unit-tests', 'No test runner found at scripts/tests/run-all.js — skipping')
        return
    try:
        result = subprocess.run(['node', runner], capture_output=True, text=True, timeout=30, cwd=ROOT)
    except FileNotFoundError:
        warn('unit-tests', 'node not found — skipping unit test execution')
        return
    except Exception as e:
        err('unit-tests', f'Failed to run test suite: {e}')
        return

    last_line = [l for l in result.stdout.strip().split('\n') if l.startswith('RESULT:')]
    summary = last_line[-1] if last_line else '(no summary line found)'

    if result.returncode != 0:
        err('unit-tests', f'Test suite failed — {summary}')
        for line in result.stdout.split('\n'):
            if '❌' in line or '→' in line:
                err('unit-tests', f'  {line.strip()}')
    else:
        ok('unit-tests', f'All unit tests passed — {summary}')



def check_materi_parity():
    """Setiap halaman materi harus punya fitur inti: service worker (offline),
    footer (navigasi), dan progress tracking (XP/gamifikasi).
    Mencegah regresi saat materi baru ditambahkan."""
    materi_dir = os.path.join(ROOT, 'Materi')
    if not os.path.isdir(materi_dir):
        return

    missing_sw, missing_footer, missing_progress = [], [], []
    bad_jsonld = []
    empty_materi = []
    total = 0
    for fname in sorted(os.listdir(materi_dir)):
        if not fname.endswith('.html'):
            continue
        # Materi.html adalah halaman indeks, bukan materi pembelajaran
        if fname == 'Materi.html':
            continue
        total += 1
        c = read(os.path.join(materi_dir, fname))
        if 'serviceWorker.register' not in c and 'kaigo-quiz.js' not in c:
            missing_sw.append(fname)
        if '<footer' not in c:
            missing_footer.append(fname)

        # JSON-LD Course.name harus cocok dengan judul halaman. Template yang
        # disalin antar-materi pernah membawa nama materi lain, sehingga Google
        # mengindeks beberapa halaman dengan nama identik yang salah.
        head = c.split('</head>')[0]
        title_m = re.search(r'<title>(.*?)</title>', head, re.DOTALL)
        page_title = title_m.group(1).split('—')[0].strip() if title_m else ''
        for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>',
                             head, re.DOTALL):
            try:
                data = json.loads(m.group(1))
            except (ValueError, TypeError):
                continue
            if data.get('@type') != 'Course':
                continue
            ld_name = data.get('name', '')
            if page_title and ld_name:
                def words(s):
                    return set(re.sub(r'[()（）]', ' ', s.lower()).split())
                if not (words(page_title) & words(ld_name)):
                    bad_jsonld.append(f'{fname} (JSON-LD: "{ld_name[:30]}")')
        # Progress tracking bisa lewat modul auto-hook (kaigo-progress.js /
        # np-materi-progress.js) ATAU panggilan NPXP langsung untuk kuis
        # dengan pola non-standar. Halaman tanpa kuis tidak wajib punya hook.
        has_quiz = ('"q":' in c) or ("{q:" in c) or ('var Q' in c)
        has_progress = (
            'np-materi-progress.js' in c
            or 'kaigo-progress.js' in c
            or re.search(r'NPXP\.(recordQuiz|recordVocab|award|recordSession)\s*\(', c)
        )
        if has_quiz and not has_progress:
            missing_progress.append(fname)

        # Deteksi materi placeholder/kosong: materi pembelajaran bahasa Jepang
        # harus memuat konten Jepang yang memadai (di HTML maupun di array data
        # JS seperti kuis/kosakata). Ambang 50 karakter kana/kanji sangat
        # konservatif — materi asli rata-rata ribuan. Ini menangkap file yang
        # ter-deploy sebagai kerangka kosong tanpa isi pelajaran.
        # PENGECUALIAN: materi yang memuat datanya secara dinamis (fetch JSON /
        # skrip data khusus seperti kanji-writing.js) wajar punya sedikit teks
        # Jepang inline — jangan tandai sebagai kosong.
        loads_external_data = (
            'fetch(' in c
            or 'kanji-writing.js' in c
            or re.search(r'<script src="[^"]*(?:kanji|vocab|data)[^"]*\.js', c) is not None
        )
        jp_chars = len(re.findall(r'[\u3040-\u30ff\u4e00-\u9fff]', c))
        if jp_chars < 50 and not loads_external_data:
            empty_materi.append(f'{fname} ({jp_chars} char JP)')

    def report(label, items, msg, level='err'):
        if items:
            sample = ', '.join(items[:5]) + (f' (+{len(items) - 5} lagi)' if len(items) > 5 else '')
            (err if level == 'err' else warn)('materi-parity', f'{len(items)}/{total} materi {msg}: {sample}')
        else:
            ok('materi-parity', f'All {total} materi have {label}')

    report('service worker (offline support)', missing_sw, 'tanpa serviceWorker.register')
    report('progress tracking on quiz pages', missing_progress, 'punya kuis tapi tanpa progress hook')
    report('matching JSON-LD Course name', bad_jsonld,
           'punya JSON-LD Course.name yang tidak cocok dengan judul halaman')
    report('sufficient Japanese content', empty_materi,
           'nyaris tanpa konten Jepang (placeholder/kosong?)')
    # Footer bukan standar universal di semua materi (banyak materi lama tidak punya),
    # jadi hanya dilaporkan sebagai catatan, bukan error.
    if not missing_footer:
        ok('materi-parity', f'All {total} materi have footer')


def check_search_index():
    """Setiap materi harus bisa ditemukan lewat Search.html.

    INDEX dulu ditulis manual, sehingga 205 dari 254 materi tak pernah
    didaftarkan — pengguna mencari materi yang ada tapi tidak menemukannya.
    Perbaikan: scripts/build_search_index.py membangun INDEX dari file materi.
    Check ini memastikan indeks tidak usang lagi setelah materi ditambah.
    """
    search_path = os.path.join(ROOT, 'Search.html')
    materi_dir = os.path.join(ROOT, 'Materi')
    if not (os.path.exists(search_path) and os.path.isdir(materi_dir)):
        return

    index = read(search_path)
    indexed = set(re.findall(r"url:'/Materi/([^']+\.html)'", index))

    on_disk = {
        f for f in os.listdir(materi_dir)
        if f.endswith('.html') and f != 'Materi.html' and not f.startswith('_')
    }

    missing = sorted(on_disk - indexed)
    stale = sorted(indexed - on_disk)

    if missing:
        sample = ', '.join(missing[:5]) + (f' (+{len(missing) - 5} lagi)' if len(missing) > 5 else '')
        err('search-index',
            f'{len(missing)}/{len(on_disk)} materi tidak bisa dicari di Search.html: {sample} '
            f'— jalankan: python3 scripts/build_search_index.py')
    else:
        ok('search-index', f'All {len(on_disk)} materi are findable via Search.html')

    if stale:
        sample = ', '.join(stale[:5])
        err('search-index',
            f'{len(stale)} entri Search.html menunjuk materi yang sudah tidak ada: {sample}')


def check_missing_dom_elements():
    """Cari getElementById(...) yang elemennya tidak ada dan diakses tanpa guard.

    Bug nyata yang ditemukan lewat check ini di Kelas-Online.html:
      - #liveToast tidak ada → liveNotify() diam-diam gagal, 79 notifikasi
        (termasuk 'Koneksi terputus') tidak pernah tampil.
      - #aiSenseiPanel tidak ada → tombol AI Sensei melempar TypeError.
      - #liveToolBar tidak ada → masuk ruang kelas melempar TypeError.

    Pola khasnya: CSS dan fungsi sudah ditulis, markup-nya lupa. Halaman tetap
    lolos syntax check, jadi hanya cek seperti ini yang menangkapnya.
    """
    for path in all_html_files():
        rel = os.path.relpath(path, ROOT)
        c = read(path)

        static_ids = set(re.findall(r'id=["\']([^"\']+)["\']', c))
        # Elemen yang dibuat dinamis: el.id = 'foo'
        dynamic_ids = set(re.findall(r"""\.id\s*=\s*['"]([^'"]+)['"]""", c))
        available = static_ids | dynamic_ids

        # Hanya akses langsung (.style, .classList, .value, ...) yang bisa
        # melempar TypeError. getElementById(...) yang hasilnya disimpan lalu
        # dicek (if (!el) return) aman dan tidak dilaporkan.
        crashers = set()
        for m in re.finditer(r"""getElementById\(\s*['"]([^'"]+)['"]\s*\)\s*\.\w+""", c):
            eid = m.group(1)
            if eid not in available:
                crashers.add(eid)

        if crashers:
            sample = ', '.join(f'#{e}' for e in sorted(crashers)[:5])
            extra = f' (+{len(crashers) - 5} lagi)' if len(crashers) > 5 else ''
            err('missing-dom',
                f'{rel}: {len(crashers)} elemen diakses langsung tapi tidak ada di DOM '
                f'(akan melempar TypeError): {sample}{extra}')

        # FITUR MATI SENYAP: fungsi init* / render* yang langsung `return` karena
        # container-nya tidak ada. Tidak crash, jadi tidak pernah ketahuan — tapi
        # fiturnya tidak pernah jalan.
        #
        # Bug nyata yang tertangkap pola ini:
        #   - initAIHub() di AI-Tutor-Pro → 10 AI tools tidak pernah dirender.
        #   - liveNotify() di Kelas-Online → 79 notifikasi tidak pernah tampil.
        dead_features = []
        pattern = re.compile(
            r"""function\s+((?:init|render|setup|mount|build)\w*)\s*\([^)]*\)\s*\{\s*
                (?:const|let|var)\s+\w+\s*=\s*document\.getElementById\(\s*['"]([^'"]+)['"]\s*\)\s*;\s*
                if\s*\(\s*!\s*\w+\s*\)\s*return\s*;""",
            re.VERBOSE,
        )
        for m in pattern.finditer(c):
            fn_name, eid = m.group(1), m.group(2)
            if eid in available:
                continue   # container ada → fungsi bisa jalan
            # Fungsi ini benar-benar dipanggil? Kalau tidak, itu cuma kode mati.
            called = len(re.findall(rf'(?<![\w.]){re.escape(fn_name)}\s*\(', c)) - 1
            if called > 0:
                dead_features.append(f'{fn_name}() → #{eid}')

        if dead_features:
            sample = ', '.join(dead_features[:3])
            extra = f' (+{len(dead_features) - 3} lagi)' if len(dead_features) > 3 else ''
            err('dead-feature',
                f'{rel}: {len(dead_features)} fitur dipanggil tapi langsung berhenti '
                f'karena container-nya tidak ada di DOM: {sample}{extra}')


def check_class_selector_crashers():
    """Cari querySelector('.className') yang diakses langsung tanpa guard,
    di mana .className tidak pernah muncul sebagai class="..." di HTML.

    Bug nyata yang ditemukan lewat check ini (v181): 25 dari 26 halaman yang
    memuat toggleTheme()/IIFE dark-mode punya
    document.querySelector('.theme-toggle').textContent=... TANPA guard,
    padahal elemen <button class="theme-toggle"> tidak pernah ada di HTML
    halaman itu — menyebabkan "Cannot set properties of null" di SETIAP
    load halaman (bukan cuma saat fitur dipakai, karena ini IIFE top-level).

    Pola serupa check_missing_dom_elements (yang cek getElementById), tapi
    untuk querySelector dengan class selector sederhana (.foo), yang tidak
    tertangkap check itu karena bentuknya berbeda.
    """
    for path in all_html_files():
        rel = os.path.relpath(path, ROOT)
        c = read(path)

        static_classes = set()
        for m in re.finditer(r'class=["\']([^"\']+)["\']', c):
            static_classes.update(m.group(1).split())
        # Elemen kelas yang dibuat dinamis: el.className = 'foo' / el.classList.add('foo')
        dynamic_classes = set(re.findall(r"""classList\.add\(\s*['"]([^'"]+)['"]""", c))
        dynamic_classes |= set(re.findall(r"""\.className\s*=\s*['"]([^'"]+)['"]""", c))
        available = static_classes | dynamic_classes

        crashers = set()
        # querySelector('.foo').xxx -- akses langsung tanpa disimpan ke variabel dulu
        for m in re.finditer(r"""querySelector\(\s*['"]\.([\w-]+)['"]\s*\)\s*\.\w+""", c):
            cls = m.group(1)
            if cls not in available:
                crashers.add(cls)

        if crashers:
            sample = ', '.join(f'.{c}' for c in sorted(crashers)[:5])
            extra = f' (+{len(crashers) - 5} lagi)' if len(crashers) > 5 else ''
            err('class-selector-crash',
                f'{rel}: querySelector mengakses class yang tidak ada di HTML tanpa guard '
                f'(akan melempar TypeError setiap load): {sample}{extra}')


def check_vocab_csv_columns():
    """Urutan kolom vocab-all.csv dibaca lewat indeks, jadi tidak boleh berubah.

    Tiga berkas membaca kamus ini dengan indeks posisi — translator.js,
    pro-app.js, dan Materi/Flashcard-Lengkap.html. Karena indeks tidak menyebut
    nama kolom, pergeseran satu kolom tidak menimbulkan error apa pun; ia hanya
    menampilkan isi yang salah.

    Itu yang sempat terjadi: meaning dibaca dari kolom romaji. Romaji kosong di
    7.972 dari 11.843 baris, sehingga entri itu dibuang filter, dan 3.871
    sisanya menampilkan romaji sebagai arti (嗚呼 → "aa" alih-alih "Ah!; Oh!").
    Kolom meaning_id — satu-satunya yang berbahasa Indonesia, terisi penuh —
    tidak pernah dibaca siapa pun. Level pun ikut salah: semua entri berlabel
    N1 karena levelFromTags menerima kolom meaning, bukan tags.
    """
    EXPECTED = ['expression', 'reading', 'romaji', 'meaning', 'meaning_id', 'tags']

    path = os.path.join(ROOT, 'assets', 'vocab-all.csv')
    if not os.path.exists(path):
        err('vocab-csv', 'assets/vocab-all.csv tidak ada')
        return

    with open(path, encoding='utf-8-sig') as f:
        header = [c.strip() for c in f.readline().strip().split(',')]

    if header != EXPECTED:
        err('vocab-csv',
            f'Urutan kolom vocab-all.csv berubah: {header}. '
            f'Tiga berkas membacanya lewat indeks posisi dan akan menampilkan '
            f'isi yang salah tanpa error. Diharapkan: {EXPECTED}')
        return

    ok('vocab-csv',
       f'vocab-all.csv column order unchanged ({", ".join(EXPECTED)})')


def check_orphan_classes():
    """Kelas yang dipakai markup harus punya definisi yang bisa dijangkau.

    Bug nyata: penyeragaman CSS mengganti blok <style> inline dengan tautan ke
    stylesheet bersama. Untuk 97 halaman itu benar; untuk 164 halaman lain
    nama kelasnya berbeda (.page-hero vs .hero, .badge vs .bdg) sehingga 2.586
    kelas kehilangan definisinya. Di Chromium, kartu modul di hub Kaigo
    kehilangan seluruh gayanya — latar transparan, padding 0, flex jadi
    inline — dan halaman Kana tingginya melonjak 3204 → 8620 piksel.

    Tidak ada error, tidak ada tautan rusak, validator lama lolos sepenuhnya.
    Yang hilang hanya tampilannya.

    Check ini memeriksa tiap kelas di atribut class= terhadap gabungan semua
    <style> inline halaman itu DAN semua stylesheet yang ditautkannya. Ambang
    toleransi dipakai karena sebagian kelas memang hanya penanda untuk
    JavaScript dan tidak pernah punya aturan CSS.
    """
    MAX_ORPHAN = 12

    sheet_cache = {}

    def sheet_classes(path):
        if path not in sheet_cache:
            sheet_cache[path] = set(re.findall(r'\.([a-zA-Z][\w-]*)', read(path)))
        return sheet_cache[path]

    worst = []
    for path in all_html_files():
        html = read(path)

        available = set()
        for block in re.findall(r'<style[^>]*>.*?</style>', html, re.S | re.I):
            available |= set(re.findall(r'\.([a-zA-Z][\w-]*)', block))
        for href in re.findall(r'<link[^>]+href="([^"?]+\.css)', html):
            asset = os.path.normpath(os.path.join(os.path.dirname(path), href))
            if os.path.exists(asset):
                available |= sheet_classes(asset)

        # Atribut class HANYA dari markup. Isi <script> memuat pola seperti
        # class="${cls}" di dalam template literal; membacanya menghasilkan
        # "nama kelas" seperti .${cls} atau .!== yang tidak pernah nyata.
        markup = re.sub(r'<script(?:\s[^>]*)?>.*?</script>', ' ', html, flags=re.S | re.I)
        used = set()
        for attr in re.findall(r'class="([^"]+)"', markup):
            used |= {c for c in attr.split() if re.fullmatch(r'[a-zA-Z][\w-]*', c)}

        orphans = used - available
        if len(orphans) > MAX_ORPHAN:
            worst.append((len(orphans), os.path.relpath(path, ROOT),
                          sorted(orphans)[:3]))

    if worst:
        worst.sort(reverse=True)
        detail = '; '.join(f'{rel} ({n} kelas: {", ".join("." + c for c in ex)})'
                           for n, rel, ex in worst[:3])
        err('orphan-classes',
            f'{len(worst)} halaman memakai kelas yang tidak terdefinisi di '
            f'<style> maupun stylesheet manapun yang dimuatnya — elemennya '
            f'tampil tanpa gaya. {detail}')
    else:
        ok('orphan-classes',
           f'No page uses more than {MAX_ORPHAN} classes without a reachable definition')


def check_comment_balance():
    """Komentar HTML harus ditutup. Yang tidak, menelan markup di bawahnya.

    Bug nyata: 32 halaman Kaigo membuka komentar penjelas dan lupa `-->`.
    Browser lalu memperlakukan semua markup sesudahnya sebagai komentar sampai
    menemukan `-->` milik komentar lain jauh di bawah. Diperiksa di Chromium,
    Materi/Kaigo-Bahasa.html hanya menampilkan 1.566 karakter dari 16.380 —
    judul halaman, paragraf pembuka, dan <link rel="manifest"> ikut tertelan.

    Tidak ada error yang muncul. Halaman memuat dengan tenang, hanya isinya
    berkurang — persis jenis kerusakan yang paling lama tidak ketahuan.

    Isi <script> dan <style> dilewati: di sana `<!--` dan `-->` bisa muncul
    sebagai bagian dari string atau operator, bukan penanda komentar.
    """
    broken = []
    for path in all_html_files():
        html = read(path)
        stripped = re.sub(r'<script\b[^>]*>.*?</script>|<style[^>]*>.*?</style>',
                          '', html, flags=re.S | re.I)
        opens = len(re.findall(r'<!--', stripped))
        closes = len(re.findall(r'-->', stripped))
        if opens != closes:
            broken.append(f'{os.path.relpath(path, ROOT)} ({opens} <!-- vs {closes} -->)')

    if broken:
        err('comment-balance',
            f'{len(broken)} halaman punya komentar HTML tidak berpasangan — markup '
            f'sesudahnya tertelan dan tidak pernah dirender. {"; ".join(broken[:3])}')
    else:
        ok('comment-balance', 'Every HTML comment is closed')


def check_inline_handler_targets():
    """Fungsi yang dipanggil atribut on*= harus benar-benar ada.

    Bug nyata: saat mesin kuis Kaigo diekstrak ke assets/kaigo-quiz.js,
    definisi nQ()/rQ()/nQkZ()/rQkZ() ikut terbuang dari skrip inline tiap
    halaman, tapi atribut onclick-nya tetap tinggal. Menekan "Soal Berikutnya"
    hanya melempar ReferenceError — 93 dari 100 halaman Kaigo, pembacanya
    terjebak di soal pertama. Halaman tetap memuat tanpa keluhan; tidak ada
    check yang melihatnya.

    Berbeda dari check_cross_script_function_calls, yang menyoroti pemanggilan
    top-level ANTAR <script> inline. Di sini pemanggilnya adalah markup, dan
    fungsinya boleh datang dari mana saja — inline maupun berkas eksternal.

    Sebuah nama dianggap tersedia bila muncul di salah satu skrip yang dimuat
    halaman sebagai `function nama`, penugasan `nama =`, `window.nama`, ATAU
    sebagai string literal. Aturan string itu sengaja longgar: pemasangan
    dinamis seperti window[pair[0]] = handle.next tidak bisa dilihat secara
    statis, dan lebih baik melewatkan satu kasus daripada mengarang kesalahan.
    """
    # Kata kunci JS: `onclick="if(x)..."` bukan pemanggilan fungsi bernama `if`.
    KEYWORDS = {
        'if', 'for', 'while', 'switch', 'return', 'typeof', 'do', 'else',
        'new', 'delete', 'void', 'in', 'instanceof', 'function', 'catch',
    }
    # Fungsi bawaan browser yang tidak perlu didefinisikan halaman.
    BUILTINS = {
        'alert', 'print', 'confirm', 'open', 'close', 'focus', 'blur',
        'submit', 'reset', 'reload', 'back', 'forward', 'history',
        'setTimeout', 'setInterval', 'requestAnimationFrame', 'fetch',
    }

    broken = []
    for path in all_html_files():
        html = read(path)

        markup = re.sub(r'<script(?:\s[^>]*)?>.*?</script>', ' ', html, flags=re.S)
        called = set(re.findall(r'\son\w+="\s*(\w+)\s*\(', markup))
        called -= KEYWORDS | BUILTINS
        if not called:
            continue

        # Semua kode yang benar-benar tersedia di halaman ini.
        code = '\n'.join(re.findall(
            r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S))
        for src in re.findall(r'<script[^>]+src="([^"?]+)', html):
            asset = os.path.normpath(os.path.join(os.path.dirname(path), src))
            if os.path.exists(asset):
                code += '\n' + read(asset)

        missing = []
        for name in sorted(called):
            provided = re.search(
                rf'function\s+{re.escape(name)}\b'
                rf'|\b{re.escape(name)}\s*=(?!=)'
                rf'|window\.{re.escape(name)}\b'
                rf'|[\'"]{re.escape(name)}[\'"]', code)
            if not provided:
                missing.append(name)

        if missing:
            broken.append(f'{os.path.relpath(path, ROOT)}: {", ".join(missing[:3])}')

    if broken:
        err('inline-handler',
            f'{len(broken)} halaman punya atribut on*= yang memanggil fungsi tidak '
            f'terdefinisi — menekannya hanya melempar ReferenceError. '
            f'{"; ".join(broken[:3])}')
    else:
        ok('inline-handler',
           'Every on*= handler resolves to a function the page actually loads')


def check_cross_script_function_calls():
    """Cari function call top-level di satu <script> tag yang function-nya
    baru didefinisikan di <script> tag LAIN yang muncul setelahnya.

    Bug nyata yang ditemukan lewat check ini (v181): 7 halaman Materi/Kaigo-*.html
    memanggil initQuiz(QUIZ_XXX) di SCRIPT PERTAMA (top-level), tapi
    function initQuiz(){} baru didefinisikan di SCRIPT KEDUA ("Quiz engine").
    Function hoisting TIDAK lintas tag <script> terpisah -- ReferenceError
    "initQuiz is not defined" di SETIAP load halaman, kuis mati total sejak awal.

    Ini kelas bug berbeda dari check_global_object_dependencies (yang cek
    dependency ke script EKSTERNAL seperti platform.js) -- di sini kedua
    fungsi sama-sama inline di file yang sama, hanya beda tag <script>.
    """
    for path in all_html_files():
        rel = os.path.relpath(path, ROOT)
        c = read(path)

        scripts = []
        for m in re.finditer(r'<script(?:\s[^>]*)?>(.*?)</script>', c, re.DOTALL):
            tag_open = c[max(0, m.start()-40):m.start()]
            if 'src=' in tag_open or 'application/ld+json' in tag_open:
                continue  # skip external scripts & JSON-LD
            scripts.append(m.group(1))

        if len(scripts) < 2:
            continue

        problems = []
        for i, code in enumerate(scripts):
            # Baris top-level (depth 0 sederhana: tidak dalam function{} lokal
            # terdeteksi via heuristik longgar -- baris yang PERSIS "fnName(args);"
            # tanpa indentasi dalam blok function di atasnya dalam script ini)
            for m in re.finditer(r'^([A-Za-z_$][\w$]*)\(\s*[\w.$]*\s*\)\s*;\s*$', code, re.MULTILINE):
                fn_name = m.group(1)
                if fn_name in ('function', 'if', 'for', 'while', 'switch', 'return'):
                    continue
                defined_in_this_script = re.search(rf'function\s+{re.escape(fn_name)}\s*\(', code)
                if defined_in_this_script:
                    continue  # aman, didefinisikan di script yang sama
                # Cek apakah didefinisikan di script LAIN yang urutannya SETELAH ini
                for j in range(i + 1, len(scripts)):
                    if re.search(rf'function\s+{re.escape(fn_name)}\s*\(', scripts[j]):
                        problems.append(f'{fn_name}() dipanggil di script #{i+1}, baru didefinisikan di script #{j+1}')
                        break

        if problems:
            sample = '; '.join(problems[:3])
            extra = f' (+{len(problems) - 3} lagi)' if len(problems) > 3 else ''
            err('cross-script-call',
                f'{rel}: function dipanggil sebelum didefinisikan lintas <script> tag '
                f'(ReferenceError setiap load): {sample}{extra}')


def check_build_freshness():
    """assets/*.min.* harus persis hasil `npm run build` dari sumbernya.

    Halaman HANYA memuat versi .min — platform.min.js dipakai 228 halaman,
    kyoto-navbar.min.js 371 halaman — sementara sumbernya tidak dimuat siapa
    pun. Kalau .min tertinggal, perbaikan tidak pernah sampai ke pengguna dan
    unit test lulus menguji kode yang tidak dijalankan siapa pun (kasus v81:
    platform.min.js kehilangan clamp levelProgress, 46 test lulus percuma).

    Check ini menggantikan minified-drift yang lama. Yang lama membandingkan
    "sidik jari logika" karena .min ditulis tangan, sehingga terpaksa toleran
    terhadap beda gaya penulisan — dan toleransi itu bisa menyembunyikan
    perbedaan nyata. Sekarang .min adalah keluaran build, jadi perbandingannya
    bisa byte-per-byte: tidak ada heuristik, tidak ada celah.

    Bundle tanpa sumber (kyoto-bundle.min.css, legacy-bundle.min.css) memang
    tidak dibangun script ini dan tidak diperiksa di sini.
    """
    builder = os.path.join(ROOT, 'scripts', 'build-assets.mjs')
    if not os.path.exists(builder):
        err('build-freshness', 'scripts/build-assets.mjs tidak ada')
        return

    if not os.path.isdir(os.path.join(ROOT, 'node_modules', 'esbuild')):
        warn('build-freshness',
             'esbuild belum terpasang — jalankan `npm install` agar kesegaran '
             'berkas .min bisa diperiksa. Check dilewati.')
        return

    proc = subprocess.run(['node', builder, '--check'],
                          cwd=ROOT, capture_output=True, text=True)

    if proc.returncode == 0:
        ok('build-freshness', (proc.stdout.strip().splitlines() or
                               ['semua .min sesuai sumbernya'])[-1].lstrip('✓ '))
        return

    detail = (proc.stderr.strip() or proc.stdout.strip()).replace('\n', ' ')
    err('build-freshness',
        f'{detail} Halaman memuat versi .min, jadi perubahan di sumber '
        f'belum sampai ke pengguna.')


def check_kaigo_hub():
    """Materi/Kaigo.html harus menaut SEMUA Kaigo-*.html, dan Materi.html tidak
    boleh lagi memuat daftar panjangnya.

    Kaigo.html dibangun oleh scripts/build_kaigo_page.py. Kalau materi Kaigo baru
    ditambahkan tapi generator tidak dijalankan ulang, materi itu jadi yatim:
    filenya ada, tapi tidak muncul di pusat materi Kaigo.
    """
    hub = os.path.join(ROOT, 'Materi', 'Kaigo.html')
    materi_dir = os.path.join(ROOT, 'Materi')
    if not os.path.exists(hub):
        err('kaigo-hub', 'Materi/Kaigo.html tidak ada — jalankan: python3 scripts/build_kaigo_page.py')
        return

    hub_src = read(hub)
    linked = set(re.findall(r'href="(Kaigo-[^"]+\.html)"', hub_src))
    on_disk = {
        f for f in os.listdir(materi_dir)
        if f.startswith('Kaigo-') and f.endswith('.html')
    }

    missing = sorted(on_disk - linked)
    stale = sorted(linked - on_disk)

    if missing:
        sample = ', '.join(missing[:5]) + (f' (+{len(missing) - 5} lagi)' if len(missing) > 5 else '')
        err('kaigo-hub',
            f'{len(missing)}/{len(on_disk)} materi Kaigo tidak tertaut di Materi/Kaigo.html: '
            f'{sample} — jalankan: python3 scripts/build_kaigo_page.py')
    elif stale:
        err('kaigo-hub',
            f'{len(stale)} tautan di Materi/Kaigo.html menunjuk file yang tidak ada: {", ".join(stale[:5])}')
    else:
        ok('kaigo-hub', f'All {len(on_disk)} Kaigo materi are linked from Materi/Kaigo.html')

    # Materi.html seharusnya hanya menaut hub-nya, bukan 40+ modul satu per satu.
    index_src = read(os.path.join(materi_dir, 'Materi.html'))
    direct = re.findall(r'href="(Kaigo-[^"]+\.html)"', index_src)
    if direct:
        err('kaigo-hub',
            f'Materi/Materi.html masih menaut {len(direct)} modul Kaigo langsung '
            f'(mis. {direct[0]}). Daftar itu sudah dipindah ke Materi/Kaigo.html.')
    elif 'href="Kaigo.html"' in index_src:
        ok('kaigo-hub', 'Materi.html links to the Kaigo hub instead of listing every module')
    else:
        warn('kaigo-hub', 'Materi/Materi.html tidak punya tautan ke Kaigo.html')


def check_links_and_assets():
    """Satu lintasan untuk semua rujukan: href, src, fragment, CSS, JS, gambar.

    Menggantikan beberapa check terpisah yang masing-masing membaca ulang seluruh
    proyek. Memakai indeks (_index) sehingga tiap file hanya dibaca sekali.
    """
    idx = _index()

    broken_href, broken_src, broken_frag, malformed = [], [], [], []
    js_driven = []

    for p in idx.html_paths:
        r = rel(p)
        markup = idx.markup[p]

        for href in idx.hrefs[p]:
            h = href.strip()
            if not h:
                malformed.append(f'{r}: href kosong')
                continue
            if is_external(h):
                continue
            if h == '#':
                # <a href="#" onclick="...; return false"> = tombol yang dibuka JS.
                # Pola lazim dan disengaja — bukan link rusak, tapi tetap dicatat:
                # kalau JS mati, elemen ini tidak melakukan apa-apa.
                anchor = re.search(
                    r'<a[^>]*href=["\']#["\'][^>]*>', markup)
                if anchor and 'onclick' in anchor.group(0):
                    js_driven.append(r)
                else:
                    malformed.append(f'{r}: href="#" tanpa handler (link mati)')
                continue

            target, frag = resolve(h, p)
            if target is None:
                continue

            if not os.path.exists(target):
                broken_href.append(f'{r} → {href}')
                continue

            if frag and target in idx.ids and frag not in idx.ids[target]:
                broken_frag.append(f'{r} → {href}')

        for src in idx.srcs[p]:
            s = src.strip()
            if not s or is_external(s):
                continue
            # src yang dirakit JS saat runtime (`src="${url}"`, `src="'+x+'"`).
            # Nilainya baru ada di browser, jadi tidak bisa — dan tidak perlu —
            # dicocokkan dengan file di disk.
            if '${' in s or '{{' in s or "'+" in s or '"+' in s:
                continue
            target, _ = resolve(s, p)
            if target and not os.path.exists(target):
                broken_src.append(f'{r} → {src}')

    def report(name, items, label):
        if items:
            sample = '; '.join(items[:4])
            extra = f' (+{len(items) - 4} lagi)' if len(items) > 4 else ''
            err(name, f'{len(items)} {label}: {sample}{extra}')
        else:
            ok(name, f'No {label}')

    report('broken-href', broken_href, 'tautan menunjuk file yang tidak ada')
    report('broken-src', broken_src, 'src (CSS/JS/gambar) menunjuk file yang tidak ada')
    report('broken-fragment', broken_frag, 'fragment (#anchor) tanpa elemen tujuan')
    report('malformed-href', malformed, 'href kosong / tidak valid')

    if js_driven:
        pages = sorted(set(js_driven))
        warn('js-driven-link',
             f'{len(js_driven)} <a href="#" onclick="..."> di {len(pages)} halaman '
             f'({", ".join(pages[:3])}): berfungsi lewat JS, tapi jadi link mati '
             f'kalau JS gagal dimuat. Pertimbangkan <button> atau href sungguhan.')


def check_anchor_structure():
    """Nested anchor dan anchor yang tidak tertutup.

    Nested <a> membuat browser memecah markup dan link jadi tak bisa diklik.
    Pola `<a href="x.html"</a>` (tag pembuka tanpa '>') pernah membuat 3 link
    Kaigo mati di Materi.html.
    """
    idx = _index()
    nested, unclosed, malformed = [], [], []

    for p in idx.html_paths:
        r = rel(p)
        m = idx.markup[p]

        if re.search(r'<a\b[^>]*>(?:(?!</a>).)*?<a\b', m, re.DOTALL):
            nested.append(r)

        opens = len(re.findall(r'<a\b', m))
        closes = len(re.findall(r'</a>', m))
        if opens != closes:
            unclosed.append(f'{r} ({opens} buka / {closes} tutup)')

        # <a href="x"</a> — tag pembuka tidak ditutup dengan '>'
        if re.search(r'<a\s[^>]*"</a>', m):
            malformed.append(r)

    if nested:
        err('nested-anchor', f'{len(nested)} halaman punya <a> bersarang: {", ".join(nested[:4])}')
    else:
        ok('nested-anchor', 'No nested anchors')

    if unclosed:
        err('unclosed-anchor', f'{len(unclosed)} halaman: {"; ".join(unclosed[:4])}')
    else:
        ok('unclosed-anchor', 'All anchors balanced')

    if malformed:
        err('malformed-anchor',
            f'{len(malformed)} halaman punya <a ...</a> tanpa ">": {", ".join(malformed[:4])}')
    else:
        ok('malformed-anchor', 'No malformed anchor tags')


def check_head_body_hygiene():
    """Cegah kembalinya dua kelas kerusakan struktural yang sudah diperbaiki:

    1. skip-link <a class="skip-to-content"> DI DALAM <head>. Browser menutup
       <head> lebih awal untuk memindahkannya ke <body>, memicu error parser.
       Elemen ini harus berada di <body>.
    2. Tombol back-to-top dengan DUA id (id="backToTop" ... id="bttBtn"). HTML
       melarang atribut ganda; hanya bttBtn yang dipakai JS.
    """
    idx = _index()
    skip_in_head, dup_id = [], []

    for p in idx.html_paths:
        r = rel(p)
        c = idx.text[p]
        h = c.find('</head>')
        if h > 0:
            head = c[:h]
            if re.search(r'<a\s[^>]*class="skip-to-content"', head):
                skip_in_head.append(r)
        if re.search(r'<button\s+id="backToTop"[^>]*\bid="bttBtn"', c):
            dup_id.append(r)

    if skip_in_head:
        err('skip-link-placement',
            f'{len(skip_in_head)} halaman punya skip-link di <head> (harus di <body>): {", ".join(skip_in_head[:4])}')
    else:
        ok('skip-link-placement', 'All skip-links are in <body>')

    if dup_id:
        err('duplicate-button-id',
            f'{len(dup_id)} halaman punya tombol back-to-top ber-id ganda: {", ".join(dup_id[:4])}')
    else:
        ok('duplicate-button-id', 'No duplicate back-to-top ids')


def check_precache_budget():
    """Daftar precache service worker tidak boleh menggemuk diam-diam.

    Precache diunduh saat SW dipasang — SEBELUM pengguna meminta apa pun.
    Daftarnya pernah tumbuh sampai 4,66 MB karena entri terus ditambahkan satu
    per satu tanpa ada yang melihat totalnya: 1,63 MB bank soal yang hanya
    dipakai satu halaman, 23 halaman materi, dan '/' yang kembar dengan
    '/index.html'.

    Batas ini bukan angka keramat, melainkan pengingat: menambah entri
    membebani SETIAP pengguna baru, dan fetch handler sudah menyimpan apa pun
    yang pernah dibuka. Kalau memang perlu dinaikkan, naikkan sadar-sadar.
    """
    BUDGET_MB = 2.0

    for fname in ('sw.js', 'service-worker.js'):
        path = os.path.join(ROOT, fname)
        if not os.path.exists(path):
            continue

        src = read(path)
        start = src.find('PRECACHE = [')
        if start < 0:
            continue
        end = src.find('];', start)

        total, missing = 0, []
        entries = re.findall(r"'([^']+)'", src[start:end])
        for url in entries:
            rel = (url.lstrip('/') or 'index.html').split('?')[0]
            target = os.path.join(ROOT, rel)
            if os.path.exists(target):
                total += os.path.getsize(target)
            else:
                missing.append(url)

        mb = total / (1024 * 1024)
        if missing:
            err('precache-budget',
                f'{fname}: {len(missing)} entri precache menunjuk berkas yang tidak ada '
                f'— {", ".join(missing[:3])}')

        if mb > BUDGET_MB:
            err('precache-budget',
                f'{fname}: precache {mb:.2f} MB melebihi batas {BUDGET_MB:.1f} MB '
                f'({len(entries)} entri). Setiap pengguna baru mengunduh ini sebelum '
                f'meminta apa pun; fetch handler sudah menyimpan halaman yang dibuka.')
        else:
            ok('precache-budget',
               f'{fname} precaches {mb:.2f} MB across {len(entries)} entries '
               f'(budget {BUDGET_MB:.1f} MB)')


def check_kaigo_catalog():
    """Katalog Kaigo ↔ file di disk ↔ kartu di Kaigo.html harus konsisten."""
    sys.path.insert(0, os.path.join(ROOT, 'scripts'))
    try:
        import kaigo_catalog
        import importlib
        importlib.reload(kaigo_catalog)
    except Exception as e:                      # katalog rusak = error, bukan crash
        err('kaigo-catalog', f'Tidak bisa memuat scripts/kaigo_catalog.py: {e}')
        return

    MODULES = kaigo_catalog.MODULES
    materi_dir = os.path.join(ROOT, 'Materi')

    on_disk = {f for f in os.listdir(materi_dir)
               if f.startswith('Kaigo-') and f.endswith('.html')}
    in_catalog = {m['filename'] for m in MODULES.values()}

    orphan = sorted(on_disk - in_catalog)
    ghost = sorted(in_catalog - on_disk)

    if orphan:
        err('kaigo-catalog',
            f'{len(orphan)} file Kaigo tidak ada di katalog: {", ".join(orphan[:4])} '
            f'— tambahkan ke scripts/kaigo_catalog.py')
    if ghost:
        err('kaigo-catalog',
            f'{len(ghost)} entri katalog menunjuk file yang tidak ada: {", ".join(ghost[:4])}')
    if not orphan and not ghost:
        ok('kaigo-catalog', f'Catalog and disk agree on all {len(on_disk)} Kaigo modules')

    # Integritas metadata
    bad = []
    for slug, m in MODULES.items():
        pre = m.get('prerequisite')
        nxt = m.get('recommended_next')
        if pre and pre not in MODULES:
            bad.append(f'{slug}: prerequisite "{pre}" tidak ada di katalog')
        if nxt and nxt not in MODULES:
            bad.append(f'{slug}: recommended_next "{nxt}" tidak ada di katalog')
        if m.get('level') not in kaigo_catalog.LEVEL_NAMES:
            bad.append(f'{slug}: level "{m.get("level")}" tidak dikenal')
        if not isinstance(m.get('duration'), int) or not (1 <= m['duration'] <= 180):
            bad.append(f'{slug}: duration {m.get("duration")} di luar rentang wajar')

    if bad:
        err('kaigo-catalog', f'{len(bad)} metadata bermasalah: {"; ".join(bad[:3])}')
    else:
        ok('kaigo-catalog', 'Module metadata is internally consistent')

    # Halaman hasil generate harus cocok dengan katalog
    hub = os.path.join(ROOT, 'Materi', 'Kaigo.html')
    if not os.path.exists(hub):
        err('kaigo-catalog', 'Materi/Kaigo.html tidak ada — jalankan build_kaigo_page.py')
        return

    src = read(hub)
    card_ids = re.findall(r'id="kg-card-([^"]+)"', src)

    dupes = sorted({c for c in card_ids if card_ids.count(c) > 1})
    if dupes:
        err('kaigo-catalog', f'{len(dupes)} kartu duplikat di Kaigo.html: {", ".join(dupes[:4])}')

    if len(card_ids) != len(MODULES):
        err('kaigo-catalog',
            f'Kaigo.html punya {len(card_ids)} kartu, katalog punya {len(MODULES)} modul '
            f'— jalankan: python3 scripts/build_kaigo_page.py')
    elif not dupes:
        ok('kaigo-catalog', f'Kaigo.html renders exactly {len(card_ids)} cards, one per module')


def kaigo_modules():
    """MODULES dari scripts/kaigo_catalog.py — sumber tunggal daftar modul."""
    sys.path.insert(0, os.path.join(ROOT, 'scripts'))
    import importlib
    import kaigo_catalog
    importlib.reload(kaigo_catalog)
    return kaigo_catalog.MODULES


def _quiz_engine():
    """Muat scripts/compute_durations.py — pemilik tunggal logika deteksi kuis.

    Validator dulu punya salinan sendiri fungsi ini. Salinan itu langsung
    menyimpang: saat mesin kuis bersama diperkenalkan, hanya salinan validator
    yang ditambal, dan tambalannya terlalu longgar (menganggap SEMUA array
    terender begitu kaigo-quiz.js dimuat, padahal berkas itu hanya mengenali
    Q, QQ, dan QKZ). Satu sumber menghapus seluruh kelas masalah itu.
    """
    sys.path.insert(0, os.path.join(ROOT, 'scripts'))
    import importlib
    import compute_durations
    importlib.reload(compute_durations)
    return compute_durations


def _json_questions(html):
    """Soal yang bisa dibaca sebagai JSON, untuk dibandingkan dengan seed.

    Sebagian modul menulis soalnya sebagai literal JavaScript (kunci tanpa
    kutip, string berkutip tunggal). Itu tetap dihitung untuk durasi, tapi
    tidak bisa dibandingkan isinya di sini — jadi dilewati, bukan dipaksakan.
    """
    out = []
    for m in re.finditer(r'(?:var|const|let)\s+(\w+)\s*=\s*\[', html):
        start = html.find('[', m.start())
        depth = 0
        for i in range(start, len(html)):
            if html[i] == '[':
                depth += 1
            elif html[i] == ']':
                depth -= 1
                if depth == 0:
                    try:
                        arr = json.loads(html[start:i + 1])
                    except json.JSONDecodeError:
                        break
                    if (isinstance(arr, list) and arr and isinstance(arr[0], dict)
                            and {'q', 'opts', 'a'} <= set(arr[0])):
                        out += arr
                    break
    return out


def check_kaigo_quiz_reachable():
    """Setiap modul Kaigo harus punya kuis, dan tidak boleh ada soal yang mati.

    Pernah terjadi: 24 modul mendeklarasikan `var Q` berisi soal khusus modul
    lalu menimpanya dengan `var QKZ` berisi 6 soal generik yang sama di semua
    modul. Yang dirender hanya QKZ — pembuka modul CPR mendapat soal tentang
    ICF dan 成年後見制度, sementara 280 soal spesifik tak pernah terlihat.
    """
    engine = _quiz_engine()
    dead, empty = [], []

    for path in sorted(glob.glob(os.path.join(ROOT, 'Materi', 'Kaigo-*.html'))):
        html = read(path)
        arrays = engine.quiz_arrays(html)
        if not arrays:
            continue                        # halaman non-kuis; bukan urusan check ini
        live = 0
        for name, count, span in arrays:
            if engine.is_rendered(html, name, span):
                live += count
            else:
                dead.append(f'{os.path.basename(path)}: {name} ({count} soal)')
        if live == 0:
            empty.append(os.path.basename(path))

    if dead:
        err('kaigo-quiz',
            f'{len(dead)} array soal dideklarasikan tapi tidak pernah dirender '
            f'— jalankan: python3 scripts/merge_dead_quiz.py. '
            f'Contoh: {"; ".join(dead[:3])}')
    else:
        ok('kaigo-quiz', 'No quiz array is declared but left unrendered')

    if empty:
        err('kaigo-quiz',
            f'{len(empty)} modul Kaigo punya array soal tapi tak satu pun dirender: '
            f'{", ".join(empty[:4])}')
    else:
        ok('kaigo-quiz', 'Every Kaigo module with a quiz actually renders it')

    # Modul yang KEHILANGAN arraynya sama sekali tidak tertangkap dua cek di
    # atas: tanpa array, tidak ada yang bisa disebut mati maupun kosong.
    # Itu justru yang terjadi — 292 soal lenyap dari 49 halaman saat penataan
    # ulang CSS, dan Kaigo-Ujian-Nasional tinggal nol. Ambangnya rendah dengan
    # sengaja: yang dijaga adalah "kuisnya hilang", bukan "kuisnya pendek".
    MIN_QUESTIONS = 5
    thin = []
    for slug, module in sorted(kaigo_modules().items()):
        path = os.path.join(ROOT, 'Materi', module['filename'])
        if not os.path.exists(path):
            continue
        html = read(path)
        live = sum(count for name, count, span in engine.quiz_arrays(html)
                   if engine.is_rendered(html, name, span))
        if live < MIN_QUESTIONS:
            thin.append(f'{module["filename"]} ({live})')

    if thin:
        err('kaigo-quiz',
            f'{len(thin)} modul Kaigo merender kurang dari {MIN_QUESTIONS} soal — '
            f'kuisnya kemungkinan hilang, bukan sekadar pendek: {", ".join(thin[:4])}')
    else:
        ok('kaigo-quiz',
           f'Every Kaigo module renders at least {MIN_QUESTIONS} questions')


def check_explanation_id_coverage():
    """Lacak berapa penjelasan kuis Kaigo yang sudah punya bahasa Indonesia.

    Penjelasan adalah momen mengajarnya — yang membacanya justru orang yang
    baru saja salah menjawab. Saat check ini ditulis, 2.104 dari 2.183
    penjelasan tidak memuat satu kata Indonesia pun (77 dari 100 modul nol
    sama sekali), rata-rata 82 karakter dengan 45% kanji. Untuk pembaca N4-N3
    yang jadi sasaran platform ini, bagian yang paling dibutuhkan justru yang
    paling tidak terbaca.

    Ini BUKAN error: melengkapinya adalah pekerjaan menulis konten yang
    berjalan bertahap lewat seed/kaigo_explanation_id.json. Yang dijaga di
    sini hanya arahnya — cakupan tidak boleh mundur dari yang sudah dicapai.
    """
    engine = _quiz_engine()
    indonesian = re.compile(
        r'\b(yang|dan|untuk|dengan|pada|dari|atau|tidak|adalah|bisa|agar|saat'
        r'|oleh|dalam|secara|harus|dapat|perlu|karena)\b', re.I)
    value = re.compile(r'["\']?(?:e|exp|explanation)["\']?\s*:\s*(["\'])'
                       r'((?:[^\\]|\\.)*?)\1', re.S)

    total = covered = 0
    for path in sorted(glob.glob(os.path.join(ROOT, 'Materi', 'Kaigo-*.html'))):
        html = read(path)
        for name, _, span in engine.quiz_arrays(html):
            if not engine.is_rendered(html, name, span):
                continue
            for m in value.finditer(html[span[0]:span[1]]):
                total += 1
                if indonesian.search(m.group(2)):
                    covered += 1

    if not total:
        return

    BASELINE = 367          # dicapai pada batch pertama; jangan turun
    pct = covered / total * 100

    if covered < BASELINE:
        err('explanation-id',
            f'Cakupan glos Indonesia turun ke {covered}/{total} ({pct:.0f}%), '
            f'di bawah {BASELINE} yang sudah dicapai. Glos hilang, bukan bertambah.')
    else:
        ok('explanation-id',
           f'{covered}/{total} ({pct:.0f}%) penjelasan kuis memuat bahasa Indonesia '
           f'— sisa {total - covered} menunggu penulisan')


def check_kaigo_durations():
    """Durasi di katalog harus cocok dengan isi modul yang sebenarnya.

    Durasi tampil di tiap kartu Kaigo.html dan sebagai total di header. Angka
    itu pernah diisi manual lalu tidak pernah dihitung ulang saat isi modul
    diperdalam: 63 modul tertulis "10 mnt" padahal isinya 25-30 menit, dan
    total situs meleset 17 jam. Check ini membuat angka itu tidak bisa basi.
    """
    sys.path.insert(0, os.path.join(ROOT, 'scripts'))
    try:
        import compute_durations
        import importlib
        importlib.reload(compute_durations)
        import kaigo_catalog
        importlib.reload(kaigo_catalog)
    except Exception as e:
        err('kaigo-duration', f'Tidak bisa memuat scripts/compute_durations.py: {e}')
        return

    stale = []
    for slug, m in kaigo_catalog.MODULES.items():
        expected = compute_durations.estimate(m['filename'])
        if expected is None:
            continue                        # ketiadaan file sudah dilaporkan check lain
        if m['duration'] != expected:
            stale.append(f'{slug}: katalog {m["duration"]} mnt, isi ≈{expected} mnt')

    if stale:
        err('kaigo-duration',
            f'{len(stale)} modul durasinya tidak sesuai isi — jalankan: '
            f'python3 scripts/compute_durations.py && python3 scripts/build_kaigo_page.py. '
            f'Contoh: {"; ".join(stale[:3])}')
    else:
        ok('kaigo-duration',
           f'All {len(kaigo_catalog.MODULES)} Kaigo durations match their module content')


def check_kaigo_seed_sync():
    """Bank soal modul dan seed tidak boleh saling bertentangan.

    Soal Kaigo hidup di dua tempat: seed/kaigo_questions.json (dipakai
    Ujian.html) dan array inline di tiap halaman modul. Keduanya ditulis
    terpisah, jadi perbaikan di satu sisi bisa diam-diam meninggalkan sisi
    lain — pola yang sama sudah ditangkap check minified-drift untuk .js.

    Yang DIPERIKSA hanya pertanyaan dengan set pilihan IDENTIK. Di situ kunci
    jawaban yang berbeda berarti dua halaman mengajarkan fakta bertentangan,
    dan tidak ada tafsir lain yang mungkin — itu error.

    Yang SENGAJA DIBIARKAN, karena keduanya bukan kerusakan melainkan pilihan
    penulisan — memaksanya seragam justru membuang isi yang berguna:

      - pertanyaan sama dengan pengecoh berbeda (13 kasus saat check ditulis):
        varian latihan yang sah, jawaban benarnya sama-sama tepat
      - penjelasan berbeda pada soal identik (9 kasus, semuanya di
        Kaigo-Ujian-N2): halaman modul menulis ringkas dengan glos untuk
        pembaca Indonesia ("ACP=Advance Care Planning", "respite care"),
        seed menulis prosa gaya ujian. Dua gaya untuk dua konteks.
    """
    seed_path = os.path.join(ROOT, 'seed', 'kaigo_questions.json')
    if not os.path.exists(seed_path):
        err('kaigo-seed-sync', 'seed/kaigo_questions.json tidak ada')
        return

    try:
        seed = json.loads(read(seed_path))
    except json.JSONDecodeError as e:
        err('kaigo-seed-sync', f'seed/kaigo_questions.json tidak valid: {e}')
        return

    by_question = {q['question'].strip(): q for q in seed}
    contradiction, compared = [], 0

    for path in sorted(glob.glob(os.path.join(ROOT, 'Materi', 'Kaigo-*.html'))):
        for q in _json_questions(read(path)):
            s = by_question.get(q['q'].strip())
            if not s:
                continue
            if [c.strip() for c in s['choices']] != [o.strip() for o in q['opts']]:
                continue                # varian sah — di luar cakupan check
            compared += 1
            name = os.path.basename(path)
            if s['correct_index'] != q['a']:
                contradiction.append(
                    f'{name}: "{q["q"][:38]}" — modul menjawab '
                    f'"{q["opts"][q["a"]][:24]}", seed "{s["choices"][s["correct_index"]][:24]}"')

    if contradiction:
        err('kaigo-seed-sync',
            f'{len(contradiction)} soal dengan pilihan identik punya KUNCI JAWABAN '
            f'berbeda antara halaman modul dan seed — salah satunya mengajarkan '
            f'hal yang keliru. {"; ".join(contradiction[:3])}')
    else:
        ok('kaigo-seed-sync',
           f'{compared} questions shared verbatim with the seed all agree on the answer')


def main():
    print("🔍 NihongoPro Site Validator\n" + "=" * 50)

    checks = [
        check_links_and_assets,
        check_anchor_structure,
        check_head_body_hygiene,
        check_precache_budget,
        check_kaigo_catalog,
        check_kaigo_quiz_reachable,
        check_explanation_id_coverage,
        check_kaigo_durations,
        check_kaigo_seed_sync,
        check_js_syntax,
        check_inline_js_syntax,
        check_json_validity,
        check_broken_links,
        check_domain_consistency,
        check_canonical_filename_match,
        check_seo_basics,
        check_duplicate_ids,
        check_accessibility,
        check_security,
        check_folder_names,
        check_service_worker,
        check_global_object_dependencies,
        check_env_variable_consistency,
        check_materi_parity,
        check_search_index,
        check_kaigo_hub,
        check_missing_dom_elements,
        check_class_selector_crashers,
        check_cross_script_function_calls,
        check_vocab_csv_columns,
        check_orphan_classes,
        check_comment_balance,
        check_inline_handler_targets,
        check_build_freshness,
        check_unit_tests,
    ]

    for check in checks:
        check()

    print(f"\n✅ PASSED ({len(passed)})")
    for p in passed:
        print(f"   {p}")

    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)})")
        for w in warnings:
            print(f"   {w}")

    if errors:
        print(f"\n❌ ERRORS ({len(errors)})")
        for e in errors:
            print(f"   {e}")

    print("\n" + "=" * 50)
    if errors:
        print(f"RESULT: FAILED — {len(errors)} error(s), {len(warnings)} warning(s)")
        sys.exit(1)
    elif warnings and STRICT:
        print(f"RESULT: FAILED (strict mode) — {len(warnings)} warning(s)")
        sys.exit(1)
    else:
        print(f"RESULT: PASSED — {len(warnings)} warning(s), 0 errors")
        sys.exit(0)


if __name__ == '__main__':
    main()
