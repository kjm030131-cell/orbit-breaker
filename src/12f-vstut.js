/* ================= 1:1 showdown tutorial (offline) ================= */
// Runs the real room rules (pvp/src/arena.js, bundled as LOCAL_ARENA by build.py) inside the page and hands the client
// a fake socket, so every judgement (guard, parry, read, whiff, guard break, falloff) is exactly the online one.
// Side "b" is a scripted sparring bot; each step sets how it behaves and what counts as done. HP never runs out.
const VST={on:false,arena:null,step:-1,t:0,c:{},timer:null,busy:false,whiffAt:0,bot:null,ws:null,last:0};
const VST_OP="교관 · 최지우 중위";
function vstLocalSocket(v,name){const A=new LOCAL_ARENA.Arena(LOCAL_ARENA.newRoom());A.s.noParts=true; // practice: no part destruction
VST.arena=A;VST.on=true;VST.step=-1;VST.c={};VST.busy=false;
  VST.bot={p:[0,0,26],f:Math.PI,next:0,cueAt:0,guard:false,side:1,dodgeAt:0};
  const ws={readyState:1,send(t){if(ws.readyState!==1)return;let m;try{m=JSON.parse(t)}catch{return}A.handle("a",m,Date.now());vstFlush()},close(){ws.readyState=3;vstStop()}};VST.ws=ws;
  setTimeout(()=>{if(VS!==v||ws.readyState!==1)return;const now=Date.now();A.join("a",name,now);A.join("b","훈련 교관",now);vsMsg({t:"seat",side:"a"});
    A.handle("b",{t:"ready",ready:true},now);A.handle("a",{t:"ready",ready:true},now);vstFlush();VST.last=now;VST.timer=setInterval(vstTick,33)},0);
  return ws}
function vstStop(){VST.on=false;clearInterval(VST.timer);VST.timer=null;VST.arena=null;$("tutObj").hidden=true;$("tutCue").hidden=true;$("tutSkip").hidden=true;tutKeysSet(null);document.body.classList.remove("tut")}
// deliver room events to the client (and watch them for the step counters)
function vstFlush(){const A=VST.arena;if(!A)return;const s=A.s;
  if(["count","fight"].includes(s.phase)&&s.endAt-s.startAt<3e6)s.endAt=s.startAt+3600e3; // no round clock in training
  for(const {to,m} of A.drain()){if(m.t==="roundStart")m.endAt=s.endAt;vstObserve(m);if(to&&to!=="a")continue;const copy=JSON.parse(JSON.stringify(m));setTimeout(()=>{if(VS&&VS.local)vsMsg(copy)},0)}}
function vstObserve(m){const c=VST.c,now=Date.now();
  if(m.t==="damage"){if(m.side==="b"){c.dmg=(c.dmg||0)+m.d;if(m.kind==="melee"){c.melee=(c.melee||0)+1;if(now-VST.whiffAt<1100)c.punish=(c.punish||0)+1}if(m.kind==="bolt")c.bolt=(c.bolt||0)+1}}
  else if(m.t==="block"&&m.side==="a"&&m.kind==="guard")c.guard=(c.guard||0)+1;
  else if(m.t==="parry"&&m.side==="a")c.parry=(c.parry||0)+1;
  else if(m.t==="read"&&m.side==="a")c.read=(c.read||0)+1;
  else if(m.t==="guardBreak"&&m.side==="b")c.gb=(c.gb||0)+1;
  else if(m.t==="whiff"&&m.side==="b")VST.whiffAt=now;
  else if(m.t==="counter"&&m.side==="a")c.counter=(c.counter||0)+1;
  else if(m.t==="deflect"&&m.side==="a")c.deflect=(c.deflect||0)+1;
  else if(m.t==="clash")c.clash=(c.clash||0)+1;
  if(m.t==="damage"&&m.side==="b"&&m.kind==="bolt"&&m.part==="head")c.head=(c.head||0)+1}

/* ---- steps (10/28 night rework, same look as the single tutorial): obj = what, how = how, keys = keycaps, one skill per step,
   a "준비… / 지금! Q" cue timed from the room's own pending swing, Tab skips, every step passes on its own after `limit` s ---- */
