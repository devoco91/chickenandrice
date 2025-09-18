// /app/robots.txt/route.js
export async function GET() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://chickenandrice.net").replace(/\/+$/, "");
  const isStaging = process.env.NEXT_PUBLIC_ENV === "staging";
  const body = [
    "User-agent: *",
    isStaging ? "Disallow: /" : "Allow: /",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain" } });
}
