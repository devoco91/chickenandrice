'use client';
import { useEffect, useState, useRef } from 'react';

export default function InstallPWAButton({ className = '' }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredRef = useRef(null);

  useEffect(() => {
    // Detect iOS + standalone
    const ua = navigator.userAgent || '';
    setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );

    const onBeforeInstall = (e) => {
      // Some browsers can fire this more than once; ignore if we already saved it
      if (deferredRef.current) return;
      e.preventDefault();
      deferredRef.current = e;
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      deferredRef.current = null;
      setCanInstall(false);
      setIsStandalone(true);
      // console.log('[PWA] appinstalled');
    };

    const onVisibilityChange = () => {
      // After install, Chrome sometimes reloads; ensure we hide the button
      if (document.visibilityState === 'visible') {
        const standalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          window.navigator.standalone === true;
        setIsStandalone(standalone);
        if (standalone) {
          deferredRef.current = null;
          setCanInstall(false);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const install = async () => {
    const deferred = deferredRef.current;
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      // console.log('[PWA] userChoice:', choice?.outcome); // 'accepted' | 'dismissed'
    } catch {
      // user cancelled or prompt failed
    } finally {
      // The event can only be used once
      deferredRef.current = null;
      setCanInstall(false);
    }
  };

  // Don’t render on iOS (no beforeinstallprompt), in standalone, or if we don’t have an event.
  if (isIOS || isStandalone || !canInstall || !deferredRef.current) return null;

  return (
    <button
      onClick={install}
      className={className || 'px-3 py-1.5 rounded-lg bg-black text-white text-sm font-semibold'}
      aria-label="Install app"
      title="Install app"
    >
      Install App
    </button>
  );
}
