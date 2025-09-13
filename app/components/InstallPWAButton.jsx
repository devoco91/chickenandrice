"use client";
import { useEffect, useState } from "react";

export default function InstallPWAButton({ className = "" }) {
  const [deferred, setDeferred] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    setDeferred(null);
    setCanInstall(false);
  };

  // Show this button only where the event exists (Android/desktop). iOS never shows it.
  if (isIOS || isStandalone || !canInstall) return null;

  return (
    <button
      onClick={install}
      className={className || "px-3 py-1.5 rounded-lg bg-black text-white text-sm font-semibold"}
      aria-label="Install app"
    >
      Install App
    </button>
  );
}
