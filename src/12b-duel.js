/* ================= 1:1 showdown ================= */
// Two PCs join a 4-digit room on the ranking server, start at the same server time and race the same 120s rules.
// Scores are exchanged every second; nothing here touches the ranking or the 3-sortie count.
let DUEL=null,DUELDONE=false,duelPoll=0,duelPush=0,duelOff=0,DMODE="vs";
$("dModes").addEventListener("click",e=>{const b=e.target.closest("[data-dm]");if(!b||DUEL||VS)return;
  if(!$("dName").value.trim()){$("dErr1").textContent="이름을 먼저 입력하세요.";sfx("deny");$("dName").focus();return}
  DMODE=b.dataset.dm;sfx("ui");[...$("dModes").children].forEach(x=>x.classList.toggle("sel",x===b));$("dUnitField").hidden=DMODE==="vs";
  $("dModeNote").textContent=(DMODE==="vs"?"기체 대전":"점수 대결")+" · 방을 만들거나, 상대 방에 참가하세요";$("dErr").textContent=$("dErr1").textContent="";vsLobby();dxStep(2)});
const dUnitBtns=()=>{$("dUnits").innerHTML=UNIT_KEYS.map(k=>`<button type="button" data-du="${k}" class="${k===G.unit?"sel":""}" style="--uc:${UNITS[k].css}">${UNITS[k].name.replace(" 유닛","")}</button>`).join("")};
$("dUnits").addEventListener("click",e=>{const b=e.target.closest("[data-du]");if(!b||VS&&!["wait","lobby"].includes(VS.phase))return;G.unit=b.dataset.du;buildBits(G.unit);sfx("ui");dUnitBtns();if(VS){vsLoadout();vsLobby()}});
const dFrameBtns=()=>{$("dFrames").innerHTML=Object.keys(FRAMES).map(k=>{const F=FRAMES[k];return `<button type="button" data-df="${k}" class="${P&&P.frame===k?"sel":""}" ${F.obj?"":"disabled"}>${F.name}${F.obj?"":" · 수신 중"}</button>`}).join("")};
$("dFrames").addEventListener("click",e=>{const b=e.target.closest("[data-df]");if(!b||b.disabled||VS&&!["wait","lobby"].includes(VS.phase))return;if(setFrame(b.dataset.df)){sfx("ui");PILOT.frame=b.dataset.df;buildBits(G.unit);if(VS)vsLoadout()}dFrameBtns()});
function duelOpen(){dUnitBtns();dFrameBtns();vsLobby();if(!$("dName").value&&PILOT.name)$("dName").value=PILOT.name;
  $("dErr").textContent=SERVER?"":"쇼다운은 배포된 서버 버전(arclight-game.pages.dev)에서만 가능합니다.";
  ["dCreate","dJoin"].forEach(id=>$(id).disabled=!SERVER&&!window.PVP_URL);if(!DUEL)duelRoomView(null);dxStep(VS&&!VS.local||DUEL?3:1)}
function duelErr(m){$("dErr").textContent=m;sfx("deny")}
function duelRoomView(v){
  $("dCodeBig").textContent=v?v.code.split("").join(" "):"— — — —";
  $("dA").textContent=v&&v.a.name||"—";$("dB").textContent=v&&v.b.name||"대기 중…";
  $("dStatus").textContent=!v?"방 없음":!v.b.name?"상대 기다리는 중":"매칭 완료";
  $("dReady").hidden=!(v&&v.b.name&&DUEL&&!DUEL.ready);
  $("dNote").textContent=!v?"방을 만들면 4자리 번호가 나옵니다. 옆 PC에서 그 번호로 참가하세요.":!v.b.name?"옆 PC에서 1:1 쇼다운 → 방 번호 입력 → 참가.":DUEL&&DUEL.ready?"준비 완료. 시작 신호를 기다리세요.":"두 사람 모두 [준비 완료]를 누르면 카운트다운 후 동시에 출격합니다.";
}
async function duelCreate(){const name=$("dName").value.trim();if(!name)return duelErr("이름을 입력하세요.");
  if(DMODE==="vs"){$("dErr").textContent="";sfx("uiok");vsOpen(String(1000+Math.floor(Math.random()*9000)),name,true);return}
  try{const v=await api("duel/create",{name});duelStart(v,"a",name)}catch(e){duelErr(e.message)}}
async function duelJoin(){const name=$("dName").value.trim(),code=$("dCode").value.trim();if(!name)return duelErr("이름을 입력하세요.");if(!/^\d{4}$/.test(code))return duelErr("방 번호 4자리를 입력하세요.");
  if(DMODE==="vs"){$("dErr").textContent="";sfx("uiok");vsOpen(code,name);return}
  try{const v=await api("duel/join",{name,code});duelStart(v,"b",name)}catch(e){duelErr(e.message)}}
function duelStart(v,side,name){$("dErr").textContent="";sfx("uiok");
  DUEL={code:v.code,side,name,opp:side==="a"?"b":"a",v,ready:false,started:false,oppScore:0,oppState:"wait",oppName:""};duelOff=v.now-Date.now();
  duelRoomView(v);clearInterval(duelPoll);duelPoll=setInterval(duelTick,800)}
async function duelTick(){if(!DUEL)return;
  try{const v=DUEL.started?await api("duel/push",{code:DUEL.code,side:DUEL.side,score:S.score,state:S.ended?(DUEL.lost?"lost":"done"):"play"}):await api("duel/state?code="+DUEL.code);
    duelOff=v.now-Date.now();DUEL.v=v;const o=v[DUEL.opp];DUEL.oppScore=o.score||0;DUEL.oppState=o.state;DUEL.oppName=o.name||"";
    if(!DUEL.started){duelRoomView(v);if(v.startAt)duelCountdown(v.startAt)}
    if(DUELDONE)duelResult()}catch(e){}}
