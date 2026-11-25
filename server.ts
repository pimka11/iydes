import fs from 'node:fs';
import http, { type IncomingMessage } from 'node:http';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import initSqlJs, { type Database } from 'sql.js';
import { WebSocket, WebSocketServer } from 'ws';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'dolina_blokiv.sqlite');
const IS_PROD = process.env.NODE_ENV === 'production';
const SERVER_APP_VERSION = '2026.11.24-v11';

let db: Database;

function ensureSchema(database: Database) {
  database.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS player_saves (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 3,
      world_seed INTEGER NOT NULL,
      saved_at INTEGER NOT NULL,
      px REAL NOT NULL,
      py REAL NOT NULL,
      pz REAL NOT NULL,
      player_yaw REAL NOT NULL,
      hp REAL NOT NULL,
      max_hp REAL NOT NULL,
      stamina REAL NOT NULL,
      max_stamina REAL NOT NULL,
      xp INTEGER NOT NULL,
      xp_to_next INTEGER NOT NULL,
      level INTEGER NOT NULL,
      coins INTEGER NOT NULL,
      kills INTEGER NOT NULL,
      wave INTEGER NOT NULL,
      active_weapon TEXT NOT NULL,
      season TEXT NOT NULL,
      weather TEXT NOT NULL,
      auto_season_timer REAL NOT NULL,
      auto_weather_timer REAL NOT NULL,
      play_time_sec REAL NOT NULL DEFAULT 0,
      victory_achieved INTEGER NOT NULL DEFAULT 0,
      workbench_stock INTEGER NOT NULL DEFAULT 0,
      npc_greeted_json TEXT NOT NULL DEFAULT '{}',
      trail_visits_json TEXT NOT NULL DEFAULT '[]',
      opened_chests_json TEXT NOT NULL DEFAULT '[]',
      chopped_trees_json TEXT NOT NULL DEFAULT '[]',
      game_mode TEXT NOT NULL DEFAULT 'survival',
      camera_view_mode TEXT NOT NULL DEFAULT 'third'
    );

    CREATE TABLE IF NOT EXISTS player_resources (
      resource_id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS player_consumables (
      consumable_id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS player_upgrades (
      upgrade_id TEXT PRIMARY KEY,
      unlocked_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS built_structures (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      rot_y REAL NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quest_progress (
      quest_id TEXT PRIMARY KEY,
      progress INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS visited_locations (
      location_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'cave',
      visited_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_profiles (
      profile_id TEXT PRIMARY KEY,
      player_name TEXT NOT NULL DEFAULT 'Мандрівник',
      device TEXT NOT NULL DEFAULT 'desktop',
      save_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  try {
    database.run(`ALTER TABLE player_saves ADD COLUMN game_mode TEXT NOT NULL DEFAULT 'survival'`);
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE player_saves ADD COLUMN camera_view_mode TEXT NOT NULL DEFAULT 'third'`);
  } catch {
    // Column already exists
  }

  const defaults: [string, string][] = [
    ['theme', 'dark'],
    ['graphics_preset', 'high'],
    ['render_scale', '1'],
    ['shadow_quality', '2k'],
    ['grass_density', '1'],
    ['view_distance', 'far'],
    ['dof_enabled', '0'],
    ['bloom_enabled', '1'],
    ['eco_mode', '1'],
    ['server_world_seed', '42069'],
    ['server_season', 'summer'],
    ['server_weather', 'clear'],
  ];
  const now = Date.now();
  const stmt = database.prepare(
    `INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)`,
  );
  for (const [k, v] of defaults) {
    stmt.run([k, v, now]);
  }
  stmt.free();

  // One-time v9 migration: turn off heavy FastDofShader that caused motion-blur ghosting on upgraded DBs
  const migratedCheck = database.prepare(`SELECT setting_value FROM app_settings WHERE setting_key = 'dof_v9_migrated'`);
  const alreadyMigrated = migratedCheck.step();
  migratedCheck.free();
  if (!alreadyMigrated) {
    database.run(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES ('dof_enabled', '0', ?)
       ON CONFLICT(setting_key) DO UPDATE SET setting_value = '0', updated_at = excluded.updated_at`,
      [now],
    );
    database.run(
      `INSERT OR REPLACE INTO app_settings (setting_key, setting_value, updated_at) VALUES ('dof_v9_migrated', '1', ?)`,
      [now],
    );
  }
}

function persistDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const data = db.export();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, Buffer.from(data));
  fs.renameSync(tmpPath, DB_PATH);
}

function queryRows(sql: string, params: (string | number | null)[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function getValidatedTableName(rawName: string): string | null {
  const tables = queryRows(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  ).map((r) => String(r.name));
  return tables.includes(rawName) ? rawName : null;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function sqlLiteral(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (val instanceof Uint8Array) return `X'${Buffer.from(val).toString('hex')}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.resolve(process.cwd(), 'node_modules/sql.js/dist', file),
    useOldExtensionFunctions: false,
  });

  if (fs.existsSync(DB_PATH)) {
    const fileBuf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuf);
  } else {
    db = new SQL.Database();
  }
  ensureSchema(db);
  persistDb();

  const app = express();
  app.set('etag', false);
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '5mb' }));

  const distDir = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distDir, 'index.html'));

  const KILLER_SW_SCRIPT = `
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        try {
          await client.navigate(client.url);
        } catch {}
      }
    } catch {}
  })());
});
`.trim();

  // Always self-destruct legacy dev-sw.js; also self-destruct /sw.js on dev/preview hosts so trapped mobile browsers auto-update
  app.get('/dev-sw.js', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.send(KILLER_SW_SCRIPT);
  });

  app.get('/sw.js', (req: Request, res: Response, next) => {
    const host = String(req.headers.host ?? '');
    const isPreviewHost = /^ais-(dev|pre)-/i.test(host);
    if (!IS_PROD || !hasDist || isPreviewHost) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.send(KILLER_SW_SCRIPT);
      return;
    }
    next();
  });

  // Prevent stale HTML / Service Worker / API caching on mobile browsers and preview proxies
  app.use((req, res, next) => {
    const reqPath = req.path || '/';
    const isHtmlOrSw =
      reqPath === '/' ||
      reqPath === '/index.html' ||
      reqPath === '/sw.js' ||
      reqPath === '/dev-sw.js' ||
      reqPath === '/registerSW.js' ||
      reqPath === '/manifest.webmanifest' ||
      reqPath.startsWith('/api/') ||
      (req.headers.accept?.includes('text/html') && !reqPath.includes('.'));
    if (isHtmlOrSw) {
      const origWriteHead = res.writeHead.bind(res);
      res.writeHead = ((...args: unknown[]) => {
        res.removeHeader('ETag');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        return (origWriteHead as (...a: unknown[]) => Response)(...args);
      }) as typeof res.writeHead;
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
  });

  // Shared online world state backed by SQLite
  const existingSaveRows = queryRows(`SELECT world_seed, season, weather FROM player_saves WHERE id = 1`);
  const settingMap: Record<string, string> = {};
  for (const row of queryRows(`SELECT setting_key, setting_value FROM app_settings`)) {
    settingMap[String(row.setting_key)] = String(row.setting_value);
  }
  let serverWorldSeed =
    Number(existingSaveRows[0]?.world_seed) || Number(settingMap.server_world_seed) || 42069;
  let serverSeason = String(existingSaveRows[0]?.season || settingMap.server_season || 'summer');
  let serverWeather = String(existingSaveRows[0]?.weather || settingMap.server_weather || 'clear');

  type OnlinePlayerRecord = {
    id: string;
    sessionId?: string;
    name: string;
    device: 'mobile' | 'desktop';
    x: number;
    y: number;
    z: number;
    yaw: number;
    vx: number;
    vz: number;
    hp: number;
    maxHp: number;
    level: number;
    weapon: string;
    blocking: boolean;
    inWater: boolean;
    armor: boolean;
    aegis: boolean;
    gameMode: string;
    zoneName: string;
  };

  type OnlineChatItem = {
    id: string;
    senderId: string;
    senderName: string;
    device: 'mobile' | 'desktop';
    text: string;
    ts: number;
  };

  const clients = new Map<
    string,
    {
      ws: WebSocket;
      isAlive: boolean;
      sessionId: string;
      player: OnlinePlayerRecord;
    }
  >();
  const httpPlayers = new Map<
    string,
    {
      lastSeenAt: number;
      sessionId: string;
      player: OnlinePlayerRecord;
    }
  >();
  const chatHistory: OnlineChatItem[] = [];
  const recentEvents: { seq: number; senderId: string; payload: Record<string, unknown> }[] = [];
  let nextOnlineSeq = 1;
  let nextChatSeq = 1;
  let nextEventSeq = 1;
  let playersDirty = false;
  let lastSnapshotBroadcastAt = 0;

  const getPublicPlayers = (): OnlinePlayerRecord[] => [
    ...Array.from(clients.values()).map((c) => c.player),
    ...Array.from(httpPlayers.values()).map((h) => h.player),
  ];

  const getSharedStructures = () =>
    queryRows(`SELECT id, kind, x, y, z, rot_y FROM built_structures ORDER BY created_at ASC`).map(
      (st) => ({
        id: String(st.id),
        kind: String(st.kind),
        x: Number(st.x),
        y: Number(st.y),
        z: Number(st.z),
        rotY: Number(st.rot_y),
      }),
    );

  const pushRecentEvent = (payload: Record<string, unknown>, excludeId = '') => {
    recentEvents.push({ seq: nextEventSeq++, senderId: excludeId, payload });
    if (recentEvents.length > 140) recentEvents.shift();
  };

  const broadcastWsOnly = (payload: Record<string, unknown>, excludeId?: string) => {
    if (clients.size === 0) return;
    const raw = JSON.stringify(payload);
    for (const [cid, entry] of clients.entries()) {
      if (excludeId && cid === excludeId) continue;
      if (entry.ws.readyState === WebSocket.OPEN) {
        entry.ws.send(raw);
      }
    }
  };

  const broadcastJson = (payload: Record<string, unknown>, excludeId?: string) => {
    pushRecentEvent(payload, excludeId ?? '');
    broadcastWsOnly(payload, excludeId);
  };

  const evictSession = (sessionId: string, exceptId = '') => {
    const sid = sessionId.trim().slice(0, 64);
    if (!sid) return;
    for (const [cid, entry] of clients.entries()) {
      if (cid === exceptId) continue;
      if (entry.sessionId === sid) {
        clients.delete(cid);
        try {
          entry.ws.terminate();
        } catch {
          // ignore
        }
        playersDirty = true;
        broadcastJson({ type: 'player:leave', id: cid, name: entry.player.name }, exceptId || cid);
      }
    }
    for (const [hid, entry] of httpPlayers.entries()) {
      if (hid === exceptId) continue;
      if (entry.sessionId === sid) {
        httpPlayers.delete(hid);
        playersDirty = true;
        broadcastJson({ type: 'player:leave', id: hid, name: entry.player.name }, exceptId || hid);
      }
    }
  };

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const applyPlayerFields = (player: OnlinePlayerRecord, msg: Record<string, unknown>) => {
    if (typeof msg.sessionId === 'string' && msg.sessionId.trim()) {
      player.sessionId = msg.sessionId.trim().slice(0, 64);
    }
    if (typeof msg.name === 'string' && msg.name.trim()) {
      player.name = msg.name.trim().slice(0, 20);
    }
    if (msg.device === 'mobile' || msg.device === 'desktop') {
      player.device = msg.device;
    }
    if (typeof msg.x === 'number' && Number.isFinite(msg.x)) player.x = round2(msg.x);
    if (typeof msg.y === 'number' && Number.isFinite(msg.y)) player.y = round2(msg.y);
    if (typeof msg.z === 'number' && Number.isFinite(msg.z)) player.z = round2(msg.z);
    if (typeof msg.yaw === 'number' && Number.isFinite(msg.yaw)) player.yaw = round2(msg.yaw);
    if (typeof msg.vx === 'number' && Number.isFinite(msg.vx)) player.vx = round2(msg.vx);
    if (typeof msg.vz === 'number' && Number.isFinite(msg.vz)) player.vz = round2(msg.vz);
    if (typeof msg.hp === 'number' && Number.isFinite(msg.hp)) player.hp = Math.round(msg.hp);
    if (typeof msg.maxHp === 'number' && Number.isFinite(msg.maxHp)) player.maxHp = Math.round(msg.maxHp);
    if (typeof msg.level === 'number' && Number.isFinite(msg.level)) player.level = Math.round(msg.level);
    if (typeof msg.weapon === 'string') player.weapon = msg.weapon;
    if (typeof msg.blocking === 'boolean') player.blocking = msg.blocking;
    if (typeof msg.inWater === 'boolean') player.inWater = msg.inWater;
    if (typeof msg.armor === 'boolean') player.armor = msg.armor;
    if (typeof msg.aegis === 'boolean') player.aegis = msg.aegis;
    if (typeof msg.gameMode === 'string') player.gameMode = msg.gameMode;
    if (typeof msg.zoneName === 'string') player.zoneName = msg.zoneName.slice(0, 48);
  };

  const handleOnlineEvent = (
    senderId: string,
    player: OnlinePlayerRecord,
    msg: Record<string, unknown>,
  ) => {
    const mType = String(msg.type ?? '');
    if (mType === 'action') {
      broadcastJson(
        {
          type: 'player:action',
          id: senderId,
          weapon: String(msg.weapon ?? player.weapon),
          x: Number(msg.x ?? player.x),
          y: Number(msg.y ?? player.y),
          z: Number(msg.z ?? player.z),
          yaw: Number(msg.yaw ?? player.yaw),
          actionKind: String(msg.actionKind ?? 'swing'),
        },
        senderId,
      );
    } else if (mType === 'build:add' && msg.structure && typeof msg.structure === 'object') {
      const st = msg.structure as Record<string, unknown>;
      const bId = String(st.id ?? '').slice(0, 80);
      const bKind = String(st.kind ?? 'floor');
      const bx = Number(st.x);
      const by = Number(st.y);
      const bz = Number(st.z);
      const brotY = Number(st.rotY ?? 0);
      if (bId && Number.isFinite(bx) && Number.isFinite(by) && Number.isFinite(bz)) {
        try {
          db.run(
            `INSERT OR IGNORE INTO built_structures (id, kind, x, y, z, rot_y, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [bId, bKind, bx, by, bz, brotY, Date.now()],
          );
          persistDb();
        } catch {
          // ignore DB error
        }
        broadcastJson(
          {
            type: 'build:add',
            structure: { id: bId, kind: bKind, x: bx, y: by, z: bz, rotY: brotY },
            byName: player.name,
          },
          senderId,
        );
      }
    } else if (mType === 'build:remove' && typeof msg.id === 'string') {
      const bId = msg.id.slice(0, 80);
      try {
        db.run(`DELETE FROM built_structures WHERE id = ?`, [bId]);
        persistDb();
      } catch {
        // ignore DB error
      }
      broadcastJson({ type: 'build:remove', id: bId, byName: player.name }, senderId);
    } else if (mType === 'world:env') {
      if (typeof msg.season === 'string') serverSeason = msg.season;
      if (typeof msg.weather === 'string') serverWeather = msg.weather;
      try {
        const now = Date.now();
        db.run(
          `INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES ('server_season', ?, ?)
           ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at`,
          [serverSeason, now],
        );
        db.run(
          `INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES ('server_weather', ?, ?)
           ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at`,
          [serverWeather, now],
        );
        persistDb();
      } catch {
        // ignore
      }
      broadcastJson(
        { type: 'world:env', season: serverSeason, weather: serverWeather, byName: player.name },
        senderId,
      );
    } else if (mType === 'mob:spawn') {
      const kind = String(msg.kind ?? 'slime');
      const mx = Number(msg.x ?? player.x);
      const mz = Number(msg.z ?? player.z);
      if (Number.isFinite(mx) && Number.isFinite(mz)) {
        broadcastJson({ type: 'mob:spawn', kind, x: mx, z: mz, byName: player.name }, senderId);
      }
    } else if (mType === 'chat' && typeof msg.text === 'string') {
      const text = msg.text.trim().slice(0, 160);
      if (text) {
        const item: OnlineChatItem = {
          id: `c_${nextChatSeq++}`,
          senderId,
          senderName: player.name,
          device: player.device,
          text,
          ts: Date.now(),
        };
        chatHistory.push(item);
        if (chatHistory.length > 40) chatHistory.shift();
        broadcastJson({ type: 'chat:msg', item });
      }
    }
  };

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      version: SERVER_APP_VERSION,
      engine: 'sqlite-sqljs',
      dbPath: 'data/dolina_blokiv.sqlite',
      onlineCount: clients.size + httpPlayers.size,
      worldSeed: serverWorldSeed,
    });
  });

  app.get('/api/online', (_req: Request, res: Response) => {
    res.json({
      version: SERVER_APP_VERSION,
      count: clients.size + httpPlayers.size,
      worldSeed: serverWorldSeed,
      season: serverSeason,
      weather: serverWeather,
      players: getPublicPlayers(),
    });
  });

  // HTTP Real-Time Multiplayer fallback for proxies/mobile networks where WebSocket upgrade is blocked
  app.post('/api/online/sync', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const requestedId = typeof body.id === 'string' ? body.id.trim().slice(0, 48) : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 64) : '';
    const sinceSeq = Number(body.sinceSeq ?? 0) || 0;
    let entry = requestedId ? httpPlayers.get(requestedId) : undefined;
    let isFirstJoin = false;
    let selfId = requestedId;

    if (!entry) {
      isFirstJoin = true;
      selfId = `h_${nextOnlineSeq++}_${Math.random().toString(36).slice(2, 6)}`;
      if (sessionId) {
        evictSession(sessionId, selfId);
      }
      const newPlayer: OnlinePlayerRecord = {
        id: selfId,
        sessionId: sessionId || undefined,
        name: `Мандрівник-${nextOnlineSeq}`,
        device: 'mobile',
        x: -2,
        y: 2.35,
        z: 9,
        yaw: Math.PI * 0.92,
        vx: 0,
        vz: 0,
        hp: 100,
        maxHp: 100,
        level: 1,
        weapon: 'sword',
        blocking: false,
        inWater: false,
        armor: false,
        aegis: false,
        gameMode: 'survival',
        zoneName: 'Сонячна Галявина',
      };
      applyPlayerFields(newPlayer, body);
      entry = { lastSeenAt: Date.now(), sessionId, player: newPlayer };
      httpPlayers.set(selfId, entry);
      playersDirty = true;
      broadcastJson({ type: 'player:join', player: newPlayer }, selfId);
    } else {
      entry.lastSeenAt = Date.now();
      if (sessionId && entry.sessionId !== sessionId) {
        entry.sessionId = sessionId;
        evictSession(sessionId, selfId);
      }
      applyPlayerFields(entry.player, body);
      playersDirty = true;
    }

    const latestSeq = nextEventSeq - 1;
    const events = isFirstJoin
      ? []
      : recentEvents
          .filter((ev) => ev.seq > sinceSeq && ev.senderId !== selfId)
          .map((ev) => ev.payload);

    res.json({
      ok: true,
      version: SERVER_APP_VERSION,
      selfId,
      isFirstJoin,
      worldSeed: serverWorldSeed,
      season: serverSeason,
      weather: serverWeather,
      players: getPublicPlayers(),
      latestSeq,
      events,
      builtStructures: isFirstJoin ? getSharedStructures() : undefined,
      chatHistory: isFirstJoin ? chatHistory.slice(-25) : undefined,
    });
  });

  app.post('/api/online/event', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const senderId = typeof body.id === 'string' ? body.id.trim().slice(0, 48) : '';
    const entry = senderId ? httpPlayers.get(senderId) : undefined;
    if (!entry) {
      res.status(404).json({ ok: false, error: 'Session expired' });
      return;
    }
    entry.lastSeenAt = Date.now();
    handleOnlineEvent(senderId, entry.player, body);
    res.json({ ok: true, latestSeq: nextEventSeq - 1 });
  });

  app.post('/api/online/leave', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const senderId = typeof body.id === 'string' ? body.id.trim().slice(0, 48) : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 64) : '';
    const existingHttp = senderId ? httpPlayers.get(senderId) : undefined;
    if (existingHttp && httpPlayers.delete(senderId)) {
      playersDirty = true;
      broadcastJson({ type: 'player:leave', id: senderId, name: existingHttp.player.name });
    }
    const existingWs = senderId ? clients.get(senderId) : undefined;
    if (existingWs && clients.delete(senderId)) {
      try {
        existingWs.ws.terminate();
      } catch {
        // ignore
      }
      playersDirty = true;
      broadcastJson({ type: 'player:leave', id: senderId, name: existingWs.player.name });
    }
    if (sessionId) {
      evictSession(sessionId, '');
    }
    res.json({ ok: true });
  });

  // Load full normalized SaveGameData (supports per-browser profileId so mobile & desktop players keep separate heroes)
  app.get('/api/save', (req: Request, res: Response) => {
    try {
      const profileId = String(req.query.profileId ?? '').trim();
      const sharedStructures = getSharedStructures();

      if (profileId && profileId !== 'primary') {
        const profRows = queryRows(`SELECT save_json FROM player_profiles WHERE profile_id = ?`, [
          profileId,
        ]);
        if (profRows.length === 0) {
          res.json({ save: null });
          return;
        }
        const parsed = JSON.parse(String(profRows[0].save_json));
        parsed.worldSeed = serverWorldSeed;
        parsed.season = serverSeason;
        parsed.weather = serverWeather;
        parsed.builtStructures = sharedStructures;
        res.json({ save: parsed });
        return;
      }

      const saves = queryRows(`SELECT * FROM player_saves WHERE id = 1`);
      if (saves.length === 0) {
        res.json({ save: null });
        return;
      }
      const s = saves[0];
      const resourcesRows = queryRows(`SELECT resource_id, amount FROM player_resources`);
      const consumablesRows = queryRows(`SELECT consumable_id, amount FROM player_consumables`);
      const upgradeRows = queryRows(`SELECT upgrade_id FROM player_upgrades`);
      const questRows = queryRows(`SELECT quest_id, progress, completed FROM quest_progress`);
      const locRows = queryRows(`SELECT location_id FROM visited_locations WHERE kind = 'cave'`);

      const resources: Record<string, number> = {
        wood: 2,
        stone: 1,
        iron: 0,
        herb: 2,
        essence: 0,
        hide: 0,
        raw_meat: 0,
      };
      for (const r of resourcesRows) {
        resources[String(r.resource_id)] = Number(r.amount) || 0;
      }

      const consumables: Record<string, number> = {
        potion: 1,
        mega_potion: 0,
        tonic: 0,
        stew: 0,
        cooked_meat: 0,
        rage_potion: 0,
        swift_potion: 0,
        iron_skin_potion: 0,
        phoenix_elixir: 0,
      };
      for (const c of consumablesRows) {
        consumables[String(c.consumable_id)] = Number(c.amount) || 0;
      }

      const quests: Record<string, { progress: number; completed: boolean }> = {};
      for (const q of questRows) {
        quests[String(q.quest_id)] = {
          progress: Number(q.progress) || 0,
          completed: Boolean(Number(q.completed)),
        };
      }

      const save = {
        version: Number(s.version) || 3,
        worldSeed: Number(s.world_seed),
        savedAt: Number(s.saved_at),
        px: Number(s.px),
        py: Number(s.py),
        pz: Number(s.pz),
        playerYaw: Number(s.player_yaw),
        hp: Number(s.hp),
        maxHp: Number(s.max_hp),
        stamina: Number(s.stamina),
        maxStamina: Number(s.max_stamina),
        xp: Number(s.xp),
        xpToNext: Number(s.xp_to_next),
        level: Number(s.level),
        coins: Number(s.coins),
        kills: Number(s.kills),
        wave: Number(s.wave),
        activeWeapon: String(s.active_weapon),
        season: String(s.season),
        weather: String(s.weather),
        autoSeasonTimer: Number(s.auto_season_timer),
        autoWeatherTimer: Number(s.auto_weather_timer),
        playTimeSec: Number(s.play_time_sec) || 0,
        victoryAchieved: Boolean(Number(s.victory_achieved)),
        workbenchStock: Number(s.workbench_stock) || 0,
        npcGreeted: JSON.parse(String(s.npc_greeted_json || '{}')),
        trailVisits: JSON.parse(String(s.trail_visits_json || '[]')),
        openedChests: JSON.parse(String(s.opened_chests_json || '[]')),
        choppedTreeIds: JSON.parse(String(s.chopped_trees_json || '[]')),
        gameMode: String(s.game_mode || 'survival'),
        cameraViewMode: String(s.camera_view_mode || 'third'),
        resources,
        consumables,
        upgrades: upgradeRows.map((u) => String(u.upgrade_id)),
        builtStructures: sharedStructures,
        quests,
        visitedCaves: locRows.map((l) => String(l.location_id)),
      };
      res.json({ save });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load SQL save' });
    }
  });

  // Save full normalized SaveGameData transactionally
  app.post('/api/save', (req: Request, res: Response) => {
    const data = req.body;
    const profileId = String(req.query.profileId ?? '').trim() || 'primary';
    if (!data || typeof data.worldSeed !== 'number' || typeof data.px !== 'number') {
      res.status(400).json({ error: 'Invalid save payload' });
      return;
    }

    const now = Date.now();
    if (profileId !== 'primary') {
      try {
        db.run(
          `INSERT INTO player_profiles (profile_id, player_name, device, save_json, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(profile_id) DO UPDATE SET
             save_json=excluded.save_json,
             updated_at=excluded.updated_at`,
          [profileId, String(data.playerName ?? 'Мандрівник'), 'mobile', JSON.stringify(data), now],
        );
        persistDb();
        res.json({ ok: true, savedAt: data.savedAt ?? now });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save profile' });
      }
      return;
    }

    try {
      db.run('BEGIN TRANSACTION');
      db.run(
        `INSERT INTO player_saves (
          id, version, world_seed, saved_at, px, py, pz, player_yaw,
          hp, max_hp, stamina, max_stamina, xp, xp_to_next, level, coins, kills, wave,
          active_weapon, season, weather, auto_season_timer, auto_weather_timer,
          play_time_sec, victory_achieved, workbench_stock,
          npc_greeted_json, trail_visits_json, opened_chests_json, chopped_trees_json,
          game_mode, camera_view_mode
        ) VALUES (
          1, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          version=excluded.version,
          world_seed=excluded.world_seed,
          saved_at=excluded.saved_at,
          px=excluded.px,
          py=excluded.py,
          pz=excluded.pz,
          player_yaw=excluded.player_yaw,
          hp=excluded.hp,
          max_hp=excluded.max_hp,
          stamina=excluded.stamina,
          max_stamina=excluded.max_stamina,
          xp=excluded.xp,
          xp_to_next=excluded.xp_to_next,
          level=excluded.level,
          coins=excluded.coins,
          kills=excluded.kills,
          wave=excluded.wave,
          active_weapon=excluded.active_weapon,
          season=excluded.season,
          weather=excluded.weather,
          auto_season_timer=excluded.auto_season_timer,
          auto_weather_timer=excluded.auto_weather_timer,
          play_time_sec=excluded.play_time_sec,
          victory_achieved=excluded.victory_achieved,
          workbench_stock=excluded.workbench_stock,
          npc_greeted_json=excluded.npc_greeted_json,
          trail_visits_json=excluded.trail_visits_json,
          opened_chests_json=excluded.opened_chests_json,
          chopped_trees_json=excluded.chopped_trees_json,
          game_mode=excluded.game_mode,
          camera_view_mode=excluded.camera_view_mode`,
        [
          data.version ?? 3,
          data.worldSeed,
          data.savedAt ?? Date.now(),
          data.px,
          data.py ?? 2.35,
          data.pz,
          data.playerYaw ?? 0,
          data.hp ?? 100,
          data.maxHp ?? 100,
          data.stamina ?? 100,
          data.maxStamina ?? 100,
          data.xp ?? 0,
          data.xpToNext ?? 100,
          data.level ?? 1,
          data.coins ?? 25,
          data.kills ?? 0,
          data.wave ?? 1,
          data.activeWeapon ?? 'sword',
          data.season ?? 'summer',
          data.weather ?? 'clear',
          data.autoSeasonTimer ?? 900,
          data.autoWeatherTimer ?? 140,
          data.playTimeSec ?? 0,
          data.victoryAchieved ? 1 : 0,
          data.workbenchStock ?? 0,
          JSON.stringify(data.npcGreeted ?? {}),
          JSON.stringify(data.trailVisits ?? []),
          JSON.stringify(data.openedChests ?? []),
          JSON.stringify(data.choppedTreeIds ?? []),
          data.gameMode ?? 'survival',
          data.cameraViewMode ?? 'third',
        ],
      );

      db.run('DELETE FROM player_resources');
      const resStmt = db.prepare('INSERT INTO player_resources (resource_id, amount) VALUES (?, ?)');
      for (const [k, v] of Object.entries(data.resources ?? {})) {
        resStmt.run([k, Number(v) || 0]);
      }
      resStmt.free();

      db.run('DELETE FROM player_consumables');
      const conStmt = db.prepare('INSERT INTO player_consumables (consumable_id, amount) VALUES (?, ?)');
      for (const [k, v] of Object.entries(data.consumables ?? {})) {
        conStmt.run([k, Number(v) || 0]);
      }
      conStmt.free();

      db.run('DELETE FROM player_upgrades');
      const upgStmt = db.prepare('INSERT INTO player_upgrades (upgrade_id, unlocked_at) VALUES (?, ?)');
      const now = Date.now();
      for (const u of (data.upgrades ?? []) as string[]) {
        upgStmt.run([u, now]);
      }
      upgStmt.free();

      if (clients.size <= 1) {
        db.run('DELETE FROM built_structures');
      }
      const buildStmt = db.prepare(
        'INSERT OR IGNORE INTO built_structures (id, kind, x, y, z, rot_y, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      const builds = (data.builtStructures ?? []) as {
        id: string;
        kind: string;
        x: number;
        y: number;
        z: number;
        rotY: number;
      }[];
      for (let i = 0; i < builds.length; i++) {
        const b = builds[i];
        buildStmt.run([b.id, b.kind, b.x, b.y, b.z, b.rotY, now + i]);
      }
      buildStmt.free();

      db.run('DELETE FROM quest_progress');
      const qStmt = db.prepare('INSERT INTO quest_progress (quest_id, progress, completed) VALUES (?, ?, ?)');
      for (const [qid, qval] of Object.entries(
        (data.quests ?? {}) as Record<string, { progress: number; completed: boolean }>,
      )) {
        qStmt.run([qid, qval.progress ?? 0, qval.completed ? 1 : 0]);
      }
      qStmt.free();

      db.run('DELETE FROM visited_locations');
      const locStmt = db.prepare(
        'INSERT INTO visited_locations (location_id, kind, visited_at) VALUES (?, ?, ?)',
      );
      for (const cid of (data.visitedCaves ?? []) as string[]) {
        locStmt.run([cid, 'cave', now]);
      }
      locStmt.free();

      db.run('COMMIT');
      persistDb();
      res.json({ ok: true, savedAt: data.savedAt ?? now });
    } catch (err) {
      try {
        db.run('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save to SQL' });
    }
  });

  app.delete('/api/save', (req: Request, res: Response) => {
    const profileId = String(req.query.profileId ?? '').trim() || 'primary';
    try {
      if (profileId !== 'primary') {
        db.run(`DELETE FROM player_profiles WHERE profile_id = ?`, [profileId]);
        persistDb();
        res.json({ ok: true });
        return;
      }
      db.run(`
        BEGIN TRANSACTION;
        DELETE FROM player_saves;
        DELETE FROM player_resources;
        DELETE FROM player_consumables;
        DELETE FROM player_upgrades;
        DELETE FROM quest_progress;
        DELETE FROM visited_locations;
        COMMIT;
      `);
      persistDb();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to clear SQL save' });
    }
  });

  // Settings endpoints
  app.get('/api/settings', (_req: Request, res: Response) => {
    const rows = queryRows(`SELECT setting_key, setting_value FROM app_settings`);
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[String(r.setting_key)] = String(r.setting_value);
    }
    res.json({ settings: map });
  });

  app.post('/api/settings', (req: Request, res: Response) => {
    const incoming = req.body as Record<string, unknown>;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Invalid settings payload' });
      return;
    }
    try {
      const now = Date.now();
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare(
        `INSERT INTO app_settings (setting_key, setting_value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at`,
      );
      for (const [k, v] of Object.entries(incoming)) {
        stmt.run([k, String(v), now]);
      }
      stmt.free();
      db.run('COMMIT');
      persistDb();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save settings' });
    }
  });

  // phpMyAdmin-style SQL Administration APIs
  app.get('/api/sql/tables', (_req: Request, res: Response) => {
    try {
      const masterRows = queryRows(
        `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      );
      const tables = masterRows.map((m) => {
        const name = String(m.name);
        const cntRows = queryRows(`SELECT COUNT(*) AS cnt FROM ${quoteIdent(name)}`);
        const cols = queryRows(`PRAGMA table_info(${quoteIdent(name)})`);
        return {
          name,
          rowCount: Number(cntRows[0]?.cnt ?? 0),
          createSql: String(m.sql ?? ''),
          columns: cols.map((c) => ({
            cid: Number(c.cid),
            name: String(c.name),
            type: String(c.type || 'TEXT'),
            notnull: Boolean(Number(c.notnull)),
            dflt_value: c.dflt_value,
            pk: Boolean(Number(c.pk)),
          })),
        };
      });
      const stat = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;
      res.json({
        dbName: 'dolina_blokiv',
        engine: 'SQLite 3 (sql.js WASM)',
        fileSizeBytes: stat?.size ?? 0,
        tables,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list tables' });
    }
  });

  app.get('/api/sql/table/:name', (req: Request, res: Response) => {
    const tableName = getValidatedTableName(String(req.params.name ?? ''));
    if (!tableName) {
      res.status(404).json({ error: 'Таблицю не знайдено' });
      return;
    }

    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit ?? 25) || 25));
    const offset = (page - 1) * limit;
    const search = String(req.query.search ?? '').trim();
    const colsInfo = queryRows(`PRAGMA table_info(${quoteIdent(tableName)})`);
    const colNames = colsInfo.map((c) => String(c.name));
    const rawSortCol = String(req.query.sortCol ?? '');
    const sortCol = colNames.includes(rawSortCol) ? rawSortCol : colNames[0] ?? 'rowid';
    const sortDir = String(req.query.sortDir ?? 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    try {
      let whereClause = '';
      const params: (string | number | null)[] = [];
      if (search && colNames.length > 0) {
        const likes = colNames.map((cn) => `CAST(${quoteIdent(cn)} AS TEXT) LIKE ?`);
        whereClause = `WHERE ${likes.join(' OR ')}`;
        for (let i = 0; i < colNames.length; i++) params.push(`%${search}%`);
      }

      const countRes = queryRows(
        `SELECT COUNT(*) AS total FROM ${quoteIdent(tableName)} ${whereClause}`,
        params,
      );
      const totalRows = Number(countRes[0]?.total ?? 0);

      const rows = queryRows(
        `SELECT rowid AS _rowid, * FROM ${quoteIdent(tableName)} ${whereClause} ORDER BY ${quoteIdent(sortCol)} ${sortDir} LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );

      res.json({
        table: tableName,
        columns: colsInfo.map((c) => ({
          name: String(c.name),
          type: String(c.type || 'TEXT'),
          notnull: Boolean(Number(c.notnull)),
          pk: Boolean(Number(c.pk)),
        })),
        rows,
        totalRows,
        page,
        limit,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read table' });
    }
  });

  app.post('/api/sql/table/:name/row', (req: Request, res: Response) => {
    const tableName = getValidatedTableName(String(req.params.name ?? ''));
    if (!tableName) {
      res.status(404).json({ error: 'Таблицю не знайдено' });
      return;
    }
    const rowObj = req.body as Record<string, unknown>;
    if (!rowObj || typeof rowObj !== 'object') {
      res.status(400).json({ error: 'Невірний формат рядка' });
      return;
    }

    const colsInfo = queryRows(`PRAGMA table_info(${quoteIdent(tableName)})`);
    const validCols = colsInfo.map((c) => String(c.name));
    const keys = Object.keys(rowObj).filter((k) => validCols.includes(k));
    if (keys.length === 0) {
      res.status(400).json({ error: 'Не вказано жодного коректного стовпця' });
      return;
    }

    try {
      const colSql = keys.map(quoteIdent).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const vals = keys.map((k) => {
        const v = rowObj[k];
        if (v === '' || v === undefined) return null;
        return typeof v === 'number' || typeof v === 'string' ? v : String(v);
      });
      db.run(`INSERT OR REPLACE INTO ${quoteIdent(tableName)} (${colSql}) VALUES (${placeholders})`, vals);
      persistDb();
      res.json({ ok: true, changes: db.getRowsModified() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'SQL insert error' });
    }
  });

  app.delete('/api/sql/table/:name', (req: Request, res: Response) => {
    const tableName = getValidatedTableName(String(req.params.name ?? ''));
    if (!tableName) {
      res.status(404).json({ error: 'Таблицю не знайдено' });
      return;
    }
    const rowid = Number(req.body?.rowid);
    if (!Number.isFinite(rowid)) {
      res.status(400).json({ error: 'Потрібен коректний rowid' });
      return;
    }
    try {
      db.run(`DELETE FROM ${quoteIdent(tableName)} WHERE rowid = ?`, [rowid]);
      persistDb();
      res.json({ ok: true, changes: db.getRowsModified() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'SQL delete error' });
    }
  });

  app.post('/api/sql/query', (req: Request, res: Response) => {
    const sql = String(req.body?.sql ?? '').trim();
    if (!sql) {
      res.status(400).json({ error: 'Введіть SQL-запит' });
      return;
    }
    const t0 = performance.now();
    try {
      const results = db.exec(sql);
      const changes = db.getRowsModified();
      const first = results[0];
      const normalizedUpper = sql.toUpperCase();
      const likelyWrite =
        /\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE|PRAGMA|VACUUM)\b/.test(normalizedUpper);
      if (changes > 0 || likelyWrite) {
        ensureSchema(db);
        persistDb();
      }
      const durationMs = Math.max(0.1, Number((performance.now() - t0).toFixed(2)));
      res.json({
        ok: true,
        columns: first ? first.columns : [],
        rows: first ? first.values : [],
        changes,
        durationMs,
      });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Помилка виконання SQL',
      });
    }
  });

  app.get('/api/sql/export', (_req: Request, res: Response) => {
    try {
      const lines: string[] = [
        '-- phpMyAdmin SQL Dump (Долина Блоків)',
        `-- Експортовано: ${new Date().toISOString()}`,
        '-- Двигун: SQLite 3 (sql.js)',
        '',
        'PRAGMA foreign_keys = OFF;',
        'BEGIN TRANSACTION;',
        '',
      ];
      const masterRows = queryRows(
        `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      );
      for (const m of masterRows) {
        const tName = String(m.name);
        lines.push(`-- Структура таблиці ${quoteIdent(tName)}`);
        lines.push(`${String(m.sql)};`);
        const rows = queryRows(`SELECT * FROM ${quoteIdent(tName)}`);
        if (rows.length > 0) {
          const cols = Object.keys(rows[0]);
          const colList = cols.map(quoteIdent).join(', ');
          for (const row of rows) {
            const vals = cols.map((c) => sqlLiteral(row[c])).join(', ');
            lines.push(`INSERT INTO ${quoteIdent(tName)} (${colList}) VALUES (${vals});`);
          }
        }
        lines.push('');
      }
      lines.push('COMMIT;', '');
      const dump = lines.join('\n');
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="dolina_blokiv.sql"');
      res.send(dump);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
    }
  });

  // Cross-platform Real-Time Multiplayer WebSocket Server (/ws/game)
  // Using noServer:true ensures zero conflict with Vite's internal HMR WebSocket listener
  const gameWss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
    const pathname = (req.url ?? '/').split('?')[0];
    if (pathname !== '/ws/game') {
      return;
    }
    gameWss.handleUpgrade(req, socket, head, (ws) => {
      gameWss.emit('connection', ws, req);
    });
  });

  gameWss.on('connection', (ws: WebSocket) => {
    const clientId = `p_${nextOnlineSeq++}_${Math.random().toString(36).slice(2, 6)}`;
    const player: OnlinePlayerRecord = {
      id: clientId,
      name: `Мандрівник-${nextOnlineSeq}`,
      device: 'desktop',
      x: -2,
      y: 2.35,
      z: 9,
      yaw: Math.PI * 0.92,
      vx: 0,
      vz: 0,
      hp: 100,
      maxHp: 100,
      level: 1,
      weapon: 'sword',
      blocking: false,
      inWater: false,
      armor: false,
      aegis: false,
      gameMode: 'survival',
      zoneName: 'Сонячна Галявина',
    };

    const entry = { ws, isAlive: true, sessionId: '', player };
    clients.set(clientId, entry);
    playersDirty = true;

    ws.on('pong', () => {
      entry.isAlive = true;
    });

    ws.send(
      JSON.stringify({
        type: 'welcome',
        selfId: clientId,
        worldSeed: serverWorldSeed,
        season: serverSeason,
        weather: serverWeather,
        players: getPublicPlayers(),
        builtStructures: getSharedStructures(),
        chatHistory: chatHistory.slice(-25),
      }),
    );

    ws.on('message', (rawData) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(rawData)) as Record<string, unknown>;
      } catch {
        return;
      }

      const mType = String(msg.type ?? '');
      if (mType === 'hello' || mType === 'state') {
        const sid = typeof msg.sessionId === 'string' ? msg.sessionId.trim().slice(0, 64) : '';
        if (sid && sid !== entry.sessionId) {
          entry.sessionId = sid;
          evictSession(sid, clientId);
        }
        applyPlayerFields(player, msg);
        playersDirty = true;
        if (mType === 'hello') {
          broadcastJson({ type: 'player:join', player }, clientId);
          // Re-send clean welcome player list after evicting any old session clone
          if (sid && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'players:snapshot',
                players: getPublicPlayers(),
              }),
            );
          }
        }
      } else if (mType === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: Number(msg.ts ?? Date.now()) }));
      } else {
        handleOnlineEvent(clientId, player, msg);
      }
    });

    ws.on('close', () => {
      if (clients.delete(clientId)) {
        playersDirty = true;
        broadcastJson({ type: 'player:leave', id: clientId, name: player.name });
      }
    });
  });

  // Up to 20 Hz WS-only snapshot broadcast (never pollutes HTTP recentEvents ring buffer)
  setInterval(() => {
    if (clients.size === 0) return;
    const now = Date.now();
    if (!playersDirty && now - lastSnapshotBroadcastAt < 450) return;
    playersDirty = false;
    lastSnapshotBroadcastAt = now;
    broadcastWsOnly({ type: 'players:snapshot', players: getPublicPlayers() });
  }, 50);

  // Heartbeat & HTTP fallback expiry check
  setInterval(() => {
    for (const [cid, entry] of clients.entries()) {
      if (!entry.isAlive) {
        clients.delete(cid);
        entry.ws.terminate();
        playersDirty = true;
        broadcastJson({ type: 'player:leave', id: cid, name: entry.player.name });
        continue;
      }
      entry.isAlive = false;
      entry.ws.ping();
    }
    const now = Date.now();
    for (const [hid, entry] of httpPlayers.entries()) {
      if (now - entry.lastSeenAt > 10000) {
        httpPlayers.delete(hid);
        playersDirty = true;
        broadcastJson({ type: 'player:leave', id: hid, name: entry.player.name });
      }
    }
  }, 5000);

  if (!IS_PROD || !hasDist) {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: { server: httpServer },
        watch: hmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          const base = path.basename(filePath);
          if (
            base === 'index.html' ||
            base === 'sw.js' ||
            base === 'registerSW.js' ||
            base === 'manifest.webmanifest'
          ) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Dolina Blokiv server running on http://0.0.0.0:${PORT}`);
  });
}

void main();
