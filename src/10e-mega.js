/* ================= HM-1 hyper mega launcher: R mega beam / F hyper mega burst ================= */
// Built only from the existing painted VFX (fx_beam / fx_charge as grey copies fx_mbeam / fx_mcharge so they tint,
// plus fx_expl flipbook, ring, flare, electric, smoke). Charge -> fire: a scrolling crossed-ribbon beam from the
// muzzle that follows the reticle with a turn-rate cap (heavier for F), pierces drones and stops at map cover.
const MEGA_C=0xff4fd8,MEGA_DEEP=0x9a2cff;
const MEGA_CFG={
  r:{charge:.6,fire:.9,w:3,hitR:3.6,range:150,turn:1.6,knockV:42,score:260,wp:2,label:"메가 빔"},
  f:{charge:1.0,fire:5,w:10,hitR:11,range:210,turn:.9,knockV:52,score:300,wp:3,label:"하이퍼 메가 빔"}};
function megaTex(){const t=(FXOK.mbeam?FXT.mbeam:FXT.beam).clone();t.wrapS=THREE.RepeatWrapping;t.needsUpdate=true;return t}
// tube body: an open cylinder with a view-facing core and a soft rim, so the beam has volume even seen from behind the
// mech (crossed ribbons alone go edge-on there). The painted beam strip scrolls along it for the streaky energy look.
const MEGA_TUBE=(()=>{const g=new THREE.CylinderGeometry(1,.55,1,28,1,true);g.rotateX(Math.PI/2);g.translate(0,0,.5);return g})();
function megaTubeMat(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  uniforms:{uMap:{value:FXOK.mbeam?FXT.mbeam:null},uHas:{value:FXOK.mbeam?1:0},uColor:{value:new THREE.Color(MEGA_C)},uT:{value:0},uRep:{value:4},uA:{value:1}},
  vertexShader:"varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
  fragmentShader:"uniform sampler2D uMap;uniform float uHas,uT,uRep,uA;uniform vec3 uColor;varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){float f=abs(dot(normalize(vN),normalize(vV)));"+
    "float tx=uHas>.5?texture2D(uMap,vec2(fract(vUv.y*uRep-uT),fract(vUv.x*3.))).r:.8;float core=pow(f,3.);float rim=pow(1.-f,2.)*.55;"+
    "vec3 c=mix(uColor,vec3(1.),core*.85)*(core*1.25+rim+.25)*(.55+.75*tx);float a=uA*clamp(core+rim+.2,0.,1.);gl_FragColor=vec4(c*a,a);}"})}
// one beam = a tube + three crossed ribbons (wide violet haze, magenta body, white core) + muzzle / end sprites
function megaBeamMesh(w){const g=new THREE.Group(),layers=[];
  for(const [k,c,a] of [[2.3,MEGA_DEEP,.35],[1,MEGA_C,.95],[.42,0xffffff,.9]]){const map=megaTex();
    const mat=new THREE.MeshBasicMaterial({map,color:c,transparent:true,opacity:a,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const m=new THREE.Mesh(ribbonGeo,mat);m.frustumCulled=false;m.scale.set(w*k,w*k,1);g.add(m);layers.push({m,mat,k,a})}
  const tubeMat=megaTubeMat(),tube=new THREE.Mesh(MEGA_TUBE,tubeMat);tube.frustumCulled=false;g.add(tube);
  const sp=(tex,c,s)=>{const o=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,color:c,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));o.scale.setScalar(s);return o};
  const muz=sp(FXOK.mcharge?FXT.mcharge:TX.glow,MEGA_C,w),muzCore=sp(TX.flare,0xffffff,w*.7),end=sp(TX.flare,0xffd8f6,w*3);
  scene.add(g,muz,muzCore,end);return {g,layers,tube,tubeMat,muz,muzCore,end,w}}
