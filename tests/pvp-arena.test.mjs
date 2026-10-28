import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,VS_COVER} from '../pvp/src/arena.js';
function room(rules={},cover=false){const a=new Arena();a.s.noCover=!cover;a.s.hpBase=100;a.join('a','A',1000);a.join('b','B',1000);a.handle('a',{t:'rules',...rules},1000);return a;}
function start(a){a.handle('a',{t:'ready',ready:true},1000);a.handle('b',{t:'ready',ready:true},1000);a.advance(4000);a.drain();return a;}
const shot=(dir=[0,0,1])=>({t:'shot',from:[0,.4,-26],dir});
test('only host changes rules; rule edits revoke readiness',()=>{const a=room();a.handle('a',{t:'ready',ready:true},1100);a.handle('b',{t:'rules',passives:true,skills:true},1101);assert.equal(a.s.rules.skills,false);assert.equal(a.s.players.a.ready,true);a.handle('a',{t:'rules',skills:true},1102);assert.equal(a.s.rules.skills,true);assert.equal(a.s.players.a.ready,false);});
test('one ready player cannot start; both share countdown and clock',()=>{const a=room();a.handle('a',{t:'ready',ready:true},1000);a.advance(9000);assert.equal(a.s.phase,'lobby');a.handle('b',{t:'ready',ready:true},9000);assert.equal(a.s.startAt,12000);assert.equal(a.s.endAt,87000);});
test('loadout edits revoke both readiness',()=>{const a=room();a.handle('a',{t:'ready',ready:true},1000);a.handle('b',{t:'loadout',frame:'swift',unit:'pods'},1100);assert.equal(a.s.players.a.ready,false);assert.equal(a.s.players.b.frame,'swift');});
test('countdown blocks attacks, dodge and skills',()=>{const a=room({skills:true});a.handle('a',{t:'ready',ready:true},1000);a.handle('b',{t:'ready',ready:true},1000);for(const m of [shot(),{t:'swing'},{t:'dodge'},{t:'skill',dir:[0,0,1]}])a.handle('a',m,2000);assert.equal(a.s.shots.length,0);assert.equal(a.s.pending.length,0);assert.equal(a.s.players.a.boost,100);});
test('passives off equalizes frames; enabled changes max HP',()=>{for(const enabled of [false,true]){const a=room({passives:enabled});a.handle('b',{t:'loadout',frame:'swift'},1000);start(a);assert.equal(a.s.players.a.maxHp,enabled?110:100);assert.equal(a.s.players.b.maxHp,enabled?90:100);}});
test('rules and loadouts lock during fight',()=>{const a=start(room());a.handle('a',{t:'rules',passives:true,skills:true},4100);a.handle('b',{t:'loadout',frame:'swift'},4100);assert.deepEqual(a.s.rules,{passives:false,skills:false});assert.equal(a.s.players.b.frame,'mk2');});
test('fixed-direction projectile misses a strafing opponent',()=>{const a=start(room());a.handle('a',shot(),4000);a.s.players.b.p=[15,0,26];a.advance(4400);assert.equal(a.s.players.b.hp,100);});
test('projectile hits for server-defined damage; forged damage ignored',()=>{const a=start(room());a.handle('a',{...shot(),dmg:9999},4000);a.advance(4310);assert.equal(a.s.players.b.hp,92);});
test('rapid shots do not bypass cooldown',()=>{const a=start(room());a.handle('a',shot(),4000);a.handle('a',shot(),4100);assert.equal(a.s.serial,1);a.handle('a',shot(),4400);assert.equal(a.s.serial,2);});
test('remote muzzle, invalid direction and malformed vectors rejected',()=>{const a=start(room());for(const m of [{...shot(),from:[999,0,0]},shot([0,0,0]),shot([0,NaN,1]),{...shot(),from:[0]}])a.handle('a',m,4000);assert.equal(a.s.shots.length,0);});
test('melee has windup, reach and recovery; no forged hit packet',()=>{const a=start(room());a.s.players.b.p=[0,0,-20];a.handle('a',{t:'swing'},4000);a.advance(4100);assert.equal(a.s.players.b.hp,100);a.advance(4180);assert.equal(a.s.players.b.hp,76);a.handle('a',{t:'swing'},4300);assert.equal(a.s.pending.length,0);a.handle('a',{t:'hit',d:999},4400);assert.equal(a.s.players.b.hp,76);});
test('melee whiff allows escape and cannot hit beyond range',()=>{const a=start(room());a.handle('a',{t:'swing'},4000);a.advance(4200);assert.equal(a.s.players.b.hp,100);});
test('dodge is resource-gated and has cooldown',()=>{const a=start(room());a.handle('a',{t:'dodge'},4000);assert.equal(a.s.players.a.boost,80);a.handle('a',{t:'dodge'},4100);assert.equal(a.s.players.a.dodgeAt,4650);a.s.players.a.boost=0;a.handle('a',{t:'dodge'},4660);assert.equal(a.s.players.a.dodgeAt,4650);});
test('just dodge returns 15 boost, avoids hit and grants one-second counter',()=>{const a=start(room());a.handle('b',{t:'shot',from:[0,.4,-10],dir:[0,0,-1]},4000); // muzzle validation rejects far origin
 a.projectile('b',[0,.4,-10],[0,0,-1],8,170,4000);a.handle('a',{t:'dodge'},4000);assert.equal(a.s.players.a.boost,100);assert.equal(a.s.players.a.crit,5200);a.advance(4100);assert.equal(a.s.players.a.hp,100);});
