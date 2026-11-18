import * as THREE from 'three';
import { ProceduralTextures } from './textures';
import {
  BRIDGE_HALF_LENGTH,
  BRIDGE_HALF_WIDTH,
  BRIDGE_Z,
  bridgeSurfaceAt,
  CABIN_HALF_D,
  CABIN_HALF_W,
  CabinStyle,
  CaveSite,
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
  shieldGroup: THREE.Group;
  shieldAegisTrim: THREE.Group;
  armorGroup: THREE.Group;
  contactShadow: THREE.Mesh;
  weapons: Record<WeaponId, THREE.Group>;
}

export function buildShieldModel(textures: ProceduralTextures): {
  shieldGroup: THREE.Group;
  shieldAegisTrim: THREE.Group;
} {
  const shieldGroup = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.78, metalness: 0.05 });
  const crestMat = new THREE.MeshStandardMaterial({ map: textures.shieldEmblem, roughness: 0.42, metalness: 0.25 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.24 });
  const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.34 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5c3418, roughness: 0.85 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.22 });
  const aegisGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.45,
    metalness: 0.5,
    roughness: 0.18,
  });

  // Kite / Heater Shield layered steel-rimmed plate
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.96, 0.74), [
    crestMat,
    woodMat,
    steelMat,
    steelMat,
    steelMat,
    steelMat,
  ]);
  // Inner wood back braces & forearm grip straps
  const backBraceV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.78, 0.12), darkIronMat);
  backBraceV.position.set(0.06, 0, 0);
  const strapTop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.34), leatherMat);
  strapTop.position.set(0.09, 0.18, 0);
  const strapBot = strapTop.clone();
  strapBot.position.y = -0.18;

  // Lower tapered shield tip + brass keel cap
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.05, 0.36, 4), steelMat);
  tip.rotation.y = Math.PI * 0.25;
  tip.scale.set(0.18, 1, 1);
  tip.position.set(0, -0.63, 0);
  const keelStud = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), goldMat);
  keelStud.position.set(-0.04, -0.78, 0);

  // Riveted outer frame & center boss with steel cross-bands
  const rimTop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.78), steelMat);
  rimTop.position.set(0, 0.47, 0);
  const rimSideL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.98, 0.09), steelMat);
  rimSideL.position.set(0, 0, -0.36);
  const rimSideR = rimSideL.clone();
  rimSideR.position.z = 0.36;

  // Rivet studs along left/right edges
  for (const ry of [-0.32, 0.0, 0.32]) {
    for (const rz of [-0.36, 0.36]) {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), goldMat);
      stud.position.set(-0.07, ry, rz);
      shieldGroup.add(stud);
    }
  }

  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 10), goldMat);
  boss.scale.set(0.45, 1, 1);
  boss.position.set(-0.065, 0.04, 0);
  const bossRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.026, 8, 14), steelMat);
  bossRing.rotation.y = Math.PI * 0.5;
  bossRing.position.set(-0.055, 0.04, 0);

  // Upgraded Щит Егіди golden wing crest, feather blades & glowing rune gem
  const shieldAegisTrim = new THREE.Group();
  shieldAegisTrim.visible = false;
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.54, 0.14), goldMat);
  wingL.position.set(-0.045, 0.14, -0.27);
  wingL.rotation.x = 0.28;
  const wingR = wingL.clone();
  wingR.position.z = 0.27;
  wingR.rotation.x = -0.28;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 4), goldMat);
  crown.position.set(-0.04, 0.6, 0);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), aegisGlowMat);
  gem.position.set(-0.095, 0.04, 0);
  shieldAegisTrim.add(wingL, wingR, crown, gem);

  shieldGroup.add(
    body,
    backBraceV,
    strapTop,
    strapBot,
    tip,
    keelStud,
    rimTop,
    rimSideL,
    rimSideR,
    boss,
    bossRing,
    shieldAegisTrim,
  );
  shieldGroup.position.set(-0.22, -0.42, 0.08);
  shieldGroup.rotation.y = Math.PI * 0.12;

  shieldGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return { shieldGroup, shieldAegisTrim };
}

