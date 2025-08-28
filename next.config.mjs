/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Local development API
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
      // Production API
      {
        source: "/api/:path*",
        destination: "https://fastfolderbackend.fly.dev/api/:path*",
      },
      // Local development uploads
      {
        source: "/uploads/:path*",
        destination: "http://localhost:5000/uploads/:path*",
      },
      // Production uploads
      {
        source: "/uploads/:path*",
        destination: "https://fastfolderbackend.fly.dev/uploads/:path*",
      },
    ];
  },
  images: {
    domains: ["fastfolderbackend.fly.dev"],
  },
};

export default nextConfig;
