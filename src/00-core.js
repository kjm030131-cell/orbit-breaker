const $=id=>document.getElementById(id);
const V3=THREE.Vector3, clamp=THREE.MathUtils.clamp, lerp=THREE.MathUtils.lerp;

/* ================= renderer ================= */
const stage=$("stage");
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.outputEncoding=THREE.sRGBEncoding;
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x020308);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,0.1,4000);
let ENV=null;try{const pm=new THREE.PMREMGenerator(renderer);ENV=pm.fromScene(new THREE.RoomEnvironment(),0.04).texture}catch(e){}
let composer=null;
try{
  composer=new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene,camera));
  composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),1.05,0.6,0.84));
}catch(e){composer=null}

scene.add(new THREE.HemisphereLight(0x6f8cff,0x150a05,0.45));
const sun=new THREE.DirectionalLight(0xfff0dc,1.6);sun.position.set(5.3,8.5,49);scene.add(sun);
const rim=new THREE.DirectionalLight(0x58c8ff,1.0);rim.position.set(-20,-6,-40);scene.add(rim);

/* ================= textures ================= */
function ctex(size,draw){const c=document.createElement("canvas");c.width=c.height=size;draw(c.getContext("2d"),size);const t=new THREE.CanvasTexture(c);return t}
function radial(x,s,stops){const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);stops.forEach(([o,c])=>g.addColorStop(o,c));x.fillStyle=g;x.fillRect(0,0,s,s)}
const TX={
  glow:ctex(128,(x,s)=>radial(x,s,[[0,"rgba(255,255,255,1)"],[.2,"rgba(255,255,255,.6)"],[.5,"rgba(255,255,255,.15)"],[1,"rgba(255,255,255,0)"]])),
  core:ctex(64,(x,s)=>radial(x,s,[[0,"rgba(255,255,255,1)"],[.45,"rgba(255,255,255,.9)"],[1,"rgba(255,255,255,0)"]])),
  ring:ctex(256,(x,s)=>{const g=x.createRadialGradient(s/2,s/2,s*.28,s/2,s/2,s/2);g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(.62,"rgba(255,255,255,.95)");g.addColorStop(.75,"rgba(255,255,255,.3)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.fillRect(0,0,s,s)}),
  streak:ctex(256,(x,s)=>{x.translate(s/2,s/2);x.scale(1,.07);const g=x.createRadialGradient(0,0,0,0,0,s/2);g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(.35,"rgba(255,255,255,.75)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.beginPath();x.arc(0,0,s/2,0,Math.PI*2);x.fill()}),
  flare:ctex(256,(x,s)=>{radial(x,s,[[0,"rgba(255,255,255,1)"],[.12,"rgba(255,255,255,.7)"],[.35,"rgba(255,255,255,.1)"],[1,"rgba(255,255,255,0)"]]);
    x.globalCompositeOperation="lighter";[0,Math.PI/2,Math.PI/4,-Math.PI/4].forEach((a,i)=>{x.save();x.translate(s/2,s/2);x.rotate(a);x.scale(1,i<2?.035:.02);const g=x.createRadialGradient(0,0,0,0,0,s/2*(i<2?1:.6));g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.beginPath();x.arc(0,0,s/2,0,Math.PI*2);x.fill();x.restore()})}),
  smoke:ctex(128,(x,s)=>{for(let i=0;i<26;i++){const r=s*(.12+Math.random()*.2),cx=s/2+(Math.random()-.5)*s*.4,cy=s/2+(Math.random()-.5)*s*.4;const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,"rgba(255,255,255,.22)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.fillRect(0,0,s,s)}}),
};

/* ================= backdrop ================= */
(function(){
  const n=4000,pos=new Float32Array(n*3),col=new Float32Array(n*3);
  for(let i=0;i<n;i++){const v=new V3().randomDirection().multiplyScalar(1400+Math.random()*900);pos.set([v.x,v.y,v.z],i*3);
    const c=new THREE.Color().setHSL(Math.random()<.7?0.6:0.08,0.5,0.6+Math.random()*0.4);col.set([c.r,c.g,c.b],i*3)}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("color",new THREE.BufferAttribute(col,3));
  scene.add(new THREE.Points(g,new THREE.PointsMaterial({size:1.6,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.55,depthWrite:false})));
  try{new THREE.TextureLoader().load("sky.jpg",t=>{t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;scene.background=t})}catch(e){}
})();
const debris=[];
(function(){
  const m=new THREE.MeshStandardMaterial({color:0x1f1e22,roughness:.9,metalness:.1,flatShading:true});
  for(let i=0;i<70;i++){const s=0.6+Math.random()*3.2;const d=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0),m);
    d.position.set((Math.random()-.5)*260,(Math.random()-.5)*90,(Math.random()-.5)*260);
    d.userData.spin=new V3(Math.random(),Math.random(),Math.random()).multiplyScalar(.4);scene.add(d);debris.push(d)}
})();
