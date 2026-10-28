/* ================= server-coordinated 1:1 mech battle ================= */
let VS=null;
const VS_HP=180,VS_ROUND=75,VS_WIN=2,VS_INTERP=100,VS_BOLT=230;
const VS_UNIT_TEXT={mega:{r:"메가 빔",f:"하이퍼 빔",desc:"R: 0.7초 충전 후 0.6초 지속 빔(최대 20) · F: 0.9초 충전 후 2.4초 굵은 빔을 마우스로 쓸기(최대 36, 가드도 깎음) · 라이플 명중 시 필살 +6"},pods:{r:"포드 교차사격",f:"올 레인지",desc:"R: 3발 교차사격 · F: 7발 확산사격 · 20초마다 1발 요격"},missile:{r:"미사일 연사",f:"풀 버스트",desc:"R: 3발 연사 · F: 6발 연사 · 라이플 간격 0.3초"},shield:{r:"반사 장벽",f:"카운터 필드",desc:"R: 1초 방어, 첫 0.25초 반사 · F: 2초 방어 후 12m 충격파 · 저스트 회피 장갑"}};
function vsNow(){return Date.now()+(VS?VS.off:0)}
function vsCanAct(){return !!VS&&VS.phase==="fight"&&!S.ended&&!PAUSED&&S.started&&G.stagger<=0&&vsNow()<VS.endAt}
function vsSkills(){return !!VS&&VS.rules.skills}
function vsSpeed(){return VS&&VS.rules.passives&&P&&P.frame==="swift"?1.15:1}
function vsRegen(){return (VS&&VS.rules.passives&&P&&P.frame==="swift"?1.1:1)}
function vsSend(o){if(["swing","shot","skill","dodge"].includes(o.t))S.guard=false;if(VS&&VS.ws&&VS.ws.readyState===1)VS.ws.send(JSON.stringify(o))}
addEventListener("blur",()=>{if(VS&&S.guard)vsGuard(false)});
function vsLoadout(){vsSend({t:"loadout",frame:P?P.frame:"mk2",unit:G.unit})}
function vsLobby(){
  const v=VS;$("vsRules").hidden=DMODE!=="vs";
  if(!v){$("dUnitField").hidden=DMODE==="vs";$("vsFrameNote").textContent="지금은 두 기체 성능이 같아요";$("vsUnitNote").textContent="";$("vsRulesNote").textContent="";$("vsPassives").checked=false;$("vsSkills").checked=false;$("vsPassives").disabled=$("vsSkills").disabled=true;return}
  const host=v.side==="a",lobby=v.phase==="wait"||v.phase==="lobby";
  $("vsPassives").checked=v.rules.passives;$("vsSkills").checked=v.rules.skills;
  $("vsPassives").disabled=$("vsSkills").disabled=!host||!lobby;
  $("vsRulesNote").textContent=host?"바꾸면 두 사람 모두 다시 준비해야 해요":"방장이 정한 규칙이에요";
  $("dUnitField").hidden=!v.rules.skills;$("vsUnitNote").textContent=v.rules.skills?VS_UNIT_TEXT[G.unit].desc:"";
  $("vsFrameNote").textContent=v.rules.passives?"Mk-II 단단함 · 스위프트 빠름":"지금은 두 기체 성능이 같아요";
  for(const id of ["dFrames","dUnits"])for(const b of $(id).querySelectorAll("button"))b.disabled=!lobby||(id==="dFrames"&&!FRAMES[b.dataset.df].obj);
  for(const id of ["dCreate","dJoin"])$(id).disabled=true;
  const ps=v.players||{};$("dA").textContent=ps.a?ps.a.name+" · 방장"+(ps.a.ready?" · 준비":""):"—";$("dB").textContent=ps.b?ps.b.name+(ps.b.ready?" · 준비":""):"대기 중…";
  $("dReady").hidden=!(lobby&&ps.a&&ps.b);$("dReady").disabled=!P||!FRAMES[v.oppFrame||"mk2"].gltf;$("dReady").textContent=v.ready?"준비 취소":"준비 완료";
  $("dStatus").textContent=ps.b?"상대 입장 완료":"옆 PC에서 이 번호로 참가하세요";
  $("dNote").textContent=!ps.b?"상대가 들어오면 준비 버튼이 나와요":v.ready?"상대가 준비하면 바로 시작해요":"기체를 고르고 준비 완료를 누르세요 · 두 사람 모두 준비하면 시작";
}
for(const id of ["vsPassives","vsSkills"])$(id).addEventListener("change",()=>{if(VS&&VS.side==="a")vsSend({t:"rules",passives:$("vsPassives").checked,skills:$("vsSkills").checked})});
function vsOpen(code,name,create=false){
  if(VS)vsClose();VS={code,name,side:null,phase:"wait",hp:100,maxHp:100,oppHp:100,oppMaxHp:100,rules:{passives:false,skills:false},players:{},wins:[0,0],round:0,oppName:"",remote:null,tgt:null,sendT:0,pingT:0,off:0,ready:false};const v=VS;
  const base=window.PVP_URL||((location.protocol==="https:"?"wss://":"ws://")+location.host+"/pvp");
  if(code==="local"){v.ws=vstLocalSocket(v,name);v.local=true;$("dCodeBig").textContent="연 습";vsLobby();return}
  try{v.ws=new WebSocket(base+"?room="+code+"&name="+encodeURIComponent(name)+"&v=12&create="+(create?1:0))}catch(e){VS=null;duelErr("대전 서버에 연결할 수 없습니다.");return}
  v.ws.onmessage=e=>{if(VS!==v)return;let m;try{m=JSON.parse(e.data)}catch{return}vsMsg(m)};
  v.ws.onclose=()=>{if(VS!==v)return;if(["wait","lobby"].includes(v.phase)){vsClose();duelErr("대전 서버 연결이 종료됐습니다. 방을 다시 만들어 주세요.")}else if(v.phase!=="end"&&!v.matchDone)vsEnd("disconnect")};
  v.ws.onerror=()=>{if(VS===v)duelErr("대전 서버에 연결할 수 없습니다.")};
  $("dCodeBig").textContent=code.split("").join(" ");$("dReady").hidden=true;vsLobby();
}
function vsClose(){const v=VS;if(!v)return;VS=null;if(P)vsPartsReset(P,1);$("vsFp").hidden=true;applyQuality();try{v.ws.close()}catch{}if(v.remote)scene.remove(v.remote.root);const i=enemies.indexOf(v.tgt);if(i>=0)enemies.splice(i,1);$("oppMark").hidden=$("vsBar").hidden=true;document.body.classList.remove("versus");PAUSED=false;$("pause").hidden=true;for(const id of ["dCreate","dJoin"])$(id).disabled=!SERVER&&!window.PVP_URL;vsLobby();}
function vsClearShots(){for(const b of BOLTS){scene.remove(b.g);b.g.traverse(o=>{if(o.material)o.material.dispose()})}BOLTS.length=0;}
function vsMsg(m){if(!VS)return;const v=VS;
  if(m.t==="seat"){v.side=m.side;vsLoadout();return}
  if(m.t==="error"){vsClose();duelErr(m.message);return}
  if(m.t==="pong"){const rtt=Math.max(0,Date.now()-m.sent);v.off=m.now+rtt/2-Date.now();v.rtt=rtt;return}
  if(m.t==="lobby"){v.phase="lobby";v.players=m.players;v.rules=m.rules;v.ready=!!(m.players[v.side]&&m.players[v.side].ready);const op=m.players[v.side==="a"?"b":"a"];v.oppName=op?op.name:"";v.oppFrame=op?op.frame:"mk2";v.off=m.now-Date.now();vsLobby();return}
  if(m.t==="roundStart"){v.rules=m.rules;v.players=m.players;v.wins=m.wins;v.round=m.round;v.roundAt=m.startAt;v.endAt=m.endAt;v.off=m.now-Date.now();v.phase="count";v.rs=null;v.lastT=0;v.ready=true;v.matchDone=false;
    const me=m.players[v.side],op=m.players[v.side==="a"?"b":"a"];v.maxHp=me.maxHp;v.oppMaxHp=op.maxHp;v.hp=me.hp;v.oppHp=op.hp;v.oppFrame=op.frame;G.unit=me.unit;setFrame(me.frame);vsSpawn();show("play");document.body.classList.add("versus");PAUSED=false;$("pause").hidden=true;$("vsBar").hidden=false;vsLobby();return}
  if(m.t==="state"){if(m.round!==v.round)return;const me=m.players[v.side],op=m.players[v.side==="a"?"b":"a"];if(me){v.hp=me.hp;v.maxHp=me.maxHp;S.boost=me.boost;G.spec=me.spec;G.crit=Math.max(0,(me.crit-vsNow())/1000);G.unitCd=Math.max(0,(me.skillAt-vsNow())/1000);G.barrier=Math.max(0,(me.barrier-vsNow())/1000);G.armor=me.armor?1:0;v.gp=me.gp??100;v.pt=me.pt||v.pt;if(me.guard===false&&S.guard&&(!keys.KeyQ||vsNow()-(v.guardAt||0)>250))S.guard=false; /* server refused: drop it so a held Q retries */}if(op){v.oppHp=op.hp;v.oppMaxHp=op.maxHp;v.opt=op.pt||v.opt;}return}
  if(m.t==="pose"){v.rs=m;m.rx=vsNow();v.rvel=new V3(...(m.v||[0,0,0]));(v.hist||(v.hist=[])).push({t:m.st||m.rx,p:new V3(...m.p),v:v.rvel.clone()});if(v.hist.length>24)v.hist.shift();return}
  if(m.t==="position"){const p=new V3(...m.p);if(p.distanceTo(S.pos)>30)S.pos.copy(p);else v.correctTo=p.sub(S.pos);return}
  if(m.t==="projectile"){if(v.phase!=="fight")return;const from=new V3(...m.from),dir=new V3(...m.dir);fireEnemyBolt(from,dir,false,v.tgt,m.dmg);const b=G.ebolts[G.ebolts.length-1];b.vsVisual=true;b.speed=m.speed;b.life=2.4;b.color=m.color;b.g.children[1].material.color.set(m.color);return}
  if(m.t==="swing"){if(m.side!==v.side){if(v.remote){v.remote.act="slash"+((m.combo??(m.heavy?2:0))+1);v.remote.actT=0;v.remote.guard=false;vsSwingTell(v.remote,m.heavy)}if(m.heavy)popText("상대 강공격 · 가드 또는 회피")}return}
  if(m.t==="guard"){if(m.side===v.side){S.guard=m.on}else if(v.remote)v.remote.guard=m.on;return}
  if(m.t==="deflect"){const mine=m.side===v.side,at=vsMid(),d=vsAway();sfx("clash",at);sfx("sizzle",at);sparks(at,d,0xffe0a0,40,.5,34);sparks(at,d.clone().negate(),0x9fe8ff,40,.5,26);fxImpact(at,0xffd080);
    emit(ADD,{pos:at,tex:TX.ring,color:0xffe0a0,s0:2,s1:16,life:.3,a:.9});S.hitstop=Math.max(S.hitstop||0,.07);impactPunch(.8);hitMark("block");
    if(mine){popText("튕겨냄! 몰아쳐요");S.attackCd=Math.min(S.attackCd,.22);S.shotCd=Math.min(S.shotCd,.22);S.vel.addScaledVector(d,6);if(v.remote){v.remote.act=null;v.remote.hitT=.3}}
    else{popText("튕겨남 · 다시 받아쳐요");S.act=null;S.vsLunge=0;S.dashT=null;S.attackCd=Math.max(S.attackCd,.3);S.vel.addScaledVector(d,16)}return}
  if(m.t==="clash"){vsClashFX(m.at?new V3(...m.at):null);return}
  if(m.t==="parry"){const mine=m.side===v.side;if(mine){popText("패리! 지금 반격");sfx("clash");sfx("just");flash(.3);S.slow=.4;G.crit=1.2;impactPunch(1.1);emit(ADD,{pos:S.pos.clone().add(new V3(0,1,0)),tex:TX.ring,color:0x7fe0ff,s0:2,s1:22,life:.45,a:.9})}
    else{popText("패리당함 · 경직!");G.stagger=.75;S.act=null;S.vsLunge=0;sfx("clash");sfx("deny");S.shake=.6}vsSparks(.9);return}
  if(m.t==="guardBreak"){const mine=m.side===v.side;sfx("heavy");sfx("clash");vsSparks(1.2);if(mine){S.guard=false;G.stagger=.9;popText("가드 브레이크!");const h=$("hurt");h.classList.remove("on");void h.offsetWidth;h.classList.add("on")}else{popText("가드 브레이크! 몰아쳐요");S.hitstop=.1;impactPunch(.9);hitMark("kill")}return}
  if(m.t==="damage"){if(m.side===v.side){v.hp=m.hp;vsDamageFX(new V3(...m.dir),m.kind==="melee",m)}else{v.oppHp=m.hp;const at=v.tgt&&v.tgt.m.position.clone().add(new V3(0,.8,0));if(m.kind==="chip")return;
      const mel=m.kind==="melee";sfx(mel?(m.heavy?"heavy":"hit"):"hit",at);sfx("thud",at,m.heavy?1:0);if(mel)sfx("sizzle",at);if(at){fxImpact(at,mel?0xff8a2a:0x40d8ff);if(mel)fxSlashHit(at,0xff8a2a,!!m.heavy)}
      hitMark(m.heavy?"kill":"hit");impactPunch(mel?(m.heavy?1:.55):.2);if(mel)S.hitstop=m.heavy?.11:.065;if(v.remote&&mel){v.remote.act=null;v.remote.hitT=.25}}return}
  if(m.t==="block"){const mine=m.side===v.side;
    if(m.kind==="guard"||m.kind==="guardShot"){sfx(m.kind==="guard"?"clash":"block");vsSparks(m.heavy?.8:.5);if(mine){popText(`가드 · ${m.gp}%`);S.hitstop=.05;S.vel.addScaledVector(vsAway(),m.heavy?16:9)}else{hitMark("block");popText(m.kind==="guard"?"막힘 · 가드를 깎아요":"빔 막힘");S.hitstop=.04}return}
    if(mine){popText(m.kind==="reflect"?"저스트 반사":m.kind==="pod"?"포드 요격":"반응 장갑");sfx("block")}return}
  if(m.t==="break"){if(m.side===v.side){G.stagger=0;G.broke=true;S.attackCd=Math.min(S.attackCd,.05);popText("경직 풀기");sfx("just");emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0xffd060,s0:2,s1:16,life:.4,a:.9})}else{popText("상대 경직 풀기");if(v.remote)emit(ADD,{pos:v.remote.root.position.clone(),tex:TX.ring,color:0xffd060,s0:2,s1:14,life:.4,a:.8})}return}
  if(m.t==="breakFail"){popText("부스트 부족 · 경직 풀기 불가");sfx("deny");return}
  if(m.t==="whiff"){if(m.side===v.side){popText("헛스윙 · 빈틈");sfx("deny");S.attackCd=Math.max(S.attackCd,.3)}else{popText("빈틈! 지금 반격");sfx("lock");if(v.remote)v.remote.hitT=.3}return}
  if(m.t==="counter"){const mine=m.side===v.side;sfx("heavy");sfx("clash");vsSparks(1);if(mine){popText("COUNTER!");S.hitstop=.16;S.slow=Math.max(S.slow,.3);impactPunch(1.4);flash(.25)}else{popText("카운터 당함");S.shake=.6}return}
  if(m.t==="read"){const mine=m.side===v.side;if(mine){popText("간파! 크리티컬 반격");sfx("just");S.slow=Math.max(S.slow,.35);G.crit=1.2;impactPunch(.8);emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x7fe0ff,s0:2,s1:20,life:.45,a:.9})}else{popText("간파당함 · 경직");G.stagger=Math.max(G.stagger,.55);S.act=null;S.vsLunge=0;sfx("deny")}return}
  if(m.t==="dodge"){if(m.side===v.side&&m.just){G.crit=Math.max(G.crit,1.2);popText("저스트 회피 · 반격 찬스!");sfx("just");emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x7fe0ff,s0:2,s1:18,life:.45,a:.9})}return}
  if(m.t==="actionRejected"){
    const q=v.skillInput;if(!q||q.seq!==m.seq)return;
    if(["busy","stagger"].includes(m.reason)&&m.retryAt<q.expires){q.sent=false;q.notBefore=m.retryAt+35;return;}
    v.skillInput=null;const why={disabled:"방장이 옵션 스킬을 꺼 두었습니다",phase:"전투 중에 사용할 수 있습니다",heat:"과열 해제 후 사용하세요",charge:"필살기 게이지가 부족합니다",cooldown:"스킬 재사용 대기 중입니다",busy:"공격 동작이 끝난 뒤 사용하세요",stagger:"피격 경직 중입니다"};popText(why[m.reason]||"스킬을 사용할 수 없습니다");sfx("deny");return;
  }
  if(m.t==="part"){vsPartsMsg(m);return}
  if(m.t==="beam"){megaVsBeam(m.side===v.side,!!m.heavy,(m.dur||600)/1000);return}
  if(m.t==="skill"){if(m.side===v.side)v.skillInput=null;vsSkillFX(m);return}
  if(m.t==="roundEnd"){if(v.phase==="end")return;v.phase="roundEnd";v.matchDone=m.done;v.wins=m.wins;S.started=false;S.vel.set(0,0,0);S.act=null;S.vsLunge=0;S.dash=0;G.focus=null;vsClearShots();
    for(const b of G.ebolts){scene.remove(b.g);b.g.traverse(o=>{if(o.material)o.material.dispose()})}G.ebolts=[];
    const mine=m.winner===v.side;cutin(m.winner===null?"DRAW":mine?"라운드 승리":"라운드 패배",m.winner===null?"동점 · 같은 라운드 재경기":(m.why==="ko"?"격파":"남은 장갑 비율 판정")+` · ${v.wins[0]} : ${v.wins[1]}`);
    if(m.done)setTimeout(()=>{if(VS===v)vsEnd("done")},2400);return}
  if(m.t==="left"){if(v.matchDone)return;if(["wait","lobby"].includes(v.phase)){vsClose();duelErr("상대가 나갔습니다. 방을 다시 만들어 주세요.")}else vsEnd("left");}
}
function vsAway(){const R=VS&&VS.remote;return R?S.pos.clone().sub(R.root.position).setY(0).normalize():new V3(0,0,-1)}
function vsMid(){const R=VS&&VS.remote;return R?S.pos.clone().lerp(R.root.position,.5).add(new V3(0,1.2,0)):S.pos.clone()}
function vsSparks(k){const at=vsMid(),d=vsAway();sparks(at,d,0xffe0a0,34,.55,Math.round(30*k));sparks(at,d.clone().negate(),0x9fe8ff,34,.55,Math.round(22*k));fxImpact(at,0xffd080);if(typeof fxElectric==="function")fxElectric(at,1+k*.5)}
function vsClashFX(at){vsSparks(1.2);sfx("clash");sfx("sizzle");S.hitstop=.12;impactPunch(1);flash(.2);S.vel.copy(vsAway().multiplyScalar(26));S.act=null;S.vsLunge=0;S.combo=0;hitMark("block");popText("칼날 격돌!");
  emit(ADD,{pos:at||vsMid(),tex:TX.ring,color:0xffe0a0,s0:2,s1:20,life:.4,a:.9})}
