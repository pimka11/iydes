import { CameraViewMode, GameMode, GraphicsPreset, LanguageCode, SeasonId, WeatherId } from './types';

export const LANGUAGE_OPTIONS: { id: LanguageCode; native: string; short: string }[] = [
  { id: 'uk', native: 'Українська', short: 'UK' },
  { id: 'en', native: 'English', short: 'EN' },
  { id: 'es', native: 'Español', short: 'ES' },
  { id: 'pl', native: 'Polski', short: 'PL' },
  { id: 'ru', native: 'Русский', short: 'RU' },
];

export interface UiStrings {
  // Graphics Settings Modal
  gfxTitle: string;
  gfxSubtitle: string;
  languageLabel: string;
  themeSection: string;
  lightTheme: string;
  darkTheme: string;
  presetSection: string;
  presetLow: string;
  presetLowDesc: string;
  presetMedium: string;
  presetMediumDesc: string;
  presetHigh: string;
  presetHighDesc: string;
  presetUltra: string;
  presetUltraDesc: string;
  renderScaleLabel: string;
  shadowQualityLabel: string;
  shadowOff: string;
  grassDensityLabel: string;
  viewDistanceLabel: string;
  viewNear: string;
  viewMedium: string;
  viewFar: string;
  dofLabel: string;
  bloomLabel: string;
  ecoModeLabel: string;
  onLabel: string;
  offLabel: string;
  recommendedBtn: string;
  doneBtn: string;
  closeLabel: string;

  // Game modes & cameras
  modeSurvival: string;
  modeSurvivalShort: string;
  modePeaceful: string;
  modePeacefulShort: string;
  modeCreative: string;
  modeCreativeShort: string;
  camThird: string;
  camFirst: string;
  camClose: string;
  camFar: string;
  camShortThird: string;
  camShortFirst: string;
  camShortClose: string;
  camShortFar: string;

  // Seasons & Weather
  seasons: Record<SeasonId, string>;
  weather: Record<WeatherId, Record<SeasonId, string>>;
  minShort: string;
  secShort: string;

  // HUD Top & Hero
  menu: string;
  help: string;
  sound: string;
  camera: string;
  cabin: string;
  river: string;
  fullscreen: string;
  themeShort: string;
  graphics: string;
  level: string;
  levelShort: string;
  coinsShort: string;
  health: string;
  wave: string;
  allGoalsDone: string;
  nearby: string;
  metersShort: string;
  inventoryBtn: string;
  craftBtn: string;
  shopBtn: string;
  questsBtn: string;
  onlineBtn: string;
  gamepadBtn: string;
  toolsLabel: string;
  saveBtn: string;
  resetBtn: string;
  spawnerBtn: string;
  arsenalBtn: string;
  merchantsBtn: string;
  screenBtn: string;

  // Dock / Prompts
  actionInteract: string;
  actionShop: string;
  actionShield: string;
  actionJump: string;
  actionAttack: string;
  actionBuild: string;
  actionChop: string;
  actionMine: string;
  sprintBadge: string;
  autoFloor: string;
  floorShort: string;

  // Modals / Misc
  offlineBanner: string;
  installPhone: string;
  installTitle: string;
  installGotIt: string;
  copyLink: string;
  linkCopied: string;
  webglLostTitle: string;
  webglLostBody: string;
  reloadBtn: string;

  // Inventory & Craft Modal
  tabInventory: string;
  tabCraft: string;
  tabShop: string;
  tabQuests: string;
  filterAll: string;
  filterWeapons: string;
  filterPotions: string;
  filterResources: string;
  filterRelics: string;
  filterAllRecipes: string;
  filterCraftWeapons: string;
  filterCraftRelics: string;
  filterCraftPotions: string;
  filterCraftBuilding: string;
  filterCraftUpgrades: string;
  btnCraft: string;
  btnBuy: string;
  btnUse: string;
  btnEquip: string;
  btnEquipped: string;
  btnLocked: string;
  btnOwned: string;
  freeCreative: string;
  searchPotions: string;
  onlyOwned: string;

  // Zone translations
  insidePrefix: string;
  cavePrefix: string;
  dungeonPrefix: string;
  entrancePrefix: string;
  story2FBadge: string;
}