export function buildWeaponModel(id: WeaponId): THREE.Group {
  const g = new THREE.Group();

  if (id === 'sword') {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.94,
      roughness: 0.14,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.88,
      roughness: 0.26,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.82,
      metalness: 0.75,
      roughness: 0.18,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.22,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x3f2718,
      roughness: 0.84,
      metalness: 0.05,
    });

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.36, 10), gripMat);
    grip.position.y = 0.05;
    for (const ry of [-0.04, 0.05, 0.14]) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.013, 6, 12), goldMat);
      wrap.rotation.x = Math.PI * 0.5;
      wrap.position.y = ry;
      g.add(wrap);
    }
    const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), goldMat);
    pommel.position.y = -0.15;
    const pommelGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), edgeMat);
    pommelGem.position.set(0, -0.22, 0);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.13), goldMat);
    guard.position.y = 0.25;
    const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.2, 4), goldMat);
    wingL.rotation.z = Math.PI * 0.36;
    wingL.position.set(-0.29, 0.3, 0);
    const wingR = wingL.clone();
    wingR.rotation.z = -Math.PI * 0.36;
    wingR.position.x = 0.29;
    const guardGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), edgeMat);
    guardGem.position.set(0, 0.25, 0.08);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.155, 1.22, 0.036), steelMat);
    blade.position.y = 0.88;
    const ricasso = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.058), darkSteelMat);
    ricasso.position.y = 0.4;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1.14, 0.054), darkSteelMat);
    spine.position.y = 0.86;
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.98, 0.064), edgeMat);
    fuller.position.y = 0.88;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.28, 4), steelMat);
    tip.rotation.y = Math.PI * 0.25;
    tip.scale.set(1, 1, 0.36);
    tip.position.y = 1.62;

    g.add(grip, pommel, pommelGem, guard, wingL, wingR, guardGem, blade, ricasso, spine, fuller, tip);
    g.rotation.x = Math.PI * 0.42;
  } else if (id === 'hammer') {
    const oakMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8, metalness: 0.06 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.88 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.24 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.86, roughness: 0.28 });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xea580c,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.066, 1.5, 10), oakMat);
    shaft.position.y = 0.58;
    const leatherWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.069, 0.42, 10), gripMat);
    leatherWrap.position.y = 0.14;
    const shaftBand = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 10), bronzeMat);
    shaftBand.position.y = 0.68;
    const pommelSpike = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 6), bronzeMat);
    pommelSpike.rotation.x = Math.PI;
    pommelSpike.position.y = -0.22;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.095, 0.18, 10), bronzeMat);
    collar.position.y = 1.06;
    const headCore = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.68), ironMat);
    headCore.position.y = 1.28;
    const faceA = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.13), bronzeMat);
    faceA.position.set(0, 1.28, 0.36);
    const faceB = faceA.clone();
    faceB.position.z = -0.36;
    const runeBand = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.09, 0.5), runeMat);
    runeBand.position.y = 1.28;
    const sidePlateL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.38), bronzeMat);
    sidePlateL.position.set(-0.22, 1.28, 0);
    const sidePlateR = sidePlateL.clone();
    sidePlateR.position.x = 0.22;
    const topSpike = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.26, 4), bronzeMat);
    topSpike.position.y = 1.58;

    g.add(shaft, leatherWrap, shaftBand, pommelSpike, collar, headCore, faceA, faceB, runeBand, sidePlateL, sidePlateR, topSpike);
    g.rotation.x = Math.PI * 0.4;
  } else if (id === 'blaster') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.74, roughness: 0.26 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.2 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.05,
      roughness: 0.12,
    });

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.32, 0.14), bodyMat);
    grip.position.set(0, 0.04, 0);
    grip.rotation.x = -0.22;
    const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.16), trimMat);
    triggerGuard.position.set(0, 0.11, 0.12);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.74), bodyMat);
    receiver.position.set(0, 0.24, 0.22);
    const energyCell = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 8), glowMat);
    energyCell.position.set(0, 0.1, 0.34);
    const scopeRail = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.07, 0.44), trimMat);
    scopeRail.position.set(0, 0.4, 0.18);
    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), glowMat);
    scopeLens.rotation.x = Math.PI * 0.5;
    scopeLens.position.set(0, 0.44, 0.22);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.072, 0.56, 10), trimMat);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.24, 0.72);
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.2, 0.38), trimMat);
    finL.position.set(-0.11, 0.24, 0.56);
    const finR = finL.clone();
    finR.position.x = 0.11;
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.085, 0.38), glowMat);
    core.position.set(0, 0.24, 0.24);
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 16), glowMat);
    muzzle.position.set(0, 0.24, 1.0);

    g.add(grip, triggerGuard, receiver, energyCell, scopeRail, scopeLens, barrel, finL, finR, core, muzzle);
  } else {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.7, metalness: 0.06 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.45, metalness: 0.15 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.25 });
    const stringMat = new THREE.MeshStandardMaterial({
      color: 0xd9f99d,
      emissive: 0x65a30d,
      emissiveIntensity: 0.85,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xa3e635,
      emissive: 0x4d7c0f,
      emissiveIntensity: 1.3,
      metalness: 0.65,
      roughness: 0.18,
    });

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.68, -0.22),
      new THREE.Vector3(0, -0.46, -0.01),
      new THREE.Vector3(0, -0.22, 0.15),
      new THREE.Vector3(0, 0.22, 0.15),
      new THREE.Vector3(0, 0.46, -0.01),
      new THREE.Vector3(0, 0.68, -0.22),
    ]);
    const bowArc = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.038, 8, false), woodMat);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.28, 8), goldMat);
    grip.position.set(0, 0, 0.14);
    const sightRing = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.012, 6, 12), goldMat);
    sightRing.position.set(0.055, 0.06, 0.16);
    const stabilizer = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.26, 6), goldMat);
    stabilizer.rotation.x = Math.PI * 0.5;
    stabilizer.position.set(0, -0.08, 0.26);
    const tipTop = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.14, 6), hornMat);
    tipTop.position.set(0, 0.7, -0.23);
    tipTop.rotation.x = -0.5;
    const tipBot = tipTop.clone();
    tipBot.position.y = -0.7;
    tipBot.rotation.x = Math.PI + 0.5;
    const stringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.36, 6), stringMat);
    stringMesh.position.set(0, 0, -0.21);
    const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.04, 6), woodMat);
    arrowShaft.rotation.x = Math.PI * 0.5;
    arrowShaft.position.set(0, 0.03, 0.22);
    const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.054, 0.17, 4), tipMat);
    arrowTip.rotation.x = Math.PI * 0.5;
    arrowTip.position.set(0, 0.03, 0.78);
    const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.075, 0.17), tipMat);
    fletch.position.set(0, 0.03, -0.24);

    g.add(bowArc, grip, sightRing, stabilizer, tipTop, tipBot, stringMesh, arrowShaft, arrowTip, fletch);
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

  // Leather belt, brass buckle, & side travel pouches
  const belt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.54), leatherMat);
  belt.position.set(0, -0.42, 0);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.06), brassMat);
  buckle.position.set(0, -0.42, 0.27);
  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.2), leatherMat);
  pouchL.position.set(-0.5, -0.38, 0.06);
  const pouchR = pouchL.clone();
  pouchR.position.x = 0.5;

  // Explorer backpack satchel + brass clasps + shoulder straps
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.28), leatherMat);
  pack.position.set(0, -0.02, -0.36);
  const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.3), brassMat);
  packFlap.position.set(0, 0.24, -0.36);
  packFlap.scale.set(1, 1, 1.02);
  const packBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.05), brassMat);
  packBuckle.position.set(0, 0.1, -0.52);
  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.74, 10), denimMat);
  bedroll.rotation.z = Math.PI * 0.5;
  bedroll.position.set(0, -0.38, -0.42);
  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.74, 0.54), leatherMat);
  strapL.position.set(-0.26, 0.1, 0);
  const strapR = strapL.clone();
  strapR.position.x = 0.26;

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
    pouchL,
    pouchR,
    pack,
    packFlap,
    packBuckle,
    bedroll,
    strapL,
    strapR,
  );

  // Craftable Ranger Armor overlay (visible once crafted)
  const armorGroup = new THREE.Group();
  armorGroup.visible = false;
  const armorPlateMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.26 });
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.56, 0.56), armorPlateMat);
  chestPlate.position.set(0, 0.16, 0);
  const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), brassMat);
  chestCore.position.set(0, 0.2, 0.29);
  const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.09, 0.58), brassMat);
  chestTrim.position.set(0, 0.36, 0);
  const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.26, 0.58), armorPlateMat);
  pauldronL.position.set(-0.68, 0.44, 0);
  pauldronL.rotation.z = 0.22;
  const pauldronTrimL = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.6), brassMat);
  pauldronTrimL.position.set(-0.68, 0.55, 0);
  pauldronTrimL.rotation.z = 0.22;
  const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.26, 0.58), armorPlateMat);
  pauldronR.position.set(0.68, 0.44, 0);
  pauldronR.rotation.z = -0.22;
  const pauldronTrimR = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.6), brassMat);
  pauldronTrimR.position.set(0.68, 0.55, 0);
  pauldronTrimR.rotation.z = -0.22;
  armorGroup.add(chestPlate, chestCore, chestTrim, pauldronL, pauldronTrimL, pauldronR, pauldronTrimR);
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

  // Left Arm (with leather bracer, ribbed cuff & mounted Shield)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.68, 1.88, 0);
  bodyTilt.add(leftArm);
  const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.66, 0.38), hoodieMat);
  lSleeve.position.set(0, -0.25, 0);
  const lBracer = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.2, 0.41), leatherMat);
  lBracer.position.set(0, -0.45, 0);
  const lCuff = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.09, 0.39), hoodTrimMat);
  lCuff.position.set(0, -0.59, 0);
  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.25, 0.33), skinMat);
  lHand.position.set(0, -0.75, 0);
  const { shieldGroup, shieldAegisTrim } = buildShieldModel(textures);
  leftArm.add(lSleeve, lBracer, lCuff, lHand, shieldGroup);

  // Right Arm + Leather Bracer + Weapon Socket
  const rightArm = new THREE.Group();
  rightArm.position.set(0.68, 1.88, 0);
  bodyTilt.add(rightArm);
  const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.66, 0.38), hoodieMat);
  rSleeve.position.set(0, -0.25, 0);
  const rBracer = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.2, 0.41), leatherMat);
  rBracer.position.set(0, -0.45, 0);
  const rCuff = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.09, 0.39), hoodTrimMat);
  rCuff.position.set(0, -0.59, 0);
  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.25, 0.33), skinMat);
  rHand.position.set(0, -0.75, 0);
  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(0, -0.78, 0.14);
  rightArm.add(rSleeve, rBracer, rCuff, rHand, weaponSocket);

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

  // Legs (denim pants + reinforced leather knee guard + cuff + laced sneakers)
  const makeLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.96, 0);
    const pant = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.44), denimMat);
    pant.position.set(0, -0.34, 0);
    const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.12), leatherMat);
    kneePad.position.set(0, -0.38, 0.22);
    const kneeRivet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), brassMat);
    kneeRivet.position.set(0, -0.38, 0.28);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.46), cordMat);
    cuff.position.set(0, -0.69, 0);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.52), shoeMat);
    shoe.position.set(0, -0.8, 0.04);
    const laceStripe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.24), cordMat);
    laceStripe.position.set(0, -0.76, 0.14);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.07, 0.54), soleMat);
    sole.position.set(0, -0.925, 0.04);
    leg.add(pant, kneePad, kneeRivet, cuff, shoe, laceStripe, sole);
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
    shieldGroup,
    shieldAegisTrim,
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
  legFL?: THREE.Group;
  legFR?: THREE.Group;
  legBL?: THREE.Group;
  legBR?: THREE.Group;
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
  let legFL: THREE.Group | undefined;
  let legFR: THREE.Group | undefined;
  let legBL: THREE.Group | undefined;
  let legBR: THREE.Group | undefined;

  if (kind === 'slime') {
    const outerMat = new THREE.MeshStandardMaterial({
      map: textures.slimeGel,
      color: 0x6ee7b7,
      roughness: 0.14,
      metalness: 0.05,
      transparent: true,
      opacity: 0.8,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      emissive: 0x047857,
      emissiveIntensity: 0.45,
      roughness: 0.4,
    });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.65 });

    const gelCube = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.96, 1.18), outerMat);
    gelCube.position.y = 0.48;
    const gelInner = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.92), coreMat);
    gelInner.position.y = 0.46;
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), coreMat);
    core.position.y = 0.46;
    // Suspended translucent bubbles & slime crown
    for (const [bx, by, bz, br] of [
      [-0.32, 0.28, 0.24, 0.1],
      [0.34, 0.64, -0.22, 0.09],
      [0.18, 0.25, -0.34, 0.08],
    ]) {
      const bub = new THREE.Mesh(new THREE.SphereGeometry(br, 6, 6), outerMat);
      bub.position.set(bx, by, bz);
      body.add(bub);
    }
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

    body.add(gelCube, gelInner, core, eyeL, eyeR, glintL, glintR, stem, leafL, leafR);
    hitFlashMeshes.push(gelCube, core);
  } else if (kind === 'goblin') {
    const skinMat = new THREE.MeshStandardMaterial({ map: textures.goblinSkin, roughness: 0.72, metalness: 0.04 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 0.85, metalness: 0.05 });
    const loinMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.9 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.45 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.goblinFace, roughness: 0.65 });
    const clubMat = new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.84 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.8, 0.44), vestMat);
    torso.position.y = 1.12;
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.47), brassMat);
    strap.position.y = 1.18;
    strap.rotation.z = 0.42;
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
    const mohawk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.54), hairMat);
    mohawk.position.set(0, 2.18, -0.02);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.16), skinMat);
    nose.position.set(0, 1.78, 0.33);
    const tuskL = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), tuskMat);
    tuskL.position.set(-0.12, 1.66, 0.31);
    const tuskR = tuskL.clone();
    tuskR.position.x = 0.12;
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 4), skinMat);
    earL.rotation.z = Math.PI * 0.42;
    earL.position.set(-0.44, 1.84, 0);
    const earR = earL.clone();
    earR.rotation.z = -Math.PI * 0.42;
    earR.position.x = 0.44;

    leftArm = new THREE.Group();
    leftArm.position.set(-0.54, 1.4, 0);
    const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.38), vestMat);
    lShoulder.position.y = -0.02;
    const lSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), brassMat);
    lSpike.position.set(-0.14, 0.1, 0);
    lSpike.rotation.z = 0.5;
    const lArmM = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.64, 0.26), skinMat);
    lArmM.position.y = -0.32;
    leftArm.add(lShoulder, lSpike, lArmM);

    rightArm = new THREE.Group();
    rightArm.position.set(0.54, 1.4, 0);
    const rArmM = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.64, 0.26), skinMat);
    rArmM.position.y = -0.32;
    const club = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.055, 0.82, 7), clubMat);
    club.rotation.x = Math.PI * 0.42;
    club.position.set(0, -0.58, 0.28);
    const clubBand = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.12, 0.12, 7), brassMat);
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

    body.add(
      torso,
      strap,
      belt,
      buckle,
      head,
      mohawk,
      nose,
      tuskL,
      tuskR,
      earL,
      earR,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
    );
    hitFlashMeshes.push(torso, head, lArmM, rArmM);
  } else if (kind === 'wolf') {
    // 4-legged Тіньовий Вовк with shaggy dorsal crest, glowing amber eyes, fangs & clawed paws
    const furMat = new THREE.MeshStandardMaterial({ map: textures.wolfFur, roughness: 0.85, metalness: 0.05 });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 1.65,
    });
    const fangMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.58, 1.28), furMat);
    torso.position.y = 0.82;
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.64, 0.52), maneMat);
    mane.position.set(0, 0.88, 0.36);
    const spineRidge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.96), maneMat);
    spineRidge.position.set(0, 1.15, -0.05);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.46, 0.54), furMat);
    head.position.set(0, 1.05, 0.72);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.36), maneMat);
    snout.position.set(0, 0.96, 1.1);
    const noseTip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.08), eyeMat);
    noseTip.position.set(0, 1.02, 1.28);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 4), maneMat);
    earL.position.set(-0.18, 1.38, 0.64);
    const earR = earL.clone();
    earR.position.x = 0.18;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.06), eyeMat);
    eyeL.position.set(-0.15, 1.12, 0.99);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.15;
    const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.1, 4), fangMat);
    fangL.rotation.x = Math.PI;
    fangL.position.set(-0.08, 0.83, 1.2);
    const fangR = fangL.clone();
    fangR.position.x = 0.08;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.66), maneMat);
    tail.position.set(0, 0.96, -0.82);
    tail.rotation.x = 0.45;
    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.22), fangMat);
    tailTip.position.set(0, 1.1, -1.14);
    tailTip.rotation.x = 0.45;

    const makePawLeg = (lx: number, lz: number) => {
      const lg = new THREE.Group();
      lg.position.set(lx, 0.62, lz);
      const legM = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.18), furMat);
      legM.position.y = -0.28;
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.1, 0.25), maneMat);
      paw.position.set(0, -0.56, 0.03);
      const claws = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.08), fangMat);
      claws.position.set(0, -0.58, 0.17);
      lg.add(legM, paw, claws);
      return lg;
    };
    legFL = makePawLeg(-0.2, 0.42);
    legFR = makePawLeg(0.2, 0.42);
    legBL = makePawLeg(-0.2, -0.44);
    legBR = makePawLeg(0.2, -0.44);

    body.add(
      torso,
      mane,
      spineRidge,
      head,
      snout,
      noseTip,
      earL,
      earR,
      eyeL,
      eyeR,
      fangL,
      fangR,
      tail,
      tailTip,
      legFL,
      legFR,
      legBL,
      legBR,
    );
    hitFlashMeshes.push(torso, mane, head);
  } else if (kind === 'skeleton') {
    // Печерний Скелет with weathered ribs, iron helm, shoulder plates & glowing cyan eye sockets
    const boneMat = new THREE.MeshStandardMaterial({ map: textures.skeletonBone, roughness: 0.72 });
    const darkBoneMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.82, roughness: 0.28 });
    const cloakMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, side: THREE.DoubleSide });
    const eyeGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.85,
    });

    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 6), darkBoneMat);
    spine.position.y = 1.28;
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.34), boneMat);
    pelvis.position.y = 0.88;
    const cloak = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.15), cloakMat);
    cloak.position.set(0, 1.24, -0.25);
    cloak.rotation.x = 0.12;
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.44), boneMat);
      rib.position.y = 1.18 + r * 0.16;
      body.add(rib);
    }

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.56), boneMat);
    skull.position.y = 2.04;
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.26, 0.66), ironMat);
    helm.position.y = 2.26;
    const helmNose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.08), ironMat);
    helmNose.position.set(0, 2.1, 0.32);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.06), eyeGlowMat);
    eyeL.position.set(-0.13, 2.05, 0.29);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.13;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.22), darkBoneMat);
    jaw.position.set(0, 1.84, 0.22);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.48, 1.66, 0);
    const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.28), ironMat);
    const lBoneArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.74, 0.14), boneMat);
    lBoneArm.position.y = -0.36;
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.68, 0.54), ironMat);
    shield.position.set(-0.1, -0.45, 0.14);
    const shieldBoss = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), eyeGlowMat);
    shieldBoss.position.set(-0.15, -0.45, 0.14);
    leftArm.add(lShoulder, lBoneArm, shield, shieldBoss);

    rightArm = new THREE.Group();
    rightArm.position.set(0.48, 1.66, 0);
    const rShoulder = lShoulder.clone();
    const rBoneArm = lBoneArm.clone();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.96, 0.14), ironMat);
    blade.rotation.x = Math.PI * 0.42;
    blade.position.set(0, -0.68, 0.42);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.08), darkBoneMat);
    guard.position.set(0, -0.62, 0.08);
    rightArm.add(rShoulder, rBoneArm, blade, guard);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.2, 0.82, 0);
    const lBoneLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.82, 0.16), boneMat);
    lBoneLeg.position.y = -0.41;
    const lKnee = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.2), ironMat);
    lKnee.position.y = -0.4;
    leftLeg.add(lBoneLeg, lKnee);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.2, 0.82, 0);
    const rBoneLeg = lBoneLeg.clone();
    const rKnee = lKnee.clone();
    rightLeg.add(rBoneLeg, rKnee);

    body.add(
      spine,
      pelvis,
      cloak,
      skull,
      helm,
      helmNose,
      eyeL,
      eyeR,
      jaw,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
    );
    hitFlashMeshes.push(skull, pelvis, lBoneArm, rBoneArm);
  } else if (kind === 'golem') {
    const stoneMat = new THREE.MeshStandardMaterial({
      map: textures.golemStone,
      roughness: 0.9,
      metalness: 0.1,
    });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.88 });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xea580c,
      emissiveIntensity: 1.55,
      roughness: 0.25,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.38, 0.94), stoneMat);
    torso.position.y = 1.72;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), runeMat);
    core.position.set(0, 1.75, 0.48);
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 6, 12), stoneMat);
    coreRing.position.set(0, 1.75, 0.45);
    const mossCap = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.2, 0.96), mossMat);
    mossCap.position.y = 2.4;
    const backSpire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 5), runeMat);
    backSpire.position.set(-0.32, 2.55, -0.25);
    backSpire.rotation.x = -0.3;
    const backSpireR = backSpire.clone();
    backSpireR.position.x = 0.32;
    const waist = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.3, 0.74), stoneMat);
    waist.position.y = 1.05;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.7, 0.74), stoneMat);
    head.position.y = 2.76;
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.16, 0.78), mossMat);
    brow.position.y = 3.06;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.06), runeMat);
    eyeL.position.set(-0.18, 2.78, 0.38);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;

    leftArm = new THREE.Group();
    leftArm.position.set(-0.98, 2.15, 0);
    const lPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.6), mossMat);
    const lShoulderCrystal = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 5), runeMat);
    lShoulderCrystal.position.set(-0.18, 0.36, 0);
    lShoulderCrystal.rotation.z = 0.35;
    const lFist = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.15, 0.5), stoneMat);
    lFist.position.y = -0.68;
    const lRune = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.11, 0.52), runeMat);
    lRune.position.y = -0.92;
    leftArm.add(lPauldron, lShoulderCrystal, lFist, lRune);

    rightArm = new THREE.Group();
    rightArm.position.set(0.98, 2.15, 0);
    const rPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.6), mossMat);
    const rShoulderCrystal = lShoulderCrystal.clone();
    rShoulderCrystal.position.x = 0.18;
    rShoulderCrystal.rotation.z = -0.35;
    const rFist = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.15, 0.5), stoneMat);
    rFist.position.y = -0.68;
    const rRune = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.11, 0.52), runeMat);
    rRune.position.y = -0.92;
    rightArm.add(rPauldron, rShoulderCrystal, rFist, rRune);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.42, 1.05, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.05, 0.62), stoneMat);
    lLegM.position.y = -0.525;
    const lFootMoss = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.66), mossMat);
    lFootMoss.position.y = -0.95;
    leftLeg.add(lLegM, lFootMoss);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.42, 1.05, 0);
    const rLegM = lLegM.clone();
    const rFootMoss = lFootMoss.clone();
    rightLeg.add(rLegM, rFootMoss);

    body.add(
      torso,
      core,
      coreRing,
      mossCap,
      backSpire,
      backSpireR,
      waist,
      head,
      brow,
      eyeL,
      eyeR,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
    );
    hitFlashMeshes.push(torso, head, lFist, rFist);
  } else {
    // Boss: Тіньовий Лицар with layered Damascus plate armor, horned crown & runic greatsword
    const darkArmor = new THREE.MeshStandardMaterial({
      map: textures.bossArmor,
      metalness: 0.8,
      roughness: 0.26,
    });
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 1.85,
      roughness: 0.2,
    });
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x4c0519,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.34, 0.7), darkArmor);
    torso.position.y = 1.84;
    const beltPlate = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.2, 0.74), crimsonMat);
    beltPlate.position.y = 1.32;
    const chestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), crimsonMat);
    chestGem.position.set(0, 1.96, 0.37);
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.78), capeMat);
    cape.position.set(0, 1.56, -0.42);
    cape.rotation.x = 0.14;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.8, 0.78), darkArmor);
    head.position.y = 2.92;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.84), crimsonMat);
    crest.position.set(0, 3.38, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.13, 0.08), crimsonMat);
    visor.position.set(0, 2.92, 0.4);
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.62, 5), darkArmor);
    hornL.position.set(-0.4, 3.38, 0);
    hornL.rotation.z = 0.42;
    const hornR = hornL.clone();
    hornR.position.x = 0.4;
    hornR.rotation.z = -0.42;

    leftArm = new THREE.Group();
    leftArm.position.set(-0.84, 2.34, 0);
    const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 0.62), darkArmor);
    const lSpike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.36, 4), crimsonMat);
    lSpike.position.set(-0.14, 0.3, 0);
    lSpike.rotation.z = 0.35;
    const lArmM = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.96, 0.4), darkArmor);
    lArmM.position.y = -0.52;
    leftArm.add(lShoulder, lSpike, lArmM);

    rightArm = new THREE.Group();
    rightArm.position.set(0.84, 2.34, 0);
    const rShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 0.62), darkArmor);
    const rSpike = lSpike.clone();
    rSpike.position.set(0.14, 0.3, 0);
    rSpike.rotation.z = -0.35;
    const rArmM = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.96, 0.4), darkArmor);
    rArmM.position.y = -0.52;
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.12), darkArmor);
    hilt.rotation.x = Math.PI * 0.42;
    hilt.position.set(0, -0.82, 0.28);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.17, 1.82, 0.06), darkArmor);
    blade.rotation.x = Math.PI * 0.42;
    blade.position.set(0, -0.94, 0.72);
    const bladeRune = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.64, 0.08), crimsonMat);
    bladeRune.rotation.x = Math.PI * 0.42;
    bladeRune.position.set(0, -0.94, 0.72);
    rightArm.add(rShoulder, rSpike, rArmM, hilt, blade, bladeRune);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.32, 1.18, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.18, 0.5), darkArmor);
    lLegM.position.y = -0.59;
    const lKnee = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.54), crimsonMat);
    lKnee.position.y = -0.45;
    leftLeg.add(lLegM, lKnee);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.32, 1.18, 0);
    const rLegM = lLegM.clone();
    const rKnee = lKnee.clone();
    rightLeg.add(rLegM, rKnee);

    body.add(
      torso,
      beltPlate,
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

  const barY =
    kind === 'slime' ? 1.48 : kind === 'wolf' ? 1.75 : kind === 'goblin' || kind === 'skeleton' ? 2.5 : 3.65;
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

  return {
    root,
    body,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    legFL,
    legFR,
    legBL,
    legBR,
    hpBarBg,
    hpBarFill,
    hitFlashMeshes,
  };
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
    const woolMat = new THREE.MeshStandardMaterial({ map: textures.sheepWool, roughness: 0.94 });
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
  } else if (kind === 'merchant') {
    // Торговець Марко inside the Shop building
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.78 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c69e, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.merchantFace, roughness: 0.55 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.86, roughness: 0.22 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.98, 0.5), vestMat);
    torso.position.y = 1.42;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.84, 0.06), apronMat);
    apron.position.set(0, 1.32, 0.26);
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.18), goldMat);
    pouch.position.set(0.32, 1.05, 0.26);

    head = new THREE.Group();
    head.position.set(0, 2.26, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.68), [
      skinMat,
      skinMat,
      skinMat,
      skinMat,
      faceMat,
      skinMat,
    ]);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.4, 0.22, 10), hatMat);
    cap.position.y = 0.4;
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 8), goldMat);
    badge.rotation.x = Math.PI * 0.5;
    badge.position.set(-0.18, 0.4, 0.39);
    head.add(headMesh, cap, badge);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.58, 1.82, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.64, 0.3), vestMat);
    lArm.position.y = -0.28;
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.26), skinMat);
    lHand.position.y = -0.64;
    leftArm.add(lArm, lHand);

    rightArm = new THREE.Group();
    rightArm.position.set(0.58, 1.82, 0);
    const rArm = lArm.clone();
    const rHand = lHand.clone();
    const coinProp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10), goldMat);
    coinProp.rotation.x = Math.PI * 0.5;
    coinProp.position.set(0, -0.66, 0.22);
    rightArm.add(rArm, rHand, coinProp);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.22, 0.94, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.94, 0.38), trouserMat);
    lLegM.position.y = -0.47;
    leftLeg.add(lLegM);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.22, 0.94, 0);
    const rLegM = lLegM.clone();
    rightLeg.add(rLegM);

    body.add(torso, apron, pouch, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'blacksmith') {
    // Коваль Богдан: heavy leather forge apron, muscular tunic & glowing forge hammer
    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe7b58b, roughness: 0.68 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.blacksmithFace, roughness: 0.58 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.88, roughness: 0.25 });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xea580c,
      emissiveIntensity: 1.3,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.0, 0.56), tunicMat);
    torso.position.y = 1.44;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.92, 0.08), apronMat);
    apron.position.set(0, 1.32, 0.29);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.1), steelMat);
    buckle.position.set(0, 1.08, 0.31);

    head = new THREE.Group();
    head.position.set(0, 2.28, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), [
      skinMat,
      skinMat,
      skinMat,
      skinMat,
      faceMat,
      skinMat,
    ]);
    const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.18, 0.74), emberMat);
    bandana.position.y = 0.28;
    head.add(headMesh, bandana);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.62, 1.84, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.64, 0.32), skinMat);
    lArm.position.y = -0.28;
    leftArm.add(lArm);

    rightArm = new THREE.Group();
    rightArm.position.set(0.62, 1.84, 0);
    const rArm = lArm.clone();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.9, 6), apronMat);
    shaft.rotation.x = Math.PI * 0.42;
    shaft.position.set(0, -0.56, 0.32);
    const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.38), steelMat);
    hHead.position.set(0, -0.7, 0.65);
    rightArm.add(rArm, shaft, hHead);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.24, 0.94, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.94, 0.4), trouserMat);
    lLegM.position.y = -0.47;
    leftLeg.add(lLegM);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.24, 0.94, 0);
    rightLeg.add(lLegM.clone());

    body.add(torso, apron, buckle, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'herbalist') {
    // Травниця Соломія: emerald woven shawl, flower wreath & glowing herbal staff
    const dressMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.82 });
    const shawlMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6cfa9, roughness: 0.62 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.herbalistFace, roughness: 0.55 });
    const bloomMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xdb2777,
      emissiveIntensity: 0.65,
    });
    const satchelMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.96, 0.56), dressMat);
    skirt.position.y = 0.54;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.48), dressMat);
    torso.position.y = 1.44;
    const shawl = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.26, 0.54), shawlMat);
    shawl.position.y = 1.82;
    const herbBag = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.28), satchelMat);
    herbBag.position.set(-0.48, 1.16, 0.08);

    head = new THREE.Group();
    head.position.set(0, 2.24, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.66), [
      skinMat,
      skinMat,
      skinMat,
      skinMat,
      faceMat,
      skinMat,
    ]);
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 6, 12), shawlMat);
    wreath.rotation.x = Math.PI * 0.5;
    wreath.position.y = 0.3;
    const flowerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), bloomMat);
    flowerGem.position.set(0.24, 0.34, 0.26);
    head.add(headMesh, wreath, flowerGem);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.54, 1.78, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.62, 0.28), dressMat);
    lArm.position.y = -0.26;
    leftArm.add(lArm);

    rightArm = new THREE.Group();
    rightArm.position.set(0.54, 1.78, 0);
    const rArm = lArm.clone();
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 1.9, 7), satchelMat);
    staff.position.set(0, -0.35, 0.22);
    const staffBloom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), bloomMat);
    staffBloom.position.set(0, 0.62, 0.22);
    rightArm.add(rArm, staff, staffBloom);

    leftLeg = new THREE.Group();
    rightLeg = new THREE.Group();
    body.add(skirt, torso, shawl, herbBag, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'explorer') {
    // Скарбошукач Тарас: amber adventurer coat, wide-brimmed explorer hat & crystal lantern
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.82 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xecc094, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.explorerFace, roughness: 0.58 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 });
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.96, 0.48), coatMat);
    torso.position.y = 1.42;
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.68, 0.24), trouserMat);
    pack.position.set(0, 1.44, -0.34);

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
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.06, 12), hatMat);
    brim.position.y = 0.35;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.34, 10), hatMat);
    crown.position.y = 0.52;
    head.add(headMesh, brim, crown);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.56, 1.8, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.64, 0.3), coatMat);
    lArm.position.y = -0.28;
    leftArm.add(lArm);

    rightArm = new THREE.Group();
    rightArm.position.set(0.56, 1.8, 0);
    const rArm = lArm.clone();
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.22), lanternMat);
    lantern.position.set(0, -0.74, 0.2);
    rightArm.add(rArm, lantern);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.22, 0.94, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.94, 0.38), trouserMat);
    lLegM.position.y = -0.47;
    leftLeg.add(lLegM);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.22, 0.94, 0);
    rightLeg.add(lLegM.clone());

    body.add(torso, pack, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'mayor') {
    // Староста Селища Мирослав: navy fur-trimmed council coat, gold chain of office & oak cane
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.72 });
    const furTrimMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.mayorFace, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.22 });
    const oakMat = new THREE.MeshStandardMaterial({ color: 0x5c3418, roughness: 0.78 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.0, 0.5), coatMat);
    torso.position.y = 1.42;
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.2, 0.56), furTrimMat);
    collar.position.y = 1.88;
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 6, 12), goldMat);
    chain.position.set(0, 1.72, 0.26);

    head = new THREE.Group();
    head.position.set(0, 2.26, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.68), [
      skinMat,
      skinMat,
      skinMat,
      skinMat,
      faceMat,
      skinMat,
    ]);
    const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.52, 0.07, 10), coatMat);
    capBrim.position.y = 0.36;
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.24, 10), furTrimMat);
    capTop.position.y = 0.48;
    head.add(headMesh, capBrim, capTop);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.58, 1.82, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.64, 0.3), coatMat);
    lArm.position.y = -0.28;
    leftArm.add(lArm);

    rightArm = new THREE.Group();
    rightArm.position.set(0.58, 1.82, 0);
    const rArm = lArm.clone();
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.5, 8), oakMat);
    cane.position.set(0, -0.75, 0.24);
    const caneOrb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), goldMat);
    caneOrb.position.set(0, 0.02, 0.24);
    rightArm.add(rArm, cane, caneOrb);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.22, 0.94, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.94, 0.38), trouserMat);
    lLegM.position.y = -0.47;
    leftLeg.add(lLegM);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.22, 0.94, 0);
    rightLeg.add(lLegM.clone());

    body.add(torso, collar, chain, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'baker') {
    // Пекарка Галина: warm cream tunic, white chef toque & fresh bread basket
    const dressMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.9 });
    const toqueMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.86 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6cfa9, roughness: 0.62 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.bakerFace, roughness: 0.55 });
    const breadMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.72 });

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.54), dressMat);
    skirt.position.y = 0.52;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.92, 0.48), dressMat);
    torso.position.y = 1.44;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.0, 0.06), apronMat);
    apron.position.set(0, 1.15, 0.26);

    head = new THREE.Group();
    head.position.set(0, 2.24, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.66), [
      skinMat,
      skinMat,
      skinMat,
      skinMat,
      faceMat,
      skinMat,
    ]);
    const toqueBand = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.18, 10), toqueMat);
    toqueBand.position.y = 0.4;
    const toquePuff = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), toqueMat);
    toquePuff.scale.set(1, 0.72, 1);
    toquePuff.position.y = 0.58;
    head.add(headMesh, toqueBand, toquePuff);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.54, 1.8, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.62, 0.28), dressMat);
    lArm.position.y = -0.26;
    leftArm.add(lArm);

    rightArm = new THREE.Group();
    rightArm.position.set(0.54, 1.8, 0);
    const rArm = lArm.clone();
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.36), skinMat);
    tray.position.set(-0.1, -0.58, 0.3);
    const loaf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), breadMat);
    loaf.position.set(-0.1, -0.47, 0.3);
    rightArm.add(rArm, tray, loaf);

    leftLeg = new THREE.Group();
    rightLeg = new THREE.Group();
    body.add(skirt, torso, apron, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'alchemist') {
    // Алхімік Лев: scholarly purple robe, brass bandolier & luminous arcane vial staff
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.78 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.72 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.alchemistFace, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
    const vialMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x14b8a6,
      emissiveIntensity: 1.5,
    });

    const robeLower = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.92, 0.54), robeMat);
    robeLower.position.y = 0.52;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.96, 0.48), robeMat);
    torso.position.y = 1.44;
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.16, 0.52), trimMat);
    sash.position.y = 1.02;
    const bandolier = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.1, 0.5), goldMat);
    bandolier.position.y = 1.46;
    bandolier.rotation.z = -0.45;

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
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.24, 0.72), trimMat);
    hood.position.y = 0.34;
    head.add(headMesh, hood);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.56, 1.82, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.64, 0.3), robeMat);
    lArm.position.y = -0.28;
    const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.24, 8), vialMat);
    flask.position.set(0, -0.66, 0.18);
    leftArm.add(lArm, flask);

    rightArm = new THREE.Group();
    rightArm.position.set(0.56, 1.82, 0);
    const rArm = lArm.clone();
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 2.0, 7), goldMat);
    staff.position.set(0, -0.35, 0.22);
    const staffGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), vialMat);
    staffGem.position.set(0, 0.68, 0.22);
    rightArm.add(rArm, staff, staffGem);

    leftLeg = new THREE.Group();
    rightLeg = new THREE.Group();
    body.add(robeLower, torso, sash, bandolier, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'guard') {
    // Вартовий Северин: heavy riveted plate cuirass, crested helmet, shield & steel halberd
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.86, roughness: 0.28 });
    const surcoatMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.78 });
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.75 });
    const oakMat = new THREE.MeshStandardMaterial({ color: 0x5c3418, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xecc094, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.guardFace, roughness: 0.55 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.0, 0.54), armorMat);
    torso.position.y = 1.44;
    const surcoat = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.78, 0.58), surcoatMat);
    surcoat.position.y = 1.3;

    head = new THREE.Group();
    head.position.set(0, 2.28, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.68), [
      armorMat,
      armorMat,
      armorMat,
      armorMat,
      faceMat,
      armorMat,
    ]);
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.24, 0.74), armorMat);
    helm.position.y = 0.28;
    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.62), crestMat);
    plume.position.y = 0.48;
    head.add(headMesh, helm, plume);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.6, 1.84, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.64, 0.32), armorMat);
    lArm.position.y = -0.28;
    const guardShield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.84, 0.56), surcoatMat);
    guardShield.position.set(-0.18, -0.4, 0.1);
    leftArm.add(lArm, guardShield);

    rightArm = new THREE.Group();
    rightArm.position.set(0.6, 1.84, 0);
    const rArm = lArm.clone();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 2.35, 6), oakMat);
    pole.position.set(0, -0.2, 0.22);
    const halberdAxe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.36), armorMat);
    halberdAxe.position.set(0, 0.78, 0.36);
    const halberdTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 4), armorMat);
    halberdTip.position.set(0, 1.08, 0.22);
    rightArm.add(rArm, pole, halberdAxe, halberdTip);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.24, 0.94, 0);
    const lLegM = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.94, 0.4), armorMat);
    lLegM.position.y = -0.47;
    leftLeg.add(lLegM);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.24, 0.94, 0);
    rightLeg.add(lLegM.clone());

    body.add(torso, surcoat, head, leftArm, rightArm, leftLeg, rightLeg);
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
  doorPivotL: THREE.Group;
  doorPivotR: THREE.Group;
  hearthLight: THREE.PointLight;
  hearthFlame: THREE.Mesh;
  indoorChestLid: THREE.Mesh;
}

