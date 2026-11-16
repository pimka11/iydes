import * as THREE from 'three';
import { ProceduralTextures } from './textures';
import {
  BRIDGE_HALF_LENGTH,
  BRIDGE_HALF_WIDTH,
  BRIDGE_Z,
  bridgeSurfaceAt,
  CABIN_HALF_D,
  CABIN_HALF_W,
  riverCenterX,
} from './terrain';
import { MobKind, PeacefulMobKind, ResourceId, WeaponId } from './types';

export interface PlayerRig {
  root: THREE.Group;
  bodyTilt: THREE.Group;
  head: THREE.Group;
  torso: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponSocket: THREE.Group;
  armorGroup: THREE.Group;
  contactShadow: THREE.Mesh;
  weapons: Record<WeaponId, THREE.Group>;
}

export function buildWeaponModel(id: WeaponId): THREE.Group {
  const g = new THREE.Group();

  if (id === 'sword') {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      metalness: 0.92,
      roughness: 0.18,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      metalness: 0.7,
      roughness: 0.25,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.88,
      roughness: 0.25,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x3f2718,
      roughness: 0.85,
      metalness: 0.05,
    });

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.34, 8), gripMat);
    grip.position.y = 0.06;
    const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), goldMat);
    pommel.position.y = -0.12;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.11), goldMat);
    guard.position.y = 0.24;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.15, 0.04), steelMat);
    blade.position.y = 0.84;
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.055), edgeMat);
    fuller.position.y = 0.82;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 4), steelMat);
    tip.rotation.y = Math.PI * 0.25;
    tip.position.y = 1.52;

    g.add(grip, pommel, guard, blade, fuller, tip);
    g.rotation.x = Math.PI * 0.42;
  } else if (id === 'hammer') {
    const oakMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.82, metalness: 0.05 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.88, roughness: 0.26 });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 1.1,
      roughness: 0.3,
    });

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.38, 10), oakMat);
    shaft.position.y = 0.56;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.14, 10), ironMat);
    collar.position.y = 1.05;
    const headCore = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.62), ironMat);
    headCore.position.y = 1.24;
    const faceA = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.1), ironMat);
    faceA.position.set(0, 1.24, 0.32);
    const faceB = faceA.clone();
    faceB.position.z = -0.32;
    const runeBand = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.44), runeMat);
    runeBand.position.y = 1.24;

    g.add(shaft, collar, headCore, faceA, faceB, runeBand);
    g.rotation.x = Math.PI * 0.4;
  } else if (id === 'blaster') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.32 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.22 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.8,
      roughness: 0.15,
    });

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.14), bodyMat);
    grip.position.set(0, 0.04, 0);
    grip.rotation.x = -0.18;
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.68), bodyMat);
    receiver.position.set(0, 0.22, 0.22);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.46, 10), trimMat);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.23, 0.68);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.34), glowMat);
    core.position.set(0, 0.24, 0.24);
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 16), glowMat);
    muzzle.position.set(0, 0.23, 0.91);

    g.add(grip, receiver, barrel, core, muzzle);
  } else {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.72, metalness: 0.05 });
    const stringMat = new THREE.MeshStandardMaterial({
      color: 0xd9f99d,
      emissive: 0x65a30d,
      emissiveIntensity: 0.7,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xa3e635,
      emissive: 0x4d7c0f,
      emissiveIntensity: 1.1,
      metalness: 0.6,
      roughness: 0.2,
    });

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.62, -0.18),
      new THREE.Vector3(0, -0.26, 0.12),
      new THREE.Vector3(0, 0.26, 0.12),
      new THREE.Vector3(0, 0.62, -0.18),
    ]);
    const bowArc = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.036, 8, false), woodMat);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.24, 8), woodMat);
    grip.position.set(0, 0, 0.13);
    const stringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1.24, 6), stringMat);
    stringMesh.position.set(0, 0, -0.17);
    const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 6), woodMat);
    arrowShaft.rotation.x = Math.PI * 0.5;
    arrowShaft.position.set(0, 0.03, 0.22);
    const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 4), tipMat);
    arrowTip.rotation.x = Math.PI * 0.5;
    arrowTip.position.set(0, 0.03, 0.72);

    g.add(bowArc, grip, stringMesh, arrowShaft, arrowTip);
  }

  g.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
    }
  });
  return g;
}

