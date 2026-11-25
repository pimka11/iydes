import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileCode2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Table2,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteSqlTableRow,
  executeSqlQuery,
  fetchSqlExportText,
  fetchSqlOverview,
  fetchSqlTableData,
  insertSqlTableRow,
  SqlColumnMeta,
  SqlOverviewResponse,
  SqlQueryResult,
  SqlTableDataResponse,
} from '../../db/sqlClient';

interface PhpMyAdminModalProps {
  open: boolean;
  onClose: () => void;
  onDatabaseMutated: () => void;
}

type AdminTab = 'browse' | 'structure' | 'sql' | 'insert' | 'export';

const PRESET_QUERIES: { label: string; sql: string }[] = [
  { label: 'Профіль гравця', sql: 'SELECT * FROM player_saves;' },
  { label: 'Ресурси', sql: 'SELECT * FROM player_resources;' },
  { label: 'Побудовані блоки', sql: 'SELECT id, kind, ROUND(x,1) AS x, ROUND(y,1) AS y, ROUND(z,1) AS z FROM built_structures LIMIT 50;' },
  { label: 'Квести', sql: 'SELECT * FROM quest_progress;' },
  { label: 'Налаштування', sql: 'SELECT * FROM app_settings;' },
  { label: '+500 монет гравцю', sql: 'UPDATE player_saves SET coins = coins + 500 WHERE id = 1;' },
  { label: '+25 Дерева і Каменя', sql: "UPDATE player_resources SET amount = amount + 25 WHERE resource_id IN ('wood','stone');" },
];

