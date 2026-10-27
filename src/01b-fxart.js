/* ================= painted VFX textures (ui/fx_*.webp) ================= */
// Additive sheets are light on black; explosion flipbook and smoke carry alpha. Any texture that fails
// to load (artifact build) leaves the procedural effect in place.
var FXT={};const FXOK={};
(function(){const L=new THREE.TextureLoader();
  for(const k of ["expl","beam","saber","slash","muzzle","hit","ring","smoke","thruster","charge","electric","blade","trail"]){
    const t=L.load("ui/fx_"+k+".webp",()=>{FXOK[k]=true;if(k==="ring")TX.ring=t;if(k==="hit")TX.flare=t;if(k==="smoke")TX.smoke=t},undefined,()=>{});t.encoding=k==="blade"||k==="trail"?THREE.LinearEncoding:THREE.sRGBEncoding;if(k==="blade")t.wrapT=THREE.RepeatWrapping;FXT[k]=t}})();

// explosion flipbook (4x4): pooled sprites, each with its own texture view (shared image, own UV offset)
const FLIP=[];
for(let i=0;i<18;i++){const t=FXT.expl.clone();t.repeat.set(.25,.25);t.needsUpdate=true;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,blending:THREE.NormalBlending}));sp.visible=false;scene.add(sp);FLIP.push({sp,t,on:false})}
let flipI=0;
function fxFlip(pos,size,life){if(!FXOK.expl)return;const f=FLIP[flipI];flipI=(flipI+1)%FLIP.length;f.on=true;f.k=0;f.life=life||.85;f.sp.position.copy(pos);
  f.sp.scale.setScalar(size);f.sp.material.rotation=Math.random()*6.28;f.sp.visible=true}
function stepFxArt(dt){for(const f of FLIP){if(!f.on)continue;f.k+=dt/f.life;if(f.k>=1){f.on=false;f.sp.visible=false;continue}
  const n=Math.min(15,Math.floor(f.k*16));f.t.offset.set((n%4)*.25,.75-Math.floor(n/4)*.25);f.sp.material.opacity=f.k<.8?1:(1-f.k)/.2}
  for(let i=BEAMS.length-1;i>=0;i--){const b=BEAMS[i];b.t+=dt;const k=b.t/b.life;if(k>=1){scene.remove(b.g);BEAMS.splice(i,1);continue}
    b.g.scale.x=b.g.scale.y=b.w*(1+k*1.6);b.mat.opacity=Math.pow(1-k,1.5)}}

// beam rifle: textured crossed ribbons from muzzle to target, flaring then thinning out
const BEAMS=[];const ribbonGeo=(()=>{const a=new THREE.PlaneGeometry(1,1);a.rotateY(-Math.PI/2);a.translate(0,0,.5);const b=a.clone();b.rotateZ(Math.PI/2);
  return THREE.BufferGeometryUtils?THREE.BufferGeometryUtils.mergeBufferGeometries([a,b]):a})();
function fxBeam(from,to,w,color){if(!FXOK.beam)return false;const mat=new THREE.MeshBasicMaterial({map:FXT.beam,color:color||0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const g=new THREE.Group(),m=new THREE.Mesh(ribbonGeo,mat);if(!THREE.BufferGeometryUtils){const m2=m.clone();m2.rotation.z=Math.PI/2;g.add(m2)}g.add(m);
  g.position.copy(from);g.lookAt(to);g.scale.set(w,w,Math.min(from.distanceTo(to),160));m.frustumCulled=false;scene.add(g);BEAMS.push({g,mat,t:0,life:.24,w});return true}

// screen-aligned rotation for a directional sprite (muzzle flash / slash arc)
function screenAngle(pos,dir){const a=pos.clone().project(camera),b=pos.clone().add(dir).project(camera);return Math.atan2((b.y-a.y)/innerWidth*innerHeight,b.x-a.x)}
function fxMuzzleArt(pos,dir){if(!FXOK.muzzle)return;emit(ADD,{pos:pos.clone().addScaledVector(dir,1.6),tex:FXT.muzzle,color:0xffffff,s0:5,s1:8,sx:1.5,rot:screenAngle(pos,dir),life:.11,a:1})}
function fxSlashArt(pos,dir,heavy,combo){if(!FXOK.slash)return;const r=screenAngle(pos,dir)+(combo===1?Math.PI:0)+(heavy?-Math.PI/2:0);
  emit(ADD,{pos,tex:FXT.slash,color:heavy?0xffe0b0:0xffffff,s0:heavy?9:7,s1:heavy?13:10,sx:1.5,rot:r,life:heavy?.26:.2,a:1})}
function fxCharge(obj){if(FXOK.charge)emit(ADD,{pos:obj.getWorldPosition(new V3()),follow:obj,tex:FXT.charge,s0:2,s1:10,life:.7,a:1,spin:7})}
function fxElectric(pos,s){if(FXOK.electric)emit(ADD,{pos,tex:FXT.electric,color:0xffffff,s0:(s||3)*.6,s1:s||3,rot:Math.random()*6.28,life:.22,a:1})}
