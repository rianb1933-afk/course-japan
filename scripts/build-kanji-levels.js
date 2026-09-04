// build-kanji-levels.js — Perkaya halaman Kanji N3/N2/N1 menjadi format kartu kaya ala N4
// (kanji + on/kun + arti + contoh kata + arti contoh).
//
// Sumber:
//   - assets/kanji-bank.json          → on/kun/arti per karakter (celah diisi KANJI_FALLBACK)
//   - assets/vocab-all.csv            → kata contoh (expression+reading andal; arti disaring glossOK)
//   - korpus kurasi halaman           → rawKanji N4/N5 + kqPool N2-N5 (arti contoh andal)
//   - data compact N3/N2              → arti Indonesia yang sudah terkurasi per halaman
//   - kqPoolN1 + preview N1           → arti Indonesia kanji N1 (kurasi manual)
//   - ID_DICT / N2_ARTI_FALLBACK      → pelengkap arti yang tidak tersedia di sumber lain
//
// Cara pakai: node scripts/build-kanji-levels.js  → menulis /tmp/kanji-blob-n{3,2,1}.txt
// (blob disisipkan ke tiap halaman oleh patch manual/berikutnya).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname + '/..';

// ── KANJI_FALLBACK: bacaan on/kun untuk kanji yang tidak tercakup kanji-bank (dari KANJIDIC2) ──
const KANJI_FALLBACK = {
  '氏': { on: 'シ', kun: 'うじ' }, '統': { on: 'トウ', kun: 'す.べる' }, '提': { on: 'テイ, チョウ, ダイ', kun: 'さ.げる' },
  '挙': { on: 'キョ', kun: 'あ.げる, あ.がる' }, '応': { on: 'オウ', kun: 'こた.える' }, '検': { on: 'ケン', kun: 'しら.べる' },
  '護': { on: 'ゴ', kun: 'まも.る' }, '展': { on: 'テン', kun: '' }, '態': { on: 'タイ', kun: '' },
  '視': { on: 'シ', kun: 'み.る' }, '密': { on: 'ミツ', kun: 'ひそ.か' }, '救': { on: 'キュウ', kun: 'すく.う' },
  '憲': { on: 'ケン', kun: '' }, '衛': { on: 'エイ', kun: '' }, '凌': { on: 'リョウ', kun: 'しの.ぐ' },
  '斡': { on: 'アツ, カン', kun: 'めぐ.る' }, '策': { on: 'サク', kun: '' }, '治': { on: 'ジ, チ', kun: 'おさ.める, なお.る' },
  '率': { on: 'ソツ, リツ', kun: 'ひき.いる' }, '革': { on: 'カク', kun: 'あらた.める' }, '均': { on: 'キン', kun: 'なら.す' },
  '純': { on: 'ジュン', kun: '' }, '徳': { on: 'トク', kun: '' }, '論': { on: 'ロン', kun: '' },
  '根': { on: 'コン', kun: 'ね' }, '制': { on: 'セイ', kun: '' }, '規': { on: 'キ', kun: '' },
  '権': { on: 'ケン, ゴン', kun: '' }, '構': { on: 'コウ', kun: 'かま.える' }, '造': { on: 'ゾウ', kun: 'つく.る' },
  '領': { on: 'リョウ', kun: '' }, '則': { on: 'ソク', kun: 'のっと.る' }, '益': { on: 'エキ, ヤク', kun: 'ま.す' },
  '損': { on: 'ソン', kun: 'そこ.なう' }, '費': { on: 'ヒ', kun: 'つい.やす' }, '資': { on: 'シ', kun: '' },
  '産': { on: 'サン', kun: 'う.む' }, '競': { on: 'キョウ, ケイ', kun: 'きそ.う' }, '優': { on: 'ユウ', kun: 'すぐ.れる, やさ.しい' },
  '格': { on: 'カク', kun: '' }, '差': { on: 'サ', kun: 'さ.す' }, '衆': { on: 'シュウ', kun: 'おお.い' },
  '識': { on: 'シキ', kun: 'し.る' }, '認': { on: 'ニン', kun: 'みと.める' }, '判': { on: 'ハン', kun: 'わか.る' },
  '評': { on: 'ヒョウ', kun: '' }, '覚': { on: 'カク', kun: 'おぼ.える, さ.ます' }, '情': { on: 'ジョウ, セイ', kun: 'なさ.け' },
  '望': { on: 'ボウ', kun: 'のぞ.む' }, '丁': { on: 'チョウ, テイ', kun: '' }, '丑': { on: 'チュウ', kun: 'うし' },
  '乃': { on: 'ナイ, ダイ', kun: 'の' }, '之': { on: 'シ', kun: 'の, これ' }, '亦': { on: 'エキ, ヤク', kun: 'また' },
  '俳': { on: 'ハイ', kun: '' }, '霰': { on: 'サン', kun: 'あられ' }, '雹': { on: 'ハク', kun: 'ひょう' },
  '芽': { on: 'ガ', kun: 'め' }, '苔': { on: 'タイ', kun: 'こけ' }, '脾': { on: 'ヒ', kun: '' },
  '膵': { on: 'スイ', kun: '' }, '脈': { on: 'ミャク', kun: 'すじ' }, '踵': { on: 'ショウ', kun: 'かかと' },
  '織': { on: 'ショク, シキ', kun: 'お.る' }, '轟': { on: 'ゴウ', kun: 'とどろ.く' }, '囁': { on: 'ショウ', kun: 'ささや.く' },
  '咆': { on: 'ホウ', kun: 'ほ.える' }, '唸': { on: 'ネン', kun: 'うな.る' }, '脹': { on: 'チョウ', kun: 'は.れる' },
  '暴': { on: 'ボウ, バク', kun: 'あば.れる' }, '剥': { on: 'ハク', kun: 'は.がす, む.く' }, '潔': { on: 'ケツ', kun: 'いさぎよ.い' },
  '带': { on: 'タイ', kun: 'お.びる' },
};

