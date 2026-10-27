/* ================= server-coordinated 1:1 mech battle ================= */
let VS=null;
const VS_HP=100,VS_ROUND=99,VS_WIN=2;
const VS_UNIT_TEXT={boost:{r:"관통 돌진",f:"궤도 파쇄",desc:"R: 직선 돌진 18 피해 · F: 강화 돌진 28 피해 · 부스트 회복 +30%"},pods:{r:"포드 교차사격",f:"올 레인지",desc:"R: 3발 교차사격 · F: 7발 확산사격 · 20초마다 1발 요격"},missile:{r:"미사일 연사",f:"풀 버스트",desc:"R: 3발 연사 · F: 6발 연사 · 라이플 간격 0.3초"},shield:{r:"반사 장벽",f:"카운터 필드",desc:"R: 1초 방어, 첫 0.25초 반사 · F: 2초 방어 후 12m 충격파 · 저스트 회피 장갑"}};
function vsNow(){return Date.now()+(VS?VS.off:0)}
function vsCanAct(){return !!VS&&VS.phase==="fight"&&!S.ended&&!PAUSED&&S.started&&G.stagger<=0&&vsNow()<VS.endAt}
function vsSkills(){return !!VS&&VS.rules.skills}
function vsSpeed(){return VS&&VS.rules.passives&&P&&P.frame==="swift"?1.15:1}
function vsRegen(){return (VS&&VS.rules.passives&&P&&P.frame==="swift"?1.1:1)*(vsSkills()&&G.unit==="boost"?1.3:1)}
function vsSend(o){if(VS&&VS.ws&&VS.ws.readyState===1)VS.ws.send(JSON.stringify(o))}
function vsLoadout(){vsSend({t:"loadout",frame:P?P.frame:"mk2",unit:G.unit})}
function vsLobby(){
  const v=VS;$("vsRules").hidden=DMODE!=="vs";
  if(!v){$("dUnitField").hidden=DMODE==="vs";$("vsFrameNote").textContent="기체 패시브 꺼짐: 두 기체 모두 장갑 100, 이동·회복 동일";$("vsUnitNote").textContent="옵션의 패시브·R·F 모두 꺼짐";$("vsRulesNote").textContent="방을 만든 뒤 방장이 설정할 수 있습니다. 기본값은 모두 꺼짐입니다.";$("vsPassives").checked=false;$("vsSkills").checked=false;$("vsPassives").disabled=$("vsSkills").disabled=true;return}
  const host=v.side==="a",lobby=v.phase==="wait"||v.phase==="lobby";
  $("vsPassives").checked=v.rules.passives;$("vsSkills").checked=v.rules.skills;
  $("vsPassives").disabled=$("vsSkills").disabled=!host||!lobby;
  $("vsRulesNote").textContent=(host?"방장 설정":"방장이 정한 공통 규칙")+" · 변경 시 두 사람의 준비가 해제됩니다. 경기 중 변경 불가.";
  $("dUnitField").hidden=!v.rules.skills;$("vsUnitNote").textContent=v.rules.skills?VS_UNIT_TEXT[G.unit].desc:"옵션의 패시브·R·F 모두 꺼짐";
  $("vsFrameNote").textContent=v.rules.passives?"Mk-II: 장갑 110 · 스위프트: 장갑 90 / 이동 +15% / 부스트 회복 +10%":"기체 패시브 꺼짐: 두 기체 모두 장갑 100, 이동·회복 동일";
  for(const id of ["dFrames","dUnits"])for(const b of $(id).querySelectorAll("button"))b.disabled=!lobby||(id==="dFrames"&&!FRAMES[b.dataset.df].obj);
  for(const id of ["dCreate","dJoin"])$(id).disabled=true;
  const ps=v.players||{};$("dA").textContent=ps.a?ps.a.name+" · 방장"+(ps.a.ready?" · 준비":""):"—";$("dB").textContent=ps.b?ps.b.name+(ps.b.ready?" · 준비":""):"대기 중…";
  $("dReady").hidden=!(lobby&&ps.a&&ps.b);$("dReady").disabled=!P||!FRAMES[v.oppFrame||"mk2"].gltf;$("dReady").textContent=v.ready?"준비 취소":"준비 완료";
  $("dStatus").textContent=ps.b?"두 사람의 준비를 기다립니다":"상대 기다리는 중";
  $("dNote").textContent="기체와 규칙을 확인하고 두 사람 모두 준비하세요. 전투 화면을 클릭하면 마우스가 고정됩니다.";
}
for(const id of ["vsPassives","vsSkills"])$(id).addEventListener("change",()=>{if(VS&&VS.side==="a")vsSend({t:"rules",passives:$("vsPassives").checked,skills:$("vsSkills").checked})});
function vsOpen(code,name,create=false){
  if(VS)vsClose();VS={code,name,side:null,phase:"wait",hp:100,maxHp:100,oppHp:100,oppMaxHp:100,rules:{passives:false,skills:false},players:{},wins:[0,0],round:0,oppName:"",remote:null,tgt:null,sendT:0,pingT:0,off:0,ready:false};const v=VS;
  const base=window.PVP_URL||((location.protocol==="https:"?"wss://":"ws://")+location.host+"/pvp");
  try{v.ws=new WebSocket(base+"?room="+code+"&name="+encodeURIComponent(name)+"&v=3&create="+(create?1:0))}catch(e){VS=null;duelErr("대전 서버에 연결할 수 없습니다.");return}
  v.ws.onmessage=e=>{if(VS!==v)return;let m;try{m=JSON.parse(e.data)}catch{return}vsMsg(m)};
  v.ws.onclose=()=>{if(VS!==v)return;if(["wait","lobby"].includes(v.phase)){vsClose();duelErr("대전 서버 연결이 종료됐습니다. 방을 다시 만들어 주세요.")}else if(v.phase!=="end"&&!v.matchDone)vsEnd("disconnect")};
  v.ws.onerror=()=>{if(VS===v)duelErr("대전 서버에 연결할 수 없습니다.")};
  $("dCodeBig").textContent=code.split("").join(" ");$("dReady").hidden=true;vsLobby();
}
function vsClose(){const v=VS;if(!v)return;VS=null;applyQuality();try{v.ws.close()}catch{}if(v.remote)scene.remove(v.remote.root);const i=enemies.indexOf(v.tgt);if(i>=0)enemies.splice(i,1);$("oppMark").hidden=$("vsBar").hidden=true;document.body.classList.remove("versus");PAUSED=false;$("pause").hidden=true;for(const id of ["dCreate","dJoin"])$(id).disabled=!SERVER&&!window.PVP_URL;vsLobby();}
function vsClearShots(){for(const b of BOLTS){scene.remove(b.g);b.g.traverse(o=>{if(o.material)o.material.dispose()})}BOLTS.length=0;}
function vsMsg(m){if(!VS)return;const v=VS;
  if(m.t==="seat"){v.side=m.side;vsLoadout();return}
  if(m.t==="error"){vsClose();duelErr(m.message);return}
  if(m.t==="pong"){const rtt=Math.max(0,Date.now()-m.sent);v.off=m.now+rtt/2-Date.now();v.rtt=rtt;return}
  if(m.t==="lobby"){v.phase="lobby";v.players=m.players;v.rules=m.rules;v.ready=!!(m.players[v.side]&&m.players[v.side].ready);const op=m.players[v.side==="a"?"b":"a"];v.oppName=op?op.name:"";v.oppFrame=op?op.frame:"mk2";v.off=m.now-Date.now();vsLobby();return}
  if(m.t==="roundStart"){v.rules=m.rules;v.players=m.players;v.wins=m.wins;v.round=m.round;v.roundAt=m.startAt;v.endAt=m.endAt;v.off=m.now-Date.now();v.phase="count";v.rs=null;v.lastT=0;v.ready=true;v.matchDone=false;
    const me=m.players[v.side],op=m.players[v.side==="a"?"b":"a"];v.maxHp=me.maxHp;v.oppMaxHp=op.maxHp;v.hp=me.hp;v.oppHp=op.hp;v.oppFrame=op.frame;G.unit=me.unit;setFrame(me.frame);vsSpawn();show("play");document.body.classList.add("versus");PAUSED=false;$("pause").hidden=true;$("vsBar").hidden=false;vsLobby();return}
  if(m.t==="state"){if(m.round!==v.round)return;const me=m.players[v.side],op=m.players[v.side==="a"?"b":"a"];if(me){v.hp=me.hp;v.maxHp=me.maxHp;S.boost=me.boost;G.spec=me.spec;G.crit=Math.max(0,(me.crit-vsNow())/1000);G.unitCd=Math.max(0,(me.skillAt-vsNow())/1000);G.barrier=Math.max(0,(me.barrier-vsNow())/1000);G.armor=me.armor?1:0;}if(op){v.oppHp=op.hp;v.oppMaxHp=op.maxHp;}return}
  if(m.t==="pose"){v.rs=m;return}
  if(m.t==="position"){const p=new V3(...m.p);if(p.distanceTo(S.pos)>30)S.pos.copy(p);else v.correctTo=p.sub(S.pos);return}
  if(m.t==="projectile"){if(v.phase!=="fight")return;const from=new V3(...m.from),dir=new V3(...m.dir);fireEnemyBolt(from,dir,false,v.tgt,m.dmg);const b=G.ebolts[G.ebolts.length-1];b.vsVisual=true;b.speed=m.speed;b.life=2.4;b.color=m.color;b.g.children[1].material.color.set(m.color);return}
  if(m.t==="swing"){if(m.side!==v.side)popText(m.heavy?"상대 강공격 · 회피 후 반격":"상대 베기");return}
  if(m.t==="damage"){if(m.side===v.side){v.hp=m.hp;vsDamageFX(new V3(...m.dir),m.kind==="melee")}else{v.oppHp=m.hp;sfx("hit",v.tgt&&v.tgt.m.position);if(v.tgt)fxImpact(v.tgt.m.position,0x40d8ff)}return}
  if(m.t==="block"){if(m.side===v.side){popText(m.kind==="reflect"?"저스트 반사":m.kind==="pod"?"포드 요격":"반응 장갑");sfx("block")}return}
  if(m.t==="dodge"){if(m.side===v.side&&m.just){G.crit=1;popText("저스트 회피 · 1초 안에 반격!");sfx("just");emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x7fe0ff,s0:2,s1:18,life:.45,a:.9})}return}
  if(m.t==="actionRejected"){
    const q=v.skillInput;if(!q||q.seq!==m.seq)return;
    if(["busy","stagger"].includes(m.reason)&&m.retryAt<q.expires){q.sent=false;q.notBefore=m.retryAt+35;return;}
    v.skillInput=null;const why={disabled:"방장이 옵션 스킬을 꺼 두었습니다",phase:"전투 중에 사용할 수 있습니다",heat:"과열 해제 후 사용하세요",charge:"필살기 게이지가 부족합니다",cooldown:"스킬 재사용 대기 중입니다",busy:"공격 동작이 끝난 뒤 사용하세요",stagger:"피격 경직 중입니다"};popText(why[m.reason]||"스킬을 사용할 수 없습니다");sfx("deny");return;
  }
  if(m.t==="skill"){if(m.side===v.side)v.skillInput=null;vsSkillFX(m);return}
  if(m.t==="roundEnd"){if(v.phase==="end")return;v.phase="roundEnd";v.matchDone=m.done;v.wins=m.wins;S.started=false;S.vel.set(0,0,0);S.act=null;S.vsLunge=0;S.dash=0;G.focus=null;vsClearShots();
    for(const b of G.ebolts){scene.remove(b.g);b.g.traverse(o=>{if(o.material)o.material.dispose()})}G.ebolts=[];
    const mine=m.winner===v.side;cutin(m.winner===null?"DRAW":mine?"ROUND WIN":"ROUND LOST",m.winner===null?"동점 · 같은 라운드 재경기":(m.why==="ko"?"격파":"남은 장갑 비율 판정")+` · ${v.wins[0]} : ${v.wins[1]}`);
    if(m.done)setTimeout(()=>{if(VS===v)vsEnd("done")},2400);return}
  if(m.t==="left"){if(v.matchDone)return;if(["wait","lobby"].includes(v.phase)){vsClose();duelErr("상대가 나갔습니다. 방을 다시 만들어 주세요.")}else vsEnd("left");}
}
function vsDamageFX(dir,melee){G.iframe=melee?.7:.12;G.stagger=melee?.3:.08;S.vel.addScaledVector(dir,melee?22:8);S.act=null;S.dash=0;S.vsLunge=0;S.dashT=null;S.pending=null;VS.shotToken=(VS.shotToken||0)+1;
  fxImpact(S.pos.clone().add(new V3(0,.8,0)),0xff4030);sfx(melee?"heavy":"hurt");S.shake=melee?.7:.3;const h=$("hurt");h.classList.remove("on");void h.offsetWidth;h.classList.add("on");}
