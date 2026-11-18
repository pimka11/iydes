// Open-world 2048x4096 terrain, dry meadow heightmap, winding river, 1 random-spawn village, varied houses, and Minecraft-style block caves

export const WORLD_SIZE_X = 2048;
export const WORLD_SIZE_Z = 4096;
export const WORLD_HALF_X = WORLD_SIZE_X / 2; // 1024
export const WORLD_HALF_Z = WORLD_SIZE_Z / 2; // 2048
export const WORLD_PLAYABLE_RADIUS = 1020; // Legacy compatibility helper
export const WATER_LEVEL = -0.35;

export const BRIDGE_Z = -10;
export const BRIDGE_HALF_WIDTH = 2.4;
export const BRIDGE_HALF_LENGTH = 9.2;

export const CABIN_X = -14;
export const CABIN_Z = -22;
export const CABIN_ROT = 0.28;
export const CABIN_HALF_W = 3.9;
export const CABIN_HALF_D = 3.2;

export type CabinStyle =
  | 'hunter'
  | 'shop'
  | 'watchtower'
  | 'cottage'
  | 'bakery'
  | 'alchemy'
  | 'townhall'
  | 'tavern';

export type BiomeId = 'meadow' | 'oak_forest' | 'pine_forest' | 'blossom_grove' | 'mountain';

export interface CabinSite {
  id: string;
  name: string;
  x: number;
  z: number;
  rot: number;
  style: CabinStyle;
  isVillage?: boolean;
}

export interface VillageSite {
  seed: number;
  name: string;
  x: number;
  z: number;
  radius: number;
  plazaY: number;
}

export interface CaveSite {
  id: string;
  name: string;
  x: number;
  z: number;
  rot: number;
  floorY: number;
  peakHeight: number;
  crystalColor: number;
}

export interface MiniMountainDef {
  x: number;
  z: number;
  radius: number;
  height: number;
  ridgeAngle: number;
}

// 5 enterable 3D Minecraft-style subterranean block caves descending into the earth across the 2048x4096 valley
export const CAVE_SITES: CaveSite[] = [
  {
    id: 'crystal_cave',
    name: 'Кришталева Печера',
    x: 82,
    z: -62,
    rot: -0.78,
    floorY: -1.15,
    peakHeight: 16.5,
    crystalColor: 0x38bdf8,
  },
  {
    id: 'bear_grotto',
    name: 'Золотий Грот',
    x: -98,
    z: -34,
    rot: 0.95,
    floorY: -1.1,
    peakHeight: 15.0,
    crystalColor: 0xf59e0b,
  },
  {
    id: 'emerald_cave',
    name: 'Смарагдова Печера',
    x: 102,
    z: 92,
    rot: -2.45,
    floorY: -1.1,
    peakHeight: 17.5,
    crystalColor: 0x34d399,
  },
  {
    id: 'north_deepslate_mine',
    name: 'Північна Шахта Глибин',
    x: -310,
    z: -740,
    rot: 0.45,
    floorY: -0.95,
    peakHeight: 19.0,
    crystalColor: 0xa855f7,
  },
  {
    id: 'south_sapphire_cavern',
    name: 'Південна Сапфірова Копальня',
    x: 340,
    z: 820,
    rot: -2.15,
    floorY: -1.0,
    peakHeight: 18.5,
    crystalColor: 0x60a5fa,
  },
];

// Scenic rocky mini-mountains spaced through the valley
export const MINI_MOUNTAINS: MiniMountainDef[] = [
  { x: -94, z: -122, radius: 34, height: 15.5, ridgeAngle: 0.6 },
  { x: 134, z: -12, radius: 30, height: 13.5, ridgeAngle: -0.4 },
  { x: -146, z: 22, radius: 28, height: 12.2, ridgeAngle: 1.1 },
  { x: -380, z: -320, radius: 48, height: 22.0, ridgeAngle: 0.3 },
  { x: 420, z: -560, radius: 52, height: 24.5, ridgeAngle: -0.9 },
  { x: -410, z: 540, radius: 46, height: 21.0, ridgeAngle: 1.4 },
  { x: 480, z: 460, radius: 44, height: 19.5, ridgeAngle: -0.2 },
];

