/* ================= extra enemy types (10/29): kamikaze drones, snipers, formation rush, supply crates =================
   Scheduled by foesTick() from fillEnemies (live sorties only). Each type has its own AI, dispatched from enemyAI.
   kami    - blinks red and rams you; dies in a chain blast (knocks every drone nearby) — shoot / slash it near a pack
   sniper  - hangs back at ~80 m, paints you with a thin violet line for 1.8 s (locks 0.45 s before), then one fast heavy shot
   form    - every 30 s five drones form a V far ahead, warn for 1.2 s, then rush straight through: line them up for the mega beam
   crate   - supply container drifting nearby: break it for a gravity bomb (the only source), +30 special gauge and full boost */
const FOE_LIMIT=[{kami:0,sniper:0},{kami:1,sniper:1},{kami:2,sniper:1},{kami:1,sniper:0}]; /* final phase: the boss is the main threat */
function foesReset(){G.nf={kamiT:6,snipeT:4,formT:15,crateT:9}}
function foesTick(dt){if(TUT.on||VS)return;if(!G.nf)foesReset();const n=G.nf,el=120-S.time,lim=FOE_LIMIT[G.phase]||FOE_LIMIT[3];
  let k=0,sn=0,cr=0;for(const e of enemies){if(!e.alive)continue;if(e.kami)k++;if(e.sniper)sn++;if(e.crate)cr++}
  n.kamiT-=dt;n.snipeT-=dt;n.formT-=dt;n.crateT-=dt;
  if(n.kamiT<=0&&k<lim.kami){const c=aheadPlayer(55,70,10);for(let i=0;i<Math.min(2,lim.kami-k);i++)spawnKami(c.clone().add(new V3().randomDirection().multiplyScalar(6)));n.kamiT=8+Math.random()*4}
  if(n.snipeT<=0&&sn<lim.sniper){spawnSniper(aheadPlayer(78,90,14));n.snipeT=14+Math.random()*6}
  if(n.formT<=0&&el>=12&&!BOSS.e){spawnFormation();n.formT=30}
  if(n.crateT<=0&&cr<1){spawnCrate(aheadPlayer(34,48,8));n.crateT=22+Math.random()*6}}

/* ---- shared body ---- */
function foeBody(tint,eyeC,scale){const g=new THREE.Group(),sc=E_SCALE*scale;
  if(EN_MESH){const mat=EN_MESH.material.clone();mat.emissive=new THREE.Color(0);mat.color.setRGB(...tint);const m=new THREE.Mesh(EN_MESH.geometry,mat);m.scale.setScalar(sc);m.position.y=-.5*sc;g.add(m);g.userData.mat=mat;
    const eye=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:eyeC,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));eye.position.set(0,(.655-.5)*sc,.2*sc);eye.scale.setScalar(1.1*scale);g.add(eye);g.userData.eye=eye}
  else g.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.5,0),new THREE.MeshStandardMaterial({color:0x4a1e26,flatShading:true})));
  return g}
function foeAdd(g,pos,extra){g.position.copy(pos);const yaw=Math.atan2(S.pos.x-pos.x,S.pos.z-pos.z);g.rotation.y=yaw;scene.add(g);
  const e=Object.assign({m:g,v:new V3(),spin:new V3(),launched:0,chain:0,alive:true,phase:Math.random()*10,flash:0,elite:false,rad:4.1,ram:false,rs:"hunt",rt:0,rdir:new V3(),fireT:99,tele:0,teleLock:false,teleDir:new V3(),keep:20,yaw,aim:false},extra);
  enemies.push(e);if(SCREEN==="play")emit(ADD,{pos:pos.clone(),tex:TX.ring,color:0xff4030,s0:2,s1:9,life:.35,a:.6});return e}
function foeFace(e,dt,rate){const em=e.m,want=Math.atan2(S.pos.x-em.position.x,S.pos.z-em.position.z);const dy=Math.atan2(Math.sin(want-e.yaw),Math.cos(want-e.yaw));e.yaw+=clamp(dy,-rate*dt,rate*dt);em.rotation.set(em.rotation.x,e.yaw,em.rotation.z)}
function foeAI(e,dt,T){if(e.kami)return kamiAI(e,dt,T),true;if(e.sniper)return sniperAI(e,dt,T),true;if(e.form)return formAI(e,dt,T),true;if(e.crate)return crateAI(e,dt,T),true;return false}
const foeLive=()=>SCREEN==="play"&&!S.ended&&S.started;

/* ---- kamikaze ---- */
function spawnKami(pos){const g=foeBody([1,.32,.25],0xff2010,.75);const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff3010,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));halo.scale.setScalar(E_SCALE*1.1);g.add(halo);g.userData.halo=halo;
  return foeAdd(g,pos,{kami:true,rad:3.6})}
