/* ================= single-sortie operator voice (10/29, ElevenLabs vo/vo_opNN.mp3) =================
   Kept in its own file so other work (tutorial, units) is not touched. It only reads game state on a short timer and calls
   radio(who,txt,vo); the boss lines (op04/06/07/17) are passed directly in 10c-boss.js and the fuel lines (op27/28) in 11-loop.js.
   Subtitles are the recording script word for word. Live single sorties only: no tutorial, 1:1, score duel or title demo. */
const SOLO_WHO="이클립스 CIC · 최지우 중위";
const SOLO_VO={
  op08:"돌격 드론 접근 중입니다. 주황색은 들이받으니까 옆으로 피하세요.",
  op09:"정예 호위기 확인했습니다. 정면은 실드가 막으니 측면으로 도세요.",
  op10:"자폭 드론입니다! 붙기 전에 격추하세요. 터지면 주변까지 휩쓸립니다.",
  op11:"저격 경보! 보라색 조준선입니다, 바로 피하세요!",
  op12:"적 편대 돌격합니다! 일렬로 들어오니까 한 번에 쓸어버리세요.",
  op13:"보급 컨테이너 투하했습니다. 부수면 중력탄을 얻을 수 있습니다.",
  op14:"반응 장갑 보급입니다. 챙겨 두면 한 번은 버팁니다.",
  op15:"필살기 준비됐습니다. 아끼지 말고 쓰세요.",
  op16:"장갑 위험합니다! 무리하지 말고 빠져서 회복하세요.",
  op19:"우리엘 1, 기체 반응 소실… 회수정 보냈습니다.",
  op20:"작전 종료입니다. 귀환하세요, 우리엘 1. …지상은 오늘 역대급 유성우랍니다.",
  op21:"방위선 사수 완료. 수고하셨습니다, 우리엘 1. 귀환하세요."};
// re-recorded files keep their old name: bump the revision so caches fetch the new take
Object.assign(VO_REV,{vo_op04:2,vo_op27:2,vo_op28:2});
const SOLO_IDS=["vo_op04","vo_op06","vo_op07","vo_op17","vo_op27","vo_op28","vo_op30","vo_op31","vo_op32",...Object.keys(SOLO_VO).map(k=>"vo_"+k)];
const soloVoBusy=()=>!!(VO_A&&!VO_A.paused&&!VO_A.ended);
const SOLO={on:false,ended:false,q:null,cd:{},once:{},dead:false,form:null};
const soloLive=()=>!VS&&!DUEL&&!TUT.on&&!S.demo&&SCREEN==="play"&&S.started&&!S.ended;
// say a line now, or hold it briefly while another line is still talking (exp = seconds it may wait; urgent ones barely wait)
// cooldown / once marks are set only when the line is actually spoken, so a line that had to wait and expired can come back
function soloSpeak(o){const now=performance.now()/1000;SOLO.once[o.k]=true;if(o.cd)SOLO.cd[o.k]=now+o.cd;radio(SOLO_WHO,SOLO_VO[o.k],"vo_"+o.k)}
function soloSay(k,{exp=3,cd=0,once=false,force=false}={}){const now=performance.now()/1000;
  if(once&&SOLO.once[k])return;if(cd&&(SOLO.cd[k]||0)>now)return;const o={k,cd,until:now+exp};
  if(force||!soloVoBusy())soloSpeak(o);else{SOLO.q=(SOLO.q||[]).filter(x=>x.k!==k);SOLO.q.push(o)}}
function soloReset(){Object.assign(SOLO,{q:null,cd:{},once:{},dead:false,form:null});voPreload(SOLO_IDS)}
function soloTick(){
  // the run just ended on the result screen: closing line (a lost frame already said op19 when it blew up)
  if(SOLO.on&&S.ended&&!SOLO.ended){SOLO.ended=true;SOLO.on=false;SOLO.q=null;
    if(!VS&&!DUEL&&!TUT.on&&SCREEN==="result"&&G.lives>0&&S.time<=0)setTimeout(()=>{if(SCREEN==="result")voPlay(BOSS.dead?"vo_op20":"vo_op21")},700);return}
  if(!soloLive()){if(!S.started)SOLO.on=false;return}
  if(!SOLO.on){SOLO.on=true;SOLO.ended=false;soloReset()}
  const now=performance.now()/1000;
  // waiting lines: drop the expired ones; when the channel is free say the one closest to expiring (the most urgent)
  if(SOLO.q){SOLO.q=SOLO.q.filter(x=>x.until>=now);if(SOLO.q.length&&!soloVoBusy()){const o=SOLO.q.reduce((a,b)=>b.until<a.until?b:a);SOLO.q=SOLO.q.filter(x=>x!==o);soloSpeak(o)}}
  // frame destroyed (one frame per sortie): this is the end of the run
  if(G.dead>0&&!SOLO.dead){SOLO.dead=true;if(G.lives<=0){soloSay("op19",{force:true});return}}else if(G.dead<=0)SOLO.dead=false;
  // phase openers (the boss phase has its own line in spawnBoss)
  // (conditions, not edges: a line that could not be said yet is tried again while it still applies)
  if(G.phase===1)soloSay("op08",{exp:5,once:true});if(G.phase===2)soloSay("op09",{exp:5,once:true});
  // new enemy types / events
  let kami=false,snipe=false,crate=false,form=null;
  for(const e of enemies){if(!e.alive)continue;if(e.kami)kami=true;if(e.sniper&&e.tele>0)snipe=true;if(e.crate)crate=true;if(e.form&&e.form.wait>0&&!form)form=e.form}
  if(snipe)soloSay("op11",{exp:1.2,cd:30});
  if(form&&form!==SOLO.form){SOLO.form=form;soloSay("op12",{exp:3,cd:25})}
  if(kami)soloSay("op10",{exp:3,cd:45});
  if(crate)soloSay("op13",{exp:4,once:true});
  if(G.crates&&G.crates.some(c=>c.item==="armor"))soloSay("op14",{exp:5,once:true});
  // gauges: special full (each time it fills, not too often) / armour at or below 35 % (again only after it recovers past 60 %)
  const sp=(G.spec||0)>=100&&!(G.specT>=0);if(!sp)SOLO.once.op15=false;else soloSay("op15",{exp:4,cd:30,once:true});
  if(typeof G.hp==="number"){const r=G.hp/HP_MAX;if(r>.6)SOLO.once.op16=false;else if(r<=.35&&r>0)soloSay("op16",{exp:1.5,cd:15,once:true})}}
setInterval(()=>{try{soloTick()}catch(_){}},150);
// live single sorties: the dialogue box is docked small on the left edge (ui/radio_side.webp, see the last <style> in head2.html)
