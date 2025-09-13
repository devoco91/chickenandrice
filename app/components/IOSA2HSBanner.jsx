"use client";
import { useEffect, useState } from "react";

export default function IOSA2HSBanner() {
  const [show, setShow] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isiOS = /iPhone|iPad|iPod/i.test(ua);

    // Safari detection on iOS (exclude Chrome/Firefox in-app UAs)
    const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    setIsSafari(safari);

    const inStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    const dismissed = localStorage.getItem("ios_a2hs_dismissed") === "1";
    if (isiOS && !inStandalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem("ios_a2hs_dismissed", "1");
    setShow(false);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // optional: quick feedback
      alert("Link copied. Open in Safari and use Share → Add to Home Screen.");
    } catch {}
  };

  return (
    <div className="fixed left-3 right-3 bottom-3 z-50 rounded-xl border bg-white/95 shadow p-3 text-sm">
      <div className="flex items-start gap-2">
        <div className="font-semibold">Add to Home Screen</div>
        <button
          onClick={dismiss}
          className="ml-auto px-2 py-1 rounded-md border text-xs"
        >
          Dismiss
        </button>
      </div>

      {isSafari ? (
        <div className="mt-1 text-gray-700">
          In <span className="font-semibold">Safari</span>, tap{" "}
          <span className="font-semibold">Share</span> <span aria-hidden>🔗</span>{" "}
          → <span className="font-semibold">Add to Home Screen</span>.
        </div>
      ) : (
        <div className="mt-1 text-gray-700">
          On iPhone, installation is only available in{" "}
          <span className="font-semibold">Safari</span>. Open this site in Safari, then
          tap <span className="font-semibold">Share</span> →{" "}
          <span className="font-semibold">Add to Home Screen</span>.
          <div className="mt-2 flex gap-2">
            <button
              onClick={copyUrl}
              className="px-2 py-1 rounded-md border text-xs"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
