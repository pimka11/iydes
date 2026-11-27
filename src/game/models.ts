import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ProceduralTextures } from './textures';
import {
  BRIDGE_HALF_LENGTH,
  BRIDGE_HALF_WIDTH,
  BRIDGE_Z,
  bridgeSurfaceAt,
  CABIN_HALF_D,
  CABIN_HALF_W,
  CabinStyle,
  CAVE_CHAMBER_Z,
  CAVE_END_Z,
  CAVE_MOUTH_Z,
  CAVE_PORTAL_Z,
  caveCeilingClearanceAt,
  caveFloorYAt,
  caveHalfWidthAt,
  cavePathCenterX,
  CaveSite,
  DungeonSite,
  getCabinDims,
  isTwoStoryCabin,
  riverCenterX,
} from './terrain';
import { BuildPieceKind, MobKind, PeacefulMobKind, ResourceId, WeaponId } from './types';

class StaticBoxBatcher {
  private byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rx !== 0) g.rotateX(rx);
    if (ry !== 0) g.rotateY(ry);
    if (rz !== 0) g.rotateZ(rz);
    g.translate(x, y, z);
    let arr = this.byMat.get(mat);
    if (!arr) {
      arr = [];
      this.byMat.set(mat, arr);
    }
    arr.push(g);
  }

  flushInto(target: THREE.Group, noCastShadow = false) {
    for (const [mat, geos] of this.byMat.entries()) {
      if (geos.length === 0) continue;
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (geos.length > 1) geos.forEach((g) => g.dispose());
      if (merged) {
        const m = new THREE.Mesh(merged, mat);
        if (noCastShadow) m.userData.noCastShadow = true;
        target.add(m);
      }
    }
    this.byMat.clear();
  }
}

export const HIT_FLASH_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 0.78,
  roughness: 0.3,
});

const _boxGeoCache = new Map<string, THREE.BoxGeometry>();
const _cylGeoCache = new THREE.CylinderGeometry ? new Map<string, THREE.CylinderGeometry>() : new Map<string, THREE.CylinderGeometry>();
const _sphereGeoCache = new Map<string, THREE.SphereGeometry>();
const _coneGeoCache = new Map<string, THREE.ConeGeometry>();

function cachedBox(w: number, h: number, d: number): THREE.BoxGeometry {
  const k = `${w}_${h}_${d}`;
  let g = _boxGeoCache.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    _boxGeoCache.set(k, g);
  }
  return g;
}

function cachedCyl(rt: number, rb: number, h: number, seg = 10): THREE.CylinderGeometry {
  const k = `${rt}_${rb}_${h}_${seg}`;
  let g = _cylGeoCache.get(k);
  if (!g) {
    g = new THREE.CylinderGeometry(rt, rb, h, seg);
    _cylGeoCache.set(k, g);
  }
  return g;
}

function cachedSphere(r: number, ws = 12, hs = 10): THREE.SphereGeometry {
  const k = `${r}_${ws}_${hs}`;
  let g = _sphereGeoCache.get(k);
  if (!g) {
    g = new THREE.SphereGeometry(r, ws, hs);
    _sphereGeoCache.set(k, g);
  }
  return g;
}

function cachedCone(r: number, h: number, seg = 10): THREE.ConeGeometry {
  const k = `${r}_${h}_${seg}`;
  let g = _coneGeoCache.get(k);
  if (!g) {
    g = new THREE.ConeGeometry(r, h, seg);
    _coneGeoCache.set(k, g);
  }
  return g;
}

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
  weapons: Partial<Record<WeaponId, THREE.Group>>;
}

export function ensurePlayerWeaponMesh(rig: PlayerRig, id: WeaponId): THREE.Group {
  let mesh = rig.weapons[id];
  if (!mesh) {
    mesh = buildWeaponModel(id);
    mesh.visible = false;
    rig.weaponSocket.add(mesh);
    rig.weapons[id] = mesh;
  }
  return mesh;
}

export function buildShieldModel(textures: ProceduralTextures): {
  shieldGroup: THREE.Group;
  shieldAegisTrim: THREE.Group;
} {
  const shieldGroup = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.78, metalness: 0.05 });
  const crestMat = new THREE.MeshStandardMaterial({ map: textures.shieldEmblem, roughness: 0.42, metalness: 0.25 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.24 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.22 });
  const aegisGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.45,
    metalness: 0.5,
    roughness: 0.18,
  });

  const body = new THREE.Mesh(cachedBox(0.12, 0.98, 0.78), crestMat);
  const backWood = new THREE.Mesh(cachedBox(0.08, 0.9, 0.7), woodMat);
  backWood.position.set(0.04, 0, 0);
  const rimT = new THREE.Mesh(cachedBox(0.15, 0.09, 0.84), steelMat);
  rimT.position.set(-0.01, 0.49, 0);
  const rimB = rimT.clone();
  rimB.position.y = -0.49;
  const rimL = new THREE.Mesh(cachedBox(0.15, 0.98, 0.09), steelMat);
  rimL.position.set(-0.01, 0, -0.39);
  const rimR = rimL.clone();
  rimR.position.z = 0.39;
  const boss = new THREE.Mesh(cachedBox(0.16, 0.24, 0.24), goldMat);
  boss.position.set(-0.04, 0.04, 0);

  const shieldAegisTrim = new THREE.Group();
  shieldAegisTrim.visible = false;
  const wingL = new THREE.Mesh(cachedBox(0.08, 0.44, 0.14), goldMat);
  wingL.position.set(-0.04, 0.18, -0.44);
  wingL.rotation.x = 0.28;
  const wingR = wingL.clone();
  wingR.position.z = 0.44;
  wingR.rotation.x = -0.28;
  const crown = new THREE.Mesh(cachedBox(0.12, 0.18, 0.26), goldMat);
  crown.position.set(-0.04, 0.58, 0);
  const gem = new THREE.Mesh(cachedBox(0.1, 0.16, 0.16), aegisGlowMat);
  gem.position.set(-0.1, 0.04, 0);
  shieldAegisTrim.add(wingL, wingR, crown, gem);

  shieldGroup.add(body, backWood, rimT, rimB, rimL, rimR, boss, shieldAegisTrim);
  shieldGroup.position.set(-0.24, -0.42, 0.08);
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
  } else if (id === 'bow') {
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
  } else if (id === 'axe') {
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.78, metalness: 0.05 });
    const wrapMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.88 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, metalness: 0.92, roughness: 0.18 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.28 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.24 });

    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.058, 1.38, 10), ashMat);
    haft.position.y = 0.56;
    const gripWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.059, 0.064, 0.36, 10), wrapMat);
    gripWrap.position.y = 0.12;
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.1, 8), brassMat);
    pommel.position.y = -0.14;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.066, 0.16, 8), brassMat);
    collar.position.y = 1.12;

    const poll = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.24), darkSteelMat);
    poll.position.set(0, 1.24, -0.06);
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.36, 0.34), darkSteelMat);
    cheek.position.set(0, 1.24, 0.18);
    const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.46, 0.22), steelMat);
    bladeEdge.position.set(0, 1.24, 0.38);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 4), brassMat);
    spike.rotation.x = -Math.PI * 0.5;
    spike.position.set(0, 1.24, -0.24);

    g.add(haft, gripWrap, pommel, collar, poll, cheek, bladeEdge, spike);
    g.rotation.x = Math.PI * 0.4;
  } else if (id === 'pickaxe') {
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78, metalness: 0.05 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.88 });
    const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.88, roughness: 0.28 });
    const steelEdgeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.16 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.24 });

    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.056, 1.4, 10), ashMat);
    haft.position.y = 0.56;
    const gripWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.062, 0.36, 10), gripMat);
    gripWrap.position.y = 0.12;
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.052, 0.1, 8), brassMat);
    pommel.position.y = -0.14;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.068, 0.16, 8), brassMat);
    collar.position.y = 1.12;

    const headEye = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.24), darkIronMat);
    headEye.position.set(0, 1.24, 0);

    // Front pointed mining spike
    const frontArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.34), darkIronMat);
    frontArm.position.set(0, 1.23, 0.24);
    frontArm.rotation.x = 0.14;
    const frontSpike = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.34, 4), steelEdgeMat);
    frontSpike.rotation.x = Math.PI * 0.5 + 0.2;
    frontSpike.rotation.y = Math.PI * 0.25;
    frontSpike.position.set(0, 1.18, 0.52);

    // Rear chisel tip
    const rearArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.28), darkIronMat);
    rearArm.position.set(0, 1.23, -0.22);
    rearArm.rotation.x = -0.14;
    const rearTip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.26, 4), steelEdgeMat);
    rearTip.rotation.x = -Math.PI * 0.5 - 0.18;
    rearTip.rotation.y = Math.PI * 0.25;
    rearTip.position.set(0, 1.19, -0.44);

    g.add(haft, gripWrap, pommel, collar, headEye, frontArm, frontSpike, rearArm, rearTip);
    g.rotation.x = Math.PI * 0.4;
  } else if (id === 'builder') {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.72, metalness: 0.06 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.22 });
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.72, roughness: 0.3 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x16a34a,
      emissiveIntensity: 1.5,
      roughness: 0.16,
      metalness: 0.35,
    });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.056, 1.12, 10), woodMat);
    handle.position.y = 0.45;
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.068, 0.14, 10), brassMat);
    ferrule.position.y = 0.94;
    const malletHead = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.52, 12), slateMat);
    malletHead.rotation.x = Math.PI * 0.5;
    malletHead.position.y = 1.1;
    const capA = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.08, 12), brassMat);
    capA.rotation.x = Math.PI * 0.5;
    capA.position.set(0, 1.1, 0.25);
    const capB = capA.clone();
    capB.position.z = -0.25;
    const blueprintGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), crystalMat);
    blueprintGem.position.set(0, 1.36, 0);

    g.add(handle, ferrule, malletHead, capA, capB, blueprintGem);
    g.rotation.x = Math.PI * 0.38;
  } else if (
    id === 'katana' ||
    id === 'greatsword' ||
    id === 'dagger' ||
    id === 'scimitar' ||
    id === 'rapier' ||
    id === 'shadow_blade' ||
    id === 'fire_sword' ||
    id === 'frost_blade'
  ) {
    const bladeHex =
      id === 'katana'
        ? 0xf5d0fe
        : id === 'shadow_blade'
          ? 0x3b0764
          : id === 'fire_sword'
            ? 0xfca5a5
            : id === 'frost_blade'
              ? 0xe0f2fe
              : id === 'scimitar'
                ? 0xfde68a
                : 0xe2e8f0;
    const glowHex =
      id === 'katana'
        ? 0xe879f9
        : id === 'shadow_blade'
          ? 0xa855f7
          : id === 'fire_sword'
            ? 0xef4444
            : id === 'frost_blade'
              ? 0x38bdf8
              : id === 'dagger'
                ? 0x34d399
                : id === 'greatsword'
                  ? 0xf97316
                  : id === 'rapier'
                    ? 0x60a5fa
                    : 0xfbbf24;
    const isGreat = id === 'greatsword' || id === 'shadow_blade';
    const isDagger = id === 'dagger';
    const len = isGreat ? 1.52 : isDagger ? 0.62 : id === 'rapier' ? 1.32 : 1.15;
    const width = isGreat ? 0.19 : isDagger ? 0.08 : id === 'rapier' ? 0.055 : 0.11;
    const bladeMat = new THREE.MeshStandardMaterial({
      color: bladeHex,
      emissive: glowHex,
      emissiveIntensity: id === 'fire_sword' || id === 'shadow_blade' || id === 'frost_blade' ? 0.85 : 0.3,
      metalness: 0.9,
      roughness: 0.18,
    });
    const guardMat = new THREE.MeshStandardMaterial({ color: glowHex, metalness: 0.85, roughness: 0.25 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x3f2412, roughness: 0.85 });

    const grip = new THREE.Mesh(cachedBox(0.08, isGreat ? 0.36 : 0.24, 0.08), gripMat);
    grip.position.y = 0.1;
    const guardW = id === 'katana' ? 0.22 : isGreat ? 0.54 : isDagger ? 0.18 : 0.34;
    const guard = new THREE.Mesh(cachedBox(guardW, 0.07, 0.12), guardMat);
    guard.position.y = 0.24;
    const blade = new THREE.Mesh(cachedBox(width, len, 0.04), bladeMat);
    blade.position.y = 0.26 + len * 0.5;
    if (id === 'katana' || id === 'scimitar') {
      blade.rotation.z = -0.06;
    }
    const tip = new THREE.Mesh(cachedCone(width * 0.65, 0.22, 4), bladeMat);
    tip.position.y = 0.26 + len + 0.1;
    tip.rotation.y = Math.PI * 0.25;
    const pommel = new THREE.Mesh(cachedSphere(0.065, 6, 6), guardMat);
    pommel.position.y = -0.04;
    g.add(grip, guard, blade, tip, pommel);
    g.rotation.x = Math.PI * 0.44;
  } else if (
    id === 'battleaxe' ||
    id === 'war_mace' ||
    id === 'flail' ||
    id === 'frost_hammer' ||
    id === 'thunder_maul'
  ) {
    const headHex =
      id === 'frost_hammer'
        ? 0x7dd3fc
        : id === 'thunder_maul'
          ? 0xfacc15
          : id === 'battleaxe'
            ? 0x94a3b8
            : 0x64748b;
    const trimHex =
      id === 'frost_hammer'
        ? 0x0ea5e9
        : id === 'thunder_maul'
          ? 0xf59e0b
          : id === 'battleaxe'
            ? 0xdc2626
            : 0xfbbf24;
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x5c361a, roughness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: headHex, metalness: 0.88, roughness: 0.24 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: trimHex,
      emissive: trimHex,
      emissiveIntensity: id === 'frost_hammer' || id === 'thunder_maul' ? 0.95 : 0.35,
      metalness: 0.7,
      roughness: 0.22,
    });
    const shaft = new THREE.Mesh(cachedCyl(0.045, 0.055, 1.38, 8), shaftMat);
    shaft.position.y = 0.56;
    g.add(shaft);
    if (id === 'battleaxe') {
      const bladeL = new THREE.Mesh(cachedBox(0.32, 0.44, 0.08), metalMat);
      bladeL.position.set(-0.2, 1.12, 0);
      const bladeR = new THREE.Mesh(cachedBox(0.32, 0.44, 0.08), metalMat);
      bladeR.position.set(0.2, 1.12, 0);
      const edgeL = new THREE.Mesh(cachedBox(0.06, 0.48, 0.09), glowMat);
      edgeL.position.set(-0.36, 1.12, 0);
      const edgeR = edgeL.clone();
      edgeR.position.x = 0.36;
      g.add(bladeL, bladeR, edgeL, edgeR);
    } else if (id === 'war_mace' || id === 'flail') {
      const orbY = id === 'flail' ? 1.38 : 1.22;
      if (id === 'flail') {
        const chain = new THREE.Mesh(cachedCyl(0.02, 0.02, 0.32, 6), metalMat);
        chain.position.set(0, 1.22, 0.1);
        chain.rotation.x = 0.35;
        g.add(chain);
      }
      const ball = new THREE.Mesh(cachedSphere(0.18, 8, 8), metalMat);
      ball.position.set(0, orbY, id === 'flail' ? 0.18 : 0);
      const spikeRing = new THREE.Mesh(cachedBox(0.46, 0.08, 0.08), glowMat);
      spikeRing.position.copy(ball.position);
      const spikeRing2 = new THREE.Mesh(cachedBox(0.08, 0.08, 0.46), glowMat);
      spikeRing2.position.copy(ball.position);
      g.add(ball, spikeRing, spikeRing2);
    } else {
      const head = new THREE.Mesh(cachedBox(0.42, 0.36, 0.66), metalMat);
      head.position.y = 1.24;
      const cap = new THREE.Mesh(cachedBox(0.46, 0.4, 0.14), glowMat);
      cap.position.set(0, 1.24, 0.34);
      const capB = cap.clone();
      capB.position.z = -0.34;
      g.add(head, cap, capB);
    }
    g.rotation.x = Math.PI * 0.4;
  } else if (id === 'spear' || id === 'halberd' || id === 'trident' || id === 'scythe') {
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x4b2e18, roughness: 0.85 });
    const tipColor = id === 'trident' ? 0x22d3ee : id === 'scythe' ? 0xc084fc : id === 'halberd' ? 0xfb923c : 0xe2e8f0;
    const tipMat = new THREE.MeshStandardMaterial({
      color: tipColor,
      emissive: id === 'trident' || id === 'scythe' ? tipColor : 0x000000,
      emissiveIntensity: 0.65,
      metalness: 0.9,
      roughness: 0.2,
    });
    const pole = new THREE.Mesh(cachedCyl(0.04, 0.045, 1.85, 8), shaftMat);
    pole.position.y = 0.72;
    g.add(pole);
    if (id === 'spear') {
      const head = new THREE.Mesh(cachedCone(0.11, 0.46, 4), tipMat);
      head.position.y = 1.82;
      g.add(head);
    } else if (id === 'halberd') {
      const spike = new THREE.Mesh(cachedCone(0.09, 0.42, 4), tipMat);
      spike.position.y = 1.8;
      const axeBlade = new THREE.Mesh(cachedBox(0.32, 0.4, 0.06), tipMat);
      axeBlade.position.set(0.18, 1.48, 0);
      g.add(spike, axeBlade);
    } else if (id === 'trident') {
      const cross = new THREE.Mesh(cachedBox(0.42, 0.08, 0.08), tipMat);
      cross.position.y = 1.62;
      const pMid = new THREE.Mesh(cachedCone(0.06, 0.44, 4), tipMat);
      pMid.position.y = 1.86;
      const pL = new THREE.Mesh(cachedCone(0.05, 0.34, 4), tipMat);
      pL.position.set(-0.18, 1.78, 0);
      const pR = pL.clone();
      pR.position.x = 0.18;
      g.add(cross, pMid, pL, pR);
    } else {
      const scytheCurve = new THREE.Mesh(cachedBox(0.72, 0.14, 0.06), tipMat);
      scytheCurve.position.set(0.32, 1.62, 0);
      scytheCurve.rotation.z = -0.32;
      const tip = new THREE.Mesh(cachedCone(0.08, 0.3, 4), tipMat);
      tip.position.set(0.68, 1.44, 0);
      tip.rotation.z = -Math.PI * 0.72;
      g.add(scytheCurve, tip);
    }
    g.rotation.x = Math.PI * 0.44;
  } else if (id === 'crossbow' || id === 'recurve_bow' || id === 'void_bow') {
    const bodyHex = id === 'void_bow' ? 0x3b0764 : id === 'recurve_bow' ? 0xd97706 : 0x78350f;
    const accentHex = id === 'void_bow' ? 0xc084fc : id === 'recurve_bow' ? 0xfde047 : 0xf59e0b;
    const woodMat = new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.75 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: id === 'void_bow' ? 1.1 : 0.45,
      metalness: 0.65,
      roughness: 0.25,
    });
    if (id === 'crossbow') {
      const stock = new THREE.Mesh(cachedBox(0.12, 0.14, 0.92), woodMat);
      stock.position.set(0, 0.16, 0.28);
      const prod = new THREE.Mesh(cachedBox(0.84, 0.08, 0.12), glowMat);
      prod.position.set(0, 0.22, 0.62);
      const bolt = new THREE.Mesh(cachedCyl(0.025, 0.025, 0.56, 6), glowMat);
      bolt.rotation.x = Math.PI * 0.5;
      bolt.position.set(0, 0.25, 0.45);
      g.add(stock, prod, bolt);
    } else {
      const limbTop = new THREE.Mesh(cachedBox(0.08, 0.64, 0.1), woodMat);
      limbTop.position.set(0, 0.42, 0.16);
      limbTop.rotation.x = -0.35;
      const limbBot = new THREE.Mesh(cachedBox(0.08, 0.64, 0.1), woodMat);
      limbBot.position.set(0, -0.34, 0.16);
      limbBot.rotation.x = 0.35;
      const grip = new THREE.Mesh(cachedBox(0.11, 0.26, 0.12), glowMat);
      grip.position.set(0, 0.04, 0.08);
      const cord = new THREE.Mesh(cachedCyl(0.012, 0.012, 1.3, 6), glowMat);
      cord.position.set(0, 0.04, 0.02);
      g.add(limbTop, limbBot, grip, cord);
    }
  } else if (id === 'plasma_rifle' || id === 'laser_pistol') {
    const isRifle = id === 'plasma_rifle';
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 });
    const glowHex = isRifle ? 0x22d3ee : 0xf43f5e;
    const glowMat = new THREE.MeshStandardMaterial({
      color: glowHex,
      emissive: glowHex,
      emissiveIntensity: 1.5,
    });
    const body = new THREE.Mesh(cachedBox(0.13, 0.2, isRifle ? 1.05 : 0.56), darkMat);
    body.position.set(0, 0.22, isRifle ? 0.36 : 0.24);
    const grip = new THREE.Mesh(cachedBox(0.11, 0.24, 0.13), darkMat);
    grip.position.set(0, 0.04, 0.08);
    const barrel = new THREE.Mesh(cachedCyl(0.04, 0.04, isRifle ? 0.78 : 0.42, 8), glowMat);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.25, isRifle ? 0.56 : 0.34);
    g.add(body, grip, barrel);
  } else if (id === 'fire_staff' || id === 'frost_staff' || id === 'void_orb') {
    const orbHex = id === 'fire_staff' ? 0xf97316 : id === 'frost_staff' ? 0x38bdf8 : 0xa855f7;
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x3f2412, roughness: 0.8 });
    const orbMat = new THREE.MeshStandardMaterial({
      color: orbHex,
      emissive: orbHex,
      emissiveIntensity: 1.55,
      roughness: 0.15,
    });
    if (id !== 'void_orb') {
      const pole = new THREE.Mesh(cachedCyl(0.042, 0.052, 1.65, 8), staffMat);
      pole.position.y = 0.65;
      const ring = new THREE.Mesh(cachedBox(0.28, 0.12, 0.28), staffMat);
      ring.position.y = 1.46;
      const orb = new THREE.Mesh(cachedSphere(0.16, 10, 10), orbMat);
      orb.position.y = 1.68;
      g.add(pole, ring, orb);
      g.rotation.x = Math.PI * 0.36;
    } else {
      const orb = new THREE.Mesh(cachedSphere(0.23, 12, 12), orbMat);
      orb.position.set(0, 0.15, 0.28);
      const ring = new THREE.Mesh(cachedBox(0.56, 0.06, 0.56), orbMat);
      ring.position.set(0, 0.15, 0.28);
      ring.rotation.x = 0.45;
      g.add(orb, ring);
    }
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

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c197, roughness: 0.65, metalness: 0.02 });
  const hoodieMat = new THREE.MeshStandardMaterial({
    map: textures.hoodieFabric,
    roughness: 0.85,
    metalness: 0.04,
  });
  const hoodTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e2026, roughness: 0.88, metalness: 0.05 });
  const denimMat = new THREE.MeshStandardMaterial({
    map: textures.denimFabric,
    roughness: 0.82,
    metalness: 0.04,
  });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x6b3e21, roughness: 0.8, metalness: 0.08 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.85 });
  const cordMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.1 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65, metalness: 0.05 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x8f3f1d, roughness: 0.68, metalness: 0.06 });
  const hairDarkMat = new THREE.MeshStandardMaterial({ color: 0x6b2c12, roughness: 0.72, metalness: 0.05 });

  // Classic Blocky Roblox Hoodie Torso
  const torso = new THREE.Group();
  torso.position.set(0, 1.48, 0);
  bodyTilt.add(torso);

  const torsoMesh = new THREE.Mesh(cachedBox(0.98, 1.0, 0.52), hoodieMat);
  const neckCollar = new THREE.Mesh(cachedBox(0.38, 0.18, 0.38), skinMat);
  neckCollar.position.set(0, 0.54, 0);
  const hoodBack = new THREE.Mesh(cachedBox(0.76, 0.42, 0.24), hoodTrimMat);
  hoodBack.position.set(0, 0.34, -0.3);
  const pocket = new THREE.Mesh(cachedBox(0.64, 0.28, 0.08), hoodTrimMat);
  pocket.position.set(0, -0.24, 0.28);
  const hem = new THREE.Mesh(cachedBox(1.02, 0.14, 0.56), hoodTrimMat);
  hem.position.set(0, -0.45, 0);

  const stringL = new THREE.Mesh(cachedBox(0.04, 0.26, 0.04), cordMat);
  stringL.position.set(-0.14, 0.26, 0.28);
  const stringR = stringL.clone();
  stringR.position.x = 0.14;

  const belt = new THREE.Mesh(cachedBox(1.04, 0.12, 0.58), leatherMat);
  belt.position.set(0, -0.4, 0);
  const buckle = new THREE.Mesh(cachedBox(0.18, 0.15, 0.08), brassMat);
  buckle.position.set(0, -0.4, 0.3);

  const pack = new THREE.Mesh(cachedBox(0.64, 0.72, 0.3), leatherMat);
  pack.position.set(0, 0.02, -0.38);
  const packFlap = new THREE.Mesh(cachedBox(0.68, 0.18, 0.34), brassMat);
  packFlap.position.set(0, 0.32, -0.38);
  const bedroll = new THREE.Mesh(cachedBox(0.66, 0.2, 0.22), denimMat);
  bedroll.position.set(0, -0.36, -0.38);
  torso.add(torsoMesh, neckCollar, hoodBack, pocket, hem, stringL, stringR, belt, buckle, pack, packFlap, bedroll);

  // Blocky Ranger Armor overlay
  const armorGroup = new THREE.Group();
  armorGroup.visible = false;
  const armorPlateMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.82, roughness: 0.26 });
  const chestPlate = new THREE.Mesh(cachedBox(1.06, 0.78, 0.6), armorPlateMat);
  chestPlate.position.y = 0.12;
  const chestCore = new THREE.Mesh(cachedBox(0.24, 0.24, 0.08), brassMat);
  chestCore.position.set(0, 0.18, 0.31);
  const pauldronL = new THREE.Mesh(cachedBox(0.48, 0.24, 0.56), armorPlateMat);
  pauldronL.position.set(-0.68, 0.44, 0);
  const pauldronR = pauldronL.clone();
  pauldronR.position.x = 0.68;
  armorGroup.add(chestPlate, chestCore, pauldronL, pauldronR);
  torso.add(armorGroup);

  // Classic Square Roblox Head + 6-face Material + Blocky Spiky Hair
  const head = new THREE.Group();
  head.position.set(0, 2.38, 0);
  bodyTilt.add(head);

  const faceMat = new THREE.MeshStandardMaterial({
    map: textures.robloxFace,
    roughness: 0.55,
    metalness: 0.02,
  });
  const headMesh = new THREE.Mesh(cachedBox(0.78, 0.78, 0.78), [
    skinMat,
    skinMat,
    skinMat,
    skinMat,
    faceMat,
    skinMat,
  ]);
  head.add(headMesh);

  const hairCrown = new THREE.Mesh(cachedBox(0.84, 0.22, 0.84), hairMat);
  hairCrown.position.set(0, 0.34, -0.02);
  const hairBack = new THREE.Mesh(cachedBox(0.84, 0.62, 0.22), hairDarkMat);
  hairBack.position.set(0, 0.12, -0.34);
  head.add(hairCrown, hairBack);

  const spikeConfigs: [number, number, number, number, number, number, number][] = [
    [-0.22, 0.48, 0.22, 0.2, 0.24, 0.22, 0.22],
    [0.0, 0.52, 0.24, 0.22, 0.28, 0.24, -0.06],
    [0.22, 0.48, 0.21, 0.2, 0.24, 0.22, -0.22],
    [-0.36, 0.36, 0.04, 0.16, 0.24, 0.26, 0.42],
    [0.36, 0.36, 0.04, 0.16, 0.24, 0.26, -0.42],
    [-0.18, 0.5, -0.14, 0.24, 0.26, 0.26, 0.15],
    [0.18, 0.5, -0.14, 0.24, 0.26, 0.26, -0.15],
  ];
  spikeConfigs.forEach(([x, y, z, sx, sy, sz, rz], idx) => {
    const spike = new THREE.Mesh(
      cachedBox(sx, sy, sz),
      idx % 2 === 0 ? hairMat : hairDarkMat,
    );
    spike.position.set(x, y, z);
    spike.rotation.z = rz;
    head.add(spike);
  });

  // Blocky Left Arm + Shield
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.68, 1.9, 0);
  bodyTilt.add(leftArm);
  const lSleeve = new THREE.Mesh(cachedBox(0.38, 0.54, 0.42), hoodieMat);
  lSleeve.position.set(0, -0.22, 0);
  const lBracer = new THREE.Mesh(cachedBox(0.4, 0.2, 0.44), leatherMat);
  lBracer.position.set(0, -0.5, 0);
  const lHand = new THREE.Mesh(cachedBox(0.34, 0.28, 0.36), skinMat);
  lHand.position.set(0, -0.74, 0);
  const { shieldGroup, shieldAegisTrim } = buildShieldModel(textures);
  leftArm.add(lSleeve, lBracer, lHand, shieldGroup);

  // Blocky Right Arm + Weapon Socket
  const rightArm = new THREE.Group();
  rightArm.position.set(0.68, 1.9, 0);
  bodyTilt.add(rightArm);
  const rSleeve = lSleeve.clone();
  const rBracer = lBracer.clone();
  const rHand = lHand.clone();
  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(0, -0.76, 0.14);
  rightArm.add(rSleeve, rBracer, rHand, weaponSocket);

  const weapons: Partial<Record<WeaponId, THREE.Group>> = {
    sword: buildWeaponModel('sword'),
  };
  if (weapons.sword) {
    weapons.sword.visible = true;
    weaponSocket.add(weapons.sword);
  }

  // Blocky Denim Legs + Sneakers
  const makeLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.96, 0);
    const pant = new THREE.Mesh(cachedBox(0.42, 0.68, 0.44), denimMat);
    pant.position.set(0, -0.34, 0);
    const kneePad = new THREE.Mesh(cachedBox(0.44, 0.16, 0.12), leatherMat);
    kneePad.position.set(0, -0.38, 0.22);
    const shoe = new THREE.Mesh(cachedBox(0.44, 0.2, 0.54), shoeMat);
    shoe.position.set(0, -0.78, 0.05);
    const sole = new THREE.Mesh(cachedBox(0.46, 0.08, 0.56), soleMat);
    sole.position.set(0, -0.92, 0.05);
    leg.add(pant, kneePad, shoe, sole);
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
  head?: THREE.Group;
  leftArm?: THREE.Group;
  rightArm?: THREE.Group;
  leftLeg?: THREE.Group;
  rightLeg?: THREE.Group;
  legFL?: THREE.Group;
  legFR?: THREE.Group;
  legBL?: THREE.Group;
  legBR?: THREE.Group;
  wingL?: THREE.Group;
  wingR?: THREE.Group;
  tail?: THREE.Group;
  jaw?: THREE.Group;
  extraLimbs?: THREE.Group[];
  aura?: THREE.Object3D;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  hitFlashMeshes: THREE.Mesh[];
}

