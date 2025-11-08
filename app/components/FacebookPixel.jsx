// ========================================
// File: app/components/FacebookPixel.jsx
// ========================================
'use client';

import { useEffect } from 'react';

export default function FacebookPixel({ pixelId }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const PIXEL_ID =
      pixelId ||
      process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
      process.env.NEXT_PUBLIC_FB_PIXEL_ID;

    if (!PIXEL_ID) return;

    const disableLocal =
      String(process.env.NEXT_PUBLIC_DISABLE_PIXEL_ON_LOCALHOST || '1') === '1';

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (disableLocal && isLocalhost) return;

    window.__fbPixelIds = window.__fbPixelIds || new Set();
    if (window.__fbPixelIds.has(PIXEL_ID)) return;

    if (!window.fbq) {
      const fbq = function () {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = fbq;
    }

    if (!document.getElementById('fb-pixel-sdk')) {
      const s = document.createElement('script');
      s.async = true;
      s.id = 'fb-pixel-sdk';
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
    }

    try {
      window.fbq('init', PIXEL_ID);
      window.fbq('track', 'PageView');
      window.__fbPixelIds.add(PIXEL_ID);
    } catch {}
  }, [pixelId]);

  const id =
    pixelId ||
    process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
    process.env.NEXT_PUBLIC_FB_PIXEL_ID;

  const disabled =
    (process.env.NEXT_PUBLIC_DISABLE_PIXEL_ON_LOCALHOST ?? '1') === '1' &&
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'));

  if (disabled) return null;

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
