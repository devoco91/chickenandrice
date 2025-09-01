// app/middleware.js
import { NextResponse } from "next/server";

export async function middleware(req) {
  const url = new URL(req.url);

  // Log only API requests
  if (url.pathname.startsWith("/api/")) {
    console.log("[API middleware] Incoming request:", req.method, url.pathname);

    try {
      // Proxy the request to the real backend
      const res = await fetch(req);

      if (!res.ok) {
        console.error(
          "[API middleware] Backend responded with error:",
          res.status,
          res.statusText,
          url.pathname
        );
      } else {
        console.log("[API middleware] Success:", res.status, url.pathname);
      }

      return res;
    } catch (err) {
      console.error("[API middleware] Network/Fetch error:", url.pathname, err);
      return NextResponse.json({ error: "API proxy failed" }, { status: 500 });
    }
  }

  // Default pass-through for everything else
  return NextResponse.next();
}

// Only run middleware for API routes
export const config = {
  matcher: ["/api/:path*"],
};
