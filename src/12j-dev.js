/* ================= developer mode (10/29) =================
   Open the game with ?dev in the address (e.g. https://…/?dev). Never records anything: no server run, no sortie used,
   no local record — so a player who finds it gains nothing for the ranking. F9 shows / hides the panel. */
const DEV={on:/[?&]dev\b/.test(location.search),run:false,god:false,nocd:false,notime:false};
function devUnitUI(){const U=UNITS[G.unit];document.documentElement.style.setProperty("--uc",U.css);$("unitName").textContent=U.r;$("specName").textContent=U.f;
  $("uIconR").src=`ui/r_${G.unit}.webp`;$("uIconF").src=`ui/f_${G.unit}.webp`;buildBits(G.unit)}
async function devLaunch(cine){if(!P||TUT.on||VS)return;DEV.run=true;lock();restart();S.yaw=S.face;S.pitch=-.08;devUnitUI();
  $("pName").textContent="DEV";$("pDept").textContent="개발자 모드 · 기록 안 됨";$("pSortie").textContent="—";
  if(cine){show("launch");await playCatapult()}
  show("play");S.started=true;phaseBanner(PHASES[0]);sfx("phase")}
function devFinish(lost){DEV.run=false;DEV.retry=true;resultMode(false);const score=S.score;
  $("rScore").textContent=score.toLocaleString();$("rGrade").hidden=true;$("rPb").innerHTML=`<span class="note">개발자 모드 · 기록 안 됨${lost?" · 기체 대파":""}</span>`;
  $("rDebrief").innerHTML='<span class="who">DEV</span>순위·출격 횟수에 반영되지 않았어요.';$("rSortie").textContent="DEV";
  const ag=$("againBtn");ag.hidden=false;ag.disabled=false;ag.firstChild.textContent="재출격 (DEV) ";music(null);sfx("end");show("result");setTimeout(()=>ag.focus(),120)}
if(DEV.on){
  const p=document.createElement("div");p.id="devPanel";
  p.innerHTML=`<style>
#devPanel{position:fixed;right:12px;top:50%;transform:translateY(-50%);z-index:9999;width:220px;background:rgba(8,10,14,.94);border:1px solid #ff3a6a;font:12px/1.4 Pretendard,"Noto Sans CJK KR",sans-serif;color:#e8e6df;padding:10px;box-shadow:0 6px 24px #000}
#devPanel h4{margin:0 0 8px;font-size:12px;color:#ff6a8a;letter-spacing:.12em;display:flex;justify-content:space-between}
#devPanel button{display:block;width:100%;margin:3px 0;padding:6px 8px;background:#1a1e25;border:1px solid #39424e;color:#e8e6df;text-align:left;cursor:pointer;font:inherit}
#devPanel button:hover{border-color:#ffb21a}#devPanel button.on{background:#ffb21a;color:#1a1205;border-color:#ffb21a}
#devPanel .row{display:grid;grid-template-columns:1fr 1fr;gap:4px}#devPanel .row button{margin:0}
#devPanel small{color:#8b939e}#devBadge{position:fixed;left:50%;top:6px;transform:translateX(-50%);z-index:9999;background:#ff3a6a;color:#fff;font:700 11px sans-serif;padding:2px 8px;letter-spacing:.15em;pointer-events:none}
</style><h4><span>DEV MODE</span><small>F9 숨기기</small></h4>
<button data-d="go">▶ 바로 출격 (기록 없음)</button><button data-d="goc">▶ 캐터펄트 포함 출격</button>
<small>장비</small><div class="row"><button data-u="mega">메가</button><button data-u="pods">포드</button><button data-u="missile">미사일</button><button data-u="shield">실드</button></div>
<small>전투 중</small>
<button data-d="boss">보스 단계로 (남은 60초)</button><button data-d="t30">남은 시간 30초로</button>
<button data-d="notime">제한시간 무제한</button><button data-d="god">무적</button><button data-d="nocd">R 쿨타임 없음</button>
<button data-d="spec">필살 게이지 가득</button><button data-d="grav">중력탄 3개</button>
<button data-d="kill">주변 적 전멸</button><button data-d="foes">새 적 4종 소환</button>
<small>연출</small><button data-d="intro">오프닝 보기</button><button data-d="tut">튜토리얼</button>`;
  document.body.appendChild(p);const badge=document.createElement("div");badge.id="devBadge";badge.textContent="DEV · 기록 안 됨";document.body.appendChild(badge);
  const sync=()=>{p.querySelectorAll("[data-u]").forEach(b=>b.classList.toggle("on",b.dataset.u===G.unit));p.querySelector('[data-d="god"]').classList.toggle("on",DEV.god);p.querySelector('[data-d="nocd"]').classList.toggle("on",DEV.nocd);p.querySelector('[data-d="notime"]').classList.toggle("on",DEV.notime)};
  const live=()=>SCREEN==="play"&&S.started&&!S.ended;
  p.addEventListener("pointerdown",e=>e.stopPropagation());
  p.addEventListener("click",e=>{e.stopPropagation();const b=e.target.closest("button");if(!b)return;sfx("ui");
    if(b.dataset.u){G.unit=b.dataset.u;devUnitUI();sync();return}
    const d=b.dataset.d,V=V3;
    if(d==="go")devLaunch(false);else if(d==="goc")devLaunch(true);
    else if(d==="boss"&&live()){S.time=Math.min(S.time,60.2)}
    else if(d==="t30"&&live())S.time=30.2;
    else if(d==="notime")DEV.notime=!DEV.notime;else if(d==="god")DEV.god=!DEV.god;else if(d==="nocd")DEV.nocd=!DEV.nocd;
    else if(d==="spec"&&live()){G.specT=-1;G.spec=99;addSpec(1)}
    else if(d==="grav")G.grav=3;
    else if(d==="kill"&&live()){for(const e2 of enemies)if(e2.alive&&!e2.isBoss&&!e2.isWP&&!e2.isRemote){e2.alive=false;disposeEnemy(e2)}}
    else if(d==="foes"&&live()){const f=camFwd(),at=k=>S.pos.clone().addScaledVector(f,k);spawnKami(at(45));spawnSniper(at(85));spawnFormation();spawnCrate(at(30))}
    else if(d==="intro"&&!live()){playIntro()}
    else if(d==="tut"&&!live()){startTutorial()}
    sync();if(live())lock()});
  addEventListener("keydown",e=>{if(e.code==="F9"){e.preventDefault();p.hidden=!p.hidden}});
  setInterval(()=>{if(SCREEN!=="play")return;if(DEV.god){G.iframe=Math.max(G.iframe,.5);if(G.hp<HP_MAX)G.hp=HP_MAX}if(DEV.nocd)G.unitCd=0},100);sync()}
