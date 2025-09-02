import { BACKEND } from "../../_lib/backend";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = `${BACKEND}/api/orders/online${req.nextUrl?.search || ""}`;
  const res = await fetch(url, { cache: "no-store", headers: { "accept": "application/json" } });
  const buf = await res.arrayBuffer();
  return new Response(buf, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}
