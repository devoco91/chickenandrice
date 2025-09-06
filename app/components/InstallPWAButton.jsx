"use client";
import { useEffect, useState } from "react";

export default function InstallPWAButton({ className = "" }) {
  const [deferred, setDeferred] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
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

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone);

  if (!canInstall || isStandalone) return null;

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
