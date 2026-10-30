/* ================= items & special ================= */
// gravity bombs now come only from breakable supply containers (08d-foes.js crate); the timed drop keeps only the reactive armor
const SUPPLY=[{at:75,item:"armor"}];
const ITEM_NAME={grav:"중력탄",armor:"반응 장갑"};
Object.assign(G,{spec:0,grav:0,armor:0,specT:-1,supplyI:0,crates:[],wells:[]});
ACT.special={dur:1.05,strike:1,keys:[
  [0,{armL:[-1.1,0,-.6],foreL:[-1.4,0,0],armR:[-1.1,0,.6],foreR:[-1.4,0,0],torso:[.45,0,0],head:[.3,0,0],thighL:[-.7,0,0],shinL:[1.3,0,0],thighR:[-.6,0,0],shinR:[1.2,0,0]},2.2],
  [.52,{armL:[-.3,0,1.5],foreL:[-.1,0,0],armR:[-.3,0,-1.5],foreR:[-.1,0,0],torso:[-.35,0,0],head:[-.35,0,0],thighL:[.35,0,.3],shinL:[.3,0,0],thighR:[.35,0,-.3],shinR:[.3,0,0]},7],
  [.85,{armL:[-.4,0,1.2],armR:[-.4,0,-1.2],torso:[-.15,0,0]},1.4]]};
const SPEC_RATE={shield:.6}; /* 10/30: shield ultimate charges 30% slower than the others (single only) */
function addSpec(n){if(SCREEN!=="play"||G.specT>=0)return;if(!VS)n*=SPEC_RATE[G.unit]||1;const was=G.spec;G.spec=Math.min(100,G.spec+n);if(was<100&&G.spec>=100){popText(UNITS[G.unit].f+" 준비 완료");sfx("specReady")}}

/* ---- special: ORBIT BREAK ---- */
function special(){
  if(VS){vsSkill(true);return}if(SCREEN!=="play"||S.ended||G.spec<100||G.specT>=0||G.stagger>0)return;
  tutCount("spec");G.spec=0;G.specT=0;G.iframe=Math.max(G.iframe,2);S.act=null;S.dash=0;S.dashT=null;S.pending=null;startAct("special");S.slow=.6;flash(.3);S.shake=Math.max(S.shake,.7);impactPunch(1);if(P&&P.J)fxCharge(P.J.torso);
  unitSpecial();sfx("specCharge");
}
function specialBurst(){
  const c=S.pos.clone();S.hitstop=.14;S.shake=1.5;flash(.5);sfx("specBurst");
  emit(ADD,{pos:c,tex:TX.flare,color:0xffffff,s0:20,s1:34,life:.22});
  emit(ADD,{pos:c,tex:TX.ring,color:0xffb21a,s0:3,s1:90,life:.7,a:1});
  emit(ADD,{pos:c,tex:TX.ring,color:0xffffff,s0:2,s1:55,life:.45,a:.9});
  for(let i=0;i<24;i++){const d=new V3().randomDirection();emit(ADD,{pos:c.clone().addScaledVector(d,3),tex:TX.streak,color:0xffc070,vel:d.clone().multiplyScalar(70),s0:2,s1:1,sx:5,life:.5,a:.9,drag:1.5})}
  sparks(c,null,0xffd090,60,.8,60);flashLight(c,0xffa040,16,120,.6);
  let n=0;for(const e of enemies){if(!isMob(e))continue;const d=e.m.position.clone().sub(c),dist=d.length();if(dist>42)continue;
    d.normalize();knock(e,d,30+(42-dist)*.6,1.9);e.rad=Math.max(e.rad,4.2);hitFlash(e);n++}
}