function megaBeamFree(b){if(!b)return;scene.remove(b.g,b.muz,b.muzCore,b.end);b.layers.forEach(l=>{l.mat.map.dispose();l.mat.dispose()});b.tubeMat.dispose();[b.muz,b.muzCore,b.end].forEach(o=>o.material.dispose())}
// place a beam: from, unit dir, length L, intensity k (0..1, also scales width), T = clock for the scroll
function megaBeamPose(b,from,dir,L,k,T){b.g.position.copy(from);b.g.lookAt(from.clone().add(dir));
  const fl=1+Math.sin(T*47)*.05+Math.sin(T*83)*.04;
  b.layers.forEach((l,i)=>{const w=b.w*l.k*k*fl;l.m.scale.set(w,w,L);l.mat.opacity=l.a*Math.min(1,k*1.4);l.mat.map.repeat.x=Math.max(1,L/38);l.mat.map.offset.x=-T*(2.6+i*1.3)});
  {const r=b.w*.42*k*fl;b.tube.scale.set(r,r,L);b.tubeMat.uniforms.uT.value=T*2.2;b.tubeMat.uniforms.uRep.value=Math.max(1,L/30);b.tubeMat.uniforms.uA.value=Math.min(1,k*1.3)}
  b.muz.position.copy(from);b.muz.scale.setScalar(b.w*1.1*k*fl);b.muz.material.rotation+=.25;b.muz.material.opacity=Math.min(1,k*1.3);
  b.muzCore.position.copy(from);b.muzCore.scale.setScalar(b.w*.7*k*fl);b.muzCore.material.opacity=Math.min(1,k*1.3);
  b.end.position.copy(from).addScaledVector(dir,L);b.end.scale.setScalar(b.w*(2.6+Math.sin(T*31)*.5)*k);b.end.material.opacity=Math.min(1,k*1.3)}
function megaMuzzle(){const m=new V3();if(P&&P.muzzle){P.root.updateMatrixWorld(true);P.muzzle.getWorldPosition(m)}else m.copy(S.pos).add(new V3(0,1.2,0));return m}
function megaWant(from,range){return camera.position.clone().addScaledVector(aimDir(),range).sub(from).normalize()}
// rifle out, blade off, body squared to the aim point
function megaHoldPose(to){S.bladeOn=0;if(P){P.bladeLen=0;if(P.rifleS!==1){P.rifleS=1;P.J.rifle.scale.setScalar(1)}}S.aimPt=to.clone();S.aimT=.3;
  if(S.act!=="shoot"||S.actT>.3)startAct("shoot",.1)}

function megaStart(mode){if(G.mega)megaEnd(true);const c=MEGA_CFG[mode],from=megaMuzzle();
  G.mega={mode,c,t:0,firing:false,slow:true,dir:megaWant(from,c.range),hits:new Map(),beam:null,L:c.range,ringT:0,boomT:0,sparkT:0};
  S.act=null;S.dash=0;S.dashT=null;S.pending=null;S.bufT=0;
  if(mode==="f"){G.iframe=Math.max(G.iframe,c.charge+c.fire+.3);S.slow=Math.max(S.slow,.35)}
  sfx("megaCharge");megaLoop(.25);
  emit(ADD,{pos:from,tex:TX.ring,color:MEGA_C,s0:mode==="f"?14:8,s1:1,life:c.charge*.8,a:.8});
  if(mode==="r")popText(c.label+" · 충전")}
function megaEnd(silent){const m=G.mega;if(!m)return;megaBeamFree(m.beam);G.mega=null;megaLoop(0);if(m.firing&&!silent)sfx("megaEnd");
  if(!silent&&m.firing){const tip=m.lastFrom?m.lastFrom.clone().addScaledVector(m.dir,m.L):null;if(tip){fxFlip(tip,m.mode==="f"?14:8,.7);emit(ADD,{pos:tip,tex:TX.ring,color:MEGA_C,s0:3,s1:m.mode==="f"?40:22,life:.5})}
    S.vel.multiplyScalar(.3)}}
