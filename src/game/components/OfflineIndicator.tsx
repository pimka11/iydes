import React, { useEffect, useState } from 'react';
import { getUiStrings } from '../i18n';
import { LanguageCode } from '../types';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC<{ language?: LanguageCode }> = ({ language }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  const s = getUiStrings(language);

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-white/92 dark:bg-slate-950/90 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200 shadow-lg backdrop-blur-md">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      {s.offlineBanner}
    </div>
  );
};