export function buildRobloxPlayer(textures: ProceduralTextures): PlayerRig {
  const root = new THREE.Group();
  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c197, roughness: 0.62, metalness: 0.02 });
  const hoodieMat = new THREE.MeshStandardMaterial({
    map: textures.hoodieFabric,
    roughness: 0.82,
    metalness: 0.04,
  });
  const hoodTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e2026, roughness: 0.88, metalness: 0.05 });
  const denimMat = new THREE.MeshStandardMaterial({
    map: textures.denimFabric,
    roughness: 0.78,
    metalness: 0.04,
  });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x6b3e21, roughness: 0.78, metalness: 0.08 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.28, metalness: 0.85 });
  const cordMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.55, metalness: 0.1 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6, metalness: 0.05 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x8f3f1d, roughness: 0.65, metalness: 0.06 });
  const hairDarkMat = new THREE.MeshStandardMaterial({ color: 0x6b2c12, roughness: 0.7, metalness: 0.05 });

  // Torso (articulated Roblox proportions with hoodie fold, pocket, belt & explorer backpack)
  const torso = new THREE.Group();
  torso.position.set(0, 1.48, 0);
  bodyTilt.add(torso);

  const torsoBox = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.02, 0.5), hoodieMat);
  const hoodCollar = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.58), hoodTrimMat);
  hoodCollar.position.set(0, 0.45, -0.06);
  const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.22), hoodTrimMat);
  hoodBack.position.set(0, 0.32, -0.3);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.06), hoodTrimMat);
  pocket.position.set(0, -0.26, 0.25);
  const hem = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.12, 0.52), hoodTrimMat);
  hem.position.set(0, -0.46, 0);

  // Hood drawstrings
  const stringL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 6), cordMat);
  stringL.position.set(-0.14, 0.26, 0.27);
  const stringR = stringL.clone();
  stringR.position.x = 0.14;

  // Leather belt & brass buckle
  const belt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.54), leatherMat);
  belt.position.set(0, -0.42, 0);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.06), brassMat);
  buckle.position.set(0, -0.42, 0.27);

  // Explorer backpack satchel
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.28), leatherMat);
  pack.position.set(0, -0.02, -0.36);
  const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.3), brassMat);
  packFlap.position.set(0, 0.24, -0.36);
  packFlap.scale.set(1, 1, 1.02);
  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.74, 10), denimMat);
  bedroll.rotation.z = Math.PI * 0.5;
  bedroll.position.set(0, -0.38, -0.42);

  torso.add(
    torsoBox,
    hoodCollar,
    hoodBack,
    pocket,
    hem,
    stringL,
    stringR,
    belt,
    buckle,
    pack,
    packFlap,
    bedroll,
  );

  // Craftable Ranger Armor overlay (visible once crafted)
  const armorGroup = new THREE.Group();
  armorGroup.visible = false;
  const armorPlateMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.78, roughness: 0.28 });
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.54, 0.56), armorPlateMat);
  chestPlate.position.set(0, 0.16, 0);
  const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.09, 0.58), brassMat);
  chestTrim.position.set(0, 0.36, 0);
  const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.56), armorPlateMat);
  pauldronL.position.set(-0.68, 0.44, 0);
  pauldronL.rotation.z = 0.22;
  const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.56), armorPlateMat);
  pauldronR.position.set(0.68, 0.44, 0);
  pauldronR.rotation.z = -0.22;
  armorGroup.add(chestPlate, chestTrim, pauldronL, pauldronR);
  torso.add(armorGroup);

  // Head + layered spiky hair
  const head = new THREE.Group();
  head.position.set(0, 2.34, 0);
  bodyTilt.add(head);

  const faceMat = new THREE.MeshStandardMaterial({
    map: textures.robloxFace,
    roughness: 0.55,
    metalness: 0.02,
  });
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.72, 0.72), [
    skinMat,
    skinMat,
    skinMat,
    skinMat,
    faceMat,
    skinMat,
  ]);
  head.add(headMesh);

  // Subtle side ears
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.12), skinMat);
  earL.position.set(-0.39, -0.02, 0.02);
  const earR = earL.clone();
  earR.position.x = 0.39;
  head.add(earL, earR);

  // Layered spiky hair crown + sideburns + bangs
  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.78), hairMat);
  hairCap.position.set(0, 0.34, -0.02);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.52, 0.2), hairDarkMat);
  hairBack.position.set(0, 0.12, -0.34);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.36), hairDarkMat);
  sideL.position.set(-0.38, 0.16, -0.1);
  const sideR = sideL.clone();
  sideR.position.x = 0.38;
  head.add(hairCap, hairBack, sideL, sideR);

  const spikeConfigs: [number, number, number, number, number, number, number][] = [
    [-0.24, 0.42, 0.28, 0.22, 0.28, 0.24, 0.32],
    [0.0, 0.46, 0.3, 0.24, 0.34, 0.26, -0.08],
    [0.24, 0.42, 0.27, 0.22, 0.28, 0.24, -0.34],
    [-0.36, 0.3, 0.05, 0.18, 0.32, 0.32, 0.55],
    [0.36, 0.3, 0.05, 0.18, 0.32, 0.32, -0.55],
    [-0.18, 0.48, -0.14, 0.24, 0.32, 0.28, 0.22],
    [0.18, 0.48, -0.14, 0.24, 0.32, 0.28, -0.22],
  ];
  spikeConfigs.forEach(([x, y, z, sx, sy, sz, rz], idx) => {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(sx * 0.65, sy, 5),
      idx % 2 === 0 ? hairMat : hairDarkMat,
    );
    spike.position.set(x, y, z);
    spike.scale.set(1, 1, sz / sx);
    spike.rotation.z = rz;
    spike.rotation.x = z > 0 ? 0.35 : -0.2;
    head.add(spike);
  });

  // Left Arm (with ribbed cuff)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.68, 1.88, 0);
  bodyTilt.add(leftArm);
  const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.66, 0.38), hoodieMat);
  lSleeve.position.set(0, -0.25, 0);
  const lCuff = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.09, 0.39), hoodTrimMat);
  lCuff.position.set(0, -0.59, 0);
  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.25, 0.33), skinMat);
  lHand.position.set(0, -0.75, 0);
  leftArm.add(lSleeve, lCuff, lHand);

  // Right Arm + Weapon Socket
  const rightArm = new THREE.Group();
  rightArm.position.set(0.68, 1.88, 0);
  bodyTilt.add(rightArm);
  const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.66, 0.38), hoodieMat);
  rSleeve.position.set(0, -0.25, 0);
  const rCuff = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.09, 0.39), hoodTrimMat);
  rCuff.position.set(0, -0.59, 0);
  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.25, 0.33), skinMat);
  rHand.position.set(0, -0.75, 0);
  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(0, -0.78, 0.14);
  rightArm.add(rSleeve, rCuff, rHand, weaponSocket);

  const weapons: Record<WeaponId, THREE.Group> = {
    sword: buildWeaponModel('sword'),
    hammer: buildWeaponModel('hammer'),
    blaster: buildWeaponModel('blaster'),
    bow: buildWeaponModel('bow'),
  };
  (Object.keys(weapons) as WeaponId[]).forEach((id) => {
    weapons[id].visible = id === 'sword';
    weaponSocket.add(weapons[id]);
  });

  // Legs (denim pants + cuff + sneakers)
  const makeLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.96, 0);
    const pant = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.44), denimMat);
    pant.position.set(0, -0.34, 0);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.46), cordMat);
    cuff.position.set(0, -0.69, 0);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.52), shoeMat);
    shoe.position.set(0, -0.8, 0.04);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.07, 0.54), soleMat);
    sole.position.set(0, -0.925, 0.04);
    leg.add(pant, cuff, shoe, sole);
    return leg;
  };
  const leftLeg = makeLeg(-0.25);
  const rightLeg = makeLeg(0.25);
  bodyTilt.add(leftLeg, rightLeg);

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.75, 1.75),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.03;
  root.add(contactShadow);

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== contactShadow) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return {
    root,
    bodyTilt,
    head,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponSocket,
    armorGroup,
    contactShadow,
    weapons,
  };
}

