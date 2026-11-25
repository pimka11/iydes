import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { CLIENT_APP_VERSION } from './version';

const isPrivateAiStudioPreview =
  typeof window !== 'undefined' && /^ais-(dev|pre)-/i.test(window.location.hostname);

if (isPrivateAiStudioPreview) {
  document.querySelector('link[rel="manifest"]')?.remove();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      if (regs.length > 0) {
        await Promise.all(regs.map((r) => r.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        const purgeFlag = `dolina_sw_purged_${CLIENT_APP_VERSION}`;
        if (!sessionStorage.getItem(purgeFlag)) {
          sessionStorage.setItem(purgeFlag, '1');
          window.location.reload();
        }
      }
    });
  }
} else {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, reg) {
      if (reg) {
        void reg.update();
      }
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
