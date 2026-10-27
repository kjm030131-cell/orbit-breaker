import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {Arena,newRoom,VERSION} from '../pvp/src/arena.js';
test('pose hot path checkpoints at most once a second and does not reschedule alarms',async()=>{
 let now=4000,puts=0,alarms=0,intervals=0,init;
 const sockets=['a','b'].map(side=>({side,send(){}}));
 const ctx={storage:{get:async()=>null,put:async()=>{puts++;},setAlarm:async()=>{alarms++;},deleteAlarm:async()=>{}},getWebSockets:()=>sockets,getTags:ws=>[ws.side],blockConcurrencyWhile:fn=>{init=fn();}};
 let source=fs.readFileSync(new URL('../pvp/src/index.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export class PvpRoom','class PvpRoom');source=source.slice(0,source.indexOf('export default'))+'\nglobalThis.Room=PvpRoom;';
 const c=vm.createContext({DurableObject:class{},Arena,newRoom,VERSION,structuredClone,Date:{now:()=>now},setInterval:()=>{intervals++;return 1;},clearInterval(){},Response});vm.runInContext(source,c);const worker=new c.Room(ctx,{});await init;
 worker.arena.join('a','A',1000);worker.arena.join('b','B',1000);worker.arena.handle('a',{t:'ready',ready:true},1000);worker.arena.handle('b',{t:'ready',ready:true},1000);worker.arena.advance(now);await worker.flush(true);const before=puts;
 for(let i=0;i<100;i++){now=4000+i*10;await worker.webSocketMessage(sockets[i%2],JSON.stringify({t:'pose',p:[0,0,i%2?26:-26],f:0,j:[]}));}
 assert.ok(puts-before<=1,`unexpected ${puts-before} pose-triggered saves`);assert.equal(alarms,1);assert.equal(intervals,1);
});
