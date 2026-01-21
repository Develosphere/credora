/**
 * React hook for competitor analysis functionality
 */

import { useState, useCallback } from "react";
import { 
  analyzeCompetitors, 
  searchCompetitors, 
  quickAnalyzeCompetitor,
  type CompetitorAnalysisRequest,
  type CompetitorAnalysisResponse,
  type CompetitorSearchResponse,
  type QuickAnalysisResponse
} from "@/lib/api/competitor";

interface UseCompetitorAnalysisReturn {
  // State
  isLoading: boolean;
  error: string | null;
  result: CompetitorAnalysisResponse | null;
  
  // Actions
  analyze: (request: CompetitorAnalysisRequest) => Promise<void>;
  reset: () => void;
}

interface UseCompetitorSearchReturn {
  // State
  isLoading: boolean;
  error: string | null;
  results: CompetitorSearchResponse | null;
  
  // Actions
  search: (businessType: string, city?: string, maxResults?: number) => Promise<void>;
  reset: () => void;
}

interface UseQuickAnalysisReturn {
  // State
  isLoading: boolean;
  error: string | null;
  result: QuickAnalysisResponse | null;
  
  // Actions
  analyze: (url: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for comprehensive competitor analysis
 */
export function useCompetitorAnalysis(): UseCompetitorAnalysisReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompetitorAnalysisResponse | null>(null);

  const analyze = useCallback(async (request: CompetitorAnalysisRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await analyzeCompetitors(request);
      setResult(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Analysis failed";
      setError(errorMessage);
      console.error("Competitor analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    isLoading,
    error,
    result,
    analyze,
    reset,
  };
}

/**
 * Hook for competitor search
 */
export function useCompetitorSearch(): UseCompetitorSearchReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CompetitorSearchResponse | null>(null);

  const search = useCallback(async (
    businessType: string, 
    city: string = "Karachi", 
    maxResults: number = 5
  ) => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await searchCompetitors(businessType, city, maxResults);
      setResults(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setError(errorMessage);
      console.error("Competitor search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResults(null);
  }, []);

  return {
    isLoading,
    error,
    results,
    search,
    reset,
  };
}

/**
 * Hook for quick competitor analysis
 */
export function useQuickAnalysis(): UseQuickAnalysisReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickAnalysisResponse | null>(null);

  const analyze = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await quickAnalyzeCompetitor(url);
      setResult(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Analysis failed";
      setError(errorMessage);
      console.error("Quick analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    isLoading,
    error,
    result,
    analyze,
    reset,
  };
}

/**
 * Utility function to format business type for API
 */
export function formatBusinessType(businessType: string): string {
  // Keep the original business type but clean it up slightly
  return businessType.toLowerCase().replace(/[&]/g, 'and').trim();
}

/**
 * Utility function to get strategy score color
 */
export function getStrategyScoreColor(score: string): string {
  const [current, total] = score.split('/').map(Number);
  const percentage = (current / total) * 100;
  
  if (percentage >= 80) return "text-green-600";
  if (percentage >= 60) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Utility function to format analysis duration
 */
export function getEstimatedDuration(maxCompetitors: number): string {
  const baseTime = 30; // seconds per competitor
  const totalSeconds = maxCompetitors * baseTime;
  
  if (totalSeconds < 60) {
    return `~${totalSeconds} seconds`;
  }
  
  const minutes = Math.ceil(totalSeconds / 60);
  return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
}