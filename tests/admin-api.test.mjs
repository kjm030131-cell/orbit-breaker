// Admin API against an in-memory SQLite that mimics the D1 interface (skipped where node:sqlite is unavailable)
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
let sqlite=null;try{sqlite=await import('node:sqlite')}catch(e){}
const T=sqlite?test:test.skip;

function d1(){
  const db=new sqlite.DatabaseSync(':memory:');
  db.exec(fs.readFileSync(new URL('../deploy/schema.sql',import.meta.url),'utf8'));
  const stmt=(sql,args=[])=>({sql,args,bind:(...a)=>stmt(sql,a),
    first:async()=>{const r=db.prepare(sql).get(...args);return r===undefined?null:{...r}},
    all:async()=>({results:db.prepare(sql).all(...args).map(r=>({...r}))}),
    run:async()=>{const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}});
  return {db,prepare:sql=>stmt(sql),batch:async ss=>{db.exec('BEGIN');try{const out=[];for(const s of ss)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
}
const {onRequest}=sqlite?await import('../server/api.js'):{};
function client(DB,key='letmein'){
  const env={DB,ADMIN_KEY:'letmein'};
  const call=async(method,path,body,hdrKey=key)=>{
    const url='https://x/api/'+path;const headers={'content-type':'application/json'};if(hdrKey!==null)headers['x-admin-key']=hdrKey;
    const request=new Request(url,{method,headers,body:body?JSON.stringify(body):undefined});
    const r=await onRequest({request,env,params:{route:url.split('/api/')[1].split('?')[0].split('/')}});return {status:r.status,j:await r.json()}};
  return call;
}
// play a sortie through the public API; started is back-dated so the run is accepted
async function play(DB,call,sid,name,score){
  const s=await call('POST','start',{sid,name,dept:'사물인터넷학과'},null);if(s.status!==200)return s;
  DB.db.prepare('UPDATE runs SET started=? WHERE id=?').run(Date.now()-60000,s.j.runId);
  return call('POST','finish',{runId:s.j.runId,score,kills:5,chain:2,combo:3},null);
}

T('admin needs the right key (and a configured key)',async()=>{
  const DB=d1(),call=client(DB);
  assert.equal((await call('GET','admin/overview',null,'wrong')).status,401);
  assert.equal((await call('GET','admin/overview',null,null)).status,401);
  const r=await onRequest({request:new Request('https://x/api/admin/overview',{headers:{'x-admin-key':'a'}}),env:{DB},params:{route:['admin','overview']}});
  assert.equal(r.status,503);
  assert.equal((await call('GET','admin/overview')).status,200);
});

T('deleting a single run recomputes best, optionally refunds the sortie, and can be restored',async()=>{
  const DB=d1(),call=client(DB);
  await play(DB,call,'20260001','가',1000);await play(DB,call,'20260001','가',5000);await play(DB,call,'20260001','가',3000);
  assert.equal((await play(DB,call,'20260001','가',9999)).status,403); // 4th sortie refused
  let o=(await call('GET','admin/overview')).j;assert.equal(o.players[0].best,5000);assert.equal(o.players[0].attempts,3);assert.equal(o.players[0].runs,3);
  const runs=(await call('GET','admin/runs?sid=20260001')).j.runs;assert.equal(runs.length,3);
  const top=runs.find(r=>r.score===5000);
  assert.equal((await call('POST','admin/run/delete',{id:top.id,refund:true})).status,200);
  o=(await call('GET','admin/overview')).j;assert.equal(o.players[0].best,3000);assert.equal(o.players[0].attempts,2);
  const board=(await onRequest({request:new Request('https://x/api/board'),env:{DB},params:{route:['board']}}));assert.equal((await board.json()).rows[0].best,3000);
  const bk=(await call('GET','admin/backups')).j.backups;assert.equal(bk[0].kind,'run');
  assert.equal((await call('POST','admin/restore',{id:bk[0].id})).status,200);
  o=(await call('GET','admin/overview')).j;assert.equal(o.players[0].best,5000);assert.equal(o.players[0].attempts,3);assert.equal(o.players[0].runs,3);
});

T('delete without refund keeps the sortie used; deleting the only scoring run drops the player off the board',async()=>{
  const DB=d1(),call=client(DB);
  await play(DB,call,'20260002','나',700);
  const id=(await call('GET','admin/runs?sid=20260002')).j.runs[0].id;
  await call('POST','admin/run/delete',{id,refund:false});
  const o=(await call('GET','admin/overview')).j;assert.equal(o.players[0].best,0);assert.equal(o.players[0].attempts,1);assert.equal(o.players[0].rank,null);
  const b=await (await onRequest({request:new Request('https://x/api/board'),env:{DB},params:{route:['board']}})).json();assert.equal(b.rows.length,0);
});

T('player delete, refund, full reset (with confirm) and restore',async()=>{
  const DB=d1(),call=client(DB);
  await play(DB,call,'20260003','다',100);await play(DB,call,'20260004','라',200);await play(DB,call,'99990001','테스트',50);
  assert.equal((await call('POST','admin/player/delete',{sid:'99990001'})).status,200);
  let o=(await call('GET','admin/overview')).j;assert.equal(o.players.length,2);assert.deepEqual(o.players.map(p=>p.rank),[1,2]);
  await call('POST','admin/player/refund',{sid:'20260003'});
  o=(await call('GET','admin/overview')).j;assert.equal(o.players.find(p=>p.sid==='20260003').attempts,0);
  assert.equal((await call('POST','admin/reset',{confirm:'아니'})).status,400);
  const r=await call('POST','admin/reset',{confirm:'초기화'});assert.equal(r.status,200);assert.equal(r.j.players,2);
  o=(await call('GET','admin/overview')).j;assert.equal(o.players.length,0);assert.equal(o.stats.runs,0);
  // someone plays after the reset, then the reset is undone: the new record stays, old ones come back
  await play(DB,call,'20260005','마',300);
  const bk=(await call('GET','admin/backups')).j.backups.find(b=>b.kind==='reset');
  await call('POST','admin/restore',{id:bk.id});
  o=(await call('GET','admin/overview')).j;assert.deepEqual(o.players.map(p=>p.sid),['20260005','20260004','20260003']);
});

T('closing the event blocks new sorties; reopening allows them',async()=>{
  const DB=d1(),call=client(DB);
  await call('POST','admin/close',{closed:true});
  assert.equal((await call('GET','admin/overview')).j.closed,true);
  const s=await call('POST','start',{sid:'20260006',name:'바',dept:'학과'},null);assert.equal(s.status,403);
  await call('POST','admin/close',{closed:false});
  assert.equal((await play(DB,call,'20260006','바',10)).status,200);
});
