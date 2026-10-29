/* ================= audio engine ================= */
let AC=null;const AUD={on:true,ready:false,vol:.9};
try{AUD.on=localStorage.getItem("orbitbreaker.sound")!=="off";const v=localStorage.getItem("ob.vol");if(v!==null)AUD.vol=+v}catch(e){}
let MASTER,SFXB,MUSB,AMBB,REV,COMP,MUSLP,DUCK,NOISE,CRUSH;const LOOP={};
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();audioInit()}catch(e){AC=null}}return AC}
function audioInit(){
  const a=AC;
  COMP=a.createDynamicsCompressor();COMP.threshold.value=-14;COMP.knee.value=8;COMP.ratio.value=4;COMP.attack.value=.003;COMP.release.value=.2;
  MASTER=a.createGain();MASTER.gain.value=AUD.on?AUD.vol:0;COMP.connect(MASTER);MASTER.connect(a.destination);
  SFXB=a.createGain();SFXB.gain.value=.9;SFXB.connect(COMP);
  DUCK=a.createGain();MUSLP=a.createBiquadFilter();MUSLP.type="lowpass";MUSLP.frequency.value=18000;
  MUSB=a.createGain();MUSB.gain.value=.52;MUSB.connect(MUSLP);MUSLP.connect(DUCK);DUCK.connect(COMP);
  AMBB=a.createGain();AMBB.gain.value=.5;AMBB.connect(COMP);
  REV=a.createConvolver();const len=Math.floor(a.sampleRate*2.4),ir=a.createBuffer(2,len,a.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}
  REV.buffer=ir;const rg=a.createGain();rg.gain.value=.3;REV.connect(rg);rg.connect(COMP);
  NOISE=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const nd=NOISE.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  CRUSH=new Float32Array(1024);for(let i=0;i<1024;i++)CRUSH[i]=Math.tanh((i/511.5-1)*3.2);
  loopsInit();AUD.ready=true;loadSamples();
  if(MUS.want!==undefined){const w=MUS.want;MUS.want=undefined;music(w)}
}
function setSound(on){AUD.on=on;try{localStorage.setItem("orbitbreaker.sound",on?"on":"off")}catch(e){}
  if(AUD.ready)MASTER.gain.setTargetAtTime(on?AUD.vol:0,AC.currentTime,.05);
  document.querySelectorAll("[data-sound]").forEach(b=>{b.textContent=on?"사운드 켜짐":"사운드 꺼짐";b.setAttribute("aria-pressed",on?"true":"false")})}
function setP(p,v,tc){p.setTargetAtTime(v,AC.currentTime,tc||.05)}

/* ---- building blocks ---- */
function noiseSrc(a,t,dur){const s=a.createBufferSource();s.buffer=NOISE;s.loop=true;s.start(t,Math.random()*1.5);s.stop(t+dur+.05);return s}
function envG(a,t,atk,peak,dur){const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+atk);g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(dur,atk+.01));return g}
function osc(a,out,type,f0,f1,t,dur,peak,atk){const o=a.createOscillator(),g=envG(a,t,atk||.004,peak,dur);o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.05);return o}
function nzf(a,out,type,f0,f1,t,dur,peak,q,atk){const s=noiseSrc(a,t,dur),f=a.createBiquadFilter(),g=envG(a,t,atk||.004,peak,dur);f.type=type;f.Q.value=q||1;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);s.connect(f);f.connect(g);g.connect(out)}
function shaper(a){const w=a.createWaveShaper();w.curve=CRUSH;w.oversample="2x";return w}
function bus(pos,vol,wet){ // one sound's output: stereo position, distance falloff, reverb send
  const a=AC,g=a.createGain();let v=vol===undefined?1:vol,pan=0;
  if(pos){const d=pos.clone().sub(camera.position),dist=d.length(),r=new V3(1,0,0).applyQuaternion(camera.quaternion);
    pan=clamp(d.normalize().dot(r)*.85,-.85,.85);v*=clamp(1.15-dist/110,.18,1)}
  g.gain.value=v;let node=g;
  if(a.createStereoPanner){const p=a.createStereoPanner();p.pan.value=pan;g.connect(p);node=p}
  node.connect(SFXB);if(wet){const s=a.createGain();s.gain.value=wet;node.connect(s);s.connect(REV)}
  return g;
}
function duck(amount,time){if(!DUCK)return;const t=AC.currentTime;DUCK.gain.cancelScheduledValues(t);DUCK.gain.setValueAtTime(DUCK.gain.value,t);DUCK.gain.linearRampToValueAtTime(amount,t+.02);DUCK.gain.linearRampToValueAtTime(1,t+time)}


/* ---- recorded samples: sfx/<key>.mp3 replaces the synthesized sound when present ---- */
const SFX_KEYS=["shot","hit","ignite","slash","heavy","boom","destroyed","chain","efire","tele","block","dash","dodge","just","hurt",
  "specBurst","specReady","lock","phase","pickup","cataCharge","cataLaunch","radio","uiok","ui","uiback","deny","doors","slash2","slash3","clash","sizzle","humtex","tele","telelock","megaCharge","megaFire","megaLoop","megaEnd"];
