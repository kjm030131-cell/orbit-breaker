/* ================= option units: the chosen pack decides R skill, F special and a passive ================= */
const UNITS={
  mega:{name:"하이퍼 메가 런처 유닛",en:"HM-1",color:0xff4fd8,css:"#ff5ad8",
    r:"메가 빔",rd:"0.6초 충전 후 조준 방향으로 관통 빔 한 방, 경로의 적을 모두 날림",cd:9,
    f:"하이퍼 빔",fd:"1초 충전 후 초대형 빔을 5초간 계속 조사, 마우스로 전장을 쓸어 넘김",
    p:"빔 라이플 명중 시 필살 게이지 +2"},
  pods:{name:"원격 포드 유닛",en:"RF-6",color:0x48d8ff,css:"#48d8ff",
    r:"포드 강습",rd:"포드 3기가 록온 대상과 주변 적에게 하나씩 날아가 폭발, 휘말린 적까지 날림",cd:6,
    f:"올 레인지",fd:"포드가 70m 안의 적을 한 점으로 끌어모아 대폭발, 이어서 4.5초간 포드가 남은 적을 연속 강습",
    p:"20초마다 적탄 1발 자동 요격"},
  missile:{name:"다탄두 미사일 유닛",en:"MP-12",color:0xff6a3d,css:"#ff6a3d",
    r:"멀티 록",rd:"R을 꾹 누른 채 조준선으로 훑어 최대 8기 표적, 떼면 일제 발사 (착탄 시 범위 폭발)",cd:7,
    f:"풀 버스트",fd:"110m 안의 적 최대 15기에 미사일 일제 사격 3연속, 마지막에 적이 몰린 곳에 대폭발",
    p:"라이플 연사 간격 −25%"},
  shield:{name:"실드 비트 유닛",en:"SB-4",color:0x8dff7a,css:"#8dff7a",
    r:"반사 장벽",rd:"전개 순간 주변 충격파, 4초간 닿는 적탄을 쏜 적에게 되돌려 폭발시킴",cd:8,
    f:"카운터 필드",fd:"6초간 필드 전개 (앞 3초 무적, 이후 피해 절반) · 적탄 추적 반사 · 1초마다 충격파, 종료 시 초대형 충격파",
    p:"저스트 회피 시 1회 피격 무효 (25초마다)"}};
const UNIT_KEYS=Object.keys(UNITS);
Object.assign(G,{unitCd:0,proj:[],marks:[],marking:false,markT:0,mega:null,barrier:0,cfield:0,podGuard:0,podsOut:0,podsPull:null});

/* ---- unit visuals riding on the mech ---- */
const BIT={g:new THREE.Group(),items:[],kind:null};scene.add(BIT.g);
const podGeo=new THREE.OctahedronGeometry(.26,0);podGeo.scale(1,.6,2.2);
const bitGeo=new THREE.CircleGeometry(.55,6);
const barrierGeo=new THREE.SphereGeometry(3.6,40,20);
const barrierTex=FXB.hexshield.clone();barrierTex.wrapS=barrierTex.wrapT=THREE.RepeatWrapping;barrierTex.repeat.set(6,3);barrierTex.needsUpdate=true;
const barrier=new THREE.Mesh(barrierGeo,new THREE.MeshBasicMaterial({color:0xb8ffb0,map:barrierTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
barrier.visible=false;scene.add(barrier);
/* option unit models (user assets 10/29, models/u_*.glb): wrapper +Z = the unit's front, longest side = size (world units) */
const UNIT_GLTF={},UNIT_MDL={mega:{size:3.2,ry:0},missile:{size:1.3,ry:0},pods:{size:1.5,ry:Math.PI/2},shield:{size:1.35,ry:Math.PI/2}};
function unitModel(kind){const g=UNIT_GLTF[kind],d=UNIT_MDL[kind];if(!g||!d)return null;const o=g.scene.clone(true);o.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.envMap=ENV;m.material.envMapIntensity=.9;m.castShadow=false}});
  o.rotation.y=d.ry;o.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(o),sz=box.getSize(new V3()),c=box.getCenter(new V3()),k=d.size/Math.max(sz.x,sz.y,sz.z);
  o.scale.multiplyScalar(k);o.position.sub(c).multiplyScalar(k);const w=new THREE.Group();w.add(o);return w}
