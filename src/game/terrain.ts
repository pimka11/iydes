// Expanded world constants: large open forest valley + winding river + arched bridge + new landmarks
export const WORLD_PLAYABLE_RADIUS = 150;
export const WORLD_TERRAIN_SIZE = 390;
export const WATER_LEVEL = -0.35;

// Bridge placement: crosses the river near z = -10
export const BRIDGE_Z = -10;
export const BRIDGE_HALF_WIDTH = 2.4;
export const BRIDGE_HALF_LENGTH = 9.2;

// Enterable cabin constants (facing +Z with slight picturesque angle)
export const CABIN_X = -14;
export const CABIN_Z = -22;
export const CABIN_ROT = 0.28;
export const CABIN_HALF_W = 3.9;
export const CABIN_HALF_D = 3.2;

export function riverCenterX(z: number): number {
  return 16 + Math.sin(z * 0.045) * 7.5 + Math.cos(z * 0.022) * 3.0;
}

export function riverHalfWidthAt(z: number): number {
  return 5.4 + Math.sin(z * 0.08 + 1.2) * 0.7;
}

// Smooth deterministic terrain heightmap
export function groundHeightAt(x: number, z: number): number {
  const hills =
    Math.sin(x * 0.032) * Math.cos(z * 0.028) * 1.85 +
    Math.sin(x * 0.075 + 1.4) * Math.sin(z * 0.068 + 0.5) * 0.65 +
    Math.cos((x + z) * 0.02) * 1.1;

  // Flatten slightly around cabin (-14, -22), spawn (-2, 9), ruins (46, -24), west camp (-62, 42), north valley (-14, -92), east bastion (84, 46)
  const flattenAt = (cx: number, cz: number, innerR: number, blendR: number) => {
    const d = Math.hypot(x - cx, z - cz);
    return Math.max(0, 1 - Math.max(0, d - innerR) / blendR);
  };

  const cabinFlatten = flattenAt(CABIN_X, CABIN_Z, 7, 10);
  const spawnFlatten = flattenAt(-2, 9, 6, 10);
  const ruinsFlatten = flattenAt(46, -24, 10, 12);
  const westCampFlatten = flattenAt(-62, 42, 9, 12);
  const northValleyFlatten = flattenAt(-14, -92, 10, 14);
  const eastBastionFlatten = flattenAt(84, 46, 10, 14);

  let h =
    hills *
      (1 - 0.88 * cabinFlatten) *
      (1 - 0.68 * spawnFlatten) *
      (1 - 0.78 * ruinsFlatten) *
      (1 - 0.75 * westCampFlatten) *
      (1 - 0.72 * northValleyFlatten) *
      (1 - 0.8 * eastBastionFlatten) +
    0.55;

  if (ruinsFlatten > 0) {
    h = h * (1 - ruinsFlatten * 0.4) + 1.1 * (ruinsFlatten * 0.4);
  }
  if (eastBastionFlatten > 0) {
    h = h * (1 - eastBastionFlatten * 0.45) + 1.65 * (eastBastionFlatten * 0.45);
  }

  // River channel carving
  const rX = riverCenterX(z);
  const rW = riverHalfWidthAt(z);
  const distToRiver = Math.abs(x - rX);
  if (distToRiver < rW + 4.5) {
    const t = Math.max(0, Math.min(1, (distToRiver - rW * 0.48) / (rW * 0.52 + 4.5)));
    const smooth = t * t * (3 - 2 * t);
    const bedDepth = -2.05 + Math.sin(z * 0.15) * 0.15;
    h = bedDepth * (1 - smooth) + h * smooth;
  }

  // Outer natural mountain ring beyond expanded playable radius
  const radial = Math.hypot(x, z);
  if (radial > WORLD_PLAYABLE_RADIUS - 10) {
    const rim = (radial - (WORLD_PLAYABLE_RADIUS - 10)) / 42;
    const mountainNoise =
      1.0 + 0.35 * Math.sin(Math.atan2(z, x) * 7) + 0.22 * Math.cos(Math.atan2(z, x) * 13);
    h += rim * rim * 26 * mountainNoise;
  }

  return h;
}

export function cabinBaseY(): number {
  return groundHeightAt(CABIN_X, CABIN_Z) - 0.15;
}

export function cabinFloorY(): number {
  return cabinBaseY() + 0.82;
}

export function toCabinLocal(x: number, z: number): { lx: number; lz: number } {
  const dx = x - CABIN_X;
  const dz = z - CABIN_Z;
  const c = Math.cos(-CABIN_ROT);
  const s = Math.sin(-CABIN_ROT);
  return {
    lx: dx * c - dz * s,
    lz: dx * s + dz * c,
  };
}

export function fromCabinLocal(lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(CABIN_ROT);
  const s = Math.sin(CABIN_ROT);
  return {
    x: CABIN_X + lx * c - lz * s,
    z: CABIN_Z + lx * s + lz * c,
  };
}

export function isInsideCabin(x: number, z: number): boolean {
  const { lx, lz } = toCabinLocal(x, z);
  return Math.abs(lx) < CABIN_HALF_W - 0.15 && lz > -CABIN_HALF_D + 0.15 && lz < CABIN_HALF_D - 0.15;
}

