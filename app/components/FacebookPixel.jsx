// ============================================================================
// File: app/components/FacebookPixel.jsx
// ============================================================================
'use client'

import { useEffect } from 'react'

export default function FacebookPixel() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID
    if (!PIXEL_ID) return

    if (!window.fbq) {
      const fbq = function () {
        if (fbq.callMethod) {
          fbq.callMethod.apply(fbq, arguments)
        } else {
          fbq.queue.push(arguments)
        }
      }
      fbq.queue = []
      fbq.loaded = true
      fbq.version = '2.0'
      window.fbq = fbq

      const s = document.createElement('script')
      s.async = true
      s.src = 'https://connect.facebook.net/en_US/fbevents.js'
      document.head.appendChild(s)
    }

    try { window.fbq('init', PIXEL_ID) } catch {}
    try { window.fbq('track', 'PageView') } catch {}
  }, [])

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  )
}
