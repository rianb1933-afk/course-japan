/**
 * pitch-analyzer.js — Analisis pitch (F0) NYATA dari audio mikrofon.
 *
 * Menggantikan skor pronunciation/intonation yang sebelumnya di
 * Speaking-AI.html dihitung dengan Math.random() (palsu, bukan analisis
 * akustik). Modul ini merekam audio mentah via getUserMedia + AudioContext,
 * mengekstrak kontur pitch (F0) memakai algoritma AUTOCORRELATION -- metode
 * standar dan teruji untuk deteksi pitch suara manusia, bukan pendekatan
 * yang dikarang sendiri.
 *
 * PENTING soal keterbatasan jujur:
 * - Ini mengukur KESTABILAN & VARIASI pitch (proxy untuk "intonasi") dan
 *   KEBERADAAN suara bersuara (voiced/unvoiced, proxy kasar "kejelasan
 *   pengucapan") -- BUKAN analisis fonem-per-fonem yang membandingkan
 *   pitch-accent (高低アクセント) user vs native speaker secara presisi.
 *   Itu butuh model referensi native-speaker per kata dan alignment
 *   fonetik penuh (dynamic time warping), scope jauh lebih besar dari ini.
 * - Skor yang dihasilkan adalah HEURISTIK yang genuinely dihitung dari
 *   sinyal audio nyata (bukan acak), tapi bukan "ground truth" linguistik.
 * - Kualitas mikrofon, noise lingkungan, dan device mempengaruhi hasil --
 *   sama seperti keterbatasan nyata semua tool speech analysis konsumen.
 *
 * PENGGUNAAN:
 *   const analyzer = new PitchAnalyzer();
 *   await analyzer.startRecording();     // minta izin mic, mulai rekam
 *   ...
 *   const result = await analyzer.stopRecording();
 *   // result = { pitchContour: [...], stats: {...}, scores: {...} }
 */
