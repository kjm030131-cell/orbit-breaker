# Build the Cloudflare Pages bundle: static game + self-hosted three.js + PWA files
import os,shutil,re,json,glob
from PIL import Image
OUT=os.environ.get('OUT','../orbit-breaker-deploy');D=OUT+'/public';shutil.rmtree(D,ignore_errors=True);os.makedirs(D+'/lib',exist_ok=True);os.makedirs(D+'/icons',exist_ok=True)
html=open('orbit-breaker.html').read()
libs=re.findall(r'https://cdn\.jsdelivr\.net/npm/three@0\.147\.0/([^"]+)',html)
# self-host Pretendard (css + on-demand woff2 subsets) so the font works without the CDN
PF='node_modules/pretendard/dist/web/variable/'
if os.path.isdir(PF):
    shutil.copytree(PF+'woff2-dynamic-subset',D+'/lib/woff2-dynamic-subset',dirs_exist_ok=True);shutil.copy(PF+'pretendardvariable-dynamic-subset.css',D+'/lib/')
    html=html.replace('https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css','lib/pretendardvariable-dynamic-subset.css')
# self-host Saira Semi Condensed (digits / Latin HUD font, OFL) from @fontsource; replaces the Google Fonts link
SF='node_modules/@fontsource/saira-semi-condensed/files/'
if os.path.isdir(SF):
    os.makedirs(D+'/lib/fonts',exist_ok=True);css=''
    for w in (500,600,700,800):
        fn='saira-semi-condensed-latin-%d-normal.woff2'%w;shutil.copy(SF+fn,D+'/lib/fonts/'+fn)
        css+="@font-face{font-family:'Saira Semi Condensed';font-style:normal;font-display:swap;font-weight:%d;src:url(fonts/%s) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}\n"%(w,fn)
    open(D+'/lib/saira.css','w').write(css)
    html=re.sub(r'<link rel="preconnect" href="https://fonts\.googleapis\.com"><link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin><link rel="stylesheet" href="https://fonts\.googleapis\.com/css2\?family=Saira[^"]*">','<link rel="stylesheet" href="lib/saira.css">',html)
for p in libs:
    dst=D+'/lib/'+os.path.basename(p);shutil.copy('node_modules/three/'+p,dst)
    html=html.replace('https://cdn.jsdelivr.net/npm/three@0.147.0/'+p,'lib/'+os.path.basename(p))
if not html.lstrip().lower().startswith('<!doctype'):
    html='<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+html+'\n</html>\n'
