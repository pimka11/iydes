import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { soundEngine } from './audio';
import { buildWorldEnvironment, BuildExclusionZone, ObstacleCollider, WorldEnvironment } from './environment';
import {
  buildAdminGalleryPainting,
  buildArchedBridge,
  buildCabin,
  buildCampfire,
  buildCaveStructure,
  buildCoinModel,
  buildDungeonStructure,
  buildFinalBossArena,
  buildMobModel,
  buildPeacefulMobModel,
  buildPlayerStructureModel,
  buildRemoteNameTag,
  buildResourceNodeModel,
  buildRobloxPlayer,
  buildSpawnThrone,
  buildStarterToolStand,
  buildStoneRuins,
  buildVillageWell,
  BuiltStructureVisual,
  CaveVisual,
  DungeonVisual,
  ensurePlayerWeaponMesh,
  HIT_FLASH_MAT,
  MobVisual,
  PeacefulMobVisual,
  PlayerRig,
  RemoteNameTagHandle,
  updateRemoteNameTag,
} from './models';
import { MultiplayerClient } from './multiplayer';
import {
  clearSavedGame,
  loadSavedGame,
  saveGameToStorage,
} from './save';
import {
  biomeAt,
  BiomeId,
  BRIDGE_Z,
  CABIN_ROT,
  CABIN_SITES,
  CabinSite,
  cabinBaseY,
  cabinFloorY,
  cabinSecondFloorY,
  CAVE_CHAMBER_Z,
  CAVE_END_Z,
  CAVE_PORTAL_Z,
  CAVE_SITES,
  CaveSite,
  caveCeilingClearanceAt,
  caveFloorYAt,
  caveHalfWidthAt,
  cavePathCenterX,
  DUNGEON_SITES,
  DungeonSite,
  dungeonFloorY,
  FINAL_ARENA_X,
  FINAL_ARENA_Z,
  findInsideCabin,
  findInsideCave,
  findInsideDungeon,
  fromCabinLocal,
  fromCaveLocal,
  fromDungeonLocal,
  getCabinDims,
  getZoneName,
  groundHeightAt,
  initializeWorldLayout,
  resolveCabinCollision,
  resolveCaveCollision,
  resolveDungeonCollision,
  resolveWorldBounds,
  riverCenterX,
  riverHalfWidthAt,
  toCabinLocal,
  toCaveLocal,
  VILLAGE_SITE,
  VILLAGE_SITES,
  walkableHeightAt,
  WATER_LEVEL,
} from './terrain';
import { createProceduralTextures, ProceduralTextures } from './textures';
import {
  ActiveGoalHud,
  BUILD_PIECES,
  BuildPieceKind,
  BuiltStructureData,
  CameraViewMode,
  ConsumableId,
  CONSUMABLES,
  CRAFT_RECIPES,
  createDefaultConsumables,
  DEFAULT_GRAPHICS_SETTINGS,
  GameHudState,
  GameMode,
  GraphicsSettings,
  KillFeedItem,
  MerchantKind,
  MinimapEntity,
  MOB_DEFS,
  MobKind,
  OnlineChatMessage,
  OnlinePlayerState,
  PeacefulMobKind,
  PotionBuffKey,
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
  WEAPON_UNLOCK_MAP,
  WEATHER_DURATION_SEC,
  WEATHER_LABELS,
  WeatherId,
  WeaponId,
  WEAPONS,
} from './types';

const BUILD_GRID = 4.0;
const COLLIDER_CELL_SIZE = 8;

function packColliderCell(cx: number, cz: number): number {
  return (cx + 2048) * 4096 + (cz + 2048);
}

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
      float farFactor = clamp((dist - (uFocus + 18.0)) / 52.0, 0.0, 1.0);

      if (farFactor < 0.08) {
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
  flashActive?: boolean;
  walkPhase: number;
  wanderAngle: number;
  wanderTimer: number;
  caveId?: string;
  dungeonId?: string;
  specialTimer?: number;
  slowTimer?: number;
  guardTimer?: number;
  chargeTimer?: number;
  chargeDirX?: number;
  chargeDirZ?: number;
  windupTimer?: number;
  splitDone?: boolean;
  isMiniSplit?: boolean;
  aiAccumDt?: number;
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
  hp: number;
  maxHp: number;
  hitFlash: number;
  flashActive?: boolean;
  walkPhase: number;
  wanderAngle: number;
  wanderTimer: number;
  fleeTimer: number;
  aiAccumDt?: number;
}

interface ResourceNodeEntity {
  id: number;
  kind: Exclude<ResourceId, 'hide' | 'raw_meat'>;
  label: string;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
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
  fromMob?: boolean;
  statusEffect?: 'slow' | 'poison' | 'burn' | 'explode_fire';
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
  pooledSpark?: boolean;
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
  doorWorldX: number;
  doorWorldZ: number;
  hearthWorldX: number;
  hearthWorldY: number;
  hearthWorldZ: number;
}

interface CaveMount {
  site: CaveSite;
  visual: CaveVisual;
  lightAnchors: { x: number; y: number; z: number; color: number; baseInt: number; radius: number }[];
}

interface DungeonMount {
  site: DungeonSite;
  visual: DungeonVisual;
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

interface BuiltStructureEntity extends BuiltStructureData {
  visual: BuiltStructureVisual;
  doorOpenAmt: number;
  doorSoundState: boolean;
}

interface FallingTreeAnim {
  group: THREE.Group;
  timer: number;
  duration: number;
  fallAxisX: number;
  fallAxisZ: number;
  scale: number;
  species: 'oak' | 'autumn' | 'blossom' | 'pine';
  x: number;
  y: number;
  z: number;
  impacted: boolean;
}

interface RemotePlayerEntity {
  id: string;
  data: OnlinePlayerState;
  rig: PlayerRig;
  nameTag: RemoteNameTagHandle;
  x: number;
  y: number;
  z: number;
  yaw: number;
  walkPhase: number;
  attackAnim: number;
}

const RESOURCE_LABELS: Record<Exclude<ResourceId, 'hide' | 'raw_meat'>, string> = {
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
  private bloomPass: UnrealBloomPass | null = null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private textures!: ProceduralTextures;
  private env!: WorldEnvironment;
  private playerRig!: PlayerRig;

  private cabins: CabinMount[] = [];
  private caves: CaveMount[] = [];
  private dungeons: DungeonMount[] = [];
  private shopPos: THREE.Vector3 | null = null;
  private bakeryPos: THREE.Vector3 | null = null;
  private alchemyPos: THREE.Vector3 | null = null;
  private shopCounterSpots: THREE.Vector3[] = [];
  private bakeryCounterSpots: THREE.Vector3[] = [];
  private alchemyCounterSpots: THREE.Vector3[] = [];
  private extraCampfirePos: THREE.Vector3[] = [];
  private extraCampfireFlames: THREE.Mesh[] = [];
  private ambientMobTimer = 1.5;
  private worldSeed = 42069;

  private isSoftwareGl = false;
  private isMobile = false;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private lastRenderMs = 0;
  private renderCount = 0;
  private lastShadowPx = 99999;
  private lastShadowPz = 99999;
  private currentFps = 60;
  private currentFrameMs = 16;
  private fpsSamples = 0;
  private fpsWindowStart = performance.now();
  private lastElapsed = 0;

  private graphicsSettings: GraphicsSettings = { ...DEFAULT_GRAPHICS_SETTINGS };
  private dofEnabled = false;
  private shadowUpscale = false;
  private ecoMode = DEFAULT_GRAPHICS_SETTINGS.ecoMode;
  private autoFollowCam = false;
  private modalOpen = false;
  private pooledLights: THREE.PointLight[] = [];

  private phase: 'title' | 'playing' | 'dying' | 'dead' | 'victory' = 'playing';
  private gameMode: GameMode = 'survival';
  private cameraViewMode: CameraViewMode = 'third';
  private potionBuffs = {
    rage: 0,
    swift: 0,
    ironSkin: 0,
    regen: 0,
  };
  private adminPaintingGroup!: THREE.Group;
  private adminPaintingPos = new THREE.Vector3(-7.5, 0, 5.5);
  private spawnThroneGroup!: THREE.Group;
  private spawnThronePos = new THREE.Vector3(3.2, 0, 6.2);
  private spawnThroneBtnMesh: THREE.Mesh | null = null;
  private spawnThroneBtnBaseY = 1.38;
  private throneBtnPressTimer = 0;
  private cachedZoneName = 'Сонячна Галявина';
  private cachedZoneX = 99999;
  private cachedZoneZ = 99999;
  private toolStandGroup!: THREE.Group;
  private toolStandPos = new THREE.Vector3(-10.8, 0, -12.6);
  private deathAnimTimer = 0;
  private respawnAnimTimer = 0;
  private respawnAuraRing!: THREE.Mesh;
  private playTimeSec = 0;
  private victoryAchieved = false;
  private villageBeacon!: THREE.Mesh;
  private bossBeacon!: THREE.Mesh;
  private finalBossBeacon!: THREE.Mesh;
  private secretBossBeacon!: THREE.Mesh;
  private finalArenaCrystalMeshes: THREE.Object3D[] = [];
  private finalArenaFlameMeshes: THREE.Object3D[] = [];
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
  private insideCaveSite: CaveSite | null = null;
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
    frost_crown: 0,
    thunder_totem: 0,
    vampire_fang: 0,
    titan_aegis: 0,
    phoenix_feather: 0,
    void_step: 0,
  };
  private windBuffTimer = 0;
  private berserkBuffTimer = 0;
  private frostAuraBuffTimer = 0;
  private vampireBuffTimer = 0;
  private titanShieldBuffTimer = 0;
  private phoenixRegenBuffTimer = 0;

  // Dynamic Season & Weather state (longer 15-min seasons)
  private season: SeasonId = 'summer';
  private weather: WeatherId = 'clear';
  private autoWeatherTimer = WEATHER_DURATION_SEC;
  private autoSeasonTimer = SEASON_DURATION_SEC;
  private sunDir = new THREE.Vector3(-0.32, 0.46, -0.82).normalize();
  private targetFogColor = new THREE.Color(0xcbdde6);
  private waterRippleTimer = 0;
  private cameraShake = 0;
  private stepShake = 0;
  private lastStepHalfCycle = 0;
  private lastFootstepTick = 0;

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
  private playerSlowTimer = 0;
  private playerPoisonTimer = 0;
  private playerBurnTimer = 0;
  private playerBleedTimer = 0;
  private playerDotTick = 0;

