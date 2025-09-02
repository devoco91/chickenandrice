import { BACKEND } from "../_lib/backend";

export const dynamic = "force-dynamic";

function passthroughHeaders(req) {
  const h = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (/^(host|connection|content-length)$/i.test(k)) continue;
    h.set(k, v);
  }
  return h;
}

async function proxy(method, req) {
  const search = req.nextUrl?.search || "";
  const url = `${BACKEND}/api/orders${search}`;
  const incomingCT = req.headers.get("content-type") || "";
  const headers = passthroughHeaders(req);
  let body;

  if (method !== "GET" && method !== "HEAD") {
    if (incomingCT.includes("multipart/form-data")) {
      const fd = await req.formData();
      body = fd;
      headers.delete("content-type");
    } else if (incomingCT.includes("application/json")) {
      body = await req.text();
      headers.set("content-type", "application/json");
    } else {
      body = await req.text();
    }
  }

  const res = await fetch(url, { method, headers, body, cache: "no-store", redirect: "follow" });
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  });
}

export async function GET(req)  { return proxy("GET", req); }
export async function POST(req) { return proxy("POST", req); }
export async function OPTIONS() { return new Response(null, { status: 200 }); }
