import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildSignpost } from './models';
import {
  biomeAt,
  groundHeightAt,
  mountainRockFactorAt,
  nearAnyCabin,
  nearAnyCave,
  nearVillage,
  riverCenterX,
  riverHalfWidthAt,
  VILLAGE_SITE,
  villagePlazaFactorAt,
  WATER_LEVEL,
  WORLD_HALF_X,
  WORLD_HALF_Z,
  WORLD_SIZE_X,
  WORLD_SIZE_Z,
} from './terrain';
import { ProceduralTextures } from './textures';
import { SeasonId, TrailCellPoint, WeatherId } from './types';

export interface ObstacleCollider {
  x: number;
  z: number;
  radius: number;
}

export interface WorldEnvironment {
  group: THREE.Group;
  colliders: ObstacleCollider[];
  addStaticCollider: (collider: ObstacleCollider) => void;
  updateTrailOverlay: (cells: TrailCellPoint[]) => void;
  update: (elapsed: number, dt: number) => void;
  setEnvironmentState: (
    season: SeasonId,
    weather: WeatherId,
    playerPos: THREE.Vector3,
    sunDir: THREE.Vector3,
    dt: number,
    elapsed: number,
  ) => void;
  dispose: () => void;
}

export interface EnvironmentBuildOptions {
  mobilePerf?: boolean;
  worldSeed?: number;
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
  const angles = [0.15, 1.05, 2.1, 3.05];
  const offsets: [number, number][] = [
    [-0.12, 0.09],
    [0.14, -0.08],
    [-0.08, -0.14],
    [0.11, 0.13],
  ];

