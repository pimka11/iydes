import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { soundEngine } from './audio';
import { buildWorldEnvironment, WorldEnvironment } from './environment';
import {
  buildArchedBridge,
  buildBulletModel,
  buildCabin,
  buildCampfire,
  buildMobModel,
  buildPeacefulMobModel,
  buildResourceNodeModel,
  buildRobloxPlayer,
  buildStoneRuins,
  MobVisual,
  PeacefulMobVisual,
  PlayerRig,
} from './models';
import {
  BRIDGE_Z,
  CABIN_ROT,
  CABIN_SITES,
  CabinSite,
  cabinBaseY,
  findInsideCabin,
  fromCabinLocal,
  getZoneName,
  groundHeightAt,
  resolveCabinCollision,
  riverCenterX,
  toCabinLocal,
  walkableHeightAt,
  WATER_LEVEL,
  WORLD_PLAYABLE_RADIUS,
} from './terrain';
import { createProceduralTextures, ProceduralTextures } from './textures';
import {
  ConsumableId,
  CRAFT_RECIPES,
  GameHudState,
  KillFeedItem,
  MOB_DEFS,
  MobKind,
  PeacefulMobKind,
  ResourceId,
  RESOURCES,
  UpgradeId,
  WeaponId,
  WEAPONS,
} from './types';

const _v1 = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

