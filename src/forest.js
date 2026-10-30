// Survival clock: each numbered day has 3 minutes of daylight and 90 seconds of night.
export const DAY_SECONDS=180, NIGHT_SECONDS=90, CYCLE_SECONDS=DAY_SECONDS+NIGHT_SECONDS;
const smoothstep=(edge0,edge1,x)=>{
  const t=Math.max(0,Math.min(1,(x-edge0)/(edge1-edge0)));
  return t*t*(3-2*t);
};
export function getDayNightInfo(elapsedSeconds){
  const elapsed=Number.isFinite(elapsedSeconds)?Math.max(0,elapsedSeconds):0;
  const timeInCycle=elapsed%CYCLE_SECONDS;
  const isDay=timeInCycle<DAY_SECONDS;
  const cycleNumber=Math.floor(elapsed/CYCLE_SECONDS)+1;
  const phaseElapsed=isDay?timeInCycle:timeInCycle-DAY_SECONDS;
  const duration=isDay?DAY_SECONDS:NIGHT_SECONDS;
  const remainingSeconds=Math.max(0,Math.ceil(duration-phaseElapsed-0.000001));
  // Fade into nighttime before sunset and fade back into day just before sunrise.
  const darkness=isDay?smoothstep(DAY_SECONDS-18,DAY_SECONDS,timeInCycle):
    1-smoothstep(CYCLE_SECONDS-14,CYCLE_SECONDS,timeInCycle);
  return {
    isDay, cycleNumber, phase:isDay?'DAY':'NIGHT',
    remainingSeconds, duration, phaseElapsed,
    progress:Math.max(0,Math.min(1,phaseElapsed/duration)),
    darkness, nearSunset:isDay&&remainingSeconds<=20
  };
}

