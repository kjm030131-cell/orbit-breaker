/* ================= catapult launch cutscene ================= */
POSE.cata={hips:[0,0,0],torso:[.42,0,0],head:[-.38,0,0],armR:[.5,0,-.3],foreR:[-.55,0,0],armL:[.55,0,.32],foreL:[-.6,0,0],thighR:[-.95,0,-.06],shinR:[1.55,0,0],thighL:[-.7,0,.06],shinL:[1.3,0,0]};
POSE.stand={hips:[0,0,0],torso:[.05,0,0],head:[0,0,0],armR:[-.2,0,-.08],foreR:[-.3,0,0],armL:[-.1,0,.1],foreL:[-.35,0,0],thighR:[0,0,-.03],shinR:[.05,0,0],thighL:[0,0,.03],shinL:[.05,0,0]};
const CINE={on:false,t:0,z:-130,v:0,thr:.6,crouch:0,pose:null,skip:false,done:null,line:-1,typed:0,camPos:new V3(),camLook:new V3(),flags:{}};
let SHIP=null;
const DECK_Y=-2.6,HATCH_Z=-30,START_Z=-130,T_LAUNCH=3.75,T_END=6.1;

function panelTex(w,h,draw){const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");draw(x,w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}
function hazard(x,x0,y0,w,h,step){x.save();x.beginPath();x.rect(x0,y0,w,h);x.clip();x.fillStyle="#d89a12";x.fillRect(x0,y0,w,h);x.fillStyle="#17181a";for(let i=-h;i<w+h;i+=step*2){x.beginPath();x.moveTo(x0+i,y0);x.lineTo(x0+i+step,y0);x.lineTo(x0+i+step-h,y0+h);x.lineTo(x0+i-h,y0+h);x.fill()}x.restore()}
function buildShip(){
  const g=new THREE.Group();
  const hullT=panelTex(512,512,(x,w,h)=>{x.fillStyle="#2a2e33";x.fillRect(0,0,w,h);
    for(let i=0;i<46;i++){const pw=40+Math.random()*180,ph=30+Math.random()*120,px=Math.random()*w,py=Math.random()*h,v=38+Math.random()*14|0;x.fillStyle=`rgb(${v},${v+3},${v+7})`;x.fillRect(px,py,pw,ph);x.strokeStyle="rgba(0,0,0,.55)";x.lineWidth=2;x.strokeRect(px,py,pw,ph)}
    x.strokeStyle="rgba(0,0,0,.6)";x.lineWidth=3;for(let i=0;i<=w;i+=128){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke()}for(let j=0;j<=h;j+=96){x.beginPath();x.moveTo(0,j);x.lineTo(w,j);x.stroke()}
    hazard(x,0,h-26,w,18,18);x.fillStyle="rgba(235,230,218,.55)";x.font="bold 34px sans-serif";x.fillText("CATAPULT-02",24,60);x.font="bold 18px monospace";x.fillText("NO STEP · BLAST ZONE",300,200);
    x.fillStyle="rgba(255,178,26,.6)";x.font="bold 90px sans-serif";x.fillText("02",340,420)});
  const deckT=panelTex(256,1024,(x,w,h)=>{x.fillStyle="#1b1d20";x.fillRect(0,0,w,h);for(let j=0;j<h;j+=64){x.fillStyle=j%128?"#202327":"#1d2023";x.fillRect(0,j,w,62)}
    hazard(x,0,0,22,h,14);hazard(x,w-22,0,22,h,14);x.fillStyle="#0c0d0e";x.fillRect(w/2-34,0,16,h);x.fillRect(w/2+18,0,16,h);
    x.fillStyle="rgba(235,230,218,.5)";for(let j=0;j<h;j+=96)x.fillRect(w/2-3,j,6,48)});
  const doorT=panelTex(256,256,(x,w,h)=>{x.fillStyle="#30343a";x.fillRect(0,0,w,h);hazard(x,0,0,w,40,20);hazard(x,0,h-40,w,40,20);x.strokeStyle="rgba(0,0,0,.6)";x.lineWidth=4;x.strokeRect(10,50,w-20,h-100)});
  const mk=(t,rx,ry)=>{const tt=t.clone();tt.needsUpdate=true;tt.repeat.set(rx,ry);return new THREE.MeshStandardMaterial({map:tt,color:0x6c7178,metalness:.6,roughness:.7,envMap:ENV,envMapIntensity:.22})};
  const box=(w,h,d,mat,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);g.add(m);return m};
  const L=180,cz=HATCH_Z-L/2;
  box(52,7.4,L,mk(hullT,4,.4),0,DECK_Y-3.7,cz);
  box(52,7.5,L,mk(hullT,4,.4),0,6.5+3.75,cz);
  box(18,9.1,L,mk(hullT,6,.6),-17,1.95,cz);box(18,9.1,L,mk(hullT,6,.6),17,1.95,cz);
  const deck=new THREE.Mesh(new THREE.PlaneGeometry(16,L),mk(deckT,1,6));deck.rotation.x=-Math.PI/2;deck.position.set(0,DECK_Y+.01,cz);g.add(deck);
  const proc=[box(14,16,34,mk(hullT,1.5,1),0,22,-150),box(10,6,10,mk(hullT,1,1),0,33,-158),
  box(12.6,1.1,.3,new THREE.MeshBasicMaterial({color:0x9fe6ff}),0,26,-132.9),
  box(.5,12,.5,mk(hullT,.2,1),3,40,-160),box(.4,8,.4,mk(hullT,.2,1),-2.5,38,-158),
  box(60,1.4,60,mk(hullT,3,3),0,-10.6,-90)];
  const eng=[];[-15,0,15].forEach(x=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(5,6,16,20),mk(hullT,2,1));c.rotation.x=Math.PI/2;c.position.set(x,2,-218);g.add(c);proc.push(c);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff9a40,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.9}));s.position.set(x,2,-228);s.scale.set(22,22,1);g.add(s);eng.push(s)});
  // hatch rim + doors
  const rim=new THREE.MeshBasicMaterial({color:0xffb21a});
  box(16.6,.35,.6,rim,0,6.4,HATCH_Z+.1);box(16.6,.35,.6,rim,0,DECK_Y+.15,HATCH_Z+.1);box(.35,9,.6,rim,-8.1,1.95,HATCH_Z+.1);box(.35,9,.6,rim,8.1,1.95,HATCH_Z+.1);
  const doorM=new THREE.MeshStandardMaterial({map:doorT,metalness:.6,roughness:.5,envMap:ENV,envMapIntensity:.3});
  const dl=box(8.1,9.1,1,doorM,-4.05,1.95,HATCH_Z-.6),dr=box(8.1,9.1,1,doorM,4.05,1.95,HATCH_Z-.6);
  // tunnel lights
  const strip=new THREE.MeshBasicMaterial({color:0x5c7a90});box(.35,.15,L-4,strip,-4,6.38,cz);box(.35,.15,L-4,strip,4,6.38,cz);
  const guides=[];for(let z=START_Z-8;z<HATCH_Z-1;z+=4)[-6.2,6.2].forEach(x=>{const m=box(.5,.12,1.6,new THREE.MeshBasicMaterial({color:0x2a1a08}),x,DECK_Y+.08,z);m.userData.z=z;guides.push(m)});
  const warn=[];for(let z=-140;z<-35;z+=34)[-7.4,7.4].forEach(x=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xffa020,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));s.position.set(x,5.6,z);s.scale.set(3.2,3.2,1);g.add(s);warn.push(s)});
  const run=[];[[-26,14,-30,0xff3020],[26,14,-30,0x30ff60],[-26,-10,-30,0xff3020],[26,-10,-30,0x30ff60],[0,41,-160,0xff3020]].forEach(([x,y,z,c])=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:c,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));s.position.set(x,y,z);s.scale.set(2.4,2.4,1);g.add(s);run.push(s)});
  // sled
  const sled=new THREE.Group();g.add(sled);
  const sm=new THREE.MeshStandardMaterial({color:0x2a2c30,metalness:.6,roughness:.55,envMap:ENV,envMapIntensity:.15});
  const sb=new THREE.Mesh(new THREE.BoxGeometry(5.2,.7,7.5),sm);sb.position.y=DECK_Y+.35;sled.add(sb);
  const sg=new THREE.Mesh(new THREE.BoxGeometry(4.6,.1,.4),new THREE.MeshBasicMaterial({color:0xffb21a}));sg.position.set(0,DECK_Y+.72,3.4);sled.add(sg);
  [-1.4,1.4].forEach(x=>{const c=new THREE.Mesh(new THREE.BoxGeometry(1.2,.9,1.6),sm);c.position.set(x,DECK_Y+1,-.4);sled.add(c)});
  g.position.set(0,-9000,0);scene.add(g);
  SHIP={g,doors:[dl,dr],guides,warn,run,eng,sled,proc,model:null,retreat:-1,rv:0};
  attachShipModel();
  try{renderer.compile(scene,camera)}catch(e){}
}
// carrier "Astraea" hull (Tripo model, loaded after the title appears); the procedural tunnel stays inside it
const SHIP_S=300;let SHIP_GLTF=null;
function attachShipModel(){
  if(!SHIP||SHIP.model||!SHIP_GLTF)return;
  try{(gl=>{let src=null;gl.scene.traverse(o=>{if(o.isMesh&&!src)src=o});if(!src||SHIP.model)return;
    src.material.envMap=ENV;src.material.envMapIntensity=.3;src.material.side=THREE.DoubleSide; // single-sided hull walls vanish when seen from inside the hangar
    const m=new THREE.Mesh(src.geometry,src.material);m.scale.setScalar(SHIP_S);m.rotation.y=Math.PI/2;
    m.position.set(0,1.95-.085*SHIP_S,HATCH_Z-.22*SHIP_S);SHIP.g.add(m);SHIP.model=m;
    SHIP.proc.forEach(o=>o.visible=false);
    SHIP.eng.forEach((s,i)=>{s.position.set([-20,0,20][i],5,HATCH_Z-.5*SHIP_S-6);s.scale.set(30,30,1)});
    [[-36,10,-60],[36,10,-60],[-34,-6,-60],[34,-6,-60],[0,32,-110]].forEach((p,i)=>{if(SHIP.run[i])SHIP.run[i].position.set(...p)});
    try{renderer.compile(scene,camera)}catch(e){}
  })(SHIP_GLTF)}catch(e){console.warn(e)}
}

