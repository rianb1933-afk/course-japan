

<script>
function speak(t){
  if(!('speechSynthesis' in window)){alert('Browser tidak mendukung audio');return;}
  var u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=0.85;
  speechSynthesis.cancel();speechSynthesis.speak(u);
}
</script>

<script>
var Q=[
  {"q":"Bagaimana membentuk ～ている dari 食べる?","opts":["食べるている","食べている","食べteいる","食べます"],"a":1,"e":"食べる → bentuk て: 食べて → + いる = 食べている."},
  {"q":"'結婚しています' artinya?","opts":["Sedang menikah (upacara)","Sudah menikah (statusnya)","Akan menikah","Tidak menikah"],"a":1,"e":"結婚する = kata kerja sesaat. + ている = keadaan hasil: sudah/berstatus menikah."},
  {"q":"'今、ご飯を食べています' termasuk makna...","opts":["Keadaan hasil","Aksi sedang berlangsung","Kebiasaan","Perintah"],"a":1,"e":"今 (sekarang) + kata kerja durasi = aksi sedang berlangsung."},
  {"q":"'東京に住んでいます' artinya?","opts":["Sedang pindah ke Tokyo","Tinggal (menetap) di Tokyo","Pernah ke Tokyo","Akan ke Tokyo"],"a":1,"e":"住む + ている = keadaan menetap/tinggal, bukan 'sedang tinggal sebentar'."},
  {"q":"'毎朝、ジョギングをしています' termasuk makna...","opts":["Sedang berlangsung sekarang","Keadaan hasil","Kebiasaan/rutinitas","Larangan"],"a":2,"e":"毎朝 (setiap pagi) menandakan kebiasaan/rutinitas."},
  {"q":"'窓が開いています' artinya?","opts":["Jendela sedang membuka sendiri","Jendela dalam keadaan terbuka","Seseorang sedang membuka jendela","Jendela akan dibuka"],"a":1,"e":"開く = sesaat. + ている = keadaan: jendela (sudah) terbuka."},
  {"q":"Bentuk kasual/sehari-hari dari 食べている adalah?","opts":["食べてる","食べた","食べます","食べません"],"a":0,"e":"Dalam percakapan, い sering dihilangkan: 食べている → 食べてる."},
  {"q":"'知っています' artinya?","opts":["Sedang berusaha tahu","Tahu (sudah tahu)","Tidak tahu","Ingin tahu"],"a":1,"e":"知る = sesaat. 知っています = (sudah) tahu. Negatifnya: 知りません."},
  {"q":"Kata kerja mana yang + ている menghasilkan 'sedang berlangsung'?","opts":["結婚する","知る","読む","死ぬ"],"a":2,"e":"読む (membaca) punya durasi → 読んでいる = sedang membaca. Yang lain kata kerja sesaat."},
  {"q":"Bentuk sopan dari ～ている adalah?","opts":["～ています","～てる","～てある","～ておく"],"a":0,"e":"～ています adalah bentuk sopan (masu-form) dari ～ている."}
];
var ok=0,tot=0,qi=0,answered=false;
function renderQ(){
  if(qi>=Q.length){document.getElementById('quizBox').innerHTML='<div style="text-align:center;padding:1rem"><h3>Selesai! 🎉</h3><p>Skor akhir: '+ok+'/'+Q.length+'</p><button class="listen-btn" onclick="restartQ()" style="margin-top:.5rem">Ulangi</button></div>';return;}
  var q=Q[qi];answered=false;
  var html='<div style="font-weight:700;margin-bottom:.8rem">'+(qi+1)+'. '+q.q+'</div>';
  q.opts.forEach(function(o,i){html+='<button class="quiz-opt listen-btn" style="display:block;width:100%;text-align:left;margin:.35rem 0;background:var(--surface,#f5f5f5);color:var(--ink,#222)" onclick="ans('+i+')">'+o+'</button>';});
  html+='<div id="qexp" style="margin-top:.6rem;font-size:.9rem"></div>';
  document.getElementById('quizBox').innerHTML=html;
}
function ans(i){
  if(answered)return;answered=true;tot++;
  var q=Q[qi];var correct=i===q.a;if(correct)ok++;
  document.getElementById('okc').textContent=ok;
  document.getElementById('totc').textContent=tot;
  var btns=document.querySelectorAll('.quiz-opt');
  btns[q.a].style.background='#dcfce7';
  if(!correct)btns[i].style.background='#fee2e2';
  document.getElementById('qexp').innerHTML=(correct?'✅ Benar! ':'❌ ')+q.e+'<br><button class="listen-btn" onclick="nextQ()" style="margin-top:.5rem">Lanjut →</button>';
}
function nextQ(){qi++;renderQ();}
function restartQ(){qi=0;ok=0;tot=0;document.getElementById('okc').textContent=0;document.getElementById('totc').textContent=0;renderQ();}
renderQ();
</script>

<script src="../assets/pro-app.min.js" defer></script>
<script src="../assets/kyoto-theme.js" defer></script>
<script src="../assets/kyoto-navbar.min.js?v=20260623" defer></script>
<script src="../assets/np-xp.js" defer></script>
<script src="../assets/np-materi-progress.js" defer></script>
<script src="../assets/np-xp.js" defer></script>
<script src="../assets/np-materi-progress.js" defer></script>
<script src="../assets/np-xp.js" defer></script>
<script src="../assets/np-materi-progress.js" defer></script>
<script src="../assets/np-xp.js" defer></script>
<script src="../assets/np-materi-progress.js" defer></script>
<script src="../assets/np-xp.js" defer></script>
<script src="../assets/np-materi-progress.js" defer></script>
<script src="../assets/np-xp.js" defer></script>
<script src="../assets/np-materi-progress.js" defer></script>

