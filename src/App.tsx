/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { InventoryCraftModal } from './components/InventoryCraftModal';
import { ConsumableId, GameHudState, MobKind, WeaponId } from './game/types';
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
  coins: 0,
  kills: 0,
  wave: 1,
  activeMobs: 0,
  peacefulMobs: 0,
  activeWeapon: 'sword',
  weaponCooldownRatio: 0,
  zoneName: 'Сонячна Галявина',
  insideCabin: false,
  nearCampfire: false,
  nearChest: false,
  nearWorkbench: false,
  nearResourceLabel: null,
  nearVillager: false,
  inWater: false,
  pointerLocked: false,
  autoFollowCam: true,
  dofEnabled: true,
  shadowUpscale: false,
  ecoMode: true,
  muted: false,
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
  const [inventoryTab, setInventoryTab] = useState<'inventory' | 'craft' | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const world = new BlocklandWorld(
      container,
      (nextState) => setHud(nextState),
      () => setContextLost(true),
      () => setInventoryTab('craft'),
    );
    worldRef.current = world;

    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyI') {
        setInventoryTab((prev) => (prev === 'inventory' ? null : 'inventory'));
      } else if (e.code === 'KeyK') {
        setInventoryTab((prev) => (prev === 'craft' ? null : 'craft'));
      } else if (e.code === 'Escape') {
        setInventoryTab(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      world.dispose();
      worldRef.current = null;
    };
  }, []);

  const toggleOrOpenTab = (tab: 'inventory' | 'craft') => {
    setInventoryTab((prev) => (prev === tab ? null : tab));
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
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
        onUseConsumable={(id: ConsumableId) => worldRef.current?.useConsumable(id)}
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
        onTouchMove={(x, z) => worldRef.current?.setTouchMove(x, z)}
      />

      <InventoryCraftModal
        open={inventoryTab !== null}
        tab={inventoryTab ?? 'inventory'}
        onTabChange={(t) => setInventoryTab(t)}
        onClose={() => setInventoryTab(null)}
        hud={hud}
        onCraft={(recipeId) => worldRef.current?.craftRecipe(recipeId)}
        onUseConsumable={(id) => worldRef.current?.useConsumable(id)}
      />
    </main>
  );
}