test('counter buff is consumed by one melee hit',()=>{const a=start(room());a.s.players.a.crit=5000;a.s.players.b.p=[0,0,-20];a.handle('a',{t:'swing'},4000);a.advance(4180);assert.equal(a.s.players.b.hp,68);assert.equal(a.s.players.a.crit,0);});
test('disabled options block R/F and pod passive',()=>{const a=room();a.handle('b',{t:'loadout',unit:'pods'},1000);start(a);a.s.players.a.spec=100;a.handle('a',{t:'skill',dir:[0,0,1]},4000);a.handle('a',{t:'skill',dir:[0,0,1],special:true},4000);assert.equal(a.s.pending.length,0);assert.equal(a.s.players.a.spec,100);a.handle('a',shot(),4000);a.advance(4310);assert.equal(a.s.players.b.hp,92);});
for(const unit of ['mega','pods','missile','shield'])test(`enabled ${unit} R/F works and respects cooldown/charge`,()=>{const a=room({skills:true});a.handle('a',{t:'loadout',unit},1000);start(a);a.handle('a',{t:'skill',dir:[0,0,1]},4000);assert.ok(a.s.players.a.skillAt>4000);assert.ok(a.drain().some(e=>e.m.t==='skill'));a.handle('a',{t:'skill',dir:[0,0,1]},4500);assert.ok(!a.drain().some(e=>e.m.t==='skill'));a.advance(4800);a.advance(5460);a.drain();a.handle('a',{t:'skill',dir:[0,0,1],special:true},5500);assert.ok(!a.drain().some(e=>e.m.t==='skill'));a.s.players.a.spec=100;a.handle('a',{t:'skill',dir:[0,0,1],special:true},5600);assert.ok(a.drain().some(e=>e.m.t==='skill'&&e.m.special));assert.equal(a.s.players.a.spec,0);});
test('shield perfect window reflects a projectile',()=>{const a=room({skills:true});a.handle('b',{t:'loadout',unit:'shield'},1000);start(a);a.handle('b',{t:'skill',dir:[0,0,-1]},4000);a.projectile('a',[0,.4,15],[0,0,1],8,170,4000);a.advance(4100);assert.equal(a.s.players.b.hp,100);assert.ok(a.s.shots.some(b=>b.side==='b'&&b.dir[2]===-1));});
test('timeout compares fractions, not absolute HP',()=>{const a=room({passives:true});a.handle('b',{t:'loadout',frame:'swift'},1000);start(a);a.s.players.a.hp=55;a.s.players.b.hp=50;a.advance(a.s.endAt);assert.deepEqual(a.s.wins,[0,1]);});
test('equal HP ratios replay round without random winner',()=>{const a=room({passives:true});a.handle('b',{t:'loadout',frame:'swift'},1000);start(a);a.s.players.a.hp=55;a.s.players.b.hp=45;a.advance(a.s.endAt);assert.deepEqual(a.s.wins,[0,0]);assert.equal(a.s.phase,'roundEnd');a.advance(a.s.nextAt);assert.equal(a.s.round,1);assert.equal(a.s.phase,'count');});
test('two round wins end match and no attacks work afterward',()=>{const a=start(room());a.damage('b',100,[0,0,1],'melee',4000,'a');assert.deepEqual(a.s.wins,[1,0]);a.advance(a.s.nextAt);a.advance(a.s.startAt);a.damage('b',100,[0,0,1],'melee',a.s.startAt,'a');assert.equal(a.s.phase,'end');a.handle('a',shot(),a.s.startAt+1000);assert.equal(a.s.shots.length,0);});
test('serialization restores room settings and round clock',()=>{const a=start(room({skills:true,passives:true}));const b=new Arena(JSON.parse(JSON.stringify(a.s)));assert.deepEqual(b.s.rules,a.s.rules);assert.equal(b.s.endAt,a.s.endAt);});
test('teleport poses are rejected and correction sent',()=>{const a=start(room());a.handle('a',{t:'pose',p:[80,0,0],f:0,j:[]},4050);assert.deepEqual(a.s.players.a.p,[0,0,-26]);assert.ok(a.drain().some(e=>e.m.t==='position'));});
test('skill rejection reports cooldown, busy and disabled reasons',()=>{const a=start(room());a.handle('a',{t:'skill',seq:7,dir:[0,0,1]},4000);assert.ok(a.drain().some(e=>e.m.reason==='disabled'&&e.m.seq===7));const b=start(room({skills:true}));b.handle('a',{t:'swing'},4000);b.handle('a',{t:'skill',seq:8,dir:[0,0,1]},4100);assert.ok(b.drain().some(e=>e.m.reason==='busy'&&e.m.retryAt===4520));b.handle('a',{t:'skill',seq:9,dir:[0,0,1]},4850);assert.ok(b.drain().some(e=>e.m.t==='skill'&&e.m.seq===9));b.handle('a',{t:'skill',seq:10,dir:[0,0,1]},5300);assert.ok(b.drain().some(e=>e.m.reason==='cooldown'));});
test('mega beam: charges, then a sustained beam ticks along the shooter aim; off-line misses; guard takes chip',()=>{const a=start(room({skills:true}));a.s.players.b.p=[0,0,40];a.handle('a',{t:'skill',dir:[0,0,1]},4000);a.advance(4500);assert.equal(a.s.players.b.hp,100);a.advance(4700);assert.equal(a.s.players.b.hp,93);a.advance(4850);a.advance(5000);a.advance(5150);a.advance(5300);assert.equal(a.s.players.b.hp,72);a.advance(5500);assert.equal(a.s.players.b.hp,72);
 const b=start(room({skills:true}));b.s.players.b.p=[6,0,20];b.handle('a',{t:'skill',dir:[0,0,1]},4000);b.advance(4700);b.advance(4850);assert.equal(b.s.players.b.hp,100);
 const c=start(room({skills:true}));c.s.players.b.p=[0,0,20];c.s.players.b.f=Math.PI;c.handle('a',{t:'skill',dir:[0,0,1]},4000);c.handle('b',{t:'guard',on:true},4300);c.advance(4700);assert.equal(c.s.players.b.hp,99);assert.equal(c.s.players.b.gp,88);});