const SAMPLES={},SAMPLE_GAIN={shot:.8,hit:.7,boom:.8,chain:.8,destroyed:.95,ui:.35,uiok:.5,uiback:.45,deny:.5,lock:.6,radio:.6,efire:.6,dash:.75,slash:.62,slash2:.62,slash3:.78,clash:.95,sizzle:.42,tele:.55,telelock:.7,dodge:.7,ignite:.7,doors:.7};
const SAMPLE_DUCK={megaFire:[.35,1.2],heavy:[.7,.25],boom:[.7,.2],destroyed:[.35,.9],specBurst:[.25,1.4],just:[.25,.9],hurt:[.5,.5],clash:[.6,.35],cataLaunch:[.4,1.2],phase:[.55,.6]};
const SAMPLE_VARY={shot:.05,hit:.07,boom:.08,slash:.04,slash2:.04,slash3:.03,sizzle:.12,clash:.04,efire:.06,chain:.05,block:.05};
function loadSamples(){const base="sfx/";if(location.protocol==="file:"||!window.GLB_BASE)return; // deploy build only
  fetch(base+"list.json",{cache:"no-cache"}).then(r=>r.ok?r.json():[]).catch(()=>[]).then(list=>{for(const k of list)if(SFX_KEYS.includes(k))fetch(base+k+".mp3",{cache:"no-cache"}).then(r=>r.ok?r.arrayBuffer():null).then(b=>b&&AC.decodeAudioData(b)).then(buf=>{if(buf)SAMPLES[k]=buf}).catch(()=>{})})}
function playSample(k,pos,arg){const a=AC,src=a.createBufferSource();src.buffer=SAMPLES[k];
  let rate=1+(Math.random()*2-1)*(SAMPLE_VARY[k]||0);if(k==="slash")rate*=1+(arg||0)*.06;src.playbackRate.value=rate;
  const o=bus(pos,SAMPLE_GAIN[k]||.85,k==="destroyed"||k==="specBurst"?.35:.15);src.connect(o);src.start(a.currentTime+.003);
  const d=SAMPLE_DUCK[k];if(d)duck(d[0],d[1])}