// Ultra-lightweight single-pass distant background blur shader
const FastDofShader = {
  name: 'FastDofShader',
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uFocus: { value: 6.5 },
    uNear: { value: 0.15 },
    uFar: { value: 460.0 },
    uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uMaxBlur: { value: 4.5 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform float uFocus;
    uniform float uNear;
    uniform float uFar;
    uniform vec2 uTexel;
    uniform float uMaxBlur;

    void main() {
      vec4 center = texture2D(tDiffuse, vUv);
      float rawDepth = texture2D(tDepth, vUv).x;
      float dist = -perspectiveDepthToViewZ(rawDepth, uNear, uFar);
      float farFactor = clamp((dist - (uFocus + 9.0)) / 42.0, 0.0, 1.0);

      if (farFactor < 0.04) {
        gl_FragColor = center;
        return;
      }

      float r = farFactor * uMaxBlur;
      vec4 acc = center;
      acc += texture2D(tDiffuse, vUv + vec2( 1.0,  0.0) * uTexel * r);
      acc += texture2D(tDiffuse, vUv + vec2(-1.0,  0.0) * uTexel * r);
      acc += texture2D(tDiffuse, vUv + vec2( 0.0,  1.0) * uTexel * r);
      acc += texture2D(tDiffuse, vUv + vec2( 0.0, -1.0) * uTexel * r);
      acc += texture2D(tDiffuse, vUv + vec2( 0.7,  0.7) * uTexel * r * 0.85);
      acc += texture2D(tDiffuse, vUv + vec2(-0.7,  0.7) * uTexel * r * 0.85);
      acc += texture2D(tDiffuse, vUv + vec2( 0.7, -0.7) * uTexel * r * 0.85);
      acc += texture2D(tDiffuse, vUv + vec2(-0.7, -0.7) * uTexel * r * 0.85);
      gl_FragColor = acc / 9.0;
    }
  `,
};

interface MobEntity {
  id: number;
  kind: MobKind;
  visual: MobVisual;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  attackTimer: number;
  hitFlash: number;
  walkPhase: number;
  wanderAngle: number;
  wanderTimer: number;
}

interface PeacefulMobEntity {
  id: number;
  kind: PeacefulMobKind;
  visual: PeacefulMobVisual;
  homeX: number;
  homeZ: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  walkPhase: number;
  wanderAngle: number;
  wanderTimer: number;
  fleeTimer: number;
}

interface ResourceNodeEntity {
  id: number;
  kind: Exclude<ResourceId, 'hide'>;
  label: string;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  available: boolean;
  respawnTimer: number;
}

interface Projectile {
  mesh: THREE.Object3D;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  damage: number;
  knockback: number;
  gravity: number;
  color: number;
  isBullet?: boolean;
}

interface Particle {
  mesh: THREE.Object3D;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  scale: number;
  grow: number;
  bounce?: boolean;
  dropBulletOnLand?: boolean;
}

interface PickupItem {
  mesh: THREE.Object3D;
  kind: 'coin' | 'heal' | 'bullet';
  x: number;
  y: number;
  z: number;
  value: number;
  phase: number;
  pickupDelay?: number;
}

interface ShockwaveFx {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  startScale: number;
  maxScale: number;
}

interface CabinMount {
  site: CabinSite;
  roofGroup: THREE.Group;
  hearthLight: THREE.PointLight;
  hearthFlame: THREE.Mesh;
  workbenchPos: THREE.Vector3;
  bedPos: THREE.Vector3;
}

interface ChestEntity {
  group: THREE.Group;
  lid: THREE.Mesh;
  x: number;
  z: number;
  opened: boolean;
  indoor?: boolean;
}

const RESOURCE_LABELS: Record<Exclude<ResourceId, 'hide'>, string> = {
  wood: 'Деревина',
  stone: 'Камінь',
  iron: 'Залізна руда',
  herb: 'Лікувальні трави',
  essence: 'Кристал есенції',
};

export class BlocklandWorld {
  private container: HTMLElement;
  private onHudUpdate: (state: GameHudState) => void;
  private onContextLostCb?: () => void;
  private onOpenCraftCb?: () => void;

  private renderer!: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private dofPass: ShaderPass | null = null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private sunLight!: THREE.DirectionalLight;
  private textures!: ProceduralTextures;
  private env!: WorldEnvironment;
  private playerRig!: PlayerRig;

  private cabins: CabinMount[] = [];

  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private lastRenderMs = 0;
  private renderCount = 0;
  private currentFps = 60;
  private currentFrameMs = 16;
  private fpsSamples = 0;
  private fpsWindowStart = performance.now();

  private dofEnabled = true;
  private shadowUpscale = false;
  private ecoMode = true;
  private autoFollowCam = false;
  private modalOpen = false;

  private phase: 'title' | 'playing' | 'dead' = 'playing';
  private px = -2;
  private py = 2;
  private pz = 9;
  private pvx = 0;
  private pvy = 0;
  private pvz = 0;
  private playerYaw = Math.PI * 0.92;
  private grounded = true;
  private inWater = false;
  private insideCabin = false;
  private walkPhase = 0;
  private attackAnim = 0;
  private attackCooldown = 0;
  private activeWeapon: WeaponId = 'sword';

  private hp = 100;
  private maxHp = 100;
  private stamina = 100;
  private maxStamina = 100;
  private xp = 0;
  private xpToNext = 100;
  private level = 1;
  private coins = 0;
  private ammoBullets = 6;
  private kills = 0;
  private wave = 1;
  private hurtCooldown = 0;

  // Inventory & crafting progression
  private resources: Record<ResourceId, number> = {
    wood: 2,
    stone: 1,
    iron: 0,
    herb: 2,
    essence: 0,
    hide: 0,
  };
  private consumables: Record<ConsumableId, number> = {
    potion: 1,
    tonic: 0,
    stew: 0,
  };
  private upgrades = new Set<UpgradeId>();
  private villagerGreeted = false;

  // Camera orbit & bobbing state
  private camYaw = -0.18;
  private camPitch = 0.24;
  private camDist = 6.2;
  private targetCamDist = 6.2;
  private isDraggingCam = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastDragX = 0;
  private lastDragY = 0;
  private lastHoverX: number | null = null;
  private lastHoverY: number | null = null;
  private dragMoved = false;
  private pointerLocked = false;
  private camBobPhase = 0;
  private camBobAmt = 0;
  private camLandingDip = 0;

  private keys: Record<string, boolean> = {};
  private touchMoveX = 0;
  private touchMoveZ = 0;

  private mobs: MobEntity[] = [];
  private peacefulMobs: PeacefulMobEntity[] = [];
  private resourceNodes: ResourceNodeEntity[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private pickups: PickupItem[] = [];
  private chests: ChestEntity[] = [];
  private slashArcMesh!: THREE.Mesh;
  private slashArcLife = 0;
  private shockwaves: ShockwaveFx[] = [];
  private campfirePos = new THREE.Vector3(-9, 0, -14.5);
  private campfireFlame!: THREE.Mesh;
  private campfireLight!: THREE.PointLight;
  private ruinCrystal: THREE.Object3D | null = null;

  private nextMobId = 1;
  private nextFeedId = 1;
  private killFeed: KillFeedItem[] = [];
  private hudThrottle = 0;
  private waveClearDelay = 0;

  private sparkGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  private coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12);
  private healGeo = new THREE.OctahedronGeometry(0.32, 0);
  private shockwaveGeo = new THREE.RingGeometry(0.45, 1.15, 28);
  private blastPuffMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.78 });

  constructor(
    container: HTMLElement,
    onHudUpdate: (state: GameHudState) => void,
    onContextLostCb?: () => void,
    onOpenCraftCb?: () => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextLostCb = onContextLostCb;
    this.onOpenCraftCb = onOpenCraftCb;

    this.initScene();
    this.bindEvents();
    this.spawnPeacefulMobs();
    this.spawnResourceNodes();
    this.spawnWave(1);
    this.pushFeed('Заходьте в хатинку, збирайте ресурси та крафтіть спорядження!');
    this.emitHud();
    this.startLoop();
  }

  private detectSoftwareGl(): boolean {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initScene() {
    this.isSoftwareGl = this.detectSoftwareGl();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.applyRenderScale();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const mistColor = new THREE.Color(0xcbdde6);
    this.scene.background = mistColor;
    this.scene.fog = new THREE.FogExp2(0xcbdde6, 0.0046);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.15, 460);

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e3312, 0.56);
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xffe6b3, 3.15);
    this.sunLight.position.set(-26, 28, -32);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowSize = this.shadowUpscale ? 4096 : 2048;
    this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 115;
    this.sunLight.shadow.radius = 1.4;
    this.sunLight.shadow.bias = -0.00022;
    this.sunLight.shadow.normalBias = 0.016;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.34);
    rimLight.position.set(28, 18, 30);
    this.scene.add(rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    this.env = buildWorldEnvironment(this.textures);
    this.scene.add(this.env.group);

    // Rare Enterable Cabins across the wide open valley
    for (const site of CABIN_SITES) {
      const cabinVisual = buildCabin(this.textures);
      cabinVisual.group.position.set(site.x, cabinBaseY(site), site.z);
      cabinVisual.group.rotation.y = site.rot;
      this.scene.add(cabinVisual.group);
      const wbWorld = fromCabinLocal(-2.1, -0.65, site);
      const bedWorld = fromCabinLocal(2.55, -2.15, site);
      const indoorChestWorld = fromCabinLocal(-2.75, 1.95, site);
      this.cabins.push({
        site,
        roofGroup: cabinVisual.roofGroup,
        hearthLight: cabinVisual.hearthLight,
        hearthFlame: cabinVisual.hearthFlame,
        workbenchPos: new THREE.Vector3(wbWorld.x, cabinBaseY(site) + 0.82, wbWorld.z),
        bedPos: new THREE.Vector3(bedWorld.x, cabinBaseY(site) + 0.65, bedWorld.z),
      });
      this.chests.push({
        group: cabinVisual.group,
        lid: cabinVisual.indoorChestLid,
        x: indoorChestWorld.x,
        z: indoorChestWorld.z,
        opened: false,
        indoor: true,
      });
      if (site.id !== 'main') {
        const porchChestPos = fromCabinLocal(5.2, 1.5, site);
        this.createChest(porchChestPos.x, porchChestPos.z, site.rot - 0.6);
      }
    }

    // Campfire outside main cabin front-right
    const fire = buildCampfire();
    this.campfirePos.set(-7.2, groundHeightAt(-7.2, -14.5), -14.5);
    fire.group.position.copy(this.campfirePos);
    this.campfireFlame = fire.flame;
    this.campfireLight = fire.light;
    this.scene.add(fire.group);

    // Arched bridge across river
    const bridge = buildArchedBridge(this.textures);
    this.scene.add(bridge);

    // Stone ruins across the river at (46, -24)
    const ruins = buildStoneRuins(this.textures);
    ruins.position.set(46, groundHeightAt(46, -24) - 0.15, -24);
    this.ruinCrystal = ruins.getObjectByName('ruinCrystal') || null;
    this.scene.add(ruins);
    this.env.colliders.push({ x: 46, z: -24, radius: 1.6 });

    // Treasure chests across expanded landmarks
    this.createChest(-21, -24, 0.6);
    this.createChest(riverCenterX(BRIDGE_Z) + 12, BRIDGE_Z + 5.5, -1.2);
    this.createChest(49, -20, -2.3);
    this.createChest(-62, 42, 0.8);
    this.createChest(-14, -92, -0.4);
    this.createChest(84, 46, -1.9);

    // Player avatar
    this.playerRig = buildRobloxPlayer(this.textures);
    this.py = walkableHeightAt(this.px, this.pz);
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.scene.add(this.playerRig.root);

    this.slashArcMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 2.55, 20, 1, -Math.PI * 0.45, Math.PI * 0.9),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.slashArcMesh.rotation.x = -Math.PI / 2;
    this.slashArcMesh.visible = false;
    this.scene.add(this.slashArcMesh);

    this.shockwaveGeo.rotateX(-Math.PI / 2);

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      const pr = this.renderer.getPixelRatio();
      this.composer.setPixelRatio(pr);
      this.composer.setSize(width, height);

      this.composer.renderTarget1.depthBuffer = false;
      this.composer.renderTarget2.depthTexture = new THREE.DepthTexture(
        Math.max(1, Math.floor(width * pr)),
        Math.max(1, Math.floor(height * pr)),
      );

      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      this.dofPass = new ShaderPass(FastDofShader);
      this.dofPass.uniforms['tDepth'].value = this.composer.renderTarget2.depthTexture;
      this.dofPass.uniforms['uNear'].value = this.camera.near;
      this.dofPass.uniforms['uFar'].value = this.camera.far;
      this.dofPass.uniforms['uTexel'].value.set(1 / Math.max(1, width), 1 / Math.max(1, height));
      this.composer.addPass(this.dofPass);

      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);

      this.renderer.compile(this.scene, this.camera);
    }
  }

  private applyRenderScale() {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
    } else {
      const cap = this.ecoMode ? 1.2 : 1.65;
      const mult = this.shadowUpscale && !this.ecoMode ? 1.15 : 1.0;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * mult, cap));
    }
  }

  private createChest(x: number, z: number, rotY: number) {
    const group = new THREE.Group();
    const y = groundHeightAt(x, z);
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const woodMat = new THREE.MeshStandardMaterial({ map: this.textures.woodPlank, roughness: 0.78 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.72, 0.92), woodMat);
    base.position.y = 0.36;
    const bandL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.96), goldMat);
    bandL.position.set(-0.42, 0.36, 0);
    const bandR = bandL.clone();
    bandR.position.x = 0.42;

    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.3, 0.94), woodMat);
    lid.position.set(0, 0.86, 0);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.1), goldMat);
    lock.position.set(0, 0.7, 0.48);

    group.add(base, bandL, bandR, lid, lock);
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.castShadow = true;
    });
    this.scene.add(group);
    this.chests.push({ group, lid, x, z, opened: false });
  }

  private spawnPeacefulMobs() {
    // 1. Friendly Ranger Орест near cabin campfire
    const rangerVis = buildPeacefulMobModel('villager', this.textures);
    const rx = -5.2;
    const rz = -13.2;
    const ry = groundHeightAt(rx, rz);
    rangerVis.root.position.set(rx, ry, rz);
    this.scene.add(rangerVis.root);
    this.peacefulMobs.push({
      id: this.nextMobId++,
      kind: 'villager',
      visual: rangerVis,
      homeX: rx,
      homeZ: rz,
      x: rx,
      y: ry,
      z: rz,
      vx: 0,
      vz: 0,
      yaw: 0.3,
      walkPhase: 0,
      wanderAngle: 0.3,
      wanderTimer: 4,
      fleeTimer: 0,
    });

    // 2. Grazing sheep across sunny meadows & western lumber camp
    const sheepSpots: [number, number][] = [
      [-18, 12],
      [-23, 18],
      [-48, 34],
      [-56, 46],
      [6, 28],
      [-8, -42],
      [-98, 66],
      [96, -12],
    ];
    for (const [sx, sz] of sheepSpots) {
      const vis = buildPeacefulMobModel('sheep', this.textures);
      const sy = groundHeightAt(sx, sz);
      vis.root.position.set(sx, sy, sz);
      this.scene.add(vis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind: 'sheep',
        visual: vis,
        homeX: sx,
        homeZ: sz,
        x: sx,
        y: sy,
        z: sz,
        vx: 0,
        vz: 0,
        yaw: Math.random() * Math.PI * 2,
        walkPhase: Math.random() * 5,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderTimer: 2 + Math.random() * 4,
        fleeTimer: 0,
      });
    }

    // 3. Woodland deer across northern forest & eastern highlands
    const deerSpots: [number, number][] = [
      [-32, -38],
      [-18, -74],
      [4, -84],
      [58, 16],
      [74, 38],
      [-74, -18],
      [-58, -118],
      [112, 74],
    ];
    for (const [dx, dz] of deerSpots) {
      const vis = buildPeacefulMobModel('deer', this.textures);
      const dy = groundHeightAt(dx, dz);
      vis.root.position.set(dx, dy, dz);
      this.scene.add(vis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind: 'deer',
        visual: vis,
        homeX: dx,
        homeZ: dz,
        x: dx,
        y: dy,
        z: dz,
        vx: 0,
        vz: 0,
        yaw: Math.random() * Math.PI * 2,
        walkPhase: Math.random() * 5,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderTimer: 2 + Math.random() * 4,
        fleeTimer: 0,
      });
    }
  }

  private spawnResourceNodes() {
    const spots: { kind: Exclude<ResourceId, 'hide'>; x: number; z: number }[] = [
      // Near spawn & cabin meadow
      { kind: 'herb', x: -8, z: 4 },
      { kind: 'herb', x: -16, z: -8 },
      { kind: 'herb', x: 3, z: -2 },
      { kind: 'wood', x: -24, z: -12 },
      { kind: 'wood', x: -20, z: 22 },
      { kind: 'stone', x: -28, z: 6 },
      { kind: 'stone', x: 7, z: -26 },
      // Western Lumber Camp (-62, 42)
      { kind: 'wood', x: -56, z: 36 },
      { kind: 'wood', x: -66, z: 46 },
      { kind: 'wood', x: -58, z: 52 },
      { kind: 'herb', x: -46, z: 26 },
      { kind: 'iron', x: -72, z: 38 },
      { kind: 'stone', x: -52, z: 58 },
      // Northern Pine Forest (-14, -92)
      { kind: 'wood', x: -10, z: -64 },
      { kind: 'wood', x: -22, z: -84 },
      { kind: 'herb', x: -6, z: -78 },
      { kind: 'herb', x: -24, z: -96 },
      { kind: 'essence', x: -18, z: -104 },
      { kind: 'essence', x: -4, z: -92 },
      { kind: 'iron', x: -28, z: -72 },
      // Riverbanks & Stone Ruins (46, -24)
      { kind: 'herb', x: 28, z: -4 },
      { kind: 'stone', x: 38, z: -14 },
      { kind: 'iron', x: 52, z: -32 },
      { kind: 'iron', x: 56, z: -18 },
      { kind: 'essence', x: 42, z: -36 },
      { kind: 'essence', x: 58, z: -26 },
      // Eastern Highlands (84, 46)
      { kind: 'stone', x: 72, z: 32 },
      { kind: 'stone', x: 88, z: 52 },
      { kind: 'iron', x: 78, z: 48 },
      { kind: 'iron', x: 92, z: 38 },
      { kind: 'essence', x: 86, z: 62 },
      { kind: 'herb', x: 64, z: 22 },
      { kind: 'wood', x: 52, z: 44 },
      // Southern glade
      { kind: 'herb', x: -12, z: 44 },
      { kind: 'stone', x: 26, z: 52 },
      { kind: 'iron', x: 36, z: 64 },
    ];

    spots.forEach((s, idx) => {
      const y = groundHeightAt(s.x, s.z);
      if (y < WATER_LEVEL + 0.1) return;
      const mesh = buildResourceNodeModel(s.kind);
      mesh.position.set(s.x, y, s.z);
      mesh.rotation.y = (idx * 1.7) % (Math.PI * 2);
      this.scene.add(mesh);
      this.resourceNodes.push({
        id: idx + 1,
        kind: s.kind,
        label: RESOURCE_LABELS[s.kind],
        mesh,
        x: s.x,
        y,
        z: s.z,
        available: true,
        respawnTimer: 0,
      });
    });
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    const dom = this.renderer.domElement;
    dom.tabIndex = 0;
    dom.style.outline = 'none';
    dom.style.touchAction = 'none';
    dom.focus({ preventScroll: true });
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointerenter', this.onPointerEnter);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('contextmenu', this.onContextMenu);
    dom.addEventListener('webglcontextlost', this.onWebglLost);
  }

  public setModalOpen(open: boolean) {
    this.modalOpen = open;
    this.lastHoverX = null;
    this.lastHoverY = null;
    if (open) {
      this.isDraggingCam = false;
      this.keys = {};
    }
  }

  private onPointerEnter = (e: PointerEvent) => {
    this.lastHoverX = e.clientX;
    this.lastHoverY = e.clientY;
  };

  private onVisibilityChange = () => {
    if (!document.hidden) {
      this.clock.getDelta();
      this.lastRenderMs = performance.now();
    }
  };

  private onWindowBlur = () => {
    this.keys = {};
    this.isDraggingCam = false;
    this.lastHoverX = null;
    this.lastHoverY = null;
  };

  private onWebglLost = (e: Event) => {
    e.preventDefault();
    this.onContextLostCb?.();
  };

  private onContextMenu = (e: MouseEvent) => e.preventDefault();

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
      if (this.dofPass && this.composer.renderTarget2.depthTexture) {
        this.dofPass.uniforms['tDepth'].value = this.composer.renderTarget2.depthTexture;
        this.dofPass.uniforms['uTexel'].value.set(1 / Math.max(1, w), 1 / Math.max(1, h));
      }
    }
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHud();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    if (this.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      this.startGame();
      return;
    }
    if (this.phase !== 'playing') return;

    if (e.code === 'Digit1') this.setWeapon('sword');
    else if (e.code === 'Digit2') this.setWeapon('hammer');
    else if (e.code === 'Digit3') this.setWeapon('blaster');
    else if (e.code === 'Digit4') this.setWeapon('bow');
    else if (e.code === 'Digit5') this.useConsumable('potion');
    else if (e.code === 'Digit6') this.useConsumable('tonic');
    else if (e.code === 'Digit7') this.useConsumable('stew');
    else if (e.code === 'KeyF') this.triggerAttack();
    else if (e.code === 'KeyG') this.throwBullet();
    else if (e.code === 'KeyE') this.interactNearby();
    else if (e.code === 'KeyL') this.toggleCameraMode();
    else if (e.code === 'KeyR') this.teleportToCabin();
    else if (e.code === 'Space') {
      e.preventDefault();
      this.jump();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onPointerDown = (e: PointerEvent) => {
    soundEngine.unlock();
    window.focus();
    this.renderer.domElement.focus({ preventScroll: true });
    if (this.phase !== 'playing') return;

    if (this.pointerLocked) {
      if (e.button === 0) this.triggerAttack();
      else if (e.button === 2) this.throwBullet();
      return;
    }

    this.isDraggingCam = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastDragX = e.clientX;
    this.lastDragY = e.clientY;
    this.dragMoved = false;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.phase !== 'playing') return;
    if (this.pointerLocked) {
      this.camYaw -= e.movementX * 0.0032;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + e.movementY * 0.0028, -0.15, 1.15);
      return;
    }
    if (this.isDraggingCam) {
      const dx = e.clientX - this.lastDragX;
      const dy = e.clientY - this.lastDragY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      this.lastHoverX = e.clientX;
      this.lastHoverY = e.clientY;

      if (Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY) > 5) {
        this.dragMoved = true;
      }
      this.camYaw -= dx * 0.0068;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0052, -0.15, 1.15);
      return;
    }

    // Free mouse camera look when hovering over the game canvas without modals open
    if (!this.modalOpen && e.pointerType !== 'touch' && e.target === this.renderer.domElement) {
      if (this.lastHoverX !== null && this.lastHoverY !== null) {
        const dx = e.clientX - this.lastHoverX;
        const dy = e.clientY - this.lastHoverY;
        if (Math.abs(dx) + Math.abs(dy) < 160) {
          this.camYaw -= dx * 0.0044;
          this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0034, -0.15, 1.15);
        }
      }
      this.lastHoverX = e.clientX;
      this.lastHoverY = e.clientY;
    } else {
      this.lastHoverX = null;
      this.lastHoverY = null;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.isDraggingCam && !this.dragMoved && this.phase === 'playing') {
      if (e.button === 0) this.triggerAttack();
      else if (e.button === 2) this.throwBullet();
    }
    this.isDraggingCam = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.targetCamDist = THREE.MathUtils.clamp(this.targetCamDist + e.deltaY * 0.008, 3.0, 19);
  };

  public startGame() {
    soundEngine.unlock();
    this.phase = 'playing';
    this.emitHud();
  }

  public respawnPlayer() {
    soundEngine.unlock();
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.px = -2;
    this.pz = 9;
    this.py = walkableHeightAt(this.px, this.pz);
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.phase = 'playing';
    this.pushFeed('Відродження на галявині');
    this.emitHud();
  }

  public teleportToCabin() {
    soundEngine.unlock();
    if (this.phase === 'title') this.phase = 'playing';
    const front = fromCabinLocal(0, 6.2);
    this.px = front.x;
    this.pz = front.z;
    this.py = walkableHeightAt(this.px, this.pz);
    this.pvy = 0;
    this.playerYaw = CABIN_ROT + Math.PI;
    this.pushFeed('Телепорт до входу в хатинку');
    this.emitHud();
  }

  public teleportToRiver() {
    soundEngine.unlock();
    if (this.phase === 'title') this.phase = 'playing';
    this.px = riverCenterX(BRIDGE_Z + 12);
    this.pz = BRIDGE_Z + 12;
    this.py = WATER_LEVEL - 0.8;
    this.pvy = 0;
    this.pushFeed('Стрибок у річку');
    this.emitHud();
  }

  public setWeapon(id: WeaponId) {
    soundEngine.unlock();
    if (this.activeWeapon !== id) {
      soundEngine.playEquip(id);
    }
    this.activeWeapon = id;
    (Object.keys(this.playerRig.weapons) as WeaponId[]).forEach((wId) => {
      this.playerRig.weapons[wId].visible = wId === id;
    });
    this.emitHud();
  }

  public toggleMute(): boolean {
    soundEngine.muted = !soundEngine.muted;
    if (!soundEngine.muted) {
      soundEngine.unlock();
      soundEngine.playPickup();
    }
    this.emitHud();
    return soundEngine.muted;
  }

  public toggleDof() {
    this.dofEnabled = !this.dofEnabled;
    if (this.dofPass) {
      this.dofPass.enabled = this.dofEnabled;
    }
    this.pushFeed(this.dofEnabled ? 'Розмиття фону увімкнено' : 'Розмиття фону вимкнено');
    this.emitHud();
  }

  public toggleEcoMode() {
    this.ecoMode = !this.ecoMode;
    this.applyRenderScale();
    if (this.composer) {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
      if (this.dofPass && this.composer.renderTarget2.depthTexture) {
        this.dofPass.uniforms['tDepth'].value = this.composer.renderTarget2.depthTexture;
      }
    }
    this.pushFeed(
      this.ecoMode
        ? 'Еко GPU: 60 FPS, менше нагріву відеокарти'
        : 'Макс GPU: повна роздільність та частота кадрів',
    );
    this.emitHud();
  }

  public toggleShadowUpscale() {
    this.shadowUpscale = !this.shadowUpscale;
    this.applyRenderScale();
    if (this.composer) {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
      if (this.dofPass && this.composer.renderTarget2.depthTexture) {
        this.dofPass.uniforms['tDepth'].value = this.composer.renderTarget2.depthTexture;
      }
    }
    if (!this.isSoftwareGl) {
      const size = this.shadowUpscale ? 4096 : 2048;
      this.sunLight.shadow.mapSize.set(size, size);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.pushFeed(this.shadowUpscale ? 'Тіні: Ультра (4K)' : 'Тіні: Оптимальні (2K)');
    this.emitHud();
  }

  public toggleCameraMode() {
    soundEngine.unlock();
    if (this.pointerLocked) {
      document.exitPointerLock?.();
      this.autoFollowCam = true;
      this.emitHud();
      return;
    }

    try {
      const res = this.renderer.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (res && typeof res.catch === 'function') {
        res.catch(() => {
          this.autoFollowCam = !this.autoFollowCam;
          this.pushFeed(this.autoFollowCam ? 'Авто-камера увімкнена' : 'Вільна камера');
          this.emitHud();
        });
      } else {
        this.autoFollowCam = !this.autoFollowCam;
        this.pushFeed(this.autoFollowCam ? 'Авто-камера увімкнена' : 'Вільна камера');
      }
    } catch {
      this.autoFollowCam = !this.autoFollowCam;
      this.pushFeed(this.autoFollowCam ? 'Авто-камера увімкнена' : 'Вільна камера');
    }
    this.emitHud();
  }

  public setTouchMove(mx: number, mz: number) {
    this.touchMoveX = mx;
    this.touchMoveZ = mz;
  }

  public jump() {
    soundEngine.unlock();
    if (this.phase === 'title') this.startGame();
    if (this.phase !== 'playing') return;
    if (this.inWater) {
      this.pvy = 6.2;
      soundEngine.playSplash();
      return;
    }
    if (this.grounded) {
      this.pvy = 9.4;
      this.grounded = false;
      soundEngine.playJumpFart();
      this.spawnJumpBullets();
    }
  }

  private spawnJumpBullets() {
    const backX = -Math.sin(this.playerYaw);
    const backZ = -Math.cos(this.playerYaw);
    const startX = this.px + backX * 0.45;
    const startY = this.py + 0.9;
    const startZ = this.pz + backZ * 0.45;

    // 3 explosive brass/orange bullets shooting backward; leave shockwave & pickup on landing
    for (let i = 0; i < 3; i++) {
      const mesh = buildBulletModel(0.92);
      mesh.position.set(
        startX + (Math.random() - 0.5) * 0.22,
        startY + (Math.random() - 0.5) * 0.14,
        startZ + (Math.random() - 0.5) * 0.22,
      );
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.scene.add(mesh);

      const spread = (Math.random() - 0.5) * 0.85;
      const dirX = backX + backZ * spread;
      const dirZ = backZ - backX * spread;
      const spd = 4.0 + Math.random() * 2.8;
      this.particles.push({
        mesh,
        vx: dirX * spd,
        vy: 1.8 + Math.random() * 2.0,
        vz: dirZ * spd,
        life: 3.5,
        scale: 1.0,
        grow: 0,
        bounce: true,
        dropBulletOnLand: true,
      });
    }

    // Glowing orange shockwave blast puffs
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.blastPuffMat);
      mesh.position.set(startX, startY, startZ);
      this.scene.add(mesh);
      const spread = (Math.random() - 0.5) * 1.1;
      this.particles.push({
        mesh,
        vx: (backX + backZ * spread) * (2.2 + Math.random() * 2.2),
        vy: -0.2 + Math.random() * 1.5,
        vz: (backZ - backX * spread) * (2.2 + Math.random() * 2.2),
        life: 0.4 + Math.random() * 0.22,
        scale: 1.0 + Math.random() * 0.55,
        grow: 1.9,
      });
    }
  }

  public throwBullet() {
    soundEngine.unlock();
    if (this.phase === 'title') this.startGame();
    if (this.phase !== 'playing') return;

    if (this.ammoBullets <= 0) {
      this.pushFeed('Немає куль — підберіть кулі після стрибка (Пробіл)!');
      this.emitHud();
      return;
    }

    this.ammoBullets--;
    this.attackAnim = 0.85;
    this.playerYaw = this.camYaw + Math.PI;
    soundEngine.playBlasterShot();

    const dirX = -Math.sin(this.camYaw) * Math.cos(this.camPitch * 0.42);
    const dirY = -Math.sin(this.camPitch * 0.42) + 0.14;
    const dirZ = -Math.cos(this.camYaw) * Math.cos(this.camPitch * 0.42);
    _v1.set(dirX, dirY, dirZ).normalize();

    const mesh = buildBulletModel(1.25);
    const startX = this.px + _v1.x * 1.0;
    const startY = this.py + 1.55;
    const startZ = this.pz + _v1.z * 1.0;
    mesh.position.set(startX, startY, startZ);
    mesh.lookAt(startX + _v1.x, startY + _v1.y, startZ + _v1.z);
    this.scene.add(mesh);

    const speed = 27;
    this.projectiles.push({
      mesh,
      x: startX,
      y: startY,
      z: startZ,
      vx: _v1.x * speed,
      vy: _v1.y * speed,
      vz: _v1.z * speed,
      life: 2.2,
      damage: 54,
      knockback: 15,
      gravity: 10.5,
      color: 0xff5a1f,
      isBullet: true,
    });

    this.emitHud();
  }

  private spawnShockwave(x: number, y: number, z: number, color: number, maxScale: number, duration: number) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.shockwaveGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(0.35);
    this.scene.add(mesh);
    this.shockwaves.push({
      mesh,
      life: duration,
      maxLife: duration,
      startScale: 0.35,
      maxScale,
    });
  }

  private detonateBullet(x: number, y: number, z: number, radius: number, damage: number, big: boolean) {
    soundEngine.playExplosion();
    this.spawnShockwave(x, y + 0.12, z, 0xf97316, big ? 5.2 : 2.8, big ? 0.38 : 0.28);
    if (big) {
      this.spawnShockwave(x, y + 0.18, z, 0xfef08a, 3.2, 0.24);
    }
    this.spawnBurst(x, y + 0.45, z, 0xf97316, big ? 18 : 8);
    this.spawnBurst(x, y + 0.65, z, 0xfef08a, big ? 10 : 5);

    let anyHit = false;
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      const dx = m.x - x;
      const dz = m.z - z;
      const dist = Math.hypot(dx, dz);
      const def = MOB_DEFS[m.kind];
      if (dist <= radius + def.radius) {
        anyHit = true;
        this.damageMob(m, i, damage, dx, dz, dist, big ? 15 : 8, 0xff5a1f);
      }
    }
    if (anyHit) {
      soundEngine.playHit(big);
    }

    // Shockwave startles and scatters peaceful mobs too!
    for (const pm of this.peacefulMobs) {
      if (pm.kind === 'villager') continue;
      const dx = pm.x - x;
      const dz = pm.z - z;
      const dist = Math.hypot(dx, dz);
      if (dist < radius + 4.5) {
        pm.fleeTimer = 3.5;
        pm.wanderAngle = dist > 0.05 ? Math.atan2(dx, dz) : Math.random() * Math.PI * 2;
      }
    }

    if (big) {
      this.hitResourceNodesNear(x, z, 2.8);
    }
  }

  public craftRecipe(recipeId: string): boolean {
    soundEngine.unlock();
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    if (recipe.outputUpgrade && this.upgrades.has(recipe.outputUpgrade)) {
      this.pushFeed(`Вже створено: ${recipe.name}`);
      return false;
    }

    for (const [resKey, amt] of Object.entries(recipe.cost) as [ResourceId, number][]) {
      if ((this.resources[resKey] ?? 0) < amt) {
        return false;
      }
    }
    if (recipe.coinsCost && this.coins < recipe.coinsCost) return false;

    for (const [resKey, amt] of Object.entries(recipe.cost) as [ResourceId, number][]) {
      this.resources[resKey] -= amt;
    }
    if (recipe.coinsCost) this.coins -= recipe.coinsCost;

    if (recipe.outputConsumable) {
      this.consumables[recipe.outputConsumable] += recipe.outputCount ?? 1;
    }
    if (recipe.outputUpgrade) {
      this.upgrades.add(recipe.outputUpgrade);
      if (recipe.outputUpgrade === 'armor_ranger') {
        this.maxHp += 45;
        this.hp = Math.min(this.maxHp, this.hp + 45);
        this.playerRig.armorGroup.visible = true;
      }
    }

    soundEngine.playCraft();
    this.spawnBurst(this.px, this.py + 1.4, this.pz, 0x38bdf8, 16);
    this.pushFeed(`Створено: ${recipe.name}`);
    this.emitHud();
    return true;
  }

  public useConsumable(id: ConsumableId): boolean {
    soundEngine.unlock();
    if (this.phase !== 'playing' || this.consumables[id] <= 0) return false;

    if (id === 'potion') {
      if (this.hp >= this.maxHp) return false;
      this.consumables.potion--;
      this.hp = Math.min(this.maxHp, this.hp + 50);
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0x4ade80, 12);
      this.pushFeed('Використано зілля (+50 HP)');
    } else if (id === 'tonic') {
      this.consumables.tonic--;
      this.stamina = Math.min(this.maxStamina, this.stamina + 70);
      this.hp = Math.min(this.maxHp, this.hp + 15);
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0x38bdf8, 12);
      this.pushFeed('Трав’яний тонік (+70 витривалості)');
    } else {
      this.consumables.stew--;
      this.hp = Math.min(this.maxHp, this.hp + 85);
      this.stamina = this.maxStamina;
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0xfbbf24, 14);
      this.pushFeed('Мисливська юшка (+85 HP)');
    }

    soundEngine.playPickup();
    this.emitHud();
    return true;
  }

  private harvestResourceNode(node: ResourceNodeEntity) {
    if (!node.available) return;
    node.available = false;
    node.respawnTimer = 35;
    node.mesh.visible = false;

    const amount = node.kind === 'herb' || node.kind === 'wood' ? 2 : 1 + (Math.random() < 0.35 ? 1 : 0);
    this.resources[node.kind] += amount;
    this.grantXp(10);
    soundEngine.playPickup();

    const fxColor =
      node.kind === 'essence'
        ? 0xc084fc
        : node.kind === 'iron'
          ? 0x60a5fa
          : node.kind === 'herb'
            ? 0x4ade80
            : 0xfbbf24;
    this.spawnBurst(node.x, node.y + 0.7, node.z, fxColor, 10);
    this.pushFeed(`Зібрано: ${node.label} (+${amount})`);
    this.emitHud();
  }

  public interactNearby() {
    soundEngine.unlock();

    // 1. Open nearby chest (outdoor or cabin indoor supply chest)
    for (const chest of this.chests) {
      if (!chest.opened && Math.hypot(this.px - chest.x, this.pz - chest.z) < 3.4) {
        chest.opened = true;
        chest.lid.rotation.x = -0.85;
        if (chest.indoor) {
          chest.lid.position.set(0, 0.88, -0.25);
        } else {
          chest.lid.position.set(0, 1.08, -0.35);
        }
        this.coins += 50;
        this.resources.iron += 2;
        this.resources.hide += 1;
        this.resources.essence += 1;
        this.ammoBullets += 2;
        this.hp = Math.min(this.maxHp, this.hp + 35);
        this.grantXp(45);
        soundEngine.playPickup();
        this.spawnBurst(chest.x, walkableHeightAt(chest.x, chest.z) + 1.0, chest.z, 0xfbbf24, 14);
        this.pushFeed('Скриня: +50 мон., +2 Залізо, +1 Шкіра, +1 Есенція, +2 Кулі');
        this.emitHud();
        return;
      }
    }

    // 2. Rest on cabin bed (full heal + stamina + bonus bullets)
    if (this.cabins.some((c) => Math.hypot(this.px - c.bedPos.x, this.pz - c.bedPos.z) < 2.8)) {
      this.hp = this.maxHp;
      this.stamina = this.maxStamina;
      this.ammoBullets = Math.max(this.ammoBullets, 4) + 2;
      soundEngine.playPickup();
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0xfde047, 16);
      this.pushFeed('Відпочили на ліжку в хатинці: повне HP, витривалість та +2 кулі!');
      this.emitHud();
      return;
    }

    // 3. Harvest nearby resource node
    for (const node of this.resourceNodes) {
      if (node.available && Math.hypot(this.px - node.x, this.pz - node.z) < 3.2) {
        this.harvestResourceNode(node);
        return;
      }
    }

    // 4. Use Any Cabin Workbench
    if (this.cabins.some((c) => Math.hypot(this.px - c.workbenchPos.x, this.pz - c.workbenchPos.z) < 2.9)) {
      this.onOpenCraftCb?.();
      return;
    }

    // 4. Talk to Лісник Орест
    const villager = this.peacefulMobs.find((p) => p.kind === 'villager');
    if (villager && Math.hypot(this.px - villager.x, this.pz - villager.z) < 3.8) {
      soundEngine.playPickup();
      this.hp = Math.min(this.maxHp, this.hp + 25);
      if (!this.villagerGreeted) {
        this.villagerGreeted = true;
        this.resources.wood += 2;
        this.resources.herb += 2;
        this.coins += 15;
        this.pushFeed('Лісник Орест: «Тримай дерево й трави, верстак усередині хатинки!»');
      } else {
        this.pushFeed('Орест: «На півночі — Бір з есенцією, на сході — Нагір’я із залізом!» (+25 HP)');
      }
      this.emitHud();
    }
  }

  public spawnMobNearPlayer(kind: MobKind) {
    soundEngine.unlock();
    if (this.phase === 'title') this.startGame();
    const angle = this.playerYaw + (Math.random() - 0.5) * 0.9;
    const dist = 7.0 + Math.random() * 4;
    const mx = THREE.MathUtils.clamp(
      this.px + Math.sin(angle) * dist,
      -WORLD_PLAYABLE_RADIUS + 5,
      WORLD_PLAYABLE_RADIUS - 5,
    );
    const mz = THREE.MathUtils.clamp(
      this.pz + Math.cos(angle) * dist,
      -WORLD_PLAYABLE_RADIUS + 5,
      WORLD_PLAYABLE_RADIUS - 5,
    );
    this.spawnMobAt(kind, mx, mz);
    this.pushFeed(`З’явився ${MOB_DEFS[kind].name}`);
    this.emitHud();
  }

  private spawnMobAt(kind: MobKind, x: number, z: number) {
    const def = MOB_DEFS[kind];
    const visual = buildMobModel(kind, this.textures);
    const y = groundHeightAt(x, z);
    visual.root.position.set(x, y, z);
    this.scene.add(visual.root);

    const scaleBoost = 1 + (this.wave - 1) * 0.14;
    const maxHp = Math.round(def.maxHp * scaleBoost);

    this.mobs.push({
      id: this.nextMobId++,
      kind,
      visual,
      x,
      y,
      z,
      vx: 0,
      vz: 0,
      yaw: Math.random() * Math.PI * 2,
      hp: maxHp,
      maxHp,
      attackTimer: 0.4,
      hitFlash: 0,
      walkPhase: Math.random() * 6,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderTimer: 2 + Math.random() * 3,
    });
  }

  private spawnWave(waveNum: number) {
    this.wave = waveNum;
    const slimes = 4 + waveNum;
    const goblins = 2 + waveNum;
    const golems = Math.min(5, 1 + Math.floor(waveNum / 2));

    for (let i = 0; i < slimes; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 36;
      this.spawnMobAt('slime', Math.cos(a) * r - 4, Math.sin(a) * r);
    }
    for (let i = 0; i < goblins; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 26 + Math.random() * 44;
      this.spawnMobAt('goblin', Math.cos(a) * r + 6, Math.sin(a) * r - 8);
    }
    for (let i = 0; i < golems; i++) {
      const x = 44 + (Math.random() - 0.5) * 34;
      const z = -12 + (Math.random() - 0.5) * 44;
      this.spawnMobAt('golem', x, z);
    }
    this.spawnMobAt('boss', 46, -24);
    this.pushFeed(`Хвиля ${waveNum} почалась!`);
  }

  private getEffectiveWeaponStats(id: WeaponId) {
    const base = WEAPONS.find((item) => item.id === id)!;
    let damage = base.damage;
    let range = base.range;
    if (id === 'sword' && this.upgrades.has('sword_t2')) damage += 16;
    if (id === 'hammer' && this.upgrades.has('hammer_t2')) {
      damage += 24;
      range += 1.1;
    }
    if (id === 'blaster' && this.upgrades.has('blaster_t2')) damage += 14;
    if (id === 'bow' && this.upgrades.has('bow_t2')) damage += 18;
    return { ...base, damage, range };
  }

  public triggerAttack() {
    soundEngine.unlock();
    if (this.phase === 'title') this.startGame();
    if (this.phase !== 'playing' || this.attackCooldown > 0) return;

    const w = this.getEffectiveWeaponStats(this.activeWeapon);
    this.attackCooldown = w.cooldown;
    this.attackAnim = 1.0;

    this.playerYaw = this.camYaw + Math.PI;
    const aimX = Math.sin(this.playerYaw);
    const aimZ = Math.cos(this.playerYaw);

    if (w.id === 'sword') {
      soundEngine.playSwordSwing();
      this.slashArcMesh.visible = true;
      this.slashArcMesh.position.set(this.px + aimX * 0.9, this.py + 1.25, this.pz + aimZ * 0.9);
      this.slashArcMesh.rotation.z = -this.playerYaw + Math.PI * 0.5;
      this.slashArcLife = 0.18;

      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, w.range, 0.25, w.damage, w.knockback, 0x38bdf8);
      this.hitResourceNodesNear(this.px + aimX * 1.4, this.pz + aimZ * 1.4, 2.3);
    } else if (w.id === 'hammer') {
      soundEngine.playHammerSlam();
      const impactX = this.px + aimX * 1.65;
      const impactZ = this.pz + aimZ * 1.65;
      this.spawnShockwave(impactX, walkableHeightAt(impactX, impactZ, this.py) + 0.12, impactZ, 0xf59e0b, 4.3, 0.28);

      this.hitMobsInArc(impactX, impactZ, aimX, aimZ, w.range, -1.0, w.damage, w.knockback, 0xf59e0b);
      this.hitResourceNodesNear(impactX, impactZ, 2.8);
    } else if (w.id === 'blaster') {
      soundEngine.playBlasterShot();
      this.fireProjectile(w.damage, w.knockback, 34, 0, 0x22d3ee, false);
    } else {
      soundEngine.playBowShot();
      this.fireProjectile(w.damage, w.knockback, 38, 4.5, 0xa3e635, true);
    }
  }

  private hitResourceNodesNear(x: number, z: number, radius: number) {
    for (const node of this.resourceNodes) {
      if (node.available && Math.hypot(node.x - x, node.z - z) < radius) {
        this.harvestResourceNode(node);
        break;
      }
    }
  }

  private fireProjectile(
    damage: number,
    knockback: number,
    speed: number,
    gravity: number,
    color: number,
    isArrow: boolean,
  ) {
    const dirX = -Math.sin(this.camYaw) * Math.cos(this.camPitch * 0.45);
    const dirY = -Math.sin(this.camPitch * 0.45) + (isArrow ? 0.06 : 0.01);
    const dirZ = -Math.cos(this.camYaw) * Math.cos(this.camPitch * 0.45);
    _v1.set(dirX, dirY, dirZ).normalize();

    const geo = isArrow
      ? new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6)
      : new THREE.SphereGeometry(0.18, 8, 8);
    if (isArrow) geo.rotateX(Math.PI * 0.5);

    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    const startX = this.px + _v1.x * 0.95;
    const startY = this.py + 1.5;
    const startZ = this.pz + _v1.z * 0.95;
    mesh.position.set(startX, startY, startZ);
    mesh.lookAt(startX + _v1.x, startY + _v1.y, startZ + _v1.z);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      x: startX,
      y: startY,
      z: startZ,
      vx: _v1.x * speed,
      vy: _v1.y * speed,
      vz: _v1.z * speed,
      life: 1.5,
      damage,
      knockback,
      gravity,
      color,
    });
  }

  private hitMobsInArc(
    originX: number,
    originZ: number,
    dirX: number,
    dirZ: number,
    range: number,
    minDot: number,
    damage: number,
    knockback: number,
    fxColor: number,
  ) {
    let anyHit = false;
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      const dx = m.x - originX;
      const dz = m.z - originZ;
      const dist = Math.hypot(dx, dz);
      const def = MOB_DEFS[m.kind];
      if (dist > range + def.radius) continue;

      if (dist > 0.01 && minDot > -0.99) {
        const dot = (dx * dirX + dz * dirZ) / dist;
        if (dot < minDot) continue;
      }

      anyHit = true;
      this.damageMob(m, i, damage, dx, dz, dist, knockback, fxColor);
    }
    if (anyHit) {
      soundEngine.playHit(knockback > 10);
    }
  }

  private damageMob(
    mob: MobEntity,
    index: number,
    damage: number,
    dx: number,
    dz: number,
    dist: number,
    knockback: number,
    fxColor: number,
  ) {
    const critScale = 1 + (this.level - 1) * 0.08;
    const finalDmg = Math.round(damage * critScale);
    mob.hp -= finalDmg;
    mob.hitFlash = 0.14;
    mob.visual.hpBarBg.visible = true;

    const nx = dist > 0.01 ? dx / dist : 0;
    const nz = dist > 0.01 ? dz / dist : 1;
    const kbResist = mob.kind === 'golem' || mob.kind === 'boss' ? 0.45 : 1.0;
    mob.vx += nx * knockback * kbResist;
    mob.vz += nz * knockback * kbResist;

    this.spawnBurst(mob.x, mob.y + MOB_DEFS[mob.kind].height * 0.55, mob.z, fxColor, 8);

    if (mob.hp <= 0) {
      this.defeatMob(mob, index);
    } else {
      const ratio = Math.max(0, mob.hp / mob.maxHp);
      mob.visual.hpBarFill.scale.x = ratio;
      mob.visual.hpBarFill.position.x = -(1 - ratio) * 0.61;
    }
  }

  private defeatMob(mob: MobEntity, index: number) {
    const def = MOB_DEFS[mob.kind];
    soundEngine.playMobDefeat();
    this.spawnBurst(mob.x, mob.y + 1.0, mob.z, 0xfde047, 16);

    const coinCount = mob.kind === 'boss' ? 4 : mob.kind === 'golem' ? 2 : 1;
    for (let c = 0; c < coinCount; c++) {
      this.spawnPickup(
        'coin',
        mob.x + (Math.random() - 0.5) * 1.4,
        mob.z + (Math.random() - 0.5) * 1.4,
        Math.round(def.rewardCoins / coinCount),
      );
    }
    if (Math.random() < (mob.kind === 'boss' ? 1 : 0.35)) {
      this.spawnPickup('heal', mob.x + 0.5, mob.z - 0.4, 24);
    }

    // Crafting resource loot drops
    const dropNotes: string[] = [];
    const addDrop = (id: ResourceId, amt: number) => {
      this.resources[id] += amt;
      const meta = RESOURCES.find((r) => r.id === id);
      if (meta) dropNotes.push(`+${amt} ${meta.name}`);
    };
    if (mob.kind === 'slime') {
      addDrop('essence', 1);
      if (Math.random() < 0.45) addDrop('herb', 1);
    } else if (mob.kind === 'goblin') {
      addDrop('wood', 1);
      addDrop('hide', 1);
    } else if (mob.kind === 'golem') {
      addDrop('stone', 2);
      addDrop('iron', 1 + (Math.random() < 0.5 ? 1 : 0));
    } else {
      addDrop('iron', 2);
      addDrop('essence', 3);
      addDrop('hide', 2);
    }

    this.scene.remove(mob.visual.root);
    this.mobs.splice(index, 1);

    this.kills++;
    this.grantXp(def.rewardXp);
    const lootStr = dropNotes.length > 0 ? ` · ${dropNotes.join(', ')}` : '';
    this.pushFeed(`Знищено: ${def.name} (+${def.rewardXp} XP${lootStr})`);
    this.emitHud();
  }

  private spawnPickup(kind: 'coin' | 'heal' | 'bullet', x: number, z: number, value: number, pickupDelay = 0) {
    let mesh: THREE.Object3D;
    if (kind === 'bullet') {
      mesh = buildBulletModel(1.1);
      mesh.rotation.x = -0.35;
    } else {
      const mat =
        kind === 'coin'
          ? new THREE.MeshStandardMaterial({
              color: 0xfacc15,
              emissive: 0xca8a04,
              emissiveIntensity: 0.5,
              metalness: 0.85,
              roughness: 0.2,
            })
          : new THREE.MeshStandardMaterial({
              color: 0x4ade80,
              emissive: 0x16a34a,
              emissiveIntensity: 0.7,
              roughness: 0.2,
            });
      mesh = new THREE.Mesh(kind === 'coin' ? this.coinGeo : this.healGeo, mat);
      if (kind === 'coin') mesh.rotation.x = Math.PI * 0.5;
    }
    const y = walkableHeightAt(x, z) + 0.65;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.pickups.push({ mesh, kind, x, y, z, value, phase: Math.random() * 6, pickupDelay });
  }

  private spawnBurst(x: number, y: number, z: number, color: number, count: number) {
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 5.5;
      this.particles.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: 2.0 + Math.random() * 4.5,
        vz: Math.sin(ang) * spd,
        life: 0.35 + Math.random() * 0.25,
        scale: 0.8 + Math.random() * 0.7,
        grow: -1.5,
      });
    }
  }

  private grantXp(amount: number) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.maxHp += 15;
      this.hp = this.maxHp;
      this.xpToNext = Math.round(this.xpToNext * 1.35);
      this.spawnBurst(this.px, this.py + 1.5, this.pz, 0x38bdf8, 22);
      this.pushFeed(`Новий рівень ${this.level}! (+15 Макс. HP)`);
    }
  }

  private pushFeed(text: string) {
    this.killFeed = [{ id: this.nextFeedId++, text }, ...this.killFeed].slice(0, 4);
  }

  private resolveCollisions(x: number, z: number, radius: number, allowCabinInterior = true): [number, number] {
    let rx = x;
    let rz = z;
    const radial = Math.hypot(rx, rz);
    if (radial > WORLD_PLAYABLE_RADIUS - 2) {
      const s = (WORLD_PLAYABLE_RADIUS - 2) / radial;
      rx *= s;
      rz *= s;
    }

    if (allowCabinInterior) {
      [rx, rz] = resolveCabinCollision(rx, rz, radius);
    } else {
      for (const site of CABIN_SITES) {
        const { lx, lz } = toCabinLocal(rx, rz, site);
        if (Math.abs(lx) < 4.8 && Math.abs(lz) < 4.2) {
          const pushX = lx >= 0 ? 4.8 : -4.8;
          const worldOut = fromCabinLocal(pushX, lz, site);
          rx = worldOut.x;
          rz = worldOut.z;
        }
      }
    }

    for (const c of this.env.colliders) {
      const dx = rx - c.x;
      const dz = rz - c.z;
      const minD = radius + c.radius;
      const d = Math.hypot(dx, dz);
      if (d < minD && d > 0.001) {
        const push = (minD - d) / d;
        rx += dx * push;
        rz += dz * push;
      }
    }
    return [rx, rz];
  }

  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.disposed) return;

      if (!this.isSoftwareGl && document.hidden) {
        this.frameId = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      if (!this.isSoftwareGl && this.ecoMode) {
        if (now - this.lastRenderMs < 15.8) {
          this.frameId = requestAnimationFrame(tick);
          return;
        }
        this.lastRenderMs = now;
      }

      const dt = Math.min(this.clock.getDelta(), 0.05);
      const elapsed = this.clock.elapsedTime;

      this.update(dt, elapsed);

      this.fpsSamples++;
      const fpsElapsed = now - this.fpsWindowStart;
      if (fpsElapsed >= 450) {
        this.currentFps = Math.max(1, Math.round((this.fpsSamples * 1000) / fpsElapsed));
        this.currentFrameMs = Math.max(1, Math.round(fpsElapsed / this.fpsSamples));
        this.fpsSamples = 0;
        this.fpsWindowStart = now;
      }

      this.renderCount++;
      if (!this.isSoftwareGl) {
        this.renderer.shadowMap.needsUpdate = true;
      }

      if (this.isSoftwareGl || !this.dofEnabled || !this.composer) {
        this.renderer.render(this.scene, this.camera);
      } else {
        try {
          this.composer.render();
        } catch {
          this.composer.dispose();
          this.composer = null;
          this.dofPass = null;
          this.renderer.render(this.scene, this.camera);
        }
      }

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  private update(dt: number, elapsed: number) {
    this.env.update(elapsed, dt);

    this.campfireFlame.scale.set(
      1 + Math.sin(elapsed * 14) * 0.12,
      1 + Math.cos(elapsed * 11) * 0.18,
      1 + Math.sin(elapsed * 14) * 0.12,
    );
    this.campfireLight.intensity = 5.2 + Math.sin(elapsed * 12) * 0.9;
    this.cabins.forEach((c, idx) => {
      c.hearthLight.intensity = 4.6 + Math.cos(elapsed * 10 + idx * 1.7) * 0.85;
      c.hearthFlame.scale.set(
        1 + Math.sin(elapsed * 13 + idx) * 0.14,
        1 + Math.cos(elapsed * 11 + idx * 1.3) * 0.2,
        1 + Math.sin(elapsed * 13 + idx) * 0.14,
      );
    });

    if (this.ruinCrystal) {
      this.ruinCrystal.rotation.y += dt * 1.2;
      this.ruinCrystal.position.y = 2.4 + Math.sin(elapsed * 2.4) * 0.16;
    }

    // Respawn & gently animate crystal/herb resource nodes
    for (const node of this.resourceNodes) {
      if (!node.available) {
        node.respawnTimer -= dt;
        if (node.respawnTimer <= 0) {
          node.available = true;
          node.mesh.visible = true;
        }
      } else if (node.kind === 'essence') {
        node.mesh.rotation.y += dt * 0.5;
      }
    }

    if (this.phase === 'title') {
      this.camYaw = -0.18 + Math.sin(elapsed * 0.22) * 0.25;
      this.camPitch = 0.22;
      this.camDist = 6.2;
      this.updateCamera(dt, elapsed);
      this.playerRig.root.position.set(this.px, this.py, this.pz);
      return;
    }

    if (this.phase === 'playing') {
      this.updatePlayer(dt, elapsed);
    }

    this.updateMobs(dt, elapsed);
    this.updatePeacefulMobs(dt, elapsed);
    this.updateProjectiles(dt);
    this.updatePickups(dt, elapsed);
    this.updateParticles(dt);
    this.updateEffects(dt);
    this.updateCamera(dt, elapsed);

    this.sunLight.position.set(this.px - 26, 28, this.pz - 32);
    this.sunLight.target.position.set(this.px, this.py, this.pz);

    if (this.mobs.length === 0 && this.phase === 'playing') {
      this.waveClearDelay += dt;
      if (this.waveClearDelay > 2.2) {
        this.waveClearDelay = 0;
        this.hp = Math.min(this.maxHp, this.hp + 30);
        this.spawnWave(this.wave + 1);
      }
    }

    this.hudThrottle += dt;
    if (this.hudThrottle >= 0.08) {
      this.hudThrottle = 0;
      this.emitHud();
    }
  }

  private updatePlayer(dt: number, elapsed: number) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt * 4.5);
    this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);

    if (this.keys['KeyQ']) this.camYaw += 1.9 * dt;
    if (this.keys['KeyC']) this.camYaw -= 1.9 * dt;

    let fwd = 0;
    let strafe = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) fwd += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) fwd -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe += 1;

    fwd -= this.touchMoveZ;
    strafe += this.touchMoveX;

    const inputLen = Math.hypot(fwd, strafe);
    const moving = inputLen > 0.05;
    const sprinting =
      moving && (this.keys['ShiftLeft'] || this.keys['ShiftRight']) && this.stamina > 2 && !this.inWater;

    if (sprinting) {
      this.stamina = Math.max(0, this.stamina - 24 * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
    }

    const speedMult = this.upgrades.has('boots_swift') ? 1.22 : 1.0;
    const baseSpeed = (this.inWater ? 5.2 : sprinting ? 11.4 : 7.6) * speedMult;
    if (moving) {
      const nf = fwd / inputLen;
      const ns = strafe / inputLen;
      const moveX = -Math.sin(this.camYaw) * nf + Math.cos(this.camYaw) * ns;
      const moveZ = -Math.cos(this.camYaw) * nf - Math.sin(this.camYaw) * ns;
      this.pvx = THREE.MathUtils.damp(this.pvx, moveX * baseSpeed, 14, dt);
      this.pvz = THREE.MathUtils.damp(this.pvz, moveZ * baseSpeed, 14, dt);

      if (this.attackAnim < 0.25) {
        const targetYaw = Math.atan2(moveX, moveZ);
        let diff = targetYaw - this.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerYaw += diff * Math.min(1, dt * 14);
      }

      if (this.autoFollowCam && !this.isDraggingCam && !this.pointerLocked && Math.abs(ns) > 0.1) {
        this.camYaw -= ns * 0.65 * dt;
      }
    } else {
      this.pvx = THREE.MathUtils.damp(this.pvx, 0, 14, dt);
      this.pvz = THREE.MathUtils.damp(this.pvz, 0, 14, dt);
    }

    const nextX = this.px + this.pvx * dt;
    const nextZ = this.pz + this.pvz * dt;
    const [cx, cz] = this.resolveCollisions(nextX, nextZ, 0.56, true);
    this.px = cx;
    this.pz = cz;

    const insideSite = findInsideCabin(this.px, this.pz);
    this.insideCabin = insideSite !== null;
    for (const c of this.cabins) {
      c.roofGroup.visible = insideSite?.id !== c.site.id;
    }

    const wasGrounded = this.grounded;
    const surfaceY = walkableHeightAt(this.px, this.pz, this.py);
    const wasInWater = this.inWater;
    this.inWater = surfaceY < WATER_LEVEL - 0.15 && this.py < WATER_LEVEL + 0.15;
    if (!wasInWater && this.inWater) {
      soundEngine.playSplash();
      this.spawnBurst(this.px, WATER_LEVEL + 0.1, this.pz, 0xbae6fd, 8);
    }

    if (this.inWater) {
      const targetSwimY = WATER_LEVEL - 1.15;
      const buoyancy = (targetSwimY - this.py) * 12;
      this.pvy += (buoyancy - this.pvy * 4.5) * dt;
      this.py += this.pvy * dt;
      if (this.py < surfaceY) {
        this.py = surfaceY;
        this.pvy = Math.max(0, this.pvy);
      }
      this.grounded = false;
    } else {
      this.pvy -= 24.5 * dt;
      this.py += this.pvy * dt;
      if (this.py <= surfaceY) {
        this.py = surfaceY;
        this.pvy = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    }

    if (!wasGrounded && this.grounded && !this.inWater) {
      this.camLandingDip = 0.24;
    }

    // Warm campfire or indoor hearth gently heals the hero
    if (
      (Math.hypot(this.px - this.campfirePos.x, this.pz - this.campfirePos.z) < 4.5 || this.insideCabin) &&
      this.hp < this.maxHp
    ) {
      this.hp = Math.min(this.maxHp, this.hp + (this.insideCabin ? 8 : 12) * dt);
    }

    const speedHoriz = Math.hypot(this.pvx, this.pvz);
    if (speedHoriz > 0.4) {
      this.walkPhase += dt * (sprinting ? 14 : 10);
    }
    const targetBobAmt =
      this.grounded && speedHoriz > 0.5 ? (sprinting ? 1.18 : 0.72) : this.inWater && speedHoriz > 0.4 ? 0.55 : 0;
    this.camBobAmt = THREE.MathUtils.damp(this.camBobAmt, targetBobAmt, 9, dt);
    if (speedHoriz > 0.4) {
      this.camBobPhase += dt * (sprinting ? 10.5 : 7.8);
    }
    this.camLandingDip = THREE.MathUtils.damp(this.camLandingDip, 0, 11, dt);

    const rig = this.playerRig;
    rig.root.position.set(this.px, this.py, this.pz);
    rig.root.rotation.y = this.playerYaw;
    rig.contactShadow.visible = !this.inWater && this.py - surfaceY < 2.5;
    rig.contactShadow.position.y = Math.max(0.03, surfaceY - this.py + 0.03);

    if (this.inWater) {
      rig.bodyTilt.rotation.x = THREE.MathUtils.damp(rig.bodyTilt.rotation.x, 0.55, 8, dt);
      const paddle = Math.sin(elapsed * 6.5);
      rig.leftArm.rotation.x = -1.2 + paddle * 0.7;
      rig.leftLeg.rotation.x = paddle * 0.55;
      rig.rightLeg.rotation.x = -paddle * 0.55;
    } else {
      const lean = sprinting ? 0.14 : 0;
      rig.bodyTilt.rotation.x = THREE.MathUtils.damp(rig.bodyTilt.rotation.x, lean, 10, dt);
      const swing = speedHoriz > 0.4 && this.grounded ? Math.sin(this.walkPhase) * 0.78 : 0;
      rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, swing, 16, dt);
      rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, -swing, 16, dt);
      rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -swing * 0.85, 16, dt);
    }

    if (this.attackAnim > 0) {
      if (this.activeWeapon === 'sword' || this.activeWeapon === 'hammer') {
        const s = Math.sin((1 - this.attackAnim) * Math.PI);
        rig.rightArm.rotation.x = -1.9 + s * 2.5;
        rig.rightArm.rotation.z = this.activeWeapon === 'sword' ? -0.45 * (1 - s) : 0;
      } else {
        rig.rightArm.rotation.x = -1.45 - this.attackAnim * 0.28;
        rig.rightArm.rotation.z = 0;
      }
    } else {
      const idleArm =
        this.activeWeapon === 'blaster' || this.activeWeapon === 'bow'
          ? -1.25
          : this.inWater
            ? -1.2 - Math.sin(elapsed * 6.5) * 0.7
            : speedHoriz > 0.4
              ? Math.sin(this.walkPhase) * 0.65
              : 0;
      rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, idleArm, 15, dt);
      rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, 0, 15, dt);
    }
  }

  private updateMobs(dt: number, elapsed: number) {
    for (let i = 0; i < this.mobs.length; i++) {
      const m = this.mobs[i];
      const def = MOB_DEFS[m.kind];

      m.attackTimer = Math.max(0, m.attackTimer - dt);
      m.hitFlash = Math.max(0, m.hitFlash - dt);

      for (const mesh of m.visual.hitFlashMeshes) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const rawMat of mats) {
          const mat = rawMat as THREE.MeshStandardMaterial;
          if (!mat.emissive) continue;
          if (m.hitFlash > 0) {
            mat.emissive.setHex(0xffffff);
            mat.emissiveIntensity = 0.65;
          } else if (m.kind === 'slime' && !mat.transparent) {
            mat.emissive.setHex(0x047857);
            mat.emissiveIntensity = 0.35;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }

      const dx = this.px - m.x;
      const dz = this.pz - m.z;
      const dist = Math.hypot(dx, dz);

      let moveDirX = 0;
      let moveDirZ = 0;
      let moveSpeed = 0;

      // Mobs avoid entering inside the safe cabin interior
      if (this.phase === 'playing' && dist < def.aggroRadius && !this.insideCabin) {
        if (dist > def.attackRange * 0.85) {
          moveDirX = dx / dist;
          moveDirZ = dz / dist;
          moveSpeed = def.speed;
        } else if (m.attackTimer <= 0 && this.hurtCooldown <= 0) {
          m.attackTimer = def.attackCooldown;
          const armorMult = this.upgrades.has('armor_ranger') ? 0.75 : 1.0;
          const incoming = Math.max(1, Math.round(def.damage * armorMult));
          this.hp = Math.max(0, this.hp - incoming);
          this.hurtCooldown = 0.45;
          soundEngine.playPlayerHurt();
          if (dist > 0.01) {
            this.pvx += (dx / dist) * 6;
            this.pvz += (dz / dist) * 6;
          }
          if (this.hp <= 0) {
            this.phase = 'dead';
            if (this.pointerLocked) document.exitPointerLock?.();
            this.emitHud();
          }
        }
        m.yaw = Math.atan2(dx, dz);
      } else {
        m.wanderTimer -= dt;
        if (m.wanderTimer <= 0) {
          m.wanderTimer = 2.5 + Math.random() * 3.5;
          m.wanderAngle += (Math.random() - 0.5) * 2.4;
        }
        moveDirX = Math.sin(m.wanderAngle);
        moveDirZ = Math.cos(m.wanderAngle);
        moveSpeed = def.speed * 0.35;
        m.yaw = m.wanderAngle;
      }

      m.vx = THREE.MathUtils.damp(m.vx, moveDirX * moveSpeed, 8, dt);
      m.vz = THREE.MathUtils.damp(m.vz, moveDirZ * moveSpeed, 8, dt);

      const [nx, nz] = this.resolveCollisions(m.x + m.vx * dt, m.z + m.vz * dt, def.radius, false);
      m.x = nx;
      m.z = nz;
      m.y = groundHeightAt(m.x, m.z);

      m.visual.root.position.set(m.x, m.y, m.z);
      m.visual.root.rotation.y = m.yaw;

      if (m.visual.hpBarBg.visible) {
        m.visual.hpBarBg.lookAt(this.camera.position);
      }

      const spd = Math.hypot(m.vx, m.vz);
      m.walkPhase += dt * (spd * 2.2 + 2.0);
      if (m.kind === 'slime') {
        const bounce = Math.abs(Math.sin(elapsed * 4.5 + m.id));
        m.visual.body.position.y = bounce * 0.42;
        m.visual.body.scale.set(1 + (1 - bounce) * 0.14, 0.85 + bounce * 0.22, 1 + (1 - bounce) * 0.14);
      } else {
        const sw = Math.sin(m.walkPhase) * Math.min(0.75, spd * 0.16);
        if (m.visual.leftLeg) m.visual.leftLeg.rotation.x = sw;
        if (m.visual.rightLeg) m.visual.rightLeg.rotation.x = -sw;
        if (m.visual.leftArm) m.visual.leftArm.rotation.x = -sw * 0.8;
        if (m.visual.rightArm) {
          const swingBoost = m.attackTimer > def.attackCooldown - 0.25 ? -1.4 : 0;
          m.visual.rightArm.rotation.x = sw * 0.8 + swingBoost;
        }
      }
    }
  }

  private updatePeacefulMobs(dt: number, elapsed: number) {
    for (const pm of this.peacefulMobs) {
      const dx = pm.x - this.px;
      const dz = pm.z - this.pz;
      const dist = Math.hypot(dx, dz);

      if (pm.kind === 'villager') {
        // Лісник Орест stands warmly near campfire and looks toward the player when nearby
        if (dist < 7.5) {
          const targetYaw = Math.atan2(this.px - pm.x, this.pz - pm.z);
          pm.yaw += (targetYaw - pm.yaw) * Math.min(1, dt * 6);
        } else {
          pm.yaw = 0.4 + Math.sin(elapsed * 0.4) * 0.2;
        }
        pm.y = groundHeightAt(pm.x, pm.z);
        pm.visual.root.position.set(pm.x, pm.y, pm.z);
        pm.visual.root.rotation.y = pm.yaw;
        if (pm.visual.head) {
          pm.visual.head.rotation.y = Math.sin(elapsed * 1.1) * 0.12;
        }
        continue;
      }

      pm.fleeTimer = Math.max(0, pm.fleeTimer - dt);
      let moveDirX = 0;
      let moveDirZ = 0;
      let speed = 0;

      if (pm.kind === 'deer' && dist < 6.5) {
        pm.fleeTimer = 2.0;
        pm.wanderAngle = Math.atan2(dx, dz);
      }

      if (pm.fleeTimer > 0) {
        moveDirX = Math.sin(pm.wanderAngle);
        moveDirZ = Math.cos(pm.wanderAngle);
        speed = 6.2;
        pm.yaw = pm.wanderAngle;
      } else {
        pm.wanderTimer -= dt;
        if (pm.wanderTimer <= 0) {
          pm.wanderTimer = 2.8 + Math.random() * 4.0;
          // Gently steer back toward home pasture if too far
          const homeDist = Math.hypot(pm.x - pm.homeX, pm.z - pm.homeZ);
          if (homeDist > 16) {
            pm.wanderAngle = Math.atan2(pm.homeX - pm.x, pm.homeZ - pm.z);
          } else {
            pm.wanderAngle += (Math.random() - 0.5) * 2.2;
          }
        }
        const grazing = Math.sin(elapsed * 0.6 + pm.id) > 0.35;
        if (!grazing) {
          moveDirX = Math.sin(pm.wanderAngle);
          moveDirZ = Math.cos(pm.wanderAngle);
          speed = pm.kind === 'deer' ? 2.4 : 1.5;
          pm.yaw = pm.wanderAngle;
        }
      }

      pm.vx = THREE.MathUtils.damp(pm.vx, moveDirX * speed, 7, dt);
      pm.vz = THREE.MathUtils.damp(pm.vz, moveDirZ * speed, 7, dt);

      const [nx, nz] = this.resolveCollisions(pm.x + pm.vx * dt, pm.z + pm.vz * dt, 0.7, false);
      const ny = groundHeightAt(nx, nz);
      if (ny > WATER_LEVEL + 0.1) {
        pm.x = nx;
        pm.z = nz;
        pm.y = ny;
      } else {
        pm.wanderAngle += Math.PI * 0.7;
      }

      pm.visual.root.position.set(pm.x, pm.y, pm.z);
      pm.visual.root.rotation.y = pm.yaw;

      const spd = Math.hypot(pm.vx, pm.vz);
      pm.walkPhase += dt * (spd * 2.6 + 1.2);
      const legSwing = spd > 0.2 ? Math.sin(pm.walkPhase) * Math.min(0.6, spd * 0.16) : 0;
      if (pm.visual.legFL) pm.visual.legFL.rotation.x = legSwing;
      if (pm.visual.legBR) pm.visual.legBR.rotation.x = legSwing;
      if (pm.visual.legFR) pm.visual.legFR.rotation.x = -legSwing;
      if (pm.visual.legBL) pm.visual.legBL.rotation.x = -legSwing;

      if (pm.visual.head) {
        // Grazing head dip when standing still
        const targetHeadPitch = spd < 0.2 ? 0.32 + Math.sin(elapsed * 2.2 + pm.id) * 0.1 : 0;
        pm.visual.head.rotation.x = THREE.MathUtils.damp(pm.visual.head.rotation.x, targetHeadPitch, 8, dt);
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      if (p.isBullet) {
        p.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
      }

      const floorY = walkableHeightAt(p.x, p.z);
      let hitGround = p.life <= 0 || p.y <= Math.max(floorY, WATER_LEVEL - 0.15);
      let hitMob = false;

      if (!hitGround) {
        for (let mIdx = this.mobs.length - 1; mIdx >= 0; mIdx--) {
          const m = this.mobs[mIdx];
          const def = MOB_DEFS[m.kind];
          const distXZ = Math.hypot(m.x - p.x, m.z - p.z);
          if (distXZ <= def.radius + (p.isBullet ? 0.55 : 0.35) && p.y >= m.y && p.y <= m.y + def.height + 0.5) {
            hitMob = true;
            if (!p.isBullet) {
              soundEngine.playHit(false);
              this.damageMob(m, mIdx, p.damage, p.vx, p.vz, Math.hypot(p.vx, p.vz), p.knockback, p.color);
            }
            break;
          }
        }
      }

      if (hitGround || hitMob) {
        if (p.isBullet) {
          this.detonateBullet(p.x, Math.max(floorY, p.y), p.z, 5.4, p.damage, true);
        }
        this.scene.remove(p.mesh);
        p.mesh.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mt) => mt.dispose());
          }
        });
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updatePickups(dt: number, elapsed: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const item = this.pickups[i];
      if (item.pickupDelay && item.pickupDelay > 0) {
        item.pickupDelay = Math.max(0, item.pickupDelay - dt);
      }
      item.mesh.rotation.y += dt * 3.0;
      item.mesh.position.y = item.y + Math.sin(elapsed * 4 + item.phase) * 0.14;

      const dx = this.px - item.x;
      const dz = this.pz - item.z;
      const d = Math.hypot(dx, dz);
      if ((!item.pickupDelay || item.pickupDelay <= 0) && d < 4.5 && d > 0.1) {
        item.x += (dx / d) * 9 * dt;
        item.z += (dz / d) * 9 * dt;
        item.y = walkableHeightAt(item.x, item.z) + 0.65;
        item.mesh.position.x = item.x;
        item.mesh.position.z = item.z;
      }

      if ((!item.pickupDelay || item.pickupDelay <= 0) && d < 1.25) {
        if (item.kind === 'coin') {
          this.coins += item.value;
        } else if (item.kind === 'heal') {
          this.hp = Math.min(this.maxHp, this.hp + item.value);
        } else {
          this.ammoBullets += item.value;
        }
        soundEngine.playPickup();
        this.scene.remove(item.mesh);
        item.mesh.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mt) => mt.dispose());
          }
        });
        this.pickups.splice(i, 1);
        this.emitHud();
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.vy -= 14 * dt;
      pt.mesh.position.x += pt.vx * dt;
      pt.mesh.position.y += pt.vy * dt;
      pt.mesh.position.z += pt.vz * dt;
      if (pt.bounce) {
        const floorY = walkableHeightAt(pt.mesh.position.x, pt.mesh.position.z) + 0.12;
        if (pt.mesh.position.y < floorY) {
          if (pt.dropBulletOnLand) {
            const lx = pt.mesh.position.x;
            const lz = pt.mesh.position.z;
            this.detonateBullet(lx, floorY, lz, 2.7, 16, false);
            this.spawnPickup('bullet', lx, lz, 1, 0.35);
            this.scene.remove(pt.mesh);
            this.particles.splice(i, 1);
            continue;
          }
          pt.mesh.position.y = floorY;
          pt.vy = Math.abs(pt.vy) * 0.38;
          pt.vx *= 0.65;
          pt.vz *= 0.65;
        }
        pt.mesh.rotation.x += dt * 5;
        pt.mesh.rotation.z += dt * 4;
      }
      pt.scale = Math.max(0.01, pt.scale + pt.grow * dt);
      pt.mesh.scale.setScalar(pt.scale);

      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private updateEffects(dt: number) {
    if (this.slashArcLife > 0) {
      this.slashArcLife -= dt;
      const t = Math.max(0, this.slashArcLife / 0.18);
      (this.slashArcMesh.material as THREE.MeshBasicMaterial).opacity = t * 0.8;
      this.slashArcMesh.scale.setScalar(1.0 + (1 - t) * 0.35);
      if (this.slashArcLife <= 0) this.slashArcMesh.visible = false;
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      const progress = 1 - Math.max(0, sw.life / sw.maxLife);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.88;
      sw.mesh.scale.setScalar(sw.startScale + progress * (sw.maxScale - sw.startScale));
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        (sw.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number, elapsed: number) {
    const goalDist = this.insideCabin ? Math.min(this.targetCamDist, 4.4) : this.targetCamDist;
    this.camDist = THREE.MathUtils.damp(this.camDist, goalDist, 12, dt);

    const effectivePitch = this.insideCabin ? Math.max(this.camPitch, 0.44) : this.camPitch;
    const horizDist = Math.cos(effectivePitch) * this.camDist;
    const vertOffset = Math.sin(effectivePitch) * this.camDist + (this.insideCabin ? 2.45 : 1.85);

    // Organic walking/sprinting figure-8 bobbing + gentle idle breathing & swim sway
    const walkBobY = Math.sin(this.camBobPhase * 2) * 0.11 * this.camBobAmt;
    const walkBobSide = Math.cos(this.camBobPhase) * 0.085 * this.camBobAmt;
    const idleSwayY = Math.sin(elapsed * 1.45) * 0.035;
    const idleSwaySide = Math.cos(elapsed * 0.95) * 0.025;
    const swimBob = this.inWater ? Math.sin(elapsed * 3.1) * 0.08 : 0;

    const totalBobY = walkBobY + idleSwayY + swimBob - this.camLandingDip;
    const totalBobSide = walkBobSide + idleSwaySide;

    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);

    const targetX = this.px + Math.sin(this.camYaw) * horizDist + rightX * totalBobSide;
    const targetZ = this.pz + Math.cos(this.camYaw) * horizDist + rightZ * totalBobSide;
    const groundAtCam = groundHeightAt(targetX, targetZ);
    const targetY = Math.max(groundAtCam + 0.75, this.py + vertOffset + totalBobY);

    _camGoal.set(targetX, targetY, targetZ);
    this.camera.position.lerp(_camGoal, 1 - Math.exp(-16 * dt));

    _lookTarget.set(
      this.px + rightX * totalBobSide * 0.45,
      this.py + 1.68 + totalBobY * 0.55,
      this.pz + rightZ * totalBobSide * 0.45,
    );
    this.camera.lookAt(_lookTarget);
    // Subtle horizon roll during steps & turns
    this.camera.rotateZ(Math.cos(this.camBobPhase) * 0.0085 * this.camBobAmt);

    if (this.dofPass && this.dofEnabled) {
      const focusDist = this.camera.position.distanceTo(_lookTarget);
      this.dofPass.uniforms['uFocus'].value = focusDist;
    }
  }

  private emitHud() {
    const w = WEAPONS.find((item) => item.id === this.activeWeapon)!;
    const nearCampfire = Math.hypot(this.px - this.campfirePos.x, this.pz - this.campfirePos.z) < 4.5;
    const nearChest = this.chests.some(
      (c) => !c.opened && Math.hypot(this.px - c.x, this.pz - c.z) < 3.4,
    );
    const nearBed = this.cabins.some(
      (c) => Math.hypot(this.px - c.bedPos.x, this.pz - c.bedPos.z) < 2.8,
    );
    const nearWorkbench = this.cabins.some(
      (c) => Math.hypot(this.px - c.workbenchPos.x, this.pz - c.workbenchPos.z) < 2.9,
    );
    const nearNode = this.resourceNodes.find(
      (n) => n.available && Math.hypot(this.px - n.x, this.pz - n.z) < 3.2,
    );
    const villager = this.peacefulMobs.find((p) => p.kind === 'villager');
    const nearVillager = Boolean(villager && Math.hypot(this.px - villager.x, this.pz - villager.z) < 3.8);

    this.onHudUpdate({
      phase: this.phase,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      xp: this.xp,
      xpToNext: this.xpToNext,
      level: this.level,
      coins: this.coins,
      kills: this.kills,
      wave: this.wave,
      activeMobs: this.mobs.length,
      peacefulMobs: this.peacefulMobs.length,
      ammoBullets: this.ammoBullets,
      activeWeapon: this.activeWeapon,
      weaponCooldownRatio: Math.min(1, this.attackCooldown / w.cooldown),
      zoneName: getZoneName(this.px, this.pz),
      insideCabin: this.insideCabin,
      nearCampfire,
      nearChest,
      nearBed,
      nearWorkbench,
      nearResourceLabel: nearNode ? nearNode.label : null,
      nearVillager,
      inWater: this.inWater,
      pointerLocked: this.pointerLocked,
      autoFollowCam: this.autoFollowCam,
      dofEnabled: this.dofEnabled,
      shadowUpscale: this.shadowUpscale,
      ecoMode: this.ecoMode,
      muted: soundEngine.muted,
      fps: this.currentFps,
      frameMs: this.currentFrameMs,
      resources: { ...this.resources },
      consumables: { ...this.consumables },
      upgrades: Array.from(this.upgrades),
      killFeed: this.killFeed,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('pointerenter', this.onPointerEnter);
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('contextmenu', this.onContextMenu);
    dom.removeEventListener('webglcontextlost', this.onWebglLost);

    this.composer?.dispose();
    this.env.dispose();
    this.textures.dispose();
    this.sparkGeo.dispose();
    this.coinGeo.dispose();
    this.healGeo.dispose();
    this.shockwaveGeo.dispose();
    this.blastPuffMat.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
