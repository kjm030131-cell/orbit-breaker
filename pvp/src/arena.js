// Pure room simulation. Server owns rules, readiness, resources, attacks, HP and rounds.
export const VERSION=3;
const other=s=>s==='a'?'b':'a';
const len=v=>Math.hypot(...v),sub=(a,b)=>a.map((x,i)=>x-b[i]),add=(a,b,k=1)=>a.map((x,i)=>x+b[i]*k),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const norm=v=>{const l=len(v);return l>0?v.map(x=>x/l):[0,0,1]};
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const segment=(p,a,b)=>{const d=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),d)/(dot(d,d)||1)));return len(sub(p,add(a,d,t)))};
const player=(name,side,now)=>({name,frame:'mk2',unit:'boost',ready:false,p:[0,0,side==='a'?-26:26],f:side==='a'?0:Math.PI,hp:100,maxHp:100,boost:100,heat:0,overUntil:0,spec:0,at:now,poseAt:now,moveCredit:8,lock:0,stun:0,iframe:0,dodgeAt:0,crit:0,skillAt:0,guardAt:0,podAt:0,barrier:0,reflect:0,armor:false,boosting:false});
export function newRoom(){return {version:VERSION,phase:'lobby',rules:{passives:false,skills:false},players:{},wins:[0,0],round:0,serial:0,shots:[],pending:[],at:0,startAt:0,endAt:0,nextAt:0};}
export class Arena {
 constructor(state=newRoom()){this.s=state;this.events=[];}
 emit(m,to){this.events.push({to,m});}
 drain(){return this.events.splice(0);}
 join(side,name,now){this.s.players[side]=player(name,side,now);this.lobby(now);}
 lobby(now){const s=this.s;this.emit({t:'lobby',rules:s.rules,players:Object.fromEntries(Object.entries(s.players).map(([k,p])=>[k,{name:p.name,frame:p.frame,unit:p.unit,ready:p.ready}])),now,phase:s.phase});}
 resetReady(){for(const p of Object.values(this.s.players))p.ready=false;}
 status(){const s=this.s;this.emit({t:'state',now:s.at,round:s.round,players:Object.fromEntries(Object.entries(s.players).map(([k,p])=>[k,{hp:p.hp,maxHp:p.maxHp,boost:p.boost,spec:p.spec,heat:p.heat,skillAt:p.skillAt,crit:p.crit,barrier:p.barrier,armor:p.armor}]))});}
 start(now,replay=false){const s=this.s;if(!s.players.a||!s.players.b)return;if(!replay)s.round++;s.phase='count';s.startAt=now+3000;s.endAt=s.startAt+99000;s.shots=[];s.pending=[];
  for(const [side,p] of Object.entries(s.players)){const {name,frame,unit}=p;Object.assign(p,player(name,side,s.startAt),{frame,unit,ready:true});p.maxHp=s.rules.passives?(frame==='swift'?90:110):100;p.hp=p.maxHp;}
  this.emit({t:'roundStart',round:s.round,startAt:s.startAt,endAt:s.endAt,now,rules:s.rules,wins:s.wins,players:s.players});
 }
 end(w,why,now){const s=this.s;if(!['fight','count'].includes(s.phase))return;if(w!==null)s.wins[w==='a'?0:1]++;s.phase='roundEnd';s.nextAt=now+2800;s.shots=[];s.pending=[];const done=s.wins.some(n=>n>=2);this.emit({t:'roundEnd',winner:w,why,wins:s.wins,done,now});s.replay=w===null;if(done)s.phase='end';}
 damage(side,d,dir,kind,now,source){const s=this.s,p=s.players[side];if(!p||p.hp<=0||now<p.iframe)return false;
  if(p.armor){p.armor=false;this.emit({t:'block',side,kind:'armor'});return false;}
  if(now<p.barrier)d=Math.max(1,Math.round(d*.4));p.hp=Math.max(0,p.hp-d);p.iframe=now+(kind==='melee'?700:120);p.stun=now+(kind==='melee'?300:80);p.spec=Math.min(100,p.spec+d*.3);
  if(source&&s.players[source])s.players[source].spec=Math.min(100,s.players[source].spec+d*.6);
  s.pending=s.pending.filter(x=>x.side!==side||x.kind==='pulse');this.emit({t:'damage',side,d,dir,kind,hp:p.hp});this.status();if(p.hp<=0)this.end(other(side),'ko',now);return true;
 }
 advance(now){const s=this.s;s.at=now;if(s.phase==='roundEnd'){if(now>=s.nextAt)this.start(now,s.replay);return;}if(s.phase==='count'&&now>=s.startAt)s.phase='fight';if(s.phase!=='fight')return;
  for(const p of Object.values(s.players)){const dt=Math.max(0,Math.min(1,(now-p.at)/1000));p.at=now;const regen=22*(s.rules.passives&&p.frame==='swift'?1.1:1)*(s.rules.skills&&p.unit==='boost'?1.3:1);p.boost=Math.max(0,Math.min(100,p.boost+(p.boosting&&now-p.poseAt<250?-38:regen)*dt));p.heat=Math.max(0,p.heat-(now<p.overUntil?30:14)*dt);if(p.overUntil&&now>=p.overUntil){p.overUntil=0;p.heat=40;}if(s.rules.skills)p.spec=Math.min(100,p.spec+5*dt);}
  for(const x of [...s.pending]){if(now<x.at||s.phase!=='fight')continue;s.pending=s.pending.filter(y=>y!==x);const p=s.players[x.side],q=s.players[other(x.side)];if(!p||!q)continue;
   if(x.kind==='volley'){this.projectile(x.side,x.from,x.dir,x.dmg,x.speed,now,x.color);continue;}
   const d=sub(q.p,p.p),dist=len(d),f=[Math.sin(p.f),0,Math.cos(p.f)];
   const inRange=x.kind==='dash'?segment(q.p,x.from,add(x.from,x.dir,23))<4:dist<=x.range;
   if(inRange&&(x.kind==='pulse'||x.kind==='dash'||dot(norm(d),x.dir||f)>.15)){let dmg=x.dmg;if(x.kind==='melee'&&p.crit>=now){dmg=Math.round(dmg*1.2);p.crit=0;}this.damage(other(x.side),dmg,norm(d),x.kind==='pulse'?'skill':'melee',now,x.side);}
  }
  for(const b of [...s.shots]){if(s.phase!=='fight')break;const q=s.players[other(b.side)];if(!q)continue;const elapsed=Math.min(2.4,(now-b.at)/1000),end=add(b.from,b.dir,elapsed*b.speed),start=b.last||b.from;b.last=end;
   if(segment(add(q.p,[0,.4,0]),start,end)<2.3){s.shots=s.shots.filter(x=>x!==b);
    if(s.rules.skills&&now<q.reflect){this.emit({t:'block',side:other(b.side),kind:'reflect'});this.projectile(other(b.side),end,b.dir.map(x=>-x),b.dmg,b.speed,now,0x8dff7a);continue;}
    if(s.rules.skills&&q.unit==='pods'&&now>=q.podAt){q.podAt=now+20000;this.emit({t:'block',side:other(b.side),kind:'pod'});continue;}
    this.damage(other(b.side),b.dmg,b.dir,'bolt',now,b.side);
   }else if(elapsed>=2.4)s.shots=s.shots.filter(x=>x!==b);
  }
  if(s.phase==='fight'&&now-(s.statusAt||0)>=100){s.statusAt=now;this.status();}
  if(s.phase==='fight'&&now>=s.endAt){const a=s.players.a,b=s.players.b,v=a.hp*b.maxHp-b.hp*a.maxHp;this.end(v===0?null:v>0?'a':'b','time',now);}
 }
 projectile(side,from,dir,dmg,speed,now,color=0x40d8ff){const b={id:++this.s.serial,side,from:[...from],dir:norm(dir),dmg,speed,at:now,color};this.s.shots.push(b);this.emit({t:'projectile',...b});}
 handle(side,m,now){const s=this.s,p=s.players[side];if(!p||!m||typeof m.t!=='string')return;this.advance(now);
  if(m.t==='ping'){this.emit({t:'pong',sent:m.sent,now},side);return;}
  if(s.phase==='lobby'){
   if(m.t==='rules'&&side==='a'){s.rules={passives:m.passives===true,skills:m.skills===true};this.resetReady();this.lobby(now);}
   if(m.t==='loadout'){if(['mk2','swift'].includes(m.frame))p.frame=m.frame;if(['boost','pods','missile','shield'].includes(m.unit))p.unit=m.unit;this.resetReady();this.lobby(now);}
   if(m.t==='ready'&&s.players.a&&s.players.b){p.ready=m.ready===true;this.lobby(now);if(s.players.a.ready&&s.players.b.ready)this.start(now);}
   return;
  }
  if(m.t==='pose'&&['count','fight'].includes(s.phase)&&vec(m.p)&&len(m.p)<=140&&Number.isFinite(m.f)&&Array.isArray(m.j)&&m.j.length<=90&&m.j.every(Number.isFinite)){
   const elapsed=Math.max(0,(now-p.poseAt)/1000),maxMove=Math.min(60,(p.moveCredit??8)+115*elapsed),travel=len(sub(m.p,p.p));
   if(s.phase==='fight'&&travel<=maxMove){p.p=m.p;p.moveCredit=maxMove-travel;}else if(travel>maxMove){p.moveCredit=maxMove;this.emit({t:'position',p:p.p},side);}
   p.poseAt=now;p.f=m.f;p.boosting=m.boosting===true&&p.boost>0;
   this.emit({t:'pose',p:p.p,f:p.f,j:m.j,bl:Math.max(0,Math.min(1,m.bl||0)),r:m.r===.001?.001:1},other(side));return;
  }
  const reject=(reason,retryAt=0)=>{if(m.t==='skill')this.emit({t:'actionRejected',action:'skill',seq:m.seq,reason,retryAt},side);};
  if(s.phase!=='fight'||now<s.startAt||now>=s.endAt){reject('phase');return;}
  const q=s.players[other(side)];if(!q)return;if(now<p.stun){reject('stagger',p.stun);return;}
  if(m.t==='skill'&&!s.rules.skills){reject('disabled');return;}

  if(m.t==='dodge'){
   if(now<p.dodgeAt||now<p.lock||p.boost<25)return;p.boost-=25;p.dodgeAt=now+650;p.iframe=Math.max(p.iframe,now+180);
   const c=add(p.p,[0,.4,0]);const just=s.shots.some(b=>{if(b.side===side)return false;const rel=sub(c,add(b.from,b.dir,(now-b.at)/1000*b.speed)),along=dot(rel,b.dir);return along>=0&&along/b.speed<=.15&&len(sub(rel,b.dir.map(v=>v*along)))<2.4;})||s.pending.some(x=>x.side!==side&&x.kind==='melee'&&x.at-now>=0&&x.at-now<=150&&len(sub(q.p,p.p))<9);
   if(just){p.boost=Math.min(100,p.boost+15);p.crit=now+1000;p.spec=Math.min(100,p.spec+10);if(s.rules.skills&&p.unit==='shield'&&now>=p.guardAt){p.armor=true;p.guardAt=now+25000;}}
   this.emit({t:'dodge',side,just});this.status();return;
  }
  if(now<p.lock){reject('busy',p.lock);return;}if(now<p.overUntil||p.heat>=100){reject('heat',p.overUntil);return;}
  if(m.t==='swing'){
   const combo=(p.lastSwing&&now-p.lastSwing<1300)?((p.combo||0)+1)%3:0;p.combo=combo;p.lastSwing=now;const heavy=combo===2;p.lock=now+(heavy?1070:combo===1?670:710);p.heat=Math.min(100,p.heat+(heavy?12:8));if(p.heat>=100)p.overUntil=now+1600;
   s.pending.push({side,kind:'melee',at:now+(heavy?300:180),range:9,dmg:heavy?22:14});this.emit({t:'swing',side,heavy});return;
  }
  if(m.t==='shot'&&vec(m.from)&&vec(m.dir)&&len(m.dir)>.9&&len(m.dir)<1.1&&len(sub(m.from,p.p))<8){p.lock=now+(s.rules.skills&&p.unit==='missile'?300:400);p.heat=Math.min(100,p.heat+4);if(p.heat>=100)p.overUntil=now+1600;this.projectile(side,m.from,m.dir,8,170,now);return;}
  if(m.t==='skill'&&s.rules.skills&&vec(m.dir)&&len(m.dir)>.9&&len(m.dir)<1.1){const special=m.special===true;if(special?p.spec<100:now<p.skillAt){reject(special?'charge':'cooldown',p.skillAt);return;}const cds={boost:7000,pods:8000,missile:9000,shield:10000};if(special)p.spec=0;else p.skillAt=now+cds[p.unit];p.lock=now+400;const dir=norm(m.dir),from=add(p.p,[0,1,0]);
   this.emit({t:'skill',side,unit:p.unit,special,dir,seq:m.seq});
   if(p.unit==='shield'){p.barrier=now+(special?2000:1000);p.reflect=now+250;if(special)s.pending.push({side,kind:'pulse',at:now+2000,range:12,dmg:18});}
   else if(p.unit==='boost'){s.pending.push({side,kind:'dash',at:now+220,from:[...p.p],range:9,dmg:special?28:18,dir});}
   else{const n=p.unit==='pods'?(special?7:3):(special?6:3),spread=p.unit==='pods'?.065:.025;for(let i=0;i<n;i++){const a=(i-(n-1)/2)*spread,d=[dir[0]*Math.cos(a)+dir[2]*Math.sin(a),dir[1],dir[2]*Math.cos(a)-dir[0]*Math.sin(a)];s.pending.push({side,kind:'volley',at:now+i*(p.unit==='pods'?80:160),from,dir:d,dmg:p.unit==='pods'?5:7,speed:p.unit==='pods'?110:85,color:p.unit==='pods'?0x48d8ff:0xff8a40});}}
   this.status();
  }
 }
}
