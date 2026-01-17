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
    default: "bg-[#1e1e1e] border-[#2a2a2a]",
    warning: "bg-amber-500/10 border-amber-500/30",
    critical: "bg-red-500/10 border-red-500/30",
  };

  const valueStyles = {
    default: "text-white",
    warning: "text-amber-400",
    critical: "text-red-400",
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 hover:border-credora-orange/30 hover:-translate-y-0.5 ${variantStyles[variant]}`}
    >
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className={`text-2xl font-bold mt-1.5 ${valueStyles[variant]}`}>
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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Cash Flow Forecast
          </h1>
          <p className="text-gray-400 mt-1">
            Project your cash position and runway
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                selectedPeriod === option.value
                  ? "bg-gradient-to-r from-credora-orange to-credora-red text-white shadow-lg shadow-credora-orange/25"
                  : "bg-[#1e1e1e] border border-[#2a2a2a] text-gray-300 hover:border-credora-orange/30 hover:text-credora-orange"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Runway Warning Alert */}
      {data && runwayStatus?.status === "critical" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-start gap-3 animate-slide-up">
          <svg
            className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
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
            <h3 className="text-red-400 font-semibold">Low Cash Runway Warning</h3>
            <p className="text-gray-400 text-sm mt-1">
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
                className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5 animate-pulse"
              >
                <div className="h-4 bg-[#333] rounded-full w-1/2 mb-3"></div>
                <div className="h-8 bg-[#333] rounded-full w-3/4"></div>
              </div>
            ))}
          </div>
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-[#333] rounded-full w-1/4 mb-4"></div>
            <div className="h-64 bg-[#282828] rounded-xl"></div>
          </div>
        </div>
      )}

      {/* Insufficient Data State */}
      {isInsufficientData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center">
          <svg
            className="w-12 h-12 text-amber-400 mx-auto mb-4"
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
          <h3 className="text-amber-400 font-semibold text-lg">
            Insufficient Data for Forecast
          </h3>
          <p className="text-gray-400 mt-2 max-w-md mx-auto">
            We need more historical data to generate accurate forecasts. Please
            ensure your platforms are connected and have at least 30 days of
            transaction history.
          </p>
          <button
            onClick={() => (window.location.href = "/settings")}
            className="mt-4 px-5 py-2.5 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-colors duration-200 font-medium"
          >
            Check Platform Connections
          </button>
        </div>
      )}

      {/* Error State */}
      {isError && !isInsufficientData && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-400 font-semibold">
                Failed to load forecast data
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors duration-200 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Forecast Data */}
      {data && !isLoading && !isError && (
        <div className="animate-slide-up">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">
              {selectedPeriod}-Day Projection Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-amber-500/10 transition-all duration-300 hover:bg-amber-500/20">
                <p className="text-sm text-gray-400 mb-1">Conservative</p>
                <p className="text-xl font-bold text-amber-400">
                  {formatCurrency(data.lowScenario)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-credora-orange/10 transition-all duration-300 hover:bg-credora-orange/20">
                <p className="text-sm text-gray-400 mb-1">Expected</p>
                <p className="text-xl font-bold text-credora-orange">
                  {formatCurrency(data.midScenario)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 transition-all duration-300 hover:bg-emerald-500/20">
                <p className="text-sm text-gray-400 mb-1">Optimistic</p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatCurrency(data.highScenario)}
                </p>
              </div>
            </div>
          </div>

          {/* Forecast Chart */}
          {data.forecastPoints && Array.isArray(data.forecastPoints) && data.forecastPoints.length > 0 && (
            <ForecastChart data={data.forecastPoints} />
          )}
        </div>
      )}
    </div>
  );
}