export function buildMobModel(kind: MobKind, textures: ProceduralTextures): MobVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hitFlashMeshes: THREE.Mesh[] = [];

  let head: THREE.Group | undefined;
  let leftArm: THREE.Group | undefined;
  let rightArm: THREE.Group | undefined;
  let leftLeg: THREE.Group | undefined;
  let rightLeg: THREE.Group | undefined;
  let legFL: THREE.Group | undefined;
  let legFR: THREE.Group | undefined;
  let legBL: THREE.Group | undefined;
  let legBR: THREE.Group | undefined;
  let wingL: THREE.Group | undefined;
  let wingR: THREE.Group | undefined;
  let tail: THREE.Group | undefined;
  let jaw: THREE.Group | undefined;
  let extraLimbs: THREE.Group[] | undefined;
  let aura: THREE.Object3D | undefined;

  if (kind === 'slime') {
    const outerMat = new THREE.MeshStandardMaterial({
      map: textures.slimeGel,
      color: 0x6ee7b7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.84,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      emissive: 0x047857,
      emissiveIntensity: 0.55,
      roughness: 0.4,
    });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.7 });

    const gelCube = new THREE.Mesh(cachedBox(1.36, 1.04, 1.36), outerMat);
    gelCube.position.y = 0.52;
    const core = new THREE.Mesh(cachedBox(0.7, 0.56, 0.7), coreMat);
    core.position.y = 0.46;
    const eyeL = new THREE.Mesh(cachedBox(0.18, 0.22, 0.08), eyeMat);
    eyeL.position.set(-0.26, 0.54, 0.68);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.26;
    const glintL = new THREE.Mesh(cachedBox(0.06, 0.06, 0.04), glintMat);
    glintL.position.set(-0.29, 0.6, 0.72);
    const glintR = glintL.clone();
    glintR.position.x = 0.23;
    const stem = new THREE.Mesh(cachedBox(0.08, 0.24, 0.08), leafMat);
    stem.position.y = 1.14;
    const leaf = new THREE.Mesh(cachedBox(0.32, 0.08, 0.16), leafMat);
    leaf.position.set(0.14, 1.24, 0);
    leaf.rotation.z = -0.28;
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.22 });
    const crownBand = new THREE.Mesh(cachedBox(0.54, 0.1, 0.54), goldMat);
    crownBand.position.set(0, 1.07, 0);
    const jewel = new THREE.Mesh(cachedBox(0.16, 0.16, 0.16), coreMat);
    jewel.position.set(0, 1.14, 0.26);
    const bubble1 = new THREE.Mesh(cachedBox(0.18, 0.18, 0.18), leafMat);
    bubble1.position.set(-0.32, 0.72, -0.22);
    const bubble2 = new THREE.Mesh(cachedBox(0.14, 0.14, 0.14), coreMat);
    bubble2.position.set(0.34, 0.34, 0.28);

    body.add(gelCube, core, eyeL, eyeR, glintL, glintR, stem, leaf, crownBand, jewel, bubble1, bubble2);
    hitFlashMeshes.push(gelCube, core);
  } else if (kind === 'goblin') {
    const skinMat = new THREE.MeshStandardMaterial({ map: textures.goblinSkin, roughness: 0.78 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 0.88 });
    const loinMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.9 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.goblinFace, roughness: 0.7 });
    const clubMat = new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.85 });

    const torso = new THREE.Mesh(cachedBox(0.76, 0.82, 0.44), vestMat);
    torso.position.y = 1.12;
    const belt = new THREE.Mesh(cachedBox(0.8, 0.16, 0.48), loinMat);
    belt.position.y = 0.78;
    const buckle = new THREE.Mesh(cachedBox(0.18, 0.14, 0.08), brassMat);
    buckle.position.set(0, 0.78, 0.25);

    head = new THREE.Group();
    head.position.set(0, 1.54, 0.02);
    const headMesh = new THREE.Mesh(cachedBox(0.62, 0.58, 0.62), [
      skinMat,
      skinMat,
      skinMat,
      skinMat,
      faceMat,
      skinMat,
    ]);
    headMesh.position.y = 0.3;
    const nose = new THREE.Mesh(cachedBox(0.12, 0.12, 0.18), skinMat);
    nose.position.set(0, 0.24, 0.36);
    const mohawk = new THREE.Mesh(cachedBox(0.14, 0.18, 0.46), hairMat);
    mohawk.position.set(0, 0.64, -0.02);
    const tuskL = new THREE.Mesh(cachedBox(0.07, 0.12, 0.07), tuskMat);
    tuskL.position.set(-0.14, 0.14, 0.34);
    const tuskR = tuskL.clone();
    tuskR.position.x = 0.14;
    const earL = new THREE.Mesh(cachedBox(0.32, 0.16, 0.1), skinMat);
    earL.position.set(-0.44, 0.32, 0);
    earL.rotation.z = 0.25;
    const earR = earL.clone();
    earR.position.x = 0.44;
    earR.rotation.z = -0.25;
    head.add(headMesh, nose, mohawk, tuskL, tuskR, earL, earR);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.52, 1.48, 0);
    const lArmM = new THREE.Mesh(cachedBox(0.24, 0.68, 0.24), skinMat);
    lArmM.position.y = -0.34;
    const lPad = new THREE.Mesh(cachedBox(0.3, 0.22, 0.3), loinMat);
    lPad.position.y = -0.02;
    leftArm.add(lArmM, lPad);

    rightArm = new THREE.Group();
    rightArm.position.set(0.52, 1.48, 0);
    const rArmM = new THREE.Mesh(cachedBox(0.24, 0.68, 0.24), skinMat);
    rArmM.position.y = -0.34;
    const rPad = lPad.clone();
    const club = new THREE.Mesh(cachedBox(0.18, 0.18, 0.84), clubMat);
    club.position.set(0, -0.62, 0.34);
    const clubRing = new THREE.Mesh(cachedBox(0.22, 0.22, 0.14), brassMat);
    clubRing.position.set(0, -0.62, 0.62);
    rightArm.add(rArmM, rPad, club, clubRing);

    const quiverPack = new THREE.Mesh(cachedBox(0.46, 0.54, 0.24), loinMat);
    quiverPack.position.set(0, 1.18, -0.32);
    const earRing = new THREE.Mesh(cachedBox(0.08, 0.12, 0.08), brassMat);
    earRing.position.set(-0.56, 0.2, 0.02);
    head.add(earRing);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.2, 0.7, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.28, 0.7, 0.28), loinMat);
    lLegM.position.y = -0.35;
    leftLeg.add(lLegM);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.2, 0.7, 0);
    const rLegM = lLegM.clone();
    rightLeg.add(rLegM);

    body.add(torso, belt, buckle, quiverPack, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headMesh, lArmM, rArmM);
  } else if (kind === 'wolf') {
    const furMat = new THREE.MeshStandardMaterial({ map: textures.wolfFur, roughness: 0.85 });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 1.65,
    });
    const fangMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

    const torso = new THREE.Mesh(cachedBox(0.64, 0.62, 1.24), furMat);
    torso.position.y = 0.82;
    const chest = new THREE.Mesh(cachedBox(0.76, 0.7, 0.56), maneMat);
    chest.position.set(0, 0.86, 0.36);
    const ridgeTuft = new THREE.Mesh(cachedBox(0.22, 0.16, 0.76), maneMat);
    ridgeTuft.position.set(0, 1.18, -0.1);
    const collar = new THREE.Mesh(cachedBox(0.66, 0.14, 0.16), fangMat);
    collar.position.set(0, 0.94, 0.52);

    head = new THREE.Group();
    head.position.set(0, 0.98, 0.62);
    const headMesh = new THREE.Mesh(cachedBox(0.56, 0.5, 0.52), furMat);
    headMesh.position.set(0, 0.04, 0.16);
    const snout = new THREE.Mesh(cachedBox(0.28, 0.22, 0.36), maneMat);
    snout.position.set(0, -0.08, 0.46);
    const earL = new THREE.Mesh(cachedBox(0.14, 0.22, 0.1), maneMat);
    earL.position.set(-0.18, 0.36, 0.08);
    const earR = earL.clone();
    earR.position.x = 0.18;
    const eyeL = new THREE.Mesh(cachedBox(0.1, 0.08, 0.06), eyeMat);
    eyeL.position.set(-0.15, 0.12, 0.42);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.15;
    const fangL = new THREE.Mesh(cachedBox(0.05, 0.09, 0.05), fangMat);
    fangL.position.set(-0.08, -0.2, 0.56);
    const fangR = fangL.clone();
    fangR.position.x = 0.08;
    head.add(headMesh, snout, earL, earR, eyeL, eyeR, fangL, fangR);

    tail = new THREE.Group();
    tail.position.set(0, 0.92, -0.62);
    const tailMesh = new THREE.Mesh(cachedBox(0.18, 0.18, 0.62), maneMat);
    tailMesh.rotation.x = 0.45;
    tailMesh.position.set(0, 0.12, -0.28);
    const tailTip = new THREE.Mesh(cachedBox(0.22, 0.22, 0.2), furMat);
    tailTip.position.set(0, 0.26, -0.54);
    tail.add(tailMesh, tailTip);

    const makePawLeg = (lx: number, lz: number) => {
      const lg = new THREE.Group();
      lg.position.set(lx, 0.58, lz);
      const legM = new THREE.Mesh(cachedBox(0.18, 0.58, 0.18), furMat);
      legM.position.y = -0.29;
      lg.add(legM);
      return lg;
    };
    legFL = makePawLeg(-0.2, 0.42);
    legFR = makePawLeg(0.2, 0.42);
    legBL = makePawLeg(-0.2, -0.44);
    legBR = makePawLeg(0.2, -0.44);

    body.add(torso, chest, ridgeTuft, collar, head, tail, legFL, legFR, legBL, legBR);
    hitFlashMeshes.push(torso, chest, headMesh);
  } else if (kind === 'skeleton') {
    const boneMat = new THREE.MeshStandardMaterial({ map: textures.skeletonBone, roughness: 0.74 });
    const darkBoneMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const eyeGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.85,
    });

    const torso = new THREE.Mesh(cachedBox(0.68, 0.86, 0.38), boneMat);
    torso.position.y = 1.28;
    const pelvis = new THREE.Mesh(cachedBox(0.64, 0.22, 0.36), darkBoneMat);
    pelvis.position.y = 0.86;
    const ribBar1 = new THREE.Mesh(cachedBox(0.74, 0.1, 0.44), darkBoneMat);
    ribBar1.position.y = 1.46;
    const ribBar2 = ribBar1.clone();
    ribBar2.position.y = 1.22;
    const quiver = new THREE.Mesh(cachedBox(0.22, 0.66, 0.18), ironMat);
    quiver.position.set(-0.16, 1.38, -0.28);
    quiver.rotation.z = 0.3;

    head = new THREE.Group();
    head.position.set(0, 1.74, 0);
    const skull = new THREE.Mesh(cachedBox(0.58, 0.56, 0.58), boneMat);
    skull.position.y = 0.3;
    const helm = new THREE.Mesh(cachedBox(0.64, 0.24, 0.64), ironMat);
    helm.position.y = 0.52;
    const helmCrest = new THREE.Mesh(cachedBox(0.12, 0.2, 0.48), eyeGlowMat);
    helmCrest.position.set(0, 0.7, 0);
    const eyeL = new THREE.Mesh(cachedBox(0.12, 0.1, 0.06), eyeGlowMat);
    eyeL.position.set(-0.13, 0.3, 0.29);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.13;
    jaw = new THREE.Group();
    jaw.position.set(0, 0.06, 0.05);
    const jawMesh = new THREE.Mesh(cachedBox(0.36, 0.12, 0.32), darkBoneMat);
    jawMesh.position.set(0, 0, 0.14);
    jaw.add(jawMesh);
    head.add(skull, helm, helmCrest, eyeL, eyeR, jaw);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.48, 1.66, 0);
    const lBoneArm = new THREE.Mesh(cachedBox(0.18, 0.78, 0.18), boneMat);
    lBoneArm.position.y = -0.39;
    const lPauldron = new THREE.Mesh(cachedBox(0.3, 0.24, 0.3), ironMat);
    const shield = new THREE.Mesh(cachedBox(0.1, 0.68, 0.52), ironMat);
    shield.position.set(-0.14, -0.45, 0.16);
    const shieldBoss = new THREE.Mesh(cachedBox(0.14, 0.2, 0.2), eyeGlowMat);
    shieldBoss.position.set(-0.15, -0.45, 0.16);
    leftArm.add(lBoneArm, lPauldron, shield, shieldBoss);

    rightArm = new THREE.Group();
    rightArm.position.set(0.48, 1.66, 0);
    const rBoneArm = new THREE.Mesh(cachedBox(0.18, 0.78, 0.18), boneMat);
    rBoneArm.position.y = -0.39;
    const rPauldron = lPauldron.clone();
    const blade = new THREE.Mesh(cachedBox(0.1, 0.14, 0.96), ironMat);
    blade.position.set(0, -0.68, 0.48);
    rightArm.add(rBoneArm, rPauldron, blade);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.2, 0.8, 0);
    const lBoneLeg = new THREE.Mesh(cachedBox(0.2, 0.8, 0.2), boneMat);
    lBoneLeg.position.y = -0.4;
    leftLeg.add(lBoneLeg);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.2, 0.8, 0);
    rightLeg.add(lBoneLeg.clone());

    body.add(torso, pelvis, ribBar1, ribBar2, quiver, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, skull, lBoneArm, rBoneArm);
  } else if (kind === 'golem') {
    const stoneMat = new THREE.MeshStandardMaterial({ map: textures.golemStone, roughness: 0.9 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.88 });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xea580c,
      emissiveIntensity: 1.55,
    });

    const torso = new THREE.Mesh(cachedBox(1.56, 1.44, 0.96), stoneMat);
    torso.position.y = 1.76;
    const core = new THREE.Mesh(cachedBox(0.44, 0.44, 0.16), runeMat);
    core.position.set(0, 1.78, 0.5);
    const mossCap = new THREE.Mesh(cachedBox(1.62, 0.24, 1.02), mossMat);
    mossCap.position.y = 2.42;
    const runeBelt = new THREE.Mesh(cachedBox(1.64, 0.2, 1.02), runeMat);
    runeBelt.position.y = 1.18;
    const spinePeak = new THREE.Mesh(cachedBox(0.36, 0.62, 0.36), stoneMat);
    spinePeak.position.set(0, 2.38, -0.56);

    head = new THREE.Group();
    head.position.set(0, 2.58, 0);
    const headBlock = new THREE.Mesh(cachedBox(0.84, 0.78, 0.82), stoneMat);
    headBlock.position.y = 0.39;
    const browRidge = new THREE.Mesh(cachedBox(0.92, 0.18, 0.22), mossMat);
    browRidge.position.set(0, 0.66, 0.38);
    const eyeL = new THREE.Mesh(cachedBox(0.16, 0.12, 0.08), runeMat);
    eyeL.position.set(-0.2, 0.4, 0.42);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.2;
    head.add(headBlock, browRidge, eyeL, eyeR);

    aura = new THREE.Group();
    aura.position.set(0, 1.75, 0);
    for (let s = 0; s < 4; s++) {
      const ang = (s / 4) * Math.PI * 2;
      const shard = new THREE.Mesh(cachedBox(0.18, 0.28, 0.18), runeMat);
      shard.position.set(Math.cos(ang) * 1.15, s % 2 === 0 ? 0.22 : -0.18, Math.sin(ang) * 1.15);
      aura.add(shard);
    }

    leftArm = new THREE.Group();
    leftArm.position.set(-1.08, 2.26, 0);
    const lShoulderBould = new THREE.Mesh(cachedBox(0.68, 0.56, 0.68), mossMat);
    const lFist = new THREE.Mesh(cachedBox(0.52, 1.32, 0.52), stoneMat);
    lFist.position.y = -0.66;
    const lRune = new THREE.Mesh(cachedBox(0.56, 0.16, 0.56), runeMat);
    lRune.position.y = -1.04;
    leftArm.add(lShoulderBould, lFist, lRune);

    rightArm = new THREE.Group();
    rightArm.position.set(1.08, 2.26, 0);
    rightArm.add(lShoulderBould.clone(), lFist.clone(), lRune.clone());

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.44, 1.04, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.54, 1.04, 0.54), stoneMat);
    lLegM.position.y = -0.52;
    leftLeg.add(lLegM);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.44, 1.04, 0);
    rightLeg.add(lLegM.clone());

    body.add(torso, core, mossCap, runeBelt, spinePeak, head, aura, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headBlock, lFist);
  } else if (kind === 'final_boss') {
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x171422,
      map: textures.bossArmor,
      metalness: 0.85,
      roughness: 0.25,
    });
    const magmaMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      emissive: 0xe11d48,
      emissiveIntensity: 2.3,
    });
    const voidVioletMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.9,
    });
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.85, side: THREE.DoubleSide });

    const torso = new THREE.Mesh(cachedBox(1.56, 1.72, 0.92), obsidianMat);
    torso.position.y = 2.42;
    const ribPlate = new THREE.Mesh(cachedBox(1.64, 0.24, 0.98), magmaMat);
    ribPlate.position.y = 1.82;
    const core = new THREE.Mesh(cachedBox(0.5, 0.5, 0.18), magmaMat);
    core.position.set(0, 2.58, 0.48);
    const auraGroup = new THREE.Group();
    auraGroup.position.set(0, 3.65, -0.45);
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI * 2;
      const gem = new THREE.Mesh(cachedBox(0.28, 0.28, 0.28), s % 2 === 0 ? magmaMat : voidVioletMat);
      gem.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0.05);
      auraGroup.add(gem);
    }
    aura = auraGroup;
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.45), capeMat);
    cape.position.set(0, 2.05, -0.54);
    cape.rotation.x = 0.16;

    head = new THREE.Group();
    head.position.set(0, 3.35, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.96, 0.96, 0.96), obsidianMat);
    headMesh.position.y = 0.48;
    const visor = new THREE.Mesh(cachedBox(0.76, 0.18, 0.14), magmaMat);
    visor.position.set(0, 0.52, 0.48);
    const crownCenter = new THREE.Mesh(cachedBox(0.24, 0.62, 0.24), voidVioletMat);
    crownCenter.position.set(0, 1.2, 0);
    const hornL = new THREE.Mesh(cachedBox(0.2, 0.78, 0.2), obsidianMat);
    hornL.position.set(-0.46, 1.08, 0);
    hornL.rotation.z = 0.38;
    const hornR = hornL.clone();
    hornR.position.x = 0.46;
    hornR.rotation.z = -0.38;
    head.add(headMesh, visor, crownCenter, hornL, hornR);

    leftArm = new THREE.Group();
    leftArm.position.set(-1.14, 3.12, 0);
    const lShoulder = new THREE.Mesh(cachedBox(0.68, 0.5, 0.68), obsidianMat);
    const lSpike = new THREE.Mesh(cachedBox(0.24, 0.52, 0.24), voidVioletMat);
    lSpike.position.set(-0.22, 0.42, 0);
    const lArmM = new THREE.Mesh(cachedBox(0.48, 1.38, 0.48), obsidianMat);
    lArmM.position.y = -0.68;
    const lCuff = new THREE.Mesh(cachedBox(0.54, 0.2, 0.54), magmaMat);
    lCuff.position.y = -1.2;
    leftArm.add(lShoulder, lSpike, lArmM, lCuff);

    rightArm = new THREE.Group();
    rightArm.position.set(1.14, 3.12, 0);
    const rShoulder = lShoulder.clone();
    const rSpike = lSpike.clone();
    rSpike.position.x = 0.22;
    const rArmM = lArmM.clone();
    const rCuff = lCuff.clone();
    const hilt = new THREE.Mesh(cachedBox(0.46, 0.14, 0.14), obsidianMat);
    hilt.position.set(0, -1.12, 0.34);
    const blade = new THREE.Mesh(cachedBox(0.22, 0.22, 2.35), obsidianMat);
    blade.position.set(0, -1.25, 1.15);
    const bladeRune = new THREE.Mesh(cachedBox(0.26, 0.1, 1.95), magmaMat);
    bladeRune.position.set(0, -1.25, 1.15);
    rightArm.add(rShoulder, rSpike, rArmM, rCuff, hilt, blade, bladeRune);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.44, 1.54, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.58, 1.54, 0.58), obsidianMat);
    lLegM.position.y = -0.77;
    const lKnee = new THREE.Mesh(cachedBox(0.64, 0.24, 0.2), voidVioletMat);
    lKnee.position.set(0, -0.68, 0.26);
    leftLeg.add(lLegM, lKnee);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.44, 1.54, 0);
    rightLeg.add(lLegM.clone(), lKnee.clone());

    body.add(torso, ribPlate, core, auraGroup, cape, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headMesh, lArmM, rArmM);
  } else if (kind === 'secret_boss') {
    const astralArmorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      map: textures.bossArmor,
      metalness: 0.9,
      roughness: 0.2,
    });
    const cyanEnergyMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.4,
    });
    const astralGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.9,
      metalness: 0.78,
      roughness: 0.22,
    });
    const cloakMat = new THREE.MeshStandardMaterial({ color: 0x083344, roughness: 0.75, side: THREE.DoubleSide });

    const torso = new THREE.Mesh(cachedBox(1.74, 1.9, 1.0), astralArmorMat);
    torso.position.y = 2.68;
    const beltTrim = new THREE.Mesh(cachedBox(1.82, 0.24, 1.06), astralGoldMat);
    beltTrim.position.y = 1.95;
    const chestCore = new THREE.Mesh(cachedBox(0.56, 0.56, 0.2), cyanEnergyMat);
    chestCore.position.set(0, 2.86, 0.52);
    const auraGroup = new THREE.Group();
    auraGroup.position.set(0, 3.85, -0.5);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      const orb = new THREE.Mesh(cachedBox(0.24, 0.24, 0.24), s % 2 === 0 ? cyanEnergyMat : astralGoldMat);
      orb.position.set(Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0);
      auraGroup.add(orb);
    }
    aura = auraGroup;

    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(cachedBox(0.28, 1.45, 0.28), astralArmorMat);
      pylon.position.set(side * 1.48, 3.62, -0.45);
      pylon.rotation.z = side * -0.34;
      const pylonTip = new THREE.Mesh(cachedBox(0.32, 0.52, 0.32), cyanEnergyMat);
      pylonTip.position.set(side * 1.78, 4.42, -0.45);
      pylonTip.rotation.z = side * -0.34;
      body.add(pylon, pylonTip);
    }

    const cape = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 2.75), cloakMat);
    cape.position.set(0, 2.24, -0.62);
    cape.rotation.x = 0.16;

    wingL = new THREE.Group();
    wingL.position.set(-0.75, 2.9, -0.52);
    const aWingL = new THREE.Mesh(cachedBox(1.15, 0.62, 0.12), cyanEnergyMat);
    aWingL.position.set(-0.62, 0.24, -0.06);
    wingL.add(aWingL);
    wingR = new THREE.Group();
    wingR.position.set(0.75, 2.9, -0.52);
    const aWingR = aWingL.clone();
    aWingR.position.x = 0.62;
    wingR.add(aWingR);

    head = new THREE.Group();
    head.position.set(0, 3.68, 0);
    const headMesh = new THREE.Mesh(cachedBox(1.02, 1.02, 1.02), astralArmorMat);
    headMesh.position.y = 0.5;
    const visor = new THREE.Mesh(cachedBox(0.8, 0.2, 0.16), cyanEnergyMat);
    visor.position.set(0, 0.52, 0.52);
    const crownSpire = new THREE.Mesh(cachedBox(0.28, 0.78, 0.28), astralGoldMat);
    crownSpire.position.set(0, 1.32, 0);
    const cWingL = new THREE.Mesh(cachedBox(0.18, 0.44, 0.18), cyanEnergyMat);
    cWingL.position.set(-0.42, 1.12, 0);
    const cWingR = cWingL.clone();
    cWingR.position.x = 0.42;
    head.add(headMesh, visor, crownSpire, cWingL, cWingR);

    leftArm = new THREE.Group();
    leftArm.position.set(-1.24, 3.38, 0);
    const lShoulder = new THREE.Mesh(cachedBox(0.76, 0.54, 0.76), astralArmorMat);
    const lShoulderTrim = new THREE.Mesh(cachedBox(0.82, 0.16, 0.82), astralGoldMat);
    lShoulderTrim.position.y = 0.24;
    const lArmM = new THREE.Mesh(cachedBox(0.52, 1.48, 0.52), astralArmorMat);
    lArmM.position.y = -0.74;
    const lGauntlet = new THREE.Mesh(cachedBox(0.58, 0.24, 0.58), cyanEnergyMat);
    lGauntlet.position.y = -1.42;
    leftArm.add(lShoulder, lShoulderTrim, lArmM, lGauntlet);

    rightArm = new THREE.Group();
    rightArm.position.set(1.24, 3.38, 0);
    const rShoulder = lShoulder.clone();
    const rShoulderTrim = lShoulderTrim.clone();
    const rArmM = lArmM.clone();
    const pole = new THREE.Mesh(cachedBox(0.16, 0.16, 3.1), astralGoldMat);
    pole.position.set(0, -1.35, 0.95);
    const halberdAxe = new THREE.Mesh(cachedBox(0.14, 0.86, 0.72), astralArmorMat);
    halberdAxe.position.set(0, -1.35, 2.05);
    const halberdEdge = new THREE.Mesh(cachedBox(0.18, 0.92, 0.22), cyanEnergyMat);
    halberdEdge.position.set(0, -1.35, 2.38);
    rightArm.add(rShoulder, rShoulderTrim, rArmM, pole, halberdAxe, halberdEdge);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.48, 1.72, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.62, 1.72, 0.62), astralArmorMat);
    lLegM.position.y = -0.86;
    const lGreave = new THREE.Mesh(cachedBox(0.68, 0.22, 0.68), astralGoldMat);
    lGreave.position.y = -0.65;
    leftLeg.add(lLegM, lGreave);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.48, 1.72, 0);
    rightLeg.add(lLegM.clone(), lGreave.clone());

    body.add(torso, beltTrim, chestCore, auraGroup, cape, wingL, wingR, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headMesh, lArmM, rArmM);
  } else if (kind === 'boss') {
    const darkArmor = new THREE.MeshStandardMaterial({ map: textures.bossArmor, metalness: 0.82, roughness: 0.25 });
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 1.85,
    });
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x4c0519, roughness: 0.85, side: THREE.DoubleSide });

    const torso = new THREE.Mesh(cachedBox(1.16, 1.32, 0.72), darkArmor);
    torso.position.y = 1.84;
    const beltPlate = new THREE.Mesh(cachedBox(1.22, 0.2, 0.78), crimsonMat);
    beltPlate.position.y = 1.32;
    const chestGem = new THREE.Mesh(cachedBox(0.36, 0.36, 0.14), crimsonMat);
    chestGem.position.set(0, 1.96, 0.38);
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.78), capeMat);
    cape.position.set(0, 1.56, -0.42);
    cape.rotation.x = 0.14;

    const auraGroup = new THREE.Group();
    auraGroup.position.set(0, 2.0, 0);
    for (let s = 0; s < 3; s++) {
      const a = (s / 3) * Math.PI * 2;
      const shard = new THREE.Mesh(cachedBox(0.22, 0.22, 0.22), crimsonMat);
      shard.position.set(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15);
      auraGroup.add(shard);
    }
    aura = auraGroup;

    head = new THREE.Group();
    head.position.set(0, 2.52, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.82, 0.82, 0.82), darkArmor);
    headMesh.position.y = 0.41;
    const visor = new THREE.Mesh(cachedBox(0.64, 0.16, 0.12), crimsonMat);
    visor.position.set(0, 0.42, 0.41);
    const hornL = new THREE.Mesh(cachedBox(0.18, 0.56, 0.18), darkArmor);
    hornL.position.set(-0.38, 0.88, 0);
    hornL.rotation.z = 0.36;
    const hornR = hornL.clone();
    hornR.position.x = 0.38;
    hornR.rotation.z = -0.36;
    head.add(headMesh, visor, hornL, hornR);

    wingL = new THREE.Group();
    wingL.position.set(-0.52, 2.1, -0.36);
    const bWingL = new THREE.Mesh(cachedBox(0.74, 0.44, 0.1), crimsonMat);
    bWingL.position.set(-0.4, 0.14, 0);
    wingL.add(bWingL);
    wingR = new THREE.Group();
    wingR.position.set(0.52, 2.1, -0.36);
    const bWingR = bWingL.clone();
    bWingR.position.x = 0.4;
    wingR.add(bWingR);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.84, 2.38, 0);
    const lShoulder = new THREE.Mesh(cachedBox(0.52, 0.42, 0.52), darkArmor);
    const lSpike = new THREE.Mesh(cachedBox(0.16, 0.32, 0.16), crimsonMat);
    lSpike.position.set(-0.14, 0.3, 0);
    const lArmM = new THREE.Mesh(cachedBox(0.38, 1.04, 0.38), darkArmor);
    lArmM.position.y = -0.52;
    const lGaunt = new THREE.Mesh(cachedBox(0.42, 0.18, 0.42), crimsonMat);
    lGaunt.position.y = -0.92;
    leftArm.add(lShoulder, lSpike, lArmM, lGaunt);

    rightArm = new THREE.Group();
    rightArm.position.set(0.84, 2.38, 0);
    const rShoulder = lShoulder.clone();
    const rSpike = lSpike.clone();
    rSpike.position.x = 0.14;
    const rArmM = lArmM.clone();
    const blade = new THREE.Mesh(cachedBox(0.16, 0.18, 1.65), darkArmor);
    blade.position.set(0, -0.9, 0.78);
    const bladeRune = new THREE.Mesh(cachedBox(0.2, 0.08, 1.3), crimsonMat);
    bladeRune.position.set(0, -0.9, 0.78);
    rightArm.add(rShoulder, rSpike, rArmM, lGaunt.clone(), blade, bladeRune);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.32, 1.18, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.46, 1.18, 0.46), darkArmor);
    lLegM.position.y = -0.59;
    leftLeg.add(lLegM);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.32, 1.18, 0);
    rightLeg.add(lLegM.clone());

    body.add(torso, beltPlate, chestGem, cape, auraGroup, wingL, wingR, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headMesh, lArmM, rArmM);
  } else if (kind === 'mushroom_imp') {
    const stemMat = new THREE.MeshStandardMaterial({ map: textures.skeletonBone, color: 0xfef3c7, roughness: 0.78 });
    const capMat = new THREE.MeshStandardMaterial({ map: textures.mushroomCap, roughness: 0.6 });
    const gillMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.85 });
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.82 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 1.7 });

    const torso = new THREE.Mesh(cachedBox(0.64, 0.72, 0.44), stemMat);
    torso.position.y = 0.66;
    const mossSash = new THREE.Mesh(cachedBox(0.7, 0.14, 0.5), vineMat);
    mossSash.position.y = 0.56;
    const capPack = new THREE.Mesh(cachedBox(0.42, 0.44, 0.24), gillMat);
    capPack.position.set(0, 0.72, -0.32);

    head = new THREE.Group();
    head.position.set(0, 1.02, 0);
    const capRim = new THREE.Mesh(cachedBox(1.24, 0.16, 1.24), gillMat);
    capRim.position.y = 0.1;
    const cap = new THREE.Mesh(cachedBox(1.36, 0.54, 1.36), capMat);
    cap.position.y = 0.36;
    const capCrown = new THREE.Mesh(cachedBox(0.84, 0.2, 0.84), capMat);
    capCrown.position.y = 0.68;
    const spotF = new THREE.Mesh(cachedBox(0.24, 0.12, 0.08), gillMat);
    spotF.position.set(0.3, 0.4, 0.7);
    const spotB = spotF.clone();
    spotB.position.set(-0.28, 0.44, -0.7);
    const eyeL = new THREE.Mesh(cachedBox(0.12, 0.14, 0.06), eyeMat);
    eyeL.position.set(-0.14, -0.1, 0.24);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.14;
    head.add(capRim, cap, capCrown, spotF, spotB, eyeL, eyeR);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.18, 0.34, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.22, 0.34, 0.22), stemMat);
    lLegM.position.y = -0.17;
    const lRoot = new THREE.Mesh(cachedBox(0.26, 0.1, 0.28), vineMat);
    lRoot.position.y = -0.3;
    leftLeg.add(lLegM, lRoot);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.18, 0.34, 0);
    rightLeg.add(lLegM.clone(), lRoot.clone());

    leftArm = new THREE.Group();
    leftArm.position.set(-0.42, 0.84, 0);
    const lArmM = new THREE.Mesh(cachedBox(0.18, 0.46, 0.18), stemMat);
    lArmM.position.y = -0.23;
    const lCuff = new THREE.Mesh(cachedBox(0.22, 0.12, 0.22), vineMat);
    lCuff.position.y = -0.38;
    leftArm.add(lArmM, lCuff);
    rightArm = new THREE.Group();
    rightArm.position.set(0.42, 0.84, 0);
    const rArmM = lArmM.clone();
    const sporeOrb = new THREE.Mesh(cachedBox(0.22, 0.22, 0.22), eyeMat);
    sporeOrb.position.set(0, -0.45, 0.12);
    rightArm.add(rArmM, lCuff.clone(), sporeOrb);

    body.add(torso, mossSash, capPack, head, leftLeg, rightLeg, leftArm, rightArm);
    hitFlashMeshes.push(torso, cap);
  } else if (kind === 'dire_boar') {
    const furMat = new THREE.MeshStandardMaterial({ map: textures.boarHide, roughness: 0.85 });
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x271308, roughness: 0.9 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.82, roughness: 0.32 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.65 });

    const torso = new THREE.Mesh(cachedBox(0.92, 0.82, 1.38), furMat);
    torso.position.y = 0.86;
    const mane = new THREE.Mesh(cachedBox(0.24, 0.22, 1.2), ridgeMat);
    mane.position.set(0, 1.34, 0.02);
    const harness = new THREE.Mesh(cachedBox(0.98, 0.52, 0.24), ironMat);
    harness.position.set(0, 0.88, 0.34);
    const flankPlate = new THREE.Mesh(cachedBox(0.98, 0.38, 0.22), ridgeMat);
    flankPlate.position.set(0, 0.9, -0.28);

    head = new THREE.Group();
    head.position.set(0, 0.88, 0.7);
    const headMesh = new THREE.Mesh(cachedBox(0.72, 0.64, 0.56), furMat);
    headMesh.position.set(0, 0, 0.22);
    const browPlate = new THREE.Mesh(cachedBox(0.68, 0.16, 0.44), ironMat);
    browPlate.position.set(0, 0.28, 0.24);
    const earL = new THREE.Mesh(cachedBox(0.18, 0.12, 0.1), ridgeMat);
    earL.position.set(-0.38, 0.24, 0.12);
    const earR = earL.clone();
    earR.position.x = 0.38;
    const snout = new THREE.Mesh(cachedBox(0.4, 0.28, 0.24), ridgeMat);
    snout.position.set(0, -0.1, 0.56);
    const noseRing = new THREE.Mesh(cachedBox(0.18, 0.14, 0.08), ironMat);
    noseRing.position.set(0, -0.16, 0.69);
    const tuskL = new THREE.Mesh(cachedBox(0.08, 0.28, 0.08), tuskMat);
    tuskL.position.set(-0.22, -0.02, 0.58);
    tuskL.rotation.x = 0.45;
    const tuskR = tuskL.clone();
    tuskR.position.x = 0.22;
    const eyeL = new THREE.Mesh(cachedBox(0.1, 0.09, 0.06), eyeMat);
    eyeL.position.set(-0.22, 0.14, 0.5);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.22;
    head.add(headMesh, browPlate, earL, earR, snout, noseRing, tuskL, tuskR, eyeL, eyeR);

    tail = new THREE.Group();
    tail.position.set(0, 0.94, -0.72);
    const tailM = new THREE.Mesh(cachedBox(0.1, 0.1, 0.34), ridgeMat);
    tailM.position.set(0, 0.06, -0.15);
    const tailTuft = new THREE.Mesh(cachedBox(0.14, 0.14, 0.12), furMat);
    tailTuft.position.set(0, 0.08, -0.34);
    tail.add(tailM, tailTuft);

    const makeHoofLeg = (x: number, z: number) => {
      const lg = new THREE.Group();
      lg.position.set(x, 0.52, z);
      const m = new THREE.Mesh(cachedBox(0.24, 0.42, 0.24), furMat);
      m.position.y = -0.21;
      const hoof = new THREE.Mesh(cachedBox(0.26, 0.12, 0.26), ridgeMat);
      hoof.position.y = -0.46;
      lg.add(m, hoof);
      return lg;
    };
    legFL = makeHoofLeg(-0.34, 0.48);
    legFR = makeHoofLeg(0.34, 0.48);
    legBL = makeHoofLeg(-0.34, -0.48);
    legBR = makeHoofLeg(0.34, -0.48);
    body.add(torso, mane, harness, flankPlate, head, tail, legFL, legFR, legBL, legBR);
    hitFlashMeshes.push(torso, headMesh);
  } else if (kind === 'giant_spider') {
    const chMat = new THREE.MeshStandardMaterial({ map: textures.spiderChitin, roughness: 0.55 });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 1.8 });
    const fangMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, emissive: 0x4d7c0f, emissiveIntensity: 0.8 });

    const abd = new THREE.Mesh(cachedBox(1.18, 0.92, 1.38), chMat);
    abd.position.set(0, 0.76, -0.62);
    const abdStripe1 = new THREE.Mesh(cachedBox(1.22, 0.14, 0.24), eyeMat);
    abdStripe1.position.set(0, 1.18, -0.44);
    const abdStripe2 = new THREE.Mesh(cachedBox(1.22, 0.14, 0.24), eyeMat);
    abdStripe2.position.set(0, 1.18, -0.84);
    const spinneret = new THREE.Mesh(cachedBox(0.38, 0.28, 0.26), jointMat);
    spinneret.position.set(0, 0.68, -1.36);

    head = new THREE.Group();
    head.position.set(0, 0.64, 0.34);
    const cephalo = new THREE.Mesh(cachedBox(0.76, 0.54, 0.72), chMat);
    const crest = new THREE.Mesh(cachedBox(0.56, 0.12, 0.52), jointMat);
    crest.position.set(0, 0.3, -0.02);
    head.add(cephalo, crest);
    for (const ex of [-0.22, -0.08, 0.08, 0.22]) {
      const eye = new THREE.Mesh(cachedBox(0.09, 0.09, 0.06), eyeMat);
      eye.position.set(ex, 0.08, 0.37);
      head.add(eye);
    }
    for (const fx of [-0.14, 0.14]) {
      const mand = new THREE.Mesh(cachedBox(0.09, 0.22, 0.1), fangMat);
      mand.position.set(fx, -0.14, 0.38);
      head.add(mand);
    }

    const makeSpiderLeg = (x: number, z: number, rotY: number) => {
      const lg = new THREE.Group();
      lg.position.set(x, 0.58, z);
      lg.rotation.y = rotY;
      const femur = new THREE.Mesh(cachedBox(0.68, 0.14, 0.14), chMat);
      femur.position.set(Math.sign(x) * 0.34, 0.16, 0);
      femur.rotation.z = Math.sign(x) * 0.32;
      const knee = new THREE.Mesh(cachedBox(0.18, 0.2, 0.18), eyeMat);
      knee.position.set(Math.sign(x) * 0.66, 0.24, 0);
      const tibia = new THREE.Mesh(cachedBox(0.14, 0.72, 0.14), jointMat);
      tibia.position.set(Math.sign(x) * 0.68, -0.16, 0);
      lg.add(femur, knee, tibia);
      return lg;
    };
    legFL = makeSpiderLeg(-0.36, 0.42, -0.25);
    legFR = makeSpiderLeg(0.36, 0.42, 0.25);
    const extraML = makeSpiderLeg(-0.38, 0.1, 0);
    const extraMR = makeSpiderLeg(0.38, 0.1, 0);
    legBL = makeSpiderLeg(-0.36, -0.24, 0.28);
    legBR = makeSpiderLeg(0.36, -0.24, -0.28);
    extraLimbs = [extraML, extraMR];
    body.add(abd, abdStripe1, abdStripe2, spinneret, head, legFL, legFR, extraML, extraMR, legBL, legBR);
    hitFlashMeshes.push(abd, cephalo);
  } else if (kind === 'forest_ent') {
    const barkMat = new THREE.MeshStandardMaterial({ map: textures.entBark, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ map: textures.leafCluster, color: 0x16a34a, roughness: 0.78 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xa3e635, emissive: 0x84cc16, emissiveIntensity: 1.75 });
    const bloomMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.8 });

    const torso = new THREE.Mesh(cachedBox(1.24, 1.72, 0.92), barkMat);
    torso.position.y = 1.66;
    const mossCollar = new THREE.Mesh(cachedBox(1.36, 0.3, 1.04), leafMat);
    mossCollar.position.y = 2.42;
    const heartRune = new THREE.Mesh(cachedBox(0.38, 0.44, 0.12), eyeMat);
    heartRune.position.set(0, 1.75, 0.46);
    const backVine = new THREE.Mesh(cachedBox(0.64, 0.92, 0.2), leafMat);
    backVine.position.set(0, 1.72, -0.5);

    head = new THREE.Group();
    head.position.set(0, 2.52, 0);
    const crown = new THREE.Mesh(cachedBox(1.56, 0.96, 1.44), leafMat);
    crown.position.y = 0.48;
    const crownTop = new THREE.Mesh(cachedBox(1.02, 0.34, 0.98), leafMat);
    crownTop.position.y = 1.02;
    const branchL = new THREE.Mesh(cachedBox(0.16, 0.56, 0.16), barkMat);
    branchL.position.set(-0.78, 0.54, 0);
    branchL.rotation.z = 0.5;
    const branchR = branchL.clone();
    branchR.position.x = 0.78;
    branchR.rotation.z = -0.5;
    const faceBark = new THREE.Mesh(cachedBox(0.84, 0.72, 0.84), barkMat);
    faceBark.position.y = 0.08;
    const eyeL = new THREE.Mesh(cachedBox(0.16, 0.12, 0.08), eyeMat);
    eyeL.position.set(-0.2, 0.14, 0.44);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.2;
    head.add(crown, crownTop, branchL, branchR, faceBark, eyeL, eyeR);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.84, 2.25, 0);
    const lArmM = new THREE.Mesh(cachedBox(0.38, 1.28, 0.38), barkMat);
    lArmM.position.y = -0.64;
    const lLeafClump = new THREE.Mesh(cachedBox(0.56, 0.4, 0.56), leafMat);
    lLeafClump.position.y = -0.06;
    const lBloom = new THREE.Mesh(cachedBox(0.18, 0.18, 0.18), bloomMat);
    lBloom.position.set(-0.24, -0.08, 0.24);
    leftArm.add(lArmM, lLeafClump, lBloom);
    rightArm = new THREE.Group();
    rightArm.position.set(0.84, 2.25, 0);
    rightArm.add(lArmM.clone(), lLeafClump.clone(), lBloom.clone());

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.34, 0.8, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.44, 0.8, 0.44), barkMat);
    lLegM.position.y = -0.4;
    const lRootToe = new THREE.Mesh(cachedBox(0.52, 0.18, 0.56), leafMat);
    lRootToe.position.y = -0.7;
    leftLeg.add(lLegM, lRootToe);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.34, 0.8, 0);
    rightLeg.add(lLegM.clone(), lRootToe.clone());

    body.add(torso, mossCollar, heartRune, backVine, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, crown, faceBark);
  } else if (kind === 'bandit_raider' || kind === 'dune_stalker' || kind === 'swamp_witch') {
    const coatHex = kind === 'bandit_raider' ? 0x64748b : kind === 'dune_stalker' ? 0xf59e0b : 0x4d7c0f;
    const hoodHex = kind === 'bandit_raider' ? 0x991b1b : kind === 'dune_stalker' ? 0xd97706 : 0x6b21a8;
    const eyeHex = kind === 'swamp_witch' ? 0xa3e635 : kind === 'dune_stalker' ? 0xfacc15 : 0xf43f5e;
    const coatMat = new THREE.MeshStandardMaterial({ map: textures.banditCloth, color: coatHex, roughness: 0.78 });
    const hoodMat = new THREE.MeshStandardMaterial({ color: hoodHex, roughness: 0.7 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.82, roughness: 0.28 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: eyeHex, emissive: eyeHex, emissiveIntensity: 1.65 });

    const torso = new THREE.Mesh(cachedBox(0.76, 0.92, 0.44), coatMat);
    torso.position.y = 1.24;
    const belt = new THREE.Mesh(cachedBox(0.82, 0.14, 0.48), leatherMat);
    belt.position.y = 0.86;
    const buckle = new THREE.Mesh(cachedBox(0.18, 0.16, 0.1), steelMat);
    buckle.position.set(0, 0.86, 0.25);
    const sash = new THREE.Mesh(cachedBox(0.8, 0.16, 0.48), hoodMat);
    sash.position.y = 1.54;
    const pouch = new THREE.Mesh(cachedBox(0.18, 0.22, 0.18), leatherMat);
    pouch.position.set(0.38, 0.84, 0.1);
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.12), hoodMat);
    cape.position.set(0, 1.18, -0.25);
    cape.rotation.x = 0.14;

    head = new THREE.Group();
    head.position.set(0, 1.72, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.56, 0.56, 0.56), coatMat);
    headMesh.position.y = 0.28;
    const scarfMask = new THREE.Mesh(cachedBox(0.6, 0.18, 0.6), hoodMat);
    scarfMask.position.y = 0.14;
    const hat =
      kind === 'swamp_witch'
        ? new THREE.Mesh(cachedBox(0.46, 0.54, 0.46), hoodMat)
        : new THREE.Mesh(cachedBox(0.62, 0.22, 0.62), hoodMat);
    hat.position.y = kind === 'swamp_witch' ? 0.84 : 0.48;
    const eyeL = new THREE.Mesh(cachedBox(0.11, 0.08, 0.06), eyeMat);
    eyeL.position.set(-0.12, 0.29, 0.29);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.12;
    head.add(headMesh, scarfMask, hat, eyeL, eyeR);
    if (kind === 'swamp_witch') {
      const brim = new THREE.Mesh(cachedBox(0.96, 0.08, 0.96), hoodMat);
      brim.position.y = 0.56;
      const hatBand = new THREE.Mesh(cachedBox(0.5, 0.1, 0.5), eyeMat);
      hatBand.position.y = 0.64;
      head.add(brim, hatBand);
      const auraGrp = new THREE.Group();
      auraGrp.position.set(0, 1.5, 0);
      const orbA = new THREE.Mesh(cachedBox(0.18, 0.18, 0.18), eyeMat);
      orbA.position.set(0.75, 0.2, 0);
      const orbB = orbA.clone();
      orbB.position.set(-0.75, -0.1, 0);
      auraGrp.add(orbA, orbB);
      aura = auraGrp;
      body.add(auraGrp);
    }

    leftArm = new THREE.Group();
    leftArm.position.set(-0.5, 1.62, 0);
    const lPad = new THREE.Mesh(cachedBox(0.32, 0.2, 0.34), hoodMat);
    lPad.position.y = -0.02;
    const lArmM = new THREE.Mesh(cachedBox(0.24, 0.72, 0.24), coatMat);
    lArmM.position.y = -0.36;
    const lBracer = new THREE.Mesh(cachedBox(0.26, 0.18, 0.26), leatherMat);
    lBracer.position.y = -0.56;
    leftArm.add(lPad, lArmM, lBracer);
    rightArm = new THREE.Group();
    rightArm.position.set(0.5, 1.62, 0);
    rightArm.add(lPad.clone(), lArmM.clone(), lBracer.clone());
    if (kind === 'swamp_witch') {
      const staff = new THREE.Mesh(cachedBox(0.08, 1.65, 0.08), leatherMat);
      staff.position.set(0, -0.45, 0.24);
      const orb = new THREE.Mesh(cachedBox(0.24, 0.24, 0.24), eyeMat);
      orb.position.set(0, 0.35, 0.24);
      rightArm.add(staff, orb);
    } else {
      const dagger = new THREE.Mesh(cachedBox(0.08, 0.12, 0.68), steelMat);
      dagger.position.set(0, -0.6, 0.34);
      const guard = new THREE.Mesh(cachedBox(0.2, 0.08, 0.08), hoodMat);
      guard.position.set(0, -0.6, 0.12);
      rightArm.add(dagger, guard);
      if (kind === 'dune_stalker') {
        leftArm.add(dagger.clone(), guard.clone());
      }
    }

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.2, 0.78, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.28, 0.78, 0.28), leatherMat);
    lLegM.position.y = -0.39;
    const lBoot = new THREE.Mesh(cachedBox(0.3, 0.18, 0.34), coatMat);
    lBoot.position.set(0, -0.68, 0.02);
    leftLeg.add(lLegM, lBoot);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.2, 0.78, 0);
    rightLeg.add(lLegM.clone(), lBoot.clone());

    body.add(torso, belt, buckle, sash, pouch, cape, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headMesh);
  } else if (kind === 'desert_scorpion') {
    const chMat = new THREE.MeshStandardMaterial({ map: textures.scorpionCarapace, roughness: 0.48 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
    const stingMat = new THREE.MeshStandardMaterial({ color: 0xa3e635, emissive: 0x65a30d, emissiveIntensity: 1.4 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 1.6 });

    const torso = new THREE.Mesh(cachedBox(0.88, 0.44, 1.08), chMat);
    torso.position.y = 0.52;
    const ridge1 = new THREE.Mesh(cachedBox(0.76, 0.12, 0.28), trimMat);
    ridge1.position.set(0, 0.78, 0.16);
    const ridge2 = ridge1.clone();
    ridge2.position.z = -0.26;

    head = new THREE.Group();
    head.position.set(0, 0.56, 0.58);
    const helm = new THREE.Mesh(cachedBox(0.56, 0.24, 0.26), trimMat);
    helm.position.set(0, 0.08, -0.02);
    const eyeL = new THREE.Mesh(cachedBox(0.1, 0.08, 0.06), eyeMat);
    eyeL.position.set(-0.18, 0.08, 0.08);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;
    head.add(helm, eyeL, eyeR);

    tail = new THREE.Group();
    tail.position.set(0, 0.65, -0.54);
    const seg1 = new THREE.Mesh(cachedBox(0.24, 0.52, 0.24), chMat);
    seg1.position.set(0, 0.24, -0.06);
    seg1.rotation.x = 0.28;
    const seg2 = new THREE.Mesh(cachedBox(0.2, 0.54, 0.2), trimMat);
    seg2.position.set(0, 0.66, 0.08);
    seg2.rotation.x = 0.82;
    const stinger = new THREE.Mesh(cachedBox(0.16, 0.16, 0.34), stingMat);
    stinger.position.set(0, 0.86, 0.38);
    tail.add(seg1, seg2, stinger);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.48, 0.56, 0.52);
    const pArmL = new THREE.Mesh(cachedBox(0.18, 0.16, 0.44), chMat);
    pArmL.position.z = 0.22;
    const pClawL = new THREE.Mesh(cachedBox(0.32, 0.24, 0.38), trimMat);
    pClawL.position.set(-0.04, 0.02, 0.54);
    const pincerTipL = new THREE.Mesh(cachedBox(0.12, 0.14, 0.2), eyeMat);
    pincerTipL.position.set(-0.04, 0.02, 0.78);
    leftArm.add(pArmL, pClawL, pincerTipL);
    rightArm = new THREE.Group();
    rightArm.position.set(0.48, 0.56, 0.52);
    const pClawR = pClawL.clone();
    pClawR.position.x = 0.04;
    const pincerTipR = pincerTipL.clone();
    pincerTipR.position.x = 0.04;
    rightArm.add(pArmL.clone(), pClawR, pincerTipR);

    const makeScorpLeg = (x: number, z: number) => {
      const lg = new THREE.Group();
      lg.position.set(x, 0.44, z);
      const m = new THREE.Mesh(cachedBox(0.44, 0.12, 0.12), chMat);
      m.position.x = Math.sign(x) * 0.22;
      m.rotation.z = Math.sign(x) * -0.3;
      const tip = new THREE.Mesh(cachedBox(0.12, 0.14, 0.12), trimMat);
      tip.position.set(Math.sign(x) * 0.42, -0.08, 0);
      lg.add(m, tip);
      return lg;
    };
    legFL = makeScorpLeg(-0.44, 0.36);
    legFR = makeScorpLeg(0.44, 0.36);
    const legML = makeScorpLeg(-0.46, 0.0);
    const legMR = makeScorpLeg(0.46, 0.0);
    legBL = makeScorpLeg(-0.44, -0.36);
    legBR = makeScorpLeg(0.44, -0.36);
    extraLimbs = [legML, legMR];
    body.add(torso, ridge1, ridge2, head, tail, leftArm, rightArm, legFL, legFR, legML, legMR, legBL, legBR);
    hitFlashMeshes.push(torso, seg1, seg2);
  } else if (kind === 'sand_mummy') {
    const wrapMat = new THREE.MeshStandardMaterial({ map: textures.mummyWrap, roughness: 0.88 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.78, roughness: 0.28 });
    const lapisMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xd97706, emissiveIntensity: 1.7 });

    const torso = new THREE.Mesh(cachedBox(0.74, 0.92, 0.42), wrapMat);
    torso.position.y = 1.24;
    const collar = new THREE.Mesh(cachedBox(0.82, 0.16, 0.5), goldMat);
    collar.position.y = 1.64;
    const chestScarab = new THREE.Mesh(cachedBox(0.24, 0.24, 0.1), lapisMat);
    chestScarab.position.set(0, 1.38, 0.22);
    const belt = new THREE.Mesh(cachedBox(0.8, 0.14, 0.48), lapisMat);
    belt.position.y = 0.88;

    head = new THREE.Group();
    head.position.set(0, 1.74, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.58, 0.58, 0.58), wrapMat);
    headMesh.position.y = 0.29;
    const crown = new THREE.Mesh(cachedBox(0.64, 0.14, 0.64), goldMat);
    crown.position.y = 0.52;
    const uraeus = new THREE.Mesh(cachedBox(0.12, 0.24, 0.12), eyeMat);
    uraeus.position.set(0, 0.64, 0.28);
    const nemesL = new THREE.Mesh(cachedBox(0.12, 0.46, 0.36), lapisMat);
    nemesL.position.set(-0.34, 0.26, -0.06);
    const nemesR = nemesL.clone();
    nemesR.position.x = 0.34;
    const eyeL = new THREE.Mesh(cachedBox(0.11, 0.08, 0.06), eyeMat);
    eyeL.position.set(-0.13, 0.3, 0.3);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.13;
    head.add(headMesh, crown, uraeus, nemesL, nemesR, eyeL, eyeR);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.48, 1.56, 0);
    const lArmM = new THREE.Mesh(cachedBox(0.22, 0.22, 0.72), wrapMat);
    lArmM.position.set(0, -0.06, 0.32);
    const lBangle = new THREE.Mesh(cachedBox(0.26, 0.26, 0.14), goldMat);
    lBangle.position.set(0, -0.06, 0.52);
    leftArm.add(lArmM, lBangle);
    rightArm = new THREE.Group();
    rightArm.position.set(0.48, 1.56, 0);
    rightArm.add(lArmM.clone(), lBangle.clone());

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.2, 0.76, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.26, 0.76, 0.26), wrapMat);
    lLegM.position.y = -0.38;
    const lAnklet = new THREE.Mesh(cachedBox(0.3, 0.14, 0.3), goldMat);
    lAnklet.position.y = -0.64;
    leftLeg.add(lLegM, lAnklet);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.2, 0.76, 0);
    rightLeg.add(lLegM.clone(), lAnklet.clone());
    body.add(torso, collar, chestScarab, belt, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headMesh);
  } else if (kind === 'sand_colossus' || kind === 'frost_yeti' || kind === 'crystal_golem') {
    const texMap =
      kind === 'sand_colossus'
        ? textures.golemStone
        : kind === 'frost_yeti'
          ? textures.yetiFur
          : textures.crystalSurface;
    const bodyHex =
      kind === 'sand_colossus' ? 0xf59e0b : kind === 'frost_yeti' ? 0xffffff : 0x67e8f9;
    const coreHex =
      kind === 'sand_colossus' ? 0xfacc15 : kind === 'frost_yeti' ? 0x38bdf8 : 0xe879f9;
    const trimHex =
      kind === 'sand_colossus' ? 0x92400e : kind === 'frost_yeti' ? 0x94a3b8 : 0x1e1b4b;
    const mainMat = new THREE.MeshStandardMaterial({
      map: texMap,
      color: bodyHex,
      roughness: kind === 'crystal_golem' ? 0.25 : 0.82,
      metalness: kind === 'crystal_golem' ? 0.6 : 0.1,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: trimHex, roughness: 0.6, metalness: 0.35 });
    const coreMat = new THREE.MeshStandardMaterial({ color: coreHex, emissive: coreHex, emissiveIntensity: 1.65 });

    const torso = new THREE.Mesh(cachedBox(1.48, 1.38, 0.92), mainMat);
    torso.position.y = 1.78;
    const beltBand = new THREE.Mesh(cachedBox(1.56, 0.22, 0.98), trimMat);
    beltBand.position.y = 1.24;
    const core = new THREE.Mesh(cachedBox(0.42, 0.42, 0.16), coreMat);
    core.position.set(0, 1.82, 0.48);
    const backSpire1 = new THREE.Mesh(cachedBox(0.28, 0.56, 0.28), coreMat);
    backSpire1.position.set(-0.34, 2.38, -0.34);
    const backSpire2 = backSpire1.clone();
    backSpire2.position.x = 0.34;

    if (kind === 'crystal_golem') {
      const auraGrp = new THREE.Group();
      auraGrp.position.set(0, 2.0, 0);
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2;
        const cr = new THREE.Mesh(cachedBox(0.22, 0.34, 0.22), coreMat);
        cr.position.set(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25);
        auraGrp.add(cr);
      }
      aura = auraGrp;
      body.add(auraGrp);
    }

    head = new THREE.Group();
    head.position.set(0, 2.52, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.82, 0.76, 0.8), mainMat);
    headMesh.position.y = 0.38;
    const brow = new THREE.Mesh(cachedBox(0.88, 0.16, 0.86), trimMat);
    brow.position.y = 0.62;
    const eyeL = new THREE.Mesh(cachedBox(0.16, 0.12, 0.08), coreMat);
    eyeL.position.set(-0.18, 0.38, 0.41);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;
    head.add(headMesh, brow, eyeL, eyeR);
    if (kind === 'frost_yeti') {
      const hornL = new THREE.Mesh(cachedBox(0.16, 0.42, 0.16), coreMat);
      hornL.position.set(-0.42, 0.74, 0);
      hornL.rotation.z = 0.45;
      const hornR = hornL.clone();
      hornR.position.x = 0.42;
      hornR.rotation.z = -0.45;
      head.add(hornL, hornR);
    } else {
      const crest = new THREE.Mesh(cachedBox(0.24, 0.36, 0.24), coreMat);
      crest.position.y = 0.88;
      head.add(crest);
    }

    leftArm = new THREE.Group();
    leftArm.position.set(-1.02, 2.3, 0);
    const lShoulder = new THREE.Mesh(cachedBox(0.62, 0.42, 0.62), trimMat);
    const lArmM = new THREE.Mesh(cachedBox(0.48, 1.26, 0.48), mainMat);
    lArmM.position.y = -0.63;
    const lFistBand = new THREE.Mesh(cachedBox(0.54, 0.18, 0.54), coreMat);
    lFistBand.position.y = -1.04;
    leftArm.add(lShoulder, lArmM, lFistBand);
    rightArm = new THREE.Group();
    rightArm.position.set(1.02, 2.3, 0);
    rightArm.add(lShoulder.clone(), lArmM.clone(), lFistBand.clone());

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.42, 1.08, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.52, 1.08, 0.52), mainMat);
    lLegM.position.y = -0.54;
    const lGreave = new THREE.Mesh(cachedBox(0.56, 0.24, 0.56), trimMat);
    lGreave.position.y = -0.84;
    leftLeg.add(lLegM, lGreave);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.42, 1.08, 0);
    rightLeg.add(lLegM.clone(), lGreave.clone());

    body.add(torso, beltBand, core, backSpire1, backSpire2, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headMesh, lArmM);
  } else if (kind === 'ice_wraith') {
    const iceMat = new THREE.MeshStandardMaterial({
      map: textures.iceSpirit,
      color: 0xe0f2fe,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.9,
    });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.8 });
    const darkIceMat = new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.35, metalness: 0.45 });
    const robe = new THREE.Mesh(cachedBox(0.86, 1.56, 0.62), iceMat);
    robe.position.y = 1.48;
    const sash = new THREE.Mesh(cachedBox(0.92, 0.16, 0.68), darkIceMat);
    sash.position.y = 1.24;
    const frostCore = new THREE.Mesh(cachedBox(0.36, 0.36, 0.16), coreMat);
    frostCore.position.set(0, 1.72, 0.28);

    const auraGrp = new THREE.Group();
    auraGrp.position.set(0, 1.85, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const icicle = new THREE.Mesh(cachedBox(0.14, 0.34, 0.14), coreMat);
      icicle.position.set(Math.cos(a) * 0.92, 0, Math.sin(a) * 0.92);
      auraGrp.add(icicle);
    }
    aura = auraGrp;

    head = new THREE.Group();
    head.position.set(0, 2.26, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.58, 0.62, 0.58), iceMat);
    headMesh.position.y = 0.31;
    const crownRim = new THREE.Mesh(cachedBox(0.64, 0.12, 0.64), darkIceMat);
    crownRim.position.y = 0.56;
    const crown = new THREE.Mesh(cachedBox(0.28, 0.34, 0.28), coreMat);
    crown.position.y = 0.74;
    const eyeL = new THREE.Mesh(cachedBox(0.11, 0.08, 0.06), coreMat);
    eyeL.position.set(-0.13, 0.32, 0.3);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.13;
    head.add(headMesh, crownRim, crown, eyeL, eyeR);

    wingL = new THREE.Group();
    wingL.position.set(-0.44, 1.9, -0.15);
    const wShardL = new THREE.Mesh(cachedBox(0.76, 0.56, 0.08), iceMat);
    wShardL.position.set(-0.38, 0.1, 0);
    const wTipL = new THREE.Mesh(cachedBox(0.28, 0.34, 0.1), coreMat);
    wTipL.position.set(-0.78, 0.24, 0);
    wingL.add(wShardL, wTipL);
    wingR = new THREE.Group();
    wingR.position.set(0.44, 1.9, -0.15);
    const wShardR = wShardL.clone();
    wShardR.position.x = 0.38;
    const wTipR = wTipL.clone();
    wTipR.position.x = 0.78;
    wingR.add(wShardR, wTipR);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.58, 1.98, 0);
    const shard = new THREE.Mesh(cachedBox(0.2, 0.72, 0.2), iceMat);
    shard.position.y = -0.34;
    const cuff = new THREE.Mesh(cachedBox(0.26, 0.14, 0.26), coreMat);
    cuff.position.y = -0.58;
    leftArm.add(shard, cuff);
    rightArm = new THREE.Group();
    rightArm.position.set(0.58, 1.98, 0);
    rightArm.add(shard.clone(), cuff.clone());
    body.add(robe, sash, frostCore, auraGrp, head, wingL, wingR, leftArm, rightArm);
    hitFlashMeshes.push(robe, headMesh);
  } else if (kind === 'void_bat') {
    const batMat = new THREE.MeshStandardMaterial({ map: textures.banditCloth, color: 0x4c1d95, roughness: 0.65 });
    const membraneMat = new THREE.MeshStandardMaterial({ color: 0x2e1065, roughness: 0.6, side: THREE.DoubleSide });
    const neonMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0xa855f7, emissiveIntensity: 1.5 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 1.8 });

    const torso = new THREE.Mesh(cachedBox(0.62, 0.72, 0.58), batMat);
    torso.position.y = 1.65;
    const chestRune = new THREE.Mesh(cachedBox(0.24, 0.26, 0.12), neonMat);
    chestRune.position.set(0, 1.66, 0.3);

    head = new THREE.Group();
    head.position.set(0, 1.88, 0.16);
    const earL = new THREE.Mesh(cachedBox(0.14, 0.28, 0.1), batMat);
    earL.position.set(-0.18, 0.28, 0);
    const earR = earL.clone();
    earR.position.x = 0.18;
    const fangL = new THREE.Mesh(cachedBox(0.06, 0.12, 0.06), neonMat);
    fangL.position.set(-0.1, -0.14, 0.22);
    const fangR = fangL.clone();
    fangR.position.x = 0.1;
    const eyeL = new THREE.Mesh(cachedBox(0.1, 0.08, 0.06), eyeMat);
    eyeL.position.set(-0.12, -0.02, 0.22);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.12;
    head.add(earL, earR, fangL, fangR, eyeL, eyeR);

    wingL = new THREE.Group();
    wingL.position.set(-0.32, 1.72, 0);
    const wMemL = new THREE.Mesh(cachedBox(0.96, 0.48, 0.06), membraneMat);
    wMemL.position.set(-0.48, 0, -0.08);
    const wEdgeL = new THREE.Mesh(cachedBox(0.98, 0.1, 0.09), neonMat);
    wEdgeL.position.set(-0.48, 0.24, -0.06);
    wingL.add(wMemL, wEdgeL);

    wingR = new THREE.Group();
    wingR.position.set(0.32, 1.72, 0);
    const wMemR = wMemL.clone();
    wMemR.position.x = 0.48;
    const wEdgeR = wEdgeL.clone();
    wEdgeR.position.x = 0.48;
    wingR.add(wMemR, wEdgeR);

    tail = new THREE.Group();
    tail.position.set(0, 1.42, -0.28);
    const vTail = new THREE.Mesh(cachedBox(0.1, 0.1, 0.42), batMat);
    vTail.position.set(0, 0.04, -0.2);
    const vTip = new THREE.Mesh(cachedBox(0.18, 0.18, 0.14), neonMat);
    vTip.position.set(0, 0.06, -0.42);
    tail.add(vTail, vTip);

    body.add(torso, chestRune, head, wingL, wingR, tail);
    hitFlashMeshes.push(torso, wMemL, wMemR);
  } else if (kind === 'magma_hound') {
    const obsMat = new THREE.MeshStandardMaterial({ map: textures.magmaCrust, roughness: 0.8 });
    const lavaMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.75 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.82, roughness: 0.28 });
    const torso = new THREE.Mesh(cachedBox(0.72, 0.64, 1.24), obsMat);
    torso.position.y = 0.85;
    const spine = new THREE.Mesh(cachedBox(0.22, 0.2, 1.02), lavaMat);
    spine.position.y = 1.22;
    const collar = new THREE.Mesh(cachedBox(0.78, 0.2, 0.22), collarMat);
    collar.position.set(0, 0.92, 0.48);

    head = new THREE.Group();
    head.position.set(0, 1.0, 0.66);
    const headMesh = new THREE.Mesh(cachedBox(0.56, 0.5, 0.56), obsMat);
    headMesh.position.set(0, 0, 0.16);
    const snout = new THREE.Mesh(cachedBox(0.3, 0.22, 0.34), obsMat);
    snout.position.set(0, -0.08, 0.44);
    const jawGlow = new THREE.Mesh(cachedBox(0.24, 0.08, 0.24), lavaMat);
    jawGlow.position.set(0, -0.2, 0.42);
    const hornL = new THREE.Mesh(cachedBox(0.12, 0.28, 0.12), lavaMat);
    hornL.position.set(-0.2, 0.34, 0.04);
    const hornR = hornL.clone();
    hornR.position.x = 0.2;
    const eyeL = new THREE.Mesh(cachedBox(0.1, 0.08, 0.06), lavaMat);
    eyeL.position.set(-0.15, 0.08, 0.44);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.15;
    head.add(headMesh, snout, jawGlow, hornL, hornR, eyeL, eyeR);

    tail = new THREE.Group();
    tail.position.set(0, 0.96, -0.66);
    const tailM = new THREE.Mesh(cachedBox(0.16, 0.16, 0.58), lavaMat);
    tailM.position.set(0, 0.12, -0.28);
    tailM.rotation.x = 0.45;
    tail.add(tailM);

    const makeLeg = (x: number, z: number) => {
      const lg = new THREE.Group();
      lg.position.set(x, 0.54, z);
      const m = new THREE.Mesh(cachedBox(0.2, 0.42, 0.2), obsMat);
      m.position.y = -0.21;
      const paw = new THREE.Mesh(cachedBox(0.22, 0.14, 0.24), lavaMat);
      paw.position.y = -0.47;
      lg.add(m, paw);
      return lg;
    };
    legFL = makeLeg(-0.28, 0.48);
    legFR = makeLeg(0.28, 0.48);
    legBL = makeLeg(-0.28, -0.48);
    legBR = makeLeg(0.28, -0.48);
    body.add(torso, spine, collar, head, tail, legFL, legFR, legBL, legBR);
    hitFlashMeshes.push(torso, headMesh);
  } else if (kind === 'lava_imp') {
    const skinMat = new THREE.MeshStandardMaterial({ map: textures.magmaCrust, color: 0xf87171, roughness: 0.65 });
    const obsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.35 });
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf97316, emissiveIntensity: 1.75 });
    const torso = new THREE.Mesh(cachedBox(0.64, 0.78, 0.42), skinMat);
    torso.position.y = 1.12;
    const belt = new THREE.Mesh(cachedBox(0.7, 0.14, 0.48), obsMat);
    belt.position.y = 0.84;
    const chestCore = new THREE.Mesh(cachedBox(0.22, 0.22, 0.1), flameMat);
    chestCore.position.set(0, 1.24, 0.22);

    head = new THREE.Group();
    head.position.set(0, 1.54, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.52, 0.52, 0.52), skinMat);
    headMesh.position.y = 0.28;
    const brow = new THREE.Mesh(cachedBox(0.56, 0.1, 0.56), obsMat);
    brow.position.y = 0.44;
    const hornL = new THREE.Mesh(cachedBox(0.12, 0.32, 0.12), flameMat);
    hornL.position.set(-0.18, 0.64, 0);
    const hornR = hornL.clone();
    hornR.position.x = 0.18;
    const eyeL = new THREE.Mesh(cachedBox(0.1, 0.08, 0.06), flameMat);
    eyeL.position.set(-0.12, 0.3, 0.27);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.12;
    head.add(headMesh, brow, hornL, hornR, eyeL, eyeR);

    wingL = new THREE.Group();
    wingL.position.set(-0.26, 1.38, -0.22);
    const impWingL = new THREE.Mesh(cachedBox(0.56, 0.42, 0.06), flameMat);
    impWingL.position.set(-0.28, 0.08, 0);
    wingL.add(impWingL);
    wingR = new THREE.Group();
    wingR.position.set(0.26, 1.38, -0.22);
    const impWingR = impWingL.clone();
    impWingR.position.x = 0.28;
    wingR.add(impWingR);

    tail = new THREE.Group();
    tail.position.set(0, 0.86, -0.22);
    const impTail = new THREE.Mesh(cachedBox(0.1, 0.1, 0.54), obsMat);
    impTail.position.set(0, 0.08, -0.24);
    const impSpade = new THREE.Mesh(cachedBox(0.22, 0.22, 0.14), flameMat);
    impSpade.position.set(0, 0.12, -0.52);
    tail.add(impTail, impSpade);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.44, 1.44, 0);
    const lArmM = new THREE.Mesh(cachedBox(0.2, 0.62, 0.2), skinMat);
    lArmM.position.y = -0.31;
    const lBrace = new THREE.Mesh(cachedBox(0.24, 0.14, 0.24), obsMat);
    lBrace.position.y = -0.46;
    leftArm.add(lArmM, lBrace);
    rightArm = new THREE.Group();
    rightArm.position.set(0.44, 1.44, 0);
    const rArmM = lArmM.clone();
    const fireOrb = new THREE.Mesh(cachedBox(0.24, 0.24, 0.24), flameMat);
    fireOrb.position.set(0, -0.62, 0.14);
    rightArm.add(rArmM, lBrace.clone(), fireOrb);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.18, 0.72, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.22, 0.72, 0.22), skinMat);
    lLegM.position.y = -0.36;
    const lHoof = new THREE.Mesh(cachedBox(0.24, 0.16, 0.26), obsMat);
    lHoof.position.y = -0.64;
    leftLeg.add(lLegM, lHoof);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.18, 0.72, 0);
    rightLeg.add(lLegM.clone(), lHoof.clone());
    body.add(torso, belt, chestCore, head, wingL, wingR, tail, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headMesh);
  } else if (kind === 'cursed_knight') {
    const armorMat = new THREE.MeshStandardMaterial({ map: textures.cursedArmor, metalness: 0.84, roughness: 0.24 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 1.75 });
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.82, side: THREE.DoubleSide });

    const torso = new THREE.Mesh(cachedBox(1.02, 1.14, 0.62), armorMat);
    torso.position.y = 1.56;
    const beltTrim = new THREE.Mesh(cachedBox(1.08, 0.18, 0.68), glowMat);
    beltTrim.position.y = 1.12;
    const core = new THREE.Mesh(cachedBox(0.32, 0.32, 0.14), glowMat);
    core.position.set(0, 1.65, 0.33);
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.48), capeMat);
    cape.position.set(0, 1.38, -0.34);
    cape.rotation.x = 0.14;

    const auraGrp = new THREE.Group();
    auraGrp.position.set(0, 2.0, 0);
    for (let s = 0; s < 3; s++) {
      const a = (s / 3) * Math.PI * 2;
      const orb = new THREE.Mesh(cachedBox(0.2, 0.2, 0.2), glowMat);
      orb.position.set(Math.cos(a) * 0.96, 0, Math.sin(a) * 0.96);
      auraGrp.add(orb);
    }
    aura = auraGrp;

    head = new THREE.Group();
    head.position.set(0, 2.16, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.68, 0.68, 0.68), armorMat);
    headMesh.position.y = 0.34;
    const visor = new THREE.Mesh(cachedBox(0.54, 0.14, 0.1), glowMat);
    visor.position.set(0, 0.34, 0.35);
    const crest = new THREE.Mesh(cachedBox(0.16, 0.22, 0.58), glowMat);
    crest.position.set(0, 0.74, -0.02);
    const hornL = new THREE.Mesh(cachedBox(0.14, 0.44, 0.14), glowMat);
    hornL.position.set(-0.3, 0.78, 0);
    hornL.rotation.z = 0.3;
    const hornR = hornL.clone();
    hornR.position.x = 0.3;
    hornR.rotation.z = -0.3;
    head.add(headMesh, visor, crest, hornL, hornR);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.72, 2.04, 0);
    const lPauldron = new THREE.Mesh(cachedBox(0.44, 0.3, 0.46), armorMat);
    const lArmM = new THREE.Mesh(cachedBox(0.32, 0.92, 0.32), armorMat);
    lArmM.position.y = -0.46;
    const kiteShield = new THREE.Mesh(cachedBox(0.12, 0.88, 0.62), armorMat);
    kiteShield.position.set(-0.18, -0.52, 0.18);
    const shieldRune = new THREE.Mesh(cachedBox(0.14, 0.34, 0.18), glowMat);
    shieldRune.position.set(-0.18, -0.52, 0.18);
    leftArm.add(lPauldron, lArmM, kiteShield, shieldRune);

    rightArm = new THREE.Group();
    rightArm.position.set(0.72, 2.04, 0);
    const rArmM = lArmM.clone();
    const sword = new THREE.Mesh(cachedBox(0.14, 0.16, 1.38), armorMat);
    sword.position.set(0, -0.82, 0.62);
    const swordEdge = new THREE.Mesh(cachedBox(0.18, 0.08, 1.12), glowMat);
    swordEdge.position.set(0, -0.82, 0.62);
    rightArm.add(lPauldron.clone(), rArmM, sword, swordEdge);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.28, 1.0, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.36, 1.0, 0.36), armorMat);
    lLegM.position.y = -0.5;
    const lGreave = new THREE.Mesh(cachedBox(0.4, 0.18, 0.4), glowMat);
    lGreave.position.y = -0.55;
    leftLeg.add(lLegM, lGreave);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.28, 1.0, 0);
    rightLeg.add(lLegM.clone(), lGreave.clone());
    body.add(torso, beltTrim, core, cape, auraGrp, head, leftArm, rightArm, leftLeg, rightLeg);
    hitFlashMeshes.push(torso, headMesh);
  }

  const shadowScale =
    kind === 'secret_boss'
      ? 4.0
      : kind === 'final_boss'
        ? 3.2
        : kind === 'golem' || kind === 'boss' || kind === 'sand_colossus' || kind === 'frost_yeti' || kind === 'crystal_golem' || kind === 'forest_ent' || kind === 'cursed_knight'
          ? 2.4
          : 1.5;
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
    kind === 'slime'
      ? 1.48
      : kind === 'wolf' || kind === 'dire_boar' || kind === 'giant_spider' || kind === 'desert_scorpion' || kind === 'magma_hound'
        ? 1.75
        : kind === 'mushroom_imp' || kind === 'goblin' || kind === 'skeleton' || kind === 'bandit_raider' || kind === 'swamp_witch' || kind === 'sand_mummy' || kind === 'dune_stalker' || kind === 'lava_imp' || kind === 'void_bat' || kind === 'ice_wraith'
          ? 2.55
          : kind === 'final_boss'
            ? 4.95
            : kind === 'secret_boss'
              ? 5.65
              : 3.7;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(kind === 'secret_boss' ? 2.15 : kind === 'final_boss' ? 1.85 : 1.3, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }),
  );
  hpBarBg.position.set(0, barY, 0);
  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(kind === 'secret_boss' ? 2.05 : kind === 'final_boss' ? 1.77 : 1.22, 0.1),
    new THREE.MeshBasicMaterial({
      color:
        kind === 'secret_boss'
          ? 0x22d3ee
          : kind === 'final_boss'
            ? 0xc084fc
            : kind === 'boss' || kind === 'cursed_knight'
              ? 0xf43f5e
              : 0x22c55e,
      side: THREE.DoubleSide,
    }),
  );
  hpBarFill.position.set(0, 0, 0.01);
  hpBarBg.add(hpBarFill);
  hpBarBg.visible = kind === 'boss' || kind === 'final_boss' || kind === 'secret_boss' || kind === 'cursed_knight';
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
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    legFL,
    legFR,
    legBL,
    legBR,
    wingL,
    wingR,
    tail,
    jaw,
    extraLimbs,
    aura,
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
  tail?: THREE.Group;
  hpBarBg?: THREE.Mesh;
  hpBarFill?: THREE.Mesh;
  hitFlashMeshes?: THREE.Mesh[];
}

