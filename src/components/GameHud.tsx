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
} from 'lucide-react';
import { ConsumableId, GameHudState, MobKind, WeaponId, WEAPONS } from '../game/types';

interface GameHudProps {
  hud: GameHudState;
  inventoryTab: 'inventory' | 'craft' | null;
  onOpenInventory: (tab: 'inventory' | 'craft') => void;
  onUseConsumable: (id: ConsumableId) => void;
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
  onTouchMove: (x: number, z: number) => void;
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
  onUseConsumable,
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
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [touchMode, setTouchMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
      setTouchMode(true);
    }
  }, []);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const staminaPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));
  const xpPct = Math.max(0, Math.min(100, (hud.xp / hud.xpToNext) * 100));

  const hasInteractivePrompt =
    hud.nearChest ||
    hud.nearWorkbench ||
    hud.nearVillager ||
    Boolean(hud.nearResourceLabel) ||
    hud.nearCampfire ||
    hud.insideCabin ||
    hud.inWater;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* Top Row */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left Circular Action Bar + Hero Card */}
        <div className="pointer-events-auto flex flex-col gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/85 p-1">
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                setShowHelp((v) => !v);
              }}
              title="Меню та керування"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                showHelp ? 'bg-amber-500 text-slate-950' : 'text-slate-200 hover:bg-white/12'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              title={hud.muted ? 'Увімкнути звук' : 'Вимкнути звук'}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/12"
            >
              {hud.muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCameraMode();
              }}
              title="Режим камери (L)"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                hud.pointerLocked || hud.autoFollowCam
                  ? 'bg-sky-500/25 text-sky-300'
                  : 'text-slate-200 hover:bg-white/12'
              }`}
            >
              <Crosshair className="h-4 w-4" />
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onTeleportCabin();
              }}
              title="До хатинки (R)"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/12"
            >
              <Home className="h-4 w-4" />
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onTeleportRiver();
              }}
              title="До річки (поплавати)"
              className="flex h-9 w-9 items-center justify-center rounded-full text-sky-300 transition-colors hover:bg-white/12"
            >
              <Waves className="h-4 w-4" />
            </button>
          </div>

          {hud.phase === 'playing' && (
            <div className="w-60 rounded-xl border border-white/12 bg-slate-950/82 p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-display font-bold text-white">Гравець · Рів. {hud.level}</span>
                <span className="font-mono-nums text-amber-300">{hud.coins} мон.</span>
              </div>

              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                <span>Здоров’я</span>
                <span className="font-mono-nums text-emerald-300">
                  {hud.hp}/{hud.maxHp}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-[width] duration-150"
                  style={{ width: `${hpPct}%` }}
                />
              </div>

              <div className="mt-2 mb-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Витривалість</span>
                <span className="font-mono-nums text-sky-300">{hud.stamina}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-sky-400 transition-[width] duration-100"
                  style={{ width: `${staminaPct}%` }}
                />
              </div>

              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-150"
                  style={{ width: `${xpPct}%` }}
                />
              </div>

              {/* Quick Resource Strip & Inventory/Craft shortcuts */}
              <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-slate-300">
                <span className="font-mono-nums">Дер:{hud.resources.wood} Камін:{hud.resources.stone} Зал:{hud.resources.iron}</span>
                <span className="font-mono-nums text-emerald-300">Зіл:{hud.consumables.potion}</span>
              </div>
            </div>
          )}
        </div>

        {/* Top-Center Zone & World Status */}
        {hud.phase === 'playing' && (
          <div className="hidden lg:flex items-center gap-2.5 rounded-xl border border-white/12 bg-slate-950/80 px-4 py-2 text-xs font-medium text-slate-200 whitespace-nowrap">
            <span className="font-display text-sm font-semibold text-white">{hud.zoneName}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono-nums text-amber-300">Хвиля {hud.wave}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono-nums text-slate-300">Ворогів: {hud.activeMobs}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono-nums text-emerald-300">Мирних: {hud.peacefulMobs}</span>
          </div>
        )}

        {/* Top-Right Inventory/Craft + Graphics Toggles */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory('inventory');
              }}
              title="Відкрити інвентар (I)"
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                inventoryTab === 'inventory'
                  ? 'border-sky-400/60 bg-sky-500/25 text-sky-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Backpack className="h-3.5 w-3.5 text-sky-300" />
              <span>Інвентар (I)</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory('craft');
              }}
              title="Відкрити меню крафту (K)"
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                inventoryTab === 'craft'
                  ? 'border-amber-400/60 bg-amber-500/25 text-amber-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Hammer className="h-3.5 w-3.5 text-amber-300" />
              <span>Крафт (K)</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleDof();
              }}
              title="Розмиття дальнього фону (DOF)"
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                hud.dofEnabled
                  ? 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Розмиття фону</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleEcoMode();
              }}
              title="Оптимізація GPU (60 FPS, менший нагрів відеокарти)"
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                hud.ecoMode
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Gauge className="h-3.5 w-3.5" />
              <span>{hud.ecoMode ? 'Еко GPU' : 'Макс GPU'}</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleShadowUpscale();
              }}
              title="Апскейлінг тіней (4K) та чіткості"
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                hud.shadowUpscale
                  ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>{hud.shadowUpscale ? 'Тіні 4K' : 'Тіні 2K'}</span>
            </button>

            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                setTouchMode((v) => !v);
              }}
              title="Екранні кнопки керування"
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                touchMode
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-slate-950/85 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Кнопки</span>
            </button>
          </div>

          {hud.phase === 'playing' && hud.killFeed.length > 0 && (
            <div className="hidden sm:flex flex-col items-end gap-1 text-right">
              {hud.killFeed.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-slate-950/78 px-2.5 py-1 text-xs text-slate-200"
                >
                  {item.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls Help Popover */}
      {showHelp && (
        <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-white/15 bg-slate-950/92 p-5 text-sm text-slate-200 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">Зручне керування</h2>
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
            <span className="text-slate-400">Огляд камерою</span>
            <span className="font-mono-nums text-white">Затиснути мишу або Q / C</span>
            <span className="text-slate-400">Атака / рубка ресурсів</span>
            <span className="font-mono-nums text-white">Клік мишею або F</span>
            <span className="text-slate-400">Вибір зброї</span>
            <span className="font-mono-nums text-white">1, 2, 3, 4</span>
            <span className="text-slate-400">Зілля / тонік / юшка</span>
            <span className="font-mono-nums text-white">5, 6, 7</span>
            <span className="text-slate-400">Скриня / ресурс / верстак / Орест</span>
            <span className="font-mono-nums text-white">E</span>
            <span className="text-slate-400">Інвентар / Крафт</span>
            <span className="font-mono-nums text-white">I / K</span>
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
            3D Бродилка · Стиль Roblox · Моби, Крафт і Зброя
          </p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Долина Блоків
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Досліджуйте велику лісову долину, заходьте всередину мисливської хатинки, збирайте
            ресурси, крафтіть броню та зброю, зустрічайте лісових оленів, овець і захищайте долину.
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
        <div className="flex flex-col items-center gap-2">
          {hasInteractivePrompt && (
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
              {hud.nearChest && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-slate-800"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Відкрити скриню (E)</span>
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
                  className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-slate-800"
                >
                  <Hammer className="h-4 w-4 text-amber-400" />
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
                  className="flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-slate-800"
                >
                  <Pickaxe className="h-4 w-4 text-emerald-400" />
                  <span>Зібрати: {hud.nearResourceLabel} (E)</span>
                </button>
              )}
              {hud.nearVillager && (
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-sky-400/50 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-sky-200 hover:bg-slate-800"
                >
                  <MessageCircle className="h-4 w-4 text-sky-400" />
                  <span>Поговорити з Лісником Орестом (E)</span>
                </button>
              )}
              {hud.insideCabin && (
                <div className="rounded-xl border border-amber-400/35 bg-slate-950/85 px-3.5 py-1.5 text-xs text-amber-200">
                  Усередині хатинки · Безпечна зона
                </div>
              )}
              {hud.nearCampfire && !hud.insideCabin && (
                <div className="rounded-xl border border-orange-400/35 bg-slate-950/85 px-3.5 py-1.5 text-xs text-orange-200">
                  Вогнище лікує героя
                </div>
              )}
              {hud.inWater && (
                <div className="rounded-xl border border-sky-400/35 bg-slate-950/85 px-3.5 py-1.5 text-xs text-sky-200">
                  Плавання у річці · Пробіл — виплисти
                </div>
              )}
            </div>
          )}

          {/* On-Screen Movement & Combat Buttons */}
          {touchMode && (
            <div className="pointer-events-auto flex w-full items-end justify-between px-1 pb-1 touch-none">
              <div className="grid grid-cols-3 gap-1.5">
                <div />
                <button
                  type="button"
                  onPointerDown={() => onTouchMove(0, -1)}
                  onPointerUp={() => onTouchMove(0, 0)}
                  onPointerLeave={() => onTouchMove(0, 0)}
                  onPointerCancel={() => onTouchMove(0, 0)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-sm font-bold text-white active:bg-slate-700"
                >
                  ▲
                </button>
                <div />
                <button
                  type="button"
                  onPointerDown={() => onTouchMove(-1, 0)}
                  onPointerUp={() => onTouchMove(0, 0)}
                  onPointerLeave={() => onTouchMove(0, 0)}
                  onPointerCancel={() => onTouchMove(0, 0)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-sm font-bold text-white active:bg-slate-700"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onPointerDown={() => onTouchMove(0, 1)}
                  onPointerUp={() => onTouchMove(0, 0)}
                  onPointerLeave={() => onTouchMove(0, 0)}
                  onPointerCancel={() => onTouchMove(0, 0)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-sm font-bold text-white active:bg-slate-700"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onPointerDown={() => onTouchMove(1, 0)}
                  onPointerUp={() => onTouchMove(0, 0)}
                  onPointerLeave={() => onTouchMove(0, 0)}
                  onPointerCancel={() => onTouchMove(0, 0)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-sm font-bold text-white active:bg-slate-700"
                >
                  ▶
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onJump();
                  }}
                  className="flex h-14 w-20 items-center justify-center rounded-xl border border-white/20 bg-slate-950/85 text-xs font-bold text-slate-100 active:bg-slate-700"
                >
                  Стрибок
                </button>
                <button
                  type="button"
                  onMouseDown={keepCanvasFocus}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onAttack();
                  }}
                  className="flex h-14 w-20 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-600/85 text-xs font-bold text-white active:bg-rose-500"
                >
                  Атака
                </button>
              </div>
            </div>
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
              className="flex items-center gap-1.5 rounded-t-xl border border-b-0 border-white/15 bg-slate-950/88 px-3.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
            >
              {dockCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span>{dockCollapsed ? 'Відкрити арсенал' : 'Згорнути панель'}</span>
            </button>

            {!dockCollapsed && (
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-slate-950/88 px-3 py-2.5 shadow-2xl">
                {/* Weapons 1-4 */}
                <div className="flex items-center gap-1.5">
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
                        className={`relative flex items-center gap-2 overflow-hidden rounded-xl border px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
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
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    hud.consumables.potion > 0
                      ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                      : 'cursor-not-allowed border-white/10 bg-slate-900/50 text-slate-500'
                  }`}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
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
                  className="flex items-center gap-1.5 rounded-xl border border-rose-400/50 bg-rose-600/85 px-3 py-2 text-xs font-bold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-rose-500"
                >
                  <Sword className="h-3.5 w-3.5" />
                  <span>Удар (F)</span>
                </button>

                <div className="hidden h-7 w-px bg-white/12 lg:block" />

                {/* Quick Mob Spawner */}
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-[11px] text-slate-400 xl:inline">Додати моба:</span>
                  {SPAWN_MOBS.map((m) => (
                    <button
                      key={m.kind}
                      type="button"
                      onMouseDown={keepCanvasFocus}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSpawnMob(m.kind);
                      }}
                      className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-emerald-400/40 hover:bg-slate-800 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-400" />
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
