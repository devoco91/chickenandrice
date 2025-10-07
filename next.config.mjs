/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === "production") {
      return [
        { source: "/api/:path*", destination: "https://fastfolderbackend.fly.dev/api/:path*" },
      ];
    }
    return [
      { source: "/api/:path*", destination: "http://localhost:5000/api/:path*" },
    ];
  },

  async headers() {
    return [
      { source: "/icons/:all*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/apple-touch-icon.png", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/og-image.jpg", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/static/:all*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      {
        source: "/_next/static/wasm/:all*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    domains: [
      "fastfolderbackend.fly.dev",
      "i.ytimg.com",
      "encrypted-tbn0.gstatic.com",
      "nkechiajaeroh.com",
      "mccormick.widen.net",
    ],
    remotePatterns: [{ protocol: "https", hostname: "fastfolderbackend.fly.dev", pathname: "/**" }],
  },

  reactStrictMode: true,

  // Helpful guards so pdf.js / tesseract don't pull Node deps into client
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      fs: false,
      path: false,
      worker_threads: false,
      'pdfjs-dist/build/pdf.worker': false, // we load worker from CDN
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
    };
    config.module.rules.push({ test: /\.wasm$/, type: 'asset/resource' });
    return config;
  },
};

export default nextConfig;
