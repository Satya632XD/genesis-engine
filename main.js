
const c = document.getElementById('crosshair').getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const messageEl = document.getElementById('message');

const goalEl = document.getElementById('goal');
const shardsEl = document.getElementById('shards');
const timeEl = document.getElementById('time');
const healthFill = document.getElementById('healthFill');
const energyFill = document.getElementById('energyFill');
const healthText = document.getElementById('healthText');
const energyText = document.getElementById('energyText');

const coarse = matchMedia('(pointer: coarse)').matches;

const touch = {
  moveX: 0, moveY: 0, sprint: false, jump: false, interact: false,
  joyId: null, lookId: null, startX: 0, startY: 0, lastX: 0, lastY: 0, lookDX: 0, lookDY: 0
};

const G = {
  scene: null, camera: null, renderer: null, clock: new THREE.Clock(),
  state: 'menu', day: 1, time: 0.24, shards: 0, shrineCount: 0, totalShrines: 4,
  player: { pos: new THREE.Vector3(0,0,0), vel: new THREE.Vector3(), yaw: 0, pitch: -0.18, onGround: false, health: 100, energy: 100, hurt: 0, jumpLock: 0 },
  keys: Object.create(null),
  world: { shrines: [], crystals: [], deer: [], wolf: null, beacon: null, clouds: [] },
  ui: { locked: false }
};

const up = new THREE.Vector3(0,1,0);

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }
function smooth(t){ return t*t*(3-2*t); }
function hash2D(x,z,s=1337){ let n=x*374761393+z*668265263+s*2147483647; n=(n^(n>>13))*1274126177; return ((n^(n>>16))>>>0)/4294967295; }
function vnoise(x,z,s=1337){
  const x0=Math.floor(x), z0=Math.floor(z), xf=x-x0, zf=z-z0;
  const a=hash2D(x0,z0,s), b=hash2D(x0+1,z0,s), c=hash2D(x0,z0+1,s), d=hash2D(x0+1,z0+1,s);
  const u=smooth(xf), v=smooth(zf);
  return lerp(lerp(a,b,u), lerp(c,d,u), v);
}
function fbm(x,z,oct=5,p=0.5,scale=1,s=1337){
  let amp=1,freq=1/scale,sum=0,norm=0;
  for(let i=0;i<oct;i++){ sum += vnoise(x*freq,z*freq,s+i*1013) * amp; norm += amp; amp *= p; freq *= 2; }
  return sum/norm;
}
function mask(x,z,r=142){ const d=Math.sqrt(x*x+z*z)/r; const t=clamp(1-d,0,1); return t*t*(3-2*t); }
function hAt(x,z){
  let h = (fbm(x*0.015,z*0.015,6,0.5,1,9999)*20 + Math.abs(fbm(x*0.03,z*0.03,4,0.47,1,2222)-0.5)*20 + Math.sin(x*0.045)*0.7 + Math.cos(z*0.041)*0.6) * mask(x,z,142);
  h -= (1-mask(x,z,142))*12;
  if(Math.abs(x) < 16) h -= 5.1 * Math.max(0, 1 - Math.abs(z)/90);
  if(z > 45 && z < 72 && Math.abs(x) < 28) h -= 3.8;
  return h;
}
function slopeAt(x,z){ return Math.hypot(hAt(x+0.6,z)-hAt(x-0.6,z), hAt(x,z+0.6)-hAt(x,z-0.6)); }
function colorAt(h,s,m){
  const col = new THREE.Color();
  if(h < 0.5) col.setHex(0x2f7f68);
  else if(h < 4.5) col.setHex(0x47874d);
  else if(h < 11) col.setHex(0x6b7a4f);
  else if(h < 18) col.setHex(0x80795d);
  else col.setHex(0xa9b0b8);
  if(s > 0.92) col.lerp(new THREE.Color(0x9aa5ad), 0.55);
  col.lerp(new THREE.Color(0x3e8b5c), m * 0.18);
  return col;
}
function msg(t,ms=1700){
  messageEl.textContent = t; messageEl.classList.add('show');
  clearTimeout(G._msg); G._msg = setTimeout(() => messageEl.classList.remove('show'), ms);
}
function resize(){
  const w=innerWidth, h=innerHeight;
  const canvas = document.getElementById('crosshair');
  canvas.width = w * devicePixelRatio; canvas.height = h * devicePixelRatio;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  c.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  if(G.renderer){ G.renderer.setSize(w,h,false); G.camera.aspect = w/h; G.camera.updateProjectionMatrix(); }
}
addEventListener('resize', resize);

function drawCross(){
  const w=innerWidth, h=innerHeight;
  c.clearRect(0,0,w,h);
  c.save(); c.translate(w/2,h/2); c.strokeStyle='rgba(255,255,255,.8)'; c.lineWidth=2;
  c.beginPath(); c.moveTo(-9,0); c.lineTo(-3,0); c.moveTo(3,0); c.lineTo(9,0); c.moveTo(0,-9); c.lineTo(0,-3); c.moveTo(0,3); c.lineTo(0,9); c.stroke();
  c.restore();
}

