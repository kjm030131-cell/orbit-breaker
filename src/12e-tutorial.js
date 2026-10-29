/* ================= tutorial: the first sortie ================= */
// Story-wise this is the pilot's first real sortie over Seoul; no timer, no game over. Each step: a radio line
// from the CIC, one objective line top-left (AC style), a setup and a completion test. Counters come from hooks
// in dodge / justDodge / onKill / slashStrike / specials / blade parry.
const TUT={on:false,step:-1,t:0,c:{},wp:null,kills:0,busy:false};
const OP="이클립스 CIC · 최지우 중위",ACE="적 에이스 · 바엘";
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
/* ---- friendlier tutorial (10/28): one action per step, the keys to press drawn as keycaps that light up when pressed,
   "what" + "how" in the objective box (radio is only flavour), a "지금!" cue with slow motion for every timing task,
   an arrow on the target, Tab to skip and an automatic pass when a step takes too long. ---- */
const KEYCAP={W:["KeyW"],A:["KeyA"],S:["KeyS"],D:["KeyD"],Space:["Space"],C:["KeyC"],Shift:["ShiftLeft","ShiftRight"],Q:["KeyQ"],E:["KeyE"],R:["KeyR"],F:["KeyF"],Enter:["Enter"],
  LMB:["mouse0"],RMB:["mouse2"],Mouse:["mousemove"]};
const KEYLBL={Space:"Space",Shift:"Shift",Enter:"Enter",LMB:"좌클릭",RMB:"우클릭",Mouse:"마우스 이동"};
const UNIT_INFO={mega:"일직선 관통 빔으로 줄 선 적을 한 번에",pods:"조준한 적에게 포드가 날아가 직접 공격",missile:"여러 적을 표적으로 잡아 미사일 일제 사격",shield:"장벽으로 적탄을 튕겨 쏜 적에게 되돌림"};
// per unit: R phase and F phase texts (obj = what, how = how to do it)
const UNIT_TXT={
  mega:{r:["R · 메가 빔으로 줄 선 적 꿰뚫기","조준선을 적 줄에 맞추고 R. 잠깐 충전한 뒤 빔이 뚫고 나가요."],f:["F · 하이퍼 빔 (필살기)","F를 누르면 5초 동안 굵은 빔. 마우스를 움직여 적들을 쓸어 버려요."],
    say:"하이퍼 메가 런처예요. 빔 한 줄로 줄 선 적을 전부 꿰뚫어요."},
  pods:{r:["R · 포드 강습","조준선을 적 위에 올리고 R. 포드 3기가 날아가 그 적을 때려요."],f:["F · 올 레인지 (필살기)","F를 누르면 포드가 주변 적을 한곳에 모아 터뜨려요."],
    say:"원격 포드예요. 내가 조준한 적을 포드가 대신 때려 줘요."},
  missile:{r:["R → 훑어서 록온 → R 한 번 더 = 발사","R을 한 번 누르고 조준선을 적 3기 이상 위로 훑어 표적을 잡은 뒤, R을 한 번 더 누르면 일제 발사."],f:["F · 풀 버스트 (필살기)","F를 누르면 주변 적 전체에 미사일 일제 사격."],
    say:"다탄두 미사일이에요. R을 짧게 누르면 안 돼요. 꾹 누른 채로 적들을 훑어요."},
  shield:{r:["R · 반사 장벽으로 적탄 되돌리기","적이 쏘기 직전에 R. 장벽에 맞은 탄이 쏜 적에게 그대로 돌아가요."],f:["F · 카운터 필드 (필살기)","F를 누르면 4초 동안 무적, 날아오는 적탄을 전부 튕겨 내요."],
    say:"마지막은 실드 비트. 적탄을 튕겨서 되돌려 주는 방어형이에요."}};
const UNIT_P={mega:"덤으로, 라이플을 맞힐 때마다 필살 게이지가 차요.",pods:"덤으로, 20초마다 적탄 한 발을 포드가 막아 줘요.",missile:"덤으로, 라이플 연사가 빨라져요.",shield:"덤으로, 저스트 회피 뒤 한 대를 막아 줘요."};
// timing cues: an enemy bolt about to reach you, a ram drone about to hit, the ace raising its blade
function cueBolt(){const me=S.pos.clone().add(new V3(0,.4,0));let best=null;for(const b of G.ebolts){if(b.dead)continue;const rel=me.clone().sub(b.g.position),al=rel.dot(b.dir);if(al<0)continue;
  if(rel.clone().addScaledVector(b.dir,-al).length()>2.4)continue;const t=al/b.speed;if(best===null||t<best)best=t}return best}
