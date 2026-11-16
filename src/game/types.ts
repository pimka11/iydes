export type WeaponId = 'sword' | 'hammer' | 'blaster' | 'bow';

export interface WeaponDef {
  id: WeaponId;
  key: string;
  name: string;
  kind: 'melee' | 'ranged';
  damage: number;
  cooldown: number;
  range: number;
  knockback: number;
  accentHex: string;
  description: string;
}

export const WEAPONS: WeaponDef[] = [
  {
    id: 'sword',
    key: '1',
    name: 'Сталевий Меч',
    kind: 'melee',
    damage: 28,
    cooldown: 0.36,
    range: 3.4,
    knockback: 7.5,
    accentHex: '#38bdf8',
    description: 'Швидкі ближні удари з дуговим розмахом',
  },
  {
    id: 'hammer',
    key: '2',
    name: 'Важкий Молот',
    kind: 'melee',
    damage: 48,
    cooldown: 0.78,
    range: 4.1,
    knockback: 14.0,
    accentHex: '#f59e0b',
    description: 'Удар по землі з потужною хвилею по площі',
  },
  {
    id: 'blaster',
    key: '3',
    name: 'Іскровий Бластер',
    kind: 'ranged',
    damage: 22,
    cooldown: 0.28,
    range: 32,
    knockback: 4.2,
    accentHex: '#22d3ee',
    description: 'Швидкі плазмові заряди на дальню дистанцію',
  },
  {
    id: 'bow',
    key: '4',
    name: 'Лісовий Лук',
    kind: 'ranged',
    damage: 38,
    cooldown: 0.56,
    range: 42,
    knockback: 6.5,
    accentHex: '#a3e635',
    description: 'Точні стріли з високою шкодою',
  },
];

export type MobKind = 'slime' | 'goblin' | 'golem' | 'boss';
export type PeacefulMobKind = 'deer' | 'sheep' | 'villager';

export interface MobDef {
  kind: MobKind;
  name: string;
  maxHp: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  aggroRadius: number;
  rewardCoins: number;
  rewardXp: number;
  radius: number;
  height: number;
}

export const MOB_DEFS: Record<MobKind, MobDef> = {
  slime: {
    kind: 'slime',
    name: 'Лісовий Слайм',
    maxHp: 45,
    damage: 8,
    speed: 3.6,
    attackRange: 1.8,
    attackCooldown: 1.1,
    aggroRadius: 15,
    rewardCoins: 10,
    rewardXp: 18,
    radius: 0.72,
    height: 1.1,
  },
  goblin: {
    kind: 'goblin',
    name: 'Блоковий Гоблін',
    maxHp: 75,
    damage: 14,
    speed: 5.0,
    attackRange: 2.1,
    attackCooldown: 1.0,
    aggroRadius: 20,
    rewardCoins: 22,
    rewardXp: 35,
    radius: 0.68,
    height: 2.1,
  },
  golem: {
    kind: 'golem',
    name: 'Кам’яний Голем',
    maxHp: 170,
    damage: 24,
    speed: 3.0,
    attackRange: 2.6,
    attackCooldown: 1.55,
    aggroRadius: 22,
    rewardCoins: 55,
    rewardXp: 80,
    radius: 1.15,
    height: 3.1,
  },
  boss: {
    kind: 'boss',
    name: 'Тіньовий Лицар',
    maxHp: 320,
    damage: 32,
    speed: 4.5,
    attackRange: 2.9,
    attackCooldown: 1.25,
    aggroRadius: 28,
    rewardCoins: 140,
    rewardXp: 180,
    radius: 1.05,
    height: 3.3,
  },
};

export type ResourceId = 'wood' | 'stone' | 'iron' | 'herb' | 'essence' | 'hide';
export type ConsumableId = 'potion' | 'tonic' | 'stew';
export type UpgradeId =
  | 'sword_t2'
  | 'hammer_t2'
  | 'blaster_t2'
  | 'bow_t2'
  | 'armor_ranger'
  | 'boots_swift';

export interface ResourceMeta {
  id: ResourceId;
  name: string;
  colorHex: string;
  hint: string;
}

