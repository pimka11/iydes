import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  groundHeightAt,
  nearAnyCabin,
  riverCenterX,
  riverHalfWidthAt,
  trailFactorAt,
  WATER_LEVEL,
  WORLD_PLAYABLE_RADIUS,
  WORLD_TERRAIN_SIZE,
} from './terrain';
import { ProceduralTextures } from './textures';

export interface ObstacleCollider {
  x: number;
  z: number;
  radius: number;
}

export interface WorldEnvironment {
  group: THREE.Group;
  colliders: ObstacleCollider[];
  update: (elapsed: number, dt: number) => void;
  dispose: () => void;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildMultiBladeTuftGeometry(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  const angles = [0, 0.88, 1.85, 2.72, 3.68];
  const offsets: [number, number][] = [
    [0, 0],
    [-0.18, 0.12],
    [0.19, -0.1],
    [-0.1, -0.18],
    [0.14, 0.17],
  ];

  for (let i = 0; i < 5; i++) {
    const g = new THREE.BufferGeometry();
    const h = 1.05 + (i % 3) * 0.28;
    const w = 0.085;
    const lean = 0.14 + (i % 3) * 0.055;
    const verts = new Float32Array([
      -w, 0, 0,
       w, 0, 0,
       w * 0.56, h * 0.55, lean * 0.35,
      -w * 0.56, h * 0.55, lean * 0.35,
       0, h, lean,
    ]);
    const cols = new Float32Array([
      0.2, 0.34, 0.11,
      0.2, 0.34, 0.11,
      0.54, 0.72, 0.23,
      0.54, 0.72, 0.23,
      0.86, 0.96, 0.42,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 4]);
    g.rotateY(angles[i]);
    g.translate(offsets[i][0], 0, offsets[i][1]);
    g.computeVertexNormals();
    blades.push(g);
  }

  const merged = mergeGeometries(blades, false);
  blades.forEach((b) => b.dispose());
  return merged;
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

  const flare = new THREE.CylinderGeometry(0.42, 0.78, 1.0, 7);
  flare.translate(0, 0.5, 0);
  woodParts.push(flare);

  const trunk = new THREE.CylinderGeometry(0.16, 0.44, 6.0, 7, 4);
  trunk.translate(0, 3.0, 0);
  const tPos = trunk.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const y = tPos.getY(i);
    tPos.setX(i, tPos.getX(i) + Math.sin(y * 0.48) * 0.16);
    tPos.setZ(i, tPos.getZ(i) + Math.cos(y * 0.42) * 0.1);
  }
  trunk.computeVertexNormals();
  woodParts.push(trunk);

  const branchCenters: THREE.Vector3[] = [new THREE.Vector3(0.08, 8.15, 0.05)];
  for (let b = 0; b < 5; b++) {
    const yaw = (b / 5) * Math.PI * 2 + 0.35;
    const startY = 3.45 + (b % 3) * 0.62;
    const len = 2.75 + (b % 2) * 0.55;
    const tilt = 0.72 + (b % 2) * 0.14;

    const limb = new THREE.CylinderGeometry(0.055, 0.155, len, 5);
    limb.translate(0, len * 0.5, 0);
    limb.rotateZ(-tilt);
    limb.rotateY(yaw);
    limb.translate(0, startY, 0);
    woodParts.push(limb);

    const reach = Math.sin(tilt) * len;
    const tipX = Math.cos(yaw) * reach;
    const tipZ = -Math.sin(yaw) * reach;
    const tipY = startY + Math.cos(tilt) * len;
    branchCenters.push(new THREE.Vector3(tipX, tipY + 0.35, tipZ));

    const twigLen = 1.65;
    const twig = new THREE.CylinderGeometry(0.028, 0.065, twigLen, 4);
    twig.translate(0, twigLen * 0.5, 0);
    twig.rotateZ(-0.48);
    twig.rotateY(yaw + 0.65);
    twig.translate(tipX * 0.65, startY + (tipY - startY) * 0.62, tipZ * 0.65);
    woodParts.push(twig);
  }