/* ---- one-shot effects ---- */
function sfx(k,pos,arg){const a=AC;if(!a||!AUD.ready||a.state!=="running")return;const t=a.currentTime+.005;
 if(k==="slash"){const v=["slash","slash2","slash3"][Math.min(2,arg||0)];if(SAMPLES[v]){playSample(v,pos,0);return}}
 if(k==="tele"&&arg&&SAMPLES.telelock){if(a.currentTime-(AUD.tlT||0)<.14)return;AUD.tlT=a.currentTime;playSample("telelock",pos,0);return}
 if(k==="tele"&&SAMPLES.tele&&a.currentTime-(AUD.teT||0)<.12)return;if(k==="tele")AUD.teT=a.currentTime;
 if(k==="clash"&&!SAMPLES.clash)k="block";if(k==="sizzle"&&!SAMPLES.sizzle)return;
 if(k==="megaCharge"&&!SAMPLES.megaCharge)k=SAMPLES.cataCharge?"cataCharge":"specCharge";if(k==="megaFire"&&!SAMPLES.megaFire)k="specBurst";if(k==="megaEnd"&&!SAMPLES.megaEnd)k="boom";
 if(SAMPLES[k]){playSample(k,pos,arg);return}
 switch(k){
 case "thud":{const H=arg?1:0,o=bus(pos,1,.12);osc(a,o,"sine",H?150:120,H?30:40,t,H?.34:.2,H?.8:.45);osc(a,o,"triangle",H?230:180,55,t,.09,.3);nzf(a,o,"lowpass",1100,110,t,.13,H?.55:.3,.7);break}
 case "ignite":{const o=bus(null,.8,.25);osc(a,o,"sawtooth",70,180,t,.35,.09,.02);osc(a,o,"sawtooth",71.5,182,t,.35,.07,.02);nzf(a,o,"bandpass",600,4200,t,.3,.22,2);osc(a,o,"sine",1400,2600,t,.12,.05);break}
 case "slash":{const n=arg||0,o=bus(pos,.9,.2),p=1+n*.12;nzf(a,o,"bandpass",4200*p,380,t,.26,.5,1.2,.02);osc(a,o,"sawtooth",420*p,110,t,.24,.07,.015);osc(a,o,"sine",260*p,90,t+.02,.2,.12);break}
 /* hit markers (10/29): dry, punchy "you landed it" feedback layered on the impact. Not positional, no reverb.
    hitmark  = click transient + hollow "pock" body + tight low thump + spark tick (~80 ms)
    headmark = the same, plus a sharp crack, a brighter second "pock" 28 ms later and a glassy sensor shatter (~120 ms) */
 case "hitmark":case "headmark":{const Hd=k==="headmark";if(a.currentTime-(AUD.hmT||0)<(Hd?.02:.045))break;AUD.hmT=a.currentTime;
   const o=bus(null,Hd?1:.85,0),d=shaper(a);d.connect(o);
   nzf(a,o,"highpass",5200,4200,t,.012,.42,.7,.001);
   osc(a,o,"triangle",1250,700,t,.05,.3,.001);osc(a,o,"sine",900,520,t,.06,.24,.001);
   nzf(a,o,"bandpass",1700,1300,t,.04,.38,4,.001);
   osc(a,d,"sine",190,72,t,.085,.55,.002);
   nzf(a,o,"bandpass",7200,6000,t,.03,.1,2,.001);
   if(Hd){nzf(a,o,"highpass",3200,2200,t,.045,.6,1.4,.001);const t2=t+.028;
     osc(a,o,"triangle",2100,1500,t2,.06,.24,.001);osc(a,o,"sine",3100,2600,t2,.045,.09,.001);
     nzf(a,o,"bandpass",5200,6800,t2,.09,.22,3,.002);osc(a,d,"sine",150,60,t2,.09,.4,.002);duck(.75,.15)}
   break}
 case "killmark":{if(a.currentTime-(AUD.kmT||0)<.06)break;AUD.kmT=a.currentTime; // kill confirm: crisp tick + bright two-step chime
   const o=bus(null,.8,.08);nzf(a,o,"highpass",5200,4200,t,.012,.4,.7,.001);osc(a,o,"triangle",1320,1320,t,.07,.22,.001);osc(a,o,"triangle",1980,1980,t+.055,.12,.2,.002);
   osc(a,o,"sine",2640,2640,t+.055,.1,.07,.002);break}
 case "hit":case "heavy":{const H=k==="heavy",o=bus(pos,1,H?.45:.3),d=shaper(a);d.connect(o);
   nzf(a,o,"highpass",6000,3000,t,.025,.6);
   osc(a,d,"sine",H?120:170,H?30:42,t,H?.55:.32,H?.95:.8);
   nzf(a,o,"bandpass",1800,500,t,H?.3:.18,.55,1.5);
   osc(a,o,"triangle",H?310:420,H?300:410,t,H?.7:.45,.08);osc(a,o,"triangle",H?870:1130,H?860:1120,t,H?.55:.35,.05);
   if(H){nzf(a,o,"lowpass",900,60,t,.7,.5);duck(.45,.5)}else duck(.7,.25);break}
 case "dash":{const o=bus(null,.8,.15);nzf(a,o,"bandpass",300,2600,t,.32,.35,.9,.08);osc(a,o,"sawtooth",55,90,t,.3,.05,.05);break}
 case "shot":{const o=bus(null,.75,.25),c=a.createOscillator(),m=a.createOscillator(),mg=a.createGain(),g=envG(a,t,.003,.12,.22);c.type="square";m.type="sine";
   c.frequency.setValueAtTime(2400,t);c.frequency.exponentialRampToValueAtTime(260,t+.2);m.frequency.setValueAtTime(900,t);m.frequency.exponentialRampToValueAtTime(90,t+.2);mg.gain.value=700;
   m.connect(mg);mg.connect(c.frequency);c.connect(g);g.connect(o);c.start(t);m.start(t);c.stop(t+.25);m.stop(t+.25);
   nzf(a,o,"highpass",8000,2500,t,.09,.22);osc(a,o,"sine",140,50,t,.14,.35);
   osc(a,o,"sine",95,32,t,.3,.7);nzf(a,o,"lowpass",3200,160,t,.24,.55,.8,.004);osc(a,o,"sawtooth",620,180,t+.01,.18,.06);duck(.7,.18);break}
 case "impact":{const o=bus(pos,.6,.15);nzf(a,o,"bandpass",1400,500,t,.1,.3,1.4);osc(a,o,"sine",180,55,t,.12,.3);break}
 case "boom":{const n=arg||0,o=bus(pos,1,.55),lp=a.createBiquadFilter(),d=shaper(a);lp.type="lowpass";
   const dist=pos?pos.distanceTo(camera.position):20;lp.frequency.value=clamp(9000-dist*90,700,9000);lp.connect(o);d.connect(lp);
   osc(a,d,"sine",70,24,t,1.1,1);nzf(a,lp,"lowpass",2400,120,t,1.3,.85,.7,.006);nzf(a,lp,"bandpass",900,200,t+.04,.8,.4,.8,.02);
   for(let i=0;i<10;i++)nzf(a,lp,"highpass",3000,2000,t+.05+Math.random()*.5,.02,.05+Math.random()*.25);
   duck(.55,.6);break}
 case "chain":{const n=Math.min(arg||2,8),o=bus(null,.7,.5),sc=[0,3,7,10,12,15,19,22];
   for(let i=0;i<Math.min(n,5);i++){const f=392*Math.pow(2,sc[(n+i)%8]/12);osc(a,o,"triangle",f,f,t+i*.045,.35,.09);osc(a,o,"sine",f*2,f*2,t+i*.045,.25,.04)}break}
 case "cutin":{const o=bus(null,1,.6);nzf(a,o,"bandpass",300,6000,t,.35,.35,1,.3);osc(a,o,"sawtooth",110,880,t,.4,.08,.3);
   setTimeout(()=>{if(!AUD.ready)return;const o2=bus(null,1,.6),t2=AC.currentTime;osc(a,o2,"sine",90,30,t2,.8,.9);nzf(a,o2,"lowpass",3000,100,t2,.9,.6);duck(.35,.8)},230);break}
 case "overheat":{const o=bus(null,.8,.2);for(let i=0;i<3;i++){osc(a,o,"square",880,880,t+i*.24,.1,.08);osc(a,o,"square",660,660,t+i*.24+.12,.1,.08)}nzf(a,o,"highpass",5000,3000,t,1.2,.18,.5,.05);break}
 case "cool":{const o=bus(null,.6,.1);nzf(a,o,"bandpass",4000,1500,t,.09,.15,1);break}
 case "focus":{const o=bus(null,.55,.15);osc(a,o,"square",660,660,t,.05,.06);osc(a,o,"square",1320,1320,t+.05,.07,.06);osc(a,o,"sine",2640,2640,t+.1,.12,.05);nzf(a,o,"bandpass",3000,3000,t,.06,.12,4);break}
 case "unfocus":{const o=bus(null,.45,.1);osc(a,o,"square",1320,660,t,.1,.05);break}
 case "destroyed":{const o=bus(null,1,.7),d=shaper(a);d.connect(o);osc(a,d,"sine",60,18,t,1.8,1);nzf(a,o,"lowpass",3000,60,t,2,.9,.6,.004);
   for(let i=0;i<4;i++)nzf(a,o,"bandpass",1200-i*200,180,t+.15+i*.22,.6,.45,.8,.01);osc(a,o,"sawtooth",440,40,t,1.4,.06);duck(.25,1.6);break}
 case "respawn":{const o=bus(null,.9,.5);osc(a,o,"sawtooth",110,660,t,.5,.07,.05);osc(a,o,"sine",220,880,t,.6,.1,.05);nzf(a,o,"bandpass",400,4000,t,.6,.3,.9,.1);break}
 case "lock":{const o=bus(null,.35,0);osc(a,o,"sine",1760,1760,t,.05,.06);osc(a,o,"sine",2349,2349,t+.06,.06,.05);break}
 case "tickLow":{const o=bus(null,.6,.1),f=arg<=5?1320:990;osc(a,o,"square",f,f,t,.07,.07);osc(a,o,"sine",f/2,f/2,t,.1,.08);break}
 case "tick":{const o=bus(null,.7,.3);osc(a,o,"square",880,870,t,.12,.07);osc(a,o,"sine",440,440,t,.18,.12);break}
 case "go":{const o=bus(null,1,.5);osc(a,o,"sawtooth",160,1200,t,.6,.09,.05);nzf(a,o,"bandpass",200,3000,t,.9,.4,.7,.1);osc(a,o,"sine",80,30,t+.4,.8,.8);duck(.5,.9);break}
 case "ui":{const o=bus(null,.35,0);osc(a,o,"square",1567,1560,t,.035,.035);break}
 case "uiok":{const o=bus(null,.5,.15);osc(a,o,"square",1046,1046,t,.05,.04);osc(a,o,"square",1568,1568,t+.055,.08,.04);break}
 case "uiback":{const o=bus(null,.45,.1);osc(a,o,"square",1046,784,t,.08,.035);break}
 case "deny":{const o=bus(null,.5,.05);osc(a,o,"square",220,200,t,.08,.06);osc(a,o,"square",220,200,t+.1,.12,.06);break}
 case "end":{const o=bus(null,1,.6);[523,659,784,1046].forEach((f,i)=>osc(a,o,"triangle",f,f,t+i*.09,.6,.08));osc(a,o,"sine",65,30,t,1.2,.7);nzf(a,o,"lowpass",2000,100,t,1.2,.4);break}
 case "dodge":{const o=bus(null,.8,.15);nzf(a,o,"bandpass",500,3600,t,.22,.4,.9,.02);osc(a,o,"sine",180,420,t,.18,.08);break}
 case "just":{const o=bus(null,1,.7);osc(a,o,"sine",2093,2093,t,1.1,.12,.005);osc(a,o,"sine",3136,3136,t+.03,.9,.06);nzf(a,o,"highpass",9000,4000,t,.25,.2);osc(a,o,"sine",60,30,t,.5,.6);duck(.25,.9);break}
 case "hurt":{const o=bus(null,1,.35),d=shaper(a);d.connect(o);osc(a,d,"square",220,60,t,.35,.4);nzf(a,o,"lowpass",3000,200,t,.4,.6);osc(a,o,"sawtooth",900,880,t+.05,.25,.05);duck(.5,.5);break}
 case "block":{const o=bus(pos,.9,.4);osc(a,o,"triangle",1760,1700,t,.5,.15);osc(a,o,"triangle",2637,2600,t,.4,.08);nzf(a,o,"bandpass",5000,2000,t,.12,.4,2);osc(a,o,"sine",300,150,t,.15,.3);break}
 case "phase":{const o=bus(null,.9,.6);osc(a,o,"sawtooth",110,110,t,1.4,.06,.2);osc(a,o,"sawtooth",165,165,t,1.4,.05,.2);[0,.18,.36].forEach(dt=>osc(a,o,"square",988,988,t+dt,.1,.05));osc(a,o,"sine",55,40,t,1.5,.5,.1);break}
 case "tele":{const o=bus(pos,arg?.7:.45,.05),f=arg?1480:1100;osc(a,o,"square",f,f,t,.06,.05);if(arg)osc(a,o,"square",f,f,t+.09,.06,.05);break}
 case "efire":{const o=bus(pos,.85,.3);osc(a,o,"sawtooth",900,140,t,.25,.09);nzf(a,o,"bandpass",2500,600,t,.2,.3,1.4);osc(a,o,"sine",120,50,t,.2,.25);break}
 case "radio":{const o=bus(null,.55,0);nzf(a,o,"bandpass",2400,1800,t,.09,.2,3);osc(a,o,"sine",1850,1850,t+.02,.06,.05);break}
 case "clamp":{const o=bus(null,.9,.5);osc(a,o,"square",120,60,t,.18,.25);nzf(a,o,"bandpass",1500,400,t,.22,.5,2);osc(a,o,"triangle",640,620,t+.02,.4,.06);break}
 case "doors":{const o=bus(null,.8,.5);nzf(a,o,"lowpass",300,600,t,1.6,.35,1,.3);osc(a,o,"sawtooth",48,52,t,1.6,.08,.3);osc(a,o,"square",880,880,t,.1,.04);osc(a,o,"square",880,880,t+.6,.1,.04);break}
 case "servo":{const o=bus(null,.7,.3);osc(a,o,"sawtooth",160,420,t,.35,.05,.03);nzf(a,o,"bandpass",1200,2600,t,.35,.12,4);osc(a,o,"sine",90,60,t+.3,.25,.3);break}
 case "cataCharge":{const o=bus(null,.9,.5);osc(a,o,"sawtooth",60,520,t,1.45,.08,1.2);osc(a,o,"sawtooth",61,525,t,1.45,.06,1.2);nzf(a,o,"bandpass",200,3800,t,1.45,.25,1.2,1.2);break}
 case "cataLaunch":{const o=bus(null,1,.6),d=shaper(a);d.connect(o);osc(a,d,"sine",80,25,t,1.4,1);nzf(a,o,"lowpass",5000,150,t,1.6,.9,.7);nzf(a,o,"bandpass",600,3000,t,.6,.5,.8);osc(a,o,"sawtooth",220,60,t,.8,.08);duck(.3,1.4);break}
 case "whoosh":{const o=bus(null,.9,.4);nzf(a,o,"bandpass",3000,400,t,.9,.5,.7,.05);osc(a,o,"sine",320,90,t,.8,.1,.05);break}
 case "puff":{const o=bus(pos,.35,.05);nzf(a,o,"highpass",5000,2500,t,.18,.12,.7,.01);break}
 case "specReady":{const o=bus(null,.7,.5);[659,880,1175].forEach((f,i)=>osc(a,o,"triangle",f,f,t+i*.08,.4,.07));break}
 case "specCharge":{const o=bus(null,1,.6);osc(a,o,"sawtooth",80,640,t,.55,.1,.4);osc(a,o,"sawtooth",81,650,t,.55,.08,.4);nzf(a,o,"bandpass",200,5000,t,.55,.35,1,.4);duck(.2,1.2);break}
 case "specBurst":{const o=bus(null,1,.8),d=shaper(a);d.connect(o);osc(a,d,"sine",70,22,t,1.6,1);nzf(a,o,"lowpass",8000,120,t,1.8,1,.7);osc(a,o,"sawtooth",440,55,t,1,.1);nzf(a,o,"highpass",6000,2000,t,.3,.3);duck(.2,1.6);break}
 case "throw":{const o=bus(null,.7,.2);nzf(a,o,"bandpass",800,2400,t,.18,.25,1.2);osc(a,o,"sine",300,700,t,.15,.08);break}
 case "gravOn":{const o=bus(pos,1,.6);osc(a,o,"sine",220,40,t,.9,.5);osc(a,o,"sawtooth",55,58,t,3.2,.07,.2);osc(a,o,"sawtooth",82,80,t,3.2,.05,.2);nzf(a,o,"lowpass",600,200,t,3.2,.2,1,.3);break}
 case "gravOff":{const o=bus(pos,.8,.5);osc(a,o,"sine",60,200,t,.3,.4);nzf(a,o,"bandpass",400,3000,t,.3,.3);break}
 case "supply":{const o=bus(null,.7,.4);[784,988].forEach((f,i)=>osc(a,o,"square",f,f,t+i*.13,.11,.05));nzf(a,o,"lowpass",900,200,t+.2,.6,.3);break}
 case "pickup":{const o=bus(null,.8,.5);[523,784,1046,1568].forEach((f,i)=>osc(a,o,"triangle",f,f,t+i*.05,.3,.08));break}
 case "armor":{const o=bus(null,1,.5);osc(a,o,"triangle",1320,1300,t,.6,.12);nzf(a,o,"bandpass",4000,1200,t,.25,.4,2);osc(a,o,"sine",180,90,t,.3,.4);break}
 case "pb":{const o=bus(null,.8,.6);[784,988,1175,1568].forEach((f,i)=>{osc(a,o,"triangle",f,f,t+.5+i*.07,.8,.07);osc(a,o,"sine",f*2,f*2,t+.5+i*.07,.5,.025)});break}
 }}

