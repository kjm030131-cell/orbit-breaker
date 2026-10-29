/* ================= gameplay systems ================= */
const PHASES=[
  {at:0,name:"1단계 · 선발 정찰대",sub:"",count:8,gap:[2.2,3],elites:0,rams:0,ms:0,maxTele:3,fire:[3.6,6],tele:.9,bolt:94},
  {at:20,name:"2단계 · 돌격 드론 출현",sub:"",count:10,gap:[2,2.8],elites:0,rams:1,ms:1,blade:1,maxTele:3,fire:[2.7,4.3],tele:.85,bolt:101},
  {at:45,name:"3단계 · 정예 호위기",sub:"",count:10,gap:[1.9,2.6],elites:1,rams:2,ms:1,blade:1,maxTele:4,fire:[2.4,3.8],tele:.8,bolt:110},
  {at:60,name:"최종 단계 · 지휘기 케르고그모스",sub:"",count:4,gap:[2.6,3.4],elites:1,rams:1,ms:0,blade:1,maxTele:4,fire:[2.2,3.5],tele:.75,bolt:119}];
// clean streak: every 15s without a hit adds +0.2 to the score multiplier (max ×2.0); a hit resets it
const CLEAN_STEP=15;
function cleanMult(){return Math.min(2,1+Math.floor(G.clean/CLEAN_STEP)*.2)}
const G={phase:0,kc:0,kcT:0,maxKC:0,crit:0,iframe:0,stagger:0,dodgeCd:0,ebolts:[],aimN:0,focus:null,lives:3,dead:0,clean:0,guardCd:0,unit:"mega",spawnT:0,bigT:0};
const MAX_LIVES=3;
const KC_WINDOW=3.5;
function comboMult(){const k=G.kc;return k>=35?3:k>=20?2.5:k>=10?2:k>=5?1.5:1}
function mult(){return comboMult()*cleanMult()*(G.phase>=3?2:1)}
function addScore(n,pos,cls){if(S.ended)return 0;const v=Math.round(n*mult());S.score+=v;if(pos&&SCREEN==="play")scorePop(pos,"+"+v.toLocaleString(),cls);return v}
function onKill(e){if(SCREEN!=="play")return;tutCount("kill");hitMark("kill");sfx("killmark");impactPunch(.35);addSpec(4);G.kc++;G.kcT=KC_WINDOW;G.maxKC=Math.max(G.maxKC,G.kc);
  if(G.kc===5||G.kc===10||G.kc===20||G.kc===35)popText(`콤보 ×${comboMult()}`);
  if(e.elite){tutCount("elite");addScore(1500,e.m.position.clone(),"big");popText("정예기 격파")}
  if(e.ms&&!e.blade)tutCount("ms");
  if(e.ms){addScore(e.blade?1800:1200,e.m.position.clone(),"big");popText(e.blade?"검투기 격파":"적 MS 격파")}}

/* ---- floating score numbers ---- */
const POPS=[];const popWrap=document.createElement("div");popWrap.id="pops";$("hud").appendChild(popWrap);
for(let i=0;i<16;i++){const d=document.createElement("div");d.className="spop";popWrap.appendChild(d);POPS.push({d,t:9,pos:new V3()})}
let popI=0;
function scorePop(pos,text,cls){const p=POPS[popI];popI=(popI+1)%POPS.length;p.t=0;p.pos.copy(pos);p.d.textContent=text;p.d.className="spop "+(cls||"")}
function stepPops(dt){for(const p of POPS){if(p.t>1.4){if(p.d.style.opacity!=="0")p.d.style.opacity="0";continue}p.t+=dt;const v=p.pos.clone().project(camera);
  if(v.z>1){p.d.style.opacity="0";continue}p.d.style.left=((v.x+1)/2*innerWidth)+"px";p.d.style.top=((1-v.y)/2*innerHeight-p.t*34)+"px";p.d.style.opacity=String(Math.min(1,(1.4-p.t)*2.2))}}

