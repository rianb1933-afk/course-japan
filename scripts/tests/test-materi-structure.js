/**
 * Test suite: Struktur seksi Materi.html + quicknav + kartu level
 * ================================================================
 * Pemeriksaan statis terhadap HTML asli: seksi ber-header, quicknav dengan
 * target anchor yang benar-benar ada, 5 kartu level dengan 5 tautan per
 * level yang filenya benar-benar ada di repo, dan semua kartu tetap
 * berada dalam hub-grid agar pencarian & lencana menemukannya.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'Materi', 'Materi.html'), 'utf8');

const tests = [
  {
    name: 'Materi-struktur: 7 seksi materi-sec dengan header h2',
    fn() {
      const ids = ['sec-dasar', 'sec-level', 'sec-inti', 'sec-skill', 'sec-ujian', 'sec-alat', 'sec-karier'];
      ids.forEach(id => {
        const m = html.match(new RegExp(`<section class="materi-sec" id="${id}">[\\s\\S]*?<h2>`));
        if (!m) throw new Error(`seksi ${id} tidak ditemukan`);
      });
      if ((html.match(/class="materi-sec"/g) || []).length !== 7) {
        throw new Error('jumlah seksi bukan 7');
      }
    },
  },
  {
    name: 'Materi-struktur: semua chip quicknav menunjuk anchor yang ada',
    fn() {
      const nav = html.match(/<div class="hub-quicknav"[\s\S]*?<div class="hqn-inner">[\s\S]*?<\/div>\s*<\/div>/);
      if (!nav) throw new Error('quicknav tidak ditemukan');
      const hrefs = [...nav[0].matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
      if (hrefs.length < 12) throw new Error('chip quicknav kurang dari 12');
      if (!hrefs.includes('sec-karier')) throw new Error('quicknav belum punya chip seksi Kerja');
      hrefs.forEach(id => {
        if (!html.includes(`id="${id}"`)) throw new Error(`anchor #${id} tidak ada di halaman`);
      });
    },
  },
  {
    name: 'Materi-struktur: 5 kartu level dengan 5 tautan valid per level',
    fn() {
      ['N5', 'N4', 'N3', 'N2', 'N1'].forEach(lv => {
        const card = html.match(new RegExp(`<article class="hub-card hub-lvcard" id="lv-${lv}">[\\s\\S]*?</article>`));
        if (!card) throw new Error(`kartu level ${lv} tidak ada`);
        const links = [...card[0].matchAll(/href="([^"#]+)"/g)].map(m => m[1]);
        if (links.length !== 5) throw new Error(`kartu ${lv} harus 5 tautan, dapat ${links.length}`);
        links.forEach(rel => {
          const f = path.join(ROOT, 'Materi', rel);
          if (!fs.existsSync(f)) throw new Error(`tautan mati di kartu ${lv}: ${rel}`);
        });
      });
    },
  },
  {
    name: 'Materi-struktur: semua kartu modul dalam hub-grid di dalam main',
    fn() {
      const main = html.slice(html.indexOf('<main id="main-content"'), html.indexOf('</main>'));
      const cards = (main.match(/<article class="hub-card/g) || []).length;
      if (cards !== 27) throw new Error(`harusnya 27 kartu (20 lama + 5 level + 2 karier), dapat ${cards}`);
      const grids = (main.match(/class="hub-grid[ "]/g) || []).length;
      if (grids !== 7) throw new Error(`harusnya 7 grid (satu per seksi), dapat ${grids}`);
    },
  },
  {
    name: 'Materi-struktur: seksi Kerja memuat Kaigo + SSW dengan tautan yang hidup',
    fn() {
      const sec = html.match(/<section class="materi-sec" id="sec-karier">[\s\S]*?<\/section>/);
      if (!sec) throw new Error('seksi sec-karier tidak ada');
      const main = html.slice(html.indexOf('<main id="main-content"'), html.indexOf('</main>'));
      if (!main.includes(sec[0])) {
        throw new Error('seksi Kerja harus di dalam #main-content agar ikut pencarian & scroll-spy');
      }
      const cards = sec[0].match(/<article class="hub-card hub-karier"/g) || [];
      if (cards.length !== 2) throw new Error(`harusnya 2 kartu karier, dapat ${cards.length}`);
      if (!sec[0].includes('href="Kaigo.html"')) throw new Error('kartu Kaigo tidak menaut Kaigo.html');
      if (!sec[0].includes('href="../SSW.html"')) throw new Error('kartu SSW tidak menaut ../SSW.html');

      const kaigoSrc = fs.readFileSync(path.join(ROOT, 'Materi', 'Kaigo.html'), 'utf8');
      [...sec[0].matchAll(/href="([^"]+)"/g)].map(m => m[1]).forEach(href => {
        const [target, hash] = href.split('#');
        const file = path.join(ROOT, 'Materi', target.split('?')[0]);
        if (!fs.existsSync(file)) throw new Error(`tautan mati di seksi Kerja: ${href}`);
        // Kaigo.html memfilter kategori lewat #kg-h-<kategori>; id-nya wajib ada
        if (hash && target === 'Kaigo.html' && !kaigoSrc.includes(`id="${hash}"`)) {
          throw new Error(`Kaigo.html tidak punya anchor #${hash}`);
        }
      });
    },
  },
  {
    name: 'Materi-struktur: seksi Kerja tidak menyalin daftar/jumlah dari hub-nya',
    fn() {
      const sec = html.match(/<section class="materi-sec" id="sec-karier">[\s\S]*?<\/section>/)[0];
      // Angka hard-coded pernah basi: CTA lama menulis "76 Modul" saat Kaigo sudah 100.
      const count = sec.replace(/<!--[\s\S]*?-->/g, '').match(/\d+\s*(?:modul|bidang)/i);
      if (count) throw new Error(`jumlah hard-coded di seksi Kerja: "${count[0]}"`);
      // Sumber kebenaran bidang SSW adalah SSW.html (DB/ssw-seed.js). Satu
      // bidang unggulan boleh ditaut; menyalin daftarnya membuat dua versi.
      const seed = fs.readFileSync(path.join(ROOT, 'assets', 'ssw-seed.js'), 'utf8');
      const slugs = new Set([...seed.matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]));
      if (slugs.size < 2) throw new Error('slug bidang SSW tidak terbaca dari ssw-seed.js');
      const linked = [...new Set([...html.matchAll(/[?&]field=([\w-]+)/g)].map(m => m[1]))];
      linked.forEach(s => {
        if (!slugs.has(s)) throw new Error(`?field=${s} tidak dikenal ssw-seed.js — halaman bidang akan kosong`);
      });
      if (linked.length > 1) throw new Error(`Materi.html menaut ${linked.length} bidang SSW; tautkan SSW.html saja`);
    },
  },
  {
    name: 'Materi-struktur: quicknav benar-benar menggulir ke seksi (bukan ditarik balik)',
    fn() {
      const marker = 'Scroll-spy quicknav';
      const start = html.indexOf(marker);
      if (start === -1) throw new Error('blok script scroll-spy tidak ditemukan');
      const spy = html.slice(start, html.indexOf('</script>', start))
        .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      // Terukur di Chromium: scrollIntoView() pada chip ikut menggulir jendela
      // dan membatalkan gulir menuju seksi — setiap klik chip berhenti di quicknav.
      if (/scrollIntoView\s*\(/.test(spy)) {
        throw new Error('scroll-spy memanggil scrollIntoView() — geser strip chip saja');
      }
      // scroll-margin di seksi MENUMPUK di atas scroll-padding html (86px dari
      // neko-theme): seksi mendarat di 214px, lewat garis aktif 140px.
      const css = html.replace(/<script[\s\S]*?<\/script>/g, '');
      if (/\.materi-sec\{[^}]*scroll-margin-top/.test(css)) {
        throw new Error('.materi-sec memakai scroll-margin-top; offset sticky milik html{scroll-padding-top}');
      }
      const pad = css.match(/html\{scroll-padding-top:(\d+)px\}/);
      if (!pad) throw new Error('html{scroll-padding-top} untuk tumpukan sticky tidak ada');
      const line = spy.match(/getBoundingClientRect\(\)\.top\s*<=\s*(\d+)/);
      if (!line || Number(line[1]) < Number(pad[1])) {
        throw new Error('garis aktif scroll-spy harus >= scroll-padding-top, kalau tidak anchor mendarat di atas garis');
      }
    },
  },
  {
    name: 'Materi-struktur: selector pencarian & lencana memakai pola multi-seksi',
    fn() {
      if (!html.includes("querySelectorAll('#main-content .hub-grid')")) {
        throw new Error('pencarian belum memakai selector multi-grid');
      }
      if (!html.includes("querySelectorAll('#main-content .hub-grid > .hub-card')")) {
        throw new Error('lencana belum memakai selector multi-grid');
      }
    },
  },
];

module.exports = { tests };
