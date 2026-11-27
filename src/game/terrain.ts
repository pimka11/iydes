// Open-world 8096x16192 terrain, multi-biome continent, winding river, 7 villages (~98 houses), 10 Minecraft caves, & 12 alpine peaks

export const WORLD_SIZE_X = 8096;
export const WORLD_SIZE_Z = 16192;
export const WORLD_HALF_X = WORLD_SIZE_X / 2; // 4048
export const WORLD_HALF_Z = WORLD_SIZE_Z / 2; // 8096
export const WORLD_PLAYABLE_RADIUS = 4000;
export const WATER_LEVEL = -0.35;

export const BRIDGE_Z = -10;
export const BRIDGE_HALF_WIDTH = 2.4;
export const BRIDGE_HALF_LENGTH = 9.2;

export const CABIN_X = -14;
export const CABIN_Z = -22;
export const CABIN_ROT = 0.28;
export const CABIN_HALF_W = 3.9;
export const CABIN_HALF_D = 3.2;

export const FINAL_ARENA_X = 175;
export const FINAL_ARENA_Z = -265;
export const FINAL_ARENA_RADIUS = 24;

export type CabinStyle =
  | 'hunter'
  | 'shop'
  | 'watchtower'
  | 'cottage'
  | 'bakery'
  | 'alchemy'
  | 'townhall'
  | 'tavern'
  | 'manor_2f'
  | 'tavern_2f'
  | 'watchkeep_2f';

export function isTwoStoryCabin(style: CabinStyle): boolean {
  return style === 'manor_2f' || style === 'tavern_2f' || style === 'watchkeep_2f';
}

export function getCabinDims(style: CabinStyle): { halfW: number; halfD: number; isTwoStory: boolean } {
  if (isTwoStoryCabin(style)) {
    return { halfW: 4.8, halfD: 4.0, isTwoStory: true };
  }
  return { halfW: CABIN_HALF_W, halfD: CABIN_HALF_D, isTwoStory: false };
}

export type DungeonStyle =
  | 'crypt'
  | 'pyramid'
  | 'frost_bastion'
  | 'obsidian_shrine'
  | 'stone_keep';

export type BiomeId =
  | 'meadow'
  | 'oak_forest'
  | 'pine_forest'
  | 'blossom_grove'
  | 'snow_peaks'
  | 'golden_steppe'
  | 'desert'
  | 'ashlands'
  | 'mountain'
  | 'mystic_swamp'
  | 'autumn_woods'
  | 'bamboo_grove'
  | 'crystal_canyon'
  | 'ancient_highlands';

export interface CabinSite {
  id: string;
  name: string;
  x: number;
  z: number;
  rot: number;
  style: CabinStyle;
  isVillage?: boolean;
}

