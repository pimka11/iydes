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
} from 'lucide-react';
import {
  ConsumableId,
  GameHudState,
  MerchantKind,
  MobKind,
  QUESTS,
  RELIC_SKILLS,
  RelicId,
  SEASON_LABELS,
  WEATHER_LABELS,
  WeaponId,
  WEAPONS,
} from '../game/types';
import { ModalTab } from './InventoryCraftModal';
import { Minimap } from './Minimap';
import { MobileGamepad } from './MobileGamepad';
import { PWAInstallButton } from './PWAInstallButton';

interface GameHudProps {
  hud: GameHudState;
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
  onAttack: () => void;
  onJump: () => void;
  onTouchMove: (x: number, z: number, sprint?: boolean) => void;
  onSaveGame?: () => void;
  onNewGame?: () => void;
}

const WEAPON_ICONS: Record<WeaponId, React.ReactNode> = {
  sword: <Sword className="w-4 h-4" />,
  hammer: <Hammer className="w-4 h-4" />,
  blaster: <Zap className="w-4 h-4" />,
  bow: <Target className="w-4 h-4" />,
};

const SPAWN_MOBS: { kind: MobKind; label: string }[] = [
  { kind: 'slime', label: 'Слайм' },
  { kind: 'goblin', label: 'Гоблін' },
  { kind: 'wolf', label: 'Вовк' },
  { kind: 'skeleton', label: 'Скелет' },
  { kind: 'golem', label: 'Голем' },
  { kind: 'boss', label: 'Бос' },
];