/* ---- gravity bomb ---- */
const wellCore=new THREE.SphereGeometry(1,24,16);
function throwGrav(){
  if(VS)return;if(SCREEN!=="play"||S.ended||G.grav<=0||G.stagger>0||G.wells.some(w=>w.state==="fly"))return;
  G.grav--;tutCount("grav");const dir=camFwd(),from=S.pos.clone().add(new V3(0,1.2,0)).addScaledVector(dir,2.5);
  const g=new THREE.Group();
  const core=new THREE.Mesh(wellCore,new THREE.MeshBasicMaterial({color:0x14061f}));core.scale.setScalar(.7);g.add(core);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xb070ff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));halo.scale.set(4,4,1);g.add(halo);
  const ring=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.ring,color:0xc890ff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));ring.scale.set(1,1,1);g.add(ring);
  g.position.copy(from);scene.add(g);
  G.wells.push({g,core,halo,ring,vel:dir.multiplyScalar(70),state:"fly",t:0});
  sfx("throw");if(P){P.SP.armR.v[0]-=8;P.SP.torso.v[1]+=2}
}
function stepWells(dt,rdt,T){
  for(let i=G.wells.length-1;i>=0;i--){const w=G.wells[i];w.t+=dt;
    if(w.state==="fly"){w.g.position.addScaledVector(w.vel,dt);w.vel.multiplyScalar(Math.exp(-2.2*dt));
      emit(ADD,{pos:w.g.position,color:0xa060ff,s0:1.2,s1:.1,life:.25,a:.6});
      let near=w.t>.6;for(const e of enemies)if(isMob(e)&&e.m.position.distanceTo(w.g.position)<4){near=true;break}
      if(near){w.state="pull";w.t=0;sfx("gravOn",w.g.position);flashLight(w.g.position,0x9050ff,8,60,.4);
        emit(ADD,{pos:w.g.position,tex:TX.ring,color:0xc890ff,s0:30,s1:2,life:.4,a:.9})}}
    else if(w.state==="pull"){
      const k=Math.min(1,w.t/.3);w.core.scale.setScalar(.7+k*1.6+Math.sin(T*18)*.1);w.halo.scale.setScalar(8+Math.sin(T*9)*1.2);
      const ph=(w.t*1.6)%1;w.ring.material.opacity=.38*Math.sin(ph*Math.PI);w.ring.material.rotation+=rdt*3;const rs=(1-ph)*17+2;w.ring.scale.set(rs,rs,1);
      for(const e of enemies){if(!isMob(e))continue;const d=w.g.position.clone().sub(e.m.position),dist=d.length();if(dist>24)continue;
        clearTele(e);e.fireT=Math.max(e.fireT,1.2);if(dist>2.8)e.m.position.addScaledVector(d.normalize(),dt*Math.min(dist*2.4,28));
        e.m.rotation.z+=dt*2;e.grav=.2}
      if(dt>0&&Math.random()<.9){const o=new V3().randomDirection().multiplyScalar(14+Math.random()*8);emit(ADD,{pos:w.g.position.clone().add(o),color:0xb880ff,vel:o.clone().multiplyScalar(-2.4),s0:.9,s1:.2,life:.4,a:.6,drag:0})}
      if(w.t>3.2){w.state="end";w.t=0;sfx("gravOff",w.g.position);emit(ADD,{pos:w.g.position,tex:TX.flare,color:0xd8b0ff,s0:6,s1:12,life:.18})}}
    else{w.core.scale.multiplyScalar(Math.exp(-12*rdt));w.halo.material.opacity=Math.max(0,1-w.t*4);w.ring.material.opacity=0;
      if(w.t>.3){scene.remove(w.g);w.g.traverse(o=>o.material&&o.material.dispose());G.wells.splice(i,1)}}
  }
}

