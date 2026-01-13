"use client";

import { useQuery } from "@tanstack/react-query";
import { fpaApi } from "@/lib/api/fpa";
import type { DashboardKPIs } from "@/lib/api/types";

/**
 * Hook for fetching dashboard KPIs
 * Uses React Query for caching and automatic refetching
 */
export function useDashboard() {
  return useQuery<DashboardKPIs>({
    queryKey: ["dashboard", "kpis"],
    queryFn: fpaApi.getDashboardKPIs,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