export interface MobVisual {
  root: THREE.Group;
  body: THREE.Group;
  leftArm?: THREE.Group;
  rightArm?: THREE.Group;
  leftLeg?: THREE.Group;
  rightLeg?: THREE.Group;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  hitFlashMeshes: THREE.Mesh[];
}

export function buildMobModel(kind: MobKind, textures: ProceduralTextures): MobVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hitFlashMeshes: THREE.Mesh[] = [];

  let leftArm: THREE.Group | undefined;
  let rightArm: THREE.Group | undefined;
  let leftLeg: THREE.Group | undefined;
  let rightLeg: THREE.Group | undefined;

  if (kind === 'slime') {
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      roughness: 0.14,
      metalness: 0.05,
      transparent: true,
      opacity: 0.78,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      emissive: 0x047857,
      emissiveIntensity: 0.35,
      roughness: 0.4,
    });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.65 });

    const gelCube = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.96, 1.18), outerMat);
    gelCube.position.y = 0.48;
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), coreMat);
    core.position.y = 0.46;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.08), eyeMat);
    eyeL.position.set(-0.24, 0.56, 0.59);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.24;
    const glintL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), glintMat);
    glintL.position.set(-0.27, 0.62, 0.635);
    const glintR = glintL.clone();
    glintR.position.x = 0.21;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.3, 6), leafMat);
    stem.position.y = 1.06;
    const leafL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.16), leafMat);
    leafL.position.set(0.14, 1.18, 0);
    leafL.rotation.z = -0.3;
    const leafR = leafL.clone();
    leafR.position.set(-0.14, 1.15, 0);
    leafR.rotation.z = 0.32;

    body.add(gelCube, core, eyeL, eyeR, glintL, glintR, stem, leafL, leafR);
    hitFlashMeshes.push(gelCube, core);
  } else if (kind === 'goblin') {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x5c8f3d, roughness: 0.72, metalness: 0.04 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 0.85, metalness: 0.05 });
    const loinMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.9 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.75 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.goblinFace, roughness: 0.65 });
    const clubMat = new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.84 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.8, 0.44), vestMat);
    torso.position.y = 1.12;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.11, 0.48), loinMat);
    belt.position.y = 0.78;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.06), brassMat);
    buckle.position.set(0, 0.78, 0.25);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.58, 0.58), [
      skinMat,
      skinMat,
      skinMat,
      skinMat,
      faceMat,
      skinMat,
    ]);
    head.position.y = 1.82;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), skinMat);
    nose.position.set(0, 1.78, 0.32);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 4), skinMat);
    earL.rotation.z = Math.PI * 0.42;
    earL.position.set(-0.42, 1.84, 0);
    const earR = earL.clone();
    earR.rotation.z = -Math.PI * 0.42;
    earR.position.x = 0.42;

    leftArm = new THREE.Group();
    leftArm.position.set(-0.54, 1.4, 0);
    const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.36), vestMat);
    lShoulder.position.y = -0.02;
    const lArmM = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.64, 0.26), skinMat);
    lArmM.position.y = -0.32;
    leftArm.add(lShoulder, lArmM);

    rightArm = new THREE.Group();
    rightArm.position.set(0.54, 1.4, 0);
    const rArmM = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.64, 0.26), skinMat);
    rArmM.position.y = -0.32;
    const club = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.05, 0.78, 7), clubMat);
    club.rotation.x = Math.PI * 0.42;
    club.position.set(0, -0.58, 0.28);
    const clubBand = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.11, 0.1, 7), brassMat);
    clubBand.rotation.x = Math.PI * 0.42;
    clubBand.position.set(0, -0.45, 0.46);
    rightArm.add(rArmM, club, clubBand);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.2, 0.72, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.56, 0.32), loinMat);
    lLegM.position.y = -0.28;
    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.18, 0.38), vestMat);
    lBoot.position.set(0, -0.63, 0.03);
    leftLeg.add(lLegM, lBoot);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.2, 0.72, 0);
    const rLegM = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.56, 0.32), loinMat);
    rLegM.position.y = -0.28;
    const rBoot = lBoot.clone();
    rightLeg.add(rLegM, rBoot);

    body.add(torso, belt, buckle, head, nose, earL, earR, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, head, lArmM, rArmM);
  } else if (kind === 'golem') {
    const stoneMat = new THREE.MeshStandardMaterial({
      map: textures.stoneBlock,
      color: 0x9ca3af,
      roughness: 0.92,
      metalness: 0.08,
    });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.88 });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xea580c,
      emissiveIntensity: 1.5,
      roughness: 0.25,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.35, 0.92), stoneMat);
    torso.position.y = 1.72;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), runeMat);
    core.position.set(0, 1.75, 0.45);
    const mossCap = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.18, 0.94), mossMat);
    mossCap.position.y = 2.38;
    const waist = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 0.72), stoneMat);
    waist.position.y = 1.05;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.68, 0.72), stoneMat);
    head.position.y = 2.75;
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.76), mossMat);
    brow.position.y = 3.04;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.06), runeMat);
    eyeL.position.set(-0.18, 2.78, 0.37);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;

    leftArm = new THREE.Group();
    leftArm.position.set(-0.98, 2.15, 0);
    const lPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.58), mossMat);
    const lFist = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.12, 0.48), stoneMat);
    lFist.position.y = -0.68;
    const lRune = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.1, 0.5), runeMat);
    lRune.position.y = -0.92;
    leftArm.add(lPauldron, lFist, lRune);

    rightArm = new THREE.Group();
    rightArm.position.set(0.98, 2.15, 0);
    const rPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.58), mossMat);
    const rFist = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.12, 0.48), stoneMat);
    rFist.position.y = -0.68;
    const rRune = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.1, 0.5), runeMat);
    rRune.position.y = -0.92;
    rightArm.add(rPauldron, rFist, rRune);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.42, 1.05, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.05, 0.6), stoneMat);
    lLegM.position.y = -0.525;
    leftLeg.add(lLegM);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.42, 1.05, 0);
    const rLegM = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.05, 0.6), stoneMat);
    rLegM.position.y = -0.525;
    rightLeg.add(rLegM);

    body.add(torso, core, mossCap, waist, head, brow, eyeL, eyeR, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, head, lFist, rFist);
  } else {
    // Boss: Тіньовий Лицар
    const darkArmor = new THREE.MeshStandardMaterial({
      color: 0x1e1b2e,
      metalness: 0.78,
      roughness: 0.28,
    });
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x4c0519,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.32, 0.68), darkArmor);
    torso.position.y = 1.84;
    const chestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), crimsonMat);
    chestGem.position.set(0, 1.95, 0.36);
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 1.72), capeMat);
    cape.position.set(0, 1.56, -0.4);
    cape.rotation.x = 0.14;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.78, 0.76), darkArmor);
    head.position.y = 2.92;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.8), crimsonMat);
    crest.position.set(0, 3.36, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.08), crimsonMat);
    visor.position.set(0, 2.92, 0.39);
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.56, 5), darkArmor);
    hornL.position.set(-0.38, 3.35, 0);
    hornL.rotation.z = 0.4;
    const hornR = hornL.clone();
    hornR.position.x = 0.38;
    hornR.rotation.z = -0.4;

    leftArm = new THREE.Group();
    leftArm.position.set(-0.82, 2.34, 0);
    const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.58), darkArmor);
    const lSpike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 4), crimsonMat);
    lSpike.position.set(-0.14, 0.28, 0);
    lSpike.rotation.z = 0.35;
    const lArmM = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.94, 0.38), darkArmor);
    lArmM.position.y = -0.52;
    leftArm.add(lShoulder, lSpike, lArmM);

    rightArm = new THREE.Group();
    rightArm.position.set(0.82, 2.34, 0);
    const rShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.58), darkArmor);
    const rSpike = lSpike.clone();
    rSpike.position.set(0.14, 0.28, 0);
    rSpike.rotation.z = -0.35;
    const rArmM = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.94, 0.38), darkArmor);
    rArmM.position.y = -0.52;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.72, 0.06), crimsonMat);
    blade.rotation.x = Math.PI * 0.42;
    blade.position.set(0, -0.92, 0.68);
    rightArm.add(rShoulder, rSpike, rArmM, blade);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.32, 1.18, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.18, 0.48), darkArmor);
    lLegM.position.y = -0.59;
    leftLeg.add(lLegM);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.32, 1.18, 0);
    const rLegM = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.18, 0.48), darkArmor);
    rLegM.position.y = -0.59;
    rightLeg.add(rLegM);

    body.add(
      torso,
      chestGem,
      cape,
      head,
      crest,
      visor,
      hornL,
      hornR,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
    );
    hitFlashMeshes.push(torso, head, lArmM, rArmM);
  }

  const shadowScale = kind === 'golem' || kind === 'boss' ? 2.4 : 1.5;
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowScale, shadowScale),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.48,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  const barY = kind === 'slime' ? 1.48 : kind === 'goblin' ? 2.45 : 3.65;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }),
  );
  hpBarBg.position.set(0, barY, 0);
  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.22, 0.1),
    new THREE.MeshBasicMaterial({
      color: kind === 'boss' ? 0xf43f5e : 0x22c55e,
      side: THREE.DoubleSide,
    }),
  );
  hpBarFill.position.set(0, 0, 0.01);
  hpBarBg.add(hpBarFill);
  hpBarBg.visible = kind === 'boss';
  root.add(hpBarBg);

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== shadow && obj !== hpBarBg && obj !== hpBarFill) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return { root, body, leftArm, rightArm, leftLeg, rightLeg, hpBarBg, hpBarFill, hitFlashMeshes };
}

