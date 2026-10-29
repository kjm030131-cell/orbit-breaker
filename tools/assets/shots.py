# render previews of the optimized models -> /tmp/aout/*.jpg (contact sheets)
import asyncio,sys,json
from playwright.async_api import async_playwright
from PIL import Image,ImageDraw
OUT=sys.argv[1]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
    pg=await b.new_page(viewport={'width':768,'height':768});pg.on('console',lambda m:open(f'{OUT}/console.txt','a').write(m.text+'\n'));pg.on('pageerror',lambda e:print('pageerror',e))
    async def shot(q,name):
      await pg.goto('http://localhost:8765/tools/assets/preview.html?'+q);await pg.wait_for_function('window.READY',timeout=120000)
      await pg.screenshot(path=f'/tmp/s_{name}.png');return await pg.title()
    info={}
    for m in ['u_missile','u_shield','u_mega','u_pods']:
      ims=[]
      for yaw,pit in [(0,0),(90,0),(180,0),(270,0),(30,25),(0,-30)]:
        info[m]=await shot(f'f=../../out/{m}.glb&yaw={yaw}&pitch={pit}&z=1.1',f'{m}{yaw}_{pit}');ims.append(Image.open(f'/tmp/s_{m}{yaw}_{pit}.png'))
      sheet=Image.new('RGB',(768*3,768*2))
      for i,im in enumerate(ims):sheet.paste(im.convert('RGB'),((i%3)*768,(i//3)*768))
      sheet.save(f'{OUT}/{m}_views.jpg',quality=80)
    open(f'{OUT}/info.json','w').write(json.dumps(info,indent=1))
    await b.close()
asyncio.run(main())
