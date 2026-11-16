import React from 'react';
import { Backpack, Check, Flame, Hammer, Heart, Shield, Sparkles, X, Zap } from 'lucide-react';
import {
  ConsumableId,
  CRAFT_RECIPES,
  GameHudState,
  ResourceId,
  RESOURCES,
} from '../game/types';

interface InventoryCraftModalProps {
  open: boolean;
  tab: 'inventory' | 'craft';
  onTabChange: (tab: 'inventory' | 'craft') => void;
  onClose: () => void;
  hud: GameHudState;
  onCraft: (recipeId: string) => void;
  onUseConsumable: (id: ConsumableId) => void;
}

const keepCanvasFocus = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};

const CONSUMABLE_META: {
  id: ConsumableId;
  key: string;
  name: string;
  effect: string;
  colorClass: string;
}[] = [
  {
    id: 'potion',
    key: '5',
    name: 'Зілля лікування',
    effect: '+50 HP миттєво',
    colorClass: 'text-emerald-300 border-emerald-500/35 bg-emerald-500/15',
  },
  {
    id: 'tonic',
    key: '6',
    name: 'Трав’яний тонік',
    effect: '+70 витривалості, +15 HP',
    colorClass: 'text-sky-300 border-sky-500/35 bg-sky-500/15',
  },
  {
    id: 'stew',
    key: '7',
    name: 'Мисливська юшка',
    effect: '+85 HP і повна витривалість',
    colorClass: 'text-amber-300 border-amber-500/35 bg-amber-500/15',
  },
];

export const InventoryCraftModal: React.FC<InventoryCraftModalProps> = ({
  open,
  tab,
  onTabChange,
  onClose,
  hud,
  onCraft,
  onUseConsumable,
}) => {
  if (!open) return null;

  const resourceNameMap = Object.fromEntries(RESOURCES.map((r) => [r.id, r])) as Record<
    ResourceId,
    (typeof RESOURCES)[number]
  >;

  return (
    <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 text-slate-100 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onTabChange('inventory');
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                tab === 'inventory'
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Backpack className="h-4 w-4" />
              <span>Інвентар (I)</span>
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onTabChange('craft');
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                tab === 'craft'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Hammer className="h-4 w-4" />
              <span>Крафт (K)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {hud.nearWorkbench && (
              <span className="hidden rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 sm:inline">
                Біля верстака хатинки
              </span>
            )}
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onClose();
              }}
              title="Закрити (Esc)"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5">
          {tab === 'inventory' ? (
            <div className="space-y-5">
              {/* Resources Grid */}
              <div>
                <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Ресурси та трофеї
                </h3>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {RESOURCES.map((res) => (
                    <div
                      key={res.id}
                      className="rounded-xl border border-white/10 bg-slate-900/80 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: res.colorHex }}
                          />
                          <span className="text-xs font-bold text-white">{res.name}</span>
                        </div>
                        <span className="font-mono-nums text-sm font-extrabold text-amber-300">
                          {hud.resources[res.id]}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{res.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consumables */}
              <div>
                <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Припаси швидкого доступу (клавіші 5–7)
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {CONSUMABLE_META.map((item) => {
                    const count = hud.consumables[item.id];
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900/80 p-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            <span className="font-mono-nums rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                              {item.key}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">{item.effect}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono-nums text-xs text-slate-300">
                            Кількість: <strong className="text-white">{count}</strong>
                          </span>
                          <button
                            type="button"
                            disabled={count <= 0}
                            onMouseDown={keepCanvasFocus}
                            onClick={(e) => {
                              e.currentTarget.blur();
                              onUseConsumable(item.id);
                            }}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                              count > 0
                                ? `${item.colorClass} hover:brightness-110`
                                : 'cursor-not-allowed border-white/5 bg-slate-800/50 text-slate-500'
                            }`}
                          >
                            Випити
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Unlocked Upgrades Summary */}
              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Покращення героя ({hud.upgrades.length}/6)
                </h3>
                {hud.upgrades.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-3 text-xs text-slate-400">
                    Поки немає покращень. Відкрийте вкладку «Крафт» або зайдіть до верстака в хатинці!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {CRAFT_RECIPES.filter(
                      (r) => r.outputUpgrade && hud.upgrades.includes(r.outputUpgrade),
                    ).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200"
                      >
                        <Shield className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{u.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Consumable Recipes */}
              <div>
                <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <Heart className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Зілля та їжа</span>
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {CRAFT_RECIPES.filter((r) => r.category === 'consumable').map((recipe) => {
                    const canCraft = (Object.entries(recipe.cost) as [ResourceId, number][]).every(
                      ([id, amt]) => (hud.resources[id] ?? 0) >= amt,
                    );
                    return (
                      <div
                        key={recipe.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Flame className="h-4 w-4 text-amber-400" />
                            <span className="text-sm font-bold text-white">{recipe.name}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{recipe.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(Object.entries(recipe.cost) as [ResourceId, number][]).map(
                              ([resId, need]) => {
                                const have = hud.resources[resId] ?? 0;
                                const ok = have >= need;
                                return (
                                  <span
                                    key={resId}
                                    className={`font-mono-nums rounded-lg border px-2 py-0.5 text-[11px] ${
                                      ok
                                        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                                        : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                    }`}
                                  >
                                    {resourceNameMap[resId].name}: {have}/{need}
                                  </span>
                                );
                              },
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!canCraft}
                          onMouseDown={keepCanvasFocus}
                          onClick={(e) => {
                            e.currentTarget.blur();
                            onCraft(recipe.id);
                          }}
                          className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                            canCraft
                              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                              : 'cursor-not-allowed bg-slate-800 text-slate-500'
                          }`}
                        >
                          Створити
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Equipment & Weapon Upgrades */}
              <div>
                <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Покращення зброї та спорядження</span>
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {CRAFT_RECIPES.filter((r) => r.category === 'upgrade').map((recipe) => {
                    const owned = Boolean(
                      recipe.outputUpgrade && hud.upgrades.includes(recipe.outputUpgrade),
                    );
                    const canCraft =
                      !owned &&
                      (Object.entries(recipe.cost) as [ResourceId, number][]).every(
                        ([id, amt]) => (hud.resources[id] ?? 0) >= amt,
                      );
                    return (
                      <div
                        key={recipe.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-sky-400" />
                            <span className="text-sm font-bold text-white">{recipe.name}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{recipe.description}</p>
                          {!owned && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(Object.entries(recipe.cost) as [ResourceId, number][]).map(
                                ([resId, need]) => {
                                  const have = hud.resources[resId] ?? 0;
                                  const ok = have >= need;
                                  return (
                                    <span
                                      key={resId}
                                      className={`font-mono-nums rounded-lg border px-2 py-0.5 text-[11px] ${
                                        ok
                                          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                                          : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                      }`}
                                    >
                                      {resourceNameMap[resId].name}: {have}/{need}
                                    </span>
                                  );
                                },
                              )}
                            </div>
                          )}
                        </div>
                        {owned ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-200">
                            <Check className="h-3.5 w-3.5" />
                            <span>Створено</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canCraft}
                            onMouseDown={keepCanvasFocus}
                            onClick={(e) => {
                              e.currentTarget.blur();
                              onCraft(recipe.id);
                            }}
                            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                              canCraft
                                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                : 'cursor-not-allowed bg-slate-800 text-slate-500'
                            }`}
                          >
                            Скувати
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
