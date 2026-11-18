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
  buildCabin,
  buildCampfire,
  buildCaveStructure,
  buildCoinModel,
  buildMobModel,
  buildPeacefulMobModel,
  buildResourceNodeModel,
  buildRobloxPlayer,
  buildStoneRuins,
  buildVillageWell,
  CaveVisual,
  MobVisual,
  PeacefulMobVisual,
  PlayerRig,
} from './models';
import {
  clearSavedGame,
  generateRandomSeed,
  loadSavedGame,
  saveGameToStorage,
} from './save';
import {
  BRIDGE_Z,
  CABIN_HALF_D,
  CABIN_ROT,
  CABIN_SITES,
  CabinSite,
  cabinBaseY,
  cabinFloorY,
  CAVE_SITES,
  CaveSite,
  findInsideCabin,
  findInsideCave,
  fromCabinLocal,
  fromCaveLocal,
  getZoneName,
  groundHeightAt,
  initializeWorldLayout,
  resolveCabinCollision,
  resolveCaveCollision,
  resolveWorldBounds,
  riverCenterX,
  riverHalfWidthAt,
  toCabinLocal,
  VILLAGE_SITE,
  walkableHeightAt,
  WATER_LEVEL,
} from './terrain';
import { createProceduralTextures, ProceduralTextures } from './textures';
import {
  ConsumableId,
  CRAFT_RECIPES,
  GameHudState,
  KillFeedItem,
  MerchantKind,
  MinimapEntity,
  MOB_DEFS,
  MobKind,
  PeacefulMobKind,
  QUESTS,
  QuestId,
  QuestProgressState,
  RELIC_SKILLS,
  RelicId,
  ResourceId,
  RESOURCES,
  SaveGameData,
  SEASON_DURATION_SEC,
  SEASON_LABELS,
  SeasonId,
  SHOP_ITEMS,
  TRAIL_STEPS_THRESHOLD,
  TrailCellPoint,
  UpgradeId,
  WEATHER_DURATION_SEC,
  WEATHER_LABELS,
  WeatherId,
  WeaponId,
  WEAPONS,
} from './types';

const _v1 = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

// Lightweight single-pass distant background blur shader
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
  displayName?: string;
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
  trailTimer: number;
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
  dropCoinOnLand?: boolean;
  disposeOwnMaterial?: boolean;
}

interface PickupItem {
  mesh: THREE.Object3D;
  kind: 'coin' | 'heal';
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
  group: THREE.Group;
  roofGroup: THREE.Group;
  doorPivotL: THREE.Group;
  doorPivotR: THREE.Group;
  doorOpenAmt: number;
  doorSoundState: boolean;
  hearthLight: THREE.PointLight;
  hearthFlame: THREE.Mesh;
  workbenchPos: THREE.Vector3 | null;
  bedPos: THREE.Vector3 | null;
}

interface CaveMount {
  site: CaveSite;
  visual: CaveVisual;
}

interface ChestEntity {
  id: string;
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

const SEASONS_ORDER: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];
const WEATHERS_ORDER: WeatherId[] = ['clear', 'rain', 'fog', 'precip'];

export class BlocklandWorld {
  private container: HTMLElement;
  private onHudUpdate: (state: GameHudState) => void;
  private onContextLostCb?: () => void;
  private onOpenCraftCb?: () => void;
  private onOpenShopCb?: (merchant: MerchantKind) => void;

  private renderer!: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private dofPass: ShaderPass | null = null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private textures!: ProceduralTextures;
  private env!: WorldEnvironment;
  private playerRig!: PlayerRig;

  private cabins: CabinMount[] = [];
  private caves: CaveMount[] = [];
  private shopPos: THREE.Vector3 | null = null;
  private bakeryPos: THREE.Vector3 | null = null;
  private alchemyPos: THREE.Vector3 | null = null;
  private worldSeed = 42069;

  private isSoftwareGl = false;
  private isMobile = false;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private lastRenderMs = 0;
  private renderCount = 0;
  private currentFps = 60;
  private currentFrameMs = 16;
  private fpsSamples = 0;
  private fpsWindowStart = performance.now();
  private lastElapsed = 0;

  private dofEnabled = true;
  private shadowUpscale = false;
  private ecoMode = true;
  private autoFollowCam = false;
  private modalOpen = false;
  private pooledLights: THREE.PointLight[] = [];

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
  private insideCave = false;
  private walkPhase = 0;
  private attackAnim = 0;
  private attackCooldown = 0;
  private activeWeapon: WeaponId = 'sword';

  // Shield & Parry state
  private blocking = false;
  private blockStartTime = 0;

  // Active Relics state
  private relicCooldowns: Record<RelicId, number> = {
    amulet_vitality: 0,
    cloak_wind: 0,
    rune_power: 0,
  };
  private windBuffTimer = 0;
  private berserkBuffTimer = 0;

  // Dynamic Season & Weather state (longer 15-min seasons)
  private season: SeasonId = 'summer';
  private weather: WeatherId = 'clear';
  private autoWeatherTimer = WEATHER_DURATION_SEC;
  private autoSeasonTimer = SEASON_DURATION_SEC;
  private sunDir = new THREE.Vector3(-0.32, 0.46, -0.82).normalize();
  private targetFogColor = new THREE.Color(0xcbdde6);
  private waterRippleTimer = 0;
  private cameraShake = 0;

  private hp = 100;
  private maxHp = 100;
  private stamina = 100;
  private maxStamina = 100;
  private xp = 0;
  private xpToNext = 100;
  private level = 1;
  private coins = 25;
  private kills = 0;
  private wave = 1;
  private hurtCooldown = 0;

  // Inventory, crafting, quests, persistence, & multi-merchant state
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
  private explorerGreeted = false;
  private mayorGreeted = false;
  private guardGreeted = false;
  private activeMerchantKind: MerchantKind = 'general';
  private visitedCaves = new Set<string>();
  private openedChestIds = new Set<string>();
  private questProgress: Record<QuestId, { progress: number; completed: boolean }> = {
    gather_valley: { progress: 0, completed: false },
    hunt_threats: { progress: 0, completed: false },
    visit_traders: { progress: 0, completed: false },
    find_village: { progress: 0, completed: false },
    explore_caves: { progress: 0, completed: false },
    defeat_boss: { progress: 0, completed: false },
  };

  // Player-trampled trail tracking (only appears where stepped >10 times)
  private trailVisits = new Map<string, number>();
  private trampledTrailPoints: TrailCellPoint[] = [];
  private lastTrailCellKey = '';
  private lastSavedAt: number | null = null;
  private autosaveTimer = 0;
  private loadedFromSave = false;

  // Camera orbit & bobbing state
  private camYaw = -0.18;
  private camPitch = 0.24;
  private camDist = 6.2;
  private targetCamDist = 6.2;
  private isDraggingCam = false;
  private dragPointerId: number | null = null;
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
  private touchSprint = false;

