/* ================= state & input ================= */
const S={pos:new V3(),vel:new V3(),yaw:0,pitch:-.08,face:0,faceVel:0,boost:100,heat:0,over:0,score:0,best:0,time:120,started:false,ended:false,
  hitstop:0,slow:0,shake:0,dash:0,dashT:null,shotCd:0,attackCd:0,bladeOn:0,demo:true,demoT:0,act:null,actT:0,combo:0,lastSlash:-9,pending:null};
const keys={};let SCREEN="title",PAUSED=false,wasLocked=false;
addEventListener("keydown",e=>{keys[e.code]=true;{const a=ac();if(a&&a.state!=="running")a.resume().catch(()=>{})}if(e.code==="KeyM"&&!(e.target&&e.target.tagName==="INPUT")){setSound(!AUD.on);return}if(SCREEN==="play"){if(["Space","Tab"].includes(e.code))e.preventDefault();if((e.code==="ShiftLeft"||e.code==="ShiftRight")&&!e.repeat)dodge();if(e.code==="KeyQ"&&!e.repeat){if(VS)vsGuard(true);else throwGrav()}if(e.code==="KeyE"&&!e.repeat)toggleFocus();if(e.code==="KeyR"&&!e.repeat)unitSkill();if(e.code==="KeyF"&&!e.repeat){e.preventDefault();special()}}UI.key(e)});
addEventListener("keyup",e=>{keys[e.code]=false;if(e.code==="KeyR"&&SCREEN==="play"&&!VS&&G.unit==="missile"&&G.marking)unitSkillUp(); /* multi-lock: hold R, sweep, release to fire */if(e.code==="KeyQ"&&VS)vsGuard(false);});
let locked=false,mouseX=0,clockT=0;
document.addEventListener("pointerlockchange",()=>{locked=document.pointerLockElement===renderer.domElement;if(locked)wasLocked=true;else if(SCREEN==="play"&&wasLocked&&!S.ended){$("pauseLabel").textContent=VS?(VS.local?"TRAINING":"ONLINE MATCH"):"Paused";$("pauseTitle").textContent=VS?"대전은 계속 진행 중입니다":"일시정지";$("pauseNote").textContent=VS?"대전 시간은 멈추지 않습니다.":"작전이 멈춰 있습니다";$("pQuit").textContent=VS?"대전 나가기":"작전 종료";$("pQuitNote").hidden=!!VS||!SERVER;PAUSED=true;for(const k in keys)keys[k]=false;$("pause").hidden=false;muffle(true);audioFrame({hum:0,swing:0,thrust:0,amb:0})}});
renderer.domElement.addEventListener("contextmenu",e=>e.preventDefault());
function lock(){const plain=()=>{try{const p=renderer.domElement.requestPointerLock();if(p&&p.catch)p.catch(()=>{})}catch(_){}};
  try{const p=renderer.domElement.requestPointerLock({unadjustedMovement:true});if(p&&p.catch)p.catch(plain);else if(!p)plain()}catch(_){plain()}} /* 10/30: raw input = no OS mouse acceleration */
renderer.domElement.addEventListener("mousedown",e=>{if(SCREEN!=="play"||S.ended||PAUSED)return;if(!locked&&(wasLocked||VS||TUT.on))lock();if(e.button===0)attack();else if(e.button===2)shoot()});
// mouse sensitivity (per PC, remembered): slider on the title bar and the pause screen
let SENS=1;try{SENS=clamp(+localStorage.getItem("ob.sens")||1,.3,2.5)}catch(e){}
function setSens(v){SENS=clamp(+v||1,.3,2.5);try{localStorage.setItem("ob.sens",SENS)}catch(e){}document.querySelectorAll(".sensIn").forEach(i=>{i.value=SENS});document.querySelectorAll(".sensV").forEach(s=>s.textContent=SENS.toFixed(2))}
document.querySelectorAll(".sens").forEach(l=>{l.addEventListener("click",e=>e.stopPropagation());l.addEventListener("pointerdown",e=>e.stopPropagation())});
document.querySelectorAll(".sensIn").forEach(i=>i.addEventListener("input",()=>setSens(i.value)));setSens(SENS);
/* mouse look (10/29 19:20): events only add up counts; update() turns the camera once per frame (mouseLook). Applying each event
   directly made the per-frame turn uneven (mouse report rate != frame rate: 2 events one frame, 3 the next) = small judder while turning.
   Base speed .0025/.0019 rad/count (was .0019/.0015 — players found it too slow). Spike guard only for Chrome's huge bogus jumps. */
const MLOOK={x:0,y:0,avg:20,fk:1};
addEventListener("mousemove",e=>{if(SCREEN!=="play")return;if(locked){const mx=e.movementX,my=e.movementY,m=Math.max(Math.abs(mx),Math.abs(my));
    /* Chrome pointer-lock spike: a lone jump far above the recent average (or absurdly large) is dropped */
    if(m>600||(m>150&&m>MLOOK.avg*8+60))return;MLOOK.avg=MLOOK.avg*.9+m*.1;MLOOK.x+=mx;MLOOK.y+=my}else mouseX=(e.clientX/innerWidth-.5)*2});
// most of the pending counts go in this frame, the rest carries over (~10 ms smoothing): even steps without felt lag
function mouseLook(rdt){if(!locked||SCREEN!=="play"){MLOOK.x=MLOOK.y=0;return}if(!MLOOK.x&&!MLOOK.y)return;
  const fkT=G.focus&&targetable(G.focus)?.35:1; /* while E-tracking the camera keeps pulling to the target; the mouse still nudges it */
  MLOOK.fk+=(fkT-MLOOK.fk)*(fkT<MLOOK.fk?1:1-Math.exp(-Math.min(rdt,.1)/.15));const fk=MLOOK.fk; /* 10/30: back to full sensitivity over ~0.4 s, not in one frame */
  let k=rdt>=.05?1:1-Math.exp(-rdt/.01),mx=MLOOK.x*k,my=MLOOK.y*k;
  const cap=.32/(.0025*SENS*fk);if(Math.abs(mx)>cap){mx=Math.sign(mx)*cap}if(Math.abs(my)>cap){my=Math.sign(my)*cap} /* at most ~18 deg per frame; the rest carries over */
  MLOOK.x-=mx;MLOOK.y-=my;if(Math.abs(MLOOK.x)<.01)MLOOK.x=0;if(Math.abs(MLOOK.y)<.01)MLOOK.y=0;
  S.yaw-=mx*.0025*SENS*fk;S.pitch=clamp(S.pitch-my*.0019*SENS*fk,-.7,.5)}
document.addEventListener("pointerdown",()=>{const a=ac();if(a&&a.state!=="running")a.resume().catch(()=>{})});

const UI={key(){}};