// ── N2_ARTI_FALLBACK: arti Indonesia untuk kanji ekor kana N2 yang kosong di semua sumber ──
const N2_ARTI_FALLBACK = {
  '据': 'menempatkan, memasang', '述': 'menguraikan, menyampaikan', '膨': 'menggembung', '漏': 'bocor, merembes',
  '浸': 'merendam', '渇': 'haus, kering', '潤': 'lembab, untung', '沸': 'mendidih', '凝': 'memadat, memusat',
  '融': 'melebur, mencair', '鍛': 'menempa, melatih', '掘': 'menggali', '縫': 'menjahit', '編': 'menyusun, mengarang',
  '彫': 'memahat', '濯': 'membilas, mencuci', '揃': 'serasi, lengkap', '震': 'bergetar, mengguncang', '響': 'bergema, beresonansi',
  '拭': 'mengelap', '掃': 'menyapu', '騙': 'menipu', '憎': 'membenci', '恨': 'menyesal, mendendam',
  '憐': 'mengasihani', '慰': 'menghibur', '叱': 'menghardik, memarahi', '詫': 'meminta maaf', '諦': 'mengikhlaskan, menyerah',
  '諮': 'berkonsultasi', '訴': 'mengadu, menggugat', '弁': 'pembelaan, bicara', '契': 'berjanji, ikatan', '恵': 'anugerah, berkah',
  '哀': 'duka, belas kasihan', '祝': 'merayakan, ucapan selamat', '讃': 'memuji, menyanjung', '蔑': 'menghina', '侮': 'meremehkan',
  '罵': 'memaki, menghina', '妬': 'iri, cemburu', '羨': 'iri hati', '怒': 'marah, murka', '怨': 'dendam, benci',
  '溶': 'melarutkan, melelehkan', '濾': 'menyaring', '煮': 'merebus', '焼': 'membakar, memanggang', '炒': 'menumis',
  '揚': 'menggoreng, menaikkan', '潰': 'meremukkan, menghancurkan', '砕': 'memecah, menghancurkan', '広': 'meluaskan', '狭': 'menyempitkan',
  '厚': 'tebal, murah hati', '敬': 'menghormati', '仁': 'perikemanusiaan, kebajikan', '剛': 'kuat, keras', '猛': 'ganas, hebat',
  '勇': 'keberanian', '怯': 'ketakutan, penakut', '辱': 'mempermalukan, aib', '贖': 'menebus', '懺': 'bertobat, menyesal',
  '悔': 'menyesal', '戒': 'memperingatkan, pantangan', '糾': 'mengoreksi, menyelidiki', '劾': 'mendakwa', '弊': 'kerugian, kebobrokan',
  '朽': 'lapuk, usang', '栄': 'makmur, jaya', '勃': 'timbul, meledak', '漲': 'meluap, membuncah', '溢': 'meluap, tumpah',
  '絆': 'ikatan, pertalian', '縁': 'pertalian, hubungan', '曲': 'melengkung; lagu', '恥': 'malu, aib', '興': 'gairah; bangkit',
};