/* ---- continuous layers: saber hum, thrusters, cockpit drone ---- */
function loopsInit(){const a=AC;
  // beam saber hum: deep, smooth "vwoom" (detuned low sines + a softly filtered saw), slow shimmer instead of a 31 Hz buzz
  const hg=a.createGain();hg.gain.value=0;const hf=a.createBiquadFilter();hf.type="lowpass";hf.frequency.value=380;hf.Q.value=.7;
  const trem=a.createGain();trem.gain.value=1;const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=6.5;lg.gain.value=.07;lfo.connect(lg);lg.connect(trem.gain);lfo.start();
  const ho=[["triangle",55],["sine",55.7],["sawtooth",110]].map(([ty,f],i)=>{const o=a.createOscillator();o.type=ty;o.frequency.value=f;const og=a.createGain();og.gain.value=i===2?.35:1;o.connect(og);og.connect(hf);o.start();return o});
  hf.connect(trem);trem.connect(hg);hg.connect(SFXB);
  // swing: band-passed air whoosh rides on top of the hum
  const ws=a.createBufferSource();ws.buffer=NOISE;ws.loop=true;const wf=a.createBiquadFilter();wf.type="bandpass";wf.frequency.value=700;wf.Q.value=.9;const wg=a.createGain();wg.gain.value=0;
  ws.connect(wf);wf.connect(wg);wg.connect(SFXB);ws.start();
  LOOP.hum={g:hg,f:hf,o:ho,wg,wf};
  const ts=a.createBufferSource();ts.buffer=NOISE;ts.loop=true;const tf=a.createBiquadFilter();tf.type="lowpass";tf.frequency.value=500;const tg=a.createGain();tg.gain.value=0;
  const tr=a.createOscillator();tr.type="sawtooth";tr.frequency.value=38;const trf=a.createBiquadFilter();trf.type="lowpass";trf.frequency.value=120;
  ts.connect(tf);tr.connect(trf);trf.connect(tf);tf.connect(tg);tg.connect(SFXB);ts.start();tr.start();LOOP.thr={g:tg,f:tf};
  const ag=a.createGain();ag.gain.value=0;const af=a.createBiquadFilter();af.type="lowpass";af.frequency.value=220;
  [55,55.4,82.5].forEach(f=>{const o=a.createOscillator();o.type="sawtooth";o.frequency.value=f;o.connect(af);o.start()});af.connect(ag);ag.connect(AMBB);LOOP.amb={g:ag};
}
// HM-1 beam: a low detuned saw drone under band-passed noise "roar"; level set by megaLoop(k), 0 = silent
function megaLoopInit(){const a=AC;if(LOOP.mega||!a)return;const g=a.createGain();g.gain.value=0;const lp=a.createBiquadFilter();lp.type="lowpass";lp.frequency.value=900;lp.connect(g);
  const os=[41,41.6,82.3,123.7].map((f,i)=>{const o=a.createOscillator();o.type=i<2?"sawtooth":"square";o.frequency.value=f;const og=a.createGain();og.gain.value=i<2?.5:.12;o.connect(og);og.connect(lp);o.start();return o});
  const ns=a.createBufferSource();ns.buffer=NOISE;ns.loop=true;const nf=a.createBiquadFilter();nf.type="bandpass";nf.frequency.value=1400;nf.Q.value=.8;const ng=a.createGain();ng.gain.value=.9;ns.connect(nf);nf.connect(ng);ng.connect(g);ns.start();
  g.connect(SFXB);LOOP.mega={g,lp,os,nf}}
