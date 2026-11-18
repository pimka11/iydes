import React, { useRef, useState } from 'react';
import { Sword, FlaskConical, ArrowUp, Hand, Store, Shield } from 'lucide-react';
import { RELIC_SKILLS, RelicId, UpgradeId, WeaponId, WEAPONS } from '../game/types';

interface MobileGamepadProps {
  activeWeapon: WeaponId;
  weaponCooldownRatio: number;
  blocking: boolean;
  potions: number;
  upgrades: UpgradeId[];
  relicCooldowns: Record<RelicId, number>;
  canInteract: boolean;
  nearShop: boolean;
  onTouchMove: (x: number, z: number, sprint?: boolean) => void;
  onAttack: () => void;
  onSetBlocking: (active: boolean) => void;
  onActivateRelic: (id: RelicId) => void;
  onJump: () => void;
  onInteract: () => void;
  onSelectWeapon: (id: WeaponId) => void;
  onUsePotion: () => void;
}

const MAX_STICK_RADIUS = 38;

export const MobileGamepad: React.FC<MobileGamepadProps> = ({
  activeWeapon,
  weaponCooldownRatio,
  blocking,
  potions,
  upgrades,
  relicCooldowns,
  canInteract,
  nearShop,
  onTouchMove,
  onAttack,
  onSetBlocking,
  onActivateRelic,
  onJump,
  onInteract,
  onSelectWeapon,
  onUsePotion,
}) => {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, sprinting: false });

  const updateStick = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_STICK_RADIUS) {
      const s = MAX_STICK_RADIUS / dist;
      dx *= s;
      dy *= s;
    }
    const normX = dx / MAX_STICK_RADIUS;
    const normZ = dy / MAX_STICK_RADIUS;
    const mag = Math.min(1, dist / MAX_STICK_RADIUS);
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
    const idx = WEAPONS.findIndex((w) => w.id === activeWeapon);
    const next = WEAPONS[(idx + 1) % WEAPONS.length];
    onSelectWeapon(next.id);
  };

  const activeWeaponDef = WEAPONS.find((w) => w.id === activeWeapon) ?? WEAPONS[0];
  const ownedRelics = RELIC_SKILLS.filter((r) => upgrades.includes(r.id));

  return (
    <div className="pointer-events-none flex w-full items-end justify-between gap-2 px-0.5 pb-[max(0.25rem,env(safe-area-inset-bottom))] select-none">
      {/* Left: Smooth Analog Virtual Joystick */}
      <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-1 touch-none">
        {knob.sprinting && (
          <span className="rounded-full bg-sky-500/85 px-2 py-0.5 text-[10px] font-bold text-slate-950">
            БІГ
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
          className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/25 bg-slate-950/60 shadow-lg"
        >
          <div className="h-14 w-14 rounded-full border border-white/10" />
          <div
            style={{
              transform: `translate(${knob.x}px, ${knob.y}px)`,
            }}
            className={`absolute h-11 w-11 rounded-full border-2 shadow-md transition-colors ${
              knob.sprinting
                ? 'border-sky-300 bg-sky-400/85'
                : 'border-white/50 bg-slate-200/85'
            }`}
          />
        </div>
      </div>

      {/* Right: Compact Ergonomic Thumb Cluster with Shield & Owned Relics */}
      <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5 touch-none">
        {/* Owned Active Relics Row */}
        {ownedRelics.length > 0 && (
          <div className="flex items-center gap-1.5">
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
                  className={`font-mono-nums flex h-11 min-w-11 items-center justify-center rounded-full border px-2 text-[10px] font-bold shadow-md active:scale-95 ${
                    cd <= 0
                      ? 'bg-slate-950/85 text-white'
                      : 'border-white/15 bg-slate-950/75 text-slate-400'
                  }`}
                >
                  {cd > 0 ? `${Math.ceil(cd)}с` : rel.key}
                </button>
              );
            })}
          </div>
        )}

        {/* Upper row: quick potion, weapon switcher, interact / shop */}
        <div className="flex items-center gap-1.5">
          {potions > 0 && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUsePotion();
              }}
              className="flex h-11 items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/25 px-3 text-[11px] font-bold text-emerald-200 active:scale-95"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>{potions}</span>
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              cycleWeapon();
            }}
            className="flex h-11 items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/80 px-3 text-[11px] font-semibold text-white active:scale-95"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeWeaponDef.accentHex }} />
            <span>{activeWeaponDef.name}</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onInteract();
            }}
            className={`relative flex h-11 w-11 flex-col items-center justify-center rounded-full border-2 text-[9px] font-bold shadow-lg active:scale-95 ${
              nearShop
                ? 'border-amber-300 bg-amber-500 text-slate-950'
                : canInteract
                  ? 'border-emerald-300 bg-emerald-500 text-slate-950'
                  : 'border-white/20 bg-slate-900/75 text-slate-300'
            }`}
          >
            {nearShop ? <Store className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
            <span className="leading-none">{nearShop ? 'Крамн' : 'Дія'}</span>
          </button>
        </div>

        {/* Lower thumb cluster: Shield (hold) + Jump + Attack */}
        <div className="flex items-end gap-2">
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
            className={`flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg active:scale-95 ${
              blocking
                ? 'border-sky-300 bg-sky-500 text-slate-950'
                : 'border-sky-400/50 bg-slate-900/85 text-sky-200'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Щит</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJump();
            }}
            className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 border-white/30 bg-slate-900/80 text-[10px] font-bold text-slate-100 shadow-lg active:scale-95 active:bg-slate-700"
          >
            <ArrowUp className="h-4 w-4" />
            <span>Стриб</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAttack();
            }}
            className="relative flex h-15 w-15 flex-col items-center justify-center overflow-hidden rounded-full border-2 border-rose-300/80 bg-rose-600/90 text-xs font-extrabold text-white shadow-xl active:scale-95 active:bg-rose-500"
          >
            <Sword className="h-5 w-5" />
            <span className="text-[10px]">Удар</span>
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
