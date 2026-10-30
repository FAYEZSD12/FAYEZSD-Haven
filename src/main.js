import * as THREE from 'three';
import { createAvatar } from './avatar.js?v=0.5';
import { createForestMood, getDayNightInfo } from './forest.js?v=0.6';
import { createNightEnemies } from './enemies.js?v=0.9';
import { createHuntingAndCooking } from './hunting.js?v=1.0';
import { RECIPES, BUILDABLE, STATISTICS, canAfford, craftRecipe, createBaseBuilding } from './building.js?v=0.8';
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xb9dce8);scene.fog=new THREE.Fog(0xb9dce8,55,155);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,250);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('game').appendChild(renderer.domElement);
const hemisphere=new THREE.HemisphereLight(0xc7e4d5,0x28382d,1.65);scene.add(hemisphere);
const sun=new THREE.DirectionalLight(0xfff2c0,2.2);sun.position.set(35,70,24);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;scene.add(sun);
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:1});
const green=mat(0x3b7046),brown=mat(0x543c2d),leaves=mat(0x26573e),stone=mat(0x6c7778),animalMat=mat(0x9a7659);
const treeShade=[mat(0x214b39),mat(0x2b6045),mat(0x1c4135)];
const height=(x,z)=>.65*Math.sin(x*.055)*Math.cos(z*.044);
const groundGeo=new THREE.PlaneGeometry(220,220,90,90);groundGeo.rotateX(-Math.PI/2);
const p=groundGeo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,height(p.getX(i),p.getZ(i)));groundGeo.computeVertexNormals();
const ground=new THREE.Mesh(groundGeo,green);ground.receiveShadow=true;scene.add(ground);
function mesh(parent,geo,m,x,y,z,sx=1,sy=1,sz=1){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o}
function group(x,z){let g=new THREE.Group();g.position.set(x,height(x,z),z);scene.add(g);return g}
const resources=[],animals=[],rand=(a,b)=>a+Math.random()*(b-a);
function resource(type,x,z){
  const g=group(x,z);
  if(type==='tree'){
    const size=.8+((Math.abs(x+z)*.071)%1)*.55;
    g.scale.setScalar(size);
    mesh(g,new THREE.CylinderGeometry(.19,.32,3.1,7),brown,0,1.55,0);
    for(let i=0;i<4;i++){
      const branch=mesh(g,new THREE.ConeGeometry(1.52-i*.22,1.85,7),treeShade[i%3],0,2.45+i*.64,0);
      branch.rotation.y=i*.28;
    }
  }else if(type==='rock'){
    const r=mesh(g,new THREE.DodecahedronGeometry(.95,0),stone,0,.62,0,1,.7,.9);
    r.rotation.y=x*.13;
  }else{
    for(const dx of [-.38,0,.38]){
      mesh(g,new THREE.IcosahedronGeometry(.52,0),leaves,dx,.52,0);
    }
  }
  resources.push({type,g,x,z,ready:true});
}
for(let i=0;i<115;i++){let x=rand(-104,104),z=rand(-104,104);if(Math.hypot(x,z)<10||Math.hypot(x,z-13)<11)continue;resource(i%6===0?'rock':i%5===0?'bush':'tree',x,z)}
const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.1,.65,3),mat(0x44844d),1200),dummy=new THREE.Object3D();for(let i=0;i<1200;i++){let x=rand(-105,105),z=rand(-105,105);dummy.position.set(x,height(x,z)+.32,z);dummy.rotation.y=rand(0,6.3);dummy.scale.setScalar(Math.hypot(x,z-13)<8?.001:rand(.6,1.5));dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix)}scene.add(grass);
const forest=createForestMood(THREE,scene,mesh,mat,height,ground,grass,sun,hemisphere);
const avatar=createAvatar(THREE,scene,camera,mesh,mat,group);
const player=avatar.player;
// New players begin close to the campfire. An existing save restores their last position.
player.position.set(2,height(2,14),14); // Spawn within reach of the crafting table.
const base=createBaseBuilding(THREE,scene,mesh,mat,height,forest.campfirePosition);
const threats=createNightEnemies(THREE,scene,mesh,mat,height,forest.campfirePosition,base);
for(let i=0;i<12;i++){
  // The first animal is intentionally close to the starting campsite to test hunting immediately.
  let x=i===0?2:rand(-65,65),z=i===0?19:rand(-65,65);
  let g=group(x,z);
  mesh(g,new THREE.BoxGeometry(.9,.66,1.6),animalMat,0,.65,0);
  mesh(g,new THREE.BoxGeometry(.55,.55,.62),animalMat,0,1.06,.9);
  for(let xx of [-.32,.32])for(let zz of [-.49,.49])mesh(g,new THREE.CylinderGeometry(.1,.1,.6,6),animalMat,xx,.22,zz);
  animals.push({g,x,z,tamed:false,phase:rand(0,10),alive:true,hp:2});
}
const items=[['rope','Rope','🪢'],['wall','Wall','🧱'],['campfire','Fire','🔥'],['axe','Axe','🪓'],['pickaxe','Pickaxe','⛏️'],['wood','Wood','🪵'],['stone','Stone','🪨'],['fiber','Fiber','🌿'],['berries','Berries','🫐'],['raw_meat','Raw Meat','🥩'],['cooked_meat','Cooked Meat','🍖']];
const inv={rope:1,wall:1,reinforced:0,spikes:0,campfire:1,axe:1,pickaxe:1,wood:4,stone:4,fiber:5,berries:3,raw_meat:0,cooked_meat:0};
const food=createHuntingAndCooking(THREE,scene,mesh,mat,height,animals,inv,base,forest.campfirePosition);
let buildChoice='wall';
let selected=0,health=100,hunger=100,time=0,yaw=0,pitch=.45,drag=false,lastX=0,lastY=0;
let jumpHeight=0,jumpVelocity=0; // The character's airborne height above the terrain.
let jumpHeld=false;
const JUMP_SPEED=10.5,GRAVITY=25;
function attemptJump(){
  // A real jump starts instantly on the ground, even if the last frame has not run yet.
  if(jumpHeight>0.001||jumpVelocity>0)return false;
  if(!$('craft-backdrop').classList.contains('hidden')||!$('build-backdrop').classList.contains('hidden')||!$('cook-backdrop').classList.contains('hidden'))return false;
  jumpVelocity=JUMP_SPEED;
  jumpHeight=.035;
  return true;
}
function clockText(seconds){
  const total=Math.max(0,Math.ceil(seconds));
  return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
let previousPhase='';
function showClock(){
  const phase=getDayNightInfo(time);
  $('day-readout').textContent=phase.phase+' '+String(phase.cycleNumber).padStart(2,'0');
  $('cycle-phase').textContent=phase.isDay?'DAYTIME':'NIGHTTIME';
  $('phase-countdown-label').textContent=phase.isDay?'NIGHT IN':'SUNRISE IN';
  $('phase-countdown').textContent=clockText(phase.remainingSeconds);
  $('phase-progress').style.width=(phase.progress*100).toFixed(2)+'%';
  $('cycle-symbol').textContent=phase.isDay?'☀':'☾';
  const widget=$('cycle-info');
  widget.classList.toggle('is-night',!phase.isDay);
  widget.classList.toggle('near-sunset',phase.nearSunset);
  if(previousPhase && previousPhase!==phase.phase){
    notify(phase.isDay?'☀ Sunrise! Day '+phase.cycleNumber+' begins.':'☾ Night has fallen. Return to camp!');
  }
  previousPhase=phase.phase;
}
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
let lastAttackTime=-10;
function attackEnemy(){
  if(time-lastAttackTime<.42)return;
  lastAttackTime=time;
  const selectedItem=items[selected][0];
  const weapon=(inv[selectedItem]||0)>0?selectedItem:'';
  const enemyHit=threats.attack(player,yaw,weapon);
  if(enemyHit.hit){notify(enemyHit.message);return;}
  // If a cultist is not in range, the same attack button hunts nearby animals.
  const animalHit=food.hunt(player,yaw,weapon);
  if(animalHit.hit){notify(animalHit.message);return;}
  if(weapon==='axe'||weapon==='pickaxe')notify(animalHit.reason);
  else if(!getDayNightInfo(time).isDay)notify('Equip an axe to hunt animals or defend yourself');
}
function takeEnemyDamage(amount,attacker){
  health=Math.max(0,health-amount);
  updateUI();
  if(health<=0){
    // Reset to daylight after defeat, rather than respawning into a lethal raid.
    const currentNight=getDayNightInfo(time).cycleNumber;
    time=currentNight*270;
    threats.despawn();
    player.position.set(2,height(2,forest.campfirePosition.z+1),forest.campfirePosition.z+1);
    health=100;hunger=Math.max(hunger,60);
    jumpHeight=0;jumpVelocity=0;
    notify('You were defeated by '+attacker+'. Respawned at camp for a new day.');
    updateUI();
  }else{
    notify(attacker+' hit you (-'+amount+' health)');
  }
}
function updateThreatUI(phase,state){
  const readout=$('threat-status');
  const nearCamp=Math.hypot(player.position.x-forest.campfirePosition.x,player.position.z-forest.campfirePosition.z)<threats.SAFE_RADIUS;
  $('safe-zone-state').textContent=nearCamp?'🔥 CAMPFIRE SAFE ZONE · Stalker cannot enter':'⚠ OUTSIDE CAMPFIRE PROTECTION';
  const banner=$('raid-banner');
  banner.classList.toggle('hidden',phase.isDay);
  if(phase.isDay){
    readout.textContent='☀ Safe daylight · prepare your defenses';
  }else{
    const close=state.closestDistance==null?'searching':state.closestDistance+'m away';
    readout.textContent='☾ '+state.raiders+' cultist'+(state.raiders===1?'':'s')
      +' · Wendigo '+(state.stalker?'outside the camp':'gone')+' · Nearest '+close;
    $('raid-count').textContent=state.raiders+' CULTIST'+(state.raiders===1?'':'S');
    $('raid-range').textContent=state.closestDistance===null?'':('NEAREST ENEMY '+state.closestDistance+'m');
  }
  readout.classList.toggle('is-danger',!phase.isDay&&state.raiders>0);
}
function skipToNightForTesting(){
  const phase=getDayNightInfo(time);
  time=Math.floor(time/270)*270+(phase.isDay?180:270);
  const newPhase=getDayNightInfo(time);
  const status=threats.update(0,newPhase,player,takeEnemyDamage,notify);
  updateThreatUI(newPhase,status);
  showClock();
  notify(newPhase.isDay?'Daytime: raiders retreat.':'Night test activated! Look around the camp for glowing cultist torches.');
}
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.remove('show'),2500)}
function dist(x,z){return Math.hypot(player.position.x-x,player.position.z-z)}
function updateUI(){
  avatar.equip(items[selected]?.[0],inv[items[selected]?.[0]]||0);
  $('base-count').textContent=base.structures.filter(item=>item.type!=='campfire').length+' DEFENSIVE STRUCTURES';
  const chosen=RECIPES.find(r=>r.id===buildChoice);
  $('blueprint-state').textContent='BUILD PLAN: '+(chosen?chosen.name.toUpperCase():'WOOD WALL')+' ('+(inv[buildChoice]||0)+' READY)';
  $('food-supplies').textContent='🥩 Raw '+(inv.raw_meat||0)+' · 🍖 Cooked '+(inv.cooked_meat||0);
  const bar=$('hotbar');bar.innerHTML='';
  items.forEach(([id,n,emoji],i)=>{
    const button=document.createElement('button');
    button.className='slot'+(i===selected?' selected':'');
    const key=i<9?String(i+1):i===9?'0':'Q';
    button.innerHTML='<small>'+key+'</small><span>'+emoji+'</span><strong>'+n+'</strong><em>'+(inv[id]||0)+'</em>';
    button.onclick=()=>{selected=i;if(id==='wall'||id==='campfire')buildChoice=id;updateUI()};
    bar.appendChild(button);
  });$('health-value').textContent=Math.floor(health);$('hunger-value').textContent=Math.floor(hunger);$('health-fill').style.width=health+'%';$('hunger-fill').style.width=hunger+'%';$('tamed-count').textContent=animals.filter(a=>a.tamed).length;Object.keys(goals).forEach(k=>{let el=document.querySelector('[data-goal="'+k+'"]');if(el)el.classList.toggle('complete',goals[k])});let done=Object.values(goals).filter(Boolean).length;$('quest-progress').textContent=done+' / 4';$('quest-progress-bar').style.width=done*25+'%'}
