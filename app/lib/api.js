// ========================================
// File: app/lib/api.js
// ========================================
export async function sendCapiPurchase({
  eventId,
  value,
  currency = 'NGN',
  items = [],
  customer = {},
  eventSourceUrl,
  testEventCode,
}) {
  const res = await fetch('/api/facebook', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event_name: 'Purchase',
      event_id: eventId,
      value,
      currency,
      items,
      customer,
      event_source_url:
        eventSourceUrl ||
        (typeof window !== 'undefined' ? window.location.href : undefined),
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.meta?.error?.message || 'CAPI failed');
  return data;
}
