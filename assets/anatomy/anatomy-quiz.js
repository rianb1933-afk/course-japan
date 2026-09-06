/**
 * anatomy-quiz.js — Nihongo Pro Academy
 * Logic kuis tulisan (34 soal existing, DIPERTAHANKAN UTUH dari versi sebelumnya —
 * tidak ada satu soal maupun pembahasan yang diubah/dihapus) + Mode Kuis Visual baru
 * (Tahap 5.3): sistem meminta user memilih lokasi hotspot yang benar di diagram.
 */
(function (global) {
  'use strict';

  var D = global.NPAnatomyData;
  function $(id) { return document.getElementById(id); }

  // ═══════════ KUIS TULISAN (34 soal — dipertahankan utuh, lihat CHANGELOG v155/v163-171) ═══════════
  var Q = [{"q": "「頭」の正しい読み方はどれか。", "opts": ["あたま", "くび", "かた", "むね"], "a": 0, "e": "「頭」は「あたま」と読み、頭部全体を指す。「首」(くび)は頸部、「肩」(かた)は肩、「胸」(むね)は胸部を指し、それぞれ体の異なる部位を表す基本語彙である。"}, {"q": "「膝が痛い」の「膝」の意味はどれか。", "opts": ["Lutut", "Siku", "Pergelangan kaki", "Paha"], "a": 0, "e": "「膝」(ひざ)はLutut(lutut)を意味する。高齢者に非常に多い訴えであり、歩行や立ち座りの動作に直接影響するため、介護現場で頻繁に使われる重要な語彙である。"}, {"q": "「お腹が痛いです」の適切な訳はどれか。", "opts": ["Perut saya sakit", "Kepala saya sakit", "Dada saya sakit", "Punggung saya sakit"], "a": 0, "e": "「お腹」(おなか)はPerut(perut)を意味する丁寧な言い方。「腹」(はら)よりも柔らかい響きを持ち、利用者への声かけで好んで使われる表現である。"}, {"q": "内臓の中で「心臓」と間違えやすい漢字はどれか。", "opts": ["肝臓", "腎臓", "膀胱", "肺"], "a": 0, "e": "「心臓」(しんぞう/jantung)と「肝臓」(かんぞう/hati)は漢字も読みも似ており、初学者が最も混同しやすい組み合わせ。心臓は血液を送るポンプ、肝臓は解毒・代謝を担う臓器であり、機能は全く異なる。"}, {"q": "「肺炎」の「肺」が指す臓器はどれか。", "opts": ["Paru-paru", "Jantung", "Lambung", "Usus"], "a": 0, "e": "「肺」(はい)はParu-paru(paru-paru)を意味する。肺炎(はいえん)は高齢者の死因として非常に多い疾患であり、誤嚥性肺炎の予防が介護現場で重視される理由でもある。"}, {"q": "「胃ろう」に関連する臓器はどれか。", "opts": ["胃", "腸", "肝臓", "腎臓"], "a": 0, "e": "「胃ろう」(いろう)は腹壁から「胃」(い/lambung)へ直接栄養を送るための医療的処置(PEG)。経口摂取が困難な利用者への栄養管理法として、介護福祉士国家試験にも頻出する。"}, {"q": "「腎臓」の機能と関連の深い医療処置はどれか。", "opts": ["人工透析", "胃ろう", "気管切開", "喀痰吸引"], "a": 0, "e": "「腎臓」(じんぞう/ginjal)の機能低下時に行われるのが人工透析(じんこうとうせき)、いわゆる「血液透析」。腎臓が老廃物をろ過できなくなった際、機械で血液を浄化する処置である。"}, {"q": "「頭蓋骨」の役割として正しいのはどれか。", "opts": ["脳を保護する", "血液を送る", "栄養を消化する", "呼吸を行う"], "a": 0, "e": "「頭蓋骨」(ずがいこつ/tengkorak)は脳(のう)を衝撃から保護する骨格。転倒事故で頭部を打った際に特に注意すべき部位であり、頭部外傷のリスクを理解する上で重要な語彙。"}, {"q": "「肋骨骨折」で骨折している部位はどれか。", "opts": ["Tulang rusuk", "Tulang belakang", "Tulang panggul", "Tengkorak"], "a": 0, "e": "「肋骨」(ろっこつ)はTulang rusuk(tulang rusuk)を意味する。高齢者の転倒事故で頻発する骨折の一つで、呼吸時の痛みを伴うことが多く、慎重な観察が必要となる。"}, {"q": "「大腿骨頸部骨折」が特に危険とされる理由はどれか。", "opts": ["寝たきりにつながりやすいため", "治療法がないため", "痛みがないため", "高齢者にしか起こらないため"], "a": 0, "e": "大腿骨頸部骨折は「骨盤」(こつばん)に近い太ももの付け根の骨折で、高齢者では治癒に時間がかかり、そのまま寝たきり・要介護度悪化につながりやすいため、転倒予防が極めて重要視される。"}, {"q": "「関節可動域」の略語ROMが指すものはどれか。", "opts": ["Range of Motion(関節が動く範囲)", "心拍数", "血圧の変動幅", "呼吸の深さ"], "a": 0, "e": "ROM(Range of Motion)は「関節」(かんせつ)が動かせる範囲を意味する。リハビリテーションで機能維持・改善を評価する際の基本的な指標であり、介護現場でも頻繁に使われる略語である。"}, {"q": "「筋力低下」と関連する高齢者の状態はどれか。", "opts": ["サルコペニア", "フレイル(概念としては別だが関連)", "脳梗塞", "誤嚥性肺炎"], "a": 0, "e": "「筋肉」(きんにく)の量・力が加齢で低下する状態をサルコペニアと呼ぶ。転倒リスクの増加や日常生活動作の低下に直結するため、栄養と運動による予防が重視される。"}, {"q": "「皮膚の状態を観察する」目的として最も適切なのはどれか。", "opts": ["褥瘡の早期発見", "血圧の測定", "呼吸数の確認", "嚥下機能の評価"], "a": 0, "e": "「皮膚」(ひふ)の観察は褥瘡(じょくそう/luka tekan)の早期発見に直結する重要なケア。特に骨が突出した部位(仙骨部・踵部等)は圧迫を受けやすく、日々の観察が予防の鍵となる。"}, {"q": "「膀胱留置カテーテル」が関係する臓器はどれか。", "opts": ["膀胱", "腎臓", "肝臓", "胃"], "a": 0, "e": "「膀胱」(ぼうこう/kandung kemih)は尿を一時的に溜める臓器。膀胱留置カテーテルは自力排尿が困難な利用者に対し、尿を体外へ排出するための医療器具である。"}, {"q": "「血管が細い」という表現が使われる場面はどれか。", "opts": ["点滴や採血の際", "歩行介助の際", "食事介助の際", "入浴介助の際"], "a": 0, "e": "「血管」(けっかん)は血液の通り道。高齢者は血管が細く脆くなりやすいため、点滴・採血の際に医療職が特に慎重に対応する必要がある部位として言及される。"}, {"q": "「爪を切る」ケアが分類されるのはどれか。", "opts": ["清潔ケア", "医療的ケア", "リハビリテーション", "レクリエーション"], "a": 0, "e": "「爪」(つめ)を切ることは、身だしなみと衛生を保つ清潔ケアの一環。ただし糖尿病等で足の血流が悪い利用者の場合、爪切りが傷や感染につながる危険もあるため注意が必要とされる。"}, {"q": "「肩こり」の「肩」が指す部位はどれか。", "opts": ["Bahu", "Leher", "Punggung", "Pinggang"], "a": 0, "e": "「肩」(かた)はBahu(bahu)を意味する。肩こりは長時間同じ姿勢でいる高齢者に多い訴えで、マッサージや姿勢改善の声かけが介護現場でよく行われる。"}, {"q": "「腰痛」が介護職にとって特に重要な理由はどれか。", "opts": ["介護職自身が発症しやすい労働災害だから", "利用者にしか起こらないから", "治療法がないから", "感染症だから"], "a": 0, "e": "「腰」(こし)の痛みは、移乗・体位変換など前かがみの介助動作が多い介護職自身が発症しやすい職業病としても重要視される。ボディメカニクスの活用は利用者だけでなく自分自身を守るためでもある。"}, {"q": "「手を握る」というケアが持つ意味として適切なのはどれか。", "opts": ["安心感を与える非言語的コミュニケーション", "血圧を測定する行為", "栄養状態を確認する行為", "関節可動域を評価する行為"], "a": 0, "e": "「手」(て)を握る行為は、言葉によらない安心感の伝達手段(タッチング)として重要視される。特に終末期ケアや認知症ケアにおいて、触れることが大きな心理的支えとなる。"}, {"q": "「足首が腫れる」という所見が示唆する可能性が高いのはどれか。", "opts": ["浮腫(むくみ)や循環の異常", "骨折", "筋力低下のみ", "皮膚の乾燥"], "a": 0, "e": "「足首」(あしくび)の腫れは浮腫(ふしゅ/edema)のサインであることが多く、心不全や腎機能低下など全身状態の変化を示す可能性がある。単なる疲れと決めつけず報告することが重要。"}, {"q": "「目が見えにくい」と訴える利用者への配慮として重要なのはどれか。", "opts": ["転倒リスクへの注意と環境整備", "無視してよい", "歩行を禁止する", "会話を避ける"], "a": 0, "e": "「目」(め/mata)の見えにくさは段差や障害物への気づきを遅らせ、転倒リスクを高める。白内障等が原因のことも多く、明るい照明や障害物除去などの環境整備が重要な配慮となる。"}, {"q": "「耳が聞こえにくい」利用者への声かけとして適切なのはどれか。", "opts": ["正面から口が見えるようにゆっくり話す", "後ろから大声で話す", "筆談のみに頼る", "会話を最小限にする"], "a": 0, "e": "「耳」(みみ/telinga)の聴力低下には、正面から口の動きが見えるようゆっくり話すことが適切。後ろからの大声は驚かせるだけでなく、かえって聞き取りにくくなる場合が多い。"}, {"q": "「口腔ケア」で最初に確認すべき部位はどれか。", "opts": ["口を開けられるか", "足首の腫れ", "肩甲骨の位置", "背骨の曲がり"], "a": 0, "e": "口腔ケアの前には「口」(くち/mulut)を開けられるかを確認する必要がある。開口が困難な場合は無理強いせず、スポンジブラシ等を使った優しいケア方法に切り替える判断が求められる。"}, {"q": "「歯みがき」が全身の健康に関わる理由はどれか。", "opts": ["誤嚥性肺炎の予防につながるため", "视力に関係するため", "骨密度に関係するため", "筋力に関係するため"], "a": 0, "e": "「歯」(は/gigi)の清潔保持を怠ると口腔内細菌が増え、誤嚥した際に肺炎(誤嚥性肺炎)を引き起こすリスクが高まる。歯みがきは単なる身だしなみでなく、全身の健康管理の一部である。"}, {"q": "「舌の動き」を観察する主な目的はどれか。", "opts": ["嚥下機能を評価するため", "血圧を測定するため", "筋力を評価するため", "視力を評価するため"], "a": 0, "e": "「舌」(した/lidah)の動きは、食べ物を喉の奥へ送る嚥下(えんげ)機能に直結する。動きが鈍い場合は誤嚥のリスクが高まるため、言語聴覚士等と連携した評価が重要になる。"}, {"q": "「喉に詰まる」という表現が指す危険な状態はどれか。", "opts": ["窒息のリスクがある誤嚥", "単なる喉の渇き", "声がれのみ", "口臭の問題"], "a": 0, "e": "「喉」(のど/tenggorokan)に食べ物が詰まる状態は窒息の危険を伴う誤嚥を指す。背部叩打法などの緊急対応が必要になる場合があり、食事介助中は特に注意深い観察が求められる。"}, {"q": "「鎖骨骨折」が高齢者に起こりやすい状況はどれか。", "opts": ["転倒時に手をついて支えようとしたとき", "歩行中に何もせず", "座っているだけのとき", "睡眠中"], "a": 0, "e": "「鎖骨」(さこつ)は転倒時に手をついて体を支えようとした際、その衝撃が伝わり骨折しやすい部位。肩周辺の痛みや腕の動かしにくさとして現れることが多い。"}, {"q": "「肩甲骨」が介護技術で重要視される理由はどれか。", "opts": ["体位変換や移乗の際の支点になるため", "呼吸に直接関わるため", "消化に関わるため", "視力に関わるため"], "a": 0, "e": "「肩甲骨」(けんこうこつ)は体を横に向けたり支えたりする際の重要な支点となるため、体位変換や移乗介助の技術において意識される部位。無理な力をかけると痛みや損傷の原因となる。"}, {"q": "「膵臓」の機能低下と最も関連が深い疾患はどれか。", "opts": ["糖尿病", "肺炎", "骨粗鬆症", "認知症"], "a": 0, "e": "「膵臓」(すいぞう/pankreas)はインスリンを分泌する臓器で、その機能低下は糖尿病(とうにょうびょう)に直結する。介護現場で頻出する低血糖対応も、この臓器の働きと深く関わっている。"}, {"q": "「甲状腺機能低下症」で見られやすい症状はどれか。", "opts": ["倦怠感・便秘・体重増加", "高熱・多汗", "視力低下のみ", "筋力増強"], "a": 0, "e": "「甲状腺」(こうじょうせん)の機能が低下すると、倦怠感・便秘・体重増加(lelah, sembelit, BB naik)等の症状が現れやすい。加齢による衰えと見過ごされがちなため、注意深い観察が必要とされる。"}, {"q": "「まぶたが腫れる」ときに考えられる原因はどれか。", "opts": ["アレルギーや感染", "骨折", "筋力低下", "消化不良"], "a": 0, "e": "「まぶた」(mabuta/kelopak mata)の腫れは、アレルギー反応や結膜炎などの感染が原因であることが多い。持続する場合は自己判断せず、看護師や医療職への報告が必要となる。"}, {"q": "「甲状腺」がある体の部位はどれか。", "opts": ["首", "胸", "お腹", "背中"], "a": 0, "e": "「甲状腺」(こうじょうせん)は「首」(くび)の前方、喉仏の下あたりに位置する内分泌器官。ホルモンを分泌し代謝を調節する重要な役割を持ち、機能異常は倦怠感や体重変化として現れやすい。"}, {"q": "感覚器官のうち、聴覚に関わる器官はどれか。", "opts": ["耳", "目", "鼻", "舌"], "a": 0, "e": "聴覚(聞く感覚)を司るのは「耳」(みみ/telinga)。目は視覚、鼻は嗅覚、舌は味覚というように、五感それぞれに対応する感覚器官が存在する。"}, {"q": "「肩甲骨」と「鎖骨」に共通する特徴はどれか。", "opts": ["どちらも肩周辺の骨である", "どちらも内臓である", "どちらも感覚器官である", "どちらも筋肉である"], "a": 0, "e": "「肩甲骨」(けんこうこつ)と「鎖骨」(さこつ)はどちらも肩周辺に位置する骨で、腕の動きや体を支える構造に関わる。介護技術では移乗や更衣介助の際にこれらの位置を意識することが重要になる。"}];

  var idx = 0, answers = [], quizDone = false;

  // ── Pengocok pilihan jawaban (render-time, bukan di data) ──
  // Ke-34 soal di atas menyimpan jawaban benar di indeks 0 (a:0) — pola warisan
  // yang membuat klik opsi pertama selalu benar. Alih-alih menulis ulang data
  // (34 soal sengaja "dipertahankan utuh"), urutan tombol dikocok Fisher–Yates
  // setiap kali soal dirender. order[idx] memetakan posisi tombol -> indeks
  // opsi ASLI, dan pick() menerjemahkan klik kembali ke indeks asli — sehingga
  // q.a, scoring di finishQuiz(), maupun data Q sama sekali tidak berubah.
  function shuffleArr(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  var order = []; // order[idx] = susunan indeks opsi asli utk posisi tombol soal idx

  function shuffledOptsFor(i) {
    var pairs = Q[i].opts.map(function (_, oi) { return oi; });
    shuffleArr(pairs);
    order[i] = pairs;
    return pairs.map(function (oi) { return Q[i].opts[oi]; });
  }

  function renderQuiz() {
    var q = Q[idx];
    $('qProgress').textContent = 'Soal ' + (idx + 1) + ' / ' + Q.length;
    $('qText').textContent = q.q;
    $('qExpl').classList.remove('show');
    var ch = $('qChoices'); ch.innerHTML = '';
    shuffledOptsFor(idx).forEach(function (opt, i) {
      var b = document.createElement('button');
      b.className = 'q-choice';
      b.textContent = opt;
      b.addEventListener('click', function () { pick(order[idx][i]); });
      ch.appendChild(b);
    });
    $('qNextBtn').disabled = true;
    $('qNextBtn').textContent = (idx === Q.length - 1) ? 'Lihat Hasil ✓' : 'Berikutnya →';
  }

  function pick(origIdx) {
    if (answers[idx] != null) return;
    answers[idx] = origIdx;
    var q = Q[idx];
    var correctPos = order[idx].indexOf(q.a);
    var clickedPos = order[idx].indexOf(origIdx);
    var btns = $('qChoices').querySelectorAll('.q-choice');
    btns.forEach(function (b, bi) {
      if (bi === correctPos) b.classList.add('correct');
      else if (bi === clickedPos) b.classList.add('wrong');
    });
    $('qExpl').textContent = q.e;
    $('qExpl').classList.add('show');
    $('qNextBtn').disabled = false;

    // Integrasi XP (Tahap 6): +10 per jawaban benar, +25 bonus 5 benar berturut-turut
    if (origIdx === q.a && global.NPAnatomyViewer) {
      grantQuizXP(10, 'Jawaban benar');
      trackStreak(true);
    } else {
      trackStreak(false);
    }
  }

  var correctStreak = 0;
  function trackStreak(correct) {
    if (correct) {
      correctStreak++;
      if (correctStreak === 5) { grantQuizXP(25, '5 jawaban benar berturut-turut!'); correctStreak = 0; }
    } else {
      correctStreak = 0;
    }
  }

  // ═══ Integrasi XP (Tahap 6): +10 per jawaban benar, +25 bonus 5 benar berturut, +50 selesai ═══
  // Sumber 'quiz' = whitelist bucketOf() di np-xp.js, ikut papan Sumber XP di
  // SRS-Statistics. PERBAIKAN: modul diekspor sebagai global.NPXP dengan metode
  // award() — nama lama global.NPXp.add() tidak pernah ada, jadi XP kuis ini
  // sebelumnya HILANG diam-diam (try/catch menelan ReferenceError-nya).
  function grantQuizXP(amount, reason) {
    try {
      if (global.NPXP && typeof global.NPXP.award === 'function') {
        global.NPXP.award('quiz', amount, { title: 'Anatomi — ' + reason });
      }
    } catch (e) { /* aman diabaikan */ }
  }

  $('qNextBtn').addEventListener('click', function () {
    if (idx < Q.length - 1) { idx++; renderQuiz(); }
    else { finishQuiz(); }
  });

  function finishQuiz() {
    var correct = 0;
    Q.forEach(function (q, i) { if (answers[i] === q.a) correct++; });
    var pct = Math.round(correct / Q.length * 100);
    $('qPanel').style.display = 'none';
    $('quizResult').style.display = 'block';
    $('quizScoreVal').textContent = pct + '%';
    $('quizScoreMsg').textContent = correct + ' dari ' + Q.length + ' benar. ' +
      (pct >= 80 ? 'Luar biasa! Istilah anatomi sudah kamu kuasai.' :
       pct >= 60 ? 'Bagus, terus berlatih untuk makin lancar.' :
       'Pelajari lagi daftar istilah di atas, lalu coba ulang.');

    // XP bonus menyelesaikan kuis (Tahap 6)
    grantQuizXP(50, 'Menyelesaikan Kuis Anatomi');
  }

  $('quizRetryBtn').addEventListener('click', function () {
    idx = 0; answers = [];
    $('quizResult').style.display = 'none';
    $('qPanel').style.display = 'block';
    renderQuiz();
  });

  // ═══════════ MODE KUIS VISUAL (Tahap 5.3) ═══════════
  // Sistem meminta user tap hotspot yang benar di diagram, bukan pilih dari teks.
  var visualQuizActive = false;
  var visualQuizHistory = []; // hindari soal sama berturut-turut

  function startVisualQuiz() {
    visualQuizActive = true;
    nextVisualQuestion();
  }

  function nextVisualQuestion() {
    var candidates = D.TERMS_FLAT.filter(function (t) { return t.bodyId; });
    if (!candidates.length) return;
    var pick;
    do {
      pick = candidates[Math.floor(Math.random() * candidates.length)];
    } while (candidates.length > 1 && visualQuizHistory[visualQuizHistory.length - 1] === pick.id);
    visualQuizHistory.push(pick.id);
    if (visualQuizHistory.length > 5) visualQuizHistory.shift();

    showToastIfAvailable('「' + pick.japanese + '」をタップしてください');
    window._anatomyVisualQuizTarget = pick;
  }

  function checkVisualAnswer(bodyId) {
    var target = window._anatomyVisualQuizTarget;
    if (!target) return;
    if (bodyId === target.bodyId) {
      showToastIfAvailable('✅ Benar! ' + target.japanese + ' = ' + target.indonesian);
      grantQuizXP(10, 'Kuis Visual Benar');
      setTimeout(nextVisualQuestion, 1200);
    } else {
      showToastIfAvailable('❌ Coba lagi — petunjuk: ' + target.location);
    }
  }

  function showToastIfAvailable(msg) {
    if (global.NPAnatomyViewer) {
      // Pakai mekanisme toast yang sama dengan viewer (akses via event kustom sederhana)
      var ev = new CustomEvent('anatomy-toast', { detail: msg });
      document.dispatchEvent(ev);
    }
  }

  global.NPAnatomyQuiz = {
    renderQuiz: renderQuiz,
    startVisualQuiz: startVisualQuiz,
    checkVisualAnswer: checkVisualAnswer,
    TOTAL_QUESTIONS: Q.length,
  };

  renderQuiz();
})(window);
