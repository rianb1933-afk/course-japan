(function () {
  const data = window.EDUMA_DATA || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const storageKey = "eduma-platform-state-v1";

  const state = loadState();

  function loadState() {
    try {
      // GENUINELY diperbaiki: sebelumnya hanya membaca localStorage("eduma-theme"),
      // key yang tidak pernah ditulis di manapun dalam proyek -- menyebabkan tema
      // selalu fallback ke "light" meski pengguna genuinely toggle dark mode via
      // navbar (yang menulis ke 'kyoto-theme'/'nihongo-theme'/'theme', bukan
      // 'eduma-theme'). Sekarang mengikuti pola window.NPDark yang sudah dipakai
      // kyoto-navbar.js dan platform.js sebagai sumber kebenaran terpusat.
      var hasNPDark = typeof window.NPDark === "object" && window.NPDark !== null;
      var genuineTheme = hasNPDark
        ? (window.NPDark.isDarkActive() ? "dark" : "light")
        : (localStorage.getItem("eduma-theme") || "light");
      return Object.assign(
        {
          user: data.profile || {},
          bookmarks: [],
          quizHistory: [],
          certificates: [],
          srs: {},
          xpEvents: [],
          theme: genuineTheme,
        },
        JSON.parse(localStorage.getItem(storageKey) || "{}"),
      );
    } catch (_) {
      return { user: data.profile || {}, bookmarks: [], quizHistory: [], certificates: [], srs: {}, xpEvents: [] };
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function awardXP(amount, reason) {
    state.user.xp = (state.user.xp || 0) + amount;
    state.user.level = Math.max(1, Math.floor((state.user.xp || 0) / 250) + 1);
    state.xpEvents.unshift({ amount, reason, at: new Date().toISOString() });
    saveState();
    toast(`+${amount} XP · ${reason}`);
    renderDashboard();
  }

  function toast(message) {
    let el = $("#edumaToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "edumaToast";
      el.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:9999;background:#101828;color:#fff;padding:12px 14px;border-radius:14px;box-shadow:0 14px 34px rgba(0,0,0,.22);font-weight:800";
      document.body.appendChild(el);
    }
    el.textContent = message;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.remove(), 2600);
  }

  function progressBar(value) {
    return `<div class="progress" aria-label="progress"><i style="--value:${Math.max(0, Math.min(100, value))}%"></i></div>`;
  }

  function renderDashboard() {
    const root = $("#dashboardApp");
    if (!root) return;
    const user = state.user || {};
    const courses = data.courses || [];
    const next = courses.find((c) => c.progress < 100) || courses[0];
    root.innerHTML = `
      <div class="eduma-grid">
        ${metric("XP", user.xp || 0, "Level " + (user.level || 1), 3)}
        ${metric("Streak", `${user.streak || 0} hari`, "Reward harian aktif", 3)}
        ${metric("Kanji", user.kanjiLearned || 0, "dipelajari", 3)}
        ${metric("Grammar", user.grammarDone || 0, "selesai", 3)}
        <section class="eduma-card span-8">
          <h2>Progress JLPT N5-N1</h2>
          ${Object.entries(user.jlptProgress || {}).map(([level, value]) => `<p><b>${level}</b> <span class="muted">${value}%</span></p>${progressBar(value)}`).join("")}
        </section>
        <aside class="eduma-card span-4">
          <h2>Rekomendasi Berikutnya</h2>
          <p class="muted">${next ? next.title : "Review materi hari ini"}</p>
          ${progressBar(next ? next.progress : 0)}
          <div class="eduma-actions"><a class="eduma-btn primary" href="../Materi/Materi.html">Lanjut belajar</a><button class="eduma-btn" data-action="daily-xp">Klaim daily XP</button></div>
        </aside>
        <section class="eduma-card span-6">
          <h2>Progress Kaigo</h2>
          <p class="muted">介護福祉士, kosakata kerja, simulasi situasi, medical care basic.</p>
          ${progressBar(user.kaigoProgress || 0)}
          <div class="pill-row">${["入浴介助","排泄介助","食事介助","移乗介助","認知症対応"].map(x => `<span class="pill">${x}</span>`).join("")}</div>
        </section>
        <section class="eduma-card span-6">
          <h2>Badge & Achievement</h2>
          <div class="eduma-grid">${(data.achievements || []).map(a => `<div class="eduma-card span-4"><span class="badge">${a.xp}</span><h3>${a.title}</h3><p class="muted">${a.desc}</p></div>`).join("")}</div>
        </section>
      </div>`;
    $$("[data-action='daily-xp']", root).forEach((btn) => btn.addEventListener("click", () => awardXP(35, "Daily challenge")));
  }

  function metric(label, value, sub, span) {
    return `<section class="eduma-card span-${span} metric"><span>${label}</span><strong>${value}</strong><span>${sub}</span></section>`;
  }

  function localTutor(mode, input) {
    const text = input.trim();
    const kaigo = mode.includes("Kaigo") || /介護|利用者|食事|排泄|入浴|移乗/.test(text);
    const natural = text
      .replace(/私は介護をします/g, "私は介護の仕事をしています")
      .replace(/助けます/g, "お手伝いします")
      .replace(/早く/g, "ゆっくり");
    return {
      reply: [
        `モード: ${mode}`,
        `自然な言い方: ${natural || "確認してもよろしいですか。"}`,
        `Penjelasan ID: ${kaigo ? "Di kaigo, gunakan bahasa sopan, jelaskan tindakan, dan cek kondisi pengguna." : "Kalimat dibuat lebih natural dengan partikel dan tingkat kesopanan yang aman."}`,
        "Contoh: 今からお手伝いしてもよろしいですか。",
      ].join("\n"),
    };
  }

  function renderTutor() {
    const root = $("#aiTutorApp");
    if (!root) return;
    const modes = ["Grammar correction", "Natural Japanese", "Percakapan", "Interview kerja Jepang", "Kaigo mode"];
    root.innerHTML = `
      <div class="mode-tabs">${modes.map((m, i) => `<button class="${i === 0 ? "active" : ""}" data-mode="${m}">${m}</button>`).join("")}</div>
      <section class="eduma-card chat-box" id="chatBox"><div class="bubble">Masukkan kalimat Jepang. Saya akan koreksi grammar, naturalness, dan jelaskan dalam bahasa Indonesia.</div></section>
      <div class="form-row"><textarea id="aiInput" rows="2" placeholder="例: 私は利用者を助けます"></textarea><button class="eduma-btn primary" id="aiSend">Koreksi</button></div>`;
    let mode = modes[0];
    $$(".mode-tabs button", root).forEach((btn) => btn.addEventListener("click", () => {
      $$(".mode-tabs button", root).forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
    }));
    $("#aiSend", root).addEventListener("click", () => {
      const input = $("#aiInput", root).value;
      if (!input.trim()) return toast("Tulis kalimat dulu");
      const chat = $("#chatBox", root);
      chat.insertAdjacentHTML("beforeend", `<div class="bubble user">${escapeHTML(input)}</div>`);
      chat.insertAdjacentHTML("beforeend", `<div class="bubble">${escapeHTML(localTutor(mode, input).reply).replace(/\n/g, "<br>")}</div>`);
      $("#aiInput", root).value = "";
      awardXP(5, "AI Tutor");
    });
  }

  function renderKaiwa() {
    const root = $("#kaiwaApp");
    if (!root) return;
    const scenarios = [
      ["Restoran", "店員におすすめを聞いて注文する。"],
      ["Konbini", "支払い方法と袋が必要かを答える。"],
      ["Interview kerja", "志望動機と強みを説明する。"],
      ["Rumah sakit", "症状を短く伝える。"],
      ["Panti kaigo", "利用者へ安全確認をする。"],
      ["Percakapan lansia", "不安な気持ちを受け止める。"],
    ];
    root.innerHTML = `
      <div class="mode-tabs">${scenarios.map((s, i) => `<button class="${i === 0 ? "active" : ""}" data-scenario="${s[0]}" data-prompt="${s[1]}">${s[0]}</button>`).join("")}</div>
      <section class="eduma-card"><h2 id="kaiwaTitle">${scenarios[0][0]}</h2><p id="kaiwaPrompt" class="muted">${scenarios[0][1]}</p><div class="chat-box" id="kaiwaChat"><div class="bubble">こんにちは。今日はどうしましたか。</div></div><div class="form-row"><input id="kaiwaInput" placeholder="日本語で返事を書いてください"><button class="eduma-btn primary" id="kaiwaSend">Kirim</button></div></section>`;
    $$(".mode-tabs button", root).forEach((btn) => btn.addEventListener("click", () => {
      $$(".mode-tabs button", root).forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      $("#kaiwaTitle", root).textContent = btn.dataset.scenario;
      $("#kaiwaPrompt", root).textContent = btn.dataset.prompt;
      $("#kaiwaChat", root).innerHTML = `<div class="bubble">${btn.dataset.prompt}</div>`;
    }));
    $("#kaiwaSend", root).addEventListener("click", () => {
      const input = $("#kaiwaInput", root).value.trim();
      if (!input) return;
      const feedback = /です|ます|ください|お願いします/.test(input) ? "丁寧で良いです。次は理由を一文追加しましょう。" : "仕事場では「です・ます」を使うと安全です。";
      $("#kaiwaChat", root).insertAdjacentHTML("beforeend", `<div class="bubble user">${escapeHTML(input)}</div><div class="bubble">${feedback}<br>Contoh: はい、確認してもよろしいですか。</div>`);
      $("#kaiwaInput", root).value = "";
      awardXP(8, "Kaiwa practice");
    });
  }

  function renderPronunciation() {
    const root = $("#pronunciationApp");
    if (!root) return;
    const phrases = ["おはようございます", "確認してもよろしいですか", "ゆっくり立ってください", "看護師に報告します"];
    root.innerHTML = `
      <section class="eduma-card"><h2>Speech / Pronunciation Checker</h2><p class="muted">Gunakan Web Speech API. Jika browser tidak mendukung, gunakan input manual.</p><select id="phrase">${phrases.map(p => `<option>${p}</option>`).join("")}</select><div class="eduma-actions"><button class="eduma-btn primary" id="micBtn">Mulai Microphone</button><button class="eduma-btn" id="manualScore">Cek Manual</button></div><textarea id="speechText" rows="3" placeholder="Hasil suara atau ketik manual"></textarea><div id="speechScore" class="eduma-card"></div></section>`;
    const score = () => {
      const target = $("#phrase", root).value;
      const said = $("#speechText", root).value;
      const same = [...target].filter((ch) => said.includes(ch)).length;
      const value = Math.round((same / target.length) * 100);
      $("#speechScore", root).innerHTML = `<h3>Skor: ${value}</h3>${progressBar(value)}<p class="muted">${value > 80 ? "Bagus. Intonasi dan mora lanjutkan." : "Ulangi pelan-pelan. Fokus pada bunyi panjang dan っ kecil."}</p>`;
      awardXP(6, "Pronunciation");
    };
    $("#manualScore", root).addEventListener("click", score);
    $("#micBtn", root).addEventListener("click", () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return toast("Browser belum mendukung Web Speech API");
      const rec = new SR();
      rec.lang = "ja-JP";
      rec.onresult = (e) => {
        $("#speechText", root).value = e.results[0][0].transcript;
        score();
      };
      rec.start();
    });
  }

  function renderKanjiTrainer() {
    const root = $("#kanjiTrainerApp");
    if (!root) return;
    const kanji = data.kanji || [];
    root.innerHTML = `<section class="eduma-card"><h2>Kanji Writing Trainer</h2><select id="kanjiSelect">${kanji.map((k, i) => `<option value="${i}">${k.char} · ${k.words}</option>`).join("")}</select><div class="eduma-grid"><div class="span-5"><canvas id="kanjiCanvas" class="canvas-board" width="460" height="300"></canvas><div class="eduma-actions"><button class="eduma-btn" id="clearCanvas">Hapus</button><button class="eduma-btn primary" id="saveKanji">Selesai + XP</button></div></div><div class="span-7 eduma-card" id="kanjiInfo"></div></div></section>`;
    const canvas = $("#kanjiCanvas", root);
    const ctx = canvas.getContext("2d");
    let drawing = false;
    const info = () => {
      const k = kanji[$("#kanjiSelect", root).value] || kanji[0];
      $("#kanjiInfo", root).innerHTML = `<h1 style="font-size:72px">${k.char}</h1><p><b>Meaning:</b> ${k.meaning}</p><p><b>Onyomi:</b> ${k.onyomi}</p><p><b>Kunyomi:</b> ${k.kunyomi || "—"}</p><p><b>Words:</b> ${k.words}</p><p><b>Sentence:</b> ${k.sentence}</p><p><b>Stroke order:</b> ikuti contoh guru / data KanjiVG dapat dihubungkan nanti.</p>`;
    };
    const pos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    };
    canvas.addEventListener("pointerdown", (e) => { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener("pointermove", (e) => { if (!drawing) return; const p = pos(e); ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.strokeStyle = "#101828"; ctx.lineTo(p.x, p.y); ctx.stroke(); });
    window.addEventListener("pointerup", () => { drawing = false; });
    $("#clearCanvas", root).addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
    $("#saveKanji", root).addEventListener("click", () => awardXP(10, "Kanji writing"));
    $("#kanjiSelect", root).addEventListener("change", info);
    info();
  }

  function renderCBT() {
    const root = $("#cbtApp");
    if (!root) return;
    const questions = data.quiz || [];
    let idx = 0;
    let answers = {};
    let seconds = 30 * 60;
    root.innerHTML = `<div class="cbt-layout"><section class="eduma-card" id="questionPanel"></section><aside class="eduma-card"><h2 id="timer"></h2><div id="navQ" class="pill-row"></div><button class="eduma-btn primary" id="finishTest">Selesai</button><div id="result"></div></aside></div>`;
    const draw = () => {
      const q = questions[idx];
      $("#questionPanel", root).innerHTML = `<p class="muted">${q.level} · ${q.category}</p><h2>${q.question}</h2>${q.choices.map((c, i) => `<button class="answer-option ${answers[q.id] === i ? "selected" : ""}" data-i="${i}">${i + 1}. ${c}</button>`).join("")}<div class="eduma-actions"><button class="eduma-btn" id="prevQ">Prev</button><button class="eduma-btn" id="nextQ">Next</button></div>`;
      $$(".answer-option", root).forEach((btn) => btn.addEventListener("click", () => { answers[q.id] = Number(btn.dataset.i); draw(); }));
      $("#prevQ", root).addEventListener("click", () => { idx = Math.max(0, idx - 1); draw(); });
      $("#nextQ", root).addEventListener("click", () => { idx = Math.min(questions.length - 1, idx + 1); draw(); });
      $("#navQ", root).innerHTML = questions.map((x, i) => `<button class="pill" data-go="${i}">${i + 1}${answers[x.id] != null ? " ✓" : ""}</button>`).join("");
      $$("[data-go]", root).forEach((b) => b.addEventListener("click", () => { idx = Number(b.dataset.go); draw(); }));
    };
    const finish = () => {
      const score = questions.filter((q) => answers[q.id] === q.answer).length;
      state.quizHistory.unshift({ score, total: questions.length, at: new Date().toISOString() });
      saveState();
      $("#result", root).innerHTML = `<h3>Score ${score}/${questions.length}</h3>${questions.map(q => `<p><b>${q.question}</b><br>${q.explain}</p>`).join("")}`;
      awardXP(score * 20, "JLPT CBT");
    };
    $("#finishTest", root).addEventListener("click", finish);
    setInterval(() => { seconds -= 1; $("#timer", root).textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }, 1000);
    draw();
  }

  function renderKaigoSimulator() {
    const root = $("#kaigoSimulatorApp");
    if (!root) return;
    const scenarios = data.kaigoScenarios || [];
    root.innerHTML = `<div class="mode-tabs">${scenarios.map((s, i) => `<button class="${i === 0 ? "active" : ""}" data-id="${s.id}">${s.title}</button>`).join("")}</div><section class="eduma-card" id="simPanel"></section>`;
    const draw = (id = scenarios[0].id) => {
      const s = scenarios.find((x) => x.id === id) || scenarios[0];
      $("#simPanel", root).innerHTML = `<h2>${s.title}</h2><p>${s.scenario}</p>${s.choices.map((c, i) => `<button class="answer-option" data-ok="${c.ok}" data-feedback="${c.feedback}">${i + 1}. ${c.text}</button>`).join("")}<div id="simFeedback"></div>`;
      $$(".answer-option", root).forEach((btn) => btn.addEventListener("click", () => {
        $("#simFeedback", root).innerHTML = `<div class="${btn.dataset.ok === "true" ? "loading-state" : "error-state"}"><b>${btn.dataset.ok === "true" ? "Benar" : "Perlu diperbaiki"}</b><br>${btn.dataset.feedback}</div>`;
        awardXP(btn.dataset.ok === "true" ? 15 : 4, "Kaigo simulator");
      }));
    };
    $$(".mode-tabs button", root).forEach((btn) => btn.addEventListener("click", () => {
      $$(".mode-tabs button", root).forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      draw(btn.dataset.id);
    }));
    draw();
  }

  function renderSRS() {
    const root = $("#srsApp");
    if (!root) return;
    const cards = [...(data.vocabulary || []), ...(data.grammar || []).map(g => ({ jp: g.pattern, reading: "", id: g.id, example: g.example, type: "grammar" }))];
    let current = cards[0];
    root.innerHTML = `<section class="eduma-card"><h2>Flashcard SRS</h2><div id="srsCard" class="eduma-card"></div><div class="eduma-actions">${["Again","Hard","Good","Easy"].map(x => `<button class="eduma-btn" data-srs="${x}">${x}</button>`).join("")}</div></section>`;
    const draw = () => {
      current = cards[Math.floor(Math.random() * cards.length)];
      $("#srsCard", root).innerHTML = `<h1>${current.jp}</h1><p>${current.reading || current.id}</p><p class="muted">${current.example}</p>`;
    };
    $$("[data-srs]", root).forEach((btn) => btn.addEventListener("click", () => {
      const mult = { Again: 1, Hard: 2, Good: 4, Easy: 7 }[btn.dataset.srs];
      state.srs[current.jp] = { rating: btn.dataset.srs, reviewDate: new Date(Date.now() + mult * 86400000).toISOString() };
      saveState();
      awardXP(mult, `SRS ${btn.dataset.srs}`);
      draw();
    }));
    draw();
  }

  function renderCertificate() {
    const root = $("#certificateApp");
    if (!root) return;
    root.innerHTML = `<section class="eduma-card"><h2>Certificate Generator</h2><div class="form-row"><input id="certName" placeholder="Nama siswa"><input id="certCourse" placeholder="Course name" value="Kaigo Core"><input id="certScore" placeholder="Score" value="92"></div><div class="eduma-actions"><button class="eduma-btn primary" id="makeCert">Buat Sertifikat</button><button class="eduma-btn" id="printCert">Download PDF / Print</button></div><div id="certView" class="eduma-card"></div></section>`;
    $("#makeCert", root).addEventListener("click", () => {
      const id = `EDUMA-${Date.now().toString(36).toUpperCase()}`;
      const cert = { id, name: $("#certName", root).value || "Nama Siswa", course: $("#certCourse", root).value || "Course", score: $("#certScore", root).value || "100", date: new Date().toLocaleDateString("id-ID") };
      state.certificates.unshift(cert);
      saveState();
      $("#certView", root).innerHTML = `<div style="text-align:center;padding:34px;border:4px double var(--eduma-line)"><h1>Certificate of Completion</h1><h2>${cert.name}</h2><p>${cert.course}</p><p>Score: ${cert.score} · Date: ${cert.date}</p><p>ID: ${cert.id}</p><p>QR Verify: /Certificate-Verify.html?id=${cert.id}</p></div>`;
    });
    $("#printCert", root).addEventListener("click", () => window.print());
  }

  function renderAdmin() {
    const root = $("#adminApp");
    if (!root) return;
    root.innerHTML = `<div class="eduma-grid">
      ${["Users","Courses","Lessons","Quiz","Blog","Certificates","Analytics"].map((x, i) => `<section class="eduma-card span-4"><h2>${x}</h2><p class="muted">Manage ${x.toLowerCase()} data. Ready for Supabase/Firebase integration.</p><strong>${[1280,5,392,86,24,state.certificates.length,94][i]}</strong></section>`).join("")}
      <section class="eduma-card span-12"><h2>Backend-ready collections</h2><div class="table-wrap"><table class="eduma-table"><tr><th>Collection</th><th>Purpose</th><th>Status</th></tr>${["users","courses","lessons","quizzes","blog_posts","certificates","achievements","kaigo_scenarios"].map(x => `<tr><td>${x}</td><td>Structured JSON now, cloud DB later</td><td>Mock ready</td></tr>`).join("")}</table></div></section>
    </div>`;
  }

  function renderBlogSEO() {
    const root = $("#blogSeoApp");
    if (!root) return;
    root.innerHTML = (data.blogPosts || []).map((p) => `<article class="eduma-card"><p class="eduma-kicker">${p.category} · ${p.minutes} min</p><h2>${p.title}</h2><p class="muted">Tags: ${p.tags.join(", ")}</p><p>Artikel SEO-ready dengan FAQ, related posts, author box, breadcrumb, Article JSON-LD, dan internal link ke materi terkait.</p></article>`).join("");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m]);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.dataset.theme = state.theme || "light";
    renderDashboard();
    renderTutor();
    renderKaiwa();
    renderPronunciation();
    renderKanjiTrainer();
    renderCBT();
    renderKaigoSimulator();
    renderSRS();
    renderCertificate();
    renderAdmin();
    renderBlogSEO();
  });
})();