/* ---- spawning: clusters + elites ---- */
const SHIELD_GEO=new THREE.SphereGeometry(1,28,14,Math.PI*.08,Math.PI*.84,Math.PI*.16,Math.PI*.68);
function spawnEnemy(pos,elite,ram){
  const g=new THREE.Group(),sc=elite?E_SCALE*1.45:ram?E_SCALE*.8:E_SCALE;
  if(EN_MESH){const mat=EN_MESH.material.clone();mat.emissive=new THREE.Color(0);if(elite)mat.color.setRGB(.7,.78,.95);if(ram)mat.color.setRGB(1,.55,.35);
    const m=new THREE.Mesh(EN_MESH.geometry,mat);m.scale.setScalar(sc);m.position.y=-.5*sc;g.add(m);g.userData.mat=mat;
    const eye=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:elite?0x5ad8ff:ram?0xff9a20:0xff2040,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    eye.position.set(0,(.655-.5)*sc,.2*sc);eye.scale.set(1.1*sc/E_SCALE,1.1*sc/E_SCALE,1);g.add(eye);g.userData.eye=eye
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:elite?0x1a6cff:ram?0xff7a10:0xff2010,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false}));halo.scale.setScalar(sc*1.15);g.add(halo)}
  else g.add(new THREE.Mesh(new THREE.OctahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x4a1e26,flatShading:true})));
  if(elite){const sh=new THREE.Group();sh.position.set(0,.1*sc,.1*sc);sh.scale.setScalar(sc*.62);
    const fill=new THREE.Mesh(SHIELD_GEO,new THREE.MeshBasicMaterial({color:0x48d8ff,transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    const wire=new THREE.Mesh(SHIELD_GEO,new THREE.MeshBasicMaterial({color:0x8fe8ff,wireframe:true,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}));
    sh.add(fill,wire);g.add(sh);g.userData.shield={fill,wire,hit:0}}
  g.position.copy(pos);const yaw=Math.atan2(S.pos.x-pos.x,S.pos.z-pos.z);g.rotation.y=yaw;scene.add(g);
  const e={m:g,v:new V3(),spin:new V3(),launched:0,chain:0,alive:true,phase:Math.random()*10,flash:0,elite:!!elite,rad:elite?6:4.1,
    ram:!!ram,rs:"hunt",rt:0,rdir:new V3(),fireT:2+Math.random()*4,tele:0,teleLock:false,teleDir:new V3(),keep:elite?12+Math.random()*4:15+Math.random()*12,yaw,aim:false};
  enemies.push(e);return e;
}
function aroundPlayer(rMin,rMax,ySpread){const a=Math.random()*Math.PI*2,r=rMin+Math.random()*(rMax-rMin);return new V3(S.pos.x+Math.cos(a)*r,S.pos.y+(Math.random()-.5)*ySpread,S.pos.z+Math.sin(a)*r)}
// mostly in front of the camera (within ~100 deg), so new waves are seen arriving instead of appearing behind the player
function aheadPlayer(rMin,rMax,ySpread){const fa=Math.atan2(Math.sin(S.yaw),Math.cos(S.yaw)),a=Math.random()<.75?fa+(Math.random()-.5)*1.75:Math.random()*Math.PI*2,r=rMin+Math.random()*(rMax-rMin);
  return new V3(S.pos.x+Math.sin(a)*r,S.pos.y+(Math.random()-.5)*ySpread,S.pos.z+Math.cos(a)*r)}
function spawnCluster(n){n=n||2+Math.floor(Math.random()*2);const c=aheadPlayer(40,62,12);
  for(let i=0;i<n;i++){const e=spawnEnemy(c.clone().add(new V3().randomDirection().multiplyScalar(5+Math.random()*4)),false);if(e&&S.started)e.fireT=Math.max(e.fireT,2.5+Math.random()*2);
    if(e&&SCREEN==="play")emit(ADD,{pos:e.m.position.clone(),tex:TX.ring,color:0xff4030,s0:2,s1:9,life:.35,a:.6})}}
// waves trickle in: the field is topped up one small cluster at a time with a per-phase gap, not refilled the instant something dies.
// Before the sortie starts (title demo / catapult) the field is filled at once.
function fillEnemies(dt){if(VS||S.demo||CINE.on||TUT.on||INTRO.on)return;const ph=PHASES[G.phase];let alive=0,el=0,rm=0,ms=0,bl=0;for(const e of enemies)if(e.alive&&e.launched<=0&&!e.isBoss&&!e.isWP){alive++;if(e.elite)el++;if(e.ram)rm++;if(e.blade)bl++;else if(e.ms)ms++}
  const live=SCREEN==="play"&&S.started;
  if(!live){let guard=0;while(alive<ph.count&&guard++<8){spawnCluster(3);alive+=3}return}
  dt=dt||0;foesTick(dt);G.spawnT-=dt;G.bigT-=dt;
  if(G.bigT<=0){
    if(bl<(ph.blade||0)&&spawnMS(aheadPlayer(40,52,6),true)){G.bigT=7;return}
    if(ms<(ph.ms||0)&&spawnMS(aheadPlayer(36,48,8))){G.bigT=6;return}
    if(EN_MESH&&el<ph.elites){spawnEnemy(aheadPlayer(32,42,8),true);G.bigT=6;return}
    if(EN_MESH&&rm<ph.rams){spawnEnemy(aheadPlayer(48,62,10),false,true);G.bigT=3.5;return}}
  if(G.spawnT>0||alive>=ph.count)return;
  const need=ph.count-alive;spawnCluster(Math.min(need,need>4?3:2));G.spawnT=ph.gap[0]+Math.random()*(ph.gap[1]-ph.gap[0])}
function eliteBlocks(e,from){if(!e.elite)return false;const to=from.clone().sub(e.m.position).setY(0).normalize();
  return to.dot(new V3(Math.sin(e.yaw),0,Math.cos(e.yaw)))>.3}
function shieldFlash(e){const s=e.m.userData.shield;if(s)s.hit=1;fxElectric(e.m.position.clone().add(new V3(0,1,0)),6)}

/* ---- enemy AI: approach, hover, telegraph, fire ---- */
const teleGeo=new THREE.CylinderGeometry(.05,.05,1,6,1,true);teleGeo.rotateX(Math.PI/2);teleGeo.translate(0,0,.5);
function teleCount(){let n=0;for(const e of enemies)if(e.alive&&e.tele>0)n++;return n}
function enemyAI(e,dt,T){
  if(e.isRemote)return;if(e.isBoss){bossAI(e,dt,T);return}if(e.isWP)return;if(foeAI(e,dt,T))return;if(e.ram){ramAI(e,dt,T);return}
  const em=e.m;e.phase+=dt;const to=S.pos.clone().sub(em.position),d=to.length();to.normalize();
  if(e.ms){if(msMove(e,dt,T))return}else{
  if(d>e.keep)em.position.addScaledVector(to,dt*(e.elite?5:3.4+Math.sin(e.phase)*1.4));
  else if(d<e.keep-6)em.position.addScaledVector(to,-dt*3);
  em.position.y+=Math.sin(e.phase*1.3)*dt*1.1;em.position.x+=Math.cos(e.phase*.9)*dt*1.2;
  // spread out: keep ~7 m from other drones and slowly circle the player so they surround instead of stacking
  for(const o of enemies){if(o===e||!o.alive||o.launched>0||o.isBoss||o.isWP||o.isRemote)continue;const dv=em.position.clone().sub(o.m.position),dd=dv.length(),min=(e.rad+o.rad)*1.05;
    if(dd<min&&dd>1e-3)em.position.addScaledVector(dv.divideScalar(dd),Math.min(min-dd,dt*9))}
  if(e.orbit===undefined)e.orbit=Math.random()<.5?-1:1;
  if(d<e.keep+8){const side=new V3(to.z,0,-to.x);em.position.addScaledVector(side,e.orbit*dt*(e.elite?1.2:2.2))}
  const want=Math.atan2(S.pos.x-em.position.x,S.pos.z-em.position.z);
  let dy=Math.atan2(Math.sin(want-e.yaw),Math.cos(want-e.yaw));
  e.yaw+=clamp(dy,-(e.elite?.85:4)*dt,(e.elite?.85:4)*dt);
  em.rotation.set(0,e.yaw,Math.sin(e.phase*.8)*.08);}
  const s=em.userData.shield;if(s){s.hit=Math.max(0,s.hit-dt*4);s.fill.material.opacity=.12+s.hit*.5+Math.sin(T*9+e.phase)*.03;s.wire.material.opacity=.2+s.hit*.6}
  const eye=em.userData.eye;
  // firing
  const ph=PHASES[G.phase],live=SCREEN==="play"&&!S.ended&&S.started;
  if(e.tele>0){
    e.tele-=dt;const from=em.position.clone().add(new V3(0,.6,0));
    if(!e.teleLock){const lead=S.pos.distanceTo(from)/((PHASES[G.phase].bolt||85)*(e.elite?1.12:1))*.6;e.teleDir.copy(S.pos).addScaledVector(S.vel,lead).sub(from).normalize();if(e.tele<.32){e.teleLock=true;sfx("tele",em.position,1)}}
    if(!e.teleMesh){const art=FXOK.beam;e.teleMesh=new THREE.Mesh(art?ribbonGeo:teleGeo,new THREE.MeshBasicMaterial({map:art?FXT.beam:null,color:0xff2a2a,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));e.teleMesh.userData.k=art?6:1;e.teleMesh.frustumCulled=false;scene.add(e.teleMesh)}
    const tm=e.teleMesh;tm.position.copy(from);tm.lookAt(from.clone().add(e.teleDir));const reach=Math.max(4,S.pos.clone().sub(from).dot(e.teleDir)-1.5);{const k=tm.userData.k||1,w=k*(e.teleLock?1.8+Math.sin(T*40)*.25:.7);tm.scale.set(w,w,reach)}
    tm.material.opacity=e.teleLock?(.8+.2*((T*30|0)%2)):.28+(1-e.tele/ph.tele)*.4;
    if(eye)eye.scale.setScalar((e.elite?1.6:1.1)*(1.4+Math.sin(T*40)*.3));
    if(e.tele<=0||!live){if(live){fireEnemyBolt(from,e.teleDir,e.elite,e);if(e.ms){e.burstN=2;e.burstT=.16;e.kick=1}}clearTele(e)}
  }else{
    if(eye){eye.material.opacity=.75+Math.sin(T*6+e.phase)*.25;eye.scale.setScalar(e.elite?1.6:1.1)}
    if(live){e.fireT-=dt;
      if(e.fireT<=0){e.fireT=(ph.fire[0]+Math.random()*(ph.fire[1]-ph.fire[0]))*(BOSS.e&&BOSS.e.alive?1.8:1); /* while the boss is up the small fry fire less: the boss is the threat */
        const onScreen=camFwd().dot(em.position.clone().sub(camera.position).normalize())>.3;
        if(d<50&&d>7&&onScreen&&teleCount()<ph.maxTele){e.tele=ph.tele;e.teleLock=false;sfx("tele",em.position,0)}}}}
  // aim-preview highlight
  if(em.userData.mat&&e.flash<=0){const k=e.aim?.16+.1*Math.sin(T*14):0;em.userData.mat.emissive.setRGB(k,k*.55,0)}
}
function clearTele(e){e.tele=0;e.teleLock=false;if(e.teleMesh){scene.remove(e.teleMesh);e.teleMesh.material.dispose();e.teleMesh=null}}

/* ---- enemy projectiles ---- */
const eCore=new THREE.CylinderGeometry(.14,.14,3.4,6);eCore.rotateX(Math.PI/2);
const eOuter=new THREE.CylinderGeometry(.42,.25,4.4,10,1,true);eOuter.rotateX(Math.PI/2);
function fireEnemyBolt(from,dir,elite,owner,dmg){
  const g=new THREE.Group();g.add(new THREE.Mesh(eCore,new THREE.MeshBasicMaterial({color:0xfff0f0})));
  g.add(new THREE.Mesh(eOuter,new THREE.MeshBasicMaterial({color:elite?0x40c8ff:0xff2a2a,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})));
  if(FXOK.beam){const c=elite?0x40c8ff:0xff3a2a,tr=new THREE.Mesh(ribbonGeo,new THREE.MeshBasicMaterial({map:FXT.beam,color:c,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    tr.scale.set(2.2,2.2,-9);tr.frustumCulled=false;g.add(tr);const hd=new THREE.Sprite(new THREE.SpriteMaterial({map:FXOK.hit?FXT.hit:TX.glow,color:c,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));hd.scale.setScalar(3.4);g.add(hd)}
  g.position.copy(from);g.lookAt(from.clone().add(dir));scene.add(g);
  G.ebolts.push({g,dir:dir.clone(),speed:(PHASES[G.phase].bolt||85)*(elite?1.12:1),life:1.6,dead:false,color:elite?0x40c8ff:0xff3030,owner:owner||null,dmg:dmg||(elite?30:24),refl:false});
  emit(ADD,{pos:from,tex:TX.flare,color:elite?0x80e0ff:0xff6060,s0:3,s1:5,life:.1});sfx("efire",from);
}
function stepEBolts(dt){
  for(let i=G.ebolts.length-1;i>=0;i--){const b=G.ebolts[i];const p0=b.g.position.clone();b.g.position.addScaledVector(b.dir,b.speed*dt);b.life-=dt;if(!b.vsVisual&&!b.refl&&fieldBlock(b.g.position)){b.life=0;b.dead=false}else if(b.vsVisual&&vsCoverAt(b.g.position,.2)){b.life=0;b.dead=false}
    if(b.homing>0&&!b.refl&&!b.dead){b.homing-=dt;const to=S.pos.clone().add(new V3(0,.4,0)).sub(b.g.position).normalize();b.dir.lerp(to,Math.min(1,dt*(b.turn||2))).normalize();b.g.lookAt(b.g.position.clone().add(b.dir))}
    b.trailT=(b.trailT||0)-dt;
    if(dt>0&&(!b.vsVisual||b.trailT<=0)){b.trailT=1/30;emit(ADD,{pos:b.g.position.clone().addScaledVector(b.dir,-1.6),color:b.color,s0:1.2,s1:.1,life:.16,a:b.dead?.25:.7});}
    if(b.vsVisual){}
    else if(!b.dead&&!b.refl&&SCREEN==="play"&&boltDefense(b)){}
    else if(b.refl){if(b.home&&b.home.alive&&b.home.launched<=0){const to=b.home.m.position.clone().sub(b.g.position).normalize();b.dir.lerp(to,Math.min(1,dt*8)).normalize();b.g.lookAt(b.g.position.clone().add(b.dir))}for(const e of enemies){if(!targetable(e)||e.isBoss)continue;if(e.m.position.distanceTo(b.g.position)<3.2){if(e.isWP)wpDamage(e,2,b.g.position.clone());else{knock(e,b.dir,32,1.8);hitFlash(e);addScore(220,e.m.position.clone(),"cyan")}fxImpact(b.g.position,0x8dff7a);b.life=0;b.dead=true;break}}}
    else if(!b.dead&&SCREEN==="play"){const c=S.pos.clone().add(new V3(0,.4,0));const seg=b.g.position.clone().sub(p0),L=seg.length()||1e-6;
      const tt=clamp(c.clone().sub(p0).dot(seg)/(L*L),0,1);const dd=p0.clone().addScaledVector(seg,tt).distanceTo(c);
      if(dd<2.3){if(G.iframe>0){b.dead=true}else{hurt(b);b.life=0}}}
    if(b.life<=0){if(!b.dead)fxImpact(b.g.position,b.color);scene.remove(b.g);b.g.children.forEach(c=>c.material.dispose());G.ebolts.splice(i,1)}}
}
function hurt(b){
  if(VS)return; // PvP HP is updated only by the room server.
  if(TUT.on){tutHurt(b);return}
  if(G.armor>0){G.armor=0;G.iframe=1;sfx("armor");popText("반응 장갑 작동");emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x7fe0ff,s0:3,s1:14,life:.4});fxImpact(S.pos.clone().add(new V3(0,.8,0)),0x7fe0ff);S.vel.addScaledVector(b.dir,10);S.shake=.5;return}
  if(G.dead>0)return;
  fxImpact(S.pos.clone().add(new V3(0,.8,0)),0xff4030);sparks(S.pos,b.dir,0xffb080,20,.4,24);sfx("hurt");
  // HP system: every frame has 100 HP; a hit staggers you (no control) unless you break out with Shift
  const dmg=Math.round(b.dmg||(b.ram?34:24));G.hp=Math.max(0,(G.hp??HP_MAX)-dmg);G.clean=0;G.hpT=0;
  if(G.hp>0){G.stagger=Math.max(G.stagger,STAGGER);G.iframe=Math.max(G.iframe,.55);G.broke=false;S.hitstop=Math.max(S.hitstop,.06);S.shake=Math.max(S.shake,.55);
    if(b.dir){S.vel.copy(b.dir).multiplyScalar(18);S.freeT=.3}S.act=null;S.dash=0;S.dashT=null;S.pending=null;flash(.15);
    const h=$("hurt");h.classList.remove("on");void h.offsetWidth;h.classList.add("on");popText(`피격 −${dmg} · Shift로 경직 풀기`);return}
  destroyMech(b.dir);
}

/* ---- dodge / just dodge ---- */
function dodge(){
  if(VS){
    if(VS.phase==="fight"&&G.stagger>0&&!G.broke&&!PAUSED){vsSend({t:"dodge"});return} // stagger break-out, the room server decides
    if(vsCanAct()&&S.over<=0&&S.boost>=20&&(G.dodgeCd>0||S.attackCd>0||S.shotCd>0)){S.buf="d";S.bufT=.25;return} // pressed during recovery: dodge as soon as it opens
    if(!vsCanAct()||S.over>0||G.dodgeCd>0||S.attackCd>0||S.shotCd>0||S.boost<20)return;
    G.dodgeCd=.65;S.boost-=20;G.iframe=Math.max(G.iframe,.18);const d=new V3(),f=fwd(),r=new V3(Math.cos(S.yaw),0,-Math.sin(S.yaw));
    if(keys.KeyW)d.add(f);if(keys.KeyS)d.sub(f);if(keys.KeyA)d.add(r);if(keys.KeyD)d.sub(r);if(keys.Space)d.y+=1;if(keys.KeyC)d.y-=1;if(!d.lengthSq())d.copy(r).negate();d.normalize();bodyDodge(d);S.vel.copy(d.multiplyScalar(63));S.freeT=.3;vsSend({t:"dodge"});sfx("dodge");return;
  }
  if(SCREEN==="play"&&!S.ended&&!PAUSED&&G.stagger>0&&G.dead<=0&&!G.broke){ // stagger break-out
    if(S.boost<BREAK_COST){popText("부스트 부족 · 경직 풀기 불가");sfx("deny");return}
    G.broke=true;G.stagger=0;S.boost-=BREAK_COST;G.iframe=Math.max(G.iframe,.45);G.dodgeCd=.3;S.vel.multiplyScalar(.2);sfx("just");popText("경직 풀기");
    emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0xffd060,s0:2,s1:16,life:.4,a:.9});tutCount("break");return}
  if(SCREEN!=="play"||S.ended||PAUSED||G.dodgeCd>0||G.stagger>0||G.dead>0||S.over>0||S.boost<12)return;
  if(G.mega){if(G.mega.mode!=="r")return;megaEnd(false)} // a dodge cancels the R beam; the F burst is committed
  G.dodgeCd=.4;S.boost-=12;G.iframe=Math.max(G.iframe,.22);
  const f=fwd(),r=new V3(Math.cos(S.yaw),0,-Math.sin(S.yaw)),d=new V3();
  if(keys.KeyW)d.add(f);if(keys.KeyS)d.sub(f);if(keys.KeyA)d.add(r);if(keys.KeyD)d.sub(r);if(keys.Space)d.y+=1;if(keys.KeyC)d.y-=1;
  if(d.lengthSq()===0)d.copy(r).negate();d.normalize();bodyDodge(d);S.vel.copy(d.multiplyScalar(63));S.freeT=.3;sfx("dodge"); /* 72 → 63: a slightly shorter quick dodge */tutCount("dodge");
  for(let i=0;i<10;i++){const k=i/10;emit(ADD,{pos:S.pos.clone().addScaledVector(d,-k*6/72).add(new V3(0,.8,0)),tex:TX.streak,color:0x7fe0ff,s0:5,s1:1,life:.25+k*.2,a:.45*(1-k)})}
  for(let i=0;i<6;i++)emit(ADD,{pos:S.pos.clone().add(new V3((Math.random()-.5)*1.5,Math.random()*2.5-.5,(Math.random()-.5)*1.5)),color:0x7fe0ff,s0:2,s1:.3,life:.35,a:.5});
  let just=false;
  const me=S.pos.clone().add(new V3(0,.4,0));
  for(const b of G.ebolts){if(b.dead)continue;const rel=me.clone().sub(b.g.position),along=rel.dot(b.dir);if(along<0)continue;
    const miss=rel.clone().addScaledVector(b.dir,-along).length();if(along/b.speed<.15&&miss<2.4){just=true;b.dead=true}}
  for(const e of enemies){if(!e.ram||e.rs!=="charge"||!e.alive||e.launched>0)continue;const rel=me.clone().sub(e.m.position),along=rel.dot(e.rdir);if(along<0)continue;
    if(along/RAM_SPEED<.22&&rel.clone().addScaledVector(e.rdir,-along).length()<3.2){just=true;e.dodged=true;tutCount("ramDodge")}}
  if(just)justDodge();
}
function justDodge(){tutCount("just");
  addSpec(12);if(G.unit==="shield"&&!G.armor&&G.guardCd<=0){G.armor=1;G.guardCd=25;popText("실드 비트 · 1회 피격 무효")}
  S.slow=.75;G.crit=2.6;G.iframe=.9;S.boost=Math.min(100,S.boost+40);S.heat=Math.max(0,S.heat-25);
  popText("저스트 회피 · 반격 찬스!");sfx("just");addScore(300,S.pos.clone().add(new V3(0,2,0)),"cyan");
  const f=$("flash");f.style.background="#7fe0ff";flash(.28);setTimeout(()=>{f.style.background="#fff"},220);
  emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x7fe0ff,s0:2,s1:18,life:.45,a:.9});
}


/* ---- aim preview: predicted launch path + chain candidates ---- */
const AIM_DOTS=[];for(let i=0;i<22;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.core,color:0xffb21a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));sp.scale.set(.45,.45,1);sp.visible=false;scene.add(sp);AIM_DOTS.push(sp)}
function launchDir(nextIdx){const dir=camFwd();dir.y*=.5;if(nextIdx===1)dir.add(new V3(Math.cos(S.yaw),0,-Math.sin(S.yaw)).multiplyScalar(-.25));if(nextIdx===2||G.crit>0)dir.y+=.15;return dir.normalize()}
function updateAim(T){
  for(const e of enemies)e.aim=false;G.aimN=0;
  const show=SCREEN==="play"&&target&&!target.isWP&&!target.isBoss&&!target.isRemote&&!S.ended&&S.over<=0&&G.stagger<=0;
  if(!show){AIM_DOTS.forEach(s=>s.visible=false);return}
  const next=(clockT-S.lastSlash<COMBO_WIN)?(S.combo+1)%3:0,heavy=next===2||G.crit>0,L=heavy?80:58;
  const o=target.m.position,dir=launchDir(next),rad=G.crit>0?4.8:target.rad;
  AIM_DOTS.forEach((s,i)=>{const k=(i+1)/AIM_DOTS.length;s.visible=true;s.position.copy(o).addScaledVector(dir,k*L);
    const pulse=((k*6-T*3)%1+1)%1;s.material.opacity=(1-k)*.55+.15*pulse;s.material.color.set(G.crit>0?0x7fe0ff:0xffb21a)});
  for(const e of enemies){if(!e.alive||e===target||e.launched>0)continue;const v=e.m.position.clone().sub(o),t=v.dot(dir);
    if(t<0||t>L)continue;if(o.clone().addScaledVector(dir,t).distanceTo(e.m.position)<Math.max(rad,e.elite?4.5:0)+.4){e.aim=true;G.aimN++}}
}

