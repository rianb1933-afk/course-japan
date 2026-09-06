#!/usr/bin/env python3
"""Fixture tests untuk check_env_docs_consistency (scripts/validate.py).

Check env-docs membandingkan tiga sumber kebenaran variabel environment
(komentar netlify.toml, docs/SETUP-KUNCI-API.md, kode yang benar-benar
membaca env) dua arah plus arah ketiga ke checklist toml. Regresinya
mahal kalau baru ketahuan saat deploy, jadi tiap arah diuji di sini
terhadap repo sintetis di tmpdir:

  - validate.py diimpor sebagai modul (main() terlindungi guard
    __name__, jadi impor tidak menjalankan apa pun),
  - ROOT modul ditunjuk ke fixture,
  - indeks berkas (_IDX) diganti stub ringan sehingga check tidak
    memindai repo sungguhan — read() tetap membaca berkas fixture
    dari disk karena memang ada.

Dipanggil satu kasus per eksekusi oleh test-env-docs-check.js:

    python3 env-docs-fixture.py C1    # exit 0 = lulus, 1 = gagal
"""
import importlib.util
import os
import sys
import tempfile
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
VALIDATE_PATH = os.path.join(HERE, '..', 'validate.py')

spec = importlib.util.spec_from_file_location('validate_fixture_mod', VALIDATE_PATH)
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)


class FakeIndex:
    """Stub _Index: read() menemukan dict kosong dan jatuh ke open() biasa
    (berkas fixture nyata di tmpdir). html_paths kosong agar pemindaian
    konsumen HTML tidak menyentuh repo asli."""

    def __init__(self):
        self.text = {}
        self.html_paths = []
        self.all_files = set()
        self.ids, self.markup, self.hrefs, self.srcs = {}, {}, {}, {}


def make_repo(toml, doc, env_js='', fn_js='', api_js='', consumer_js=''):
    d = tempfile.mkdtemp(prefix='env-docs-fixture-')
    for sub in ('docs', 'assets', os.path.join('netlify', 'functions'), 'api'):
        os.makedirs(os.path.join(d, sub), exist_ok=True)
    w = lambda rel, c: open(os.path.join(d, rel), 'w', encoding='utf-8').write(c)
    w('netlify.toml', toml)
    w(os.path.join('docs', 'SETUP-KUNCI-API.md'), doc)
    if env_js:
        w(os.path.join('assets', 'env.js'), env_js)
    if fn_js:
        w(os.path.join('netlify', 'functions', 'fn.js'), fn_js)
    if api_js:
        w(os.path.join('api', 'vercel.js'), api_js)
    if consumer_js:
        w(os.path.join('assets', 'consumer.js'), consumer_js)
    return d


def run_check(repo):
    v.ROOT = repo
    v._IDX = FakeIndex()
    v.errors, v.warnings, v.passed = [], [], []
    v.check_env_docs_consistency()
    return list(v.warnings), list(v.passed)


def expect(cond, msg):
    if not cond:
        print(f'GAGAL: {msg}')
        sys.exit(1)


# ── Kasus uji ────────────────────────────────────────────────────────────

def c1_konsisten():
    """Repo yang rapi: tidak ada warning, ok tercatat. Mencakup penerimaan
    pasangan EDUMA_, wildcard doc `D_WILD*`, definisi env.js berkonsumen,
    dan var yang dibaca lewat bracket."""
    repo = make_repo(
        toml='# [build.environment]\n'
             '#   A_KEY = "a"\n'
             '#   EDUMA_B_KEY = "b"\n'
             '#   EDUMA_C_DEF = "c"\n'
             '#   D_WILD_TCP = "d"\n'
             '#   DYN_BRACKET = "e"\n',
        doc='Isi:\n\n- `A_KEY` kunci A\n- `EDUMA_B_KEY` kunci B\n'
            '- `EDUMA_C_DEF` definisi env.js\n- `D_WILD*` keluarga wildcard\n'
            '- `DYN_BRACKET` akses bracket\n',
        env_js='window.EDUMA_ENV = { C_DEF: read("EDUMA_C_DEF", "") };\n',
        consumer_js='const c = window.EDUMA_ENV?.C_DEF;\n',
        fn_js='const a = process.env.A_KEY;\n'
              'const d = process.env.D_WILD_TCP;\n'
              "const e = process.env['DYN_BRACKET'];\n",
    )
    try:
        warns, passed = run_check(repo)
        expect(not warns, f'konsisten tapi ada warning: {warns}')
        expect(any('env-docs' in p for p in passed), f'ok env-docs tidak tercatat: {passed}')
    finally:
        shutil.rmtree(repo, ignore_errors=True)


