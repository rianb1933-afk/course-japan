/* ── Kaigo Module Shared JS ──
   Used by all Materi/Kaigo-*.html pages.
   Provides: TTS speak(), vocab grid rendering, quiz engine, card toggles, service worker registration.
   Page-specific data (quiz arrays, vocab arrays) remain inline in each HTML file. */
(function(){
'use strict';

/* ── TTS ── */
function speak(t){
  if(!('speechSynthesis' in window))return;
  var u=new SpeechSynthesisUtterance(t);
  u.lang='ja-JP';u.rate=0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
window.speak=speak;

/* ── Vocab Grid Renderer ── */
function renderVocabGrid(containerId, vocabArray){
  var pg=document.getElementById(containerId);
  if(!pg||!vocabArray||!vocabArray.length)return;
  vocabArray.forEach(function(p){
    var d=document.createElement('div');d.className='pv';
    d.innerHTML='<div class="pv-jp">'+p[0]+'</div>'
      +'<div class="pv-ro">'+p[1]+'</div>'
      +'<div class="pv-id">🇮🇩 '+p[2]+'</div>';
    var btn=document.createElement('button');btn.className='pv-btn';btn.textContent='🔊';
    var txt=p[0];btn.onclick=function(){speak(txt);};
    d.appendChild(btn);pg.appendChild(d);
  });
}
window.renderVocabGrid=renderVocabGrid;

/* ── Quiz Engine ── */
function createQuiz(config){
  /*
    config = {
      questions: [...],     // array of {q, opts, a, e}
      containerId: 'qc',    // where to render
      scoreId: 'qs',        // score display element
      explanationId: 'qe',  // explanation element (auto-created if missing)
      nextBtnId: null,      // optional "next" button id
      resetBtnId: null,     // optional "reset" button id
      showLabels: false,    // if true, show A/B/C/D labels
      labelStyle: 'class',  // 'class' uses CSS classes, 'inline' uses inline styles
      onAnswer: null        // optional callback after answer
    }
  */
  var qi=0,ok=0,tot=0;
  var qs=config.questions;
  if(!qs||!qs.length)return;

  function rnd(){
    if(!qs.length)return;
    var q=qs[qi%qs.length];
    var c=document.getElementById(config.containerId);
    if(!c)return;

    var oo=document.createElement('div');
    oo.className='qopts';
    q.opts.forEach(function(o,i){
      var b=document.createElement('button');
      b.className='qopt';
      b.textContent=config.showLabels?(String.fromCharCode(65+i)+'. '+o):o;
      b.onclick=function(){ans(b,i,q.a,q.e);};
      oo.appendChild(b);
    });

    var bx=document.createElement('div');
    bx.className='qbox';
    var qq=document.createElement('div');
    qq.className='qq';
    qq.textContent=(qi%qs.length+1)+'/'+qs.length+' — '+q.q;
    var exId=config.explanationId||'qe';
    var ex=document.createElement('div');
    ex.className='qexp';ex.id=exId;
    bx.appendChild(qq);bx.appendChild(oo);bx.appendChild(ex);
    c.innerHTML='';c.appendChild(bx);
    updateScore();
  }

  function ans(b,c,a,e){
    var bs=b.parentNode.parentNode.querySelectorAll('.qopt');
    if(bs[a].dataset.d)return;
    bs[a].dataset.d='1';tot++;
    bs[a].classList.add('correct');
    if(c!==a)b.classList.add('wrong');else ok++;
    var exId=config.explanationId||'qe';
    var ex=document.getElementById(exId);
    if(ex){ex.textContent='💡 '+e;ex.classList.add('show');}
    updateScore();
    if(typeof config.onAnswer==='function')config.onAnswer(ok,tot);
  }

  function next(){qi=(qi+1)%qs.length;rnd();}
  function reset(){qi=0;ok=0;tot=0;rnd();}

  function updateScore(){
    var s=document.getElementById(config.scoreId);
    if(s)s.textContent='Skor: '+ok+'/'+tot;
  }

  // Wire up buttons
  if(config.nextBtnId){
    var nb=document.getElementById(config.nextBtnId);
    if(nb)nb.onclick=next;
  }
  if(config.resetBtnId){
    var rb=document.getElementById(config.resetBtnId);
    if(rb)rb.onclick=reset;
  }

  // Initial render
  rnd();

  return {next:next,reset:reset,score:function(){return{ok:ok,tot:tot}}};
}
window.createQuiz=createQuiz;

/* ── Auto-detect and render quiz data arrays ──
   Inline scripts define quiz data as global Q, QQ, or QKZ arrays.
   This auto-detection creates quiz instances using the createQuiz() API. */
/* Tombol "Soal Berikutnya" dan "Reset" di markup memanggil fungsi global —
   nQ()/rQ() pada kebanyakan halaman, nQkZ()/rQkZ() untuk kuis kedua, dan
   nextQ()/resetQ() di sebagian lain. Dulu fungsi itu didefinisikan oleh skrip
   inline tiap halaman; saat mesin kuis diekstrak ke berkas ini, definisinya
   ikut terbuang tapi atribut onclick-nya tetap tinggal. Akibatnya menekan
   "Soal Berikutnya" hanya melempar ReferenceError, dan pembaca terjebak di
   soal pertama — 93 dari 100 halaman Kaigo.

   Alias dipasang HANYA bila belum ada: banyak halaman non-Kaigo masih punya
   nextQ()/resetQ() sendiri, dan menimpanya akan merusak kuis mereka. */
function exposeControls(handle, names){
  names.forEach(function(pair){
    if(typeof window[pair[0]]!=='function') window[pair[0]]=handle.next;
    if(typeof window[pair[1]]!=='function') window[pair[1]]=handle.reset;
  });
}

/* Halaman yang sudah punya renderer sendiri untuk sebuah kuis ditandai oleh
   adanya fungsi kontrolnya. Kalau nQkZ() sudah ada, halaman itu menggambar
   kuis QKZ-nya sendiri dan mesin ini tidak boleh mengambil alih — dua
   renderer pada satu wadah akan saling menimpa. */
function alreadyHandled(names){
  return names.some(function(n){ return typeof window[n]==='function'; });
}

document.addEventListener('DOMContentLoaded',function(){
  // Standard quiz (uses 'qc' container, 'qs' score)
  if(typeof Q!=='undefined'&&Q&&Q.length&&!alreadyHandled(['nQ','nextQ'])){
    exposeControls(
      createQuiz({questions:Q,containerId:'qc',scoreId:'qs',explanationId:'qe'}),
      [['nQ','rQ'],['nextQ','resetQ']]);
  }
  // QQ variant (used in some files like ADL-Guide)
  if(typeof QQ!=='undefined'&&QQ&&QQ.length&&!alreadyHandled(['nextQ','nQ'])){
    exposeControls(
      createQuiz({questions:QQ,containerId:'qc',scoreId:'qs',explanationId:'qe',showLabels:true}),
      [['nextQ','resetQ'],['nQ','rQ']]);
  }
  // QKZ variant (second quiz, uses 'qkZ' container, 'qsZ' score)
  if(typeof QKZ!=='undefined'&&QKZ&&QKZ.length&&!alreadyHandled(['nQkZ'])){
    exposeControls(
      createQuiz({questions:QKZ,containerId:'qkZ',scoreId:'qsZ',explanationId:'qeZ',showLabels:true}),
      [['nQkZ','rQkZ'],['nextQ','resetQ']]);
  }
});

/* ── Card Toggle (expandable .card elements) ── */
document.addEventListener('click',function(e){
  var card=e.target.closest('.card');
  if(card)card.classList.toggle('open');
});

/* ── Dark Mode Toggle Button ──
   kyoto-theme.js is loaded by the HTML pages and provides toggleTheme().
   We inject a toggle button so users can switch dark/light mode on Kaigo pages. */
document.addEventListener('DOMContentLoaded',function(){
  // Only add if no theme toggle already exists on the page
  if(document.querySelector('.theme-toggle, [data-theme-toggle]'))return;
  var btn=document.createElement('button');
  btn.className='kaigo-theme-toggle';
  btn.setAttribute('aria-label','Toggle dark mode');
  btn.setAttribute('data-theme-toggle','');
  btn.title='Mode Gelap/Terang';
  btn.textContent='🌙';
  btn.style.cssText='position:fixed;top:12px;right:12px;z-index:9999;background:var(--white,#fff);border:1px solid var(--border-mid,#ddd);border-radius:50%;width:40px;height:40px;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;transition:all .2s';
  btn.onmouseover=function(){this.style.transform='scale(1.1)';};
  btn.onmouseout=function(){this.style.transform='';};
  document.body.appendChild(btn);
  // Wire up to kyoto-theme.js toggle
  if(typeof toggleTheme==='function'){
    btn.addEventListener('click',toggleTheme);
  }else{
    // Fallback: toggle data-theme attribute directly
    btn.addEventListener('click',function(){
      var isDark=document.documentElement.getAttribute('data-theme')==='dark';
      document.documentElement.setAttribute('data-theme',isDark?'':'dark');
      localStorage.setItem('kyoto-theme',isDark?'light':'dark');
      this.textContent=isDark?'🌙':'☀️';
    });
  }
  // Sync icon with current theme
  var isDark=document.documentElement.getAttribute('data-theme')==='dark';
  if(isDark)btn.textContent='☀️';
});

/* ── Service Worker Registration ── */
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('/sw.js').then(function(r){
      r.addEventListener('updatefound',function(){
        var w=r.installing;
        w.addEventListener('statechange',function(){
          if(w.state==='installed'&&navigator.serviceWorker.controller){
            if(confirm('Versi baru NihongoPro tersedia! Muat ulang?'))location.reload();
          }
        });
      });
    }).catch(function(){});
  });
}

})();
