// ========================================
// File: app/lib/meta.js  (ADD-ONLY ENHANCEMENTS)
// ========================================
export function genEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateEventId(key = 'meta:purchaseEventId') {
  if (typeof window === 'undefined') return genEventId();
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = genEventId();
  sessionStorage.setItem(key, id);
  return id;
}

export function clearEventId(key = 'meta:purchaseEventId') {
  if (typeof window !== 'undefined') sessionStorage.removeItem(key);
}

/* -------------------- ADD-ONLY HELPERS BELOW -------------------- */

/** Why: collect cookies used by Meta for matching. No side effects. */
export function readCookie(name) {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Why: when _fbc cookie is absent but fbclid is in URL, we can synthesize _fbc. */
export function buildFbcFromUrl(href) {
  try {
    const u = new URL(href || (typeof window !== 'undefined' ? window.location.href : ''));
    const fbclid = u.searchParams.get('fbclid');
    if (!fbclid) return undefined;
    const ts = Math.floor(Date.now() / 1000);
    return `fb.1.${ts}.${fbclid}`;
  } catch {
    return undefined;
  }
}

/** Get _fbp/_fbc with fbclid fallback. */
export function getFbpFbc() {
  const fbp = readCookie('_fbp');
  const fbc = readCookie('_fbc') || buildFbcFromUrl();
  return { fbp, fbc };
}

/**
 * Fire Pixel with eventID and return identifiers for CAPI.
 * Keeps your current flow; use when you want dedupe + better EMQ.
 */
export function trackWithEventId(pixelId, event, params = {}, storageKey = 'meta:lastEventId') {
  const event_id = genEventId();
  try {
    // Store last event id for optional reuse elsewhere.
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey, event_id);
  } catch {}

  const { fbp, fbc } = getFbpFbc();

  try {
    // trackSingle avoids cross-pixel noise if multiple pixels exist
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('trackSingle', pixelId, event, params, { eventID: event_id });
    }
  } catch {
    /* ignore */
  }

  return { event_id, fbp, fbc };
}

/**
 * Convenience: build the base object you POST to your /api/facebook endpoint.
 * Use this to keep fields consistent across calls.
 */
export function buildCapiPayloadBase({
  event_name,
  event_id,
  value,
  currency = 'NGN',
  event_source_url,
  identifiers,           // optional override: { fbp, fbc }
  customer,              // { email, phone, first_name, last_name, city, state, zip, country, external_id }
  items,                 // [{ id|sku|name, quantity, item_price|price }]
  order_id
} = {}) {
  const ids = identifiers || getFbpFbc();
  return {
    event_name,
    event_id,
    value,
    currency,
    event_source_url:
      event_source_url ||
      (typeof window !== 'undefined' ? window.location.href : undefined),
    fbp: ids.fbp,
    fbc: ids.fbc,
    customer,
    items,
    order_id
  };
}
