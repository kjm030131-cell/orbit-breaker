/* ================= records (shared db, local fallback) ================= */
const MAX_SORTIE=3,LS_KEY="orbitbreaker.players.v1";
let DB=null,BOARD=[];
// SERVER: the deployed build talks to the Cloudflare ranking API (authoritative sortie count + best score)
let SERVER=false,RUN=null,MYRANK=null,TOTAL=0;
const api=async(path,body)=>{const r=await fetch("api/"+path,body?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}:{cache:"no-store"});let j={};try{j=await r.json()}catch(e){}if(!r.ok)throw Object.assign(new Error(j.error||("HTTP "+r.status)),{status:r.status});return j};
function applyBoard(j){if(!j||!Array.isArray(j.rows))return;BOARD=j.rows;MYRANK=j.me||null;TOTAL=j.total||j.rows.length;renderBoards()}
async function pollBoard(){if(!SERVER)return;try{applyBoard(await api("board"+(PILOT.sid?"?sid="+PILOT.sid:"")))}catch(e){}}
const PILOT={name:"",dept:"",sid:"",rec:null};
function lsAll(){try{return JSON.parse(localStorage.getItem(LS_KEY)||"{}")||{}}catch(e){return {}}}
function lsSave(m){try{localStorage.setItem(LS_KEY,JSON.stringify(m))}catch(e){}}
function boardFromLocal(){return Object.values(lsAll()).filter(r=>r&&r.best>0).sort((a,b)=>b.best-a.best).slice(0,100)}
async function getRec(sid){
  if(SERVER){try{const j=await api("player?sid="+sid);return j.exists?{...j}:null}catch(e){return null}}
  if(DB){try{const s=await DB.doc("players/s"+sid).get();return s.exists?{...s.data()}:null}catch(e){console.warn(e)}}
  const r=lsAll()["s"+sid];return r?{...r}:null;
}
async function putRec(rec){
  if(SERVER)return;
  const m=lsAll();m["s"+rec.sid]=rec;lsSave(m);
  if(DB){try{await DB.doc("players/s"+rec.sid).set(rec);return}catch(e){console.warn(e);if(e&&e.code==="unavailable"){await wait(600);try{await DB.doc("players/s"+rec.sid).set(rec);return}catch(_){}}}}
  if(!DB){BOARD=boardFromLocal();renderBoards()}
}
function setNet(on){const n=$("netStatus");n.classList.toggle("off",!on);n.lastChild.textContent=on?"기록 서버 연결됨 · 모든 PC 순위 공유":"오프라인 모드 · 이 PC에만 기록됩니다"}
(async()=>{
  try{const j=await api("board");if(j&&Array.isArray(j.rows)){SERVER=true;setNet(true);applyBoard(j);setInterval(pollBoard,8000);return}}catch(e){}
  let d=null;try{d=window.claude&&window.claude.use?await window.claude.use("db"):null}catch(e){d=null}
  if(!d){setNet(false);BOARD=boardFromLocal();renderBoards();return}
  DB=d;setNet(true);
  DB.collection("players").orderBy("best","desc").limit(100).onSnapshot(
    s=>{BOARD=s.docs.map(x=>x.data()).filter(r=>r&&r.best>0);renderBoards()},
    e=>{console.warn(e);DB=null;setNet(false);BOARD=boardFromLocal();renderBoards()});
})();

/* ================= boards ================= */
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c])}
function rowsHTML(rows,start){return rows.map((r,i)=>{const n=start+i+1;
  return `<tr class="${n<=3?"p"+n:""} ${r.me||(r.sid&&r.sid===PILOT.sid)?"me":""}"><td class="r">${n<=3?`<img class="medal" src="ui/medal${n}.webp" alt="${n}">`:String(n).padStart(2,"0")}</td><td>${r.boss?BOSS_BADGE:""}${esc(r.name)}${r.sidm?`<span class="ut"> ${esc(r.sidm)}</span>`:""}${r.unit&&U_SHORT[r.unit]?`<span class="ut"> · ${U_SHORT[r.unit]}</span>`:""}</td><td class="d">${esc(r.dept)}</td><td class="s">${(r.best||0).toLocaleString()}</td></tr>`}).join("")}
