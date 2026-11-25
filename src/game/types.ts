export type GameMode = 'survival' | 'peaceful' | 'creative';
export type CameraViewMode = 'third' | 'first' | 'close' | 'far';
export type WeaponId =
  | 'sword'
  | 'hammer'
  | 'blaster'
  | 'bow'
  | 'axe'
  | 'pickaxe'
  | 'builder'
  | 'katana'
  | 'greatsword'
  | 'dagger'
  | 'scimitar'
  | 'rapier'
  | 'shadow_blade'
  | 'fire_sword'
  | 'frost_blade'
  | 'battleaxe'
  | 'war_mace'
  | 'flail'
  | 'frost_hammer'
  | 'thunder_maul'
  | 'spear'
  | 'halberd'
  | 'trident'
  | 'scythe'
  | 'crossbow'
  | 'recurve_bow'
  | 'void_bow'
  | 'plasma_rifle'
  | 'laser_pistol'
  | 'fire_staff'
  | 'frost_staff'
  | 'void_orb';

export interface WeaponDef {
  id: WeaponId;
  key: string;
  name: string;
  kind: 'melee' | 'ranged' | 'tool';
  category?: 'blade' | 'heavy' | 'polearm' | 'ranged' | 'magic' | 'tool';
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
    category: 'blade',
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
    category: 'heavy',
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
    category: 'ranged',
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
    category: 'ranged',
    damage: 38,
    cooldown: 0.56,
    range: 42,
    knockback: 6.5,
    accentHex: '#a3e635',
    description: 'Точні стріли з високою шкодою',
  },
  {
    id: 'axe',
    key: '5',
    name: 'Сокира',
    kind: 'melee',
    category: 'tool',
    damage: 24,
    cooldown: 0.44,
    range: 3.6,
    knockback: 6.5,
    accentHex: '#fb923c',
    description: 'Рубає дерева на деревину та завдає ударів ворогам',
  },
  {
    id: 'pickaxe',
    key: 'P',
    name: 'Кирка',
    kind: 'melee',
    category: 'tool',
    damage: 26,
    cooldown: 0.42,
    range: 3.6,
    knockback: 7.0,
    accentHex: '#94a3b8',
    description: 'Видобуває камінь на галявинах і руду в печерах (клавіша P)',
  },
  {
    id: 'builder',
    key: '6',
    name: 'Будівельник',
    kind: 'tool',
    category: 'tool',
    damage: 0,
    cooldown: 0.2,
    range: 6.5,
    knockback: 0,
    accentHex: '#4ade80',
    description: 'Киянка майстра для спорудження власного будинку та верстаків',
  },
  // 25 нових видів зброї (v9)
  {
    id: 'katana',
    key: '',
    name: 'Катана Тіні',
    kind: 'melee',
    category: 'blade',
    damage: 34,
    cooldown: 0.27,
    range: 3.6,
    knockback: 6.5,
    accentHex: '#e879f9',
    description: 'Блискавичний вигнутий клинок з надшвидкою серією атак',
  },
  {
    id: 'greatsword',
    key: '',
    name: 'Дворучний Клеймор',
    kind: 'melee',
    category: 'blade',
    damage: 58,
    cooldown: 0.68,
    range: 4.3,
    knockback: 13.0,
    accentHex: '#f97316',
    description: 'Велетенський меч, що зносить ворогів широкою дугою',
  },
  {
    id: 'dagger',
    key: '',
    name: 'Ельфійський Кинджал',
    kind: 'melee',
    category: 'blade',
    damage: 22,
    cooldown: 0.19,
    range: 2.7,
    knockback: 4.0,
    accentHex: '#34d399',
    description: 'Найшвидший клинок долини для безперервних комбо',
  },
  {
    id: 'scimitar',
    key: '',
    name: 'Шабля Пустелі',
    kind: 'melee',
    category: 'blade',
    damage: 32,
    cooldown: 0.3,
    range: 3.5,
    knockback: 7.0,
    accentHex: '#fbbf24',
    description: 'Вигнута золота шабля майстрів піщаних дюн',
  },
  {
    id: 'rapier',
    key: '',
    name: 'Дуельна Рапіра',
    kind: 'melee',
    category: 'blade',
    damage: 29,
    cooldown: 0.24,
    range: 3.8,
    knockback: 5.2,
    accentHex: '#93c5fd',
    description: 'Тонке колюче лезо з великою дальністю випаду',
  },
  {
    id: 'shadow_blade',
    key: '',
    name: 'Клинок Пустоти',
    kind: 'melee',
    category: 'blade',
    damage: 64,
    cooldown: 0.44,
    range: 4.1,
    knockback: 10.5,
    accentHex: '#a855f7',
    description: 'Темний рунічний меч з фіолетовою енергією безодні',
  },
  {
    id: 'fire_sword',
    key: '',
    name: 'Вогняний Меч',
    kind: 'melee',
    category: 'blade',
    damage: 46,
    cooldown: 0.36,
    range: 3.7,
    knockback: 8.8,
    accentHex: '#ef4444',
    description: 'Розпечений клинок вулкану, що обпалює ворогів',
  },
  {
    id: 'frost_blade',
    key: '',
    name: 'Крижаний Клинок',
    kind: 'melee',
    category: 'blade',
    damage: 42,
    cooldown: 0.35,
    range: 3.7,
    knockback: 8.2,
    accentHex: '#38bdf8',
    description: 'Льодовий меч з північних вершин, що сповільнює мобів',
  },
  {
    id: 'battleaxe',
    key: '',
    name: 'Бойова Секира',
    kind: 'melee',
    category: 'heavy',
    damage: 52,
    cooldown: 0.58,
    range: 3.9,
    knockback: 11.5,
    accentHex: '#dc2626',
    description: 'Дволезова сокира берсерка з величезною руйнівною силою',
  },
  {
    id: 'war_mace',
    key: '',
    name: 'Шипована Булава',
    kind: 'melee',
    category: 'heavy',
    damage: 45,
    cooldown: 0.54,
    range: 3.6,
    knockback: 12.5,
    accentHex: '#a1a1aa',
    description: 'Важка сталева булава, що пробиває панцир големів',
  },
  {
    id: 'flail',
    key: '',
    name: 'Ланцюговий Кистень',
    kind: 'melee',
    category: 'heavy',
    damage: 50,
    cooldown: 0.6,
    range: 4.2,
    knockback: 12.0,
    accentHex: '#f59e0b',
    description: 'Шипована куля на ланцюгу з потужним круговим замахом',
  },
  {
    id: 'frost_hammer',
    key: '',
    name: 'Молот Зими',
    kind: 'melee',
    category: 'heavy',
    damage: 62,
    cooldown: 0.74,
    range: 4.3,
    knockback: 15.5,
    accentHex: '#7dd3fc',
    description: 'Морозний удар по землі, що заморожує ворогів довкола',
  },
  {
    id: 'thunder_maul',
    key: '',
    name: 'Громовий Кувалдо-Молот',
    kind: 'melee',
    category: 'heavy',
    damage: 70,
    cooldown: 0.78,
    range: 4.5,
    knockback: 17.0,
    accentHex: '#facc15',
    description: 'Легендарний молот грому з гігантською ударною хвилею',
  },
  {
    id: 'spear',
    key: '',
    name: 'Сталевий Спис',
    kind: 'melee',
    category: 'polearm',
    damage: 35,
    cooldown: 0.38,
    range: 4.8,
    knockback: 8.0,
    accentHex: '#cbd5e1',
    description: 'Довгий спис, що тримає ворогів на безпечній відстані',
  },
  {
    id: 'halberd',
    key: '',
    name: 'Вартова Алебарда',
    kind: 'melee',
    category: 'polearm',
    damage: 56,
    cooldown: 0.62,
    range: 4.9,
    knockback: 11.5,
    accentHex: '#fb923c',
    description: 'Королівська алебарда з широким радіусом ураження',
  },
  {
    id: 'trident',
    key: '',
    name: 'Тризуб Глибин',
    kind: 'melee',
    category: 'polearm',
    damage: 48,
    cooldown: 0.48,
    range: 4.7,
    knockback: 10.0,
    accentHex: '#06b6d4',
    description: 'Морський тризуб зі смарагдово-бірюзовими вістрями',
  },
  {
    id: 'scythe',
    key: '',
    name: 'Жниварська Коса Тіней',
    kind: 'melee',
    category: 'polearm',
    damage: 60,
    cooldown: 0.56,
    range: 4.6,
    knockback: 10.5,
    accentHex: '#c084fc',
    description: 'Широка бойова коса, що прорізає одразу групу мобів',
  },
  {
    id: 'crossbow',
    key: '',
    name: 'Арбалет Вартового',
    kind: 'ranged',
    category: 'ranged',
    damage: 52,
    cooldown: 0.62,
    range: 46,
    knockback: 8.5,
    accentHex: '#f59e0b',
    description: 'Потужні сталеві болти з високою пробивною силою',
  },
  {
    id: 'recurve_bow',
    key: '',
    name: 'Мисливський Лук Дюн',
    kind: 'ranged',
    category: 'ranged',
    damage: 44,
    cooldown: 0.44,
    range: 44,
    knockback: 7.0,
    accentHex: '#fde047',
    description: 'Швидкострільний композитний лук мандрівників пустелі',
  },
  {
    id: 'void_bow',
    key: '',
    name: 'Лук Пустоти',
    kind: 'ranged',
    category: 'ranged',
    damage: 68,
    cooldown: 0.52,
    range: 50,
    knockback: 9.5,
    accentHex: '#c084fc',
    description: 'Магічний лук, що випускає надшвидкі фіолетові стріли',
  },
  {
    id: 'plasma_rifle',
    key: '',
    name: 'Плазмова Гвинтівка',
    kind: 'ranged',
    category: 'ranged',
    damage: 36,
    cooldown: 0.24,
    range: 40,
    knockback: 5.5,
    accentHex: '#22d3ee',
    description: 'Високоточні скорострільні промені блакитної плазми',
  },
  {
    id: 'laser_pistol',
    key: '',
    name: 'Лазерний Пістолет',
    kind: 'ranged',
    category: 'ranged',
    damage: 26,
    cooldown: 0.17,
    range: 34,
    knockback: 3.5,
    accentHex: '#f43f5e',
    description: 'Ультрашвидкі червоні імпульси для динамічного бою',
  },
  {
    id: 'fire_staff',
    key: '',
    name: 'Посох Полум’я',
    kind: 'ranged',
    category: 'magic',
    damage: 54,
    cooldown: 0.5,
    range: 38,
    knockback: 9.0,
    accentHex: '#f97316',
    description: 'Метає вогняні кулі з вибухом по площі при влучанні',
  },
  {
    id: 'frost_staff',
    key: '',
    name: 'Посох Льоду',
    kind: 'ranged',
    category: 'magic',
    damage: 46,
    cooldown: 0.44,
    range: 38,
    knockback: 8.0,
    accentHex: '#38bdf8',
    description: 'Крижані сфери, що заморожують та гальмують ворогів',
  },
  {
    id: 'void_orb',
    key: '',
    name: 'Сфера Безодні',
    kind: 'ranged',
    category: 'magic',
    damage: 74,
    cooldown: 0.58,
    range: 42,
    knockback: 11.0,
    accentHex: '#a855f7',
    description: 'Темна магічна сфера з руйнівним вибухом пустоти',
  },
];