export function riverCenterX(z: number): number {
  return (
    16 +
    Math.sin(z * 0.04) * 9.5 +
    Math.cos(z * 0.018) * 4.5 +
    Math.sin(z * 0.0042) * 34.0
  );
}

export function riverHalfWidthAt(z: number): number {
  return 5.4 + Math.sin(z * 0.08 + 1.2) * 0.7;
}

const BASE_CABIN_SITES: CabinSite[] = [
  { id: 'main', name: 'Мисливська Хатинка', x: -14, z: -22, rot: 0.28, style: 'hunter' },
  { id: 'shop', name: 'Крамниця Мандрівника (Магазин)', x: 38, z: 10, rot: -0.62, style: 'shop' },
  { id: 'north', name: 'Північна Сторожка (Кузня)', x: -46, z: -138, rot: 0.92, style: 'watchtower' },
  { id: 'west', name: 'Лісовий Котедж (Травниця)', x: -124, z: 92, rot: 0.45, style: 'cottage' },
  { id: 'east_tavern', name: 'Східна Корчма «Під Дубом»', x: 184, z: -145, rot: -0.82, style: 'tavern' },
  { id: 'south_cottage', name: 'Південний Хутір', x: -188, z: 310, rot: 0.55, style: 'cottage' },
  { id: 'far_north_watch', name: 'Північний Бастіон', x: 240, z: -680, rot: -0.45, style: 'watchtower' },
  { id: 'far_south_hunter', name: 'Лісничівка Півдня', x: -245, z: 760, rot: 1.15, style: 'hunter' },
];

export const CABIN_SITES: CabinSite[] = [...BASE_CABIN_SITES];

export const VILLAGE_SITE: VillageSite = {
  seed: 42069,
  name: 'Селище Вербове',
  x: -165,
  z: 240,
  radius: 36,
  plazaY: 2.35,
};

function seededHash(seed: number, step: number): number {
  const n = Math.sin(seed * 0.00173 + step * 12.9898) * 43758.5453123;
  return n - Math.floor(n);
}