function buildBits(kind){
  BIT.g.clear();BIT.items=[];BIT.kind=kind;
  if(UNIT_GLTF[kind]){const n=kind==="mega"?1:kind==="missile"?2:3;
    for(let i=0;i<n;i++){const m=unitModel(kind);if(kind==="missile")m.userData.side=i?1:-1;
      if(kind==="pods"||kind==="shield"){const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:UNITS[kind].color,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.set(1.1,1.1,1);m.add(glow)}
      BIT.g.add(m);BIT.items.push(m)}
    return}
  if(kind==="pods"||kind==="shield"){
    for(let i=0;i<3;i++){const mat=new THREE.MeshStandardMaterial({color:0x33383f,metalness:.7,roughness:.35,envMap:ENV,emissive:UNITS[kind].color,emissiveIntensity:.12,side:THREE.DoubleSide});
      const m=new THREE.Mesh(kind==="pods"?podGeo:bitGeo,mat);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:UNITS[kind].color,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.set(.7,.7,1);m.add(glow);
      BIT.g.add(m);BIT.items.push(m)}}
  if(kind==="missile"&&false){ // shoulder launcher boxes (hidden until a real launcher model arrives)
    for(let s=-1;s<=1;s+=2){const m=new THREE.Mesh(new THREE.BoxGeometry(.42,.32,.9),new THREE.MeshStandardMaterial({color:0x26292e,metalness:.15,roughness:.75}));m.userData.side=s;BIT.g.add(m);BIT.items.push(m)}}
}
function stepBits(rdt,T){
  BIT.g.visible=(!VS||vsSkills())&&!!P&&P.root.visible&&(SCREEN==="play"||SCREEN==="launch"||SCREEN==="title"||SCREEN==="form"||SCREEN==="brief"||SCREEN==="load");
  if(!BIT.g.visible)return;
  const f=new V3(Math.sin(S.face),0,Math.cos(S.face)),r=new V3(Math.cos(S.face),0,-Math.sin(S.face)),base=P.root.position;
  BIT.items.forEach((m,i)=>{let want;
    if(BIT.kind==="missile"){want=base.clone().addScaledVector(r,-m.userData.side*1.0).addScaledVector(f,-.45).add(new V3(0,1.45,0));m.position.copy(want);m.rotation.set(0,S.face,0);return}
    if(BIT.kind==="mega"){want=base.clone().addScaledVector(r,-1.15).addScaledVector(f,-.25).add(new V3(0,1.25,0));m.position.copy(want);m.lookAt(want.clone().add(G.mega?aimDir():f));return} // shoulder cannon: follows the beam while firing
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
    if(tg){const to=tg.clone().sub(p.s.position),d=to.length();const sp=p.kind==="pod"?105:115,turn=p.t<.18?2:p.kind==="pod"?14:11;
      p.vel.lerp(to.normalize().multiplyScalar(sp),Math.min(1,turn*dt));
      if(d<2.6){projHit(p);p.life=0}}
    else p.vel.multiplyScalar(Math.pow(.6,dt));
    p.s.position.addScaledVector(p.vel,dt);
    if(dt>0)emit(ADD,{pos:p.s.position.clone(),color:p.kind==="pod"?0x48d8ff:0xff7a3a,s0:p.kind==="pod"?1:.9,s1:.1,life:.22,a:.7});
    if(dt>0&&p.kind==="missile"&&Math.random()<.5)emit(NORM,FXBOK.puff?{pos:p.s.position.clone(),tex:FXB.puff,color:0xd8dce4,s0:.6,s1:3,rot:Math.random()*6.28,life:.75,a:.42,drag:2}:{pos:p.s.position.clone(),tex:TX.smoke,color:0x7a7f88,s0:.5,s1:2.2,life:.6,a:.25,drag:2});
    if(p.life<=0){scene.remove(p.s);p.s.material.dispose();G.proj.splice(i,1)}}
}
function projHit(p){const e=p.tgt,at=e.m.position.clone();
  if(e.isWP){wpDamage(e,p.kind==="pod"?3:1,at);skillBlast(at,p.kind==="pod"?10:8,p.kind,e);return}
  if(e.isBoss){fxImpact(at,0xffb080);skillBlast(at,p.kind==="pod"?10:8,p.kind,e);return}
  if(e.launched>0){skillBlast(at,p.kind==="pod"?10:8,p.kind,e);return}
  const dir=p.vel.clone().normalize();dir.y*=.4;
  if(p.kind==="pod"){knock(e,dir.normalize(),40,1.9);e.rad=Math.max(e.rad,4.2);addScore(220,at,"cyan");fxImpact(at,0x48d8ff);sfx("hit",at)}
  else{knock(e,dir.normalize(),30,1.6);addScore(160,at,"");fxImpact(at,0xff8a40);sparks(at,dir,0xffc080,22,.35,12);sfx("impact",at)}
  hitFlash(e);skillBlast(at,p.kind==="pod"?10:8,p.kind,e);
}
// splash around a skill hit: knocks nearby drones (chains into collisions), big flash/ring so every hit reads as a blast
function skillBlast(c,R,kind,skip){
  const col=kind==="pod"?0x48d8ff:kind==="shield"?0x8dff7a:0xff8a40;
  if(kind==="missile"){if(fxFlipK("missileexpl",c,R*2.2,1.15)){emit(ADD,{pos:c.clone(),tex:TX.flare,color:0xffe6c0,s0:6,s1:12,life:.12});sparks(c,null,0xffc070,24,.6,30);flashLight(c,0xff8a30,12,60,.4)}else fxExplosion(c,1.15)}
  else{if(kind==="pod")fxFlipK("podhit",c,R*1.9,.7);emit(ADD,{pos:c.clone(),tex:TX.flare,color:0xffffff,s0:5,s1:11,life:.14});emit(ADD,{pos:c.clone(),tex:TX.ring,color:col,s0:2,s1:R*2.2,life:.4,a:.9});
    for(let i=0;i<14;i++){const o=new V3().randomDirection().multiplyScalar(1+Math.random()*1.5);emit(ADD,{pos:c.clone().add(o),color:col,vel:o.multiplyScalar(9),s0:1.2,s1:.1,life:.35+Math.random()*.2,a:.9,drag:2})}
    flashLight(c,col,10,50,.35)}
  fxShockwave(c,R*2.4,.5,0,kind==="shield"?"hexwave":null);S.hitstop=Math.max(S.hitstop||0,.045);S.shake=Math.max(S.shake,.45);impactPunch(.5);
  let n=0;for(const e of enemies){if(e===skip||!isMob(e))continue;const d=e.m.position.clone().sub(c),dist=d.length();if(dist>R)continue;
    d.y=Math.abs(d.y)*.4+.15;knock(e,d.normalize(),30,1.7);e.rad=Math.max(e.rad,4.2);hitFlash(e);n++}
  if(n)addScore(140*n,c.clone().add(new V3(0,3,0)),"big");return n}

/* ---- R skill ---- */
function unitSkill(){
  if(VS){vsSkill(false);return}if(SCREEN!=="play"||S.ended||G.dead>0||G.stagger>0||G.specT>=0||G.cfield>0||G.mega)return;
  if(G.unit==="missile"&&G.marking)return; // multi-lock: hold R to mark, release to fire (10/29 rollback from the toggle)
  if(G.unitCd>0){sfx("deny");return}
  const u=G.unit;tutCount("unit");
  if(u==="mega"){megaStart("r");G.unitCd=UNITS.mega.cd;
  }else if(u==="pods"){
    const t=target;if(!t){sfx("deny");popText("포드 강습 · 표적 없음");return}
    G.unitCd=UNITS.pods.cd;G.podsOut=1.4;sfx("throw");tutCount("u_pods");
    const near=enemies.filter(e=>e!==t&&(isMob(e)||e.isWP&&e.alive)&&e.m.position.distanceTo(t.m.position)<45).sort((a,b)=>a.m.position.distanceTo(t.m.position)-b.m.position.distanceTo(t.m.position));
    const tg=[t,near[0]||t,near[1]||t];S.shake=Math.max(S.shake,.35);
    BIT.items.forEach((m,i)=>launchProj(m.position.clone(),new V3().randomDirection().multiplyScalar(30).add(new V3(0,12,0)),tg[i%3],"pod"));
    for(const m of BIT.items)emit(ADD,{pos:m.position.clone(),tex:TX.ring,color:0x7fe8ff,s0:.5,s1:5,life:.25});
  }else if(u==="missile"){
    G.marking=true;G.markT=0;G.marks=[];const t=target;if(t){G.marks.push(t);sfx("lock")}
  }else if(u==="shield"){
    G.unitCd=UNITS.shield.cd;G.barrier=4;sfx("gravOn");popText("반사 장벽 전개");
    emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x8dff7a,s0:2,s1:16,life:.35});cfieldWave(18,.5);
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
  if(u==="pods"){cutin("올 레인지","RF-6");G.podsPull={t:0,c:S.pos.clone().addScaledVector(aimDir(),18)};G.podsOut=3.6;return}
  if(u==="missile"){cutin("풀 버스트","MP-12");
    /* 10/29 buff: two waves, up to 15 targets each within 110 m (weak-point pods included), slow motion on launch */
    const pick=()=>enemies.filter(e=>targetable(e)&&!e.isBoss&&e.m.position.distanceTo(S.pos)<110).sort((a,b)=>a.m.position.distanceTo(S.pos)-b.m.position.distanceTo(S.pos)).slice(0,15);
    setTimeout(()=>{if(S.ended)return;fireMissiles(pick(),1);S.slow=Math.max(S.slow,.5)},420);setTimeout(()=>{if(!S.ended){fireMissiles(pick(),1);S.shake=Math.max(S.shake,.6)}},1050);
    setTimeout(()=>{if(!S.ended){fireMissiles(pick(),1);S.shake=Math.max(S.shake,.7)}},1680);
    // finale: one huge blast where the enemies are packed tightest
    setTimeout(()=>{if(S.ended||SCREEN!=="play")return;const l=enemies.filter(e=>isMob(e)&&e.m.position.distanceTo(S.pos)<110);
      let c=S.pos.clone().addScaledVector(aimDir(),30),bn=-1;for(const a of l){let k=0;for(const b of l)if(a.m.position.distanceTo(b.m.position)<25)k++;if(k>bn){bn=k;c=a.m.position.clone()}}
      fxBigExplosion(c,55);fxExplosion(c,2.4);sfx("boom",c,4);sfx("specBurst");S.hitstop=Math.max(S.hitstop||0,.12);S.slow=Math.max(S.slow,.35);S.shake=1.3;flash(.4);impactPunch(1.3);
      for(const e of enemies)if(e.isWP&&e.alive&&e.m.position.distanceTo(c)<25)wpDamage(e,2,e.m.position.clone());skillBlast(c,25,"missile")},2500);return}
  if(u==="shield"){cutin("카운터 필드","SB-4");G.cfield=6;G.cfPulse=.8;G.iframe=Math.max(G.iframe,3)}
}
function unitSpecialBurst(){ // called at the special's strike frame
  const u=G.unit;
  if(u==="mega")return; // the beam itself does the work (megaTick)
  if(u==="pods"){const c=G.podsPull?G.podsPull.c:S.pos.clone();S.hitstop=.12;S.shake=1.2;flash(.4);sfx("specBurst");
    emit(ADD,{pos:c,tex:TX.ring,color:0x48d8ff,s0:3,s1:70,life:.6});emit(ADD,{pos:c,tex:TX.flare,color:0xffffff,s0:14,s1:26,life:.2});flashLight(c,0x48d8ff,14,100,.5);
    let n=0;for(const e of enemies){if(!isMob(e))continue;const d=e.m.position.clone().sub(c),dist=d.length();if(dist>55)continue;
      knock(e,dist<.5?new V3().randomDirection():d.normalize(),36,2);e.rad=Math.max(e.rad,4.6);hitFlash(e);n++}
    fxBigExplosion(c,70);fxFlipK("podhit",c,90,1);S.slow=Math.max(S.slow,.45);impactPunch(1.4);sfx("boom",c,4);for(const e of enemies)if(e.isWP&&e.alive&&e.m.position.distanceTo(c)<55)wpDamage(e,2,e.m.position.clone());
    if(n)addScore(200*n,c.clone().add(new V3(0,4,0)),"big");G.podsPull=null;G.podStorm={t:4.5,next:.12};emit(ADD,{pos:c,tex:TX.ring,color:0x9ff0ff,s0:6,s1:110,life:.8});return}
  if(u==="missile"){S.shake=.8;flash(.25);sfx("specBurst");fxShockwave(S.pos.clone().add(new V3(0,1,0)),40,.6,0);return}
  if(u==="shield"){sfx("gravOn");emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x8dff7a,s0:3,s1:30,life:.5});cfieldWave(30,.6)}
}
function isMob(e){return e.alive&&e.launched<=0&&!e.isBoss&&!e.isWP}