export interface DungeonSite {
  id: string;
  name: string;
  x: number;
  z: number;
  rot: number;
  style: DungeonStyle;
  guardianKind:
    | 'skeleton'
    | 'cursed_knight'
    | 'sand_mummy'
    | 'frost_yeti'
    | 'lava_imp'
    | 'boss';
  tier: number;
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

// 10 enterable 3D Minecraft-style subterranean block caves descending into the earth across the 8096x16192 continent
export const CAVE_SITES: CaveSite[] = [
  { id: 'crystal_cave', name: 'Кришталева Печера', x: 82, z: -62, rot: -0.78, floorY: -1.15, peakHeight: 16.5, crystalColor: 0x38bdf8 },
  { id: 'bear_grotto', name: 'Золотий Грот', x: -98, z: -34, rot: 0.95, floorY: -1.1, peakHeight: 15.0, crystalColor: 0xf59e0b },
  { id: 'emerald_cave', name: 'Смарагдова Печера', x: 102, z: 92, rot: -2.45, floorY: -1.1, peakHeight: 17.5, crystalColor: 0x34d399 },
  { id: 'north_deepslate_mine', name: 'Північна Шахта Глибин', x: -310, z: -740, rot: 0.45, floorY: -0.95, peakHeight: 19.0, crystalColor: 0xa855f7 },
  { id: 'south_sapphire_cavern', name: 'Південна Сапфірова Копальня', x: 340, z: 820, rot: -2.15, floorY: -1.0, peakHeight: 18.5, crystalColor: 0x60a5fa },
  { id: 'west_amethyst_hollow', name: 'Західна Аметистова Печера', x: -1380, z: -420, rot: 0.72, floorY: -1.05, peakHeight: 20.0, crystalColor: 0xc084fc },
  { id: 'east_ruby_vault', name: 'Східний Рубіновий Склеп', x: 1520, z: -1350, rot: -1.25, floorY: -1.1, peakHeight: 21.0, crystalColor: 0xf43f5e },
  { id: 'far_north_glacial_cave', name: 'Крижана Печера Півночі', x: 920, z: -4200, rot: 1.65, floorY: -0.9, peakHeight: 22.0, crystalColor: 0x7dd3fc },
  { id: 'far_south_obsidian_rift', name: 'Обсидіановий Розлом Півдня', x: -1150, z: 4450, rot: -0.65, floorY: -1.15, peakHeight: 20.5, crystalColor: 0xf97316 },
  { id: 'swamp_jade_grotto', name: 'Нефритовий Грот Ботів', x: -2450, z: 1620, rot: 2.35, floorY: -1.05, peakHeight: 18.0, crystalColor: 0x10b981 },
];

// 12 towering alpine mountains spaced across the 8096x16192 continent
export const MINI_MOUNTAINS: MiniMountainDef[] = [
  { x: -760, z: -820, radius: 118, height: 54.0, ridgeAngle: 0.45 },
  { x: 840, z: -960, radius: 128, height: 64.0, ridgeAngle: -0.72 },
  { x: -920, z: 1080, radius: 112, height: 48.0, ridgeAngle: 1.12 },
  { x: 980, z: 1140, radius: 132, height: 68.0, ridgeAngle: -0.34 },
  { x: -2350, z: -2650, radius: 165, height: 78.0, ridgeAngle: 0.88 },
  { x: 2480, z: -2900, radius: 175, height: 84.0, ridgeAngle: -1.05 },
  { x: -2600, z: 2850, radius: 158, height: 72.0, ridgeAngle: 0.25 },
  { x: 2550, z: 3150, radius: 168, height: 76.0, ridgeAngle: -0.62 },
  { x: -1650, z: -5600, radius: 190, height: 92.0, ridgeAngle: 1.42 },
  { x: 1820, z: -5850, radius: 185, height: 88.0, ridgeAngle: -0.91 },
  { x: -1950, z: 5750, radius: 170, height: 80.0, ridgeAngle: 0.55 },
  { x: 2100, z: 6050, radius: 195, height: 94.0, ridgeAngle: -1.28 },
];

export function riverCenterX(z: number): number {
  return (
    16 +
    Math.sin(z * 0.04) * 9.5 +
    Math.cos(z * 0.018) * 4.5 +
    Math.sin(z * 0.0042) * 34.0 +
    Math.sin(z * 0.0011) * 95.0
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
  // 28 додаткових садиб, корчм, сторожок та алхімічних хатинок по всьому континенту 8096x16192 (v11)
  { id: 'rural_autumn_inn', name: 'Корчма «Золотий Лист»', x: -540, z: -320, rot: 0.65, style: 'tavern' },
  { id: 'rural_bamboo_tea', name: 'Бамбукова Садиба', x: 580, z: 420, rot: -1.1, style: 'cottage' },
  { id: 'rural_swamp_alchemy', name: 'Хатина Болотного Алхіміка', x: -720, z: 690, rot: 0.35, style: 'alchemy' },
  { id: 'rural_canyon_forge', name: 'Кузня Кристального Каньйону', x: 640, z: -560, rot: -0.5, style: 'watchtower' },
  { id: 'rural_steppe_bakery', name: 'Степова Пекарня', x: 460, z: 1220, rot: 2.1, style: 'bakery' },
  { id: 'rural_taiga_lodge', name: 'Тайговий Мисливський Двір', x: -940, z: -1850, rot: 0.8, style: 'hunter' },
  { id: 'rural_frost_watch', name: 'Крижаний Форпост', x: 880, z: -2150, rot: -1.4, style: 'watchtower' },
  { id: 'rural_west_shop', name: 'Західна Торгова Застава', x: -1480, z: 180, rot: 0.45, style: 'shop' },
  { id: 'rural_east_cottage', name: 'Східна Лісова Садиба', x: 1620, z: 320, rot: -2.2, style: 'cottage' },
  { id: 'rural_blossom_tavern', name: 'Сакурова Корчма', x: -1350, z: 1640, rot: 1.2, style: 'tavern' },
  { id: 'rural_dune_outpost', name: 'Дюновий Караван-Сарай', x: 1420, z: 2450, rot: -0.75, style: 'shop' },
  { id: 'rural_highland_keep', name: 'Високогірна Вежа', x: -1950, z: -1240, rot: 0.25, style: 'townhall' },
  { id: 'rural_jade_alchemy', name: 'Лавка Нефритового Мага', x: 2180, z: -1680, rot: -1.8, style: 'alchemy' },
  { id: 'rural_emerald_cottage', name: 'Хатинка в Бамбуку', x: 2340, z: 950, rot: 0.9, style: 'cottage' },
  { id: 'rural_amber_mill', name: 'Бурштиновий Млин-Пекарня', x: -2420, z: -520, rot: -0.35, style: 'bakery' },
  { id: 'rural_deep_north_hunter', name: 'Північна Зимівля', x: -1150, z: -3650, rot: 0.55, style: 'hunter' },
  { id: 'rural_deep_north_forge', name: 'Північна Сторожка Льодів', x: 1320, z: -3920, rot: -1.15, style: 'watchtower' },
  { id: 'rural_far_north_tavern', name: 'Таверна «Полярне Сяйво»', x: -420, z: -6150, rot: 0.2, style: 'tavern' },
  { id: 'rural_far_north_alch', name: 'Обсерваторія Півночі', x: 1640, z: -6420, rot: -2.1, style: 'alchemy' },
  { id: 'rural_deep_south_oasis', name: 'Оазисна Чайна', x: -1340, z: 3820, rot: 1.45, style: 'bakery' },
  { id: 'rural_deep_south_keep', name: 'Фортеця Південних Дюн', x: 1480, z: 4120, rot: -0.9, style: 'townhall' },
  { id: 'rural_far_south_shop', name: 'Ярмарок Кінця Світу', x: -640, z: 6250, rot: 0.7, style: 'shop' },
  { id: 'rural_far_south_hunter', name: 'Південний Маяк Мандрів', x: 1750, z: 6480, rot: -1.6, style: 'watchtower' },
  { id: 'rural_west_edge_lodge', name: 'Західний Край Світу', x: -3320, z: -240, rot: 1.1, style: 'hunter' },
  { id: 'rural_east_edge_cottage', name: 'Східний Берег Зорі', x: 3360, z: 480, rot: -1.9, style: 'cottage' },
  { id: 'rural_nw_bastion', name: 'Північно-Західна Твердиня', x: -3150, z: -4350, rot: 0.4, style: 'townhall' },
  { id: 'rural_ne_sanctuary', name: 'Святилище Східних Вершин', x: 3220, z: -4480, rot: -0.8, style: 'alchemy' },
  { id: 'rural_sw_port', name: 'Південно-Західна Таверна', x: -3180, z: 4680, rot: 1.7, style: 'tavern' },
  { id: 'rural_se_citadel', name: 'Південно-Східний Бастіон', x: 3250, z: 4720, rot: -2.4, style: 'watchtower' },
  // 24+ нових будинків (серед них 12 двоповерхових особняків, корчм та бастіонів)
  { id: 'starter_manor_2f', name: 'Двоповерхова Садиба Лісника', x: -46, z: 46, rot: 0.42, style: 'manor_2f' },
  { id: 'north_tavern_2f', name: 'Двоповерхова Корчма «Золотий Дуб»', x: -64, z: -78, rot: 0.65, style: 'tavern_2f' },
  { id: 'east_watchkeep_2f', name: 'Двоповерхова Вартова Вежа Сходу', x: 96, z: 48, rot: -0.78, style: 'watchkeep_2f' },
  { id: 'valley_cottage_south', name: 'Садиба Пасічника', x: -24, z: 74, rot: 0.15, style: 'cottage' },
  { id: 'valley_bakery_east', name: 'Медова Пекарня Заріччя', x: 118, z: -8, rot: -1.05, style: 'bakery' },
  { id: 'valley_alchemy_nw', name: 'Лавка Зіль біля Бору', x: -168, z: -124, rot: 0.9, style: 'alchemy' },
  { id: 'sakura_manor_2f', name: 'Двоповерховий Дім Сакури', x: -280, z: 210, rot: 0.35, style: 'manor_2f' },
  { id: 'oak_tavern_2f', name: 'Двоповерхова Корчма Дубрави', x: 320, z: 165, rot: -0.85, style: 'tavern_2f' },
  { id: 'pine_watchkeep_2f', name: 'Двоповерхова Застава Бору', x: -360, z: -410, rot: 0.55, style: 'watchkeep_2f' },
  { id: 'ridge_manor_2f', name: 'Двоповерхова Садиба Нагір’я', x: 420, z: -310, rot: -1.15, style: 'manor_2f' },
  { id: 'steppe_shop_new', name: 'Степова Крамниця Спецій', x: 295, z: 680, rot: 1.4, style: 'shop' },
  { id: 'swamp_cottage_new', name: 'Болотна Хатинка Знахаря', x: -460, z: 480, rot: -0.3, style: 'cottage' },
  { id: 'autumn_tavern_2f', name: 'Двоповерхова Корчма «Багрянець»', x: -690, z: -680, rot: 0.72, style: 'tavern_2f' },
  { id: 'bamboo_manor_2f', name: 'Двоповерховий Бамбуковий Павільйон', x: 760, z: 640, rot: -1.45, style: 'manor_2f' },
  { id: 'canyon_watchkeep_2f', name: 'Двоповерховий Кристальний Форт', x: 960, z: -860, rot: -0.6, style: 'watchkeep_2f' },
  { id: 'desert_caravan_house', name: 'Оазисна Лавка Мандрівників', x: 640, z: 1520, rot: 0.95, style: 'shop' },
  { id: 'north_hunter_new', name: 'Зимова Хатина Мисливця', x: -520, z: -1680, rot: 0.3, style: 'hunter' },
  { id: 'frost_watchkeep_2f', name: 'Двоповерховий Бастіон Криги', x: 540, z: -2650, rot: -0.9, style: 'watchkeep_2f' },
  { id: 'west_bakery_new', name: 'Західна Булочна', x: -1120, z: -190, rot: 1.1, style: 'bakery' },
  { id: 'west_manor_2f', name: 'Двоповерхова Західна Вілла', x: -1760, z: 540, rot: 0.48, style: 'manor_2f' },
  { id: 'east_alchemy_new', name: 'Східна Вежа Алхімії', x: 1380, z: 140, rot: -1.7, style: 'alchemy' },
  { id: 'east_tavern_2f', name: 'Двоповерховий Двір «Світанок»', x: 1940, z: -480, rot: -0.45, style: 'tavern_2f' },
  { id: 'south_dune_house', name: 'Дім Південного Купця', x: -780, z: 2450, rot: 0.85, style: 'shop' },
  { id: 'deep_north_cottage', name: 'Північна Світлиця', x: -1580, z: -2920, rot: 0.25, style: 'cottage' },
  { id: 'deep_south_watchkeep', name: 'Південна Двоповерхова Твердиня', x: 1120, z: 3320, rot: -1.25, style: 'watchkeep_2f' },
];

export const CABIN_SITES: CabinSite[] = [...BASE_CABIN_SITES];

// 34 підземелля (данжі) з унікальною архітектурою, скринями скарбів та вартівниками по всьому континенту
export const DUNGEON_SITES: DungeonSite[] = [
  { id: 'valley_crypt', name: 'Склеп Забутих Лицарів', x: -126, z: -112, rot: 0.38, style: 'crypt', guardianKind: 'skeleton', tier: 1 },
  { id: 'east_keep', name: 'Кам’яний Бастіон Долини', x: 132, z: 148, rot: -0.62, style: 'stone_keep', guardianKind: 'cursed_knight', tier: 1 },
  { id: 'ember_shrine', name: 'Обсидіанове Святилище Вогню', x: 152, z: -18, rot: -1.1, style: 'obsidian_shrine', guardianKind: 'lava_imp', tier: 2 },
  { id: 'south_barrows', name: 'Курган Давніх Воїнів', x: -62, z: 142, rot: 0.78, style: 'crypt', guardianKind: 'skeleton', tier: 1 },
  { id: 'north_crypt_1', name: 'Крипта Вічної Мерзлоти', x: -290, z: -520, rot: 0.25, style: 'frost_bastion', guardianKind: 'frost_yeti', tier: 2 },
  { id: 'pine_keep_2', name: 'Фортеця Темного Бору', x: 340, z: -480, rot: -0.45, style: 'stone_keep', guardianKind: 'cursed_knight', tier: 2 },
  { id: 'sakura_shrine', name: 'Закинуте Святилище Сакури', x: -380, z: 340, rot: 1.15, style: 'obsidian_shrine', guardianKind: 'cursed_knight', tier: 2 },
  { id: 'steppe_pyramid_1', name: 'Піраміда Золотого Вітру', x: 480, z: 860, rot: -0.35, style: 'pyramid', guardianKind: 'sand_mummy', tier: 2 },
  { id: 'swamp_crypt', name: 'Трясовинний Склеп Боліт', x: -640, z: 880, rot: 0.9, style: 'crypt', guardianKind: 'skeleton', tier: 2 },
  { id: 'autumn_keep', name: 'Цитадель Осінньої Тіні', x: -740, z: -460, rot: -0.8, style: 'stone_keep', guardianKind: 'cursed_knight', tier: 2 },
  { id: 'bamboo_shrine', name: 'Нефритовий Вівтар Древніх', x: 820, z: 480, rot: 0.5, style: 'obsidian_shrine', guardianKind: 'cursed_knight', tier: 3 },
  { id: 'canyon_shrine', name: 'Обсидіановий Каньйон Духів', x: 890, z: -720, rot: -1.2, style: 'obsidian_shrine', guardianKind: 'lava_imp', tier: 3 },
  { id: 'frost_citadel_1', name: 'Крижаний Бастіон Півночі', x: -640, z: -1580, rot: 0.4, style: 'frost_bastion', guardianKind: 'frost_yeti', tier: 3 },
  { id: 'frost_citadel_2', name: 'Замок Снігової Бурі', x: 740, z: -1950, rot: -0.7, style: 'frost_bastion', guardianKind: 'frost_yeti', tier: 3 },
  { id: 'desert_pyramid_2', name: 'Велика Піраміда Сонця', x: 980, z: 1640, rot: 0.2, style: 'pyramid', guardianKind: 'sand_mummy', tier: 3 },
  { id: 'desert_pyramid_3', name: 'Гробниця Фараона Дюн', x: -560, z: 2150, rot: -1.4, style: 'pyramid', guardianKind: 'sand_mummy', tier: 3 },
  { id: 'west_keep_1', name: 'Західна Твердиня Заліза', x: -1240, z: -640, rot: 0.85, style: 'stone_keep', guardianKind: 'cursed_knight', tier: 3 },
  { id: 'west_crypt_2', name: 'Західний Некрополь', x: -1560, z: 820, rot: -0.5, style: 'crypt', guardianKind: 'skeleton', tier: 3 },
  { id: 'east_keep_2', name: 'Східний Замок Рубінів', x: 1460, z: -560, rot: 1.05, style: 'stone_keep', guardianKind: 'cursed_knight', tier: 3 },
  { id: 'east_pyramid_4', name: 'Східна Піраміда Міражів', x: 1680, z: 1240, rot: -0.25, style: 'pyramid', guardianKind: 'sand_mummy', tier: 3 },
  { id: 'highland_keep_3', name: 'Форт Забутих Вершин', x: -1880, z: -1520, rot: 0.62, style: 'stone_keep', guardianKind: 'cursed_knight', tier: 4 },
  { id: 'ash_shrine_2', name: 'Вівтар Попелу та Магми', x: 1850, z: -1980, rot: -0.95, style: 'obsidian_shrine', guardianKind: 'lava_imp', tier: 4 },
  { id: 'far_north_frost_3', name: 'Льодовий Чертог Гігантів', x: -960, z: -3150, rot: 0.3, style: 'frost_bastion', guardianKind: 'frost_yeti', tier: 4 },
  { id: 'far_north_crypt_3', name: 'Північний Склеп Льодів', x: 1080, z: -3480, rot: -0.65, style: 'frost_bastion', guardianKind: 'frost_yeti', tier: 4 },
  { id: 'deep_north_shrine', name: 'Святилище Полярної Зорі', x: -480, z: -5450, rot: 0.15, style: 'obsidian_shrine', guardianKind: 'boss', tier: 5 },
  { id: 'deep_north_keep', name: 'Фортеця Північного Краю', x: 1350, z: -5220, rot: -1.1, style: 'frost_bastion', guardianKind: 'frost_yeti', tier: 5 },
  { id: 'deep_south_pyr_5', name: 'Храм Піщаних Бурь', x: -1120, z: 3350, rot: 0.72, style: 'pyramid', guardianKind: 'sand_mummy', tier: 4 },
  { id: 'deep_south_shrine', name: 'Вогняне Підземелля Дюн', x: 1240, z: 3680, rot: -0.4, style: 'obsidian_shrine', guardianKind: 'lava_imp', tier: 4 },
  { id: 'far_south_pyr_6', name: 'Піраміда Забутого Бога', x: -760, z: 5520, rot: 0.55, style: 'pyramid', guardianKind: 'boss', tier: 5 },
  { id: 'far_south_crypt', name: 'Склеп Південних Скель', x: 1420, z: 5680, rot: -0.88, style: 'crypt', guardianKind: 'cursed_knight', tier: 5 },
  { id: 'west_rim_keep', name: 'Бастіон Західного Хребта', x: -2950, z: -920, rot: 0.45, style: 'stone_keep', guardianKind: 'cursed_knight', tier: 4 },
  { id: 'east_rim_shrine', name: 'Святилище Східного Обрію', x: 2920, z: 720, rot: -0.75, style: 'obsidian_shrine', guardianKind: 'lava_imp', tier: 4 },
  { id: 'nw_frost_palace', name: 'Північно-Західний Льодовий Данж', x: -2780, z: -3850, rot: 0.92, style: 'frost_bastion', guardianKind: 'boss', tier: 5 },
  { id: 'se_abyss_vault', name: 'Південно-Східне Сховище Безодні', x: 2840, z: 3920, rot: -1.3, style: 'obsidian_shrine', guardianKind: 'boss', tier: 5 },
];

const DUNGEON_TRIG = DUNGEON_SITES.map((s) => ({
  cos: Math.cos(s.rot),
  sin: Math.sin(s.rot),
}));

const DUNGEON_CELL_SIZE = 128;
const DUNGEON_BUCKETS = new Map<number, number[]>();

function packDungeonCell(cx: number, cz: number): number {
  return (cx + 128) * 512 + (cz + 128);
}

for (let i = 0; i < DUNGEON_SITES.length; i++) {
  const s = DUNGEON_SITES[i];
  const pad = 26;
  const minCx = Math.floor((s.x - pad) / DUNGEON_CELL_SIZE);
  const maxCx = Math.floor((s.x + pad) / DUNGEON_CELL_SIZE);
  const minCz = Math.floor((s.z - pad) / DUNGEON_CELL_SIZE);
  const maxCz = Math.floor((s.z + pad) / DUNGEON_CELL_SIZE);
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const key = packDungeonCell(cx, cz);
      let arr = DUNGEON_BUCKETS.get(key);
      if (!arr) {
        arr = [];
        DUNGEON_BUCKETS.set(key, arr);
      }
      arr.push(i);
    }
  }
}

