// app/api/delivery/signup/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://fastfolderbackend.fly.dev"
    : "http://localhost:5000");

// copy req headers, avoid hop-by-hop, force identity (no gzip)
function copyReqHeaders(req) {
  const h = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (/^(host|connection|content-length|transfer-encoding)$/i.test(k)) continue;
    h.set(k, v);
  }
  h.set("accept-encoding", "identity");
  if (!h.has("accept")) h.set("accept", "application/json");
  return h;
}

function copyResHeaders(src) {
  const out = new Headers();
  const allow = ["content-type", "content-encoding", "cache-control", "etag", "date", "vary"];
  for (const [k, v] of src.entries()) if (allow.includes(k.toLowerCase())) out.set(k, v);
  out.set("cache-control", "no-store, no-cache, must-revalidate");
  return out;
}

async function proxy(method, req) {
  const headers = copyReqHeaders(req);

  let body;
  if (method !== "GET" && method !== "HEAD") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      body = fd;
      headers.delete("content-type");
    } else if (ct.includes("application/json")) {
      body = await req.text();               // pass raw JSON
      headers.set("content-type", "application/json");
    } else {
      body = await req.text();
    }
  }

  // If your backend uses /api/delivery/register, change the path below
  const res = await fetch(`${BACKEND}/api/delivery/signup`, {
    method,
    headers,
    body,
    cache: "no-store",
    redirect: "follow",
  });

  return new Response(res.body, {
    status: res.status,
    headers: copyResHeaders(res.headers),
  });
}

export async function POST(req) {
  try { return await proxy("POST", req); }
  catch (e) {
    console.error("Proxy POST /api/delivery/signup failed:", e);
    return NextResponse.json({ error: "Bad Gateway" }, { status: 502 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