// bot: dist = distance it keeps, swing = seconds between attacks, cue = red ring 0.6 s before each swing, guard = holds guard,
// strafe = circles the player, far = swings from out of reach (always whiffs), mix = sparring AI
const vstIncoming=()=>{const A=VST.arena;if(!A)return null;let best=null;for(const z of A.s.pending)if(z.side==="b"&&z.kind==="melee"){const t=z.at-Date.now();if(best===null||t<best)best=t}return best};
const vstCueIn=key=>()=>{const t=vstIncoming();if(t!==null&&t<=250)return {now:true,key};if(VST.bot&&VST.bot.cueAt||t!==null)return {now:false,key};return null};
const VST_STEPS=[
  {obj:"교관에게 붙어서 베기 3번",how:"24m 안에서 좌클릭하면 알아서 돌진해서 베요. 좌클릭을 리듬 있게 이어 누르면 3연속 콤보, 세 번째가 강공격이에요.",keys:["W","LMB"],limit:60,
   prog:c=>`${Math.min(3,c.melee||0)} / 3`,bot:{dist:9},say:[[VST_OP,"쇼다운 훈련이에요. 판정은 실제 대전과 똑같아요. 1:1은 칼로 이겨요."]],done:c=>(c.melee||0)>=3},
  {obj:"가드로 정면 공격 3번 막기",how:"Q를 누르고 있으면 사벨 가드예요. 정면 공격만 막고, 막을 때마다 체력 바 아래 가드 게이지가 깎여요.",keys:["Q"],limit:50,cue:vstCueIn("Q"),
   prog:c=>`${Math.min(3,c.guard||0)} / 3`,bot:{dist:6.5,swing:1.8,cue:true},say:[[VST_OP,"교관이 공격해요. Q를 꾹 누르고 기다려요."]],done:c=>(c.guard||0)>=3},
  {obj:"패리 · 맞기 직전에 Q",how:"붉은 링이 좁아지다 닫히는 순간, '지금! Q'가 뜰 때 Q를 눌러요. 성공하면 교관이 크게 굳고 내 반격 차례예요.",keys:["Q"],limit:60,cue:vstCueIn("Q"),
   prog:c=>`${Math.min(1,c.parry||0)} / 1`,bot:{dist:6.5,swing:2.6,cue:true},say:[[VST_OP,"Q를 미리 누르고 있으면 그냥 가드예요. 맞기 직전에 눌러야 패리예요."]],done:c=>(c.parry||0)>=1},
  {obj:"칼 맞대기 · 공격 순간에 같이 베기",how:"붉은 링이 닫히는 순간 좌클릭. 상대 칼을 '찡' 하고 튕겨내면 상대가 굳고 내가 먼저 움직여요. 강공격(3타)은 튕길 수 없어요.",keys:["LMB"],limit:60,cue:vstCueIn("LMB"),
   prog:c=>`${Math.min(2,(c.deflect||0)+(c.clash||0))} / 2`,bot:{dist:7,swing:2.4,cue:true},say:[[VST_OP,"1:1의 핵심이에요. 받아치면 튕겨내고, 그대로 몰아치면 돼요."]],done:c=>(c.deflect||0)+(c.clash||0)>=2},
  {obj:"간파 · 맞기 직전에 회피",how:"'지금! Shift'가 뜰 때 Shift. 칼을 피하면서 교관이 굳고, 내 다음 베기가 크리티컬이 돼요. 회피는 부스트를 써요.",keys:["Shift"],limit:60,cue:vstCueIn("Shift"),
   prog:c=>`${Math.min(1,c.read||0)} / 1`,bot:{dist:6.5,swing:2.6,cue:true},say:[[VST_OP,"패리와 같은 타이밍에 Q 대신 Shift예요."]],done:c=>(c.read||0)>=1},
  {obj:"헛스윙 반격",how:"교관이 닿지 않는 거리에서 칼을 휘두르면 '빈틈!'이 떠요. 그때 바로 좌클릭으로 파고들어 베요.",keys:["LMB"],limit:50,
   prog:c=>`${Math.min(1,c.punish||0)} / 1`,bot:{dist:13,swing:2.6,far:true},say:[[VST_OP,"빗나간 베기는 큰 빈틈이에요. 나도 거리 보고 휘둘러요."]],done:c=>(c.punish||0)>=1},
  {obj:"가드 깨기",how:"교관이 가드를 올리고 있어요. 계속 베면 가드 게이지가 바닥나 무너져요. 무너지면 1초 가까이 무방비예요.",keys:["LMB"],limit:50,
   prog:c=>`${Math.min(1,c.gb||0)} / 1`,bot:{dist:7,guard:true},say:[[VST_OP,"가드는 무적이 아니에요. 밀어붙여요."]],done:c=>(c.gb||0)>=1},
  {obj:"머리 노려 쏘기 · 헤드샷 2번",how:"조준선 옆에 '머리'가 뜰 때 우클릭. 머리가 부서지면 상대는 콕핏 1인칭으로만 싸워야 해요. 총은 너무 가깝거나(14m) 멀면(60m) 약해요.",keys:["Mouse","RMB"],limit:60,
   prog:c=>`${Math.min(2,c.head||0)} / 2`,bot:{dist:30,strafe:true},say:[[VST_OP,"팔을 맞히면 팔이, 머리를 맞히면 머리가 부서져요. 실전에선 진짜로 떨어져 나가요."]],done:c=>(c.head||0)>=2},
  {obj:"실전 스파링 · 피해 60 주기",how:"교관이 공격·가드·회피를 섞어요. 부스트로 곧장 파고들면 총에 덜 맞아요. 붙으면 베기, 받아치기, 가드를 섞어서 이겨요.",keys:["LMB","Q","Shift","RMB"],limit:90,
   prog:c=>`${Math.min(60,c.dmg||0)} / 60`,bot:{dist:7,mix:true},say:[[VST_OP,"마지막은 스파링이에요. 상대가 시동 거는 순간 먼저 베면 카운터예요."]],enter(){VST.c.dmg=0},done:c=>(c.dmg||0)>=60}];