/* ---- per-frame tick ---- */
function gameplayTick(dt,rdt,T){
  if(SCREEN==="play"&&!S.ended){const el=120-S.time;let ph=0;for(let i=0;i<PHASES.length;i++)if(el>=PHASES[i].at)ph=i;
    if(ph!==G.phase&&!VS){G.phase=ph;phaseBanner(PHASES[ph]);sfx("phase");if(ph===2&&EN_MESH){spawnEnemy(aroundPlayer(28,34,6),true)}if(ph===3)spawnBoss()}}
  if(G.kcT>0){G.kcT-=dt;if(G.kcT<=0){if(G.kc>=5)popText("콤보 종료");G.kc=0}}
  if(G.dead>0){G.dead-=rdt;if(G.dead<=0)respawnMech()}
  else if(SCREEN==="play"&&S.started&&!S.ended){const was=cleanMult();G.clean+=dt;const now=cleanMult();if(now>was){popText(`무피격 ×${now.toFixed(1)}`);sfx("chain",null,2)}}
  if(!VS&&G.dead<=0&&SCREEN==="play"&&S.started){G.hpT=(G.hpT||0)+dt;if(G.hpT>HP_REGEN_AFTER&&G.hp<HP_MAX)G.hp=Math.min(HP_MAX,G.hp+HP_REGEN*dt)}
  {const low=!VS&&SCREEN==="play"&&S.started&&!S.ended&&G.hp<35&&G.dead<=0; // only during a live sortie (never on menus after a run ends)
  if(low!==document.body.classList.contains("dmg"))document.body.classList.toggle("dmg",low);if(low){const t=$("dmgTxt"),x=`장갑 위험 · ${Math.ceil(G.hp)}`;if(t.textContent!==x)t.textContent=x}}
  threatMarks();
  G.guardCd=Math.max(0,G.guardCd-dt);
  G.iframe=Math.max(0,G.iframe-dt);G.stagger=Math.max(0,G.stagger-dt);G.dodgeCd=Math.max(0,G.dodgeCd-dt);G.crit=Math.max(0,G.crit-dt);
  stepEBolts(dt);stepPops(rdt);updateAim(T);itemsTick(dt,rdt,T);unitsTick(dt,rdt,T);bossTick(dt,rdt,T);vsTick(rdt);
}
function phaseBanner(p){const b=$("phase");$("phaseName").textContent=p.name;$("phaseSub").textContent=p.sub;b.classList.remove("on");void b.offsetWidth;b.classList.add("on")}
function resetGameplay(){document.body.classList.remove("dmg");
  for(const b of G.ebolts){scene.remove(b.g);b.g.children.forEach(c=>c.material.dispose())}
  for(const e of enemies)clearTele(e);
  Object.assign(G,{hp:HP_MAX,hpT:0,broke:false,spawnT:1.5,bigT:4,phase:0,kc:0,kcT:0,maxKC:0,crit:0,iframe:0,stagger:0,dodgeCd:0,ebolts:[],aimN:0,focus:null,lives:MAX_LIVES,dead:0,clean:0,guardCd:0});
  AIM_DOTS.forEach(s=>s.visible=false);resetItems();resetUnits();resetBoss();if(P)P.root.visible=true;
}