export type BuildPieceKind =
  | 'floor'
  | 'wall'
  | 'window_wall'
  | 'doorway'
  | 'stairs'
  | 'pillar'
  | 'balcony'
  | 'roof'
  | 'roof_peak'
  | 'roof_flat'
  | 'bed'
  | 'fireplace'
  | 'workbench'
  | 'campfire'
  | 'lantern';

export interface BuildPieceDef {
  id: BuildPieceKind;
  name: string;
  shortName: string;
  cost: Partial<Record<ResourceId, number>>;
  usesWorkbenchStock?: boolean;
  description: string;
}

export const BUILD_PIECES: BuildPieceDef[] = [
  {
    id: 'floor',
    name: 'Дерев’яна підлога',
    shortName: 'Підлога',
    cost: { wood: 2 },
    description: 'Просторий поміст 4.0×4.0 м — фундамент 1-го, 2-го, 3-го і вищих поверхів',
  },
  {
    id: 'wall',
    name: 'Стіна з брусів',
    shortName: 'Стіна',
    cost: { wood: 2, stone: 1 },
    description: 'Масивна стіна з колод на кам’яному цоколі (ширина 4.0 м, висота 3.1 м)',
  },
  {
    id: 'window_wall',
    name: 'Стіна з вікном',
    shortName: 'Вікно',
    cost: { wood: 2, stone: 1 },
    description: 'Широка стіна 4.0 м із великим світлим вікном та рамою',
  },
  {
    id: 'doorway',
    name: 'Дверний отвір',
    shortName: 'Двері',
    cost: { wood: 3 },
    description: 'Просторий вхід 4.0 м із подвійним порталом і живими дверима',
  },
  {
    id: 'stairs',
    name: 'Сходи на поверх',
    shortName: 'Сходи',
    cost: { wood: 3 },
    description: 'Широкі зручні сходи з поручнями для підйому на 2-й і вищі поверхи (+3.4 м)',
  },
  {
    id: 'pillar',
    name: 'Опорна колона',
    shortName: 'Колона',
    cost: { wood: 1, stone: 1 },
    description: 'Висока колона 3.1 м для терас, арок та багатоповерхових залів',
  },
  {
    id: 'balcony',
    name: 'Перила / Балкон',
    shortName: 'Перила',
    cost: { wood: 2 },
    description: 'Широка 4-метрова балюстрада для балконів і верхніх терас',
  },
  {
    id: 'roof',
    name: 'Схил даху',
    shortName: 'Дах',
    cost: { wood: 2 },
    description: 'Широкий односхилий черепичний дах 4.2×4.2 м — ставиться на будь-який поверх',
  },
  {
    id: 'roof_peak',
    name: 'Двосхилий дах',
    shortName: 'Коник',
    cost: { wood: 3 },
    description: 'Великий двосхилий дах із кроквами та фронтоном для просторих будинків',
  },
  {
    id: 'roof_flat',
    name: 'Тераса / Перекриття',
    shortName: 'Тераса',
    cost: { wood: 2, stone: 1 },
    description: 'Просторове кам’яно-дерев’яне перекриття 4.0×4.0 м для верхніх поверхів',
  },
  {
    id: 'bed',
    name: 'Затишне ліжко',
    shortName: 'Ліжко',
    cost: { wood: 3, hide: 1 },
    description: 'Велике двоспальне ліжко: натисніть E, щоб повністю відновитись і зберегтись',
  },
  {
    id: 'fireplace',
    name: 'Камін із димарем',
    shortName: 'Камін',
    cost: { stone: 4, wood: 2 },
    description: 'Великий кам’яний камін: зігріває, лікує в домі та смажить м’ясо (E)',
  },
  {
    id: 'workbench',
    name: 'Верстак',
    shortName: 'Верстак',
    cost: { wood: 4, stone: 2 },
    usesWorkbenchStock: true,
    description: 'Велика станція крафту (береться із запасу або з ресурсів)',
  },
  {
    id: 'campfire',
    name: 'Вогнище (Костер)',
    shortName: 'Костер',
    cost: { wood: 3, stone: 2 },
    description: 'Велике вогнище з рожном: зігріває, лікує та смажить м’ясо (E)',
  },
  {
    id: 'lantern',
    name: 'Стовп-ліхтар',
    shortName: 'Ліхтар',
    cost: { wood: 1, iron: 1 },
    description: 'Високий вуличний або дворовий ліхтар 3.0 м',
  },
];

export interface BuiltStructureData {
  id: string;
  kind: BuildPieceKind;
  x: number;
  y: number;
  z: number;
  rotY: number;
}

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

export type MobKind =
  | 'slime'
  | 'goblin'
  | 'wolf'
  | 'skeleton'
  | 'golem'
  | 'boss'
  | 'final_boss'
  | 'secret_boss'
  | 'mushroom_imp'
  | 'dire_boar'
  | 'giant_spider'
  | 'forest_ent'
  | 'bandit_raider'
  | 'swamp_witch'
  | 'desert_scorpion'
  | 'sand_mummy'
  | 'dune_stalker'
  | 'sand_colossus'
  | 'frost_yeti'
  | 'ice_wraith'
  | 'crystal_golem'
  | 'void_bat'
  | 'magma_hound'
  | 'lava_imp'
  | 'cursed_knight';
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
  behavior?: 'melee' | 'ranged' | 'charger';
  projectileColor?: number;
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
  final_boss: {
    kind: 'final_boss',
    name: 'Володар Безодні Малакор',
    maxHp: 720,
    damage: 38,
    speed: 5.1,
    attackRange: 3.5,
    attackCooldown: 1.35,
    aggroRadius: 36,
    rewardCoins: 450,
    rewardXp: 500,
    radius: 1.35,
    height: 4.4,
  },
  secret_boss: {
    kind: 'secret_boss',
    name: 'Архонт Пустоти (Секрет)',
    maxHp: 1350,
    damage: 48,
    speed: 5.8,
    attackRange: 4.0,
    attackCooldown: 1.15,
    aggroRadius: 44,
    rewardCoins: 950,
    rewardXp: 1200,
    radius: 1.55,
    height: 5.1,
  },
  // 17 нових ворожих мобів (v9)
  mushroom_imp: {
    kind: 'mushroom_imp',
    name: 'Грибний Біс',
    maxHp: 58,
    damage: 12,
    speed: 4.4,
    attackRange: 1.9,
    attackCooldown: 1.0,
    aggroRadius: 19,
    rewardCoins: 18,
    rewardXp: 28,
    radius: 0.65,
    height: 1.55,
  },
  dire_boar: {
    kind: 'dire_boar',
    name: 'Лютий Кабан',
    maxHp: 95,
    damage: 18,
    speed: 5.8,
    attackRange: 2.1,
    attackCooldown: 1.15,
    aggroRadius: 23,
    rewardCoins: 30,
    rewardXp: 46,
    radius: 0.85,
    height: 1.55,
    behavior: 'charger',
  },
  giant_spider: {
    kind: 'giant_spider',
    name: 'Гігантський Павук',
    maxHp: 82,
    damage: 17,
    speed: 6.5,
    attackRange: 2.1,
    attackCooldown: 0.85,
    aggroRadius: 24,
    rewardCoins: 32,
    rewardXp: 50,
    radius: 0.9,
    height: 1.25,
  },
  forest_ent: {
    kind: 'forest_ent',
    name: 'Лісовий Ент',
    maxHp: 210,
    damage: 26,
    speed: 2.8,
    attackRange: 2.8,
    attackCooldown: 1.65,
    aggroRadius: 24,
    rewardCoins: 68,
    rewardXp: 95,
    radius: 1.15,
    height: 3.4,
  },
  bandit_raider: {
    kind: 'bandit_raider',
    name: 'Лісовий Розбійник',
    maxHp: 115,
    damage: 21,
    speed: 5.3,
    attackRange: 2.2,
    attackCooldown: 0.95,
    aggroRadius: 24,
    rewardCoins: 45,
    rewardXp: 64,
    radius: 0.72,
    height: 2.25,
  },
  swamp_witch: {
    kind: 'swamp_witch',
    name: 'Болотна Відьма',
    maxHp: 98,
    damage: 20,
    speed: 3.8,
    attackRange: 14,
    attackCooldown: 1.8,
    aggroRadius: 25,
    rewardCoins: 48,
    rewardXp: 72,
    radius: 0.72,
    height: 2.35,
    behavior: 'ranged',
    projectileColor: 0x84cc16,
  },
  desert_scorpion: {
    kind: 'desert_scorpion',
    name: 'Пустельний Скорпіон',
    maxHp: 125,
    damage: 22,
    speed: 5.6,
    attackRange: 2.3,
    attackCooldown: 0.95,
    aggroRadius: 24,
    rewardCoins: 50,
    rewardXp: 74,
    radius: 0.92,
    height: 1.5,
  },
  sand_mummy: {
    kind: 'sand_mummy',
    name: 'Піщана Мумія',
    maxHp: 145,
    damage: 23,
    speed: 3.7,
    attackRange: 2.2,
    attackCooldown: 1.15,
    aggroRadius: 22,
    rewardCoins: 54,
    rewardXp: 78,
    radius: 0.74,
    height: 2.25,
  },
  dune_stalker: {
    kind: 'dune_stalker',
    name: 'Мисливець Дюн',
    maxHp: 120,
    damage: 25,
    speed: 6.6,
    attackRange: 2.2,
    attackCooldown: 0.9,
    aggroRadius: 26,
    rewardCoins: 56,
    rewardXp: 82,
    radius: 0.76,
    height: 2.15,
    behavior: 'charger',
  },
  sand_colossus: {
    kind: 'sand_colossus',
    name: 'Піщаний Колос',
    maxHp: 280,
    damage: 31,
    speed: 3.0,
    attackRange: 2.9,
    attackCooldown: 1.6,
    aggroRadius: 25,
    rewardCoins: 95,
    rewardXp: 130,
    radius: 1.25,
    height: 3.5,
  },
  frost_yeti: {
    kind: 'frost_yeti',
    name: 'Сніговий Єті',
    maxHp: 260,
    damage: 29,
    speed: 3.9,
    attackRange: 2.7,
    attackCooldown: 1.4,
    aggroRadius: 25,
    rewardCoins: 88,
    rewardXp: 120,
    radius: 1.15,
    height: 3.15,
  },
  ice_wraith: {
    kind: 'ice_wraith',
    name: 'Крижаний Дух',
    maxHp: 135,
    damage: 24,
    speed: 4.7,
    attackRange: 15,
    attackCooldown: 1.75,
    aggroRadius: 26,
    rewardCoins: 64,
    rewardXp: 92,
    radius: 0.78,
    height: 2.6,
    behavior: 'ranged',
    projectileColor: 0x38bdf8,
  },
  crystal_golem: {
    kind: 'crystal_golem',
    name: 'Кришталевий Голем',
    maxHp: 310,
    damage: 33,
    speed: 3.2,
    attackRange: 2.9,
    attackCooldown: 1.55,
    aggroRadius: 26,
    rewardCoins: 110,
    rewardXp: 150,
    radius: 1.25,
    height: 3.45,
  },
  void_bat: {
    kind: 'void_bat',
    name: 'Печерний Кажан',
    maxHp: 76,
    damage: 16,
    speed: 6.2,
    attackRange: 13,
    attackCooldown: 1.45,
    aggroRadius: 25,
    rewardCoins: 34,
    rewardXp: 52,
    radius: 0.65,
    height: 2.2,
    behavior: 'ranged',
    projectileColor: 0xc084fc,
  },
  magma_hound: {
    kind: 'magma_hound',
    name: 'Магмовий Пес',
    maxHp: 165,
    damage: 27,
    speed: 6.8,
    attackRange: 2.2,
    attackCooldown: 0.95,
    aggroRadius: 27,
    rewardCoins: 72,
    rewardXp: 105,
    radius: 0.85,
    height: 1.55,
    behavior: 'charger',
  },
  lava_imp: {
    kind: 'lava_imp',
    name: 'Лавовий Імп',
    maxHp: 150,
    damage: 26,
    speed: 4.3,
    attackRange: 16,
    attackCooldown: 1.6,
    aggroRadius: 28,
    rewardCoins: 68,
    rewardXp: 98,
    radius: 0.72,
    height: 2.05,
    behavior: 'ranged',
    projectileColor: 0xf97316,
  },
  cursed_knight: {
    kind: 'cursed_knight',
    name: 'Проклятий Лицар',
    maxHp: 390,
    damage: 36,
    speed: 4.8,
    attackRange: 2.8,
    attackCooldown: 1.2,
    aggroRadius: 29,
    rewardCoins: 145,
    rewardXp: 195,
    radius: 0.95,
    height: 2.85,
  },
};

