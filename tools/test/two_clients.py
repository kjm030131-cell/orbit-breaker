import asyncio, subprocess, time, json, sys
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(['node','tools/test/local-pvp-server.mjs'],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT,env={**__import__('os').environ,'ROOT':'/tmp/obd/public'});time.sleep(1.5)
    errs={'A':[],'B':[]}
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pages={}
        for k in 'AB':
            pg=await b.new_page(viewport={'width':640,'height':360});pg.on('pageerror',lambda e,k=k: errs[k].append(str(e)));pg.on('console',lambda m,k=k: errs[k].append(m.text) if m.type=='error' else None)
            await pg.goto('http://localhost:8790/test.html');pages[k]=pg
        for k in 'AB':await pages[k].wait_for_function('window.__T',timeout=180000)
        await pages['A'].wait_for_timeout(15000)
        for k in 'AB':await pages[k].evaluate('()=>{window.PVP_URL="ws://localhost:8790/pvp";window.__T.show("duel");document.querySelector("[data-dm=vs]").click()}')
        await pages['A'].evaluate('()=>{document.getElementById("dName").value="호스트";document.getElementById("dCreate").disabled=false;document.getElementById("dCreate").click()}')
        await pages['A'].wait_for_timeout(2000)
        code=await pages['A'].evaluate('()=>window.__T.VS&&window.__T.VS.code');print('code',code)
        await pages['B'].evaluate('(c)=>{document.getElementById("dName").value="참가";document.getElementById("dCode").value=c;document.getElementById("dJoin").disabled=false;document.getElementById("dJoin").click()}',code)
        await pages['B'].wait_for_timeout(3000)
        await pages['A'].evaluate('()=>{const c=document.getElementById("vsSkills");c.checked=true;c.dispatchEvent(new Event("change"))}');await pages['A'].wait_for_timeout(1500)
        await pages['A'].evaluate('()=>{const b=document.querySelector("[data-du=mega]");b.disabled=false;b.click()}');await pages['B'].evaluate('()=>{const b=document.querySelector("[data-du=missile]");b.disabled=false;b.click()}');await pages['A'].wait_for_timeout(1500)
        for k in 'AB':await pages[k].evaluate('()=>document.getElementById("dReady").click()')
        await pages['A'].wait_for_timeout(9000)
        print('units',[await pages[k].evaluate('()=>[window.__T.G.unit,window.__T.VS.rules.skills]') for k in 'AB'])
        await pages['A'].evaluate('()=>window.__T.vsSkill(false)');await pages['B'].evaluate('()=>window.__T.vsSkill(false)')
        await pages['A'].wait_for_timeout(1500)
        for k in 'AB':print(k,await pages[k].evaluate('()=>{const T=window.__T;return {mega:T.VS_MEGA.length,hp:T.VS.hp,opp:T.VS.oppHp,cover:T.VSC.g.children.length,vis:T.VSC.g.visible,bolts:T.G.ebolts.length}}'))
        await pages['A'].wait_for_timeout(1500)
        # B gets hit by A's missiles->stagger? force a stagger break attempt from B after A's beam lands
        print('B before',await pages['B'].evaluate('()=>[window.__T.G.stagger,window.__T.VS.hp,window.__T.VS.maxHp,Math.round(window.__T.S.boost)]'))
        await pages['B'].evaluate('()=>{window.__T.G.stagger=.5;window.__T.G.broke=false;window.__T.dodge()}');await pages['B'].wait_for_timeout(1500)
        print('B after',await pages['B'].evaluate('()=>[window.__T.G.stagger,window.__T.G.broke,Math.round(window.__T.S.boost)]'))
        for k in 'AB':print(k,await pages[k].evaluate('()=>{const T=window.__T;return {mega:T.VS_MEGA.length,hp:T.VS.hp,opp:T.VS.oppHp,boost:Math.round(T.S.boost)}}'))
        await pages['A'].evaluate('()=>{document.getElementById("hud").style.visibility="hidden"}');await pages['A'].wait_for_timeout(4000);await pages['A'].screenshot(path='/tmp/claude-0/prev/vsA.png')
        await b.close()
    srv.kill()
    for k in 'AB':print(k,errs[k][:5])
asyncio.run(main())
