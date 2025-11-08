// ============================================================================
// File: app/components/FacebookPixel.jsx
// ============================================================================
'use client';

import { useEffect } from 'react';

/**
 * Loads Meta Pixel once per app lifetime.
 * Prevents: duplicate init, conflicting versions, repeated script loads.
 * Respects NEXT_PUBLIC_DISABLE_PIXEL_ON_LOCALHOST.
 */
export default function FacebookPixel({ pixelId }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const PIXEL_ID =
      pixelId ||
      process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
      process.env.NEXT_PUBLIC_FB_PIXEL_ID;

    const disableOnLocal =
      String(process.env.NEXT_PUBLIC_DISABLE_PIXEL_ON_LOCALHOST || '1') === '1';
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!PIXEL_ID || (disableOnLocal && isLocal)) return;

    // Track which Pixel IDs we've already inited
    window.__fbPixelIds = window.__fbPixelIds || new Set();

    // If this ID is already initialized, do nothing
    if (window.__fbPixelIds.has(PIXEL_ID)) return;

    // Create fbq shim if not present
    if (!window.fbq) {
      const fbq = function () {
        if (fbq.callMethod) {
          fbq.callMethod.apply(fbq, arguments);
        } else {
          fbq.queue.push(arguments);
        }
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = fbq;
    }

    // If the script tag already exists, reuse it; else add it once
    if (!document.getElementById('fb-pixel-sdk')) {
      const s = document.createElement('script');
      s.async = true;
      s.id = 'fb-pixel-sdk';
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
    }

    try {
      // Guard against accidental re-init on HMR
      if (!window.__fbPixelIds.has(PIXEL_ID)) {
        window.fbq('init', PIXEL_ID);
        window.fbq('track', 'PageView');
        window.__fbPixelIds.add(PIXEL_ID);
      }
    } catch {
      // ignore
    }
  }, [pixelId]);

  // NoScript fallback (harmless)
  const id =
    pixelId ||
    process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
    process.env.NEXT_PUBLIC_FB_PIXEL_ID;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
