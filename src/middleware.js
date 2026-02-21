import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Allow access to login page and API routes
    if (pathname.startsWith('/login') || pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Define role-based route access
    const roleAccess = {
      '/dashboard': ['super-admin', 'view-only'],
      '/events': ['super-admin', 'events-admin'],
      '/payments': ['super-admin', 'payments-admin'],
      '/paper-presentations': ['super-admin', 'paper-presentation-admin'],
      '/ideathon': ['super-admin', 'ideathon-admin'],
      '/users': ['super-admin'] // Only super admin can manage users
    };

    // Check if current path requires specific role
    for (const [path, allowedRoles] of Object.entries(roleAccess)) {
      if (pathname.startsWith(path)) {
        if (!allowedRoles.includes(token.role)) {
          // Redirect to appropriate default route based on role
          const defaultRoutes = {
            'super-admin': '/dashboard',
            'view-only': '/dashboard', 
            'events-admin': '/events',
            'payments-admin': '/payments',
            'paper-presentation-admin': '/paper-presentations',
            'ideathon-admin': '/ideathon'
          };
          
          return NextResponse.redirect(new URL(defaultRoutes[token.role] || '/dashboard', req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => true // Let middleware handle authorization
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/events/:path*', 
    '/payments/:path*',
    '/paper-presentations/:path*',
    '/ideathon/:path*',
    '/users/:path*'
  ]
};