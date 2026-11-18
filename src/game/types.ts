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

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherId = 'clear' | 'rain' | 'fog' | 'precip';

export const SEASON_DURATION_SEC = 900; // 15 хвилин на кожну пору року
export const WEATHER_DURATION_SEC = 140;
export const TRAIL_STEPS_THRESHOLD = 10; // Стежка з'являється після >10 проходів (11+ кроків)

export const SEASON_LABELS: Record<SeasonId, string> = {
  spring: 'Весна',
  summer: 'Літо',
  autumn: 'Осінь',
  winter: 'Зима',
};

export const WEATHER_LABELS: Record<WeatherId, Record<SeasonId, string>> = {
  clear: {
    spring: 'Ясно',
    summer: 'Сонячно',
    autumn: 'Ясно',
    winter: 'Морозно',
  },
  rain: {
    spring: 'Теплий дощ',
    summer: 'Злива',
    autumn: 'Мжичка',
    winter: 'Крижаний дощ',
  },
  fog: {
    spring: 'Ранковий туман',
    summer: 'Імла',
    autumn: 'Густий туман',
    winter: 'Морозна імла',
  },
  precip: {
    spring: 'Цвітіння',
    summer: 'Теплий вітер',
    autumn: 'Листопад',
    winter: 'Снігопад',
  },
};

export type MobKind = 'slime' | 'goblin' | 'wolf' | 'skeleton' | 'golem' | 'boss';
export type PeacefulMobKind =
  | 'deer'
  | 'sheep'
  | 'villager'
  | 'merchant'
  | 'blacksmith'
  | 'herbalist'
  | 'explorer'
  | 'mayor'
  | 'baker'
  | 'alchemist'
  | 'guard';

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
    aggroRadius: 16,
    rewardCoins: 12,
    rewardXp: 18,
    radius: 0.72,
    height: 1.1,
  },
  goblin: {
    kind: 'goblin',
    name: 'Блоковий Гоблін',
    maxHp: 78,
    damage: 14,
    speed: 5.1,
    attackRange: 2.1,
    attackCooldown: 1.0,
    aggroRadius: 21,
    rewardCoins: 24,
    rewardXp: 36,
    radius: 0.68,
    height: 2.1,
  },
  wolf: {
    kind: 'wolf',
    name: 'Тіньовий Вовк',
    maxHp: 64,
    damage: 16,
    speed: 6.8,
    attackRange: 2.0,
    attackCooldown: 0.85,
    aggroRadius: 24,
    rewardCoins: 26,
    rewardXp: 42,
    radius: 0.72,
    height: 1.35,
  },
  skeleton: {
    kind: 'skeleton',
    name: 'Печерний Скелет',
    maxHp: 105,
    damage: 19,
    speed: 4.5,
    attackRange: 2.25,
    attackCooldown: 1.05,
    aggroRadius: 22,
    rewardCoins: 36,
    rewardXp: 58,
    radius: 0.7,
    height: 2.25,
  },
  golem: {
    kind: 'golem',
    name: 'Кам’яний Голем',
    maxHp: 175,
    damage: 24,
    speed: 3.1,
    attackRange: 2.6,
    attackCooldown: 1.55,
    aggroRadius: 23,
    rewardCoins: 60,
    rewardXp: 85,
    radius: 1.15,
    height: 3.1,
  },
  boss: {
    kind: 'boss',
    name: 'Тіньовий Лицар',
    maxHp: 330,
    damage: 32,
    speed: 4.6,
    attackRange: 2.9,
    attackCooldown: 1.25,
    aggroRadius: 30,
    rewardCoins: 150,
    rewardXp: 190,
    radius: 1.05,
    height: 3.3,
  },
};

export type ResourceId = 'wood' | 'stone' | 'iron' | 'herb' | 'essence' | 'hide';
export type ConsumableId = 'potion' | 'tonic' | 'stew';
export type RelicId = 'amulet_vitality' | 'cloak_wind' | 'rune_power';
export type UpgradeId =
  | 'sword_t2'
  | 'hammer_t2'
  | 'blaster_t2'
  | 'bow_t2'
  | 'armor_ranger'
  | 'boots_swift'
  | 'shield_aegis'
  | RelicId;

export interface RelicMeta {
  id: RelicId;
  key: string;
  name: string;
  skillName: string;
  cooldown: number;
  description: string;
  colorHex: string;
}