function cueRam(){const me=S.pos.clone().add(new V3(0,.4,0));let best=null;for(const e of enemies){if(!e.ram||e.rs!=="charge"||!e.alive||e.launched>0)continue;const rel=me.clone().sub(e.m.position),al=rel.dot(e.rdir);if(al<0)continue;
  if(rel.clone().addScaledVector(e.rdir,-al).length()>3.2)continue;const t=al/RAM_SPEED;if(best===null||t<best)best=t}return best}
const cueDodge=(t,now,ready,key="Shift")=>t===null?null:t<now?{now:true,key}:t<ready?{now:false,key}:null;
// option-unit card (steps 15-18): which unit is fitted, its R / F, and which one is still to try
const TUT_UNITS=["mega","pods","missile","shield"];
function tutEquipShow(k){const U=UNITS[k],el=$("tutEquip"),fx=$("tutEquipFx"),n=TUT_UNITS.indexOf(k)+1;
  el.innerHTML=`<div class="hd"><span>${n===1?"EQUIPMENT TRIAL":"EQUIPMENT CHANGE"}</span><i>${String(n).padStart(2,"0")} / 04</i></div>
<div class="top"><img src="ui/u_${k}.webp" alt=""><div><b>${U.name}</b><small>${U.en}</small><span>${UNIT_INFO[k]}</span></div></div>
<div class="sk" data-s="r"><img src="ui/r_${k}.webp" alt=""><b>${U.r}</b><em><kbd>R</kbd>SKILL</em></div>
<div class="sk" data-s="f"><img src="ui/f_${k}.webp" alt=""><b>${U.f}</b><em><kbd>F</kbd>ULTIMATE</em></div>`;
  el.style.setProperty("--c",U.css);fx.style.setProperty("--c",U.css);el.dataset.st="";el.hidden=false;el.classList.remove("in");void el.offsetWidth;el.classList.add("in");
  fx.classList.add("on");clearTimeout(tutEquipShow.h);tutEquipShow.h=setTimeout(()=>fx.classList.remove("on"),3500);tutEquipState(k)}
function tutEquipState(k){const el=$("tutEquip");if(el.hidden)return;const r=(TUT.c["u_"+k]||0)>=1,f=r&&(TUT.c.spec||0)>=1,st=(r?1:0)+(f?1:0)+"";if(el.dataset.st===st)return;el.dataset.st=st;
  for(const row of el.querySelectorAll(".sk")){const d=row.dataset.s==="r"?r:f,cur=!d&&(row.dataset.s==="r"||r);row.classList.toggle("done",d);row.classList.toggle("cur",cur);
    row.querySelector("em").innerHTML=d?"✓ CLEAR":`<kbd>${row.dataset.s.toUpperCase()}</kbd>${row.dataset.s==="r"?"SKILL":"ULTIMATE"}`}}
function tutEquipHide(){$("tutEquip").hidden=true;$("tutEquipFx").classList.remove("on");clearTimeout(tutEquipShow.h)}
function unitStep(k){const T=UNIT_TXT[k],rDone=()=>(TUT.c["u_"+k]||0)>=1,fase=()=>rDone()?"f":"r";return {unit:k,limit:75,
  obj:()=>T[fase()][0],how:()=>T[fase()][1],keys:()=>rDone()?["F"]:["R"],hl:()=>rDone()?"wSpec":"wUnit",mark:true,
  prog:()=>`R ${rDone()?"✓":"…"}   F ${(TUT.c.spec||0)>=1?"✓":"…"}`,say:[[OP,T.say]],
  cue:k==="shield"?()=>rDone()?null:cueDodge(cueBolt(),.3,.75,"R"):null,
  keep:k==="shield"?{n:3,passive:false,d:[30,42]}:{n:5,passive:true,d:[30,52],line:k==="mega"},
  enter(){tutSetUnit(k);TUT.c["u_"+k]=0;TUT.c.spec=0;tutEquipShow(k);TUT.fSaid=false;TUT.shortSaid=false;if(k==="mega")tutLine(5)},
  tick(){tutEquipState(k);if(rDone()&&!TUT.fSaid){TUT.fSaid=true;G.spec=100;sfx("specReady");popText("필살 게이지 가득 · F")}
    if(k==="missile"&&(TUT.c.missileShort||0)>0&&!TUT.shortSaid){TUT.shortSaid=true;popText("너무 짧아요 · R을 누른 채로 훑어요")}
    if(k==="shield")for(const e of enemies)if(e.alive&&!e.tutPassive&&e.fireT>3)e.fireT=1+Math.random()*1.2;
    if(TUT.fSaid&&G.spec<100&&G.specT<0&&!(TUT.c.spec>0)&&!G.mega)G.spec=100},
  done(){return rDone()&&(TUT.c.spec||0)>=1&&!G.mega&&G.specT<0&&G.cfield<=0},exit(){tutEquipHide();tutClear();radio(OP,UNIT_P[k])}}}
