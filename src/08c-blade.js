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
function bladeMove(e,dt,T){const em=e.m,to=S.pos.clone().sub(em.position),d=to.length();to.normalize();if(d<60&&d<POSTBAR.d){POSTBAR.d=d;POSTBAR.e=e}msStumps(e,dt);const side=new V3(to.z,0,-to.x);
  if(e.J){e.aimK=0;msPose(e,T);bladeArms(e)}bladePose(e,dt,T);
  const turn=e.bs==="strike"?1:6,want=Math.atan2(to.x,to.z),dy=Math.atan2(Math.sin(want-e.yaw),Math.cos(want-e.yaw));e.yaw+=clamp(dy,-turn*dt,turn*dt);
  if(e.postT>0)e.postT-=dt;else if(e.post>0&&!e.broken)e.post=Math.max(0,e.post-12*dt);
  if(e.stun>0){e.stun-=dt;if(e.stun<=0&&e.broken&&!e.disarmed){e.broken=false;e.post=40}em.position.addScaledVector(e.push,dt);e.push.multiplyScalar(Math.exp(-4*dt));em.rotation.set(-.35*Math.min(1,e.stun/.75),e.yaw,Math.sin(T*30)*.06);if(e.bs!=="hunt"){e.bs="hunt";e.bt=1.1}return true}
  e.bt-=dt;const live=SCREEN==="play"&&S.started&&!S.ended&&G.dead<=0;
  if(e.bs==="hunt"){const sp=d>16?24:d>9?9:-7;em.position.addScaledVector(to,sp*dt).addScaledVector(side,e.orbit2*(d<16?10:4)*dt);
    em.position.y+=(S.pos.y+.5-em.position.y)*Math.min(1,dt*1.5);
    e.dashT-=dt;if(e.dashT<=0&&d>15){e.dashT=.8+Math.random()*.8;e.dashV.copy(to).multiplyScalar(28).addScaledVector(side,(Math.random()<.5?-1:1)*24);sfx("dash",em.position);if(Math.random()<.4)e.orbit2*=-1}
    if(live&&!e.disarmed&&d<11&&e.bt<=0){e.bs="wind";e.bt=e.windT;sfx("ignite",em.position);bladeWarn(e)}}
  else if(e.bs==="wind"){em.position.addScaledVector(to,(d-7.5)*dt*2.5);if(!live){e.bs="hunt";e.bt=1}
    else if(e.bt<=0){e.bs="strike";e.bt=.22;e.hitDone=false;e.lunge=to.clone();sfx("slash",em.position,2)}}
  else if(e.bs==="strike"){if(d>4.2)em.position.addScaledVector(e.lunge,52*dt);
    if(!e.hitDone&&d<7.4&&live){e.hitDone=true;bladeContact(e,to)}if(e.bt<=0&&e.bs==="strike"){if(!e.recT&&!e.combo2&&live&&d<14&&Math.random()<.45){e.combo2=true;e.bs="wind";e.bt=.3;sfx("ignite",em.position);bladeWarn(e)}else{e.combo2=false;e.bs="rec";e.bt=e.recT||.8;e.recT=0}}}
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
// the enemy's swing reaches the player: a slash timed onto it (strike frame within .18 s) knocks it away (perfect clash)
function bladeContact(e,to){
  if(clockT-(S.lastStrikeT||-9)<.18||S.act&&/^slash/.test(S.act)&&!S.actHit&&S.actT<.2){bladeClash(e,true);return}
  if(G.iframe>0){e.recT=1.3;S.slow=Math.max(S.slow,.4);popText("간파 · 지금 베어라");addScore(400,S.pos.clone(),"cyan");addSpec(2);sfx("just");
    emit(ADD,{pos:S.pos.clone(),tex:TX.ring,color:0x7fe0ff,s0:2,s1:12,life:.35,a:.7});return}
  fxSlashHit(S.pos.clone().add(new V3(0,1,0)),0xff3040,true);hurt({dir:to.clone(),dmg:36,g:{position:S.pos.clone()}})}
/* posture (자세): every blade contact fills it, full = 자세 붕괴 (1.6 s stagger) and only then does a slash finish the duelist.
   guard clash +20 (it ripostes at once), clash onto its strike +30, counter in its wind-up +40, hit while it reels +25. */
const POST_GUARD=20,POST_PERFECT=30,POST_COUNTER=40,POST_REC=25,POST_SHOT=8;
function bladePost(e,k,at,msg){e.post=Math.min(100,(e.post||0)+k);e.postT=2.2;
  if(e.post>=100&&!e.broken){e.broken=true;e.stun=1.6;e.bs="rec";e.bt=1.6;e.push.set(0,0,0);e.dashV.set(0,0,0);e.flash=1;popText("자세 붕괴! 지금 베어라");sfx("heavy",at);sfx("clash",at);
    S.slow=Math.max(S.slow,.45);flash(.22);emit(ADD,{pos:e.m.position.clone().add(new V3(0,1.4,0)),tex:TX.ring,color:0xffd060,s0:3,s1:26,life:.5,a:.95});addScore(600,at,"cyan");return true}
  if(msg)popText(msg);return false}
// blades meet: sparks, short freeze, both thrown a little apart
function bladeClash(e,perfect){const mid=S.pos.clone().lerp(e.m.position,.5).add(new V3(0,1.2,0)),dir=e.m.position.clone().sub(S.pos).normalize();
  sparks(mid,dir,0xffe0a0,38,.6,perfect?44:30);sparks(mid,dir.clone().negate(),0x9fe8ff,38,.6,perfect?32:22);fxImpact(mid,0xffd080);if(typeof fxElectric==="function")fxElectric(mid,perfect?1.6:1.1);
  emit(ADD,{pos:mid,tex:TX.ring,color:0xffe0a0,s0:2,s1:perfect?22:14,life:.32,a:.9});
  sfx("clash",mid);sfx("sizzle",mid);if(perfect){sfx("heavy",mid);sfx("thud",mid,1)}hitMark("block");
  S.hitstop=perfect?.15:.08;S.slow=Math.max(S.slow,perfect?.35:0);S.shake=Math.max(S.shake,perfect?.7:.4);flash(perfect?.22:.1);impactPunch(perfect?1.1:.6);
  S.vel.copy(dir).multiplyScalar(perfect?-20:-12);e.push.copy(dir).multiplyScalar(perfect?14:7);e.dashV.set(0,0,0);e.flash=1;
  startAct("guard");S.attackCd=.16;S.combo=0;addScore(perfect?500:150,mid,perfect?"cyan":"");addSpec(perfect?3:1);
  if(bladePost(e,perfect?POST_PERFECT:POST_GUARD,mid,null))return;
  if(perfect){e.stun=.45;e.bs="hunt";e.bt=.4;popText("받아쳤다!")}
  else{e.stun=0;e.bs="wind";e.bt=.26;sfx("ignite",e.m.position);bladeWarn(e);popText("막힘 · 반격 온다! 받아쳐요")}} // instant riposte: clash it or dodge
function bladeHitFx(e,at,big){fxSlashHit(at,0xff8a2a,big);sfx(big?"heavy":"hit",at);sfx("sizzle",at);S.hitstop=Math.max(S.hitstop||0,big?.1:.06);impactPunch(big?.9:.5);e.flash=1;
  e.push.copy(e.m.position.clone().sub(S.pos).normalize().multiplyScalar(big?12:8))}
// player's slash lands on a duelist: false = let the normal hit (launch) go through
function bladeParry(e,at){S.lastStrikeT=clockT;
  if(e.broken||e.disarmed){e.hp=1;tutCount("counter");popText(e.disarmed?"무장 해제 · 처치!":"자세 붕괴 · 처치!");addScore(1400,at,"big");S.slow=Math.max(S.slow,.35);return false}
  if(e.bs==="wind"){tutCount("counter");bladeHitFx(e,at,true);addScore(500,at,"cyan");if(!bladePost(e,POST_COUNTER,at,"카운터! 자세가 흔들려요")){e.stun=.6;e.bs="hunt";e.bt=.5}S.dashT=null;return true}
  if(e.stun>0||e.bs==="rec"){bladeHitFx(e,at,false);if(!bladePost(e,POST_REC,at,"연타!")){e.stun=.45;e.bs="hunt";e.bt=.6}S.dashT=null;return true}
  if(e.bs==="strike"){e.hitDone=true;bladeClash(e,true);S.dashT=null;return true} // slash met its swing head-on
  // caught mid-dash (10/29 19:40): it cannot guard while it boosts -> the cut lands (posture hit, like a reel)
  if(e.bs==="hunt"&&(e.dashK||0)>.4){bladeHitFx(e,at,false);e.dashV.set(0,0,0);if(!bladePost(e,POST_REC,at,"대시 중 적중!")){e.stun=.4;e.bt=.6}S.dashT=null;return true}
  bladeClash(e,false);S.dashT=null;return true}
// rifle bolts: deflected while it guards, only chip its posture while it reels
function bladeShot(e,at){if(e.stun>0||e.bs==="rec"){sparks(at,null,0xffc080,20,.3,10);sfx("hit",at);sfx("hitmark");e.flash=1;bladePost(e,POST_SHOT,at,null)}else bladeDeflect(e,at)}
let _deflT=0;function bladeDeflect(e,at){sparks(at,null,0xff8a80,26,.35,14);fxImpact(at,0xff5060);sfx("block",at);sfx("sizzle",at);hitMark("block");
  if(T_NOW()-_deflT>2.5){_deflT=T_NOW();popText("빔 튕겨냄 · 근접으로 베어라")}}
function T_NOW(){return performance.now()/1000}
/* ---- enemy arm cut (single): a heavy / critical slash from the side, or any side slash on a reeling MS, takes off the arm on that side.
   Duelist sword arm (right) = disarmed: drops its saber, reels and the next slash finishes it. MS gun arm (right) = can no longer fire. ---- */
function msCutCheck(e,at,strong){if(!e.J||e.launched>0)return false;const from=S.pos.clone().sub(e.m.position).setY(0).normalize(),lat=from.x*Math.cos(e.yaw)-from.z*Math.sin(e.yaw);
  if(Math.abs(lat)<.4||!(strong||e.stun>0))return false;const k=lat>0?"armL":"armR";e.cut=e.cut||{};if(e.cut[k])return false;e.cut[k]=true;
  const b=e.J[k];const p=b.getWorldPosition(new V3());b.scale.setScalar(.001);
  fxImpact(p,0xff7030);flashLight(p,0xff8a40,8,40,.45);chunks(p,10,22,1.3);sparks(p,null,0xffc070,34,.6,50);sfx("boom",p);sfx("heavy",p);
  for(let i=0;i<4;i++)emit(NORM,{pos:p.clone(),tex:TX.smoke,color:0x15171a,vel:new V3().randomDirection().multiplyScalar(5),s0:2,s1:8,life:1.2,a:.5,drag:1.4,rot:Math.random()*6});
  S.hitstop=Math.max(S.hitstop||0,.12);impactPunch(1.1);hitMark("kill");addScore(400,p,"big");e.flash=1;
  if(e.blade){if(k==="armR"){e.disarmed=true;e.broken=true;e.stun=1.6;e.bs="rec";e.post=100;e.blade.piv.visible=false;if(e.arc)e.arc.mesh.visible=false;popText("팔 절단 · 무장 해제!")}
    else{popText("팔 절단!");bladePost(e,30,p,null)}}
  else if(k==="armR"){e.fireT=1e9;e.burstN=0;e.noGun=true;clearTele(e);popText("팔 절단 · 사격 불능")}else popText("팔 절단!");
  return true}
// stump sparks for cut enemies (cheap: a few per second)
function msStumps(e,dt){if(!e.cut||!e.J)return;e.stumpT=(e.stumpT||0)-dt;if(e.stumpT>0)return;e.stumpT=.12+Math.random()*.1;
  for(const k in e.cut){const p=e.J[k].getWorldPosition(new V3());if(Math.random()<.7)sparks(p,new V3(0,1,0),0xffc070,9,.3,3,.8)}}
// posture bar over the nearest duelist
const POSTBAR={e:null,d:1e9};
function bladeUiTick(){const el=$("postBar");if(!el)return;const e=POSTBAR.e;POSTBAR.e=null;POSTBAR.d=1e9;
  if(!e||!e.alive||e.launched>0||SCREEN!=="play"||VS){if(!el.hidden)el.hidden=true;return}
  const v=e.m.position.clone().add(new V3(0,MS_H*.62,0)).project(camera);if(v.z>1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1){el.hidden=true;return}
  el.hidden=false;el.style.left=((v.x+1)/2*innerWidth)+"px";el.style.top=((1-v.y)/2*innerHeight)+"px";el.style.setProperty("--p",(e.broken?100:e.post||0).toFixed(0));el.classList.toggle("broken",!!e.broken)}