export type ResourceId = 'wood' | 'stone' | 'iron' | 'herb' | 'essence' | 'hide' | 'raw_meat';
export type ConsumableId =
  | 'potion'
  | 'mega_potion'
  | 'tonic'
  | 'stew'
  | 'cooked_meat'
  | 'rage_potion'
  | 'swift_potion'
  | 'iron_skin_potion'
  | 'phoenix_elixir'
  // 54 нових зілля та еліксирів (v11)
  | 'berry_elixir'
  | 'forest_nectar'
  | 'sunflower_tea'
  | 'honey_mead'
  | 'mint_infusion'
  | 'amber_salve'
  | 'crimson_draught'
  | 'emerald_brew'
  | 'guardian_broth'
  | 'hearth_soup'
  | 'vital_serum'
  | 'druid_elixir'
  | 'moonwell_water'
  | 'solar_nectar'
  | 'wind_tincture'
  | 'hare_potion'
  | 'gale_elixir'
  | 'zephyr_brew'
  | 'lightning_vial'
  | 'feather_tonic'
  | 'sprint_elixir'
  | 'skywalker_draught'
  | 'falcon_potion'
  | 'hurricane_essence'
  | 'wolf_blood'
  | 'bear_strength'
  | 'lion_roar'
  | 'fire_fury'
  | 'blood_rage'
  | 'crimson_blade_oil'
  | 'titan_might'
  | 'dragon_breath_vial'
  | 'thunder_fury'
  | 'void_wrath'
  | 'granite_potion'
  | 'barkskin_elixir'
  | 'turtle_shell_brew'
  | 'obsidian_tonic'
  | 'bastion_draught'
  | 'aegis_potion'
  | 'frost_veil_elixir'
  | 'glacier_potion'
  | 'vampire_elixir'
  | 'crimson_leech'
  | 'immortal_draught'
  | 'titan_blood_vial'
  | 'scholar_tea'
  | 'sage_elixir'
  | 'arcane_wisdom'
  | 'midas_tincture'
  | 'golden_draught'
  | 'fortune_brew'
  | 'starlight_elixir'
  | 'abyssal_essence_potion';

export type PotionBuffKey =
  | 'rage'
  | 'swift'
  | 'ironSkin'
  | 'regen'
  | 'vampire'
  | 'frostAura'
  | 'berserk'
  | 'titanShield';

export interface ConsumableMeta {
  id: ConsumableId;
  name: string;
  hotkey?: string;
  effect: string;
  kind: 'heal' | 'buff' | 'food';
  accentHex: string;
  hpGain?: number;
  hpPct?: number;
  staminaGain?: number;
  staminaPct?: number;
  xpGain?: number;
  coinsGain?: number;
  buff?: { stat: PotionBuffKey; duration: number };
  extraBuff?: { stat: PotionBuffKey; duration: number };
  craftCost?: Partial<Record<ResourceId, number>>;
  requiresWorkbench?: boolean;
  shopPrice?: number;
  merchant?: MerchantKind;
}

interface ExtraPotionSpec {
  id: ConsumableId;
  name: string;
  effect: string;
  kind: 'heal' | 'buff' | 'food';
  accentHex: string;
  hpGain?: number;
  hpPct?: number;
  staminaGain?: number;
  staminaPct?: number;
  xpGain?: number;
  coinsGain?: number;
  buff?: { stat: PotionBuffKey; duration: number };
  extraBuff?: { stat: PotionBuffKey; duration: number };
  craftCost: Partial<Record<ResourceId, number>>;
  requiresWorkbench?: boolean;
  shopPrice: number;
  merchant: MerchantKind;
}

