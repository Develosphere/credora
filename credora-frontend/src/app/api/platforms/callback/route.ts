import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Platform OAuth callback handler
 * Receives the authorization code from platform OAuth and exchanges it for connection
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const platform = searchParams.get("platform");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Validate required parameters
  if (!code || !platform) {
    return NextResponse.redirect(
      new URL("/onboarding?error=missing_parameters", request.url)
    );
  }

  // Validate platform type
  const validPlatforms = ["shopify", "meta", "google"];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.redirect(
      new URL("/onboarding?error=invalid_platform", request.url)
    );
  }

  try {
    // Get session token for authenticated request
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.redirect(
        new URL("/login?error=session_expired", request.url)
      );
    }

    // Exchange code for connection via Python API
    const pythonApiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";
    const response = await fetch(`${pythonApiUrl}/platforms/${platform}/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Connection failed");
    }

    // Redirect back to onboarding with success
    return NextResponse.redirect(
      new URL(`/onboarding?connected=${platform}`, request.url)
    );
  } catch (err) {
    console.error("Platform callback error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Connection failed";
    return NextResponse.redirect(
      new URL(
        `/onboarding?error=${encodeURIComponent(errorMessage)}&platform=${platform}`,
        request.url
      )
    );
  }
}