test('mega beam follows the aim sent on pose packets',()=>{const a=start(room({skills:true}));a.s.players.b.p=[30,0,-26];a.handle('a',{t:'skill',dir:[0,0,1]},4000);a.advance(4700);assert.equal(a.s.players.b.hp,100);a.handle('a',{t:'pose',p:[0,0,-26],f:0,j:[],a:[1,0,0]},4760);a.advance(4860);assert.equal(a.s.players.b.hp,93);});
test('mega passive: rifle hits charge the special gauge',()=>{const a=start(room({skills:true}));a.s.players.a.spec=0;a.s.players.b.p=[0,0,-14];a.projectile('a',[0,1,-24],[0,0,1],8,170,4000,0x40d8ff,true);a.advance(4100);assert.equal(a.s.players.b.hp,96);assert.ok(a.s.players.a.spec>=6);});
test('burst delivery preserves movement credit without false teleport correction',()=>{const a=start(room());for(const [time,z] of [[4200,-16],[4201,-6],[4202,4]])a.handle('a',{t:'pose',p:[0,0,z],f:0,j:[]},time);assert.equal(a.s.players.a.p[2],4);assert.ok(!a.drain().some(e=>e.m.t==='position'));});
test('raised guard blocks a frontal slash for chip damage and drains guard gauge',()=>{const a=start(room());const b=a.s.players.b;b.p=[0,0,-20];b.f=Math.PI;a.handle('b',{t:'guard',on:true},4000);a.handle('a',{t:'swing'},4300);a.advance(4480);assert.equal(b.hp,97);assert.equal(b.gp,76);assert.ok(a.drain().some(e=>e.m.t==='block'&&e.m.kind==='guard'));});
test('guard raised right before the hit parries and staggers the attacker',()=>{const a=start(room());const b=a.s.players.b;b.p=[0,0,-20];b.f=Math.PI;a.handle('a',{t:'swing'},4000);a.handle('b',{t:'guard',on:true},4100);a.advance(4180);assert.equal(b.hp,100);assert.ok(a.s.players.a.stun>=4900);assert.ok(a.drain().some(e=>e.m.t==='parry'&&e.m.side==='b'));});
test('guard from behind does not block',()=>{const a=start(room());const b=a.s.players.b;b.p=[0,0,-20];b.f=0;a.handle('b',{t:'guard',on:true},4000);a.handle('a',{t:'swing'},4300);a.advance(4480);assert.equal(b.hp,76);});
test('guard break after repeated blocked hits',()=>{const a=start(room());const b=a.s.players.b;b.p=[0,0,-20];b.f=Math.PI;a.handle('b',{t:'guard',on:true},4000);let t=4300;for(let i=0;i<5;i++){a.handle('a',{t:'swing'},t);a.advance(t+300);t+=1000;}assert.equal(b.guard,false);assert.ok(b.gbUntil>0);});
test('simultaneous swings clash without damage',()=>{const a=start(room());const B=a.s.players.b;B.p=[0,0,-20];B.f=Math.PI;a.handle('a',{t:'swing'},4000);a.handle('b',{t:'swing'},4050);a.advance(4300);assert.equal(B.hp,100);assert.equal(a.s.players.a.hp,100);assert.ok(a.drain().some(e=>e.m.t==='clash'));});
test('light hits chain into a combo (no long i-frames after a light hit)',()=>{const a=start(room());const b=a.s.players.b;b.p=[0,0,-20];a.handle('a',{t:'swing'},4000);a.advance(4180);a.handle('a',{t:'swing'},4530);a.advance(4710);assert.equal(b.hp,52);});
test('v6 melee: sidestep out of the swing cone whiffs and adds recovery',()=>{const a=start(room());a.s.players.b.p=[0,0,-20];a.handle('a',{t:'swing'},4000);a.s.players.b.p=[6,0,-21];a.advance(4180);assert.equal(a.s.players.b.hp,100);assert.ok(a.drain().some(e=>e.m.t==='whiff'&&e.m.side==='a'));assert.equal(a.s.players.a.lock,4820);
 const b=start(room());b.s.players.b.p=[0,0,-20];b.handle('a',{t:'swing'},4000);b.s.players.b.p=[2,0,-20];b.advance(4180);assert.equal(b.s.players.b.hp,76);});