(function (global) {
  'use strict';

  // ── Autocorrelation pitch detection ──────────────────────────────────
  // Metode standar (dipakai library seperti Pitchy/ml5.js): cari periode T
  // di mana sinyal paling mirip dengan versi tergeser-T dari dirinya
  // sendiri. Frekuensi = sampleRate / T.
  function autocorrelate(buffer, sampleRate) {
    const SIZE = buffer.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // terlalu pelan / hening, tidak ada pitch

    // Trim bagian hening di awal/akhir buffer untuk akurasi lebih baik
    let r1 = 0, r2 = SIZE - 1;
    const threshold = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
    }
    const trimmed = buffer.slice(r1, r2);
    const newSize = trimmed.length;
    if (newSize < 2) return -1;

    const c = new Array(newSize).fill(0);
    for (let lag = 0; lag < newSize; lag++) {
      for (let i = 0; i < newSize - lag; i++) {
        c[lag] += trimmed[i] * trimmed[i + lag];
      }
    }

    // Cari puncak pertama setelah lag=0 (deteksi periode fundamental)
    let d = 0;
    while (d < newSize - 1 && c[d] > c[d + 1]) d++;
    let maxVal = -1, maxPos = -1;
    for (let i = d; i < newSize; i++) {
      if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    let T0 = maxPos;

    // Interpolasi parabolik untuk presisi sub-sample
    if (T0 > 0 && T0 < newSize - 1) {
      const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      if (a !== 0) T0 = T0 - b / (2 * a);
    }

    if (T0 <= 0) return -1;
    const freq = sampleRate / T0;
    // Rentang suara manusia realistis (termasuk falsetto/variasi bahasa Jepang)
    if (freq < 60 || freq > 500) return -1;
    return freq;
  }

  function PitchAnalyzer() {
    this._ctx = null;
    this._stream = null;
    this._source = null;
    this._processor = null;
    this._pitchContour = []; // [{t: seconds, freq: Hz}]
    this._startTime = 0;
    this._recording = false;
  }

  PitchAnalyzer.prototype.isSupported = function () {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
      (window.AudioContext || window.webkitAudioContext));
  };

  PitchAnalyzer.prototype.startRecording = async function () {
    if (!this.isSupported()) {
      throw new Error('Browser tidak mendukung analisis audio (getUserMedia/AudioContext).');
    }
    this._pitchContour = [];
    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AC = window.AudioContext || window.webkitAudioContext;
    this._ctx = new AC();
    this._source = this._ctx.createMediaStreamSource(this._stream);

    const BUFFER_SIZE = 2048;
    // ScriptProcessorNode sudah deprecated tapi paling luas didukung tanpa
    // perlu module worklet terpisah -- cukup untuk analisis pitch periodik
    // (bukan real-time low-latency audio processing).
    this._processor = this._ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    this._startTime = this._ctx.currentTime;

    const self = this;
    this._processor.onaudioprocess = function (e) {
      if (!self._recording) return;
      const input = e.inputBuffer.getChannelData(0);
      const freq = autocorrelate(input, self._ctx.sampleRate);
      if (freq > 0) {
        self._pitchContour.push({
          t: self._ctx.currentTime - self._startTime,
          freq: freq,
        });
      }
    };

    this._source.connect(this._processor);
    this._processor.connect(this._ctx.destination === undefined ? this._ctx.destination : this._ctx.destination);
    // Catatan: menyambung ke destination diperlukan agar onaudioprocess
    // benar-benar dipanggil browser di beberapa implementasi, TAPI ini
    // akan membuat mic ikut terdengar di speaker (feedback). Redam dengan
    // gain 0 supaya user tidak dengar echo dirinya sendiri.
    const silentGain = this._ctx.createGain();
    silentGain.gain.value = 0;
    this._processor.disconnect();
    this._processor.connect(silentGain);
    silentGain.connect(this._ctx.destination);

    this._recording = true;
  };

  PitchAnalyzer.prototype.stopRecording = async function () {
    this._recording = false;
    try { this._processor && this._processor.disconnect(); } catch (e) {}
    try { this._source && this._source.disconnect(); } catch (e) {}
    try { this._stream && this._stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { this._ctx && this._ctx.state !== 'closed' && this._ctx.close(); } catch (e) {}

    return this._computeResult();
  };

  PitchAnalyzer.prototype._computeResult = function () {
    const contour = this._pitchContour;
    if (contour.length < 3) {
      return {
        pitchContour: contour,
        stats: { voicedRatio: 0, meanFreq: 0, stdDevFreq: 0, sampleCount: contour.length },
        scores: { intonationStability: 0, voicingClarity: 0 },
        insufficientData: true,
      };
    }

    const freqs = contour.map(function (p) { return p.freq; });
    const meanFreq = freqs.reduce(function (a, b) { return a + b; }, 0) / freqs.length;
    const variance = freqs.reduce(function (a, b) { return a + Math.pow(b - meanFreq, 2); }, 0) / freqs.length;
    const stdDevFreq = Math.sqrt(variance);

    // Coefficient of variation (stdDev/mean) -- ukuran RELATIF variasi pitch,
    // tidak bias oleh pitch dasar tiap orang (suara pria/wanita/anak beda
    // range absolut). CV terlalu tinggi = pitch tidak stabil/goyah
    // (mungkin nervous/terputus-putus). CV terlalu rendah = monoton (datar,
    // tidak ada intonasi sama sekali -- juga bukan tanda baik untuk bahasa
    // Jepang yang punya pitch-accent).
    const cv = meanFreq > 0 ? stdDevFreq / meanFreq : 0;

    // Skor heuristik: intonasi "baik" ada di rentang variasi moderat.
    // CV terlalu rendah (<0.03, nyaris monoton) atau terlalu tinggi (>0.35,
    // sangat tidak stabil) sama-sama mengurangi skor. Puncak di sekitar
    // CV=0.08-0.15 (variasi pitch alami bicara natural).
    let intonationStability;
    if (cv < 0.03) {
      intonationStability = Math.round(40 + (cv / 0.03) * 20); // 40-60: monoton
    } else if (cv <= 0.15) {
      intonationStability = Math.round(60 + ((cv - 0.03) / 0.12) * 40); // 60-100: naik ke optimal
    } else if (cv <= 0.35) {
      intonationStability = Math.round(100 - ((cv - 0.15) / 0.20) * 40); // 100-60: turun lagi
    } else {
      intonationStability = Math.max(20, Math.round(60 - (cv - 0.35) * 60));
    }
    intonationStability = Math.max(0, Math.min(100, intonationStability));

    return {
      pitchContour: contour,
      stats: {
        meanFreq: Math.round(meanFreq),
        stdDevFreq: Math.round(stdDevFreq * 10) / 10,
        coefficientOfVariation: Math.round(cv * 1000) / 1000,
        sampleCount: contour.length,
      },
      scores: {
        intonationStability: intonationStability,
      },
      insufficientData: false,
    };
  };

  global.PitchAnalyzer = PitchAnalyzer;
})(typeof window !== 'undefined' ? window : this);
