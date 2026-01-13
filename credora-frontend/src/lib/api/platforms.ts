/**
 * Platforms API module
 * Handles OAuth connections for Shopify, Meta Ads, and Google Ads
 */

import { pythonApi } from "./client";
import type { PlatformStatus, PlatformType, OAuthRedirect } from "./types";

/**
 * Get connection status for all platforms
 */
export async function getStatus(): Promise<PlatformStatus[]> {
  return pythonApi.get<PlatformStatus[]>("/platforms/status");
}

/**
 * Get connection status for a specific platform
 */
export async function getPlatformStatus(
  platform: PlatformType
): Promise<PlatformStatus> {
  return pythonApi.get<PlatformStatus>(`/platforms/${platform}/status`);
}

/**
 * Initiate OAuth flow for a platform
 */
export async function initiateOAuth(
  platform: PlatformType,
  shop?: string
): Promise<OAuthRedirect> {
  const params = shop ? { shop } : undefined;
  return pythonApi.get<OAuthRedirect>(`/platforms/${platform}/oauth`, { params });
}

/**
 * Handle OAuth callback for a platform
 */
export async function handleOAuthCallback(
  platform: PlatformType,
  code: string
): Promise<PlatformStatus> {
  return pythonApi.post<PlatformStatus>(`/platforms/${platform}/callback`, {
    code,
  });
}

/**
 * Disconnect a platform
 */
export async function disconnect(platform: PlatformType): Promise<void> {
  await pythonApi.delete(`/platforms/${platform}`);
}

/**
 * Trigger a manual sync for a platform
 */
export async function syncPlatform(platform: PlatformType): Promise<void> {
  await pythonApi.post(`/platforms/${platform}/sync`);
}

/**
 * Platforms API object for convenience
 */
export const platformsApi = {
  getStatus,
  getPlatformStatus,
  initiateOAuth,
  handleOAuthCallback,
  disconnect,
  syncPlatform,
};