// Original procedural low-poly wilderness for FAYEZSD's Haven.
// Dark pine forest, central campsite, flickering fire, and day/night ambience.
export function createForestMood(THREE, scene, mesh, mat, height, ground, grass, sun, hemisphere) {
  const pineA=mat(0x214c3a), pineB=mat(0x2b6649), pineC=mat(0x153d31);
  const bark=mat(0x513a29), dirt=mat(0x6d6242), slate=mat(0x566263);
  const lightWood=mat(0x92744a), canvas=mat(0x987a47), darkCanvas=mat(0x514e43);
  const flameMaterial=new THREE.MeshBasicMaterial({color:0xff9e36});
  const flameCore=new THREE.MeshBasicMaterial({color:0xffe2a1});
  const blackMat=mat(0x302c29);
  const campsite={x:0,z:13};
  // Forest silhouettes are slightly irregular and stacked instead of a single simple cone.
  function pine(parent,x,z,scale=1) {
    const g=new THREE.Group();
    g.position.set(x,height(x,z),z);
    g.scale.setScalar(scale);
    parent.add(g);
    mesh(g,new THREE.CylinderGeometry(.17,.31,3.25,6),bark,0,1.62,0);
    for(let i=0;i<4;i++){
      const tier=mesh(g,new THREE.ConeGeometry(1.6-i*.24,2.05,7),[pineA,pineB,pineA,pineC][i],0,2.55+i*.68,0);
      tier.rotation.y=i*.28;
    }
    return g;
  }
  function rock(parent,x,z,s=1) {
    const g=new THREE.Group();
    g.position.set(x,height(x,z),z);
    parent.add(g);
    const stone=mesh(g,new THREE.DodecahedronGeometry(s,0),slate,0,s*.57,0,1,.65,.86);
    stone.rotation.y=(x+z)*.1;
    return g;
  }
  // The clearing provides a recognizable safe home base without using copied assets.
  const camp=new THREE.Group();camp.position.set(campsite.x,height(0,campsite.z)+.07,campsite.z);scene.add(camp);
  const clearing=mesh(camp,new THREE.CircleGeometry(8,36),dirt,0,.015,0);
  clearing.rotation.x=-Math.PI/2;
  clearing.receiveShadow=true;
  // Warm fire pit surrounded by stones.
  const fire=new THREE.Group();fire.position.set(0,.08,0);camp.add(fire);
  for(let i=0;i<11;i++){
    const t=i/11*Math.PI*2;
    const pebble=mesh(fire,new THREE.DodecahedronGeometry(.35,0),slate,Math.cos(t)*1.08,.19,Math.sin(t)*1.08,.95,.65,.85);
    pebble.rotation.y=t;
  }
  for(let i=0;i<4;i++){
    const log=mesh(fire,new THREE.CylinderGeometry(.18,.2,1.9,7),bark,0,.25,0);
    log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/4;
  }
  const flames=[];
  for(let i=0;i<5;i++){
    const t=i*Math.PI*2/5;
    const flame=mesh(fire,new THREE.ConeGeometry(i===0?.36:.2,i===0?1.85:1.15,7),i%2?flameCore:flameMaterial,Math.sin(t)*.25,i===0?1.05:.83,Math.cos(t)*.25);
    flames.push(flame);
  }
  const fireLight=new THREE.PointLight(0xff8d36,11,28,2);
  fireLight.position.set(0,2,0);fire.add(fireLight);
  // Stacked logs and two simple supply crates.
  for(let side of [-1,1]){
    const bench=mesh(camp,new THREE.CylinderGeometry(.36,.36,3.4,8),bark,side*3,.43,1.4);
    bench.rotation.z=Math.PI/2;
  }
  for(let i=0;i<3;i++){
    const b=mesh(camp,new THREE.BoxGeometry(.92,.84,.92),lightWood,4.6+i*.8,.44,-1.9+i*.15);
    b.rotation.y=i*.28;
    mesh(camp,new THREE.BoxGeometry(.96,.08,.95),bark,4.6+i*.8,.85,-1.9+i*.15);
  }
  // Small stylized tent, with a dark doorway.
  const tent=new THREE.Group();
  tent.position.set(-4.4,0,-2.5);camp.add(tent);
  const tentBody=mesh(tent,new THREE.ConeGeometry(2,2.65,4),canvas,0,1.32,0);
  tentBody.rotation.y=Math.PI/4;
  mesh(tent,new THREE.BoxGeometry(1.0,1.55,.12),darkCanvas,0,.8,1.22);
  // Low rocks, fallen logs, mushrooms, and additional pine clusters.
  for(let i=0;i<55;i++){
    const a=i*2.399963,rad=18+Math.sqrt(i/54)*77;
    const x=Math.cos(a)*rad,z=campsite.z+Math.sin(a)*rad;
    if(Math.abs(x)>103||Math.abs(z)>103)continue;
    pine(scene,x,z,.75+(i%5)*.12);
    if(i%6===0)rock(scene,x+2,z-2,.5+(i%4)*.18);
  }
  const mushroomTop=mat(0xbf6550),mushroomStem=mat(0xd8c3a0);
  for(let i=0;i<42;i++){
    const x=((i*19.73)%174)-87,z=((i*31.17)%170)-85;
    if(Math.hypot(x,z-campsite.z)<9)continue;
    const g=new THREE.Group();g.position.set(x,height(x,z),z);scene.add(g);
    mesh(g,new THREE.CylinderGeometry(.045,.055,.24,5),mushroomStem,0,.12,0);
    mesh(g,new THREE.ConeGeometry(.19,.17,6),mushroomTop,0,.29,0);
  }
  // Original terrain color and thick cool haze.
  ground.material.color.setHex(0x3b7046);
  grass.material.color.setHex(0x44844d);
  const dayColor=new THREE.Color(0x88b7af),nightColor=new THREE.Color(0x071422);
  const currentColor=new THREE.Color();
  return {
    campfirePosition:campsite,
    update(time) {
      // Use the SAME clock as the HUD so the lighting changes at the exact phase transition.
      const night=getDayNightInfo(time).darkness;
      currentColor.copy(dayColor).lerp(nightColor,night*.94);
      scene.background.copy(currentColor);
      scene.fog.color.copy(currentColor);
      scene.fog.near=24+(1-night)*20;
      scene.fog.far=night>0.6?93:138;
      sun.intensity=THREE.MathUtils.lerp(.12,1.7,1-night);
      hemisphere.intensity=THREE.MathUtils.lerp(.32,1.7,1-night);
      fireLight.intensity=8+night*8+Math.sin(time*18)*1.8;
      flames.forEach((f,i)=>{
        f.scale.y=1+Math.sin(time*9+i*2.3)*.13;
        f.rotation.z=Math.sin(time*5+i)*.14;
      });
      return night;
    }
  };
}