def c2_toml_tanpa_doc():
    """Arah 1: var didokumentasikan di toml tapi tak disebut doc."""
    repo = make_repo(
        toml='# [build.environment]\n#   ORPHAN_TOML_VAR = "x"\n',
        doc='Tidak menyebut apa pun.\n',
    )
    try:
        warns, _ = run_check(repo)
        text = '\n'.join(warns)
        expect('ORPHAN_TOML_VAR' in text and 'tidak disebut docs' in text,
               f'arah 1 tidak menyala: {warns}')
    finally:
        shutil.rmtree(repo, ignore_errors=True)


def c3_kode_tanpa_dokumentasi():
    """Arah 2: var dibaca kode, tidak di doc maupun toml."""
    repo = make_repo(
        toml='# [build.environment]\n#   LAIN = "y"\n',
        doc='Hanya `LAIN`.\n',
        fn_js='const g = process.env.GHOST_VAR;\n',
    )
    try:
        warns, _ = run_check(repo)
        text = '\n'.join(warns)
        expect('GHOST_VAR' in text and 'tidak didokumentasikan' in text,
               f'arah 2 tidak menyala: {warns}')
        # LAIN dibaca kode? Tidak — jangan ikut terflag.
        expect('LAIN' not in text, f'var toml yang tak dibaca kode ikut terflag: {warns}')
    finally:
        shutil.rmtree(repo, ignore_errors=True)


def c4_fn_tanpa_toml():
    """Arah 3: var dibaca function dan disebut doc, tapi absen dari
    checklist [build.environment] toml."""
    repo = make_repo(
        toml='# [build.environment]\n#   TOML_SAJA = "z"\n',
        doc='Menyebut `DOC_ONLY_VAR` saja.\n',
        fn_js='const x = process.env.DOC_ONLY_VAR;\n',
    )
    try:
        warns, _ = run_check(repo)
        text = '\n'.join(warns)
        expect('DOC_ONLY_VAR' in text and 'tidak tercantum di komentar netlify.toml' in text,
               f'arah 3 tidak menyala: {warns}')
        expect('DOC_ONLY_VAR' not in text.split('tidak didokumentasikan')[-1]
               or 'tidak didokumentasikan' not in text,
               f'var ber-doc jangan terflag arah 2: {warns}')
    finally:
        shutil.rmtree(repo, ignore_errors=True)


def c5_akses_dinamis():
    """Helper dinamis MODEL()/num() dan akses bracket HARUS terhitung sebagai
    pembacaan env — grep properti statis melewatkan semuanya."""
    repo = make_repo(
        toml='# [build.environment]\n',
        doc='Kosong.\n',
        fn_js="const m = MODEL('DYN_MODEL', 'gpt');\n"
              "const q = num('DYN_QUOTA', 5);\n"
              "const b = process.env['DYN_BRACKET'];\n",
    )
    try:
        warns, _ = run_check(repo)
        text = '\n'.join(warns)
        for var in ('DYN_MODEL', 'DYN_QUOTA', 'DYN_BRACKET'):
            expect(var in text, f'{var} (akses dinamis) tidak terdeteksi: {warns}')
    finally:
        shutil.rmtree(repo, ignore_errors=True)


def c6_toml_hilang():
    """netlify.toml tidak ada → warning dilewati, bukan crash."""
    d = tempfile.mkdtemp(prefix='env-docs-fixture-')
    os.makedirs(os.path.join(d, 'docs'), exist_ok=True)
    open(os.path.join(d, 'docs', 'SETUP-KUNCI-API.md'), 'w').write('x')
    try:
        warns, _ = run_check(d)
        expect(any('dilewati' in w for w in warns), f'skip-path tidak menyala: {warns}')
    finally:
        shutil.rmtree(d, ignore_errors=True)


def c7_def_mati_diabaikan():
    """Definisi env.js tanpa konsumen sengaja diabaikan (config mati, bukan
    celah dokumentasi) — guard terhadap false positive masa depan."""
    repo = make_repo(
        toml='# [build.environment]\n#   A_KEY = "a"\n',
        doc='`A_KEY` ada.\n',
        env_js='window.EDUMA_ENV = { DEAD_DEF: read("EDUMA_DEAD_DEF", "") };\n',
    )
    try:
        warns, _ = run_check(repo)
        text = '\n'.join(warns)
        expect('DEAD_DEF' not in text, f'def mati ikut terflag: {warns}')
        expect(not warns, f'harusnya bersih: {warns}')
    finally:
        shutil.rmtree(repo, ignore_errors=True)


CASES = {
    'C1': c1_konsisten,
    'C2': c2_toml_tanpa_doc,
    'C3': c3_kode_tanpa_dokumentasi,
    'C4': c4_fn_tanpa_toml,
    'C5': c5_akses_dinamis,
    'C6': c6_toml_hilang,
    'C7': c7_def_mati_diabaikan,
}

if __name__ == '__main__':
    case = sys.argv[1] if len(sys.argv) > 1 else None
    if case in CASES:
        CASES[case]()
        print(f'OK {case}')
    else:
        print(f'kasus tidak dikenal: {case}; pakai salah satu dari {sorted(CASES)}')
        sys.exit(1)
