/* ================= option units: the chosen pack decides R skill, F special and a passive ================= */
const UNITS={
  mega:{name:"하이퍼 메가 런처 유닛",en:"HM-1",color:0xff4fd8,css:"#ff5ad8",
    r:"메가 빔",rd:"0.6초 충전 후 조준 방향으로 관통 빔 한 방, 경로의 적을 모두 날림",cd:9,
    f:"하이퍼 빔",fd:"1초 충전 후 초대형 빔을 5초간 계속 조사, 마우스로 전장을 쓸어 넘김",
    p:"빔 라이플 명중 시 필살 게이지 +2"},
  pods:{name:"원격 포드 유닛",en:"RF-6",color:0x48d8ff,css:"#48d8ff",
    r:"포드 강습",rd:"포드 3기가 록온 대상을 직접 타격해 날림",cd:8,
    f:"올 레인지",fd:"포드가 70m 안의 적을 한 점으로 끌어모아 폭산, 이어서 3초간 포드가 남은 적을 연속 강습",
    p:"20초마다 적탄 1발 자동 요격"},
  missile:{name:"다탄두 미사일 유닛",en:"MP-12",color:0xff6a3d,css:"#ff6a3d",
    r:"멀티 록",rd:"누르고 있는 동안 최대 6기 표적, 떼면 일제 발사",cd:9,
    f:"풀 버스트",fd:"110m 안의 적 최대 15기에 미사일 일제 사격 2연속 (약점 포드 포함)",
    p:"라이플 연사 간격 −25%"},
  shield:{name:"실드 비트 유닛",en:"SB-4",color:0x8dff7a,css:"#8dff7a",
    r:"반사 장벽",rd:"3초간 장벽 전개, 닿는 적탄을 쏜 적에게 되돌림",cd:10,
    f:"카운터 필드",fd:"6초간 무적 · 적탄을 쏜 적에게 추적 반사 · 1.5초마다 충격파, 종료 시 대형 충격파",
    p:"저스트 회피 시 1회 피격 무효 (25초마다)"}};
const UNIT_KEYS=Object.keys(UNITS);
Object.assign(G,{unitCd:0,proj:[],marks:[],marking:false,markT:0,mega:null,barrier:0,cfield:0,podGuard:0,podsOut:0,podsPull:null});