export interface PeacefulMobVisual {
  root: THREE.Group;
  body: THREE.Group;
  head?: THREE.Group;
  leftArm?: THREE.Group;
  rightArm?: THREE.Group;
  leftLeg?: THREE.Group;
  rightLeg?: THREE.Group;
  legFL?: THREE.Group;
  legFR?: THREE.Group;
  legBL?: THREE.Group;
  legBR?: THREE.Group;
}

export function buildPeacefulMobModel(kind: PeacefulMobKind, textures: ProceduralTextures): PeacefulMobVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  let head: THREE.Group | undefined;
  let leftArm: THREE.Group | undefined;
  let rightArm: THREE.Group | undefined;
  let leftLeg: THREE.Group | undefined;
  let rightLeg: THREE.Group | undefined;
  let legFL: THREE.Group | undefined;
  let legFR: THREE.Group | undefined;
  let legBL: THREE.Group | undefined;
  let legBR: THREE.Group | undefined;

  if (kind === 'deer') {
    const coatMat = new THREE.MeshStandardMaterial({ map: textures.deerCoat, roughness: 0.78 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf5e8d3, roughness: 0.82 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.7 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xe7d6b9, roughness: 0.6 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.4 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.62, 1.28), coatMat);
    torso.position.y = 1.05;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 1.12), bellyMat);
    belly.position.set(0, 0.74, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), bellyMat);
    tail.position.set(0, 1.14, -0.7);
    tail.rotation.x = 0.35;

    head = new THREE.Group();
    head.position.set(0, 1.32, 0.56);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.56, 0.28), coatMat);
    neck.position.set(0, 0.22, 0.08);
    neck.rotation.x = 0.24;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.48), coatMat);
    skull.position.set(0, 0.52, 0.26);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.2), bellyMat);
    snout.position.set(0, 0.46, 0.52);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.06), noseMat);
    nose.position.set(0, 0.5, 0.63);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.07), noseMat);
    eyeL.position.set(-0.16, 0.56, 0.34);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.16;
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.07), coatMat);
    earL.position.set(-0.2, 0.66, 0.12);
    earL.rotation.z = 0.55;
    const earR = earL.clone();
    earR.position.x = 0.2;
    earR.rotation.z = -0.55;

    // Antlers
    for (const side of [-1, 1]) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.48, 6), antlerMat);
      stem.position.set(side * 0.11, 0.84, 0.18);
      stem.rotation.z = -side * 0.28;
      stem.rotation.x = -0.15;
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.28, 5), antlerMat);
      fork.position.set(side * 0.2, 0.92, 0.26);
      fork.rotation.z = -side * 0.65;
      fork.rotation.x = 0.35;
      head.add(stem, fork);
    }
    head.add(neck, skull, snout, nose, eyeL, eyeR, earL, earR);

    const makeLeg = (lx: number, lz: number) => {
      const lg = new THREE.Group();
      lg.position.set(lx, 0.82, lz);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.16), coatMat);
      upper.position.y = -0.33;
      const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.18), hoofMat);
      hoof.position.y = -0.74;
      lg.add(upper, hoof);
      return lg;
    };
    legFL = makeLeg(-0.2, 0.44);
    legFR = makeLeg(0.2, 0.44);
    legBL = makeLeg(-0.2, -0.44);
    legBR = makeLeg(0.2, -0.44);

    body.add(torso, belly, tail, head, legFL, legFR, legBL, legBR);
  } else if (kind === 'sheep') {
    const woolMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.95 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x3f3a36, roughness: 0.78 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });

    const fleece = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.68, 1.06), woolMat);
    fleece.position.y = 0.84;
    const puffTop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.88), woolMat);
    puffTop.position.y = 1.22;
    const puffSideL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.86), woolMat);
    puffSideL.position.set(-0.46, 0.86, 0);
    const puffSideR = puffSideL.clone();
    puffSideR.position.x = 0.46;

    head = new THREE.Group();
    head.position.set(0, 0.96, 0.56);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.44), skinMat);
    skull.position.set(0, 0, 0.16);
    const woolCap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.32), woolMat);
    woolCap.position.set(0, 0.2, 0.1);
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.08), skinMat);
    earL.position.set(-0.26, 0.05, 0.14);
    earL.rotation.z = 0.25;
    const earR = earL.clone();
    earR.position.x = 0.26;
    earR.rotation.z = -0.25;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), eyeMat);
    eyeL.position.set(-0.12, 0.04, 0.39);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.12;
    head.add(skull, woolCap, earL, earR, eyeL, eyeR);

    const makeLeg = (lx: number, lz: number) => {
      const lg = new THREE.Group();
      lg.position.set(lx, 0.56, lz);
      const legM = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.18), skinMat);
      legM.position.y = -0.28;
      lg.add(legM);
      return lg;
    };
    legFL = makeLeg(-0.22, 0.34);
    legFR = makeLeg(0.22, 0.34);
    legBL = makeLeg(-0.22, -0.34);
    legBR = makeLeg(0.22, -0.34);

    body.add(fleece, puffTop, puffSideL, puffSideR, head, legFL, legFR, legBL, legBR);
  } else {
    // Villager: Лісник Орест (emerald ranger cloak + staff)
    const cloakMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.82 });
    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.villagerFace, roughness: 0.58 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 });
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.78 });
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x16a34a,
      emissiveIntensity: 1.2,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.96, 0.48), tunicMat);
    torso.position.y = 1.42;
    const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.14), cloakMat);
    cloak.position.set(0, 1.38, -0.26);
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.2, 0.54), cloakMat);
    scarf.position.set(0, 1.88, 0);

    head = new THREE.Group();
    head.position.set(0, 2.25, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.68), [
      skinMat,
      skinMat,
      skinMat,
      skinMat,
      faceMat,
      skinMat,
    ]);
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.07, 10), hatMat);
    hatBrim.position.y = 0.34;
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.48, 8), hatMat);
    hatCone.position.y = 0.58;
    head.add(headMesh, hatBrim, hatCone);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.58, 1.82, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.66, 0.3), cloakMat);
    lArm.position.y = -0.28;
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.26), skinMat);
    lHand.position.y = -0.66;
    leftArm.add(lArm, lHand);

    rightArm = new THREE.Group();
    rightArm.position.set(0.58, 1.82, 0);
    const rArm = lArm.clone();
    const rHand = lHand.clone();
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 2.1, 7), staffMat);
    staff.position.set(0, -0.35, 0.22);
    const staffGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), gemMat);
    staffGem.position.set(0, 0.72, 0.22);
    rightArm.add(rArm, rHand, staff, staffGem);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.22, 0.94, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.94, 0.38), trouserMat);
    lLegM.position.y = -0.47;
    leftLeg.add(lLegM);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.22, 0.94, 0);
    const rLegM = lLegM.clone();
    rightLeg.add(rLegM);

    body.add(torso, cloak, scarf, head, leftArm, rightArm, leftLeg, rightLeg);
  }

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.42,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== shadow) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg, legFL, legFR, legBL, legBR };
}

