/**
 * merge-vocab-v2.js — Properly merge vocabulary with correct CSV formatting
 */

const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const ROOT_DIR = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT_DIR, 'assets', 'vocab-all.csv');

// ═══════════════════════════════════════════════════════════════════
// CSV UTILITIES
// ═══════════════════════════════════════════════════════════════════

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function csvEscape(value) {
  const str = String(value || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ═══════════════════════════════════════════════════════════════════
// JLPT WORDLISTS (deduplicated)
// ═══════════════════════════════════════════════════════════════════

const JLPT_WORDS = [
  // N5
  ['私','わたし','I/me'],['あなた','あなた','you'],['彼','かれ','he'],['彼女','かのじょ','she'],
  ['これ','これ','this'],['それ','それ','that'],['あれ','あれ','that over there'],
  ['ここ','ここ','here'],['そこ','そこ','there'],['あそこ','あそこ','over there'],
  ['どこ','どこ','where'],['だれ','だれ','who'],['なに','なに','what'],['いつ','いつ','when'],
  ['今日','きょう','today'],['明日','あした','tomorrow'],['昨日','きのう','yesterday'],
  ['今','いま','now'],['朝','あさ','morning'],['昼','ひる','noon'],['夜','よる','night'],
  ['食べる','たべる','to eat'],['飲む','のむ','to drink'],['行く','いく','to go'],
  ['来る','くる','to come'],['見る','みる','to see'],['聞く','きく','to listen'],
  ['話す','はなす','to speak'],['読む','よむ','to read'],['書く','かく','to write'],
  ['買う','かう','to buy'],['作る','つくる','to make'],['使う','つかう','to use'],
  ['待つ','まつ','to wait'],['入る','はいる','to enter'],['出る','でる','to exit'],
  ['歩く','あるく','to walk'],['走る','はしる','to run'],['泳ぐ','およぐ','to swim'],
  ['開ける','あける','to open'],['閉める','しめる','to close'],['始める','はじめる','to begin'],
  ['終わる','おわる','to finish'],['忘れる','わすれる','to forget'],['覚える','おぼえる','to remember'],
  ['教える','おしえる','to teach'],['学ぶ','まなぶ','to learn'],['考える','かんがえる','to think'],
  ['思う','おもう','to think'],['知る','しる','to know'],['わかる','わかる','to understand'],
  ['家','いえ','house'],['部屋','へや','room'],['台所','だいどうろ','kitchen'],
  ['椅子','いす','chair'],['テーブル','テーブル','table'],['冷蔵庫','れいぞうこ','refrigerator'],
  ['水','みず','water'],['お茶','おちゃ','tea'],['牛乳','ぎゅうにゅう','milk'],
  ['ご飯','ごはん','rice'],['パン','パン','bread'],['肉','にく','meat'],
  ['魚','さかな','fish'],['野菜','やさい','vegetables'],['卵','たまご','egg'],
  ['学校','がっこう','school'],['大学','だいがく','university'],['病院','びょういん','hospital'],
  ['銀行','ぎんこう','bank'],['郵便局','ゆうびんきょく','post office'],['駅','えき','station'],
  ['友達','ともだち','friend'],['先生','せんせい','teacher'],['医者','いしゃ','doctor'],
  ['男','おとこ','man'],['女','おんな','woman'],['子供','こども','child'],
  ['名前','なまえ','name'],['年','とし','age'],['月','つき','month'],['日','ひ','day'],
  ['月曜日','げつようび','Monday'],['火曜日','かようび','Tuesday'],['水曜日','すいようび','Wednesday'],
  ['木曜日','もくようび','Thursday'],['金曜日','きんようび','Friday'],['土曜日','どようび','Saturday'],
  ['日曜日','にちようび','Sunday'],['天気','てんき','weather'],['雨','あめ','rain'],['雪','ゆき','snow'],
  ['高い','たかい','expensive/tall'],['安い','やすい','cheap'],['大きい','おおきい','big'],
  ['小さい','ちいさい','small'],['新しい','あたらしい','new'],['古い','ふるい','old'],
  ['良い','いい','good'],['悪い','わるい','bad'],['面白い','おもしろい','interesting'],
  ['元気','げんき','health'],['病気','びょうき','illness'],['薬','くすり','medicine'],
  ['体','からだ','body'],['頭','あたま','head'],['目','め','eye'],['耳','みみ','ear'],
  ['口','くち','mouth'],['手','て','hand'],['足','あし','foot'],
  ['仕事','しごと','work'],['会社','かいしゃ','company'],['言葉','ことば','word'],
  ['朝ごはん','あさごはん','breakfast'],['昼ごはん','ひるごはん','lunch'],['晩ごはん','ばんごはん','dinner'],
  // N4
  ['経験','けいけん','experience'],['文化','ぶんか','culture'],['社会','しゃかい','society'],
  ['経済','けいざい','economy'],['教育','きょういく','education'],['環境','かんきょう','environment'],
  ['技術','ぎじゅつ','technology'],['科学','かがく','science'],['歴史','れきし','history'],
  ['世界','せかい','world'],['空','そら','sky'],['海','うみ','sea'],['山','やま','mountain'],
  ['川','かわ','river'],['森','もり','forest'],['道','みち','road'],['橋','はし','bridge'],
  ['静か','しずか','quiet'],['賑やか','にぎやか','lively'],['便利','べんり','convenient'],
  ['簡単','かんたん','simple'],['正確','せいかく','accurate'],['丁寧','ていねい','polite'],
  ['親切','しんせつ','kind'],['礼儀','れいぎ','manners'],['挨拶','あいさつ','greeting'],
  ['住所','じゅうしょ','address'],['名前','なまえ','name'],['国籍','こくせき','nationality'],
  ['習慣','しゅうかん','habit'],['伝統','でんとう','tradition'],['現代','げんだい','modern'],
  ['未来','みらい','future'],['過去','かこ','past'],['人生','じんせい','life'],
  ['幸福','こうふく','happiness'],['夢','ゆめ','dream'],['真実','しんじつ','truth'],
  ['平和','へいわ','peace'],['自由','じゆう','freedom'],['規則','きそく','rule'],
  ['法律','ほうりつ','law'],['契約','けいやく','contract'],['責任','せきにん','responsibility'],
  // N3
  ['尊敬','そんけい','respect'],['謙遜','けんそん','humility'],['風景','ふうけい','scenery'],
  ['印象','いんしょう','impression'],['記憶','きおく','memory'],['予想','よそう','expectation'],
  ['研究','けんきゅう','research'],['実験','じっけん','experiment'],['観察','かんさつ','observation'],
  ['分析','ぶんせき','analysis'],['情報','じょうほう','information'],['知識','ちしき','knowledge'],
  ['理解','りかい','understanding'],['概念','がいねん','concept'],['理論','りろん','theory'],
  ['哲学','てつがく','philosophy'],['文化','ぶんか','culture'],['音楽','おんがく','music'],
  ['芸術','げいじゅつ','art'],['映像','えいぞう','image'],['写真','しゃしん','photo'],
  ['経営','けいえい','management'],['販売','はんばい','sales'],['営業','えいぎょう','business'],
  ['福祉','ふくし','welfare'],['保険','ほけん','insurance'],['年金','ねんきん','pension'],
  ['雇用','こよう','employment'],['労働','ろうどう','labor'],['安全','あんぜん','safety'],
  // N2
  ['抽象','ちゅうしょう','abstract'],['具体的','ぐたいてき','concrete'],['一般的','いっぱんてき','general'],
  ['特殊','とくしゅ','special'],['標準','ひょうじゅん','standard'],['例外','れいがい','exception'],
  ['要件','ようけん','requirement'],['基準','きじゅん','standard'],['品質','ひんしつ','quality'],
  ['機能','きのう','function'],['効率','こうりつ','efficiency'],['利点','りてん','advantage'],
  ['欠点','けってん','disadvantage'],['強み','つよみ','strength'],['弱み','よわみ','weakness'],
  ['特徴','とくちょう','characteristic'],['優先','ゆうせん','priority'],['深刻','しんこく','serious'],
  ['調整','ちょうせい','adjustment'],['円滑','えんかつ','smooth'],['有効','ゆうこう','effective'],
  ['前提','ぜんてい','premise'],['背景','はいけい','background'],['文脈','ぶんみゃく','context'],
  ['要点','ようてん','main point'],['核心','かくしん','core'],['本質','ほんしつ','essence'],
  ['根拠','こんきょ','basis'],['証拠','しょうこ','evidence'],['実証','じっょう','demonstration'],
  // N1
  ['包括','ほうかつ','comprehensive'],['体系','たいけい','systematic'],['構造','こうぞう','structure'],
  ['制度','せいど','institution'],['概念','がいねん','conceptual'],['論理的','ろんりてき','logical'],
  ['客観的','きゃっかんてき','objective'],['根本的','こんぽんてき','fundamental'],
  ['本質的','ほんしつてき','essential'],['決定的','けっていてき','decisive'],
  // Kaigo-specific terms
  ['介護','かいご','nursing care'],['福祉','ふくし','welfare'],['リハビリ','リハビリ','rehabilitation'],
  ['ADL','ADL','activities of daily living'],['IADL','IADL','instrumental ADL'],
  ['エレベーター','エレベーター','elevator'],['車椅子','くるまいす','wheelchair'],
  ['ベッド','ベッド','bed'],['歩行器','ほこうき','walker'],['杖','つえ','cane'],
  ['食事','しょくじ','meal'],['入浴','にゅうよく','bathing'],['排泄','はいせつ','excretion'],
  ['更衣','こうい','changing clothes'],['通院','つういん','hospital visit'],
  ['訪問','ほうもん','visit'],['介護','かいご','care'],['看護','かんご','nursing'],
  ['医療','いりょう','medical'],['健康','けんこう','health'],['福祉','ふくし','welfare'],
  ['相談','そうだん','consultation'],['支援','しえん','support'],['指導','しどう','guidance'],
  ['訓練','くんれん','training'],['運動','うんどう','exercise'],['歩行','ほこう','walking'],
  ['自立','じりつ','independence'],['社会','しゃかい','society'],['生活','せいかつ','life'],
  ['家族','かぞく','family'],['地域','ちいき','community'],['高齢','こうれい','elderly'],
  ['障害','しょうがい','disability'],['要介護','ようかいご','requiring care'],
  ['要支援','ようしえん','requiring support'],['ケアマネジャー','ケアマネジャー','care manager'],
  ['介護福祉士','かいごふくしし','care worker'],['社会福祉士','しゃかいふくしし','social worker'],
  ['ホームヘルパー','ホームヘルパー','home helper'],['デイサービス','デイサービス','day service'],
  ['ショートステイ','ショートステイ','short stay'],['グループホーム','グループホーム','group home'],
  ['特別養護老人ホーム','とくべつようろうろうじんホーム','special nursing home'],
  ['老人保健施設','ろうじんほけんしせつ','elderly health facility'],
  ['介護保険','かいごほけん','long-term care insurance'],['第1号保険者','だいいちごうほけんしゃ','Category 1 insured'],
  ['第2号保険者','だいにごうほけんしゃ','Category 2 insured'],['保険料','ほけんりょう','premium'],
  ['給付','きゅうふ','benefit'],['給付金','きゅうふきん','benefit payment'],
  ['支給','しきゅう','payment'],['限度額','げんどがく','maximum amount'],
  ['自己負担','じこふたん','co-payment'],['3割','さんわり','30% copay'],
  ['2割','にわり','20% copay'],['1割','いちわり','10% copay'],
  ['要介護1','ようかいごいち','care level 1'],['要介護2','ようかいごに','care level 2'],
  ['要介護3','ようかいごさん','care level 3'],['要介護4','ようかいごよん','care level 4'],
  ['要介護5','ようかいごご','care level 5'],['要支援1','ようしえんいち','support level 1'],
  ['要支援2','ようしえんに','support level 2'],['ケアマネジメント','ケアマネジメント','care management'],
  ['アセスメント','アセスメント','assessment'],['モニタリング','モニタリング','monitoring'],
  ['ケアプラン','ケアプラン','care plan'],['介護記録','かいごきろく','care record'],
  ['バイタルサイン','バイタルサイン','vital signs'],['体温','たいおん','body temperature'],
  ['血圧','けつあつ','blood pressure'],['脈拍','みゃくはく','pulse'],['呼吸','こきゅう','respiration'],
  ['体重','たいじゅう','body weight'],['身長','しんちょう','height'],['疼痛','とうつう','pain'],
  ['めまい','めまい','dizziness'],['吐気','はきけ','nausea'],['食欲','しょくよく','appetite'],
  ['睡眠','すいみん','sleep'],['意識','いしき','consciousness'],['認知症','にんちしょう','dementia'],
  ['アルツハイマー','アルツハイマー','Alzheimer\'s'],['脳血管','のうけっかん','cerebrovascular'],
  ['糖尿病','とうにょうびょう','diabetes'],['高血圧','こうけつあつ','hypertension'],
  ['心臓病','しんぞうびょう','heart disease'],['呼吸器','こきゅうき','respiratory organ'],
  ['運動器','うんどうき','locomotor system'],['脊柱せきちゅう','spine'],['関節','かんせつ','joint'],
  ['筋肉','きんにく','muscle'],['骨','ほね','bone'],['皮膚','ひふ','skin'],
  ['褥瘡','じょくそう','pressure ulcer'],['誤嚥','ごえん','aspiration'],['肺炎','はいえん','pneumonia'],
  ['尿路感染症','にょうろかんせんしょう','urinary tract infection'],['便秘','べんぴ','constipation'],
  ['下痢','げり','diarrhea'],['食欲不振','しょくよくふしん','loss of appetite'],
  ['栄養失調','えいようしっちょう','malnutrition'],['脱水','だっすい','dehydration'],
  ['貧血','ひんけつ','anemia'],['浮腫','ふしゅ','edema'],['壊死','えし','necrosis'],
  ['拘縮','こうしゅく','contracture'],['廃用症候群','はいようしょうこうぐん','disuse syndrome'],
  ['認知症ケア','にんちしょうケア','dementia care'],['BPSD','BPSD','behavioral psychological symptoms'],
  ['デリリウム','デリリウム','delirium'],['うつ病','うつびょう','depression'],
  ['アガピー','アガピー','agape'],['エンパシー','エンパシー','empathy'],
  ['コンサーン','コンサーン','concern'],['アドボカシー','アドボカシー','advocacy'],
  ['エンパワーメント','エンパワーメント','empowerment'],['パーソンセンター','パーソンセンター','person-centered'],
  ['ノーマライゼーション','ノーマライゼーション','normalization'],['インクルージョン','インクルージョン','inclusion'],
  ['ウエルビーイング','ウエルビーイング','wellbeing'],['QOL','QOL','quality of life'],
  ['ニーズ','ニーズ','needs'],['ウォンツ','ウォンツ','wants'],['ギフト','ギフト','gift'],
  ['アセット','アセット','assets'],['レスилиエンス','レスилиエンス','resilience'],
];

// De-duplicate
const uniqueJlpt = [];
const seenJlpt = new Set();
for (const w of JLPT_WORDS) {
  const key = w[0] + '|' + w[2];
  if (!seenJlpt.has(key)) {
    seenJlpt.add(key);
    uniqueJlpt.push(w);
  }
}
console.log(`JLPT wordlist: ${JLPT_WORDS.length} raw → ${uniqueJlpt.length} unique`);

// ═══════════════════════════════════════════════════════════════════
// EXTRACT FROM MATERI PAGES
// ═══════════════════════════════════════════════════════════════════

function extractVocabFromMateri() {
  const files = fs.readdirSync(MATERI_DIR).filter(f => f.endsWith('.html'));
  const allVocab = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(MATERI_DIR, file), 'utf8');
    
    // Extract PH_VOCAB arrays
    const matches = content.matchAll(/var\s+\w+_?VOCAB\s*=\s*(\[[\s\S]*?\]);/g);
    for (const m of matches) {
      try {
        const arr = JSON.parse(m[1].replace(/'/g, '"'));
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (Array.isArray(item) && item.length >= 3) {
              allVocab.push({
                expression: item[0],
                reading: item[1],
                meaning: item[2],
                level: 'Materi'
              });
            }
          }
        }
      } catch(e) {
        try {
          const arr = eval(m[1]);
          if (Array.isArray(arr)) {
            for (const item of arr) {
              if (Array.isArray(item) && item.length >= 3) {
                allVocab.push({
                  expression: item[0],
                  reading: item[1],
                  meaning: item[2],
                  level: 'Materi'
                });
              }
            }
          }
        } catch(e2) {}
      }
    }
  }
  
  return allVocab;
}

