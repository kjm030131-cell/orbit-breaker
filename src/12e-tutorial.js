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
const TUT_STEPS=[
  {obj:"표시된 지점까지 이동  ·  WASD 이동 / Space 상승 / C 하강",
   say:[[OP,"기체 동조 확인. 우선 움직여 봐요. 앞에 표시한 지점까지."]],
   enter(){tutWaypoint(tutAhead(70,0,4))},done(){return TUT.wp&&S.pos.distanceTo(TUT.wp.position)<12},exit(){tutWaypoint(null)}},
  {obj:"Shift 짧게 = 회피, 길게 = 부스트  ·  회피 2회",prog:()=>`${Math.min(2,TUT.c.dodge||0)} / 2`,
   say:[[OP,"좋아요. Shift를 짧게 누르면 회피, 누르고 있으면 부스트예요. 두 번 피해 봐요."]],
   done(){return (TUT.c.dodge||0)>=2}},
  {obj:"빔 라이플(우클릭)로 정찰기 3기 격추  ·  조준선이 빨개지면 발사",prog:()=>`${Math.min(3,TUT.c.kill||0)} / 3`,
   say:[[OP,"전방에 적 정찰기 3기. 조준선이 빨갛게 변하는 순간 쏴요."]],
   enter(){TUT.c.kill=0;[-14,0,14].forEach((s,i)=>tutDrone(tutAhead(48+i*6,s,2+i*2),true))},done(){return (TUT.c.kill||0)>=3}},
  {obj:"빔 사벨(좌클릭)  ·  3번 연속 눌러 콤보 완성",prog:()=>`${Math.min(1,TUT.c.combo||0)} / 1`,
   say:[[OP,"근접은 왼쪽 클릭. 락온한 적에게 알아서 파고들어요. 세 번 연속, 끝까지 베요."]],
   enter(){TUT.c.combo=0;[-6,6,0].forEach((s,i)=>tutDrone(tutAhead(22+i*5,s,1),true))},done(){return (TUT.c.combo||0)>=1},exit(){tutClear()}},
  {obj:"조준 경보가 울리면 회피  ·  저스트 회피 2회",prog:()=>`${Math.min(2,TUT.c.just||0)} / 2`,
   say:[[OP,"조준 경보! 화면이 빨갛게 깜빡이면 발사 직전이에요."],[OP,"그 순간에 Shift. 아슬아슬하게 피할수록 크게 보상받아요."]],
   enter(){TUT.c.just=0;[-16,16].forEach(s=>{const e=tutDrone(tutAhead(42,s,4),false);if(e)e.fireT=1.2+Math.random()})},
   tick(){for(const e of enemies)if(e.alive&&!e.tutPassive&&e.fireT>3)e.fireT=1.5+Math.random()},
   done(){return (TUT.c.just||0)>=2||TUT.t>40},exit(){tutClear()}},
  {obj:"특수기 사용  ·  R 유닛 스킬 / F 필살기 / Q 중력탄 (2종 이상)",prog:()=>`${["unit","spec","grav"].filter(k=>TUT.c[k]).length} / 2`,
   say:[[OP,"게이지 채워 뒀어요. R, F, Q. 아끼지 말고 써요."]],
   enter(){G.spec=100;G.specT=-1;G.unitCd=0;G.grav=Math.max(G.grav||0,2);for(let i=0;i<5;i++)tutDrone(tutAhead(36+Math.random()*16,(Math.random()-.5)*30,Math.random()*8),true)},
   tick(){if(G.spec<100&&G.specT<0&&!TUT.c.spec)G.spec=100},
   done(){return ["unit","spec","grav"].filter(k=>TUT.c[k]).length>=2},exit(){tutClear()}},
  {obj:"적 에이스와 교전  ·  칼을 치켜드는 순간 베어서 카운터",prog:()=>`${Math.min(1,TUT.c.counter||0)} / 1`,
   say:[[ACE,"…신참인가. 오늘 밤 유성이 하나 더 늘겠군."],[OP,"적 에이스! 칼을 치켜드는 순간이 빈틈이에요. 그때 베요!"]],
   enter(){const e=spawnMS(tutAhead(46,0,2),true);if(e){e.tutAce=true;e.windT=.85}},
   done(){return (TUT.c.counter||0)>=1}},
  {obj:"귀환",say:[[ACE,"…좋은 반응이다. 다음에 떨어지는 건 네 쪽일지도 모르지."],[OP,"서울 상공 통과 완료. …버텼네요. 귀환해요, 앰버 1."]],
   enter(){setTimeout(()=>{for(const e of enemies)if(e.tutAce){fxExplosion(e.m.position,.8);sfx("dash",e.m.position);e.alive=false;disposeEnemy(e)}enemies.length=0},2600);setTimeout(tutEnding,6500)},done(){return false}}];
