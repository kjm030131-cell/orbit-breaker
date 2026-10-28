/* ================= load models ================= */
function b64buf(s){const bin=atob(s||"");const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer}
const fail=()=>{$("loadStatus").classList.add("err");$("loadStatus").textContent="모델을 불러오지 못했습니다. 새로고침해 주세요."};let loaded=0;const okLoad=()=>{if(++loaded===2){try{if(!SHIP)buildShip();buildBits(G.unit)}catch(e){console.error(e)}$("loadStatus").textContent="XR-07 Mk-II · 기체 점검 완료";
  lazyGLB("ship","ship_glb.js","SHIP_GLB_B64",g=>{SHIP_GLTF=g;attachShipModel()});
  lazyGLB("swift","swift_glb.js","SWIFT_GLB_B64",g=>loadFrame("swift",g))}};
// models: the deployed build fetches meshopt-compressed .glb files; the artifact build parses embedded base64
// compressed GLBs (meshopt + quantization) keep positions as int16 with the scale on the node:
// bake every mesh's world transform into float geometry so rigging and scaling see real model space
function bakeGLTF(g){g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh)return;const geo=o.geometry;
  for(const k of Object.keys(geo.attributes)){const a=geo.attributes[k];if(!a.isInterleavedBufferAttribute&&a.array instanceof Float32Array&&!a.normalized)continue;
    const n=a.count,s=a.itemSize,f=new Float32Array(n*s),get=[a.getX,a.getY,a.getZ,a.getW];
    for(let i=0;i<n;i++)for(let j=0;j<s;j++)f[i*s+j]=get[j].call(a,i);geo.setAttribute(k,new THREE.Float32BufferAttribute(f,s))}
  if(!o.matrixWorld.equals(new THREE.Matrix4())){geo.applyMatrix4(o.matrixWorld);o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);o.updateMatrix()}
  geo.computeBoundingBox();geo.computeBoundingSphere()});return g}
function glb(name,b64,ok0){const ok=g=>ok0(bakeGLTF(g));const L=new THREE.GLTFLoader();if(window.MeshoptDecoder)L.setMeshoptDecoder(MeshoptDecoder);const err=e=>{console.warn(name,e);if(name==="mech"||name==="enemy")fail()};
  try{if(window.GLB_BASE)L.load(GLB_BASE+name+".glb",ok,undefined,err);else{L.parse(b64buf(window[b64]),"",ok,err);window[b64]=null}}catch(e){err(e)}}
function lazyGLB(name,src,b64,ok){if(window.GLB_BASE){glb(name,b64,ok);return}const sc=document.createElement("script");sc.src=src;sc.onload=()=>glb(name,b64,ok);document.head.appendChild(sc)}
glb("enemy","ENEMY_GLB_B64",g=>{buildEnemyTemplate(g);for(const e of enemies)disposeEnemy(e);enemies.length=0;fillEnemies();okLoad()});
glb("mech","MECH_GLB_B64",g=>{FRAMES.mk2.gltf=g;FRAMES.mk2.obj=P=buildPlayer(g,"mk2");scene.add(P.root);okLoad()});
// boss + weak-point pod models (deployed build only; without them the boss falls back to the procedural hulk)
setTimeout(()=>voPreload(INTRO_LINES.map(L=>L.vo)),4000); // opening narration ready before the tutorial is clicked
if(window.GLB_BASE)setTimeout(()=>{glb("boss","",g=>{BOSS_GLTF=g});glb("boss_pod","",g=>{POD_GLTF=g})},2500);
frame();

/* ================= installable app (Chrome / Edge) ================= */
let installEvt=null;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;$("installBtn").hidden=false});
addEventListener("appinstalled",()=>{installEvt=null;$("installBtn").hidden=true});
$("installBtn").addEventListener("click",async()=>{if(!installEvt)return;sfx("uiok");installEvt.prompt();try{await installEvt.userChoice}catch(e){}installEvt=null;$("installBtn").hidden=true});
if("serviceWorker" in navigator&&location.protocol==="https:"&&!/claude\.ai|claudeusercontent/.test(location.host))navigator.serviceWorker.register("sw.js").catch(()=>{});
