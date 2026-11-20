import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { cameraStops, clamp, damp } from './journey.js';

const C = { cyan: 0x52e9e4, violet: 0x8c64fb, amber: 0xf6a23a, white: 0xd9fff2 };
const metal = new THREE.MeshStandardMaterial({ color: 0x303943, metalness: 0.88, roughness: 0.3 });
const dark = new THREE.MeshStandardMaterial({ color: 0x111721, metalness: 0.68, roughness: 0.42 });
const silver = new THREE.MeshStandardMaterial({ color: 0x8eabb4, metalness: 0.9, roughness: 0.24 });
const lightMaterials = new Map();
function glow(color, intensity = 2) {
  const key = `${color}-${intensity}`;
  if (!lightMaterials.has(key)) lightMaterials.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, toneMapped: false }));
  return lightMaterials.get(key);
}
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); parent.add(m); return m; }
function box(parent, w,h,d,x,y,z,mat = metal) { return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z); }
function torus(parent,r,t,mat,x=0,y=0,z=0,segments=128) { return mesh(new THREE.TorusGeometry(r,t,10,segments),mat,parent,x,y,z); }
function cylinder(parent,r,h,x,y,z,mat=metal) { return mesh(new THREE.CylinderGeometry(r,r,h,64),mat,parent,x,y,z); }
function label(parent, text, x,y,z, width=6, color='#c9fff0') {
  const canvas = document.createElement('canvas'); canvas.width=1024; canvas.height=128;
  const ctx=canvas.getContext('2d'); ctx.fillStyle=color; ctx.font='500 52px monospace'; ctx.textAlign='center';ctx.fillText(text,512,78);
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  const m=mesh(new THREE.PlaneGeometry(width,width/8),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}),parent,x,y,z);return m;
}

const portalVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const portalFragment = `
  varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uEnergy;
  void main(){
    vec2 p=vUv*2.-1.; float r=length(p); float a=atan(p.y,p.x);
    float twist=sin(a*9.+r*16.-uTime*.8)*.05+sin(a*17.-uTime)*.022;
    float waves=pow(.5+.5*sin(r*48.-uTime*2.+a*3.+twist*16.),7.);
    float rim=exp(-abs(r-.87+twist)*26.);
    float cloud=(sin(a*7.+r*15.-uTime*.3)*sin(a*11.-r*23.+uTime*.2)+1.)*.18;
    float core=exp(-r*6.); float alpha=smoothstep(1.,.72,r)*(.12+rim*.8+waves*.14+cloud*.17);
    vec3 col=mix(vec3(.06,.09,.14),uColor,rim*.8+waves*.2+core*.7);
    col+=uColor*rim*(1.4+uEnergy)+vec3(.8,.45,.13)*core*.5;
    gl_FragColor=vec4(col,alpha);
  }`;