export function buildPeacefulMobModel(kind: PeacefulMobKind, textures: ProceduralTextures): PeacefulMobVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hitFlashMeshes: THREE.Mesh[] = [];
  let hpBarBg: THREE.Mesh | undefined;
  let hpBarFill: THREE.Mesh | undefined;

  let head: THREE.Group | undefined;
  let leftArm: THREE.Group | undefined;
  let rightArm: THREE.Group | undefined;
  let leftLeg: THREE.Group | undefined;
  let rightLeg: THREE.Group | undefined;
  let legFL: THREE.Group | undefined;
  let legFR: THREE.Group | undefined;
  let legBL: THREE.Group | undefined;
  let legBR: THREE.Group | undefined;
  let tail: THREE.Group | undefined;

  if (kind === 'deer') {
    const coatMat = new THREE.MeshStandardMaterial({ map: textures.deerCoat, roughness: 0.8 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf5e8d3, roughness: 0.85 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.75 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xe7d6b9, roughness: 0.65 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.82 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.45 });

    const torso = new THREE.Mesh(cachedBox(0.64, 0.62, 1.18), coatMat);
    torso.position.y = 1.05;
    const belly = new THREE.Mesh(cachedBox(0.56, 0.16, 1.06), bellyMat);
    belly.position.set(0, 0.72, 0);
    const spotL = new THREE.Mesh(cachedBox(0.06, 0.12, 0.16), bellyMat);
    spotL.position.set(-0.33, 1.16, -0.18);
    const spotR = spotL.clone();
    spotR.position.set(0.33, 1.12, 0.12);
    const collar = new THREE.Mesh(cachedBox(0.34, 0.12, 0.34), leatherMat);
    collar.position.set(0, 1.38, 0.52);

    tail = new THREE.Group();
    tail.position.set(0, 1.18, -0.62);
    const tailM = new THREE.Mesh(cachedBox(0.14, 0.24, 0.14), bellyMat);
    tailM.position.set(0, 0.06, -0.06);
    tailM.rotation.x = -0.45;
    tail.add(tailM);

    head = new THREE.Group();
    head.position.set(0, 1.32, 0.52);
    const neck = new THREE.Mesh(cachedBox(0.28, 0.48, 0.28), coatMat);
    neck.position.set(0, 0.2, 0.08);
    neck.rotation.x = 0.22;
    const skull = new THREE.Mesh(cachedBox(0.38, 0.36, 0.44), coatMat);
    skull.position.set(0, 0.5, 0.22);
    const snout = new THREE.Mesh(cachedBox(0.24, 0.2, 0.22), bellyMat);
    snout.position.set(0, 0.44, 0.48);
    const nose = new THREE.Mesh(cachedBox(0.1, 0.08, 0.06), noseMat);
    nose.position.set(0, 0.47, 0.6);
    const eyeL = new THREE.Mesh(cachedBox(0.06, 0.07, 0.05), noseMat);
    eyeL.position.set(-0.18, 0.55, 0.34);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;
    const earL = new THREE.Mesh(cachedBox(0.16, 0.1, 0.08), coatMat);
    earL.position.set(-0.24, 0.64, 0.12);
    earL.rotation.z = 0.4;
    const earR = earL.clone();
    earR.position.x = 0.24;
    earR.rotation.z = -0.4;

    for (const side of [-1, 1]) {
      const stem = new THREE.Mesh(cachedBox(0.06, 0.46, 0.06), antlerMat);
      stem.position.set(side * 0.12, 0.86, 0.18);
      stem.rotation.z = -side * 0.24;
      const fork = new THREE.Mesh(cachedBox(0.05, 0.24, 0.05), antlerMat);
      fork.position.set(side * 0.22, 0.94, 0.24);
      fork.rotation.z = -side * 0.55;
      head.add(stem, fork);
    }
    head.add(neck, skull, snout, nose, eyeL, eyeR, earL, earR);

    const makeLeg = (lx: number, lz: number) => {
      const lg = new THREE.Group();
      lg.position.set(lx, 0.82, lz);
      const upper = new THREE.Mesh(cachedBox(0.14, 0.68, 0.14), coatMat);
      upper.position.y = -0.34;
      const hoof = new THREE.Mesh(cachedBox(0.15, 0.14, 0.15), hoofMat);
      hoof.position.y = -0.75;
      lg.add(upper, hoof);
      return lg;
    };
    legFL = makeLeg(-0.2, 0.42);
    legFR = makeLeg(0.2, 0.42);
    legBL = makeLeg(-0.2, -0.42);
    legBR = makeLeg(0.2, -0.42);

    body.add(torso, belly, spotL, spotR, collar, tail, head, legFL, legFR, legBL, legBR);
    hitFlashMeshes.push(torso, skull);
    hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }),
    );
    hpBarBg.position.set(0, 2.25, 0);
    hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 0.09),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, side: THREE.DoubleSide }),
    );
    hpBarFill.position.set(0, 0, 0.01);
    hpBarBg.add(hpBarFill);
    hpBarBg.visible = false;
    root.add(hpBarBg);
  } else if (kind === 'sheep') {
    const woolMat = new THREE.MeshStandardMaterial({ map: textures.sheepWool, roughness: 0.95 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x3f3a36, roughness: 0.8 });
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.72 });
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 });

    const fleece = new THREE.Mesh(cachedBox(0.86, 0.74, 1.06), woolMat);
    fleece.position.y = 0.84;
    const collar = new THREE.Mesh(cachedBox(0.56, 0.12, 0.18), ribbonMat);
    collar.position.set(0, 0.92, 0.5);
    const bell = new THREE.Mesh(cachedBox(0.14, 0.16, 0.14), bellMat);
    bell.position.set(0, 0.76, 0.58);

    tail = new THREE.Group();
    tail.position.set(0, 0.92, -0.58);
    const tailPuff = new THREE.Mesh(cachedBox(0.24, 0.24, 0.18), woolMat);
    tailPuff.position.z = -0.06;
    tail.add(tailPuff);

    head = new THREE.Group();
    head.position.set(0, 0.96, 0.52);
    const skull = new THREE.Mesh(cachedBox(0.42, 0.4, 0.44), skinMat);
    skull.position.set(0, 0, 0.18);
    const woolCap = new THREE.Mesh(cachedBox(0.46, 0.16, 0.46), woolMat);
    woolCap.position.set(0, 0.22, 0.16);
    const earL = new THREE.Mesh(cachedBox(0.14, 0.1, 0.08), skinMat);
    earL.position.set(-0.25, 0.04, 0.16);
    const earR = earL.clone();
    earR.position.x = 0.25;
    const eyeL = new THREE.Mesh(cachedBox(0.07, 0.07, 0.05), eyeMat);
    eyeL.position.set(-0.11, 0.06, 0.41);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.11;
    head.add(skull, woolCap, earL, earR, eyeL, eyeR);

    const makeLeg = (lx: number, lz: number) => {
      const lg = new THREE.Group();
      lg.position.set(lx, 0.56, lz);
      const legM = new THREE.Mesh(cachedBox(0.16, 0.56, 0.16), skinMat);
      legM.position.y = -0.28;
      lg.add(legM);
      return lg;
    };
    legFL = makeLeg(-0.22, 0.32);
    legFR = makeLeg(0.22, 0.32);
    legBL = makeLeg(-0.22, -0.32);
    legBR = makeLeg(0.22, -0.32);

    body.add(fleece, collar, bell, tail, head, legFL, legFR, legBL, legBR);
    hitFlashMeshes.push(fleece, skull);
    hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }),
    );
    hpBarBg.position.set(0, 1.68, 0);
    hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.94, 0.09),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, side: THREE.DoubleSide }),
    );
    hpBarFill.position.set(0, 0, 0.01);
    hpBarBg.add(hpBarFill);
    hpBarBg.visible = false;
    root.add(hpBarBg);
  } else if (kind === 'merchant') {
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.78 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c69e, roughness: 0.68 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.merchantFace, roughness: 0.58 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });

    const torso = new THREE.Mesh(cachedBox(0.84, 0.98, 0.48), vestMat);
    torso.position.y = 1.42;
    const apron = new THREE.Mesh(cachedBox(0.58, 0.74, 0.06), apronMat);
    apron.position.set(0, 1.3, 0.26);
    const sash = new THREE.Mesh(cachedBox(0.88, 0.12, 0.52), hatMat);
    sash.position.y = 1.06;
    const pouch = new THREE.Mesh(cachedBox(0.22, 0.24, 0.18), goldMat);
    pouch.position.set(0.38, 1.02, 0.22);
    const ledgerPack = new THREE.Mesh(cachedBox(0.48, 0.52, 0.24), hatMat);
    ledgerPack.position.set(0, 1.44, -0.34);

    head = new THREE.Group();
    head.position.set(0, 2.26, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.7, 0.7, 0.7), [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    const cap = new THREE.Mesh(cachedBox(0.78, 0.22, 0.78), hatMat);
    cap.position.y = 0.34;
    const feather = new THREE.Mesh(cachedBox(0.08, 0.26, 0.12), goldMat);
    feather.position.set(0.34, 0.48, -0.06);
    const badge = new THREE.Mesh(cachedBox(0.18, 0.18, 0.06), goldMat);
    badge.position.set(-0.18, 0.36, 0.4);
    head.add(headMesh, cap, feather, badge);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.56, 1.84, 0);
    const lArm = new THREE.Mesh(cachedBox(0.26, 0.56, 0.26), vestMat);
    lArm.position.y = -0.28;
    const lHand = new THREE.Mesh(cachedBox(0.24, 0.24, 0.24), skinMat);
    lHand.position.y = -0.66;
    const scrollProp = new THREE.Mesh(cachedBox(0.14, 0.14, 0.38), apronMat);
    scrollProp.position.set(0, -0.66, 0.16);
    leftArm.add(lArm, lHand, scrollProp);

    rightArm = new THREE.Group();
    rightArm.position.set(0.56, 1.84, 0);
    const coinProp = new THREE.Mesh(cachedBox(0.24, 0.24, 0.08), goldMat);
    coinProp.position.set(0, -0.66, 0.2);
    rightArm.add(lArm.clone(), lHand.clone(), coinProp);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.21, 0.92, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.32, 0.76, 0.32), trouserMat);
    lLegM.position.y = -0.38;
    const lBoot = new THREE.Mesh(cachedBox(0.34, 0.2, 0.42), hatMat);
    lBoot.position.set(0, -0.82, 0.04);
    leftLeg.add(lLegM, lBoot);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.21, 0.92, 0);
    rightLeg.add(lLegM.clone(), lBoot.clone());

    body.add(torso, apron, sash, pouch, ledgerPack, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'blacksmith') {
    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe7b58b, roughness: 0.68 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.blacksmithFace, roughness: 0.58 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.88, roughness: 0.25 });
    const emberMat = new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0xea580c, emissiveIntensity: 1.3 });

    const torso = new THREE.Mesh(cachedBox(0.92, 1.0, 0.54), tunicMat);
    torso.position.y = 1.44;
    const apron = new THREE.Mesh(cachedBox(0.66, 0.82, 0.06), apronMat);
    apron.position.set(0, 1.32, 0.28);
    const shoulderGuard = new THREE.Mesh(cachedBox(0.32, 0.24, 0.42), steelMat);
    shoulderGuard.position.set(-0.56, 1.88, 0);
    const toolBelt = new THREE.Mesh(cachedBox(0.96, 0.14, 0.58), apronMat);
    toolBelt.position.y = 1.04;
    const tongSide = new THREE.Mesh(cachedBox(0.12, 0.34, 0.14), steelMat);
    tongSide.position.set(-0.52, 0.98, 0.12);

    head = new THREE.Group();
    head.position.set(0, 2.28, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.72, 0.72, 0.72), [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    const bandana = new THREE.Mesh(cachedBox(0.76, 0.18, 0.76), emberMat);
    bandana.position.y = 0.28;
    const goggles = new THREE.Mesh(cachedBox(0.62, 0.14, 0.1), steelMat);
    goggles.position.set(0, 0.28, 0.36);
    head.add(headMesh, bandana, goggles);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.62, 1.86, 0);
    const lArm = new THREE.Mesh(cachedBox(0.28, 0.58, 0.28), skinMat);
    lArm.position.y = -0.29;
    const lGlove = new THREE.Mesh(cachedBox(0.28, 0.24, 0.28), apronMat);
    lGlove.position.y = -0.66;
    const tongs = new THREE.Mesh(cachedBox(0.1, 0.1, 0.46), steelMat);
    tongs.position.set(0, -0.66, 0.26);
    leftArm.add(lArm, lGlove, tongs);

    rightArm = new THREE.Group();
    rightArm.position.set(0.62, 1.86, 0);
    const shaft = new THREE.Mesh(cachedBox(0.08, 0.08, 0.82), apronMat);
    shaft.position.set(0, -0.64, 0.34);
    const hHead = new THREE.Mesh(cachedBox(0.28, 0.26, 0.38), steelMat);
    hHead.position.set(0, -0.64, 0.72);
    rightArm.add(lArm.clone(), lGlove.clone(), shaft, hHead);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.23, 0.92, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.34, 0.76, 0.34), trouserMat);
    lLegM.position.y = -0.38;
    const lBoot = new THREE.Mesh(cachedBox(0.36, 0.2, 0.44), apronMat);
    lBoot.position.set(0, -0.82, 0.04);
    leftLeg.add(lLegM, lBoot);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.23, 0.92, 0);
    rightLeg.add(lLegM.clone(), lBoot.clone());

    body.add(torso, apron, shoulderGuard, toolBelt, tongSide, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'herbalist') {
    const dressMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.82 });
    const shawlMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6cfa9, roughness: 0.62 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.herbalistFace, roughness: 0.55 });
    const bloomMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xdb2777, emissiveIntensity: 0.65 });
    const satchelMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });

    const robe = new THREE.Mesh(cachedBox(0.88, 1.54, 0.54), dressMat);
    robe.position.y = 0.98;
    const shawl = new THREE.Mesh(cachedBox(0.94, 0.26, 0.6), shawlMat);
    shawl.position.y = 1.66;
    const herbBag = new THREE.Mesh(cachedBox(0.24, 0.28, 0.22), satchelMat);
    herbBag.position.set(-0.48, 1.14, 0.08);
    const backBasket = new THREE.Mesh(cachedBox(0.48, 0.54, 0.26), satchelMat);
    backBasket.position.set(0, 1.48, -0.36);
    const basketBloom = new THREE.Mesh(cachedBox(0.34, 0.2, 0.18), bloomMat);
    basketBloom.position.set(0, 1.78, -0.36);

    head = new THREE.Group();
    head.position.set(0, 2.24, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.68, 0.68, 0.68), [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    const wreath = new THREE.Mesh(cachedBox(0.74, 0.14, 0.74), shawlMat);
    wreath.position.y = 0.3;
    const flowerGem = new THREE.Mesh(cachedBox(0.16, 0.16, 0.12), bloomMat);
    flowerGem.position.set(0.22, 0.32, 0.38);
    head.add(headMesh, wreath, flowerGem);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.54, 1.8, 0);
    const lArm = new THREE.Mesh(cachedBox(0.24, 0.56, 0.24), dressMat);
    lArm.position.y = -0.28;
    const lHand = new THREE.Mesh(cachedBox(0.22, 0.2, 0.22), skinMat);
    lHand.position.y = -0.62;
    const herbVial = new THREE.Mesh(cachedBox(0.14, 0.2, 0.14), shawlMat);
    herbVial.position.set(0, -0.64, 0.16);
    leftArm.add(lArm, lHand, herbVial);

    rightArm = new THREE.Group();
    rightArm.position.set(0.54, 1.8, 0);
    const staff = new THREE.Mesh(cachedBox(0.08, 1.82, 0.08), satchelMat);
    staff.position.set(0, -0.35, 0.22);
    const staffBloom = new THREE.Mesh(cachedBox(0.26, 0.26, 0.26), bloomMat);
    staffBloom.position.set(0, 0.62, 0.22);
    rightArm.add(lArm.clone(), lHand.clone(), staff, staffBloom);

    leftLeg = new THREE.Group();
    rightLeg = new THREE.Group();
    body.add(robe, shawl, herbBag, backBasket, basketBloom, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'explorer') {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.82 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xecc094, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.explorerFace, roughness: 0.58 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.82, roughness: 0.28 });
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.6 });

    const torso = new THREE.Mesh(cachedBox(0.84, 0.96, 0.46), coatMat);
    torso.position.y = 1.42;
    const strap = new THREE.Mesh(cachedBox(0.88, 0.14, 0.5), hatMat);
    strap.position.y = 1.12;
    const pack = new THREE.Mesh(cachedBox(0.56, 0.64, 0.34), trouserMat);
    pack.position.set(0, 1.44, -0.36);
    const bedroll = new THREE.Mesh(cachedBox(0.6, 0.2, 0.2), coatMat);
    bedroll.position.set(0, 1.84, -0.36);

    head = new THREE.Group();
    head.position.set(0, 2.25, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.7, 0.7, 0.7), [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    const brim = new THREE.Mesh(cachedBox(1.04, 0.08, 1.04), hatMat);
    brim.position.y = 0.34;
    const crown = new THREE.Mesh(cachedBox(0.62, 0.28, 0.62), hatMat);
    crown.position.y = 0.5;
    const band = new THREE.Mesh(cachedBox(0.66, 0.1, 0.66), brassMat);
    band.position.y = 0.41;
    head.add(headMesh, brim, crown, band);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.56, 1.82, 0);
    const lArm = new THREE.Mesh(cachedBox(0.26, 0.56, 0.26), coatMat);
    lArm.position.y = -0.28;
    const lHand = new THREE.Mesh(cachedBox(0.24, 0.22, 0.24), skinMat);
    lHand.position.y = -0.64;
    const compass = new THREE.Mesh(cachedBox(0.18, 0.08, 0.18), brassMat);
    compass.position.set(0, -0.64, 0.18);
    leftArm.add(lArm, lHand, compass);

    rightArm = new THREE.Group();
    rightArm.position.set(0.56, 1.82, 0);
    const lantern = new THREE.Mesh(cachedBox(0.22, 0.28, 0.22), lanternMat);
    lantern.position.set(0, -0.74, 0.2);
    const lanternCap = new THREE.Mesh(cachedBox(0.26, 0.08, 0.26), brassMat);
    lanternCap.position.set(0, -0.58, 0.2);
    rightArm.add(lArm.clone(), lHand.clone(), lantern, lanternCap);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.21, 0.92, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.32, 0.76, 0.32), trouserMat);
    lLegM.position.y = -0.38;
    const lBoot = new THREE.Mesh(cachedBox(0.34, 0.2, 0.42), hatMat);
    lBoot.position.set(0, -0.82, 0.04);
    leftLeg.add(lLegM, lBoot);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.21, 0.92, 0);
    rightLeg.add(lLegM.clone(), lBoot.clone());

    body.add(torso, strap, pack, bedroll, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'mayor') {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.74 });
    const furTrimMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.mayorFace, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.22 });
    const oakMat = new THREE.MeshStandardMaterial({ color: 0x5c3418, roughness: 0.78 });

    const torso = new THREE.Mesh(cachedBox(0.86, 0.98, 0.5), coatMat);
    torso.position.y = 1.42;
    const collar = new THREE.Mesh(cachedBox(0.92, 0.2, 0.56), furTrimMat);
    collar.position.y = 1.84;
    const chain = new THREE.Mesh(cachedBox(0.42, 0.16, 0.08), goldMat);
    chain.position.set(0, 1.7, 0.28);
    const sash = new THREE.Mesh(cachedBox(0.9, 0.12, 0.54), goldMat);
    sash.position.y = 1.06;

    head = new THREE.Group();
    head.position.set(0, 2.26, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.7, 0.7, 0.7), [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    const capBrim = new THREE.Mesh(cachedBox(0.78, 0.14, 0.78), furTrimMat);
    capBrim.position.y = 0.34;
    const capTop = new THREE.Mesh(cachedBox(0.68, 0.22, 0.68), coatMat);
    capTop.position.y = 0.46;
    const seal = new THREE.Mesh(cachedBox(0.16, 0.16, 0.08), goldMat);
    seal.position.set(0, 0.44, 0.38);
    head.add(headMesh, capBrim, capTop, seal);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.56, 1.84, 0);
    const lArm = new THREE.Mesh(cachedBox(0.26, 0.56, 0.26), coatMat);
    lArm.position.y = -0.28;
    const lHand = new THREE.Mesh(cachedBox(0.24, 0.22, 0.24), skinMat);
    lHand.position.y = -0.64;
    const charter = new THREE.Mesh(cachedBox(0.14, 0.14, 0.36), furTrimMat);
    charter.position.set(0, -0.66, 0.18);
    leftArm.add(lArm, lHand, charter);

    rightArm = new THREE.Group();
    rightArm.position.set(0.56, 1.84, 0);
    const cane = new THREE.Mesh(cachedBox(0.08, 1.44, 0.08), oakMat);
    cane.position.set(0, -0.75, 0.24);
    const caneOrb = new THREE.Mesh(cachedBox(0.18, 0.18, 0.18), goldMat);
    caneOrb.position.set(0, 0.02, 0.24);
    rightArm.add(lArm.clone(), lHand.clone(), cane, caneOrb);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.21, 0.92, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.32, 0.76, 0.32), trouserMat);
    lLegM.position.y = -0.38;
    const lBoot = new THREE.Mesh(cachedBox(0.34, 0.2, 0.42), oakMat);
    lBoot.position.set(0, -0.82, 0.04);
    leftLeg.add(lLegM, lBoot);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.21, 0.92, 0);
    rightLeg.add(lLegM.clone(), lBoot.clone());

    body.add(torso, collar, chain, sash, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'baker') {
    const dressMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.9 });
    const toqueMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.86 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6cfa9, roughness: 0.62 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.bakerFace, roughness: 0.55 });
    const breadMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.72 });

    const robe = new THREE.Mesh(cachedBox(0.88, 1.54, 0.54), dressMat);
    robe.position.y = 0.98;
    const apron = new THREE.Mesh(cachedBox(0.62, 1.18, 0.06), apronMat);
    apron.position.set(0, 1.12, 0.28);
    const scarf = new THREE.Mesh(cachedBox(0.92, 0.16, 0.58), toqueMat);
    scarf.position.y = 1.68;

    head = new THREE.Group();
    head.position.set(0, 2.24, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.68, 0.68, 0.68), [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    const toqueBand = new THREE.Mesh(cachedBox(0.72, 0.16, 0.72), toqueMat);
    toqueBand.position.y = 0.38;
    const toquePuff = new THREE.Mesh(cachedBox(0.78, 0.34, 0.78), toqueMat);
    toquePuff.position.y = 0.58;
    head.add(headMesh, toqueBand, toquePuff);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.54, 1.82, 0);
    const lArm = new THREE.Mesh(cachedBox(0.24, 0.56, 0.24), dressMat);
    lArm.position.y = -0.28;
    const lHand = new THREE.Mesh(cachedBox(0.22, 0.2, 0.22), skinMat);
    lHand.position.y = -0.62;
    const pin = new THREE.Mesh(cachedBox(0.08, 0.08, 0.44), breadMat);
    pin.position.set(0, -0.64, 0.18);
    leftArm.add(lArm, lHand, pin);

    rightArm = new THREE.Group();
    rightArm.position.set(0.54, 1.82, 0);
    const tray = new THREE.Mesh(cachedBox(0.46, 0.06, 0.42), skinMat);
    tray.position.set(-0.1, -0.62, 0.3);
    const loaf = new THREE.Mesh(cachedBox(0.28, 0.16, 0.2), breadMat);
    loaf.position.set(-0.1, -0.5, 0.3);
    rightArm.add(lArm.clone(), lHand.clone(), tray, loaf);

    leftLeg = new THREE.Group();
    rightLeg = new THREE.Group();
    body.add(robe, apron, scarf, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'alchemist') {
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.78 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.72 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.alchemistFace, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
    const vialMat = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x14b8a6, emissiveIntensity: 1.5 });

    const robe = new THREE.Mesh(cachedBox(0.88, 1.56, 0.54), robeMat);
    robe.position.y = 0.98;
    const sash = new THREE.Mesh(cachedBox(0.92, 0.18, 0.58), trimMat);
    sash.position.y = 1.04;
    const collar = new THREE.Mesh(cachedBox(0.94, 0.16, 0.6), goldMat);
    collar.position.y = 1.72;
    const beltVial = new THREE.Mesh(cachedBox(0.14, 0.22, 0.14), vialMat);
    beltVial.position.set(0.36, 1.06, 0.26);

    head = new THREE.Group();
    head.position.set(0, 2.25, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.7, 0.7, 0.7), [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    const hood = new THREE.Mesh(cachedBox(0.78, 0.36, 0.78), trimMat);
    hood.position.set(0, 0.26, -0.04);
    const lens = new THREE.Mesh(cachedBox(0.2, 0.14, 0.08), goldMat);
    lens.position.set(0.14, 0.08, 0.37);
    head.add(headMesh, hood, lens);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.56, 1.84, 0);
    const lArm = new THREE.Mesh(cachedBox(0.26, 0.58, 0.26), robeMat);
    lArm.position.y = -0.29;
    const flask = new THREE.Mesh(cachedBox(0.2, 0.24, 0.2), vialMat);
    flask.position.set(0, -0.66, 0.18);
    leftArm.add(lArm, flask);

    rightArm = new THREE.Group();
    rightArm.position.set(0.56, 1.84, 0);
    const staff = new THREE.Mesh(cachedBox(0.08, 1.92, 0.08), goldMat);
    staff.position.set(0, -0.35, 0.22);
    const staffGem = new THREE.Mesh(cachedBox(0.24, 0.24, 0.24), vialMat);
    staffGem.position.set(0, 0.68, 0.22);
    rightArm.add(lArm.clone(), staff, staffGem);

    leftLeg = new THREE.Group();
    rightLeg = new THREE.Group();
    body.add(robe, sash, collar, beltVial, head, leftArm, rightArm, leftLeg, rightLeg);
  } else if (kind === 'guard') {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.86, roughness: 0.28 });
    const surcoatMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.78 });
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.75 });
    const oakMat = new THREE.MeshStandardMaterial({ color: 0x5c3418, roughness: 0.8 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.guardFace, roughness: 0.55 });

    const torso = new THREE.Mesh(cachedBox(0.9, 1.0, 0.52), armorMat);
    torso.position.y = 1.44;
    const surcoat = new THREE.Mesh(cachedBox(0.94, 0.58, 0.56), surcoatMat);
    surcoat.position.y = 1.24;
    const chestEmblem = new THREE.Mesh(cachedBox(0.22, 0.24, 0.08), crestMat);
    chestEmblem.position.set(0, 1.48, 0.28);

    head = new THREE.Group();
    head.position.set(0, 2.28, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.7, 0.7, 0.7), [armorMat, armorMat, armorMat, armorMat, faceMat, armorMat]);
    const helm = new THREE.Mesh(cachedBox(0.78, 0.3, 0.78), armorMat);
    helm.position.y = 0.24;
    const plume = new THREE.Mesh(cachedBox(0.16, 0.28, 0.56), crestMat);
    plume.position.y = 0.48;
    head.add(headMesh, helm, plume);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.58, 1.86, 0);
    const lPauldron = new THREE.Mesh(cachedBox(0.36, 0.26, 0.38), armorMat);
    const lArm = new THREE.Mesh(cachedBox(0.28, 0.6, 0.28), armorMat);
    lArm.position.y = -0.3;
    const guardShield = new THREE.Mesh(cachedBox(0.12, 0.82, 0.58), surcoatMat);
    guardShield.position.set(-0.2, -0.4, 0.14);
    const shieldBoss = new THREE.Mesh(cachedBox(0.15, 0.22, 0.22), crestMat);
    shieldBoss.position.set(-0.22, -0.4, 0.14);
    leftArm.add(lPauldron, lArm, guardShield, shieldBoss);

    rightArm = new THREE.Group();
    rightArm.position.set(0.58, 1.86, 0);
    const pole = new THREE.Mesh(cachedBox(0.08, 2.28, 0.08), oakMat);
    pole.position.set(0, -0.2, 0.22);
    const halberdAxe = new THREE.Mesh(cachedBox(0.08, 0.44, 0.36), armorMat);
    halberdAxe.position.set(0, 0.78, 0.36);
    rightArm.add(lPauldron.clone(), lArm.clone(), pole, halberdAxe);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.22, 0.92, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.34, 0.76, 0.34), armorMat);
    lLegM.position.y = -0.38;
    const lBoot = new THREE.Mesh(cachedBox(0.36, 0.2, 0.44), armorMat);
    lBoot.position.set(0, -0.82, 0.04);
    leftLeg.add(lLegM, lBoot);
    rightLeg = new THREE.Group();
    rightLeg.position.set(0.22, 0.92, 0);
    rightLeg.add(lLegM.clone(), lBoot.clone());

    body.add(torso, surcoat, chestEmblem, head, leftArm, rightArm, leftLeg, rightLeg);
  } else {
    // Villager: Лісник Орест
    const cloakMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.82, side: THREE.DoubleSide });
    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.65 });
    const faceMat = new THREE.MeshStandardMaterial({ map: textures.villagerFace, roughness: 0.58 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 });
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.78 });
    const gemMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 1.2 });

    const torso = new THREE.Mesh(cachedBox(0.84, 0.96, 0.48), tunicMat);
    torso.position.y = 1.42;
    const belt = new THREE.Mesh(cachedBox(0.88, 0.14, 0.52), staffMat);
    belt.position.y = 1.06;
    const brooch = new THREE.Mesh(cachedBox(0.18, 0.18, 0.08), gemMat);
    brooch.position.set(0, 1.66, 0.26);
    const quiver = new THREE.Mesh(cachedBox(0.24, 0.62, 0.22), staffMat);
    quiver.position.set(-0.24, 1.54, -0.34);
    const cloak = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 1.1), cloakMat);
    cloak.position.set(0, 1.34, -0.27);
    cloak.rotation.x = 0.1;

    head = new THREE.Group();
    head.position.set(0, 2.25, 0);
    const headMesh = new THREE.Mesh(cachedBox(0.7, 0.7, 0.7), [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    const hatBrim = new THREE.Mesh(cachedBox(1.04, 0.08, 1.04), hatMat);
    hatBrim.position.y = 0.34;
    const hatTop = new THREE.Mesh(cachedBox(0.64, 0.36, 0.64), hatMat);
    hatTop.position.y = 0.54;
    const hatFeather = new THREE.Mesh(cachedBox(0.08, 0.28, 0.1), gemMat);
    hatFeather.position.set(0.32, 0.58, -0.06);
    head.add(headMesh, hatBrim, hatTop, hatFeather);

    leftArm = new THREE.Group();
    leftArm.position.set(-0.56, 1.84, 0);
    const lArm = new THREE.Mesh(cachedBox(0.26, 0.58, 0.26), cloakMat);
    lArm.position.y = -0.29;
    const lHand = new THREE.Mesh(cachedBox(0.24, 0.22, 0.24), skinMat);
    lHand.position.y = -0.64;
    leftArm.add(lArm, lHand);

    rightArm = new THREE.Group();
    rightArm.position.set(0.56, 1.84, 0);
    const staff = new THREE.Mesh(cachedBox(0.08, 2.02, 0.08), staffMat);
    staff.position.set(0, -0.35, 0.22);
    const staffGem = new THREE.Mesh(cachedBox(0.22, 0.22, 0.22), gemMat);
    staffGem.position.set(0, 0.72, 0.22);
    rightArm.add(lArm.clone(), lHand.clone(), staff, staffGem);

    leftLeg = new THREE.Group();
    leftLeg.position.set(-0.21, 0.92, 0);
    const lLegM = new THREE.Mesh(cachedBox(0.32, 0.76, 0.32), trouserMat);
    lLegM.position.y = -0.38;
    const lBoot = new THREE.Mesh(cachedBox(0.34, 0.2, 0.42), staffMat);
    lBoot.position.set(0, -0.82, 0.04);
    leftLeg.add(lLegM, lBoot);

    rightLeg = new THREE.Group();
    rightLeg.position.set(0.21, 0.92, 0);
    rightLeg.add(lLegM.clone(), lBoot.clone());

    body.add(torso, belt, brooch, quiver, cloak, head, leftArm, rightArm, leftLeg, rightLeg);
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

  return {
    root,
    body,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    legFL,
    legFR,
    legBL,
    legBR,
    tail,
    hpBarBg,
    hpBarFill,
    hitFlashMeshes,
  };
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

interface CabinMaterialSet {
  stoneMat: THREE.MeshStandardMaterial;
  logMat: THREE.MeshStandardMaterial;
  woodMat: THREE.MeshStandardMaterial;
  darkWoodMat: THREE.MeshStandardMaterial;
  doorMat: THREE.MeshStandardMaterial;
  shutterMat: THREE.MeshStandardMaterial;
  roofMat: THREE.MeshStandardMaterial;
  rugMat: THREE.MeshStandardMaterial;
  rugTrimMat: THREE.MeshStandardMaterial;
  bedMat: THREE.MeshStandardMaterial;
  quiltMat: THREE.MeshStandardMaterial;
  pillowMat: THREE.MeshStandardMaterial;
  ironMat: THREE.MeshStandardMaterial;
  goldMat: THREE.MeshStandardMaterial;
  flowerPinkMat: THREE.MeshStandardMaterial;
  flowerGoldMat: THREE.MeshStandardMaterial;
  greeneryMat: THREE.MeshStandardMaterial;
  glowWinMat: THREE.MeshStandardMaterial;
  emberMat: THREE.MeshStandardMaterial;
  creamStripeMat: THREE.MeshStandardMaterial;
  stripeAccentMat: THREE.MeshStandardMaterial;
}

const cabinMaterialCache = new WeakMap<ProceduralTextures, Map<CabinStyle, CabinMaterialSet>>();

function getCabinMaterials(textures: ProceduralTextures, style: CabinStyle): CabinMaterialSet {
  let byStyle = cabinMaterialCache.get(textures);
  if (!byStyle) {
    byStyle = new Map();
    cabinMaterialCache.set(textures, byStyle);
  }
  const existing = byStyle.get(style);
  if (existing) return existing;

  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneBlock, roughness: 0.9, metalness: 0.05 });
  const wallTex =
    style === 'shop' || style === 'bakery' || style === 'tavern' || style === 'manor_2f' || style === 'tavern_2f'
      ? textures.plasterTimber
      : style === 'watchtower' || style === 'townhall' || style === 'watchkeep_2f'
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
    style === 'shop' || style === 'manor_2f'
      ? 0xb91c1c
      : style === 'watchtower' || style === 'townhall' || style === 'watchkeep_2f'
        ? 0x1e3a8a
        : style === 'cottage'
          ? 0xd97706
          : style === 'bakery' || style === 'tavern_2f'
            ? 0x92400e
            : style === 'alchemy'
              ? 0x6b21a8
              : style === 'tavern'
                ? 0x7c2d12
                : 0x1e4620;
  const shutterMat = new THREE.MeshStandardMaterial({ color: shutterColor, roughness: 0.72 });
  const roofTex =
    style === 'shop' || style === 'cottage' || style === 'bakery' || style === 'tavern' || style === 'tavern_2f'
      ? textures.terracottaRoof
      : style === 'watchtower' || style === 'townhall' || style === 'alchemy' || style === 'manor_2f' || style === 'watchkeep_2f'
        ? textures.nordicSlate
        : textures.roofShingle;
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.7, metalness: 0.1 });
  const rugMat = new THREE.MeshStandardMaterial({
    color:
      style === 'shop' || style === 'manor_2f'
        ? 0x1e3a8a
        : style === 'watchtower' || style === 'townhall' || style === 'watchkeep_2f'
          ? 0x334155
          : style === 'alchemy'
            ? 0x581c87
            : style === 'bakery' || style === 'tavern_2f'
              ? 0xb45309
              : 0x991b1b,
    roughness: 0.92,
  });
  const rugTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.85 });
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.85 });
  const quiltMat = new THREE.MeshStandardMaterial({
    color:
      style === 'cottage'
        ? 0x16a34a
        : style === 'watchtower' || style === 'townhall' || style === 'watchkeep_2f'
          ? 0x2563eb
          : style === 'tavern_2f'
            ? 0xd97706
            : 0xb91c1c,
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
  const creamStripeMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
  const stripeAccentMat = new THREE.MeshStandardMaterial({
    color: style === 'bakery' ? 0xd97706 : 0xdc2626,
    roughness: 0.72,
  });

  const set: CabinMaterialSet = {
    stoneMat,
    logMat,
    woodMat,
    darkWoodMat,
    doorMat,
    shutterMat,
    roofMat,
    rugMat,
    rugTrimMat,
    bedMat,
    quiltMat,
    pillowMat,
    ironMat,
    goldMat,
    flowerPinkMat,
    flowerGoldMat,
    greeneryMat,
    glowWinMat,
    emberMat,
    creamStripeMat,
    stripeAccentMat,
  };
  byStyle.set(style, set);
  return set;
}

// Enterable, bug-free architectural houses: 1-story & 2-story interiors, batched static masonry/timber, double hinged doors
export function buildCabin(textures: ProceduralTextures, style: CabinStyle = 'hunter'): CabinVisual {
  const cabin = new THREE.Group();
  const roofGroup = new THREE.Group();
  const dims = getCabinDims(style);
  const halfW = dims.halfW;
  const halfD = dims.halfD;
  const isTwoStory = dims.isTwoStory;

  const {
    stoneMat,
    logMat,
    woodMat,
    darkWoodMat,
    doorMat,
    shutterMat,
    roofMat,
    rugMat,
    rugTrimMat,
    bedMat,
    quiltMat,
    pillowMat,
    ironMat,
    goldMat,
    flowerPinkMat,
    flowerGoldMat,
    greeneryMat,
    glowWinMat,
    emberMat,
    creamStripeMat,
    stripeAccentMat,
  } = getCabinMaterials(textures, style);

  const staticBatch = new StaticBoxBatcher();
  const roofBatch = new StaticBoxBatcher();

  const isTall = style === 'watchtower' || style === 'townhall' || isTwoStory;
  const wallH = isTwoStory ? 3.33 : isTall ? 4.0 : 3.5;

  // 1. Deep Stone Foundation & Plank Floor (top at y = 0.82)
  staticBatch.add(halfW * 2 + 0.62, 1.8, halfD * 2 + 0.62, 0, -0.18, 0, stoneMat);
  staticBatch.add(halfW * 2 + 0.26, 0.14, halfD * 2 + 0.26, 0, 0.75, 0, woodMat);

  // Front Porch Deck + Support Piers + Smooth Steps
  staticBatch.add(4.8, 0.26, 1.85, 0, 0.7, halfD + 0.92, woodMat);
  staticBatch.add(4.7, 1.35, 1.8, 0, -0.05, halfD + 0.92, stoneMat);
  staticBatch.add(3.8, 0.26, 0.68, 0, 0.46, halfD + 1.9, woodMat);
  staticBatch.add(3.8, 0.5, 0.68, 0, 0.16, halfD + 2.52, stoneMat);

  const porchPostH = wallH - 0.35;
  staticBatch.add(0.24, porchPostH, 0.24, -1.95, 0.8 + porchPostH * 0.5, halfD + 1.62, darkWoodMat);
  staticBatch.add(0.24, porchPostH, 0.24, 1.95, 0.8 + porchPostH * 0.5, halfD + 1.62, darkWoodMat);

  // Corner timber columns spanning 1F (or both floors for 2-story)
  const colH = isTwoStory ? 7.04 : wallH + 0.14;
  for (const cx of [-halfW - 0.08, halfW + 0.08]) {
    for (const cz of [-halfD - 0.08, halfD + 0.08]) {
      staticBatch.add(0.46, colH, 0.46, cx, 0.78 + colH * 0.5, cz, darkWoodMat);
    }
  }

  // 2. Hollow 1F Walls (wide double doorway on +Z front wall)
  const wallY = 0.82 + wallH * 0.5;
  const wallT = 0.36;
  const doorHalfSpan = isTwoStory ? 1.42 : 1.35;
  const sideSpan = halfW - doorHalfSpan;

  staticBatch.add(wallT, wallH, halfD * 2 + 0.22, -halfW, wallY, 0, logMat);
  staticBatch.add(wallT, wallH, halfD * 2 + 0.22, halfW, wallY, 0, logMat);
  staticBatch.add(halfW * 2 + 0.22, wallH, wallT, 0, wallY, -halfD, logMat);
  staticBatch.add(sideSpan, wallH, wallT, -doorHalfSpan - sideSpan * 0.5, wallY, halfD, logMat);
  staticBatch.add(sideSpan, wallH, wallT, doorHalfSpan + sideSpan * 0.5, wallY, halfD, logMat);
  staticBatch.add(doorHalfSpan * 2 + 0.04, wallH - 2.68, wallT, 0, 0.82 + 2.68 + (wallH - 2.68) * 0.5, halfD, logMat);

  staticBatch.add(0.18, 2.72, 0.48, -doorHalfSpan, 0.82 + 1.36, halfD, darkWoodMat);
  staticBatch.add(0.18, 2.72, 0.48, doorHalfSpan, 0.82 + 1.36, halfD, darkWoodMat);
  staticBatch.add(doorHalfSpan * 2 + 0.18, 0.18, 0.52, 0, 0.82 + 2.72, halfD, darkWoodMat);

  // Interactive symmetrical DOUBLE-LEAF Wooden Doors
  const doorLeafW = isTwoStory ? 1.36 : 1.3;
  const doorPivotL = new THREE.Group();
  doorPivotL.position.set(-doorLeafW, 0.82, halfD + 0.12);
  const doorLeafL = new THREE.Mesh(new THREE.BoxGeometry(doorLeafW, 2.58, 0.1), doorMat);
  doorLeafL.position.set(doorLeafW * 0.5, 1.29, 0);
  const doorHandleL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), goldMat);
  doorHandleL.position.set(doorLeafW - 0.16, 1.18, 0.08);
  doorPivotL.add(doorLeafL, doorHandleL);

  const doorPivotR = new THREE.Group();
  doorPivotR.position.set(doorLeafW, 0.82, halfD + 0.12);
  const doorLeafR = new THREE.Mesh(new THREE.BoxGeometry(doorLeafW, 2.58, 0.1), doorMat);
  doorLeafR.position.set(-doorLeafW * 0.5, 1.29, 0);
  const doorHandleR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), goldMat);
  doorHandleR.position.set(-(doorLeafW - 0.16), 1.18, 0.08);
  doorPivotR.add(doorLeafR, doorHandleR);
  cabin.add(doorPivotL, doorPivotR);

  // Windows & shutters + flower boxes (batched)
  const frontWinX = isTwoStory ? 3.05 : 2.62;
  staticBatch.add(1.02, 1.0, 0.42, -frontWinX, 2.55, halfD, glowWinMat);
  staticBatch.add(1.02, 1.0, 0.42, frontWinX, 2.55, halfD, glowWinMat);
  staticBatch.add(0.42, 1.0, 1.25, halfW, 2.55, 0.4, glowWinMat);
  staticBatch.add(0.42, 1.0, 1.25, -halfW, 2.55, 0.4, glowWinMat);

  for (const wx of [-frontWinX, frontWinX]) {
    staticBatch.add(0.22, 1.08, 0.12, wx - 0.62, 2.55, halfD + 0.22, shutterMat);
    staticBatch.add(0.22, 1.08, 0.12, wx + 0.62, 2.55, halfD + 0.22, shutterMat);
    staticBatch.add(1.18, 0.24, 0.34, wx, 1.92, halfD + 0.3, darkWoodMat);
    staticBatch.add(1.06, 0.2, 0.26, wx, 2.08, halfD + 0.3, greeneryMat);
    for (let f = -1; f <= 1; f++) {
      staticBatch.add(
        0.18,
        0.18,
        0.18,
        wx + f * 0.32,
        2.22,
        halfD + 0.32,
        f === 0 ? flowerGoldMat : flowerPinkMat,
      );
    }
  }

  staticBatch.add(0.26, 0.36, 0.26, 1.55, 3.08, halfD + 0.38, glowWinMat);

  if (
    style === 'shop' ||
    style === 'bakery' ||
    style === 'alchemy' ||
    style === 'tavern' ||
    style === 'townhall' ||
    style === 'tavern_2f' ||
    style === 'manor_2f'
  ) {
    const signTex =
      style === 'bakery'
        ? textures.bakerySign
        : style === 'alchemy'
          ? textures.alchemySign
          : style === 'tavern' || style === 'tavern_2f'
            ? textures.tavernSign
            : style === 'townhall' || style === 'manor_2f'
              ? textures.townhallSign
              : textures.shopSign;
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 1.02, 0.14),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }),
    );
    signBoard.position.set(0, isTwoStory ? 3.85 : isTall ? 4.55 : 4.18, halfD + 1.65);
    staticBatch.add(0.26, 0.36, 0.26, -1.55, 3.08, halfD + 0.38, glowWinMat);
    staticBatch.add(0.68, 0.74, 0.68, -2.15, 1.18, halfD + 0.75, darkWoodMat);
    staticBatch.add(0.6, 0.14, 0.6, -2.15, 1.58, halfD + 0.75, goldMat);
    cabin.add(signBoard);
  } else if (style === 'watchtower' || style === 'watchkeep_2f') {
    const forgeBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.92, 0.14),
      new THREE.MeshStandardMaterial({ map: textures.forgeSign, roughness: 0.6 }),
    );
    forgeBoard.position.set(0, isTwoStory ? 3.85 : 4.55, halfD + 1.65);
    staticBatch.add(0.65, 0.5, 0.95, 2.15, 1.06, halfD + 0.72, ironMat);
    cabin.add(forgeBoard);
  } else if (style === 'cottage') {
    const herbBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.92, 0.14),
      new THREE.MeshStandardMaterial({ map: textures.herbalSign, roughness: 0.6 }),
    );
    herbBoard.position.set(0, 4.18, halfD + 1.65);
    staticBatch.add(0.66, 0.65, 0.66, 2.2, 1.14, halfD + 0.7, darkWoodMat);
    staticBatch.add(0.72, 0.72, 0.72, 2.2, 1.66, halfD + 0.7, greeneryMat);
    cabin.add(herbBoard);
  }

  // 3. Cozy Walkable Interior (1F at y = 0.82)
  const hearthFlame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.58, 6), emberMat);
  const hearthLight = new THREE.PointLight(0xffa94d, 5.2, 14, 1.5);

  if (isTwoStory) {
    // 2-story Grand Ground Hall matching TWO_STORY_GROUND_BOXES
    staticBatch.add(4.2, 0.04, 3.4, -0.4, 0.84, 0.35, rugMat);
    staticBatch.add(3.8, 0.045, 3.0, -0.4, 0.845, 0.35, rugTrimMat);

    // Fireplace against back wall (x = -0.35, z = -3.5)
    staticBatch.add(2.1, 2.3, 0.9, -0.35, 1.95, -halfD + 0.52, stoneMat);
    staticBatch.add(2.35, 0.18, 1.05, -0.35, 2.95, -halfD + 0.56, darkWoodMat);
    staticBatch.add(1.1, 0.28, 0.45, -0.35, 1.02, -halfD + 0.66, emberMat);
    hearthFlame.position.set(-0.35, 1.38, -halfD + 0.66);
    hearthLight.position.set(-0.35, 2.35, -halfD + 1.45);

    // Left Workbench [-4.3, -2.55, -1.9, 0.2]
    staticBatch.add(1.55, 0.82, 1.9, -3.42, 1.23, -0.85, darkWoodMat);
    staticBatch.add(1.7, 0.14, 2.05, -3.42, 1.68, -0.85, woodMat);
    staticBatch.add(0.38, 0.26, 0.54, -3.35, 1.88, -0.45, ironMat);
    staticBatch.add(0.24, 0.3, 0.24, -3.55, 1.9, -1.35, glowWinMat);

    // Bookshelf [-4.25, -2.4, -3.55, -2.5]
    staticBatch.add(1.65, 2.25, 0.82, -3.32, 1.94, -3.02, darkWoodMat);
    const bookColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xa855f7];
    for (let row = 0; row < 2; row++) {
      for (let b = 0; b < 5; b++) {
        const bookMat = new THREE.MeshStandardMaterial({
          color: bookColors[(b + row) % bookColors.length],
          roughness: 0.7,
        });
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.34), bookMat);
        book.position.set(-3.8 + b * 0.24, 1.48 + row * 0.72, -2.78);
        book.userData.noCastShadow = true;
        cabin.add(book);
      }
    }

    // Staircase inner partition [1.95, 2.25, -2.2, 2.5] + 11 wooden stepped treads up to 2nd floor (y = 4.22)
    staticBatch.add(0.28, 3.25, 4.7, 2.1, 2.45, 0.15, darkWoodMat);
    for (let s = 0; s < 11; s++) {
      const t = (s + 0.5) / 11;
      const sz = 2.65 - t * 4.45;
      const topY = 0.82 + t * 3.4;
      staticBatch.add(2.35, 0.32, 0.44, 3.4, topY - 0.16, sz, s % 2 === 0 ? woodMat : darkWoodMat);
    }

    // 2nd Floor Deck (top at y = 4.22), leaving open stairwell cutout lx in [2.05..4.55], lz in [-1.85..2.85]
    staticBatch.add(6.95, 0.14, 8.2, -1.425, 4.15, 0, woodMat);
    staticBatch.add(2.85, 0.14, 2.25, 3.475, 4.15, -2.975, woodMat);
    staticBatch.add(2.85, 0.14, 1.25, 3.475, 4.15, 3.475, woodMat);
    staticBatch.add(0.35, 0.14, 4.7, 4.725, 4.15, 0.5, woodMat);
    // Front 2F balcony deck (lz = 4.0..5.4)
    staticBatch.add(9.9, 0.16, 1.4, 0, 4.14, 4.7, woodMat);
    // Underside timber support beams for balcony
    staticBatch.add(0.28, 0.28, 1.35, -3.5, 3.92, 4.68, darkWoodMat);
    staticBatch.add(0.28, 0.28, 1.35, 3.5, 3.92, 4.68, darkWoodMat);

    // 2nd Floor Walls (y = 4.22..7.72) with open balcony doorway lx in [-1.35..1.35]
    const wallH2 = 3.5;
    const wallY2 = 4.22 + wallH2 * 0.5;
    const sideSpan2 = halfW - 1.35;
    staticBatch.add(wallT, wallH2, halfD * 2 + 0.22, -halfW, wallY2, 0, logMat);
    staticBatch.add(wallT, wallH2, halfD * 2 + 0.22, halfW, wallY2, 0, logMat);
    staticBatch.add(halfW * 2 + 0.22, wallH2, wallT, 0, wallY2, -halfD, logMat);
    staticBatch.add(sideSpan2, wallH2, wallT, -1.35 - sideSpan2 * 0.5, wallY2, halfD, logMat);
    staticBatch.add(sideSpan2, wallH2, wallT, 1.35 + sideSpan2 * 0.5, wallY2, halfD, logMat);
    staticBatch.add(2.74, wallH2 - 2.68, wallT, 0, 4.22 + 2.68 + (wallH2 - 2.68) * 0.5, halfD, logMat);
    staticBatch.add(2.88, 0.18, 0.52, 0, 4.22 + 2.72, halfD, darkWoodMat);

    // 2F Glowing Windows
    staticBatch.add(1.02, 0.96, 0.42, -frontWinX, 6.0, halfD, glowWinMat);
    staticBatch.add(1.02, 0.96, 0.42, frontWinX, 6.0, halfD, glowWinMat);
    staticBatch.add(0.42, 0.96, 1.25, halfW, 6.0, 0.4, glowWinMat);
    staticBatch.add(0.42, 0.96, 1.25, -halfW, 6.0, 0.4, glowWinMat);

    // Front Balcony Guardrails (lz = 4.0..5.35)
    staticBatch.add(0.24, 1.05, 1.38, -halfW, 4.74, halfD + 0.69, darkWoodMat);
    staticBatch.add(0.24, 1.05, 1.38, halfW, 4.74, halfD + 0.69, darkWoodMat);
    staticBatch.add(halfW * 2 + 0.24, 0.92, 0.22, 0, 4.68, halfD + 1.34, darkWoodMat);

    // 2F Stairwell Guardrails [1.92..2.24, -1.75..2.95] & [1.92..4.55, 2.75..3.05]
    staticBatch.add(0.24, 0.98, 4.68, 2.08, 4.71, 0.6, darkWoodMat);
    staticBatch.add(2.55, 0.98, 0.24, 3.3, 4.71, 2.9, darkWoodMat);

    // 2F Master Rug, Bed [-4.25, -2.35, -3.55, -2.0], & Wardrobe [-4.25, -2.85, 0.8, 2.4]
    staticBatch.add(3.6, 0.04, 3.0, -0.8, 4.24, -0.4, rugMat);
    staticBatch.add(3.2, 0.045, 2.6, -0.8, 4.245, -0.4, rugTrimMat);

    staticBatch.add(1.85, 0.44, 1.45, -3.3, 4.44, -2.78, darkWoodMat);
    staticBatch.add(0.2, 1.15, 1.5, -4.15, 4.8, -2.78, darkWoodMat);
    staticBatch.add(1.7, 0.22, 1.3, -3.3, 4.73, -2.78, bedMat);
    staticBatch.add(1.18, 0.24, 1.32, -3.02, 4.75, -2.78, quiltMat);
    staticBatch.add(0.42, 0.18, 0.88, -3.9, 4.88, -2.78, pillowMat);

    staticBatch.add(1.25, 2.15, 1.5, -3.55, 5.3, 1.6, darkWoodMat);
    staticBatch.add(0.14, 1.9, 1.36, -2.92, 5.3, 1.6, woodMat);
    staticBatch.add(0.1, 0.24, 0.12, -2.84, 5.32, 1.6, goldMat);

    // Upstairs Lantern Chandelier
    staticBatch.add(0.12, 0.55, 0.12, -0.8, 7.42, -0.4, ironMat);
    staticBatch.add(0.46, 0.34, 0.46, -0.8, 7.04, -0.4, glowWinMat);
  } else {
    staticBatch.add(3.6, 0.04, 2.7, 0, 0.84, 0.35, rugMat);
    staticBatch.add(3.2, 0.045, 2.3, 0, 0.845, 0.35, rugTrimMat);

    if (style === 'shop' || style === 'bakery' || style === 'alchemy') {
      staticBatch.add(3.75, 0.94, 0.96, 0.15, 1.29, -1.1, darkWoodMat);
      staticBatch.add(3.96, 0.14, 1.12, 0.15, 1.82, -1.1, woodMat);

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

      staticBatch.add(1.15, 2.35, 3.0, -2.85, 2.0, -1.18, darkWoodMat);
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

      staticBatch.add(1.1, 0.92, 1.1, 2.85, 1.28, 1.35, woodMat);
      staticBatch.add(0.78, 0.72, 0.78, 2.9, 2.1, 1.28, darkWoodMat);

      cabin.add(coinStack, displayGem, potionDisplay);
    } else {
      staticBatch.add(2.1, 2.1, 0.9, 0, 1.85, -halfD + 0.5, stoneMat);
      staticBatch.add(2.35, 0.16, 1.05, 0, 2.85, -halfD + 0.55, darkWoodMat);
      staticBatch.add(1.1, 0.28, 0.45, 0, 1.02, -halfD + 0.65, emberMat);
      hearthFlame.position.set(0, 1.38, -halfD + 0.65);
      hearthLight.position.set(0, 2.15, -halfD + 1.35);

      staticBatch.add(1.45, 0.14, 1.7, -2.7, 1.68, -0.65, woodMat);
      staticBatch.add(1.3, 0.82, 1.5, -2.7, 1.23, -0.65, darkWoodMat);
      staticBatch.add(0.38, 0.26, 0.54, -2.65, 1.88, -0.25, ironMat);
      staticBatch.add(0.24, 0.3, 0.24, -2.85, 1.9, -1.2, glowWinMat);

      staticBatch.add(1.45, 2.2, 0.65, -2.65, 1.92, -2.55, darkWoodMat);
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

      staticBatch.add(1.9, 0.44, 1.25, 2.55, 1.04, -2.15, darkWoodMat);
      staticBatch.add(0.18, 1.15, 1.3, 3.45, 1.4, -2.15, darkWoodMat);
      staticBatch.add(1.76, 0.22, 1.12, 2.55, 1.33, -2.15, bedMat);
      staticBatch.add(1.18, 0.24, 1.14, 2.26, 1.35, -2.15, quiltMat);
      staticBatch.add(0.45, 0.18, 0.82, 3.15, 1.48, -2.15, pillowMat);

      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.1, 10), woodMat);
      tableTop.position.set(2.45, 1.58, 1.1);
      const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.74, 8), darkWoodMat);
      tableLeg.position.set(2.45, 1.19, 1.1);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 8), pillowMat);
      mug.position.set(2.35, 1.71, 1.05);
      mug.userData.noCastShadow = true;
      staticBatch.add(0.18, 0.24, 0.18, 2.6, 1.75, 1.22, glowWinMat);
      cabin.add(tableTop, tableLeg, mug);
    }
  }

  // Interactive Indoor Supply Chest (2F houses at (-3.4, 2.2), 1F houses at (-2.75, 1.95))
  const chestGroup = new THREE.Group();
  chestGroup.position.set(isTwoStory ? -3.4 : -2.75, 0.82, isTwoStory ? 2.2 : 1.95);
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

  cabin.add(hearthFlame, chestGroup);
  staticBatch.flushInto(cabin);

  // 4. Cutaway Roof Group
  const roofBaseY = isTwoStory ? 7.72 : isTall ? 4.82 : 4.32;
  const peakHeight = isTwoStory ? 2.85 : isTall ? 2.65 : 2.25;
  const gableHalf = isTwoStory ? halfD + 0.08 : 3.25;
  const gableDepth = isTwoStory ? halfW * 2 + 0.28 : 7.82;
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-gableHalf, 0);
  gableShape.lineTo(gableHalf, 0);
  gableShape.lineTo(0, peakHeight);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: gableDepth, bevelEnabled: false });
  gableGeo.rotateY(Math.PI * 0.5);
  gableGeo.translate(-gableDepth * 0.5, roofBaseY, 0);
  const gableMesh = new THREE.Mesh(gableGeo, logMat);

  const pitchAngle = Math.atan2(peakHeight, gableHalf);

  if (isTwoStory) {
    const roofW = halfW * 2 + 1.8;
    const slopeDepth = Math.hypot(gableHalf + 0.9, peakHeight);
    roofBatch.add(roofW, 0.26, slopeDepth, 0, roofBaseY + peakHeight * 0.48, -gableHalf * 0.54, roofMat, -pitchAngle);
    roofBatch.add(roofW, 0.26, slopeDepth, 0, roofBaseY + peakHeight * 0.48, gableHalf * 0.54, roofMat, pitchAngle);
    roofBatch.add(roofW + 0.2, 0.3, 0.42, 0, roofBaseY + peakHeight - 0.04, 0, roofMat);
    roofBatch.add(1.22, 4.1, 1.22, -0.35, roofBaseY + 1.5, -halfD + 0.55, stoneMat);
    roofBatch.add(4.8, 0.18, 2.0, 0, 3.85, halfD + 0.92, roofMat, 0.2);
    if (style === 'watchkeep_2f') {
      roofBatch.add(2.3, 1.9, 2.3, 2.4, roofBaseY + 2.8, -1.6, stoneMat);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.75, 2.5, 4), roofMat);
      spire.rotation.y = Math.PI * 0.25;
      spire.position.set(2.4, roofBaseY + 4.95, -1.6);
      roofGroup.add(spire);
    }
    roofGroup.add(gableMesh);
  } else if (style === 'watchtower' || style === 'townhall') {
    roofBatch.add(9.2, 0.24, 5.1, 0, roofBaseY + 1.05, -1.68, roofMat, -pitchAngle);
    roofBatch.add(9.2, 0.24, 5.1, 0, roofBaseY + 1.05, 1.68, roofMat, pitchAngle);
    roofBatch.add(9.3, 0.28, 0.38, 0, roofBaseY + peakHeight - 0.05, 0, roofMat);
    roofBatch.add(2.1, 1.8, 2.1, 0, roofBaseY + 3.2, -1.2, stoneMat);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.55, 2.3, 4), roofMat);
    spire.rotation.y = Math.PI * 0.25;
    spire.position.set(0, roofBaseY + 5.1, -1.2);
    roofBatch.add(4.8, 0.16, 2.0, 0, 4.18, halfD + 0.92, roofMat, 0.2);
    roofGroup.add(gableMesh, spire);
  } else {
    roofBatch.add(9.1, 0.24, 4.8, 0, roofBaseY + 0.88, -1.68, roofMat, -pitchAngle);
    roofBatch.add(9.1, 0.24, 4.8, 0, roofBaseY + 0.88, 1.68, roofMat, pitchAngle);
    roofBatch.add(9.2, 0.28, 0.38, 0, roofBaseY + peakHeight - 0.06, 0, roofMat);
    roofBatch.add(4.8, 0.18, 2.0, 0, 3.82, halfD + 0.92, roofMat, 0.2);
    roofBatch.add(1.08, 3.3, 1.08, style === 'cottage' || style === 'bakery' ? -1.8 : 0, 5.95, -2.55, stoneMat);
    roofGroup.add(gableMesh);

    if (style === 'shop' || style === 'bakery') {
      for (let s = -2; s <= 2; s++) {
        roofBatch.add(
          0.74,
          0.19,
          2.04,
          s * 0.92,
          3.84,
          halfD + 0.92,
          s % 2 === 0 ? stripeAccentMat : creamStripeMat,
          0.2,
        );
      }
    }
  }

  roofBatch.flushInto(roofGroup);
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

