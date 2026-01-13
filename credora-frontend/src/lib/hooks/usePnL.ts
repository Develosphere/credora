/**
 * usePnL hook - React Query hook for P&L data fetching
 * Calls Java FPA Engine via Python API
 */

import { useQuery } from "@tanstack/react-query";
import { calculatePnL } from "@/lib/api/fpa";
import type { PnLReport } from "@/lib/api/types";

export interface UsePnLOptions {
  startDate: string;
  endDate: string;
  enabled?: boolean;
}

export interface UsePnLResult {
  data: PnLReport | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch P&L data for a given date range
 */
export function usePnL({
  startDate,
  endDate,
  enabled = true,
}: UsePnLOptions): UsePnLResult {
  const query = useQuery({
    queryKey: ["pnl", startDate, endDate],
    queryFn: () => calculatePnL(startDate, endDate),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