export const RELIC_SKILLS: RelicMeta[] = [
  {
    id: 'amulet_vitality',
    key: 'Z',
    name: 'Амулет Життя',
    skillName: 'Хвиля Зцілення',
    cooldown: 18,
    description: '+45 HP, +35 витривалості та цілюща аура навколо героя',
    colorHex: '#4ade80',
  },
  {
    id: 'cloak_wind',
    key: 'X',
    name: 'Плащ Вітру',
    skillName: 'Ривок Вітру',
    cooldown: 10,
    description: 'Швидкий ривок уперед та +40% швидкості на 5 секунд',
    colorHex: '#38bdf8',
  },
  {
    id: 'rune_power',
    key: 'C',
    name: 'Руна Берсерка',
    skillName: 'Лють Берсерка',
    cooldown: 16,
    description: 'Ударна хвиля (35 шкоди) та +45% до атаки на 6 секунд',
    colorHex: '#f97316',
  },
];

export interface ResourceMeta {
  id: ResourceId;
  name: string;
  colorHex: string;
  hint: string;
}

export const RESOURCES: ResourceMeta[] = [
  { id: 'wood', name: 'Деревина', colorHex: '#d97706', hint: 'Зі зрубів у лісі та від гоблінів' },
  { id: 'stone', name: 'Камінь', colorHex: '#94a3b8', hint: 'З кам’яних брил та големів' },
  { id: 'iron', name: 'Залізо', colorHex: '#60a5fa', hint: 'З рудних жил, печер та големів' },
  { id: 'herb', name: 'Трави', colorHex: '#4ade80', hint: 'Збирайте на галявині та біля хатинок' },
  { id: 'essence', name: 'Есенція', colorHex: '#c084fc', hint: 'З кристалів у печерах, слаймів та боса' },
  { id: 'hide', name: 'Шкіра', colorHex: '#f59e0b', hint: 'Трофей з вовків, гоблінів та скринь' },
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
    id: 'craft_shield_aegis',
    name: 'Щит Егіди',
    category: 'upgrade',
    description: 'Блок поглинає 92% шкоди, парирування відбиває удар із подвійною силою',
    outputUpgrade: 'shield_aegis',
    cost: { wood: 2, iron: 4, essence: 1 },
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

export type MerchantKind = 'general' | 'blacksmith' | 'herbalist' | 'baker' | 'alchemist';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  merchant: MerchantKind;
  category: 'supply' | 'resource' | 'relic';
  outputConsumable?: ConsumableId;
  outputResource?: { id: ResourceId; amount: number };
  outputUpgrade?: UpgradeId;
  outputCount?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // General merchant (Марко у Крамниці)
  {
    id: 'shop_potion',
    name: 'Зілля лікування',
    description: 'Миттєво відновлює +50 HP у бою (клавіша 5)',
    price: 22,
    merchant: 'general',
    category: 'supply',
    outputConsumable: 'potion',
    outputCount: 1,
  },
  {
    id: 'shop_tonic',
    name: 'Трав’яний тонік',
    description: '+70 витривалості та +15 HP (клавіша 6)',
    price: 18,
    merchant: 'general',
    category: 'supply',
    outputConsumable: 'tonic',
    outputCount: 1,
  },
  {
    id: 'shop_stew',
    name: 'Ситна юшка мандрівника',
    description: '+85 HP та повна витривалість (клавіша 7)',
    price: 38,
    merchant: 'general',
    category: 'supply',
    outputConsumable: 'stew',
    outputCount: 1,
  },
  {
    id: 'shop_hide',
    name: 'Вичинена шкіра (×2)',
    description: 'Для броні Вартового та чобіт Мандрівника',
    price: 30,
    merchant: 'general',
    category: 'resource',
    outputResource: { id: 'hide', amount: 2 },
  },
  {
    id: 'shop_amulet',
    name: 'Амулет Життя',
    description: 'Назавжди +35 Макс. HP + активна навичка «Хвиля Зцілення» (Z)',
    price: 85,
    merchant: 'general',
    category: 'relic',
    outputUpgrade: 'amulet_vitality',
  },
  {
    id: 'shop_cloak',
    name: 'Плащ Вітру',
    description: 'Назавжди +18% швидкості + активна навичка «Ривок Вітру» (X)',
    price: 95,
    merchant: 'general',
    category: 'relic',
    outputUpgrade: 'cloak_wind',
  },
  {
    id: 'shop_rune',
    name: 'Руна Берсерка',
    description: 'Назавжди +22% шкоди + активна навичка «Лють Берсерка» (C)',
    price: 115,
    merchant: 'general',
    category: 'relic',
    outputUpgrade: 'rune_power',
  },
  // Blacksmith (Коваль Богдан біля Північної Сторожки)
  {
    id: 'smith_iron',
    name: 'Загартоване залізо (×3)',
    description: 'Високоякісні злитки прямо з горна Коваля',
    price: 42,
    merchant: 'blacksmith',
    category: 'resource',
    outputResource: { id: 'iron', amount: 3 },
  },
  {
    id: 'smith_stone',
    name: 'Оброблений граніт (×4)',
    description: 'Міцний камінь для кування важкої зброї',
    price: 26,
    merchant: 'blacksmith',
    category: 'resource',
    outputResource: { id: 'stone', amount: 4 },
  },
  {
    id: 'smith_shield_aegis',
    name: 'Щит Егіди',
    description: 'Кований щит із золотим орнаментом: 92% блок та іскрове парирування',
    price: 95,
    merchant: 'blacksmith',
    category: 'relic',
    outputUpgrade: 'shield_aegis',
  },
  {
    id: 'smith_sword_t2',
    name: 'Кований Меч (від Коваля)',
    description: 'Готовий +16 до шкоди Сталевого Меча без черги на верстаку',
    price: 110,
    merchant: 'blacksmith',
    category: 'relic',
    outputUpgrade: 'sword_t2',
  },
  // Herbalist (Травниця Соломія біля Лісового Котеджу)
  {
    id: 'herb_bundle',
    name: 'Пучок цілющих трав (×4)',
    description: 'Свіжі трави долини для крафту зілля та юшки',
    price: 24,
    merchant: 'herbalist',
    category: 'resource',
    outputResource: { id: 'herb', amount: 4 },
  },
  {
    id: 'herb_essence',
    name: 'Кристали есенції (×3)',
    description: 'Концентрована магічна есенція лісу',
    price: 54,
    merchant: 'herbalist',
    category: 'resource',
    outputResource: { id: 'essence', amount: 3 },
  },
  {
    id: 'herb_potion_pack',
    name: 'Еліксир Соломії (×2)',
    description: 'Одразу два цілющі зілля в похідну сумку',
    price: 38,
    merchant: 'herbalist',
    category: 'supply',
    outputConsumable: 'potion',
    outputCount: 2,
  },
  {
    id: 'herb_stew',
    name: 'Лісова юшка на травах',
    description: '+85 HP та повна витривалість',
    price: 34,
    merchant: 'herbalist',
    category: 'supply',
    outputConsumable: 'stew',
    outputCount: 1,
  },
  // Village Baker (Пекарка Галина у селищі)
  {
    id: 'baker_stew_pack',
    name: 'Святковий коровай і юшка (×2)',
    description: 'Дві ситні порції (+85 HP і повна витривалість кожна)',
    price: 62,
    merchant: 'baker',
    category: 'supply',
    outputConsumable: 'stew',
    outputCount: 2,
  },
  {
    id: 'baker_tonic_pack',
    name: 'Медовий узвар Галини (×2)',
    description: 'Два тоніки для швидкого відновлення витривалості у довгих мандрах',
    price: 30,
    merchant: 'baker',
    category: 'supply',
    outputConsumable: 'tonic',
    outputCount: 2,
  },
  {
    id: 'baker_wood',
    name: 'Сухі дубові поліна (×4)',
    description: 'Деревина з пекарні для будівництва і крафту',
    price: 22,
    merchant: 'baker',
    category: 'resource',
    outputResource: { id: 'wood', amount: 4 },
  },
  // Village Alchemist (Алхімік Лев у селищі)
  {
    id: 'alch_essence_pack',
    name: 'Флакон чистої есенції (×4)',
    description: 'Рідкісна есенція для рунної зброї та амулетів',
    price: 68,
    merchant: 'alchemist',
    category: 'resource',
    outputResource: { id: 'essence', amount: 4 },
  },
  {
    id: 'alch_potion_trio',
    name: 'Алхімічна трійка зіль (×3)',
    description: 'Запас із трьох лікувальних еліксирів зі знижкою',
    price: 54,
    merchant: 'alchemist',
    category: 'supply',
    outputConsumable: 'potion',
    outputCount: 3,
  },
  {
    id: 'alch_boots',
    name: 'Чоботи Мандрівника (готовий виріб)',
    description: 'Назавжди +22% швидкості мандрів велетенським світом',
    price: 105,
    merchant: 'alchemist',
    category: 'relic',
    outputUpgrade: 'boots_swift',
  },
  {
    id: 'alch_blaster_t2',
    name: 'Кристальний Бластер (модуль Лева)',
    description: '+14 до шкоди Іскрового Бластера',
    price: 125,
    merchant: 'alchemist',
    category: 'relic',
    outputUpgrade: 'blaster_t2',
  },
];

