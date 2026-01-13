import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/auth/logout
 * Server-side logout that clears HTTP-only cookies
 */
export async function POST() {
  const cookieStore = await cookies();
  
  // Clear session cookies by setting them to empty with immediate expiry
  cookieStore.set("session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expire immediately
  });
  
  cookieStore.set("auth_token", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expire immediately
  });
  
  // Also try to call the Python API logout (non-blocking)
  try {
    await fetch(`${process.env.PYTHON_API_URL || "http://localhost:8000"}/auth/logout`, {
      method: "POST",
    });
  } catch {
    // Ignore errors - we've already cleared cookies
  }
  
  return NextResponse.json({ success: true, message: "Logged out successfully" });
}

/**
 * GET /api/auth/logout
 * Alternative logout via GET request (for direct navigation)
 */
export async function GET() {
  const cookieStore = await cookies();
  
  // Clear session cookies
  cookieStore.set("session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  
  cookieStore.set("auth_token", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  
  // Redirect to landing page
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
