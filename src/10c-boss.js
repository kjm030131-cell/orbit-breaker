/* ================= final phase: mobile armour "Kerberos" ================= */
// Three weak-point pods guard it. Destroy all three (slash, rifle, reflected fire, launched drones)
// and it goes dark for a few seconds: slash it then, and the whole hulk becomes a chain projectile.
const BOSS={e:null,wps:[],atkT:0,mode:0,tele:0,down:0,downs:0,dead:false,introT:0};
const WP_HP=4,WP_OFF=[new V3(-1.15,.28,.25),new V3(1.15,.28,.25),new V3(0,.95,-.6)];
const wpGeo=new THREE.IcosahedronGeometry(1.3,0),wpArmor=new THREE.OctahedronGeometry(2,0);
function spawnBoss(){
  if(!EN_MESH||BOSS.e||BOSS.dead||SCREEN!=="play")return;
  const g=new THREE.Group(),sc=3.6*6;
  const mat=EN_MESH.material.clone();mat.color.setRGB(.55,.42,.42);mat.emissive=new THREE.Color(0);
  const body=new THREE.Mesh(EN_MESH.geometry,mat);body.scale.setScalar(sc);body.position.y=-.5*sc;g.add(body);g.userData.mat=mat;
  // carrier ring + spines so the silhouette reads as a different, bigger class
  const ringMat=new THREE.MeshStandardMaterial({color:0x1a1b1f,metalness:.6,roughness:.55,envMap:ENV,envMapIntensity:.35});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(sc*.62,sc*.045,8,40),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=-.05*sc;g.add(ring);g.userData.ring=ring;
  for(let i=0;i<6;i++){const sp=new THREE.Mesh(new THREE.BoxGeometry(sc*.06,sc*.06,sc*.42),ringMat);const a=i/6*Math.PI*2;
    sp.position.set(Math.sin(a)*sc*.62,-.05*sc,Math.cos(a)*sc*.62);sp.rotation.y=a;ring.add(sp);sp.position.set(Math.sin(a)*sc*.62,Math.cos(a)*sc*.62,0);sp.rotation.set(0,0,a)}
  const eye=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff2040,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  eye.position.set(0,(.655-.5)*sc,.2*sc);eye.scale.set(3,3,1);g.add(eye);g.userData.eye=eye;
  const from=S.pos.clone().addScaledVector(fwd(),95).add(new V3(0,14,0));g.position.copy(from);scene.add(g);
  const e={m:g,v:new V3(),spin:new V3(),launched:0,chain:0,alive:true,phase:0,flash:0,elite:false,rad:9,isBoss:true,down:0,yaw:Math.atan2(S.pos.x-from.x,S.pos.z-from.z),tele:0,teleDir:new V3(),fireT:99};
  enemies.push(e);BOSS.e=e;BOSS.atkT=4;BOSS.mode=0;BOSS.down=0;BOSS.introT=3.2;
  buildWPs();
  sfx("radio");setTimeout(()=>{if(!S.ended){sfx("phase");cutin("케르베로스 출현","아르고스 지휘기")}},400);
  radio("CIC","지휘기 케르베로스 출현! 붉게 빛나는 약점 포드 3개를 먼저 부숴요!");
}
function buildWPs(){
  BOSS.wps=WP_OFF.map((off,i)=>{const g=new THREE.Group();
    const mat=new THREE.MeshStandardMaterial({color:0x3a2226,metalness:.6,roughness:.4,envMap:ENV,emissive:0x000000,flatShading:true});
    const arm=new THREE.Mesh(wpArmor,mat);g.add(arm);g.userData.mat=mat;g.userData.arm=arm;
    const core=new THREE.Mesh(wpGeo,new THREE.MeshBasicMaterial({color:0xff3a30}));core.scale.setScalar(.75);g.add(core);g.userData.core=core;
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow,color:0xff4030,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.set(3.2,3.2,1);g.add(glow);g.userData.glow=glow;
    scene.add(g);
    const w={m:g,v:new V3(),spin:new V3(),launched:0,chain:0,alive:true,phase:i,flash:0,elite:false,rad:2.6,isWP:true,hp:WP_HP,off,tele:0,teleDir:new V3(),fireT:99,yaw:0};
    enemies.push(w);return w});
  placeWPs(0);
}
function placeWPs(T){const b=BOSS.e;if(!b)return;b.m.updateMatrixWorld(true);const sc=3.6*6;
  for(const w of BOSS.wps){if(!w.alive)continue;const o=w.off.clone().multiplyScalar(sc*.55);o.y+=Math.sin(T*2+w.phase)*.4;
    w.m.position.copy(o.applyMatrix4(b.m.matrixWorld));w.m.userData.arm.rotation.y+=.02;w.m.userData.arm.rotation.x+=.013;
    const k=w.hp/WP_HP;w.m.userData.glow.material.opacity=.55+.45*Math.sin(T*(8+(1-k)*14));}
}
function wpDamage(w,n,at){
  if(!w.alive)return;w.hp-=n;w.flash=1;hitFlash(w);sparks(at||w.m.position,null,0xffb080,26,.4,18);fxImpact(at||w.m.position,0xff6040);sfx("hit",at);
  addScore(120*n,w.m.position.clone(),"");
  if(w.hp<=0){w.alive=false;const p=w.m.position.clone();disposeEnemy(w);fxExplosion(p,1.6);sfx("boom",p,2);S.shake=Math.max(S.shake,.9);
    addScore(1200,p,"big");if(SCREEN==="play")S.kills=(S.kills||0)+1;
    const left=BOSS.wps.filter(x=>x.alive).length;popText(left?`약점 포드 파괴 · 남은 ${left}`:"케르베로스 기능 정지!");
    if(!left)bossDown()}
}
function bossDown(){const b=BOSS.e;if(!b)return;b.down=6;BOSS.downs++;BOSS.tele=0;clearTele(b);
  S.slow=.6;flash(.35);sfx("specReady");cutin("기능 정지","지금 베어서 날려라");
  radio("CIC","지금이에요! 놈을 베어 날리면 주변 드론까지 한꺼번에 쓸어버릴 수 있어요!");
  for(let i=0;i<5;i++)setTimeout(()=>{if(BOSS.e&&b.alive){const p=b.m.position.clone().add(new V3().randomDirection().multiplyScalar(6));fxImpact(p,0xff8040);sparks(p,null,0xffc080,30,.5,20)}},i*260);
}
function bossDie(b,chainN){
  b.alive=false;BOSS.dead=true;const p=b.m.position.clone();
  for(let i=0;i<6;i++)setTimeout(()=>{fxExplosion(p.clone().add(new V3().randomDirection().multiplyScalar(5)),2+Math.random());sfx("boom",p,4)},i*150);
  fxExplosion(p,3.2);flashLight(p,0xffa040,20,160,.9);S.shake=1.8;S.slow=1.1;flash(.6);
  addScore(12000,p,"big");if(SCREEN==="play")S.kills=(S.kills||0)+1;onKill(b);
  for(const w of BOSS.wps)if(w.alive){w.alive=false;disposeEnemy(w)}
  setTimeout(()=>{scene.remove(b.m);b.m.traverse(o=>{if(o.material)o.material.dispose()})},50);clearTele(b);
  cutin("지휘기 격파","+12,000");radio("CIC","케르베로스 격파 확인! 앰버 1, 최고예요!");
  BOSS.e=null;
}
function bossAI(b,dt,T){
  const m=b.m,to=S.pos.clone().sub(m.position),d=to.length();to.normalize();b.phase+=dt;
  const ring=m.userData.ring;
  if(b.down>0){b.down-=dt;m.rotation.z=Math.sin(b.phase*3)*.12;m.position.y-=dt*1.2;if(ring)ring.rotation.z+=dt*.2;
    m.userData.eye.material.opacity=.15+.15*Math.random();m.userData.mat.emissive.setRGB(.25*Math.random(),.05,0);
    if(dt>0&&Math.random()<.25)emit(NORM,{pos:m.position.clone().add(new V3().randomDirection().multiplyScalar(4)),tex:TX.smoke,color:0x2a2b2e,s0:2,s1:7,life:1.2,a:.4});
    if(b.down<=0){b.down=0;buildWPs();sfx("phase");popText("케르베로스 재기동 · 약점 포드 복구");m.userData.mat.emissive.setRGB(0,0,0)}
    return}
  // approach, then circle at a fixed stand-off
  const keep=40;if(d>keep+4)m.position.addScaledVector(to,dt*(BOSS.introT>0?22:7));else if(d<keep-8)m.position.addScaledVector(to,-dt*6);
  const side=new V3(-to.z,0,to.x);m.position.addScaledVector(side,dt*4*Math.sin(b.phase*.35));m.position.y+=(S.pos.y+6-m.position.y)*dt*.6;
  BOSS.introT=Math.max(0,BOSS.introT-dt);
  const want=Math.atan2(S.pos.x-m.position.x,S.pos.z-m.position.z);let dy=Math.atan2(Math.sin(want-b.yaw),Math.cos(want-b.yaw));b.yaw+=clamp(dy,-.9*dt,.9*dt);
  m.rotation.set(0,b.yaw,Math.sin(b.phase*.6)*.05);if(ring)ring.rotation.z+=dt*.5;
  m.userData.eye.material.opacity=.8+Math.sin(T*5)*.2;
  if(SCREEN!=="play"||S.ended||BOSS.introT>0)return;
  if(BOSS.tele>0){BOSS.tele-=dt;const k=1-BOSS.tele/1;m.userData.eye.scale.setScalar(3+k*5+Math.sin(T*40)*1.2);
    if(BOSS.tele<=0)bossFire(b)}
  else{BOSS.atkT-=dt;if(BOSS.atkT<=0&&d<70){BOSS.tele=1;sfx("tele",m.position,1);sfx("tele",m.position,0)}}
}
function bossFire(b){
  const from=b.m.position.clone().add(new V3(0,1.5,0)),base=S.pos.clone().sub(from).normalize();
  const up=new V3(0,1,0),side=new V3().crossVectors(base,up).normalize();
  if(BOSS.mode%2===0){ // 5-way fan, aimed: dodge sideways or vertically
    for(let i=-2;i<=2;i++){const dir=base.clone().applyAxisAngle(up,i*.11);fireEnemyBolt(from,dir,false,b,30)}}
  else{ // three tight, staggered volleys aimed at where you'll be
    for(let k=0;k<3;k++)setTimeout(()=>{if(!b.alive||b.down>0||S.ended)return;const lead=S.pos.clone().addScaledVector(S.vel,.35).sub(from).normalize();
      for(let j=-1;j<=1;j+=2)fireEnemyBolt(from.clone().addScaledVector(side,j*2.5),lead,true,b,28)},k*260)}
  BOSS.mode++;BOSS.atkT=3.2+Math.random()*.8;b.m.userData.eye.scale.setScalar(3);S.shake=Math.max(S.shake,.25);
}
function bossTick(dt,rdt,T){placeWPs(T)}
function resetBoss(){
  if(BOSS.e){disposeEnemy(BOSS.e)}for(const w of BOSS.wps)if(w.alive)disposeEnemy(w);
  Object.assign(BOSS,{e:null,wps:[],atkT:0,mode:0,tele:0,down:0,downs:0,dead:false,introT:0});
}
// radio chatter overlay (reuses the cutscene subtitle style, but small, top-centre)
// portraits: ui/face_op.webp (CIC), face_ace.webp (enemy), face_cap.webp (captain) when present
const FACES={CIC:"face_op",적:"face_ace",함장:"face_cap"};
function radio(who,txt){const r=$("radio");if(!r)return;$("radioWho").textContent=who;const k=Object.keys(FACES).find(n=>who.includes(n)),f=$("radioFace");
  f.style.backgroundImage=k?`url(ui/${FACES[k]}.webp)`:"";f.textContent="";if(k){const im=new Image();im.onerror=()=>{f.style.backgroundImage=""};im.src=`ui/${FACES[k]}.webp`}$("radioTxt").textContent=txt;r.classList.remove("on");void r.offsetWidth;r.classList.add("on");
  sfx("radio");clearTimeout(radio.h);radio.h=setTimeout(()=>r.classList.remove("on"),4600)}
