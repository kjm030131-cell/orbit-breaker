/* ================= tutorial: the first sortie ================= */
// Story-wise this is the pilot's first real sortie over Seoul; no timer, no game over. Each step: a radio line
// from the CIC, one objective line top-left (AC style), a setup and a completion test. Counters come from hooks
// in dodge / justDodge / onKill / slashStrike / specials / blade parry.
const TUT={on:false,step:-1,t:0,c:{},wp:null,kills:0,busy:false};
const OP="아스트라이아 CIC · 한서윤 중위",ACE="적 에이스 · 카인";
function tutCount(k){if(TUT.on)TUT.c[k]=(TUT.c[k]||0)+1}
function tutDrone(pos,passive){const e=spawnEnemy(pos,false);if(e&&passive){e.fireT=1e9;e.tutPassive=true}return e}
function tutAhead(d,side,up){const f=camFwd().setY(0).normalize(),r=new V3(f.z,0,-f.x);return S.pos.clone().addScaledVector(f,d).addScaledVector(r,side||0).add(new V3(0,up||0,0))}
function tutClear(){for(const e of enemies)disposeEnemy(e);enemies.length=0;G.ebolts.forEach(b=>{scene.remove(b.g)});G.ebolts.length=0}
function tutWaypoint(pos){if(!TUT.wp){const g=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(6,.35,8,48),new THREE.MeshBasicMaterial({color:0xffb21a,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,60,8,1,true),new THREE.MeshBasicMaterial({color:0xffb21a,transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false}));
    g.add(ring,beam);g.userData.ring=ring;scene.add(g);TUT.wp=g}
  TUT.wp.visible=!!pos;if(pos)TUT.wp.position.copy(pos)}
// unit trial: equip pack k for this step only (restored at the end), refresh the HUD icons
function tutSetUnit(k){G.unit=k;const U=UNITS[k];document.documentElement.style.setProperty("--uc",U.css);$("unitName").textContent=U.r;$("specName").textContent=U.f;
  $("uIconR").src=`ui/r_${k}.webp`;$("uIconF").src=`ui/f_${k}.webp`;buildBits(k);G.unitCd=0;G.spec=0;G.specT=-1;G.marks=[];G.marking=false}
const UNIT_OBJ={mega:"R = 메가 빔(관통) → F = 하이퍼 빔",pods:"R = 포드 강습(조준한 적) → F = 올 레인지",missile:"R 길게 눌러 3기 이상 표적 → 떼서 발사 → F = 풀 버스트",shield:"R = 반사 장벽으로 적탄 되받기 → F = 카운터 필드"};
const UNIT_SAY={
  mega:[[OP,"옵션 유닛 시험이에요. 첫 번째는 하이퍼 메가 런처."],[OP,"R은 충전 후 관통 빔. 일렬로 선 적을 한 번에 꿰뚫어요."]],
  pods:[[OP,"다음은 원격 포드. 조준선에 적을 올리고 R."],[OP,"포드 셋이 날아가 그 적을 직접 때려 날려요."]],
  missile:[[OP,"다탄두 미사일은 R을 짧게 누르면 손해예요."],[OP,"R을 누른 채 조준선으로 훑어 표적을 모으고, 떼면 일제 발사."]],
  shield:[[OP,"마지막은 실드 비트. 적이 쏘기 직전에 R."],[OP,"장벽에 닿은 적탄은 쏜 놈에게 그대로 돌아가요."]]};