function tableHTML(rows,extra){
  if(!rows.length)return '<div class="empty">아직 작전 기록이 없습니다.<br>첫 번째 파일럿이 되어 보세요.</div>';
  return `<table class="board"><thead><tr><th>#</th><th>파일럿</th><th>학과</th><th class="s">최고점</th></tr></thead><tbody>${rowsHTML(rows,0)}${extra||""}</tbody></table>`}
function renderBoards(){
  { // title leaderboard: always 10 slots; rows whose best changed since the last render flash once
    const prev=renderBoards.prev||{},seen={};
    let h="";for(let n=1;n<=10;n++){const r=BOARD[n-1];
      if(!r){h+=`<div class="lbr empty"><span class="r">${String(n).padStart(2,"0")}</span><span class="nm">—</span><span class="dp"></span><span class="sc">—</span></div>`;continue}
      const key=(r.sid||r.name)+"",best=r.best||0;seen[key]=best;const fl=renderBoards.prev&&prev[key]!==best;
      h+=`<div class="lbr ${n<=3?"p"+n:""} ${r.me||(r.sid&&r.sid===PILOT.sid)?"me":""} ${fl?"flash":""}"><span class="r">${n<=3?`<img class="medal" src="ui/medal${n}.webp" alt="${n}">`:String(n).padStart(2,"0")}</span><span class="nm">${r.boss?BOSS_BADGE:""}${esc(r.name)}</span><span class="dp">${esc(r.dept)}</span><span class="sc">${best.toLocaleString()}</span></div>`}
    renderBoards.prev=seen;$("miniBoard").innerHTML=h;
    $("miniCount").textContent=BOARD.length?BOARD.length+"명 참가":"첫 기록에 도전하세요";}
  $("fullBoard").innerHTML=tableHTML(BOARD);$("rankCount").textContent=BOARD.length+"명 참가";
  const me=BOARD.findIndex(r=>r.me||(r.sid&&r.sid===PILOT.sid));
  $("rBoard").innerHTML=tableHTML(BOARD.slice(0,10),me>=10?`<tr><td colspan="4" class="d" style="text-align:center;padding:4px">⋯</td></tr>`+rowsHTML([BOARD[me]],me):"");
  if(SCREEN==="result")updateRankLine();
}
function updateRankLine(){
  const best=PILOT.rec?PILOT.rec.best||0:0;const i=BOARD.findIndex(x=>x.me||(x.sid&&x.sid===PILOT.sid));
  const n=SERVER&&MYRANK?MYRANK.rank:i>=0?i+1:BOARD.filter(r=>r.best>best).length+1;const total=Math.max(SERVER?TOTAL:BOARD.length,n);
  $("rRank").innerHTML=best>0?`전체 <b>${n}</b>위 <span class="note">/ ${total}명 · 개인 최고점 기준</span>`:'<span class="note">점수가 0점이라 순위에 오르지 않았습니다.</span>';
}

