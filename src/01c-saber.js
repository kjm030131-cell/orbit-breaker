/* ================= beam saber v2 ================= */
// Blade: one axial-billboard strip (always faces the camera around the blade axis) shaded as plasma —
// thin white-hot core, coloured glow, soft halo, flickering wisps, tapered tip. Bloom picks up the core.
// Arc: swing trail rebuilt every frame from blade samples with Catmull-Rom subdivision, so even at 30 fps
// the slash reads as one smooth crescent with a hot leading edge.
const SABER_T={value:0},SABER_TX={value:null},TRAIL_TX={value:null},SABER_ON={value:0},TRAIL_ON={value:0};
function saberTexTick(){if(FXOK.blade&&!SABER_ON.value){SABER_TX.value=FXT.blade;SABER_ON.value=1}if(FXOK.trail&&!TRAIL_ON.value){TRAIL_TX.value=FXT.trail;TRAIL_ON.value=1}}
const saberGeo=(()=>{const g=new THREE.BufferGeometry(),N=24,p=[],idx=[];for(let i=0;i<=N;i++){const z=i/N;p.push(-1,0,z,1,0,z)}
  for(let i=0;i<N;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}g.setAttribute("position",new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);return g})();
const SABER_NOISE=`float h1(float x){return fract(sin(x)*43758.5453);}float n1(float x){float i=floor(x),f=fract(x);return mix(h1(i),h1(i+1.),f*f*(3.-2.*f));}`;
function saberMat(color,w){return new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uW:{value:w},uT:SABER_T,uSeed:{value:Math.random()*20},tB:SABER_TX,uTex:SABER_ON},
  vertexShader:`uniform float uW;varying vec2 vUv;
  void main(){vec3 b=(modelMatrix*vec4(0.,0.,0.,1.)).xyz,t=(modelMatrix*vec4(0.,0.,1.,1.)).xyz,ax=normalize(t-b+1e-6);float sc=length(modelMatrix[0].xyz);
    vec3 p=mix(b,t,position.z),sd=cross(ax,normalize(cameraPosition-p));float l=length(sd);sd=l>1e-4?sd/l:vec3(1.,0.,0.);
    p+=sd*position.x*uW*sc;vUv=vec2(position.x,position.z);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
  fragmentShader:`uniform vec3 uColor;uniform float uT,uSeed,uTex;uniform sampler2D tB;varying vec2 vUv;${SABER_NOISE}
  void main(){
    if(uTex>.5){ // painted blade: R = white-hot core, G = plasma glow; a second, scrolling glow sample keeps the tendrils crawling
      float v=vUv.y,x=vUv.x*.5+.5,fl=.9+.1*n1(uT*31.+uSeed);vec2 s=texture2D(tB,vec2(x,v)).rg;
      float g2=texture2D(tB,vec2(x,fract(v*.85-uT*.55+uSeed))).g*smoothstep(.97,.85,v)*smoothstep(0.,.06,v);
      float g=max(s.g,g2*.9)*fl,halo=exp(-abs(vUv.x)*3.2)*.18*smoothstep(1.,.9,v);
      gl_FragColor=vec4(uColor*(g*1.55+halo)+mix(uColor,vec3(1.),.7)*s.r*.5+vec3(1.)*s.r*1.25,1.);return;}
float v=vUv.y,r=(v>.88?sqrt(max(0.,(1.-v)/.12)):1.)*(.78+.22*smoothstep(0.,.06,v));
    float fl=.88+.12*n1(uT*31.+uSeed)+.08*n1(v*16.-uT*24.+uSeed);
    float d=abs(vUv.x)/max(r,.001),ed=smoothstep(1.,.75,abs(vUv.x));
    float core=smoothstep(.17,.03,d)*step(.02,r);
    float glow=exp(-d*d*10.)*fl,halo=exp(-d*3.4)*.42*fl;
    float wisp=n1(v*34.-uT*46.+abs(vUv.x)*9.+uSeed)*smoothstep(.18,.5,d)*smoothstep(.95,.45,d)*.4;
    vec3 c=uColor*(glow*1.5+halo+wisp)+mix(uColor,vec3(1.),.65)*smoothstep(.38,.12,d)*.55+vec3(1.)*core*1.7;
    gl_FragColor=vec4(c*ed,1.);}`,
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})}
function saberMesh(color,w,len){const m=new THREE.Mesh(saberGeo,saberMat(color,w));m.scale.z=len;m.frustumCulled=false;m.renderOrder=3;return m}

const ARC_SUB=4;
function makeArc(n){const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(n*6),3));
  geo.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(n*4),2));geo.setAttribute("fade",new THREE.BufferAttribute(new Float32Array(n*2),1));
  const idx=[];for(let i=0;i<n-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}geo.setIndex(idx);
  const mat=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color()},uT:SABER_T,tT:TRAIL_TX,uTex:TRAIL_ON},
    vertexShader:`attribute float fade;varying vec2 vUv;varying float vF;void main(){vUv=uv;vF=fade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 uColor;uniform float uT,uTex;uniform sampler2D tT;varying vec2 vUv;varying float vF;${SABER_NOISE}
    void main(){float v=vUv.y,f=vF;
      if(uTex>.5){vec2 s=texture2D(tT,vec2(.12+.88*f,v*.92+.04)).rg;gl_FragColor=vec4(uColor*s.g*f*1.7+vec3(1.)*s.r*f*1.5,1.);return;}float streak=.75+.25*n1(v*40.+uT*8.);
      float edge=smoothstep(.8,.96,v)*smoothstep(1.,.965,v);float body=pow(v,2.4)*.8*streak;
      vec3 c=uColor*body*f*1.4+mix(uColor,vec3(1.),.55)*smoothstep(.55,.93,v)*f*f*.55+vec3(1.)*edge*f*f*1.5;gl_FragColor=vec4(c,1.);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);return{n,geo,mat,mesh,raw:[]}}