const UNIT_F={mega:"F 하이퍼 빔. 5초 동안 마우스로 전장을 쓸어요.",pods:"F 올 레인지. 포드가 적을 한 점에 모아 터뜨려요.",missile:"F 풀 버스트. 주변 적에게 미사일 일제 사격.",shield:"F 카운터 필드. 4초 무적에 모든 적탄 반사."};
const UNIT_P={mega:"패시브는 라이플 명중 때마다 필살 게이지 충전.",pods:"패시브로 20초마다 적탄 한 발을 포드가 막아 줘요.",missile:"패시브로 라이플 연사가 빨라져요.",shield:"패시브로 저스트 회피 후 한 대를 막아 줘요."};
function unitStep(k){const rDone=()=>(TUT.c["u_"+k]||0)>=1;return {unit:k,
  obj:"옵션 시험 · "+UNITS[k].name+"  ·  "+UNIT_OBJ[k],prog:()=>`R ${rDone()?"✓":"…"}   F ${(TUT.c.spec||0)>=1?"✓":"…"}`,say:UNIT_SAY[k],
  keep:k==="shield"?{n:3,passive:false,d:[30,42]}:{n:k==="mega"?5:5,passive:true,d:[30,52],line:k==="mega"},
  enter(){tutSetUnit(k);TUT.c["u_"+k]=0;TUT.c.spec=0;TUT.fSaid=false;TUT.shortSaid=false;if(k==="mega")tutLine(5)},
  tick(){if(rDone()&&!TUT.fSaid){TUT.fSaid=true;G.spec=100;tutSay([[OP,UNIT_F[k]],[OP,UNIT_P[k]]])}
    if(k==="missile"&&(TUT.c.missileShort||0)>0&&!TUT.shortSaid){TUT.shortSaid=true;tutSay([[OP,"너무 짧아요. R을 누른 채로 적들 위를 훑어요!"]])}
    if(k==="shield")for(const e of enemies)if(e.alive&&!e.tutPassive&&e.fireT>3)e.fireT=1+Math.random()*1.2;
    if(TUT.fSaid&&G.spec<100&&G.specT<0&&!(TUT.c.spec>0)&&!G.mega)G.spec=100},
  done(){return rDone()&&(TUT.c.spec||0)>=1&&!G.mega&&G.specT<0&&G.cfield<=0},exit(){tutClear()}}}
