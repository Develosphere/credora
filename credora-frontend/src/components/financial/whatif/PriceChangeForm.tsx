"use client";

/**
 * Price Change Scenario Form
 * Requirements: 11.2
 */

import { useState } from "react";
import { TrendingUp, Percent, Play } from "lucide-react";
import type { WhatIfScenario } from "@/lib/api/types";

interface PriceChangeFormProps {
  onSubmit: (scenario: WhatIfScenario) => void;
  isLoading?: boolean;
}

export function PriceChangeForm({ onSubmit, isLoading = false }: PriceChangeFormProps) {
  const [changeType, setChangeType] = useState<"increase" | "decrease">("increase");
  const [changePercent, setChangePercent] = useState<number>(5);
  const [applyTo, setApplyTo] = useState<"all" | "top" | "bottom">("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const multiplier = changeType === "increase" ? 1 + changePercent / 100 : 1 - changePercent / 100;
    
    onSubmit({
      type: "PRICE_CHANGE",
      parameters: {
        changeType,
        changePercent,
        multiplier,
        applyTo,
      },
    });
  };

  const isValid = changePercent > 0 && changePercent <= 50;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Change Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price Adjustment
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="changeType"
              value="increase"
              checked={changeType === "increase"}
              onChange={() => setChangeType("increase")}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Increase Prices</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="changeType"
              value="decrease"
              checked={changeType === "decrease"}
              onChange={() => setChangeType("decrease")}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Decrease Prices</span>
          </label>
        </div>
      </div>

      {/* Change Percentage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Change Percentage
        </label>
        <div className="relative">
          <input
            type="number"
            min="1"
            max="50"
            value={changePercent}
            onChange={(e) => setChangePercent(Number(e.target.value))}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter percentage"
          />
          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        {!isValid && changePercent !== 0 && (
          <p className="mt-1 text-sm text-red-600">
            Percentage must be between 1 and 50
          </p>
        )}
      </div>

      {/* Apply To Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Apply To Products
        </label>
        <select
          value={applyTo}
          onChange={(e) => setApplyTo(e.target.value as "all" | "top" | "bottom")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Products</option>
          <option value="top">Top Performing SKUs</option>
          <option value="bottom">Underperforming SKUs</option>
        </select>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <TrendingUp className="h-4 w-4" />
          <span>
            {changeType === "increase" ? "Increase" : "Decrease"} prices by{" "}
            <strong>{changePercent}%</strong> for{" "}
            <strong>
              {applyTo === "all"
                ? "all products"
                : applyTo === "top"
                ? "top performing SKUs"
                : "underperforming SKUs"}
            </strong>
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Running Simulation...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Run Simulation
          </>
        )}
      </button>
    </form>
  );
}
