"use client";

import { useQuery } from "@tanstack/react-query";
import { fpaApi } from "@/lib/api/fpa";
import type { DashboardKPIs } from "@/lib/api/types";
import { usePlatform } from "@/lib/hooks/usePlatform";

/**
 * Hook for fetching dashboard KPIs
 * Uses React Query for caching and automatic refetching
 * Includes selected platform in query key for per-platform data
 */
export function useDashboard() {
  const { platform } = usePlatform();

  return useQuery<DashboardKPIs>({
    queryKey: ["dashboard", "kpis", platform],
    queryFn: () => fpaApi.getDashboardKPIs(platform),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
