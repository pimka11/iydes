import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

const isPrivateAiStudioPreview =
  typeof window !== 'undefined' && /^ais-(dev|pre)-/i.test(window.location.hostname);

if (isPrivateAiStudioPreview) {
  // Private AI Studio preview hosts sit behind Google Auth, which causes Chrome's
  // cloud WebAPK installer to fail with an install error. Keep home-screen shortcuts
  // clean by detaching the manifest & clearing any cached preview SW here;
  // full WebAPK + offline PWA activates automatically once deployed publicly.
  document.querySelector('link[rel="manifest"]')?.remove();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      if (regs.length > 0) {
        await Promise.all(regs.map((r) => r.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        window.location.reload();
      }
    });
  }
} else {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(<App />);