const UK: UiStrings = {
  gfxTitle: 'Налаштування Графіки, Мови та Теми',
  gfxSubtitle: 'Зміни зберігаються автоматично в SQL базі даних',
  languageLabel: 'Мова гри (Language)',
  themeSection: 'Тема інтерфейсу',
  lightTheme: 'Світла тема',
  darkTheme: 'Темна тема',
  presetSection: 'Загальний профіль якості',
  presetLow: 'Низька',
  presetLowDesc: 'Максимальний FPS 144+: без постобробки, 25% трави, 65% рендер',
  presetMedium: 'Середня',
  presetMediumDesc: 'Плавний баланс: 1K тіні, 50% трави, без важкого Bloom/DoF',
  presetHigh: 'Висока (130+ FPS)',
  presetHighDesc: 'Рекомендовано для 130+ FPS: 100% рендер, 1K тіні, 75% трави, прямий вивід',
  presetUltra: 'Ультра',
  presetUltraDesc: 'Кінематографічна якість: 2K тіні, 125% рендер, Bloom та DoF',
  renderScaleLabel: 'Масштаб рендеру (Роздільна здатність)',
  shadowQualityLabel: 'Деталізація тіней',
  shadowOff: 'Вимк.',
  grassDensityLabel: 'Щільність трави',
  viewDistanceLabel: 'Дальність виду',
  viewNear: 'Близька',
  viewMedium: 'Середня',
  viewFar: 'Далека',
  dofLabel: 'Глибина різкості',
  bloomLabel: 'Світіння (Bloom)',
  ecoModeLabel: 'Еко 60 FPS',
  onLabel: 'Увімк',
  offLabel: 'Вимк',
  recommendedBtn: 'Рекомендовані',
  doneBtn: 'Готово',
  closeLabel: 'Закрити',

  modeSurvival: 'Вижив.',
  modeSurvivalShort: 'В',
  modePeaceful: 'Мирний',
  modePeacefulShort: 'М',
  modeCreative: 'Творчий',
  modeCreativeShort: 'Т',
  camThird: '3-тя [7]',
  camFirst: '1-ше [7]',
  camClose: 'Близько [7]',
  camFar: 'Огляд [7]',
  camShortThird: '3-тя',
  camShortFirst: '1-ше',
  camShortClose: 'Близ.',
  camShortFar: 'Огляд',

  seasons: { spring: 'Весна', summer: 'Літо', autumn: 'Осінь', winter: 'Зима' },
  weather: {
    clear: { spring: 'Ясно', summer: 'Ясно', autumn: 'Ясно', winter: 'Ясно' },
    rain: { spring: 'Дощ', summer: 'Гроза', autumn: 'Злива', winter: 'Хуртовина' },
    fog: { spring: 'Туман', summer: 'Туман', autumn: 'Мряка', winter: 'Іній' },
    precip: { spring: 'Цвіт', summer: 'Пух', autumn: 'Листопад', winter: 'Сніг' },
  },
  minShort: 'хв',
  secShort: 'с',

  menu: 'Меню',
  help: 'Довідка',
  sound: 'Звук',
  camera: 'Камера',
  cabin: 'Хата',
  river: 'Річка',
  fullscreen: 'Екран',
  themeShort: 'Тема',
  graphics: 'Графіка',
  level: 'Рівень',
  levelShort: 'Р.',
  coinsShort: 'м',
  health: 'Здоров’я',
  wave: 'Хвиля',
  allGoalsDone: 'Усі цілі виконано!',
  nearby: 'Поруч',
  metersShort: 'м',
  inventoryBtn: 'Інвентар',
  craftBtn: 'Крафт',
  shopBtn: 'Крамниця',
  questsBtn: 'Квести',
  onlineBtn: 'Онлайн',
  gamepadBtn: 'Геймпад',
  toolsLabel: 'Панель',
  saveBtn: 'Зберегти',
  resetBtn: 'Нова гра',
  spawnerBtn: 'Моби',
  arsenalBtn: 'Арсенал',
  merchantsBtn: 'Купці',
  screenBtn: 'Екран',

  actionInteract: 'Дія',
  actionShop: 'Крам',
  actionShield: 'Щит',
  actionJump: 'Стриб',
  actionAttack: 'Удар',
  actionBuild: 'Збуд',
  actionChop: 'Зруб',
  actionMine: 'Коп',
  sprintBadge: 'БІГ',
  autoFloor: 'Авто',
  floorShort: 'п',

  offlineBanner: 'Офлайн режим — гра працює з кешу',
  installPhone: 'На телефон',
  installTitle: 'Як відкривати на телефоні / зробити APK',
  installGotIt: 'Зрозуміло',
  copyLink: 'Скопіювати посилання гри',
  linkCopied: 'Посилання скопійовано',
  webglLostTitle: 'Втрачено контекст WebGL',
  webglLostBody: 'Перезавантажте сторінку, щоб відновити 3D-рендеринг сцени.',
  reloadBtn: 'Перезавантажити',

  tabInventory: 'Інвентар (I)',
  tabCraft: 'Крафт (K)',
  tabShop: 'Крамниця (M)',
  tabQuests: 'Цілі (J)',
  filterAll: 'Усе',
  filterWeapons: 'Зброя та інструменти',
  filterPotions: 'Зілля та їжа',
  filterResources: 'Ресурси',
  filterRelics: 'Реліквії',
  filterAllRecipes: 'Усі рецепти',
  filterCraftWeapons: 'Зброя (25)',
  filterCraftRelics: 'Реліквії (6)',
  filterCraftPotions: 'Зілля та їжа',
  filterCraftBuilding: 'Будівництво',
  filterCraftUpgrades: 'Апгрейди',
  btnCraft: 'Скрафтити',
  btnBuy: 'Купити',
  btnUse: 'Використати',
  btnEquip: 'Обрати',
  btnEquipped: 'В руках',
  btnLocked: 'Закрито',
  btnOwned: 'Є',
  freeCreative: 'Безкоштовно (Творчий)',
  searchPotions: 'Пошук зіль та їжі...',
  onlyOwned: 'Лише наявні',

  insidePrefix: 'Усередині',
  cavePrefix: 'Печера',
  dungeonPrefix: 'Підземелля',
  entrancePrefix: 'Вхід',
  story2FBadge: '2-й поверх',
};