function kamiAI(e,dt,T){const em=e.m,to=S.pos.clone().sub(em.position),d=to.length();to.normalize();e.phase+=dt;
  const sp=d>40?20:13;em.position.addScaledVector(to,dt*sp);em.position.y+=Math.sin(e.phase*3)*dt*1.5;foeFace(e,dt,6);em.rotation.z+=dt*6;
  const blink=(T*(d<20?16:6)|0)%2,h=em.userData.halo,eye=em.userData.eye;if(h)h.material.opacity=blink?.85:.25;if(eye)eye.scale.setScalar(blink?1.4:.8);
  if(em.userData.mat&&e.flash<=0)em.userData.mat.emissive.setRGB(blink?.45:.08,.02,0);
  if(foeLive()&&d<5.5&&G.dead<=0){e.alive=false;const p=em.position.clone();disposeEnemy(e);kamiBlast(p,true)}}
// self-detonation hurts you; a kill makes it a free chain bomb for you
function kamiBlast(p,self){fxExplosion(p,1.9);sfx("boom",p,2);flashLight(p,0xff6020,14,60,.4);emit(ADD,{pos:p,tex:TX.ring,color:0xff6a20,s0:3,s1:34,life:.45});S.shake=Math.max(S.shake,self?.9:.6);
  if(self){if(G.iframe<=0)hurt({dir:S.pos.clone().sub(p).normalize(),dmg:30});return}
  let n=0;for(const o of enemies){if(!o.alive||o.launched>0||o.isBoss||o.isRemote)continue;const dv=o.m.position.clone().sub(p),dd=dv.length();if(dd>17)continue;
    if(o.isWP){wpDamage(o,3,o.m.position.clone());continue}knock(o,dd<.5?new V3().randomDirection():dv.normalize(),34,1.9);o.rad=Math.max(o.rad,4.4);hitFlash(o);n++}
  if(n){addScore(CHAIN_PTS*n,p.clone().add(new V3(0,4,0)),"big");popText(`유폭 ×${n}`)}}

/* ---- sniper ---- */
const SNIPE_TELE=1.8,SNIPE_LOCK=.45;
function spawnSniper(pos){const g=foeBody([.62,.45,1],0xc070ff,1.05);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.25,.25,3.6),new THREE.MeshStandardMaterial({color:0x2a2238,metalness:.7,roughness:.4}));fin.position.set(0,.6,1.8);g.add(fin);
  return foeAdd(g,pos,{sniper:true,rad:4.4,fireT:3+Math.random()*2})}