export interface CaveLightAnchor {
  lx: number;
  ly: number;
  lz: number;
  color: number;
  baseInt: number;
  radius: number;
}

export interface CaveVisual {
  group: THREE.Group;
  torchLights: THREE.PointLight[];
  torchFlames: THREE.Mesh[];
  crystalMeshes: THREE.Mesh[];
  lightAnchors: CaveLightAnchor[];
}

// Deep, winding subterranean Minecraft mineshaft & vaulted crystal cavern with seamless portal
export function buildCaveStructure(textures: ProceduralTextures, site: CaveSite): CaveVisual {
  const group = new THREE.Group();
  const torchLights: THREE.PointLight[] = [];
  const torchFlames: THREE.Mesh[] = [];
  const crystalMeshes: THREE.Mesh[] = [];
  const lightAnchors: CaveLightAnchor[] = [];

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
    emissiveIntensity: 1.75,
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

  const zEnd = Math.round(CAVE_END_Z);
  const zMouth = Math.round(CAVE_MOUTH_Z);

  // 1. Continuous winding corridor & deep subterranean crystal chamber (z = -48 .. +9)
  // Strict disjoint integer (ix, z) columns: zero overlapping coplanar faces -> zero Z-fighting/flicker
  for (let z = zEnd; z <= zMouth; z++) {
    const cx = cavePathCenterX(z);
    const prevCx = cavePathCenterX(Math.max(zEnd, z - 1));
    const nextCx = cavePathCenterX(Math.min(zMouth, z + 1));
    const hw = caveHalfWidthAt(z);
    const fy = caveFloorYAt(site, z) - site.floorY;
    const ceilH = caveCeilingClearanceAt(z);

    const minColX = Math.floor(Math.min(cx, prevCx, nextCx) - hw) - 2;
    const maxColX = Math.ceil(Math.max(cx, prevCx, nextCx) + hw) + 2;
    const isEndCap = z === zEnd;
    const isPortalZone = z >= CAVE_PORTAL_Z - 1 && z <= CAVE_PORTAL_Z + 1;
    const isExteriorTrench = z > CAVE_PORTAL_Z + 0.5;
    const isDeepZone = z < -10;

    for (let ix = minColX; ix <= maxColX; ix++) {
      const dPath = Math.abs(ix - cx);

      if (isEndCap) {
        if (dPath <= hw + 1.85) {
          // Sealed back cavern wall with embedded glowing ore veins (no overlapping floor/ceiling slabs here)
          const wallTop = Math.ceil(ceilH) + 1;
          for (let dy = -1; dy <= wallTop; dy++) {
            const wy = fy + dy + 0.5;
            const isOre = dy >= 1 && dy <= 4 && Math.abs(ix * 7 + dy * 3 + z) % 5 === 0;
            pushBlock(ix, wy, z, isOre ? 'ore' : 'deep', 1.0, 1.0, 1.0);
          }
        }
        continue;
      }

      if (isExteriorTrench) {
        // Exterior approach trench floor & retaining wing walls (z = 5..9)
        if (dPath < 3.6) {
          pushBlock(ix, fy - 0.7, z, 'cobble', 1.0, 1.4, 1.0);
        } else if (Math.abs(ix) >= 4 && Math.abs(ix) <= 5) {
          const wallTop = Math.ceil(fy + 3.2);
          for (let dy = Math.floor(fy); dy <= wallTop; dy++) {
            pushBlock(ix, dy + 0.5, z, dy === wallTop ? 'turf' : 'cobble', 1.0, 1.0, 1.0);
          }
        }
        continue;
      }

      if (dPath < hw) {
        // Disjoint interior floor slab (top at fy exact, 1.4m deep to seal slope steps cleanly)
        const floorKind: 'cobble' | 'deep' =
          isDeepZone && Math.abs(ix + z) % 3 !== 0 ? 'deep' : 'cobble';
        pushBlock(ix, fy - 0.7, z, floorKind, 1.0, 1.4, 1.0);

        // Disjoint vaulted ceiling slab (bottom at fy + ceilH + edgeDrop, strictly above tunnel)
        const edgeDrop = dPath > hw * 0.72 ? -0.45 : 0;
        const ceilBottom = fy + ceilH + edgeDrop;
        pushBlock(ix, ceilBottom + 0.7, z, isDeepZone ? 'deep' : 'cobble', 1.0, 1.4, 1.0);
      } else if (dPath <= hw + 1.85) {
        // Disjoint side wall columns (1x1x1 cubes stacked cleanly with zero X/Y/Z overlap)
        const wallTop = Math.ceil(ceilH) + (isPortalZone ? 2 : 1);
        for (let dy = -1; dy <= wallTop; dy++) {
          const wy = fy + dy + 0.5;
          const isOre =
            dPath < hw + 0.95 &&
            dy >= 1 &&
            dy <= 4 &&
            Math.abs((ix * 5 + z + dy * 3) % 6) === 1;
          const kind: 'cobble' | 'deep' | 'ore' = isOre
            ? 'ore'
            : isDeepZone || dy >= 2
              ? 'deep'
              : 'cobble';
          pushBlock(ix, wy, z, kind, 1.0, 1.0, 1.0);
        }
      }
    }
  }

  // Stone portal collar placed cleanly outside z = 4.5 ceiling boundary so zero faces overlap
  const portalFloor = caveFloorYAt(site, CAVE_PORTAL_Z) - site.floorY;
  const portalArch = new THREE.Mesh(new THREE.BoxGeometry(10.6, 2.0, 1.4), graniteMat);
  portalArch.position.set(0, portalFloor + 6.85, 5.15);
  const portalCapTurf = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.7, 1.3), turfCapMat);
  portalCapTurf.position.set(0, portalFloor + 8.2, 5.15);
  group.add(portalArch, portalCapTurf);

  const addInstanced = (mats: THREE.Matrix4[], mat: THREE.Material) => {
    if (mats.length === 0) return;
    const inst = new THREE.InstancedMesh(blockGeo, mat, mats.length);
    for (let i = 0; i < mats.length; i++) inst.setMatrixAt(i, mats[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.receiveShadow = true;
    inst.castShadow = false;
    group.add(inst);
  };
  addInstanced(cobbleMatrices, cobbleMat);
  addInstanced(deepMatrices, deepMat);
  addInstanced(oreMatrices, oreMat);
  addInstanced(earthCapMatrices, turfCapMat);

  // 2. Curve-aligned Minecraft Mineshaft Timber Support Arches along the winding descent
  for (const bz of [4.8, -1.2, -7.8, -14.5, -21.2, -28.0]) {
    const cx = cavePathCenterX(bz);
    const dx = cavePathCenterX(bz + 0.5) - cavePathCenterX(bz - 0.5);
    const tangentYaw = Math.atan2(dx, 1.0);
    const hw = caveHalfWidthAt(bz);
    const fy = caveFloorYAt(site, bz) - site.floorY;
    const beamY = fy + caveCeilingClearanceAt(bz) - 0.45;
    const postH = beamY - fy + 0.2;
    const span = hw * 2 - 0.4;

    const frameGrp = new THREE.Group();
    frameGrp.position.set(cx, fy, bz);
    frameGrp.rotation.y = tangentYaw;

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.42, postH, 0.42), timberMat);
    postL.position.set(-(hw - 0.35), postH * 0.5 - 0.1, 0);
    const postR = postL.clone();
    postR.position.x = hw - 0.35;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(span + 0.4, 0.44, 0.44), timberMat);
    beam.position.set(0, postH - 0.15, 0);
    frameGrp.add(postL, postR, beam);
    group.add(frameGrp);
  }

  // 3. Glowing Crystal Clusters along bends + Grand Vaulted Chamber Shrine (z = -34..-47)
  const chamberCenterX = cavePathCenterX(-41.0);
  const crystalSpots: [number, number, number][] = [
    [-2.85, 6.2, 0.95],
    [2.85, 6.2, 0.95],
    [cavePathCenterX(-6.0) - 2.65, -6.0, 1.05],
    [cavePathCenterX(-13.0) + 2.65, -13.0, 1.15],
    [cavePathCenterX(-21.0) - 2.65, -21.0, 1.2],
    [cavePathCenterX(-29.0) + 3.1, -29.0, 1.25],
    [chamberCenterX - 5.2, -37.5, 1.45],
    [chamberCenterX + 5.2, -38.5, 1.35],
    [chamberCenterX - 4.6, -44.8, 1.5],
    [chamberCenterX + 4.4, -44.2, 1.4],
    [chamberCenterX, -41.0, 1.65],
  ];
  for (const [cx, cz, cs] of crystalSpots) {
    const cy = caveFloorYAt(site, cz) - site.floorY;
    const cBlock = new THREE.Mesh(new THREE.BoxGeometry(0.56 * cs, 1.15 * cs, 0.56 * cs), crystalMat);
    cBlock.position.set(cx, cy + 0.55 * cs, cz);
    const cTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.32 * cs, 0), crystalMat);
    cTip.position.set(cx, cy + 1.28 * cs, cz);
    group.add(cBlock, cTip);
    crystalMeshes.push(cTip);
  }

  // Hanging ceiling crystal stalactites in the deep vaulted cavern
  for (const [sxOff, sz] of [
    [-3.2, -35.0],
    [2.8, -37.2],
    [-1.4, -40.5],
    [3.4, -42.5],
    [-2.5, -45.0],
  ]) {
    const fy = caveFloorYAt(site, sz) - site.floorY;
    const ceilY = fy + caveCeilingClearanceAt(sz);
    const sx = cavePathCenterX(sz) + sxOff;
    const stal = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.35, 0.46), crystalMat);
    stal.position.set(sx, ceilY - 0.6, sz);
    group.add(stal);
  }

  // 4. Wall Torches winding through every bend + pooled light anchors
  const torchSpecs: [number, number, number][] = [
    [-1, 5.2, 0.34],
    [1, -1.5, -0.34],
    [-1, -8.5, 0.34],
    [1, -15.5, -0.34],
    [-1, -22.5, 0.34],
    [1, -29.5, -0.34],
    [-1, -36.5, 0.34],
    [1, -43.5, -0.34],
  ];
  for (const [side, tz, tiltZ] of torchSpecs) {
    const hw = caveHalfWidthAt(tz);
    const tx = cavePathCenterX(tz) + side * (hw - 0.48);
    const ty = caveFloorYAt(site, tz) - site.floorY + 2.35;
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), torchWoodMat);
    stick.position.set(tx, ty, tz);
    stick.rotation.z = tiltZ;
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), flameMat);
    flame.position.set(tx - Math.sign(tiltZ) * 0.12, ty + 0.44, tz);
    group.add(stick, flame);
    torchFlames.push(flame);
    lightAnchors.push({
      lx: tx - Math.sign(tiltZ) * 0.3,
      ly: ty + 0.65,
      lz: tz,
      color: 0xffaa44,
      baseInt: 5.2,
      radius: 22,
    });
  }

  // Deep crystal grotto ambient light anchors
  const chamberY = caveFloorYAt(site, CAVE_CHAMBER_Z) - site.floorY;
  lightAnchors.push(
    {
      lx: chamberCenterX,
      ly: chamberY + 3.2,
      lz: -41.0,
      color: site.crystalColor,
      baseInt: 6.2,
      radius: 28,
    },
    {
      lx: cavePathCenterX(-18.0),
      ly: caveFloorYAt(site, -18.0) - site.floorY + 2.8,
      lz: -18.0,
      color: site.crystalColor,
      baseInt: 4.5,
      radius: 22,
    },
  );

  return { group, torchLights, torchFlames, crystalMeshes, lightAnchors };
}