/* ================= screens ================= */
const SCR={title:"scrTitle",form:"scrForm",load:"scrLoad",duel:"scrDuel",brief:"scrBrief",result:"scrResult",rank:"scrRank",credits:"scrCredits"};
let briefMode="manual",menuSel=0;
const menuItems=[...document.querySelectorAll("#menu .mi")];
function markMenu(){menuItems.forEach((m,i)=>m.classList.toggle("sel",i===menuSel))}
function show(name){
  const prev=SCREEN;
  for(const k in SCR)$(SCR[k]).hidden=k!==name;
  $("hud").hidden=name!=="play";
  SCREEN=name;S.demo=!(name==="play"||name==="launch");
  if(name==="title"){markMenu();PILOT.sid=PILOT.sid;if(TITLE)titleEnter()}
  if(name==="form"){if(prev==="title"){["fName","fDept","fSid"].forEach(id=>$(id).value="");$("fErr").textContent="";meter(null)}setTimeout(()=>$("fName").focus(),60)}
  if(name==="load"){renderUnits();setTimeout(()=>$("loadGo").focus(),60)}
  if(name==="brief"){const l=briefMode==="launch";$("briefStep").textContent=l?"3 / 3":"조작법";$("launchBtn").hidden=!l;$("launchNote").hidden=!l;setTimeout(()=>(l?$("launchBtn"):$("briefBack")).focus(),60)}
  if(name==="rank")renderBoards();
  if(typeof creditsShow==="function")creditsShow(name==="credits");
  if(name==="duel")duelOpen();
  if(["title","form","load","duel","brief","rank","credits"].includes(name)){music("title");muffle(false)}
  if(name==="launch")music(null);
  if(name==="play")music("battle");
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(!b)return;sfx(b.dataset.go==="title"?"uiback":"uiok");if(b.dataset.go==="brief")briefMode="manual";show(b.dataset.go)});
menuItems.forEach((m,i)=>m.addEventListener("mouseenter",()=>{if(menuSel!==i)sfx("ui");menuSel=i;markMenu()}));
document.querySelectorAll("[data-sound]").forEach(b=>b.addEventListener("click",()=>{ac();setSound(!AUD.on)}));setSound(AUD.on);
UI.key=function(e){
  if(SCREEN==="launch"){if(!e.repeat&&["Space","Enter","Escape"].includes(e.code)){e.preventDefault();skipCine()}return}
  if(SCREEN==="title"){
    if(e.code==="ArrowDown"||e.code==="ArrowUp"){menuSel=(menuSel+(e.code==="ArrowDown"?1:menuItems.length-1))%menuItems.length;markMenu();sfx("ui");e.preventDefault()}
    else if(e.code==="Enter"){menuItems[menuSel].click();e.preventDefault()}
    else if(/^Digit[1234]$/.test(e.code)){menuItems[+e.code.slice(5)-1].click()}
  }else if(SCREEN==="load"&&/^(Arrow(Left|Right|Up|Down)|Digit[1-4])$/.test(e.code)){e.preventDefault();
    const i=UNIT_KEYS.indexOf(G.unit);let j=i;
    if(e.code.startsWith("Digit"))j=+e.code.slice(5)-1;else if(e.code==="ArrowRight")j=(i+1)%4;else if(e.code==="ArrowLeft")j=(i+3)%4;else if(e.code==="ArrowDown")j=(i+2)%4;else j=(i+2)%4;
    pickUnit(UNIT_KEYS[j])
  }else if(e.code==="Escape"){if(SCREEN!=="play"&&SCREEN!=="launch")sfx("uiback");
    if(SCREEN==="form"||SCREEN==="rank"||SCREEN==="credits")show("title");
    else if(SCREEN==="duel")duelBack();
    else if(SCREEN==="load")show("form");
    else if(SCREEN==="brief")show(briefMode==="launch"?"load":"title");
    else if(SCREEN==="result")show("title");
  }else if(e.code==="Enter"){
    if(SCREEN==="brief"&&briefMode==="launch"){e.preventDefault();launch()}
    else if(SCREEN==="load"&&document.activeElement!==$("loadBack")){e.preventDefault();$("loadGo").click()}
    else if(SCREEN==="result"&&!$("againBtn").disabled&&document.activeElement!==$("againBtn")){e.preventDefault();$("againBtn").click()}
  }
};

/* ================= pilot form ================= */
const fSid=$("fSid");let lookupT=0;
function meter(rec){const used=rec?rec.attempts||0:0,ok=fSid.value.length>=8;
  [...$("sortieMeter").children].forEach((i,k)=>i.classList.toggle("used",!ok||k>=MAX_SORTIE-used));
  $("sortieTxt").textContent=ok?`${Math.max(0,MAX_SORTIE-used)} / ${MAX_SORTIE}`:"학번 입력 후 표시";
  $("fNote").textContent=rec?`기존 기록 · 최고 ${(rec.best||0).toLocaleString()}점 · ${used}회 출격`:"같은 학번으로 다시 등록하면 이전 기록과 출격 횟수가 이어집니다."}
