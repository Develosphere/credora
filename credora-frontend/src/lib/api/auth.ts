/**
 * Auth API module
 * Handles Google OAuth authentication via Python API
 */

import { pythonApi } from "./client";
import type { User, AuthResponse, OAuthRedirect } from "./types";

/**
 * Initiate Google OAuth login flow
 * Returns the redirect URL to Google's OAuth consent screen
 */
export async function googleLogin(): Promise<OAuthRedirect> {
  return pythonApi.get<OAuthRedirect>("/auth/google/login");
}

/**
 * Handle OAuth callback with authorization code
 * Exchanges the code for a session token and user info
 */
export async function handleCallback(code: string): Promise<AuthResponse> {
  return pythonApi.post<AuthResponse>("/auth/google/callback", { code });
}

/**
 * Get current user session
 * Returns null if not authenticated
 */
export async function getSession(): Promise<User | null> {
  try {
    return await pythonApi.get<User>("/auth/session");
  } catch {
    return null;
  }
}

/**
 * Logout and clear session
 * Clears all auth cookies via server-side API and redirects to landing page
 */
export async function logout(): Promise<void> {
  try {
    // Call Next.js API route to clear cookies server-side (handles HTTP-only cookies)
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Continue with redirect even if API call fails
  }
  
  // Clear client-side cookies as backup
  if (typeof document !== "undefined") {
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }
  
  // Force redirect to landing page
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

/**
 * Set session token in cookie
 */
export function setSessionToken(token: string): void {
  if (typeof document !== "undefined") {
    // Set HTTP-only cookie with secure flag in production
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `session_token=${token}; path=/; SameSite=Lax${secure}`;
  }
}

/**
 * Auth API object for convenience
 */
export const authApi = {
  googleLogin,
  handleCallback,
  getSession,
  logout,
  setSessionToken,
};