  private mobs: MobEntity[] = [];
  private peacefulMobs: PeacefulMobEntity[] = [];
  private resourceNodes: ResourceNodeEntity[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private pickups: PickupItem[] = [];
  private chests: ChestEntity[] = [];
  private slashArcMesh!: THREE.Mesh;
  private slashCoreMesh!: THREE.Mesh;
  private slashArcLife = 0;
  private shockwaves: ShockwaveFx[] = [];
  private campfirePos = new THREE.Vector3(-9, 0, -14.5);
  private villageCampfirePos = new THREE.Vector3();
  private campfireFlame!: THREE.Mesh;
  private campfireLight!: THREE.PointLight;
  private villageCampfireFlame!: THREE.Mesh;
  private villageCampfireLight!: THREE.PointLight;
  private ruinCrystal: THREE.Object3D | null = null;

  private nextMobId = 1;
  private nextFeedId = 1;
  private killFeed: KillFeedItem[] = [];
  private hudThrottle = 0;
  private waveClearDelay = 0;

  private sparkGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  private pebbleGeo = new THREE.DodecahedronGeometry(0.14, 0);
  private healGeo = new THREE.OctahedronGeometry(0.32, 0);
  private shockwaveGeo = new THREE.RingGeometry(0.45, 1.15, 28);

  constructor(
    container: HTMLElement,
    onHudUpdate: (state: GameHudState) => void,
    onContextLostCb?: () => void,
    onOpenCraftCb?: () => void,
    onOpenShopCb?: (merchant: MerchantKind) => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextLostCb = onContextLostCb;
    this.onOpenCraftCb = onOpenCraftCb;
    this.onOpenShopCb = onOpenShopCb;

    this.initScene();
    this.bindEvents();
    this.spawnPeacefulMobs();
    this.spawnResourceNodes();
    this.spawnWave(this.wave);
    this.pushFeed(
      this.loadedFromSave
        ? `Збереження відновлено · Селище: ${VILLAGE_SITE.name}`
        : `Нова пригода! Шукайте ${VILLAGE_SITE.name}, печери й прокладайте стежки!`,
    );
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

  private applySavedGame(saved: SaveGameData) {
    this.loadedFromSave = true;
    this.lastSavedAt = saved.savedAt || Date.now();
    this.px = saved.px;
    this.py = saved.py;
    this.pz = saved.pz;
    this.playerYaw = saved.playerYaw ?? this.playerYaw;
    this.maxHp = Math.max(100, saved.maxHp || 100);
    this.hp = Math.max(1, Math.min(this.maxHp, saved.hp || this.maxHp));
    this.maxStamina = Math.max(100, saved.maxStamina || 100);
    this.stamina = Math.max(0, Math.min(this.maxStamina, saved.stamina ?? this.maxStamina));
    this.xp = saved.xp ?? 0;
    this.xpToNext = saved.xpToNext || 100;
    this.level = Math.max(1, saved.level || 1);
    this.coins = Math.max(0, saved.coins ?? 25);
    this.kills = Math.max(0, saved.kills ?? 0);
    this.wave = Math.max(1, saved.wave || 1);
    if (saved.activeWeapon) this.activeWeapon = saved.activeWeapon;
    if (saved.season) this.season = saved.season;
    if (saved.weather) this.weather = saved.weather;
    if (typeof saved.autoSeasonTimer === 'number') {
      this.autoSeasonTimer = Math.max(5, Math.min(SEASON_DURATION_SEC, saved.autoSeasonTimer));
    }
    if (typeof saved.autoWeatherTimer === 'number') {
      this.autoWeatherTimer = Math.max(5, Math.min(WEATHER_DURATION_SEC, saved.autoWeatherTimer));
    }
    if (saved.resources) {
      this.resources = { ...this.resources, ...saved.resources };
    }
    if (saved.consumables) {
      this.consumables = { ...this.consumables, ...saved.consumables };
    }
    if (Array.isArray(saved.upgrades)) {
      this.upgrades = new Set(saved.upgrades);
    }
    if (saved.quests) {
      for (const q of QUESTS) {
        if (saved.quests[q.id]) {
          this.questProgress[q.id] = {
            progress: saved.quests[q.id].progress ?? 0,
            completed: Boolean(saved.quests[q.id].completed),
          };
        }
      }
    }
    if (Array.isArray(saved.visitedCaves)) {
      this.visitedCaves = new Set(saved.visitedCaves);
    }
    if (Array.isArray(saved.openedChests)) {
      this.openedChestIds = new Set(saved.openedChests);
    }
    if (saved.npcGreeted) {
      this.villagerGreeted = Boolean(saved.npcGreeted.villager);
      this.explorerGreeted = Boolean(saved.npcGreeted.explorer);
      this.mayorGreeted = Boolean(saved.npcGreeted.mayor);
      this.guardGreeted = Boolean(saved.npcGreeted.guard);
    }
    if (Array.isArray(saved.trailVisits)) {
      this.trailVisits = new Map(saved.trailVisits);
      this.trampledTrailPoints = [];
      for (const [key, cnt] of this.trailVisits.entries()) {
        if (cnt > TRAIL_STEPS_THRESHOLD) {
          const [sx, sz] = key.split(',').map(Number);
          if (Number.isFinite(sx) && Number.isFinite(sz)) {
            this.trampledTrailPoints.push({ x: sx, z: sz });
          }
        }
      }
    }
  }

  private initScene() {
    const saved = loadSavedGame();
    this.worldSeed = saved?.worldSeed ?? generateRandomSeed();
    initializeWorldLayout(this.worldSeed);
    if (saved) {
      this.applySavedGame(saved);
    }

    this.isSoftwareGl = this.detectSoftwareGl();
    this.isMobile =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches ||
        ('ontouchstart' in window && window.innerWidth < 1024));

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.isMobile,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.applyRenderScale();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = this.isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const mistColor = new THREE.Color(0xcbdde6);
    this.scene.background = mistColor;
    this.scene.fog = new THREE.FogExp2(0xcbdde6, 0.0044);

    if (!this.isMobile) {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.15, this.isMobile ? 380 : 520);

    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x223815, this.isMobile ? 0.72 : 0.64);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0cc, 3.35);
    this.sunLight.position.set(-26, 34, -32);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowSize = this.shadowUpscale
      ? this.isMobile
        ? 2048
        : 4096
      : this.isMobile
        ? 1024
        : 2048;
    this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
    const d = this.isMobile ? 21 : 26;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 125;
    this.sunLight.shadow.radius = this.isMobile ? 1.0 : 1.5;
    this.sunLight.shadow.bias = -0.00022;
    this.sunLight.shadow.normalBias = 0.016;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.36);
    rimLight.position.set(28, 18, 30);
    this.scene.add(rimLight);

    // 3 pooled dynamic PointLights placed at closest active campfires, hearths, or cave torches/crystals
    for (let i = 0; i < 3; i++) {
      const pl = new THREE.PointLight(0xff9b42, 0, 20, 1.5);
      pl.castShadow = false;
      pl.visible = false;
      this.scene.add(pl);
      this.pooledLights.push(pl);
    }

    const maxAniso = this.isMobile ? 2 : this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    this.env = buildWorldEnvironment(this.textures, {
      mobilePerf: this.isMobile,
      worldSeed: this.worldSeed,
    });
    this.scene.add(this.env.group);
    if (this.trampledTrailPoints.length > 0) {
      this.env.updateTrailOverlay(this.trampledTrailPoints);
    }

    // Varied Architectural Houses across the 2048x4096 valley & random Village (double doors, fixed roofs)
    for (const site of CABIN_SITES) {
      const cabinVisual = buildCabin(this.textures, site.style);
      cabinVisual.group.position.set(site.x, cabinBaseY(site), site.z);
      cabinVisual.group.rotation.y = site.rot;
      this.scene.add(cabinVisual.group);
      const indoorChestWorld = fromCabinLocal(-2.75, 1.95, site);
      const isMerchantStyle =
        site.style === 'shop' || site.style === 'bakery' || site.style === 'alchemy';
      if (isMerchantStyle) {
        const counterWorld = fromCabinLocal(0.15, 0.25, site);
        const pos = new THREE.Vector3(counterWorld.x, cabinFloorY(site), counterWorld.z);
        if (site.style === 'shop') this.shopPos = pos;
        else if (site.style === 'bakery') this.bakeryPos = pos;
        else this.alchemyPos = pos;

        this.cabins.push({
          site,
          group: cabinVisual.group,
          roofGroup: cabinVisual.roofGroup,
          doorPivotL: cabinVisual.doorPivotL,
          doorPivotR: cabinVisual.doorPivotR,
          doorOpenAmt: 0,
          doorSoundState: false,
          hearthLight: cabinVisual.hearthLight,
          hearthFlame: cabinVisual.hearthFlame,
          workbenchPos: null,
          bedPos: null,
        });
      } else {
        const wbWorld = fromCabinLocal(-2.1, -0.65, site);
        const bedWorld = fromCabinLocal(2.55, -2.15, site);
        this.cabins.push({
          site,
          group: cabinVisual.group,
          roofGroup: cabinVisual.roofGroup,
          doorPivotL: cabinVisual.doorPivotL,
          doorPivotR: cabinVisual.doorPivotR,
          doorOpenAmt: 0,
          doorSoundState: false,
          hearthLight: cabinVisual.hearthLight,
          hearthFlame: cabinVisual.hearthFlame,
          workbenchPos: new THREE.Vector3(wbWorld.x, cabinBaseY(site) + 0.82, wbWorld.z),
          bedPos: new THREE.Vector3(bedWorld.x, cabinBaseY(site) + 0.65, bedWorld.z),
        });
      }
      const inChestId = `cabin_in_${site.id}`;
      const inOpened = this.openedChestIds.has(inChestId);
      if (inOpened) {
        cabinVisual.indoorChestLid.rotation.x = -0.85;
        cabinVisual.indoorChestLid.position.set(0, 0.88, -0.25);
      }
      this.chests.push({
        id: inChestId,
        group: cabinVisual.group,
        lid: cabinVisual.indoorChestLid,
        x: indoorChestWorld.x,
        z: indoorChestWorld.z,
        opened: inOpened,
        indoor: true,
      });
      if (site.id !== 'main') {
        const porchChestPos = fromCabinLocal(5.2, 1.5, site);
        this.createChest(`cabin_porch_${site.id}`, porchChestPos.x, porchChestPos.z, site.rot - 0.6);
      }
    }

    // Minecraft-style Block Caves carved into rocky mini-mountains
    for (const site of CAVE_SITES) {
      const caveVisual = buildCaveStructure(this.textures, site);
      caveVisual.group.position.set(site.x, site.floorY, site.z);
      caveVisual.group.rotation.y = site.rot;
      this.scene.add(caveVisual.group);
      this.caves.push({ site, visual: caveVisual });
      const caveChestPos = fromCaveLocal(-2.2, -7.8, site);
      this.createChest(`cave_${site.id}`, caveChestPos.x, caveChestPos.z, site.rot + 0.45);
    }

    // Village Center Well & Plaza Campfire
    const villageWell = buildVillageWell(this.textures);
    villageWell.position.set(
      VILLAGE_SITE.x,
      groundHeightAt(VILLAGE_SITE.x, VILLAGE_SITE.z),
      VILLAGE_SITE.z,
    );
    this.scene.add(villageWell);
    this.env.addStaticCollider({ x: VILLAGE_SITE.x, z: VILLAGE_SITE.z, radius: 1.75 });

    const vFire = buildCampfire();
    const vfx = VILLAGE_SITE.x + 5.2;
    const vfz = VILLAGE_SITE.z + 4.8;
    this.villageCampfirePos.set(vfx, groundHeightAt(vfx, vfz), vfz);
    vFire.group.position.copy(this.villageCampfirePos);
    this.villageCampfireFlame = vFire.flame;
    this.villageCampfireLight = vFire.light;
    this.scene.add(vFire.group);

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
    this.env.addStaticCollider({ x: 46, z: -24, radius: 1.6 });

    // Treasure chests across expanded landmarks + Village Square chest
    this.createChest('world_0', -21, -24, 0.6);
    this.createChest('world_1', riverCenterX(BRIDGE_Z) + 12, BRIDGE_Z + 5.5, -1.2);
    this.createChest('world_2', 49, -20, -2.3);
    this.createChest('world_3', -62, 42, 0.8);
    this.createChest('world_4', -14, -92, -0.4);
    this.createChest('world_5', 84, 46, -1.9);
    this.createChest('village_chest', VILLAGE_SITE.x - 4.8, VILLAGE_SITE.z - 4.6, 0.75);

    // Player avatar (ultra-detailed rig with shield on left arm & upgraded weapons on right)
    this.playerRig = buildRobloxPlayer(this.textures);
    this.playerRig.armorGroup.visible = this.upgrades.has('armor_ranger');
    this.playerRig.shieldAegisTrim.visible = this.upgrades.has('shield_aegis');
    (Object.keys(this.playerRig.weapons) as WeaponId[]).forEach((wId) => {
      this.playerRig.weapons[wId].visible = wId === this.activeWeapon;
    });
    this.py = saved ? Math.max(this.py, walkableHeightAt(this.px, this.pz)) : walkableHeightAt(this.px, this.pz);
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.scene.add(this.playerRig.root);

    this.slashArcMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 2.65, 22, 1, -Math.PI * 0.48, Math.PI * 0.96),
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

    this.slashCoreMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 2.35, 22, 1, -Math.PI * 0.42, Math.PI * 0.84),
      new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.slashCoreMesh.rotation.x = -Math.PI / 2;
    this.slashCoreMesh.visible = false;
    this.scene.add(this.slashCoreMesh);

    this.shockwaveGeo.rotateX(-Math.PI / 2);

    if (!this.isSoftwareGl && this.dofEnabled) {
      this.ensureComposer();
    } else {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private ensureComposer() {
    if (this.composer || this.isSoftwareGl) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
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
  }

  private applyRenderScale() {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
    } else if (this.isMobile) {
      const cap = this.ecoMode ? 1.0 : 1.35;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    } else {
      const cap = this.ecoMode ? 1.2 : 1.65;
      const mult = this.shadowUpscale && !this.ecoMode ? 1.15 : 1.0;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * mult, cap));
    }
  }

  private createChest(id: string, x: number, z: number, rotY: number) {
    const group = new THREE.Group();
    const y = walkableHeightAt(x, z);
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
    const opened = this.openedChestIds.has(id);
    if (opened) {
      lid.rotation.x = -0.85;
      lid.position.set(0, 1.08, -0.35);
    } else {
      lid.position.set(0, 0.86, 0);
    }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.1), goldMat);
    lock.position.set(0, 0.7, 0.48);

    group.add(base, bandL, bandR, lid, lock);
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.castShadow = true;
    });
    this.scene.add(group);
    this.chests.push({ id, group, lid, x, z, opened });
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
      displayName: 'Лісник Орест',
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

    // 1b. Shopkeeper Торговець Марко inside the Shop building
    const shopSite = CABIN_SITES.find((s) => s.style === 'shop');
    if (shopSite) {
      const merchVis = buildPeacefulMobModel('merchant', this.textures);
      const mp = fromCabinLocal(0.15, -2.35, shopSite);
      const my = cabinFloorY(shopSite);
      merchVis.root.position.set(mp.x, my, mp.z);
      merchVis.root.rotation.y = shopSite.rot;
      this.scene.add(merchVis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind: 'merchant',
        displayName: 'Торговець Марко',
        visual: merchVis,
        homeX: mp.x,
        homeZ: mp.z,
        x: mp.x,
        y: my,
        z: mp.z,
        vx: 0,
        vz: 0,
        yaw: shopSite.rot,
        walkPhase: 0,
        wanderAngle: shopSite.rot,
        wanderTimer: 4,
        fleeTimer: 0,
      });
    }

    // 1c. Blacksmith Коваль Богдан near Northern Watchtower Forge
    const northSite = CABIN_SITES.find((s) => s.style === 'watchtower');
    if (northSite) {
      const smithVis = buildPeacefulMobModel('blacksmith', this.textures);
      const sp = fromCabinLocal(2.4, 5.2, northSite);
      const sy = groundHeightAt(sp.x, sp.z);
      smithVis.root.position.set(sp.x, sy, sp.z);
      smithVis.root.rotation.y = northSite.rot;
      this.scene.add(smithVis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind: 'blacksmith',
        displayName: 'Коваль Богдан (Кузня)',
        visual: smithVis,
        homeX: sp.x,
        homeZ: sp.z,
        x: sp.x,
        y: sy,
        z: sp.z,
        vx: 0,
        vz: 0,
        yaw: northSite.rot,
        walkPhase: 0,
        wanderAngle: northSite.rot,
        wanderTimer: 4,
        fleeTimer: 0,
      });
    }

    // 1d. Herbalist Травниця Соломія near Herbalist Cottage
    const westSite = CABIN_SITES.find((s) => s.style === 'cottage');
    if (westSite) {
      const herbVis = buildPeacefulMobModel('herbalist', this.textures);
      const hp = fromCabinLocal(-2.2, 5.2, westSite);
      const hy = groundHeightAt(hp.x, hp.z);
      herbVis.root.position.set(hp.x, hy, hp.z);
      herbVis.root.rotation.y = westSite.rot;
      this.scene.add(herbVis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind: 'herbalist',
        displayName: 'Травниця Соломія (Трави)',
        visual: herbVis,
        homeX: hp.x,
        homeZ: hp.z,
        x: hp.x,
        y: hy,
        z: hp.z,
        vx: 0,
        vz: 0,
        yaw: westSite.rot,
        walkPhase: 0,
        wanderAngle: westSite.rot,
        wanderTimer: 4,
        fleeTimer: 0,
      });
    }

    // 1e. Explorer Скарбошукач Тарас near Ruins & Crystal Cave trail
    const expVis = buildPeacefulMobModel('explorer', this.textures);
    const ex = 39;
    const ez = -17;
    const ey = groundHeightAt(ex, ez);
    expVis.root.position.set(ex, ey, ez);
    this.scene.add(expVis.root);
    this.peacefulMobs.push({
      id: this.nextMobId++,
      kind: 'explorer',
      displayName: 'Скарбошукач Тарас',
      visual: expVis,
      homeX: ex,
      homeZ: ez,
      x: ex,
      y: ey,
      z: ez,
      vx: 0,
      vz: 0,
      yaw: -0.6,
      walkPhase: 0,
      wanderAngle: -0.6,
      wanderTimer: 4,
      fleeTimer: 0,
    });

    // 1f. 4 New Random-Spawn Village NPCs (Mayor, Baker, Alchemist, Guard)
    const hallSite = CABIN_SITES.find((s) => s.id === 'village_hall');
    if (hallSite) {
      const mayorVis = buildPeacefulMobModel('mayor', this.textures);
      const mp = fromCabinLocal(0, 4.5, hallSite);
      const my = groundHeightAt(mp.x, mp.z);
      mayorVis.root.position.set(mp.x, my, mp.z);
      mayorVis.root.rotation.y = hallSite.rot;
      this.scene.add(mayorVis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind: 'mayor',
        displayName: 'Староста Мирослав',
        visual: mayorVis,
        homeX: mp.x,
        homeZ: mp.z,
        x: mp.x,
        y: my,
        z: mp.z,
        vx: 0,
        vz: 0,
        yaw: hallSite.rot,
        walkPhase: 0,
        wanderAngle: hallSite.rot,
        wanderTimer: 4,
        fleeTimer: 0,
      });
    }

    const bakerySite = CABIN_SITES.find((s) => s.id === 'village_bakery');
    if (bakerySite) {
      const bakerVis = buildPeacefulMobModel('baker', this.textures);
      const bp = fromCabinLocal(0.15, -2.35, bakerySite);
      const by = cabinFloorY(bakerySite);
      bakerVis.root.position.set(bp.x, by, bp.z);
      bakerVis.root.rotation.y = bakerySite.rot;
      this.scene.add(bakerVis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind: 'baker',
        displayName: 'Пекарка Галина',
        visual: bakerVis,
        homeX: bp.x,
        homeZ: bp.z,
        x: bp.x,
        y: by,
        z: bp.z,
        vx: 0,
        vz: 0,
        yaw: bakerySite.rot,
        walkPhase: 0,
        wanderAngle: bakerySite.rot,
        wanderTimer: 4,
        fleeTimer: 0,
      });
    }

    const alchemySite = CABIN_SITES.find((s) => s.id === 'village_alchemy');
    if (alchemySite) {
      const alchVis = buildPeacefulMobModel('alchemist', this.textures);
      const ap = fromCabinLocal(0.15, -2.35, alchemySite);
      const ay = cabinFloorY(alchemySite);
      alchVis.root.position.set(ap.x, ay, ap.z);
      alchVis.root.rotation.y = alchemySite.rot;
      this.scene.add(alchVis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind: 'alchemist',
        displayName: 'Алхімік Лев',
        visual: alchVis,
        homeX: ap.x,
        homeZ: ap.z,
        x: ap.x,
        y: ay,
        z: ap.z,
        vx: 0,
        vz: 0,
        yaw: alchemySite.rot,
        walkPhase: 0,
        wanderAngle: alchemySite.rot,
        wanderTimer: 4,
        fleeTimer: 0,
      });
    }

    const watchVillageSite = CABIN_SITES.find((s) => s.id === 'village_watch');
    if (watchVillageSite) {
      const guardVis = buildPeacefulMobModel('guard', this.textures);
      const gp = fromCabinLocal(-2.1, 4.8, watchVillageSite);
      const gy = groundHeightAt(gp.x, gp.z);
      guardVis.root.position.set(gp.x, gy, gp.z);
      guardVis.root.rotation.y = watchVillageSite.rot;
      this.scene.add(guardVis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind: 'guard',
        displayName: 'Вартовий Северин',
        visual: guardVis,
        homeX: gp.x,
        homeZ: gp.z,
        x: gp.x,
        y: gy,
        z: gp.z,
        vx: 0,
        vz: 0,
        yaw: watchVillageSite.rot,
        walkPhase: 0,
        wanderAngle: watchVillageSite.rot,
        wanderTimer: 4,
        fleeTimer: 0,
      });
    }

    // 2. Grazing sheep across sunny meadows, western camp, & outskirts of the village
    const sheepSpots: [number, number][] = [
      [-18, 12],
      [-23, 18],
      [-48, 34],
      [-56, 46],
      [6, 28],
      [-8, -42],
      [-98, 66],
      [96, -12],
      [VILLAGE_SITE.x - 14, VILLAGE_SITE.z - 26],
      [VILLAGE_SITE.x + 18, VILLAGE_SITE.z + 24],
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

    // 3. Woodland deer across northern forest, eastern highlands, & outer 2048x4096 valley
    const deerSpots: [number, number][] = [
      [-32, -38],
      [-18, -74],
      [4, -84],
      [58, 16],
      [74, 38],
      [-74, -18],
      [-58, -118],
      [112, 74],
      [-220, -480],
      [260, 520],
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
      { kind: 'herb', x: -8, z: 4 },
      { kind: 'herb', x: -16, z: -8 },
      { kind: 'herb', x: 3, z: -2 },
      { kind: 'wood', x: -24, z: -12 },
      { kind: 'wood', x: -20, z: 22 },
      { kind: 'stone', x: -28, z: 6 },
      { kind: 'stone', x: 7, z: -26 },
      { kind: 'wood', x: -56, z: 36 },
      { kind: 'wood', x: -66, z: 46 },
      { kind: 'wood', x: -58, z: 52 },
      { kind: 'herb', x: -46, z: 26 },
      { kind: 'iron', x: -72, z: 38 },
      { kind: 'stone', x: -52, z: 58 },
      { kind: 'wood', x: -10, z: -64 },
      { kind: 'wood', x: -22, z: -84 },
      { kind: 'herb', x: -6, z: -78 },
      { kind: 'herb', x: -24, z: -96 },
      { kind: 'essence', x: -18, z: -104 },
      { kind: 'essence', x: -4, z: -92 },
      { kind: 'iron', x: -28, z: -72 },
      { kind: 'herb', x: 28, z: -4 },
      { kind: 'stone', x: 38, z: -14 },
      { kind: 'iron', x: 52, z: -32 },
      { kind: 'iron', x: 56, z: -18 },
      { kind: 'essence', x: 42, z: -36 },
      { kind: 'essence', x: 58, z: -26 },
      { kind: 'stone', x: 72, z: 32 },
      { kind: 'stone', x: 88, z: 52 },
      { kind: 'iron', x: 78, z: 48 },
      { kind: 'iron', x: 92, z: 38 },
      { kind: 'essence', x: 86, z: 62 },
      { kind: 'herb', x: 64, z: 22 },
      { kind: 'wood', x: 52, z: 44 },
      { kind: 'herb', x: -12, z: 44 },
      { kind: 'stone', x: 26, z: 52 },
      { kind: 'iron', x: 36, z: 64 },
    ];

    for (const cave of CAVE_SITES) {
      const oreSpot = fromCaveLocal(2.2, -5.8, cave);
      const gemSpot = fromCaveLocal(0.1, -8.3, cave);
      spots.push({ kind: 'iron', x: oreSpot.x, z: oreSpot.z });
      spots.push({ kind: 'essence', x: gemSpot.x, z: gemSpot.z });
    }

    spots.forEach((s, idx) => {
      const inCave = findInsideCave(s.x, s.z) !== null;
      const y = walkableHeightAt(s.x, s.z);
      if (!inCave && y < WATER_LEVEL + 0.1) return;
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
    window.addEventListener('pagehide', this.onBeforeUnload);
    window.addEventListener('beforeunload', this.onBeforeUnload);
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

  private onBeforeUnload = () => {
    this.saveGameNow(true);
  };

  public setModalOpen(open: boolean) {
    this.modalOpen = open;
    this.lastHoverX = null;
    this.lastHoverY = null;
    if (open) {
      this.isDraggingCam = false;
      this.keys = {};
      this.setBlocking(false);
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
    this.setBlocking(false);
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
    else if (e.code === 'KeyZ') this.activateRelic('amulet_vitality');
    else if (e.code === 'KeyX') this.activateRelic('cloak_wind');
    else if (e.code === 'KeyC') this.activateRelic('rune_power');
    else if (e.code === 'KeyB') {
      if (!e.repeat) this.setBlocking(true);
    } else if (e.code === 'KeyF') this.triggerAttack();
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
    if (e.code === 'KeyB') {
      this.setBlocking(false);
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    soundEngine.unlock();
    window.focus();
    this.renderer.domElement.focus({ preventScroll: true });
    if (this.phase !== 'playing') return;

    if (e.button === 2) {
      e.preventDefault();
      this.setBlocking(true);
      return;
    }

    if (this.pointerLocked) {
      if (e.button === 0) this.triggerAttack();
      return;
    }

    if (this.isDraggingCam) return;
    this.isDraggingCam = true;
    this.dragPointerId = e.pointerId;
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
      if (this.dragPointerId !== null && e.pointerId !== this.dragPointerId) return;
      const dx = e.clientX - this.lastDragX;
      const dy = e.clientY - this.lastDragY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      this.lastHoverX = e.clientX;
      this.lastHoverY = e.clientY;

      if (Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY) > 6) {
        this.dragMoved = true;
      }
      const sens = e.pointerType === 'touch' ? 0.0085 : 0.0068;
      this.camYaw -= dx * sens;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * (sens * 0.78), -0.15, 1.15);
      return;
    }

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
    if (e.button === 2) {
      this.setBlocking(false);
    }
    if (this.dragPointerId !== null && e.pointerId !== this.dragPointerId) return;
    if (this.isDraggingCam && !this.dragMoved && this.phase === 'playing' && e.pointerType !== 'touch') {
      if (e.button === 0) this.triggerAttack();
    }
    this.isDraggingCam = false;
    this.dragPointerId = null;
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
    this.blocking = false;
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

  public setBlocking(active: boolean) {
    if (active && this.phase === 'playing' && !this.blocking && this.stamina >= 4) {
      this.blocking = true;
      this.blockStartTime = this.lastElapsed;
      soundEngine.unlock();
      soundEngine.playShieldRaise();
      this.emitHud();
    } else if (!active && this.blocking) {
      this.blocking = false;
      this.emitHud();
    }
  }

  public cycleSeason() {
    soundEngine.unlock();
    const idx = SEASONS_ORDER.indexOf(this.season);
    this.season = SEASONS_ORDER[(idx + 1) % SEASONS_ORDER.length];
    this.autoSeasonTimer = SEASON_DURATION_SEC;
    this.syncAmbientSound();
    this.pushFeed(`Пора року: ${SEASON_LABELS[this.season]} (${WEATHER_LABELS[this.weather][this.season]})`);
    this.saveGameNow(true);
    this.emitHud();
  }

  public cycleWeather() {
    soundEngine.unlock();
    const idx = WEATHERS_ORDER.indexOf(this.weather);
    this.weather = WEATHERS_ORDER[(idx + 1) % WEATHERS_ORDER.length];
    this.autoWeatherTimer = WEATHER_DURATION_SEC;
    this.syncAmbientSound();
    this.pushFeed(`Погода: ${WEATHER_LABELS[this.weather][this.season]}`);
    this.saveGameNow(true);
    this.emitHud();
  }

  public saveGameNow(silent = false): boolean {
    const visitsEntries: [string, number][] = Array.from(this.trailVisits.entries()).slice(-3600);
    const data: SaveGameData = {
      version: 3,
      worldSeed: this.worldSeed,
      savedAt: Date.now(),
      px: this.px,
      py: this.py,
      pz: this.pz,
      playerYaw: this.playerYaw,
      hp: this.hp,
      maxHp: this.maxHp,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      xp: this.xp,
      xpToNext: this.xpToNext,
      level: this.level,
      coins: this.coins,
      kills: this.kills,
      wave: this.wave,
      activeWeapon: this.activeWeapon,
      season: this.season,
      weather: this.weather,
      autoSeasonTimer: this.autoSeasonTimer,
      autoWeatherTimer: this.autoWeatherTimer,
      resources: { ...this.resources },
      consumables: { ...this.consumables },
      upgrades: Array.from(this.upgrades),
      quests: {
        gather_valley: { ...this.questProgress.gather_valley },
        hunt_threats: { ...this.questProgress.hunt_threats },
        visit_traders: { ...this.questProgress.visit_traders },
        find_village: { ...this.questProgress.find_village },
        explore_caves: { ...this.questProgress.explore_caves },
        defeat_boss: { ...this.questProgress.defeat_boss },
      },
      visitedCaves: Array.from(this.visitedCaves),
      openedChests: Array.from(this.openedChestIds),
      npcGreeted: {
        villager: this.villagerGreeted,
        explorer: this.explorerGreeted,
        mayor: this.mayorGreeted,
        guard: this.guardGreeted,
      },
      trailVisits: visitsEntries,
    };
    const ok = saveGameToStorage(data);
    if (ok) {
      this.lastSavedAt = data.savedAt;
      if (!silent) {
        this.pushFeed('Гру збережено!');
        this.emitHud();
      }
    }
    return ok;
  }

  public resetNewGame() {
    clearSavedGame();
    window.location.reload();
  }

  private syncAmbientSound() {
    soundEngine.setAmbientWeather(
      this.weather === 'rain' ? 'rain' : this.weather === 'precip' ? 'wind' : 'none',
    );
  }

  public activateRelic(id: RelicId): boolean {
    soundEngine.unlock();
    if (this.phase !== 'playing') return false;
    const meta = RELIC_SKILLS.find((r) => r.id === id);
    if (!meta) return false;
    if (!this.upgrades.has(id)) {
      this.pushFeed(`Потрібна реліквія «${meta.name}» з Крамниці!`);
      this.emitHud();
      return false;
    }
    if (this.relicCooldowns[id] > 0) {
      this.pushFeed(`${meta.skillName} перезаряджається (${Math.ceil(this.relicCooldowns[id])}с)`);
      return false;
    }

    this.relicCooldowns[id] = meta.cooldown;
    if (id === 'amulet_vitality') {
      this.hp = Math.min(this.maxHp, this.hp + 45);
      this.stamina = Math.min(this.maxStamina, this.stamina + 35);
      soundEngine.playRelicSkill('heal');
      this.spawnShockwave(this.px, this.py + 0.15, this.pz, 0x4ade80, 4.4, 0.45);
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0x4ade80, 18);
      this.pushFeed('Амулет Життя: +45 HP та +35 витривалості!');
    } else if (id === 'cloak_wind') {
      const aimX = Math.sin(this.playerYaw);
      const aimZ = Math.cos(this.playerYaw);
      this.pvx += aimX * 19;
      this.pvz += aimZ * 19;
      this.windBuffTimer = 5.0;
      soundEngine.playRelicSkill('wind');
      this.spawnShockwave(this.px, this.py + 0.2, this.pz, 0x38bdf8, 3.6, 0.35);
      this.spawnBurst(this.px, this.py + 1.0, this.pz, 0x7dd3fc, 16);
      this.pushFeed('Плащ Вітру: Ривок та +40% швидкості на 5с!');
    } else {
      this.berserkBuffTimer = 6.0;
      this.cameraShake = Math.max(this.cameraShake, 0.22);
      soundEngine.playRelicSkill('berserk');
      this.spawnShockwave(this.px, this.py + 0.16, this.pz, 0xf97316, 5.6, 0.42);
      this.spawnBurst(this.px, this.py + 1.1, this.pz, 0xfb923c, 22);
      const aimX = Math.sin(this.playerYaw);
      const aimZ = Math.cos(this.playerYaw);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, 5.5, -1.0, 35, 13.0, 0xf97316);
      this.pushFeed('Руна Берсерка: Вибух люті та +45% шкоди на 6с!');
    }

    this.emitHud();
    return true;
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
      this.syncAmbientSound();
    }
    this.emitHud();
    return soundEngine.muted;
  }

  public toggleDof() {
    this.dofEnabled = !this.dofEnabled;
    if (this.dofEnabled && !this.composer) {
      this.ensureComposer();
    }
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
      const size = this.shadowUpscale ? (this.isMobile ? 2048 : 4096) : this.isMobile ? 1024 : 2048;
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

  public setTouchMove(mx: number, mz: number, sprint = false) {
    this.touchMoveX = mx;
    this.touchMoveZ = mz;
    this.touchSprint = sprint;
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
      soundEngine.playJump();
      this.spawnJumpCoins();
    }
  }

  private spawnJumpCoins() {
    const backX = -Math.sin(this.playerYaw);
    const backZ = -Math.cos(this.playerYaw);
    const startX = this.px + backX * 0.45;
    const startY = this.py + 0.9;
    const startZ = this.pz + backZ * 0.45;

    for (let i = 0; i < 2; i++) {
      const mesh = buildCoinModel(0.86);
      mesh.position.set(
        startX + (Math.random() - 0.5) * 0.28,
        startY + (Math.random() - 0.5) * 0.12,
        startZ + (Math.random() - 0.5) * 0.28,
      );
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.scene.add(mesh);

      const spread = (i === 0 ? -0.35 : 0.35) + (Math.random() - 0.5) * 0.25;
      const dirX = backX + backZ * spread;
      const dirZ = backZ - backX * spread;
      const spd = 2.8 + Math.random() * 1.6;
      this.particles.push({
        mesh,
        vx: dirX * spd,
        vy: 1.9 + Math.random() * 1.6,
        vz: dirZ * spd,
        life: 3.5,
        scale: 1.0,
        grow: 0,
        bounce: true,
        dropCoinOnLand: true,
      });
    }
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

  private advanceQuest(id: QuestId, delta = 1) {
    const state = this.questProgress[id];
    const def = QUESTS.find((q) => q.id === id);
    if (!state || !def || state.completed) return;

    state.progress = Math.min(def.targetCount, state.progress + delta);
    if (state.progress >= def.targetCount) {
      state.completed = true;
      this.coins += def.rewardCoins;
      this.grantXp(def.rewardXp);
      if (id === 'hunt_threats') this.consumables.potion += 1;
      else if (id === 'visit_traders') this.resources.iron += 2;
      else if (id === 'find_village') this.consumables.stew += 2;
      else if (id === 'explore_caves') this.resources.essence += 2;
      else if (id === 'defeat_boss') this.resources.essence += 3;

      soundEngine.playQuestComplete();
      this.spawnShockwave(this.px, this.py + 0.15, this.pz, 0xfacc15, 4.8, 0.55);
      this.spawnBurst(this.px, this.py + 1.5, this.pz, 0xfacc15, 22);
      this.pushFeed(`Квест виконано: «${def.title}» (${def.rewardNote})`);
      this.saveGameNow(true);
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
      } else if (recipe.outputUpgrade === 'shield_aegis') {
        this.playerRig.shieldAegisTrim.visible = true;
      }
    }

    soundEngine.playCraft();
    this.spawnBurst(this.px, this.py + 1.4, this.pz, 0x38bdf8, 16);
    this.pushFeed(`Створено: ${recipe.name}`);
    this.emitHud();
    return true;
  }

  public buyShopItem(itemId: string): boolean {
    soundEngine.unlock();
    const item = SHOP_ITEMS.find((it) => it.id === itemId);
    if (!item) return false;
    if (item.outputUpgrade && this.upgrades.has(item.outputUpgrade)) {
      this.pushFeed(`Вже придбано: ${item.name}`);
      return false;
    }
    if (this.coins < item.price) {
      this.pushFeed(`Потрібно ${item.price} монет!`);
      return false;
    }

    this.coins -= item.price;
    if (item.outputConsumable) {
      this.consumables[item.outputConsumable] += item.outputCount ?? 1;
    }
    if (item.outputResource) {
      this.resources[item.outputResource.id] += item.outputResource.amount;
    }
    if (item.outputUpgrade) {
      this.upgrades.add(item.outputUpgrade);
      if (item.outputUpgrade === 'amulet_vitality') {
        this.maxHp += 35;
        this.hp = Math.min(this.maxHp, this.hp + 35);
      } else if (item.outputUpgrade === 'cloak_wind') {
        this.maxStamina += 25;
        this.stamina = Math.min(this.maxStamina, this.stamina + 25);
      } else if (item.outputUpgrade === 'shield_aegis') {
        this.playerRig.shieldAegisTrim.visible = true;
      }
    }

    this.advanceQuest('visit_traders', 1);
    soundEngine.playCraft();
    this.spawnBurst(this.px, this.py + 1.4, this.pz, 0xfacc15, 16);
    this.pushFeed(`Куплено: ${item.name}`);
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
    this.advanceQuest('gather_valley', 1);
    this.emitHud();
  }

  public interactNearby() {
    soundEngine.unlock();

    // 1. Open nearby chest (outdoor, cabin, village, or cave chest)
    for (const chest of this.chests) {
      if (!chest.opened && Math.hypot(this.px - chest.x, this.pz - chest.z) < 3.4) {
        chest.opened = true;
        this.openedChestIds.add(chest.id);
        chest.lid.rotation.x = -0.85;
        if (chest.indoor) {
          chest.lid.position.set(0, 0.88, -0.25);
        } else {
          chest.lid.position.set(0, 1.08, -0.35);
        }
        this.coins += 65;
        this.resources.iron += 2;
        this.resources.hide += 1;
        this.resources.essence += 1;
        this.hp = Math.min(this.maxHp, this.hp + 35);
        this.grantXp(45);
        soundEngine.playPickup();
        this.spawnBurst(chest.x, walkableHeightAt(chest.x, chest.z) + 1.0, chest.z, 0xfbbf24, 14);
        this.pushFeed('Скриня: +65 мон., +2 Залізо, +1 Шкіра, +1 Есенція');
        this.saveGameNow(true);
        this.emitHud();
        return;
      }
    }

    // 2. Open Shop / Forge / Herbalist / Village Bakery / Village Alchemist depending on nearest Merchant
    const merchant = this.peacefulMobs.find((p) => p.kind === 'merchant');
    if (
      (this.shopPos && Math.hypot(this.px - this.shopPos.x, this.pz - this.shopPos.z) < 3.4) ||
      (merchant && Math.hypot(this.px - merchant.x, this.pz - merchant.z) < 3.8)
    ) {
      this.activeMerchantKind = 'general';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('general');
      this.emitHud();
      return;
    }
    const blacksmith = this.peacefulMobs.find((p) => p.kind === 'blacksmith');
    if (blacksmith && Math.hypot(this.px - blacksmith.x, this.pz - blacksmith.z) < 3.8) {
      this.activeMerchantKind = 'blacksmith';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('blacksmith');
      this.emitHud();
      return;
    }
    const herbalist = this.peacefulMobs.find((p) => p.kind === 'herbalist');
    if (herbalist && Math.hypot(this.px - herbalist.x, this.pz - herbalist.z) < 3.8) {
      this.activeMerchantKind = 'herbalist';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('herbalist');
      this.emitHud();
      return;
    }
    const baker = this.peacefulMobs.find((p) => p.kind === 'baker');
    if (
      (this.bakeryPos && Math.hypot(this.px - this.bakeryPos.x, this.pz - this.bakeryPos.z) < 3.4) ||
      (baker && Math.hypot(this.px - baker.x, this.pz - baker.z) < 3.8)
    ) {
      this.activeMerchantKind = 'baker';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('baker');
      this.emitHud();
      return;
    }
    const alchemist = this.peacefulMobs.find((p) => p.kind === 'alchemist');
    if (
      (this.alchemyPos && Math.hypot(this.px - this.alchemyPos.x, this.pz - this.alchemyPos.z) < 3.4) ||
      (alchemist && Math.hypot(this.px - alchemist.x, this.pz - alchemist.z) < 3.8)
    ) {
      this.activeMerchantKind = 'alchemist';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('alchemist');
      this.emitHud();
      return;
    }

    // 3. Rest on cabin bed (full heal + stamina + save)
    if (this.cabins.some((c) => c.bedPos && Math.hypot(this.px - c.bedPos.x, this.pz - c.bedPos.z) < 2.8)) {
      this.hp = this.maxHp;
      this.stamina = this.maxStamina;
      soundEngine.playPickup();
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0xfde047, 16);
      this.pushFeed('Відпочили на ліжку й збереглися: повне HP та витривалість!');
      this.saveGameNow(true);
      this.emitHud();
      return;
    }

    // 4. Harvest nearby resource node
    for (const node of this.resourceNodes) {
      if (node.available && Math.hypot(this.px - node.x, this.pz - node.z) < 3.2) {
        this.harvestResourceNode(node);
        return;
      }
    }

    // 5. Use Any Cabin Workbench
    if (this.cabins.some((c) => c.workbenchPos && Math.hypot(this.px - c.workbenchPos.x, this.pz - c.workbenchPos.z) < 2.9)) {
      this.onOpenCraftCb?.();
      return;
    }

    // 6. Talk to Village Mayor Староста Мирослав / Вартовий Северин / Лісник Орест / Скарбошукач Тарас
    const mayor = this.peacefulMobs.find((p) => p.kind === 'mayor');
    if (mayor && Math.hypot(this.px - mayor.x, this.pz - mayor.z) < 4.0) {
      soundEngine.playPickup();
      this.hp = Math.min(this.maxHp, this.hp + 35);
      this.advanceQuest('find_village', 1);
      if (!this.mayorGreeted) {
        this.mayorGreeted = true;
        this.coins += 40;
        this.resources.iron += 2;
        this.pushFeed(
          `Староста Мирослав: «Вітаємо у ${VILLAGE_SITE.name}! Завітайте до Пекарні Галини та Алхіміка Лева!»`,
        );
      } else {
        this.pushFeed(
          `Староста Мирослав: «Ваші стежки автоматично протоптуються там, де ви ходите часто!» (+35 HP)`,
        );
      }
      this.saveGameNow(true);
      this.emitHud();
      return;
    }

    const guard = this.peacefulMobs.find((p) => p.kind === 'guard');
    if (guard && Math.hypot(this.px - guard.x, this.pz - guard.z) < 3.8) {
      soundEngine.playPickup();
      this.stamina = Math.min(this.maxStamina, this.stamina + 45);
      if (!this.guardGreeted) {
        this.guardGreeted = true;
        this.resources.hide += 1;
        this.pushFeed('Вартовий Северин: «У глибоких Minecraft-печерах залягають алмазні кристали й залізо!»');
      } else {
        this.pushFeed('Вартовий Северин: «Тримайте щит напоготові — монстри чатують у горах!» (+45 витр.)');
      }
      this.emitHud();
      return;
    }

    const villager = this.peacefulMobs.find((p) => p.kind === 'villager');
    if (villager && Math.hypot(this.px - villager.x, this.pz - villager.z) < 3.8) {
      soundEngine.playPickup();
      this.hp = Math.min(this.maxHp, this.hp + 25);
      if (!this.villagerGreeted) {
        this.villagerGreeted = true;
        this.resources.wood += 2;
        this.resources.herb += 2;
        this.coins += 20;
        this.pushFeed('Орест: «У світі з’явилося Селище Вербове! Знайдіть його на мінікарті (смарагдова мітка).»');
      } else {
        this.pushFeed('Орест: «На півночі Коваль Богдан, на заході Травниця Соломія, а в Селищі — Пекарня й Алхімік!» (+25 HP)');
      }
      this.emitHud();
      return;
    }

    const explorer = this.peacefulMobs.find((p) => p.kind === 'explorer');
    if (explorer && Math.hypot(this.px - explorer.x, this.pz - explorer.z) < 3.8) {
      soundEngine.playPickup();
      this.stamina = Math.min(this.maxStamina, this.stamina + 35);
      if (!this.explorerGreeted) {
        this.explorerGreeted = true;
        this.resources.essence += 1;
        this.coins += 25;
        this.pushFeed('Тарас: «Усередині блокових печер багато руди й есенції! Заходьте у Кришталеву печеру праворуч!»');
      } else {
        this.pushFeed('Тарас: «У Руїнах чатує Тіньовий Лицар — парируйте щитом його удари!» (+35 витр.)');
      }
      this.emitHud();
    }
  }

  public spawnMobNearPlayer(kind: MobKind) {
    soundEngine.unlock();
    if (this.phase === 'title') this.startGame();
    const angle = this.playerYaw + (Math.random() - 0.5) * 0.9;
    const dist = 7.0 + Math.random() * 4;
    const [mx, mz] = resolveWorldBounds(
      this.px + Math.sin(angle) * dist,
      this.pz + Math.cos(angle) * dist,
      1.2,
    );
    this.spawnMobAt(kind, mx, mz);
    this.pushFeed(`З’явився ${MOB_DEFS[kind].name}`);
    this.emitHud();
  }

  private spawnMobAt(kind: MobKind, x: number, z: number) {
    const def = MOB_DEFS[kind];
    const visual = buildMobModel(kind, this.textures);
    const y = walkableHeightAt(x, z);
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
    const goblins = 3 + waveNum;
    const wolves = 3 + waveNum;
    const skeletons = 2 + Math.floor(waveNum / 2);
    const golems = Math.min(5, 1 + Math.floor(waveNum / 2));

    for (let i = 0; i < slimes; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 38;
      this.spawnMobAt('slime', Math.cos(a) * r - 4, Math.sin(a) * r);
    }
    for (let i = 0; i < goblins; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 26 + Math.random() * 46;
      this.spawnMobAt('goblin', Math.cos(a) * r + 6, Math.sin(a) * r - 8);
    }
    for (let i = 0; i < wolves; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 34 + Math.random() * 58;
      this.spawnMobAt('wolf', Math.cos(a) * r - 12, Math.sin(a) * r + 10);
    }
    for (let i = 0; i < skeletons; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 38 + Math.random() * 48;
      this.spawnMobAt('skeleton', Math.cos(a) * r + 16, Math.sin(a) * r - 18);
    }
    for (let i = 0; i < golems; i++) {
      const x = 44 + (Math.random() - 0.5) * 34;
      const z = -12 + (Math.random() - 0.5) * 44;
      this.spawnMobAt('golem', x, z);
    }
    for (const cave of CAVE_SITES) {
      const guardPos = fromCaveLocal(0, -4.6, cave);
      this.spawnMobAt(cave.id === 'bear_grotto' ? 'wolf' : 'skeleton', guardPos.x, guardPos.z);
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
    if (this.upgrades.has('rune_power')) damage = Math.round(damage * 1.22);
    if (this.berserkBuffTimer > 0) damage = Math.round(damage * 1.45);
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
      this.slashArcMesh.position.set(this.px + aimX * 0.95, this.py + 1.25, this.pz + aimZ * 0.95);
      this.slashArcMesh.rotation.z = -this.playerYaw + Math.PI * 0.5;
      this.slashCoreMesh.visible = true;
      this.slashCoreMesh.position.copy(this.slashArcMesh.position);
      this.slashCoreMesh.position.y += 0.04;
      this.slashCoreMesh.rotation.z = this.slashArcMesh.rotation.z;
      this.slashArcLife = 0.2;

      this.spawnBurst(this.px + aimX * 1.7, this.py + 1.25, this.pz + aimZ * 1.7, 0x7dd3fc, 7);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, w.range, 0.22, w.damage, w.knockback, 0x38bdf8);
      this.hitResourceNodesNear(this.px + aimX * 1.4, this.pz + aimZ * 1.4, 2.4);
    } else if (w.id === 'hammer') {
      soundEngine.playHammerSlam();
      const impactX = this.px + aimX * 1.75;
      const impactZ = this.pz + aimZ * 1.75;
      const groundY = walkableHeightAt(impactX, impactZ, this.py);
      this.spawnShockwave(impactX, groundY + 0.12, impactZ, 0xf59e0b, 4.4, 0.32);
      this.spawnShockwave(impactX, groundY + 0.16, impactZ, 0xfef08a, 2.8, 0.22);
      this.spawnStoneDebris(impactX, groundY + 0.25, impactZ, 10);
      this.cameraShake = Math.max(this.cameraShake, 0.24);

      this.hitMobsInArc(impactX, impactZ, aimX, aimZ, w.range, -1.0, w.damage, w.knockback, 0xf59e0b);
      this.hitResourceNodesNear(impactX, impactZ, 2.9);
    } else if (w.id === 'blaster') {
      soundEngine.playBlasterShot();
      this.fireProjectile(w.damage, w.knockback, 36, 0, 0x22d3ee, false);
    } else {
      soundEngine.playBowShot();
      this.fireProjectile(w.damage, w.knockback, 40, 4.2, 0xa3e635, true);
    }
  }

  private spawnStoneDebris(x: number, y: number, z: number, count: number) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.pebbleGeo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      const a = Math.random() * Math.PI * 2;
      const spd = 2.6 + Math.random() * 4.5;
      this.particles.push({
        mesh,
        vx: Math.cos(a) * spd,
        vy: 3.2 + Math.random() * 4.0,
        vz: Math.sin(a) * spd,
        life: 0.55 + Math.random() * 0.25,
        scale: 0.7 + Math.random() * 0.8,
        grow: -0.9,
        bounce: true,
        disposeOwnMaterial: i === count - 1,
      });
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

    const startX = this.px + _v1.x * 1.05;
    const startY = this.py + 1.5;
    const startZ = this.pz + _v1.z * 1.05;

    // Muzzle/string release VFX
    this.spawnBurst(startX, startY, startZ, color, isArrow ? 5 : 8);

    const meshGroup = new THREE.Group();
    if (isArrow) {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.028, 0.95, 6).rotateX(Math.PI * 0.5),
        new THREE.MeshBasicMaterial({ color: 0xa16207 }),
      );
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.18, 4).rotateX(Math.PI * 0.5),
        new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }),
      );
      tip.position.z = 0.5;
      const fletch = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.02, 0.22),
        new THREE.MeshBasicMaterial({ color }),
      );
      fletch.position.z = -0.38;
      meshGroup.add(shaft, tip, fletch);
    } else {
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xecfeff }),
      );
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }),
      );
      meshGroup.add(core, halo);
    }

    meshGroup.position.set(startX, startY, startZ);
    meshGroup.lookAt(startX + _v1.x, startY + _v1.y, startZ + _v1.z);
    this.scene.add(meshGroup);

    this.projectiles.push({
      mesh: meshGroup,
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
      trailTimer: 0.02,
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
    } else if (mob.kind === 'wolf') {
      addDrop('hide', 1 + (Math.random() < 0.5 ? 1 : 0));
      if (Math.random() < 0.4) addDrop('herb', 1);
    } else if (mob.kind === 'skeleton') {
      addDrop('stone', 1);
      addDrop('iron', 1);
      addDrop('essence', 1);
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
    this.advanceQuest('hunt_threats', 1);
    if (mob.kind === 'boss') {
      this.advanceQuest('defeat_boss', 1);
    }
    const lootStr = dropNotes.length > 0 ? ` · ${dropNotes.join(', ')}` : '';
    this.pushFeed(`Знищено: ${def.name} (+${def.rewardXp} XP${lootStr})`);
    this.emitHud();
  }

  private spawnPickup(kind: 'coin' | 'heal', x: number, z: number, value: number, pickupDelay = 0) {
    let mesh: THREE.Object3D;
    if (kind === 'coin') {
      mesh = buildCoinModel(0.95);
    } else {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        emissive: 0x16a34a,
        emissiveIntensity: 0.7,
        roughness: 0.2,
      });
      mesh = new THREE.Mesh(this.healGeo, mat);
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
        disposeOwnMaterial: i === count - 1,
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
    let [rx, rz] = resolveWorldBounds(x, z, radius);

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

    [rx, rz] = resolveCaveCollision(rx, rz, radius);

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
    return resolveWorldBounds(rx, rz, radius);
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
      this.lastElapsed = elapsed;

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
      const shadowMod = this.ecoMode ? 3 : 2;
      if (!this.isSoftwareGl && this.renderCount % shadowMod === 1) {
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

  private updateAtmosphere(dt: number, elapsed: number) {
    this.autoWeatherTimer -= dt;
    if (this.autoWeatherTimer <= 0) {
      this.autoWeatherTimer = WEATHER_DURATION_SEC;
      const idx = WEATHERS_ORDER.indexOf(this.weather);
      this.weather = WEATHERS_ORDER[(idx + 1) % WEATHERS_ORDER.length];
      this.syncAmbientSound();
      this.pushFeed(`Зміна погоди: ${WEATHER_LABELS[this.weather][this.season]}`);
    }

    this.autoSeasonTimer -= dt;
    if (this.autoSeasonTimer <= 0) {
      this.autoSeasonTimer = SEASON_DURATION_SEC;
      const idx = SEASONS_ORDER.indexOf(this.season);
      this.season = SEASONS_ORDER[(idx + 1) % SEASONS_ORDER.length];
      this.syncAmbientSound();
      this.pushFeed(`Настала пора року: ${SEASON_LABELS[this.season]}`);
    }

    // Seasonal sun elevation & gentle drift
    const elev = this.season === 'winter' ? 0.34 : this.season === 'autumn' ? 0.42 : 0.56;
    this.sunDir.set(-0.34 + Math.sin(elapsed * 0.015) * 0.08, elev, -0.82).normalize();

    let targetSunInt = this.season === 'winter' ? 2.7 : this.season === 'autumn' ? 3.05 : 3.45;
    let targetHemiInt = this.isMobile ? 0.72 : 0.64;
    let targetFogDensity = 0.0042;

    if (this.weather === 'rain') {
      targetSunInt *= 0.48;
      targetHemiInt *= 0.85;
      this.targetFogColor.setHex(0x8899a8);
      targetFogDensity = 0.0068;
      this.sunLight.color.setHex(0xcbd5e1);
    } else if (this.weather === 'fog') {
      targetSunInt *= 0.62;
      targetHemiInt *= 0.96;
      this.targetFogColor.setHex(0xc8d6e0);
      targetFogDensity = 0.0125;
      this.sunLight.color.setHex(0xe2e8f0);
    } else if (this.season === 'autumn') {
      this.targetFogColor.setHex(0xdfd3be);
      this.sunLight.color.setHex(0xffe0a8);
    } else if (this.season === 'winter') {
      this.targetFogColor.setHex(0xd6e6f2);
      targetFogDensity = 0.0048;
      this.sunLight.color.setHex(0xeef6ff);
    } else {
      this.targetFogColor.setHex(0xcbdde6);
      this.sunLight.color.setHex(0xfff0cc);
    }

    const k = 1 - Math.exp(-dt * 2.0);
    this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, targetSunInt, k);
    this.hemiLight.intensity = THREE.MathUtils.lerp(this.hemiLight.intensity, targetHemiInt, k);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(this.targetFogColor, k);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(this.targetFogColor, k);
      this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, targetFogDensity, k);
    }

    this.env.setEnvironmentState(
      this.season,
      this.weather,
      _v1.set(this.px, this.py, this.pz),
      this.sunDir,
      dt,
      elapsed,
    );
  }

  private update(dt: number, elapsed: number) {
    this.env.update(elapsed, dt);
    this.updateAtmosphere(dt, elapsed);

    const fireScaleX = 1 + Math.sin(elapsed * 14) * 0.12;
    const fireScaleY = 1 + Math.cos(elapsed * 11) * 0.18;
    this.campfireFlame.scale.set(fireScaleX, fireScaleY, fireScaleX);
    this.villageCampfireFlame.scale.set(fireScaleX, fireScaleY, fireScaleX);

    // Distance-cull buildings, caves, outdoor chests, & resource nodes to slash draw calls
    for (let idx = 0; idx < this.cabins.length; idx++) {
      const c = this.cabins[idx];
      const dSq = (this.px - c.site.x) ** 2 + (this.pz - c.site.z) ** 2;
      const visible = dSq < 230 * 230;
      c.group.visible = visible;
      if (!visible) continue;

      c.hearthFlame.scale.set(
        1 + Math.sin(elapsed * 13 + idx) * 0.14,
        1 + Math.cos(elapsed * 11 + idx * 1.3) * 0.2,
        1 + Math.sin(elapsed * 13 + idx) * 0.14,
      );

      if (dSq < 18 * 18 || c.doorOpenAmt > 0.01) {
        const doorWorld = fromCabinLocal(0, CABIN_HALF_D, c.site);
        const nearDoor = Math.hypot(this.px - doorWorld.x, this.pz - doorWorld.z) < 4.5;
        const targetOpen = nearDoor ? 1 : 0;
        c.doorOpenAmt = THREE.MathUtils.damp(c.doorOpenAmt, targetOpen, 8, dt);
        c.doorPivotL.rotation.y = c.doorOpenAmt * Math.PI * 0.48;
        c.doorPivotR.rotation.y = -c.doorOpenAmt * Math.PI * 0.48;
        if (nearDoor && !c.doorSoundState) {
          c.doorSoundState = true;
          soundEngine.playDoorCreak(true);
        } else if (!nearDoor && c.doorSoundState && c.doorOpenAmt < 0.15) {
          c.doorSoundState = false;
          soundEngine.playDoorCreak(false);
        }
      }
    }

    if (this.ruinCrystal) {
      this.ruinCrystal.rotation.y += dt * 1.2;
      this.ruinCrystal.position.y = 2.4 + Math.sin(elapsed * 2.4) * 0.16;
    }

    for (const cave of this.caves) {
      const dSq = (this.px - cave.site.x) ** 2 + (this.pz - cave.site.z) ** 2;
      const visible = dSq < 235 * 235;
      cave.visual.group.visible = visible;
      if (!visible) continue;
      if (dSq < 55 * 55) {
        cave.visual.torchFlames.forEach((f, idx) => {
          f.scale.set(
            1 + Math.sin(elapsed * 12 + idx) * 0.14,
            1 + Math.cos(elapsed * 10 + idx) * 0.18,
            1 + Math.sin(elapsed * 12 + idx) * 0.14,
          );
        });
        cave.visual.crystalMeshes.forEach((cr, idx) => {
          cr.rotation.y += dt * 0.25 * (idx % 2 === 0 ? 1 : -1);
        });
      }
    }

    for (const chest of this.chests) {
      if (!chest.indoor) {
        const dSq = (this.px - chest.x) ** 2 + (this.pz - chest.z) ** 2;
        chest.group.visible = dSq < 175 * 175;
      }
    }

    for (const node of this.resourceNodes) {
      if (!node.available) {
        node.respawnTimer -= dt;
        if (node.respawnTimer <= 0) {
          node.available = true;
        }
        node.mesh.visible = false;
      } else {
        const dSq = (this.px - node.x) ** 2 + (this.pz - node.z) ** 2;
        node.mesh.visible = dSq < 180 * 180;
        if (node.mesh.visible && node.kind === 'essence') {
          node.mesh.rotation.y += dt * 0.5;
        }
      }
    }

    this.updatePooledLights(elapsed);

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

    this.sunLight.position.set(
      this.px + this.sunDir.x * 58,
      this.sunDir.y * 58,
      this.pz + this.sunDir.z * 58,
    );
    this.sunLight.target.position.set(this.px, this.py, this.pz);

    if (this.mobs.length === 0 && this.phase === 'playing') {
      this.waveClearDelay += dt;
      if (this.waveClearDelay > 2.2) {
        this.waveClearDelay = 0;
        this.hp = Math.min(this.maxHp, this.hp + 30);
        this.spawnWave(this.wave + 1);
      }
    }

    // Periodic 5s localStorage autosave while playing
    this.autosaveTimer += dt;
    if (this.autosaveTimer >= 5.0) {
      this.autosaveTimer = 0;
      this.saveGameNow(true);
    }

    this.hudThrottle += dt;
    if (this.hudThrottle >= 0.08) {
      this.hudThrottle = 0;
      this.emitHud();
    }
  }

  private updatePooledLights(elapsed: number) {
    if (this.pooledLights.length === 0) return;
    // Zero-allocation top-3 closest active light slots
    let d0 = 900, d1 = 900, d2 = 900;
    let x0 = 0, y0 = 0, z0 = 0, c0 = 0xff9b42, i0 = 0, r0 = 18;
    let x1 = 0, y1 = 0, z1 = 0, c1 = 0xff9b42, i1 = 0, r1 = 18;
    let x2 = 0, y2 = 0, z2 = 0, c2 = 0xff9b42, i2 = 0, r2 = 18;

    const consider = (x: number, y: number, z: number, color: number, intensity: number, dist: number) => {
      const dSq = (this.px - x) ** 2 + (this.pz - z) ** 2;
      if (dSq >= d2) return;
      if (dSq < d0) {
        d2 = d1; x2 = x1; y2 = y1; z2 = z1; c2 = c1; i2 = i1; r2 = r1;
        d1 = d0; x1 = x0; y1 = y0; z1 = z0; c1 = c0; i1 = i0; r1 = r0;
        d0 = dSq; x0 = x; y0 = y; z0 = z; c0 = color; i0 = intensity; r0 = dist;
      } else if (dSq < d1) {
        d2 = d1; x2 = x1; y2 = y1; z2 = z1; c2 = c1; i2 = i1; r2 = r1;
        d1 = dSq; x1 = x; y1 = y; z1 = z; c1 = color; i1 = intensity; r1 = dist;
      } else {
        d2 = dSq; x2 = x; y2 = y; z2 = z; c2 = color; i2 = intensity; r2 = dist;
      }
    };

    const flickerA = 5.2 + Math.sin(elapsed * 12) * 0.85;
    consider(this.campfirePos.x, this.campfirePos.y + 1.1, this.campfirePos.z, 0xff9238, flickerA, 20);
    consider(
      this.villageCampfirePos.x,
      this.villageCampfirePos.y + 1.1,
      this.villageCampfirePos.z,
      0xff9238,
      flickerA,
      20,
    );

    for (let idx = 0; idx < this.cabins.length; idx++) {
      const c = this.cabins[idx];
      if (!c.group.visible) continue;
      if ((this.px - c.site.x) ** 2 + (this.pz - c.site.z) ** 2 > 28 * 28) continue;
      const hw = fromCabinLocal(0, -1.8, c.site);
      consider(
        hw.x,
        cabinBaseY(c.site) + 1.45,
        hw.z,
        0xff9b42,
        4.6 + Math.cos(elapsed * 10 + idx) * 0.75,
        16,
      );
    }

    for (const cave of this.caves) {
      if (!cave.visual.group.visible) continue;
      if ((this.px - cave.site.x) ** 2 + (this.pz - cave.site.z) ** 2 > 30 * 30) continue;
      const tPos = fromCaveLocal(-2.2, 1.5, cave.site);
      consider(
        tPos.x,
        cave.site.floorY + 3.1,
        tPos.z,
        0xffaa44,
        4.8 + Math.sin(elapsed * 11) * 0.65,
        20,
      );
      const cPos = fromCaveLocal(0, -6.5, cave.site);
      consider(cPos.x, cave.site.floorY + 2.3, cPos.z, cave.site.crystalColor, 4.4, 18);
    }

    const slots = [
      [d0, x0, y0, z0, c0, i0, r0],
      [d1, x1, y1, z1, c1, i1, r1],
      [d2, x2, y2, z2, c2, i2, r2],
    ];
    for (let s = 0; s < this.pooledLights.length; s++) {
      const pl = this.pooledLights[s];
      const [dSq, lx, ly, lz, lc, li, lr] = slots[s];
      if (dSq < 900) {
        pl.visible = true;
        pl.position.set(lx, ly, lz);
        pl.color.setHex(lc);
        pl.intensity = li;
        pl.distance = lr;
      } else {
        pl.visible = false;
        pl.intensity = 0;
      }
    }
  }

  private updatePlayer(dt: number, elapsed: number) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt * 4.5);
    this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);
    this.windBuffTimer = Math.max(0, this.windBuffTimer - dt);
    this.berserkBuffTimer = Math.max(0, this.berserkBuffTimer - dt);
    this.cameraShake = Math.max(0, this.cameraShake - dt * 1.4);
    for (const id of Object.keys(this.relicCooldowns) as RelicId[]) {
      this.relicCooldowns[id] = Math.max(0, this.relicCooldowns[id] - dt);
    }

    if (this.keys['KeyQ']) this.camYaw += 1.9 * dt;
    if (this.keys['KeyV']) this.camYaw -= 1.9 * dt;

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
    const isGuarding = this.blocking && this.attackAnim <= 0.1;
    const sprinting =
      moving &&
      !isGuarding &&
      (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchSprint) &&
      this.stamina > 2 &&
      !this.inWater;

    if (isGuarding) {
      this.stamina = Math.max(0, this.stamina - 7.5 * dt);
      if (this.stamina <= 0.5) {
        this.blocking = false;
      }
    } else if (sprinting) {
      this.stamina = Math.max(0, this.stamina - 24 * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
    }

    const speedMult =
      (this.upgrades.has('boots_swift') ? 1.22 : 1.0) *
      (this.upgrades.has('cloak_wind') ? 1.18 : 1.0) *
      (this.windBuffTimer > 0 ? 1.4 : 1.0) *
      (isGuarding ? 0.62 : 1.0);
    const analogScale = Math.min(1, inputLen);
    const baseSpeed = (this.inWater ? 5.2 : sprinting ? 11.4 : 7.6) * speedMult * analogScale;
    if (moving) {
      const nf = fwd / inputLen;
      const ns = strafe / inputLen;
      const moveX = -Math.sin(this.camYaw) * nf + Math.cos(this.camYaw) * ns;
      const moveZ = -Math.cos(this.camYaw) * nf - Math.sin(this.camYaw) * ns;
      this.pvx = THREE.MathUtils.damp(this.pvx, moveX * baseSpeed, 14, dt);
      this.pvz = THREE.MathUtils.damp(this.pvz, moveZ * baseSpeed, 14, dt);

      if (this.attackAnim < 0.25 && !isGuarding) {
        const targetYaw = Math.atan2(moveX, moveZ);
        let diff = targetYaw - this.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerYaw += diff * Math.min(1, dt * 14);
      } else if (isGuarding) {
        // Keep shield oriented forward along camera view when guarding
        const guardYaw = this.camYaw + Math.PI;
        let diff = guardYaw - this.playerYaw;
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
    const insideCaveSite = findInsideCave(this.px, this.pz);
    this.insideCabin = insideSite !== null;
    this.insideCave = insideCaveSite !== null;
    if (insideCaveSite && !this.visitedCaves.has(insideCaveSite.id)) {
      this.visitedCaves.add(insideCaveSite.id);
      this.advanceQuest('explore_caves', 1);
    }
    for (const c of this.cabins) {
      c.roofGroup.visible = insideSite?.id !== c.site.id;
    }

    const wasGrounded = this.grounded;
    const surfaceY = walkableHeightAt(this.px, this.pz, this.py);
    const wasInWater = this.inWater;
    // Strict river-channel gating guarantees player NEVER falls into water while walking on dry meadows
    const insideRiver = Math.abs(this.px - riverCenterX(this.pz)) <= riverHalfWidthAt(this.pz) + 0.55;
    this.inWater = insideRiver && surfaceY < WATER_LEVEL - 0.15 && this.py < WATER_LEVEL + 0.15;
    if (!wasInWater && this.inWater) {
      soundEngine.playSplash();
      this.spawnBurst(this.px, WATER_LEVEL + 0.1, this.pz, 0xbae6fd, 8);
      this.spawnShockwave(this.px, WATER_LEVEL + 0.04, this.pz, 0xe0f2fe, 2.2, 0.48);
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
      soundEngine.playLand();
    }

    // Record player-trampled 2m x 2m cells; render trail ONLY after >10 walks (11+)
    if (this.grounded && !this.inWater && !this.insideCabin && !this.insideCave) {
      const qx = Math.round(this.px / 2) * 2;
      const qz = Math.round(this.pz / 2) * 2;
      const cellKey = `${qx},${qz}`;
      if (cellKey !== this.lastTrailCellKey) {
        this.lastTrailCellKey = cellKey;
        const nextCount = (this.trailVisits.get(cellKey) ?? 0) + 1;
        this.trailVisits.set(cellKey, nextCount);
        if (this.trailVisits.size > 4000) {
          const oldest = this.trailVisits.keys().next().value;
          if (oldest !== undefined) this.trailVisits.delete(oldest);
        }
        if (nextCount === TRAIL_STEPS_THRESHOLD + 1) {
          this.trampledTrailPoints.push({ x: qx, z: qz });
          this.env.updateTrailOverlay(this.trampledTrailPoints);
          this.pushFeed('Протоптано нову стежку!');
        }
      }
    }

    // Swimming ripples
    const speedHoriz = Math.hypot(this.pvx, this.pvz);
    if (this.inWater && speedHoriz > 0.6) {
      this.waterRippleTimer -= dt;
      if (this.waterRippleTimer <= 0) {
        this.waterRippleTimer = 0.24;
        this.spawnShockwave(this.px, WATER_LEVEL + 0.04, this.pz, 0xe0f2fe, 1.85, 0.55);
      }
    }

    // Warm campfire, village square fire, or indoor hearth gently heals the hero
    if (
      (Math.hypot(this.px - this.campfirePos.x, this.pz - this.campfirePos.z) < 4.5 ||
        Math.hypot(this.px - this.villageCampfirePos.x, this.pz - this.villageCampfirePos.z) < 4.5 ||
        this.insideCabin) &&
      this.hp < this.maxHp
    ) {
      this.hp = Math.min(this.maxHp, this.hp + (this.insideCabin ? 8 : 12) * dt);
    }

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
      rig.leftArm.rotation.y = 0;
      rig.leftArm.rotation.z = 0;
      rig.leftLeg.rotation.x = paddle * 0.55;
      rig.rightLeg.rotation.x = -paddle * 0.55;
    } else {
      const lean = sprinting ? 0.14 : isGuarding ? 0.06 : 0;
      rig.bodyTilt.rotation.x = THREE.MathUtils.damp(rig.bodyTilt.rotation.x, lean, 10, dt);
      const swing = speedHoriz > 0.4 && this.grounded ? Math.sin(this.walkPhase) * 0.78 : 0;
      rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, swing, 16, dt);
      rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, -swing, 16, dt);

      if (isGuarding) {
        rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -1.25, 18, dt);
        rig.leftArm.rotation.y = THREE.MathUtils.damp(rig.leftArm.rotation.y, 0.75, 18, dt);
        rig.leftArm.rotation.z = THREE.MathUtils.damp(rig.leftArm.rotation.z, -0.58, 18, dt);
      } else {
        rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -swing * 0.85, 16, dt);
        rig.leftArm.rotation.y = THREE.MathUtils.damp(rig.leftArm.rotation.y, 0, 14, dt);
        rig.leftArm.rotation.z = THREE.MathUtils.damp(rig.leftArm.rotation.z, 0, 14, dt);
      }
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
      m.visual.root.visible = dist < 185;

      let moveDirX = 0;
      let moveDirZ = 0;
      let moveSpeed = 0;

      if (this.phase === 'playing' && dist < def.aggroRadius && !this.insideCabin) {
        if (dist > def.attackRange * 0.85) {
          moveDirX = dx / dist;
          moveDirZ = dz / dist;
          moveSpeed = def.speed;
        } else if (m.attackTimer <= 0 && this.hurtCooldown <= 0) {
          m.attackTimer = def.attackCooldown;
          const armorMult = this.upgrades.has('armor_ranger') ? 0.75 : 1.0;
          const incoming = Math.max(1, Math.round(def.damage * armorMult));

          if (this.blocking && this.stamina >= 4) {
            const hasAegis = this.upgrades.has('shield_aegis');
            const parry = elapsed - this.blockStartTime <= 0.3;
            if (parry) {
              this.stamina = Math.max(0, this.stamina - 4);
              this.hurtCooldown = 0.42;
              soundEngine.playShieldBlock(true);
              this.spawnBurst(this.px, this.py + 1.35, this.pz, 0xfef08a, 14);
              this.spawnShockwave(this.px, this.py + 0.25, this.pz, 0x38bdf8, 3.0, 0.3);
              this.damageMob(m, i, hasAegis ? 24 : 12, -dx, -dz, dist, 13.5, 0xfef08a);
              this.pushFeed('Ідеальне парирування щитом!');
            } else {
              const blockedDmg = Math.max(1, Math.round(incoming * (hasAegis ? 0.08 : 0.2)));
              this.hp = Math.max(0, this.hp - blockedDmg);
              this.stamina = Math.max(0, this.stamina - 10);
              this.hurtCooldown = 0.42;
              soundEngine.playShieldBlock(false);
              this.spawnBurst(this.px, this.py + 1.25, this.pz, 0xbae6fd, 9);
              if (dist > 0.01) {
                m.vx -= (dx / dist) * 5;
                m.vz -= (dz / dist) * 5;
              }
            }
          } else {
            this.hp = Math.max(0, this.hp - incoming);
            this.hurtCooldown = 0.45;
            soundEngine.playPlayerHurt();
            this.cameraShake = Math.max(this.cameraShake, 0.16);
            if (dist > 0.01) {
              this.pvx += (dx / dist) * 6;
              this.pvz += (dz / dist) * 6;
            }
          }

          if (this.hp <= 0) {
            this.phase = 'dead';
            this.blocking = false;
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
      m.y = walkableHeightAt(m.x, m.z, m.y);

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
      } else if (m.kind === 'wolf') {
        const legSwing = Math.sin(m.walkPhase * 1.2) * Math.min(0.75, spd * 0.15);
        if (m.visual.legFL) m.visual.legFL.rotation.x = legSwing;
        if (m.visual.legBR) m.visual.legBR.rotation.x = legSwing;
        if (m.visual.legFR) m.visual.legFR.rotation.x = -legSwing;
        if (m.visual.legBL) m.visual.legBL.rotation.x = -legSwing;
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
      pm.visual.root.visible = dist < 185;

      if (
        pm.kind === 'villager' ||
        pm.kind === 'merchant' ||
        pm.kind === 'blacksmith' ||
        pm.kind === 'herbalist' ||
        pm.kind === 'explorer' ||
        pm.kind === 'mayor' ||
        pm.kind === 'baker' ||
        pm.kind === 'alchemist' ||
        pm.kind === 'guard'
      ) {
        if (dist < 7.5) {
          const targetYaw = Math.atan2(this.px - pm.x, this.pz - pm.z);
          let diff = targetYaw - pm.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          pm.yaw += diff * Math.min(1, dt * 6);
        } else if (pm.kind === 'villager' || pm.kind === 'explorer' || pm.kind === 'mayor' || pm.kind === 'guard') {
          pm.yaw = 0.4 + Math.sin(elapsed * 0.4) * 0.2;
        }
        pm.y = walkableHeightAt(pm.x, pm.z, pm.y);
        pm.visual.root.position.set(pm.x, pm.y, pm.z);
        pm.visual.root.rotation.y = pm.yaw;
        if (pm.visual.head) {
          pm.visual.head.rotation.y = Math.sin(elapsed * 1.1 + pm.id) * 0.12;
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
      if (p.gravity > 0) {
        p.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
      }

      p.trailTimer -= dt;
      if (p.trailTimer <= 0) {
        p.trailTimer = 0.03;
        this.spawnBurst(p.x, p.y, p.z, p.color, 1);
      }

      const inRiver = Math.abs(p.x - riverCenterX(p.z)) <= riverHalfWidthAt(p.z) + 0.5;
      const floorY = walkableHeightAt(p.x, p.z, p.y);
      const effectiveFloor = inRiver ? Math.max(floorY, WATER_LEVEL - 0.15) : floorY;
      const hitGround = p.life <= 0 || p.y <= effectiveFloor;
      let hitMob = false;

      if (!hitGround) {
        for (let mIdx = this.mobs.length - 1; mIdx >= 0; mIdx--) {
          const m = this.mobs[mIdx];
          const def = MOB_DEFS[m.kind];
          const distXZ = Math.hypot(m.x - p.x, m.z - p.z);
          if (distXZ <= def.radius + 0.35 && p.y >= m.y && p.y <= m.y + def.height + 0.5) {
            hitMob = true;
            soundEngine.playHit(false);
            this.damageMob(m, mIdx, p.damage, p.vx, p.vz, Math.hypot(p.vx, p.vz), p.knockback, p.color);
            break;
          }
        }
      }

      if (hitGround || hitMob) {
        if (hitGround) this.spawnBurst(p.x, p.y + 0.08, p.z, p.color, 4);
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
        item.y = walkableHeightAt(item.x, item.z, item.y) + 0.65;
        item.mesh.position.x = item.x;
        item.mesh.position.z = item.z;
      }

      if ((!item.pickupDelay || item.pickupDelay <= 0) && d < 1.25) {
        if (item.kind === 'coin') {
          this.coins += item.value;
        } else {
          this.hp = Math.min(this.maxHp, this.hp + item.value);
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
        const floorY = walkableHeightAt(pt.mesh.position.x, pt.mesh.position.z, pt.mesh.position.y) + 0.12;
        if (pt.mesh.position.y < floorY) {
          if (pt.dropCoinOnLand) {
            const lx = pt.mesh.position.x;
            const lz = pt.mesh.position.z;
            this.spawnPickup('coin', lx, lz, 1, 0.42);
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
        if (pt.disposeOwnMaterial) {
          const mat = (pt.mesh as THREE.Mesh).material;
          if (mat && !Array.isArray(mat)) mat.dispose();
        }
        this.particles.splice(i, 1);
      }
    }
  }

  private updateEffects(dt: number) {
    if (this.slashArcLife > 0) {
      this.slashArcLife -= dt;
      const t = Math.max(0, this.slashArcLife / 0.2);
      (this.slashArcMesh.material as THREE.MeshBasicMaterial).opacity = t * 0.85;
      (this.slashCoreMesh.material as THREE.MeshBasicMaterial).opacity = t * 0.95;
      this.slashArcMesh.scale.setScalar(1.0 + (1 - t) * 0.42);
      this.slashCoreMesh.scale.setScalar(1.0 + (1 - t) * 0.35);
      if (this.slashArcLife <= 0) {
        this.slashArcMesh.visible = false;
        this.slashCoreMesh.visible = false;
      }
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
    const goalDist = this.insideCabin
      ? Math.min(this.targetCamDist, 4.4)
      : this.insideCave
        ? Math.min(this.targetCamDist, 4.1)
        : this.targetCamDist;
    this.camDist = THREE.MathUtils.damp(this.camDist, goalDist, 12, dt);

    const effectivePitch = this.insideCabin
      ? Math.max(this.camPitch, 0.44)
      : this.insideCave
        ? THREE.MathUtils.clamp(this.camPitch, 0.08, 0.34)
        : this.camPitch;
    const horizDist = Math.cos(effectivePitch) * this.camDist;
    const vertOffset =
      Math.sin(effectivePitch) * this.camDist +
      (this.insideCabin ? 2.45 : this.insideCave ? 1.45 : 1.85);

    const walkBobY = Math.sin(this.camBobPhase * 2) * 0.11 * this.camBobAmt;
    const walkBobSide = Math.cos(this.camBobPhase) * 0.085 * this.camBobAmt;
    const idleSwayY = Math.sin(elapsed * 1.45) * 0.035;
    const idleSwaySide = Math.cos(elapsed * 0.95) * 0.025;
    const swimBob = this.inWater ? Math.sin(elapsed * 3.1) * 0.08 : 0;

    const totalBobY = walkBobY + idleSwayY + swimBob - this.camLandingDip;
    const totalBobSide = walkBobSide + idleSwaySide;

    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);

    const shakeX = (Math.random() - 0.5) * this.cameraShake;
    const shakeY = (Math.random() - 0.5) * this.cameraShake;

    const targetX = this.px + Math.sin(this.camYaw) * horizDist + rightX * totalBobSide + shakeX;
    const targetZ = this.pz + Math.cos(this.camYaw) * horizDist + rightZ * totalBobSide;
    const targetY = this.insideCave
      ? THREE.MathUtils.clamp(this.py + vertOffset + totalBobY + shakeY, this.py + 0.9, this.py + 3.4)
      : Math.max(groundHeightAt(targetX, targetZ) + 0.75, this.py + vertOffset + totalBobY + shakeY);

    _camGoal.set(targetX, targetY, targetZ);
    this.camera.position.lerp(_camGoal, 1 - Math.exp(-16 * dt));

    _lookTarget.set(
      this.px + rightX * totalBobSide * 0.45,
      this.py + 1.68 + totalBobY * 0.55,
      this.pz + rightZ * totalBobSide * 0.45,
    );
    this.camera.lookAt(_lookTarget);
    this.camera.rotateZ(Math.cos(this.camBobPhase) * 0.0085 * this.camBobAmt);

    if (this.dofPass && this.dofEnabled) {
      const focusDist = this.camera.position.distanceTo(_lookTarget);
      this.dofPass.uniforms['uFocus'].value = focusDist;
    }
  }

  private emitHud() {
    const w = WEAPONS.find((item) => item.id === this.activeWeapon)!;
    const nearCampfire =
      Math.hypot(this.px - this.campfirePos.x, this.pz - this.campfirePos.z) < 4.5 ||
      Math.hypot(this.px - this.villageCampfirePos.x, this.pz - this.villageCampfirePos.z) < 4.5;
    const nearChest = this.chests.some(
      (c) => !c.opened && Math.hypot(this.px - c.x, this.pz - c.z) < 3.4,
    );
    const nearBed = this.cabins.some(
      (c) => c.bedPos && Math.hypot(this.px - c.bedPos.x, this.pz - c.bedPos.z) < 2.8,
    );
    const nearWorkbench = this.cabins.some(
      (c) => c.workbenchPos && Math.hypot(this.px - c.workbenchPos.x, this.pz - c.workbenchPos.z) < 2.9,
    );

    const merchant = this.peacefulMobs.find((p) => p.kind === 'merchant');
    const blacksmith = this.peacefulMobs.find((p) => p.kind === 'blacksmith');
    const herbalist = this.peacefulMobs.find((p) => p.kind === 'herbalist');
    const baker = this.peacefulMobs.find((p) => p.kind === 'baker');
    const alchemist = this.peacefulMobs.find((p) => p.kind === 'alchemist');
    const mayor = this.peacefulMobs.find((p) => p.kind === 'mayor');
    const guard = this.peacefulMobs.find((p) => p.kind === 'guard');
    const explorer = this.peacefulMobs.find((p) => p.kind === 'explorer');
    const villager = this.peacefulMobs.find((p) => p.kind === 'villager');

    const nearGeneral = Boolean(
      (this.shopPos && Math.hypot(this.px - this.shopPos.x, this.pz - this.shopPos.z) < 3.4) ||
        (merchant && Math.hypot(this.px - merchant.x, this.pz - merchant.z) < 3.8),
    );
    const nearSmith = Boolean(blacksmith && Math.hypot(this.px - blacksmith.x, this.pz - blacksmith.z) < 3.8);
    const nearHerb = Boolean(herbalist && Math.hypot(this.px - herbalist.x, this.pz - herbalist.z) < 3.8);
    const nearBaker = Boolean(
      (this.bakeryPos && Math.hypot(this.px - this.bakeryPos.x, this.pz - this.bakeryPos.z) < 3.4) ||
        (baker && Math.hypot(this.px - baker.x, this.pz - baker.z) < 3.8),
    );
    const nearAlch = Boolean(
      (this.alchemyPos && Math.hypot(this.px - this.alchemyPos.x, this.pz - this.alchemyPos.z) < 3.4) ||
        (alchemist && Math.hypot(this.px - alchemist.x, this.pz - alchemist.z) < 3.8),
    );
    const nearShop = nearGeneral || nearSmith || nearHerb || nearBaker || nearAlch;

    if (nearSmith) this.activeMerchantKind = 'blacksmith';
    else if (nearHerb) this.activeMerchantKind = 'herbalist';
    else if (nearBaker) this.activeMerchantKind = 'baker';
    else if (nearAlch) this.activeMerchantKind = 'alchemist';
    else if (nearGeneral) this.activeMerchantKind = 'general';

    const nearNode = this.resourceNodes.find(
      (n) => n.available && Math.hypot(this.px - n.x, this.pz - n.z) < 3.2,
    );
    const nearVillager = Boolean(villager && Math.hypot(this.px - villager.x, this.pz - villager.z) < 3.8);
    const nearExplorer = Boolean(explorer && Math.hypot(this.px - explorer.x, this.pz - explorer.z) < 3.8);
    const nearMayor = Boolean(mayor && Math.hypot(this.px - mayor.x, this.pz - mayor.z) < 4.0);
    const nearGuard = Boolean(guard && Math.hypot(this.px - guard.x, this.pz - guard.z) < 3.8);

    const nearNpcLabel = nearSmith
      ? 'Коваль Богдан — Кузня та Щит'
      : nearHerb
        ? 'Травниця Соломія — Еліксири'
        : nearBaker
          ? 'Пекарка Галина — Пекарня'
          : nearAlch
            ? 'Алхімік Лев — Алхімічна Лавка'
            : nearGeneral
              ? 'Торговець Марко — Крамниця'
              : nearMayor
                ? 'Поговорити зі Старостою Мирославом'
                : nearGuard
                  ? 'Поговорити з Вартовим Северином'
                  : nearExplorer
                    ? 'Поговорити зі Скарбошукачем Тарасом'
                    : nearVillager
                      ? 'Поговорити з Лісником Орестом'
                      : null;

    const quests: QuestProgressState[] = QUESTS.map((q) => ({
      id: q.id,
      progress: this.questProgress[q.id].progress,
      completed: this.questProgress[q.id].completed,
    }));

    const minimapEntities: MinimapEntity[] = [];
    minimapEntities.push({
      x: VILLAGE_SITE.x,
      z: VILLAGE_SITE.z,
      kind: 'village',
      label: VILLAGE_SITE.name,
    });
    for (const c of CABIN_SITES) {
      minimapEntities.push({ x: c.x, z: c.z, kind: 'cabin', label: c.name });
    }
    for (const cv of CAVE_SITES) {
      minimapEntities.push({ x: cv.x, z: cv.z, kind: 'cave', label: cv.name });
    }
    for (const pm of this.peacefulMobs) {
      if (
        pm.kind === 'merchant' ||
        pm.kind === 'blacksmith' ||
        pm.kind === 'herbalist' ||
        pm.kind === 'baker' ||
        pm.kind === 'alchemist'
      ) {
        minimapEntities.push({ x: pm.x, z: pm.z, kind: 'merchant', label: pm.displayName });
      } else if (
        pm.kind === 'villager' ||
        pm.kind === 'explorer' ||
        pm.kind === 'mayor' ||
        pm.kind === 'guard'
      ) {
        minimapEntities.push({ x: pm.x, z: pm.z, kind: 'npc', label: pm.displayName });
      }
    }
    for (const m of this.mobs) {
      minimapEntities.push({
        x: m.x,
        z: m.z,
        kind: m.kind === 'boss' ? 'boss' : 'mob',
      });
    }

    // Point minimap beacon to the first uncompleted quest objective
    const nextQuest = quests.find((q) => !q.completed);
    if (nextQuest?.id === 'visit_traders') {
      const sp = shopSitePosFallback();
      minimapEntities.push({ x: sp.x, z: sp.z, kind: 'quest', label: 'Торговець' });
    } else if (nextQuest?.id === 'find_village') {
      minimapEntities.push({
        x: VILLAGE_SITE.x,
        z: VILLAGE_SITE.z,
        kind: 'quest',
        label: VILLAGE_SITE.name,
      });
    } else if (nextQuest?.id === 'explore_caves') {
      minimapEntities.push({ x: CAVE_SITES[0].x, z: CAVE_SITES[0].z, kind: 'quest', label: 'Печера' });
    } else if (nextQuest?.id === 'defeat_boss') {
      minimapEntities.push({ x: 46, z: -24, kind: 'quest', label: 'Бос' });
    }

    const parryActive = this.blocking && this.lastElapsed - this.blockStartTime <= 0.3;

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
      activeWeapon: this.activeWeapon,
      weaponCooldownRatio: Math.min(1, this.attackCooldown / w.cooldown),
      blocking: this.blocking,
      parryActive,
      relicCooldowns: { ...this.relicCooldowns },
      relicBuffTimers: {
        wind: this.windBuffTimer,
        berserk: this.berserkBuffTimer,
      },
      season: this.season,
      weather: this.weather,
      seasonRemainingSec: Math.max(0, Math.round(this.autoSeasonTimer)),
      zoneName: getZoneName(this.px, this.pz),
      insideCabin: this.insideCabin,
      insideCave: this.insideCave,
      nearCampfire,
      nearChest,
      nearBed,
      nearWorkbench,
      nearShop,
      activeMerchantKind: this.activeMerchantKind,
      nearNpcLabel,
      nearResourceLabel: nearNode ? nearNode.label : null,
      nearVillager: nearVillager || nearExplorer || nearMayor || nearGuard,
      inWater: this.inWater,
      pointerLocked: this.pointerLocked,
      autoFollowCam: this.autoFollowCam,
      dofEnabled: this.dofEnabled,
      shadowUpscale: this.shadowUpscale,
      ecoMode: this.ecoMode,
      muted: soundEngine.muted,
      fps: this.currentFps,
      frameMs: this.currentFrameMs,
      playerX: this.px,
      playerZ: this.pz,
      playerYaw: this.playerYaw,
      villageX: VILLAGE_SITE.x,
      villageZ: VILLAGE_SITE.z,
      trampledCount: this.trampledTrailPoints.length,
      trailCells: this.trampledTrailPoints,
      minimapEntities,
      quests,
      resources: { ...this.resources },
      consumables: { ...this.consumables },
      upgrades: Array.from(this.upgrades),
      killFeed: this.killFeed,
      lastSavedAt: this.lastSavedAt,
    });
  }

  public dispose() {
    this.saveGameNow(true);
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    soundEngine.setAmbientWeather('none');

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('pagehide', this.onBeforeUnload);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
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
    this.pebbleGeo.dispose();
    this.healGeo.dispose();
    this.shockwaveGeo.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}

function shopSitePosFallback(): { x: number; z: number } {
  const s = CABIN_SITES.find((c) => c.style === 'shop');
  return s ? { x: s.x, z: s.z } : { x: 38, z: 10 };
}
