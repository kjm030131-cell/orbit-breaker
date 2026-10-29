# QA smoke run (see .github/workflows/qa.yml). Writes screenshots + report.json + errors.txt to OUT.
import asyncio, subprocess, time, json, sys, os
from playwright.async_api import async_playwright
ROOT,OUT=sys.argv[1],sys.argv[2];os.makedirs(OUT,exist_ok=True)
async def main():
    srv=subprocess.Popen(['python3','-m','http.server','8765','-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
    errs=[];rep={}
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1280,'height':720})
        pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in('error','warning') else None)
        pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
        pg.on('response',lambda r: errs.append(f'HTTP {r.status} {r.url}') if r.status>=400 else None)
        async def shot(n):
            try: await pg.screenshot(path=f'{OUT}/{n}.png',timeout=60000)
            except Exception as e: errs.append(f'shot {n}: {e}')
        async def ev(name,js):
            try: rep[name]=await pg.evaluate(js)
            except Exception as e: rep[name]='EXC '+str(e)[:400]
            print(name,json.dumps(rep[name],ensure_ascii=False)[:600],flush=True)
        await pg.goto('http://localhost:8765/test.html')
        await pg.wait_for_function('window.__T&&window.__T.P',timeout=180000)
        await pg.wait_for_timeout(4000);await shot('01_title')
        await ev('mech','()=>{const P=window.__T.P,b=new THREE.Box3().setFromObject(P.root),z=b.getSize(new THREE.Vector3());return {h:+z.y.toFixed(2),w:+z.x.toFixed(2),muzzle:P.muzzle.position.toArray().map(v=>+v.toFixed(3)),bones:P.skin?0:Object.keys(P.J).length}}')
        # 1) solo 60 s, CPU cost of update()
        await ev('solo','''()=>{const T=window.__T;T.setPaused(true);T.G.unit="mega";T.restart();T.show("play");T.S.started=true;T.S.demo=false;
          let kills=0,minHp=100,dead=0,ms=0,lost=0;const t0=performance.now();
          for(let i=0;i<20*60;i++){if(i%24===0){const e=T.enemies.find(e=>e.alive&&e.launched<=0&&!e.isBoss&&!e.isWP&&!e.ms);if(e){e.alive=false;kills++}}
            const l0=T.G.lives;T.update(.05);if(T.G.lives<l0)lost++;minHp=Math.min(minHp,T.G.hp);if(T.G.dead>0)dead++}
          ms=(performance.now()-t0)/1200;return {msPerUpdate:+ms.toFixed(2),kills,minHp,deadFrames:dead,livesLost:lost,lives:T.G.lives,phase:T.G.phase,time:+T.S.time.toFixed(1),enemies:T.enemies.filter(e=>e.alive).length}}''')
        await pg.evaluate('()=>window.__T.setPaused(false)');await pg.wait_for_timeout(1500);await shot('02_solo')
        await ev('shoot','()=>{const T=window.__T;T.setPaused(true);T.restart();T.show("play");T.S.started=true;T.S.demo=false;T.G.iframe=99;for(let i=0;i<10;i++)T.update(.05);T.shoot();for(let i=0;i<3;i++)T.update(.05);return T.S.act}')
        await shot('02b_shoot')
        await ev('slash','()=>{const T=window.__T;for(let i=0;i<12;i++)T.update(.05);T.attack();for(let i=0;i<3;i++)T.update(.05);return T.S.act}')
        await shot('02c_slash')
        # new foes (10/29): kamikaze, sniper, formation, crate + buffed specials
        await ev('foes','''()=>{const T=window.__T,V=T.S.pos.constructor,r={};try{T.setPaused(true);T.restart();T.show("play");T.S.started=true;T.S.demo=false;T.G.iframe=999;
          const f=T.camera().getWorldDirection(new V()),at=d=>T.S.pos.clone().addScaledVector(f,d);
          const k=T.spawnKami(at(30)),s=T.spawnSniper(at(80)),fm=T.spawnFormation(),c=T.spawnCrate(at(25));
          for(let i=0;i<40;i++)T.update(.05);r.kami={alive:k.alive};r.sniper={alive:s.alive,tele:+s.tele.toFixed(2)};r.form=fm.map(e=>e.alive&&!!e.form).join(",");
          const sp0=T.G.spec;if(c.alive){T.knock(c,new V(0,0,1),30,.2);for(let i=0;i<30;i++)T.update(.05)}r.crate={alive:c.alive,spec:[sp0,T.G.spec]};
          const k2=T.spawnKami(at(20));for(let i=0;i<3;i++)T.spawnKami(at(22).add(new V(i*3,0,0)));T.knock(k2,new V(0,0,1),20,.15);for(let i=0;i<30;i++)T.update(.05);r.chain=T.enemies.filter(e=>e.kami&&e.alive).length;
          r.spec={};for(const u of ["pods","missile","shield"]){T.G.unit=u;T.G.spec=100;T.G.specT=-1;T.G.mega=null;T.G.stagger=0;T.G.iframe=999;T.G.dead=0;for(let i=0;i<8;i++)T.spawnCrate(at(30+i*5).add(new V(i*2-8,0,0)));T.special();let max=0,cf=0;for(let i=0;i<80;i++){T.update(.05);max=Math.max(max,(T.G.proj||[]).length);if(i===40)cf=+(T.G.cfield||0).toFixed(1)}r.spec[u]={proj:max,cfieldAt2s:cf,storm:!!T.G.podStorm}}
        }catch(e){r.err=String(e).slice(0,300)}return r}''')
        await pg.evaluate('()=>window.__T.setPaused(false)');await pg.wait_for_timeout(800);await shot('02d_foes')
        try: await pg.wait_for_function('Object.keys(window.__T.UNIT_GLTF).length>=4',timeout=60000)
        except Exception as e: errs.append('unit models not loaded: '+str(e)[:100])
        for u in ['mega','missile','pods','shield']:
            await ev('unit_'+u,'''()=>{const T=window.__T;T.setPaused(true);T.restart();T.show("play");T.S.started=true;T.S.demo=false;T.G.iframe=999;for(const e of T.enemies)e.alive=false;T.G.unit="%s";T.buildBits("%s");for(let i=0;i<20;i++)T.update(.05);return Object.keys(T.UNIT_GLTF)}'''%(u,u))
            await pg.evaluate('()=>window.__T.setPaused(false)');await pg.wait_for_timeout(900);await pg.evaluate('()=>window.__T.setPaused(true)');await shot('02e_unit_'+u)
        # 1b) a decent player for the full 120 s: dodges ~60% of shots / rams in time, breaks staggers, kills a drone every 1.5 s, chips the pods and slashes the stalled boss
        await ev('solo_skilled','''()=>{const T=window.__T;T.setPaused(true);T.G.unit="mega";T.restart();T.show("play");T.S.started=true;T.S.ended=false;T.S.demo=false;
          let lost=0,hits=0,minHp=100,dodges=0,bossT=null,last=100;
          for(let i=0;i<20*120&&!T.S.ended;i++){if(i%30===0){const e=T.enemies.find(e=>e.alive&&e.launched<=0&&!e.isBoss&&!e.isWP&&!e.ms);if(e){e.alive=false}}
            const tb=T.cueBolt(),tr=T.cueRam();if(((tb!==null&&tb<.15)||(tr!==null&&tr<.2))&&Math.random()<.35){T.dodge();dodges++}
            if(T.G.stagger>0&&!T.G.broke&&Math.random()<.2)T.dodge();
            const B=T.BOSS;if(B.e&&bossT===null)bossT=+(120-T.S.time).toFixed(1);
            if(B.e&&B.e.alive&&!(B.e.down>0)&&i%40===0){for(const w of B.wps)if(w.alive){T.wpDamage(w,1,w.m.getWorldPosition(new w.m.position.constructor()));break}}
            if(B.e&&B.e.alive&&B.e.down>0&&B.e.down<4.5)T.knock(B.e,new B.e.m.position.constructor(0,0,1),40,1);
            const l0=T.G.lives;T.update(.05);if(T.G.lives<l0)lost++;if(T.G.hp<last)hits++;last=T.G.hp;minHp=Math.min(minHp,T.G.hp)}
          return {livesLost:lost,hitsTaken:hits,dodges,minHp,bossAt:bossT,bossDead:T.BOSS.dead,phase2:T.BOSS.phase2,ended:T.S.ended,timeLeft:+T.S.time.toFixed(1),score:T.S.score}}''')
        # 2) boss: spawn, break the pods, slash twice (phase 2, then death)
        await ev('boss_pre','()=>{const B=window.__T.BOSS;return {e:!!B.e,dead:B.dead,screen:window.__T.SCREEN,ended:window.__T.S.ended}}')
        await ev('boss','''()=>{const T=window.__T,B=T.BOSS,r={};const st=n=>{r[n]={e:!!B.e,alive:!!(B.e&&B.e.alive),down:B.e?+B.e.down.toFixed(1):null,p2:B.phase2,dead:B.dead,wps:B.wps.filter(w=>w.alive).length,ended:T.S.ended,lives:T.G.lives,guide:document.getElementById("tutObjTxt").textContent.slice(0,16)}};
          try{B.dead=false;T.setPaused(true);T.restart();T.show("play");T.S.started=true;T.S.ended=false;T.S.demo=false;T.G.lives=3;T.G.hp=100;T.S.time=120-71;for(let i=0;i<4;i++)T.update(.05);if(!B.e)T.spawnBoss();st("spawn");
          const V=T.S.pos.constructor,kill=()=>{for(const w of [...B.wps])if(w.alive)T.wpDamage(w,99,w.m.getWorldPosition(new V()))};
          kill();st("podsDown1");T.G.iframe=99;T.update(.05);st("tick1");if(B.e)T.knock(B.e,new V(0,0,1),40,1);st("slash1");for(let i=0;i<10;i++)T.update(.05);st("recover");
          kill();st("podsDown2");if(B.e)T.knock(B.e,new V(0,0,1),40,1);st("slash2");for(let i=0;i<160;i++)T.update(.05);st("end")}catch(e){r.err=String(e).slice(0,200)}return r}''')
        await shot('03_boss')
        # 2b) boss model (10/29): loaded GLBs, idle / telegraph / stalled poses, pods in view
        try: await pg.wait_for_function('window.__T.BOSS_GLTF&&window.__T.POD_GLTF',timeout=60000)
        except Exception as e: errs.append('boss model not loaded: '+str(e)[:120])
        await ev('boss_model','''()=>{const T=window.__T,B=T.BOSS;B.dead=false;T.setPaused(true);T.restart();T.show("play");T.S.started=true;T.S.ended=false;T.S.demo=false;T.G.iframe=999;
          for(const e of T.enemies)if(!e.isBoss)e.alive=false;T.spawnBoss();if(!B.e)return "no boss";B.introT=0;B.atkT=99;
          const V=T.S.pos.constructor,f=T.camera().getWorldDirection(new V());B.e.m.position.copy(T.S.pos).addScaledVector(f,48).add(new V(0,2,0));for(let i=0;i<20;i++)T.update(.05);
          const u=B.e.m.userData;return {model:!!u.anim,bones:u.anim?u.anim.B.length:0,pods:B.wps.map(w=>!!w.pod),rad:B.e.rad,calls:T.renderer.info.render.calls}}''')
        await pg.evaluate('()=>window.__T.setPaused(false)');await pg.wait_for_timeout(1200);await pg.evaluate('()=>window.__T.setPaused(true)');await shot('03b_boss_idle')
        await ev('boss_tele','()=>{const T=window.__T,B=T.BOSS;if(!B.e)return null;B.tele=.9;for(let i=0;i<6;i++)T.update(.05);const A=B.e.m.userData.anim;return A?{lean:+A.lean.toFixed(2),spread:+A.spread.toFixed(2),rec:+A.rec.toFixed(2)}:null}')
        await shot('03c_boss_tele')
        await ev('boss_down','()=>{const T=window.__T,B=T.BOSS,V=T.S.pos.constructor;if(!B.e)return null;for(const w of [...B.wps])if(w.alive)T.wpDamage(w,99,w.m.getWorldPosition(new V()));for(let i=0;i<30;i++)T.update(.05);const A=B.e.m.userData.anim;return A?{down:+B.e.down.toFixed(1),lean:+A.lean.toFixed(2),spread:+A.spread.toFixed(2)}:null}')
        await shot('03d_boss_down')
        # 3) duelist posture + arm cut
        await ev('duelist','''()=>{const T=window.__T;T.setPaused(true);const V=T.S.pos.constructor;const e=T.spawnMS(T.S.pos.clone().add(new V(0,0,9)),true);if(!e)return "no MS model";
          const at=e.m.position.clone(),r={hp:e.hp};const seq=[];for(let k=0;k<6;k++){const blocked=T.bladeParry(e,at);seq.push((e.post||0)+(e.broken?"B":"")+(blocked?"":"K"));if(!blocked)break;e.stun=0;e.bs=k%2?"wind":"hunt"}
          r.seq=seq.join(" ");const m=T.spawnMS(T.S.pos.clone().add(new V(6,0,0)),false);if(m){m.yaw=0;r.cut=T.msCutCheck(m,at,true);r.cutSide=m.cut&&Object.keys(m.cut)}for(let i=0;i<5;i++)T.update(.05);return r}''')
        await pg.evaluate('()=>window.__T.setPaused(false)');await pg.wait_for_timeout(800);await shot('04_duelist')
        # 4) single tutorial: every step enters / ticks without errors
        await ev('tutorial','''()=>{const T=window.__T;T.setPaused(true);document.body.classList.add("tut");T.TUT.on=true;T.TUT.c={};const out=[];for(let i=0;i<T.TUT_STEPS.length-1;i++){T.TUT.busy=false;T.tutStep(i);for(let k=0;k<6;k++)T.update(.05);out.push(document.getElementById("tutObjTxt").textContent.slice(0,14))}
          T.TUT.busy=false;T.tutStep(8);for(let k=0;k<4;k++)T.update(.05);return out}''')
        await pg.evaluate('()=>window.__T.setPaused(false)');await pg.wait_for_timeout(600);await shot('05_tutorial')
        await pg.evaluate('()=>{const T=window.__T;["경직 풀기","팔 절단 · 사격 불능","자세 붕괴! 지금 베어라","자세 붕괴! 지금 베어라","피격 −24 · Shift로 경직 풀기","콤보 ×2"].forEach(t=>T.popText(t))}');await pg.wait_for_timeout(500);await shot('05b_feed')
        await ev('feed','()=>[...document.querySelectorAll("#feed div")].map(d=>d.textContent)')
        await pg.evaluate('()=>{const T=window.__T;T.TUT.on=false;T.TUT.step=-1;document.body.classList.remove("tut");T.restart();T.show("duel")}')
        await pg.wait_for_timeout(800);await shot('06_lobby')
        # 5) 1:1 tutorial (offline room) + parts / cockpit
        await ev('vst_start','''()=>{const T=window.__T;document.getElementById("dName").value="QA";T.vstStart();return !!T.VS}''')
        await pg.wait_for_timeout(6000)
        await ev('vst','''()=>{const T=window.__T;return {screen:T.SCREEN,phase:T.VS&&T.VS.phase,step:T.VST.step,obj:document.getElementById("tutObjTxt").textContent}}''')
        await shot('07_vst_step1')
        for i in [2,3,7]:
            await pg.evaluate(f'()=>{{window.__T.VST.busy=false;window.__T.vstStepGo({i})}}');await pg.wait_for_timeout(5000);await shot(f'08_vst_step{i+1}')
        await ev('vst_enemies','()=>{const T=window.__T;return T.enemies.filter(e=>e.alive).map(e=>e.isRemote?"remote":e.ms?(e.blade?"blade":"ms"):e.isBoss?"boss":e.elite?"elite":"drone")}')
        await ev('vst_counts','()=>JSON.parse(JSON.stringify(window.__T.VST.c))')
        await ev('parts','''()=>{const T=window.__T,v=T.VS;if(!v)return "no VS";T.vsPartsMsg({t:"part",side:v.side==="a"?"b":"a",part:"armR"});T.vsPartsMsg({t:"part",side:v.side==="a"?"b":"a",part:"head"});
          T.vsPartsMsg({t:"part",side:v.side,part:"armL"});return {oppBroken:Object.keys(v.remote.broken||{}),mine:Object.keys(T.P.broken||{})}}''')
        await pg.wait_for_timeout(2500);await shot('09_parts_remote')
        await ev('cockpit','''()=>{const T=window.__T,v=T.VS;T.vsPartsMsg({t:"part",side:v.side,part:"head"});return {fp:v.fp}}''')
        await pg.wait_for_timeout(3000);await shot('10_cockpit')
        await ev('render','()=>{const i=window.__T.renderer.info;return {calls:i.render.calls,tris:i.render.triangles,geo:i.memory.geometries,tex:i.memory.textures,progs:(i.programs||[]).length}}')
        await b.close()
    srv.kill()
    json.dump(rep,open(f'{OUT}/report.json','w'),ensure_ascii=False,indent=1);open(f'{OUT}/errors.txt','w').write('\n'.join(errs))
    print('ERRORS',len(errs));print('\n'.join(errs[:40]))
asyncio.run(main())
