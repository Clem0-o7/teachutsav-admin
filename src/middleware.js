import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const DEFAULT_ROUTE = {
  "super-admin":              "/dashboard",
  "view-only":                "/dashboard",
  "events-admin":             "/events",
  "payments-admin":           "/payments",
  "paper-presentation-admin": "/paper-presentations",
  "ideathon-admin":           "/ideathon",
};

const ROLE_ACCESS = {
  "/dashboard":          ["super-admin", "view-only"],
  "/events":             ["super-admin", "events-admin"],
  "/payments":           ["super-admin", "payments-admin"],
  "/paper-presentations":["super-admin", "paper-presentation-admin"],
  "/ideathon":           ["super-admin", "ideathon-admin"],
  "/users":              ["super-admin"],
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Always allow Next.js internals and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;

  // ── Root "/" ──────────────────────────────────────────────────────────────
  if (pathname === "/") {
    if (!isAuthenticated) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.redirect(new URL(DEFAULT_ROUTE[token.role] ?? "/dashboard", req.url));
  }

  // ── Login page ─────────────────────────────────────────────────────────────
  if (pathname === "/login") {
    // Authenticated users should never see the login page
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(DEFAULT_ROUTE[token.role] ?? "/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── Protected routes ───────────────────────────────────────────────────────
  if (!isAuthenticated) {
    // Save the intended destination so we can redirect back after login (optional)
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access check
  for (const [path, allowedRoles] of Object.entries(ROLE_ACCESS)) {
    if (pathname.startsWith(path)) {
      if (!allowedRoles.includes(token.role)) {
        return NextResponse.redirect(new URL(DEFAULT_ROUTE[token.role] ?? "/dashboard", req.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/events/:path*",
    "/payments/:path*",
    "/paper-presentations/:path*",
    "/ideathon/:path*",
    "/users/:path*",
  ],
};