  const woodGeo = mergeGeometries(woodParts, false);
  woodParts.forEach((p) => p.dispose());

  const leafCards: THREE.BufferGeometry[] = [];
  const cardAngles: [number, number, number, number][] = [
    [0.25, 0, 0.15, 3.3],
    [-0.35, 1.05, -0.2, 3.0],
    [0.42, 2.1, 0.25, 3.1],
    [-0.22, 0.55, 0.88, 2.8],
  ];

  branchCenters.forEach((center, cIdx) => {
    const scaleBias = cIdx === 0 ? 1.18 : 0.94 + (cIdx % 2) * 0.12;
    cardAngles.forEach(([rx, ry, rz, baseSize], cardIdx) => {
      const sz = baseSize * scaleBias;
      const plane = new THREE.PlaneGeometry(sz, sz, 2, 2);
      const pAttr = plane.attributes.position;
      const cols = new Float32Array(pAttr.count * 3);

      for (let v = 0; v < pAttr.count; v++) {
        const vx = pAttr.getX(v);
        const vy = pAttr.getY(v);
        const r2 = (vx * vx + vy * vy) / (sz * sz);
        pAttr.setZ(v, (0.25 - r2) * 0.72);

        const bright = Math.max(0.55, Math.min(1.08, 0.74 + vy / (sz * 1.8) + (cIdx === 0 ? 0.12 : 0)));
        cols[v * 3] = bright * 0.96;
        cols[v * 3 + 1] = bright * 1.02;
        cols[v * 3 + 2] = bright * 0.88;
      }

      plane.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      plane.rotateX(rx + (cardIdx % 2) * 0.22);
      plane.rotateY(ry + cIdx * 0.85);
      plane.rotateZ(rz);
      plane.translate(
        center.x + (cardIdx - 1.5) * 0.24,
        center.y + (cardIdx === 0 ? 0.3 : -0.15),
        center.z + ((cardIdx % 2) - 0.5) * 0.28,
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
  const trunk = new THREE.CylinderGeometry(0.11, 0.42, 9.6, 7);
  trunk.translate(0, 4.8, 0);

  const boughs: THREE.BufferGeometry[] = [];
  const tiers = 5;
  for (let t = 0; t < tiers; t++) {
    const frac = t / (tiers - 1);
    const y = 3.2 + frac * 5.6;
    const size = (1 - frac * 0.62) * 3.4;
    const whorlCount = t === tiers - 1 ? 3 : 4;
    for (let w = 0; w < whorlCount; w++) {
      const yaw = (w / whorlCount) * Math.PI * 2 + t * 0.55;
      const card = new THREE.PlaneGeometry(size, size * 1.15, 1, 2);
      card.translate(0, size * 0.45, 0);
      const pAttr = card.attributes.position;
      const cols = new Float32Array(pAttr.count * 3);
      for (let v = 0; v < pAttr.count; v++) {
        const b = 0.58 + (pAttr.getY(v) / (size * 1.15)) * 0.44;
        cols[v * 3] = b * 0.9;
        cols[v * 3 + 1] = b * 1.02;
        cols[v * 3 + 2] = b * 0.88;
      }
      card.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      card.rotateX(0.92 + frac * 0.14);
      card.rotateY(yaw);
      card.translate(0, y, 0);
      card.computeVertexNormals();
      boughs.push(card);
    }
  }
  const pineCanopyGeo = mergeGeometries(boughs, false);
  boughs.forEach((b) => b.dispose());
  return { pineWoodGeo: trunk, pineCanopyGeo };
}

function buildFernBushGeometry(): THREE.BufferGeometry {
  const fronds: THREE.BufferGeometry[] = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const yaw = (i / count) * Math.PI * 2 + (i % 2) * 0.2;
    const frond = new THREE.PlaneGeometry(0.95, 1.35, 1, 3);
    frond.translate(0, 0.675, 0);
    const p = frond.attributes.position;
    const cols = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) {
      const y = p.getY(v);
      const t = y / 1.35;
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

export function buildWorldEnvironment(textures: ProceduralTextures): WorldEnvironment {
  const group = new THREE.Group();
  const colliders: ObstacleCollider[] = [];
  const disposables: { dispose: () => void }[] = [];
  const rand = seededRandom(42069);

  // 0. Atmospheric sunlit sky dome
  const skyGeo = new THREE.SphereGeometry(420, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(-0.25, 0.32, -0.9).normalize() },
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
      void main() {
        float h = clamp(vWorldDir.y, 0.0, 1.0);
        vec3 horizon = vec3(0.84, 0.89, 0.91);
        vec3 zenith = vec3(0.46, 0.68, 0.88);
        vec3 col = mix(horizon, zenith, pow(h, 0.55));
        float sunAmt = max(dot(normalize(vWorldDir), uSunDir), 0.0);
        col += vec3(1.0, 0.92, 0.72) * pow(sunAmt, 14.0) * 0.48;
        col += vec3(1.0, 0.97, 0.88) * pow(sunAmt, 160.0) * 0.95;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);
  disposables.push(skyGeo, skyMat);

  // 1. Expanded terrain mesh (144x144 over 390x390)
  const segs = 144;
  const terrainGeo = new THREE.PlaneGeometry(WORLD_TERRAIN_SIZE, WORLD_TERRAIN_SIZE, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color('#4a7a29');
  const cLush = new THREE.Color('#7ca938');
  const cTrail = new THREE.Color('#7b664f');
  const cBank = new THREE.Color('#8c887a');
  const cRock = new THREE.Color('#51585e');
  const tmpCol = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundHeightAt(x, z);
    pos.setY(i, y);

    const trail = trailFactorAt(x, z);
    const distRiver = Math.abs(x - riverCenterX(z)) - riverHalfWidthAt(z);
    const radial = Math.hypot(x, z);

    tmpCol.copy(cGrass).lerp(cLush, 0.5 + 0.5 * Math.sin(x * 0.07 + z * 0.06));
    if (distRiver < 1.8 || y < WATER_LEVEL + 0.48) {
      const bankT = Math.max(0, Math.min(1, 1 - distRiver / 1.8));
      tmpCol.lerp(cBank, 0.72 * bankT);
    }
    if (trail > 0.01) {
      tmpCol.lerp(cTrail, trail * 0.92);
    }
    if (radial > WORLD_PLAYABLE_RADIUS - 6 && y > 3.5) {
      const rockT = Math.min(1, (y - 3.5) / 8);
      tmpCol.lerp(cRock, rockT * 0.88);
    }

    colors[i * 3] = tmpCol.r;
    colors[i * 3 + 1] = tmpCol.g;
    colors[i * 3 + 2] = tmpCol.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: textures.grassTile,
    normalMap: textures.grassNormal,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.92,
    metalness: 0.01,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 2. Reflective cobalt-blue river across entire expanded valley
  const riverGeo = new THREE.PlaneGeometry(34, WORLD_TERRAIN_SIZE, 24, 128);
  riverGeo.rotateX(-Math.PI / 2);
  const rPos = riverGeo.attributes.position;
  for (let i = 0; i < rPos.count; i++) {
    const lx = rPos.getX(i);
    const lz = rPos.getZ(i);
    rPos.setX(i, lx + riverCenterX(lz));
    rPos.setY(i, WATER_LEVEL);
  }
  riverGeo.computeVertexNormals();

  const waterShaderUniforms = { uTime: { value: 0 } };
  const riverMat = new THREE.MeshPhysicalMaterial({
    color: 0x174485,
    emissive: 0x091d3b,
    emissiveIntensity: 0.28,
    roughness: 0.06,
    metalness: 0.32,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.65,
    normalMap: textures.waterRippleNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    transparent: true,
    opacity: 0.86,
  });
  riverMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterShaderUniforms.uTime;
    shader.vertexShader =
      `uniform float uTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.y += sin(transformed.z * 0.55 + uTime * 2.2) * 0.032 + cos(transformed.x * 0.8 - uTime * 1.8) * 0.022;`,
      );
  };
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.receiveShadow = true;
  group.add(riverMesh);
  disposables.push(riverGeo, riverMat);

  // 3. Continuous mossy stone retaining wall along right bank
  const bankStoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneBlock,
    roughness: 0.88,
    metalness: 0.04,
  });
  const wallBoxGeo = new THREE.BoxGeometry(1.5, 1.75, 4.1);
  const bankWallCount = 34;
  const bankInst = new THREE.InstancedMesh(wallBoxGeo, bankStoneMat, bankWallCount);
  bankInst.castShadow = true;
  bankInst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < bankWallCount; i++) {
    const z = -56 + i * 3.5;
    const x = riverCenterX(z) + riverHalfWidthAt(z) + 0.35;
    const dx = riverCenterX(z + 0.5) - riverCenterX(z - 0.5);
    dummy.position.set(x, WATER_LEVEL + 0.52, z);
    dummy.rotation.set(0, Math.atan2(dx, 1), 0);
    dummy.scale.set(1, 0.95 + rand() * 0.2, 1);
    dummy.updateMatrix();
    bankInst.setMatrixAt(i, dummy.matrix);
  }
  bankInst.instanceMatrix.needsUpdate = true;
  bankInst.computeBoundingSphere();
  group.add(bankInst);
  disposables.push(wallBoxGeo, bankStoneMat);

  // 4. 15x Denser Meadow Grass across the ENTIRE 230m-radius map (56,000 5-blade tufts in 16 frustum-culled chunks)
  const tuftGeo = buildMultiBladeTuftGeometry();
  const sharedEnvUniforms = { uTime: { value: 0 } };
  const grassMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedEnvUniforms.uTime;
    shader.vertexShader =
      `uniform float uTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float sway = sin(uTime * 2.1 + float(gl_InstanceID) * 0.29) * 0.16 * position.y;
        transformed.x += sway;
        transformed.z += sway * 0.45;`,
      );
  };

