/**
 * useCampaigns hook - React Query hook for campaign performance data fetching
 * Calls Java FPA Engine via Python API
 */

import { useQuery } from "@tanstack/react-query";
import { getRankedCampaigns } from "@/lib/api/fpa";
import type { CampaignRanking } from "@/lib/api/types";

export interface UseCampaignsOptions {
  top?: number;
  bottom?: number;
}

export interface UseCampaignsResult {
  data: CampaignRanking | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch ranked campaign performance data
 */
export function useCampaigns(options: UseCampaignsOptions = {}): UseCampaignsResult {
  const { top = 5, bottom = 5 } = options;

  const query = useQuery({
    queryKey: ["campaigns", top, bottom],
    queryFn: () => getRankedCampaigns(top, bottom),
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