export interface DungeonVisual {
  group: THREE.Group;
  crystalMeshes: THREE.Mesh[];
  flameMeshes: THREE.Mesh[];
}

interface DungeonMatSet {
  wallMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  floorMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  crystalMat: THREE.MeshStandardMaterial;
  flameMat: THREE.MeshStandardMaterial;
  ironMat: THREE.MeshStandardMaterial;
}

const dungeonMatCache = new WeakMap<ProceduralTextures, Map<DungeonSite['style'], DungeonMatSet>>();

function getDungeonMaterials(textures: ProceduralTextures, style: DungeonSite['style']): DungeonMatSet {
  let byStyle = dungeonMatCache.get(textures);
  if (!byStyle) {
    byStyle = new Map();
    dungeonMatCache.set(textures, byStyle);
  }
  const existing = byStyle.get(style);
  if (existing) return existing;

  const isPyramid = style === 'pyramid';
  const isFrost = style === 'frost_bastion';
  const isObsidian = style === 'obsidian_shrine';
  const isCrypt = style === 'crypt';

  const wallMat = new THREE.MeshStandardMaterial({
    map: isPyramid
      ? textures.sandBankTile
      : isObsidian
        ? textures.minecraftDeepslate
        : isCrypt
          ? textures.minecraftCobble
          : textures.stoneBlock,
    color: isFrost ? 0xdbeafe : isObsidian ? 0x312e81 : isPyramid ? 0xfde68a : 0xffffff,
    roughness: isFrost ? 0.45 : 0.88,
    metalness: isObsidian ? 0.2 : 0.06,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    map: isPyramid ? textures.stoneBlock : textures.minecraftDeepslate,
    color: isPyramid ? 0xf59e0b : isFrost ? 0x60a5fa : isObsidian ? 0x991b1b : isCrypt ? 0x4c1d95 : 0x64748b,
    roughness: 0.72,
    metalness: 0.18,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    map: isPyramid ? textures.sandBankTile : textures.plazaCobble,
    color: isFrost ? 0xbfdbfe : isObsidian ? 0x1e1b4b : 0xd1d5db,
    roughness: 0.85,
  });

  const accentColor = isPyramid
    ? 0xfbbf24
    : isFrost
      ? 0x38bdf8
      : isObsidian
        ? 0xf43f5e
        : isCrypt
          ? 0xa855f7
          : 0x10b981;

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.55,
    metalness: 0.35,
  });

  const crystalMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.55,
    roughness: 0.2,
  });

  const flameMat = new THREE.MeshStandardMaterial({
    color: isFrost ? 0x7dd3fc : 0xfbbf24,
    emissive: isFrost ? 0x0284c7 : isCrypt ? 0x9333ea : 0xea580c,
    emissiveIntensity: 2.3,
    roughness: 0.2,
  });

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.35,
  });

  const set: DungeonMatSet = { wallMat, trimMat, floorMat, accentMat, crystalMat, flameMat, ironMat };
  byStyle.set(style, set);
  return set;
}