function getDungeonCandidates(x: number, z: number): number[] | undefined {
  return DUNGEON_BUCKETS.get(
    packDungeonCell(Math.floor(x / DUNGEON_CELL_SIZE), Math.floor(z / DUNGEON_CELL_SIZE)),
  );
}

export const VILLAGE_SITE: VillageSite = {
  seed: 42069,
  name: 'Велике Селище Вербове',
  x: -165,
  z: 240,
  radius: 74,
  plazaY: 2.35,
};

export const VILLAGE_SITES: VillageSite[] = [VILLAGE_SITE];

function seededHash(seed: number, step: number): number {
  const n = Math.sin(seed * 0.00173 + step * 12.9898) * 43758.5453123;
  return n - Math.floor(n);
}

const CAVE_TRIG = CAVE_SITES.map((s) => ({
  cos: Math.cos(s.rot),
  sin: Math.sin(s.rot),
}));

let CABIN_TRIG: { cos: number; sin: number }[] = [];

// O(1) Spatial Hash Bucket Index for ~124 cabins across 8096x16192 (CELL_SIZE = 128m, overlaps +-24m padded)
const CABIN_CELL_SIZE = 128;
const CABIN_BUCKETS = new Map<number, number[]>();

function packCabinCell(cx: number, cz: number): number {
  return (cx + 128) * 512 + (cz + 128);
}

function rebuildCabinSpatialIndex() {
  CABIN_TRIG = CABIN_SITES.map((s) => ({
    cos: Math.cos(s.rot),
    sin: Math.sin(s.rot),
  }));
  CABIN_BUCKETS.clear();
  const pad = 24;
  for (let i = 0; i < CABIN_SITES.length; i++) {
    const s = CABIN_SITES[i];
    const minCx = Math.floor((s.x - pad) / CABIN_CELL_SIZE);
    const maxCx = Math.floor((s.x + pad) / CABIN_CELL_SIZE);
    const minCz = Math.floor((s.z - pad) / CABIN_CELL_SIZE);
    const maxCz = Math.floor((s.z + pad) / CABIN_CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = packCabinCell(cx, cz);
        let arr = CABIN_BUCKETS.get(key);
        if (!arr) {
          arr = [];
          CABIN_BUCKETS.set(key, arr);
        }
        arr.push(i);
      }
    }
  }
}

function getCabinCandidates(x: number, z: number): number[] | undefined {
  return CABIN_BUCKETS.get(
    packCabinCell(Math.floor(x / CABIN_CELL_SIZE), Math.floor(z / CABIN_CELL_SIZE)),
  );
}

