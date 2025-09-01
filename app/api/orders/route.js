// app/api/orders/route.js
// Proxy /api/orders to your Express backend so GET/POST hit the real API
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://fastfolderbackend.fly.dev"
    : "http://localhost:5000");

// Copy headers except hop-by-hop ones
function copyPassthroughHeaders(req) {
  const headers = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (/^(host|connection|content-length)$/i.test(k)) continue;
    headers.set(k, v);
  }
  return headers;
}

// Generic proxy helper
async function proxy(method, req) {
  const search = req.nextUrl?.search || "";
  const url = `${BACKEND}/api/orders${search}`;
  const incomingCT = req.headers.get("content-type") || "";
  const headers = copyPassthroughHeaders(req);

  let body;
  if (method !== "GET" && method !== "HEAD") {
    if (incomingCT.includes("multipart/form-data")) {
      const fd = await req.formData();
      body = fd;
      headers.delete("content-type"); // let fetch set boundary
    } else if (incomingCT.includes("application/json")) {
      body = await req.text(); // pass raw JSON
      headers.set("content-type", "application/json");
    } else {
      body = await req.text(); // generic passthrough
    }
  }

  const res = await fetch(url, { method, headers, body });

  // Mirror backend response (status + content-type)
  const ct = res.headers.get("content-type") || "application/json";
  const buf = await res.arrayBuffer();
  return new Response(buf, { status: res.status, headers: { "content-type": ct } });
}

// --- Handlers ---
export async function GET(req) {
  // Now proxies to Express (fixes empty orders on dashboard)
  return proxy("GET", req);
}

export async function POST(req) {
  return proxy("POST", req);
}

// Optional: support other verbs if needed later
export async function OPTIONS(req) {
  // Simple 200 to satisfy CORS preflights if any
  return NextResponse.json({ ok: true });
}
