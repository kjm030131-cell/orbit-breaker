/* ================= combat ================= */
const fwd=()=>new V3(Math.sin(S.yaw),0,Math.cos(S.yaw));
const camFwd=()=>new V3(Math.sin(S.yaw)*Math.cos(S.pitch),Math.sin(S.pitch),Math.cos(S.yaw)*Math.cos(S.pitch));
// centre callouts are queued so a burst of them is still readable: each shows at least 0.9 s, the last one 1.6 s
const POPQ=[];let popBusy=0;
function popText(t){if(POPQ[POPQ.length-1]===t||POPQ.length>=3&&POPQ.shift()===undefined)return;POPQ.push(t);if(!popBusy)popNext()}
function popNext(){const p=$("pop");clearTimeout(popText.h);const t=POPQ.shift();if(t===undefined){popBusy=0;p.classList.remove("on");return}popBusy=1;
  p.textContent=t;p.classList.remove("on");void p.offsetWidth;p.classList.add("on");popText.h=setTimeout(()=>{if(POPQ.length)popNext();else popText.h=setTimeout(()=>{popBusy=0;p.classList.remove("on")},700)},900)}
function flash(a){const f=$("flash");f.style.transition="none";f.style.opacity=a;requestAnimationFrame(()=>{f.style.transition="opacity .18s";f.style.opacity=0})}
function cutin(txt,sub){sfx("cutin");$("cutinTxt").textContent=txt||"연쇄 폭발";$("cutinSub").textContent=sub||"";const c=$("cutin");c.classList.remove("go");void c.offsetWidth;c.classList.add("go")}
// targeting: only what sits near the crosshair; E locks a focus that the camera then keeps centred
const AIM_CONE=Math.cos(13*Math.PI/180),FOCUS_CONE=Math.cos(26*Math.PI/180);
function targetable(e){return e.alive&&e.launched<=0&&(!e.isBoss||e.down>0)}
const _aim=new V3();
function aimDir(){return _aim.set(0,.12,.5).unproject(camera).sub(camera.position).normalize().clone()} // through the reticle (44% from top)
function coneTarget(cone,range,excl){let best=null,bs=-9;const cf=aimDir(),cp=camera.position;
  for(const e of enemies){if(!targetable(e)||(excl&&excl.includes(e)))continue;const dist=e.m.position.distanceTo(S.pos);if(dist>range)continue;
    const c=e.m.position.clone().sub(cp).normalize().dot(cf);if(c<cone)continue;const sc=c-dist*.0012+(e.isWP?.004:0);if(sc>bs){bs=sc;best=e}}return best}
function pickTarget(){
  if(G.focus){const f=G.focus;if(targetable(f)&&f.m.position.distanceTo(S.pos)<(VS?260:80))return f;G.focus=null;if(SCREEN==="play")sfx("unfocus")}
  return VS?coneTarget(Math.cos(20*Math.PI/180),180):coneTarget(AIM_CONE,44)}
function toggleFocus(){if(SCREEN!=="play"||S.ended||G.dead>0)return;if(G.focus){G.focus=null;sfx("unfocus");return}
  const t=VS&&VS.tgt&&targetable(VS.tgt)?VS.tgt:coneTarget(FOCUS_CONE,64);if(t){G.focus=t;sfx("focus")}else sfx("deny")}