function init(){
  G.scene = new THREE.Scene();
  G.scene.fog = new THREE.FogExp2(0xa7d7ff, 0.0014);
  G.camera = new THREE.PerspectiveCamera(66, innerWidth/innerHeight, 0.1, 1200);
  G.renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
  G.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  G.renderer.setSize(innerWidth, innerHeight);
  G.renderer.outputColorSpace = THREE.SRGBColorSpace;
  G.renderer.shadowMap.enabled = true;
  G.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.insertBefore(G.renderer.domElement, document.body.firstChild);

  const hemi = new THREE.HemisphereLight(0xdff5ff, 0x20424a, 1.25); G.scene.add(hemi); G.hemi = hemi;
  const sun = new THREE.DirectionalLight(0xffffff, 2.7);
  sun.position.set(70,120,40); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.near=4; sun.shadow.camera.far=280; sun.shadow.camera.left=-120; sun.shadow.camera.right=120; sun.shadow.camera.top=120; sun.shadow.camera.bottom=-120;
  G.scene.add(sun); G.sun = sun;
  const moon = new THREE.DirectionalLight(0xa9c8ff, 0.45); moon.position.set(-90,85,-60); G.scene.add(moon); G.moon = moon;

  buildTerrain(); buildWater(); buildSky(); buildProps(); buildShrines(); buildCrystals(); buildLife(); buildBeacon(); buildPlayer(); bindInput();
  resize(); loop();
}

function buildTerrain(){
  const geo = new THREE.PlaneGeometry(280,280,250,250); geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position, cols = [], col = new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i), z = pos.getZ(i), h = hAt(x,z), s = slopeAt(x,z), m = clamp((6 - Math.abs(x)*0.035 + Math.sin(z*0.03)*0.8 + fbm(x*0.01,z*0.01,3,0.55,1,4444)*2) / 8, 0, 1);
    pos.setY(i, h); col.copy(colorAt(h,s,m)); cols.push(col.r,col.g,col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols,3)); geo.computeVertexNormals();
  G.terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1, metalness:0 }));
  G.terrain.receiveShadow = true; G.scene.add(G.terrain);
}
function buildWater(){
  const geo = new THREE.PlaneGeometry(700,700,1,1); geo.rotateX(-Math.PI/2);
  G.water = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color:0x2a7eb2, roughness:0.18, metalness:0.03, clearcoat:0.4, clearcoatRoughness:0.12, transparent:true, opacity:0.68 }));
  G.water.position.y = 1.2; G.scene.add(G.water);
}
function buildSky(){
  G.sky = new THREE.Mesh(new THREE.SphereGeometry(500,32,18), new THREE.MeshBasicMaterial({ color:0x8ec8ff, side:THREE.BackSide }));
  G.scene.add(G.sky);
  const cloudMat = new THREE.MeshStandardMaterial({ color:0xffffff, transparent:true, opacity:0.72, roughness:1 });
  for(let i=0;i<14;i++){
    const grp = new THREE.Group();
    for(let j=0;j<3+Math.floor(Math.random()*3);j++){
      const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random()*2.2, 10, 8), cloudMat);
      puff.position.set((j-1)*3.3 + Math.random()*1.1, Math.random()*1.3, Math.random()*2.1-1);
      puff.scale.setScalar(0.7 + Math.random()*0.5);
      grp.add(puff);
    }
    grp.position.set((Math.random()*2-1)*160, 54+Math.random()*26, (Math.random()*2-1)*160);
    grp.scale.setScalar(0.8 + Math.random()*1.8);
    G.scene.add(grp);
    G.world.clouds.push(grp);
  }
}

