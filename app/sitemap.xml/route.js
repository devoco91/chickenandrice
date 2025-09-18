// /app/sitemap.xml/route.js
// Start minimal; add your real public routes (e.g., "/menu", "/order", "/locations", "/about", "/contact")
const urls = ["/"];

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://chickenandrice.net").replace(/\/+$/, "");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (p) => `  <url>
    <loc>${base}${p}</loc>
    <changefreq>${p === "/" ? "daily" : "weekly"}</changefreq>
    <priority>${p === "/" ? "1.0" : "0.7"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml" } });
}
