import React, { useEffect, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Crosshair,
  Home,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sword,
  Hammer,
  Zap,
  Target,
  Plus,
  Sparkles,
  RotateCcw,
  Waves,
  Eye,
  Sun,
  Moon,
  Gamepad2,
  Gauge,
  Backpack,
  FlaskConical,
  MessageCircle,
  Pickaxe,
  BedDouble,
  Activity,
  Maximize2,
  Minimize2,
  Store,
  Shield,
  ScrollText,
  CloudRain,
  Snowflake,
  Leaf,
  CloudFog,
  Save,
  RefreshCw,
  Trophy,
  Compass,
  Axe,
  Wrench,
  RotateCw,
  Trash2,
  Lock,
  Trees,
  SlidersHorizontal,
  Database,
  Camera,
  Image as ImageIcon,
  Users,
  Smartphone,
  Monitor,
  Send,
  Navigation,
  X,
  Menu,
} from 'lucide-react';
import {
  BUILD_PIECES,
  BuildPieceKind,
  CONSUMABLES,
  ConsumableId,
  GameHudState,
  GameMode,
  MerchantKind,
  MOB_DEFS,
  MobKind,
  QUESTS,
  RELIC_SKILLS,
  RelicId,
  ResourceId,
  SEASON_LABELS,
  ThemeMode,
  WEAPON_UNLOCK_MAP,
  WEATHER_LABELS,
  WeaponId,
  WEAPONS,
} from '../types';
import { ModalTab } from './InventoryCraftModal';
import { Minimap } from './Minimap';
import { MobileGamepad } from './MobileGamepad';
import { PWAInstallButton } from './PWAInstallButton';
import { CLIENT_APP_LABEL } from '../../version';

interface GameHudProps {
  hud: GameHudState;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenGraphics: () => void;
  onOpenSqlAdmin: () => void;
  onChangeGameMode: (mode: GameMode) => void;
  onCycleCameraView: () => void;
  inventoryTab: ModalTab | null;
  onOpenInventory: (tab: ModalTab, merchant?: MerchantKind) => void;
  onHelpOpenChange?: (open: boolean) => void;
  onInstallModalChange?: (open: boolean) => void;
  onUseConsumable: (id: ConsumableId) => void;
  onActivateRelic: (id: RelicId) => void;
  onSetBlocking: (active: boolean) => void;
  onCycleSeason: () => void;
  onCycleWeather: () => void;
  onStart: () => void;
  onRespawn: () => void;
  onSelectWeapon: (id: WeaponId) => void;
  onSpawnMob: (kind: MobKind) => void;
  onToggleMute: () => void;
  onToggleCameraMode: () => void;
  onToggleDof: () => void;
  onToggleShadowUpscale: () => void;
  onToggleEcoMode: () => void;
  onTeleportCabin: () => void;
  onTeleportRiver: () => void;
  onInteract: () => void;
  onPressSpawnThrone?: () => void;
  onAttack: () => void;
  onJump: () => void;
  onTouchMove: (x: number, z: number, sprint?: boolean) => void;
  onSaveGame?: () => void;
  onNewGame?: () => void;
  onContinueFreePlay?: () => void;
  onSetBuildPiece?: (kind: BuildPieceKind) => void;
  onCycleBuildPiece?: () => void;
  onRotateBuild?: () => void;
  onCycleBuildFloor?: (delta?: number) => void;
  onSetBuildFloor?: (level: number) => void;
  onDemolishBuild?: () => void;
  onPlaceWorkbench?: () => void;
  onlineOpen?: boolean;
  onOnlineOpenChange?: (open: boolean) => void;
  onChangePlayerName?: (name: string) => void;
  onSendChat?: (text: string) => void;
  onTeleportToPlayer?: (id: string) => void;
}

function getWeaponIcon(id: WeaponId): React.ReactNode {
  if (id === 'axe') return <Axe className="w-4 h-4" />;
  if (id === 'pickaxe') return <Pickaxe className="w-4 h-4" />;
  if (id === 'builder') return <Wrench className="w-4 h-4" />;
  const def = WEAPONS.find((w) => w.id === id);
  if (def?.category === 'heavy') return <Hammer className="w-4 h-4" />;
  if (def?.category === 'magic') return <Sparkles className="w-4 h-4" />;
  if (def?.category === 'ranged') {
    return id === 'blaster' || id === 'plasma_rifle' || id === 'laser_pistol' ? (
      <Zap className="w-4 h-4" />
    ) : (
      <Target className="w-4 h-4" />
    );
  }
  return <Sword className="w-4 h-4" />;
}

const CORE_WEAPON_IDS: WeaponId[] = [
  'sword',
  'hammer',
  'blaster',
  'bow',
  'axe',
  'pickaxe',
  'builder',
];

const SPAWN_MOBS: { kind: MobKind; label: string }[] = (
  Object.values(MOB_DEFS) as (typeof MOB_DEFS)[MobKind][]
).map((m) => ({ kind: m.kind, label: m.name }));

const GLASS_CARD =
  'border border-slate-300/80 bg-white/86 text-slate-900 shadow-lg backdrop-blur-md dark:border-white/12 dark:bg-slate-950/84 dark:text-slate-100';

const GLASS_BTN =
  'border border-slate-300/80 bg-white/86 text-slate-800 shadow-sm backdrop-blur-md transition-colors hover:bg-slate-100/95 dark:border-white/14 dark:bg-slate-950/84 dark:text-slate-200 dark:hover:bg-slate-800/90';