function tree(x,y,z,scale=1){
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32*scale, 0.48*scale, 3.4*scale, 6), new THREE.MeshStandardMaterial({ color:0x6f4d30, roughness:1 }));
  trunk.position.set(x, y + 1.6*scale, z);
  const crown1 = new THREE.Mesh(new THREE.ConeGeometry(1.7*scale, 4.2*scale, 7), new THREE.MeshStandardMaterial({ color:0x316d44, roughness:1 }));
  crown1.position.set(x, y + 4.0*scale, z);
  const crown2 = new THREE.Mesh(new THREE.ConeGeometry(1.2*scale, 3.2*scale, 7), new THREE.MeshStandardMaterial({ color:0x3d8450, roughness:1 }));
  crown2.position.set(x + 0.3*scale, y + 5.0*scale, z - 0.2*scale);
  [trunk,crown1,crown2].forEach(o => { o.castShadow = o.receiveShadow = true; G.scene.add(o); });
}
function flower(x,y,z){
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,0.72,5), new THREE.MeshStandardMaterial({ color:0x3f8a49, roughness:1 }));
  stem.position.set(x,y+0.36,z);
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.11 + Math.random()*0.06, 7, 7), new THREE.MeshStandardMaterial({ color:new THREE.Color().setHSL(Math.random(),0.8,0.68), roughness:0.9 }));
  bloom.position.set(x,y+0.79,z);
  G.scene.add(stem,bloom);
}
function rock(x,y,z,scale=1){
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8*scale,0), new THREE.MeshStandardMaterial({ color:0x7f8991, roughness:1 }));
  r.position.set(x,y+0.42*scale,z); r.scale.set(1.2*scale,0.8*scale,1.05*scale);
  r.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
  r.castShadow = r.receiveShadow = true; G.scene.add(r);
}
function buildProps(){
  for(let i=0;i<120;i++){
    const x=(Math.random()*2-1)*120, z=(Math.random()*2-1)*120, y=hAt(x,z), m=fbm(x*0.02,z*0.02,3,0.52,1,7777);
    if(y>1.2 && slopeAt(x,z) < 0.9 && y < 19 && Math.abs(x)+Math.abs(z) < 188){
      if(m > 0.48 && Math.random() < 0.62) tree(x,y,z,0.9 + Math.random()*0.9);
      else if(Math.random() < 0.45) flower(x,y,z);
    }
  }
  for(let i=0;i<65;i++){
    const x=(Math.random()*2-1)*125, z=(Math.random()*2-1)*125, y=hAt(x,z);
    if(y > 1.4 && slopeAt(x,z) > 0.7) rock(x,y,z,0.7 + Math.random()*1.8);
  }
}
function shrineMesh(color){
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.5,1,8), new THREE.MeshStandardMaterial({ color:0x6f5a46, roughness:1 }));
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1,0), new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:0.9, roughness:0.35, metalness:0.05 }));
  gem.position.y = 1.35;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8,0.07,8,24), new THREE.MeshStandardMaterial({ color:0xffffff, emissive:color, emissiveIntensity:0.8, transparent:true, opacity:0.65 }));
  ring.rotation.x = Math.PI/2; ring.position.y = 1.35;
  g.add(base, gem, ring);
  return g;
}
function buildShrines(){
  [[-68,44],[71,22],[44,-66],[-58,-42]].forEach((p,i) => {
    const x=p[0], z=p[1], y=hAt(x,z), s = shrineMesh(i%2 ? 0xa1ffe5 : 0xffd56a);
    s.position.set(x, y+0.4, z);
    s.userData = { active:false, pulse:Math.random()*10, index:i };
    G.scene.add(s); G.world.shrines.push(s);
  });
}
function crystal(x,y,z){
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.55,0), new THREE.MeshStandardMaterial({ color:0xa7fff4, emissive:0x6ef5cf, emissiveIntensity:1.35, roughness:0.22, metalness:0.08 }));
  m.position.set(x,y+1.6,z); m.userData = { baseY:y+1.6, spin:Math.random()*6.28 };
  m.castShadow = true; G.scene.add(m); G.world.crystals.push(m);
}
function buildCrystals(){
  for(let i=0;i<14;i++){
    const x=(Math.random()*2-1)*108, z=(Math.random()*2-1)*108, y=hAt(x,z);
    if(y > 1.2) crystal(x,y,z);
  }
}
function deerMesh(){
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55,1.35,4,8), new THREE.MeshStandardMaterial({ color:0x9f7f5d, roughness:1 }));
  body.rotation.z = Math.PI/2; body.position.y = 1.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33,10,10), new THREE.MeshStandardMaterial({ color:0x8d6e4f, roughness:1 }));
  head.position.set(1.4,1.18,0);
  g.add(body,head); return g;
}
function wolfMesh(){
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.72,1.7,4,8), new THREE.MeshStandardMaterial({ color:0x181c23, roughness:0.98, metalness:0.02 }));
  body.rotation.z = Math.PI/2; body.position.y = 1.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45,10,10), new THREE.MeshStandardMaterial({ color:0x10141a, roughness:1, emissive:0x162033, emissiveIntensity:0.55 }));
  head.position.set(1.68,1.2,0);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8), new THREE.MeshStandardMaterial({ color:0xff6d7a, emissive:0xff3247, emissiveIntensity:1.8 }));
  eye.position.set(1.95,1.26,0.15);
  g.add(body,head,eye); return g;
}
function buildLife(){
  for(let i=0;i<8;i++){
    const m = deerMesh(), x=(Math.random()*2-1)*70, z=(Math.random()*2-1)*70, y=hAt(x,z);
    m.position.set(x,y+0.02,z); G.scene.add(m);
    G.world.deer.push({ mesh:m, vel:new THREE.Vector3(), target:new THREE.Vector3(x,y,z), timer:Math.random()*3, panic:0 });
  }
  const w = wolfMesh(); w.position.set(84, hAt(84,-26)+0.05, -26); w.visible = false; G.scene.add(w);
  G.world.wolf = { mesh:w, active:false, speed:7.1, damage:12 };
}
function buildBeacon(){
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.8,2.4,8), new THREE.MeshStandardMaterial({ color:0x5d4b39, roughness:1 }));
  const crystal = new THREE.Mesh(new THREE.ConeGeometry(1.2,4.8,6), new THREE.MeshStandardMaterial({ color:0xfff1b2, emissive:0xffd266, emissiveIntensity:1.1, roughness:0.2 }));
  crystal.position.y = 3.1;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2,0.12,8,18), new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xffcc66, emissiveIntensity:1, transparent:true, opacity:0.7 }));
  ring.position.y = 2.7; ring.rotation.x = Math.PI/2;
  g.add(base, crystal, ring); g.position.set(0, hAt(0,0)+0.35, 0); g.visible = false;
  G.scene.add(g); G.world.beacon = { mesh:g, ready:false, activated:false };
}
function buildPlayer(){ G.player.pos.set(0, hAt(0,0)+2.2, 0); G.playerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.45,1.0,4,8), new THREE.MeshStandardMaterial({ color:0x8cf7c6, roughness:0.8, metalness:0.05, emissive:0x134f3a, emissiveIntensity:0.6 })); G.playerBody.position.y = 1.0; G.playerBody.castShadow = true; G.scene.add(G.playerBody); }

function bindInput(){
  startBtn.addEventListener('click', startGame);
  addEventListener('keydown', e => {
    G.keys[e.code] = true;
    if(e.code === 'Space') e.preventDefault();
    if(e.code === 'KeyE') interact();
    if(e.code === 'KeyR' && G.state !== 'playing') resetRun();
    if(e.code === 'Escape' && G.ui.locked) document.exitPointerLock();
  });
  addEventListener('keyup', e => G.keys[e.code] = false);
  addEventListener('mousemove', e => {
    if(!G.ui.locked || G.state !== 'playing') return;
    G._mx = (G._mx || 0) + e.movementX;
    G._my = (G._my || 0) + e.movementY;
  });
  document.addEventListener('pointerlockchange', () => { G.ui.locked = document.pointerLockElement === document.body; });
  if(coarse) setupTouch();

  document.getElementById('jumpBtn').addEventListener('click', () => { if(G.state === 'playing') G.keys.Space = true; setTimeout(() => G.keys.Space = false, 60); });
  document.getElementById('sprintBtn').addEventListener('click', () => { if(coarse) touch.sprint = !touch.sprint; });
  document.getElementById('interactBtn').addEventListener('click', interact);
}

