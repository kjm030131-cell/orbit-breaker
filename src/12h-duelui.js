/* ================= showdown lobby flow (10/28): 1 name + mode → 2 create / join / practice → 3 room ================= */
// One question per screen. The room (step 3) follows the connection: it opens when a room exists and falls back to step 2
// when the room closes (error, opponent left). Esc / 뒤로 always goes one step back.
function dxStep(n){const x=$("dx");x.dataset.step=n;for(const k of [1,2,3])$("dS"+k).hidden=k!==n;
  $("dTut").hidden=DMODE!=="vs";
  for(const b of $("dModes").children)b.classList.toggle("sel",b.dataset.dm===DMODE&&n>1);
  if(n===1)setTimeout(()=>$("dName").focus(),60);if(n===2)$("dErr1").textContent=""}
const dxInRoom=()=>!!((VS&&!VS.local)||DUEL);
function duelLeaveRoom(){if(VS)vsClose();if(DUEL&&!DUEL.started)api("duel/push",{code:DUEL.code,side:DUEL.side,score:0,state:"left"}).catch(()=>{});
  clearInterval(duelPoll);DUEL=null;duelRoomView(null);vsLobby()}
function duelBack(){const n=+$("dx").dataset.step;if(n===3){sfx("uiback");duelLeaveRoom();dxStep(2)}else if(n===2){sfx("uiback");dxStep(1)}else duelLeave()}
$("dBack").addEventListener("click",duelBack);
// Enter on the name field picks the recommended mode; Enter in the code field joins
$("dName").addEventListener("keydown",e=>{if(e.code==="Enter"){e.preventDefault();e.stopPropagation();$("dModes").querySelector('[data-dm="vs"]').click()}});
$("dName").addEventListener("input",()=>{$("dErr1").textContent=""});
$("dCode").addEventListener("keydown",e=>{if(e.code==="Enter"){e.preventDefault();e.stopPropagation();$("dJoin").click()}});
setInterval(()=>{if(SCREEN!=="duel")return;const n=+$("dx").dataset.step,room=dxInRoom();if(room&&n!==3)dxStep(3);else if(!room&&n===3)dxStep(2)},200);
