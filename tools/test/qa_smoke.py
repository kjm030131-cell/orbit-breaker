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
        # 1) solo 60 s, CPU cost of update()
        await ev('solo','''()=>{const T=window.__T;T.setPaused(true);T.G.unit="mega";T.restart();T.show("play");T.S.started=true;T.S.demo=false;
          let kills=0,minHp=100,dead=0,ms=0,lost=0;const t0=performance.now();
          for(let i=0;i<20*60;i++){if(i%24===0){const e=T.enemies.find(e=>e.alive&&e.launched<=0&&!e.isBoss&&!e.isWP&&!e.ms);if(e){e.alive=false;kills++}}
            const l0=T.G.lives;T.update(.05);if(T.G.lives<l0)lost++;minHp=Math.min(minHp,T.G.hp);if(T.G.dead>0)dead++}
          ms=(performance.now()-t0)/1200;return {msPerUpdate:+ms.toFixed(2),kills,minHp,deadFrames:dead,livesLost:lost,lives:T.G.lives,phase:T.G.phase,time:+T.S.time.toFixed(1),enemies:T.enemies.filter(e=>e.alive).length}}''')
        await pg.evaluate('()=>window.__T.setPaused(false)');await pg.wait_for_timeout(1500);await shot('02_solo')
        # 2) boss: spawn, break the pods, slash twice (phase 2, then death)
        await ev('boss','''()=>{const T=window.__T,B=T.BOSS;T.setPaused(true);T.S.time=120-71;T.G.lives=3;T.G.hp=100;for(let i=0;i<4;i++)T.update(.05);if(!B.e)T.spawnBoss();
          const r={spawned:!!B.e};const kill=()=>{for(const w of [...B.wps])if(w.alive)T.wpDamage(w,99,w.m.getWorldPosition(new w.m.position.constructor()))};
          kill();r.down1=B.e&&B.e.down;T.update(.05);r.guide1=document.getElementById("tutObjTxt").textContent;
          T.knock(B.e,T.camera().getWorldDirection(new B.e.m.position.constructor()),40,1);r.phase2=B.phase2;r.aliveAfter1=B.e&&B.e.alive;r.down1after=B.e.down;
          for(let i=0;i<10;i++)T.update(.05);r.wps2=B.wps.filter(w=>w.alive).length;r.guideN=document.getElementById("tutObjN").textContent;
          kill();r.down2=B.e.down;T.knock(B.e,T.camera().getWorldDirection(new B.e.m.position.constructor()),40,1);r.launched=B.e.launched;
          for(let i=0;i<120;i++)T.update(.05);r.dead=B.dead;return r}''')
        await shot('03_boss')
        # 3) duelist posture + arm cut
        await ev('duelist','''()=>{const T=window.__T;T.setPaused(true);const V=T.S.pos.constructor;const e=T.spawnMS(T.S.pos.clone().add(new V(0,0,9)),true);if(!e)return "no MS model";
          const at=e.m.position.clone(),r={hp:e.hp};const seq=[];for(let k=0;k<6;k++){const blocked=T.bladeParry(e,at);seq.push((e.post||0)+(e.broken?"B":"")+(blocked?"":"K"));if(!blocked)break;e.stun=0;e.bs=k%2?"wind":"hunt"}
          r.seq=seq.join(" ");const m=T.spawnMS(T.S.pos.clone().add(new V(6,0,0)),false);if(m){m.yaw=0;r.cut=T.msCutCheck(m,at,true);r.cutSide=m.cut&&Object.keys(m.cut)}for(let i=0;i<5;i++)T.update(.05);return r}''')
        await pg.evaluate('()=>window.__T.setPaused(false)');await pg.wait_for_timeout(800);await shot('04_duelist')
        # 4) single tutorial: every step enters / ticks without errors
        await ev('tutorial','''()=>{const T=window.__T;T.setPaused(true);T.TUT.on=true;T.TUT.c={};const out=[];for(let i=0;i<T.TUT_STEPS.length-1;i++){T.TUT.busy=false;T.tutStep(i);for(let k=0;k<6;k++)T.update(.05);out.push(document.getElementById("tutObjTxt").textContent.slice(0,14))}
          T.TUT.busy=false;T.tutStep(8);for(let k=0;k<4;k++)T.update(.05);return out}''')
        await pg.evaluate('()=>window.__T.setPaused(false)');await pg.wait_for_timeout(600);await shot('05_tutorial')
        await pg.evaluate('()=>{const T=window.__T;T.TUT.on=false;T.TUT.step=-1;document.body.classList.remove("tut");T.restart();T.show("duel")}')
        await pg.wait_for_timeout(800);await shot('06_lobby')
        # 5) 1:1 tutorial (offline room) + parts / cockpit
        await ev('vst_start','''()=>{const T=window.__T;document.getElementById("dName").value="QA";T.vstStart();return !!T.VS}''')
        await pg.wait_for_timeout(6000)
        await ev('vst','''()=>{const T=window.__T;return {screen:T.SCREEN,phase:T.VS&&T.VS.phase,step:T.VST.step,obj:document.getElementById("tutObjTxt").textContent}}''')
        await shot('07_vst_step1')
        for i in [2,3,7]:
            await pg.evaluate(f'()=>{{window.__T.VST.busy=false;window.__T.vstStepGo({i})}}');await pg.wait_for_timeout(5000);await shot(f'08_vst_step{i+1}')
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
