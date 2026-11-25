import React, { useState } from 'react';
import { Smartphone, Download, X, AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { CLIENT_APP_LABEL } from '../../version';

interface PWAInstallButtonProps {
  onModalOpenChange?: (open: boolean) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onModalOpenChange }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const copyGameUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?v=${CLIENT_APP_LABEL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClick}
        title="Встановити гру на телефон / APK"
        className="flex h-7 sm:h-8 items-center gap-1 rounded-lg sm:rounded-xl border border-emerald-500/45 bg-emerald-500/15 px-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-500/25 backdrop-blur-md"
      >
        {isInstallable && !isPrivatePreviewHost ? (
          <Download className="h-3.5 w-3.5" />
        ) : (
          <Smartphone className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">На телефон</span>
      </button>

      {showGuide && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950 p-5 text-slate-800 dark:text-slate-200 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Як відкривати на телефоні / зробити APK
                </h3>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleGuide(false)}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isPrivatePreviewHost && (
              <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/12 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Чому не ставилось раніше:
                  </p>
                  <p className="mt-1 opacity-90">
                    Посилання <span className="font-mono">ais-pre / ais-dev</span> закрите входом Google, тому Android не може звантажити файл встановлення без логіна. Авто-встановлення WebAPK на цьому приватному посиланні вимкнено, щоб ярлик додавався без помилки.
                  </p>
                </div>
              </div>
            )}

            {isIOS ? (
              <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">Для iPhone / iPad (Safari):</p>
                <p>1. Натисніть <strong>Поділитися</strong> у нижній панелі Safari.</p>
                <p>2. Оберіть <strong>«На початковий екран»</strong>.</p>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                    1. Іконка на екран телефону (без помилок):
                  </p>
                  <p className="mt-1">
                    У Chrome на телефоні: <strong>⋮ (Меню) → «Додати на головний екран»</strong>.
                    Тепер на цьому посиланні створиться робочий ярлик, а кнопка{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">⛶</span> у грі розгорне її на весь екран.
                  </p>
                </div>

                <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 p-3">
                  <p className="font-semibold text-sky-800 dark:text-sky-200 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    2. Отримати справжній .APK файл (найпростіше):
                  </p>
                  <p className="mt-1">
                    1. У Google AI Studio натисніть <strong>Deploy</strong> (іконка ракети вгорі праворуч) — з’явиться відкрите посилання <span className="font-mono text-sky-700 dark:text-sky-300">*.run.app</span> без пароля Google.<br />
                    2. Вставте те публічне посилання на{' '}
                    <span className="font-mono text-sky-700 dark:text-sky-300">pwabuilder.com</span> або{' '}
                    <span className="font-mono text-sky-700 dark:text-sky-300">webintoapp.com</span> — і завантажте готовий <strong>.apk</strong> файл!
                  </p>
                </div>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void copyGameUrl()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-slate-900 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-700 dark:text-emerald-300">Посилання скопійовано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Скопіювати посилання гри</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleGuide(false)}
              className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 font-display text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Зрозуміло
            </button>
          </div>
        </div>
      )}
    </>
  );
};
