"use client";

/**
 * P&L Statement Page
 * Displays profit and loss statement with date range selection
 */

import { useState } from "react";
import { PnLStatement } from "@/components/financial/PnLStatement";
import { usePnL } from "@/lib/hooks/usePnL";
import {
  getLastNDaysStrings,
  formatDateForAPI,
  formatDateRangeForDisplay,
  validateDateRange,
} from "@/lib/utils/date";

export default function PnLPage() {
  // Default to last 30 days
  const defaultRange = getLastNDaysStrings(30);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [dateError, setDateError] = useState<string | null>(null);
  const [shouldFetch, setShouldFetch] = useState(true);

  const { data, isLoading, isError, error, refetch } = usePnL({
    startDate,
    endDate,
    enabled: shouldFetch && !dateError,
  });

  const handleDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    setShouldFetch(false);
    setDateError(null);
  };

  const handleCalculate = () => {
    const validation = validateDateRange(startDate, endDate);
    if (!validation.isValid) {
      setDateError(validation.error || "Invalid date range");
      return;
    }
    setDateError(null);
    setShouldFetch(true);
    refetch();
  };

  const handlePresetClick = (days: number) => {
    const range = getLastNDaysStrings(days);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setDateError(null);
    setShouldFetch(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Profit & Loss Statement
        </h1>
        <p className="text-gray-400 mt-1">
          View your financial performance over a selected period
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5">
        <div className="flex flex-wrap items-end gap-4">
          {/* Date Inputs */}
          <div className="flex gap-4">
            <div>
              <label
                htmlFor="start-date"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => handleDateChange("start", e.target.value)}
                className="px-3 py-2.5 bg-[#282828] border border-[#333] text-white rounded-xl shadow-sm focus:ring-2 focus:ring-credora-orange/20 focus:border-credora-orange/50 transition-all duration-200"
              />
            </div>
            <div>
              <label
                htmlFor="end-date"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => handleDateChange("end", e.target.value)}
                className="px-3 py-2.5 bg-[#282828] border border-[#333] text-white rounded-xl shadow-sm focus:ring-2 focus:ring-credora-orange/20 focus:border-credora-orange/50 transition-all duration-200"
              />
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={isLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-credora-orange to-credora-red text-white rounded-xl hover:shadow-lg hover:shadow-credora-orange/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-300 font-medium"
          >
            {isLoading ? "Calculating..." : "Calculate"}
          </button>

          {/* Preset Buttons */}
          <div className="flex gap-2 ml-auto">
            <span className="text-sm text-gray-500 self-center">Presets:</span>
            {[7, 30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => handlePresetClick(days)}
                className="px-3.5 py-1.5 text-sm bg-[#282828] border border-[#333] text-gray-300 rounded-xl hover:bg-credora-orange/10 hover:border-credora-orange/30 hover:text-credora-orange transition-all duration-200"
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Date Error */}
        {dateError && (
          <p className="mt-3 text-sm text-red-400">{dateError}</p>
        )}
      </div>

      {/* P&L Statement Content */}
      {isLoading && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[#333] rounded-full w-1/4"></div>
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-[#333] rounded-full w-1/3"></div>
                  <div className="h-4 bg-[#333] rounded-full w-1/6"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-400 font-semibold">
                Failed to load P&L data
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

      {data && !isLoading && !isError && (
        <div className="animate-slide-up">
          <div className="mb-4 text-sm text-gray-400">
            Showing data for{" "}
            <span className="font-medium text-white">
              {formatDateRangeForDisplay(startDate, endDate)}
            </span>
          </div>
          <PnLStatement data={data} />
        </div>
      )}
    </div>
  );
}