const EXTRA_POTION_SPECS: ExtraPotionSpec[] = [
  // Лікування та їжа (14)
  { id: 'berry_elixir', name: 'Ягідний Еліксир', effect: '+35 HP та +25 витривалості', kind: 'heal', accentHex: '#ec4899', hpGain: 35, staminaGain: 25, craftCost: { herb: 1, wood: 1 }, shopPrice: 16, merchant: 'herbalist' },
  { id: 'forest_nectar', name: 'Лісовий Нектар', effect: '+65 HP миттєво', kind: 'heal', accentHex: '#22c55e', hpGain: 65, craftCost: { herb: 2, essence: 1 }, shopPrice: 28, merchant: 'herbalist' },
  { id: 'sunflower_tea', name: 'Соняшниковий Чай', effect: '+45 HP, +50 витр. та реген 8 с', kind: 'food', accentHex: '#facc15', hpGain: 45, staminaGain: 50, buff: { stat: 'regen', duration: 8 }, craftCost: { herb: 2, wood: 1 }, shopPrice: 26, merchant: 'baker' },
  { id: 'honey_mead', name: 'Медова Сита', effect: '+75 HP, +65 витривалості', kind: 'food', accentHex: '#f59e0b', hpGain: 75, staminaGain: 65, craftCost: { herb: 2, raw_meat: 1 }, shopPrice: 36, merchant: 'baker' },
  { id: 'mint_infusion', name: 'М’ятний Настій', effect: '+40 HP та +90 витривалості', kind: 'heal', accentHex: '#34d399', hpGain: 40, staminaGain: 90, craftCost: { herb: 2 }, shopPrice: 22, merchant: 'herbalist' },
  { id: 'amber_salve', name: 'Бурштиновий Бальзам', effect: '+95 HP + реген на 12 с', kind: 'heal', accentHex: '#d97706', hpGain: 95, buff: { stat: 'regen', duration: 12 }, craftCost: { herb: 3, essence: 1 }, shopPrice: 44, merchant: 'alchemist' },
  { id: 'crimson_draught', name: 'Багряний Напій', effect: '+140 HP миттєво', kind: 'heal', accentHex: '#dc2626', hpGain: 140, craftCost: { herb: 4, essence: 2 }, requiresWorkbench: true, shopPrice: 54, merchant: 'alchemist' },
  { id: 'emerald_brew', name: 'Смарагдове Вариво', effect: '+165 HP та +40 витр.', kind: 'heal', accentHex: '#10b981', hpGain: 165, staminaGain: 40, craftCost: { herb: 5, essence: 2 }, requiresWorkbench: true, shopPrice: 64, merchant: 'alchemist' },
  { id: 'guardian_broth', name: 'Відвар Вартового', effect: '+110 HP + Залізна Шкіра 16 с', kind: 'food', accentHex: '#60a5fa', hpGain: 110, buff: { stat: 'ironSkin', duration: 16 }, craftCost: { raw_meat: 1, herb: 2, iron: 1 }, shopPrice: 52, merchant: 'baker' },
  { id: 'hearth_soup', name: 'Борщ Вогнища', effect: '+120 HP, 100% витр. + реген 10 с', kind: 'food', accentHex: '#ef4444', hpGain: 120, staminaPct: 1, buff: { stat: 'regen', duration: 10 }, craftCost: { raw_meat: 2, herb: 2, wood: 1 }, shopPrice: 56, merchant: 'baker' },
  { id: 'vital_serum', name: 'Сироватка Життя', effect: '+60% Макс. HP + реген 14 с', kind: 'heal', accentHex: '#f43f5e', hpPct: 0.6, buff: { stat: 'regen', duration: 14 }, craftCost: { herb: 4, essence: 3 }, requiresWorkbench: true, shopPrice: 74, merchant: 'alchemist' },
  { id: 'druid_elixir', name: 'Еліксир Друїда', effect: '+80 HP + регенерація на 28 с', kind: 'heal', accentHex: '#4ade80', hpGain: 80, buff: { stat: 'regen', duration: 28 }, craftCost: { herb: 5, wood: 2, essence: 2 }, requiresWorkbench: true, shopPrice: 72, merchant: 'herbalist' },
  { id: 'moonwell_water', name: 'Вода Місячного Джерела', effect: '85% HP + 100% витр. + реген 15 с', kind: 'heal', accentHex: '#38bdf8', hpPct: 0.85, staminaPct: 1, buff: { stat: 'regen', duration: 15 }, craftCost: { herb: 4, essence: 3 }, requiresWorkbench: true, shopPrice: 82, merchant: 'alchemist' },
  { id: 'solar_nectar', name: 'Сонячний Нектар', effect: '100% HP, 100% витр. + Лють 15 с', kind: 'heal', accentHex: '#fbbf24', hpPct: 1, staminaPct: 1, buff: { stat: 'rage', duration: 15 }, craftCost: { herb: 5, essence: 4 }, requiresWorkbench: true, shopPrice: 98, merchant: 'alchemist' },

  // Швидкість та витривалість (10)
  { id: 'wind_tincture', name: 'Настоянка Вітру', effect: '+38% швидкості на 18 с + 40 витр.', kind: 'buff', accentHex: '#7dd3fc', staminaGain: 40, buff: { stat: 'swift', duration: 18 }, craftCost: { herb: 2, wood: 1 }, shopPrice: 30, merchant: 'herbalist' },
  { id: 'hare_potion', name: 'Зілля Стрибкого Зайця', effect: '+38% швидкості на 24 с + 70 витр.', kind: 'buff', accentHex: '#a3e635', staminaGain: 70, buff: { stat: 'swift', duration: 24 }, craftCost: { herb: 2, hide: 1 }, shopPrice: 36, merchant: 'general' },
  { id: 'gale_elixir', name: 'Еліксир Шквалу', effect: '+38% швидкості на 32 с + 100% витр.', kind: 'buff', accentHex: '#22d3ee', staminaPct: 1, buff: { stat: 'swift', duration: 32 }, craftCost: { herb: 3, essence: 1 }, shopPrice: 46, merchant: 'alchemist' },
  { id: 'zephyr_brew', name: 'Зефірний Напій', effect: '100% витр. + швидкість 25 с + +30 HP', kind: 'buff', accentHex: '#67e8f9', hpGain: 30, staminaPct: 1, buff: { stat: 'swift', duration: 25 }, craftCost: { herb: 3, essence: 2 }, shopPrice: 48, merchant: 'herbalist' },
  { id: 'lightning_vial', name: 'Флакон Блискавки', effect: 'Швидкість 35 с + Лють 18 с', kind: 'buff', accentHex: '#fde047', staminaGain: 80, buff: { stat: 'swift', duration: 35 }, extraBuff: { stat: 'rage', duration: 18 }, craftCost: { herb: 3, essence: 3 }, requiresWorkbench: true, shopPrice: 68, merchant: 'alchemist' },
  { id: 'feather_tonic', name: 'Піряний Тонік', effect: '+100% витривалості + швидкість 15 с', kind: 'buff', accentHex: '#bae6fd', staminaPct: 1, buff: { stat: 'swift', duration: 15 }, craftCost: { herb: 2, hide: 1 }, shopPrice: 28, merchant: 'general' },
  { id: 'sprint_elixir', name: 'Еліксир Спринтера', effect: '+38% швидкості на 45 с', kind: 'buff', accentHex: '#06b6d4', staminaPct: 1, buff: { stat: 'swift', duration: 45 }, craftCost: { herb: 4, essence: 2 }, requiresWorkbench: true, shopPrice: 58, merchant: 'alchemist' },
  { id: 'skywalker_draught', name: 'Зілля Небохода', effect: 'Швидкість 40 с + реген 16 с + +50 HP', kind: 'buff', accentHex: '#38bdf8', hpGain: 50, staminaPct: 1, buff: { stat: 'swift', duration: 40 }, extraBuff: { stat: 'regen', duration: 16 }, craftCost: { herb: 4, essence: 3 }, requiresWorkbench: true, shopPrice: 74, merchant: 'alchemist' },
  { id: 'falcon_potion', name: 'Соколине Зілля', effect: 'Швидкість 30 с + Критична Лють 20 с', kind: 'buff', accentHex: '#0ea5e9', buff: { stat: 'swift', duration: 30 }, extraBuff: { stat: 'rage', duration: 20 }, craftCost: { hide: 2, herb: 3, essence: 2 }, requiresWorkbench: true, shopPrice: 66, merchant: 'general' },
  { id: 'hurricane_essence', name: 'Есенція Урагану', effect: 'Швидкість 55 с + 100% витр. + Берсерк 20 с', kind: 'buff', accentHex: '#818cf8', staminaPct: 1, buff: { stat: 'swift', duration: 55 }, extraBuff: { stat: 'berserk', duration: 20 }, craftCost: { essence: 4, herb: 4 }, requiresWorkbench: true, shopPrice: 94, merchant: 'alchemist' },

  // Атака та Лють (10)
  { id: 'wolf_blood', name: 'Кров Вовка', effect: '+50% шкоди на 18 с + 25 HP', kind: 'buff', accentHex: '#f87171', hpGain: 25, buff: { stat: 'rage', duration: 18 }, craftCost: { raw_meat: 1, hide: 1, herb: 1 }, shopPrice: 36, merchant: 'alchemist' },
  { id: 'bear_strength', name: 'Сила Ведмедя', effect: '+50% шкоди на 28 с + 45 HP', kind: 'buff', accentHex: '#b45309', hpGain: 45, buff: { stat: 'rage', duration: 28 }, craftCost: { raw_meat: 2, iron: 1, herb: 2 }, shopPrice: 54, merchant: 'general' },
  { id: 'lion_roar', name: 'Рев Лева', effect: '+45% Берсерк на 22 с + 50 витр.', kind: 'buff', accentHex: '#f59e0b', staminaGain: 50, buff: { stat: 'berserk', duration: 22 }, craftCost: { essence: 2, herb: 2, hide: 1 }, shopPrice: 56, merchant: 'blacksmith' },
  { id: 'fire_fury', name: 'Вогняна Лють', effect: '+50% Лють та +45% Берсерк на 18 с', kind: 'buff', accentHex: '#fb923c', buff: { stat: 'rage', duration: 18 }, extraBuff: { stat: 'berserk', duration: 18 }, craftCost: { essence: 3, raw_meat: 1, iron: 1 }, requiresWorkbench: true, shopPrice: 78, merchant: 'alchemist' },
  { id: 'blood_rage', name: 'Кривава Несамовитість', effect: 'Берсерк 26 с + Вампіризм 16 с', kind: 'buff', accentHex: '#e11d48', buff: { stat: 'berserk', duration: 26 }, extraBuff: { stat: 'vampire', duration: 16 }, craftCost: { essence: 3, raw_meat: 2, herb: 2 }, requiresWorkbench: true, shopPrice: 84, merchant: 'alchemist' },
  { id: 'crimson_blade_oil', name: 'Олія Червоного Клинка', effect: '+50% шкоди на 40 с', kind: 'buff', accentHex: '#ef4444', buff: { stat: 'rage', duration: 40 }, craftCost: { essence: 2, herb: 3, iron: 1 }, requiresWorkbench: true, shopPrice: 60, merchant: 'blacksmith' },
  { id: 'titan_might', name: 'Могутність Титана', effect: 'Лють 35 с + Залізна Шкіра 35 с', kind: 'buff', accentHex: '#ea580c', hpGain: 40, buff: { stat: 'rage', duration: 35 }, extraBuff: { stat: 'ironSkin', duration: 35 }, craftCost: { iron: 2, essence: 3, stone: 2 }, requiresWorkbench: true, shopPrice: 88, merchant: 'blacksmith' },
  { id: 'dragon_breath_vial', name: 'Подих Дракона', effect: 'Лють 30 с + Берсерк 25 с + +60 HP', kind: 'buff', accentHex: '#f97316', hpGain: 60, buff: { stat: 'rage', duration: 30 }, extraBuff: { stat: 'berserk', duration: 25 }, craftCost: { essence: 4, iron: 2, raw_meat: 2 }, requiresWorkbench: true, shopPrice: 105, merchant: 'alchemist' },
  { id: 'thunder_fury', name: 'Громова Шаленість', effect: 'Берсерк 24 с + Швидкість 30 с', kind: 'buff', accentHex: '#eab308', buff: { stat: 'berserk', duration: 24 }, extraBuff: { stat: 'swift', duration: 30 }, craftCost: { essence: 3, herb: 3 }, requiresWorkbench: true, shopPrice: 76, merchant: 'alchemist' },
  { id: 'void_wrath', name: 'Гнів Безодні', effect: 'Лють 45 с + Вампіризм 24 с + 50 HP', kind: 'buff', accentHex: '#9333ea', hpGain: 50, buff: { stat: 'rage', duration: 45 }, extraBuff: { stat: 'vampire', duration: 24 }, craftCost: { essence: 5, iron: 2 }, requiresWorkbench: true, shopPrice: 112, merchant: 'alchemist' },

  // Захист, Лід, Вампіризм і Безсмертя (12)
  { id: 'granite_potion', name: 'Гранітне Зілля', effect: '-45% шкоди на 22 с + 25 HP', kind: 'buff', accentHex: '#94a3b8', hpGain: 25, buff: { stat: 'ironSkin', duration: 22 }, craftCost: { stone: 3, herb: 1 }, shopPrice: 34, merchant: 'blacksmith' },
  { id: 'barkskin_elixir', name: 'Еліксир Кори Дуба', effect: '-45% шкоди на 28 с + реген 10 с', kind: 'buff', accentHex: '#78350f', hpGain: 30, buff: { stat: 'ironSkin', duration: 28 }, extraBuff: { stat: 'regen', duration: 10 }, craftCost: { wood: 3, herb: 2 }, shopPrice: 44, merchant: 'herbalist' },
  { id: 'turtle_shell_brew', name: 'Напій Панциря', effect: '-75% Щит Титана на 14 с + 40 HP', kind: 'buff', accentHex: '#0284c7', hpGain: 40, buff: { stat: 'titanShield', duration: 14 }, craftCost: { stone: 2, iron: 2, herb: 1 }, shopPrice: 64, merchant: 'blacksmith' },
  { id: 'obsidian_tonic', name: 'Обсидіановий Тонік', effect: 'Залізна Шкіра 45 с + 50 HP', kind: 'buff', accentHex: '#334155', hpGain: 50, buff: { stat: 'ironSkin', duration: 45 }, craftCost: { stone: 4, iron: 2, essence: 1 }, requiresWorkbench: true, shopPrice: 66, merchant: 'blacksmith' },
  { id: 'bastion_draught', name: 'Зілля Бастіону', effect: 'Щит Титана 18 с + реген 18 с', kind: 'buff', accentHex: '#3b82f6', hpGain: 65, buff: { stat: 'titanShield', duration: 18 }, extraBuff: { stat: 'regen', duration: 18 }, craftCost: { iron: 3, essence: 2, herb: 3 }, requiresWorkbench: true, shopPrice: 86, merchant: 'blacksmith' },
  { id: 'aegis_potion', name: 'Еліксир Егіди', effect: 'Залізна Шкіра 35 с + Щит Титана 12 с', kind: 'buff', accentHex: '#2563eb', hpGain: 55, buff: { stat: 'ironSkin', duration: 35 }, extraBuff: { stat: 'titanShield', duration: 12 }, craftCost: { iron: 3, essence: 3 }, requiresWorkbench: true, shopPrice: 92, merchant: 'blacksmith' },
  { id: 'frost_veil_elixir', name: 'Крижана Завіса', effect: 'Морозна аура 24 с (уповільнює ворогів)', kind: 'buff', accentHex: '#7dd3fc', hpGain: 35, buff: { stat: 'frostAura', duration: 24 }, craftCost: { essence: 2, herb: 2 }, shopPrice: 48, merchant: 'alchemist' },
  { id: 'glacier_potion', name: 'Зілля Льодовика', effect: 'Морозна аура 35 с + Залізна Шкіра 30 с', kind: 'buff', accentHex: '#0ea5e9', hpGain: 50, buff: { stat: 'frostAura', duration: 35 }, extraBuff: { stat: 'ironSkin', duration: 30 }, craftCost: { essence: 3, iron: 2, stone: 2 }, requiresWorkbench: true, shopPrice: 82, merchant: 'alchemist' },
  { id: 'vampire_elixir', name: 'Еліксир Вампіра', effect: '+35% Вампіризму від ударів на 22 с', kind: 'buff', accentHex: '#be123c', hpGain: 30, buff: { stat: 'vampire', duration: 22 }, craftCost: { essence: 2, raw_meat: 2, herb: 2 }, shopPrice: 58, merchant: 'alchemist' },
  { id: 'crimson_leech', name: 'Кровава Жатва', effect: 'Вампіризм 32 с + Лють 24 с', kind: 'buff', accentHex: '#9f1239', hpGain: 40, buff: { stat: 'vampire', duration: 32 }, extraBuff: { stat: 'rage', duration: 24 }, craftCost: { essence: 4, raw_meat: 2 }, requiresWorkbench: true, shopPrice: 90, merchant: 'alchemist' },
  { id: 'immortal_draught', name: 'Еліксир Безсмертя', effect: '100% HP + Щит Титана 16 с + реген 24 с', kind: 'buff', accentHex: '#c084fc', hpPct: 1, staminaPct: 1, buff: { stat: 'titanShield', duration: 16 }, extraBuff: { stat: 'regen', duration: 24 }, craftCost: { essence: 5, herb: 5, iron: 2 }, requiresWorkbench: true, shopPrice: 135, merchant: 'alchemist' },
  { id: 'titan_blood_vial', name: 'Кров Титанів', effect: '100% HP + Залізна Шкіра 40 с + Берсерк 25 с', kind: 'buff', accentHex: '#6366f1', hpPct: 1, buff: { stat: 'ironSkin', duration: 40 }, extraBuff: { stat: 'berserk', duration: 25 }, craftCost: { essence: 5, iron: 3, raw_meat: 2 }, requiresWorkbench: true, shopPrice: 130, merchant: 'alchemist' },

  // Досвід, Золото та Рідкісні (8)
  { id: 'scholar_tea', name: 'Чай Мудреця', effect: '+65 XP та +35 HP', kind: 'buff', accentHex: '#a78bfa', hpGain: 35, xpGain: 65, craftCost: { herb: 2, essence: 1 }, shopPrice: 40, merchant: 'alchemist' },
  { id: 'sage_elixir', name: 'Еліксир Просвітлення', effect: '+140 XP та +50 витр.', kind: 'buff', accentHex: '#8b5cf6', staminaGain: 50, xpGain: 140, craftCost: { herb: 3, essence: 2 }, requiresWorkbench: true, shopPrice: 72, merchant: 'alchemist' },
  { id: 'arcane_wisdom', name: 'Таємне Знання', effect: '+260 XP + 100% витр.', kind: 'buff', accentHex: '#7c3aed', staminaPct: 1, xpGain: 260, craftCost: { essence: 4, herb: 3 }, requiresWorkbench: true, shopPrice: 118, merchant: 'alchemist' },
  { id: 'midas_tincture', name: 'Настоянка Мідаса', effect: '+55 монет та +25 HP', kind: 'buff', accentHex: '#facc15', hpGain: 25, coinsGain: 55, craftCost: { iron: 2, essence: 1 }, shopPrice: 38, merchant: 'general' },
  { id: 'golden_draught', name: 'Золотий Еліксир', effect: '+110 монет + швидкість 20 с', kind: 'buff', accentHex: '#eab308', coinsGain: 110, buff: { stat: 'swift', duration: 20 }, craftCost: { iron: 3, essence: 2 }, requiresWorkbench: true, shopPrice: 68, merchant: 'general' },
  { id: 'fortune_brew', name: 'Зілля Фортуни', effect: '+90 монет + 80 XP + 50 HP', kind: 'buff', accentHex: '#fbbf24', hpGain: 50, coinsGain: 90, xpGain: 80, craftCost: { essence: 3, herb: 3, iron: 1 }, requiresWorkbench: true, shopPrice: 88, merchant: 'general' },
  { id: 'starlight_elixir', name: 'Зоряне Сяйво', effect: '100% HP, 100% витр., реген 30 с + 120 XP', kind: 'buff', accentHex: '#38bdf8', hpPct: 1, staminaPct: 1, xpGain: 120, buff: { stat: 'regen', duration: 30 }, craftCost: { essence: 5, herb: 4 }, requiresWorkbench: true, shopPrice: 128, merchant: 'alchemist' },
  { id: 'abyssal_essence_potion', name: 'Сльоза Безодні', effect: 'Лють 40 с + Мороз 40 с + 90 HP', kind: 'buff', accentHex: '#d946ef', hpGain: 90, buff: { stat: 'rage', duration: 40 }, extraBuff: { stat: 'frostAura', duration: 40 }, craftCost: { essence: 6, iron: 2, herb: 3 }, requiresWorkbench: true, shopPrice: 145, merchant: 'alchemist' },
];

