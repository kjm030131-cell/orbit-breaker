/* ================= melee MS "검투기" (saber duelist) ================= */
// A bipedal MS that hunts the player with a beam saber.
//   hunt   : zig-zag dashes to striking range; its saber guards (slashes clash, beams are deflected)
//   wind   : 0.6 s raised saber + closing red ring  → slash it now = COUNTER (instant launch)
//   strike : lunge + swing; contact kills unless the player dodges (opening) or is slashing too (blade clash)
//   rec    : 0.8 s (1.3 s after a read dodge) wide open → any slash launches it
function bladeBuild(e){const piv=new THREE.Group();
  const glow=saberMesh(0xff2a4a,.8,5.2);glow.rotation.x=-Math.PI/2;glow.position.y=.45;
  const hilt=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.8,6),new THREE.MeshStandardMaterial({color:0x26282c,metalness:.8,roughness:.4}));hilt.position.y=.1;attachHilt(piv,1.05,new V3(0,-.6,0),0,hilt);
  piv.add(glow,hilt);piv.position.set(-.21*MS_H,.16*MS_H,.14*MS_H);e.m.add(piv);e.blade={piv,glow,rx:.6,rz:-.3};e.arc=makeArc(64)}
function bladeTip(e){return e.blade.piv.localToWorld(new V3(0,5,0))}
function bladeArms(e){const J=e.J;if(!J)return;const s=e.bs,u=s==="strike"?1-Math.max(0,e.bt)/.22:0;
  if(s==="wind"){J.armR.rotation.set(-2.7,0,.5);J.foreR.rotation.set(-.7,0,0);J.armL.rotation.set(-2.3,0,-.5);J.foreL.rotation.set(-.8,0,0);J.torso.rotation.set(-.15,.35,0)}
  else if(s==="strike"){J.armR.rotation.set(-2.7+u*2.6,0,.5);J.foreR.rotation.set(-.7+u*.5,0,0);J.armL.rotation.set(-2.3+u*2.2,0,-.5);J.torso.rotation.set(-.15+u*.6,.35-u*.8,0)}
  else if(s==="rec"){J.armR.rotation.set(.1,0,.6);J.foreR.rotation.set(-.2,0,0);J.torso.rotation.set(.45,-.45,0)}
  else{J.armR.rotation.set(-.9,0,.7);J.foreR.rotation.set(-1,0,0);J.armL.rotation.set(-.8,0,-.6);J.foreL.rotation.set(-1,0,0)}}
function bladePose(e,dt,T){const B=e.blade;let rx=.6,rz=-.3;
  if(e.bs==="wind"){rx=-2.3+Math.sin(T*40)*.03;rz=-.5}else if(e.bs==="strike"){const u=1-Math.max(0,e.bt)/.22;rx=-2.3+u*4.2;rz=-.5+u*1.1}else if(e.bs==="rec"||e.stun>0){rx=1.9;rz=.5}
  const k=e.bs==="strike"?1:Math.min(1,dt*12);B.rx+=(rx-B.rx)*k;B.rz+=(rz-B.rz)*k;B.piv.rotation.set(B.rx,0,B.rz);
  const blink=e.bs==="wind"&&((T*16|0)%2);const u=B.glow.material.uniforms;u.uColor.value.setHex(blink?0xff9ab0:0xff2a4a);u.uW.value=blink?1.15:.8;
  stepArc(e.arc,dt,B.piv.localToWorld(new V3(0,1.6,0)),B.piv.localToWorld(new V3(0,5.6,0)),e.bs==="strike",_arcC,.26)}
const _arcC=new THREE.Color(0xff2a4a);
function bladeWarn(e){emit(ADD,{pos:e.m.position.clone().add(new V3(0,1,0)),tex:TX.ring,color:0xff2030,s0:16,s1:3,life:e.windT,a:.9});
  const eye=e.m.userData.eye;if(eye)eye.scale.set(2.4,1.4,1)}