// five passive drones in a row straight ahead (for the piercing beam)
function tutLine(n){for(let i=0;i<n;i++)tutDrone(tutAhead(26+i*9,(i%2?1:-1)*1.2,2),true)}
const TUT_STEPS=[
  {obj:"표시된 지점까지 이동  ·  WASD 이동 / Space 상승 / C 하강",
   say:[[OP,"기체 동조 확인. 우선 움직여 봐요. 앞에 표시한 지점까지."]],
   enter(){tutWaypoint(tutAhead(70,0,4))},done(){return TUT.wp&&S.pos.distanceTo(TUT.wp.position)<12},exit(){tutWaypoint(null)}},
  {obj:"Shift 짧게 = 회피, 길게 = 부스트  ·  회피 2회",prog:()=>`${Math.min(2,TUT.c.dodge||0)} / 2`,
   say:[[OP,"좋아요. Shift를 짧게 누르면 회피, 누르고 있으면 부스트예요. 두 번 피해 봐요."],[OP,"맞아서 비틀거릴 때도 Shift. 부스트를 써서 바로 자세를 잡아요."]],
   done(){return (TUT.c.dodge||0)>=2}},
  {obj:"빔 라이플(우클릭)로 정찰기 3기 격추  ·  조준선이 빨개지면 발사",prog:()=>`${Math.min(3,TUT.c.kill||0)} / 3`,
   say:[[OP,"전방에 적 정찰기 3기. 조준선이 빨갛게 변하는 순간 쏴요."]],
   keep:{n:3,passive:true,d:[44,60]},enter(){TUT.c.kill=0;[-14,0,14].forEach((s,i)=>tutDrone(tutAhead(48+i*6,s,2+i*2),true))},done(){return (TUT.c.kill||0)>=3},exit(){tutClear()}},
  {obj:"빔 사벨(좌클릭)  ·  3번 연속 눌러 콤보 완성",prog:()=>`${Math.min(1,TUT.c.combo||0)} / 1`,
   say:[[OP,"근접은 왼쪽 클릭. 락온한 적에게 알아서 파고들어요. 세 번 연속, 끝까지 베요."],[OP,"날려 보낸 적이 다른 적에 부딪히면 연쇄 폭발이에요."]],
   keep:{n:3,passive:true,d:[16,28]},enter(){TUT.c.combo=0;[-6,6,0].forEach((s,i)=>tutDrone(tutAhead(18+i*4,s,1),true))},done(){return (TUT.c.combo||0)>=1},exit(){tutClear()}},
  {obj:"정찰기 조준 경보가 울리면 회피  ·  저스트 회피 2회",prog:()=>`${Math.min(2,TUT.c.just||0)} / 2`,
   say:[[OP,"조준 경보! 붉은 선이 굵게 깜빡이면 발사 직전이에요."],[OP,"그 순간에 Shift. 아슬아슬하게 피할수록 크게 보상받아요."]],
   keep:{n:2,passive:false,d:[36,46]},enter(){TUT.c.just=0;[-16,16].forEach(s=>{const e=tutDrone(tutAhead(42,s,4),false);if(e)e.fireT=1.2+Math.random()})},
   tick(){for(const e of enemies)if(e.alive&&!e.tutPassive&&e.fireT>3)e.fireT=1.5+Math.random()},
   done(){return (TUT.c.just||0)>=2||TUT.t>40},exit(){tutClear()}},
  {obj:"돌격 드론  ·  주황 선이 깜빡이다 돌진  ·  돌진 직전에 회피",prog:()=>`${Math.min(1,TUT.c.ramDodge||0)} / 1`,
   say:[[OP,"주황색 드론은 돌격형. 쏘지 않고 몸으로 들이받아요."],[OP,"주황 선이 빠르게 깜빡이면 곧 돌진. 그때 옆으로 회피!"]],
   keep:{n:1,kind:"ram",d:[34,42]},enter(){TUT.c.ramDodge=0},done(){return (TUT.c.ramDodge||0)>=1||TUT.t>45},exit(){tutClear()}},
  {obj:"정예기(파란 실드)  ·  정면은 막힘  ·  옆이나 뒤로 돌아가 베기",prog:()=>`${Math.min(1,TUT.c.elite||0)} / 1`,
   say:[[OP,"파란 실드를 단 정예기예요. 정면 공격은 실드에 막혀요."],[OP,"정예기는 굼떠요. 부스트로 옆이나 뒤로 돌아가서 베요."]],
   keep:{n:1,kind:"elite",d:[26,32]},enter(){TUT.c.elite=0;TUT.c.eliteBlock=0;TUT.ebSaid=false},
   tick(){if((TUT.c.eliteBlock||0)>0&&!TUT.ebSaid){TUT.ebSaid=true;tutSay([[OP,"막혔죠? 실드 반대편으로 돌아가요!"]])}},
   done(){return (TUT.c.elite||0)>=1},exit(){tutClear()}},
  {obj:"이족보행 MS  ·  첫 타는 장갑에 막혀 경직  ·  경직 중에 한 번 더",prog:()=>`${Math.min(1,TUT.c.ms||0)} / 1`,
   say:[[OP,"적 MS. 첫 공격은 장갑이 받아 내고 비틀거리기만 해요."],[OP,"비틀거릴 때 바로 한 번 더. 3연사 예고가 뜨면 회피부터!"]],
   keep:{n:1,kind:"ms",d:[26,34]},enter(){TUT.c.ms=0},done(){return (TUT.c.ms||0)>=1},exit(){tutClear()}},
  {obj:"중력탄(Q)  ·  적 무리에 던져 한데 모은 뒤 베기",prog:()=>`${Math.min(1,TUT.c.grav||0)} / 1`,
   say:[[OP,"중력탄은 주변 적을 한 점으로 끌어모아요."],[OP,"모인 덩어리를 베어 날리면 연쇄 폭발이 크게 터져요."]],
   keep:{n:5,passive:true,d:[26,40]},enter(){TUT.c.grav=0;G.grav=Math.max(G.grav||0,2)},tick(){if(G.grav<1&&!(TUT.c.grav>0))G.grav=1},done(){return (TUT.c.grav||0)>=1&&TUT.t>4},exit(){tutClear()}},
  unitStep("mega"),unitStep("pods"),unitStep("missile"),unitStep("shield"),
  {obj:"적 에이스와 교전  ·  칼을 치켜드는 순간 베어서 카운터",prog:()=>`${Math.min(1,TUT.c.counter||0)} / 1`,
   say:[[ACE,"…신참인가. 오늘 밤 유성이 하나 더 늘겠군."],[OP,"적 에이스! 칼을 치켜드는 순간 베면 카운터. 피하기만 해도 빈틈이 생겨요!"]],
   ace:true,enter(){tutRestoreUnit();tutAce()},
   done(){return (TUT.c.counter||0)>=1}},
  {obj:"귀환",say:[[ACE,"…좋은 반응이다. 다음에 떨어지는 건 네 쪽일지도 모르지."],[OP,"서울 상공 통과 완료. …버텼네요. 귀환해요, 앰버 1."]],
   enter(){setTimeout(()=>{for(const e of enemies)if(e.tutAce){fxExplosion(e.m.position,.8);sfx("dash",e.m.position);e.alive=false;disposeEnemy(e)}enemies.length=0},2600);setTimeout(tutEnding,6500)},done(){return false}}];
