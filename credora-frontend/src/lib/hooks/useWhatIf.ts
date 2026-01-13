/**
 * useWhatIf hook - React Query mutation hook for what-if simulations
 * Requirements: 11.2
 */

import { useMutation } from "@tanstack/react-query";
import { simulateWhatIf } from "@/lib/api/fpa";
import type { WhatIfScenario, SimulationResult } from "@/lib/api/types";

export interface UseWhatIfResult {
  mutate: (scenario: WhatIfScenario) => void;
  mutateAsync: (scenario: WhatIfScenario) => Promise<SimulationResult>;
  data: SimulationResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
  isSuccess: boolean;
}

/**
 * Hook to run what-if simulations
 * Uses React Query mutation for POST requests
 */
export function useWhatIf(): UseWhatIfResult {
  const mutation = useMutation({
    mutationFn: (scenario: WhatIfScenario) => simulateWhatIf(scenario),
    retry: 1,
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
    isSuccess: mutation.isSuccess,
  };
}