  for (let i = 0; i < 4; i++) {
    const g = new THREE.BufferGeometry();
    const h = 1.12 + (i % 2) * 0.32;
    const w = 0.12;
    const lean = 0.16 + (i % 2) * 0.06;
    const verts = new Float32Array([-w, 0, 0, w, 0, 0, 0, h, lean]);
    const cols = new Float32Array([0.22, 0.38, 0.12, 0.22, 0.38, 0.12, 0.88, 0.98, 0.44]);
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.setIndex([0, 1, 2]);
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

        const bright = Math.max(
          0.55,
          Math.min(1.08, 0.74 + vy / (sz * 1.8) + (cIdx === 0 ? 0.12 : 0)),
        );
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
  const terrainUniforms = {
    uSeasonTint: { value: new THREE.Color(1, 1, 1) },
    uSnowMix: { value: 0 },
    uWetness: { value: 0 },
    uSandMap: { value: textures.sandBankTile },
    uRockMap: { value: textures.cliffRockTile },
    uPlazaMap: { value: textures.plazaCobble },
    uVillageCenter: { value: new THREE.Vector2(VILLAGE_SITE.x, VILLAGE_SITE.z) },
  };
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: textures.grassTile,
    normalMap: mobilePerf ? null : textures.grassNormal,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughness: 0.92,
    metalness: 0.01,
  });
  terrainMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSeasonTint = terrainUniforms.uSeasonTint;
    shader.uniforms.uSnowMix = terrainUniforms.uSnowMix;
    shader.uniforms.uWetness = terrainUniforms.uWetness;
    shader.uniforms.uSandMap = terrainUniforms.uSandMap;
    shader.uniforms.uRockMap = terrainUniforms.uRockMap;
    shader.uniforms.uPlazaMap = terrainUniforms.uPlazaMap;
    shader.uniforms.uVillageCenter = terrainUniforms.uVillageCenter;
    shader.vertexShader =
      `varying vec3 vWorldPos;\nvarying vec3 vWorldNrm;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vWorldNrm = normalize(mat3(modelMatrix) * normal);`,
      );
    shader.fragmentShader =
      `uniform vec3 uSeasonTint;
      uniform float uSnowMix;
      uniform float uWetness;
      uniform sampler2D uSandMap;
      uniform sampler2D uRockMap;
      uniform sampler2D uPlazaMap;
      uniform vec2 uVillageCenter;
      varying vec3 vWorldPos;
      varying vec3 vWorldNrm;\n` +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
            vec2 gUv1 = vWorldPos.xz * 0.16;
            vec2 gUv2 = vWorldPos.xz * 0.053 + vec2(0.37, 0.71);
            vec4 grassA = texture2D(map, gUv1);
            vec4 grassB = texture2D(map, gUv2);
            vec3 groundTex = mix(grassA.rgb, grassB.rgb, 0.42);

            // World-space riverbank sand & pebbles near river level
            float tRC = 16.0 + sin(vWorldPos.z * 0.04) * 9.5 + cos(vWorldPos.z * 0.018) * 4.5 + sin(vWorldPos.z * 0.0042) * 34.0;
            float tRW = 5.4 + sin(vWorldPos.z * 0.08 + 1.2) * 0.7;
            float rEdge = abs(vWorldPos.x - tRC) - tRW;
            float sandMask = clamp((1.0 - smoothstep(0.2, 2.8, rEdge)) * (1.0 - smoothstep(0.65, 1.85, vWorldPos.y)), 0.0, 1.0);
            vec3 sandCol = texture2D(uSandMap, vWorldPos.xz * 0.24).rgb;

            // Steep slopes & mountain heights get stratified cliff rock
            float slopeMask = 1.0 - smoothstep(0.58, 0.86, vWorldNrm.y);
            float highMask = smoothstep(5.4, 11.2, vWorldPos.y);
            float rockMask = clamp(max(slopeMask * 0.95, highMask * 0.85), 0.0, 1.0);
            vec3 rockCol = texture2D(uRockMap, vec2(vWorldPos.x * 0.11 + vWorldPos.z * 0.07, vWorldPos.y * 0.16)).rgb;

            // Village plaza cobble blend
            float plazaD = length(vWorldPos.xz - uVillageCenter);
            float plazaMask = 1.0 - smoothstep(11.0, 17.2, plazaD);
            vec3 plazaCol = texture2D(uPlazaMap, vWorldPos.xz * 0.22).rgb;

            vec3 finalSurf = mix(groundTex, sandCol, sandMask * 0.88);
            finalSurf = mix(finalSurf, rockCol, rockMask * (1.0 - sandMask * 0.5));
            finalSurf = mix(finalSurf, plazaCol, plazaMask * 0.88);
            diffuseColor.rgb *= mix(finalSurf, finalSurf * 1.15, 0.2);
          #endif`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float isGrass = smoothstep(0.55, 0.86, vWorldNrm.y) * (1.0 - smoothstep(5.8, 10.0, vWorldPos.y));
          diffuseColor.rgb *= mix(vec3(1.0), uSeasonTint, isGrass * 0.65);
          float snowNoise = fract(sin(dot(floor(vWorldPos.xz * 0.45), vec2(12.9898, 78.233))) * 43758.5453);
          float snowAmt = uSnowMix * smoothstep(0.45, 0.85, vWorldNrm.y) * (0.86 + 0.14 * snowNoise);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.91, 0.95, 0.99), clamp(snowAmt, 0.0, 0.92));
          diffuseColor.rgb *= mix(1.0, 0.82, uWetness * 0.55);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.3, uWetness * 0.65);`,
        );
  };
  disposables.push(terrainMat);

  const cGrass = new THREE.Color('#7ca352');
  const cLush = new THREE.Color('#97bc5e');
  const cPineMoss = new THREE.Color('#5f8246');
  const cBlossomMeadow = new THREE.Color('#8cb556');
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

    const baseA =
      biome === 'pine_forest'
        ? cPineMoss
        : biome === 'blossom_grove'
          ? cBlossomMeadow
          : cGrass;
    tmpCol.copy(baseA).lerp(cLush, 0.5 + 0.5 * Math.sin(x * 0.07 + z * 0.06));
    if (distRiver < 2.2 || y < WATER_LEVEL + 0.55) {
      const bankT = Math.max(0, Math.min(1, 1 - distRiver / 2.2));
      tmpCol.lerp(cBank, 0.72 * bankT);
    }
    if (plaza > 0.01) {
      tmpCol.lerp(cPlaza, plaza * 0.82);
    }
    if ((edgeRim > 0 && y > 3.5) || (mtnFactor > 0.15 && y > 3.2)) {
      const rockT = Math.min(1, Math.max((y - 3.2) / 6.5, mtnFactor * 0.78));
      tmpCol.lerp(cRock, rockT * 0.85);
    }
    if (y > 13.0) {
      const capT = Math.min(1, (y - 13.0) / 5.5);
      tmpCol.lerp(cPeak, capT * 0.78);
    }
    return tmpCol;
  };

  // 1a. Full 2048x4096 distant horizon valley base
  const coarseGeo = new THREE.PlaneGeometry(WORLD_SIZE_X + 240, WORLD_SIZE_Z + 240, 72, 112);
  coarseGeo.rotateX(-Math.PI / 2);
  const cPos = coarseGeo.attributes.position;
  const cCols = new Float32Array(cPos.count * 3);
  for (let i = 0; i < cPos.count; i++) {
    const x = cPos.getX(i);
    const z = cPos.getZ(i);
    const y = groundHeightAt(x, z) - 0.35;
    cPos.setY(i, y);
    const col = colorVertex(x, y, z);
    cCols[i * 3] = col.r;
    cCols[i * 3 + 1] = col.g;
    cCols[i * 3 + 2] = col.b;
  }
  coarseGeo.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
  coarseGeo.computeVertexNormals();
  const coarseTerrain = new THREE.Mesh(coarseGeo, terrainMat);
  coarseTerrain.receiveShadow = true;
  coarseTerrain.matrixAutoUpdate = false;
  coarseTerrain.updateMatrix();
  group.add(coarseTerrain);
  disposables.push(coarseGeo);

  // 1b. Pooled 5x5 High-Res Terrain Chunks (96m x 96m each: 2.4m desktop / 3.4m mobile precision for caves & riverbanks!)
  const chunkSegs = mobilePerf ? 28 : 40;
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

  // 2. Player-Following Dense River Water Strip (hugs winding bends tightly, zero dry-land overhang or heavy shader stalls)
  const RIVER_SPAN_Z = 560;
  const riverSegX = 10;
  const riverSegZ = 180;
  const riverGeo = new THREE.PlaneGeometry(34, RIVER_SPAN_Z, riverSegX, riverSegZ);
  riverGeo.rotateX(-Math.PI / 2);
  const rPosAttr = riverGeo.attributes.position as THREE.BufferAttribute;
  const riverBaseU = new Float32Array(rPosAttr.count);
  const riverBaseLocalZ = new Float32Array(rPosAttr.count);
  for (let i = 0; i < rPosAttr.count; i++) {
    riverBaseU[i] = rPosAttr.getX(i) / 17.0;
    riverBaseLocalZ[i] = rPosAttr.getZ(i);
  }
  let lastRiverSnapZ = 999999;

  const updateRiverStrip = (centerZ: number) => {
    const snappedZ = Math.round(centerZ / 32) * 32;
    if (Math.abs(snappedZ - lastRiverSnapZ) < 1) return;
    lastRiverSnapZ = snappedZ;
    for (let i = 0; i < rPosAttr.count; i++) {
      const wz = Math.max(-WORLD_HALF_Z, Math.min(WORLD_HALF_Z, snappedZ + riverBaseLocalZ[i]));
      const halfSpan = riverHalfWidthAt(wz) + 0.95;
      rPosAttr.setXYZ(i, riverCenterX(wz) + riverBaseU[i] * halfSpan, WATER_LEVEL, wz);
    }
    rPosAttr.needsUpdate = true;
    riverGeo.computeBoundingSphere();
  };
  updateRiverStrip(0);

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
        float w1 = sin(transformed.z * 0.55 + uTime * 2.2) * 0.028;
        float w2 = cos(transformed.x * 0.85 - uTime * 1.8 + transformed.z * 0.25) * 0.018;
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
          float rCenter = 16.0 + sin(vWaterPos.z * 0.04) * 9.5 + cos(vWaterPos.z * 0.018) * 4.5 + sin(vWaterPos.z * 0.0042) * 34.0;
          float rHalfW = 5.4 + sin(vWaterPos.z * 0.08 + 1.2) * 0.7;
          float bankOffset = rHalfW - abs(vWaterPos.x - rCenter);
          float distBank = max(0.0, bankOffset);
          float shallowMask = 1.0 - smoothstep(0.0, 2.2, distBank);

          vec3 baseCol = mix(uWaterDeep, uWaterShallow, shallowMask * 0.85);
          float foamSample = texture2D(uFoamMap, vWaterUv * 1.15 + vec2(sin(uTime * 0.35) * 0.03, -uTime * 0.08)).r;
          float causticsSample = texture2D(uCausticsMap, vWaterUv * 1.05 + vec2(uTime * 0.02, -uTime * 0.055)).r;

          float shoreWave = 0.75 + 0.35 * sin(vWaterPos.z * 0.75 + uTime * 2.3);
          float shoreFoam = smoothstep(1.05, 0.08, distBank) * smoothstep(0.28, 0.78, foamSample * shoreWave);

          float chopMask = clamp(1.0 - abs(uWaterState - 1.0), 0.0, 1.0);
          float whitecaps = chopMask * smoothstep(0.72, 0.94, foamSample) * 0.5;

          float iceMask = clamp(1.0 - abs(uWaterState - 3.0), 0.0, 1.0);
          float iceShelf = iceMask * smoothstep(1.85, 0.35, distBank) * 0.82;
          baseCol = mix(baseCol, vec3(0.76, 0.89, 0.97), iceShelf);

          float causticsVis = (1.0 - iceMask * 0.7) * (1.0 - chopMask * 0.5);
          baseCol += vec3(0.2, 0.44, 0.5) * causticsSample * (0.24 + 0.52 * shallowMask) * causticsVis;

          diffuseColor.rgb = mix(baseCol, vec3(0.93, 0.97, 1.0), clamp(shoreFoam + whitecaps, 0.0, 0.9));
          // Feather out smoothly near bank edge so water never pokes over grass
          float edgeAlpha = smoothstep(-0.35, 0.42, bankOffset);
          diffuseColor.a = edgeAlpha * mix(0.82, 0.95, clamp(shoreFoam + iceShelf + 0.14 * (1.0 - shallowMask), 0.0, 1.0));`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          vec3 wViewDir = normalize(cameraPosition - vWaterPos);
          float wFresnel = pow(1.0 - max(dot(wViewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
          vec3 halfSun = normalize(uSunDir + wViewDir);
          float glint = pow(max(dot(vec3(0.0, 1.0, 0.0), halfSun), 0.0), 68.0);
          totalEmissiveRadiance += vec3(0.22, 0.42, 0.6) * wFresnel * 0.42 + vec3(1.0, 0.93, 0.75) * glint * (1.0 - clamp(abs(uWaterState - 1.0), 0.0, 1.0) * 0.2);`,
        );
  };
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.receiveShadow = true;
  riverMesh.frustumCulled = false;
  riverMesh.matrixAutoUpdate = false;
  riverMesh.updateMatrix();
  group.add(riverMesh);
  disposables.push(riverGeo, riverMat);

  // 3. Retaining stone wall along central riverbank
  const bankStoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneBlock,
    roughness: 0.88,
    metalness: 0.04,
  });
  const wallBoxGeo = new THREE.BoxGeometry(1.5, 1.75, 4.1);
  const bankWallCount = 44;
  const bankInst = new THREE.InstancedMesh(wallBoxGeo, bankStoneMat, bankWallCount);
  bankInst.castShadow = true;
  bankInst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < bankWallCount; i++) {
    const z = -72 + i * 3.4;
    const x = riverCenterX(z) + riverHalfWidthAt(z) + 0.35;
    const dx = riverCenterX(z + 0.5) - riverCenterX(z - 0.5);
    dummy.position.set(x, WATER_LEVEL + 0.52, z);
    dummy.rotation.set(0, Math.atan2(dx, 1), 0);
    dummy.scale.set(1, 1.0, 1);
    dummy.updateMatrix();
    bankInst.setMatrixAt(i, dummy.matrix);
  }
  bankInst.instanceMatrix.needsUpdate = true;
  bankInst.computeBoundingSphere();
  group.add(bankInst);
  disposables.push(wallBoxGeo, bankStoneMat);

  // 3b. Village cobblestone plaza + crossroads signposts (NO pre-baked wilderness trails!)
  const plazaGeo = new THREE.CylinderGeometry(15.5, 16.5, 0.14, 24);
  const plazaMat = new THREE.MeshStandardMaterial({
    map: textures.plazaCobble,
    roughness: 0.92,
    metalness: 0.04,
  });
  const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
  plazaMesh.position.set(VILLAGE_SITE.x, VILLAGE_SITE.plazaY - 0.02, VILLAGE_SITE.z);
  plazaMesh.receiveShadow = true;
  plazaMesh.matrixAutoUpdate = false;
  plazaMesh.updateMatrix();
  group.add(plazaMesh);
  disposables.push(plazaGeo, plazaMat);

  const signpostSpots: [number, number, number][] = [
    [-8.5, -5.0, 0.35],
    [-2.5, 4.5, -0.5],
    [34.5, -14.5, 0.8],
    [VILLAGE_SITE.x - 11.5, VILLAGE_SITE.z + 11.5, 0.65],
    [VILLAGE_SITE.x + 12.5, VILLAGE_SITE.z - 10.5, -2.1],
  ];
  for (const [sx, sz, srot] of signpostSpots) {
    const sign = buildSignpost(textures);
    sign.position.set(sx, groundHeightAt(sx, sz) - 0.05, sz);
    sign.rotation.y = srot;
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
  group.add(trailInst);
  disposables.push(trailGeo, trailMat);

  const updateTrailOverlay = (cells: TrailCellPoint[]) => {
    const count = Math.min(cells.length, MAX_TRAIL_TILES);
    const startIdx = Math.max(0, cells.length - count);
    for (let i = 0; i < count; i++) {
      const c = cells[startIdx + i];
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
  };

  // 4. Shared Flora Geometries & Seasonal Shaders (Streamed per active 128m chunk)
  const sharedEnvUniforms = {
    uTime: { value: 0 },
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
    shader.uniforms.uSeasonTint = sharedEnvUniforms.uSeasonTint;
    shader.uniforms.uSnowMix = sharedEnvUniforms.uSnowMix;
    shader.vertexShader =
      `uniform float uTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float sway = sin(uTime * 2.2 + float(gl_InstanceID) * 0.29) * 0.16 * position.y;
        transformed.x += sway;
        transformed.z += sway * 0.45;`,
      );
    shader.fragmentShader =
      `uniform vec3 uSeasonTint;\nuniform float uSnowMix;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb *= mix(vec3(1.0), uSeasonTint, 0.78);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.93, 0.98), uSnowMix * 0.62);`,
      );
  };
  disposables.push(tuftGeo, grassMat);

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
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  pineCanopyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnowMix = sharedEnvUniforms.uSnowMix;
    shader.fragmentShader =
      `uniform float uSnowMix;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.9, 0.97), uSnowMix * 0.36);`,
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
  disposables.push(rockGeo, rockMat);

  // 5. Dynamic Flora & Collider Chunk Streamer (keeps 2048x4096 lush at 60 FPS)
  interface FloraChunk {
    key: string;
    chunkGroup: THREE.Group;
    colliders: ObstacleCollider[];
    insts: THREE.InstancedMesh[];
  }
  const activeFloraChunks = new Map<string, FloraChunk>();
  const floraRadius = mobilePerf ? 1 : 2;
  const gColor = new THREE.Color();
  const m4 = new THREE.Matrix4();

  const buildFloraChunk = (cx: number, cz: number): FloraChunk => {
    const chunkGroup = new THREE.Group();
    const chunkColliders: ObstacleCollider[] = [];
    const insts: THREE.InstancedMesh[] = [];
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
      const grassTarget = mobilePerf ? 1450 : 2550;
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
        if (villagePlazaFactorAt(x, z) > 0.12) continue;
        const y = groundHeightAt(x, z);
        if (y < WATER_LEVEL + 0.28 || y > 8.6) continue;
        const biome = biomeAt(x, z);
        if (biome === 'mountain' && rand() < 0.55) continue;

        dummy.position.set(x, y - 0.05, z);
        dummy.rotation.set((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.2);
        const biomeTall = biome === 'meadow' ? 1.16 : biome === 'pine_forest' ? 0.86 : 1.0;
        const s = (0.86 + rand() * 0.92) * (mobilePerf ? 1.22 : 1.04) * biomeTall;
        dummy.scale.set(s, s * (0.88 + rand() * 0.55), s);
        dummy.updateMatrix();
        grassMatrices.set(dummy.matrix.elements, grassCount * 16);

        const hueShift = biome === 'pine_forest' ? 0.27 : biome === 'blossom_grove' ? 0.22 : 0.23;
        gColor.setHSL(hueShift + (rand() - 0.5) * 0.06, 0.54 + rand() * 0.2, 0.74 + rand() * 0.24);
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
      const flowerTarget = mobilePerf ? 300 : 580;
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
        if (villagePlazaFactorAt(x, z) > 0.12) continue;
        const y = groundHeightAt(x, z);
        if (y < WATER_LEVEL + 0.3 || y > 7.6) continue;
        const biome = biomeAt(x, z);
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
      const fernTarget = mobilePerf ? 65 : 130;
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
        if (villagePlazaFactorAt(x, z) > 0.1) continue;
        const y = groundHeightAt(x, z);
        if (y < WATER_LEVEL + 0.3 || y > 7.8) continue;
        const biome = biomeAt(x, z);
        if (biome === 'meadow' && rand() < 0.72) continue;

        dummy.position.set(x, y - 0.08, z);
        dummy.rotation.set(0, rand() * Math.PI * 2, 0);
        dummy.scale.setScalar((0.72 + rand() * 0.65) * (mobilePerf ? 1.15 : 1.0));
        dummy.updateMatrix();
        fernMatrices.set(dummy.matrix.elements, fernsPlaced * 16);
        gColor.setHSL(0.26 + (rand() - 0.5) * 0.06, 0.25 + rand() * 0.14, 0.75 + rand() * 0.2);
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
      const reedTarget = mobilePerf ? 75 : 160;
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

      // E. Biome-Grouped Varied Trees in this chunk
      type TreeSpec = { x: number; z: number; scale: number; hBias: number };
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
        for (const [tx, tz, sc, tpKind] of starterTrees) {
          const item = { x: tx, z: tz, scale: sc, hBias: 1.0 };
          allChunkTrees.push(item);
          if (tpKind === 'blossom') blossomList.push(item);
          else oakList.push(item);
          chunkColliders.push({ x: tx, z: tz, radius: 0.72 * sc });
        }
      }

      const treeTarget = mobilePerf ? 18 : 30;
      for (let i = 0; i < 160 && allChunkTrees.length < treeTarget; i++) {
        const x = minX + rand() * CHUNK_SIZE;
        const z = minZ + rand() * CHUNK_SIZE;
        if (Math.abs(x) > WORLD_HALF_X - 18 || Math.abs(z) > WORLD_HALF_Z - 18) continue;
        if (Math.hypot(x + 2, z - 9) < 12.0) continue;
        if (nearAnyCabin(x, z, 11.5)) continue;
        if (nearAnyCave(x, z, 15.5)) continue;
        if (nearVillage(x, z, 36)) continue;
        if (mountainRockFactorAt(x, z) > 0.52) continue;
        if (Math.hypot(x - 46, z + 24) < 14) continue;
        if (Math.abs(x - riverCenterX(z)) < riverHalfWidthAt(z) + 4.8) continue;

        const biome = biomeAt(x, z);
        if (biome === 'meadow' && rand() < 0.78) continue;

        let tooClose = false;
        const spacing = biome === 'oak_forest' || biome === 'pine_forest' ? 5.8 : 7.0;
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
        const placement: TreeSpec = { x, z, scale, hBias };

        const roll = rand();
        if (biome === 'pine_forest') {
          if (roll < 0.84) pineList.push(placement);
          else oakList.push(placement);
        } else if (biome === 'blossom_grove') {
          if (roll < 0.56) blossomList.push(placement);
          else oakList.push(placement);
        } else if (biome === 'meadow') {
          if (roll < 0.45) blossomList.push(placement);
          else oakList.push(placement);
        } else {
          if (roll < 0.24) autumnList.push(placement);
          else if (roll < 0.36) pineList.push(placement);
          else oakList.push(placement);
        }
        allChunkTrees.push(placement);
        chunkColliders.push({ x, z, radius: 0.68 * scale });
      }

      const emitDeciduous = (
        list: TreeSpec[],
        canopyMat: THREE.MeshLambertMaterial,
        hueBase: number,
        hueSpan: number,
        satBase: number,
      ) => {
        if (list.length === 0) return;
        const tInst = new THREE.InstancedMesh(woodGeo, trunkMat, list.length);
        const cInst = new THREE.InstancedMesh(canopyGeo, canopyMat, list.length);
        tInst.castShadow = !mobilePerf;
        tInst.receiveShadow = true;
        tInst.matrixAutoUpdate = false;
        cInst.castShadow = !mobilePerf;
        cInst.receiveShadow = false;
        cInst.matrixAutoUpdate = false;

        list.forEach((tp, idx) => {
          const y = groundHeightAt(tp.x, tp.z);
          dummy.position.set(tp.x, y - 0.25, tp.z);
          dummy.rotation.set((rand() - 0.5) * 0.06, rand() * Math.PI * 2, (rand() - 0.5) * 0.06);
          dummy.scale.set(tp.scale * (0.9 + rand() * 0.22), tp.scale * tp.hBias, tp.scale * (0.9 + rand() * 0.22));
          dummy.updateMatrix();
          tInst.setMatrixAt(idx, dummy.matrix);
          cInst.setMatrixAt(idx, dummy.matrix);
          gColor.setHSL(hueBase + (rand() - 0.5) * hueSpan, satBase + rand() * 0.16, 0.76 + rand() * 0.24);
          cInst.setColorAt(idx, gColor);
        });
        [tInst, cInst].forEach((inst) => {
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          inst.computeBoundingSphere();
          chunkGroup.add(inst);
          insts.push(inst);
        });
      };

      emitDeciduous(oakList, oakCanopyMat, 0.24, 0.06, 0.22);
      emitDeciduous(autumnList, autumnCanopyMat, 0.08, 0.05, 0.22);
      emitDeciduous(blossomList, blossomCanopyMat, 0.94, 0.06, 0.18);

      if (pineList.length > 0) {
        const ptInst = new THREE.InstancedMesh(pineWoodGeo, trunkMat, pineList.length);
        const pcInst = new THREE.InstancedMesh(pineCanopyGeo, pineCanopyMat, pineList.length);
        ptInst.castShadow = !mobilePerf;
        ptInst.receiveShadow = true;
        ptInst.matrixAutoUpdate = false;
        pcInst.castShadow = !mobilePerf;
        pcInst.receiveShadow = false;
        pcInst.matrixAutoUpdate = false;

        pineList.forEach((tp, idx) => {
          const y = groundHeightAt(tp.x, tp.z);
          dummy.position.set(tp.x, y - 0.25, tp.z);
          dummy.rotation.set(0, rand() * Math.PI * 2, 0);
          dummy.scale.set(tp.scale * 0.95, tp.scale * (tp.hBias + 0.12), tp.scale * 0.95);
          dummy.updateMatrix();
          ptInst.setMatrixAt(idx, dummy.matrix);
          pcInst.setMatrixAt(idx, dummy.matrix);
          gColor.setHSL(0.32 + (rand() - 0.5) * 0.04, 0.22 + rand() * 0.14, 0.75 + rand() * 0.22);
          pcInst.setColorAt(idx, gColor);
        });
        [ptInst, pcInst].forEach((inst) => {
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          inst.computeBoundingSphere();
          chunkGroup.add(inst);
          insts.push(inst);
        });
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
        if (nearAnyCabin(x, z, 11.0)) continue;
        if (nearAnyCave(x, z, 13.0)) continue;
        if (nearVillage(x, z, 34)) continue;
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
    return { key: `${cx},${cz}`, chunkGroup, colliders: chunkColliders, insts };
  };

  let lastPlayerCx = 999999;
  let lastPlayerCz = 999999;
  const pendingTerrainQueue: [number, number][] = [];
  const pendingFloraQueue: [number, number][] = [];

  const syncColliders = () => {
    colliders.length = 0;
    colliders.push(...staticColliders);
    for (const chunk of activeFloraChunks.values()) {
      for (const c of chunk.colliders) {
        colliders.push(c);
      }
    }
  };

  const ensureChunksAround = (px: number, pz: number, synchronousWarmup = false) => {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);

    if (pcx !== lastPlayerCx || pcz !== lastPlayerCz) {
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

      const haveTerrain = new Set<string>();
      for (const slot of terrainPool) {
        const inRange =
          Math.abs(slot.cx - pcx) <= TERRAIN_POOL_RADIUS &&
          Math.abs(slot.cz - pcz) <= TERRAIN_POOL_RADIUS;
        if (inRange) haveTerrain.add(`${slot.cx},${slot.cz}`);
      }
      for (const [ncx, ncz] of neededTerrain) {
        if (!haveTerrain.has(`${ncx},${ncz}`)) {
          pendingTerrainQueue.push([ncx, ncz]);
        }
      }

      // 2. Prune distant flora & queue missing flora chunks closest-first
      const wantedFloraKeys = new Set<string>();
      const neededFlora: [number, number, number][] = [];
      for (let dz = -floraRadius; dz <= floraRadius; dz++) {
        for (let dx = -floraRadius; dx <= floraRadius; dx++) {
          wantedFloraKeys.add(`${pcx + dx},${pcz + dz}`);
          neededFlora.push([pcx + dx, pcz + dz, dx * dx + dz * dz]);
        }
      }
      neededFlora.sort((a, b) => a[2] - b[2]);

      let collidersChanged = false;
      for (const [k, existing] of activeFloraChunks.entries()) {
        if (!wantedFloraKeys.has(k)) {
          group.remove(existing.chunkGroup);
          existing.insts.forEach((inst) => inst.dispose());
          activeFloraChunks.delete(k);
          collidersChanged = true;
        }
      }
      pendingFloraQueue.length = 0;
      for (const [fcx, fcz] of neededFlora) {
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
      const freeSlot = terrainPool.find(
        (slot) =>
          Math.abs(slot.cx - pcx) > TERRAIN_POOL_RADIUS ||
          Math.abs(slot.cz - pcz) > TERRAIN_POOL_RADIUS,
      );
      if (freeSlot) {
        updateTerrainChunkSlot(freeSlot, next[0], next[1]);
        builtTerrain++;
      } else {
        break;
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

  // Pre-warm initial chunks around starter homestead
  ensureChunksAround(-2, 9, true);

  // 8. Dynamic 3D Weather Particle Volume (Rain / Snow / Autumn Leaves / Spring Blossoms)
  const wxCount = mobilePerf ? 700 : 1800;
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
  const wxMat = new THREE.PointsMaterial({
    color: 0xe0f2fe,
    size: 0.24,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const wxPoints = new THREE.Points(wxGeo, wxMat);
  wxPoints.frustumCulled = false;
  group.add(wxPoints);
  disposables.push(wxGeo, wxMat);

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
    addStaticCollider: (collider: ObstacleCollider) => {
      staticColliders.push(collider);
      colliders.push(collider);
    },
    updateTrailOverlay,
    update: (elapsed: number, dt: number) => {
      skyMat.uniforms.uTime.value = elapsed;
      waterUniforms.uTime.value = elapsed;
      sharedEnvUniforms.uTime.value = elapsed;
      const flowSpeed =
        waterUniforms.uWaterState.value === 3 ? 0.03 : waterUniforms.uWaterState.value === 1 ? 0.28 : 0.18;
      textures.waterRippleNormal.offset.y -= dt * flowSpeed;
      textures.waterRippleNormal.offset.x += dt * 0.035;
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

      const showParticles = weather === 'rain' || weather === 'precip';
      if (!showParticles) {
        wxMat.opacity = Math.max(0, wxMat.opacity - dt * 2.5);
        wxPoints.visible = wxMat.opacity > 0.01;
        return;
      }
      wxPoints.visible = true;
      const targetOp = weather === 'rain' ? 0.65 : 0.85;
      wxMat.opacity = THREE.MathUtils.lerp(wxMat.opacity, targetOp, k * 2);

      let fallY = -23;
      let driftX = 2.4;
      let driftZ = 1.2;
      if (weather === 'rain') {
        wxMat.color.setHex(0xcbe8ff);
        wxMat.size = 0.16;
        fallY = -24;
      } else if (season === 'winter') {
        wxMat.color.setHex(0xf8fafc);
        wxMat.size = 0.28;
        fallY = -3.6;
        driftX = 1.2;
      } else if (season === 'autumn') {
        wxMat.color.setHex(0xf59e0b);
        wxMat.size = 0.3;
        fallY = -3.1;
        driftX = 1.8;
      } else if (season === 'spring') {
        wxMat.color.setHex(0xf9a8d4);
        wxMat.size = 0.26;
        fallY = -2.4;
        driftX = 1.5;
      } else {
        wxMat.color.setHex(0xfef08a);
        wxMat.size = 0.17;
        fallY = -1.6;
        driftX = 2.8;
      }

      const attr = wxGeo.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const boxHalf = 21;
      const minY = playerPos.y - 2;
      const maxY = playerPos.y + 18;
      for (let i = 0; i < wxCount; i++) {
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