async function lookup(){const sid=fSid.value;if(sid.length<8){meter(null);return}
  const rec=await getRec(sid);if(fSid.value!==sid)return;meter(rec);
  if(rec){if(!$("fName").value)$("fName").value=rec.name||"";if(!$("fDept").value)$("fDept").value=rec.dept||""}}
fSid.addEventListener("input",()=>{const v=fSid.value.replace(/\D/g,"");if(v!==fSid.value)fSid.value=v;clearTimeout(lookupT);lookupT=setTimeout(lookup,250)});
["fName","fDept","fSid"].forEach(id=>$(id).addEventListener("input",()=>{$("fErr").textContent=""}));
$("pilotForm").addEventListener("submit",async e=>{
  e.preventDefault();const name=$("fName").value.trim(),dept=$("fDept").value.trim(),sid=fSid.value.trim();
  const err=m=>{$("fErr").textContent=m;sfx("deny")};
  if(!name){$("fName").focus();return err("이름을 입력하세요.")}
  if(!dept){$("fDept").focus();return err("학과를 입력하세요.")}
  if(!/^\d{8,10}$/.test(sid)){fSid.focus();return err("학번은 숫자 8~10자리로 입력하세요.")}
  err("");$("fGo").disabled=true;const rec=await getRec(sid);$("fGo").disabled=false;
  if(rec&&rec.name&&rec.name!==name)return err(`이 학번은 '${rec.name}' 이름으로 등록돼 있습니다. 학번을 다시 확인하세요.`);
  if(rec&&(rec.attempts||0)>=MAX_SORTIE)return err("이 학번은 출격 3회를 모두 사용했습니다.");
  Object.assign(PILOT,{name,dept,sid,rec:rec||{name,dept,sid,best:0,attempts:0,chain:0,kills:0}});
  if(rec&&rec.unit&&UNITS[rec.unit])G.unit=rec.unit;
  sfx("uiok");show("load");
});

/* ================= loadout ================= */
const U_SHORT={mega:"메가",boost:"부스트",pods:"포드",missile:"미사일",shield:"실드"};
function renderFrames(){if(P&&FRAMES[P.frame]){$("pvName").textContent=FRAMES[P.frame].name;$("pvSub").textContent=FRAMES[P.frame].kr}$("frames").innerHTML=Object.keys(FRAMES).map(k=>{const F=FRAMES[k];return `<button type="button" class="fr ${P&&P.frame===k?"sel":""}" data-frame="${k}" ${F.obj?"":"disabled"}><b>${F.name}</b><span>${F.obj?F.kr:"기체 데이터 수신 중…"}</span></button>`}).join("")}
function onFrameLoaded(){if(SCREEN==="load")renderFrames();if(SCREEN==="duel"){dFrameBtns();if(VS)vsLobby();}const want=PILOT.frame;if(want&&FRAMES[want].obj&&(!P||P.frame!==want))setFrame(want)}
$("frames").addEventListener("click",e=>{const b=e.target.closest("[data-frame]");if(!b||b.disabled)return;if(setFrame(b.dataset.frame)){sfx("ui");PILOT.frame=b.dataset.frame;buildBits(G.unit)}renderFrames()});
function renderUnits(){renderFrames();
  $("units").innerHTML=UNIT_KEYS.map((k,i)=>{const u=UNITS[k];return `<button type="button" class="unit ${k===G.unit?"sel":""}" data-unit="${k}" style="--uc:${u.css}"><img src="ui/u_${k}.webp" alt=""><span class="k">${i+1}</span><span class="un">${u.name}</span><span class="ue">${u.en}</span></button>`}).join("");
  const u=UNITS[G.unit];$("uName").textContent=u.name;$("uEn").textContent=u.en;$("uEn").style.color=u.css;
  $("uRi").src=`ui/r_${G.unit}.webp`;$("uFi").src=`ui/f_${G.unit}.webp`;$("uR").textContent="R · "+u.r+` · ${u.cd}초`;$("uRd").textContent=u.rd;$("uF").textContent="F · "+u.f;$("uFd").textContent=u.fd;$("uP").textContent=u.p;
}
function pickUnit(k){if(!UNITS[k])return;if(k!==G.unit)sfx("ui");G.unit=k;buildBits(k);renderUnits();$("loadGo").focus()}
$("units").addEventListener("click",e=>{const b=e.target.closest("[data-unit]");if(b)pickUnit(b.dataset.unit)});
$("loadGo").addEventListener("click",()=>{sfx("uiok");PILOT.unit=G.unit;PILOT.frame=P?P.frame:"mk2";briefMode="launch";show("brief")});
$("loadBack").addEventListener("click",()=>{sfx("uiback");show("form")});

