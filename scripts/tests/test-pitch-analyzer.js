/**
 * Test akurasi algoritma autocorrelate() di pitch-analyzer.js.
 * Menghasilkan sinyal sinusoidal MURNI dengan frekuensi diketahui persis,
 * lalu memverifikasi algoritma mendeteksi frekuensi itu dengan toleransi wajar.
 * Ini validasi ilmiah dasar sebelum dipakai di kode produksi -- tanpa ini,
 * tidak ada cara memastikan algoritma autocorrelation-nya benar dieksekusi.
 */
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync(__dirname + '/../../assets/pitch-analyzer.js', 'utf-8');
const sandbox = {
  window: {},
  navigator: {},
  console,
};
sandbox.window.AudioContext = function () {}; // stub, tidak dipakai di test unit ini
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

// Akses fungsi autocorrelate secara langsung: modul ini tidak mengekspornya
// secara publik (hanya PitchAnalyzer class), jadi kita re-extract fungsi
// dari source untuk uji terisolasi -- pola sama seperti test proyek lain
// yang menjalankan kode produksi asli, bukan duplikasi logika.
const fnMatch = code.match(/function autocorrelate\(buffer, sampleRate\) \{[\s\S]*?\n  \}/);
if (!fnMatch) {
  // BUG FATAL YANG DIPERBAIKI: process.exit(1) di sini akan mematikan
  // SELURUH proses run-all.js sebelum sempat menjalankan test suite lain
  // yang urutan alfabetisnya setelah file ini (test-srs.js, test-xp.js).
  // Melempar Error biasa membuat masalah ini tertangkap sebagai satu test
  // gagal oleh runner, bukan mematikan seluruh test run.
  throw new Error('Tidak bisa mengekstrak fungsi autocorrelate dari source pitch-analyzer.js -- source mungkin berubah struktur.');
}
const autocorrelate = vm.runInContext(`(${fnMatch[0]})`, sandbox);

function generateSineWave(freq, sampleRate, durationSec, amplitude = 0.5) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buf = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buf[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
  }
  return buf;
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 2048; // sama seperti dipakai di PitchAnalyzer

test('Deteksi nada 220 Hz (A3, umum di suara pria dewasa)', () => {
  const buf = generateSineWave(220, SAMPLE_RATE, BUFFER_SIZE / SAMPLE_RATE + 0.01);
  const detected = autocorrelate(buf.slice(0, BUFFER_SIZE), SAMPLE_RATE);
  const errorPct = Math.abs(detected - 220) / 220 * 100;
  if (errorPct > 3) throw new Error(`Detected ${detected.toFixed(2)} Hz, error ${errorPct.toFixed(1)}% (target <3%)`);
});

test('Deteksi nada 150 Hz (rentang bawah suara pria)', () => {
  const buf = generateSineWave(150, SAMPLE_RATE, BUFFER_SIZE / SAMPLE_RATE + 0.01);
  const detected = autocorrelate(buf.slice(0, BUFFER_SIZE), SAMPLE_RATE);
  const errorPct = Math.abs(detected - 150) / 150 * 100;
  if (errorPct > 3) throw new Error(`Detected ${detected.toFixed(2)} Hz, error ${errorPct.toFixed(1)}% (target <3%)`);
});

test('Deteksi nada 300 Hz (rentang suara wanita)', () => {
  const buf = generateSineWave(300, SAMPLE_RATE, BUFFER_SIZE / SAMPLE_RATE + 0.01);
  const detected = autocorrelate(buf.slice(0, BUFFER_SIZE), SAMPLE_RATE);
  const errorPct = Math.abs(detected - 300) / 300 * 100;
  if (errorPct > 3) throw new Error(`Detected ${detected.toFixed(2)} Hz, error ${errorPct.toFixed(1)}% (target <3%)`);
});

test('Sinyal hening (amplitude 0) -> return -1 (tidak ada pitch)', () => {
  const buf = new Float32Array(BUFFER_SIZE); // semua nol
  const detected = autocorrelate(buf, SAMPLE_RATE);
  if (detected !== -1) throw new Error(`Expected -1 for silence, got ${detected}`);
});

test('Sinyal sangat pelan (di bawah threshold RMS) -> return -1', () => {
  const buf = generateSineWave(220, SAMPLE_RATE, BUFFER_SIZE / SAMPLE_RATE + 0.01, 0.001);
  const detected = autocorrelate(buf.slice(0, BUFFER_SIZE), SAMPLE_RATE);
  if (detected !== -1) throw new Error(`Expected -1 for very quiet signal, got ${detected}`);
});

test('Frekuensi di luar rentang suara manusia (800 Hz) -> ditolak (return -1)', () => {
  const buf = generateSineWave(800, SAMPLE_RATE, BUFFER_SIZE / SAMPLE_RATE + 0.01);
  const detected = autocorrelate(buf.slice(0, BUFFER_SIZE), SAMPLE_RATE);
  if (detected !== -1) throw new Error(`Expected -1 for out-of-range 800Hz, got ${detected}`);
});

module.exports = { tests };