// five passive drones in a row straight ahead (for the piercing beam)
function tutLine(n){for(let i=0;i<n;i++)tutDrone(tutAhead(26+i*9,(i%2?1:-1)*1.2,2),true)}
const TUT_STEPS=[
  {obj:"화면을 클릭해서 마우스 고정",how:"화면을 한 번 클릭하면 조종 시작 · Esc = 일시정지",keys:["LMB"],limit:30,
   say:[[OP,"기체 동조 확인. 들려요, 우리엘 1? 차근차근 같이 해 봐요."]],done(){return locked}},
  {obj:"마우스로 주변 둘러보기",how:"마우스로 크게 둘러보기",keys:["Mouse"],limit:30,
   prog:()=>`${Math.min(100,Math.round((TUT.c.look||0)/3*100))}%`,enter(){TUT.c.look=0;TUT.y0=S.yaw;TUT.p0=S.pitch},
   tick(){TUT.c.look+=Math.abs(S.yaw-TUT.y0)+Math.abs(S.pitch-TUT.p0);TUT.y0=S.yaw;TUT.p0=S.pitch},done(){return TUT.c.look>=3}},
  {obj:"노란 고리까지 이동",how:"고리를 바라보고 W 꾹 (A·D 좌우 · S 뒤)",keys:["W","A","S","D"],limit:60,
   enter(){tutWaypoint(tutAhead(60,0,0))},done(){return TUT.wp&&S.pos.distanceTo(TUT.wp.position)<12},exit(){tutWaypoint(null)}},
  {obj:"위아래로 움직이기",how:"Space = 위로 · C = 아래로",keys:["Space","C"],limit:40,
   prog:()=>`위 ${(TUT.c.up||0)>=.7?"✓":"…"}   아래 ${(TUT.c.down||0)>=.7?"✓":"…"}`,enter(){TUT.c.up=TUT.c.down=0},
   tick(){if(keys.Space)TUT.c.up+=TUT.dt;if(keys.KeyC)TUT.c.down+=TUT.dt},done(){return TUT.c.up>=.7&&TUT.c.down>=.7}},
  {obj:"부스트로 빠르게 이동",how:"Shift 꾹 + W = 부스트 (게이지 소모)",keys:["Shift","W"],hl:"boostG",limit:45,
   prog:()=>`${Math.min(100,Math.round((TUT.c.boostT||0)/1.5*100))}%`,enter(){TUT.c.boostT=0},
   tick(){if((keys.ShiftLeft||keys.ShiftRight)&&(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD)&&S.boost>0)TUT.c.boostT+=TUT.dt},done(){return TUT.c.boostT>=1.5}},
  {obj:"회피 2번",how:"Shift 톡 = 회피 · A/D와 같이 누르면 옆으로",keys:["Shift","A","D"],hl:"boostG",limit:40,
   prog:()=>`${Math.min(2,TUT.c.dodge||0)} / 2`,enter(){TUT.c.dodge=0},done(){return (TUT.c.dodge||0)>=2}},
  {obj:"빔 라이플로 정찰기 3기 격추",how:"조준선이 빨개지면 우클릭",keys:["Mouse","RMB"],hl:"wRifle",limit:70,mark:true,
   prog:()=>`${Math.min(3,TUT.c.kill||0)} / 3`,say:[[OP,"전방에 적 정찰기. 노란 화살표가 가리키는 놈부터."]],
   keep:{n:3,passive:true,d:[44,60]},enter(){TUT.c.kill=0;[-14,0,14].forEach((s,i)=>tutDrone(tutAhead(48+i*6,s,2+i*2),true))},done(){return (TUT.c.kill||0)>=3},exit(){tutClear()}},
  {obj:"빔 사벨 3연속 베기",how:"적을 조준하고 좌클릭 3번, 리듬 있게",keys:["LMB"],hl:"wBlade",limit:60,mark:true,
   prog:()=>`${Math.min(1,TUT.c.combo||0)} / 1`,say:[[OP,"근접은 빔 사벨. 날려 보낸 적이 다른 적에 부딪히면 연쇄 폭발해요."]],
   keep:{n:3,passive:true,d:[16,28]},enter(){TUT.c.combo=0;[-6,6,0].forEach((s,i)=>tutDrone(tutAhead(18+i*4,s,1),true))},done(){return (TUT.c.combo||0)>=1},exit(){tutClear()}},
  {obj:"적탄을 아슬아슬하게 피하기 (저스트 회피)",how:"탄이 닿기 직전 '지금!'에 Shift",keys:["Shift"],limit:45,mark:true,
   prog:()=>`${Math.min(2,TUT.c.just||0)} / 2`,say:[[OP,"조준 경보가 울리면 곧 쏴요. 맞기 직전에 피하는 게 제일 이득이에요."]],
   cue:()=>cueDodge(cueBolt(),.15,.6),
   keep:{n:2,passive:false,d:[36,46]},enter(){TUT.c.just=0;[-16,16].forEach(s=>{const e=tutDrone(tutAhead(42,s,4),false);if(e)e.fireT=1.2+Math.random()})},
   tick(){for(const e of enemies)if(e.alive&&!e.tutPassive&&e.fireT>3)e.fireT=1.5+Math.random()},
   done(){return (TUT.c.just||0)>=2},exit(){tutClear()}},
  {obj:"돌격 드론의 돌진 피하기",how:"돌진해 오면 '지금!'에 Shift로 옆으로",keys:["Shift"],limit:45,mark:true,
   prog:()=>`${Math.min(1,TUT.c.ramDodge||0)} / 1`,say:[[OP,"주황 드론이 선을 깜빡이면 곧 돌진이에요."]],cue:()=>cueDodge(cueRam(),.22,.7),
   keep:{n:1,kind:"ram",d:[34,42]},enter(){TUT.c.ramDodge=0},done(){return (TUT.c.ramDodge||0)>=1},exit(){tutClear()}},
  {obj:"정예기를 옆이나 뒤에서 베기",how:"부스트로 옆·뒤로 돌아가서 좌클릭",keys:["Shift","A","D","LMB"],limit:60,mark:"elite",
   prog:()=>`${Math.min(1,TUT.c.elite||0)} / 1`,say:[[OP,"파란 실드 정예기. 굼뜨니까 돌아 들어가요."]],
   keep:{n:1,kind:"elite",d:[26,32]},enter(){TUT.c.elite=0;TUT.c.eliteBlock=0;TUT.ebSaid=false},
   tick(){if((TUT.c.eliteBlock||0)>0&&!TUT.ebSaid){TUT.ebSaid=true;popText("막혔어요 · 실드 반대편으로!")}},
   done(){return (TUT.c.elite||0)>=1},exit(){tutClear()}},
  {obj:"이족보행 MS 격파",how:"한 번 베고, 비틀거릴 때 한 번 더",keys:["LMB","Shift"],limit:60,mark:"ms",
   prog:()=>`${Math.min(1,TUT.c.ms||0)} / 1`,say:[[OP,"적 MS 접근. 한 번에 안 쓰러져요, 두 번 베요."]],
   keep:{n:1,kind:"ms",d:[26,34]},enter(){TUT.c.ms=0},done(){return (TUT.c.ms||0)>=1},exit(){tutClear()}},
  {obj:"중력탄으로 적을 모은 뒤 베기",how:"Q로 적을 모으고 좌클릭 · 중력탄은 실전에서 보급 컨테이너에서만",keys:["Q","LMB"],hl:"wGrav",limit:50,mark:true,
   prog:()=>`${Math.min(1,TUT.c.grav||0)} / 1`,say:[[OP,"모인 덩어리를 베어 날리면 연쇄 폭발이 크게 터져요."]],
   keep:{n:5,passive:true,d:[26,40]},enter(){TUT.c.grav=0;G.grav=Math.max(G.grav||0,2)},tick(){if(G.grav<1&&!(TUT.c.grav>0))G.grav=1},done(){return (TUT.c.grav||0)>=1&&TUT.t>4},exit(){tutClear()}},
  {obj:"옵션 장비 알아보기",how:"출격할 때는 아래 4가지 중 1개만 골라 장착해요. 지금은 시험 삼아 하나씩 전부 써 볼게요. Enter를 누르면 시작해요.",keys:["Enter"],limit:20,
   say:[[OP,"이번엔 옵션 장비예요. 실전에서는 하나만 들고 나가요. 뭐가 맞는지 여기서 골라 봐요."]],
   enter(){TUT.c.next=0;tutUnitsCard(true)},done(){return (TUT.c.next||0)>0},exit(){tutUnitsCard(false)}},
  unitStep("mega"),unitStep("pods"),unitStep("missile"),unitStep("shield"),
  {obj:"적 에이스 · 칼을 치켜드는 순간 베기 (카운터)",how:"에이스가 칼을 들어 올리면 화면이 느려지며 '지금!'이 떠요. 그때 좌클릭. 그냥 피한 뒤 빈틈에 베어도 돼요.",keys:["LMB","Shift"],limit:75,mark:true,
   prog:()=>`${Math.min(1,TUT.c.counter||0)} / 1`,
   say:[[ACE,"…신참인가. 오늘 밤 유성이 하나 더 늘겠군."],[OP,"적 에이스! 칼을 치켜드는 순간을 노려요!"]],
   cue:()=>{for(const e of enemies)if(e.tutAce&&e.alive&&e.bs==="wind"&&e.m.position.distanceTo(S.pos)<40)return {now:true,key:"LMB"};return null},
   ace:true,enter(){tutRestoreUnit();tutAce()},
   done(){return (TUT.c.counter||0)>=1}},
  {obj:"귀환",how:"수고했어요. 잠시 후 튜토리얼이 끝나요.",say:[[ACE,"…좋은 반응이다. 다음에 떨어지는 건 네 쪽일지도 모르지."],[OP,"추진제 한계예요. …버텼네요. 귀환해요, 우리엘 1."]],
   enter(){setTimeout(()=>{for(const e of enemies)if(e.tutAce){fxExplosion(e.m.position,.8);sfx("dash",e.m.position);e.alive=false;disposeEnemy(e)}enemies.length=0},2600);setTimeout(tutEnding,6500)},done(){return false}}];
