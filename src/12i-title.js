/* ================= title screen: cinematic meteor-rain backdrop, entrance, attract mode ================= */
// Title only (SCREEN==="title"). The camera frames the mech in the middle of the screen with Earth (in sky.jpg, toward +z and
// below the horizon) behind it, while wrecks burn up as a meteor shower — the game's 「유성우 예보」 image.
var TITLE={t:0,swallow:false,met:[],nextMet:0,nextBig:2,idle:0,attract:false,enterT:0};
const TITLE_D=new V3(Math.cos(1.885),0,Math.sin(1.885)); // horizontal heading toward Earth in the panorama
const TITLE_ON=()=>SCREEN==="title"&&S.demo&&!INTRO.on&&!CINE.on&&!(typeof TUT!=="undefined"&&TUT.on);
function titleYaw(){if(!TITLE_ON())return;S.yaw=Math.atan2(-TITLE_D.x,-TITLE_D.z)-.62+Math.sin(TITLE.t*.21)*.18}
function titleStep(rdt){
  if(!TITLE_ON()){if(TITLE.met.length)TITLE.met.length=0;titleAttract(false);
    if(TITLE.shipHid){TITLE.shipHid=false;if(typeof SHIP!=="undefined"&&SHIP)SHIP.g.visible=true}return}
  // clean hero shot: battlefield objects, drifting rocks and the carrier stay out of the title backdrop
  // (fieldStep, which runs just before this, restores the field and rocks once the title is left)
  FIELD.g.visible=false;if(FIELD.dvis!=="title"){FIELD.dvis="title";for(const d of debris)d.visible=false}
  if(typeof SHIP!=="undefined"&&SHIP&&SHIP.g.visible){SHIP.g.visible=false;TITLE.shipHid=true}
  rdt=Math.min(rdt,.1);TITLE.t+=rdt;const t=TITLE.t;
  // attract mode: after 30 s with no input the UI fades away and only the backdrop plays
  TITLE.idle+=rdt;if(!TITLE.attract&&TITLE.idle>30&&$("settings").hidden&&$("tutAsk").hidden)titleAttract(true);
  // meteors: spawned far behind the mech relative to the camera, streaking down toward Earth (capped for low-end PCs)
  const fwd=camera.getWorldDirection(new V3()),R=new V3().crossVectors(fwd,new V3(0,1,0)).normalize(),U=new V3(0,1,0);
  const lowQ=QLEVEL==="low";
  if(t>=TITLE.nextMet&&TITLE.met.length<(lowQ?3:6)){TITLE.nextMet=t+.35+Math.random()*.55;
    const p=camera.position.clone().addScaledVector(fwd,110+Math.random()*90).addScaledVector(R,-60+Math.random()*150).addScaledVector(U,30+Math.random()*45);
    TITLE.met.push({p,v:R.clone().multiplyScalar(-(14+Math.random()*14)).addScaledVector(U,-(38+Math.random()*20)),life:2.6+Math.random()*1.2,big:false})}
  if(t>=TITLE.nextBig){TITLE.nextBig=t+5+Math.random()*4;
    const p=camera.position.clone().addScaledVector(fwd,80+Math.random()*40).addScaledVector(R,10+Math.random()*50).addScaledVector(U,26+Math.random()*14);
    TITLE.met.push({p,v:R.clone().multiplyScalar(-(10+Math.random()*6)).addScaledVector(U,-(20+Math.random()*8)),life:4.2,big:true})}
  for(let i=TITLE.met.length-1;i>=0;i--){const m=TITLE.met[i];m.life-=rdt;m.p.addScaledVector(m.v,rdt);
    const fade=Math.min(1,m.life*1.5),k=m.big?1.5:1;
    emit(ADD,{pos:m.p.clone(),color:0xffa848,s0:3.2*k,s1:.3,life:m.big?.8:.5,a:.8*fade});
    emit(ADD,{pos:m.p.clone(),color:0xfff0c8,s0:1.5*k,s1:.2,life:.1,a:fade});
    if(m.big&&Math.random()<.25)emit(NORM,{pos:m.p.clone(),tex:TX.smoke,color:0x4a4640,vel:new V3(0,1.5,0),s0:2,s1:7,life:1.6,a:.14,drag:1});
    if(m.life<=0)TITLE.met.splice(i,1)}
}
// returns true when it placed the camera (title only)
function titleCamera(rdt){if(!TITLE_ON())return false;const t=TITLE.t,sw=Math.sin(t*.07)*.32;
  const D=TITLE_D.clone().applyAxisAngle(new V3(0,1,0),sw),wide=innerWidth>900;
  const want=S.pos.clone().addScaledVector(D,-(wide?12.5:15)).add(new V3(0,.6+Math.sin(t*.11)*.5,0));
  camera.position.lerp(want,1-Math.pow(.02,rdt));
  const look=S.pos.clone().add(new V3(0,wide?1.1:2.6,0));camera.lookAt(look);
  const fv=wide?44:52;if(Math.abs(camera.fov-fv)>.01){camera.fov+=(fv-camera.fov)*(1-Math.exp(-4*rdt));camera.updateProjectionMatrix()}
  return true}
function titleAttract(on){if(TITLE.attract===on)return;TITLE.attract=on;document.body.classList.toggle("attract",on)}
// any input wakes the title; the input that wakes it from attract mode is swallowed so it does not press a menu button
function titleWake(e){TITLE.idle=0;
  if(e.type==="click"&&TITLE.swallow){TITLE.swallow=false;e.stopImmediatePropagation();e.preventDefault();return}
  if(TITLE.attract){titleAttract(false);if(e.type!=="mousemove"&&e.type!=="wheel"){if(e.type==="mousedown"||e.type==="touchstart")TITLE.swallow=true;setTimeout(()=>TITLE.swallow=false,700);e.stopImmediatePropagation();e.preventDefault()}return}
  if(e.type==="keydown"&&$("scrTitle").classList.contains("enter"))titleEnterEnd()}
["keydown","mousedown","click","mousemove","wheel","touchstart"].forEach(ev=>addEventListener(ev,titleWake,{capture:true,passive:false}));
// entrance: logo, menu and leaderboard slide in (black fade only on the first visit)
function titleEnter(){const el=$("scrTitle");el.classList.remove("enter","first");void el.offsetWidth;
  el.classList.add("enter");if(!TITLE.entered){TITLE.entered=true;el.classList.add("first")}
  clearTimeout(TITLE.enterT);TITLE.enterT=setTimeout(titleEnterEnd,1900);TITLE.idle=0}
function titleEnterEnd(){clearTimeout(TITLE.enterT);$("scrTitle").classList.remove("enter","first")}
if(SCREEN==="title")titleEnter();
