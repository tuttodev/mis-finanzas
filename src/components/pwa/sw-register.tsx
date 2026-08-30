'use client';

import { useEffect } from 'react';
import { captureAnalytics } from '@/lib/analytics';

export function ServiceWorkerRegister() {
  useEffect(() => {
    const handleInstallPrompt = () => captureAnalytics('pwa_install_prompt_shown');
    const handleInstalled = () => captureAnalytics('pwa_installed');
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {
          // Registration failures (e.g. unsupported browser) are non-fatal
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  return null;
}
