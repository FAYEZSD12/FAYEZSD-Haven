import * as THREE from 'three';
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xb9dce8);scene.fog=new THREE.Fog(0xb9dce8,55,155);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,250);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('game').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x526a45,2));
const sun=new THREE.DirectionalLight(0xfff2c0,2.2);sun.position.set(35,70,24);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;scene.add(sun);
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:1});
const green=mat(0x628b45),brown=mat(0x69503a),leaves=mat(0x366b40),stone=mat(0x8a9492),animalMat=mat(0xb18258);
const height=(x,z)=>.65*Math.sin(x*.055)*Math.cos(z*.044);
const groundGeo=new THREE.PlaneGeometry(220,220,90,90);groundGeo.rotateX(-Math.PI/2);
const p=groundGeo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,height(p.getX(i),p.getZ(i)));groundGeo.computeVertexNormals();
const ground=new THREE.Mesh(groundGeo,green);ground.receiveShadow=true;scene.add(ground);
function mesh(parent,geo,m,x,y,z,sx=1,sy=1,sz=1){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o}
function group(x,z){let g=new THREE.Group();g.position.set(x,height(x,z),z);scene.add(g);return g}
const resources=[],animals=[],structures=[],rand=(a,b)=>a+Math.random()*(b-a);
function resource(type,x,z){const g=group(x,z);if(type==='tree'){mesh(g,new THREE.CylinderGeometry(.2,.31,2.6,7),brown,0,1.3,0);mesh(g,new THREE.ConeGeometry(1.3,3.3,8),leaves,0,3.2,0)}else if(type==='rock'){mesh(g,new THREE.DodecahedronGeometry(1),stone,0,.7,0,1,.8,1)}else{mesh(g,new THREE.SphereGeometry(1,9,7),leaves,0,.55,0,1.1,.7,1)}resources.push({type,g,x,z,ready:true})}
for(let i=0;i<115;i++){let x=rand(-104,104),z=rand(-104,104);if(Math.hypot(x,z)<10)continue;resource(i%6===0?'rock':i%5===0?'bush':'tree',x,z)}
const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.1,.65,3),mat(0x77a852),1200),dummy=new THREE.Object3D();for(let i=0;i<1200;i++){let x=rand(-105,105),z=rand(-105,105);dummy.position.set(x,height(x,z)+.32,z);dummy.rotation.y=rand(0,6.3);dummy.scale.setScalar(rand(.6,1.5));dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix)}scene.add(grass);
const player=group(0,0);mesh(player,new THREE.CylinderGeometry(.34,.37,1.2,8),mat(0x365b50),0,1.1,0);mesh(player,new THREE.SphereGeometry(.29,12,8),mat(0xd0a27d),0,1.96,0);
for(let i=0;i<12;i++){let x=rand(-65,65),z=rand(-65,65);let g=group(x,z);mesh(g,new THREE.BoxGeometry(.9,.66,1.6),animalMat,0,.65,0);mesh(g,new THREE.BoxGeometry(.55,.55,.62),animalMat,0,1.06,.9);for(let xx of [-.32,.32])for(let zz of [-.49,.49])mesh(g,new THREE.CylinderGeometry(.1,.1,.6,6),animalMat,xx,.22,zz);animals.push({g,x,z,tamed:false,phase:rand(0,10)})}
const items=[['rope','Rope','🪢'],['wall','Wall','🧱'],['campfire','Fire','🔥'],['axe','Axe','🪓'],['pickaxe','Pickaxe','⛏️'],['wood','Wood','🪵'],['stone','Stone','🪨'],['fiber','Fiber','🌿'],['berries','Berries','🫐']];
const inv={rope:1,wall:1,campfire:1,axe:1,pickaxe:1,wood:4,stone:4,fiber:5,berries:3},recipes=[['rope',{fiber:3}],['wall',{wood:4}],['campfire',{wood:2,stone:4}],['axe',{wood:2,stone:2}],['pickaxe',{wood:2,stone:3}]];
let selected=0,health=100,hunger=100,time=0,yaw=0,pitch=.45,drag=false,lastX=0,lastY=0;
let zoomTarget=9,zoomCurrent=9; // Camera distance 0 = first person, 18 = zoomed out.
const clampCameraDistance=value=>THREE.MathUtils.clamp(value,0,18);
function zoomCamera(deltaY,deltaMode=0){
  // Normalize mice and trackpads. Positive delta zooms OUT; negative zooms IN.
  const pixels=deltaY*(deltaMode===1?16:deltaMode===2?innerHeight:1);
  if(!Number.isFinite(pixels)||Math.abs(pixels)<.01)return;
  const step=Math.min(3,Math.max(.75,Math.abs(pixels)/85));
  if(pixels>0 && zoomTarget===0){
    zoomTarget=2; // The first scroll away from first person must actually exit it.
  }else{
    zoomTarget=clampCameraDistance(zoomTarget+Math.sign(pixels)*step);
    if(zoomTarget<.85)zoomTarget=0; // Snap to a true first-person view.
  }
  if(zoomTarget!==0)pitch=Math.max(.08,pitch);
}
const keys=new Set(),goals={gather:false,craft:false,tame:false,build:false};
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.remove('show'),2500)}
function dist(x,z){return Math.hypot(player.position.x-x,player.position.z-z)}
function updateUI(){const bar=$('hotbar');bar.innerHTML='';items.forEach(([id,n,emoji],i)=>{let b=document.createElement('button');b.className='slot'+(i===selected?' selected':'');b.innerHTML='<small>'+(i+1)+'</small><span>'+emoji+'</span><strong>'+n+'</strong><em>'+ (inv[id]||0)+'</em>';b.onclick=()=>{selected=i;updateUI()};bar.appendChild(b)});$('health-value').textContent=Math.floor(health);$('hunger-value').textContent=Math.floor(hunger);$('health-fill').style.width=health+'%';$('hunger-fill').style.width=hunger+'%';$('tamed-count').textContent=animals.filter(a=>a.tamed).length;Object.keys(goals).forEach(k=>{let el=document.querySelector('[data-goal="'+k+'"]');if(el)el.classList.toggle('complete',goals[k])});let done=Object.values(goals).filter(Boolean).length;$('quest-progress').textContent=done+' / 4';$('quest-progress-bar').style.width=done*25+'%'}
function gather(){let r=resources.filter(r=>r.ready&&dist(r.x,r.z)<3.5).sort((a,b)=>dist(a.x,a.z)-dist(b.x,b.z))[0];if(!r)return notify('Get closer to a tree, rock or bush');let id=r.type==='tree'?'wood':r.type==='rock'?'stone':'fiber';inv[id]=(inv[id]||0)+(r.type==='tree'?3:2);if(r.type==='bush')inv.berries++;r.ready=false;r.g.visible=false;setTimeout(()=>{r.ready=true;r.g.visible=true},20000);goals.gather=true;notify('Collected '+id);updateUI()}
function tame(){let a=animals.filter(a=>!a.tamed&&dist(a.x,a.z)<4).sort((a,b)=>dist(a.x,a.z)-dist(b.x,b.z))[0];if(!a)return notify('Approach an untamed animal');if(!inv.rope)return notify('Craft a rope first');inv.rope--;a.tamed=true;goals.tame=true;notify('Animal tamed! It will follow you.');updateUI()}
function build(){let type=items[selected][0];if(!['wall','campfire'].includes(type))return notify('Select a wall or campfire in the hotbar');if(!inv[type])return notify('Craft this structure first');inv[type]--;let angle=yaw,g=group(player.position.x+Math.sin(angle)*3,player.position.z+Math.cos(angle)*3);if(type==='wall')mesh(g,new THREE.BoxGeometry(3,2,.35),brown,0,1,0);else{mesh(g,new THREE.CylinderGeometry(.65,.7,.25,10),stone,0,.15,0);mesh(g,new THREE.ConeGeometry(.4,1,8),mat(0xf58c2a),0,.75,0)}structures.push({type,x:g.position.x,z:g.position.z});goals.build=true;notify(type+' placed');updateUI()}
function renderRecipes(){const div=$('craft-recipes');div.innerHTML='';for(const [id,cost] of recipes){let r=document.createElement('button');r.className='recipe';r.innerHTML='<strong>'+items.find(i=>i[0]===id)[2]+' '+id.toUpperCase()+'</strong><small>'+Object.entries(cost).map(([k,v])=>k+': '+v).join(' · ')+'</small>';r.onclick=()=>{if(Object.entries(cost).some(([k,v])=>(inv[k]||0)<v))return notify('Not enough resources');for(const [k,v] of Object.entries(cost))inv[k]-=v;inv[id]=(inv[id]||0)+1;goals.craft=true;notify('Crafted '+id);updateUI()};div.appendChild(r)}}
function craft(){const modal=$('craft-backdrop');modal.classList.toggle('hidden');if(!modal.classList.contains('hidden'))renderRecipes()}
function save(){try{localStorage.setItem('fayez-haven-v1',JSON.stringify({inv,health,hunger,time,goals,x:player.position.x,z:player.position.z,structures, tamed:animals.map((a,i)=>a.tamed?i:null).filter(x=>x!==null)}));notify('Game saved in this browser')}catch(e){notify('Save unavailable in this browser')}}
function load(){try{let s=JSON.parse(localStorage.getItem('fayez-haven-v1')||'null');if(!s)return;Object.assign(inv,s.inv||{});Object.assign(goals,s.goals||{});health=s.health??100;hunger=s.hunger??100;time=s.time||0;player.position.x=s.x||0;player.position.z=s.z||0;for(let i of (s.tamed||[]))if(animals[i])animals[i].tamed=true;notify('Previous save loaded')}catch(e){console.warn(e)}}
$('save-btn').onclick=save;$('craft-toggle').onclick=craft;$('craft-close').onclick=craft;
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(/^Digit[1-9]$/.test(e.code)){selected=+e.code.slice(-1)-1;updateUI()}if(e.code==='KeyE')gather();if(e.code==='KeyT')tame();if(e.code==='KeyB')build();if(e.code==='KeyC')craft();if(e.code==='KeyV'){zoomTarget=zoomTarget===0?9:0;if(zoomTarget!==0){pitch=Math.max(.08,pitch);if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.()}}if(e.code==='KeyF'){if(inv.berries>0){inv.berries--;hunger=Math.min(100,hunger+22);notify('Ate berries');updateUI()}}});
window.addEventListener('keyup',e=>keys.delete(e.code));
// Camera input: drag in third-person or first-person; click in first-person to lock the mouse.
renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==2)return;
  drag=true;lastX=e.clientX;lastY=e.clientY;
  if(zoomTarget===0 && e.button===0 && document.pointerLockElement!==renderer.domElement){
    renderer.domElement.requestPointerLock?.()?.catch?.(()=>{});
  }
});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('pointerup',()=>drag=false);
window.addEventListener('pointermove',e=>{
  if(document.pointerLockElement===renderer.domElement){
    yaw-=e.movementX*.004;
    pitch=THREE.MathUtils.clamp(pitch+e.movementY*.004,-1.22,1.2);
    return;
  }
  if(!drag)return;
  yaw-=(e.clientX-lastX)*.005;
  pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.004,zoomTarget===0?-1.22:.08,1.2);
  lastX=e.clientX;lastY=e.clientY;
});
// Listen on WINDOW, including when the cursor is over the HUD instead of the 3D canvas.
window.addEventListener('wheel',e=>{
  if(!$('craft-backdrop').classList.contains('hidden'))return;
  e.preventDefault();
  zoomCamera(e.deltaY,e.deltaMode);
},{passive:false,capture:true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
load();updateUI();let prev=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-prev)/1000,.05);prev=now;time+=dt;hunger=Math.max(0,hunger-dt*.06);if(hunger===0)health=Math.max(0,health-dt*.25);
// Movement uses the same camera basis as the view: D points screen-right, A screen-left.
let forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);
let strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
const len=Math.hypot(forward,strafe);
if(len){
  forward/=len;strafe/=len;
  const speed=keys.has('ShiftLeft')?9:5.5;
  const facingX=Math.sin(yaw),facingZ=Math.cos(yaw);
  const cameraRightX=-facingZ,cameraRightZ=facingX;
  player.position.x=THREE.MathUtils.clamp(player.position.x+(facingX*forward+cameraRightX*strafe)*speed*dt,-108,108);
  player.position.z=THREE.MathUtils.clamp(player.position.z+(facingZ*forward+cameraRightZ*strafe)*speed*dt,-108,108);
  player.rotation.y=yaw;
}
player.position.y=height(player.position.x,player.position.z);
for(const a of animals){a.phase+=dt;if(a.tamed){let dx=player.position.x-a.g.position.x,dz=player.position.z-a.g.position.z,d=Math.hypot(dx,dz);if(d>3){a.g.position.x+=dx/d*dt*3;a.g.position.z+=dz/d*dt*3}}else{a.g.position.x+=Math.sin(a.phase)*dt*.25;a.g.position.z+=Math.cos(a.phase*.7)*dt*.25}a.g.position.y=height(a.g.position.x,a.g.position.z)}
// Smooth camera zoom. Hide the avatar inside first person so the head does not obstruct the view.
zoomCurrent=THREE.MathUtils.damp(zoomCurrent,zoomTarget,14,dt);
const firstPerson=zoomCurrent<.45;
player.visible=!firstPerson;
if(zoomTarget!==0 && document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
const target=player.position.clone().add(new THREE.Vector3(0,1.85,0));
if(firstPerson){
  camera.position.copy(target);
  const look=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
  camera.lookAt(target.clone().add(look));
}else{
  const offset=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch)*zoomCurrent,Math.sin(pitch)*zoomCurrent,-Math.cos(yaw)*Math.cos(pitch)*zoomCurrent);
  camera.position.lerp(target.clone().add(offset),.24);
  camera.lookAt(target);
}
$('day-readout').textContent='DAY '+String(Math.floor(time/250)+1).padStart(2,'0')+' · '+(time%250<125?'MORNING':'EVENING')+' · '+(firstPerson?'FIRST PERSON':'THIRD PERSON');
const near=resources.find(r=>r.ready&&dist(r.x,r.z)<3.5);$('interaction').classList.toggle('hidden',!near);if(near){$('interaction-title').textContent='Gather '+near.type;$('interaction-hint').textContent='Press E to collect resources'}
if(Math.floor(now/350)!==Math.floor((now-dt*1000)/350))updateUI();renderer.render(scene,camera)}
requestAnimationFrame(animate);
