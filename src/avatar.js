// Procedural articulated character and held-item display for FAYEZSD's Haven.
// This module depends only on Three.js (already loaded by index.html).
export function createAvatar(THREE, scene, camera, mesh, mat, group) {
  const player = group(0, 0);
  const shirt = mat(0x356759), pants = mat(0x344c55);
  const skin = mat(0xd0a27d), boots = mat(0x382b26);
  const hair = mat(0x2c241f), eyes = mat(0x182525);
  mesh(player, new THREE.BoxGeometry(.76, .87, .37), shirt, 0, 1.31, 0);
  mesh(player, new THREE.BoxGeometry(.69, .27, .34), pants, 0, .78, 0);
  mesh(player, new THREE.CylinderGeometry(.12, .12, .17, 9), skin, 0, 1.82, 0);
  mesh(player, new THREE.SphereGeometry(.28, 14, 10), skin, 0, 2.02, 0);
  mesh(player, new THREE.SphereGeometry(.285, 14, 9), hair, 0, 2.225, -.02, 1.03, .4, 1.03);
  for (const x of [-.1, .1]) {
    mesh(player, new THREE.SphereGeometry(.029, 7, 6), eyes, x, 2.05, .268);
  }
  function pivot(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    player.add(g);
    return g;
  }
  const leftArm = pivot(.49, 1.66, 0), rightArm = pivot(-.49, 1.66, 0);
  for (const arm of [leftArm, rightArm]) {
    mesh(arm, new THREE.BoxGeometry(.255, .45, .30), shirt, 0, -.22, 0);
    mesh(arm, new THREE.BoxGeometry(.205, .42, .245), skin, 0, -.63, 0);
    mesh(arm, new THREE.BoxGeometry(.22, .20, .25), skin, 0, -.91, 0);
  }
  const leftLeg = pivot(.2, .7, 0), rightLeg = pivot(-.2, .7, 0);
  for (const leg of [leftLeg, rightLeg]) {
    mesh(leg, new THREE.BoxGeometry(.29, .54, .32), pants, 0, -.27, 0);
    mesh(leg, new THREE.BoxGeometry(.31, .23, .44), boots, 0, -.575, .07);
  }
  const thirdHand = new THREE.Group();
  thirdHand.position.set(0, -.96, .13);
  rightArm.add(thirdHand);
  // First-person arms/items remain visible when the character body is hidden.
  const firstRig = new THREE.Group();
  firstRig.position.set(.58, -.52, -1.05);
  firstRig.visible = false;
  const forearm = mesh(firstRig, new THREE.CylinderGeometry(.12, .16, .73, 10), shirt, .12, -.54, .17);
  forearm.rotation.z = .34;
  mesh(firstRig, new THREE.SphereGeometry(.135, 10, 8), skin, 0, -.19, .02);
  const firstHand = new THREE.Group();
  firstHand.position.set(0, -.15, -.05);
  firstRig.add(firstHand);
  camera.add(firstRig);
  scene.add(camera);
  const toolHandle = mat(0x765134), metal = mat(0xb2c5c9), edge = mat(0xe0e9e9);
  const rope = mat(0xb8965c), fire = mat(0xff9d34), berry = mat(0x4b377c);
  const timber = mat(0x69503a), leaves = mat(0x366b40), stone = mat(0x8a9492);
  const modelCache = new Map();
  function buildItem(type) {
    const g = new THREE.Group();
    const shaft = () => mesh(g, new THREE.CylinderGeometry(.047, .065, .94, 9), toolHandle, 0, .35, 0);
    if (type === 'axe') {
      shaft();
      mesh(g, new THREE.BoxGeometry(.43, .34, .18), metal, .22, .73, 0);
      mesh(g, new THREE.BoxGeometry(.09, .39, .20), edge, .47, .73, 0);
    } else if (type === 'pickaxe') {
      shaft();
      mesh(g, new THREE.BoxGeometry(.83, .18, .18), metal, 0, .77, 0);
      const l = mesh(g, new THREE.ConeGeometry(.12, .35, 9), edge, -.48, .77, 0);
      const r = mesh(g, new THREE.ConeGeometry(.12, .35, 9), edge, .48, .77, 0);
      l.rotation.z = Math.PI / 2;
      r.rotation.z = -Math.PI / 2;
    } else if (type === 'rope') {
      const coil = mesh(g, new THREE.TorusGeometry(.24, .085, 8, 20), rope, 0, .3, 0);
      coil.rotation.x = .4;
      mesh(g, new THREE.CylinderGeometry(.055, .055, .32, 7), rope, .19, .07, 0);
    } else if (type === 'wall') {
      mesh(g, new THREE.BoxGeometry(.69, .67, .15), timber, 0, .38, 0);
      for (const y of [.18, .39, .60]) {
        mesh(g, new THREE.BoxGeometry(.73, .025, .17), toolHandle, 0, y, .01);
      }
    } else if (type === 'campfire') {
      for (const z of [-.12, .12]) {
        const log = mesh(g, new THREE.CylinderGeometry(.08, .08, .57, 8), timber, 0, .17, z);
        log.rotation.z = Math.PI / 2;
      }
      mesh(g, new THREE.ConeGeometry(.23, .60, 8), fire, 0, .47, 0);
    } else if (type === 'wood') {
      const log = mesh(g, new THREE.CylinderGeometry(.17, .18, .67, 9), timber, 0, .35, 0);
      log.rotation.z = Math.PI / 2;
    } else if (type === 'stone') {
      mesh(g, new THREE.DodecahedronGeometry(.28), stone, 0, .24, 0);
    } else if (type === 'fiber') {
      for (const x of [-.17, 0, .17]) {
        const blade = mesh(g, new THREE.ConeGeometry(.115, .62, 6), leaves, x, .34, 0);
        blade.rotation.z = x * 1.5;
      }
    } else if (type === 'berries') {
      for (const [x, y, z] of [[-.13, .21, 0], [.13, .25, 0], [0, .40, .08]]) {
        mesh(g, new THREE.SphereGeometry(.135, 9, 7), berry, x, y, z);
      }
      mesh(g, new THREE.ConeGeometry(.14, .15, 6), leaves, 0, .54, 0);
    }
    return g;
  }
  let equipped = null, walkTime = 0;
  function equip(type, count) {
    const next = count > 0 && type ? type : '';
    if (next === equipped) return;
    equipped = next;
    thirdHand.clear();
    firstHand.clear();
    if (!next) return;
    if (!modelCache.has(next)) modelCache.set(next, buildItem(next));
    const template = modelCache.get(next);
    thirdHand.add(template.clone(true));
    const model = template.clone(true);
    model.scale.setScalar(.87);
    firstHand.add(model);
  }
  function animate(dt, moving, sprinting, airborne=false) {
    if (moving && !airborne) walkTime += dt * (sprinting ? 12 : 8);
    const step = moving && !airborne ? Math.sin(walkTime) * .62 : 0;
    const spring = (a, b) => THREE.MathUtils.damp(a, b, 13, dt);
    // Bent knees and arms forward during a jump, smooth walking gait on the ground.
    leftLeg.rotation.x = spring(leftLeg.rotation.x, airborne ? -.36 : step);
    rightLeg.rotation.x = spring(rightLeg.rotation.x, airborne ? .27 : -step);
    leftArm.rotation.x = spring(leftArm.rotation.x, airborne ? -.75 : -step * .72);
    rightArm.rotation.x = spring(rightArm.rotation.x, airborne ? -.5 : step * .35 - .20);
    firstRig.rotation.z = spring(firstRig.rotation.z, moving ? Math.sin(walkTime) * .018 : 0);
    firstRig.position.y = spring(firstRig.position.y, airborne ? -.45 : -.52);
  }
  function setFirstPerson(enabled) {
    player.visible = !enabled;
    firstRig.visible = enabled;
  }
  return {player, equip, animate, setFirstPerson, limbs:{leftArm,rightArm,leftLeg,rightLeg}, hands:{thirdHand,firstHand}, firstRig};
}