/* ---- armour, destruction, reserve units ---- */
function destroyMech(dir){
  megaEnd(true);G.lives--;G.clean=0;G.spec=Math.floor(G.spec*.5);G.dead=2.2;G.stagger=2.4;G.iframe=5;G.focus=null;G.kc=0;G.kcT=0;S.act=null;S.dash=0;S.dashT=null;S.pending=null;S.bladeOn=0;
  const c=S.pos.clone();fxExplosion(c,2.2);fxExplosion(c.clone().add(new V3(1.5,1,0)),1.3);sfx("destroyed");S.shake=1.6;S.slow=.9;flash(.55);
  if(P)P.root.visible=false;S.vel.multiplyScalar(.15);
  const h=$("hurt");h.classList.remove("on");void h.offsetWidth;h.classList.add("on");
  popText(G.lives>0?`피격 · 기체 대파 — 남은 기체 ${G.lives}`:"전 기체 손실");
}
function respawnMech(){
  if(G.lives<=0){finishRun("lost");return}
  G.hp=HP_MAX;G.hpT=0;document.body.classList.remove("dmg");G.iframe=3;G.respawnBlink=true;setTimeout(()=>{G.respawnBlink=false},2900);G.stagger=0;S.boost=100;S.heat=0;S.over=0;if(P)P.root.visible=true;
  S.vel.copy(fwd().multiplyScalar(30));sfx("respawn");flash(.3);popText("예비기 출격");
  emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0xffb21a,s0:2,s1:22,life:.5});emit(ADD,{pos:S.pos.clone(),tex:TX.flare,color:0xffffff,s0:8,s1:14,life:.18});
}