// Deterministically pick 1 flat meadow site for the Grand Village + 6 regional themed villages across 8096x16192
export function initializeWorldLayout(seed: number): VillageSite {
  VILLAGE_SITE.seed = seed;
  let chosenX = -195;
  let chosenZ = 240;

  for (let attempt = 0; attempt < 120; attempt++) {
    const u1 = seededHash(seed, attempt * 3 + 1);
    const u2 = seededHash(seed, attempt * 3 + 2);
    const side = seededHash(seed, attempt * 3 + 3) < 0.5 ? -1 : 1;
    const cx = side * (145 + u1 * 540);
    const cz = (u2 - 0.5) * 1850;

    if (Math.hypot(cx + 2, cz - 9) < 160) continue;
    if (Math.hypot(cx - 46, cz + 24) < 120) continue;

    let nearRiver = false;
    for (let dz = -78; dz <= 78; dz += 26) {
      const rx = riverCenterX(cz + dz);
      if (Math.abs(cx - rx) < riverHalfWidthAt(cz + dz) + 84) {
        nearRiver = true;
        break;
      }
    }
    if (nearRiver) continue;

    let blocked = false;
    for (const c of BASE_CABIN_SITES) {
      if (Math.hypot(cx - c.x, cz - c.z) < 106) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      for (const cv of CAVE_SITES) {
        if (Math.hypot(cx - cv.x, cz - cv.z) < 108) {
          blocked = true;
          break;
        }
      }
    }
    if (!blocked && Math.hypot(cx - FINAL_ARENA_X, cz - FINAL_ARENA_Z) < 114) {
      blocked = true;
    }
    if (!blocked) {
      for (const m of MINI_MOUNTAINS) {
        if (Math.hypot(cx - m.x, cz - m.z) < m.radius + 78) {
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

  // 18 distinct buildings in Primary Grand Village
  const villageSpecs: { id: string; name: string; style: CabinStyle; ang: number; dist: number }[] = [
    { id: 'village_hall', name: 'Ратуша Селища Вербове', style: 'townhall', ang: -Math.PI * 0.5, dist: 29.0 },
    { id: 'village_bakery', name: 'Пекарня Галини', style: 'bakery', ang: -Math.PI * 0.25, dist: 28.5 },
    { id: 'village_alchemy', name: 'Алхімічна Лавка Лева', style: 'alchemy', ang: 0, dist: 28.5 },
    { id: 'village_tavern', name: 'Селищна Корчма', style: 'tavern', ang: Math.PI * 0.25, dist: 29.0 },
    { id: 'village_watch', name: 'Вартова Вежа Селища', style: 'watchtower', ang: Math.PI * 0.5, dist: 29.5 },
    { id: 'village_cottage', name: 'Садиба Старійшини', style: 'cottage', ang: Math.PI * 0.75, dist: 28.5 },
    { id: 'village_hunter_inn', name: 'Мисливський Двір', style: 'hunter', ang: Math.PI, dist: 28.5 },
    { id: 'village_weaver', name: 'Дім Ткаля Ореста', style: 'cottage', ang: -Math.PI * 0.75, dist: 28.5 },
    { id: 'village_outer_1', name: 'Садиба Коваля-Помічника', style: 'cottage', ang: 0.16, dist: 54.0 },
    { id: 'village_outer_2', name: 'Східна Вартова Вежа', style: 'watchtower', ang: Math.PI * 0.2 + 0.16, dist: 55.0 },
    { id: 'village_outer_3', name: 'Лісничий Притулок', style: 'hunter', ang: Math.PI * 0.4 + 0.16, dist: 54.0 },
    { id: 'village_outer_4', name: 'Гостинний Двір «Зоря»', style: 'tavern', ang: Math.PI * 0.6 + 0.16, dist: 54.5 },
    { id: 'village_outer_5', name: 'Південна Садиба Шевця', style: 'cottage', ang: Math.PI * 0.8 + 0.16, dist: 54.0 },
    { id: 'village_outer_6', name: 'Хутір Столяра', style: 'cottage', ang: Math.PI + 0.16, dist: 54.0 },
    { id: 'village_outer_7', name: 'Мисливська Хата', style: 'hunter', ang: -Math.PI * 0.8 + 0.16, dist: 54.5 },
    { id: 'village_outer_8', name: 'Західна Сторожка', style: 'watchtower', ang: -Math.PI * 0.6 + 0.16, dist: 55.0 },
    { id: 'village_outer_9', name: 'Будинок Гончара', style: 'cottage', ang: -Math.PI * 0.4 + 0.16, dist: 54.0 },
    { id: 'village_outer_10', name: 'Північна Застава Селища', style: 'townhall', ang: -Math.PI * 0.2 + 0.16, dist: 55.0 },
  ];

  const vJitter = (seededHash(seed, 999) - 0.5) * 0.35;
  const villageCabins: CabinSite[] = villageSpecs.map((spec) => {
    const a = spec.ang + vJitter;
    const x = chosenX + Math.cos(a) * spec.dist;
    const z = chosenZ + Math.sin(a) * spec.dist;
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

  // 6 Regional Themed Villages across the 8096x16192 continent (each with 7 houses around a plaza)
  const regionalSeeds: { key: string; name: string; x: number; z: number }[] = [
    { key: 'pine_hamlet', name: 'Хвойне Селище «Борівка»', x: -780, z: -1380 },
    { key: 'sakura_town', name: 'Сакурове Містечко', x: -1680, z: 980 },
    { key: 'oasis_village', name: 'Оазисне Селище Дюн', x: 860, z: 1850 },
    { key: 'crystal_keep', name: 'Кришталева Застава', x: 1750, z: -920 },
    { key: 'frost_citadel', name: 'Північна Твердиня Снігів', x: -640, z: -4650 },
    { key: 'south_haven', name: 'Південна Пристань Сонця', x: 920, z: 4850 },
  ];

  const regionalStyles: { suffix: string; label: string; style: CabinStyle }[] = [
    { suffix: 'hall', label: 'Ратуша', style: 'townhall' },
    { suffix: 'shop', label: 'Крамниця', style: 'shop' },
    { suffix: 'bakery', label: 'Пекарня', style: 'bakery' },
    { suffix: 'alchemy', label: 'Алхімік', style: 'alchemy' },
    { suffix: 'tavern', label: 'Корчма', style: 'tavern' },
    { suffix: 'watch', label: 'Вежа', style: 'watchtower' },
    { suffix: 'cottage', label: 'Садиба', style: 'cottage' },
  ];

  VILLAGE_SITES.length = 0;
  VILLAGE_SITES.push(VILLAGE_SITE);

  const regionalCabins: CabinSite[] = [];
  for (let rIdx = 0; rIdx < regionalSeeds.length; rIdx++) {
    const reg = regionalSeeds[rIdx];
    const rxOffset = Math.round((seededHash(seed, 500 + rIdx * 5) - 0.5) * 140);
    const rzOffset = Math.round((seededHash(seed, 501 + rIdx * 5) - 0.5) * 140);
    let vx = reg.x + rxOffset;
    const vz = reg.z + rzOffset;
    // Keep safely clear of river
    const rivX = riverCenterX(vz);
    if (Math.abs(vx - rivX) < 95) {
      vx = vx < rivX ? rivX - 115 : rivX + 115;
    }
    VILLAGE_SITES.push({
      seed: seed + rIdx + 1,
      name: reg.name,
      x: vx,
      z: vz,
      radius: 52,
      plazaY: 2.35,
    });
    for (let hIdx = 0; hIdx < regionalStyles.length; hIdx++) {
      const spec = regionalStyles[hIdx];
      const ang = (hIdx / regionalStyles.length) * Math.PI * 2 + rIdx * 0.35;
      const dist = 28.5;
      const hx = vx + Math.cos(ang) * dist;
      const hz = vz + Math.sin(ang) * dist;
      const rot = Math.atan2(vx - hx, vz - hz);
      regionalCabins.push({
        id: `reg_${reg.key}_${spec.suffix}`,
        name: `${spec.label} (${reg.name})`,
        x: hx,
        z: hz,
        rot,
        style: spec.style,
        isVillage: true,
      });
    }
  }

  CABIN_SITES.length = 0;
  CABIN_SITES.push(...BASE_CABIN_SITES, ...villageCabins, ...regionalCabins);
  rebuildCabinSpatialIndex();
  return VILLAGE_SITE;
}

// Ensure default layout exists at import time
initializeWorldLayout(42069);

export function toCaveLocal(x: number, z: number, site: CaveSite): { lx: number; lz: number } {
  const dx = x - site.x;
  const dz = z - site.z;
  const c = Math.cos(site.rot);
  const s = Math.sin(site.rot);
  return {
    lx: dx * c - dz * s,
    lz: dx * s + dz * c,
  };
}

export function fromCaveLocal(lx: number, lz: number, site: CaveSite): { x: number; z: number } {
  const c = Math.cos(site.rot);
  const s = Math.sin(site.rot);
  return {
    x: site.x + lx * c + lz * s,
    z: site.z - lx * s + lz * c,
  };
}

export const CAVE_MOUTH_Z = 9.0;
export const CAVE_PORTAL_Z = 4.5;
export const CAVE_CHAMBER_Z = -34.0;
export const CAVE_END_Z = -48.0;

export function cavePathCenterX(lz: number): number {
  if (lz >= 2.0) return 0;
  const d = 2.0 - lz;
  const blend = Math.min(1, d / 7.5);
  const smooth = blend * blend * (3 - 2 * blend);
  return smooth * (Math.sin(d * 0.145) * 7.8 + Math.sin(d * 0.055) * 2.8);
}

export function caveHalfWidthAt(lz: number): number {
  if (lz >= -28.0) return 3.6;
  if (lz <= -36.0) {
    if (lz < -44.0) {
      const bt = Math.max(0, (lz - CAVE_END_Z) / (-44.0 - CAVE_END_Z));
      return 3.5 + bt * 3.5;
    }
    return 7.0;
  }
  const t = (-28.0 - lz) / 8.0;
  return 3.6 + t * t * (3 - 2 * t) * 3.4;
}

export function caveCeilingClearanceAt(lz: number): number {
  if (lz >= 1.5) return 5.8;
  if (lz >= -28.0) return 4.9;
  const t = Math.min(1, (-28.0 - lz) / 8.0);
  return 4.9 + t * t * (3 - 2 * t) * 2.1;
}

export function caveFloorYAt(site: CaveSite, lz: number): number {
  const entryY = 2.35;
  const deepY = site.floorY - 10.2;
  if (lz >= CAVE_MOUTH_Z) return entryY;
  if (lz <= -34.0) return deepY;
  const u = (CAVE_MOUTH_Z - lz) / (CAVE_MOUTH_Z - -34.0);
  const terrace = Math.sin(u * Math.PI * 2) * 0.045;
  const rampU = Math.max(0, Math.min(1, u + terrace));
  return entryY + rampU * (deepY - entryY);
}

export function mountainRockFactorAt(x: number, z: number): number {
  let best = 0;
  for (let i = 0; i < MINI_MOUNTAINS.length; i++) {
    const m = MINI_MOUNTAINS[i];
    const dx = x - m.x;
    const dz = z - m.z;
    if (Math.abs(dx) >= m.radius || Math.abs(dz) >= m.radius) continue;
    const dSq = dx * dx + dz * dz;
    if (dSq < m.radius * m.radius) {
      const f = Math.pow(1 - Math.sqrt(dSq) / m.radius, 1.3);
      if (f > best) best = f;
    }
  }
  for (let i = 0; i < CAVE_SITES.length; i++) {
    const site = CAVE_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    if (Math.abs(dx) >= 48 || Math.abs(dz) >= 48) continue;
    const trig = CAVE_TRIG[i];
    const lx = dx * trig.cos - dz * trig.sin;
    const lz = dx * trig.sin + dz * trig.cos;
    if (Math.abs(lx) < 5.6 && lz > 5.0) continue;
    const pz = (lz + 14.0) * 0.86;
    const dSq = lx * lx + pz * pz;
    if (dSq < 1296) {
      const f = Math.pow(1 - Math.sqrt(dSq) / 36, 1.25);
      if (f > best) best = f;
    }
  }
  const adx = x - FINAL_ARENA_X;
  const adz = z - FINAL_ARENA_Z;
  const maxArenaR = FINAL_ARENA_RADIUS + 14;
  if (Math.abs(adx) < maxArenaR && Math.abs(adz) < maxArenaR) {
    const aSq = adx * adx + adz * adz;
    if (aSq < maxArenaR * maxArenaR) {
      const arenaDist = Math.sqrt(aSq);
      const rimF = Math.max(0, 1 - Math.abs(arenaDist - (FINAL_ARENA_RADIUS - 1.5)) / 10.5);
      const floorF = arenaDist < FINAL_ARENA_RADIUS ? 0.45 : 0;
      const citadelRock = Math.max(rimF * 0.95, floorF);
      if (citadelRock > best) best = citadelRock;
    }
  }
  return Math.min(1, best * 1.35);
}

export function villagePlazaFactorAt(x: number, z: number): number {
  let best = 0;
  for (let i = 0; i < VILLAGE_SITES.length; i++) {
    const v = VILLAGE_SITES[i];
    const dx = x - v.x;
    const dz = z - v.z;
    if (Math.abs(dx) > 23.5 || Math.abs(dz) > 23.5) continue;
    const dSq = dx * dx + dz * dz;
    if (dSq > 552.25) continue;
    const d = Math.sqrt(dSq);
    const t = 1 - Math.max(0, d - 16.0) / 7.5;
    const f = t * t;
    if (f > best) best = f;
  }
  return best;
}

export function biomeAt(x: number, z: number): BiomeId {
  const adx = x - FINAL_ARENA_X;
  const adz = z - FINAL_ARENA_Z;
  if (adx * adx + adz * adz < 76 * 76) return 'ashlands';

  if (mountainRockFactorAt(x, z) > 0.36) return 'mountain';

  for (let i = 0; i < VILLAGE_SITES.length; i++) {
    const v = VILLAGE_SITES[i];
    const vdx = x - v.x;
    const vdz = z - v.z;
    if (vdx * vdx + vdz * vdz < (v.radius + 4) * (v.radius + 4)) return 'meadow';
  }

  // Starter valley core (~360m radius) preserves familiar gentle biomes
  const coreDistSq = x * x + z * z;
  if (coreDistSq < 360 * 360) {
    if (z < -68 && Math.sin(z * 0.008) < 0.38) return 'pine_forest';
    const meadowNoise =
      Math.sin(x * 0.021 + 0.7) * Math.cos(z * 0.021 - 0.4) +
      0.55 * Math.sin((x - z) * 0.015);
    const sdx = x + 8;
    const sdz = z - 4;
    const cdx = x + 124;
    const cdz = z - 92;
    if (sdx * sdx + sdz * sdz < 1156 || cdx * cdx + cdz * cdz < 1024 || meadowNoise > 0.4) {
      return 'meadow';
    }
    if ((x > 30 && z > 18 && meadowNoise > -0.14) || (z > 220 && meadowNoise > -0.18)) {
      return 'blossom_grove';
    }
    return 'oak_forest';
  }

  // Multi-region continent biome generator across all 8096x16192 coordinates
  const temp =
    Math.sin(z * 0.00115 + Math.cos(x * 0.00095) * 1.4) * 0.65 +
    Math.cos(x * 0.00145 - z * 0.00072) * 0.35 +
    (z > 1400 ? 0.32 : z < -1400 ? -0.36 : 0);
  const humid =
    Math.cos(x * 0.00135 + Math.sin(z * 0.0011) * 1.3) * 0.62 +
    Math.sin((x + z) * 0.00088) * 0.38;
  const weird = Math.sin(x * 0.0021 - z * 0.00175 + 1.2);

  if (temp < -0.58) {
    return weird > 0.36 ? 'crystal_canyon' : weird < -0.44 ? 'ancient_highlands' : 'snow_peaks';
  }
  if (temp < -0.18) {
    if (humid > 0.32) return 'pine_forest';
    if (weird > 0.48) return 'autumn_woods';
    return weird < -0.5 ? 'crystal_canyon' : 'pine_forest';
  }
  if (temp > 0.56) {
    if (humid < -0.12) return 'desert';
    if (weird > 0.45) return 'ancient_highlands';
    return 'golden_steppe';
  }
  if (temp > 0.22) {
    if (humid > 0.42) return 'bamboo_grove';
    if (humid < -0.25) return 'golden_steppe';
    return weird > 0.2 ? 'blossom_grove' : 'autumn_woods';
  }

  // Temperate lush mid-latitudes
  if (humid > 0.48) return weird > 0 ? 'mystic_swamp' : 'bamboo_grove';
  if (humid > 0.14) return weird > 0.35 ? 'autumn_woods' : 'oak_forest';
  if (weird < -0.45) return 'mystic_swamp';
  if (weird > 0.45) return 'blossom_grove';
  return 'meadow';
}

function flattenAt(x: number, z: number, cx: number, cz: number, innerR: number, blendR: number): number {
  const maxR = innerR + blendR;
  const dx = x - cx;
  const dz = z - cz;
  if (Math.abs(dx) >= maxR || Math.abs(dz) >= maxR) return 0;
  const dSq = dx * dx + dz * dz;
  if (dSq >= maxR * maxR) return 0;
  const d = Math.sqrt(dSq);
  const t = Math.max(0, 1 - Math.max(0, d - innerR) / blendR);
  return t * t * (3 - 2 * t);
}

// Smooth open-world heightmap: O(1) spatial hash over ~98 houses, dry meadows NEVER dip below WATER_LEVEL (-0.35)
export function groundHeightAt(x: number, z: number): number {
  const hills =
    Math.sin(x * 0.022) * Math.cos(z * 0.02) * 1.45 +
    Math.sin(x * 0.056 + 1.4) * Math.sin(z * 0.052 + 0.5) * 0.42 +
    Math.cos((x + z) * 0.014) * 0.82;

  let flatFactor = 1.0;
  const cands = getCabinCandidates(x, z);
  if (cands) {
    for (let k = 0; k < cands.length; k++) {
      const site = CABIN_SITES[cands[k]];
      const dx = x - site.x;
      const dz = z - site.z;
      if (Math.abs(dx) < 20 && Math.abs(dz) < 20) {
        const dSq = dx * dx + dz * dz;
        if (dSq < 400) {
          const d = Math.sqrt(dSq);
          const t = Math.max(0, 1 - Math.max(0, d - 8.2) / 11.8);
          flatFactor *= 1 - 0.9 * (t * t * (3 - 2 * t));
        }
      }
    }
  }
  const dCands = getDungeonCandidates(x, z);
  if (dCands) {
    for (let k = 0; k < dCands.length; k++) {
      const dSite = DUNGEON_SITES[dCands[k]];
      const dx = x - dSite.x;
      const dz = z - dSite.z;
      if (Math.abs(dx) < 21 && Math.abs(dz) < 21) {
        const dSq = dx * dx + dz * dz;
        if (dSq < 441) {
          const d = Math.sqrt(dSq);
          const t = Math.max(0, 1 - Math.max(0, d - 11.0) / 10.0);
          flatFactor *= 1 - 0.92 * (t * t * (3 - 2 * t));
        }
      }
    }
  }
  const spawnFlatten = flattenAt(x, z, -2, 9, 8, 12);
  const ruinsFlatten = flattenAt(x, z, 46, -24, 10, 12);
  const westCampFlatten = flattenAt(x, z, -62, 42, 9, 12);
  const northValleyFlatten = flattenAt(x, z, -14, -92, 10, 14);
  const eastBastionFlatten = flattenAt(x, z, 84, 46, 10, 14);

  let villageFlatten = 0;
  for (let i = 0; i < VILLAGE_SITES.length; i++) {
    const v = VILLAGE_SITES[i];
    const vf = flattenAt(x, z, v.x, v.z, v.radius - 8, 24);
    if (vf > villageFlatten) villageFlatten = vf;
  }

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

  // Rolling wind-swept sand dunes inside Desert areas
  const desertMask =
    (z > 640 ? Math.min(1, (z - 640) / 140) : Math.max(0, Math.min(1, (x - 260) / 110)) * Math.max(0, Math.min(1, (z - 180) / 90))) *
    (1 - villageFlatten);
  if (desertMask > 0.01 && flatFactor > 0.2) {
    const dune =
      Math.sin(x * 0.032 + z * 0.018) * 1.85 +
      Math.cos(x * 0.068 - z * 0.044) * 0.72 +
      Math.sin((x - z) * 0.012) * 1.15;
    h += dune * desertMask * flatFactor;
  }

  // 12 towering alpine mountains with craggy ridges & steep summit peaks
  for (let i = 0; i < MINI_MOUNTAINS.length; i++) {
    const m = MINI_MOUNTAINS[i];
    const dx = x - m.x;
    const dz = z - m.z;
    if (Math.abs(dx) >= m.radius || Math.abs(dz) >= m.radius) continue;
    const dSq = dx * dx + dz * dz;
    if (dSq < m.radius * m.radius) {
      const dist = Math.sqrt(dSq);
      const t = 1 - dist / m.radius;
      const smooth = Math.pow(t, 1.55);
      const ang = Math.atan2(dz, dx) - m.ridgeAngle;
      const ridge =
        1.0 +
        0.24 * Math.sin(ang * 3) +
        0.15 * Math.cos(ang * 5) +
        0.08 * Math.sin(dist * 0.19);
      h += smooth * m.height * ridge;
    }
  }

  // 10 deep subterranean caves with unbroken mountain crown & clean approach ramp
  for (let i = 0; i < CAVE_SITES.length; i++) {
    const site = CAVE_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    if (Math.abs(dx) >= 50 || Math.abs(dz) >= 50) continue;
    const dSq = dx * dx + dz * dz;
    if (dSq >= 2500) continue;

    const trig = CAVE_TRIG[i];
    const lx = dx * trig.cos - dz * trig.sin;
    const lz = dx * trig.sin + dz * trig.cos;
    const absX = Math.abs(lx);

    if (lz > 4.0 && dSq < 529) {
      const d = Math.sqrt(dSq);
      const ft = Math.max(0, 1 - Math.max(0, d - 13) / 10);
      const frontFlat = ft * ft * (3 - 2 * ft);
      if (frontFlat > 0) {
        h = h * (1 - frontFlat * 0.72) + 2.35 * (frontFlat * 0.72);
      }
    }

    const px = lx * 0.88;
    const pz = (lz + 14.0) * 0.82;
    const peakDistSq = px * px + pz * pz;
    if (peakDistSq < 1369) {
      const peakDist = Math.sqrt(peakDistSq);
      const t = 1 - peakDist / 37;
      const smooth = t * t * (3 - 2 * t);
      const ang = Math.atan2(pz, lx);
      const crag = 1.0 + 0.16 * Math.sin(ang * 4) + 0.08 * Math.cos(peakDist * 0.42);
      const mouthClearX = absX < 8.5 ? Math.max(0, Math.min(1, (absX - 4.4) / 4.1)) : 1.0;
      const mouthClearZ = lz > 2.5 ? Math.max(0, Math.min(1, (8.2 - lz) / 5.7)) : 1.0;
      const hillMask = Math.max(mouthClearX, 1.0 - (1.0 - mouthClearZ) * (1.0 - mouthClearX));
      h += smooth * site.peakHeight * crag * hillMask;
    }

    // Carve ONLY the exterior approach trench in front of & right under the stone portal (mountain roof stays solid above lz < 3.0)
    if (absX < 6.4 && lz >= 2.2 && lz < 14.0) {
      const fx = Math.max(0, Math.min(1, (6.4 - absX) / 2.2));
      const fzFront = Math.max(0, Math.min(1, (14.0 - lz) / 4.2));
      const fzBack = Math.max(0, Math.min(1, (lz - 2.2) / 1.4));
      const carve = Math.min(fx, fzFront, fzBack);
      const smoothCarve = carve * carve * (3 - 2 * carve);

      const targetTunnelY = caveFloorYAt(site, Math.max(CAVE_PORTAL_Z, lz)) - 0.16;
      h = h * (1 - smoothCarve) + targetTunnelY * smoothCarve;
    }
  }

  // Final Boss Citadel plateau
  const adx = x - FINAL_ARENA_X;
  const adz = z - FINAL_ARENA_Z;
  const arenaMaxR = FINAL_ARENA_RADIUS + 16;
  if (Math.abs(adx) < arenaMaxR && Math.abs(adz) < arenaMaxR) {
    const aSq = adx * adx + adz * adz;
    if (aSq < arenaMaxR * arenaMaxR) {
      const aDist = Math.sqrt(aSq);
      const plateauTopY = 6.55;
      if (aDist <= FINAL_ARENA_RADIUS - 3.5) {
        h = plateauTopY;
      } else {
        const slopeT = Math.max(0, Math.min(1, (arenaMaxR - aDist) / 19.5));
        const smoothPlateau = slopeT * slopeT * (3 - 2 * slopeT);
        h = h * (1 - smoothPlateau) + plateauTopY * smoothPlateau;
      }
      if (aDist > FINAL_ARENA_RADIUS - 2.5 && aDist < FINAL_ARENA_RADIUS + 13 && !(Math.abs(adx) < 7.2 && adz > 10)) {
        const rimWeight = 1 - Math.abs(aDist - (FINAL_ARENA_RADIUS + 4.5)) / 8.5;
        const spire = 1 + 0.35 * Math.sin(Math.atan2(adz, adx) * 6);
        h += Math.max(0, rimWeight) * 5.4 * spire;
      }
      if (Math.abs(adx) < 6.4 && adz > 15 && adz < arenaMaxR) {
        const rampZ = Math.max(0, Math.min(1, (arenaMaxR - adz) / (FINAL_ARENA_RADIUS + 1)));
        const rampX = Math.max(0, Math.min(1, (6.4 - Math.abs(adx)) / 2.2));
        const rampBlend = rampX * rampX * (3 - 2 * rampX);
        const baseValleyY = 2.35;
        const rampY = baseValleyY + rampZ * (plateauTopY - baseValleyY);
        h = h * (1 - rampBlend) + rampY * rampBlend;
      }
    }
  }

  // Localized River channel carving (full inner bed always below WATER_LEVEL so terrain never pokes through water)
  const rX = riverCenterX(z);
  const rW = riverHalfWidthAt(z);
  const distToRiver = Math.abs(x - rX);
  if (distToRiver < rW + 6.2) {
    const bankLevel = Math.max(0.76, h);
    const innerBedR = rW * 0.85;
    const t = Math.max(0, Math.min(1, (distToRiver - innerBedR) / (rW * 0.15 + 6.2)));
    const smooth = t * t * (3 - 2 * t);
    const bedDepth = -2.1 + Math.sin(z * 0.15) * 0.12;
    h = bedDepth * (1 - smooth) + bankLevel * smooth;
  } else {
    h = Math.max(h, 0.58);
  }

  // Outer perimeter mountain ridge framing the 8096x16192 open world
  const edgeX = Math.max(0, Math.abs(x) - (WORLD_HALF_X - 48));
  const edgeZ = Math.max(0, Math.abs(z) - (WORLD_HALF_Z - 48));
  const edgeD = Math.max(edgeX, edgeZ);
  if (edgeD > 0) {
    const rim = Math.min(2.4, edgeD / 42);
    const noise = 1.0 + 0.25 * Math.sin(x * 0.04 + z * 0.03);
    h += rim * rim * 28 * noise;
  }

  return h;
}

export function cabinBaseY(site: CabinSite = CABIN_SITES[0]): number {
  return groundHeightAt(site.x, site.z) - 0.15;
}

export function cabinFloorY(site: CabinSite = CABIN_SITES[0]): number {
  return cabinBaseY(site) + 0.82;
}

export function cabinSecondFloorY(site: CabinSite = CABIN_SITES[0]): number {
  return cabinFloorY(site) + 3.4;
}

export function dungeonFloorY(site: DungeonSite): number {
  return groundHeightAt(site.x, site.z) + 0.42;
}

export function fromDungeonLocal(
  lx: number,
  lz: number,
  site: DungeonSite,
): { x: number; z: number } {
  const c = Math.cos(site.rot);
  const s = Math.sin(site.rot);
  return {
    x: site.x + lx * c + lz * s,
    z: site.z - lx * s + lz * c,
  };
}

export function toCabinLocal(
  x: number,
  z: number,
  site: CabinSite = CABIN_SITES[0],
): { lx: number; lz: number } {
  const dx = x - site.x;
  const dz = z - site.z;
  const c = Math.cos(site.rot);
  const s = Math.sin(site.rot);
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
    x: site.x + lx * c + lz * s,
    z: site.z - lx * s + lz * c,
  };
}

export function findInsideCabin(x: number, z: number): CabinSite | null {
  const cands = getCabinCandidates(x, z);
  if (!cands) return null;
  for (let k = 0; k < cands.length; k++) {
    const i = cands[k];
    const site = CABIN_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    if (Math.abs(dx) > 9.5 || Math.abs(dz) > 9.5) continue;
    const dims = getCabinDims(site.style);
    const trig = CABIN_TRIG[i];
    const lx = dx * trig.cos - dz * trig.sin;
    const lz = dx * trig.sin + dz * trig.cos;
    const insideShell =
      Math.abs(lx) < dims.halfW + 0.25 &&
      lz > -dims.halfD - 0.15 &&
      lz < dims.halfD + (dims.isTwoStory ? 1.35 : 0.35);
    const onDoorThreshold =
      Math.abs(lx) < 1.95 && lz >= dims.halfD + 0.35 && lz <= dims.halfD + 1.95;
    if (insideShell || onDoorThreshold) {
      return site;
    }
  }
  return null;
}

export function findInsideDungeon(x: number, z: number): DungeonSite | null {
  const dCands = getDungeonCandidates(x, z);
  if (!dCands) return null;
  for (let k = 0; k < dCands.length; k++) {
    const i = dCands[k];
    const site = DUNGEON_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    if (Math.abs(dx) > 12 || Math.abs(dz) > 12) continue;
    const trig = DUNGEON_TRIG[i];
    const lx = dx * trig.cos - dz * trig.sin;
    const lz = dx * trig.sin + dz * trig.cos;
    if (Math.abs(lx) <= 7.8 && Math.abs(lz) <= 7.8) {
      return site;
    }
  }
  return null;
}

export function findInsideCave(x: number, z: number, currentY?: number): CaveSite | null {
  for (let i = 0; i < CAVE_SITES.length; i++) {
    const site = CAVE_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    if (Math.abs(dx) > 64 || Math.abs(dz) > 64) continue;
    const trig = CAVE_TRIG[i];
    const lx = dx * trig.cos - dz * trig.sin;
    const lz = dx * trig.sin + dz * trig.cos;
    if (lz < CAVE_END_Z - 0.5 || lz > CAVE_PORTAL_Z + 0.9) continue;
    const cx = cavePathCenterX(lz);
    const hw = caveHalfWidthAt(lz);
    if (Math.abs(lx - cx) <= hw + 0.85) {
      if (currentY !== undefined) {
        const floorY = caveFloorYAt(site, lz);
        const ceilY = floorY + caveCeilingClearanceAt(lz);
        if (currentY > ceilY + 0.8) continue;
      }
      return site;
    }
  }
  return null;
}

export function isInsideCabin(x: number, z: number): boolean {
  return findInsideCabin(x, z) !== null;
}

export function nearAnyDungeon(x: number, z: number, margin: number): boolean {
  const mSq = margin * margin;
  if (margin <= 26) {
    const dCands = getDungeonCandidates(x, z);
    if (!dCands) return false;
    for (let k = 0; k < dCands.length; k++) {
      const site = DUNGEON_SITES[dCands[k]];
      const dx = x - site.x;
      const dz = z - site.z;
      if (Math.abs(dx) < margin && Math.abs(dz) < margin && dx * dx + dz * dz < mSq) return true;
    }
    return false;
  }
  for (let i = 0; i < DUNGEON_SITES.length; i++) {
    const site = DUNGEON_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    if (Math.abs(dx) < margin && Math.abs(dz) < margin && dx * dx + dz * dz < mSq) return true;
  }
  return false;
}

export function nearAnyCabin(x: number, z: number, margin: number): boolean {
  const mSq = margin * margin;
  if (margin <= 24) {
    const cands = getCabinCandidates(x, z);
    if (!cands) return false;
    for (let k = 0; k < cands.length; k++) {
      const site = CABIN_SITES[cands[k]];
      const dx = x - site.x;
      const dz = z - site.z;
      if (Math.abs(dx) < margin && Math.abs(dz) < margin && dx * dx + dz * dz < mSq) return true;
    }
    return false;
  }
  for (let i = 0; i < CABIN_SITES.length; i++) {
    const site = CABIN_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    if (Math.abs(dx) < margin && Math.abs(dz) < margin && dx * dx + dz * dz < mSq) return true;
  }
  return false;
}

export function nearAnyCave(x: number, z: number, margin: number): boolean {
  const mSq = margin * margin;
  const checkR = Math.max(margin, 24);
  for (let i = 0; i < CAVE_SITES.length; i++) {
    const site = CAVE_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    if (Math.abs(dx) >= Math.max(checkR, 60) || Math.abs(dz) >= Math.max(checkR, 60)) continue;
    if (dx * dx + dz * dz < mSq) return true;
    const trig = CAVE_TRIG[i];
    const lx = dx * trig.cos - dz * trig.sin;
    const lz = dx * trig.sin + dz * trig.cos;
    if (lz > -18 && lz < 15.5 && Math.abs(lx - cavePathCenterX(lz)) < 8.0) return true;
  }
  return false;
}

export function nearVillage(x: number, z: number, margin = 74): boolean {
  for (let i = 0; i < VILLAGE_SITES.length; i++) {
    const v = VILLAGE_SITES[i];
    const dx = x - v.x;
    const dz = z - v.z;
    const r = Math.min(margin, v.radius);
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

export function resolveWorldBounds(x: number, z: number, radius = 0.6): [number, number] {
  const maxX = WORLD_HALF_X - 8 - radius;
  const maxZ = WORLD_HALF_Z - 8 - radius;
  return [Math.max(-maxX, Math.min(maxX, x)), Math.max(-maxZ, Math.min(maxZ, z))];
}

const SHELL_WALLS: readonly [number, number, number, number][] = [
  [-CABIN_HALF_W - 0.35, -CABIN_HALF_W + 0.35, -CABIN_HALF_D - 0.3, CABIN_HALF_D + 0.3],
  [CABIN_HALF_W - 0.35, CABIN_HALF_W + 0.35, -CABIN_HALF_D - 0.3, CABIN_HALF_D + 0.3],
  [-CABIN_HALF_W - 0.3, CABIN_HALF_W + 0.3, -CABIN_HALF_D - 0.35, -CABIN_HALF_D + 0.35],
  [-CABIN_HALF_W - 0.3, -1.35, CABIN_HALF_D - 0.32, CABIN_HALF_D + 0.32],
  [1.35, CABIN_HALF_W + 0.3, CABIN_HALF_D - 0.32, CABIN_HALF_D + 0.32],
];

const CABIN_STANDARD_BOXES: readonly [number, number, number, number][] = [
  ...SHELL_WALLS,
  [-3.5, -1.9, -1.6, 0.3],
  [1.5, 3.6, -2.9, -1.4],
  [-3.5, -1.8, -3.0, -2.0],
  [-3.5, -2.1, 1.35, 2.55],
  [1.85, 3.05, 0.5, 1.7],
];

const CABIN_COUNTER_BOXES: readonly [number, number, number, number][] = [
  ...SHELL_WALLS,
  [-1.85, 2.15, -1.65, -0.55],
  [-3.5, -2.15, -2.8, 0.45],
  [-3.5, -2.1, 1.35, 2.55],
  [2.25, 3.55, 0.5, 2.25],
];

const CAVE_PORTAL_PILLARS: readonly [number, number, number, number][] = [
  [-5.6, -3.55, 3.8, 6.2],
  [3.55, 5.6, 3.8, 6.2],
];

let _pushX = 0;
let _pushZ = 0;

function pushOutOfBoxesInPlace(
  rx: number,
  rz: number,
  radius: number,
  boxes: readonly [number, number, number, number][],
): void {
  let outX = rx;
  let outZ = rz;
  const rSq = radius * radius;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const minX = b[0];
    const maxX = b[1];
    const minZ = b[2];
    const maxZ = b[3];
    const closestX = outX < minX ? minX : outX > maxX ? maxX : outX;
    const closestZ = outZ < minZ ? minZ : outZ > maxZ ? maxZ : outZ;
    const dx = outX - closestX;
    const dz = outZ - closestZ;
    const dSq = dx * dx + dz * dz;
    if (dSq < rSq) {
      if (dSq > 0.00000001) {
        const d = Math.sqrt(dSq);
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
  _pushX = outX;
  _pushZ = outZ;
}

const TWO_STORY_HALF_W = 4.8;
const TWO_STORY_HALF_D = 4.0;

const TWO_STORY_GROUND_WALLS: readonly [number, number, number, number][] = [
  [-TWO_STORY_HALF_W - 0.35, -TWO_STORY_HALF_W + 0.35, -TWO_STORY_HALF_D - 0.3, TWO_STORY_HALF_D + 0.3],
  [TWO_STORY_HALF_W - 0.35, TWO_STORY_HALF_W + 0.35, -TWO_STORY_HALF_D - 0.3, TWO_STORY_HALF_D + 0.3],
  [-TWO_STORY_HALF_W - 0.3, TWO_STORY_HALF_W + 0.3, -TWO_STORY_HALF_D - 0.35, -TWO_STORY_HALF_D + 0.35],
  [-TWO_STORY_HALF_W - 0.3, -1.45, TWO_STORY_HALF_D - 0.32, TWO_STORY_HALF_D + 0.32],
  [1.45, TWO_STORY_HALF_W + 0.3, TWO_STORY_HALF_D - 0.32, TWO_STORY_HALF_D + 0.32],
];

const TWO_STORY_GROUND_BOXES: readonly [number, number, number, number][] = [
  ...TWO_STORY_GROUND_WALLS,
  [-4.3, -2.55, -1.9, 0.2],
  [-4.25, -2.4, -3.55, -2.5],
  [-4.25, -2.6, 1.5, 2.9],
  [1.95, 2.25, -2.2, 2.5], // staircase inner side partition
];

const TWO_STORY_SECOND_BOXES: readonly [number, number, number, number][] = [
  // Exterior 2F walls (open doorway at front balcony lx in [-1.45, 1.45])
  [-TWO_STORY_HALF_W - 0.35, -TWO_STORY_HALF_W + 0.35, -TWO_STORY_HALF_D - 0.3, TWO_STORY_HALF_D + 0.3],
  [TWO_STORY_HALF_W - 0.35, TWO_STORY_HALF_W + 0.35, -TWO_STORY_HALF_D - 0.3, TWO_STORY_HALF_D + 0.3],
  [-TWO_STORY_HALF_W - 0.3, TWO_STORY_HALF_W + 0.3, -TWO_STORY_HALF_D - 0.35, -TWO_STORY_HALF_D + 0.35],
  [-TWO_STORY_HALF_W - 0.3, -1.35, TWO_STORY_HALF_D - 0.32, TWO_STORY_HALF_D + 0.32],
  [1.35, TWO_STORY_HALF_W + 0.3, TWO_STORY_HALF_D - 0.32, TWO_STORY_HALF_D + 0.32],
  // Balcony guardrails (front balcony extends to lz = +5.35)
  [-TWO_STORY_HALF_W - 0.25, -TWO_STORY_HALF_W + 0.25, TWO_STORY_HALF_D, TWO_STORY_HALF_D + 1.45],
  [TWO_STORY_HALF_W - 0.25, TWO_STORY_HALF_W + 0.25, TWO_STORY_HALF_D, TWO_STORY_HALF_D + 1.45],
  [-TWO_STORY_HALF_W - 0.25, TWO_STORY_HALF_W + 0.25, TWO_STORY_HALF_D + 1.25, TWO_STORY_HALF_D + 1.55],
  // Stairwell guardrail on 2F (open at top landing lz < -1.8)
  [1.92, 2.24, -1.75, 2.95],
  [1.92, 4.55, 2.75, 3.05],
  // Upstairs bed & wardrobe
  [-4.25, -2.35, -3.55, -2.0],
  [-4.25, -2.85, 0.8, 2.4],
];

const DUNGEON_WALL_BOXES: readonly [number, number, number, number][] = [
  [-8.2, -7.2, -8.2, 8.2],
  [7.2, 8.2, -8.2, 8.2],
  [-8.2, 8.2, -8.2, -7.2],
  [-8.2, -2.2, 7.2, 8.2],
  [2.2, 8.2, 7.2, 8.2],
  [-4.8, -3.5, -4.8, -3.5],
  [3.5, 4.8, -4.8, -3.5],
  [-4.8, -3.5, 3.5, 4.8],
  [3.5, 4.8, 3.5, 4.8],
];

export function resolveCabinCollision(
  x: number,
  z: number,
  radius: number,
  currentY?: number,
): [number, number] {
  let outX = x;
  let outZ = z;
  const cands = getCabinCandidates(x, z);
  if (!cands) return [outX, outZ];

  for (let k = 0; k < cands.length; k++) {
    const i = cands[k];
    const site = CABIN_SITES[i];
    const dx = outX - site.x;
    const dz = outZ - site.z;
    if (Math.abs(dx) > 10.8 || Math.abs(dz) > 10.8) continue;

    const dims = getCabinDims(site.style);
    const trig = CABIN_TRIG[i];
    const lx = dx * trig.cos - dz * trig.sin;
    const lz = dx * trig.sin + dz * trig.cos;
    if (
      Math.abs(lx) > dims.halfW + 1.8 ||
      lz < -dims.halfD - 1.5 ||
      lz > dims.halfD + (dims.isTwoStory ? 2.4 : 1.5)
    ) {
      continue;
    }

    if (dims.isTwoStory) {
      const secondY = cabinFloorY(site) + 2.35;
      const onSecondFloor = currentY !== undefined && currentY >= secondY;
      pushOutOfBoxesInPlace(
        lx,
        lz,
        radius,
        onSecondFloor ? TWO_STORY_SECOND_BOXES : TWO_STORY_GROUND_BOXES,
      );
    } else {
      const isMerchantHouse =
        site.style === 'shop' || site.style === 'bakery' || site.style === 'alchemy';
      pushOutOfBoxesInPlace(lx, lz, radius, isMerchantHouse ? CABIN_COUNTER_BOXES : CABIN_STANDARD_BOXES);
    }
    outX = site.x + _pushX * trig.cos + _pushZ * trig.sin;
    outZ = site.z - _pushX * trig.sin + _pushZ * trig.cos;
  }

  return [outX, outZ];
}

export function resolveDungeonCollision(
  x: number,
  z: number,
  radius: number,
): [number, number] {
  let outX = x;
  let outZ = z;
  const dCands = getDungeonCandidates(x, z);
  if (!dCands) return [outX, outZ];

  for (let k = 0; k < dCands.length; k++) {
    const i = dCands[k];
    const site = DUNGEON_SITES[i];
    const dx = outX - site.x;
    const dz = outZ - site.z;
    if (Math.abs(dx) > 11.5 || Math.abs(dz) > 11.5) continue;

    const trig = DUNGEON_TRIG[i];
    const lx = dx * trig.cos - dz * trig.sin;
    const lz = dx * trig.sin + dz * trig.cos;
    if (Math.abs(lx) > 9.6 || Math.abs(lz) > 9.6) continue;

    pushOutOfBoxesInPlace(lx, lz, radius, DUNGEON_WALL_BOXES);
    outX = site.x + _pushX * trig.cos + _pushZ * trig.sin;
    outZ = site.z - _pushX * trig.sin + _pushZ * trig.cos;
  }

  return [outX, outZ];
}

export function resolveCaveCollision(
  x: number,
  z: number,
  radius: number,
  currentY?: number,
): [number, number] {
  let outX = x;
  let outZ = z;

  for (let i = 0; i < CAVE_SITES.length; i++) {
    const site = CAVE_SITES[i];
    const dx = outX - site.x;
    const dz = outZ - site.z;
    if (Math.abs(dx) > 64 || Math.abs(dz) > 64) continue;

    const trig = CAVE_TRIG[i];
    let lx = dx * trig.cos - dz * trig.sin;
    let lz = dx * trig.sin + dz * trig.cos;
    if (lz < CAVE_END_Z - 2.0 || lz > CAVE_MOUTH_Z + 1.0) continue;

    const clampedZ = Math.max(CAVE_END_Z, Math.min(CAVE_MOUTH_Z, lz));
    const floorY = caveFloorYAt(site, clampedZ);
    if (currentY !== undefined && currentY > floorY + caveCeilingClearanceAt(clampedZ) + 0.6) {
      continue;
    }

    if (lz >= 3.6 && lz <= 6.2) {
      pushOutOfBoxesInPlace(lx, lz, radius, CAVE_PORTAL_PILLARS);
      lx = _pushX;
      lz = _pushZ;
    }

    if (lz < 4.5) {
      const cx = cavePathCenterX(clampedZ);
      const hw = caveHalfWidthAt(clampedZ);
      if (Math.abs(lx - cx) <= hw + 2.6) {
        const minX = cx - hw + radius + 0.22;
        const maxX = cx + hw - radius - 0.22;
        if (lx < minX) lx = minX;
        else if (lx > maxX) lx = maxX;
        const minZ = CAVE_END_Z + 0.8 + radius;
        if (lz < minZ) lz = minZ;
      }
    } else if (lz <= CAVE_MOUTH_Z + 0.2 && Math.abs(lx) <= 4.35 && Math.abs(lx) > 3.55 - radius) {
      // Gentle wing-wall containment along the entrance trench
      if (lx < 0 && lx > -4.35 && lx < -3.55 + radius) lx = -3.55 + radius;
      else if (lx > 0 && lx < 4.35 && lx > 3.55 - radius) lx = 3.55 - radius;
    }

    outX = site.x + lx * trig.cos + lz * trig.sin;
    outZ = site.z - lx * trig.sin + lz * trig.cos;
  }

  return [outX, outZ];
}

export function bridgeSurfaceAt(x: number, z: number): number | null {
  const dz = z - BRIDGE_Z;
  if (Math.abs(dz) > BRIDGE_HALF_WIDTH) return null;
  const bxCenter = riverCenterX(BRIDGE_Z);
  const dx = x - bxCenter;
  if (Math.abs(dx) > BRIDGE_HALF_LENGTH) {
    return null;
  }
  const u = dx / BRIDGE_HALF_LENGTH;
  const arch = Math.cos(u * Math.PI * 0.5) * 1.45;
  const bankH = 1.82;
  return bankH + arch;
}

export function walkableHeightAt(x: number, z: number, currentY?: number): number {
  const terrainY = groundHeightAt(x, z);

  const cands = getCabinCandidates(x, z);
  if (cands) {
    for (let k = 0; k < cands.length; k++) {
      const i = cands[k];
      const site = CABIN_SITES[i];
      const dx = x - site.x;
      const dz = z - site.z;
      if (Math.abs(dx) > 10.8 || Math.abs(dz) > 10.8) continue;
      const dims = getCabinDims(site.style);
      const trig = CABIN_TRIG[i];
      const lx = dx * trig.cos - dz * trig.sin;
      const lz = dx * trig.sin + dz * trig.cos;
      if (
        Math.abs(lx) > dims.halfW + 1.4 ||
        lz < -dims.halfD - 0.5 ||
        lz > dims.halfD + 3.2
      ) {
        continue;
      }
      const floorY = cabinFloorY(site);
      if (dims.isTwoStory) {
        const secondFloorY = floorY + 3.4;
        if (lx >= 2.1 && lx <= 4.55 && lz >= -1.95 && lz <= 2.85) {
          const stairT = Math.max(0, Math.min(1, (2.65 - lz) / 4.45));
          const stairY = floorY + stairT * 3.4;
          if (currentY === undefined || currentY <= stairY + 1.65) {
            return Math.max(terrainY, stairY);
          }
        }
        const inStairwellHole = lx >= 2.05 && lx <= 4.55 && lz >= -1.85 && lz <= 2.85;
        if (
          currentY !== undefined &&
          currentY >= floorY + 2.35 &&
          !inStairwellHole &&
          Math.abs(lx) <= dims.halfW + 0.15 &&
          lz >= -dims.halfD &&
          lz <= dims.halfD + 1.38
        ) {
          return secondFloorY;
        }
      }
      if (Math.abs(lx) <= dims.halfW && lz >= -dims.halfD && lz <= dims.halfD + 1.55) {
        return Math.max(terrainY, floorY);
      }
      if (Math.abs(lx) <= 2.15 && lz > dims.halfD + 1.55 && lz <= dims.halfD + 2.85) {
        const t = Math.max(0, Math.min(1, (dims.halfD + 2.85 - lz) / 1.3));
        return Math.max(terrainY, terrainY * (1 - t) + floorY * t);
      }
    }
  }

  const dCands = getDungeonCandidates(x, z);
  if (dCands) {
    for (let k = 0; k < dCands.length; k++) {
      const i = dCands[k];
      const dSite = DUNGEON_SITES[i];
      const dx = x - dSite.x;
      const dz = z - dSite.z;
      if (Math.abs(dx) > 11.5 || Math.abs(dz) > 11.5) continue;
      const trig = DUNGEON_TRIG[i];
      const lx = dx * trig.cos - dz * trig.sin;
      const lz = dx * trig.sin + dz * trig.cos;
      if (Math.abs(lx) <= 8.2 && Math.abs(lz) <= 8.2) {
        const baseFloor = dungeonFloorY(dSite);
        if (Math.abs(lx) <= 2.2 && Math.abs(lz) <= 2.2) {
          return Math.max(terrainY, baseFloor + 0.55);
        }
        return Math.max(terrainY, baseFloor);
      }
    }
  }

  for (let i = 0; i < CAVE_SITES.length; i++) {
    const site = CAVE_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    if (Math.abs(dx) > 64 || Math.abs(dz) > 64) continue;
    const trig = CAVE_TRIG[i];
    const lx = dx * trig.cos - dz * trig.sin;
    const lz = dx * trig.sin + dz * trig.cos;
    if (lz < CAVE_END_Z || lz > CAVE_MOUTH_Z) continue;
    const cx = cavePathCenterX(lz);
    const hw = caveHalfWidthAt(lz);
    if (Math.abs(lx - cx) <= hw + 0.65) {
      const caveWalkY = caveFloorYAt(site, lz);
      if (currentY === undefined || currentY <= caveWalkY + 4.3) {
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

export function getZoneName(x: number, z: number, currentY?: number): string {
  const inside = findInsideCabin(x, z);
  if (inside) return `Усередині: ${inside.name}`;
  const insideDungeon = findInsideDungeon(x, z);
  if (insideDungeon) return `Підземелля: ${insideDungeon.name}`;
  const insideCave = findInsideCave(x, z, currentY);
  if (insideCave) return `Печера: ${insideCave.name}`;
  const cands = getCabinCandidates(x, z);
  if (cands) {
    for (let k = 0; k < cands.length; k++) {
      const site = CABIN_SITES[cands[k]];
      if (Math.hypot(x - site.x, z - site.z) < 13) return site.name;
    }
  }
  const dCands = getDungeonCandidates(x, z);
  if (dCands) {
    for (let k = 0; k < dCands.length; k++) {
      const dSite = DUNGEON_SITES[dCands[k]];
      if (Math.hypot(x - dSite.x, z - dSite.z) < 15) return `Підземелля: ${dSite.name}`;
    }
  }
  for (let i = 0; i < VILLAGE_SITES.length; i++) {
    const v = VILLAGE_SITES[i];
    if (Math.hypot(x - v.x, z - v.z) < v.radius) return v.name;
  }
  for (const site of CAVE_SITES) {
    if (Math.hypot(x - site.x, z - site.z) < 16) return `Вхід: ${site.name}`;
  }
  const bx = riverCenterX(BRIDGE_Z);
  if (Math.hypot(x - FINAL_ARENA_X, z - FINAL_ARENA_Z) < FINAL_ARENA_RADIUS + 8) {
    return 'Цитадель Повелителя Тіні';
  }
  if (Math.hypot(x - bx, z - BRIDGE_Z) < 11) return 'Арковий Міст';
  if (Math.hypot(x - 46, z + 24) < 18) return 'Кам’яні Руїни';
  if (Math.hypot(x + 62, z - 42) < 22) return 'Табір Лісорубів';
  if (Math.hypot(x + 14, z + 92) < 24) return 'Північний Бір';
  if (Math.hypot(x - 84, z - 46) < 24) return 'Східне Нагір’я';

  const b = biomeAt(x, z);
  if (b === 'ashlands') return 'Попільні Землі Цитаделі';
  if (b === 'snow_peaks') return 'Снігова Тайга Півночі';
  if (b === 'desert') return 'Велика Піщана Пустеля';
  if (b === 'golden_steppe') return 'Золотий Степ Півдня';
  if (b === 'blossom_grove') return 'Сакуровий Квітковий Гай';
  if (b === 'oak_forest') return 'Смарагдовий Дубовий Ліс';
  if (b === 'pine_forest') return 'Північний Хвойний Бір';
  if (b === 'mystic_swamp') return 'Туманні Магічні Болота';
  if (b === 'autumn_woods') return 'Золотий Осінній Ліс';
  if (b === 'bamboo_grove') return 'Смарагдовий Бамбуковий Гай';
  if (b === 'crystal_canyon') return 'Кришталевий Каньйон';
  if (b === 'ancient_highlands') return 'Стародавні Високогір’я';
  if (b === 'mountain') return 'Високі Скелясті Гори';
  return 'Сонячна Галявина';
}