  const GRID_DIV = 4;
  const CHUNK_SPAN = (WORLD_PLAYABLE_RADIUS * 2) / GRID_DIV;
  const grassChunks: { matrices: number[]; colors: number[] }[] = Array.from(
    { length: GRID_DIV * GRID_DIV },
    () => ({ matrices: [], colors: [] }),
  );
  const gColor = new THREE.Color();
  const grassTarget = 56000;
  let grassPlaced = 0;
  let attempts = 0;
  while (grassPlaced < grassTarget && attempts < grassTarget * 4) {
    attempts++;
    const x = (rand() - 0.5) * WORLD_PLAYABLE_RADIUS * 1.96;
    const z = (rand() - 0.5) * WORLD_PLAYABLE_RADIUS * 1.96;
    if (Math.hypot(x, z) > WORLD_PLAYABLE_RADIUS - 3) continue;
    const distRiver = Math.abs(x - riverCenterX(z)) - riverHalfWidthAt(z);
    if (distRiver < 0.65) continue;
    if (trailFactorAt(x, z) > 0.22) continue;
    if (nearAnyCabin(x, z, 6.8)) continue;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 0.24) continue;

    dummy.position.set(x, y - 0.05, z);
    dummy.rotation.set((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.2);
    const s = 0.85 + rand() * 0.9;
    dummy.scale.set(s, s * (0.85 + rand() * 0.55), s);
    dummy.updateMatrix();

    const cx = Math.min(GRID_DIV - 1, Math.max(0, Math.floor((x + WORLD_PLAYABLE_RADIUS) / CHUNK_SPAN)));
    const cz = Math.min(GRID_DIV - 1, Math.max(0, Math.floor((z + WORLD_PLAYABLE_RADIUS) / CHUNK_SPAN)));
    const chunk = grassChunks[cz * GRID_DIV + cx];
    chunk.matrices.push(...dummy.matrix.elements);

    gColor.setHSL(0.23 + (rand() - 0.5) * 0.06, 0.54 + rand() * 0.2, 0.74 + rand() * 0.24);
    chunk.colors.push(gColor.r, gColor.g, gColor.b);
    grassPlaced++;
  }

