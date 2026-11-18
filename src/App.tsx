/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { InventoryCraftModal, ModalTab } from './components/InventoryCraftModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { soundEngine } from './game/audio';
import {
  ConsumableId,
  GameHudState,
  MerchantKind,
  MobKind,
  QUESTS,
  RelicId,
  SEASON_DURATION_SEC,
  WeaponId,
} from './game/types';
import { BlocklandWorld } from './game/world';

const INITIAL_HUD: GameHudState = {
  phase: 'playing',
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
  },
  relicBuffTimers: {
    wind: 0,
    berserk: 0,
  },
  season: 'summer',
  seasonRemainingSec: SEASON_DURATION_SEC,
  weather: 'clear',
  zoneName: 'Сонячна Галявина',
  insideCabin: false,
  insideCave: false,
  nearCampfire: false,
  nearChest: false,
  nearBed: false,
  nearWorkbench: false,
  nearShop: false,
  activeMerchantKind: 'general',
  nearNpcLabel: null,
  nearResourceLabel: null,
  nearVillager: false,
  inWater: false,
  pointerLocked: false,
  autoFollowCam: false,
  dofEnabled: true,
  shadowUpscale: false,
  ecoMode: true,
  muted: false,
  fps: 60,
  frameMs: 16,
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
  },
  consumables: {
    potion: 1,
    tonic: 0,
    stew: 0,
  },
  upgrades: [],
  killFeed: [],
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<BlocklandWorld | null>(null);
  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);
  const [contextLost, setContextLost] = useState(false);
  const [inventoryTab, setInventoryTab] = useState<ModalTab | null>(null);
  const [activeMerchant, setActiveMerchant] = useState<MerchantKind>('general');
  const [helpOpen, setHelpOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  useEffect(() => {
    worldRef.current?.setModalOpen(inventoryTab !== null || helpOpen || installModalOpen);
  }, [inventoryTab, helpOpen, installModalOpen]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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
    );
    worldRef.current = world;

    const handleGlobalKey = (e: KeyboardEvent) => {
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
      }
    };
    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      world.dispose();
      worldRef.current = null;
    };
  }, []);

  const toggleOrOpenTab = (tab: ModalTab, merchant?: MerchantKind) => {
    soundEngine.unlock();
    if (merchant) {
      setActiveMerchant(merchant);
    }
    setInventoryTab((prev) => {
      const next = prev === tab && !merchant ? null : tab;
      soundEngine.playInventoryToggle(next !== null);
      return next;
    });
  };

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-slate-950">
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {contextLost && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/90 p-6 text-center">
          <div className="max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-6">
            <h2 className="font-display text-lg font-bold text-white">Втрачено контекст WebGL</h2>
            <p className="mt-2 text-sm text-slate-300">
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
        onToggleDof={() => worldRef.current?.toggleDof()}
        onToggleShadowUpscale={() => worldRef.current?.toggleShadowUpscale()}
        onToggleEcoMode={() => worldRef.current?.toggleEcoMode()}
        onTeleportCabin={() => worldRef.current?.teleportToCabin()}
        onTeleportRiver={() => worldRef.current?.teleportToRiver()}
        onInteract={() => worldRef.current?.interactNearby()}
        onAttack={() => worldRef.current?.triggerAttack()}
        onJump={() => worldRef.current?.jump()}
        onTouchMove={(x, z, sprint) => worldRef.current?.setTouchMove(x, z, sprint)}
        onSaveGame={() => worldRef.current?.saveGameNow(false)}
        onNewGame={() => worldRef.current?.resetNewGame()}
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
      />

      <OfflineIndicator />
    </main>
  );
}