export function buildDungeonStructure(textures: ProceduralTextures, site: DungeonSite): DungeonVisual {
  const group = new THREE.Group();
  const crystalMeshes: THREE.Mesh[] = [];
  const flameMeshes: THREE.Mesh[] = [];
  const { wallMat, trimMat, floorMat, accentMat, crystalMat, flameMat, ironMat } = getDungeonMaterials(
    textures,
    site.style,
  );
  const batch = new StaticBoxBatcher();

  // 1. Deep Stone Plinth (-2.2..0.0) & Interior Dungeon Floor (top at y = 0)
  batch.add(17.2, 2.0, 17.2, 0, -1.2, 0, trimMat);
  batch.add(16.4, 0.42, 16.4, 0, -0.21, 0, floorMat);

  // Entry stairs on +Z leading from terrain to dungeon doorway (z = 8.4..10.2)
  batch.add(4.8, 0.3, 1.0, 0, -0.15, 8.7, floorMat);
  batch.add(4.8, 0.45, 1.0, 0, -0.35, 9.6, trimMat);

  // Central Raised Altar Platform matching walkableHeightAt ([-2.2..2.2], top at y = +0.55)
  batch.add(4.4, 0.55, 4.4, 0, 0.275, 0, trimMat);
  batch.add(4.6, 0.16, 4.6, 0, 0.08, 0, accentMat);

  // 2. Perimeter Fortified Walls (matching DUNGEON_WALL_BOXES exact footprints)
  const wallH = 5.4;
  batch.add(1.0, wallH, 16.4, -7.7, wallH * 0.5, 0, wallMat);
  batch.add(1.0, wallH, 16.4, 7.7, wallH * 0.5, 0, wallMat);
  batch.add(16.4, wallH, 1.0, 0, wallH * 0.5, -7.7, wallMat);
  batch.add(6.0, wallH, 1.0, -5.2, wallH * 0.5, 7.7, wallMat);
  batch.add(6.0, wallH, 1.0, 5.2, wallH * 0.5, 7.7, wallMat);
  // Portal arch lintel & doorway jambs
  batch.add(4.6, 1.45, 1.25, 0, 4.68, 7.7, trimMat);
  batch.add(0.55, 4.1, 1.35, -2.3, 2.05, 7.7, trimMat);
  batch.add(0.55, 4.1, 1.35, 2.3, 2.05, 7.7, trimMat);
  batch.add(2.4, 0.45, 1.45, 0, 5.6, 7.7, accentMat);

  // Corner Bastion Buttresses
  for (const bx of [-7.85, 7.85]) {
    for (const bz of [-7.85, 7.85]) {
      batch.add(1.6, wallH + 1.1, 1.6, bx, (wallH + 1.1) * 0.5, bz, trimMat);
      batch.add(1.85, 0.45, 1.85, bx, wallH + 1.25, bz, accentMat);
    }
  }

  // 4 Interior Pillars matching DUNGEON_WALL_BOXES ([±3.5..±4.8])
  for (const px of [-4.15, 4.15]) {
    for (const pz of [-4.15, 4.15]) {
      batch.add(1.3, 5.2, 1.3, px, 2.6, pz, wallMat);
      batch.add(1.55, 0.42, 1.55, px, 0.21, pz, trimMat);
      batch.add(1.55, 0.42, 1.55, px, 5.0, pz, trimMat);
    }
  }

  // 3. Style-specific Roof Crown / Stepped Pyramid / Battlements
  if (site.style === 'pyramid') {
    batch.add(16.6, 0.8, 16.6, 0, 5.8, 0, wallMat);
    batch.add(13.2, 1.2, 13.2, 0, 6.8, 0, wallMat);
    batch.add(9.4, 1.3, 9.4, 0, 8.05, 0, trimMat);
    batch.add(5.6, 1.4, 5.6, 0, 9.4, 0, wallMat);
    batch.add(2.4, 1.5, 2.4, 0, 10.85, 0, accentMat);
  } else {
    // Open courtyard roof beams + battlements around parapet so sky/lighting breathes cleanly inside
    batch.add(16.4, 0.55, 1.4, 0, 5.5, -7.7, trimMat);
    batch.add(1.4, 0.55, 16.4, -7.7, 5.5, 0, trimMat);
    batch.add(1.4, 0.55, 16.4, 7.7, 5.5, 0, trimMat);
    batch.add(16.4, 0.55, 1.4, 0, 5.5, 7.7, trimMat);
    // Cross ceiling rafters at y = 5.35
    batch.add(14.8, 0.48, 0.65, 0, 5.35, -3.5, trimMat);
    batch.add(14.8, 0.48, 0.65, 0, 5.35, 3.5, trimMat);
    batch.add(0.65, 0.48, 14.8, -4.15, 5.35, 0, trimMat);
    batch.add(0.65, 0.48, 14.8, 4.15, 5.35, 0, trimMat);

    // Parapet crenelations
    for (let m = -6; m <= 6; m += 3) {
      batch.add(1.1, 0.9, 1.1, m, 6.15, -7.7, wallMat);
      batch.add(1.1, 0.9, 1.1, -7.7, 6.15, m, wallMat);
      batch.add(1.1, 0.9, 1.1, 7.7, 6.15, m, wallMat);
      if (Math.abs(m) >= 3) {
        batch.add(1.1, 0.9, 1.1, m, 6.15, 7.7, wallMat);
      }
    }

    if (site.style === 'frost_bastion' || site.style === 'obsidian_shrine') {
      for (const bx of [-7.85, 7.85]) {
        for (const bz of [-7.85, 7.85]) {
          batch.add(0.9, 1.8, 0.9, bx, wallH + 2.35, bz, accentMat);
        }
      }
    }
  }

  // Iron brazier stands beside entrance & interior corners
  const brazierCoords: [number, number, number][] = [
    [-2.75, 0.0, 8.75],
    [2.75, 0.0, 8.75],
    [-4.15, 0.0, -2.5],
    [4.15, 0.0, -2.5],
  ];
  for (const [fx, fy, fz] of brazierCoords) {
    batch.add(0.55, 1.05, 0.55, fx, fy + 0.52, fz, ironMat);
    batch.add(0.75, 0.22, 0.75, fx, fy + 1.12, fz, accentMat);
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.42), flameMat);
    flame.position.set(fx, fy + 1.48, fz);
    flame.userData.noCastShadow = true;
    flameMeshes.push(flame);
    group.add(flame);
  }

  // Animated Crystal Obelisks flanking the interior altar
  for (const [cx, cz] of [
    [-5.8, -5.8],
    [5.8, -5.8],
    [0, 5.35],
  ]) {
    if (cx !== 0) {
      batch.add(0.95, 0.7, 0.95, cx, 0.35, cz, trimMat);
    }
    const crys = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.96, 0.48), crystalMat);
    crys.position.set(cx, cx === 0 ? 6.45 : 1.35, cz === 5.35 ? 7.7 : cz);
    crys.userData.noCastShadow = true;
    crystalMeshes.push(crys);
    group.add(crys);
  }

  batch.flushInto(group);

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = !obj.userData.noCastShadow;
      obj.receiveShadow = true;
    }
  });

  return { group, crystalMeshes, flameMeshes };
}

