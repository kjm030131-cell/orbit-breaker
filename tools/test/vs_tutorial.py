import asyncio, subprocess, time, json
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(['python3','-m','http.server','8765','-d','/tmp/obd/public'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':800,'height':450})
        pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:8765/test.html');await pg.wait_for_function('window.__T',timeout=120000);await pg.wait_for_timeout(15000)
        await pg.evaluate('()=>{window.__T.show("duel");document.getElementById("dName").value="테스터";document.getElementById("dTut").click()}')
        await pg.wait_for_timeout(5000)
        st=await pg.evaluate('()=>{const T=window.__T;return [T.VST.on,T.VS&&T.VS.phase,T.VST.arena&&T.VST.arena.s.phase,T.VST.step,document.getElementById("tutObjTxt").textContent]}');print('start',st)
        # helper: put player 6 m in front of the bot, facing it, and act
        js='''(acts)=>{const T=window.__T,A=T.VST.arena,me=A.s.players.a,b=T.VST.bot;const now=Date.now();T.VS.sendT=1e9;
            const p=[b.p[0],b.p[1],b.p[2]-6];me.p=p;me.f=Math.atan2(b.p[0]-p[0],b.p[2]-p[2]);
            for(const a of acts)A.handle("a",a,now);return [T.VST.step,JSON.stringify(T.VST.c)]}'''
        for i in range(8):
            r=await pg.evaluate(js,[{"t":"swing"}]);await pg.wait_for_timeout(700)
        print('after swings',r, await pg.evaluate('()=>window.__T.VST.step'))
        await pg.wait_for_timeout(2500)
        print('step',await pg.evaluate('()=>window.__T.VST.step'))
        # guard step: hold guard facing bot for 6 s
        for i in range(12):
            r=await pg.evaluate(js,[{"t":"guard","on":True}]);await pg.wait_for_timeout(500)
        print('guard',r)
        await pg.evaluate(js,[{"t":"guard","on":False}])
        # whiff step
        await pg.evaluate('()=>window.__T.vstStepGo(4)');await pg.wait_for_timeout(1000)
        for i in range(10):
            w=await pg.evaluate('()=>Date.now()-window.__T.VST.whiffAt')
            if w<600:
                r=await pg.evaluate(js,[{"t":"swing"}]);await pg.wait_for_timeout(400);print('punish try',r);break
            await pg.wait_for_timeout(400)
        await pg.evaluate('()=>window.__T.vstStepGo(5)');await pg.wait_for_timeout(1500)
        for i in range(10):
            r=await pg.evaluate(js,[{"t":"swing"}]);await pg.wait_for_timeout(650)
        print('gb',r)
        await pg.evaluate('()=>window.__T.vstStepGo(7)');await pg.wait_for_timeout(1500)
        for i in range(14):
            r=await pg.evaluate(js,[{"t":"swing"}]);await pg.wait_for_timeout(650)
        print('spar',r)
        await pg.wait_for_timeout(6000)
        print('end',await pg.evaluate('()=>{const T=window.__T;return [T.VST.on,!!T.VS,document.querySelector("#scrDuel").hidden]}'))
        await b.close()
    srv.kill();print(errs[:10])
asyncio.run(main())
