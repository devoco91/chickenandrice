import { BACKEND } from "../../_lib/backend";
export async function GET() {
  const url = `${BACKEND}/api/delivery/all`;
  const res = await fetch(url, { headers: { "accept": "application/json" }, cache: "no-store" });
  const buf = await res.arrayBuffer();
  return new Response(buf, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}