// recorded operator lines for steps 1-13 (10/29): subtitles match the audio; r = repeat when the player is stuck
const TUT_VO=[
 {t:"우리엘 1, 조작 훈련을 시작합니다. 일시정지는 Esc 키입니다. 화면을 한 번 클릭하세요. 커서가 사라지면 조종이 시작됩니다."},
 {t:"마우스를 좌우, 위아래로 크게 움직이세요. 화면 중앙의 표시가 조준선입니다. 마우스로 적에게 맞춰 조준합니다."},
 {t:"전진은 W, 후진은 S, 왼쪽은 A, 오른쪽은 D 키입니다. 노란 고리를 화면 중앙에 맞추고 W 키를 계속 눌러 고리까지 이동하세요.",r:"노란 고리를 바라보고 W 키를 계속 누르세요."},
 {t:"Space 키를 누른 채 위로 이동하고 손을 떼세요. 이번엔 C 키를 누른 채 아래로 이동하세요. 위아래 모두 움직이면 통과입니다."},
 {t:"W 키와 Shift 키를 함께 길게 누르세요. 부스트로 빠르게 전진합니다. 부스트 게이지가 소모되며, Shift 키를 놓으면 회복됩니다."},
 {t:"Shift 키를 짧게 눌렀다 바로 떼세요. 길게 누르면 부스트, 짧게 누르면 회피입니다. A나 D 키를 함께 누르면 옆으로 피합니다. 회피를 두 번 실시하세요.",r:"Shift 키를 짧게 눌렀다 바로 떼세요."},
 {t:"노란 화살표가 가리키는 적에게 조준선을 맞추세요. 조준선이 빨갛게 변하면 마우스 오른쪽 버튼으로 사격하세요. 정찰기 3기를 격추하세요.",r:"조준선을 적에게 맞추고, 빨갛게 변하면 마우스 오른쪽 버튼을 누르세요."},
 {t:"적을 조준하고 마우스 왼쪽 버튼을 리듬에 맞춰 세 번 이어 누르세요. 자동으로 파고들어 벱니다. 세 번째 베기가 가장 강합니다."},
 {t:"적탄이 닿기 직전에 회피합니다. '지금' 신호에 Shift 키를 짧게 눌렀다 떼세요. 두 번 성공하면 통과입니다.",cue:1},
 {t:"주황색 드론이 몸으로 돌진합니다. 드론을 바라보고 A나 D 키를 누른 채 대기하세요. '지금' 신호에 Shift 키를 짧게 눌렀다 떼어 옆으로 피하세요.",cue:1},
 {t:"파란 실드는 정면 공격을 막습니다. Shift 키와 A 또는 D 키를 길게 눌러 옆이나 뒤로 돌아가세요. 적을 조준하고 마우스 왼쪽 버튼으로 베세요.",r:"정면은 막힙니다. 옆이나 뒤에서 베세요."},
 {t:"적을 조준하고 마우스 왼쪽 버튼으로 베세요. 첫 공격은 장갑이 막습니다. 적이 비틀거리면 왼쪽 버튼을 다시 눌러 한 번 더 베세요. 연사 예고가 뜨면 Shift 키로 먼저 회피하세요."},
 {t:"적 무리를 바라보고 Q 키를 한 번 누르세요. 중력탄이 적을 한곳에 모읍니다. 모인 적을 조준하고 마우스 왼쪽 버튼으로 베어 날려 연쇄 폭발을 일으키세요.",r:"Q 키로 적을 모은 뒤 왼쪽 버튼으로 베세요."}];