function tutSay(lines){lines.forEach((l,i)=>setTimeout(()=>{if(TUT.on)radio(l[0],l[1])},i*3700))}
function tutStep(i){const prev=TUT_STEPS[TUT.step];if(prev&&prev.exit)prev.exit();TUT.step=i;TUT.t=0;const s=TUT_STEPS[i];if(!s)return;
  $("tutObj").hidden=false;$("tutObjTxt").textContent=s.obj;$("tutObjProg").textContent=s.prog?s.prog():"";$("tutObjN").textContent=`${i+1} / ${TUT_STEPS.length}`;
  const o=$("tutObj");o.classList.remove("new");void o.offsetWidth;o.classList.add("new");tutSay(s.say);if(s.enter)s.enter()}
function tutFrame(dt){if(!TUT.on||SCREEN!=="play"||TUT.step<0)return;const s=TUT_STEPS[TUT.step];if(!s)return;TUT.t+=dt;
  if(s.tick)s.tick();if(s.prog)$("tutObjProg").textContent=s.prog();
  if(TUT.wp&&TUT.wp.visible){TUT.wp.userData.ring.lookAt(camera.position);TUT.wp.userData.ring.scale.setScalar(1+Math.sin(TUT.t*4)*.08)}
  if(!TUT.busy&&TUT.t>1&&s.done()){TUT.busy=true;sfx("specReady");popText("목표 달성");const o=$("tutObj");o.classList.add("ok");
    setTimeout(()=>{TUT.busy=false;o.classList.remove("ok");if(TUT.on)tutStep(TUT.step+1)},1600)}}
// no game over in the tutorial: a hit only costs a flash and a shove
function tutHurt(b){if(G.iframe>0)return;G.iframe=1.4;fxImpact(S.pos.clone().add(new V3(0,.8,0)),0xff4030);sfx("hurt");S.shake=.7;S.vel.addScaledVector(b.dir||new V3(0,0,-1),18);
  const h=$("hurt");h.classList.remove("on");void h.offsetWidth;h.classList.add("on");popText("피격 — 실전이었다면 격추예요")}
async function startTutorial(){if(TUT.on||!P)return;sfx("uiok");lock();
  TUT.on=true;TUT.step=-1;TUT.c={};TUT.busy=false;restart();S.yaw=S.face;S.pitch=-.08;G.lives=99;
  const U=UNITS[G.unit];document.documentElement.style.setProperty("--uc",U.css);$("unitName").textContent=U.r;$("specName").textContent=U.f;$("uIconR").src=`ui/r_${G.unit}.webp`;$("uIconF").src=`ui/f_${G.unit}.webp`;buildBits(G.unit);
  $("pName").textContent=PILOT.name||"앰버 1";$("pDept").textContent="첫 출격";$("pSortie").textContent="—";
  document.body.classList.add("tut");show("launch");
  await playIntro();if(!TUT.on)return;await playCatapult();if(!TUT.on)return;
  show("play");S.started=true;tutStep(0)}
function tutEnding(){if(!TUT.on)return;const n=Math.max(1,(S.kills||0)+(TUT.c.kill||0)*0);$("tutObj").hidden=true;if(document.pointerLockElement)document.exitPointerLock();
  const e=$("tutEnd");$("tutEndA").textContent=`그날 밤, 서울 하늘에는 유성 ${n}개가 내렸다.`;$("tutEndB").textContent="동생은 그중 하나에 소원을 빌었다.";e.hidden=false;e.classList.remove("on");void e.offsetWidth;e.classList.add("on");sfx("phase");
  setTimeout(()=>$("tutGo").focus(),2600)}
function tutExit(to){TUT.on=false;TUT.step=-1;tutWaypoint(null);$("tutObj").hidden=true;$("tutEnd").hidden=true;document.body.classList.remove("tut");
  if(INTRO.on){INTRO.done=null;INTRO.on=false;introClear();$("intro").hidden=true;if(P)P.root.visible=true}
  if(CINE.on){CINE.done=null;endCine()}if(document.pointerLockElement)document.exitPointerLock();restart();show(to||"title")}
$("tutGo").addEventListener("click",()=>{sfx("uiok");tutExit("form")});
$("tutBack").addEventListener("click",()=>{sfx("uiback");tutExit("title")});
$("tutBtn").addEventListener("click",startTutorial);
