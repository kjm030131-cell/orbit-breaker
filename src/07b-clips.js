/* ================= Mixamo sword clips on the driver skeleton ================= */
// models/sword.json is baked offline (sfx-style tool: /tools in HANDOFF §16) from the user's Mixamo FBX takes:
// per frame, each key's WORLD rotation delta from the Mixamo T-pose. At runtime that delta is re-aimed onto
// our frame's own rest pose (arms-down Tripo rig) by aligning bone directions, then written into the driver
// joints as local rotations, blended over the spring pose while a sword act runs. Only the upper body + hips
// are driven: legs keep the flight pose, root motion is ignored ("in place").
let CLIPS=null;
(function(){if(!window.GLB_BASE)return;fetch(GLB_BASE+"sword.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(j=>{if(!j)return;
  for(const n in j.clips){const c=j.clips[n];c.q=c.f.map(row=>j.keys.map((k,i)=>new THREE.Quaternion(row[i*4],row[i*4+1],row[i*4+2],row[i*4+3])));delete c.f}CLIPS=j}).catch(()=>{})})();
// clip window per act: w0..w1 (clip seconds) is stretched over the act so that the clip's contact frame `hit` lands on the act's strike frame
const CLIP_MAP={slash1:{c:"slash1",w0:.5,hit:.9,w1:1.32},slash2:{c:"slash2",w0:.85,hit:1.2,w1:1.62},slash3:{c:"slash3",w0:.05,hit:1.1,w1:1.45},
  lunge:{c:"jump",w0:.8,hit:1.02,w1:1.04},guard:{c:"guard",w0:.35,hit:.45,w1:.6}};
const CK_PARENT={hips:null,torso:"hips",head:"torso",armR:"torso",foreR:"armR",rifle:"foreR",armL:"torso",foreL:"armL"};
const _cy=new V3(0,1,0),_cq=new THREE.Quaternion(),_cI=new THREE.Quaternion();
function _basisQ(p,s){const e1=p.clone().normalize(),e3=s.clone().addScaledVector(e1,-s.dot(e1)).normalize(),e2=e3.clone().cross(e1);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(e1,e2,e3))}
function clipAlign(P,dirs){if(P._clipA)return P._clipA;const P0=P.mixP0,v=(a,b)=>P0[b].clone().sub(P0[a]).normalize(),A={};
  const D=k=>new V3().fromArray(dirs[k]);const fr=v("foreR","rifle"),fl=fr.clone().setX(-fr.x);
  const own={torso:v("torso","head"),armR:v("armR","foreR"),foreR:fr,armL:v("armL","foreL"),foreL:fl};
  for(const k in CK_PARENT)A[k]=new THREE.Quaternion();
  for(const k in own)if(dirs[k])A[k].setFromUnitVectors(own[k],D(k));
  if(dirs.rifle){const z=new V3(0,0,1);A.rifle=_basisQ(D("rifle"),z).multiply(_basisQ(fr,z).invert())} // keep the blade on the thumb side
  return P._clipA=A}
function clipLayer(P,dt){const blade=P.beam&&P.beam.parent,J=P.J,act=S.act,m=act&&CLIP_MAP[act],c=m&&CLIPS&&CLIPS.clips[m.c];
  if(!c||!P.mixP0||S.over>0){const k=Math.min(1,dt*12);J.rifle.quaternion.slerp(_cI,k);if(blade)blade.quaternion.slerp(_cI,k);return}
  const A=ACT[act],t=S.actT,st=act==="lunge"?A.dur:A.strike*A.dur,K=CLIPS.keys;
  const tc=t<st?m.w0+(m.hit-m.w0)*(t/st):m.hit+(m.w1-m.hit)*Math.min(1,(t-st)/Math.max(.01,A.dur-st));
  const f=clamp(tc*CLIPS.fps,0,c.n-1),i0=Math.floor(f),i1=Math.min(c.n-1,i0+1),u=f-i0,AL=clipAlign(P,c.dirs);
  if(m.yaw===undefined){const v=new V3(0,0,1).applyQuaternion(c.q[Math.round(m.hit*CLIPS.fps)][K.indexOf("torso")]);m.yaw=-Math.atan2(v.x,v.z)}
  const ry=_cq.setFromAxisAngle(_cy,m.yaw),D={};
  for(const k in CK_PARENT){const ki=K.indexOf(k);D[k]=ry.clone().multiply(c.q[i0][ki].clone().slerp(c.q[i1][ki],u)).multiply(AL[k])}
  const w=Math.min(1,t/.05)*clamp((A.dur-t)/.12,0,1)*(act==="lunge"?1:1);
  for(const k in CK_PARENT){const p=CK_PARENT[k],loc=p?D[p].clone().invert().multiply(D[k]):D[k];J[k].quaternion.slerp(loc,k==="hips"?w*.85:w)}
  if(blade)blade.quaternion.copy(J.rifle.quaternion)}
