"use client";

/**
 * Insights Page
 * Displays AI-generated recommendations sorted by impact priority
 */

import { useState } from "react";
import { Lightbulb, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useInsights } from "@/lib/hooks/useInsights";
import { InsightCard, InsightCardSkeleton } from "@/components/financial/InsightCard";

export default function InsightsPage() {
  const {
    activeInsights,
    dismissedInsights,
    isLoading,
    isError,
    error,
    refetch,
    dismiss,
    restore,
    isDismissing,
    isRestoring,
  } = useInsights();

  const [showDismissed, setShowDismissed] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
          <p className="text-gray-500 mt-1">
            AI-generated recommendations to improve your business
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Lightbulb className="h-4 w-4" />
              <span>Total Insights</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {activeInsights.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>High Impact</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {activeInsights.filter((i) => i.impact === "high").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-yellow-500 text-sm mb-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Medium Impact</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {activeInsights.filter((i) => i.impact === "medium").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Low Impact</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {activeInsights.filter((i) => i.impact === "low").length}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <InsightCardSkeleton />
          <InsightCardSkeleton />
          <InsightCardSkeleton />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-medium">
                Failed to load insights
              </h3>
              <p className="text-red-600 text-sm mt-1">
                {error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Active Insights */}
      {!isLoading && !isError && (
        <>
          {activeInsights.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No insights available
              </h3>
              <p className="text-gray-500">
                Check back later for AI-generated recommendations based on your
                business data.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={dismiss}
                  isLoading={isDismissing}
                />
              ))}
            </div>
          )}

          {/* Dismissed Insights Section */}
          {dismissedInsights.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowDismissed(!showDismissed)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showDismissed ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showDismissed ? "Hide" : "Show"} dismissed insights (
                {dismissedInsights.length})
              </button>

              {showDismissed && (
                <div className="mt-4 space-y-4">
                  {dismissedInsights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onRestore={restore}
                      isLoading={isRestoring}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
