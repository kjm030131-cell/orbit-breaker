/* ================= settings modal + pause menu ================= */
var SHAKE_K=.6;try{SHAKE_K=+(localStorage.getItem("ob.shake")??.6)}catch(e){}
let setFromPause=false;
function segOn(id,v){document.querySelectorAll("#"+id+" button").forEach(b=>b.classList.toggle("on",(b.dataset.q||b.dataset.v)===String(v)))}
function setFps(on){try{localStorage.setItem("ob.fps",on?"1":"0")}catch(e){}
  if(on&&!PERF.hud){PERF.hud=document.createElement("div");PERF.hud.style.cssText="position:fixed;right:8px;bottom:8px;z-index:99;background:rgba(0,0,0,.75);color:#9f9;font:12px/1.5 monospace;padding:8px 10px;border-radius:4px;white-space:pre;pointer-events:none";document.body.appendChild(PERF.hud)}
  if(!on&&PERF.hud){PERF.hud.remove();PERF.hud=null}segOn("setFps",on?1:0)}
function openSettings(){setFromPause=!$("pause").hidden;$("settings").hidden=false;segOn("setQ",QUALITY);segOn("setShake",SHAKE_K);segOn("setFps",PERF.hud?1:0);
  $("volIn").value=AUD.vol;$("volV").textContent=Math.round(AUD.vol*100);sfx("uiok")}
function closeSettings(){if($("settings").hidden)return;$("settings").hidden=true;sfx("uiback")}
document.addEventListener("click",e=>{if(e.target.closest("[data-settings]"))openSettings()});
$("setClose").addEventListener("click",closeSettings);
$("settings").addEventListener("click",e=>{if(e.target.id==="settings")closeSettings()});
$("setQ").addEventListener("click",e=>{const b=e.target.closest("[data-q]");if(!b)return;setQuality(b.dataset.q);segOn("setQ",QUALITY);sfx("ui")});
$("setShake").addEventListener("click",e=>{const b=e.target.closest("[data-v]");if(!b)return;SHAKE_K=+b.dataset.v;try{localStorage.setItem("ob.shake",SHAKE_K)}catch(e){}segOn("setShake",SHAKE_K);sfx("ui")});
$("setFps").addEventListener("click",e=>{const b=e.target.closest("[data-v]");if(!b)return;setFps(b.dataset.v==="1");sfx("ui")});
$("volIn").addEventListener("input",()=>{AUD.vol=+$("volIn").value;$("volV").textContent=Math.round(AUD.vol*100);try{localStorage.setItem("ob.vol",AUD.vol)}catch(e){}
  if(AUD.ready&&AUD.on)MASTER.gain.setTargetAtTime(AUD.vol,AC.currentTime,.05)});
addEventListener("keydown",e=>{if(e.code==="Escape"&&!$("settings").hidden){e.stopImmediatePropagation();e.preventDefault();closeSettings()}},true);
try{if(localStorage.getItem("ob.fps")==="1")setTimeout(()=>setFps(true),0)}catch(e){}

// pause menu: resume, settings, end the sortie (ranked: counts as a finished run with the current score)
function resumePlay(){PAUSED=false;$("pause").hidden=true;muffle(false);lock()}
$("pResume").addEventListener("click",()=>{sfx("uiok");resumePlay()});
$("pQuitB").addEventListener("click",()=>{sfx("uiback");PAUSED=false;$("pause").hidden=true;muffle(false);
  if(VS){const loc=VS.local;vsClose();if(loc){S.started=false;S.ended=true}show(loc?"duel":"title");return}finishRun("quit")});