function vstStepGo(i){VST.step=i;VST.t=0;VST.c={};VST.busy=false;VST.hint=false;const st=VST_STEPS[i];if(!st){vstFinish();return}
  const b=VST.bot;b.next=Date.now()+1500;b.cueAt=0;if(VST.arena&&VST.arena.s.players.b){VST.arena.handle("b",{t:"guard",on:false},Date.now())}b.guard=false;
  $("tutObj").hidden=false;$("tutObjTxt").textContent=st.obj;$("tutObjHow").textContent=st.how||"";$("tutObjProg").textContent=st.prog(VST.c);$("tutObjN").textContent=`${i+1} / ${VST_STEPS.length}`;
  $("tutSkip").hidden=false;$("tutSkip").classList.remove("pulse");$("tutCue").hidden=true;tutKeysSet(st.keys);
  const o=$("tutObj");o.classList.remove("new","ok");void o.offsetWidth;o.classList.add("new");
  const tok=VST.sayTok=(VST.sayTok||0)+1;st.say.forEach((l,k)=>setTimeout(()=>{if(VST.on&&VST.sayTok===tok)radio(l[0],l[1])},k*4300));if(st.enter)st.enter()}
function vstFinish(){$("tutObj").hidden=true;$("tutCue").hidden=true;tutKeysSet(null);cutin("쇼다운 훈련 완료","이제 실전에서 붙어 보세요");sfx("phase");
  radio(VST_OP,"수고했어요. 판정은 실전과 같아요. 방을 만들어 붙어 봐요.");
  setTimeout(()=>{if(!VS||!VS.local)return;vsClose();if(document.pointerLockElement)document.exitPointerLock();S.started=false;S.ended=true;show("duel")},3200)}
function vstPass(why){if(VST.busy)return;VST.busy=true;$("tutCue").hidden=true;if(why){popText(why);sfx("ui")}else{sfx("specReady");popText("목표 달성");$("tutObj").classList.add("ok")}
  const i=VST.step;setTimeout(()=>{if(VST.on&&VST.step===i)vstStepGo(i+1)},why?900:1500)}
addEventListener("keydown",e=>{if(!VST.on||SCREEN!=="play"||e.code!=="Tab"||e.repeat||VST.busy||VST.step<0)return;e.preventDefault();vstPass("건너뜀")});
function vstCueTick(st){const el=$("tutCue"),c=st&&st.cue&&!VST.busy?st.cue():null;if(!c){if(!el.hidden)el.hidden=true;return}
  el.hidden=false;el.classList.toggle("now",!!c.now);const t=c.now?`지금! ${KEYLBL[c.key]||c.key}`:"준비…";if(el.textContent!==t){el.textContent=t;if(c.now)sfx("lock")}}

/* ---- per tick: room clock, HP floor, bot, step progress ---- */
function vstTick(){const A=VST.arena;if(!A||!VS||!VS.local){vstStop();return}const now=Date.now(),dt=Math.min(.1,(now-VST.last)/1000);VST.last=now;
  A.advance(now);const s=A.s,me=s.players.a,bp=s.players.b;
  if(me&&bp){for(const p of [me,bp])if(p.hp<45){p.hp=p.maxHp;A.status()}
    if(s.phase==="fight"){if(VST.step<0)vstStepGo(0);else vstBot(now,dt,me,bp);vstProgress(dt)}}
  vstFlush()}