// Resolve cabin walls while keeping the front doorway (|lx| < 1.25 at lz ~ +3.2) completely open!
export function resolveCabinCollision(x: number, z: number, radius: number): [number, number] {
  const { lx, lz } = toCabinLocal(x, z);
  // Quick bounding check
  if (Math.abs(lx) > CABIN_HALF_W + 1.5 || lz < -CABIN_HALF_D - 1.5 || lz > CABIN_HALF_D + 1.5) {
    return [x, z];
  }

  let rx = lx;
  let rz = lz;

  // Wall segments in cabin-local space: [minX, maxX, minZ, maxZ]
  const walls: [number, number, number, number][] = [
    [-CABIN_HALF_W - 0.35, -CABIN_HALF_W + 0.35, -CABIN_HALF_D - 0.3, CABIN_HALF_D + 0.3], // Left wall
    [CABIN_HALF_W - 0.35, CABIN_HALF_W + 0.35, -CABIN_HALF_D - 0.3, CABIN_HALF_D + 0.3], // Right wall
    [-CABIN_HALF_W - 0.3, CABIN_HALF_W + 0.3, -CABIN_HALF_D - 0.35, -CABIN_HALF_D + 0.35], // Back wall
    [-CABIN_HALF_W - 0.3, -1.25, CABIN_HALF_D - 0.35, CABIN_HALF_D + 0.35], // Front-left wall
    [1.25, CABIN_HALF_W + 0.3, CABIN_HALF_D - 0.35, CABIN_HALF_D + 0.35], // Front-right wall
    // Interior furniture colliders (workbench on left, bed back-right, table right)
    [-3.5, -1.9, -1.6, 0.3],
    [1.5, 3.6, -2.9, -1.4],
  ];

  for (const [minX, maxX, minZ, maxZ] of walls) {
    const closestX = Math.max(minX, Math.min(rx, maxX));
    const closestZ = Math.max(minZ, Math.min(rz, maxZ));
    const dx = rx - closestX;
    const dz = rz - closestZ;
    const dSq = dx * dx + dz * dz;
    if (dSq < radius * radius) {
      const d = Math.sqrt(dSq);
      if (d > 0.0001) {
        const push = radius - d;
        rx += (dx / d) * push;
        rz += (dz / d) * push;
      } else {
        // Push out along shallowest axis if center is inside box
        const dl = Math.abs(rx - minX);
        const dr = Math.abs(maxX - rx);
        const db = Math.abs(rz - minZ);
        const dt = Math.abs(maxZ - rz);
        const m = Math.min(dl, dr, db, dt);
        if (m === dl) rx = minX - radius;
        else if (m === dr) rx = maxX + radius;
        else if (m === db) rz = minZ - radius;
        else rz = maxZ + radius;
      }
    }
  }

  const world = fromCabinLocal(rx, rz);
  return [world.x, world.z];
}

// Arched bridge deck height at (x, z) if standing over the bridge span
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

// Effective walkable surface height (accounts for bridge deck AND cabin porch/interior floor)
export function walkableHeightAt(x: number, z: number, currentY?: number): number {
  const terrainY = groundHeightAt(x, z);

  // Cabin interior + porch steps
  const { lx, lz } = toCabinLocal(x, z);
  const floorY = cabinFloorY();
  if (Math.abs(lx) <= CABIN_HALF_W && lz >= -CABIN_HALF_D && lz <= CABIN_HALF_D + 1.55) {
    return Math.max(terrainY, floorY);
  }
  // Smooth front porch ramp/steps from lz = 4.75..5.8
  if (Math.abs(lx) <= 2.1 && lz > CABIN_HALF_D + 1.55 && lz <= CABIN_HALF_D + 2.75) {
    const t = Math.max(0, Math.min(1, (CABIN_HALF_D + 2.75 - lz) / 1.2));
    return Math.max(terrainY, terrainY * (1 - t) + floorY * t);
  }

  const bridgeY = bridgeSurfaceAt(x, z);
  if (bridgeY !== null) {
    if (currentY === undefined || currentY >= bridgeY - 1.15) {
      return Math.max(terrainY, bridgeY);
    }
  }
  return terrainY;
}

// Extended dirt trails connecting cabin -> spawn -> bridge -> ruins, plus western camp & eastern highland
export function trailFactorAt(x: number, z: number): number {
  const segments: [number, number, number, number][] = [
    [-12, -16, -2, 8],
    [-2, 8, riverCenterX(BRIDGE_Z) - BRIDGE_HALF_LENGTH, BRIDGE_Z],
    [riverCenterX(BRIDGE_Z) + BRIDGE_HALF_LENGTH, BRIDGE_Z, 44, -22],
    [-2, 8, -58, 40],
    [44, -22, 82, 44],
    [-12, -18, -14, -84],
  ];
  let minDist = 999;
  for (const [ax, az, bx, bz] of segments) {
    const vx = bx - ax;
    const vz = bz - az;
    const wx = x - ax;
    const wz = z - az;
    const lenSq = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / lenSq));
    const px = ax + vx * t;
    const pz = az + vz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < minDist) minDist = d;
  }
  const trailWidth = 2.6;
  if (minDist > trailWidth) return 0;
  const n = 1 - minDist / trailWidth;
  return n * n;
}

export function getZoneName(x: number, z: number): string {
  if (isInsideCabin(x, z)) return 'Усередині Хатинки';
  const bx = riverCenterX(BRIDGE_Z);
  if (Math.hypot(x - bx, z - BRIDGE_Z) < 11) return 'Арковий Міст';
  if (Math.hypot(x - CABIN_X, z - CABIN_Z) < 15) return 'Мисливська Хатинка';
  if (Math.hypot(x - 46, z + 24) < 18) return 'Кам’яні Руїни';
  if (Math.hypot(x + 62, z - 42) < 22) return 'Табір Лісорубів';
  if (Math.hypot(x + 14, z + 92) < 24) return 'Північний Бір';
  if (Math.hypot(x - 84, z - 46) < 24) return 'Східне Нагір’я';
  if (x > riverCenterX(z) + 4) return 'Східний Берег';
  return 'Сонячна Галявина';
}
