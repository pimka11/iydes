/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './game/components/GameHud';
import { GraphicsSettingsModal } from './game/components/GraphicsSettingsModal';
import { InventoryCraftModal, ModalTab } from './game/components/InventoryCraftModal';
import { OfflineIndicator } from './game/components/OfflineIndicator';
import { PhpMyAdminModal } from './game/components/PhpMyAdminModal';
import { soundEngine } from './game/audio';
import { CLIENT_APP_VERSION } from './version';
import {
  hydratePreferencesFromSql,
  loadLocalGraphicsSettings,
  loadLocalTheme,
  loadSavedGameFromSql,
  saveAppPreferences,
} from './game/save';
import {
  BuildPieceKind,
  ConsumableId,
  createDefaultConsumables,
  GameHudState,
  GameMode,
  GraphicsSettings,
  MerchantKind,
  MobKind,
  QUESTS,
  RelicId,
  SEASON_DURATION_SEC,
  ShadowQualitySetting,
  ThemeMode,
  WeaponId,
} from './game/types';
import { CAVE_SITES } from './game/terrain';
import { BlocklandWorld } from './game/world';

const INITIAL_HUD: GameHudState = {
  phase: 'playing',
  gameMode: 'survival',
  cameraViewMode: 'third',
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  xp: 0,
  xpToNext: 100,
  level: 1,
  coins: 25,
  kills: 0,
  wave: 1,
  activeMobs: 0,
  peacefulMobs: 0,
  activeWeapon: 'sword',
  weaponCooldownRatio: 0,
  blocking: false,
  parryActive: false,
  relicCooldowns: {
    amulet_vitality: 0,
    cloak_wind: 0,
    rune_power: 0,
    frost_crown: 0,
    thunder_totem: 0,
    vampire_fang: 0,
    titan_aegis: 0,
    phoenix_feather: 0,
    void_step: 0,
  },
  relicBuffTimers: {
    wind: 0,
    berserk: 0,
    frostAura: 0,
    vampire: 0,
    titanShield: 0,
    phoenixRegen: 0,
  },
  season: 'summer',
  seasonRemainingSec: SEASON_DURATION_SEC,
  weather: 'clear',
  zoneName: 'Сонячна Галявина',
  biomeId: 'meadow',
  insideCabin: false,
  insideCave: false,
  nearCampfire: false,
  nearChest: false,
  nearBed: false,
  nearWorkbench: false,
  nearShop: false,
  nearAdminPainting: false,
  nearToolStand: false,
  nearSpawnThrone: false,
  activeMerchantKind: 'general',
  nearNpcLabel: null,
  nearResourceLabel: null,
  nearVillager: false,
  inWater: false,
  pointerLocked: false,
  autoFollowCam: false,
  dofEnabled: false,
  shadowUpscale: false,
  ecoMode: true,
  muted: false,
  fps: 60,
  frameMs: 16,
  pingMs: null,
  playerX: -2,
  playerZ: 9,
  playerYaw: Math.PI * 0.92,
  villageX: -165,
  villageZ: 240,
  trampledCount: 0,
  trailCells: [],
  lastSavedAt: null,
  minimapEntities: [],
  quests: QUESTS.map((q) => ({ id: q.id, progress: 0, completed: false })),
  resources: {
    wood: 2,
    stone: 1,
    iron: 0,
    herb: 2,
    essence: 0,
    hide: 0,
    raw_meat: 0,
  },
  consumables: {
    ...createDefaultConsumables(),
    potion: 1,
  },
  upgrades: [],
  potionBuffs: {
    rage: 0,
    swift: 0,
    ironSkin: 0,
    regen: 0,
  },
  killFeed: [],
  playTimeSec: 0,
  victoryAchieved: false,
  secretBossUnlocked: false,
  visitedCavesCount: 0,
  totalCavesCount: CAVE_SITES.length,
  activeGoal: null,
  workbenchStock: 0,
  selectedBuildPiece: 'floor',
  buildRotDeg: 0,
  buildFloorLevel: 0,
  nearTreeLabel: null,
  nearTreeHpRatio: null,
  nearMineTargetLabel: null,
  nearMineHpRatio: null,
  canBuildHere: false,
  builtCount: 0,
  onlineConnected: false,
  onlinePlayerId: null,
  playerName: '',
  onlinePlayers: [],
  onlineChat: [],
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<BlocklandWorld | null>(null);
  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);
  const [contextLost, setContextLost] = useState(false);
  const [inventoryTab, setInventoryTab] = useState<ModalTab | null>(null);
  const [activeMerchant, setActiveMerchant] = useState<MerchantKind>('general');
  const [helpOpen, setHelpOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => loadLocalTheme());
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>(() =>
    loadLocalGraphicsSettings(),
  );
  const [graphicsOpen, setGraphicsOpen] = useState(false);
  const [sqlAdminOpen, setSqlAdminOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);

  const themeRef = useRef(theme);
  const graphicsRef = useRef(graphicsSettings);
  themeRef.current = theme;
  graphicsRef.current = graphicsSettings;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    worldRef.current?.setModalOpen(
      inventoryTab !== null ||
        helpOpen ||
        installModalOpen ||
        graphicsOpen ||
        sqlAdminOpen ||
        onlineOpen,
    );
  }, [inventoryTab, helpOpen, installModalOpen, graphicsOpen, sqlAdminOpen, onlineOpen]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    let worldInstance: BlocklandWorld | null = null;

    const handleGlobalKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) {
        if (e.code === 'Escape') {
          setSqlAdminOpen(false);
          setGraphicsOpen(false);
          setOnlineOpen(false);
        }
        return;
      }

      if (e.code === 'KeyI') {
        soundEngine.unlock();
        setInventoryTab((prev) => {
          const next = prev === 'inventory' ? null : 'inventory';
          soundEngine.playInventoryToggle(next !== null);
          return next;
        });
      } else if (e.code === 'KeyK') {
        soundEngine.unlock();
        setInventoryTab((prev) => {
          const next = prev === 'craft' ? null : 'craft';
          soundEngine.playInventoryToggle(next !== null);
          return next;
        });
      } else if (e.code === 'KeyM') {
        soundEngine.unlock();
        setInventoryTab((prev) => {
          const next = prev === 'shop' ? null : 'shop';
          soundEngine.playInventoryToggle(next !== null);
          return next;
        });
      } else if (e.code === 'KeyJ') {
        soundEngine.unlock();
        setInventoryTab((prev) => {
          const next = prev === 'quests' ? null : 'quests';
          soundEngine.playInventoryToggle(next !== null);
          return next;
        });
      } else if (e.code === 'Escape') {
        setInventoryTab((prev) => {
          if (prev !== null) soundEngine.playInventoryToggle(false);
          return null;
        });
        setGraphicsOpen(false);
        setSqlAdminOpen(false);
        setOnlineOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);

    void (async () => {
      let serverSeed: number | undefined;
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 1400);
        const res = await fetch(`/api/online?_=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        window.clearTimeout(timer);
        if (res.ok) {
          const json = (await res.json()) as { worldSeed?: number; version?: string };
          if (
            typeof json.version === 'string' &&
            json.version &&
            json.version !== CLIENT_APP_VERSION
          ) {
            const guardKey = `dolina_ver_reload_${json.version}`;
            if (!sessionStorage.getItem(guardKey)) {
              sessionStorage.setItem(guardKey, '1');
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
              const nextUrl = new URL(window.location.href);
              nextUrl.searchParams.set('v', json.version);
              nextUrl.searchParams.set('_', String(Date.now()));
              window.location.replace(nextUrl.toString());
              return;
            }
          }
          if (typeof json.worldSeed === 'number' && Number.isFinite(json.worldSeed)) {
            serverSeed = json.worldSeed;
          }
        }
      } catch {
        // Offline fallback uses local/default seed
      }
      if (cancelled) return;

      const [prefs, sqlSave] = await Promise.all([
        hydratePreferencesFromSql(),
        loadSavedGameFromSql(),
      ]);
      if (cancelled) return;

      setTheme(prefs.theme);
      setGraphicsSettings(prefs.graphics);

      const world = new BlocklandWorld(
        container,
        (nextState) => setHud(nextState),
        () => setContextLost(true),
        () => {
          soundEngine.unlock();
          soundEngine.playInventoryToggle(true);
          setInventoryTab('craft');
        },
        (merchant: MerchantKind) => {
          soundEngine.unlock();
          soundEngine.playInventoryToggle(true);
          setActiveMerchant(merchant);
          setInventoryTab('shop');
        },
        serverSeed ?? sqlSave?.worldSeed,
      );
      worldInstance = world;
      worldRef.current = world;
      if (sqlSave) {
        world.applyLoadedSaveData(sqlSave);
      }
      world.applyGraphicsSettings(prefs.graphics);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', handleGlobalKey);
      worldInstance?.dispose();
      worldRef.current = null;
    };
  }, []);

  const handleChangeTheme = useCallback((nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    saveAppPreferences(nextTheme, graphicsRef.current);
  }, []);

  const handleToggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = themeRef.current === 'dark' ? 'light' : 'dark';
    handleChangeTheme(nextTheme);
  }, [handleChangeTheme]);

  const handleChangeGraphics = useCallback((nextGfx: GraphicsSettings) => {
    setGraphicsSettings(nextGfx);
    worldRef.current?.applyGraphicsSettings(nextGfx);
    saveAppPreferences(themeRef.current, nextGfx);
  }, []);

  const handleDatabaseMutated = useCallback(() => {
    void (async () => {
      const [prefs, sqlSave] = await Promise.all([
        hydratePreferencesFromSql(),
        loadSavedGameFromSql(),
      ]);
      setTheme(prefs.theme);
      setGraphicsSettings(prefs.graphics);
      if (sqlSave && worldRef.current) {
        worldRef.current.applyLoadedSaveData(sqlSave);
      }
      worldRef.current?.applyGraphicsSettings(prefs.graphics);
    })();
  }, []);

  const toggleOrOpenTab = useCallback((tab: ModalTab, merchant?: MerchantKind) => {
    soundEngine.unlock();
    if (merchant) {
      setActiveMerchant(merchant);
    }
    setInventoryTab((prev) => {
      const next = prev === tab && !merchant ? null : tab;
      soundEngine.playInventoryToggle(next !== null);
      return next;
    });
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {contextLost && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/90 p-6 text-center">
          <div className="max-w-sm rounded-2xl border border-slate-300 bg-white p-6 dark:border-white/15 dark:bg-slate-900">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Втрачено контекст WebGL
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Перезавантажте сторінку, щоб відновити 3D-рендеринг сцени.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950"
            >
              Перезавантажити
            </button>
          </div>
        </div>
      )}

      <GameHud
        hud={hud}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenGraphics={() => setGraphicsOpen(true)}
        onOpenSqlAdmin={() => setSqlAdminOpen(true)}
        onChangeGameMode={(mode: GameMode) => worldRef.current?.setGameMode(mode)}
        onCycleCameraView={() => worldRef.current?.cycleCameraView()}
        inventoryTab={inventoryTab}
        onOpenInventory={toggleOrOpenTab}
        onHelpOpenChange={setHelpOpen}
        onInstallModalChange={setInstallModalOpen}
        onUseConsumable={(id: ConsumableId) => worldRef.current?.useConsumable(id)}
        onActivateRelic={(id: RelicId) => worldRef.current?.activateRelic(id)}
        onSetBlocking={(active: boolean) => worldRef.current?.setBlocking(active)}
        onCycleSeason={() => worldRef.current?.cycleSeason()}
        onCycleWeather={() => worldRef.current?.cycleWeather()}
        onStart={() => worldRef.current?.startGame()}
        onRespawn={() => worldRef.current?.respawnPlayer()}
        onSelectWeapon={(id: WeaponId) => worldRef.current?.setWeapon(id)}
        onSpawnMob={(kind: MobKind) => worldRef.current?.spawnMobNearPlayer(kind)}
        onToggleMute={() => worldRef.current?.toggleMute()}
        onToggleCameraMode={() => worldRef.current?.toggleCameraMode()}
        onToggleDof={() => {
          const next = { ...graphicsRef.current, dofEnabled: !graphicsRef.current.dofEnabled };
          handleChangeGraphics(next);
        }}
        onToggleShadowUpscale={() => {
          const nextQuality: ShadowQualitySetting =
            graphicsRef.current.shadowQuality === '4k' ? '2k' : '4k';
          const next: GraphicsSettings = { ...graphicsRef.current, shadowQuality: nextQuality };
          handleChangeGraphics(next);
        }}
        onToggleEcoMode={() => {
          const next = { ...graphicsRef.current, ecoMode: !graphicsRef.current.ecoMode };
          handleChangeGraphics(next);
        }}
        onTeleportCabin={() => worldRef.current?.teleportToCabin()}
        onTeleportRiver={() => worldRef.current?.teleportToRiver()}
        onInteract={() => worldRef.current?.interactNearby()}
        onPressSpawnThrone={() => worldRef.current?.pressSpawnThroneButton()}
        onAttack={() => worldRef.current?.triggerAttack()}
        onJump={() => worldRef.current?.jump()}
        onTouchMove={(x, z, sprint) => worldRef.current?.setTouchMove(x, z, sprint)}
        onSaveGame={() => worldRef.current?.saveGameNow(false)}
        onNewGame={() => worldRef.current?.resetNewGame()}
        onContinueFreePlay={() => worldRef.current?.continueFreePlay()}
        onSetBuildPiece={(kind: BuildPieceKind) => worldRef.current?.setBuildPiece(kind)}
        onCycleBuildPiece={() => worldRef.current?.cycleBuildPiece()}
        onRotateBuild={() => worldRef.current?.rotateBuildPiece()}
        onCycleBuildFloor={(delta?: number) => worldRef.current?.cycleBuildFloor(delta)}
        onSetBuildFloor={(level: number) => worldRef.current?.setBuildFloor(level)}
        onDemolishBuild={() => worldRef.current?.demolishNearbyBuild()}
        onPlaceWorkbench={() => worldRef.current?.placeWorkbenchFromStock()}
        onlineOpen={onlineOpen}
        onOnlineOpenChange={setOnlineOpen}
        onChangePlayerName={(name: string) => worldRef.current?.setPlayerName(name)}
        onSendChat={(text: string) => worldRef.current?.sendChatMessage(text)}
        onTeleportToPlayer={(id: string) => worldRef.current?.teleportToOnlinePlayer(id)}
      />

      <InventoryCraftModal
        open={inventoryTab !== null}
        tab={inventoryTab ?? 'inventory'}
        onTabChange={(t) => setInventoryTab(t)}
        activeMerchant={activeMerchant}
        onMerchantChange={setActiveMerchant}
        onClose={() => setInventoryTab(null)}
        hud={hud}
        onCraft={(recipeId) => worldRef.current?.craftRecipe(recipeId)}
        onBuyShopItem={(itemId) => worldRef.current?.buyShopItem(itemId)}
        onUseConsumable={(id) => worldRef.current?.useConsumable(id)}
        onActivateRelic={(id) => worldRef.current?.activateRelic(id)}
        onSelectWeapon={(id: WeaponId) => worldRef.current?.setWeapon(id)}
        onPlaceWorkbench={() => {
          const ok = worldRef.current?.placeWorkbenchFromStock();
          if (ok) setInventoryTab(null);
        }}
      />

      <GraphicsSettingsModal
        open={graphicsOpen}
        theme={theme}
        settings={graphicsSettings}
        onChangeTheme={handleChangeTheme}
        onChangeSettings={handleChangeGraphics}
        onClose={() => setGraphicsOpen(false)}
      />

      <PhpMyAdminModal
        open={sqlAdminOpen}
        onClose={() => setSqlAdminOpen(false)}
        onDatabaseMutated={handleDatabaseMutated}
      />

      <OfflineIndicator />
    </main>
  );
}