export function buildResourceNodeModel(kind: Exclude<ResourceId, 'hide'>): THREE.Group {
  const g = new THREE.Group();

  if (kind === 'wood') {
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d22, roughness: 0.88 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.72 });
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.25, 8), barkMat);
    log1.rotation.z = Math.PI * 0.5;
    log1.position.set(0, 0.24, -0.2);
    const log2 = log1.clone();
    log2.position.set(0.05, 0.24, 0.26);
    const log3 = log1.clone();
    log3.position.set(0, 0.58, 0.03);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.28, 8), ringMat);
    cap.rotation.z = Math.PI * 0.5;
    cap.position.copy(log3.position);
    g.add(log1, log2, log3, cap);
  } else if (kind === 'stone') {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9, metalness: 0.06 });
    const rockA = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), stoneMat);
    rockA.position.set(0, 0.4, 0);
    rockA.scale.set(1.2, 0.85, 1.0);
    const rockB = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), stoneMat);
    rockB.position.set(0.45, 0.25, 0.25);
    g.add(rockA, rockB);
  } else if (kind === 'iron') {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 });
    const oreMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.55,
      metalness: 0.82,
      roughness: 0.22,
    });
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), rockMat);
    base.position.y = 0.42;
    base.scale.set(1.15, 0.9, 1.05);
    g.add(base);
    for (let i = 0; i < 4; i++) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), oreMat);
      const a = (i / 4) * Math.PI * 2 + 0.4;
      crystal.position.set(Math.cos(a) * 0.34, 0.58 + (i % 2) * 0.14, Math.sin(a) * 0.34);
      crystal.rotation.set(0.4, a, 0.3);
      g.add(crystal);
    }
  } else if (kind === 'herb') {
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });
    const bloomMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xca8a04,
      emissiveIntensity: 0.45,
      roughness: 0.35,
    });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.05), stemMat);
      blade.position.set(Math.cos(a) * 0.2, 0.25, Math.sin(a) * 0.2);
      blade.rotation.y = -a;
      blade.rotation.x = 0.35;
      g.add(blade);
    }
    const blossom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), bloomMat);
    blossom.position.y = 0.56;
    g.add(blossom);
  } else {
    // essence crystal
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xd8b4fe,
      emissive: 0x9333ea,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.35,
    });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 0.26, 6), baseMat);
    plinth.position.y = 0.13;
    const shardMain = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.92, 5), crystalMat);
    shardMain.position.y = 0.65;
    const shardL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.58, 5), crystalMat);
    shardL.position.set(-0.24, 0.46, 0.1);
    shardL.rotation.z = 0.35;
    const shardR = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.52, 5), crystalMat);
    shardR.position.set(0.22, 0.42, -0.08);
    shardR.rotation.z = -0.32;
    g.add(plinth, shardMain, shardL, shardR);
  }

  g.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return g;
}