function vsAttackHit(heavy,crit,at){fxSlashHit(at,crit?0x7fe0ff:0xff8a2a,heavy||crit);sfx(heavy?"heavy":"slash",at);S.dashT=null;}
function vsSkill(special=false){
  if(!VS||VS.phase!=="fight"||S.ended||PAUSED){popText("전투 중에 사용할 수 있습니다");return;}
  if(!vsSkills()){popText("방장이 옵션 스킬을 꺼 두었습니다");sfx("deny");return;}
  if(S.over>0){popText("과열 해제 후 사용하세요");return;}
  if(special?G.spec<100:G.unitCd>.08){popText(special?`필살기 게이지 ${Math.floor(G.spec)}% / 100%`:`스킬 재사용 ${G.unitCd.toFixed(1)}초`);sfx("deny");return;}
  if(VS.skillInput&&VS.skillInput.sent)return;
  VS.skillInput={special,seq:VS.inputSeq=(VS.inputSeq||0)+1,expires:vsNow()+1300,notBefore:0,sent:false};
  if(S.attackCd>0||S.shotCd>0||G.stagger>0)popText("스킬 입력 예약 · 동작 종료 후 발동");vsFlushSkill();
}
function vsFlushSkill(){const v=VS,q=v&&v.skillInput;if(!q)return;
  if(v.phase!=="fight"||PAUSED||S.ended){v.skillInput=null;return;}
  if(q.sent){if(vsNow()>q.sentAt+3000){v.skillInput=null;popText("서버 응답 지연 · 연결을 확인하세요");}return;}
  if(vsNow()>q.expires){v.skillInput=null;popText("스킬 입력 만료 · 다시 눌러주세요");return;}
  if(!vsCanAct()||S.attackCd>0||S.shotCd>0||vsNow()<q.notBefore)return;
  q.sent=true;q.sentAt=vsNow();vsSend({t:"skill",special:q.special,seq:q.seq,dir:aimDir().toArray()});S.attackCd=S.shotCd=.4;
}
// Smooth optional tracking; nearby crossings must never spin the camera around.
function vsFocusCamera(rdt){if(!G.focus||!targetable(G.focus))return;const d=G.focus.m.position.clone().sub(S.pos),hz=Math.hypot(d.x,d.z);if(hz<12)return;
  const wanted=Math.atan2(d.x,d.z),dy=Math.atan2(Math.sin(wanted-S.yaw),Math.cos(wanted-S.yaw)),dt=Math.min(rdt,.05);
  if(Math.abs(dy)>.06)S.yaw+=clamp(dy*(1-Math.exp(-2*dt)),-.9*dt,.9*dt);
  const pitch=clamp(Math.atan2(d.y-1.5,hz)*.65-.04,-.35,.3);S.pitch+=clamp((pitch-S.pitch)*(1-Math.exp(-2*dt)),-.3*dt,.3*dt);
}
function vsSkillFX(m){const mine=m.side===VS.side,pos=mine?S.pos:VS.tgt&&VS.tgt.m.position;if(!pos)return;emit(ADD,{pos:pos.clone(),tex:TX.ring,color:UNITS[m.unit].color,s0:2,s1:m.special?24:12,life:.45});sfx(m.special?"specCharge":"throw",pos);if(mine){popText(VS_UNIT_TEXT[m.unit][m.special?"f":"r"]);if(m.unit==="boost"){S.vsLunge=.24;S.vsDir=new V3(...m.dir).multiplyScalar(95);S.bladeOn=.7;startAct("slash3")}}}
function vsSpawn(){const v=VS,a=v.side==="a";const i=enemies.indexOf(v.tgt);if(i>=0)enemies.splice(i,1);vsClearShots();restart();S.vsLunge=0;S.shotCd=S.attackCd=0;S.aimT=0;S.face=S.yaw=a?0:Math.PI;S.pitch=-.05;S.pos.set(0,0,a?-26:26);S.vel.set(0,0,0);S.time=99;G.focus=null;target=null;v.shotToken=(v.shotToken||0)+1;v.skillInput=null;v.correctTo=null;P.root.visible=true;camera.position.copy(S.pos).addScaledVector(camFwd(),-10).add(new V3(0,2.8,0));camera.fov=68;camera.updateProjectionMatrix();applyQuality();
  const want=FRAMES[v.oppFrame]&&FRAMES[v.oppFrame].gltf?v.oppFrame:"mk2";if(v.remote&&v.remote.frame!==want){scene.remove(v.remote.root);v.remote=null}if(!v.remote)v.remote=buildPlayer(FRAMES[want].gltf,want,true);
  scene.add(v.remote.root);v.remote.root.visible=true;v.remote.root.position.set(0,0,a?26:-26);v.remote.root.rotation.y=a?Math.PI:0;
  v.tgt={m:v.remote.root,v:new V3(),spin:new V3(),alive:true,launched:0,isRemote:true,rad:3,tele:0,flash:0,fireT:99};enemies.push(v.tgt);buildBits(G.unit);
  $("pName").textContent=v.name;$("pDept").textContent="1:1 기체 대전";$("pSortie").textContent="비순위";$("uIconR").src=`ui/r_${G.unit}.webp`;$("uIconF").src=`ui/f_${G.unit}.webp`;
}
function vsEnd(why){const v=VS;if(!v||v.phase==="end")return;v.phase="end";S.started=false;S.ended=true;PAUSED=false;$("pause").hidden=true;const mi=v.side==="a"?0:1,me=v.wins[mi],op=v.wins[1-mi],win=why==="left"||me>op;
  if(document.pointerLockElement)document.exitPointerLock();music(null);sfx("end");$("vsBar").hidden=$("oppMark").hidden=true;
  $("rScore").textContent=`${me} : ${op}`;$("rKills").textContent=me;for(const id of ["rCombo","rChain","rBest"])$(id).textContent="—";$("rSortie").textContent="1:1 기체 대전 · 비순위";$("rDebrief").innerHTML="";$("rRank").textContent="기체 대전 결과는 순위·출격 횟수에 반영되지 않습니다.";
  $("rPb").textContent=why==="disconnect"?"연결 종료 · 결과 미확정":(win?"승리":"패배")+" · "+v.name+" vs "+v.oppName+(why==="left"?" · 상대 이탈":"");const ag=$("againBtn");ag.disabled=false;ag.firstChild.textContent="쇼다운 로비로 ";DUELDONE=true;show("result");vsClose();}
