/**
 * assets/ssw-quiz.js — mesin penilaian kuis SSW (特定技能)
 * ==========================================================
 * Logika MURNI: menyusun sesi soal dan menilai jawaban. Tidak menyentuh
 * DOM, localStorage, maupun jaringan — supaya SSW/Quiz.html dan
 * SSW/Mock-Exam.html memakai aturan penilaian yang SAMA PERSIS, dan
 * aturannya bisa diuji unit di Node (scripts/tests/test-ssw-quiz.js)
 * alih-alih hanya lewat pencocokan pola sumber.
 *
 * KONTRAK SOAL (mengikuti ssw_questions + validasi netlify/functions/ssw-cms.js):
 *   type 'mc' | 'vocab' | 'kanji' | 'grammar' | 'listening' | 'reading'
 *       payload.choices[] (2–6)      answer.index  (int)      jawaban: index
 *   type 'tf'
 *       —                            answer.bool   (boolean)  jawaban: boolean
 *   type 'fill'
 *       —                            answer.accept[] (string) jawaban: string
 *   type 'match'
 *       payload.pairs[] {left,right} answer.pairs[]  {left,right}
 *       jawaban: objek { [left]: right }
 *
 * 'match' dinilai seluruhnya benar atau seluruhnya salah (satu soal = satu
 * nilai). Nilai sebagian membuat arti `points` jadi kabur dan pembahasannya
 * sulit ditulis jujur — kalau kelak diperlukan, itu keputusan produk, bukan
 * detail implementasi yang boleh diam-diam berubah di sini.
 *
 * IIFE, namespace window.SSWQuiz — pola assets/ssw-api.js.
 */