const EN: UiStrings = {
  gfxTitle: 'Graphics, Language & Theme',
  gfxSubtitle: 'Changes are saved automatically to the SQL database',
  languageLabel: 'Game Language',
  themeSection: 'Interface Theme',
  lightTheme: 'Light Theme',
  darkTheme: 'Dark Theme',
  presetSection: 'Overall Quality Profile',
  presetLow: 'Low',
  presetLowDesc: 'Max FPS 144+: no post-processing, 25% grass, 65% render scale',
  presetMedium: 'Medium',
  presetMediumDesc: 'Smooth balance: 1K shadows, 50% grass, no heavy Bloom/DoF',
  presetHigh: 'High (130+ FPS)',
  presetHighDesc: 'Recommended for 130+ FPS: 100% scale, 1K shadows, 75% grass, direct render',
  presetUltra: 'Ultra',
  presetUltraDesc: 'Cinematic fidelity: 2K shadows, 125% scale, Bloom & DoF',
  renderScaleLabel: 'Render Scale (Resolution)',
  shadowQualityLabel: 'Shadow Quality',
  shadowOff: 'Off',
  grassDensityLabel: 'Grass Density',
  viewDistanceLabel: 'View Distance',
  viewNear: 'Near',
  viewMedium: 'Medium',
  viewFar: 'Far',
  dofLabel: 'Depth of Field',
  bloomLabel: 'Bloom Glow',
  ecoModeLabel: 'Eco 60 FPS',
  onLabel: 'On',
  offLabel: 'Off',
  recommendedBtn: 'Recommended',
  doneBtn: 'Done',
  closeLabel: 'Close',

  modeSurvival: 'Survival',
  modeSurvivalShort: 'S',
  modePeaceful: 'Peaceful',
  modePeacefulShort: 'P',
  modeCreative: 'Creative',
  modeCreativeShort: 'C',
  camThird: '3rd [7]',
  camFirst: '1st [7]',
  camClose: 'Close [7]',
  camFar: 'Wide [7]',
  camShortThird: '3rd',
  camShortFirst: '1st',
  camShortClose: 'Close',
  camShortFar: 'Wide',

  seasons: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
  weather: {
    clear: { spring: 'Clear', summer: 'Clear', autumn: 'Clear', winter: 'Clear' },
    rain: { spring: 'Rain', summer: 'Storm', autumn: 'Downpour', winter: 'Blizzard' },
    fog: { spring: 'Fog', summer: 'Mist', autumn: 'Drizzle', winter: 'Frost' },
    precip: { spring: 'Petals', summer: 'Pollen', autumn: 'Leaves', winter: 'Snow' },
  },
  minShort: 'm',
  secShort: 's',

  menu: 'Menu',
  help: 'Help',
  sound: 'Sound',
  camera: 'Camera',
  cabin: 'Home',
  river: 'River',
  fullscreen: 'Screen',
  themeShort: 'Theme',
  graphics: 'Graphics',
  level: 'Level',
  levelShort: 'Lv.',
  coinsShort: 'c',
  health: 'Health',
  wave: 'Wave',
  allGoalsDone: 'All goals completed!',
  nearby: 'Nearby',
  metersShort: 'm',
  inventoryBtn: 'Inventory',
  craftBtn: 'Craft',
  shopBtn: 'Shop',
  questsBtn: 'Quests',
  onlineBtn: 'Online',
  gamepadBtn: 'Gamepad',
  toolsLabel: 'Panel',
  saveBtn: 'Save',
  resetBtn: 'New Game',
  spawnerBtn: 'Mobs',
  arsenalBtn: 'Arsenal',
  merchantsBtn: 'Traders',
  screenBtn: 'Screen',

  actionInteract: 'Use',
  actionShop: 'Shop',
  actionShield: 'Shield',
  actionJump: 'Jump',
  actionAttack: 'Hit',
  actionBuild: 'Build',
  actionChop: 'Chop',
  actionMine: 'Mine',
  sprintBadge: 'RUN',
  autoFloor: 'Auto',
  floorShort: 'F',

  offlineBanner: 'Offline mode — running from local cache',
  installPhone: 'Install App',
  installTitle: 'How to install on phone / APK',
  installGotIt: 'Got it',
  copyLink: 'Copy game link',
  linkCopied: 'Link copied',
  webglLostTitle: 'WebGL Context Lost',
  webglLostBody: 'Reload the page to restore 3D scene rendering.',
  reloadBtn: 'Reload',

  tabInventory: 'Inventory (I)',
  tabCraft: 'Craft (K)',
  tabShop: 'Shop (M)',
  tabQuests: 'Quests (J)',
  filterAll: 'All',
  filterWeapons: 'Weapons & Tools',
  filterPotions: 'Potions & Food',
  filterResources: 'Resources',
  filterRelics: 'Relics',
  filterAllRecipes: 'All Recipes',
  filterCraftWeapons: 'Weapons (25)',
  filterCraftRelics: 'Relics (6)',
  filterCraftPotions: 'Potions & Food',
  filterCraftBuilding: 'Building',
  filterCraftUpgrades: 'Upgrades',
  btnCraft: 'Craft',
  btnBuy: 'Buy',
  btnUse: 'Use',
  btnEquip: 'Equip',
  btnEquipped: 'Equipped',
  btnLocked: 'Locked',
  btnOwned: 'Owned',
  freeCreative: 'Free (Creative)',
  searchPotions: 'Search potions & food...',
  onlyOwned: 'Owned only',

  insidePrefix: 'Inside',
  cavePrefix: 'Cave',
  dungeonPrefix: 'Dungeon',
  entrancePrefix: 'Entrance',
  story2FBadge: '2nd Floor',
};