function setupTouch(){
  const joyZone = document.getElementById('joystickZone');
  const lookZone = document.getElementById('lookZone');
  const base = document.getElementById('joystickBase');
  const knob = document.getElementById('joystickKnob');

  const setKnob = (dx,dy) => {
    const limit = 34, len = Math.hypot(dx,dy), k = len > limit ? limit/len : 1, x = dx*k, y = dy*k;
    knob.style.transform = `translate(${x}px, ${y}px)`;
    touch.moveX = x / limit; touch.moveY = y / limit;
  };

  joyZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    touch.joyId = t.identifier;
    const r = base.getBoundingClientRect();
    touch.startX = r.left + r.width/2; touch.startY = r.top + r.height/2;
    setKnob(t.clientX - touch.startX, t.clientY - touch.startY);
    e.preventDefault();
  }, { passive:false });

  joyZone.addEventListener('touchmove', e => {
    for(const t of e.changedTouches) if(t.identifier === touch.joyId){ setKnob(t.clientX - touch.startX, t.clientY - touch.startY); e.preventDefault(); }
  }, { passive:false });

  joyZone.addEventListener('touchend', e => {
    for(const t of e.changedTouches) if(t.identifier === touch.joyId){ touch.joyId = null; knob.style.transform = 'translate(0px, 0px)'; touch.moveX = touch.moveY = 0; e.preventDefault(); }
  }, { passive:false });

  lookZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    touch.lookId = t.identifier; touch.lastX = t.clientX; touch.lastY = t.clientY;
  }, { passive:true });

  lookZone.addEventListener('touchmove', e => {
    for(const t of e.changedTouches) if(t.identifier === touch.lookId){ touch.lookDX += t.clientX - touch.lastX; touch.lookDY += t.clientY - touch.lastY; touch.lastX = t.clientX; touch.lastY = t.clientY; }
  }, { passive:true });

  lookZone.addEventListener('touchend', e => {
    for(const t of e.changedTouches) if(t.identifier === touch.lookId) touch.lookId = null;
  }, { passive:true });
}