(function () {
  'use strict';

  const CHOICE_TYPES = ['mc', 'vocab', 'kanji', 'grammar', 'listening', 'reading'];

  /* PRNG deterministik (mulberry32). Ada supaya pengacakan bisa diuji:
     dengan seed yang sama, urutan soal selalu sama, jadi test tidak perlu
     menambal Math.random global. Bukan untuk keperluan kriptografis. */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fisher–Yates: setiap permutasi berpeluang sama. Tidak memakai
  // sort(() => Math.random() - 0.5) yang distribusinya bias.
  function shuffle(arr, rng) {
    const r = rng || Math.random;
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /* Normalisasi jawaban isian. Spasi lebar (U+3000) ikut diratakan karena
     pengetikan Jepang gampang menyisipkannya tanpa disadari; selain itu
     hanya trim + rapatkan spasi + lowercase (berpengaruh ke romaji/latin,
     tidak mengubah kana/kanji). Sengaja TIDAK menyamakan hiragana↔katakana:
     membedakannya justru bagian dari yang diuji. */
  function normalizeText(s) {
    return String(s == null ? '' : s)
      .replace(/　/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function isAnswered(q, given) {
    if (given === undefined || given === null) return false;
    const type = q && q.type;
    if (CHOICE_TYPES.indexOf(type) !== -1) return Number.isInteger(given);
    if (type === 'tf') return typeof given === 'boolean';
    if (type === 'fill') return normalizeText(given) !== '';
    if (type === 'match') {
      const pairs = (q.answer && q.answer.pairs) || [];
      return pairs.every(p => given && normalizeText(given[p.left]) !== '');
    }
    return false;
  }

  /* Menilai SATU soal. Selalu mengembalikan bentuk yang sama supaya
     pemanggil tidak perlu tahu tipenya. */
  function gradeQuestion(q, given) {
    const points = Number.isFinite(q && q.points) && q.points > 0 ? q.points : 1;
    const answer = (q && q.answer) || {};
    let correct = false;

    if (CHOICE_TYPES.indexOf(q && q.type) !== -1) {
      correct = Number.isInteger(given) && given === answer.index;
    } else if (q && q.type === 'tf') {
      correct = typeof given === 'boolean' && given === answer.bool;
    } else if (q && q.type === 'fill') {
      const accept = Array.isArray(answer.accept) ? answer.accept : [];
      const g = normalizeText(given);
      correct = g !== '' && accept.some(a => normalizeText(a) === g);
    } else if (q && q.type === 'match') {
      const pairs = Array.isArray(answer.pairs) ? answer.pairs : [];
      correct = pairs.length > 0 && pairs.every(p =>
        given && normalizeText(given[p.left]) === normalizeText(p.right));
    }

    return { correct, points, earned: correct ? points : 0, answered: isAnswered(q, given) };
  }

  /* Menilai seluruh sesi. `answers` dipetakan lewat id soal supaya urutan
     tampilan (yang bisa diacak) tidak ikut menentukan penilaian. */
  function gradeQuiz(questions, answers, opts) {
    const list = Array.isArray(questions) ? questions : [];
    const given = answers || {};
    const passScore = Number.isFinite(opts && opts.passScore) ? opts.passScore : 60;

    let earned = 0, total = 0, correctCount = 0, answeredCount = 0;
    const detail = list.map(q => {
      const res = gradeQuestion(q, given[q.id]);
      earned += res.earned;
      total += res.points;
      if (res.correct) correctCount++;
      if (res.answered) answeredCount++;
      return {
        qid: q.id,
        correct: res.correct,
        given: given[q.id] === undefined ? null : given[q.id],
        points: res.points,
        earned: res.earned,
      };
    });

    // Skor persen berbasis POIN, bukan jumlah soal — soal boleh berbobot beda.
    const score = total > 0 ? Math.round((earned / total) * 100) : 0;
    return {
      score, earned, total,
      correctCount, answeredCount,
      questionCount: list.length,
      passed: score >= passScore,
      passScore,
      detail,
    };
  }

  /* quiz.distribution — { 'area:seikatsu': 20, ... } — dari DB (jsonb) atau
     JSON statis. String JSON juga diterima; bentuk lain dianggap tidak ada. */
  function distributionOf(q) {
    let d = q.distribution;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
    return d && typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length ? d : null;
  }

  /* Menyusun daftar soal satu sesi: acak bila quiz.randomize, lalu potong
     ke quiz.question_count bila diisi (dipakai mock exam yang menarik
     sebagian soal dari bank). Urutan asal dipakai apa adanya bila tidak.

     Mock berstrata: bila quiz.distribution ada, tiap tag menarik jumlahnya
     sendiri, dikelompokkan per area mengikuti urutan objek — seperti CBT
     resmi yang menyajikan soal per bidang (介護の基本 → … → 生活支援技術).
     Soal bertag dua area tidak pernah terambil dua kali. Area yang banknya
     kurang diambil seadanya; generator & audit yang menjaga bank cukup. */
  function buildSession(quiz, opts) {
    const o = opts || {};
    const q = quiz || {};
    let list = Array.isArray(q.ssw_questions) ? q.ssw_questions.slice()
             : Array.isArray(q.questions) ? q.questions.slice() : [];

    list.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const dist = distributionOf(q);
    if (dist) {
      const used = new Set();
      const out = [];
      Object.keys(dist).forEach(tag => {
        let pool = list.filter(x => !used.has(x) && Array.isArray(x.tags) && x.tags.includes(tag));
        if (q.randomize) pool = shuffle(pool, o.rng);
        pool.slice(0, Math.max(0, Math.floor(Number(dist[tag]) || 0))).forEach(x => { used.add(x); out.push(x); });
      });
      return out;
    }
    if (q.randomize) list = shuffle(list, o.rng);

    const limit = Number.isFinite(q.question_count) && q.question_count > 0 ? q.question_count : 0;
    if (limit && list.length > limit) list = list.slice(0, limit);
    return list;
  }

  /* ── Waktu ujian ──────────────────────────────────────────────
     Batas waktu dihitung dari TITIK AKHIR (deadline absolut), bukan dengan
     mengurangi penghitung tiap detik. Interval di browser tidak akurat dan
     berhenti dijeda saat tab tidak aktif — penghitung yang menabung selisih
     akan memberi peserta waktu ekstra hanya karena sempat berpindah tab.
     Selisih terhadap jam sistem selalu benar walau tickernya meleset. */
  function examDeadline(startedAt, limitMin) {
    const menit = Number(limitMin);
    if (!Number.isFinite(menit) || menit <= 0) return null;   // tanpa batas waktu
    return startedAt + Math.round(menit * 60000);
  }
  function remainingSeconds(deadline, now) {
    if (!deadline) return null;                                // tanpa batas waktu
    return Math.max(0, Math.ceil((deadline - now) / 1000));
  }
  function isExpired(deadline, now) {
    return deadline !== null && deadline !== undefined && now >= deadline;
  }
  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const j = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), d = s % 60;
    const dua = n => String(n).padStart(2, '0');
    return j > 0 ? j + ':' + dua(m) + ':' + dua(d) : dua(m) + ':' + dua(d);
  }

  // Label sumber. Konten buatan sendiri TIDAK BOLEH tampak sebagai soal
  // resmi — pemisahan ini dipaksakan juga di ssw-cms.js (source=official
  // wajib punya source_url).
  function sourceLabel(quiz) {
    const q = quiz || {};
    if (q.source === 'official') {
      return { text: q.source_name ? 'Official — ' + q.source_name : 'Official', official: true, url: q.source_url || '' };
    }
    return { text: 'Generated Practice', official: false, url: '' };
  }

  window.SSWQuiz = {
    CHOICE_TYPES,
    mulberry32, shuffle, normalizeText,
    isAnswered, gradeQuestion, gradeQuiz, buildSession, sourceLabel,
    examDeadline, remainingSeconds, isExpired, formatClock,
  };
})();