const ES: UiStrings = {
  gfxTitle: 'Gráficos, Idioma y Tema',
  gfxSubtitle: 'Los cambios se guardan automáticamente en la base SQL',
  languageLabel: 'Idioma del juego',
  themeSection: 'Tema de interfaz',
  lightTheme: 'Tema claro',
  darkTheme: 'Tema oscuro',
  presetSection: 'Perfil de calidad',
  presetLow: 'Bajo',
  presetLowDesc: 'Máximo FPS 144+: sin posprocesado, 25% hierba, escala 65%',
  presetMedium: 'Medio',
  presetMediumDesc: 'Equilibrio fluido: sombras 1K, 50% hierba, sin Bloom/DoF',
  presetHigh: 'Alto (130+ FPS)',
  presetHighDesc: 'Recomendado para 130+ FPS: escala 100%, sombras 1K, 75% hierba',
  presetUltra: 'Ultra',
  presetUltraDesc: 'Calidad máxima: sombras 2K, escala 125%, Bloom y DoF',
  renderScaleLabel: 'Escala de renderizado',
  shadowQualityLabel: 'Calidad de sombras',
  shadowOff: 'No',
  grassDensityLabel: 'Densidad de hierba',
  viewDistanceLabel: 'Distancia de visión',
  viewNear: 'Cerca',
  viewMedium: 'Media',
  viewFar: 'Lejos',
  dofLabel: 'Profundidad de campo',
  bloomLabel: 'Brillo (Bloom)',
  ecoModeLabel: 'Eco 60 FPS',
  onLabel: 'Sí',
  offLabel: 'No',
  recommendedBtn: 'Recomendado',
  doneBtn: 'Listo',
  closeLabel: 'Cerrar',

  modeSurvival: 'Superv.',
  modeSurvivalShort: 'S',
  modePeaceful: 'Pacífico',
  modePeacefulShort: 'P',
  modeCreative: 'Creativo',
  modeCreativeShort: 'C',
  camThird: '3.ª [7]',
  camFirst: '1.ª [7]',
  camClose: 'Cerca [7]',
  camFar: 'Amplia [7]',
  camShortThird: '3.ª',
  camShortFirst: '1.ª',
  camShortClose: 'Cerca',
  camShortFar: 'Amplia',

  seasons: { spring: 'Primavera', summer: 'Verano', autumn: 'Otoño', winter: 'Invierno' },
  weather: {
    clear: { spring: 'Despejado', summer: 'Despejado', autumn: 'Despejado', winter: 'Despejado' },
    rain: { spring: 'Lluvia', summer: 'Tormenta', autumn: 'Aguacero', winter: 'Ventisca' },
    fog: { spring: 'Niebla', summer: 'Bruma', autumn: 'Llovizna', winter: 'Escarcha' },
    precip: { spring: 'Pétalos', summer: 'Polen', autumn: 'Hojas', winter: 'Nieve' },
  },
  minShort: 'm',
  secShort: 's',

  menu: 'Menú',
  help: 'Ayuda',
  sound: 'Sonido',
  camera: 'Cámara',
  cabin: 'Casa',
  river: 'Río',
  fullscreen: 'Pantalla',
  themeShort: 'Tema',
  graphics: 'Gráficos',
  level: 'Nivel',
  levelShort: 'Nv.',
  coinsShort: 'm',
  health: 'Salud',
  wave: 'Oleada',
  allGoalsDone: '¡Todos los objetivos listos!',
  nearby: 'Cerca',
  metersShort: 'm',
  inventoryBtn: 'Inventario',
  craftBtn: 'Fabricar',
  shopBtn: 'Tienda',
  questsBtn: 'Misiones',
  onlineBtn: 'En línea',
  gamepadBtn: 'Mando',
  toolsLabel: 'Panel',
  saveBtn: 'Guardar',
  resetBtn: 'Nueva',
  spawnerBtn: 'Mobs',
  arsenalBtn: 'Arsenal',
  merchantsBtn: 'Mercaderes',
  screenBtn: 'Pantalla',

  actionInteract: 'Usar',
  actionShop: 'Tienda',
  actionShield: 'Escudo',
  actionJump: 'Saltar',
  actionAttack: 'Golpe',
  actionBuild: 'Constr.',
  actionChop: 'Talar',
  actionMine: 'Minar',
  sprintBadge: 'CORRER',
  autoFloor: 'Auto',
  floorShort: 'P',

  offlineBanner: 'Modo sin conexión — usando caché local',
  installPhone: 'Instalar App',
  installTitle: 'Cómo abrir en móvil / crear APK',
  installGotIt: 'Entendido',
  copyLink: 'Copiar enlace',
  linkCopied: 'Enlace copiado',
  webglLostTitle: 'Contexto WebGL perdido',
  webglLostBody: 'Recarga la página para restaurar la escena 3D.',
  reloadBtn: 'Recargar',

  tabInventory: 'Inventario (I)',
  tabCraft: 'Fabricar (K)',
  tabShop: 'Tienda (M)',
  tabQuests: 'Misiones (J)',
  filterAll: 'Todo',
  filterWeapons: 'Armas y herramientas',
  filterPotions: 'Pociones y comida',
  filterResources: 'Recursos',
  filterRelics: 'Reliquias',
  filterAllRecipes: 'Todas las recetas',
  filterCraftWeapons: 'Armas (25)',
  filterCraftRelics: 'Reliquias (6)',
  filterCraftPotions: 'Pociones y comida',
  filterCraftBuilding: 'Construcción',
  filterCraftUpgrades: 'Mejoras',
  btnCraft: 'Crear',
  btnBuy: 'Comprar',
  btnUse: 'Usar',
  btnEquip: 'Elegir',
  btnEquipped: 'En mano',
  btnLocked: 'Bloqueado',
  btnOwned: 'Tienes',
  freeCreative: 'Gratis (Creativo)',
  searchPotions: 'Buscar pociones y comida...',
  onlyOwned: 'Solo propios',

  insidePrefix: 'Dentro',
  cavePrefix: 'Cueva',
  dungeonPrefix: 'Mazmorra',
  entrancePrefix: 'Entrada',
  story2FBadge: '2.ª Planta',
};