/* ---- per-frame ---- */
function unitsTick(dt,rdt,T){
  megaVsTick(rdt,T);
  if(VS){stepBits(rdt,T);barrier.visible=vsSkills()&&G.barrier>0;if(barrier.visible){barrier.position.copy(S.pos).add(new V3(0,.8,0));barrier.scale.setScalar(1);barrier.rotation.y+=rdt;barrier.material.opacity=.25;}return;}
  G.unitCd=Math.max(0,G.unitCd-dt);G.podGuard=Math.max(0,G.podGuard-dt);G.podsOut=Math.max(0,G.podsOut-dt);
  megaTick(dt,rdt,T);
  // missile marking
  if(G.marking){G.markT+=rdt;if(G.marks.length<8&&G.markT>.13){G.markT=0;
      const t=coneTarget(Math.cos(24*Math.PI/180),70,G.marks);if(t){G.marks.push(t);sfx("lock")}}
    G.marks=G.marks.filter(e=>e.alive);if(G.markT>6){unitSkillUp()}}
  lockCountHud();
  // shield
  G.barrier=Math.max(0,G.barrier-dt);
  if(G.cfield>0){G.cfPulse=(G.cfPulse||0)-dt;if(G.cfPulse<=0&&G.cfield>.6){G.cfPulse=1;cfieldWave(40,.6)}}
  if(G.cfield>0){const was=G.cfield;G.cfield-=dt;if(was>0&&G.cfield<=0){G.cfield=0;
    const c=S.pos.clone();S.shake=1;flash(.3);sfx("specBurst");emit(ADD,{pos:c,tex:TX.ring,color:0x8dff7a,s0:3,s1:60,life:.55});
    emit(ADD,{pos:c,tex:TX.ring,color:0xcaffc0,s0:5,s1:120,life:.8});flashLight(c,0x8dff7a,16,120,.6);S.hitstop=Math.max(S.hitstop||0,.14);S.slow=Math.max(S.slow,.4);fxBigExplosion(c.clone().add(new V3(0,1,0)),60);cfieldWave(80,1)}}
  const bOn=G.barrier>0||G.cfield>0;barrier.visible=bOn;
  if(bOn){barrier.position.copy(S.pos).add(new V3(0,.8,0));barrier.rotation.y+=rdt*.6;barrierTex.offset.y=(barrierTex.offset.y+rdt*.15)%1;
    const k=G.cfield>0?1.5:1;barrier.scale.setScalar(k);barrier.material.opacity=(G.cfield>0?.36:.28)+.07*Math.sin(T*14)}
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
function cfieldWave(R,k){const c=S.pos.clone();S.shake=Math.max(S.shake,.5+k*.5);flash(.15+k*.2);sfx("specBurst");emit(ADD,{pos:c,tex:TX.ring,color:0x8dff7a,s0:3,s1:R*1.1,life:.5});fxShockwave(c.clone().add(new V3(0,.5,0)),R*2.2,.55,0,"hexwave");flashLight(c,0x8dff7a,10+k*6,R*1.5,.4);S.hitstop=Math.max(S.hitstop||0,.03+k*.05);impactPunch(.4+k*.8);
  let n=0;for(const e of enemies){if(!e.alive||e.launched>0||e.isBoss||e.isRemote)continue;const d=e.m.position.clone().sub(c),dist=d.length();if(dist>R)continue;
    if(e.isWP){wpDamage(e,k>=1?4:2,e.m.position.clone());continue}knock(e,dist<.5?new V3().randomDirection():d.normalize(),34+k*8,1.9);e.rad=Math.max(e.rad,4.4);hitFlash(e);n++}
  if(n)addScore((k>=1?180:120)*n,c.clone().add(new V3(0,4,0)),"big")}
function resetUnits(){
  for(const p of G.proj){scene.remove(p.s);p.s.material.dispose()}
  megaEnd(true);Object.assign(G,{unitCd:0,proj:[],marks:[],marking:false,markT:0,mega:null,barrier:0,cfield:0,cfPulse:0,podGuard:0,podsOut:0,podsPull:null,podStorm:null});
  if(BIT.kind!==G.unit)buildBits(G.unit);
}

// multi-lock counter next to the reticle while marking: "록온 3 / 6 · R 발사"
function lockCountHud(){let el=$("lockCount");const on=SCREEN==="play"&&G.marking&&!VS;
  if(!el){if(!on)return;el=document.createElement("div");el.id="lockCount";el.style.cssText="position:fixed;left:50%;top:calc(44% + 46px);transform:translateX(-50%);z-index:6;pointer-events:none;padding:5px 12px;background:rgba(10,12,16,.82);border:1px solid #ff6a3d;color:#ffd0b8;font:700 15px Pretendard,'Noto Sans CJK KR',sans-serif;letter-spacing:.04em;white-space:nowrap";$("hud").appendChild(el)}
  if(el.hidden===on)el.hidden=!on;if(!on)return;const n=G.marks.length,t=`록온 ${n} / 8 · R 떼면 발사`;if(el.textContent!==t){el.textContent=t;el.style.borderColor=n>=8?"#ffb21a":"#ff6a3d"}}
