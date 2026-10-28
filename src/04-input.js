/* ================= state & input ================= */
const S={pos:new V3(),vel:new V3(),yaw:0,pitch:-.08,face:0,faceVel:0,boost:100,heat:0,over:0,score:0,best:0,time:120,started:false,ended:false,
  hitstop:0,slow:0,shake:0,dash:0,dashT:null,shotCd:0,attackCd:0,bladeOn:0,demo:true,demoT:0,act:null,actT:0,combo:0,lastSlash:-9,pending:null};
const keys={};let SCREEN="title",PAUSED=false,wasLocked=false;
addEventListener("keydown",e=>{keys[e.code]=true;{const a=ac();if(a&&a.state!=="running")a.resume().catch(()=>{})}if(e.code==="KeyM"&&!(e.target&&e.target.tagName==="INPUT")){setSound(!AUD.on);return}if(SCREEN==="play"){if(["Space","Tab"].includes(e.code))e.preventDefault();if((e.code==="ShiftLeft"||e.code==="ShiftRight")&&!e.repeat)dodge();if(e.code==="KeyQ"&&!e.repeat){if(VS)vsGuard(true);else throwGrav()}if(e.code==="KeyE"&&!e.repeat)toggleFocus();if(e.code==="KeyR"&&!e.repeat)unitSkill();if(e.code==="KeyF"&&!e.repeat){e.preventDefault();special()}}UI.key(e)});
addEventListener("keyup",e=>{keys[e.code]=false;if(e.code==="KeyQ"&&VS)vsGuard(false);if(e.code==="KeyR"&&SCREEN==="play")unitSkillUp()});
let locked=false,mouseX=0,clockT=0;
document.addEventListener("pointerlockchange",()=>{locked=document.pointerLockElement===renderer.domElement;if(locked)wasLocked=true;else if(SCREEN==="play"&&wasLocked&&!S.ended){$("pauseLabel").textContent=VS?"ONLINE MATCH":"Paused";$("pauseTitle").textContent=VS?"대전은 계속 진행 중입니다":"일시정지";$("pauseNote").textContent=VS?"대전 시간은 멈추지 않습니다.":"작전이 멈춰 있습니다";$("pQuit").textContent=VS?"대전 나가기":"작전 종료";$("pQuitNote").hidden=!!VS||!SERVER;PAUSED=true;for(const k in keys)keys[k]=false;$("pause").hidden=false;muffle(true);audioFrame({hum:0,swing:0,thrust:0,amb:0})}});
renderer.domElement.addEventListener("contextmenu",e=>e.preventDefault());
function lock(){try{const p=renderer.domElement.requestPointerLock();if(p&&p.catch)p.catch(()=>{})}catch(_){}}
renderer.domElement.addEventListener("mousedown",e=>{if(SCREEN!=="play"||S.ended||PAUSED)return;if(!locked&&(wasLocked||VS))lock();if(e.button===0)attack();else if(e.button===2)shoot()});
// mouse sensitivity (per PC, remembered): slider on the title bar and the pause screen
let SENS=1;try{SENS=clamp(+localStorage.getItem("ob.sens")||1,.3,2.5)}catch(e){}
function setSens(v){SENS=clamp(+v||1,.3,2.5);try{localStorage.setItem("ob.sens",SENS)}catch(e){}document.querySelectorAll(".sensIn").forEach(i=>{i.value=SENS});document.querySelectorAll(".sensV").forEach(s=>s.textContent=SENS.toFixed(2))}
document.querySelectorAll(".sens").forEach(l=>{l.addEventListener("click",e=>e.stopPropagation());l.addEventListener("pointerdown",e=>e.stopPropagation())});
document.querySelectorAll(".sensIn").forEach(i=>i.addEventListener("input",()=>setSens(i.value)));setSens(SENS);
addEventListener("mousemove",e=>{if(SCREEN!=="play")return;if(locked){const fk=G.focus&&targetable(G.focus)?.35:1; /* while E-tracking the camera keeps pulling to the target; the mouse still nudges it */const mx=e.movementX,my=e.movementY;if(Math.abs(mx)>260||Math.abs(my)>260)return; /* Chrome pointer-lock spike */S.yaw-=clamp(mx,-120,120)*.0026*SENS*fk;S.pitch=clamp(S.pitch-clamp(my,-120,120)*.002*SENS*fk,-.7,.5)}else mouseX=(e.clientX/innerWidth-.5)*2});
document.addEventListener("pointerdown",()=>{const a=ac();if(a&&a.state!=="running")a.resume().catch(()=>{})});

const UI={key(){}};