function tutRestoreUnit(){if(TUT.unit0&&G.unit!==TUT.unit0)tutSetUnit(TUT.unit0);G.spec=0}
function tutAce(){const e=spawnMS(tutAhead(46,0,2),true);if(e){e.tutAce=true;e.windT=.85}}
// top up targets: knocked / destroyed enemies are replaced in front of the player so no step can dead-end
function tutSpawnKind(kind,pos,passive){if(kind==="ram")return spawnEnemy(pos,false,true);if(kind==="elite"){const e=spawnEnemy(pos,true);if(e){e.fireT=1e9;e.tutPassive=true}return e}
  if(kind==="ms")return spawnMS(pos);return tutDrone(pos,passive)}
function tutKeep(s,dt){TUT.respT=(TUT.respT||0)-dt;if(TUT.respT>0||TUT.busy)return;let n=0,ace=false;const kind=s.keep&&s.keep.kind;
  for(const e of enemies)if(e.alive&&e.launched<=0){if(e.tutAce)ace=true;if(!kind||(kind==="ram"?e.ram:kind==="elite"?e.elite:kind==="ms"?e.ms:false))n++}
  if(s.ace&&!ace){TUT.respT=2;tutAce();return}
  if(s.keep&&n<s.keep.n){TUT.respT=kind?2:.7;const d=s.keep.d;
    if(s.keep.line&&!kind){tutLine(Math.max(1,s.keep.n-n));TUT.respT=2.5;return}
    const e=tutSpawnKind(kind,tutAhead(d[0]+Math.random()*(d[1]-d[0]),(Math.random()-.5)*(kind?10:24),Math.random()*6-1),s.keep.passive);
    if(e){emit(ADD,{pos:e.m.position.clone(),tex:TX.ring,color:0xff4030,s0:2,s1:10,life:.4,a:.7});if(!kind&&!s.keep.passive)e.fireT=1.2+Math.random()}}}
function tutSay(lines){const tok=TUT.sayTok=(TUT.sayTok||0)+1;lines.forEach((l,i)=>setTimeout(()=>{if(TUT.on&&TUT.sayTok===tok)radio(l[0],l[1])},i*4300))}
function tutStep(i){const prev=TUT_STEPS[TUT.step];if(prev&&prev.exit)prev.exit();TUT.step=i;TUT.t=0;TUT.respT=0;const s=TUT_STEPS[i];if(!s)return;
  $("tutObj").hidden=false;$("tutObjTxt").textContent=s.obj;$("tutObjProg").textContent=s.prog?s.prog():"";$("tutObjN").textContent=`${i+1} / ${TUT_STEPS.length}`;
  const o=$("tutObj");o.classList.remove("new");void o.offsetWidth;o.classList.add("new");tutSay(s.say);if(s.enter)s.enter()}
function tutFrame(dt){if(!TUT.on||SCREEN!=="play"||TUT.step<0)return;const s=TUT_STEPS[TUT.step];if(!s)return;TUT.t+=dt;
  if(s.tick)s.tick();tutKeep(s,dt);if(s.prog){const v=s.prog();if(v!==TUT.lastProg){TUT.lastProg=v;$("tutObjProg").textContent=v}}
  if(TUT.wp&&TUT.wp.visible){TUT.wp.userData.ring.lookAt(camera.position);TUT.wp.userData.ring.scale.setScalar(1+Math.sin(TUT.t*4)*.08)}
  if(!TUT.busy&&TUT.t>1&&s.done()){TUT.busy=true;sfx("specReady");popText("목표 달성");const o=$("tutObj");o.classList.add("ok");
    setTimeout(()=>{TUT.busy=false;o.classList.remove("ok");if(TUT.on)tutStep(TUT.step+1)},1600)}}
