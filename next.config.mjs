/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Keep your API proxy as-is; remove /uploads rewrite so our app route can redirect instead
    if (process.env.NODE_ENV === "production") {
      return [
        { source: "/api/:path*", destination: "https://fastfolderbackend.fly.dev/api/:path*" },
        // Removed: { source: "/uploads/:path*", destination: "https://fastfolderbackend.fly.dev/uploads/:path*" }
      ];
    }
    return [
      { source: "/api/:path*", destination: "http://localhost:5000/api/:path*" },
      // Removed local /uploads rewrite
    ];
  },

  async headers() {
    return [
      { source: "/icons/:all*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/apple-touch-icon.png", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/og-image.jpg", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/static/:all*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },

  images: {
    // Disable server-side optimization so the browser loads images directly
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    domains: [
      "fastfolderbackend.fly.dev",
      "i.ytimg.com",
      "encrypted-tbn0.gstatic.com",
      "nkechiajaeroh.com",
      "mccormick.widen.net",
    ],
    remotePatterns: [
      { protocol: "https", hostname: "fastfolderbackend.fly.dev", pathname: "/**" },
    ],
  },

  reactStrictMode: true,
};

export default nextConfig;
