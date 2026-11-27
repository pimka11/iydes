import { GraphicsSettings, LanguageCode, SaveGameData, ThemeMode } from '../game/types';

export interface SqlColumnMeta {
  cid?: number;
  name: string;
  type: string;
  notnull: boolean;
  dflt_value?: unknown;
  pk: boolean;
}

export interface SqlTableSummary {
  name: string;
  rowCount: number;
  createSql: string;
  columns: SqlColumnMeta[];
}

export interface SqlOverviewResponse {
  dbName: string;
  engine: string;
  fileSizeBytes: number;
  tables: SqlTableSummary[];
}

export interface SqlTableDataResponse {
  table: string;
  columns: SqlColumnMeta[];
  rows: Record<string, unknown>[];
  totalRows: number;
  page: number;
  limit: number;
}

export interface SqlQueryResult {
  ok: boolean;
  columns?: string[];
  rows?: unknown[][];
  changes?: number;
  durationMs?: number;
  error?: string;
}

export async function fetchSqlSave(profileId?: string): Promise<SaveGameData | null> {
  try {
    const qs = profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
    const res = await fetch(`/api/save${qs}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { save?: SaveGameData | null };
    return json.save ?? null;
  } catch {
    return null;
  }
}

export async function pushSqlSave(data: SaveGameData, profileId?: string): Promise<boolean> {
  try {
    const qs = profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
    const res = await fetch(`/api/save${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearSqlSave(profileId?: string): Promise<void> {
  try {
    const qs = profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
    await fetch(`/api/save${qs}`, { method: 'DELETE' });
  } catch {
    // Offline fallback
  }
}

export async function fetchSqlSettings(): Promise<{
  theme?: ThemeMode;
  graphics?: Partial<GraphicsSettings>;
} | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return null;
    const json = (await res.json()) as { settings?: Record<string, string> };
    const map = json.settings;
    if (!map) return null;
    const theme: ThemeMode = map.theme === 'light' ? 'light' : 'dark';
    const preset = (map.graphics_preset as GraphicsSettings['preset']) || 'high';
    const renderScale = Number(map.render_scale) || 1;
    const shadowQuality = (map.shadow_quality as GraphicsSettings['shadowQuality']) || '1k';
    const grassDensity = Number(map.grass_density) || 0.75;
    const viewDistance = (map.view_distance as GraphicsSettings['viewDistance']) || 'far';
    const dofEnabled = map.dof_enabled === '1';
    const bloomEnabled = map.bloom_enabled === '1';
    const ecoMode = map.eco_mode === '1';
    const rawLang = map.language;
    const language: LanguageCode =
      rawLang === 'en' || rawLang === 'es' || rawLang === 'pl' || rawLang === 'ru' ? rawLang : 'uk';
    return {
      theme,
      graphics: {
        preset,
        renderScale: ([0.65, 0.85, 1, 1.25].includes(renderScale) ? renderScale : 1) as GraphicsSettings['renderScale'],
        shadowQuality,
        grassDensity: ([0.25, 0.5, 0.75, 1].includes(grassDensity) ? grassDensity : 0.75) as GraphicsSettings['grassDensity'],
        viewDistance,
        dofEnabled,
        bloomEnabled,
        ecoMode,
        language,
      },
    };
  } catch {
    return null;
  }
}

export async function pushSqlSettings(
  theme: ThemeMode,
  graphics: GraphicsSettings,
): Promise<void> {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme,
        graphics_preset: graphics.preset,
        render_scale: String(graphics.renderScale),
        shadow_quality: graphics.shadowQuality,
        grass_density: String(graphics.grassDensity),
        view_distance: graphics.viewDistance,
        dof_enabled: graphics.dofEnabled ? '1' : '0',
        bloom_enabled: graphics.bloomEnabled ? '1' : '0',
        eco_mode: graphics.ecoMode ? '1' : '0',
        language: graphics.language ?? 'uk',
      }),
    });
  } catch {
    // Offline fallback
  }
}

export async function fetchSqlOverview(): Promise<SqlOverviewResponse> {
  const res = await fetch('/api/sql/tables');
  if (!res.ok) throw new Error('Не вдалося отримати список таблиць SQL');
  return (await res.json()) as SqlOverviewResponse;
}

export async function fetchSqlTableData(
  table: string,
  opts: { page?: number; limit?: number; search?: string; sortCol?: string; sortDir?: 'ASC' | 'DESC' } = {},
): Promise<SqlTableDataResponse> {
  const params = new URLSearchParams();
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.search) params.set('search', opts.search);
  if (opts.sortCol) params.set('sortCol', opts.sortCol);
  if (opts.sortDir) params.set('sortDir', opts.sortDir);
  const res = await fetch(`/api/sql/table/${encodeURIComponent(table)}?${params.toString()}`);
  if (!res.ok) throw new Error('Не вдалося завантажити дані таблиці');
  return (await res.json()) as SqlTableDataResponse;
}

export async function insertSqlTableRow(
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`/api/sql/table/${encodeURIComponent(table)}/row`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'Помилка вставки рядка');
  }
}

export async function deleteSqlTableRow(table: string, rowid: number): Promise<void> {
  const res = await fetch(`/api/sql/table/${encodeURIComponent(table)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rowid }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'Помилка видалення рядка');
  }
}

export async function executeSqlQuery(sql: string): Promise<SqlQueryResult> {
  const res = await fetch('/api/sql/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
  return (await res.json()) as SqlQueryResult;
}

export async function fetchSqlExportText(): Promise<string> {
  const res = await fetch('/api/sql/export');
  if (!res.ok) throw new Error('Помилка експорту SQL');
  return await res.text();
}
