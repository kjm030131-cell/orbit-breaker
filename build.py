"""Build orbit-breaker.html from page shell + src/*.js (concatenated in name order inside one IIFE)."""
import glob,sys
head=open('head2.html').read()
parts=[open(f).read() for f in sorted(glob.glob('src/*.js'))]
# the 1:1 room rules (pvp/src/arena.js) also run in the browser for the offline showdown tutorial: same judging code, no server
arena=open('pvp/src/arena.js').read().replace('export const ','const ').replace('export function ','function ').replace('export class ','class ')
parts.insert(0,'const LOCAL_ARENA=(()=>{\n'+arena+'\nreturn {Arena,newRoom,VERSION,VS_COVER,PART_HP,VS_MS,ARM_R_SLOW,ARM_R_SHOT,partAt};})();\n')
js='(function(){\n"use strict";\n'+'\n'.join(parts)+'})();\n'
open('game.js','w').write(js)
html=head+'<script src="rig.js"></script>\n<script src="mech_glb.js"></script>\n<script src="enemy_glb.js"></script>\n<script>\n'+js+'</script>\n'
open('orbit-breaker.html','w').write(html)
print('built',len(html)//1024,'KB')
