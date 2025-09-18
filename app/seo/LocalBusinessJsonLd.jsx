// /app/seo/LocalBusinessJsonLd.jsx
export default function LocalBusinessJsonLd() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://chickenandrice.net").replace(/\/+$/, "");
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "chicken and rice",
    url: base,
    image: [`${base}/og-image.jpg`],
    address: {
      "@type": "PostalAddress",
      streetAddress: "114 Iju road, opposite Fajimoto NG, by church bus stop",
      addressLocality: "Agege",
      addressRegion: "Lagos",
      addressCountry: "NG"
    },
    servesCuisine: ["Nigerian", "Rice", "Chicken", "Jollof"],
    priceRange: "$$",
    sameAs: []
  };
  return (
    <script
      type="application/ld+json"
      // why: JSON-LD improves eligibility for rich results; harmless to UI
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
