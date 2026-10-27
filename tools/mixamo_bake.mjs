import * as THREE from 'three';import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';import fs from 'fs';
const KEYS=[["hips","Hips",null],["torso","Spine2","Neck"],["head","Head","HeadTop_End"],["armR","RightArm","RightForeArm"],["foreR","RightForeArm","RightHand"],["rifle","RightHand","RightHandMiddle1"],
 ["armL","LeftArm","LeftForeArm"],["foreL","LeftForeArm","LeftHand"],["thighR","RightUpLeg","RightLeg"],["shinR","RightLeg","RightFoot"],["thighL","LeftUpLeg","LeftLeg"],["shinL","LeftLeg","LeftFoot"]];
const FILES={slash1:'Outward',slash2:'Inward',slash3:'High_Spin',jump:'Jump_Attack',guard:'Blocking',body:'Body_Block'};const out={fps:30,keys:KEYS.map(k=>k[0]),clips:{}};
const r=v=>Math.round(v*1000)/1000;
for(const [name,pat] of Object.entries(FILES)){const f=fs.readdirSync('.').find(f=>f.includes(pat)&&f.endsWith('.fbx'));const buf=fs.readFileSync(f);
 const o=new FBXLoader().parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');const B={};o.traverse(b=>{if(b.isBone)B[b.name.replace('mixamorig','')]=b});
 o.updateMatrixWorld(true);const rest={},dirs={};
 for(const [k,b,c] of KEYS){rest[k]=B[b].getWorldQuaternion(new THREE.Quaternion());if(c&&B[c])dirs[k]=B[c].getWorldPosition(new THREE.Vector3()).sub(B[b].getWorldPosition(new THREE.Vector3())).normalize().toArray().map(r)}
 const mx=new THREE.AnimationMixer(o);const act=mx.clipAction(o.animations[0]);act.play();const dur=o.animations[0].duration,n=Math.floor(dur*30)+1;
 const fr=[],tip=[];
 for(let i=0;i<n;i++){mx.setTime(i/30);o.updateMatrixWorld(true);const row=[];
  for(const [k,b] of KEYS){const q=B[b].getWorldQuaternion(new THREE.Quaternion()).multiply(rest[k].clone().invert());row.push(...q.toArray().map(r))}
  fr.push(row);const hq=B.RightHand.getWorldQuaternion(new THREE.Quaternion()).multiply(rest.rifle.clone().invert());
  const hp=B.RightHand.getWorldPosition(new THREE.Vector3()).sub(B.Hips.getWorldPosition(new THREE.Vector3()));tip.push(hp.add(new THREE.Vector3(0,0,100).applyQuaternion(hq)))}
 const sp=tip.map((p,i)=>i?p.distanceTo(tip[i-1])*30:0);let hi=0;sp.forEach((s,i)=>{if(s>sp[hi])hi=i});
 out.clips[name]={n,dirs,f:fr};console.log(name,'dur',dur.toFixed(2),'hit',(hi/30).toFixed(2),'speed',sp.map(s=>Math.round(s/100)).join(' '))}
fs.writeFileSync('sword.json',JSON.stringify(out));console.log('bytes',fs.statSync('sword.json').size);
