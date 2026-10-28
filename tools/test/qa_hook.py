# make test.html = index.html + window.__T hook (IIFE internals for the QA script)
import sys
d=sys.argv[1];s=open(d+'/index.html').read()
names="update,restart,show,S,G,enemies,unitSkill,special,PHASES,dodge,BOSS,spawnBoss,wpDamage,knock,spawnMS,bladeParry,msCutCheck,TUT,TUT_STEPS,tutStep,tutFrame,VST,VST_STEPS,vstStepGo,vsPartsMsg,vstStart,renderer,popText,cueBolt,cueRam,camera:()=>camera,setPaused(v){PAUSED=v},get VS(){return VS},get P(){return P},get SCREEN(){return SCREEN}"
end='})();\n</script>';i=s.rindex(end)
open(d+'/test.html','w').write(s[:i]+'window.__T={'+names+'};\n'+s[i:])
print('hook ok')
