import { BACKEND } from "../../../../_lib/backend";
export async function POST(req, { params }) {
  const url = `${BACKEND}/api/delivery/orders/${encodeURIComponent(params.id)}/in-transit`;
  const auth = req.headers.get("authorization") || "";
  const res = await fetch(url, { method: "POST", headers: { "accept": "application/json", authorization: auth }, cache: "no-store" });
  const buf = await res.arrayBuffer();
  return new Response(buf, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}