// Deterministically pick 1 flat meadow site for the Village + populate its 6 inward-facing buildings
export function initializeWorldLayout(seed: number): VillageSite {
  VILLAGE_SITE.seed = seed;
  let chosenX = -155;
  let chosenZ = 210;

  for (let attempt = 0; attempt < 96; attempt++) {
    const u1 = seededHash(seed, attempt * 3 + 1);
    const u2 = seededHash(seed, attempt * 3 + 2);
    const side = seededHash(seed, attempt * 3 + 3) < 0.5 ? -1 : 1;
    const cx = side * (95 + u1 * 430);
    const cz = (u2 - 0.5) * 1650;

    if (Math.hypot(cx + 2, cz - 9) < 130) continue;
    if (Math.hypot(cx - 46, cz + 24) < 85) continue;

    // Must stay clear of the winding river along the full village diameter
    let nearRiver = false;
    for (let dz = -44; dz <= 44; dz += 22) {
      const rx = riverCenterX(cz + dz);
      if (Math.abs(cx - rx) < riverHalfWidthAt(cz + dz) + 52) {
        nearRiver = true;
        break;
      }
    }
    if (nearRiver) continue;

    // Must stay clear of standalone cabins, caves, and mountain peaks
    let blocked = false;
    for (const c of BASE_CABIN_SITES) {
      if (Math.hypot(cx - c.x, cz - c.z) < 75) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      for (const cv of CAVE_SITES) {
        if (Math.hypot(cx - cv.x, cz - cv.z) < 78) {
          blocked = true;
          break;
        }
      }
    }
    if (!blocked) {
      for (const m of MINI_MOUNTAINS) {
        if (Math.hypot(cx - m.x, cz - m.z) < m.radius + 46) {
          blocked = true;
          break;
        }
      }
    }
    if (blocked) continue;

    chosenX = Math.round(cx);
    chosenZ = Math.round(cz);
    break;
  }

  VILLAGE_SITE.x = chosenX;
  VILLAGE_SITE.z = chosenZ;
  VILLAGE_SITE.plazaY = 2.35;

  const villageSpecs: { id: string; name: string; style: CabinStyle; ang: number; dist: number }[] = [
    { id: 'village_hall', name: 'Ратуша Селища Вербове', style: 'townhall', ang: -Math.PI * 0.5, dist: 24.5 },
    { id: 'village_bakery', name: 'Пекарня Галини', style: 'bakery', ang: -Math.PI * 0.16, dist: 24.0 },
    { id: 'village_alchemy', name: 'Алхімічна Лавка Лева', style: 'alchemy', ang: Math.PI * 0.18, dist: 24.0 },
    { id: 'village_tavern', name: 'Селищна Корчма', style: 'tavern', ang: Math.PI * 0.56, dist: 24.5 },
    { id: 'village_watch', name: 'Вартова Вежа Селища', style: 'watchtower', ang: Math.PI * 0.88, dist: 25.0 },
    { id: 'village_cottage', name: 'Садиба Старійшини', style: 'cottage', ang: -Math.PI * 0.84, dist: 24.0 },
  ];

  const vJitter = (seededHash(seed, 999) - 0.5) * 0.45;
  const villageCabins: CabinSite[] = villageSpecs.map((spec) => {
    const a = spec.ang + vJitter;
    const x = chosenX + Math.cos(a) * spec.dist;
    const z = chosenZ + Math.sin(a) * spec.dist;
    // Door faces local +Z; sin(rot), cos(rot) is +Z forward vector -> point toward village square center!
    const rot = Math.atan2(chosenX - x, chosenZ - z);
    return {
      id: spec.id,
      name: spec.name,
      x,
      z,
      rot,
      style: spec.style,
      isVillage: true,
    };
  });

  CABIN_SITES.length = 0;
  CABIN_SITES.push(...BASE_CABIN_SITES, ...villageCabins);
  return VILLAGE_SITE;
}

// Ensure default layout exists at import time
initializeWorldLayout(42069);

export function toCaveLocal(x: number, z: number, site: CaveSite): { lx: number; lz: number } {
  const dx = x - site.x;
  const dz = z - site.z;
  const c = Math.cos(-site.rot);
  const s = Math.sin(-site.rot);
  return {
    lx: dx * c - dz * s,
    lz: dx * s + dz * c,
  };
}

export function fromCaveLocal(lx: number, lz: number, site: CaveSite): { x: number; z: number } {
  const c = Math.cos(site.rot);
  const s = Math.sin(site.rot);
  return {
    x: site.x + lx * c - lz * s,
    z: site.z + lx * s + lz * c,
  };
}

export function mountainRockFactorAt(x: number, z: number): number {
  let best = 0;
  for (const m of MINI_MOUNTAINS) {
    const d = Math.hypot(x - m.x, z - m.z);
    if (d < m.radius) {
      const f = Math.pow(1 - d / m.radius, 1.3);
      if (f > best) best = f;
    }
  }
  for (const site of CAVE_SITES) {
    const { lx, lz } = toCaveLocal(x, z, site);
    // Keep grass green up to the mouth courtyard, rocky mountain surrounding sides & rear
    if (Math.abs(lx) < 5.6 && lz > 6.5) continue;
    const d = Math.hypot(lx, lz + 9.0);
    if (d < 30) {
      const f = Math.pow(1 - d / 30, 1.25);
      if (f > best) best = f;
    }
  }
  return Math.min(1, best * 1.35);
}

export function villagePlazaFactorAt(x: number, z: number): number {
  const d = Math.hypot(x - VILLAGE_SITE.x, z - VILLAGE_SITE.z);
  if (d > 17.5) return 0;
  const t = 1 - Math.max(0, d - 10.5) / 7.0;
  return t * t;
}

