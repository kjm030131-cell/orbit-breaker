/* ================= 1:1 part damage (protocol v9): arms and head break off, last stand from the opened cockpit =================
   The room server (pvp/src/arena.js) decides where every hit lands and when a part is destroyed ('part' event, state.pt).
   Here: hide the broken part on the skinned mesh (scale its Mixamo bone to ~0), burst + stump sparks, move the saber/rifle
   muzzle to the left hand when the weapon arm is lost, and switch to the first-person cockpit when your own head goes. */
const VS_MS=LOCAL_ARENA.VS_MS,VS_PART_HP=LOCAL_ARENA.PART_HP,VS_ARM_R_SLOW=LOCAL_ARENA.ARM_R_SLOW,VS_ARM_R_SHOT=LOCAL_ARENA.ARM_R_SHOT;
const VS_PART={head:{bone:"Head",j:"head",name:"머리"},armL:{bone:"LeftArm",j:"armL",name:"왼팔"},armR:{bone:"RightArm",j:"armR",name:"오른팔"}};
function vsPartBone(R,k){R.pb=R.pb||{};if(R.pb[k]===undefined)R.pb[k]=mixBone(R.root,VS_PART[k].bone)||R.J[VS_PART[k].j]||null;return R.pb[k]}
function vsPartsHome(R){if(R.home)return;const blade=R.beam&&R.beam.parent;R.home={blade,bladeParent:blade&&blade.parent,bladePos:blade&&blade.position.clone(),
  muzzleParent:R.muzzle&&R.muzzle.parent,muzzlePos:R.muzzle&&R.muzzle.position.clone()}}
// back to an intact mech; scale = VS_MS in the 1:1 arena (bigger bodies so parts can be aimed at), 1 everywhere else
function vsPartsReset(R,scale){if(!R)return;vsPartsHome(R);R.broken={};R.stumpT=0;R.root.scale.setScalar(scale);
  for(const k in VS_PART){const b=vsPartBone(R,k);if(b)b.scale.setScalar(1)}
  const h=R.home;if(h.blade&&h.blade.parent!==h.bladeParent){h.bladeParent.add(h.blade);h.blade.position.copy(h.bladePos)}
  if(R.muzzle&&R.muzzle.parent!==h.muzzleParent){h.muzzleParent.add(R.muzzle);R.muzzle.position.copy(h.muzzlePos)}
  if(R.eye)R.eye.visible=true;vsBodyVisible(R,true)}
function vsBodyVisible(R,on){R.root.traverse(o=>{if(o.isMesh&&o.material===R.mat)o.visible=on})}
function vsBreakPart(R,k,mine){if(!R||!R.broken||R.broken[k])return;R.broken[k]=true;const b=vsPartBone(R,k);if(!b)return;
  R.root.updateMatrixWorld(true);const at=b.getWorldPosition(new V3());
  // burst: flash, metal chunks, sparks, smoke
  fxImpact(at,0xff7030);flashLight(at,0xff8a40,9,46,.55);chunks(at,k==="head"?9:12,24,1.5);sparks(at,null,0xffc070,38,.7,70);sparks(at,null,0x9fe8ff,30,.5,30);
  for(let i=0;i<5;i++)emit(NORM,{pos:at.clone(),tex:TX.smoke,color:0x15171a,vel:new V3().randomDirection().multiplyScalar(6),s0:2,s1:9,life:1.3+Math.random()*.6,a:.55,drag:1.4,rot:Math.random()*6});
  emit(ADD,{pos:at.clone(),tex:TX.ring,color:0xff9a50,s0:2,s1:18,life:.45,a:.9});sfx("boom",at);sfx("heavy",at);
  b.scale.setScalar(.001);
  if(k==="armR"){ // weapon arm gone: the saber and the muzzle move to the left hand (mirrored)
    const h=R.home;if(h.blade&&R.J.foreL){R.J.foreL.add(h.blade);h.blade.position.set(-h.bladePos.x,h.bladePos.y,h.bladePos.z)}
    if(R.muzzle&&R.J.foreL&&R.J.rifle){const p=R.J.rifle.position.clone().add(h.muzzlePos);R.J.foreL.add(R.muzzle);R.muzzle.position.set(-p.x,p.y,p.z)}}
  if(k==="head"&&R.eye)R.eye.visible=false;
  if(mine)S.shake=Math.max(S.shake,.8);else{S.hitstop=Math.max(S.hitstop||0,.1);impactPunch(1.2);hitMark("kill")}}
// stumps keep sparking and smoking
function vsStumps(R,rdt){if(!R||!R.broken)return;R.stumpT=(R.stumpT||0)-rdt;if(R.stumpT>0)return;R.stumpT=.1+Math.random()*.08;
  for(const k in R.broken){const b=vsPartBone(R,k);if(!b)continue;const at=b.getWorldPosition(new V3());
    if(Math.random()<.7)sparks(at,new V3(0,1,0),0xffc070,10,.35,4,.8);if(Math.random()<.45)emit(NORM,{pos:at.clone(),tex:TX.smoke,color:0x1a1c20,vel:new V3((Math.random()-.5)*2,3,(Math.random()-.5)*2),s0:.8,s1:3.4,life:1,a:.4,drag:1.2,rot:Math.random()*6})}}