/* ================= launch / finish ================= */
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let launching=false;
async function launch(){
  if(launching||!P||!PILOT.rec||PILOT.rec.attempts>=MAX_SORTIE)return;launching=true;
  lock();
  const rec=PILOT.rec;
  if(SERVER){try{const j=await api("start",{sid:PILOT.sid,name:PILOT.name,dept:PILOT.dept,unit:G.unit,frame:P?P.frame:"mk2"});RUN=j.runId;rec.attempts=j.attempts-1;rec.best=Math.max(rec.best||0,j.best||0)}
    catch(e){launching=false;if(document.pointerLockElement)document.exitPointerLock();sfx("deny");const n=$("launchNote");n.textContent=e.status?e.message:"기록 서버에 연결할 수 없습니다. 네트워크를 확인하세요.";n.style.color="var(--red)";return}}
  rec.attempts=(rec.attempts||0)+1;rec.name=PILOT.name;rec.dept=PILOT.dept;rec.sid=PILOT.sid;rec.at=new Date().toISOString();
  putRec({...rec});
  restart();S.yaw=S.face;S.pitch=-.08;
  const U=UNITS[G.unit];document.documentElement.style.setProperty("--uc",U.css);$("unitName").textContent=U.r;$("specName").textContent=U.f;$("uIconR").src=`ui/r_${G.unit}.webp`;$("uIconF").src=`ui/f_${G.unit}.webp`;buildBits(G.unit);
  $("pName").textContent=PILOT.name;$("pDept").textContent=PILOT.dept;$("pSortie").textContent=rec.attempts+"/"+MAX_SORTIE;
  show("launch");
  await playCatapult();
  show("play");S.started=true;launching=false;phaseBanner(PHASES[0]);sfx("phase");
  setTimeout(()=>{if(SCREEN==="play"&&!S.ended&&!TUT.on)cutin(`기체 1기 · 장갑 ${HP_MAX}`,"장갑이 0이 되면 이번 출격 종료")},2600);
}
function debriefLine(lost,score){const n=S.kills||0;
  /* 10/29: the voiced closing lines (vo_op19/20/21, played from 10f-vo.js) open the debrief word for word */
  if(lost)return `우리엘 1, 기체 반응 소실… 회수정 보냈습니다. 오늘 밤 유성 ${n}개. 다음엔 조준선 깜빡임을 놓치지 마세요.`;
  if(BOSS.dead)return `작전 종료입니다. 귀환하세요, 우리엘 1. …지상은 오늘 역대급 유성우랍니다. 유성 ${n}개.`;
  if(S.time<=0&&score<25000)return `방위선 사수 완료. 수고하셨습니다, 우리엘 1. 귀환하세요. 오늘 밤 유성 ${n}개. 연쇄 폭발을 노려봐요.`;
  if(score>=60000)return `방위선 사수 완료. 수고하셨습니다, 우리엘 1. 귀환하세요. 오늘 밤 유성 ${n}개.`;
  if(score>=25000)return `방위선 사수 완료. 수고하셨습니다, 우리엘 1. 귀환하세요. 지휘기는 아직 남아 있어요. 유성 ${n}개.`;
  return `추진제 소진, 귀환하세요. 오늘 밤 유성은 ${n}개. 연쇄 폭발을 노려봐요.`;
}

