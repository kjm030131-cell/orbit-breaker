/* ================= credits screen (title menu → 크레딧): a slow roll; wheel / arrows scrub, it loops ================= */
// edit the lists here; everything is plain text (escaped)
const CREDITS=[
  {h:"Development Team",rows:[["총괄 · 개발","김재민","사물인터넷학과"],["UI · UX · 연출","김상연"],["밸런싱 · 레벨 디자인 · QA · 문서","김민규"]]},
  {h:"Cast",rows:[["우리엘 1 · 주인공 파일럿","김상민"],["이클립스 CIC 오퍼레이터","최지우 중위"],["모함 이클립스 함장","이진태 대령"],["동생","김다현"]],note:"음성: ElevenLabs AI 보이스"},
  {h:"Technology",list:[["three.js r147","3D 렌더링"],["Web Audio API","사운드"],["Cloudflare Pages · D1","순위 서버"],["Durable Objects · WebSocket","1:1 대전 서버"],["GitHub Actions","빌드 · 테스트 · 배포"],["meshoptimizer","3D 모델 압축"]]},
  {h:"Open Source & Assets",list:[["three.js","MIT"],["meshoptimizer","MIT"],["Pretendard","SIL OFL 1.1"],["Saira Semi Condensed","SIL OFL 1.1"],["Kenney Sci-Fi · Impact · Interface Sounds","CC0"],["Mixamo 애니메이션","Adobe Mixamo"]]},
  {h:"Generative AI Tools",list:[["Claude","코드 · 기획 보조"],["OpenAI Codex","코드"],["ChatGPT","로고 · UI · 이펙트 · 일러스트"],["Tripo AI","3D 모델 · 리깅"],["ElevenLabs","음성 · 효과음"],["AI 음악 생성","배경음악"]]},
  {h:"Special Thanks",rows:[["2026 SCHU AI·SW Festival","운영진 여러분"],["그리고","플레이해 주신 모든 파일럿"]]}];
var CR={y:0,v:0,on:false,last:0,h:0,hold:0};
function creditsBuild(){const e=esc;let h=`<img class="crLogo" src="ui/logo_arclight.webp" alt="ARCLIGHT"><div class="crSub">2026 SCHU AI·SW Festival 게임개발 경진대회 출품작</div>`;
  for(const s of CREDITS){h+=`<section class="crSec"><h3>${e(s.h)}</h3>`;
    if(s.rows)for(const r of s.rows)h+=`<div class="crRow"><span class="crR">${e(r[0])}</span><span class="crN">${e(r[1])}${r[2]?`<small>${e(r[2])}</small>`:""}</span></div>`;
    if(s.list)h+=`<div class="crList">${s.list.map(r=>`<div>${e(r[0])}<span>${e(r[1])}</span></div>`).join("")}</div>`;
    if(s.note)h+=`<div class="crRow"><span class="crR">${e(s.note)}</span></div>`;h+="</section>"}
  h+=`<div class="crEnd"><b>THANK YOU FOR PLAYING</b><span>우리엘 1, 귀환을 환영합니다.</span></div>`;$("crRoll").innerHTML=h}
function creditsShow(on){if(typeof CR==="undefined"||!CR||on===CR.on)return;CR.on=on;if(!on)return;if(!$("crRoll").firstChild)creditsBuild();CR.y=-innerHeight*.72;CR.v=0;CR.hold=0;CR.last=performance.now();requestAnimationFrame(creditsTick)}
function creditsTick(now){if(!CR.on||SCREEN!=="credits"){CR.on=false;return}
  const dt=Math.min(.1,(now-CR.last)/1000);CR.last=now;const max=$("crRoll").offsetHeight-innerHeight*.55;
  CR.y+=(42+CR.v)*dt;CR.v*=Math.pow(.04,dt);if(CR.y<-innerHeight)CR.y=-innerHeight;
  if(CR.y>max){CR.hold+=dt;CR.y=max;if(CR.hold>4){CR.y=-innerHeight*.9;CR.hold=0}}
  $("crRoll").style.transform=`translate(-50%,${-CR.y}px)`;requestAnimationFrame(creditsTick)}
addEventListener("wheel",e=>{if(SCREEN==="credits"){CR.v+=e.deltaY*2.2;CR.hold=0}},{passive:true});
addEventListener("keydown",e=>{if(SCREEN!=="credits")return;if(e.code==="ArrowDown"||e.code==="PageDown"){CR.v+=600;e.preventDefault()}else if(e.code==="ArrowUp"||e.code==="PageUp"){CR.v-=600;e.preventDefault()}});
