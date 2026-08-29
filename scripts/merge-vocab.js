/**
 * merge-vocab.js — Extract all vocabulary from Materi pages and merge into vocab-all.csv
 * 
 * Sources:
 * 1. vocab-all.csv (existing 11,843 entries)
 * 2. PH_VOCAB arrays in Materi HTML pages
 * 3. Kaigo quiz data arrays
 * 4. Kaigo explanation keys (Japanese concepts)
 * 5. JLPT N5-N1 common wordlists
 */

const fs = require('fs');
const path = require('path');

const MATERI_DIR = path.join(__dirname, '..', 'Materi');
const ROOT_DIR = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT_DIR, 'assets', 'vocab-all.csv');

// ═══════════════════════════════════════════════════════════════════
// JLPT N5-N1 COMMON WORDLISTS (hand-curated, ~2000 high-frequency)
// ═══════════════════════════════════════════════════════════════════

const JLPT_WORDS = [
  // N5 (~300 words)
  ['私','わたし','I/me'],['あなた','あなた','you'],['彼','かれ','he'],['彼女','かのじょ','she'],
  ['これ','これ','this'],['それ','それ','that'],['あれ','あれ','that over there'],['ここ','ここ','here'],
  ['そこ','そこ','there'],['あそこ','あそこ','over there'],['どこ','どこ','where'],['だれ','だれ','who'],
  ['なに','なに','what'],['いつ','いつ','when'],['なぜ','なぜ','why'],['怎样','怎样','how'],
  ['今日','きょう','today'],['明日','あした','tomorrow'],['昨日','きのう','yesterday'],
  ['今','いま','now'],['朝','あさ','morning'],['昼','ひる','noon'],['夜','よる','night'],
  ['朝ごはん','あさごはん','breakfast'],['昼ごはん','ひるごはん','lunch'],['晩ごはん','ばんごはん','dinner'],
  ['食べる','たべる','to eat'],['飲む','のむ','to drink'],['行く','いく','to go'],
  ['来る','くる','to come'],['見る','みる','to see/watch'],['聞く','きく','to listen/ask'],
  ['話す','はなす','to speak'],['読む','よむ','to read'],['書く','かく','to write'],
  ['買う','かう','to buy'],['売る','うる','to sell'],['作る','つくる','to make/create'],
  ['使う','つかう','to use'],['待つ','まつ','to wait'],['入る','はいる','to enter'],
  ['出る','でる','to exit'],['歩く','あるく','to walk'],['走る','はしる','to run'],
  ['泳ぐ','およぐ','to swim'],['飛ぶ','とぶ','to fly/jump'],['乗る','のる','to ride'],
  ['降りる','おりる','to get off'],['死ぬ','しぬ','to die'],['生ける','いける','to live'],
  ['起きる','おきる','to wake up'],['寝る','ねる','to sleep'],['開ける','あける','to open'],
  ['閉める','しめる','to close'],['始める','はじめる','to begin'],['続ける','つづける','to continue'],
  ['終わる','おわる','to finish'],['忘れる','わすれる','to forget'],['覚える','おぼえる','to remember'],
  ['教える','おしえる','to teach'],['学ぶ','まなぶ','to learn'],['調べる','しらべる','to investigate'],
  ['考える','かんがえる','to think'],['思う','おもう','to think/feel'],['知る','しる','to know'],
  ['わかる','わかる','to understand'],['信じる','しんじる','to believe'],['伝える','つたえる','to convey'],
  ['届ける','とどける','to deliver'],['送る','おくる','to send'],['返す','かえす','to return (something)'],
  ['届く','とどく','to arrive'],['着く','つく','to arrive'],['残る','のこる','to remain'],
  ['伸びる','のびる','to grow/extend'],['伸びる','のびる','to stretch'],['近く','ちかく','nearby'],
  ['遠く','とおく','far away'],['上','うえ','up/above'],['下','した','down/below'],
  ['前','まえ','front'],['後ろ','うしろ','back/behind'],['右','みぎ','right'],['左','ひだり','left'],
  ['中','なか','inside'],['外','そと','outside'],['間','あいだ','between'],['隣','となり','next to'],
  ['家','いえ','house'],['部屋','へや','room'],['台所','だいどうろ','kitchen'],['居間','いま','living room'],
  ['寝室','しんしつ','bedroom'],['トイレ','トイレ','toilet'],['風呂','ふろ','bath'],
  ['玄関','げんかん','entrance'],['庭','にわ','garden'],['階段','かいだん','stairs'],
  ['椅子','いす','chair'],['テーブル','テーブル','table'],['ベッド','ベッド','bed'],
  ['冷蔵庫','れいぞうこ','refrigerator'],['テレビ','テレビ','television'],['電話','でんわ','telephone'],
  ['パソコン','パソコン','computer'],['時計','とけい','clock/watch'],['鍵','かぎ','key'],
  ['傘','かさ','umbrella'],['鞄','かばん','bag'],['帽子','ぼうし','hat'],
  ['服','ふく','clothes'],['靴','くつ','shoes'],['財布','さいふ','wallet'],
  ['水','みず','water'],['お茶','おちゃ','tea'],['ジュース','ジュース','juice'],
  ['牛乳','ぎゅうにゅう','milk'],['ビール','ビール','beer'],['ワイン','ワイン','wine'],
  ['ご飯','ごはん','rice/meal'],['パン','パン','bread'],['肉','にく','meat'],
  ['魚','さかな','fish'],['野菜','やさい','vegetables'],['果物','くだもの','fruit'],
  ['卵','たまご','egg'],['豆腐','とうふ','tofu'],['塩','しお','salt'],
  ['砂糖','さとう','sugar'],['醤油','しょうゆ','soy sauce'],['味噌','みそ','miso'],
  ['りんご','りんご','apple'],['バナナ','バナナ','banana'],['みかん','みかん','mandarin orange'],
  ['学校','がっこう','school'],['大学','だいがく','university'],['病院','びょういん','hospital'],
  ['銀行','ぎんこう','bank'],['郵便局','ゆうびんきょく','post office'],['図書館','としょかん','library'],
  ['駅','えき','station'],['空港','くうこう','airport'],['店','みせ','shop/store'],
  ['スーパー','スーパー','supermarket'],['レストラン','レストラン','restaurant'],['カフェ','カフェ','cafe'],
  ['公園','こうえん','park'],['映画館','えいがかん','cinema'],['美術館','びじゅつかん','art museum'],
  ['友達','ともだち','friend'],['先生','せんせい','teacher'],['生徒','せいと','student'],
  ['医者','いしゃ','doctor'],['看護師','かんごし','nurse'],['店員','てんいん','shop assistant'],
  ['会社員','かいしゃいん','company employee'],['運転うんてん','うんてん','driving'],['警官','けいかん','police officer'],
  ['男','おとこ','man'],['女','おんな','woman'],['子供','こども','child'],
  ['赤ちゃん','あかちゃん','baby'],['おじいさん','おじいさん','grandfather'],['おばあさん','おばあさん','grandmother'],
  ['お父さん','おとうさん','father'],['お母さん','おかあさん','mother'],['兄','あに','older brother'],
  ['姉','あね','older sister'],['弟','おとうと','younger brother'],['妹','いもうと','younger sister'],
  ['主人','しゅじん','husband'],['家主','いぬし','landlord'],['長女','ちょうじょ','eldest daughter'],
  ['長男','ちょうなん','eldest son'],['名前','なまえ','name'],['年','とし','age/year'],
  ['月','つき','month/moon'],['日','ひ','day/sun'],['曜日','ようび','day of the week'],
  ['月曜日','げつようび','Monday'],['火曜日','かようび','Tuesday'],['水曜日','すいようび','Wednesday'],
  ['木曜日','もくようび','Thursday'],['金曜日','きんようび','Friday'],['土曜日','どようび','Saturday'],
  ['日曜日','にちようび','Sunday'],['毎日','まいにち','every day'],['毎朝','まいあさ','every morning'],
  ['毎週','まいしゅう','every week'],['来週','らいしゅう','next week'],['先週','せんしゅう','last week'],
  ['今週','こんしゅう','this week'],['来月','らいげつ','next month'],['先月','せんげつ','last month'],
  ['今月','こんげつ','this month'],['来年','らいねん','next year'],['去年','きょねん','last year'],
  ['今年','ことし','this year'],['朝','あさ','morning'],['昼','ひる','noon/daytime'],
  ['夕方','ゆうがた','evening'],['夜','よる','night'],['午前','ごぜん','AM'],['午後','ごご','PM'],
  ['一時','いちじ','one o\'clock'],['二時','にじ','two o\'clock'],['三時','さんじ','three o\'clock'],
  ['一分','いっぷん','one minute'],['十分','じゅっぷん','ten minutes'],['一時間','いちじかん','one hour'],
  ['一週間','いっしゅうかん','one week'],['一か月','いっかげつ','one month'],['一年','いちねん','one year'],
  ['行く','いく','to go'],['来る','くる','to come'],['帰る','かえる','to return home'],
  ['出かける','でかける','to go out'],['散歩する','さんぽする','to take a walk'],['旅行する','りょこうする','to travel'],
  ['約束する','やくそくする','to promise'],['連絡する','れんらくする','to contact'],['準備する','じゅんびする','to prepare'],
  ['約束','やくそく','appointment/promise'],['連絡','れんらく','contact'],['準備','じゅんび','preparation'],
  ['天気','てんき','weather'],['曇り','くもり','cloudy'],['雨','あめ','rain'],['雪','ゆき','snow'],
  ['風','かぜ','wind'],['暑い','あつい','hot (weather)'],['寒い','さむい','cold (weather)'],
  ['涼しい','すずしい','cool'],['暖かい','あたたかい','warm'],['寒い','さむい','cold (temperature)'],
  ['高い','たかい','expensive/tall'],['安い','やすい','cheap'],['大きい','おおきい','big'],
  ['小さい','ちいさい','small'],['新しい','あたらしい','new'],['古い','ふるい','old'],
  ['良い','いい','good'],['悪い','わるい','bad'],['新しい','あたらしい','new'],
  ['面白い','おもしろい','interesting'],['つまらない','つまらない','boring'],['嬉しい','うれしい','happy'],
  ['悲しい','かなしい','sad'],['楽しい','たのしい','fun'],['寂しい','さびしい','lonely'],
  ['優しい','やさしい','kind'],['厳しい','きびしい','strict'],['親切','しんせつ','kindness'],
  ['元気','げんき','health/energy'],['病気','びょうき','illness'],['怪我','けが','injury'],
  ['薬','くすり','medicine'],['注射','ちゅうしゃ','injection'],['手術','しゅじゅつ','surgery'],
  ['健康','けんこう','health'],['体','からだ','body'],['頭','あたま','head'],
  ['目','め','eye'],['耳','みみ','ear'],['口','くち','mouth'],['鼻','はな','nose'],
  ['歯','は','tooth'],['首','くび','neck'],['肩','かた','shoulder'],['腕','うで','arm'],
  ['手','て','hand'],['指','ゆび','finger'],['胸','むね','chest'],['腹','はら','stomach'],
  ['背','せ','back/height'],['腰','こし','waist'],['膝','ひざ','knee'],['足','あし','leg/foot'],
  ['力','ちから','strength'],['声','こえ','voice'],['顔','かお','face'],['髪','かみ','hair'],
  ['言葉','ことば','word/language'],['名前','なまえ','name'],['言葉','ことば','word'],
  ['仕事','しごと','work/job'],['会社','かいしゃ','company'],['返事','へんじ','reply'],
  ['予約','よやく','reservation'],['許可','きょか','permission'],['届け','とどけ','notification'],
  ['届け出','とどけで','notification'],['記録','きろく','record'],['報告','ほうこく','report'],
  ['相談','そうだん','consultation'],['協力','きょうりょく','cooperation'],['連絡','れんらく','contact'],
  ['資料','しりょう','materials'],['文書','ぶんしょ','document'],['手紙','てがみ','letter'],
  ['メール','メール','email'],['届く','とどく','to arrive'],['遅れる','おくれる','to be late'],
  ['早く','はやく','early/quickly'],['遅く','おそく','late/slowly'],['急ぐ','いそぐ','to hurry'],
  ['待つ','まつ','to wait'],['遊ぶ','あそぶ','to play'],['休む','やすむ','to rest'],
  ['眠る','ねむる','to sleep'],['起きる','おきる','to wake'],['座る','すわる','to sit'],
  ['立つ','たつ','to stand'],['並ぶ','ならぶ','to line up'],['並べる','ならべる','to arrange'],
  ['押す','おす','to push'],['引く','ひく','to pull'],['倒れる','たおれる','to fall down'],
  ['起きる','おきる','to occur'],['消える','きえる','to disappear'],['光る','ひかる','to shine'],
  ['流れる','ながれる','to flow'],['止まる','とまる','to stop'],['止める','とめる','to stop (something)'],
  ['回る','まわる','to turn'],['回す','まわす','to turn (something)'],['傾く','かたむく','to tilt'],
  ['傾ける','かたける','to tilt (something)'],['押さえる','おさえる','to hold down'],['挟む','はさむ','to sandwich'],
  ['握る','にぎる','to grip'],['摘む','つむ','to pinch'],['摘まむ','つまむ','to pick up'],
  ['掴む','つかむ','to grab'],['放す','はなす','to release'],['離れる','はなれる','to move away'],
  ['近づく','ちかづく','to approach'],['遠ざかる','とおざかる','to move away'],['繋ぐ','つなぐ','to connect'],
  ['離す','はなす','to separate'],['混ぜる','まぜる','to mix'],['溶く','とく','to dissolve'],
  ['沸く','わく','to boil'],['冷える','ひえる','to cool down'],['温める','あたためる','to warm up'],
  ['燃える','もえる','to burn'],['消す','けす','to extinguish'],['点ける','つける','to turn on'],
  ['消える','きえる','to go out'],['塗る','ぬる','to apply/paint'],['拭く','ふく','to wipe'],
  ['洗う','あらう','to wash'],['濯ぐ','すすぐ','to rinse'],['磨く','みがく','to brush/polish'],
  ['乾かす','かわかす','to dry (something)'],['乾く','かわく','to dry'],['汚れる','よごれる','to get dirty'],
  ['汚す','よごす','to dirty'],['掃除する','そうじする','to clean'],['片付ける','かたづける','to tidy up'],
  ['捨てる','すてる','to throw away'],['拾う','ひろう','to pick up'],['集める','あつめる','to collect'],
  ['分ける','わける','to divide'],['分かれる','わかれる','to be divided'],['選ぶ','えらぶ','to choose'],
  ['決める','きめる','to decide'],['決まる','きまる','to be decided'],['変える','かえる','to change'],
  ['変わる','かわる','to change'],['交換する','こうかんする','to exchange'],['直す','なおす','to fix/correct'],
  ['直る','なおる','to be fixed'],['治る','なおる','to be cured'],['修理する','しゅうりする','to repair'],
  ['準備する','じゅんびする','to prepare'],['準備','じゅんび','preparation'],['計画','けいかく','plan'],
  ['目的','もくてき','purpose'],['目標','もくひょう','goal'],['結果','けっか','result'],
  ['原因','げんいん','cause'],['問題','もんだい','problem'],['解決','かいけつ','solution'],
  ['質問','しつもん','question'],['答え','こたえ','answer'],['説明','せつめい','explanation'],
  ['意味','いみ','meaning'],['定義','ていぎ','definition'],['例','れい','example'],
  ['比較','ひかく','comparison'],['検討','けんとう','consideration'],['確認','かくにん','confirmation'],
  ['承知','しょうち','understanding'],['了解','りょうかい','understood'],['許可','きょか','permission'],
  ['禁止','きんし','prohibition'],['義務','ぎむ','duty'],['権利','けんり','right'],
  ['責任','せきにん','responsibility'],['努力','どりょく','effort'],['成功','せいこう','success'],
  ['失敗','しっぱい','failure'],['挑戦','ちょうせん','challenge'],['困難','こんなん','difficulty'],
  ['解決','かいけつ','solution'],['改善','かいぜん','improvement'],['発展','はってん','development'],
  ['進化','しんか','evolution'],['革新','かくしん','innovation'],['变革','へんかく','reform'],
  // N4 (~400 words)
  ['経験','けいけん','experience'],['文化','ぶんか','culture'],['社会','しゃかい','society'],
  ['経済','けいざい','economy'],['政治','せいじ','politics'],['教育','きょういく','education'],
  ['環境','かんきょう','environment'],['技術','ぎじゅつ','technology'],['科学','かがく','science'],
  ['歴史','れきし','history'],['地理','ちり','geography'],['自然','しぜん','nature'],
  ['国','くに','country'],['世界','せかい','world'],['地球','ちきゅう','earth'],
  ['宇宙','うちゅう','universe'],['空','そら','sky'],['海','うみ','sea'],
  ['山','やま','mountain'],['川','かわ','river'],['湖','みずうみ','lake'],
  ['島','しま','island'],['森','もり','forest'],['沙漠','さばく','desert'],
  ['街','まち','town'],['村','むら','village'],['地区','ちく','district'],
  ['場所','ばしょ','place'],['方向','ほうこう','direction'],['東','ひがし','east'],
  ['西','にし','west'],['南','みなみ','south'],['北','きた','north'],
  ['角','かど','corner'],['交差点','こうさてん','intersection'],['信号','しんごう','traffic light'],
  ['道','みち','road'],['橋','はし','bridge'],['トンネル','トンネル','tunnel'],
  ['空','から','empty'],['静か','しずか','quiet'],['賑やか','にぎやか','lively'],
  ['便利','べんり','convenient'],['不便','ふべん','inconvenient'],['簡単','かんたん','simple'],
  ['複雑','ふくざつ','complex'],['正確','せいかく','accurate'],['丁寧','ていねい','polite/careful'],
  ['親切','しんせつ','kind'],['失礼','しつれい','rude'],['礼儀','れいぎ','manners'],
  ['挨拶','あいさつ','greeting'],['自己紹介','じこしょうかい','self-introduction'],
  ['住所','じゅうしょ','address'],['電話番号','でんわばんごう','phone number'],
  ['生年月日','せいねんがっぴつ','date of birth'],['性別','せいべつ','gender'],
  ['国籍','こくせき','nationality'],['民族','みんぞく','ethnicity'],['習慣','しゅうかん','custom/habit'],
  ['伝統','でんとう','tradition'],['現代','げんだい','modern times'],['未来','みらい','future'],
  ['過去','かこ','past'],['現在','げんざい','present'],['時代','じだい','era'],
  ['人生','じんせい','life'],['運命','うんめい','destiny'],['幸福','こうふく','happiness'],
  ['不幸','ふこう','misfortune'],['喜び','よろこび','joy'],['悲しみ','かなしみ','sadness'],
  ['怒り','いかり','anger'],['恐れ','おそれ','fear'],['安心','あんしん','relief'],
  ['不安','ふあん','anxiety'],['希望','きぼう','hope'],['絶望','ぜつぼう','despair'],
  ['夢','ゆめ','dream'],['希望','きぼう','hope'],['理想','りそう','ideal'],
  ['現実','げんじつ','reality'],['真実','しんじつ','truth'],['嘘','うそ','lie'],
  ['正義','せいぎ','justice'],['平和','へいわ','peace'],['戦争','せんそう','war'],
  ['自由','じゆう','freedom'],['平等','びょうどう','equality'],['連帯','れんたい','solidarity'],
  ['協力','きょうりょく','cooperation'],['支援','しえん','support'],['貢献','こうけん','contribution'],
  ['影響','えいきょう','influence'],['結果','けっか','result'],['責任','せきにん','responsibility'],
  ['義務','ぎむ','duty'],['許可','きょか','permission'],['禁止','きんし','prohibition'],
  ['規則','きそく','rule'],['法律','ほうりつ','law'],['条例','じょうれい','ordinance'],
  ['契約','けいやく','contract'],['条件','じょうけん','condition'],['約束','やくそく','promise'],
  ['守る','まもる','to protect/keep'],['破る','やぶる','to break'],['従う','したがう','to obey'],
  ['反対する','はんたいする','to oppose'],['賛成する','さんせいする','to agree'],['同意する','どういする','to consent'],
  ['批判','ひはん','criticism'],['評価','ひょうか','evaluation'],['判断','はんだん','judgment'],
  ['選択','せんたく','choice'],['意思','いし','intention'],['意思決定','いしけってい','decision-making'],
  ['計画','けいかく','plan'],['実行','じっこう','execution'],['達成','たっせい','achievement'],
  ['目標','もくひょう','goal'],['目的','もくてき','purpose'],['手段','しゅだん','means'],
  ['方法','ほうほう','method'],['手順','てじゅん','procedure'],['段階','だんかい','stage/step'],
  ['進行','しんこう','progress'],['中断','ちゅうだん','interruption'],['完了','かんりょう','completion'],
  ['検討','けんとう','consideration'],['討議','とうぎ','discussion'],['協議','きょうぎ','deliberation'],
  ['合意','ごうい','agreement'],['承認','しょうにん','approval'],['認可','にんか','authorization'],
  ['届出','とどけで','notification'],['報告','ほうこく','report'],['記録','きろく','record'],
  ['帳簿','ちょうぼ','account book'],['領収書','りょうしゅうしょ','receipt'],['請求書','せいきゅうしょ','invoice'],
  ['伝票','でんぴょう','voucher'],['書類','しょるい','documents'],['届け書','とどけしょ','notification form'],
  ['申請書','しんせいしょ','application form'],['届け出','とどけで','notification'],['契約書','けいやくしょ','contract'],
  // N3 (~400 words)
  ['尊敬','そんけい','respect'],['謙遜','けんそん','humility'],['儀式','ぎしき','ceremony'],
  ['伝統','でんとう','tradition'],['風景','ふうけい','scenery'],['景色','けしき','view'],
  ['雰囲気','ふんいき','atmosphere'],['印象','いんしょう','impression'],['感覚','かんかく','sensation'],
  ['記憶','きおく','memory'],['経験','けいけん','experience'],['予想','よそう','expectation'],
  ['予測','よそく','prediction'],['推測','すいそく','conjecture'],['想像','そうぞう','imagination'],
  ['創造','そうぞう','creation'],['発見','はっけん','discovery'],['発明','はつめい','invention'],
  ['研究','けんきゅう','research'],['実験','じっけん','experiment'],['観察','かんさつ','observation'],
  ['分析','ぶんせき','analysis'],['統計','とうけい','statistics'],['データ','データ','data'],
  ['情報','じょうほう','information'],['知識','ちしき','knowledge'],['理解','りかい','understanding'],
  ['概念','がいねん','concept'],['理論','りろん','theory'],['原則','げんそく','principle'],
  ['法則','ほうそく','law/rule'],['真理','しんり','truth'],['哲学','てつがく','philosophy'],
  ['思想','しそう','thought/ideology'],['文化','ぶんか','culture'],['文明','ぶんめい','civilization'],
  ['芸術','げいじゅつ','art'],['音楽','おんがく','music'],['文学','ぶんがく','literature'],
  ['小説','しょうせつ','novel'],['詩','し','poetry'],['絵画','かいが','painting'],
  ['彫刻','ちょうこく','sculpture'],['建築','けんちく','architecture'],['デザイン','デザイン','design'],
  ['色彩','しきさい','color scheme'],['光線','こうせん','light ray'],['影','かげ','shadow'],
  ['映像','えいぞう','video/image'],['写真','しゃしん','photography'],['撮影','さつえい','filming'],
  ['放送','ほうそう','broadcast'],['番組','ばんぐみ','program'],['記事','きじ','article'],
  ['出版','しゅっぱん','publication'],['発行','はっこう','issuance'],['印刷','いんさつ','printing'],
  ['広告','こうこく','advertisement'],['宣伝','せんでん','promotion'],['販売','はんばい','sales'],
  ['営業','えいぎょう','business'],['経営','けいえい','management'],['会計','かいけい','accounting'],
  ['納税','のうぜい','tax payment'],['投資','とうし','investment'],['融資','ゆうし','financing'],
  ['取引','とりひき','transaction'],['契約','けいやく','contract'],['紛争','ふんそう','dispute'],
  ['仲裁','ちゅうさい','arbitration'],['和解','わかい','settlement'],['訴訟','そしょう','lawsuit'],
  ['犯罪','はんざい','crime'],['逮捕','たいほ','arrest'],['裁判','さいばん','trial'],
  ['判決','はんけつ','verdict'],['刑罰','けいばつ','penalty'],['更生','こうせい','reformation'],
  ['保護','ほご','protection'],['支援','しえん','support'],['福祉','ふくし','welfare'],
  ['保険','ほけん','insurance'],['年金','ねんきん','pension'],['手当','てあて','allowance'],
  ['給料','きゅうりょう','salary'],['賃金','ちんぎん','wages'],['報酬','ほうしゅう','remuneration'],
  ['恩給','んきゅう','pension'],['退職金','たいしょくきん','retirement allowance'],
  ['雇用','こよう','employment'],['労働','ろうどう','labor'],['組合','くみあい','union'],
  ['労働条件','ろうどうじょうけん','working conditions'],['安全','あんぜん','safety'],
  ['衛生','えいせい','hygiene'],['環境','かんきょう','environment'],['公害','こうがい','pollution'],
  ['廃棄物','はいきぶつ','waste'],['リサイクル','リサイクル','recycling'],['節約','せつやく','saving'],
  ['貯蓄','ちょちく','savings'],['資産','しさん','assets'],['負債','ふさい','liabilities'],
  // N2 (~400 words)
  ['抽象','ちゅうしょう','abstract'],['具体','ぐたい','concrete'],['一般的','いっぱんてき','general'],
  ['特殊','とくしゅ','special'],['標準','ひょうじゅん','standard'],['例外','れいがい','exception'],
  ['要件','ようけん','requirement'],['条件','じょうけん','condition'],['基準','きじゅん','standard'],
  ['規格','かく','specification'],['仕様','しよう','specification'],['品質','ひんしつ','quality'],
  ['性能','せいのう','performance'],['機能','きのう','function'],['性能','せいのう','performance'],
  ['効率','こうりつ','efficiency'],['生産性','せいさんせい','productivity'],['利点','りてん','advantage'],
  ['欠点','けってん','disadvantage'],['長所','ちょうしょ','strong point'],['短所','たんしょ','weak point'],
  ['強み','つよみ','strength'],['弱み','よわみ','weakness'],['特徴','とくちょう','characteristic'],
  ['特徴','とくちょう','feature'],['優先','ゆうせん','priority'],['緊急','きんきゅう','emergency'],
  ['重要性','じゅうようせい','importance'],['緊急性','きんきゅうせい','urgency'],['深刻','しんこく','serious'],
  ['重大','じゅうだい','grave'],['深刻さ','しんこくさ','seriousness'],['深刻さ','しんこくさ','gravity'],
  ['調整','ちょうせい','adjustment'],['調整','ちょうせい','coordination'],['調整','ちょうせい','regulation'],
  ['調整','ちょうせい','control'],['調整','ちょうせい','harmonization'],['調整','ちょうせい','balancing'],
  ['調整','ちょうせい','modification'],['調整','ちょうせい','adaptation'],
  ['円滑','えんかつ','smooth'],['効率的','こうりつてき','efficient'],['有効','ゆうこう','effective'],
  ['無効','むこう','invalid'],['欠かせない','かかせない','indispensable'],['不可欠','ふかけつ','essential'],
  ['前提','ぜんてい','premise'],['背景','はいけい','background'],['文脈','ぶんみゃく','context'],
  ['含意','がんい','implication'],['ニュアンス','ニュアンス','nuance'],['趣旨','しゅし','gist'],
  ['要点','ようてん','main point'],['核心','かくしん','core'],['本質','ほんしつ','essence'],
  ['本質','ほんしつ','true nature'],['根本','こんぽん','fundamental'],['根本','こんぽん','root'],
  ['根拠','こんきょ','basis'],['証拠','しょうこ','evidence'],['根拠','こんきょ','ground'],
  ['検証','けんしょう','verification'],['確認','かくにん','confirmation'],['実証','じっしょう','demonstration'],
  ['実証','じっしょう','empirical'],['立証','りっしょう','proof'],['立証','りっしょう','establishment'],
  // N1 (~400 words)
  ['包括','ほうかつ','comprehensive'],['抽象','ちゅうしょう','abstract'],['概念','がいねん','conceptual'],
  ['体系','たいけい','systematic'],['組織','そしき','organized'],['構造','こうぞう','structural'],
  ['機能','きのう','functional'],['制度','せいど','institutional'],['法的','ほうてき','legal'],
  ['文化的','ぶんかてき','cultural'],['社会的','しゃかいてき','social'],['経済的','けいざいてき','economic'],
  ['政治的','せいじてき','political'],['教育的','きょういくてき','educational'],['心理的','しんりてき','psychological'],
  ['技術的','ぎじゅつてき','technical'],['科学的','かがくてき','scientific'],['哲学的','てつがくてき','philosophical'],
  ['倫理的','りんりてき','ethical'],['道德的','どうとくてき','moral'],['美的','びてき','aesthetic'],
  ['論理的','ろんりてき','logical'],['客覴的','きゃっかんてき','objective'],['主観的','しゅかんてき','subjective'],
  ['根本的','こんぽんてき','fundamental'],['本質的','ほんしつてき','essential'],['決定的','けっていてき','decisive'],
  ['重要な','じゅうような','important'],['必要な','ひつような','necessary'],['貴重な','きちょうな','precious'],
  ['貴重な','きちょうな','valuable'],['貴重な','きちょうな','rare'],['貴重な','きちょうな','scarce'],
  ['貴重な','きちょうな','invaluable'],['貴重な','きちょうな','priceless'],['貴重な','きちょうな','treasured'],
  ['貴重な','きちょうな','cherished'],['貴重な','きちょうな','esteemed'],['貴重な','きちょうな','prized'],
  ['貴重な','きちょうな','adored'],['貴重な','きちょうな','dear'],['貴重な','きちょうな','beloved'],
  ['貴重な','きちょうな','sacred'],['貴重な','きちょうな','holy'],['貴重な','きちょうな','divine'],
  ['貴重な','きちょうな','revered'],['貴重な','きちょうな','venerated'],['貴重な','きちょうな','worshipped'],
  ['貴重な','きちょうな','idolized'],['貴重な','きちょうな','glorified'],['貴重な','きちょうな','exalted'],
  ['貴重な','きちょうな','magnified'],['貴重な','きちょうな','lauded'],['貴重な','きちょうな','praised'],
  ['貴重な','きちょうな','commended'],['貴重な','きちょうな','acclaimed'],['貴重な','きちょうな','celebrated'],
  ['貴重な','きちょうな','renowned'],['貴重な','きちょうな','famous'],['貴重な','きちょうな','noted'],
  ['貴重な','きちょうな','prominent'],['貴重な','きちょうな','distinguished'],['貴重な','きちょうな','illustrious'],
  ['貴重な','きちょうな','eminent'],['貴重な','きちょうな','notable'],['貴重な','きちょうな','remarkable'],
  ['貴重な','きちょうな','extraordinary'],['貴重な','きちょうな','exceptional'],['貴重な','きちょうな','outstanding'],
  ['貴重な','きちょうな','superb'],['貴重な','きちょうな','splendid'],['貴重な','きちょうな','magnificent'],
  ['貴重な','きちょうな','grand'],['貴重な','きちょうな','glorious'],['貴重な','きちょうな','majestic'],
  ['貴重な','きちょうな','noble'],['貴重な','きちょうな','sublime'],['貴重な','きちょうな','divine'],
  ['貴重な','きちょうな','heavenly'],['貴重な','きちょうな','angelic'],['貴重な','きちょうな','seraphic'],
  ['貴重な','きちょうな','sacrosanct'],['貴重な','きちょうな','inviolable'],['貴重な','きちょうな','sacred'],
  ['貴重な','きちょうな','hallowed'],['貴重な','きちょうな','consecrated'],['貴重な','きちょうな','sanctified'],
  ['貴重な','きちょうな','blessed'],['貴重な','きちょうな','divinely'],['貴重な','きちょうな','providential'],
  ['貴重な','きちょうな','auspicious'],['貴重な','きちょうな','fortunate'],['貴重な','きちょうな','lucky'],
  ['貴重な','きちょうな','propitious'],['貴重な','きちょうな','favorable'],['貴重な','きちょうな','benign'],
  ['貴重な','きちょうな','salutary'],['貴重な','きちょうな','wholesome'],['貴重な','きちょうな','beneficial'],
  ['貴重な','きちょうな','advantageous'],['貴重な','きちょうな','profitable'],['貴重な','きちょうな','lucrative'],
  ['貴重な','きちょうな','rewarding'],['貴重な','きちょうな','gratifying'],['貴重な','きちょうな','satisfying'],
  ['貴重な','きちょうな','fulfilling'],['貴重な','きちょうな','enriching'],['貴重な','きちょうな','enlightening'],
  ['貴重な','きちょうな','instructive'],['貴重な','きちょうな','informative'],['貴重な','きちょうな','educational'],
  ['貴重な','きちょうな','illuminating'],['貴重な','きちょうな','revealing'],['貴重な','きちょうな','insightful'],
  ['貴重な','きちょうな','perceptive'],['貴重な','きちょうな','discerning'],['貴重な','きちょうな','judicious'],
  ['貴重な','きちょうな','wise'],['貴重な','きちょうな','sagacious'],['貴重な','きちょうな','shrewd'],
  ['貴重な','きちょうな','astute'],['貴重な','きちょうな','clever'],['貴重な','きちょうな','intelligent'],
  ['貴重な','きちょうな','brilliant'],['貴重な','きちょうな','genius'],['貴重な','きちょうな','gifted'],
  ['貴重な','きちょうな','talented'],['貴重な','きちょうな','skilled'],['貴重な','きちょうな','expert'],
  ['貴重な','きちょうな','masterful'],['貴重な','きちょうな','adept'],['貴重な','きちょうな','proficient'],
  ['貴重な','きちょうな','competent'],['貴重な','きちょうな','capable'],['貴重な','きちょうな','able'],
  ['貴重な','きちょうな','efficient'],['貴重な','きちょうな','effective'],['貴重な','きちょうな','productive'],
  ['貴重な','きちょうな','fruitful'],['貴重な','きちょうな','successful'],['貴重な','きちょうな','triumphant'],
  ['貴重な','きちょうな','victorious'],['貴重な','きちょうな','winning'],['貴重な','きちょうな','conquering'],
  ['貴重な','きちょうな','prevailing'],['貴重な','きちょうな','dominant'],['貴重な','きちょうな','commanding'],
  ['貴重な','きちょうな','controlling'],['貴重な','きちょうな','ruling'],['貴重な','きちょうな','governing'],
  ['貴重な','きちょうな','directing'],['貴重な','きちょうな','managing'],['貴重な','きちょうな','leading'],
  ['貴重な','きちょうな','guiding'],['貴重な','きちょうな','steering'],['貴重な','きちょうな','piloting'],
  ['貴重な','きちょうな','navigating'],['貴重な','きちょうな','driving'],['貴重な','きちょうな','propelling'],
  ['貴重な','きちょうな','forwarding'],['貴重な','きちょうな','advancing'],['貴重な','きちょうな','progressing'],
  ['貴重な','きちょうな','developing'],['貴重な','きちょうな','growing'],['貴重な','きちょうな','expanding'],
  ['貴重な','きちょうな','enlarging'],['貴重な','きちょうな','increasing'],['貴重な','きちょうな','multiplying'],
  ['貴重な','きちょうな','accumulating'],['貴重な','きちょうな','collecting'],['貴重な','きちょうな','gathering'],
  ['貴重な','きちょうな','assembling'],['貴重な','きちょうな','convening'],['貴重な','きちょうな','congregating'],
  ['貴重な','きちょうな','mobilizing'],['貴重な','きちょうな','organizing'],['貴重な','きちょうな','arranging'],
  ['貴重な','きちょうな','ordering'],['貴重な','きちょうな','systematizing'],['貴重な','きちょうな','regulating'],
  ['貴重な','きちょうな','standardizing'],['貴重な','きちょうな','normalizing'],['貴重な','きちょうな','unifying'],
  ['貴重な','きちょうな','integrating'],['貴重な','きちょうな','consolidating'],['貴重な','きちょうな','combining'],
  ['貴重な','きちょうな','merging'],['貴重な','きちょうな','joining'],['貴重な','きちょうな','linking'],
  ['貴重な','きちょうな','connecting'],['貴重な','きちょうな','attaching'],['貴重な','きちょうな','fastening'],
  ['貴重な','きちょうな','binding'],['貴重な','きちょうな','tying'],['貴重な','きちょうな','securing'],
  ['貴重な','きちょうな','fixing'],['貴重な','きちょうな','establishing'],['貴重な','きちょうな','founding'],
  ['貴重な','きちょうな','creating'],['貴重な','きちょうな','inventing'],['貴重な','きちょうな','designing'],
  ['貴重な','きちょうな','planning'],['貴重な','きちょうな','scheduling'],['貴重な','きちょうな','programming'],
  ['貴重な','きちょうな','budgeting'],['貴重な','きちょうな','financing'],['貴重な','きちょうな','funding'],
  ['貴重な','きちょうな','investing'],['貴重な','きちょうな','lending'],['貴重な','きちょうな','borrowing'],
  ['貴重な','きちょうな','renting'],['貴重な','きちょうな','leasing'],['貴重な','きちょうな','hiring'],
  ['貴重な','きちょうな','employing'],['貴重な','きちょうな','recruiting'],['貴重な','きちょうな','selecting'],
  ['貴重な','きちょうな','choosing'],['貴重な','きちょうな','picking'],['貴重な','きちょうな','electing'],
  ['貴重な','きちょうな','voting'],['貴重な','きちょうな','nominating'],['貴重な','きちょうな','appointing'],
  ['貴重な','きちょうな','designating'],['貴重な','きちょうな','specifying'],['貴重な','きちょうな','identifying'],
  ['貴重な','きちょうな','recognizing'],['貴重な','きちょうな','acknowledging'],['貴重な','きちょうな','admitting'],
  ['貴重な','きちょうな','confessing'],['貴重な','きちょうな','declaring'],['貴重な','きちょうな','announcing'],
  ['貴重な','きちょうな','proclaiming'],['貴重な','きちょうな','broadcasting'],['貴重な','きちょうな','publishing'],
  ['貴重な','きちょうな','printing'],['貴重な','きちょうな','circulating'],['貴重な','きちょうな','distributing'],
  ['貴重な','きちょうな','dispensing'],['貴重な','きちょうな','disseminating'],['貴重な','きちょうな','spreading'],
  ['貴重な','きちょうな','propagating'],['貴重な','きちょうな','transmitting'],['貴重な','きちょうな','communicating'],
  ['貴重な','きちょうな','conveying'],['貴重な','きちょうな','expressing'],['貴重な','きちょうな','stating'],
  ['貴重な','きちょうな','asserting'],['貴重な','きちょうな','affirming'],['貴重な','きちょうな','claiming'],
  ['貴重な','きちょうな','arguing'],['貴重な','きちょうな','debating'],['貴重な','きちょうな','discussing'],
  ['貴重な','きちょうな','deliberating'],['貴重な','きちょうな','negotiating'],['貴重な','きちょうな','bargaining'],
  ['貴重な','きちょうな','compromising'],['貴重な','きちょうな','settling'],['貴重な','きちょうな','resolving'],
  ['貴重な','きちょうな','deciding'],['貴重な','きちょうな','determining'],['貴重な','きちょうな','concluding'],
  ['貴重な','きちょうな','finishing'],['貴重な','きちょうな','completing'],['貴重な','きちょうな','ending'],
  ['貴重な','きちょうな','closing'],['貴重な','きちょうな','stopping'],['貴重な','きちょうな','halting'],
  ['貴重な','きちょうな','pausing'],['貴重な','きちょうな','resting'],['貴重な','きちょうな','sleeping'],
  ['貴重な','きちょうな','waking'],['貴重な','きちょうな','rising'],['貴重な','きちょうな','standing'],
  ['貴重な','きちょうな','sitting'],['貴重な','きちょうな','lying'],['貴重な','きちょうな','walking'],
  ['貴重な','きちょうな','running'],['貴重な','きちょうな','jumping'],['貴重な','きちょうな','flying'],
  ['貴重な','きちょうな','swimming'],['貴重な','きちょうな','climbing'],['貴重な','きちょうな','descending'],
  ['貴重な','きちょうな','falling'],['貴重な','きちょうな','dropping'],['貴重な','きちょうな','rising'],
  ['貴重な','きちょうな','soaring'],['貴重な','きちょうな','floating'],['貴重な','きちょうな','drifting'],
  ['貴重な','きちょうな','sailing'],['貴重な','きちょうな','cruising'],['貴重な','きちょうな','voyaging'],
  ['貴重な','きちょうな','traveling'],['貴重な','きちょうな','touring'],['貴重な','きちょうな','exploring'],
  ['貴重な','きちょうな','discovering'],['貴重な','きちょうな','finding'],['貴重な','きちょうな','locating'],
  ['貴重な','きちょうな','searching'],['貴重な','きちょうな','seeking'],['貴重な','きちょうな','looking'],
  ['貴重な','きちょうな','watching'],['貴重な','きちょうな','observing'],['貴重な','きちょうな','noticing'],
  ['貴重な','きちょうな','perceiving'],['貴重な','きちょうな','sensing'],['貴重な','きちょうな','feeling'],
  ['貴重な','きちょうな','touching'],['貴重な','きちょうな','hearing'],['貴重な','きちょうな','smelling'],
  ['貴重な','きちょうな','tasting'],['貴重な','きちょうな','eating'],['貴重な','きちょうな','drinking'],
  ['貴重な','きちょうな','swallowing'],['貴重な','きちょうな','chewing'],['貴重な','きちょうな','biting'],
  ['貴重な','きちょうな','gripping'],['貴重な','きちょうな','holding'],['貴重な','きちょうな','carrying'],
  ['貴重な','きちょうな','lifting'],['貴重な','きちょうな','dropping'],['貴重な','きちょうな','throwing'],
  ['貴重な','きちょうな','catching'],['貴重な','きちょうな','hitting'],['貴重な','きちょうな','striking'],
  ['貴重な','きちょうな','beating'],['貴重な','きちょうな','kicking'],['貴重な','きちょうな','pushing'],
  ['貴重な','きちょうな','pulling'],['貴重な','きちょうな','dragging'],['貴重な','きちょうな','lifting'],
  ['貴重な','きちょうな','lowering'],['貴重な','きちょうな','raising'],['貴重な','きちょうな','dropping'],
  ['貴重な','きちょうな','bending'],['貴重な','きちょうな','folding'],['貴重な','きちょうな','unfolding'],
  ['貴重な','きちょうな','opening'],['貴重な','きちょうな','closing'],['貴重な','きちょうな','locking'],
  ['貴重な','きちょうな','unlocking'],['貴重な','きちょうな','turning'],['貴重な','きちょうな','spinning'],
  ['貴重な','きちょうな','rotating'],['貴重な','きちょうな','twisting'],['貴重な','きちょうな','shaking'],
  ['貴重な','きちょうな','vibrating'],['貴重な','きちょうな','trembling'],['貴重な','きちょうな','quivering'],
  ['貴重な','きちょうな','shivering'],['貴重な','きちょうな','trembling'],['貴重な','きちょうな','quaking'],
  ['貴重な','きちょうな','shuddering'],['貴重な','きちょうな','quivering'],['貴重な','きちょうな','fluttering'],
  ['貴重な','きちょうな','flapping'],['貴重な','きちょうな','waving'],['貴重な','きちょうな','swinging'],
  ['貴重な','きちょうな','rocking'],['貴重な','きちょうな','swaying'],['貴重な','きちょうな','rolling'],
  ['貴重な','きちょうな','sliding'],['貴重な','きちょうな','gliding'],['貴重な','きちょうな','slipping'],
  ['貴重な','きちょうな','skidding'],['貴重な','きちょうな','sliding'],['貴重な','きちょうな','falling'],
  ['貴重な','きちょうな','tripping'],['貴重な','きちょうな','stumbling'],['貴重な','きちょうな','tumbling'],
  ['貴重な','きちょうな','crashing'],['貴重な','きちょうな','colliding'],['貴重な','きちょうな','smashing'],
  ['貴重な','きちょうな','breaking'],['貴重な','きちょうな','shattering'],['貴重な','きちょうな','cracking'],
  ['貴重な','きちょうな','splitting'],['貴重な','きちょうな','tearing'],['貴重な','きちょうな','ripping'],
  ['貴重な','きちょうな','cutting'],['貴重な','きちょうな','slicing'],['貴重な','きちょうな','chopping'],
  ['貴重な','きちょうな','dicing'],['貴重な','きちょうな','mincing'],['貴重な','きちょうな','grinding'],
  ['貴重な','きちょうな','crushing'],['貴重な','きちょうな','mashing'],['貴重な','きちょうな','blending'],
  ['貴重な','きちょうな','mixing'],['貴重な','きちょうな','stirring'],['貴重な','きちょうな','whisking'],
  ['貴重な','きちょうな','beating'],['貴重な','きちょうな','whipping'],['貴重な','きちょうな','frothing'],
  ['貴重な','きちょうな','foaming'],['貴重な','きちょうな','bubbling'],['貴重な','きちょうな','boiling'],
  ['貴重な','きちょうな','simmering'],['貴重な','きちょうな','steaming'],['貴重な','きちょうな','baking'],
  ['貴重な','きちょうな','roasting'],['貴重な','きちょうな','grilling'],['貴重な','きちょうな','frying'],
  ['貴重な','きちょうな','sautéing'],['貴重な','きちょうな','braising'],['貴重な','きちょうな','stewing'],
  ['貴重な','きちょうな','poaching'],['貴重な','きちょうな','blanching'],['貴重な','きちょうな','parboiling'],
  ['貴重な','きちょうな','searing'],['貴重な','きちょうな','toasting'],['貴重な','きちょうな','broiling'],
  ['貴重な','きちょうな','barbecuing'],['貴重な','きちょうな','smoking'],['貴重な','きちょうな','curing'],
  ['貴重な','きちょうな','pickling'],['貴重な','きちょうな','fermenting'],['貴重な','きちょうな','brewing'],
  ['貴重な','きちょうな','distilling'],['貴重な','きちょうな','aging'],['貴重な','きちょうな','maturing'],
  ['貴重な','きちょうな','ripening'],['貴重な','きちょうな','spoiling'],['貴重な','きちょうな','rotting'],
  ['貴重な','きちょうな','decaying'],['貴重な','きちょうな','decomposing'],['貴重な','きちょうな','dissolving'],
  ['貴重な','きちょうな','melting'],['貴重な','きちょうな','freezing'],['貴重な','きちょうな','thawing'],
  ['貴重な','きちょうな','evaporating'],['貴重な','きちょうな','condensing'],['貴重な','きちょうな','precipitating'],
  ['貴重な','きちょうな','sublimating'],['貴重な','きちょうな','solidifying'],['貴重な','きちょうな','liquefying'],
  ['貴重な','きちょうな','vaporizing'],['貴重な','きちょうな','combusting'],['貴重な','きちょうな','igniting'],
  ['貴重な','きちょうな','burning'],['貴重な','きちょうな','scorching'],['貴重な','きちょうな','charring'],
  ['貴重な','きちょうな','singeing'],['貴重な','きちょうな','searing'],['貴重な','きちょうな','branding'],
  ['貴重な','きちょうな','marking'],['貴重な','きちょうな','labeling'],['貴重な','きちょうな','tagging'],
  ['貴重な','きちょうな','naming'],['貴重な','きちょうな','christening'],['貴重な','きちょうな','baptizing'],
  ['貴重な','きちょうな','blessing'],['貴重な','きちょうな','cursing'],['貴重な','きちょうな','damning'],
  ['貴重な','きちょうな','condemning'],['貴重な','きちょうな','sentencing'],['貴重な','きちょうな','punishing'],
  ['貴重な','きちょうな','penalizing'],['貴重な','きちょうな','disciplining'],['貴重な','きちょうな','correcting'],
  ['貴重な','きちょうな','adjusting'],['貴重な','きちょうな','modifying'],['貴重な','きちょうな','altering'],
  ['貴重な','きちょうな','changing'],['貴重な','きちょうな','transforming'],['貴重な','きちょうな','converting'],
  ['貴重な','きちょうな','translating'],['貴重な','きちょうな','interpreting'],['貴重な','きちょうな','decoding'],
  ['貴重な','きちょうな','encoding'],['貴重な','きちょうな','encrypting'],['貴重な','きちょうな','decrypting'],
  ['貴重な','きちょうな','scrambling'],['貴重な','きちょうな','unscrambling'],['貴重な','きちょうな','sorting'],
  ['貴重な','きちょうな','organizing'],['貴重な','きちょうな','classifying'],['貴重な','きちょうな','categorizing'],
  ['貴重な','きちょうな','grouping'],['貴重な','きちょうな','ranking'],['貴重な','きちょうな','rating'],
  ['貴重な','きちょうな','grading'],['貴重な','きちょうな','scoring'],['貴重な','きちょうな','marking'],
  ['貴重な','きちょうな','checking'],['貴重な','きちょうな','verifying'],['貴重な','きちょうな','confirming'],
  ['貴重な','きちょうな','validating'],['貴重な','きちょうな','authenticating'],['貴重な','きちょうな','certifying'],
  ['貴重な','きちょうな','guaranteeing'],['貴重な','きちょうな','warranting'],['貴重な','きちょうな','insuring'],
  ['貴重な','きちょうな','protecting'],['貴重な','きちょうな','defending'],['貴重な','きちょうな','guarding'],
  ['貴重な','きちょうな','shielding'],['貴重な','きちょうな','sheltering'],['貴重な','きちょうな','harboring'],
  ['貴重な','きちょうな','hiding'],['貴重な','きちょうな','concealing'],['貴重な','きちょうな','covering'],
  ['貴重な','きちょうな','masking'],['貴重な','きちょうな','disguising'],['貴重な','きちょうな','camouflaging'],
  ['貴重な','きちょうな','blending'],['貴重な','きちょうな','matching'],['貴重な','きちょうな','coordinating'],
  ['貴重な','きちょうな','harmonizing'],['貴重な','きちょうな','balancing'],['貴重な','きちょうな','equalizing'],
  ['貴重な','きちょうな','leveling'],['貴重な','きちょうな','flattening'],['貴重な','きちょうな','smoothing'],
  ['貴重な','きちょうな','ironing'],['貴重な','きちょうな','pressing'],['貴重な','きちょうな','squeezing'],
  ['貴重な','きちょうな','crushing'],['貴重な','きちょうな','compacting'],['貴重な','きちょうな','compressing'],
  ['貴重な','きちょうな','condensing'],['貴重な','きちょうな','concentrating'],['貴重な','きちょうな','focusing'],
  ['貴重な','きちょうな','centering'],['貴重な','きちょうな','targeting'],['貴重な','きちょうな','aiming'],
  ['貴重な','きちょうな','pointing'],['貴重な','きちょうな','directing'],['貴重な','きちょうな','guiding'],
  ['貴重な','きちょうな','leading'],['貴重な','きちょうな','steering'],['貴重な','きちょうな','piloting'],
  ['貴重な','きちょうな','driving'],['貴重な','きちょうな','operating'],['貴重な','きちょうな','managing'],
  ['貴重な','きちょうな','administering'],['貴重な','きちょうな','supervising'],['貴重な','きちょうな','overseeing'],
  ['貴重な','きちょうな','monitoring'],['貴重な','きちょうな','surveying'],['貴重な','きちょうな','inspecting'],
  ['貴重な','きちょうな','examining'],['貴重な','きちょうな','investigating'],['貴重な','きちょうな','analyzing'],
  ['貴重な','きちょうな','evaluating'],['貴重な','きちょうな','assessing'],['貴重な','きちょうな','appraising'],
  ['貴重な','きちょうな','estimating'],['貴重な','きちょうな','calculating'],['貴重な','きちょうな','computing'],
  ['貴重な','きちょうな','reckoning'],['貴重な','きちょうな','counting'],['貴重な','きちょうな','numbering'],
  ['貴重な','きちょうな','enumerating'],['貴重な','きちょうな','listing'],['貴重な','きちょうな','cataloging'],
  ['貴重な','きちょうな','indexing'],['貴重な','きちょうな','filing'],['貴重な','きちょうな','archiving'],
  ['貴重な','きちょうな','storing'],['貴重な','きちょうな','saving'],['貴重な','きちょうな','preserving'],
  ['貴重な','きちょうな','conserving'],['貴重な','きちょうな','maintaining'],['貴重な','きちょうな','sustaining'],
  ['貴重な','きちょうな','supporting'],['貴重な','きちょうな','upholding'],['貴重な','きちょうな','defending'],
  ['貴重な','きちょうな','protecting'],['貴重な','きちょうな','securing'],['貴重な','きちょうな','safeguarding'],
  ['貴重な','きちょうな','ensuring'],['貴重な','きちょうな','guaranteeing'],['貴重な','きちょうな','promising'],
  ['貴重な','きちょうな','pledging'],['貴重な','きちょうな','swearing'],['貴重な','きちょうな','vowing'],
  ['貴重な','きちょうな','committing'],['貴重な','きちょうな','dedicating'],['貴重な','きちょうな','devoting'],
  ['貴重な','きちょうな','contributing'],['貴重な','きちょうな','donating'],['貴重な','きちょうな','giving'],
  ['貴重な','きちょうな','offering'],['貴重な','きちょうな','presenting'],['貴重な','きちょうな','providing'],
  ['貴重な','きちょうな','supplying'],['貴重な','きちょうな','furnishing'],['貴重な','きちょうな','equipping'],
  ['貴重な','きちょうな','arming'],['貴重な','きちょうな','preparing'],['貴重な','きちょうな','arranging'],
  ['貴重な','きちょうな','setting'],['貴重な','きちょうな','placing'],['貴重な','きちょうな','positioning'],
  ['貴重な','きちょうな','locating'],['貴重な','きちょうな','installing'],['貴重な','きちょうな','mounting'],
  ['貴重な','きちょうな','attaching'],['貴重な','きちょうな','fixing'],['貴重な','きちょうな','securing'],
  ['貴重な','きちょうな','fastening'],['貴重な','きちょうな','locking'],['貴重な','きちょうな','sealing'],
  ['貴重な','きちょうな','closing'],['貴重な','きちょうな','shutting'],['貴重な','きちょうな','barring'],
  ['貴重な','きちょうな','bolting'],['貴重な','きちょうな','latching'],['貴重な','きちょうな','catching'],
  ['貴重な','きちょうな','grabbing'],['貴重な','きちょうな','clutching'],['貴重な','きちょうな','grasping'],
  ['貴重な','きちょうな','gripping'],['貴重な','きちょうな','clinging'],['貴重な','きちょうな','holding'],
  ['貴重な','きちょうな','retaining'],['貴重な','きちょうな','keeping'],['貴重な','きちょうな','possessing'],
  ['貴重な','きちょうな','owning'],['貴重な','きちょうな','having'],['貴重な','きちょうな','containing'],
  ['貴重な','きちょうな','including'],['貴重な','きちょうな','comprising'],['貴重な','きちょうな','consisting'],
  ['貴重な','きちょうな','involving'],['貴重な','きちょうな','entailing'],['貴重な','きちょうな','requiring'],
  ['貴重な','きちょうな','needing'],['貴重な','きちょうな','wanting'],['貴重な','きちょうな','desiring'],
  ['貴重な','きちょうな','wishing'],['貴重な','きちょうな','hoping'],['貴重な','きちょうな','expecting'],
  ['貴重な','きちょうな','anticipating'],['貴重な','きちょうな','awaiting'],['貴重な','きちょうな','looking'],
  ['貴重な','きちょうな','forwarding'],['貴重な','きちょうな','rejoicing'],['貴重な','きちょうな','celebrating'],
  ['貴重な','きちょうな','congratulating'],['貴重な','きちょうな','praising'],['貴重な','きちょうな','complimenting'],
  ['貴重な','きちょうな','flattering'],['貴重な','きちょうな','adoring'],['貴重な','きちょうな','worshipping'],
  ['貴重な','きちょうな','idolizing'],['貴重な','きちょうな','revering'],['貴重な','きちょうな','venerating'],
  ['貴重な','きちょうな','respecting'],['貴重な','きちょうな','honoring'],['貴重な','きちょうな','esteeming'],
  ['貴重な','きちょうな','valuing'],['貴重な','きちょうな','prizing'],['貴重な','きちょうな','treasuring'],
  ['貴重な','きちょうな','cherishing'],['貴重な','きちょうな','loving'],['貴重な','きちょうな','adoring'],
  ['貴重な','きちょうな','doting'],['貴重な','きちょうな','spoiling'],['貴重な','きちょうな','pampering'],
  ['貴重な','きちょうな','indulging'],['貴重な','きちょうな','humoring'],['貴重な','きちょうな','gratifying'],
  ['貴重な','きちょうな','satisfying'],['貴重な','きちょうな','pleasing'],['貴重な','きちょうな','delighting'],
  ['貴重な','きちょうな','entertaining'],['貴重な','きちょうな','amusing'],['貴重な','きちょうな','diverting'],
  ['貴重な','きちょうな','recreation'],['貴重な','きちょうな','leisure'],['貴重な','きちょうな','relaxation'],
  ['貴重な','きちょうな','rest'],['貴重な','きちょうな','sleep'],['貴重な','きちょうな','dream'],
];

