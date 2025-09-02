// app/utils/apiBase.js
const RAW = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");

// If RAW already ends with /api, don't append it again.
const ensureApi = (s) => (s.endsWith("/api") ? s : `${s}/api`);

export const API_ORIGIN = RAW;                         // e.g. https://fastfolderbackend.fly.dev
export const API_BASE   = RAW ? ensureApi(RAW) : "/api"; // dev fallback to Next proxy

if (typeof window !== "undefined" && process.env.NODE_ENV === "production" && !RAW) {
  console.warn("[apiBase] NEXT_PUBLIC_API_URL not set — frontend will call /api (likely wrong on Vercel).");
}