export class QuantumWorld {
  constructor(canvas, { onReady, onObject, onQuality }) {
    this.canvas=canvas; this.onObject=onObject; this.onQuality=onQuality;this.progress=0;this.target=0;this.pointer=new THREE.Vector2();this.mouse=new THREE.Vector2();this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.small=innerWidth<760;this.low=this.small || (navigator.hardwareConcurrency||8)<5;this.visible=true;this.time=0;this.disposed=false;this.frameTimes=[];
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:!this.low,alpha:false,powerPreference:'high-performance'});
    this.renderer.setClearColor(0x090b13);this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.low?1.25:1.65));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x090b13,.018);
    this.camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,180);
    this.scene.add(new THREE.HemisphereLight(0x9adbe9,0x1a0b29,1.6));
    const sun=new THREE.DirectionalLight(0xa9cce9,3);sun.position.set(5,14,8);this.scene.add(sun);
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.65,.55,1.05);this.composer.addPass(this.bloom);
    this.composer.setPixelRatio(Math.min(devicePixelRatio,this.low?1:1.4));
    this.path=new THREE.CatmullRomCurve3(cameraStops.map(s=>new THREE.Vector3(...s.p)),false,'catmullrom',.3);
    this.targets=new THREE.CatmullRomCurve3(cameraStops.map(s=>new THREE.Vector3(...s.look)),false,'catmullrom',.3);
    this.rotators=[];this.floaters=[];this.portals=[];this.interactives=[];this.groups=[];this.doors=[];
    this.buildPortal();this.buildLab();this.buildAuditorium();this.buildTimeline();this.buildPub();this.buildFinal();this.buildConnections();this.buildDust();
    this.raycaster=new THREE.Raycaster();this.clock=new THREE.Clock();this.look=new THREE.Vector3();this.pos=new THREE.Vector3();
    this.resize=()=>{this.small=innerWidth<760;this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.composer.setSize(innerWidth,innerHeight);};
    this.move=e=>{this.pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);};
    this.click=e=>{if(e.target!==canvas)return;this.raycaster.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),this.camera);const hit=this.raycaster.intersectObjects(this.interactives,true)[0];if(hit){let o=hit.object;while(!o.userData.action&&o.parent)o=o.parent;if(o.userData.action)this.onObject(o.userData.action);}};
    this.visibility=()=>{this.visible=!document.hidden;this.clock.getDelta();};
    this.contextLost=e=>{e.preventDefault();canvas.dispatchEvent(new CustomEvent('world-error'));};
    addEventListener('resize',this.resize);addEventListener('pointermove',this.move);canvas.addEventListener('click',this.click);document.addEventListener('visibilitychange',this.visibility);canvas.addEventListener('webglcontextlost',this.contextLost);
    this.animate();onReady();
  }
  group(x,y,z){const g=new THREE.Group();g.position.set(x,y,z);this.scene.add(g);this.groups.push(g);return g;}
  light(g,color,intensity,x,y,z,distance=35){const l=new THREE.PointLight(color,intensity,distance,2);l.position.set(x,y,z);g.add(l);return l;}
  portal(g,r=6,color=C.cyan) {
    const rotor=new THREE.Group();g.add(rotor);
    torus(rotor,r,.28,metal);torus(rotor,r-.38,.035,glow(color,3));torus(rotor,r+.42,.08,silver);
    const teeth=new THREE.InstancedMesh(new THREE.BoxGeometry(.28,.65,.65),metal,64);const dummy=new THREE.Object3D();
    for(let i=0;i<64;i++){const a=i/64*Math.PI*2;dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,0);dummy.rotation.z=a;dummy.updateMatrix();teeth.setMatrixAt(i,dummy.matrix);}rotor.add(teeth);
    const segments=new THREE.Group();rotor.add(segments);
    for(let i=0;i<12;i++){const arc=mesh(new THREE.TorusGeometry(r+.8,.065,8,20,Math.PI/8),glow(i%3===0?C.amber:color,2),segments);arc.rotation.z=i*Math.PI/6;}
    this.rotators.push({obj:rotor,speed:.025,axis:'z'});
    for(let i=0;i<3;i++){const tilted=torus(g,r+.6+i*.32,.035,i===1?glow(C.amber,2):silver);tilted.rotation.set(.18+i*.24,.12+i*.2,i*.5);this.rotators.push({obj:tilted,speed:(i%2?-.04:.05),axis:'z'});}
    for(let j=1;j<=6;j++){const inside=torus(g,r-j*.2,.07,j%2?metal:glow(color,.7),0,0,-j*.6);inside.rotation.z=j*.1;}
    const shader=new THREE.ShaderMaterial({vertexShader:portalVertex,fragmentShader:portalFragment,uniforms:{uTime:{value:0},uColor:{value:new THREE.Color(color)},uEnergy:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    mesh(new THREE.PlaneGeometry(r*2,r*2),shader,g,0,0,-2);this.portals.push(shader);
    this.light(g,color,65,0,0,2,28);this.light(g,C.amber,45,-r,-2,3,25);
  }
  buildPortal(){
    const g=this.group(3,1.5,0);this.portal(g,6.1);
    const floor=mesh(new THREE.PlaneGeometry(110,110),new THREE.MeshStandardMaterial({color:0x141923,metalness:.85,roughness:.28}),g,0,-7,0);floor.rotation.x=-Math.PI/2;
    // Concentric floor machining and radial landing lights establish scale.
    for(let i=0;i<7;i++){const ring=torus(g,7+i*2,.018,i%2?metal:glow(C.cyan,.45),0,-6.95,0);ring.rotation.x=Math.PI/2;}
    for(let i=-6;i<=6;i++){box(g,.025,.025,50,i*3,-6.9,5,glow(C.cyan,.35));}
    for(const side of [-1,1]){box(g,1.2,12,1.9,side*8,-1,-1);box(g,.05,9,.08,side*7.35,-1,.01,glow(C.cyan,2));box(g,3,.8,4,side*8,-6.6,-.5,dark);}
    label(g,'Q B / REALITY ENGINE',0,8,-.5,7);
    label(g,'EST. IN ANOTHER DIMENSION',0,-5.3,1,4,'#8bafa9');
    const seed=mesh(new THREE.IcosahedronGeometry(.33,2),glow(C.amber,3),g,0,0,-3);this.floaters.push({obj:seed,base:0,phase:0});
    g.userData.action='portal';this.interactives.push(g);
  }
  buildLab(){
    const g=this.group(12,0,-40);
    const floor=cylinder(g,13,.7,0,-5,0,dark);floor.material=metal;
    for(let i=0;i<5;i++){const ring=torus(g,3+i*2.15,.045,glow(C.cyan,.6),0,-4.6,0);ring.rotation.x=Math.PI/2;}
    const reactor=new THREE.Group();g.add(reactor);
    const core=mesh(new THREE.IcosahedronGeometry(2.1,1),new THREE.MeshPhysicalMaterial({color:0x76e5dc,metalness:.5,roughness:.12,transparent:true,opacity:.7,wireframe:false}),reactor,0,1,0);
    const cage=mesh(new THREE.IcosahedronGeometry(2.6,1),new THREE.MeshBasicMaterial({color:C.cyan,wireframe:true}),reactor,0,1,0);this.rotators.push({obj:cage,speed:.12,axis:'y'});
    for(let i=0;i<5;i++){const ring=torus(reactor,3.3+i*.3,.10,i%2?metal:glow(C.cyan,2),0,1,0);ring.rotation.set(i*.8,.4+i*.6,i*.25);this.rotators.push({obj:ring,speed:i%2?.11:-.08,axis:'y'});}
    cylinder(g,3,.7,0,-3.7,0);cylinder(g,2.6,.07,0,-3.3,0,glow(C.cyan,2));cylinder(g,4,.6,0,7,0);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const x=Math.cos(a)*11,z=Math.sin(a)*11;box(g,.6,14,.6,x,1,z);box(g,.055,10,.08,x-.32,1,z,glow(C.cyan,1));const beam=box(g,10,.2,.3,x*.5,7,z*.5);beam.rotation.y=-a;}
    label(g,'REALITY RESEARCH LAB',0,5,-8,11);this.light(g,C.cyan,100,0,2,0,35);this.light(g,C.violet,70,-7,4,-5,25);
    for(let i=0;i<3;i++){const panel=box(g,2.5,1.6,.04,6+i*.2,0+i*1.9,-5, new THREE.MeshBasicMaterial({color:C.cyan,wireframe:true}));panel.rotation.y=-.5;label(g,['SUPERPOSITION','ENTANGLEMENT','GOOD CONVERSATIONS'][i],6+i*.2,.1+i*1.9,-4.9,2.3);}
    core.userData.action='event';this.interactives.push(core);
  }
  portrait(g,x,y,z,index){
    // Sculptural busts in a holographic display, deliberately fictional.
    const p=new THREE.Group();p.position.set(x,y,z);g.add(p);
    const mat=new THREE.MeshStandardMaterial({color:[C.cyan,C.violet,C.amber][index],emissive:[C.cyan,C.violet,C.amber][index],emissiveIntensity:.28,metalness:.7,roughness:.3,flatShading:true});
    const head=mesh(new THREE.IcosahedronGeometry(.63,2),mat,p,0,.6,0);head.scale.set(.8,1.15,.85);
    const shoulders=mesh(new THREE.SphereGeometry(1,20,12),mat,p,0,-.65,0);shoulders.scale.set(1,.75,.45);
    const scan=box(p,2.1,.02,.05,0,.4,.8,glow([C.cyan,C.violet,C.amber][index],2));this.floaters.push({obj:scan,base:.4,phase:index});return p;
  }
  buildAuditorium(){
    const g=this.group(-8,0,-86);cylinder(g,13,1,0,-4,0,dark);
    for(let i=0;i<5;i++){cylinder(g,7-i*.65,.26,0,-3.3+i*.26,0,metal);const r=torus(g,7-i*.65,.022,glow(C.violet,1),0,-3.15+i*.26,0);r.rotation.x=Math.PI/2;}
    for(let i=0;i<3;i++){
      const x=(i-1)*5,z=i===1?-2:0;const p=new THREE.Group();p.position.set(x,0,z);g.add(p);
      box(p,3.8,5.9,.18,0,.8,0,dark);box(p,3.5,5.6,.025,0,.8,.12,new THREE.MeshPhysicalMaterial({color:[C.cyan,C.violet,C.amber][i],transparent:true,opacity:.08,metalness:.5,roughness:.2,side:THREE.DoubleSide}));
      for(const side of [-1,1])box(p,.025,5.6,.04,side*1.8,.8,.15,glow([C.cyan,C.violet,C.amber][i],1));
      this.portrait(p,0,1,.3,i);label(p,['VERA SALVAT','LEO NAKAMURA','INÉS VEGA'][i],0,-1,.4,3);label(p,['QUANTUM','AI / CREATIVITY','FUTURE SYSTEMS'][i],0,-1.7,.4,2.6);
      p.userData.action=`speaker:${i}`;this.interactives.push(p);this.floaters.push({obj:p,base:0,phase:i*2});
    }
    for(let row=0;row<3;row++)for(let i=0;i<24;i++){const a=i/24*Math.PI*1.5+.2;const r=9+row*1.8;const b=box(g,.7,.4,.7,Math.cos(a)*r,-2.5+row*.35,Math.sin(a)*r,metal);b.rotation.y=-a;}
    label(g,'MINDS WITHOUT LIMITS',0,6,-4,12,'#b19aff');this.light(g,C.violet,140,0,4,2,40);
    for(let i=0;i<6;i++){const r=torus(g,15+i*.8,.025,glow(C.violet,.4),0,8+i,-3);r.rotation.x=Math.PI/2;}
  }
  buildTimeline(){
    const g=this.group(8,0,-132);const points=[];
    for(let i=0;i<350;i++){const t=i/349;const a=t*Math.PI*8;points.push(new THREE.Vector3(Math.cos(a)*6,Math.sin(a)*6,12-t*32));}
    const curve=new THREE.CatmullRomCurve3(points);mesh(new THREE.TubeGeometry(curve,600,.055,6,false),glow(C.cyan,1.8),g);
    const twin=mesh(new THREE.TubeGeometry(curve,600,.025,5,false),glow(C.violet,2),g);twin.rotation.z=Math.PI;
    const times=['18:00','18:30','19:15','19:45','20:15','21:00'];
    for(let i=0;i<18;i++){const z=10-i*1.8;const ring=torus(g,7,.08,i%3===0?glow(C.cyan,1):metal,0,0,z);ring.rotation.z=i*.15;
      if(i%3===0){const n=i/3;const a=n*.7;label(g,times[n],Math.cos(a)*4,Math.sin(a)*4,z,3);const orb=mesh(new THREE.OctahedronGeometry(.35),glow(C.amber,2),g,Math.cos(a)*4,Math.sin(a)*4-1,z);orb.userData.action='schedule';this.interactives.push(orb);}
    }
    this.light(g,C.cyan,100,0,0,0,35);
  }
  beer(g,x,y,z,scale=1){
    const b=new THREE.Group();b.position.set(x,y,z);b.scale.setScalar(scale);g.add(b);
    cylinder(b,.33,.9,0,0,0,new THREE.MeshPhysicalMaterial({color:0xcce8d8,metalness:.1,roughness:.08,transparent:true,opacity:.22,side:THREE.DoubleSide}));
    cylinder(b,.28,.72,0,-.04,0,new THREE.MeshStandardMaterial({color:C.amber,emissive:C.amber,emissiveIntensity:.35,metalness:.3,roughness:.2}));cylinder(b,.29,.14,0,.35,0,new THREE.MeshStandardMaterial({color:0xffefcf,roughness:.9}));
    const handle=torus(b,.23,.065,silver,.36,.04,0,32);handle.scale.x=.75;b.userData.action='beer';this.interactives.push(b);return b;
  }
  buildPub(){
    const g=this.group(-3,0,-183);
    box(g,28,.6,28,0,-3,0,dark);box(g,28,.6,28,0,9,0,dark);box(g,28,12,.5,0,3,-10,dark);
    for(let i=-6;i<=6;i++){box(g,.06,.03,26,i*2,-2.68,0,glow(C.amber,.35));box(g,.35,12,.35,i*2,3,-9,metal);}
    box(g,17,2.6,2.2,0,-1,-3,metal);box(g,17.4,.25,2.6,0,.4,-3,silver);box(g,16,.08,.06,0,.22,-1.66,glow(C.amber,3));
    for(let i=0;i<12;i++)box(g,.05,2.3,.05,-8+i*1.45,-1,-1.86,glow(C.amber,.8));
    for(let i=0;i<5;i++){const x=(i-2)*2.8;cylinder(g,.65,.2,x,-.8,1.5,silver);cylinder(g,.09,1.7,x,-1.7,1.5);cylinder(g,.6,.1,x,-2.55,1.5);this.beer(g,x,.95,-2.7,.8);}
    for(let i=0;i<3;i++){const x=(i-1)*3;box(g,.16,1.6,.16,x,1.3,-3.5,silver);box(g,.16,.16,.7,x,2,-3.2,silver);box(g,.1,.6,.1,x,2.4,-3,glow(C.amber,1));}
    for(let shelf=0;shelf<2;shelf++){box(g,14,.12,.8,0,2+shelf*2,-8);for(let i=0;i<17;i++){const b=cylinder(g,.13,.6+((i*7)%5)*.08,-6.4+i*.8,2.4+shelf*2,-8,new THREE.MeshStandardMaterial({color:i%3?0x355a42:0xe3a23d,metalness:.4,roughness:.2}));}}
    label(g,'THE QUANTUM PUB',0,6.5,-8.8,15,'#ffc17a');label(g,'GOOD PEOPLE. UNCERTAIN REALITY. CERTAIN BEER.',0,5.2,-8.7,10,'#bda280');
    for(const x of [-9,9]){cylinder(g,.06,4,x,7,-1);const lamp=mesh(new THREE.ConeGeometry(1,.55,32),metal,g,x,4.8,-1);this.light(g,C.amber,160,x,4,-1,24);}
    const arcade=new THREE.Group();arcade.position.set(10,-.9,-3);arcade.rotation.y=-.4;g.add(arcade);box(arcade,2.6,3.5,1.8,0,0,0);box(arcade,2.15,1.5,.05,0,.6,1,glow(C.violet,.5));label(arcade,'BALANCE',0,1.8,1,2);const atom=torus(arcade,.48,.04,glow(C.cyan,2),0,.6,1.1);atom.rotation.y=.5;arcade.userData.action='balance';this.interactives.push(arcade);
    const floating=this.beer(g,-5,2,3,1.6);this.floaters.push({obj:floating,base:2,phase:0});this.rotators.push({obj:floating,speed:.2,axis:'y'});
    label(g,'Q: QUBIT LABS',-5,3,-8.7,3);label(g,'NEURAL ↗',0,3,-8.7,3);label(g,'PLANCK BREWING',5,3,-8.7,3);
  }
  buildFinal(){
    const g=this.group(0,1,-230);this.portal(g,5,C.white);
    for(let i=0;i<5;i++){cylinder(g,10-i*.9,.3,0,-5+i*.3,3,metal);const r=torus(g,10-i*.9,.035,glow(C.cyan,.8),0,-4.8+i*.3,3);r.rotation.x=Math.PI/2;}
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const x=Math.cos(a)*10,z=Math.sin(a)*10;box(g,.25,7,.25,x,-1,z,dark);box(g,.04,5,.04,x,-1,z+.15,glow(C.white,1));}
    label(g,'NEXT STOP: REAL LIFE.',0,7,0,11);g.userData.action='tickets';this.interactives.push(g);
  }
  buildConnections(){
    // Physical transition gates follow the same camera spline.
    const gateGeo=new THREE.TorusGeometry(4.4,.075,6,64);const gateMetal=new THREE.TorusGeometry(4.7,.2,6,64);
    const forward=new THREE.Vector3(0,0,1);const tangent=new THREE.Vector3();
    for(const [from,to,color] of [[.075,.17,C.cyan],[.29,.37,C.violet],[.49,.57,C.violet],[.68,.76,C.amber],[.88,.94,C.white]]){
      for(let i=0;i<13;i++){
        const t=from+(to-from)*i/12;const g=new THREE.Group();g.position.copy(this.path.getPoint(t));tangent.copy(this.path.getTangent(t));g.quaternion.setFromUnitVectors(forward,tangent);this.scene.add(g);
        mesh(gateGeo,glow(color,i%3===0?2:.6),g);mesh(gateMetal,metal,g);g.rotation.z+=i*.08;
        for(let j=0;j<4;j++){const a=j*Math.PI/2+i*.1;box(g,.12,.8,.4,Math.cos(a)*4.7,Math.sin(a)*4.7,0,glow(color,1));}
      }
    }
    const door=this.group(2,1.5,-57);for(const s of [-1,1]){const panel=box(door,3.5,10,.6,s*1.8,0,0,dark);box(panel,.05,9,.08,-s*1.7,0,.35,glow(C.cyan,2));this.doors.push({obj:panel,side:s});}
  }
  buildDust(){
    const count=this.low?700:1800;const positions=new Float32Array(count*3);let seed=52;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<count;i++){positions[i*3]=(random()-.5)*100;positions[i*3+1]=(random()-.5)*65;positions[i*3+2]=25-random()*290;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));this.dust=new THREE.Points(geo,new THREE.PointsMaterial({color:0xa6ccc9,size:.045,transparent:true,opacity:.65,sizeAttenuation:true,depthWrite:false}));this.scene.add(this.dust);
  }
  setProgress(p){this.target=clamp(p);}
  setReduced(value){this.reduced=value;}
  pulse(){this.pulseTime=this.time;}
  animate=()=>{
    if(this.disposed)return;this.raf=requestAnimationFrame(this.animate);const dt=Math.min(this.clock.getDelta(),.05);if(!this.visible)return;
    this.time+=dt;const t=this.time;this.progress=this.reduced?this.target:damp(this.progress,this.target,dt,5.5);this.mouse.lerp(this.pointer,1-Math.exp(-dt*3));
    this.path.getPoint(this.progress,this.pos);this.targets.getPoint(this.progress,this.look);
    if(this.small && this.progress<.07){this.pos.x+=3;this.pos.z+=7;this.look.x+=1;}
    if(!this.reduced){this.pos.x+=this.mouse.x*.28;this.pos.y+=this.mouse.y*.18;}
    this.camera.position.copy(this.pos);this.camera.lookAt(this.look);
    if(!this.reduced){for(const r of this.rotators)r.obj.rotation[r.axis]+=dt*r.speed;for(const f of this.floaters)f.obj.position.y=f.base+Math.sin(t*.65+f.phase)*.2;}
    for(const p of this.portals){p.uniforms.uTime.value=this.reduced?0:t;p.uniforms.uEnergy.value=this.pulseTime?Math.max(0,1-(t-this.pulseTime))*3:0;}
    const opening=clamp((this.progress-.25)/.055);for(const d of this.doors)d.obj.position.x=d.side*(1.8+opening*4.5);
    if(this.low)this.renderer.render(this.scene,this.camera);else this.composer.render();
    if(t>4&&t<8){this.frameTimes.push(dt);if(this.frameTimes.length>=100){const avg=this.frameTimes.reduce((a,b)=>a+b,0)/this.frameTimes.length;if(avg>.027&&!this.low){this.low=true;this.renderer.setPixelRatio(1.2);this.onQuality?.('eco');}this.frameTimes=[];}}
  };
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);removeEventListener('resize',this.resize);removeEventListener('pointermove',this.move);this.canvas.removeEventListener('click',this.click);document.removeEventListener('visibilitychange',this.visibility);this.canvas.removeEventListener('webglcontextlost',this.contextLost);this.scene.traverse(o=>{o.geometry?.dispose();});this.composer.dispose();this.renderer.dispose();}
}