export const PhpMyAdminModal: React.FC<PhpMyAdminModalProps> = ({
  open,
  onClose,
  onDatabaseMutated,
}) => {
  const [overview, setOverview] = useState<SqlOverviewResponse | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('player_saves');
  const [activeTab, setActiveTab] = useState<AdminTab>('browse');
  const [tableData, setTableData] = useState<SqlTableDataResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');
  const [sqlInput, setSqlInput] = useState('SELECT * FROM player_saves;');
  const [sqlResult, setSqlResult] = useState<SqlQueryResult | null>(null);
  const [insertValues, setInsertValues] = useState<Record<string, string>>({});
  const [exportSql, setExportSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const ov = await fetchSqlOverview();
      setOverview(ov);
      if (ov.tables.length > 0 && !ov.tables.some((t) => t.name === selectedTable)) {
        setSelectedTable(ov.tables[0].name);
      }
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }, [selectedTable]);

  const loadBrowseData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const res = await fetchSqlTableData(selectedTable, {
        page,
        limit: 25,
        search: search.trim() || undefined,
        sortCol: sortCol || undefined,
        sortDir,
      });
      setTableData(res);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, search, sortCol, sortDir]);

  const loadExport = useCallback(async () => {
    setLoading(true);
    try {
      const text = await fetchSqlExportText();
      setExportSql(text);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadOverview();
  }, [open, loadOverview]);

  useEffect(() => {
    if (!open) return;
    if (activeTab === 'browse' || activeTab === 'structure' || activeTab === 'insert') {
      void loadBrowseData();
    } else if (activeTab === 'export') {
      void loadExport();
    }
  }, [open, activeTab, loadBrowseData, loadExport]);

  if (!open) return null;

  const activeTableMeta = overview?.tables.find((t) => t.name === selectedTable) ?? null;
  const activeColumns: SqlColumnMeta[] =
    activeTableMeta?.columns ?? tableData?.columns ?? [];

  const selectTable = (name: string) => {
    setSelectedTable(name);
    setPage(1);
    setSearch('');
    setSortCol('');
    setInsertValues({});
    setSqlInput(`SELECT * FROM ${name} LIMIT 50;`);
    setNotice(null);
    setErrorMsg(null);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortCol(col);
      setSortDir('ASC');
    }
  };

  const handleDeleteRow = async (rowid: unknown) => {
    if (typeof rowid !== 'number') return;
    try {
      await deleteSqlTableRow(selectedTable, rowid);
      setNotice(`Рядок #${rowid} видалено з ${selectedTable}`);
      await loadOverview();
      await loadBrowseData();
      onDatabaseMutated();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleRunSql = async (queryOverride?: string) => {
    const query = (queryOverride ?? sqlInput).trim();
    if (!query) return;
    if (queryOverride) setSqlInput(queryOverride);
    setLoading(true);
    try {
      const res = await executeSqlQuery(query);
      setSqlResult(res);
      if (res.ok) {
        setErrorMsg(null);
        const upper = query.toUpperCase();
        if (!upper.startsWith('SELECT') && !upper.startsWith('PRAGMA') && !upper.startsWith('EXPLAIN')) {
          setNotice(`Виконано успішно (змінено рядків: ${res.changes ?? 0})`);
          await loadOverview();
          onDatabaseMutated();
        }
      } else {
        setErrorMsg(res.error || 'Помилка виконання SQL');
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    for (const col of activeColumns) {
      const raw = insertValues[col.name];
      if (raw === undefined || raw === '') continue;
      if (/INT|REAL|NUM|FLOAT|DOUBLE/i.test(col.type) && !Number.isNaN(Number(raw))) {
        payload[col.name] = Number(raw);
      } else {
        payload[col.name] = raw;
      }
    }
    try {
      await insertSqlTableRow(selectedTable, payload);
      setNotice(`Новий запис додано до ${selectedTable}`);
      setInsertValues({});
      await loadOverview();
      setActiveTab('browse');
      await loadBrowseData();
      onDatabaseMutated();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleDownloadSql = () => {
    const content = exportSql;
    if (!content) return;
    const blob = new Blob([content], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dolina_blokiv.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = tableData ? Math.max(1, Math.ceil(tableData.totalRows / tableData.limit)) : 1;

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-900/55 dark:bg-slate-950/82 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-2xl">
        {/* Top phpMyAdmin Navbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 px-2.5 py-1 text-xs font-extrabold tracking-tight">
              <span className="text-sky-400">php</span>
              <span className="text-amber-400">MyAdmin</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Server className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-mono-nums font-semibold">localhost</span>
              <span>»</span>
              <Database className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-mono-nums font-bold text-slate-900 dark:text-white">
                {overview?.dbName ?? 'dolina_blokiv'}
              </span>
              {selectedTable && (
                <>
                  <span>»</span>
                  <Table2 className="h-3.5 w-3.5 text-sky-500" />
                  <span className="font-mono-nums font-semibold text-sky-700 dark:text-sky-300">
                    {selectedTable}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {overview && (
              <span className="hidden md:inline font-mono-nums rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300">
                {overview.engine} · {(overview.fileSizeBytes / 1024).toFixed(1)} KB
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                onDatabaseMutated();
                void loadOverview();
                void loadBrowseData();
                setNotice('Синхронізовано стан гри із SQL базою');
              }}
              className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/22"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Оновити світ із БД</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Закрити (Esc)"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Split Layout */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Left Database Tree Sidebar */}
          <aside className="flex md:w-60 shrink-0 flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/70 p-2">
            <div className="hidden md:flex items-center justify-between px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Таблиці ({overview?.tables.length ?? 0})</span>
              <button
                type="button"
                onClick={() => void loadOverview()}
                title="Оновити список таблиць"
                className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            {(overview?.tables ?? []).map((t) => {
              const active = t.name === selectedTable;
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => selectTable(t.name)}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                    active
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Table2 className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    <span className="font-mono-nums truncate">{t.name}</span>
                  </span>
                  <span
                    className={`font-mono-nums rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.rowCount}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Right Workspace Panel */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
            {/* Sub-Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'browse', label: 'Огляд', icon: Table2 },
                    { id: 'structure', label: 'Структура', icon: FileCode2 },
                    { id: 'sql', label: 'SQL', icon: Terminal },
                    { id: 'insert', label: 'Вставити', icon: Plus },
                    { id: 'export', label: 'Експорт', icon: Download },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        active
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {notice && (
                <span className="rounded-md border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {notice}
                </span>
              )}
              {errorMsg && (
                <span className="rounded-md border border-rose-500/40 bg-rose-500/12 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                  {errorMsg}
                </span>
              )}
            </div>

            {/* Tab Content */}
            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
              {activeTab === 'browse' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="relative flex-1 min-w-48 max-w-sm">
                      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        placeholder={`Пошук у таблиці ${selectedTable}...`}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 pr-3 pl-8 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-mono-nums">
                        Рядків: <strong>{tableData?.totalRows ?? 0}</strong>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="rounded border border-slate-300 dark:border-slate-700 p-1 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-mono-nums px-1.5">
                          {page}/{totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className="rounded border border-slate-300 dark:border-slate-700 p-1 disabled:opacity-40"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                          <th className="w-12 px-2.5 py-2 font-semibold text-slate-500">Дії</th>
                          {activeColumns.map((col) => (
                            <th
                              key={col.name}
                              onClick={() => handleSort(col.name)}
                              className="cursor-pointer whitespace-nowrap px-3 py-2 font-mono-nums font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                            >
                              {col.name}
                              {col.pk && <span className="ml-1 text-amber-500">PK</span>}
                              {sortCol === col.name && (
                                <span className="ml-1 text-sky-500">{sortDir === 'ASC' ? '▲' : '▼'}</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={activeColumns.length + 1} className="px-4 py-6 text-center text-slate-500">
                              Завантаження рядків...
                            </td>
                          </tr>
                        ) : !tableData || tableData.rows.length === 0 ? (
                          <tr>
                            <td colSpan={activeColumns.length + 1} className="px-4 py-6 text-center text-slate-500">
                              Таблиця порожня або немає збігів
                            </td>
                          </tr>
                        ) : (
                          tableData.rows.map((row, idx) => (
                            <tr
                              key={String(row.__rowid ?? idx)}
                              className="border-b border-slate-100 dark:border-slate-800/80 odd:bg-white dark:odd:bg-slate-950 even:bg-slate-50/70 dark:even:bg-slate-900/35 hover:bg-sky-50/60 dark:hover:bg-sky-950/30"
                            >
                              <td className="px-2.5 py-1.5">
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteRow(row.__rowid)}
                                  title="Видалити рядок"
                                  className="rounded p-1 text-rose-500 hover:bg-rose-500/15"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                              {activeColumns.map((col) => {
                                const val = row[col.name];
                                return (
                                  <td
                                    key={col.name}
                                    className="max-w-56 truncate whitespace-nowrap px-3 py-1.5 font-mono-nums text-slate-800 dark:text-slate-200"
                                    title={val === null ? 'NULL' : String(val)}
                                  >
                                    {val === null || val === undefined ? (
                                      <span className="italic text-slate-400">NULL</span>
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'structure' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                          <th className="px-3 py-2 font-bold">#</th>
                          <th className="px-3 py-2 font-bold">Стовпець</th>
                          <th className="px-3 py-2 font-bold">Тип</th>
                          <th className="px-3 py-2 font-bold">NULL</th>
                          <th className="px-3 py-2 font-bold">Ключ</th>
                          <th className="px-3 py-2 font-bold">За замовчуванням</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeColumns.map((col, idx) => (
                          <tr
                            key={col.name}
                            className="border-b border-slate-100 dark:border-slate-800/80"
                          >
                            <td className="px-3 py-2 font-mono-nums text-slate-500">{idx + 1}</td>
                            <td className="px-3 py-2 font-mono-nums font-bold text-slate-900 dark:text-white">
                              {col.name}
                            </td>
                            <td className="px-3 py-2 font-mono-nums text-sky-600 dark:text-sky-300">
                              {col.type || 'ANY'}
                            </td>
                            <td className="px-3 py-2">{col.notnull ? 'Ні (NOT NULL)' : 'Так'}</td>
                            <td className="px-3 py-2">
                              {col.pk ? (
                                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono-nums text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                  PRIMARY
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono-nums text-slate-500">
                              {col.dflt_value !== null && col.dflt_value !== undefined
                                ? String(col.dflt_value)
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {activeTableMeta?.createSql && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                        DDL Схема (CREATE TABLE)
                      </h4>
                      <pre className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-3 font-mono-nums text-[11px] leading-relaxed text-slate-800 dark:text-slate-200">
                        {activeTableMeta.createSql}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'sql' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_QUERIES.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => void handleRunSql(p.sql)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-sky-500 hover:text-sky-700 dark:hover:text-sky-300"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={sqlInput}
                      onChange={(e) => setSqlInput(e.target.value)}
                      rows={4}
                      spellCheck={false}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 font-mono-nums text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500"
                      placeholder="Введіть SQL-запит (SELECT, INSERT, UPDATE, DELETE)..."
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Підказка: запити UPDATE/DELETE автоматично зберігаються на диск та оновлюють гру
                      </span>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleRunSql()}
                        className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Виконати SQL</span>
                      </button>
                    </div>
                  </div>

                  {sqlResult && sqlResult.ok && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-300">
                        <span className="font-semibold">
                          Результат: {sqlResult.rows?.length ?? 0} рядків · Змінено: {sqlResult.changes ?? 0}
                        </span>
                        <span className="font-mono-nums text-slate-500">
                          ({sqlResult.durationMs ?? 0} мс)
                        </span>
                      </div>
                      {sqlResult.columns && sqlResult.columns.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                                {sqlResult.columns.map((c) => (
                                  <th key={c} className="px-3 py-2 font-mono-nums font-bold">
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(sqlResult.rows ?? []).map((r, rIdx) => (
                                <tr key={rIdx} className="border-b border-slate-100 dark:border-slate-800/80">
                                  {r.map((cell, cIdx) => (
                                    <td key={cIdx} className="max-w-64 truncate px-3 py-1.5 font-mono-nums">
                                      {cell === null || cell === undefined ? (
                                        <span className="italic text-slate-400">NULL</span>
                                      ) : (
                                        String(cell)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'insert' && (
                <form onSubmit={handleInsertSubmit} className="max-w-xl space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Вставити новий запис у таблицю <strong className="font-mono-nums">{selectedTable}</strong>:
                  </p>
                  <div className="space-y-2.5">
                    {activeColumns.map((col) => (
                      <div key={col.name} className="grid grid-cols-3 items-center gap-2 text-xs">
                        <label className="font-mono-nums font-semibold text-slate-700 dark:text-slate-200">
                          {col.name}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {col.type || 'TEXT'}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={insertValues[col.name] ?? ''}
                          onChange={(e) =>
                            setInsertValues((prev) => ({ ...prev, [col.name]: e.target.value }))
                          }
                          placeholder={
                            col.dflt_value !== null && col.dflt_value !== undefined
                              ? `За замовч.: ${col.dflt_value}`
                              : col.pk
                                ? 'Авто / значення'
                                : 'Значення...'
                          }
                          className="col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono-nums text-xs outline-none focus:border-sky-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Вставити рядок</span>
                  </button>
                </form>
              )}

              {activeTab === 'export' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Повний SQL-дамп бази даних <strong>{overview?.dbName ?? 'dolina_blokiv'}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadSql}
                      disabled={!exportSql}
                      className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Завантажити dolina_blokiv.sql</span>
                    </button>
                  </div>
                  <pre className="max-h-[55vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-3 font-mono-nums text-[11px] leading-relaxed text-slate-800 dark:text-slate-200">
                    {exportSql || 'Генерація SQL дампу...'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