function startGame(){
  overlay.classList.remove('visible');
  if(!coarse && document.body.requestPointerLock) document.body.requestPointerLock();
  if(G.state !== 'playing'){ G.state = 'playing'; msg('Restore the shrines. Then return to the beacon.'); }
}
function resetRun(){
  G.player.pos.set(0, hAt(0,0)+2.2, 0); G.player.vel.set(0,0,0); G.player.health = 100; G.player.energy = 100; G.player.yaw = 0; G.player.pitch = -0.18;
  G.day = 1; G.time = 0.24; G.shards = 0; G.shrineCount = 0; G.world.beacon.activated = false; G.world.beacon.mesh.visible = false;
  G.world.shrines.forEach((s,i) => { s.userData.active = false; s.children[1].material.emissiveIntensity = 0.9; s.children[2].material.opacity = 0.65; });
  G.world.crystals.forEach(o => G.scene.remove(o)); G.world.crystals.length = 0; buildCrystals();
  G.state = 'playing'; overlay.classList.remove('visible'); if(!coarse && document.body.requestPointerLock) document.body.requestPointerLock(); msg('New run started.');
}
function dirBasis(){
  const yaw = G.player.yaw;
  return { forward:new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)), right:new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)) };
}
function movePlayer(dt){
  const p = G.player;
  if(p.hurt > 0) p.hurt -= dt;
  if(p.jumpLock > 0) p.jumpLock -= dt;

  const mx = G._mx || 0, my = G._my || 0; G._mx = 0; G._my = 0;
  p.yaw -= mx * 0.0023; p.pitch -= my * 0.0023; p.pitch = clamp(p.pitch, -1.02, 0.28);

  let x=0, z=0, sprint=false, jump=false;
  if(coarse){
    x = touch.moveX; z = -touch.moveY; sprint = touch.sprint; jump = touch.jump;
  } else {
    if(G.keys.KeyW) z += 1; if(G.keys.KeyS) z -= 1; if(G.keys.KeyD) x += 1; if(G.keys.KeyA) x -= 1;
    sprint = G.keys.ShiftLeft || G.keys.ShiftRight; jump = G.keys.Space;
  }
  const moving = Math.hypot(x,z) > 0.12;
  if(moving){ const l = Math.hypot(x,z); x /= l; z /= l; }

  const { forward, right } = dirBasis();
  const desired = new THREE.Vector3().addScaledVector(right, x).addScaledVector(forward, z);
  if(desired.lengthSq() > 0) desired.normalize().multiplyScalar(sprint && p.energy > 5 ? 13 : 7.5);

  const horiz = new THREE.Vector3(p.vel.x, 0, p.vel.z).lerp(desired, clamp(dt * 8, 0, 1));
  p.vel.x = horiz.x; p.vel.z = horiz.z;
  p.energy = clamp(p.energy + ((moving ? -12 : 16) + (sprint && moving ? -14 : 0)) * dt, 0, 100);

  if(jump && p.onGround && p.jumpLock <= 0){ p.vel.y = 9.7; p.onGround = false; p.jumpLock = 0.18; }
  p.vel.y -= 24 * dt;
  const next = p.pos.clone().addScaledVector(p.vel, dt);
  const ground = hAt(next.x, next.z) + 1.28;
  if(next.y <= ground){ next.y = ground; p.vel.y = Math.max(0, p.vel.y); p.onGround = true; } else p.onGround = false;

  const r = Math.hypot(next.x, next.z), maxR = 130;
  if(r > maxR){ next.x -= next.x / r * (r - maxR); next.z -= next.z / r * (r - maxR); p.vel.x *= 0.35; p.vel.z *= 0.35; }
  p.pos.copy(next);

  const sway = p.onGround ? Math.sin(performance.now()*0.012) * (moving ? 0.07 : 0.018) : 0;
  G.playerBody.position.copy(p.pos).add(new THREE.Vector3(0, -0.65 + sway, 0));
  G.playerBody.rotation.y = p.yaw;

  if(p.hurt <= 0){
    if(G.world.wolf.active && G.world.wolf.mesh.position.distanceTo(p.pos) < 1.55){ p.health -= G.world.wolf.damage * dt; p.hurt = 0.12; }
    for(const d of G.world.deer) if(d.mesh.position.distanceTo(p.pos) < 1.0){ p.health -= 8 * dt; p.hurt = 0.25; }
  }
  if(p.health <= 0){
    p.health = 0; G.state = 'lose'; overlay.classList.add('visible');
    overlay.querySelector('h1').textContent = 'You were overtaken';
    overlay.querySelector('p').textContent = 'The island kept moving without you. Press Enter World to try again.';
    startBtn.textContent = 'Try Again';
    if(document.exitPointerLock) document.exitPointerLock();
  }
}
function updateCamera(dt){
  const p = G.player;
  const back = new THREE.Vector3(Math.sin(p.yaw)*Math.cos(p.pitch), Math.sin(p.pitch), Math.cos(p.yaw)*Math.cos(p.pitch)).normalize();
  const desired = p.pos.clone().add(new THREE.Vector3(0,2.15,0)).addScaledVector(back, -5.8);
  G.camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
  G.camera.lookAt(p.pos.clone().add(new THREE.Vector3(0,1.25,0)));
}
function updateCrystals(dt){
  for(let i = G.world.crystals.length - 1; i >= 0; i--){
    const s = G.world.crystals[i];
    s.userData.spin += dt * 1.8;
    s.rotation.y = s.userData.spin;
    s.position.y = s.userData.baseY + Math.sin(performance.now()*0.003 + i) * 0.25;
    if(s.position.distanceTo(G.player.pos) < 1.5){
      G.scene.remove(s); G.world.crystals.splice(i,1); G.shards += 1; G.player.energy = Math.min(100, G.player.energy + 18); msg('Crystal collected');
      if(G.world.crystals.length === 0 && !G.world.beacon.ready){ G.world.beacon.ready = true; G.world.beacon.mesh.visible = true; msg('The beacon awakened. Restore the shrines.'); }
    }
  }
}
function updateShrines(dt){
  let active = 0;
  for(const s of G.world.shrines){
    s.userData.pulse += dt;
    const near = s.position.distanceTo(G.player.pos) < 2.2;
    if(near && G.shards >= s.userData.index + 1 && !s.userData.active){ s.userData.active = true; msg(`Shrine ${s.userData.index + 1} restored`); }
    if(s.userData.active) active++;
    s.children[1].material.emissiveIntensity = (s.userData.active ? 2.0 : 0.9) + Math.sin(s.userData.pulse * 2.2) * 0.2;
    s.children[2].material.opacity = s.userData.active ? 0.9 : 0.55;
    s.rotation.y = Math.sin(s.userData.pulse) * 0.08;
  }
  G.shrineCount = active;
  goalEl.textContent = `Goal: Restore ${active}/4 shrines`;
  if(active >= G.totalShrines && !G.world.beacon.activated){
    G.world.beacon.activated = true; G.world.beacon.mesh.visible = true; msg('All shrines restored. Go to the beacon!');
  }
}
function updateBeacon(){
  if(!G.world.beacon.mesh.visible) return;
  G.world.beacon.mesh.rotation.y += 0.006;
  G.world.beacon.mesh.children[1].rotation.y += 0.02;
  G.world.beacon.mesh.children[2].rotation.y -= 0.01;
  if(G.world.beacon.activated && G.world.beacon.mesh.position.distanceTo(G.player.pos) < 4.0 && G.state === 'playing'){
    G.state = 'win'; overlay.classList.add('visible');
    overlay.querySelector('h1').textContent = 'World Restored';
    overlay.querySelector('p').textContent = 'You completed the prototype objective. The island lights up because of you.';
    startBtn.textContent = 'Play Again';
    if(document.exitPointerLock) document.exitPointerLock();
  }
}
function updateWildlife(dt){
  const player = G.player.pos;
  for(const d of G.world.deer){
    const pos = d.mesh.position, dist = pos.distanceTo(player);
    d.timer -= dt;
    d.panic = lerp(d.panic, dist < 14 ? 1 : 0, clamp(dt * 2.5, 0, 1));
    if(d.timer <= 0 || dist < 12){
      d.timer = 2.5 + Math.random()*3.5;
      const away = pos.clone().sub(player); away.y = 0;
      const goal = away.lengthSq() > 0.001 ? pos.clone().addScaledVector(away.normalize(), 10 + Math.random()*8) : pos.clone().add(new THREE.Vector3((Math.random()*2-1)*8,0,(Math.random()*2-1)*8));
      d.target = goal;
    }
    const goal = d.target.clone(); goal.y = hAt(goal.x, goal.z) + 0.02;
    const dir = goal.clone().sub(pos); dir.y = 0;
    if(dir.length() > 0.02){
      dir.normalize();
      d.vel.lerp(dir.multiplyScalar(4.2 + d.panic * 4.8), clamp(dt * 1.8, 0, 1));
      pos.addScaledVector(d.vel, dt);
    }
    pos.y = hAt(pos.x, pos.z) + 0.02;
    d.mesh.rotation.y = Math.atan2(d.vel.x, d.vel.z);
  }
  const night = G.time < 0.22 || G.time > 0.74;
  G.world.wolf.active = night && (G.shrineCount >= 1 || G.day >= 2);
  G.world.wolf.mesh.visible = G.world.wolf.active;
  if(!G.world.wolf.active) return;
  const w = G.world.wolf.mesh, pos = w.position, target = player.clone(); target.y = hAt(target.x, target.z) + 0.02;
  const dir = target.sub(pos); dir.y = 0; const dist = dir.length();
  if(dist > 0.01){ dir.normalize(); pos.addScaledVector(dir, G.world.wolf.speed * dt); w.rotation.y = Math.atan2(dir.x, dir.z); }
  pos.y = hAt(pos.x, pos.z) + 0.08;
  if(dist < 18 && Math.random() < 0.01) msg('Something is hunting after dark...');
}
function updateSky(dt){
  G.time += dt * 0.03;
  if(G.time >= 1){ G.time -= 1; G.day += 1; msg(`Day ${G.day}`); }
  const a = G.time * Math.PI * 2 - Math.PI/2;
  const sunDir = new THREE.Vector3(Math.cos(a), Math.sin(a), Math.sin(a * 0.72)).normalize();
  G.sun.position.copy(sunDir.clone().multiplyScalar(120));
  G.moon.position.copy(sunDir.clone().multiplyScalar(-88));
  const daylight = clamp((sunDir.y + 0.08) / 0.82, 0, 1), night = 1 - daylight;
  G.sun.intensity = 0.35 + daylight * 3.2; G.moon.intensity = 0.08 + night * 0.9; G.hemi.intensity = 0.8 + daylight * 1.2;
  G.scene.fog.density = 0.0011 + night * 0.0015;
  const sky = new THREE.Color().setHSL(0.58 - night*0.035, 0.55, 0.76 - night*0.38);
  G.scene.background = sky; G.scene.fog.color.copy(sky); G.sky.material.color.setHSL(0.58 - night*0.04, 0.5, 0.82 - night*0.45);
  G.water.material.opacity = 0.55 + daylight * 0.12; G.water.material.color.setHSL(0.56, 0.58, 0.42 + daylight*0.12);
  for(const cl of G.world.clouds){ cl.position.x += dt * (1.5 + daylight * 0.4); if(cl.position.x > 180) cl.position.x = -180; }
  timeEl.textContent = `Day ${G.day} · ${String(Math.floor(G.time * 24)).padStart(2,'0')}:${String(Math.floor((G.time*24 % 1) * 60)).padStart(2,'0')}`;
}
function updateUI(){
  healthFill.style.width = clamp(G.player.health,0,100) + '%';
  energyFill.style.width = clamp(G.player.energy,0,100) + '%';
  healthText.textContent = Math.max(0, G.player.health).toFixed(0);
  energyText.textContent = Math.max(0, G.player.energy).toFixed(0);
  shardsEl.textContent = `Shards: ${G.shards}`;
}

