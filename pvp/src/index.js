import { DurableObject } from 'cloudflare:workers';
import { Arena, newRoom, VERSION } from './arena.js';
export class PvpRoom extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;ctx.blockConcurrencyWhile(async()=>{const saved=await ctx.storage.get('arena');this.arena=new Arena(saved&&saved.version===VERSION?saved:newRoom());});}
 seats(){const out={};for(const ws of this.ctx.getWebSockets()){const side=this.ctx.getTags(ws)[0];if(side==='a'||side==='b')out[side]=ws;}return out;}
 async flush(force=false){
  const seats=this.seats();for(const {to,m} of this.arena.drain()){const payload=JSON.stringify(m);for(const [side,ws] of Object.entries(seats)){if(to&&side!==to)continue;try{ws.send(payload)}catch{}}}
  const s=this.arena.s,now=Date.now(),active=['count','fight','roundEnd'].includes(s.phase);
  // Keep simulation in memory while playing. Pose packets must not trigger storage IO.
  if(active&&!this.timer)this.timer=setInterval(()=>{this.arena.advance(Date.now());this.flush().catch(()=>{});},50);
  if(!active&&this.timer){clearInterval(this.timer);this.timer=null;}
  const next=s.phase==='count'?s.startAt:s.phase==='fight'?s.endAt:s.phase==='roundEnd'?s.nextAt:0;
  if(next!==this.nextAlarm){this.nextAlarm=next;if(next)await this.ctx.storage.setAlarm(next);else await this.ctx.storage.deleteAlarm();force=true;}
  if(force||now-(this.savedAt||0)>=1000){this.savedAt=now;await this.ctx.storage.put('arena',structuredClone(s));}
 }
 async fetch(request){
  if(request.headers.get('Upgrade')!=='websocket')return new Response('expected websocket',{status:426});const url=new URL(request.url),taken=this.seats();
  const pair=new WebSocketPair(),[client,server]=Object.values(pair);
  const reject=msg=>{this.ctx.acceptWebSocket(server,['x']);server.send(JSON.stringify({t:'error',message:msg}));server.close(4001,msg);return new Response(null,{status:101,webSocket:client});};
  if(url.searchParams.get('v')!==String(VERSION))return reject('새 버전으로 새로고침해 주세요.');
  const create=url.searchParams.get('create')==='1';
  if(create&&(taken.a||taken.b))return reject('이미 사용 중인 방 번호입니다. 다시 방을 만들어 주세요.');
  if(!create&&!taken.a)return reject('방을 찾을 수 없습니다. 방장이 먼저 방을 만들어 주세요.');
  if(!create&&(taken.b||this.arena.s.phase!=='lobby'))return reject('이미 시작했거나 가득 찬 방입니다.');
  if(create)this.arena=new Arena(newRoom());const side=create?'a':'b',name=(url.searchParams.get('name')||'pilot').slice(0,12);
  this.ctx.acceptWebSocket(server,[side]);server.send(JSON.stringify({t:'seat',side}));this.arena.join(side,name,Date.now());await this.flush(true);return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,msg){const side=this.ctx.getTags(ws)[0];if(this.seats()[side]!==ws||typeof msg!=='string'||msg.length>8192)return;let m;try{m=JSON.parse(msg)}catch{return;}if(!m||Array.isArray(m)||typeof m!=='object')return;this.arena.handle(side,m,Date.now());await this.flush(["rules","loadout","ready"].includes(m.t));}
 async alarm(){this.arena.advance(Date.now());await this.flush();}
 async webSocketClose(ws){const side=this.ctx.getTags(ws)[0];if(!['a','b'].includes(side))return;const seats=this.seats();if(seats[side]&&seats[side]!==ws)return;this.arena.s.phase='end';delete this.arena.s.players[side];this.arena.emit({t:'left'},side==='a'?'b':'a');await this.flush(true);}
 async webSocketError(ws){await this.webSocketClose(ws);}
}
export default {async fetch(request,env){const room=(new URL(request.url).searchParams.get('room')||'').replace(/\D/g,'').slice(0,4);if(room.length!==4)return new Response('room?',{status:400});return env.ROOM.get(env.ROOM.idFromName(room)).fetch(request);}};
