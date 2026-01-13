/**
 * useSKU hook - React Query hook for SKU analytics data fetching
 * Calls Java FPA Engine via Python API
 */

import { useQuery } from "@tanstack/react-query";
import { analyzeSKUs } from "@/lib/api/fpa";
import type { SKUAnalysis } from "@/lib/api/types";

export interface UseSKUResult {
  data: SKUAnalysis[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch SKU unit economics data
 */
export function useSKU(): UseSKUResult {
  const query = useQuery({
    queryKey: ["sku-analysis"],
    queryFn: () => analyzeSKUs(),
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
