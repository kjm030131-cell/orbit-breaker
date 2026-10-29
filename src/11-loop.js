let RET_ON=false,RET_EL=null,LW_ON=false;
const _SAB_C=new THREE.Color(0xff3aa8),_SAB_HOT=new THREE.Color(0xff2030),_SAB_CRIT=new THREE.Color(0x6fe6ff); // cyan blade = counter window after a just dodge
/* ================= main loop ================= */
const clock=new THREE.Clock();
// Focus camera: eases toward the focused target with a turn-rate cap. Up close (dash / pass-by) the direction
// to the target flips around, so the camera holds still there instead of whipping 180 degrees.
function focusCamera(rdt){const d=G.focus.m.position.clone().sub(S.pos),hz=Math.hypot(d.x,d.z),dt=Math.min(rdt,.05);
  const near=clamp((hz-5)/7,0,1);if(near<=0)return; // inside ~5 m: hold; 5-12 m: fade in
  const dy=Math.atan2(Math.sin(Math.atan2(d.x,d.z)-S.yaw),Math.cos(Math.atan2(d.x,d.z)-S.yaw));
  if(Math.abs(dy)>.02){const cap=(S.dash>0||S.vsLunge>0?.9:2.4)*near*dt;S.yaw+=clamp(dy*(1-Math.exp(-7*dt)),-cap,cap)}
  const pt=clamp(Math.atan2(d.y-1.5,hz)*.8-.06,-.6,.45);S.pitch+=clamp((pt-S.pitch)*(1-Math.exp(-5*dt)),-1.6*dt,1.6*dt)}
