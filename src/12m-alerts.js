/* ================= boss intro + threat alerts (10/30) =================
   Players missed the boss's gimmick and the kamikaze drones in the heat of a sortie (voice lines alone were not enough), so:
   - boss intro: the world and the clock hold for ~5 s while the camera shows Kergogmos and the two steps to beat it (skippable after 1.5 s)
   - weak-point markers: every live weak point gets a "약점" tag on screen, or an arrow at the screen edge pointing to it
   - "지금! 베기" banner with a bar while the boss is stalled
   - kamikaze drones: a one-time warning when the first one shows up, then a "자폭" tag / edge arrow with distance on each one */
var BCINE={on:false,t:0,dur:5.2,fov0:0};
function bossCineStart(){if(TUT.on||VS||DUEL||SCREEN!=="play"||!BOSS.e)return false;
  Object.assign(BCINE,{on:true,t:0,fov0:camera.fov});G.iframe=Math.max(G.iframe,BCINE.dur+1.5);S.act=null;S.dashT=null;
  let el=$("bcine");if(!el){el=document.createElement("div");el.id="bcine";el.innerHTML=`<i class="bcBar t"></i><i class="bcBar b"></i>
<div class="bcTag">WARNING · 아르고스 지휘기 접근</div><div class="bcName"><b>케르고그모스</b><span>KERGOGMOS · 보스</span></div>
<div class="bcHow"><div class="s1"><em>1</em><span><b>붉은 약점 3곳</b>을 쏘거나 베어서 부수세요</span></div><div class="s2"><em>2</em><span>약점이 다 부서지면 보스가 멈춰요 → <b>가까이 붙어 베기!</b></span></div></div>
<div class="bcSkip">Space · 클릭 = 건너뛰기</div>`;document.body.appendChild(el)}
  el.className="";void el.offsetWidth;el.className="on";sfx("phase");return true}
function bossCineEnd(){if(!BCINE.on)return;BCINE.on=false;const el=$("bcine");if(el)el.className="";camera.fov=BCINE.fov0||camera.fov;camera.updateProjectionMatrix();
  const b=BOSS.e;if(b){const d=b.m.position.clone().sub(S.pos);S.yaw=Math.atan2(d.x,d.z);S.face=S.yaw;S.pitch=clamp(Math.atan2(d.y,Math.hypot(d.x,d.z))*.6,-.4,.35)}
  G.iframe=Math.max(G.iframe,1.2)}
function bossCineCam(rdt){BCINE.t+=rdt;const b=BOSS.e,t=BCINE.t;if(!b||S.ended||SCREEN!=="play"||t>=BCINE.dur){bossCineEnd();return}
  const el=$("bcine");if(el){el.classList.toggle("how",t>1.4);el.classList.toggle("skip",t>1.5)}
  const bp=b.m.position,dir=bp.clone().sub(S.pos).normalize(),side=new V3(dir.z,0,-dir.x).normalize();
  // over the shoulder: behind and above the mech, slowly pushing toward the boss
  const k=Math.min(1,t/1.2),e=k*k*(3-2*k);
  const want=S.pos.clone().addScaledVector(dir,-14+e*5).addScaledVector(side,4).add(new V3(0,5,0));
  camera.position.lerp(want,1-Math.pow(.002,rdt));camera.lookAt(bp.clone().lerp(S.pos,.08));
  const fv=BCINE.fov0-14*e;if(Math.abs(camera.fov-fv)>.05){camera.fov=fv;camera.updateProjectionMatrix()}}
["keydown","mousedown"].forEach(ev=>addEventListener(ev,e=>{if(!BCINE.on||BCINE.t<1.5)return;if(ev==="keydown"&&!["Space","Enter","Escape"].includes(e.code))return;e.preventDefault();e.stopImmediatePropagation();bossCineEnd()},{capture:true}));

