"""Build orbit-breaker.html from page shell + src/*.js (concatenated in name order inside one IIFE)."""
import glob,sys
head=open('head2.html').read()
parts=[open(f).read() for f in sorted(glob.glob('src/*.js'))]
js='(function(){\n"use strict";\n'+'\n'.join(parts)+'})();\n'
open('game.js','w').write(js)
html=head+'<script src="rig.js"></script>\n<script src="mech_glb.js"></script>\n<script src="enemy_glb.js"></script>\n<script>\n'+js+'</script>\n'
open('orbit-breaker.html','w').write(html)
print('built',len(html)//1024,'KB')
