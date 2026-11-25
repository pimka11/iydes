import {
  BuiltStructureData,
  ConsumableId,
  DeviceKind,
  GameMode,
  MobKind,
  OnlineChatMessage,
  OnlinePlayerState,
  SeasonId,
  WeaponId,
  WeatherId,
} from './types';

export type ServerMessage =
  | {
      type: 'welcome';
      selfId: string;
      worldSeed: number;
      season: SeasonId;
      weather: WeatherId;
      players: OnlinePlayerState[];
      builtStructures: BuiltStructureData[];
      chatHistory: OnlineChatMessage[];
    }
  | { type: 'players:snapshot'; players: OnlinePlayerState[] }
  | { type: 'player:join'; player: OnlinePlayerState }
  | { type: 'player:leave'; id: string; name: string }
  | {
      type: 'player:action';
      id: string;
      weapon: WeaponId;
      x: number;
      y: number;
      z: number;
      yaw: number;
      actionKind: string;
    }
  | { type: 'build:add'; structure: BuiltStructureData; byName?: string }
  | { type: 'build:remove'; id: string; byName?: string }
  | { type: 'world:env'; season: SeasonId; weather: WeatherId; byName?: string }
  | { type: 'mob:spawn'; kind: MobKind; x: number; z: number; byName?: string }
  | { type: 'chat:msg'; item: OnlineChatMessage }
  | { type: 'pong'; ts: number };

export interface MultiplayerCallbacks {
  onWelcome: (msg: Extract<ServerMessage, { type: 'welcome' }>) => void;
  onPlayersSnapshot: (players: OnlinePlayerState[]) => void;
  onPlayerJoin: (player: OnlinePlayerState) => void;
  onPlayerLeave: (id: string, name: string) => void;
  onPlayerAction: (msg: Extract<ServerMessage, { type: 'player:action' }>) => void;
  onBuildAdd: (structure: BuiltStructureData, byName?: string) => void;
  onBuildRemove: (id: string, byName?: string) => void;
  onWorldEnv: (season: SeasonId, weather: WeatherId, byName?: string) => void;
  onMobSpawn: (kind: MobKind, x: number, z: number, byName?: string) => void;
  onChatMessage: (item: OnlineChatMessage) => void;
  onConnectionChange: (connected: boolean) => void;
  onPingChange?: (pingMs: number | null) => void;
}

const NAME_STORAGE_KEY = 'dolina_blokiv_player_name_v1';
const TAB_SESSION_KEY = 'dolina_blokiv_tab_session_v1';

export function getOrCreateTabSessionId(): string {
  if (typeof window === 'undefined') return 'srv_session';
  try {
    const existing = window.sessionStorage?.getItem(TAB_SESSION_KEY)?.trim();
    if (existing && existing.length >= 6) return existing.slice(0, 64);
    const created =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage?.setItem(TAB_SESSION_KEY, created);
    return created;
  } catch {
    return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function detectDeviceKind(): DeviceKind {
  if (typeof window === 'undefined') return 'desktop';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const ua = navigator.userAgent.toLowerCase();
  const mobileUa = /android|iphone|ipad|ipod|mobile|tablet/.test(ua);
  return coarse || mobileUa || (touch && window.innerWidth < 1024) ? 'mobile' : 'desktop';
}

export function getOrCreatePlayerName(device: DeviceKind): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return device === 'mobile' ? 'Мандрівник-М' : 'Мандрівник-ПК';
  }
  const params = new URLSearchParams(window.location.search);
  const customNick = params.get('nick')?.trim();
  if (customNick && customNick.length >= 2) {
    const cleaned = customNick.slice(0, 20);
    try {
      window.localStorage.setItem(NAME_STORAGE_KEY, cleaned);
    } catch {
      // ignore
    }
    return cleaned;
  }
  const wantsGuest = params.get('guest') === '1' || params.get('separate') === '1';
  const existing = window.localStorage.getItem(NAME_STORAGE_KEY)?.trim();
  if (existing && existing.length >= 2 && (!wantsGuest || existing.startsWith('СмартГерой-'))) {
    return existing.slice(0, 20);
  }
  const num = Math.floor(100 + Math.random() * 900);
  const generated = device === 'mobile' || wantsGuest ? `СмартГерой-${num}` : `Герой-${num}`;
  try {
    window.localStorage.setItem(NAME_STORAGE_KEY, generated);
  } catch {
    // ignore storage limits
  }
  return generated;
}

