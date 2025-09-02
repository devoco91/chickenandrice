// app/utils/apiBase.js
// Central place to build the API base URL.
// On Vercel, set NEXT_PUBLIC_API_URL to your backend origin
// e.g. https://fastfolderbackend.fly.dev

const ORIGIN_RAW =
  (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");

export const API_ORIGIN = ORIGIN_RAW;                 // e.g. https://fastfolderbackend.fly.dev
export const API_BASE   = ORIGIN_RAW ? `${ORIGIN_RAW}/api` : "/api"; // dev fallback to Next proxy

if (typeof window !== "undefined" && process.env.NODE_ENV === "production" && !ORIGIN_RAW) {
  console.warn("[apiBase] NEXT_PUBLIC_API_URL not set — frontend will call /api (likely wrong on Vercel).");
}