let target=null;
const COMBO_WIN=.9; // time after a swing in which the next click continues the 3-hit string
function startAct(name,at){S.act=name;S.actT=at||0;S.actHit=false}
function attack(){
  if(VS){
    if(S.attackCd>0&&S.attackCd<.2&&!(S.bufT>0)){S.buf="a";S.bufT=.2}
    if(!vsCanAct()||!P||VS.skillInput||S.over>0||S.attackCd>0||S.shotCd>0)return;
    S.combo=(clockT-S.lastSlash<1.3)?(S.combo+1)%3:0;S.lastSlash=clockT;
    const name="slash"+(S.combo+1);S.attackCd=ACT[name].dur+(S.combo===2?.45:.25);S.shotCd=S.attackCd;S.pending=null;S.dash=0;S.dashT=null;S.bladeOn=1.3;S.heat=Math.min(100,S.heat+(S.combo===2?12:8));
    const t=pickTarget();if(t&&t.m.position.distanceTo(S.pos)<=18){S.dashT=t;const d=t.m.position.clone().sub(S.pos);if(d.length()>5){S.vsLunge=Math.min(.16,(d.length()-4.2)/75);S.vsDir=d.normalize().multiplyScalar(75)}}
    startAct(name);vsSend({t:"swing"});sfx("ignite");return;
  }
  if(S.attackCd>0&&S.attackCd<.22&&!(S.bufT>0)){S.buf="a";S.bufT=.22}
  if(!P||S.over>0||S.attackCd>0||G.stagger>0||G.specT>=0||G.mega)return;
  const now=clockT;S.combo=(now-S.lastSlash<COMBO_WIN)?(S.combo+1)%3:0;S.lastSlash=now;
  const name="slash"+(S.combo+1);S.attackCd=S.combo===2?.42:.26;
  if(S.bladeOn<=0){sfx("ignite");emit(ADD,{pos:new V3(),follow:P.hiltGlowRef||P.beam,color:0xffc080,s0:2.5,s1:.5,life:.25})}
  S.bladeOn=1.3;S.heat=Math.min(100,S.heat+(S.combo===2?12:8));
  const t=pickTarget();
  if(t&&t.m.position.distanceTo(S.pos)>5){S.dashT=t;S.dash=.32;S.pending=name;startAct("lunge");sfx("dash")}
  else{startAct(name);S.pending=null;if(t)S.dashT=t}
}
function shoot(){
  if(VS){
    if(!vsCanAct()||!P||VS.skillInput||S.over>0||S.attackCd>0||S.shotCd>0)return;
    S.shotCd=vsSkills()&&G.unit==="missile"?.3:.4;S.attackCd=S.shotCd;
    const v=VS,round=v.round,token=v.shotToken=(v.shotToken||0)+1;
    const to=target?target.m.position.clone():camera.position.clone().addScaledVector(aimDir(),180);
    if(target&&target.isRemote&&VS.rvel){const d=to.distanceTo(S.pos);to.addScaledVector(VS.rvel,Math.min(.5,d/170)*.85)} // lead a moving opponent
    S.aimPt=to.clone();S.aimT=.75;S.bladeOn=0;P.bladeLen=0;S.dashT=null;S.pending=null;startAct("shoot");
    setTimeout(()=>{if(VS!==v||v.round!==round||token!==v.shotToken||!vsCanAct())return;P.root.updateMatrixWorld(true);const from=new V3();P.muzzle.getWorldPosition(from);const dir=to.clone().sub(from).normalize();vsSend({t:"shot",from:from.toArray(),dir:dir.toArray()});fxMuzzle(from,dir,0x40e8ff);sfx("shot");S.heat=Math.min(100,S.heat+4);S.camKick=1},70);return;
  }
  if(S.shotCd>0&&S.shotCd<.18&&!(S.bufT>0)){S.buf="s";S.bufT=.18}
  if(!P||S.over>0||S.shotCd>0||G.stagger>0||G.specT>=0||G.mega)return;S.shotCd=G.unit==="missile"?.24:.32;
  if(P.bladeLen>.04||S.bladeOn>0){S.bladeOn=0;P.bladeLen=0;S.pending=null;S.dash=0;S.act=null;P.rifleS=1;P.J.rifle.scale.setScalar(1);P.J.rifle.updateMatrixWorld(true)}
  // aimed rifle: shots fly down the reticle line; only a target sitting right on the reticle (~2.5 deg) gets a light assist
  const ad=aimDir();let t=null;if(target&&!target.isRemote){const tv=target.m.position.clone().sub(camera.position);if(tv.normalize().dot(ad)>Math.cos(.044))t=target}
  const end=t?t.m.position.clone():camera.position.clone().addScaledVector(ad,170);
  // raise and square up first (~70 ms), then fire from wherever the muzzle actually ended up
  S.aimPt=end.clone();S.aimT=.75;startAct("shoot");
  setTimeout(()=>{if(!P||SCREEN!=="play"&&SCREEN!=="launch")return;
    const tt=t&&t.alive?t:null,to=tt?tt.m.position.clone():end;P.root.updateMatrixWorld(true);const m=new V3();P.muzzle.getWorldPosition(m);
    const dir=to.clone().sub(m).normalize();sfx("shot");
    P.SP.armR.v[0]-=9;P.SP.foreR.v[0]-=5;P.SP.torso.v[0]-=3;P.SP.torso.v[1]+=1.5;P.SP.head.v[0]-=3;S.camKick=1; // recoil
    fxMuzzle(m,dir,0x40e8ff);fireBolt(m,to,tt);
    S.heat=Math.min(100,S.heat+4);S.shake=Math.max(S.shake,.32);S.vel.addScaledVector(dir,-6)},70);
}
function slashStrike(){ // called on the strike frame of a slash action
  const heavy=S.act==="slash3";if(VS&&!vsCanAct())return;if(heavy)tutCount("combo");sfx("slash",null,S.act==="slash2"?1:heavy?2:0);{const f=new V3(Math.sin(S.face),0,Math.cos(S.face)),r=new V3(Math.cos(S.face),0,-Math.sin(S.face));fxSlashArt(S.pos.clone().addScaledVector(f,4.5).add(new V3(0,1.4,0)),S.combo===1?r.clone().negate():r,heavy,S.combo)}
  const e=S.dashT&&S.dashT.alive&&S.dashT.launched<=0&&S.dashT.m.position.distanceTo(S.pos)<7.5?S.dashT:null;
  if(!e){fieldSlash(heavy);return}
  const tip=new V3();P.tipObj.getWorldPosition(tip);const at=e.m.position.clone().lerp(tip,.4);
  if(e.isRemote){vsAttackHit(heavy,G.crit>0,at);hitMark(heavy?"kill":"hit");impactPunch(heavy?.8:.45);sfx("thud",at,heavy?1:0);sfx("sizzle",at);return}
  if(e.blade&&bladeParry(e,at))return;
  if(e.isWP){wpDamage(e,3,at);S.hitstop=.08;S.shake=.6;flash(.18);fxSlashHit(at,0xff8a2a,true);sfx("heavy",at);addSpec(2);S.vel.multiplyScalar(.1);S.dashT=null;return}
  if(eliteBlocks(e,S.pos)){shieldFlash(e);fxImpact(at,0x48d8ff);sparks(at,null,0xbff4ff,24,.4,26);sfx("block",at);
    S.vel.copy(S.pos.clone().sub(e.m.position).normalize().multiplyScalar(30));S.freeT=.25;G.stagger=.3;S.hitstop=.06;S.shake=.6;S.act=null;S.dashT=null;S.combo=0;
    popText("방어됨 · 뒤를 노려라");return}
  const crit=G.crit>0,big=heavy||crit,idx=S.act==="slash2"?1:heavy?2:0;
  const dir=launchDir(idx);
  knock(e,dir,crit?62:heavy?52:36,big?2.2:1.8);hitFlash(e);if(big)e.rad=Math.max(e.rad,heavy&&crit?5.4:4.9);if(crit)G.crit=0;
  S.hitstop=crit?.17:heavy?.13:.085;S.shake=big?.85:.55;flash(big?.28:.16);impactPunch(crit?1.4:heavy?1:.6);hitMark(big?"kill":"hit");sfx("thud",at,big?1:0);sfx("sizzle",at);
  fxSlashHit(at,crit?0x7fe0ff:0xff8a2a,big);sfx(big?"heavy":"hit",at);
  if(big){ // finisher: a beat of slow motion after the stop, a burst of debris and light; no extra camera shake
    S.slow=Math.max(S.slow,crit?.32:.2);fxFlip(at,crit?7:5.5,.5);chunks(at,crit?7:5,22,.8);flashLight(at,crit?0x7fe0ff:0xff8a40,crit?9:7,40,.25);
    sparks(at,dir,crit?0xbff4ff:0xffc080,42,.45,crit?36:26,.6)}
  if(crit)popText("크리티컬");addSpec(2);
  addScore((heavy?260:150)*(crit?2:1),at,crit?"cyan":"");S.heat=Math.min(100,S.heat+3);S.vel.multiplyScalar(.1);S.dashT=null;
}
function disposeEnemy(e){clearTele(e);if(e.arc){scene.remove(e.arc.mesh);e.arc.mat.dispose();e.arc.geo.dispose();e.arc=null}scene.remove(e.m);e.m.traverse(o=>{if(o.material)o.material.dispose()})}
function chainPts(n){const k=Math.min(n,6);return 200*k*k+Math.max(0,n-6)*1500}
function explode(e,chainN){if(e.isWP){wpDamage(e,3,e.m.position.clone());return}if(e.isBoss){bossDie(e,chainN);return}e.alive=false;if(SCREEN==="play")S.kills=(S.kills||0)+1;disposeEnemy(e);fxExplosion(e.m.position,(e.elite?1.7:1)+Math.min(chainN,6)*.12);onKill(e);sfx("boom",e.m.position,chainN);S.shake=Math.max(S.shake,.5)}
function restart(){for(const e of enemies)disposeEnemy(e);enemies.length=0;fieldReset();
  Object.assign(S,{score:0,best:0,kills:0,time:120,started:false,ended:false,heat:0,over:0,boost:100,act:null,combo:0,dash:0,dashT:null,pending:null,bladeOn:0,hitstop:0,slow:0});
  S.pos.set(0,0,0);S.vel.set(0,0,0);resetGameplay();fillEnemies()}