// ── ID_DICT: terjemahan glos Inggris pendek (sisa preview N1) → Indonesia ──
const ID_DICT = {
  surname:'nama keluarga', govern:'memerintah', foundation:'fondasi', value:'nilai', propose:'mengusulkan',
  raise:'mengangkat', respond:'menanggapi', plan:'merencanakan', inspect:'memeriksa', proof:'bukti',
  support:'mendukung', perform:'melaksanakan', protect:'melindungi', expand:'memperluas', condition:'kondisi',
  judge:'menilai', aspire:'bercita-cita', publish:'menerbitkan', secret:'rahasia', withdraw:'menarik mundur',
  'set aside':'menyisihkan', rescue:'menyelamatkan', grasp:'menggenggam', shave:'mengikis', maintain:'mempertahankan',
  prison:'penjara', invite:'mengundang', soul:'jiwa', virtue:'kebajikan', obstacle:'hambatan', consider:'mempertimbangkan',
  anxiety:'kecemasan', collide:'bertabrakan', supervise:'mengawasi', compensate:'mengganti rugi', obey:'mematuhi',
  servitude:'perbudakan', congeal:'membeku', break:'merusak', nostalgia:'kerinduan', capture:'menangkap', scheme:'bersekongkol',
  confused:'bingung', return:'kembali', constitution:'konstitusi', defense:'pertahanan', reparation:'ganti rugi',
  humility:'kerendahan hati', purchase:'membeli', shrink:'menyusut', model:'teladan', outline:'gambaran umum',
  argue:'berdebat', criticize:'mengkritik', root:'akar', basis:'dasar', system:'sistem', standard:'standar',
  right:'hak', justice:'keadilan', duty:'tugas', urge:'mendesak', push:'mendorong', encourage:'menumbuhkan',
  shadow:'bayangan', echo:'gema', construct:'membangun', create:'menciptakan', territory:'wilayah', area:'kawasan',
  rule:'aturan', refuse:'menolak', reality:'kenyataan', effect:'efek', ratio:'rasio', benefit:'manfaat', loss:'kerugian',
  income:'pendapatan', expense:'biaya', invest:'berinvestasi', capital:'modal', property:'kekayaan', demand:'permintaan',
  supply:'pasokan', compete:'bersaing', contend:'bertarung', win:'menang', fail:'gagal', excel:'unggul', inferior:'rendahan',
  status:'status', difference:'perbedaan', equal:'setara', masses:'rakyat banyak', idea:'gagasan', discern:'membedakan',
  acknowledge:'mengakui', evaluate:'mengevaluasi', dispute:'sengketa', guess:'menduga', realize:'menyadari', feel:'merasakan',
  feeling:'perasaan', emotion:'emosi', desire:'keinginan', hope:'harapan', yearn:'mendambakan', hang:'menggantung',
  punish:'menghukum', admonish:'menasihati', prudence:'kehati-hatian', discreet:'sopan', even:'genap',
  twelfth:'zodiak ke-12', from:'dari', of:'milik', also:'juga', mutually:'saling', turtle:'kura-kura', deceased:'almarhum',
  humanity:'kemanusiaan', hermit:'pertapa', fell:'menebang', samurai:'samurai', haiku:'haiku', imitate:'meniru',
  arrogant:'sombong', merely:'hanya', fog:'kabut', frost:'embun beku', hail:'hujan es', thunder:'guntur',
  'hail stones':'butiran es', storm:'badai', clear:'jernih', muddy:'keruh', wither:'layu', bud:'tunas', moss:'lumut',
  seaweed:'rumput laut', flourish:'berkembang pesat', dense:'lebat', liver:'hati', spleen:'limpa', pancreas:'pankreas',
  pulse:'nadi', tumor:'tumor', waist:'pinggang', knee:'lutut', elbow:'siku', heel:'tumit', throat:'tenggorokan',
  stagnate:'mandek', slow:'lambat', slide:'meluncur', fast:'cepat', dull:'tumpul', sharp:'tajam', dry:'kering',
  moist:'lembab', soft:'lembut', hard:'keras', smash:'menghancurkan', carve:'memahat', engrave:'mengukir', weave:'menenun',
  dye:'mewarnai', drift:'terapung', sink:'tenggelam', float:'mengapung', sway:'berayun', shake:'bergetar', rumble:'menggemuruh',
  shout:'berteriak', whisper:'berbisik', roar:'mengaum', groan:'mengerang', 'sue/accuse':'menuntut/menuduh', reject:'menolak',
  abandon:'meninggalkan', overturn:'membalik', invade:'menyerbu', 'fall into':'terjerumus', arrest:'menangkap',
  litigation:'litigasi', console:'menghibur', concede:'mengalah', 'pierce/consistent':'menembus/konsisten', penetrate:'menembus',
  bestow:'menganugerahkan', pardon:'mengampuni', investigate:'menyelidiki', 'impeach/bullet':'mendakwa/peluru', impeach:'mendakwa',
  'imperial edict':'titah kekaisaran', 'examine/judge':'memeriksa/menilai', 'melt/finance':'melebur/keuangan', 'moisten/profit':'membasahi/laba',
  detriment:'kerugian', destitute:'miskin', 'store up':'menimbun', cultivate:'membudidayakan', brew:'membuat (sake)',
  'reel/repeat':'menggulung/mengulang', mend:'memperbaiki', installment:'cicilan', 'provide/bribe':'menyuapi/menyuap',
  swell:'membengkak', soar:'melonjak', 'violent/expose':'keras/membuka', harvest:'memanen', submerge:'membenamkan', soak:'merendam',
  pickle:'mengasinkan', fear:'takut', awe:'kagum', threaten:'mengancam', authority:'otoritas', intimidate:'mengintimidasi',
  instigate:'menghasut', rob:'merampok', 'peel/strip':'mengupas/melucuti', rush:'terburu-buru', crazy:'gila',
  reckless:'nekat', blind:'buta', decay:'membusuk', rot:'busuk', 'clean/pure':'bersih/murni', 'dirty/corrupt':'kotor/korup',
};
const translate = en => ID_DICT[(en || '').trim().toLowerCase()] || '';