$("dCreate").addEventListener("click",duelCreate);$("dJoin").addEventListener("click",duelJoin);
$("dCode").addEventListener("input",()=>{$("dCode").value=$("dCode").value.replace(/\D/g,"")});
$("dReady").addEventListener("click",()=>{if(VS){if(!P||!FRAMES[VS.oppFrame||"mk2"].gltf){duelErr("기체 모델을 불러오는 중입니다. 잠시 기다려 주세요.");return;}vsSend({t:"ready",ready:!VS.ready});sfx("uiok");return}if(!DUEL)return;DUEL.ready=true;sfx("uiok");lock();duelPrepare();duelRoomView(DUEL.v)});
function duelLeave(){sfx("uiback");if(VS)vsClose();if(DUEL&&!DUEL.started)api("duel/push",{code:DUEL.code,side:DUEL.side,score:0,state:"left"}).catch(()=>{});
  clearInterval(duelPoll);DUEL=null;show("title")}
// park the mech in the arena, frozen until the shared start time
function duelPrepare(){PILOT.name=DUEL.name;restart();S.yaw=S.face;S.pitch=-.08;
  $("pName").textContent=DUEL.name;$("pDept").textContent="1:1 SHOWDOWN";$("pSortie").textContent="—";
  const U=UNITS[G.unit];document.documentElement.style.setProperty("--uc",U.css);$("unitName").textContent=U.r;$("specName").textContent=U.f;$("uIconR").src=`ui/r_${G.unit}.webp`;$("uIconF").src=`ui/f_${G.unit}.webp`;buildBits(G.unit);
  $("duelBar").hidden=false;$("duOpN").textContent=DUEL.oppName||"상대";show("play");S.started=false}
function duelCountdown(startAt){if(!DUEL||DUEL.started)return;const left=(startAt-(Date.now()+duelOff))/1000;
  const t=Math.ceil(left);$("dCount").textContent=left>0?t:"";
  if(SCREEN==="play"&&left>0&&t<=5&&DUEL.lastT!==t){DUEL.lastT=t;const b=$("phase");$("phaseName").textContent=String(t);$("phaseSub").textContent="SHOWDOWN · "+DUEL.name+" VS "+(DUEL.oppName||"상대");b.classList.remove("on");void b.offsetWidth;b.classList.add("on");sfx("tick")}
  if(left<=0&&DUEL.ready){DUEL.started=true;if(SCREEN!=="play")duelPrepare();Object.assign(S,{score:0,kills:0,best:0,time:120});G.kc=0;G.maxKC=0;S.started=true;sfx("go");phaseBanner({name:"쇼다운 개시!",sub:"SHOWDOWN · 120s"});music("battle")}
  else if(left<=0&&!DUEL.ready){DUEL.started=true;DUEL.ready=true;duelPrepare();Object.assign(S,{score:0,kills:0,best:0,time:120});S.started=true;sfx("go");phaseBanner({name:"쇼다운 개시!",sub:"클릭하면 마우스가 고정됩니다"});music("battle")}}
setInterval(()=>{if(DUEL&&!DUEL.started&&DUEL.v&&DUEL.v.startAt)duelCountdown(DUEL.v.startAt)},100);
function duelHud(){if(!DUEL||SCREEN!=="play")return;const me=S.score,op=DUEL.oppScore,d=me-op;
  setT("duMe",me.toLocaleString());setT("duOp",op.toLocaleString());setT("duOpN",(DUEL.oppName||"상대")+(DUEL.oppState==="lost"?" · 격추":DUEL.oppState==="done"?" · 종료":DUEL.oppState==="left"?" · 이탈":""));
  setT("duLead",d>0?"+"+d.toLocaleString():d<0?d.toLocaleString():"VS");setC("duLead","win",d>0);setC("duLead","lose",d<0)}
function duelFinish(lost,bonus,rate){DUEL.lost=lost;DUELDONE=true;$("duelBar").hidden=true;
  music(null);sfx("end");duelTick();
  $("rScore").textContent=S.score.toLocaleString();$("rKills").textContent=S.kills||0;$("rCombo").textContent=G.maxKC;$("rChain").textContent=S.best;$("rBest").textContent="—";
  $("rSortie").textContent="1:1 SHOWDOWN · 비순위";$("rDebrief").innerHTML="";
  const ag=$("againBtn");ag.disabled=false;ag.hidden=false;ag.firstChild.textContent="쇼다운 로비로 ";
  duelResult();show("result");setTimeout(()=>ag.focus(),120)}
function duelResult(){if(!DUEL)return;const me=S.score,op=DUEL.oppScore,oDone=["done","lost","left"].includes(DUEL.oppState);
  const head=!oDone?`<span class="note">상대(${esc(DUEL.oppName)}) 아직 비행 중 · 현재 ${op.toLocaleString()}점</span>`:
    me>op?'<span class="pb">승리</span>':me<op?'<span class="pb" style="background:var(--red);color:#fff">패배</span>':'<span class="pb">무승부</span>';
  $("rPb").innerHTML=head+` <span class="note">${esc(DUEL.name)} ${me.toLocaleString()} : ${op.toLocaleString()} ${esc(DUEL.oppName)}</span>`;
  $("rRank").innerHTML=oDone?`<span class="note">쇼다운 결과는 순위표에 반영되지 않습니다.</span>`:'<span class="note">상대가 끝나면 결과가 확정됩니다…</span>';
  if(oDone){clearInterval(duelPoll);setTimeout(()=>{DUEL=null},50)}}