/* ---- supply crates ---- */
const crateGeo=new THREE.BoxGeometry(3,3,3),crateEdges=new THREE.EdgesGeometry(crateGeo);
const beamGeo=new THREE.CylinderGeometry(.35,.35,60,8,1,true);
function dropCrate(item){
  const g=new THREE.Group(),pos=S.pos.clone().addScaledVector(fwd(),34).add(new V3(0,4,0));
  let bc;if(CRATE_GLTF)bc=crateMesh(g,0x8dff7a);else{
  g.add(new THREE.Mesh(crateGeo,new THREE.MeshStandardMaterial({color:0x2a2e33,metalness:.6,roughness:.5,envMap:ENV,emissive:0x0a1a08})));
  g.add(new THREE.LineSegments(crateEdges,new THREE.LineBasicMaterial({color:0x8dff7a})));
  bc=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0x8dff7a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));bc.scale.set(7,7,1);g.add(bc)}
  const beam=new THREE.Mesh(beamGeo,new THREE.MeshBasicMaterial({color:0x8dff7a,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.y=30;g.add(beam);
  g.position.copy(pos);scene.add(g);
  G.crates.push({g,bc,item,t:0,life:22});
  popText("보급 컨테이너 투하");sfx("supply");
  emit(ADD,{pos,tex:TX.ring,color:0x8dff7a,s0:2,s1:16,life:.5});
}
function stepCrates(dt,rdt,T){
  for(let i=G.crates.length-1;i>=0;i--){const c=G.crates[i];c.t+=dt;c.g.rotation.y+=rdt*.8;c.g.rotation.x=Math.sin(T*.7)*.2;
    c.bc.material.opacity=.6+.4*Math.sin(T*6);
    if(SCREEN==="play"&&c.g.position.distanceTo(S.pos)<6.5){
      if(c.item==="grav")G.grav=Math.min(3,G.grav+1);else G.armor=1;
      popText(ITEM_NAME[c.item]+" 획득");sfx("pickup");addScore(200,c.g.position.clone(),"cyan");
      emit(ADD,{pos:c.g.position,tex:TX.flare,color:0xc0ffb0,s0:6,s1:10,life:.15});emit(ADD,{pos:c.g.position,tex:TX.ring,color:0x8dff7a,s0:2,s1:14,life:.35});
      removeCrate(i);continue}
    if(c.t>c.life)removeCrate(i)}
  const mk=$("supplyMark"),c=G.crates[0];
  if(!c||SCREEN!=="play"){mk.hidden=true;return}
  mk.hidden=false;const v=c.g.position.clone().project(camera);let x=(v.x+1)/2*innerWidth,y=(1-v.y)/2*innerHeight;const behind=v.z>1;
  if(behind){x=innerWidth-x;y=innerHeight-y}
  const m=48,off=behind||x<m||x>innerWidth-m||y<m||y>innerHeight-m;
  if(off){const cx=innerWidth/2,cy=innerHeight/2,dx=x-cx,dy=y-cy,s=Math.min((cx-m)/Math.abs(dx||1e-6),(cy-m)/Math.abs(dy||1e-6));x=cx+dx*s;y=cy+dy*s}
  mk.style.left=x+"px";mk.style.top=y+"px";mk.classList.toggle("edge",off);
  $("supplyTxt").textContent=`${ITEM_NAME[c.item]} · ${Math.round(c.g.position.distanceTo(S.pos))}m`;
}
function removeCrate(i){const c=G.crates[i];scene.remove(c.g);c.g.traverse(o=>{if(o.material)o.material.dispose()});G.crates.splice(i,1)}

/* ---- tick / reset ---- */
function itemsTick(dt,rdt,T){
  if(G.specT>=0){const b=G.specT;G.specT+=rdt;if(b<.55&&G.specT>=.55)unitSpecialBurst();if(G.specT>1.1)G.specT=-1}
  if(!VS&&SCREEN==="play"&&!S.ended&&G.supplyI<SUPPLY.length&&120-S.time>=SUPPLY[G.supplyI].at){dropCrate(SUPPLY[G.supplyI].item);G.supplyI++}
  stepWells(dt,rdt,T);stepCrates(dt,rdt,T);
}
function resetItems(){
  for(let i=G.crates.length-1;i>=0;i--)removeCrate(i);
  for(const w of G.wells){scene.remove(w.g);w.g.traverse(o=>o.material&&o.material.dispose())}
  Object.assign(G,{spec:0,grav:0,armor:0,specT:-1,supplyI:0,crates:[],wells:[]});
}
