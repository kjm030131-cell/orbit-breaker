/* ================= battlefield objects: asteroids, wrecks, station ================= */
// Fixed layout (same map every sortie = fair ranking). Wrecks/engines/satellite break and explode,
// launching nearby drones into chains; every object blocks beams (cover) and crushes launched drones.
var FIELD={g:new THREE.Group(),obs:[],ready:false,C:new V3(0,0,140),R:185,warnT:0,load:0};
scene.add(FIELD.g);
const FDEF={
  rock1:{hp:0},rock3:{hp:0},station:{hp:0},
  wreck1:{hp:4,blast:20,pts:400,name:"함선 잔해"},wreck2:{hp:5,blast:22,pts:500,name:"함선 잔해"},
  engine:{hp:2,blast:28,pts:600,name:"엔진 잔해",glow:0xff7a20},satellite:{hp:5,blast:18,pts:500,name:"통신 위성"}};
// [model, x, y, z, size(m, longest side), rotY, rotX]
const FLAYOUT=[
  ["station",-80,30,195,85,.4,.1],["satellite",95,-15,120,30,1.2,.3],
  ["wreck2",-50,-10,100,40,-.6,.15],["wreck1",45,8,82,32,.9,-.1],["wreck1",-105,12,45,26,2,.4],["wreck2",70,-6,235,34,2.6,0],
  ["engine",25,-20,150,18,0,.3],["engine",60,22,205,16,1.5,0],["engine",-25,18,72,15,-1,.2],["engine",-60,-25,215,16,.5,-.3],
  ["rock1",35,28,98,18,.3,0],["rock1",-30,-28,160,24,1,1],["rock1",100,18,190,28,2,.5],["rock1",-112,-22,140,32,.7,2],
  ["rock1",5,-32,118,14,3,1],["rock1",75,-30,255,22,1.4,.2],["rock1",-62,38,122,18,.2,2.2],["rock1",0,30,232,26,2.2,.7],
  ["rock1",132,0,62,30,.9,.4],["rock1",-132,10,245,26,1.7,1.1],
  ["rock3",70,-5,55,16,1,0],["rock3",-78,0,75,20,2,.5],["rock3",20,10,186,12,.4,.9],["rock3",-20,-15,262,18,2.9,.3],["rock3",112,-25,145,15,1.3,1.6]];

// cover a mesh with spheres along its longest axis (cheap collision for beams, drones and the player)
function fieldSpheres(o){const bb=o.mesh.geometry.boundingBox,sz=bb.getSize(new V3()),c=bb.getCenter(new V3());
  const ax=sz.x>=sz.y&&sz.x>=sz.z?"x":sz.y>=sz.z?"y":"z",others=["x","y","z"].filter(k=>k!==ax),L=sz[ax];
  const r=Math.max(.05,(sz[others[0]]+sz[others[1]])/4*.85),n=Math.max(1,Math.round(L/(2*r)));o.mesh.updateMatrixWorld(true);
  const sc=o.mesh.scale.x;o.sph=[];for(let i=0;i<n;i++){const p=c.clone();p[ax]=bb.min[ax]+r+(n>1?(L-2*r)*i/(n-1):L/2-r);
    o.sph.push({c:p.applyMatrix4(o.mesh.matrixWorld),r:r*sc})}
  o.center=c.clone().applyMatrix4(o.mesh.matrixWorld);o.rad=Math.max(...o.sph.map(s=>s.c.distanceTo(o.center)+s.r))}
function fieldPlace(name,tpl){for(const L of FLAYOUT){if(L[0]!==name)continue;const d=FDEF[name],mat=d.hp?tpl.material.clone():tpl.material;
  const m=new THREE.Mesh(tpl.geometry,mat),bb=tpl.geometry.boundingBox,sz=bb.getSize(new V3());
  m.scale.setScalar(L[4]/Math.max(sz.x,sz.y,sz.z));m.position.set(L[1],L[2],L[3]);m.rotation.set(L[6]||0,L[5]||0,0);FIELD.g.add(m);
  const o={name,def:d,mesh:m,hp:d.hp,alive:true,respawn:0,flash:0,base:L};fieldSpheres(o);
  if(d.glow){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:d.glow,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    s.position.copy(o.center);s.scale.setScalar(L[4]*.9);FIELD.g.add(s);o.glow=s}
  FIELD.obs.push(o)}}
function loadField(){if(!window.GLB_BASE||FIELD.load)return;FIELD.load=1;
  for(const name of Object.keys(FDEF))glb("obj_"+name,null,g=>{let tpl=null;g.scene.traverse(x=>{if(x.isMesh&&!tpl)tpl=x});if(!tpl)return;
    if(!tpl.geometry.attributes.normal)tpl.geometry.computeVertexNormals();tpl.material.envMap=ENV;tpl.material.envMapIntensity=.45;
    fieldPlace(name,tpl);FIELD.ready=true});
  // small drifting debris: swap the placeholder icosahedra for a low-poly rock, re-centred on the battlefield
  glb("obj_rock_lo",null,g=>{let tpl=null;g.scene.traverse(x=>{if(x.isMesh&&!tpl)tpl=x});if(!tpl)return;tpl.material.envMap=ENV;tpl.material.envMapIntensity=.3;
    const sz=tpl.geometry.boundingBox.getSize(new V3()),k=1/Math.max(sz.x,sz.y,sz.z);
    for(const d of debris){const s=d.geometry.parameters.radius||1;d.geometry=tpl.geometry;d.material=tpl.material;d.scale.setScalar(s*2.6*k);d.position.z+=140}})}