function megaLoopSample(){if(LOOP.megaS||!SAMPLES.megaLoop)return LOOP.megaS;const s=AC.createBufferSource();s.buffer=SAMPLES.megaLoop;s.loop=true;s.loopStart=.06;s.loopEnd=SAMPLES.megaLoop.duration-.06;
  const g=AC.createGain();g.gain.value=0;s.connect(g);g.connect(SFXB);s.start();return LOOP.megaS={s,g}}
function megaLoop(k){if(!AUD.ready)return;megaLoopInit();const L=LOOP.mega;if(!L)return;const R=megaLoopSample();if(R){setP(R.g.gain,k*.55,.06);setP(R.s.playbackRate,.9+k*.15,.1)}setP(L.g.gain,k*(R?.14:.32),.06);setP(L.lp.frequency,500+k*1400,.08);setP(L.nf.frequency,900+k*1500,.08);L.os.forEach((o,i)=>setP(o.frequency,[41,41.6,82.3,123.7][i]*(1+k*.18),.1))}
function audioFrame(st){if(!AUD.ready)return;
  setP(LOOP.hum.g.gain,st.hum*.13,.04);const sw=clamp(st.swing/60,0,1);
  setP(LOOP.hum.f.frequency,380+sw*520,.03);LOOP.hum.o.forEach((o,i)=>setP(o.frequency,[55,55.7,110][i]*(1+sw*.12),.04));
  if(SAMPLES.humtex&&!LOOP.tex){const s=AC.createBufferSource();s.buffer=SAMPLES.humtex;s.loop=true;s.loopStart=.06;s.loopEnd=SAMPLES.humtex.duration-.06;const g=AC.createGain();g.gain.value=0;s.connect(g);g.connect(SFXB);s.start();LOOP.tex={s,g}}
  if(LOOP.tex){setP(LOOP.tex.g.gain,st.hum*(.07+sw*.3),.04);setP(LOOP.tex.s.playbackRate,1+sw*.18,.04)}
  setP(LOOP.hum.wg.gain,st.hum*sw*.32,.02);setP(LOOP.hum.wf.frequency,600+sw*1400,.03);
  setP(LOOP.thr.g.gain,st.thrust*.2,.08);setP(LOOP.thr.f.frequency,350+st.thrust*1600,.1);
  setP(LOOP.amb.g.gain,st.amb*.05,.5);
}
function muffle(on){if(AUD.ready)setP(MUSLP.frequency,on?650:18000,.15)}

