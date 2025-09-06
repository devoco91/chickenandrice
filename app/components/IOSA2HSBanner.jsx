"use client";
import { useEffect, useState } from "react";

export default function IOSA2HSBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isiOS = /iPhone|iPad|iPod/i.test(ua);
    const inStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = localStorage.getItem("ios_a2hs_dismissed") === "1";
    if (isiOS && !inStandalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed left-3 right-3 bottom-3 z-50 rounded-xl border bg-white/95 shadow p-3 text-sm">
      <div className="flex items-start gap-2">
        <div className="font-semibold">Add to Home Screen</div>
        <button
          onClick={() => { localStorage.setItem("ios_a2hs_dismissed", "1"); setShow(false); }}
          className="ml-auto px-2 py-1 rounded-md border text-xs"
        >
          Dismiss
        </button>
      </div>
      <div className="mt-1 text-gray-700">
        In Safari: tap <span className="font-semibold">Share</span> →{" "}
        <span className="font-semibold">Add to Home Screen</span>.
      </div>
    </div>
  );
}