export interface CabinVisual {
  group: THREE.Group;
  roofGroup: THREE.Group;
  hearthLight: THREE.PointLight;
}

// Enterable cabin with open doorway, interior floor, furniture, workbench, hearth, and cutaway roof
export function buildCabin(textures: ProceduralTextures): CabinVisual {
  const cabin = new THREE.Group();
  const roofGroup = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneBlock, roughness: 0.9, metalness: 0.05 });
  const logMat = new THREE.MeshStandardMaterial({ map: textures.cabinLog, roughness: 0.85, metalness: 0.04 });
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.78, metalness: 0.05 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.82 });
  const roofMat = new THREE.MeshStandardMaterial({ map: textures.roofShingle, roughness: 0.72, metalness: 0.1 });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.92 });
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.85 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
  const glowWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.1,
    roughness: 0.25,
    transparent: true,
    opacity: 0.85,
  });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xfb923c,
    emissive: 0xea580c,
    emissiveIntensity: 2.0,
    roughness: 0.3,
  });

  // 1. Stone Foundation & Plank Floor (top sits cleanly at y = 0.82)
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(CABIN_HALF_W * 2 + 0.5, 0.72, CABIN_HALF_D * 2 + 0.5),
    stoneMat,
  );
  foundation.position.y = 0.36;
  const floorDeck = new THREE.Mesh(
    new THREE.BoxGeometry(CABIN_HALF_W * 2 + 0.2, 0.12, CABIN_HALF_D * 2 + 0.2),
    woodMat,
  );
  floorDeck.position.y = 0.76;

  // Front Porch Deck + 2 Smooth Steps leading down to terrain
  const porchDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.24, 1.7), woodMat);
  porchDeck.position.set(0, 0.7, CABIN_HALF_D + 0.85);
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 0.65), woodMat);
  step1.position.set(0, 0.48, CABIN_HALF_D + 1.85);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 0.65), woodMat);
  step2.position.set(0, 0.24, CABIN_HALF_D + 2.45);
  cabin.add(foundation, floorDeck, porchDeck, step1, step2);

  // 2. Hollow Walls (open 2.5m-wide doorway on +Z front wall)
  const wallH = 3.5;
  const wallY = 0.82 + wallH * 0.5;
  const wallT = 0.36;

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, CABIN_HALF_D * 2 + 0.2), logMat);
  leftWall.position.set(-CABIN_HALF_W, wallY, 0);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, CABIN_HALF_D * 2 + 0.2), logMat);
  rightWall.position.set(CABIN_HALF_W, wallY, 0);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(CABIN_HALF_W * 2 + 0.2, wallH, wallT), logMat);
  backWall.position.set(0, wallY, -CABIN_HALF_D);

  // Split front wall left & right of open doorway (|lx| < 1.25) + door lintel above
  const sideSpan = CABIN_HALF_W - 1.25; // 2.65
  const frontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(sideSpan, wallH, wallT), logMat);
  frontLeftWall.position.set(-1.25 - sideSpan * 0.5, wallY, CABIN_HALF_D);
  const frontRightWall = new THREE.Mesh(new THREE.BoxGeometry(sideSpan, wallH, wallT), logMat);
  frontRightWall.position.set(1.25 + sideSpan * 0.5, wallY, CABIN_HALF_D);
  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.85, wallT), logMat);
  doorHeader.position.set(0, 0.82 + 2.65 + 0.425, CABIN_HALF_D);

  // Timber door frame + warm porch lantern
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.68, 0.46), darkWoodMat);
  frameL.position.set(-1.25, 0.82 + 1.34, CABIN_HALF_D);
  const frameR = frameL.clone();
  frameR.position.x = 1.25;
  const openDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.55, 0.1), darkWoodMat);
  openDoorLeaf.position.set(-1.18, 0.82 + 1.28, CABIN_HALF_D + 0.52);
  openDoorLeaf.rotation.y = Math.PI * 0.46;

  // Front windows
  const winL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.42), glowWinMat);
  winL.position.set(-2.55, 2.55, CABIN_HALF_D);
  const winR = winL.clone();
  winR.position.x = 2.55;
  const winSide = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.0, 1.25), glowWinMat);
  winSide.position.set(CABIN_HALF_W, 2.55, 0.4);

  const porchLantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.24), glowWinMat);
  porchLantern.position.set(1.55, 3.05, CABIN_HALF_D + 0.38);

  cabin.add(
    leftWall,
    rightWall,
    backWall,
    frontLeftWall,
    frontRightWall,
    doorHeader,
    frameL,
    frameR,
    openDoorLeaf,
    winL,
    winR,
    winSide,
    porchLantern,
  );

  // 3. Cozy Walkable Interior Furnishings (at y = 0.82)
  const rug = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 2.6), rugMat);
  rug.position.set(0, 0.84, 0.35);

  // Stone Fireplace against back wall
  const hearthBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.95, 0.85), stoneMat);
  hearthBase.position.set(0, 1.8, -CABIN_HALF_D + 0.48);
  const emberBed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.45), emberMat);
  emberBed.position.set(0, 1.02, -CABIN_HALF_D + 0.65);
  const hearthLight = new THREE.PointLight(0xffa94d, 4.5, 11, 1.6);
  hearthLight.position.set(0, 2.1, -CABIN_HALF_D + 1.25);

  // Crafting Workbench on left wall (matches collider [-3.5, -1.9, -1.6, 0.3])
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 1.7), woodMat);
  benchTop.position.set(-2.7, 1.68, -0.65);
  const benchBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.82, 1.5), darkWoodMat);
  benchBase.position.set(-2.7, 1.23, -0.65);
  const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.52), ironMat);
  anvil.position.set(-2.65, 1.87, -0.25);
  const benchLantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), glowWinMat);
  benchLantern.position.set(-2.85, 1.89, -1.2);

  // Bed on back-right (matches collider [1.5, 3.6, -2.9, -1.4])
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 1.2), darkWoodMat);
  bedFrame.position.set(2.55, 1.03, -2.15);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.22, 1.08), bedMat);
  mattress.position.set(2.55, 1.32, -2.15);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.82), pillowMat);
  pillow.position.set(3.15, 1.46, -2.15);

  // Small table + stool near front-right interior
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 10), woodMat);
  tableTop.position.set(2.45, 1.58, 1.1);
  const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.74, 8), darkWoodMat);
  tableLeg.position.set(2.45, 1.19, 1.1);

  cabin.add(
    rug,
    hearthBase,
    emberBed,
    hearthLight,
    benchTop,
    benchBase,
    anvil,
    benchLantern,
    bedFrame,
    mattress,
    pillow,
    tableTop,
    tableLeg,
  );

  // 4. Separate Cutaway Roof Group (hidden automatically when player enters cabin)
  const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.24, 4.7), roofMat);
  roofSlopeL.position.set(0, 5.2, -1.65);
  roofSlopeL.rotation.x = 0.62;
  const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.24, 4.7), roofMat);
  roofSlopeR.position.set(0, 5.2, 1.65);
  roofSlopeR.rotation.x = -0.62;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.28, 0.38), roofMat);
  ridge.position.set(0, 6.45, 0);

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-3.25, 0);
  gableShape.lineTo(3.25, 0);
  gableShape.lineTo(0, 2.25);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 7.82, bevelEnabled: false });
  gableGeo.rotateY(Math.PI * 0.5);
  gableGeo.translate(-3.91, 4.32, 0);
  const gableMesh = new THREE.Mesh(gableGeo, logMat);

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.05, 3.2, 1.05), stoneMat);
  chimney.position.set(0, 5.95, -2.55);

  roofGroup.add(roofSlopeL, roofSlopeR, ridge, gableMesh, chimney);
  cabin.add(roofGroup);

  cabin.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return { group: cabin, roofGroup, hearthLight };
}

