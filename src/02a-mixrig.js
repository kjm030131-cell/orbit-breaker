/* ================= Mixamo-rigged frames (Tripo auto-rig) ================= */
// The visible SkinnedMesh keeps Tripo's smooth weights; our 11-joint "driver" skeleton (same names,
// axis-aligned at rest, placed on the Mixamo joints) is what the pose solver, combat and PvP stream move.
// mixSync() copies each driver joint's rotation onto its Mixamo bone every frame.
const MIX_ORDER=[["hips",null,"Hips"],["torso","hips","Spine1"],["head","torso","Head"],["armR","torso","RightArm"],["foreR","armR","RightForeArm"],
  ["armL","torso","LeftArm"],["foreL","armL","LeftForeArm"],["thighR","hips","RightUpLeg"],["shinR","thighR","RightLeg"],["thighL","hips","LeftUpLeg"],["shinL","thighL","LeftLeg"],["rifle","foreR","RightHand"]];
function mixBone(root,n){let b=null;root.traverse(o=>{if(!b&&o.isBone&&(o.name==="mixamorig"+n||o.name==="mixamorig:"+n||o.name===n))b=o});return b}
function isMixRig(gltf){return !!mixBone(gltf.scene,"Hips")}
function buildMixRig(gltf,remote){
  // remember the bind pose once; clones (PvP opponent) are made later from an already-posed scene
  if(!gltf.userData.mixRest){gltf.scene.traverse(o=>{if(o.isBone){o.userData.restQ=o.quaternion.clone();o.userData.restP=o.position.clone()}});gltf.userData.mixRest=true}
  const scene=remote&&THREE.SkeletonUtils?THREE.SkeletonUtils.clone(gltf.scene):gltf.scene;scene.position.set(0,0,0);scene.rotation.set(0,0,0);scene.scale.set(1,1,1);
  scene.traverse(o=>{if(o.isBone&&o.userData.restQ){o.quaternion.copy(o.userData.restQ);o.position.copy(o.userData.restP)}});scene.updateMatrixWorld(true);
  let skin=null;scene.traverse(o=>{if(o.isSkinnedMesh&&!skin)skin=o;if(o.isMesh)o.frustumCulled=false});
  const P0={},J={},drv=new THREE.Group();
  for(const [k,p,n] of MIX_ORDER){const m=mixBone(scene,n);P0[k]=m?m.getWorldPosition(new V3()):(p?P0[p].clone():new V3());
    const b=new THREE.Bone();b.name=k;b.position.copy(P0[k]).sub(p?P0[p]:new V3());(p?J[p]:drv).add(b);J[k]=b}
  const map=[];for(const [k,,n] of MIX_ORDER){if(k==="rifle")continue;const m=mixBone(scene,n);if(m)map.push({k,m,rest:m.getWorldQuaternion(new THREE.Quaternion())})}
  // the rifle is part of the hand in Tripo's skin: move its vertices onto an extra bone so it can be hidden while the saber is out
  let gun=null;const hand=mixBone(scene,"RightHand");
  if(skin&&hand&&!skin.userData.gunSplit){const sk=skin.skeleton,hb=new Set();sk.bones.forEach((b,i)=>{if(/(RightHand|RightForeArm)$/.test(b.name))hb.add(i)});
    sk.update();const geo=skin.geometry,pa=geo.attributes.position,si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight,hy=P0.rifle.y,hx=P0.rifle.x,v=new V3();
    const idx=[];for(let i=0;i<pa.count;i++){let best=0,bw=-1;const ws=[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)],js=[si.getX(i),si.getY(i),si.getZ(i),si.getW(i)];for(let c=0;c<4;c++)if(ws[c]>bw){bw=ws[c];best=js[c]}
      if(!hb.has(best))continue;v.fromBufferAttribute(pa,i);skin.boneTransform(i,v);v.applyMatrix4(skin.matrixWorld);if(v.y<hy-.08||v.x<hx-.08)idx.push(i)}
    if(idx.length>30){gun=new THREE.Bone();gun.name="gun";hand.add(gun);scene.updateMatrixWorld(true);
      const hi=sk.bones.indexOf(hand),bones=sk.bones.concat([gun]),inv=sk.boneInverses.concat([sk.boneInverses[hi].clone()]),gi=bones.length-1;
      for(const i of idx){si.setXYZW(i,gi,0,0,0);sw.setXYZW(i,1,0,0,0)}si.needsUpdate=sw.needsUpdate=true;
      skin.bind(new THREE.Skeleton(bones,inv),skin.bindMatrix);skin.userData.gunSplit=true;
      let lo=null;for(const i of idx){v.fromBufferAttribute(pa,i);skin.boneTransform(i,v);v.applyMatrix4(skin.matrixWorld);if(!lo||v.y<lo.y)lo=v.clone()}gun.userData.muzzle=lo}}
  else if(hand)gun=hand.children.find(c=>c.name==="gun")||null;
  const holder=new THREE.Group();holder.add(scene,drv);
  const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),qr=new THREE.Quaternion();
  function sync(){holder.updateMatrixWorld(true);holder.getWorldQuaternion(qr).invert();
    for(const e of map){J[e.k].getWorldQuaternion(qa).premultiply(qr);qa.multiply(e.rest); // driver delta applied on the rest orientation
      e.m.parent.getWorldQuaternion(qb).premultiply(qr);e.m.quaternion.copy(qb.invert().multiply(qa));e.m.updateMatrixWorld(true)}
    if(gun)gun.scale.copy(J.rifle.scale)}
  return {holder,J,skin,hipY:P0.hips.y,P0,sync,gun}}