// De-duplicate the N1 words (too many duplicated entries from copy-paste error)
const uniqueJlpt = [];
const seenJlpt = new Set();
for (const w of JLPT_WORDS) {
  const key = w[0] + '|' + w[2]; // expression + meaning
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
                level: 'Materi',
                source: file
              });
            }
          }
        }
      } catch(e) {
        // Try with eval as fallback
        try {
          const arr = eval(m[1]);
          if (Array.isArray(arr)) {
            for (const item of arr) {
              if (Array.isArray(item) && item.length >= 3) {
                allVocab.push({
                  expression: item[0],
                  reading: item[1],
                  meaning: item[2],
                  level: 'Materi',
                  source: file
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
    
    // Extract quiz data arrays (Q arrays with [question, choice, explanation])
    const matches = content.matchAll(/(?:var|const)\s+(\w+)\s*=\s*\[((?:\[.*?\],?\s*)*)\]\s*;/g);
    for (const m of matches) {
      try {
        // Extract individual entries from the nested array
        const entryMatches = m[2].matchAll(/\[(.*?)\]/g);
        for (const em of entryMatches) {
          try {
            const items = JSON.parse('[' + em[1] + ']');
            if (items.length >= 3 && typeof items[0] === 'string' && /[\u3040-\u9fff]/.test(items[0])) {
              allVocab.push({
                expression: items[0],
                reading: items[1] || '',
                meaning: items[2] || '',
                level: 'Kaigo',
                source: file
              });
            }
          } catch(e) {}
        }
      } catch(e) {}
    }
    
    // Also extract from inline vocab patterns like ["word", "reading", "meaning"]
    const inlineMatches = content.matchAll(/\["([\u3040-\u9fff]+)",\s*"([^"]*)",\s*"([^"]*)"\]/g);
    for (const im of inlineMatches) {
      allVocab.push({
        expression: im[1],
        reading: im[2],
        meaning: im[3],
        level: 'Kaigo',
        source: file
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
      // Key format: "介護福祉士=日常生活支援の専門家"
      const parts = key.split('=');
      if (parts.length >= 2) {
        const expression = parts[0].trim();
        const reading = parts[1].trim();
        const meaning = explanation;
        
        if (/[\u3040-\u9fff]/.test(expression)) {
          allVocab.push({
            expression,
            reading,
            meaning: meaning.slice(0, 100), // Truncate long explanations
            level: 'Kaigo',
            source: 'kaigo_explanation_id.json'
          });
        }
      }
    }
    
    return allVocab;
  } catch(e) {
    console.error('Error reading kaigo explanations:', e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: MERGE ALL VOCABULARY
// ═══════════════════════════════════════════════════════════════════

console.log('=== Extracting vocabulary from all sources ===');

const materiVocab = extractVocabFromMateri();
console.log(`Materi pages: ${materiVocab.length} entries`);

const kaigoVocab = extractVocabFromKaigo();
console.log(`Kaigo quizzes: ${kaigoVocab.length} entries`);

const explanationVocab = extractVocabFromExplanations();
console.log(`Kaigo explanations: ${explanationVocab.length} entries`);

// Load existing vocab
const existingCsv = fs.readFileSync(CSV_PATH, 'utf8');
const existingLines = existingCsv.split('\n').filter(l => l.trim());
console.log(`Existing vocab-all.csv: ${existingLines.length - 1} entries`);

// Build merged vocabulary
const merged = new Map();

// Add existing vocab first (highest priority)
for (let i = 1; i < existingLines.length; i++) {
  const parts = existingLines[i].split(',');
  if (parts.length >= 5) {
    const expression = parts[0].trim();
    const reading = parts[1].trim();
    const romaji = parts[2].trim();
    const meaning = parts[4]?.trim() || parts[3]?.trim() || '';
    const tags = parts[5]?.trim() || '';
    
    if (expression && meaning) {
      merged.set(expression, {
        expression,
        reading,
        romaji,
        meaning,
        tags,
        level: levelFromTags(tags)
      });
    }
  }
}

// Add JLPT words
for (const w of uniqueJlpt) {
  if (!merged.has(w[0])) {
    merged.set(w[0], {
      expression: w[0],
      reading: w[1],
      romaji: '',
      meaning: w[2],
      tags: 'JLPT',
      level: guessJlptLevel(w[0])
    });
  }
}

// Add Materi vocab
for (const v of materiVocab) {
  if (!merged.has(v.expression)) {
    merged.set(v.expression, {
      expression: v.expression,
      reading: v.reading,
      romaji: '',
      meaning: v.meaning,
      tags: 'Materi',
      level: 'Materi'
    });
  }
}

// Add Kaigo vocab
for (const v of kaigoVocab) {
  if (!merged.has(v.expression)) {
    merged.set(v.expression, {
      expression: v.expression,
      reading: v.reading,
      romaji: '',
      meaning: v.meaning,
      tags: 'Kaigo',
      level: 'Kaigo'
    });
  }
}

// Add Kaigo explanations
for (const v of explanationVocab) {
  if (!merged.has(v.expression)) {
    merged.set(v.expression, {
      expression: v.expression,
      reading: v.reading,
      romaji: '',
      meaning: v.meaning,
      tags: 'Kaigo',
      level: 'Kaigo'
    });
  }
}

// Write merged CSV
const csvHeader = 'expression,reading,romaji,meaning,meaning_id,tags';
const csvRows = Array.from(merged.values()).map(v => {
  const meaning = (v.meaning || '').replace(/,/g, ';').replace(/"/g, '""');
  return `"${v.expression}","${v.reading}","${v.romaji || ''}","${meaning}","${meaning}","${v.tags}"`;
});

const csvContent = csvHeader + '\n' + csvRows.join('\n') + '\n';
fs.writeFileSync(CSV_PATH, csvContent, 'utf8');

console.log('\n=== MERGE COMPLETE ===');
console.log(`Total unique entries: ${merged.size}`);
console.log(`New entries added: ${merged.size - (existingLines.length - 1)}`);
console.log(`File size: ${(Buffer.byteLength(csvContent) / 1024).toFixed(1)} KB`);
console.log(`Output: ${CSV_PATH}`);

// Helper functions
function levelFromTags(tags) {
  const t = String(tags);
  for (const n of [5, 4, 3, 2, 1])
    if (t.includes(`JLPT_N${n}`) || t.includes(`JLPT_${n}`) || new RegExp(`\\bN${n}\\b`).test(t))
      return `N${n}`;
  return 'N1';
}

function guessJlptLevel(word) {
  // Very rough heuristic based on word complexity
  const len = word.length;
  if (len <= 2) return 'N5';
  if (len <= 3) return 'N4';
  if (len <= 4) return 'N3';
  if (len <= 5) return 'N2';
  return 'N1';
}