export function biomeAt(x: number, z: number): BiomeId {
  if (mountainRockFactorAt(x, z) > 0.36) return 'mountain';
  if (Math.hypot(x - VILLAGE_SITE.x, z - VILLAGE_SITE.z) < 42) return 'meadow';
  if (z < -62 && Math.sin(z * 0.008) < 0.35) return 'pine_forest';
  const meadowNoise =
    Math.sin(x * 0.021 + 0.7) * Math.cos(z * 0.021 - 0.4) +
    0.55 * Math.sin((x - z) * 0.015);
  if (
    Math.hypot(x + 8, z - 4) < 34 ||
    Math.hypot(x + 124, z - 92) < 32 ||
    meadowNoise > 0.38
  ) {
    return 'meadow';
  }
  if ((x > 28 && z > 20 && meadowNoise > -0.1) || (z > 280 && meadowNoise > -0.18)) {
    return 'blossom_grove';
  }
  return 'oak_forest';
}

// Smooth open-world heightmap: dry meadows NEVER dip below WATER_LEVEL (-0.35), water channel strictly localized
export function groundHeightAt(x: number, z: number): number {
  const hills =
    Math.sin(x * 0.022) * Math.cos(z * 0.02) * 1.45 +
    Math.sin(x * 0.056 + 1.4) * Math.sin(z * 0.052 + 0.5) * 0.42 +
    Math.cos((x + z) * 0.014) * 0.82;

  const flattenAt = (cx: number, cz: number, innerR: number, blendR: number) => {
    const d = Math.hypot(x - cx, z - cz);
    if (d >= innerR + blendR) return 0;
    const t = Math.max(0, 1 - Math.max(0, d - innerR) / blendR);
    return t * t * (3 - 2 * t);
  };

  let flatFactor = 1.0;
  for (const site of CABIN_SITES) {
    flatFactor *= 1 - 0.9 * flattenAt(site.x, site.z, 7.5, 11.5);
  }
  const spawnFlatten = flattenAt(-2, 9, 8, 12);
  const ruinsFlatten = flattenAt(46, -24, 10, 12);
  const westCampFlatten = flattenAt(-62, 42, 9, 12);
  const northValleyFlatten = flattenAt(-14, -92, 10, 14);
  const eastBastionFlatten = flattenAt(84, 46, 10, 14);
  const villageFlatten = flattenAt(VILLAGE_SITE.x, VILLAGE_SITE.z, 34, 18);

  // Positive dry baseline (+2.35m) keeps every meadow strictly above river level (WATER_LEVEL = -0.35)
  let h =
    2.35 +
    hills *
      flatFactor *
      (1 - 0.72 * spawnFlatten) *
      (1 - 0.78 * ruinsFlatten) *
      (1 - 0.75 * westCampFlatten) *
      (1 - 0.72 * northValleyFlatten) *
      (1 - 0.8 * eastBastionFlatten);

  if (ruinsFlatten > 0) {
    h = h * (1 - ruinsFlatten * 0.45) + 1.85 * (ruinsFlatten * 0.45);
  }
  if (eastBastionFlatten > 0) {
    h = h * (1 - eastBastionFlatten * 0.45) + 2.2 * (eastBastionFlatten * 0.45);
  }
  if (villageFlatten > 0) {
    h = h * (1 - villageFlatten) + VILLAGE_SITE.plazaY * villageFlatten;
  }

  // Sculpted mini-mountains with craggy ridges
  for (const m of MINI_MOUNTAINS) {
    const dx = x - m.x;
    const dz = z - m.z;
    const dist = Math.hypot(dx, dz);
    if (dist < m.radius) {
      const t = 1 - dist / m.radius;
      const smooth = t * t * (3 - 2 * t);
      const ang = Math.atan2(dz, dx) - m.ridgeAngle;
      const ridge = 1.0 + 0.22 * Math.sin(ang * 3) + 0.14 * Math.cos(ang * 5);
      h += smooth * m.height * ridge;
    }
  }

  // Horseshoe rocky hillsides housing the 5 subterranean caves + wide descending entrance trench
  for (const site of CAVE_SITES) {
    const { lx, lz } = toCaveLocal(x, z, site);
    const absX = Math.abs(lx);

    // Flatten courtyard ahead of mouth (lz in [6, 16]) to clean valley level ~2.35 so mouth never floats or sinks
    const frontFlat = flattenAt(site.x, site.z, 12, 10);
    if (frontFlat > 0 && lz > 5.0) {
      h = h * (1 - frontFlat * 0.65) + 2.35 * (frontFlat * 0.65);
    }

    // Surrounding mountain peaks behind and beside the cavern (strictly cleared from the entrance approach!)
    const peakDist = Math.hypot(lx * 0.9, lz + 9.2);
    if (peakDist < 32) {
      const t = 1 - peakDist / 32;
      const smooth = t * t * (3 - 2 * t);
      const ang = Math.atan2(lz + 9.2, lx);
      const crag = 1.0 + 0.16 * Math.sin(ang * 4) + 0.08 * Math.cos(peakDist * 0.45);
      // Attenuate mountain bulge cleanly across front approach (lz > 4.5, |lx| < 9)
      const mouthClearX = absX < 9.5 ? Math.max(0, Math.min(1, (absX - 4.8) / 4.7)) : 1.0;
      const mouthClearZ = lz > 4.0 ? Math.max(0, Math.min(1, (10.5 - lz) / 6.5)) : 1.0;
      const hillMask = Math.max(mouthClearX, 1.0 - (1.0 - mouthClearZ) * (1.0 - mouthClearX));
      h += smooth * site.peakHeight * crag * hillMask;
    }

    // Wide open entrance & descending subterranean trench (|lx| <= 5.4, lz in [-12.5 .. +13.5])
    if (absX < 7.2 && lz > -13.2 && lz < 14.0) {
      const fx = Math.max(0, Math.min(1, (7.2 - absX) / 2.2));
      const fzFront = Math.max(0, Math.min(1, (14.0 - lz) / 3.8));
      const fzBack = Math.max(0, Math.min(1, (lz + 13.2) / 2.2));
      const carve = Math.min(fx, fzFront, fzBack);
      const smoothCarve = carve * carve * (3 - 2 * carve);

      // Smooth descending ramp from mouth (lz = +8.5 -> 2.35m) down underground into deep chamber (lz = 0 -> floorY)
      const rampT = Math.max(0, Math.min(1, (lz - 0.0) / 8.5));
      const targetTunnelY = site.floorY + rampT * (2.35 - site.floorY) - 0.12;
      h = h * (1 - smoothCarve) + targetTunnelY * smoothCarve;
    }
  }

  // Localized River channel carving — smooth grassy banks sloping cleanly into the riverbed
  const rX = riverCenterX(z);
  const rW = riverHalfWidthAt(z);
  const distToRiver = Math.abs(x - rX);
  if (distToRiver < rW + 4.8) {
    const bankLevel = Math.max(0.72, h);
    const t = Math.max(0, Math.min(1, (distToRiver - rW * 0.62) / (rW * 0.38 + 4.8)));
    const smooth = t * t * (3 - 2 * t);
    const bedDepth = -2.05 + Math.sin(z * 0.15) * 0.14;
    h = bedDepth * (1 - smooth) + bankLevel * smooth;
  } else {
    h = Math.max(h, 0.58);
  }

  // Outer perimeter mountain ridge framing the 2048x4096 open world
  const edgeX = Math.max(0, Math.abs(x) - (WORLD_HALF_X - 28));
  const edgeZ = Math.max(0, Math.abs(z) - (WORLD_HALF_Z - 28));
  const edgeD = Math.max(edgeX, edgeZ);
  if (edgeD > 0) {
    const rim = Math.min(2.2, edgeD / 36);
    const noise = 1.0 + 0.25 * Math.sin(x * 0.04 + z * 0.03);
    h += rim * rim * 26 * noise;
  }

  return h;
}