export type QuestId =
  | 'gather_valley'
  | 'hunt_threats'
  | 'visit_traders'
  | 'find_village'
  | 'explore_caves'
  | 'defeat_boss';

export interface QuestDef {
  id: QuestId;
  title: string;
  description: string;
  giver: string;
  targetCount: number;
  rewardCoins: number;
  rewardXp: number;
  rewardNote: string;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'gather_valley',
    title: 'Дари долини',
    description: 'Зберіть 4 ресурси на галявині або в лісі (дерево, трави, камінь, руда)',
    giver: 'Лісник Орест',
    targetCount: 4,
    rewardCoins: 55,
    rewardXp: 65,
    rewardNote: '+55 мон., +65 XP',
  },
  {
    id: 'hunt_threats',
    title: 'Очищення стежок',
    description: 'Переможіть 5 ворожих мобів (слайми, вовки, гобліни або скелети)',
    giver: 'Лісник Орест',
    targetCount: 5,
    rewardCoins: 85,
    rewardXp: 95,
    rewardNote: '+85 мон., +1 Зілля',
  },
  {
    id: 'visit_traders',
    title: 'Торгові шляхи',
    description: 'Відвідайте будь-якого купця (Крамниця, Кузня, Травниця, Пекарня чи Алхімік)',
    giver: 'Торговець Марко',
    targetCount: 1,
    rewardCoins: 70,
    rewardXp: 75,
    rewardNote: '+70 мон., +2 Залізо',
  },
  {
    id: 'find_village',
    title: 'Шлях до Селища',
    description: 'Знайдіть загублене селище на відкритому світі та поговоріть зі Старостою Мирославом',
    giver: 'Староста Мирослав',
    targetCount: 1,
    rewardCoins: 140,
    rewardXp: 150,
    rewardNote: '+140 мон., +2 Юшка',
  },
  {
    id: 'explore_caves',
    title: 'Таємниці гірських печер',
    description: 'Зайдіть усередину будь-якої блокової печери у стилі Minecraft',
    giver: 'Скарбошукач Тарас',
    targetCount: 1,
    rewardCoins: 110,
    rewardXp: 120,
    rewardNote: '+110 мон., +2 Есенція',
  },
  {
    id: 'defeat_boss',
    title: 'Володар Кам’яних Руїн',
    description: 'Переможіть Тіньового Лицаря (Боса) біля Руїн на східному березі',
    giver: 'Коваль Богдан',
    targetCount: 1,
    rewardCoins: 220,
    rewardXp: 260,
    rewardNote: '+220 мон., +3 Есенція',
  },
];

