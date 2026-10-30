// FAYEZSD's Haven v1.0 - wildlife hunting, meat drops and campfire cooking.
// Kept independent of controls and HUD so hunting/cooking can be tested reliably.
export function createHuntingAndCooking(THREE,scene,mesh,mat,height,animals,inventory,base,camp) {
  const drops=[];
  const freshMat=new THREE.MeshStandardMaterial({color:0xc85057,roughness:.9});
  const whiteMat=new THREE.MeshStandardMaterial({color:0xf4ead8,roughness:.8});
  const markerMat=new THREE.MeshBasicMaterial({color:0xffd5a5});
  let cooking=null;
  const COOK_SECONDS=5,MEAT_PER_ANIMAL=2;
  const distance=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);
  function createMeatDrop(x,z,amount=MEAT_PER_ANIMAL){
    const root=new THREE.Group();
    root.position.set(x,height(x,z)+.47,z);
    mesh(root,new THREE.SphereGeometry(.32,10,8),freshMat,0,0,0,1.15,.75,.9);
    mesh(root,new THREE.SphereGeometry(.14,8,7),whiteMat,.24,.05,.0);
    mesh(root,new THREE.ConeGeometry(.12,.25,6),markerMat,0,.56,0);
    scene.add(root);
    const drop={x,z,amount,root,age:0};
    drops.push(drop);
    return drop;
  }
  function pickup(drop){
    const index=drops.indexOf(drop);
    if(index===-1)return 0;
    inventory.raw_meat=(inventory.raw_meat||0)+drop.amount;
    scene.remove(drop.root);
    drops.splice(index,1);
    return drop.amount;
  }
  function closestWildAnimal(player,yaw,maxRange=4.2,accuracy=0){
    let best=null,dist=Infinity;
    for(const animal of animals){
      if(animal.alive===false)continue;
      const dx=animal.g.position.x-player.position.x,dz=animal.g.position.z-player.position.z;
      const d=Math.hypot(dx,dz);
      if(d>maxRange||d<.001||d>=dist)continue;
      if((Math.sin(yaw)*dx+Math.cos(yaw)*dz)/d<accuracy)continue;
      best=animal;dist=d;
    }
    return best;
  }
  function hunt(player,yaw,weapon,shot=null){
    if(!shot&&weapon!=='axe'&&weapon!=='pickaxe'){
      return {hit:false,reason:'Equip your axe (4), pickaxe (5), or a crafted firearm to hunt.'};
    }
    const animal=closestWildAnimal(player,yaw,shot?.range??4.2,shot?.accuracy??0);
    if(!animal)return {hit:false,reason:shot?'No animal in your sights. Face an animal and fire.':'No animal in range. Walk closer and face one.'};
    animal.hp=(animal.hp??2)-(shot?.damage??2);
    if(animal.hp>0)return {hit:true,killed:false,message:'Animal hit!'};
    animal.alive=false;animal.tamed=false;
    scene.remove(animal.g);
    const drop=createMeatDrop(animal.g.position.x,animal.g.position.z);
    return {hit:true,killed:true,drop,message:'Animal hunted! Raw meat dropped. Walk over it to collect.'};
  }
  function updateDrops(dt,time,player){
    let picked=0;
    for(const drop of [...drops]){
      drop.age+=dt;
      drop.root.position.y=height(drop.x,drop.z)+.48+Math.sin(time*4+drop.x)*.13;
      drop.root.rotation.y+=dt*1.2;
      // Auto-pickup on approach means the loot works without a separate action.
      if(drop.age>.35&&distance(drop.x,drop.z,player.position.x,player.position.z)<2.1){
        picked+=pickup(drop);
      }
    }
    return picked;
  }
  function getNearbyFire(player){
    const x=player.position.x,z=player.position.z;
    if(distance(x,z,camp.x,camp.z)<=2.45)return {x:camp.x,z:camp.z,type:'central'};
    for(const item of base.structures){
      if(item.type==='campfire'&&distance(x,z,item.x,item.z)<=2.7)return item;
    }
    return null;
  }
  function canCook(player){return !!getNearbyFire(player)}
  function startCooking(player){
    if(!canCook(player))return {ok:false,message:'Stand next to a lit campfire to cook.'};
    if(cooking)return {ok:false,message:'Meat is already cooking. Wait for it to finish.'};
    if((inventory.raw_meat||0)<1)return {ok:false,message:'Hunt an animal and collect raw meat first.'};
    inventory.raw_meat--;
    cooking={remaining:COOK_SECONDS};
    return {ok:true,message:'Raw meat placed over the fire! Cooking for 5 seconds.'};
  }
  function updateCooking(dt){
    if(!cooking)return false;
    cooking.remaining-=dt;
    if(cooking.remaining>0)return false;
    inventory.cooked_meat=(inventory.cooked_meat||0)+1;
    cooking=null;
    return true;
  }
  function cookInfo(){return {active:!!cooking,remaining:Math.max(0,cooking?.remaining||0),duration:COOK_SECONDS,raw:inventory.raw_meat||0,cooked:inventory.cooked_meat||0}}
  function eat(which){
    if((inventory[which]||0)<1)return {ok:false,message:'You have no '+(which==='raw_meat'?'raw':'cooked')+' meat.'};
    inventory[which]--;
    if(which==='cooked_meat')return {ok:true,hunger:38,health:0,message:'Ate cooked meat: +38 hunger, no health lost!'};
    return {ok:true,hunger:12,health:-12,message:'Raw meat is unsafe: +12 hunger, -12 health. Cook it first!'};
  }
  function saveState(){
    return {
      killedAnimals:animals.flatMap((animal,i)=>animal.alive===false?[i]:[]),
      drops:drops.map(({x,z,amount})=>({x,z,amount})),
      cookingRemaining:cooking?Math.max(0,cooking.remaining):null
    };
  }
  function restoreState(state){
    if(!state||typeof state!=='object')return;
    for(const i of (state.killedAnimals||[])){
      if(!Number.isInteger(i)||i<0||i>=animals.length)continue;
      const animal=animals[i];animal.alive=false;animal.tamed=false;scene.remove(animal.g);
    }
    for(const drop of (state.drops||[]).slice(0,60)){
      if(!Number.isFinite(drop.x)||!Number.isFinite(drop.z)||!Number.isFinite(drop.amount))continue;
      if(Math.abs(drop.x)>110||Math.abs(drop.z)>110)continue;
      createMeatDrop(drop.x,drop.z,Math.max(1,Math.min(4,Math.floor(drop.amount))));
    }
    if(Number.isFinite(state.cookingRemaining)&&state.cookingRemaining>0){
      cooking={remaining:Math.min(COOK_SECONDS,state.cookingRemaining)};
    }
  }
  return {hunt,closestWildAnimal,updateDrops,getNearbyFire,canCook,startCooking,updateCooking,cookInfo,eat,saveState,restoreState,getDrops:()=>drops,COOK_SECONDS};
}
