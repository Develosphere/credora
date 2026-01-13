/**
 * useForecast hook - React Query hook for cash flow forecast data
 * Handles insufficient data error state
 */

import { useQuery } from "@tanstack/react-query";
import { getForecast } from "@/lib/api/fpa";
import type { ForecastReport } from "@/lib/api/types";

export interface UseForecastOptions {
  days: number;
  enabled?: boolean;
}

export interface UseForecastResult {
  data: ForecastReport | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isInsufficientData: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch cash flow forecast data
 */
export function useForecast({
  days,
  enabled = true,
}: UseForecastOptions): UseForecastResult {
  const query = useQuery({
    queryKey: ["forecast", days],
    queryFn: () => getForecast(days),
    enabled: enabled && days > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Check if error is due to insufficient data
  const isInsufficientData =
    query.isError &&
    (query.error?.message?.toLowerCase().includes("insufficient") ||
      query.error?.message?.toLowerCase().includes("not enough data"));

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isInsufficientData,
    refetch: query.refetch,
  };
}

/**
 * Helper function to determine if runway is critical (< 30 days)
 */
export function isRunwayCritical(runwayDays: number): boolean {
  return runwayDays < 30;
}

/**
 * Helper function to get runway status
 */
export function getRunwayStatus(runwayDays: number): {
  status: "critical" | "warning" | "healthy";
  message: string;
} {
  if (runwayDays < 30) {
    return {
      status: "critical",
      message: "Critical: Less than 30 days of runway remaining",
    };
  }
  if (runwayDays < 60) {
    return {
      status: "warning",
      message: "Warning: Less than 60 days of runway remaining",
    };
  }
  return {
    status: "healthy",
    message: "Healthy runway",
  };
}