export const CONSUMABLES: ConsumableMeta[] = [
  {
    id: 'potion',
    name: 'Зілля лікування',
    hotkey: '8',
    effect: '+50 HP миттєво',
    kind: 'heal',
    accentHex: '#ef4444',
    hpGain: 50,
  },
  {
    id: 'mega_potion',
    name: 'Велике зілля зцілення',
    hotkey: '9',
    effect: '+120 HP миттєво',
    kind: 'heal',
    accentHex: '#f43f5e',
    hpGain: 120,
  },
  {
    id: 'cooked_meat',
    name: 'Смажене м’ясо',
    hotkey: '0',
    effect: '+65 HP та +40 витривалості',
    kind: 'food',
    accentHex: '#f97316',
    hpGain: 65,
    staminaGain: 40,
  },
  {
    id: 'tonic',
    name: 'Трав’яний тонік',
    hotkey: '-',
    effect: '+70 витривалості та +15 HP',
    kind: 'heal',
    accentHex: '#10b981',
    hpGain: 15,
    staminaGain: 70,
  },
  {
    id: 'stew',
    name: 'Мисливська юшка',
    hotkey: '=',
    effect: '+85 HP та повна витривалість',
    kind: 'food',
    accentHex: '#eab308',
    hpGain: 85,
    staminaPct: 1,
  },
  {
    id: 'rage_potion',
    name: 'Еліксир Лютої Сили',
    effect: '+50% шкоди на 25 с та +20 HP',
    kind: 'buff',
    accentHex: '#fb923c',
    hpGain: 20,
    buff: { stat: 'rage', duration: 25 },
  },
  {
    id: 'swift_potion',
    name: 'Зілля Блискавиці',
    effect: '+38% швидкості на 25 с та +50 витр.',
    kind: 'buff',
    accentHex: '#06b6d4',
    staminaGain: 50,
    buff: { stat: 'swift', duration: 25 },
  },
  {
    id: 'iron_skin_potion',
    name: 'Зілля Залізної Шкіри',
    effect: '-45% вхідної шкоди на 30 с та +30 HP',
    kind: 'buff',
    accentHex: '#60a5fa',
    hpGain: 30,
    buff: { stat: 'ironSkin', duration: 30 },
  },
  {
    id: 'phoenix_elixir',
    name: 'Еліксир Фенікса',
    effect: '100% HP, 100% витривалості та +12 HP/с (20 с)',
    kind: 'buff',
    accentHex: '#c084fc',
    hpPct: 1,
    staminaPct: 1,
    buff: { stat: 'regen', duration: 20 },
  },
  ...EXTRA_POTION_SPECS.map((p): ConsumableMeta => ({ ...p })),
];

export function createDefaultConsumables(): Record<ConsumableId, number> {
  const out = {} as Record<ConsumableId, number>;
  for (let i = 0; i < CONSUMABLES.length; i++) {
    const id = CONSUMABLES[i].id;
    out[id] = id === 'potion' ? 1 : 0;
  }
  return out;
}

export type RelicId =
  | 'amulet_vitality'
  | 'cloak_wind'
  | 'rune_power'
  | 'frost_crown'
  | 'thunder_totem'
  | 'vampire_fang'
  | 'titan_aegis'
  | 'phoenix_feather'
  | 'void_step';

export type UpgradeId =
  | 'weapon_sword'
  | 'weapon_hammer'
  | 'weapon_blaster'
  | 'weapon_bow'
  | 'tool_axe'
  | 'tool_pickaxe'
  | 'weapon_katana'
  | 'weapon_greatsword'
  | 'weapon_dagger'
  | 'weapon_scimitar'
  | 'weapon_rapier'
  | 'weapon_shadow_blade'
  | 'weapon_fire_sword'
  | 'weapon_frost_blade'
  | 'weapon_battleaxe'
  | 'weapon_war_mace'
  | 'weapon_flail'
  | 'weapon_frost_hammer'
  | 'weapon_thunder_maul'
  | 'weapon_spear'
  | 'weapon_halberd'
  | 'weapon_trident'
  | 'weapon_scythe'
  | 'weapon_crossbow'
  | 'weapon_recurve_bow'
  | 'weapon_void_bow'
  | 'weapon_plasma_rifle'
  | 'weapon_laser_pistol'
  | 'weapon_fire_staff'
  | 'weapon_frost_staff'
  | 'weapon_void_orb'
  | 'sword_t2'
  | 'hammer_t2'
  | 'blaster_t2'
  | 'bow_t2'
  | 'axe_iron'
  | 'pickaxe_iron'
  | 'builder_tool'
  | 'builder_master'
  | 'armor_ranger'
  | 'boots_swift'
  | 'shield_aegis'
  | RelicId;