const tutVoId=(i,x)=>"tut_"+String(i+1).padStart(2,"0")+(x?"_"+x:"");
function tutVoIds(){const a=[];TUT_VO.forEach((v,i)=>{a.push(tutVoId(i));if(v.r)a.push(tutVoId(i,"retry"));if(v.cue)a.push(tutVoId(i,"ready"),tutVoId(i,"now"))});a.push("tut_09_success");return a}
const voBusy=()=>VO_A&&!VO_A.paused&&!VO_A.ended;
// short cue lines ("회피 준비", "지금!") play on their own channel so they never cut the step's instructions
let TUT_CUE_A=null;function tutCueVo(id){if(!AUD.on)return;try{if(TUT_CUE_A)TUT_CUE_A.pause();const a=(VO_CACHE[id]||new Audio(voUrl(id)));try{a.currentTime=0}catch(_){}a.volume=Math.min(1,(AUD.vol??.9)*1.05);a.play().catch(()=>{});TUT_CUE_A=a}catch(_){}}
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
function tutSay(lines){const tok=TUT.sayTok=(TUT.sayTok||0)+1;(lines||[]).forEach((l,i)=>setTimeout(()=>{if(TUT.on&&TUT.sayTok===tok)radio(l[0],l[1])},i*4300))}
const tutVal=(s,k)=>typeof s[k]==="function"?s[k]():s[k];
// keycaps for the current step; each lights up while that key / button is held
function tutKeysSet(list){const box=$("tutKeys");const sig=(list||[]).join(",");if(box.dataset.sig===sig)return;box.dataset.sig=sig;box.innerHTML="";
  for(const k of list||[]){const el=document.createElement("kbd");el.dataset.k=k;el.textContent=KEYLBL[k]||k;if(k==="Mouse"||k==="LMB"||k==="RMB")el.classList.add("wide");box.appendChild(el)}
  box.hidden=!(list&&list.length)}