test('v6 counter hit: hitting a winding-up opponent deals +30%',()=>{const a=start(room());const B=a.s.players.b;B.p=[0,0,-20];B.f=Math.PI;B.combo=1;B.lastSwing=3900;a.handle('b',{t:'swing'},4010); /* v10: A's light (lands 4290) beats B's slow heavy (lands 4310) */a.handle('a',{t:'swing'},4110);a.advance(4295);assert.equal(a.s.players.b.hp,69);assert.ok(a.drain().some(e=>e.m.t==='counter'&&e.m.side==='a'));assert.equal(a.s.players.a.hp,100);});
test('v6 read: just-dodging a swing freezes the attacker',()=>{const a=start(room());a.s.players.b.p=[0,0,-20];a.handle('b',{t:'swing'},4000);a.handle('a',{t:'dodge'},4100);assert.ok(a.drain().some(e=>e.m.t==='read'&&e.m.side==='a'));assert.ok(a.s.players.b.stun>=4650);assert.equal(a.s.players.a.crit,5300);});
test('v6 rifle falloff past 60 m',()=>{const a=start(room());a.s.players.b.p=[0,0,60];a.projectile('a',[0,.4,-26],[0,0,1],8,170,4000,0x40d8ff,true);a.advance(4600);assert.equal(a.s.players.b.hp,95);});
test('1:1 cover: map objects stop shots and cut beams short',()=>{const q=VS_COVER[0][7][0],o=[q[0],q[1],q[2]];const a=start(room({skills:true},true));
 a.s.players.a.p=[o[0],o[1],o[2]-40];a.s.players.b.p=[o[0],o[1],o[2]+40];a.projectile('a',[o[0],o[1],o[2]-30],[0,0,1],8,170,4000,0x40d8ff,true);a.advance(4300);a.advance(4600);assert.equal(a.s.players.b.hp,100);assert.equal(a.s.shots.length,0);
 a.handle('a',{t:'pose',p:[o[0],o[1]-1,o[2]-40],f:0,j:[],a:[0,0,1]},4650);a.handle('a',{t:'skill',dir:[0,0,1]},4700);for(let t=5400;t<=6000;t+=100)a.advance(t);assert.equal(a.s.players.b.hp,100);
 const b=start(room({},true));b.s.players.a.p=[0,0,-26];b.s.players.b.p=[0,0,10];b.projectile('a',[0,.4,-26],[0,0,1],8,170,4000,0x40d8ff,true);b.advance(4400);assert.equal(b.s.players.b.hp,92);});