// ── muat kanji-bank ──
const bank = new Map();
for (const b of JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/kanji-bank.json'), 'utf8')))
  if (b && b.k) bank.set(b.k, b);

// ── muat vocab-all.csv (expression,reading,romaji,meaning,meaning_id,tags) ──
function parseCSV(text) {
  const rows = []; let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else field += c;
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}
const vocabByExpr = new Map();
for (const r of parseCSV(fs.readFileSync(path.join(ROOT, 'assets/vocab-all.csv'), 'utf8')).slice(1)) {
  const expr = (r[0] || '').trim();
  if (!expr) continue;
  const rec = { reading: (r[1] || '').trim(), meaning: ((r[3] || '').trim() || (r[4] || '').trim()).replace(/^"|"$/g, ''), tags: (r[5] || '').trim() };
  if (!vocabByExpr.has(expr)) vocabByExpr.set(expr, []);
  vocabByExpr.get(expr).push(rec);
}

// ── korpus kurasi (arti contoh andal): N4 rawKanji, N5 array, kqPool N2-N5 ──
const curatedWord = new Map(); // word → {reading, meaning}
const curatedChar = new Map();  // char → [{word, reading, meaning}]
function addCurated(word, reading, meaning) {
  if (!word || !meaning || !/[\u4e00-\u9fff]/.test(word)) return;
  if (!curatedWord.has(word)) curatedWord.set(word, { reading: reading || '', meaning });
  const w = curatedWord.get(word);
  if (!w.meaning && meaning) w.meaning = meaning;
  for (const ch of word) {
    if (/[\u4e00-\u9fff]/.test(ch)) {
      if (!curatedChar.has(ch)) curatedChar.set(ch, []);
      curatedChar.get(ch).push({ word, reading: reading || '', meaning });
    }
  }
}
for (const f of ['Materi/Kanji-N4.html', 'Materi/Kanji-N5.html']) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const m = h.match(/const rawKanji = `([\s\S]*?)`;/);
  if (m) for (const line of m[1].trim().split('\n')) {
    const p = line.split('|');
    if (p.length >= 7) addCurated(p[4].trim(), p[5].trim(), p[6].trim());
  }
  const a = h.match(/const kanjiN5 = \[([\s\S]*?)\];/);
  if (a) for (const row of a[1].matchAll(/\[[^\]]*\]/g)) {
    const c = row[0].match(/'([^']*)'/g) || [];
    if (c.length >= 7) addCurated(c[4].slice(1, -1), c[5].slice(1, -1), c[6].slice(1, -1));
  }
}
for (const f of ['Materi/Kanji-N2.html', 'Materi/Kanji-N3.html', 'Materi/Kanji-N4.html', 'Materi/Kanji-N5.html', 'Materi/Kanji-N1.html']) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const x of h.matchAll(/([\u4e00-\u9fff]{2,4})\(([^()]{1,14})\)=([^,'\]]{2,60})/g))
    addCurated(x[1], x[2], x[3].trim());
  // bentuk 'kata = arti' tanpa tanda kurung (kqPoolN1 bagian awal)
  for (const x of h.matchAll(/'([\u4e00-\u9fff]{2,4}) = ([^',]{2,60})/g))
    addCurated(x[1], '', x[2].trim());
}

