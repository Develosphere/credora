"use client";

/**
 * Cash Flow Forecast Page
 * Displays cash flow projections with period selection
 */

import { useState } from "react";
import { ForecastChart } from "@/components/financial/ForecastChart";
import { useForecast, getRunwayStatus } from "@/lib/hooks/useForecast";
import { formatCurrency, formatDays } from "@/lib/utils/formatters";

const PERIOD_OPTIONS = [
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: 60, label: "60 Days" },
  { value: 90, label: "90 Days" },
];

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  variant?: "default" | "warning" | "critical";
}

function MetricCard({
  title,
  value,
  subtitle,
  variant = "default",
}: MetricCardProps) {
  const variantStyles = {
    default: "bg-white border-gray-200",
    warning: "bg-yellow-50 border-yellow-200",
    critical: "bg-red-50 border-red-200",
  };

  const valueStyles = {
    default: "text-gray-900",
    warning: "text-yellow-700",
    critical: "text-red-700",
  };

  return (
    <div
      className={`rounded-lg shadow-sm border p-4 ${variantStyles[variant]}`}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${valueStyles[variant]}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default function ForecastPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const { data, isLoading, isError, error, isInsufficientData, refetch } =
    useForecast({
      days: selectedPeriod,
    });

  const runwayStatus = data ? getRunwayStatus(data.runwayDays) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Cash Flow Forecast
          </h1>
          <p className="text-gray-500 mt-1">
            Project your cash position and runway
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Runway Warning Alert */}
      {data && runwayStatus?.status === "critical" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="text-red-800 font-medium">Low Cash Runway Warning</h3>
            <p className="text-red-600 text-sm mt-1">
              Your current runway is less than 30 days. Consider reducing
              expenses or securing additional funding.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}

      {/* Insufficient Data State */}
      {isInsufficientData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-yellow-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-yellow-800 font-medium text-lg">
            Insufficient Data for Forecast
          </h3>
          <p className="text-yellow-700 mt-2 max-w-md mx-auto">
            We need more historical data to generate accurate forecasts. Please
            ensure your platforms are connected and have at least 30 days of
            transaction history.
          </p>
          <button
            onClick={() => (window.location.href = "/settings")}
            className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
          >
            Check Platform Connections
          </button>
        </div>
      )}

      {/* Error State */}
      {isError && !isInsufficientData && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-medium">
                Failed to load forecast data
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

      {/* Forecast Data */}
      {data && !isLoading && !isError && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Current Cash"
              value={formatCurrency(data.currentCash)}
              subtitle="Available balance"
            />
            <MetricCard
              title="Daily Burn Rate"
              value={formatCurrency(data.burnRate)}
              subtitle="Average daily spend"
            />
            <MetricCard
              title="Cash Runway"
              value={formatDays(data.runwayDays)}
              subtitle={runwayStatus?.message}
              variant={
                runwayStatus?.status === "critical"
                  ? "critical"
                  : runwayStatus?.status === "warning"
                  ? "warning"
                  : "default"
              }
            />
          </div>

          {/* Scenario Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              {selectedPeriod}-Day Projection Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Conservative</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(data.lowScenario)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(data.midScenario)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Optimistic</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(data.highScenario)}
                </p>
              </div>
            </div>
          </div>

          {/* Forecast Chart */}
          {data.forecastPoints && Array.isArray(data.forecastPoints) && data.forecastPoints.length > 0 && (
            <ForecastChart data={data.forecastPoints} />
          )}
        </>
      )}
    </div>
  );
}