function vsTimeUp(){if(VS)S.time=0;}
function vsTick(rdt){if(!VS)return;const v=VS;vsFlushSkill();if(v.correctTo){const delta=v.correctTo.clone().multiplyScalar(1-Math.exp(-10*Math.min(rdt,.05)));S.pos.add(delta);v.correctTo.sub(delta);if(v.correctTo.length()<.1)v.correctTo=null;}v.pingT-=rdt;if(v.pingT<=0){v.pingT=2;vsSend({t:"ping",sent:Date.now()})}
  if(v.phase==="count"){const left=v.roundAt-vsNow(),t=Math.ceil(left/1000);if(t>0&&t<=3&&t!==v.lastT){v.lastT=t;phaseBanner({name:String(t),sub:`라운드 ${v.round} · 화면 클릭으로 마우스 고정`});sfx("tick")}if(left<=0){v.phase="fight";S.started=true;G.focus=null;sfx("go");popText("FIGHT · 마우스로 시점 / E로 추적 켜기");music("battle")}}
  if(v.phase==="fight")S.time=Math.max(0,(v.endAt-vsNow())/1000);
  if(!v.remote||SCREEN!=="play")return;
  v.sendT-=rdt;if(v.sendT<=0&&P&&["fight","count"].includes(v.phase)){v.sendT=1/15;const j=[];for(const k in P.SP)j.push(...P.SP[k].x.map(x=>+x.toFixed(3)));vsSend({t:"pose",p:S.pos.toArray().map(x=>+x.toFixed(2)),f:+S.face.toFixed(3),j,bl:P.bladeLen,r:P.rifleS,boosting:vsCanAct()&&S.over<=0&&S.boost>0&&(keys.ShiftLeft||keys.ShiftRight)&&["KeyW","KeyA","KeyS","KeyD","Space","KeyC"].some(k=>keys[k])})}
  // follow the remote state
  const R=VS.remote,s=VS.rs;
  if(s){if(s.fr&&s.fr!==VS.oppFrame){VS.oppFrame=s.fr}
    const k=1-Math.exp(-14*rdt);R.root.position.lerp(new V3(s.p[0],s.p[1]+Math.sin(clockT*1.6)*.12,s.p[2]),k);
    let d=s.f-R.root.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));R.root.rotation.y+=d*k;
    let i=0;for(const key in R.SP){const b=R.J[key];if(b&&s.j.length>=i+3){b.rotation.x+=(s.j[i]-b.rotation.x)*k;b.rotation.y+=(s.j[i+1]-b.rotation.y)*k;b.rotation.z+=(s.j[i+2]-b.rotation.z)*k}i+=3}if(R.sync)R.sync();
    R.beam.scale.z=Math.max(.001,s.bl);R.beam.visible=s.bl>.02;R.J.rifle.scale.setScalar(s.r||1);
    R.flames.forEach(g=>g.scale.set(1,1+Math.sin(clockT*40)*.1,1))}
  // soft arena boundary
  const r=S.pos.length();if(r>90)S.vel.addScaledVector(S.pos.clone().normalize(),-(r-90)*5*rdt);
  // opponent marker: always on screen, clamped to the edge when the enemy is behind or off-screen
  {const mk=$("oppMark"),R2=VS.remote.root;mk.hidden=!(R2.visible&&VS.phase!=="end");if(!mk.hidden){const pp=R2.position.clone().add(new V3(0,2.5,0)),v=pp.clone().project(camera);
    let x=(v.x+1)/2*innerWidth,y=(1-v.y)/2*innerHeight;const behind=v.z>1;if(behind){x=innerWidth-x;y=innerHeight-y}
    const m=56,off=behind||x<m||x>innerWidth-m||y<m||y>innerHeight-m;
    if(off){const cx=innerWidth/2,cy=innerHeight/2,dx=x-cx,dy=y-cy,k=Math.min((cx-m)/Math.abs(dx||1e-6),(cy-m)/Math.abs(dy||1e-6));x=cx+dx*k;y=cy+dy*k}
    mk.style.left=x+"px";mk.style.top=y+"px";mk.classList.toggle("edge",off);setT("oppTxt",`${VS.oppName||"상대"} · ${Math.round(R2.position.distanceTo(S.pos))}m`)}}

  setW("vsHpMe",v.hp/v.maxHp*100);setW("vsHpOp",v.oppHp/v.oppMaxHp*100);setT("vsMeN",`${v.name} · ${v.hp}/${v.maxHp}`);setT("vsOpN",`${v.oppName} · ${v.oppHp}/${v.oppMaxHp}`);const mi=v.side==="a"?0:1;setT("vsScore",`${v.wins[mi]} : ${v.wins[1-mi]}`);setT("vsRound",`ROUND ${v.round} · ${Math.round(v.rtt||0)}ms`);
}
function vsHud(){if(!VS)return;const on=vsSkills();setT("phaseTag",`기체 패시브 ${VS.rules.passives?"ON":"OFF"} · 옵션 ${on?"ON":"OFF"}`);setT("unitName",on?VS_UNIT_TEXT[G.unit].r+(G.unitCd>0?` ${G.unitCd.toFixed(1)}`:""):"옵션 꺼짐");setT("specName",on?VS_UNIT_TEXT[G.unit].f:"필살기 꺼짐");setC("wUnit","off",!on);setC("wSpec","off",!on);setC("wUnit","ready",on&&G.unitCd<=0);setC("wSpec","ready",on&&G.spec>=100);setT("chainNow",S.attackCd>0?"공격 후 빈틈":"18m 이내 돌진");if(S.boost<25)setT("warn","부스트 부족 — 회피 불가");}
