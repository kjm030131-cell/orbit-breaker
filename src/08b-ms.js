/* ================= bipedal mech enemy (MS · "그런트") ================= */
// Drop-in model: models/enemy_ms.glb (any Tripo mech, front = +Z, feet at y=0).
// Until that file exists the player's own frame mesh is reused with a hostile olive tint.
// Rules: armor takes one hit (stagger + push back), the second hit launches it like any drone;
// keeps 22-30 m, side-dashes every few seconds, fires 3-round bursts after the usual red telegraph.
let MS_TPL=null;const MS_H=5.2;
function msSetTemplate(g,tint){let src=null;g.scene.traverse(o=>{if(o.isMesh&&!src)src=o});if(!src)return;
  if(!src.geometry.attributes.normal)src.geometry.computeVertexNormals();src.geometry.computeBoundingBox();
  const mat=src.material.clone();if(ENV){mat.envMap=ENV;mat.envMapIntensity=.4}if(tint)mat.color.setRGB(.62,.5,.42);
  const h=src.geometry.boundingBox.getSize(new V3()).y;let geo=src.geometry,rigged=false;
  // the real model comes in a T-pose: skin it once with the "ms" layout, every instance shares that geometry
  if(!tint&&window.MechRig&&MechRig.LAYOUTS.ms){try{geo=MechRig.build(src,"ms").mesh.geometry;rigged=true}catch(e){console.warn(e)}}
  MS_TPL={geo,mat,h,real:!tint,rigged}}
function msTemplate(){if(MS_TPL)return MS_TPL;const f=FRAMES.mk2&&FRAMES.mk2.gltf;if(f)msSetTemplate(f,true);return MS_TPL}
(function(){if(!window.GLB_BASE)return;setTimeout(()=>fetch(GLB_BASE+"enemy_ms.glb",{method:"HEAD"}).then(r=>{
  const t=r.headers.get("content-type")||"";if(r.ok&&!/html/.test(t))glb("enemy_ms",null,g=>msSetTemplate(g,false))}).catch(()=>{}),1500)})();

function spawnMS(pos,blade){const T=msTemplate();if(!T)return null;const k=MS_H/T.h,g=new THREE.Group();
  const mat=T.mat.clone();mat.emissive=new THREE.Color(0);let m,J=null;
  if(T.rigged){const rg=MechRig.build({geometry:T.geo,material:mat},"ms");m=rg.mesh;J=rg.J;m.frustumCulled=false}else m=new THREE.Mesh(T.geo,mat);
  m.scale.setScalar(k);m.position.y=-.5*MS_H;g.add(m);g.userData.mat=mat;
  const eye=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff2a2a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  eye.position.set(0,(T.rigged?.44:.36)*MS_H,(T.rigged?.07:.08)*MS_H);eye.scale.set(1,.6,1);g.add(eye);g.userData.eye=eye;
  const jets=[-1,1].map(sx=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff9a40,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.7}));
    s.position.set(sx*.09*MS_H,(T.rigged?.29:.18)*MS_H,-.12*MS_H);s.scale.setScalar(1.4);g.add(s);return s});g.userData.jets=jets;
  g.position.copy(pos);const yaw=Math.atan2(S.pos.x-pos.x,S.pos.z-pos.z);g.rotation.y=yaw;scene.add(g);
  const e={m:g,v:new V3(),spin:new V3(),launched:0,chain:0,alive:true,phase:Math.random()*10,flash:0,elite:false,rad:3.6,ms:true,hp:2,stun:0,push:new V3(),
    dashT:1.5+Math.random()*2,dashV:new V3(),burstN:0,burstT:0,ram:false,rs:"hunt",rt:0,rdir:new V3(),fireT:1.5+Math.random()*2,tele:0,teleLock:false,teleDir:new V3(),
    keep:22+Math.random()*8,yaw,aim:false,J,aimK:0,orbit2:Math.random()<.5?-1:1,dashK:0,kick:0,roll:null};if(J)msPose(e,0);
  if(blade){e.bs="hunt";e.bt=1.2;e.windT=.6;e.dashT=.3;mat.color.multiply(new THREE.Color(1.15,.72,.72));bladeBuild(e)}
  enemies.push(e);emit(ADD,{pos,tex:TX.ring,color:0xff2a2a,s0:2,s1:14,life:.5,a:.6});return e}

// first hit on a full-armor MS: stagger instead of launch
function msArmor(e,dir){e.hp--;e.flash=1;e.stun=.75;e.push.copy(dir).setY(dir.y*.3).normalize().multiplyScalar(18);clearTele(e);e.burstN=0;
  sparks(e.m.position,dir,0xffc080,30,.5,22);fxImpact(e.m.position.clone(),0xffb060);sfx("heavy",e.m.position);S.hitstop=Math.max(S.hitstop,.07);impactPunch(.55);hitMark("hit");sfx("thud",e.m.position,1);
  addScore(200,e.m.position.clone());popText("장갑 파손 · 한 번 더!")}

