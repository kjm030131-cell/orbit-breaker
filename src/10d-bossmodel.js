/* ================= Kergogmos model + weak-point pods (10/29) =================
   models/boss.glb (Tripo rig, 20 bones) and models/boss_pod.glb load after the main models (deployed build only; the artifact
   build keeps the procedural hulk). Motion is procedural on top of the bind pose:
   idle  - slow hover bob, roll sway, wings breathing (bones swing about the forward axis, outer side more), small per-bone drift
   tele  - wings rise and the hulk leans back while the eye charges (1 s), red heat in the armour
   fire  - recoil: lurch forward + shoved back, wings snap down; volleys kick smaller
   down  - wings droop, nose dips, sinks and twitches; phase 2 - faster, bigger, hotter */
let BOSS_GLTF=null,POD_GLTF=null;
const BOSS_W=54,POD_S=12.5,POD_R=5.4,BOSS_EYE=7;
// pods sit just outside the wing tips and above the crown (boss-local, world units)
const WP_OFF2=[new V3(-31,5,10),new V3(31,5,10),new V3(0,21,3)];
function bossBuildModel(g){
  const o=THREE.SkeletonUtils.clone(BOSS_GLTF.scene);let mat=null;
  o.traverse(m=>{if(!m.isMesh)return;m.frustumCulled=false;m.material=m.material.clone();m.material.envMap=ENV;m.material.envMapIntensity=.9;
    m.material.emissive=new THREE.Color(0);if(!mat)mat=m.material});
  o.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(o),sz=box.getSize(new V3()),c=box.getCenter(new V3()),k=BOSS_W/sz.x;
  o.scale.multiplyScalar(k);o.position.sub(c).multiplyScalar(k);o.updateMatrixWorld(true);
  // per-bone swing axis: about the boss's forward axis, signed by side, weighted by how far out the joint sits
  const bones=[];o.traverse(n=>{if(n.isBone)bones.push(n)});const half=sz.x*k/2,tmp=new V3(),qp=new THREE.Quaternion(),oq=o.getWorldQuaternion(new THREE.Quaternion()).invert();
  const B=bones.map((n,i)=>{n.getWorldPosition(tmp);const lp=o.worldToLocal(tmp.clone()).multiplyScalar(k);/* back to boss units */
    const lat=clamp(Math.abs(lp.x)/half*2.2,0,1),side=lp.x<0?-1:1;
    if(n.parent)n.parent.getWorldQuaternion(qp);else qp.identity();const toP=oq.clone().multiply(qp).invert();
    const flap=new V3(0,0,side).applyQuaternion(toP).normalize(),drift=new V3(Math.sin(i*2.1),Math.cos(i*1.3),Math.sin(i*.7)).normalize().applyQuaternion(toP);
    return {n,rest:n.quaternion.clone(),lat,flap,drift,ph:i*.83}});
  // chained bones share the swing: a child of a swinging bone moves less on its own
  for(const b of B){const p=B.find(x=>x.n===b.n.parent);b.k=p&&p.lat>.3?.45:1}
  const pivot=new THREE.Group();pivot.add(o);g.add(pivot);
  const eye=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff2040,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  eye.position.set(0,sz.y*k*.08,sz.z*k*.42);eye.scale.set(BOSS_EYE,BOSS_EYE,1);pivot.add(eye);
  Object.assign(g.userData,{mat,eye,ring:null,anim:{pivot,B,lean:0,spread:-.5,rec:0,drop:0,q:new THREE.Quaternion()}});
}
function bossKick(b,n){const A=b.m.userData.anim;if(A)A.rec=Math.max(A.rec,n)}
function bossAnim(b,dt,T){const u=b.m.userData,A=u.anim;if(!A||!(dt>0))return;
  const down=b.down>0,tele=BOSS.tele>0?clamp(1-BOSS.tele,0,1):0,rage=BOSS.phase2?1:0,intro=BOSS.introT>0?BOSS.introT/3.2:0;
  A.rec=Math.max(0,A.rec-dt*2.4);
  const lean=down?.42:-.22*tele+.3*A.rec,spread=down?-.42:intro?-.55*intro:.42*tele-.3*A.rec,drop=down?-2.5:0,f=1-Math.exp(-dt*(down?2.2:A.rec>.3?14:5));
  A.lean+=(lean-A.lean)*f;A.spread+=(spread-A.spread)*f;A.drop+=(drop-A.drop)*f;
  const sp=1+rage*.5,bob=Math.sin(T*.9*sp)*(down?.3:1),tw=down?Math.sin(T*23)*.03*(Math.random()<.3):0;
  A.pivot.position.set(0,bob+A.drop,-A.rec*3);
  A.pivot.rotation.set(A.lean+Math.sin(T*.7)*.03+tw,Math.sin(T*.43)*.04,Math.sin(T*.55*sp)*.05);
  const breathe=Math.sin(T*1.1*sp)*(.07+rage*.04)*(down?.3:1),q=A.q;
  for(const s of A.B){const a=(A.spread+breathe)*s.lat*s.k,d=Math.sin(T*(1.3+rage*.6)+s.ph)*(.025+rage*.015);
    s.n.quaternion.copy(s.rest);q.setFromAxisAngle(s.flap,a);s.n.quaternion.premultiply(q);q.setFromAxisAngle(s.drift,d);s.n.quaternion.premultiply(q)}
  // heat: charge glow while telegraphing, ember baseline in phase 2, flicker while down (hit flash in the loop wins)
  if(b.flash<=0&&u.mat&&!down){const h=tele*.35+A.rec*.25+rage*(.1+.05*Math.sin(T*3));u.mat.emissive.setRGB(h,h*.12,h*.06)}
}
function podBuild(g){const inner=POD_GLTF.scene.clone(true);let mat=null;
  inner.traverse(m=>{if(!m.isMesh)return;m.material=m.material.clone();m.material.envMap=ENV;m.material.envMapIntensity=.9;m.material.emissive=new THREE.Color(0);if(!mat)mat=m.material});
  inner.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(inner),sz=box.getSize(new V3()),c=box.getCenter(new V3()),k=POD_S/Math.max(sz.x,sz.y,sz.z);
  inner.scale.multiplyScalar(k);inner.position.sub(c).multiplyScalar(k);
  const arm=new THREE.Group();arm.add(inner);g.add(arm);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff4030,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  glow.position.z=sz.z*k*.5+.4;glow.scale.set(7,7,1);g.add(glow);
  // power tether back to the hulk: tells you these belong to the boss
  const tg=new THREE.BufferGeometry();tg.setAttribute("position",new THREE.Float32BufferAttribute([0,0,0,0,0,0],3));
  const teth=new THREE.Line(tg,new THREE.LineBasicMaterial({color:0xff3a30,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));teth.frustumCulled=false;g.add(teth);
  Object.assign(g.userData,{mat,arm,glow,teth});
}
const _pv=new V3();
function podPlace(w,b,T){const u=w.m.userData,o=w.off.clone();o.y+=Math.sin(T*1.6+w.phase*2)*.7;o.x+=Math.sin(T*.8+w.phase)*.5;
  w.m.position.copy(o.applyMatrix4(b.m.matrixWorld));w.m.lookAt(S.pos);u.arm.rotation.z=T*(.5+(1-w.hp/WP_HP)*1.5)+w.phase;
  const k=w.hp/WP_HP,p=.5+.5*Math.sin(T*(5+(1-k)*14));u.glow.material.opacity=.5+.5*p;u.glow.scale.setScalar(6.5+p*2);
  if(w.flash<=0&&u.mat)u.mat.emissive.setRGB(.12+.22*p,.02,.01);
  w.m.updateMatrixWorld();const eye=b.m.userData.eye;eye.getWorldPosition(_pv);w.m.worldToLocal(_pv);
  const a=u.teth.geometry.attributes.position;a.setXYZ(1,_pv.x,_pv.y,_pv.z);a.needsUpdate=true;u.teth.material.opacity=.18+.25*p}
