/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === "production") {
      return [
        {
          source: "/api/:path*",
          destination: "https://fastfolderbackend.fly.dev/api/:path*",
        },
        {
          source: "/uploads/:path*",
          destination: "https://fastfolderbackend.fly.dev/uploads/:path*",
        },
      ];
    } else {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:5000/api/:path*",
        },
        {
          source: "/uploads/:path*",
          destination: "http://localhost:5000/uploads/:path*",
        },
      ];
    }
  },
  images: {
    domains: [
      "fastfolderbackend.fly.dev",
      "i.ytimg.com",
      "encrypted-tbn0.gstatic.com",
      "nkechiajaeroh.com",
      "mccormick.widen.net",
    ],
  },
};

export default nextConfig;
