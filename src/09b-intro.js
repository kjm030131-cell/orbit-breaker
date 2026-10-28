/* ================= opening: 「유성우 예보」 ================= */
// ~52 s, skippable. Black card → orbital battle (wrecks fall and burn up) → meteor rain over Earth →
// a text from the pilot's sister → title card → hands straight over to the catapult cutscene.
const INTRO={on:false,t:0,skip:false,done:null,meteors:[],props:[],nextBoom:0,nextMet:0,cue:{}};
// world V5 (10/29): narrator lines vo/vo_nar01..05.mp3 play on cue when present; the subtitles run either way
const INTRO_LINES=[
  {at:.8,card:"2189년.",sub:"지구 전력의 70%는, 궤도 위 태양광 발전망 헬리오스에서 내려온다.",vo:"vo_nar01"},
  {at:7,txt:"3년 전, 제로 데이. 헬리오스를 짓고 지켜 온 궤도의 나라들, 아르고스 연합이 지구로 가는 전력을 끊었다.",vo:"vo_nar02"},
  {at:15.2,txt:"그날 밤 세계의 불이 꺼졌고, 궤도는 전쟁터가 되었다.",vo:"vo_nar03"},
  {at:20.6,txt:"정부는 무인기끼리의 전투라고 발표했다. 하지만 그 조종석에는, 사람이 타고 있다.",vo:"vo_nar04"},
  {at:27.6,txt:"격추된 기체는 대기권으로 떨어져 불탄다. 교전이 있는 밤이면, 뉴스는 이렇게 전한다. 오늘 밤, 유성우 예보.",vo:"vo_nar05"},
  {at:35.6,txt:""}];
const INTRO_END=52;
function introMeteor(pos,vel,big){INTRO.meteors.push({p:pos.clone(),v:vel.clone(),life:big?6:4.2,big:!!big,spr:fxMeteorNew()})}
function introProp(pos,vel){if(!EN_MESH)return null;const m=new THREE.Mesh(EN_MESH.geometry,EN_MESH.material.clone());m.scale.setScalar(E_SCALE);m.position.copy(pos);
  m.rotation.y=Math.atan2(vel.x,vel.z);scene.add(m);const o={m,v:vel.clone(),hp:1};INTRO.props.push(o);return o}
