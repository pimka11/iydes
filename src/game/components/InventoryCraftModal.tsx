import React, { useState } from 'react';
import {
  Axe,
  Backpack,
  Check,
  Coins,
  Flame,
  FlaskConical,
  Hammer,
  Heart,
  Lock,
  Pickaxe,
  ScrollText,
  Search,
  Shield,
  Sparkles,
  Store,
  Sword,
  Target,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  CONSUMABLES,
  ConsumableId,
  CRAFT_RECIPES,
  GameHudState,
  GameMode,
  LanguageCode,
  MerchantKind,
  QUESTS,
  RELIC_SKILLS,
  RelicId,
  ResourceId,
  RESOURCES,
  SHOP_ITEMS,
  WEAPON_UNLOCK_MAP,
  WeaponId,
  WEAPONS,
} from '../types';
import { getGameModeLabel, getUiStrings } from '../i18n';

export type ModalTab = 'inventory' | 'craft' | 'shop' | 'quests';
type InventoryFilter = 'all' | 'weapons' | 'potions' | 'resources' | 'relics';
type CraftFilter = 'all' | 'weapon' | 'relic' | 'consumable' | 'building' | 'upgrade';

interface InventoryCraftModalProps {
  open: boolean;
  language?: LanguageCode;
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
  onSelectWeapon?: (id: WeaponId) => void;
  onPlaceWorkbench?: () => void;
}

const keepCanvasFocus = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};

const GAME_MODE_META: Record<GameMode, { label: string; tone: string }> = {
  survival: {
    label: 'Виживання',
    tone: 'border-amber-500/45 bg-amber-500/12 text-amber-800 dark:text-amber-300',
  },
  peaceful: {
    label: 'Мирний',
    tone: 'border-emerald-500/45 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300',
  },
  creative: {
    label: 'Творчий',
    tone: 'border-sky-500/45 bg-sky-500/12 text-sky-800 dark:text-sky-300',
  },
};

function getWeaponIcon(id: WeaponId): React.ReactNode {
  if (id === 'axe') return <Axe className="h-4 w-4" />;
  if (id === 'pickaxe') return <Pickaxe className="h-4 w-4" />;
  if (id === 'builder') return <Wrench className="h-4 w-4" />;
  const def = WEAPONS.find((w) => w.id === id);
  if (def?.category === 'heavy') return <Hammer className="h-4 w-4" />;
  if (def?.category === 'magic') return <Sparkles className="h-4 w-4" />;
  if (def?.category === 'ranged') {
    return id === 'blaster' || id === 'plasma_rifle' || id === 'laser_pistol' ? (
      <Zap className="h-4 w-4" />
    ) : (
      <Target className="h-4 w-4" />
    );
  }
  return <Sword className="h-4 w-4" />;
}

const INVENTORY_FILTERS: { id: InventoryFilter; label: string }[] = [
  { id: 'all', label: 'Усе' },
  { id: 'weapons', label: 'Зброя та інструменти' },
  { id: 'potions', label: 'Зілля та їжа' },
  { id: 'resources', label: 'Ресурси' },
  { id: 'relics', label: 'Реліквії' },
];

const CRAFT_FILTERS: { id: CraftFilter; label: string }[] = [
  { id: 'all', label: 'Усі рецепти' },
  { id: 'weapon', label: 'Зброя (25)' },
  { id: 'relic', label: 'Реліквії (6)' },
  { id: 'consumable', label: 'Зілля та їжа' },
  { id: 'building', label: 'Будівництво' },
  { id: 'upgrade', label: 'Апгрейди' },
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
    greet: 'Сильні алхімічні зілля (Лютої Сили, Блискавиці, Залізної Шкіри, Фенікса), Чоботи та модулі!',
  },
];

