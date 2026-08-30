/**
 * Speaking AI — Nihongo Pro Academy
 * Text-to-Speech pronunciation + Speech-to-Text scoring
 */
(function() {
  'use strict';

  /* ── TTS (Text-to-Speech) ── */
  function speak(text, lang = 'ja-JP', rate = 0.85) {
    if (!window.speechSynthesis) return Promise.reject('SpeechSynthesis not supported');
    window.speechSynthesis.cancel();

    return new Promise((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rate;
      u.pitch = 1;

      // Try to find Japanese voice
      const voices = window.speechSynthesis.getVoices();
      const jpVoice = voices.find(v => v.lang.startsWith('ja'));
      if (jpVoice) u.voice = jpVoice;

      u.onend = () => resolve();
      u.onerror = (e) => reject(e);
      window.speechSynthesis.speak(u);
    });
  }

  /* ── STT (Speech-to-Text) ── */
  function startRecognition(lang = 'ja-JP') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    return recognition;
  }

  function recognizeOnce(expectedText, lang = 'ja-JP') {
    return new Promise((resolve, reject) => {
      const recognition = startRecognition(lang);
      if (!recognition) return reject('SpeechRecognition not supported');

      let finalTranscript = '';
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript = event.results[i][0].transcript;
          }
        }
      };

      recognition.onend = () => {
        const score = calculatePronunciationScore(expectedText, finalTranscript);
        resolve({ transcript: finalTranscript, score, alternatives: [] });
      };

      recognition.onerror = (e) => reject(e);
      recognition.start();
    });
  }

  /* ── Scoring Algorithm ── */
  function calculatePronunciationScore(expected, actual) {
    if (!actual) return { accuracy: 0, match: false, feedback: 'Tidak ada suara terdeteksi' };

    // Normalize text
    const normalize = (t) => t.replace(/[\s\u3000]/g, '').toLowerCase();
    const exp = normalize(expected);
    const act = normalize(actual);

    // Levenshtein distance
    const matrix = Array(act.length + 1).fill(null).map(() => Array(exp.length + 1).fill(null));
    for (let i = 0; i <= act.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= exp.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= act.length; i++) {
      for (let j = 1; j <= exp.length; j++) {
        const cost = act[i-1] === exp[j-1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i-1][j] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j-1] + cost
        );
      }
    }

    const distance = matrix[act.length][exp.length];
    const maxLen = Math.max(exp.length, act.length);
    const accuracy = maxLen > 0 ? Math.round((1 - distance / maxLen) * 100) : 0;

    let feedback = '';
    if (accuracy >= 90) feedback = '🎵 Sempurna! Pengucapan sangat baik.';
    else if (accuracy >= 70) feedback = '👍 Bagus! Sedikit perlu diperbaiki.';
    else if (accuracy >= 50) feedback = '💪 Cukup, coba dengarkan lagi dan ulangi.';
    else feedback = '🎧 Dengarkan model pengucapan dan coba lagi.';

    return { accuracy, match: accuracy >= 70, feedback, expected, actual };
  }

  /* ── Practice UI ── */
  function renderPracticeCard(container, item, onResult) {
    container.innerHTML = `
      <div class="speak-card" style="max-width:500px;margin:0 auto;padding:24px;background:var(--white);border:1px solid var(--border-light);border-radius:16px">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:2.5rem;font-weight:700;color:var(--ink);margin-bottom:8px">${item.japanese}</div>
          <div style="font-size:14px;color:var(--ink-mid)">${item.romaji || ''}</div>
          <div style="font-size:13px;color:var(--primary);margin-top:4px">${item.meaning}</div>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px">
          <button class="speak-listen-btn" style="padding:12px 24px;border-radius:12px;border:2px solid var(--primary);background:transparent;color:var(--primary);font-weight:600;cursor:pointer;font-size:14px">
            🔊 Dengarkan
          </button>
          <button class="speak-record-btn" style="padding:12px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#EF4444,#DC2626);color:#fff;font-weight:600;cursor:pointer;font-size:14px">
            🎤 Rekam
          </button>
        </div>

        <div class="speak-result" style="text-align:center;display:none">
          <div class="speak-accuracy" style="font-size:2rem;font-weight:800;margin-bottom:8px"></div>
          <div class="speak-feedback" style="font-size:14px;color:var(--ink-mid);margin-bottom:8px"></div>
          <div class="speak-transcript" style="font-size:13px;padding:8px 16px;background:var(--cream);border-radius:8px;display:inline-block"></div>
        </div>

        <div id="speak-next" style="text-align:center;margin-top:16px;display:none">
          <button style="padding:10px 24px;border-radius:10px;border:none;background:var(--primary);color:#fff;font-weight:600;cursor:pointer">Selanjutnya →</button>
        </div>
      </div>
    `;

    const listenBtn = container.querySelector('.speak-listen-btn');
    const recordBtn = container.querySelector('.speak-record-btn');
    const resultDiv = container.querySelector('.speak-result');
    const accuracyDiv = container.querySelector('.speak-accuracy');
    const feedbackDiv = container.querySelector('.speak-feedback');
    const transcriptDiv = container.querySelector('.speak-transcript');
    const nextDiv = container.querySelector('#speak-next');

    listenBtn.addEventListener('click', () => speak(item.japanese));

    let isRecording = false;
    recordBtn.addEventListener('click', async () => {
      if (isRecording) return;
      isRecording = true;
      recordBtn.textContent = '🔴 Merekam...';
      recordBtn.style.background = 'linear-gradient(135deg,#B91C1C,#991B1B)';

      try {
        const result = await recognizeOnce(item.japanese);
        resultDiv.style.display = 'block';
        accuracyDiv.textContent = `${result.score.accuracy}%`;
        accuracyDiv.style.color = result.score.accuracy >= 70 ? '#059669' : result.score.accuracy >= 50 ? '#D97706' : '#DC2626';
        feedbackDiv.textContent = result.score.feedback;
        transcriptDiv.textContent = `"${result.transcript}"`;
        nextDiv.style.display = 'block';

        if (onResult) onResult(result);
      } catch (e) {
        resultDiv.style.display = 'block';
        accuracyDiv.textContent = '❓';
        feedbackDiv.textContent = 'Tidak dapat mengenali suara. Coba lagi.';
      }

      isRecording = false;
      recordBtn.textContent = '🎤 Rekam';
      recordBtn.style.background = 'linear-gradient(135deg,#EF4444,#DC2626)';
    });

    nextDiv.querySelector('button').addEventListener('click', () => {
      container.innerHTML = '';
      if (container._onNext) container._onNext();
    });
  }

  /* ── Dark Mode ── */
  function injectStyles() {
    if (document.getElementById('speak-styles')) return;
    const style = document.createElement('style');
    style.id = 'speak-styles';
    style.textContent = `
      [data-theme="dark"] .speak-card{background:#1c1e22 !important;border-color:#333 !important}
      [data-theme="dark"] .speak-card .speak-transcript{background:#232430 !important;color:#D0CFC9 !important}
    `;
    document.head.appendChild(style);
  }

  /* ── Public API ── */
  window.SpeakingAI = {
    speak,
    recognizeOnce,
    renderPracticeCard: (container, item, cb) => {
      injectStyles();
      renderPracticeCard(container, item, cb);
    },
    calculatePronunciationScore
  };

})();