// ── parse halaman eksisting ──
function parseCompact(html, constName) {
  const m = html.match(new RegExp('const ' + constName + ' = `([\\s\\S]*?)`'));
  const out = [];
  if (!m) return out;
  for (const mm of m[1].matchAll(/([\u4e00-\u9fff])([^一-龯]*)/g))
    if (mm[1] && mm[2].trim()) out.push({ kanji: mm[1], meaning: mm[2].trim() });
  return out;
}
const ORIG = '/tmp/orig'; // salinan pra-patch (git HEAD)
const rf = f => fs.existsSync(path.join(ORIG, f)) ? fs.readFileSync(path.join(ORIG, f), 'utf8') : fs.readFileSync(path.join(ROOT, 'Materi/' + f), 'utf8');
const n3h = rf('Kanji-N3.html');
const n2h = rf('Kanji-N2.html');
const n1h = rf('Kanji-N1.html');

const compactByChar = new Map(); // arti Indonesia dari compact (baris kana dianggap bukan arti)
function compactMeaning(c) {
  if (compactByChar.has(c.kanji)) return compactByChar.get(c.kanji);
  let v = '';
  if (/[a-zà-ÿ]/i.test(c.meaning) && !/[ぁ-んァ-ン]/.test(c.meaning)) v = c.meaning;
  compactByChar.set(c.kanji, v);
  return v;
}
const _seen = new Set();
for (const c of [...parseCompact(n3h, 'compact'), ...parseCompact(n2h, 'compact')])
  if (!_seen.has(c.kanji)) { _seen.add(c.kanji); compactMeaning(c); }