const PL: UiStrings = {
  gfxTitle: 'Ustawienia Grafiki, Języka i Motywu',
  gfxSubtitle: 'Zmiany zapisują się automatycznie w bazie SQL',
  languageLabel: 'Język gry',
  themeSection: 'Motyw interfejsu',
  lightTheme: 'Jasny motyw',
  darkTheme: 'Ciemny motyw',
  presetSection: 'Profil jakości',
  presetLow: 'Niska',
  presetLowDesc: 'Maksimum FPS 144+: bez efektów, 25% trawy, 65% skali',
  presetMedium: 'Średnia',
  presetMediumDesc: 'Płynny balans: cienie 1K, 50% trawy, bez Bloom/DoF',
  presetHigh: 'Wysoka (130+ FPS)',
  presetHighDesc: 'Zalecane dla 130+ FPS: skala 100%, cienie 1K, 75% trawy',
  presetUltra: 'Ultra',
  presetUltraDesc: 'Pełna jakość: cienie 2K, skala 125%, Bloom i DoF',
  renderScaleLabel: 'Skala renderowania',
  shadowQualityLabel: 'Jakość cieni',
  shadowOff: 'Wył.',
  grassDensityLabel: 'Gęstość trawy',
  viewDistanceLabel: 'Zasięg widzenia',
  viewNear: 'Bliski',
  viewMedium: 'Średni',
  viewFar: 'Daleki',
  dofLabel: 'Głębia ostrości',
  bloomLabel: 'Poświata (Bloom)',
  ecoModeLabel: 'Eko 60 FPS',
  onLabel: 'Wł.',
  offLabel: 'Wył.',
  recommendedBtn: 'Zalecane',
  doneBtn: 'Gotowe',
  closeLabel: 'Zamknij',

  modeSurvival: 'Przetrw.',
  modeSurvivalShort: 'P',
  modePeaceful: 'Pokojowy',
  modePeacefulShort: 'M',
  modeCreative: 'Twórczy',
  modeCreativeShort: 'T',
  camThird: '3-cia [7]',
  camFirst: '1-sza [7]',
  camClose: 'Blisko [7]',
  camFar: 'Widok [7]',
  camShortThird: '3-cia',
  camShortFirst: '1-sza',
  camShortClose: 'Blisko',
  camShortFar: 'Widok',

  seasons: { spring: 'Wiosna', summer: 'Lato', autumn: 'Jesień', winter: 'Zima' },
  weather: {
    clear: { spring: 'Pogodnie', summer: 'Pogodnie', autumn: 'Pogodnie', winter: 'Pogodnie' },
    rain: { spring: 'Deszcz', summer: 'Burza', autumn: 'Ulewa', winter: 'Zamieć' },
    fog: { spring: 'Mgła', summer: 'Mgiełka', autumn: 'Mżawka', winter: 'Szron' },
    precip: { spring: 'Płatki', summer: 'Pyłek', autumn: 'Liście', winter: 'Śnieg' },
  },
  minShort: 'min',
  secShort: 's',

  menu: 'Menu',
  help: 'Pomoc',
  sound: 'Dźwięk',
  camera: 'Kamera',
  cabin: 'Chata',
  river: 'Rzeka',
  fullscreen: 'Ekran',
  themeShort: 'Motyw',
  graphics: 'Grafika',
  level: 'Poziom',
  levelShort: 'Poz.',
  coinsShort: 'm',
  health: 'Zdrowie',
  wave: 'Fala',
  allGoalsDone: 'Wszystkie cele ukończone!',
  nearby: 'Blisko',
  metersShort: 'm',
  inventoryBtn: 'Ekwipunek',
  craftBtn: 'Rzemiosło',
  shopBtn: 'Sklep',
  questsBtn: 'Zadania',
  onlineBtn: 'Online',
  gamepadBtn: 'Pad',
  toolsLabel: 'Panel',
  saveBtn: 'Zapisz',
  resetBtn: 'Nowa gra',
  spawnerBtn: 'Moby',
  arsenalBtn: 'Arsenał',
  merchantsBtn: 'Kupcy',
  screenBtn: 'Ekran',

  actionInteract: 'Użyj',
  actionShop: 'Sklep',
  actionShield: 'Tarcza',
  actionJump: 'Skok',
  actionAttack: 'Cios',
  actionBuild: 'Buduj',
  actionChop: 'Rąb',
  actionMine: 'Kop',
  sprintBadge: 'BIEG',
  autoFloor: 'Auto',
  floorShort: 'p',

  offlineBanner: 'Tryb offline — gra działa z pamięci podręcznej',
  installPhone: 'Na telefon',
  installTitle: 'Jak uruchomić na telefonie / APK',
  installGotIt: 'Rozumiem',
  copyLink: 'Skopiuj link do gry',
  linkCopied: 'Skopiowano link',
  webglLostTitle: 'Utracono kontekst WebGL',
  webglLostBody: 'Odśwież stronę, aby przywrócić renderowanie 3D.',
  reloadBtn: 'Odśwież',

  tabInventory: 'Ekwipunek (I)',
  tabCraft: 'Rzemiosło (K)',
  tabShop: 'Sklep (M)',
  tabQuests: 'Cele (J)',
  filterAll: 'Wszystko',
  filterWeapons: 'Broń i narzędzia',
  filterPotions: 'Mikstury i jedzenie',
  filterResources: 'Surowce',
  filterRelics: 'Relikty',
  filterAllRecipes: 'Wszystkie recepty',
  filterCraftWeapons: 'Broń (25)',
  filterCraftRelics: 'Relikty (6)',
  filterCraftPotions: 'Mikstury i jedzenie',
  filterCraftBuilding: 'Budowanie',
  filterCraftUpgrades: 'Ulepszenia',
  btnCraft: 'Wytwórz',
  btnBuy: 'Kup',
  btnUse: 'Użyj',
  btnEquip: 'Wybierz',
  btnEquipped: 'W dłoni',
  btnLocked: 'Zamknięte',
  btnOwned: 'Masz',
  freeCreative: 'Za darmo (Twórczy)',
  searchPotions: 'Szukaj mikstur i jedzenia...',
  onlyOwned: 'Tylko posiadane',

  insidePrefix: 'Wewnątrz',
  cavePrefix: 'Jaskinia',
  dungeonPrefix: 'Lochy',
  entrancePrefix: 'Wejście',
  story2FBadge: '2. piętro',
};