export const WEAPON_UNLOCK_MAP: Record<WeaponId, UpgradeId> = {
  sword: 'weapon_sword',
  hammer: 'weapon_hammer',
  blaster: 'weapon_blaster',
  bow: 'weapon_bow',
  axe: 'tool_axe',
  pickaxe: 'tool_pickaxe',
  builder: 'builder_tool',
  katana: 'weapon_katana',
  greatsword: 'weapon_greatsword',
  dagger: 'weapon_dagger',
  scimitar: 'weapon_scimitar',
  rapier: 'weapon_rapier',
  shadow_blade: 'weapon_shadow_blade',
  fire_sword: 'weapon_fire_sword',
  frost_blade: 'weapon_frost_blade',
  battleaxe: 'weapon_battleaxe',
  war_mace: 'weapon_war_mace',
  flail: 'weapon_flail',
  frost_hammer: 'weapon_frost_hammer',
  thunder_maul: 'weapon_thunder_maul',
  spear: 'weapon_spear',
  halberd: 'weapon_halberd',
  trident: 'weapon_trident',
  scythe: 'weapon_scythe',
  crossbow: 'weapon_crossbow',
  recurve_bow: 'weapon_recurve_bow',
  void_bow: 'weapon_void_bow',
  plasma_rifle: 'weapon_plasma_rifle',
  laser_pistol: 'weapon_laser_pistol',
  fire_staff: 'weapon_fire_staff',
  frost_staff: 'weapon_frost_staff',
  void_orb: 'weapon_void_orb',
};

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
  {
    id: 'frost_crown',
    key: 'Y',
    name: 'Крижаний Вінець',
    skillName: 'Крижаний Вихор',
    cooldown: 14,
    description: 'Вибух морозу (48 шкоди по площі) та крижане уповільнення ворогів на 6 с',
    colorHex: '#7dd3fc',
  },
  {
    id: 'thunder_totem',
    key: 'O',
    name: 'Тотем Грому',
    skillName: 'Удар Блискавки',
    cooldown: 16,
    description: 'Блискавичний розряд (65 шкоди) з потужним відкиданням усіх мобів поруч',
    colorHex: '#facc15',
  },
  {
    id: 'vampire_fang',
    key: 'N',
    name: 'Ікло Вампіра',
    skillName: 'Кровава Жатва',
    cooldown: 20,
    description: 'Миттєво +25 HP та +35% вампіризму (лікування від кожної атаки) на 8 с',
    colorHex: '#f43f5e',
  },
  {
    id: 'titan_aegis',
    key: ',',
    name: 'Егіда Титана',
    skillName: 'Щит Титана',
    cooldown: 22,
    description: '-75% вхідної шкоди на 6 секунд + захисна ударна хвиля довкола',
    colorHex: '#60a5fa',
  },
  {
    id: 'phoenix_feather',
    key: '.',
    name: 'Перо Фенікса',
    skillName: 'Відродження',
    cooldown: 24,
    description: '+85 HP, вогняний вибух (40 шкоди) та регенерація +12 HP/с на 8 секунд',
    colorHex: '#fb923c',
  },
  {
    id: 'void_step',
    key: '/',
    name: 'Крок Безодні',
    skillName: 'Телепорт Тіні',
    cooldown: 12,
    description: 'Миттєвий стрибок уперед на 10 м із тіньовою новою (50 шкоди)',
    colorHex: '#c084fc',
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
  { id: 'stone', name: 'Камінь', colorHex: '#94a3b8', hint: 'З кам’яних брил на галявинах (Киркою [P] або [E]) та големів' },
  { id: 'iron', name: 'Залізо', colorHex: '#60a5fa', hint: 'З рудних жил, печер та големів' },
  { id: 'herb', name: 'Трави', colorHex: '#4ade80', hint: 'Збирайте на галявині та біля хатинок' },
  { id: 'essence', name: 'Есенція', colorHex: '#c084fc', hint: 'З кристалів у печерах, слаймів та босів' },
  { id: 'hide', name: 'Шкіра', colorHex: '#f59e0b', hint: 'Трофей з вовків, гоблінів та оленів' },
  { id: 'raw_meat', name: 'Сире м’ясо', colorHex: '#fb7185', hint: 'Здобувається з овець та оленів; смажиться на кострі (E)' },
];