// ---- edge / on-screen markers ----
const ALR={els:[],box:null,v:new V3(),run:null,kamiSaid:false,downMax:5};
function alrBox(){if(ALR.box)return ALR.box;const b=document.createElement("div");b.id="alerts";for(let i=0;i<10;i++){const m=document.createElement("div");m.className="am";m.hidden=true;m.innerHTML="<i></i><b></b><s></s>";b.appendChild(m);ALR.els.push(m)}
  const d=document.createElement("div");d.id="downBan";d.hidden=true;d.innerHTML="<b>지금! 가까이 붙어 베기</b><span>보스가 멈췄어요</span><i><u></u></i>";b.appendChild(d);ALR.down=d;$("hud").appendChild(b);ALR.box=b;return b}
function alertsTick(){requestAnimationFrame(alertsTick);
  const live=SCREEN==="play"&&!VS&&!TUT.on&&!S.ended&&S.started&&camera;
  if(!live){if(ALR.box){for(const m of ALR.els)if(!m.hidden)m.hidden=true;ALR.down.hidden=true}return}
  alrBox();if(ALR.run!==G.nf&&G.nf){ALR.run=G.nf;ALR.kamiSaid=false}
  const list=[];
  for(const e of enemies){if(!e.alive)continue;
    if(e.isWP&&!(BOSS.e&&BOSS.e.down>0))list.push({p:e.m.position,k:"wp",t:"약점"});
    else if(e.kami&&e.launched<=0)list.push({p:e.m.position,k:"kami",t:"자폭"})}
  // first kamikaze drone of the sortie: one clear warning
  if(!ALR.kamiSaid&&list.some(x=>x.k==="kami")){ALR.kamiSaid=true;cutin("자폭 드론 접근","붉게 깜빡이며 돌진 · 가까이 오기 전에 쏴서 터뜨리세요");S.slow=Math.max(S.slow,.9);popText("화면 가장자리 붉은 화살표 = 자폭 드론이 오는 방향")}
  const W=innerWidth,H=innerHeight,cx=W/2,cy=H*.46,rx=W/2-70,ry=H/2-90;let n=0;
  list.sort((a,b)=>a.p.distanceTo(S.pos)-b.p.distanceTo(S.pos));
  for(const x of list){if(n>=ALR.els.length)break;const d=x.p.distanceTo(S.pos);if(x.k==="kami"&&d>140)continue;
    const v=ALR.v.copy(x.p).project(camera),behind=v.z>1,on=!behind&&Math.abs(v.x)<.92&&Math.abs(v.y)<.88;const m=ALR.els[n++];
    let px,py,ang=0;
    if(on){px=(v.x*.5+.5)*W;py=(-v.y*.5+.5)*H}
    else{let dx=v.x,dy=-v.y;if(behind){dx=-dx;dy=-dy}if(Math.abs(dx)<1e-3&&Math.abs(dy)<1e-3)dy=1;const a=Math.atan2(dy*ry,dx*rx);px=cx+Math.cos(a)*rx;py=cy+Math.sin(a)*ry;ang=a*180/Math.PI}
    const cls="am "+x.k+(on?" on":" off")+(x.k==="kami"&&d<35?" near":"");if(m.className!==cls)m.className=cls;
    m.style.transform=`translate(${px.toFixed(0)}px,${py.toFixed(0)}px)`;m.firstChild.style.transform=on?"":`rotate(${ang.toFixed(0)}deg)`;
    const t=x.t,s=on&&x.k==="wp"?"":Math.round(d)+"m";if(m.children[1].textContent!==t)m.children[1].textContent=t;if(m.children[2].textContent!==s)m.children[2].textContent=s;m.hidden=false}
  for(;n<ALR.els.length;n++)if(!ALR.els[n].hidden)ALR.els[n].hidden=true;
  // boss stalled: big call to action with the time left
  const b=BOSS.e,dn=b&&b.alive&&b.down>0;if(dn){if(ALR.down.hidden){ALR.downMax=Math.max(b.down,1);ALR.down.hidden=false}ALR.down.lastChild.firstChild.style.width=(clamp(b.down/ALR.downMax,0,1)*100).toFixed(1)+"%"}else if(!ALR.down.hidden)ALR.down.hidden=true}
requestAnimationFrame(alertsTick);
