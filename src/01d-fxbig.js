/* ================= painted VFX, set 2 (ui/fx_meteor / bigexpl / shockwave / puff) ================= */
// meteor: a burning reentry streak sprite (head on the right of the texture) laid along the screen-space velocity.
// bigexpl: 4x4 flipbook with alpha for huge blasts (boss kill); shockwave: additive ring that expands with it.
// puff: soft smoke with alpha (missile trails). Anything that fails to load keeps the older procedural look.
const FXB={},FXBOK={};
(function(){const L=new THREE.TextureLoader();
  for(const k of ["meteor","bigexpl","shockwave","puff"]){const t=L.load("ui/fx_"+k+".webp",()=>{FXBOK[k]=true},undefined,()=>{});t.encoding=THREE.sRGBEncoding;FXB[k]=t}})();

// ---- meteors ----
const METEOR_AR=155/1024; // texture height / width
const METP=[];
for(let i=0;i<28;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:FXB.meteor,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0xffffff}));
  sp.visible=false;sp.frustumCulled=false;scene.add(sp);METP.push({sp,used:false})}
function fxMeteorNew(){if(!FXBOK.meteor)return null;const m=METP.find(x=>!x.used);if(!m)return null;m.used=true;return m}
// head = world position of the bright head, vel = world velocity, len = streak length (world units), a = opacity
function fxMeteorSet(m,head,vel,len,a){if(!m)return;const sp=m.sp,d=vel.clone().normalize();
  sp.position.copy(head).addScaledVector(d,-len*.46);sp.scale.set(len,len*METEOR_AR*1.6,1);
  sp.material.rotation=screenAngle(head,d);sp.material.opacity=a===undefined?1:a;sp.visible=true}
function fxMeteorFree(m){if(!m)return;m.used=false;m.sp.visible=false}

// ---- huge explosion: flipbook + shockwave rings ----
const BIGF=[],SHOCK=[];
for(let i=0;i<3;i++){const t=FXB.bigexpl.clone();t.repeat.set(.25,.25);t.needsUpdate=true;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,blending:THREE.NormalBlending}));sp.visible=false;sp.frustumCulled=false;scene.add(sp);BIGF.push({sp,t,on:false})}
for(let i=0;i<6;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:FXB.shockwave,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  sp.visible=false;sp.frustumCulled=false;scene.add(sp);SHOCK.push({sp,on:false})}
function fxShockwave(pos,size,life,delay){const s=SHOCK.find(x=>!x.on);if(!s||!FXBOK.shockwave)return;Object.assign(s,{on:true,k:-(delay||0)/(life||.8),life:life||.8,size});
  s.sp.position.copy(pos);s.sp.material.rotation=Math.random()*6.28;s.sp.visible=false}
function fxBigExplosion(pos,size){size=size||40;
  if(FXBOK.bigexpl){const f=BIGF.find(x=>!x.on)||BIGF[0];Object.assign(f,{on:true,k:0,life:1.9});f.sp.position.copy(pos);f.sp.scale.setScalar(size);
    f.sp.material.rotation=(Math.random()-.5)*.6;f.sp.visible=true}
  fxShockwave(pos,size*1.6,.75,0);fxShockwave(pos,size*2.4,1.1,.18)}
function stepFxBig(dt){
  for(const f of BIGF){if(!f.on)continue;f.k+=dt/f.life;if(f.k>=1){f.on=false;f.sp.visible=false;continue}
    const n=Math.min(15,Math.floor(Math.pow(f.k,.85)*16));f.t.offset.set((n%4)*.25,.75-Math.floor(n/4)*.25);f.sp.material.opacity=f.k<.82?1:(1-f.k)/.18}
  for(const s of SHOCK){if(!s.on)continue;s.k+=dt/s.life;if(s.k<0)continue;if(s.k>=1){s.on=false;s.sp.visible=false;continue}
    const e=1-Math.pow(1-s.k,3);s.sp.visible=true;s.sp.scale.setScalar(.15*s.size+e*s.size);s.sp.material.opacity=Math.pow(1-s.k,1.6)}}