function extractVocabFromKaigo() {
  const files = fs.readdirSync(MATERI_DIR).filter(f => f.startsWith('Kaigo') && f.endsWith('.html'));
  const allVocab = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(MATERI_DIR, file), 'utf8');
    
    // Extract inline vocab patterns like ["word", "reading", "meaning"]
    const inlineMatches = content.matchAll(/\["([\u3040-\u9fff\u30a0-\u30ff\u3040-\u309f]+(?:\([^)]*\))?)",\s*"([^"]*)",\s*"([^"]*)"\]/g);
    for (const im of inlineMatches) {
      allVocab.push({
        expression: im[1],
        reading: im[2],
        meaning: im[3],
        level: 'Kaigo'
      });
    }
  }
  
  return allVocab;
}

function extractVocabFromExplanations() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'seed', 'kaigo_explanation_id.json'), 'utf8'));
    const allVocab = [];
    
    for (const [key, explanation] of Object.entries(data)) {
      const parts = key.split('=');
      if (parts.length >= 2) {
        const expression = parts[0].trim();
        const reading = parts[1].trim();
        const meaning = explanation.slice(0, 100);
        
        if (/[\u3040-\u9fff]/.test(expression) && expression.length <= 20) {
          allVocab.push({
            expression,
            reading,
            meaning,
            level: 'Kaigo'
          });
        }
      }
    }
    
    return allVocab;
  } catch(e) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