export function buildArchedBridge(textures: ProceduralTextures): THREE.Group {
  const bridge = new THREE.Group();
  const bxCenter = riverCenterX(BRIDGE_Z);
  bridge.position.set(bxCenter, 0, BRIDGE_Z);

  const plankMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.8, metalness: 0.04 });
  const darkTimberMat = new THREE.MeshStandardMaterial({ map: textures.cabinLog, roughness: 0.86, metalness: 0.04 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneBlock, roughness: 0.9, metalness: 0.05 });

  const pierL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.4, BRIDGE_HALF_WIDTH * 2.25), stoneMat);
  pierL.position.set(-BRIDGE_HALF_LENGTH - 0.55, 0.25, 0);
  const pierR = pierL.clone();
  pierR.position.x = BRIDGE_HALF_LENGTH + 0.55;
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

export function buildFinalBossArena(textures: ProceduralTextures): THREE.Group {
  const arena = new THREE.Group();
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b2e,
    map: textures.stoneBlock,
    roughness: 0.72,
    metalness: 0.25,
  });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 1.9,
    roughness: 0.18,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 1.8,
    roughness: 0.15,
  });

  // Main raised octagonal obsidian dais
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(17.5, 18.8, 0.9, 8), obsidianMat);
  dais.position.y = 0.25;
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(6.8, 7.6, 24), runeMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.72;
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(15.2, 16.0, 24), runeMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.72;
  arena.add(dais, innerRing, outerRing);

  // 6 towering obsidian obelisks with floating abyssal crystals
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.35;
    const px = Math.cos(ang) * 14.5;
    const pz = Math.sin(ang) * 14.5;
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), obsidianMat);
    base.position.set(px, 1.0, pz);
    base.rotation.y = ang;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.35, 6.2 + (i % 2) * 1.4, 1.35), obsidianMat);
    shaft.position.set(px, 4.4, pz);
    shaft.rotation.y = ang;
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.28, 1.48), runeMat);
    band.position.set(px, 5.4, pz);
    band.rotation.y = ang;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), crystalMat);
    gem.position.set(px, 8.6 + (i % 2) * 0.9, pz);
    gem.name = 'arenaCrystal';
    arena.add(base, shaft, band, gem);
  }

  // 4 ritual braziers flanking the southern entrance ramp and northern throne side
  const brazierCoords: [number, number][] = [
    [-5.8, 15.2],
    [5.8, 15.2],
    [-7.5, -13.5],
    [7.5, -13.5],
  ];
  for (const [bx, bz] of brazierCoords) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.65, 1.15, 6), obsidianMat);
    bowl.position.set(bx, 0.9, bz);
    const ember = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.25, 6), runeMat);
    ember.position.set(bx, 1.85, bz);
    ember.name = 'arenaFlame';
    arena.add(bowl, ember);
  }

  arena.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return arena;
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