// Enterable, bug-free architectural houses: proper outward-sloped gable roofs, double hinged front doors & 8 distinct styles
export function buildCabin(textures: ProceduralTextures, style: CabinStyle = 'hunter'): CabinVisual {
  const cabin = new THREE.Group();
  const roofGroup = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneBlock, roughness: 0.9, metalness: 0.05 });
  const wallTex =
    style === 'shop' || style === 'bakery' || style === 'tavern'
      ? textures.plasterTimber
      : style === 'watchtower' || style === 'townhall'
        ? textures.stoneBlock
        : textures.cabinLog;
  const logMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.85,
    metalness: 0.04,
  });
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.78, metalness: 0.05 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.82 });
  const doorMat = new THREE.MeshStandardMaterial({ map: textures.doorWood, roughness: 0.72, metalness: 0.06 });
  const shutterColor =
    style === 'shop'
      ? 0xb91c1c
      : style === 'watchtower' || style === 'townhall'
        ? 0x1e3a8a
        : style === 'cottage'
          ? 0xd97706
          : style === 'bakery'
            ? 0x92400e
            : style === 'alchemy'
              ? 0x6b21a8
              : style === 'tavern'
                ? 0x7c2d12
                : 0x1e4620;
  const shutterMat = new THREE.MeshStandardMaterial({ color: shutterColor, roughness: 0.72 });
  const roofTex =
    style === 'shop' || style === 'cottage' || style === 'bakery' || style === 'tavern'
      ? textures.terracottaRoof
      : style === 'watchtower' || style === 'townhall' || style === 'alchemy'
        ? textures.nordicSlate
        : textures.roofShingle;
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.7, metalness: 0.1 });
  const rugMat = new THREE.MeshStandardMaterial({
    color:
      style === 'shop'
        ? 0x1e3a8a
        : style === 'watchtower' || style === 'townhall'
          ? 0x334155
          : style === 'alchemy'
            ? 0x581c87
            : style === 'bakery'
              ? 0xb45309
              : 0x991b1b,
    roughness: 0.92,
  });
  const rugTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.85 });
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.85 });
  const quiltMat = new THREE.MeshStandardMaterial({
    color: style === 'cottage' ? 0x16a34a : style === 'watchtower' || style === 'townhall' ? 0x2563eb : 0xb91c1c,
    roughness: 0.88,
  });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
  const flowerPinkMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.65 });
  const flowerGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.65 });
  const greeneryMat = new THREE.MeshStandardMaterial({ color: 0x3f6e24, roughness: 0.8 });
  const glowWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.15,
    roughness: 0.25,
    transparent: true,
    opacity: 0.86,
  });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xfb923c,
    emissive: 0xea580c,
    emissiveIntensity: 2.2,
    roughness: 0.25,
  });

  const isTall = style === 'watchtower' || style === 'townhall';
  const wallH = isTall ? 4.0 : 3.5;

  // 1. Deep Stone Foundation (-1.05..0.72) & Plank Floor (top at y = 0.82) — never floats on slopes
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(CABIN_HALF_W * 2 + 0.62, 1.8, CABIN_HALF_D * 2 + 0.62),
    stoneMat,
  );
  foundation.position.y = -0.18;
  const floorDeck = new THREE.Mesh(
    new THREE.BoxGeometry(CABIN_HALF_W * 2 + 0.26, 0.14, CABIN_HALF_D * 2 + 0.26),
    woodMat,
  );
  floorDeck.position.y = 0.76;

  // Front Porch Deck + Deep Support Piers + Smooth Steps leading down to terrain
  const porchDeck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.26, 1.85), woodMat);
  porchDeck.position.set(0, 0.7, CABIN_HALF_D + 0.92);
  const porchFoundation = new THREE.Mesh(new THREE.BoxGeometry(4.7, 1.35, 1.8), stoneMat);
  porchFoundation.position.set(0, -0.05, CABIN_HALF_D + 0.92);
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.26, 0.68), woodMat);
  step1.position.set(0, 0.46, CABIN_HALF_D + 1.9);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.5, 0.68), stoneMat);
  step2.position.set(0, 0.16, CABIN_HALF_D + 2.52);

  const porchPostH = wallH - 0.35;
  const porchPostL = new THREE.Mesh(new THREE.BoxGeometry(0.24, porchPostH, 0.24), darkWoodMat);
  porchPostL.position.set(-1.95, 0.8 + porchPostH * 0.5, CABIN_HALF_D + 1.62);
  const porchPostR = porchPostL.clone();
  porchPostR.position.x = 1.95;

  // Corner timber columns flush from floor to exact roof base (zero gap)
  const colH = wallH + 0.14;
  for (const cx of [-CABIN_HALF_W - 0.08, CABIN_HALF_W + 0.08]) {
    for (const cz of [-CABIN_HALF_D - 0.08, CABIN_HALF_D + 0.08]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.46, colH, 0.46), darkWoodMat);
      col.position.set(cx, 0.78 + colH * 0.5, cz);
      cabin.add(col);
    }
  }
  cabin.add(foundation, porchFoundation, floorDeck, porchDeck, step1, step2, porchPostL, porchPostR);

  // 2. Hollow Walls (wide 2.7m clear double doorway on +Z front wall)
  const wallY = 0.82 + wallH * 0.5;
  const wallT = 0.36;

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, CABIN_HALF_D * 2 + 0.22), logMat);
  leftWall.position.set(-CABIN_HALF_W, wallY, 0);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, CABIN_HALF_D * 2 + 0.22), logMat);
  rightWall.position.set(CABIN_HALF_W, wallY, 0);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(CABIN_HALF_W * 2 + 0.22, wallH, wallT), logMat);
  backWall.position.set(0, wallY, -CABIN_HALF_D);

  const sideSpan = CABIN_HALF_W - 1.35;
  const frontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(sideSpan, wallH, wallT), logMat);
  frontLeftWall.position.set(-1.35 - sideSpan * 0.5, wallY, CABIN_HALF_D);
  const frontRightWall = new THREE.Mesh(new THREE.BoxGeometry(sideSpan, wallH, wallT), logMat);
  frontRightWall.position.set(1.35 + sideSpan * 0.5, wallY, CABIN_HALF_D);
  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(2.74, wallH - 2.68, wallT), logMat);
  doorHeader.position.set(0, 0.82 + 2.68 + (wallH - 2.68) * 0.5, CABIN_HALF_D);

  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.72, 0.48), darkWoodMat);
  frameL.position.set(-1.35, 0.82 + 1.36, CABIN_HALF_D);
  const frameR = frameL.clone();
  frameR.position.x = 1.35;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.18, 0.52), darkWoodMat);
  lintel.position.set(0, 0.82 + 2.72, CABIN_HALF_D);

  // Interactive symmetrical DOUBLE-LEAF Wooden Doors filling full 2.7m doorway cleanly
  const doorPivotL = new THREE.Group();
  doorPivotL.position.set(-1.3, 0.82, CABIN_HALF_D + 0.12);
  const doorLeafL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.58, 0.1), doorMat);
  doorLeafL.position.set(0.65, 1.29, 0);
  const doorHandleL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), goldMat);
  doorHandleL.position.set(1.14, 1.18, 0.08);
  doorPivotL.add(doorLeafL, doorHandleL);

  const doorPivotR = new THREE.Group();
  doorPivotR.position.set(1.3, 0.82, CABIN_HALF_D + 0.12);
  const doorLeafR = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.58, 0.1), doorMat);
  doorLeafR.position.set(-0.65, 1.29, 0);
  const doorHandleR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), goldMat);
  doorHandleR.position.set(-1.14, 1.18, 0.08);
  doorPivotR.add(doorLeafR, doorHandleR);

  // Front & side windows with styled shutters & flower boxes
  const winL = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.0, 0.42), glowWinMat);
  winL.position.set(-2.62, 2.55, CABIN_HALF_D);
  const winR = winL.clone();
  winR.position.x = 2.62;
  const winSide = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.0, 1.25), glowWinMat);
  winSide.position.set(CABIN_HALF_W, 2.55, 0.4);
  const winSideL = winSide.clone();
  winSideL.position.x = -CABIN_HALF_W;

  for (const wx of [-2.62, 2.62]) {
    const shL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.08, 0.12), shutterMat);
    shL.position.set(wx - 0.62, 2.55, CABIN_HALF_D + 0.22);
    const shR = shL.clone();
    shR.position.x = wx + 0.62;
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.24, 0.34), darkWoodMat);
    box.position.set(wx, 1.92, CABIN_HALF_D + 0.3);
    const bush = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.2, 0.26), greeneryMat);
    bush.position.set(wx, 2.08, CABIN_HALF_D + 0.3);
    cabin.add(shL, shR, box, bush);
    for (let f = -1; f <= 1; f++) {
      const fl = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.11, 0),
        f === 0 ? flowerGoldMat : flowerPinkMat,
      );
      fl.position.set(wx + f * 0.32, 2.2, CABIN_HALF_D + 0.32);
      cabin.add(fl);
    }
  }

  const porchLantern = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.26), glowWinMat);
  porchLantern.position.set(1.55, 3.08, CABIN_HALF_D + 0.38);
  cabin.add(porchLantern);

  if (style === 'shop' || style === 'bakery' || style === 'alchemy' || style === 'tavern' || style === 'townhall') {
    const signTex =
      style === 'bakery'
        ? textures.bakerySign
        : style === 'alchemy'
          ? textures.alchemySign
          : style === 'tavern'
            ? textures.tavernSign
            : style === 'townhall'
              ? textures.townhallSign
              : textures.shopSign;
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 1.02, 0.14),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }),
    );
    signBoard.position.set(0, isTall ? 4.55 : 4.18, CABIN_HALF_D + 1.65);
    const lanternL = porchLantern.clone();
    lanternL.position.set(-1.55, 3.08, CABIN_HALF_D + 0.38);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.72, 10), darkWoodMat);
    barrel.position.set(-2.15, 1.18, CABIN_HALF_D + 0.75);
    const barrelGold = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10), goldMat);
    barrelGold.position.set(-2.15, 1.56, CABIN_HALF_D + 0.75);
    cabin.add(signBoard, lanternL, barrel, barrelGold);
  } else if (style === 'watchtower') {
    const forgeBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.92, 0.14),
      new THREE.MeshStandardMaterial({ map: textures.forgeSign, roughness: 0.6 }),
    );
    forgeBoard.position.set(0, 4.55, CABIN_HALF_D + 1.65);
    const anvilOut = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.95), ironMat);
    anvilOut.position.set(2.15, 1.06, CABIN_HALF_D + 0.72);
    cabin.add(forgeBoard, anvilOut);
  } else if (style === 'cottage') {
    const herbBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.92, 0.14),
      new THREE.MeshStandardMaterial({ map: textures.herbalSign, roughness: 0.6 }),
    );
    herbBoard.position.set(0, 4.18, CABIN_HALF_D + 1.65);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.32, 0.65, 8), darkWoodMat);
    barrel.position.set(2.2, 1.14, CABIN_HALF_D + 0.7);
    const bushTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), greeneryMat);
    bushTop.position.set(2.2, 1.62, CABIN_HALF_D + 0.7);
    cabin.add(herbBoard, barrel, bushTop);
  }

  cabin.add(
    leftWall,
    rightWall,
    backWall,
    frontLeftWall,
    frontRightWall,
    doorHeader,
    frameL,
    frameR,
    lintel,
    doorPivotL,
    doorPivotR,
    winL,
    winR,
    winSide,
    winSideL,
  );

  // 3. Cozy Walkable Interior (at y = 0.82)
  const rug = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.04, 2.7), rugMat);
  rug.position.set(0, 0.84, 0.35);
  const rugTrim = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.045, 2.3), rugTrimMat);
  rugTrim.position.set(0, 0.845, 0.35);

  const hearthFlame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.58, 6), emberMat);
  const hearthLight = new THREE.PointLight(0xffa94d, 5.2, 14, 1.5);

  if (style === 'shop' || style === 'bakery' || style === 'alchemy') {
    // Merchant Interior: Oak Counter, Shelves, Trade Crates & Custom Style Props
    const counterBase = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.94, 0.96), darkWoodMat);
    counterBase.position.set(0.15, 1.29, -1.1);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.14, 1.12), woodMat);
    counterTop.position.set(0.15, 1.82, -1.1);

    const coinStack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.24, 10), goldMat);
    coinStack.position.set(-0.6, 2.0, -0.95);
    const displayPropColor = style === 'alchemy' ? 0xc084fc : style === 'bakery' ? 0xf59e0b : 0x38bdf8;
    const displayGem = new THREE.Mesh(
      style === 'bakery' ? new THREE.BoxGeometry(0.45, 0.22, 0.26) : new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({
        color: displayPropColor,
        emissive: style === 'bakery' ? 0x78350f : displayPropColor,
        emissiveIntensity: style === 'bakery' ? 0.35 : 1.4,
      }),
    );
    displayGem.position.set(0.95, 2.06, -0.98);
    const potionDisplay = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.34, 8),
      new THREE.MeshStandardMaterial({
        color: style === 'bakery' ? 0xfde047 : 0x4ade80,
        emissive: style === 'bakery' ? 0xb45309 : 0x16a34a,
        emissiveIntensity: 0.9,
      }),
    );
    potionDisplay.position.set(0.15, 2.05, -0.92);

    hearthFlame.position.set(-1.35, 2.15, -0.98);
    hearthLight.position.set(0, 3.1, -0.4);

    // Display shelves along left wall (matches collider [-3.5, -2.15, -2.8, 0.45])
    const shopShelf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.35, 3.0), darkWoodMat);
    shopShelf.position.set(-2.85, 2.0, -1.18);
    const bottleColors =
      style === 'bakery'
        ? [0xfbbf24, 0xd97706, 0xfef08a, 0xb45309]
        : style === 'alchemy'
          ? [0xc084fc, 0x2dd4bf, 0xf43f5e, 0x38bdf8]
          : [0xef4444, 0x38bdf8, 0x22c55e, 0xf59e0b];
    for (let s = 0; s < 4; s++) {
      const flask = new THREE.Mesh(
        style === 'bakery' ? new THREE.BoxGeometry(0.26, 0.18, 0.32) : new THREE.CylinderGeometry(0.11, 0.14, 0.36, 8),
        new THREE.MeshStandardMaterial({
          color: bottleColors[s],
          emissive: bottleColors[s],
          emissiveIntensity: style === 'bakery' ? 0.18 : 0.65,
        }),
      );
      flask.position.set(-2.55, 2.1, -2.2 + s * 0.68);
      cabin.add(flask);
    }

    // Trade crates on front-right (matches collider [2.25, 3.55, 0.5, 2.25])
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.92, 1.1), woodMat);
    crate1.position.set(2.85, 1.28, 1.35);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.72, 0.78), darkWoodMat);
    crate2.position.set(2.9, 2.1, 1.28);

    cabin.add(
      counterBase,
      counterTop,
      coinStack,
      displayGem,
      potionDisplay,
      shopShelf,
      crate1,
      crate2,
    );
  } else {
    // Stone Fireplace against back wall with glowing flame
    const hearthBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.1, 0.9), stoneMat);
    hearthBase.position.set(0, 1.85, -CABIN_HALF_D + 0.5);
    const mantel = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.16, 1.05), darkWoodMat);
    mantel.position.set(0, 2.85, -CABIN_HALF_D + 0.55);
    const emberBed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.45), emberMat);
    emberBed.position.set(0, 1.02, -CABIN_HALF_D + 0.65);
    hearthFlame.position.set(0, 1.38, -CABIN_HALF_D + 0.65);
    hearthLight.position.set(0, 2.15, -CABIN_HALF_D + 1.35);

    // Crafting Workbench on left wall (matches collider [-3.5, -1.9, -1.6, 0.3])
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 1.7), woodMat);
    benchTop.position.set(-2.7, 1.68, -0.65);
    const benchBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.82, 1.5), darkWoodMat);
    benchBase.position.set(-2.7, 1.23, -0.65);
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.54), ironMat);
    anvil.position.set(-2.65, 1.88, -0.25);
    const benchLantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), glowWinMat);
    benchLantern.position.set(-2.85, 1.9, -1.2);

    // Bookshelf against back-left wall (matches collider [-3.5, -1.8, -3.0, -2.0])
    const shelfFrame = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.2, 0.65), darkWoodMat);
    shelfFrame.position.set(-2.65, 1.92, -2.55);
    const bookColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xa855f7];
    for (let row = 0; row < 2; row++) {
      for (let b = 0; b < 5; b++) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.42, 0.34),
          new THREE.MeshStandardMaterial({ color: bookColors[(b + row) % bookColors.length], roughness: 0.7 }),
        );
        book.position.set(-3.08 + b * 0.22, 1.48 + row * 0.72, -2.42);
        book.userData.noCastShadow = true;
        cabin.add(book);
      }
    }

    // Interactive Bed on back-right (matches collider [1.5, 3.6, -2.9, -1.4])
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.44, 1.25), darkWoodMat);
    bedFrame.position.set(2.55, 1.04, -2.15);
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.15, 1.3), darkWoodMat);
    headboard.position.set(3.45, 1.4, -2.15);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 1.12), bedMat);
    mattress.position.set(2.55, 1.33, -2.15);
    const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.24, 1.14), quiltMat);
    quilt.position.set(2.26, 1.35, -2.15);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.82), pillowMat);
    pillow.position.set(3.15, 1.48, -2.15);

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.1, 10), woodMat);
    tableTop.position.set(2.45, 1.58, 1.1);
    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.74, 8), darkWoodMat);
    tableLeg.position.set(2.45, 1.19, 1.1);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 8), pillowMat);
    mug.position.set(2.35, 1.71, 1.05);
    mug.userData.noCastShadow = true;
    const tableLantern = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), glowWinMat);
    tableLantern.position.set(2.6, 1.75, 1.22);
    tableLantern.userData.noCastShadow = true;

    cabin.add(
      hearthBase,
      mantel,
      emberBed,
      benchTop,
      benchBase,
      anvil,
      benchLantern,
      shelfFrame,
      bedFrame,
      headboard,
      mattress,
      quilt,
      pillow,
      tableTop,
      tableLeg,
      mug,
      tableLantern,
    );
  }

  // Interactive Indoor Supply Chest (matches collider [-3.5, -2.1, 1.35, 2.55])
  const chestGroup = new THREE.Group();
  chestGroup.position.set(-2.75, 0.82, 1.95);
  chestGroup.rotation.y = Math.PI * 0.5;
  const chestBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.58, 0.78), woodMat);
  chestBase.position.y = 0.29;
  const chestBand = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.1, 0.82), goldMat);
  chestBand.position.y = 0.54;
  chestBand.userData.noCastShadow = true;
  const indoorChestLid = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.24, 0.8), darkWoodMat);
  indoorChestLid.position.y = 0.7;
  const chestLock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.08), goldMat);
  chestLock.position.set(0, 0.54, 0.42);
  chestLock.userData.noCastShadow = true;
  chestGroup.add(chestBase, chestBand, indoorChestLid, chestLock);

  // Hearth light position stored on hearthLight (NOT added directly to scene to avoid 14+ active PointLights!)
  cabin.add(rug, rugTrim, hearthFlame, chestGroup);

  // 4. Cutaway Roof Group — FIXED slope angles (negative X on back -Z slope, positive X on front +Z slope) so roofs pitch properly outward!
  const roofBaseY = isTall ? 4.82 : 4.32;
  const peakHeight = isTall ? 2.65 : 2.25;
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-3.25, 0);
  gableShape.lineTo(3.25, 0);
  gableShape.lineTo(0, peakHeight);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 7.82, bevelEnabled: false });
  gableGeo.rotateY(Math.PI * 0.5);
  gableGeo.translate(-3.91, roofBaseY, 0);
  const gableMesh = new THREE.Mesh(gableGeo, logMat);

  const pitchAngle = Math.atan2(peakHeight, 3.25);

  if (style === 'watchtower' || style === 'townhall') {
    const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.24, 5.1), roofMat);
    roofSlopeL.position.set(0, roofBaseY + 1.05, -1.68);
    roofSlopeL.rotation.x = -pitchAngle;
    const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.24, 5.1), roofMat);
    roofSlopeR.position.set(0, roofBaseY + 1.05, 1.68);
    roofSlopeR.rotation.x = pitchAngle;
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.28, 0.38), roofMat);
    ridge.position.set(0, roofBaseY + peakHeight - 0.05, 0);
    const towerCap = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.8, 2.1), stoneMat);
    towerCap.position.set(0, roofBaseY + 3.2, -1.2);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.55, 2.3, 4), roofMat);
    spire.rotation.y = Math.PI * 0.25;
    spire.position.set(0, roofBaseY + 5.1, -1.2);
    const porchAwning = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.16, 2.0), roofMat);
    porchAwning.position.set(0, 4.18, CABIN_HALF_D + 0.92);
    porchAwning.rotation.x = 0.2;
    roofGroup.add(roofSlopeL, roofSlopeR, porchAwning, ridge, gableMesh, towerCap, spire);
  } else {
    const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.24, 4.8), roofMat);
    roofSlopeL.position.set(0, roofBaseY + 0.88, -1.68);
    roofSlopeL.rotation.x = -pitchAngle;
    const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.24, 4.8), roofMat);
    roofSlopeR.position.set(0, roofBaseY + 0.88, 1.68);
    roofSlopeR.rotation.x = pitchAngle;
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.28, 0.38), roofMat);
    ridge.position.set(0, roofBaseY + peakHeight - 0.06, 0);
    const porchAwning = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 2.0), roofMat);
    porchAwning.position.set(0, 3.82, CABIN_HALF_D + 0.92);
    porchAwning.rotation.x = 0.2;
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.08, 3.3, 1.08), stoneMat);
    chimney.position.set(style === 'cottage' || style === 'bakery' ? -1.8 : 0, 5.95, -2.55);
    roofGroup.add(roofSlopeL, roofSlopeR, porchAwning, ridge, gableMesh, chimney);

    if (style === 'shop' || style === 'bakery') {
      const creamStripeMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
      const stripeAccentMat = new THREE.MeshStandardMaterial({
        color: style === 'bakery' ? 0xd97706 : 0xdc2626,
        roughness: 0.72,
      });
      for (let s = -2; s <= 2; s++) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.74, 0.19, 2.04),
          s % 2 === 0 ? stripeAccentMat : creamStripeMat,
        );
        stripe.position.set(s * 0.92, 3.84, CABIN_HALF_D + 0.92);
        stripe.rotation.x = 0.2;
        stripe.userData.noCastShadow = true;
        roofGroup.add(stripe);
      }
    }
  }

  cabin.add(roofGroup);

  cabin.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = !obj.userData.noCastShadow;
      obj.receiveShadow = true;
    }
  });

  return { group: cabin, roofGroup, doorPivotL, doorPivotR, hearthLight, hearthFlame, indoorChestLid };
}

