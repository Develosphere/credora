import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route patterns for authentication
 */
export const PUBLIC_ROUTES = ["/", "/login", "/signup"];
export const AUTH_ROUTES = ["/login", "/signup"];
export const PROTECTED_ROUTE_PREFIX = [
  "/dashboard",
  "/pnl",
  "/forecast",
  "/sku-analysis",
  "/campaigns",
  "/whatif",
  "/chat",
  "/insights",
  "/settings",
  "/status",
  "/onboarding",
];

/**
 * Check if a route is public (doesn't require authentication)
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}

/**
 * Check if a route is an auth route (login/signup)
 */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.includes(pathname);
}

/**
 * Check if a route is protected (requires authentication)
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIX.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Middleware to handle route protection
 * - Redirects unauthenticated users from protected routes to login
 * - Redirects authenticated users from auth routes to dashboard
 * 
 * Note: This middleware only checks for cookie presence, not validity.
 * Session validation happens server-side in page components.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session token from cookies
  const sessionToken = request.cookies.get("session_token")?.value;
  
  // For protected routes, validate the session with the API
  if (isProtectedRoute(pathname)) {
    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Validate session with API
    try {
      const apiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/auth/session`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      
      if (!response.ok) {
        // Session is invalid, redirect to login and clear cookie
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        const res = NextResponse.redirect(loginUrl);
        res.cookies.delete("session_token");
        return res;
      }
    } catch {
      // API unreachable, redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If user has valid session and trying to access auth routes, redirect to dashboard
  if (sessionToken && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
};
