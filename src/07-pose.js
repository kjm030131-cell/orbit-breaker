/* ================= pose solver ================= */
// per-joint limits [x],[y],[z] in radians, so no blend or overshoot can fold armour through the body
const LIM={hips:[[-.5,.5],[-.6,.6],[-.4,.4]],torso:[[-.6,.75],[-.95,.95],[-.45,.45]],head:[[-.7,.7],[-.9,.9],[-.35,.35]],
  armR:[[-2.4,.9],[-.6,.6],[-1.6,.95]],armL:[[-2.4,.9],[-.6,.6],[-.95,1.6]],foreR:[[-1.7,.05],[-.2,.2],[-.2,.2]],foreL:[[-1.7,.05],[-.2,.2],[-.2,.2]],
  thighR:[[-1.3,.9],[-.4,.4],[-.6,.5]],thighL:[[-1.3,.9],[-.4,.4],[-.5,.6]],shinR:[[0,1.75],[-.1,.1],[-.1,.1]],shinL:[[0,1.75],[-.1,.1],[-.1,.1]]};
function solvePose(dt,localV,boosting,T){
  const SP=P.SP,J=P.J;
  // movement blend weights
  const sp=localV.length();const n=sp>.5?localV.clone().divideScalar(Math.max(sp,1)):new V3();
  const intensity=clamp(sp/30,0,1)*(boosting?1.25:1);
  const out={};const idle=POSE.idle;for(const k in idle)out[k]=idle[k].slice();
  // breathing / floating micro motion
  const br=Math.sin(T*1.6),nz2=(a,b,c)=>Math.sin(T*a+c)+Math.sin(T*b+c*1.7)*.55;
  const calm=1-clamp(sp/25,0,1);
  out.torso[0]+=br*.025+nz2(.41,1.07,.3)*.03;out.torso[2]+=nz2(.33,.89,1.9)*.035*calm;
  out.armR[0]+=br*.03+nz2(.52,1.3,2.2)*.06*calm;out.armR[2]+=nz2(.37,.95,.7)*.05*calm;
  out.armL[0]+=br*.035+nz2(.47,1.19,4.1)*.07*calm;out.armL[2]+=nz2(.29,.83,3.3)*.06*calm;
  out.foreL[0]+=nz2(.6,1.4,5)*.08*calm;out.foreR[0]+=nz2(.55,1.25,6)*.06*calm;
  out.thighL[0]+=-.1+nz2(.31,.77,.9)*.13*calm;out.thighR[0]+=.12+nz2(.27,.71,2.8)*.12*calm;
  out.thighL[2]+=.04+nz2(.23,.61,1.2)*.05*calm;out.thighR[2]+=-.05+nz2(.21,.67,3.6)*.05*calm;
  out.shinL[0]+=.25+nz2(.36,.93,4.4)*.18*calm;out.shinR[0]+=.1+nz2(.34,.88,1.6)*.16*calm;
  out.hips[0]+=nz2(.19,.53,2.5)*.04*calm;out.hips[2]+=nz2(.17,.49,.4)*.04*calm;
  out.head[1]+=nz2(.25,.62,1)*.22*calm*(target?0:1);out.head[0]+=nz2(.31,.7,3)*.06*calm;
  const wF=clamp(n.z,0,1)*intensity,wB=clamp(-n.z,0,1)*intensity,wL=clamp(n.x,0,1)*intensity,wR=clamp(-n.x,0,1)*intensity,wU=clamp(n.y,0,1)*intensity,wD=clamp(-n.y,0,1)*intensity;
  const delta=(src,w)=>{for(const k in src){const o=out[k],b=idle[k]||[0,0,0];o[0]+=(src[k][0]-b[0])*w;o[1]+=(src[k][1]-b[1])*w;o[2]+=(src[k][2]-b[2])*w}};
  // boosting forward: superhero flight line (torso down, arms swept back, legs trailing)
  const wDash=boosting?clamp(n.z,0,1)*clamp(sp/40,0,1):0;S.boostLean=wDash;
  if(wDash>0)delta({torso:[.6,0,0],head:[-.55,0,0],armR:[.65,0,-.25],foreR:[-.2,0,0],armL:[.7,0,.3],foreL:[-.25,0,0],thighR:[-.2,0,-.05],shinR:[.3,0,0],thighL:[-.35,0,.06],shinL:[.5,0,0]},wDash);
  delta(POSE.fwd,wF*(1-wDash));delta(POSE.back,Math.min(1,wB+(ATT.brake||0)*.8));delta(POSE.left,wL);delta(POSE.right,wR);delta(POSE.up,wU);delta(POSE.down,wD);
  // turning: upper body leads the turn
  out.torso[1]+=clamp(-S.faceVel*.12,-.45,.45);out.hips[2]+=clamp(S.faceVel*.04,-.15,.15);
  // head tracks target
  if(target&&S.over<=0){const a=Math.atan2(target.m.position.x-S.pos.x,target.m.position.z-S.pos.z)-S.face;out.head[1]=clamp(Math.atan2(Math.sin(a),Math.cos(a)),-.8,.8)}
  if(CINE.on&&CINE.pose){for(const k in CINE.pose)out[k]=CINE.pose[k].slice()}
  let stiff=1;
  if(S.over>0){for(const k in POSE.over)out[k]=POSE.over[k].slice();stiff=.6}
  else if(S.act){const A=ACT[S.act];const {pose,stiff:st}=keyAt(A,S.actT);stiff=st;
    const fade=S.act==="shoot"?1:clamp((A.dur-S.actT)/.12,0,1);
    for(const k in pose){const o=out[k];o[0]=lerp(o[0],pose[k][0],fade);o[1]=lerp(o[1],pose[k][1],fade);o[2]=lerp(o[2],pose[k][2],fade)}
  }
  // aim: point the rifle arm at the real target (elevation + remaining bearing), not a canned pose
  if(S.aimT>0&&S.aimPt&&S.over<=0&&!(S.act&&S.act!=="shoot")){
    const d=S.aimPt.clone().sub(S.pos);d.y-=1.35*M_SCALE/4.8;const c=Math.cos(-S.face),s=Math.sin(-S.face);
    const lx=d.x*c+d.z*s,lz=-d.x*s+d.z*c,el=Math.atan2(d.y,Math.hypot(lx,lz)),b=Math.atan2(lx,lz);
    const w=Math.min(1,S.aimT/.15);const set=(k,v)=>{const o=out[k];o[0]=lerp(o[0],v[0],w);o[1]=lerp(o[1],v[1],w);o[2]=lerp(o[2],v[2],w)};
    set("torso",[.05-el*.15,clamp(b,-.7,.4),0]);set("head",[-el*.5,clamp(b*.6,-.6,.4),0]);
    set("armR",[clamp(-1.52-el*.95,-2.35,-.6),0,.06+clamp(-(b+.28)*.5,-.4,.4)]);set("foreR",[-.04,0,0]);
    // recoil: the shot leaves ~70 ms in; the gun arm kicks up, shoulder and torso rock back
    if(S.act==="shoot"){const r=Math.max(0,1-Math.abs(S.actT-.085)/.07);if(r>0){out.armR[0]-=.38*r;out.foreR[0]-=.35*r;out.torso[0]-=.12*r;out.torso[1]-=.1*r;if(r>.9)BODY.kick=1}}}
  for(const k in out){const l=LIM[k];if(l)for(let a=0;a<3;a++)out[k][a]=clamp(out[k][a],l[a][0],l[a][1])}
  // integrate springs (sub-stepped)
  const steps=dt>0?Math.ceil(dt/.006):0,h=dt/(steps||1);
  for(const k in SP){const s=SP[k],t=out[k]||[0,0,0];const kk=s.k*stiff*(k.startsWith("arm")||k.startsWith("fore")?1:Math.sqrt(stiff)),c=2*Math.sqrt(kk)*s.z;
    for(let i=0;i<steps;i++)for(let a=0;a<3;a++){s.v[a]+=(kk*(t[a]-s.x[a])-c*s.v[a])*h;s.x[a]+=s.v[a]*h}
    const l=LIM[k];if(l)for(let a=0;a<3;a++){const lo=l[a][0]-.12,hi=l[a][1]+.12;if(s.x[a]<lo){s.x[a]=lo;s.v[a]=Math.max(0,s.v[a])}else if(s.x[a]>hi){s.x[a]=hi;s.v[a]=Math.min(0,s.v[a])}}
    const b=J[k];if(b){b.rotation.set(s.x[0],s.x[1],s.x[2])}}
}