export function buildVillageWell(textures: ProceduralTextures): THREE.Group {
  const well = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.plazaCobble, roughness: 0.88 });
  const oakMat = new THREE.MeshStandardMaterial({ map: textures.cabinLog, roughness: 0.84 });
  const roofMat = new THREE.MeshStandardMaterial({ map: textures.roofShingle, roughness: 0.72 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.35,
    roughness: 0.15,
  });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
  });

  // Stone base pad + circular curb wall + shimmering water pool inside
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.45, 0.24, 12), stoneMat);
  pad.position.y = 0.12;
  const curb = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.52, 1.05, 12, 1, true), stoneMat);
  curb.position.y = 0.74;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.2, 6, 12), stoneMat);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = 1.24;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.25, 12), waterMat);
  pool.rotation.x = -Math.PI * 0.5;
  pool.position.y = 0.92;

  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.35, 0.22), oakMat);
  postL.position.set(-1.35, 2.35, 0);
  const postR = postL.clone();
  postR.position.x = 1.35;
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.9, 8), oakMat);
  axle.rotation.z = Math.PI * 0.5;
  axle.position.y = 2.68;
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.34, 8), oakMat);
  bucket.position.set(0, 1.95, 0);

  const roofL = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 1.85), roofMat);
  roofL.position.set(0, 3.62, -0.78);
  roofL.rotation.x = -0.58;
  const roofR = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 1.85), roofMat);
  roofR.position.set(0, 3.62, 0.78);
  roofR.rotation.x = 0.58;
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), lanternMat);
  lantern.position.set(1.52, 3.1, 0);

  well.add(pad, curb, rim, pool, postL, postR, axle, bucket, roofL, roofR, lantern);
  well.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return well;
}

