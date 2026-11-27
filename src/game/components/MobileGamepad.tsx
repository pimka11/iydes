import React, { useRef, useState } from 'react';
import {
  Sword,
  FlaskConical,
  ArrowUp,
  Hand,
  Store,
  Shield,
  Axe,
  Pickaxe,
  Wrench,
  RotateCw,
  Trash2,
  Camera,
  ChevronUp,
} from 'lucide-react';
import {
  CameraViewMode,
  CONSUMABLES,
  ConsumableId,
  LanguageCode,
  RELIC_SKILLS,
  RelicId,
  UpgradeId,
  WeaponId,
  WEAPON_UNLOCK_MAP,
  WEAPONS,
  GameMode,
} from '../types';
import { getCameraLabel, getUiStrings } from '../i18n';

interface MobileGamepadProps {
  language?: LanguageCode;
  activeWeapon: WeaponId;
  gameMode: GameMode;
  cameraViewMode: CameraViewMode;
  weaponCooldownRatio: number;
  blocking: boolean;
  consumables: Record<ConsumableId, number>;
  upgrades: UpgradeId[];
  relicCooldowns: Record<RelicId, number>;
  canInteract: boolean;
  nearShop: boolean;
  selectedBuildLabel?: string;
  buildFloorLevel?: number;
  onTouchMove: (x: number, z: number, sprint?: boolean) => void;
  onAttack: () => void;
  onSetBlocking: (active: boolean) => void;
  onActivateRelic: (id: RelicId) => void;
  onJump: () => void;
  onInteract: () => void;
  onSelectWeapon: (id: WeaponId) => void;
  onUseConsumable: (id: ConsumableId) => void;
  onCycleCameraView: () => void;
  onCycleBuildPiece?: () => void;
  onRotateBuild?: () => void;
  onCycleBuildFloor?: (delta?: number) => void;
  onDemolishBuild?: () => void;
}

const MAX_STICK_RADIUS = 32;

const SHORT_CONSUMABLE_LABEL: Partial<Record<ConsumableId, string>> = {
  potion: 'Зілля +50',
  mega_potion: 'Вел. +120',
  cooked_meat: 'М’ясо',
  tonic: 'Тонік',
  stew: 'Юшка',
  rage_potion: 'Лють',
  swift_potion: 'Швидк.',
  iron_skin_potion: 'Броня',
  phoenix_elixir: 'Фенікс',
};