test('v11 HP 180 by default; a staggered player breaks out with dodge once (costs 30 boost)',()=>{const a=room();delete a.s.hpBase;a.handle('a',{t:'ready',ready:true},1000);a.handle('b',{t:'ready',ready:true},1000);a.advance(4000);assert.equal(a.s.players.a.hp,180);
 a.s.players.b.p=[0,0,-20];a.handle('a',{t:'swing'},4000);a.advance(4180);assert.ok(a.s.players.b.stun>4500);a.handle('b',{t:'dodge'},4250);assert.ok(a.drain().some(e=>e.m.t==='break'&&e.m.side==='b'));assert.equal(a.s.players.b.stun,4250);assert.equal(Math.round(a.s.players.b.boost),70);
 a.s.players.b.stun=9000;a.handle('b',{t:'dodge'},4300);assert.equal(a.s.players.b.stun,9000);});
test('v8 bolt hits stagger briefly',()=>{const a=start(room());a.s.players.b.p=[0,0,-14];a.projectile('a',[0,1,-24],[0,0,1],8,170,4000,0x40d8ff,true);a.advance(4100);assert.equal(a.s.players.b.hp,96);assert.ok(a.s.players.b.stun>=4150);});
// v9 parts
test('partAt maps hit points to head / arms / body in the target frame',async()=>{const {partAt}=await import('../pvp/src/arena.js');
 const q={p:[0,0,0],f:0};assert.equal(partAt(q,[0,1.7,.3]),'head');assert.equal(partAt(q,[1.3,.5,0]),'armL');assert.equal(partAt(q,[-1.3,.5,0]),'armR');assert.equal(partAt(q,[0,0,1]),null);
 const r={p:[0,0,0],f:Math.PI};assert.equal(partAt(r,[1.3,.5,0]),'armR');assert.equal(partAt(r,[-1.3,.5,0]),'armL');});
test('head shot wears the head; destroying the weapon arm slows attacks',()=>{const a=start(room());const b=a.s.players.b;
 a.handle('a',{t:'shot',from:[0,1.8,-24],dir:[0,0,1]},4000);a.advance(4300);assert.equal(b.parts.head,30-8);assert.equal(b.hp,100-8);
 b.parts.armR=5;b.iframe=0;b.stun=0;a.handle('a',{t:'shot',from:[1.3,.5,-24],dir:[0,0,1]},5000);a.advance(5300);
 assert.equal(b.parts.armR,0);assert.ok(a.drain().some(e=>e.m.t==='part'&&e.m.side==='b'&&e.m.part==='armR'));
 b.stun=0;b.lock=0;a.handle('b',{t:'swing'},6000);assert.equal(b.lock,6000+Math.round(520*1.3));});
test('the last arm cannot be torn off; side swings hit the near arm, frontal heavy hits the head',()=>{const a=start(room());const b=a.s.players.b;
 b.parts.armR=0;b.parts.armL=3;a.s.players.a.p=[0,0,22];a.s.players.a.f=0;b.f=Math.PI/2; // b faces +x, attacker on its left (-z side)
 a.handle('a',{t:'swing'},4000);a.advance(4200);assert.equal(b.parts.armL,1);
 const c=start(room());const q=c.s.players.b;c.s.players.a.p=[0,0,20];q.p=[0,0,26];q.f=Math.PI;
 for(const t of [4000,4600,5200]){c.s.players.a.lock=0;q.iframe=0;q.stun=0;c.handle('a',{t:'swing'},t);c.advance(t+320);}
 assert.equal(q.parts.head,0);});