export interface CraftRecipe {
  id: string;
  name: string;
  category: 'consumable' | 'building' | 'upgrade' | 'weapon' | 'relic';
  description: string;
  requiresWorkbench?: boolean;
  outputConsumable?: ConsumableId;
  outputCount?: number;
  outputWorkbench?: number;
  outputUpgrade?: UpgradeId;
  cost: Partial<Record<ResourceId, number>>;
  coinsCost?: number;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'craft_tool_axe',
    name: 'Сокира Лісоруба (кл. 5)',
    category: 'upgrade',
    description: 'Базова сокира для рубання дерев та ближнього бою на старті виживання',
    requiresWorkbench: false,
    outputUpgrade: 'tool_axe',
    cost: { wood: 2, stone: 1 },
  },
  {
    id: 'craft_tool_pickaxe',
    name: 'Гірнича Кирка (кл. P)',
    category: 'upgrade',
    description: 'Видобуває камінь на галявинах і кристальну руду в печерах',
    requiresWorkbench: false,
    outputUpgrade: 'tool_pickaxe',
    cost: { wood: 2, stone: 2 },
  },
  {
    id: 'craft_weapon_sword',
    name: 'Сталевий Меч (кл. 1)',
    category: 'upgrade',
    description: 'Основна зброя ближнього бою зі швидким розмахом',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_sword',
    cost: { wood: 2, stone: 2 },
  },
  {
    id: 'craft_weapon_hammer',
    name: 'Важкий Молот (кл. 2)',
    category: 'upgrade',
    description: 'Нищівний удар із ударною хвилею по площі',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_hammer',
    cost: { wood: 2, stone: 3 },
  },
  {
    id: 'craft_weapon_bow',
    name: 'Лісовий Лук (кл. 4)',
    category: 'upgrade',
    description: 'Далекобійний лук для полювання на дичину та мобів',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_bow',
    cost: { wood: 3, herb: 1 },
  },
  {
    id: 'craft_weapon_blaster',
    name: 'Іскровий Бластер (кл. 3)',
    category: 'upgrade',
    description: 'Енергетичний бластер на кристалах есенції та заліза',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_blaster',
    cost: { iron: 2, essence: 2 },
  },
  {
    id: 'craft_workbench',
    name: 'Верстак Майстра',
    category: 'building',
    description: 'Створює переносний 3D-верстак (+1 у запас), який можна поставити будь-де на землі',
    requiresWorkbench: false,
    outputWorkbench: 1,
    cost: { wood: 4, stone: 2 },
  },
  {
    id: 'craft_builder_tool',
    name: 'Інструмент Будівника (кл. 6)',
    category: 'building',
    description: 'Киянка архітектора: стіни, сходи, колони, балкони, камін, ліжко та 2–6+ поверхові будинки',
    requiresWorkbench: false,
    outputUpgrade: 'builder_tool',
    cost: { wood: 3, stone: 2 },
  },
  {
    id: 'craft_builder_master',
    name: 'Набір Архітектора',
    category: 'building',
    description: 'Оптимізує витрату деревини на 1 (мін. 1) для всіх елементів власного будинку',
    requiresWorkbench: true,
    outputUpgrade: 'builder_master',
    cost: { wood: 3, stone: 3, iron: 2 },
  },
  {
    id: 'craft_potion',
    name: 'Зілля лікування',
    category: 'consumable',
    description: 'Відновлює +50 HP миттєво',
    requiresWorkbench: false,
    outputConsumable: 'potion',
    outputCount: 1,
    cost: { herb: 2, essence: 1 },
  },
  {
    id: 'craft_mega_potion',
    name: 'Велике зілля зцілення',
    category: 'consumable',
    description: 'Потужно відновлює +120 HP миттєво',
    requiresWorkbench: false,
    outputConsumable: 'mega_potion',
    outputCount: 1,
    cost: { herb: 4, essence: 2 },
  },
  {
    id: 'craft_tonic',
    name: 'Трав’яний тонік',
    category: 'consumable',
    description: 'Відновлює +70 витривалості та +15 HP',
    requiresWorkbench: false,
    outputConsumable: 'tonic',
    outputCount: 1,
    cost: { herb: 2, wood: 1 },
  },
  {
    id: 'craft_stew',
    name: 'Мисливська юшка',
    category: 'consumable',
    description: 'Ситно лікує +85 HP і повну витривалість',
    requiresWorkbench: false,
    outputConsumable: 'stew',
    outputCount: 1,
    cost: { herb: 3, wood: 2, essence: 1 },
  },
  {
    id: 'craft_rage_potion',
    name: 'Еліксир Лютої Сили',
    category: 'consumable',
    description: '+50% до всієї шкоди на 25 секунд та +20 HP',
    requiresWorkbench: false,
    outputConsumable: 'rage_potion',
    outputCount: 1,
    cost: { herb: 2, essence: 2, raw_meat: 1 },
  },
  {
    id: 'craft_swift_potion',
    name: 'Зілля Блискавиці',
    category: 'consumable',
    description: '+38% швидкості пересування на 25 с та +50 витривалості',
    requiresWorkbench: false,
    outputConsumable: 'swift_potion',
    outputCount: 1,
    cost: { herb: 3, essence: 1 },
  },
  {
    id: 'craft_iron_skin_potion',
    name: 'Зілля Залізної Шкіри',
    category: 'consumable',
    description: 'Зменшує вхідну шкоду на 45% на 30 секунд та +30 HP',
    requiresWorkbench: false,
    outputConsumable: 'iron_skin_potion',
    outputCount: 1,
    cost: { iron: 1, stone: 2, herb: 2 },
  },
  {
    id: 'craft_phoenix_elixir',
    name: 'Еліксир Фенікса',
    category: 'consumable',
    description: 'Повне лікування (100% HP і витривалості) + регенерація +12 HP/с на 20 с',
    requiresWorkbench: true,
    outputConsumable: 'phoenix_elixir',
    outputCount: 1,
    cost: { herb: 4, essence: 3, iron: 1 },
  },
  {
    id: 'craft_axe_iron',
    name: 'Кована Сокира',
    category: 'upgrade',
    description: 'Рубає дерева вдвічі швидше (3 удари замість 5–6) та дає +1 додаткову деревину зі зрубу',
    requiresWorkbench: true,
    outputUpgrade: 'axe_iron',
    cost: { wood: 2, iron: 3 },
  },
  {
    id: 'craft_pickaxe_iron',
    name: 'Залізна Кирка',
    category: 'upgrade',
    description: 'Розбиває кам’яні брили за 1 удар (+1 бонусний камінь) і завдає +16 шкоди ворогам',
    requiresWorkbench: true,
    outputUpgrade: 'pickaxe_iron',
    cost: { wood: 2, iron: 3 },
  },
  {
    id: 'craft_sword_t2',
    name: 'Кований Меч',
    category: 'upgrade',
    description: '+16 до шкоди Сталевого Меча',
    requiresWorkbench: true,
    outputUpgrade: 'sword_t2',
    cost: { wood: 2, stone: 3, iron: 3 },
  },
  {
    id: 'craft_hammer_t2',
    name: 'Рунний Молот',
    category: 'upgrade',
    description: '+24 до шкоди та радіусу Молота',
    requiresWorkbench: true,
    outputUpgrade: 'hammer_t2',
    cost: { stone: 4, iron: 3, essence: 2 },
  },
  {
    id: 'craft_blaster_t2',
    name: 'Кристальний Бластер',
    category: 'upgrade',
    description: '+14 до шкоди Бластера',
    requiresWorkbench: true,
    outputUpgrade: 'blaster_t2',
    cost: { iron: 3, essence: 4 },
  },
  {
    id: 'craft_bow_t2',
    name: 'Ельфійський Лук',
    category: 'upgrade',
    description: '+18 до шкоди Лука',
    requiresWorkbench: true,
    outputUpgrade: 'bow_t2',
    cost: { wood: 4, iron: 2, essence: 2 },
  },
  {
    id: 'craft_shield_aegis',
    name: 'Щит Егіди',
    category: 'upgrade',
    description: 'Блок поглинає 92% шкоди, парирування відбиває удар із подвійною силою',
    requiresWorkbench: true,
    outputUpgrade: 'shield_aegis',
    cost: { wood: 2, iron: 4, essence: 1 },
  },
  {
    id: 'craft_armor_ranger',
    name: 'Броня Вартового',
    category: 'upgrade',
    description: '+45 Макс. HP, -25% вхідної шкоди (видимі наплічники)',
    requiresWorkbench: true,
    outputUpgrade: 'armor_ranger',
    cost: { hide: 3, iron: 4, stone: 2 },
  },
  {
    id: 'craft_boots_swift',
    name: 'Чоботи Мандрівника',
    category: 'upgrade',
    description: '+22% швидкості пересування долиною',
    requiresWorkbench: true,
    outputUpgrade: 'boots_swift',
    cost: { hide: 2, herb: 3, essence: 2 },
  },
  // 25 рецептів нової зброї (v9)
  {
    id: 'craft_weapon_dagger',
    name: 'Ельфійський Кинджал',
    category: 'weapon',
    description: 'Надшвидкий клинок (22 шкоди, кд 0.19 с) — доступний у Арсеналі',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_dagger',
    cost: { wood: 1, iron: 2 },
  },
  {
    id: 'craft_weapon_katana',
    name: 'Катана Тіні',
    category: 'weapon',
    description: 'Блискавичний вигнутий клинок (34 шкоди, кд 0.27 с)',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_katana',
    cost: { iron: 3, essence: 1 },
  },
  {
    id: 'craft_weapon_scimitar',
    name: 'Шабля Пустелі',
    category: 'weapon',
    description: 'Швидка золота шабля дюн (32 шкоди, кд 0.30 с)',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_scimitar',
    cost: { iron: 2, stone: 2 },
  },
  {
    id: 'craft_weapon_rapier',
    name: 'Дуельна Рапіра',
    category: 'weapon',
    description: 'Випади з великою дальністю (29 шкоди, дальність 3.8 м)',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_rapier',
    cost: { iron: 3, wood: 1 },
  },
  {
    id: 'craft_weapon_spear',
    name: 'Сталевий Спис',
    category: 'weapon',
    description: 'Довге держално (35 шкоди, дальність 4.8 м)',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_spear',
    cost: { wood: 3, iron: 2 },
  },
  {
    id: 'craft_weapon_crossbow',
    name: 'Арбалет Вартового',
    category: 'weapon',
    description: 'Пробивні болти (52 шкоди, дальність 46 м)',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_crossbow',
    cost: { wood: 4, iron: 3 },
  },
  {
    id: 'craft_weapon_recurve_bow',
    name: 'Мисливський Лук Дюн',
    category: 'weapon',
    description: 'Швидкострільний композитний лук (44 шкоди, кд 0.44 с)',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_recurve_bow',
    cost: { wood: 4, hide: 2, herb: 1 },
  },
  {
    id: 'craft_weapon_laser_pistol',
    name: 'Лазерний Пістолет',
    category: 'weapon',
    description: 'Ультрашвидкі червоні імпульси (26 шкоди, кд 0.17 с)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_laser_pistol',
    cost: { iron: 3, essence: 2 },
  },
  {
    id: 'craft_weapon_greatsword',
    name: 'Дворучний Клеймор',
    category: 'weapon',
    description: 'Велетенський меч з нищівним розмахом (58 шкоди)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_greatsword',
    cost: { iron: 5, stone: 3, wood: 2 },
  },
  {
    id: 'craft_weapon_fire_sword',
    name: 'Вогняний Меч',
    category: 'weapon',
    description: 'Палаючий клинок з підвищеною шкодою (46 шкоди)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_fire_sword',
    cost: { iron: 4, essence: 3 },
  },
  {
    id: 'craft_weapon_frost_blade',
    name: 'Крижаний Клинок',
    category: 'weapon',
    description: 'Морозний меч, що сповільнює ворогів (42 шкоди)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_frost_blade',
    cost: { iron: 4, essence: 3 },
  },
  {
    id: 'craft_weapon_shadow_blade',
    name: 'Клинок Пустоти',
    category: 'weapon',
    description: 'Елітний темний клинок (64 шкоди, дальність 4.1 м)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_shadow_blade',
    cost: { iron: 5, essence: 5 },
  },
  {
    id: 'craft_weapon_battleaxe',
    name: 'Бойова Секира',
    category: 'weapon',
    description: 'Дволезова сокира берсерка (52 шкоди)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_battleaxe',
    cost: { iron: 4, wood: 3 },
  },
  {
    id: 'craft_weapon_war_mace',
    name: 'Шипована Булава',
    category: 'weapon',
    description: 'Важка ударна булава (45 шкоди, відкидання 12.5)',
    requiresWorkbench: false,
    outputUpgrade: 'weapon_war_mace',
    cost: { iron: 3, stone: 3 },
  },
  {
    id: 'craft_weapon_flail',
    name: 'Ланцюговий Кистень',
    category: 'weapon',
    description: 'Шипована куля на ланцюгу (50 шкоди, дальність 4.2 м)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_flail',
    cost: { iron: 4, stone: 2 },
  },
  {
    id: 'craft_weapon_frost_hammer',
    name: 'Молот Зими',
    category: 'weapon',
    description: 'Заморожуючий удар по землі (62 шкоди по площі)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_frost_hammer',
    cost: { iron: 4, stone: 4, essence: 3 },
  },
  {
    id: 'craft_weapon_thunder_maul',
    name: 'Громовий Кувалдо-Молот',
    category: 'weapon',
    description: 'Найсильніша ближня зброя (70 шкоди + блискавична хвиля)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_thunder_maul',
    cost: { iron: 6, stone: 4, essence: 4 },
  },
  {
    id: 'craft_weapon_halberd',
    name: 'Вартова Алебарда',
    category: 'weapon',
    description: 'Алебарда з великим радіусом бою (56 шкоди, 4.9 м)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_halberd',
    cost: { iron: 4, wood: 3 },
  },
  {
    id: 'craft_weapon_trident',
    name: 'Тризуб Глибин',
    category: 'weapon',
    description: 'Стрімкий бірюзовий тризуб (48 шкоди, 4.7 м)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_trident',
    cost: { iron: 4, essence: 3 },
  },
  {
    id: 'craft_weapon_scythe',
    name: 'Жниварська Коса Тіней',
    category: 'weapon',
    description: 'Коса, що зачіпає кілька ворогів перед собою (60 шкоди)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_scythe',
    cost: { iron: 4, wood: 2, essence: 4 },
  },
  {
    id: 'craft_weapon_void_bow',
    name: 'Лук Пустоти',
    category: 'weapon',
    description: 'Елітний далекобійний лук (68 шкоди, дальність 50 м)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_void_bow',
    cost: { wood: 4, iron: 3, essence: 4 },
  },
  {
    id: 'craft_weapon_plasma_rifle',
    name: 'Плазмова Гвинтівка',
    category: 'weapon',
    description: 'Швидкострільна плазма високої потужності (36 шкоди, 0.24 с)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_plasma_rifle',
    cost: { iron: 5, essence: 4 },
  },
  {
    id: 'craft_weapon_fire_staff',
    name: 'Посох Полум’я',
    category: 'weapon',
    description: 'Вогняні сфери з вибухом по площі (54 шкоди)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_fire_staff',
    cost: { wood: 3, essence: 4, iron: 2 },
  },
  {
    id: 'craft_weapon_frost_staff',
    name: 'Посох Льоду',
    category: 'weapon',
    description: 'Крижані кулі, що уповільнюють цілі (46 шкоди)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_frost_staff',
    cost: { wood: 3, essence: 4, iron: 2 },
  },
  {
    id: 'craft_weapon_void_orb',
    name: 'Сфера Безодні',
    category: 'weapon',
    description: 'Легендарний артефакт магії пустоти (74 шкоди + вибух)',
    requiresWorkbench: true,
    outputUpgrade: 'weapon_void_orb',
    cost: { essence: 6, iron: 4 },
  },
  // Рецепти 6 нових реліквій (v9)
  {
    id: 'craft_relic_frost_crown',
    name: 'Крижаний Вінець (кл. Y)',
    category: 'relic',
    description: 'Навичка «Крижаний Вихор»: 48 шкоди + 6 с аура уповільнення',
    requiresWorkbench: true,
    outputUpgrade: 'frost_crown',
    cost: { iron: 3, essence: 3, herb: 2 },
  },
  {
    id: 'craft_relic_thunder_totem',
    name: 'Тотем Грому (кл. O)',
    category: 'relic',
    description: 'Навичка «Удар Блискавки»: 65 шкоди + потужний поштовх',
    requiresWorkbench: true,
    outputUpgrade: 'thunder_totem',
    cost: { wood: 3, iron: 3, essence: 4 },
  },
  {
    id: 'craft_relic_vampire_fang',
    name: 'Ікло Вампіра (кл. N)',
    category: 'relic',
    description: 'Навичка «Кровава Жатва»: +25 HP + 8 с 35% вампіризму',
    requiresWorkbench: true,
    outputUpgrade: 'vampire_fang',
    cost: { hide: 3, essence: 4, raw_meat: 2 },
  },
  {
    id: 'craft_relic_titan_aegis',
    name: 'Егіда Титана (кл. ,)',
    category: 'relic',
    description: 'Навичка «Щит Титана»: -75% шкоди на 6 с + хвиля захисту',
    requiresWorkbench: true,
    outputUpgrade: 'titan_aegis',
    cost: { iron: 5, stone: 4, essence: 2 },
  },
  {
    id: 'craft_relic_phoenix_feather',
    name: 'Перо Фенікса (кл. .)',
    category: 'relic',
    description: 'Навичка «Відродження»: +85 HP + реген 8 с + вогняний вибух',
    requiresWorkbench: true,
    outputUpgrade: 'phoenix_feather',
    cost: { herb: 4, essence: 5, hide: 2 },
  },
  {
    id: 'craft_relic_void_step',
    name: 'Крок Безодні (кл. /)',
    category: 'relic',
    description: 'Навичка «Телепорт Тіні»: стрибок 10 м уперед + 50 шкоди',
    requiresWorkbench: true,
    outputUpgrade: 'void_step',
    cost: { essence: 5, hide: 2, iron: 2 },
  },
  ...EXTRA_POTION_SPECS.map(
    (p): CraftRecipe => ({
      id: `craft_${p.id}`,
      name: p.name,
      category: 'consumable',
      description: p.effect,
      requiresWorkbench: Boolean(p.requiresWorkbench),
      outputConsumable: p.id,
      outputCount: 1,
      cost: p.craftCost,
    }),
  ),
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
    description: 'Миттєво відновлює +50 HP у бою (клавіша 8)',
    price: 22,
    merchant: 'general',
    category: 'supply',
    outputConsumable: 'potion',
    outputCount: 1,
  },
  {
    id: 'shop_tonic',
    name: 'Трав’яний тонік',
    description: '+70 витривалості та +15 HP (клавіша -)',
    price: 18,
    merchant: 'general',
    category: 'supply',
    outputConsumable: 'tonic',
    outputCount: 1,
  },
  {
    id: 'shop_stew',
    name: 'Ситна юшка мандрівника',
    description: '+85 HP та повна витривалість (клавіша =)',
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
  {
    id: 'alch_mega_potion',
    name: 'Велике зілля зцілення',
    description: '+120 HP миттєво (клавіша 9)',
    price: 46,
    merchant: 'alchemist',
    category: 'supply',
    outputConsumable: 'mega_potion',
    outputCount: 1,
  },
  {
    id: 'alch_rage_potion',
    name: 'Еліксир Лютої Сили',
    description: '+50% шкоди на 25 с та +20 HP',
    price: 44,
    merchant: 'alchemist',
    category: 'supply',
    outputConsumable: 'rage_potion',
    outputCount: 1,
  },
  {
    id: 'alch_swift_potion',
    name: 'Зілля Блискавиці',
    description: '+38% швидкості на 25 с та +50 витривалості',
    price: 40,
    merchant: 'alchemist',
    category: 'supply',
    outputConsumable: 'swift_potion',
    outputCount: 1,
  },
  {
    id: 'alch_iron_skin_potion',
    name: 'Зілля Залізної Шкіри',
    description: '-45% вхідної шкоди на 30 с та +30 HP',
    price: 48,
    merchant: 'alchemist',
    category: 'supply',
    outputConsumable: 'iron_skin_potion',
    outputCount: 1,
  },
  {
    id: 'alch_phoenix_elixir',
    name: 'Еліксир Фенікса',
    description: '100% HP і витривалості + регенерація +12 HP/с (20 с)',
    price: 92,
    merchant: 'alchemist',
    category: 'supply',
    outputConsumable: 'phoenix_elixir',
    outputCount: 1,
  },
  // Нова зброя та реліквії у крамницях (v9)
  {
    id: 'shop_katana',
    name: 'Катана Тіні',
    description: 'Блискавичний клинок (34 шкоди, кд 0.27 с)',
    price: 130,
    merchant: 'blacksmith',
    category: 'relic',
    outputUpgrade: 'weapon_katana',
  },
  {
    id: 'shop_greatsword',
    name: 'Дворучний Клеймор',
    description: 'Велетенський меч (58 шкоди + потужний розмах)',
    price: 195,
    merchant: 'blacksmith',
    category: 'relic',
    outputUpgrade: 'weapon_greatsword',
  },
  {
    id: 'shop_thunder_maul',
    name: 'Громовий Кувалдо-Молот',
    description: 'Найсильніший молот (70 шкоди, хвиля по площі)',
    price: 250,
    merchant: 'blacksmith',
    category: 'relic',
    outputUpgrade: 'weapon_thunder_maul',
  },
  {
    id: 'shop_crossbow',
    name: 'Арбалет Вартового',
    description: 'Точні пробивні болти (52 шкоди, дальність 46 м)',
    price: 155,
    merchant: 'general',
    category: 'relic',
    outputUpgrade: 'weapon_crossbow',
  },
  {
    id: 'shop_plasma_rifle',
    name: 'Плазмова Гвинтівка',
    description: 'Швидкострільний плазмовий карабін (36 шкоди)',
    price: 215,
    merchant: 'alchemist',
    category: 'relic',
    outputUpgrade: 'weapon_plasma_rifle',
  },
  {
    id: 'shop_fire_staff',
    name: 'Посох Полум’я',
    description: 'Вибухові вогняні кулі (54 шкоди по площі)',
    price: 205,
    merchant: 'alchemist',
    category: 'relic',
    outputUpgrade: 'weapon_fire_staff',
  },
  {
    id: 'shop_frost_crown',
    name: 'Крижаний Вінець (Y)',
    description: 'Реліквія: Крижаний Вихор (48 шкоди + аура сповільнення)',
    price: 135,
    merchant: 'herbalist',
    category: 'relic',
    outputUpgrade: 'frost_crown',
  },
  {
    id: 'shop_thunder_totem',
    name: 'Тотем Грому (O)',
    description: 'Реліквія: Удар Блискавки (65 шкоди + відкидання)',
    price: 155,
    merchant: 'blacksmith',
    category: 'relic',
    outputUpgrade: 'thunder_totem',
  },
  {
    id: 'shop_vampire_fang',
    name: 'Ікло Вампіра (N)',
    description: 'Реліквія: Кровава Жатва (+25 HP + 8 с вампіризму)',
    price: 165,
    merchant: 'alchemist',
    category: 'relic',
    outputUpgrade: 'vampire_fang',
  },
  {
    id: 'shop_titan_aegis',
    name: 'Егіда Титана (,)',
    description: 'Реліквія: Щит Титана (-75% вхідної шкоди на 6 с)',
    price: 170,
    merchant: 'blacksmith',
    category: 'relic',
    outputUpgrade: 'titan_aegis',
  },
  {
    id: 'shop_phoenix_feather',
    name: 'Перо Фенікса (.)',
    description: 'Реліквія: Відродження (+85 HP + реген + вибух)',
    price: 195,
    merchant: 'herbalist',
    category: 'relic',
    outputUpgrade: 'phoenix_feather',
  },
  {
    id: 'shop_void_step',
    name: 'Крок Безодні (/)',
    description: 'Реліквія: Телепорт Тіні (стрибок 10 м + тіньова нова)',
    price: 160,
    merchant: 'general',
    category: 'relic',
    outputUpgrade: 'void_step',
  },
  ...EXTRA_POTION_SPECS.map(
    (p): ShopItem => ({
      id: `shop_${p.id}`,
      name: p.name,
      description: p.effect,
      price: p.shopPrice,
      merchant: p.merchant,
      category: 'supply',
      outputConsumable: p.id,
      outputCount: 1,
    }),
  ),
];