const MobileGamepadInner: React.FC<MobileGamepadProps> = ({
  language,
  activeWeapon,
  gameMode,
  cameraViewMode,
  weaponCooldownRatio,
  blocking,
  consumables,
  upgrades,
  relicCooldowns,
  canInteract,
  nearShop,
  selectedBuildLabel,
  buildFloorLevel = 0,
  onTouchMove,
  onAttack,
  onSetBlocking,
  onActivateRelic,
  onJump,
  onInteract,
  onSelectWeapon,
  onUseConsumable,
  onCycleCameraView,
  onCycleBuildPiece,
  onRotateBuild,
  onCycleBuildFloor,
  onDemolishBuild,
}) => {
  const s = getUiStrings(language);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, sprinting: false });
  const [potionDrawerOpen, setPotionDrawerOpen] = useState(false);

  const updateStick = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxRadius = Math.max(18, rect.width * 0.36);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      const s = maxRadius / dist;
      dx *= s;
      dy *= s;
    }
    const normX = dx / maxRadius;
    const normZ = dy / maxRadius;
    const mag = Math.min(1, dist / maxRadius);
    const sprinting = mag > 0.84;
    setKnob({ x: dx, y: dy, sprinting });
    onTouchMove(normX, normZ, sprinting);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0, sprinting: false });
    onTouchMove(0, 0, false);
  };

  const cycleWeapon = () => {
    const unlocked = WEAPONS.filter(
      (w) => gameMode !== 'survival' || upgrades.includes(WEAPON_UNLOCK_MAP[w.id]),
    );
    const list = unlocked.length > 0 ? unlocked : WEAPONS;
    const idx = list.findIndex((w) => w.id === activeWeapon);
    const next = list[(idx + 1 + list.length) % list.length];
    onSelectWeapon(next.id);
  };

  const activeWeaponDef = WEAPONS.find((w) => w.id === activeWeapon) ?? WEAPONS[0];
  const ownedRelics = RELIC_SKILLS.filter((r) => upgrades.includes(r.id));
  const ownedConsumables = CONSUMABLES.filter((c) => (consumables[c.id] ?? 0) > 0);
  const totalConsumables = ownedConsumables.reduce((acc, c) => acc + (consumables[c.id] ?? 0), 0);
  const primaryConsumable =
    ownedConsumables.find((c) => c.id === 'potion') ??
    ownedConsumables.find((c) => c.id === 'mega_potion') ??
    ownedConsumables[0] ??
    null;

  return (
    <div className="pointer-events-none flex w-full items-end justify-between gap-1.5 px-0.5 pb-0.5 select-none">
      {/* Left: Compact Analog Virtual Joystick */}
      <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-0.5 touch-none">
        {knob.sprinting && (
          <span className="rounded-full bg-sky-500/85 px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold text-slate-950">
            {s.sprintBadge}
          </span>
        )}
        <div
          ref={stickRef}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (activePointerId.current !== null) return;
            activePointerId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateStick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (activePointerId.current !== e.pointerId) return;
            e.preventDefault();
            updateStick(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (activePointerId.current !== e.pointerId) return;
            resetStick();
          }}
          onPointerCancel={(e) => {
            if (activePointerId.current !== e.pointerId) return;
            resetStick();
          }}
          className="relative flex h-16 w-16 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 border-slate-300/70 dark:border-white/25 bg-white/65 dark:bg-slate-950/60 shadow-lg backdrop-blur-xs"
        >
          <div className="h-8 w-8 sm:h-14 sm:w-14 rounded-full border border-slate-300/60 dark:border-white/10" />
          <div
            style={{
              transform: `translate(${knob.x}px, ${knob.y}px)`,
            }}
            className={`absolute h-6 w-6 sm:h-11 sm:w-11 rounded-full border-2 shadow-md transition-colors ${
              knob.sprinting
                ? 'border-sky-300 bg-sky-400/90'
                : 'border-slate-500/60 dark:border-white/50 bg-slate-700/85 dark:bg-slate-200/85'
            }`}
          />
        </div>
      </div>

      {/* Right: Ultra-Compact Ergonomic Thumb Cluster */}
      <div className="pointer-events-auto relative flex shrink-0 flex-col items-end gap-1 sm:gap-1.5 touch-none">
        {/* Pop-up Quick Potion & Elixir Fan on Phone */}
        {potionDrawerOpen && ownedConsumables.length > 0 && (
          <div className="flex max-h-44 max-w-[260px] flex-wrap justify-end gap-1 overflow-y-auto rounded-2xl border border-slate-300/80 bg-white/94 p-1.5 shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-slate-950/92">
            {ownedConsumables.map((c) => {
              const qty = consumables[c.id] ?? 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUseConsumable(c.id);
                    if (qty <= 1 && ownedConsumables.length <= 1) {
                      setPotionDrawerOpen(false);
                    }
                  }}
                  style={{ borderColor: c.accentHex }}
                  className="flex h-8 sm:h-9 items-center gap-1 rounded-xl border bg-slate-100/90 px-2 text-[10px] font-bold text-slate-900 active:scale-95 dark:bg-slate-900/90 dark:text-white"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: c.accentHex }}
                  />
                  <span className="max-w-[105px] truncate">{SHORT_CONSUMABLE_LABEL[c.id] ?? c.name}</span>
                  <span className="font-mono-nums text-slate-500 dark:text-slate-300">×{qty}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Owned Active Relics Row */}
        {ownedRelics.length > 0 && (
          <div className="flex max-w-[210px] flex-wrap justify-end gap-1 sm:max-w-[260px] sm:gap-1.5">
            {ownedRelics.map((rel) => {
              const cd = relicCooldowns[rel.id] ?? 0;
              return (
                <button
                  key={rel.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onActivateRelic(rel.id);
                  }}
                  style={{ borderColor: cd <= 0 ? rel.colorHex : undefined }}
                  className={`font-mono-nums flex h-7 min-w-7 sm:h-10 sm:min-w-10 items-center justify-center rounded-full border px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-bold shadow-md active:scale-95 ${
                    cd <= 0
                      ? 'bg-white/90 dark:bg-slate-950/85 text-slate-900 dark:text-white'
                      : 'border-slate-300 dark:border-white/15 bg-white/75 dark:bg-slate-950/75 text-slate-400'
                  }`}
                >
                  {cd > 0 ? `${Math.ceil(cd)}${s.secShort}` : rel.key}
                </button>
              );
            })}
          </div>
        )}

        {/* Builder quick controls on touch */}
        {activeWeapon === 'builder' && (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCycleBuildPiece?.();
              }}
              className="flex h-7 sm:h-10 items-center gap-1 rounded-full border border-emerald-500/60 bg-white/90 dark:bg-slate-950/85 px-2 sm:px-3 text-[9px] sm:text-[10px] font-bold text-emerald-800 dark:text-emerald-200 active:scale-95"
            >
              <Wrench className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>{selectedBuildLabel ?? 'Блок'}</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCycleBuildFloor?.(1);
              }}
              className="flex h-7 sm:h-10 items-center justify-center rounded-full border border-amber-500/55 bg-white/90 dark:bg-slate-950/85 px-2 sm:px-2.5 text-[9px] sm:text-[10px] font-bold text-amber-800 dark:text-amber-200 active:scale-95"
              title="Поверх (Авто / 1–6)"
            >
              <span>{buildFloorLevel === 0 ? s.autoFloor : `${buildFloorLevel}${s.floorShort}`}</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRotateBuild?.();
              }}
              className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-sky-500/50 bg-white/90 dark:bg-slate-950/85 text-sky-700 dark:text-sky-200 active:scale-95"
              title="Оберт 90°"
            >
              <RotateCw className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDemolishBuild?.();
              }}
              className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-rose-500/50 bg-white/90 dark:bg-slate-950/85 text-rose-700 dark:text-rose-200 active:scale-95"
              title="Розібрати блок"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        )}

        {/* Upper row: Camera 7 view toggle, quick potion + drawer, weapon switcher, interact/shop */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCycleCameraView();
            }}
            title="Переключити вид камери (1-ше / 3-тя особа)"
            className="flex h-7 sm:h-10 items-center gap-0.5 sm:gap-1 rounded-full border border-sky-500/45 bg-white/90 px-1.5 sm:px-2.5 text-[9px] sm:text-[10px] font-bold text-sky-800 shadow-sm active:scale-95 dark:border-sky-400/45 dark:bg-slate-950/85 dark:text-sky-200"
          >
            <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{getCameraLabel(language, cameraViewMode, true)}</span>
          </button>

          {totalConsumables > 0 && primaryConsumable && (
            <div className="flex items-center overflow-hidden rounded-full border border-emerald-500/55 bg-white/90 shadow-sm dark:bg-slate-950/85">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUseConsumable(primaryConsumable.id);
                }}
                className="flex h-7 sm:h-10 items-center gap-0.5 sm:gap-1 bg-emerald-500/20 px-1.5 sm:px-2.5 text-[9px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-200 active:scale-95"
              >
                <FlaskConical className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="font-mono-nums">{totalConsumables}</span>
              </button>
              {ownedConsumables.length > 1 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPotionDrawerOpen((v) => !v);
                  }}
                  title="Усі зілля та еліксири"
                  className="flex h-7 sm:h-10 items-center justify-center border-l border-emerald-500/35 px-1 sm:px-1.5 text-emerald-700 dark:text-emerald-300"
                >
                  <ChevronUp
                    className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform ${potionDrawerOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              cycleWeapon();
            }}
            className="flex h-7 sm:h-10 items-center gap-1 rounded-full border border-slate-300 dark:border-white/20 bg-white/90 dark:bg-slate-950/80 px-1.5 sm:px-2.5 text-[9px] sm:text-[11px] font-semibold text-slate-900 dark:text-white active:scale-95"
          >
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full" style={{ backgroundColor: activeWeaponDef.accentHex }} />
            <span className="max-w-[48px] sm:max-w-[74px] truncate">{activeWeaponDef.name}</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onInteract();
            }}
            className={`relative flex h-8 w-8 sm:h-11 sm:w-11 flex-col items-center justify-center rounded-full border-2 text-[7px] sm:text-[9px] font-bold shadow-lg active:scale-95 ${
              nearShop
                ? 'border-amber-300 bg-amber-500 text-slate-950'
                : canInteract
                  ? 'border-emerald-300 bg-emerald-500 text-slate-950'
                  : 'border-slate-300 dark:border-white/20 bg-white/85 dark:bg-slate-900/75 text-slate-700 dark:text-slate-300'
            }`}
          >
            {nearShop ? <Store className="h-3 w-3 sm:h-4 sm:w-4" /> : <Hand className="h-3 w-3 sm:h-4 sm:w-4" />}
            <span className="leading-none">{nearShop ? s.actionShop : s.actionInteract}</span>
          </button>
        </div>

        {/* Lower thumb cluster: Shield (hold) + Jump + Attack */}
        <div className="flex items-end gap-1 sm:gap-2">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              onSetBlocking(true);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              onSetBlocking(false);
            }}
            onPointerCancel={() => onSetBlocking(false)}
            className={`flex h-8 w-8 sm:h-12 sm:w-12 flex-col items-center justify-center rounded-full border-2 text-[7px] sm:text-[10px] font-bold shadow-lg active:scale-95 ${
              blocking
                ? 'border-sky-300 bg-sky-500 text-slate-950'
                : 'border-sky-500/45 bg-white/90 text-sky-700 dark:border-sky-400/50 dark:bg-slate-900/85 dark:text-sky-200'
            }`}
          >
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{s.actionShield}</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJump();
            }}
            className="flex h-8 w-8 sm:h-12 sm:w-12 flex-col items-center justify-center rounded-full border-2 border-slate-300/80 bg-white/90 text-[7px] sm:text-[10px] font-bold text-slate-800 shadow-lg active:scale-95 active:bg-slate-200 dark:border-white/30 dark:bg-slate-900/80 dark:text-slate-100 dark:active:bg-slate-700"
          >
            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{s.actionJump}</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAttack();
            }}
            className={`relative flex h-10 w-10 sm:h-15 sm:w-15 flex-col items-center justify-center overflow-hidden rounded-full border-2 text-[8px] sm:text-xs font-extrabold text-white shadow-xl active:scale-95 ${
              activeWeapon === 'builder'
                ? 'border-emerald-300/80 bg-emerald-600/90 active:bg-emerald-500'
                : activeWeapon === 'axe'
                  ? 'border-orange-300/80 bg-orange-600/90 active:bg-orange-500'
                  : activeWeapon === 'pickaxe'
                    ? 'border-slate-300/80 bg-slate-600/90 active:bg-slate-500'
                    : 'border-rose-300/80 bg-rose-600/90 active:bg-rose-500'
            }`}
          >
            {activeWeapon === 'builder' ? (
              <>
                <Wrench className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                <span className="text-[7px] sm:text-[10px]">{s.actionBuild}</span>
              </>
            ) : activeWeapon === 'axe' ? (
              <>
                <Axe className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                <span className="text-[7px] sm:text-[10px]">{s.actionChop}</span>
              </>
            ) : activeWeapon === 'pickaxe' ? (
              <>
                <Pickaxe className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                <span className="text-[7px] sm:text-[10px]">{s.actionMine}</span>
              </>
            ) : (
              <>
                <Sword className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                <span className="text-[7px] sm:text-[10px]">{s.actionAttack}</span>
              </>
            )}
            {weaponCooldownRatio > 0.03 && (
              <span
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/55"
                style={{ height: `${weaponCooldownRatio * 100}%` }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function consumablesSignature(c: Record<ConsumableId, number>): string {
  return CONSUMABLES.map((m) => c[m.id] ?? 0).join('|');
}

export const MobileGamepad = React.memo(
  MobileGamepadInner,
  (prev, next) =>
    prev.language === next.language &&
    prev.activeWeapon === next.activeWeapon &&
    prev.gameMode === next.gameMode &&
    prev.cameraViewMode === next.cameraViewMode &&
    Math.round(prev.weaponCooldownRatio * 50) === Math.round(next.weaponCooldownRatio * 50) &&
    prev.blocking === next.blocking &&
    consumablesSignature(prev.consumables) === consumablesSignature(next.consumables) &&
    prev.upgrades === next.upgrades &&
    RELIC_SKILLS.every(
      (r) =>
        Math.ceil(prev.relicCooldowns[r.id] ?? 0) ===
        Math.ceil(next.relicCooldowns[r.id] ?? 0),
    ) &&
    prev.canInteract === next.canInteract &&
    prev.nearShop === next.nearShop &&
    prev.selectedBuildLabel === next.selectedBuildLabel &&
    prev.buildFloorLevel === next.buildFloorLevel,
);
