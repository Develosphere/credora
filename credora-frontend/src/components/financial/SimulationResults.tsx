"use client";

/**
 * Simulation Results Component
 * Displays baseline vs projected metrics with deltas and recommendations
 * Requirements: 11.3, 11.4, 11.5
 */

import { AlertTriangle, TrendingUp, TrendingDown, Lightbulb, Info } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";
import type { SimulationResult } from "@/lib/api/types";

interface SimulationResultsProps {
  result: SimulationResult;
}

export function SimulationResults({ result }: SimulationResultsProps) {
  const { baseline, projected, impact, recommendations } = result;

  // Get all metric keys
  const metricKeys = Object.keys(baseline);

  return (
    <div className="space-y-6">
      {/* Simulation Disclaimer - Requirements: 11.5 */}
      <div 
        className="bg-amber-50 border border-amber-200 rounded-lg p-4"
        data-testid="simulation-disclaimer"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Simulation Results</h4>
            <p className="text-sm text-amber-700 mt-1">
              These projections are estimates based on historical data and assumptions. 
              Actual results may vary. This is not financial advice.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Comparison - Requirements: 11.3 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Impact Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Metric
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  Baseline
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  Projected
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {metricKeys.map((key) => {
                const baselineValue = baseline[key];
                const projectedValue = projected[key];
                const impactValue = impact[key];
                const isPositive = impactValue >= 0;
                const isPercentMetric = key.toLowerCase().includes("margin") || 
                                        key.toLowerCase().includes("rate") ||
                                        key.toLowerCase().includes("roas");

                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatMetricName(key)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {isPercentMetric 
                        ? formatPercent(baselineValue) 
                        : formatCurrency(baselineValue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {isPercentMetric 
                        ? formatPercent(projectedValue) 
                        : formatCurrency(projectedValue)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-medium ${
                          isPositive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {isPositive ? "+" : ""}
                        {isPercentMetric 
                          ? `${impactValue.toFixed(1)}pp` 
                          : formatCurrency(impactValue)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations - Requirements: 11.4 */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Recommendations
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Additional Info */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Info className="h-4 w-4" />
        <span>
          Projections are based on your historical data and industry benchmarks.
        </span>
      </div>
    </div>
  );
}

/**
 * Format metric key to human-readable name
 */
function formatMetricName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Empty state when no simulation has been run
 */
export function SimulationResultsEmpty() {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <TrendingUp className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900">No Simulation Results</h3>
      <p className="text-sm text-gray-500 mt-1">
        Configure a scenario above and click &quot;Run Simulation&quot; to see projected outcomes.
      </p>
    </div>
  );
}

/**
 * Loading state while simulation is running
 */
export function SimulationResultsLoading() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div className="flex flex-col items-center">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-sm font-medium text-gray-900">Running Simulation</h3>
        <p className="text-sm text-gray-500 mt-1">
          Analyzing your data and calculating projections...
        </p>
      </div>
    </div>
  );
}

/**
 * Error state when simulation fails
 */
export function SimulationResultsError({ 
  error, 
  onRetry 
}: { 
  error: Error; 
  onRetry: () => void;
}) {
  return (
    <div className="bg-red-50 rounded-lg border border-red-200 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-800">Simulation Failed</h4>
          <p className="text-sm text-red-700 mt-1">
            {error.message || "An error occurred while running the simulation."}
          </p>
          <button
            onClick={onRetry}
            className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
