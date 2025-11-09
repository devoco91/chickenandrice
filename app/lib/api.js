// ========================================
// File: app/lib/api.js  (ADD-ONLY EMQ BOOST)
// ========================================
import { getFbpFbc } from './meta';

/**
 * Sends a CAPI Purchase. Backward compatible.
 *
 * New optional fields:
 *  - fbp, fbc: override cookies if you already have them
 *  - eventTime: unix seconds; guarded to 7d window
 */
export async function sendCapiPurchase({
  eventId,
  value,
  currency = 'NGN',
  items = [],
  customer = {},
  eventSourceUrl,
  testEventCode,

  // ---- new, optional (add-only) ----
  fbp,
  fbc,
  eventTime,
} = {}) {
  // Fallback to cookies if not explicitly provided
  let ids = { fbp, fbc };
  try {
    if (!ids.fbp || !ids.fbc) {
      const fromCookies = typeof window !== 'undefined' ? getFbpFbc() : {};
      ids = { fbp: ids.fbp || fromCookies.fbp, fbc: ids.fbc || fromCookies.fbc };
    }
  } catch {
    /* ignore */
  }

  // Guard event_time (<= 7 days, not >5m future)
  const safeEventTime = (tSec) => {
    const now = Math.floor(Date.now() / 1000);
    const n = Number(tSec);
    if (!Number.isFinite(n)) return undefined; // let server default to now
    const sevenDays = 7 * 24 * 60 * 60;
    if (n > now + 300) return undefined;
    if (n < now - sevenDays) return undefined;
    return Math.floor(n);
  };

  const body = {
    event_name: 'Purchase',
    event_id: eventId,
    value,
    currency,
    items,
    customer,
    ...(safeEventTime(eventTime) ? { event_time: safeEventTime(eventTime) } : {}),
    ...(ids.fbp ? { fbp: ids.fbp } : {}),
    ...(ids.fbc ? { fbc: ids.fbc } : {}),
    event_source_url:
      eventSourceUrl ||
      (typeof window !== 'undefined' ? window.location.href : undefined),
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  const res = await fetch('/api/facebook', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.meta?.error?.message || 'CAPI failed');
  return data;
}