/* ---- unit visuals riding on the mech ---- */
const BIT={g:new THREE.Group(),items:[],kind:null};scene.add(BIT.g);
const podGeo=new THREE.OctahedronGeometry(.26,0);podGeo.scale(1,.6,2.2);
const bitGeo=new THREE.CircleGeometry(.55,6);
const barrierGeo=new THREE.IcosahedronGeometry(3.6,2);
const barrier=new THREE.Mesh(barrierGeo,new THREE.MeshBasicMaterial({color:0x8dff7a,wireframe:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
barrier.visible=false;scene.add(barrier);
function buildBits(kind){
  BIT.g.clear();BIT.items=[];BIT.kind=kind;
  if(kind==="pods"||kind==="shield"){
    for(let i=0;i<3;i++){const mat=new THREE.MeshStandardMaterial({color:0x33383f,metalness:.7,roughness:.35,envMap:ENV,emissive:UNITS[kind].color,emissiveIntensity:.12,side:THREE.DoubleSide});
      const m=new THREE.Mesh(kind==="pods"?podGeo:bitGeo,mat);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:UNITS[kind].color,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.set(.7,.7,1);m.add(glow);
      BIT.g.add(m);BIT.items.push(m)}}
  if(kind==="missile"&&false){ // shoulder launcher boxes (hidden until a real launcher model arrives)
    for(let s=-1;s<=1;s+=2){const m=new THREE.Mesh(new THREE.BoxGeometry(.42,.32,.9),new THREE.MeshStandardMaterial({color:0x26292e,metalness:.15,roughness:.75}));m.userData.side=s;BIT.g.add(m);BIT.items.push(m)}}
}
function stepBits(rdt,T){
  BIT.g.visible=(!VS||vsSkills())&&!!P&&P.root.visible&&(SCREEN==="play"||SCREEN==="launch"||SCREEN==="title"||SCREEN==="form"||SCREEN==="brief");
  if(!BIT.g.visible)return;
  const f=new V3(Math.sin(S.face),0,Math.cos(S.face)),r=new V3(Math.cos(S.face),0,-Math.sin(S.face)),base=P.root.position;
  BIT.items.forEach((m,i)=>{let want;
    if(BIT.kind==="missile"){want=base.clone().addScaledVector(r,-m.userData.side*.95).addScaledVector(f,-.45).add(new V3(0,2.15,0));m.position.copy(want);m.rotation.set(0,S.face,0);return}
    if(BIT.kind==="pods"){m.visible=G.podsOut<=0;const a=T*1.3+i*2.094;want=base.clone().addScaledVector(r,(i-1)*2.4+Math.cos(a)*.3).addScaledVector(f,-.8+Math.sin(a)*.3).add(new V3(0,3+(i===1?.6:0)+Math.sin(a*1.7)*.25,0))}
    else{const a=T*(G.barrier>0||G.cfield>0?5:1.1)+i*2.094,R=G.barrier>0||G.cfield>0?3.3:2;want=base.clone().addScaledVector(r,Math.cos(a)*R).addScaledVector(f,Math.sin(a)*R).add(new V3(0,1.2+Math.sin(a*2)*.3,0))}
    m.position.lerp(want,1-Math.pow(.0005,rdt));
    if(BIT.kind==="pods")m.lookAt(m.position.clone().add(f));else m.lookAt(base.clone().add(new V3(0,1.2,0)));
  });
}

/* ---- homing projectiles shared by pods and missiles ---- */
function launchProj(from,vel,tgt,kind){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:kind==="pod"?0x7fe8ff:0xffa060,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  s.scale.setScalar(kind==="pod"?2.2:1.5);s.position.copy(from);scene.add(s);
  G.proj.push({s,vel:vel.clone(),tgt,kind,t:0,life:kind==="pod"?2.2:2.6,ret:false});
}
function stepProj(dt){
  for(let i=G.proj.length-1;i>=0;i--){const p=G.proj[i];p.t+=dt;p.life-=dt;
    const tg=p.tgt&&p.tgt.alive?p.tgt.m.position:null;
    if(tg){const to=tg.clone().sub(p.s.position),d=to.length();const sp=p.kind==="pod"?95:85,turn=p.t<.18?2:p.kind==="pod"?14:9;
      p.vel.lerp(to.normalize().multiplyScalar(sp),Math.min(1,turn*dt));
      if(d<2.6){projHit(p);p.life=0}}
    else p.vel.multiplyScalar(Math.pow(.6,dt));
    p.s.position.addScaledVector(p.vel,dt);
    if(dt>0)emit(ADD,{pos:p.s.position.clone(),color:p.kind==="pod"?0x48d8ff:0xff7a3a,s0:p.kind==="pod"?1:.9,s1:.1,life:.22,a:.7});
    if(dt>0&&p.kind==="missile"&&Math.random()<.5)emit(NORM,FXBOK.puff?{pos:p.s.position.clone(),tex:FXB.puff,color:0xd8dce4,s0:.6,s1:3,rot:Math.random()*6.28,life:.75,a:.42,drag:2}:{pos:p.s.position.clone(),tex:TX.smoke,color:0x7a7f88,s0:.5,s1:2.2,life:.6,a:.25,drag:2});
    if(p.life<=0){scene.remove(p.s);p.s.material.dispose();G.proj.splice(i,1)}}
}
function projHit(p){const e=p.tgt,at=e.m.position.clone();
  if(e.isWP){wpDamage(e,p.kind==="pod"?2:1,at);return}
  if(e.isBoss){fxImpact(at,0xffb080);return}
  if(e.launched>0)return;
  const dir=p.vel.clone().normalize();dir.y*=.4;
  if(p.kind==="pod"){knock(e,dir.normalize(),40,1.9);e.rad=Math.max(e.rad,4.2);addScore(220,at,"cyan");fxImpact(at,0x48d8ff);sfx("hit",at)}
  else{knock(e,dir.normalize(),30,1.6);addScore(160,at,"");fxImpact(at,0xff8a40);sparks(at,dir,0xffc080,22,.35,12);sfx("impact",at)}
  hitFlash(e);
}

/* ---- R skill ---- */
function unitSkill(){
  if(VS){vsSkill(false);return}if(SCREEN!=="play"||S.ended||G.dead>0||G.stagger>0||G.specT>=0||G.cfield>0||G.mega)return;
  if(G.unitCd>0){sfx("deny");return}
  const u=G.unit;tutCount("unit");
  if(u==="mega"){megaStart("r");G.unitCd=UNITS.mega.cd;
  }else if(u==="pods"){
    const t=target;if(!t){sfx("deny");popText("포드 강습 · 표적 없음");return}
    G.unitCd=UNITS.pods.cd;G.podsOut=1.4;sfx("throw");tutCount("u_pods");
    BIT.items.forEach((m,i)=>launchProj(m.position.clone(),new V3().randomDirection().multiplyScalar(30).add(new V3(0,12,0)),t,"pod"));
  }else if(u==="missile"){
    G.marking=true;G.markT=0;G.marks=[];const t=target;if(t){G.marks.push(t);sfx("lock")}
  }else if(u==="shield"){
    G.unitCd=UNITS.shield.cd;G.barrier=3;sfx("gravOn");popText("반사 장벽 전개");
    emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x8dff7a,s0:2,s1:16,life:.35});
  }
}
function unitSkillUp(){
  if(VS)return;
  if(G.unit!=="missile"||!G.marking)return;G.marking=false;
  tutCount(G.marks.length>=3?"u_missile":"missileShort");
  if(!G.marks.length){return}
  fireMissiles(G.marks,2);G.marks=[];G.unitCd=UNITS.missile.cd;
}
function fireMissiles(list,per){
  let k=0;const r=new V3(Math.cos(S.face),0,-Math.sin(S.face));
  for(const t of list)for(let j=0;j<per;j++){const side=(k++%2)?1:-1;
    const from=S.pos.clone().addScaledVector(r,-side*1.15).add(new V3(0,2.7,0));
    setTimeout(()=>{if(!S.ended)launchProj(from,new V3(0,22,0).addScaledVector(r,-side*10).addScaledVector(fwd(),-6),t,"missile")},k*45)}
  sfx("shot");setTimeout(()=>sfx("whoosh"),60);
}
// passive / defensive hooks on every enemy bolt; returns true when the bolt was dealt with
function boltDefense(b){
  if(VS)return false;
  const d=b.g.position.distanceTo(S.pos);
  if((G.barrier>0||G.cfield>0)&&d<5.5){reflectBolt(b);return true}
  if(G.unit==="pods"&&G.podGuard<=0&&G.dead<=0&&d<14&&b.dir.dot(S.pos.clone().sub(b.g.position).normalize())>.9){
    G.podGuard=20;b.life=0;b.dead=true;const pm=BIT.items[0]?BIT.items[0].position.clone():S.pos.clone();
    fxImpact(b.g.position,0x48d8ff);sfx("block",b.g.position);popText("포드 요격");
    for(let i=0;i<6;i++)emit(ADD,{pos:pm.clone().lerp(b.g.position,i/5),color:0x7fe8ff,s0:.8,s1:.1,life:.15});return true}
  return false;
}
function reflectBolt(b){
  const o=b.owner&&b.owner.alive?b.owner.m.position:null;
  if(G.barrier>0)tutCount("u_shield");b.dir.copy(o?o.clone().sub(b.g.position).normalize():b.dir.clone().negate());b.refl=true;b.speed=110;b.life=1.4;b.color=0x8dff7a;b.home=b.owner&&b.owner.alive&&!b.owner.isBoss?b.owner:null;
  b.g.lookAt(b.g.position.clone().add(b.dir));b.g.children[1].material.color.set(0x8dff7a);
  fxImpact(b.g.position,0x8dff7a);sfx("block",b.g.position);addScore(80,b.g.position.clone(),"cyan");
}

/* ---- F specials by unit ---- */
function unitSpecial(){
  const u=G.unit;
  if(u==="mega"){cutin("하이퍼 메가 빔","HM-1");megaStart("f");return}
  if(u==="pods"){cutin("올 레인지","RF-6");G.podsPull={t:0,c:S.pos.clone().addScaledVector(aimDir(),18)};G.podsOut=2.4;return}
  if(u==="missile"){cutin("풀 버스트","MP-12");
    /* 10/29 buff: two waves, up to 15 targets each within 110 m (weak-point pods included), slow motion on launch */
    const pick=()=>enemies.filter(e=>targetable(e)&&!e.isBoss&&e.m.position.distanceTo(S.pos)<110).sort((a,b)=>a.m.position.distanceTo(S.pos)-b.m.position.distanceTo(S.pos)).slice(0,15);
    setTimeout(()=>{if(S.ended)return;fireMissiles(pick(),1);S.slow=Math.max(S.slow,.5)},420);setTimeout(()=>{if(!S.ended){fireMissiles(pick(),1);S.shake=Math.max(S.shake,.6)}},1250);return}
  if(u==="shield"){cutin("카운터 필드","SB-4");G.cfield=6;G.cfPulse=1.2;G.iframe=Math.max(G.iframe,6)}
}
function unitSpecialBurst(){ // called at the special's strike frame
  const u=G.unit;
  if(u==="mega")return; // the beam itself does the work (megaTick)
  if(u==="pods"){const c=G.podsPull?G.podsPull.c:S.pos.clone();S.hitstop=.12;S.shake=1.2;flash(.4);sfx("specBurst");
    emit(ADD,{pos:c,tex:TX.ring,color:0x48d8ff,s0:3,s1:70,life:.6});emit(ADD,{pos:c,tex:TX.flare,color:0xffffff,s0:14,s1:26,life:.2});flashLight(c,0x48d8ff,14,100,.5);
    let n=0;for(const e of enemies){if(!isMob(e))continue;const d=e.m.position.clone().sub(c),dist=d.length();if(dist>55)continue;
      knock(e,dist<.5?new V3().randomDirection():d.normalize(),36,2);e.rad=Math.max(e.rad,4.6);hitFlash(e);n++}
    if(n)addScore(200*n,c.clone().add(new V3(0,4,0)),"big");G.podsPull=null;G.podStorm={t:3.2,next:.15};emit(ADD,{pos:c,tex:TX.ring,color:0x9ff0ff,s0:6,s1:110,life:.8});return}
  if(u==="missile"){S.shake=.8;flash(.25);sfx("specBurst");return}
  if(u==="shield"){sfx("gravOn");emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x8dff7a,s0:3,s1:30,life:.5})}
}
function isMob(e){return e.alive&&e.launched<=0&&!e.isBoss&&!e.isWP}