function update(rdt){
  let dt=Math.min(rdt,.05);
  if(VS){S.hitstop=Math.min(S.hitstop,.12);S.slow=Math.min(S.slow,.4)}
  if(S.hitstop>0){S.hitstop-=rdt;dt=0}else if(S.slow>0){S.slow-=rdt;dt*=.3}
  clockT+=rdt;const T=clock.elapsedTime;
  if(S.demo){S.demoT+=rdt;S.yaw=Math.sin(S.demoT*.15)*.9+Math.PI*.15;titleYaw()}
  else if(VS&&G.focus&&SCREEN==="play"){vsFocusCamera(rdt)}
  else if(G.focus&&SCREEN==="play"&&targetable(G.focus)){focusCamera(rdt)}
  else if(!locked&&!VS){if(Math.abs(mouseX)>.25)S.yaw-=Math.sign(mouseX)*(Math.abs(mouseX)-.25)*1.8*rdt}
  tutFrame(dt);
  if(!VS&&!TUT.on&&S.started&&!S.ended&&SCREEN==="play"){S.time-=dt;const sc=Math.ceil(S.time);if(sc!==S.lastSec){S.lastSec=sc;if(sc<=10&&sc>0)sfx("tickLow",null,sc);if(!DUEL){if(sc===30)radio("이클립스 CIC · 최지우 중위","추진제 30초 남았어요. 아끼지 말고 몰아붙여요.","vo_op27");if(sc===10)radio("이클립스 CIC · 최지우 중위","추진제 바닥나요! 10초 뒤 강제 귀환!","vo_op28");if(sc===118)radio("이클립스 함장 · 이진태 대령","전 기체 전투 배치. 적 편대, 헬리오스 방위선으로 진입한다.","vo_cap01")}}if(S.time<30&&MUS.inten===0&&MUS.track==="battle"){MUS.inten=1;MUS.bpm=150}if(S.time<=0){S.time=0;finishRun()}}

  /* movement */
  const f=fwd(),right=new V3(Math.cos(S.yaw),0,-Math.sin(S.yaw)),acc=new V3();
  if(SCREEN==="play"&&!S.ended&&S.over<=0&&G.stagger<=0&&(!VS||vsCanAct())){if(keys.KeyW)acc.add(f);if(keys.KeyS)acc.sub(f);if(keys.KeyA)acc.add(right);if(keys.KeyD)acc.sub(right);if(keys.Space)acc.y+=1;if(keys.KeyC)acc.y-=1}
  const boosting=(keys.ShiftLeft||keys.ShiftRight)&&S.boost>0&&acc.lengthSq()>0&&SCREEN==="play";
  // responsive handling: same top speeds as before (≈15 m/s cruise, ≈36 m/s boost) but reached in ~0.3 s, and the frame
  // brakes hard when the keys are released. Dodges / knockbacks set S.freeT so they keep their old, longer glide.
  const moving=acc.lengthSq()>0;S.freeT=Math.max(0,(S.freeT||0)-dt);const drag=S.freeT>0?1.715:moving?4:6; /* 10/29: snappier — same top speeds, reached in ~0.25 s, stops in ~0.17 s */
  // 1:1 chase: boosting toward the opponent is 25% faster, so a retreating player can be run down
  let chase=1;if(VS&&boosting&&moving&&VS.remote){const to=VS.remote.root.position.clone().sub(S.pos),L=to.length();
    if(L>4&&keys.KeyW&&!keys.Space&&!keys.KeyC&&camFwd().dot(to.clone().normalize())>.82){chase=1.25;acc.y+=clamp(to.y/12,-1,1)} // looking at them + W: track their height
    else{const h=to.clone().setY(0),ah=acc.clone().setY(0);if(h.lengthSq()>1&&ah.lengthSq()>.01&&ah.normalize().dot(h.normalize())>.7)chase=1.25}}
  S.chase=chase>1;
  if(moving){acc.normalize();if(!boosting)acc.y*=1.45;} /* up/down (Space / C) without boost felt sluggish */
  if(moving)acc.multiplyScalar((boosting&&!S.guard?145*chase:61)*(VS?vsSpeed()*(S.guard?.45:1):1)*((G.mega&&G.mega.slow)||G.vsBeam?.6:1));
  S.boost=clamp(S.boost+(boosting?-20:36*(VS?vsRegen():1))*dt,0,100);
  S.vel.addScaledVector(acc,dt);S.vel.multiplyScalar(Math.exp(-drag*dt));
  // buffered inputs: a click that lands up to ~0.2 s before the current swing / shot recovers fires as soon as it can
  if(S.bufT>0){S.bufT-=dt;if(S.buf==="a"&&S.attackCd<=0&&!S.dash){S.bufT=0;attack()}else if(S.buf==="s"&&S.shotCd<=0){S.bufT=0;shoot()}else if(S.buf==="d"&&S.attackCd<=0&&S.shotCd<=0&&G.dodgeCd<=0){S.bufT=0;dodge()}}
  const prevFace=S.face;
  if(VS&&S.vsLunge>0){S.vsLunge=Math.max(0,S.vsLunge-dt);S.vel.copy(S.vsDir);if(!S.vsLunge)S.vel.multiplyScalar(.2)}
  else if(S.dash>0&&S.dashT&&S.dashT.alive&&S.dashT.launched<=0){
    S.dash-=dt;const to=S.dashT.m.position.clone().sub(S.pos);const d=to.length();S.face=Math.atan2(to.x,to.z);
    if(d<(S.dashT.isBoss&&S.dashT.rad>20?S.dashT.rad*.66:4.2)||S.dash<=0){S.dash=0;S.vel.multiplyScalar(.2);if(S.pending){startAct(S.pending,ACT[S.pending].strike*ACT[S.pending].dur*.85);S.pending=null}}
    else S.vel.copy(to.normalize().multiplyScalar(Math.max(75,d/.12)));
  }else{S.dash=0;if(S.pending){startAct(S.pending);S.pending=null}
    // while shooting the body squares up to the target (right shoulder slightly forward), otherwise it follows the camera
    let goal=S.yaw,rate=.002;if(S.aimT>0&&S.aimPt){const d=S.aimPt.clone().sub(S.pos);goal=Math.atan2(d.x,d.z)+.28;rate=1e-5}
    let dy=goal-S.face;dy=Math.atan2(Math.sin(dy),Math.cos(dy));S.face+=dy*(1-Math.pow(rate,dt))}
  S.aimT=Math.max(0,(S.aimT||0)-dt);S.camKick=Math.max(0,(S.camKick||0)-rdt*7);
  {let d=S.face-prevFace;d=Math.atan2(Math.sin(d),Math.cos(d));S.faceVel=dt>0?lerp(S.faceVel,d/dt,.2):S.faceVel}
  if(VS&&VS.phase!=="fight")S.vel.set(0,0,0);
  S.pos.addScaledVector(S.vel,dt);fieldPush();

  if(INTRO.on)introUpdate(rdt);
  if(CINE.on)cineUpdate(rdt);

  /* heat */
  if(!VS){S.heat=0;S.over=0} // heat only exists in the 1:1 showdown (the room server limits spam there); solo has none
  if(S.heat>=100&&S.over<=0){S.over=1.6;popText("과열!");sfx("overheat")}
  if(S.over>0){S.over-=dt;S.heat=Math.max(0,S.heat-30*dt);if(S.over<=0){S.over=0;S.heat=40}}else S.heat=Math.max(0,S.heat-14*dt);
  S.attackCd-=dt;S.shotCd-=dt;S.bladeOn-=dt;

  /* action timeline */
  if(S.act){const base=ACT[S.act],A=VS&&S.act.startsWith("slash")?{...base,strike:(S.act==="slash3"?.3:.18)/base.dur}:base;const before=S.actT;S.actT+=dt;
    if(S.act.startsWith("slash")&&before<A.strike*A.dur&&S.actT>=A.strike*A.dur)slashStrike();
    if(S.actT>=A.dur&&S.act!=="lunge")S.act=null}

  const prevT=target;target=pickTarget();
  {let on=false;if(SCREEN==="play"&&camera){const ad=aimDir(),cp=camera.position;for(const e of enemies){if(!e.alive||e.launched>0||e.isRemote&&!VS)continue;const v=e.m.position.clone().sub(cp),L=v.length();if(L<170&&v.dot(ad)/L>Math.cos(.044+Math.atan((e.rad||3)/L))){on=true;break}}}
   if(on!==RET_ON){RET_ON=on;const rt=RET_EL||(RET_EL=document.querySelector(".reticle"));if(rt)rt.classList.toggle("on",on)}}
  {let lk=false;if(SCREEN==="play"&&!VS)for(const e of enemies)if(e.alive&&e.teleLock&&e.launched<=0){lk=true;break}if(lk!==LW_ON){LW_ON=lk;const w=$("lockWarn");if(w)w.classList.toggle("on",lk)}}
  if(SCREEN==="play"&&target&&target!==prevT&&clockT-(S.lockT||0)>.3){S.lockT=clockT;sfx("lock")}
  gameplayTick(dt,rdt,T);

  /* mech */
  if(P){
    const m=P.root;if(SCREEN==="play"&&G.dead<=0&&S.started)m.visible=!(G.iframe>.3&&G.iframe<3.01&&G.respawnBlink&&((T*14|0)%2));
    m.position.copy(S.pos);m.position.y+=Math.sin(T*1.6)*.12*(CINE.on?0:1)+CINE.crouch;m.rotation.y=S.face;
    const localV=S.vel.clone().applyAxisAngle(new V3(0,1,0),-S.face);
    if(CINE.on){m.rotation.x=0;m.rotation.z=0}else{attitude(m,localV,dt,T);bodyMotion(m,dt)}
    solvePose(dt,localV,boosting,T);
    const heatC=new THREE.Color().setHSL(.07-S.heat/100*.07,1,.55+S.heat/400);
    P.inner.material.color.copy(S.over>0?new THREE.Color(0xff2030):heatC);SABER_T.value=T;saberTexTick();if(P.saber)P.saber.uniforms.uColor.value.copy(S.over>0?_SAB_HOT:G.crit>0&&!VS?_SAB_CRIT:_SAB_C);
    P.eye.material.color.setHSL(.02,1,.45+Math.sin(T*3)*.05+S.heat/400);
    const want=(S.bladeOn>0&&S.over<=0)?1:0;
    P.bladeLen+=(want-P.bladeLen)*(1-Math.pow(want?1e-7:1e-4,rdt));
    const fl=1+Math.sin(T*45)*.06+Math.sin(T*97)*.04;
    P.beam.scale.set(fl,fl,Math.max(.001,P.bladeLen*(1+Math.sin(T*31)*.015)));P.beam.visible=P.bladeLen>.02;
    {const out=P.bladeLen>.04||(S.act&&(S.act.startsWith("slash")||S.act==="lunge"))||!!S.pending,rs=out?.001:1;if(P.rifleS!==rs){P.rifleS=rs;P.J.rifle.scale.setScalar(rs)}}
    P.outer.material.opacity=.22+Math.sin(T*23)*.05;
    const swinging=S.act&&S.act.startsWith("slash");
    const tip=new V3(),base=new V3();P.tipObj.getWorldPosition(tip);P.baseObj.getWorldPosition(base);
    const tipL=tip.clone().sub(m.position),swingSp=P.prevTip&&rdt>0?tipL.distanceTo(P.prevTip)/rdt:0;P.prevTip=tipL;
    const live=SCREEN==="play"||SCREEN==="launch";
    audioFrame({hum:live?P.bladeLen:0,swing:swingSp,thrust:live?(S.dash>0?1.2:boosting?1:clamp(S.vel.length()/45,0,.4)):0,amb:live?1:0});
    stepTrail(Math.min(rdt,.05),base,tip,P.beam.visible&&P.root.visible&&(swinging||S.act==="lunge"),S.over>0?_SAB_HOT:_SAB_C);
    const fls=(CINE.on?CINE.thr:boosting?2.6:S.dash>0?3.4:1)*(1+Math.sin(T*50)*.12);
    P.flames.forEach((g,i)=>{g.scale.set(1+(fls-1)*.15,fls*(1+Math.sin(T*37+i)*.1),1+(fls-1)*.15)});
    if((boosting||S.dash>0||(CINE.on&&CINE.thr>1.4))&&rdt>0){const p=new V3();P.flames[(Math.random()*2)|0].getWorldPosition(p);
      emit(ADD,{pos:p,color:0xff8a30,vel:f.clone().negate().multiplyScalar(14).add(new V3().randomDirection().multiplyScalar(3)),s0:1.2,s1:.2,life:.3,a:.8});
      if(Math.random()<.3)emit(NORM,{pos:p,tex:TX.smoke,color:0x8a8f99,vel:f.clone().negate().multiplyScalar(6),s0:.8,s1:3.5,life:.7,a:.25,drag:1.5})}
    if(G.crit>0)P.mat.emissive.setRGB(0,.1+.07*Math.sin(T*20),.16+.07*Math.sin(T*20));else if(G.stagger>0)P.mat.emissive.setRGB(.25*((T*24|0)%2),0,0);else P.mat.emissive.setRGB(0,0,0);
  }

  /* enemies */
  for(const e of enemies){if(!e.alive)continue;const em=e.m;
    // Menu showcase: keep combatants out of the orbiting camera's view.
    // Remote player visibility is owned by the PvP state stream.
    if(!e.isRemote)em.visible=!S.demo&&!CINE.on;
    if(S.demo||CINE.on){if(e.teleMesh)e.teleMesh.visible=false;continue}
    if(e.teleMesh)e.teleMesh.visible=true;
    if(e.flash>0){e.flash-=rdt*5;if(em.userData.mat)em.userData.mat.emissive.setRGB(Math.max(0,e.flash),Math.max(0,e.flash)*.8,Math.max(0,e.flash)*.6)}
    if(e.launched>0){e.launched-=dt;em.position.addScaledVector(e.v,dt);em.rotation.x+=e.spin.x*dt;em.rotation.y+=e.spin.y*dt;em.rotation.z+=e.spin.z*dt;
      if(dt>0&&Math.random()<.6){emit(ADD,{pos:em.position,color:0xff6a2a,s0:1.6,s1:.2,life:.35,a:.7});if(Math.random()<.4)emit(NORM,{pos:em.position,tex:TX.smoke,color:0x333438,s0:1.5,s1:4,life:.8,a:.35})}
      for(const o of enemies){if(o===e||!o.alive||(o.isBoss&&!(o.down>0))||o.launched>0&&o.isBoss)continue;
        if(o.m.position.distanceTo(em.position)<Math.max(e.rad,o.elite?4.5:o.isWP?2.6:o.isBoss?8:3.4)){if(o.isWP){wpDamage(o,3,o.m.position.clone());if(!e.isBoss)e.launched=Math.min(e.launched,.001);continue}e.chain++;const n=e.chain;explode(o,n);addScore(chainPts(n),o.m.position.clone(),n>=3?"big":"");S.best=Math.max(S.best,n);popText(`연쇄 ×${n}`);sfx("chain",null,n);
          if(n>=2)S.hitstop=.06;if(n>=3&&n%3===0){cutin();S.slow=.45;flash(.25)}e.v.multiplyScalar(.92)}}
      fieldCrash(e);
      if(e.launched<=0){explode(e,e.chain);addScore(100,em.position.clone())}
    }else enemyAI(e,dt,T)}
  for(let i=enemies.length-1;i>=0;i--)if(!enemies[i].alive)enemies.splice(i,1);
  fillEnemies(dt);

  /* fx */
  fieldStep(dt,T);titleStep(rdt);
  const fdt=Math.min(rdt,.05);stepShip(rdt,T);stepPool(ADD,fdt);stepPool(NORM,fdt);stepFxArt(fdt);stepFxBig(fdt);stepSparks(fdt);stepChunks(fdt);stepLights(fdt);stepBolts(dt);stepStreaks(fdt);
  for(const d of debris){d.rotation.x+=d.userData.spin.x*rdt;d.rotation.y+=d.userData.spin.y*rdt}

  /* camera */
  if(!(INTRO.on&&introCamera(rdt))&&!(CINE.on&&cineCamera(rdt))&&!titleCamera(rdt)){
  const cf=camFwd(),dist=S.demo?12:VS?12.4:8.6; // 1:1 mechs are drawn VS_MS bigger: pull the camera back to match
  const want=S.pos.clone().addScaledVector(cf,-dist).add(new V3(0,VS?3.5:2.4,0));
  // HM-1 beam: swing the camera out over the left shoulder so a beam fired down the reticle line is seen side-on, not end-on
  S.megaCam=(S.megaCam||0)+((((G.mega&&!VS)||G.vsBeam)?1:0)-(S.megaCam||0))*(1-Math.exp(-7*rdt));if(S.megaCam>.002)want.add(new V3(Math.cos(S.yaw)*4.2*S.megaCam,1.1*S.megaCam,-Math.sin(S.yaw)*4.2*S.megaCam));
  if(S.demo){const pv=SCREEN==="load",a=S.demoT*(pv?.35:.25),r=pv?10.5:11;want.copy(S.pos).add(new V3(Math.sin(a+2.6)*r,(pv?.6:2.2)+Math.sin(a*.7)*(pv?.3:1),Math.cos(a+2.6)*r))}
  if(VS&&VS.fp&&P&&!S.demo)camera.position.copy(vsCockpitPos()); // head lost: pilot's eye, no lag
  else camera.position.lerp(want,1-Math.pow(VS?.012:.0005,rdt));
  if(!VS&&S.camKick>0)camera.position.addScaledVector(camFwd(),-S.camKick*.45).y+=S.camKick*.12;
  S.shake=Math.max(0,S.shake-rdt*2.4);const sh=(VS?.45:1)*S.shake*S.shake*.9*(typeof SHAKE_K==='number'?SHAKE_K:1);
  camera.position.add(new V3((Math.random()-.5)*sh,(Math.random()-.5)*sh,(Math.random()-.5)*sh));
  if(S.demo){const toCam=camera.position.clone().sub(S.pos).setY(0).normalize();const R=new V3().crossVectors(new V3(0,1,0),toCam);
    camera.lookAt(S.pos.clone().add(new V3(0,SCREEN==="load"?.2:.9,0)).addScaledVector(R,-(innerWidth>820?(SCREEN==="load"?4.6:4.5):0)))}
  else if(VS)camera.lookAt(camera.position.clone().addScaledVector(cf,18));
  else camera.lookAt(S.pos.clone().addScaledVector(cf,8).add(new V3(0,1.4,0)));
  const fovT=VS?(VS.fp?74:66):boosting||S.dash>0?66:61;S.fovB=S.fovB||fovT;S.fovB+=(fovT-S.fovB)*(1-Math.exp(-8*rdt));if(!(S.hitstop>0))S.punch=Math.max(0,(S.punch||0)-rdt*4.5);
  const fv=S.fovB-(S.punch||0)*4.5;if(Math.abs(fv-camera.fov)>.01){camera.fov=fv;camera.updateProjectionMatrix();}}
  if(typeof vsCockpitTick==="function")vsCockpitTick(rdt);
  if(typeof bladeUiTick==="function")bladeUiTick();
  if(typeof bossGuideTick==="function")bossGuideTick();

  if(SCREEN==="play"||SCREEN==="launch"){hudUpdate();if(VS)vsHud();}
}
// auto quality: if frames stay slower than ~45 fps for 2.5 s, drop one level (never raises itself)
const PERF={ema:1/60,slow:0,gpu:"?",hud:null,n:0,acc:0,worst:0,t:0};
try{const gl=renderer.getContext(),ext=gl.getExtension("WEBGL_debug_renderer_info");PERF.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}catch(e){}
PERF.soft=/swiftshader|llvmpipe|software|basic render/i.test(PERF.gpu);
if(PERF.soft)setTimeout(()=>{const n=document.createElement("div");n.style.cssText="position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99;background:#3a0d0d;color:#ffd7c8;border:1px solid #ff6a4a;padding:10px 16px;font:600 13px system-ui;border-radius:6px;max-width:92vw;text-align:center;pointer-events:none";setTimeout(()=>n.remove(),15000);
  n.innerHTML="그래픽 가속이 꺼져 있어 게임이 느립니다. 크롬 설정 → 시스템 → <b>그래픽 가속 사용</b>을 켜고 크롬을 다시 시작하세요.";document.body.appendChild(n)},500);