export interface CaveVisual {
  group: THREE.Group;
  torchLights: THREE.PointLight[];
  torchFlames: THREE.Mesh[];
  crystalMeshes: THREE.Mesh[];
}

// Descending subterranean Minecraft mineshaft & cavern going straight DOWN into the earth beneath a grassy rocky hill
export function buildCaveStructure(textures: ProceduralTextures, site: CaveSite): CaveVisual {
  const group = new THREE.Group();
  const torchLights: THREE.PointLight[] = [];
  const torchFlames: THREE.Mesh[] = [];
  const crystalMeshes: THREE.Mesh[] = [];

  const cobbleMat = new THREE.MeshStandardMaterial({ map: textures.minecraftCobble, roughness: 0.94 });
  const deepMat = new THREE.MeshStandardMaterial({ map: textures.minecraftDeepslate, roughness: 0.92 });
  const oreMat = new THREE.MeshStandardMaterial({ map: textures.minecraftOre, roughness: 0.85, metalness: 0.18 });
  const graniteMat = new THREE.MeshStandardMaterial({ map: textures.caveRock, roughness: 0.95 });
  const turfCapMat = new THREE.MeshStandardMaterial({
    map: textures.grassTile,
    color: 0x5c8b38,
    roughness: 0.94,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: site.crystalColor,
    emissive: site.crystalColor,
    emissiveIntensity: 1.65,
    roughness: 0.18,
    metalness: 0.25,
  });
  const timberMat = new THREE.MeshStandardMaterial({ map: textures.cabinLog, roughness: 0.88 });
  const torchWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.86 });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf97316,
    emissiveIntensity: 2.35,
    roughness: 0.2,
  });

  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  const cobbleMatrices: THREE.Matrix4[] = [];
  const deepMatrices: THREE.Matrix4[] = [];
  const oreMatrices: THREE.Matrix4[] = [];
  const earthCapMatrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();

  const pushBlock = (
    x: number,
    y: number,
    z: number,
    kind: 'cobble' | 'deep' | 'ore' | 'turf',
    sx = 1,
    sy = 1,
    sz = 1,
  ) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    if (kind === 'ore') oreMatrices.push(dummy.matrix.clone());
    else if (kind === 'deep') deepMatrices.push(dummy.matrix.clone());
    else if (kind === 'turf') earthCapMatrices.push(dummy.matrix.clone());
    else cobbleMatrices.push(dummy.matrix.clone());
  };

  // Relative to underground site.floorY (-1.15..-0.95): outside meadow is at mouthOffsetY (~3.45m)
  const mouthOffsetY = 2.35 - site.floorY;
  const rampY = (z: number) => Math.max(0, Math.min(1, z / 8.5)) * mouthOffsetY;

  // 1. Descending Stairway Corridor & Deep Subterranean Chamber (X:[-5..5], Z:[-10..8])
  for (let z = -10; z <= 8; z++) {
    const ry = rampY(z);
    for (let x = -5; x <= 5; x++) {
      // Staircase/Chamber Floor directly beneath walkable ramp surface (extra deep base to seal ground seam)
      if (Math.abs(x) <= 4) {
        const stairBlockTop = Math.round(ry * 2) / 2;
        pushBlock(x, stairBlockTop - 0.52, z, z > 0 ? 'cobble' : (x + z) % 3 === 0 ? 'deep' : 'cobble');
      }

      if (z === -10) {
        // Deep underground back wall
        for (let y = 0; y <= 6; y++) {
          const isOre = y >= 1 && y <= 4 && Math.abs(x) >= 1 && Math.abs(x * 7 + y * 3) % 5 === 0;
          pushBlock(x, y + 0.5, z, isOre ? 'ore' : y >= 2 ? 'deep' : 'cobble');
        }
      } else if (z <= 5) {
        // Flanking tunnel & descending stairway stone walls (X = -5, -4 and +4, +5)
        if (Math.abs(x) >= 4) {
          const wallTop = Math.max(5, Math.ceil(ry) + 3);
          for (let y = 0; y <= wallTop; y++) {
            const isOre = Math.abs(x) === 4 && y >= 1 && y <= 4 && Math.abs((z + y * 2) % 6) === 1;
            pushBlock(x, y + 0.5, z, isOre ? 'ore' : y >= 2 || z < -2 ? 'deep' : 'cobble');
          }
        }
        // Earth-buried cavern ceiling arching smoothly UP from z=5 portal (y=7.5) & tapering back into hill
        if (z <= 5 && Math.abs(x) <= 4) {
          const ceilY = z >= 3 ? 7.5 : z >= 1 ? 6.5 : 5.5;
          pushBlock(x, ceilY, z, z < -2 ? 'deep' : 'cobble');
        }
        if (z <= 4 && Math.abs(x) <= 3) {
          const outerTopY = z >= 2 ? 8.5 : 7.5;
          pushBlock(x, outerTopY, z, z >= 1 ? 'turf' : 'deep', 1.04, 1.0, 1.04);
        }
      } else {
        // Flanking retaining wing-walls framing the descending outdoor trench (z = 6..8)
        if (Math.abs(x) >= 4) {
          const wallTop = Math.ceil(ry) + 2;
          for (let y = 0; y <= wallTop; y++) {
            pushBlock(x, y + 0.5, z, y === wallTop ? 'turf' : 'cobble');
          }
        }
      }
    }
  }

  // Sculpted natural hillside boulder & grass arch mound covering tunnel shoulders smoothly into terrain
  const hillShoulder = new THREE.Mesh(new THREE.BoxGeometry(13.2, 2.2, 16.5), graniteMat);
  hillShoulder.position.set(0, mouthOffsetY + 3.9, -3.2);
  const hillCrownTurf = new THREE.Mesh(new THREE.BoxGeometry(12.2, 1.0, 14.5), turfCapMat);
  hillCrownTurf.position.set(0, mouthOffsetY + 5.2, -3.8);
  group.add(hillShoulder, hillCrownTurf);

  const addInstanced = (mats: THREE.Matrix4[], mat: THREE.Material) => {
    if (mats.length === 0) return;
    const inst = new THREE.InstancedMesh(blockGeo, mat, mats.length);
    for (let i = 0; i < mats.length; i++) inst.setMatrixAt(i, mats[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.receiveShadow = true;
    inst.castShadow = true;
    group.add(inst);
  };
  addInstanced(cobbleMatrices, cobbleMat);
  addInstanced(deepMatrices, deepMat);
  addInstanced(oreMatrices, oreMat);
  addInstanced(earthCapMatrices, turfCapMat);

  // Minecraft Mineshaft Timber Support Arches along the descent & deep cavern
  for (const bz of [5.1, 2.0, -1.5, -5.2, -8.5]) {
    const floorAtZ = rampY(bz);
    const beamY = bz >= 2 ? 6.6 : 4.65;
    const postH = beamY - floorAtZ;
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.42, postH, 0.42), timberMat);
    postL.position.set(-3.35, floorAtZ + postH * 0.5, bz);
    const postR = postL.clone();
    postR.position.x = 3.35;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.44, 0.44), timberMat);
    beam.position.set(0, beamY, bz);
    group.add(postL, postR, beam);
  }

  // Glowing crystal & ore clusters anchored to actual stairway / deep cavern elevation
  const crystalSpots: [number, number, number][] = [
    [-3.1, 6.2, 0.9],
    [3.1, 6.2, 0.9],
    [-2.9, -4.8, 1.15],
    [2.9, -4.5, 1.15],
    [-2.7, -8.3, 1.35],
    [2.7, -8.1, 1.2],
  ];
  for (const [cx, cz, cs] of crystalSpots) {
    const cy = rampY(cz);
    const cBlock = new THREE.Mesh(new THREE.BoxGeometry(0.56 * cs, 1.15 * cs, 0.56 * cs), crystalMat);
    cBlock.position.set(cx, cy + 0.55 * cs, cz);
    const cTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.32 * cs, 0), crystalMat);
    cTip.position.set(cx, cy + 1.25 * cs, cz);
    group.add(cBlock, cTip);
    crystalMeshes.push(cTip);
  }

  // Minecraft Wall Torches lighting the descent & subterranean vault (using pooled world lights cleanly)
  const torchPositions: [number, number, number][] = [
    [-3.3, 5.2, 0.34],
    [3.3, 2.0, -0.34],
    [-3.3, -2.5, 0.34],
    [3.3, -6.8, -0.34],
  ];
  for (const [tx, tz, tiltZ] of torchPositions) {
    const ty = rampY(tz) + 2.35;
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), torchWoodMat);
    stick.position.set(tx, ty, tz);
    stick.rotation.z = tiltZ;
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), flameMat);
    flame.position.set(tx - Math.sign(tiltZ) * 0.12, ty + 0.44, tz);
    group.add(stick, flame);
    torchFlames.push(flame);
  }

  return { group, torchLights, torchFlames, crystalMeshes };
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

  return { group, flame, light };
}

export function buildCoinModel(scale = 1): THREE.Group {
  const g = new THREE.Group();

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    metalness: 0.88,
    roughness: 0.18,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.92,
    roughness: 0.25,
  });
  const emblemMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.65,
    metalness: 0.78,
    roughness: 0.2,
  });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), goldMat);
  disc.rotation.x = Math.PI * 0.5;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.036, 8, 18), rimMat);
  const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.11), emblemMat);

  g.add(disc, rim, emblem);
  g.scale.setScalar(scale);
  return g;
}

export function buildSignpost(textures: ProceduralTextures): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.85 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.88 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
  });

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.35, 0.24), darkWoodMat);
  post.position.y = 1.175;
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 0.08), woodMat);
  arm1.position.set(0.38, 1.92, 0);
  const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.22, 0.08), woodMat);
  arm2.position.set(-0.34, 1.56, 0.04);
  arm2.rotation.y = 0.4;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), darkWoodMat);
  cap.position.y = 2.4;
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), lanternMat);
  lantern.position.set(0.84, 1.68, 0);
  g.add(post, arm1, arm2, cap, lantern);
  g.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true;
  });
  return g;
}
