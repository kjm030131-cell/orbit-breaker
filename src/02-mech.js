/* ================= player mech ================= */
const M_SCALE=4.8,HIP_Y=0.5;
let P=null;
// Ranked modes share frame performance; PvP frame passives are an optional host rule.
const FRAMES={mk2:{name:"XR-07 Mk-II",kr:"범용 주력기",hip:.5,obj:null},swift:{name:"XR-09 스위프트",kr:"고기동 시험기",hip:.47,obj:null}};
function buildPlayer(gltf,frame,remote){
  frame=frame||"mk2";let src=null;gltf.scene.traverse(o=>{if(o.isMesh&&!src)src=o});
  let J,mesh,hipY,mix=null;
  if(isMixRig(gltf)){mix=buildMixRig(gltf,remote);J=mix.J;mesh=mix.holder;hipY=mix.hipY;if(remote)mix.skin.material=mix.skin.material.clone()}
  else{const rig=MechRig.build(src,frame);J=rig.J;mesh=rig.mesh;if(remote)mesh.material=mesh.material.clone();hipY=FRAMES[frame].hip;mesh.frustumCulled=false}
  mesh.scale.setScalar(M_SCALE);mesh.position.y=-hipY*M_SCALE;
  const mat=mix?mix.skin.material:mesh.material;if(ENV)mat.envMap=ENV;mat.envMapIntensity=0.35;mat.color.setRGB(.95,.95,.95);
  mat.emissive=new THREE.Color(0x000000);
  const root=new THREE.Group();root.add(mesh);
  // thrusters
  const flames=[];
  [-1,1].forEach(sx=>{const pv=new THREE.Group();pv.position.set(sx*.07,.06,-.1);pv.rotation.x=.9;J.torso.add(pv);
    const g=new THREE.ConeGeometry(.022,.16,12,1,true);g.rotateX(Math.PI);g.translate(0,-.08,0);
    pv.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xff7a22,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false})));
    const c=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xfff2dc,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));c.scale.set(.35,.45,.35);pv.add(c);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff8a30,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.8}));glow.scale.set(.12,.12,1);pv.add(glow);
    {const gm=new THREE.PlaneGeometry(1,1);gm.translate(0,-.5,0);const mt=new THREE.MeshBasicMaterial({map:FXT.thruster,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
     for(const ry of [0,Math.PI/2]){const pl=new THREE.Mesh(gm,mt);pl.rotation.y=ry;pl.scale.set(.07,.2,1);pl.frustumCulled=false;pv.add(pl)}}
    flames.push(pv)});
  const eye=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff4a2a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  eye.position.set(0,.022,.05);eye.scale.set(.05,.03,1);J.head.add(eye);
  // beam blade (left hand)
  const blade=new THREE.Group();if(mix)blade.position.copy(J.rifle.position).add(new V3(0,-.03,.03));else blade.position.set(0,-.15,.03);J.foreR.add(blade);
  const hiltBox=new THREE.Mesh(new THREE.BoxGeometry(.022,.022,.07),new THREE.MeshStandardMaterial({color:0x3a3d42,metalness:.8,roughness:.3}));blade.add(hiltBox);
  attachHilt(blade,.1,new V3(0,0,-.064),Math.PI/2,hiltBox);
  const beam=new THREE.Group();beam.position.z=.035;blade.add(beam);
  const L=.7;
  const g1=new THREE.CylinderGeometry(.0055,.0055,L,8);g1.rotateX(Math.PI/2);g1.translate(0,0,L/2);
  const g2=new THREE.CylinderGeometry(.014,.009,L+.02,12,1,true);g2.rotateX(Math.PI/2);g2.translate(0,0,L/2);
  const g3=new THREE.CylinderGeometry(.03,.018,L+.05,14,1,true);g3.rotateX(Math.PI/2);g3.translate(0,0,L/2);
  const core=new THREE.Mesh(g1,new THREE.MeshBasicMaterial({color:0xffffff}));
  const inner=new THREE.Mesh(g2,new THREE.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  const outer=new THREE.Mesh(g3,new THREE.MeshBasicMaterial({color:0xff4a10,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.add(core,inner,outer);beam.scale.z=.001;core.visible=inner.visible=outer.visible=false; // kept only as colour/opacity holders
  const saber=saberMesh(0xff3aa8,.1,L+.03);beam.add(saber);
  const tipObj=new THREE.Object3D();tipObj.position.z=L;beam.add(tipObj);
  const baseObj=new THREE.Object3D();baseObj.position.z=L*.18;beam.add(baseObj);
  const hiltGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff8a30,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));hiltGlow.scale.set(.16,.16,1);blade.add(hiltGlow);
  const muzzle=new THREE.Object3D();if(mix&&mix.gun&&mix.gun.userData.muzzle)muzzle.position.copy(mix.gun.userData.muzzle).sub(mix.P0.rifle);else muzzle.position.set(-.04,-.27,.07);J.rifle.add(muzzle);
  // springs for every joint axis
  const SP={};const cfg={hips:[150,.75],torso:[190,.62],head:[230,.6],armR:[260,.5],foreR:[300,.55],armL:[260,.48],foreL:[300,.52],thighR:[140,.58],shinR:[150,.55],thighL:[140,.58],shinL:[150,.55]};
  for(const k in cfg){SP[k]={k:cfg[k][0],z:cfg[k][1],x:[0,0,0],v:[0,0,0]}}
  return {root,J,mat,flames,eye,beam,inner,outer,saber:saber.material,mixP0:mix?mix.P0:null,tipObj,baseObj,hiltGlow,muzzle,SP,bladeLen:0,rifleS:1,frame,sync:mix?mix.sync:null};
}
function setFrame(k){const F=FRAMES[k];if(!F||!F.obj||(P&&P.frame===k))return false;
  let pos=null,rot=0;if(P){pos=P.root.position.clone();rot=P.root.rotation.y;scene.remove(P.root)}
  P=F.obj;if(pos){P.root.position.copy(pos);P.root.rotation.y=rot}P.root.visible=true;scene.add(P.root);return true}
function loadFrame(k,g){if(FRAMES[k].obj||!g)return;FRAMES[k].gltf=g;FRAMES[k].obj=buildPlayer(g,k);if(typeof onFrameLoaded==="function")onFrameLoaded(k)}

/* ================= motion library ================= */
// base poses (radians; x: + pitches limb backward, armL z: + raises outward)
const POSE={
  idle:{hips:[0,0,0],torso:[.04,0,0],head:[0,0,0],armR:[-.32,0,-.06],foreR:[-.4,0,0],armL:[-.38,0,.12],foreL:[-.6,0,0],thighR:[.04,0,-.04],shinR:[.24,0,0],thighL:[-.22,0,.04],shinL:[.42,0,0]},
  fwd:{torso:[.28,0,0],head:[-.22,0,0],armR:[.32,0,-.18],foreR:[-.15,0,0],armL:[.38,0,.22],foreL:[-.25,0,0],thighR:[.55,0,-.06],shinR:[.65,0,0],thighL:[.42,0,.06],shinL:[.85,0,0]},
  back:{torso:[-.18,0,0],head:[.12,0,0],armR:[-.6,0,-.2],foreR:[-.5,0,0],armL:[-.7,0,.3],foreL:[-.7,0,0],thighR:[-.55,0,-.08],shinR:[.5,0,0],thighL:[-.35,0,.08],shinL:[.35,0,0]},
  left:{torso:[0,0,.18],armR:[-.2,0,-.35],armL:[-.3,0,.05],thighR:[0,0,-.28],thighL:[0,0,-.12],shinR:[.35,0,0],shinL:[.5,0,0]},
  right:{torso:[0,0,-.18],armR:[-.3,0,-.05],armL:[-.2,0,.4],thighR:[0,0,.12],thighL:[0,0,.28],shinR:[.5,0,0],shinL:[.35,0,0]},
  up:{torso:[-.08,0,0],head:[-.25,0,0],thighR:[.12,0,-.02],thighL:[.08,0,.02],shinR:[.12,0,0],shinL:[.15,0,0],armR:[.1,0,-.2],armL:[.12,0,.25]},
  down:{torso:[.15,0,0],head:[.2,0,0],thighR:[-.6,0,-.06],thighL:[-.75,0,.06],shinR:[1.1,0,0],shinL:[1.25,0,0],armR:[-.6,0,-.3],armL:[-.6,0,.35]},
  over:{torso:[.32,0,0],head:[.55,0,0],armR:[.05,0,-.05],foreR:[0,0,0],armL:[.05,0,.12],foreL:[-.1,0,0],thighR:[-.1,0,0],shinR:[.5,0,0],thighL:[-.15,0,0],shinL:[.55,0,0]},
};
// actions: keyframes [time 0..1, pose, stiffness multiplier]
const ACT={
  slash1:{dur:.56,strike:.38,keys:[
    [0,{armL:[-2.55,0,.75],foreL:[-.7,0,0],torso:[-.06,.6,.08],head:[0,-.25,0],armR:[-.25,0,-.3],hips:[0,.15,0],thighL:[-.4,0,.05],shinL:[.6,0,0]},1.6],
    [.3,{armL:[-.35,0,-.95],foreL:[-.05,0,0],torso:[.2,-.75,-.12],head:[.05,.2,0],armR:[-.55,0,.05],hips:[0,-.2,0],thighL:[.3,0,0],shinL:[.4,0,0],thighR:[-.35,0,0]},5],
    [.42,{armL:[-.2,0,-1.25],foreL:[-.05,0,0],torso:[.24,-.95,-.14],head:[.05,.3,0],hips:[0,-.3,0]},3.2],
    [.62,{armL:[-.55,0,-.8],foreL:[-.35,0,0],torso:[.14,-.6,-.06],armR:[-.5,0,0]},1.4]]},
  slash2:{dur:.52,strike:.36,keys:[
    [0,{armL:[-1.35,0,-1.05],foreL:[-1.25,0,0],torso:[.02,-.7,0],head:[0,.3,0],armR:[-.4,0,.1],hips:[0,-.2,0]},1.6],
    [.28,{armL:[-1.55,0,1.05],foreL:[-.12,0,0],torso:[.08,.75,.05],head:[0,-.2,0],armR:[-.2,0,-.45],hips:[0,.25,0],thighL:[-.3,0,.25],thighR:[.25,0,-.1]},5.5],
    [.4,{armL:[-1.75,0,1.3],foreL:[-.05,0,0],torso:[.1,.95,.08],head:[0,-.3,0],hips:[0,.32,0]},3.2],
    [.6,{armL:[-1.3,0,1.15],foreL:[-.3,0,0],torso:[.05,.65,0]},1.4]]},
  slash3:{dur:.86,strike:.52,keys:[
    [0,{armL:[-3.05,0,.25],foreL:[-.25,0,0],torso:[-.32,0,0],head:[-.3,0,0],armR:[-.9,0,-.35],thighL:[.35,0,0],thighR:[.3,0,0],shinL:[.9,0,0],shinR:[.8,0,0]},1.3],
    [.42,{armL:[-.15,0,-.05],foreL:[0,0,0],torso:[.55,0,0],head:[.2,0,0],armR:[.1,0,-.35],thighL:[-.75,0,0],shinL:[1.05,0,0],thighR:[.45,0,0],shinR:[.3,0,0]},6],
    [.62,{armL:[-.25,0,-.1],torso:[.45,0,0],thighL:[-.6,0,0],shinL:[.95,0,0]},1.2]]},
  lunge:{dur:.3,strike:1,keys:[[0,{armL:[-1.05,0,.45],foreL:[-.3,0,0],torso:[.38,.35,0],head:[-.25,-.2,0],armR:[.45,0,-.25],thighR:[.65,0,0],thighL:[.5,0,0],shinR:[.8,0,0],shinL:[1,0,0]},2]]},
  guard:{dur:.5,strike:9,keys:[[0,{torso:[.2,0,0],armR:[-1.2,0,.3],foreR:[-1,0,0]},2]]},
  shoot:{dur:.38,strike:0,keys:[[0,{armR:[-1.58,0,.06],foreR:[-.05,0,0],torso:[0,-.3,0],head:[0,-.22,0]},4],[.4,{armR:[-1.5,0,.04],foreR:[-.08,0,0],torso:[0,-.26,0],head:[0,-.2,0]},1.5]]},
};
// melee is right-handed: mirror the authored left-hand swings, keep the shield arm in a forward guard
function mirrorPose(p){const o={};for(const k in p){const v=p[k],m=/L$/.test(k)?k.slice(0,-1)+"R":/R$/.test(k)?k.slice(0,-1)+"L":k;o[m]=[v[0],-v[1],-v[2]]}return o}
const GUARD={armL:[-.72,.12,.45],foreL:[-.95,0,0]};
["slash1","slash2","slash3","lunge"].forEach(n=>{ACT[n].keys=ACT[n].keys.map(([t,p,s])=>[t,Object.assign(mirrorPose(p),GUARD),s])});
function keyAt(act,t){ // t in seconds -> {pose,stiff}
  const kt=t/act.dur;let k=act.keys[0];for(const kk of act.keys)if(kt>=kk[0])k=kk;return {pose:k[1],stiff:k[2]};
}
