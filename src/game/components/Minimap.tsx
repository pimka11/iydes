import React, { useEffect, useRef } from 'react';
import { BRIDGE_Z, riverCenterX } from '../terrain';
import { MinimapEntity, SeasonId, TrailCellPoint } from '../types';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  season: SeasonId;
  biomeId?: string;
  zoneName: string;
  entities: MinimapEntity[];
  trailCells?: TrailCellPoint[];
  onClickMap?: () => void;
}

const RADAR_RADIUS_METERS = 115;

const MinimapInner: React.FC<MinimapProps> = ({
  playerX,
  playerZ,
  playerYaw,
  season,
  biomeId,
  zoneName,
  entities,
  trailCells,
  onClickMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = canvas.clientWidth || 112;
    if (canvas.width !== Math.round(size * dpr) || canvas.height !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const scale = (size * 0.46) / RADAR_RADIUS_METERS;
    const toScreenX = (wx: number) => cx + (wx - playerX) * scale;
    const toScreenY = (wz: number) => cy + (wz - playerZ) * scale;

    ctx.clearRect(0, 0, size, size);

    // Clip to circle radar mask
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
    ctx.clip();

    // Base biome background tinted subtly by biome and season
    let bgHex =
      season === 'winter'
        ? '#1e293b'
        : season === 'autumn'
          ? '#262118'
          : '#11221b';
    if (biomeId === 'ashlands') bgHex = '#231d29';
    else if (biomeId === 'snow_peaks') bgHex = '#1d2d3e';
    else if (biomeId === 'golden_steppe') bgHex = '#2c2516';
    else if (biomeId === 'blossom_grove') bgHex = '#241c29';
    else if (biomeId === 'desert') bgHex = '#3b2e14';
    else if (biomeId === 'mystic_swamp') bgHex = '#122923';
    else if (biomeId === 'autumn_woods') bgHex = '#2f1c12';
    else if (biomeId === 'bamboo_grove') bgHex = '#15301c';
    else if (biomeId === 'crystal_canyon') bgHex = '#19233d';
    else if (biomeId === 'ancient_highlands') bgHex = '#26232e';
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, size, size);

    // Subtle distance rings
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();

    // Winding River
    ctx.strokeStyle = season === 'winter' || biomeId === 'snow_peaks' ? '#38bdf8' : '#1d6fd6';
    ctx.lineWidth = Math.max(4, 11 * scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let z = playerZ - RADAR_RADIUS_METERS - 20; z <= playerZ + RADAR_RADIUS_METERS + 20; z += 12) {
      const rx = toScreenX(riverCenterX(z));
      const rz = toScreenY(z);
      if (z === playerZ - RADAR_RADIUS_METERS - 20) ctx.moveTo(rx, rz);
      else ctx.lineTo(rx, rz);
    }
    ctx.stroke();

    // Player-trampled trails (appear ONLY after walking > 10 times)
    if (trailCells && trailCells.length > 0) {
      ctx.fillStyle = season === 'winter' ? 'rgba(203, 213, 225, 0.7)' : 'rgba(180, 148, 108, 0.85)';
      const tilePx = Math.max(2.2, 2.2 * scale);
      for (const cell of trailCells) {
        const sx = toScreenX(cell.x);
        const sy = toScreenY(cell.z);
        if (sx >= -4 && sx <= size + 4 && sy >= -4 && sy <= size + 4) {
          ctx.fillRect(sx - tilePx * 0.5, sy - tilePx * 0.5, tilePx, tilePx);
        }
      }
    }

    // Arched Bridge marker
    const bx = toScreenX(riverCenterX(BRIDGE_Z));
    const bz = toScreenY(BRIDGE_Z);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(bx - 6, bz - 2.5, 12, 5);

    // Entities (cabins, caves, NPCs, merchants, mobs, boss, active quest)
    for (const e of entities) {
      const sx = toScreenX(e.x);
      const sy = toScreenY(e.z);
      const distFromCenter = Math.hypot(sx - cx, sy - cy);
      const clampedDist = Math.min(distFromCenter, size * 0.43);
      const isPinnedMarker =
        e.kind === 'cabin' ||
        e.kind === 'cave' ||
        e.kind === 'dungeon' ||
        e.kind === 'quest' ||
        e.kind === 'boss' ||
        e.kind === 'village' ||
        e.kind === 'player_remote';
      const drawX =
        distFromCenter > size * 0.43 && isPinnedMarker
          ? cx + ((sx - cx) / distFromCenter) * clampedDist
          : sx;
      const drawY =
        distFromCenter > size * 0.43 && isPinnedMarker
          ? cy + ((sy - cy) / distFromCenter) * clampedDist
          : sy;

      if (e.kind === 'player_remote') {
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (e.kind === 'village') {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(drawX - 4.5, drawY - 4.5, 9, 9);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(drawX - 4.5, drawY - 4.5, 9, 9);
      } else if (e.kind === 'cabin') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(drawX - 3, drawY - 3, 6, 6);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX - 3, drawY - 3, 6, 6);
      } else if (e.kind === 'cave') {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.moveTo(drawX, drawY - 4);
        ctx.lineTo(drawX + 4, drawY);
        ctx.lineTo(drawX, drawY + 4);
        ctx.lineTo(drawX - 4, drawY);
        ctx.closePath();
        ctx.fill();
      } else if (e.kind === 'dungeon') {
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.moveTo(drawX, drawY - 4.2);
        ctx.lineTo(drawX + 4.2, drawY);
        ctx.lineTo(drawX, drawY + 4.2);
        ctx.lineTo(drawX - 4.2, drawY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (e.kind === 'merchant') {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 2.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'npc') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'boss') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef2f2';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (e.kind === 'mob' && distFromCenter < size * 0.46) {
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'quest') {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Player Arrow (facing sin(yaw), cos(yaw))
    const dirX = Math.sin(playerYaw);
    const dirY = Math.cos(playerYaw);
    const perpX = -dirY;
    const perpY = dirX;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + dirX * 6.5, cy + dirY * 6.5);
    ctx.lineTo(cx - dirX * 4 + perpX * 4.2, cy - dirY * 4 + perpY * 4.2);
    ctx.lineTo(cx - dirX * 2.2, cy - dirY * 2.2);
    ctx.lineTo(cx - dirX * 4 - perpX * 4.2, cy - dirY * 4 - perpY * 4.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }, [playerX, playerZ, playerYaw, season, biomeId, entities, trailCells]);

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClickMap}
      title="Мінікарта долини (натисніть для квестів)"
      className="group flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/85 dark:bg-slate-950/88 p-0.5 sm:p-1.5 shadow-lg backdrop-blur-md"
    >
      <div className="relative h-11 w-11 sm:h-28 sm:w-28">
        <canvas ref={canvasRef} className="h-full w-full rounded-full" />
        <span className="pointer-events-none absolute top-0.5 left-1/2 -translate-x-1/2 text-[6px] sm:text-[8px] font-bold text-slate-200">
          Пн
        </span>
      </div>
      <span className="max-w-12 sm:max-w-28 truncate text-[7px] sm:text-[9px] leading-tight font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white">
        {zoneName}
      </span>
    </button>
  );
};

export const Minimap = React.memo(
  MinimapInner,
  (prev, next) =>
    Math.abs(prev.playerX - next.playerX) < 0.15 &&
    Math.abs(prev.playerZ - next.playerZ) < 0.15 &&
    Math.abs(prev.playerYaw - next.playerYaw) < 0.02 &&
    prev.season === next.season &&
    prev.biomeId === next.biomeId &&
    prev.zoneName === next.zoneName &&
    prev.entities === next.entities &&
    (prev.trailCells?.length ?? 0) === (next.trailCells?.length ?? 0),
);