/* ---- overlay text ---- */
function cineLines(){const n=(PILOT.name||"파일럿"),u=UNITS[G.unit]||UNITS.mega;if(TUT.on)return[
  {at:-2.35,who:"아스트라이아 함장",txt:"전 기체 전투 배치. 적 편대, 서울 상공 궤도로 진입한다."},
  {at:.25,who:"아스트라이아 CIC · 한서윤 중위",txt:"앰버 1, 첫 출격이죠. 긴장 풀고, 제 말만 따라와요."},
  {at:1.95,who:"아스트라이아 CIC · 한서윤 중위",txt:"서울 상공 통과까지 120초. 발진을 허가합니다."},
  {at:3.05,who:"앰버 1",txt:"앰버 1, 출격한다!"}];return[
  {at:-2.35,who:"아스트라이아 함장",txt:"전 기체 전투 배치. 적 편대가 서울 상공 궤도에 들어선다."},
  {at:.25,who:"아스트라이아 CIC · 한서윤 중위",txt:`앰버 1, ${u.en} 장착 확인. 카타풀트 진로 클리어.`},
  {at:1.95,who:"아스트라이아 CIC · 한서윤 중위",txt:`서울 상공 통과까지 120초. ${n} 소위, 발진을 허가합니다.`},
  {at:3.05,who:`앰버 1 · ${n}`,txt:`${n}, ${(FRAMES[P&&P.frame]||FRAMES.mk2).name}. 앰버 1, 출격한다!`}]}