export const RESOURCES: ResourceMeta[] = [
  { id: 'wood', name: 'Деревина', colorHex: '#d97706', hint: 'Зі зрубів у лісі та від гоблінів' },
  { id: 'stone', name: 'Камінь', colorHex: '#94a3b8', hint: 'З кам’яних брил та големів' },
  { id: 'iron', name: 'Залізо', colorHex: '#60a5fa', hint: 'З рудних жил, скринь та големів' },
  { id: 'herb', name: 'Трави', colorHex: '#4ade80', hint: 'Збирайте на галявині та біля хатинки' },
  { id: 'essence', name: 'Есенція', colorHex: '#c084fc', hint: 'Зі слаймів, кристалів та боса' },
  { id: 'hide', name: 'Шкіра', colorHex: '#f59e0b', hint: 'Трофей з гоблінів та скринь' },
];

export interface CraftRecipe {
  id: string;
  name: string;
  category: 'consumable' | 'upgrade';
  description: string;
  outputConsumable?: ConsumableId;
  outputCount?: number;
  outputUpgrade?: UpgradeId;
  cost: Partial<Record<ResourceId, number>>;
  coinsCost?: number;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'craft_potion',
    name: 'Зілля лікування',
    category: 'consumable',
    description: 'Відновлює +50 HP миттєво',
    outputConsumable: 'potion',
    outputCount: 1,
    cost: { herb: 2, essence: 1 },
  },
  {
    id: 'craft_tonic',
    name: 'Трав’яний тонік',
    category: 'consumable',
    description: 'Відновлює +70 витривалості та +15 HP',
    outputConsumable: 'tonic',
    outputCount: 1,
    cost: { herb: 2, wood: 1 },
  },
  {
    id: 'craft_stew',
    name: 'Мисливська юшка',
    category: 'consumable',
    description: 'Ситно лікує +85 HP і повну витривалість',
    outputConsumable: 'stew',
    outputCount: 1,
    cost: { herb: 3, wood: 2, essence: 1 },
  },
  {
    id: 'craft_sword_t2',
    name: 'Кований Меч',
    category: 'upgrade',
    description: '+16 до шкоди Сталевого Меча',
    outputUpgrade: 'sword_t2',
    cost: { wood: 2, stone: 3, iron: 3 },
  },
  {
    id: 'craft_hammer_t2',
    name: 'Рунний Молот',
    category: 'upgrade',
    description: '+24 до шкоди та радіусу Молота',
    outputUpgrade: 'hammer_t2',
    cost: { stone: 4, iron: 3, essence: 2 },
  },
  {
    id: 'craft_blaster_t2',
    name: 'Кристальний Бластер',
    category: 'upgrade',
    description: '+14 до шкоди Бластера',
    outputUpgrade: 'blaster_t2',
    cost: { iron: 3, essence: 4 },
  },
  {
    id: 'craft_bow_t2',
    name: 'Ельфійський Лук',
    category: 'upgrade',
    description: '+18 до шкоди Лука',
    outputUpgrade: 'bow_t2',
    cost: { wood: 4, iron: 2, essence: 2 },
  },
  {
    id: 'craft_armor_ranger',
    name: 'Броня Вартового',
    category: 'upgrade',
    description: '+45 Макс. HP, -25% вхідної шкоди (видимі наплічники)',
    outputUpgrade: 'armor_ranger',
    cost: { hide: 3, iron: 4, stone: 2 },
  },
  {
    id: 'craft_boots_swift',
    name: 'Чоботи Мандрівника',
    category: 'upgrade',
    description: '+22% швидкості пересування долиною',
    outputUpgrade: 'boots_swift',
    cost: { hide: 2, herb: 3, essence: 2 },
  },
];

export interface KillFeedItem {
  id: number;
  text: string;
}

export interface GameHudState {
  phase: 'title' | 'playing' | 'dead';
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  xp: number;
  xpToNext: number;
  level: number;
  coins: number;
  kills: number;
  wave: number;
  activeMobs: number;
  peacefulMobs: number;
  activeWeapon: WeaponId;
  weaponCooldownRatio: number;
  zoneName: string;
  insideCabin: boolean;
  nearCampfire: boolean;
  nearChest: boolean;
  nearWorkbench: boolean;
  nearResourceLabel: string | null;
  nearVillager: boolean;
  inWater: boolean;
  pointerLocked: boolean;
  autoFollowCam: boolean;
  dofEnabled: boolean;
  shadowUpscale: boolean;
  ecoMode: boolean;
  muted: boolean;
  resources: Record<ResourceId, number>;
  consumables: Record<ConsumableId, number>;
  upgrades: UpgradeId[];
  killFeed: KillFeedItem[];
}