function fieldHitAt(p,pad){for(const o of FIELD.obs){if(!o.alive||o.center.distanceTo(p)>o.rad+pad)continue;for(const s of o.sph)if(s.c.distanceTo(p)<s.r+pad)return o}return null}
function fieldDamage(o,n,at){if(!o.def.hp||!o.alive)return;o.hp-=n;o.flash=1;sparks(at||o.center,new V3().randomDirection(),0xffb070,22,.4,10);
  if(o.hp<=0)fieldBreak(o)}
function fieldBreak(o){const d=o.def,c=o.center.clone();o.alive=false;o.respawn=35;o.mesh.visible=false;if(o.glow)o.glow.visible=false;
  fxExplosion(c,d.blast/9);for(let i=1;i<=3;i++)setTimeout(()=>fxExplosion(c.clone().add(new V3().randomDirection().multiplyScalar(d.blast*.3)),d.blast/16),i*140);
  chunks(c,16,26,3.2);sfx("destroyed",c);S.shake=Math.max(S.shake,c.distanceTo(S.pos)<60?1.1:.5);flash(.12);
  if(SCREEN!=="play"||inVS())return;let n=0;
  for(const e of enemies){if(!e.alive||e.launched>0||e.isRemote)continue;const dv=e.m.position.clone().sub(c),dist=dv.length();if(dist>d.blast)continue;
    if(e.isWP){wpDamage(e,2,e.m.position.clone());continue}if(e.isBoss)continue;
    if(dv.lengthSq()<1e-4)dv.set(0,1,0);knock(e,dv.normalize(),55+(d.blast-dist)*2,1.1);n++}
  addScore(d.pts+n*150,c,"big");popText(n?`${d.name} 유폭 · 휘말림 ×${n}`:`${d.name} 폭파`);if(n>=2){S.hitstop=.08;S.slow=.35}}

// hooks called from combat / loop
function fieldCrash(e){ // launched drone hits an object: crushed, bonus
  if(!FIELD.ready||inVS())return;const o=fieldHitAt(e.m.position,e.isBoss?6:1.6);if(!o)return;
  if(e.isBoss){const nrm=e.m.position.clone().sub(o.center).normalize();e.v.reflect(nrm).multiplyScalar(.5);S.shake=Math.max(S.shake,.8);sfx("heavy",e.m.position);fieldDamage(o,3,e.m.position);return}
  e.launched=0;fieldDamage(o,2,e.m.position);addScore(250+e.chain*120,e.m.position.clone(),"big");popText(e.chain?`충돌 격파 · 연쇄 ×${e.chain}`:"충돌 격파");S.hitstop=Math.max(S.hitstop,.05)}
function fieldBolt(b){ // player beam vs object: cover blocks it, breakables take damage
  if(!FIELD.ready||inVS())return false;const o=fieldHitAt(b.g.position,.4);if(!o)return false;
  fieldDamage(o,1,b.g.position.clone());b.target=null;b.life=0;return true}
function fieldBlock(p){return FIELD.ready&&!inVS()&&!!fieldHitAt(p,.3)}
function fieldSlash(heavy){if(!FIELD.ready||inVS())return false;const at=S.pos.clone().addScaledVector(new V3(Math.sin(S.face),0,Math.cos(S.face)),3.5);
  const o=fieldHitAt(at,4);if(!o)return false;fieldDamage(o,heavy?3:2,at);sfx("hit",at);S.hitstop=Math.max(S.hitstop,.04);return true}
function fieldPush(){if(!FIELD.ready||inVS())return;for(const o of FIELD.obs){if(!o.alive||o.center.distanceTo(S.pos)>o.rad+3)continue;
  for(const s of o.sph){const d=S.pos.clone().sub(s.c),L=d.length(),min=s.r+2.2;if(L>=min)continue;d.divideScalar(L||1);S.pos.copy(s.c).addScaledVector(d,min);
    const vn=S.vel.dot(d);if(vn<0)S.vel.addScaledVector(d,-vn*1.2)}}}
function fieldReset(){if(!FIELD)return;for(const o of FIELD.obs){o.alive=true;o.hp=o.def.hp;o.respawn=0;o.mesh.visible=true;o.mesh.scale.setScalar(o.mesh.scale.x);if(o.glow)o.glow.visible=true}}
function fieldStep(dt,T){FIELD.g.visible=!inVS();if(!FIELD.ready||inVS())return;
  for(const o of FIELD.obs){if(o.flash>0){o.flash-=dt*4;o.mesh.material.emissive.setRGB(Math.max(0,o.flash)*.9,Math.max(0,o.flash)*.35,0)}
    if(o.glow&&o.alive)o.glow.material.opacity=.55+.35*Math.sin(T*3+o.center.x);
    if(!o.alive){o.respawn-=dt;if(o.respawn<=0&&o.center.distanceTo(S.pos)>o.rad+25){o.alive=true;o.hp=o.def.hp;o.mesh.visible=true;if(o.glow)o.glow.visible=true;emit(ADD,{pos:o.center,tex:TX.ring,color:0x6fb8ff,s0:2,s1:o.rad*2,life:.6,a:.5})}}}
  // soft edge of the operation area
  if(SCREEN==="play"&&S.started&&!S.ended){const d=S.pos.clone().sub(FIELD.C),L=d.length();FIELD.warnT-=dt;
    if(L>FIELD.R){S.vel.addScaledVector(d.normalize(),-(L-FIELD.R)*4*dt);if(FIELD.warnT<=0){FIELD.warnT=3;popText("작전 구역 경계 · 복귀하세요")}}}}
setTimeout(loadField,1200);