const RU: UiStrings = {
  gfxTitle: 'Настройки Графики, Языка и Темы',
  gfxSubtitle: 'Изменения сохраняются автоматически в SQL базу данных',
  languageLabel: 'Язык игры',
  themeSection: 'Тема интерфейса',
  lightTheme: 'Светлая тема',
  darkTheme: 'Тёмная тема',
  presetSection: 'Общий профиль качества',
  presetLow: 'Низкое',
  presetLowDesc: 'Максимум FPS 144+: без постобработки, 25% травы, 65% рендер',
  presetMedium: 'Среднее',
  presetMediumDesc: 'Плавный баланс: 1K тени, 50% травы, без тяжёлого Bloom/DoF',
  presetHigh: 'Высокое (130+ FPS)',
  presetHighDesc: 'Рекомендуется для 130+ FPS: 100% рендер, 1K тени, 75% травы',
  presetUltra: 'Ультра',
  presetUltraDesc: 'Кинокачество: 2K тени, 125% рендер, Bloom и DoF',
  renderScaleLabel: 'Масштаб рендера (Разрешение)',
  shadowQualityLabel: 'Детализация теней',
  shadowOff: 'Выкл.',
  grassDensityLabel: 'Плотность травы',
  viewDistanceLabel: 'Дальность обзора',
  viewNear: 'Ближняя',
  viewMedium: 'Средняя',
  viewFar: 'Дальняя',
  dofLabel: 'Глубина резкости',
  bloomLabel: 'Свечение (Bloom)',
  ecoModeLabel: 'Эко 60 FPS',
  onLabel: 'Вкл',
  offLabel: 'Выкл',
  recommendedBtn: 'Рекомендуемые',
  doneBtn: 'Готово',
  closeLabel: 'Закрыть',

  modeSurvival: 'Выжив.',
  modeSurvivalShort: 'В',
  modePeaceful: 'Мирный',
  modePeacefulShort: 'М',
  modeCreative: 'Творч.',
  modeCreativeShort: 'Т',
  camThird: '3-е [7]',
  camFirst: '1-е [7]',
  camClose: 'Близко [7]',
  camFar: 'Обзор [7]',
  camShortThird: '3-е',
  camShortFirst: '1-е',
  camShortClose: 'Близ.',
  camShortFar: 'Обзор',

  seasons: { spring: 'Весна', summer: 'Лето', autumn: 'Осень', winter: 'Зима' },
  weather: {
    clear: { spring: 'Ясно', summer: 'Ясно', autumn: 'Ясно', winter: 'Ясно' },
    rain: { spring: 'Дождь', summer: 'Гроза', autumn: 'Ливень', winter: 'Метель' },
    fog: { spring: 'Туман', summer: 'Туман', autumn: 'Морось', winter: 'Иней' },
    precip: { spring: 'Цветы', summer: 'Пух', autumn: 'Листопад', winter: 'Снег' },
  },
  minShort: 'мин',
  secShort: 'с',

  menu: 'Меню',
  help: 'Справка',
  sound: 'Звук',
  camera: 'Камера',
  cabin: 'Дом',
  river: 'Река',
  fullscreen: 'Экран',
  themeShort: 'Тема',
  graphics: 'Графика',
  level: 'Уровень',
  levelShort: 'Ур.',
  coinsShort: 'м',
  health: 'Здоровье',
  wave: 'Волна',
  allGoalsDone: 'Все цели выполнены!',
  nearby: 'Рядом',
  metersShort: 'м',
  inventoryBtn: 'Инвентарь',
  craftBtn: 'Крафт',
  shopBtn: 'Магазин',
  questsBtn: 'Квесты',
  onlineBtn: 'Онлайн',
  gamepadBtn: 'Геймпад',
  toolsLabel: 'Панель',
  saveBtn: 'Сохранить',
  resetBtn: 'Новая игра',
  spawnerBtn: 'Мобы',
  arsenalBtn: 'Арсенал',
  merchantsBtn: 'Торговцы',
  screenBtn: 'Экран',

  actionInteract: 'Действ.',
  actionShop: 'Лавка',
  actionShield: 'Щит',
  actionJump: 'Прыжок',
  actionAttack: 'Удар',
  actionBuild: 'Строить',
  actionChop: 'Рубить',
  actionMine: 'Копать',
  sprintBadge: 'БЕГ',
  autoFloor: 'Авто',
  floorShort: 'э',

  offlineBanner: 'Офлайн режим — игра работает из кэша',
  installPhone: 'На телефон',
  installTitle: 'Как открыть на телефоне / сделать APK',
  installGotIt: 'Понятно',
  copyLink: 'Скопировать ссылку на игру',
  linkCopied: 'Ссылка скопирована',
  webglLostTitle: 'Контекст WebGL потерян',
  webglLostBody: 'Перезагрузите страницу, чтобы восстановить 3D-рендеринг.',
  reloadBtn: 'Перезагрузить',

  tabInventory: 'Инвентарь (I)',
  tabCraft: 'Крафт (K)',
  tabShop: 'Магазин (M)',
  tabQuests: 'Цели (J)',
  filterAll: 'Всё',
  filterWeapons: 'Оружие и инструменты',
  filterPotions: 'Зелья и еда',
  filterResources: 'Ресурсы',
  filterRelics: 'Реликвии',
  filterAllRecipes: 'Все рецепты',
  filterCraftWeapons: 'Оружие (25)',
  filterCraftRelics: 'Реликвии (6)',
  filterCraftPotions: 'Зелья и еда',
  filterCraftBuilding: 'Строительство',
  filterCraftUpgrades: 'Улучшения',
  btnCraft: 'Создать',
  btnBuy: 'Купить',
  btnUse: 'Использовать',
  btnEquip: 'Выбрать',
  btnEquipped: 'В руках',
  btnLocked: 'Закрыто',
  btnOwned: 'Есть',
  freeCreative: 'Бесплатно (Творч.)',
  searchPotions: 'Поиск зелий и еды...',
  onlyOwned: 'Только в наличии',

  insidePrefix: 'Внутри',
  cavePrefix: 'Пещера',
  dungeonPrefix: 'Подземелье',
  entrancePrefix: 'Вход',
  story2FBadge: '2-й этаж',
};

