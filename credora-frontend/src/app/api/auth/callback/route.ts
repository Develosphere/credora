import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * OAuth callback handler
 * Receives the authorization code from Google OAuth and exchanges it for a session token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Validate authorization code
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", request.url)
    );
  }

  try {
    // Exchange code for token via Python API
    const pythonApiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";
    const response = await fetch(`${pythonApiUrl}/auth/google/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Authentication failed");
    }

    const data = await response.json();
    const { token, user } = data;

    // Set session token in HTTP-only cookie for security
    const cookieStore = await cookies();
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    // Also set a non-HTTP-only cookie for client-side API calls
    // This is needed because the Python API is on a different origin
    cookieStore.set("auth_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Determine redirect URL based on user state
    let redirectUrl = "/dashboard";

    // If user hasn't completed onboarding, redirect to onboarding
    if (!user.onboardingComplete) {
      redirectUrl = "/onboarding";
    }

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (err) {
    console.error("Auth callback error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
