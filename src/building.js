// FAYEZSD's Haven v0.8 - original physical workbench and destructible base defenses.
// World and inventory are kept separate so older saved inventories remain usable.
export const RECIPES=[
  {id:'wall',name:'Wooden Wall Kit',icon:'🪵',category:'DEFENSE',cost:{wood:5,fiber:2},description:'A fence panel that blocks raiders • 60 HP'},
  {id:'reinforced',name:'Reinforced Wall',icon:'🛡️',category:'DEFENSE',cost:{wood:8,stone:5},description:'Strong stone-and-timber defense • 125 HP'},
  {id:'spikes',name:'Spiked Barricade',icon:'🪤',category:'DEFENSE',cost:{wood:4,stone:3,fiber:2},description:'Blocks and injures attacking cultists • 42 HP'},
  {id:'campfire',name:'Portable Campfire',icon:'🔥',category:'DEFENSE',cost:{wood:3,stone:4},description:'Decoration and lighting (not a new safe zone)'},
  {id:'rope',name:'Rope',icon:'🪢',category:'TOOLS',cost:{fiber:3},description:'Needed to tame forest animals'},
  {id:'axe',name:'Axe',icon:'🪓',category:'TOOLS',cost:{wood:2,stone:2},description:'Melee weapon'},
  {id:'pickaxe',name:'Pickaxe',icon:'⛏️',category:'TOOLS',cost:{wood:2,stone:3},description:'Melee weapon'}
];
export const BUILDABLE=['wall','reinforced','spikes','campfire'];
export const STATISTICS={
  wall:{hp:60,width:3.2,depth:.4},
  reinforced:{hp:125,width:3.2,depth:.65},
  spikes:{hp:42,width:3.0,depth:.85},
  campfire:{hp:Infinity,width:1.7,depth:1.7}
};
export function canAfford(recipe,inv){
  return Object.entries(recipe.cost).every(([name,cost])=>(inv[name]||0)>=cost);
}
export function craftRecipe(recipe,inv){
  if(!recipe||!canAfford(recipe,inv))return false;
  for(const [name,cost] of Object.entries(recipe.cost))inv[name]-=cost;
  inv[recipe.id]=(inv[recipe.id]||0)+1;
  return true;
}
export function createBaseBuilding(THREE,scene,mesh,mat,height,camp){
  const wood=mat(0x815a39),darkWood=mat(0x483425),iron=mat(0x798e90),
    rock=mat(0x81847e),straw=mat(0xb6a06a),fire=new THREE.MeshBasicMaterial({color:0xff9f3c}),
    glow=new THREE.MeshBasicMaterial({color:0xf5df9e});
  const workbench={x:camp.x+4,z:camp.z+3};
  const table=new THREE.Group();table.position.set(workbench.x,height(workbench.x,workbench.z),workbench.z);scene.add(table);
  // Worktable with 4 sturdy legs, top planks, shelves, hammer, and a visible small lantern.
  for(const x of [-.93,.93])for(const z of [-.45,.45]){
    mesh(table,new THREE.BoxGeometry(.18,.93,.18),darkWood,x,.47,z);
  }
  mesh(table,new THREE.BoxGeometry(2.25,.19,1.35),wood,0,1.00,0);
  mesh(table,new THREE.BoxGeometry(2.0,.12,1.1),darkWood,0,.33,0);
  for(const z of [-.39,.0,.39])mesh(table,new THREE.BoxGeometry(2.3,.035,.045),darkWood,0,1.12,z);
  mesh(table,new THREE.BoxGeometry(.78,.13,.44),rock,-.43,1.18,.04);
  mesh(table,new THREE.BoxGeometry(.26,.39,.26),iron,.55,1.33,-.18);
  mesh(table,new THREE.CylinderGeometry(.12,.12,.64,7),darkWood,.56,1.39,.13);
  mesh(table,new THREE.BoxGeometry(.36,.24,.34),glow,.85,1.29,.25);
  const lamp=new THREE.PointLight(0xffbc6b,2.5,9,2);lamp.position.set(.83,1.6,.24);table.add(lamp);
  const structures=[];
  function distanceToTable(x,z){return Math.hypot(x-workbench.x,z-workbench.z)}
  function nearTable(player){return distanceToTable(player.position.x,player.position.z)<4.5}
  function createVisual(type,x,z,angle,hp){
    const spec=STATISTICS[type];if(!spec)return null;
    const root=new THREE.Group();root.position.set(x,height(x,z),z);root.rotation.y=angle;scene.add(root);
    if(type==='wall'||type==='reinforced'){
      for(const xx of [-1.48,-.49,.49,1.48]){
        mesh(root,new THREE.BoxGeometry(.24,2.5,.31),type==='wall'?darkWood:rock,xx,1.25,0);
      }
      for(const y of [.55,1.05,1.55,2.05]){
        mesh(root,new THREE.BoxGeometry(3.25,.42,type==='wall'?.32:.48),type==='wall'?wood:rock,0,y,0);
      }
      if(type==='reinforced')for(const y of [.45,2.22]){
        mesh(root,new THREE.BoxGeometry(3.4,.16,.64),iron,0,y,0);
      }
    }else if(type==='spikes'){
      for(const xx of [-1.2,-.6,0,.6,1.2]){
        const spear=mesh(root,new THREE.ConeGeometry(.27,1.48,5),wood,xx,1.1,.03);
        spear.rotation.z=xx*.08;
      }
      for(const y of [.35,.65])mesh(root,new THREE.BoxGeometry(3.05,.19,.35),darkWood,0,y,0);
    }else if(type==='campfire'){
      for(let k=0;k<7;k++){
        const t=k*Math.PI*2/7;
        mesh(root,new THREE.DodecahedronGeometry(.32,0),rock,Math.cos(t)*.75,.18,Math.sin(t)*.75);
      }
      for(const z of [-.2,.2]){
        const log=mesh(root,new THREE.CylinderGeometry(.14,.14,1.3,7),darkWood,0,.24,z);
        log.rotation.z=Math.PI/2;
      }
      mesh(root,new THREE.ConeGeometry(.35,.95,8),fire,0,.76,0);
      const light=new THREE.PointLight(0xffa54a,3.2,9,2);light.position.set(0,1.1,0);root.add(light);
    }
    const item={type,x,z,angle,hp:Math.min(Number.isFinite(hp)?hp:spec.hp,spec.hp),root,width:spec.width,depth:spec.depth};
    structures.push(item);
    return item;
  }
  function collidesAt(x,z,radius=.34){
    for(const item of structures){
      if(item.hp<=0||item.type==='campfire')continue;
      const dx=x-item.x,dz=z-item.z,c=Math.cos(item.angle),sn=Math.sin(item.angle);
      const localX=dx*c-dz*sn,localZ=dx*sn+dz*c;
      if(Math.abs(localX)<=item.width/2+radius&&Math.abs(localZ)<=item.depth/2+radius)return item;
    }
    return null;
  }
  function place(type,player,yaw){
    if(!BUILDABLE.includes(type))return {ok:false,reason:'Not a buildable structure'};
    // Center of panel appears 3.4m in front of the player.
    const x=player.position.x+Math.sin(yaw)*3.4;
    const z=player.position.z+Math.cos(yaw)*3.4;
    if(Math.abs(x)>104||Math.abs(z)>104)return {ok:false,reason:'Outside the world border'};
    if(Math.hypot(x-workbench.x,z-workbench.z)<2.6)return {ok:false,reason:'Too close to the crafting table'};
    if(Math.hypot(x-camp.x,z-camp.z)<2.1)return {ok:false,reason:'Too close to the central campfire'};
    if(structures.some(item=>Math.hypot(item.x-x,item.z-z)<2.7))return {ok:false,reason:'Too close to another structure'};
    const item=createVisual(type,x,z,yaw,STATISTICS[type].hp);
    return {ok:true,item};
  }
  function damage(item,amount){
    if(!item||item.type==='campfire'||item.hp<=0)return false;
    item.hp-=amount;
    if(item.hp<=0){
      scene.remove(item.root);
      const index=structures.indexOf(item);
      if(index>=0)structures.splice(index,1);
      return true;
    }
    return false;
  }
  function exportStructures(){
    return structures.map(({type,x,z,angle,hp})=>({type,x,z,angle,hp:Number.isFinite(hp)?hp:null}));
  }
  function restore(data){
    if(!Array.isArray(data))return;
    for(const item of data.slice(0,150)){
      if(!item||!BUILDABLE.includes(item.type)||!Number.isFinite(item.x)||!Number.isFinite(item.z))continue;
      if(Math.abs(item.x)>109||Math.abs(item.z)>109)continue;
      createVisual(item.type,item.x,item.z,Number.isFinite(item.angle)?item.angle:0,Number.isFinite(item.hp)?item.hp:STATISTICS[item.type].hp);
    }
  }
  return {nearTable,workbench,table,structures,place,collidesAt,damage,exportStructures,restore};
}
