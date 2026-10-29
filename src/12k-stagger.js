/* ================= 1:1 stagger read-out (10/29 20:00) =================
   Stagger exists only in 1:1 now (single removed it: the tutorial never taught it). When you are staggered the screen says so
   plainly: big "경직" under the reticle with the time left draining, the Shift break-out hint (or why it is unavailable),
   a pulsing red edge and the mech flashing red. When the opponent is staggered its marker says "경직 · 공격 찬스".
   Lengths come from the room server's damage event (m.stun): melee .85 s, 3rd hit 1.15 s, shot .22 s, parry .95 s, guard break 1.15 s. */
const STUN={t:0,dur:0,label:"",heavy:false,opp:0,el:null,vig:null};
function vsStunStart(dur,heavy,label){STUN.t=dur;STUN.dur=dur;STUN.heavy=!!heavy;STUN.label=label||"";
  if(dur<.3)return; /* rifle flinch: the hit marker is enough */
  sfx("deny");sfx("thud",null,heavy?1:0);const b=stunEls().el;b.classList.remove("on");void b.offsetWidth;b.classList.add("on")}
function vsOppStun(dur){STUN.opp=dur;if(dur>.3)popText("상대 경직! 지금 공격")}
function stunEls(){if(STUN.el)return STUN;
  const st=document.createElement("style");st.textContent=
   "#stunBox{position:fixed;left:50%;top:calc(44% - 196px);transform:translate(-50%,0);z-index:7;pointer-events:none;text-align:center;display:none;min-width:280px}"+
   "#stunBox.show{display:block}#stunBox b{display:block;font:900 46px/1 'Pretendard Variable',Pretendard,sans-serif;letter-spacing:.18em;color:#ff3b30;text-shadow:0 0 18px rgba(255,40,30,.7),0 2px 0 #000}"+
   "#stunBox.on b{animation:stunPop .32s ease-out}@keyframes stunPop{0%{transform:scale(1.6);opacity:0}60%{transform:scale(.94);opacity:1}100%{transform:scale(1)}}"+
   "#stunBox small{display:block;margin-top:4px;font:700 14px 'Pretendard Variable',Pretendard,sans-serif;color:#ffd0c8;letter-spacing:.04em;min-height:17px}"+
   "#stunBox i{display:block;height:6px;margin:8px auto 6px;width:260px;background:rgba(255,255,255,.12);border:1px solid rgba(255,80,60,.6)}#stunBox i u{display:block;height:100%;background:linear-gradient(90deg,#ff3b30,#ff9a3c);width:100%}"+
   "#stunBox em{display:inline-block;font:700 15px 'Pretendard Variable',Pretendard,sans-serif;font-style:normal;color:#fff;padding:4px 12px;background:rgba(10,12,16,.78);border:1px solid rgba(255,178,26,.7)}#stunBox em kbd{font:800 13px var(--f-mono,monospace);color:#111;background:#ffb21a;padding:1px 7px;margin-right:6px;border-radius:2px}"+
   "#stunBox em.off{border-color:rgba(255,255,255,.25);color:#aaa}"+
   "#stunVig{position:fixed;inset:0;z-index:5;pointer-events:none;opacity:0;box-shadow:inset 0 0 160px 40px rgba(255,20,10,.55);transition:opacity .12s}"+
   "#oppMark.stun span{color:#ff5a3c!important}#oppMark.stun::before{content:'경직 · 공격 찬스';position:absolute;left:50%;bottom:100%;transform:translate(-50%,-6px);white-space:nowrap;font:800 13px 'Pretendard Variable',Pretendard,sans-serif;color:#fff;background:#d8261c;padding:2px 8px;animation:stunBlink .3s steps(2) infinite}"+
   "@keyframes stunBlink{50%{opacity:.55}}";
  document.head.appendChild(st);
  const b=document.createElement("div");b.id="stunBox";b.innerHTML="<b>경직</b><small></small><i><u></u></i><em></em>";document.body.appendChild(b);
  const v=document.createElement("div");v.id="stunVig";document.body.appendChild(v);STUN.el=b;STUN.vig=v;return STUN}
let stunLast=performance.now();
function stunTick(){const now=performance.now(),dt=Math.min(.1,(now-stunLast)/1000);stunLast=now;requestAnimationFrame(stunTick);
  const live=!!(typeof VS!=="undefined"&&VS&&VS.phase==="fight"&&SCREEN==="play"&&!S.ended);
  STUN.opp=Math.max(0,STUN.opp-dt);const mk=$("oppMark");if(mk)mk.classList.toggle("stun",live&&STUN.opp>0);
  const on=live&&G.stagger>0&&STUN.dur>=.3;if(!STUN.el&&!on)return;const E=stunEls();
  E.el.classList.toggle("show",on);E.vig.style.opacity=on?(.55+.45*Math.abs(Math.sin(now/90))).toFixed(2):"0";if(!on)return;
  E.el.querySelector("small").textContent=(STUN.label?STUN.label+" · ":"")+G.stagger.toFixed(1)+"초";
  E.el.querySelector("u").style.width=Math.max(0,Math.min(100,G.stagger/STUN.dur*100))+"%";
  const em=E.el.querySelector("em"),can=!G.broke&&S.boost>=30;em.classList.toggle("off",!can);
  em.innerHTML=G.broke?"경직 풀기 사용함":can?"<kbd>Shift</kbd>경직 풀기 · 부스트 30":"부스트 부족 · 경직 풀기 불가"}
requestAnimationFrame(stunTick);