function setSub(i){const L=cineLines()[i];CINE.line=i;CINE.typed=0;$("subWho").textContent=L.who;$("subTxt").textContent="";$("cineSub").classList.add("on");sfx("radio")}

/* ---- control ---- */
function playCatapult(){return new Promise(res=>{
  if(!SHIP)buildShip();
  Object.assign(CINE,{on:true,t:-2.6,z:START_Z,v:0,thr:.6,crouch:0,pose:POSE.stand,skip:false,done:res,line:-1,flags:{}});
  SHIP.g.position.set(0,0,0);SHIP.g.rotation.set(0,0,0);SHIP.retreat=-1;SHIP.rv=0;
  SHIP.doors[0].position.x=-4.05;SHIP.doors[1].position.x=4.05;SHIP.sled.position.z=START_Z;
  SHIP.guides.forEach(m=>m.material.color.set(0x2a1a08));
  for(const e of enemies)e.m.visible=false;
  S.pos.set(0,0,START_Z);S.vel.set(0,0,0);S.yaw=0;S.face=0;S.pitch=-.08;S.bladeOn=0;
  LIGHTS.forEach(l=>{l.t=l.life});liI=0;
  flashLight(new V3(0,5,-118),0x9fc8ff,1.3,45,60);flashLight(new V3(0,5,-60),0x9fc8ff,1.3,45,60);flashLight(new V3(0,5,-128),0xffa020,0,40,60);
  const c=$("cine");c.hidden=false;c.classList.remove("on");void c.offsetWidth;c.classList.add("on");$("cineSub").classList.remove("on");
  sfx("clamp");
})}
function skipCine(){if(INTRO.on){if(INTRO.t>.5)INTRO.skip=true;return}if(CINE.on&&CINE.t>.4)CINE.skip=true}
function endCine(){
  sun.intensity=1.6;rim.intensity=1;
  CINE.on=false;CINE.pose=null;CINE.crouch=0;
  $("cine").hidden=true;
  LIGHTS.forEach(l=>{l.t=l.life});
  if(P)P.eye.scale.set(.05,.03,1);
  for(const e of enemies)disposeEnemy(e);enemies.length=0;fillEnemies();
  SHIP.retreat=0;S.vel.set(0,0,45);
  const r=CINE.done;CINE.done=null;if(r)r();
}
function cineUpdate(rdt){
  const inside=CINE.z<HATCH_Z+4;sun.intensity=lerp(sun.intensity,inside?.35:1.6,.2);rim.intensity=lerp(rim.intensity,inside?.25:1,.2);
  const t0=CINE.t;CINE.t+=rdt;const t=CINE.t,cross=a=>t0<a&&t>=a;
  if(CINE.skip){CINE.z=Math.max(CINE.z,30);CINE.v=45;S.pos.set(0,0,CINE.z);sfx("cataLaunch");endCine();return}
  const lines=cineLines();lines.forEach((L,i)=>{if(cross(L.at))setSub(i)});
  if(CINE.line>=0){const txt=lines[CINE.line].txt;CINE.typed=Math.min(txt.length,CINE.typed+rdt*34);$("subTxt").textContent=txt.slice(0,CINE.typed|0)}
  if(cross(4.1))$("cineSub").classList.remove("on");
  // doors
  const op=clamp((t-.6)/1.7,0,1),e=op*op*(3-2*op);SHIP.doors[0].position.x=-4.05-e*8.4;SHIP.doors[1].position.x=4.05+e*8.4;
  if(cross(.6))sfx("doors");
  // warning lamps + rig light
  const blink=.5+.5*Math.sin(t*9);SHIP.warn.forEach(s=>s.material.opacity=t<T_LAUNCH+.4?blink*.95:0);LIGHTS[2].i0=t<T_LAUNCH?blink*2.4:0;LIGHTS[2].t=0;
  // guide lights wave
  SHIP.guides.forEach(m=>{const k=(m.userData.z-START_Z)/(HATCH_Z-START_Z);const on=t>2.2+k*.9;m.material.color.set(!on?0x2a1a08:t>T_LAUNCH?0x40ff80:0xffb21a)});
  // pose / stance
  if(cross(1.9)){CINE.pose=POSE.cata;sfx("servo")}
  CINE.crouch=lerp(CINE.crouch,t>1.9&&t<T_LAUNCH?-.9:0,1-Math.pow(.002,rdt));
  if(t>2.35&&t<T_LAUNCH)CINE.thr=lerp(CINE.thr,1.6+Math.sin(t*30)*.2,.1);
  if(cross(2.35))sfx("cataCharge");
  if(P){const k=clamp((t-2.0)/.5,0,1)*(t<3.4?1:clamp(1-(t-3.4)/.4,0,1));P.eye.scale.set(.05+k*.35,.03+k*.12,1)}
  // launch
  if(cross(T_LAUNCH)){sfx("cataLaunch");S.shake=1.2;flash(.25);CINE.pose=POSE.fwd?Object.assign({},POSE.idle,POSE.fwd):null;
    for(let i=0;i<8;i++){const sx=i%2?1:-1;emit(NORM,{pos:new V3(sx*(4+Math.random()*2),DECK_Y+.4,START_Z+2+Math.random()*6),tex:TX.smoke,color:0x8a8f96,vel:new V3(sx*(8+Math.random()*8),3+Math.random()*3,4+Math.random()*10),s0:2,s1:7,life:1.3,a:.28,drag:1.6})}}
  if(t>=T_LAUNCH){
    if(CINE.z<HATCH_Z)CINE.v+=380*rdt;else{if(!CINE.flags.out){CINE.flags.out=1;sfx("whoosh")}CINE.v=40+(CINE.v-40)*Math.exp(-7*rdt)}
    CINE.z+=CINE.v*rdt;CINE.thr=CINE.z<HATCH_Z?3.6:lerp(CINE.thr,1.2,.05);
    if(CINE.z<HATCH_Z){SHIP.sled.position.z=CINE.z;
      sparks(new V3((Math.random()-.5)*4,DECK_Y+.2,CINE.z-3),new V3(0,.2,-1),0xffb050,60,.25,3,.3);
      [-7.6,7.6].forEach(x=>{if(Math.random()<.9)sparks(new V3(x,Math.random()*8-2,CINE.z+30+Math.random()*30),new V3(0,0,-1),0xcfe8ff,240,.12,1,.02)})}
    else SHIP.sled.position.z=lerp(SHIP.sled.position.z,HATCH_Z-6,.1);
  }else SHIP.sled.position.z=START_Z;
  S.pos.set(0,0,CINE.z);S.vel.set(0,0,Math.max(CINE.v,0)*.35);S.yaw=0;S.face=0;S.bladeOn=0;
  if(t>=T_END)endCine();
}
// returns true while the cutscene owns the camera
function cineCamera(rdt){
  const t=CINE.t,p=S.pos,lk=new V3();let pos=new V3(),fov=55;
  if(t<0){const k=(t+2.6)/2.6,e=k*k*(3-2*k); // establishing shot: slow dolly past the carrier's bow, Earth behind
    pos.set(lerp(120,70,e),lerp(34,16,e),lerp(170,95,e));lk.set(0,lerp(6,-2,e),lerp(-20,-70,e));fov=48}
  else if(t<1.9){const k=t/1.9;pos.set(lerp(-6.2,-4.8,k),lerp(4.4,3.2,k),lerp(-147,-142,k));lk.set(0,1.6,-112);fov=58}
  else if(t<3.35){const k=(t-1.9)/1.45;pos.set(lerp(1.6,1.0,k),lerp(.7,1.0,k),lerp(-123.6,-125.2,k));lk.set(0,.9,-130);fov=40}
  else if(t<4.25){pos.set(2.4,-.6,-139);lk.set(0,1.5,-96);fov=t>T_LAUNCH?78:60}
  else{if(SHIP&&SHIP.model){pos.set(95,58,100);fov=40}else{pos.set(12,3.4,30);fov=52}lk.copy(p.z<HATCH_Z?new V3(0,1.5,HATCH_Z):p).add(new V3(0,1,0));
    if(t>5.2){const k=clamp((t-5.2)/(T_END-5.2),0,1),s=k*k*(3-2*k);const cf=camFwd();
      const gp=p.clone().addScaledVector(cf,-10).add(new V3(0,2.8,0)),gl=p.clone().addScaledVector(cf,8).add(new V3(0,1.4,0));
      pos.lerp(gp,s);lk.lerp(gl,s);fov=lerp(66,62,s)}}
  const shot=t<0?-1:t<1.9?0:t<3.35?1:t<4.25?2:3,cut=CINE.flags.shot!==shot;CINE.flags.shot=shot;
  if(cut){CINE.camPos.copy(pos);CINE.camLook.copy(lk)}
  CINE.camPos.lerp(pos,1-Math.pow(.02,rdt));CINE.camLook.lerp(lk,CINE.flags.shot===3&&t<5.2?1-Math.pow(1e-5,rdt):1-Math.pow(.02,rdt));
  camera.position.copy(CINE.camPos);
  S.shake=Math.max(0,S.shake-rdt*2.2);const sh=S.shake*S.shake*.7;camera.position.add(new V3((Math.random()-.5)*sh,(Math.random()-.5)*sh,(Math.random()-.5)*sh));
  camera.lookAt(CINE.camLook);camera.fov+=(fov-camera.fov)*(cut?1:.15);camera.updateProjectionMatrix();
  return true;
}
function stepShip(rdt,T){
  if(!SHIP)return;
  SHIP.run.forEach((s,i)=>s.material.opacity=((T*1.2+i*.3)%1)<.5?1:.15);
  SHIP.eng.forEach(s=>s.material.opacity=.75+Math.sin(T*20)*.1);
  if(SHIP.retreat>=0){SHIP.retreat+=rdt;SHIP.rv+=rdt*(10+SHIP.retreat*40);SHIP.g.position.z-=SHIP.rv*rdt;SHIP.g.position.y+=SHIP.rv*rdt*.12;
    if(SHIP.retreat>9){SHIP.retreat=-1;SHIP.g.position.set(0,-9000,0)}}
}