// no game over in the tutorial: a hit only costs a flash and a shove
function tutHurt(b){if(G.iframe>0)return;G.iframe=1.4;fxImpact(S.pos.clone().add(new V3(0,.8,0)),0xff4030);sfx("hurt");S.shake=.7;S.vel.addScaledVector(b.dir||new V3(0,0,-1),18);
  const h=$("hurt");h.classList.remove("on");void h.offsetWidth;h.classList.add("on");popText("피격 — 실전이었다면 격추예요")}
async function startTutorial(){if(TUT.on||!P)return;sfx("uiok");lock();
  TUT.on=true;TUT.step=-1;TUT.c={};TUT.busy=false;TUT.unit0=UNITS[G.unit]?G.unit:"mega";restart();S.yaw=S.face;S.pitch=-.08;
  const U=UNITS[G.unit];document.documentElement.style.setProperty("--uc",U.css);$("unitName").textContent=U.r;$("specName").textContent=U.f;$("uIconR").src=`ui/r_${G.unit}.webp`;$("uIconF").src=`ui/f_${G.unit}.webp`;buildBits(G.unit);
  $("pName").textContent=PILOT.name||"앰버 1";$("pDept").textContent="첫 출격";$("pSortie").textContent="—";
  document.body.classList.add("tut");show("launch");
  await playIntro();if(!TUT.on)return;await playCatapult();if(!TUT.on)return;
  show("play");S.started=true;tutStep(0)}
function tutEnding(){if(!TUT.on)return;const n=Math.max(1,(S.kills||0)+(TUT.c.kill||0)*0);$("tutObj").hidden=true;if(document.pointerLockElement)document.exitPointerLock();
  const e=$("tutEnd");$("tutEndA").textContent=`그날 밤, 서울 하늘에는 유성 ${n}개가 내렸다.`;$("tutEndB").textContent="동생은 그중 하나에 소원을 빌었다.";e.hidden=false;e.classList.remove("on");void e.offsetWidth;e.classList.add("on");sfx("phase");
  setTimeout(()=>$("tutGo").focus(),2600)}
function tutExit(to){if(TUT.unit0&&UNITS[TUT.unit0]){G.unit=TUT.unit0;buildBits(G.unit)}TUT.on=false;TUT.step=-1;tutWaypoint(null);$("tutObj").hidden=true;$("tutEnd").hidden=true;document.body.classList.remove("tut");
  if(INTRO.on){INTRO.done=null;INTRO.on=false;introClear();$("intro").hidden=true;if(P)P.root.visible=true}
  if(CINE.on){CINE.done=null;endCine()}if(document.pointerLockElement)document.exitPointerLock();restart();show(to||"title");tutHintRefresh()}
$("tutGo").addEventListener("click",()=>{sfx("uiok");tutExit("form")});
$("tutBack").addEventListener("click",()=>{sfx("uiback");tutExit("title")});
$("tutBtn").addEventListener("click",startTutorial);
// shared event PC: every player starts at the title, so the tutorial is always recommended (no per-browser memory)
function tutDone(){return false}
function tutHintRefresh(){$("tutHint").hidden=false;$("tutBtn").classList.add("hot")}
tutHintRefresh();

// every sortie from the title asks once: tutorial first, or straight to the pilot form
function tutAskOpen(){$("tutAsk").hidden=false;sfx("ui");setTimeout(()=>$("taTut").focus(),40)}
function tutAskClose(){$("tutAsk").hidden=true}
document.addEventListener("click",e=>{const b=e.target.closest('#scrTitle [data-go="form"]');if(!b)return;e.stopImmediatePropagation();e.preventDefault();tutAskOpen()},true);
$("taTut").addEventListener("click",()=>{tutAskClose();startTutorial()});
$("taGo").addEventListener("click",()=>{tutAskClose();sfx("uiok");show("form")});
addEventListener("keydown",e=>{if($("tutAsk").hidden)return;if(e.code==="Escape"){e.preventDefault();e.stopImmediatePropagation();$("taGo").click()}else if(e.code==="Enter"&&document.activeElement!==$("taGo")){e.preventDefault();e.stopImmediatePropagation();$("taTut").click()}},true);
