/**
 * Insights API module
 * Handles communication with Python Insight Agent for AI-generated recommendations
 */

import { pythonApi } from "./client";
import type { Insight } from "./types";

/**
 * Get all insights for the current user
 * Returns insights sorted by impact priority (high > medium > low)
 */
export async function getInsights(): Promise<Insight[]> {
  return pythonApi.get<Insight[]>("/insights");
}

/**
 * Dismiss an insight
 * Marks the insight as dismissed so it won't appear in future sessions
 */
export async function dismissInsight(insightId: string): Promise<void> {
  return pythonApi.post<void>(`/insights/${insightId}/dismiss`);
}

/**
 * Restore a dismissed insight
 */
export async function restoreInsight(insightId: string): Promise<void> {
  return pythonApi.post<void>(`/insights/${insightId}/restore`);
}

/**
 * Insights API object for convenience
 */
export const insightsApi = {
  getInsights,
  dismissInsight,
  restoreInsight,
};