/* ---- your own head lost: the main camera is gone, the hatch is blown half open and you fight on from the pilot seat ---- */
let COCKPIT=null;
function vsCockpitBuild(){if(COCKPIT)return COCKPIT;const g=new THREE.Group(),dark=new THREE.MeshStandardMaterial({color:0x2a2e34,metalness:.6,roughness:.55,emissive:0x0d0f12}),
  trim=new THREE.MeshStandardMaterial({color:0x1b1d21,metalness:.75,roughness:.4,emissive:0x07080a}),amber=new THREE.MeshBasicMaterial({color:0xff9a3a}),red=new THREE.MeshBasicMaterial({color:0xff3020});
  const box=(w,h,d,x,y,z,rx=0,rz=0,m=dark)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.rotation.set(rx,0,rz);o.frustumCulled=false;g.add(o);return o};
  box(2.1,.5,.62,0,-.74,-.82,-.5);                         // main console
  box(2.1,.03,.05,0,-.5,-.6,-.5,0,amber);                  // console edge light
  box(.24,1.9,.3,-1.04,0,-.86,0,-.17);box(.24,1.9,.3,1.04,0,-.86,0,.17); // canopy pillars
  box(.05,1.7,.05,-.9,0,-.72,0,-.17,trim);box(.05,1.7,.05,.9,0,-.72,0,.17,trim);
  const hatch=box(2.5,.1,1.15,0,.66,-.78,.34);             // hatch blown half open: space shows through the gap under it
  box(2.3,.025,.04,0,.6,-.33,.34,0,red);                    // hazard light along the hatch edge
  box(2.3,.07,.07,0,.44,-1,0,0,trim);                       // canopy frame bar
  for(const sx of [-1,1]){const st=box(.05,.3,.05,sx*.42,-.6,-.5,.35,0,trim);box(.09,.12,.08,sx*.42,-.44,-.45,.35,0,dark)} // control sticks
  // three console screens drawn on canvases: status, radar, warning
  const scr=[];for(const [i,x] of [[0,-.48],[1,0],[2,.48]]){const c=document.createElement("canvas");c.width=256;c.height=150;const t=new THREE.CanvasTexture(c);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(.36,.21),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));m.position.set(x,-.47,-.6);m.rotation.x=-.5-.08;m.frustumCulled=false;g.add(m);scr.push({c,t,i})}
  g.traverse(o=>{o.renderOrder=2});g.visible=false;scene.add(g);COCKPIT={g,scr,hatch,t:0,sparkT:0};return COCKPIT}
function vsCockpitPos(){const v=new V3();P.J.torso.getWorldPosition(v);const f=new V3(Math.sin(S.face),0,Math.cos(S.face));return v.add(new V3(0,.5*VS_MS,0)).addScaledVector(f,.35*VS_MS)}
function vsCockpitScreens(C){const v=VS;for(const s of C.scr){const x=s.c.getContext("2d"),W=256,H=150;x.fillStyle="#04090c";x.fillRect(0,0,W,H);x.strokeStyle="rgba(120,220,255,.35)";x.strokeRect(3,3,W-6,H-6);
    x.font="600 15px Pretendard, sans-serif";x.textBaseline="top";
    if(s.i===0){const rows=[["장갑",v.hp/v.maxHp],["부스트",S.boost/100],["가드",(v.gp??100)/100]];rows.forEach(([n,k],j)=>{const y=18+j*40;x.fillStyle="#9fdcff";x.fillText(n,12,y);x.fillStyle="rgba(255,255,255,.12)";x.fillRect(80,y+3,160,12);x.fillStyle=k<.3?"#ff5a40":"#7fe8ff";x.fillRect(80,y+3,160*Math.max(0,Math.min(1,k)),12)})}
    if(s.i===1){const cx=W/2,cy=H/2+4,r=62;x.strokeStyle="rgba(127,232,255,.5)";for(const k of [1,.5]){x.beginPath();x.arc(cx,cy,r*k,0,7);x.stroke()}
      const a=(clockT*2)%(Math.PI*2);x.strokeStyle="rgba(127,232,255,.8)";x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.stroke();
      x.fillStyle="#7fe8ff";x.fillRect(cx-3,cy-3,6,6);const R=v.remote&&v.remote.root;if(R){const d=R.position.clone().sub(S.pos),cs=Math.cos(S.yaw),sn=Math.sin(S.yaw),lx=d.x*cs-d.z*sn,lz=d.x*sn+d.z*cs,k=r/120,L=Math.hypot(lx,lz),c=Math.min(1,r/(L*k||1));
        x.fillStyle="#ff4a3a";x.beginPath();x.arc(cx-lx*k*c,cy-lz*k*c,5,0,7);x.fill();x.fillStyle="#ffb0a0";x.font="600 12px Saira Semi Condensed, sans-serif";x.fillText(Math.round(L)+"m",8,H-20)}}
    if(s.i===2){const on=Math.floor(clockT*2.5)%2===0;x.fillStyle=on?"#ff4030":"#6a1810";x.font="800 19px Pretendard, sans-serif";x.fillText("메인 카메라 손실",14,30);x.font="600 15px Pretendard, sans-serif";x.fillStyle="#ffb090";x.fillText("콕핏 개방 · 육안 전투",14,70);x.fillStyle="rgba(255,120,80,.6)";x.fillText("자동 조준 불가",14,100)}
    s.t.needsUpdate=true}}