<script>
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(r => {
      r.addEventListener('updatefound', () => {
        const w = r.installing;
        w.addEventListener('statechange', () => {
          if(w.state === 'installed' && navigator.serviceWorker.controller){
            sessionStorage.setItem('np-sw-refresh','1');w.postMessage({type:'SKIP_WAITING'});setTimeout(function(){location.reload()},1500);
          }
        });
      });
    }).catch(() => {});
  });
}
;(function(){try{if(sessionStorage.getItem('np-sw-refresh')){sessionStorage.removeItem('np-sw-refresh');var t=document.createElement('div');t.id='np-update-toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');t.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483000;background:#117E39;color:#fff;padding:11px 18px;border-radius:12px;font:600 13px/1.45 -apple-system,\'Segoe UI\',system-ui,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.28);max-width:min(92vw,430px);text-align:center;opacity:0;transition:opacity .35s ease';var wn=true;try{wn=!localStorage.getItem('np-sw-wn-seen')}catch(e){}if(wn){try{localStorage.setItem('np-sw-wn-seen','1')}catch(e){}}t.innerHTML='\u2705 Versi baru diterapkan \u2014 konten diperbarui otomatis'+(wn?'<br><a href=\"Changelog.html\" style=\"display:inline-block;margin-top:6px;color:#e6fff0;text-decoration:underline;font-size:12px;font-weight:700\">\u2728 Apa yang baru?</a>':'');var sh=function(){document.body.appendChild(t);requestAnimationFrame(function(){t.style.opacity='1'})};if(document.body)sh();else document.addEventListener('DOMContentLoaded',sh);setTimeout(function(){t.style.opacity='0'},4600);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t)},5100)}}catch(e){}})();
</script>
<div id="floatingTimer" style="position:fixed;bottom:5.5rem;left:1rem;z-index:150;background:white;border-radius:12px;padding:.75rem 1rem;box-shadow:0 4px 16px rgba(0,0,0,.12);border:.5px solid rgba(0,0,0,.08);min-width:200px;max-width:240px;transition:all .3s" onclick="this.style.display='none'" title="Klik untuk tutup">
  <div style="font-size:10px;font-weight:800;color:#be3428;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">⏱ Belajar hari ini</div>
  <div id="studyTimerWidget"></div>
</div>
<script>
(function initStudyTimer(){
  const TIMER_KEY = 'np-study-timer-' + new Date().toDateString();
  const GOAL_KEY  = 'np-study-goal';
  let timerSecs   = +localStorage.getItem(TIMER_KEY) || 0;
  let goalMins    = +localStorage.getItem(GOAL_KEY) || 30;
  let running     = false;
  let iv          = null;

  const el = document.getElementById('studyTimerWidget');
  if (!el) return;

  function fmt(s){ return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }
  function pct(){ return Math.min(100, Math.round(timerSecs / (goalMins*60) * 100)); }

  function render(){
    const p = pct();
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <div style="position:relative;width:42px;height:42px;flex-shrink:0">
          <svg width="42" height="42" style="transform:rotate(-90deg)">
            <circle cx="21" cy="21" r="18" fill="none" stroke="var(--border,#e0e0e0)" stroke-width="3"/>
            <circle cx="21" cy="21" r="18" fill="none" stroke="${p>=100?'#22c55e':'var(--red,#be3428)'}" stroke-width="3"
              stroke-dasharray="${2*Math.PI*18}" stroke-dashoffset="${2*Math.PI*18*(1-p/100)}"
              style="transition:stroke-dashoffset .5s"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${p>=100?'#22c55e':'var(--red,#be3428)'}">${p}%</div>
        </div>
        <div>
          <div style="font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--ink,#15161a)">${fmt(timerSecs)}</div>
          <div style="font-size:11px;color:var(--ink-soft,#888)">dari ${goalMins} mnt target</div>
        </div>
        <div style="display:flex;gap:.3rem;margin-left:auto">
          <button onclick="window._stToggle()" style="width:32px;height:32px;border-radius:50%;border:1.5px solid var(--border-mid,#d0d0d0);background:${running?'#be3428':'white'};color:${running?'#fff':'var(--ink,#15161a)'};font-size:14px;cursor:pointer;transition:all .2s">${running?'⏸':'▶'}</button>
          <button onclick="window._stReset()" style="width:32px;height:32px;border-radius:50%;border:1.5px solid var(--border-mid,#d0d0d0);background:white;color:var(--ink-soft,#888);font-size:12px;cursor:pointer">↺</button>
        </div>
      </div>
      ${p>=100?'<div style="font-size:12px;color:#22c55e;font-weight:700;margin-top:.35rem">🎉 Target hari ini tercapai!</div>':''}`;
  }

  window._stToggle = function(){
    running = !running;
    if(running){ iv = setInterval(()=>{ timerSecs++; localStorage.setItem(TIMER_KEY, timerSecs); render(); }, 1000); }
    else { clearInterval(iv); }
    render();
  };
  window._stReset = function(){
    clearInterval(iv); running=false; timerSecs=0; localStorage.setItem(TIMER_KEY,0); render();
  };

  render();
  // Auto-start when user is on a Materi page
  if(location.pathname.includes('/Materi/') && timerSecs === 0){ window._stToggle(); }
})();
</script>