/* ---- boss guide (single, 10/28): many players did not know how to kill Kerberos. While it is up, the objective box says what to do
   right now and an arrow points at the next weak point (or at the stalled hulk while it is down). ---- */
function bossGuideTick(){const b=BOSS.e,on=!!(b&&b.alive&&!TUT.on&&!VS&&SCREEN==="play"&&!S.ended);document.body.classList.toggle("bossguide",on);
  if(!on){if(BOSS.guide){BOSS.guide=false;$("tutObj").hidden=true;$("tutMark").hidden=true}return}
  if(!BOSS.guide){BOSS.guide=true;$("tutObj").hidden=false;$("tutSkip").hidden=true;$("tutObjN").textContent="보스"}
  let tgt=null,obj,how,prog;
  if(b.down>0){obj="② 지금! 케르베로스를 베어 날리세요";how="약점이 모두 부서져 멈췄어요. 가까이 붙어 좌클릭으로 베면 주변 적까지 한꺼번에 쓸려 나가요.";prog=`멈춤 남은 시간 ${Math.ceil(b.down)}초`;tgt=b.m.position}
  else{const al=BOSS.wps.filter(w=>w.alive);obj="① 붉은 약점 포드 부수기";how="본체는 단단해요. 몸에 붙은 붉은 포드를 베거나 쏴서 부수세요. 3개를 다 부수면 잠깐 멈춥니다.";prog=`${3-al.length} / 3`;
    let bd=1e9;for(const w of al){const p=w.m.getWorldPosition?w.m.getWorldPosition(new V3()):w.m.position,d=p.distanceTo(S.pos);if(d<bd){bd=d;tgt=p}}}
  if($("tutObjTxt").textContent!==obj){$("tutObjTxt").textContent=obj;const o=$("tutObj");o.classList.remove("new");void o.offsetWidth;o.classList.add("new")}
  if($("tutObjHow").textContent!==how)$("tutObjHow").textContent=how;if($("tutObjProg").textContent!==prog)$("tutObjProg").textContent=prog;
  const mk=$("tutMark");if(!tgt){mk.hidden=true;return}const v=tgt.clone().add(new V3(0,3,0)).project(camera);let x=(v.x+1)/2*innerWidth,y=(1-v.y)/2*innerHeight;const behind=v.z>1;if(behind){x=innerWidth-x;y=innerHeight-y}
  const m=60,off=behind||x<m||x>innerWidth-m||y<m||y>innerHeight-m;if(off){const cx=innerWidth/2,cy=innerHeight/2,dx=x-cx,dy=y-cy,k=Math.min((cx-m)/Math.abs(dx||1e-6),(cy-m)/Math.abs(dy||1e-6));x=cx+dx*k;y=cy+dy*k;mk.style.setProperty("--rot",Math.atan2(dy,dx)+Math.PI/2+"rad")}else mk.style.setProperty("--rot","0rad");
  mk.hidden=false;mk.style.left=x+"px";mk.style.top=y+"px";mk.classList.toggle("edge",off);mk.lastChild.textContent=b.down>0?"베기!":"약점"}
