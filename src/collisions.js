// Shared top-down solid-object collision for FAYEZSD's Haven.
// Invisible collision boundaries match the footprint of real 3D objects;
// leaves, decorative grass, effects and collectible loot remain passable.
export function createCollisionWorld() {
  const solids=[];
  const active=entry=>!entry.active||entry.active()!==false;
  function addCircle(x,z,radius,opts={}){
    const o={kind:'circle',x,z,radius,tag:opts.tag||'object',active:opts.active};
    solids.push(o);return o;
  }
  function addBox(x,z,width,depth,angle=0,opts={}){
    const o={kind:'box',x,z,width,depth,angle,tag:opts.tag||'object',active:opts.active};
    solids.push(o);return o;
  }
  function overlaps(o,x,z,radius){
    const dx=x-o.x,dz=z-o.z;
    if(o.kind==='circle'){
      const sum=radius+o.radius;
      return dx*dx+dz*dz < sum*sum-1e-7;
    }
    const co=Math.cos(o.angle),si=Math.sin(o.angle);
    const lx=dx*co-dz*si,lz=dx*si+dz*co;
    const nearestX=Math.max(-o.width/2,Math.min(o.width/2,lx));
    const nearestZ=Math.max(-o.depth/2,Math.min(o.depth/2,lz));
    const ax=lx-nearestX,az=lz-nearestZ;
    return ax*ax+az*az < radius*radius-1e-7;
  }
  function collidesAt(x,z,radius=.32,extra=null){
    // The world border is solid too, and slightly inside the visible terrain.
    if(x-radius < -109||x+radius >109||z-radius < -109||z+radius>109)
      return {tag:'world border'};
    for(const o of solids){
      if(!active(o))continue;
      // Fast broad-phase pruning before the box/circle narrow-phase check.
      const width=o.kind==='circle'?o.radius:Math.max(o.width,o.depth);
      if(Math.abs(x-o.x)>width+radius||Math.abs(z-o.z)>width+radius)continue;
      if(overlaps(o,x,z,radius))return o;
    }
    if(extra){
      const hit=extra(x,z,radius);
      if(hit)return hit===true?{tag:'solid object'}:hit;
    }
    return null;
  }
  function move(x,z,dx,dz,radius=.32,extra=null){
    // Microsteps prevent sprinting or low frame rates from tunneling through solids.
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.14));
    const sx=dx/steps,sz=dz/steps;
    let cx=x,cz=z,blocked=null;
    for(let i=0;i<steps;i++){
      if(!collidesAt(cx+sx,cz+sz,radius,extra)){cx+=sx;cz+=sz;continue;}
      let didSlide=false;
      if(Math.abs(sx)>1e-10&&!collidesAt(cx+sx,cz,radius,extra)){cx+=sx;didSlide=true;}
      if(Math.abs(sz)>1e-10&&!collidesAt(cx,cz+sz,radius,extra)){cz+=sz;didSlide=true;}
      if(!didSlide)blocked=collidesAt(cx+sx,cz+sz,radius,extra);
    }
    return {x:cx,z:cz,blocked};
  }
  function findFree(x,z,radius=.32,extra=null){
    if(!collidesAt(x,z,radius,extra))return {x,z};
    // Old saves sometimes put the player inside an object; move to the nearest
    // collision-free position without resetting their inventory or progress.
    for(let distance=.25;distance<=9;distance+=.25){
      const count=32;
      for(let i=0;i<count;i++){
        const angle=i*Math.PI*2/count;
        const xx=x+Math.cos(angle)*distance,zz=z+Math.sin(angle)*distance;
        if(!collidesAt(xx,zz,radius,extra))return {x:xx,z:zz};
      }
    }
    return {x,z};
  }
  return {addCircle,addBox,collidesAt,move,findFree,solids};
}