const InventoryCraftModalInner: React.FC<InventoryCraftModalProps> = ({
  open,
  language,
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
  onSelectWeapon,
  onPlaceWorkbench,
}) => {
  const s = getUiStrings(language);
  const [invFilter, setInvFilter] = useState<InventoryFilter>('all');
  const [craftFilter, setCraftFilter] = useState<CraftFilter>('all');
  const [potionSearch, setPotionSearch] = useState('');
  const [onlyOwnedPotions, setOnlyOwnedPotions] = useState(false);

  if (!open) return null;

  const inventoryFilters: { id: InventoryFilter; label: string }[] = [
    { id: 'all', label: s.filterAll },
    { id: 'weapons', label: s.filterWeapons },
    { id: 'potions', label: s.filterPotions },
    { id: 'resources', label: s.filterResources },
    { id: 'relics', label: s.filterRelics },
  ];
  const craftFilters: { id: CraftFilter; label: string }[] = [
    { id: 'all', label: s.filterAllRecipes },
    { id: 'weapon', label: s.filterCraftWeapons },
    { id: 'relic', label: s.filterCraftRelics },
    { id: 'consumable', label: s.filterCraftPotions },
    { id: 'building', label: s.filterCraftBuilding },
    { id: 'upgrade', label: s.filterCraftUpgrades },
  ];

  const resourceNameMap = Object.fromEntries(RESOURCES.map((r) => [r.id, r])) as Record<
    ResourceId,
    (typeof RESOURCES)[number]
  >;

  const activeMerchantMeta = MERCHANTS.find((m) => m.id === activeMerchant) ?? MERCHANTS[0];
  const merchantItems = SHOP_ITEMS.filter((it) => it.merchant === activeMerchant);
  const completedQuestsCount = hud.quests.filter((q) => q.completed).length;
  const isCreative = hud.gameMode === 'creative';
  const isSurvival = hud.gameMode === 'survival';

  const unlockedWeaponsCount = WEAPONS.filter(
    (w) => !isSurvival || hud.upgrades.includes(WEAPON_UNLOCK_MAP[w.id]),
  ).length;
  const totalConsumablesCount = CONSUMABLES.reduce(
    (acc, c) => acc + (hud.consumables[c.id] ?? 0),
    0,
  );
  const modeMeta = GAME_MODE_META[hud.gameMode];

  const activeBuffEntries = [
    { key: 'rage', label: 'Люта сила (+50% шкоди)', sec: hud.potionBuffs.rage },
    { key: 'swift', label: 'Блискавиця (+38% шв.)', sec: hud.potionBuffs.swift },
    { key: 'ironSkin', label: 'Залізна шкіра (-45% вх.)', sec: hud.potionBuffs.ironSkin },
    { key: 'regen', label: 'Фенікс (+12 HP/с)', sec: hud.potionBuffs.regen },
    { key: 'berserk', label: 'Берсерк (+шкода)', sec: hud.relicBuffTimers.berserk ?? 0 },
    { key: 'vampire', label: 'Вампіризм (відхил)', sec: hud.relicBuffTimers.vampire ?? 0 },
    { key: 'frostAura', label: 'Крижана аура (упов.)', sec: hud.relicBuffTimers.frostAura ?? 0 },
    { key: 'titanShield', label: 'Щит Титана (-вх.)', sec: hud.relicBuffTimers.titanShield ?? 0 },
  ].filter((b) => b.sec > 0.1);

  const normalizedPotionQuery = potionSearch.trim().toLowerCase();

  return (
    <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/78 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/15 bg-white/96 dark:bg-slate-950/95 text-slate-900 dark:text-slate-100 shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 px-3 py-2.5 sm:px-5 sm:py-3">
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
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Backpack className="h-4 w-4" />
              <span>{s.tabInventory}</span>
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
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Hammer className="h-4 w-4" />
              <span>{s.tabCraft}</span>
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
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Store className="h-4 w-4" />
              <span>{s.tabShop}</span>
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
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <ScrollText className="h-4 w-4" />
              <span>{s.tabQuests} ({completedQuestsCount}/{QUESTS.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${modeMeta.tone}`}>
              {getGameModeLabel(language, hud.gameMode).full}
            </span>
            <span className="font-mono-nums flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
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
              title={`${s.closeLabel} (Esc)`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-5">
          {tab === 'inventory' ? (
            <div className="space-y-4">
              {/* Hero Summary Bar */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/75 p-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Здоров’я та Витривалість
                  </span>
                  <div className="font-mono-nums mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    {hud.hp}/{hud.maxHp} <span className="text-sky-600 dark:text-sky-300">· {hud.stamina}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Рівень / Арсенал
                  </span>
                  <div className="font-mono-nums mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    Рів. {hud.level} · {unlockedWeaponsCount}/{WEAPONS.length} збр.
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Зілля та Провізія
                  </span>
                  <div className="font-mono-nums mt-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {totalConsumablesCount} шт. ({CONSUMABLES.length} видів)
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Покращення / Блоки
                  </span>
                  <div className="font-mono-nums mt-0.5 text-sm font-bold text-amber-700 dark:text-amber-300">
                    {hud.upgrades.length} апгр. · {hud.builtCount} буд.
                  </div>
                </div>
              </div>

              {/* Active Potion Buffs */}
              {activeBuffEntries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-purple-500/35 bg-purple-500/10 px-3 py-2 text-xs">
                  <span className="font-bold text-purple-800 dark:text-purple-200">Активні ефекти зіль:</span>
                  {activeBuffEntries.map((b) => (
                    <span
                      key={b.key}
                      className="font-mono-nums rounded-md bg-purple-500/20 px-2 py-0.5 font-semibold text-purple-900 dark:text-purple-100"
                    >
                      {b.label} · {Math.ceil(b.sec)}с
                    </span>
                  ))}
                </div>
              )}

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-white/10 pb-2">
                {inventoryFilters.map((f) => {
                  const active = invFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onMouseDown={keepCanvasFocus}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setInvFilter(f.id);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Weapons & Tools Section */}
              {(invFilter === 'all' || invFilter === 'weapons') && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Спорядження, зброя та інструменти
                    </h3>
                    {isSurvival && (
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        У Виживанні предмети відкриваються через Крафт (K)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {WEAPONS.map((w) => {
                      const unlocked = !isSurvival || hud.upgrades.includes(WEAPON_UNLOCK_MAP[w.id]);
                      const equipped = hud.activeWeapon === w.id && unlocked;
                      return (
                        <div
                          key={w.id}
                          className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${
                            equipped
                              ? 'border-sky-500 bg-sky-500/12 dark:bg-sky-500/15'
                              : unlocked
                                ? 'border-slate-200 dark:border-white/12 bg-slate-50 dark:bg-slate-900/80'
                                : 'border-dashed border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40 opacity-75'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                              style={{ color: unlocked ? w.accentHex : undefined }}
                            >
                              {unlocked ? getWeaponIcon(w.id) : <Lock className="h-4 w-4 text-slate-400" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                  {w.name}
                                </span>
                                {w.key && (
                                  <span className="font-mono-nums rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                                    {w.key}
                                  </span>
                                )}
                                {w.damage > 0 && (
                                  <span className="font-mono-nums rounded bg-rose-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                                    {w.damage} шк.
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {unlocked ? w.description : 'Потрібно скрафтити у вкладці Крафт'}
                              </p>
                            </div>
                          </div>
                          {unlocked ? (
                            <button
                              type="button"
                              disabled={equipped}
                              onMouseDown={keepCanvasFocus}
                              onClick={(e) => {
                                e.currentTarget.blur();
                                onSelectWeapon?.(w.id);
                              }}
                              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                                equipped
                                  ? 'bg-sky-500 text-slate-950'
                                  : 'border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {equipped ? s.btnEquipped : s.btnEquip}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onMouseDown={keepCanvasFocus}
                              onClick={(e) => {
                                e.currentTarget.blur();
                                onTabChange('craft');
                              }}
                              className="shrink-0 rounded-lg border border-amber-500/45 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/25"
                            >
                              {s.craftBtn}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Potions & Food Grid */}
              {(invFilter === 'all' || invFilter === 'potions') && (
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Зілля та їжа ({CONSUMABLES.length} видів · клавіші 8, 9, 0, -, =)
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <label className="relative flex items-center">
                        <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={potionSearch}
                          onChange={(e) => setPotionSearch(e.target.value)}
                          placeholder={s.searchPotions}
                          className="w-36 sm:w-44 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 py-1 pr-2 pl-7 text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
                        />
                      </label>
                      <button
                        type="button"
                        onMouseDown={keepCanvasFocus}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          setOnlyOwnedPotions((prev) => !prev);
                        }}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                          onlyOwnedPotions
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                            : 'border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {s.onlyOwned}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {CONSUMABLES.filter((item) => {
                      if (onlyOwnedPotions && (hud.consumables[item.id] ?? 0) <= 0) return false;
                      if (!normalizedPotionQuery) return true;
                      return (
                        item.name.toLowerCase().includes(normalizedPotionQuery) ||
                        item.effect.toLowerCase().includes(normalizedPotionQuery)
                      );
                    }).map((item) => {
                      const count = hud.consumables[item.id] ?? 0;
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 p-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                                <FlaskConical className="h-3.5 w-3.5 shrink-0" style={{ color: item.accentHex }} />
                                <span>{item.name}</span>
                              </span>
                              {item.hotkey && (
                                <span className="font-mono-nums shrink-0 rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                  {item.hotkey}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                              {item.effect}
                            </p>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 dark:border-white/8 pt-2">
                            <span className="font-mono-nums text-xs text-slate-600 dark:text-slate-300">
                              {s.btnOwned}: <strong className="text-slate-900 dark:text-white">{count}</strong>
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
                                  ? 'border-emerald-500/45 bg-emerald-500/18 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/28'
                                  : 'cursor-not-allowed border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {s.btnUse}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resources Grid */}
              {(invFilter === 'all' || invFilter === 'resources') && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Ресурси та трофеї
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {RESOURCES.map((res) => (
                      <div
                        key={res.id}
                        className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: res.colorHex }}
                            />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{res.name}</span>
                          </div>
                          <span className="font-mono-nums text-sm font-extrabold text-amber-600 dark:text-amber-300">
                            {hud.resources[res.id]}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                          {res.hint}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Relics & Upgrades */}
              {(invFilter === 'all' || invFilter === 'relics') && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Активні реліквії героя (клавіші Z, X, C, Y, O, N, , . /)
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {RELIC_SKILLS.map((rel) => {
                        const owned = hud.upgrades.includes(rel.id);
                        const cd = hud.relicCooldowns[rel.id] ?? 0;
                        return (
                          <div
                            key={rel.id}
                            className={`flex flex-col justify-between rounded-xl border p-3 ${
                              owned
                                ? 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-slate-900/90'
                                : 'border-dashed border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40 opacity-75'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span
                                  className="text-xs font-bold text-slate-900 dark:text-white"
                                  style={{ color: owned ? rel.colorHex : undefined }}
                                >
                                  {rel.name}
                                </span>
                                <span className="font-mono-nums rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
                                  {rel.key}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{rel.description}</p>
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
                                      ? 'border-slate-300 dark:border-white/25 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700'
                                      : 'cursor-not-allowed border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                                  }`}
                                >
                                  {cd > 0 ? `Відкат: ${Math.ceil(cd)}с` : `Застосувати (${rel.skillName})`}
                                </button>
                              ) : (
                                <span className="block text-[11px] text-amber-700 dark:text-amber-300/80">
                                  Придбайте в Крамниці Марка або скрафтіть [K]
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Відкриті покращення ({hud.upgrades.length})
                    </h3>
                    {hud.upgrades.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 p-3 text-xs text-slate-500 dark:text-slate-400">
                        Поки немає покращень. Загляньте в «Крафт» (K) або до «Купців» (M)!
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                        {Array.from(new Set(hud.upgrades)).map((upgId) => {
                          const label =
                            CRAFT_RECIPES.find((r) => r.outputUpgrade === upgId)?.name ??
                            SHOP_ITEMS.find((s) => s.outputUpgrade === upgId)?.name ??
                            upgId;
                          return (
                            <div
                              key={upgId}
                              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
                            >
                              <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                              <span className="truncate">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : tab === 'craft' ? (
            <div className="space-y-5">
              {/* Workbench Status & Portable Workbench Placer */}
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                  isCreative || hud.nearWorkbench
                    ? 'border-emerald-500/45 bg-emerald-500/12 text-emerald-900 dark:text-emerald-100'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100'
                }`}
              >
                <div>
                  <strong className="font-bold">
                    {isCreative
                      ? 'Творчий режим:'
                      : hud.nearWorkbench
                        ? 'Верстак поруч:'
                        : 'Верстак не поруч:'}
                  </strong>{' '}
                  {isCreative
                    ? 'усі рецепти доступні безкоштовно та без верстака!'
                    : hud.nearWorkbench
                      ? 'ковальський крафт зброї, броні та архітектурних покращень відкрито!'
                      : 'базові інструменти, зброя та зілля доступні тут; створіть Верстак для покращених рецептів.'}
                </div>
                {hud.workbenchStock > 0 && onPlaceWorkbench && (
                  <button
                    type="button"
                    onMouseDown={keepCanvasFocus}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onPlaceWorkbench();
                    }}
                    className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    Поставити Верстак поруч ({hud.workbenchStock})
                  </button>
                )}
              </div>

              {/* Craft Filter Bar */}
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-slate-900/60 p-1.5">
                {craftFilters.map((cf) => {
                  const active = craftFilter === cf.id;
                  return (
                    <button
                      key={cf.id}
                      type="button"
                      onMouseDown={keepCanvasFocus}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setCraftFilter(cf.id);
                      }}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                        active
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cf.label}
                    </button>
                  );
                })}
              </div>

              {/* 25 New Weapons Recipes */}
              {(craftFilter === 'all' || craftFilter === 'weapon') && (
                <div>
                  <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                    <Sword className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                    <span>Нова Зброя (25 видів · після крафту доступна в Арсеналі)</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {CRAFT_RECIPES.filter((r) => r.category === 'weapon').map((recipe) => {
                      const owned = Boolean(
                        recipe.outputUpgrade && hud.upgrades.includes(recipe.outputUpgrade),
                      );
                      const needsBench = Boolean(!isCreative && recipe.requiresWorkbench && !hud.nearWorkbench);
                      const hasRes =
                        isCreative ||
                        (Object.entries(recipe.cost) as [ResourceId, number][]).every(
                          ([id, amt]) => (hud.resources[id] ?? 0) >= amt,
                        );
                      const canCraft = !owned && !needsBench && hasRes;
                      const weaponDef = WEAPONS.find(
                        (w) => WEAPON_UNLOCK_MAP[w.id] === recipe.outputUpgrade,
                      );
                      return (
                        <div
                          key={recipe.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-sky-500/20 bg-slate-50 dark:bg-slate-900/80 p-3.5 sm:flex-row sm:items-center"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span style={{ color: weaponDef?.accentHex }}>
                                {weaponDef ? getWeaponIcon(weaponDef.id) : <Sword className="h-4 w-4" />}
                              </span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{recipe.name}</span>
                              {weaponDef && (
                                <span className="font-mono-nums rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                  {weaponDef.damage} шк. · {weaponDef.range}м
                                </span>
                              )}
                              {needsBench && !owned && (
                                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                                  Потрібен верстак
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{recipe.description}</p>
                            {!owned && !isCreative && (
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
                                            ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200'
                                            : 'border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300'
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
                            <button
                              type="button"
                              onMouseDown={keepCanvasFocus}
                              onClick={(e) => {
                                e.currentTarget.blur();
                                if (weaponDef) {
                                  onSelectWeapon?.(weaponDef.id);
                                  onClose();
                                }
                              }}
                              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-sky-500/45 bg-sky-500/15 px-3.5 py-2 text-xs font-bold text-sky-800 hover:bg-sky-500/25 dark:text-sky-200"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>{weaponDef && hud.activeWeapon === weaponDef.id ? s.btnEquipped : s.btnEquip}</span>
                            </button>
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
                                  ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                                  : 'cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {needsBench ? s.btnLocked : s.btnCraft}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 6 New Active Relics Recipes */}
              {(craftFilter === 'all' || craftFilter === 'relic') && (
                <div>
                  <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                    <span>Нові Активні Реліквії (6 магічних навичок)</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {CRAFT_RECIPES.filter((r) => r.category === 'relic').map((recipe) => {
                      const owned = Boolean(
                        recipe.outputUpgrade && hud.upgrades.includes(recipe.outputUpgrade),
                      );
                      const needsBench = Boolean(!isCreative && recipe.requiresWorkbench && !hud.nearWorkbench);
                      const hasRes =
                        isCreative ||
                        (Object.entries(recipe.cost) as [ResourceId, number][]).every(
                          ([id, amt]) => (hud.resources[id] ?? 0) >= amt,
                        );
                      const canCraft = !owned && !needsBench && hasRes;
                      const relMeta = RELIC_SKILLS.find((r) => r.id === recipe.outputUpgrade);
                      return (
                        <div
                          key={recipe.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-purple-500/25 bg-slate-50 dark:bg-slate-900/80 p-3.5 sm:flex-row sm:items-center"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Sparkles className="h-4 w-4" style={{ color: relMeta?.colorHex ?? '#c084fc' }} />
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{recipe.name}</span>
                              {relMeta && (
                                <span className="font-mono-nums rounded bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-200">
                                  Клавіша {relMeta.key} · {relMeta.cooldown}с
                                </span>
                              )}
                              {needsBench && !owned && (
                                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                                  Потрібен верстак
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{recipe.description}</p>
                            {!owned && !isCreative && (
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
                                            ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200'
                                            : 'border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300'
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
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                              <Check className="h-3.5 w-3.5" />
                              <span>{s.btnOwned}</span>
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
                                  ? 'bg-purple-500 text-white hover:bg-purple-400'
                                  : 'cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {needsBench ? s.btnLocked : s.btnCraft}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Building Tools & Portable Workbench Recipes */}
              {(craftFilter === 'all' || craftFilter === 'building') && (
              <div>
                <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                  <Wrench className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Верстаки та Будівництво</span>
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {CRAFT_RECIPES.filter((r) => r.category === 'building').map((recipe) => {
                    const owned = Boolean(
                      recipe.outputUpgrade && hud.upgrades.includes(recipe.outputUpgrade),
                    );
                    const needsBench = Boolean(!isCreative && recipe.requiresWorkbench && !hud.nearWorkbench);
                    const hasRes =
                      isCreative ||
                      (Object.entries(recipe.cost) as [ResourceId, number][]).every(
                        ([id, amt]) => (hud.resources[id] ?? 0) >= amt,
                      );
                    const canCraft = !owned && !needsBench && hasRes;
                    return (
                      <div
                        key={recipe.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-500/25 bg-slate-50 dark:bg-slate-900/80 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Hammer className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{recipe.name}</span>
                            {recipe.outputWorkbench && (
                              <span className="font-mono-nums rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                                У запасі: {hud.workbenchStock}
                              </span>
                            )}
                            {needsBench && !owned && (
                              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                                Потрібен верстак
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{recipe.description}</p>
                          {!owned && !isCreative && (
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
                                          ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200'
                                          : 'border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300'
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
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                            <Check className="h-3.5 w-3.5" />
                            <span>{s.btnOwned}</span>
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
                                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                                : 'cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {needsBench ? s.btnLocked : s.btnCraft}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {(craftFilter === 'all' || craftFilter === 'consumable') && (
              <div>
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                    <Heart className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>Зілля, еліксири та їжа</span>
                  </h3>
                  <label className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={potionSearch}
                      onChange={(e) => setPotionSearch(e.target.value)}
                      placeholder="Пошук рецепта..."
                      className="w-40 sm:w-48 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 py-1 pr-2 pl-7 text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {CRAFT_RECIPES.filter((r) => {
                    if (r.category !== 'consumable') return false;
                    if (!normalizedPotionQuery) return true;
                    return (
                      r.name.toLowerCase().includes(normalizedPotionQuery) ||
                      r.description.toLowerCase().includes(normalizedPotionQuery)
                    );
                  }).map((recipe) => {
                    const needsBench = Boolean(!isCreative && recipe.requiresWorkbench && !hud.nearWorkbench);
                    const hasRes =
                      isCreative ||
                      (Object.entries(recipe.cost) as [ResourceId, number][]).every(
                        ([id, amt]) => (hud.resources[id] ?? 0) >= amt,
                      );
                    const canCraft = !needsBench && hasRes;
                    return (
                      <div
                        key={recipe.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Flame className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{recipe.name}</span>
                            {needsBench && (
                              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                                Потрібен верстак
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{recipe.description}</p>
                          {!isCreative && (
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
                                          ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200'
                                          : 'border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300'
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
                              : 'cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {needsBench ? s.btnLocked : s.btnCraft}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {(craftFilter === 'all' || craftFilter === 'upgrade') && (
              <div>
                <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Зброя, Інструменти, Щит Егіди та Броня</span>
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {CRAFT_RECIPES.filter((r) => r.category === 'upgrade').map((recipe) => {
                    const owned = Boolean(
                      recipe.outputUpgrade && hud.upgrades.includes(recipe.outputUpgrade),
                    );
                    const needsBench = Boolean(!isCreative && recipe.requiresWorkbench && !hud.nearWorkbench);
                    const hasRes =
                      isCreative ||
                      (Object.entries(recipe.cost) as [ResourceId, number][]).every(
                        ([id, amt]) => (hud.resources[id] ?? 0) >= amt,
                      );
                    const canCraft = !owned && !needsBench && hasRes;
                    return (
                      <div
                        key={recipe.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Zap className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{recipe.name}</span>
                            {needsBench && !owned && (
                              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                                Потрібен верстак
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{recipe.description}</p>
                          {!owned && !isCreative && (
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
                                          ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200'
                                          : 'border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300'
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
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                            <Check className="h-3.5 w-3.5" />
                            <span>{s.btnOwned}</span>
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
                                : 'cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {needsBench ? s.btnLocked : s.btnCraft}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          ) : tab === 'shop' ? (
            <div className="space-y-4">
              {/* Merchant Selector Tabs */}
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
                        ? 'border-amber-500 bg-amber-400 text-slate-950'
                        : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-amber-500/12 px-3.5 py-2.5 text-xs">
                <div className="text-amber-950 dark:text-amber-100">
                  <strong className="font-bold text-amber-800 dark:text-amber-300">{activeMerchantMeta.title}:</strong>{' '}
                  {activeMerchantMeta.greet}
                </div>
                <span className="font-mono-nums font-extrabold text-amber-700 dark:text-amber-300">
                  {isCreative ? s.freeCreative : `${hud.coins} ${s.coinsShort}`}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {merchantItems.map((item) => {
                  const owned = Boolean(
                    item.outputUpgrade && hud.upgrades.includes(item.outputUpgrade),
                  );
                  const canBuy = !owned && (isCreative || hud.coins >= item.price);
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 p-3.5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                      </div>
                      {owned ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          <Check className="h-3.5 w-3.5" />
                          <span>{s.btnOwned}</span>
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
                              : 'cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {isCreative ? s.freeCreative : `${s.btnBuy} · ${item.price} ${s.coinsShort}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/12 px-3.5 py-3 text-xs text-amber-950 dark:text-amber-100">
                <div className="flex items-center justify-between gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <span>Головна Мета Проходження</span>
                  <span className="font-mono-nums">
                    {completedQuestsCount}/{QUESTS.length} етапів
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900/90">
                  <div
                    className="h-full bg-amber-500 dark:bg-amber-400 transition-[width] duration-300"
                    style={{ width: `${Math.round((completedQuestsCount / QUESTS.length) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-700 dark:text-slate-200">
                  {hud.victoryAchieved
                    ? 'Кампанію пройдено! Долина Блоків врятована — ви можете вільно досліджувати світ та нові хвилі.'
                    : 'Виконайте всі 7 завдань долини (від збору ресурсів і полювання на звірів до перемоги над Тіньовим Лицарем у Руїнах та Фінальним Босом Малакором у Цитаделі), щоб пройти гру!'}
                </p>
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
                        ? 'border-emerald-500/40 bg-emerald-500/12'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <ScrollText
                            className={`h-4 w-4 ${completed ? 'text-emerald-500 dark:text-emerald-400' : 'text-purple-500 dark:text-purple-400'}`}
                          />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{q.title}</span>
                          <span className="rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                            від: {q.giver}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{q.description}</p>
                      </div>
                      <span
                        className={`font-mono-nums rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          completed
                            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-500/18 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {completed ? 'Виконано' : q.rewardNote}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full transition-[width] duration-200 ${
                            completed ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-purple-500 dark:bg-purple-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono-nums text-[11px] font-semibold text-slate-600 dark:text-slate-300">
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

export const InventoryCraftModal = React.memo(InventoryCraftModalInner, (prev, next) => {
  if (!prev.open && !next.open) return true;
  return (
    prev.open === next.open &&
    prev.language === next.language &&
    prev.tab === next.tab &&
    prev.activeMerchant === next.activeMerchant &&
    prev.hud === next.hud
  );
});
