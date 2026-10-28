import asyncio, subprocess, time, json
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(['node','tools/test/local-pvp-server.mjs'],stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT,env={**__import__('os').environ,'ROOT':'/tmp/obd/public'});time.sleep(1.5)
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':320,'height':200});await pg.goto('http://localhost:8790/test.html')
        await pg.wait_for_function('window.__T&&window.__T.FIELD.tpl&&Object.keys(window.__T.FIELD.tpl).length>=7',timeout=240000)
        r=await pg.evaluate('''()=>{const T=window.__T,tl=T.FIELD.tpl,V=THREE.Vector3,C=new V(0,0,140),K=.5,SK=.62,out=[];
          const spawns=[new V(0,0,-26),new V(0,0,26)];
          for(const L of T.FLAYOUT){const tpl=tl[L[0]];if(!tpl)continue;const pos=new V(L[1],L[2],L[3]).sub(C).multiplyScalar(K),size=L[4]*SK;
            const sz=tpl.geometry.boundingBox.getSize(new V()),m=new THREE.Mesh(tpl.geometry,tpl.material);m.scale.setScalar(size/Math.max(sz.x,sz.y,sz.z));m.position.copy(pos);m.rotation.set(L[6]||0,L[5]||0,0);m.updateMatrixWorld(true);
            const pa=m.geometry.attributes.position,v=new V(),bb=new THREE.Box3();for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(m.matrixWorld);bb.expandByPoint(v)}
            const sz2=bb.getSize(new V()),Lm=Math.max(sz2.x,sz2.y,sz2.z),cell=Math.max(3,Lm/5),cells=new Map();
            for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(m.matrixWorld);const k=Math.floor((v.x-bb.min.x)/cell)+","+Math.floor((v.y-bb.min.y)/cell)+","+Math.floor((v.z-bb.min.z)/cell);let c=cells.get(k);if(!c){c={s:new V(),n:0};cells.set(k,c)}c.s.add(v);c.n++}
            const sph=[];for(const c of cells.values())if(c.n>=2){const q=c.s.divideScalar(c.n);sph.push([+q.x.toFixed(1),+q.y.toFixed(1),+q.z.toFixed(1),+(cell*.72).toFixed(1)])}
            // keep the spawn points and the line between them clear
            let bad=false;for(const s of sph){const p=new V(s[0],s[1],s[2]);for(const sp of spawns)if(p.distanceTo(sp)<s[3]+12)bad=true;const dx=Math.hypot(p.x,p.y);if(Math.abs(p.z)<26&&dx<s[3]+5)bad=true}
            if(bad)continue;if(Math.hypot(pos.x,pos.z)>80)continue;
            out.push([L[0],+pos.x.toFixed(1),+pos.y.toFixed(1),+pos.z.toFixed(1),+size.toFixed(1),L[5]||0,L[6]||0,sph])}
          return out}''')
        open('/tmp/claude-0/vscover.json','w').write(json.dumps(r))
        print(len(r),[ (x[0],len(x[7])) for x in r])
        await b.close()
    srv.kill()
asyncio.run(main())
