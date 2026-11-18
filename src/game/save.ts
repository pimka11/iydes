import { SaveGameData } from './types';

export const SAVE_STORAGE_KEY = 'dolina_blokiv_save_v3';

export function generateRandomSeed(): number {
  return Math.floor(100000 + Math.random() * 899999999);
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
    return parsed as SaveGameData;
  } catch {
    return null;
  }
}

export function saveGameToStorage(data: SaveGameData): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedGame(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
