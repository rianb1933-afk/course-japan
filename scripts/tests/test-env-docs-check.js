/**
 * Test suite: Check env-docs (konsistensi env netlify.toml ↔ docs ↔ kode)
 * =====================================================================
 * Menguji check_env_docs_consistency di scripts/validate.py — check yang
 * membandingkan tiga sumber kebenaran variabel environment: komentar
 * netlify.toml, docs/SETUP-KUNCI-API.md, dan kode yang benar-benar
 * membaca env (serverless + definisi env.js berkonsumen).
 *
 * Implementasinya Python, jadi suite ini adalah pembungkus tipis: tiap
 * kasus dijalankan satu proses `python3 env-docs-fixture.py <KASUS>`
 * terhadap repo sintetis di tmpdir (lihat env-docs-fixture.py untuk
 * rincian fixture & cara ROOT/_IDX validate.py dialihkan). Exit code 0
 * berarti kasus lulus.
 *
 * Berjalan tanpa jaringan dan tanpa menyentuh repo sungguhan.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const FIXTURE = path.join(__dirname, 'env-docs-fixture.py');

const CASES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'].map((id) => ({
  name: `env-docs ${id}`,
  fn: () => {
    let out = '';
    try {
      out = execFileSync('python3', [FIXTURE, id], { encoding: 'utf8' });
    } catch (e) {
      out = (e.stdout || '') + (e.stderr || '');
      throw new Error(`kasus ${id} gagal:\n${out.trim().slice(-400)}`);
    }
    if (!out.includes(`OK ${id}`)) {
      throw new Error(`kasus ${id} tidak melaporkan OK:\n${out.trim().slice(-400)}`);
    }
  },
}));

module.exports = { tests: CASES };