// v10 saber deflect
test('swinging into an incoming swing deflects it: no damage, deflected side reels and loses posture',()=>{const a=start(room());const A=a.s.players.a,B=a.s.players.b;
 A.p=[0,0,20];B.p=[0,0,26];A.f=0;B.f=Math.PI;
 a.handle('b',{t:'swing'},4000);a.drain(); // lands at 4180
 a.handle('a',{t:'swing'},4100);const ev=a.drain().map(e=>e.m.t);
 assert.ok(ev.includes('deflect'));assert.equal(a.s.pending.length,0);assert.equal(B.lock,4400);assert.equal(A.lock,4320);assert.equal(B.gp,70);
 a.advance(4300);assert.equal(A.hp,100);assert.equal(B.hp,100);});
test('deflect rally: the deflected side can deflect the follow-up; posture runs out into a guard break',()=>{const a=start(room());const A=a.s.players.a,B=a.s.players.b;
 A.p=[0,0,20];B.p=[0,0,26];A.f=0;B.f=Math.PI;
 a.handle('b',{t:'swing'},4000);a.handle('a',{t:'swing'},4100); // A deflects, B locked to 4400
 a.handle('a',{t:'swing'},4320);                                  // A follow-up lands 4500
 a.handle('b',{t:'swing'},4410);assert.equal(A.gp,70);             // B deflects back
 B.gp=20;const t=B.lock;a.handle('b',{t:'swing'},t);a.handle('a',{t:'swing'},t+100);
 const ev=a.drain().map(e=>e.m.t);assert.ok(ev.includes('guardBreak'));assert.ok(B.stun>B.lock-1);});
// v11 latency grace
test('a guard that reaches the server within half the defender ping after the hit still blocks it',()=>{const a=start(room());const A=a.s.players.a,B=a.s.players.b;
 A.p=[0,0,20];B.p=[0,0,26];A.f=0;B.f=Math.PI;a.handle('b',{t:'ping',sent:0,rtt:160},4000);
 a.handle('a',{t:'swing'},4000);a.advance(4200);assert.equal(B.hp,100); // lands 4180, judged at 4260
 a.handle('b',{t:'guard',on:true},4230);a.advance(4270);assert.equal(B.hp,100);assert.ok(a.drain().some(e=>e.m.t==='parry'));}); // guard right at the hit on B's screen = parry
test('no ping reported = no grace (judged on landing)',()=>{const a=start(room());const B=a.s.players.b;a.s.players.a.p=[0,0,20];B.p=[0,0,26];B.f=Math.PI;
 a.handle('a',{t:'swing'},4000);a.advance(4190);assert.equal(B.hp,76);});
test('a swing that arrives just before the recovery ends is queued to the end of it, not dropped',()=>{const a=start(room());const A=a.s.players.a;a.s.players.b.p=[0,0,-20];
 a.handle('a',{t:'swing'},4000);assert.equal(A.lock,4520);a.handle('a',{t:'swing'},4450);const m=a.s.pending.find(x=>x.side==='a'&&x.t0===4520);assert.ok(m);assert.equal(m.at,4700);
 a.handle('a',{t:'swing'},4600);assert.equal(a.s.pending.filter(x=>x.side==='a').length,1);});
// v12 melee pays off
test('rifle: 4 inside 14 m, 8 mid range; boosting straight at the shooter takes 40% less',()=>{const a=start(room());const B=a.s.players.b;
 a.handle('a',{t:'shot',from:[0,.4,-24],dir:[0,0,1]},4000);a.advance(4400);assert.equal(B.hp,92);
 B.iframe=0;B.stun=0;B.boosting=true;B.poseAt=4700;B.v=[0,0,-80];a.handle('a',{t:'shot',from:[0,.4,-24],dir:[0,0,1]},4410);a.advance(4800);assert.equal(B.hp,92-5);
 B.iframe=0;B.stun=0;B.boosting=false;B.p=[0,0,-14];a.handle('a',{t:'shot',from:[0,.4,-24],dir:[0,0,1]},4900);a.advance(5000);assert.equal(B.hp,87-4);});
test('melee: light 24, heavy 38',()=>{const a=start(room());const B=a.s.players.b;a.s.players.a.p=[0,0,20];B.p=[0,0,26];B.f=Math.PI;
 for(const t of [4000,4600,5200]){a.s.players.a.lock=0;B.iframe=0;B.stun=0;a.handle('a',{t:'swing'},t);a.advance(t+320);}assert.equal(B.hp,100-24-24-38);});