/* ---- generative score ---- */
const MUS={track:null,step:0,next:0,timer:null,bpm:80,inten:0,want:undefined};
const NOTE=n=>440*Math.pow(2,(n-69)/12);
const TITLE_CH=[[50,53,57],[46,50,53],[53,57,60],[48,52,55]]; // Dm Bb F C
const BAT_CH=[[50,53,57],[46,50,53],[48,52,55],[45,49,52]];   // Dm Bb C A
function mPad(t,notes,dur,vol){const a=AC,o=a.createGain(),f=a.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(400,t);f.frequency.linearRampToValueAtTime(1400,t+dur*.5);f.frequency.linearRampToValueAtTime(500,t+dur);
  o.gain.setValueAtTime(0,t);o.gain.linearRampToValueAtTime(vol,t+dur*.3);o.gain.linearRampToValueAtTime(0,t+dur);f.connect(o);o.connect(MUSB);const s=a.createGain();s.gain.value=.5;o.connect(s);s.connect(REV);
  notes.forEach(n=>[-6,6].forEach(dt=>{const x=a.createOscillator();x.type="sawtooth";x.frequency.value=NOTE(n);x.detune.value=dt;x.connect(f);x.start(t);x.stop(t+dur+.1)}))}
function mPluck(t,n,vol,dec){const a=AC,o=a.createOscillator(),g=a.createGain();o.type="triangle";o.frequency.value=NOTE(n);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dec);o.connect(g);g.connect(MUSB);const s=a.createGain();s.gain.value=.6;g.connect(s);s.connect(REV);o.start(t);o.stop(t+dec+.05)}
function mKick(t,vol){const a=AC,o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.32);o.connect(g);g.connect(MUSB);o.start(t);o.stop(t+.35)}
function mSnare(t,vol){const a=AC,s=a.createBufferSource();s.buffer=NOISE;const f=a.createBiquadFilter();f.type="bandpass";f.frequency.value=1900;f.Q.value=.7;const g=a.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.18);
  s.connect(f);f.connect(g);g.connect(MUSB);const r=a.createGain();r.gain.value=.4;g.connect(r);r.connect(REV);s.start(t,Math.random());s.stop(t+.2);
  const o=a.createOscillator(),og=a.createGain();o.type="triangle";o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(140,t+.08);og.gain.setValueAtTime(vol*.6,t);og.gain.exponentialRampToValueAtTime(.0001,t+.1);o.connect(og);og.connect(MUSB);o.start(t);o.stop(t+.12)}
