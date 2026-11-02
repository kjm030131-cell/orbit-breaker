/* ================= live presence ping (admin page only) ================= */
// Every 30 s this tab tells the server "still here" (+ which screen) so /admin can show how many people are on right now.
// Fire-and-forget: never awaited by the game, every error swallowed, nothing reads the answer, no-op on file:// / artifact builds.
(function(){
  if(!/^https?:$/.test(location.protocol)||/claude\.ai|claudeusercontent/.test(location.host))return;
  let id="";try{id=sessionStorage.getItem("ob.pid")||""}catch(e){}
  if(id.length<8){id=(Math.random().toString(36).slice(2)+Date.now().toString(36)).replace(/[^a-z0-9]/g,"").slice(0,20);try{sessionStorage.setItem("ob.pid",id)}catch(e){}}
  function mode(){try{if(typeof VST!=="undefined"&&VST.on)return "vstut";if(VS)return "vs";if(TUT.on)return "tut";
    if(SCREEN==="play"||SCREEN==="launch")return "play";if(SCREEN==="duel")return "duel";return "title"}catch(e){return "other"}}
  function send(){try{if(document.hidden)return;fetch("api/ping",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,m:mode()}),keepalive:true,cache:"no-store"}).catch(()=>{})}catch(e){}}
  setTimeout(send,4000);setInterval(send,30000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)send()});
})();