function bladeMove(e,dt,T){const em=e.m,to=S.pos.clone().sub(em.position),d=to.length();to.normalize();const side=new V3(to.z,0,-to.x);
  if(e.J){e.aimK=0;msPose(e,T);bladeArms(e)}bladePose(e,dt,T);
  const turn=e.bs==="strike"?1:6,want=Math.atan2(to.x,to.z),dy=Math.atan2(Math.sin(want-e.yaw),Math.cos(want-e.yaw));e.yaw+=clamp(dy,-turn*dt,turn*dt);
  if(e.stun>0){e.stun-=dt;em.position.addScaledVector(e.push,dt);e.push.multiplyScalar(Math.exp(-4*dt));em.rotation.set(-.35*Math.min(1,e.stun/.75),e.yaw,Math.sin(T*30)*.06);if(e.bs!=="hunt"){e.bs="hunt";e.bt=1.1}return true}
  e.bt-=dt;const live=SCREEN==="play"&&S.started&&!S.ended&&G.dead<=0;
  if(e.bs==="hunt"){const sp=d>16?24:d>9?9:-7;em.position.addScaledVector(to,sp*dt).addScaledVector(side,e.orbit2*(d<16?10:4)*dt);
    em.position.y+=(S.pos.y+.5-em.position.y)*Math.min(1,dt*1.5);
    e.dashT-=dt;if(e.dashT<=0&&d>15){e.dashT=.8+Math.random()*.8;e.dashV.copy(to).multiplyScalar(28).addScaledVector(side,(Math.random()<.5?-1:1)*24);sfx("dash",em.position);if(Math.random()<.4)e.orbit2*=-1}
    if(live&&d<11&&e.bt<=0){e.bs="wind";e.bt=e.windT;sfx("ignite",em.position);bladeWarn(e)}}
  else if(e.bs==="wind"){em.position.addScaledVector(to,(d-7.5)*dt*2.5);if(!live){e.bs="hunt";e.bt=1}
    else if(e.bt<=0){e.bs="strike";e.bt=.22;e.hitDone=false;e.lunge=to.clone();sfx("slash",em.position,2)}}
  else if(e.bs==="strike"){if(d>4.2)em.position.addScaledVector(e.lunge,52*dt);
    if(!e.hitDone&&d<7.4&&live){e.hitDone=true;bladeContact(e,to)}if(e.bt<=0&&e.bs==="strike"){e.bs="rec";e.bt=e.recT||.8;e.recT=0}}
  else if(e.bs==="rec"){if(e.bt<=0){e.bs="hunt";e.bt=1.3+Math.random()*.8}}
  const dv2=e.dashV.lengthSq();if(dv2>1){em.position.addScaledVector(e.dashV,dt);e.dashV.multiplyScalar(Math.exp(-2.8*dt));if(Math.random()<.5)emit(ADD,{pos:em.position.clone(),tex:TX.streak,color:0xff4a3a,s0:4,s1:.6,life:.22,a:.35})}
  e.dashK=Math.min(1,Math.sqrt(dv2)/30);
  for(const o of enemies){if(o===e||!o.alive||o.launched>0||o.isBoss||o.isWP||o.isRemote)continue;const dv=em.position.clone().sub(o.m.position),dd=dv.length(),min=(e.rad+o.rad)*1.05;
    if(dd<min&&dd>1e-3)em.position.addScaledVector(dv.divideScalar(dd),Math.min(min-dd,dt*9))}
  em.rotation.set(e.bs==="strike"?.35:.1+e.dashK*.3,e.yaw,-e.dashV.dot(side)/30*.5);
  const eye=em.userData.eye;if(eye&&e.bs!=="wind")eye.scale.set(1,.6,1);
  const j=em.userData.jets;if(j){const k=e.bs==="strike"||dv2>4?2.8:1.2;j.forEach(s=>s.scale.setScalar(k))}
  if(em.userData.mat&&e.flash<=0){const k=e.bs==="wind"?.3*((T*16|0)%2):e.bs==="rec"?.12:0;em.userData.mat.emissive.setRGB(k,k*.2,k*.1)}
  return true}
// the enemy's swing reaches the player
function bladeContact(e,to){
  if(S.act&&/^slash/.test(S.act)){bladeClash(e,true);return}
  if(G.iframe>0){e.recT=1.3;S.slow=Math.max(S.slow,.4);popText("간파 · 지금 베어라");addScore(400,S.pos.clone(),"cyan");addSpec(2);sfx("just");
    emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x7fe0ff,s0:2,s1:12,life:.35,a:.7});return}
  fxSlashHit(S.pos.clone().add(new V3(0,1,0)),0xff3040,true);hurt({dir:to.clone(),g:{position:S.pos.clone()}})}
// blades meet: sparks, freeze, both thrown apart; the enemy reels (perfect clash = long opening)
function bladeClash(e,perfect){const mid=S.pos.clone().lerp(e.m.position,.5).add(new V3(0,1.2,0)),dir=e.m.position.clone().sub(S.pos).normalize();
  sparks(mid,dir,0xffe0a0,38,.6,40);sparks(mid,dir.clone().negate(),0x9fe8ff,38,.6,30);fxImpact(mid,0xffd080);if(typeof fxElectric==="function")fxElectric(mid,1.6);
  emit(ADD,{pos:mid,tex:TX.ring,color:0xffe0a0,s0:2,s1:perfect?22:14,life:.35,a:.9});
  sfx("clash",mid);sfx("sizzle",mid);sfx("heavy",mid);sfx("thud",mid,1);hitMark("block");
  S.hitstop=perfect?.2:.11;S.slow=Math.max(S.slow,perfect?.55:.2);S.shake=Math.max(S.shake,perfect?.9:.6);flash(perfect?.32:.16);impactPunch(perfect?1.3:.7);
  S.vel.copy(dir).multiplyScalar(-30);e.push.copy(dir).multiplyScalar(perfect?30:22);e.stun=perfect?1.15:.6;e.bs="hunt";e.bt=1;e.flash=1;e.dashV.set(0,0,0);
  startAct("guard");S.attackCd=.2;S.combo=0;popText(perfect?"칼날 격돌 · 반격 찬스!":"막힘 · 틈을 노려라");addScore(perfect?700:120,mid,perfect?"cyan":"");addSpec(perfect?3:1)}
// player's slash lands on a duelist: false = let the normal hit (launch) go through
function bladeParry(e,at){
  if(e.stun>0||e.bs==="rec"){e.hp=1;tutCount("counter");popText("빈틈 공략");addScore(900,at,"big");return false}
  if(e.bs==="wind"){e.hp=1;tutCount("counter");popText("카운터!");addScore(1600,at,"big");S.slow=Math.max(S.slow,.4);addSpec(3);return false}
  bladeClash(e,e.bs==="strike");S.dashT=null;return true}
let _deflT=0;function bladeDeflect(e,at){sparks(at,null,0xff8a80,26,.35,14);fxImpact(at,0xff5060);sfx("block",at);sfx("sizzle",at);hitMark("block");
  if(T_NOW()-_deflT>2.5){_deflT=T_NOW();popText("빔 튕겨냄 · 근접으로 베어라")}}
function T_NOW(){return performance.now()/1000}