function mHat(t,vol,open){const a=AC,s=a.createBufferSource();s.buffer=NOISE;const f=a.createBiquadFilter();f.type="highpass";f.frequency.value=7500;const g=a.createGain(),d=open?.16:.035;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(MUSB);s.start(t,Math.random());s.stop(t+d+.02)}
function mBass(t,n,dur,vol,cut){const a=AC,o=a.createOscillator(),o2=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o.type="sawtooth";o2.type="square";o.frequency.value=NOTE(n);o2.frequency.value=NOTE(n-12);
  f.type="lowpass";f.Q.value=6;f.frequency.setValueAtTime(cut,t);f.frequency.exponentialRampToValueAtTime(cut*.25,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(f);o2.connect(f);f.connect(g);g.connect(MUSB);o.start(t);o2.start(t);o.stop(t+dur+.02);o2.stop(t+dur+.02)}
function mStab(t,notes,vol){const a=AC,f=a.createBiquadFilter(),g=a.createGain();f.type="lowpass";f.frequency.setValueAtTime(3200,t);f.frequency.exponentialRampToValueAtTime(500,t+.25);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.3);
  f.connect(g);g.connect(MUSB);const s=a.createGain();s.gain.value=.5;g.connect(s);s.connect(REV);
  notes.forEach(n=>[-8,8].forEach(dt=>{const o=a.createOscillator();o.type="sawtooth";o.frequency.value=NOTE(n+12);o.detune.value=dt;o.connect(f);o.start(t);o.stop(t+.32)}))}