console.log('=== Extracting vocabulary ===');

const materiVocab = extractVocabFromMateri();
console.log(`Materi: ${materiVocab.length} entries`);

const kaigoVocab = extractVocabFromKaigo();
console.log(`Kaigo: ${kaigoVocab.length} entries`);

const explanationVocab = extractVocabFromExplanations();
console.log(`Kaigo explanations: ${explanationVocab.length} entries`);

// Load existing vocab
const existingCsv = fs.readFileSync(CSV_PATH, 'utf8');
const existingLines = existingCsv.split('\n').filter(l => l.trim());
console.log(`Existing: ${existingLines.length - 1} entries`);

// Build merged vocabulary using Map for deduplication
const merged = new Map();

// Add existing vocab
for (let i = 1; i < existingLines.length; i++) {
  const parts = parseCsvLine(existingLines[i]);
  if (parts.length >= 5) {
    const expression = parts[0];
    const reading = parts[1];
    const romaji = parts[2];
    const meaning = parts[4] || parts[3];
    const tags = parts[5] || '';
    
    if (expression && meaning) {
      merged.set(expression, { expression, reading, romaji, meaning: meaning.replace(/"/g, ''), tags });
    }
  }
}

// Add JLPT words
for (const w of uniqueJlpt) {
  if (!merged.has(w[0])) {
    merged.set(w[0], { expression: w[0], reading: w[1], romaji: '', meaning: w[2], tags: 'JLPT' });
  }
}

// Add Materi vocab
for (const v of materiVocab) {
  if (!merged.has(v.expression)) {
    merged.set(v.expression, { expression: v.expression, reading: v.reading, romaji: '', meaning: v.meaning, tags: 'Materi' });
  }
}

// Add Kaigo vocab
for (const v of kaigoVocab) {
  if (!merged.has(v.expression)) {
    merged.set(v.expression, { expression: v.expression, reading: v.reading, romaji: '', meaning: v.meaning, tags: 'Kaigo' });
  }
}

// Add Kaigo explanations (only unique ones)
for (const v of explanationVocab) {
  if (!merged.has(v.expression)) {
    merged.set(v.expression, { expression: v.expression, reading: v.reading, romaji: '', meaning: v.meaning, tags: 'Kaigo' });
  }
}

// Write CSV with proper escaping
const csvHeader = 'expression,reading,romaji,meaning,meaning_id,tags';
const csvRows = Array.from(merged.values()).map(v => {
  return [
    csvEscape(v.expression),
    csvEscape(v.reading),
    csvEscape(v.romaji || ''),
    csvEscape(v.meaning),
    csvEscape(v.meaning),
    csvEscape(v.tags)
  ].join(',');
});

const csvContent = csvHeader + '\n' + csvRows.join('\n') + '\n';
fs.writeFileSync(CSV_PATH, csvContent, 'utf8');

console.log('\n=== MERGE COMPLETE ===');
console.log(`Total unique entries: ${merged.size}`);
console.log(`New entries added: ${merged.size - (existingLines.length - 1)}`);
console.log(`File size: ${(Buffer.byteLength(csvContent) / 1024).toFixed(1)} KB`);