/* ================= whole-body motion layer ================= */
// Limbs alone read as martial arts; mechs sell weight with the whole frame: wind up the hips, snap through
// the strike and overshoot, flip into the heavy chop, barrel-roll on dodges, kick back on shots.
const BODY={yaw:0,yv:0,pitch:0,pv:0,lift:0,lv:0,spin:null,kick:0};
function bodySpring(cur,vel,target,k,z,dt){const c=2*Math.sqrt(k)*z;vel+=(k*(target-cur)-c*vel)*dt;return [cur+vel*dt,vel]}
function bodyMotion(m,dt){if(dt<=0)return;let ty=0,tp=0,tl=0,k=140;
  if(S.act&&ACT[S.act]&&S.over<=0){const A=ACT[S.act],kt=S.actT/A.dur,s=A.strike;
    if(S.act==="slash1"||S.act==="slash2"){const sg=S.act==="slash1"?1:-1;
      if(kt<s){ty=-sg*.55*Math.min(1,kt/s*1.6);tp=-.06}else{ty=sg*.7*Math.exp(-(kt-s)*5);tp=.12*Math.exp(-(kt-s)*6);k=420}}
    else if(S.act==="slash3"){if(kt<s){tp=-.45*Math.min(1,kt/s*1.4);tl=.9*Math.min(1,kt/s*1.4)}else{tp=.85*Math.exp(-(kt-s)*3.2);tl=-.5*Math.exp(-(kt-s)*4);k=520}}
    else if(S.act==="lunge"){tp=.35;k=300}}
  // boost dash: lean into the flight line
  if(S.boostLean)tp+=S.boostLean*.22;
  [BODY.yaw,BODY.yv]=bodySpring(BODY.yaw,BODY.yv,ty,k,.45,dt);[BODY.pitch,BODY.pv]=bodySpring(BODY.pitch,BODY.pv,tp,k,.5,dt);[BODY.lift,BODY.lv]=bodySpring(BODY.lift,BODY.lv,tl,k*.6,.6,dt);
  BODY.kick=Math.max(0,BODY.kick-dt*6);
  m.rotation.y+=BODY.yaw;m.rotation.x+=BODY.pitch-BODY.kick*.12;m.position.y+=BODY.lift;
  // dodge barrel roll / flip (full turn, eased)
  const sp=BODY.spin;if(sp){sp.t+=dt;const u=Math.min(1,sp.t/sp.dur),e=u*u*(3-2*u);if(sp.axis==="z")m.rotation.z+=sp.sign*e*Math.PI*2;else m.rotation.x+=sp.sign*e*Math.PI*2;
    if(u>=1)BODY.spin=null}}
function bodyDodge(dir){const l=dir.clone().applyAxisAngle(new V3(0,1,0),-S.face);
  if(Math.abs(l.x)>=Math.abs(l.z))BODY.spin={axis:"z",sign:l.x>0?-1:1,t:0,dur:.42};else BODY.spin={axis:"x",sign:l.z>0?1:-1,t:0,dur:.48}}
