import React from 'react';
import {
  Backpack,
  Check,
  Coins,
  Flame,
  Hammer,
  Heart,
  ScrollText,
  Shield,
  Sparkles,
  Store,
  X,
  Zap,
} from 'lucide-react';
import {
  ConsumableId,
  CRAFT_RECIPES,
  GameHudState,
  MerchantKind,
  QUESTS,
  RELIC_SKILLS,
  RelicId,
  ResourceId,
  RESOURCES,
  SHOP_ITEMS,
} from '../game/types';

export type ModalTab = 'inventory' | 'craft' | 'shop' | 'quests';

interface InventoryCraftModalProps {
  open: boolean;
  tab: ModalTab;
  onTabChange: (tab: ModalTab) => void;
  activeMerchant: MerchantKind;
  onMerchantChange: (merchant: MerchantKind) => void;
  onClose: () => void;
  hud: GameHudState;
  onCraft: (recipeId: string) => void;
  onBuyShopItem: (itemId: string) => void;
  onUseConsumable: (id: ConsumableId) => void;
  onActivateRelic: (id: RelicId) => void;
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

const MERCHANTS: { id: MerchantKind; label: string; title: string; greet: string }[] = [
  {
    id: 'general',
    label: 'Марко (Крамниця)',
    title: 'Торговець Марко',
    greet: 'Вітаю у крамниці! Обирайте зілля, шкіру та могутні активні реліквії.',
  },
  {
    id: 'blacksmith',
    label: 'Богдан (Кузня)',
    title: 'Коваль Богдан',
    greet: 'Північна Кузня до ваших послуг: залізо, камінь, Кований Меч та Щит Егіди!',
  },
  {
    id: 'herbalist',
    label: 'Соломія (Травниця)',
    title: 'Травниця Соломія',
    greet: 'Свіжі цілющі трави, кристали есенції та подвійні еліксири прямо з лісу.',
  },
  {
    id: 'baker',
    label: 'Галина (Пекарня)',
    title: 'Пекарка Галина',
    greet: 'Свіжа мисливська юшка, медовий узвар і сухі дубові поліна прямо з пекарні Селища!',
  },
  {
    id: 'alchemist',
    label: 'Лев (Алхімік)',
    title: 'Алхімік Лев',
    greet: 'Чиста есенція, алхімічні зілля, Чоботи Мандрівника та модулі для Кристального Бластера!',
  },
];

export const InventoryCraftModal: React.FC<InventoryCraftModalProps> = ({
  open,
  tab,
  onTabChange,
  activeMerchant,
  onMerchantChange,
  onClose,
  hud,
  onCraft,
  onBuyShopItem,
  onUseConsumable,
  onActivateRelic,
}) => {
  if (!open) return null;

  const resourceNameMap = Object.fromEntries(RESOURCES.map((r) => [r.id, r])) as Record<
    ResourceId,
    (typeof RESOURCES)[number]
  >;

  const activeMerchantMeta = MERCHANTS.find((m) => m.id === activeMerchant) ?? MERCHANTS[0];
  const merchantItems = SHOP_ITEMS.filter((it) => it.merchant === activeMerchant);
  const completedQuestsCount = hud.quests.filter((q) => q.completed).length;

  return (
    <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 text-slate-100 shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onTabChange('inventory');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors ${
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
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors ${
                tab === 'craft'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Hammer className="h-4 w-4" />
              <span>Крафт (K)</span>
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onTabChange('shop');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors ${
                tab === 'shop'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Store className="h-4 w-4" />
              <span>Купці (M)</span>
            </button>
            <button
              type="button"
              onMouseDown={keepCanvasFocus}
              onClick={(e) => {
                e.currentTarget.blur();
                onTabChange('quests');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors ${
                tab === 'quests'
                  ? 'bg-purple-400 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ScrollText className="h-4 w-4" />
              <span>Квести ({completedQuestsCount}/{QUESTS.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono-nums flex items-center gap-1 rounded-lg border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
              <Coins className="h-3.5 w-3.5" />
              <span>{hud.coins}</span>
            </span>
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
        <div className="overflow-y-auto p-4 sm:p-5">
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

              {/* Active Relics Panel */}
              <div>
                <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Активні реліквії героя (клавіші Z, X, C)
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {RELIC_SKILLS.map((rel) => {
                    const owned = hud.upgrades.includes(rel.id);
                    const cd = hud.relicCooldowns[rel.id] ?? 0;
                    return (
                      <div
                        key={rel.id}
                        className={`flex flex-col justify-between rounded-xl border p-3 ${
                          owned
                            ? 'border-white/15 bg-slate-900/90'
                            : 'border-dashed border-white/10 bg-slate-900/40 opacity-75'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white" style={{ color: owned ? rel.colorHex : undefined }}>
                              {rel.name}
                            </span>
                            <span className="font-mono-nums rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                              {rel.key}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">{rel.description}</p>
                        </div>
                        <div className="mt-3">
                          {owned ? (
                            <button
                              type="button"
                              disabled={cd > 0}
                              onMouseDown={keepCanvasFocus}
                              onClick={(e) => {
                                e.currentTarget.blur();
                                onActivateRelic(rel.id);
                              }}
                              className={`font-mono-nums w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                                cd <= 0
                                  ? 'border-white/25 bg-slate-800 text-white hover:bg-slate-700'
                                  : 'cursor-not-allowed border-white/5 bg-slate-900 text-slate-500'
                              }`}
                            >
                              {cd > 0 ? `Відкат: ${Math.ceil(cd)}с` : `Застосувати (${rel.skillName})`}
                            </button>
                          ) : (
                            <span className="block text-[11px] text-amber-300/80">
                              Придбайте в Крамниці Марка
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                  Покращення та спорядження ({hud.upgrades.length}/10)
                </h3>
                {hud.upgrades.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-3 text-xs text-slate-400">
                    Поки немає покращень. Загляньте в «Крафт» або до «Купців»!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(hud.upgrades)).map((upgId) => {
                      const label =
                        CRAFT_RECIPES.find((r) => r.outputUpgrade === upgId)?.name ??
                        SHOP_ITEMS.find((s) => s.outputUpgrade === upgId)?.name ??
                        upgId;
                      return (
                        <div
                          key={upgId}
                          className="flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200"
                        >
                          <Shield className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'craft' ? (
            <div className="space-y-5">
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

              <div>
                <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Зброя, Щит Егіди та спорядження</span>
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
          ) : tab === 'shop' ? (
            <div className="space-y-4">
              {/* Merchant Selector Pills */}
              <div className="flex flex-wrap gap-1.5">
                {MERCHANTS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={keepCanvasFocus}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onMerchantChange(m.id);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      activeMerchant === m.id
                        ? 'border-amber-400/70 bg-amber-400 text-slate-950'
                        : 'border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2.5 text-xs">
                <div className="text-amber-100">
                  <strong className="font-bold text-amber-300">{activeMerchantMeta.title}:</strong>{' '}
                  {activeMerchantMeta.greet}
                </div>
                <span className="font-mono-nums font-extrabold text-amber-300">
                  Баланс: {hud.coins} мон.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {merchantItems.map((item) => {
                  const owned = Boolean(
                    item.outputUpgrade && hud.upgrades.includes(item.outputUpgrade),
                  );
                  const canBuy = !owned && hud.coins >= item.price;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-3.5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-amber-400" />
                          <span className="text-sm font-bold text-white">{item.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                      </div>
                      {owned ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-200">
                          <Check className="h-3.5 w-3.5" />
                          <span>Куплено</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canBuy}
                          onMouseDown={keepCanvasFocus}
                          onClick={(e) => {
                            e.currentTarget.blur();
                            onBuyShopItem(item.id);
                          }}
                          className={`font-mono-nums shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                            canBuy
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                              : 'cursor-not-allowed bg-slate-800 text-slate-500'
                          }`}
                        >
                          Купити · {item.price} м
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-purple-400/30 bg-purple-500/10 px-3.5 py-2.5 text-xs text-purple-100">
                Виконуйте завдання жителів долини, щоб миттєво отримувати монети, досвід і рідкісні матеріали!
              </div>
              {QUESTS.map((q) => {
                const state = hud.quests.find((s) => s.id === q.id);
                const progress = state?.progress ?? 0;
                const completed = Boolean(state?.completed);
                const pct = Math.min(100, Math.round((progress / q.targetCount) * 100));
                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border p-3.5 ${
                      completed
                        ? 'border-emerald-400/35 bg-emerald-500/10'
                        : 'border-white/10 bg-slate-900/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <ScrollText
                            className={`h-4 w-4 ${completed ? 'text-emerald-400' : 'text-purple-400'}`}
                          />
                          <span className="text-sm font-bold text-white">{q.title}</span>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                            від: {q.giver}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-300">{q.description}</p>
                      </div>
                      <span
                        className={`font-mono-nums rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          completed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {completed ? 'Виконано' : q.rewardNote}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full transition-[width] duration-200 ${
                            completed ? 'bg-emerald-400' : 'bg-purple-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono-nums text-[11px] font-semibold text-slate-300">
                        {progress}/{q.targetCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