function interact(){
  if(G.state !== 'playing') return;
  const shrine = G.world.shrines.find(s => s.position.distanceTo(G.player.pos) < 2.4 && !s.userData.active && G.shards >= s.userData.index + 1);
  if(shrine){ shrine.userData.active = true; msg('Shrine restored'); return; }
  if(G.world.beacon.activated && G.world.beacon.mesh.position.distanceTo(G.player.pos) < 4.2){
    G.state = 'win'; overlay.classList.add('visible');
    overlay.querySelector('h1').textContent = 'World Restored';
    overlay.querySelector('p').textContent = 'You completed the prototype objective. The island lights up because of you.';
    startBtn.textContent = 'Play Again';
    if(document.exitPointerLock) document.exitPointerLock();
  }
}

function loop(){
  requestAnimationFrame(loop);
  const dt = Math.min(G.clock.getDelta(), 0.033);
  if(G.state === 'playing'){
    updateSky(dt); movePlayer(dt); updateCamera(dt); updateCrystals(dt); updateShrines(dt); updateBeacon(); updateWildlife(dt); updateUI();
  } else {
    updateSky(dt * 0.5);
  }
  drawCross();
  G.renderer.render(G.scene, G.camera);
}

document.addEventListener('keydown', e => { if(e.code === 'KeyE') interact(); });
document.getElementById('interactBtn').addEventListener('click', interact);

function bindTouchButtons(){
  document.getElementById('jumpBtn').addEventListener('click', () => { if(G.state === 'playing') G.keys.Space = true; setTimeout(() => G.keys.Space = false, 60); });
  document.getElementById('sprintBtn').addEventListener('click', () => { if(coarse) touch.sprint = !touch.sprint; });
}

function startGame(){
  overlay.classList.remove('visible');
  if(!coarse && document.body.requestPointerLock) document.body.requestPointerLock();
  if(G.state !== 'playing'){ G.state = 'playing'; msg('Restore the shrines. Then return to the beacon.'); }
}
function bindMouseKeyboard(){
  startBtn.addEventListener('click', startGame);
  addEventListener('keydown', e => {
    G.keys[e.code] = true;
    if(e.code === 'Space') e.preventDefault();
    if(e.code === 'KeyR' && G.state !== 'playing') resetRun();
    if(e.code === 'Escape' && G.ui.locked) document.exitPointerLock();
  });
  addEventListener('keyup', e => G.keys[e.code] = false);
  addEventListener('mousemove', e => {
    if(!G.ui.locked || G.state !== 'playing') return;
    G._mx = (G._mx || 0) + e.movementX;
    G._my = (G._my || 0) + e.movementY;
  });
  document.addEventListener('pointerlockchange', () => { G.ui.locked = document.pointerLockElement === document.body; });
}

