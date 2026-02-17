"use client";

/**
 * Ad Spend Change Scenario Form
 * Requirements: 11.2
 */

import { useState } from "react";
import { DollarSign, Percent, Play } from "lucide-react";
import type { WhatIfScenario } from "@/lib/api/types";

interface AdSpendFormProps {
  onSubmit: (scenario: WhatIfScenario) => void;
  isLoading?: boolean;
}

export function AdSpendForm({ onSubmit, isLoading = false }: AdSpendFormProps) {
  const [changeType, setChangeType] = useState<"increase" | "decrease">("increase");
  const [changePercent, setChangePercent] = useState<number>(10);
  const [platform, setPlatform] = useState<"all" | "meta" | "google">("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const multiplier = changeType === "increase" ? 1 + changePercent / 100 : 1 - changePercent / 100;
    
    onSubmit({
      type: "AD_SPEND_CHANGE",
      parameters: {
        changeType,
        changePercent,
        multiplier,
        platform,
      },
    });
  };

  const isValid = changePercent > 0 && changePercent <= 100;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Change Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Change Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="changeType"
              value="increase"
              checked={changeType === "increase"}
              onChange={() => setChangeType("increase")}
              className="h-4 w-4 text-credora-orange bg-[#0f0f0f] focus:ring-credora-orange/30"
            />
            <span className="ml-2 text-sm text-gray-300">Increase</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="changeType"
              value="decrease"
              checked={changeType === "decrease"}
              onChange={() => setChangeType("decrease")}
              className="h-4 w-4 text-credora-orange bg-[#0f0f0f] focus:ring-credora-orange/30"
            />
            <span className="ml-2 text-sm text-gray-300">Decrease</span>
          </label>
        </div>
      </div>

      {/* Change Percentage */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Change Percentage
        </label>
        <div className="relative">
          <input
            type="number"
            min="1"
            max="100"
            value={changePercent}
            onChange={(e) => setChangePercent(Number(e.target.value))}
            className="w-full px-4 py-3 pr-10 bg-[#0f0f0f] text-white rounded-xl focus:ring-2 focus:ring-credora-orange/30 focus:outline-none"
            placeholder="Enter percentage"
          />
          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        {!isValid && changePercent !== 0 && (
          <p className="mt-1 text-sm text-red-400">
            Percentage must be between 1 and 100
          </p>
        )}
      </div>

      {/* Platform Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Apply To
        </label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as "all" | "meta" | "google")}
          className="w-full px-4 py-3 bg-[#0f0f0f] text-white rounded-xl focus:ring-2 focus:ring-credora-orange/30 focus:outline-none"
        >
          <option value="all">All Platforms</option>
          <option value="meta">Meta Ads Only</option>
          <option value="google">Google Ads Only</option>
        </select>
      </div>

      {/* Summary */}
      <div className="bg-[#0f0f0f] rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <DollarSign className="h-4 w-4 text-credora-orange" />
          <span>
            {changeType === "increase" ? "Increase" : "Decrease"} ad spend by{" "}
            <strong className="text-white">{changePercent}%</strong> on{" "}
            <strong className="text-white">{platform === "all" ? "all platforms" : platform}</strong>
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-credora-orange to-credora-red text-white rounded-xl font-medium hover:shadow-lg hover:shadow-credora-orange/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