html=html.replace('<script src="mech_glb.js"></script>\n','').replace('<script src="enemy_glb.js"></script>\n','')
html=html.replace('<script src="rig.js"></script>','<script src="rig.js"></script>\n<script src="lib/meshopt_decoder.js"></script>\n<script>window.GLB_BASE="models/"</script>',1)
assert 'GLB_BASE' in html and 'mech_glb.js' not in html
ver0=str(int(os.path.getmtime('orbit-breaker.html')))
html=html.replace('<script src="rig.js"></script>','<script src="rig.js?v='+ver0+'"></script>',1)  # bust the 1h JS cache on every deploy
# cache-bust every ui image: ui/* is cached for a day, so a redrawn asset under the same name would not show
html=re.sub(r'(ui/[^"\'`()\s?]*?\.webp)(?!\?)',lambda m:m.group(1)+'?v='+ver0,html)
open(D+'/index.html','w').write(html)
shutil.copy('node_modules/three/examples/js/libs/meshopt_decoder.js',D+'/lib/')
shutil.copy('rig.js',D+'/rig.js')
os.makedirs(D+'/models',exist_ok=True);[shutil.copy(f,D+'/models/') for f in glob.glob('models/*.glb')+glob.glob('models/*.json')]
Image.open('sky.jpg').convert('RGB').save(D+'/sky.jpg',quality=72,optimize=True,progressive=True)
shutil.copytree('ui',D+'/ui',dirs_exist_ok=True)
shutil.copy('admin.html',D+'/admin.html')  # /admin: ranking management (password checked by the API)
os.makedirs(D+'/sfx',exist_ok=True)
SFX=sorted(f[:-4] for f in os.listdir('sfx') if f.endswith('.mp3')) if os.path.isdir('sfx') else []
[shutil.copy('sfx/%s.mp3'%k,D+'/sfx/') for k in SFX];os.path.isdir('vo') and shutil.copytree('vo',D+'/vo',dirs_exist_ok=True);json.dump(SFX,open(D+'/sfx/list.json','w'));os.path.exists('sfx/preview.html') and shutil.copy('sfx/preview.html',D+'/sfx/');print('sfx',SFX)
im=Image.open('ui/logo_arclight.webp');im.thumbnail((1300,1300));im.save(D+'/ui/logo_arclight.webp',quality=86,method=6)  # ARCLIGHT wordmark: shown up to ~720px wide at 1.5x
Image.open('ui/panel.webp').save(D+'/ui/panel.webp',quality=70,method=6)
# icons: logo on a dark square
# icons: the wordmark's "A" with its amber light beam (the full wordmark is unreadable at icon size)
from PIL import ImageDraw,ImageFilter
lg=Image.open('ui/logo_arclight.webp').convert('RGBA');A=lg.crop((0,0,int(lg.size[0]*.165),lg.size[1]))
for s in (192,512):
    bg=Image.new('RGBA',(s,s),(7,8,10,255));l=A.copy();l.thumbnail((int(s*.62),int(s*.62)));ox,oy=(s-l.size[0])//2,(s-l.size[1])//2;bg.alpha_composite(l,(ox,oy))
    by=oy+int(l.size[1]*.526);x0,x1=ox-int(s*.04),ox+int(l.size[0]*1.05);glow=Image.new('RGBA',(s,s),(0,0,0,0));d=ImageDraw.Draw(glow)
    d.rounded_rectangle((x0,by-max(2,s//60),x1,by+max(2,s//60)),radius=s//60,fill=(255,150,30,200));glow=glow.filter(ImageFilter.GaussianBlur(s/60));bg.alpha_composite(glow)
    d2=ImageDraw.Draw(bg);d2.rounded_rectangle((x0+s//40,by-max(1,s//160),x1-s//40,by+max(1,s//160)),radius=s//160,fill=(255,236,200,255))
    bg.convert('RGB').save(f'{D}/icons/icon-{s}.png')
json.dump({"name":"ARCLIGHT · 아크라이트","short_name":"ARCLIGHT","start_url":"./","scope":"./","display":"fullscreen","orientation":"landscape",
  "background_color":"#07080a","theme_color":"#07080a","description":"120초 우주 메카 스코어 어택 — 2026 SCHU AI·SW Festival",
  "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]},open(D+'/manifest.webmanifest','w'),ensure_ascii=False,indent=1)
ver=str(int(os.path.getmtime('orbit-breaker.html')))
open(D+'/sw.js','w').write('''// cache the heavy game files after first visit; ranking API always goes to the network
const V="ob-%s";const CORE=["./","index.html","rig.js","models/mech.glb","models/enemy.glb","sky.jpg","manifest.webmanifest"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).catch(()=>{}))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||u.pathname.includes("/api/"))return;
  if(e.request.mode==="navigate"){if(!(u.pathname.endsWith("/")||u.pathname.endsWith("/index.html")))return; // other pages (admin) go straight to the network
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(k=>k.put("index.html",c));return r}).catch(()=>caches.match("index.html")));return}
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(k=>k.put(e.request,c))}return r})))});
'''%ver)
open(D+'/_headers','w').write("/models/*\n  Cache-Control: no-cache\n/*.js\n  Cache-Control: public, max-age=3600\n/ui/*\n  Cache-Control: public, max-age=86400\n/sfx/*\n  Cache-Control: public, max-age=3600\n/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/admin*\n  Cache-Control: no-store\n  X-Robots-Tag: noindex\n")
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