  // Inventory, crafting, quests, persistence, & multi-merchant state
  private resources: Record<ResourceId, number> = {
    wood: 2,
    stone: 1,
    iron: 0,
    herb: 2,
    essence: 0,
    hide: 0,
    raw_meat: 0,
  };
  private consumables: Record<ConsumableId, number> = createDefaultConsumables();
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
    defeat_final_boss: { progress: 0, completed: false },
  };

  // Tree chopping & Player House Building state
  private initialChoppedTrees: string[] = [];
  private pendingSavedBuilds: BuiltStructureData[] = [];
  private workbenchStock = 0;
  private selectedBuildPiece: BuildPieceKind = 'floor';
  private buildRotIndex = 0;
  private buildFloorLevel = 0; // 0 = Авто, 1..6 = Поверх 1..6
  private builtStructures: BuiltStructureEntity[] = [];
  private buildPreviewGroup!: THREE.Group;
  private buildPreviewMeshes: Partial<Record<BuildPieceKind, THREE.Group>> = {};
  private previewMatValid = new THREE.MeshBasicMaterial({
    color: 0x4ade80,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  private previewMatInvalid = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
  });
  private previewValid = false;
  private previewX = 0;
  private previewY = 0;
  private previewZ = 0;
  private previewRotY = 0;
  private nearTreeTarget: {
    id: string;
    x: number;
    z: number;
    dist: number;
    hp: number;
    maxHp: number;
    species: 'oak' | 'autumn' | 'blossom' | 'pine';
  } | null = null;
  private nearMineTarget: ResourceNodeEntity | null = null;
  private fallingTrees: FallingTreeAnim[] = [];
  private peacefulRespawns: { kind: 'sheep' | 'deer'; homeX: number; homeZ: number; timer: number }[] = [];
  private nextBuildId = 1;

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
  private colliderGrid = new Map<number, ObstacleCollider[]>();
  private cachedCollidersVersion = -1;
  private sparkMatCache = new Map<number, THREE.MeshBasicMaterial>();
  private projMatCache = new Map<string, THREE.MeshBasicMaterial>();
  private projArrowShaftGeo = new THREE.CylinderGeometry(0.025, 0.028, 0.95, 6).rotateX(Math.PI * 0.5);
  private projArrowTipGeo = new THREE.ConeGeometry(0.06, 0.18, 4).rotateX(Math.PI * 0.5);
  private projArrowFletchGeo = new THREE.BoxGeometry(0.14, 0.02, 0.22);
  private projOrbCoreGeo = new THREE.SphereGeometry(0.16, 8, 8);
  private projOrbHaloGeo = new THREE.SphereGeometry(0.28, 8, 8);
  private projMobCoreGeo = new THREE.OctahedronGeometry(0.24, 0);
  private projMobHaloGeo = new THREE.SphereGeometry(0.38, 8, 8);
  private projArrowShaftMat = new THREE.MeshBasicMaterial({ color: 0xa16207 });
  private projArrowTipMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  private projBoltCoreMat = new THREE.MeshBasicMaterial({ color: 0xecfeff });
  private projMobCoreMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  private woodChipMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.88 });
  private sparkMeshPool: THREE.Mesh[] = [];
  private staticMinimapEntities: MinimapEntity[] = [];
  private cachedMinimapEntities: MinimapEntity[] = [];
  private minimapHudTick = 0;
  private cachedUpgradesSize = -1;
  private cachedUpgradesArr: UpgradeId[] = [];
  private aiTick = 0;

  private multiplayer!: MultiplayerClient;
  private onlineConnected = false;
  private pingMs: number | null = null;
  private onlinePlayersSnapshot: OnlinePlayerState[] = [];
  private onlineChat: OnlineChatMessage[] = [];
  private remotePlayers = new Map<string, RemotePlayerEntity>();
  private initialWorldSeed?: number;

  constructor(
    container: HTMLElement,
    onHudUpdate: (state: GameHudState) => void,
    onContextLostCb?: () => void,
    onOpenCraftCb?: () => void,
    onOpenShopCb?: (merchant: MerchantKind) => void,
    initialWorldSeed?: number,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextLostCb = onContextLostCb;
    this.onOpenCraftCb = onOpenCraftCb;
    this.onOpenShopCb = onOpenShopCb;
    this.initialWorldSeed = initialWorldSeed;

    this.initScene();
    this.bindEvents();
    this.spawnPeacefulMobs();
    this.spawnResourceNodes();
    this.spawnCaveGuards();
    this.spawnWave(this.wave);
    this.initMultiplayer();
    this.pushFeed(
      this.loadedFromSave
        ? `Збереження відновлено · Селище: ${VILLAGE_SITE.name}`
        : `Нова пригода! Шукайте ${VILLAGE_SITE.name}, печери й перемагайте Тіньового Лицаря!`,
    );
    this.emitHud();
    this.startLoop();
  }

  private initMultiplayer() {
    this.multiplayer = new MultiplayerClient({
      onConnectionChange: (connected) => {
        this.onlineConnected = connected;
        if (!connected) {
          this.onlinePlayersSnapshot = [];
          this.pingMs = null;
        }
        this.emitHud();
      },
      onPingChange: (ms) => {
        this.pingMs = ms;
      },
      onWelcome: (msg) => {
        this.onlineConnected = true;
        if (typeof msg.worldSeed === 'number' && msg.worldSeed !== this.worldSeed) {
          this.worldSeed = msg.worldSeed;
          initializeWorldLayout(this.worldSeed);
          this.staticMinimapEntities = [
            ...VILLAGE_SITES.map((v) => ({ x: v.x, z: v.z, kind: 'village' as const, label: v.name })),
            ...CABIN_SITES.map((c) => ({ x: c.x, z: c.z, kind: 'cabin' as const, label: c.name })),
            ...CAVE_SITES.map((cv) => ({ x: cv.x, z: cv.z, kind: 'cave' as const, label: cv.name })),
            ...DUNGEON_SITES.map((d) => ({ x: d.x, z: d.z, kind: 'dungeon' as const, label: d.name })),
          ];
          this.cachedMinimapEntities = [];
        }
        this.season = msg.season;
        this.weather = msg.weather;
        this.syncAmbientSound();
        this.onlineChat = Array.isArray(msg.chatHistory) ? msg.chatHistory.slice(-40) : [];

        let buildsChanged = false;
        if (Array.isArray(msg.builtStructures)) {
          for (const s of msg.builtStructures) {
            if (!this.builtStructures.some((b) => b.id === s.id)) {
              this.spawnBuiltStructure(s);
              buildsChanged = true;
            }
          }
          // If server had no builds yet but local player had existing builds, sync them up once
          if (msg.builtStructures.length === 0 && this.builtStructures.length > 0) {
            for (const b of this.builtStructures) {
              this.multiplayer.sendBuildAdd({
                id: b.id,
                kind: b.kind,
                x: b.x,
                y: b.y,
                z: b.z,
                rotY: b.rotY,
              });
            }
          }
        }
        if (buildsChanged) {
          this.syncBuildGrassExclusions();
        }
        this.syncRemotePlayers(msg.players);
        this.pushFeed(
          `Онлайн-сервер: підключено (${Math.max(1, msg.players.length)} гравц. у світі)`,
        );
        this.emitHud();
      },
      onPlayersSnapshot: (players) => {
        this.syncRemotePlayers(players);
      },
      onPlayerJoin: (player) => {
        if (!this.isSelfOnlinePlayer(player)) {
          this.upsertRemotePlayer(player);
          const tag = player.device === 'mobile' ? '📱' : '🖥️';
          this.pushFeed(`${tag} ${player.name} зайшов на сервер!`);
          this.emitHud();
        }
      },
      onPlayerLeave: (id, name) => {
        if (id !== this.multiplayer.selfId) {
          this.removeRemotePlayer(id);
          this.pushFeed(`Гравець ${name} вийшов із сервера`);
          this.emitHud();
        }
      },
      onPlayerAction: (msg) => {
        const rp = this.remotePlayers.get(msg.id);
        if (!rp) return;
        rp.attackAnim = 1.0;
        const d = Math.hypot(rp.x - this.px, rp.z - this.pz);
        if (d > 52) return;
        const aimX = Math.sin(msg.yaw);
        const aimZ = Math.cos(msg.yaw);
        if (msg.actionKind === 'slam') {
          this.spawnShockwave(msg.x + aimX * 1.6, msg.y + 0.14, msg.z + aimZ * 1.6, 0xf59e0b, 4.0, 0.3);
          this.spawnBurst(msg.x + aimX * 1.6, msg.y + 0.4, msg.z + aimZ * 1.6, 0xfbbf24, 8);
        } else if (msg.actionKind === 'shoot') {
          this.spawnBurst(msg.x + aimX * 1.4, msg.y + 1.35, msg.z + aimZ * 1.4, 0x38bdf8, 5);
        } else {
          this.spawnBurst(msg.x + aimX * 1.3, msg.y + 1.2, msg.z + aimZ * 1.3, 0x7dd3fc, 5);
        }
      },
      onBuildAdd: (structure, byName) => {
        if (!this.builtStructures.some((b) => b.id === structure.id)) {
          this.spawnBuiltStructure(structure);
          this.syncBuildGrassExclusions();
          this.spawnBurst(structure.x, structure.y + 0.9, structure.z, 0x4ade80, 10);
          if (byName) {
            this.pushFeed(`🏗️ ${byName} збудував блок у світі`);
          }
          this.emitHud();
        }
      },
      onBuildRemove: (id, byName) => {
        const idx = this.builtStructures.findIndex((b) => b.id === id);
        if (idx !== -1) {
          const target = this.builtStructures[idx];
          this.scene.remove(target.visual.group);
          this.builtStructures.splice(idx, 1);
          this.syncBuildGrassExclusions();
          this.spawnBurst(target.x, target.y + 0.9, target.z, 0xd6d3d1, 10);
          if (byName) {
            this.pushFeed(`🔨 ${byName} розібрав споруду`);
          }
          this.emitHud();
        }
      },
      onWorldEnv: (season, weather, byName) => {
        this.season = season;
        this.weather = weather;
        this.autoSeasonTimer = SEASON_DURATION_SEC;
        this.autoWeatherTimer = WEATHER_DURATION_SEC;
        this.syncAmbientSound();
        if (byName) {
          this.pushFeed(`🌍 ${byName}: ${SEASON_LABELS[season]}, ${WEATHER_LABELS[weather][season]}`);
        }
        this.emitHud();
      },
      onMobSpawn: (kind, x, z, byName) => {
        if (Math.hypot(x - this.px, z - this.pz) < 160) {
          this.spawnMobAt(kind, x, z);
          if (byName) {
            this.pushFeed(`⚔️ ${byName} викликав: ${MOB_DEFS[kind].name}`);
          }
          this.emitHud();
        }
      },
      onChatMessage: (item) => {
        this.onlineChat = [...this.onlineChat.slice(-39), item];
        const tag = item.device === 'mobile' ? '📱' : '🖥️';
        this.pushFeed(`💬 ${tag} ${item.senderName}: ${item.text}`);
        this.emitHud();
      },
    });

    this.multiplayer.connect({
      x: this.px,
      y: this.py,
      z: this.pz,
      yaw: this.playerYaw,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      level: this.level,
      weapon: this.activeWeapon,
      blocking: this.blocking,
      inWater: this.inWater,
      armor: this.upgrades.has('armor_ranger'),
      aegis: this.upgrades.has('shield_aegis'),
      gameMode: this.gameMode,
      zoneName: getZoneName(this.px, this.pz, this.py),
    });
  }

  private isSelfOnlinePlayer(state: OnlinePlayerState): boolean {
    if (state.id === this.multiplayer?.selfId) return true;
    const sid = (state as OnlinePlayerState & { sessionId?: string }).sessionId;
    return Boolean(sid && this.multiplayer?.sessionId && sid === this.multiplayer.sessionId);
  }

  private upsertRemotePlayer(state: OnlinePlayerState) {
    if (this.isSelfOnlinePlayer(state)) return;
    let entry = this.remotePlayers.get(state.id);
    if (!entry) {
      const rig = buildRobloxPlayer(this.textures);
      const hpRatio = state.maxHp > 0 ? state.hp / state.maxHp : 1;
      const nameTag = buildRemoteNameTag(state.name, state.device, state.level, hpRatio);
      rig.root.add(nameTag.sprite);
      rig.root.position.set(state.x, state.y, state.z);
      rig.root.rotation.y = state.yaw;
      this.scene.add(rig.root);
      entry = {
        id: state.id,
        data: state,
        rig,
        nameTag,
        x: state.x,
        y: state.y,
        z: state.z,
        yaw: state.yaw,
        walkPhase: 0,
        attackAnim: 0,
      };
      this.remotePlayers.set(state.id, entry);
    } else {
      entry.data = state;
      const hpRatio = state.maxHp > 0 ? state.hp / state.maxHp : 1;
      updateRemoteNameTag(entry.nameTag, state.name, state.device, state.level, hpRatio);
    }
    entry.rig.armorGroup.visible = state.armor;
    entry.rig.shieldAegisTrim.visible = state.aegis;
    ensurePlayerWeaponMesh(entry.rig, state.weapon);
    (Object.keys(entry.rig.weapons) as WeaponId[]).forEach((wId) => {
      const grp = entry!.rig.weapons[wId];
      if (grp) grp.visible = wId === state.weapon;
    });
  }

  private removeRemotePlayer(id: string) {
    const entry = this.remotePlayers.get(id);
    if (!entry) return;
    this.scene.remove(entry.rig.root);
    entry.nameTag.texture.dispose();
    entry.nameTag.material.dispose();
    this.remotePlayers.delete(id);
    this.onlinePlayersSnapshot = this.onlinePlayersSnapshot.filter((p) => p.id !== id);
  }

  private syncRemotePlayers(players: OnlinePlayerState[]) {
    this.onlinePlayersSnapshot = players;
    const activeIds = new Set<string>();
    for (const p of players) {
      if (this.isSelfOnlinePlayer(p)) continue;
      activeIds.add(p.id);
      this.upsertRemotePlayer(p);
    }
    for (const id of Array.from(this.remotePlayers.keys())) {
      if (!activeIds.has(id)) {
        this.removeRemotePlayer(id);
      }
    }
  }

  private updateRemotePlayers(dt: number, elapsed: number) {
    if (this.remotePlayers.size === 0) return;
    const lerpAlpha = 1 - Math.exp(-15 * dt);
    for (const rp of this.remotePlayers.values()) {
      const goalX = rp.data.x + rp.data.vx * 0.04;
      const goalZ = rp.data.z + rp.data.vz * 0.04;
      const distToGoal = Math.hypot(goalX - rp.x, goalZ - rp.z);
      if (distToGoal > 18) {
        rp.x = rp.data.x;
        rp.y = rp.data.y;
        rp.z = rp.data.z;
      } else {
        rp.x += (goalX - rp.x) * lerpAlpha;
        rp.y += (rp.data.y - rp.y) * lerpAlpha;
        rp.z += (goalZ - rp.z) * lerpAlpha;
      }
      const dYaw = Math.atan2(Math.sin(rp.data.yaw - rp.yaw), Math.cos(rp.data.yaw - rp.yaw));
      rp.yaw += dYaw * lerpAlpha;

      const dSq = (this.px - rp.x) ** 2 + (this.pz - rp.z) ** 2;
      const vis = dSq < 260 * 260;
      rp.rig.root.visible = vis;
      if (!vis) continue;

      rp.nameTag.sprite.visible = dSq < 115 * 115;
      rp.rig.root.position.set(rp.x, rp.y, rp.z);
      rp.rig.root.rotation.y = rp.yaw;

      const horizSpeed = Math.hypot(rp.data.vx, rp.data.vz);
      const moving = horizSpeed > 0.35;
      if (moving) {
        rp.walkPhase += dt * (horizSpeed > 8 ? 11.5 : 8.5);
      } else {
        rp.walkPhase = THREE.MathUtils.damp(rp.walkPhase, Math.round(rp.walkPhase / Math.PI) * Math.PI, 8, dt);
      }

      const swing = moving ? Math.sin(rp.walkPhase) * 0.72 : 0;
      rp.rig.leftLeg.rotation.x = swing;
      rp.rig.rightLeg.rotation.x = -swing;

      if (rp.attackAnim > 0) {
        rp.attackAnim = Math.max(0, rp.attackAnim - dt * 3.4);
      }
      const atkCurve = rp.attackAnim > 0 ? Math.sin((1 - rp.attackAnim) * Math.PI) * 1.45 : 0;
      rp.rig.rightArm.rotation.x = -swing * 0.75 - atkCurve;

      if (rp.data.blocking) {
        rp.rig.leftArm.rotation.x = THREE.MathUtils.damp(rp.rig.leftArm.rotation.x, -1.05, 14, dt);
        rp.rig.leftArm.rotation.z = THREE.MathUtils.damp(rp.rig.leftArm.rotation.z, 0.45, 14, dt);
      } else {
        rp.rig.leftArm.rotation.x = THREE.MathUtils.damp(rp.rig.leftArm.rotation.x, swing * 0.75, 10, dt);
        rp.rig.leftArm.rotation.z = THREE.MathUtils.damp(rp.rig.leftArm.rotation.z, 0.06, 10, dt);
      }

      const breathe = Math.sin(elapsed * 2.4 + rp.x * 0.3) * 0.03;
      rp.rig.bodyTilt.rotation.x = moving ? 0.08 : breathe;
      rp.rig.head.rotation.y = Math.sin(elapsed * 0.9 + rp.z) * 0.05;
    }
  }

  public setPlayerName(name: string) {
    this.multiplayer?.setName(name);
    this.emitHud();
  }

  public sendChatMessage(text: string) {
    this.multiplayer?.sendChat(text);
  }

  public teleportToOnlinePlayer(targetId: string): boolean {
    soundEngine.unlock();
    if (this.phase === 'dead' || this.phase === 'dying' || this.phase === 'victory') return false;
    if (this.phase === 'title') this.phase = 'playing';
    const target =
      this.remotePlayers.get(targetId)?.data ??
      this.onlinePlayersSnapshot.find((p) => p.id === targetId);
    if (!target || this.isSelfOnlinePlayer(target)) return false;
    const [tx, tz] = this.resolveCollisions(target.x + 1.8, target.z + 1.8, 0.55, false, target.y);
    this.px = tx;
    this.pz = tz;
    this.env.warmAround(this.px, this.pz);
    this.py = Math.max(target.y, this.walkableHeightWithBuilds(this.px, this.pz, target.y));
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pushFeed(`Телепорт до гравця ${target.name}`);
    this.emitHud();
    return true;
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
    if (saved.gameMode === 'survival' || saved.gameMode === 'peaceful' || saved.gameMode === 'creative') {
      this.gameMode = saved.gameMode;
    }
    if (
      saved.cameraViewMode === 'third' ||
      saved.cameraViewMode === 'first' ||
      saved.cameraViewMode === 'close' ||
      saved.cameraViewMode === 'far'
    ) {
      this.cameraViewMode = saved.cameraViewMode;
    }
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
      this.cachedUpgradesSize = -1;
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
    if (typeof saved.playTimeSec === 'number' && Number.isFinite(saved.playTimeSec)) {
      this.playTimeSec = Math.max(0, saved.playTimeSec);
    }
    this.victoryAchieved =
      Boolean(saved.victoryAchieved) || QUESTS.every((q) => this.questProgress[q.id].completed);
    if (Array.isArray(saved.choppedTreeIds)) {
      this.initialChoppedTrees = saved.choppedTreeIds;
    }
    if (typeof saved.workbenchStock === 'number' && Number.isFinite(saved.workbenchStock)) {
      this.workbenchStock = Math.max(0, Math.round(saved.workbenchStock));
    }
    if (Array.isArray(saved.builtStructures)) {
      this.pendingSavedBuilds = saved.builtStructures;
    }
  }

  private initScene() {
    const saved = loadSavedGame();
    this.worldSeed = this.initialWorldSeed ?? saved?.worldSeed ?? 42069;
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
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = this.isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
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
      initialX: this.px,
      initialZ: this.pz,
      initialChoppedTrees: this.initialChoppedTrees,
    });
    this.scene.add(this.env.group);
    if (this.trampledTrailPoints.length > 0) {
      this.env.updateTrailOverlay(this.trampledTrailPoints);
    }

    this.buildPreviewGroup = new THREE.Group();
    this.buildPreviewGroup.visible = false;
    this.scene.add(this.buildPreviewGroup);
    if (this.pendingSavedBuilds.length > 0) {
      for (const b of this.pendingSavedBuilds) {
        this.spawnBuiltStructure(b);
      }
      this.pendingSavedBuilds = [];
      this.syncBuildGrassExclusions();
    }

    // Varied Architectural Houses (1-story & 2-story) across the valley & Villages
    for (const site of CABIN_SITES) {
      const dims = getCabinDims(site.style);
      const cabinVisual = buildCabin(this.textures, site.style);
      cabinVisual.group.position.set(site.x, cabinBaseY(site), site.z);
      cabinVisual.group.rotation.y = site.rot;
      this.scene.add(cabinVisual.group);
      this.freezeStaticHierarchy(cabinVisual.group, [
        cabinVisual.doorPivotL,
        cabinVisual.doorPivotR,
        cabinVisual.hearthFlame,
        cabinVisual.indoorChestLid,
      ]);
      const indoorChestWorld = fromCabinLocal(
        dims.isTwoStory ? -3.4 : -2.75,
        dims.isTwoStory ? 2.2 : 1.95,
        site,
      );
      const doorWorld = fromCabinLocal(0, dims.halfD, site);
      const hearthWorld = fromCabinLocal(dims.isTwoStory ? -0.35 : 0, dims.isTwoStory ? -3.3 : -1.8, site);
      const hearthWorldY = cabinBaseY(site) + 1.45;
      const isMerchantStyle =
        site.style === 'shop' || site.style === 'bakery' || site.style === 'alchemy';
      if (isMerchantStyle) {
        const counterWorld = fromCabinLocal(0.15, 0.25, site);
        const pos = new THREE.Vector3(counterWorld.x, cabinFloorY(site), counterWorld.z);
        if (site.style === 'shop') {
          if (!this.shopPos) this.shopPos = pos;
          this.shopCounterSpots.push(pos);
        } else if (site.style === 'bakery') {
          if (!this.bakeryPos) this.bakeryPos = pos;
          this.bakeryCounterSpots.push(pos);
        } else {
          if (!this.alchemyPos) this.alchemyPos = pos;
          this.alchemyCounterSpots.push(pos);
        }

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
          doorWorldX: doorWorld.x,
          doorWorldZ: doorWorld.z,
          hearthWorldX: hearthWorld.x,
          hearthWorldY,
          hearthWorldZ: hearthWorld.z,
        });
      } else {
        const wbWorld = fromCabinLocal(dims.isTwoStory ? -3.4 : -2.1, dims.isTwoStory ? -0.85 : -0.65, site);
        const bedWorld = fromCabinLocal(dims.isTwoStory ? -3.3 : 2.55, dims.isTwoStory ? -2.78 : -2.15, site);
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
          bedPos: new THREE.Vector3(
            bedWorld.x,
            dims.isTwoStory ? cabinSecondFloorY(site) : cabinBaseY(site) + 0.65,
            bedWorld.z,
          ),
          doorWorldX: doorWorld.x,
          doorWorldZ: doorWorld.z,
          hearthWorldX: hearthWorld.x,
          hearthWorldY,
          hearthWorldZ: hearthWorld.z,
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
        const porchChestPos = fromCabinLocal(dims.halfW + 1.6, 1.5, site);
        this.createChest(`cabin_porch_${site.id}`, porchChestPos.x, porchChestPos.z, site.rot - 0.6);
      }
    }

    // Minecraft-style Block Caves carved into rocky mini-mountains
    for (const site of CAVE_SITES) {
      const caveVisual = buildCaveStructure(this.textures, site);
      caveVisual.group.position.set(site.x, site.floorY, site.z);
      caveVisual.group.rotation.y = site.rot;
      this.scene.add(caveVisual.group);
      this.freezeStaticHierarchy(caveVisual.group, [
        ...caveVisual.torchFlames,
        ...caveVisual.crystalMeshes,
      ]);
      const lightAnchors = caveVisual.lightAnchors.map((a) => {
        const w = fromCaveLocal(a.lx, a.lz, site);
        return {
          x: w.x,
          y: site.floorY + a.ly,
          z: w.z,
          color: a.color,
          baseInt: a.baseInt,
          radius: a.radius,
        };
      });
      this.caves.push({
        site,
        visual: caveVisual,
        lightAnchors,
      });
      const caveChestPos = fromCaveLocal(cavePathCenterX(-43.0) - 2.4, -43.0, site);
      this.createChest(`cave_${site.id}`, caveChestPos.x, caveChestPos.z, site.rot + 0.45);
    }

    // 34 Dungeons across biomes with altars, guardians & treasure chests
    for (const dSite of DUNGEON_SITES) {
      const dVisual = buildDungeonStructure(this.textures, dSite);
      dVisual.group.position.set(dSite.x, dungeonFloorY(dSite), dSite.z);
      dVisual.group.rotation.y = dSite.rot;
      this.scene.add(dVisual.group);
      this.freezeStaticHierarchy(dVisual.group, [
        ...dVisual.crystalMeshes,
        ...dVisual.flameMeshes,
      ]);
      this.dungeons.push({ site: dSite, visual: dVisual });
      const altarChestPos = fromDungeonLocal(0, -0.4, dSite);
      this.createChest(`dungeon_${dSite.id}`, altarChestPos.x, altarChestPos.z, dSite.rot);
    }

    // Village Center Wells & Plaza Campfires across all settlements
    for (let vIdx = 0; vIdx < VILLAGE_SITES.length; vIdx++) {
      const vSite = VILLAGE_SITES[vIdx];
      const villageWell = buildVillageWell(this.textures);
      villageWell.position.set(vSite.x, groundHeightAt(vSite.x, vSite.z), vSite.z);
      this.scene.add(villageWell);
      this.freezeStaticHierarchy(villageWell);
      this.env.addStaticCollider({ x: vSite.x, z: vSite.z, radius: 1.75 });

      const vFire = buildCampfire();
      const vfx = vSite.x + 5.2;
      const vfz = vSite.z + 4.8;
      const firePos = new THREE.Vector3(vfx, groundHeightAt(vfx, vfz), vfz);
      vFire.group.position.copy(firePos);
      if (vIdx === 0) {
        this.villageCampfirePos.copy(firePos);
        this.villageCampfireFlame = vFire.flame;
        this.villageCampfireLight = vFire.light;
      } else {
        this.extraCampfirePos.push(firePos);
        this.extraCampfireFlames.push(vFire.flame);
      }
      this.scene.add(vFire.group);
      this.freezeStaticHierarchy(vFire.group, [vFire.flame]);
    }

    // Campfire outside main cabin front-right
    const fire = buildCampfire();
    this.campfirePos.set(-7.2, groundHeightAt(-7.2, -14.5), -14.5);
    fire.group.position.copy(this.campfirePos);
    this.campfireFlame = fire.flame;
    this.campfireLight = fire.light;
    this.scene.add(fire.group);
    this.freezeStaticHierarchy(fire.group, [fire.flame]);

    // Admin Gallery Monument at Spawn featuring all 7 Admin Portraits
    this.adminPaintingPos.set(-7.5, groundHeightAt(-7.5, 5.5), 5.5);
    this.adminPaintingGroup = buildAdminGalleryPainting(this.textures);
    this.adminPaintingGroup.position.copy(this.adminPaintingPos);
    this.adminPaintingGroup.rotation.y = Math.atan2(-2 - this.adminPaintingPos.x, 9 - this.adminPaintingPos.z);
    this.scene.add(this.adminPaintingGroup);
    this.freezeStaticHierarchy(this.adminPaintingGroup);
    this.env.addStaticCollider({ x: this.adminPaintingPos.x, z: this.adminPaintingPos.z, radius: 3.6 });

    // Royal Throne at Spawn with empty button plaque "Тут раточка"
    this.spawnThronePos.set(3.2, groundHeightAt(3.2, 6.2), 6.2);
    const throneVisual = buildSpawnThrone(this.textures);
    this.spawnThroneGroup = throneVisual.group;
    this.spawnThroneBtnMesh = throneVisual.buttonMesh;
    this.spawnThroneBtnBaseY = throneVisual.buttonBaseY;
    this.spawnThroneGroup.position.copy(this.spawnThronePos);
    this.spawnThroneGroup.rotation.y = Math.atan2(-2 - this.spawnThronePos.x, 9 - this.spawnThronePos.z);
    this.scene.add(this.spawnThroneGroup);
    this.freezeStaticHierarchy(this.spawnThroneGroup, [throneVisual.buttonMesh]);
    this.env.addStaticCollider({ x: this.spawnThronePos.x, z: this.spawnThronePos.z, radius: 1.7 });

    // Starter Tool Stand (visible in Peaceful & Creative modes; hidden in Survival where everything must be crafted!)
    this.toolStandPos.set(-10.8, groundHeightAt(-10.8, -12.6), -12.6);
    this.toolStandGroup = buildStarterToolStand(this.textures);
    this.toolStandGroup.position.copy(this.toolStandPos);
    this.toolStandGroup.rotation.y = 0.52;
    this.toolStandGroup.visible = this.gameMode !== 'survival';
    this.scene.add(this.toolStandGroup);
    this.freezeStaticHierarchy(this.toolStandGroup);

    // Arched bridge across river
    const bridge = buildArchedBridge(this.textures);
    this.scene.add(bridge);
    this.freezeStaticHierarchy(bridge);

    // Stone ruins across the river at (46, -24)
    const ruins = buildStoneRuins(this.textures);
    ruins.position.set(46, groundHeightAt(46, -24) - 0.15, -24);
    this.ruinCrystal = ruins.getObjectByName('ruinCrystal') || null;
    this.scene.add(ruins);
    this.freezeStaticHierarchy(ruins, [this.ruinCrystal]);
    this.env.addStaticCollider({ x: 46, z: -24, radius: 1.6 });

    // Final Boss Citadel Arena at (FINAL_ARENA_X, FINAL_ARENA_Z)
    const finalArena = buildFinalBossArena(this.textures);
    finalArena.position.set(FINAL_ARENA_X, groundHeightAt(FINAL_ARENA_X, FINAL_ARENA_Z) - 0.15, FINAL_ARENA_Z);
    finalArena.traverse((obj) => {
      if (obj.name === 'arenaCrystal') this.finalArenaCrystalMeshes.push(obj);
      else if (obj.name === 'arenaFlame') this.finalArenaFlameMeshes.push(obj);
    });
    this.scene.add(finalArena);
    this.freezeStaticHierarchy(finalArena, [
      ...this.finalArenaCrystalMeshes,
      ...this.finalArenaFlameMeshes,
    ]);

    this.staticMinimapEntities = [
      ...VILLAGE_SITES.map((v) => ({ x: v.x, z: v.z, kind: 'village' as const, label: v.name })),
      ...CABIN_SITES.map((c) => ({ x: c.x, z: c.z, kind: 'cabin' as const, label: c.name })),
      ...CAVE_SITES.map((cv) => ({ x: cv.x, z: cv.z, kind: 'cave' as const, label: cv.name })),
      ...DUNGEON_SITES.map((d) => ({ x: d.x, z: d.z, kind: 'dungeon' as const, label: d.name })),
    ];

    // Distant landmark sky beacons so players can locate the Village, Ruins Boss, & Final Citadel Boss
    const beaconGeo = new THREE.CylinderGeometry(0.45, 1.45, 96, 10, 1, true);
    this.villageBeacon = new THREE.Mesh(
      beaconGeo,
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.villageBeacon.position.set(
      VILLAGE_SITE.x,
      groundHeightAt(VILLAGE_SITE.x, VILLAGE_SITE.z) + 48,
      VILLAGE_SITE.z,
    );
    this.villageBeacon.visible = !this.questProgress.find_village.completed;
    this.scene.add(this.villageBeacon);

    this.bossBeacon = new THREE.Mesh(
      beaconGeo,
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.bossBeacon.position.set(46, groundHeightAt(46, -24) + 48, -24);
    this.bossBeacon.visible = !this.questProgress.defeat_boss.completed;
    this.scene.add(this.bossBeacon);

    this.finalBossBeacon = new THREE.Mesh(
      beaconGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.finalBossBeacon.position.set(
      FINAL_ARENA_X,
      groundHeightAt(FINAL_ARENA_X, FINAL_ARENA_Z) + 48,
      FINAL_ARENA_Z,
    );
    this.finalBossBeacon.visible = !this.questProgress.defeat_final_boss.completed;
    this.scene.add(this.finalBossBeacon);

    this.secretBossBeacon = new THREE.Mesh(
      beaconGeo,
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.secretBossBeacon.position.set(
      FINAL_ARENA_X,
      groundHeightAt(FINAL_ARENA_X, FINAL_ARENA_Z) + 48,
      FINAL_ARENA_Z,
    );
    this.secretBossBeacon.visible = false;
    this.scene.add(this.secretBossBeacon);

    // Treasure chests across expanded landmarks + Village Square + Final Citadel chest
    this.createChest('world_0', -21, -24, 0.6);
    this.createChest('world_1', riverCenterX(BRIDGE_Z) + 12, BRIDGE_Z + 5.5, -1.2);
    this.createChest('world_2', 49, -20, -2.3);
    this.createChest('world_3', -62, 42, 0.8);
    this.createChest('world_4', -14, -92, -0.4);
    this.createChest('world_5', 84, 46, -1.9);
    this.createChest('world_citadel', FINAL_ARENA_X + 7.5, FINAL_ARENA_Z - 11.5, -0.5);
    VILLAGE_SITES.forEach((vSite, idx) => {
      this.createChest(idx === 0 ? 'village_chest' : `village_chest_${idx}`, vSite.x - 4.8, vSite.z - 4.6, 0.75);
    });
    const extraBiomeChests: [string, number, number, number][] = [
      ['biome_autumn', -610, -410, 0.4],
      ['biome_bamboo', 620, 480, -0.9],
      ['biome_swamp', -790, 740, 1.2],
      ['biome_canyon', 720, -640, -0.4],
      ['biome_steppe', 520, 1340, 2.0],
      ['biome_highland', -2080, -1380, 0.3],
      ['biome_deep_north', -520, -6220, 0.7],
      ['biome_deep_south', -580, 6180, -1.3],
    ];
    for (const [id, cx, cz, rot] of extraBiomeChests) {
      this.createChest(id, cx, cz, rot);
    }

    // Player avatar (ultra-detailed rig with shield on left arm & upgraded weapons on right)
    this.playerRig = buildRobloxPlayer(this.textures);
    this.playerRig.armorGroup.visible = this.upgrades.has('armor_ranger');
    this.playerRig.shieldAegisTrim.visible = this.upgrades.has('shield_aegis');
    if (!this.upgrades.has('builder_tool') && this.activeWeapon === 'builder' && this.gameMode === 'survival') {
      this.activeWeapon = 'sword';
    }
    this.syncWeaponRigVisibility();
    this.py = saved
      ? Math.max(this.py, this.walkableHeightWithBuilds(this.px, this.pz))
      : this.walkableHeightWithBuilds(this.px, this.pz);
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.scene.add(this.playerRig.root);

    this.respawnAuraRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.08, 10, 28),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.respawnAuraRing.rotation.x = Math.PI / 2;
    this.respawnAuraRing.visible = false;
    this.scene.add(this.respawnAuraRing);

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

    if (!this.isSoftwareGl && (this.dofEnabled || this.graphicsSettings.bloomEnabled)) {
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

    const rtW = Math.max(1, Math.floor(width * pr));
    const rtH = Math.max(1, Math.floor(height * pr));
    this.composer.renderTarget1.depthBuffer = true;
    this.composer.renderTarget2.depthBuffer = true;
    this.composer.renderTarget1.depthTexture = new THREE.DepthTexture(rtW, rtH);
    this.composer.renderTarget2.depthTexture = new THREE.DepthTexture(rtW, rtH);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.dofPass = new ShaderPass(FastDofShader);
    this.dofPass.enabled = this.dofEnabled;
    this.dofPass.uniforms['tDepth'].value =
      this.composer.readBuffer.depthTexture ?? this.composer.renderTarget2.depthTexture;
    this.dofPass.uniforms['uNear'].value = this.camera.near;
    this.dofPass.uniforms['uFar'].value = this.camera.far;
    this.dofPass.uniforms['uTexel'].value.set(1 / Math.max(1, width), 1 / Math.max(1, height));
    this.composer.addPass(this.dofPass);

    if (!this.isMobile) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.max(1, width >> 1), Math.max(1, height >> 1)),
        0.24,
        0.42,
        0.86,
      );
      this.composer.addPass(this.bloomPass);
    }

    const outputPass = new OutputPass();
    outputPass.needsSwap = false;
    this.composer.addPass(outputPass);
  }

  private applyRenderScale() {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
    } else if (this.isMobile) {
      const cap = this.ecoMode ? 1.0 : 1.35;
      const desired = Math.min(window.devicePixelRatio * this.graphicsSettings.renderScale, cap);
      this.renderer.setPixelRatio(Math.max(0.6, desired));
    } else {
      const cap = this.ecoMode ? 1.35 : 1.85;
      const mult = this.shadowUpscale && !this.ecoMode ? 1.15 : 1.0;
      const desired = Math.min(window.devicePixelRatio * mult * this.graphicsSettings.renderScale, cap);
      this.renderer.setPixelRatio(Math.max(0.6, desired));
    }
  }

  public applyGraphicsSettings(next: GraphicsSettings) {
    this.graphicsSettings = { ...next };
    this.dofEnabled = next.dofEnabled;
    this.ecoMode = next.ecoMode;
    this.shadowUpscale = next.shadowQuality === '4k';

    this.applyRenderScale();

    if (this.camera) {
      const farDist =
        next.viewDistance === 'near'
          ? 240
          : next.viewDistance === 'medium'
            ? 370
            : this.isMobile
              ? 380
              : 520;
      if (this.camera.far !== farDist) {
        this.camera.far = farDist;
        this.camera.updateProjectionMatrix();
        if (this.dofPass) {
          this.dofPass.uniforms['uFar'].value = farDist;
        }
      }
    }

    if (!this.composer && !this.isSoftwareGl && (next.dofEnabled || next.bloomEnabled)) {
      this.ensureComposer();
    }
    if (this.composer) {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
      this.bloomPass?.resolution.set(Math.max(1, w >> 1), Math.max(1, h >> 1));
      if (this.dofPass) {
        this.dofPass.enabled = next.dofEnabled;
        const activeDepth =
          this.composer.readBuffer.depthTexture ?? this.composer.renderTarget2.depthTexture;
        if (activeDepth) {
          this.dofPass.uniforms['tDepth'].value = activeDepth;
        }
      }
      if (this.bloomPass) {
        this.bloomPass.enabled = next.bloomEnabled;
      }
    }

    if (!this.isSoftwareGl) {
      if (next.shadowQuality === 'off') {
        this.sunLight.castShadow = false;
        this.renderer.shadowMap.enabled = false;
      } else {
        this.renderer.shadowMap.enabled = true;
        this.sunLight.castShadow = true;
        this.renderer.shadowMap.type =
          next.preset === 'low' || next.preset === 'medium' || this.isMobile
            ? THREE.PCFShadowMap
            : THREE.PCFSoftShadowMap;
        const size =
          next.shadowQuality === '4k' ? 4096 : next.shadowQuality === '2k' ? 2048 : 1024;
        if (this.sunLight.shadow.mapSize.x !== size) {
          this.sunLight.shadow.mapSize.set(size, size);
          this.sunLight.shadow.map?.dispose();
          this.sunLight.shadow.map = null;
        }
      }
      this.renderer.shadowMap.needsUpdate = true;
    }

    this.env?.setPerfTier(next.preset);
    this.env?.setGrassDensity(next.grassDensity);
    this.emitHud();
  }

  public applyLoadedSaveData(saved: SaveGameData) {
    this.applySavedGame(saved);
    // Rebuild player-built structures from SQL / save data
    for (const b of this.builtStructures) {
      this.scene.remove(b.visual.group);
      b.visual.group.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mt) => mt.dispose());
        }
      });
    }
    this.builtStructures = [];
    for (const b of this.pendingSavedBuilds) {
      this.spawnBuiltStructure(b);
    }
    this.pendingSavedBuilds = [];
    this.syncBuildGrassExclusions();
    if (this.toolStandGroup) {
      this.toolStandGroup.visible = this.gameMode !== 'survival';
    }
    this.syncWeaponRigVisibility();
    if (this.trampledTrailPoints.length > 0) {
      this.env?.updateTrailOverlay(this.trampledTrailPoints);
    }
    this.env?.warmAround(this.px, this.pz);
    this.py = Math.max(this.py, this.walkableHeightWithBuilds(this.px, this.pz));
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.syncAmbientSound();
    this.emitHud();
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
    this.freezeStaticHierarchy(group, [lid]);
    this.chests.push({ id, group, lid, x, z, opened });
  }

  private freezeStaticHierarchy(root: THREE.Object3D, dynamicObjs?: (THREE.Object3D | null | undefined)[]) {
    root.updateMatrixWorld(true);
    const dynSet =
      dynamicObjs && dynamicObjs.length > 0
        ? new Set(dynamicObjs.filter(Boolean) as THREE.Object3D[])
        : null;
    root.traverse((obj) => {
      if (dynSet && dynSet.has(obj)) return;
      obj.matrixAutoUpdate = false;
    });
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
      hp: 999,
      maxHp: 999,
      hitFlash: 0,
      walkPhase: 0,
      wanderAngle: 0.3,
      wanderTimer: 4,
      fleeTimer: 0,
    });

    // 1b..1f. Shopkeepers, Bakers, Alchemists, Blacksmiths, Herbalists, Mayors & Guards across starter + regional settlements
    const spawnCabinNpc = (
      kind: PeacefulMobKind,
      displayName: string,
      site: CabinSite,
      lx: number,
      lz: number,
      indoor: boolean,
    ) => {
      const vis = buildPeacefulMobModel(kind, this.textures);
      const p = fromCabinLocal(lx, lz, site);
      const y = indoor ? cabinFloorY(site) : groundHeightAt(p.x, p.z);
      vis.root.position.set(p.x, y, p.z);
      vis.root.rotation.y = site.rot;
      this.scene.add(vis.root);
      this.peacefulMobs.push({
        id: this.nextMobId++,
        kind,
        displayName,
        visual: vis,
        homeX: p.x,
        homeZ: p.z,
        x: p.x,
        y,
        z: p.z,
        vx: 0,
        vz: 0,
        yaw: site.rot,
        hp: 999,
        maxHp: 999,
        hitFlash: 0,
        walkPhase: 0,
        wanderAngle: site.rot,
        wanderTimer: 4,
        fleeTimer: 0,
      });
    };

    for (const site of CABIN_SITES) {
      if (site.style === 'shop') {
        spawnCabinNpc('merchant', 'Торговець Марко', site, 0.15, -2.35, true);
      } else if (site.style === 'bakery') {
        spawnCabinNpc('baker', 'Пекарка Галина', site, 0.15, -2.35, true);
      } else if (site.style === 'alchemy') {
        spawnCabinNpc('alchemist', 'Алхімік Лев', site, 0.15, -2.35, true);
      } else if (site.style === 'townhall') {
        spawnCabinNpc('mayor', 'Староста Мирослав', site, 0, 4.5, false);
      } else if (site.id === 'north') {
        spawnCabinNpc('blacksmith', 'Коваль Богдан (Кузня)', site, 2.4, 5.2, false);
      } else if (site.id === 'west') {
        spawnCabinNpc('herbalist', 'Травниця Соломія (Трави)', site, -2.2, 5.2, false);
      } else if (site.id === 'village_watch' || site.id.endsWith('_watch')) {
        spawnCabinNpc('guard', 'Вартовий Северин', site, -2.1, 4.8, false);
      } else if (site.id.includes('_forge') || site.id === 'rural_canyon_forge') {
        spawnCabinNpc('blacksmith', 'Коваль Богдан (Кузня)', site, 2.4, 5.2, false);
      } else if (site.id.includes('_cottage') && (site.id.startsWith('v_') || site.id.startsWith('rural_'))) {
        spawnCabinNpc('herbalist', 'Травниця Соломія (Трави)', site, -2.2, 5.2, false);
      }
    }

    // Explorer Скарбошукач Тарас near Ruins & Crystal Cave trail
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
      hp: 999,
      maxHp: 999,
      hitFlash: 0,
      walkPhase: 0,
      wanderAngle: -0.6,
      wanderTimer: 4,
      fleeTimer: 0,
    });

    // 2. Grazing sheep across sunny meadows & outskirts of all villages
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
    for (const vSite of VILLAGE_SITES) {
      sheepSpots.push([vSite.x - 66, vSite.z - 22], [vSite.x + 66, vSite.z + 24]);
    }
    for (const [sx, sz] of sheepSpots) {
      this.spawnHuntableAnimal('sheep', sx, sz);
    }

    // 3. Woodland deer across northern forest, eastern highlands, & outer 8096x16192 continent
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
      [-580, -340],
      [610, 440],
      [-1250, 1520],
      [1350, -1620],
      [-1480, -2840],
      [1540, 2940],
    ];
    for (const [dx, dz] of deerSpots) {
      this.spawnHuntableAnimal('deer', dx, dz);
    }
  }

  private spawnHuntableAnimal(kind: 'sheep' | 'deer', x: number, z: number) {
    const vis = buildPeacefulMobModel(kind, this.textures);
    const y = groundHeightAt(x, z);
    const maxHp = kind === 'deer' ? 48 : 38;
    vis.root.position.set(x, y, z);
    this.scene.add(vis.root);
    this.peacefulMobs.push({
      id: this.nextMobId++,
      kind,
      visual: vis,
      homeX: x,
      homeZ: z,
      x,
      y,
      z,
      vx: 0,
      vz: 0,
      yaw: Math.random() * Math.PI * 2,
      hp: maxHp,
      maxHp,
      hitFlash: 0,
      walkPhase: Math.random() * 5,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderTimer: 2 + Math.random() * 4,
      fleeTimer: 0,
    });
  }

  private spawnResourceNodes() {
    const spots: { kind: Exclude<ResourceId, 'hide' | 'raw_meat'>; x: number; z: number }[] = [
      // Starter supplies around spawn for Survival crafting
      { kind: 'wood', x: -4.5, z: 13.5 },
      { kind: 'stone', x: 3.5, z: 12.2 },
      { kind: 'wood', x: 5.5, z: 4.5 },
      { kind: 'stone', x: -12.5, z: 13.8 },
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
      // Desert & Far South dunes resources
      { kind: 'stone', x: 118, z: 215 },
      { kind: 'iron', x: 145, z: 245 },
      { kind: 'essence', x: 175, z: 270 },
      { kind: 'stone', x: -125, z: -260 },
      { kind: 'iron', x: -142, z: -285 },
      { kind: 'essence', x: -165, z: -310 },
      // Dense stone outcrops across starting meadow, riverbanks, crossroads, & ruins
      { kind: 'stone', x: -6, z: 16 },
      { kind: 'stone', x: -15, z: -4 },
      { kind: 'stone', x: -21, z: 14 },
      { kind: 'stone', x: -34, z: -18 },
      { kind: 'stone', x: 2, z: -18 },
      { kind: 'stone', x: 10, z: 18 },
      { kind: 'stone', x: 28, z: -22 },
      { kind: 'stone', x: 32, z: 24 },
      { kind: 'stone', x: -42, z: 16 },
      { kind: 'stone', x: -64, z: 28 },
      { kind: 'stone', x: -16, z: -46 },
      { kind: 'stone', x: -36, z: -86 },
      { kind: 'stone', x: 48, z: -8 },
      { kind: 'stone', x: 60, z: 14 },
      { kind: 'stone', x: -78, z: -8 },
      { kind: 'stone', x: -86, z: -96 },
      { kind: 'stone', x: 112, z: -26 },
      { kind: 'stone', x: 124, z: 18 },
      { kind: 'stone', x: VILLAGE_SITE.x - 68, z: VILLAGE_SITE.z - 12 },
      { kind: 'stone', x: VILLAGE_SITE.x + 68, z: VILLAGE_SITE.z + 18 },
      { kind: 'stone', x: VILLAGE_SITE.x - 18, z: VILLAGE_SITE.z + 68 },
    ];

    // Scatter additional stone, iron, herb & essence clusters across the full 8096x16192 continent
    for (let k = 0; k < 140; k++) {
      const u1 = Math.sin((this.worldSeed + k * 71) * 12.9898) * 43758.5453;
      const u2 = Math.sin((this.worldSeed + k * 113) * 78.233) * 43758.5453;
      const r1 = u1 - Math.floor(u1);
      const r2 = u2 - Math.floor(u2);
      const radius = k < 28 ? 16 + r1 * 85 : k < 76 ? 110 + r1 * 900 : 1000 + r1 * 3600;
      const ang = r2 * Math.PI * 2;
      const sx = Math.round(Math.cos(ang) * radius);
      const sz = Math.round(Math.sin(ang) * radius * 1.4);
      if (Math.hypot(sx - this.px, sz - this.pz) < 5) continue;
      if (Math.hypot(sx - riverCenterX(sz), 0) < riverHalfWidthAt(sz) + 2.4) continue;
      if (findInsideCabin(sx, sz) !== null || findInsideCave(sx, sz) !== null) continue;
      if (Math.hypot(sx - FINAL_ARENA_X, sz - FINAL_ARENA_Z) < 28) continue;
      const kind: Exclude<ResourceId, 'hide' | 'raw_meat'> =
        k % 5 === 0 ? 'iron' : k % 7 === 0 ? 'essence' : k % 3 === 0 ? 'herb' : 'stone';
      spots.push({ kind, x: sx, z: sz });
    }

    for (const cave of CAVE_SITES) {
      const oreSpot = fromCaveLocal(cavePathCenterX(-14.0) + 1.85, -14.0, cave);
      const stoneSpot = fromCaveLocal(cavePathCenterX(-27.0) - 1.85, -27.0, cave);
      const gemSpot = fromCaveLocal(cavePathCenterX(-40.5) + 3.2, -40.5, cave);
      const deepOreSpot = fromCaveLocal(cavePathCenterX(-44.2) + 2.5, -44.2, cave);
      spots.push({ kind: 'iron', x: oreSpot.x, z: oreSpot.z });
      spots.push({ kind: 'stone', x: stoneSpot.x, z: stoneSpot.z });
      spots.push({ kind: 'essence', x: gemSpot.x, z: gemSpot.z });
      spots.push({ kind: 'iron', x: deepOreSpot.x, z: deepOreSpot.z });
    }

    spots.forEach((s, idx) => {
      const inCave = findInsideCave(s.x, s.z) !== null;
      const y = walkableHeightAt(s.x, s.z);
      if (!inCave && y < WATER_LEVEL + 0.1) return;
      const mesh = buildResourceNodeModel(s.kind);
      mesh.position.set(s.x, y, s.z);
      mesh.rotation.y = (idx * 1.7) % (Math.PI * 2);
      this.scene.add(mesh);
      if (s.kind !== 'essence') {
        this.freezeStaticHierarchy(mesh);
      }
      const maxHp = s.kind === 'iron' ? 75 : s.kind === 'stone' ? 60 : 40;
      this.resourceNodes.push({
        id: idx + 1,
        kind: s.kind,
        label: RESOURCE_LABELS[s.kind],
        mesh,
        x: s.x,
        y,
        z: s.z,
        hp: maxHp,
        maxHp,
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
      this.bloomPass?.resolution.set(Math.max(1, w >> 1), Math.max(1, h >> 1));
      if (this.dofPass) {
        const activeDepth =
          this.composer.readBuffer.depthTexture ?? this.composer.renderTarget2.depthTexture;
        if (activeDepth) {
          this.dofPass.uniforms['tDepth'].value = activeDepth;
        }
        this.dofPass.uniforms['uTexel'].value.set(1 / Math.max(1, w), 1 / Math.max(1, h));
      }
    }
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHud();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.modalOpen || this.phase === 'victory') return;
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
    else if (e.code === 'Digit5') this.setWeapon('axe');
    else if (e.code === 'KeyP') this.setWeapon('pickaxe');
    else if (e.code === 'Digit6') this.setWeapon('builder');
    else if (e.code === 'Digit7') this.cycleCameraView();
    else if (e.code === 'Digit8') this.useConsumable('potion');
    else if (e.code === 'Digit9') this.useConsumable('mega_potion');
    else if (e.code === 'Digit0') this.useConsumable('cooked_meat');
    else if (e.code === 'Minus') this.useConsumable('tonic');
    else if (e.code === 'Equal') this.useConsumable('stew');
    else if (e.code === 'Tab' && this.activeWeapon === 'builder') {
      e.preventDefault();
      this.cycleBuildPiece();
    } else if (e.code === 'KeyG' && this.activeWeapon === 'builder') {
      this.cycleBuildPiece();
    } else if (e.code === 'KeyT' && this.activeWeapon === 'builder') {
      this.rotateBuildPiece();
    } else if (e.code === 'KeyH' && this.activeWeapon === 'builder') {
      this.cycleBuildFloor(1);
    } else if ((e.code === 'BracketRight' || e.code === 'PageUp') && this.activeWeapon === 'builder') {
      e.preventDefault();
      this.setBuildFloor(this.buildFloorLevel === 0 ? 2 : Math.min(6, this.buildFloorLevel + 1));
    } else if ((e.code === 'BracketLeft' || e.code === 'PageDown') && this.activeWeapon === 'builder') {
      e.preventDefault();
      this.setBuildFloor(this.buildFloorLevel <= 1 ? 0 : this.buildFloorLevel - 1);
    } else if ((e.code === 'Backspace' || e.code === 'KeyU') && this.activeWeapon === 'builder') {
      if (e.code === 'Backspace') e.preventDefault();
      this.demolishNearbyBuild();
    } else if (e.code === 'KeyZ') this.activateRelic('amulet_vitality');
    else if (e.code === 'KeyX') this.activateRelic('cloak_wind');
    else if (e.code === 'KeyC') this.activateRelic('rune_power');
    else if (e.code === 'KeyY') this.activateRelic('frost_crown');
    else if (e.code === 'KeyO') this.activateRelic('thunder_totem');
    else if (e.code === 'KeyN') this.activateRelic('vampire_fang');
    else if (e.code === 'Comma') this.activateRelic('titan_aegis');
    else if (e.code === 'Period') this.activateRelic('phoenix_feather');
    else if (e.code === 'Slash') this.activateRelic('void_step');
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
    if (this.phase !== 'playing' || this.modalOpen) return;
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

  private triggerPlayerDeath() {
    if (this.phase === 'dying' || this.phase === 'dead') return;
    this.phase = 'dying';
    this.deathAnimTimer = 1.25;
    this.blocking = false;
    this.pvx = 0;
    this.pvz = 0;
    if (this.pointerLocked) document.exitPointerLock?.();
    this.cameraShake = Math.max(this.cameraShake, 0.35);
    this.spawnBurst(this.px, this.py + 1.1, this.pz, 0xf43f5e, 18);
    this.spawnShockwave(this.px, this.py + 0.15, this.pz, 0xf43f5e, 3.5, 0.55);
    this.pushFeed('Герой упав без сил...');
    this.emitHud();
  }

  public respawnPlayer() {
    soundEngine.unlock();
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.px = -2;
    this.pz = 9;
    this.env.warmAround(this.px, this.pz);
    this.py = this.walkableHeightWithBuilds(this.px, this.pz);
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.blocking = false;
    this.phase = 'playing';
    this.deathAnimTimer = 0;
    this.respawnAnimTimer = 1.45;
    this.playerRig.bodyTilt.rotation.set(0, 0, 0);
    this.playerRig.bodyTilt.position.y = 0;
    this.spawnBurst(this.px, this.py + 1.0, this.pz, 0x34d399, 26);
    this.spawnBurst(this.px, this.py + 1.4, this.pz, 0xfef08a, 14);
    this.spawnShockwave(this.px, this.py + 0.12, this.pz, 0x34d399, 4.2, 0.72);
    soundEngine.playRelicSkill('heal');
    this.pushFeed('Відродження на галявині');
    this.saveGameNow(true);
    this.emitHud();
  }

  public continueFreePlay() {
    soundEngine.unlock();
    this.phase = 'playing';
    this.blocking = false;
    this.pushFeed('Вільна гра активована! Досліджуйте долину й нові хвилі!');
    this.saveGameNow(true);
    this.emitHud();
  }

  public teleportToCabin() {
    soundEngine.unlock();
    if (this.phase === 'dead' || this.phase === 'dying' || this.phase === 'victory') return;
    if (this.phase === 'title') this.phase = 'playing';
    const front = fromCabinLocal(0, 6.2);
    this.px = front.x;
    this.pz = front.z;
    this.env.warmAround(this.px, this.pz);
    this.py = this.walkableHeightWithBuilds(this.px, this.pz);
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.playerYaw = CABIN_ROT + Math.PI;
    this.pushFeed('Телепорт до входу в хатинку');
    this.emitHud();
  }

  public teleportToRiver() {
    soundEngine.unlock();
    if (this.phase === 'dead' || this.phase === 'dying' || this.phase === 'victory') return;
    if (this.phase === 'title') this.phase = 'playing';
    this.px = riverCenterX(BRIDGE_Z + 12);
    this.pz = BRIDGE_Z + 12;
    this.env.warmAround(this.px, this.pz);
    this.py = WATER_LEVEL - 0.8;
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
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
    this.multiplayer?.sendWorldEnv(this.season, this.weather);
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
    this.multiplayer?.sendWorldEnv(this.season, this.weather);
    this.pushFeed(`Погода: ${WEATHER_LABELS[this.weather][this.season]}`);
    this.saveGameNow(true);
    this.emitHud();
  }

  public saveGameNow(silent = false): boolean {
    const trampledEntries: [string, number][] = [];
    const otherEntries: [string, number][] = [];
    for (const entry of this.trailVisits.entries()) {
      if (entry[1] > TRAIL_STEPS_THRESHOLD) trampledEntries.push(entry);
      else otherEntries.push(entry);
    }
    const remainingSlots = Math.max(0, 3600 - trampledEntries.length);
    const visitsEntries: [string, number][] = [
      ...trampledEntries.slice(-3600),
      ...(remainingSlots > 0 ? otherEntries.slice(-remainingSlots) : []),
    ];
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
        defeat_final_boss: { ...this.questProgress.defeat_final_boss },
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
      playTimeSec: Math.round(this.playTimeSec),
      victoryAchieved: this.victoryAchieved,
      builtStructures: this.builtStructures.map(({ id, kind, x, y, z, rotY }) => ({
        id,
        kind,
        x,
        y,
        z,
        rotY,
      })),
      workbenchStock: this.workbenchStock,
      choppedTreeIds: this.env.getChoppedTreeIds(),
      gameMode: this.gameMode,
      cameraViewMode: this.cameraViewMode,
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
    const aimX = Math.sin(this.playerYaw);
    const aimZ = Math.cos(this.playerYaw);
    if (id === 'amulet_vitality') {
      this.hp = Math.min(this.maxHp, this.hp + 45);
      this.stamina = Math.min(this.maxStamina, this.stamina + 35);
      soundEngine.playRelicSkill('heal');
      this.spawnShockwave(this.px, this.py + 0.15, this.pz, 0x4ade80, 4.4, 0.45);
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0x4ade80, 18);
      this.pushFeed('Амулет Життя: +45 HP та +35 витривалості!');
    } else if (id === 'cloak_wind') {
      this.pvx += aimX * 19;
      this.pvz += aimZ * 19;
      this.windBuffTimer = 5.0;
      soundEngine.playRelicSkill('wind');
      this.spawnShockwave(this.px, this.py + 0.2, this.pz, 0x38bdf8, 3.6, 0.35);
      this.spawnBurst(this.px, this.py + 1.0, this.pz, 0x7dd3fc, 16);
      this.pushFeed('Плащ Вітру: Ривок та +40% швидкості на 5с!');
    } else if (id === 'rune_power') {
      this.berserkBuffTimer = 6.0;
      this.cameraShake = Math.max(this.cameraShake, 0.22);
      soundEngine.playRelicSkill('berserk');
      this.spawnShockwave(this.px, this.py + 0.16, this.pz, 0xf97316, 5.6, 0.42);
      this.spawnBurst(this.px, this.py + 1.1, this.pz, 0xfb923c, 22);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, 5.5, -1.0, 35, 13.0, 0xf97316);
      this.pushFeed('Руна Берсерка: Вибух люті та +45% шкоди на 6с!');
    } else if (id === 'frost_crown') {
      this.frostAuraBuffTimer = 6.0;
      soundEngine.playRelicSkill('wind');
      this.spawnShockwave(this.px, this.py + 0.16, this.pz, 0x38bdf8, 6.4, 0.48);
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0x7dd3fc, 22);
      for (const m of this.mobs) {
        if (Math.hypot(m.x - this.px, m.z - this.pz) <= 7.0) {
          m.slowTimer = Math.max(m.slowTimer ?? 0, 6.0);
        }
      }
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, 6.2, -1.0, 48, 10.0, 0x38bdf8);
      this.pushFeed('Крижана Корона: Крижане кільце 48 шкоди та уповільнення ворогів!');
    } else if (id === 'thunder_totem') {
      this.cameraShake = Math.max(this.cameraShake, 0.34);
      soundEngine.playHammerSlam();
      this.spawnShockwave(this.px, this.py + 0.16, this.pz, 0xfacc15, 7.2, 0.42);
      this.spawnShockwave(this.px, this.py + 0.24, this.pz, 0xfef08a, 4.6, 0.32);
      this.spawnBurst(this.px, this.py + 1.5, this.pz, 0xfacc15, 26);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, 6.8, -1.0, 65, 18.0, 0xfacc15);
      this.pushFeed('Тотем Грому: Розряд блискавки (65 AoE шкоди та відкидання)!');
    } else if (id === 'vampire_fang') {
      this.hp = Math.min(this.maxHp, this.hp + 25);
      this.vampireBuffTimer = 8.0;
      soundEngine.playRelicSkill('berserk');
      this.spawnShockwave(this.px, this.py + 0.15, this.pz, 0xe11d48, 4.2, 0.42);
      this.spawnBurst(this.px, this.py + 1.1, this.pz, 0xf43f5e, 18);
      this.pushFeed('Ікло Вампіра: +25 HP та 35% вампіризму від атак на 8с!');
    } else if (id === 'titan_aegis') {
      this.titanShieldBuffTimer = 6.0;
      soundEngine.playShieldBlock(true);
      this.spawnShockwave(this.px, this.py + 0.16, this.pz, 0x3b82f6, 5.4, 0.46);
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0x60a5fa, 20);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, 5.2, -1.0, 30, 14.0, 0x60a5fa);
      this.pushFeed('Егіда Титана: -75% вхідної шкоди на 6с та захисна хвиля!');
    } else if (id === 'phoenix_feather') {
      this.hp = Math.min(this.maxHp, this.hp + 85);
      this.phoenixRegenBuffTimer = 8.0;
      soundEngine.playRelicSkill('heal');
      this.spawnShockwave(this.px, this.py + 0.16, this.pz, 0xf97316, 5.8, 0.48);
      this.spawnShockwave(this.px, this.py + 0.22, this.pz, 0xfbbf24, 3.8, 0.36);
      this.spawnBurst(this.px, this.py + 1.3, this.pz, 0xfb923c, 24);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, 5.5, -1.0, 40, 11.0, 0xf97316);
      this.pushFeed('Перо Фенікса: +85 HP, регенерація 8с та вогняний вибух!');
    } else {
      const [bx, bz] = this.resolveCollisions(this.px + aimX * 10.0, this.pz + aimZ * 10.0, 0.56, true, this.py);
      this.px = bx;
      this.pz = bz;
      this.env.warmAround(this.px, this.pz);
      this.py = this.walkableHeightWithBuilds(this.px, this.pz, this.py);
      soundEngine.playRelicSkill('wind');
      this.spawnShockwave(this.px, this.py + 0.16, this.pz, 0xa855f7, 5.6, 0.44);
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 0xc084fc, 24);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, 5.5, -1.0, 50, 12.0, 0xc084fc);
      this.pushFeed('Крок Пустоти: Телепорт вперед на 10м та вибух тіні (50 шкоди)!');
    }

    this.emitHud();
    return true;
  }

  private isWeaponUnlocked(id: WeaponId): boolean {
    return this.gameMode !== 'survival' || this.upgrades.has(WEAPON_UNLOCK_MAP[id]);
  }

  private syncWeaponRigVisibility() {
    if (!this.playerRig) return;
    const unlocked = this.isWeaponUnlocked(this.activeWeapon);
    if (unlocked) {
      ensurePlayerWeaponMesh(this.playerRig, this.activeWeapon);
    }
    (Object.keys(this.playerRig.weapons) as WeaponId[]).forEach((wId) => {
      const grp = this.playerRig.weapons[wId];
      if (grp) grp.visible = unlocked && wId === this.activeWeapon;
    });
  }

  public setGameMode(mode: GameMode) {
    soundEngine.unlock();
    this.gameMode = mode;
    if (this.toolStandGroup) {
      this.toolStandGroup.visible = mode !== 'survival';
    }
    this.syncWeaponRigVisibility();
    if (this.activeWeapon === 'builder') {
      this.updateBuildPreview();
    }
    const label =
      mode === 'survival'
        ? 'Виживання (все крафтиться вручну, без стенда)'
        : mode === 'peaceful'
          ? 'Мирний режим (без атак мобів, стенд на спавні)'
          : 'Творчий режим (безкоштовний крафт і політ)';
    this.pushFeed(`Режим гри: ${label}`);
    this.saveGameNow(true);
    this.emitHud();
  }

  public cycleCameraView() {
    soundEngine.unlock();
    const order: CameraViewMode[] = ['third', 'first', 'close', 'far'];
    const idx = order.indexOf(this.cameraViewMode);
    this.cameraViewMode = order[(idx + 1) % order.length];
    const labels: Record<CameraViewMode, string> = {
      first: 'Камера: Від 1-го лиця (очі героя)',
      close: 'Камера: Плечовий ракурс (близько)',
      third: 'Камера: Стандартна (3-тя особа)',
      far: 'Камера: Панорамний огляд (далеко)',
    };
    this.pushFeed(labels[this.cameraViewMode]);
    this.emitHud();
  }

  private syncBuildGrassExclusions() {
    const zones: BuildExclusionZone[] = [];
    for (let i = 0; i < this.builtStructures.length; i++) {
      const b = this.builtStructures[i];
      if (
        b.kind === 'floor' ||
        b.kind === 'roof_flat' ||
        b.kind === 'roof' ||
        b.kind === 'roof_peak' ||
        b.kind === 'wall' ||
        b.kind === 'window_wall' ||
        b.kind === 'doorway' ||
        b.kind === 'fireplace' ||
        b.kind === 'bed' ||
        b.kind === 'workbench' ||
        b.kind === 'campfire'
      ) {
        zones.push({
          x: b.x,
          z: b.z,
          halfW: 2.35,
          halfD: 2.35,
          rotY: b.rotY,
        });
      }
    }
    this.env?.setBuildExclusionZones(zones);
  }

  public setWeapon(id: WeaponId) {
    soundEngine.unlock();
    if (!this.isWeaponUnlocked(id)) {
      const wDef = WEAPONS.find((w) => w.id === id);
      this.pushFeed(
        `У режимі Виживання спочатку скрафтіть «${wDef?.name ?? id}» у меню Крафту [K]!`,
      );
      this.emitHud();
      return;
    }
    if (this.activeWeapon !== id) {
      soundEngine.playEquip(id);
    }
    this.activeWeapon = id;
    this.syncWeaponRigVisibility();
    if (id === 'builder') {
      this.updateBuildPreview();
    } else if (this.buildPreviewGroup) {
      this.buildPreviewGroup.visible = false;
    }
    this.emitHud();
  }

  public setBuildPiece(kind: BuildPieceKind) {
    soundEngine.unlock();
    this.selectedBuildPiece = kind;
    if (this.activeWeapon === 'builder') {
      this.updateBuildPreview();
    }
    this.emitHud();
  }

  public cycleBuildPiece() {
    soundEngine.unlock();
    const idx = BUILD_PIECES.findIndex((p) => p.id === this.selectedBuildPiece);
    const next = BUILD_PIECES[(idx + 1) % BUILD_PIECES.length];
    this.selectedBuildPiece = next.id;
    this.updateBuildPreview();
    this.pushFeed(`Блок будівництва: ${next.name}`);
    this.emitHud();
  }

  public rotateBuildPiece() {
    soundEngine.unlock();
    this.buildRotIndex = (this.buildRotIndex + 1) % 4;
    this.updateBuildPreview();
    this.emitHud();
  }

  public setBuildFloor(level: number) {
    soundEngine.unlock();
    this.buildFloorLevel = Math.max(0, Math.min(6, Math.round(level)));
    this.updateBuildPreview();
    this.pushFeed(
      this.buildFloorLevel === 0
        ? 'Режим поверху: Авто (за висотою героя)'
        : `Обрано поверх будівництва: ${this.buildFloorLevel}`,
    );
    this.emitHud();
  }

  public cycleBuildFloor(delta = 1) {
    soundEngine.unlock();
    const total = 7; // 0 (Авто), 1..6
    const next = (this.buildFloorLevel + delta + total) % total;
    this.setBuildFloor(next);
  }

  public placeWorkbenchFromStock(): boolean {
    soundEngine.unlock();
    if (this.phase !== 'playing' || this.workbenchStock <= 0) return false;
    const aimX = Math.sin(this.playerYaw);
    const aimZ = Math.cos(this.playerYaw);
    const tx = Math.round((this.px + aimX * 2.4) * 10) / 10;
    const tz = Math.round((this.pz + aimZ * 2.4) * 10) / 10;
    if (
      Math.abs(tx - riverCenterX(tz)) <= riverHalfWidthAt(tz) + 0.9 ||
      findInsideCave(tx, tz, this.py) !== null
    ) {
      this.pushFeed('Відійдіть від води чи печери, щоб поставити верстак!');
      return false;
    }
    const ty = this.walkableHeightWithBuilds(tx, tz, this.py);
    this.workbenchStock -= 1;
    const data: BuiltStructureData = {
      id: `wb_${Date.now()}_${this.nextBuildId++}`,
      kind: 'workbench',
      x: tx,
      y: ty,
      z: tz,
      rotY: this.buildRotIndex * Math.PI * 0.5,
    };
    this.spawnBuiltStructure(data);
    this.syncBuildGrassExclusions();
    this.multiplayer?.sendBuildAdd(data);
    soundEngine.playBuildPlace();
    this.spawnBurst(tx, ty + 0.9, tz, 0xfbbf24, 14);
    this.pushFeed('Встановлено Верстак Майстра поруч — крафт спорядження відкрито!');
    this.saveGameNow(true);
    this.emitHud();
    return true;
  }

  public demolishNearbyBuild(): boolean {
    soundEngine.unlock();
    if (this.phase !== 'playing' || this.builtStructures.length === 0) return false;
    const aimX = Math.sin(this.playerYaw);
    const aimZ = Math.cos(this.playerYaw);
    let bestIdx = -1;
    let bestScore = Infinity;
    for (let i = 0; i < this.builtStructures.length; i++) {
      const b = this.builtStructures[i];
      const dx = b.x - this.px;
      const dz = b.z - this.pz;
      const d = Math.hypot(dx, dz);
      if (d > 6.2) continue;
      const dot = d > 0.05 ? (dx * aimX + dz * aimZ) / d : 1;
      if (dot < -0.25 && d > 2.2) continue;
      const score = d - dot * 1.5;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      this.pushFeed('Поруч немає вашої споруди для розбирання');
      return false;
    }

    const target = this.builtStructures[bestIdx];
    this.scene.remove(target.visual.group);
    this.builtStructures.splice(bestIdx, 1);
    this.syncBuildGrassExclusions();
    this.multiplayer?.sendBuildRemove(target.id);

    const def = BUILD_PIECES.find((p) => p.id === target.kind);
    if (target.kind === 'workbench') {
      this.workbenchStock += 1;
    } else if (def && this.gameMode !== 'creative') {
      for (const [resKey, amt] of Object.entries(def.cost) as [ResourceId, number][]) {
        this.resources[resKey] += amt;
      }
    }
    soundEngine.playBuildDemolish();
    this.spawnBurst(target.x, target.y + 0.9, target.z, 0xd6d3d1, 14);
    this.pushFeed(`Розібрано: ${def?.name ?? target.kind}${this.gameMode !== 'creative' ? ' (ресурси повернуто)' : ''}`);
    this.saveGameNow(true);
    this.emitHud();
    return true;
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
    this.applyGraphicsSettings({
      ...this.graphicsSettings,
      dofEnabled: !this.graphicsSettings.dofEnabled,
    });
    this.pushFeed(this.dofEnabled ? 'Розмиття фону увімкнено' : 'Розмиття фону вимкнено');
  }

  public toggleEcoMode() {
    this.applyGraphicsSettings({
      ...this.graphicsSettings,
      ecoMode: !this.graphicsSettings.ecoMode,
    });
    this.pushFeed(
      this.ecoMode
        ? 'Еко GPU: 60 FPS, менше нагріву відеокарти'
        : 'Макс GPU: повна роздільність та частота кадрів',
    );
  }

  public toggleShadowUpscale() {
    const nextQuality = this.graphicsSettings.shadowQuality === '4k' ? '2k' : '4k';
    this.applyGraphicsSettings({
      ...this.graphicsSettings,
      shadowQuality: nextQuality,
    });
    this.pushFeed(nextQuality === '4k' ? 'Тіні: Ультра (4K)' : 'Тіні: Оптимальні (2K)');
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
    } else if (this.gameMode === 'creative') {
      this.pvy = 9.2;
      soundEngine.playJump();
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
      else if (id === 'defeat_final_boss') this.resources.essence += 5;

      soundEngine.playQuestComplete();
      this.spawnShockwave(this.px, this.py + 0.15, this.pz, 0xfacc15, 4.8, 0.55);
      this.spawnBurst(this.px, this.py + 1.5, this.pz, 0xfacc15, 22);
      this.pushFeed(`Квест виконано: «${def.title}» (${def.rewardNote})`);

      if (!this.victoryAchieved && QUESTS.every((q) => this.questProgress[q.id].completed)) {
        this.victoryAchieved = true;
        this.phase = 'victory';
        this.blocking = false;
        this.keys = {};
        if (this.pointerLocked) document.exitPointerLock?.();
        soundEngine.playQuestComplete();
        this.spawnShockwave(this.px, this.py + 0.2, this.pz, 0xfacc15, 7.5, 0.75);
        this.spawnShockwave(this.px, this.py + 0.3, this.pz, 0x38bdf8, 5.5, 0.55);
        this.spawnBurst(this.px, this.py + 1.8, this.pz, 0xfacc15, 32);
        this.pushFeed('ПЕРЕМОГА! Усі цілі кампанії «Долина Блоків» виконано!');
      }

      this.saveGameNow(true);
      this.emitHud();
    }
  }

  private isNearAnyWorkbench(): boolean {
    return (
      this.cabins.some(
        (c) => c.workbenchPos && Math.hypot(this.px - c.workbenchPos.x, this.pz - c.workbenchPos.z) < 3.1,
      ) ||
      this.builtStructures.some(
        (b) =>
          b.kind === 'workbench' &&
          Math.hypot(this.px - b.x, this.pz - b.z) < 3.4 &&
          Math.abs(this.py - b.y) < 2.2,
      )
    );
  }

  public craftRecipe(recipeId: string): boolean {
    soundEngine.unlock();
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    const isCreative = this.gameMode === 'creative';
    if (!isCreative && recipe.requiresWorkbench && !this.isNearAnyWorkbench()) {
      this.pushFeed('Потрібен Верстак поруч! Створіть переносний Верстак або підійдіть до верстака хатинки.');
      this.emitHud();
      return false;
    }
    if (recipe.outputUpgrade && this.upgrades.has(recipe.outputUpgrade)) {
      this.pushFeed(`Вже створено: ${recipe.name}`);
      return false;
    }

    if (!isCreative) {
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
    }

    if (recipe.outputConsumable) {
      this.consumables[recipe.outputConsumable] += recipe.outputCount ?? 1;
    }
    if (recipe.outputWorkbench) {
      this.workbenchStock += recipe.outputWorkbench;
    }
    if (recipe.outputUpgrade) {
      this.upgrades.add(recipe.outputUpgrade);
      if (recipe.outputUpgrade === 'armor_ranger') {
        this.maxHp += 45;
        this.hp = Math.min(this.maxHp, this.hp + 45);
        this.playerRig.armorGroup.visible = true;
      } else if (recipe.outputUpgrade === 'shield_aegis') {
        this.playerRig.shieldAegisTrim.visible = true;
      } else {
        const mappedWeapon = (Object.keys(WEAPON_UNLOCK_MAP) as WeaponId[]).find(
          (w) => WEAPON_UNLOCK_MAP[w] === recipe.outputUpgrade,
        );
        if (mappedWeapon) {
          this.setWeapon(mappedWeapon);
        }
      }
      this.syncWeaponRigVisibility();
    }

    soundEngine.playCraft();
    this.spawnBurst(this.px, this.py + 1.4, this.pz, 0x38bdf8, 16);
    this.pushFeed(`Створено: ${recipe.name}`);
    this.saveGameNow(true);
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
    if (this.gameMode !== 'creative' && this.coins < item.price) {
      this.pushFeed(`Потрібно ${item.price} монет!`);
      return false;
    }

    if (this.gameMode !== 'creative') {
      this.coins -= item.price;
    }
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
      } else if (item.outputUpgrade === 'titan_aegis') {
        this.maxHp += 20;
        this.hp = Math.min(this.maxHp, this.hp + 20);
      } else if (item.outputUpgrade === 'shield_aegis') {
        this.playerRig.shieldAegisTrim.visible = true;
      } else {
        const mappedWeapon = (Object.keys(WEAPON_UNLOCK_MAP) as WeaponId[]).find(
          (w) => WEAPON_UNLOCK_MAP[w] === item.outputUpgrade,
        );
        if (mappedWeapon) {
          this.setWeapon(mappedWeapon);
        }
      }
      this.cachedUpgradesSize = -1;
    }

    this.advanceQuest('visit_traders', 1);
    soundEngine.playCraft();
    this.spawnBurst(this.px, this.py + 1.4, this.pz, 0xfacc15, 16);
    this.pushFeed(`Куплено: ${item.name}`);
    this.emitHud();
    return true;
  }

  private applyPotionBuff(stat: PotionBuffKey, duration: number) {
    if (stat === 'rage') this.potionBuffs.rage = Math.max(this.potionBuffs.rage, duration);
    else if (stat === 'swift') this.potionBuffs.swift = Math.max(this.potionBuffs.swift, duration);
    else if (stat === 'ironSkin') this.potionBuffs.ironSkin = Math.max(this.potionBuffs.ironSkin, duration);
    else if (stat === 'regen') this.potionBuffs.regen = Math.max(this.potionBuffs.regen, duration);
    else if (stat === 'vampire') this.vampireBuffTimer = Math.max(this.vampireBuffTimer, duration);
    else if (stat === 'frostAura') this.frostAuraBuffTimer = Math.max(this.frostAuraBuffTimer, duration);
    else if (stat === 'berserk') this.berserkBuffTimer = Math.max(this.berserkBuffTimer, duration);
    else if (stat === 'titanShield') this.titanShieldBuffTimer = Math.max(this.titanShieldBuffTimer, duration);
  }

  public useConsumable(id: ConsumableId): boolean {
    soundEngine.unlock();
    if (this.phase !== 'playing' || (this.consumables[id] ?? 0) <= 0) return false;

    const meta = CONSUMABLES.find((c) => c.id === id);
    if (!meta) return false;

    // Prevent accidental waste for pure-heal potions when HP is already 100%
    const isPureHealOnly =
      !meta.buff &&
      !meta.extraBuff &&
      !meta.xpGain &&
      !meta.coinsGain &&
      !meta.staminaGain &&
      !meta.staminaPct;
    if (isPureHealOnly && this.hp >= this.maxHp) return false;

    this.consumables[id] = Math.max(0, (this.consumables[id] ?? 0) - 1);

    if (meta.hpPct) {
      this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * meta.hpPct));
    }
    if (meta.hpGain) {
      this.hp = Math.min(this.maxHp, this.hp + meta.hpGain);
    }
    if (meta.staminaPct) {
      this.stamina = Math.min(this.maxStamina, this.stamina + Math.round(this.maxStamina * meta.staminaPct));
    }
    if (meta.staminaGain) {
      this.stamina = Math.min(this.maxStamina, this.stamina + meta.staminaGain);
    }
    if (meta.xpGain) {
      this.grantXp(meta.xpGain);
    }
    if (meta.coinsGain) {
      this.coins += meta.coinsGain;
    }
    if (meta.buff) {
      this.applyPotionBuff(meta.buff.stat, meta.buff.duration);
    }
    if (meta.extraBuff) {
      this.applyPotionBuff(meta.extraBuff.stat, meta.extraBuff.duration);
    }

    const fxHex = Number.parseInt(meta.accentHex.replace('#', ''), 16) || 0x4ade80;
    if (meta.kind === 'buff' || meta.hpPct) {
      this.spawnShockwave(this.px, this.py + 0.18, this.pz, fxHex, 4.2, 0.46);
    }
    this.spawnBurst(this.px, this.py + 1.25, this.pz, fxHex, 16);
    this.pushFeed(`${meta.name}: ${meta.effect}`);

    soundEngine.playPickup();
    this.emitHud();
    return true;
  }

  private harvestResourceNode(node: ResourceNodeEntity, bonusAmount = 0, extraNote = '') {
    if (!node.available) return;
    node.available = false;
    node.respawnTimer = node.kind === 'stone' ? 12 : 35;
    node.hp = node.maxHp;
    node.mesh.visible = false;

    const baseAmount =
      node.kind === 'stone'
        ? 2 + (Math.random() < 0.4 ? 1 : 0)
        : node.kind === 'herb' || node.kind === 'wood'
          ? 2
          : 1 + (Math.random() < 0.35 ? 1 : 0);
    const amount = baseAmount + bonusAmount;
    this.resources[node.kind] += amount;
    this.grantXp(10);
    soundEngine.playPickup();

    const fxColor =
      node.kind === 'essence'
        ? 0xc084fc
        : node.kind === 'iron'
          ? 0x60a5fa
          : node.kind === 'stone'
            ? 0xcbd5e1
            : node.kind === 'herb'
              ? 0x4ade80
              : 0xfbbf24;
    this.spawnBurst(node.x, node.y + 0.7, node.z, fxColor, 10);
    this.pushFeed(`Зібрано: ${node.label} (+${amount})${extraNote}`);
    this.advanceQuest('gather_valley', 1);
    this.emitHud();
  }

  private findMineableRockInFront(
    px: number,
    pz: number,
    aimX: number,
    aimZ: number,
    range: number,
  ): ResourceNodeEntity | null {
    let best: ResourceNodeEntity | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < this.resourceNodes.length; i++) {
      const node = this.resourceNodes[i];
      if (!node.available) continue;
      if (node.kind !== 'stone' && node.kind !== 'iron' && node.kind !== 'essence') continue;
      if (Math.abs(node.y - this.py) > 3.5) continue;
      const dx = node.x - px;
      const dz = node.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist > range) continue;
      if (dist > 1.85) {
        const dot = (dx * aimX + dz * aimZ) / dist;
        if (dot < 0.25) continue;
      }
      if (dist < bestDist) {
        bestDist = dist;
        best = node;
      }
    }
    return best;
  }

  private getCachedZoneName(): string {
    const dx = this.px - this.cachedZoneX;
    const dz = this.pz - this.cachedZoneZ;
    if (dx * dx + dz * dz > 1.5 || this.cachedZoneName.startsWith('Печера:') !== this.insideCave) {
      this.cachedZoneX = this.px;
      this.cachedZoneZ = this.pz;
      this.cachedZoneName = getZoneName(this.px, this.pz, this.py);
    }
    return this.cachedZoneName;
  }

  public pressSpawnThroneButton() {
    soundEngine.unlock();
    soundEngine.playPickup();
    this.throneBtnPressTimer = 0.28;
  }

  public interactNearby() {
    soundEngine.unlock();

    // 0. Inspect Admin Gallery Monument at spawn
    if (Math.hypot(this.px - this.adminPaintingPos.x, this.pz - this.adminPaintingPos.z) < 6.0) {
      soundEngine.playPickup();
      this.spawnBurst(this.adminPaintingPos.x, this.adminPaintingPos.y + 2.8, this.adminPaintingPos.z, 0xfbbf24, 18);
      this.pushFeed('Стенд Творців (7 фото): «Адміни гри Долина Блоків — легенди долини!»');
      this.emitHud();
      return;
    }

    // 0a. Royal Spawn Throne button ("Тут раточка" — purely an empty button with nothing inside)
    if (Math.hypot(this.px - this.spawnThronePos.x, this.pz - this.spawnThronePos.z) < 4.2) {
      this.pressSpawnThroneButton();
      return;
    }

    // 0b. Starter Tool Stand (Peaceful & Creative modes only)
    if (
      this.gameMode !== 'survival' &&
      this.toolStandGroup?.visible &&
      Math.hypot(this.px - this.toolStandPos.x, this.pz - this.toolStandPos.z) < 3.6
    ) {
      const starterUpgrades: UpgradeId[] = [
        'weapon_sword',
        'weapon_hammer',
        'weapon_bow',
        'tool_axe',
        'tool_pickaxe',
        'builder_tool',
      ];
      for (const u of starterUpgrades) this.upgrades.add(u);
      this.resources.wood += 4;
      this.resources.stone += 4;
      this.syncWeaponRigVisibility();
      soundEngine.playCraft();
      this.spawnBurst(this.toolStandPos.x, this.toolStandPos.y + 1.4, this.toolStandPos.z, 0x38bdf8, 16);
      this.pushFeed('Стенд Інструментів: видано повний набір зброї/інструментів (+4 Дерево, +4 Камінь)!');
      this.saveGameNow(true);
      this.emitHud();
      return;
    }

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

    const findNearNpc = (kind: PeacefulMobKind, range: number) => {
      let best: PeacefulMobEntity | undefined;
      let bestSq = range * range;
      for (let i = 0; i < this.peacefulMobs.length; i++) {
        const pm = this.peacefulMobs[i];
        if (pm.kind !== kind) continue;
        const dx = this.px - pm.x;
        const dz = this.pz - pm.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestSq) {
          bestSq = dSq;
          best = pm;
        }
      }
      return best;
    };
    const nearAnySpot = (spots: THREE.Vector3[], range: number) => {
      const rSq = range * range;
      for (let i = 0; i < spots.length; i++) {
        const dx = this.px - spots[i].x;
        const dz = this.pz - spots[i].z;
        if (dx * dx + dz * dz < rSq) return true;
      }
      return false;
    };

    // 2. Open Shop / Forge / Herbalist / Village Bakery / Village Alchemist depending on nearest Merchant
    if (nearAnySpot(this.shopCounterSpots, 3.4) || Boolean(findNearNpc('merchant', 3.8))) {
      this.activeMerchantKind = 'general';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('general');
      this.emitHud();
      return;
    }
    if (findNearNpc('blacksmith', 3.8)) {
      this.activeMerchantKind = 'blacksmith';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('blacksmith');
      this.emitHud();
      return;
    }
    if (findNearNpc('herbalist', 3.8)) {
      this.activeMerchantKind = 'herbalist';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('herbalist');
      this.emitHud();
      return;
    }
    if (nearAnySpot(this.bakeryCounterSpots, 3.4) || Boolean(findNearNpc('baker', 3.8))) {
      this.activeMerchantKind = 'baker';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('baker');
      this.emitHud();
      return;
    }
    if (nearAnySpot(this.alchemyCounterSpots, 3.4) || Boolean(findNearNpc('alchemist', 3.8))) {
      this.activeMerchantKind = 'alchemist';
      this.advanceQuest('visit_traders', 1);
      this.onOpenShopCb?.('alchemist');
      this.emitHud();
      return;
    }

    // 3. Rest on cabin bed or player-built bed (full heal + stamina + save)
    if (
      this.cabins.some(
        (c) =>
          c.bedPos &&
          Math.hypot(this.px - c.bedPos.x, this.pz - c.bedPos.z) < 2.8 &&
          Math.abs(this.py - c.bedPos.y) < 1.9,
      ) ||
      this.builtStructures.some(
        (b) =>
          b.kind === 'bed' &&
          Math.hypot(this.px - b.x, this.pz - b.z) < 2.8 &&
          Math.abs(this.py - b.y) < 1.9,
      )
    ) {
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

    // 5. Use Any Cabin or Self-Built Workbench
    if (this.isNearAnyWorkbench()) {
      this.onOpenCraftCb?.();
      return;
    }

    // 5b. Roast raw meat over any nearby campfire (starter, village, or player-built)
    const nearFire = this.getNearestCampfire(4.2);
    if (nearFire && this.resources.raw_meat > 0) {
      this.resources.raw_meat -= 1;
      this.consumables.cooked_meat += 1;
      this.grantXp(8);
      soundEngine.playCookSizzle();
      this.spawnBurst(nearFire.x, nearFire.y + 0.75, nearFire.z, 0xfb923c, 14);
      this.pushFeed('Посмажено м’ясо на кострі! (+1 Смажене м’ясо, +8 XP, кл. 0)');
      this.saveGameNow(true);
      this.emitHud();
      return;
    }

    // 6. Talk to Village Mayor / Guard / Villager / Explorer
    const mayor = findNearNpc('mayor', 4.0);
    if (mayor) {
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

    const guard = findNearNpc('guard', 3.8);
    if (guard) {
      soundEngine.playPickup();
      this.stamina = Math.min(this.maxStamina, this.stamina + 45);
      if (!this.guardGreeted) {
        this.guardGreeted = true;
        this.resources.hide += 1;
        this.pushFeed('Вартовий Северин: «У глибоких печерах та різних біомах залягають алмазні кристали й залізо!»');
      } else {
        this.pushFeed('Вартовий Северин: «Тримайте щит напоготові — монстри чатують у горах!» (+45 витр.)');
      }
      this.emitHud();
      return;
    }

    const villager = findNearNpc('villager', 3.8);
    if (villager) {
      soundEngine.playPickup();
      this.hp = Math.min(this.maxHp, this.hp + 25);
      if (!this.villagerGreeted) {
        this.villagerGreeted = true;
        this.resources.wood += 2;
        this.resources.herb += 2;
        this.coins += 20;
        this.pushFeed('Орест: «У великому світі 7 великих поселень і 14 біомів! Знайдіть їх на мінікарті.»');
      } else {
        this.pushFeed('Орест: «На півночі Коваль Богдан, на заході Травниця Соломія, а в селищах — Пекарні й Алхіміки!» (+25 HP)');
      }
      this.emitHud();
      return;
    }

    const explorer = findNearNpc('explorer', 3.8);
    if (explorer) {
      soundEngine.playPickup();
      this.stamina = Math.min(this.maxStamina, this.stamina + 35);
      if (!this.explorerGreeted) {
        this.explorerGreeted = true;
        this.resources.essence += 1;
        this.coins += 25;
        this.pushFeed('Тарас: «Усередині блокових печер багато руди й есенції! Дослідіть усі 10 печер континенту!»');
      } else {
        this.pushFeed('Тарас: «У Руїнах чатує Тіньовий Лицар — парируйте щитом його удари!» (+35 витр.)');
      }
      this.emitHud();
    }
  }

  private isSecretBossUnlocked(): boolean {
    return this.questProgress.defeat_final_boss.completed || this.victoryAchieved;
  }

  public spawnMobNearPlayer(kind: MobKind) {
    soundEngine.unlock();
    if (this.phase === 'title') this.startGame();
    if (this.phase !== 'playing') return;
    if (kind === 'secret_boss' && !this.isSecretBossUnlocked() && this.gameMode !== 'creative') {
      this.pushFeed('Секретний моб закритий! Спочатку здолайте Фінального Боса Малакора.');
      this.emitHud();
      return;
    }
    const angle = this.playerYaw + (Math.random() - 0.5) * 0.9;
    const dist = 7.0 + Math.random() * 4;
    const [mx, mz] = this.resolveCollisions(
      this.px + Math.sin(angle) * dist,
      this.pz + Math.cos(angle) * dist,
      1.2,
      false,
      this.py,
    );
    this.spawnMobAt(kind, mx, mz, this.insideCaveSite?.id);
    this.multiplayer?.sendMobSpawn(kind, mx, mz);
    this.pushFeed(`З’явився ${MOB_DEFS[kind].name}`);
    this.emitHud();
  }

  private spawnMobAt(kind: MobKind, x: number, z: number, caveId?: string, dungeonId?: string) {
    const def = MOB_DEFS[kind];
    const visual = buildMobModel(kind, this.textures);
    const y =
      caveId || dungeonId
        ? this.walkableHeightWithBuilds(x, z)
        : this.walkableHeightWithBuilds(x, z, groundHeightAt(x, z));
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
      caveId,
      dungeonId,
    });
  }

  private spawnCaveGuards() {
    for (const cave of CAVE_SITES) {
      if (this.mobs.some((m) => m.caveId === cave.id)) continue;
      const midPos = fromCaveLocal(cavePathCenterX(-18.0), -18.0, cave);
      this.spawnMobAt(
        cave.id === 'bear_grotto' ? 'wolf' : 'giant_spider',
        midPos.x,
        midPos.z,
        cave.id,
      );
      const deepPos = fromCaveLocal(cavePathCenterX(-37.0), -37.0, cave);
      const deepKind: MobKind =
        cave.id === 'bear_grotto'
          ? 'skeleton'
          : Math.hypot(cave.x, cave.z) > 220
            ? 'crystal_golem'
            : 'skeleton';
      this.spawnMobAt(deepKind, deepPos.x, deepPos.z, cave.id);
    }
    for (const dSite of DUNGEON_SITES) {
      if (this.mobs.some((m) => m.dungeonId === dSite.id)) continue;
      const guardPos = fromDungeonLocal(0, 3.3, dSite);
      this.spawnMobAt(dSite.guardianKind, guardPos.x, guardPos.z, undefined, dSite.id);
    }
  }

  private spawnWave(waveNum: number) {
    this.wave = waveNum;
    const slimes = Math.min(5, 2 + Math.floor(waveNum / 2));
    const goblins = Math.min(5, 2 + Math.floor(waveNum / 2));
    const wolves = Math.min(4, 2 + Math.floor(waveNum / 2));
    const skeletons = Math.min(4, 1 + Math.floor(waveNum / 2));
    const golems = Math.min(3, 1 + Math.floor(waveNum / 3));

    const spawnRing = (kind: MobKind, minR: number, maxR: number, ox = 0, oz = 0) => {
      const a = Math.random() * Math.PI * 2;
      const r = minR + Math.random() * (maxR - minR);
      this.spawnMobAt(kind, Math.cos(a) * r + ox, Math.sin(a) * r + oz);
    };

    for (let i = 0; i < slimes; i++) spawnRing('slime', 20, 56, -4, 0);
    for (let i = 0; i < goblins; i++) spawnRing('goblin', 26, 70, 6, -8);
    for (let i = 0; i < wolves; i++) spawnRing('wolf', 34, 88, -12, 10);
    for (let i = 0; i < skeletons; i++) spawnRing('skeleton', 38, 84, 16, -18);
    for (let i = 0; i < golems; i++) {
      this.spawnMobAt('golem', 44 + (Math.random() - 0.5) * 34, -12 + (Math.random() - 0.5) * 44);
    }

    // Diverse new mobs across the valley & outer biomes
    const earlyPool: MobKind[] = [
      'mushroom_imp',
      'dire_boar',
      'giant_spider',
      'bandit_raider',
      'swamp_witch',
      'forest_ent',
      'void_bat',
    ];
    const outerPool: MobKind[] = [
      'desert_scorpion',
      'sand_mummy',
      'dune_stalker',
      'sand_colossus',
      'frost_yeti',
      'ice_wraith',
      'crystal_golem',
      'magma_hound',
      'lava_imp',
      'cursed_knight',
    ];

    const earlyCount = Math.min(9, 5 + Math.floor(waveNum / 2));
    for (let i = 0; i < earlyCount; i++) {
      const kind = earlyPool[(i + waveNum) % earlyPool.length];
      spawnRing(kind, 24, 78, 0, 0);
    }
    const outerCount = Math.min(9, 4 + waveNum);
    for (let i = 0; i < outerCount; i++) {
      const kind = outerPool[(i * 3 + waveNum) % outerPool.length];
      spawnRing(kind, 42, 115, 10, -10);
    }

    this.spawnCaveGuards();
    if (
      !this.mobs.some((m) => m.kind === 'boss') &&
      (!this.questProgress.defeat_boss.completed || (this.victoryAchieved && waveNum > 1))
    ) {
      this.spawnMobAt('boss', 46, -24);
    }
    if (
      !this.mobs.some((m) => m.kind === 'final_boss') &&
      (!this.questProgress.defeat_final_boss.completed || (this.victoryAchieved && waveNum > 1))
    ) {
      this.spawnMobAt('final_boss', FINAL_ARENA_X, FINAL_ARENA_Z);
    }
    if (
      this.isSecretBossUnlocked() &&
      !this.mobs.some((m) => m.kind === 'secret_boss')
    ) {
      this.spawnMobAt('secret_boss', FINAL_ARENA_X, FINAL_ARENA_Z);
    }
    this.pushFeed(`Хвиля ${waveNum} почалась!`);
  }

  private getNearestCampfire(range = 4.5): { x: number; y: number; z: number } | null {
    if (Math.hypot(this.px - this.campfirePos.x, this.pz - this.campfirePos.z) < range) {
      return { x: this.campfirePos.x, y: this.campfirePos.y, z: this.campfirePos.z };
    }
    if (Math.hypot(this.px - this.villageCampfirePos.x, this.pz - this.villageCampfirePos.z) < range) {
      return {
        x: this.villageCampfirePos.x,
        y: this.villageCampfirePos.y,
        z: this.villageCampfirePos.z,
      };
    }
    for (let i = 0; i < this.extraCampfirePos.length; i++) {
      const fp = this.extraCampfirePos[i];
      if (Math.hypot(this.px - fp.x, this.pz - fp.z) < range) {
        return { x: fp.x, y: fp.y, z: fp.z };
      }
    }
    for (let i = 0; i < this.builtStructures.length; i++) {
      const b = this.builtStructures[i];
      if (
        (b.kind === 'campfire' || b.kind === 'fireplace') &&
        Math.hypot(this.px - b.x, this.pz - b.z) < range &&
        Math.abs(this.py - b.y) < 2.3
      ) {
        return { x: b.x, y: b.y, z: b.z };
      }
    }
    return null;
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
    if (id === 'axe' && this.upgrades.has('axe_iron')) damage += 14;
    if (id === 'pickaxe' && this.upgrades.has('pickaxe_iron')) damage += 16;
    if (this.upgrades.has('rune_power')) damage = Math.round(damage * 1.22);
    if (this.berserkBuffTimer > 0) damage = Math.round(damage * 1.45);
    if (this.potionBuffs.rage > 0) damage = Math.round(damage * 1.5);
    return { ...base, damage, range };
  }

  public triggerAttack() {
    soundEngine.unlock();
    if (this.phase === 'title') this.startGame();
    if (this.phase !== 'playing' || this.attackCooldown > 0) return;

    this.playerYaw = this.camYaw + Math.PI;
    const aimX = Math.sin(this.playerYaw);
    const aimZ = Math.cos(this.playerYaw);

    // Survival bare-handed punch when player hasn't crafted the active slot weapon yet
    if (!this.isWeaponUnlocked(this.activeWeapon)) {
      this.attackCooldown = 0.38;
      this.attackAnim = 1.0;
      soundEngine.playSwordSwing();
      this.multiplayer?.sendAction({
        weapon: this.activeWeapon,
        x: this.px,
        y: this.py,
        z: this.pz,
        yaw: this.playerYaw,
        actionKind: 'punch',
      });
      this.spawnBurst(this.px + aimX * 1.3, this.py + 1.15, this.pz + aimZ * 1.3, 0xfde047, 5);
      const rageMult = this.potionBuffs.rage > 0 ? 1.5 : 1.0;
      this.hitMobsInArc(
        this.px,
        this.pz,
        aimX,
        aimZ,
        2.9,
        0.2,
        Math.round(14 * rageMult),
        5.5,
        0xfde047,
      );
      this.hitResourceNodesNear(this.px + aimX * 1.3, this.pz + aimZ * 1.3, 2.5);
      return;
    }

    const w = this.getEffectiveWeaponStats(this.activeWeapon);
    this.attackCooldown = w.cooldown;
    this.attackAnim = 1.0;

    if (w.id === 'builder') {
      this.placeBuildPiece();
      return;
    }

    const isHeavySlam = w.id === 'hammer' || w.id === 'frost_hammer' || w.id === 'thunder_maul';
    const fxHex = parseInt(w.accentHex.slice(1), 16) || 0x38bdf8;

    this.multiplayer?.sendAction({
      weapon: w.id,
      x: this.px,
      y: this.py,
      z: this.pz,
      yaw: this.playerYaw,
      actionKind: isHeavySlam ? 'slam' : w.kind === 'ranged' ? 'shoot' : 'swing',
    });

    if (w.id === 'pickaxe') {
      const rockTarget = this.findMineableRockInFront(this.px, this.pz, aimX, aimZ, 4.1);
      if (rockTarget) {
        const mineDmg = this.upgrades.has('pickaxe_iron') ? 65 : 32;
        rockTarget.hp -= mineDmg;
        soundEngine.playPickaxeHit();
        this.spawnStoneDebris(rockTarget.x, rockTarget.y + 0.55, rockTarget.z, 7);
        this.spawnBurst(rockTarget.x, rockTarget.y + 0.7, rockTarget.z, 0xfef08a, 6);
        this.cameraShake = Math.max(this.cameraShake, 0.14);

        if (rockTarget.hp <= 0) {
          soundEngine.playRockBreak();
          this.spawnStoneDebris(rockTarget.x, rockTarget.y + 0.65, rockTarget.z, 12);
          const pickaxeBonus = 1 + (this.upgrades.has('pickaxe_iron') ? 1 : 0);
          let extraNote = '';
          if (rockTarget.kind === 'stone' && Math.random() < 0.24) {
            this.resources.iron += 1;
            extraNote = ' · +1 Залізна жила!';
          }
          this.grantXp(5);
          this.harvestResourceNode(rockTarget, pickaxeBonus, extraNote);
          this.nearMineTarget = null;
          this.saveGameNow(true);
          this.emitHud();
        } else {
          this.nearMineTarget = rockTarget;
          this.emitHud();
        }
        return;
      }
      soundEngine.playSwordSwing();
      this.spawnBurst(this.px + aimX * 1.5, this.py + 1.2, this.pz + aimZ * 1.5, 0x94a3b8, 5);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, w.range, 0.25, w.damage, w.knockback, 0x94a3b8);
      this.hitResourceNodesNear(this.px + aimX * 1.4, this.pz + aimZ * 1.4, 2.5);
    } else if (w.id === 'axe') {
      const treeHitTarget = this.env.findTreeInFront(this.px, this.pz, aimX, aimZ, 4.1);
      if (treeHitTarget) {
        const axeDmg = this.upgrades.has('axe_iron') ? 45 : 26;
        const res = this.env.hitTree(treeHitTarget.id, axeDmg, aimX, aimZ);
        if (res) {
          soundEngine.playWoodChop();
          this.spawnWoodChips(res.x, res.y + 1.4, res.z, 10);
          const leafHex =
            res.species === 'pine'
              ? 0x166534
              : res.species === 'blossom'
                ? 0xf472b6
                : res.species === 'autumn'
                  ? 0xd97706
                  : 0x4ade80;
          this.spawnBurst(res.x, res.y + 3.4 * res.scale, res.z, leafHex, 5);
          this.cameraShake = Math.max(this.cameraShake, 0.13);
          if (res.felled) {
            const woodYield = (this.upgrades.has('axe_iron') ? 5 : 4) + (res.scale > 1.2 ? 1 : 0);
            this.resources.wood += woodYield;
            this.grantXp(25);
            this.advanceQuest('gather_valley', 1);
            soundEngine.playTreeFall();
            this.spawnFallingTree(
              res.x,
              res.y,
              res.z,
              res.scale,
              res.sx,
              res.sy,
              res.sz,
              res.rotY,
              res.species,
              aimX,
              aimZ,
            );
            this.spawnBurst(res.x, res.y + 1.2, res.z, leafHex, 14);
            this.pushFeed(`Зрубано дерево: +${woodYield} Деревина, +25 XP`);
            this.nearTreeTarget = null;
            this.saveGameNow(true);
            this.emitHud();
          } else {
            this.nearTreeTarget = {
              id: treeHitTarget.id,
              x: res.x,
              z: res.z,
              dist: treeHitTarget.dist,
              hp: res.hp,
              maxHp: res.maxHp,
              species: res.species,
            };
            this.emitHud();
          }
          return;
        }
      }
      soundEngine.playSwordSwing();
      this.spawnBurst(this.px + aimX * 1.5, this.py + 1.2, this.pz + aimZ * 1.5, 0xfb923c, 5);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, w.range, 0.25, w.damage, w.knockback, 0xfb923c);
      this.hitResourceNodesNear(this.px + aimX * 1.4, this.pz + aimZ * 1.4, 2.5);
    } else if (isHeavySlam) {
      soundEngine.playHammerSlam();
      const impactX = this.px + aimX * 1.75;
      const impactZ = this.pz + aimZ * 1.75;
      const groundY = this.walkableHeightWithBuilds(impactX, impactZ, this.py);
      this.spawnShockwave(impactX, groundY + 0.12, impactZ, fxHex, 4.8, 0.34);
      this.spawnShockwave(impactX, groundY + 0.16, impactZ, 0xfef08a, 3.0, 0.24);
      this.spawnStoneDebris(impactX, groundY + 0.25, impactZ, 10);
      this.cameraShake = Math.max(this.cameraShake, w.id === 'thunder_maul' ? 0.3 : 0.24);

      if (w.id === 'frost_hammer') {
        for (const m of this.mobs) {
          if (Math.hypot(m.x - impactX, m.z - impactZ) <= w.range + 1.2) {
            m.slowTimer = Math.max(m.slowTimer ?? 0, 4.5);
          }
        }
      }
      this.hitMobsInArc(impactX, impactZ, aimX, aimZ, w.range, -1.0, w.damage, w.knockback, fxHex);
      this.hitResourceNodesNear(impactX, impactZ, 2.9);
    } else if (w.kind === 'ranged') {
      if (w.id === 'bow' || w.id === 'crossbow' || w.id === 'recurve_bow' || w.id === 'void_bow') {
        soundEngine.playBowShot();
        const spd = w.id === 'crossbow' ? 48 : w.id === 'void_bow' ? 45 : 42;
        const grav = w.id === 'crossbow' ? 2.6 : 3.8;
        this.fireProjectile(w.damage, w.knockback, spd, grav, fxHex, true);
      } else {
        soundEngine.playBlasterShot();
        const isMagic = w.id === 'fire_staff' || w.id === 'frost_staff' || w.id === 'void_orb';
        const spd = isMagic ? 32 : w.id === 'plasma_rifle' ? 42 : 38;
        this.fireProjectile(w.damage, w.knockback, spd, isMagic ? 0.6 : 0, fxHex, false);
      }
    } else {
      soundEngine.playSwordSwing();
      (this.slashArcMesh.material as THREE.MeshBasicMaterial).color.setHex(fxHex);
      this.slashArcMesh.visible = true;
      this.slashArcMesh.position.set(this.px + aimX * 0.95, this.py + 1.25, this.pz + aimZ * 0.95);
      this.slashArcMesh.rotation.z = -this.playerYaw + Math.PI * 0.5;
      this.slashCoreMesh.visible = true;
      this.slashCoreMesh.position.copy(this.slashArcMesh.position);
      this.slashCoreMesh.position.y += 0.04;
      this.slashCoreMesh.rotation.z = this.slashArcMesh.rotation.z;
      this.slashArcLife = 0.2;

      if (w.id === 'frost_blade') {
        for (const m of this.mobs) {
          if (Math.hypot(m.x - this.px, m.z - this.pz) <= w.range + 1.0) {
            m.slowTimer = Math.max(m.slowTimer ?? 0, 3.5);
          }
        }
      }
      this.spawnBurst(this.px + aimX * 1.7, this.py + 1.25, this.pz + aimZ * 1.7, fxHex, 7);
      this.hitMobsInArc(this.px, this.pz, aimX, aimZ, w.range, 0.2, w.damage, w.knockback, fxHex);
      this.hitResourceNodesNear(this.px + aimX * 1.4, this.pz + aimZ * 1.4, 2.4);
    }
  }

  private spawnWoodChips(x: number, y: number, z: number, count: number) {
    for (let i = 0; i < count; i++) {
      const mesh = this.acquireSparkMesh(this.woodChipMat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4);
      this.scene.add(mesh);
      const a = Math.random() * Math.PI * 2;
      const spd = 2.0 + Math.random() * 3.8;
      this.particles.push({
        mesh,
        vx: Math.cos(a) * spd,
        vy: 2.6 + Math.random() * 3.2,
        vz: Math.sin(a) * spd,
        life: 0.48 + Math.random() * 0.2,
        scale: 0.65 + Math.random() * 0.6,
        grow: -0.9,
        bounce: true,
        pooledSpark: true,
      });
    }
  }

  private spawnFallingTree(
    x: number,
    y: number,
    z: number,
    scale: number,
    sx: number,
    sy: number,
    sz: number,
    rotY: number,
    species: 'oak' | 'autumn' | 'blossom' | 'pine',
    dirX: number,
    dirZ: number,
  ) {
    const treeGroup = this.env.createFallingTreeVisual(species, scale, sx, sy, sz, rotY);
    treeGroup.position.set(x, y + 0.5 * scale, z);
    this.scene.add(treeGroup);
    const len = Math.hypot(dirX, dirZ) || 1;
    this.fallingTrees.push({
      group: treeGroup,
      timer: 0,
      duration: 1.75,
      fallAxisX: dirZ / len,
      fallAxisZ: -dirX / len,
      scale,
      species,
      x,
      y,
      z,
      impacted: false,
    });
  }

  private getEffectiveBuildCost(kind: BuildPieceKind) {
    const def = BUILD_PIECES.find((p) => p.id === kind)!;
    if (this.gameMode === 'creative') {
      return { cost: {} as Partial<Record<ResourceId, number>>, usesStock: false };
    }
    if (kind === 'workbench' && this.workbenchStock > 0) {
      return { cost: {} as Partial<Record<ResourceId, number>>, usesStock: true };
    }
    const cost: Partial<Record<ResourceId, number>> = { ...def.cost };
    if (this.upgrades.has('builder_master') && cost.wood && cost.wood > 1) {
      cost.wood -= 1;
    }
    return { cost, usesStock: false };
  }

  private canAffordBuild(kind: BuildPieceKind): boolean {
    if (this.gameMode === 'creative') return true;
    const { cost, usesStock } = this.getEffectiveBuildCost(kind);
    if (usesStock) return true;
    return (Object.entries(cost) as [ResourceId, number][]).every(
      ([resKey, amt]) => (this.resources[resKey] ?? 0) >= amt,
    );
  }

  private spawnBuiltStructure(data: BuiltStructureData) {
    const visual = buildPlayerStructureModel(data.kind, this.textures);
    visual.group.position.set(data.x, data.y, data.z);
    visual.group.rotation.y = data.rotY;
    this.scene.add(visual.group);
    this.freezeStaticHierarchy(visual.group, [visual.doorPivot, visual.flame]);
    this.builtStructures.push({
      ...data,
      visual,
      doorOpenAmt: 0,
      doorSoundState: false,
    });
  }

  private computeBuildPlacement() {
    const aimX = Math.sin(this.playerYaw);
    const aimZ = Math.cos(this.playerYaw);
    const rawX = this.px + aimX * 3.8;
    const rawZ = this.pz + aimZ * 3.8;
    const rotY = this.buildRotIndex * Math.PI * 0.5;
    const kind = this.selectedBuildPiece;
    const isEdgePiece =
      kind === 'wall' ||
      kind === 'window_wall' ||
      kind === 'doorway' ||
      kind === 'balcony';
    const isSupportStruct =
      isEdgePiece || kind === 'pillar' || kind === 'stairs';
    const isDeckPiece = kind === 'floor' || kind === 'roof_flat';
    const isRoofCap = kind === 'roof' || kind === 'roof_peak';

    let gx = Math.round(rawX / BUILD_GRID) * BUILD_GRID;
    let gz = Math.round(rawZ / BUILD_GRID) * BUILD_GRID;
    if (isEdgePiece) {
      if (this.buildRotIndex % 2 === 0) {
        gz = Math.round((rawZ - BUILD_GRID * 0.5) / BUILD_GRID) * BUILD_GRID + BUILD_GRID * 0.5;
      } else {
        gx = Math.round((rawX - BUILD_GRID * 0.5) / BUILD_GRID) * BUILD_GRID + BUILD_GRID * 0.5;
      }
    } else if (kind === 'pillar') {
      gx = Math.round(rawX / (BUILD_GRID * 0.5)) * (BUILD_GRID * 0.5);
      gz = Math.round(rawZ / (BUILD_GRID * 0.5)) * (BUILD_GRID * 0.5);
    }

    const baseTerrainY = groundHeightAt(gx, gz);
    // Find nearest ground-floor datum within 15.5m so spacious 4m-bay multi-story buildings stay level
    let minFloorDatum = Infinity;
    for (const b of this.builtStructures) {
      if (b.kind === 'floor' && Math.hypot(b.x - gx, b.z - gz) < 15.5) {
        if (Math.abs(b.y - baseTerrainY) < 2.6 && b.y < minFloorDatum) {
          minFloorDatum = b.y;
        }
      }
    }
    const houseDatumY = minFloorDatum < Infinity ? minFloorDatum : baseTerrainY;
    const STORY_H = 3.4;

    let gy = baseTerrainY;

    if (this.buildFloorLevel >= 1) {
      // Explicit floor selection (1..6+ stories)
      const storyIdx = this.buildFloorLevel - 1;
      const hasGroundDeckNearby = this.builtStructures.some(
        (b) =>
          (b.kind === 'floor' || b.kind === 'roof_flat') &&
          Math.hypot(b.x - gx, b.z - gz) < 15.5 &&
          Math.abs(b.y - houseDatumY) < 0.85,
      );
      if (isDeckPiece) {
        gy = houseDatumY + storyIdx * STORY_H;
      } else if (isRoofCap) {
        let supportTop = -Infinity;
        for (const b of this.builtStructures) {
          if (
            (b.kind === 'wall' ||
              b.kind === 'window_wall' ||
              b.kind === 'doorway' ||
              b.kind === 'pillar') &&
            Math.hypot(b.x - gx, b.z - gz) < 2.45
          ) {
            const expectedWallBase = houseDatumY + storyIdx * STORY_H + (storyIdx >= 1 || hasGroundDeckNearby ? 0.32 : 0);
            if (Math.abs(b.y - expectedWallBase) < 0.95) {
              supportTop = Math.max(supportTop, b.y + 3.08);
            }
          }
        }
        gy =
          supportTop > -Infinity
            ? supportTop
            : houseDatumY + storyIdx * STORY_H + (storyIdx >= 1 || hasGroundDeckNearby ? 3.4 : 3.08);
      } else {
        // Walls, windows, doors, pillars, balcony, stairs, furniture on selected story
        let localDeckTop = -Infinity;
        const targetDeckY = houseDatumY + storyIdx * STORY_H;
        for (const b of this.builtStructures) {
          if (
            (b.kind === 'floor' || b.kind === 'roof_flat') &&
            Math.hypot(b.x - gx, b.z - gz) < 2.45 &&
            Math.abs(b.y - targetDeckY) < 0.85
          ) {
            localDeckTop = Math.max(localDeckTop, b.y + 0.32);
          }
        }
        if (localDeckTop > -Infinity) {
          gy = localDeckTop;
        } else if (storyIdx >= 1) {
          gy = houseDatumY + storyIdx * STORY_H + 0.32;
        } else {
          gy = hasGroundDeckNearby ? houseDatumY + 0.32 : baseTerrainY;
          if (!hasGroundDeckNearby) gy = baseTerrainY;
        }
      }
    } else {
      // Smart Auto mode: tracks player elevation and nearby walls/floors seamlessly up to any story
      const playerSurface = this.walkableHeightWithBuilds(this.px, this.pz, this.py);
      const relH = Math.max(0, playerSurface - houseDatumY);
      const playerStory = Math.floor((relH + 0.75) / STORY_H);

      if (isDeckPiece) {
        // 1) Look for adjacent upper-story deck at player's current elevation to extend floor horizontally
        let adjDeckY = -Infinity;
        if (playerStory >= 1) {
          for (const b of this.builtStructures) {
            if (
              (b.kind === 'floor' || b.kind === 'roof_flat') &&
              Math.hypot(b.x - gx, b.z - gz) < 4.4 &&
              Math.abs(b.y + 0.32 - playerSurface) < 0.95
            ) {
              adjDeckY = b.y;
              break;
            }
          }
        }
        // 2) Or look for supporting walls/pillars/stairs directly beneath (standing on current floor capping ceiling = next story)
        let supportTop = -Infinity;
        for (const b of this.builtStructures) {
          if (
            (b.kind === 'wall' ||
              b.kind === 'window_wall' ||
              b.kind === 'doorway' ||
              b.kind === 'pillar' ||
              b.kind === 'stairs') &&
            Math.hypot(b.x - gx, b.z - gz) < 2.45
          ) {
            const topY = b.kind === 'stairs' ? b.y + 3.4 : b.y + 3.08;
            if (topY > playerSurface + 0.35 && topY < playerSurface + 4.1) {
              supportTop = Math.max(supportTop, topY);
            }
          }
        }
        if (adjDeckY > -Infinity) {
          gy = adjDeckY;
        } else if (supportTop > -Infinity) {
          gy = supportTop;
        } else if (playerStory >= 1) {
          gy = houseDatumY + playerStory * STORY_H;
        } else {
          // Ground story: align to nearby ground floor if within 4.4m
          const adjGround = this.builtStructures.find(
            (b) =>
              (b.kind === 'floor' || b.kind === 'roof_flat') &&
              Math.hypot(b.x - gx, b.z - gz) < 4.4 &&
              Math.abs(b.y - baseTerrainY) < 1.4,
          );
          gy = adjGround ? adjGround.y : baseTerrainY;
        }
      } else if (isRoofCap) {
        let wallTop = -Infinity;
        for (const b of this.builtStructures) {
          if (
            (b.kind === 'wall' ||
              b.kind === 'window_wall' ||
              b.kind === 'doorway' ||
              b.kind === 'pillar') &&
            Math.hypot(b.x - gx, b.z - gz) < 2.45 &&
            b.y >= playerSurface - 0.95 &&
            b.y <= playerSurface + 1.6
          ) {
            wallTop = Math.max(wallTop, b.y + 3.08);
          }
        }
        if (wallTop > -Infinity) {
          gy = wallTop;
        } else {
          const adjRoof = this.builtStructures.find(
            (b) =>
              (b.kind === 'roof' || b.kind === 'roof_peak') &&
              Math.hypot(b.x - gx, b.z - gz) < 4.4 &&
              b.y >= playerSurface + 1.5 &&
              b.y <= playerSurface + 4.1,
          );
          if (adjRoof) {
            gy = adjRoof.y;
          } else {
            const belowDeck = this.builtStructures.find(
              (b) =>
                (b.kind === 'floor' || b.kind === 'roof_flat') &&
                Math.hypot(b.x - gx, b.z - gz) < 2.45 &&
                Math.abs(b.y + 0.32 - playerSurface) < 1.2,
            );
            gy = belowDeck ? belowDeck.y + 3.4 : Math.max(baseTerrainY, playerSurface);
          }
        }
      } else if (isSupportStruct) {
        // Snap onto highest floor/terrace near player's elevation
        let floorTop = -Infinity;
        for (const b of this.builtStructures) {
          if (
            (b.kind === 'floor' || b.kind === 'roof_flat') &&
            Math.hypot(b.x - gx, b.z - gz) < 2.45 &&
            b.y + 0.32 <= playerSurface + 0.95
          ) {
            if (Math.abs(b.y + 0.32 - playerSurface) < 1.45) {
              floorTop = Math.max(floorTop, b.y + 0.32);
            }
          }
        }
        if (floorTop > -Infinity) {
          gy = floorTop;
        } else if (playerStory >= 1) {
          gy = houseDatumY + playerStory * STORY_H + 0.32;
        } else {
          gy = baseTerrainY;
        }
      } else {
        // Interior furniture (bed, fireplace, workbench, campfire, lantern)
        let deckTop = -Infinity;
        for (const b of this.builtStructures) {
          if (
            (b.kind === 'floor' || b.kind === 'roof_flat') &&
            Math.hypot(b.x - gx, b.z - gz) < 2.45 &&
            Math.abs(b.y + 0.32 - playerSurface) < 1.2
          ) {
            deckTop = Math.max(deckTop, b.y + 0.32);
          }
        }
        gy = deckTop > -Infinity ? deckTop : Math.max(baseTerrainY, this.walkableHeightWithBuilds(gx, gz, this.py));
      }
    }

    const inRiver = Math.abs(gx - riverCenterX(gz)) <= riverHalfWidthAt(gz) + 0.9;
    const inPreset =
      findInsideCabin(gx, gz) !== null ||
      findInsideCave(gx, gz) !== null ||
      findInsideDungeon(gx, gz) !== null;
    const duplicate = this.builtStructures.some(
      (b) =>
        b.kind === kind &&
        Math.hypot(b.x - gx, b.z - gz) < 0.35 &&
        Math.abs(b.y - gy) < 0.45,
    );

    this.previewX = gx;
    this.previewY = gy;
    this.previewZ = gz;
    this.previewRotY = rotY;
    this.previewValid =
      this.isWeaponUnlocked('builder') &&
      !inRiver &&
      !inPreset &&
      !duplicate &&
      this.canAffordBuild(kind);
  }

  private getOrCreatePreviewMesh(kind: BuildPieceKind): THREE.Group {
    const existing = this.buildPreviewMeshes[kind];
    if (existing) return existing;
    const vis = buildPlayerStructureModel(kind, this.textures);
    vis.group.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = false;
        m.material = this.previewMatValid;
      }
    });
    this.buildPreviewMeshes[kind] = vis.group;
    this.buildPreviewGroup.add(vis.group);
    return vis.group;
  }

  private updateBuildPreview() {
    if (!this.buildPreviewGroup) return;
    if (
      this.phase !== 'playing' ||
      this.activeWeapon !== 'builder' ||
      !this.isWeaponUnlocked('builder')
    ) {
      this.buildPreviewGroup.visible = false;
      return;
    }
    this.computeBuildPlacement();
    this.buildPreviewGroup.visible = true;
    const activeMesh = this.getOrCreatePreviewMesh(this.selectedBuildPiece);
    (Object.keys(this.buildPreviewMeshes) as BuildPieceKind[]).forEach((k) => {
      const m = this.buildPreviewMeshes[k];
      if (m) m.visible = k === this.selectedBuildPiece;
    });
    const mat = this.previewValid ? this.previewMatValid : this.previewMatInvalid;
    activeMesh.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) m.material = mat;
    });
    this.buildPreviewGroup.position.set(this.previewX, this.previewY, this.previewZ);
    this.buildPreviewGroup.rotation.y = this.previewRotY;
  }

  private placeBuildPiece() {
    if (!this.isWeaponUnlocked('builder')) {
      this.pushFeed('Спочатку створіть «Інструмент Будівника» у Крафті [K]!');
      return;
    }
    this.computeBuildPlacement();
    if (!this.canAffordBuild(this.selectedBuildPiece)) {
      this.pushFeed('Не вистачає ресурсів для будівництва! Зрубайте дерева Сокирою (кл. 5).');
      return;
    }
    if (!this.previewValid) {
      this.pushFeed('Тут не можна збудувати цей блок (річка, існуюча будівля або дубль)');
      return;
    }

    const { cost, usesStock } = this.getEffectiveBuildCost(this.selectedBuildPiece);
    if (usesStock) {
      this.workbenchStock = Math.max(0, this.workbenchStock - 1);
    } else if (this.gameMode !== 'creative') {
      for (const [resKey, amt] of Object.entries(cost) as [ResourceId, number][]) {
        this.resources[resKey] -= amt;
      }
    }

    const data: BuiltStructureData = {
      id: `b_${Date.now()}_${this.nextBuildId++}`,
      kind: this.selectedBuildPiece,
      x: this.previewX,
      y: this.previewY,
      z: this.previewZ,
      rotY: this.previewRotY,
    };
    this.spawnBuiltStructure(data);
    this.syncBuildGrassExclusions();
    this.multiplayer?.sendBuildAdd(data);
    soundEngine.playBuildPlace();
    this.spawnBurst(data.x, data.y + 0.9, data.z, 0x4ade80, 12);
    const def = BUILD_PIECES.find((p) => p.id === data.kind);
    this.pushFeed(`Збудовано: ${def?.name ?? data.kind}`);
    this.saveGameNow(true);
    this.emitHud();
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

  private getProjMaterial(color: number, opacity = 1): THREE.MeshBasicMaterial {
    const key = `${color}_${opacity}`;
    let mat = this.projMatCache.get(key);
    if (!mat) {
      mat =
        opacity < 1
          ? new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
          : new THREE.MeshBasicMaterial({ color });
      this.projMatCache.set(key, mat);
    }
    return mat;
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
    this.spawnBurst(startX, startY, startZ, color, isArrow ? 4 : 6);

    const meshGroup = new THREE.Group();
    if (isArrow) {
      const shaft = new THREE.Mesh(this.projArrowShaftGeo, this.projArrowShaftMat);
      const tip = new THREE.Mesh(this.projArrowTipGeo, this.projArrowTipMat);
      tip.position.z = 0.5;
      const fletch = new THREE.Mesh(this.projArrowFletchGeo, this.getProjMaterial(color));
      fletch.position.z = -0.38;
      meshGroup.add(shaft, tip, fletch);
    } else {
      const core = new THREE.Mesh(this.projOrbCoreGeo, this.projBoltCoreMat);
      const halo = new THREE.Mesh(this.projOrbHaloGeo, this.getProjMaterial(color, 0.55));
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
      fromMob: false,
    });
  }

  private spawnMobProjectile(
    startX: number,
    startY: number,
    startZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    speed: number,
    damage: number,
    knockback: number,
    color: number,
    gravity = 0,
    statusEffect?: 'slow' | 'poison' | 'burn' | 'explode_fire',
  ) {
    _v1.set(dirX, dirY, dirZ).normalize();
    const meshGroup = new THREE.Group();
    const core = new THREE.Mesh(this.projMobCoreGeo, this.projMobCoreMat);
    const halo = new THREE.Mesh(this.projMobHaloGeo, this.getProjMaterial(color, 0.58));
    meshGroup.add(core, halo);
    meshGroup.position.set(startX, startY, startZ);
    this.scene.add(meshGroup);

    this.projectiles.push({
      mesh: meshGroup,
      x: startX,
      y: startY,
      z: startZ,
      vx: _v1.x * speed,
      vy: _v1.y * speed,
      vz: _v1.z * speed,
      life: 2.35,
      damage,
      knockback,
      gravity,
      color,
      trailTimer: 0.03,
      fromMob: true,
      statusEffect,
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
      if (Math.abs(m.y - this.py) > 4.5) continue;
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

    for (let i = this.peacefulMobs.length - 1; i >= 0; i--) {
      const pm = this.peacefulMobs[i];
      if (pm.kind !== 'sheep' && pm.kind !== 'deer') continue;
      if (Math.abs(pm.y - this.py) > 4.0) continue;
      const dx = pm.x - originX;
      const dz = pm.z - originZ;
      const dist = Math.hypot(dx, dz);
      if (dist > range + 0.85) continue;

      if (dist > 0.01 && minDot > -0.99) {
        const dot = (dx * dirX + dz * dirZ) / dist;
        if (dot < minDot) continue;
      }

      anyHit = true;
      this.damagePeacefulAnimal(pm, i, damage, dx, dz, dist, knockback, fxColor);
    }

    if (anyHit) {
      soundEngine.playHit(knockback > 10);
    }
  }

  private damagePeacefulAnimal(
    pm: PeacefulMobEntity,
    index: number,
    damage: number,
    dx: number,
    dz: number,
    dist: number,
    knockback: number,
    fxColor: number,
  ) {
    const critScale = 1 + (this.level - 1) * 0.06;
    const finalDmg = Math.round(damage * critScale);
    pm.hp -= finalDmg;
    pm.hitFlash = 0.16;
    pm.fleeTimer = 4.2;
    pm.wanderAngle = Math.atan2(dx, dz);
    if (pm.visual.hpBarBg) pm.visual.hpBarBg.visible = true;

    const nx = dist > 0.01 ? dx / dist : 0;
    const nz = dist > 0.01 ? dz / dist : 1;
    pm.vx += nx * knockback * 0.85;
    pm.vz += nz * knockback * 0.85;

    this.spawnBurst(pm.x, pm.y + 0.85, pm.z, fxColor, 7);

    if (pm.hp <= 0) {
      soundEngine.playMobDefeat();
      this.spawnBurst(pm.x, pm.y + 0.9, pm.z, 0xf87171, 14);
      const meatAmt = pm.kind === 'deer' ? 2 : 1 + (Math.random() < 0.45 ? 1 : 0);
      const hideAmt = pm.kind === 'deer' ? 2 : 1;
      this.resources.raw_meat += meatAmt;
      this.resources.hide += hideAmt;
      this.grantXp(pm.kind === 'deer' ? 28 : 18);
      if (Math.random() < 0.45) {
        this.spawnPickup('heal', pm.x, pm.z, 18);
      }

      this.scene.remove(pm.visual.root);
      this.peacefulMobs.splice(index, 1);
      this.peacefulRespawns.push({
        kind: pm.kind === 'deer' ? 'deer' : 'sheep',
        homeX: pm.homeX,
        homeZ: pm.homeZ,
        timer: 35,
      });

      const animalLabel = pm.kind === 'deer' ? 'Оленя' : 'Вівцю';
      this.pushFeed(
        `Впольовано ${animalLabel}: +${meatAmt} Сире м’ясо, +${hideAmt} Шкіра (посмажте на кострі [E])`,
      );
      this.saveGameNow(true);
      this.emitHud();
    } else if (pm.visual.hpBarFill) {
      const ratio = Math.max(0, pm.hp / pm.maxHp);
      pm.visual.hpBarFill.scale.x = ratio;
      pm.visual.hpBarFill.position.x = -(1 - ratio) * 0.47;
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
    let finalDmg = Math.round(damage * critScale);
    if ((mob.guardTimer ?? 0) > 0) {
      if (mob.kind === 'skeleton') {
        finalDmg = Math.max(1, Math.round(finalDmg * 0.45));
        soundEngine.playShieldBlock(false);
        this.spawnBurst(mob.x, mob.y + 1.2, mob.z, 0xe2e8f0, 6);
      } else if (mob.kind === 'crystal_golem') {
        finalDmg = Math.max(1, Math.round(finalDmg * 0.6));
        this.spawnBurst(mob.x, mob.y + 1.5, mob.z, 0x22d3ee, 8);
        if (this.gameMode === 'survival' && this.hurtCooldown <= 0 && dist < 5.5) {
          this.hp = Math.max(0, this.hp - 6);
          this.hurtCooldown = 0.45;
          if (this.hp <= 0) this.triggerPlayerDeath();
        }
      }
    }
    mob.hp -= finalDmg;
    mob.hitFlash = 0.14;
    mob.visual.hpBarBg.visible = true;

    // Bandit Raider reactive dodge hop on taking damage
    if (mob.kind === 'bandit_raider' && mob.hp > 0 && Math.random() < 0.45 && dist > 0.1) {
      const side = Math.random() < 0.5 ? 1 : -1;
      mob.vx += (-dz / dist) * 11 * side;
      mob.vz += (dx / dist) * 11 * side;
    }

    if (this.vampireBuffTimer > 0 && finalDmg > 0) {
      const heal = Math.max(1, Math.round(finalDmg * 0.35));
      this.hp = Math.min(this.maxHp, this.hp + heal);
    }

    const nx = dist > 0.01 ? dx / dist : 0;
    const nz = dist > 0.01 ? dz / dist : 1;
    const kbResist =
      mob.kind === 'secret_boss'
        ? 0.15
        : mob.kind === 'final_boss'
          ? 0.25
          : mob.kind === 'golem' ||
              mob.kind === 'boss' ||
              mob.kind === 'sand_colossus' ||
              mob.kind === 'frost_yeti' ||
              mob.kind === 'crystal_golem' ||
              mob.kind === 'cursed_knight' ||
              mob.kind === 'forest_ent'
            ? 0.45
            : 1.0;
    mob.vx += nx * knockback * kbResist;
    mob.vz += nz * knockback * kbResist;

    this.spawnBurst(mob.x, mob.y + MOB_DEFS[mob.kind].height * 0.55, mob.z, fxColor, 8);

    // Slime split mechanic when dropping below 45% HP (once, only non-mini slimes)
    if (mob.kind === 'slime' && !mob.isMiniSplit && !mob.splitDone && mob.hp > 0 && mob.hp < mob.maxHp * 0.45) {
      mob.splitDone = true;
      for (const side of [-1, 1]) {
        const sx = mob.x + side * 0.9;
        const sz = mob.z + (side > 0 ? 0.6 : -0.6);
        const vis = buildMobModel('slime', this.textures);
        vis.root.scale.setScalar(0.62);
        const sy = this.walkableHeightWithBuilds(sx, sz);
        vis.root.position.set(sx, sy, sz);
        this.scene.add(vis.root);
        const miniHp = Math.max(14, Math.round(mob.maxHp * 0.38));
        this.mobs.push({
          id: this.nextMobId++,
          kind: 'slime',
          visual: vis,
          x: sx,
          y: sy,
          z: sz,
          vx: side * 4.5,
          vz: 2.5,
          yaw: mob.yaw,
          hp: miniHp,
          maxHp: miniHp,
          attackTimer: 0.6,
          hitFlash: 0,
          walkPhase: Math.random() * 6,
          wanderAngle: Math.random() * Math.PI * 2,
          wanderTimer: 2,
          isMiniSplit: true,
        });
      }
      this.spawnBurst(mob.x, mob.y + 0.6, mob.z, 0x34d399, 14);
      this.pushFeed('Лісовий Слайм розділився!');
    }

    if (mob.hp <= 0) {
      this.defeatMob(mob, index);
    } else {
      const ratio = Math.max(0, mob.hp / mob.maxHp);
      const halfW = mob.kind === 'secret_boss' ? 1.025 : mob.kind === 'final_boss' ? 0.885 : 0.61;
      mob.visual.hpBarFill.scale.x = ratio;
      mob.visual.hpBarFill.position.x = -(1 - ratio) * halfW;
    }
  }

  private defeatMob(mob: MobEntity, index: number) {
    const def = MOB_DEFS[mob.kind];
    soundEngine.playMobDefeat();
    this.spawnBurst(mob.x, mob.y + 1.0, mob.z, 0xfde047, 16);

    const coinCount =
      mob.kind === 'secret_boss'
        ? 8
        : mob.kind === 'final_boss'
          ? 6
          : mob.kind === 'boss'
            ? 4
            : mob.kind === 'golem' ||
                mob.kind === 'sand_colossus' ||
                mob.kind === 'frost_yeti' ||
                mob.kind === 'crystal_golem' ||
                mob.kind === 'cursed_knight'
              ? 2
              : 1;
    for (let c = 0; c < coinCount; c++) {
      this.spawnPickup(
        'coin',
        mob.x + (Math.random() - 0.5) * 1.4,
        mob.z + (Math.random() - 0.5) * 1.4,
        Math.round(def.rewardCoins / coinCount),
      );
    }
    if (
      Math.random() <
      (mob.kind === 'boss' || mob.kind === 'final_boss' || mob.kind === 'secret_boss' ? 1 : 0.35)
    ) {
      this.spawnPickup('heal', mob.x + 0.5, mob.z - 0.4, 28);
    }

    const dropNotes: string[] = [];
    const addDrop = (id: ResourceId, amt: number) => {
      this.resources[id] += amt;
      const meta = RESOURCES.find((r) => r.id === id);
      if (meta) dropNotes.push(`+${amt} ${meta.name}`);
    };
    if (mob.kind === 'slime' || mob.kind === 'mushroom_imp') {
      addDrop('essence', 1);
      if (Math.random() < 0.55) addDrop('herb', 1);
    } else if (mob.kind === 'goblin' || mob.kind === 'bandit_raider') {
      addDrop('wood', 1);
      addDrop('hide', 1);
      if (mob.kind === 'bandit_raider') addDrop('iron', 1);
    } else if (
      mob.kind === 'wolf' ||
      mob.kind === 'dire_boar' ||
      mob.kind === 'giant_spider' ||
      mob.kind === 'desert_scorpion' ||
      mob.kind === 'magma_hound'
    ) {
      addDrop('hide', 1 + (Math.random() < 0.5 ? 1 : 0));
      if (mob.kind === 'dire_boar') addDrop('raw_meat', 1);
      else if (mob.kind === 'magma_hound') addDrop('essence', 1);
      else if (Math.random() < 0.45) addDrop('herb', 1);
    } else if (mob.kind === 'skeleton' || mob.kind === 'sand_mummy' || mob.kind === 'dune_stalker') {
      addDrop('stone', 1);
      addDrop('iron', 1);
      addDrop('essence', 1);
    } else if (mob.kind === 'swamp_witch' || mob.kind === 'ice_wraith' || mob.kind === 'void_bat' || mob.kind === 'lava_imp') {
      addDrop('essence', 2);
      if (Math.random() < 0.6) addDrop('herb', 1);
    } else if (mob.kind === 'forest_ent') {
      addDrop('wood', 3);
      addDrop('herb', 2);
      addDrop('essence', 1);
    } else if (
      mob.kind === 'golem' ||
      mob.kind === 'sand_colossus' ||
      mob.kind === 'frost_yeti' ||
      mob.kind === 'crystal_golem' ||
      mob.kind === 'cursed_knight'
    ) {
      addDrop('stone', 2);
      addDrop('iron', 2);
      if (mob.kind === 'crystal_golem' || mob.kind === 'cursed_knight') addDrop('essence', 2);
    } else if (mob.kind === 'secret_boss') {
      addDrop('iron', 6);
      addDrop('essence', 8);
      addDrop('hide', 4);
      this.consumables.phoenix_elixir += 1;
      dropNotes.push('+1 Еліксир Фенікса');
    } else if (mob.kind === 'final_boss') {
      addDrop('iron', 4);
      addDrop('essence', 5);
      addDrop('hide', 3);
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
    } else if (mob.kind === 'final_boss') {
      this.spawnShockwave(mob.x, mob.y + 0.4, mob.z, 0xf43f5e, 10, 0.75);
      this.cameraShake = Math.max(this.cameraShake, 0.45);
      this.advanceQuest('defeat_final_boss', 1);
      if (!this.mobs.some((m) => m.kind === 'secret_boss')) {
        this.spawnMobAt('secret_boss', FINAL_ARENA_X, FINAL_ARENA_Z);
        this.spawnShockwave(FINAL_ARENA_X, groundHeightAt(FINAL_ARENA_X, FINAL_ARENA_Z) + 0.4, FINAL_ARENA_Z, 0x22d3ee, 14, 0.85);
        this.spawnShockwave(FINAL_ARENA_X, groundHeightAt(FINAL_ARENA_X, FINAL_ARENA_Z) + 0.5, FINAL_ARENA_Z, 0xfbbf24, 9, 0.65);
        this.spawnBurst(FINAL_ARENA_X, groundHeightAt(FINAL_ARENA_X, FINAL_ARENA_Z) + 2.4, FINAL_ARENA_Z, 0x22d3ee, 28);
        this.pushFeed('ТАЄМНИЦЯ ВІДКРИЛАСЬ! З безодні пробудився секретний моб: Архонт Пустоти!');
      }
    } else if (mob.kind === 'secret_boss') {
      this.spawnShockwave(mob.x, mob.y + 0.4, mob.z, 0x22d3ee, 12, 0.8);
      this.spawnShockwave(mob.x, mob.y + 0.5, mob.z, 0xfbbf24, 8, 0.6);
      this.cameraShake = Math.max(this.cameraShake, 0.5);
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
    const y = this.walkableHeightWithBuilds(x, z) + 0.65;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.pickups.push({ mesh, kind, x, y, z, value, phase: Math.random() * 6, pickupDelay });
  }

  private getSparkMaterial(color: number): THREE.MeshBasicMaterial {
    let mat = this.sparkMatCache.get(color);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color });
      this.sparkMatCache.set(color, mat);
    }
    return mat;
  }

  private acquireSparkMesh(mat: THREE.Material): THREE.Mesh {
    const recycled = this.sparkMeshPool.pop();
    if (recycled) {
      recycled.material = mat;
      recycled.rotation.set(0, 0, 0);
      recycled.scale.setScalar(1);
      recycled.visible = true;
      return recycled;
    }
    return new THREE.Mesh(this.sparkGeo, mat);
  }

  private spawnBurst(x: number, y: number, z: number, color: number, count: number) {
    const mat = this.getSparkMaterial(color);
    for (let i = 0; i < count; i++) {
      const mesh = this.acquireSparkMesh(mat);
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
        pooledSpark: true,
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

  private walkableHeightWithBuilds(x: number, z: number, currentY?: number): number {
    let bestY = walkableHeightAt(x, z, currentY);
    for (let i = 0; i < this.builtStructures.length; i++) {
      const b = this.builtStructures[i];
      if (Math.abs(x - b.x) > 3.2 || Math.abs(z - b.z) > 3.2) continue;
      const cos = Math.cos(-b.rotY);
      const sin = Math.sin(-b.rotY);
      const lx = (x - b.x) * cos - (z - b.z) * sin;
      const lz = (x - b.x) * sin + (z - b.z) * cos;
      if ((b.kind === 'floor' || b.kind === 'roof_flat') && Math.abs(lx) <= 2.06 && Math.abs(lz) <= 2.06) {
        const top = b.y + 0.32;
        if ((currentY === undefined || currentY + 0.65 >= top) && top > bestY) {
          bestY = top;
        }
      } else if ((b.kind === 'roof' || b.kind === 'roof_peak') && Math.abs(lx) <= 2.15 && Math.abs(lz) <= 2.15) {
        const top = b.y + 0.96;
        if (currentY !== undefined && currentY + 0.5 >= top && top > bestY) {
          bestY = top;
        }
      } else if (b.kind === 'stairs' && Math.abs(lx) <= 1.9 && Math.abs(lz) <= 2.1) {
        const t = THREE.MathUtils.clamp((2.0 - lz) / 4.0, 0, 1);
        const stairY = b.y + t * 3.4;
        if ((currentY === undefined || currentY + 0.95 >= stairY) && stairY > bestY) {
          bestY = stairY;
        }
      }
    }
    return bestY;
  }

  private resolveBuiltBox(
    rx: number,
    rz: number,
    radius: number,
    bx: number,
    bz: number,
    rotY: number,
    localCenterX: number,
    halfX: number,
    halfZ: number,
  ): [number, number] {
    const cos = Math.cos(-rotY);
    const sin = Math.sin(-rotY);
    const lx = (rx - bx) * cos - (rz - bz) * sin - localCenterX;
    const lz = (rx - bx) * sin + (rz - bz) * cos;
    const penX = halfX + radius - Math.abs(lx);
    const penZ = halfZ + radius - Math.abs(lz);
    if (penX > 0 && penZ > 0) {
      let nlx = lx;
      let nlz = lz;
      if (penX < penZ) {
        nlx += lx >= 0 ? penX : -penX;
      } else {
        nlz += lz >= 0 ? penZ : -penZ;
      }
      nlx += localCenterX;
      const rCos = Math.cos(rotY);
      const rSin = Math.sin(rotY);
      return [bx + nlx * rCos - nlz * rSin, bz + nlx * rSin + nlz * rCos];
    }
    return [rx, rz];
  }

  private rebuildColliderGridIfNeeded() {
    const ver = this.env.getCollidersVersion();
    if (ver === this.cachedCollidersVersion) return;
    this.cachedCollidersVersion = ver;
    this.colliderGrid.clear();
    const colliders = this.env.colliders;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      const minCx = Math.floor((c.x - c.radius) / COLLIDER_CELL_SIZE);
      const maxCx = Math.floor((c.x + c.radius) / COLLIDER_CELL_SIZE);
      const minCz = Math.floor((c.z - c.radius) / COLLIDER_CELL_SIZE);
      const maxCz = Math.floor((c.z + c.radius) / COLLIDER_CELL_SIZE);
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const key = packColliderCell(cx, cz);
          let bucket = this.colliderGrid.get(key);
          if (!bucket) {
            bucket = [];
            this.colliderGrid.set(key, bucket);
          }
          bucket.push(c);
        }
      }
    }
  }

  private resolveCollisions(
    x: number,
    z: number,
    radius: number,
    allowCabinInterior = true,
    entityY?: number,
  ): [number, number] {
    let [rx, rz] = resolveWorldBounds(x, z, radius);

    if (allowCabinInterior) {
      [rx, rz] = resolveCabinCollision(rx, rz, radius, entityY);
    } else {
      for (let i = 0; i < CABIN_SITES.length; i++) {
        const site = CABIN_SITES[i];
        const dims = getCabinDims(site.style);
        if (Math.abs(rx - site.x) > dims.halfW + 4.5 || Math.abs(rz - site.z) > dims.halfD + 4.5) continue;
        const { lx, lz } = toCabinLocal(rx, rz, site);
        if (Math.abs(lx) < dims.halfW + 1.25 && Math.abs(lz) < dims.halfD + 1.45) {
          const pushX = lx >= 0 ? dims.halfW + 1.25 : -(dims.halfW + 1.25);
          const worldOut = fromCabinLocal(pushX, lz, site);
          rx = worldOut.x;
          rz = worldOut.z;
        }
      }
    }

    [rx, rz] = resolveCaveCollision(rx, rz, radius, entityY);
    [rx, rz] = resolveDungeonCollision(rx, rz, radius);

    for (let i = 0; i < this.builtStructures.length; i++) {
      const b = this.builtStructures[i];
      if (
        b.kind === 'floor' ||
        b.kind === 'roof' ||
        b.kind === 'roof_peak' ||
        b.kind === 'roof_flat' ||
        b.kind === 'stairs'
      ) {
        continue;
      }
      if (Math.abs(rx - b.x) > 3.4 || Math.abs(rz - b.z) > 3.4) continue;
      const topLimit = b.kind === 'balcony' || b.kind === 'bed' ? 1.25 : 3.1;
      if (allowCabinInterior) {
        if (this.py + 1.5 <= b.y + 0.05 || this.py >= b.y + topLimit) continue;
      } else if (b.y > groundHeightAt(b.x, b.z) + 0.8) {
        continue;
      }

      if (b.kind === 'wall' || b.kind === 'window_wall') {
        [rx, rz] = this.resolveBuiltBox(rx, rz, radius, b.x, b.z, b.rotY, 0, 2.02, 0.24);
      } else if (b.kind === 'balcony') {
        [rx, rz] = this.resolveBuiltBox(rx, rz, radius, b.x, b.z, b.rotY, 0, 2.02, 0.18);
      } else if (b.kind === 'doorway') {
        [rx, rz] = this.resolveBuiltBox(rx, rz, radius, b.x, b.z, b.rotY, -1.43, 0.58, 0.24);
        [rx, rz] = this.resolveBuiltBox(rx, rz, radius, b.x, b.z, b.rotY, 1.43, 0.58, 0.24);
      } else if (b.kind === 'workbench') {
        [rx, rz] = this.resolveBuiltBox(rx, rz, radius, b.x, b.z, b.rotY, 0, 1.18, 0.6);
      } else if (b.kind === 'bed') {
        [rx, rz] = this.resolveBuiltBox(rx, rz, radius, b.x, b.z, b.rotY, 0, 0.9, 1.26);
      } else if (b.kind === 'fireplace') {
        [rx, rz] = this.resolveBuiltBox(rx, rz, radius, b.x, b.z, b.rotY, 0, 1.18, 0.68);
      } else if (b.kind === 'lantern' || b.kind === 'campfire' || b.kind === 'pillar') {
        const dx = rx - b.x;
        const dz = rz - b.z;
        const minD = radius + (b.kind === 'campfire' ? 0.98 : b.kind === 'pillar' ? 0.36 : 0.42);
        const dSq = dx * dx + dz * dz;
        if (dSq < minD * minD && dSq > 0.000001) {
          const d = Math.sqrt(dSq);
          const push = (minD - d) / d;
          rx += dx * push;
          rz += dz * push;
        }
      }
    }

    this.rebuildColliderGridIfNeeded();
    const pad = radius + 0.2;
    const minCx = Math.floor((rx - pad) / COLLIDER_CELL_SIZE);
    const maxCx = Math.floor((rx + pad) / COLLIDER_CELL_SIZE);
    const minCz = Math.floor((rz - pad) / COLLIDER_CELL_SIZE);
    const maxCz = Math.floor((rz + pad) / COLLIDER_CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.colliderGrid.get(packColliderCell(cx, cz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const c = bucket[i];
          const dx = rx - c.x;
          const dz = rz - c.z;
          const minD = radius + c.radius;
          const dSq = dx * dx + dz * dz;
          if (dSq < minD * minD && dSq > 0.000001) {
            const d = Math.sqrt(dSq);
            const push = (minD - d) / d;
            rx += dx * push;
            rz += dz * push;
          }
        }
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
        // Only cap 120Hz+ displays without skipping 60Hz vsync frames
        if (now - this.lastRenderMs < 11.5) {
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
      if (!this.isSoftwareGl && this.renderer.shadowMap.enabled && this.sunLight.castShadow) {
        const updateEvery = this.isMobile ? 4 : this.ecoMode ? 4 : 3;
        const movedSq =
          (this.px - this.lastShadowPx) * (this.px - this.lastShadowPx) +
          (this.pz - this.lastShadowPz) * (this.pz - this.lastShadowPz);
        if (this.renderCount % updateEvery === 1 || movedSq > 0.36) {
          this.renderer.shadowMap.needsUpdate = true;
          this.lastShadowPx = this.px;
          this.lastShadowPz = this.pz;
        }
      }

      const usePostProcessing =
        !this.isSoftwareGl &&
        Boolean(this.composer) &&
        (this.dofEnabled || this.graphicsSettings.bloomEnabled);

      if (!usePostProcessing || !this.composer) {
        this.renderer.render(this.scene, this.camera);
      } else {
        try {
          if (this.dofPass && this.dofEnabled && this.composer.readBuffer.depthTexture) {
            this.dofPass.uniforms['tDepth'].value = this.composer.readBuffer.depthTexture;
          }
          this.composer.render();
        } catch {
          this.composer.dispose();
          this.composer = null;
          this.dofPass = null;
          this.bloomPass = null;
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

    const bId = biomeAt(this.px, this.pz);
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
    } else if (bId === 'ashlands') {
      targetSunInt *= 0.82;
      this.targetFogColor.setHex(0x474154);
      targetFogDensity = 0.0066;
      this.sunLight.color.setHex(0xfda4af);
    } else if (bId === 'snow_peaks') {
      this.targetFogColor.setHex(0xd8ecfa);
      targetFogDensity = 0.0049;
      this.sunLight.color.setHex(0xf0f9ff);
    } else if (bId === 'desert') {
      targetSunInt *= 1.12;
      this.targetFogColor.setHex(0xf2dfb4);
      targetFogDensity = 0.0032;
      this.sunLight.color.setHex(0xffe9a6);
    } else if (bId === 'golden_steppe') {
      this.targetFogColor.setHex(0xeee0be);
      targetFogDensity = 0.0038;
      this.sunLight.color.setHex(0xffe7a8);
    } else if (bId === 'blossom_grove') {
      this.targetFogColor.setHex(0xebdce8);
      targetFogDensity = 0.0041;
      this.sunLight.color.setHex(0xfff1f2);
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

    if (this.graphicsSettings.viewDistance === 'near') {
      targetFogDensity *= 1.45;
    } else if (this.graphicsSettings.viewDistance === 'medium') {
      targetFogDensity *= 1.15;
    }

    if (this.insideCave) {
      targetSunInt *= 0.28;
      targetHemiInt *= 0.42;
      this.targetFogColor.setHex(0x161b26);
      targetFogDensity = Math.max(targetFogDensity, 0.016);
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
    for (let i = 0; i < this.extraCampfireFlames.length; i++) {
      this.extraCampfireFlames[i].scale.set(fireScaleX, fireScaleY, fireScaleX);
    }

    if (this.spawnThroneBtnMesh) {
      if (this.throneBtnPressTimer > 0) {
        this.throneBtnPressTimer = Math.max(0, this.throneBtnPressTimer - dt);
        const pressOffset = Math.sin((this.throneBtnPressTimer / 0.28) * Math.PI) * 0.085;
        this.spawnThroneBtnMesh.position.y = this.spawnThroneBtnBaseY - pressOffset;
      } else if (this.spawnThroneBtnMesh.position.y !== this.spawnThroneBtnBaseY) {
        this.spawnThroneBtnMesh.position.y = this.spawnThroneBtnBaseY;
      }
    }

    // Distance-cull buildings, caves, outdoor chests, & resource nodes to slash draw calls
    const cabinCullSq = this.isMobile ? 160 * 160 : 215 * 215;
    for (let idx = 0; idx < this.cabins.length; idx++) {
      const c = this.cabins[idx];
      const dSq = (this.px - c.site.x) ** 2 + (this.pz - c.site.z) ** 2;
      const visible = dSq < cabinCullSq;
      c.group.visible = visible;
      if (!visible) continue;

      if (dSq < 36 * 36) {
        c.hearthFlame.scale.set(
          1 + Math.sin(elapsed * 13 + idx) * 0.14,
          1 + Math.cos(elapsed * 11 + idx * 1.3) * 0.2,
          1 + Math.sin(elapsed * 13 + idx) * 0.14,
        );
      }

      if (dSq < 18 * 18 || c.doorOpenAmt > 0.01) {
        const ddx = this.px - c.doorWorldX;
        const ddz = this.pz - c.doorWorldZ;
        const nearDoor = ddx * ddx + ddz * ddz < 4.5 * 4.5;
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

    if (Math.hypot(this.px - FINAL_ARENA_X, this.pz - FINAL_ARENA_Z) < 160) {
      for (let idx = 0; idx < this.finalArenaCrystalMeshes.length; idx++) {
        const cr = this.finalArenaCrystalMeshes[idx];
        cr.rotation.y += dt * (idx % 2 === 0 ? 1.15 : -1.15);
        cr.position.y = 5.2 + Math.sin(elapsed * 2.6 + idx * 0.9) * 0.24;
      }
      for (let idx = 0; idx < this.finalArenaFlameMeshes.length; idx++) {
        const fl = this.finalArenaFlameMeshes[idx];
        fl.scale.set(
          1 + Math.sin(elapsed * 13 + idx) * 0.16,
          1 + Math.cos(elapsed * 11 + idx * 1.2) * 0.22,
          1 + Math.sin(elapsed * 13 + idx) * 0.16,
        );
      }
    }

    const caveCullSq = this.isMobile ? 165 * 165 : 215 * 215;
    for (const cave of this.caves) {
      const dSq = (this.px - cave.site.x) ** 2 + (this.pz - cave.site.z) ** 2;
      const visible = dSq < caveCullSq;
      cave.visual.group.visible = visible;
      if (!visible) continue;
      if (dSq < 72 * 72) {
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

    for (let i = 0; i < this.dungeons.length; i++) {
      const d = this.dungeons[i];
      const dSq = (this.px - d.site.x) ** 2 + (this.pz - d.site.z) ** 2;
      const visible = dSq < cabinCullSq;
      d.visual.group.visible = visible;
      if (!visible || dSq >= 68 * 68) continue;
      for (let c = 0; c < d.visual.crystalMeshes.length; c++) {
        const cr = d.visual.crystalMeshes[c];
        cr.rotation.y += dt * (c % 2 === 0 ? 0.95 : -0.95);
        cr.position.y += Math.sin(elapsed * 2.5 + c + i) * dt * 0.12;
      }
      for (let f = 0; f < d.visual.flameMeshes.length; f++) {
        const fl = d.visual.flameMeshes[f];
        fl.scale.set(
          1 + Math.sin(elapsed * 13 + f + i) * 0.16,
          1 + Math.cos(elapsed * 11 + f * 1.2 + i) * 0.22,
          1 + Math.sin(elapsed * 13 + f + i) * 0.16,
        );
      }
    }

    for (const chest of this.chests) {
      if (!chest.indoor) {
        const dSq = (this.px - chest.x) ** 2 + (this.pz - chest.z) ** 2;
        chest.group.visible = dSq < 125 * 125;
      }
    }

    for (const node of this.resourceNodes) {
      if (!node.available) {
        node.respawnTimer -= dt;
        if (node.respawnTimer <= 0) {
          node.available = true;
          node.hp = node.maxHp;
        }
        node.mesh.visible = false;
      } else {
        const dSq = (this.px - node.x) ** 2 + (this.pz - node.z) ** 2;
        node.mesh.visible = dSq < 135 * 135;
        if (node.mesh.visible && node.kind === 'essence' && dSq < 85 * 85) {
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

    if (this.phase === 'dying') {
      this.deathAnimTimer -= dt;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 1.1);
      const t = Math.min(1, 1 - this.deathAnimTimer / 1.25);
      const fallEase = 1 - Math.pow(1 - t, 3);
      const rig = this.playerRig;
      rig.bodyTilt.rotation.x = -Math.PI * 0.46 * fallEase;
      rig.bodyTilt.rotation.z = 0.36 * fallEase;
      rig.bodyTilt.position.y = -0.35 * fallEase;
      rig.leftArm.rotation.x = -0.75 * fallEase;
      rig.leftArm.rotation.z = 0.65 * fallEase;
      rig.rightArm.rotation.x = 0.65 * fallEase;
      rig.rightArm.rotation.z = -0.75 * fallEase;
      rig.leftLeg.rotation.x = 0.25 * fallEase;
      rig.rightLeg.rotation.x = -0.3 * fallEase;
      this.targetCamDist = Math.min(11.5, Math.max(this.targetCamDist, 7.6 + fallEase * 2.1));
      if (this.deathAnimTimer <= 0) {
        this.phase = 'dead';
        this.emitHud();
      }
    } else if (this.phase === 'playing') {
      this.playTimeSec += dt;
      this.updatePlayer(dt, elapsed);
      if (this.respawnAnimTimer > 0) {
        this.respawnAnimTimer = Math.max(0, this.respawnAnimTimer - dt);
        const rt = 1 - this.respawnAnimTimer / 1.45;
        this.respawnAuraRing.visible = true;
        this.respawnAuraRing.position.set(this.px, this.py + 0.2 + rt * 2.2, this.pz);
        this.respawnAuraRing.rotation.z = elapsed * 4.5;
        const s = 0.85 + Math.sin(rt * Math.PI) * 0.65;
        this.respawnAuraRing.scale.setScalar(s);
        (this.respawnAuraRing.material as THREE.MeshBasicMaterial).opacity = Math.sin(rt * Math.PI) * 0.85;
      } else {
        this.respawnAuraRing.visible = false;
      }
      if (
        !this.questProgress.find_village.completed &&
        Math.hypot(this.px - VILLAGE_SITE.x, this.pz - VILLAGE_SITE.z) < 58
      ) {
        this.advanceQuest('find_village', 1);
      }
    } else {
      this.respawnAuraRing.visible = false;
    }

    if (this.villageBeacon) {
      this.villageBeacon.visible = !this.questProgress.find_village.completed;
      if (this.villageBeacon.visible) {
        this.villageBeacon.rotation.y += dt * 0.7;
        (this.villageBeacon.material as THREE.MeshBasicMaterial).opacity =
          0.18 + Math.sin(elapsed * 2.4) * 0.06;
      }
    }
    if (this.bossBeacon) {
      const hasBoss = this.mobs.some((m) => m.kind === 'boss');
      this.bossBeacon.visible = hasBoss;
      if (this.bossBeacon.visible) {
        this.bossBeacon.rotation.y -= dt * 0.9;
        (this.bossBeacon.material as THREE.MeshBasicMaterial).opacity =
          0.2 + Math.sin(elapsed * 3.0) * 0.07;
      }
    }
    if (this.finalBossBeacon) {
      const hasFinalBoss = this.mobs.some((m) => m.kind === 'final_boss');
      this.finalBossBeacon.visible = hasFinalBoss;
      if (this.finalBossBeacon.visible) {
        this.finalBossBeacon.rotation.y += dt * 1.1;
        (this.finalBossBeacon.material as THREE.MeshBasicMaterial).opacity =
          0.24 + Math.sin(elapsed * 3.4) * 0.08;
      }
    }
    if (this.secretBossBeacon) {
      const secretMob = this.mobs.find((m) => m.kind === 'secret_boss');
      this.secretBossBeacon.visible = Boolean(secretMob) && this.isSecretBossUnlocked();
      if (this.secretBossBeacon.visible && secretMob) {
        this.secretBossBeacon.position.set(secretMob.x, secretMob.y + 48, secretMob.z);
        this.secretBossBeacon.rotation.y -= dt * 1.4;
        (this.secretBossBeacon.material as THREE.MeshBasicMaterial).opacity =
          0.28 + Math.sin(elapsed * 4.0) * 0.09;
      }
    }

    this.aiTick++;
    this.updateMobs(dt, elapsed);
    this.updatePeacefulMobs(dt, elapsed);
    this.updateRemotePlayers(dt, elapsed);
    this.updateProjectiles(dt);
    this.updatePickups(dt, elapsed);
    this.updateParticles(dt);
    this.updateEffects(dt);
    this.updateCamera(dt, elapsed);

    this.multiplayer?.sendPlayerState({
      x: this.px,
      y: this.py,
      z: this.pz,
      yaw: this.playerYaw,
      vx: this.pvx,
      vz: this.pvz,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      level: this.level,
      weapon: this.activeWeapon,
      blocking: this.blocking,
      inWater: this.inWater,
      armor: this.upgrades.has('armor_ranger'),
      aegis: this.upgrades.has('shield_aegis'),
      gameMode: this.gameMode,
      zoneName: this.getCachedZoneName(),
    });

    this.sunLight.position.set(
      this.px + this.sunDir.x * 58,
      this.sunDir.y * 58,
      this.pz + this.sunDir.z * 58,
    );
    this.sunLight.target.position.set(this.px, this.py, this.pz);

    let valleyMobsCount = 0;
    let nearbyAmbientMobs = 0;
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      if (!m.caveId) valleyMobsCount++;
      const isBoss = m.kind === 'boss' || m.kind === 'final_boss' || m.kind === 'secret_boss';
      const distSq = (m.x - this.px) ** 2 + (m.z - this.pz) ** 2;
      if (!m.caveId && !isBoss && distSq < 140 * 140) nearbyAmbientMobs++;
      // Recycle distant ambient mobs when exploring across the 8096x16192 continent
      if (!m.caveId && !isBoss && distSq > 250 * 250 && this.mobs.length > 24) {
        this.scene.remove(m.visual.root);
        this.mobs.splice(i, 1);
      }
    }
    if (this.phase === 'playing') {
      this.ambientMobTimer -= dt;
      if (this.ambientMobTimer <= 0) {
        this.ambientMobTimer = 3.5;
        if (nearbyAmbientMobs < 8 && this.mobs.length < 40) {
          this.spawnBiomeMobNearPlayer();
        }
      }
    }
    if (valleyMobsCount === 0 && this.phase === 'playing') {
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
    if (this.hudThrottle >= 0.15) {
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
    for (let i = 0; i < this.extraCampfirePos.length; i++) {
      const fp = this.extraCampfirePos[i];
      consider(fp.x, fp.y + 1.1, fp.z, 0xff9238, flickerA, 20);
    }

    for (let idx = 0; idx < this.cabins.length; idx++) {
      const c = this.cabins[idx];
      if (!c.group.visible) continue;
      if ((this.px - c.site.x) ** 2 + (this.pz - c.site.z) ** 2 > 28 * 28) continue;
      consider(
        c.hearthWorldX,
        c.hearthWorldY,
        c.hearthWorldZ,
        0xff9b42,
        4.6 + Math.cos(elapsed * 10 + idx) * 0.75,
        16,
      );
    }

    for (const cave of this.caves) {
      if (!cave.visual.group.visible) continue;
      if ((this.px - cave.site.x) ** 2 + (this.pz - cave.site.z) ** 2 > 68 * 68) continue;
      for (let aIdx = 0; aIdx < cave.lightAnchors.length; aIdx++) {
        const anchor = cave.lightAnchors[aIdx];
        const pulse =
          anchor.color === 0xffaa44
            ? anchor.baseInt + Math.sin(elapsed * 11 + aIdx * 1.7) * 0.65
            : anchor.baseInt + Math.sin(elapsed * 2.4 + aIdx) * 0.35;
        consider(anchor.x, anchor.y, anchor.z, anchor.color, pulse, anchor.radius);
      }
    }

    for (let i = 0; i < this.builtStructures.length; i++) {
      const b = this.builtStructures[i];
      if (b.kind === 'lantern') {
        consider(b.x, b.y + 2.25, b.z, 0xffb347, 5.2 + Math.sin(elapsed * 10 + i) * 0.45, 20);
      } else if (b.kind === 'campfire' || b.kind === 'fireplace') {
        consider(b.x, b.y + 0.9, b.z, 0xff8a2b, 5.8 + Math.sin(elapsed * 13 + i) * 0.85, 22);
      }
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
    this.frostAuraBuffTimer = Math.max(0, this.frostAuraBuffTimer - dt);
    this.vampireBuffTimer = Math.max(0, this.vampireBuffTimer - dt);
    this.titanShieldBuffTimer = Math.max(0, this.titanShieldBuffTimer - dt);
    this.phoenixRegenBuffTimer = Math.max(0, this.phoenixRegenBuffTimer - dt);
    this.potionBuffs.rage = Math.max(0, this.potionBuffs.rage - dt);
    this.potionBuffs.swift = Math.max(0, this.potionBuffs.swift - dt);
    this.potionBuffs.ironSkin = Math.max(0, this.potionBuffs.ironSkin - dt);
    this.potionBuffs.regen = Math.max(0, this.potionBuffs.regen - dt);
    this.playerSlowTimer = Math.max(0, this.playerSlowTimer - dt);
    this.playerPoisonTimer = Math.max(0, this.playerPoisonTimer - dt);
    this.playerBurnTimer = Math.max(0, this.playerBurnTimer - dt);
    this.playerBleedTimer = Math.max(0, this.playerBleedTimer - dt);
    if (
      this.phase === 'playing' &&
      this.gameMode === 'survival' &&
      (this.playerPoisonTimer > 0 || this.playerBurnTimer > 0 || this.playerBleedTimer > 0)
    ) {
      this.playerDotTick += dt;
      if (this.playerDotTick >= 0.85) {
        this.playerDotTick = 0;
        const dotDmg =
          (this.playerBurnTimer > 0 ? 4 : 0) +
          (this.playerPoisonTimer > 0 ? 3 : 0) +
          (this.playerBleedTimer > 0 ? 3 : 0);
        this.hp = Math.max(0, this.hp - dotDmg);
        const dotHex = this.playerBurnTimer > 0 ? 0xf97316 : this.playerPoisonTimer > 0 ? 0x84cc16 : 0xef4444;
        this.spawnBurst(this.px, this.py + 1.0, this.pz, dotHex, 4);
        if (this.hp <= 0) this.triggerPlayerDeath();
      }
    }
    if ((this.potionBuffs.regen > 0 || this.phoenixRegenBuffTimer > 0) && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + 12 * dt);
    } else if (this.gameMode === 'peaceful' && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + 2.2 * dt);
    } else if (this.gameMode === 'creative') {
      this.hp = this.maxHp;
      this.stamina = this.maxStamina;
    }
    if (this.frostAuraBuffTimer > 0) {
      for (let i = 0; i < this.mobs.length; i++) {
        const m = this.mobs[i];
        if (Math.hypot(m.x - this.px, m.z - this.pz) <= 7.5) {
          m.slowTimer = Math.max(m.slowTimer ?? 0, 0.35);
        }
      }
    }
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

    if (isGuarding && this.gameMode !== 'creative') {
      this.stamina = Math.max(0, this.stamina - 7.5 * dt);
      if (this.stamina <= 0.5) {
        this.blocking = false;
      }
    } else if (sprinting && this.gameMode !== 'creative') {
      this.stamina = Math.max(0, this.stamina - 24 * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
    }

    const speedMult =
      (this.upgrades.has('boots_swift') ? 1.22 : 1.0) *
      (this.upgrades.has('cloak_wind') ? 1.18 : 1.0) *
      (this.windBuffTimer > 0 ? 1.4 : 1.0) *
      (this.potionBuffs.swift > 0 ? 1.38 : 1.0) *
      (this.playerSlowTimer > 0 ? 0.58 : 1.0) *
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
    const [cx, cz] = this.resolveCollisions(nextX, nextZ, 0.56, true, this.py);
    this.px = cx;
    this.pz = cz;

    const insideSite = findInsideCabin(this.px, this.pz);
    const insideCaveSite = findInsideCave(this.px, this.pz, this.py);
    const insideSelfHouse = this.builtStructures.some(
      (b) =>
        (b.kind === 'floor' || b.kind === 'roof' || b.kind === 'roof_peak' || b.kind === 'roof_flat') &&
        Math.hypot(this.px - b.x, this.pz - b.z) < 3.2 &&
        b.y > this.py + 0.8 &&
        b.y <= this.py + 5.0,
    );
    this.insideCabin = insideSite !== null || insideSelfHouse;
    this.insideCaveSite = insideCaveSite;
    this.insideCave = insideCaveSite !== null;
    if (insideCaveSite && !this.visitedCaves.has(insideCaveSite.id)) {
      this.visitedCaves.add(insideCaveSite.id);
      this.advanceQuest('explore_caves', 1);
    }
    for (const c of this.cabins) {
      c.roofGroup.visible = insideSite?.id !== c.site.id;
    }

    // Update self-built doors, roofs, fireplaces & lanterns
    for (let i = 0; i < this.builtStructures.length; i++) {
      const b = this.builtStructures[i];
      if (b.kind === 'doorway' && b.visual.doorPivot) {
        const nearDoor =
          Math.hypot(this.px - b.x, this.pz - b.z) < 4.2 && Math.abs(this.py - b.y) < 2.6;
        b.doorOpenAmt = THREE.MathUtils.damp(b.doorOpenAmt, nearDoor ? 1 : 0, 9, dt);
        b.visual.doorPivot.rotation.y = b.doorOpenAmt * Math.PI * 0.48;
        if (nearDoor && !b.doorSoundState) {
          b.doorSoundState = true;
          soundEngine.playDoorCreak(true);
        } else if (!nearDoor && b.doorSoundState && b.doorOpenAmt < 0.15) {
          b.doorSoundState = false;
          soundEngine.playDoorCreak(false);
        }
      } else if (b.kind === 'roof' || b.kind === 'roof_peak') {
        const underRoof =
          Math.hypot(this.px - b.x, this.pz - b.z) < 4.4 &&
          this.py >= b.y - 3.6 &&
          this.py < b.y - 0.1;
        b.visual.group.visible = !underRoof;
      } else if ((b.kind === 'lantern' || b.kind === 'campfire' || b.kind === 'fireplace') && b.visual.flame) {
        b.visual.flame.scale.set(
          1 + Math.sin(elapsed * 13 + i) * 0.14,
          1 + Math.cos(elapsed * 11 + i) * 0.18,
          1 + Math.sin(elapsed * 13 + i) * 0.14,
        );
      }
    }

    const wasGrounded = this.grounded;
    const surfaceY = this.walkableHeightWithBuilds(this.px, this.pz, this.py);
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
      // Prevent jumping straight through an upper-story floor/ceiling slab from underneath
      if (this.pvy > 0) {
        for (let i = 0; i < this.builtStructures.length; i++) {
          const b = this.builtStructures[i];
          if (b.kind !== 'floor' && b.kind !== 'roof_flat') continue;
          if (Math.abs(this.px - b.x) < 2.08 && Math.abs(this.pz - b.z) < 2.08) {
            if (this.py + 1.9 > b.y && this.py < b.y - 0.25) {
              this.py = b.y - 1.9;
              this.pvy = 0;
              break;
            }
          }
        }
      }
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
      this.stepShake = Math.max(this.stepShake, 0.16);
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

    // Warm campfire (starter, village, or player-built) or indoor hearth gently heals the hero
    if ((this.getNearestCampfire(4.5) !== null || this.insideCabin) && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + (this.insideCabin ? 8 : 12) * dt);
    }

    this.stepShake = Math.max(0, this.stepShake - dt * 0.55);
    if (speedHoriz > 0.4) {
      this.walkPhase += dt * (sprinting ? 14 : 10);
      if (this.grounded && !this.inWater && speedHoriz > 0.85) {
        const halfCycle = Math.floor(this.walkPhase / Math.PI);
        if (halfCycle !== this.lastStepHalfCycle) {
          this.lastStepHalfCycle = halfCycle;
          this.stepShake = Math.max(this.stepShake, sprinting ? 0.095 : 0.052);
          if (elapsed - this.lastFootstepTick > 0.14) {
            this.lastFootstepTick = elapsed;
            soundEngine.playFootstep(sprinting);
          }
        }
      }
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
    rig.bodyTilt.rotation.z = THREE.MathUtils.damp(rig.bodyTilt.rotation.z, 0, 12, dt);
    const rebirthBounce = this.respawnAnimTimer > 0 ? Math.sin((this.respawnAnimTimer / 1.45) * Math.PI) * 0.28 : 0;
    rig.bodyTilt.position.y = THREE.MathUtils.damp(rig.bodyTilt.position.y, rebirthBounce, 12, dt);
    rig.contactShadow.visible = !this.inWater && this.py - surfaceY < 2.5;
    rig.contactShadow.position.y = Math.max(0.03, surfaceY - this.py + 0.03);

    if (this.inWater) {
      rig.bodyTilt.rotation.x = THREE.MathUtils.damp(rig.bodyTilt.rotation.x, 0.55, 8, dt);
      rig.torso.rotation.y = THREE.MathUtils.damp(rig.torso.rotation.y, 0, 10, dt);
      rig.torso.scale.y = THREE.MathUtils.damp(rig.torso.scale.y, 1, 10, dt);
      rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(elapsed * 2.1) * 0.08, 8, dt);
      rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, -0.14, 8, dt);
      const paddle = Math.sin(elapsed * 6.5);
      rig.leftArm.rotation.x = -1.2 + paddle * 0.7;
      rig.leftArm.rotation.y = 0;
      rig.leftArm.rotation.z = 0;
      rig.leftLeg.rotation.x = paddle * 0.55;
      rig.rightLeg.rotation.x = -paddle * 0.55;
    } else {
      const lean = !this.grounded
        ? THREE.MathUtils.clamp(-this.pvy * 0.02, -0.18, 0.2)
        : sprinting
          ? 0.16
          : isGuarding
            ? 0.06
            : 0;
      rig.bodyTilt.rotation.x = THREE.MathUtils.damp(rig.bodyTilt.rotation.x, lean, 10, dt);

      // Torso breath & sprinting torso twist
      const targetTorsoScaleY = speedHoriz < 0.4 && this.grounded ? 1 + Math.sin(elapsed * 2.6) * 0.022 : 1;
      rig.torso.scale.y = THREE.MathUtils.damp(rig.torso.scale.y, targetTorsoScaleY, 10, dt);
      const targetTorsoTwist =
        speedHoriz > 0.4 && this.grounded ? Math.sin(this.walkPhase) * (sprinting ? 0.14 : 0.07) : 0;
      rig.torso.rotation.y = THREE.MathUtils.damp(rig.torso.rotation.y, targetTorsoTwist, 12, dt);

      // Expressive head look around when idle vs focused forward when moving
      const targetHeadYaw = speedHoriz < 0.4 && this.grounded ? Math.sin(elapsed * 1.15) * 0.12 : 0;
      const targetHeadPitch =
        !this.grounded
          ? THREE.MathUtils.clamp(-this.pvy * 0.025, -0.16, 0.18)
          : speedHoriz < 0.4
            ? Math.sin(elapsed * 1.8) * 0.04
            : 0;
      rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, targetHeadYaw, 8, dt);
      rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, targetHeadPitch, 8, dt);

      const swing = speedHoriz > 0.4 && this.grounded ? Math.sin(this.walkPhase) * 0.78 : 0;
      const jumpLeg = !this.grounded ? THREE.MathUtils.clamp(this.pvy * 0.055, -0.52, 0.52) : 0;
      rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, this.grounded ? swing : jumpLeg, 16, dt);
      rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, this.grounded ? -swing : -jumpLeg * 0.8, 16, dt);

      if (isGuarding) {
        rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -1.25, 18, dt);
        rig.leftArm.rotation.y = THREE.MathUtils.damp(rig.leftArm.rotation.y, 0.75, 18, dt);
        rig.leftArm.rotation.z = THREE.MathUtils.damp(rig.leftArm.rotation.z, -0.58, 18, dt);
      } else if (!this.grounded) {
        rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -0.55 - jumpLeg * 0.4, 14, dt);
        rig.leftArm.rotation.y = THREE.MathUtils.damp(rig.leftArm.rotation.y, 0, 14, dt);
        rig.leftArm.rotation.z = THREE.MathUtils.damp(rig.leftArm.rotation.z, 0.28, 14, dt);
      } else {
        const idleLeftArm = speedHoriz > 0.4 ? -swing * 0.85 : Math.sin(elapsed * 2.2) * 0.05;
        rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, idleLeftArm, 16, dt);
        rig.leftArm.rotation.y = THREE.MathUtils.damp(rig.leftArm.rotation.y, 0, 14, dt);
        rig.leftArm.rotation.z = THREE.MathUtils.damp(rig.leftArm.rotation.z, 0.04 + Math.sin(elapsed * 2.2) * 0.02, 14, dt);
      }
    }

    const activeWepDef = WEAPONS.find((item) => item.id === this.activeWeapon);
    const isRangedWep = activeWepDef?.kind === 'ranged';
    if (this.attackAnim > 0) {
      if (!isRangedWep) {
        const s = Math.sin((1 - this.attackAnim) * Math.PI);
        rig.rightArm.rotation.x = -1.9 + s * 2.5;
        rig.rightArm.rotation.z =
          this.activeWeapon === 'hammer' ||
          this.activeWeapon === 'frost_hammer' ||
          this.activeWeapon === 'thunder_maul' ||
          this.activeWeapon === 'builder'
            ? 0
            : -0.45 * (1 - s);
      } else {
        rig.rightArm.rotation.x = -1.45 - this.attackAnim * 0.28;
        rig.rightArm.rotation.z = 0;
      }
    } else {
      const idleArm = isRangedWep
        ? -1.25 + Math.sin(elapsed * 2.5) * 0.04
        : this.inWater
          ? -1.2 - Math.sin(elapsed * 6.5) * 0.7
          : !this.grounded
            ? -0.5
            : speedHoriz > 0.4
              ? Math.sin(this.walkPhase) * 0.65
              : Math.sin(elapsed * 2.2 + 1.1) * 0.06;
      rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, idleArm, 15, dt);
      rig.rightArm.rotation.z = THREE.MathUtils.damp(
        rig.rightArm.rotation.z,
        !this.grounded && !this.inWater ? -0.24 : -0.04,
        15,
        dt,
      );
    }

    const aimX = Math.sin(this.playerYaw);
    const aimZ = Math.cos(this.playerYaw);
    if (this.activeWeapon === 'axe') {
      this.nearTreeTarget = this.env.findTreeInFront(this.px, this.pz, aimX, aimZ, 4.1);
      this.nearMineTarget = null;
    } else if (this.activeWeapon === 'pickaxe') {
      this.nearTreeTarget = null;
      this.nearMineTarget = this.findMineableRockInFront(this.px, this.pz, aimX, aimZ, 4.1);
    } else {
      this.nearTreeTarget = null;
      this.nearMineTarget = null;
    }
    this.updateBuildPreview();
  }

  private updateMobs(dt: number, elapsed: number) {
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      const def = MOB_DEFS[m.kind];

      m.attackTimer = Math.max(0, m.attackTimer - dt);
      m.hitFlash = Math.max(0, m.hitFlash - dt);
      m.slowTimer = Math.max(0, (m.slowTimer ?? 0) - dt);
      m.guardTimer = Math.max(0, (m.guardTimer ?? 0) - dt);
      m.chargeTimer = Math.max(0, (m.chargeTimer ?? 0) - dt);
      m.windupTimer = Math.max(0, (m.windupTimer ?? 0) - dt);

      if (m.hitFlash > 0 || m.flashActive) {
        m.flashActive = m.hitFlash > 0;
        const hitFlashes = m.visual.hitFlashMeshes;
        for (let h = 0; h < hitFlashes.length; h++) {
          const mesh = hitFlashes[h];
          if (!mesh.userData._origMat) {
            mesh.userData._origMat = mesh.material;
          }
          mesh.material = m.hitFlash > 0 ? HIT_FLASH_MAT : (mesh.userData._origMat as THREE.Material | THREE.Material[]);
        }
      }

      const dx = this.px - m.x;
      const dz = this.pz - m.z;
      const dSq = dx * dx + dz * dz;
      const visible = dSq < 185 * 185;
      m.visual.root.visible = visible;

      m.aiAccumDt = (m.aiAccumDt ?? 0) + dt;
      if (dSq > 65 * 65 && ((m.id + this.aiTick) & 3) !== 0) {
        continue;
      }
      const stepDt = m.aiAccumDt;
      m.aiAccumDt = 0;

      let moveDirX = 0;
      let moveDirZ = 0;
      let moveSpeed = 0;
      const slowMult = (m.slowTimer ?? 0) > 0 ? 0.55 : 1.0;

      const applyMeleeDamageToPlayer = (dmg: number, kbForce: number) => {
        if (this.hurtCooldown > 0 || this.gameMode !== 'survival') return;
        const armorMult =
          (this.upgrades.has('armor_ranger') ? 0.75 : 1.0) *
          (this.potionBuffs.ironSkin > 0 ? 0.55 : 1.0) *
          (this.titanShieldBuffTimer > 0 ? 0.25 : 1.0);
        const incoming = Math.max(1, Math.round(dmg * armorMult));
        const distNow = Math.max(0.01, Math.hypot(dx, dz));
        if (this.blocking && this.stamina >= 4) {
          const hasAegis = this.upgrades.has('shield_aegis');
          const parry = elapsed - this.blockStartTime <= 0.3;
          if (parry) {
            this.stamina = Math.max(0, this.stamina - 4);
            this.hurtCooldown = 0.42;
            soundEngine.playShieldBlock(true);
            this.spawnBurst(this.px, this.py + 1.35, this.pz, 0xfef08a, 14);
            this.spawnShockwave(this.px, this.py + 0.25, this.pz, 0x38bdf8, 3.0, 0.3);
            this.damageMob(m, i, hasAegis ? 24 : 12, -dx, -dz, distNow, 13.5, 0xfef08a);
            this.pushFeed('Ідеальне парирування щитом!');
          } else {
            const blockedDmg = Math.max(1, Math.round(incoming * (hasAegis ? 0.08 : 0.2)));
            this.hp = Math.max(0, this.hp - blockedDmg);
            this.stamina = Math.max(0, this.stamina - 10);
            this.hurtCooldown = 0.42;
            soundEngine.playShieldBlock(false);
            this.spawnBurst(this.px, this.py + 1.25, this.pz, 0xbae6fd, 9);
            m.vx -= (dx / distNow) * 5;
            m.vz -= (dz / distNow) * 5;
          }
        } else {
          this.hp = Math.max(0, this.hp - incoming);
          this.hurtCooldown = 0.45;
          soundEngine.playPlayerHurt();
          this.cameraShake = Math.max(this.cameraShake, 0.16);
          this.pvx += (dx / distNow) * kbForce;
          this.pvz += (dz / distNow) * kbForce;
        }
        if (this.hp <= 0) {
          this.triggerPlayerDeath();
        }
      };

      if (
        this.phase === 'playing' &&
        this.gameMode === 'survival' &&
        dSq < def.aggroRadius * def.aggroRadius &&
        !this.insideCabin
      ) {
        const dist = Math.max(0.01, Math.sqrt(dSq));
        const dirX = dx / dist;
        const dirZ = dz / dist;
        m.specialTimer = (m.specialTimer ?? (2.2 + (m.id % 5) * 0.4)) - stepDt;

        // Signature unique combat mechanics per mob kind
        if (m.kind === 'final_boss' || m.kind === 'secret_boss') {
          if (m.specialTimer <= 0 && dist < 24) {
            const isSecret = m.kind === 'secret_boss';
            m.specialTimer = isSecret ? 3.5 : 4.3;
            soundEngine.playBossSlam();
            this.spawnShockwave(m.x, m.y + 0.16, m.z, isSecret ? 0x22d3ee : 0xf43f5e, isSecret ? 11.0 : 9.4, 0.52);
            this.spawnShockwave(m.x, m.y + 0.22, m.z, 0xfbbf24, isSecret ? 7.6 : 6.4, 0.36);
            this.spawnBurst(m.x, m.y + 1.2, m.z, isSecret ? 0x22d3ee : 0xf43f5e, 18);
            this.cameraShake = Math.max(this.cameraShake, isSecret ? 0.34 : 0.28);

            if (isSecret && dist > 6.0) {
              const baseYaw = Math.atan2(dx, dz);
              for (const offset of [-0.26, -0.1, 0.1, 0.26]) {
                const bx = Math.sin(baseYaw + offset);
                const bz = Math.cos(baseYaw + offset);
                const by = ((this.py + 1.1) - (m.y + 2.8)) / dist;
                this.spawnMobProjectile(m.x + bx * 1.4, m.y + 2.8, m.z + bz * 1.4, bx, by, bz, 22, Math.round(def.damage * 0.6), 8, 0x22d3ee);
              }
            } else if (!isSecret && m.hp < m.maxHp * 0.55 && dist > 7.5) {
              // Phase 2 dash + flame bolts for Malakor
              m.vx += dirX * 14;
              m.vz += dirZ * 14;
              for (const offset of [-0.18, 0.18]) {
                const baseYaw = Math.atan2(dx, dz) + offset;
                this.spawnMobProjectile(m.x, m.y + 2.5, m.z, Math.sin(baseYaw), 0, Math.cos(baseYaw), 19, Math.round(def.damage * 0.55), 6, 0xf43f5e, 0, 'burn');
              }
            } else if (dist < (isSecret ? 9.0 : 7.8)) {
              applyMeleeDamageToPlayer(Math.round(def.damage * 1.15), 9.5);
            }
          }
        } else if (m.kind === 'slime' && m.specialTimer <= 0 && dist > 2.4 && dist < 11) {
          // Slime acid leap forward + green splash
          m.specialTimer = 3.2;
          m.vx += dirX * 12;
          m.vz += dirZ * 12;
          this.spawnBurst(m.x, m.y + 0.5, m.z, 0x34d399, 8);
        } else if (m.kind === 'goblin' && m.specialTimer <= 0 && dist < 8) {
          // Goblin crafty flank & lunge
          m.specialTimer = 2.9;
          const side = m.id % 2 === 0 ? 1 : -1;
          m.vx += (dirX * 9.5 - dirZ * 6.5 * side);
          m.vz += (dirZ * 9.5 + dirX * 6.5 * side);
        } else if (m.kind === 'wolf' && m.specialTimer <= 0 && dist > 2.5 && dist < 12) {
          // Shadow wolf high-speed pack pounce
          m.specialTimer = m.hp < m.maxHp * 0.5 ? 2.4 : 3.4;
          m.vx += dirX * 15;
          m.vz += dirZ * 15;
          this.spawnBurst(m.x, m.y + 0.6, m.z, 0x94a3b8, 6);
        } else if (m.kind === 'skeleton' && m.specialTimer <= 0) {
          // Skeleton raises bone shield guard OR throws spinning rib bone at range
          m.specialTimer = 3.6;
          if (dist > 4.2 && dist < 13) {
            const by = ((this.py + 1.1) - (m.y + 1.4)) / dist;
            this.spawnMobProjectile(m.x + dirX * 0.8, m.y + 1.4, m.z + dirZ * 0.8, dirX, by, dirZ, 17, Math.round(def.damage * 0.78), 5, 0xe5e0d0);
          } else {
            m.guardTimer = 1.8;
            this.spawnBurst(m.x, m.y + 1.2, m.z, 0xf8fafc, 7);
          }
        } else if (m.kind === 'golem' && m.specialTimer <= 0 && dist < 6.2) {
          // Stone Golem seismic ground smash
          m.specialTimer = 4.2;
          this.spawnShockwave(m.x, m.y + 0.14, m.z, 0xf59e0b, 5.2, 0.42);
          this.spawnStoneDebris(m.x, m.y + 0.3, m.z, 8);
          this.cameraShake = Math.max(this.cameraShake, 0.2);
          if (dist < 4.6) applyMeleeDamageToPlayer(Math.round(def.damage * 1.1), 9.0);
        } else if (m.kind === 'boss' && m.specialTimer <= 0 && dist < 14) {
          // Shadow Knight dark cleave dash + shockwave
          m.specialTimer = 3.8;
          m.vx += dirX * 15;
          m.vz += dirZ * 15;
          this.spawnShockwave(m.x, m.y + 0.16, m.z, 0xc084fc, 5.8, 0.42);
          if (dist < 4.8) applyMeleeDamageToPlayer(Math.round(def.damage * 1.15), 8.5);
        } else if (m.kind === 'mushroom_imp' && m.specialTimer <= 0 && dist < 5.5) {
          // Mushroom Imp toxic spore cloud eruption
          m.specialTimer = 3.5;
          this.spawnShockwave(m.x, m.y + 0.25, m.z, 0x84cc16, 4.4, 0.48);
          this.spawnBurst(m.x, m.y + 1.0, m.z, 0xa3e635, 12);
          if (dist < 4.1 && this.gameMode === 'survival') {
            this.playerPoisonTimer = Math.max(this.playerPoisonTimer, 2.8);
            this.playerSlowTimer = Math.max(this.playerSlowTimer, 1.4);
          }
        } else if (m.kind === 'dire_boar') {
          // Dire Boar telegraphed gore charge
          if (m.specialTimer <= 0 && dist > 3.5 && dist < 13 && (m.chargeTimer ?? 0) <= 0) {
            m.specialTimer = 4.2;
            m.chargeDirX = dirX;
            m.chargeDirZ = dirZ;
            m.chargeTimer = 0.85;
            this.spawnBurst(m.x, m.y + 0.5, m.z, 0xfbbf24, 9);
          }
        } else if (m.kind === 'giant_spider' && m.specialTimer <= 0 && dist > 3.2 && dist < 13) {
          // Giant Spider silk web slow shot
          m.specialTimer = 3.4;
          const by = ((this.py + 0.9) - (m.y + 0.7)) / dist;
          this.spawnMobProjectile(m.x + dirX * 0.9, m.y + 0.7, m.z + dirZ * 0.9, dirX, by, dirZ, 19, Math.round(def.damage * 0.65), 3, 0xf8fafc, 0, 'slow');
        } else if (m.kind === 'forest_ent') {
          // Forest Ent bark regeneration + root snare eruption
          if (m.hitFlash <= 0 && m.hp < m.maxHp) {
            m.hp = Math.min(m.maxHp, m.hp + 3.5 * stepDt);
          }
          if (m.specialTimer <= 0 && dist < 11) {
            m.specialTimer = 4.6;
            const gx = this.px;
            const gz = this.pz;
            const gy = this.walkableHeightWithBuilds(gx, gz);
            this.spawnShockwave(gx, gy + 0.14, gz, 0x22c55e, 3.4, 0.5);
            this.spawnBurst(gx, gy + 0.6, gz, 0x4ade80, 10);
            if (dist < 9.5) this.playerSlowTimer = Math.max(this.playerSlowTimer, 2.2);
          }
        } else if (m.kind === 'bandit_raider' && m.specialTimer <= 0 && dist > 4.2 && dist < 13.5) {
          // Bandit Raider throwing knife at mid range
          m.specialTimer = 3.3;
          const by = ((this.py + 1.1) - (m.y + 1.4)) / dist;
          this.spawnMobProjectile(m.x + dirX * 0.8, m.y + 1.4, m.z + dirZ * 0.8, dirX, by, dirZ, 21, Math.round(def.damage * 0.72), 4.5, 0x94a3b8);
        } else if (m.kind === 'swamp_witch' && m.specialTimer <= 0 && dist < 5.0) {
          // Swamp Witch arcane blink away when approached closely
          m.specialTimer = 4.2;
          const blinkAng = Math.atan2(-dirZ, dirX) + (Math.random() - 0.5) * 1.4;
          const [bx, bz] = this.resolveCollisions(m.x - dirX * 6 + Math.cos(blinkAng) * 4, m.z - dirZ * 6 + Math.sin(blinkAng) * 4, def.radius, false, m.y);
          this.spawnBurst(m.x, m.y + 1.2, m.z, 0xa855f7, 12);
          m.x = bx;
          m.z = bz;
          m.y = this.walkableHeightWithBuilds(bx, bz, m.y);
          this.spawnBurst(m.x, m.y + 1.2, m.z, 0x84cc16, 12);
        } else if (m.kind === 'sand_mummy' && m.specialTimer <= 0 && dist < 5.5) {
          // Sand Mummy curse aura wave draining stamina & slowing
          m.specialTimer = 4.0;
          this.spawnShockwave(m.x, m.y + 0.2, m.z, 0xd97706, 4.6, 0.45);
          if (dist < 4.5 && this.gameMode === 'survival') {
            this.stamina = Math.max(0, this.stamina - 22);
            this.playerSlowTimer = Math.max(this.playerSlowTimer, 1.8);
          }
        } else if (m.kind === 'dune_stalker' && m.specialTimer <= 0 && dist > 3.0 && dist < 13) {
          // Dune Stalker mirage flank dash
          m.specialTimer = 3.1;
          const side = m.id % 2 === 0 ? 1 : -1;
          m.vx += dirX * 14 - dirZ * 8 * side;
          m.vz += dirZ * 14 + dirX * 8 * side;
          this.spawnBurst(m.x, m.y + 1.0, m.z, 0xfde047, 8);
        } else if (m.kind === 'sand_colossus' && m.specialTimer <= 0 && dist < 11) {
          // Sand Colossus quicksand pull vortex
          m.specialTimer = 4.4;
          this.spawnShockwave(m.x, m.y + 0.16, m.z, 0xf59e0b, 8.5, 0.55);
          if (dist < 9.5) {
            this.pvx -= dirX * 9.5;
            this.pvz -= dirZ * 9.5;
            this.playerSlowTimer = Math.max(this.playerSlowTimer, 1.5);
          }
        } else if (m.kind === 'frost_yeti' && m.specialTimer <= 0) {
          // Frost Yeti throws glacial ice boulder at range or icy slam up close
          m.specialTimer = 3.8;
          if (dist > 4.2 && dist < 15) {
            const by = ((this.py + 1.0) - (m.y + 1.9)) / dist + 0.14;
            this.spawnMobProjectile(m.x + dirX * 1.1, m.y + 1.9, m.z + dirZ * 1.1, dirX, by, dirZ, 18, Math.round(def.damage * 0.85), 8, 0xbae6fd, 7.5, 'slow');
          } else if (dist <= 4.2) {
            this.spawnShockwave(m.x, m.y + 0.16, m.z, 0x7dd3fc, 4.6, 0.4);
            this.playerSlowTimer = Math.max(this.playerSlowTimer, 2.2);
          }
        } else if (m.kind === 'crystal_golem' && m.specialTimer <= 0) {
          // Crystal Golem prismatic shield + radial crystal shard burst
          m.specialTimer = 4.5;
          m.guardTimer = 2.2;
          this.spawnShockwave(m.x, m.y + 0.2, m.z, 0x22d3ee, 5.2, 0.42);
          for (let s = 0; s < 4; s++) {
            const ang = (s / 4) * Math.PI * 2 + m.yaw;
            this.spawnMobProjectile(m.x, m.y + 1.6, m.z, Math.sin(ang), 0, Math.cos(ang), 16, Math.round(def.damage * 0.6), 5, 0x22d3ee);
          }
        } else if (m.kind === 'cursed_knight' && m.specialTimer <= 0 && dist < 7.0) {
          // Cursed Knight dark ground cleave + violet shockwave
          m.specialTimer = 3.6;
          this.spawnShockwave(m.x, m.y + 0.16, m.z, 0xa855f7, 5.4, 0.42);
          if (dist < 4.5) applyMeleeDamageToPlayer(Math.round(def.damage * 1.05), 8.0);
        }

        if (m.kind === 'dire_boar' && (m.chargeTimer ?? 0) > 0) {
          moveDirX = m.chargeDirX ?? dirX;
          moveDirZ = m.chargeDirZ ?? dirZ;
          moveSpeed = def.speed * 2.1 * slowMult;
          if (dist < def.attackRange + 0.5 && m.attackTimer <= 0) {
            m.attackTimer = def.attackCooldown;
            m.chargeTimer = 0;
            applyMeleeDamageToPlayer(Math.round(def.damage * 1.25), 11);
          }
        } else if (def.behavior === 'ranged') {
          if (dist > def.attackRange * 0.85) {
            moveDirX = dirX;
            moveDirZ = dirZ;
            moveSpeed = def.speed * slowMult;
          } else if (dist < 4.5) {
            moveDirX = -dirX;
            moveDirZ = -dirZ;
            moveSpeed = def.speed * 0.65 * slowMult;
          }
          // Void Bat swoops laterally in figure-eight
          if (m.kind === 'void_bat') {
            const swoop = Math.sin(elapsed * 3.8 + m.id) * 0.7;
            moveDirX += -dirZ * swoop;
            moveDirZ += dirX * swoop;
          }
          if (dist <= def.attackRange && m.attackTimer <= 0) {
            m.attackTimer = def.attackCooldown;
            const by = ((this.py + 1.15) - (m.y + def.height * 0.65)) / dist;
            if (m.kind === 'ice_wraith') {
              // Ice Wraith 3-bolt frost fan
              const baseYaw = Math.atan2(dx, dz);
              for (const off of [-0.18, 0, 0.18]) {
                this.spawnMobProjectile(m.x, m.y + def.height * 0.65, m.z, Math.sin(baseYaw + off), by, Math.cos(baseYaw + off), 18, Math.round(def.damage * 0.72), 4.5, 0x38bdf8, 0, 'slow');
              }
            } else if (m.kind === 'lava_imp') {
              // Lava Imp lobbed parabolic fireball bomb
              this.spawnMobProjectile(m.x + dirX * 0.9, m.y + def.height * 0.65, m.z + dirZ * 0.9, dirX, by + 0.25, dirZ, 17, def.damage, 6.0, 0xf97316, 9.5, 'explode_fire');
            } else if (m.kind === 'swamp_witch') {
              this.spawnMobProjectile(m.x + dirX * 0.9, m.y + def.height * 0.65, m.z + dirZ * 0.9, dirX, by, dirZ, 18, def.damage, 5.5, 0x84cc16, 0, 'poison');
            } else {
              this.spawnMobProjectile(
                m.x + dirX * 0.9,
                m.y + def.height * 0.65,
                m.z + dirZ * 0.9,
                dirX,
                by,
                dirZ,
                19,
                def.damage,
                5.5,
                def.projectileColor ?? 0x38bdf8,
              );
            }
          }
        } else if (dist > def.attackRange * 0.85) {
          moveDirX = dirX;
          moveDirZ = dirZ;
          const chargerMult = def.behavior === 'charger' && dist > 4.0 && dist < 12.5 ? 1.48 : 1.0;
          moveSpeed = def.speed * chargerMult * slowMult;
          if (m.kind === 'magma_hound' && Math.random() < 0.25) {
            this.spawnBurst(m.x, m.y + 0.25, m.z, 0xf97316, 1);
          }
        } else if (m.attackTimer <= 0 && this.hurtCooldown <= 0) {
          m.attackTimer = def.attackCooldown;
          applyMeleeDamageToPlayer(def.damage, 6.0);
          // On-hit status riders for specific melee monsters
          if (this.gameMode === 'survival') {
            if (m.kind === 'desert_scorpion') this.playerPoisonTimer = Math.max(this.playerPoisonTimer, 3.2);
            else if (m.kind === 'magma_hound') this.playerBurnTimer = Math.max(this.playerBurnTimer, 3.0);
            else if (m.kind === 'wolf') this.playerBleedTimer = Math.max(this.playerBleedTimer, 2.8);
            else if (m.kind === 'giant_spider') this.playerSlowTimer = Math.max(this.playerSlowTimer, 2.0);
            else if (m.kind === 'cursed_knight') {
              m.hp = Math.min(m.maxHp, m.hp + Math.round(def.damage * 0.25));
              this.spawnBurst(m.x, m.y + 1.4, m.z, 0xc084fc, 6);
            }
          }
        }
        m.yaw = Math.atan2(dx, dz);
      } else {
        m.wanderTimer -= stepDt;
        if (m.wanderTimer <= 0) {
          m.wanderTimer = 2.5 + Math.random() * 3.5;
          m.wanderAngle += (Math.random() - 0.5) * 2.4;
        }
        moveDirX = Math.sin(m.wanderAngle);
        moveDirZ = Math.cos(m.wanderAngle);
        moveSpeed = def.speed * 0.35 * slowMult;
        m.yaw = m.wanderAngle;
      }

      m.vx = THREE.MathUtils.damp(m.vx, moveDirX * moveSpeed, 8, stepDt);
      m.vz = THREE.MathUtils.damp(m.vz, moveDirZ * moveSpeed, 8, stepDt);

      const [nx, nz] = this.resolveCollisions(m.x + m.vx * stepDt, m.z + m.vz * stepDt, def.radius, false, m.y);
      m.x = nx;
      m.z = nz;
      m.y = this.walkableHeightWithBuilds(m.x, m.z, m.y);

      m.visual.root.position.set(m.x, m.y, m.z);
      m.visual.root.rotation.y = m.yaw;

      if (!visible) continue;

      if (m.visual.hpBarBg.visible && dSq < 85 * 85) {
        m.visual.hpBarBg.lookAt(this.camera.position);
      }

      const spd = Math.hypot(m.vx, m.vz);
      m.walkPhase += stepDt * (spd * 2.2 + 2.0);
      const isSwinging = m.attackTimer > def.attackCooldown - 0.25;
      const swingAmt = isSwinging ? Math.sin(((def.attackCooldown - m.attackTimer) / 0.25) * Math.PI) : 0;

      if (m.kind === 'slime') {
        const bounce = Math.abs(Math.sin(elapsed * 4.5 + m.id));
        m.visual.body.position.y = bounce * 0.42;
        m.visual.body.scale.set(1 + (1 - bounce) * 0.14, 0.85 + bounce * 0.22, 1 + (1 - bounce) * 0.14);
      } else if (m.kind === 'void_bat' || m.kind === 'ice_wraith' || m.kind === 'lava_imp') {
        const hover = Math.sin(elapsed * 3.6 + m.id) * 0.22;
        m.visual.body.position.y = hover;
        const flap = Math.sin(elapsed * (m.kind === 'void_bat' ? 14 : 7.5) + m.id) * (m.kind === 'void_bat' ? 0.62 : 0.32);
        if (m.visual.wingL) m.visual.wingL.rotation.z = flap;
        if (m.visual.wingR) m.visual.wingR.rotation.z = -flap;
        if (m.visual.tail) m.visual.tail.rotation.x = Math.sin(elapsed * 4.5 + m.id) * 0.28;
        if (m.visual.head) m.visual.head.rotation.x = 0.08 + Math.sin(elapsed * 2.2 + m.id) * 0.08 - swingAmt * 0.25;
        if (m.kind === 'ice_wraith' || m.kind === 'lava_imp') {
          const flyerCast = m.attackTimer < 0.55 ? -0.75 * (1 - m.attackTimer / 0.55) : Math.sin(elapsed * 2.4 + m.id) * 0.1;
          if (m.visual.leftArm) m.visual.leftArm.rotation.x = flyerCast * 0.65;
          if (m.visual.rightArm) m.visual.rightArm.rotation.x = flyerCast;
        }
      } else if (
        m.kind === 'wolf' ||
        m.kind === 'dire_boar' ||
        m.kind === 'giant_spider' ||
        m.kind === 'desert_scorpion' ||
        m.kind === 'magma_hound'
      ) {
        const legSwing = Math.sin(m.walkPhase * 1.2) * Math.min(0.75, spd * 0.15);
        if (m.visual.legFL) m.visual.legFL.rotation.x = legSwing;
        if (m.visual.legBR) m.visual.legBR.rotation.x = legSwing;
        if (m.visual.legFR) m.visual.legFR.rotation.x = -legSwing;
        if (m.visual.legBL) m.visual.legBL.rotation.x = -legSwing;
        if (m.visual.extraLimbs) {
          for (let li = 0; li < m.visual.extraLimbs.length; li++) {
            const limb = m.visual.extraLimbs[li];
            const phase = m.walkPhase * 1.35 + li * 1.3;
            limb.rotation.x = Math.sin(phase) * (spd > 0.25 ? 0.42 : 0.08);
            limb.rotation.z = (li % 2 === 0 ? 1 : -1) * Math.cos(phase) * 0.12;
          }
        }
        if (m.visual.tail) {
          m.visual.tail.rotation.y = Math.sin(elapsed * 4.2 + m.id) * 0.35;
          if (m.kind === 'desert_scorpion') {
            m.visual.tail.rotation.x = swingAmt * 0.85 + Math.sin(elapsed * 2.8 + m.id) * 0.12;
          }
        }
        if (m.visual.jaw) {
          m.visual.jaw.rotation.x = 0.12 + swingAmt * 0.48 + Math.abs(Math.sin(elapsed * 3.1 + m.id)) * 0.12;
        }
        if (m.visual.head) {
          m.visual.head.rotation.x = swingAmt * -0.22 + Math.sin(elapsed * 2.4 + m.id) * 0.06;
        }
      } else {
        const sw = Math.sin(m.walkPhase) * Math.min(0.75, spd * 0.16);
        const idleArm = Math.sin(elapsed * 2.3 + m.id) * 0.08;
        const isCaster = m.kind === 'swamp_witch' || m.kind === 'skeleton';
        const castLift = isCaster && m.attackTimer < 0.55 ? -0.75 * (1 - m.attackTimer / 0.55) : 0;
        if (m.visual.leftLeg) m.visual.leftLeg.rotation.x = sw;
        if (m.visual.rightLeg) m.visual.rightLeg.rotation.x = -sw;
        if (m.visual.leftArm) {
          m.visual.leftArm.rotation.x = (spd > 0.2 ? -sw * 0.8 : idleArm) - swingAmt * 0.45 + castLift * 0.4;
        }
        if (m.visual.rightArm) {
          const swingBoost = isSwinging ? -1.45 * Math.max(0.4, swingAmt) : 0;
          m.visual.rightArm.rotation.x = (spd > 0.2 ? sw * 0.8 : -idleArm) + swingBoost + castLift;
        }
        if (m.visual.head) {
          m.visual.head.rotation.y = Math.sin(elapsed * 1.6 + m.id) * 0.18;
          m.visual.head.rotation.x = swingAmt * 0.16 + Math.sin(elapsed * 2.2 + m.id) * 0.05;
        }
        if (m.visual.wingL) {
          const wFlap = Math.sin(elapsed * 3.1 + m.id) * 0.24;
          m.visual.wingL.rotation.z = wFlap;
        }
        if (m.visual.wingR) {
          const wFlap = Math.sin(elapsed * 3.1 + m.id) * 0.24;
          m.visual.wingR.rotation.z = -wFlap;
        }
        if (m.visual.tail) {
          m.visual.tail.rotation.y = Math.sin(elapsed * 2.8 + m.id) * 0.28;
        }
      }

      if (m.visual.aura) {
        m.visual.aura.rotation.y += stepDt * 1.85;
        m.visual.aura.position.y += Math.sin(elapsed * 3.0 + m.id) * 0.0025;
      }
      if (m.kind !== 'slime' && m.kind !== 'void_bat' && m.kind !== 'ice_wraith' && m.kind !== 'lava_imp') {
        m.visual.body.scale.y = 1 + Math.sin(elapsed * 2.9 + m.id) * 0.025;
        m.visual.body.rotation.x = spd > 1.5 ? 0.08 : 0;
      }
    }
  }

  private spawnBiomeMobNearPlayer() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 42 + Math.random() * 52;
    const tx = this.px + Math.sin(angle) * dist;
    const tz = this.pz + Math.cos(angle) * dist;
    if (Math.hypot(tx - VILLAGE_SITE.x, tz - VILLAGE_SITE.z) < 55) return;
    if (
      findInsideCabin(tx, tz) !== null ||
      findInsideCave(tx, tz) !== null ||
      findInsideDungeon(tx, tz) !== null
    ) {
      return;
    }
    const y = groundHeightAt(tx, tz);
    if (y < WATER_LEVEL + 0.3) return;
    const biome: BiomeId = biomeAt(tx, tz);
    let pool: MobKind[];
    if (biome === 'desert') pool = ['desert_scorpion', 'sand_mummy', 'dune_stalker', 'sand_colossus'];
    else if (biome === 'snow_peaks') pool = ['frost_yeti', 'ice_wraith', 'crystal_golem', 'wolf'];
    else if (biome === 'mystic_swamp') pool = ['swamp_witch', 'mushroom_imp', 'slime', 'giant_spider'];
    else if (biome === 'autumn_woods') pool = ['dire_boar', 'bandit_raider', 'goblin', 'wolf', 'forest_ent'];
    else if (biome === 'bamboo_grove') pool = ['bandit_raider', 'forest_ent', 'dire_boar', 'giant_spider'];
    else if (biome === 'crystal_canyon') pool = ['crystal_golem', 'void_bat', 'golem', 'ice_wraith'];
    else if (biome === 'ancient_highlands') pool = ['cursed_knight', 'golem', 'dune_stalker', 'skeleton'];
    else if (biome === 'ashlands') pool = ['magma_hound', 'lava_imp', 'cursed_knight', 'void_bat'];
    else if (biome === 'pine_forest') pool = ['wolf', 'dire_boar', 'giant_spider', 'frost_yeti'];
    else if (biome === 'golden_steppe') pool = ['dune_stalker', 'bandit_raider', 'dire_boar', 'goblin'];
    else if (biome === 'blossom_grove') pool = ['mushroom_imp', 'forest_ent', 'slime', 'goblin'];
    else if (biome === 'mountain') pool = ['golem', 'frost_yeti', 'void_bat', 'skeleton'];
    else pool = ['slime', 'goblin', 'wolf', 'mushroom_imp', 'bandit_raider'];
    const kind = pool[Math.floor(Math.random() * pool.length)];
    this.spawnMobAt(kind, tx, tz);
  }

  private updatePeacefulMobs(dt: number, elapsed: number) {
    for (let i = this.peacefulRespawns.length - 1; i >= 0; i--) {
      const rq = this.peacefulRespawns[i];
      rq.timer -= dt;
      if (rq.timer <= 0) {
        this.spawnHuntableAnimal(rq.kind, rq.homeX, rq.homeZ);
        this.peacefulRespawns.splice(i, 1);
      }
    }

    for (let i = 0; i < this.peacefulMobs.length; i++) {
      const pm = this.peacefulMobs[i];
      const dx = pm.x - this.px;
      const dz = pm.z - this.pz;
      const dSq = dx * dx + dz * dz;
      const visible = dSq < 185 * 185;
      pm.visual.root.visible = visible;

      pm.hitFlash = Math.max(0, pm.hitFlash - dt);
      if ((pm.hitFlash > 0 || pm.flashActive) && pm.visual.hitFlashMeshes && pm.visual.hitFlashMeshes.length > 0) {
        pm.flashActive = pm.hitFlash > 0;
        const flashes = pm.visual.hitFlashMeshes;
        for (let h = 0; h < flashes.length; h++) {
          const mesh = flashes[h];
          const raw = mesh.material;
          if (Array.isArray(raw)) {
            for (let k = 0; k < raw.length; k++) {
              const mat = raw[k] as THREE.MeshStandardMaterial;
              if (!mat.emissive) continue;
              if (pm.hitFlash > 0) {
                mat.emissive.setHex(0xffffff);
                mat.emissiveIntensity = 0.65;
              } else {
                mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
              }
            }
          } else {
            const mat = raw as THREE.MeshStandardMaterial;
            if (mat.emissive) {
              if (pm.hitFlash > 0) {
                mat.emissive.setHex(0xffffff);
                mat.emissiveIntensity = 0.65;
              } else {
                mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
              }
            }
          }
        }
      }
      if (visible && pm.visual.hpBarBg && pm.visual.hpBarBg.visible && dSq < 85 * 85) {
        pm.visual.hpBarBg.lookAt(this.camera.position);
      }

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
        if (!visible) continue;
        if (dSq < 7.5 * 7.5) {
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
        pm.visual.body.scale.y = 1 + Math.sin(elapsed * 2.2 + pm.id) * 0.018;
        if (pm.visual.head) {
          pm.visual.head.rotation.y = Math.sin(elapsed * 1.2 + pm.id) * 0.14;
          pm.visual.head.rotation.x = dSq < 6.5 * 6.5 ? Math.sin(elapsed * 2.4) * 0.06 : 0;
        }
        if (pm.visual.leftArm) {
          pm.visual.leftArm.rotation.x = Math.sin(elapsed * 2.0 + pm.id) * 0.1;
        }
        if (pm.visual.rightArm) {
          const wave = dSq < 6.5 * 6.5 ? -0.35 + Math.sin(elapsed * 4.2 + pm.id) * 0.18 : -Math.sin(elapsed * 2.0 + pm.id) * 0.1;
          pm.visual.rightArm.rotation.x = THREE.MathUtils.damp(pm.visual.rightArm.rotation.x, wave, 8, dt);
        }
        continue;
      }

      pm.aiAccumDt = (pm.aiAccumDt ?? 0) + dt;
      if (dSq > 65 * 65 && ((pm.id + this.aiTick) & 3) !== 0) {
        continue;
      }
      const stepDt = pm.aiAccumDt;
      pm.aiAccumDt = 0;

      pm.fleeTimer = Math.max(0, pm.fleeTimer - stepDt);
      let moveDirX = 0;
      let moveDirZ = 0;
      let speed = 0;

      if (pm.kind === 'deer' && dSq < 6.5 * 6.5) {
        pm.fleeTimer = 2.0;
        pm.wanderAngle = Math.atan2(dx, dz);
      }

      if (pm.fleeTimer > 0) {
        moveDirX = Math.sin(pm.wanderAngle);
        moveDirZ = Math.cos(pm.wanderAngle);
        speed = 6.4;
        pm.yaw = pm.wanderAngle;
      } else {
        pm.wanderTimer -= stepDt;
        if (pm.wanderTimer <= 0) {
          pm.wanderTimer = 2.8 + Math.random() * 4.0;
          const homeDx = pm.x - pm.homeX;
          const homeDz = pm.z - pm.homeZ;
          if (homeDx * homeDx + homeDz * homeDz > 16 * 16) {
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

      pm.vx = THREE.MathUtils.damp(pm.vx, moveDirX * speed, 7, stepDt);
      pm.vz = THREE.MathUtils.damp(pm.vz, moveDirZ * speed, 7, stepDt);

      const [nx, nz] = this.resolveCollisions(pm.x + pm.vx * stepDt, pm.z + pm.vz * stepDt, 0.7, false, pm.y);
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

      if (!visible) continue;

      const spd = Math.hypot(pm.vx, pm.vz);
      pm.walkPhase += stepDt * (spd * 2.6 + 1.2);
      const legSwing = spd > 0.2 ? Math.sin(pm.walkPhase) * Math.min(0.6, spd * 0.16) : 0;
      if (pm.visual.legFL) pm.visual.legFL.rotation.x = legSwing;
      if (pm.visual.legBR) pm.visual.legBR.rotation.x = legSwing;
      if (pm.visual.legFR) pm.visual.legFR.rotation.x = -legSwing;
      if (pm.visual.legBL) pm.visual.legBL.rotation.x = -legSwing;

      pm.visual.body.scale.y = 1 + Math.sin(elapsed * 2.6 + pm.id) * 0.02;
      if (pm.visual.tail) {
        const wagFreq = pm.fleeTimer > 0 ? 11 : 4.2;
        pm.visual.tail.rotation.y = Math.sin(elapsed * wagFreq + pm.id) * 0.34;
        pm.visual.tail.rotation.x = 0.22 + Math.cos(elapsed * 3.1 + pm.id) * 0.1;
      }

      if (pm.visual.head) {
        const targetHeadPitch = spd < 0.2 ? 0.32 + Math.sin(elapsed * 2.2 + pm.id) * 0.12 : 0;
        pm.visual.head.rotation.x = THREE.MathUtils.damp(pm.visual.head.rotation.x, targetHeadPitch, 8, stepDt);
        pm.visual.head.rotation.y = Math.sin(elapsed * 1.4 + pm.id) * 0.12;
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
        if (p.fromMob) {
          const distPXZ = Math.hypot(this.px - p.x, this.pz - p.z);
          if (distPXZ <= 1.05 && p.y >= this.py && p.y <= this.py + 2.15) {
            hitMob = true;
            if (this.phase === 'playing' && this.gameMode === 'survival' && this.hurtCooldown <= 0) {
              const armorMult =
                (this.upgrades.has('armor_ranger') ? 0.75 : 1.0) *
                (this.potionBuffs.ironSkin > 0 ? 0.55 : 1.0) *
                (this.titanShieldBuffTimer > 0 ? 0.25 : 1.0);
              const incoming = Math.max(1, Math.round(p.damage * armorMult));
              if (this.blocking && this.stamina >= 4) {
                const hasAegis = this.upgrades.has('shield_aegis');
                this.hp = Math.max(0, this.hp - Math.round(incoming * (hasAegis ? 0.12 : 0.25)));
                this.stamina = Math.max(0, this.stamina - 8);
                this.hurtCooldown = 0.4;
                soundEngine.playShieldBlock(false);
                this.spawnBurst(this.px, this.py + 1.2, this.pz, 0xbae6fd, 8);
              } else {
                this.hp = Math.max(0, this.hp - incoming);
                this.hurtCooldown = 0.42;
                soundEngine.playPlayerHurt();
                this.cameraShake = Math.max(this.cameraShake, 0.16);
                const hLen = Math.max(0.01, Math.hypot(p.vx, p.vz));
                this.pvx += (p.vx / hLen) * 5;
                this.pvz += (p.vz / hLen) * 5;
                if (p.statusEffect === 'slow') this.playerSlowTimer = Math.max(this.playerSlowTimer, 2.2);
                else if (p.statusEffect === 'poison') this.playerPoisonTimer = Math.max(this.playerPoisonTimer, 3.0);
                else if (p.statusEffect === 'burn') this.playerBurnTimer = Math.max(this.playerBurnTimer, 2.8);
              }
              if (this.hp <= 0) this.triggerPlayerDeath();
            }
          }
        } else {
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
          if (!hitMob) {
            for (let aIdx = this.peacefulMobs.length - 1; aIdx >= 0; aIdx--) {
              const pm = this.peacefulMobs[aIdx];
              if (pm.kind !== 'sheep' && pm.kind !== 'deer') continue;
              const distXZ = Math.hypot(pm.x - p.x, pm.z - p.z);
              if (distXZ <= 0.9 && p.y >= pm.y && p.y <= pm.y + 1.55) {
                hitMob = true;
                soundEngine.playHit(false);
                this.damagePeacefulAnimal(pm, aIdx, p.damage, p.vx, p.vz, Math.hypot(p.vx, p.vz), p.knockback, p.color);
                break;
              }
            }
          }
        }
      }

      if (hitGround || hitMob) {
        if (hitGround) {
          this.spawnBurst(p.x, p.y + 0.08, p.z, p.color, 4);
          if (p.fromMob && p.statusEffect === 'explode_fire') {
            this.spawnShockwave(p.x, p.y + 0.1, p.z, 0xf97316, 3.6, 0.35);
            this.spawnBurst(p.x, p.y + 0.3, p.z, 0xf97316, 10);
            if (this.gameMode === 'survival' && Math.hypot(this.px - p.x, this.pz - p.z) < 3.2 && this.hurtCooldown <= 0) {
              this.hp = Math.max(0, this.hp - Math.round(p.damage * 0.6));
              this.playerBurnTimer = Math.max(this.playerBurnTimer, 2.5);
              this.hurtCooldown = 0.4;
              if (this.hp <= 0) this.triggerPlayerDeath();
            }
          }
        }
        this.scene.remove(p.mesh);
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
        const floorY = this.walkableHeightWithBuilds(pt.mesh.position.x, pt.mesh.position.z, pt.mesh.position.y) + 0.12;
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
        if (pt.pooledSpark && this.sparkMeshPool.length < 240) {
          this.sparkMeshPool.push(pt.mesh as THREE.Mesh);
        } else if (pt.disposeOwnMaterial) {
          const mat = (pt.mesh as THREE.Mesh).material;
          if (mat && !Array.isArray(mat)) mat.dispose();
        }
        this.particles.splice(i, 1);
      }
    }
  }

  private updateEffects(dt: number) {
    for (let i = this.fallingTrees.length - 1; i >= 0; i--) {
      const ft = this.fallingTrees[i];
      ft.timer += dt;
      const t = Math.min(1, ft.timer / ft.duration);
      let ease: number;
      if (t < 0.72) {
        const p = t / 0.72;
        ease = p * p * p * 0.4 + p * p * 0.6;
      } else {
        const b = (t - 0.72) / 0.28;
        ease = 1.0 - Math.sin(b * Math.PI) * 0.065 * (1 - b);
      }
      const ang = ease * (Math.PI * 0.49);
      ft.group.rotation.set(ft.fallAxisX * ang, 0, ft.fallAxisZ * ang);

      if (!ft.impacted && t >= 0.72) {
        ft.impacted = true;
        soundEngine.playTreeImpact();
        const fx = ft.x - ft.fallAxisZ * 2.8 * ft.scale;
        const fz = ft.z + ft.fallAxisX * 2.8 * ft.scale;
        const leafHex =
          ft.species === 'pine'
            ? 0x166534
            : ft.species === 'blossom'
              ? 0xf472b6
              : ft.species === 'autumn'
                ? 0xd97706
                : 0x4ade80;
        this.spawnShockwave(fx, ft.y + 0.14, fz, 0xd6d3d1, 3.6 * ft.scale, 0.45);
        this.spawnBurst(fx, ft.y + 0.45, fz, leafHex, 16);
        this.spawnWoodChips(fx, ft.y + 0.35, fz, 8);
        this.cameraShake = Math.max(this.cameraShake, 0.3);
      }

      if (t > 0.78) {
        const sink = (t - 0.78) / 0.22;
        ft.group.position.y = ft.y + 0.5 * ft.scale - sink * 1.45 * ft.scale;
      }
      if (ft.timer >= ft.duration) {
        this.scene.remove(ft.group);
        ft.group.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.userData?.sharedAsset) return;
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mt) => mt.dispose());
          }
        });
        this.fallingTrees.splice(i, 1);
      }
    }

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
    const walkBobY = Math.sin(this.camBobPhase * 2) * 0.14 * this.camBobAmt;
    const walkBobSide = Math.cos(this.camBobPhase) * 0.105 * this.camBobAmt;
    const idleSwayY = Math.sin(elapsed * 1.45) * 0.035;
    const idleSwaySide = Math.cos(elapsed * 0.95) * 0.025;
    const swimBob = this.inWater ? Math.sin(elapsed * 3.1) * 0.08 : 0;

    const totalBobY = walkBobY + idleSwayY + swimBob - this.camLandingDip;
    const totalBobSide = walkBobSide + idleSwaySide;

    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);

    const runTremor = this.camBobAmt > 0.8 ? (this.camBobAmt - 0.8) * 0.045 : 0;
    const totalShake = this.cameraShake + this.stepShake + runTremor;
    const shakeX =
      (Math.sin(elapsed * 43) * 0.6 + (Math.random() - 0.5) * 0.8) * totalShake * 0.75;
    const shakeY =
      (Math.cos(elapsed * 51) * 0.65 + (Math.random() - 0.5) * 0.7) * totalShake * 0.95;
    const shakeZ =
      (Math.sin(elapsed * 37) * 0.55 + (Math.random() - 0.5) * 0.7) * totalShake * 0.75;

    if (this.cameraViewMode === 'first' && this.phase === 'playing') {
      this.playerRig.root.visible = false;
      const eyeX = this.px + rightX * totalBobSide * 0.35 + shakeX * 0.3;
      const eyeY = this.py + 1.68 + totalBobY * 0.6 + shakeY * 0.3;
      const eyeZ = this.pz + rightZ * totalBobSide * 0.35 + shakeZ * 0.3;
      this.camera.position.set(eyeX, eyeY, eyeZ);

      const pitchClamped = THREE.MathUtils.clamp(this.camPitch, -0.82, 0.82);
      const lookX = eyeX - Math.sin(this.camYaw) * Math.cos(pitchClamped) * 12;
      const lookY = eyeY - Math.sin(pitchClamped) * 12;
      const lookZ = eyeZ - Math.cos(this.camYaw) * Math.cos(pitchClamped) * 12;
      _lookTarget.set(lookX, lookY, lookZ);
      this.camera.lookAt(_lookTarget);
      const stepRoll = Math.cos(this.camBobPhase) * 0.015 * this.camBobAmt;
      const impactRoll = Math.sin(elapsed * 49) * totalShake * 0.045;
      this.camera.rotateZ(stepRoll + impactRoll);

      if (this.dofPass && this.dofEnabled) {
        this.dofPass.uniforms['uFocus'].value = 18;
      }
      return;
    }

    this.playerRig.root.visible = true;
    const baseModeDist =
      this.cameraViewMode === 'close'
        ? 3.7
        : this.cameraViewMode === 'far'
          ? Math.max(this.targetCamDist, 12.2)
          : this.targetCamDist;
    const goalDist = this.insideCabin
      ? Math.min(baseModeDist, 4.4)
      : this.insideCave
        ? Math.min(baseModeDist, 4.1)
        : baseModeDist;
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

    let targetX = this.px + Math.sin(this.camYaw) * horizDist + rightX * totalBobSide + shakeX;
    let targetZ = this.pz + Math.cos(this.camYaw) * horizDist + rightZ * totalBobSide + shakeZ;
    let targetY = this.insideCave
      ? THREE.MathUtils.clamp(this.py + vertOffset + totalBobY + shakeY, this.py + 0.9, this.py + 3.4)
      : Math.max(groundHeightAt(targetX, targetZ) + 0.75, this.py + vertOffset + totalBobY + shakeY);

    if (this.insideCave && this.insideCaveSite) {
      const cave = this.insideCaveSite;
      const localCam = toCaveLocal(targetX, targetZ, cave);
      const clz = Math.max(CAVE_END_Z + 0.55, localCam.lz);
      if (clz < CAVE_PORTAL_Z + 0.25) {
        const hw = caveHalfWidthAt(clz);
        const cx = cavePathCenterX(clz);
        const clx = THREE.MathUtils.clamp(localCam.lx, cx - (hw - 0.55), cx + (hw - 0.55));
        const clampedWorld = fromCaveLocal(clx, clz, cave);
        targetX = clampedWorld.x;
        targetZ = clampedWorld.z;
        const floorY = caveFloorYAt(cave, clz);
        const maxCeilY = floorY + caveCeilingClearanceAt(clz) - 0.45;
        targetY = THREE.MathUtils.clamp(targetY, floorY + 0.75, maxCeilY);
      }
    }

    _camGoal.set(targetX, targetY, targetZ);
    this.camera.position.lerp(_camGoal, 1 - Math.exp(-16 * dt));

    _lookTarget.set(
      this.px + rightX * totalBobSide * 0.45 + shakeX * 0.35,
      this.py + 1.68 + totalBobY * 0.55 + shakeY * 0.35,
      this.pz + rightZ * totalBobSide * 0.45 + shakeZ * 0.35,
    );
    this.camera.lookAt(_lookTarget);
    const stepRoll = Math.cos(this.camBobPhase) * 0.012 * this.camBobAmt;
    const impactRoll = Math.sin(elapsed * 49) * totalShake * 0.045;
    this.camera.rotateZ(stepRoll + impactRoll);

    if (this.dofPass && this.dofEnabled) {
      const focusDist = this.camera.position.distanceTo(_lookTarget);
      this.dofPass.uniforms['uFocus'].value = focusDist;
    }
  }

  private emitHud() {
    const w = WEAPONS.find((item) => item.id === this.activeWeapon)!;
    const nearCampfire = this.getNearestCampfire(4.5) !== null;
    const nearChest = this.chests.some((c) => {
      if (c.opened) return false;
      const dx = this.px - c.x;
      const dz = this.pz - c.z;
      return dx * dx + dz * dz < 3.4 * 3.4;
    });
    const nearBed =
      this.cabins.some((c) => {
        if (!c.bedPos || Math.abs(this.py - c.bedPos.y) >= 1.9) return false;
        const dx = this.px - c.bedPos.x;
        const dz = this.pz - c.bedPos.z;
        return dx * dx + dz * dz < 2.8 * 2.8;
      }) ||
      this.builtStructures.some((b) => {
        if (b.kind !== 'bed' || Math.abs(this.py - b.y) >= 1.9) return false;
        const dx = this.px - b.x;
        const dz = this.pz - b.z;
        return dx * dx + dz * dz < 2.8 * 2.8;
      });
    const nearWorkbench = this.isNearAnyWorkbench();

    const nearSq = (x: number, z: number, r: number) => {
      const dx = this.px - x;
      const dz = this.pz - z;
      return dx * dx + dz * dz < r * r;
    };
    const nearAnySpot = (spots: THREE.Vector3[], r: number) => {
      for (let i = 0; i < spots.length; i++) {
        if (nearSq(spots[i].x, spots[i].z, r)) return true;
      }
      return false;
    };
    const hasNearNpc = (kind: PeacefulMobKind, r: number) => {
      for (let i = 0; i < this.peacefulMobs.length; i++) {
        const pm = this.peacefulMobs[i];
        if (pm.kind === kind && nearSq(pm.x, pm.z, r)) return true;
      }
      return false;
    };

    const nearGeneral = nearAnySpot(this.shopCounterSpots, 3.4) || hasNearNpc('merchant', 3.8);
    const nearSmith = hasNearNpc('blacksmith', 3.8);
    const nearHerb = hasNearNpc('herbalist', 3.8);
    const nearBaker = nearAnySpot(this.bakeryCounterSpots, 3.4) || hasNearNpc('baker', 3.8);
    const nearAlch = nearAnySpot(this.alchemyCounterSpots, 3.4) || hasNearNpc('alchemist', 3.8);
    const nearShop = nearGeneral || nearSmith || nearHerb || nearBaker || nearAlch;

    if (nearSmith) this.activeMerchantKind = 'blacksmith';
    else if (nearHerb) this.activeMerchantKind = 'herbalist';
    else if (nearBaker) this.activeMerchantKind = 'baker';
    else if (nearAlch) this.activeMerchantKind = 'alchemist';
    else if (nearGeneral) this.activeMerchantKind = 'general';

    let nearNode: ResourceNodeEntity | undefined;
    for (let i = 0; i < this.resourceNodes.length; i++) {
      const n = this.resourceNodes[i];
      if (n.available && nearSq(n.x, n.z, 3.2)) {
        nearNode = n;
        break;
      }
    }
    const nearVillager = hasNearNpc('villager', 3.8);
    const nearExplorer = hasNearNpc('explorer', 3.8);
    const nearMayor = hasNearNpc('mayor', 4.0);
    const nearGuard = hasNearNpc('guard', 3.8);

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

    // Point minimap beacon & active goal compass to the next uncompleted campaign objective
    const nextQuestIdx = quests.findIndex((q) => !q.completed);
    let activeGoal: ActiveGoalHud | null = null;
    let questTargetX: number | null = null;
    let questTargetZ: number | null = null;
    let questTargetLabel = '';

    if (nextQuestIdx !== -1) {
      const nextQuest = quests[nextQuestIdx];
      const nextDef = QUESTS[nextQuestIdx];
      questTargetLabel = nextDef.title;

      if (nextQuest.id === 'gather_valley') {
        let bestDSq = Infinity;
        for (const node of this.resourceNodes) {
          if (!node.available) continue;
          const dx = node.x - this.px;
          const dz = node.z - this.pz;
          const dSq = dx * dx + dz * dz;
          if (dSq < bestDSq) {
            bestDSq = dSq;
            questTargetX = node.x;
            questTargetZ = node.z;
            questTargetLabel = node.label;
          }
        }
      } else if (nextQuest.id === 'hunt_threats') {
        let bestDSq = Infinity;
        for (const m of this.mobs) {
          if (m.caveId) continue;
          const dx = m.x - this.px;
          const dz = m.z - this.pz;
          const dSq = dx * dx + dz * dz;
          if (dSq < bestDSq) {
            bestDSq = dSq;
            questTargetX = m.x;
            questTargetZ = m.z;
            questTargetLabel = MOB_DEFS[m.kind].name;
          }
        }
      } else if (nextQuest.id === 'visit_traders') {
        let bestDSq = Infinity;
        for (const pm of this.peacefulMobs) {
          if (
            pm.kind === 'merchant' ||
            pm.kind === 'blacksmith' ||
            pm.kind === 'herbalist' ||
            pm.kind === 'baker' ||
            pm.kind === 'alchemist'
          ) {
            const dx = pm.x - this.px;
            const dz = pm.z - this.pz;
            const dSq = dx * dx + dz * dz;
            if (dSq < bestDSq) {
              bestDSq = dSq;
              questTargetX = pm.x;
              questTargetZ = pm.z;
              questTargetLabel = pm.displayName ?? 'Торговець';
            }
          }
        }
        if (questTargetX === null) {
          const sp = shopSitePosFallback();
          questTargetX = sp.x;
          questTargetZ = sp.z;
          questTargetLabel = 'Торговець';
        }
      } else if (nextQuest.id === 'find_village') {
        questTargetX = VILLAGE_SITE.x;
        questTargetZ = VILLAGE_SITE.z;
        questTargetLabel = VILLAGE_SITE.name;
      } else if (nextQuest.id === 'explore_caves') {
        let bestCave = CAVE_SITES[0];
        let bestDSq = Infinity;
        for (const cv of CAVE_SITES) {
          if (this.visitedCaves.has(cv.id)) continue;
          const dx = cv.x - this.px;
          const dz = cv.z - this.pz;
          const dSq = dx * dx + dz * dz;
          if (dSq < bestDSq) {
            bestDSq = dSq;
            bestCave = cv;
          }
        }
        questTargetX = bestCave.x;
        questTargetZ = bestCave.z;
        questTargetLabel = bestCave.name;
      } else if (nextQuest.id === 'defeat_boss') {
        const boss = this.mobs.find((m) => m.kind === 'boss');
        questTargetX = boss ? boss.x : 46;
        questTargetZ = boss ? boss.z : -24;
        questTargetLabel = 'Тіньовий Лицар (Бос)';
      } else if (nextQuest.id === 'defeat_final_boss') {
        const fBoss = this.mobs.find((m) => m.kind === 'final_boss');
        questTargetX = fBoss ? fBoss.x : FINAL_ARENA_X;
        questTargetZ = fBoss ? fBoss.z : FINAL_ARENA_Z;
        questTargetLabel = 'Малакор — Фінальний Бос';
      }

      let distanceMeters: number | null = null;
      let compassLabel: string | null = null;
      if (questTargetX !== null && questTargetZ !== null) {
        const dx = questTargetX - this.px;
        const dz = questTargetZ - this.pz;
        distanceMeters = Math.round(Math.hypot(dx, dz));
        const dirs = ['Пн', 'ПнСх', 'Сх', 'ПдСх', 'Пд', 'ПдЗх', 'Зх', 'ПнЗх'];
        const angleDeg = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
        compassLabel = dirs[Math.round(angleDeg / 45) % 8];
      }

      activeGoal = {
        title: nextDef.title,
        stepIndex: nextQuestIdx + 1,
        totalSteps: QUESTS.length,
        distanceMeters,
        compassLabel,
      };
    }

    this.minimapHudTick++;
    if (this.cachedMinimapEntities.length === 0 || (this.minimapHudTick & 1) === 0) {
      const nextList: MinimapEntity[] = [...this.staticMinimapEntities];
      for (let i = 0; i < this.peacefulMobs.length; i++) {
        const pm = this.peacefulMobs[i];
        if (
          pm.kind === 'merchant' ||
          pm.kind === 'blacksmith' ||
          pm.kind === 'herbalist' ||
          pm.kind === 'baker' ||
          pm.kind === 'alchemist'
        ) {
          nextList.push({ x: pm.x, z: pm.z, kind: 'merchant', label: pm.displayName });
        } else if (
          pm.kind === 'villager' ||
          pm.kind === 'explorer' ||
          pm.kind === 'mayor' ||
          pm.kind === 'guard'
        ) {
          nextList.push({ x: pm.x, z: pm.z, kind: 'npc', label: pm.displayName });
        }
      }
      for (let i = 0; i < this.mobs.length; i++) {
        const m = this.mobs[i];
        nextList.push({
          x: m.x,
          z: m.z,
          kind: m.kind === 'boss' || m.kind === 'final_boss' || m.kind === 'secret_boss' ? 'boss' : 'mob',
        });
      }
      for (const rp of this.remotePlayers.values()) {
        nextList.push({
          x: rp.x,
          z: rp.z,
          kind: 'player_remote',
          label: rp.data.name,
        });
      }
      if (questTargetX !== null && questTargetZ !== null) {
        nextList.push({ x: questTargetX, z: questTargetZ, kind: 'quest', label: questTargetLabel });
      }
      this.cachedMinimapEntities = nextList;
    }
    const minimapEntities = this.cachedMinimapEntities;

    if (this.upgrades.size !== this.cachedUpgradesSize) {
      this.cachedUpgradesSize = this.upgrades.size;
      this.cachedUpgradesArr = Array.from(this.upgrades);
    }

    const parryActive = this.blocking && this.lastElapsed - this.blockStartTime <= 0.3;

    const nearAdminPainting =
      Math.hypot(this.px - this.adminPaintingPos.x, this.pz - this.adminPaintingPos.z) < 6.0;
    const nearSpawnThrone =
      Math.hypot(this.px - this.spawnThronePos.x, this.pz - this.spawnThronePos.z) < 4.2;
    const nearToolStand =
      this.gameMode !== 'survival' &&
      Boolean(this.toolStandGroup?.visible) &&
      Math.hypot(this.px - this.toolStandPos.x, this.pz - this.toolStandPos.z) < 3.6;

    this.onHudUpdate({
      phase: this.phase,
      gameMode: this.gameMode,
      cameraViewMode: this.cameraViewMode,
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
        frostAura: this.frostAuraBuffTimer,
        vampire: this.vampireBuffTimer,
        titanShield: this.titanShieldBuffTimer,
        phoenixRegen: this.phoenixRegenBuffTimer,
      },
      season: this.season,
      weather: this.weather,
      seasonRemainingSec: Math.max(0, Math.round(this.autoSeasonTimer)),
      zoneName: this.getCachedZoneName(),
      biomeId: biomeAt(this.px, this.pz),
      insideCabin: this.insideCabin,
      insideCave: this.insideCave,
      nearCampfire,
      nearChest,
      nearBed,
      nearWorkbench,
      nearShop,
      nearAdminPainting,
      nearSpawnThrone,
      nearToolStand,
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
      pingMs: this.pingMs,
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
      upgrades: this.cachedUpgradesArr,
      potionBuffs: {
        rage: Math.ceil(this.potionBuffs.rage),
        swift: Math.ceil(this.potionBuffs.swift),
        ironSkin: Math.ceil(this.potionBuffs.ironSkin),
        regen: Math.ceil(this.potionBuffs.regen),
      },
      killFeed: this.killFeed,
      lastSavedAt: this.lastSavedAt,
      playTimeSec: Math.round(this.playTimeSec),
      victoryAchieved: this.victoryAchieved,
      secretBossUnlocked: this.isSecretBossUnlocked(),
      visitedCavesCount: this.visitedCaves.size,
      totalCavesCount: CAVE_SITES.length,
      activeGoal,
      workbenchStock: this.workbenchStock,
      selectedBuildPiece: this.selectedBuildPiece,
      buildRotDeg: this.buildRotIndex * 90,
      buildFloorLevel: this.buildFloorLevel,
      nearTreeLabel: this.nearTreeTarget
        ? `Дерево · ${Math.round((this.nearTreeTarget.hp / this.nearTreeTarget.maxHp) * 100)}%`
        : null,
      nearTreeHpRatio: this.nearTreeTarget
        ? Math.max(0, Math.min(1, this.nearTreeTarget.hp / this.nearTreeTarget.maxHp))
        : null,
      nearMineTargetLabel: this.nearMineTarget
        ? `${this.nearMineTarget.label} · ${Math.round((this.nearMineTarget.hp / this.nearMineTarget.maxHp) * 100)}%`
        : null,
      nearMineHpRatio: this.nearMineTarget
        ? Math.max(0, Math.min(1, this.nearMineTarget.hp / this.nearMineTarget.maxHp))
        : null,
      canBuildHere: this.previewValid,
      builtCount: this.builtStructures.length,
      onlineConnected: this.onlineConnected,
      onlinePlayerId: this.multiplayer?.selfId ?? null,
      playerName: this.multiplayer?.playerName ?? 'Мандрівник',
      onlinePlayers: this.onlinePlayersSnapshot,
      onlineChat: this.onlineChat,
    });
  }

  public dispose() {
    this.saveGameNow(true);
    this.disposed = true;
    this.multiplayer?.dispose();
    for (const rp of this.remotePlayers.values()) {
      this.scene.remove(rp.rig.root);
      rp.nameTag.texture.dispose();
      rp.nameTag.material.dispose();
    }
    this.remotePlayers.clear();
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
    this.woodChipMat.dispose();
    for (const mat of this.sparkMatCache.values()) {
      mat.dispose();
    }
    this.sparkMatCache.clear();
    for (const mat of this.projMatCache.values()) {
      mat.dispose();
    }
    this.projMatCache.clear();
    this.projArrowShaftGeo.dispose();
    this.projArrowTipGeo.dispose();
    this.projArrowFletchGeo.dispose();
    this.projOrbCoreGeo.dispose();
    this.projOrbHaloGeo.dispose();
    this.projMobCoreGeo.dispose();
    this.projMobHaloGeo.dispose();
    this.projArrowShaftMat.dispose();
    this.projArrowTipMat.dispose();
    this.projBoltCoreMat.dispose();
    this.projMobCoreMat.dispose();
    this.sparkMeshPool = [];
    this.colliderGrid.clear();
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
