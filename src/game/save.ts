import {
  clearSqlSave,
  fetchSqlSave,
  fetchSqlSettings,
  pushSqlSave,
  pushSqlSettings,
} from '../db/sqlClient';
import {
  createDefaultConsumables,
  DEFAULT_GRAPHICS_SETTINGS,
  GraphicsSettings,
  SaveGameData,
  ThemeMode,
} from './types';

export const SAVE_STORAGE_KEY = 'dolina_blokiv_save_v3';
export const PROFILE_STORAGE_KEY = 'dolina_blokiv_profile_id_v1';
export const THEME_STORAGE_KEY = 'dolina_blokiv_theme_v1';
export const GRAPHICS_STORAGE_KEY = 'dolina_blokiv_graphics_v1';

export function getClientProfileId(): string {
  if (typeof window === 'undefined' || !window.localStorage) return 'primary';
  const params = new URLSearchParams(window.location.search);
  const wantsGuest = params.get('guest') === '1' || params.get('separate') === '1';
  const guestSessionKey = 'dolina_guest_profile_assigned_v1';
  let existing = window.localStorage.getItem(PROFILE_STORAGE_KEY);

  if (wantsGuest && (!existing || existing === 'primary') && !window.sessionStorage?.getItem(guestSessionKey)) {
    const guestId = `hero_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, guestId);
      window.sessionStorage?.setItem(guestSessionKey, guestId);
    } catch {
      // ignore
    }
    return guestId;
  }

  if (existing && existing.length >= 2) return existing;
  // Preserve existing single-player SQL save row when upgrading an existing browser
  const hasLegacyLocalSave = !wantsGuest && Boolean(window.localStorage.getItem(SAVE_STORAGE_KEY));
  const id = hasLegacyLocalSave
    ? 'primary'
    : `hero_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, id);
    if (wantsGuest) window.sessionStorage?.setItem(guestSessionKey, id);
  } catch {
    // ignore
  }
  return id;
}

export function generateRandomSeed(): number {
  return Math.floor(100000 + Math.random() * 899999999);
}

function normalizeSave(raw: Partial<SaveGameData>): SaveGameData {
  return {
    ...(raw as SaveGameData),
    gameMode: raw.gameMode ?? 'survival',
    cameraViewMode: raw.cameraViewMode ?? 'third',
    consumables: {
      ...createDefaultConsumables(),
      ...(raw.consumables ?? {}),
    },
  };
}

export function loadSavedGame(): SaveGameData | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveGameData>;
    if (
      !parsed ||
      parsed.version !== 3 ||
      typeof parsed.worldSeed !== 'number' ||
      !Number.isFinite(parsed.px) ||
      !Number.isFinite(parsed.pz) ||
      typeof parsed.hp !== 'number'
    ) {
      return null;
    }
    return normalizeSave(parsed);
  } catch {
    return null;
  }
}

export function saveGameToStorage(data: SaveGameData): boolean {
  let ok = false;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
      ok = true;
    } catch {
      ok = false;
    }
  }
  void pushSqlSave(data, getClientProfileId());
  return ok;
}

export function clearSavedGame(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  void clearSqlSave(getClientProfileId());
}

export async function loadSavedGameFromSql(): Promise<SaveGameData | null> {
  const sqlSave = await fetchSqlSave(getClientProfileId());
  if (!sqlSave) return null;
  const normalized = normalizeSave(sqlSave);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore localStorage quota
    }
  }
  return normalized;
}

export function loadLocalTheme(): ThemeMode {
  if (typeof window === 'undefined' || !window.localStorage) return 'dark';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function loadLocalGraphicsSettings(): GraphicsSettings {
  if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_GRAPHICS_SETTINGS };
  try {
    const raw = window.localStorage.getItem(GRAPHICS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GRAPHICS_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GraphicsSettings>;
    return { ...DEFAULT_GRAPHICS_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_GRAPHICS_SETTINGS };
  }
}

export function saveAppPreferences(theme: ThemeMode, graphics: GraphicsSettings): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      window.localStorage.setItem(GRAPHICS_STORAGE_KEY, JSON.stringify(graphics));
    } catch {
      // ignore
    }
  }
  void pushSqlSettings(theme, graphics);
}

export async function hydratePreferencesFromSql(): Promise<{
  theme: ThemeMode;
  graphics: GraphicsSettings;
}> {
  const localTheme = loadLocalTheme();
  const localGfx = loadLocalGraphicsSettings();
  const remote = await fetchSqlSettings();
  if (!remote) {
    return { theme: localTheme, graphics: localGfx };
  }
  const mergedTheme = remote.theme ?? localTheme;
  const mergedGfx = { ...localGfx, ...(remote.graphics ?? {}) };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mergedTheme);
      window.localStorage.setItem(GRAPHICS_STORAGE_KEY, JSON.stringify(mergedGfx));
    } catch {
      // ignore
    }
  }
  return { theme: mergedTheme, graphics: mergedGfx };
}