function sniperAI(e,dt,T){const em=e.m,to=S.pos.clone().sub(em.position),d=to.length();to.normalize();e.phase+=dt;
  if(d>90)em.position.addScaledVector(to,dt*8);else if(d<70)em.position.addScaledVector(to,-dt*7);
  em.position.y+=(S.pos.y+8-em.position.y)*dt*.3+Math.sin(e.phase)*dt*.8;foeFace(e,dt,2);
  const eye=em.userData.eye;if(!foeLive()){clearTele(e);return}
  if(e.tele>0){e.tele-=dt;const from=em.position.clone().add(new V3(0,.6,0));
    if(!e.teleLock){e.teleDir.copy(S.pos).add(new V3(0,.4,0)).sub(from).normalize();if(e.tele<SNIPE_LOCK){e.teleLock=true;sfx("tele",em.position,1)}}
    if(!e.teleMesh){e.teleMesh=new THREE.Mesh(teleGeo,new THREE.MeshBasicMaterial({color:0xc060ff,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));e.teleMesh.frustumCulled=false;scene.add(e.teleMesh)}
    const tm=e.teleMesh;tm.position.copy(from);tm.lookAt(from.clone().add(e.teleDir));tm.scale.set(e.teleLock?2.6:1,e.teleLock?2.6:1,Math.max(4,d+30));
    tm.material.opacity=e.teleLock?.75+.25*((T*30|0)%2):.18+(1-e.tele/SNIPE_TELE)*.35;if(eye)eye.scale.setScalar(1.2+(1-e.tele/SNIPE_TELE)*1.4);
    if(e.tele<=0){clearTele(e);fireEnemyBolt(from,e.teleDir,false,e,30);const nb=G.ebolts[G.ebolts.length-1];if(nb){nb.speed=230;nb.color=0xc060ff;nb.life=Math.max(nb.life,1.2)}
      sfx("efire",em.position);e.fireT=5+Math.random()*2.5}}
  else{if(eye)eye.scale.setScalar(1);e.fireT-=dt;if(e.fireT<=0&&d<120){e.tele=SNIPE_TELE;e.teleLock=false;sfx("tele",em.position,0)}}}

/* ---- formation rush ---- */
function spawnFormation(){const f=fwd(),c=S.pos.clone().addScaledVector(f,85).add(new V3((Math.random()-.5)*20,(Math.random()-.5)*10,0)),dir=S.pos.clone().sub(c).normalize(),side=new V3(-dir.z,0,dir.x).normalize();
  const list=[];for(let i=0;i<5;i++){const row=Math.ceil(i/2),sgn=i%2?1:-1,p=c.clone().addScaledVector(side,sgn*row*6).addScaledVector(dir,-row*5);
    const g=foeBody([.95,.82,.55],0xffb020,.9);list.push(foeAdd(g,p,{form:{dir:dir.clone(),wait:1.3,t:0,hit:false},rad:4}))}
  popText("편대 돌격 경보! 일렬로 몰려와요");sfx("tele",c,1);sfx("radio");return list}
function formAI(e,dt,T){const em=e.m,F=e.form,eye=em.userData.eye;e.phase+=dt;
  if(F.wait>0){F.wait-=dt;foeFace(e,dt,4);if(eye)eye.scale.setScalar(1+((T*12|0)%2)*.8);if(em.userData.mat&&e.flash<=0)em.userData.mat.emissive.setRGB(.3*((T*12|0)%2),.18*((T*12|0)%2),0);return}
  F.t+=dt;const p0=em.position.clone();em.position.addScaledVector(F.dir,dt*34);em.rotation.set(.25,Math.atan2(F.dir.x,F.dir.z),Math.sin(e.phase*6)*.15);
  if(dt>0)emit(ADD,{pos:em.position.clone(),color:0xffa030,s0:1.8,s1:.2,life:.22,a:.7});
  if(foeLive()&&!F.hit&&G.dead<=0){const c=S.pos.clone().add(new V3(0,.4,0)),seg=em.position.clone().sub(p0),L=seg.length()||1e-6,tt=clamp(c.clone().sub(p0).dot(seg)/(L*L),0,1);
    if(p0.clone().addScaledVector(seg,tt).distanceTo(c)<3){F.hit=true;if(G.iframe<=0)hurt({dir:F.dir.clone(),dmg:26})}}
  if(F.t>4.5){e.form=null;e.fireT=2+Math.random()*2;if(em.userData.mat)em.userData.mat.emissive.setRGB(0,0,0)}} // survivors stay as ordinary drones

/* ---- supply crate ---- */
const CRATE_GEO=new THREE.BoxGeometry(3.6,2.4,2.4);
// models/crate.glb (user asset, 10/29) when loaded: longest side CRATE_S world units, centred; otherwise the plain box
let CRATE_GLTF=null;const CRATE_S=5.2;
function crateMesh(g,glowC){if(CRATE_GLTF){const o=CRATE_GLTF.scene.clone(true);let mat=null;o.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.envMap=ENV;m.material.envMapIntensity=.9;m.material.emissive=new THREE.Color(0);if(!mat)mat=m.material}});
    o.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(o),sz=box.getSize(new V3()),c=box.getCenter(new V3()),k=CRATE_S/Math.max(sz.x,sz.y,sz.z);o.scale.multiplyScalar(k);o.position.sub(c).multiplyScalar(k);g.add(o);g.userData.mat=mat}
  else{const mat=new THREE.MeshStandardMaterial({color:0xd8a040,metalness:.5,roughness:.45,envMap:ENV,emissive:0x000000});g.add(new THREE.Mesh(CRATE_GEO,mat));g.userData.mat=mat;
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(CRATE_GEO),new THREE.LineBasicMaterial({color:0xffd070,transparent:true,opacity:.9})))}
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:glowC,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.setScalar(CRATE_GLTF?9:7);g.add(glow);g.userData.glow=glow;return glow}
function spawnCrate(pos){const g=new THREE.Group();crateMesh(g,0xa070ff);
  const e=foeAdd(g,pos,{crate:true,rad:3.4,life:20});popText("보급 컨테이너 · 부수면 중력탄 획득");return e}
function crateAI(e,dt,T){const em=e.m;e.phase+=dt;em.rotation.y+=dt*.6;em.rotation.x=Math.sin(e.phase*.7)*.2;em.position.y+=Math.sin(e.phase*1.2)*dt*.6;
  const gl=em.userData.glow;if(gl)gl.material.opacity=.4+.3*Math.sin(T*5);
  if(foeLive()){e.life-=dt;if(e.life<=0){e.alive=false;const p=em.position.clone();disposeEnemy(e);emit(ADD,{pos:p,tex:TX.ring,color:0xd8a040,s0:2,s1:10,life:.4})}}}
function crateReward(e){const p=e.m.position.clone();const was=G.grav||0;G.grav=Math.min(3,was+1);addSpec(30);S.boost=100;
  addScore(600,p,"big");popText(G.grav>was?`보급 확보 · 중력탄 +1 (×${G.grav}) · 필살 +30`:"보급 확보 · 필살 +30 (중력탄 가득)");sfx("pickup");emit(ADD,{pos:p,tex:TX.ring,color:0x7dff8a,s0:3,s1:22,life:.5})}
