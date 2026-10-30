// Fictional combat balancing for the browser survival game (not real-world weapon data).
export const FIREARMS={
  revolver:{name:'Revolver',key:'Z',damage:2,range:19,cooldown:.55,accuracy:.90,icon:'🔫'},
  rifle:{name:'Rifle',key:'X',damage:2,range:32,cooldown:.28,accuracy:.93,icon:'🔫'},
  sniper:{name:'Sniper',key:'H',damage:4,range:60,cooldown:1.20,accuracy:.975,icon:'🎯'}
};
export const AMMO_ITEM='ammo';
export function isFirearm(id){return Object.prototype.hasOwnProperty.call(FIREARMS,id)}
export function tryFire(id,inventory,now,previousShotTime=-Infinity){
  const config=FIREARMS[id];
  if(!config)return {ok:false,message:'Equip a firearm first.'};
  if((inventory[id]||0)<1)return {ok:false,message:'Craft a '+config.name+' at the workbench.'};
  if(now-previousShotTime<config.cooldown)return {ok:false,cooldown:true,message:'Weapon is recovering.'};
  if((inventory[AMMO_ITEM]||0)<1)return {ok:false,message:'Out of ammo! Craft an ammo bundle at the workbench.'};
  inventory[AMMO_ITEM]--;
  return {ok:true,...config,id,ammoLeft:inventory[AMMO_ITEM]};
}
