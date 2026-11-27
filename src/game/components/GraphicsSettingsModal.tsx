import React from 'react';
import {
  Eye,
  Gauge,
  Globe,
  Monitor,
  Moon,
  RotateCcw,
  Sparkles,
  Sun,
  Trees,
  X,
} from 'lucide-react';
import {
  DEFAULT_GRAPHICS_SETTINGS,
  GraphicsPreset,
  GraphicsSettings,
  LanguageCode,
  ShadowQualitySetting,
  ThemeMode,
  ViewDistanceSetting,
} from '../types';
import { getPresetInfo, getUiStrings, LANGUAGE_OPTIONS } from '../i18n';

interface GraphicsSettingsModalProps {
  open: boolean;
  theme: ThemeMode;
  settings: GraphicsSettings;
  onChangeTheme: (next: ThemeMode) => void;
  onChangeSettings: (next: GraphicsSettings) => void;
  onClose: () => void;
}

const PRESET_PATCHES: Record<GraphicsPreset, Partial<GraphicsSettings>> = {
  low: {
    preset: 'low',
    renderScale: 0.65,
    shadowQuality: 'off',
    grassDensity: 0.25,
    viewDistance: 'near',
    dofEnabled: false,
    bloomEnabled: false,
    ecoMode: false,
  },
  medium: {
    preset: 'medium',
    renderScale: 0.85,
    shadowQuality: '1k',
    grassDensity: 0.5,
    viewDistance: 'medium',
    dofEnabled: false,
    bloomEnabled: false,
    ecoMode: false,
  },
  high: {
    preset: 'high',
    renderScale: 1,
    shadowQuality: '1k',
    grassDensity: 0.75,
    viewDistance: 'far',
    dofEnabled: false,
    bloomEnabled: false,
    ecoMode: false,
  },
  ultra: {
    preset: 'ultra',
    renderScale: 1.25,
    shadowQuality: '2k',
    grassDensity: 1,
    viewDistance: 'far',
    dofEnabled: true,
    bloomEnabled: true,
    ecoMode: false,
  },
};