export function cabinBaseY(site: CabinSite = CABIN_SITES[0]): number {
  return groundHeightAt(site.x, site.z) - 0.15;
}

export function cabinFloorY(site: CabinSite = CABIN_SITES[0]): number {
  return cabinBaseY(site) + 0.82;
}

export function toCabinLocal(
  x: number,
  z: number,
  site: CabinSite = CABIN_SITES[0],
): { lx: number; lz: number } {
  const dx = x - site.x;
  const dz = z - site.z;
  const c = Math.cos(-site.rot);
  const s = Math.sin(-site.rot);
  return {
    lx: dx * c - dz * s,
    lz: dx * s + dz * c,
  };
}

export function fromCabinLocal(
  lx: number,
  lz: number,
  site: CabinSite = CABIN_SITES[0],
): { x: number; z: number } {
  const c = Math.cos(site.rot);
  const s = Math.sin(site.rot);
  return {
    x: site.x + lx * c - lz * s,
    z: site.z + lx * s + lz * c,
  };
}

export function findInsideCabin(x: number, z: number): CabinSite | null {
  for (const site of CABIN_SITES) {
    const { lx, lz } = toCabinLocal(x, z, site);
    const insideShell =
      Math.abs(lx) < CABIN_HALF_W + 0.15 && lz > -CABIN_HALF_D - 0.1 && lz < CABIN_HALF_D + 0.35;
    const onDoorThreshold =
      Math.abs(lx) < 1.85 && lz >= CABIN_HALF_D + 0.35 && lz <= CABIN_HALF_D + 1.85;
    if (insideShell || onDoorThreshold) {
      return site;
    }
  }
  return null;
}

