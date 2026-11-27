import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildSignpost } from './models';
import {
  biomeAt,
  BRIDGE_Z,
  CAVE_SITES,
  caveFloorYAt,
  FINAL_ARENA_RADIUS,
  FINAL_ARENA_X,
  FINAL_ARENA_Z,
  groundHeightAt,
  mountainRockFactorAt,
  nearAnyCabin,
  nearAnyCave,
  nearAnyDungeon,
  nearVillage,
  riverCenterX,
  riverHalfWidthAt,
  VILLAGE_SITE,
  VILLAGE_SITES,
  villagePlazaFactorAt,
  WATER_LEVEL,
  WORLD_HALF_X,
  WORLD_HALF_Z,
  WORLD_SIZE_X,
  WORLD_SIZE_Z,
} from './terrain';
import { ProceduralTextures } from './textures';
import { GraphicsPreset, SeasonId, TrailCellPoint, WeatherId } from './types';

export interface ObstacleCollider {
  x: number;
  z: number;
  radius: number;
}

export interface BuildExclusionZone {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  rotY: number;
}

export interface WorldEnvironment {
  group: THREE.Group;
  colliders: ObstacleCollider[];
  getCollidersVersion: () => number;
  addStaticCollider: (collider: ObstacleCollider) => void;
  updateTrailOverlay: (cells: TrailCellPoint[]) => void;
  warmAround: (x: number, z: number) => void;
  update: (elapsed: number, dt: number) => void;
  setEnvironmentState: (
    season: SeasonId,
    weather: WeatherId,
    playerPos: THREE.Vector3,
    sunDir: THREE.Vector3,
    dt: number,
    elapsed: number,
  ) => void;
  findTreeInFront: (
    px: number,
    pz: number,
    aimX: number,
    aimZ: number,
    range: number,
  ) => {
    id: string;
    x: number;
    z: number;
    dist: number;
    hp: number;
    maxHp: number;
    species: 'oak' | 'autumn' | 'blossom' | 'pine';
  } | null;
  hitTree: (
    id: string,
    damage: number,
    hitDirX: number,
    hitDirZ: number,
  ) => {
    felled: boolean;
    x: number;
    y: number;
    z: number;
    scale: number;
    sx: number;
    sy: number;
    sz: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    species: 'oak' | 'autumn' | 'blossom' | 'pine';
    hp: number;
    maxHp: number;
  } | null;
  createFallingTreeVisual: (
    species: 'oak' | 'autumn' | 'blossom' | 'pine',
    scale: number,
    sx: number,
    sy: number,
    sz: number,
    rotY: number,
  ) => THREE.Group;
  getChoppedTreeIds: () => string[];
  setGrassDensity: (density: number) => void;
  setPerfTier: (tier: GraphicsPreset) => void;
  setBuildExclusionZones: (zones: BuildExclusionZone[]) => void;
  dispose: () => void;
}

export interface EnvironmentBuildOptions {
  mobilePerf?: boolean;
  worldSeed?: number;
  initialX?: number;
  initialZ?: number;
  initialChoppedTrees?: string[];
}

const CHUNK_SIZE = 96;
const TERRAIN_POOL_RADIUS = 2; // 5x5 = 25 high-res terrain chunks around player (480m x 480m)
const MAX_TRAIL_TILES = 1800;

function seededRandom(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildMultiBladeTuftGeometry(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  const bladeCount = 11;

  for (let i = 0; i < bladeCount; i++) {
    const g = new THREE.BufferGeometry();
    const ringFrac = i / bladeCount;
    const rad = i < 3 ? 0.11 : 0.21 + ((i * 37) % 10) * 0.055;
    const theta = i * 2.39996; // Golden-angle spiral distribution across clump
    const ox = Math.cos(theta) * rad;
    const oz = Math.sin(theta) * rad;

    const h = 0.34 + ((i * 19) % 7) * 0.058 + (1 - ringFrac * 0.25) * 0.06;
    const wBase = 0.06 + (i % 3) * 0.01;
    const wMid = wBase * 0.56;
    const lean1 = 0.045 + (i % 3) * 0.015;
    const lean2 = 0.13 + (i % 4) * 0.032;

    const verts = new Float32Array([
      -wBase, 0, 0,
      wBase, 0, 0,
      -wMid, h * 0.54, lean1,
      wMid, h * 0.54, lean1,
      0, h, lean2,
    ]);
    const cols = new Float32Array([
      0.11, 0.24, 0.07,
      0.11, 0.24, 0.07,
      0.26, 0.46, 0.13,
      0.26, 0.46, 0.13,
      0.52, 0.78, 0.22,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    g.rotateY(theta + ((i % 5) - 2) * 0.28);
    g.translate(ox, 0, oz);
    g.computeVertexNormals();
    blades.push(g);
  }

  const merged = mergeGeometries(blades, false);
  blades.forEach((b) => b.dispose());
  return merged;
}

function buildWeatherParticleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildCrossedCardGeometry(width: number, height: number): THREE.BufferGeometry {
  const p1 = new THREE.PlaneGeometry(width, height);
  p1.translate(0, height * 0.5, 0);
  const p2 = p1.clone();
  p2.rotateY(Math.PI * 0.5);
  const p3 = p1.clone();
  p3.rotateY(Math.PI * 0.25);
  const merged = mergeGeometries([p1, p2, p3], false);
  p1.dispose();
  p2.dispose();
  p3.dispose();
  return merged;
}

function buildRealisticTreeGeometries(): {
  woodGeo: THREE.BufferGeometry;
  canopyGeo: THREE.BufferGeometry;
} {
  const woodParts: THREE.BufferGeometry[] = [];

  // Organic fluted root collar & 5 sculpted root buttresses
  const flare = new THREE.CylinderGeometry(0.42, 0.72, 1.05, 10, 2);
  flare.translate(0, 0.52, 0);
  const fPos = flare.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const vx = fPos.getX(i);
    const vy = fPos.getY(i);
    const vz = fPos.getZ(i);
    const ang = Math.atan2(vz, vx);
    const flute = 1 + (1 - Math.min(1, vy)) * 0.22 * Math.sin(ang * 5);
    fPos.setX(i, vx * flute);
    fPos.setZ(i, vz * flute);
  }
  flare.computeVertexNormals();
  woodParts.push(flare);

  for (let r = 0; r < 5; r++) {
    const yaw = (r / 5) * Math.PI * 2 + 0.25;
    const root = new THREE.CylinderGeometry(0.11, 0.25, 1.4, 7, 2);
    root.translate(0, 0.55, 0);
    root.rotateZ(-0.78);
    root.rotateY(yaw);
    root.translate(Math.cos(yaw) * 0.2, 0.04, -Math.sin(yaw) * 0.2);
    woodParts.push(root);
  }

  // Sculpted tapered curved trunk with subtle bark fluting & organic gnarl
  const trunk = new THREE.CylinderGeometry(0.16, 0.44, 6.2, 10, 9);
  trunk.translate(0, 3.1, 0);
  const tPos = trunk.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const vx = tPos.getX(i);
    const vy = tPos.getY(i);
    const vz = tPos.getZ(i);
    const hNorm = Math.max(0, Math.min(1, vy / 6.2));
    const ang = Math.atan2(vz, vx);
    const barkRib = 1 + 0.085 * Math.sin(ang * 5 + vy * 0.65) * (1 - hNorm * 0.65);
    const swayX = Math.sin(vy * 0.52) * 0.19 + Math.sin(vy * 1.15) * 0.04;
    const swayZ = Math.cos(vy * 0.46) * 0.14;
    tPos.setX(i, vx * barkRib + swayX);
    tPos.setZ(i, vz * barkRib + swayZ);
  }
  trunk.computeVertexNormals();
  woodParts.push(trunk);

  const branchCenters: THREE.Vector3[] = [
    new THREE.Vector3(0.08, 7.65, 0.05),
    new THREE.Vector3(-0.35, 6.55, 0.22),
  ];

  // 7 primary boughs + forked secondary twigs & outer shoots
  for (let b = 0; b < 7; b++) {
    const yaw = (b / 7) * Math.PI * 2 + 0.28 + (b % 2) * 0.14;
    const startY = 3.15 + (b % 4) * 0.62;
    const len = 2.85 + (b % 3) * 0.45;
    const tilt = 0.68 + (b % 3) * 0.12;

    const limb = new THREE.CylinderGeometry(0.06, 0.165, len, 7, 3);
    limb.translate(0, len * 0.5, 0);
    const lPos = limb.attributes.position;
    for (let v = 0; v < lPos.count; v++) {
      const ly = lPos.getY(v);
      lPos.setX(v, lPos.getX(v) + Math.sin((ly / len) * Math.PI) * 0.14);
    }
    limb.computeVertexNormals();
    limb.rotateZ(-tilt);
    limb.rotateY(yaw);
    limb.translate(0, startY, 0);
    woodParts.push(limb);

    const reach = Math.sin(tilt) * len;
    const tipX = Math.cos(yaw) * reach;
    const tipZ = -Math.sin(yaw) * reach;
    const tipY = startY + Math.cos(tilt) * len;
    branchCenters.push(new THREE.Vector3(tipX, tipY + 0.3, tipZ));

    for (const side of [-1, 1]) {
      const twigLen = 1.65 + (b % 2) * 0.25;
      const twig = new THREE.CylinderGeometry(0.025, 0.072, twigLen, 5);
      twig.translate(0, twigLen * 0.5, 0);
      twig.rotateZ(-0.56);
      twig.rotateY(yaw + side * 0.62);
      const ax = tipX * 0.62;
      const ay = startY + (tipY - startY) * 0.6;
      const az = tipZ * 0.62;
      twig.translate(ax, ay, az);
      woodParts.push(twig);

      if (side === 1 || b % 2 === 0) {
        const tReach = Math.sin(0.56) * twigLen;
        branchCenters.push(
          new THREE.Vector3(
            ax + Math.cos(yaw + side * 0.62) * tReach,
            ay + Math.cos(0.56) * twigLen + 0.12,
            az - Math.sin(yaw + side * 0.62) * tReach,
          ),
        );
      }
    }
  }

  const woodGeo = mergeGeometries(woodParts, false);
  woodParts.forEach((p) => p.dispose());

  // Rich dense layered leaf foliage clusters
  const leafCards: THREE.BufferGeometry[] = [];
  const cardAngles: [number, number, number, number][] = [
    [0.24, 0, 0.12, 3.65],
    [-0.32, 0.88, -0.18, 3.35],
    [0.38, 1.76, 0.22, 3.45],
    [-0.24, 2.55, 0.72, 3.15],
    [0.45, 3.45, -0.45, 3.25],
    [-0.18, 4.35, 0.35, 2.95],
  ];

  branchCenters.forEach((center, cIdx) => {
    const scaleBias = cIdx === 0 ? 1.28 : cIdx === 1 ? 1.15 : cIdx < 9 ? 0.96 + (cIdx % 2) * 0.12 : 0.78;
    cardAngles.forEach(([rx, ry, rz, baseSize], cardIdx) => {
      if (cIdx >= 9 && cardIdx >= 4) return;
      const sz = baseSize * scaleBias;
      const plane = new THREE.PlaneGeometry(sz, sz, 2, 2);
      const pAttr = plane.attributes.position;
      const cols = new Float32Array(pAttr.count * 3);

      for (let v = 0; v < pAttr.count; v++) {
        const vx = pAttr.getX(v);
        const vy = pAttr.getY(v);
        const r2 = (vx * vx + vy * vy) / (sz * sz);
        pAttr.setZ(v, (0.28 - r2) * 0.78);

        const bright = Math.max(
          0.54,
          Math.min(1.08, 0.75 + vy / (sz * 1.75) + (cIdx < 2 ? 0.12 : 0)),
        );
        cols[v * 3] = bright * 0.96;
        cols[v * 3 + 1] = bright * 1.03;
        cols[v * 3 + 2] = bright * 0.88;
      }

      plane.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      plane.rotateX(rx + (cardIdx % 2) * 0.24);
      plane.rotateY(ry + cIdx * 0.78);
      plane.rotateZ(rz);
      plane.translate(
        center.x + ((cardIdx % 3) - 1) * 0.34,
        center.y + (cardIdx === 0 ? 0.38 : (cardIdx % 2 === 0 ? 0.1 : -0.22)),
        center.z + (((cardIdx + 1) % 3) - 1) * 0.32,
      );
      plane.computeVertexNormals();
      leafCards.push(plane);
    });
  });

  const canopyGeo = mergeGeometries(leafCards, false);
  leafCards.forEach((c) => c.dispose());

  return { woodGeo, canopyGeo };
}

function buildPineTreeGeometries(): {
  pineWoodGeo: THREE.BufferGeometry;
  pineCanopyGeo: THREE.BufferGeometry;
} {
  const trunkParts: THREE.BufferGeometry[] = [];
  const mainTrunk = new THREE.CylinderGeometry(0.06, 0.44, 10.8, 10, 8);
  mainTrunk.translate(0, 5.4, 0);
  const pPos = mainTrunk.attributes.position;
  for (let i = 0; i < pPos.count; i++) {
    const vx = pPos.getX(i);
    const vy = pPos.getY(i);
    const vz = pPos.getZ(i);
    const ang = Math.atan2(vz, vx);
    const flute = 1 + 0.08 * Math.sin(ang * 6 + vy * 0.4) * Math.max(0, 1 - vy / 6);
    pPos.setX(i, vx * flute + Math.sin(vy * 0.35) * 0.08);
    pPos.setZ(i, vz * flute + Math.cos(vy * 0.32) * 0.06);
  }
  mainTrunk.computeVertexNormals();
  trunkParts.push(mainTrunk);

  // Flared root buttresses at base so spruces sit solidly on steep alpine ground
  for (let r = 0; r < 5; r++) {
    const ang = (r / 5) * Math.PI * 2 + 0.28;
    const root = new THREE.CylinderGeometry(0.11, 0.26, 1.55, 7);
    root.translate(0, 0.62, 0);
    root.rotateZ(0.5);
    root.rotateY(ang);
    root.translate(Math.cos(ang) * 0.19, 0, Math.sin(ang) * 0.19);
    trunkParts.push(root);
  }
  // Woody radial branch whorls inside the spruce silhouette (natural skeleton visible from below)
  const limbWhorls = [
    { y: 2.25, len: 2.2, count: 5, rotOff: 0.15 },
    { y: 3.55, len: 1.9, count: 5, rotOff: 0.72 },
    { y: 4.85, len: 1.6, count: 4, rotOff: 0.32 },
    { y: 6.15, len: 1.28, count: 4, rotOff: 0.85 },
    { y: 7.4, len: 0.96, count: 3, rotOff: 0.25 },
  ];
  for (const lw of limbWhorls) {
    for (let i = 0; i < lw.count; i++) {
      const ang = (i / lw.count) * Math.PI * 2 + lw.rotOff;
      const limb = new THREE.CylinderGeometry(0.025, 0.068, lw.len, 6);
      limb.translate(0, lw.len * 0.5, 0);
      limb.rotateX(1.38);
      limb.rotateY(ang);
      limb.translate(0, lw.y, 0);
      trunkParts.push(limb);
    }
  }
  const pineWoodGeo = mergeGeometries(trunkParts, false);
  trunkParts.forEach((p) => p.dispose());

  // Multi-whorl arched spruce bough sprays (dense lush pine needles)
  const boughs: THREE.BufferGeometry[] = [];
  const makeSpruceBoughCard = (
    cardW: number,
    cardLen: number,
    droopSag: number,
    tipLift: number,
    rollAngle: number,
    pitchAngle: number,
    yawAngle: number,
    attachY: number,
    innerAo: number,
  ) => {
    const plane = new THREE.PlaneGeometry(cardW, cardLen, 2, 4);
    plane.translate(0, cardLen * 0.5, 0);
    const pos = plane.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const vx = pos.getX(v);
      const vy = pos.getY(v);
      const t = Math.max(0, Math.min(1, vy / cardLen));
      const edgeCup = Math.abs(vx / Math.max(0.01, cardW * 0.5)) * 0.14;
      const archZ = Math.sin(t * Math.PI) * droopSag - t * t * tipLift + edgeCup;
      pos.setZ(v, pos.getZ(v) + archZ);
      const light = Math.min(1.08, innerAo + t * 0.44);
      cols[v * 3] = light * 0.92;
      cols[v * 3 + 1] = light * 1.04;
      cols[v * 3 + 2] = light * 0.9;
    }
    plane.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    plane.rotateZ(rollAngle);
    plane.rotateX(pitchAngle);
    plane.rotateY(yawAngle);
    plane.translate(Math.sin(yawAngle) * 0.08, attachY, Math.cos(yawAngle) * 0.08);
    plane.computeVertexNormals();
    return plane;
  };

  const whorlSpecs = [
    { y: 2.35, count: 7, len: 3.15, w: 2.25, pitch: 1.72, sag: 0.34, lift: 0.18, rotOff: 0.1, ao: 0.54 },
    { y: 3.55, count: 7, len: 2.75, w: 2.0, pitch: 1.68, sag: 0.28, lift: 0.17, rotOff: 0.55, ao: 0.6 },
    { y: 4.75, count: 6, len: 2.35, w: 1.8, pitch: 1.62, sag: 0.24, lift: 0.15, rotOff: 0.28, ao: 0.65 },
    { y: 5.9, count: 6, len: 1.98, w: 1.55, pitch: 1.52, sag: 0.19, lift: 0.14, rotOff: 0.85, ao: 0.7 },
    { y: 7.05, count: 5, len: 1.62, w: 1.28, pitch: 1.4, sag: 0.15, lift: 0.12, rotOff: 0.4, ao: 0.76 },
    { y: 8.15, count: 5, len: 1.26, w: 1.02, pitch: 1.24, sag: 0.1, lift: 0.09, rotOff: 0.95, ao: 0.82 },
    { y: 9.05, count: 4, len: 0.95, w: 0.8, pitch: 1.05, sag: 0.06, lift: 0.06, rotOff: 0.35, ao: 0.86 },
  ];

  for (const w of whorlSpecs) {
    for (let i = 0; i < w.count; i++) {
      const yaw = (i / w.count) * Math.PI * 2 + w.rotOff + ((i % 2) * 0.08 - 0.04);
      const yJitter = ((i % 2) - 0.5) * 0.18;
      boughs.push(
        makeSpruceBoughCard(w.w, w.len, w.sag, w.lift, 0.12, w.pitch, yaw, w.y + yJitter, w.ao),
        makeSpruceBoughCard(
          w.w * 0.84,
          w.len * 0.96,
          w.sag * 0.7,
          w.lift,
          0.92,
          w.pitch - 0.08,
          yaw + 0.06,
          w.y + yJitter + 0.08,
          w.ao + 0.04,
        ),
      );
    }
  }

  for (let i = 0; i < 5; i++) {
    const yaw = (i / 5) * Math.PI * 2 + 0.2;
    boughs.push(makeSpruceBoughCard(1.12, 2.2, 0.04, 0.04, 0, 0.16, yaw, 9.45, 0.85));
  }

  const pineCanopyGeo = mergeGeometries(boughs, false);
  boughs.forEach((b) => b.dispose());
  return { pineWoodGeo, pineCanopyGeo };
}