function schedStep(t,step){
  if(bgmOn(MUS.track))return; // a recorded track is playing instead
  const bar=Math.floor(step/16)%4,s=step%16;
  if(MUS.track==="title"){const ch=TITLE_CH[bar];
    if(s===0){mPad(t,ch,60/MUS.bpm*4,.05);mPluck(t,ch[0]-12,.08,2.2)}
    if(s%4===2){mPluck(t,[ch[0],ch[1],ch[2],ch[1]+12][(step>>2)%4]+12,.035,1.4)}
    if(s===0||s===10)mKick(t,.16);
  }else if(MUS.track==="battle"){const ch=BAT_CH[bar],I=MUS.inten;
    if(s%4===0)mKick(t,.55);if(I>0&&s===14)mKick(t,.35);
    if(s===4||s===12)mSnare(t,.32);
    mHat(t,s%2===0?.07:.035+I*.03,s===6||s===14);
    mBass(t,ch[0]-24+[0,0,12,0,0,12,0,7][s%8],60/MUS.bpm/4*.9,.16,900+I*1400);
    if(s===0||s===3||s===10)mStab(t,ch,s===0?.05:.035);
    if(I>0&&s%2===1)mPluck(t,ch[(s>>1)%3]+24,.025,.25);
    if(s===0&&bar===0&&step>0)mPad(t,ch,60/MUS.bpm*16,.025);
  }
}
/* ---- recorded BGM (bgm/*.mp3): a track listed here replaces the generative score once it has loaded;
   until then (or if loading fails, e.g. the artifact build) the generative score keeps playing ---- */
const BGM={cur:null,src:null,gain:null,tracks:{title:{url:"bgm/title.mp3",vol:.62,buf:null,loading:false},battle:{url:"bgm/battle.mp3",vol:.55,buf:null,loading:false}}};
// the mp3 bytes are fetched as soon as the page loads (before the first click unlocks audio), so decoding is the only wait
function bgmFetch(e){if(!e.pre)e.pre=fetch(e.url).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer()});return e.pre}
for(const k in BGM.tracks)bgmFetch(BGM.tracks[k]).catch(()=>{});
function bgmLoad(k){const e=BGM.tracks[k];if(!e||e.buf||e.loading)return;e.loading=true;
  bgmFetch(e).then(b=>AC.decodeAudioData(b.slice(0))).then(buf=>{e.buf=buf;if(MUS.track===k)bgmStart(k)}).catch(err=>{e.failed=true;console.warn("bgm",k,err)})}
function bgmStop(fade){if(!BGM.src)return;const t=AC.currentTime,g=BGM.gain,s=BGM.src,f=fade===undefined?.8:fade;
  g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(0,t+f);try{s.stop(t+f+.05)}catch(e){}BGM.src=null;BGM.gain=null;BGM.cur=null}
function bgmStart(k){const e=BGM.tracks[k];if(!e||!e.buf||BGM.cur===k)return;bgmStop();const t=AC.currentTime,s=AC.createBufferSource(),g=AC.createGain();
  s.buffer=e.buf;s.loop=true;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(e.vol,t+1.5);s.connect(g);g.connect(MUSB);s.start(t);BGM.src=s;BGM.gain=g;BGM.cur=k}
const bgmOn=k=>!!(BGM.tracks[k]&&BGM.tracks[k].buf);
function musTick(){if(!AUD.ready||!MUS.track)return;{const e=BGM.tracks[MUS.track];if(e&&!e.failed)return} /* a recorded track owns this scene: no generative score, not even while it loads */const sp=60/MUS.bpm/4;
  if(MUS.next<AC.currentTime-.5)MUS.next=AC.currentTime+.05;
  while(MUS.next<AC.currentTime+.15){schedStep(MUS.next,MUS.step);MUS.step++;MUS.next+=60/MUS.bpm/4}}
function music(track){if(!AUD.ready){MUS.want=track;return}if(MUS.track===track)return;
  if(track==="title")setTimeout(()=>bgmLoad("battle"),4000);
  if(BGM.tracks[track]){if(bgmOn(track))bgmStart(track);else{bgmStop();bgmLoad(track)}}else bgmStop();
  MUS.track=track;MUS.step=0;MUS.next=AC.currentTime+.08;MUS.bpm=track==="battle"?138:76;MUS.inten=0;
  if(!MUS.timer)MUS.timer=setInterval(musTick,30)}