function vsCockpitTick(rdt){const on=!!(VS&&VS.fp&&P&&SCREEN==="play");if(!on&&!COCKPIT)return;const C=vsCockpitBuild();C.g.visible=on;$("vsFp").hidden=!on;if(!on)return;
  C.g.position.copy(camera.position);C.g.quaternion.copy(camera.quaternion);C.t-=rdt;if(C.t<=0){C.t=.1;vsCockpitScreens(C)}
  C.sparkT-=rdt;if(C.sparkT<=0){C.sparkT=.25+Math.random()*.5;const p=camera.localToWorld(new V3((Math.random()-.5)*1.6,.52,-.62));sparks(p,new V3(0,-1,0).applyQuaternion(camera.quaternion),0xffc070,4,.3,5,.5)}}
// own head lost: switch to the cockpit
function vsHeadLost(){const v=VS;if(!v||v.fp)return;v.fp=true;vsBodyVisible(P,false);flash(.45);S.slow=Math.max(S.slow||0,.35);sfx("destroyed");
  cutin("메인 카메라 손실","콕핏 개방 · 육안으로 싸워야 합니다")}
function vsPartsMsg(m){const v=VS;if(!v)return;const mine=m.side===v.side,R=mine?P:v.remote;vsBreakPart(R,m.part,mine);if(mine&&m.part==="head"){vsHeadLost();return}
  const n=VS_PART[m.part].name;if(mine)popText(m.part==="armR"?"오른팔 파괴 · 공격 속도 저하":m.part==="armL"?"왼팔 파괴 · 가드 약화":n+" 파괴");
  else popText(m.part==="head"?"상대 머리 파괴 · 상대 시야 제한":"상대 "+n+" 파괴!")}
function vsPartsHud(){const v=VS,sig=JSON.stringify([v.pt,v.opt]);if(v.ptSig===sig)return;v.ptSig=sig; // only touch the DOM when a part value changed
  for(const [id,pt] of [["vsPtMe",v.pt],["vsPtOp",v.opt]])for(const el of $(id).children){const k=el.dataset.p,hp=pt?pt[k]:VS_PART_HP[k],r=Math.max(0,hp/VS_PART_HP[k]);
  el.style.setProperty("--w",(r*100).toFixed(0)+"%");el.classList.toggle("gone",hp<=0);el.classList.toggle("low",hp>0&&r<.35)}}
function vsArmK(shot){const pt=VS&&VS.pt;return pt&&pt.armR<=0?(shot?VS_ARM_R_SHOT:VS_ARM_R_SLOW):1}
// aim point on the opponent: the spot under the reticle, kept inside the (VS_MS-scaled) body so a head or arm shot lands there
function vsAimPart(root,ad){const o=camera.position,t=Math.max(0,root.clone().sub(o).dot(ad)),off=o.clone().addScaledVector(ad,t).sub(root);
  off.y=clamp(off.y,-2.9,2.3);const h=Math.hypot(off.x,off.z);if(h>1.9){off.x*=1.9/h;off.z*=1.9/h}return root.clone().add(off)}
// small label next to the reticle naming the part under it (머리 / 왼팔 / 오른팔), same zones as the room server
function vsAimLabel(){const el=$("aimPart"),R=VS&&VS.remote;let t="";
  if(R&&R.root.visible&&VS.phase==="fight"&&SCREEN==="play"){const ad=aimDir(),o=camera.position,c=R.root.position.clone().add(new V3(0,.4,0)),k=Math.max(0,c.clone().sub(o).dot(ad)),near=o.clone().addScaledVector(ad,k);
    if(k<200&&near.distanceTo(c)<3.7){const part=LOCAL_ARENA.partAt({p:R.root.position.toArray(),f:R.root.rotation.y},near.toArray());if(part&&!(VS.opt&&VS.opt[part]<=0))t=VS_PART[part].name}}
  if(el.textContent!==t){el.textContent=t;el.hidden=!t}}
// the opponent starts a swing: a bright glint on its blade + a sharp ring, so deflect / parry timing can be read through the network delay
function vsSwingTell(R,heavy){if(!R||!R.tipObj)return;R.root.updateMatrixWorld(true);const p=R.tipObj.getWorldPosition(new V3()),b=(R.baseObj||R.tipObj).getWorldPosition(new V3()),m=p.clone().lerp(b,.4);
  emit(ADD,{pos:m,tex:TX.glow,color:heavy?0xff5040:0xffffff,s0:heavy?9:6,s1:1,life:.2,a:1});emit(ADD,{pos:m.clone(),tex:TX.ring,color:heavy?0xff4030:0xfff0c0,s0:1,s1:heavy?10:7,life:.22,a:.9});sfx("ignite",m)}
