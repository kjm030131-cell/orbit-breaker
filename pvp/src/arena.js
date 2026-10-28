// Pure room simulation. Server owns rules, readiness, resources, attacks, HP and rounds.
export const VERSION=6;
export const ROUND_MS=75000,MELEE_CONE=.8,WHIFF_MS=300,READ_MS=550,COUNTER_K=1.3,CRIT_K=1.35,FAR_M=60,FAR_DMG=5;
const other=s=>s==='a'?'b':'a';const f0=p=>[Math.sin(p.f),0,Math.cos(p.f)];
const len=v=>Math.hypot(...v),sub=(a,b)=>a.map((x,i)=>x-b[i]),add=(a,b,k=1)=>a.map((x,i)=>x+b[i]*k),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const norm=v=>{const l=len(v);return l>0?v.map(x=>x/l):[0,0,1]};
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const segment=(p,a,b)=>{const d=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),d)/(dot(d,d)||1)));return len(sub(p,add(a,d,t)))};
const player=(name,side,now)=>({name,frame:'mk2',unit:'mega',ready:false,p:[0,0,side==='a'?-26:26],f:side==='a'?0:Math.PI,hp:100,maxHp:100,boost:100,heat:0,overUntil:0,spec:0,at:now,poseAt:now,moveCredit:8,lock:0,stun:0,iframe:0,dodgeAt:0,crit:0,skillAt:0,guardAt:0,podAt:0,barrier:0,reflect:0,armor:false,boosting:false,guard:false,guardOn:0,gp:100,gpHit:0,gbUntil:0});
export function newRoom(){return {version:VERSION,phase:'lobby',rules:{passives:false,skills:false},players:{},wins:[0,0],round:0,serial:0,shots:[],pending:[],at:0,startAt:0,endAt:0,nextAt:0};}
export class Arena {
 constructor(state=newRoom()){this.s=state;this.events=[];}
 emit(m,to){this.events.push({to,m});}
 drain(){return this.events.splice(0);}
 join(side,name,now){this.s.players[side]=player(name,side,now);this.lobby(now);}
 lobby(now){const s=this.s;this.emit({t:'lobby',rules:s.rules,players:Object.fromEntries(Object.entries(s.players).map(([k,p])=>[k,{name:p.name,frame:p.frame,unit:p.unit,ready:p.ready}])),now,phase:s.phase});}
 resetReady(){for(const p of Object.values(this.s.players))p.ready=false;}
 status(){const s=this.s;this.emit({t:'state',now:s.at,round:s.round,players:Object.fromEntries(Object.entries(s.players).map(([k,p])=>[k,{hp:p.hp,maxHp:p.maxHp,boost:p.boost,spec:p.spec,heat:p.heat,skillAt:p.skillAt,crit:p.crit,barrier:p.barrier,armor:p.armor,gp:Math.round(p.gp),guard:p.guard,gb:p.gbUntil}]))});}
 start(now,replay=false){const s=this.s;if(!s.players.a||!s.players.b)return;if(!replay)s.round++;s.phase='count';s.startAt=now+3000;s.endAt=s.startAt+ROUND_MS;s.shots=[];s.pending=[];
  for(const [side,p] of Object.entries(s.players)){const {name,frame,unit}=p;Object.assign(p,player(name,side,s.startAt),{frame,unit,ready:true});p.maxHp=s.rules.passives?(frame==='swift'?90:110):100;p.hp=p.maxHp;}
  this.emit({t:'roundStart',round:s.round,startAt:s.startAt,endAt:s.endAt,now,rules:s.rules,wins:s.wins,players:s.players});
 }
 end(w,why,now){const s=this.s;if(!['fight','count'].includes(s.phase))return;if(w!==null)s.wins[w==='a'?0:1]++;s.phase='roundEnd';s.nextAt=now+2800;s.shots=[];s.pending=[];const done=s.wins.some(n=>n>=2);this.emit({t:'roundEnd',winner:w,why,wins:s.wins,done,now});s.replay=w===null;if(done)s.phase='end';}
 damage(side,d,dir,kind,now,source,heavy=false){const s=this.s,p=s.players[side];if(!p||p.hp<=0||now<p.iframe)return false;
  if(p.armor){p.armor=false;this.emit({t:'block',side,kind:'armor'});return false;}
  if(now<p.barrier)d=Math.max(1,Math.round(d*.4));p.hp=Math.max(0,p.hp-d);if(kind==='chip'){p.stun=Math.max(p.stun,now+140);}else{p.iframe=now+(kind==='melee'?(heavy?800:60):120);p.stun=now+(kind==='melee'?(heavy?900:650):80);p.guard=false;}p.spec=Math.min(100,p.spec+d*.3);
  if(source&&s.players[source])s.players[source].spec=Math.min(100,s.players[source].spec+d*.6);
  s.pending=s.pending.filter(x=>x.side!==side||x.kind==='pulse');this.emit({t:'damage',side,d,dir,kind,hp:p.hp,heavy});this.status();if(p.hp<=0)this.end(other(side),'ko',now);return true;
 }
 advance(now){const s=this.s;s.at=now;if(s.phase==='roundEnd'){if(now>=s.nextAt)this.start(now,s.replay);return;}if(s.phase==='count'&&now>=s.startAt)s.phase='fight';if(s.phase!=='fight')return;
  for(const p of Object.values(s.players)){const dt=Math.max(0,Math.min(1,(now-p.at)/1000));p.at=now;const regen=22*(s.rules.passives&&p.frame==='swift'?1.1:1);p.boost=Math.max(0,Math.min(100,p.boost+(p.boosting&&now-p.poseAt<250?-38:regen)*dt));p.heat=Math.max(0,p.heat-(now<p.overUntil?30:14)*dt);if(p.overUntil&&now>=p.overUntil){p.overUntil=0;p.heat=40;}if(s.rules.skills)p.spec=Math.min(100,p.spec+5*dt);if(!p.guard&&now-p.gpHit>800)p.gp=Math.min(100,p.gp+30*dt);}
  for(const x of [...s.pending]){if(now<x.at||s.phase!=='fight'||!s.pending.includes(x))continue;s.pending=s.pending.filter(y=>y!==x);const p=s.players[x.side],q=s.players[other(x.side)];if(!p||!q)continue;
   if(x.kind==='volley'){this.projectile(x.side,x.from,x.dir,x.dmg,x.speed,now,x.color);continue;}
   const d=sub(q.p,p.p),dist=len(d),f=[Math.sin(p.f),0,Math.cos(p.f)];
   if(x.kind==='beam'){const from=add(p.p,[0,1,0]);this.emit({t:'beam',side:x.side,from,dir:x.dir,heavy:!!x.heavy});
    if(segment(add(q.p,[0,.4,0]),from,add(from,x.dir,x.range))<x.width){
     if(q.guard&&dot([Math.sin(q.f),0,Math.cos(q.f)],x.dir.map(v=>-v))>.3){q.gp-=x.heavy?70:40;q.gpHit=now;const chip=Math.max(1,Math.round(x.dmg*.12));
      if(q.gp<=0){q.gp=0;q.guard=false;q.gbUntil=now+1600;this.emit({t:'guardBreak',side:other(x.side)});this.damage(other(x.side),chip,x.dir,'chip',now,x.side);q.stun=now+900;}
      else{this.emit({t:'block',side:other(x.side),kind:'guardShot',gp:Math.round(q.gp),at:q.p});this.damage(other(x.side),chip,x.dir,'chip',now,x.side);}}
     else this.damage(other(x.side),x.dmg,x.dir,'skill',now,x.side,!!x.heavy);}
    continue;}
   if(x.kind==='melee'){
    // blades meet: both swings land within 150 ms of each other in reach -> clash, nobody is hurt
    const y=s.pending.find(z=>z.side===other(x.side)&&z.kind==='melee'&&Math.abs(z.at-x.at)<=150);
    if(y&&dist<=Math.max(x.range,y.range)+1.5){s.pending=s.pending.filter(z=>z!==y);p.lock=Math.max(p.lock,now+450);q.lock=Math.max(q.lock,now+450);p.combo=q.combo=0;this.emit({t:'clash',side:x.side,at:add(p.p,d,.5)});continue;}
    const facing=dot([Math.sin(q.f),0,Math.cos(q.f)],norm(sub(p.p,q.p)))>.2;
    if(dist<=x.range&&dot(norm(d),x.dir||f)>0&&q.guard&&facing){
     if(now-q.guardOn<=180){ // parry: guard raised right before the hit
      s.pending=s.pending.filter(z=>z.side!==x.side);p.stun=now+750;p.lock=now+750;p.combo=0;q.crit=now+1200;q.lock=0;this.emit({t:'parry',side:other(x.side)});this.status();continue;}
     q.gp-=x.heavy?50:24;q.gpHit=now;p.lock=Math.max(p.lock,now+(x.heavy?260:160));const chip=Math.max(1,Math.round(x.dmg*.12));
     if(q.gp<=0){q.gp=0;q.guard=false;q.gbUntil=now+1600;this.emit({t:'guardBreak',side:other(x.side)});this.damage(other(x.side),chip,norm(d),'chip',now,x.side);q.stun=now+900;}
     else{this.emit({t:'block',side:other(x.side),kind:'guard',gp:Math.round(q.gp),heavy:!!x.heavy});this.damage(other(x.side),chip,norm(d),'chip',now,x.side);}
     continue;}
   }
   const inRange=dist<=x.range;
   // melee only connects inside a ~37 deg cone of the swing direction: a sidestep at the right moment makes it whiff
   if(inRange&&(x.kind==='pulse'||dot(norm(d),x.dir||f)>(x.kind==='melee'?MELEE_CONE:0))){let dmg=x.dmg,heavy=!!x.heavy;
    if(x.kind==='melee'&&p.crit>=now){dmg=Math.round(dmg*CRIT_K);p.crit=0;}
    // counter hit: the target was still winding up its own swing
    const counter=x.kind==='melee'&&s.pending.some(z=>z.side===other(x.side)&&z.kind==='melee');if(counter){dmg=Math.round(dmg*COUNTER_K);heavy=true;}
    if(this.damage(other(x.side),dmg,norm(d),x.kind==='pulse'?'skill':'melee',now,x.side,heavy)&&counter)this.emit({t:'counter',side:x.side});}
   else if(x.kind==='melee'){p.lock=Math.max(p.lock,x.at+WHIFF_MS);this.emit({t:'whiff',side:x.side});}
  }
  for(const b of [...s.shots]){if(s.phase!=='fight')break;const q=s.players[other(b.side)];if(!q)continue;const elapsed=Math.min(2.4,(now-b.at)/1000),end=add(b.from,b.dir,elapsed*b.speed),start=b.last||b.from;b.last=end;
   if(segment(add(q.p,[0,.4,0]),start,end)<2.6){s.shots=s.shots.filter(x=>x!==b);
    if(s.rules.skills&&now<q.reflect){this.emit({t:'block',side:other(b.side),kind:'reflect'});this.projectile(other(b.side),end,b.dir.map(x=>-x),b.dmg,b.speed,now,0x8dff7a);continue;}
    if(s.rules.skills&&q.unit==='pods'&&now>=q.podAt){q.podAt=now+20000;this.emit({t:'block',side:other(b.side),kind:'pod'});continue;}
    if(q.guard&&dot([Math.sin(q.f),0,Math.cos(q.f)],b.dir.map(v=>-v))>.3){q.gp-=12;q.gpHit=now;if(q.gp<=0){q.gp=0;q.guard=false;q.gbUntil=now+1600;q.stun=now+900;this.emit({t:'guardBreak',side:other(b.side)});}else this.emit({t:'block',side:other(b.side),kind:'guardShot',gp:Math.round(q.gp),at:end});this.status();continue;}
    const far=b.rifle&&len(sub(end,b.from))>FAR_M;
    if(this.damage(other(b.side),far?Math.min(b.dmg,FAR_DMG):b.dmg,b.dir,'bolt',now,b.side)&&s.rules.skills&&b.rifle&&s.players[b.side]&&s.players[b.side].unit==='mega'){const sh=s.players[b.side];sh.spec=Math.min(100,sh.spec+6);}
   }else if(elapsed>=2.4)s.shots=s.shots.filter(x=>x!==b);
  }
  if(s.phase==='fight'&&now-(s.statusAt||0)>=100){s.statusAt=now;this.status();}
  if(s.phase==='fight'&&now>=s.endAt){const a=s.players.a,b=s.players.b,v=a.hp*b.maxHp-b.hp*a.maxHp;this.end(v===0?null:v>0?'a':'b','time',now);}
 }
 projectile(side,from,dir,dmg,speed,now,color=0x40d8ff,rifle=false){const b={id:++this.s.serial,side,from:[...from],dir:norm(dir),dmg,speed,at:now,color,rifle};this.s.shots.push(b);this.emit({t:'projectile',...b});}
 handle(side,m,now){const s=this.s,p=s.players[side];if(!p||!m||typeof m.t!=='string')return;this.advance(now);
  if(m.t==='ping'){this.emit({t:'pong',sent:m.sent,now},side);return;}
  if(s.phase==='lobby'){
   if(m.t==='rules'&&side==='a'){s.rules={passives:m.passives===true,skills:m.skills===true};this.resetReady();this.lobby(now);}
   if(m.t==='loadout'){if(['mk2','swift'].includes(m.frame))p.frame=m.frame;if(['mega','pods','missile','shield'].includes(m.unit))p.unit=m.unit;this.resetReady();this.lobby(now);}
   if(m.t==='ready'&&s.players.a&&s.players.b){p.ready=m.ready===true;this.lobby(now);if(s.players.a.ready&&s.players.b.ready)this.start(now);}
   return;
  }
  if(m.t==='pose'&&['count','fight'].includes(s.phase)&&vec(m.p)&&len(m.p)<=140&&Number.isFinite(m.f)&&Array.isArray(m.j)&&m.j.length<=90&&m.j.every(Number.isFinite)){
   const elapsed=Math.max(0,(now-p.poseAt)/1000),maxMove=Math.min(60,(p.moveCredit??8)+115*elapsed),travel=len(sub(m.p,p.p));
   if(s.phase==='fight'&&travel<=maxMove){p.p=m.p;p.moveCredit=maxMove-travel;}else if(travel>maxMove){p.moveCredit=maxMove;this.emit({t:'position',p:p.p},side);}
   p.poseAt=now;p.f=m.f;p.boosting=m.boosting===true&&p.boost>0;
   this.emit({t:'pose',p:p.p,f:p.f,j:m.j,bl:Math.max(0,Math.min(1,m.bl||0)),r:m.r===.001?.001:1,g:p.guard,v:vec(m.v)&&len(m.v)<220?m.v:[0,0,0],st:now},other(side));return;
  }
  const reject=(reason,retryAt=0)=>{if(m.t==='skill')this.emit({t:'actionRejected',action:'skill',seq:m.seq,reason,retryAt},side);};
  if(s.phase!=='fight'||now<s.startAt||now>=s.endAt){reject('phase');return;}
  const q=s.players[other(side)];if(!q)return;
  if(m.t==='guard'){if(m.on===true){if(now<p.stun||now<p.lock||now<p.gbUntil||p.guard)return;p.guard=true;p.guardOn=now;}else{if(!p.guard)return;p.guard=false;}this.emit({t:'guard',side,on:p.guard});return;}
  if(now<p.stun){reject('stagger',p.stun);return;}
  if(m.t==='skill'&&!s.rules.skills){reject('disabled');return;}

  if(['dodge','swing','shot','skill'].includes(m.t))p.guard=false;
  if(m.t==='dodge'){
   if(now<p.dodgeAt||now<p.lock||p.boost<25)return;p.boost-=25;p.dodgeAt=now+650;p.iframe=Math.max(p.iframe,now+180);
   const c=add(p.p,[0,.4,0]);const just=s.shots.some(b=>{if(b.side===side)return false;const rel=sub(c,add(b.from,b.dir,(now-b.at)/1000*b.speed)),along=dot(rel,b.dir);return along>=0&&along/b.speed<=.15&&len(sub(rel,b.dir.map(v=>v*along)))<2.4;})||s.pending.some(x=>x.side!==side&&x.kind==='melee'&&x.at-now>=0&&x.at-now<=150&&len(sub(q.p,p.p))<9);
   const readMelee=s.pending.some(x=>x.side!==side&&x.kind==='melee'&&x.at-now>=0&&x.at-now<=150&&len(sub(q.p,p.p))<9);
   if(readMelee){q.lock=Math.max(q.lock,now+READ_MS);q.stun=Math.max(q.stun,now+READ_MS);this.emit({t:'read',side});}
   if(just){p.boost=Math.min(100,p.boost+15);p.crit=now+1200;p.spec=Math.min(100,p.spec+10);if(s.rules.skills&&p.unit==='shield'&&now>=p.guardAt){p.armor=true;p.guardAt=now+25000;}}
   this.emit({t:'dodge',side,just});this.status();return;
  }
  if(now<p.lock){reject('busy',p.lock);return;}if(now<p.overUntil||p.heat>=100){reject('heat',p.overUntil);return;}
  if(m.t==='swing'){
   const combo=(p.lastSwing&&now-p.lastSwing<1300)?((p.combo||0)+1)%3:0;p.combo=combo;p.lastSwing=now;const heavy=combo===2;p.lock=now+(heavy?950:520);p.heat=Math.min(100,p.heat+(heavy?12:8));if(p.heat>=100)p.overUntil=now+1600;
   s.pending.push({side,kind:'melee',at:now+(heavy?300:180),range:heavy?11:10,dmg:heavy?22:14,heavy,dir:f0(p)});this.emit({t:'swing',side,heavy,combo});return;
  }
  if(m.t==='shot'&&vec(m.from)&&vec(m.dir)&&len(m.dir)>.9&&len(m.dir)<1.1&&len(sub(m.from,p.p))<8){p.lock=now+(s.rules.skills&&p.unit==='missile'?300:400);p.heat=Math.min(100,p.heat+4);if(p.heat>=100)p.overUntil=now+1600;this.projectile(side,m.from,m.dir,8,170,now,0x40d8ff,true);return;}
  if(m.t==='skill'&&s.rules.skills&&vec(m.dir)&&len(m.dir)>.9&&len(m.dir)<1.1){const special=m.special===true;if(special?p.spec<100:now<p.skillAt){reject(special?'charge':'cooldown',p.skillAt);return;}const cds={mega:9000,pods:8000,missile:9000,shield:10000};if(special)p.spec=0;else p.skillAt=now+cds[p.unit];p.lock=now+400;const dir=norm(m.dir),from=add(p.p,[0,1,0]);
   this.emit({t:'skill',side,unit:p.unit,special,dir,seq:m.seq});
   if(p.unit==='shield'){p.barrier=now+(special?2000:1000);p.reflect=now+250;if(special)s.pending.push({side,kind:'pulse',at:now+2000,range:12,dmg:18});}
   else if(p.unit==='mega'){s.pending.push({side,kind:'beam',at:now+(special?900:700),range:special?190:150,width:special?5:3,dmg:special?30:20,heavy:special,dir});}
   else{const n=p.unit==='pods'?(special?7:3):(special?6:3),spread=p.unit==='pods'?.065:.025;for(let i=0;i<n;i++){const a=(i-(n-1)/2)*spread,d=[dir[0]*Math.cos(a)+dir[2]*Math.sin(a),dir[1],dir[2]*Math.cos(a)-dir[0]*Math.sin(a)];s.pending.push({side,kind:'volley',at:now+i*(p.unit==='pods'?80:160),from,dir:d,dmg:p.unit==='pods'?5:7,speed:p.unit==='pods'?110:85,color:p.unit==='pods'?0x48d8ff:0xff8a40});}}
   this.status();
  }
 }
}