export function buildArchedBridge(textures: ProceduralTextures): THREE.Group {
  const bridge = new THREE.Group();
  const bxCenter = riverCenterX(BRIDGE_Z);
  bridge.position.set(bxCenter, 0, BRIDGE_Z);

  const plankMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.8, metalness: 0.04 });
  const darkTimberMat = new THREE.MeshStandardMaterial({ map: textures.cabinLog, roughness: 0.86, metalness: 0.04 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneBlock, roughness: 0.9, metalness: 0.05 });

  const pierL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, BRIDGE_HALF_WIDTH * 2.25), stoneMat);
  pierL.position.set(-BRIDGE_HALF_LENGTH - 0.6, 0.05, 0);
  const pierR = pierL.clone();
  pierR.position.x = BRIDGE_HALF_LENGTH + 0.6;
  bridge.add(pierL, pierR);

  const plankSteps = 22;
  const stepWidth = (BRIDGE_HALF_LENGTH * 2) / plankSteps;
  for (let i = 0; i < plankSteps; i++) {
    const localX = -BRIDGE_HALF_LENGTH + (i + 0.5) * stepWidth;
    const worldX = bxCenter + localX;
    const h = bridgeSurfaceAt(worldX, BRIDGE_Z) ?? 1.0;
    const nextH = bridgeSurfaceAt(worldX + 0.2, BRIDGE_Z) ?? h;
    const slope = Math.atan2(nextH - h, 0.2);

    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(stepWidth * 0.92, 0.22, BRIDGE_HALF_WIDTH * 2),
      plankMat,
    );
    plank.position.set(localX, h - 0.11, 0);
    plank.rotation.z = slope;
    bridge.add(plank);

    if (i % 3 === 0 || i === plankSteps - 1) {
      for (const zSide of [-BRIDGE_HALF_WIDTH + 0.15, BRIDGE_HALF_WIDTH - 0.15]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.35, 0.22), darkTimberMat);
        post.position.set(localX, h + 0.56, zSide);
        bridge.add(post);
      }
    }
  }

  for (const zSide of [-BRIDGE_HALF_WIDTH + 0.15, BRIDGE_HALF_WIDTH - 0.15]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
      const lx = -BRIDGE_HALF_LENGTH + (i / 14) * BRIDGE_HALF_LENGTH * 2;
      const ly = (bridgeSurfaceAt(bxCenter + lx, BRIDGE_Z) ?? 1.0) + 1.12;
      pts.push(new THREE.Vector3(lx, ly, zSide));
    }
    const railCurve = new THREE.CatmullRomCurve3(pts);
    const railMesh = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 24, 0.085, 6, false), darkTimberMat);
    bridge.add(railMesh);
  }

  bridge.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return bridge;
}