export interface BuiltStructureVisual {
  group: THREE.Group;
  doorPivot?: THREE.Group;
  flame?: THREE.Mesh;
}

export function buildPlayerStructureModel(
  kind: BuildPieceKind,
  textures: ProceduralTextures,
): BuiltStructureVisual {
  const group = new THREE.Group();
  const plankMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.78, metalness: 0.05 });
  const logMat = new THREE.MeshStandardMaterial({ map: textures.cabinLog, roughness: 0.86, metalness: 0.04 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneBlock, roughness: 0.9, metalness: 0.06 });
  const roofMat = new THREE.MeshStandardMaterial({ map: textures.roofShingle, roughness: 0.8, metalness: 0.06 });
  const doorMat = new THREE.MeshStandardMaterial({ map: textures.doorWood, roughness: 0.72, metalness: 0.08 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.24 });
  const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.34 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.84,
  });

  let doorPivot: THREE.Group | undefined;
  let flame: THREE.Mesh | undefined;

  // Spacious 4.0m x 4.0m bay & 3.1m wall height (3.4m story pitch)
  if (kind === 'floor') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.04, 0.3, 4.04), plankMat);
    deck.position.y = 0.18;
    for (const bz of [-1.68, 0, 1.68]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(4.06, 0.12, 0.26), logMat);
      beam.position.set(0, 0.05, bz);
      group.add(beam);
    }
    group.add(deck);
  } else if (kind === 'wall') {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.04, 0.48, 0.44), stoneMat);
    plinth.position.y = 0.24;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.58, 0.36), logMat);
    wall.position.y = 1.76;
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(4.08, 0.22, 0.44), plankMat);
    topBeam.position.y = 3.04;
    for (const px of [-1.84, 0, 1.84]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(px === 0 ? 0.22 : 0.28, 3.12, 0.44),
        plankMat,
      );
      post.position.set(px, 1.56, 0);
      group.add(post);
    }
    group.add(plinth, wall, topBeam);
  } else if (kind === 'window_wall') {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.04, 0.48, 0.44), stoneMat);
    plinth.position.y = 0.24;
    const lowWall = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.72, 0.36), logMat);
    lowWall.position.y = 0.84;
    const highWall = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.66, 0.36), logMat);
    highWall.position.y = 2.78;
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.26, 0.36), logMat);
    pillarL.position.set(-1.44, 1.82, 0);
    const pillarR = pillarL.clone();
    pillarR.position.x = 1.44;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.76, 1.22, 0.08), glassMat);
    glass.position.set(0, 1.82, 0);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.12, 0.52), plankMat);
    sill.position.set(0, 1.2, 0);
    const header = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.12, 0.48), plankMat);
    header.position.set(0, 2.44, 0);
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.24, 0.18), plankMat);
    mullionV.position.set(0, 1.82, 0);
    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.1, 0.18), plankMat);
    mullionH.position.set(0, 1.82, 0);
    group.add(plinth, lowWall, highWall, pillarL, pillarR, glass, sill, header, mullionV, mullionH);
  } else if (kind === 'doorway') {
    const jambL = new THREE.Mesh(new THREE.BoxGeometry(1.14, 3.12, 0.42), logMat);
    jambL.position.set(-1.43, 1.56, 0);
    const jambR = jambL.clone();
    jambR.position.x = 1.43;
    const plinthL = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.46, 0.46), stoneMat);
    plinthL.position.set(-1.43, 0.23, 0);
    const plinthR = plinthL.clone();
    plinthR.position.x = 1.43;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.06, 0.58, 0.44), plankMat);
    lintel.position.set(0, 2.83, 0);

    doorPivot = new THREE.Group();
    doorPivot.position.set(-0.84, 0, 0);
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.66, 2.52, 0.14), doorMat);
    doorLeaf.position.set(0.83, 1.26, 0);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 0.18), darkIronMat);
    brace.position.set(0.83, 0.65, 0);
    const braceTop = brace.clone();
    braceTop.position.y = 1.9;
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), brassMat);
    handle.position.set(1.42, 1.18, 0.1);
    const handleBack = handle.clone();
    handleBack.position.z = -0.1;
    doorPivot.add(doorLeaf, brace, braceTop, handle, handleBack);

    group.add(jambL, jambR, plinthL, plinthR, lintel, doorPivot);
  } else if (kind === 'stairs') {
    const stairAngle = Math.atan2(3.4, 4.0);
    const stringerLen = Math.hypot(4.0, 3.4);
    for (const sx of [-1.72, 1.72]) {
      const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, stringerLen), logMat);
      stringer.position.set(sx, 1.62, 0);
      stringer.rotation.x = stairAngle;
      group.add(stringer);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, stringerLen + 0.15), plankMat);
      rail.position.set(sx, 2.66, 0);
      rail.rotation.x = stairAngle;
      group.add(rail);

      for (const [pz, py] of [
        [1.76, 0.68],
        [0, 2.15],
        [-1.76, 3.65],
      ] as [number, number][]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.18, 0.16), logMat);
        post.position.set(sx, py, pz);
        group.add(post);
      }
    }
    const stepCount = 13;
    for (let s = 0; s < stepCount; s++) {
      const t = (s + 0.5) / stepCount;
      const sy = t * 3.4 - 0.04;
      const sz = 2.0 - t * 4.0;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.16, 0.38), plankMat);
      tread.position.set(0, sy, sz);
      group.add(tread);
    }
    const baseBeam = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.16, 0.28), logMat);
    baseBeam.position.set(0, 0.08, 1.88);
    group.add(baseBeam);
  } else if (kind === 'pillar') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.48, 0.7), stoneMat);
    base.position.y = 0.24;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.46, 2.48, 0.46), logMat);
    shaft.position.y = 1.68;
    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.72), plankMat);
    capital.position.y = 3.0;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.54), darkIronMat);
    band.position.y = 0.54;
    group.add(base, shaft, capital, band);
  } else if (kind === 'balcony') {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(4.04, 0.2, 0.28), stoneMat);
    curb.position.y = 0.1;
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(4.08, 0.14, 0.3), plankMat);
    railTop.position.y = 1.12;
    const railMid = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.1, 0.16), plankMat);
    railMid.position.y = 0.62;
    group.add(curb, railTop, railMid);
    for (const px of [-1.86, -1.24, -0.62, 0, 0.62, 1.24, 1.86]) {
      const isCorner = Math.abs(px) > 1.5 || px === 0;
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(isCorner ? 0.2 : 0.12, 1.02, isCorner ? 0.22 : 0.14),
        isCorner ? logMat : plankMat,
      );
      post.position.set(px, 0.6, 0);
      group.add(post);
    }
  } else if (kind === 'roof') {
    const pitch = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.26, 4.38), roofMat);
    pitch.position.set(0, 0.88, 0);
    pitch.rotation.x = 0.4;
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.24, 0.3), plankMat);
    ridge.position.set(0, 1.72, -1.78);
    for (const ex of [-1.84, 0, 1.84]) {
      const eave = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.4, 0.24), logMat);
      eave.position.set(ex, 0.72, -1.78);
      group.add(eave);
    }
    group.add(pitch, ridge);
  } else if (kind === 'roof_peak') {
    const slopeL = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.24, 2.72), roofMat);
    slopeL.position.set(0, 0.92, -1.04);
    slopeL.rotation.x = -0.54;
    const slopeR = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.24, 2.72), roofMat);
    slopeR.position.set(0, 0.92, 1.04);
    slopeR.rotation.x = 0.54;
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.28, 0.32), logMat);
    ridge.position.set(0, 1.66, 0);
    for (const gx of [-1.88, 1.88]) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 3.96), plankMat);
      tie.position.set(gx, 0.14, 0);
      const king = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.46, 0.22), plankMat);
      king.position.set(gx, 0.88, 0);
      group.add(tie, king);
    }
    group.add(slopeL, slopeR, ridge);
  } else if (kind === 'roof_flat') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.06, 0.3, 4.06), stoneMat);
    deck.position.y = 0.18;
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(3.66, 0.06, 3.66), plankMat);
    inlay.position.y = 0.33;
    for (const jz of [-1.6, 0, 1.6]) {
      const joist = new THREE.Mesh(new THREE.BoxGeometry(4.04, 0.14, 0.26), logMat);
      joist.position.set(0, 0.05, jz);
      group.add(joist);
    }
    group.add(deck, inlay);
  } else if (kind === 'bed') {
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.78 });
    const quiltMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.32, 2.52), plankMat);
    frame.position.y = 0.38;
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.26, 2.38), quiltMat);
    mattress.position.y = 0.62;
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.14, 1.62), blanketMat);
    blanket.position.set(0, 0.71, 0.35);
    for (const px of [-0.42, 0.42]) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.48), pillowMat);
      pillow.position.set(px, 0.79, -0.8);
      group.add(pillow);
    }
    const headBoard = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.32, 0.18), logMat);
    headBoard.position.set(0, 0.68, -1.24);
    const footBoard = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.82, 0.16), logMat);
    footBoard.position.set(0, 0.44, 1.24);
    for (const [lx, lz] of [
      [-0.84, -1.24],
      [0.84, -1.24],
      [-0.84, 1.24],
      [0.84, 1.24],
    ] as [number, number][]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, 0.18), logMat);
      post.position.set(lx, lz < 0 ? 0.72 : 0.48, lz);
      if (lz > 0) post.scale.y = 0.72;
      group.add(post);
    }
    group.add(frame, mattress, blanket, headBoard, footBoard);
  } else if (kind === 'fireplace') {
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xea580c,
      emissiveIntensity: 1.9,
      roughness: 0.4,
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 2.5,
      roughness: 0.2,
    });
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.26, 1.44), stoneMat);
    hearth.position.set(0, 0.13, 0.1);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.22, 1.98, 0.42), stoneMat);
    backWall.position.set(0, 1.12, -0.4);
    const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.76, 0.84), stoneMat);
    cheekL.position.set(-0.86, 1.04, 0.04);
    const cheekR = cheekL.clone();
    cheekR.position.x = 0.86;
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.28, 1.04), plankMat);
    mantle.position.set(0, 2.06, -0.06);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.85, 0.74), stoneMat);
    chimney.position.set(0, 3.0, -0.24);
    const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.2, 0.9), darkIronMat);
    chimneyCap.position.set(0, 3.96, -0.24);
    const embers = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.12, 0.56), emberMat);
    embers.position.set(0, 0.3, 0.06);
    const logA = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.98, 6), logMat);
    logA.rotation.z = Math.PI * 0.47;
    logA.position.set(0, 0.42, 0.06);
    flame = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.98, 6), flameMat);
    flame.position.set(0, 0.82, 0.06);
    group.add(hearth, backWall, cheekL, cheekR, mantle, chimney, chimneyCap, embers, logA, flame);
  } else if (kind === 'workbench') {
    const legGeo = new THREE.BoxGeometry(0.22, 1.0, 0.22);
    for (const lx of [-0.94, 0.94]) {
      for (const lz of [-0.46, 0.46]) {
        const leg = new THREE.Mesh(legGeo, logMat);
        leg.position.set(lx, 0.5, lz);
        group.add(leg);
      }
    }
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.1, 0.94), plankMat);
    shelf.position.y = 0.32;
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.16, 1.18), plankMat);
    top.position.y = 1.06;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.1, 1.22), logMat);
    trim.position.y = 0.98;
    const vise = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.24), darkIronMat);
    vise.position.set(-0.98, 1.12, 0.6);
    const anvilMini = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.26), darkIronMat);
    anvilMini.position.set(0.58, 1.24, 0.06);
    const scrollMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 });
    const blueprint = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.54), scrollMat);
    blueprint.position.set(-0.26, 1.16, -0.04);
    blueprint.rotation.y = 0.14;
    const lanternOrb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.2), glassMat);
    lanternOrb.position.set(-0.92, 1.28, -0.4);
    group.add(shelf, top, trim, vise, anvilMini, blueprint, lanternOrb);
  } else if (kind === 'campfire') {
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xea580c,
      emissiveIntensity: 1.8,
      roughness: 0.4,
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 2.4,
      roughness: 0.2,
    });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), stoneMat);
      st.position.set(Math.cos(a) * 0.96, 0.16, Math.sin(a) * 0.96);
      group.add(st);
    }
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.1, 8), emberMat);
    bed.position.y = 0.08;
    group.add(bed);
    for (let i = 0; i < 4; i++) {
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.38, 6), logMat);
      lg.rotation.z = Math.PI * 0.36;
      lg.rotation.y = (i / 4) * Math.PI;
      lg.position.y = 0.26;
      group.add(lg);
    }
    for (const sx of [-0.88, 0.88]) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.42, 5), logMat);
      stake.position.set(sx, 0.71, 0);
      group.add(stake);
    }
    const spitBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.92, 6), darkIronMat);
    spitBar.rotation.z = Math.PI * 0.5;
    spitBar.position.set(0, 1.28, 0);
    group.add(spitBar);
    flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.02, 6), flameMat);
    flame.position.y = 0.64;
    group.add(flame);
  } else {
    const baseStone = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.42, 6), stoneMat);
    baseStone.position.y = 0.21;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.85, 0.24), logMat);
    post.position.y = 1.78;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.16, 0.18), plankMat);
    arm.position.set(0.3, 3.12, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.26, 4), darkIronMat);
    cap.rotation.y = Math.PI * 0.25;
    cap.position.set(0.58, 3.0, 0);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    flame = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), flameMat);
    flame.position.set(0.58, 2.72, 0);
    group.add(baseStone, post, arm, cap, flame);
  }

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return { group, doorPivot, flame };
}

export function buildAdminGalleryPainting(textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneBlock, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.cabinLog, roughness: 0.8 });
  const plankMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.72 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.35 });

  // Grand Stone showcase plinth (9.6m wide for 2-tier 7-portrait gallery)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.44, 1.45), stoneMat);
  plinth.position.y = 0.22;
  const plinthCap = new THREE.Mesh(new THREE.BoxGeometry(9.85, 0.14, 1.58), stoneMat);
  plinthCap.position.y = 0.48;
  group.add(plinth, plinthCap);

  // Heavy oak posts + wooden backing wall + middle divider & gable roof eave
  for (const px of [-4.45, -2.22, 0, 2.22, 4.45]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.35, 0.24), woodMat);
    post.position.set(px, 2.65, -0.06);
    group.add(post);
  }
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(8.95, 3.72, 0.12), plankMat);
  backWall.position.set(0, 2.55, -0.06);
  const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(9.15, 0.2, 0.26), plankMat);
  bottomRail.position.set(0, 0.78, 0);
  const midRail = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.18, 0.24), plankMat);
  midRail.position.set(0, 2.52, 0.01);
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(9.35, 0.26, 0.34), plankMat);
  topRail.position.set(0, 4.46, 0);
  const roofEave = new THREE.Mesh(new THREE.BoxGeometry(9.75, 0.16, 1.05), plankMat);
  roofEave.position.set(0, 4.78, 0.16);
  roofEave.rotation.x = 0.14;
  group.add(backWall, bottomRail, midRail, topRail, roofEave);

  // Load all 7 admin photos cleanly with sRGB colorSpace
  const texLoader = new THREE.TextureLoader();
  const loadPhotoMat = (url: string) => {
    const tex = texLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.52,
      metalness: 0.04,
      emissive: new THREE.Color(0x18181b),
      emissiveIntensity: 0.18,
    });
  };

  const panelSpecs: { x: number; y: number; w: number; h: number; url: string }[] = [
    // Top row: 4 portraits
    { x: -3.32, y: 3.44, w: 1.94, h: 1.52, url: '/assets/aistudio/2026-09-29_114618_08f4377c.png' },
    { x: -1.11, y: 3.44, w: 1.94, h: 1.52, url: '/assets/aistudio/2026-09-29_121604_edbd73f6.png' },
    { x: 1.11, y: 3.44, w: 1.94, h: 1.52, url: '/assets/aistudio/1000022809_38560aab.jpg' },
    { x: 3.32, y: 3.44, w: 1.94, h: 1.52, url: '/assets/aistudio/1000004652_e21f04e2.jpg' },
    // Bottom row: 3 portraits centered
    { x: -2.42, y: 1.66, w: 2.14, h: 1.54, url: '/assets/aistudio/1000004651_aabbdacc.jpg' },
    { x: 0, y: 1.66, w: 2.14, h: 1.54, url: '/assets/aistudio/1000007193_56589f8c.jpg' },
    { x: 2.42, y: 1.66, w: 2.14, h: 1.54, url: '/assets/aistudio/1000012940_8e7fd938.jpg' },
  ];

  for (const spec of panelSpecs) {
    const outerFrame = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.18, spec.h + 0.18, 0.14),
      goldMat,
    );
    outerFrame.position.set(spec.x, spec.y, 0.06);
    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.04, spec.h + 0.04, 0.16),
      plankMat,
    );
    backing.position.set(spec.x, spec.y, 0.06);
    const canvasPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.w, spec.h),
      loadPhotoMat(spec.url),
    );
    canvasPlane.position.set(spec.x, spec.y, 0.15);
    group.add(outerFrame, backing, canvasPlane);
  }

  // Crisp CanvasTexture plaque "АДМІНИ ГРИ"
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('АДМІНИ ГРИ', 256, 66);
  }
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const plaqueBoard = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 0.12), plankMat);
  plaqueBoard.position.set(0, 4.46, 0.19);
  const plaqueFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.64, 0.5),
    new THREE.MeshBasicMaterial({ map: signTex }),
  );
  plaqueFace.position.set(0, 4.46, 0.26);
  group.add(plaqueBoard, plaqueFace);

  // Warm brass lanterns flanking the 7 portraits
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  for (const lx of [-4.45, 4.45]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.46), ironMat);
    bracket.position.set(lx, 4.22, 0.24);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), glowMat);
    lamp.position.set(lx, 3.98, 0.42);
    group.add(bracket, lamp);
  }

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return group;
}

export function buildStarterToolStand(textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();
  const logMat = new THREE.MeshStandardMaterial({ map: textures.cabinLog, roughness: 0.85 });
  const plankMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.72 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.82, roughness: 0.28 });

  // Heavy wooden rack base + uprights
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 0.9), logMat);
  base.position.y = 0.1;
  group.add(base);
  for (const sx of [-1.22, 1.22]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.05, 0.18), logMat);
    post.position.set(sx, 1.12, 0);
    group.add(post);
  }
  const barLow = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.14, 0.18), plankMat);
  barLow.position.set(0, 0.78, 0);
  const barHigh = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.16, 0.22), plankMat);
  barHigh.position.set(0, 1.95, 0);
  group.add(barLow, barHigh);

  // Miniature display tools on rack: sword, axe, pickaxe, hammer
  const swordGrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), goldMat);
  swordGrip.position.set(-0.75, 1.55, 0.14);
  const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.96, 0.04), steelMat);
  swordBlade.position.set(-0.75, 1.0, 0.14);
  group.add(swordGrip, swordBlade);

  const axeShaft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 0.08), plankMat);
  axeShaft.position.set(-0.22, 1.22, 0.14);
  const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.08), steelMat);
  axeHead.position.set(-0.1, 1.65, 0.14);
  group.add(axeShaft, axeHead);

  const pickShaft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 0.08), plankMat);
  pickShaft.position.set(0.3, 1.22, 0.14);
  const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.11, 0.09), steelMat);
  pickHead.position.set(0.3, 1.72, 0.14);
  group.add(pickShaft, pickHead);

  const hammerShaft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.09), plankMat);
  hammerShaft.position.set(0.82, 1.22, 0.14);
  const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.24), steelMat);
  hammerHead.position.set(0.82, 1.68, 0.14);
  group.add(hammerShaft, hammerHead);

  // Small top sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.34, 0.1), plankMat);
  sign.position.set(0, 2.26, 0.04);
  group.add(sign);

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return group;
}

export interface RemoteNameTagHandle {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  material: THREE.SpriteMaterial;
  lastKey: string;
}

export function updateRemoteNameTag(
  handle: RemoteNameTagHandle,
  name: string,
  device: 'mobile' | 'desktop',
  level: number,
  hpRatio: number,
) {
  const clampedHp = Math.max(0, Math.min(1, hpRatio));
  const hpBucket = Math.round(clampedHp * 20);
  const nextKey = `${name}|${device}|${level}|${hpBucket}`;
  if (handle.lastKey === nextKey) return;
  handle.lastKey = nextKey;

  const { canvas, texture } = handle;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Pill background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
  ctx.strokeStyle = device === 'mobile' ? '#34d399' : '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(6, 6, w - 12, h - 12, 16);
  ctx.fill();
  ctx.stroke();

  // Device tag pill ([МОБ] or [ПК])
  const badgeText = device === 'mobile' ? 'МОБ' : 'ПК';
  ctx.fillStyle = device === 'mobile' ? '#10b981' : '#0ea5e9';
  ctx.beginPath();
  ctx.roundRect(16, 14, 58, 28, 8);
  ctx.fill();

  ctx.fillStyle = '#020617';
  ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, 45, 29);

  // Player Name + Level
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 21px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${name.slice(0, 15)} · ${level}`, 84, 29);

  // Mini HP Bar
  const barX = 18;
  const barY = 50;
  const barW = w - 36;
  const barH = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 5);
  ctx.fill();

  if (clampedHp > 0.01) {
    ctx.fillStyle = clampedHp > 0.45 ? '#22c55e' : clampedHp > 0.2 ? '#f59e0b' : '#ef4444';
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(8, barW * clampedHp), barH, 5);
    ctx.fill();
  }

  texture.needsUpdate = true;
}

export function buildRemoteNameTag(
  name: string,
  device: 'mobile' | 'desktop',
  level: number,
  hpRatio: number,
): RemoteNameTagHandle {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 72;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.45, 0.56, 1);
  sprite.position.set(0, 3.22, 0);

  const handle: RemoteNameTagHandle = {
    sprite,
    canvas,
    texture,
    material,
    lastKey: '',
  };
  updateRemoteNameTag(handle, name, device, level, hpRatio);
  return handle;
}

export interface SpawnThroneVisual {
  group: THREE.Group;
  buttonMesh: THREE.Mesh;
  buttonBaseY: number;
}

export function buildSpawnThrone(textures: ProceduralTextures): SpawnThroneVisual {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneBlock, roughness: 0.86 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.72 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.24 });
  const velvetMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.82 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.78, roughness: 0.32 });
  const buttonMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.15,
  });

  // Two-tier royal stone dais + red carpet runner
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.24, 3.6), stoneMat);
  step1.position.set(0, 0.12, 0);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.26, 2.55), stoneMat);
  step2.position.set(0, 0.37, -0.2);
  const carpetLower = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.04, 1.35), velvetMat);
  carpetLower.position.set(0, 0.25, 1.15);
  const carpetUpper = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.04, 2.2), velvetMat);
  carpetUpper.position.set(0, 0.51, -0.2);
  group.add(step1, step2, carpetLower, carpetUpper);

  // Royal throne base, seat, armrests, high carved backrest & gold crown crest
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.52, 1.25), darkWoodMat);
  seatBase.position.set(-0.22, 0.76, -0.35);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.18, 1.08), velvetMat);
  cushion.position.set(-0.22, 1.09, -0.32);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.95, 0.24), darkWoodMat);
  backrest.position.set(-0.22, 1.98, -0.86);
  const backVelvet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.55, 0.08), velvetMat);
  backVelvet.position.set(-0.22, 1.94, -0.71);

  for (const ax of [-0.9, 0.46]) {
    const armSupport = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 1.02), darkWoodMat);
    armSupport.position.set(ax, 1.26, -0.34);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), goldMat);
    finial.position.set(ax, 1.6, 0.12);
    const backPillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.22, 0.26), darkWoodMat);
    backPillar.position.set(ax, 2.1, -0.86);
    const pillarCap = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), goldMat);
    pillarCap.position.set(ax, 3.3, -0.86);
    group.add(armSupport, finial, backPillar, pillarCap);
  }

  // Golden crown ornament at top of throne
  const crownBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.16), goldMat);
  crownBase.position.set(-0.22, 3.06, -0.85);
  for (const cx of [-0.34, 0, 0.34]) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 4), goldMat);
    spike.position.set(-0.22 + cx, 3.3, -0.85);
    group.add(spike);
  }
  group.add(seatBase, cushion, backrest, backVelvet, crownBase);

  // Side Stone Pedestal with Empty Tactile Button ("просто кнопка пуста")
  const pedX = 1.02;
  const pedZ = 0.32;
  const pedBase = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.68), stoneMat);
  pedBase.position.set(pedX, 0.57, pedZ);
  const pedColumn = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.46), stoneMat);
  pedColumn.position.set(pedX, 0.94, pedZ);
  const pedCap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.62), ironMat);
  pedCap.position.set(pedX, 1.24, pedZ);
  const btnBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.08, 12), goldMat);
  btnBezel.position.set(pedX, 1.31, pedZ);

  const buttonBaseY = 1.38;
  const buttonMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.12, 12), buttonMat);
  buttonMesh.position.set(pedX, buttonBaseY, pedZ);
  group.add(pedBase, pedColumn, pedCap, btnBezel, buttonMesh);

  // Crisp CanvasTexture plaque "Тут раточка" (mounted above throne + front of button pedestal)
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 144;
  const ctx = signCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, 512, 144);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 128);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 62px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Тут раточка', 256, 74);
  }
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });

  // Large throne banner plaque above backrest
  const topBoard = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.56, 0.12), darkWoodMat);
  topBoard.position.set(-0.22, 3.74, -0.86);
  const topSign = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 0.44), signMat);
  topSign.position.set(-0.22, 3.74, -0.79);
  group.add(topBoard, topSign);

  // Pedestal front mini-plaque right below the button
  const pedBoard = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.06), darkWoodMat);
  pedBoard.position.set(pedX, 0.96, pedZ + 0.25);
  const pedSign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), signMat);
  pedSign.position.set(pedX, 0.96, pedZ + 0.285);
  group.add(pedBoard, pedSign);

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  return { group, buttonMesh, buttonBaseY };
}



