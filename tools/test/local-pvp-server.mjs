// local stand-in for the Pages site + pvp Durable Object: static files from /tmp/obd/public, rooms on /pvp
import http from 'http';import fs from 'fs';import path from 'path';import {WebSocketServer} from 'ws';
const {Arena,newRoom,VERSION}=await import(new URL('../../pvp/src/arena.js',import.meta.url).href);
const ROOT=process.env.ROOT||'deploy/public';const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.glb':'model/gltf-binary','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d)})});
const rooms={};const wss=new WebSocketServer({noServer:true});
srv.on('upgrade',(q,sock,head)=>{const u=new URL(q.url,'http://x');if(u.pathname!=='/pvp'){sock.destroy();return}wss.handleUpgrade(q,sock,head,ws=>{
  const code=u.searchParams.get('room'),create=u.searchParams.get('create')==='1';let R=rooms[code];
  if(u.searchParams.get('v')!==String(VERSION)){ws.send(JSON.stringify({t:'error',message:'ver'}));ws.close();return}
  if(create){R=rooms[code]={arena:new Arena(newRoom()),seats:{}}}if(!R){ws.send(JSON.stringify({t:'error',message:'no room'}));ws.close();return}
  const side=create?'a':'b';R.seats[side]=ws;ws.send(JSON.stringify({t:'seat',side}));R.arena.join(side,u.searchParams.get('name')||'p',Date.now());flush(R);
  if(!R.timer)R.timer=setInterval(()=>{R.arena.advance(Date.now());flush(R)},50);
  ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch{return}R.arena.handle(side,m,Date.now());flush(R)});
  ws.on('close',()=>{delete R.seats[side]})})});
function flush(R){for(const {to,m} of R.arena.drain()){const s=JSON.stringify(m);for(const [side,ws] of Object.entries(R.seats)){if(to&&to!==side)continue;try{ws.send(s)}catch{}}}}
srv.listen(+process.env.PORT||8790,()=>console.log('listening 8790'));