export function savePlayerNameLocal(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 20) || 'Мандрівник';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(NAME_STORAGE_KEY, cleaned);
    } catch {
      // ignore
    }
  }
  return cleaned;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private callbacks: MultiplayerCallbacks;
  private disposed = false;
  private reconnectAttempts = 0;
  private reconnectTimer = 0;
  private pingTimer = 0;
  private wsWatchdogTimer = 0;
  private httpPollTimer = 0;
  private httpPollIntervalMs = 260;
  private httpSyncInFlight = false;
  private httpSinceSeq = 0;
  private httpErrors = 0;
  private transportMode: 'ws' | 'http' = 'ws';
  private latestStatePayload: Record<string, unknown> = {};
  private lastStateSentAt = 0;
  private lastSentSig = '';

  public selfId: string | null = null;
  public readonly sessionId: string;
  public connected = false;
  public pingMs: number | null = null;
  public readonly device: DeviceKind;
  public playerName: string;

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
    this.device = detectDeviceKind();
    this.playerName = getOrCreatePlayerName(this.device);
    this.sessionId = getOrCreateTabSessionId();
  }

  public connect(initialState?: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    hp: number;
    maxHp: number;
    level: number;
    weapon: WeaponId;
    blocking: boolean;
    inWater: boolean;
    armor: boolean;
    aegis: boolean;
    gameMode: GameMode;
    zoneName: string;
  }) {
    if (this.disposed || typeof window === 'undefined') return;
    if (initialState) {
      this.latestStatePayload = { ...initialState };
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws/game`;

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      // If WebSocket upgrade is blocked by preview/mobile proxy, fall back to HTTP real-time sync after 1.6s
      window.clearTimeout(this.wsWatchdogTimer);
      this.wsWatchdogTimer = window.setTimeout(() => {
        if (this.disposed) return;
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.activateHttpFallback();
        }
      }, 1600);

      ws.onopen = () => {
        if (this.disposed || this.ws !== ws) return;
        window.clearTimeout(this.wsWatchdogTimer);
        this.stopHttpFallback();
        this.transportMode = 'ws';
        this.connected = true;
        this.reconnectAttempts = 0;
        this.callbacks.onConnectionChange(true);
        this.sendRaw({
          type: 'hello',
          sessionId: this.sessionId,
          name: this.playerName,
          device: this.device,
          ...this.latestStatePayload,
        });
        this.sendRaw({ type: 'ping', ts: Date.now() });
        window.clearInterval(this.pingTimer);
        this.pingTimer = window.setInterval(() => {
          this.sendRaw({ type: 'ping', ts: Date.now() });
        }, 3500);
      };

      ws.onmessage = (ev) => {
        if (this.disposed || typeof ev.data !== 'string') return;
        try {
          const msg = JSON.parse(ev.data) as ServerMessage;
          this.dispatchServerMessage(msg);
        } catch {
          // Ignore malformed server packet
        }
      };

      ws.onclose = () => {
        window.clearTimeout(this.wsWatchdogTimer);
        if (this.ws === ws) this.ws = null;
        window.clearInterval(this.pingTimer);
        if (this.disposed) return;

        // Immediately switch to HTTP sync so mobile/shared-link players never get stuck offline
        if (this.transportMode === 'ws') {
          this.activateHttpFallback();
        }
        const delay = Math.min(40000, 8000 * Math.pow(1.6, this.reconnectAttempts++));
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
      };

      ws.onerror = () => {
        // Handled via watchdog / onclose
      };
    } catch {
      if (!this.disposed) {
        this.activateHttpFallback();
      }
    }
  }

  private dispatchServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'welcome':
        this.selfId = msg.selfId;
        this.callbacks.onWelcome(msg);
        break;
      case 'players:snapshot':
        this.callbacks.onPlayersSnapshot(msg.players);
        break;
      case 'player:join':
        this.callbacks.onPlayerJoin(msg.player);
        break;
      case 'player:leave':
        this.callbacks.onPlayerLeave(msg.id, msg.name);
        break;
      case 'player:action':
        this.callbacks.onPlayerAction(msg);
        break;
      case 'build:add':
        this.callbacks.onBuildAdd(msg.structure, msg.byName);
        break;
      case 'build:remove':
        this.callbacks.onBuildRemove(msg.id, msg.byName);
        break;
      case 'world:env':
        this.callbacks.onWorldEnv(msg.season, msg.weather, msg.byName);
        break;
      case 'mob:spawn':
        this.callbacks.onMobSpawn(msg.kind, msg.x, msg.z, msg.byName);
        break;
      case 'chat:msg':
        this.callbacks.onChatMessage(msg.item);
        break;
      case 'pong': {
        const rtt = Math.max(1, Math.min(9999, Math.round(Date.now() - msg.ts)));
        this.pingMs = rtt;
        this.callbacks.onPingChange?.(rtt);
        break;
      }
    }
  }

  private scheduleHttpPoll() {
    window.clearTimeout(this.httpPollTimer);
    if (this.disposed || this.transportMode !== 'http') return;
    this.httpPollTimer = window.setTimeout(() => {
      void this.runHttpSyncTick();
    }, this.httpPollIntervalMs);
  }

  private activateHttpFallback() {
    if (this.disposed) return;
    if (this.transportMode === 'http' && this.httpPollTimer) return;
    this.transportMode = 'http';
    this.selfId = null;
    this.httpSinceSeq = 0;
    this.httpErrors = 0;
    this.httpPollIntervalMs = 260;
    void this.runHttpSyncTick();
  }

  private stopHttpFallback() {
    window.clearTimeout(this.httpPollTimer);
    this.httpPollTimer = 0;
    this.httpSyncInFlight = false;
  }

  private async runHttpSyncTick() {
    if (this.disposed || this.transportMode !== 'http' || this.httpSyncInFlight) return;
    this.httpSyncInFlight = true;
    const tStart = performance.now();
    try {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 3500);
      const res = await fetch('/api/online/sync', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          id: this.selfId ?? undefined,
          sessionId: this.sessionId,
          sinceSeq: this.httpSinceSeq,
          name: this.playerName,
          device: this.device,
          ...this.latestStatePayload,
        }),
      });
      window.clearTimeout(t);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        ok?: boolean;
        selfId?: string;
        isFirstJoin?: boolean;
        worldSeed?: number;
        season?: SeasonId;
        weather?: WeatherId;
        players?: OnlinePlayerState[];
        latestSeq?: number;
        events?: ServerMessage[];
        builtStructures?: BuiltStructureData[];
        chatHistory?: OnlineChatMessage[];
      };

      const rtt = Math.max(1, Math.min(9999, Math.round(performance.now() - tStart)));
      this.pingMs = rtt;
      this.callbacks.onPingChange?.(rtt);

      this.httpErrors = 0;
      if (!this.connected) {
        this.connected = true;
        this.callbacks.onConnectionChange(true);
      }

      if (typeof data.latestSeq === 'number') {
        this.httpSinceSeq = data.latestSeq;
      }

      const playerCount = Array.isArray(data.players) ? data.players.length : 1;
      this.httpPollIntervalMs = playerCount > 1 ? 105 : 600;

      if (data.isFirstJoin && data.selfId) {
        this.selfId = data.selfId;
        this.callbacks.onWelcome({
          type: 'welcome',
          selfId: data.selfId,
          worldSeed: Number(data.worldSeed ?? 42069),
          season: (data.season ?? 'summer') as SeasonId,
          weather: (data.weather ?? 'clear') as WeatherId,
          players: data.players ?? [],
          builtStructures: data.builtStructures ?? [],
          chatHistory: data.chatHistory ?? [],
        });
      } else {
        if (data.selfId) this.selfId = data.selfId;
        if (Array.isArray(data.players)) {
          this.callbacks.onPlayersSnapshot(data.players);
        }
        if (Array.isArray(data.events)) {
          for (const ev of data.events) {
            this.dispatchServerMessage(ev);
          }
        }
      }
    } catch {
      this.httpErrors++;
      if (this.httpErrors >= 5 && this.connected) {
        this.connected = false;
        this.pingMs = null;
        this.callbacks.onPingChange?.(null);
        this.callbacks.onConnectionChange(false);
      }
    } finally {
      this.httpSyncInFlight = false;
      this.scheduleHttpPoll();
    }
  }

  public setName(nextName: string): string {
    this.playerName = savePlayerNameLocal(nextName);
    this.lastSentSig = '';
    this.latestStatePayload.name = this.playerName;
    if (this.transportMode === 'ws') {
      this.sendRaw({ type: 'state', name: this.playerName });
    } else {
      void this.runHttpSyncTick();
    }
    return this.playerName;
  }

  public sendPlayerState(state: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    vx: number;
    vz: number;
    hp: number;
    maxHp: number;
    level: number;
    weapon: WeaponId;
    blocking: boolean;
    inWater: boolean;
    armor: boolean;
    aegis: boolean;
    gameMode: GameMode;
    zoneName: string;
  }) {
    const compact = {
      name: this.playerName,
      x: Number(state.x.toFixed(3)),
      y: Number(state.y.toFixed(3)),
      z: Number(state.z.toFixed(3)),
      yaw: Number(state.yaw.toFixed(3)),
      vx: Number(state.vx.toFixed(2)),
      vz: Number(state.vz.toFixed(2)),
      hp: Math.round(state.hp),
      maxHp: Math.round(state.maxHp),
      level: state.level,
      weapon: state.weapon,
      blocking: state.blocking,
      inWater: state.inWater,
      armor: state.armor,
      aegis: state.aegis,
      gameMode: state.gameMode,
      zoneName: state.zoneName,
    };
    this.latestStatePayload = compact;

    if (!this.connected || this.transportMode !== 'ws' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const now = performance.now();
    const sig = `${state.x.toFixed(2)},${state.y.toFixed(2)},${state.z.toFixed(2)},${state.yaw.toFixed(2)},${state.weapon},${state.blocking ? 1 : 0},${Math.round(state.hp)},${state.level},${state.inWater ? 1 : 0}`;
    const changed = sig !== this.lastSentSig;
    const minInterval = changed ? 65 : 800;
    if (now - this.lastStateSentAt < minInterval) return;

    this.lastStateSentAt = now;
    this.lastSentSig = sig;
    this.sendRaw({
      type: 'state',
      ...compact,
    });
  }

  public sendAction(payload: {
    weapon: WeaponId;
    x: number;
    y: number;
    z: number;
    yaw: number;
    actionKind: 'swing' | 'slam' | 'shoot' | 'punch';
  }) {
    this.sendRaw({ type: 'action', ...payload });
  }

  public sendBuildAdd(structure: BuiltStructureData) {
    this.sendRaw({ type: 'build:add', structure });
  }

  public sendBuildRemove(id: string) {
    this.sendRaw({ type: 'build:remove', id });
  }

  public sendWorldEnv(season: SeasonId, weather: WeatherId) {
    this.sendRaw({ type: 'world:env', season, weather });
  }

  public sendMobSpawn(kind: MobKind, x: number, z: number) {
    this.sendRaw({ type: 'mob:spawn', kind, x, z });
  }

  public sendChat(text: string) {
    const trimmed = text.trim().slice(0, 160);
    if (!trimmed) return;
    this.sendRaw({ type: 'chat', text: trimmed });
  }

  private sendRaw(payload: Record<string, unknown>) {
    if (this.transportMode === 'ws' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
        return;
      } catch {
        // fallback below if transient error
      }
    }
    if (this.transportMode === 'http' && this.selfId && payload.type !== 'ping' && payload.type !== 'hello' && payload.type !== 'state') {
      void fetch('/api/online/event', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: this.selfId, ...payload }),
      }).catch(() => {});
    }
  }

  public dispose() {
    this.disposed = true;
    window.clearInterval(this.pingTimer);
    window.clearTimeout(this.reconnectTimer);
    window.clearTimeout(this.wsWatchdogTimer);
    this.stopHttpFallback();
    if ((this.selfId || this.sessionId) && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob(
          [JSON.stringify({ id: this.selfId ?? '', sessionId: this.sessionId })],
          { type: 'application/json' },
        );
        navigator.sendBeacon('/api/online/leave', blob);
      } catch {
        // ignore
      }
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}

export type QuickPotionOption = {
  id: ConsumableId;
  count: number;
};
