// Original procedural nighttime threats for FAYEZSD's Haven.
// The Stag Shadow cannot cross the CAMPFIRE sanctuary; cultist raiders CAN.
export function createNightEnemies(THREE, scene, mesh, mat, height, camp, defenses=null) {
  const SAFE_RADIUS=9;
  const enemies=[];
  const dark=mat(0x222b2d),horn=mat(0x94836c),red= new THREE.MeshBasicMaterial({color:0xff5b48});
  const cloak=mat(0x5a303a),trim=mat(0x9a6b46),skin=mat(0xbda391),blade=mat(0xa8b8c0);
  const fx=mat(0xf5b956);
  const torchFlame=new THREE.MeshBasicMaterial({color:0xffbf68});
  const warningRed=new THREE.MeshBasicMaterial({color:0xff5147});
  const warningOrange=new THREE.MeshBasicMaterial({color:0xffd17d});
  let currentNight=0,elapsed=0,lastPlayerHit=-10;
  const PLAYER_DAMAGE_COOLDOWN=1.6;
  const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
  function distance(x,z,xx,zz){return Math.hypot(x-xx,z-zz)}
  function makeEnemy(kind,x,z,index) {
    const root=new THREE.Group();
    root.position.set(x,height(x,z),z);
    scene.add(root);
    const visual=new THREE.Group();root.add(visual);
    if(kind==='stalker'){
      mesh(visual,new THREE.BoxGeometry(.86,2.25,.54),dark,0,2.25,0);
      mesh(visual,new THREE.SphereGeometry(.42,8,7),dark,0,3.62,.07);
      for(const side of [-1,1]){
        const arm=mesh(visual,new THREE.CylinderGeometry(.12,.2,2.6,6),dark,side*.58,2.17,.05);
        arm.rotation.z=side*.25;
        mesh(visual,new THREE.CylinderGeometry(.18,.11,1.4,6),dark,side*.29,.73,0);
        const antler=mesh(visual,new THREE.CylinderGeometry(.08,.05,1.5,5),horn,side*.34,4.35,.03);
        antler.rotation.z=-side*.38;
        const tip=mesh(visual,new THREE.ConeGeometry(.1,.75,5),horn,side*.7,4.75,.03);
        tip.rotation.z=-side*.62;
        mesh(visual,new THREE.SphereGeometry(.14,8,7),red,side*.16,3.68,.39);
      }
      // Bright, elevated red warning glow makes the stalker visible in the dark.
      const eyesLight=new THREE.PointLight(0xff3c3c,4.5,17,2);
      eyesLight.position.set(0,3.62,.4);visual.add(eyesLight);
      mesh(visual,new THREE.ConeGeometry(.28,.62,7),warningRed,0,5.25,0);
    }else{
      mesh(visual,new THREE.ConeGeometry(.61,1.95,6),cloak,0,1.23,0);
      mesh(visual,new THREE.SphereGeometry(.34,8,7),cloak,0,2.36,0);
      mesh(visual,new THREE.SphereGeometry(.21,7,6),dark,0,2.32,.25);
      for(const side of [-1,1]){
        mesh(visual,new THREE.SphereGeometry(.044,6,5),fx,side*.095,2.35,.425);
        const arm=mesh(visual,new THREE.CylinderGeometry(.13,.12,1.08,6),cloak,side*.52,1.47,.06);
        arm.rotation.z=side*.2;
      }
      mesh(visual,new THREE.CylinderGeometry(.06,.06,.96,6),trim,.7,1.35,.18);
      mesh(visual,new THREE.BoxGeometry(.36,.34,.12),blade,.84,1.82,.18);
      // Hand-held bright torch and floating marker, visible from the campfire.
      mesh(visual,new THREE.CylinderGeometry(.055,.055,.9,6),trim,-.65,1.65,.18);
      mesh(visual,new THREE.ConeGeometry(.23,.64,7),torchFlame,-.65,2.35,.18);
      const torchLight=new THREE.PointLight(0xff9850,4.3,14,2);
      torchLight.position.set(-.65,2.2,.18);visual.add(torchLight);
      mesh(visual,new THREE.ConeGeometry(.25,.55,6),warningOrange,0,3.30,0);
    }
    const enemy={kind,root,visual,alive:true,hp:kind==='cultist'?3:Infinity,
      speed:kind==='stalker'?5.4:2.65+(index%3)*.25,
      attackCooldown:1+index*.25,wallCooldown:0,stagger:0,index};
    enemies.push(enemy);return enemy;
  }
  function despawn(){
    for(const e of enemies)scene.remove(e.root);
    enemies.length=0;
    currentNight=0;
  }
  function spawnNight(night){
    despawn();currentNight=night;
    // Appear just OUTSIDE the campfire's protected radius, in clear view.
    // The first cultist approaches from directly ahead of the starting camera.
    const positions=[
      [0,15],[-10.5,10],[10.5,10],[-14,2],[14,2],[0,-15]
    ];
    makeEnemy('stalker',camp.x+12.5,camp.z+9.5,0);
    const count=Math.min(3+Math.floor((night-1)/2),6);
    for(let i=0;i<count;i++){
      const [dx,dz]=positions[i];
      makeEnemy('cultist',camp.x+dx,camp.z+dz,i);
    }
    return count;
  }
  function positionAt(e,x,z){
    e.root.position.x=clamp(x,-106,106);
    e.root.position.z=clamp(z,-106,106);
    e.root.position.y=height(e.root.position.x,e.root.position.z);
  }
  function update(dt,phase,player,onDamage,onAlert){
    elapsed+=dt;
    if(phase.isDay){if(currentNight)despawn();return {raiders:0,stalker:false,insideCamp:false};}
    if(currentNight!==phase.cycleNumber){
      const raiders=spawnNight(phase.cycleNumber);
      onAlert?.('Night '+phase.cycleNumber+': '+raiders+' raiders are approaching! The forest stalker fears the campfire.');
    }
    const insideCamp=distance(player.position.x,player.position.z,camp.x,camp.z)<SAFE_RADIUS;
    let liveRaiders=0;
    for(const e of enemies){
      if(!e.alive)continue;
      if(e.kind==='cultist')liveRaiders++;
      e.attackCooldown=Math.max(0,e.attackCooldown-dt);
      e.wallCooldown=Math.max(0,e.wallCooldown-dt);
      e.stagger=Math.max(0,e.stagger-dt);
      const x=e.root.position.x,z=e.root.position.z,px=player.position.x,pz=player.position.z;
      const d=distance(x,z,px,pz);
      const isStalker=e.kind==='stalker';
      if(e.stagger<=0){
        let tx=px,tz=pz;
        if(isStalker&&insideCamp){
          // Patrol outside the circular protective campfire aura instead of entering it.
          const ex=x-camp.x,ez=z-camp.z,dist=Math.max(.01,Math.hypot(ex,ez));
          tx=camp.x+ex/dist*(SAFE_RADIUS+2.0);
          tz=camp.z+ez/dist*(SAFE_RADIUS+2.0);
        }
        const desiredDistance=isStalker&&!insideCamp?1.8:1.4;
        const moveDistance=distance(x,z,tx,tz);
        if(moveDistance>desiredDistance){
          const amount=Math.min(moveDistance-desiredDistance,e.speed*dt);
          let nx=x+(tx-x)/moveDistance*amount,nz=z+(tz-z)/moveDistance*amount;
          if(isStalker){
            // Hard boundary guarantee, including when the player is on the opposite side.
            let cx=nx-camp.x,cz=nz-camp.z,rad=Math.hypot(cx,cz);
            if(rad<SAFE_RADIUS+.8){
              if(rad<.001){cx=x-camp.x;cz=z-camp.z;rad=Math.max(.001,Math.hypot(cx,cz));}
              nx=camp.x+cx/rad*(SAFE_RADIUS+.8);
              nz=camp.z+cz/rad*(SAFE_RADIUS+.8);
            }
          }
          // Camp-built barricades stop raiders. They chip away at the structure until it falls.
          // Spiked panels also injure cultists on contact, giving your base real defensive value.
          const blocker=defenses?.collidesAt(nx,nz,isStalker?.52:.37);
          if(blocker){
            if(e.wallCooldown<=0){
              e.wallCooldown=isStalker?1.1:1.45;
              const broken=defenses.damage(blocker,isStalker?20:11);
              if(blocker.type==='spikes' && !isStalker){
                e.hp-=1;
                e.stagger=.45;
                if(e.hp<=0){e.alive=false;scene.remove(e.root);}
              }
              if(broken)onAlert?.(blocker.type+' defense destroyed!');
            }
          }else{
            positionAt(e,nx,nz);
          }
        }
      }
      // Spiked defenses may have defeated this raider during movement.
      if(!e.alive)continue;
      const dx=player.position.x-e.root.position.x,dz=player.position.z-e.root.position.z;
      e.root.rotation.y=Math.atan2(dx,dz);
      e.visual.position.y=Math.sin(elapsed*(isStalker?3.2:5.2)+e.index)*.075;
      if(e.stagger>0)e.visual.rotation.z=Math.sin(elapsed*22)*.14;
      else e.visual.rotation.z=0;
      const range=isStalker?2.3:1.75;
      // Give the player time to SEE a raid; enemies share a damage cooldown.
      if(e.attackCooldown<=0&&distance(e.root.position.x,e.root.position.z,px,pz)<range&&!(isStalker&&insideCamp)){
        e.attackCooldown=isStalker?1.55:1.15;
        if(elapsed-lastPlayerHit>=PLAYER_DAMAGE_COOLDOWN){
          lastPlayerHit=elapsed;
          onDamage?.(isStalker?17:7,isStalker?'Forest Stalker':'Cultist Raider');
        }
      }
    }
    let closest=Infinity;
    for(const e of enemies){
      if(!e.alive)continue;
      closest=Math.min(closest,distance(e.root.position.x,e.root.position.z,player.position.x,player.position.z));
    }
    return {
      raiders:liveRaiders,
      stalker:enemies.some(e=>e.alive&&e.kind==='stalker'),
      insideCamp,
      closestDistance:Number.isFinite(closest)?Math.ceil(closest):null
    };
  }
  function attack(player,yaw,weapon,shot=null){
    const damage=shot?.damage ?? (weapon==='axe'||weapon==='pickaxe'?2:1);
    const maxRange=shot?.range ?? 3.35;
    const aim=shot?.accuracy ?? .30;
    // Game targeting follows where the character is facing.
    const forwardX=Math.sin(yaw),forwardZ=Math.cos(yaw);
    let target=null,best=Infinity;
    for(const e of enemies){
      if(!e.alive)continue;
      const dx=e.root.position.x-player.position.x,dz=e.root.position.z-player.position.z;
      const d=Math.hypot(dx,dz);
      if(d>maxRange||d<.001||d>=best)continue;
      if(dx/d*forwardX+dz/d*forwardZ<aim)continue;
      target=e;best=d;
    }
    if(!target)return {hit:false,message:'No enemy in range'};
    if(target.kind==='stalker'){
      target.stagger=.35;
      return {hit:true,defeated:false,message:'The Forest Stalker cannot be defeated! Run toward the campfire.'};
    }
    target.hp-=damage;target.stagger=.35;
    if(target.hp<=0){
      target.alive=false;scene.remove(target.root);
      return {hit:true,defeated:true,message:'Cultist defeated!'};
    }
    return {hit:true,defeated:false,message:'Hit! Cultist health: '+Math.max(0,target.hp)};
  }
  // Visible small fire-lit boundary markers let players recognize their sanctuary.
  const markerLight=new THREE.MeshBasicMaterial({color:0xf0b35e,transparent:true,opacity:.85});
  for(let i=0;i<20;i++){
    const theta=i/20*Math.PI*2,x=camp.x+Math.cos(theta)*SAFE_RADIUS,z=camp.z+Math.sin(theta)*SAFE_RADIUS;
    const pebble=new THREE.Mesh(new THREE.DodecahedronGeometry(.13,0),markerLight);
    pebble.position.set(x,height(x,z)+.13,z);scene.add(pebble);
  }
  return {update,attack,despawn,getEnemies:()=>enemies,SAFE_RADIUS,camp};
}