export function findInsideCave(x: number, z: number): CaveSite | null {
  for (const site of CAVE_SITES) {
    const { lx, lz } = toCaveLocal(x, z, site);
    if (Math.abs(lx) < 4.4 && lz > -10.8 && lz < 5.6) {
      return site;
    }
  }
  return null;
}

export function isInsideCabin(x: number, z: number): boolean {
  return findInsideCabin(x, z) !== null;
}

export function nearAnyCabin(x: number, z: number, margin: number): boolean {
  for (const site of CABIN_SITES) {
    if (Math.hypot(x - site.x, z - site.z) < margin) return true;
  }
  return false;
}

export function nearAnyCave(x: number, z: number, margin: number): boolean {
  for (const site of CAVE_SITES) {
    if (Math.hypot(x - site.x, z - site.z) < margin) return true;
    const { lx, lz } = toCaveLocal(x, z, site);
    if (Math.abs(lx) < 7.2 && lz > -13 && lz < 15.5) return true;
  }
  return false;
}

export function nearVillage(x: number, z: number, margin = 38): boolean {
  return Math.hypot(x - VILLAGE_SITE.x, z - VILLAGE_SITE.z) < margin;
}

export function resolveWorldBounds(x: number, z: number, radius = 0.6): [number, number] {
  const maxX = WORLD_HALF_X - 8 - radius;
  const maxZ = WORLD_HALF_Z - 8 - radius;
  return [Math.max(-maxX, Math.min(maxX, x)), Math.max(-maxZ, Math.min(maxZ, z))];
}

function pushOutOfBoxes(
  rx: number,
  rz: number,
  radius: number,
  boxes: [number, number, number, number][],
): [number, number] {
  let outX = rx;
  let outZ = rz;
  for (const [minX, maxX, minZ, maxZ] of boxes) {
    const closestX = Math.max(minX, Math.min(outX, maxX));
    const closestZ = Math.max(minZ, Math.min(outZ, maxZ));
    const dx = outX - closestX;
    const dz = outZ - closestZ;
    const dSq = dx * dx + dz * dz;
    if (dSq < radius * radius) {
      const d = Math.sqrt(dSq);
      if (d > 0.0001) {
        const push = radius - d;
        outX += (dx / d) * push;
        outZ += (dz / d) * push;
      } else {
        const dl = Math.abs(outX - minX);
        const dr = Math.abs(maxX - outX);
        const db = Math.abs(outZ - minZ);
        const dt = Math.abs(maxZ - outZ);
        const m = Math.min(dl, dr, db, dt);
        if (m === dl) outX = minX - radius;
        else if (m === dr) outX = maxX + radius;
        else if (m === db) outZ = minZ - radius;
        else outZ = maxZ + radius;
      }
    }
  }
  return [outX, outZ];
}

