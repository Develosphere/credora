"use client";

/**
 * Hook for fetching system status with auto-refresh polling
 * Uses React Query for caching and automatic refetching
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { useQuery } from "@tanstack/react-query";
import { statusApi } from "@/lib/api/status";
import type { SystemStatus } from "@/lib/api/types";

// Default polling interval: 30 seconds
const DEFAULT_POLL_INTERVAL = 30 * 1000;

interface UseStatusOptions {
  /** Polling interval in milliseconds (default: 30000) */
  pollInterval?: number;
  /** Whether to enable auto-refresh polling (default: true) */
  enablePolling?: boolean;
}

/**
 * Hook for fetching and polling system status
 */
export function useStatus(options: UseStatusOptions = {}) {
  const { pollInterval = DEFAULT_POLL_INTERVAL, enablePolling = true } = options;

  return useQuery<SystemStatus>({
    queryKey: ["system", "status"],
    queryFn: statusApi.getSystemStatus,
    staleTime: pollInterval / 2, // Consider stale after half the poll interval
    refetchInterval: enablePolling ? pollInterval : false,
    refetchOnWindowFocus: true,
    retry: 1, // Only retry once on failure
  });
}

/**
 * Hook for fetching only service health (Python API and Java Engine)
 */
export function useServiceHealth(options: UseStatusOptions = {}) {
  const { pollInterval = DEFAULT_POLL_INTERVAL, enablePolling = true } = options;

  return useQuery({
    queryKey: ["system", "services"],
    queryFn: async () => {
      const [pythonHealth, javaHealth] = await Promise.all([
        statusApi.checkPythonHealth(),
        statusApi.checkJavaHealth(),
      ]);
      return [pythonHealth, javaHealth];
    },
    staleTime: pollInterval / 2,
    refetchInterval: enablePolling ? pollInterval : false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