function gather(){let r=resources.filter(r=>r.ready&&dist(r.x,r.z)<3.5).sort((a,b)=>dist(a.x,a.z)-dist(b.x,b.z))[0];if(!r)return notify('Get closer to a tree, rock or bush');let id=r.type==='tree'?'wood':r.type==='rock'?'stone':'fiber';inv[id]=(inv[id]||0)+(r.type==='tree'?3:2);if(r.type==='bush')inv.berries++;r.ready=false;r.g.visible=false;setTimeout(()=>{r.ready=true;r.g.visible=true},20000);goals.gather=true;notify('Collected '+id);updateUI()}
function tame(){
  const nearby=animals.filter(a=>a.alive!==false&&!a.tamed&&dist(a.g.position.x,a.g.position.z)<4)
    .sort((a,b)=>dist(a.g.position.x,a.g.position.z)-dist(b.g.position.x,b.g.position.z))[0];
  if(!nearby)return notify('Approach a living wild animal to tame it');
  if(!inv.rope)return notify('Craft a rope first');
  inv.rope--;nearby.tamed=true;goals.tame=true;
  notify('Animal tamed! It will follow you.');updateUI();
}
// Crafting takes place ONLY when the character stands near the world workbench.
function renderRecipes(){
  const panel=$('craft-recipes');panel.innerHTML='';
  for(const recipe of RECIPES){
    const affordable=canAfford(recipe,inv);
    const button=document.createElement('button');
    button.className='recipe material-recipe'+(affordable?'':' resource-shortage');
    button.disabled=!affordable;
    const requirements=Object.entries(recipe.cost).map(([name,needed])=>{
      const owned=inv[name]||0;
      return '<span class="resource-pill '+(owned>=needed?'enough':'missing')+'">'+name.toUpperCase()+' '+owned+'/'+needed+'</span>';
    }).join('');
    button.innerHTML='<span class="recipe-icon">'+recipe.icon+'</span><span class="recipe-body"><strong>'+recipe.name+'</strong><small>'+recipe.description+'</small><span class="recipe-costs">'+requirements+'</span></span><span class="recipe-action">'+(affordable?'CRAFT':'NEED SUPPLIES')+'</span>';
    button.onclick=()=>{
      if(!base.nearTable(player)){notify('Return to the crafting table');craft(false);return;}
      if(!craftRecipe(recipe,inv)){notify('Gather more supplies first');renderRecipes();return;}
      goals.craft=true;
      if(BUILDABLE.includes(recipe.id))buildChoice=recipe.id;
      notify(recipe.name+' crafted!'+(BUILDABLE.includes(recipe.id)?' Press B to place it.':''));
      updateUI();renderRecipes();
    };
    panel.appendChild(button);
  }
  $('craft-inventory').textContent='SUPPLIES · WOOD '+(inv.wood||0)+'  •  STONE '+(inv.stone||0)+'  •  FIBER '+(inv.fiber||0);
}
function craft(force){
  const modal=$('craft-backdrop');
  if(force===false){modal.classList.add('hidden');return;}
  if(!modal.classList.contains('hidden')){modal.classList.add('hidden');return;}
  if(!base.nearTable(player))return notify('Get closer to the wooden crafting table at camp. Press E or C nearby.');
  $('build-backdrop').classList.add('hidden');modal.classList.remove('hidden');renderRecipes();
}
function renderBuildMenu(){
  const panel=$('build-options');panel.innerHTML='';
  for(const id of BUILDABLE){
    const recipe=RECIPES.find(r=>r.id===id),qty=inv[id]||0;
    const button=document.createElement('button');
    button.className='recipe material-recipe'+(id===buildChoice?' chosen-blueprint':'');
    button.innerHTML='<span class="recipe-icon">'+recipe.icon+'</span><span class="recipe-body"><strong>'+recipe.name+'</strong><small>'+recipe.description+'</small></span><span class="recipe-action">'+qty+' READY</span>';
    button.onclick=()=>{
      buildChoice=id;
      $('build-backdrop').classList.add('hidden');
      updateUI();
      notify(recipe.name+' selected. Walk to your base perimeter and press B to place it.');
    };
    panel.appendChild(button);
  }
  $('build-summary').textContent='If your kit count is 0, gather supplies and craft another at the table.';
}
function buildMenu(force){
  const modal=$('build-backdrop');
  if(force===false){modal.classList.add('hidden');return;}
  if(!modal.classList.contains('hidden')){modal.classList.add('hidden');return;}
  $('craft-backdrop').classList.add('hidden');modal.classList.remove('hidden');renderBuildMenu();
}
function build(){
  if(!$('craft-backdrop').classList.contains('hidden')||!$('build-backdrop').classList.contains('hidden')||!$('cook-backdrop').classList.contains('hidden'))return;
  const type=buildChoice;
  if((inv[type]||0)<1)return notify('You need a crafted '+type+' kit. Use the camp workbench first.');
  const result=base.place(type,player,yaw);
  if(!result.ok)return notify(result.reason);
  inv[type]--;
  goals.build=true;
  notify('Placed '+RECIPES.find(r=>r.id===type).name+'! Defenses block cultists until destroyed.');
  updateUI();
}
// The same cooking station can be used at the original campfire or player-built campfires.
function showCookingStatus(){
  const info=food.cookInfo();
  $('cook-raw-count').textContent=info.raw;
  $('cook-cooked-count').textContent=info.cooked;
  $('cook-add').disabled=info.active||info.raw<1;
  $('cook-eat').disabled=info.cooked<1;
  $('cooking-progress').style.width=(info.active?(100*(1-info.remaining/info.duration)):0).toFixed(1)+'%';
  $('cooking-status').textContent=info.active
    ?'🔥 Cooking meat... '+info.remaining.toFixed(1)+' seconds remaining'
    :info.cooked>0?'🍖 Meat is ready! Eat it without losing health.':'🔥 Campfire is ready. Add 1 raw meat to start.';
}
function cookingMenu(force){
  const modal=$('cook-backdrop');
  if(force===false){modal.classList.add('hidden');return;}
  if(!modal.classList.contains('hidden')){modal.classList.add('hidden');return;}
  if(!food.canCook(player))return notify('Approach the central campfire or a placed campfire to cook meat.');
  $('craft-backdrop').classList.add('hidden');
  $('build-backdrop').classList.add('hidden');
  modal.classList.remove('hidden');
  showCookingStatus();
}
function cookRawMeat(){
  const result=food.startCooking(player);
  notify(result.message);showCookingStatus();updateUI();
}
function eatFood(item=''){
  const preferred=item||((items[selected]?.[0]==='raw_meat'||items[selected]?.[0]==='cooked_meat')?items[selected][0]:'');
  if(preferred==='raw_meat'||preferred==='cooked_meat'){
    const outcome=food.eat(preferred);
    if(!outcome.ok)return notify(outcome.message);
    hunger=Math.min(100,hunger+outcome.hunger);
    health=Math.max(0,health+outcome.health);
    notify(outcome.message);updateUI();showCookingStatus();return;
  }
  if((inv.cooked_meat||0)>0)return eatFood('cooked_meat');
  if((inv.berries||0)>0){
    inv.berries--;hunger=Math.min(100,hunger+22);
    notify('Ate berries: +22 hunger');updateUI();return;
  }
  notify('No food! Hunt an animal and cook its raw meat by the campfire.');
}
function save(){
  try{
    localStorage.setItem('fayez-haven-v1',JSON.stringify({
      inv,health,hunger,time,goals,x:player.position.x,z:player.position.z,
      structures:base.exportStructures(),buildChoice,
      hunting:food.saveState(),
      tamed:animals.map((a,i)=>a.tamed&&a.alive!==false?i:null).filter(x=>x!==null)
    }));
    notify('Game and defenses saved in this browser');
  }catch(e){notify('Save unavailable in this browser');}
}
function load(){
  try{
    const saved=JSON.parse(localStorage.getItem('fayez-haven-v1')||'null');
    if(!saved)return;
    Object.assign(inv,saved.inv||{});
    Object.assign(goals,saved.goals||{});
    health=saved.health??100;hunger=saved.hunger??100;time=saved.time||0;
    player.position.x=saved.x??player.position.x;
    player.position.z=saved.z??player.position.z;
    if(BUILDABLE.includes(saved.buildChoice))buildChoice=saved.buildChoice;
    base.restore(saved.structures);
    food.restoreState(saved.hunting);
    for(const i of (saved.tamed||[]))if(animals[i]&&animals[i].alive!==false)animals[i].tamed=true;
    notify('Previous save and defenses loaded');
  }catch(e){console.warn(e);}
}
$('save-btn').onclick=save;
$('craft-toggle').onclick=()=>craft();
$('craft-close').onclick=()=>craft(false);
$('build-toggle').onclick=()=>buildMenu();
$('build-close').onclick=()=>buildMenu(false);
$('night-test-btn').onclick=skipToNightForTesting;
$('cook-close').onclick=()=>cookingMenu(false);
$('cook-add').onclick=cookRawMeat;
$('cook-eat').onclick=()=>eatFood('cooked_meat');
// Global keyboard handling (including while the hotbar or HUD has focus).
window.addEventListener('keydown',e=>{
  const code=e.code||(e.key===' '?'Space':e.key);
  if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space'].includes(code)||e.key===' '||e.key==='Spacebar')e.preventDefault();
  keys.add(code);
  if(code==='Space'||e.key===' '||e.key==='Spacebar'){
    if(!jumpHeld&&!e.repeat)attemptJump();
    jumpHeld=true;
    return;
  }
  if(e.repeat)return;
  if(/^Digit[1-9]$/.test(code)){selected=+code.slice(-1)-1;updateUI()}
  if(code==='Digit0'){selected=9;updateUI()}
  if(code==='KeyQ'){selected=10;updateUI()}
  if(code==='KeyE'){
    if(base.nearTable(player))craft();
    else if(food.canCook(player))cookingMenu();
    else gather();
  }
  if(code==='KeyT')tame();
  if(code==='KeyB')build();
  if(code==='KeyC')craft();
  if(code==='KeyG')buildMenu();
  if(code==='KeyR')attackEnemy();
  // Prototype test shortcut: N jumps directly to the next phase, so you can test raids immediately.
  if(code==='KeyN')skipToNightForTesting();
  if(code==='KeyV'){
    zoomTarget=zoomTarget===0?9:0;
    if(zoomTarget!==0){
      pitch=Math.max(.08,pitch);
      if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
    }
  }
  if(code==='KeyF')eatFood()
},{capture:true});
window.addEventListener('keyup',e=>{
  const code=e.code||(e.key===' '?'Space':e.key);
  keys.delete(code);
  if(code==='Space'||e.key===' '||e.key==='Spacebar')jumpHeld=false;
});
window.addEventListener('blur',()=>{keys.clear();jumpHeld=false});
const jumpButton=$('jump-button');
jumpButton.addEventListener('pointerdown',e=>{e.preventDefault();attemptJump()});
// Click fallback for devices that don't dispatch pointerdown.
jumpButton.addEventListener('click',e=>{e.preventDefault();attemptJump()});
$('attack-button').addEventListener('pointerdown',e=>{e.preventDefault();attackEnemy()});
$('attack-button').addEventListener('click',e=>{e.preventDefault();attackEnemy()});
// Camera input: drag in third-person or first-person; click in first-person to lock the mouse.
renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==2)return;
  if(e.button===0)attackEnemy();
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
  if(!$('craft-backdrop').classList.contains('hidden')||!$('build-backdrop').classList.contains('hidden')||!$('cook-backdrop').classList.contains('hidden'))return;
  e.preventDefault();
  zoomCamera(e.deltaY,e.deltaMode);
},{passive:false,capture:true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
load();updateUI();showClock();let prev=performance.now();
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
  const nextX=THREE.MathUtils.clamp(player.position.x+(facingX*forward+cameraRightX*strafe)*speed*dt,-108,108);
  const nextZ=THREE.MathUtils.clamp(player.position.z+(facingZ*forward+cameraRightZ*strafe)*speed*dt,-108,108);
  // Solid defensive walls stop the player as well as cultists. Test each axis so
  // the player can slide along a wall instead of getting stuck on corners.
  if(!base.collidesAt(nextX,player.position.z,.29))player.position.x=nextX;
  if(!base.collidesAt(player.position.x,nextZ,.29))player.position.z=nextZ;
  player.rotation.y=yaw;
}
// Ground-locked vertical motion: begin at launch velocity, then accelerate downward.
if(jumpVelocity!==0||jumpHeight>0){
  jumpHeight+=jumpVelocity*dt-.5*GRAVITY*dt*dt;
  jumpVelocity-=GRAVITY*dt;
  if(jumpHeight<=0){jumpHeight=0;jumpVelocity=0;}
}
player.position.y=height(player.position.x,player.position.z)+jumpHeight;
avatar.animate(dt,len>0,keys.has('ShiftLeft')||keys.has('ShiftRight'),jumpHeight>0);
forest.update(time);
const phase=getDayNightInfo(time);
const enemyStatus=threats.update(dt,phase,player,takeEnemyDamage,notify);
updateThreatUI(phase,enemyStatus);
for(const a of animals){
  if(a.alive===false)continue; // A hunted animal cannot move, be tamed, or reappear.
  a.phase+=dt;
  if(a.tamed){
    const dx=player.position.x-a.g.position.x,dz=player.position.z-a.g.position.z,d=Math.hypot(dx,dz);
    if(d>3){a.g.position.x+=dx/d*dt*3;a.g.position.z+=dz/d*dt*3}
  }else{
    a.g.position.x+=Math.sin(a.phase)*dt*.25;
    a.g.position.z+=Math.cos(a.phase*.7)*dt*.25;
  }
  a.g.position.y=height(a.g.position.x,a.g.position.z);
}
const collectedMeat=food.updateDrops(dt,time,player);
if(collectedMeat>0){notify('Collected '+collectedMeat+' raw meat! Go to campfire to cook it.');updateUI();}
if(food.updateCooking(dt)){notify('🍖 Meat finished cooking! Eat it with F or at the campfire.');updateUI();}
if(!$('cook-backdrop').classList.contains('hidden'))showCookingStatus();
// Smooth camera zoom. Hide the avatar inside first person so the head does not obstruct the view.
zoomCurrent=THREE.MathUtils.damp(zoomCurrent,zoomTarget,14,dt);
const firstPerson=zoomCurrent<.45;
avatar.setFirstPerson(firstPerson);
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
showClock();
const near=resources.find(r=>r.ready&&dist(r.x,r.z)<3.5);
const nearWorkstation=base.nearTable(player);
const nearFire=food.canCook(player);
const nearAnimal=animals.find(a=>a.alive!==false&&dist(a.g.position.x,a.g.position.z)<4.2);
const meatNearby=food.getDrops().some(d=>dist(d.x,d.z)<3.4);
$('interaction').classList.toggle('hidden',!near&&!nearWorkstation&&!nearFire&&!nearAnimal&&!meatNearby);
if(nearWorkstation){
  $('interaction-title').textContent='Use Crafting Table';
  $('interaction-hint').textContent='Press E or C to craft using your supplies';
}else if(nearFire){
  $('interaction-title').textContent='Cook Meat at Campfire';
  $('interaction-hint').textContent='Press E • raw '+(inv.raw_meat||0)+' / cooked '+(inv.cooked_meat||0);
}else if(meatNearby){
  $('interaction-title').textContent='Raw Meat Dropped';
  $('interaction-hint').textContent='Walk over the meat to collect it.';
}else if(nearAnimal){
  $('interaction-title').textContent='Wild Animal Nearby';
  $('interaction-hint').textContent='Equip axe (4), face the animal, then click or press R to hunt.';
}else if(near){
  $('interaction-title').textContent='Gather '+near.type;
  $('interaction-hint').textContent='Press E to collect resources';
}
if(Math.floor(now/350)!==Math.floor((now-dt*1000)/350))updateUI();renderer.render(scene,camera)}
requestAnimationFrame(animate);