function setupTouch(){
  const joyZone = document.getElementById('joystickZone');
  const lookZone = document.getElementById('lookZone');
  const base = document.getElementById('joystickBase');
  const knob = document.getElementById('joystickKnob');

  const setKnob = (dx,dy) => {
    const limit = 34, len = Math.hypot(dx,dy), k = len > limit ? limit/len : 1, x = dx*k, y = dy*k;
    knob.style.transform = `translate(${x}px, ${y}px)`;
    touch.moveX = x / limit; touch.moveY = y / limit;
  };

  joyZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; touch.joyId = t.identifier;
    const r = base.getBoundingClientRect(); touch.startX = r.left + r.width/2; touch.startY = r.top + r.height/2;
    setKnob(t.clientX - touch.startX, t.clientY - touch.startY); e.preventDefault();
  }, {passive:false});
  joyZone.addEventListener('touchmove', e => {
    for(const t of e.changedTouches) if(t.identifier === touch.joyId){ setKnob(t.clientX - touch.startX, t.clientY - touch.startY); e.preventDefault(); }
  }, {passive:false});
  joyZone.addEventListener('touchend', e => {
    for(const t of e.changedTouches) if(t.identifier === touch.joyId){ touch.joyId = null; knob.style.transform = 'translate(0px, 0px)'; touch.moveX = touch.moveY = 0; e.preventDefault(); }
  }, {passive:false});

  lookZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; touch.lookId = t.identifier; touch.lastX = t.clientX; touch.lastY = t.clientY;
  }, {passive:true});
  lookZone.addEventListener('touchmove', e => {
    for(const t of e.changedTouches) if(t.identifier === touch.lookId){ touch.lookDX += t.clientX - touch.lastX; touch.lookDY += t.clientY - touch.lastY; touch.lastX = t.clientX; touch.lastY = t.clientY; }
  }, {passive:true});
  lookZone.addEventListener('touchend', e => { for(const t of e.changedTouches) if(t.identifier === touch.lookId) touch.lookId = null; }, {passive:true});
}

function touchDrive(){
  if(!coarse || G.state !== 'playing') return;
  const mx = touch.lookDX, my = touch.lookDY;
  touch.lookDX = 0; touch.lookDY = 0;
  G.player.yaw -= mx * 0.0025;
  G.player.pitch -= my * 0.0025;
  G.player.pitch = clamp(G.player.pitch, -1.02, 0.28);
}

function applyTouchMove(dt){
  if(!coarse || G.state !== 'playing') return;
  const p = G.player;
  const yaw = p.yaw;
  const forward = new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  let x = touch.moveX, z = -touch.moveY;
  const moving = Math.hypot(x,z) > 0.12;
  if(moving){ const l = Math.hypot(x,z); x /= l; z /= l; }
  const desired = new THREE.Vector3().addScaledVector(right, x).addScaledVector(forward, z);
  if(desired.lengthSq() > 0) desired.normalize().multiplyScalar(touch.sprint && p.energy > 5 ? 13 : 7.5);
  const horiz = new THREE.Vector3(p.vel.x,0,p.vel.z).lerp(desired, clamp(dt*8, 0, 1));
  p.vel.x = horiz.x; p.vel.z = horiz.z;
  if(touch.jump && p.onGround && p.jumpLock <= 0){ p.vel.y = 9.7; p.onGround = false; p.jumpLock = 0.18; touch.jump = false; }
}

