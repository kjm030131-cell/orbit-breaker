/* ================= particle system ================= */
function makePool(n,blending){
  const arr=[];
  for(let i=0;i<n;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,transparent:true,depthWrite:false,blending,opacity:0}));sp.visible=false;scene.add(sp);arr.push({sp,on:false})}
  return {arr,i:0};
}
const ADD=makePool(520,THREE.AdditiveBlending), NORM=makePool(90,THREE.NormalBlending);
const tmpC=new THREE.Color();
function emit(pool,o){
  const p=pool.arr[pool.i];pool.i=(pool.i+1)%pool.arr.length;
  p.on=true;p.t=0;p.life=o.life||.4;p.s0=o.s0||1;p.s1=o.s1===undefined?p.s0:o.s1;p.a0=o.a===undefined?1:o.a;
  p.vel=(o.vel||new V3()).clone();p.drag=o.drag===undefined?2:o.drag;p.spin=o.spin||0;p.sx=o.sx||1;p.ease=o.ease||1;p.follow=o.follow||null;p.off=o.off?o.off.clone():null;
  const m=p.sp.material;m.map=o.tex||TX.glow;m.color.set(o.color===undefined?0xffffff:o.color);m.rotation=o.rot||0;m.opacity=p.a0;
  p.sp.position.copy(o.pos);p.sp.visible=true;p.sp.scale.set(p.s0*p.sx,p.s0,1);
  return p;
}
function stepPool(pool,dt){
  for(const p of pool.arr){if(!p.on)continue;p.t+=dt;const k=p.t/p.life;
    if(k>=1){p.on=false;p.sp.visible=false;continue}
    if(p.follow){p.sp.position.copy(p.follow.getWorldPosition(new V3()));if(p.off)p.sp.position.add(p.off)}
    else{p.sp.position.addScaledVector(p.vel,dt);p.vel.multiplyScalar(Math.exp(-p.drag*dt))}
    const e=1-Math.pow(1-k,2*p.ease);const s=p.s0+(p.s1-p.s0)*e;
    p.sp.scale.set(s*p.sx,s,1);p.sp.material.opacity=p.a0*Math.pow(1-k,1.4);p.sp.material.rotation+=p.spin*dt}
}
// streak sparks (velocity-aligned boxes)
const SPK=[];const spkGeo=new THREE.BoxGeometry(.07,.07,1);
for(let i=0;i<260;i++){const m=new THREE.Mesh(spkGeo,new THREE.MeshBasicMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.visible=false;scene.add(m);SPK.push({m,on:false})}
let spkI=0;
function sparks(pos,dir,color,speed,life,count,spread){
  for(let i=0;i<count;i++){const s=SPK[spkI];spkI=(spkI+1)%SPK.length;
    const v=new V3().randomDirection().multiplyScalar((spread===undefined?1:spread)*speed*(.3+Math.random()*.9));if(dir)v.addScaledVector(dir,speed*(.5+Math.random()*.7));
    s.on=true;s.t=0;s.life=life*(.6+Math.random()*.6);s.v=v;s.m.position.copy(pos);s.m.material.color.set(color);s.m.material.opacity=1;s.m.visible=true;s.len=.6+Math.random()*1.4}
}
function stepSparks(dt){
  for(const s of SPK){if(!s.on)continue;s.t+=dt;const k=s.t/s.life;if(k>=1){s.on=false;s.m.visible=false;continue}
    s.m.position.addScaledVector(s.v,dt);s.v.multiplyScalar(Math.exp(-3*dt));
    s.m.lookAt(s.m.position.clone().add(s.v));const sp=s.v.length();s.m.scale.set(1-k*.6,1-k*.6,s.len*clamp(sp*.06,.3,3));s.m.material.opacity=1-k}
}
// debris chunks
const CH=[];const chMat=new THREE.MeshStandardMaterial({color:0x2a2c30,metalness:.7,roughness:.5,flatShading:true,emissive:0x331100});
for(let i=0;i<60;i++){const m=new THREE.Mesh(new THREE.TetrahedronGeometry(.35+Math.random()*.4,0),chMat);m.visible=false;scene.add(m);CH.push({m,on:false})}
let chI=0;
function chunks(pos,n,speed,size){for(let i=0;i<n;i++){const c=CH[chI];chI=(chI+1)%CH.length;c.on=true;c.t=0;c.life=1+Math.random()*.8;c.v=new V3().randomDirection().multiplyScalar(speed*(.4+Math.random()));c.r=new V3(Math.random()*9,Math.random()*9,0);c.m.position.copy(pos);c.m.visible=true;c.k=size||1;c.m.scale.setScalar(c.k)}}
function stepChunks(dt){for(const c of CH){if(!c.on)continue;c.t+=dt;if(c.t>c.life){c.on=false;c.m.visible=false;continue}
  c.m.position.addScaledVector(c.v,dt);c.v.multiplyScalar(Math.exp(-.8*dt));c.m.rotation.x+=c.r.x*dt;c.m.rotation.y+=c.r.y*dt;c.m.scale.setScalar((c.k||1)*(1-Math.max(0,c.t/c.life-.7)/.3));
  if(Math.random()<.35)emit(ADD,{pos:c.m.position,color:0xff7020,s0:.6,s1:.1,life:.3,a:.7})}}
// flash lights
const LIGHTS=[];for(let i=0;i<4;i++){const l=new THREE.PointLight(0xffffff,0,40,2);scene.add(l);LIGHTS.push({l,t:1,life:1,i0:0})}
let liI=0;
function flashLight(pos,color,intensity,dist,life){const L=LIGHTS[liI];liI=(liI+1)%LIGHTS.length;L.l.position.copy(pos);L.l.color.set(color);L.l.distance=dist;L.i0=intensity;L.t=0;L.life=life}
function stepLights(dt){for(const L of LIGHTS){L.t+=dt;L.l.intensity=L.t<L.life?L.i0*Math.pow(1-L.t/L.life,2):0}}

/* ---- composite effects ---- */
function fxSlashHit(pos,color,heavy){
  const k=heavy?1.5:1;
  emit(ADD,{pos,tex:TX.flare,color:0xffffff,s0:7*k,s1:11*k,life:.14,a:1});
  const r=Math.random()*Math.PI;
  emit(ADD,{pos,tex:TX.streak,color,s0:3,s1:2.4,sx:6.5*k,rot:r,life:.22,a:1});
  emit(ADD,{pos,tex:TX.streak,color:0xffffff,s0:1.4,s1:1,sx:7*k,rot:r,life:.16,a:1});
  emit(ADD,{pos,tex:TX.ring,color,s0:2,s1:13*k,life:.32,a:.9});
  sparks(pos,null,heavy?0xffe0a0:0xffc070,26*k,.45,heavy?40:26);
  for(let i=0;i<6;i++)emit(ADD,{pos,color,vel:new V3().randomDirection().multiplyScalar(8*k),s0:2.2,s1:.4,life:.35,a:.8});
  flashLight(pos,color,heavy?9:6,40,.18);
}
function fxBeamHit(pos,dir){ // splash of beam energy along the shot direction
  emit(ADD,{pos,tex:TX.flare,color:0xdffcff,s0:9,s1:14,life:.1});
  emit(ADD,{pos,tex:TX.ring,color:0x5ff0ff,s0:2,s1:14,life:.3,a:.9});
  for(let i=0;i<10;i++){const d=dir.clone().negate().add(new V3().randomDirection().multiplyScalar(.9)).normalize();emit(ADD,{pos:pos.clone(),tex:TX.streak,color:0x8ff4ff,vel:d.multiplyScalar(40+Math.random()*30),s0:1.4,s1:.4,sx:3,life:.25,a:.9,drag:3})}
  sparks(pos,dir.clone().negate(),0xc8fbff,40,.45,26);flashLight(pos,0x40d8ff,9,45,.16);
}
function fxMuzzle(pos,dir,color){fxMuzzleArt(pos,dir);
  emit(ADD,{pos,tex:TX.flare,color:0xeafcff,s0:7,s1:11,life:.08,a:1});
  emit(ADD,{pos:pos.clone().addScaledVector(dir,2.5),tex:TX.ring,color,s0:1,s1:7,life:.16,a:.9});
  for(let i=0;i<6;i++){emit(ADD,{pos:pos.clone(),tex:TX.streak,color:0x9ff6ff,vel:dir.clone().add(new V3().randomDirection().multiplyScalar(.35)).normalize().multiplyScalar(50),s0:1.6,s1:.3,sx:3,life:.12,a:.8,drag:4})}
  flashLight(pos,0x60e8ff,7,40,.12);
  emit(ADD,{pos,tex:TX.flare,color:0xffffff,s0:3.2,s1:5,life:.09,a:1,rot:Math.random()*3});
  emit(ADD,{pos,color,s0:4,s1:2,life:.14,a:.9});
  emit(ADD,{pos:pos.clone().addScaledVector(dir,1.2),tex:TX.ring,color,s0:.8,s1:4.5,life:.18,a:.8});
  sparks(pos,dir,0xbff8ff,18,.2,8,.35);
  flashLight(pos,color,5,30,.1);
}
function fxImpact(pos,color){
  emit(ADD,{pos,tex:TX.flare,color:0xffffff,s0:4,s1:7,life:.12});
  emit(ADD,{pos,color,s0:5,s1:1,life:.25,a:.9});
  emit(ADD,{pos,tex:TX.ring,color,s0:1,s1:8,life:.25,a:.9});
  sparks(pos,null,0xc8fbff,20,.35,18);
  flashLight(pos,color,5,30,.14);
}
function fxExplosion(pos,size){
  const k=size||1;fxFlip(pos,13*k,.8+.15*k);
  emit(ADD,{pos,tex:TX.flare,color:0xffe6c0,s0:7*k,s1:12*k,life:.11});
  emit(ADD,{pos,tex:TX.ring,color:0xffb060,s0:2,s1:26*k,life:.5,a:.85});
  emit(ADD,{pos,tex:TX.ring,color:0xffffff,s0:1,s1:14*k,life:.25,a:.7});
  for(let i=0;i<9;i++){const o=new V3().randomDirection().multiplyScalar(Math.random()*1.6*k);
    emit(ADD,{pos:pos.clone().add(o),color:i<2?0xffd080:(i<6?0xff7a20:0xff3a10),vel:o.clone().multiplyScalar(4),s0:3*k,s1:(7+Math.random()*5)*k,life:.5+Math.random()*.45,a:.85,ease:.6})}
  for(let i=0;i<7;i++){const o=new V3().randomDirection().multiplyScalar(Math.random()*2*k);
    emit(NORM,{pos:pos.clone().add(o),tex:TX.smoke,color:0x101114,vel:o.clone().multiplyScalar(2.5),s0:3*k,s1:(9+Math.random()*4)*k,life:1.2+Math.random()*.7,a:.6,drag:1.2,spin:(Math.random()-.5)*1.5,rot:Math.random()*6})}
  sparks(pos,null,0xffc070,30*k,.7,36);
  chunks(pos,7,16*k);
  flashLight(pos,0xff8a30,12*k,70,.45);
}

/* ================= blade trail ================= */
const TRAIL_N=20;
const trail={pts:[],geo:new THREE.BufferGeometry()};
(function(){const pos=new Float32Array(TRAIL_N*2*3),col=new Float32Array(TRAIL_N*2*3),idx=[];
  for(let i=0;i<TRAIL_N-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,b,c,b,d,c)}
  trail.geo.setAttribute("position",new THREE.BufferAttribute(pos,3));trail.geo.setAttribute("color",new THREE.BufferAttribute(col,3));trail.geo.setIndex(idx);
  trail.mesh=new THREE.Mesh(trail.geo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  trail.mesh.frustumCulled=false;scene.add(trail.mesh)})();
function stepTrail(dt,base,tip,active,color){trail.mesh.visible=false;if(!trail.arc)trail.arc=makeArc(96);stepArc(trail.arc,dt,base,tip,active,color,.24);return;
  for(const p of trail.pts)p.age+=dt;
  if(active)trail.pts.unshift({b:base.clone(),t:tip.clone(),age:0});
  while(trail.pts.length>TRAIL_N||(trail.pts.length&&trail.pts[trail.pts.length-1].age>.16))trail.pts.pop();
  const pos=trail.geo.attributes.position.array,col=trail.geo.attributes.color.array;
  for(let i=0;i<TRAIL_N;i++){const p=trail.pts[Math.min(i,trail.pts.length-1)];
    if(!p){pos.fill(0);col.fill(0);break}
    const f=i<trail.pts.length?Math.pow(1-p.age/.16,1.6):0;
    pos.set([p.b.x,p.b.y,p.b.z],i*6);pos.set([p.t.x,p.t.y,p.t.z],i*6+3);
    col.set([color.r*f*.15,color.g*f*.15,color.b*f*.15],i*6);col.set([(color.r*.6+.4)*f,(color.g*.6+.4)*f,(color.b*.6+.4)*f],i*6+3)}
  trail.geo.attributes.position.needsUpdate=true;trail.geo.attributes.color.needsUpdate=true;
}

/* ================= projectiles ================= */
const BOLTS=[];
const boltCore=new THREE.CylinderGeometry(.17,.17,9,8);boltCore.rotateX(Math.PI/2);
const boltOuter=new THREE.CylinderGeometry(.55,.3,10,12,1,true);boltOuter.rotateX(Math.PI/2);
const boltHalo=new THREE.CylinderGeometry(1.1,.5,11,12,1,true);boltHalo.rotateX(Math.PI/2);
const streakGeo=new THREE.CylinderGeometry(.09,.09,1,6,1,true);streakGeo.rotateX(Math.PI/2);streakGeo.translate(0,0,.5);
const STREAKS=[];
function stepStreaks(dt){for(let i=STREAKS.length-1;i>=0;i--){const s=STREAKS[i];s.t+=dt;const k=1-s.t/s.life;s.m.material.opacity=Math.max(0,k)*.9;s.m.scale.x=s.m.scale.y=1+s.t*14;
  if(s.t>=s.life){scene.remove(s.m);s.m.material.dispose();STREAKS.splice(i,1)}}}
function fireBolt(from,to,target){
  const g=new THREE.Group();
  g.add(new THREE.Mesh(boltCore,new THREE.MeshBasicMaterial({color:0xffffff})));
  g.add(new THREE.Mesh(boltOuter,new THREE.MeshBasicMaterial({color:0x5ff0ff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})));
  g.add(new THREE.Mesh(boltHalo,new THREE.MeshBasicMaterial({color:0x1a8cff,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})));
  const head=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0x9ff6ff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));head.scale.set(5,5,1);head.position.z=4.5;g.add(head);
  g.position.copy(from);g.lookAt(to);scene.add(g);
  const dir=to.clone().sub(from).normalize(),dist=from.distanceTo(to);
  // instant ionised trail from muzzle to target: sells the "hit-scan" weight of a beam rifle
  if(!fxBeam(from,to,3.4)){
  const st=new THREE.Mesh(streakGeo,new THREE.MeshBasicMaterial({color:0xbff8ff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
  st.position.copy(from);st.lookAt(to);st.scale.z=Math.min(dist,140);scene.add(st);STREAKS.push({m:st,t:0,life:.16});}
  BOLTS.push({g,dir,speed:340,dist,trav:0,target,life:1});
}
function stepBolts(dt){
  for(let i=BOLTS.length-1;i>=0;i--){const b=BOLTS[i];
    if(b.target&&b.target.alive){const to=b.target.m.position.clone().sub(b.g.position);b.dist=b.trav+to.length();b.dir.lerp(to.normalize(),.25).normalize();b.g.lookAt(b.g.position.clone().add(b.dir))}
    const p0=b.g.position.clone(),step=b.speed*dt;b.g.position.addScaledVector(b.dir,step);b.trav+=step;b.life-=dt;fieldBolt(b);
    if(!b.target&&b.life>0&&SCREEN==="play"){ // unassisted shot: swept hit test against every drone along this step
      for(const e of enemies){if(!e.alive||e.launched>0||e.isRemote||(e.isBoss&&!(e.down>0)&&!e.isWP))continue;const c=e.m.position,sg=b.g.position.clone().sub(p0),L=sg.length()||1e-6,u=clamp(c.clone().sub(p0).dot(sg)/(L*L),0,1);
        if(p0.clone().addScaledVector(sg,u).distanceTo(c)<(e.rad||3.4)*.9){b.target=e;b.g.position.copy(p0).addScaledVector(sg,u);b.dist=b.trav=b.trav-step+L*u;break}}}
    emit(ADD,{pos:b.g.position.clone().addScaledVector(b.dir,-3),color:0x40d8ff,s0:2.2,s1:.2,life:.22,a:.7});
    if(b.trav>=b.dist||b.life<=0){
      fxImpact(b.g.position,0x40e8ff);fxBeamHit(b.g.position,b.dir);if(b.cover||(b.target&&b.trav>=b.dist-1))sfx("impact",b.g.position);if(b.target&&b.trav>=b.dist-1){S.hitstop=Math.max(S.hitstop,.035);S.shake=Math.max(S.shake,.3)}
      HIT_SRC="rifle";try{if(b.target&&b.target.alive&&b.target.launched<=0&&b.trav>=b.dist-1){if(b.target.isWP){wpDamage(b.target,1,b.g.position.clone());sfx("hitmark")}else if(b.target.isBoss||b.target.isRemote){}else if(b.target.blade&&!b.target.broken&&!b.target.disarmed){bladeShot(b.target,b.g.position.clone())}else if(eliteBlocks(b.target,S.pos)){tutCount("eliteBlock");shieldFlash(b.target);sfx("block",b.g.position);hitMark("block")}else{knock(b.target,b.dir,14,1.2);hitFlash(b.target);if(G.unit==="mega")addSpec(2);S.shake=Math.max(S.shake,.18);hitMark("hit");impactPunch(.18);sfx("thud",b.g.position,0);sfx("hitmark")}}}finally{HIT_SRC=null}
      scene.remove(b.g);b.g.children.forEach(c=>c.material.dispose());BOLTS.splice(i,1)}
  }
}