export const GraphicsSettingsModal: React.FC<GraphicsSettingsModalProps> = ({
  open,
  theme,
  settings,
  onChangeTheme,
  onChangeSettings,
  onClose,
}) => {
  if (!open) return null;

  const lang: LanguageCode = settings.language ?? 'uk';
  const ui = getUiStrings(lang);
  const keepFocus = (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault();

  const applyPreset = (preset: GraphicsPreset) => {
    onChangeSettings({
      ...settings,
      ...PRESET_PATCHES[preset],
    });
  };

  const activePresetInfo = getPresetInfo(lang, settings.preset);

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-900/45 dark:bg-slate-950/78 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/15 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
              <Monitor className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {ui.gfxTitle}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {ui.gfxSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={onClose}
            title={ui.closeLabel}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Language Switcher (5 Languages: UK, EN, ES, PL, RU) */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Globe className="h-3.5 w-3.5 text-sky-500" />
              <span>{ui.languageLabel}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = lang === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseDown={keepFocus}
                    onClick={() => onChangeSettings({ ...settings, language: opt.id })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors ${
                      active
                        ? 'border-sky-500 bg-sky-500 text-slate-950 shadow-sm'
                        : 'border-slate-200 dark:border-white/12 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono-nums text-[10px] opacity-75">{opt.short}</span>
                    <span>{opt.native}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Switcher */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {ui.themeSection}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => onChangeTheme('light')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                  theme === 'light'
                    ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm'
                    : 'border-slate-200 dark:border-white/12 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span>{ui.lightTheme}</span>
              </button>
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => onChangeTheme('dark')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                  theme === 'dark'
                    ? 'border-sky-500 bg-sky-500 text-slate-950 shadow-sm'
                    : 'border-slate-200 dark:border-white/12 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span>{ui.darkTheme}</span>
              </button>
            </div>
          </div>

          {/* Quality Presets */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {ui.presetSection}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'ultra'] as GraphicsPreset[]).map((key) => {
                const active = settings.preset === key;
                const info = getPresetInfo(lang, key);
                return (
                  <button
                    key={key}
                    type="button"
                    onMouseDown={keepFocus}
                    onClick={() => applyPreset(key)}
                    title={info.desc}
                    className={`rounded-xl border px-3 py-2 text-center text-xs font-bold transition-colors ${
                      active
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                        : 'border-slate-200 dark:border-white/12 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              {activePresetInfo.desc}
            </p>
          </div>

          {/* Render Scale */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {ui.renderScaleLabel}
              </span>
              <span className="font-mono-nums font-bold text-sky-600 dark:text-sky-300">
                {Math.round(settings.renderScale * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([0.65, 0.85, 1, 1.25] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={() => onChangeSettings({ ...settings, renderScale: val })}
                  className={`font-mono-nums rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                    settings.renderScale === val
                      ? 'border-sky-500 bg-sky-500/18 text-sky-700 dark:text-sky-200'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {Math.round(val * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* Shadow Quality */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {ui.shadowQualityLabel}
              </span>
              <span className="font-mono-nums font-bold text-amber-600 dark:text-amber-300">
                {settings.shadowQuality === 'off' ? ui.offLabel : settings.shadowQuality.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'off', label: ui.shadowOff },
                  { id: '1k', label: '1K' },
                  { id: '2k', label: '2K' },
                  { id: '4k', label: '4K' },
                ] as { id: ShadowQualitySetting; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={() => onChangeSettings({ ...settings, shadowQuality: item.id })}
                  className={`rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                    settings.shadowQuality === item.id
                      ? 'border-amber-500 bg-amber-500/18 text-amber-700 dark:text-amber-200'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grass Density & View Distance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                  <Trees className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{ui.grassDensityLabel}</span>
                </span>
                <span className="font-mono-nums font-bold text-emerald-600 dark:text-emerald-300">
                  {Math.round(settings.grassDensity * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {([0.25, 0.5, 0.75, 1] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onMouseDown={keepFocus}
                    onClick={() => onChangeSettings({ ...settings, grassDensity: val })}
                    className={`font-mono-nums rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                      settings.grassDensity === val
                        ? 'border-emerald-500 bg-emerald-500/18 text-emerald-700 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {Math.round(val * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {ui.viewDistanceLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'near', label: ui.viewNear },
                    { id: 'medium', label: ui.viewMedium },
                    { id: 'far', label: ui.viewFar },
                  ] as { id: ViewDistanceSetting; label: string }[]
                ).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onMouseDown={keepFocus}
                    onClick={() => onChangeSettings({ ...settings, viewDistance: v.id })}
                    className={`rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                      settings.viewDistance === v.id
                        ? 'border-purple-500 bg-purple-500/18 text-purple-700 dark:text-purple-200'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={() =>
                onChangeSettings({ ...settings, dofEnabled: !settings.dofEnabled })
              }
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                settings.dofEnabled
                  ? 'border-sky-500/60 bg-sky-500/15 text-sky-700 dark:text-sky-200'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                <span>{ui.dofLabel}</span>
              </span>
              <span>{settings.dofEnabled ? ui.onLabel : ui.offLabel}</span>
            </button>

            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={() =>
                onChangeSettings({ ...settings, bloomEnabled: !settings.bloomEnabled })
              }
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                settings.bloomEnabled
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-200'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{ui.bloomLabel}</span>
              </span>
              <span>{settings.bloomEnabled ? ui.onLabel : ui.offLabel}</span>
            </button>

            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={() =>
                onChangeSettings({ ...settings, ecoMode: !settings.ecoMode })
              }
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                settings.ecoMode
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                <span>{ui.ecoModeLabel}</span>
              </span>
              <span>{settings.ecoMode ? ui.onLabel : ui.offLabel}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-4 py-3 sm:px-5">
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={() => onChangeSettings({ ...DEFAULT_GRAPHICS_SETTINGS, language: lang })}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/12 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{ui.recommendedBtn}</span>
          </button>
          <button
            type="button"
            onMouseDown={keepFocus}
            onClick={onClose}
            className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            {ui.doneBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