// Resolve walls for every house while keeping the wide 2.7m front doorway clean
export function resolveCabinCollision(x: number, z: number, radius: number): [number, number] {
  let outX = x;
  let outZ = z;

  const shellWalls: [number, number, number, number][] = [
    [-CABIN_HALF_W - 0.35, -CABIN_HALF_W + 0.35, -CABIN_HALF_D - 0.3, CABIN_HALF_D + 0.3],
    [CABIN_HALF_W - 0.35, CABIN_HALF_W + 0.35, -CABIN_HALF_D - 0.3, CABIN_HALF_D + 0.3],
    [-CABIN_HALF_W - 0.3, CABIN_HALF_W + 0.3, -CABIN_HALF_D - 0.35, -CABIN_HALF_D + 0.35],
    [-CABIN_HALF_W - 0.3, -1.35, CABIN_HALF_D - 0.32, CABIN_HALF_D + 0.32],
    [1.35, CABIN_HALF_W + 0.3, CABIN_HALF_D - 0.32, CABIN_HALF_D + 0.32],
  ];

  const standardFurniture: [number, number, number, number][] = [
    [-3.5, -1.9, -1.6, 0.3], // workbench
    [1.5, 3.6, -2.9, -1.4], // bed
    [-3.5, -1.8, -3.0, -2.0], // bookshelf
    [-3.5, -2.1, 1.35, 2.55], // indoor chest
    [1.85, 3.05, 0.5, 1.7], // dining table
  ];

  const counterFurniture: [number, number, number, number][] = [
    [-1.85, 2.15, -1.65, -0.55], // trade counter
    [-3.5, -2.15, -2.8, 0.45], // display shelves
    [-3.5, -2.1, 1.35, 2.55], // indoor chest
    [2.25, 3.55, 0.5, 2.25], // trade crates / ovens
  ];

  for (const site of CABIN_SITES) {
    const { lx, lz } = toCabinLocal(outX, outZ, site);
    if (
      Math.abs(lx) > CABIN_HALF_W + 1.5 ||
      lz < -CABIN_HALF_D - 1.5 ||
      lz > CABIN_HALF_D + 1.5
    ) {
      continue;
    }

    const isMerchantHouse =
      site.style === 'shop' || site.style === 'bakery' || site.style === 'alchemy';
    const furniture = isMerchantHouse ? counterFurniture : standardFurniture;
    const [rx, rz] = pushOutOfBoxes(lx, lz, radius, [...shellWalls, ...furniture]);
    const world = fromCabinLocal(rx, rz, site);
    outX = world.x;
    outZ = world.z;
  }

  return [outX, outZ];
}

// Resolve thick subterranean rock walls while keeping the wide [-3.4, +3.4] descending entrance 100% open
export function resolveCaveCollision(x: number, z: number, radius: number): [number, number] {
  let outX = x;
  let outZ = z;

  const caveWalls: [number, number, number, number][] = [
    [-6.8, -3.9, -11.4, 6.2], // left cavern & stair wall
    [3.9, 6.8, -11.4, 6.2], // right cavern & stair wall
    [-6.8, 6.8, -11.6, -9.6], // deep back cavern wall
    [-6.8, -3.35, 4.4, 6.2], // left portal pillar
    [3.35, 6.8, 4.4, 6.2], // right portal pillar
  ];

  for (const site of CAVE_SITES) {
    const { lx, lz } = toCaveLocal(outX, outZ, site);
    if (Math.abs(lx) > 8.8 || lz < -13.0 || lz > 8.0) {
      continue;
    }
    const [rx, rz] = pushOutOfBoxes(lx, lz, radius, caveWalls);
    const world = fromCaveLocal(rx, rz, site);
    outX = world.x;
    outZ = world.z;
  }

  return [outX, outZ];
}