function movePlayer(dt){
  touchDrive();
  applyTouchMove(dt);
  const p = G.player;
  if(p.hurt > 0) p.hurt -= dt;
  if(p.jumpLock > 0) p.jumpLock -= dt;

  if(!coarse){
    const mx = G._mx || 0, my = G._my || 0; G._mx = 0; G._my = 0;
    p.yaw -= mx * 0.0023; p.pitch -= my * 0.0023; p.pitch = clamp(p.pitch, -1.02, 0.28);
    let x=0,z=0,sprint=G.keys.ShiftLeft || G.keys.ShiftRight,jump=G.keys.Space;
    if(G.keys.KeyW) z += 1; if(G.keys.KeyS) z -= 1; if(G.keys.KeyD) x += 1; if(G.keys.KeyA) x -= 1;
    const moving = Math.hypot(x,z) > 0.12;
    if(moving){ const l = Math.hypot(x,z); x /= l; z /= l; }
    const yaw = p.yaw, forward = new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)), right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    const desired = new THREE.Vector3().addScaledVector(right, x).addScaledVector(forward, z);
    if(desired.lengthSq() > 0) desired.normalize().multiplyScalar(sprint && p.energy > 5 ? 13 : 7.5);
    const horiz = new THREE.Vector3(p.vel.x,0,p.vel.z).lerp(desired, clamp(dt*8, 0, 1));
    p.vel.x = horiz.x; p.vel.z = horiz.z;
    p.energy = clamp(p.energy + ((moving ? -12 : 16) + (sprint && moving ? -14 : 0)) * dt, 0, 100);
    if(jump && p.onGround && p.jumpLock <= 0){ p.vel.y = 9.7; p.onGround = false; p.jumpLock = 0.18; }
  } else {
    const moving = Math.hypot(touch.moveX, touch.moveY) > 0.12;
    p.energy = clamp(p.energy + ((moving ? -12 : 16) + (touch.sprint && moving ? -14 : 0)) * dt, 0, 100);
  }

  p.vel.y -= 24 * dt;
  const next = p.pos.clone().addScaledVector(p.vel, dt);
  const ground = hAt(next.x, next.z) + 1.28;
  if(next.y <= ground){ next.y = ground; p.vel.y = Math.max(0, p.vel.y); p.onGround = true; } else p.onGround = false;
  const r = Math.hypot(next.x, next.z), maxR = 130;
  if(r > maxR){ next.x -= next.x / r * (r-maxR); next.z -= next.z / r * (r-maxR); p.vel.x *= 0.35; p.vel.z *= 0.35; }
  p.pos.copy(next);

  const sway = p.onGround ? Math.sin(performance.now()*0.012) * ((Math.hypot(p.vel.x,p.vel.z) > 0.1) ? 0.07 : 0.018) : 0;
  G.playerBody.position.copy(p.pos).add(new THREE.Vector3(0, -0.65 + sway, 0));
  G.playerBody.rotation.y = p.yaw;

  if(p.hurt <= 0){
    if(G.world.wolf.active && G.world.wolf.mesh.position.distanceTo(p.pos) < 1.55){ p.health -= G.world.wolf.damage * dt; p.hurt = 0.12; }
    for(const d of G.world.deer) if(d.mesh.position.distanceTo(p.pos) < 1.0){ p.health -= 8 * dt; p.hurt = 0.25; }
  }
  if(p.health <= 0){
    p.health = 0; G.state = 'lose'; overlay.classList.add('visible');
    overlay.querySelector('h1').textContent = 'You were overtaken';
    overlay.querySelector('p').textContent = 'The island kept moving without you. Press Enter World to try again.';
    startBtn.textContent = 'Try Again';
    if(document.exitPointerLock) document.exitPointerLock();
  }
}

function update(){
  if(G.state === 'playing'){
    G.time += G.clock.getDelta() * 0.03;
    if(G.time >= 1){ G.time -= 1; G.day += 1; msg(`Day ${G.day}`); }
  }
  const a = G.time * Math.PI * 2 - Math.PI/2;
  const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), Math.sin(a * 0.72)).normalize();
  G.sun.position.copy(dir.clone().multiplyScalar(120));
  G.moon.position.copy(dir.clone().multiplyScalar(-88));
  const daylight = clamp((dir.y + 0.08) / 0.82, 0, 1), night = 1 - daylight;
  G.sun.intensity = 0.35 + daylight * 3.2; G.moon.intensity = 0.08 + night * 0.9; G.hemi.intensity = 0.8 + daylight * 1.2;
  G.scene.fog.density = 0.0011 + night * 0.0015;
  const sky = new THREE.Color().setHSL(0.58 - night*0.035, 0.55, 0.76 - night*0.38);
  G.scene.background = sky; G.scene.fog.color.copy(sky); G.sky.material.color.setHSL(0.58 - night*0.04, 0.5, 0.82 - night*0.45);
  G.water.material.opacity = 0.55 + daylight * 0.12; G.water.material.color.setHSL(0.56, 0.58, 0.42 + daylight*0.12);
  for(const cl of G.world.clouds){ cl.position.x += 0.03 * (1.5 + daylight * 0.4); if(cl.position.x > 180) cl.position.x = -180; }
  timeEl.textContent = `Day ${G.day} · ${String(Math.floor(G.time * 24)).padStart(2,'0')}:${String(Math.floor((G.time*24 % 1) * 60)).padStart(2,'0')}`;
}

function gameLoop(){
  requestAnimationFrame(gameLoop);
  const dt = Math.min(G.clock.getDelta(), 0.033);
  if(G.state === 'playing'){
    update();
    movePlayer(dt);
    updateCamera(dt);
    updateCrystals(dt);
    updateShrines(dt);
    updateBeacon();
    updateWildlife(dt);
    healthFill.style.width = clamp(G.player.health,0,100) + '%';
    energyFill.style.width = clamp(G.player.energy,0,100) + '%';
    healthText.textContent = Math.max(0, G.player.health).toFixed(0);
    energyText.textContent = Math.max(0, G.player.energy).toFixed(0);
    shardsEl.textContent = `Shards: ${G.shards}`;
  } else {
    G.time += dt * 0.015;
    update();
  }
  drawCross();
  G.renderer.render(G.scene, G.camera);
}

function interact(){ if(G.state !== 'playing') return; const shrine = G.world.shrines.find(s => s.position.distanceTo(G.player.pos) < 2.4 && !s.userData.active && G.shards >= s.userData.index + 1); if(shrine){ shrine.userData.active = true; msg('Shrine restored'); return; } if(G.world.beacon.activated && G.world.beacon.mesh.position.distanceTo(G.player.pos) < 4.2){ G.state = 'win'; overlay.classList.add('visible'); overlay.querySelector('h1').textContent = 'World Restored'; overlay.querySelector('p').textContent = 'You completed the prototype objective. The island lights up because of you.'; startBtn.textContent = 'Play Again'; if(document.exitPointerLock) document.exitPointerLock(); } }

document.addEventListener('keydown', e => { if(e.code === 'KeyE') interact(); });
document.getElementById('interactBtn').addEventListener('click', interact);
bindMouseKeyboard();
bindTouchButtons();

function initApp(){
  init();
  if(coarse) setupTouch();
  resize();
  gameLoop();
}
initApp();