function tutKeyLight(code,on){if(!TUT.on&&!VST.on)return;for(const el of $("tutKeys").children){const c=KEYCAP[el.dataset.k];if(c&&c.includes(code))el.classList.toggle("on",on)}}
addEventListener("keydown",e=>{tutKeyLight(e.code,true);if(!TUT.on||SCREEN!=="play"||PAUSED)return;
  if(e.code==="Tab"&&!e.repeat&&TUT.step>=0&&TUT.step<TUT_STEPS.length-1&&!TUT.busy){e.preventDefault();tutPass("건너뜀")}
  if(e.code==="Enter"&&!e.repeat)TUT.c.next=(TUT.c.next||0)+1});
addEventListener("keyup",e=>tutKeyLight(e.code,false));
addEventListener("mousedown",e=>tutKeyLight("mouse"+e.button,true));addEventListener("mouseup",e=>tutKeyLight("mouse"+e.button,false));
addEventListener("mousemove",e=>{if(!TUT.on&&!VST.on||!(e.movementX||e.movementY))return;tutKeyLight("mousemove",true);clearTimeout(TUT.mmT);TUT.mmT=setTimeout(()=>tutKeyLight("mousemove",false),160)});
// highlight the HUD widget the step is about (boost gauge, rifle, blade, unit R / F, grenade)
function tutHl(id){if(TUT.hl===id)return;if(TUT.hl){const o=$(TUT.hl);if(o)o.classList.remove("tutHl")}TUT.hl=id||null;if(id){const o=$(id);if(o)o.classList.add("tutHl")}}
// the 4 option units side by side (shown while the unit section is introduced)
function tutUnitsCard(on){const c=$("tutUnits");if(on&&!c.dataset.built){c.dataset.built=1;c.innerHTML='<p>옵션 장비 4종 · 출격할 때 <b>1개만</b> 골라 장착</p><div class="row">'+
  ["mega","pods","missile","shield"].map(k=>`<div class="u"><img src="ui/u_${k}.webp" alt=""><b>${UNITS[k].name}</b><span>${UNIT_INFO[k]}</span></div>`).join("")+"</div>"}c.hidden=!on}