function vstProgress(dt){const st=VST_STEPS[VST.step];if(!st)return;VST.t+=dt;const v=st.prog(VST.c);if(v!==VST.lastProg){VST.lastProg=v;$("tutObjProg").textContent=v}vstCueTick(st);
  if(st.limit&&!VST.hint&&VST.t>st.limit*.5){VST.hint=true;const k=$("tutSkip");k.classList.remove("pulse");void k.offsetWidth;k.classList.add("pulse")}
  if(!VST.busy&&VST.t>1&&st.done(VST.c))vstPass();else if(!VST.busy&&st.limit&&VST.t>st.limit)vstPass("괜찮아요 · 실전에서 익혀요")}
function vstBot(now,dt,me,bp){const A=VST.arena,st=VST_STEPS[VST.step],cfg=st?st.bot:{},b=VST.bot;
  const to=[me.p[0]-b.p[0],me.p[1]-b.p[1],me.p[2]-b.p[2]],d=Math.hypot(to[0],to[2])||1e-3,ux=to[0]/d,uz=to[2]/d;
  // movement: hold the step's distance, circle when asked
  const want=cfg.dist||9,err=d-want,sp=Math.min(16,Math.abs(err)*3);let vx=ux*Math.sign(err)*sp,vz=uz*Math.sign(err)*sp;
  if(cfg.strafe||cfg.mix){if(Math.random()<.01)b.side*=-1;const k=cfg.strafe?13:5;vx+=-uz*b.side*k;vz+=ux*b.side*k}
  if(bp.stun>now||bp.lock>now&&!cfg.mix){vx*=.2;vz*=.2}
  b.p=[b.p[0]+vx*dt,Math.max(-4,Math.min(6,b.p[1]+(me.p[1]-b.p[1])*Math.min(1,dt*2))),b.p[2]+vz*dt];
  const r=Math.hypot(b.p[0],b.p[2]);if(r>85){b.p[0]*=85/r;b.p[2]*=85/r}
  b.f=Math.atan2(me.p[0]-b.p[0],me.p[2]-b.p[2]);
  const near=d<14;A.handle("b",{t:"pose",p:b.p.map(x=>+x.toFixed(2)),f:+b.f.toFixed(3),j:[],bl:near?1:0,r:near?.001:1,v:[+vx.toFixed(1),0,+vz.toFixed(1)]},now);
  // guard holding
  const wantGuard=!!cfg.guard||(cfg.mix&&b.mixGuard>now);if(wantGuard!==bp.guard&&now>bp.stun&&now>bp.gbUntil){A.handle("b",{t:"guard",on:wantGuard},now)}
  // attacks (with an optional red ring telegraph that closes exactly when the swing is sent)
  if(cfg.mix){if(now>=b.next&&d<11&&now>bp.lock&&now>bp.stun){const r2=Math.random();
      if(r2<.5){A.handle("b",{t:"guard",on:false},now);A.handle("b",{t:"swing"},now);b.next=now+700+Math.random()*900}
      else if(r2<.75){b.mixGuard=now+700+Math.random()*700;b.next=b.mixGuard+200}
      else{b.next=now+600;if(bp.boost>30)A.handle("b",{t:"dodge"},now)}}}
  else if(cfg.swing&&now>=b.next&&(cfg.far||d<9.5)&&now>bp.stun){
    if(cfg.cue&&!b.cueAt){b.cueAt=now+600;const R=VS.remote;if(R)emit(ADD,{pos:R.root.position.clone(),follow:R.root,off:new V3(0,1.2,0),tex:TX.ring,color:0xff3030,s0:12,s1:1.5,life:.6,a:.95});sfx("tele",R?R.root.position:null,0)}
    if(!cfg.cue||now>=b.cueAt){A.handle("b",{t:"swing"},now);b.cueAt=0;b.next=now+cfg.swing*1000}}
  // dodging the player's shots in the sparring step
  if(cfg.mix&&now>b.dodgeAt&&me.lock>now&&Math.random()<.04&&bp.boost>40){b.dodgeAt=now+1500;A.handle("b",{t:"dodge"},now)}}
function vstStart(){if(VS)return;if(!P){duelErr("기체를 불러오는 중입니다. 잠시 후 다시 눌러 주세요.");return}
  const name=($("dName").value||PILOT.name||"파일럿").trim().slice(0,12)||"파일럿";sfx("uiok");document.body.classList.add("tut");vsOpen("local",name,true)}
$("dTut").addEventListener("click",vstStart);
