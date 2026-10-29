/* ================= boss (케르고그모스) rewards, 10/29: board badge, kill certificate on the result screen, hall of fame tab ================= */
const BOSS_BADGE='<i class="bossB" title="케르고그모스 격파" aria-label="케르고그모스 격파"></i>';
const bossTime=t=>{t=Math.max(0,+t||0);const m=Math.floor(t/60),s=t-m*60;return `${m}:${s<10?"0":""}${s.toFixed(1)}`};
// result screen: certificate card. info = server reply {nth,t,best,firstKill,speedRank} or {pending,t} before it arrives, null = hide
function bossCard(info){const el=$("rBoss");if(!el)return;if(!info){el.hidden=true;el.innerHTML="";return}
  const d=new Date(),stamp=`${d.getMonth()+1}.${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  const big=info.nth?`<b class="bkN">${info.nth}</b><span class="bkU">번째 격파자</span>`:`<b class="bkN bkOk">격파</b><span class="bkU">${info.pending&&SERVER?"인증 번호 확인 중…":"확인"}</span>`;
  const sub=[`작전 개시 후 <b>${bossTime(info.t)}</b> 격파`];if(info.speedRank)sub.push(`최단 기록 <b>${info.speedRank}</b>위`);if(info.nth&&!info.firstKill&&info.best<info.t)sub.push(`개인 최단 ${bossTime(info.best)}`);
  el.innerHTML=`<div class="bkTag"><i class="bossB"></i><span>KERGOGMOS SLAIN · 케르고그모스 격파 인증</span></div><div class="bkMain">${big}</div><div class="bkSub">${sub.join(" · ")}</div>`+
    `<div class="bkFoot"><span>${esc(PILOT.name||"")} · ${esc(PILOT.dept||"")}</span><span>${stamp}</span></div>`;
  if(el.hidden){el.hidden=false;el.classList.remove("in");void el.offsetWidth;el.classList.add("in")}}
// title board tabs: score ranking / hall of fame (first slayer + fastest 5). The board flips by itself every 12 s while idle.
const FAME={view:"rank",data:null,userT:-1e9,flipT:0};
function fameRender(){const el=$("fameBoard");if(!el)return;const f=FAME.data;
  if(!f||!f.total){el.innerHTML='<div class="fmEmpty"><i class="bossB"></i><b>아직 케르고그모스를 쓰러뜨린 파일럿이 없습니다</b><span>최초 격파자의 이름이 이곳에 새겨집니다</span></div>';return}
  const a=f.first,when=a&&a.at?(()=>{const d=new Date(a.at);return `${d.getMonth()+1}.${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`})():"";
  let h=`<div class="fmFirst"><span class="fmL">최초 격파자</span><b>${esc(a.name)}${BOSS_BADGE}</b><span class="fmD">${esc(a.dept)}${when?" · "+when:""} · ${bossTime(a.t)}</span></div>`;
  h+=`<div class="fmHead"><span>최단 격파 TOP 5</span><span>${f.total}명 격파</span></div><div class="fmRows">`;
  for(let i=0;i<5;i++){const r=f.fastest[i],n=i+1;
    h+=r?`<div class="lbr ${n<=3?"p"+n:""}"><span class="r">${n<=3?`<img class="medal" src="ui/medal${n}.webp" alt="${n}">`:String(n).padStart(2,"0")}</span><span class="nm">${esc(r.name)}</span><span class="dp">${esc(r.dept)}</span><span class="sc">${bossTime(r.t)}</span></div>`
        :`<div class="lbr empty"><span class="r">${String(n).padStart(2,"0")}</span><span class="nm">—</span><span class="dp"></span><span class="sc">—</span></div>`}
  el.innerHTML=h+"</div>"}
async function fameLoad(){if(!SERVER)return;try{FAME.data=await api("fame");fameRender()}catch(e){}}
function fameView(v){FAME.view=v;const fame=v==="fame",tb=document.querySelector(".tBoard");if(!tb)return;tb.classList.toggle("fame",fame);
  $("fameBoard").hidden=!fame;tb.querySelectorAll("[data-lbt]").forEach(b=>{const on=b.dataset.lbt===v;b.classList.toggle("on",on);b.setAttribute("aria-selected",on)});
  if(fame){fameRender();fameLoad()}}
document.querySelectorAll("[data-lbt]").forEach(b=>b.addEventListener("click",()=>{FAME.userT=performance.now();sfx("ui");fameView(b.dataset.lbt)}));
setInterval(()=>{if(SCREEN!=="title"||!SERVER)return;const now=performance.now();
  if(FAME.view==="fame")fameLoad();
  if(now-FAME.userT<40000)return;FAME.flipT+=4;if(FAME.flipT<12)return;FAME.flipT=0;
  if(FAME.view==="rank"){if(FAME.data&&FAME.data.total)fameView("fame");else fameLoad()}else fameView("rank")},4000);