export function bridgeSurfaceAt(x: number, z: number): number | null {
  const bxCenter = riverCenterX(BRIDGE_Z);
  const dx = x - bxCenter;
  const dz = z - BRIDGE_Z;
  if (Math.abs(dz) > BRIDGE_HALF_WIDTH || Math.abs(dx) > BRIDGE_HALF_LENGTH) {
    return null;
  }
  const u = dx / BRIDGE_HALF_LENGTH;
  const arch = Math.cos(u * Math.PI * 0.5) * 1.75;
  const bankH = 0.85;
  return bankH + arch;
}

export function walkableHeightAt(x: number, z: number, currentY?: number): number {
  const terrainY = groundHeightAt(x, z);

  for (const site of CABIN_SITES) {
    const { lx, lz } = toCabinLocal(x, z, site);
    if (
      Math.abs(lx) > CABIN_HALF_W + 1.2 ||
      lz < -CABIN_HALF_D - 0.5 ||
      lz > CABIN_HALF_D + 3.2
    ) {
      continue;
    }
    const floorY = cabinFloorY(site);
    if (Math.abs(lx) <= CABIN_HALF_W && lz >= -CABIN_HALF_D && lz <= CABIN_HALF_D + 1.55) {
      return Math.max(terrainY, floorY);
    }
    if (Math.abs(lx) <= 2.15 && lz > CABIN_HALF_D + 1.55 && lz <= CABIN_HALF_D + 2.85) {
      const t = Math.max(0, Math.min(1, (CABIN_HALF_D + 2.85 - lz) / 1.3));
      return Math.max(terrainY, terrainY * (1 - t) + floorY * t);
    }
  }

  for (const site of CAVE_SITES) {
    const { lx, lz } = toCaveLocal(x, z, site);
    if (Math.abs(lx) <= 4.1 && lz >= -10.2 && lz <= 8.8) {
      // Smooth ramp matching descending stone steps from valley courtyard (lz=8.5, 2.35m) into deep cavern (lz<=0, floorY)
      const rampT = Math.max(0, Math.min(1, (lz - 0.0) / 8.5));
      const caveWalkY = site.floorY + rampT * (2.35 - site.floorY);
      if (currentY === undefined || currentY <= caveWalkY + 3.4) {
        return caveWalkY;
      }
    }
  }

  const bridgeY = bridgeSurfaceAt(x, z);
  if (bridgeY !== null) {
    if (currentY === undefined || currentY >= bridgeY - 1.15) {
      return Math.max(terrainY, bridgeY);
    }
  }
  return terrainY;
}

export function getZoneName(x: number, z: number): string {
  const inside = findInsideCabin(x, z);
  if (inside) return `Усередині: ${inside.name}`;
  const insideCave = findInsideCave(x, z);
  if (insideCave) return `Печера: ${insideCave.name}`;
  for (const site of CABIN_SITES) {
    if (Math.hypot(x - site.x, z - site.z) < 13) return site.name;
  }
  if (Math.hypot(x - VILLAGE_SITE.x, z - VILLAGE_SITE.z) < 44) {
    return VILLAGE_SITE.name;
  }
  for (const site of CAVE_SITES) {
    if (Math.hypot(x - site.x, z - site.z) < 16) return `Вхід: ${site.name}`;
  }
  const bx = riverCenterX(BRIDGE_Z);
  if (Math.hypot(x - bx, z - BRIDGE_Z) < 11) return 'Арковий Міст';
  if (Math.hypot(x - 46, z + 24) < 18) return 'Кам’яні Руїни';
  if (Math.hypot(x + 62, z - 42) < 22) return 'Табір Лісорубів';
  if (Math.hypot(x + 14, z + 92) < 24) return 'Північний Бір';
  if (Math.hypot(x - 84, z - 46) < 24) return 'Східне Нагір’я';

  const b = biomeAt(x, z);
  if (z < -600) return 'Північні Верховини';
  if (z > 600) return 'Південна Долина';
  if (b === 'blossom_grove') return 'Квітковий Гай';
  if (b === 'oak_forest') return 'Дубовий Ліс';
  if (b === 'pine_forest') return 'Хвойний Бір';
  if (b === 'mountain') return 'Гірський Схил';
  return 'Сонячна Галявина';
}