const keepCanvasFocus = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
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
  onAttack,
  onJump,
  onTouchMove,
  onSaveGame,
  onNewGame,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [touchMode, setTouchMode] = useState(false);
  const [fpsVisible, setFpsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    Boolean(hud.nearNpcLabel) ||
    Boolean(hud.nearResourceLabel) ||
    hud.nearCampfire ||
    hud.insideCabin ||
    hud.insideCave ||
    hud.inWater;

  const SeasonIcon =
    hud.season === 'winter' ? (
      <Snowflake className="h-3 w-3 text-sky-300" />
    ) : hud.season === 'autumn' ? (
      <Leaf className="h-3 w-3 text-amber-400" />
    ) : (
      <Sun className="h-3 w-3 text-emerald-300" />
    );

  const WeatherIcon =
    hud.weather === 'rain' ? (
      <CloudRain className="h-3 w-3 text-sky-300" />
    ) : hud.weather === 'fog' ? (
      <CloudFog className="h-3 w-3 text-slate-300" />
    ) : (
      <Sparkles className="h-3 w-3 text-amber-300" />
    );

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-1.5 sm:p-2.5">
      {/* Top Row */}
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        {/* Top-Left Circular Action Bar + Compact Hero Card + Active Quest Pill */}
        <div className="pointer-events-auto flex flex-col gap-1 sm:gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <div className="flex items-center gap-0.5 sm:gap-1 rounded-full border border-white/15 bg-slate-950/85 p-0.5">
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowHelp((v) => !v);
                }}
                title="Меню, графіка та керування"
                className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-colors ${
                  showHelp ? 'bg-amber-500 text-slate-950' : 'text-slate-200 hover:bg-white/12'
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
                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/12"
              >
                {hud.muted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onMouseDown={keepCanvasFocus}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleCameraMode();
                }}
                title="Режим камери (L)"
                className={`hidden sm:flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  hud.pointerLocked || hud.autoFollowCam
                    ? 'bg-sky-500/25 text-sky-300'
                    : 'text-slate-200 hover:bg-white/12'
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
                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/12"
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
                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-sky-300 transition-colors hover:bg-white/12"
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
                className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-colors ${
                  isFullscreen ? 'bg-emerald-500/25 text-emerald-300' : 'text-slate-200 hover:bg-white/12'
                }`}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Season & Weather Quick Toggles */}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleSeason();
              }}
              title="Змінити пору року"
              className="flex h-7 sm:h-8 items-center gap-1 rounded-full border border-white/15 bg-slate-950/85 px-2 text-[10px] sm:text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
            >
              {SeasonIcon}
              <span>{SEASON_LABELS[hud.season]}</span>
              <span className="hidden sm:inline font-mono-nums text-[10px] text-slate-400">
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
              className="flex h-7 sm:h-8 items-center gap-1 rounded-full border border-white/15 bg-slate-950/85 px-2 text-[10px] sm:text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
            >
              {WeatherIcon}
              <span className="hidden sm:inline">{WEATHER_LABELS[hud.weather][hud.season]}</span>
            </button>

            {/* Live FPS Sensor */}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                setFpsVisible((v) => !v);
              }}
              title="Датчик FPS"
              className={`hidden sm:flex h-8 items-center gap-1 rounded-full border px-2 text-[11px] font-mono-nums font-bold transition-colors ${
                hud.fps >= 50
                  ? 'border-emerald-400/45 bg-slate-950/88 text-emerald-300'
                  : hud.fps >= 30
                    ? 'border-amber-400/45 bg-slate-950/88 text-amber-300'
                    : 'border-rose-400/50 bg-slate-950/88 text-rose-300'
              }`}
            >
              <Activity className="h-3 w-3" />
              {fpsVisible ? <span>{hud.fps} FPS</span> : <span>FPS</span>}
            </button>
          </div>

          {hud.phase === 'playing' && (
            <div className="flex flex-col gap-1">
              <div className="w-32 sm:w-44 rounded-lg border border-white/12 bg-slate-950/80 p-1.5 sm:p-2">
                <div className="mb-1 flex items-center justify-between text-[10px] sm:text-[11px] leading-none">
                  <span className="font-display font-bold text-white">Рів.{hud.level}</span>
                  <span className="font-mono-nums text-amber-300">{hud.coins}м</span>
                </div>

                <div className="mb-0.5 flex items-center justify-between text-[9px] sm:text-[10px] leading-none text-slate-300">
                  <span>HP</span>
                  <span className="font-mono-nums text-emerald-300">
                    {hud.hp}/{hud.maxHp}
                  </span>
                </div>
                <div className="h-1 sm:h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-[width] duration-150"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>

                <div className="mt-1 flex items-center gap-1">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-sky-400 transition-[width] duration-100"
                      style={{ width: `${staminaPct}%` }}
                    />
                  </div>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-amber-400 transition-[width] duration-150"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1 text-[9px] sm:text-[10px] leading-none text-slate-300">
                  <span className="font-mono-nums hidden sm:inline">Д:{hud.resources.wood} К:{hud.resources.stone} З:{hud.resources.iron}</span>
                  <span className="font-mono-nums sm:hidden">Д:{hud.resources.wood} З:{hud.resources.iron}</span>
                  <span className="font-mono-nums font-semibold text-purple-300">Е:{hud.resources.essence}</span>
                </div>
              </div>

              {nextQuestDef && nextQuestState && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenInventory('quests');
                  }}
                  className="hidden sm:flex w-44 items-center justify-between gap-1 rounded-lg border border-purple-400/35 bg-slate-950/82 px-2 py-1 text-left text-[10px] hover:bg-slate-900"
                >
                  <span className="flex items-center gap-1 truncate text-purple-200 font-semibold">
                    <ScrollText className="h-3 w-3 shrink-0 text-purple-400" />
                    <span className="truncate">{nextQuestDef.title}</span>
                  </span>
                  <span className="font-mono-nums shrink-0 text-amber-300 font-bold">
                    {nextQuestState.progress}/{nextQuestDef.targetCount}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Top-Center Zone & Wave Status */}
        {hud.phase === 'playing' && (
          <div className="hidden lg:flex items-center gap-2 rounded-lg border border-white/12 bg-slate-950/80 px-3 py-1 text-[11px] font-medium text-slate-200 whitespace-nowrap">
            <span className="font-display text-xs font-semibold text-white">{hud.zoneName}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono-nums text-amber-300">Хвиля {hud.wave}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono-nums text-slate-300">Ворогів: {hud.activeMobs}</span>
          </div>
        )}

        {/* Top-Right Modals + Minimap + Feed */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap items-center justify-end gap-1">
            <PWAInstallButton onModalOpenChange={onInstallModalChange} />
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory('inventory');
              }}
              title="Інвентар (I)"
              className={`flex h-7 sm:h-8 items-center gap-1 rounded-lg sm:rounded-xl border px-2 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                inventoryTab === 'inventory'
                  ? 'border-sky-400/60 bg-sky-500/25 text-sky-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Backpack className="h-3.5 w-3.5 text-sky-300" />
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
              className={`flex h-7 sm:h-8 items-center gap-1 rounded-lg sm:rounded-xl border px-2 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                inventoryTab === 'craft'
                  ? 'border-amber-400/60 bg-amber-500/25 text-amber-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Hammer className="h-3.5 w-3.5 text-amber-300" />
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
              className={`flex h-7 sm:h-8 items-center gap-1 rounded-lg sm:rounded-xl border px-2 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                inventoryTab === 'shop'
                  ? 'border-emerald-400/60 bg-emerald-500/25 text-emerald-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Store className="h-3.5 w-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Купці</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory('quests');
              }}
              title="Квести долини (J)"
              className={`flex h-7 sm:h-8 items-center gap-1 rounded-lg sm:rounded-xl border px-2 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                inventoryTab === 'quests'
                  ? 'border-purple-400/60 bg-purple-500/25 text-purple-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ScrollText className="h-3.5 w-3.5 text-purple-300" />
              <span className="hidden sm:inline">Квести</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleEcoMode();
              }}
              title="Оптимізація GPU"
              className={`hidden md:flex h-8 items-center gap-1 rounded-xl border px-2 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                hud.ecoMode
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-300 hover:bg-slate-800'
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
              className={`flex h-7 sm:h-8 items-center gap-1 rounded-lg sm:rounded-xl border px-2 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                touchMode
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Геймпад</span>
            </button>
          </div>

          {hud.phase === 'playing' && (
            <div className="flex items-start gap-1.5">
              {hud.killFeed.length > 0 && (
                <div className="hidden md:flex flex-col items-end gap-1 text-right">
                  {hud.killFeed.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-slate-950/78 px-2.5 py-1 text-[11px] text-slate-200"
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
        <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-white/15 bg-slate-950/92 p-5 text-sm text-slate-200 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">Керування та Графіка</h2>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={() => setShowHelp(false)}
              className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Закрити
            </button>
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
            <span className="text-slate-400">Ходьба / плавання</span>
            <span className="font-mono-nums text-white">W A S D / Стрілки</span>
            <span className="text-slate-400">Біг</span>
            <span className="font-mono-nums text-white">Shift</span>
            <span className="text-slate-400">Стрибок / вгору у воді</span>
            <span className="font-mono-nums text-white">Пробіл (Space)</span>
            <span className="text-slate-400">Атака</span>
            <span className="font-mono-nums text-white">ЛКМ або F</span>
            <span className="text-slate-400">Щит (Блок / Парирування)</span>
            <span className="font-mono-nums text-sky-300">ПКМ або B</span>
            <span className="text-slate-400">Навички реліквій</span>
            <span className="font-mono-nums text-amber-300">Z, X, C</span>
            <span className="text-slate-400">Зброя / Зілля</span>
            <span className="font-mono-nums text-white">1–4 / 5–7</span>
            <span className="text-slate-400">Взаємодія / NPC / Скриня</span>
            <span className="font-mono-nums text-white">E</span>
            <span className="text-slate-400">Інвентар / Крафт / Купці / Квести</span>
            <span className="font-mono-nums text-white">I / K / M / J</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={onToggleDof}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                hud.dofEnabled ? 'border-sky-400/50 bg-sky-500/20 text-sky-200' : 'border-white/15 bg-slate-900 text-slate-300'
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
                hud.shadowUpscale ? 'border-amber-400/50 bg-amber-500/20 text-amber-200' : 'border-white/15 bg-slate-900 text-slate-300'
              }`}
            >
              {hud.shadowUpscale ? 'Тіні: 4K' : 'Тіні: 2K'}
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={onTeleportRiver}
              className="rounded-lg border border-sky-400/35 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-sky-300"
            >
              До річки
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            <div className="text-[11px] text-slate-400">
              Стежки (&gt;10 кроків): <strong className="font-mono-nums text-amber-300">{hud.trampledCount}</strong>
              {hud.lastSavedAt && (
                <span className="ml-2 text-emerald-300/90">
                  · Збережено {new Date(hud.lastSavedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {onSaveGame && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={() => onSaveGame()}
                  className="flex items-center gap-1 rounded-lg border border-emerald-400/45 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
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
                  className="flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Нова гра</span>
                </button>
              )}
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
        <div className="pointer-events-auto mx-auto my-auto max-w-lg rounded-2xl border border-white/15 bg-slate-950/88 p-7 text-center shadow-2xl">
          <p className="text-xs font-medium text-amber-300">
            3D Пригода · Пори року · Щит · Реліквії та Печери
          </p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Долина Блоків
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Блокуйте щитом, активуйте реліквії, досліджуйте печери в горах, торгуйте з різними купцями та виконуйте квести в живій долині зі зміною погоди й пір року.
          </p>
          <button
            type="button"
            onMouseDown={keepCanvasFocus}
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="mt-6 w-full rounded-xl bg-emerald-500 px-6 py-3.5 font-display text-base font-bold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Грати
          </button>
        </div>
      )}

      {/* Respawn Overlay */}
      {hud.phase === 'dead' && (
        <div className="pointer-events-auto mx-auto my-auto max-w-sm rounded-2xl border border-rose-500/35 bg-slate-950/92 p-6 text-center shadow-2xl">
          <h2 className="font-display text-2xl font-bold text-rose-400">Героя переможено</h2>
          <p className="mt-2 text-sm text-slate-300">
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
      )}

      {/* Bottom Area */}
      {hud.phase === 'playing' && (
        <div className="flex flex-col items-center gap-1 sm:gap-1.5">
          {hasInteractivePrompt && (
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5">
              {hud.nearChest && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-slate-800"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Відкрити скриню (E)</span>
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
                  className="flex items-center gap-1.5 rounded-lg border border-amber-400/60 bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-slate-800"
                >
                  <Store className="h-3.5 w-3.5 text-amber-400" />
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
                  className="flex items-center gap-1.5 rounded-lg border border-rose-400/50 bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold text-rose-200 hover:bg-slate-800"
                >
                  <BedDouble className="h-3.5 w-3.5 text-rose-400" />
                  <span>Відпочити на ліжку (+HP) (E)</span>
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
                  className="flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-slate-800"
                >
                  <Hammer className="h-3.5 w-3.5 text-amber-400" />
                  <span>Верстак хатинки — Крафт (E)</span>
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
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-slate-800"
                >
                  <Pickaxe className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Зібрати: {hud.nearResourceLabel} (E)</span>
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
                  className="flex items-center gap-1.5 rounded-lg border border-sky-400/50 bg-slate-950/90 px-3 py-1.5 text-[11px] font-semibold text-sky-200 hover:bg-slate-800"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-sky-400" />
                  <span>{hud.nearNpcLabel} (E)</span>
                </button>
              )}
              {hud.insideCabin && (
                <div className="rounded-lg border border-amber-400/35 bg-slate-950/85 px-2.5 py-1 text-[10px] sm:text-[11px] text-amber-200">
                  Усередині будівлі · Безпечна зона
                </div>
              )}
              {hud.insideCave && (
                <div className="rounded-lg border border-cyan-400/40 bg-slate-950/88 px-2.5 py-1 text-[10px] sm:text-[11px] text-cyan-200">
                  Усередині печери · Руди, кристали та охорона
                </div>
              )}
              {hud.nearCampfire && !hud.insideCabin && (
                <div className="rounded-lg border border-orange-400/35 bg-slate-950/85 px-2.5 py-1 text-[10px] sm:text-[11px] text-orange-200">
                  Вогнище лікує героя
                </div>
              )}
              {hud.inWater && (
                <div className="rounded-lg border border-sky-400/35 bg-slate-950/85 px-2.5 py-1 text-[10px] sm:text-[11px] text-sky-200">
                  Плавання у річці · Пробіл — виплисти
                </div>
              )}
            </div>
          )}

          {/* Mobile Virtual Gamepad */}
          {touchMode && (
            <MobileGamepad
              activeWeapon={hud.activeWeapon}
              weaponCooldownRatio={hud.weaponCooldownRatio}
              blocking={hud.blocking}
              potions={hud.consumables.potion}
              upgrades={hud.upgrades}
              relicCooldowns={hud.relicCooldowns}
              canInteract={
                hud.nearChest ||
                hud.nearShop ||
                hud.nearBed ||
                hud.nearWorkbench ||
                hud.nearVillager ||
                Boolean(hud.nearResourceLabel)
              }
              nearShop={hud.nearShop}
              onTouchMove={onTouchMove}
              onAttack={onAttack}
              onSetBlocking={onSetBlocking}
              onActivateRelic={onActivateRelic}
              onJump={onJump}
              onInteract={onInteract}
              onSelectWeapon={onSelectWeapon}
              onUsePotion={() => onUseConsumable('potion')}
            />
          )}

          {/* Collapsible Bottom Control Dock */}
          <div className="pointer-events-auto flex flex-col items-center">
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                setDockCollapsed((v) => !v);
              }}
              className="flex items-center gap-1 rounded-t-lg border border-b-0 border-white/15 bg-slate-950/85 px-2.5 py-0.5 text-[10px] font-medium text-slate-300 hover:text-white"
            >
              {dockCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span>{dockCollapsed ? 'Арсенал' : 'Згорнути'}</span>
            </button>

            {!dockCollapsed && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-950/88 px-2 py-1.5 shadow-2xl">
                {/* Weapons 1-4 */}
                <div className="flex items-center gap-1">
                  {WEAPONS.map((w) => {
                    const active = hud.activeWeapon === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onMouseDown={keepCanvasFocus}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onSelectWeapon(w.id);
                        }}
                        title={w.description}
                        className={`relative flex items-center gap-1.5 overflow-hidden rounded-lg border px-2 py-1.5 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                          active
                            ? 'border-sky-400/70 bg-slate-800 text-white'
                            : 'border-white/10 bg-slate-900/70 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <span className="font-mono-nums text-[10px] text-slate-400">{w.key}</span>
                        <span style={{ color: active ? w.accentHex : undefined }}>
                          {WEAPON_ICONS[w.id]}
                        </span>
                        <span className="hidden sm:inline">{w.name}</span>
                        {active && hud.weaponCooldownRatio > 0.02 && (
                          <span
                            className="absolute bottom-0 left-0 h-0.5 bg-sky-400"
                            style={{ width: `${hud.weaponCooldownRatio * 100}%` }}
                          />
                        )}
                      </button>
                    );
                  })}
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
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                    hud.blocking
                      ? 'border-sky-300 bg-sky-500 text-slate-950'
                      : 'border-sky-400/45 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25'
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
                      className={`font-mono-nums flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                        cd <= 0
                          ? 'bg-slate-800 text-white hover:bg-slate-700'
                          : 'cursor-not-allowed border-white/10 bg-slate-900/60 text-slate-500'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" style={{ color: cd <= 0 ? rel.colorHex : undefined }} />
                      <span>{rel.key}{cd > 0 ? ` ${Math.ceil(cd)}с` : ''}</span>
                    </button>
                  );
                })}

                {/* Quick Heal Potion (5) */}
                <button
                  type="button"
                  disabled={hud.consumables.potion <= 0}
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onUseConsumable('potion');
                  }}
                  title="Випити зілля лікування (клавіша 5)"
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    hud.consumables.potion > 0
                      ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                      : 'cursor-not-allowed border-white/10 bg-slate-900/50 text-slate-500'
                  }`}
                >
                  <FlaskConical className="h-3 w-3" />
                  <span className="font-mono-nums">Зілля ({hud.consumables.potion})</span>
                </button>

                {/* Attack Button */}
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onAttack();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-rose-400/50 bg-rose-600/85 px-2.5 py-1.5 text-[11px] font-bold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-rose-500"
                >
                  <Sword className="h-3 w-3" />
                  <span>Удар</span>
                </button>

                <div className="hidden h-5 w-px bg-white/12 lg:block" />

                {/* Quick Mob Spawner */}
                <div className="flex items-center gap-1">
                  {SPAWN_MOBS.map((m) => (
                    <button
                      key={m.kind}
                      type="button"
                      onMouseDown={keepCanvasFocus}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSpawnMob(m.kind);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1.5 text-[11px] font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-emerald-400/40 hover:bg-slate-800 hover:text-white"
                    >
                      <Plus className="h-3 w-3 text-emerald-400" />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
