/**
 * Status API module
 * Handles health checks for Python API and Java FPA Engine
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { getPythonApiUrl, getJavaEngineUrl } from "./client";
import type { ServiceHealth, SystemStatus, PlatformStatus, ServiceHealthStatus } from "./types";

/**
 * Check health of Python API
 */
export async function checkPythonHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${getPythonApiUrl()}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        service: "python_api",
        status: "healthy",
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } else {
      return {
        service: "python_api",
        status: "unhealthy",
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
        lastChecked: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      service: "python_api",
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Connection failed",
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check health of Java FPA Engine
 */
export async function checkJavaHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Java engine health endpoint is at /api/health
    const response = await fetch(`${getJavaEngineUrl()}/api/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        service: "java_engine",
        status: "healthy",
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } else {
      return {
        service: "java_engine",
        status: "unhealthy",
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
        lastChecked: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      service: "java_engine",
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Failed to fetch",
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Get session token from cookies (client-side)
 */
function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "auth_token" || name === "session_token") {
      return value;
    }
  }
  return null;
}

/**
 * Get platform sync statuses
 */
export async function getPlatformSyncStatus(): Promise<PlatformStatus[]> {
  try {
    const token = getSessionToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${getPythonApiUrl()}/platforms/status`, {
      method: "GET",
      headers,
      credentials: "include",
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      return response.json();
    }
    
    return [];
  } catch {
    return [];
  }
}

/**
 * Get full system status including all services and platforms
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  const [pythonHealth, javaHealth, platforms] = await Promise.all([
    checkPythonHealth(),
    checkJavaHealth(),
    getPlatformSyncStatus(),
  ]);
  
  return {
    services: [pythonHealth, javaHealth],
    platforms,
  };
}

/**
 * Determine health indicator color based on status
 */
export function getHealthIndicatorColor(status: ServiceHealthStatus): string {
  switch (status) {
    case "healthy":
      return "green";
    case "unhealthy":
      return "red";
    case "unknown":
    default:
      return "gray";
  }
}

/**
 * Status API object for convenience
 */
export const statusApi = {
  checkPythonHealth,
  checkJavaHealth,
  getPlatformSyncStatus,
  getSystemStatus,
  getHealthIndicatorColor,
};