/* ================= radar ================= */
const rc=$("radar").getContext("2d");
function drawRadar(){const W=264,c=W/2;rc.clearRect(0,0,W,W);rc.strokeStyle="rgba(255,178,26,.22)";rc.lineWidth=2;
  [c-4,c*.62,c*.3].forEach(r=>{rc.beginPath();rc.arc(c,c,r,0,Math.PI*2);rc.stroke()});
  rc.beginPath();rc.moveTo(c,4);rc.lineTo(c,W-4);rc.moveTo(4,c);rc.lineTo(W-4,c);rc.stroke();
  rc.fillStyle="rgba(255,178,26,.12)";rc.beginPath();rc.moveTo(c,c);rc.arc(c,c,c-4,-Math.PI/2-.5,-Math.PI/2+.5);rc.fill();
  const cs=Math.cos(S.yaw),sn=Math.sin(S.yaw);
  for(const e of enemies){if(!e.alive)continue;const dx=e.m.position.x-S.pos.x,dz=e.m.position.z-S.pos.z;const lx=dx*cs-dz*sn,lz=dx*sn+dz*cs;const s=(c-10)/(VS?150:60);let x=c-lx*s,y=c-lz*s;
    const d=Math.hypot(x-c,y-c);if(d>c-8){x=c+(x-c)*(c-8)/d;y=c+(y-c)*(c-8)/d}if(e.isWP)continue;if(e.isBoss){rc.fillStyle=(clockT*4|0)%2?"#ff4a3d":"#ffb21a";rc.fillRect(x-9,y-9,18,18);continue}rc.fillStyle=e.tele>0&&(clockT*8|0)%2?"#ffffff":e===target?"#ebe6da":e.elite?"#7fd8ff":"#ff4a3d";rc.beginPath();rc.arc(x,y,e===target?7:5,0,Math.PI*2);rc.fill()}
  for(const k of (G.crates||[])){const dx=k.g.position.x-S.pos.x,dz=k.g.position.z-S.pos.z,lx=dx*cs-dz*sn,lz=dx*sn+dz*cs,sc=(c-10)/60;let x=c-lx*sc,y=c-lz*sc;const d=Math.hypot(x-c,y-c);if(d>c-8){x=c+(x-c)*(c-8)/d;y=c+(y-c)*(c-8)/d}rc.fillStyle="#8dff7a";rc.fillRect(x-6,y-6,12,12)}
  rc.fillStyle="#ffb21a";rc.beginPath();rc.moveTo(c,c-11);rc.lineTo(c-8,c+8);rc.lineTo(c+8,c+8);rc.fill()}