export function buildStoneRuins(textures: ProceduralTextures): THREE.Group {
  const ruins = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneBlock, roughness: 0.9, metalness: 0.06 });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.4,
    roughness: 0.18,
    metalness: 0.3,
  });

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 0.8, 8), stoneMat);
  platform.position.y = 0.2;
  ruins.add(platform);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const px = Math.cos(ang) * 7.0;
    const pz = Math.sin(ang) * 7.0;
    const h = i % 2 === 0 ? 4.4 : 2.9;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, h, 1.1), stoneMat);
    pillar.position.set(px, h * 0.5 + 0.4, pz);
    pillar.rotation.y = ang;
    ruins.add(pillar);
  }

  const altar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), stoneMat);
  altar.position.y = 1.0;
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), crystalMat);
  crystal.position.y = 2.4;
  crystal.name = 'ruinCrystal';
  ruins.add(altar, crystal);

  ruins.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return ruins;
}

export function buildCampfire(): { group: THREE.Group; flame: THREE.Mesh; light: THREE.PointLight } {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.92 });
  const logMat = new THREE.MeshStandardMaterial({ color: 0x291a10, roughness: 0.9 });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xfb923c,
    emissive: 0xf97316,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stoneMat);
    stone.position.set(Math.cos(a) * 0.72, 0.14, Math.sin(a) * 0.72);
    group.add(stone);
  }
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.05, 6), logMat);
    log.rotation.z = Math.PI * 0.36;
    log.rotation.y = (i / 4) * Math.PI;
    log.position.y = 0.22;
    group.add(log);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.82, 6), flameMat);
  flame.position.y = 0.52;
  group.add(flame);

  const light = new THREE.PointLight(0xff8c2b, 5.5, 16, 1.6);
  light.position.y = 0.95;
  group.add(light);

  return { group, flame, light };
}