export type QuestId =
  | 'gather_valley'
  | 'hunt_threats'
  | 'visit_traders'
  | 'find_village'
  | 'explore_caves'
  | 'defeat_boss'
  | 'defeat_final_boss';

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
    description: 'Переможіть Тіньового Лицаря біля Руїн на східному березі',
    giver: 'Коваль Богдан',
    targetCount: 1,
    rewardCoins: 220,
    rewardXp: 260,
    rewardNote: '+220 мон., +3 Есенція',
  },
  {
    id: 'defeat_final_boss',
    title: 'Фінальна Битва: Цитадель Тіні',
    description: 'Підніміться до Цитаделі на північному сході (175, -265) та здолайте Фінального Боса Малакора',
    giver: 'Староста Мирослав',
    targetCount: 1,
    rewardCoins: 450,
    rewardXp: 500,
    rewardNote: '+450 мон., +5 Есенція',
  },
];

export interface QuestProgressState {
  id: QuestId;
  progress: number;
  completed: boolean;
}

export type DeviceKind = 'mobile' | 'desktop';

export interface OnlinePlayerState {
  id: string;
  name: string;
  device: DeviceKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  level: number;
  weapon: WeaponId;
  blocking: boolean;
  inWater: boolean;
  armor: boolean;
  aegis: boolean;
  gameMode: GameMode;
  zoneName: string;
}

export interface OnlineChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  device: DeviceKind;
  text: string;
  ts: number;
}

export interface MinimapEntity {
  x: number;
  z: number;
  kind:
    | 'player'
    | 'player_remote'
    | 'cabin'
    | 'village'
    | 'cave'
    | 'mob'
    | 'boss'
    | 'npc'
    | 'merchant'
    | 'quest';
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
  playTimeSec?: number;
  victoryAchieved?: boolean;
  builtStructures?: BuiltStructureData[];
  workbenchStock?: number;
  choppedTreeIds?: string[];
  gameMode?: GameMode;
  cameraViewMode?: CameraViewMode;
}

export interface ActiveGoalHud {
  title: string;
  stepIndex: number;
  totalSteps: number;
  distanceMeters: number | null;
  compassLabel: string | null;
}

export type ThemeMode = 'dark' | 'light';
export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';
export type ShadowQualitySetting = 'off' | '1k' | '2k' | '4k';
export type ViewDistanceSetting = 'near' | 'medium' | 'far';

export interface GraphicsSettings {
  preset: GraphicsPreset;
  renderScale: 0.65 | 0.85 | 1 | 1.25;
  shadowQuality: ShadowQualitySetting;
  grassDensity: 0.25 | 0.5 | 0.75 | 1;
  viewDistance: ViewDistanceSetting;
  dofEnabled: boolean;
  bloomEnabled: boolean;
  ecoMode: boolean;
}

export const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  preset: 'high',
  renderScale: 1,
  shadowQuality: '2k',
  grassDensity: 1,
  viewDistance: 'far',
  dofEnabled: false,
  bloomEnabled: true,
  ecoMode: true,
};

export interface GameHudState {
  phase: 'title' | 'playing' | 'dying' | 'dead' | 'victory';
  gameMode: GameMode;
  cameraViewMode: CameraViewMode;
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
    frostAura?: number;
    vampire?: number;
    titanShield?: number;
    phoenixRegen?: number;
  };
  season: SeasonId;
  weather: WeatherId;
  seasonRemainingSec: number;
  zoneName: string;
  biomeId: string;
  insideCabin: boolean;
  insideCave: boolean;
  nearCampfire: boolean;
  nearChest: boolean;
  nearWorkbench: boolean;
  nearBed: boolean;
  nearShop: boolean;
  nearAdminPainting: boolean;
  nearToolStand: boolean;
  nearSpawnThrone: boolean;
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
  pingMs: number | null;
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
  potionBuffs: {
    rage: number;
    swift: number;
    ironSkin: number;
    regen: number;
  };
  killFeed: KillFeedItem[];
  lastSavedAt: number | null;
  playTimeSec: number;
  victoryAchieved: boolean;
  secretBossUnlocked: boolean;
  visitedCavesCount: number;
  totalCavesCount: number;
  activeGoal: ActiveGoalHud | null;
  workbenchStock: number;
  selectedBuildPiece: BuildPieceKind;
  buildRotDeg: number;
  buildFloorLevel: number;
  nearTreeLabel: string | null;
  nearTreeHpRatio: number | null;
  nearMineTargetLabel: string | null;
  nearMineHpRatio: number | null;
  canBuildHere: boolean;
  builtCount: number;
  onlineConnected: boolean;
  onlinePlayerId: string | null;
  playerName: string;
  onlinePlayers: OnlinePlayerState[];
  onlineChat: OnlineChatMessage[];
}