/* ---- per-frame ---- */
function unitsTick(dt,rdt,T){
  megaVsTick(rdt,T);
  if(VS){stepBits(rdt,T);barrier.visible=vsSkills()&&G.barrier>0;if(barrier.visible){barrier.position.copy(S.pos).add(new V3(0,.8,0));barrier.scale.setScalar(1);barrier.rotation.y+=rdt;barrier.material.opacity=.25;}return;}
  G.unitCd=Math.max(0,G.unitCd-dt);G.podGuard=Math.max(0,G.podGuard-dt);G.podsOut=Math.max(0,G.podsOut-dt);
  megaTick(dt,rdt,T);
  // missile marking
  if(G.marking){G.markT+=rdt;if(G.marks.length<6&&G.markT>.16){G.markT=0;
      const t=coneTarget(Math.cos(24*Math.PI/180),70,G.marks);if(t){G.marks.push(t);sfx("lock")}}
    G.marks=G.marks.filter(e=>e.alive);if(G.markT>4){unitSkillUp()}}
  // shield
  G.barrier=Math.max(0,G.barrier-dt);
  if(G.cfield>0){G.cfPulse=(G.cfPulse||0)-dt;if(G.cfPulse<=0&&G.cfield>.6){G.cfPulse=1.5;cfieldWave(30,.6)}}
  if(G.cfield>0){const was=G.cfield;G.cfield-=dt;if(was>0&&G.cfield<=0){G.cfield=0;
    const c=S.pos.clone();S.shake=1;flash(.3);sfx("specBurst");emit(ADD,{pos:c,tex:TX.ring,color:0x8dff7a,s0:3,s1:60,life:.55});
    emit(ADD,{pos:c,tex:TX.ring,color:0xcaffc0,s0:5,s1:120,life:.8});flashLight(c,0x8dff7a,16,120,.6);S.hitstop=Math.max(S.hitstop||0,.1);cfieldWave(60,1)}}
  const bOn=G.barrier>0||G.cfield>0;barrier.visible=bOn;
  if(bOn){barrier.position.copy(S.pos).add(new V3(0,.8,0));barrier.rotation.y+=rdt*1.5;barrier.rotation.x+=rdt*.7;
    const k=G.cfield>0?1.5:1;barrier.scale.setScalar(k);barrier.material.opacity=.22+.1*Math.sin(T*14)}
  // all-range pull
  if(G.podsPull){G.podsPull.t+=dt;const c=G.podsPull.c;
    for(const e of enemies){if(!isMob(e))continue;const d=c.clone().sub(e.m.position),dist=d.length();if(dist>70||dist<2)continue;clearTele(e);e.fireT=Math.max(e.fireT,1);e.m.position.addScaledVector(d.normalize(),dt*Math.min(dist*3,65))}
    if(dt>0)for(let i=0;i<3;i++){const o=new V3().randomDirection().multiplyScalar(16);emit(ADD,{pos:c.clone().add(o),color:0x48d8ff,vel:o.clone().multiplyScalar(-2.6),s0:.9,s1:.2,life:.35,a:.7,drag:0})}}
  // all range, second act: the pods keep striking whatever is left nearby for ~3 s
  if(G.podStorm){const st=G.podStorm;st.t-=dt;st.next-=dt;if(st.t<=0)G.podStorm=null;else if(st.next<=0){st.next=.16;
    let best=null,bd=95;for(const e of enemies){if(!(isMob(e)||e.isWP&&e.alive))continue;const dd=e.m.position.distanceTo(S.pos);if(dd<bd&&!G.proj.some(p=>p.tgt===e)){bd=dd;best=e}}
    if(best){const r=new V3().randomDirection();r.y=Math.abs(r.y);launchProj(S.pos.clone().add(new V3(0,2.4,0)).addScaledVector(r,3),r.multiplyScalar(30),best,"pod");sfx("dash",null)}}}
  stepProj(dt);stepBits(rdt,T);
}
// counter field shockwave (pulses every 1.5 s, last one big): knocks drones, damages weak-point pods
function cfieldWave(R,k){const c=S.pos.clone();S.shake=Math.max(S.shake,.5+k*.5);flash(.15+k*.2);sfx("specBurst");emit(ADD,{pos:c,tex:TX.ring,color:0x8dff7a,s0:3,s1:R*1.1,life:.5});
  let n=0;for(const e of enemies){if(!e.alive||e.launched>0||e.isBoss||e.isRemote)continue;const d=e.m.position.clone().sub(c),dist=d.length();if(dist>R)continue;
    if(e.isWP){wpDamage(e,k>=1?3:1,e.m.position.clone());continue}knock(e,dist<.5?new V3().randomDirection():d.normalize(),32+k*6,1.9);e.rad=Math.max(e.rad,4.4);hitFlash(e);n++}
  if(n)addScore((k>=1?180:120)*n,c.clone().add(new V3(0,4,0)),"big")}
function resetUnits(){
  for(const p of G.proj){scene.remove(p.s);p.s.material.dispose()}
  megaEnd(true);Object.assign(G,{unitCd:0,proj:[],marks:[],marking:false,markT:0,mega:null,barrier:0,cfield:0,cfPulse:0,podGuard:0,podsOut:0,podsPull:null,podStorm:null});
  if(BIT.kind!==G.unit)buildBits(G.unit);
}