export interface QuestProgressState {
  id: QuestId;
  progress: number;
  completed: boolean;
}

export interface MinimapEntity {
  x: number;
  z: number;
  kind: 'player' | 'cabin' | 'village' | 'cave' | 'mob' | 'boss' | 'npc' | 'merchant' | 'quest';
  label?: string;
}

export interface KillFeedItem {
  id: number;
  text: string;
}

export interface TrailCellPoint {
  x: number;
  z: number;
}

export interface SaveGameData {
  version: number;
  worldSeed: number;
  savedAt: number;
  px: number;
  py: number;
  pz: number;
  playerYaw: number;
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
  activeWeapon: WeaponId;
  season: SeasonId;
  weather: WeatherId;
  autoSeasonTimer: number;
  autoWeatherTimer: number;
  resources: Record<ResourceId, number>;
  consumables: Record<ConsumableId, number>;
  upgrades: UpgradeId[];
  quests: Record<QuestId, { progress: number; completed: boolean }>;
  visitedCaves: string[];
  openedChests: string[];
  npcGreeted: {
    villager: boolean;
    explorer: boolean;
    mayor: boolean;
    guard: boolean;
  };
  trailVisits: [string, number][];
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
  blocking: boolean;
  parryActive: boolean;
  relicCooldowns: Record<RelicId, number>;
  relicBuffTimers: {
    wind: number;
    berserk: number;
  };
  season: SeasonId;
  weather: WeatherId;
  seasonRemainingSec: number;
  zoneName: string;
  insideCabin: boolean;
  insideCave: boolean;
  nearCampfire: boolean;
  nearChest: boolean;
  nearWorkbench: boolean;
  nearBed: boolean;
  nearShop: boolean;
  activeMerchantKind: MerchantKind;
  nearNpcLabel: string | null;
  nearResourceLabel: string | null;
  nearVillager: boolean;
  inWater: boolean;
  pointerLocked: boolean;
  autoFollowCam: boolean;
  dofEnabled: boolean;
  shadowUpscale: boolean;
  ecoMode: boolean;
  muted: boolean;
  fps: number;
  frameMs: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  villageX: number;
  villageZ: number;
  trampledCount: number;
  trailCells: TrailCellPoint[];
  minimapEntities: MinimapEntity[];
  quests: QuestProgressState[];
  resources: Record<ResourceId, number>;
  consumables: Record<ConsumableId, number>;
  upgrades: UpgradeId[];
  killFeed: KillFeedItem[];
  lastSavedAt: number | null;
}
