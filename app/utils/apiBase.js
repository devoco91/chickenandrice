// app/utils/apiBase.js

// Accept either NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL
const RAW = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');

// If RAW already ends with /api or /api/vX, don't append it again.
const ensureApi = (s) => (/\/api(?:\/v\d+)?$/i.test(s) ? s : `${s}/api`);

// Public exports
export const API_ORIGIN = RAW;                          // e.g. https://fastfolderbackend.fly.dev
export const API_BASE   = RAW ? ensureApi(RAW) : '/api'; // Next dev fallback to /api (proxy)

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && !RAW) {
  console.warn('[apiBase] NEXT_PUBLIC_API_URL not set — frontend will call /api (likely wrong on Vercel).');
}