function buildFernBushGeometry(): THREE.BufferGeometry {
  const fronds: THREE.BufferGeometry[] = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const yaw = (i / count) * Math.PI * 2 + (i % 2) * 0.2;
    const frond = new THREE.PlaneGeometry(0.98, 1.38, 1, 3);
    frond.translate(0, 0.69, 0);
    const p = frond.attributes.position;
    const cols = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) {
      const y = p.getY(v);
      const t = y / 1.38;
      p.setZ(v, t * t * 0.78);
      p.setY(v, y * (1 - t * 0.22));
      const b = 0.58 + t * 0.45;
      cols[v * 3] = b * 0.94;
      cols[v * 3 + 1] = b * 1.04;
      cols[v * 3 + 2] = b * 0.86;
    }
    frond.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    frond.rotateX(0.32 + (i % 2) * 0.14);
    frond.rotateY(yaw);
    frond.computeVertexNormals();
    fronds.push(frond);
  }
  const merged = mergeGeometries(fronds, false);
  fronds.forEach((f) => f.dispose());
  return merged;
}

export function buildWorldEnvironment(
  textures: ProceduralTextures,
  options: EnvironmentBuildOptions = {},
): WorldEnvironment {
  const mobilePerf = Boolean(options.mobilePerf);
  const worldSeed = options.worldSeed ?? 42069;
  const group = new THREE.Group();
  const staticColliders: ObstacleCollider[] = [];
  const colliders: ObstacleCollider[] = [];
  const disposables: { dispose: () => void }[] = [];

  // 0. Atmospheric sunlit sky dome + glowing 3D Sun Disc & Corona
  const skyGeo = new THREE.SphereGeometry(520, mobilePerf ? 18 : 24, mobilePerf ? 12 : 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(-0.32, 0.46, -0.82).normalize() },
      uTime: { value: 0 },
      uSkyTop: { value: new THREE.Color(0.32, 0.6, 0.9) },
      uSkyHorizon: { value: new THREE.Color(0.84, 0.91, 0.96) },
      uSunColor: { value: new THREE.Color(1.0, 0.93, 0.76) },
      uOvercast: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorldDir;
      uniform vec3 uSunDir;
      uniform float uTime;
      uniform vec3 uSkyTop;
      uniform vec3 uSkyHorizon;
      uniform vec3 uSunColor;
      uniform float uOvercast;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise2(p);
          p = p * 2.03 + vec2(17.1, 31.7);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(uSkyHorizon, uSkyTop, pow(h, 0.52));

        if (dir.y > 0.03) {
          vec2 cloudUv = dir.xz / (dir.y + 0.18) * 1.42 + vec2(uTime * 0.014, uTime * 0.006);
          float c = fbm(cloudUv);
          float startEdge = mix(0.49, 0.24, uOvercast);
          float cloudMask = smoothstep(startEdge, 0.78, c) * smoothstep(0.03, 0.24, dir.y);
          vec3 cloudCol = mix(vec3(0.92, 0.95, 0.99), vec3(0.64, 0.69, 0.76), uOvercast);
          cloudCol = mix(cloudCol, uSunColor, clamp(dot(dir, uSunDir) * 0.45 + 0.35, 0.0, 0.65) * (1.0 - uOvercast * 0.75));
          col = mix(col, cloudCol, cloudMask * mix(0.66, 0.9, uOvercast));
        }

        float sunAmt = max(dot(dir, uSunDir), 0.0);
        float clearSun = 1.0 - uOvercast * 0.78;
        col += uSunColor * pow(sunAmt, 10.0) * 0.44 * clearSun;
        col += vec3(1.0, 0.98, 0.9) * pow(sunAmt, 220.0) * 1.35 * clearSun;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.frustumCulled = false;
  group.add(skyDome);
  disposables.push(skyGeo, skyMat);

  // Visible 3D Sun Disc & Soft Golden Corona synced to sunLight
  const sunDiscGeo = new THREE.SphereGeometry(14, 16, 16);
  const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xfff8dc, fog: false });
  const sunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
  const sunHaloGeo = new THREE.SphereGeometry(30, 16, 16);
  const sunHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const sunHalo = new THREE.Mesh(sunHaloGeo, sunHaloMat);
  const sunGroup = new THREE.Group();
  sunGroup.add(sunDisc, sunHalo);
  sunGroup.position.set(-100, 145, -260);
  group.add(sunGroup);
  disposables.push(sunDiscGeo, sunDiscMat, sunHaloGeo, sunHaloMat);

  // 1. Shared Terrain Material (world-space multi-scale turf, riverbank sand/pebbles, cliff rock, village cobble, seasonal tint, snow)
  const caveOriginsVec = CAVE_SITES.map((s) => {
    const fY = caveFloorYAt(s, 4.5);
    return new THREE.Vector4(s.x, s.z, fY - 0.45, fY + 5.85);
  });
  const caveRotVec = CAVE_SITES.map((s) => new THREE.Vector2(Math.cos(s.rot), Math.sin(s.rot)));
  const terrainUniforms = {
    uSeasonTint: { value: new THREE.Color(1, 1, 1) },
    uSnowMix: { value: 0 },
    uWetness: { value: 0 },
    uSandMap: { value: textures.sandBankTile },
    uRockMap: { value: textures.cliffRockTile },
    uPlazaMap: { value: textures.plazaCobble },
    uVillageCenter: { value: new THREE.Vector2(VILLAGE_SITE.x, VILLAGE_SITE.z) },
    uHighResBounds: { value: new THREE.Vector4(0, 0, -1, -1) },
    uCaveOrigins: { value: caveOriginsVec },
    uCaveRot: { value: caveRotVec },
  };
  const configureTerrainMaterial = (isCoarse: boolean) => {
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: textures.grassTile,
      normalMap: mobilePerf ? null : textures.grassNormal,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughness: 0.92,
      metalness: 0.01,
    });
    mat.customProgramCacheKey = () => (isCoarse ? 'terrain_coarse_v2' : 'terrain_hi_v2');
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSeasonTint = terrainUniforms.uSeasonTint;
      shader.uniforms.uSnowMix = terrainUniforms.uSnowMix;
      shader.uniforms.uWetness = terrainUniforms.uWetness;
      shader.uniforms.uSandMap = terrainUniforms.uSandMap;
      shader.uniforms.uRockMap = terrainUniforms.uRockMap;
      shader.uniforms.uPlazaMap = terrainUniforms.uPlazaMap;
      shader.uniforms.uVillageCenter = terrainUniforms.uVillageCenter;
      shader.uniforms.uHighResBounds = terrainUniforms.uHighResBounds;
      shader.uniforms.uCaveOrigins = terrainUniforms.uCaveOrigins;
      shader.uniforms.uCaveRot = terrainUniforms.uCaveRot;
      shader.vertexShader =
        `varying vec3 vWorldPos;\nvarying vec3 vWorldNrm;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vWorldNrm = normalize(mat3(modelMatrix) * normal);`,
        );
      let frag =
        `uniform vec3 uSeasonTint;
        uniform float uSnowMix;
        uniform float uWetness;
        uniform sampler2D uSandMap;
        uniform sampler2D uRockMap;
        uniform sampler2D uPlazaMap;
        uniform vec2 uVillageCenter;
        uniform vec4 uHighResBounds;
        uniform vec4 uCaveOrigins[10];
        uniform vec2 uCaveRot[10];
        varying vec3 vWorldPos;
        varying vec3 vWorldNrm;\n` + shader.fragmentShader;
      const cavePortalCutout = `
          for (int ci = 0; ci < 10; ci++) {
            vec2 cd = vWorldPos.xz - uCaveOrigins[ci].xy;
            if (abs(cd.x) < 12.0 && abs(cd.y) < 12.0) {
              float ccs = uCaveRot[ci].x;
              float csn = uCaveRot[ci].y;
              float clx = cd.x * ccs - cd.y * csn;
              float clz = cd.x * csn + cd.y * ccs;
              if (abs(clx) < 3.52 && clz > -4.5 && clz < 4.75 && vWorldPos.y > uCaveOrigins[ci].z && vWorldPos.y < uCaveOrigins[ci].w) {
                discard;
              }
            }
          }`;
      if (isCoarse) {
        frag = frag.replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          if (vWorldPos.x > uHighResBounds.x && vWorldPos.x < uHighResBounds.z && vWorldPos.z > uHighResBounds.y && vWorldPos.z < uHighResBounds.w) discard;${cavePortalCutout}`,
        );
      } else {
        frag = frag.replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>${cavePortalCutout}`,
        );
      }
      shader.fragmentShader = frag
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
            vec2 gUv1 = vWorldPos.xz * 0.16;
            vec2 gUv2 = vWorldPos.xz * 0.053 + vec2(0.37, 0.71);
            vec4 grassA = texture2D(map, gUv1);
            vec4 grassB = texture2D(map, gUv2);
            vec3 groundTex = mix(grassA.rgb, grassB.rgb, 0.42);

            // World-space Desert dunes sand blend
            float desX = clamp((vWorldPos.x - 280.0) / 85.0, 0.0, 1.0);
            float desZ = clamp((vWorldPos.z - 180.0) / 85.0, 0.0, 1.0);
            float desSouth = clamp((vWorldPos.z - 620.0) / 100.0, 0.0, 1.0);
            float desertMask = max(desSouth, desX * desZ);

            // World-space riverbank sand & pebbles near river level (exact match to riverCenterX)
            float tRC = 16.0 + sin(vWorldPos.z * 0.04) * 9.5 + cos(vWorldPos.z * 0.018) * 4.5 + sin(vWorldPos.z * 0.0042) * 34.0 + sin(vWorldPos.z * 0.0011) * 95.0;
            float tRW = 5.4 + sin(vWorldPos.z * 0.08 + 1.2) * 0.7;
            float rEdge = abs(vWorldPos.x - tRC) - tRW;
            float sandMask = clamp((1.0 - smoothstep(0.2, 3.2, rEdge)) * (1.0 - smoothstep(0.65, 2.05, vWorldPos.y)), 0.0, 1.0);
            vec3 sandCol = texture2D(uSandMap, vWorldPos.xz * 0.24).rgb;

            // Steep slopes & mountain heights get stratified cliff rock
            float slopeMask = 1.0 - smoothstep(0.58, 0.86, vWorldNrm.y);
            float highMask = smoothstep(7.5, 16.0, vWorldPos.y);
            float rockMask = clamp(max(slopeMask * 0.95, highMask * 0.85), 0.0, 1.0);
            vec3 rockCol = texture2D(uRockMap, vec2(vWorldPos.x * 0.11 + vWorldPos.z * 0.07, vWorldPos.y * 0.16)).rgb;

            // Village plaza cobble blend
            float plazaD = length(vWorldPos.xz - uVillageCenter);
            float plazaMask = 1.0 - smoothstep(16.0, 23.5, plazaD);
            vec3 plazaCol = texture2D(uPlazaMap, vWorldPos.xz * 0.22).rgb;

            vec3 finalSurf = mix(groundTex, sandCol * vec3(1.12, 0.98, 0.74), desertMask * 0.92);
            finalSurf = mix(finalSurf, sandCol, sandMask * 0.88);
            finalSurf = mix(finalSurf, rockCol, rockMask * (1.0 - sandMask * 0.5) * (1.0 - desertMask * 0.35));
            finalSurf = mix(finalSurf, plazaCol, plazaMask * 0.88);
            diffuseColor.rgb *= mix(finalSurf, finalSurf * 1.15, 0.2);
          #endif`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float dBlendX = clamp((vWorldPos.x - 280.0) / 85.0, 0.0, 1.0);
          float dBlendZ = clamp((vWorldPos.z - 180.0) / 85.0, 0.0, 1.0);
          float dBlendS = clamp((vWorldPos.z - 620.0) / 100.0, 0.0, 1.0);
          float dMask = max(dBlendS, dBlendX * dBlendZ);
          float isGrass = smoothstep(0.55, 0.86, vWorldNrm.y) * (1.0 - smoothstep(5.8, 10.0, vWorldPos.y)) * (1.0 - dMask);
          diffuseColor.rgb *= mix(vec3(1.0), uSeasonTint, isGrass * 0.65);
          float snowNoise = fract(sin(dot(floor(vWorldPos.xz * 0.45), vec2(12.9898, 78.233))) * 43758.5453);
          float snowAmt = uSnowMix * (1.0 - dMask * 0.75) * smoothstep(0.45, 0.85, vWorldNrm.y) * (0.86 + 0.14 * snowNoise);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.91, 0.95, 0.99), clamp(snowAmt, 0.0, 0.92));
          diffuseColor.rgb *= mix(1.0, 0.82, uWetness * 0.55);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.3, uWetness * 0.65);`,
        );
    };
    return mat;
  };
  const terrainMat = configureTerrainMaterial(false);
  const coarseMat = configureTerrainMaterial(true);
  disposables.push(terrainMat, coarseMat);

  const cGrass = new THREE.Color('#7ca352');
  const cLush = new THREE.Color('#97bc5e');
  const cPineMoss = new THREE.Color('#5f8246');
  const cBlossomMeadow = new THREE.Color('#8cb556');
  const cSnowGround = new THREE.Color('#dce8f4');
  const cSnowShade = new THREE.Color('#b6cce0');
  const cGoldenSteppe = new THREE.Color('#bfa454');
  const cGoldenWarm = new THREE.Color('#d2b969');
  const cDesertSand = new THREE.Color('#e8c378');
  const cDesertDune = new THREE.Color('#cf9f4e');
  const cAshGround = new THREE.Color('#393742');
  const cAshScorched = new THREE.Color('#25222b');
  const cSwampMoss = new THREE.Color('#3f6b4e');
  const cSwampDeep = new THREE.Color('#274736');
  const cAutumnFloor = new THREE.Color('#9c6334');
  const cAutumnWarm = new THREE.Color('#b87d3e');
  const cBambooGround = new THREE.Color('#6ea34e');
  const cBambooJade = new THREE.Color('#4f8b4a');
  const cCrystalGround = new THREE.Color('#5a6a91');
  const cCrystalSlate = new THREE.Color('#3f4c73');
  const cHighlandStone = new THREE.Color('#6f6a7d');
  const cHighlandMoss = new THREE.Color('#5d705c');
  const cPlaza = new THREE.Color('#b6b0a4');
  const cBank = new THREE.Color('#b8ad94');
  const cRock = new THREE.Color('#888f96');
  const cPeak = new THREE.Color('#d9e2ec');
  const tmpCol = new THREE.Color();

  const colorVertex = (x: number, y: number, z: number) => {
    const distRiver = Math.abs(x - riverCenterX(z)) - riverHalfWidthAt(z);
    const edgeRim = Math.max(Math.abs(x) - (WORLD_HALF_X - 40), Math.abs(z) - (WORLD_HALF_Z - 40));
    const mtnFactor = mountainRockFactorAt(x, z);
    const biome = biomeAt(x, z);
    const plaza = villagePlazaFactorAt(x, z);

    const waveMix = 0.5 + 0.5 * Math.sin(x * 0.07 + z * 0.06);
    if (biome === 'snow_peaks') {
      tmpCol.copy(cSnowGround).lerp(cSnowShade, waveMix * 0.65);
    } else if (biome === 'desert') {
      tmpCol.copy(cDesertSand).lerp(cDesertDune, waveMix * 0.78);
    } else if (biome === 'golden_steppe') {
      tmpCol.copy(cGoldenSteppe).lerp(cGoldenWarm, waveMix);
    } else if (biome === 'ashlands') {
      tmpCol.copy(cAshGround).lerp(cAshScorched, waveMix);
    } else if (biome === 'mystic_swamp') {
      tmpCol.copy(cSwampDeep).lerp(cSwampMoss, waveMix);
    } else if (biome === 'autumn_woods') {
      tmpCol.copy(cAutumnFloor).lerp(cAutumnWarm, waveMix);
    } else if (biome === 'bamboo_grove') {
      tmpCol.copy(cBambooGround).lerp(cBambooJade, waveMix);
    } else if (biome === 'crystal_canyon') {
      tmpCol.copy(cCrystalSlate).lerp(cCrystalGround, waveMix);
    } else if (biome === 'ancient_highlands') {
      tmpCol.copy(cHighlandStone).lerp(cHighlandMoss, waveMix);
    } else {
      const baseA =
        biome === 'pine_forest'
          ? cPineMoss
          : biome === 'blossom_grove'
            ? cBlossomMeadow
            : cGrass;
      tmpCol.copy(baseA).lerp(cLush, waveMix);
    }

    if (distRiver < 2.2 || y < WATER_LEVEL + 0.55) {
      const bankT = Math.max(0, Math.min(1, 1 - distRiver / 2.2));
      tmpCol.lerp(cBank, 0.72 * bankT);
    }
    if (plaza > 0.01) {
      tmpCol.lerp(cPlaza, plaza * 0.82);
    }
    if ((edgeRim > 0 && y > 3.5) || (mtnFactor > 0.15 && y > 4.2)) {
      const rockT = Math.min(1, Math.max((y - 4.2) / 8.5, mtnFactor * 0.78));
      tmpCol.lerp(cRock, rockT * 0.85);
    }
    if (y > 26.0) {
      const capT = Math.min(1, (y - 26.0) / 14.0);
      tmpCol.lerp(cPeak, capT * 0.85);
    }
    return tmpCol;
  };

  // 1a. Full 8096x16192 distant horizon valley base (cut out beneath high-res chunks & depressed across distant river corridor)
  const coarseGeo = new THREE.PlaneGeometry(WORLD_SIZE_X + 240, WORLD_SIZE_Z + 240, 160, 280);
  coarseGeo.rotateX(-Math.PI / 2);
  const cPos = coarseGeo.attributes.position;
  const cCols = new Float32Array(cPos.count * 3);
  for (let i = 0; i < cPos.count; i++) {
    const x = cPos.getX(i);
    const z = cPos.getZ(i);
    let y = groundHeightAt(x, z) - 0.35;
    if (Math.abs(x - riverCenterX(z)) < riverHalfWidthAt(z) + 46) {
      y = Math.min(y, WATER_LEVEL - 1.35);
    }
    cPos.setY(i, y);
    const col = colorVertex(x, y, z);
    cCols[i * 3] = col.r;
    cCols[i * 3 + 1] = col.g;
    cCols[i * 3 + 2] = col.b;
  }
  coarseGeo.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
  coarseGeo.computeVertexNormals();
  const coarseTerrain = new THREE.Mesh(coarseGeo, coarseMat);
  coarseTerrain.receiveShadow = true;
  coarseTerrain.matrixAutoUpdate = false;
  coarseTerrain.updateMatrix();
  group.add(coarseTerrain);
  disposables.push(coarseGeo);

  // 1b. Pooled 5x5 High-Res Terrain Chunks (96m x 96m each: 2.0m desktop / 3.0m mobile precision for caves & riverbanks)
  const chunkSegs = mobilePerf ? 32 : 48;
  interface TerrainChunkSlot {
    cx: number;
    cz: number;
    mesh: THREE.Mesh;
    geo: THREE.PlaneGeometry;
    baseCoords: Float32Array;
  }
  const terrainPool: TerrainChunkSlot[] = [];
  const poolSize = (TERRAIN_POOL_RADIUS * 2 + 1) * (TERRAIN_POOL_RADIUS * 2 + 1);

  for (let i = 0; i < poolSize; i++) {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, chunkSegs, chunkSegs);
    geo.rotateX(-Math.PI / 2);
    const posAttr = geo.attributes.position;
    const baseCoords = new Float32Array(posAttr.count * 2);
    for (let v = 0; v < posAttr.count; v++) {
      baseCoords[v * 2] = posAttr.getX(v);
      baseCoords[v * 2 + 1] = posAttr.getZ(v);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(posAttr.count * 3), 3));
    const mesh = new THREE.Mesh(geo, terrainMat);
    mesh.receiveShadow = true;
    mesh.visible = false;
    group.add(mesh);
    disposables.push(geo);
    terrainPool.push({ cx: 99999, cz: 99999, mesh, geo, baseCoords });
  }

  const updateTerrainChunkSlot = (slot: TerrainChunkSlot, cx: number, cz: number) => {
    slot.cx = cx;
    slot.cz = cz;
    const centerX = (cx + 0.5) * CHUNK_SIZE;
    const centerZ = (cz + 0.5) * CHUNK_SIZE;
    if (
      Math.abs(centerX) > WORLD_HALF_X + CHUNK_SIZE ||
      Math.abs(centerZ) > WORLD_HALF_Z + CHUNK_SIZE
    ) {
      slot.mesh.visible = false;
      return;
    }
    slot.mesh.visible = true;
    slot.mesh.position.set(centerX, 0, centerZ);
    slot.mesh.updateMatrix();

    const posAttr = slot.geo.attributes.position as THREE.BufferAttribute;
    const colAttr = slot.geo.attributes.color as THREE.BufferAttribute;
    for (let v = 0; v < posAttr.count; v++) {
      const lx = slot.baseCoords[v * 2];
      const lz = slot.baseCoords[v * 2 + 1];
      const wx = centerX + lx;
      const wz = centerZ + lz;
      const y = groundHeightAt(wx, wz);
      posAttr.setY(v, y);
      const col = colorVertex(wx, y, wz);
      colAttr.setXYZ(v, col.r, col.g, col.b);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    slot.geo.computeVertexNormals();
    slot.geo.computeBoundingSphere();
  };

  // 2. Player-Following Dense River Water Strip (spreads shore-to-shore without gaps or terrain clipping)
  const RIVER_SPAN_Z = 480;
  const riverSegX = 16;
  const riverSegZ = 200;
  const riverGeo = new THREE.PlaneGeometry(34, RIVER_SPAN_Z, riverSegX, riverSegZ);
  riverGeo.rotateX(-Math.PI / 2);
  const rPosAttr = riverGeo.attributes.position as THREE.BufferAttribute;
  const rUvAttr = riverGeo.attributes.uv as THREE.BufferAttribute;
  const riverBaseU = new Float32Array(rPosAttr.count);
  const riverBaseLocalZ = new Float32Array(rPosAttr.count);
  for (let i = 0; i < rPosAttr.count; i++) {
    riverBaseU[i] = rPosAttr.getX(i) / 17.0;
    riverBaseLocalZ[i] = rPosAttr.getZ(i);
  }
  let lastRiverSnapZ = 999999;

  const updateRiverStrip = (centerZ: number) => {
    const minSnap = -WORLD_HALF_Z + RIVER_SPAN_Z * 0.5;
    const maxSnap = WORLD_HALF_Z - RIVER_SPAN_Z * 0.5;
    const clampedZ = Math.max(minSnap, Math.min(maxSnap, centerZ));
    const snappedZ = Math.round(clampedZ / 30) * 30;
    if (Math.abs(snappedZ - lastRiverSnapZ) < 1) return;
    lastRiverSnapZ = snappedZ;
    for (let i = 0; i < rPosAttr.count; i++) {
      const wz = snappedZ + riverBaseLocalZ[i];
      // Extend water slightly beneath sloped banks so 3D terrain intersects waterline naturally with zero hollow gaps
      const halfSpan = riverHalfWidthAt(wz) + 3.2;
      rPosAttr.setXYZ(i, riverCenterX(wz) + riverBaseU[i] * halfSpan, WATER_LEVEL, wz);
      rUvAttr.setXY(i, riverBaseU[i] * 0.5 + 0.5, wz / RIVER_SPAN_Z + 0.5);
    }
    rPosAttr.needsUpdate = true;
    rUvAttr.needsUpdate = true;
    riverGeo.computeBoundingSphere();
  };
  updateRiverStrip(options.initialZ ?? 0);

  const waterUniforms = {
    uTime: { value: 0 },
    uWaveAmp: { value: 1.0 },
    uWaterState: { value: 0.0 },
    uFoamMap: { value: textures.waterFoam },
    uCausticsMap: { value: textures.waterCaustics },
    uSunDir: { value: new THREE.Vector3(-0.32, 0.46, -0.82).normalize() },
    uWaterDeep: { value: new THREE.Color(0x0f3b76) },
    uWaterShallow: { value: new THREE.Color(0x1f8fa8) },
  };
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x1a5b9e,
    emissive: 0x061c34,
    emissiveIntensity: 0.28,
    roughness: 0.12,
    metalness: 0.28,
    envMapIntensity: mobilePerf ? 1.0 : 1.5,
    normalMap: textures.waterRippleNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    transparent: true,
    opacity: 0.88,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  riverMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.uniforms.uWaveAmp = waterUniforms.uWaveAmp;
    shader.uniforms.uWaterState = waterUniforms.uWaterState;
    shader.uniforms.uFoamMap = waterUniforms.uFoamMap;
    shader.uniforms.uCausticsMap = waterUniforms.uCausticsMap;
    shader.uniforms.uSunDir = waterUniforms.uSunDir;
    shader.uniforms.uWaterDeep = waterUniforms.uWaterDeep;
    shader.uniforms.uWaterShallow = waterUniforms.uWaterShallow;

    shader.vertexShader =
      `uniform float uTime;\nuniform float uWaveAmp;\nvarying vec3 vWaterPos;\nvarying vec2 vWaterUv;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float w1 = sin(transformed.z * 0.55 + uTime * 2.2) * 0.024;
        float w2 = cos(transformed.x * 0.85 - uTime * 1.8 + transformed.z * 0.25) * 0.015;
        transformed.y += (w1 + w2) * uWaveAmp;
        vWaterPos = transformed;
        vWaterUv = transformed.xz * 0.16;`,
      );

    shader.fragmentShader =
      `uniform float uTime;\nuniform float uWaterState;\nuniform sampler2D uFoamMap;\nuniform sampler2D uCausticsMap;\nuniform vec3 uSunDir;\nuniform vec3 uWaterDeep;\nuniform vec3 uWaterShallow;\nvarying vec3 vWaterPos;\nvarying vec2 vWaterUv;\n` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          // Exact match to riverCenterX(z) in terrain.ts so water spreads properly across all 16km
          float rCenter = 16.0 + sin(vWaterPos.z * 0.04) * 9.5 + cos(vWaterPos.z * 0.018) * 4.5 + sin(vWaterPos.z * 0.0042) * 34.0 + sin(vWaterPos.z * 0.0011) * 95.0;
          float rHalfW = 5.4 + sin(vWaterPos.z * 0.08 + 1.2) * 0.7;
          // bankOffset > 0 in main channel, ~ -0.7..0 at actual sloped shoreline
          float bankOffset = rHalfW - abs(vWaterPos.x - rCenter);
          float distFromShore = max(0.0, bankOffset + 0.85);
          float shallowMask = 1.0 - smoothstep(0.0, 2.8, distFromShore);

          vec3 baseCol = mix(uWaterDeep, uWaterShallow, shallowMask * 0.85);
          float foamSample = texture2D(uFoamMap, vWaterUv * 1.15 + vec2(sin(uTime * 0.35) * 0.03, -uTime * 0.08)).r;
          float causticsSample = texture2D(uCausticsMap, vWaterUv * 1.05 + vec2(uTime * 0.02, -uTime * 0.055)).r;

          float shoreWave = 0.78 + 0.32 * sin(vWaterPos.z * 0.75 + uTime * 2.3);
          float shoreFoam = smoothstep(1.35, 0.12, distFromShore) * smoothstep(0.32, 0.8, foamSample * shoreWave);

          float chopMask = clamp(1.0 - abs(uWaterState - 1.0), 0.0, 1.0);
          float whitecaps = chopMask * smoothstep(0.72, 0.94, foamSample) * 0.5;

          float iceMask = clamp(1.0 - abs(uWaterState - 3.0), 0.0, 1.0);
          float iceShelf = iceMask * smoothstep(2.1, 0.4, distFromShore) * 0.82;
          baseCol = mix(baseCol, vec3(0.76, 0.89, 0.97), iceShelf);

          float causticsVis = (1.0 - iceMask * 0.7) * (1.0 - chopMask * 0.5);
          baseCol += vec3(0.2, 0.44, 0.5) * causticsSample * (0.24 + 0.52 * shallowMask) * causticsVis;

          diffuseColor.rgb = mix(baseCol, vec3(0.93, 0.97, 1.0), clamp(shoreFoam + whitecaps, 0.0, 0.9));
          // Keep water opaque-translucent all the way under the bank; only fade at far hidden outer edge
          float outerFade = smoothstep(-3.0, -1.6, bankOffset);
          diffuseColor.a = outerFade * mix(0.84, 0.95, clamp(shoreFoam + iceShelf + 0.16 * (1.0 - shallowMask), 0.0, 1.0));
          if (diffuseColor.a < 0.02) discard;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          vec3 wViewDir = normalize(cameraPosition - vWaterPos);
          float wFresnel = pow(1.0 - max(dot(wViewDir, vec3(0.0, 1.0, 0.0)), 0.0), 2.8);
          vec3 halfSun = normalize(uSunDir + wViewDir);
          float glint = pow(max(dot(vec3(0.0, 1.0, 0.0), halfSun), 0.0), 56.0);
          float sparkle = pow(max(dot(normalize(vec3(sin(vWaterPos.x * 1.9 + uTime * 2.4) * 0.22, 1.0, cos(vWaterPos.z * 2.1 - uTime * 2.0) * 0.22)), halfSun), 0.0), 42.0);
          totalEmissiveRadiance += vec3(0.26, 0.48, 0.68) * wFresnel * 0.52 + vec3(1.0, 0.94, 0.78) * (glint * 1.15 + sparkle * 0.6) * (1.0 - clamp(abs(uWaterState - 1.0), 0.0, 1.0) * 0.2);`,
        );
  };
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.renderOrder = 2;
  riverMesh.receiveShadow = true;
  riverMesh.frustumCulled = false;
  riverMesh.matrixAutoUpdate = false;
  riverMesh.updateMatrix();
  group.add(riverMesh);
  disposables.push(riverGeo, riverMat);

  const dummy = new THREE.Object3D();

  // 3b. Village cobblestone plazas across all 7 settlements + crossroads signposts (NO pre-baked wilderness trails!)
  const plazaGeo = new THREE.CylinderGeometry(20.5, 21.8, 0.14, 28);
  const plazaMat = new THREE.MeshStandardMaterial({
    map: textures.plazaCobble,
    roughness: 0.92,
    metalness: 0.04,
  });
  for (const vSite of VILLAGE_SITES) {
    const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    plazaMesh.position.set(vSite.x, vSite.plazaY - 0.02, vSite.z);
    plazaMesh.receiveShadow = true;
    plazaMesh.matrixAutoUpdate = false;
    plazaMesh.updateMatrix();
    group.add(plazaMesh);
  }
  disposables.push(plazaGeo, plazaMat);

  const signpostSpots: [number, number, number][] = [
    [-8.5, -5.0, 0.35],
    [-2.5, 4.5, -0.5],
    [34.5, -14.5, 0.8],
    [VILLAGE_SITE.x - 16.5, VILLAGE_SITE.z + 15.5, 0.65],
    [VILLAGE_SITE.x + 17.5, VILLAGE_SITE.z - 14.5, -2.1],
  ];
  for (const [sx, sz, srot] of signpostSpots) {
    const sign = buildSignpost(textures);
    sign.position.set(sx, groundHeightAt(sx, sz) - 0.05, sz);
    sign.rotation.y = srot;
    sign.updateMatrixWorld(true);
    sign.traverse((obj) => {
      obj.matrixAutoUpdate = false;
    });
    group.add(sign);
    staticColliders.push({ x: sx, z: sz, radius: 0.42 });
  }

  // 3c. Dynamic Player-Trampled Trail Overlay (appears ONLY on tiles walked >10 times)
  const trailGeo = new THREE.CylinderGeometry(0.96, 1.08, 0.06, 8);
  const trailMat = new THREE.MeshStandardMaterial({
    map: textures.wornTrailDirt,
    roughness: 0.96,
    metalness: 0.02,
  });
  const trailInst = new THREE.InstancedMesh(trailGeo, trailMat, MAX_TRAIL_TILES);
  trailInst.receiveShadow = true;
  trailInst.count = 0;
  trailInst.frustumCulled = false;
  trailInst.matrixAutoUpdate = false;
  trailInst.updateMatrix();
  group.add(trailInst);
  disposables.push(trailGeo, trailMat);

  const packTrailKey = (qx: number, qz: number) => (qx + 16384) * 32768 + (qz + 16384);
  const trampledCellSet = new Set<number>();

  // 4. Shared Flora Geometries & Seasonal Shaders (Streamed per active 96m chunk + 50x near carpet)
  const sharedEnvUniforms = {
    uTime: { value: 0 },
    uPlayerPos: { value: new THREE.Vector3(options.initialX ?? -2, 0, options.initialZ ?? 9) },
    uSunDir: waterUniforms.uSunDir,
    uSeasonTint: terrainUniforms.uSeasonTint,
    uSnowMix: terrainUniforms.uSnowMix,
  };

  const tuftGeo = buildMultiBladeTuftGeometry();
  const grassMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedEnvUniforms.uTime;
    shader.uniforms.uPlayerPos = sharedEnvUniforms.uPlayerPos;
    shader.uniforms.uSunDir = sharedEnvUniforms.uSunDir;
    shader.uniforms.uSeasonTint = sharedEnvUniforms.uSeasonTint;
    shader.uniforms.uSnowMix = sharedEnvUniforms.uSnowMix;
    shader.vertexShader =
      `uniform float uTime;\nuniform vec3 uPlayerPos;\nvarying float vBladeH;\nvarying vec3 vBladeWorld;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float hFac = clamp(position.y * 1.9, 0.0, 1.0);
        vBladeH = hFac;
        #ifdef USE_INSTANCING
          vec4 bladeWorldPos = instanceMatrix * vec4(transformed, 1.0);
        #else
          vec4 bladeWorldPos = modelMatrix * vec4(transformed, 1.0);
        #endif
        vBladeWorld = bladeWorldPos.xyz;
        float gust = sin(bladeWorldPos.x * 0.24 + uTime * 2.15 + bladeWorldPos.z * 0.16) * 0.65
                   + cos(bladeWorldPos.z * 0.31 - uTime * 1.65) * 0.35;
        transformed.x += gust * 0.19 * hFac * hFac;
        transformed.z += gust * 0.11 * hFac * hFac;
        vec2 awayPlayer = bladeWorldPos.xz - uPlayerPos.xz;
        float pDist = length(awayPlayer);
        float footBend = smoothstep(1.32, 0.16, pDist) * hFac;
        vec2 bendDir = pDist > 0.01 ? awayPlayer / pDist : vec2(1.0, 0.0);
        transformed.xz += bendDir * footBend * 0.46;
        transformed.y -= footBend * 0.12;`,
      );
    shader.fragmentShader =
      `uniform vec3 uSeasonTint;\nuniform float uSnowMix;\nuniform vec3 uSunDir;\nvarying float vBladeH;\nvarying vec3 vBladeWorld;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb *= mix(vec3(1.0), uSeasonTint, 0.78);
        vec3 sunView = normalize(cameraPosition - vBladeWorld);
        float backSun = pow(max(dot(sunView, -uSunDir), 0.0), 3.0);
        diffuseColor.rgb += vec3(0.09, 0.13, 0.025) * vBladeH * (0.45 + 0.9 * backSun) * (1.0 - uSnowMix * 0.85);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.93, 0.98), uSnowMix * 0.62);`,
      );
  };
  disposables.push(tuftGeo, grassMat);

  // 4b. Ultra-Dense Near-Field 30m Grass Carpet (tiled Float32 cache eliminates movement frame stutters!)
  const NEAR_GRASS_MAX = mobilePerf ? 3600 : 8800;
  const nearGrassInst = new THREE.InstancedMesh(tuftGeo, grassMat, NEAR_GRASS_MAX);
  nearGrassInst.receiveShadow = false;
  nearGrassInst.castShadow = false;
  nearGrassInst.frustumCulled = false;
  nearGrassInst.matrixAutoUpdate = false;
  nearGrassInst.updateMatrix();
  nearGrassInst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NEAR_GRASS_MAX * 3), 3);
  nearGrassInst.count = 0;
  group.add(nearGrassInst);
  disposables.push(nearGrassInst);

  interface NearGrassTile {
    count: number;
    wx: Float32Array;
    wz: Float32Array;
    matrices: Float32Array;
    colors: Float32Array;
  }
  const GRASS_TILE_DIM = 8;
  const nearGrassTileCache = new Map<number, NearGrassTile>();
  const nearCol = new THREE.Color();
  let buildExclusionZones: { x: number; z: number; halfW: number; halfD: number; cos: number; sin: number }[] = [];
  const isInsidePlayerBuild = (wx: number, wz: number): boolean => {
    for (let i = 0; i < buildExclusionZones.length; i++) {
      const b = buildExclusionZones[i];
      const dx = wx - b.x;
      const dz = wz - b.z;
      if (Math.abs(dx) > 5.5 || Math.abs(dz) > 5.5) continue;
      const lx = dx * b.cos - dz * b.sin;
      const lz = dx * b.sin + dz * b.cos;
      if (Math.abs(lx) <= b.halfW && Math.abs(lz) <= b.halfD) return true;
    }
    return false;
  };

  const grassStep = mobilePerf ? 1.15 : 0.88;
  let grassRadius = mobilePerf ? 25.5 : 29.5;
  let grassRadiusSq = grassRadius * grassRadius;
  let grassFadeStart = grassRadius - 6.5;
  let grassFadeStartSq = grassFadeStart * grassFadeStart;
  let grassFadeSpan = grassRadius - grassFadeStart;
  const arenaExcludeSq = (FINAL_ARENA_RADIUS + 2) * (FINAL_ARENA_RADIUS + 2);

  const tmpTileWx = new Float32Array(GRASS_TILE_DIM * GRASS_TILE_DIM);
  const tmpTileWz = new Float32Array(GRASS_TILE_DIM * GRASS_TILE_DIM);
  const tmpTileMat = new Float32Array(GRASS_TILE_DIM * GRASS_TILE_DIM * 16);
  const tmpTileCol = new Float32Array(GRASS_TILE_DIM * GRASS_TILE_DIM * 3);

  let grassDensityScale = 1.0;

  const buildNearGrassTile = (tx: number, tz: number): NearGrassTile => {
    const startIx = tx * GRASS_TILE_DIM;
    const startIz = tz * GRASS_TILE_DIM;
    let cnt = 0;

    for (let dz = 0; dz < GRASS_TILE_DIM; dz++) {
      const iz = startIz + dz;
      for (let dx = 0; dx < GRASS_TILE_DIM; dx++) {
        const ix = startIx + dx;
        const h1 = Math.sin(ix * 127.1 + iz * 311.7 + worldSeed * 0.013) * 43758.5453;
        const r1 = h1 - Math.floor(h1);
        const h2 = Math.sin(ix * 269.5 + iz * 183.3) * 43758.5453;
        const r2 = h2 - Math.floor(h2);

        const wx = (ix + 0.14 + r1 * 0.72) * grassStep;
        const wz = (iz + 0.14 + r2 * 0.72) * grassStep;

        if (Math.abs(wx) > WORLD_HALF_X - 8 || Math.abs(wz) > WORLD_HALF_Z - 8) continue;
        if (Math.abs(wx - riverCenterX(wz)) - riverHalfWidthAt(wz) < 0.75) continue;
        if (nearAnyCabin(wx, wz, 6.2)) continue;
        if (nearAnyCave(wx, wz, 11.8)) continue;
        if (nearAnyDungeon(wx, wz, 8.8)) continue;
        if (villagePlazaFactorAt(wx, wz) > 0.12) continue;
        if (isInsidePlayerBuild(wx, wz)) continue;
        const adx = wx - FINAL_ARENA_X;
        const adz = wz - FINAL_ARENA_Z;
        if (adx * adx + adz * adz < arenaExcludeSq) continue;

        const qx = Math.round(wx / 2) * 2;
        const qz = Math.round(wz / 2) * 2;
        if (trampledCellSet.has(packTrailKey(qx, qz))) continue;

        const y = groundHeightAt(wx, wz);
        if (y < WATER_LEVEL + 0.25 || y > 8.4) continue;
        const biome = biomeAt(wx, wz);
        if (biome === 'desert' && r1 < 0.94) continue;
        if (biome === 'ashlands' && r1 < 0.82) continue;
        if (biome === 'mountain' && r1 < 0.55) continue;
        if (biome === 'snow_peaks' && r1 < 0.45) continue;

        const h3 = Math.sin(ix * 419.2 + iz * 97.4) * 43758.5453;
        const r3 = h3 - Math.floor(h3);
        const biomeScale =
          biome === 'meadow'
            ? 1.12
            : biome === 'pine_forest'
              ? 0.84
              : biome === 'golden_steppe'
                ? 1.18
                : biome === 'desert'
                  ? 0.75
                  : biome === 'snow_peaks'
                    ? 0.78
                    : biome === 'ashlands'
                      ? 0.68
                      : 1.0;
        const sc = (0.78 + r3 * 0.62) * biomeScale;

        dummy.position.set(wx, y - 0.04, wz);
        dummy.rotation.set((r1 - 0.5) * 0.16, r2 * Math.PI * 2, (r3 - 0.5) * 0.16);
        dummy.scale.set(sc, sc * (0.85 + r1 * 0.48), sc);
        dummy.updateMatrix();

        tmpTileWx[cnt] = wx;
        tmpTileWz[cnt] = wz;
        tmpTileMat.set(dummy.matrix.elements, cnt * 16);

        if (biome === 'desert') {
          nearCol.setHSL(0.11 + (r1 - 0.5) * 0.03, 0.45 + r2 * 0.12, 0.5 + r3 * 0.12);
        } else if (biome === 'golden_steppe') {
          nearCol.setHSL(0.115 + (r1 - 0.5) * 0.035, 0.52 + r2 * 0.15, 0.44 + r3 * 0.14);
        } else if (biome === 'snow_peaks') {
          nearCol.setHSL(0.46 + (r1 - 0.5) * 0.04, 0.18 + r2 * 0.1, 0.68 + r3 * 0.14);
        } else if (biome === 'ashlands') {
          nearCol.setHSL(0.06, 0.16, 0.22 + r3 * 0.1);
        } else if (biome === 'mystic_swamp') {
          nearCol.setHSL(0.36 + (r1 - 0.5) * 0.05, 0.34 + r2 * 0.14, 0.28 + r3 * 0.12);
        } else if (biome === 'autumn_woods') {
          nearCol.setHSL(0.09 + (r1 - 0.5) * 0.04, 0.48 + r2 * 0.15, 0.38 + r3 * 0.14);
        } else if (biome === 'bamboo_grove') {
          nearCol.setHSL(0.28 + (r1 - 0.5) * 0.04, 0.52 + r2 * 0.14, 0.36 + r3 * 0.14);
        } else if (biome === 'crystal_canyon') {
          nearCol.setHSL(0.55 + (r1 - 0.5) * 0.05, 0.32 + r2 * 0.14, 0.42 + r3 * 0.14);
        } else if (biome === 'ancient_highlands') {
          nearCol.setHSL(0.32 + (r1 - 0.5) * 0.05, 0.24 + r2 * 0.12, 0.35 + r3 * 0.12);
        } else {
          const hueShift = biome === 'pine_forest' ? 0.27 : biome === 'blossom_grove' ? 0.23 : 0.245;
          nearCol.setHSL(hueShift + (r1 - 0.5) * 0.045, 0.46 + r2 * 0.16, 0.36 + r3 * 0.14);
        }
        const ci = cnt * 3;
        tmpTileCol[ci] = nearCol.r;
        tmpTileCol[ci + 1] = nearCol.g;
        tmpTileCol[ci + 2] = nearCol.b;
        cnt++;
      }
    }

    const tile: NearGrassTile = {
      count: cnt,
      wx: tmpTileWx.slice(0, cnt),
      wz: tmpTileWz.slice(0, cnt),
      matrices: tmpTileMat.slice(0, cnt * 16),
      colors: tmpTileCol.slice(0, cnt * 3),
    };
    if (nearGrassTileCache.size > 320) {
      let removeCount = 64;
      for (const k of nearGrassTileCache.keys()) {
        nearGrassTileCache.delete(k);
        if (--removeCount <= 0) break;
      }
    }
    const key = (tx + 16384) * 32768 + (tz + 16384);
    nearGrassTileCache.set(key, tile);
    return tile;
  };

  let lastNearGrassX = 999999;
  let lastNearGrassZ = 999999;
  const updateNearGrass = (px: number, pz: number, force = false) => {
    const mdx = px - lastNearGrassX;
    const mdz = pz - lastNearGrassZ;
    if (!force && mdx * mdx + mdz * mdz < 1.85 * 1.85) return;
    lastNearGrassX = px;
    lastNearGrassZ = pz;

    const gxMin = Math.floor((px - grassRadius) / grassStep);
    const gxMax = Math.ceil((px + grassRadius) / grassStep);
    const gzMin = Math.floor((pz - grassRadius) / grassStep);
    const gzMax = Math.ceil((pz + grassRadius) / grassStep);

    const txMin = Math.floor(gxMin / GRASS_TILE_DIM);
    const txMax = Math.floor(gxMax / GRASS_TILE_DIM);
    const tzMin = Math.floor(gzMin / GRASS_TILE_DIM);
    const tzMax = Math.floor(gzMax / GRASS_TILE_DIM);

    const matArr = nearGrassInst.instanceMatrix.array as Float32Array;
    const colArr = (nearGrassInst.instanceColor as THREE.InstancedBufferAttribute).array as Float32Array;
    let count = 0;

    const densityStep =
      grassDensityScale <= 0.3
        ? 4
        : grassDensityScale <= 0.55
          ? 2
          : grassDensityScale <= 0.8
            ? 1
            : 1;
    const densityMod = grassDensityScale <= 0.8 && grassDensityScale > 0.55 ? 3 : 99;

    for (let tz = tzMin; tz <= tzMax && count < NEAR_GRASS_MAX; tz++) {
      for (let tx = txMin; tx <= txMax && count < NEAR_GRASS_MAX; tx++) {
        const key = (tx + 16384) * 32768 + (tz + 16384);
        const tile = nearGrassTileCache.get(key) ?? buildNearGrassTile(tx, tz);
        const tCount = tile.count;
        if (tCount === 0) continue;

        const tWx = tile.wx;
        const tWz = tile.wz;
        const tMat = tile.matrices;
        const tCol = tile.colors;

        for (let k = 0; k < tCount && count < NEAR_GRASS_MAX; k += densityStep) {
          if (densityMod < 99 && (k % 4) === densityMod) continue;
          const ddx = tWx[k] - px;
          const ddz = tWz[k] - pz;
          const dSq = ddx * ddx + ddz * ddz;
          if (dSq > grassRadiusSq) continue;

          const srcM = k * 16;
          const dstM = count * 16;
          if (dSq > grassFadeStartSq) {
            const dist = Math.sqrt(dSq);
            const edgeFade = Math.max(0.05, 1 - (dist - grassFadeStart) / grassFadeSpan);
            matArr[dstM] = tMat[srcM] * edgeFade;
            matArr[dstM + 1] = tMat[srcM + 1] * edgeFade;
            matArr[dstM + 2] = tMat[srcM + 2] * edgeFade;
            matArr[dstM + 3] = 0;
            matArr[dstM + 4] = tMat[srcM + 4] * edgeFade;
            matArr[dstM + 5] = tMat[srcM + 5] * edgeFade;
            matArr[dstM + 6] = tMat[srcM + 6] * edgeFade;
            matArr[dstM + 7] = 0;
            matArr[dstM + 8] = tMat[srcM + 8] * edgeFade;
            matArr[dstM + 9] = tMat[srcM + 9] * edgeFade;
            matArr[dstM + 10] = tMat[srcM + 10] * edgeFade;
            matArr[dstM + 11] = 0;
            matArr[dstM + 12] = tMat[srcM + 12];
            matArr[dstM + 13] = tMat[srcM + 13];
            matArr[dstM + 14] = tMat[srcM + 14];
            matArr[dstM + 15] = 1;
          } else {
            matArr.set(tMat.subarray(srcM, srcM + 16), dstM);
          }

          const srcC = k * 3;
          const dstC = count * 3;
          colArr[dstC] = tCol[srcC];
          colArr[dstC + 1] = tCol[srcC + 1];
          colArr[dstC + 2] = tCol[srcC + 2];
          count++;
        }
      }
    }

    nearGrassInst.count = count;
    nearGrassInst.instanceMatrix.needsUpdate = true;
    if (nearGrassInst.instanceColor) nearGrassInst.instanceColor.needsUpdate = true;
  };

  const updateTrailOverlay = (cells: TrailCellPoint[]) => {
    trampledCellSet.clear();
    const count = Math.min(cells.length, MAX_TRAIL_TILES);
    const startIdx = Math.max(0, cells.length - count);
    for (let i = 0; i < count; i++) {
      const c = cells[startIdx + i];
      trampledCellSet.add(packTrailKey(c.x, c.z));
      const y = groundHeightAt(c.x, c.z) + 0.03;
      dummy.position.set(c.x, y, c.z);
      dummy.rotation.set(0, ((c.x * 13 + c.z * 7) % 628) * 0.01, 0);
      dummy.scale.set(1.05, 1.0, 1.05);
      dummy.updateMatrix();
      trailInst.setMatrixAt(i, dummy.matrix);
    }
    trailInst.count = count;
    trailInst.instanceMatrix.needsUpdate = true;
    trailInst.computeBoundingSphere();
    nearGrassTileCache.clear();
  };

  const flowerGeo = buildCrossedCardGeometry(1.0, 0.88);
  const flowerMats = textures.flowerTextures.map((tex) => {
    const fm = new THREE.MeshLambertMaterial({
      map: tex,
      alphaTest: 0.38,
      side: THREE.DoubleSide,
    });
    fm.onBeforeCompile = (shader) => {
      shader.uniforms.uSnowMix = sharedEnvUniforms.uSnowMix;
      shader.fragmentShader =
        `uniform float uSnowMix;\n` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.91, 0.97), uSnowMix * 0.55);`,
        );
    };
    return fm;
  });
  disposables.push(flowerGeo, ...flowerMats);

  const reedGeo = buildCrossedCardGeometry(1.15, 1.95);
  const reedMat = new THREE.MeshLambertMaterial({
    map: textures.reedCluster,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
  });
  disposables.push(reedGeo, reedMat);

  const bushGeo = buildFernBushGeometry();
  const bushMat = new THREE.MeshLambertMaterial({
    map: textures.fernCluster,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  bushMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSeasonTint = sharedEnvUniforms.uSeasonTint;
    shader.uniforms.uSnowMix = sharedEnvUniforms.uSnowMix;
    shader.fragmentShader =
      `uniform vec3 uSeasonTint;\nuniform float uSnowMix;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb *= mix(vec3(1.0), uSeasonTint, 0.58);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.91, 0.96), uSnowMix * 0.52);`,
      );
  };
  disposables.push(bushGeo, bushMat);

  const { woodGeo, canopyGeo } = buildRealisticTreeGeometries();
  const trunkMat = new THREE.MeshLambertMaterial({ map: textures.treeBark });
  const { pineWoodGeo, pineCanopyGeo } = buildPineTreeGeometries();

  const makeCanopyMaterial = (tex: THREE.CanvasTexture, seasonalDeciduous: boolean) => {
    const fMat = new THREE.MeshLambertMaterial({
      map: tex,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      vertexColors: true,
    });
    fMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = sharedEnvUniforms.uTime;
      shader.uniforms.uSeasonTint = sharedEnvUniforms.uSeasonTint;
      shader.uniforms.uSnowMix = sharedEnvUniforms.uSnowMix;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float leafFactor = max(0.0, (position.y - 4.0) * 0.22);
          transformed.x += sin(uTime * 1.45 + float(gl_InstanceID) * 0.8 + position.z * 0.5) * 0.08 * leafFactor;
          transformed.z += cos(uTime * 1.25 + float(gl_InstanceID) * 0.6 + position.x * 0.5) * 0.06 * leafFactor;`,
        );
      if (seasonalDeciduous) {
        shader.fragmentShader =
          `uniform vec3 uSeasonTint;\nuniform float uSnowMix;\n` +
          shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>
            diffuseColor.rgb *= mix(vec3(1.0), uSeasonTint, 0.65);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.91, 0.97), uSnowMix * 0.52);`,
          );
      } else {
        shader.fragmentShader =
          `uniform float uSnowMix;\n` +
          shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.91, 0.97), uSnowMix * 0.4);`,
          );
      }
    };
    return fMat;
  };

  const oakCanopyMat = makeCanopyMaterial(textures.leafCluster, true);
  const autumnCanopyMat = makeCanopyMaterial(textures.autumnLeafCluster, false);
  const blossomCanopyMat = makeCanopyMaterial(textures.blossomLeafCluster, false);
  const pineCanopyMat = new THREE.MeshLambertMaterial({
    map: textures.pineNeedle,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  pineCanopyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedEnvUniforms.uTime;
    shader.uniforms.uSnowMix = sharedEnvUniforms.uSnowMix;
    shader.vertexShader =
      `uniform float uTime;\nvarying float vPineUp;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vPineUp = clamp(normal.y, 0.0, 1.0);
        float sway = max(0.0, (position.y - 2.5) * 0.028);
        transformed.x += sin(uTime * 1.15 + float(gl_InstanceID) * 0.7 + position.y * 0.35) * sway;
        transformed.z += cos(uTime * 0.95 + float(gl_InstanceID) * 0.5 + position.y * 0.3) * sway * 0.75;`,
      );
    shader.fragmentShader =
      `uniform float uSnowMix;\nvarying float vPineUp;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float snowCap = uSnowMix * smoothstep(0.18, 0.72, vPineUp);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.89, 0.94, 0.99), clamp(snowCap * 0.65, 0.0, 0.75));`,
      );
  };
  disposables.push(
    woodGeo,
    canopyGeo,
    trunkMat,
    pineWoodGeo,
    pineCanopyGeo,
    oakCanopyMat,
    autumnCanopyMat,
    blossomCanopyMat,
    pineCanopyMat,
  );

  const rockGeo = new THREE.DodecahedronGeometry(0.95, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    map: textures.stoneBlock,
    color: 0xa8a29e,
    roughness: 0.9,
    metalness: 0.05,
  });
  const stumpGeo = new THREE.CylinderGeometry(0.32, 0.48, 0.72, 7);
  stumpGeo.translate(0, 0.36, 0);
  const stumpCapGeo = new THREE.CylinderGeometry(0.29, 0.3, 0.05, 7);
  stumpCapGeo.translate(0, 0.73, 0);
  const stumpCapMat = new THREE.MeshStandardMaterial({ color: 0xe6c38c, roughness: 0.85 });
  disposables.push(rockGeo, rockMat, stumpGeo, stumpCapGeo, stumpCapMat);

  // Saguaro Desert Cactus Geometry
  const cactusParts: THREE.BufferGeometry[] = [];
  const cStem = new THREE.CylinderGeometry(0.24, 0.28, 3.1, 6);
  cStem.translate(0, 1.55, 0);
  const cArmL = new THREE.CylinderGeometry(0.16, 0.18, 1.15, 6);
  cArmL.rotateZ(Math.PI * 0.5);
  cArmL.translate(-0.46, 1.55, 0);
  const cArmLUp = new THREE.CylinderGeometry(0.16, 0.16, 1.05, 6);
  cArmLUp.translate(-0.92, 2.02, 0);
  const cArmR = new THREE.CylinderGeometry(0.15, 0.17, 1.0, 6);
  cArmR.rotateZ(Math.PI * 0.5);
  cArmR.translate(0.42, 1.88, 0);
  const cArmRUp = new THREE.CylinderGeometry(0.15, 0.15, 0.9, 6);
  cArmRUp.translate(0.84, 2.28, 0);
  cactusParts.push(cStem, cArmL, cArmLUp, cArmR, cArmRUp);
  const cactusGeo = mergeGeometries(cactusParts, false);
  cactusParts.forEach((p) => p.dispose());
  const cactusMat = new THREE.MeshLambertMaterial({ color: 0x3b7a38 });
  disposables.push(cactusGeo, cactusMat);

  // 5. Dynamic Flora & Collider Chunk Streamer (keeps 4096x6144 lush at 60 FPS)
  interface TreeInstanceRecord {
    id: string;
    chunkKey: string;
    species: 'oak' | 'autumn' | 'blossom' | 'pine';
    x: number;
    y: number;
    z: number;
    scale: number;
    hBias: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    sx: number;
    sy: number;
    sz: number;
    hp: number;
    maxHp: number;
    tInst: THREE.InstancedMesh;
    cInst: THREE.InstancedMesh;
    instIdx: number;
    collider: ObstacleCollider;
  }

  interface FloraChunk {
    key: string;
    chunkGroup: THREE.Group;
    colliders: ObstacleCollider[];
    insts: THREE.InstancedMesh[];
    treeIds: string[];
  }
  const activeFloraChunks = new Map<string, FloraChunk>();
  const activeTrees = new Map<string, TreeInstanceRecord>();
  const choppedTreeIds = new Set<string>(options.initialChoppedTrees ?? []);
  const choppedUntilMap = new Map<string, number>();
  const dormantChoppedTrees = new Map<
    string,
    { rec: TreeInstanceRecord; stumpGroup: THREE.Group; regrowTimer: number }
  >();
  const growingTrees: { rec: TreeInstanceRecord; progress: number }[] = [];
  const treeShakes: { rec: TreeInstanceRecord; timer: number; dirX: number; dirZ: number }[] = [];
  let floraRadius = mobilePerf ? 1 : 2;
  let envElapsedSec = 0;
  const gColor = new THREE.Color();
  const m4 = new THREE.Matrix4();

  const placeStumpInGroup = (
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    scale: number,
    rotY: number,
  ): THREE.Group => {
    const sg = new THREE.Group();
    sg.position.set(x, y - 0.14, z);
    sg.rotation.y = rotY;
    sg.scale.setScalar(scale * 0.92);
    const barkMesh = new THREE.Mesh(stumpGeo, trunkMat);
    barkMesh.castShadow = !mobilePerf;
    barkMesh.receiveShadow = true;
    const capMesh = new THREE.Mesh(stumpCapGeo, stumpCapMat);
    capMesh.receiveShadow = true;
    sg.add(barkMesh, capMesh);
    parent.add(sg);
    return sg;
  };

  const buildFloraChunk = (cx: number, cz: number): FloraChunk => {
    const chunkKey = `${cx},${cz}`;
    const chunkGroup = new THREE.Group();
    const chunkColliders: ObstacleCollider[] = [];
    const insts: THREE.InstancedMesh[] = [];
    const chunkTreeIds: string[] = [];
    const minX = cx * CHUNK_SIZE;
    const minZ = cz * CHUNK_SIZE;
    const cSeed =
      (Math.abs(worldSeed) ^ ((cx + 1024) * 73856093) ^ ((cz + 1024) * 19349663)) >>> 0;
    const rand = seededRandom(cSeed);

    const outOfWorld =
      minX + CHUNK_SIZE < -WORLD_HALF_X ||
      minX > WORLD_HALF_X ||
      minZ + CHUNK_SIZE < -WORLD_HALF_Z ||
      minZ > WORLD_HALF_Z;

    if (!outOfWorld) {
      // A. Meadow & Forest Grass Tufts (zero-GC typed array buffers, tuned per 96m chunk)
      const grassTarget = Math.round((mobilePerf ? 1500 : 2000) * grassDensityScale);
      const grassMatrices = new Float32Array(grassTarget * 16);
      const grassColors = new Float32Array(grassTarget * 3);
      let grassCount = 0;
      for (let i = 0; i < grassTarget * 2 && grassCount < grassTarget; i++) {
        const x = minX + rand() * CHUNK_SIZE;
        const z = minZ + rand() * CHUNK_SIZE;
        if (Math.abs(x) > WORLD_HALF_X - 8 || Math.abs(z) > WORLD_HALF_Z - 8) continue;
        if (Math.abs(x - riverCenterX(z)) - riverHalfWidthAt(z) < 0.85) continue;
        if (nearAnyCabin(x, z, 6.4)) continue;
        if (nearAnyCave(x, z, 12.2)) continue;
        if (nearAnyDungeon(x, z, 8.8)) continue;
        if (villagePlazaFactorAt(x, z) > 0.12) continue;
        if (isInsidePlayerBuild(x, z)) continue;
        const y = groundHeightAt(x, z);
        if (y < WATER_LEVEL + 0.28 || y > 8.6) continue;
        const biome = biomeAt(x, z);
        if (biome === 'desert' && rand() < 0.94) continue;
        if (biome === 'ashlands' && rand() < 0.84) continue;
        if (biome === 'mountain' && rand() < 0.55) continue;
        if (biome === 'snow_peaks' && rand() < 0.45) continue;

        dummy.position.set(x, y - 0.04, z);
        dummy.rotation.set((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.2);
        const biomeTall =
          biome === 'meadow'
            ? 1.06
            : biome === 'pine_forest'
              ? 0.8
              : biome === 'golden_steppe'
                ? 1.15
                : biome === 'desert'
                  ? 0.72
                  : biome === 'snow_peaks'
                    ? 0.72
                    : biome === 'ashlands'
                      ? 0.65
                      : 0.96;
        const s = (0.76 + rand() * 0.56) * (mobilePerf ? 1.12 : 1.0) * biomeTall;
        dummy.scale.set(s, s * (0.85 + rand() * 0.42), s);
        dummy.updateMatrix();
        grassMatrices.set(dummy.matrix.elements, grassCount * 16);

        if (biome === 'desert') {
          gColor.setHSL(0.11 + (rand() - 0.5) * 0.03, 0.45 + rand() * 0.12, 0.5 + rand() * 0.12);
        } else if (biome === 'golden_steppe') {
          gColor.setHSL(0.115 + (rand() - 0.5) * 0.04, 0.52 + rand() * 0.14, 0.44 + rand() * 0.14);
        } else if (biome === 'snow_peaks') {
          gColor.setHSL(0.46 + (rand() - 0.5) * 0.04, 0.18 + rand() * 0.1, 0.68 + rand() * 0.14);
        } else if (biome === 'ashlands') {
          gColor.setHSL(0.06, 0.15, 0.22 + rand() * 0.1);
        } else if (biome === 'mystic_swamp') {
          gColor.setHSL(0.36 + (rand() - 0.5) * 0.05, 0.34 + rand() * 0.14, 0.28 + rand() * 0.12);
        } else if (biome === 'autumn_woods') {
          gColor.setHSL(0.09 + (rand() - 0.5) * 0.04, 0.48 + rand() * 0.15, 0.38 + rand() * 0.14);
        } else if (biome === 'bamboo_grove') {
          gColor.setHSL(0.28 + (rand() - 0.5) * 0.04, 0.52 + rand() * 0.14, 0.36 + rand() * 0.14);
        } else if (biome === 'crystal_canyon') {
          gColor.setHSL(0.55 + (rand() - 0.5) * 0.05, 0.32 + rand() * 0.14, 0.42 + rand() * 0.14);
        } else if (biome === 'ancient_highlands') {
          gColor.setHSL(0.32 + (rand() - 0.5) * 0.05, 0.24 + rand() * 0.12, 0.35 + rand() * 0.12);
        } else {
          const hueShift = biome === 'pine_forest' ? 0.27 : biome === 'blossom_grove' ? 0.23 : 0.24;
          gColor.setHSL(hueShift + (rand() - 0.5) * 0.05, 0.44 + rand() * 0.16, 0.36 + rand() * 0.15);
        }
        const ci = grassCount * 3;
        grassColors[ci] = gColor.r;
        grassColors[ci + 1] = gColor.g;
        grassColors[ci + 2] = gColor.b;
        grassCount++;
      }
      if (grassCount > 0) {
        const gInst = new THREE.InstancedMesh(tuftGeo, grassMat, grassCount);
        gInst.receiveShadow = false;
        gInst.castShadow = false;
        gInst.matrixAutoUpdate = false;
        for (let i = 0; i < grassCount; i++) {
          m4.fromArray(grassMatrices, i * 16);
          gInst.setMatrixAt(i, m4);
          gColor.setRGB(grassColors[i * 3], grassColors[i * 3 + 1], grassColors[i * 3 + 2]);
          gInst.setColorAt(i, gColor);
        }
        gInst.instanceMatrix.needsUpdate = true;
        if (gInst.instanceColor) gInst.instanceColor.needsUpdate = true;
        gInst.computeBoundingSphere();
        chunkGroup.add(gInst);
        insts.push(gInst);
      }

      // B. Wildflowers per species (typed buffers)
      const flowerTarget = Math.round((mobilePerf ? 200 : 380) * grassDensityScale);
      const maxPerSpecies = flowerTarget;
      const flowerBuckets = [
        new Float32Array(maxPerSpecies * 16),
        new Float32Array(maxPerSpecies * 16),
        new Float32Array(maxPerSpecies * 16),
        new Float32Array(maxPerSpecies * 16),
      ];
      const flowerCounts = [0, 0, 0, 0];
      let flowersPlaced = 0;
      for (let i = 0; i < flowerTarget * 2 && flowersPlaced < flowerTarget; i++) {
        const x = minX + rand() * CHUNK_SIZE;
        const z = minZ + rand() * CHUNK_SIZE;
        if (Math.abs(x) > WORLD_HALF_X - 8 || Math.abs(z) > WORLD_HALF_Z - 8) continue;
        if (Math.abs(x - riverCenterX(z)) - riverHalfWidthAt(z) < 0.95) continue;
        if (nearAnyCabin(x, z, 6.4)) continue;
        if (nearAnyCave(x, z, 12.2)) continue;
        if (nearAnyDungeon(x, z, 8.8)) continue;
        if (villagePlazaFactorAt(x, z) > 0.12) continue;
        if (isInsidePlayerBuild(x, z)) continue;
        const y = groundHeightAt(x, z);
        if (y < WATER_LEVEL + 0.3 || y > 7.6) continue;
        const biome = biomeAt(x, z);
        if (biome === 'desert' || biome === 'ashlands') continue;
        if (biome === 'pine_forest' && rand() < 0.72) continue;

        dummy.position.set(x, y - 0.04, z);
        dummy.rotation.set(0, rand() * Math.PI * 2, 0);
        dummy.scale.setScalar((0.78 + rand() * 0.82) * (mobilePerf ? 1.18 : 1.0));
        dummy.updateMatrix();
        const species = Math.floor(rand() * 4);
        const cnt = flowerCounts[species];
        flowerBuckets[species].set(dummy.matrix.elements, cnt * 16);
        flowerCounts[species] = cnt + 1;
        flowersPlaced++;
      }
      for (let sp = 0; sp < 4; sp++) {
        const cnt = flowerCounts[sp];
        if (cnt === 0) continue;
        const mats = flowerBuckets[sp];
        const fInst = new THREE.InstancedMesh(flowerGeo, flowerMats[sp], cnt);
        fInst.receiveShadow = false;
        fInst.castShadow = false;
        fInst.matrixAutoUpdate = false;
        for (let i = 0; i < cnt; i++) {
          m4.fromArray(mats, i * 16);
          fInst.setMatrixAt(i, m4);
        }
        fInst.instanceMatrix.needsUpdate = true;
        fInst.computeBoundingSphere();
        chunkGroup.add(fInst);
        insts.push(fInst);
      }

      // C. Fern Bushes (typed buffers)
      const fernTarget = Math.round((mobilePerf ? 48 : 96) * grassDensityScale);
      const fernMatrices = new Float32Array(fernTarget * 16);
      const fernColors = new Float32Array(fernTarget * 3);
      let fernsPlaced = 0;
      for (let i = 0; i < fernTarget * 3 && fernsPlaced < fernTarget; i++) {
        const x = minX + rand() * CHUNK_SIZE;
        const z = minZ + rand() * CHUNK_SIZE;
        if (Math.abs(x) > WORLD_HALF_X - 8 || Math.abs(z) > WORLD_HALF_Z - 8) continue;
        if (Math.abs(x - riverCenterX(z)) - riverHalfWidthAt(z) < 2.1) continue;
        if (nearAnyCabin(x, z, 7.8)) continue;
        if (nearAnyCave(x, z, 12.2)) continue;
        if (nearAnyDungeon(x, z, 9.2)) continue;
        if (villagePlazaFactorAt(x, z) > 0.1) continue;
        if (isInsidePlayerBuild(x, z)) continue;
        const y = groundHeightAt(x, z);
        if (y < WATER_LEVEL + 0.3 || y > 7.8) continue;
        const biome = biomeAt(x, z);
        if (biome === 'desert' || biome === 'ashlands') continue;
        if (biome === 'meadow' && rand() < 0.72) continue;

        dummy.position.set(x, y - 0.08, z);
        dummy.rotation.set(0, rand() * Math.PI * 2, 0);
        dummy.scale.setScalar((0.72 + rand() * 0.65) * (mobilePerf ? 1.15 : 1.0));
        dummy.updateMatrix();
        fernMatrices.set(dummy.matrix.elements, fernsPlaced * 16);
        gColor.setHSL(0.26 + (rand() - 0.5) * 0.06, 0.28 + rand() * 0.14, 0.56 + rand() * 0.18);
        const fi = fernsPlaced * 3;
        fernColors[fi] = gColor.r;
        fernColors[fi + 1] = gColor.g;
        fernColors[fi + 2] = gColor.b;
        fernsPlaced++;
      }
      if (fernsPlaced > 0) {
        const bInst = new THREE.InstancedMesh(bushGeo, bushMat, fernsPlaced);
        bInst.receiveShadow = false;
        bInst.castShadow = false;
        bInst.matrixAutoUpdate = false;
        for (let i = 0; i < fernsPlaced; i++) {
          m4.fromArray(fernMatrices, i * 16);
          bInst.setMatrixAt(i, m4);
          gColor.setRGB(fernColors[i * 3], fernColors[i * 3 + 1], fernColors[i * 3 + 2]);
          bInst.setColorAt(i, gColor);
        }
        bInst.instanceMatrix.needsUpdate = true;
        if (bInst.instanceColor) bInst.instanceColor.needsUpdate = true;
        bInst.computeBoundingSphere();
        chunkGroup.add(bInst);
        insts.push(bInst);
      }

      // D. River Reeds in this chunk
      const reedTarget = mobilePerf ? 55 : 120;
      const reedMatrices = new Float32Array(reedTarget * 16);
      let reedCnt = 0;
      for (let i = 0; i < reedTarget * 2 && reedCnt < reedTarget; i++) {
        const z = minZ + rand() * CHUNK_SIZE;
        if (Math.abs(z) > WORLD_HALF_Z - 8 || Math.abs(z + 10) < 5.5) continue;
        const side = rand() > 0.5 ? 1 : -1;
        const x = riverCenterX(z) + side * (riverHalfWidthAt(z) - 0.35 + rand() * 1.25);
        if (x < minX || x > minX + CHUNK_SIZE) continue;
        const y = groundHeightAt(x, z);
        dummy.position.set(x, Math.max(WATER_LEVEL - 0.2, y - 0.08), z);
        dummy.rotation.set(0, rand() * Math.PI * 2, 0);
        dummy.scale.setScalar((0.82 + rand() * 0.6) * (mobilePerf ? 1.15 : 1.0));
        dummy.updateMatrix();
        reedMatrices.set(dummy.matrix.elements, reedCnt * 16);
        reedCnt++;
      }
      if (reedCnt > 0) {
        const rInst = new THREE.InstancedMesh(reedGeo, reedMat, reedCnt);
        rInst.receiveShadow = false;
        rInst.castShadow = false;
        rInst.matrixAutoUpdate = false;
        for (let i = 0; i < reedCnt; i++) {
          m4.fromArray(reedMatrices, i * 16);
          rInst.setMatrixAt(i, m4);
        }
        rInst.instanceMatrix.needsUpdate = true;
        rInst.computeBoundingSphere();
        chunkGroup.add(rInst);
        insts.push(rInst);
      }

      // E. Biome-Grouped Varied & Choppable Trees in this chunk
      type TreeSpec = { id: string; x: number; z: number; scale: number; hBias: number };
      const oakList: TreeSpec[] = [];
      const autumnList: TreeSpec[] = [];
      const blossomList: TreeSpec[] = [];
      const pineList: TreeSpec[] = [];
      const allChunkTrees: TreeSpec[] = [];

      if (cx === -1 && cz === -1) {
        // Guarantee scenic trees right beside main starter homestead
        const starterTrees: [number, number, number, 'oak' | 'blossom'][] = [
          [-13.5, -2.0, 1.35, 'oak'],
          [-24.0, -12.0, 1.44, 'oak'],
          [-9.0, -31.0, 1.25, 'oak'],
          [-6.5, -26.5, 1.05, 'blossom'],
        ];
        starterTrees.forEach(([tx, tz, sc, tpKind], sIdx) => {
          const item: TreeSpec = { id: `t_starter_${sIdx}`, x: tx, z: tz, scale: sc, hBias: 1.0 };
          allChunkTrees.push(item);
          if (tpKind === 'blossom') blossomList.push(item);
          else oakList.push(item);
        });
      }

      const treeTarget = mobilePerf ? 18 : 30;
      for (let i = 0; i < 160 && allChunkTrees.length < treeTarget; i++) {
        const x = minX + rand() * CHUNK_SIZE;
        const z = minZ + rand() * CHUNK_SIZE;
        if (Math.abs(x) > WORLD_HALF_X - 18 || Math.abs(z) > WORLD_HALF_Z - 18) continue;
        if (Math.hypot(x + 2, z - 9) < 12.0) continue;
        if (nearAnyCabin(x, z, 11.5)) continue;
        if (nearAnyCave(x, z, 15.5)) continue;
        if (nearAnyDungeon(x, z, 11.5)) continue;
        if (nearVillage(x, z, 72)) continue;
        if (mountainRockFactorAt(x, z) > 0.52) continue;
        if (Math.hypot(x - 46, z + 24) < 14) continue;
        if (Math.hypot(x - FINAL_ARENA_X, z - FINAL_ARENA_Z) < FINAL_ARENA_RADIUS + 8) continue;
        if (Math.abs(x - riverCenterX(z)) < riverHalfWidthAt(z) + 4.8) continue;

        const biome = biomeAt(x, z);
        if (biome === 'desert') continue;
        if (biome === 'meadow' && rand() < 0.78) continue;
        if (biome === 'golden_steppe' && rand() < 0.65) continue;
        if (biome === 'ashlands' && rand() < 0.75) continue;

        let tooClose = false;
        const spacing =
          biome === 'oak_forest' || biome === 'pine_forest' || biome === 'snow_peaks' ? 5.8 : 7.0;
        for (const tp of allChunkTrees) {
          if (Math.hypot(x - tp.x, z - tp.z) < spacing) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        const rSize = rand();
        const scale =
          rSize < 0.24 ? 0.56 + rand() * 0.34 : rSize < 0.76 ? 0.94 + rand() * 0.56 : 1.54 + rand() * 0.55;
        const hBias = 0.88 + rand() * 0.28;
        const placement: TreeSpec = {
          id: `t_${cx}_${cz}_${allChunkTrees.length}`,
          x,
          z,
          scale,
          hBias,
        };

        const roll = rand();
        if (biome === 'pine_forest' || biome === 'snow_peaks' || biome === 'crystal_canyon') {
          if (roll < 0.88) pineList.push(placement);
          else oakList.push(placement);
        } else if (biome === 'blossom_grove') {
          if (roll < 0.66) blossomList.push(placement);
          else oakList.push(placement);
        } else if (biome === 'autumn_woods' || biome === 'golden_steppe' || biome === 'ashlands') {
          if (roll < 0.72) autumnList.push(placement);
          else if (roll < 0.88) oakList.push(placement);
          else pineList.push(placement);
        } else if (biome === 'mystic_swamp') {
          if (roll < 0.56) oakList.push(placement);
          else if (roll < 0.88) pineList.push(placement);
          else autumnList.push(placement);
        } else if (biome === 'bamboo_grove') {
          if (roll < 0.55) oakList.push(placement);
          else blossomList.push(placement);
        } else if (biome === 'ancient_highlands') {
          if (roll < 0.62) pineList.push(placement);
          else autumnList.push(placement);
        } else if (biome === 'meadow') {
          if (roll < 0.45) blossomList.push(placement);
          else oakList.push(placement);
        } else {
          if (roll < 0.24) autumnList.push(placement);
          else if (roll < 0.36) pineList.push(placement);
          else oakList.push(placement);
        }
        allChunkTrees.push(placement);
      }

      const emitTreeSpecies = (
        list: TreeSpec[],
        species: 'oak' | 'autumn' | 'blossom' | 'pine',
        tGeo: THREE.BufferGeometry,
        cGeo: THREE.BufferGeometry,
        canopyMat: THREE.MeshLambertMaterial,
        hueBase: number,
        hueSpan: number,
        satBase: number,
      ) => {
        if (list.length === 0) return;
        const tInst = new THREE.InstancedMesh(tGeo, trunkMat, list.length);
        const cInst = new THREE.InstancedMesh(cGeo, canopyMat, list.length);
        tInst.castShadow = !mobilePerf;
        tInst.receiveShadow = true;
        tInst.matrixAutoUpdate = false;
        cInst.castShadow = !mobilePerf;
        cInst.receiveShadow = false;
        cInst.matrixAutoUpdate = false;

        list.forEach((tp, idx) => {
          const y = groundHeightAt(tp.x, tp.z);
          const rotX = species === 'pine' ? 0 : (rand() - 0.5) * 0.06;
          const rotY = rand() * Math.PI * 2;
          const rotZ = species === 'pine' ? 0 : (rand() - 0.5) * 0.06;
          const sx = species === 'pine' ? tp.scale * 0.95 : tp.scale * (0.9 + rand() * 0.22);
          const sy = species === 'pine' ? tp.scale * (tp.hBias + 0.12) : tp.scale * tp.hBias;
          const sz = species === 'pine' ? tp.scale * 0.95 : tp.scale * (0.9 + rand() * 0.22);

          if (choppedTreeIds.has(tp.id)) {
            const until = choppedUntilMap.get(tp.id);
            if (until !== undefined && envElapsedSec >= until) {
              choppedTreeIds.delete(tp.id);
              choppedUntilMap.delete(tp.id);
            }
          }
          const isChopped = choppedTreeIds.has(tp.id);
          dummy.position.set(tp.x, y - 0.25, tp.z);
          dummy.rotation.set(rotX, rotY, rotZ);
          if (isChopped) {
            dummy.scale.set(0, 0, 0);
          } else {
            dummy.scale.set(sx, sy, sz);
          }
          dummy.updateMatrix();
          tInst.setMatrixAt(idx, dummy.matrix);
          cInst.setMatrixAt(idx, dummy.matrix);
          gColor.setHSL(hueBase + (rand() - 0.5) * hueSpan, satBase + rand() * 0.16, 0.76 + rand() * 0.24);
          cInst.setColorAt(idx, gColor);

          const colRadius = tp.id.startsWith('t_starter_') ? 0.72 * tp.scale : 0.68 * tp.scale;
          const collider: ObstacleCollider = { x: tp.x, z: tp.z, radius: colRadius };
          const maxHp = Math.max(95, Math.round(125 * tp.scale));
          const rec: TreeInstanceRecord = {
            id: tp.id,
            chunkKey,
            species,
            x: tp.x,
            y,
            z: tp.z,
            scale: tp.scale,
            hBias: tp.hBias,
            rotX,
            rotY,
            rotZ,
            sx,
            sy,
            sz,
            hp: maxHp,
            maxHp,
            tInst,
            cInst,
            instIdx: idx,
            collider,
          };
          chunkTreeIds.push(tp.id);

          if (isChopped) {
            const stumpGroup = placeStumpInGroup(chunkGroup, tp.x, y, tp.z, tp.scale, rotY);
            const until = choppedUntilMap.get(tp.id) ?? envElapsedSec + 75 + rand() * 40;
            choppedUntilMap.set(tp.id, until);
            dormantChoppedTrees.set(tp.id, {
              rec,
              stumpGroup,
              regrowTimer: Math.max(6, until - envElapsedSec),
            });
          } else {
            chunkColliders.push(collider);
            activeTrees.set(tp.id, rec);
          }
        });
        [tInst, cInst].forEach((inst) => {
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          inst.computeBoundingSphere();
          chunkGroup.add(inst);
          insts.push(inst);
        });
      };

      emitTreeSpecies(oakList, 'oak', woodGeo, canopyGeo, oakCanopyMat, 0.24, 0.06, 0.22);
      emitTreeSpecies(autumnList, 'autumn', woodGeo, canopyGeo, autumnCanopyMat, 0.08, 0.05, 0.22);
      emitTreeSpecies(blossomList, 'blossom', woodGeo, canopyGeo, blossomCanopyMat, 0.94, 0.06, 0.18);
      emitTreeSpecies(pineList, 'pine', pineWoodGeo, pineCanopyGeo, pineCanopyMat, 0.32, 0.04, 0.22);

      // E2. Desert Saguaro Cacti in Desert Biome
      const cactusTarget = 16;
      const cactusMatrices = new Float32Array(cactusTarget * 16);
      let cactiPlaced = 0;
      for (let i = 0; i < 65 && cactiPlaced < cactusTarget; i++) {
        const x = minX + rand() * CHUNK_SIZE;
        const z = minZ + rand() * CHUNK_SIZE;
        if (Math.abs(x) > WORLD_HALF_X - 14 || Math.abs(z) > WORLD_HALF_Z - 14) continue;
        if (biomeAt(x, z) !== 'desert') continue;
        if (nearAnyCabin(x, z, 9.0) || nearAnyCave(x, z, 13.0) || nearAnyDungeon(x, z, 10.5)) continue;
        if (Math.abs(x - riverCenterX(z)) < riverHalfWidthAt(z) + 3.5) continue;
        const y = groundHeightAt(x, z);
        if (y < WATER_LEVEL + 0.4) continue;
        const sc = 0.78 + rand() * 0.68;
        dummy.position.set(x, y - 0.12, z);
        dummy.rotation.set(0, rand() * Math.PI * 2, 0);
        dummy.scale.set(sc, sc * (0.9 + rand() * 0.32), sc);
        dummy.updateMatrix();
        cactusMatrices.set(dummy.matrix.elements, cactiPlaced * 16);
        chunkColliders.push({ x, z, radius: 0.45 * sc });
        cactiPlaced++;
      }
      if (cactiPlaced > 0) {
        const cInst = new THREE.InstancedMesh(cactusGeo, cactusMat, cactiPlaced);
        cInst.castShadow = !mobilePerf;
        cInst.receiveShadow = true;
        cInst.matrixAutoUpdate = false;
        for (let i = 0; i < cactiPlaced; i++) {
          m4.fromArray(cactusMatrices, i * 16);
          cInst.setMatrixAt(i, m4);
        }
        cInst.instanceMatrix.needsUpdate = true;
        cInst.computeBoundingSphere();
        chunkGroup.add(cInst);
        insts.push(cInst);
      }

      // F. Boulders per chunk (typed buffers)
      const rockTarget = 7;
      const rockMatrices = new Float32Array(rockTarget * 16);
      let rocksPlaced = 0;
      for (let i = 0; i < 28 && rocksPlaced < rockTarget; i++) {
        const x = minX + rand() * CHUNK_SIZE;
        const z = minZ + rand() * CHUNK_SIZE;
        if (Math.abs(x) > WORLD_HALF_X - 10 || Math.abs(z) > WORLD_HALF_Z - 10) continue;
        if (Math.hypot(x + 2, z - 9) < 8) continue;
        if (Math.hypot(x - riverCenterX(BRIDGE_Z), z - BRIDGE_Z) < 13.5) continue;
        if (Math.hypot(x - 46, z + 24) < 14) continue;
        if (Math.abs(x - riverCenterX(z)) < riverHalfWidthAt(z) + 2.8) continue;
        if (nearAnyCabin(x, z, 11.0)) continue;
        if (nearAnyCave(x, z, 13.0)) continue;
        if (nearAnyDungeon(x, z, 11.5)) continue;
        if (nearVillage(x, z, 70)) continue;
        if (Math.hypot(x - FINAL_ARENA_X, z - FINAL_ARENA_Z) < FINAL_ARENA_RADIUS + 6) continue;
        const y = groundHeightAt(x, z);
        if (y < WATER_LEVEL + 0.25) continue;

        const s = 0.65 + rand() * 1.2;
        dummy.position.set(x, y + s * 0.3, z);
        dummy.rotation.set(rand() * 2, rand() * 3, rand() * 2);
        dummy.scale.set(s * 1.2, s * 0.78, s);
        dummy.updateMatrix();
        rockMatrices.set(dummy.matrix.elements, rocksPlaced * 16);
        if (s > 1.0) chunkColliders.push({ x, z, radius: s * 0.95 });
        rocksPlaced++;
      }
      if (rocksPlaced > 0) {
        const rkInst = new THREE.InstancedMesh(rockGeo, rockMat, rocksPlaced);
        rkInst.castShadow = !mobilePerf;
        rkInst.receiveShadow = true;
        rkInst.matrixAutoUpdate = false;
        for (let i = 0; i < rocksPlaced; i++) {
          m4.fromArray(rockMatrices, i * 16);
          rkInst.setMatrixAt(i, m4);
        }
        rkInst.instanceMatrix.needsUpdate = true;
        rkInst.computeBoundingSphere();
        chunkGroup.add(rkInst);
        insts.push(rkInst);
      }
    }

    group.add(chunkGroup);
    return { key: chunkKey, chunkGroup, colliders: chunkColliders, insts, treeIds: chunkTreeIds };
  };

  let lastPlayerCx = 999999;
  let lastPlayerCz = 999999;
  const pendingTerrainQueue: [number, number][] = [];
  const pendingFloraQueue: [number, number][] = [];
  let collidersVersion = 1;
  const packChunkKey = (cx: number, cz: number) => (cx + 512) * 1024 + (cz + 512);
  const haveTerrainSet = new Set<number>();
  const wantedFloraNumSet = new Set<number>();
  const builtChunkSet = new Set<number>();

  const syncColliders = () => {
    colliders.length = 0;
    for (let i = 0; i < staticColliders.length; i++) {
      colliders.push(staticColliders[i]);
    }
    for (const chunk of activeFloraChunks.values()) {
      const cList = chunk.colliders;
      for (let i = 0; i < cList.length; i++) {
        colliders.push(cList[i]);
      }
    }
    collidersVersion++;
  };

  const ensureChunksAround = (px: number, pz: number, synchronousWarmup = false) => {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const playerChunkChanged = pcx !== lastPlayerCx || pcz !== lastPlayerCz;

    if (playerChunkChanged) {
      lastPlayerCx = pcx;
      lastPlayerCz = pcz;

      // 1. Collect needed terrain slots sorted closest-first
      pendingTerrainQueue.length = 0;
      const neededTerrain: [number, number, number][] = [];
      for (let dz = -TERRAIN_POOL_RADIUS; dz <= TERRAIN_POOL_RADIUS; dz++) {
        for (let dx = -TERRAIN_POOL_RADIUS; dx <= TERRAIN_POOL_RADIUS; dx++) {
          neededTerrain.push([pcx + dx, pcz + dz, dx * dx + dz * dz]);
        }
      }
      neededTerrain.sort((a, b) => a[2] - b[2]);

      haveTerrainSet.clear();
      for (let i = 0; i < terrainPool.length; i++) {
        const slot = terrainPool[i];
        if (
          Math.abs(slot.cx - pcx) <= TERRAIN_POOL_RADIUS &&
          Math.abs(slot.cz - pcz) <= TERRAIN_POOL_RADIUS
        ) {
          haveTerrainSet.add(packChunkKey(slot.cx, slot.cz));
        }
      }
      for (let i = 0; i < neededTerrain.length; i++) {
        const [ncx, ncz] = neededTerrain[i];
        if (!haveTerrainSet.has(packChunkKey(ncx, ncz))) {
          pendingTerrainQueue.push([ncx, ncz]);
        }
      }

      // 2. Prune distant flora & queue missing flora chunks closest-first
      wantedFloraNumSet.clear();
      const neededFlora: [number, number, number][] = [];
      for (let dz = -floraRadius; dz <= floraRadius; dz++) {
        for (let dx = -floraRadius; dx <= floraRadius; dx++) {
          wantedFloraNumSet.add(packChunkKey(pcx + dx, pcz + dz));
          neededFlora.push([pcx + dx, pcz + dz, dx * dx + dz * dz]);
        }
      }
      neededFlora.sort((a, b) => a[2] - b[2]);

      let collidersChanged = false;
      for (const [k, existing] of activeFloraChunks.entries()) {
        const comma = k.indexOf(',');
        const ecx = Number(k.slice(0, comma));
        const ecz = Number(k.slice(comma + 1));
        if (!wantedFloraNumSet.has(packChunkKey(ecx, ecz))) {
          group.remove(existing.chunkGroup);
          existing.insts.forEach((inst) => inst.dispose());
          for (const tid of existing.treeIds) {
            activeTrees.delete(tid);
            dormantChoppedTrees.delete(tid);
          }
          activeFloraChunks.delete(k);
          collidersChanged = true;
        }
      }
      pendingFloraQueue.length = 0;
      for (let i = 0; i < neededFlora.length; i++) {
        const [fcx, fcz] = neededFlora[i];
        const k = `${fcx},${fcz}`;
        if (!activeFloraChunks.has(k)) {
          pendingFloraQueue.push([fcx, fcz]);
        }
      }
      if (collidersChanged) syncColliders();
    }

    // Build terrain slots (all immediately on startup, or max 1 per frame while moving to prevent lag spikes!)
    const maxTerrainPerTick = synchronousWarmup ? poolSize : 1;
    let builtTerrain = 0;
    while (pendingTerrainQueue.length > 0 && builtTerrain < maxTerrainPerTick) {
      const next = pendingTerrainQueue.shift()!;
      let freeSlot: TerrainChunkSlot | undefined;
      for (let i = 0; i < terrainPool.length; i++) {
        const slot = terrainPool[i];
        if (
          Math.abs(slot.cx - pcx) > TERRAIN_POOL_RADIUS ||
          Math.abs(slot.cz - pcz) > TERRAIN_POOL_RADIUS
        ) {
          freeSlot = slot;
          break;
        }
      }
      if (freeSlot) {
        updateTerrainChunkSlot(freeSlot, next[0], next[1]);
        builtTerrain++;
      } else {
        break;
      }
    }

    // Only recompute coarseTerrain discard rectangle when player changed chunk OR a terrain slot was updated
    if (playerChunkChanged || builtTerrain > 0) {
      builtChunkSet.clear();
      for (let i = 0; i < terrainPool.length; i++) {
        const slot = terrainPool[i];
        builtChunkSet.add(packChunkKey(slot.cx, slot.cz));
      }
      let rBuilt = -1;
      for (let r = 0; r <= TERRAIN_POOL_RADIUS; r++) {
        let complete = true;
        for (let dz = -r; dz <= r && complete; dz++) {
          for (let dx = -r; dx <= r; dx++) {
            if (!builtChunkSet.has(packChunkKey(pcx + dx, pcz + dz))) {
              complete = false;
              break;
            }
          }
        }
        if (complete) rBuilt = r;
        else break;
      }
      if (rBuilt >= 0) {
        terrainUniforms.uHighResBounds.value.set(
          (pcx - rBuilt) * CHUNK_SIZE + 0.4,
          (pcz - rBuilt) * CHUNK_SIZE + 0.4,
          (pcx + rBuilt + 1) * CHUNK_SIZE - 0.4,
          (pcz + rBuilt + 1) * CHUNK_SIZE - 0.4,
        );
      } else {
        terrainUniforms.uHighResBounds.value.set(0, 0, -1, -1);
      }
    }

    // Build flora chunks (nearest 3x3 on startup, or max 1 per frame while moving)
    const maxFloraPerTick = synchronousWarmup ? 9 : 1;
    let builtFlora = 0;
    let floraAdded = false;
    while (pendingFloraQueue.length > 0 && builtFlora < maxFloraPerTick) {
      const next = pendingFloraQueue.shift()!;
      const k = `${next[0]},${next[1]}`;
      if (!activeFloraChunks.has(k)) {
        activeFloraChunks.set(k, buildFloraChunk(next[0], next[1]));
        builtFlora++;
        floraAdded = true;
      }
    }
    if (floraAdded) syncColliders();
  };

  // Pre-warm initial chunks & near grass around initial player / saved position
  ensureChunksAround(options.initialX ?? -2, options.initialZ ?? 9, true);
  updateNearGrass(options.initialX ?? -2, options.initialZ ?? 9, true);

  // 8. Dynamic 3D Weather Particle Volume (Rain / Snow / Autumn Leaves / Spring Blossoms)
  const wxCount = mobilePerf ? 650 : 1450;
  let activeWxCount = wxCount;
  let weatherParticlesEnabled = true;
  const wxPositions = new Float32Array(wxCount * 3);
  const wxSeeds = new Float32Array(wxCount);
  for (let i = 0; i < wxCount; i++) {
    wxPositions[i * 3] = (Math.random() - 0.5) * 42;
    wxPositions[i * 3 + 1] = Math.random() * 20;
    wxPositions[i * 3 + 2] = (Math.random() - 0.5) * 42;
    wxSeeds[i] = Math.random() * Math.PI * 2;
  }
  const wxGeo = new THREE.BufferGeometry();
  wxGeo.setAttribute('position', new THREE.BufferAttribute(wxPositions, 3));
  const wxTexture = buildWeatherParticleTexture();
  const wxMat = new THREE.PointsMaterial({
    color: 0xe0f2fe,
    map: wxTexture,
    alphaTest: 0.02,
    size: 0.16,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const wxPoints = new THREE.Points(wxGeo, wxMat);
  wxPoints.frustumCulled = false;
  group.add(wxPoints);
  disposables.push(wxGeo, wxMat, wxTexture);

  const targetSeasonTint = new THREE.Color(1, 1, 1);
  const targetSkyTop = new THREE.Color(0.32, 0.6, 0.9);
  const targetSkyHorizon = new THREE.Color(0.84, 0.91, 0.96);
  const targetSunColor = new THREE.Color(1.0, 0.93, 0.76);
  const targetWaterDeep = new THREE.Color(0x0f3b76);
  const targetWaterShallow = new THREE.Color(0x1f8fa8);
  let targetSnowMix = 0;
  let targetWetness = 0;
  let targetOvercast = 0;
  let targetWaveAmp = 1.0;
  let targetWaterState = 0.0;

  return {
    group,
    colliders,
    getCollidersVersion: () => collidersVersion,
    addStaticCollider: (collider: ObstacleCollider) => {
      staticColliders.push(collider);
      colliders.push(collider);
      collidersVersion++;
    },
    updateTrailOverlay: (cells: TrailCellPoint[]) => {
      updateTrailOverlay(cells);
      updateNearGrass(lastNearGrassX, lastNearGrassZ, true);
    },
    warmAround: (x: number, z: number) => {
      ensureChunksAround(x, z, true);
      updateRiverStrip(z);
      updateNearGrass(x, z, true);
    },
    findTreeInFront: (px: number, pz: number, aimX: number, aimZ: number, range: number) => {
      let best: {
        id: string;
        x: number;
        z: number;
        dist: number;
        hp: number;
        maxHp: number;
        species: 'oak' | 'autumn' | 'blossom' | 'pine';
      } | null = null;
      let bestScore = Infinity;
      const maxCheck = range + 1.4;
      const maxCheckSq = maxCheck * maxCheck;
      for (const rec of activeTrees.values()) {
        const dx = rec.x - px;
        if (Math.abs(dx) > maxCheck) continue;
        const dz = rec.z - pz;
        if (Math.abs(dz) > maxCheck) continue;
        const dSq = dx * dx + dz * dz;
        if (dSq > maxCheckSq) continue;
        const d = Math.sqrt(dSq);
        if (d > range + 0.6 * rec.scale) continue;
        const dot = d > 0.01 ? (dx * aimX + dz * aimZ) / d : 1;
        if (dot < -0.15) continue;
        const score = d - dot * 1.4;
        if (score < bestScore) {
          bestScore = score;
          best = {
            id: rec.id,
            x: rec.x,
            z: rec.z,
            dist: d,
            hp: rec.hp,
            maxHp: rec.maxHp,
            species: rec.species,
          };
        }
      }
      return best;
    },
    hitTree: (id: string, damage: number, hitDirX: number, hitDirZ: number) => {
      const rec = activeTrees.get(id);
      if (!rec) return null;
      rec.hp = Math.max(0, rec.hp - damage);
      if (rec.hp <= 0) {
        const regrowSec = 75 + Math.random() * 40;
        choppedTreeIds.add(id);
        choppedUntilMap.set(id, envElapsedSec + regrowSec);
        activeTrees.delete(id);
        dummy.position.set(rec.x, rec.y - 20, rec.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        rec.tInst.setMatrixAt(rec.instIdx, dummy.matrix);
        rec.cInst.setMatrixAt(rec.instIdx, dummy.matrix);
        rec.tInst.instanceMatrix.needsUpdate = true;
        rec.cInst.instanceMatrix.needsUpdate = true;

        const chunk = activeFloraChunks.get(rec.chunkKey);
        if (chunk) {
          const stumpGroup = placeStumpInGroup(chunk.chunkGroup, rec.x, rec.y, rec.z, rec.scale, rec.rotY);
          dormantChoppedTrees.set(id, {
            rec: { ...rec, hp: rec.maxHp },
            stumpGroup,
            regrowTimer: regrowSec,
          });
          const ci = chunk.colliders.indexOf(rec.collider);
          if (ci !== -1) chunk.colliders.splice(ci, 1);
          syncColliders();
        }
        return {
          felled: true,
          x: rec.x,
          y: rec.y,
          z: rec.z,
          scale: rec.scale,
          sx: rec.sx,
          sy: rec.sy,
          sz: rec.sz,
          rotX: rec.rotX,
          rotY: rec.rotY,
          rotZ: rec.rotZ,
          species: rec.species,
          hp: 0,
          maxHp: rec.maxHp,
        };
      }
      treeShakes.push({ rec, timer: 0.28, dirX: hitDirX, dirZ: hitDirZ });
      return {
        felled: false,
        x: rec.x,
        y: rec.y,
        z: rec.z,
        scale: rec.scale,
        sx: rec.sx,
        sy: rec.sy,
        sz: rec.sz,
        rotX: rec.rotX,
        rotY: rec.rotY,
        rotZ: rec.rotZ,
        species: rec.species,
        hp: rec.hp,
        maxHp: rec.maxHp,
      };
    },
    createFallingTreeVisual: (
      species: 'oak' | 'autumn' | 'blossom' | 'pine',
      scale: number,
      sx: number,
      sy: number,
      sz: number,
      rotY: number,
    ) => {
      const container = new THREE.Group();
      const inner = new THREE.Group();
      inner.rotation.y = rotY;
      inner.scale.set(sx, sy, sz);
      // Offset down slightly so the trunk base sits cleanly at the pivot hinge above the stump
      inner.position.y = -0.68;

      const tGeo = species === 'pine' ? pineWoodGeo : woodGeo;
      const cGeo = species === 'pine' ? pineCanopyGeo : canopyGeo;
      const cMat =
        species === 'pine'
          ? pineCanopyMat
          : species === 'blossom'
            ? blossomCanopyMat
            : species === 'autumn'
              ? autumnCanopyMat
              : oakCanopyMat;

      const woodMesh = new THREE.Mesh(tGeo, trunkMat);
      woodMesh.userData.sharedAsset = true;
      woodMesh.castShadow = !mobilePerf;
      woodMesh.receiveShadow = true;

      const canopyMesh = new THREE.Mesh(cGeo, cMat);
      canopyMesh.userData.sharedAsset = true;
      canopyMesh.castShadow = !mobilePerf;

      const cutCap = new THREE.Mesh(stumpCapGeo, stumpCapMat);
      cutCap.userData.sharedAsset = true;
      cutCap.position.y = -0.71;
      cutCap.scale.setScalar(Math.max(0.85, scale * 0.9));

      inner.add(woodMesh, canopyMesh, cutCap);
      container.add(inner);
      return container;
    },
    getChoppedTreeIds: () => Array.from(choppedTreeIds).slice(-450),
    setBuildExclusionZones: (zones: BuildExclusionZone[]) => {
      buildExclusionZones = zones.map((z) => ({
        x: z.x,
        z: z.z,
        halfW: z.halfW,
        halfD: z.halfD,
        cos: Math.cos(z.rotY),
        sin: Math.sin(z.rotY),
      }));
      nearGrassTileCache.clear();
      lastNearGrassX = 999999;
      updateNearGrass(sharedEnvUniforms.uPlayerPos.value.x, sharedEnvUniforms.uPlayerPos.value.z, true);
      // Rebuild only current center chunk cleanly so built houses have zero grass inside
      const pcx = Math.floor(sharedEnvUniforms.uPlayerPos.value.x / CHUNK_SIZE);
      const pcz = Math.floor(sharedEnvUniforms.uPlayerPos.value.z / CHUNK_SIZE);
      const centerKey = `${pcx},${pcz}`;
      const existing = activeFloraChunks.get(centerKey);
      if (existing) {
        group.remove(existing.chunkGroup);
        existing.insts.forEach((inst) => inst.dispose());
        for (const tid of existing.treeIds) {
          activeTrees.delete(tid);
          dormantChoppedTrees.delete(tid);
        }
        activeFloraChunks.delete(centerKey);
        activeFloraChunks.set(centerKey, buildFloraChunk(pcx, pcz));
        syncColliders();
      }
    },
    setPerfTier: (tier: GraphicsPreset) => {
      const nextRadius =
        tier === 'low' ? 13.5 : tier === 'medium' ? 19.5 : mobilePerf ? 24.5 : 29.5;
      const nextFloraR = tier === 'low' || tier === 'medium' || mobilePerf ? 1 : 2;
      weatherParticlesEnabled = tier !== 'low';
      activeWxCount = tier === 'low' ? 0 : tier === 'medium' ? Math.min(320, wxCount) : wxCount;
      wxGeo.setDrawRange(0, activeWxCount);
      if (!weatherParticlesEnabled) {
        wxPoints.visible = false;
        wxMat.opacity = 0;
      }
      const radiusChanged = Math.abs(nextRadius - grassRadius) > 0.25;
      grassRadius = nextRadius;
      grassRadiusSq = nextRadius * nextRadius;
      grassFadeStart = Math.max(4, nextRadius - 6.0);
      grassFadeStartSq = grassFadeStart * grassFadeStart;
      grassFadeSpan = Math.max(1, nextRadius - grassFadeStart);
      if (radiusChanged) {
        lastNearGrassX = 999999;
        updateNearGrass(sharedEnvUniforms.uPlayerPos.value.x, sharedEnvUniforms.uPlayerPos.value.z, true);
      }
      if (nextFloraR !== floraRadius) {
        floraRadius = nextFloraR;
        lastPlayerCx = 999999;
        ensureChunksAround(sharedEnvUniforms.uPlayerPos.value.x, sharedEnvUniforms.uPlayerPos.value.z, false);
      }
    },
    setGrassDensity: (density: number) => {
      const clamped = Math.max(0.2, Math.min(1.0, density));
      if (Math.abs(clamped - grassDensityScale) < 0.02) return;
      grassDensityScale = clamped;
      lastNearGrassX = 999999;
      updateNearGrass(sharedEnvUniforms.uPlayerPos.value.x, sharedEnvUniforms.uPlayerPos.value.z, true);
      for (const existing of activeFloraChunks.values()) {
        group.remove(existing.chunkGroup);
        existing.insts.forEach((inst) => inst.dispose());
        for (const tid of existing.treeIds) {
          activeTrees.delete(tid);
          dormantChoppedTrees.delete(tid);
        }
      }
      activeFloraChunks.clear();
      lastPlayerCx = 999999;
      // Non-freezing incremental rebuild: build player chunk immediately, stream neighbors 1/frame
      const px = sharedEnvUniforms.uPlayerPos.value.x;
      const pz = sharedEnvUniforms.uPlayerPos.value.z;
      const pcx = Math.floor(px / CHUNK_SIZE);
      const pcz = Math.floor(pz / CHUNK_SIZE);
      const centerKey = `${pcx},${pcz}`;
      activeFloraChunks.set(centerKey, buildFloraChunk(pcx, pcz));
      syncColliders();
      ensureChunksAround(px, pz, false);
    },
    update: (elapsed: number, dt: number) => {
      envElapsedSec = elapsed;
      skyMat.uniforms.uTime.value = elapsed;
      waterUniforms.uTime.value = elapsed;
      sharedEnvUniforms.uTime.value = elapsed;
      const flowSpeed =
        waterUniforms.uWaterState.value === 3 ? 0.03 : waterUniforms.uWaterState.value === 1 ? 0.28 : 0.18;
      textures.waterRippleNormal.offset.y -= dt * flowSpeed;
      textures.waterRippleNormal.offset.x += dt * 0.035;

      // Automatic tree regrowth (stump disappears & sapling grows back smoothly to full size)
      for (const [id, dormant] of dormantChoppedTrees.entries()) {
        dormant.regrowTimer -= dt;
        if (dormant.regrowTimer <= 0) {
          dormantChoppedTrees.delete(id);
          choppedTreeIds.delete(id);
          choppedUntilMap.delete(id);
          const chunk = activeFloraChunks.get(dormant.rec.chunkKey);
          if (chunk) {
            chunk.chunkGroup.remove(dormant.stumpGroup);
            const r = dormant.rec;
            r.hp = r.maxHp;
            activeTrees.set(id, r);
            chunk.colliders.push(r.collider);
            syncColliders();
            growingTrees.push({ rec: r, progress: 0.15 });
          }
        }
      }

      for (let i = growingTrees.length - 1; i >= 0; i--) {
        const g = growingTrees[i];
        const r = g.rec;
        if (!activeTrees.has(r.id)) {
          growingTrees.splice(i, 1);
          continue;
        }
        g.progress = Math.min(1, g.progress + dt * 0.48);
        dummy.position.set(r.x, r.y - 0.25, r.z);
        dummy.rotation.set(r.rotX, r.rotY, r.rotZ);
        dummy.scale.set(r.sx * g.progress, r.sy * g.progress, r.sz * g.progress);
        dummy.updateMatrix();
        r.tInst.setMatrixAt(r.instIdx, dummy.matrix);
        r.cInst.setMatrixAt(r.instIdx, dummy.matrix);
        r.tInst.instanceMatrix.needsUpdate = true;
        r.cInst.instanceMatrix.needsUpdate = true;
        if (g.progress >= 1) {
          growingTrees.splice(i, 1);
        }
      }

      for (let i = treeShakes.length - 1; i >= 0; i--) {
        const sh = treeShakes[i];
        sh.timer -= dt;
        const r = sh.rec;
        if (!activeTrees.has(r.id)) {
          treeShakes.splice(i, 1);
          continue;
        }
        const wob = sh.timer > 0 ? Math.sin(sh.timer * 42) * 0.08 * (sh.timer / 0.22) : 0;
        dummy.position.set(r.x, r.y - 0.25, r.z);
        dummy.rotation.set(r.rotX + sh.dirZ * wob, r.rotY, r.rotZ - sh.dirX * wob);
        dummy.scale.set(r.sx, r.sy, r.sz);
        dummy.updateMatrix();
        r.tInst.setMatrixAt(r.instIdx, dummy.matrix);
        r.cInst.setMatrixAt(r.instIdx, dummy.matrix);
        r.tInst.instanceMatrix.needsUpdate = true;
        r.cInst.instanceMatrix.needsUpdate = true;
        if (sh.timer <= 0) {
          treeShakes.splice(i, 1);
        }
      }
    },
    setEnvironmentState: (
      season: SeasonId,
      weather: WeatherId,
      playerPos: THREE.Vector3,
      sunDir: THREE.Vector3,
      dt: number,
      elapsed: number,
    ) => {
      ensureChunksAround(playerPos.x, playerPos.z, false);
      updateNearGrass(playerPos.x, playerPos.z, false);
      sharedEnvUniforms.uPlayerPos.value.copy(playerPos);
      if (Math.abs(playerPos.z - lastRiverSnapZ) > 28) {
        updateRiverStrip(playerPos.z);
      }

      skyMat.uniforms.uSunDir.value.copy(sunDir);
      waterUniforms.uSunDir.value.copy(sunDir);
      skyDome.position.set(playerPos.x, 0, playerPos.z);
      sunGroup.position.copy(playerPos).addScaledVector(sunDir, 380);

      if (season === 'spring') {
        targetSeasonTint.setRGB(0.88, 1.15, 0.85);
        targetSnowMix = 0.0;
      } else if (season === 'summer') {
        targetSeasonTint.setRGB(1.0, 1.0, 0.96);
        targetSnowMix = 0.0;
      } else if (season === 'autumn') {
        targetSeasonTint.setRGB(1.22, 0.84, 0.44);
        targetSnowMix = 0.0;
      } else {
        targetSeasonTint.setRGB(0.82, 0.9, 0.98);
        targetSnowMix = 1.0;
      }

      targetWetness = weather === 'rain' ? 1.0 : weather === 'fog' ? 0.25 : 0.0;
      targetOvercast = weather === 'rain' ? 0.85 : weather === 'fog' ? 0.65 : weather === 'precip' ? 0.35 : 0.0;

      if (weather === 'rain') {
        targetSkyTop.setRGB(0.28, 0.36, 0.46);
        targetSkyHorizon.setRGB(0.56, 0.64, 0.72);
        targetSunColor.setRGB(0.75, 0.8, 0.88);
        targetWaterDeep.setHex(0x0b2c4e);
        targetWaterShallow.setHex(0x1b6276);
        targetWaveAmp = 1.85;
        targetWaterState = 1.0;
      } else if (weather === 'fog') {
        targetSkyTop.setRGB(0.55, 0.64, 0.72);
        targetSkyHorizon.setRGB(0.76, 0.83, 0.88);
        targetSunColor.setRGB(0.88, 0.9, 0.92);
        targetWaterDeep.setHex(0x16446b);
        targetWaterShallow.setHex(0x3a8296);
        targetWaveAmp = 0.65;
        targetWaterState = 2.0;
      } else if (season === 'winter') {
        targetSkyTop.setRGB(0.42, 0.64, 0.88);
        targetSkyHorizon.setRGB(0.86, 0.92, 0.98);
        targetSunColor.setRGB(0.95, 0.97, 1.0);
        targetWaterDeep.setHex(0x123e6d);
        targetWaterShallow.setHex(0x479ec2);
        targetWaveAmp = 0.52;
        targetWaterState = 3.0;
      } else if (season === 'autumn') {
        targetSkyTop.setRGB(0.34, 0.56, 0.84);
        targetSkyHorizon.setRGB(0.9, 0.84, 0.76);
        targetSunColor.setRGB(1.0, 0.84, 0.6);
        targetWaterDeep.setHex(0x103c70);
        targetWaterShallow.setHex(0x21869b);
        targetWaveAmp = 1.05;
        targetWaterState = 0.0;
      } else {
        targetSkyTop.setRGB(0.32, 0.6, 0.9);
        targetSkyHorizon.setRGB(0.84, 0.91, 0.96);
        targetSunColor.setRGB(1.0, 0.93, 0.76);
        targetWaterDeep.setHex(0x0f3b76);
        targetWaterShallow.setHex(0x1f8fa8);
        targetWaveAmp = 1.0;
        targetWaterState = 0.0;
      }

      const k = 1 - Math.exp(-dt * 2.2);
      terrainUniforms.uSeasonTint.value.lerp(targetSeasonTint, k);
      terrainUniforms.uSnowMix.value = THREE.MathUtils.lerp(terrainUniforms.uSnowMix.value, targetSnowMix, k);
      terrainUniforms.uWetness.value = THREE.MathUtils.lerp(terrainUniforms.uWetness.value, targetWetness, k);
      skyMat.uniforms.uSkyTop.value.lerp(targetSkyTop, k);
      skyMat.uniforms.uSkyHorizon.value.lerp(targetSkyHorizon, k);
      skyMat.uniforms.uSunColor.value.lerp(targetSunColor, k);
      skyMat.uniforms.uOvercast.value = THREE.MathUtils.lerp(skyMat.uniforms.uOvercast.value, targetOvercast, k);
      waterUniforms.uWaterDeep.value.lerp(targetWaterDeep, k);
      waterUniforms.uWaterShallow.value.lerp(targetWaterShallow, k);
      waterUniforms.uWaveAmp.value = THREE.MathUtils.lerp(waterUniforms.uWaveAmp.value, targetWaveAmp, k);
      waterUniforms.uWaterState.value = THREE.MathUtils.lerp(waterUniforms.uWaterState.value, targetWaterState, k);

      sunDiscMat.color.copy(skyMat.uniforms.uSunColor.value);
      sunHaloMat.opacity = Math.max(0.05, 0.28 * (1 - skyMat.uniforms.uOvercast.value * 0.8));

      const showParticles = weatherParticlesEnabled && (weather === 'rain' || weather === 'precip');
      if (!showParticles) {
        wxMat.opacity = Math.max(0, wxMat.opacity - dt * 2.5);
        wxPoints.visible = weatherParticlesEnabled && wxMat.opacity > 0.01;
        return;
      }
      wxPoints.visible = true;
      const targetOp = weather === 'rain' ? 0.6 : 0.78;
      wxMat.opacity = THREE.MathUtils.lerp(wxMat.opacity, targetOp, k * 2);

      let fallY = -23;
      let driftX = 2.4;
      let driftZ = 1.2;
      if (weather === 'rain') {
        wxMat.color.setHex(0xcbe8ff);
        wxMat.size = 0.13;
        fallY = -24;
      } else if (season === 'winter') {
        wxMat.color.setHex(0xf8fafc);
        wxMat.size = 0.2;
        fallY = -3.6;
        driftX = 1.2;
      } else if (season === 'autumn') {
        wxMat.color.setHex(0xf59e0b);
        wxMat.size = 0.21;
        fallY = -3.1;
        driftX = 1.8;
      } else if (season === 'spring') {
        wxMat.color.setHex(0xfbcfe8);
        wxMat.size = 0.17;
        fallY = -2.4;
        driftX = 1.5;
      } else {
        wxMat.color.setHex(0xfef08a);
        wxMat.size = 0.13;
        fallY = -1.6;
        driftX = 2.8;
      }

      const attr = wxGeo.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const boxHalf = 21;
      const minY = playerPos.y - 2;
      const maxY = playerPos.y + 18;
      for (let i = 0; i < activeWxCount; i++) {
        const idx = i * 3;
        const seed = wxSeeds[i];
        let x = arr[idx];
        let y = arr[idx + 1];
        let z = arr[idx + 2];

        const swirl = weather === 'rain' ? 0 : Math.sin(elapsed * 2.1 + seed) * 1.6;
        x += (driftX + swirl) * dt;
        y += fallY * dt;
        z += (driftZ + Math.cos(elapsed * 1.7 + seed) * (weather === 'rain' ? 0 : 1.3)) * dt;

        if (y < minY) y = maxY - Math.random() * 2;
        if (x < playerPos.x - boxHalf) x += boxHalf * 2;
        else if (x > playerPos.x + boxHalf) x -= boxHalf * 2;
        if (z < playerPos.z - boxHalf) z += boxHalf * 2;
        else if (z > playerPos.z + boxHalf) z -= boxHalf * 2;

        arr[idx] = x;
        arr[idx + 1] = y;
        arr[idx + 2] = z;
      }
      attr.needsUpdate = true;
    },
    dispose: () => {
      for (const chunk of activeFloraChunks.values()) {
        chunk.insts.forEach((inst) => inst.dispose());
      }
      activeFloraChunks.clear();
      disposables.forEach((d) => d.dispose());
    },
  };
}