const keepCanvasFocus = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  theme,
  onToggleTheme,
  onOpenGraphics,
  onOpenSqlAdmin,
  onChangeGameMode,
  onCycleCameraView,
  inventoryTab,
  onOpenInventory,
  onHelpOpenChange,
  onInstallModalChange,
  onUseConsumable,
  onActivateRelic,
  onSetBlocking,
  onCycleSeason,
  onCycleWeather,
  onStart,
  onRespawn,
  onSelectWeapon,
  onSpawnMob,
  onToggleMute,
  onToggleCameraMode,
  onToggleDof,
  onToggleShadowUpscale,
  onToggleEcoMode,
  onTeleportCabin,
  onTeleportRiver,
  onInteract,
  onPressSpawnThrone,
  onAttack,
  onJump,
  onTouchMove,
  onSaveGame,
  onNewGame,
  onContinueFreePlay,
  onSetBuildPiece,
  onCycleBuildPiece,
  onRotateBuild,
  onCycleBuildFloor,
  onSetBuildFloor,
  onDemolishBuild,
  onPlaceWorkbench,
  onlineOpen = false,
  onOnlineOpenChange,
  onChangePlayerName,
  onSendChat,
  onTeleportToPlayer,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [arsenalOpen, setArsenalOpen] = useState(false);
  const [mobSpawnerOpen, setMobSpawnerOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [touchMode, setTouchMode] = useState(false);
  const [fpsVisible, setFpsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draftName, setDraftName] = useState(hud.playerName || '');
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (hud.playerName && !onlineOpen) {
      setDraftName(hud.playerName);
    }
  }, [hud.playerName, onlineOpen]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Ignore browsers that block fullscreen
    }
  };

  useEffect(() => {
    onHelpOpenChange?.(showHelp);
  }, [showHelp, onHelpOpenChange]);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0)
    ) {
      setTouchMode(true);
      setDockCollapsed(true);
    }
  }, []);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const staminaPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));
  const xpPct = Math.max(0, Math.min(100, (hud.xp / hud.xpToNext) * 100));

  const nextQuestState = hud.quests.find((q) => !q.completed);
  const nextQuestDef = nextQuestState ? QUESTS.find((q) => q.id === nextQuestState.id) : null;

  const hasInteractivePrompt =
    hud.nearChest ||
    hud.nearShop ||
    hud.nearBed ||
    hud.nearWorkbench ||
    hud.nearVillager ||
    hud.nearAdminPainting ||
    hud.nearToolStand ||
    hud.nearSpawnThrone ||
    Boolean(hud.nearNpcLabel) ||
    Boolean(hud.nearResourceLabel) ||
    Boolean(hud.nearTreeLabel) ||
    Boolean(hud.nearMineTargetLabel) ||
    hud.nearCampfire ||
    hud.insideCabin ||
    hud.insideCave ||
    hud.inWater;

  const cameraLabel =
    hud.cameraViewMode === 'first'
      ? '1-ше [7]'
      : hud.cameraViewMode === 'close'
        ? 'Близько [7]'
        : hud.cameraViewMode === 'far'
          ? 'Огляд [7]'
          : '3-тя [7]';

  const activePotionBuffs = [
    { key: 'rage', label: 'Лють', sec: hud.potionBuffs.rage },
    { key: 'swift', label: 'Шв.', sec: hud.potionBuffs.swift },
    { key: 'ironSkin', label: 'Зах.', sec: hud.potionBuffs.ironSkin },
    { key: 'regen', label: 'Рег.', sec: hud.potionBuffs.regen },
    { key: 'berserk', label: 'Берс.', sec: hud.relicBuffTimers.berserk ?? 0 },
    { key: 'vampire', label: 'Вамп.', sec: hud.relicBuffTimers.vampire ?? 0 },
    { key: 'frostAura', label: 'Мороз', sec: hud.relicBuffTimers.frostAura ?? 0 },
    { key: 'titanShield', label: 'Щ.Тит.', sec: hud.relicBuffTimers.titanShield ?? 0 },
  ].filter((b) => b.sec > 0.1);

  const SeasonIcon =
    hud.season === 'winter' ? (
      <Snowflake className="h-3.5 w-3.5 text-sky-500 dark:text-sky-300" />
    ) : hud.season === 'autumn' ? (
      <Leaf className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
    ) : (
      <Sun className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
    );

  const WeatherIcon =
    hud.weather === 'rain' ? (
      <CloudRain className="h-3.5 w-3.5 text-sky-500 dark:text-sky-300" />
    ) : hud.weather === 'fog' ? (
      <CloudFog className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
    ) : (
      <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />
    );

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* Dying Phase Dramatic Vignette */}
      {hud.phase === 'dying' && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-rose-950/30 via-transparent to-rose-950/55 transition-opacity duration-500"
        />
      )}

      {/* Top Row - Anchored to top edge independently from bottom gamepad */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-start justify-between gap-1 p-1 sm:gap-1.5 sm:p-3">
        {/* Top-Left Toolbar + Hero Card + Active Quest */}
        <div className="pointer-events-auto relative flex min-w-0 flex-col gap-1 sm:gap-1.5">
          <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
            {/* Compact Mobile Menu Toggle (< sm) */}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                setMobileToolsOpen((v) => !v);
              }}
              title="Меню налаштувань (Звук, Графіка, Тема, SQL, Погода, Купці, Квести)"
              className={`flex sm:hidden h-6 items-center gap-1 rounded-lg border px-1.5 text-[9px] font-bold backdrop-blur-md transition-colors ${
                mobileToolsOpen
                  ? 'border-amber-500/70 bg-amber-500/20 text-amber-900 dark:text-amber-100'
                  : GLASS_BTN
              }`}
            >
              <Menu className="h-3 w-3" />
              <span>Меню</span>
            </button>

            {/* Full Desktop Toolbar (>= sm) */}
            <div className={`hidden sm:flex items-center gap-0.5 rounded-xl p-0.5 ${GLASS_CARD}`}>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowHelp((v) => !v);
                }}
                title="Довідка та керування"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  showHelp
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-700 hover:bg-slate-200/80 dark:text-slate-200 dark:hover:bg-white/12'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                title={hud.muted ? 'Увімкнути звук' : 'Вимкнути звук'}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-200/80 dark:text-slate-200 dark:hover:bg-white/12"
              >
                {hud.muted ? (
                  <VolumeX className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleCameraMode();
                }}
                title="Режим камери (L)"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  hud.pointerLocked || hud.autoFollowCam
                    ? 'bg-sky-500/20 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300'
                    : 'text-slate-700 hover:bg-slate-200/80 dark:text-slate-200 dark:hover:bg-white/12'
                }`}
              >
                <Crosshair className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTeleportCabin();
                }}
                title="До хатинки (R)"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-200/80 dark:text-slate-200 dark:hover:bg-white/12"
              >
                <Home className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTeleportRiver();
                }}
                title="До річки (поплавати)"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition-colors hover:bg-slate-200/80 dark:text-sky-300 dark:hover:bg-white/12"
              >
                <Waves className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  void toggleFullscreen();
                }}
                title={isFullscreen ? 'Вийти з повного екрана' : 'На весь екран'}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isFullscreen
                    ? 'bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300'
                    : 'text-slate-700 hover:bg-slate-200/80 dark:text-slate-200 dark:hover:bg-white/12'
                }`}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Theme Toggle (Desktop) */}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleTheme();
              }}
              title={theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
              className={`hidden sm:flex h-8 items-center gap-1 rounded-xl px-2 text-[11px] font-semibold ${GLASS_BTN}`}
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
              )}
              <span className="hidden md:inline">{theme === 'dark' ? 'Темна' : 'Світла'}</span>
            </button>

            {/* Graphics Settings Button (Desktop) */}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenGraphics();
              }}
              title="Налаштування графіки та продуктивності"
              className={`hidden sm:flex h-8 items-center gap-1 rounded-xl px-2 text-[11px] font-semibold ${GLASS_BTN}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
              <span>Графіка</span>
            </button>

            {/* phpMyAdmin SQL Admin Button (Desktop) */}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenSqlAdmin();
              }}
              title="phpMyAdmin · SQLite База Даних"
              className="hidden sm:flex h-8 items-center gap-1 rounded-xl border border-amber-500/45 bg-amber-500/15 px-2 text-[11px] font-bold text-amber-800 shadow-sm backdrop-blur-md transition-colors hover:bg-amber-500/25 dark:border-amber-400/40 dark:bg-amber-500/18 dark:text-amber-200 dark:hover:bg-amber-500/28"
            >
              <Database className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
              <span>SQL</span>
            </button>

            {/* Season & Weather Quick Toggles (Desktop) */}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleSeason();
              }}
              title="Змінити пору року"
              className={`hidden sm:flex h-8 items-center gap-1 rounded-xl px-2 text-[11px] font-semibold ${GLASS_BTN}`}
            >
              {SeasonIcon}
              <span>{SEASON_LABELS[hud.season]}</span>
              <span className="font-mono-nums text-[10px] text-slate-500 dark:text-slate-400">
                {Math.max(1, Math.ceil(hud.seasonRemainingSec / 60))}хв
              </span>
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleWeather();
              }}
              title="Змінити погоду"
              className={`hidden sm:flex h-8 items-center gap-1 rounded-xl px-2 text-[11px] font-semibold ${GLASS_BTN}`}
            >
              {WeatherIcon}
              <span>{WEATHER_LABELS[hud.weather][hud.season]}</span>
            </button>

            {/* Camera View Mode Button (Key 7) - Hidden on <sm because MobileGamepad has Camera button directly */}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleCameraView();
              }}
              title="Змінити вид камери: 3-тя особа / 1-ше лице / Близько / Огляд (клавіша 7)"
              className={`hidden sm:flex h-8 items-center gap-1 rounded-xl px-2 text-[11px] font-semibold ${GLASS_BTN}`}
            >
              <Camera className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
              <span className="font-mono-nums">{cameraLabel}</span>
            </button>

            {/* Game Mode 3-Way Selector - Ultra-compact on mobile */}
            <div className={`flex h-6 sm:h-8 items-center rounded-lg sm:rounded-xl p-0.5 ${GLASS_CARD}`}>
              {(
                [
                  { id: 'survival', label: 'В', smLabel: 'Вижив.', title: 'Виживання: усе крафтиться самотужки, без стенда' },
                  { id: 'peaceful', label: 'М', smLabel: 'Мирний', title: 'Мирний: моби не атакують, стенд біля спавну' },
                  { id: 'creative', label: 'Т', smLabel: 'Творчий', title: 'Творчий: усе відкрито, безкоштовний крафт і політ' },
                ] as { id: GameMode; label: string; smLabel: string; title: string }[]
              ).map((m) => {
                const active = hud.gameMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={keepCanvasFocus}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onChangeGameMode(m.id);
                    }}
                    title={m.title}
                    className={`rounded-md sm:rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold transition-colors ${
                      active
                        ? m.id === 'survival'
                          ? 'bg-amber-500 text-slate-950'
                          : m.id === 'peaceful'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-sky-500 text-slate-950'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    <span className="sm:hidden">{m.label}</span>
                    <span className="hidden sm:inline">{m.smLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Live FPS Sensor */}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                setFpsVisible((v) => !v);
              }}
              title="Лічильник FPS"
              className={`hidden sm:flex h-8 items-center gap-1 rounded-xl border px-2 text-[11px] font-mono-nums font-bold backdrop-blur-md transition-colors ${
                hud.fps >= 50
                  ? 'border-emerald-500/45 bg-white/86 text-emerald-700 dark:border-emerald-400/45 dark:bg-slate-950/88 dark:text-emerald-300'
                  : hud.fps >= 30
                    ? 'border-amber-500/45 bg-white/86 text-amber-700 dark:border-amber-400/45 dark:bg-slate-950/88 dark:text-amber-300'
                    : 'border-rose-500/50 bg-white/86 text-rose-700 dark:border-rose-400/50 dark:bg-slate-950/88 dark:text-rose-300'
              }`}
            >
              <Activity className="h-3 w-3" />
              {fpsVisible ? (
                <span>
                  {hud.fps} FPS{hud.pingMs !== null ? ` · ${hud.pingMs}мс` : ''}
                </span>
              ) : (
                <span>FPS</span>
              )}
            </button>
          </div>

          {/* Mobile Expandable Tools Drawer (< sm) */}
          {mobileToolsOpen && (
            <div className={`flex sm:hidden max-w-[82vw] flex-wrap items-center gap-1 rounded-xl p-1.5 ${GLASS_CARD}`}>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={() => {
                  setMobileToolsOpen(false);
                  onOpenInventory('shop', hud.activeMerchantKind);
                }}
                className="flex h-6 items-center gap-1 rounded-lg bg-emerald-500/18 px-2 text-[9px] font-bold text-emerald-800 dark:text-emerald-200"
              >
                <Store className="h-3 w-3" />
                <span>Купці</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={() => {
                  setMobileToolsOpen(false);
                  onOpenInventory('quests');
                }}
                className="flex h-6 items-center gap-1 rounded-lg bg-purple-500/18 px-2 text-[9px] font-bold text-purple-800 dark:text-purple-200"
              >
                <ScrollText className="h-3 w-3" />
                <span>Квести</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={() => {
                  setTouchMode((v) => !v);
                }}
                className={`flex h-6 items-center gap-1 rounded-lg px-2 text-[9px] font-semibold ${
                  touchMode
                    ? 'bg-emerald-500/25 text-emerald-800 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Gamepad2 className="h-3 w-3" />
                <span>{touchMode ? 'Геймпад ✓' : 'Геймпад'}</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={() => {
                  setMobileToolsOpen(false);
                  setShowHelp((v) => !v);
                }}
                className="flex h-6 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[9px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                <HelpCircle className="h-3 w-3" />
                <span>Довідка</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={() => {
                  setMobileToolsOpen(false);
                  onOpenGraphics();
                }}
                className="flex h-6 items-center gap-1 rounded-lg bg-sky-500/15 px-2 text-[9px] font-semibold text-sky-800 dark:text-sky-200"
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>Графіка</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={() => {
                  setMobileToolsOpen(false);
                  onOpenSqlAdmin();
                }}
                className="flex h-6 items-center gap-1 rounded-lg bg-amber-500/18 px-2 text-[9px] font-bold text-amber-800 dark:text-amber-200"
              >
                <Database className="h-3 w-3" />
                <span>SQL</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={onToggleTheme}
                className="flex h-6 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[9px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                {theme === 'dark' ? <Sun className="h-3 w-3 text-amber-400" /> : <Moon className="h-3 w-3" />}
                <span>Тема</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={onCycleSeason}
                className="flex h-6 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[9px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                {SeasonIcon}
                <span>{SEASON_LABELS[hud.season]}</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={onCycleWeather}
                className="flex h-6 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[9px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                {WeatherIcon}
                <span>{WEATHER_LABELS[hud.weather][hud.season]}</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={() => {
                  setMobileToolsOpen(false);
                  onTeleportCabin();
                }}
                className="flex h-6 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[9px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                <Home className="h-3 w-3" />
                <span>Хата</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={onToggleMute}
                className="flex h-6 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[9px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                {hud.muted ? <VolumeX className="h-3 w-3 text-rose-500" /> : <Volume2 className="h-3 w-3" />}
                <span>Звук</span>
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={() => {
                  setMobileToolsOpen(false);
                  void toggleFullscreen();
                }}
                className="flex h-6 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[9px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                <span>Екран</span>
              </button>
            </div>
          )}

          {hud.phase === 'playing' && (
            <div className="flex flex-col gap-0.5 sm:gap-1.5">
              <div className={`w-26 sm:w-48 rounded-lg sm:rounded-xl p-1 sm:p-2.5 ${GLASS_CARD}`}>
                <div className="mb-0.5 sm:mb-1.5 flex items-center justify-between text-[8px] sm:text-[11px] leading-none">
                  <span className="flex items-center gap-0.5 sm:gap-1 font-display font-bold text-slate-900 dark:text-white">
                    <span className="sm:hidden">Р.{hud.level}</span>
                    <span className="hidden sm:inline">Рівень {hud.level}</span>
                    <span className="rounded bg-cyan-500/20 px-1 py-0.5 font-mono-nums text-[7px] sm:text-[9px] font-bold text-cyan-800 dark:text-cyan-200">
                      {CLIENT_APP_LABEL}
                    </span>
                  </span>
                  <span className="font-mono-nums font-bold text-amber-600 dark:text-amber-300">
                    {hud.coins}м
                  </span>
                </div>

                <div className="mb-0.5 sm:mb-1 flex items-center justify-between text-[7px] sm:text-[10px] leading-none text-slate-600 dark:text-slate-300">
                  <span className="sm:hidden">HP</span>
                  <span className="hidden sm:inline">Здоров’я</span>
                  <span className="font-mono-nums font-semibold text-emerald-600 dark:text-emerald-300">
                    {hud.hp}/{hud.maxHp}
                  </span>
                </div>
                <div className="h-1 sm:h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-[width] duration-150"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>

                <div className="mt-1 sm:mt-1.5 flex items-center gap-1 sm:gap-1.5">
                  <div className="h-0.5 sm:h-1 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" title="Витривалість">
                    <div
                      className="h-full bg-sky-500 dark:bg-sky-400 transition-[width] duration-100"
                      style={{ width: `${staminaPct}%` }}
                    />
                  </div>
                  <div className="h-0.5 sm:h-1 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" title="Досвід">
                    <div
                      className="h-full bg-amber-500 dark:bg-amber-400 transition-[width] duration-150"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-1 sm:mt-1.5 flex items-center justify-between border-t border-slate-200/90 pt-0.5 sm:pt-1.5 text-[7px] sm:text-[10px] leading-none text-slate-600 dark:border-white/10 dark:text-slate-300">
                  <span className="font-mono-nums hidden sm:inline">
                    Д:{hud.resources.wood} К:{hud.resources.stone} З:{hud.resources.iron}
                  </span>
                  <span className="font-mono-nums sm:hidden">
                    Д:{hud.resources.wood} К:{hud.resources.stone}
                  </span>
                  <span className="font-mono-nums font-semibold text-purple-600 dark:text-purple-300">
                    Е:{hud.resources.essence}
                  </span>
                </div>
                {activePotionBuffs.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:gap-1 border-t border-slate-200/90 pt-0.5 dark:border-white/10">
                    {activePotionBuffs.map((b) => (
                      <span
                        key={b.key}
                        className="font-mono-nums rounded bg-purple-500/20 px-1 py-0.5 text-[7px] sm:text-[9px] font-bold text-purple-700 dark:text-purple-200"
                      >
                        {b.label} {Math.ceil(b.sec)}с
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {hud.activeGoal ? (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenInventory('quests');
                  }}
                  title="Натисніть, щоб відкрити цілі кампанії (J)"
                  className="flex w-26 sm:w-48 flex-col gap-0.5 rounded-lg sm:rounded-xl border border-purple-400/45 bg-white/88 px-1.5 py-0.5 sm:px-2.5 sm:py-1.5 text-left text-[8px] sm:text-[10px] shadow-md backdrop-blur-md transition-colors hover:bg-slate-100 dark:bg-slate-950/86 dark:hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-1 font-semibold text-purple-700 dark:text-purple-200">
                    <span className="flex items-center gap-1 truncate">
                      <Compass className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-amber-500 dark:text-amber-300" />
                      <span className="truncate">
                        {hud.activeGoal.stepIndex}/{hud.activeGoal.totalSteps} · {hud.activeGoal.title}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono-nums text-[7px] sm:text-[9px] text-slate-600 dark:text-slate-300">
                    <span className="truncate text-amber-700 dark:text-amber-300">
                      {hud.activeGoal.distanceMeters !== null
                        ? `${hud.activeGoal.distanceMeters}м · ${hud.activeGoal.compassLabel}`
                        : 'Поруч'}
                    </span>
                    {nextQuestDef && nextQuestState && (
                      <span className="font-bold text-purple-700 dark:text-purple-200">
                        {nextQuestState.progress}/{nextQuestDef.targetCount}
                      </span>
                    )}
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenInventory('quests');
                  }}
                  className="hidden sm:flex w-48 items-center justify-between gap-1 rounded-xl border border-emerald-500/45 bg-white/88 px-2.5 py-1.5 text-left text-[10px] text-emerald-700 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-emerald-400/45 dark:bg-slate-950/86 dark:text-emerald-200 dark:hover:bg-slate-900"
                >
                  <span className="flex items-center gap-1 font-semibold">
                    <Trophy className="h-3 w-3 shrink-0 text-amber-500 dark:text-amber-300" />
                    <span>Усі цілі виконано!</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Top-Center Biome / Zone & Wave Status */}
        {hud.phase === 'playing' && (
          <div
            className={`hidden lg:flex items-center gap-2.5 rounded-xl px-3.5 py-1.5 text-[11px] font-medium whitespace-nowrap ${GLASS_CARD}`}
          >
            <span className="font-display text-xs font-bold text-slate-900 dark:text-white">
              {hud.zoneName}
            </span>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">·</span>
            <span className="font-mono-nums font-semibold text-amber-600 dark:text-amber-300">
              Хвиля {hud.wave}
            </span>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">·</span>
            <span className="font-mono-nums text-slate-600 dark:text-slate-300">
              Ворогів: {hud.activeMobs}
            </span>
          </div>
        )}

        {/* Top-Right Modals + Minimap + Feed */}
        <div className="pointer-events-auto flex flex-col items-end gap-1 sm:gap-1.5">
          <div className="flex flex-nowrap sm:flex-wrap items-center justify-end gap-0.5 sm:gap-1">
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOnlineOpenChange?.(!onlineOpen);
              }}
              title="Онлайн-сервер, гравці (ПК і телефони) та чат"
              className={`flex h-6 sm:h-8 items-center gap-1 rounded-lg sm:rounded-xl border px-1.5 sm:px-2 text-[9px] sm:text-[11px] font-bold whitespace-nowrap shrink-0 backdrop-blur-md transition-colors ${
                onlineOpen
                  ? 'border-cyan-500/70 bg-cyan-500/25 text-cyan-900 dark:border-cyan-400/70 dark:text-cyan-100'
                  : hud.onlineConnected
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25 dark:border-emerald-400/45 dark:text-emerald-200'
                    : GLASS_BTN
              }`}
            >
              <span
                className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${
                  hud.onlineConnected ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Онлайн</span>
              <span className="font-mono-nums">
                {hud.onlineConnected ? Math.max(1, hud.onlinePlayers.length) : '…'}
              </span>
            </button>
            <div className="hidden sm:block">
              <PWAInstallButton onModalOpenChange={onInstallModalChange} />
            </div>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory('inventory');
              }}
              title="Інвентар (I)"
              className={`flex h-6 sm:h-8 items-center gap-1 rounded-lg sm:rounded-xl border px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap shrink-0 backdrop-blur-md transition-colors ${
                inventoryTab === 'inventory'
                  ? 'border-sky-500/60 bg-sky-500/20 text-sky-800 dark:border-sky-400/60 dark:bg-sky-500/25 dark:text-sky-200'
                  : GLASS_BTN
              }`}
            >
              <Backpack className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-600 dark:text-sky-300" />
              <span className="hidden sm:inline">Інвентар</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory('craft');
              }}
              title="Крафт (K)"
              className={`flex h-6 sm:h-8 items-center gap-1 rounded-lg sm:rounded-xl border px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap shrink-0 backdrop-blur-md transition-colors ${
                inventoryTab === 'craft'
                  ? 'border-amber-500/60 bg-amber-500/20 text-amber-800 dark:border-amber-400/60 dark:bg-amber-500/25 dark:text-amber-200'
                  : GLASS_BTN
              }`}
            >
              <Hammer className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600 dark:text-amber-300" />
              <span className="hidden sm:inline">Крафт</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory('shop', hud.activeMerchantKind);
              }}
              title="Купці та Крамниця (M)"
              className={`hidden sm:flex h-8 items-center gap-1 rounded-xl border px-2 text-[11px] font-semibold whitespace-nowrap shrink-0 backdrop-blur-md transition-colors ${
                inventoryTab === 'shop'
                  ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-800 dark:border-emerald-400/60 dark:bg-emerald-500/25 dark:text-emerald-200'
                  : GLASS_BTN
              }`}
            >
              <Store className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
              <span>Купці</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory('quests');
              }}
              title="Квести долини (J)"
              className={`hidden sm:flex h-8 items-center gap-1 rounded-xl border px-2 text-[11px] font-semibold whitespace-nowrap shrink-0 backdrop-blur-md transition-colors ${
                inventoryTab === 'quests'
                  ? 'border-purple-500/60 bg-purple-500/20 text-purple-800 dark:border-purple-400/60 dark:bg-purple-500/25 dark:text-purple-200'
                  : GLASS_BTN
              }`}
            >
              <ScrollText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-300" />
              <span>Квести</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleEcoMode();
              }}
              title="Оптимізація GPU"
              className={`hidden md:flex h-8 items-center gap-1 rounded-xl border px-2 text-[11px] font-semibold whitespace-nowrap shrink-0 backdrop-blur-md transition-colors ${
                hud.ecoMode
                  ? 'border-emerald-500/50 bg-emerald-500/18 text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-500/20 dark:text-emerald-200'
                  : GLASS_BTN
              }`}
            >
              <Gauge className="h-3.5 w-3.5" />
              <span>{hud.ecoMode ? 'Еко' : 'Макс'}</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                setTouchMode((v) => !v);
              }}
              title="Екранний геймпад"
              className={`hidden sm:flex h-8 items-center gap-1 rounded-xl border px-2 text-[11px] font-semibold whitespace-nowrap shrink-0 backdrop-blur-md transition-colors ${
                touchMode
                  ? 'border-emerald-500/60 bg-emerald-500/18 text-emerald-800 dark:border-emerald-400/60 dark:bg-emerald-500/20 dark:text-emerald-200'
                  : GLASS_BTN
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span>Геймпад</span>
            </button>
          </div>

          {hud.phase === 'playing' && (
            <div className="flex items-start gap-1.5">
              {hud.killFeed.length > 0 && (
                <div className="hidden md:flex flex-col items-end gap-1 text-right">
                  {hud.killFeed.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg px-2.5 py-1 text-[11px] ${GLASS_CARD}`}
                    >
                      {item.text}
                    </div>
                  ))}
                </div>
              )}
              <Minimap
                playerX={hud.playerX}
                playerZ={hud.playerZ}
                playerYaw={hud.playerYaw}
                season={hud.season}
                zoneName={hud.zoneName}
                biomeId={hud.biomeId}
                entities={hud.minimapEntities}
                trailCells={hud.trailCells}
                onClickMap={() => onOpenInventory('quests')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls Help Popover */}
      {showHelp && (
        <div className="pointer-events-auto relative z-20 mx-auto max-w-md rounded-2xl border border-slate-300/80 bg-white/95 p-5 text-sm text-slate-800 shadow-2xl backdrop-blur-lg dark:border-white/15 dark:bg-slate-950/94 dark:text-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Керування, Графіка та SQL
            </h2>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={() => setShowHelp(false)}
              className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Закрити
            </button>
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Ходьба / плавання</span>
            <span className="font-mono-nums font-semibold text-slate-900 dark:text-white">W A S D / Стрілки</span>
            <span className="text-slate-500 dark:text-slate-400">Біг</span>
            <span className="font-mono-nums font-semibold text-slate-900 dark:text-white">Shift</span>
            <span className="text-slate-500 dark:text-slate-400">Стрибок / вгору у воді</span>
            <span className="font-mono-nums font-semibold text-slate-900 dark:text-white">Пробіл (Space)</span>
            <span className="text-slate-500 dark:text-slate-400">Атака / Рубка / Будувати</span>
            <span className="font-mono-nums font-semibold text-slate-900 dark:text-white">ЛКМ або F</span>
            <span className="text-slate-500 dark:text-slate-400">Щит (Блок / Парирування)</span>
            <span className="font-mono-nums font-semibold text-sky-600 dark:text-sky-300">ПКМ або B</span>
            <span className="text-slate-500 dark:text-slate-400">Навички реліквій</span>
            <span className="font-mono-nums font-semibold text-amber-600 dark:text-amber-300">Z, X, C, Y, O, N, , . /</span>
            <span className="text-slate-500 dark:text-slate-400">Зброя, Сокира, Кирка, Буд. / Зілля</span>
            <span className="font-mono-nums font-semibold text-slate-900 dark:text-white">1–6, P / 8,9,0,-,=</span>
            <span className="text-slate-500 dark:text-slate-400">Камера (1-ше / 3-тя особа / Огляд)</span>
            <span className="font-mono-nums font-semibold text-sky-600 dark:text-sky-300">Клавіша 7</span>
            <span className="text-slate-500 dark:text-slate-400">Будівництво: Блок / Оберт / Поверх / Знос</span>
            <span className="font-mono-nums font-semibold text-emerald-600 dark:text-emerald-300">Tab(G) / T / H([ ]) / ⌫</span>
            <span className="text-slate-500 dark:text-slate-400">Взаємодія / Верстак / Смаження</span>
            <span className="font-mono-nums font-semibold text-slate-900 dark:text-white">E</span>
            <span className="text-slate-500 dark:text-slate-400">Інвентар / Крафт / Купці / Квести</span>
            <span className="font-mono-nums font-semibold text-slate-900 dark:text-white">I / K / M / J</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-200 pt-3 dark:border-white/10">
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={onToggleDof}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                hud.dofEnabled
                  ? 'border-sky-500/50 bg-sky-500/18 text-sky-800 dark:border-sky-400/50 dark:bg-sky-500/20 dark:text-sky-200'
                  : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{hud.dofEnabled ? 'Розмиття: УВІМК' : 'Розмиття: ВИМК'}</span>
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={onToggleShadowUpscale}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                hud.shadowUpscale
                  ? 'border-amber-500/50 bg-amber-500/18 text-amber-800 dark:border-amber-400/50 dark:bg-amber-500/20 dark:text-amber-200'
                  : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {hud.shadowUpscale ? 'Тіні: 4K' : 'Тіні: 2K'}
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={() => {
                setShowHelp(false);
                onOpenGraphics();
              }}
              className="flex items-center gap-1 rounded-lg border border-sky-400/45 bg-sky-500/15 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-500/25 dark:text-sky-200"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Усі налаштування...</span>
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={() => {
                setShowHelp(false);
                onOpenSqlAdmin();
              }}
              className="flex items-center gap-1 rounded-lg border border-amber-400/45 bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-500/25 dark:text-amber-200"
            >
              <Database className="h-3.5 w-3.5" />
              <span>phpMyAdmin SQL</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Стежки (&gt;10 кроків):{' '}
              <strong className="font-mono-nums text-amber-600 dark:text-amber-300">{hud.trampledCount}</strong>
              {hud.lastSavedAt && (
                <span className="ml-2 text-emerald-700 dark:text-emerald-300/90">
                  · Збережено{' '}
                  {new Date(hud.lastSavedAt).toLocaleTimeString('uk-UA', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {onSaveGame && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={() => onSaveGame()}
                  className="flex items-center gap-1 rounded-lg border border-emerald-500/45 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/25 dark:border-emerald-400/45 dark:text-emerald-200"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Зберегти</span>
                </button>
              )}
              {onNewGame && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={() => {
                    setShowHelp(false);
                    onNewGame();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-500/25 dark:border-rose-400/40 dark:text-rose-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Нова гра</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Online Server, Players & Chat Modal */}
      {onlineOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-xs">
          <div className="flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-300/80 bg-white/96 text-slate-900 shadow-2xl dark:border-white/15 dark:bg-slate-950/96 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    hud.onlineConnected ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                />
                <div>
                  <h2 className="flex items-center gap-1.5 font-display text-sm sm:text-base font-bold">
                    <span>Спільний Онлайн-Сервер</span>
                    <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 font-mono-nums text-[10px] font-bold text-cyan-800 dark:text-cyan-200">
                      {CLIENT_APP_LABEL}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {hud.onlineConnected
                      ? `Підключено · Усі ПК та телефони грають разом (${Math.max(1, hud.onlinePlayers.length)} у світі)${hud.pingMs !== null ? ` · Пінг ${hud.pingMs} мс` : ''}`
                      : 'Підключення до сервера...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Очистити кеш і завантажити найновішу версію"
                  onClick={() => {
                    void (async () => {
                      if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        await Promise.all(regs.map((r) => r.unregister()));
                      }
                      if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map((k) => caches.delete(k)));
                      }
                      const nextUrl = new URL(window.location.href);
                      nextUrl.searchParams.set('v', CLIENT_APP_LABEL);
                      nextUrl.searchParams.set('_', String(Date.now()));
                      window.location.replace(nextUrl.toString());
                    })();
                  }}
                  className="flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Оновити</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOnlineOpenChange?.(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {/* Nickname Editor */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draftName.trim()) {
                    onChangePlayerName?.(draftName.trim());
                  }
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-2.5 dark:border-white/10 dark:bg-slate-900/70"
              >
                <input
                  type="text"
                  maxLength={20}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Ваш нікнейм у грі"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Змінити ім’я
                </button>
              </form>

              {/* Invite Link for Phone + PC Play */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-emerald-800 dark:text-emerald-200">
                    Запросити друга (телефон + ПК)
                  </div>
                  <div className="truncate text-[10px] text-emerald-700/85 dark:text-emerald-300/80">
                    {typeof window !== 'undefined' ? `${window.location.origin}/?guest=1` : '/?guest=1'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window === 'undefined') return;
                    const inviteUrl = `${window.location.origin}/?guest=1`;
                    void navigator.clipboard?.writeText(inviteUrl).catch(() => {});
                  }}
                  className="shrink-0 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Копіювати
                </button>
              </div>

              {/* Players List */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>Гравці онлайн ({Math.max(1, hud.onlinePlayers.length)})</span>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                    Спільні будівлі, погода і чат
                  </span>
                </div>
                <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-0.5">
                  {hud.onlinePlayers.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
                      {hud.playerName || 'Ви'} · очікування з’єднання...
                    </div>
                  ) : (
                    hud.onlinePlayers.map((p) => {
                      const isSelf = p.id === hud.onlinePlayerId;
                      const distM = Math.round(Math.hypot(p.x - hud.playerX, p.z - hud.playerZ));
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                            isSelf
                              ? 'border-emerald-500/45 bg-emerald-500/10 dark:border-emerald-400/40'
                              : 'border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-slate-900/65'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              title={p.device === 'mobile' ? 'Телефон' : 'Комп’ютер'}
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                p.device === 'mobile'
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                              }`}
                            >
                              {p.device === 'mobile' ? (
                                <Smartphone className="h-3.5 w-3.5" />
                              ) : (
                                <Monitor className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="truncate">{p.name}</span>
                                {isSelf && (
                                  <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[9px] text-emerald-800 dark:text-emerald-200">
                                    Ви
                                  </span>
                                )}
                                <span className="font-mono-nums text-[10px] font-semibold text-amber-600 dark:text-amber-300">
                                  Рів.{p.level}
                                </span>
                              </div>
                              <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                {p.zoneName} · {isSelf ? `${p.hp}/${p.maxHp} HP` : `${distM}м від вас`}
                              </div>
                            </div>
                          </div>
                          {!isSelf && onTeleportToPlayer && (
                            <button
                              type="button"
                              onClick={() => {
                                onTeleportToPlayer(p.id);
                                onOnlineOpenChange?.(false);
                              }}
                              className="flex shrink-0 items-center gap-1 rounded-lg border border-cyan-500/50 bg-cyan-500/18 px-2.5 py-1.5 text-[11px] font-bold text-cyan-800 hover:bg-cyan-500/28 dark:border-cyan-400/50 dark:text-cyan-200"
                            >
                              <Navigation className="h-3 w-3" />
                              <span>До гравця</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat Log & Quick Send */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-2.5 dark:border-white/10 dark:bg-slate-900/70">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Чат сервера
                </div>
                <div className="flex h-32 flex-col gap-1 overflow-y-auto rounded-lg bg-white/80 p-2 text-xs dark:bg-slate-950/75">
                  {hud.onlineChat.length === 0 ? (
                    <div className="my-auto text-center text-[11px] text-slate-400">
                      Напишіть перше повідомлення друзям з ПК чи телефону!
                    </div>
                  ) : (
                    hud.onlineChat.map((m) => (
                      <div key={m.id} className="leading-snug">
                        <span className="mr-1 text-[10px]">
                          {m.device === 'mobile' ? '📱' : '🖥️'}
                        </span>
                        <span className="font-bold text-cyan-700 dark:text-cyan-300">
                          {m.senderName}:
                        </span>{' '}
                        <span className="text-slate-800 dark:text-slate-200">{m.text}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {['Привіт!', 'Йду до тебе!', 'Нумо на боса!', 'Будуймо дім!'].map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => onSendChat?.(phrase)}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (chatInput.trim()) {
                      onSendChat?.(chatInput.trim());
                      setChatInput('');
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    maxLength={160}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Повідомлення у спільний чат..."
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    title="Надіслати"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Center Reticle when pointer locked */}
      {hud.phase === 'playing' && hud.pointerLocked && !inventoryTab && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full border border-slate-900 bg-white/90" />
        </div>
      )}

      {/* Title Screen Overlay */}
      {hud.phase === 'title' && (
        <div className="pointer-events-none fixed inset-0 z-15 flex items-center justify-center p-3">
          <div className="pointer-events-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-300/80 bg-white/94 p-5 sm:p-7 text-center text-slate-900 shadow-2xl backdrop-blur-lg dark:border-white/15 dark:bg-slate-950/92 dark:text-slate-100">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">
            3D Пригода · 9 Біомів · Великий Світ · SQLite БД
          </p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Долина Блоків
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Досліджуйте 9 унікальних біомів включно з Пустелею та рідкісними високими горами, будуйте будинки та долайте босів.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-left">
            {(
              [
                {
                  id: 'survival',
                  title: 'Виживання',
                  desc: 'Крафт вручну, без стенда біля спавну',
                },
                {
                  id: 'peaceful',
                  title: 'Мирний',
                  desc: 'Моби мирні, стенд зброї на спавні',
                },
                {
                  id: 'creative',
                  title: 'Творчий',
                  desc: 'Безкоштовне будівництво та політ',
                },
              ] as { id: GameMode; title: string; desc: string }[]
            ).map((modeItem) => {
              const selected = hud.gameMode === modeItem.id;
              return (
                <button
                  key={modeItem.id}
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onChangeGameMode(modeItem.id);
                  }}
                  className={`rounded-xl border p-2.5 transition-colors ${
                    selected
                      ? 'border-emerald-500 bg-emerald-500/18 text-slate-950 dark:text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/75 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold">{modeItem.title}</div>
                  <div className="mt-0.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                    {modeItem.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onMouseDown={keepCanvasFocus}
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="mt-5 w-full rounded-xl bg-emerald-500 px-6 py-3.5 font-display text-base font-bold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Грати
          </button>
          </div>
        </div>
      )}

      {/* Dying Phase Caption */}
      {hud.phase === 'dying' && (
        <div className="pointer-events-none fixed inset-0 z-15 flex items-center justify-center p-3">
          <div className="rounded-2xl border border-rose-500/40 bg-slate-950/70 px-6 py-3 text-center shadow-2xl backdrop-blur-md">
            <p className="font-display text-lg font-extrabold tracking-wide text-rose-300">
              Герой падає...
            </p>
          </div>
        </div>
      )}

      {/* Respawn Overlay */}
      {hud.phase === 'dead' && (
        <div className="pointer-events-none fixed inset-0 z-15 flex items-center justify-center p-3">
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-rose-500/45 bg-white/94 p-6 text-center text-slate-900 shadow-2xl backdrop-blur-lg dark:bg-slate-950/92 dark:text-slate-100">
            <h2 className="font-display text-2xl font-bold text-rose-600 dark:text-rose-400">
              Героя переможено
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Хвиля {hud.wave} · Переможено мобів: {hud.kills} · Монет: {hud.coins}
            </p>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onRespawn();
              }}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-display text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Відродитися</span>
            </button>
          </div>
        </div>
      )}

      {/* Campaign Victory Overlay */}
      {hud.phase === 'victory' && (
        <div className="pointer-events-none fixed inset-0 z-15 flex items-center justify-center p-3">
          <div className="pointer-events-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-500/50 bg-white/95 p-5 sm:p-6 text-center text-slate-900 shadow-2xl backdrop-blur-lg dark:border-amber-400/50 dark:bg-slate-950/95 dark:text-slate-100">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/18 text-amber-600 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-300">
            <Trophy className="h-8 w-8" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
            Кампанію пройдено!
          </p>
          <h2 className="font-display mt-1 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            Долина Блоків Врятована!
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Ви виконали всі 7 завдань долини, відкрили Селище, дослідили гірські печери та здолали Володаря Безодні Малакора.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-left text-xs dark:border-white/10 dark:bg-slate-900/80">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Рівень героя</span>
              <div className="font-mono-nums font-bold text-slate-900 dark:text-white">{hud.level}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Час проходження</span>
              <div className="font-mono-nums font-bold text-sky-600 dark:text-sky-300">
                {Math.floor(hud.playTimeSec / 60)}хв {String(hud.playTimeSec % 60).padStart(2, '0')}с
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Ворогів подолано</span>
              <div className="font-mono-nums font-bold text-rose-600 dark:text-rose-300">
                {hud.kills} (Хвиля {hud.wave})
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Монети / Печери</span>
              <div className="font-mono-nums font-bold text-amber-600 dark:text-amber-300">
                {hud.coins} м · {hud.visitedCavesCount}/{hud.totalCavesCount}
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400">Зібране спорядження</span>
              <span className="font-mono-nums font-bold text-emerald-600 dark:text-emerald-300">
                {hud.upgrades.length} шт.
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/35 bg-amber-50/75 px-4 py-3 text-center dark:border-amber-400/30 dark:bg-amber-950/30">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Творці гри
            </p>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 font-display text-sm font-extrabold text-slate-900 dark:text-white">
              <span>simonchik</span>
              <span className="text-amber-500">•</span>
              <span>wirti</span>
              <span className="text-amber-500">•</span>
              <span>pimka</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {onContinueFreePlay && (
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onContinueFreePlay();
                }}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-display text-xs sm:text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400"
              >
                Продовжити вільну гру
              </button>
            )}
            {onNewGame && (
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onNewGame();
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-display text-xs sm:text-sm font-bold text-slate-800 transition-colors hover:bg-slate-200 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Нова пригода</span>
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Bottom Area - Strictly anchored at viewport bottom edge so gamepad NEVER slides off-screen */}
      {hud.phase === 'playing' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex flex-col items-center gap-0.5 sm:gap-1 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:px-3 sm:pb-3">
          {hasInteractivePrompt && (
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
              {hud.nearChest && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-amber-500/50 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-amber-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-amber-400/50 dark:bg-slate-950/90 dark:text-amber-200 dark:hover:bg-slate-800"
                >
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Скриня (E)</span>
                </button>
              )}
              {hud.nearShop && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenInventory('shop', hud.activeMerchantKind);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-amber-500/60 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-amber-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-amber-400/60 dark:bg-slate-950/90 dark:text-amber-200 dark:hover:bg-slate-800"
                >
                  <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{hud.nearNpcLabel ?? 'Крамниця'} (E)</span>
                </button>
              )}
              {hud.nearBed && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-500/50 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-rose-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-rose-400/50 dark:bg-slate-950/90 dark:text-rose-200 dark:hover:bg-slate-800"
                >
                  <BedDouble className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-500 dark:text-rose-400" />
                  <span>Ліжко +HP (E)</span>
                </button>
              )}
              {hud.nearWorkbench && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenInventory('craft');
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-amber-500/50 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-amber-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-amber-400/50 dark:bg-slate-950/90 dark:text-amber-200 dark:hover:bg-slate-800"
                >
                  <Hammer className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Верстак (E)</span>
                </button>
              )}
              {hud.nearTreeLabel && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onAttack();
                  }}
                  className="flex flex-col gap-0.5 rounded-lg sm:rounded-xl border border-orange-500/55 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-orange-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-orange-400/55 dark:bg-slate-950/90 dark:text-orange-200 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-1">
                    <Trees className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-500 dark:text-orange-400" />
                    <span>{hud.nearTreeLabel}</span>
                  </span>
                  {hud.nearTreeHpRatio !== null && (
                    <span className="h-0.5 sm:h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <span
                        className="block h-full bg-orange-500 dark:bg-orange-400 transition-[width] duration-100"
                        style={{ width: `${Math.round(hud.nearTreeHpRatio * 100)}%` }}
                      />
                    </span>
                  )}
                </button>
              )}
              {hud.nearMineTargetLabel && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onAttack();
                  }}
                  className="flex flex-col gap-0.5 rounded-lg sm:rounded-xl border border-slate-400/60 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-slate-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-slate-300/55 dark:bg-slate-950/90 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-1">
                    <Pickaxe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-600 dark:text-slate-300" />
                    <span>{hud.nearMineTargetLabel}</span>
                  </span>
                  {hud.nearMineHpRatio !== null && (
                    <span className="h-0.5 sm:h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <span
                        className="block h-full bg-slate-500 dark:bg-slate-300 transition-[width] duration-100"
                        style={{ width: `${Math.round(hud.nearMineHpRatio * 100)}%` }}
                      />
                    </span>
                  )}
                </button>
              )}
              {hud.workbenchStock > 0 && hud.activeWeapon !== 'builder' && onPlaceWorkbench && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onPlaceWorkbench();
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-emerald-500/55 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-emerald-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-emerald-400/55 dark:bg-slate-950/90 dark:text-emerald-200 dark:hover:bg-slate-800"
                >
                  <Wrench className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Верстак ({hud.workbenchStock})</span>
                </button>
              )}
              {hud.nearResourceLabel && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-emerald-500/50 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-emerald-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-emerald-400/50 dark:bg-slate-950/90 dark:text-emerald-200 dark:hover:bg-slate-800"
                >
                  <Pickaxe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{hud.nearResourceLabel}</span>
                </button>
              )}
              {hud.nearVillager && !hud.nearShop && hud.nearNpcLabel && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-sky-500/50 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-sky-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-sky-400/50 dark:bg-slate-950/90 dark:text-sky-200 dark:hover:bg-slate-800"
                >
                  <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-600 dark:text-sky-400" />
                  <span>{hud.nearNpcLabel} (E)</span>
                </button>
              )}
              {hud.insideCabin && (
                <div className="hidden sm:block rounded-xl border border-amber-500/40 bg-white/88 px-2.5 py-1 text-[11px] font-semibold text-amber-800 backdrop-blur-md dark:border-amber-400/35 dark:bg-slate-950/85 dark:text-amber-200">
                  Усередині будівлі · Безпечна зона
                </div>
              )}
              {hud.insideCave && (
                <div className="hidden sm:block rounded-xl border border-cyan-500/40 bg-white/88 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 backdrop-blur-md dark:border-cyan-400/40 dark:bg-slate-950/88 dark:text-cyan-200">
                  Усередині печери · Руди, кристали та охорона
                </div>
              )}
              {hud.nearCampfire && hud.resources.raw_meat > 0 && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-orange-500/65 bg-orange-500/20 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-bold text-orange-800 shadow-md backdrop-blur-md hover:bg-orange-500/30 dark:border-orange-400/65 dark:text-orange-200"
                >
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-600 dark:text-orange-300" />
                  <span>М’ясо ({hud.resources.raw_meat})</span>
                </button>
              )}
              {hud.nearCampfire && !hud.insideCabin && (
                <div className="hidden sm:block rounded-xl border border-orange-500/40 bg-white/88 px-2.5 py-1 text-[11px] font-semibold text-orange-800 backdrop-blur-md dark:border-orange-400/35 dark:bg-slate-950/85 dark:text-orange-200">
                  Вогнище лікує героя
                </div>
              )}
              {hud.nearAdminPainting && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-amber-500/60 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-amber-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-amber-400/60 dark:bg-slate-950/90 dark:text-amber-200 dark:hover:bg-slate-800"
                >
                  <ImageIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Портрети Адмінів (E)</span>
                </button>
              )}
              {hud.nearSpawnThrone && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (onPressSpawnThrone) onPressSpawnThrone();
                    else onInteract();
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-amber-500/75 bg-amber-500/20 px-2.5 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-bold text-amber-900 shadow-md backdrop-blur-md active:scale-95 hover:bg-amber-500/30 dark:border-amber-400/70 dark:text-amber-100 dark:hover:bg-amber-500/30"
                >
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600 dark:text-amber-300" />
                  <span>Тут раточка (E)</span>
                </button>
              )}
              {hud.nearToolStand && hud.gameMode !== 'survival' && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-emerald-500/60 bg-white/92 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-emerald-800 shadow-md backdrop-blur-md hover:bg-slate-100 dark:border-emerald-400/60 dark:bg-slate-950/90 dark:text-emerald-200 dark:hover:bg-slate-800"
                >
                  <Hammer className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Стенд інструментів (E)</span>
                </button>
              )}
              {hud.inWater && (
                <div className="hidden sm:block rounded-xl border border-sky-500/40 bg-white/88 px-2.5 py-1 text-[11px] font-semibold text-sky-800 backdrop-blur-md dark:border-sky-400/35 dark:bg-slate-950/85 dark:text-sky-200">
                  Плавання у річці · Пробіл — виплисти
                </div>
              )}
            </div>
          )}

          {/* Builder Palette Bar - Single horizontal scroll strip on mobile, wrapped on desktop */}
          {hud.activeWeapon === 'builder' &&
            (hud.gameMode !== 'survival' || hud.upgrades.includes('builder_tool')) && (
            <div className="pointer-events-auto flex max-w-[96vw] sm:max-w-4xl flex-nowrap sm:flex-wrap items-center justify-start sm:justify-center gap-1 overflow-x-auto rounded-xl border border-emerald-500/45 bg-white/92 px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-xl backdrop-blur-md dark:border-emerald-400/40 dark:bg-slate-950/92">
              {BUILD_PIECES.map((piece) => {
                const selected = hud.selectedBuildPiece === piece.id;
                const usesStock = piece.usesWorkbenchStock && hud.workbenchStock > 0;
                const hasBuilderMaster = hud.upgrades.includes('builder_master');
                const costEntries = (Object.entries(piece.cost) as [ResourceId, number][]).map(
                  ([resId, amt]) => [
                    resId,
                    hasBuilderMaster && resId === 'wood' && amt > 1 ? amt - 1 : amt,
                  ] as const,
                );
                const affordable =
                  hud.gameMode === 'creative' ||
                  usesStock ||
                  costEntries.every(([resId, amt]) => (hud.resources[resId] ?? 0) >= amt);
                const shortResNames: Record<ResourceId, string> = {
                  wood: 'Д',
                  stone: 'К',
                  iron: 'З',
                  herb: 'Т',
                  essence: 'Е',
                  hide: 'Ш',
                  raw_meat: 'М',
                };
                const costStr =
                  hud.gameMode === 'creative'
                    ? 'Вільно'
                    : usesStock
                      ? `Зап:${hud.workbenchStock}`
                      : costEntries.map(([rId, amt]) => `${amt}${shortResNames[rId]}`).join(' ');
                return (
                  <button
                    key={piece.id}
                    type="button"
                    onMouseDown={keepCanvasFocus}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSetBuildPiece?.(piece.id);
                    }}
                    title={`${piece.name}: ${piece.description}`}
                    className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      selected
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                        : affordable
                          ? 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-white/12 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800'
                          : 'border-rose-400/35 bg-slate-100/60 text-slate-400 dark:border-rose-500/25 dark:bg-slate-900/50 dark:text-slate-500'
                    }`}
                  >
                    <span>{piece.shortName}</span>
                    <span
                      className={`font-mono-nums text-[9px] sm:text-[10px] ${
                        selected
                          ? 'text-slate-900 font-bold'
                          : affordable
                            ? 'text-amber-600 dark:text-amber-300'
                            : 'text-rose-500 dark:text-rose-400'
                      }`}
                    >
                      {costStr}
                    </span>
                  </button>
                );
              })}

              <div className="mx-0.5 hidden h-4 w-px bg-slate-300 dark:bg-white/15 sm:block" />

              {/* Story / Floor Level Selector */}
              <div className="flex items-center overflow-hidden rounded-lg border border-amber-500/45 bg-amber-500/15">
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetBuildFloor?.(hud.buildFloorLevel <= 0 ? 6 : hud.buildFloorLevel - 1);
                  }}
                  title="Нижчий поверх ([)"
                  className="px-1.5 py-0.5 sm:py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-500/25 dark:text-amber-200"
                >
                  −
                </button>
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onCycleBuildFloor?.(1);
                  }}
                  title="Обрати поверх будівництва: Авто або 1–6 поверх (клавіша H)"
                  className="px-1.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-amber-800 hover:bg-amber-500/20 whitespace-nowrap dark:text-amber-200"
                >
                  {hud.buildFloorLevel === 0 ? 'Поверх: Авто (H)' : `${hud.buildFloorLevel} Поверх (H)`}
                </button>
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetBuildFloor?.(hud.buildFloorLevel >= 6 ? 0 : hud.buildFloorLevel + 1);
                  }}
                  title="Вищий поверх (])"
                  className="px-1.5 py-0.5 sm:py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-500/25 dark:text-amber-200"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRotateBuild?.();
                }}
                title="Повернути блок на 90° (клавіша T)"
                className="flex items-center gap-1 rounded-lg border border-sky-500/45 bg-sky-500/15 px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-sky-800 hover:bg-sky-500/25 dark:border-sky-400/40 dark:text-sky-200"
              >
                <RotateCw className="h-3 w-3" />
                <span className="font-mono-nums">{hud.buildRotDeg}° (T)</span>
              </button>

              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onDemolishBuild?.();
                }}
                title="Розібрати найближчий власний блок із поверненням ресурсів (Backspace / U)"
                className="flex items-center gap-1 rounded-lg border border-rose-500/45 bg-rose-500/15 px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-rose-800 hover:bg-rose-500/25 dark:border-rose-400/40 dark:text-rose-200"
              >
                <Trash2 className="h-3 w-3" />
                <span className="hidden sm:inline">Знос (⌫)</span>
              </button>

              <span className="font-mono-nums hidden md:inline text-[10px] text-slate-600 dark:text-slate-400">
                4×4м · Побудовано: {hud.builtCount} · Д:{hud.resources.wood} К:{hud.resources.stone}
              </span>
            </div>
          )}

          {/* Popover: Full Arsenal (all 32 weapons & tools) */}
          {!dockCollapsed && arsenalOpen && (
            <div
              className={`pointer-events-auto mb-1.5 max-h-[42dvh] w-[min(94vw,680px)] overflow-y-auto rounded-2xl p-2.5 shadow-2xl ${GLASS_CARD}`}
            >
              <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-white/10">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Повний Арсенал ({WEAPONS.filter((w) => hud.gameMode !== 'survival' || hud.upgrades.includes(WEAPON_UNLOCK_MAP[w.id])).length}/{WEAPONS.length})
                </span>
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={() => setArsenalOpen(false)}
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Закрити
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {WEAPONS.map((w) => {
                  const lockedWeapon =
                    hud.gameMode === 'survival' && !hud.upgrades.includes(WEAPON_UNLOCK_MAP[w.id]);
                  const active = hud.activeWeapon === w.id && !lockedWeapon;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onMouseDown={keepCanvasFocus}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setArsenalOpen(false);
                        if (lockedWeapon) {
                          onOpenInventory('craft');
                        } else {
                          onSelectWeapon(w.id);
                        }
                      }}
                      title={
                        lockedWeapon
                          ? `У режимі Виживання скрафтіть «${w.name}» у меню Крафту [K]`
                          : `${w.name} (${w.damage} шк.) — ${w.description}`
                      }
                      className={`flex items-center justify-between gap-1.5 rounded-xl border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                        active
                          ? 'border-sky-500/80 bg-sky-500/20 text-slate-900 dark:border-sky-400/80 dark:bg-slate-800 dark:text-white'
                          : lockedWeapon
                            ? 'border-dashed border-amber-500/40 bg-slate-100/70 text-slate-500 hover:text-amber-700 dark:bg-slate-900/45 dark:text-slate-400 dark:hover:text-amber-200'
                            : 'border-slate-300/80 bg-slate-100/85 text-slate-800 hover:bg-slate-200/85 dark:border-white/10 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span style={{ color: !lockedWeapon ? w.accentHex : undefined }}>
                          {lockedWeapon ? (
                            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400/80" />
                          ) : (
                            getWeaponIcon(w.id)
                          )}
                        </span>
                        <span className="truncate">{w.name}</span>
                      </span>
                      {w.damage > 0 && (
                        <span className="font-mono-nums shrink-0 text-[9px] text-slate-500 dark:text-slate-400">
                          {w.damage}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Popover: All 25 Hostile Mobs Spawner */}
          {!dockCollapsed && mobSpawnerOpen && (
            <div
              className={`pointer-events-auto mb-1.5 max-h-[42dvh] w-[min(94vw,660px)] overflow-y-auto rounded-2xl p-2.5 shadow-2xl ${GLASS_CARD}`}
            >
              <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-white/10">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Виклик мобів ({SPAWN_MOBS.length} видів)
                </span>
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={() => setMobSpawnerOpen(false)}
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Закрити
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {SPAWN_MOBS.map((m) => {
                  const lockedSecret =
                    m.kind === 'secret_boss' && !hud.secretBossUnlocked && hud.gameMode !== 'creative';
                  const isSecretUnlocked = m.kind === 'secret_boss' && !lockedSecret;
                  return (
                    <button
                      key={m.kind}
                      type="button"
                      onMouseDown={keepCanvasFocus}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSpawnMob(m.kind);
                      }}
                      title={
                        lockedSecret
                          ? 'Секретний моб: переможіть Фінального Боса Малакора, щоб розблокувати!'
                          : `Викликати: ${m.label}`
                      }
                      className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left text-[11px] font-medium transition-colors ${
                        lockedSecret
                          ? 'border-dashed border-cyan-500/40 bg-slate-100/60 text-slate-500 hover:border-cyan-500/65 dark:bg-slate-900/45 dark:text-slate-400'
                          : isSecretUnlocked
                            ? 'border-cyan-500/55 bg-cyan-500/15 text-cyan-800 hover:bg-cyan-500/25 dark:border-cyan-400/55 dark:text-cyan-200'
                            : 'border-slate-300/80 bg-slate-100/80 text-slate-700 hover:border-emerald-500/45 hover:bg-slate-200 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-400/40 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {lockedSecret ? (
                        <Lock className="h-3 w-3 shrink-0 text-cyan-600 dark:text-cyan-400" />
                      ) : (
                        <Plus
                          className={`h-3 w-3 shrink-0 ${
                            isSecretUnlocked
                              ? 'text-cyan-600 dark:text-cyan-300'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        />
                      )}
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible Control Dock - Placed ABOVE MobileGamepad so gamepad stays anchored at bottom-0 */}
          <div className="pointer-events-auto flex max-w-[96vw] flex-col items-center">
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                setDockCollapsed((v) => {
                  if (!v) {
                    setArsenalOpen(false);
                    setMobSpawnerOpen(false);
                  }
                  return !v;
                });
              }}
              className="flex items-center gap-1 rounded-t-lg sm:rounded-t-xl border border-b-0 border-slate-300/80 bg-white/88 px-2 py-0.5 sm:px-3 text-[9px] sm:text-[10px] font-semibold text-slate-600 backdrop-blur-md hover:text-slate-900 dark:border-white/15 dark:bg-slate-950/85 dark:text-slate-300 dark:hover:text-white"
            >
              {dockCollapsed ? <ChevronUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
              <span>{dockCollapsed ? 'Арсенал' : 'Згорнути'}</span>
            </button>

            {!dockCollapsed && (
              <div className={`flex max-h-[20dvh] sm:max-h-none flex-wrap items-center justify-center gap-0.5 sm:gap-1.5 overflow-y-auto rounded-xl sm:rounded-2xl px-1.5 py-1 sm:px-2.5 sm:py-1.5 ${GLASS_CARD}`}>
                {/* Core Weapons & Tools 1-6, P + Full Arsenal Toggle */}
                <div className="flex items-center gap-1">
                  {WEAPONS.filter(
                    (w) => CORE_WEAPON_IDS.includes(w.id) || w.id === hud.activeWeapon,
                  ).map((w) => {
                    const lockedWeapon =
                      hud.gameMode === 'survival' && !hud.upgrades.includes(WEAPON_UNLOCK_MAP[w.id]);
                    const active = hud.activeWeapon === w.id && !lockedWeapon;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onMouseDown={keepCanvasFocus}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          if (lockedWeapon) {
                            onOpenInventory('craft');
                          } else {
                            onSelectWeapon(w.id);
                          }
                        }}
                        title={
                          lockedWeapon
                            ? `У режимі Виживання скрафтіть «${w.name}» у меню Крафту [K]`
                            : w.description
                        }
                        className={`relative flex items-center gap-1.5 overflow-hidden rounded-xl border px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                          active
                            ? 'border-sky-500/70 bg-sky-500/18 text-slate-900 dark:border-sky-400/70 dark:bg-slate-800 dark:text-white'
                            : lockedWeapon
                              ? 'border-dashed border-amber-500/40 bg-slate-100/70 text-slate-500 hover:text-amber-700 dark:bg-slate-900/45 dark:text-slate-400 dark:hover:text-amber-200'
                              : 'border-slate-300/80 bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                        }`}
                      >
                        {w.key && (
                          <span className="font-mono-nums text-[10px] text-slate-500 dark:text-slate-400">
                            {w.key}
                          </span>
                        )}
                        <span style={{ color: active ? w.accentHex : undefined }}>
                          {lockedWeapon ? (
                            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400/80" />
                          ) : (
                            getWeaponIcon(w.id)
                          )}
                        </span>
                        <span className="hidden sm:inline">{w.name}</span>
                        {active && hud.weaponCooldownRatio > 0.02 && (
                          <span
                            className="absolute bottom-0 left-0 h-0.5 bg-sky-500 dark:bg-sky-400"
                            style={{ width: `${hud.weaponCooldownRatio * 100}%` }}
                          />
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onMouseDown={keepCanvasFocus}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setMobSpawnerOpen(false);
                      setArsenalOpen((v) => !v);
                    }}
                    title="Відкрити весь арсенал з 32 видів зброї"
                    className={`flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                      arsenalOpen
                        ? 'border-sky-500 bg-sky-500 text-slate-950'
                        : 'border-sky-500/45 bg-sky-500/12 text-sky-800 hover:bg-sky-500/22 dark:border-sky-400/45 dark:text-sky-200'
                    }`}
                  >
                    <Sword className="h-3.5 w-3.5" />
                    <span>+{WEAPONS.length - CORE_WEAPON_IDS.length}</span>
                    {arsenalOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                  </button>
                </div>

                {/* Shield Hold Button (ПКМ / B) */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onSetBlocking(true);
                  }}
                  onPointerUp={() => onSetBlocking(false)}
                  onPointerLeave={() => onSetBlocking(false)}
                  onPointerCancel={() => onSetBlocking(false)}
                  title="Утримуйте для блоку щитом (ПКМ або B)"
                  className={`flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                    hud.blocking
                      ? 'border-sky-400 bg-sky-500 text-slate-950'
                      : 'border-sky-500/45 bg-sky-500/15 text-sky-800 hover:bg-sky-500/25 dark:border-sky-400/45 dark:text-sky-200'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Щит (B)</span>
                </button>

                {/* Active Owned Relics (Z, X, C) */}
                {RELIC_SKILLS.filter((rel) => hud.upgrades.includes(rel.id)).map((rel) => {
                  const cd = hud.relicCooldowns[rel.id] ?? 0;
                  return (
                    <button
                      key={rel.id}
                      type="button"
                      disabled={cd > 0}
                      onMouseDown={keepCanvasFocus}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onActivateRelic(rel.id);
                      }}
                      title={`${rel.skillName}: ${rel.description}`}
                      style={{ borderColor: cd <= 0 ? rel.colorHex : undefined }}
                      className={`font-mono-nums flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                        cd <= 0
                          ? 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'
                          : 'cursor-not-allowed border-slate-300/60 bg-slate-100/50 text-slate-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-500'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" style={{ color: cd <= 0 ? rel.colorHex : undefined }} />
                      <span>{rel.key}{cd > 0 ? ` ${Math.ceil(cd)}с` : ''}</span>
                    </button>
                  );
                })}

                {/* Quick Potions (8, 9, 0) + All Elixirs shortcut */}
                <button
                  type="button"
                  disabled={hud.consumables.potion <= 0}
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onUseConsumable('potion');
                  }}
                  title="Випити зілля лікування (клавіша 8)"
                  className={`flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    hud.consumables.potion > 0
                      ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25 dark:border-emerald-400/45 dark:text-emerald-200'
                      : 'cursor-not-allowed border-slate-300/60 bg-slate-100/50 text-slate-400 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-500'
                  }`}
                >
                  <FlaskConical className="h-3 w-3" />
                  <span className="font-mono-nums">Зілля ({hud.consumables.potion})</span>
                </button>
                {hud.consumables.mega_potion > 0 && (
                  <button
                    type="button"
                    onMouseDown={keepCanvasFocus}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onUseConsumable('mega_potion');
                    }}
                    title="Велике зілля зцілення (+120 HP) (клавіша 9)"
                    className="flex items-center gap-1 rounded-xl border border-rose-500/50 bg-rose-500/18 px-2 py-1.5 text-[11px] font-semibold text-rose-800 whitespace-nowrap shrink-0 transition-colors hover:bg-rose-500/28 dark:border-rose-400/50 dark:text-rose-200"
                  >
                    <FlaskConical className="h-3 w-3" />
                    <span className="font-mono-nums">Вел. ({hud.consumables.mega_potion})</span>
                  </button>
                )}
                {hud.consumables.cooked_meat > 0 && (
                  <button
                    type="button"
                    onMouseDown={keepCanvasFocus}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onUseConsumable('cooked_meat');
                    }}
                    title="З’їсти смажене м’ясо (+65 HP, +40 витр.) (клавіша 0)"
                    className="flex items-center gap-1 rounded-xl border border-orange-500/50 bg-orange-500/18 px-2 py-1.5 text-[11px] font-semibold text-orange-800 whitespace-nowrap shrink-0 transition-colors hover:bg-orange-500/28 dark:border-orange-400/50 dark:text-orange-200"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span className="font-mono-nums">М’ясо ({hud.consumables.cooked_meat})</span>
                  </button>
                )}
                {CONSUMABLES.some(
                  (c) =>
                    c.id !== 'potion' &&
                    c.id !== 'mega_potion' &&
                    c.id !== 'cooked_meat' &&
                    (hud.consumables[c.id] ?? 0) > 0,
                ) && (
                  <button
                    type="button"
                    onMouseDown={keepCanvasFocus}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenInventory('inventory');
                    }}
                    title="Відкрити еліксири бафів у Інвентарі (I)"
                    className="flex items-center gap-1 rounded-xl border border-purple-500/50 bg-purple-500/15 px-2 py-1.5 text-[11px] font-semibold text-purple-800 whitespace-nowrap shrink-0 hover:bg-purple-500/25 dark:border-purple-400/50 dark:text-purple-200"
                  >
                    <FlaskConical className="h-3 w-3" />
                    <span>Еліксири</span>
                  </button>
                )}

                {/* Primary Action Button */}
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onAttack();
                  }}
                  className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold text-white whitespace-nowrap shrink-0 transition-colors ${
                    hud.activeWeapon === 'builder'
                      ? 'border-emerald-400/60 bg-emerald-600/90 hover:bg-emerald-500'
                      : hud.activeWeapon === 'axe'
                        ? 'border-orange-400/60 bg-orange-600/90 hover:bg-orange-500'
                        : hud.activeWeapon === 'pickaxe'
                          ? 'border-slate-300/60 bg-slate-600/90 hover:bg-slate-500'
                          : 'border-rose-400/50 bg-rose-600/85 hover:bg-rose-500'
                  }`}
                >
                  {hud.activeWeapon === 'builder' ? (
                    <>
                      <Wrench className="h-3 w-3" />
                      <span>Збудувати</span>
                    </>
                  ) : hud.activeWeapon === 'axe' ? (
                    <>
                      <Axe className="h-3 w-3" />
                      <span>Зрубати</span>
                    </>
                  ) : hud.activeWeapon === 'pickaxe' ? (
                    <>
                      <Pickaxe className="h-3 w-3" />
                      <span>Добути</span>
                    </>
                  ) : (
                    <>
                      <Sword className="h-3 w-3" />
                      <span>Удар</span>
                    </>
                  )}
                </button>

                <div className="hidden h-5 w-px bg-slate-300 dark:bg-white/12 lg:block" />

                {/* Quick Mob Spawner */}
                <div className="flex items-center gap-1">
                  {SPAWN_MOBS.slice(0, 5).map((m) => (
                    <button
                      key={m.kind}
                      type="button"
                      onMouseDown={keepCanvasFocus}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSpawnMob(m.kind);
                      }}
                      title={`Викликати: ${m.label}`}
                      className="flex items-center gap-1 rounded-xl border border-slate-300/80 bg-slate-100/80 px-2 py-1.5 text-[11px] font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:border-emerald-500/45 hover:bg-slate-200 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-400/40 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <Plus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{m.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={keepCanvasFocus}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setArsenalOpen(false);
                      setMobSpawnerOpen((v) => !v);
                    }}
                    title="Усі 25 мобів та боси"
                    className={`flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                      mobSpawnerOpen
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                        : 'border-emerald-500/45 bg-emerald-500/12 text-emerald-800 hover:bg-emerald-500/22 dark:border-emerald-400/45 dark:text-emerald-200'
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Моби ({SPAWN_MOBS.length})</span>
                    {mobSpawnerOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Virtual Gamepad - Pinned as very last bottom child so it NEVER leaves screen */}
          {touchMode && (
            <MobileGamepad
              activeWeapon={hud.activeWeapon}
              gameMode={hud.gameMode}
              cameraViewMode={hud.cameraViewMode}
              weaponCooldownRatio={hud.weaponCooldownRatio}
              blocking={hud.blocking}
              consumables={hud.consumables}
              upgrades={hud.upgrades}
              relicCooldowns={hud.relicCooldowns}
              canInteract={
                hud.nearChest ||
                hud.nearShop ||
                hud.nearBed ||
                hud.nearWorkbench ||
                hud.nearVillager ||
                hud.nearAdminPainting ||
                hud.nearSpawnThrone ||
                (hud.nearToolStand && hud.gameMode !== 'survival') ||
                (hud.nearCampfire && hud.resources.raw_meat > 0) ||
                Boolean(hud.nearResourceLabel)
              }
              nearShop={hud.nearShop}
              selectedBuildLabel={
                BUILD_PIECES.find((p) => p.id === hud.selectedBuildPiece)?.shortName
              }
              buildFloorLevel={hud.buildFloorLevel}
              onTouchMove={onTouchMove}
              onAttack={onAttack}
              onSetBlocking={onSetBlocking}
              onActivateRelic={onActivateRelic}
              onJump={onJump}
              onInteract={onInteract}
              onSelectWeapon={onSelectWeapon}
              onUseConsumable={onUseConsumable}
              onCycleCameraView={onCycleCameraView}
              onCycleBuildPiece={onCycleBuildPiece}
              onRotateBuild={onRotateBuild}
              onCycleBuildFloor={onCycleBuildFloor}
              onDemolishBuild={onDemolishBuild}
            />
          )}
        </div>
      )}
    </div>
  );
};