function megaTick(dt,rdt,T){const m=G.mega;if(!m)return;
  if(VS||SCREEN!=="play"||S.ended||G.dead>0){megaEnd(true);return}
  m.t+=dt;const c=m.c,from=megaMuzzle();
  // aim: follows the reticle with a turn cap, so a sweep has weight
  const want=megaWant(from,c.range),ang=m.dir.angleTo(want),cap=(m.firing?c.turn:6)*dt;
  if(ang>1e-4){const k=Math.min(1,cap/ang);m.dir.lerp(want,k).normalize()}
  if(!m.firing){ // charging
    const k=Math.min(1,m.t/c.charge);megaHoldPose(from.clone().addScaledVector(m.dir,40));
    if(dt>0){const n=m.mode==="f"?4:2;for(let i=0;i<n;i++){const o=new V3().randomDirection().multiplyScalar((m.mode==="f"?9:6)*(1.2-k*.5));
        emit(ADD,{pos:from.clone().add(o),color:i%2?0xffffff:MEGA_C,vel:o.clone().multiplyScalar(-3.4),s0:.9,s1:.15,life:.3,a:.85,drag:0})}
      if(FXOK.mcharge&&Math.random()<.5)emit(ADD,{pos:from,tex:FXT.mcharge,color:MEGA_C,s0:(m.mode==="f"?5:3)*(.4+k),s1:.5,life:.22,a:.9,spin:9});
      if(Math.random()<.25)fxElectric(from.clone().add(new V3().randomDirection().multiplyScalar(1.5)),2+k*3)}
    megaLoop(.25+k*.35);
    if(m.t>=c.charge){m.firing=true;m.t=0;m.beam=megaBeamMesh(c.w);
      sfx("megaFire");sfx("thud",from,1);flash(m.mode==="f"?.45:.25);impactPunch(m.mode==="f"?1.4:.8);S.hitstop=Math.max(S.hitstop,m.mode==="f"?.08:.05);
      flashLight(from,MEGA_C,m.mode==="f"?18:10,90,.5);emit(ADD,{pos:from,tex:TX.ring,color:0xffffff,s0:2,s1:m.mode==="f"?30:16,life:.35,a:1});
      if(m.mode==="r")popText(c.label)}
    return}
  // firing
  const life=c.fire,u=m.t/life,ramp=Math.min(1,m.t/.08)*(u>.85?Math.max(0,(1-u)/.15):1);
  // cover stops the beam (breakables take damage)
  let L=c.range,blocker=null;for(let d=4;d<c.range;d+=3){const o=fieldHitAt(from.clone().addScaledVector(m.dir,d),c.w*.3);if(o){L=d;blocker=o;break}}
  m.L=L;m.lastFrom=from.clone();megaBeamPose(m.beam,from,m.dir,L,.35+.65*ramp,T);megaHoldPose(from.clone().addScaledVector(m.dir,Math.min(L,60)));
  megaLoop(m.mode==="f"?1.4:.9);
  S.vel.addScaledVector(m.dir,-(m.mode==="f"?26:14)*dt); // recoil push
  if(m.mode==="f")S.shake=Math.max(S.shake,.18); // a low rumble only; no big shakes
  if(dt>0){const tip=from.clone().addScaledVector(m.dir,L);
    for(let i=0;i<(m.mode==="f"?5:3);i++){const p=from.clone().addScaledVector(m.dir,Math.random()*L).add(new V3().randomDirection().multiplyScalar(c.w*.5));
      emit(ADD,{pos:p,tex:TX.streak,color:i%2?0xffffff:MEGA_C,vel:m.dir.clone().multiplyScalar(140),s0:c.w*.7,s1:.3,sx:4,life:.18,a:.8,drag:0})}
    m.ringT-=dt;if(m.ringT<=0){m.ringT=.09;emit(ADD,{pos:from.clone().addScaledVector(m.dir,2),tex:TX.ring,color:MEGA_C,s0:c.w*.8,s1:c.w*3.2,life:.28,a:.7})}
    m.sparkT-=dt;if(m.sparkT<=0){m.sparkT=.05;sparks(tip,m.dir.clone().negate(),0xffc8f2,40,.35,m.mode==="f"?10:6,.9);if(Math.random()<.5)fxElectric(from.clone().addScaledVector(m.dir,Math.random()*L),c.w*1.2)}
    m.boomT-=dt;if(blocker&&m.boomT<=0){m.boomT=.12;fxFlip(tip,c.w*1.8,.45);emit(NORM,{pos:tip,tex:TX.smoke,color:0x4a3a48,vel:new V3(0,3,0),s0:3,s1:9,life:1,a:.3,drag:1});
      if(m.hits.get(blocker)===undefined||T-m.hits.get(blocker)>.3){m.hits.set(blocker,T);fieldDamage(blocker,c.wp,tip)}}}
  // hits: everything within the beam's radius; the same target can be hit again every 0.35 s (MS armour, weak points)
  for(const e of enemies){if(!e.alive||e.isRemote)continue;const p=e.m.position,rel=p.clone().sub(from),along=rel.dot(m.dir);if(along<0||along>L+(e.rad||3))continue;
    const off=rel.clone().addScaledVector(m.dir,-along),dist=off.length();if(dist>c.hitR+(e.isBoss?8:(e.rad||3)*.45))continue;
    const last=m.hits.get(e);if(last!==undefined&&T-last<.35)continue;m.hits.set(e,T);
    if(e.isWP){wpDamage(e,c.wp,p.clone());continue}
    if(e.isBoss){if(e.down>0&&e.launched<=0){knock(e,m.dir,c.knockV,2.4);addScore(c.score*3,p.clone(),"big")}else{fxImpact(p.clone(),MEGA_C);sparks(p,m.dir.clone().negate(),0xffc8f2,30,.4,12)}continue}
    if(e.launched>0)continue;
    const side=dist>.3?off.normalize():new V3(0,1,0);const dir=m.dir.clone().multiplyScalar(.75).addScaledVector(side,.65);dir.y=Math.max(dir.y,.08);
    if(e.elite&&e.m.userData.shield)shieldFlash(e);
    knock(e,dir.normalize(),c.knockV,2.1);e.rad=Math.max(e.rad,4.8);hitFlash(e);
    fxImpact(p.clone(),MEGA_C);sfx("thud",p,1);hitMark("hit");addScore(c.score,p.clone(),"big")}
  if(m.t>=life)megaEnd(false);
}
// 1:1 showdown: purely visual beam (the room server owns the hit); fired after the same charge delay as the server
const VS_MEGA=[];
function megaVsFx(fromFn,dir,special){const ch=fromFn();
  emit(ADD,{pos:ch,tex:FXOK.mcharge?FXT.mcharge:TX.glow,color:MEGA_C,s0:2,s1:special?9:5,life:special?.9:.7,a:.9,spin:6});sfx("megaCharge",ch)}
function megaVsBeam(from,dir,special){const b=megaBeamMesh(special?7:3);VS_MEGA.push({b,from,dir:dir.clone().normalize(),t:0,life:special?1.8:.5,L:special?190:150});
  sfx("megaFire",from);flashLight(from,MEGA_C,12,80,.4)}
function megaVsTick(rdt,T){for(let i=VS_MEGA.length-1;i>=0;i--){const v=VS_MEGA[i];v.t+=rdt;const u=v.t/v.life;
  if(u>=1||!VS){megaBeamFree(v.b);VS_MEGA.splice(i,1);continue}
  megaBeamPose(v.b,v.from,v.dir,v.L,Math.min(1,v.t/.06)*(u>.7?(1-u)/.3:1),T)}}