function vsGuard(on){if(!VS||VS.phase!=="fight")return;if(on){if(S.guard||G.stagger>0||S.attackCd>0)return;S.guard=true;VS.guardAt=vsNow();S.act=null;S.vsLunge=0}else{if(!S.guard)return;S.guard=false}vsSend({t:"guard",on})}
function vsDamageFX(dir,melee,m){S.guard=false;G.iframe=melee?.7:.12;G.broke=false;G.stagger=melee?(m&&m.heavy?.9:.65):m&&m.kind==="bolt"?.3:.25;S.vel.addScaledVector(dir,melee?22:8);S.act=null;S.dash=0;S.vsLunge=0;S.dashT=null;S.pending=null;VS.shotToken=(VS.shotToken||0)+1;
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
function vsSkillFX(m){const mine=m.side===VS.side,pos=mine?S.pos:VS.tgt&&VS.tgt.m.position;if(!pos)return;emit(ADD,{pos:pos.clone(),tex:TX.ring,color:UNITS[m.unit].color,s0:2,s1:m.special?24:12,life:.45});sfx(m.special?"specCharge":"throw",pos);if(m.unit==="mega"){const R=VS.remote;megaVsFx(()=>mine?megaMuzzle():R&&R.root?R.root.position.clone().add(new V3(0,1.2,0)):pos.clone(),new V3(...m.dir),!!m.special)}if(mine){popText(VS_UNIT_TEXT[m.unit][m.special?"f":"r"])}}
function vsSpawn(){const v=VS,a=v.side==="a";S.guard=false;v.gp=100;v.fp=false;v.pt=v.opt=null;v.rdisp=null;v.rvel=null;v.rs=null;v.hist=[];const i=enemies.indexOf(v.tgt);if(i>=0)enemies.splice(i,1);vsClearShots();restart();S.vsLunge=0;S.shotCd=S.attackCd=0;S.aimT=0;S.face=S.yaw=a?0:Math.PI;S.pitch=-.05;S.pos.set(0,0,a?-26:26);S.vel.set(0,0,0);S.time=VS_ROUND;G.focus=null;target=null;v.shotToken=(v.shotToken||0)+1;v.skillInput=null;v.correctTo=null;P.root.visible=true;vsPartsReset(P,VS_MS);camera.position.copy(S.pos).addScaledVector(camFwd(),-14.5).add(new V3(0,3.9,0));camera.fov=68;camera.updateProjectionMatrix();applyQuality();
  const want=FRAMES[v.oppFrame]&&FRAMES[v.oppFrame].gltf?v.oppFrame:"mk2";if(v.remote&&v.remote.frame!==want){scene.remove(v.remote.root);v.remote=null}if(!v.remote)v.remote=buildPlayer(FRAMES[want].gltf,want,true);
  if(!v.remote.halo){const h=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff3a30,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));h.scale.setScalar(9);h.position.y=1;v.remote.root.add(h);v.remote.halo=h}
  scene.add(v.remote.root);v.remote.root.visible=true;vsPartsReset(v.remote,VS_MS);v.remote.root.position.set(0,0,a?26:-26);v.remote.root.rotation.y=a?Math.PI:0;
  v.remote.act=null;v.remote.guard=false;v.tgt={m:v.remote.root,v:new V3(),spin:new V3(),alive:true,launched:0,isRemote:true,rad:3.4,tele:0,flash:0,fireT:99};enemies.push(v.tgt);buildBits(G.unit);
  $("pName").textContent=v.name;$("pDept").textContent="1:1 기체 대전";$("pSortie").textContent="비순위";$("uIconR").src=`ui/r_${G.unit}.webp`;$("uIconF").src=`ui/f_${G.unit}.webp`;
}
function vsEnd(why){const v=VS;if(!v||v.phase==="end")return;v.phase="end";S.started=false;S.ended=true;PAUSED=false;$("pause").hidden=true;const mi=v.side==="a"?0:1,me=v.wins[mi],op=v.wins[1-mi],win=why==="left"||me>op;
  if(document.pointerLockElement)document.exitPointerLock();music(null);sfx("end");$("vsBar").hidden=$("oppMark").hidden=true;
  $("rScore").textContent=`${me} : ${op}`;$("rKills").textContent=me;for(const id of ["rCombo","rChain","rBest"])$(id).textContent="—";$("rSortie").textContent="1:1 기체 대전 · 비순위";$("rDebrief").innerHTML="";$("rRank").textContent="기체 대전 결과는 순위·출격 횟수에 반영되지 않습니다.";
  $("rPb").textContent=why==="disconnect"?"연결 종료 · 결과 미확정":(win?"승리":"패배")+" · "+v.name+" vs "+v.oppName+(why==="left"?" · 상대 이탈":"");const ag=$("againBtn");ag.disabled=false;ag.firstChild.textContent="쇼다운 로비로 ";DUELDONE=true;show("result");vsClose();}
