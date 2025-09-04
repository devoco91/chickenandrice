// app/components/PWARegister.jsx
"use client";
import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        // optional: quick ping so we can see the active version in the console
        if (navigator.serviceWorker.controller) {
          const mc = new MessageChannel();
          mc.port1.onmessage = (e) => console.log("[SW] ping reply:", e.data);
          navigator.serviceWorker.controller.postMessage({ type: "PING" }, [mc.port2]);
        }
        // ensure new versions take control ASAP
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      } catch (err) {
        console.error("SW registration failed:", err);
      }
    };

    register();
  }, []);

  return null; // no UI
}
