import React, { useState } from 'react';
import { Smartphone, Download, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onModalOpenChange?: (open: boolean) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onModalOpenChange }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const isPrivatePreviewHost =
    typeof window !== 'undefined' && /^ais-(dev|pre)-/i.test(window.location.hostname);

  const toggleGuide = (open: boolean) => {
    setShowGuide(open);
    onModalOpenChange?.(open);
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (isInstallable && !isPrivatePreviewHost) {
      const ok = await install();
      if (!ok) toggleGuide(true);
    } else {
      toggleGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClick}
        title="Встановити гру на телефон / APK"
        className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-2.5 text-xs font-semibold text-emerald-200 whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-500/30"
      >
        {isInstallable && !isPrivatePreviewHost ? (
          <Download className="h-3.5 w-3.5" />
        ) : (
          <Smartphone className="h-3.5 w-3.5" />
        )}
        <span>На телефон</span>
      </button>

      {showGuide && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950 p-5 text-slate-200 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-400" />
                <h3 className="font-display text-base font-bold text-white">
                  Гра на телефон і готовий APK
                </h3>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleGuide(false)}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isPrivatePreviewHost && (
              <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-400/40 bg-amber-500/12 p-3 text-xs leading-relaxed text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-200">
                    Чому Chrome пише «Помилка встановлення»:
                  </p>
                  <p className="mt-1 text-amber-100/90">
                    Це приватне посилання (<span className="font-mono">ais-pre / ais-dev</span>)
                    закрите входом Google. Сервер встановлення Android (WebAPK) не може завантажити
                    іконки без логіна, тому видає помилку.
                  </p>
                </div>
              </div>
            )}

            {isIOS ? (
              <div className="space-y-2 text-xs leading-relaxed text-slate-300">
                <p className="font-semibold text-white">Для iPhone / iPad (Safari):</p>
                <p>1. Натисніть <strong>Поділитися</strong> у нижній панелі Safari.</p>
                <p>2. Оберіть <strong>«На початковий екран»</strong>.</p>
                <p className="text-emerald-300">
                  Після відкриття гра запуститься одразу у повноекранному режимі.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs leading-relaxed text-slate-300">
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                  <p className="font-semibold text-emerald-200">
                    Варіант 1 (працює прямо зараз без помилок):
                  </p>
                  <p className="mt-1">
                    У Chrome на телефоні: <strong>⋮ (Меню) → «Додати на головний екран» → «Створити ярлик»</strong> (не «Встановити»). Після відкриття натисніть кнопку повного екрана{' '}
                    <span className="font-semibold text-white">⛶</span> у грі!
                  </p>
                </div>

                <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3">
                  <p className="font-semibold text-sky-200 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Варіант 2 (як отримати чистий .APK без помилки):
                  </p>
                  <p className="mt-1">
                    1. У Google AI Studio натисніть <strong>Deploy / Опублікувати</strong> (іконка ракети) — отримаєте відкрите публічне посилання <span className="font-mono text-sky-300">*.run.app</span> без входу Google.<br />
                    2. Відкрийте це нове посилання на телефоні й натисніть <strong>«Встановити додаток»</strong> (або вставте його на <span className="font-mono text-sky-300">pwabuilder.com</span> → <strong>Android → .APK</strong>).
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleGuide(false)}
              className="mt-4 w-full rounded-xl bg-emerald-500 py-2.5 font-display text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Зрозуміло
            </button>
          </div>
        </div>
      )}
    </>
  );
};
