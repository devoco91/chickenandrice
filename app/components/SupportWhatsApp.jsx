// components/SupportWhatsApp.jsx
"use client";

import React, { useCallback } from "react";
import { MessageCircle } from "lucide-react";

const PHONE = "2349040002075";

export default function SupportWhatsApp() {
  // Preset message (exactly as requested)
  const text = [
    "Hello 👋, I'd like to place a personalized order.",
    "Here are my preferences / custom request:",
  ].join("\n\n");

  // Primary web URL (works everywhere)
  const webUrl = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
  // App deep-link (tries WhatsApp / WhatsApp Business first)
  const appUrl = `whatsapp://send?phone=${PHONE}&text=${encodeURIComponent(text)}`;

  const handleClick = useCallback(
    (e) => {
      e.preventDefault();
      let fellBack = false;
      const fallbackTimer = setTimeout(() => {
        fellBack = true;
        window.open(webUrl, "_blank", "noopener,noreferrer");
      }, 350);
      try {
        window.location.href = appUrl; // attempt to open installed app
      } catch {
        if (!fellBack) {
          clearTimeout(fallbackTimer);
          window.open(webUrl, "_blank", "noopener,noreferrer");
        }
      }
    },
    [appUrl, webUrl]
  );

  return (
    <>
      <a
        href={webUrl}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="Personalize your order on WhatsApp"
        className={[
          "fixed z-50 right-5 bottom-5",
          "group inline-flex items-center gap-3",
          // Premium, more visible pill
          "rounded-full px-5 py-3.5",
          "text-white",
          "shadow-[0_12px_30px_rgba(16,185,129,0.35)]",
          "ring-2 ring-emerald-300/70",
          "bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700",
          "hover:from-emerald-500 hover:via-emerald-600 hover:to-emerald-700",
          "active:scale-[0.98] transition-transform duration-150",
        ].join(" ")}
      >
        <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/15">
          <MessageCircle className="w-[18px] h-[18px] text-white" />
          {/* subtle pulse halo for visibility */}
          <span className="absolute inset-0 rounded-full animate-[pulse_2.2s_ease-in-out_infinite] bg-emerald-300/0" />
        </span>

        {/* Visible on mobile + desktop */}
        <span className="relative font-semibold text-sm sm:text-base">
          Want to personalize your order?{" "}
          <span className="shimmer underline decoration-white/70 underline-offset-4">
            Chat
          </span>
        </span>
      </a>

      {/* Local shimmer animation (subtle, classy) */}
      <style jsx>{`
        @keyframes shimmerPulse {
          0% { opacity: 0.9; text-shadow: 0 0 0 rgba(255,255,255,0); }
          50% { opacity: 1; text-shadow: 0 0 10px rgba(255,255,255,0.55); }
          100% { opacity: 0.95; text-shadow: 0 0 0 rgba(255,255,255,0); }
        }
        .shimmer {
          animation: shimmerPulse 2.2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