function crom(p0,p1,p2,p3,t,o){const t2=t*t,t3=t2*t;return o.set(0,0,0).addScaledVector(p0,-.5*t3+t2-.5*t).addScaledVector(p1,1.5*t3-2.5*t2+1).addScaledVector(p2,-1.5*t3+2*t2+.5*t).addScaledVector(p3,.5*t3-.5*t2)}
function stepArc(A,dt,base,tip,active,color,life){life=life||.22;const R=A.raw;for(const p of R)p.age+=dt;
  if(active)R.unshift({b:base.clone(),t:tip.clone(),age:0});
  while(R.length&&(R[R.length-1].age>life||R.length>(A.n-1)/ARC_SUB+1))R.pop();
  A.mat.uniforms.uColor.value.copy(color);
  const pos=A.geo.attributes.position.array,uv=A.geo.attributes.uv.array,fd=A.geo.attributes.fade.array,ob=new V3(),ot=new V3();let k=0;
  for(let i=0;i<R.length-1&&k<A.n;i++){const p0=R[Math.max(0,i-1)],p1=R[i],p2=R[i+1],p3=R[Math.min(R.length-1,i+2)];
    for(let s=0;s<ARC_SUB&&k<A.n;s++){const t=s/ARC_SUB;crom(p0.b,p1.b,p2.b,p3.b,t,ob);crom(p0.t,p1.t,p2.t,p3.t,t,ot);
      const age=p1.age+(p2.age-p1.age)*t,f=Math.pow(Math.max(0,1-age/life),1.4);
      pos[k*6]=ob.x;pos[k*6+1]=ob.y;pos[k*6+2]=ob.z;pos[k*6+3]=ot.x;pos[k*6+4]=ot.y;pos[k*6+5]=ot.z;uv[k*4]=f;uv[k*4+1]=0;uv[k*4+2]=f;uv[k*4+3]=1;fd[k*2]=fd[k*2+1]=f;k++}}
  if(k)fd[(k-1)*2]=fd[(k-1)*2+1]=0;
  for(let j=k;j<A.n;j++){for(let q=0;q<6;q++)pos[j*6+q]=k?pos[(k-1)*6+q]:0;fd[j*2]=fd[j*2+1]=0}
  A.mesh.visible=k>1;A.geo.attributes.position.needsUpdate=A.geo.attributes.uv.needsUpdate=A.geo.attributes.fade.needsUpdate=true}

/* hilt model (models/hilt.glb, emitter end = +Y, 0.98 long): cloned onto every saber once loaded */
let HILT=null;const HILT_Q=[];
function attachHilt(parent,len,pos,rotX,hide){const go=()=>{const m=HILT.clone();m.scale.setScalar(len/.98);m.position.copy(pos);m.rotation.x=rotX||0;
  m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false}});parent.add(m);if(hide)hide.visible=false};HILT?go():HILT_Q.push(go)}
(function(){if(!window.GLB_BASE)return;setTimeout(()=>glb("hilt",null,g=>{HILT=g.scene;HILT.traverse(o=>{if(o.isMesh&&o.material&&ENV){o.material.envMap=ENV;o.material.envMapIntensity=.6}});
  HILT_Q.splice(0).forEach(f=>f())}),900)})();