/* ---- rammer drones: hunt, arm (flashing orange line), then charge in a straight line ---- */
const RAM_SPEED=72;
const HP_MAX=100,STAGGER=.85,BREAK_COST=40,HP_REGEN_AFTER=8,HP_REGEN=2.5; // per-frame HP, hit stagger, Shift break-out cost, slow regen when untouched
function ramAI(e,dt,T){
  const em=e.m,eye=em.userData.eye,live=SCREEN==="play"&&!S.ended&&S.started;e.phase+=dt;
  if(e.rs==="hunt"){const to=S.pos.clone().sub(em.position),d=to.length();to.normalize();
    em.position.addScaledVector(to,dt*(d>32?18:6));em.position.y+=Math.sin(e.phase*2)*dt*2;
    e.yaw=Math.atan2(to.x,to.z);em.rotation.set(.3,e.yaw,Math.sin(e.phase*3)*.2);
    if(eye){eye.material.opacity=.8;eye.scale.setScalar(.9)}
    e.rt-=dt;if(live&&d<34&&e.rt<=0&&G.dead<=0){e.rs="arm";e.rt=.85;sfx("tele",em.position,0)}}
  else if(e.rs==="arm"){e.rt-=dt;if(e.rt>.3)e.rdir.copy(S.pos).sub(em.position).normalize();
    em.rotation.y=Math.atan2(e.rdir.x,e.rdir.z);em.position.addScaledVector(e.rdir,-dt*3);
    if(!e.teleMesh){e.teleMesh=new THREE.Mesh(teleGeo,new THREE.MeshBasicMaterial({color:0xff8a20,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(e.teleMesh)}
    const tm=e.teleMesh;tm.position.copy(em.position);tm.lookAt(em.position.clone().add(e.rdir));tm.scale.set(4,4,46);tm.material.opacity=e.rt<.3?.55+.4*((T*30|0)%2):.18;
    if(eye)eye.scale.setScalar(1.3+Math.sin(T*40)*.3);
    if(e.rt<=0){clearTele(e);if(!live){e.rs="hunt";e.rt=2;return}e.rs="charge";e.rt=1.1;e.dodged=false;sfx("dash",em.position)}}
  else if(e.rs==="charge"){e.rt-=dt;const p0=em.position.clone();em.position.addScaledVector(e.rdir,RAM_SPEED*dt);em.rotation.z+=dt*14;
    if(dt>0)emit(ADD,{pos:em.position.clone(),color:0xff7a20,s0:2.2,s1:.2,life:.25,a:.8});
    if(live&&!e.dodged&&G.dead<=0){const c=S.pos.clone().add(new V3(0,.4,0)),seg=em.position.clone().sub(p0),L=seg.length()||1e-6,tt=clamp(c.clone().sub(p0).dot(seg)/(L*L),0,1);
      if(p0.clone().addScaledVector(seg,tt).distanceTo(c)<2.8){if(G.iframe<=0){hurt({dir:e.rdir.clone(),dmg:34})}ramBlow(e);return}}
    if(e.rt<=0){e.rs="hunt";e.rt=2.2+Math.random()*1.5}}
}
function ramBlow(e){e.alive=false;const p=e.m.position.clone();disposeEnemy(e);fxExplosion(p,1.2);sfx("boom",p,0)}

/* ---- incoming-fire markers: arrows on a ring round the reticle point at threats that are off-screen or behind ---- */
const THR={els:null,_v:new V3()};
function threatMarks(){if(!THR.els)THR.els=[...document.querySelectorAll("#threats i")];const els=THR.els,list=[];
  if(SCREEN==="play"&&!VS&&!S.ended&&G.dead<=0&&camera){
    for(const e of enemies){if(!e.alive||e.launched>0)continue;const lock=e.tele>0&&e.teleLock||e.ram&&e.rs==="charge";if(!(e.tele>0||e.ram&&(e.rs==="arm"||e.rs==="charge")))continue;list.push({p:e.m.position,lock,d:e.m.position.distanceTo(S.pos)})}
    for(const b of G.ebolts){if(b.dead||b.refl)continue;const rel=S.pos.clone().sub(b.g.position),d=rel.length();if(d>45||b.dir.dot(rel)/d<.85)continue;list.push({p:b.g.position,lock:true,d})}}
  list.sort((a,b)=>(b.lock-a.lock)||(a.d-b.d));
  const cx=innerWidth/2,cy=innerHeight*.44,R=Math.min(innerWidth,innerHeight)*.3;let n=0;
  for(const t of list){if(n>=els.length)break;const v=THR._v.copy(t.p).applyMatrix4(camera.matrixWorldInverse);
    const behind=v.z>0,pr=THR._v.copy(t.p).project(camera);if(!behind&&Math.abs(pr.x)<.82&&Math.abs(pr.y)<.78)continue; // on screen: the beam line already shows it
    let a=Math.atan2(-v.y,v.x);if(behind&&Math.abs(v.x)<1e-3)a=Math.PI/2;const el=els[n++];
    el.style.display="block";el.style.transform=`translate(${cx+Math.cos(a)*R}px,${cy+Math.sin(a)*R}px) rotate(${a}rad)`;el.classList.toggle("lock",t.lock)}
  for(;n<els.length;n++)if(els[n].style.display!=="none")els[n].style.display="none"}
