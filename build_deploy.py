# Build the Cloudflare Pages bundle: static game + self-hosted three.js + PWA files
import os,shutil,re,json,glob
from PIL import Image
OUT=os.environ.get('OUT','../orbit-breaker-deploy');D=OUT+'/public';shutil.rmtree(D,ignore_errors=True);os.makedirs(D+'/lib',exist_ok=True);os.makedirs(D+'/icons',exist_ok=True)
html=open('orbit-breaker.html').read()
libs=re.findall(r'https://cdn\.jsdelivr\.net/npm/three@0\.147\.0/([^"]+)',html)
for p in libs:
    dst=D+'/lib/'+os.path.basename(p);shutil.copy('node_modules/three/'+p,dst)
    html=html.replace('https://cdn.jsdelivr.net/npm/three@0.147.0/'+p,'lib/'+os.path.basename(p))
if not html.lstrip().lower().startswith('<!doctype'):
    html='<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+html+'\n</html>\n'
html=html.replace('<script src="mech_glb.js"></script>\n','').replace('<script src="enemy_glb.js"></script>\n','')
html=html.replace('<script src="rig.js"></script>','<script src="rig.js"></script>\n<script src="lib/meshopt_decoder.js"></script>\n<script>window.GLB_BASE="models/"</script>',1)
assert 'GLB_BASE' in html and 'mech_glb.js' not in html
open(D+'/index.html','w').write(html)
shutil.copy('node_modules/three/examples/js/libs/meshopt_decoder.js',D+'/lib/')
shutil.copy('rig.js',D+'/rig.js')
os.makedirs(D+'/models',exist_ok=True);[shutil.copy(f,D+'/models/') for f in glob.glob('models/*.glb')]
Image.open('sky.jpg').convert('RGB').save(D+'/sky.jpg',quality=72,optimize=True,progressive=True)
shutil.copytree('ui',D+'/ui',dirs_exist_ok=True)
os.makedirs(D+'/sfx',exist_ok=True)
SFX=sorted(f[:-4] for f in os.listdir('sfx') if f.endswith('.mp3')) if os.path.isdir('sfx') else []
[shutil.copy('sfx/%s.mp3'%k,D+'/sfx/') for k in SFX];json.dump(SFX,open(D+'/sfx/list.json','w'));os.path.exists('sfx/preview.html') and shutil.copy('sfx/preview.html',D+'/sfx/');print('sfx',SFX)
im=Image.open('ui/logo.webp');im.thumbnail((820,820));im.save(D+'/ui/logo.webp',quality=72,method=6)
Image.open('ui/panel.webp').save(D+'/ui/panel.webp',quality=70,method=6)
# icons: logo on a dark square
lg=Image.open('ui/logo.webp').convert('RGBA')
for s in (192,512):
    bg=Image.new('RGBA',(s,s),(7,8,10,255));l=lg.copy();l.thumbnail((int(s*.9),int(s*.9)));bg.alpha_composite(l,((s-l.size[0])//2,(s-l.size[1])//2));bg.convert('RGB').save(f'{D}/icons/icon-{s}.png')
json.dump({"name":"ORBIT BREAKER · 오빗 브레이커","short_name":"오빗 브레이커","start_url":"./","scope":"./","display":"fullscreen","orientation":"landscape",
  "background_color":"#07080a","theme_color":"#07080a","description":"120초 우주 메카 스코어 어택 — 2026 SCHU AI·SW Festival",
  "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]},open(D+'/manifest.webmanifest','w'),ensure_ascii=False,indent=1)
ver=str(int(os.path.getmtime('orbit-breaker.html')))
open(D+'/sw.js','w').write('''// cache the heavy game files after first visit; ranking API always goes to the network
const V="ob-%s";const CORE=["./","index.html","rig.js","models/mech.glb","models/enemy.glb","sky.jpg","manifest.webmanifest"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).catch(()=>{}))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||u.pathname.includes("/api/"))return;
  if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(k=>k.put("index.html",c));return r}).catch(()=>caches.match("index.html")));return}
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(k=>k.put(e.request,c))}return r})))});
'''%ver)
open(D+'/_headers','w').write("/models/*\n  Cache-Control: public, max-age=86400\n/*.js\n  Cache-Control: public, max-age=3600\n/ui/*\n  Cache-Control: public, max-age=86400\n/sfx/*\n  Cache-Control: public, max-age=3600\n/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n")
print('libs',len(libs));os.system('du -sh '+D)

shutil.copytree('pvp/src',OUT+'/pvp/src',dirs_exist_ok=True)

api=open('server/api.js').read()
api=api.replace('export async function onRequest({ request, env, params })','async function onRequest({ request, env, params })')
api+="""
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/pvp") {
      if (!env.PVP) return new Response("pvp relay not bound", { status: 503 });
      const room = (url.searchParams.get("room") || "").replace(/\\D/g, "").slice(0, 4);
      if (room.length !== 4) return new Response("room?", { status: 400 });
      return env.PVP.get(env.PVP.idFromName(room)).fetch(request);
    }
    if (url.pathname.startsWith("/api/")) {
      const route = url.pathname.slice(5).split("/").filter(Boolean);
      return onRequest({ request, env, params: { route } });
    }
    return env.ASSETS.fetch(request);
  },
};
"""
open(D+'/_worker.js','w').write(api)
os.system('du -sh '+D+'; du -ab '+D+' | sort -n | tail -8')