// combat stance: knees tucked like a mech in flight, torso leaning in, gun arm half raised and fully up while firing
function msPose(e,T){const J=e.J;if(!J)return;const a=Math.max(.35,e.aimK),sw=Math.sin(T*2+e.phase)*.05,ds=e.dashK||0,kick=e.kick||0;
  J.torso.rotation.set(.18+ds*.25,0,0);J.head.rotation.set(-.12-ds*.15,0,0);
  J.armR.rotation.set(-.5*a+sw-kick*.3,0,1.25-.15*a);J.foreR.rotation.set(-1.2*a-kick*.25,0,0);
  J.armL.rotation.set(-.55+ds*.6-sw,0,-1.2);J.foreL.rotation.set(-.9+ds*.4,0,0);
  const leg=Math.sin(T*1.6+e.phase)*.08;J.thighR.rotation.set(.45-ds*.55+leg,0,-.08);J.thighL.rotation.set(.3-ds*.65-leg,0,.08);
  J.shinR.rotation.set(.95-ds*.5,0,0);J.shinL.rotation.set(1.15-ds*.6,0,0)}
function msMove(e,dt,T){if(e.blade)return bladeMove(e,dt,T);if(e.J){e.aimK+=((e.tele>0||e.burstN>0?1:0)-e.aimK)*Math.min(1,dt*8);msPose(e,T)}const em=e.m,to=S.pos.clone().sub(em.position),d=to.length();to.normalize();const side=new V3(to.z,0,-to.x);let lean=0;
  if(e.stun>0){e.stun-=dt;em.position.addScaledVector(e.push,dt);e.push.multiplyScalar(Math.exp(-4*dt));em.rotation.set(-.35*(e.stun/.75),e.yaw,Math.sin(T*30)*.06);return true}
  if(d>e.keep+3)em.position.addScaledVector(to,dt*8);else if(d<e.keep-5)em.position.addScaledVector(to,-dt*7);
  em.position.addScaledVector(side,e.orbit2*(d<e.keep+10?7:2)*dt); // circle strafe
  e.dashT-=dt;if(e.dashT<=0&&e.tele<=0&&e.burstN<=0){e.dashT=1.4+Math.random()*1.3;
    const close=d<13,dir=close?to.clone().negate().addScaledVector(side,(Math.random()-.5)*1.4):side.clone().multiplyScalar(Math.random()<.5?-1:1).addScaledVector(to,(Math.random()-.4)*.8);
    dir.y+=(Math.random()-.5)*.9;e.dashV.copy(dir.normalize().multiplyScalar(close?42:34));if(Math.random()<.35)e.roll={t:0,s:Math.random()<.5?-1:1};
    if(Math.random()<.4)e.orbit2*=-1;sfx("dash",em.position)}
  const dv2=e.dashV.lengthSq();if(dv2>1){em.position.addScaledVector(e.dashV,dt);lean=-e.dashV.dot(side)/34*.6;e.dashV.multiplyScalar(Math.exp(-2.6*dt));
    if(Math.random()<.5)emit(ADD,{pos:em.position.clone().addScaledVector(e.dashV,-.03),tex:TX.streak,color:0xff6a3a,s0:4,s1:.6,life:.22,a:.35})}
  e.dashK=Math.min(1,Math.sqrt(dv2)/30);
  for(const o of enemies){if(o===e||!o.alive||o.launched>0||o.isBoss||o.isWP||o.isRemote)continue;const dv=em.position.clone().sub(o.m.position),dd=dv.length(),min=(e.rad+o.rad)*1.05;
    if(dd<min&&dd>1e-3)em.position.addScaledVector(dv.divideScalar(dd),Math.min(min-dd,dt*9))}
  em.position.y+=Math.sin(e.phase*1.1)*dt*.8;
  const want=Math.atan2(S.pos.x-em.position.x,S.pos.z-em.position.z),dy=Math.atan2(Math.sin(want-e.yaw),Math.cos(want-e.yaw));e.yaw+=clamp(dy,-3*dt,3*dt);
  let roll=lean;if(e.roll){e.roll.t+=dt;const u=Math.min(1,e.roll.t/.5);roll+=e.roll.s*u*u*(3-2*u)*Math.PI*2;if(u>=1)e.roll=null}
  em.rotation.set(.1+e.dashK*.35*Math.max(0,e.dashV.dot(to))/34+Math.sin(e.phase*.7)*.04,e.yaw,roll);e.kick=Math.max(0,(e.kick||0)-dt*7);
  const j=em.userData.jets;if(j){const k=e.dashV.lengthSq()>4?2.6:1.2+Math.sin(T*20+e.phase)*.2;j.forEach(s=>s.scale.setScalar(k))}
  // remaining shots of a burst
  if(e.burstN>0&&SCREEN==="play"&&S.started&&!S.ended){e.burstT-=dt;if(e.burstT<=0){e.burstN--;e.burstT=.16;const from=em.position.clone().add(new V3(0,.6,0));
    const dir=S.pos.clone().add(S.vel.clone().multiplyScalar(.15)).sub(from).normalize().add(new V3().randomDirection().multiplyScalar(.03)).normalize();fireEnemyBolt(from,dir,false,e);e.kick=1}}
  return false}