// arrow over the enemy the step is about (clamped to the screen edge when it is off-screen)
function tutMarkTick(s){const mk=$("tutMark"),want=s.mark;let best=null,bd=1e9;
  if(want)for(const e of enemies){if(!e.alive||e.launched>0)continue;if(want==="elite"&&!e.elite||want==="ms"&&!e.ms)continue;if(s.ace&&!e.tutAce)continue;const d=e.m.position.distanceTo(S.pos);if(d<bd){bd=d;best=e}}
  mk.hidden=!best;if(!best)return;const v=best.m.position.clone().add(new V3(0,3,0)).project(camera);let x=(v.x+1)/2*innerWidth,y=(1-v.y)/2*innerHeight;const behind=v.z>1;if(behind){x=innerWidth-x;y=innerHeight-y}
  const m=60,off=behind||x<m||x>innerWidth-m||y<m||y>innerHeight-m;
  if(off){const cx=innerWidth/2,cy=innerHeight/2,dx=x-cx,dy=y-cy,k=Math.min((cx-m)/Math.abs(dx||1e-6),(cy-m)/Math.abs(dy||1e-6));x=cx+dx*k;y=cy+dy*k;mk.style.setProperty("--rot",Math.atan2(dy,dx)+Math.PI/2+"rad")}else mk.style.setProperty("--rot","0rad");
  mk.style.left=x+"px";mk.style.top=y+"px";mk.classList.toggle("edge",off)}
// "지금!" cue: slow motion while a timed input is coming, big prompt in the window itself
function tutCueTick(s){const c=s.cue?s.cue():null,el=$("tutCue");if(!c){if(!el.hidden)el.hidden=true;TUT.cueSt=null;return}
  S.slow=Math.max(S.slow||0,.06);el.hidden=false;el.classList.toggle("now",!!c.now);const t=c.now?`지금! ${KEYLBL[c.key]||c.key}`:"준비…";if(el.textContent!==t){el.textContent=t;if(c.now)sfx("lock")}
  const V=TUT_VO[TUT.step],st=c.now?"now":"ready";if(V&&V.cue&&TUT.cueSt!==st&&(st==="now"||!(TUT.cueT>clockT))){TUT.cueSt=st;if(st==="ready")TUT.cueT=clockT+4;tutCueVo(tutVoId(TUT.step,st))}}
function tutStep(i){const prev=TUT_STEPS[TUT.step];if(prev&&prev.exit)prev.exit();TUT.step=i;TUT.t=0;TUT.respT=0;TUT.lastProg=null;TUT.hintSaid=false;const s=TUT_STEPS[i];if(!s)return;
  $("tutObj").hidden=false;tutText(s);$("tutObjProg").textContent=s.prog?s.prog():"";$("tutObjN").textContent=`${i+1} / ${TUT_STEPS.length}`;
  $("tutSkip").hidden=i>=TUT_STEPS.length-1;$("tutCue").hidden=true;
  const o=$("tutObj");o.classList.remove("new","ok");void o.offsetWidth;o.classList.add("new");TUT.cueSt=null;TUT.just0=TUT.c.just||0;const V=TUT_VO[i];if(V){TUT.sayTok=(TUT.sayTok||0)+1;setTimeout(()=>{if(TUT.on&&TUT.step===i)radio(OP,V.t,tutVoId(i))},i?150:500)}else tutSay(s.say);if(s.enter)s.enter()}
function tutText(s){const a=tutVal(s,"obj")||"",b=tutVal(s,"how")||"";if($("tutObjTxt").textContent!==a){$("tutObjTxt").textContent=a;const o=$("tutObj");o.classList.remove("new");void o.offsetWidth;o.classList.add("new")}
  if($("tutObjHow").textContent!==b)$("tutObjHow").textContent=b;tutKeysSet(tutVal(s,"keys"));tutHl(tutVal(s,"hl"))}
function tutPass(why){if(TUT.busy)return;TUT.busy=true;const s=TUT_STEPS[TUT.step];const o=$("tutObj");$("tutCue").hidden=true;
  if(why){popText(why);sfx("ui")}else{sfx("specReady");popText("목표 달성");o.classList.add("ok")}
  setTimeout(()=>{TUT.busy=false;o.classList.remove("ok");if(TUT.on&&TUT_STEPS[TUT.step]===s)tutStep(TUT.step+1)},why?900:1500)}
