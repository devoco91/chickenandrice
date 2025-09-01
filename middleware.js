// middleware.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Debug log (remove later in production)
console.log("🔑 JWT_SECRET loaded:", process.env.JWT_SECRET);

if (!process.env.JWT_SECRET) {
  throw new Error("❌ Missing JWT_SECRET in environment variables");
}

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Allow login/signup without token
  if (pathname.startsWith("/deliverylogin") || pathname.startsWith("/signup")) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/deliverylogin", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);

    // Role-based redirects
    if (pathname.startsWith("/dispatchCenter") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/deliverydashboard", req.url));
    }
    if (pathname.startsWith("/deliverydashboard") && payload.role !== "deliveryman") {
      return NextResponse.redirect(new URL("/dispatchCenter", req.url));
    }

    return NextResponse.next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return NextResponse.redirect(new URL("/deliverylogin", req.url));
  }
}

export const config = {
  matcher: ["/dispatchCenter/:path*", "/deliverydashboard/:path*"],
};