  const m4 = new THREE.Matrix4();
  for (const chunk of grassChunks) {
    const cnt = chunk.matrices.length / 16;
    if (cnt === 0) continue;
    const inst = new THREE.InstancedMesh(tuftGeo, grassMat, cnt);
    inst.receiveShadow = true;
    for (let i = 0; i < cnt; i++) {
      m4.fromArray(chunk.matrices, i * 16);
      inst.setMatrixAt(i, m4);
      gColor.setRGB(chunk.colors[i * 3], chunk.colors[i * 3 + 1], chunk.colors[i * 3 + 2]);
      inst.setColorAt(i, gColor);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  }
  disposables.push(tuftGeo, grassMat);

  // 4b. Colorful Wildflowers (12,000 clumps across 4 flower species & 4 spatial quadrants)
  const flowerGeo = buildCrossedCardGeometry(1.0, 0.88);
  const flowerMats = textures.flowerTextures.map(
    (tex) =>
      new THREE.MeshLambertMaterial({
        map: tex,
        alphaTest: 0.38,
        side: THREE.DoubleSide,
      }),
  );
  const flowerBuckets: number[][][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => []),
  );
  let flowersPlaced = 0;
  for (let i = 0; i < 32000 && flowersPlaced < 12000; i++) {
    const r = 4 + Math.pow(rand(), 0.58) * (WORLD_PLAYABLE_RADIUS - 8);
    const a = rand() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x - riverCenterX(z)) - riverHalfWidthAt(z) < 1.0) continue;
    if (trailFactorAt(x, z) > 0.16) continue;
    if (nearAnyCabin(x, z, 6.8)) continue;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 0.3) continue;

    dummy.position.set(x, y - 0.04, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(0.75 + rand() * 0.78);
    dummy.updateMatrix();

    const species = Math.floor(rand() * 4);
    const quad = (x >= 0 ? 1 : 0) + (z >= 0 ? 2 : 0);
    flowerBuckets[species][quad].push(...dummy.matrix.elements);
    flowersPlaced++;
  }
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    for (let q = 0; q < 4; q++) {
      const mats = flowerBuckets[sIdx][q];
      const cnt = mats.length / 16;
      if (cnt === 0) continue;
      const fInst = new THREE.InstancedMesh(flowerGeo, flowerMats[sIdx], cnt);
      fInst.receiveShadow = true;
      for (let i = 0; i < cnt; i++) {
        m4.fromArray(mats, i * 16);
        fInst.setMatrixAt(i, m4);
      }
      fInst.instanceMatrix.needsUpdate = true;
      fInst.computeBoundingSphere();
      group.add(fInst);
    }
  }
  disposables.push(flowerGeo, ...flowerMats);

  // 4c. Riverbank Reeds & Cattails along the whole winding river (3,400 clumps)
  const reedGeo = buildCrossedCardGeometry(1.15, 1.95);
  const reedMat = new THREE.MeshLambertMaterial({
    map: textures.reedCluster,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
  });
  const reedCount = 3400;
  const reedInst = new THREE.InstancedMesh(reedGeo, reedMat, reedCount);
  reedInst.receiveShadow = true;
  let reedsPlaced = 0;
  for (let i = 0; i < 6500 && reedsPlaced < reedCount; i++) {
    const z = (rand() - 0.5) * (WORLD_PLAYABLE_RADIUS * 1.94);
    if (Math.abs(z - (-10)) < 5.2) continue;
    const side = rand() > 0.5 ? 1 : -1;
    const x = riverCenterX(z) + side * (riverHalfWidthAt(z) - 0.35 + rand() * 1.35);
    const y = groundHeightAt(x, z);
    dummy.position.set(x, Math.max(WATER_LEVEL - 0.25, y - 0.08), z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(0.8 + rand() * 0.65);
    dummy.updateMatrix();
    reedInst.setMatrixAt(reedsPlaced, dummy.matrix);
    reedsPlaced++;
  }
  reedInst.count = reedsPlaced;
  reedInst.instanceMatrix.needsUpdate = true;
  reedInst.computeBoundingSphere();
  group.add(reedInst);
  disposables.push(reedGeo, reedMat);

  // 5. Varied-Size & Multi-Colored Forest (Saplings -> Giant Oaks, Autumn Oaks, Flowering Blossom Trees, Pines)
  type TreePlacement = { x: number; z: number; scale: number; hBias: number };
  const oakPositions: TreePlacement[] = [
    { x: -13.5, z: -2.0, scale: 1.35, hBias: 1.02 },
    { x: 6.2, z: -4.8, scale: 1.58, hBias: 1.08 },
    { x: -24.0, z: -12.0, scale: 1.44, hBias: 1.0 },
    { x: -9.0, z: -31.0, scale: 1.25, hBias: 0.96 },
  ];
  const autumnPositions: TreePlacement[] = [];
  const blossomPositions: TreePlacement[] = [
    { x: -6.5, z: -26.5, scale: 1.05, hBias: 0.95 },
  ];
  const pinePositions: TreePlacement[] = [];
  const allTrees: TreePlacement[] = [...oakPositions, ...blossomPositions];
  allTrees.forEach((tp) => colliders.push({ x: tp.x, z: tp.z, radius: 0.72 * tp.scale }));

  for (let i = 0; i < 1200 && allTrees.length < 380; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 16 + Math.pow(rand(), 0.65) * (WORLD_PLAYABLE_RADIUS - 8);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    if (Math.hypot(x + 2, z - 9) < 11.5) continue;
    if (nearAnyCabin(x, z, 12.5)) continue;
    if (Math.hypot(x - 46, z + 24) < 14) continue;
    if (Math.hypot(x + 62, z - 42) < 13) continue;
    if (Math.hypot(x - 84, z - 46) < 14) continue;
    if (Math.abs(x - riverCenterX(z)) < riverHalfWidthAt(z) + 4.8) continue;
    if (trailFactorAt(x, z) > 0.05) continue;

    let tooClose = false;
    for (const tp of allTrees) {
      if (Math.hypot(x - tp.x, z - tp.z) < 6.2) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    // Wide tree size variety: 0.52 saplings -> 2.15 giant ancient trees
    const rSize = rand();
    const scale = rSize < 0.25 ? 0.52 + rand() * 0.34 : rSize < 0.76 ? 0.92 + rand() * 0.58 : 1.55 + rand() * 0.62;
    const hBias = 0.88 + rand() * 0.3;
    const placement: TreePlacement = { x, z, scale, hBias };

    const roll = rand();
    if ((z < -38 || dist > 92) && pinePositions.length < 95 && roll < 0.52) {
      pinePositions.push(placement);
    } else if (blossomPositions.length < 48 && roll < 0.18) {
      blossomPositions.push(placement);
    } else if (autumnPositions.length < 58 && roll < 0.34) {
      autumnPositions.push(placement);
    } else {
      oakPositions.push(placement);
    }
    allTrees.push(placement);

    if (Math.hypot(x, z) < WORLD_PLAYABLE_RADIUS) {
      colliders.push({ x, z, radius: 0.68 * scale });
    }
  }

  const { woodGeo, canopyGeo } = buildRealisticTreeGeometries();
  const trunkMat = new THREE.MeshLambertMaterial({ map: textures.treeBark });
  const makeFoliageBatch = (
    list: TreePlacement[],
    tex: THREE.CanvasTexture,
    hueBase: number,
    hueSpan: number,
    satBase: number,
  ) => {
    if (list.length === 0) return;
    const fMat = new THREE.MeshLambertMaterial({
      map: tex,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      vertexColors: true,
    });
    fMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = sharedEnvUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float leafFactor = max(0.0, (position.y - 4.0) * 0.22);
          transformed.x += sin(uTime * 1.45 + float(gl_InstanceID) * 0.8 + position.z * 0.5) * 0.08 * leafFactor;
          transformed.z += cos(uTime * 1.25 + float(gl_InstanceID) * 0.6 + position.x * 0.5) * 0.06 * leafFactor;`,
        );
    };
    const fDepthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: tex,
      alphaTest: 0.4,
    });
    const tInst = new THREE.InstancedMesh(woodGeo, trunkMat, list.length);
    const cInst = new THREE.InstancedMesh(canopyGeo, fMat, list.length);
    tInst.castShadow = true;
    tInst.receiveShadow = true;
    cInst.castShadow = true;
    cInst.receiveShadow = true;
    cInst.customDepthMaterial = fDepthMat;

    const lCol = new THREE.Color();
    list.forEach((tp, idx) => {
      const y = groundHeightAt(tp.x, tp.z);
      dummy.position.set(tp.x, y - 0.25, tp.z);
      dummy.rotation.set((rand() - 0.5) * 0.06, rand() * Math.PI * 2, (rand() - 0.5) * 0.06);
      dummy.scale.set(
        tp.scale * (0.9 + rand() * 0.22),
        tp.scale * tp.hBias,
        tp.scale * (0.9 + rand() * 0.22),
      );
      dummy.updateMatrix();
      tInst.setMatrixAt(idx, dummy.matrix);
      cInst.setMatrixAt(idx, dummy.matrix);
      lCol.setHSL(hueBase + (rand() - 0.5) * hueSpan, satBase + rand() * 0.16, 0.76 + rand() * 0.24);
      cInst.setColorAt(idx, lCol);
    });
    [tInst, cInst].forEach((inst) => {
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      group.add(inst);
    });
    disposables.push(fMat, fDepthMat);
  };

  makeFoliageBatch(oakPositions, textures.leafCluster, 0.24, 0.06, 0.22);
  makeFoliageBatch(autumnPositions, textures.autumnLeafCluster, 0.08, 0.05, 0.22);
  makeFoliageBatch(blossomPositions, textures.blossomLeafCluster, 0.94, 0.06, 0.18);

  // Conifer Pines
  const { pineWoodGeo, pineCanopyGeo } = buildPineTreeGeometries();
  const pineMat = new THREE.MeshLambertMaterial({
    map: textures.pineNeedle,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  const pineDepthMat = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: textures.pineNeedle,
    alphaTest: 0.4,
  });
  const pCount = pinePositions.length;
  if (pCount > 0) {
    const pineTrunkInst = new THREE.InstancedMesh(pineWoodGeo, trunkMat, pCount);
    const pineCanopyInst = new THREE.InstancedMesh(pineCanopyGeo, pineMat, pCount);
    pineTrunkInst.castShadow = true;
    pineTrunkInst.receiveShadow = true;
    pineCanopyInst.castShadow = true;
    pineCanopyInst.receiveShadow = true;
    pineCanopyInst.customDepthMaterial = pineDepthMat;

    const leafCol = new THREE.Color();
    pinePositions.forEach((tp, idx) => {
      const y = groundHeightAt(tp.x, tp.z);
      dummy.position.set(tp.x, y - 0.25, tp.z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.set(tp.scale * 0.95, tp.scale * (tp.hBias + 0.12), tp.scale * 0.95);
      dummy.updateMatrix();
      pineTrunkInst.setMatrixAt(idx, dummy.matrix);
      pineCanopyInst.setMatrixAt(idx, dummy.matrix);

      leafCol.setHSL(0.32 + (rand() - 0.5) * 0.04, 0.22 + rand() * 0.14, 0.75 + rand() * 0.22);
      pineCanopyInst.setColorAt(idx, leafCol);
    });
    [pineTrunkInst, pineCanopyInst].forEach((inst) => {
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      group.add(inst);
    });
  }

  disposables.push(
    woodGeo,
    trunkMat,
    canopyGeo,
    pineWoodGeo,
    pineCanopyGeo,
    pineMat,
    pineDepthMat,
  );

  // 6. 15x Denser Forest Ferns & Undergrowth Shrubs (3,400 instances across 4 spatial quadrants)
  const bushGeo = buildFernBushGeometry();
  const bushMat = new THREE.MeshLambertMaterial({
    map: textures.fernCluster,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  const bushQuads: { matrices: number[]; colors: number[] }[] = Array.from({ length: 4 }, () => ({
    matrices: [],
    colors: [],
  }));
  let bushesPlaced = 0;
  for (let i = 0; i < 9000 && bushesPlaced < 3400; i++) {
    const x = (rand() - 0.5) * WORLD_PLAYABLE_RADIUS * 1.9;
    const z = (rand() - 0.5) * WORLD_PLAYABLE_RADIUS * 1.9;
    if (Math.hypot(x, z) > WORLD_PLAYABLE_RADIUS - 3) continue;
    if (trailFactorAt(x, z) > 0.1) continue;
    if (Math.hypot(x + 2, z - 9) < 5.5) continue;
    if (nearAnyCabin(x, z, 7.2)) continue;
    const distRiver = Math.abs(x - riverCenterX(z)) - riverHalfWidthAt(z);
    if (distRiver < 0.8) continue;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 0.3) continue;
    dummy.position.set(x, y - 0.05, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const bs = 0.78 + rand() * 1.05;
    dummy.scale.set(bs, bs * (0.85 + rand() * 0.35), bs);
    dummy.updateMatrix();
    const q = (x >= 0 ? 1 : 0) + (z >= 0 ? 2 : 0);
    bushQuads[q].matrices.push(...dummy.matrix.elements);
    gColor.setHSL(0.24 + (rand() - 0.5) * 0.06, 0.28, 0.7 + rand() * 0.28);
    bushQuads[q].colors.push(gColor.r, gColor.g, gColor.b);
    bushesPlaced++;
  }
  for (const bq of bushQuads) {
    const cnt = bq.matrices.length / 16;
    if (cnt === 0) continue;
    const bushInst = new THREE.InstancedMesh(bushGeo, bushMat, cnt);
    bushInst.receiveShadow = true;
    for (let i = 0; i < cnt; i++) {
      m4.fromArray(bq.matrices, i * 16);
      bushInst.setMatrixAt(i, m4);
      gColor.setRGB(bq.colors[i * 3], bq.colors[i * 3 + 1], bq.colors[i * 3 + 2]);
      bushInst.setColorAt(i, gColor);
    }
    bushInst.instanceMatrix.needsUpdate = true;
    if (bushInst.instanceColor) bushInst.instanceColor.needsUpdate = true;
    bushInst.computeBoundingSphere();
    group.add(bushInst);
  }
  disposables.push(bushGeo, bushMat);

  // 7. Instanced Boulders (90 boulders across the larger map)
  const rockGeo = new THREE.DodecahedronGeometry(0.95, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    map: textures.stoneBlock,
    color: 0xa8a29e,
    roughness: 0.9,
    metalness: 0.05,
  });
  const rockCount = 90;
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  let rocksPlaced = 0;
  for (let i = 0; i < 240 && rocksPlaced < rockCount; i++) {
    const x = (rand() - 0.5) * WORLD_PLAYABLE_RADIUS * 1.85;
    const z = (rand() - 0.5) * WORLD_PLAYABLE_RADIUS * 1.85;
    if (trailFactorAt(x, z) > 0.12) continue;
    if (Math.hypot(x + 2, z - 9) < 8) continue;
    if (nearAnyCabin(x, z, 11.5)) continue;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL - 0.3) continue;

    const s = 0.65 + rand() * 1.25;
    dummy.position.set(x, y + s * 0.3, z);
    dummy.rotation.set(rand() * 2, rand() * 3, rand() * 2);
    dummy.scale.set(s * 1.2, s * 0.78, s);
    dummy.updateMatrix();
    rockInst.setMatrixAt(rocksPlaced, dummy.matrix);
    if (s > 1.0) {
      colliders.push({ x, z, radius: s * 0.95 });
    }
    rocksPlaced++;
  }
  rockInst.count = rocksPlaced;
  rockInst.instanceMatrix.needsUpdate = true;
  rockInst.computeBoundingSphere();
  group.add(rockInst);
  disposables.push(rockGeo, rockMat);

  return {
    group,
    colliders,
    update: (elapsed: number, dt: number) => {
      waterShaderUniforms.uTime.value = elapsed;
      sharedEnvUniforms.uTime.value = elapsed;
      textures.waterRippleNormal.offset.y -= dt * 0.18;
      textures.waterRippleNormal.offset.x += dt * 0.035;
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
