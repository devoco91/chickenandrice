import { BACKEND } from "../../../_lib/backend";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const url = `${BACKEND}/api/orders/${encodeURIComponent(params.id)}/status`;
  const body = await req.text();
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json", "accept": "application/json" },
    body,
    cache: "no-store",
    redirect: "follow",
  });
  const buf = await res.arrayBuffer();
  return new Response(buf, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}