function playIntro(){return new Promise(res=>{
  if(!SHIP)buildShip();SHIP.g.position.set(0,0,0);SHIP.g.rotation.set(0,0,0);SHIP.retreat=-1;
  Object.assign(INTRO,{on:true,t:0,skip:false,done:res,nextBoom:7.2,nextMet:20,cue:{}});
  for(const e of enemies)e.m.visible=false;if(P)P.root.visible=false;
  for(let i=0;i<7;i++)introProp(new V3(-60+Math.random()*120,-4+Math.random()*26,60+Math.random()*70),new V3((Math.random()-.5)*14,(Math.random()-.5)*3,-6-Math.random()*8));
  const o=$("intro");o.hidden=false;o.className="on black";$("inCard").textContent="";$("inSub").textContent="";$("inLine").textContent="";$("inMsg").className="";$("inMsgA").textContent="";$("inMsgB").textContent="";$("inTitle").className="";
})}
function introClear(){for(const m of INTRO.meteors)fxMeteorFree(m.spr);for(const o of INTRO.props){scene.remove(o.m);o.m.material.dispose()}INTRO.props.length=0;INTRO.meteors.length=0}
function endIntro(){INTRO.on=false;introClear();$("intro").hidden=true;if(P)P.root.visible=true;const r=INTRO.done;INTRO.done=null;if(r)r()}
function introType(el,txt,t0,cps){const n=Math.max(0,Math.min(txt.length,((INTRO.t-t0)*(cps||26))|0));if(el.textContent.length!==n)el.textContent=txt.slice(0,n)}
function introUpdate(rdt){
  rdt=Math.min(rdt,.1);const t0=INTRO.t;INTRO.t+=rdt;const t=INTRO.t,cross=a=>t0<a&&t>=a,o=$("intro");
  if(INTRO.skip||t>=INTRO_END){endIntro();return}
  // overlay text
  const L0=INTRO_LINES[0];if(t>=L0.at&&t<6.5){introType($("inCard"),L0.card,L0.at,10);if(t>2)introType($("inSub"),L0.sub,2,16)}
  for(const L of INTRO_LINES)if(L.vo&&cross(L.at))voPlay(L.vo);
  // overlay state is derived from t (robust to long frames / skipping); cross() only fires sounds
  const black=t<6.5||t>=44.2,cls="on"+(black?" black":"");if(o.className!==cls)o.className=cls;if(t>=6.5&&$("inCard").textContent){$("inCard").textContent="";$("inSub").textContent=""}
  const mc=t>=36.2&&t<44.2?(t>=40.6?"on reply":"on"):"";if($("inMsg").className!==mc)$("inMsg").className=mc;const tc=t>=44.2?"on":"";if($("inTitle").className!==tc)$("inTitle").className=tc;
  for(let i=1;i<INTRO_LINES.length;i++){const L=INTRO_LINES[i],nx=INTRO_LINES[i+1];if(t>=L.at&&(!nx||t<nx.at))introType($("inLine"),L.txt,L.at,15)}
  // the sister's message, and the reply
  if(cross(36.2))sfx("uiok");
  if(t>36.5)introType($("inMsgA"),"오빠!! 오늘 밤 서울에 유성우 예보 떴어 ㅎㅎ 거기서도 보여?",36.5,24);
  if(cross(40.6))sfx("ui");
  if(t>41)introType($("inMsgB"),"…응. 잘 보여.",41,9);
  if(cross(44.2)){sfx("phase");voPlay(null)}
  // battle: wrecks blow up and start falling, burning
  for(const p of INTRO.props){p.m.position.addScaledVector(p.v,rdt);p.m.rotation.z+=rdt*.3}
  if(t>6.8&&t<35&&t>=INTRO.nextBoom&&INTRO.props.length){INTRO.nextBoom=t+.9+Math.random()*1.2;const i=(Math.random()*INTRO.props.length)|0,p=INTRO.props[i];
    fxExplosion(p.m.position,1.3);sfx("boom",p.m.position);fireBolt(p.m.position.clone().add(new V3(-30,8,-40)),p.m.position.clone(),null);
    introMeteor(p.m.position,new V3((Math.random()-.5)*6,-18,8),true);scene.remove(p.m);p.m.material.dispose();INTRO.props.splice(i,1);
    introProp(new V3(-60+Math.random()*120,-4+Math.random()*26,90+Math.random()*60),new V3((Math.random()-.5)*14,(Math.random()-.5)*3,-6-Math.random()*8))}
  if(t>20&&t<44&&t>=INTRO.nextMet){INTRO.nextMet=t+(t<36?(t<27?.3:.12):.35);introMeteor(new V3(-120+Math.random()*240,40+Math.random()*30,120+Math.random()*140),new V3(10+Math.random()*10,-60-Math.random()*30,-20-Math.random()*20),false)}
  for(let i=INTRO.meteors.length-1;i>=0;i--){const m=INTRO.meteors[i];m.life-=rdt;m.v.y-=rdt*(m.big?4:12);m.p.addScaledVector(m.v,rdt);
    const k=m.big?1:.7;if(m.spr)fxMeteorSet(m.spr,m.p,m.v,(m.big?34:20)*Math.min(1,m.v.length()/40+.4),Math.min(1,m.life*1.5));else emit(ADD,{pos:m.p.clone(),color:0xffb050,s0:(m.big?5:3.4)*k,s1:.4,life:m.big?.9:.55,a:.85});
    emit(ADD,{pos:m.p.clone(),color:0xfff0c0,s0:(m.big?2.6:1.8)*k,s1:.2,life:.12,a:1});
    if(m.big&&Math.random()<.4)emit(NORM,{pos:m.p.clone(),tex:TX.smoke,color:0x55504a,vel:new V3(0,2,0),s0:2,s1:6,life:1.4,a:.18,drag:1});
    if(m.life<=0){fxMeteorFree(m.spr);INTRO.meteors.splice(i,1)}}
}
function introCamera(rdt){const t=INTRO.t,pos=new V3(),lk=new V3();let fov=50;
  if(t<27){const k=clamp((t-6.3)/20.7,0,1),e=k*k*(3-2*k);pos.set(lerp(-44,-20,e),lerp(24,14,e),lerp(8,36,e));lk.set(lerp(-6,8,e),lerp(2,-4,e),115);fov=lerp(46,52,e)}
  else if(t<36){const k=(t-27)/9;pos.set(lerp(-10,10,k),lerp(70,62,k),lerp(10,30,k));lk.set(0,-60,220);fov=58}
  else{const k=clamp((t-36)/8,0,1),e=k*k*(3-2*k);pos.set(lerp(84,66,e),lerp(20,13,e),lerp(70,40,e));lk.set(0,lerp(8,3,e),lerp(-40,-75,e));fov=44}
  camera.position.copy(pos);camera.lookAt(lk);if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix()}return true}