if(/[?&]perf/.test(location.search)){PERF.hud=document.createElement("div");PERF.hud.style.cssText="position:fixed;right:8px;bottom:8px;z-index:99;background:rgba(0,0,0,.75);color:#9f9;font:12px/1.5 monospace;padding:8px 10px;border-radius:4px;white-space:pre;pointer-events:none";document.body.appendChild(PERF.hud)}
function perfHud(rdt){if(!PERF.hud)return;PERF.n++;PERF.acc+=rdt;PERF.worst=Math.max(PERF.worst,rdt);if(PERF.acc<.5)return;
  const i=renderer.info.render;PERF.hud.textContent=`FPS ${(PERF.n/PERF.acc).toFixed(0)}  worst ${(PERF.worst*1000).toFixed(0)}ms\nGPU ${PERF.gpu}\n${innerWidth}x${innerHeight} DPR ${devicePixelRatio} → ${renderer.getPixelRatio()}\n화질 ${QUALITY}/${QLEVEL} bloom ${useBloom()}\ndraw ${i.calls} tri ${(i.triangles/1000).toFixed(0)}k  적 ${enemies.length}`;PERF.n=0;PERF.acc=0;PERF.worst=0}
function perfWatch(rdt){if(QUALITY!=="auto"||document.hidden||rdt>.25||QLEVEL==="low")return;
  PERF.ema+=(rdt-PERF.ema)*.05;if(PERF.ema>1/45)PERF.slow+=rdt;else PERF.slow=Math.max(0,PERF.slow-rdt*.5);
  if(PERF.slow>2.5){QLEVEL=QLEVEL==="high"?"mid":"low";PERF.slow=0;PERF.ema=1/60;try{localStorage.setItem("ob.qauto",QLEVEL)}catch(e){}
    applyQuality();if(SCREEN==="play")popText("화질 자동 조정 · "+QL[QLEVEL].name)}}
function frame(){const rdt=clock.getDelta();try{if(!PAUSED||VS)update(rdt)}catch(err){console.error(err)}
  if(useBloom())composer.render();else renderer.render(scene,camera);perfWatch(rdt);perfHud(rdt);requestAnimationFrame(frame)}
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyQuality()});
document.querySelectorAll("[data-quality]").forEach(b=>b.addEventListener("click",()=>{const o=["auto","high","mid","low"];setQuality(o[(o.indexOf(QUALITY)+1)%4]);sfx("ui")}));setTimeout(applyQuality,0);