// result screen layout: solo / score duel (score, stats, board) or the 1:1 machine battle outcome (vsres)
function resultMode(vs){const r=$("scrResult");r.classList.toggle("vsres",vs);const h=r.querySelector(".pHead h2"),l=r.querySelector(".pane>.lbl");
  if(h)h.textContent=vs?"기체 대전 종료":"작전 종료";if(l)l.textContent=vs?"라운드 스코어 (나 : 상대)":"이번 출격 점수"}
function finishRun(reason){
  if(VS){vsTimeUp();return}
  if(TUT.on){tutExit("title");return}
  if(S.ended)return;S.ended=true;if(document.pointerLockElement)document.exitPointerLock();
  const lost=reason==="lost";let bonus=0;
  const rate=lost?0:G.lives*.1+(G.lives===MAX_LIVES?.1:0);if(!lost){bonus=Math.round(S.score*rate);S.score+=bonus}
  G.focus=null;resultMode(false);
  if(DUEL){duelFinish(lost,bonus,rate);return}
  if(DEV.run){devFinish(lost);return} // developer mode: nothing is recorded
  const rec=PILOT.rec||{},score=S.score,pb=score>(rec.best||0);
  if(pb){rec.best=score;rec.chain=S.best;rec.kills=S.kills||0;rec.combo=G.maxKC;rec.unit=G.unit;rec.frame=P?P.frame:"mk2"}
  rec.at=new Date().toISOString();putRec({...rec});
  if(SERVER&&RUN){const runId=RUN;RUN=null;api("finish",{runId,score,kills:S.kills||0,chain:S.best,combo:G.maxKC,boss:!!BOSS.dead,bossT:BOSS.killT||0}).then(j=>{bossCard(j.boss);rec.best=j.best;rec.attempts=j.attempts;$("rBest").textContent=(j.best||0).toLocaleString();applyBoard(j);updateRankLine()}).catch(e=>{$("rRank").innerHTML='<span class="note" style="color:var(--red)">기록 서버 전송 실패 — 운영진에게 화면을 보여주세요.</span>'})}
  music(null);sfx("end");if(pb&&score>0)sfx("pb");setTimeout(()=>{if(SCREEN==="result"){music("title");muffle(true)}},2600);
  $("rScore").textContent=score.toLocaleString();{const g=score>=250000?"S":score>=150000?"A":score>=70000?"B":"C",im=$("rGrade");im.hidden=false;im.src=`ui/grade_${g}.webp`;im.alt=g+" 등급";im.style.animation="none";void im.offsetWidth;im.style.animation=""}$("rKills").textContent=S.kills||0;$("rCombo").textContent=G.maxKC;$("rChain").textContent=S.best;$("rBest").textContent=(rec.best||0).toLocaleString();
  $("rPb").innerHTML=(pb&&score>0?'<span class="pb">개인 최고 기록 갱신</span> ':"")+(lost?'<span class="note">기체 대파 · 작전 조기 종료</span>':`<span class="note">생존 보너스 +${bonus.toLocaleString()} (전투 점수의 ${Math.round(rate*100)}% · 남은 기체 ${G.lives}${G.lives===MAX_LIVES?" · 무피격 클리어":""})</span>`);
  bossCard(BOSS.dead?{pending:true,t:BOSS.killT||0}:null);
  $("rDebrief").innerHTML='<span class="who">이클립스 CIC · 최지우 중위</span>'+debriefLine(lost,score);
  $("rSortie").textContent=`출격 ${rec.attempts} / ${MAX_SORTIE}`;
  const left=MAX_SORTIE-rec.attempts,ag=$("againBtn");ag.disabled=left<=0;ag.hidden=false; /* like before: "재출격 · n회 남음", or a disabled "출격 횟수 소진" */
  ag.firstChild.textContent=left>0?`재출격 · ${left}회 남음 `:"출격 횟수 소진 ";
  show("result");renderBoards();updateRankLine();setTimeout(()=>(left>0?ag:document.querySelector("#scrResult [data-go]")).focus(),120);
}
$("launchBtn").addEventListener("click",launch);
$("briefBack").addEventListener("click",()=>show(briefMode==="launch"?"load":"title"));
$("againBtn").addEventListener("click",()=>{if(DEV.retry){DEV.retry=false;devLaunch(false);return}if(DUELDONE){DUELDONE=false;show("duel");return}if(PILOT.rec&&PILOT.rec.attempts<MAX_SORTIE)launch()});

