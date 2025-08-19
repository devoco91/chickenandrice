/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Local development → backend expects /api/*
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
      // Production → backend expects /*
      {
        source: "/api/:path*",
        destination: "https://fastfolderbackend.fly.dev/:path*",
      },
    ];
  },
};

export default nextConfig;
