// app/components/PWARegister.jsx
'use client';
import { useEffect, useRef } from 'react';

export default function PWARegister() {
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const pingActiveSW = () => {
      // Ping the active SW so you can see its version in console
      if (navigator.serviceWorker.controller) {
        const mc = new MessageChannel();
        mc.port1.onmessage = (e) => console.log('[SW] ping reply:', e.data);
        navigator.serviceWorker.controller.postMessage({ type: 'PING' }, [mc.port2]);
      }
    };

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // When a new service worker is found, ask it to activate ASAP
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && reg.waiting) {
              // Tell the waiting SW to skip waiting (activate immediately)
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // If we already have a waiting SW (e.g., after refresh), activate it
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

        // One-time auto-reload when the new SW takes control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloadedRef.current) return;
          reloadedRef.current = true;
          window.location.reload();
        });

        // Optional: listen to SW messages for version/debug info
        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e?.data?.type === 'VERSION') {
            console.log('[SW] version:', e.data.version);
          }
        });

        // Ping once ready (ensures controller exists)
        navigator.serviceWorker.ready.then(() => {
          pingActiveSW();
        });

      } catch (err) {
        console.error('SW registration failed:', err);
      }
    };

    register();
  }, []);

  return null; // no UI
}
