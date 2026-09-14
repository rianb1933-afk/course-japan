/* Logika sesi Sensei: dipakai halaman dan pengujian tanpa ketergantungan DOM. */
(function(root) {
  'use strict';
  const goals = {
    conversation: {label: 'Percakapan sehari-hari', instruction: 'Latih percakapan natural dan ajukan satu pertanyaan lanjutan.'},
    grammar: {label: 'Ketepatan tata bahasa', instruction: 'Prioritaskan koreksi tata bahasa, jelaskan alasan singkat dan minta murid mencoba pola yang sama.'},
    vocabulary: {label: 'Memperluas kosakata', instruction: 'Kenalkan satu kata relevan per jawaban dan minta murid memakai kata itu dalam kalimat.'},
    work: {label: 'Bahasa Jepang di tempat kerja', instruction: 'Latih ungkapan sopan di tempat kerja sesuai level murid. Jelaskan pilihan ungkapan secara singkat.'}
  };
  function parseReply(text) {
    const vocab = [], corrections = [];
    String(text).replace(/\[VOCAB:\s*([^\]]+)\]/gi, (_, content) => {
      content.split(/[,，;\n]/).forEach(pair => {
        const index = pair.indexOf('=');
        if (index < 1) return;
        const jp = pair.slice(0, index).trim(), id = pair.slice(index + 1).trim();
        if (jp && id && !vocab.some(word => word.jp === jp)) vocab.push({jp, id});
      });
      return '';
    });
    String(text).replace(/\[(?:KOREKSI|コレクション):\s*([^\]]+)\]/gi, (_, content) => {
      if (content.trim()) corrections.push(content.trim());
      return '';
    });
    return {vocab, corrections, clean: String(text).replace(/\[(?:VOCAB|KOREKSI|コレクション):[^\]]*\]/gi, '').trim()};
  }
  function reviewPrompt(correction, level) {
    return `Saya sedang belajar level ${level}. Bantu saya mengulang koreksi ini: ${correction}\nBuat satu soal isian pendek untuk pola tersebut. Jangan tampilkan jawabannya dulu. Tunggu jawaban saya, lalu jelaskan koreksinya dalam bahasa Indonesia.`;
  }
  root.SenseiCoach = {goals, parseReply, reviewPrompt};
})(typeof window === 'undefined' ? globalThis : window);