/* ================= HUD ================= */
const HC={};
function setT(id,v){v=String(v);if(HC[id]!==v){HC[id]=v;$(id).textContent=v}}
function setW(id,p){const v=(+p).toFixed(1)+"%",k=id+"|w";if(HC[k]!==v){HC[k]=v;$(id).style.width=v}}
function setC(id,c,on){const k=id+"|"+c;on=!!on;if(HC[k]!==on){HC[k]=on;$(id).classList.toggle(c,on)}}
function setH(id,h){const k=id+"|h";h=!!h;if(HC[k]!==h){HC[k]=h;$(id).hidden=h}}
function hudUpdate(){
  const t=Math.max(0,S.time),m=Math.floor(t/60),sec=Math.floor(t%60),d=Math.floor((t*10)%10);
  setT("time",m+":"+String(sec).padStart(2,"0"));setT("timeMs","."+d);setC("clockBox","hot",t<20);setW("tbarF",t/120*100);
  setT("score",S.score.toLocaleString());setT("kills",S.kills||0);setT("best",S.best);
  const top=BOARD.length?BOARD[0].best:0;setT("topScore",top?top.toLocaleString():"—");
  if(top){const g=S.score-top;setT("gap",g>=0?"1위 페이스":g.toLocaleString());setC("gap","ahead",g>=0)}else setT("gap","");
  {const b=Math.max(.5,S.boost).toFixed(1);if(HC.bst!==b){HC.bst=b;$("boostF").style.setProperty("--b",b)}const low=S.boost<(VS?20:12);if(HC.bstL!==low){HC.bstL=low;$("boostG").classList.toggle("low",low)}}setT("boostV",Math.round(S.boost));
  setW("heatF",S.heat);setT("mult",Math.round(S.heat)+"%");setC("heatG","hot",S.heat>=80||S.over>0);setH("heatG",!VS);
  setC("comboBox","live",G.kc>0);setT("kcNum",G.kc);setT("kcMult","×"+mult().toFixed(1));setW("kcBar",G.kc>0?G.kcT/KC_WINDOW*100:0);
  setT("phaseTag","단계 "+(G.phase+1)+" / 4"+(G.phase>=3?" · ×2":""));setH("critTag",!(G.crit>0));
  setT("gravN","×"+G.grav);setC("wGrav","off",G.grav<=0);setC("wGrav","act",G.wells.length>0);
  setW("specBar",G.spec);setC("wSpec","ready",G.spec>=100);setT("specTxt",G.spec>=100?"READY":Math.floor(G.spec)+"%");setH("armorTag",!(G.armor>0));
  const sl=S.act&&S.act.startsWith("slash");setT("chainNow",sl?`콤보 ${S.combo+1} / 3`:"록온 돌진");
  setC("wBlade","act",S.bladeOn>0||sl);setC("wRifle","act",S.shotCd>0);setW("rifleCd",S.shotCd>0?(1-S.shotCd/(G.unit==="missile"?.24:.32))*100:100);
  setT("warn",G.dead>0?(G.lives>0?"기체 대파 — 예비기 발진 준비":"기체 대파"):G.stagger>0?(G.broke?"자세 회복 중":"경직 — Shift로 풀기 (부스트 30)"):VS&&S.over>0?"과열 정지":VS&&S.heat>=80?"과열 임박":S.boost<15?"부스트 부족 — 회피 불가":"");
  {const cm=cleanMult(),nx=cm>=2?1:(G.clean%CLEAN_STEP)/CLEAN_STEP;setT("cleanV","×"+cm.toFixed(1));setW("cleanF",nx*100);setC("cleanBox","max",cm>=2)}
  if(!VS){const hp=Math.ceil(G.hp??HP_MAX);if(HC.hp!==hp){HC.hp=hp;$("hpF").style.width=(hp/HP_MAX*100)+"%";$("hpV").textContent=hp;$("hpRow").classList.toggle("low",hp<HP_MAX*.35);$("ckHpF").style.width=(hp/HP_MAX*100)+"%";$("ckHpV").textContent=hp;$("ckHp").classList.toggle("low",hp<HP_MAX*.35)}}
  setH("ckHp",VS);
  if(HC.lives!==G.lives){HC.lives=G.lives;[...$("lives").children].forEach((c,i)=>{if(c.tagName==="I")c.classList.toggle("lost",i>=G.lives)});$("livesTxt").textContent="기체 "+Math.max(0,G.lives)+" / "+MAX_LIVES}
  {const u=UNITS[G.unit],cd=G.unitCd;setW("unitCd",cd>0?(1-cd/u.cd)*100:100);setC("wUnit","ready",cd<=0);setC("wUnit","act",!!G.mega||G.barrier>0||G.marking);
   setT("unitName",G.marking?`${u.r} · ${G.marks.length}/6`:cd>0?`${u.r} ${cd.toFixed(1)}`:u.r)}
  {const b=BOSS.e;setH("bossBar",!b);if(b){const tr=$("bossBar").querySelectorAll(".bossTrack b");
    BOSS.wps.forEach((w,i)=>{if(tr[i])tr[i].style.width=(w.alive?w.hp/WP_HP*100:0)+"%"});setC("bossBar","down",b.down>0);
    setT("bossState",b.down>0?`기능 정지 ${b.down.toFixed(1)}s · 베어서 날려라`:`약점 포드 ${BOSS.wps.filter(w=>w.alive).length}`)}}
  {const ms=$("marks");while(ms.children.length<6){const d=document.createElement("div");d.className="mk";ms.appendChild(d)}
   for(let i=0;i<6;i++){const d=ms.children[i],e=G.marks[i];let on=false;if(e&&e.alive){const p=e.m.position.clone().project(camera);if(p.z<1){on=true;d.style.transform=`translate(${((p.x+1)/2*innerWidth).toFixed(1)}px,${((1-p.y)/2*innerHeight).toFixed(1)}px) translate(-50%,-50%) rotate(45deg)`}}
     const k="mk"+i;if(HC[k]!==on){HC[k]=on;d.style.display=on?"block":"none"}}}
  const lk=$("lock");let show=false;
  if(target&&SCREEN==="play"){const p=target.m.position.clone().project(camera);if(p.z<1){show=true;const sh=!!target.elite&&eliteBlocks(target,S.pos);
    const fc=G.focus===target;setC("lock","focus",fc);setT("lockTxt",target.isWP?`약점 포드 · ${target.hp}/${WP_HP}`:target.isBoss?"기능 정지 · 베어라":fc&&!G.aimN?"고정":G.aimN>0?`예상 연쇄 ×${G.aimN}`:(target.elite?(sh?"실드 · 뒤를 노려라":"BACK · 공격 가능"):"LOCK"));setC("lock","hot",G.aimN>0);setC("lock","shield",sh);
    lk.style.transform=`translate(${((p.x+1)/2*innerWidth).toFixed(1)}px,${((1-p.y)/2*innerHeight).toFixed(1)}px) translate(-50%,-50%)`}}
  if(HC.lockShow!==show){HC.lockShow=show;lk.style.display=show?"block":"none"}
  drawRadar();duelHud();
}
renderer.domElement.addEventListener("pointerdown",()=>{if(SCREEN==="launch")skipCine()});
show("title");
