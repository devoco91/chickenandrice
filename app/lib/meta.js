// ========================================
// File: app/lib/meta.js
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
