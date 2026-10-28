import asyncio, subprocess, time, json, sys
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(['python3','-m','http.server','8765','-d','/tmp/obd/public'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':800,'height':500})
        pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in('error','warning') else None)
        pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto('http://localhost:8765/test.html');
        await pg.wait_for_function('window.__T&&document.getElementById("loadStatus")',timeout=120000)
        await pg.wait_for_timeout(15000)
        r=await pg.evaluate('''()=>{const T=window.__T;T.setPaused(true);T.G.unit="mega";T.restart();T.show("play");T.S.started=true;T.S.demo=false;
          const log=[];const cnt=()=>T.enemies.filter(e=>e.alive&&!e.isBoss&&!e.isWP).length;
          let kills=0,brk=0,minHp=100,stg=0,dead=0;
          for(let i=0;i<20*60;i++){ // 60 s of sim at 20 Hz, killing one drone every 1.2 s like a busy player
            if(i%24===0){const e=T.enemies.find(e=>e.alive&&e.launched<=0&&!e.isBoss&&!e.isWP&&!e.ms);if(e){e.alive=false;kills++}}
            if(i===200)T.unitSkill(); if(i===400){T.G.spec=100;T.special()}
            T.G.lives=Math.max(T.G.lives,2);if(T.G.stagger>0&&!T.G.broke&&Math.random()<.3){T.dodge();brk++}T.update(.05);minHp=Math.min(minHp,T.G.hp);if(T.G.stagger>0)stg++;if(T.G.dead>0)dead++;if(i%100===0)log.push([+(i*.05).toFixed(1),T.G.phase,cnt(),!!T.G.mega&&T.G.mega.mode+(T.G.mega.firing?"F":"c")])}
          return {brk,minHp,stg,dead,lives:T.G.lives,log,kills,score:T.S.score,time:T.S.time}}''')
        print(json.dumps(r))
        await b.close()
    srv.kill()
    print('\n'.join(errs[:30]))
asyncio.run(main())
