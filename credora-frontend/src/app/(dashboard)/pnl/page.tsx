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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Profit & Loss Statement
        </h1>
        <p className="text-gray-500 mt-1">
          View your financial performance over a selected period
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Date Inputs */}
          <div className="flex gap-4">
            <div>
              <label
                htmlFor="start-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => handleDateChange("start", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="end-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => handleDateChange("end", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Date Error */}
        {dateError && (
          <p className="mt-2 text-sm text-red-600">{dateError}</p>
        )}
      </div>

      {/* P&L Statement Content */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-medium">
                Failed to load P&L data
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

      {data && !isLoading && !isError && (
        <div>
          <div className="mb-4 text-sm text-gray-500">
            Showing data for{" "}
            <span className="font-medium text-gray-700">
              {formatDateRangeForDisplay(startDate, endDate)}
            </span>
          </div>
          <PnLStatement data={data} />
        </div>
      )}
    </div>
  );
}