/* ---- zero-g attitude control: idle drift + vernier puffs ---- */
const ATT={next:2,pitch:0,pv:0,roll:0,rv:0,prevV:new V3()};
function attitude(m,localV,dt,T){
  if(dt<=0)return;
  const acc=S.vel.clone().sub(ATT.prevV).divideScalar(dt).applyAxisAngle(new V3(0,1,0),-S.face);ATT.prevV.copy(S.vel);
  const tp=clamp(localV.z*.008+acc.z*.0035,-.35,.5)+Math.sin(T*.61)*.035+Math.sin(T*1.37)*.012;
  const tr=clamp(-localV.x*.01-acc.x*.004,-.4,.4)+Math.sin(T*.47+1)*.045+clamp(-S.faceVel*.05,-.25,.25);
  ATT.pv+=(120*(tp-ATT.pitch)-2*Math.sqrt(120)*.42*ATT.pv)*dt;ATT.pitch+=ATT.pv*dt;
  ATT.rv+=(110*(tr-ATT.roll)-2*Math.sqrt(110)*.4*ATT.rv)*dt;ATT.roll+=ATT.rv*dt;
  m.rotation.x=ATT.pitch;m.rotation.z=ATT.roll;
  ATT.brake=clamp(-acc.z/90,0,1);
  ATT.next-=dt;
  if(ATT.next<=0&&P&&SCREEN!=="title"&&!CINE.on){ATT.next=1.6+Math.random()*2.6;
    const joints=["armL","armR","shinL","shinR","torso"],j=joints[(Math.random()*joints.length)|0],p=new V3();P.J[j].getWorldPosition(p);
    const d=new V3().randomDirection();d.y=Math.abs(d.y)*.3;
    emit(NORM,{pos:p,tex:TX.smoke,color:0xe8edf2,vel:d.clone().multiplyScalar(9),s0:.5,s1:2.4,life:.55,a:.4,drag:3});
    emit(ADD,{pos:p,color:0xcfe8ff,s0:.9,s1:.1,life:.12,a:.8});
    ATT.pv-=d.y*1.2;ATT.rv+=d.x*1.6;if(P.SP[j])P.SP[j].v[0]+=(Math.random()-.5)*5;
    if(SCREEN==="play")sfx("puff",p)}
}