function vsTimeUp(){if(VS)S.time=0;}
function vsTick(rdt){if(!VS)return;const v=VS;vsFlushSkill();if(v.correctTo){const delta=v.correctTo.clone().multiplyScalar(1-Math.exp(-10*Math.min(rdt,.05)));S.pos.add(delta);v.correctTo.sub(delta);if(v.correctTo.length()<.1)v.correctTo=null;}v.pingT-=rdt;if(v.pingT<=0){v.pingT=2;vsSend({t:"ping",sent:Date.now(),rtt:v.rtt||0})}
  if(v.phase==="count"){const left=v.roundAt-vsNow(),t=Math.ceil(left/1000);if(t>0&&t<=3&&t!==v.lastT){v.lastT=t;phaseBanner({name:String(t),sub:`라운드 ${v.round} · 화면 클릭으로 마우스 고정`});sfx("tick")}if(left<=0){v.phase="fight";S.started=true;G.focus=null;sfx("go");popText("FIGHT · Q 길게: 사벨 가드 · 맞기 직전 가드 = 패리");music("battle")}}
  if(v.phase==="fight")S.time=Math.max(0,(v.endAt-vsNow())/1000);
  if(!v.remote||SCREEN!=="play")return;
  vsStumps(P,rdt);vsStumps(v.remote,rdt);vsPartsHud();vsAimLabel();
  // held Q raises the guard the moment it becomes possible (a press during attack recovery is not lost)
  if(v.phase==="fight"&&keys.KeyQ&&!S.guard&&!PAUSED&&G.stagger<=0&&S.attackCd<=0&&vsCanAct())vsGuard(true);
  v.sendT-=rdt;if(v.sendT<=0&&P&&["fight","count"].includes(v.phase)){v.sendT=1/30;const j=[];for(const k in P.SP)j.push(...P.SP[k].x.map(x=>+x.toFixed(3)));vsSend({t:"pose",a:aimDir().toArray().map(x=>+x.toFixed(3)),p:S.pos.toArray().map(x=>+x.toFixed(2)),v:S.vel.toArray().map(x=>+x.toFixed(1)),f:+S.face.toFixed(3),j,bl:P.bladeLen,r:P.rifleS,boosting:vsCanAct()&&S.over<=0&&S.boost>0&&(keys.ShiftLeft||keys.ShiftRight)&&["KeyW","KeyA","KeyS","KeyD","Space","KeyC"].some(k=>keys[k])})}
  // follow the remote state
  const R=VS.remote,s=VS.rs;
  if(s){if(s.fr&&s.fr!==VS.oppFrame){VS.oppFrame=s.fr}
    // smooth display: play the opponent ~100 ms in the past, interpolating between received poses (no extrapolation
    // overshoot, so fast dodges read as a quick dash instead of a teleport); only fall back to a short extrapolation
    const k=1-Math.exp(-14*rdt),H=v.hist||[],rt=vsNow()-VS_INTERP;let want=null;
    for(let i=H.length-1;i>0;i--){if(H[i-1].t<=rt){const a=H[i-1],b=H[i],u=clamp((rt-a.t)/Math.max(1,b.t-a.t),0,1);want=a.p.clone().lerp(b.p,u);break}}
    if(!want){const last=H[H.length-1];want=last?last.p.clone().addScaledVector(last.v,clamp((rt-last.t)/1000,0,.12)):new V3(s.p[0],s.p[1],s.p[2])}
    const prev=v.rdisp?v.rdisp.clone():want.clone();v.rdisp=v.rdisp||want.clone();const err=want.clone().sub(v.rdisp);if(err.length()>30)v.rdisp.copy(want);else v.rdisp.addScaledVector(err,1-Math.exp(-20*rdt));
    // afterimage streaks when the opponent dashes, so the motion is readable
    {const sp=rdt>0?prev.distanceTo(v.rdisp)/rdt:0;if(sp>32&&rdt>0){const d=v.rdisp.clone().sub(prev).normalize();for(let j=0;j<2;j++)emit(ADD,{pos:prev.clone().lerp(v.rdisp,j/2).add(new V3(0,1,0)),tex:TX.streak,color:0xff7060,vel:d.clone().multiplyScalar(-8),s0:3.2,s1:.6,sx:3,life:.22,a:.55})}}
    R.root.position.set(v.rdisp.x,v.rdisp.y+Math.sin(clockT*1.6)*.12,v.rdisp.z);
    let d=s.f-R.root.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));R.root.rotation.y+=d*k;
    let i=0;for(const key in R.SP){const b=R.J[key];if(b&&s.j.length>=i+3){b.rotation.x+=(s.j[i]-b.rotation.x)*k;b.rotation.y+=(s.j[i+1]-b.rotation.y)*k;b.rotation.z+=(s.j[i+2]-b.rotation.z)*k}i+=3}R.guard=s.g===true||(R.guard&&s.g===undefined);if(R.act){R.actT=(R.actT||0)+rdt;if(R.actT>=ACT[R.act].dur)R.act=null}clipDrive(R,R.act,R.actT||0,R.guard,rdt);if(R.sync)R.sync();
    R.beam.scale.z=Math.max(.001,s.bl);R.beam.visible=s.bl>.02;R.J.rifle.scale.setScalar(s.r||1);
    R.flames.forEach(g=>g.scale.set(1,1+Math.sin(clockT*40)*.1,1))}
  // soft arena boundary
  const r=S.pos.length();if(r>90)S.vel.addScaledVector(S.pos.clone().normalize(),-(r-90)*5*rdt);if(Math.abs(S.pos.y)>38)S.vel.y-=Math.sign(S.pos.y)*(Math.abs(S.pos.y)-38)*6*rdt;
  // opponent marker: always on screen, clamped to the edge when the enemy is behind or off-screen
  {const mk=$("oppMark"),R2=VS.remote.root;mk.hidden=!(R2.visible&&VS.phase!=="end");if(!mk.hidden){const pp=R2.position.clone().add(new V3(0,3.7,0)),v=pp.clone().project(camera);
    let x=(v.x+1)/2*innerWidth,y=(1-v.y)/2*innerHeight;const behind=v.z>1;if(behind){x=innerWidth-x;y=innerHeight-y}
    const m=56,off=behind||x<m||x>innerWidth-m||y<m||y>innerHeight-m;
    if(off){const cx=innerWidth/2,cy=innerHeight/2,dx=x-cx,dy=y-cy,k=Math.min((cx-m)/Math.abs(dx||1e-6),(cy-m)/Math.abs(dy||1e-6));x=cx+dx*k;y=cy+dy*k}
    mk.style.left=x+"px";mk.style.top=y+"px";mk.classList.toggle("edge",off);setT("oppTxt",`${VS.oppName||"상대"} · ${Math.round(R2.position.distanceTo(S.pos))}m`)}}

  setW("vsHpMe",v.hp/v.maxHp*100);setW("vsGpMe",v.gp??100);setC("vsGpMe","low",(v.gp??100)<35);setW("vsHpOp",v.oppHp/v.oppMaxHp*100);setT("vsMeN",`${v.name} · ${v.hp}/${v.maxHp}`);setT("vsOpN",`${v.oppName} · ${v.oppHp}/${v.oppMaxHp}`);const mi=v.side==="a"?0:1;setT("vsScore",`${v.wins[mi]} : ${v.wins[1-mi]}`);setT("vsRound",`${v.round}라운드 · ${Math.round(v.rtt||0)}ms`);
}
function vsHud(){if(!VS)return;const on=vsSkills();setT("phaseTag",`기체 패시브 ${VS.rules.passives?"ON":"OFF"} · 옵션 ${on?"ON":"OFF"}`);setT("unitName",on?VS_UNIT_TEXT[G.unit].r+(G.unitCd>0?` ${G.unitCd.toFixed(1)}`:""):"옵션 꺼짐");setT("specName",on?VS_UNIT_TEXT[G.unit].f:"필살기 꺼짐");setC("wUnit","off",!on);setC("wSpec","off",!on);setC("wUnit","ready",on&&G.unitCd<=0);setC("wSpec","ready",on&&G.spec>=100);setT("chainNow",S.guard?"가드 중 · Q 떼면 해제":S.attackCd>0?"공격 후 빈틈":"24m 이내 돌진 · Q 가드");if(S.boost<20)setT("warn","부스트 부족 — 회피 불가");}