function tutFrame(dt){if(!TUT.on||SCREEN!=="play"||TUT.step<0){if(!TUT.on&&!$("tutEquip").hidden)tutEquipHide();if(!$("tutKeys").hidden&&!TUT.on&&!VST.on){tutKeysSet(null);tutHl(null);$("tutMark").hidden=$("tutCue").hidden=true}return}
  const s=TUT_STEPS[TUT.step];if(!s)return;TUT.t+=dt;TUT.dt=dt;G.unitCd=0; /* no option-unit cooldown anywhere in the tutorial */
  if(s.tick)s.tick();if(TUT.step===8&&(TUT.c.just||0)>TUT.just0){TUT.just0=TUT.c.just;if(TUT.c.just===1)tutCueVo("tut_09_success")}tutKeep(s,dt);tutText(s);tutMarkTick(s);if(!TUT.busy)tutCueTick(s);
  if(s.prog){const v=s.prog();if(v!==TUT.lastProg){TUT.lastProg=v;$("tutObjProg").textContent=v}}
  if(TUT.wp&&TUT.wp.visible){TUT.wp.userData.ring.lookAt(camera.position);TUT.wp.userData.ring.scale.setScalar(1+Math.sin(TUT.t*4)*.08)}
  // stuck for a while: point at Tab; past the limit: move on so nobody is trapped in a step
  if(s.limit&&!TUT.hintSaid&&TUT.t>s.limit*.5){TUT.hintSaid=true;{const V=TUT_VO[TUT.step];if(V&&V.r&&!voBusy())radio(OP,V.r,tutVoId(TUT.step,"retry"))}$("tutSkip").classList.remove("pulse");void $("tutSkip").offsetWidth;$("tutSkip").classList.add("pulse")}
  if(!TUT.busy&&TUT.t>1&&(!TUT_VO[TUT.step]||TUT.t>7||!voBusy())&&s.done())tutPass();else if(!TUT.busy&&s.limit&&TUT.t>s.limit)tutPass("괜찮아요 · 실전에서 익혀요")}
// no game over in the tutorial: a hit only costs a flash and a shove
function tutHurt(b){if(G.iframe>0)return;G.iframe=1.4;fxImpact(S.pos.clone().add(new V3(0,.8,0)),0xff4030);sfx("hurt");S.shake=.7;S.vel.addScaledVector(b.dir||new V3(0,0,-1),18);
  const h=$("hurt");h.classList.remove("on");void h.offsetWidth;h.classList.add("on");popText("피격 — 실전이었다면 격추예요")}
async function startTutorial(){if(TUT.on||!P)return;sfx("uiok");lock();
  TUT.on=true;TUT.step=-1;TUT.c={};TUT.busy=false;TUT.unit0=UNITS[G.unit]?G.unit:"mega";restart();S.yaw=S.face;S.pitch=-.08;
  const U=UNITS[G.unit];document.documentElement.style.setProperty("--uc",U.css);$("unitName").textContent=U.r;$("specName").textContent=U.f;$("uIconR").src=`ui/r_${G.unit}.webp`;$("uIconF").src=`ui/f_${G.unit}.webp`;buildBits(G.unit);
  $("pName").textContent=PILOT.name||"우리엘 1";$("pDept").textContent="첫 출격";$("pSortie").textContent="—";
  document.body.classList.add("tut");show("launch");
  voPreload(tutVoIds());await playIntro();if(!TUT.on)return;await playCatapult();if(!TUT.on)return;
  show("play");S.started=true;tutStep(0)}
function tutEnding(){if(!TUT.on)return;const n=Math.max(1,(S.kills||0)+(TUT.c.kill||0)*0);$("tutObj").hidden=true;if(document.pointerLockElement)document.exitPointerLock();
  const e=$("tutEnd");$("tutEndA").textContent=`그날 밤, 서울 하늘에는 유성 ${n}개가 내렸다.`;$("tutEndB").textContent="동생은 그중 하나에 소원을 빌었다.";e.hidden=false;e.classList.remove("on");void e.offsetWidth;e.classList.add("on");sfx("phase");
  setTimeout(()=>$("tutGo").focus(),2600)}
function tutExit(to){tutKeysSet(null);tutHl(null);tutUnitsCard(false);$("tutMark").hidden=$("tutCue").hidden=true;if(TUT.unit0&&UNITS[TUT.unit0]){G.unit=TUT.unit0;buildBits(G.unit)}TUT.on=false;TUT.step=-1;tutWaypoint(null);$("tutObj").hidden=true;$("tutEnd").hidden=true;document.body.classList.remove("tut");
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