const DICTIONARIES: Record<LanguageCode, UiStrings> = { uk: UK, en: EN, es: ES, pl: PL, ru: RU };

export function getUiStrings(lang?: LanguageCode): UiStrings {
  return DICTIONARIES[lang ?? 'uk'] ?? UK;
}

export function getPresetInfo(lang: LanguageCode | undefined, preset: GraphicsPreset): { label: string; desc: string } {
  const s = getUiStrings(lang);
  if (preset === 'low') return { label: s.presetLow, desc: s.presetLowDesc };
  if (preset === 'medium') return { label: s.presetMedium, desc: s.presetMediumDesc };
  if (preset === 'ultra') return { label: s.presetUltra, desc: s.presetUltraDesc };
  return { label: s.presetHigh, desc: s.presetHighDesc };
}

export function getGameModeLabel(lang: LanguageCode | undefined, mode: GameMode): { short: string; full: string } {
  const s = getUiStrings(lang);
  if (mode === 'peaceful') return { short: s.modePeacefulShort, full: s.modePeaceful };
  if (mode === 'creative') return { short: s.modeCreativeShort, full: s.modeCreative };
  return { short: s.modeSurvivalShort, full: s.modeSurvival };
}

export function getCameraLabel(lang: LanguageCode | undefined, view: CameraViewMode, compact = false): string {
  const s = getUiStrings(lang);
  if (compact) {
    if (view === 'first') return s.camShortFirst;
    if (view === 'close') return s.camShortClose;
    if (view === 'far') return s.camShortFar;
    return s.camShortThird;
  }
  if (view === 'first') return s.camFirst;
  if (view === 'close') return s.camClose;
  if (view === 'far') return s.camFar;
  return s.camThird;
}

