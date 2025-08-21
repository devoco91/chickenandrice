/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Local development
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
      // Production
      {
        source: "/api/:path*",
        destination: "https://fastfolderbackend.fly.dev/api/:path*", // ✅ keep /api
      },
    ];
  },
};

export default nextConfig;
