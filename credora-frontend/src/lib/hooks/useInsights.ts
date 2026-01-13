/**
 * useInsights hook - React Query hook for insights data fetching
 * Fetches AI-generated recommendations from Python Insight Agent
 * Sorts insights by impact priority (high > medium > low)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInsights, dismissInsight, restoreInsight } from "@/lib/api/insights";
import type { Insight } from "@/lib/api/types";

/**
 * Impact priority order for sorting
 * Higher number = higher priority
 */
const IMPACT_PRIORITY: Record<Insight["impact"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Sort insights by impact priority (high > medium > low)
 * For insights with the same impact, sort by creation date (newest first)
 */
export function sortInsightsByPriority(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => {
    const priorityDiff = IMPACT_PRIORITY[b.impact] - IMPACT_PRIORITY[a.impact];
    if (priorityDiff !== 0) return priorityDiff;
    // Same priority, sort by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export interface UseInsightsResult {
  data: Insight[] | undefined;
  activeInsights: Insight[];
  dismissedInsights: Insight[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  dismiss: (insightId: string) => void;
  restore: (insightId: string) => void;
  isDismissing: boolean;
  isRestoring: boolean;
}

/**
 * Hook to fetch and manage insights
 */
export function useInsights(): UseInsightsResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["insights"],
    queryFn: getInsights,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    select: (data) => sortInsightsByPriority(data),
  });

  const dismissMutation = useMutation({
    mutationFn: dismissInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    },
  });

  // Separate active and dismissed insights
  const activeInsights = query.data?.filter((i) => !i.dismissed) ?? [];
  const dismissedInsights = query.data?.filter((i) => i.dismissed) ?? [];

  return {
    data: query.data,
    activeInsights,
    dismissedInsights,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    dismiss: dismissMutation.mutate,
    restore: restoreMutation.mutate,
    isDismissing: dismissMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}