const ZONE_BASE_MAP: Record<string, Record<LanguageCode, string>> = {
  'Сонячна Галявина': { uk: 'Сонячна Галявина', en: 'Sunny Meadow', es: 'Prado Soleado', pl: 'Słoneczna Polana', ru: 'Солнечная Поляна' },
  'Смарагдовий Дубовий Ліс': { uk: 'Смарагдовий Дубовий Ліс', en: 'Emerald Oak Forest', es: 'Bosque de Robles Esmeralda', pl: 'Szmaragdowy Las Dębowy', ru: 'Изумрудный Дубовый Лес' },
  'Північний Хвойний Бір': { uk: 'Північний Хвойний Бір', en: 'Northern Pine Woods', es: 'Pinar del Norte', pl: 'Północny Bór Igielny', ru: 'Северный Хвойный Бор' },
  'Сакуровий Квітковий Гай': { uk: 'Сакуровий Квітковий Гай', en: 'Sakura Blossom Grove', es: 'Arboleda de Cerezos', pl: 'Gaj Kwitnącej Wiśni', ru: 'Сакуровая Цветочная Роща' },
  'Снігова Тайга Півночі': { uk: 'Снігова Тайга Півночі', en: 'Northern Snow Taiga', es: 'Taiga Nevada del Norte', pl: 'Śnieżna Tajga Północy', ru: 'Снежная Тайга Севера' },
  'Велика Піщана Пустеля': { uk: 'Велика Піщана Пустеля', en: 'Great Sand Desert', es: 'Gran Desierto de Arena', pl: 'Wielka Pustynia Piaskowa', ru: 'Великая Песчаная Пустыня' },
  'Золотий Степ Півдня': { uk: 'Золотий Степ Півдня', en: 'Southern Golden Steppe', es: 'Estepa Dorada del Sur', pl: 'Złoty Step Południa', ru: 'Золотая Степь Юга' },
  'Попільні Землі Цитаделі': { uk: 'Попільні Землі Цитаделі', en: 'Citadel Ashlands', es: 'Tierras de Ceniza', pl: 'Popielne Ziemie Cytadeli', ru: 'Пепельные Земли Цитадели' },
  'Високі Скелясті Гори': { uk: 'Високі Скелясті Гори', en: 'High Rocky Mountains', es: 'Altas Montañas Rocosas', pl: 'Wysokie Góry Skaliste', ru: 'Высокие Скалистые Горы' },
  'Туманні Магічні Болота': { uk: 'Туманні Магічні Болота', en: 'Misty Mystic Swamps', es: 'Pantanos Místicos', pl: 'Mgliste Magiczne Bagna', ru: 'Туманные Магические Болота' },
  'Золотий Осінній Ліс': { uk: 'Золотий Осінній Ліс', en: 'Golden Autumn Woods', es: 'Bosque Dorado de Otoño', pl: 'Złoty Jesienny Las', ru: 'Золотой Осенний Лес' },
  'Смарагдовий Бамбуковий Гай': { uk: 'Смарагдовий Бамбуковий Гай', en: 'Emerald Bamboo Grove', es: 'Bosque de Bambú Esmeralda', pl: 'Szmaragdowy Gaj Bambusowy', ru: 'Изумрудная Бамбуковая Роща' },
  'Кришталевий Каньйон': { uk: 'Кришталевий Каньйон', en: 'Crystal Canyon', es: 'Cañón de Cristal', pl: 'Kryształowy Kanion', ru: 'Хрустальный Каньон' },
  'Стародавні Високогір’я': { uk: 'Стародавні Високогір’я', en: 'Ancient Highlands', es: 'Tierras Altas Antiguas', pl: 'Starożytne Wyżyny', ru: 'Древние Высокогорья' },
  'Цитадель Повелителя Тіні': { uk: 'Цитадель Повелителя Тіні', en: 'Shadow Lord Citadel', es: 'Ciudadela del Señor Sombra', pl: 'Cytadela Władcy Cienia', ru: 'Цитадель Повелителя Тени' },
  'Арковий Міст': { uk: 'Арковий Міст', en: 'Arched Bridge', es: 'Puente de Arco', pl: 'Most Łukowy', ru: 'Арочный Мост' },
  'Кам’яні Руїни': { uk: 'Кам’яні Руїни', en: 'Stone Ruins', es: 'Ruinas de Piedra', pl: 'Kamienne Ruiny', ru: 'Каменные Руины' },
  'Табір Лісорубів': { uk: 'Табір Лісорубів', en: 'Lumberjack Camp', es: 'Campamento Leñador', pl: 'Obóz Drwali', ru: 'Лагерь Лесорубов' },
  'Північний Бір': { uk: 'Північний Бір', en: 'Northern Woods', es: 'Bosque Norteño', pl: 'Północny Las', ru: 'Северный Бор' },
  'Східне Нагір’я': { uk: 'Східне Нагір’я', en: 'Eastern Ridge', es: 'Cresta del Este', pl: 'Wschodnie Wzgórza', ru: 'Восточное Нагорье' },
};

export function translateZoneName(rawZone: string, lang: LanguageCode | undefined): string {
  const l = lang ?? 'uk';
  if (l === 'uk') return rawZone;
  const s = getUiStrings(l);
  if (rawZone.startsWith('Усередині: ')) {
    return `${s.insidePrefix}: ${rawZone.slice('Усередині: '.length)}`;
  }
  if (rawZone.startsWith('Печера: ')) {
    return `${s.cavePrefix}: ${rawZone.slice('Печера: '.length)}`;
  }
  if (rawZone.startsWith('Підземелля: ')) {
    return `${s.dungeonPrefix}: ${rawZone.slice('Підземелля: '.length)}`;
  }
  if (rawZone.startsWith('Вхід: ')) {
    return `${s.entrancePrefix}: ${rawZone.slice('Вхід: '.length)}`;
  }
  return ZONE_BASE_MAP[rawZone]?.[l] ?? rawZone;
}