// pool N1: baris [kanji, arti?, baca?, contoh…] format campur
const n1PoolByChar = new Map();
{
  const pm = n1h.match(/const kqPoolN1 = \[([\s\S]*?)\];\n\nlet kqIdxN1/);
  if (pm) for (const seg of pm[1].split(/\],\s*\[/)) {
    const cells = seg.trim().replace(/^\['/, '').replace(/^'/, '').replace(/'$/, '').split("','");
    if (!cells[0] || cells[0].length !== 1 || !/[\u4e00-\u9fff]/.test(cells[0])) continue;
    const hasKana = s => /[ぁ-んァ-ン]/.test(s);
    const hasKanji = s => /[\u4e00-\u9fff]/.test(s);
    const arti = cells.filter(c => !hasKana(c) && !hasKanji(c) && /[a-z]/i.test(c))[0] || '';
    const kana = cells.filter(hasKana)[0] || '';
    const ex = cells.filter(c => hasKanji(c) && c.includes('(')).join(', ');
    if (!n1PoolByChar.has(cells[0])) n1PoolByChar.set(cells[0], { arti, read: kana.replace(/\//g, '・'), ex });
  }
}
// preview N1: [kanji, glos EN]
const n1Preview = [];
for (const mm of n1h.matchAll(/\[\x27([\u4e00-\u9fff])\x27,\x27([^\x27]+)\x27\]/g))
  n1Preview.push({ kanji: mm[1], en: mm[2] });
const n1PreviewMap = new Map(n1Preview.map(p => [p.kanji, p]));

// ── arti per karakter ──
function pickMeaning(char) {
  const b = bank.get(char);
  if (b && b.arti && !/[A-Za-z]/.test(b.arti) && b.arti !== '-') return b.arti;
  const cp = compactByChar.get(char);
  if (cp) return cp;
  const pool = n1PoolByChar.get(char);
  if (pool && pool.arti) return pool.arti;
  const pv = n1PreviewMap.get(char);
  if (pv) { const t = translate(pv.en); if (t) return t; }
  const fb = N2_ARTI_FALLBACK[char];
  if (fb) return fb;
  if (b && b.arti && b.arti !== '-') return b.arti; // glos EN bank — pengganti terakhir
  return '';
}

// ── saringan arti vocab (buang glos Inggris/mesin yang jelas salah) ──
const BAD_GLOSS = new Set(['sebuah; suatu', 'karakter', 'lewat; melewati', 'mendapatkan; menjadi', 'sangat baik', 'kertas', 'wawancara', 'terjadi', 'menjadi', 'mendapatkan', 'sangat', 'telah', 'kelas', 'ujian']);
function glossOK(m, tags) {
  if (!m) return false;
  const t = m.trim();
  if (t.length < 3 || t.length > 130) return false;
  if (/JMdict-EN/.test(tags || '')) return false;
  if (/\b(the|and|with|from|into|about|through|after|before|between|against)\b/i.test(t)) return false;
  if (BAD_GLOSS.has(t)) return false;
  if (/^(sebuah|suatu|yang|dan|atau|ini|itu|untuk|dengan)\b/.test(t) && t.length < 14) return false;
  return true;
}
// ── contoh kata: korpus kurasi → vocab ber-JLPT → vocab umum ──
const KANA_RE = /^[ぁ-んァ-ンー・0-9.]+$/; // reading hanya kana (bukan romaji)
function fillFromVocab(c) {
  const out = { word: c.word, reading: c.reading || '', meaning: c.meaning || '' };
  const recs = vocabByExpr.get(c.word);
  if (!recs) return out;
  for (const rec of recs) {
    if (!out.reading && KANA_RE.test(rec.reading || '')) out.reading = rec.reading;
    if (!out.meaning && glossOK(rec.meaning, rec.tags)) out.meaning = rec.meaning;
    if (out.reading && out.meaning) break;
  }
  return out;
}
function exampleFor(char, lvTags) {
  const curated = curatedChar.get(char);
  if (curated) return fillFromVocab(curated[0]);
  let best = null;
  for (const [expr, recs] of vocabByExpr) {
    if (expr.length < 2 || expr.length > 4 || !expr.includes(char)) continue;
    if (!/^[\u4e00-\u9fff]{2,4}$/.test(expr)) continue;
    for (const rec of recs) {
      if (!glossOK(rec.meaning, rec.tags)) continue;
      if (rec.reading && !KANA_RE.test(rec.reading)) continue; // buang reading romaji
      let score = 0;
      if (lvTags.some(t => rec.tags.includes(t))) score = 3;
      else if (/JLPT/.test(rec.tags)) score = 2;
      else score = 1; // baris umum tanpa tag JLPT — pilihan terakhir agar kartu tetap punya contoh
      if (!best || score > best.score || (score === best.score && expr.length < best.word.length))
        best = { word: expr, reading: rec.reading, meaning: rec.meaning, score };
      if (score === 3) break;
    }
    if (best && best.score === 3) break;
  }
  if (best) return { word: best.word, reading: best.reading, meaning: best.meaning };
  // Fase 2: tanpa kandidat Indonesia → glos Inggris JMdict (sudah bersih pasca
  // fix-jlpt-glosses). Inggris yang benar lebih berguna daripada tak ada contoh.
  for (const [expr, recs] of vocabByExpr) {
    if (expr.length < 2 || expr.length > 4 || !expr.includes(char)) continue;
    if (!/^[\u4e00-\u9fff]{2,4}$/.test(expr)) continue;
    for (const rec of recs) {
      if (!rec.meaning || rec.meaning.length < 2 || rec.meaning.length > 130) continue;
      if (rec.reading && !KANA_RE.test(rec.reading)) continue;
      return { word: expr, reading: rec.reading, meaning: rec.meaning };
    }
  }
  return null;
}

// ── rangkai baris rawKanji per level ──
const esc = s => (s || '').replace(/\|/g, '／').trim();
function readings(char) {
  const b = bank.get(char);
  const fb = KANJI_FALLBACK[char] || {};
  const on = (b && b.on) || fb.on || '';
  const kun = (b && b.kun) || fb.kun || '';
  return { on, kun };
}
function buildRows(chars, lvTags) {
  const out = [];
  const rep = { total: chars.length, noMeaning: 0, noOn: 0, noKun: 0, noExample: 0 };
  for (const ch of chars) {
    const r = readings(ch);
    const meaning = pickMeaning(ch);
    const ex = exampleFor(ch, lvTags);
    out.push([ch, r.on, r.kun, meaning, ex ? ex.word : '', ex ? ex.reading : '', ex ? esc(ex.meaning) : ''].join('|'));
    if (!meaning) rep.noMeaning++;
    if (!r.on) rep.noOn++;
    if (!r.kun) rep.noKun++;
    if (!ex) rep.noExample++;
  }
  return { blob: out.join('\n'), rep };
}
const n3Chars = [...new Set(parseCompact(n3h, 'compact').map(c => c.kanji))];
const n2Chars = [...new Set(parseCompact(n2h, 'compact').map(c => c.kanji))];
const n1CharMap = new Map();
for (const p of n1PoolByChar.keys()) if (!n1CharMap.has(p)) n1CharMap.set(p, p);
for (const p of n1Preview) if (!n1CharMap.has(p.kanji)) n1CharMap.set(p.kanji, p.kanji);
const n1Chars = [...n1CharMap.keys()];

const r3 = buildRows(n3Chars, ['JLPT_3', 'JLPT_N3']);
const r2 = buildRows(n2Chars, ['JLPT_2', 'JLPT_N2']);
const r1 = buildRows(n1Chars, ['JLPT_1', 'JLPT_N1']);

function show(name, r) {
  console.log(`== ${name}: ${r.rep.total} kartu | tanpa arti ${r.rep.noMeaning} | tanpa on ${r.rep.noOn} | tanpa kun ${r.rep.noKun} | tanpa contoh ${r.rep.noExample}`);
}
show('N3', r3); show('N2', r2); show('N1', r1);
fs.writeFileSync('/tmp/kanji-blob-n3.txt', r3.blob);
fs.writeFileSync('/tmp/kanji-blob-n2.txt', r2.blob);
fs.writeFileSync('/tmp/kanji-blob-n1.txt', r1.blob);
console.log('blob → /tmp/kanji-blob-n{3,2,1}.txt');
