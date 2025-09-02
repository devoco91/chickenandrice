import { BACKEND } from "../../_lib/backend";

export async function POST(req) {
  const url = `${BACKEND}/api/admin/login`;
  const body = await req.text();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body,
    cache: "no-store",
  });
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  });
}
